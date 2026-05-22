export function createWorkflowAdaptiveActivation(deps = {}) {
  const {
    applyWorkflowHandoffPromptContextToJob,
    authorityStringList,
    completedWorkflowLeader,
    leaderSequentialUserActionPriorityFromDefinition,
    markWorkflowChildAsSaasHandoffOnly,
    maxDispatchRetriesForJob,
    nowIso,
    sortWorkflowChildren,
    taskRequiresConnectorApproval,
    workflowChildIsActionPhase,
    workflowChildIsAdaptivePending,
    workflowChildRequiresSequentialUserAction,
    workflowDispatchLayer,
    workflowHasActiveSequentialUserActionWait,
    workflowHumanActionIntentText,
    workflowLeaderHandoff,
    workflowLeaderReplanDecisionForLayer,
    workflowPrimaryTask,
    workflowTaskName
  } = deps;

  function workflowSequentialUserActionPriority(parent = {}, child = {}, replan = null) {
    const primary = workflowPrimaryTask(parent);
    const task = workflowTaskName(child);
    const sourceText = workflowHumanActionIntentText(parent.prompt || parent.input?.prompt || '');
    const selectedTasks = replan?.selectedTaskSet instanceof Set ? replan.selectedTaskSet : (replan?.selectedTasks || []);
    return leaderSequentialUserActionPriorityFromDefinition(primary, { task, sourceText, selectedTasks });
  }

  function workflowSequentialUserActionReleaseChildId(parent = {}, children = [], targetLayer = 1, replan = null) {
    const candidates = sortWorkflowChildren(parent, Array.isArray(children) ? children : [])
      .filter((child) => workflowChildIsAdaptivePending(child) || String(child?.status || '').trim().toLowerCase() === 'queued')
      .filter((child) => workflowDispatchLayer(parent, child) === targetLayer)
      .filter((child) => workflowChildRequiresSequentialUserAction(parent, child));
    if (!candidates.length) return '';
    const plannedTasks = Array.isArray(parent.workflow?.plannedTasks)
      ? parent.workflow.plannedTasks.map((task) => String(task || '').trim().toLowerCase())
      : [];
    const scored = candidates
      .map((child, index) => {
        const task = workflowTaskName(child);
        const plannedIndex = plannedTasks.indexOf(task);
        const score = workflowSequentialUserActionPriority(parent, child, replan);
        return {
          child,
          score,
          plannedIndex: plannedIndex >= 0 ? plannedIndex : Number.MAX_SAFE_INTEGER,
          index
        };
      })
      .sort((left, right) => (
        right.score - left.score
        || left.plannedIndex - right.plannedIndex
        || left.index - right.index
      ));
    return scored[0]?.child?.id || candidates[0]?.id || '';
  }

  function recordWorkflowAdaptiveActivation(parent = {}, targetLayer = 0, activatedIds = [], options = {}) {
    const deferredIds = Array.isArray(options.deferredIds) ? options.deferredIds.filter(Boolean) : [];
    if (!activatedIds.length && !deferredIds.length) return;
    const at = options.at || nowIso();
    const priorPlan = parent.workflow?.adaptivePlan && typeof parent.workflow.adaptivePlan === 'object'
      ? parent.workflow.adaptivePlan
      : {};
    const priorActivations = Array.isArray(priorPlan.activations) ? priorPlan.activations : [];
    const pendingIds = Array.isArray(priorPlan.pendingChildJobIds)
      ? priorPlan.pendingChildJobIds.filter((id) => ![...activatedIds, ...deferredIds].includes(String(id || '').trim()))
      : [];
    parent.workflow = {
      ...(parent.workflow || {}),
      adaptivePlan: {
        ...priorPlan,
        enabled: true,
        lastActivatedLayer: targetLayer,
        lastActivatedAt: at,
        pendingChildJobIds: pendingIds,
        activations: [
          ...priorActivations,
          {
            layer: targetLayer,
            childJobIds: activatedIds,
            ...(deferredIds.length ? { deferredChildJobIds: deferredIds } : {}),
            ...(Array.isArray(options.selectedTasks) && options.selectedTasks.length ? { selectedTasks: options.selectedTasks } : {}),
            ...(options.replanReason ? { replanReason: String(options.replanReason).slice(0, 320) } : {}),
            sourceCheckpointJobId: options.checkpointJobId || null,
            activatedAt: at
          }
        ].slice(-12)
      }
    };
  }

  function activateWorkflowAdaptivePendingChildren(parent = {}, children = [], targetLayer = 1, options = {}) {
    const layer = Math.max(1, Number(targetLayer || 1) || 1);
    const activatedAt = nowIso();
    const activated = [];
    const deferred = [];
    const sourceLeader = options.sourceLeader || options.checkpointJob || completedWorkflowLeader(parent, children);
    const handoff = sourceLeader ? workflowLeaderHandoff(parent, sourceLeader, children, layer) : null;
    const replan = workflowLeaderReplanDecisionForLayer(parent, children, layer, { sourceLeader, checkpointJob: options.checkpointJob });
    const existingSequentialUserActionWait = workflowHasActiveSequentialUserActionWait(parent, children, { targetLayer: layer });
    const sequentialUserActionReleaseChildId = existingSequentialUserActionWait
      ? ''
      : workflowSequentialUserActionReleaseChildId(parent, children, layer, replan);
    const sequentialUserActionReleaseChild = sequentialUserActionReleaseChildId
      ? (Array.isArray(children) ? children : []).find((child) => child.id === sequentialUserActionReleaseChildId) || null
      : null;
    const sequentialUserActionReleasePriority = sequentialUserActionReleaseChild
      ? workflowSequentialUserActionPriority(parent, sequentialUserActionReleaseChild, replan)
      : 0;
    let sequentialUserActionReleased = existingSequentialUserActionWait;
    for (const child of Array.isArray(children) ? children : []) {
      if (!workflowChildIsAdaptivePending(child)) continue;
      if (workflowDispatchLayer(parent, child) !== layer) continue;
      const childTask = workflowTaskName(child);
      const input = child.input && typeof child.input === 'object' ? { ...child.input } : {};
      const broker = input._broker && typeof input._broker === 'object' ? { ...input._broker } : {};
      const workflow = broker.workflow && typeof broker.workflow === 'object' ? { ...broker.workflow } : {};
      workflow.adaptivePending = false;
      workflow.adaptiveActivatedAt = activatedAt;
      workflow.adaptiveActivatedBy = options.source || 'leader_checkpoint';
      workflow.adaptiveActivationLayer = layer;
      if (replan) {
        workflow.leaderReplan = {
          selectedTasks: replan.selectedTasks,
          candidateTasks: replan.candidateTasks,
          decisionText: replan.decisionText,
          reason: replan.reason,
          decidedAt: activatedAt
        };
      }
      if (handoff) {
        workflow.leaderHandoff = handoff;
        if (!workflow.leaderActionProtocol && handoff?.actionProtocol) workflow.leaderActionProtocol = handoff.actionProtocol;
      }
      broker.workflow = workflow;
      input._broker = broker;
      child.input = input;
      applyWorkflowHandoffPromptContextToJob(child);
      if (replan?.selectedTaskSet && !replan.selectedTaskSet.has(childTask)) {
        workflow.leaderReplanDeferred = true;
        child.status = 'completed';
        child.startedAt = null;
        child.completedAt = activatedAt;
        child.failedAt = null;
        child.timedOutAt = null;
        child.claimedAt = null;
        child.dispatchedAt = null;
        child.failureReason = null;
        child.failureCategory = null;
        child.qualityGate = null;
        child.output = {
          summary: `Deferred by leader checkpoint replan; selected tasks for this layer: ${replan.selectedTasks.join(', ')}`,
          report: {
            summary: `Deferred by leader checkpoint replan; selected tasks for this layer: ${replan.selectedTasks.join(', ')}`,
            bullets: [
              `Candidate task ${childTask || 'unknown'} was not selected after the leader reviewed prior specialist output.`,
              replan.reason
            ].filter(Boolean),
            nextAction: `Continue with ${replan.selectedTasks.join(', ')} for this layer.`,
            leader_replan: {
              selected_tasks: replan.selectedTasks,
              candidate_tasks: replan.candidateTasks,
              decision_text: replan.decisionText,
              reason: replan.reason
            }
          },
          files: []
        };
        child.dispatch = {
          ...(child.dispatch || {}),
          completionStatus: 'leader_replan_deferred',
          retryable: false,
          nextRetryAt: null,
          completedAt: activatedAt
        };
        child.logs = [
          ...(child.logs || []),
          `leader replan deferred layer-${layer} task ${childTask || 'unknown'}; selected=${replan.selectedTasks.join(', ')} (${activatedAt})`
        ];
        deferred.push(child.id);
        continue;
      }

      const preflight = broker.agentPreflight && typeof broker.agentPreflight === 'object' ? broker.agentPreflight : {};
      const preflightCode = String(preflight.code || preflight.authorityStatus || preflight.authority_status || '').trim().toLowerCase();
      const preflightHasConnectorNeed = authorityStringList(preflight.missingConnectorCapabilities || preflight.missing_connector_capabilities || preflight.requiredConnectorCapabilities || preflight.required_connector_capabilities, 12, 80).length
        || authorityStringList(preflight.missingConnectors || preflight.missing_connectors || preflight.requiredConnectors || preflight.required_connectors, 8, 60).length
        || ['action_required', 'connector_required', 'confirmation_required'].includes(preflightCode);
      if (
        workflowChildIsActionPhase(parent, child)
        && preflightHasConnectorNeed
        && (taskRequiresConnectorApproval(childTask) || taskRequiresConnectorApproval(child.taskType || ''))
      ) {
        markWorkflowChildAsSaasHandoffOnly(child, preflight.warning || preflightCode || 'connector_required');
      }
      const previousDispatch = child.dispatch || {};
      const firstDispatchRequestedAt = previousDispatch.firstDispatchRequestedAt || previousDispatch.dispatchRequestedAt || activatedAt;
      child.status = 'queued';
      child.startedAt = null;
      child.completedAt = null;
      child.failedAt = null;
      child.timedOutAt = null;
      child.claimedAt = null;
      child.dispatchedAt = null;
      child.failureReason = null;
      child.failureCategory = null;
      child.qualityGate = null;
      child.dispatch = {
        ...previousDispatch,
        completionStatus: 'leader_adaptive_released',
        retryable: true,
        nextRetryAt: activatedAt,
        scheduledAt: null,
        dispatchRequestedAt: null,
        firstDispatchRequestedAt,
        maxRetries: maxDispatchRetriesForJob(child)
      };
      child.logs = [
        ...(child.logs || []),
        `leader adaptive release for layer-${layer}${sourceLeader?.id ? ` from ${String(sourceLeader.id).slice(0, 6)}` : ''} (${activatedAt})`,
        child.dispatch?.completionStatus === 'leader_adaptive_released'
          ? `leader adaptive release made ${child.agentId || child.selectedAgentId || child.taskType || 'child'} eligible for dispatch (${activatedAt})`
          : ''
      ].filter(Boolean);
      activated.push(child.id);
    }
    recordWorkflowAdaptiveActivation(parent, layer, activated, {
      at: activatedAt,
      checkpointJobId: options.checkpointJob?.id || options.checkpointJobId || null,
      deferredIds: deferred,
      ...(replan ? { selectedTasks: replan.selectedTasks, replanReason: replan.reason } : {})
    });
    return activated;
  }

  return {
    activateWorkflowAdaptivePendingChildren,
    recordWorkflowAdaptiveActivation,
    workflowSequentialUserActionPriority,
    workflowSequentialUserActionReleaseChildId
  };
}
