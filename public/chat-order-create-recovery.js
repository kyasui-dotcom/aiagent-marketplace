export function createChatOrderCreateRecovery(deps = {}) {
  const {
    window,
    api,
    getVisitorId = () => '',
    rememberTrackedOrder = () => {},
    sleep = async () => {}
  } = deps;

  function makeClientOrderId() {
    try {
      const generated = window.crypto?.randomUUID?.();
      if (generated) return generated;
    } catch {}
    return `client_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  }

  function normalizeClientOrderId(value = '') {
    return String(value || '').trim();
  }

  function clientOrderIdFromOrderCreate(source = {}) {
    const input = source?.input && typeof source.input === 'object' ? source.input : {};
    const broker = input._broker && typeof input._broker === 'object' ? input._broker : {};
    return normalizeClientOrderId(
      source?.client_order_id
      || source?.clientOrderId
      || input.client_order_id
      || input.clientOrderId
      || broker.clientOrderId
      || broker.client_order_id
      || ''
    );
  }

  function orderCreateRequestBody(payload = {}) {
    const {
      _caitRecoveryStartedAt,
      _cait_recovery_started_at,
      _caitRecoveryNoticeShown,
      _caitRecoveryRetried,
      ...body
    } = payload || {};
    return JSON.stringify(body);
  }

  function normalizeRecoveryText(value = '') {
    return String(value || '').trim().replace(/\s+/g, ' ');
  }

  function recoverySessionId(source = {}) {
    const input = source?.input && typeof source.input === 'object' ? source.input : {};
    const broker = input._broker && typeof input._broker === 'object' ? input._broker : {};
    return String(
      source?.session_id
      || source?.sessionId
      || input.session_id
      || input.sessionId
      || broker.chatSessionId
      || broker.chatux?.visitor_id
      || ''
    ).trim();
  }

  function recoveryPromptMatches(job = {}, payload = {}) {
    const requested = normalizeRecoveryText(payload?.prompt || '');
    if (!requested) return false;
    const candidates = [
      job.prompt,
      job.originalPrompt,
      job.workflow?.objective
    ].map(normalizeRecoveryText).filter(Boolean);
    return candidates.some((candidate) => (
      candidate === requested
      || (requested.length > 80 && candidate.includes(requested.slice(0, 80)))
      || (candidate.length > 80 && requested.includes(candidate.slice(0, 80)))
    ));
  }

  function recoveryCandidate(job = {}, payload = {}) {
    if (!job?.id) return false;
    const parentAgent = String(payload?.parent_agent_id || '').trim();
    if (parentAgent && String(job.parentAgentId || '') !== parentAgent) return false;
    const requestedClientOrderId = clientOrderIdFromOrderCreate(payload);
    if (requestedClientOrderId && String(job.id || '').trim() === requestedClientOrderId) return true;
    const createdMs = Date.parse(job.createdAt || job.created_at || '');
    if (!Number.isFinite(createdMs) || Date.now() - createdMs > 10 * 60 * 1000) return false;
    const recoveryStartedRaw = payload?._caitRecoveryStartedAt || payload?._cait_recovery_started_at || 0;
    const recoveryStartedMs = Number(recoveryStartedRaw) || Date.parse(String(recoveryStartedRaw || '')) || 0;
    if (recoveryStartedMs && createdMs < recoveryStartedMs - 15000) return false;
    const requestedSession = recoverySessionId(payload);
    const jobSession = recoverySessionId(job);
    return Boolean(
      recoveryPromptMatches(job, payload)
      || (recoveryStartedMs && requestedSession && jobSession && requestedSession === jobSession)
    );
  }

  function createdPayloadFromRecoveredJob(job = {}) {
    const isWorkflow = job?.jobKind === 'workflow' || Boolean(job?.workflow);
    const workflow = job?.workflow && typeof job.workflow === 'object' ? job.workflow : null;
    const childRuns = Array.isArray(workflow?.childRuns) ? workflow.childRuns : [];
    return {
      ok: true,
      recovered: true,
      code: 'client_order_create_recovered',
      status: job.status || 'queued',
      mode: isWorkflow ? 'workflow' : (job.status || 'queued'),
      ...(isWorkflow ? { workflow_job_id: job.id } : { job_id: job.id }),
      child_runs: childRuns,
      workflow: workflow || undefined,
      routing_reason: 'Recovered from order history after the create response failed.'
    };
  }

  async function findRecoveredOrderCreatePayload(payload = {}) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      if (attempt) await sleep(900 * attempt);
      try {
        const result = await api(`/api/jobs?limit=20&visitor_id=${encodeURIComponent(getVisitorId())}`);
        const recovered = (Array.isArray(result?.jobs) ? result.jobs : [])
          .filter((job) => recoveryCandidate(job, payload))
          .sort((left, right) => {
            const preferWorkflow = (job) => (job?.jobKind === 'workflow' || job?.workflow ? 1 : 0);
            const workflowDiff = preferWorkflow(right) - preferWorkflow(left);
            if (workflowDiff) return workflowDiff;
            return String(right?.createdAt || '').localeCompare(String(left?.createdAt || ''));
          })[0] || null;
        if (recovered?.id) {
          rememberTrackedOrder(recovered.id);
          return createdPayloadFromRecoveredJob(recovered);
        }
      } catch {}
    }
    return null;
  }

  async function recoverAcceptedOrderAfterCreateError(payload = {}, error = null) {
    const status = Number(error?.status || 0);
    const message = String(error?.message || error || '').toLowerCase();
    const shouldTry = status >= 500 || /failed to fetch|networkerror|load failed|network request failed/.test(message);
    if (!shouldTry) return null;
    if (!payload._caitRecoveryNoticeShown) {
      payload._caitRecoveryNoticeShown = true;
    }
    payload._caitRecoveryStartedAt = payload._caitRecoveryStartedAt || Date.now();
    const recoveredBeforeRetry = await findRecoveredOrderCreatePayload(payload);
    if (recoveredBeforeRetry) return recoveredBeforeRetry;
    const clientOrderId = clientOrderIdFromOrderCreate(payload);
    if (!payload._caitRecoveryRetried && clientOrderId) {
      payload._caitRecoveryRetried = true;
      try {
        return await api('/api/jobs', {
          method: 'POST',
          body: orderCreateRequestBody(payload)
        });
      } catch (retryError) {
        const recoveredAfterRetry = await findRecoveredOrderCreatePayload(payload);
        if (recoveredAfterRetry) return recoveredAfterRetry;
        throw retryError;
      }
    }
    return null;
  }

  return {
    clientOrderIdFromOrderCreate,
    makeClientOrderId,
    normalizeRecoveryText,
    orderCreateRequestBody,
    recoverAcceptedOrderAfterCreateError,
    recoveryCandidate
  };
}
