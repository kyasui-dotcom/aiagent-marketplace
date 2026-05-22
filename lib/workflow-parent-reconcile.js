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
    reconcileWorkflowParent,
    refreshWorkflowLeaderHandoffForJobId
  };
}
