export function createWorkflowTimeouts(deps = {}) {
  const {
    WORKFLOW_ACTION_CHILD_TIMEOUT_FLOOR_MS,
    WORKFLOW_CHILD_TIMEOUT_FLOOR_MS,
    WORKFLOW_PARENT_TIMEOUT_FLOOR_MS,
    DISPATCH_SCHEDULE_STALE_MS,
    DISPATCH_SCHEDULE_TIMEOUT_MS,
    computeNextRetryAt,
    leaderTaskLayer,
    leaderTaskPhase,
    nowIso,
    providerRunAttempts,
    reconcileWorkflowParent,
    touchEvent,
    workflowChildDispatchFailureRequiresRestart,
    workflowChildShouldRestartFromBeginning,
    workflowCompletionRetryLimitForJob,
    workflowPrimaryTaskForJob,
    workflowProviderRunMaxAttempts,
    workflowRestartRequiredReason
  } = deps;

  function timeoutFloorMsForJob(job = {}, agent = null) {
    const estimateMs = Number(job?.estimateWindow?.durationMaxSec || 0) > 0
      ? Number(job.estimateWindow.durationMaxSec) * 1000
      : 0;
    if (job?.jobKind === 'workflow') {
      return Math.max(WORKFLOW_PARENT_TIMEOUT_FLOOR_MS, estimateMs);
    }
    if (job?.jobKind === 'workflow_child' || job?.workflowParentId) {
      const task = String(job?.workflowTask || job?.taskType || '').trim().toLowerCase();
      const primaryTask = workflowPrimaryTaskForJob(job);
      const sequencePhase = String(job?.input?._broker?.workflow?.sequencePhase || leaderTaskPhase(primaryTask, task) || '').trim().toLowerCase();
      const floorMs = (
        deps.isWorkflowLeaderTask?.(task)
        || ['data', 'research', 'analysis', 'planning', 'preparation', 'action'].includes(sequencePhase)
        || Number(leaderTaskLayer(primaryTask, task) || 0) >= 1
      )
        ? WORKFLOW_ACTION_CHILD_TIMEOUT_FLOOR_MS
        : WORKFLOW_CHILD_TIMEOUT_FLOOR_MS;
      return Math.max(floorMs, estimateMs);
    }
    return estimateMs > 0 ? estimateMs : null;
  }

  function effectiveTimeoutDeadlineMs(job = {}, agent = null) {
    const explicitMs = Number(job?.deadlineSec || 0) > 0 ? Number(job.deadlineSec) * 1000 : null;
    const floorMs = timeoutFloorMsForJob(job, agent);
    const workflowScoped = job?.jobKind === 'workflow' || job?.jobKind === 'workflow_child' || Boolean(job?.workflowParentId);
    const scheduledDispatch = String(job?.dispatch?.completionStatus || '').trim().toLowerCase() === 'dispatch_scheduled';
    if (scheduledDispatch) {
      if (job?.jobKind === 'workflow_child' || job?.workflowParentId) {
        return Math.max(...[explicitMs, floorMs, DISPATCH_SCHEDULE_STALE_MS].filter((value) => value != null));
      }
      const baseMs = explicitMs == null && floorMs == null ? DISPATCH_SCHEDULE_TIMEOUT_MS : Math.min(...[explicitMs, floorMs, DISPATCH_SCHEDULE_TIMEOUT_MS].filter((value) => value != null));
      return Math.max(DISPATCH_SCHEDULE_STALE_MS, baseMs);
    }
    if (explicitMs != null && !workflowScoped) return explicitMs;
    if (explicitMs == null) return floorMs;
    if (floorMs == null) return explicitMs;
    return Math.max(explicitMs, floorMs);
  }

  function workflowChildIsQueuedForFutureTurn(job = {}) {
    if (!(job?.jobKind === 'workflow_child' || job?.workflowParentId)) return false;
    if (String(job?.status || '').trim().toLowerCase() !== 'queued') return false;
    return !job?.dispatch?.dispatchRequestedAt && !job?.dispatch?.scheduledAt && !job?.startedAt && !job?.dispatchedAt && !job?.claimedAt;
  }

  function workflowParentHasLiveChildren(state = {}, job = {}) {
    if (job?.jobKind !== 'workflow') return false;
    return (Array.isArray(state.jobs) ? state.jobs : []).some((child) => (
      child?.workflowParentId === job.id
      && !['completed', 'failed', 'timed_out', 'blocked'].includes(String(child.status || '').trim().toLowerCase())
    ));
  }

  async function sweepTimedOutJobs(storage, options = {}) {
    const nowMs = Number.isFinite(Number(options.nowMs)) ? Number(options.nowMs) : Date.now();
    const staleMs = options.staleMs != null && Number.isFinite(Number(options.staleMs)) ? Math.max(0, Number(options.staleMs)) : null;
    const eventSource = String(options.eventSource || '').trim() || 'timeout_sweep';
    const result = await storage.mutate(async (state) => {
      const swept = [];
      for (const job of state.jobs) {
        if (!['queued', 'claimed', 'running', 'dispatched'].includes(job.status)) continue;
        const completionStatus = String(job?.dispatch?.completionStatus || '').trim().toLowerCase();
        if (completionStatus === 'completion_queued') continue;
        if (workflowParentHasLiveChildren(state, job)) continue;
        const agent = job.assignedAgentId ? state.agents.find((item) => item.id === job.assignedAgentId) || null : null;
        const deadlineMs = effectiveTimeoutDeadlineMs(job, agent);
        const basisMs = Date.parse(job.lastCallbackAt || job.dispatch?.dispatchRequestedAt || job.dispatch?.scheduledAt || job.dispatchedAt || job.startedAt || job.claimedAt || job.createdAt || '') || nowMs;
        const ageMs = Math.max(0, nowMs - basisMs);
        const attempts = Number(job.dispatch?.attempts || 0);
        const nextAttempt = attempts + 1;
        const skipQueuedWorkflowDeadline = staleMs == null && workflowChildIsQueuedForFutureTurn(job);
        const expiredByDeadline = !skipQueuedWorkflowDeadline && deadlineMs != null && ageMs >= deadlineMs;
        const expiredByManualWindow = staleMs != null && ageMs >= staleMs;
        if (!expiredByDeadline && !expiredByManualWindow) continue;
        const timeoutCategory = expiredByManualWindow ? 'dispatch_queue_timeout' : 'dispatch_deadline_timeout';
        const workflowChild = workflowChildShouldRestartFromBeginning(job);
        const timeoutAttempts = workflowChild ? (providerRunAttempts(job) || nextAttempt) : attempts;
        const retryMeta = {
          category: timeoutCategory,
          retryable: true,
          attempts: timeoutAttempts,
          maxRetries: workflowCompletionRetryLimitForJob(options.env || {}, job),
          nextRetryAt: null
        };
        const restartRequired = workflowChildDispatchFailureRequiresRestart(options.env || {}, job, retryMeta);
        const timedOutAt = nowIso();
        job.status = restartRequired ? 'failed' : 'timed_out';
        job.timedOutAt = timedOutAt;
        if (restartRequired) job.failedAt = timedOutAt;
        job.failureReason = restartRequired
          ? workflowRestartRequiredReason(job, 'Run exceeded timeout window')
          : 'Run exceeded timeout window';
        job.failureCategory = restartRequired ? 'workflow_restart_required' : timeoutCategory;
        job.logs = [...(job.logs || []), `worker timeout sweep marked run as ${job.status} source=${eventSource}${restartRequired ? '; full order retry required' : ''}`];
        const maxRetries = retryMeta.maxRetries;
        const retryable = restartRequired ? false : (workflowChild ? retryMeta.attempts < maxRetries : nextAttempt <= maxRetries);
        job.dispatch = {
          ...(job.dispatch || {}),
          attempts: timeoutAttempts,
          retryable,
          nextRetryAt: retryable ? computeNextRetryAt(workflowChild ? retryMeta.attempts : nextAttempt, nowMs) : null,
          completionStatus: restartRequired ? 'workflow_restart_required' : 'timed_out',
          maxRetries,
          restartRequired
        };
        swept.push({
          id: job.id,
          status: job.status,
          retryable: job.dispatch.retryable,
          nextRetryAt: job.dispatch.nextRetryAt,
          attempts: timeoutAttempts,
          maxRetries: job.dispatch.maxRetries,
          workflowParentId: job.workflowParentId || null,
          restartRequired,
          deadlineMs,
          ageMs
        });
      }
      return { swept };
    });

    for (const job of result.swept) {
      if (job.workflowParentId) await reconcileWorkflowParent(storage, job.workflowParentId);
      const retryMessage = job.restartRequired
        ? `run/${job.id.slice(0, 6)} timed out; full order retry required`
        : job.retryable
        ? `run/${job.id.slice(0, 6)} timed out; retry ${job.attempts + 1}/${job.maxRetries} available`
        : `run/${job.id.slice(0, 6)} timed out; retries exhausted at ${job.attempts}/${job.maxRetries}`;
      await touchEvent(storage, 'TIMEOUT', retryMessage, {
        kind: 'run_timeout',
        jobId: job.id,
        retryable: job.retryable,
        restartRequired: job.restartRequired || false,
        attempts: job.attempts,
        maxRetries: job.maxRetries,
        nextRetryAt: job.nextRetryAt,
        deadlineMs: job.deadlineMs,
        ageMs: job.ageMs,
        source: eventSource
      });
    }
    return result;
  }

  return {
    effectiveTimeoutDeadlineMs,
    sweepTimedOutJobs,
    timeoutFloorMsForJob
  };
}
