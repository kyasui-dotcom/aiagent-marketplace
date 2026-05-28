export function createWorkflowLeaderSequenceHelpers(dependencies = {}) {
  const {
    authorityRequestFromReport,
    isWorkflowLeaderTask,
    leaderActionLayerStart,
    leaderTaskPhase,
    leaderWorkflowReplanDecisionFromDefinition,
    sortWorkflowChildren,
    workflowApplyQualityReviewToChild,
    workflowChildIsAdaptivePending,
    workflowChildIsLeaderReplanDeferred,
    workflowDispatchLayer,
    workflowOriginalInfoQualityReview,
    workflowOptionalUnavailablePriorRun,
    workflowPrimaryTask,
    workflowSequencePhaseForJob,
    workflowTaskName,
    workflowUnavailablePriorRunIsOptional
  } = dependencies;

  function workflowReplanTextValue(value, options = {}) {
    const maxChars = Math.max(500, Math.min(20000, Number(options.maxChars || 8000) || 8000));
    const seen = options.seen || new Set();
    const collect = (item) => {
      if (item === null || item === undefined) return '';
      if (typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean') return String(item);
      if (typeof item !== 'object') return '';
      if (seen.has(item)) return '';
      seen.add(item);
      if (Array.isArray(item)) return item.map(collect).filter(Boolean).join('\n');
      return Object.entries(item)
        .filter(([key]) => !/token|secret|callback|billing|usage|cost|id$/i.test(String(key || '')))
        .map(([key, nested]) => `${key}: ${collect(nested)}`)
        .filter((line) => line.replace(/^[^:]+:\s*/, '').trim())
        .join('\n');
    };
    return collect(value).replace(/\s+/g, ' ').trim().slice(0, maxChars);
  }
  
  function workflowLeaderReplanDecisionForLayer(parent = {}, children = [], targetLayer = 1, options = {}) {
    const primary = workflowPrimaryTask(parent);
    const layer = Math.max(1, Number(targetLayer || 1) || 1);
    const candidateChildren = (Array.isArray(children) ? children : [])
      .filter((child) => workflowChildIsAdaptivePending(child))
      .filter((child) => workflowDispatchLayer(parent, child) === layer);
    const candidateTasks = [...new Set(candidateChildren.map((child) => workflowTaskName(child)).filter(Boolean))];
    if (candidateTasks.length <= 1) return null;
    const sourceLeader = options.sourceLeader || options.checkpointJob || null;
    const priorCompleted = sortWorkflowChildren(parent, children)
      .filter((child) => String(child?.status || '').trim().toLowerCase() === 'completed')
      .filter((child) => workflowDispatchLayer(parent, child) < layer);
    const planningOutputs = priorCompleted.filter((child) => leaderTaskPhase(primary, workflowTaskName(child)) === 'planning');
    const sourceText = [
      workflowReplanTextValue(sourceLeader?.output || {}, { maxChars: 6000 }),
      ...planningOutputs.map((child) => workflowReplanTextValue(child.output || {}, { maxChars: 5000 })),
      ...priorCompleted.map((child) => workflowReplanTextValue({
        task: workflowTaskName(child),
        summary: child.output?.summary || child.output?.report?.summary || child.failureReason || ''
      }, { maxChars: 1000 }))
    ].filter(Boolean).join('\n');
    const replan = leaderWorkflowReplanDecisionFromDefinition(primary, {
      candidateTasks,
      sourceText,
      layer,
      actionLayerStart: leaderActionLayerStart(primary)
    });
    if (!replan) return null;
    return {
      ...replan,
      selectedTaskSet: new Set(replan.selectedTasks || [])
    };
  }
  
  function workflowLeaderSequence(parent = {}) {
    const sequence = parent?.workflow?.leaderSequence;
    if (!sequence || sequence.enabled !== true) return null;
    return sequence;
  }
  
  function workflowLeaderCheckpoints(parent = {}) {
    const sequence = workflowLeaderSequence(parent);
    if (!sequence?.enabled) return [];
    const checkpoints = Array.isArray(sequence.checkpoints)
      ? sequence.checkpoints
      : [];
    const normalized = checkpoints
      .map((checkpoint) => ({
        jobId: String(checkpoint?.jobId || checkpoint?.job_id || '').trim(),
        afterLayer: Math.max(1, Number(checkpoint?.afterLayer || checkpoint?.checkpointLayer || 1) || 1),
        beforeLayer: Math.max(2, Number(checkpoint?.beforeLayer || checkpoint?.requiredBeforeLayer || 2) || 2),
        status: String(checkpoint?.status || 'pending').trim().toLowerCase() || 'pending',
        label: String(checkpoint?.label || '').trim(),
        requiresUserApprovalBeforeAction: checkpoint?.requiresUserApprovalBeforeAction === true
      }))
      .filter((checkpoint) => checkpoint.jobId);
    if (!normalized.length && sequence.checkpointJobId) {
      normalized.push({
        jobId: String(sequence.checkpointJobId || '').trim(),
        afterLayer: Math.max(1, Number(sequence.checkpointLayer || 1) || 1),
        beforeLayer: Math.max(2, Number(sequence.requiredBeforeLayer || 2) || 2),
        status: String(sequence.status || 'pending').trim().toLowerCase() || 'pending',
        label: 'research_to_execution',
        requiresUserApprovalBeforeAction: false
      });
    }
    return normalized.sort((left, right) => left.beforeLayer - right.beforeLayer);
  }
  
  function workflowCheckpointStatus(checkpoint = {}, checkpointJob = null) {
    const jobStatus = String(checkpointJob?.status || '').trim().toLowerCase();
    if (jobStatus === 'completed') return 'completed';
    if (['failed', 'timed_out'].includes(jobStatus)) return 'failed';
    if (['queued', 'claimed', 'running', 'dispatched'].includes(jobStatus)) return 'queued';
    return String(checkpoint.status || 'pending').trim().toLowerCase() || 'pending';
  }
  
  function workflowCheckpointBlocksLayer(parent = {}, children = [], layer = 1) {
    const checkpoints = workflowLeaderCheckpoints(parent);
    if (!checkpoints.length) return null;
    for (const checkpoint of checkpoints) {
      if (checkpoint.beforeLayer > layer) continue;
      const checkpointJob = children.find((child) => child.id === checkpoint.jobId) || null;
      if (workflowCheckpointStatus(checkpoint, checkpointJob) !== 'completed') return checkpoint;
    }
    return null;
  }
  
  function workflowLayerWasLeaderActivated(parent = {}, layer = 1) {
    const targetLayer = Math.max(1, Number(layer || 1) || 1);
    const activations = Array.isArray(parent?.workflow?.adaptivePlan?.activations)
      ? parent.workflow.adaptivePlan.activations
      : [];
    return activations.some((activation) => Number(activation?.layer || 0) === targetLayer);
  }
  
  function workflowFailedPriorLayerShouldWarnNotBlock(parent = {}, children = [], child = {}, targetLayer = 1) {
    const safeTargetLayer = Math.max(1, Number(targetLayer || 1) || 1);
    if (safeTargetLayer < leaderActionLayerStart(workflowPrimaryTask(parent))) return false;
    if (!workflowLayerWasLeaderActivated(parent, safeTargetLayer)) return false;
    const childLayer = workflowDispatchLayer(parent, child);
    if (childLayer <= 0 || childLayer >= safeTargetLayer) return false;
    const phase = workflowSequencePhaseForJob(child);
    if (!['preparation', 'planning', 'action', 'implementation'].includes(phase)) return false;
    return sortWorkflowChildren(parent, children).some((candidate) => (
      candidate?.id !== child?.id
      && !isWorkflowLeaderTask(workflowTaskName(candidate))
      && workflowDispatchLayer(parent, candidate) === childLayer
      && String(candidate.status || '').trim().toLowerCase() === 'completed'
    ));
  }
  
  function workflowBlockingQualityGateBeforeLayer(parent = {}, children = [], layer = 1) {
    const targetLayer = Math.max(1, Number(layer || 1) || 1);
    if (targetLayer <= 1) return null;
    const sorted = sortWorkflowChildren(parent, children);
    for (const child of sorted) {
      if (!child || isWorkflowLeaderTask(workflowTaskName(child))) continue;
      if (workflowDispatchLayer(parent, child) >= targetLayer) continue;
      const status = String(child.status || '').trim().toLowerCase();
      if (['failed', 'timed_out'].includes(status)) {
        const optionalUnavailable = workflowOptionalUnavailablePriorRun(parent, child, targetLayer);
        if (optionalUnavailable && workflowUnavailablePriorRunIsOptional(optionalUnavailable)) continue;
        if (workflowFailedPriorLayerShouldWarnNotBlock(parent, children, child, targetLayer)) continue;
        return {
          type: 'prior_layer_unavailable',
          childId: child.id,
          taskType: workflowTaskName(child),
          summary: child.failureReason || child.failure_reason || (status === 'timed_out'
            ? 'prior layer timed out before producing usable output'
            : 'prior layer failed before producing usable output')
        };
      }
      if (workflowChildIsLeaderReplanDeferred(child)) continue;
      const currentReview = String(child.status || '').trim().toLowerCase() === 'completed'
        ? workflowOriginalInfoQualityReview(parent, child)
        : null;
      if (currentReview?.applicable) workflowApplyQualityReviewToChild(child, currentReview);
      const gate = currentReview?.applicable
        ? child.qualityGate
        : (child.qualityGate && typeof child.qualityGate === 'object' ? child.qualityGate : null);
      if (gate && gate.applicable !== false && gate.passed === false) {
        return {
          type: 'child_quality_gate',
          childId: child.id,
          taskType: workflowTaskName(child),
          summary: Array.isArray(gate.issues) && gate.issues.length ? gate.issues.join('+') : (gate.summary || 'prior layer quality gate failed')
        };
      }
      const authorityRequest = authorityRequestFromReport(child.output?.report);
      const authoritySource = String(authorityRequest?.source || '').trim().toLowerCase();
      if (authoritySource === 'search_connector_required') {
        return {
          type: 'search_connector_required',
          childId: child.id,
          taskType: workflowTaskName(child),
          summary: authorityRequest?.reason || 'prior research layer search connector is required'
        };
      }
    }
    const lastGate = parent?.workflow?.leaderSequence?.lastQualityGate;
    if (lastGate && typeof lastGate === 'object' && lastGate.passed === false) {
      return {
        type: 'leader_quality_gate',
        summary: lastGate.summary || 'leader quality gate failed before releasing downstream layer'
      };
    }
    return null;
  }
  
  function workflowLeaderSequenceNeedsProgress(parent = {}) {
    const sequence = workflowLeaderSequence(parent);
    if (!sequence?.enabled) return false;
    const checkpoints = workflowLeaderCheckpoints(parent);
    if (checkpoints.some((checkpoint) => String(checkpoint.status || '').trim().toLowerCase() !== 'completed')) return true;
    if (!checkpoints.length && String(sequence.status || '').trim().toLowerCase() !== 'completed') return true;
    if (sequence.finalSummaryJobId && String(sequence.finalSummaryStatus || '').trim().toLowerCase() !== 'completed') return true;
    return false;
  }
  
  function workflowChildrenForLayer(parent = {}, children = [], layer = 1, options = {}) {
    return sortWorkflowChildren(parent, children)
      .filter((child) => (options.includeLeader ? true : !isWorkflowLeaderTask(workflowTaskName(child))))
      .filter((child) => workflowDispatchLayer(parent, child) === layer);
  }
  
  function workflowShouldEnableLeaderSequence(plan = {}, taskType = '') {
    const plannedTasks = Array.isArray(plan?.plannedTasks) ? plan.plannedTasks : [];
    const assignments = Array.isArray(plan?.assignments) ? plan.assignments : [];
    const primary = String(plannedTasks[0] || taskType || '').trim().toLowerCase();
    if (!isWorkflowLeaderTask(primary)) return false;
    const pseudoParent = {
      taskType: primary,
      workflow: {
        plannedTasks: plannedTasks.length ? plannedTasks : [primary]
      }
    };
    const nonLeaderLayers = assignments
      .map((item) => String(item?.taskType || '').trim().toLowerCase())
      .filter((task) => task && !isWorkflowLeaderTask(task))
      .map((task) => workflowDispatchLayer(pseudoParent, { workflowTask: task, taskType: task }));
    const hasResearchLayer = nonLeaderLayers.some((layer) => layer === 1);
    const hasActionLayer = nonLeaderLayers.some((layer) => layer >= 2);
    return hasResearchLayer && hasActionLayer;
  }

  return {
    workflowReplanTextValue,
    workflowLeaderReplanDecisionForLayer,
    workflowLeaderSequence,
    workflowLeaderCheckpoints,
    workflowCheckpointStatus,
    workflowCheckpointBlocksLayer,
    workflowLayerWasLeaderActivated,
    workflowFailedPriorLayerShouldWarnNotBlock,
    workflowBlockingQualityGateBeforeLayer,
    workflowLeaderSequenceNeedsProgress,
    workflowChildrenForLayer,
    workflowShouldEnableLeaderSequence
  };
}
