export function createWorkflowParentBlockingHelpers(dependencies = {}) {
  const {
    buildAgentTeamDeliveryOutput,
    syncJobAuthorityRequest,
    sortWorkflowChildren,
    workflowAgentRunChildren,
    workflowBlockedParentStatus,
    workflowChildIsBlockingProgress,
    workflowChildIsInternalLeaderSequenceRun,
    workflowChildSnapshot,
    workflowStatusCounts,
    workflowVisibleAgentRunChildren
  } = dependencies;

  function markWorkflowParentBlockedIfNeeded(state = {}, childJob = {}) {
    const parentId = String(childJob?.workflowParentId || '').trim();
    if (!parentId) return false;
    const parent = Array.isArray(state.jobs)
      ? state.jobs.find((item) => item.id === parentId && item.jobKind === 'workflow')
      : null;
    if (!parent) return false;
    const children = sortWorkflowChildren(parent, state.jobs.filter((item) => item.workflowParentId === parentId));
    const blockingChildren = children.filter(workflowChildIsBlockingProgress);
    const blockedStatus = workflowBlockedParentStatus(parent, children, blockingChildren);
    if (blockedStatus !== 'blocked') return false;
    const agentChildren = workflowAgentRunChildren(children);
    const visibleAgentChildren = workflowVisibleAgentRunChildren(children);
    const internalChildren = children.filter((child) => workflowChildIsInternalLeaderSequenceRun(child));
    parent.workflow = {
      ...(parent.workflow || {}),
      childJobIds: children.map((item) => item.id),
      childRuns: workflowChildSnapshot(children),
      plannedAgentRunCount: visibleAgentChildren.length,
      plannedCandidateAgentRunCount: agentChildren.length,
      adaptiveCandidateRunCount: agentChildren.length - visibleAgentChildren.length,
      internalCheckpointRunCount: internalChildren.length,
      agentStatusCounts: workflowStatusCounts(visibleAgentChildren),
      internalStatusCounts: workflowStatusCounts(internalChildren),
      statusCounts: workflowStatusCounts(children, Array.isArray(parent.workflow?.childRuns) ? parent.workflow.childRuns.length : children.length)
    };
    parent.status = blockedStatus;
    parent.completedAt = null;
    parent.failedAt = null;
    parent.failureReason = blockingChildren[0]?.failureReason
      || blockingChildren[0]?.output?.summary
      || 'Workflow is blocked by a required specialist run.';
    parent.failureCategory = 'blocked_waiting_for_approval';
    parent.dispatch = {
      ...(parent.dispatch || {}),
      completionStatus: 'blocked_waiting_for_approval',
      retryable: false,
      nextRetryAt: null,
      completedAt: null
    };
    parent.output = buildAgentTeamDeliveryOutput(parent, children);
    syncJobAuthorityRequest(parent);
    return true;
  }

  return {
    markWorkflowParentBlockedIfNeeded
  };
}
