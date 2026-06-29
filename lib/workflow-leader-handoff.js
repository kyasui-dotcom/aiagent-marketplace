export function createWorkflowLeaderHandoff(deps = {}) {
  const {
    isWorkflowLeaderTask,
    leaderControlContractForTask,
    leaderProtocolExtras,
    sortWorkflowChildren,
    workflowCanonicalBriefFromJob,
    workflowExecutionProgram,
    workflowHandoffPriorDeliverables,
    workflowLayerLabel,
    workflowMinimumPriorUseForPhase,
    workflowPrimaryTask,
    workflowPriorCompletedRuns,
    workflowPriorUnavailableRuns,
    workflowSlimPriorRunForHandoff,
    workflowStructuredHandoffDigestFromRun,
    workflowTaskName
  } = deps;

  function completedWorkflowLeader(parent = {}, children = []) {
    const leaders = sortWorkflowChildren(parent, children)
      .filter((child) => child.status === 'completed' && isWorkflowLeaderTask(workflowTaskName(child)));
    if (!leaders.length) return null;
    return leaders.sort((left, right) => {
      const leftCompleted = String(left.completedAt || left.updatedAt || left.createdAt || '');
      const rightCompleted = String(right.completedAt || right.updatedAt || right.createdAt || '');
      const completedCompare = rightCompleted.localeCompare(leftCompleted);
      if (completedCompare) return completedCompare;
      return String(right.createdAt || '').localeCompare(String(left.createdAt || ''));
    })[0] || null;
  }

  function workflowLeaderActionProtocol(parent = {}) {
    const primary = workflowPrimaryTask(parent);
    if (!isWorkflowLeaderTask(primary)) return null;
    const leaderControlContract = leaderControlContractForTask(primary);
    const commonRules = [
      'Evaluate completed research/analysis outputs before choosing execution.',
      'Separate observed evidence from assumptions and strategic bets.',
      'At each checkpoint, release only the next useful specialist layer; defer or stop lanes that the evidence no longer supports.',
      'Decide one primary action lane first unless independent lanes are explicitly justified.',
      'Every action decision must define owner, objective, artifact, trigger/timing, metric, and stop rule.',
      'Any write-capable connector action requires explicit leader or human approval.'
    ];
    const primaryExtras = leaderProtocolExtras(primary);
    return {
      version: 'leader-action-protocol/v1',
      primaryTask: primary,
      leaderControlContract,
      requiredActionFields: [
        'owner',
        'objective',
        'artifact',
        'trigger_or_timing',
        'metric',
        'stop_rule',
        'approval_owner'
      ],
      sequencing: {
        researchBeforeAction: true,
        allowParallelActionLanesOnlyWhenIndependent: true
      },
      rules: [...commonRules, ...primaryExtras],
      phaseGuidance: {
        initial: 'Establish evidence questions and decision criteria before assigning action-layer specialists.',
        checkpoint: 'After each completed layer, summarize the evidence received, choose/revise the next executable lane, and release only the next useful layer.',
        final_summary: 'After specialist execution, synthesize the evidence, final recommendation, open risks, immediate next actions, and exact downloadable/approval artifacts into one delivery.'
      }
    };
  }

  function workflowLeaderHandoff(parent = {}, leader = null, children = [], targetLayer = 1) {
    if (!leader) return null;
    const output = leader.output && typeof leader.output === 'object' ? leader.output : {};
    const report = output.report && typeof output.report === 'object' ? output.report : {};
    const file = Array.isArray(output.files) ? output.files.find((item) => String(item?.content || '').trim()) : null;
    const fullPriorRuns = workflowPriorCompletedRuns(parent, children, targetLayer);
    const priorRuns = fullPriorRuns.map(workflowSlimPriorRunForHandoff);
    const unavailablePriorRuns = workflowPriorUnavailableRuns(parent, children, targetLayer);
    const priorDeliverables = workflowHandoffPriorDeliverables(priorRuns);
    const structuredHandoffDigest = priorRuns
      .map((run) => run.structuredDigest || workflowStructuredHandoffDigestFromRun(run))
      .filter(Boolean)
      .slice(0, 10);
    const actionProtocol = workflowLeaderActionProtocol(parent);
    const targetPhase = workflowLayerLabel(workflowPrimaryTask(parent), targetLayer);
    const executionProgram = workflowExecutionProgram(parent, targetLayer, priorRuns);
    const canonicalBrief = workflowCanonicalBriefFromJob(parent, parent.workflow || {}, {
      objective: parent.workflow?.objective || parent.originalPrompt || parent.prompt || ''
    });
    return {
      parentJobId: parent.id || leader.workflowParentId || null,
      objective: String(parent.workflow?.objective || parent.originalPrompt || parent.prompt || '').slice(0, 1200),
      canonicalBrief,
      handoffOwner: 'leader',
      handoffActor: {
        type: 'leader',
        jobId: leader.id,
        taskType: workflowTaskName(leader),
        agentId: leader.assignedAgentId || null,
        agentName: leader.workflowAgentName || null
      },
      orchestrationRole: 'persist_leader_owned_handoff_and_enforce_sequence_quality_gates',
      leaderJobId: leader.id,
      leaderTaskType: workflowTaskName(leader),
      leaderAgentId: leader.assignedAgentId || null,
      leaderAgentName: leader.workflowAgentName || null,
      completedAt: leader.completedAt || null,
      summary: String(output.summary || report.summary || '').slice(0, 2000),
      bullets: Array.isArray(report.bullets)
        ? report.bullets.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 8)
        : [],
      nextAction: String(report.nextAction || report.next_action || '').slice(0, 1200),
      briefFile: file
        ? {
          name: String(file.name || '').slice(0, 160),
          content_available: Boolean(String(file.content || '').trim())
        }
        : null,
      priorRuns,
      unavailablePriorRuns,
      priorDeliverables,
      structuredHandoffDigest,
      analysisContext: priorRuns.length
        ? {
          instruction: 'The leader received these completed prior-layer outputs and is handing them to this specialist. Use them before doing your specialist task. Do not ignore or duplicate them.',
          completedRunCount: priorRuns.length,
          minimumDistinctPriorItems: workflowMinimumPriorUseForPhase(targetPhase, priorRuns.length),
          targetPhase
        }
        : null,
      handoffContract: {
        version: 'workflow-handoff/v2',
        owner: 'leader',
        orchestrationRole: 'sequence_and_quality_gate_only',
        targetLayer,
        targetPhase,
        priorDeliverableCount: priorDeliverables.length,
        unavailablePriorRunCount: unavailablePriorRuns.length,
        minimumDistinctPriorItems: workflowMinimumPriorUseForPhase(targetPhase, priorRuns.length),
        requiredBehavior: 'Downstream agents must treat this as the leader-owned handoff, use the structured digest, source URLs, and execution program in their output, or return BLOCKED with the missing handoff reason.'
      },
      executionProgram,
      actionProtocol,
      leaderControlContract: actionProtocol?.leaderControlContract || leaderControlContractForTask(workflowPrimaryTask(parent))
    };
  }

  return {
    completedWorkflowLeader,
    workflowLeaderActionProtocol,
    workflowLeaderHandoff
  };
}
