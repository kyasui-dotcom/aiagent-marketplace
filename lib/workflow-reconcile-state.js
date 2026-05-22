export function createWorkflowReconcileState(deps = {}) {
  const {
    cloneJob,
    isWorkflowLeaderTask,
    maxDispatchRetriesForJob,
    nowIso,
    providerRunAttempts,
    syncJobAuthorityRequest,
    workflowChildAdaptiveLayer,
    workflowChildIsAdaptivePending,
    workflowSequencePhaseForJob,
    workflowTaskName
  } = deps;

  function workflowChildSnapshot(children = []) {
    return children.map((job) => ({
      id: job.id,
      taskType: job.workflowTask || job.taskType,
      dispatchTaskType: job.taskType || null,
      agentId: job.assignedAgentId || null,
      agentName: job.workflowAgentName || null,
      sequencePhase: workflowSequencePhaseForJob(job) || null,
      status: job.status,
      createdAt: job.createdAt,
      startedAt: job.startedAt || null,
      dispatchedAt: job.dispatchedAt || null,
      completedAt: job.completedAt || null,
      failedAt: job.failedAt || null,
      lastCallbackAt: job.lastCallbackAt || null,
      failureReason: job.failureReason || null,
      dispatchCompletionStatus: job.dispatch?.completionStatus || null,
      dispatchRequestedAt: job.dispatch?.dispatchRequestedAt || null,
      dispatchInProgressAt: job.dispatch?.dispatchInProgressAt || null,
      dispatchTimeoutMs: Number(job.dispatch?.dispatchTimeoutMs || 0) || null,
      providerQueueAcceptedAt: job.dispatch?.providerQueueAcceptedAt || null,
      qualityGate: job.qualityGate || null,
      adaptivePending: workflowChildIsAdaptivePending(job),
      adaptiveLayer: workflowChildAdaptiveLayer(job) || null,
      latestLog: Array.isArray(job.logs) ? String(job.logs.slice(-1)[0] || '').trim() : ''
    }));
  }

  function workflowChildIsInternalLeaderSequenceRun(child = {}) {
    const phase = String(child?.sequencePhase || workflowSequencePhaseForJob(child) || child?.sequence_phase || '').trim().toLowerCase();
    const task = String(child?.workflowTask || child?.taskType || child?.task_type || '').trim().toLowerCase();
    return ['checkpoint', 'final_summary'].includes(phase) && isWorkflowLeaderTask(task);
  }

  function workflowAgentRunChildren(children = []) {
    return (Array.isArray(children) ? children : []).filter((child) => !workflowChildIsInternalLeaderSequenceRun(child));
  }

  function workflowVisibleAgentRunChildren(children = []) {
    return workflowAgentRunChildren(children).filter((child) => !workflowChildIsAdaptivePending(child));
  }

  function workflowStatusCounts(children = [], planned = null) {
    const list = Array.isArray(children) ? children : [];
    const plannedCount = planned == null ? list.length : Number(planned || 0);
    return {
      total: list.length,
      planned: Math.max(list.length, Number.isFinite(plannedCount) ? plannedCount : list.length),
      completed: list.filter((item) => item.status === 'completed').length,
      failed: list.filter((item) => ['failed', 'timed_out'].includes(String(item.status || '').toLowerCase())).length,
      blocked: list.filter((item) => item.status === 'blocked').length,
      queued: list.filter((item) => item.status === 'queued').length,
      running: list.filter((item) => ['claimed', 'running', 'dispatched'].includes(String(item.status || '').trim().toLowerCase())).length
    };
  }

  function workflowChildRetryPending(job = {}) {
    const status = String(job?.status || '').trim().toLowerCase();
    if (!['failed', 'timed_out'].includes(status)) return false;
    if (job?.dispatch?.retryable !== true || job?.dispatch?.restartRequired === true) return false;
    const attempts = Math.max(providerRunAttempts(job), Number(job?.dispatch?.attempts || 0) || 0);
    const maxRetries = Math.max(1, Number(job?.dispatch?.maxRetries || maxDispatchRetriesForJob(job)) || maxDispatchRetriesForJob(job));
    return attempts < maxRetries;
  }

  function workflowNextRetryAtForChildren(children = []) {
    return (Array.isArray(children) ? children : [])
      .map((child) => String(child?.dispatch?.nextRetryAt || '').trim())
      .filter(Boolean)
      .sort()[0] || null;
  }

  function markWorkflowParentWaitingForChildRetry(parent = {}, children = [], options = {}) {
    const retryPendingChildren = (Array.isArray(children) ? children : []).filter(workflowChildRetryPending);
    const retryChild = options.child || retryPendingChildren[0] || null;
    const nextRetryAt = workflowNextRetryAtForChildren(retryPendingChildren);
    parent.status = 'running';
    parent.completedAt = null;
    parent.failedAt = null;
    parent.failureCategory = null;
    parent.failureReason = null;
    parent.workflow = {
      ...(parent.workflow || {}),
      childRuns: workflowChildSnapshot(children),
      statusCounts: workflowStatusCounts(children, parent.workflow?.plannedChildRunCount),
      leaderSequence: {
        ...((parent.workflow && typeof parent.workflow.leaderSequence === 'object') ? parent.workflow.leaderSequence : {}),
        status: options.sequenceStatus || 'retry_pending',
        retryPendingAt: nowIso(),
        retryPendingChildJobId: retryChild?.id || null,
        retryPendingReason: retryChild?.failureReason || null,
        nextRetryAt
      }
    };
    parent.dispatch = {
      ...(parent.dispatch || {}),
      completionStatus: options.completionStatus || 'workflow_child_retry_pending',
      retryable: true,
      nextRetryAt,
      restartRequired: false
    };
    syncJobAuthorityRequest(parent);
    return cloneJob(parent);
  }

  return {
    markWorkflowParentWaitingForChildRetry,
    workflowAgentRunChildren,
    workflowChildIsInternalLeaderSequenceRun,
    workflowChildRetryPending,
    workflowChildSnapshot,
    workflowNextRetryAtForChildren,
    workflowStatusCounts,
    workflowVisibleAgentRunChildren
  };
}
