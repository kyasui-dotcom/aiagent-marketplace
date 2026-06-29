export function createWorkflowLayeringHelpers({
  isWorkflowLeaderTask,
  leaderOrchestrationProfile,
  leaderTaskLayer,
  leaderTaskPhase,
  workflowTaskName
}) {
  function workflowPrimaryTask(parent = {}) {
    const plannedTasks = Array.isArray(parent.workflow?.plannedTasks) ? parent.workflow.plannedTasks : [];
    return String(plannedTasks[0] || parent.taskType || '').trim().toLowerCase();
  }

  function workflowDispatchLayer(parent = {}, child = {}) {
    const task = workflowTaskName(child);
    if (isWorkflowLeaderTask(task)) return 0;
    const brokerWorkflow = child?.input?._broker?.workflow && typeof child.input._broker.workflow === 'object'
      ? child.input._broker.workflow
      : {};
    const explicitLayer = Number(
      brokerWorkflow.dispatchLayer
      || brokerWorkflow.dispatch_layer
      || child?.dispatchLayer
      || child?.dispatch_layer
      || child?.layer
      || child?.layerNumber
      || child?.layer_number
      || 0
    ) || 0;
    if (explicitLayer > 0) return explicitLayer;
    const primary = workflowPrimaryTask(parent);
    return leaderTaskLayer(primary, task) || 1;
  }

  function workflowSequencePhaseForTask(primaryTask = '', taskType = '', layer = null) {
    const task = String(taskType || '').trim().toLowerCase();
    if (isWorkflowLeaderTask(task)) return 'initial';
    const phase = leaderTaskPhase(primaryTask, task);
    if (phase) return phase;
    const resolvedLayer = Number(layer || leaderTaskLayer(primaryTask, task) || 1);
    if (resolvedLayer <= 1) return 'research';
    if (resolvedLayer === 2) return 'planning';
    if (resolvedLayer === 3) return 'preparation';
    return 'action';
  }

  function workflowLayerLabel(primaryTask = '', layer = 1) {
    const primary = String(primaryTask || '').trim().toLowerCase();
    const layerNumber = Number(layer || 1) || 1;
    const profile = leaderOrchestrationProfile(primary);
    const layerProfile = (profile?.layers || []).find((item) => Number(item?.number || 0) === layerNumber);
    if (layerProfile) {
      return String(layerProfile.phase || layerProfile.name || `layer_${layerNumber}`).trim() || `layer_${layerNumber}`;
    }
    const profilePhase = ['research', 'planning', 'preparation', 'action', 'summary'][Math.max(1, layerNumber) - 1] || `layer_${layerNumber}`;
    if (layerNumber <= 1) return 'research';
    if (layerNumber === 2) return 'execution';
    return profilePhase;
  }

  function workflowLayerRequiresUserApprovalBeforeRelease(primaryTask = '', beforeLayer = 1, assignments = []) {
    return false;
  }

  return {
    workflowDispatchLayer,
    workflowLayerLabel,
    workflowLayerRequiresUserApprovalBeforeRelease,
    workflowPrimaryTask,
    workflowSequencePhaseForTask
  };
}
