function requireRuntime(label = 'runtime', getter = null) {
  const runtime = typeof getter === 'function' ? getter() : null;
  if (!runtime) throw new Error(`${label} is not initialized.`);
  return runtime;
}

function delegate(label, getter, methodName) {
  return (...args) => requireRuntime(label, getter)[methodName](...args);
}

export function createWorkflowRuntimeDelegates(deps = {}) {
  const {
    getSourceRequirementHelpers,
    getEndpointDispatchHelpers,
    getChildProgressHelpers,
    getParentBlockingHelpers,
    getPriorRunHelpers,
    getLeaderSequenceHelpers,
    getDispatchRuntime
  } = deps;

  return {
    braveSearchConfiguredForWorkflow: delegate('Workflow source requirement helpers', getSourceRequirementHelpers, 'braveSearchConfiguredForWorkflow'),
    workflowJobRequiresSearch: delegate('Workflow source requirement helpers', getSourceRequirementHelpers, 'workflowJobRequiresSearch'),
    workflowSourceCollectionContractForJob: delegate('Workflow source requirement helpers', getSourceRequirementHelpers, 'workflowSourceCollectionContractForJob'),
    workflowSourceCollectionQualityRule: delegate('Workflow source requirement helpers', getSourceRequirementHelpers, 'workflowSourceCollectionQualityRule'),
    workflowPrimaryTaskForJob: delegate('Workflow source requirement helpers', getSourceRequirementHelpers, 'workflowPrimaryTaskForJob'),
    workflowMetaWithoutGlobalSearchFlags: delegate('Workflow source requirement helpers', getSourceRequirementHelpers, 'workflowMetaWithoutGlobalSearchFlags'),

    dispatchJobToAssignedAgent: delegate('Workflow endpoint dispatch helpers', getEndpointDispatchHelpers, 'dispatchJobToAssignedAgent'),
    loadDispatchJobAndAgent: delegate('Workflow endpoint dispatch helpers', getEndpointDispatchHelpers, 'loadDispatchJobAndAgent'),
    dispatchExistingJobToAssignedAgent: delegate('Workflow endpoint dispatch helpers', getEndpointDispatchHelpers, 'dispatchExistingJobToAssignedAgent'),
    canAutoScheduleAsyncDispatch: delegate('Workflow endpoint dispatch helpers', getEndpointDispatchHelpers, 'canAutoScheduleAsyncDispatch'),

    workflowChildPlanIndex: delegate('Workflow child progress helpers', getChildProgressHelpers, 'workflowChildPlanIndex'),
    workflowChildSortKey: delegate('Workflow child progress helpers', getChildProgressHelpers, 'workflowChildSortKey'),
    sortWorkflowChildren: delegate('Workflow child progress helpers', getChildProgressHelpers, 'sortWorkflowChildren'),
    workflowChildIsTerminal: delegate('Workflow child progress helpers', getChildProgressHelpers, 'workflowChildIsTerminal'),
    workflowChildIsAdaptivePending: delegate('Workflow child progress helpers', getChildProgressHelpers, 'workflowChildIsAdaptivePending'),
    workflowChildIsSequentialUserActionDeferred: delegate('Workflow child progress helpers', getChildProgressHelpers, 'workflowChildIsSequentialUserActionDeferred'),
    workflowChildIsLeaderReplanDeferred: delegate('Workflow child progress helpers', getChildProgressHelpers, 'workflowChildIsLeaderReplanDeferred'),
    workflowChildAdaptiveLayer: delegate('Workflow child progress helpers', getChildProgressHelpers, 'workflowChildAdaptiveLayer'),
    workflowChildIsBlockingProgress: delegate('Workflow child progress helpers', getChildProgressHelpers, 'workflowChildIsBlockingProgress'),
    workflowChildIsApprovalBlockedTerminal: delegate('Workflow child progress helpers', getChildProgressHelpers, 'workflowChildIsApprovalBlockedTerminal'),
    authorityRequestRequiresSequentialUserAction: delegate('Workflow child progress helpers', getChildProgressHelpers, 'authorityRequestRequiresSequentialUserAction'),
    workflowChildRequiresSequentialUserAction: delegate('Workflow child progress helpers', getChildProgressHelpers, 'workflowChildRequiresSequentialUserAction'),
    workflowHasActiveSequentialUserActionWait: delegate('Workflow child progress helpers', getChildProgressHelpers, 'workflowHasActiveSequentialUserActionWait'),
    workflowLeaderChildIsApprovalBlockedTerminal: delegate('Workflow child progress helpers', getChildProgressHelpers, 'workflowLeaderChildIsApprovalBlockedTerminal'),
    workflowChildIsTerminalForProgress: delegate('Workflow child progress helpers', getChildProgressHelpers, 'workflowChildIsTerminalForProgress'),

    markWorkflowParentBlockedIfNeeded: delegate('Workflow parent blocking helpers', getParentBlockingHelpers, 'markWorkflowParentBlockedIfNeeded'),

    workflowCompletedRunHandoff: delegate('Workflow prior run helpers', getPriorRunHelpers, 'workflowCompletedRunHandoff'),
    workflowPriorCompletedRuns: delegate('Workflow prior run helpers', getPriorRunHelpers, 'workflowPriorCompletedRuns'),
    workflowDataUnavailableOutput: delegate('Workflow prior run helpers', getPriorRunHelpers, 'workflowDataUnavailableOutput'),
    workflowUnavailablePriorRunIsOptional: delegate('Workflow prior run helpers', getPriorRunHelpers, 'workflowUnavailablePriorRunIsOptional'),
    workflowJobHasAttachedDataContext: delegate('Workflow prior run helpers', getPriorRunHelpers, 'workflowJobHasAttachedDataContext'),
    workflowOptionalUnavailablePriorRun: delegate('Workflow prior run helpers', getPriorRunHelpers, 'workflowOptionalUnavailablePriorRun'),
    workflowPriorUnavailableRuns: delegate('Workflow prior run helpers', getPriorRunHelpers, 'workflowPriorUnavailableRuns'),
    workflowLeaderPriorLayerUnavailable: delegate('Workflow prior run helpers', getPriorRunHelpers, 'workflowLeaderPriorLayerUnavailable'),
    workflowLeaderPriorLayerOptionalOnly: delegate('Workflow prior run helpers', getPriorRunHelpers, 'workflowLeaderPriorLayerOptionalOnly'),

    workflowReplanTextValue: delegate('Workflow leader sequence helpers', getLeaderSequenceHelpers, 'workflowReplanTextValue'),
    workflowLeaderReplanDecisionForLayer: delegate('Workflow leader sequence helpers', getLeaderSequenceHelpers, 'workflowLeaderReplanDecisionForLayer'),
    workflowLeaderSequence: delegate('Workflow leader sequence helpers', getLeaderSequenceHelpers, 'workflowLeaderSequence'),
    workflowLeaderCheckpoints: delegate('Workflow leader sequence helpers', getLeaderSequenceHelpers, 'workflowLeaderCheckpoints'),
    workflowCheckpointStatus: delegate('Workflow leader sequence helpers', getLeaderSequenceHelpers, 'workflowCheckpointStatus'),
    workflowCheckpointBlocksLayer: delegate('Workflow leader sequence helpers', getLeaderSequenceHelpers, 'workflowCheckpointBlocksLayer'),
    workflowLayerWasLeaderActivated: delegate('Workflow leader sequence helpers', getLeaderSequenceHelpers, 'workflowLayerWasLeaderActivated'),
    workflowFailedPriorLayerShouldWarnNotBlock: delegate('Workflow leader sequence helpers', getLeaderSequenceHelpers, 'workflowFailedPriorLayerShouldWarnNotBlock'),
    workflowBlockingQualityGateBeforeLayer: delegate('Workflow leader sequence helpers', getLeaderSequenceHelpers, 'workflowBlockingQualityGateBeforeLayer'),
    workflowLeaderSequenceNeedsProgress: delegate('Workflow leader sequence helpers', getLeaderSequenceHelpers, 'workflowLeaderSequenceNeedsProgress'),
    workflowChildrenForLayer: delegate('Workflow leader sequence helpers', getLeaderSequenceHelpers, 'workflowChildrenForLayer'),
    workflowShouldEnableLeaderSequence: delegate('Workflow leader sequence helpers', getLeaderSequenceHelpers, 'workflowShouldEnableLeaderSequence'),

    pickProgressDispatchTargets: delegate('Workflow dispatch runtime', getDispatchRuntime, 'pickProgressDispatchTargets'),
    pickProgressDispatchTarget: delegate('Workflow dispatch runtime', getDispatchRuntime, 'pickProgressDispatchTarget'),
    markDispatchScheduled: delegate('Workflow dispatch runtime', getDispatchRuntime, 'markDispatchScheduled'),
    scheduleProgressDispatchesForJobId: delegate('Workflow dispatch runtime', getDispatchRuntime, 'scheduleProgressDispatchesForJobId'),
    scheduleProgressDispatchForJobId: delegate('Workflow dispatch runtime', getDispatchRuntime, 'scheduleProgressDispatchForJobId'),
    scheduleInitialWorkflowDispatchFromChildren: delegate('Workflow dispatch runtime', getDispatchRuntime, 'scheduleInitialWorkflowDispatchFromChildren'),
    scheduleNextWorkflowDispatchLightweight: delegate('Workflow dispatch runtime', getDispatchRuntime, 'scheduleNextWorkflowDispatchLightweight'),
    recoverWorkflowEndpointDispatchJobs: delegate('Workflow dispatch runtime', getDispatchRuntime, 'recoverWorkflowEndpointDispatchJobs'),
    verifyInternalCronRequest: delegate('Workflow dispatch runtime', getDispatchRuntime, 'verifyInternalCronRequest'),
    handleInternalWorkflowCompletionSweep: delegate('Workflow dispatch runtime', getDispatchRuntime, 'handleInternalWorkflowCompletionSweep'),
    runMinuteWorkflowCompletionSweep: delegate('Workflow dispatch runtime', getDispatchRuntime, 'runMinuteWorkflowCompletionSweep'),
    processWorkflowDispatchQueueMessage: delegate('Workflow dispatch runtime', getDispatchRuntime, 'processWorkflowDispatchQueueMessage'),
    runQueuedEndpointDispatchSweep: delegate('Workflow dispatch runtime', getDispatchRuntime, 'runQueuedEndpointDispatchSweep')
  };
}
