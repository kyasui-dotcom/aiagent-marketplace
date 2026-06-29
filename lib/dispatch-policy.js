const JOB_TRANSITIONS = {
  claim: ['queued', 'dispatched', 'running', 'claimed'],
  callback: ['claimed', 'running', 'dispatched'],
  manualResult: ['queued', 'claimed', 'running', 'dispatched'],
  retry: ['failed', 'timed_out', 'dispatched', 'queued'],
  timeout: ['queued', 'claimed', 'running', 'dispatched'],
  complete: ['queued', 'claimed', 'running', 'dispatched'],
  fail: ['queued', 'claimed', 'running', 'dispatched']
};

export function createDispatchPolicyHelpers({
  DEFAULT_GENERATION_PROVIDER_TIMEOUT_MS,
  MAX_ENDPOINT_DISPATCH_WAIT_MS,
  ONE_DAY_MS,
  effectiveTimeoutDeadlineMs,
  isWorkflowLeaderTask,
  workflowQualitySourceTask,
  workflowSequencePhaseForJob,
  workflowTaskName
} = {}) {
  const DISPATCH_SCHEDULE_STALE_MS = 90_000;
  const DISPATCH_SCHEDULE_TIMEOUT_MS = ONE_DAY_MS;
  const DISPATCH_IN_PROGRESS_STALE_MS = 3 * 60 * 1000;
  const COMPLETION_SWEEP_STALE_MS = 15 * 60 * 1000;
  const COMPLETION_QUEUE_STALE_MS = 2 * 60 * 1000;
  const COMPLETION_QUEUE_RECOVERY_STALE_MS = 90 * 1000;
  const DEFAULT_WORKFLOW_DISPATCH_MAX_AGE_MS = 24 * 60 * 60 * 1000;
  const WORKFLOW_PROGRESS_DISPATCH_MAX_TARGETS = 50;

  function normalizeJobStatus(status) {
    return String(status || '').trim().toLowerCase();
  }

  function isBlockedAgentResultStatus(status) {
    return ['blocked', 'action_required', 'needs_action', 'approval_required', 'connector_required', 'blocked_waiting_for_approval']
      .includes(normalizeJobStatus(status));
  }

  function isTerminalJobStatus(status) {
    return ['completed', 'failed', 'timed_out'].includes(normalizeJobStatus(status));
  }

  function canTransitionJob(job, action) {
    const status = normalizeJobStatus(job?.status);
    const allowed = JOB_TRANSITIONS[action] || [];
    return allowed.includes(status);
  }

  function transitionErrorCode(job, action) {
    if (isTerminalJobStatus(job?.status)) return 'job_already_terminal';
    if (action === 'callback') return 'invalid_callback_transition';
    return 'invalid_job_transition';
  }

  function maxDispatchRetriesForJob(job) {
    const configured = Math.max(0, Number(job?.dispatch?.maxRetries ?? 3));
    if (job?.jobKind === 'workflow_child' || job?.workflowParentId) return Math.max(configured, 3);
    return configured;
  }

  function computeNextRetryAt(attempts, baseTime = Date.now()) {
    const retryDelaySec = Math.min(300, Math.max(5, 5 * (2 ** Math.max(0, attempts - 1))));
    return new Date(baseTime + retryDelaySec * 1000).toISOString();
  }

  function dispatchScheduleIsFresh(job, now = Date.now(), staleMs = DISPATCH_SCHEDULE_STALE_MS) {
    const status = String(job?.dispatch?.completionStatus || '').trim().toLowerCase();
    if (status !== 'dispatch_scheduled') return false;
    const at = Date.parse(String(job?.dispatch?.dispatchRequestedAt || job?.dispatch?.scheduledAt || ''));
    return Number.isFinite(at) && now - at < staleMs;
  }

  function dispatchScheduleIsFreshForAgent(job, agent, now = Date.now()) {
    return dispatchScheduleIsFresh(job, now, DISPATCH_SCHEDULE_STALE_MS);
  }

  function workflowGenerationProviderTimeoutMs(env = {}, job = {}) {
    const configured = Number(
      env?.GENERATION_PROVIDER_TIMEOUT_MS
      || env?.PROVIDER_GENERATION_TIMEOUT_MS
      || env?.WORKFLOW_GENERATION_PROVIDER_TIMEOUT_MS
      || 0
    );
    if (Number.isFinite(configured) && configured > 0) {
      return Math.max(45_000, Math.min(MAX_ENDPOINT_DISPATCH_WAIT_MS, configured));
    }
    return DEFAULT_GENERATION_PROVIDER_TIMEOUT_MS;
  }

  function endpointDispatchTimeoutMs(env = {}, job = {}, agent = null) {
    const configured = Number(env?.ENDPOINT_DISPATCH_TIMEOUT_MS || env?.WORKFLOW_ENDPOINT_DISPATCH_TIMEOUT_MS || 0);
    const maxWait = Number.isFinite(configured) && configured > 0
      ? Math.max(10_000, Math.min(MAX_ENDPOINT_DISPATCH_WAIT_MS, configured))
      : workflowGenerationProviderTimeoutMs(env, job);
    const deadline = effectiveTimeoutDeadlineMs(job, agent) || maxWait;
    return Math.max(10_000, Math.min(MAX_ENDPOINT_DISPATCH_WAIT_MS, maxWait, deadline));
  }

  function dispatchInProgressFreshMs(job = {}, agent = null) {
    const storedTimeoutMs = Number(job?.dispatch?.dispatchTimeoutMs || job?.dispatch?.timeoutMs || 0);
    const deadlineMs = effectiveTimeoutDeadlineMs(job, agent) || DISPATCH_SCHEDULE_TIMEOUT_MS;
    const budgetMs = Number.isFinite(storedTimeoutMs) && storedTimeoutMs > 0 ? storedTimeoutMs : deadlineMs;
    return Math.max(DISPATCH_IN_PROGRESS_STALE_MS, Math.min(MAX_ENDPOINT_DISPATCH_WAIT_MS + 30_000, budgetMs + 30_000));
  }

  function dispatchExecutionIsFresh(job = {}, agent = null, now = Date.now()) {
    const status = String(job?.dispatch?.completionStatus || '').trim().toLowerCase();
    if (status !== 'dispatch_in_progress') return false;
    const at = Date.parse(String(job?.dispatch?.dispatchInProgressAt || job?.dispatch?.lastAttemptAt || job?.dispatch?.dispatchRequestedAt || ''));
    const inProgressDeadlineMs = dispatchInProgressFreshMs(job, agent);
    return Number.isFinite(at) && now - at < inProgressDeadlineMs;
  }

  function workflowDispatchMaxAgeMs(env = {}) {
    const configured = Number(env?.WORKFLOW_DISPATCH_MAX_AGE_MS || env?.WORKFLOW_ACTIVE_DISPATCH_MAX_AGE_MS || 0);
    return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_WORKFLOW_DISPATCH_MAX_AGE_MS;
  }

  function completionSweepStaleMs(env = {}) {
    const configured = Number(env?.WORKFLOW_COMPLETION_SWEEP_STALE_MS || 0);
    return Number.isFinite(configured) && configured > 0 ? configured : COMPLETION_SWEEP_STALE_MS;
  }

  function completionQueueStaleMs(env = {}) {
    const configured = Number(env?.WORKFLOW_COMPLETION_QUEUE_STALE_MS || env?.WORKFLOW_DISPATCH_QUEUE_STALE_MS || 0);
    return Number.isFinite(configured) && configured > 0 ? configured : COMPLETION_QUEUE_STALE_MS;
  }

  function completionQueueRecoveryStaleMs(env = {}) {
    const configured = Number(env?.WORKFLOW_COMPLETION_QUEUE_RECOVERY_STALE_MS || 0);
    return Number.isFinite(configured) && configured > 0 ? configured : COMPLETION_QUEUE_RECOVERY_STALE_MS;
  }

  function workflowCompletionRecoveryMinAgeMs(env = {}, job = {}) {
    const base = completionQueueRecoveryStaleMs(env);
    if (!workflowLeaderControlTask(job)) return base;
    const configured = Number(env?.WORKFLOW_LEADER_CONTROL_RECOVERY_STALE_MS || env?.WORKFLOW_LEADER_CHECKPOINT_RECOVERY_STALE_MS || 0);
    if (Number.isFinite(configured) && configured > 0) return Math.max(base, configured);
    const providerBudget = workflowGenerationProviderTimeoutMs(env, job);
    return Math.max(base, Math.min(MAX_ENDPOINT_DISPATCH_WAIT_MS, providerBudget + 30000));
  }

  function jobWithinDispatchAge(job = {}, env = {}, now = Date.now()) {
    const activeAt = Math.max(
      Date.parse(String(job.dispatch?.completionSweepRequestedAt || '')) || 0,
      Date.parse(String(job.dispatch?.completionQueueRequestedAt || '')) || 0,
      Date.parse(String(job.dispatch?.firstDispatchRequestedAt || '')) || 0,
      Date.parse(String(job.dispatch?.dispatchRequestedAt || '')) || 0,
      Date.parse(String(job.dispatch?.lastAttemptAt || '')) || 0,
      Date.parse(String(job.startedAt || job.started_at || '')) || 0,
      Date.parse(String(job.createdAt || job.created_at || '')) || 0
    );
    return activeAt > 0 && now - activeAt <= workflowDispatchMaxAgeMs(env);
  }

  function canRetryJob(job) {
    if (!job) return false;
    if (!['failed', 'timed_out', 'dispatched', 'queued', 'blocked'].includes(job.status)) return false;
    if (job.dispatch?.retryable === false) return false;
    const attempts = Number(job.dispatch?.attempts || 0);
    return attempts < maxDispatchRetriesForJob(job);
  }

  function workflowSourceCollectionMaxRetries(env = {}) {
    const configured = Number(env?.WORKFLOW_SOURCE_COLLECTION_MAX_RETRIES || env?.WORKFLOW_RESEARCH_SOURCE_MAX_RETRIES || 0);
    return Number.isFinite(configured) && configured > 0 ? Math.min(50, Math.max(1, configured)) : 3;
  }

  function workflowLeaderControlTask(job = {}) {
    const phase = workflowSequencePhaseForJob(job);
    return Boolean(job?.workflowParentId)
      && isWorkflowLeaderTask(workflowTaskName(job))
      && ['checkpoint', 'final_summary'].includes(phase);
  }

  function workflowLeaderControlMaxRetries(env = {}, job = {}) {
    if (!workflowLeaderControlTask(job)) return maxDispatchRetriesForJob(job);
    const configured = Number(env?.WORKFLOW_LEADER_CONTROL_MAX_RETRIES || env?.WORKFLOW_LEADER_CHECKPOINT_MAX_RETRIES || 0);
    const fallback = 3;
    return Number.isFinite(configured) && configured > 0
      ? Math.min(10, Math.max(1, configured))
      : Math.max(maxDispatchRetriesForJob(job), fallback);
  }

  function workflowCompletionRetryLimitForJob(env = {}, job = {}) {
    if (workflowQualitySourceTask(job)) return Math.max(maxDispatchRetriesForJob(job), workflowSourceCollectionMaxRetries(env));
    if (workflowLeaderControlTask(job)) return workflowLeaderControlMaxRetries(env, job);
    return maxDispatchRetriesForJob(job);
  }

  function jobIsE2eScenario(job = {}) {
    const text = [
      job?.id,
      job?.workflowParentId,
      job?.parentAgentId,
      job?.input?.source,
      job?.input?._broker?.source,
      job?.input?._broker?.workflow?.source,
      job?.input?._broker?.workflow?.scenarioId,
      job?.prompt,
      job?.originalPrompt
    ].map((item) => String(item || '')).join(' ').toLowerCase();
    return /\be2e[_-]?order\b|playwright-e2e|e2e_order_scenario/.test(text);
  }

  function workflowProviderRunMaxAttempts(env = {}, job = {}) {
    const e2eConfigured = Number(env?.E2E_PROVIDER_RUN_MAX_ATTEMPTS || env?.E2E_WORKFLOW_PROVIDER_RUN_MAX_ATTEMPTS || 0);
    if (jobIsE2eScenario(job)) {
      return Number.isFinite(e2eConfigured) && e2eConfigured > 0
        ? Math.max(1, Math.min(3, e2eConfigured))
        : 1;
    }
    const configured = Number(env?.WORKFLOW_PROVIDER_RUN_MAX_ATTEMPTS || env?.PROVIDER_RUN_MAX_ATTEMPTS || 0);
    return Number.isFinite(configured) && configured > 0
      ? Math.max(1, Math.min(8, configured))
      : 3;
  }

  function providerRunAttempts(job = {}) {
    const dispatch = job?.dispatch && typeof job.dispatch === 'object' ? job.dispatch : {};
    return Math.max(
      Number(dispatch.providerRunAttempts || 0) || 0,
      Number(dispatch.providerQueueRequeueAttempts || 0) || 0,
      Number(dispatch.acceptedEndpointRecoveryAttempts || 0) || 0
    );
  }

  function providerRunLimitReached(env = {}, job = {}) {
    return providerRunAttempts(job) >= workflowProviderRunMaxAttempts(env, job);
  }

  function acceptedEndpointRecoveryMaxAttempts(env = {}, job = {}) {
    const e2eConfigured = Number(env?.E2E_ACCEPTED_ENDPOINT_RECOVERY_MAX_ATTEMPTS || env?.E2E_ACCEPTED_ENDPOINT_RECOVERY_LIMIT || 0);
    if (jobIsE2eScenario(job)) {
      return Number.isFinite(e2eConfigured) && e2eConfigured >= 0
        ? Math.max(0, Math.min(2, e2eConfigured))
        : 0;
    }
    const configured = Number(env?.ACCEPTED_ENDPOINT_RECOVERY_MAX_ATTEMPTS || env?.ACCEPTED_ENDPOINT_RECOVERY_LIMIT || 0);
    return Number.isFinite(configured) && configured >= 0
      ? Math.max(0, Math.min(3, configured))
      : 0;
  }

  function acceptedEndpointRecoveryAttempts(job = {}) {
    const dispatch = job?.dispatch && typeof job.dispatch === 'object' ? job.dispatch : {};
    return Math.max(
      Number(dispatch.acceptedEndpointRecoveryAttempts || 0) || 0,
      Number(dispatch.providerQueueRequeueAttempts || 0) || 0
    );
  }

  function acceptedEndpointRecoveryLimitReached(env = {}, job = {}) {
    return acceptedEndpointRecoveryAttempts(job) >= acceptedEndpointRecoveryMaxAttempts(env, job);
  }

  function workflowChildShouldRestartFromBeginning(job = {}) {
    return Boolean(job?.workflowParentId || job?.jobKind === 'workflow_child');
  }

  function workflowChildRetryableFailureCategories() {
    return new Set([
      'missing_required_sources',
      'missing_required_deliverable',
      'dispatch_timeout',
      'dispatch_provider_timeout',
      'dispatch_deadline_timeout',
      'dispatch_http_timeout',
      'dispatch_http_gateway_timeout',
      'dispatch_network_timeout',
      'dispatch_queue_timeout',
      'dispatch_http_5xx',
      'dispatch_error',
      'dispatch_malformed_response',
      'leader_quality_gate_failed'
    ]);
  }

  function workflowChildDispatchFailureRequiresRestart(env = {}, job = {}, failureMeta = {}) {
    if (!workflowChildShouldRestartFromBeginning(job)) return false;
    if (providerRunLimitReached(env, job)) return true;
    const category = String(failureMeta.category || '').trim().toLowerCase();
    if (!failureMeta.retryable || !workflowChildRetryableFailureCategories().has(category)) return true;
    const maxAttempts = Number(failureMeta.maxRetries || workflowCompletionRetryLimitForJob(env, job) || workflowProviderRunMaxAttempts(env, job));
    const attempts = Number(failureMeta.attempts || providerRunAttempts(job) || job?.dispatch?.attempts || 0);
    return attempts >= Math.max(1, maxAttempts);
  }

  function workflowRestartRequiredReason(job = {}, cause = '') {
    const task = workflowTaskName(job) || job?.taskType || 'workflow child';
    const detail = String(cause || job?.failureReason || '').trim();
    return `${task} failed in a way that should not be retried in-place. Retry the order from the beginning.${detail ? ` Cause: ${detail}` : ''}`;
  }

  function shouldAutoRetryWorkflowChild(parent = null, job = {}) {
    // Workflow child retries reuse partial state and can multiply external provider
    // calls when persistence or queue delivery is unstable. A failed workflow child
    // should fail the workflow; user-initiated retry creates a fresh order.
    return false;
  }

  function shouldAutoRetryTimedOutWorkflowChild(parent = null, job = {}) {
    return shouldAutoRetryWorkflowChild(parent, job);
  }

  return {
    COMPLETION_QUEUE_RECOVERY_STALE_MS,
    COMPLETION_QUEUE_STALE_MS,
    COMPLETION_SWEEP_STALE_MS,
    DEFAULT_WORKFLOW_DISPATCH_MAX_AGE_MS,
    DISPATCH_IN_PROGRESS_STALE_MS,
    DISPATCH_SCHEDULE_STALE_MS,
    DISPATCH_SCHEDULE_TIMEOUT_MS,
    WORKFLOW_PROGRESS_DISPATCH_MAX_TARGETS,
    acceptedEndpointRecoveryAttempts,
    acceptedEndpointRecoveryLimitReached,
    acceptedEndpointRecoveryMaxAttempts,
    canRetryJob,
    canTransitionJob,
    completionQueueRecoveryStaleMs,
    completionQueueStaleMs,
    completionSweepStaleMs,
    computeNextRetryAt,
    dispatchExecutionIsFresh,
    dispatchInProgressFreshMs,
    dispatchScheduleIsFresh,
    dispatchScheduleIsFreshForAgent,
    endpointDispatchTimeoutMs,
    isBlockedAgentResultStatus,
    isTerminalJobStatus,
    jobIsE2eScenario,
    jobWithinDispatchAge,
    maxDispatchRetriesForJob,
    normalizeJobStatus,
    providerRunAttempts,
    providerRunLimitReached,
    shouldAutoRetryTimedOutWorkflowChild,
    shouldAutoRetryWorkflowChild,
    transitionErrorCode,
    workflowChildDispatchFailureRequiresRestart,
    workflowChildRetryableFailureCategories,
    workflowChildShouldRestartFromBeginning,
    workflowCompletionRecoveryMinAgeMs,
    workflowCompletionRetryLimitForJob,
    workflowDispatchMaxAgeMs,
    workflowGenerationProviderTimeoutMs,
    workflowLeaderControlMaxRetries,
    workflowLeaderControlTask,
    workflowProviderRunMaxAttempts,
    workflowRestartRequiredReason,
    workflowSourceCollectionMaxRetries
  };
}
