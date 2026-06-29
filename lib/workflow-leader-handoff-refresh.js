export function createWorkflowLeaderHandoffRefresh(deps = {}) {
  const {
    activateWorkflowAdaptivePendingChildren,
    applyWorkflowHandoffPromptContextToJob,
    completedWorkflowLeader,
    isWorkflowLeaderTask,
    markWorkflowParentBlockedByLeaderQuality,
    markWorkflowParentWaitingForChildRetry,
    maxDispatchRetriesForJob,
    nowIso,
    sortWorkflowChildren,
    workflowApplyQualityReviewToLeader,
    workflowCheckpointStatus,
    workflowChildIsTerminal,
    workflowChildIsTerminalForProgress,
    workflowChildRetryPending,
    workflowDispatchLayer,
    workflowLayerLabel,
    workflowLayerQualityGate,
    workflowLeaderHandoff,
    workflowLeaderOutputQualityReview,
    workflowLeaderQualityGateFailed,
    workflowLeaderSequence,
    workflowPrimaryTask,
    workflowSequencePhaseForJob,
    workflowTaskName
  } = deps;

async function refreshWorkflowLeaderHandoffForJobId(storage, jobId) {
  if (!jobId) return { updated: 0 };
  const mutateWorkflow = typeof storage.mutateWorkflow === 'function'
    ? (mutator) => storage.mutateWorkflow(jobId, mutator)
    : (mutator) => storage.mutate(mutator);
  return mutateWorkflow(async (state) => {
    const parent = state.jobs.find((item) => item.id === jobId && item.jobKind === 'workflow');
    if (!parent) return { updated: 0 };
    const children = sortWorkflowChildren(
      parent,
      state.jobs.filter((item) => item.workflowParentId === parent.id)
    );
    let updated = 0;
    let leaderSequence = workflowLeaderSequence(parent);
    if (leaderSequence?.enabled) {
      const retryPendingLeader = children.find((child) => (
        isWorkflowLeaderTask(workflowTaskName(child))
        && workflowChildRetryPending(child)
      ));
      if (retryPendingLeader) {
        const phase = workflowSequencePhaseForJob(retryPendingLeader);
        markWorkflowParentWaitingForChildRetry(parent, children, {
          child: retryPendingLeader,
          completionStatus: phase === 'final_summary'
            ? 'leader_final_summary_retry_pending'
            : (phase === 'checkpoint' ? 'leader_checkpoint_retry_pending' : 'leader_retry_pending'),
          sequenceStatus: 'retry_pending'
        });
        return { updated: 1 };
      }
    }
    const checkpointJobId = String(leaderSequence?.checkpointJobId || '').trim();
    const checkpointJob = checkpointJobId
      ? children.find((child) => child.id === checkpointJobId) || null
      : null;
    const finalSummaryJobId = String(leaderSequence?.finalSummaryJobId || '').trim();
    const finalSummaryJob = finalSummaryJobId
      ? children.find((child) => child.id === finalSummaryJobId) || null
      : null;
    if (leaderSequence?.enabled && checkpointJob) {
      const checkpointStatus = String(checkpointJob.status || '').trim().toLowerCase();
      if (leaderSequence.status === 'pending' && checkpointStatus === 'blocked') {
        const checkpointLayer = Math.max(1, Number(leaderSequence.checkpointLayer || 1) || 1);
        const requiredBeforeLayer = Math.max(checkpointLayer + 1, Number(leaderSequence.requiredBeforeLayer || (checkpointLayer + 1)) || (checkpointLayer + 1));
        const priorLayerChildren = children
          .filter((child) => !isWorkflowLeaderTask(workflowTaskName(child)))
          .filter((child) => workflowDispatchLayer(parent, child) <= checkpointLayer);
        const priorLayerPending = priorLayerChildren.some((child) => !workflowChildIsTerminalForProgress(child));
        if (!priorLayerPending && priorLayerChildren.length) {
          const qualityGate = workflowLayerQualityGate(parent, priorLayerChildren, { layer: checkpointLayer });
          if (qualityGate.applicableCount && !qualityGate.passed) {
            const blockedAt = nowIso();
            checkpointJob.failureReason = `Leader quality gate blocked layer-${checkpointLayer} progression: ${qualityGate.summary}`;
            checkpointJob.failureCategory = 'leader_quality_gate_failed';
            checkpointJob.qualityGate = qualityGate;
            checkpointJob.dispatch = {
              ...(checkpointJob.dispatch || {}),
              completionStatus: 'leader_quality_gate_failed',
              retryable: false,
              nextRetryAt: null
            };
            checkpointJob.logs = [
              ...(checkpointJob.logs || []),
              `leader quality gate blocked after layer-${checkpointLayer} completion: ${qualityGate.summary} (${blockedAt})`
            ];
            markWorkflowParentBlockedByLeaderQuality(parent, checkpointJob.failureReason);
            parent.workflow = {
              ...(parent.workflow || {}),
              leaderSequence: {
                ...leaderSequence,
                lastQualityGate: {
                  scope: `layer_${checkpointLayer}`,
                  passed: false,
                  summary: qualityGate.summary,
                  checkedAt: blockedAt,
                  reviews: qualityGate.reviews
                }
              }
            };
            leaderSequence = workflowLeaderSequence(parent);
            updated += 1;
          } else {
            const sourceLeader = completedWorkflowLeader(parent, children.filter((child) => child.id !== checkpointJob.id));
            if (sourceLeader) {
              const handoff = workflowLeaderHandoff(parent, sourceLeader, children, requiredBeforeLayer);
              const input = checkpointJob.input && typeof checkpointJob.input === 'object' ? { ...checkpointJob.input } : {};
              const broker = input._broker && typeof input._broker === 'object' ? { ...input._broker } : {};
              const workflow = broker.workflow && typeof broker.workflow === 'object' ? { ...broker.workflow } : {};
              workflow.leaderHandoff = handoff;
              workflow.sequencePhase = 'checkpoint';
              workflow.checkpointLayer = checkpointLayer;
              workflow.requiredBeforeLayer = requiredBeforeLayer;
              if (!workflow.leaderActionProtocol && handoff?.actionProtocol) workflow.leaderActionProtocol = handoff.actionProtocol;
              broker.workflow = workflow;
              input._broker = broker;
              checkpointJob.input = input;
              applyWorkflowHandoffPromptContextToJob(checkpointJob);
              checkpointJob.status = 'queued';
              checkpointJob.startedAt = null;
              checkpointJob.completedAt = null;
              checkpointJob.failedAt = null;
              checkpointJob.timedOutAt = null;
              checkpointJob.failureReason = null;
              checkpointJob.failureCategory = null;
              checkpointJob.qualityGate = qualityGate.applicableCount ? qualityGate : null;
              checkpointJob.dispatch = {
                ...(checkpointJob.dispatch || {}),
                completionStatus: 'leader_checkpoint_queued',
                retryable: true,
                nextRetryAt: null,
                dispatchRequestedAt: null,
                maxRetries: maxDispatchRetriesForJob(checkpointJob)
              };
              checkpointJob.logs = [
                ...(checkpointJob.logs || []),
                `leader checkpoint queued after layer-${checkpointLayer} completion from ${sourceLeader.id.slice(0, 6)}`
              ];
              parent.workflow = {
                ...(parent.workflow || {}),
                leaderSequence: {
                  ...leaderSequence,
                  status: 'queued',
                  queuedAt: nowIso(),
                  sourceLeaderJobId: sourceLeader.id,
                  [`layer${checkpointLayer}Completed`]: priorLayerChildren.filter((child) => child.status === 'completed').length,
                  [`layer${checkpointLayer}Total`]: priorLayerChildren.length,
                  lastQualityGate: {
                    scope: `layer_${checkpointLayer}`,
                    passed: true,
                    summary: '',
                    checkedAt: nowIso(),
                    reviews: qualityGate.reviews
                  }
                }
              };
              leaderSequence = workflowLeaderSequence(parent);
              updated += 1;
            }
          }
        }
      }
      if (['queued', 'pending'].includes(String(leaderSequence?.status || '').trim().toLowerCase()) && checkpointStatus === 'completed') {
        const leaderQualityFailure = workflowLeaderQualityGateFailed(parent, checkpointJob);
        if (leaderQualityFailure) {
          const blockedAt = nowIso();
          checkpointJob.status = 'blocked';
          checkpointJob.failureReason = `Leader output quality gate failed: ${(leaderQualityFailure.issues || []).join('+')}`;
          checkpointJob.failureCategory = 'leader_quality_gate_failed';
          checkpointJob.logs = [
            ...(checkpointJob.logs || []),
            `leader output quality gate blocked checkpoint: ${(leaderQualityFailure.issues || []).join('+')} (${blockedAt})`
          ];
          markWorkflowParentBlockedByLeaderQuality(parent, checkpointJob.failureReason);
          parent.workflow = {
            ...(parent.workflow || {}),
            leaderSequence: {
              ...leaderSequence,
              lastQualityGate: {
                scope: 'leader_checkpoint',
                passed: false,
                summary: checkpointJob.failureReason,
                checkedAt: blockedAt,
                reviews: [leaderQualityFailure]
              }
            }
          };
          leaderSequence = workflowLeaderSequence(parent);
          updated += 1;
        } else {
          workflowApplyQualityReviewToLeader(checkpointJob, workflowLeaderOutputQualityReview(parent, checkpointJob));
          const releaseLayer = Math.max(2, Number(leaderSequence.requiredBeforeLayer || checkpointJob.input?._broker?.workflow?.requiredBeforeLayer || 2) || 2);
          const activated = activateWorkflowAdaptivePendingChildren(parent, children, releaseLayer, {
            checkpointJob,
            sourceLeader: checkpointJob,
            source: 'leader_checkpoint_completed'
          });
          parent.workflow = {
            ...(parent.workflow || {}),
            leaderSequence: {
              ...leaderSequence,
              status: 'completed',
              completedAt: checkpointJob.completedAt || nowIso(),
              ...(activated.length ? { activatedChildJobIds: activated, activatedLayer: releaseLayer } : {})
            }
          };
          leaderSequence = workflowLeaderSequence(parent);
          updated += 1;
        }
      }
      if (
        leaderSequence?.status !== 'failed'
        && leaderSequence?.status !== 'completed'
        && ['failed', 'timed_out'].includes(checkpointStatus)
      ) {
        parent.workflow = {
          ...(parent.workflow || {}),
          leaderSequence: {
            ...leaderSequence,
            status: 'failed',
            failedAt: checkpointJob.failedAt || checkpointJob.timedOutAt || nowIso()
          }
        };
        updated += 1;
      }
    }
    if (leaderSequence?.enabled && Array.isArray(leaderSequence.checkpoints) && leaderSequence.checkpoints.length) {
      const nextCheckpoints = [...leaderSequence.checkpoints];
      for (let index = 0; index < nextCheckpoints.length; index += 1) {
        const checkpoint = nextCheckpoints[index] || {};
        const checkpointJobId = String(checkpoint.jobId || '').trim();
        const checkpointJob = checkpointJobId ? children.find((child) => child.id === checkpointJobId) || null : null;
        if (!checkpointJob) continue;
        const checkpointStatus = workflowCheckpointStatus(checkpoint, checkpointJob);
        const afterLayer = Math.max(1, Number(checkpoint.afterLayer || checkpoint.checkpointLayer || 1) || 1);
        const beforeLayer = Math.max(2, Number(checkpoint.beforeLayer || checkpoint.requiredBeforeLayer || (afterLayer + 1)) || (afterLayer + 1));
        if (checkpointStatus === 'completed') {
          const leaderQualityFailure = workflowLeaderQualityGateFailed(parent, checkpointJob);
          if (leaderQualityFailure) {
            const blockedAt = nowIso();
            checkpointJob.status = 'blocked';
            checkpointJob.failureReason = `Leader output quality gate failed: ${(leaderQualityFailure.issues || []).join('+')}`;
            checkpointJob.failureCategory = 'leader_quality_gate_failed';
            checkpointJob.logs = [
              ...(checkpointJob.logs || []),
              `leader output quality gate blocked checkpoint: ${(leaderQualityFailure.issues || []).join('+')} (${blockedAt})`
            ];
            nextCheckpoints[index] = {
              ...checkpoint,
              status: 'pending',
              qualityGate: {
                passed: false,
                summary: checkpointJob.failureReason,
                checkedAt: blockedAt,
                reviews: [leaderQualityFailure]
              }
            };
            updated += 1;
            continue;
          }
          if (String(checkpoint.status || '').trim().toLowerCase() !== 'completed') {
            nextCheckpoints[index] = {
              ...checkpoint,
              status: 'completed',
              completedAt: checkpointJob.completedAt || nowIso()
            };
            updated += 1;
          }
          const beforeLayer = Math.max(2, Number(checkpoint.beforeLayer || checkpoint.requiredBeforeLayer || checkpointJob.input?._broker?.workflow?.requiredBeforeLayer || 2) || 2);
          const activated = activateWorkflowAdaptivePendingChildren(parent, children, beforeLayer, {
            checkpointJob,
            sourceLeader: checkpointJob,
            source: 'leader_checkpoint_completed'
          });
          if (activated.length) {
            const currentCheckpoint = nextCheckpoints[index] || checkpoint;
            nextCheckpoints[index] = {
              ...currentCheckpoint,
              activatedChildJobIds: [...new Set([...(Array.isArray(currentCheckpoint.activatedChildJobIds) ? currentCheckpoint.activatedChildJobIds : []), ...activated])],
              activatedLayer: beforeLayer,
              activatedAt: nowIso()
            };
            updated += 1;
          }
          continue;
        }
        if (checkpointStatus === 'failed') {
          if (String(checkpoint.status || '').trim().toLowerCase() !== 'failed') {
            nextCheckpoints[index] = {
              ...checkpoint,
              status: 'failed',
              failedAt: checkpointJob.failedAt || checkpointJob.timedOutAt || nowIso()
            };
            updated += 1;
          }
          continue;
        }
        if (checkpointStatus === 'queued') {
          const checkpointJobStatus = String(checkpointJob.status || '').trim().toLowerCase();
          const checkpointCompletion = String(checkpointJob.dispatch?.completionStatus || '').trim().toLowerCase();
          if (
            checkpointJobStatus === 'blocked'
            && checkpointCompletion === 'leader_checkpoint_blocked'
            && checkpointJob.failureCategory !== 'leader_quality_gate_failed'
          ) {
            const sourceLeader = completedWorkflowLeader(parent, children.filter((child) => child.id !== checkpointJob.id));
            if (sourceLeader) {
              const handoff = workflowLeaderHandoff(parent, sourceLeader, children, beforeLayer);
              const input = checkpointJob.input && typeof checkpointJob.input === 'object' ? { ...checkpointJob.input } : {};
              const broker = input._broker && typeof input._broker === 'object' ? { ...input._broker } : {};
              const workflow = broker.workflow && typeof broker.workflow === 'object' ? { ...broker.workflow } : {};
              workflow.leaderHandoff = workflow.leaderHandoff || handoff;
              workflow.sequencePhase = 'checkpoint';
              workflow.checkpointLayer = afterLayer;
              workflow.requiredBeforeLayer = beforeLayer;
              workflow.checkpointLabel = checkpoint.label || workflow.checkpointLabel || `${workflowLayerLabel(workflowPrimaryTask(parent), afterLayer)}_to_${workflowLayerLabel(workflowPrimaryTask(parent), beforeLayer)}`;
              if (checkpoint.requiresUserApprovalBeforeAction) workflow.requiresUserApprovalBeforeAction = true;
              if (!workflow.leaderActionProtocol && (workflow.leaderHandoff || handoff)?.actionProtocol) {
                workflow.leaderActionProtocol = (workflow.leaderHandoff || handoff).actionProtocol;
              }
              broker.workflow = workflow;
              input._broker = broker;
              checkpointJob.input = input;
              applyWorkflowHandoffPromptContextToJob(checkpointJob);
              checkpointJob.status = 'queued';
              checkpointJob.startedAt = null;
              checkpointJob.completedAt = null;
              checkpointJob.failedAt = null;
              checkpointJob.timedOutAt = null;
              checkpointJob.failureReason = null;
              checkpointJob.failureCategory = null;
              checkpointJob.dispatch = {
                ...(checkpointJob.dispatch || {}),
                completionStatus: 'leader_checkpoint_queued',
                retryable: true,
                nextRetryAt: null,
                dispatchRequestedAt: null,
                maxRetries: maxDispatchRetriesForJob(checkpointJob)
              };
              const repairLog = `leader checkpoint repaired to queued from persisted checkpoint state before layer-${beforeLayer} from ${sourceLeader.id.slice(0, 6)}`;
              checkpointJob.logs = (checkpointJob.logs || []).some((line) => String(line || '') === repairLog)
                ? checkpointJob.logs
                : [...(checkpointJob.logs || []), repairLog];
              updated += 1;
            }
          }
          continue;
        }
        const priorLayerChildren = children
          .filter((child) => !isWorkflowLeaderTask(workflowTaskName(child)))
          .filter((child) => workflowDispatchLayer(parent, child) <= afterLayer);
        const priorPending = priorLayerChildren.some((child) => !workflowChildIsTerminalForProgress(child));
        const earlierCheckpointPending = nextCheckpoints
          .slice(0, index)
          .some((priorCheckpoint) => {
            const priorJob = children.find((child) => child.id === String(priorCheckpoint?.jobId || '').trim()) || null;
            return workflowCheckpointStatus(priorCheckpoint, priorJob) !== 'completed';
          });
        if (priorPending || earlierCheckpointPending || !priorLayerChildren.length) continue;
        const qualityGate = workflowLayerQualityGate(parent, priorLayerChildren, { layer: afterLayer });
        if (qualityGate.applicableCount && !qualityGate.passed) {
          const blockedAt = nowIso();
          checkpointJob.failureReason = `Leader quality gate blocked layer-${afterLayer} progression: ${qualityGate.summary}`;
          checkpointJob.failureCategory = 'leader_quality_gate_failed';
          checkpointJob.qualityGate = qualityGate;
          checkpointJob.dispatch = {
            ...(checkpointJob.dispatch || {}),
            completionStatus: 'leader_quality_gate_failed',
            retryable: false,
            nextRetryAt: null
          };
          checkpointJob.logs = [
            ...(checkpointJob.logs || []),
            `leader quality gate blocked after layer-${afterLayer} completion: ${qualityGate.summary} (${blockedAt})`
          ];
          markWorkflowParentBlockedByLeaderQuality(parent, checkpointJob.failureReason);
          nextCheckpoints[index] = {
            ...checkpoint,
            status: 'pending',
            qualityGate: {
              passed: false,
              summary: qualityGate.summary,
              checkedAt: blockedAt,
              reviews: qualityGate.reviews
            }
          };
          updated += 1;
          continue;
        }
        const sourceLeader = completedWorkflowLeader(parent, children.filter((child) => child.id !== checkpointJob.id));
        if (!sourceLeader) continue;
        const handoff = workflowLeaderHandoff(parent, sourceLeader, children, beforeLayer);
        const input = checkpointJob.input && typeof checkpointJob.input === 'object' ? { ...checkpointJob.input } : {};
        const broker = input._broker && typeof input._broker === 'object' ? { ...input._broker } : {};
        const workflow = broker.workflow && typeof broker.workflow === 'object' ? { ...broker.workflow } : {};
        workflow.leaderHandoff = handoff;
        workflow.sequencePhase = 'checkpoint';
        workflow.checkpointLayer = afterLayer;
        workflow.requiredBeforeLayer = beforeLayer;
        workflow.checkpointLabel = checkpoint.label || `${workflowLayerLabel(workflowPrimaryTask(parent), afterLayer)}_to_${workflowLayerLabel(workflowPrimaryTask(parent), beforeLayer)}`;
        if (checkpoint.requiresUserApprovalBeforeAction) workflow.requiresUserApprovalBeforeAction = true;
        if (!workflow.leaderActionProtocol && handoff?.actionProtocol) workflow.leaderActionProtocol = handoff.actionProtocol;
        broker.workflow = workflow;
        input._broker = broker;
        checkpointJob.input = input;
        applyWorkflowHandoffPromptContextToJob(checkpointJob);
        checkpointJob.status = 'queued';
        checkpointJob.startedAt = null;
        checkpointJob.completedAt = null;
        checkpointJob.failedAt = null;
        checkpointJob.timedOutAt = null;
        checkpointJob.failureReason = null;
        checkpointJob.failureCategory = null;
        checkpointJob.qualityGate = qualityGate.applicableCount ? qualityGate : null;
        checkpointJob.dispatch = {
          ...(checkpointJob.dispatch || {}),
          completionStatus: 'leader_checkpoint_queued',
          retryable: true,
          nextRetryAt: null,
          dispatchRequestedAt: null,
          maxRetries: maxDispatchRetriesForJob(checkpointJob)
        };
        checkpointJob.logs = [
          ...(checkpointJob.logs || []),
          `leader checkpoint queued after layer-${afterLayer} completion before layer-${beforeLayer} from ${sourceLeader.id.slice(0, 6)}`
        ];
        nextCheckpoints[index] = {
          ...checkpoint,
          status: 'queued',
          queuedAt: nowIso(),
          sourceLeaderJobId: sourceLeader.id,
          afterLayerCompleted: priorLayerChildren.filter((child) => child.status === 'completed').length,
          afterLayerTotal: priorLayerChildren.length,
          qualityGate: {
            passed: true,
            summary: '',
            checkedAt: nowIso(),
            reviews: qualityGate.reviews
          }
        };
        updated += 1;
        break;
      }
      parent.workflow = {
        ...(parent.workflow || {}),
        leaderSequence: {
          ...(parent.workflow?.leaderSequence || {}),
          checkpoints: nextCheckpoints,
          status: nextCheckpoints.every((checkpoint) => String(checkpoint.status || '').trim().toLowerCase() === 'completed') ? 'completed' : 'pending'
        }
      };
      leaderSequence = workflowLeaderSequence(parent);
    }
    if (leaderSequence?.enabled && finalSummaryJob) {
      const finalSummaryStatus = String(finalSummaryJob.status || '').trim().toLowerCase();
      if (String(leaderSequence?.finalSummaryStatus || '').trim().toLowerCase() === 'queued' && finalSummaryStatus === 'blocked') {
        const finalSummaryCompletion = String(finalSummaryJob.dispatch?.completionStatus || '').trim().toLowerCase();
        if (finalSummaryCompletion === 'leader_final_summary_blocked' && finalSummaryJob.failureCategory !== 'leader_quality_gate_failed') {
          const specialistChildren = children.filter((child) => !isWorkflowLeaderTask(workflowTaskName(child)));
          const specialistPending = specialistChildren.some((child) => !workflowChildIsTerminalForProgress(child));
          const sourceLeader = !specialistPending
            ? completedWorkflowLeader(parent, children.filter((child) => child.id !== finalSummaryJob.id))
            : null;
          if (sourceLeader) {
            const qualityGate = workflowLayerQualityGate(parent, specialistChildren, { includeAllCompleted: true });
            const handoff = workflowLeaderHandoff(parent, sourceLeader, children, Number.MAX_SAFE_INTEGER);
            const input = finalSummaryJob.input && typeof finalSummaryJob.input === 'object' ? { ...finalSummaryJob.input } : {};
            const broker = input._broker && typeof input._broker === 'object' ? { ...input._broker } : {};
            const workflow = broker.workflow && typeof broker.workflow === 'object' ? { ...broker.workflow } : {};
            workflow.leaderHandoff = workflow.leaderHandoff || handoff;
            workflow.sequencePhase = 'final_summary';
            if (!workflow.leaderActionProtocol && (workflow.leaderHandoff || handoff)?.actionProtocol) {
              workflow.leaderActionProtocol = (workflow.leaderHandoff || handoff).actionProtocol;
            }
            broker.workflow = workflow;
            input._broker = broker;
            finalSummaryJob.input = input;
            applyWorkflowHandoffPromptContextToJob(finalSummaryJob);
            finalSummaryJob.status = 'queued';
            finalSummaryJob.startedAt = null;
            finalSummaryJob.completedAt = null;
            finalSummaryJob.failedAt = null;
            finalSummaryJob.timedOutAt = null;
            finalSummaryJob.failureReason = null;
            finalSummaryJob.failureCategory = null;
            finalSummaryJob.qualityGate = qualityGate.applicableCount ? qualityGate : null;
            finalSummaryJob.dispatch = {
              ...(finalSummaryJob.dispatch || {}),
              completionStatus: 'leader_final_summary_queued',
              retryable: true,
              nextRetryAt: null,
              dispatchRequestedAt: null,
              maxRetries: maxDispatchRetriesForJob(finalSummaryJob)
            };
            const repairLog = `leader final summary repaired to queued from persisted final summary state from ${sourceLeader.id.slice(0, 6)}`;
            finalSummaryJob.logs = (finalSummaryJob.logs || []).some((line) => String(line || '') === repairLog)
              ? finalSummaryJob.logs
              : [...(finalSummaryJob.logs || []), repairLog];
            parent.workflow = {
              ...(parent.workflow || {}),
              leaderSequence: {
                ...leaderSequence,
                finalSummaryStatus: 'queued',
                finalSummaryQueuedAt: leaderSequence.finalSummaryQueuedAt || nowIso(),
                finalSummarySourceLeaderJobId: leaderSequence.finalSummarySourceLeaderJobId || sourceLeader.id,
                specialistCompleted: specialistChildren.filter((child) => child.status === 'completed').length,
                specialistTotal: specialistChildren.length,
                lastQualityGate: {
                  scope: 'final_summary',
                  passed: qualityGate.passed !== false,
                  summary: qualityGate.summary || '',
                  checkedAt: nowIso(),
                  reviews: qualityGate.reviews
                }
              }
            };
            leaderSequence = workflowLeaderSequence(parent);
            updated += 1;
          }
        }
      }
      if (String(leaderSequence?.finalSummaryStatus || '').trim().toLowerCase() === 'pending' && finalSummaryStatus === 'blocked') {
        const specialistChildren = children.filter((child) => !isWorkflowLeaderTask(workflowTaskName(child)));
        const specialistPending = specialistChildren.some((child) => !workflowChildIsTerminalForProgress(child));
        if (!specialistPending) {
          const qualityGate = workflowLayerQualityGate(parent, specialistChildren, { includeAllCompleted: true });
          const sourceLeader = completedWorkflowLeader(parent, children.filter((child) => child.id !== finalSummaryJob.id));
          if (sourceLeader) {
            const handoff = workflowLeaderHandoff(parent, sourceLeader, children, Number.MAX_SAFE_INTEGER);
            const input = finalSummaryJob.input && typeof finalSummaryJob.input === 'object' ? { ...finalSummaryJob.input } : {};
            const broker = input._broker && typeof input._broker === 'object' ? { ...input._broker } : {};
            const workflow = broker.workflow && typeof broker.workflow === 'object' ? { ...broker.workflow } : {};
            workflow.leaderHandoff = handoff;
            workflow.sequencePhase = 'final_summary';
            if (!workflow.leaderActionProtocol && handoff?.actionProtocol) workflow.leaderActionProtocol = handoff.actionProtocol;
            broker.workflow = workflow;
            input._broker = broker;
            finalSummaryJob.input = input;
            applyWorkflowHandoffPromptContextToJob(finalSummaryJob);
            finalSummaryJob.status = 'queued';
            finalSummaryJob.startedAt = null;
            finalSummaryJob.completedAt = null;
            finalSummaryJob.failedAt = null;
            finalSummaryJob.timedOutAt = null;
            finalSummaryJob.failureReason = null;
            finalSummaryJob.failureCategory = null;
            finalSummaryJob.qualityGate = qualityGate.applicableCount ? qualityGate : null;
            finalSummaryJob.dispatch = {
              ...(finalSummaryJob.dispatch || {}),
              completionStatus: 'leader_final_summary_queued',
              retryable: true,
              nextRetryAt: null,
              dispatchRequestedAt: null,
              maxRetries: maxDispatchRetriesForJob(finalSummaryJob)
            };
            finalSummaryJob.logs = [
              ...(finalSummaryJob.logs || []),
              `leader final summary queued after specialist completion from ${sourceLeader.id.slice(0, 6)}`,
              qualityGate.applicableCount && !qualityGate.passed
                ? `leader final summary includes specialist quality warnings: ${qualityGate.summary}`
                : null
            ].filter(Boolean);
            parent.workflow = {
              ...(parent.workflow || {}),
              leaderSequence: {
                ...leaderSequence,
                finalSummaryStatus: 'queued',
                finalSummaryQueuedAt: nowIso(),
                finalSummarySourceLeaderJobId: sourceLeader.id,
                specialistCompleted: specialistChildren.filter((child) => child.status === 'completed').length,
                specialistTotal: specialistChildren.length,
                lastQualityGate: {
                  scope: 'final_summary',
                  passed: qualityGate.passed !== false,
                  summary: qualityGate.summary || '',
                  checkedAt: nowIso(),
                  reviews: qualityGate.reviews
                }
              }
            };
            leaderSequence = workflowLeaderSequence(parent);
            updated += 1;
          }
        }
      }
      if (String(leaderSequence?.finalSummaryStatus || '').trim().toLowerCase() === 'queued' && finalSummaryStatus === 'completed') {
        const leaderQualityFailure = workflowLeaderQualityGateFailed(parent, finalSummaryJob);
        if (leaderQualityFailure) {
          const blockedAt = nowIso();
          finalSummaryJob.status = 'blocked';
          finalSummaryJob.failureReason = `Leader output quality gate failed: ${(leaderQualityFailure.issues || []).join('+')}`;
          finalSummaryJob.failureCategory = 'leader_quality_gate_failed';
          finalSummaryJob.logs = [
            ...(finalSummaryJob.logs || []),
            `leader output quality gate blocked final summary: ${(leaderQualityFailure.issues || []).join('+')} (${blockedAt})`
          ];
          markWorkflowParentBlockedByLeaderQuality(parent, finalSummaryJob.failureReason);
          parent.workflow = {
            ...(parent.workflow || {}),
            leaderSequence: {
              ...leaderSequence,
              finalSummaryStatus: 'pending',
              lastQualityGate: {
                scope: 'leader_final_summary',
                passed: false,
                summary: finalSummaryJob.failureReason,
                checkedAt: blockedAt,
                reviews: [leaderQualityFailure]
              }
            }
          };
          leaderSequence = workflowLeaderSequence(parent);
          updated += 1;
        } else {
          workflowApplyQualityReviewToLeader(finalSummaryJob, workflowLeaderOutputQualityReview(parent, finalSummaryJob));
          parent.workflow = {
            ...(parent.workflow || {}),
            leaderSequence: {
              ...leaderSequence,
              finalSummaryStatus: 'completed',
              finalSummaryCompletedAt: finalSummaryJob.completedAt || nowIso()
            }
          };
          leaderSequence = workflowLeaderSequence(parent);
          updated += 1;
        }
      }
      if (
        !['failed', 'completed'].includes(String(leaderSequence?.finalSummaryStatus || '').trim().toLowerCase())
        && ['failed', 'timed_out'].includes(finalSummaryStatus)
      ) {
        parent.workflow = {
          ...(parent.workflow || {}),
          leaderSequence: {
            ...leaderSequence,
            finalSummaryStatus: 'failed',
            finalSummaryFailedAt: finalSummaryJob.failedAt || finalSummaryJob.timedOutAt || nowIso()
          }
        };
        updated += 1;
      }
    }
    for (const leaderChild of children.filter((child) => child.status === 'completed' && isWorkflowLeaderTask(workflowTaskName(child)))) {
      const leaderQualityReview = workflowLeaderOutputQualityReview(parent, leaderChild);
      if (!leaderQualityReview?.applicable) continue;
      if (leaderQualityReview.passed !== false) {
        const needsLeaderGateRefresh = leaderChild.qualityGate?.type !== 'leader_output'
          || leaderChild.qualityGate?.passed !== true
          || Number(leaderChild.qualityGate?.priorRunCount || 0) !== Number(leaderQualityReview.priorRunCount || 0)
          || !leaderChild.qualityGate?.checkedAt;
        if (needsLeaderGateRefresh) {
          workflowApplyQualityReviewToLeader(leaderChild, leaderQualityReview);
          updated += 1;
        }
        continue;
      }
      if (leaderQualityReview) {
        workflowApplyQualityReviewToLeader(leaderChild, leaderQualityReview);
        const blockedAt = nowIso();
        leaderChild.status = 'blocked';
        leaderChild.failureReason = `Leader output quality gate failed: ${(leaderQualityReview.issues || []).join('+')}`;
        leaderChild.failureCategory = 'leader_quality_gate_failed';
        leaderChild.logs = [
          ...(leaderChild.logs || []),
          `leader output quality gate blocked completed leader run: ${(leaderQualityReview.issues || []).join('+')} (${blockedAt})`
        ];
        parent.workflow = {
          ...(parent.workflow || {}),
          leaderSequence: {
            ...(parent.workflow?.leaderSequence || {}),
            lastQualityGate: {
              scope: workflowSequencePhaseForJob(leaderChild) === 'final_summary' ? 'leader_final_summary' : 'leader_checkpoint',
              passed: false,
              summary: leaderChild.failureReason,
              checkedAt: blockedAt,
              reviews: [leaderQualityReview]
            }
          }
        };
        updated += 1;
      }
    }
    const leader = completedWorkflowLeader(parent, children);
    if (!leader) return { updated };
    for (const child of children) {
      if (isWorkflowLeaderTask(workflowTaskName(child)) || workflowChildIsTerminal(child)) continue;
      const targetLayer = workflowDispatchLayer(parent, child);
      const handoff = workflowLeaderHandoff(parent, leader, children, targetLayer);
      if (!handoff) continue;
      const input = child.input && typeof child.input === 'object' ? { ...child.input } : {};
      const broker = input._broker && typeof input._broker === 'object' ? { ...input._broker } : {};
      const workflow = broker.workflow && typeof broker.workflow === 'object' ? { ...broker.workflow } : {};
      const prior = workflow.leaderHandoff && typeof workflow.leaderHandoff === 'object'
        ? workflow.leaderHandoff
        : null;
      const priorSerialized = prior ? JSON.stringify(prior) : '';
      const nextSerialized = JSON.stringify(handoff);
      if (priorSerialized === nextSerialized) {
        const promptUpdated = applyWorkflowHandoffPromptContextToJob(child);
        if (promptUpdated) {
          child.logs = [
            ...(child.logs || []),
            `leader handoff additional_prompt attached from ${handoff.leaderTaskType}/${String(handoff.leaderJobId || '').slice(0, 6)}`
          ];
          updated += 1;
        }
        continue;
      }
      workflow.leaderHandoff = handoff;
      if (!workflow.leaderActionProtocol && handoff?.actionProtocol) workflow.leaderActionProtocol = handoff.actionProtocol;
      broker.workflow = workflow;
      input._broker = broker;
      child.input = input;
      const promptUpdated = applyWorkflowHandoffPromptContextToJob(child);
      child.logs = [
        ...(child.logs || []),
        `leader handoff refreshed from ${handoff.leaderTaskType}/${String(handoff.leaderJobId || '').slice(0, 6)}${promptUpdated ? ' and attached as additional_prompt' : ''}`
      ];
      updated += 1;
    }
    return { updated };
  });
}

  return {
    refreshWorkflowLeaderHandoffForJobId
  };
}
