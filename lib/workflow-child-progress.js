export function createWorkflowChildProgressHelpers(dependencies = {}) {
  const {
    authorityRequestFromReport,
    authorityRequestHandledBySaasHandoff,
    authorityRequestRequiresApproval,
    authorityStringList,
    isWorkflowLeaderTask,
    workflowBrokerWorkflowForJob,
    workflowChildIsSaasHandoffOnly,
    workflowDispatchLayer,
    workflowSequencePhaseForJob,
    workflowTaskName
  } = dependencies;

  function workflowChildPlanIndex(parent = {}, child = {}) {
    const task = workflowTaskName(child);
    const sequencePhase = workflowSequencePhaseForJob(child);
    const plannedTasks = Array.isArray(parent.workflow?.plannedTasks)
      ? parent.workflow.plannedTasks.map((item) => String(item || '').trim().toLowerCase())
      : [];
    const taskIndex = plannedTasks.indexOf(task);
    if (taskIndex >= 0) return taskIndex;
    const plannedRuns = Array.isArray(parent.workflow?.childRuns) ? parent.workflow.childRuns : [];
    const runIndex = plannedRuns.findIndex((run) => {
      const runTask = String(run?.taskType || run?.task_type || '').trim().toLowerCase();
      const runAgentId = String(run?.agentId || run?.agent_id || '').trim();
      const runPhase = String(run?.sequencePhase || run?.sequence_phase || '').trim().toLowerCase();
      return runTask === task
        && (!runAgentId || runAgentId === child.assignedAgentId)
        && (!runPhase || runPhase === sequencePhase);
    });
    return runIndex >= 0 ? runIndex : Number.MAX_SAFE_INTEGER;
  }
  
  function workflowChildSortKey(parent = {}, child = {}) {
    const task = workflowTaskName(child);
    const phase = workflowSequencePhaseForJob(child);
    const planIndex = workflowChildPlanIndex(parent, child);
    if (isWorkflowLeaderTask(task)) {
      if (phase === 'checkpoint') {
        const beforeLayer = Number(child?.input?._broker?.workflow?.requiredBeforeLayer || 2) || 2;
        return (Math.max(2, beforeLayer) * 10_000) - 100 + planIndex;
      }
      if (phase === 'final_summary') return 90_000 + planIndex;
      return planIndex;
    }
    const layer = workflowDispatchLayer(parent, child);
    return (Math.max(1, layer) * 10_000) + planIndex;
  }
  
  function sortWorkflowChildren(parent = {}, children = []) {
    return [...children].sort((a, b) => {
      const leftIndex = workflowChildSortKey(parent, a);
      const rightIndex = workflowChildSortKey(parent, b);
      if (leftIndex !== rightIndex) return leftIndex - rightIndex;
      const created = String(a.createdAt || '').localeCompare(String(b.createdAt || ''));
      if (created) return created;
      return String(a.id || '').localeCompare(String(b.id || ''));
    });
  }
  
  function workflowChildIsTerminal(child = {}) {
    return ['completed', 'failed', 'timed_out', 'blocked'].includes(String(child.status || '').toLowerCase());
  }
  
  function workflowChildIsAdaptivePending(child = {}) {
    const status = String(child?.status || '').trim().toLowerCase();
    if (['completed', 'failed', 'timed_out'].includes(status)) return false;
    const workflow = workflowBrokerWorkflowForJob(child) || {};
    const completionStatus = String(child?.dispatch?.completionStatus || child?.dispatch_completion_status || '').trim().toLowerCase();
    return Boolean(
      workflow.adaptivePending === true
      || child?.adaptivePending === true
      || child?.adaptive_pending === true
      || completionStatus === 'leader_adaptive_pending'
    );
  }
  
  function workflowChildIsSequentialUserActionDeferred(child = {}) {
    const completionStatus = String(child?.dispatch?.completionStatus || child?.dispatch_completion_status || '').trim().toLowerCase();
    const workflow = workflowBrokerWorkflowForJob(child) || {};
    return completionStatus === 'leader_user_action_deferred' || workflow.sequentialUserActionDeferred === true;
  }
  
  function workflowChildIsLeaderReplanDeferred(child = {}) {
    const completionStatus = String(child?.dispatch?.completionStatus || child?.dispatch_completion_status || '').trim().toLowerCase();
    const workflow = workflowBrokerWorkflowForJob(child) || {};
    return completionStatus === 'leader_replan_deferred' || workflow.leaderReplanDeferred === true;
  }
  
  function workflowChildAdaptiveLayer(child = {}) {
    const workflow = workflowBrokerWorkflowForJob(child) || {};
    const layer = Number(workflow.adaptivePendingLayer || workflow.dispatchLayer || child?.adaptiveLayer || child?.adaptive_layer || 0) || 0;
    return layer > 0 ? layer : null;
  }
  
  function workflowChildIsBlockingProgress(child = {}) {
    const status = String(child?.status || '').trim().toLowerCase();
    if (status !== 'blocked') return false;
    if (workflowChildIsAdaptivePending(child)) return false;
    if (workflowChildIsSaasHandoffOnly(child)) return false;
    if (isWorkflowLeaderTask(workflowTaskName(child))) return false;
    return true;
  }
  
  function workflowChildIsApprovalBlockedTerminal(child = {}) {
    const status = String(child?.status || '').trim().toLowerCase();
    if (status !== 'blocked') return false;
    if (isWorkflowLeaderTask(workflowTaskName(child))) return workflowLeaderChildIsApprovalBlockedTerminal(child);
    const authorityRequest = authorityRequestFromReport(child.output?.report);
    const authoritySource = String(authorityRequest?.source || '').trim().toLowerCase();
    if (authoritySource === 'search_connector_required') return false;
    const missingConnectors = authorityStringList(
      authorityRequest?.missing_connectors || authorityRequest?.missingConnectors || authorityRequest?.connectors,
      8,
      60
    );
    const missingCapabilities = authorityStringList(
      authorityRequest?.missing_connector_capabilities || authorityRequest?.missingConnectorCapabilities || authorityRequest?.capabilities,
      12,
      80
    );
    if (
      missingConnectors.length
      && missingConnectors.every((item) => ['search', 'web_search', 'brave', 'ga4', 'google_analytics', 'search_console', 'gsc', 'analytics'].includes(String(item || '').trim().toLowerCase()))
      && !missingCapabilities.length
    ) {
      return false;
    }
    const phase = workflowSequencePhaseForJob(child);
    const task = workflowTaskName(child);
    const actionTask = ['x_post', 'instagram', 'reddit', 'indie_hackers', 'directory_submission', 'acquisition_automation', 'email_ops', 'cold_email'].includes(task);
    const approvalBlocked = child.failureCategory === 'blocked_waiting_for_approval'
      || child.dispatch?.completionStatus === 'blocked_waiting_for_approval'
      || authorityRequestRequiresApproval(authorityRequest);
    return Boolean(approvalBlocked && (phase === 'action' || actionTask));
  }
  
  function authorityRequestRequiresSequentialUserAction(request = null) {
    if (!request || typeof request !== 'object') return false;
    const source = String(request.source || request.reason_code || request.reasonCode || '').trim().toLowerCase();
    if (source === 'search_connector_required') return false;
    const missingConnectors = authorityStringList(
      request.missing_connectors || request.missingConnectors || request.required_connectors || request.requiredConnectors || request.connectors,
      8,
      60
    ).map((item) => String(item || '').trim().toLowerCase());
    const missingCapabilities = authorityStringList(
      request.missing_connector_capabilities || request.missingConnectorCapabilities || request.required_connector_capabilities || request.requiredConnectorCapabilities || request.capabilities,
      12,
      80
    );
    const requiredGoogleSources = authorityStringList(
      request.required_google_sources || request.requiredGoogleSources || request.google_source_types || request.googleSourceTypes,
      8,
      60
    );
    const humanConnectors = missingConnectors.filter((item) => !['search', 'web_search', 'brave'].includes(item));
    return Boolean(
      humanConnectors.length
      || missingCapabilities.length
      || requiredGoogleSources.length
      || authorityRequestRequiresApproval(request)
    );
  }
  
  function workflowChildRequiresSequentialUserAction(parent = {}, child = {}) {
    if (!child || typeof child !== 'object') return false;
    const task = workflowTaskName(child);
    const phase = workflowSequencePhaseForJob(child);
    if (isWorkflowLeaderTask(task)) return ['checkpoint', 'final_summary'].includes(phase);
    if (authorityRequestRequiresSequentialUserAction(authorityRequestFromReport(child.output?.report))) return true;
    const broker = child?.input?._broker && typeof child.input._broker === 'object' ? child.input._broker : {};
    const workflow = broker.workflow && typeof broker.workflow === 'object' ? broker.workflow : {};
    if (workflow.actionHandoffOnly === true || String(workflow.externalActionMode || '').trim().toLowerCase() === 'saas_handoff_only') return false;
    return false;
  }
  
  function workflowHasActiveSequentialUserActionWait(parent = {}, children = [], options = {}) {
    const targetLayer = Math.max(0, Number(options.targetLayer || 0) || 0);
    return (Array.isArray(children) ? children : []).some((child) => {
      if (workflowChildIsAdaptivePending(child)) return false;
      if (targetLayer > 0 && workflowDispatchLayer(parent, child) !== targetLayer) return false;
      if (!workflowChildRequiresSequentialUserAction(parent, child)) return false;
      const status = String(child?.status || '').trim().toLowerCase();
      const completionStatus = String(child?.dispatch?.completionStatus || child?.dispatch_completion_status || '').trim().toLowerCase();
      return ['blocked', 'action_required', 'needs_action', 'approval_required', 'connector_required'].includes(status)
        || ['blocked_waiting_for_approval', 'approval_waiting_retry_paused'].includes(completionStatus);
    });
  }
  
  function workflowLeaderChildIsApprovalBlockedTerminal(child = {}) {
    const status = String(child?.status || '').trim().toLowerCase();
    if (status !== 'blocked') return false;
    if (!isWorkflowLeaderTask(workflowTaskName(child))) return false;
    const phase = workflowSequencePhaseForJob(child);
    if (!['checkpoint', 'final_summary'].includes(phase)) return false;
    const authorityRequest = authorityRequestFromReport(child.output?.report);
    if (authorityRequestHandledBySaasHandoff(child, authorityRequest)) return false;
    return Boolean(
      child.failureCategory === 'blocked_waiting_for_approval'
      || child.dispatch?.completionStatus === 'blocked_waiting_for_approval'
      || authorityRequestRequiresApproval(authorityRequest)
    );
  }
  
  function workflowChildIsTerminalForProgress(child = {}) {
    if (workflowChildIsAdaptivePending(child)) return false;
    if (workflowChildIsApprovalBlockedTerminal(child)) return true;
    if (workflowChildIsBlockingProgress(child)) return false;
    return workflowChildIsTerminal(child);
  }

  return {
    workflowChildPlanIndex,
    workflowChildSortKey,
    sortWorkflowChildren,
    workflowChildIsTerminal,
    workflowChildIsAdaptivePending,
    workflowChildIsSequentialUserActionDeferred,
    workflowChildIsLeaderReplanDeferred,
    workflowChildAdaptiveLayer,
    workflowChildIsBlockingProgress,
    workflowChildIsApprovalBlockedTerminal,
    authorityRequestRequiresSequentialUserAction,
    workflowChildRequiresSequentialUserAction,
    workflowHasActiveSequentialUserActionWait,
    workflowLeaderChildIsApprovalBlockedTerminal,
    workflowChildIsTerminalForProgress
  };
}
