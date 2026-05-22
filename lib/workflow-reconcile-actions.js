export function createWorkflowReconcileActions(deps = {}) {
  const {
    authorityRequestFromReport,
    authorityRequestHandledBySaasHandoff,
    authorityRequestRequiresApproval,
    clearJobAuthorityRequest,
    isWorkflowLeaderTask,
    leaderActionLayerStart,
    leaderExternalActionRequestedFromDefinition,
    nowIso,
    taskRequiresConnectorApproval,
    workflowChildIsApprovalBlockedTerminal,
    workflowChildIsSequentialUserActionDeferred,
    workflowChildIsTerminalForProgress,
    workflowDispatchLayer,
    workflowHumanActionIntentText,
    workflowPrimaryTask,
    workflowSequencePhaseForJob,
    workflowTaskName,
    workflowUsesSaasPublishHandoff
  } = deps;

  function blockWorkflowPendingChildren(children = [], reason = 'blocked_by_workflow_failure') {
    const blockedAt = nowIso();
    let blocked = 0;
    for (const child of Array.isArray(children) ? children : []) {
      const status = String(child?.status || '').trim().toLowerCase();
      if (!child || ['completed', 'failed', 'timed_out', 'blocked'].includes(status)) continue;
      child.status = 'blocked';
      child.claimedAt = null;
      child.dispatchedAt = null;
      child.startedAt = null;
      child.completedAt = null;
      child.failedAt = null;
      child.timedOutAt = null;
      child.lastCallbackAt = null;
      child.failureReason = reason;
      child.failureCategory = 'workflow_blocked';
      child.dispatch = {
        ...(child.dispatch || {}),
        completionStatus: reason,
        retryable: false,
        nextRetryAt: null
      };
      child.logs = [
        ...(child.logs || []),
        `workflow blocked before dispatch: ${reason} (${blockedAt})`
      ];
      blocked += 1;
    }
    return blocked;
  }

  function markWorkflowParentBlockedByLeaderQuality(parent = {}, reason = '') {
    clearJobAuthorityRequest(parent);
    parent.status = 'blocked';
    parent.completedAt = null;
    parent.failedAt = null;
    parent.failureCategory = 'leader_quality_gate_failed';
    parent.failureReason = reason || 'Leader quality gate blocked workflow progression';
    parent.dispatch = {
      ...(parent.dispatch || {}),
      completionStatus: 'leader_quality_gate_failed',
      retryable: false,
      nextRetryAt: null,
      completedAt: null
    };
  }

  function workflowParentRequestedExternalExecution(parent = {}) {
    const primary = workflowPrimaryTask(parent);
    const text = [
      parent.prompt,
      parent.originalPrompt,
      parent.workflow?.objective
    ].map((item) => String(item || '').trim()).filter(Boolean).join(' ');
    return leaderExternalActionRequestedFromDefinition(primary, workflowHumanActionIntentText(text));
  }

  function workflowChildIsSaasHandoffOnly(child = {}) {
    const broker = child?.input?._broker && typeof child.input._broker === 'object' ? child.input._broker : {};
    const workflow = broker.workflow && typeof broker.workflow === 'object' ? broker.workflow : {};
    const preflight = broker.agentPreflight && typeof broker.agentPreflight === 'object' ? broker.agentPreflight : {};
    const phase = String(workflow.sequencePhase || workflow.sequence_phase || '').trim().toLowerCase();
    const task = workflowTaskName(child);
    return Boolean(
      workflow.actionHandoffOnly === true
      || String(workflow.externalActionMode || '').trim().toLowerCase() === 'saas_handoff_only'
      || preflight.handoffOnly === true
      || String(preflight.authorityStatus || preflight.authority_status || '').trim().toLowerCase() === 'handoff_only'
      || (
        workflowUsesSaasPublishHandoff(child)
        && (phase === 'action' || taskRequiresConnectorApproval(task) || taskRequiresConnectorApproval(child.taskType || ''))
      )
    );
  }

  function workflowChildIsActionPhase(parent = {}, child = {}) {
    const phase = workflowSequencePhaseForJob(child);
    if (phase === 'action') return true;
    const task = workflowTaskName(child);
    const broker = child?.input?._broker && typeof child.input._broker === 'object' ? child.input._broker : {};
    const dispatchTask = String(child.dispatchTaskType || broker.dispatchTaskType || broker.dispatch_task_type || child.taskType || '').trim().toLowerCase();
    if (taskRequiresConnectorApproval(task) || taskRequiresConnectorApproval(dispatchTask)) return true;
    const layer = workflowDispatchLayer(parent, child);
    return layer >= leaderActionLayerStart(workflowPrimaryTask(parent));
  }

  function markWorkflowChildAsSaasHandoffOnly(child = {}, reason = 'connector_required') {
    if (!child || typeof child !== 'object') return child;
    const input = child.input && typeof child.input === 'object' ? { ...child.input } : {};
    const broker = input._broker && typeof input._broker === 'object' ? { ...input._broker } : {};
    const workflow = broker.workflow && typeof broker.workflow === 'object' ? { ...broker.workflow } : {};
    const preflight = broker.agentPreflight && typeof broker.agentPreflight === 'object' ? { ...broker.agentPreflight } : {};
    workflow.actionHandoffOnly = true;
    workflow.externalActionMode = 'saas_handoff_only';
    workflow.publishSurface = 'saas';
    workflow.publishApprovalSurface = 'saas';
    workflow.actionHandoffReason = String(reason || preflight.warning || preflight.code || 'connector_required').slice(0, 160);
    preflight.authorityStatus = 'handoff_only';
    preflight.handoffOnly = true;
    preflight.publishSurface = 'saas';
    broker.workflow = workflow;
    broker.agentPreflight = preflight;
    input._broker = broker;
    child.input = input;
    return child;
  }

  function completeWorkflowSaasHandoffOnlyChild(parent = {}, child = {}, reason = 'saas_publish_handoff') {
    if (!child || typeof child !== 'object') return false;
    const status = String(child.status || '').trim().toLowerCase();
    if (!['planned', 'queued', 'blocked'].includes(status)) return false;
    const task = workflowTaskName(child);
    const authorityRequest = authorityRequestFromReport(child.output?.report);
    const actionHandoff = workflowUsesSaasPublishHandoff(child, parent) && workflowChildIsActionPhase(parent, child);
    const leaderAuthorityHandoff = isWorkflowLeaderTask(task) && authorityRequestHandledBySaasHandoff(child, authorityRequest, parent);
    if (!actionHandoff && !leaderAuthorityHandoff) return false;
    const at = nowIso();
    const previousSummary = String(child.output?.summary || child.output?.report?.summary || child.failureReason || '').trim();
    const handoffSummary = 'External publish/action execution is handled by the manifest-matched SaaS app handoff surface; no chat-side connector approval is required here.';
    markWorkflowChildAsSaasHandoffOnly(child, reason);
    child.status = 'completed';
    child.startedAt = child.startedAt || null;
    child.claimedAt = null;
    child.dispatchedAt = null;
    child.completedAt = at;
    child.failedAt = null;
    child.timedOutAt = null;
    child.failureReason = null;
    child.failureCategory = null;
    child.output = {
      summary: handoffSummary,
      report: {
        summary: handoffSummary,
        bullets: [
          'Preparation-layer delivery data is already available to matching SaaS apps.',
          'Use the manifest-matched app surface for publish/copy-paste execution; generic publisher or lead tools are fallback app surfaces only when their manifests match.',
          ...(previousSummary ? [`Previous blocker preserved as handoff context: ${previousSummary.slice(0, 240)}`] : [])
        ],
        nextAction: 'Open the matched SaaS app handoff from the delivery area and publish or copy/paste from that surface.',
        saas_handoff_only: true,
        publish_surface: 'saas'
      },
      files: Array.isArray(child.output?.files) ? child.output.files : []
    };
    clearJobAuthorityRequest(child);
    child.dispatch = {
      ...(child.dispatch || {}),
      completionStatus: 'saas_handoff_only',
      retryable: false,
      nextRetryAt: null,
      completedAt: at
    };
    child.logs = [
      ...(child.logs || []),
      `completed as SaaS handoff-only workflow step (${at})`
    ];
    return true;
  }

  function completeWorkflowSaasHandoffOnlyChildren(parent = {}, children = []) {
    let updated = 0;
    const list = Array.isArray(children) ? children : [];
    const initialApprovalWaitLayers = new Set(list
      .filter((candidate) => (
        String(candidate?.status || '').trim().toLowerCase() === 'blocked'
        && (
          workflowChildIsApprovalBlockedTerminal(candidate)
          || authorityRequestRequiresApproval(authorityRequestFromReport(candidate.output?.report))
        )
      ))
      .map((candidate) => workflowDispatchLayer(parent, candidate)));
    for (const child of list) {
      const childLayer = workflowDispatchLayer(parent, child);
      const priorLayerIncomplete = list.some((candidate) => (
        candidate !== child
        && !isWorkflowLeaderTask(workflowTaskName(candidate))
        && workflowDispatchLayer(parent, candidate) < childLayer
        && !workflowChildIsTerminalForProgress(candidate)
      ));
      if (priorLayerIncomplete) continue;
      if (initialApprovalWaitLayers.has(childLayer) && String(child?.status || '').trim().toLowerCase() !== 'blocked') continue;
      if (completeWorkflowSaasHandoffOnlyChild(parent, child)) updated += 1;
    }
    return updated;
  }

  function workflowBlockedParentStatus(parent = {}, children = [], blockingChildren = []) {
    if (!Array.isArray(blockingChildren) || !blockingChildren.length) return null;
    const active = new Set(['queued', 'claimed', 'running', 'dispatched']);
    const activeLeaderRun = children.some((child) => (
      active.has(String(child.status || '').toLowerCase())
      && isWorkflowLeaderTask(workflowTaskName(child))
    ));
    if (activeLeaderRun) return 'running';
    const blockedLayer = Math.min(...blockingChildren.map((child) => workflowDispatchLayer(parent, child)));
    const activeAtOrBeforeBlockedLayer = children.some((child) => (
      active.has(String(child.status || '').toLowerCase())
      && !workflowChildIsSequentialUserActionDeferred(child)
      && workflowDispatchLayer(parent, child) <= blockedLayer
    ));
    return activeAtOrBeforeBlockedLayer ? 'running' : 'blocked';
  }

  return {
    blockWorkflowPendingChildren,
    completeWorkflowSaasHandoffOnlyChild,
    completeWorkflowSaasHandoffOnlyChildren,
    markWorkflowChildAsSaasHandoffOnly,
    markWorkflowParentBlockedByLeaderQuality,
    workflowBlockedParentStatus,
    workflowChildIsActionPhase,
    workflowChildIsSaasHandoffOnly,
    workflowParentRequestedExternalExecution
  };
}
