export function createWorkflowLeaderSequenceRepair(deps = {}) {
  const {
    applyWorkflowHandoffPromptContextToJob,
    callbackTokenForJob,
    isWorkflowLeaderTask,
    nowIso,
    workflowLayerLabel,
    workflowPrimaryTask,
    workflowTaskName
  } = deps;

  function rebuildMissingLeaderSequenceChildJobs(parent = {}, children = [], state = {}, leaderSequence = null) {
    if (!parent?.id || !leaderSequence?.enabled) return { repaired: false, repairedIds: [] };
    const existingIds = new Set(children.map((item) => String(item?.id || '').trim()).filter(Boolean));
    const sourceLeader = children.find((item) => (
      isWorkflowLeaderTask(workflowTaskName(item))
      && String(item?.input?._broker?.workflow?.sequencePhase || '').trim().toLowerCase() === 'initial'
    )) || children.find((item) => isWorkflowLeaderTask(workflowTaskName(item))) || null;
    if (!sourceLeader?.id) return { repaired: false, repairedIds: [] };

    const repairedAt = nowIso();
    const baseInput = sourceLeader.input && typeof sourceLeader.input === 'object'
      ? structuredClone(sourceLeader.input)
      : {};
    const baseBroker = baseInput._broker && typeof baseInput._broker === 'object'
      ? structuredClone(baseInput._broker)
      : {};
    const baseWorkflow = baseBroker.workflow && typeof baseBroker.workflow === 'object'
      ? structuredClone(baseBroker.workflow)
      : {};
    const leaderTask = workflowTaskName(sourceLeader) || workflowPrimaryTask(parent) || parent.taskType;
    const leaderName = sourceLeader.workflowAgentName || sourceLeader.input?._broker?.agentPreflight?.agentName || sourceLeader.assignedAgentId || 'Leader';
    const leaderAgentId = sourceLeader.assignedAgentId || sourceLeader.input?._broker?.agentPreflight?.agentId || null;
    const commonJob = (id, phase, workflowPatch = {}, status = 'blocked') => {
      const input = {
        ...baseInput,
        _broker: {
          ...baseBroker,
          workflow: {
            ...baseWorkflow,
            ...workflowPatch,
            sequencePhase: phase,
            repairedFromMissingLeaderSequenceChild: true,
            repairedAt
          }
        }
      };
      return {
        id,
        jobKind: 'workflow_child',
        parentAgentId: parent.parentAgentId || sourceLeader.parentAgentId || 'workflow',
        taskType: leaderTask,
        prompt: sourceLeader.prompt || parent.prompt || parent.workflow?.objective || `${leaderName} ${phase}`,
        input,
        budgetCap: parent.budgetCap || sourceLeader.budgetCap || null,
        deadlineSec: parent.deadlineSec || sourceLeader.deadlineSec || null,
        priority: parent.priority || sourceLeader.priority || 'normal',
        status,
        assignedAgentId: leaderAgentId,
        score: sourceLeader.score || null,
        createdAt: repairedAt,
        callbackToken: callbackTokenForJob(),
        workflowParentId: parent.id,
        workflowTask: leaderTask,
        workflowAgentName: sourceLeader.workflowAgentName || leaderName,
        billingEstimate: sourceLeader.billingEstimate || null,
        billingReservation: sourceLeader.billingReservation || null,
        estimateWindow: sourceLeader.estimateWindow || null,
        dispatch: {
          completionStatus: phase === 'final_summary' ? 'leader_final_summary_blocked' : 'leader_checkpoint_blocked',
          retryable: false,
          nextRetryAt: null
        },
        logs: [
          `repaired missing leader ${phase} child row (${repairedAt})`,
          phase === 'final_summary'
            ? 'leader final summary restored and blocked until specialist execution completes'
            : `leader checkpoint restored and blocked until layer-${workflowPatch.checkpointLayer || 1} completes before layer-${workflowPatch.requiredBeforeLayer || 2}`
        ],
        assignmentMode: sourceLeader.assignmentMode || parent.assignmentMode || 'multi'
      };
    };

    const repairedJobs = [];
    const checkpoints = Array.isArray(leaderSequence.checkpoints) ? leaderSequence.checkpoints : [];
    for (const checkpoint of checkpoints) {
      const id = String(checkpoint?.jobId || checkpoint?.job_id || '').trim();
      if (!id || existingIds.has(id)) continue;
      const afterLayer = Math.max(1, Number(checkpoint.afterLayer || checkpoint.checkpointLayer || leaderSequence.checkpointLayer || 1) || 1);
      const beforeLayer = Math.max(2, Number(checkpoint.beforeLayer || checkpoint.requiredBeforeLayer || leaderSequence.requiredBeforeLayer || (afterLayer + 1)) || (afterLayer + 1));
      const job = commonJob(id, 'checkpoint', {
        checkpointLayer: afterLayer,
        requiredBeforeLayer: beforeLayer,
        checkpointLabel: checkpoint.label || `${workflowLayerLabel(workflowPrimaryTask(parent), afterLayer)}_to_${workflowLayerLabel(workflowPrimaryTask(parent), beforeLayer)}`,
        ...(checkpoint.requiresUserApprovalBeforeAction ? { requiresUserApprovalBeforeAction: true } : {})
      });
      applyWorkflowHandoffPromptContextToJob(job);
      repairedJobs.push(job);
      existingIds.add(id);
    }

    const finalSummaryJobId = String(leaderSequence.finalSummaryJobId || '').trim();
    if (finalSummaryJobId && !existingIds.has(finalSummaryJobId)) {
      const job = commonJob(finalSummaryJobId, 'final_summary', {});
      applyWorkflowHandoffPromptContextToJob(job);
      repairedJobs.push(job);
      existingIds.add(finalSummaryJobId);
    }

    if (!repairedJobs.length) return { repaired: false, repairedIds: [] };
    for (const job of repairedJobs) {
      children.push(job);
      if (Array.isArray(state.jobs)) state.jobs.unshift(job);
    }
    parent.logs = [
      ...(parent.logs || []),
      `repaired missing leader sequence child rows: ${repairedJobs.map((job) => job.id.slice(0, 8)).join(', ')} (${repairedAt})`
    ];
    parent.failureCategory = parent.failureCategory === 'workflow_orchestration_incomplete' ? null : parent.failureCategory;
    parent.failureReason = /missing persisted leader checkpoint jobs/i.test(String(parent.failureReason || '')) ? null : parent.failureReason;
    parent.dispatch = {
      ...(parent.dispatch || {}),
      completionStatus: 'leader_sequence_repaired',
      retryable: true,
      nextRetryAt: null
    };
    if (String(parent.status || '').trim().toLowerCase() === 'blocked') parent.status = 'running';
    return { repaired: true, repairedIds: repairedJobs.map((job) => job.id) };
  }

  return {
    rebuildMissingLeaderSequenceChildJobs
  };
}
