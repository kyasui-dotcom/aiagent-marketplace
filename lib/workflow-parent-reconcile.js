import { createWorkflowLeaderHandoffRefresh } from './workflow-leader-handoff-refresh.js';

export function createWorkflowParentReconcile(deps = {}) {
  const {
    activateWorkflowAdaptivePendingChildren,
    applyWorkflowHandoffPromptContextToJob,
    authorityRequestFromReport,
    authorityRequestRequiresApproval,
    blockWorkflowPendingChildren,
    buildAgentTeamDeliveryOutput,
    canRetryJob,
    clearJobAuthorityRequest,
    cloneJob,
    completeWorkflowSaasHandoffOnlyChildren,
    completedWorkflowLeader,
    isWorkflowLeaderTask,
    markAgentCompletionFailedFreeInState,
    markJobBlockedForAuthority,
    markWorkflowParentBlockedByLeaderQuality,
    markWorkflowParentWaitingForChildRetry,
    maxDispatchRetriesForJob,
    nowIso,
    rebuildMissingLeaderSequenceChildJobs,
    sortWorkflowChildren,
    syncJobAuthorityRequest,
    workflowAgentRunChildren,
    workflowApplyQualityReviewToLeader,
    workflowBlockedParentStatus,
    workflowCheckpointStatus,
    workflowChildIsAdaptivePending,
    workflowChildIsApprovalBlockedTerminal,
    workflowChildIsBlockingProgress,
    workflowChildIsInternalLeaderSequenceRun,
    workflowChildIsSaasHandoffOnly,
    workflowChildIsSequentialUserActionDeferred,
    workflowChildIsTerminal,
    workflowChildIsTerminalForProgress,
    workflowChildRetryPending,
    workflowChildSnapshot,
    workflowConcreteArtifactFailureReason,
    workflowDispatchLayer,
    workflowLayerLabel,
    workflowLayerQualityGate,
    workflowLeaderChildIsApprovalBlockedTerminal,
    workflowLeaderHandoff,
    workflowLeaderOutputQualityReview,
    workflowLeaderQualityGateFailed,
    workflowLeaderSequence,
    workflowParentAuthorityRequest,
    workflowParentRequestedExternalExecution,
    workflowPrimaryTask,
    workflowRestartRequiredReason,
    workflowSequencePhaseForJob,
    workflowStatusCounts,
    workflowTaskName,
    workflowVisibleAgentRunChildren
  } = deps;

  const { refreshWorkflowLeaderHandoffForJobId } = createWorkflowLeaderHandoffRefresh(deps);



async function reconcileWorkflowParent(storage, parentJobId) {
  if (!parentJobId) return null;
  const mutateWorkflow = typeof storage.mutateWorkflow === 'function'
    ? (mutator) => storage.mutateWorkflow(parentJobId, mutator)
    : (mutator) => storage.mutate(mutator);
  return mutateWorkflow(async (state) => {
    const parent = state.jobs.find((item) => item.id === parentJobId);
    if (!parent || parent.jobKind !== 'workflow') return null;
    const children = sortWorkflowChildren(
      parent,
      state.jobs.filter((item) => item.workflowParentId === parentJobId)
    );
    const saasHandoffCompleted = completeWorkflowSaasHandoffOnlyChildren(parent, children);
    if (saasHandoffCompleted) {
      parent.logs = [
        ...(parent.logs || []),
        `completed ${saasHandoffCompleted} SaaS handoff-only workflow step(s)`
      ];
    }
    const storedPlannedChildRunCount = Number(parent.workflow?.plannedChildRunCount || 0) || 0;
    const plannedRunCount = Math.max(
      storedPlannedChildRunCount,
      Array.isArray(parent.workflow?.childRuns) ? parent.workflow.childRuns.length : 0
    );
    // The parent can retain stale planned childRuns from an earlier planning pass.
    // Only persisted child job rows can actually run, so completion must not wait
    // for phantom planned runs that were never created.
    let expectedTotal = children.length;
    const terminal = new Set(['completed', 'failed', 'timed_out']);
    const active = new Set(['queued', 'claimed', 'running', 'dispatched']);
    const initialLeaderSequence = workflowLeaderSequence(parent);
    let leaderRepair = null;
    if (initialLeaderSequence?.enabled) {
      leaderRepair = rebuildMissingLeaderSequenceChildJobs(parent, children, state, initialLeaderSequence);
      if (leaderRepair?.repaired) {
        parent.workflow = {
          ...(parent.workflow || {}),
          leaderSequence: {
            ...initialLeaderSequence,
            repairedMissingChildJobIds: leaderRepair.repairedIds,
            repairedAt: nowIso()
          }
        };
      }
    }
    let concreteArtifactFailures = 0;
    for (const child of children) {
      if (String(child.status || '').trim().toLowerCase() !== 'completed') continue;
      const artifactFailure = workflowConcreteArtifactFailureReason(child);
      if (!artifactFailure) continue;
      markAgentCompletionFailedFreeInState(state, child, artifactFailure, {}, { failedAt: nowIso() });
      concreteArtifactFailures += 1;
    }
    expectedTotal = children.length;
    const childRuns = workflowChildSnapshot(children);
    const agentChildren = workflowAgentRunChildren(children);
    const visibleAgentChildren = workflowVisibleAgentRunChildren(children);
    const internalChildren = children.filter((child) => workflowChildIsInternalLeaderSequenceRun(child));
    const completed = children.filter((item) => item.status === 'completed');
    const failed = children.filter((item) => item.status === 'failed' || item.status === 'timed_out');
    const queued = children.filter((item) => item.status === 'queued');
    const running = children.filter((item) => item.status === 'claimed' || item.status === 'running' || item.status === 'dispatched');
    const blocked = children.filter((item) => item.status === 'blocked');
    const blockingChildren = children.filter(workflowChildIsBlockingProgress);
    const adaptivePendingChildren = blocked.filter(workflowChildIsAdaptivePending);
    parent.workflow = {
      ...(parent.workflow || {}),
      childJobIds: children.map((item) => item.id),
      childRuns,
      plannedChildRunCount: expectedTotal,
      plannedAgentRunCount: visibleAgentChildren.length,
      plannedCandidateAgentRunCount: agentChildren.length,
      adaptiveCandidateRunCount: agentChildren.length - visibleAgentChildren.length,
      internalCheckpointRunCount: internalChildren.length,
      agentStatusCounts: workflowStatusCounts(visibleAgentChildren),
      internalStatusCounts: workflowStatusCounts(internalChildren),
      statusCounts: workflowStatusCounts(children, plannedRunCount),
      ...(concreteArtifactFailures ? {
        concreteArtifactFailureAt: nowIso(),
        concreteArtifactFailureCount: concreteArtifactFailures
      } : {})
    };
    const restartRequiredFailedChild = failed.find((item) => (
      String(item?.failureCategory || '').trim().toLowerCase() === 'workflow_restart_required'
      || item?.dispatch?.restartRequired === true
    ));
    if (restartRequiredFailedChild) {
      blockWorkflowPendingChildren(
        children.filter((item) => item.id !== restartRequiredFailedChild.id && !terminal.has(String(item.status || '').trim().toLowerCase())),
        'blocked_after_restart_required_failure'
      );
      const refreshedChildRuns = workflowChildSnapshot(children);
      parent.workflow = {
        ...(parent.workflow || {}),
        childRuns: refreshedChildRuns,
        statusCounts: {
          total: expectedTotal,
          planned: plannedRunCount,
          completed: children.filter((item) => item.status === 'completed').length,
          failed: children.filter((item) => ['failed', 'timed_out'].includes(String(item.status || '').toLowerCase())).length,
          blocked: children.filter((item) => item.status === 'blocked').length,
          queued: children.filter((item) => item.status === 'queued').length,
          running: children.filter((item) => ['claimed', 'running', 'dispatched'].includes(String(item.status || '').toLowerCase())).length
        },
        restartRequired: {
          childJobId: restartRequiredFailedChild.id,
          task: workflowTaskName(restartRequiredFailedChild) || restartRequiredFailedChild.taskType || '',
          reason: restartRequiredFailedChild.failureReason || '',
          at: nowIso()
        }
      };
      parent.status = 'failed';
      parent.completedAt = null;
      parent.failedAt = restartRequiredFailedChild.failedAt || restartRequiredFailedChild.timedOutAt || nowIso();
      parent.failureCategory = 'workflow_restart_required';
      parent.failureReason = workflowRestartRequiredReason(restartRequiredFailedChild, restartRequiredFailedChild.failureReason);
      parent.dispatch = {
        ...(parent.dispatch || {}),
        completionStatus: 'workflow_restart_required',
        retryable: false,
        nextRetryAt: null,
        restartRequired: true
      };
      parent.output = buildAgentTeamDeliveryOutput(parent, children);
      syncJobAuthorityRequest(parent);
      return cloneJob(parent);
    }
    const leaderSequence = workflowLeaderSequence(parent);
    if (leaderSequence?.enabled) {
      const checkpointJobId = String(leaderSequence.checkpointJobId || '').trim();
      const checkpointJob = checkpointJobId ? children.find((item) => item.id === checkpointJobId) || null : null;
      const checkpointStatus = String(checkpointJob?.status || '').trim().toLowerCase();
      const finalSummaryJobId = String(leaderSequence.finalSummaryJobId || '').trim();
      const finalSummaryJob = finalSummaryJobId ? children.find((item) => item.id === finalSummaryJobId) || null : null;
      const finalSummaryStatus = String(finalSummaryJob?.status || '').trim().toLowerCase();
      const missingLeaderChildIds = [
        ...(Array.isArray(leaderSequence.checkpoints) ? leaderSequence.checkpoints : [])
          .map((checkpoint) => String(checkpoint?.jobId || checkpoint?.job_id || '').trim()),
        finalSummaryJobId
      ]
        .filter(Boolean)
        .filter((id, index, list) => list.indexOf(id) === index)
        .filter((id) => !children.some((item) => item.id === id));
      if (missingLeaderChildIds.length) {
        parent.workflow = {
          ...(parent.workflow || {}),
          leaderSequence: {
            ...leaderSequence,
            status: 'blocked',
            missingChildJobIds: missingLeaderChildIds,
            blockedAt: nowIso()
          }
        };
        parent.status = 'blocked';
        parent.completedAt = null;
        parent.failedAt = null;
        parent.failureCategory = 'workflow_orchestration_incomplete';
        parent.failureReason = `Workflow is missing persisted leader checkpoint jobs: ${missingLeaderChildIds.map((id) => id.slice(0, 8)).join(', ')}. Partial delivery is available, but downstream execution was not released.`;
        parent.dispatch = {
          ...(parent.dispatch || {}),
          completionStatus: 'workflow_orchestration_incomplete',
          retryable: false,
          nextRetryAt: null,
          completedAt: null
        };
        parent.output = buildAgentTeamDeliveryOutput(parent, children);
        syncJobAuthorityRequest(parent);
        return cloneJob(parent);
      }
      const leaderRuns = children.filter((item) => isWorkflowLeaderTask(workflowTaskName(item)));
      const anyLeaderCompleted = leaderRuns.some((item) => item.status === 'completed');
      const anyLeaderActive = leaderRuns.some((item) => ['queued', 'claimed', 'running', 'dispatched'].includes(String(item.status || '').toLowerCase()));
      const leaderRetryPending = leaderRuns.find(workflowChildRetryPending);
      if (!anyLeaderCompleted && !anyLeaderActive && leaderRetryPending) {
        return markWorkflowParentWaitingForChildRetry(parent, children, {
          child: leaderRetryPending,
          completionStatus: 'leader_retry_pending',
          sequenceStatus: 'retry_pending'
        });
      }
      if (!anyLeaderCompleted && !anyLeaderActive && leaderRuns.some((item) => ['failed', 'timed_out'].includes(String(item.status || '').toLowerCase()))) {
        blockWorkflowPendingChildren(children.filter((item) => !isWorkflowLeaderTask(workflowTaskName(item))), 'blocked_after_leader_failure');
        const refreshedChildRuns = workflowChildSnapshot(children);
        parent.workflow = {
          ...(parent.workflow || {}),
          childRuns: refreshedChildRuns,
          statusCounts: {
            total: expectedTotal,
            planned: plannedRunCount,
            completed: children.filter((item) => item.status === 'completed').length,
            failed: children.filter((item) => ['failed', 'timed_out'].includes(String(item.status || '').toLowerCase())).length,
            blocked: children.filter((item) => item.status === 'blocked').length,
            queued: children.filter((item) => item.status === 'queued').length,
            running: children.filter((item) => ['claimed', 'running', 'dispatched'].includes(String(item.status || '').toLowerCase())).length
          },
          leaderSequence: {
            ...leaderSequence,
            status: 'failed',
            failedAt: nowIso()
          }
        };
        parent.status = 'failed';
        parent.completedAt = null;
        parent.failedAt = nowIso();
        parent.failureReason = 'Leader run failed before research checkpoint';
        parent.output = buildAgentTeamDeliveryOutput(parent, children);
        syncJobAuthorityRequest(parent);
        return cloneJob(parent);
      }
      if (['failed', 'timed_out'].includes(finalSummaryStatus)) {
        if (workflowChildRetryPending(finalSummaryJob)) {
          return markWorkflowParentWaitingForChildRetry(parent, children, {
            child: finalSummaryJob,
            completionStatus: 'leader_final_summary_retry_pending',
            sequenceStatus: 'retry_pending'
          });
        }
        parent.workflow = {
          ...(parent.workflow || {}),
          leaderSequence: {
            ...leaderSequence,
            finalSummaryStatus: 'failed',
            finalSummaryFailedAt: finalSummaryJob?.failedAt || finalSummaryJob?.timedOutAt || nowIso()
          }
        };
        parent.status = 'failed';
        parent.completedAt = null;
        parent.failedAt = finalSummaryJob?.failedAt || finalSummaryJob?.timedOutAt || nowIso();
        parent.failureReason = 'Leader final summary failed after specialist execution';
        parent.output = buildAgentTeamDeliveryOutput(parent, children);
        syncJobAuthorityRequest(parent);
        return cloneJob(parent);
      }
      if (leaderSequence.status !== 'completed' && checkpointStatus === 'completed') {
        parent.workflow = {
          ...(parent.workflow || {}),
          leaderSequence: {
            ...leaderSequence,
            status: 'completed',
            completedAt: checkpointJob.completedAt || nowIso()
          }
        };
      }
      if (['failed', 'timed_out'].includes(checkpointStatus)) {
        if (workflowChildRetryPending(checkpointJob)) {
          return markWorkflowParentWaitingForChildRetry(parent, children, {
            child: checkpointJob,
            completionStatus: 'leader_checkpoint_retry_pending',
            sequenceStatus: 'retry_pending'
          });
        }
        blockWorkflowPendingChildren(children.filter((item) => item.id !== checkpointJobId), 'blocked_after_leader_checkpoint_failure');
        const refreshedChildRuns = workflowChildSnapshot(children);
        parent.workflow = {
          ...(parent.workflow || {}),
          childRuns: refreshedChildRuns,
          statusCounts: {
            total: expectedTotal,
            planned: plannedRunCount,
            completed: children.filter((item) => item.status === 'completed').length,
            failed: children.filter((item) => ['failed', 'timed_out'].includes(String(item.status || '').toLowerCase())).length,
            blocked: children.filter((item) => item.status === 'blocked').length,
            queued: children.filter((item) => item.status === 'queued').length,
            running: children.filter((item) => ['claimed', 'running', 'dispatched'].includes(String(item.status || '').toLowerCase())).length
          },
          leaderSequence: {
            ...leaderSequence,
            status: 'failed',
            failedAt: checkpointJob?.failedAt || checkpointJob?.timedOutAt || nowIso()
          }
        };
        parent.status = 'failed';
        parent.completedAt = null;
        parent.failedAt = checkpointJob?.failedAt || checkpointJob?.timedOutAt || nowIso();
        parent.failureReason = 'Leader checkpoint failed before action execution';
        parent.output = buildAgentTeamDeliveryOutput(parent, children);
        syncJobAuthorityRequest(parent);
        return cloneJob(parent);
      }
      const leaderQualityGateBlock = children
        .filter((item) => isWorkflowLeaderTask(workflowTaskName(item)))
        .find((item) => item && item.status === 'blocked' && item.failureCategory === 'leader_quality_gate_failed');
      if (leaderQualityGateBlock) {
        parent.output = buildAgentTeamDeliveryOutput(parent, children);
        clearJobAuthorityRequest(parent);
        parent.status = 'blocked';
        parent.completedAt = null;
        parent.failedAt = null;
        parent.failureCategory = 'leader_quality_gate_failed';
        parent.failureReason = leaderQualityGateBlock.failureReason || 'Leader quality gate blocked workflow progression';
        parent.dispatch = {
          ...(parent.dispatch || {}),
          completionStatus: 'leader_quality_gate_failed',
          retryable: false,
          nextRetryAt: null,
          completedAt: null
        };
        return cloneJob(parent);
      }
      const unrecoverableFailedChild = failed.find((item) => (
        !canRetryJob(item)
        && !isWorkflowLeaderTask(workflowTaskName(item))
        && workflowDispatchLayer(parent, item) <= 2
      ));
      const approvalBlockedChild = children.some(workflowChildIsApprovalBlockedTerminal);
      if (unrecoverableFailedChild && !approvalBlockedChild && !running.length && !queued.length) {
        blockWorkflowPendingChildren(children.filter((item) => item.status === 'blocked' || item.status === 'queued'), 'blocked_after_prior_layer_failure');
        const refreshedChildRuns = workflowChildSnapshot(children);
        parent.workflow = {
          ...(parent.workflow || {}),
          childRuns: refreshedChildRuns,
          statusCounts: {
            total: expectedTotal,
            planned: plannedRunCount,
            completed: children.filter((item) => item.status === 'completed').length,
            failed: children.filter((item) => ['failed', 'timed_out'].includes(String(item.status || '').toLowerCase())).length,
            blocked: children.filter((item) => item.status === 'blocked').length,
            queued: children.filter((item) => item.status === 'queued').length,
            running: children.filter((item) => ['claimed', 'running', 'dispatched'].includes(String(item.status || '').toLowerCase())).length
          },
          leaderSequence: {
            ...leaderSequence,
            status: 'failed',
            failedAt: unrecoverableFailedChild.failedAt || unrecoverableFailedChild.timedOutAt || nowIso()
          }
        };
        parent.status = 'failed';
        parent.completedAt = null;
        parent.failedAt = unrecoverableFailedChild.failedAt || unrecoverableFailedChild.timedOutAt || nowIso();
        parent.failureCategory = unrecoverableFailedChild.failureCategory || 'workflow_child_failed';
        const failedTaskLabel = workflowTaskName(unrecoverableFailedChild) || unrecoverableFailedChild.taskType || 'workflow child';
        parent.failureReason = `${failedTaskLabel} failed before the workflow could reach final summary: ${unrecoverableFailedChild.failureReason || 'No detailed failure reason was recorded.'}`;
        parent.output = buildAgentTeamDeliveryOutput(parent, children);
        syncJobAuthorityRequest(parent);
        return cloneJob(parent);
      }
      if (finalSummaryJobId && finalSummaryStatus !== 'completed') {
        parent.output = buildAgentTeamDeliveryOutput(parent, children);
        syncJobAuthorityRequest(parent);
        if (workflowLeaderChildIsApprovalBlockedTerminal(finalSummaryJob)) {
          const finalAuthorityRequest = authorityRequestFromReport(finalSummaryJob.output?.report)
            || authorityRequestFromReport(parent.output?.report)
            || null;
          parent.workflow = {
            ...(parent.workflow || {}),
            leaderSequence: {
              ...leaderSequence,
              finalSummaryStatus: 'blocked',
              finalSummaryBlockedAt: nowIso()
            }
          };
          markJobBlockedForAuthority(
            parent,
            finalAuthorityRequest,
            finalSummaryJob.failureReason || 'Workflow is blocked waiting for connector approval before final delivery can continue.'
          );
          return cloneJob(parent);
        }
        const authorityRequest = workflowParentAuthorityRequest(parent);
        if (authorityRequest) {
          markJobBlockedForAuthority(parent, authorityRequest, 'Workflow is blocked waiting for connector approval before retrying specialist runs.');
          return cloneJob(parent);
        }
        const blockedParentStatus = workflowBlockedParentStatus(parent, children, blockingChildren);
        const hasActiveChildren = children.some((item) => active.has(item.status));
        const hasQueuedChildren = queued.some((item) => !workflowChildIsSequentialUserActionDeferred(item));
        const hasDeferredQueuedUserActionChildren = queued.some(workflowChildIsSequentialUserActionDeferred);
        const hasAdaptivePendingChildren = adaptivePendingChildren.length > 0;
        const finalBlockedParentStatus = blockedParentStatus
          || (finalSummaryStatus === 'blocked' && hasDeferredQueuedUserActionChildren ? 'blocked' : null)
          || (!hasActiveChildren && !hasQueuedChildren && blockingChildren.length ? 'blocked' : null);
        parent.status = finalBlockedParentStatus || (hasActiveChildren || hasQueuedChildren || hasAdaptivePendingChildren ? 'running' : 'queued');
        parent.completedAt = null;
        parent.failedAt = null;
        parent.failureReason = blockingChildren.length
          ? (blockingChildren[0]?.failureReason || blockingChildren[0]?.output?.summary || 'Workflow is blocked by a required specialist run.')
          : finalSummaryStatus === 'blocked' && !hasAdaptivePendingChildren
            ? (finalSummaryJob?.failureReason || finalSummaryJob?.output?.summary || 'Workflow is blocked before final leader summary can complete.')
          : null;
        if (parent.status === 'blocked') {
          parent.failureCategory = 'blocked_waiting_for_approval';
          parent.dispatch = {
            ...(parent.dispatch || {}),
            completionStatus: 'blocked_waiting_for_approval',
            retryable: false,
            nextRetryAt: null,
            completedAt: null
          };
          if (parent.output?.report && typeof parent.output.report === 'object') {
            parent.output.report.completion_state = 'blocked_waiting_for_approval';
          }
          syncJobAuthorityRequest(parent);
        }
        return cloneJob(parent);
      }
    }
    parent.output = buildAgentTeamDeliveryOutput(parent, children);
    const explicitParentAuthorityRequest = authorityRequestFromReport(parent.output?.report);
    const parentAuthorityRequest = syncJobAuthorityRequest(parent);
    const workflowAuthorityRequest = workflowParentAuthorityRequest(parent);
    if (workflowAuthorityRequest) {
      markJobBlockedForAuthority(parent, workflowAuthorityRequest, 'Workflow is blocked waiting for connector approval before retrying specialist runs.');
      return cloneJob(parent);
    }
    if (!children.length) {
      parent.status = 'failed';
      parent.failedAt = nowIso();
      parent.failureReason = 'No agent runs created for Agent Team objective';
      return cloneJob(parent);
    }
    if (children.length < expectedTotal) {
      parent.status = children.some((item) => active.has(item.status)) || blocked.length ? 'running' : 'queued';
      parent.completedAt = null;
      parent.failedAt = null;
      parent.failureReason = null;
      return cloneJob(parent);
    }
    if (children.every((item) => item.status === 'completed')) {
      const hasSaasHandoffOnlyAction = children.some((child) => workflowChildIsSaasHandoffOnly(child));
      if (authorityRequestRequiresApproval(explicitParentAuthorityRequest) && workflowParentRequestedExternalExecution(parent) && !hasSaasHandoffOnlyAction) {
        markJobBlockedForAuthority(parent, parentAuthorityRequest || explicitParentAuthorityRequest, 'Workflow is blocked waiting for connector approval before external execution.');
        return cloneJob(parent);
      }
      parent.status = 'completed';
      parent.completedAt = completed.map((item) => item.completedAt).filter(Boolean).sort().at(-1) || nowIso();
      parent.failedAt = null;
      parent.failureReason = null;
      return cloneJob(parent);
    }
    if (blocked.length) {
      const blockedParentStatus = workflowBlockedParentStatus(parent, children, blockingChildren);
      if (blockedParentStatus === 'blocked') {
        const authorityRequest = parentAuthorityRequest || authorityRequestFromReport(parent.output?.report);
        if (authorityRequestRequiresApproval(authorityRequest)) {
          markJobBlockedForAuthority(parent, authorityRequest, 'Workflow is blocked by a required specialist run.');
        } else {
          parent.status = 'blocked';
          parent.completedAt = null;
          parent.failedAt = null;
          parent.failureReason = blockingChildren.length
            ? (blockingChildren[0]?.failureReason || blockingChildren[0]?.output?.summary || 'Workflow is blocked by a required specialist run.')
            : 'Workflow is blocked by a required specialist run.';
          parent.failureCategory = 'workflow_blocked';
          parent.dispatch = {
            ...(parent.dispatch || {}),
            completionStatus: 'workflow_blocked',
            retryable: false,
            nextRetryAt: null,
            completedAt: null
          };
        }
        return cloneJob(parent);
      }
    }
    if (children.some((item) => active.has(item.status))) {
      parent.status = running.length ? 'running' : 'queued';
      parent.completedAt = null;
      parent.failedAt = null;
      parent.failureReason = null;
      return cloneJob(parent);
    }
    if (blocked.length) {
      const blockedParentStatus = workflowBlockedParentStatus(parent, children, blockingChildren) || 'running';
      const authorityRequest = parentAuthorityRequest || authorityRequestFromReport(parent.output?.report);
      if (blockedParentStatus === 'blocked' && authorityRequestRequiresApproval(authorityRequest)) {
        markJobBlockedForAuthority(parent, authorityRequest, 'Workflow is blocked by a required specialist run.');
      } else {
        parent.status = blockedParentStatus;
        parent.completedAt = null;
        parent.failedAt = null;
        parent.failureReason = blockingChildren.length
          ? (blockingChildren[0]?.failureReason || blockingChildren[0]?.output?.summary || 'Workflow is blocked by a required specialist run.')
          : null;
        if (blockedParentStatus === 'blocked') {
          parent.failureCategory = 'blocked_waiting_for_approval';
          parent.dispatch = {
            ...(parent.dispatch || {}),
            completionStatus: 'blocked_waiting_for_approval',
            retryable: false,
            nextRetryAt: null,
            completedAt: null
          };
        }
      }
      return cloneJob(parent);
    }
    if (children.every((item) => terminal.has(item.status))) {
      parent.status = 'failed';
      parent.completedAt = null;
      parent.failedAt = failed.map((item) => item.failedAt || item.timedOutAt || item.completedAt).filter(Boolean).sort().at(-1) || nowIso();
      parent.failureReason = `${failed.length} agent runs failed in Agent Team objective`;
      return cloneJob(parent);
    }
    parent.status = 'queued';
    return cloneJob(parent);
  });
}



  return {
    reconcileWorkflowParent,
    refreshWorkflowLeaderHandoffForJobId
  };
}
