export function normalizeClientOrderId(value = '') {
  const id = String(value || '').trim();
  if (!id || id.length > 96) return '';
  return /^[A-Za-z0-9][A-Za-z0-9_-]{7,95}$/.test(id) ? id : '';
}

export function clientOrderIdFromCreateBody(body = {}) {
  const input = body?.input && typeof body.input === 'object' ? body.input : {};
  const broker = input._broker && typeof input._broker === 'object' ? input._broker : {};
  return normalizeClientOrderId(
    body?.client_order_id
    || body?.clientOrderId
    || input.client_order_id
    || input.clientOrderId
    || broker.clientOrderId
    || broker.client_order_id
    || ''
  );
}

export function createOrderCreateRequestHelpers({
  accountIdForLogin,
  accountSettingsForLogin,
  accountUserFromSettings
} = {}) {
  function jobRequesterMatchesCurrent(job = {}, current = {}) {
    const requester = job?.input?._broker?.requester && typeof job.input._broker.requester === 'object'
      ? job.input._broker.requester
      : {};
    const currentLogin = String(current?.login || '').trim().toLowerCase();
    const currentAccountId = String(current?.account?.id || current?.user?.accountId || accountIdForLogin?.(currentLogin)).trim().toLowerCase();
    const requesterLogin = String(requester.login || '').trim().toLowerCase();
    const requesterAccountId = String(requester.accountId || '').trim().toLowerCase();
    if (currentLogin && requesterLogin) return currentLogin === requesterLogin;
    if (currentAccountId && requesterAccountId) return currentAccountId === requesterAccountId;
    return !currentLogin && !requesterLogin;
  }

  function jobPromptMatchesCreateBody(job = {}, body = {}) {
    const requestedPrompt = String(body?.prompt || '').trim();
    if (!requestedPrompt) return false;
    const candidates = [
      job.prompt,
      job.originalPrompt,
      job.workflow?.objective
    ].map((value) => String(value || '').trim()).filter(Boolean);
    return candidates.some((candidate) => candidate === requestedPrompt);
  }

  function jobSessionMatchesCreateBody(job = {}, body = {}) {
    const requestedSessionId = String(body?.session_id || body?.sessionId || body?.input?.session_id || body?.input?.sessionId || body?.input?._broker?.chatSessionId || body?.input?._broker?.workflow?.chatSessionId || '').trim();
    if (!requestedSessionId) return true;
    const broker = job?.input?._broker && typeof job.input._broker === 'object' ? job.input._broker : {};
    const workflow = broker.workflow && typeof broker.workflow === 'object' ? broker.workflow : {};
    const jobSessionId = String(job?.input?.session_id || job?.input?.sessionId || broker.chatSessionId || workflow.chatSessionId || '').trim();
    return jobSessionId === requestedSessionId;
  }

  function persistedJobForClientOrderId(state = {}, body = {}) {
    const clientOrderId = clientOrderIdFromCreateBody(body);
    if (!clientOrderId) return null;
    const jobs = Array.isArray(state?.jobs) ? state.jobs : [];
    return jobs.find((job) => String(job?.id || '').trim() === clientOrderId) || null;
  }

  function orderCreateBodyIsSameContentNewOrderRetry(body = {}) {
    const input = body?.input && typeof body.input === 'object' ? body.input : {};
    const broker = input._broker && typeof input._broker === 'object' ? input._broker : {};
    const retry = broker.retry && typeof broker.retry === 'object' ? broker.retry : {};
    const retryMode = String(body.retryMode || body.retry_mode || broker.retryMode || broker.retry_mode || retry.mode || retry.intent || '').trim();
    return retryMode === 'same_content_new_order'
      || retry.continuesOrder === false
      || body.continuesOrder === false
      || body.continues_order === false;
  }

  function createJobResponseFromPersistedJob(job = {}, options = {}) {
    const isWorkflow = job.jobKind === 'workflow' || Boolean(job.workflow);
    return {
      ok: true,
      idempotent: options.idempotent === true,
      recovered: options.recovered === true,
      code: options.code || (options.recovered ? 'order_create_recovered' : 'order_create_idempotent'),
      warning: options.warning || undefined,
      status: job.status || 'queued',
      mode: isWorkflow ? 'workflow' : (job.status || 'queued'),
      ...(isWorkflow ? { workflow_job_id: job.id } : { job_id: job.id }),
      child_runs: isWorkflow && Array.isArray(job.workflow?.childRuns) ? job.workflow.childRuns : undefined,
      planned_task_types: isWorkflow && Array.isArray(job.workflow?.plannedTasks) ? job.workflow.plannedTasks : undefined,
      dispatch_status: job.dispatch?.completionStatus || job.status || null,
      order_strategy_resolved: isWorkflow ? 'multi' : 'single',
      selection_mode: job.assignmentMode || (isWorkflow ? 'multi' : undefined)
    };
  }

  function orderCreateSkipIntake(body = {}) {
    const broker = body?.input?._broker && typeof body.input._broker === 'object' ? body.input._broker : {};
    const intake = broker.intake && typeof broker.intake === 'object' ? broker.intake : {};
    return body.skip_intake === true
      || body.skipIntake === true
      || body.intake_answered === true
      || body.intakeAnswered === true
      || intake.answered === true
      || intake.prepared_in_chat === true
      || intake.preparedInChat === true;
  }

  function orderCreateSkipPrePersistencePlanning(body = {}) {
    return orderCreateSkipIntake(body);
  }

  function currentFromRecurringOrder(state, order = {}) {
    const login = String(order.ownerLogin || order.owner_login || '').trim();
    const authProvider = String(order.authProvider || order.auth_provider || 'scheduled').trim() || 'scheduled';
    const account = login ? accountSettingsForLogin?.(state, login, order.user || { login }, authProvider) : null;
    const user = order.user && typeof order.user === 'object'
      ? { ...order.user, login }
      : (accountUserFromSettings?.(account) || { login, name: login });
    return {
      session: null,
      user,
      login,
      authProvider,
      account,
      apiKeyStatus: 'scheduled',
      apiKey: null
    };
  }

  function promptPolicyBlockPayload(promptGuard = {}) {
    const policyBlocked = String(promptGuard.code || '').startsWith('stripe_prohibited_');
    return {
      error: policyBlocked ? 'Request blocked by CAIt policy' : 'Prompt injection blocked by CAIt',
      code: policyBlocked ? 'prohibited_category_blocked' : 'prompt_injection_blocked',
      reason: promptGuard.reason,
      reason_code: promptGuard.code
    };
  }

  return {
    clientOrderIdFromCreateBody,
    createJobResponseFromPersistedJob,
    currentFromRecurringOrder,
    jobPromptMatchesCreateBody,
    jobRequesterMatchesCurrent,
    jobSessionMatchesCreateBody,
    normalizeClientOrderId,
    orderCreateBodyIsSameContentNewOrderRetry,
    orderCreateSkipIntake,
    orderCreateSkipPrePersistencePlanning,
    persistedJobForClientOrderId,
    promptPolicyBlockPayload
  };
}
