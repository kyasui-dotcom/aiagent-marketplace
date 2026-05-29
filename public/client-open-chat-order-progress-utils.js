import { compactClientText as compactChatText } from './client-text-utils.js?v=20260521a';
import {
  buildWorkflowChildDeliveryCard,
  compactProgressLogLine,
  deliveryFileNames,
  downloadableDeliveryFilesForJob,
  jobDeliveryFileLines,
  normalizeOrderProgressStatus,
  orderProgressCounts,
  orderProgressStatusLabel,
  orderProgressSteps,
  orderProgressTone,
  workflowChildDeliveryBody,
  workflowChildDeliveryLabel,
  workflowChildRunsFromJob,
  workflowProgressDetails
} from './client-order-progress-utils.js?v=20260529a';
import {
  isRetriableFetchError,
  waitForNetworkRetry
} from './client-api.js?v=20260522a';

const ORDER_HISTORY_BACKFILL_RETRY_MS = 30 * 1000;

export function createClientOpenChatOrderProgressUtils({
  productShortName,
  openChatSessionMaxMessages,
  orderHistoryOptimisticTtlMs,
  openChatOrderProgressMaxPolls,
  openChatOrderProgressPollMs,
  state,
  els,
  api,
  getVisitorId,
  trackChatTranscript,
  looksJapanese,
  requesterIdentityKeys,
  authorityRequestFromReport,
  authorityRequestRequiresClientApproval,
  normalizeClientList,
  normalizeClientConnector,
  normalizeClientConnectorCapabilityList,
  connectorActionForChat,
  updateWorkChatStatusCard,
  renderWorkChatThread,
  persistCurrentOpenChatSession,
  markCurrentOpenChatSessionLinkedOrder,
  readOpenChatSessions,
  renderJobs,
  setDetail,
  finishOpenChatTyping,
  makeOpenChatMessageId
} = {}) {
  let openChatOrderProgressTimer = null;
  let openChatAcceptanceProgressTimer = null;
  const orderHistoryBackfillInFlight = new Set();
  const orderHistoryBackfillFailedAt = new Map();

  function clearOpenChatOrderProgressTimer() {
    if (!openChatOrderProgressTimer) return;
    window.clearTimeout(openChatOrderProgressTimer);
    openChatOrderProgressTimer = null;
  }

  function clearOpenChatAcceptanceProgressTimer() {
    if (!openChatAcceptanceProgressTimer) return;
    window.clearInterval(openChatAcceptanceProgressTimer);
    openChatAcceptanceProgressTimer = null;
  }

  function createdOrderPrimaryId(created = {}) {
    return String(created?.workflow_job_id || created?.workflowJobId || created?.job_id || created?.jobId || '').trim();
  }

  function orderCreateRecoverySessionId(source = {}) {
    const input = source?.input && typeof source.input === 'object' ? source.input : {};
    const broker = input._broker && typeof input._broker === 'object' ? input._broker : {};
    const workflow = broker.workflow && typeof broker.workflow === 'object' ? broker.workflow : {};
    return String(
      source?.session_id
      || source?.sessionId
      || input.session_id
      || input.sessionId
      || broker.chatSessionId
      || workflow.chatSessionId
      || ''
    ).trim();
  }

  function makeClientOrderId() {
    try {
      const generated = window.crypto?.randomUUID?.();
      if (generated) return generated;
    } catch {}
    return `client_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  }

  function clientOrderIdFromOrderCreate(source = {}) {
    const input = source?.input && typeof source.input === 'object' ? source.input : {};
    const broker = input._broker && typeof input._broker === 'object' ? input._broker : {};
    return String(
      source?.client_order_id
      || source?.clientOrderId
      || input.client_order_id
      || input.clientOrderId
      || broker.clientOrderId
      || broker.client_order_id
      || ''
    ).trim();
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

  function normalizeOrderCreateRecoveryText(value = '') {
    return String(value || '').trim().replace(/\s+/g, ' ');
  }

  function orderCreateRecoveryPromptMatches(job = {}, payload = {}) {
    const requested = normalizeOrderCreateRecoveryText(payload?.prompt || '');
    if (!requested) return false;
    const candidates = [
      job.prompt,
      job.originalPrompt,
      job.workflow?.objective
    ].map(normalizeOrderCreateRecoveryText).filter(Boolean);
    return candidates.some((candidate) => (
      candidate === requested
      || (requested.length > 80 && candidate.includes(requested.slice(0, 80)))
      || (candidate.length > 80 && requested.includes(candidate.slice(0, 80)))
    ));
  }

  function orderCreateRecoverySessionMatches(job = {}, payload = {}) {
    const requestedSession = orderCreateRecoverySessionId(payload);
    if (!requestedSession) return false;
    const jobSession = orderCreateRecoverySessionId(job);
    return Boolean(jobSession && jobSession === requestedSession);
  }

  function orderCreateRecoveryCandidate(job = {}, payload = {}) {
    if (!job?.id) return false;
    const parentAgent = String(payload?.parent_agent_id || '').trim();
    if (parentAgent && String(job.parentAgentId || '') !== parentAgent) return false;
    const requestedClientOrderId = clientOrderIdFromOrderCreate(payload);
    if (requestedClientOrderId && String(job.id || '').trim() === requestedClientOrderId) return true;
    const createdMs = Date.parse(job.createdAt || job.created_at || '');
    if (!Number.isFinite(createdMs) || Date.now() - createdMs > 10 * 60 * 1000) return false;
    const promptMatches = orderCreateRecoveryPromptMatches(job, payload);
    const sessionMatches = orderCreateRecoverySessionMatches(job, payload);
    return Boolean(promptMatches || sessionMatches);
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
      planned_task_types: Array.isArray(workflow?.plannedTasks) ? workflow.plannedTasks : undefined,
      matched_agent_id: job.assignedAgentId || undefined,
      matched_agent_ids: childRuns.map((run) => run?.agentId).filter(Boolean),
      dispatch_status: job.dispatch?.completionStatus || job.status || undefined,
      order_strategy_resolved: isWorkflow ? 'multi' : 'single',
      routing_reason: 'Recovered from order history after the create response failed.'
    };
  }

  function currentRequesterContextForClient(auth = state.snapshot?.auth || {}) {
    const identity = requesterIdentityKeys(auth)[0] || 'guest';
    const accountId = String(auth?.account?.id || (identity ? `acct:${identity}` : 'acct:guest')).trim().toLowerCase();
    return {
      login: identity,
      accountId,
      authProvider: String(auth?.authProvider || auth?.provider || auth?.user?.provider || (auth?.loggedIn ? 'web' : 'guest')).trim().toLowerCase() || 'guest'
    };
  }

  function normalizeCreatedChildRunForHistory(child = {}) {
    return {
      id: String(child?.id || child?.job_id || child?.jobId || '').trim(),
      jobId: String(child?.jobId || child?.job_id || child?.id || '').trim(),
      taskType: String(child?.taskType || child?.task_type || '').trim(),
      dispatchTaskType: String(child?.dispatchTaskType || child?.dispatch_task_type || child?.task_type || child?.taskType || '').trim(),
      agentId: String(child?.agentId || child?.agent_id || '').trim(),
      agentName: String(child?.agentName || child?.agent_name || '').trim(),
      sequencePhase: String(child?.sequencePhase || child?.sequence_phase || '').trim(),
      status: normalizeOrderProgressStatus(child?.status || 'queued'),
      summary: String(child?.summary || child?.reportSummary || '').trim(),
      failureReason: String(child?.failureReason || child?.failure_reason || '').trim(),
      files: Array.isArray(child?.files) ? child.files : []
    };
  }

  function optimisticJobFromCreatedOrder(created = {}, payload = {}) {
    const orderId = createdOrderPrimaryId(created);
    if (!orderId) return null;
    const isWorkflow = String(created?.mode || '').toLowerCase() === 'workflow' || Boolean(created?.workflow_job_id || created?.workflowJobId);
    const rawChildRuns = Array.isArray(created?.child_runs)
      ? created.child_runs
      : (Array.isArray(created?.childRuns) ? created.childRuns : (Array.isArray(created?.workflow?.childRuns) ? created.workflow.childRuns : []));
    const childRuns = rawChildRuns.map(normalizeCreatedChildRunForHistory);
    const status = normalizeOrderProgressStatus(created?.status || created?.dispatch_status || 'created');
    const requester = currentRequesterContextForClient();
    const inputBase = payload?.input && typeof payload.input === 'object' ? payload.input : {};
    const broker = inputBase._broker && typeof inputBase._broker === 'object' ? inputBase._broker : {};
    const now = new Date().toISOString();
    const plannedTasks = Array.isArray(created?.planned_task_types)
      ? created.planned_task_types
      : (Array.isArray(created?.plannedTaskTypes) ? created.plannedTaskTypes : (Array.isArray(created?.workflow?.plannedTasks) ? created.workflow.plannedTasks : []));
    const workflowCounts = isWorkflow
      ? (created?.workflow?.statusCounts || orderProgressCounts({ mode: 'workflow', child_runs: childRuns }))
      : null;
    return {
      id: orderId,
      jobKind: isWorkflow ? 'workflow' : 'job',
      parentAgentId: payload?.parent_agent_id || payload?.parentAgentId || '',
      taskType: String(payload?.task_type || payload?.taskType || created?.inferred_task_type || created?.task_type || 'research').trim() || 'research',
      prompt: String(payload?.prompt || '').trim(),
      input: {
        ...inputBase,
        _broker: {
          ...broker,
          requester,
          ...(payload?.session_id || payload?.sessionId ? { chatSessionId: payload.session_id || payload.sessionId } : {})
        }
      },
      budgetCap: payload?.budget_cap || payload?.budgetCap || null,
      deadlineSec: payload?.deadline_sec || payload?.deadlineSec || null,
      priority: payload?.priority || 'normal',
      status,
      assignedAgentId: created?.matched_agent_id || created?.matchedAgentId || '',
      score: null,
      createdAt: created?.createdAt || created?.created_at || now,
      startedAt: ['running', 'claimed', 'dispatched'].includes(status) ? now : null,
      workflowParentId: payload?.workflow_parent_id || payload?.workflowParentId || null,
      workflow: isWorkflow
        ? {
            ...(created?.workflow && typeof created.workflow === 'object' ? created.workflow : {}),
            teamName: created?.workflow?.teamName || created?.team_name || created?.teamName || 'Agent Team',
            plannedTasks,
            childRuns,
            statusCounts: workflowCounts
          }
        : undefined,
      dispatch: {
        completionStatus: created?.dispatch_status || created?.dispatchStatus || status
      },
      logs: ['Order accepted; showing optimistic history row until snapshot catches up.'],
      __optimisticOrder: true,
      __optimisticAt: Date.now()
    };
  }

  function rememberOptimisticOrderJob(job = null) {
    if (!job?.id) return;
    state.optimisticOrderJobs = {
      ...(state.optimisticOrderJobs || {}),
      [job.id]: job
    };
  }

  function optimisticOrderStillFresh(job = {}) {
    const at = Number(job?.__optimisticAt || 0);
    return Boolean(job?.id && at && Date.now() - at < orderHistoryOptimisticTtlMs);
  }

  function mergeOptimisticOrderJobsIntoSnapshot(snapshot = {}) {
    if (!snapshot || typeof snapshot !== 'object') return snapshot;
    const optimisticJobs = state.optimisticOrderJobs || {};
    const snapshotJobs = Array.isArray(snapshot.jobs) ? snapshot.jobs : [];
    const actualIds = new Set(snapshotJobs.map((job) => String(job?.id || '').trim()).filter(Boolean));
    const nextOptimistic = {};
    const additions = [];
    Object.values(optimisticJobs).forEach((job) => {
      const id = String(job?.id || '').trim();
      if (!id || actualIds.has(id) || !optimisticOrderStillFresh(job)) return;
      nextOptimistic[id] = job;
      additions.push(job);
    });
    state.optimisticOrderJobs = nextOptimistic;
    if (!additions.length) return snapshot;
    return {
      ...snapshot,
      jobs: [...additions, ...snapshotJobs].sort((left, right) => {
        const diff = String(right?.createdAt || '').localeCompare(String(left?.createdAt || ''));
        if (diff) return diff;
        return String(right?.id || '').localeCompare(String(left?.id || ''));
      })
    };
  }

  function revealCreatedOrderInHistory(created = {}, payload = {}) {
    const job = optimisticJobFromCreatedOrder(created, payload);
    if (!job?.id) return;
    rememberOptimisticOrderJob(job);
    state.selectedJobId = job.id;
    state.runPage = 0;
    state.runSearch = '';
    state.workFlowShowList = true;
    state.workFlowLastCreatedJobId = job.id;
    if (els.runSearch) els.runSearch.value = '';
    mergeProgressJobIntoSnapshot(job);
  }

  async function recoverAcceptedOrderAfterCreateError(payload = {}, options = {}) {
    const ja = Boolean(options.ja);
    const shouldTry = isRetriableFetchError(options.error)
      || Number(options.error?.status || 0) >= 500
      || String(options.error?.data?.code || '') === 'order_create_failed';
    if (!shouldTry) return null;
    payload._caitRecoveryStartedAt = payload._caitRecoveryStartedAt || Date.now();
    updateWorkChatStatusCard(
      ja ? '受付状況を確認しています。' : 'Checking order acceptance.',
      ja
        ? 'レスポンスは失敗しましたが、オーダーが保存済みの可能性があります。再送せずに履歴を確認しています。'
        : 'The create response failed, but the order may already be saved. CAIt is checking history before allowing a retry.',
      'info'
    );
    if (els.runCreateStatus) {
      els.runCreateStatus.textContent = ja
        ? '受付状況を確認しています。\n\n再送せず、保存済みオーダーを確認しています。'
        : 'Checking order acceptance.\n\nNot resubmitting; checking for a saved order first.';
      els.runCreateStatus.className = 'detail-box action-card info compact-card';
    }
    for (let attempt = 0; attempt < 3; attempt += 1) {
      if (attempt) await waitForNetworkRetry(800 * attempt);
      try {
        const result = await api(`/api/jobs?limit=20&visitor_id=${encodeURIComponent(getVisitorId())}`, {
          preserveAuthOn401: true
        });
        const jobs = Array.isArray(result?.jobs) ? result.jobs : [];
        const recovered = jobs
          .filter((job) => orderCreateRecoveryCandidate(job, payload))
          .sort((left, right) => {
            const preferWorkflow = (job) => (job?.jobKind === 'workflow' || job?.workflow ? 1 : 0);
            const workflowDiff = preferWorkflow(right) - preferWorkflow(left);
            if (workflowDiff) return workflowDiff;
            return String(right?.createdAt || '').localeCompare(String(left?.createdAt || ''));
          })[0] || null;
        if (recovered?.id) {
          mergeProgressJobIntoSnapshot(recovered);
          return createdPayloadFromRecoveredJob(recovered);
        }
      } catch {}
    }
    const clientOrderId = clientOrderIdFromOrderCreate(payload);
    if (!payload._caitRecoveryRetried && clientOrderId) {
      payload._caitRecoveryRetried = true;
      updateWorkChatStatusCard(
        ja ? '同じ受付IDで再送しています。' : 'Retrying the same order request.',
        ja
          ? '保存済みオーダーがまだ見つからないため、同じ受付IDで一度だけ安全に再送しています。'
          : 'No saved order was found yet, so CAIt is retrying the same idempotent order request once.',
        'info'
      );
      if (els.runCreateStatus) {
        els.runCreateStatus.textContent = ja
          ? '同じ受付IDで再送しています。\n\n重複注文にならないよう、一度だけ安全に再送しています。'
          : 'Retrying the same order request.\n\nUsing the same client order ID so this cannot create a duplicate order.';
        els.runCreateStatus.className = 'detail-box action-card info compact-card';
      }
      try {
        return await api('/api/jobs', {
          method: 'POST',
          body: orderCreateRequestBody(payload)
        });
      } catch (retryError) {
        for (let attempt = 0; attempt < 2; attempt += 1) {
          if (attempt) await waitForNetworkRetry(800 * attempt);
          try {
            const result = await api(`/api/jobs?limit=20&visitor_id=${encodeURIComponent(getVisitorId())}`, {
              preserveAuthOn401: true
            });
            const jobs = Array.isArray(result?.jobs) ? result.jobs : [];
            const recovered = jobs
              .filter((job) => orderCreateRecoveryCandidate(job, payload))
              .sort((left, right) => String(right?.createdAt || '').localeCompare(String(left?.createdAt || '')))[0] || null;
            if (recovered?.id) {
              mergeProgressJobIntoSnapshot(recovered);
              return createdPayloadFromRecoveredJob(recovered);
            }
          } catch {}
        }
        throw retryError;
      }
    }
    return null;
  }

  function orderProgressMeta(subject = {}, options = {}) {
    const status = normalizeOrderProgressStatus(subject?.status || options.status || 'created');
    const counts = orderProgressCounts(subject);
    const isWorkflow = subject?.jobKind === 'workflow'
      || Boolean(subject?.workflow)
      || String(subject?.mode || '').toLowerCase() === 'workflow'
      || Boolean(subject?.workflow_job_id);
    const total = Math.max(
      isWorkflow ? Number(counts.total || 0) : 1,
      Number(counts.completed || 0) + Number(counts.failed || 0) + Number(counts.blocked || 0) + Number(counts.running || 0) + Number(counts.queued || 0),
      1
    );
    const completed = Math.max(0, Number(counts.completed || 0));
    const failed = Math.max(0, Number(counts.failed || 0));
    const blocked = Math.max(0, Number(counts.blocked || 0));
    let running = Math.max(0, Number(counts.running || 0));
    let queued = Math.max(0, Number(counts.queued || 0));
    if (!isWorkflow) {
      if (['completed', 'failed', 'timed_out', 'blocked'].includes(status)) running = 0;
      else if (!running && !queued) running = 1;
    } else if (status === 'blocked') {
      running = 0;
      queued = 0;
    } else if (!running && !queued && completed < total && status !== 'failed' && status !== 'timed_out') {
      queued = Math.max(1, total - completed - failed);
    }
    const shown = Math.min(7, total);
    const states = [];
    const pushState = (value, count) => {
      for (let index = 0; index < count && states.length < shown; index += 1) states.push(value);
    };
    pushState('completed', completed);
    pushState('running', running);
    pushState('queued', queued);
    pushState('failed', failed);
    pushState('waiting', blocked);
    while (states.length < shown) states.push(status === 'completed' ? 'completed' : 'queued');
    const ratioBase = total || 1;
    const weighted = status === 'completed' || status === 'blocked'
      ? ratioBase
      : Math.min(ratioBase, completed + (running * 0.62) + (queued * 0.18));
    const percent = status === 'failed' || status === 'timed_out'
      ? Math.max(8, Math.min(96, Math.round((weighted / ratioBase) * 100)))
      : Math.max(status === 'created' ? 10 : 14, Math.min(100, Math.round((weighted / ratioBase) * 100)));
    return {
      status,
      isWorkflow,
      total,
      shown,
      overflow: Math.max(0, total - shown),
      completed,
      running,
      queued,
      failed,
      blocked,
      percent,
      states,
      route: String(subject?.assignedAgentId || subject?.matched_agent_id || (isWorkflow ? (subject?.workflow?.teamName || 'Agent Team') : 'auto-routing')).trim() || 'auto-routing'
    };
  }

  function orderAcceptanceProgressPhase(elapsedMs = 0) {
    const elapsed = Math.max(0, Number(elapsedMs || 0));
    if (elapsed < 1200) return 0;
    if (elapsed < 3500) return 1;
    if (elapsed < 7500) return 2;
    return 3;
  }

  function orderAcceptanceProgressMeta(phase = 0, options = {}) {
    const safePhase = Math.max(0, Math.min(3, Number(phase || 0)));
    const total = 4;
    const completed = safePhase;
    const running = safePhase >= total ? 0 : 1;
    const queued = Math.max(0, total - completed - running);
    const states = [
      ...Array.from({ length: completed }, () => 'completed'),
      ...(running ? ['running'] : []),
      ...Array.from({ length: queued }, () => 'queued')
    ].slice(0, total);
    while (states.length < total) states.push('queued');
    return {
      status: 'created',
      isWorkflow: true,
      total,
      shown: total,
      overflow: 0,
      completed,
      running,
      queued,
      failed: 0,
      blocked: 0,
      percent: [12, 36, 64, 84][safePhase] || 12,
      states,
      route: options.ja ? '受付処理・エージェント未開始' : 'Acceptance only, agents not started',
      kind: 'acceptance',
      sideLabel: options.ja ? 'Order ID確定待ち' : 'Waiting for Order ID',
      note: options.ja
        ? 'これは受付処理です。エージェント実行の進捗ではありません。'
        : 'This is order acceptance, not agent execution.'
    };
  }

  function orderAcceptanceProgressBody(prompt = '', startedAt = Date.now(), options = {}) {
    const ja = options.ja ?? looksJapanese(prompt);
    const elapsedSec = Math.max(0, Math.floor((Date.now() - Number(startedAt || Date.now())) / 1000));
    const phase = orderAcceptanceProgressPhase(Date.now() - Number(startedAt || Date.now()));
    const meta = orderAcceptanceProgressMeta(phase, { ja });
    return [
      ja ? 'オーダーを受け付けています。まだエージェント実行は始まっていません。' : 'CAIt is accepting the order. Agent execution has not started yet.',
      '',
      ja ? `受付進捗: ${meta.percent}%` : `Acceptance progress: ${meta.percent}%`,
      ja ? `経過: ${elapsedSec}s` : `Elapsed: ${elapsedSec}s`,
      ja ? '状態: Order ID確定待ち' : 'Status: waiting for Order ID',
      ja
        ? 'この表示は受付処理だけを示します。Order ID が確定すると実行進捗に切り替わります。'
        : 'This shows acceptance only. It switches to execution progress after the Order ID is assigned.'
    ].join('\n');
  }

  function updateOpenChatAcceptanceProgress(prompt = '', startedAt = Date.now(), options = {}) {
    const ja = options.ja ?? looksJapanese(prompt);
    upsertOpenChatPendingDispatchMessage(orderAcceptanceProgressBody(prompt, startedAt, { ja }), {
      ja,
      progressMeta: orderAcceptanceProgressMeta(orderAcceptanceProgressPhase(Date.now() - Number(startedAt || Date.now())), { ja })
    });
  }

  function startOpenChatAcceptanceProgress(prompt = '', options = {}) {
    clearOpenChatAcceptanceProgressTimer();
    const startedAt = Number(options.startedAt || Date.now());
    updateOpenChatAcceptanceProgress(prompt, startedAt, options);
    openChatAcceptanceProgressTimer = window.setInterval(() => {
      updateOpenChatAcceptanceProgress(prompt, startedAt, options);
    }, 900);
    return clearOpenChatAcceptanceProgressTimer;
  }

  function orderProgressSummaryFromJob(job = {}) {
    const output = job?.output && typeof job.output === 'object' ? job.output : {};
    const report = output.report && typeof output.report === 'object' ? output.report : {};
    const rawSummary = String(output.summary || report.summary || output.message || '').trim();
    const authority = authorityRequestFromReport(report);
    if (!authorityRequestRequiresClientApproval(authority) && /waiting for approval|承認待ち/i.test(rawSummary)) {
      const counts = orderProgressCounts(job);
      return compactChatText([
        `Integrated delivery: ${counts.completed}/${counts.total || 0} internal work items completed`,
        counts.internalWaiting ? `${counts.internalWaiting} internal wait` : '',
        counts.stoppedAfterFailure ? `${counts.stoppedAfterFailure} stopped after failure` : '',
        counts.failed ? `${counts.failed} failed` : ''
      ].filter(Boolean).join(', ') + '.', 420);
    }
    return compactChatText(rawSummary, 420);
  }

  function workflowChildDeliveryMessageId(orderId = '', child = {}, index = 0) {
    const safeOrderId = String(orderId || '').trim();
    const childId = String(child?.id || child?.jobId || child?.job_id || '').trim();
    const fallback = `${String(child?.agentId || child?.agentName || child?.taskType || index).trim()}:${String(child?.status || '').trim()}:${compactChatText(child?.summary || child?.failureReason || '', 80)}`;
    return `child-delivery:${safeOrderId}:${childId || fallback}`;
  }

  function buildJobDeliveryCard(job = {}, options = {}) {
    const ja = Boolean(options.ja);
    const isWorkflow = job?.jobKind === 'workflow' || Boolean(job?.workflow);
    const summary = orderProgressSummaryFromJob(job);
    const files = deliveryFileNames(job?.output?.files, 8);
    return {
      kind: isWorkflow ? 'leader' : 'delivery',
      title: isWorkflow ? (ja ? 'リーダー納品' : 'Team Leader delivery') : (ja ? '納品' : 'Delivery'),
      responsibility: isWorkflow ? (ja ? '全体責任' : 'Overall responsibility') : (ja ? '担当責任' : 'Assigned responsibility'),
      summary,
      files
    };
  }

  function authorityConnectorActionsForJob(job = {}, options = {}) {
    const report = job?.output?.report && typeof job.output.report === 'object' ? job.output.report : {};
    const authority = authorityRequestFromReport(report);
    if (!authorityRequestRequiresClientApproval(authority)) return [];
    const connectors = new Set(
      normalizeClientList(authority?.missingConnectors || authority?.missing_connectors || authority?.connectors, [])
        .map(normalizeClientConnector)
        .filter(Boolean)
    );
    const capabilities = normalizeClientConnectorCapabilityList(
      authority?.missingConnectorCapabilities
        || authority?.missing_connector_capabilities
        || authority?.capabilities,
      []
    );
    if (capabilities.includes('x.post')) connectors.add('x');
    if (capabilities.includes('github.write_pr')) connectors.add('github');
    if (capabilities.some((capability) => capability.startsWith('google.'))) connectors.add('google');
    return [...connectors]
      .map((connector) => connectorActionForChat(connector))
      .filter((action) => action?.action)
      .filter((action, index, actions) => actions.findIndex((item) => item.action === action.action) === index)
      .map((action) => ({
        action: action.action,
        label: action.label || (options.ja ? '接続する' : 'CONNECT'),
        orderId: String(job?.id || '').trim()
      }));
  }

  function chatDeliveryDownloadActions(job = {}, options = {}) {
    const ja = Boolean(options.ja);
    const orderId = String(job?.id || '').trim();
    const files = downloadableDeliveryFilesForJob(job);
    if (!orderId || files.length < 1) return [];
    return [
      { action: 'download_delivery_zip', label: 'DOWNLOAD ZIP', orderId },
      ...authorityConnectorActionsForJob(job, options),
      { action: 'open_work_tab', label: ja ? 'DELIVERYを開く' : 'OPEN DELIVERY', orderId }
    ];
  }

  function deliveryDownloadChatBody(job = {}, options = {}) {
    const ja = Boolean(options.ja);
    const orderId = String(job?.id || '').trim();
    const status = normalizeOrderProgressStatus(job?.status || '');
    const report = job?.output?.report && typeof job.output.report === 'object' ? job.output.report : {};
    const authority = authorityRequestFromReport(report);
    const authorityBlocked = authorityRequestRequiresClientApproval(authority);
    const files = downloadableDeliveryFilesForJob(job);
    const names = files.map((file) => String(file?.name || '').trim()).filter(Boolean).slice(0, 10);
    if (ja) {
      return [
        authorityBlocked
          ? 'アクション工程まで進みました。納品ファイルは生成済みですが、外部投稿・送信は承認またはコネクター接続待ちです。'
          : (status === 'blocked'
            ? 'ワークフローは待機中です。承認が必要な場合だけ、この画面に承認理由と必要コネクターを表示します。'
            : '納品ファイルをまとめてダウンロードできます。'),
        '',
        `Order ID: ${orderId}`,
        authorityBlocked && authority?.reason ? `承認待ち理由: ${authority.reason}` : '',
        names.length ? `ZIP内容: ${names.join(', ')}` : '',
        '下の DOWNLOAD ZIP から、このオーダーの納品物をまとめて取得できます。',
        authorityBlocked ? '再発注や追加コンテキストはCAIt Chatで続けてください。' : ''
      ].filter(Boolean).join('\n');
    }
    return [
      authorityBlocked
        ? 'The workflow reached the action phase. Delivery files are ready, but external posting/sending is waiting for approval or connector access.'
        : (status === 'blocked'
          ? 'The workflow is waiting. Approval is shown only when an explicit approval reason and connector requirement are present.'
          : 'The delivery files are ready to download as one ZIP.'),
      '',
      `Order ID: ${orderId}`,
      authorityBlocked && authority?.reason ? `Approval wait: ${authority.reason}` : '',
      names.length ? `ZIP contents: ${names.join(', ')}` : '',
      'Use DOWNLOAD ZIP below to get the delivery bundle for this order.',
      authorityBlocked ? 'Use CAIt Chat for re-ordering or adding more context.' : ''
    ].filter(Boolean).join('\n');
  }

  function upsertOpenChatDeliveryDownloadMessage(job = {}, options = {}) {
    const safeOrderId = String(job?.id || '').trim();
    const status = normalizeOrderProgressStatus(job?.status || '');
    const actions = chatDeliveryDownloadActions(job, options);
    if (!safeOrderId || !isTerminalOrderStatus(status) || !actions.length) return false;
    const body = compactChatText(deliveryDownloadChatBody(job, options), 5000);
    if (!body) return false;
    const messages = Array.isArray(state.orderChatMessages) ? [...state.orderChatMessages] : [];
    const index = messages.findIndex((message) => String(message?.deliveryZipForOrderId || '').trim() === safeOrderId);
    const existing = index >= 0 ? messages[index] : null;
    const actionKey = JSON.stringify(actions);
    if (existing
      && String(existing.body || '') === body
      && String(existing.orderProgressStatus || '') === status
      && JSON.stringify(existing.actions || []) === actionKey) {
      return false;
    }
    finishOpenChatTyping({ render: false });
    const message = {
      ...(existing || {}),
      id: existing?.id || makeOpenChatMessageId(),
      role: 'agent',
      label: productShortName,
      body,
      tone: orderProgressTone(status),
      steps: orderProgressSteps(status, { ja: options.ja }),
      actions,
      discussionTurns: [],
      typing: false,
      orderProgressStatus: status,
      deliveryZipForOrderId: safeOrderId
    };
    if (index >= 0) messages[index] = message;
    else messages.push(message);
    state.orderChatMessages = messages.slice(-openChatSessionMaxMessages);
    return true;
  }

  function orderProgressMessageLabel(subject = {}) {
    const isWorkflow = subject?.jobKind === 'workflow'
      || Boolean(subject?.workflow)
      || String(subject?.mode || '').toLowerCase() === 'workflow'
      || Boolean(subject?.workflow_job_id);
    if (!isWorkflow) return productShortName;
    return compactChatText(String(subject?.workflow?.teamName || subject?.assignedAgentId || 'Team Leader').trim() || 'Team Leader', 80);
  }

  function orderRoutingContextLines(payload = {}, options = {}) {
    const ja = Boolean(options.ja);
    const requested = String(payload?.order_strategy_requested || '').trim().toLowerCase();
    const resolved = String(payload?.order_strategy_resolved || '').trim().toLowerCase();
    const reason = compactChatText(String(payload?.routing_reason || '').trim(), 240);
    const planned = Array.isArray(payload?.routing_planned_task_types)
      ? payload.routing_planned_task_types.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 8)
      : [];
    const lines = [];
    if (requested || resolved) {
      const requestedLabel = requested || 'auto';
      const resolvedLabel = resolved || 'single';
      lines.push(ja ? `ルーティング: ${requestedLabel.toUpperCase()} -> ${resolvedLabel.toUpperCase()}` : `Routing: ${requestedLabel.toUpperCase()} -> ${resolvedLabel.toUpperCase()}`);
    }
    if (reason) lines.push(ja ? `理由: ${reason}` : `Reason: ${reason}`);
    if (planned.length) lines.push(ja ? `計画タスク: ${planned.join(', ')}` : `Planned tasks: ${planned.join(', ')}`);
    return lines;
  }

  function orderProgressMessageFromCreated(created = {}, prompt = '') {
    const orderId = createdOrderPrimaryId(created) || '';
    const status = normalizeOrderProgressStatus(created?.status || 'created');
    const ja = looksJapanese(prompt);
    const isWorkflow = String(created?.mode || '').toLowerCase() === 'workflow' || Boolean(created?.workflow_job_id);
    const counts = orderProgressCounts(created);
    const agentLabel = created?.matched_agent_id ? String(created.matched_agent_id) : (isWorkflow ? 'Agent Team' : 'auto-routing');
    const childLine = isWorkflow && counts.total
      ? (ja
        ? `進捗: ${counts.completed}/${counts.total} agent runs 完了${counts.failed ? `, ${counts.failed} failed` : ''}${counts.approvalBlocked ? `, ${counts.approvalBlocked} approval wait` : ''}${counts.internalWaiting ? `, ${counts.internalWaiting} internal wait` : ''}${counts.stoppedAfterFailure ? `, ${counts.stoppedAfterFailure} stopped after failure` : ''}`
        : `Progress: ${counts.completed}/${counts.total} agent runs completed${counts.failed ? `, ${counts.failed} failed` : ''}${counts.approvalBlocked ? `, ${counts.approvalBlocked} approval wait` : ''}${counts.internalWaiting ? `, ${counts.internalWaiting} internal wait` : ''}${counts.stoppedAfterFailure ? `, ${counts.stoppedAfterFailure} stopped after failure` : ''}`)
      : '';
    const routingLines = orderRoutingContextLines(created, { ja });
    const failure = String(created?.failure_reason || created?.error || '').trim();
    if (status === 'failed' || status === 'timed_out') {
      return [
        ja ? 'オーダーはAgentに渡す前、またはdispatch中に止まりました。' : 'The order stopped before or during agent dispatch.',
        '',
        `Order ID: ${orderId}`,
        ja ? `状態: ${orderProgressStatusLabel(status, { ja })}` : `Status: ${orderProgressStatusLabel(status)}`,
        failure ? (ja ? `理由: ${failure}` : `Reason: ${failure}`) : '',
        ...routingLines,
        childLine,
        '',
        ja ? '次の対応: 対応できるAgentの確認後、同じ内容で再送してください。' : 'Next: check agent readiness, then retry the same order.'
      ].filter(Boolean).join('\n');
    }
    if (status === 'completed') {
      return [
        ja ? 'オーダーしました。Agentの処理は完了しています。' : 'Order sent. The agent has already completed the work.',
        '',
        orderId ? `Order ID: ${orderId}` : '',
        ja ? `接続先: ${agentLabel}` : `Route: ${agentLabel}`,
        ...routingLines,
        childLine,
        ja ? '納品はチャットの納品履歴/Deliveryに表示されます。' : 'The delivery is available in Chat delivery history / Delivery.'
      ].filter(Boolean).join('\n');
    }
    if (status === 'blocked') {
      return [
        ja ? 'オーダーは待機状態になりました。承認が必要な場合は理由と必要コネクターを表示します。' : 'The order is waiting. Approval is shown only when an explicit approval reason and connector requirement are present.',
        '',
        orderId ? `Order ID: ${orderId}` : '',
        ja ? `状態: ${orderProgressStatusLabel(status, { ja })}` : `Status: ${orderProgressStatusLabel(status)}`,
        failure ? (ja ? `理由: ${failure}` : `Reason: ${failure}`) : '',
        ja ? `接続先: ${agentLabel}` : `Route: ${agentLabel}`,
        ...routingLines,
        childLine,
        ja ? '納品ファイルは生成済みの場合、チャットとWORKのDeliveryからダウンロードできます。' : 'If delivery files were generated, they are downloadable from chat and Chat Delivery.'
      ].filter(Boolean).join('\n');
    }
    return [
      ja ? '発注を受け付けました。CAItが接続と進捗確認を始めています。' : 'Order accepted. CAIt is starting dispatch and progress tracking.',
      '',
      orderId ? `Order ID: ${orderId}` : (ja ? 'Order ID: 発行待ち' : 'Order ID: pending'),
      ja ? `状態: ${orderProgressStatusLabel(status, { ja })}` : `Status: ${orderProgressStatusLabel(status)}`,
      ja ? `接続先: ${agentLabel}` : `Route: ${agentLabel}`,
      ...routingLines,
      childLine,
      ja ? '完了したら納品がチャットの納品履歴/Deliveryに出ます。' : 'When it finishes, the delivery appears in Chat delivery history / Delivery.'
    ].filter(Boolean).join('\n');
  }

  function orderProgressMessageFromJob(job = {}, options = {}) {
    const status = normalizeOrderProgressStatus(job?.status || 'created');
    const ja = Boolean(options.ja);
    const counts = orderProgressCounts(job);
    const isWorkflow = job?.jobKind === 'workflow' || Boolean(job?.workflow);
    const childLine = isWorkflow && counts.total
      ? (ja
        ? `進捗: ${counts.completed}/${counts.total} agent runs 完了${counts.failed ? `, ${counts.failed} failed` : ''}${counts.approvalBlocked ? `, ${counts.approvalBlocked} approval wait` : ''}${counts.internalWaiting ? `, ${counts.internalWaiting} internal wait` : ''}${counts.stoppedAfterFailure ? `, ${counts.stoppedAfterFailure} stopped after failure` : ''}${counts.running ? `, ${counts.running} running` : ''}${counts.queued ? `, ${counts.queued} queued` : ''}`
        : `Progress: ${counts.completed}/${counts.total} agent runs completed${counts.failed ? `, ${counts.failed} failed` : ''}${counts.approvalBlocked ? `, ${counts.approvalBlocked} approval wait` : ''}${counts.internalWaiting ? `, ${counts.internalWaiting} internal wait` : ''}${counts.stoppedAfterFailure ? `, ${counts.stoppedAfterFailure} stopped after failure` : ''}${counts.running ? `, ${counts.running} running` : ''}${counts.queued ? `, ${counts.queued} queued` : ''}`)
      : '';
    const route = job?.assignedAgentId || (isWorkflow ? (job?.workflow?.teamName || 'Agent Team') : 'auto-routing');
    const summary = orderProgressSummaryFromJob(job);
    const workflowDetails = isWorkflow ? workflowProgressDetails(job, options) : [];
    const report = job?.output?.report && typeof job.output.report === 'object' ? job.output.report : {};
    const authority = authorityRequestFromReport(report);
    const authorityBlocked = authorityRequestRequiresClientApproval(authority);
    if (status === 'completed') {
      return [
        isWorkflow
          ? (ja ? 'リーダーエージェントの全体サマリーと納品物です。全体責任はこのメッセージで持ちます。' : 'Here is the Team Leader summary and delivery. This message owns the overall result.')
          : (ja ? 'オーダーが完了しました。納品を確認できます。' : 'Order completed. Delivery is ready.'),
        '',
        `Order ID: ${job.id || 'unknown'}`,
        ja ? `接続先: ${route}` : `Route: ${route}`,
        childLine,
        summary ? (ja ? `概要: ${summary}` : `Summary: ${summary}`) : '',
        ...jobDeliveryFileLines(job, { ja }),
        '',
        isWorkflow
          ? (ja ? '続いて、各子エージェントがそれぞれの担当領域のサマリーと納品物をこのチャットに出します。' : 'Next, each specialist will post the summary and delivery for its own area in this chat.')
          : (ja ? 'チャットの納品履歴/Deliveryでファイル、ソース、コストを確認できます。' : 'Open Chat details / Delivery to review files, sources, and cost.')
      ].filter(Boolean).join('\n');
    }
    if (status === 'blocked') {
      return [
        authorityBlocked
          ? (ja ? 'アクション工程まで進みましたが、外部投稿・送信は承認またはコネクター接続待ちです。' : 'The workflow reached the action phase, but external posting/sending is waiting for approval or connector access.')
          : (counts.stoppedAfterFailure
            ? (ja ? 'ワークフローは前段の失敗により停止しました。これは承認待ちではありません。' : 'The workflow stopped after an earlier failure. This is not an approval wait.')
            : (ja ? 'ワークフローは内部工程の待機中です。これは承認待ちではありません。' : 'The workflow is waiting on an internal workflow phase. This is not an approval wait.')),
        '',
        `Order ID: ${job.id || 'unknown'}`,
        ja ? `状態: ${orderProgressStatusLabel(status, { ja })}` : `Status: ${orderProgressStatusLabel(status)}`,
        ja ? `接続先: ${route}` : `Route: ${route}`,
        job?.failureReason ? (ja ? `理由: ${job.failureReason}` : `Reason: ${job.failureReason}`) : '',
        authorityBlocked && authority?.reason ? (ja ? `承認待ち理由: ${authority.reason}` : `Approval wait: ${authority.reason}`) : '',
        childLine,
        summary ? (ja ? `概要: ${summary}` : `Summary: ${summary}`) : '',
        ...jobDeliveryFileLines(job, { ja }),
        '',
        authorityBlocked
          ? (ja ? '次の対応: 必要なコネクターを接続・承認してください。再発注や追加コンテキストはCAIt Chatで続けてください。' : 'Next: connect/approve the required connector. Use CAIt Chat for re-ordering or adding more context.')
          : (ja ? '次の対応: 失敗または待機中の内部runを確認してください。外部承認ボタンで解決する状態ではありません。' : 'Next: inspect the failed or waiting internal run. This state is not resolved by an external approval button.')
      ].filter(Boolean).join('\n');
    }
    if (status === 'failed' || status === 'timed_out') {
      return [
        ja ? 'オーダーは停止しました。' : 'Order stopped.',
        '',
        `Order ID: ${job.id || 'unknown'}`,
        ja ? `状態: ${orderProgressStatusLabel(status, { ja })}` : `Status: ${orderProgressStatusLabel(status)}`,
        job?.failureReason ? (ja ? `理由: ${job.failureReason}` : `Reason: ${job.failureReason}`) : '',
        childLine,
        '',
        ja ? '原因を確認してから再送してください。' : 'Review the cause before retrying.'
      ].filter(Boolean).join('\n');
    }
    if (status === 'queued' || status === 'created') {
      return [
        ja ? 'オーダーは受付済みです。まだ実行は始まっていません。' : 'Order accepted. Execution has not started yet.',
        '',
        `Order ID: ${job.id || 'unknown'}`,
        ja ? `状態: ${orderProgressStatusLabel(status, { ja })}` : `Status: ${orderProgressStatusLabel(status)}`,
        ja ? `接続先: ${route}` : `Route: ${route}`,
        childLine,
        ...workflowDetails,
        ja ? '最初のエージェントが動き出したら、この表示を実行中に更新します。' : 'This status changes to running after the first agent actually starts.'
      ].filter(Boolean).join('\n');
    }
    return [
      ja ? 'オーダーは進行中です。' : 'Order is in progress.',
      '',
      `Order ID: ${job.id || 'unknown'}`,
      ja ? `状態: ${orderProgressStatusLabel(status, { ja })}` : `Status: ${orderProgressStatusLabel(status)}`,
      ja ? `接続先: ${route}` : `Route: ${route}`,
      childLine,
      ...workflowDetails,
      ja ? '完了したらこの表示とDeliveryを更新します。' : 'This status and Delivery will update when it finishes.'
    ].filter(Boolean).join('\n');
  }

  function orderProgressKeyFromJob(job = {}) {
    const counts = orderProgressCounts(job);
    const childFingerprint = workflowChildRunsFromJob(job)
      .slice(0, 12)
      .map((child) => [
        String(child?.taskType || '').trim(),
        String(child?.sequencePhase || '').trim(),
        String(child?.status || '').trim(),
        compactChatText(String(child?.summary || child?.failureReason || '').trim(), 80),
        compactProgressLogLine(child?.latestLog || '', 80)
      ].join(':'))
      .join('|');
    const lastLog = compactProgressLogLine((Array.isArray(job?.logs) ? job.logs : []).slice(-1)[0] || '', 120);
    return [
      normalizeOrderProgressStatus(job?.status),
      job?.completedAt || '',
      job?.failedAt || '',
      job?.timedOutAt || '',
      job?.lastCallbackAt || '',
      job?.dispatchedAt || '',
      counts.total,
      counts.completed,
      counts.failed,
      counts.running,
      counts.queued,
      compactChatText(job?.failureReason || '', 120),
      childFingerprint,
      lastLog
    ].join('|');
  }

  function upsertOpenChatOrderProgressMessage(orderId = '', body = '', options = {}) {
    const safeOrderId = String(orderId || '').trim();
    const safeBody = compactChatText(body, 5000);
    if (!safeOrderId || !safeBody) return;
    finishOpenChatTyping({ render: false });
    const tone = options.tone || orderProgressTone(options.status || '');
    const messages = Array.isArray(state.orderChatMessages) ? [...state.orderChatMessages] : [];
    const index = messages.findIndex((message) => message?.orderProgressId === safeOrderId);
    const message = {
      ...(index >= 0 ? messages[index] : {}),
      role: 'agent',
      label: options.label || (index >= 0 ? messages[index]?.label : '') || productShortName,
      body: safeBody,
      tone,
      steps: orderProgressSteps(options.status || '', { ja: options.ja }),
      actions: [],
      discussionTurns: [],
      typing: false,
      orderProgressId: safeOrderId,
      orderProgressStatus: normalizeOrderProgressStatus(options.status || ''),
      progressMeta: options.progressMeta || null,
      deliveryCard: options.deliveryCard || null
    };
    if (index >= 0) messages[index] = message;
    else messages.push(message);
    state.orderChatMessages = messages.slice(-openChatSessionMaxMessages);
    state.openChatLastStatus = safeBody;
    state.openChatLastStatusTone = tone;
    markCurrentOpenChatSessionLinkedOrder(safeOrderId, { status: options.status || message.orderProgressStatus || '' });
    const statusParts = safeBody.split(/\n\n+/);
    updateWorkChatStatusCard(statusParts.shift() || 'Order status updated.', statusParts.join('\n\n') || '', tone);
    renderWorkChatThread();
    persistCurrentOpenChatSession();
  }

  function appendOpenChatOrderProgressMessage(body = '', options = {}) {
    const safeBody = compactChatText(body, 5000);
    if (!safeBody) return;
    finishOpenChatTyping({ render: false });
    const tone = options.tone || orderProgressTone(options.status || '');
    const message = {
      id: makeOpenChatMessageId(),
      role: 'agent',
      label: options.label || productShortName,
      body: safeBody,
      tone,
      steps: orderProgressSteps(options.status || '', { ja: options.ja }),
      actions: [],
      discussionTurns: [],
      typing: false,
      orderProgressStatus: normalizeOrderProgressStatus(options.status || '')
    };
    const messages = Array.isArray(state.orderChatMessages) ? [...state.orderChatMessages, message] : [message];
    state.orderChatMessages = messages.slice(-openChatSessionMaxMessages);
    state.openChatLastStatus = safeBody;
    state.openChatLastStatusTone = tone;
    const statusParts = safeBody.split(/\n\n+/);
    updateWorkChatStatusCard(statusParts.shift() || 'Order status updated.', statusParts.join('\n\n') || '', tone);
    renderWorkChatThread();
    persistCurrentOpenChatSession();
  }

  function upsertOpenChatPendingDispatchMessage(body = '', options = {}) {
    const safeBody = compactChatText(body, 5000);
    if (!safeBody) return;
    finishOpenChatTyping({ render: false });
    const tone = options.tone || 'info';
    const messages = Array.isArray(state.orderChatMessages) ? [...state.orderChatMessages] : [];
    const pendingId = String(state.openChatPendingDispatchMessageId || '').trim();
    let index = pendingId ? messages.findIndex((message) => String(message?.id || '').trim() === pendingId) : -1;
    if (index < 0) index = messages.findIndex((message) => message?.pendingDispatch === true);
    const messageId = index >= 0 ? String(messages[index]?.id || makeOpenChatMessageId()) : makeOpenChatMessageId();
    const message = {
      ...(index >= 0 ? messages[index] : {}),
      id: messageId,
      role: 'agent',
      label: options.label || productShortName,
      body: safeBody,
      tone,
      steps: orderProgressSteps('created', { ja: options.ja }),
      actions: [],
      discussionTurns: [],
      typing: false,
      pendingDispatch: true,
      orderProgressStatus: 'created',
      progressMeta: options.progressMeta || null
    };
    if (index >= 0) messages[index] = message;
    else messages.push(message);
    state.orderChatMessages = messages.slice(-openChatSessionMaxMessages);
    state.openChatPendingDispatchMessageId = messageId;
    state.openChatLastStatus = safeBody;
    state.openChatLastStatusTone = tone;
    const statusParts = safeBody.split(/\n\n+/);
    updateWorkChatStatusCard(statusParts.shift() || 'Sending order...', statusParts.join('\n\n') || '', tone);
    renderWorkChatThread();
    persistCurrentOpenChatSession();
  }

  function clearOpenChatPendingDispatchMessage(options = {}) {
    clearOpenChatAcceptanceProgressTimer();
    const pendingId = String(state.openChatPendingDispatchMessageId || '').trim();
    const messages = Array.isArray(state.orderChatMessages) ? state.orderChatMessages : [];
    if (!messages.length && !pendingId) {
      state.openChatPendingDispatchMessageId = '';
      return;
    }
    const filtered = messages.filter((message) => {
      const messageId = String(message?.id || '').trim();
      if (pendingId && messageId === pendingId) return false;
      if (!pendingId && message?.pendingDispatch === true) return false;
      return !message?.pendingDispatch;
    });
    const changed = filtered.length !== messages.length;
    state.orderChatMessages = filtered;
    state.openChatPendingDispatchMessageId = '';
    if (changed && options.render !== false) {
      renderWorkChatThread();
      persistCurrentOpenChatSession();
    }
  }

  function upsertOpenChatWorkflowChildDeliveryMessage(orderId = '', child = {}, options = {}) {
    const safeOrderId = String(orderId || '').trim();
    const safeMessageId = workflowChildDeliveryMessageId(safeOrderId, child, options.index || 0);
    const safeBody = compactChatText(workflowChildDeliveryBody(child, options), 5000);
    if (!safeOrderId || !safeMessageId || !safeBody) return;
    finishOpenChatTyping({ render: false });
    const messages = Array.isArray(state.orderChatMessages) ? [...state.orderChatMessages] : [];
    const tone = orderProgressTone(child?.status || '');
    const message = {
      role: 'agent',
      label: workflowChildDeliveryLabel(child),
      body: safeBody,
      tone,
      steps: orderProgressSteps(child?.status || '', { ja: options.ja }),
      actions: [],
      discussionTurns: [],
      typing: false,
      workflowChildDeliveryId: safeMessageId,
      workflowParentId: safeOrderId,
      orderProgressStatus: normalizeOrderProgressStatus(child?.status || ''),
      deliveryCard: buildWorkflowChildDeliveryCard(child, options)
    };
    const index = messages.findIndex((item) => item?.workflowChildDeliveryId === safeMessageId);
    if (index >= 0) messages[index] = { ...messages[index], ...message };
    else messages.push(message);
    state.orderChatMessages = messages.slice(-openChatSessionMaxMessages);
  }

  function isTerminalWorkflowChildDelivery(child = {}) {
    const status = normalizeOrderProgressStatus(child?.status || '');
    if (status !== 'blocked') return isTerminalOrderStatus(status);
    const taskType = String(child?.taskType || child?.task_type || '').trim().toLowerCase();
    const phase = String(child?.sequencePhase || child?.sequence_phase || '').trim().toLowerCase();
    const reason = String(child?.failureReason || child?.failure_reason || child?.summary || '').trim();
    const category = String(child?.failureCategory || child?.failure_category || child?.completionStatus || child?.completion_status || '').trim().toLowerCase();
    if (!reason && /(^|_)(leader)$/.test(taskType) && ['checkpoint', 'final_summary'].includes(phase)) return false;
    return !/(leader_checkpoint_blocked|leader_final_summary_blocked|workflow_blocked|blocked_by_workflow|blocked until|waiting for the earlier workflow phase|waiting for earlier)/i.test(`${category} ${reason}`);
  }

  function syncOpenChatWorkflowChildDeliveryMessages(job = {}, options = {}) {
    const safeOrderId = String(job?.id || '').trim();
    if (!safeOrderId) return;
    const childRuns = workflowChildRunsFromJob(job);
    if (!childRuns.length) return;
    let changed = false;
    childRuns.forEach((child, index) => {
      if (!isTerminalWorkflowChildDelivery(child)) return;
      const beforeKey = workflowChildDeliveryMessageId(safeOrderId, child, index);
      const existing = (Array.isArray(state.orderChatMessages) ? state.orderChatMessages : []).find((item) => item?.workflowChildDeliveryId === beforeKey);
      const nextBody = compactChatText(workflowChildDeliveryBody(child, options), 5000);
      upsertOpenChatWorkflowChildDeliveryMessage(safeOrderId, child, { ...options, index });
      if (!existing || String(existing.body || '') !== nextBody) changed = true;
    });
    if (changed) {
      renderWorkChatThread();
      persistCurrentOpenChatSession();
    }
  }

  function mergeProgressJobIntoSnapshot(job = {}) {
    if (!job?.id || !state.snapshot) return;
    if (!job.__optimisticOrder && state.optimisticOrderJobs?.[job.id]) {
      const nextOptimistic = { ...(state.optimisticOrderJobs || {}) };
      delete nextOptimistic[job.id];
      state.optimisticOrderJobs = nextOptimistic;
    }
    const jobs = Array.isArray(state.snapshot.jobs) ? [...state.snapshot.jobs] : [];
    const index = jobs.findIndex((item) => item.id === job.id);
    if (index >= 0) jobs[index] = job;
    else jobs.unshift(job);
    state.snapshot.jobs = jobs;
    renderJobs(state.snapshot.jobs || []);
    if (state.selectedJobId === job.id) setDetail(job);
  }

  function isTerminalOrderStatus(status = '') {
    return ['completed', 'failed', 'timed_out', 'blocked'].includes(normalizeOrderProgressStatus(status));
  }

  function trackedOrderIdsForHistory() {
    const ids = new Set();
    const remember = (value = '') => {
      const safeValue = String(value || '').trim();
      if (safeValue) ids.add(safeValue);
    };
    const rememberMessages = (messages = []) => {
      (Array.isArray(messages) ? messages : []).forEach((message) => {
        remember(message?.orderProgressId || '');
        remember(message?.deliveryZipForOrderId || '');
      });
    };
    rememberMessages(state.orderChatMessages);
    readOpenChatSessions().forEach((session) => {
      remember(session?.linkedOrderId || '');
      (Array.isArray(session?.activeJobIds) ? session.activeJobIds : []).forEach((jobId) => remember(jobId));
      rememberMessages(session?.messages || []);
    });
    return [...ids];
  }

  function shouldRetryOrderHistoryBackfill(orderId = '') {
    const safeOrderId = String(orderId || '').trim();
    if (!safeOrderId || orderHistoryBackfillInFlight.has(safeOrderId)) return false;
    const failedAt = Number(orderHistoryBackfillFailedAt.get(safeOrderId) || 0);
    return !failedAt || (Date.now() - failedAt) >= ORDER_HISTORY_BACKFILL_RETRY_MS;
  }

  async function backfillTrackedJobsIntoSnapshot(snapshot = state.snapshot || {}) {
    if (!state.snapshot) return 0;
    const knownJobIds = new Set(
      (Array.isArray(snapshot?.jobs) ? snapshot.jobs : []).map((job) => String(job?.id || '').trim()).filter(Boolean)
    );
    const missingTrackedIds = trackedOrderIdsForHistory()
      .filter((jobId) => !knownJobIds.has(jobId))
      .filter((jobId) => shouldRetryOrderHistoryBackfill(jobId));
    if (!missingTrackedIds.length) return 0;
    let restored = 0;
    await Promise.all(missingTrackedIds.map(async (jobId) => {
      orderHistoryBackfillInFlight.add(jobId);
      try {
        const response = await api(`/api/jobs/${encodeURIComponent(jobId)}?visitor_id=${encodeURIComponent(getVisitorId())}`, {
          preserveAuthOn401: true
        });
        const job = response?.job && typeof response.job === 'object'
          ? { ...response.job, id: response.job.id || jobId }
          : { ...(response || {}), id: response?.id || jobId };
        if (job?.id) {
          orderHistoryBackfillFailedAt.delete(jobId);
          mergeProgressJobIntoSnapshot(job);
          restored += 1;
        }
      } catch {
        orderHistoryBackfillFailedAt.set(jobId, Date.now());
      } finally {
        orderHistoryBackfillInFlight.delete(jobId);
      }
    }));
    if (restored) syncOpenChatTrackedJobsFromSnapshot(state.snapshot || snapshot);
    return restored;
  }

  function syncOpenChatTrackedJobsFromSnapshot(snapshot = state.snapshot || {}) {
    const jobs = Array.isArray(snapshot?.jobs) ? snapshot.jobs : [];
    if (!jobs.length) return;
    const trackedOrderIds = new Set(
      (Array.isArray(state.orderChatMessages) ? state.orderChatMessages : [])
        .map((message) => String(message?.orderProgressId || '').trim())
        .filter(Boolean)
    );
    if (!trackedOrderIds.size) return;
    let changed = false;
    jobs.forEach((job) => {
      if (!trackedOrderIds.has(String(job?.id || '').trim())) return;
      const ja = looksJapanese(job?.prompt || '');
      upsertOpenChatOrderProgressMessage(job.id, orderProgressMessageFromJob(job, { ja }), {
        status: job.status,
        tone: orderProgressTone(job.status),
        ja,
        progressMeta: orderProgressMeta(job, { ja }),
        label: orderProgressMessageLabel(job),
        deliveryCard: isTerminalOrderStatus(job?.status || '') ? buildJobDeliveryCard(job, { ja }) : null
      });
      syncOpenChatWorkflowChildDeliveryMessages(job, { ja });
      upsertOpenChatDeliveryDownloadMessage(job, { ja });
      changed = true;
    });
    if (changed) {
      renderWorkChatThread();
      persistCurrentOpenChatSession();
    }
  }

  async function pollOpenChatOrderProgress(orderId = '', options = {}) {
    const safeOrderId = String(orderId || '').trim();
    if (!safeOrderId || state.openChatProgressOrderId !== safeOrderId) return;
    clearOpenChatOrderProgressTimer();
    state.openChatProgressPollCount += 1;
    try {
      const response = await api(`/api/jobs/${encodeURIComponent(safeOrderId)}?visitor_id=${encodeURIComponent(getVisitorId())}`);
      const job = response?.job && typeof response.job === 'object'
        ? { ...response.job, id: response.job.id || safeOrderId }
        : { ...(response || {}), id: response?.id || safeOrderId };
      const key = orderProgressKeyFromJob(job);
      if (key !== state.openChatProgressLastKey) {
        state.openChatProgressLastKey = key;
        mergeProgressJobIntoSnapshot(job);
        upsertOpenChatOrderProgressMessage(safeOrderId, orderProgressMessageFromJob(job, options), {
          status: job.status,
          tone: orderProgressTone(job.status),
          ja: options.ja,
          progressMeta: orderProgressMeta(job, options),
          label: orderProgressMessageLabel(job),
          deliveryCard: isTerminalOrderStatus(job?.status || '') ? buildJobDeliveryCard(job, options) : null
        });
        syncOpenChatWorkflowChildDeliveryMessages(job, options);
        const deliveryDownloadChanged = upsertOpenChatDeliveryDownloadMessage(job, options);
        if (deliveryDownloadChanged) {
          renderWorkChatThread();
          persistCurrentOpenChatSession();
        }
        if (isTerminalOrderStatus(job.status)) {
          void trackChatTranscript(job.prompt || '', {
            kind: 'order',
            body: orderProgressMessageFromJob(job, options),
            status: job.status
          }, {
            source: 'work_chat_progress',
            status: job.status,
            taskType: job.taskType || ''
          });
        }
      }
      if (isTerminalOrderStatus(job.status) || state.openChatProgressPollCount >= openChatOrderProgressMaxPolls) {
        state.openChatProgressOrderId = '';
        return;
      }
    } catch (error) {
      const status = Number(error?.status || 0);
      if (status === 401 || status === 404 || state.openChatProgressPollCount >= 3) {
        const stalledBody = [
          options.ja ? '進捗確認を中断しました。現在のセッションではこのオーダーを確認できません。' : 'Progress check stopped. This session could not verify the order.',
          '',
          `Order ID: ${safeOrderId}`,
          options.ja ? '状態: attention' : 'Status: attention',
          error?.message ? (options.ja ? `理由: ${String(error.message).slice(0, 240)}` : `Reason: ${String(error.message).slice(0, 240)}`) : '',
          options.ja ? 'WORK を再読込してください。直らなければログインし直して再確認してください。' : 'Reload Chat. If it still fails, sign in again and recheck the order.'
        ].filter(Boolean).join('\n');
        upsertOpenChatOrderProgressMessage(safeOrderId, stalledBody, {
          status: 'attention',
          tone: 'warn',
          ja: options.ja,
          progressMeta: null,
          label: productShortName
        });
        state.openChatProgressOrderId = '';
        return;
      }
    }
    openChatOrderProgressTimer = window.setTimeout(() => {
      void pollOpenChatOrderProgress(safeOrderId, options);
    }, openChatOrderProgressPollMs);
  }

  function startOpenChatOrderProgressPolling(orderId = '', options = {}) {
    const safeOrderId = String(orderId || '').trim();
    clearOpenChatOrderProgressTimer();
    state.openChatProgressOrderId = safeOrderId;
    state.openChatProgressLastKey = '';
    state.openChatProgressPollCount = 0;
    if (!safeOrderId || isTerminalOrderStatus(options.status || '')) return;
    if (options.immediate === true) {
      void pollOpenChatOrderProgress(safeOrderId, options);
      return;
    }
    openChatOrderProgressTimer = window.setTimeout(() => {
      void pollOpenChatOrderProgress(safeOrderId, options);
    }, openChatOrderProgressPollMs);
  }

  return {
    appendOpenChatOrderProgressMessage,
    backfillTrackedJobsIntoSnapshot,
    clearOpenChatAcceptanceProgressTimer,
    clearOpenChatOrderProgressTimer,
    clearOpenChatPendingDispatchMessage,
    clientOrderIdFromOrderCreate,
    createdOrderPrimaryId,
    makeClientOrderId,
    mergeOptimisticOrderJobsIntoSnapshot,
    orderAcceptanceProgressBody,
    orderProgressMessageFromCreated,
    recoverAcceptedOrderAfterCreateError,
    revealCreatedOrderInHistory,
    startOpenChatAcceptanceProgress,
    startOpenChatOrderProgressPolling,
    syncOpenChatTrackedJobsFromSnapshot,
    upsertOpenChatOrderProgressMessage,
    upsertOpenChatPendingDispatchMessage
  };
}
