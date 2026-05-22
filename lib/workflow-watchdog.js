export const ORCHESTRATION_WATCHDOG_POLICY = Object.freeze({
  version: 'workflow-watchdog/v2',
  staleAfterMs: 60 * 1000,
  blockedAfterMs: 10 * 60 * 1000,
  maxParentsPerSweep: 20,
  maxDispatchTargetsPerParent: 10,
  actions: Object.freeze([
    'reconcile_parent',
    'refresh_leader_handoff',
    'schedule_safe_dispatch',
    'surface_visible_blocker'
  ])
});

export function createWorkflowWatchdog(deps = {}) {
  const {
    buildAgentTeamDeliveryOutput,
    cloneJob,
    nowIso,
    reconcileWorkflowParent,
    refreshWorkflowLeaderHandoffForJobId,
    scheduleProgressDispatchesForJobId,
    sortWorkflowChildren,
    syncJobAuthorityRequest,
    touchEvent,
    workflowChildIsApprovalBlockedTerminal,
    workflowParentAuthorityRequest
  } = deps;

  function workflowWatchdogTimestampMs(value) {
    const parsed = Date.parse(String(value || ''));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function workflowWatchdogLastActivityMs(parent = {}, children = []) {
    const timestamps = [];
    const collect = (job = {}) => {
      timestamps.push(
        workflowWatchdogTimestampMs(job.updatedAt),
        workflowWatchdogTimestampMs(job.lastCallbackAt),
        workflowWatchdogTimestampMs(job.completedAt),
        workflowWatchdogTimestampMs(job.failedAt),
        workflowWatchdogTimestampMs(job.timedOutAt),
        workflowWatchdogTimestampMs(job.dispatch?.dispatchRequestedAt),
        workflowWatchdogTimestampMs(job.dispatch?.scheduledAt),
        workflowWatchdogTimestampMs(job.dispatchedAt),
        workflowWatchdogTimestampMs(job.startedAt),
        workflowWatchdogTimestampMs(job.claimedAt),
        workflowWatchdogTimestampMs(job.createdAt)
      );
    };
    collect(parent);
    for (const child of children) collect(child);
    return Math.max(0, ...timestamps);
  }

  function workflowWatchdogParentSnapshot(state = {}, parentId = '') {
    const parent = (state.jobs || []).find((job) => job.id === parentId && job.jobKind === 'workflow') || null;
    const children = parent
      ? sortWorkflowChildren(parent, (state.jobs || []).filter((job) => job.workflowParentId === parent.id))
      : [];
    return { parent, children };
  }

  function workflowWatchdogApprovalBlocked(parent = {}, children = []) {
    if (workflowParentAuthorityRequest(parent)) return true;
    return children.some((child) => workflowChildIsApprovalBlockedTerminal(child));
  }

  function workflowBlockedNeedsReconciliation(job = {}) {
    const status = String(job.status || '').trim().toLowerCase();
    if (status !== 'blocked') return false;
    const category = String(job.failureCategory || '').trim().toLowerCase();
    const completion = String(job.dispatch?.completionStatus || '').trim().toLowerCase();
    return category === 'workflow_orchestration_incomplete'
      || completion === 'workflow_orchestration_incomplete';
  }

  async function markWorkflowParentBlockedByWatchdog(storage, parentJobId, reason, meta = {}) {
    if (!parentJobId) return { blocked: false, reason: 'job_id_missing' };
    const mutateWorkflow = typeof storage.mutateWorkflow === 'function'
      ? (mutator) => storage.mutateWorkflow(parentJobId, mutator)
      : (mutator) => storage.mutate(mutator);
    return mutateWorkflow(async (state) => {
      const { parent, children } = workflowWatchdogParentSnapshot(state, parentJobId);
      if (!parent) return { blocked: false, reason: 'parent_not_found' };
      const parentStatus = String(parent.status || '').trim().toLowerCase();
      if (!['queued', 'running'].includes(parentStatus)) return { blocked: false, reason: 'parent_not_active', status: parent.status };
      if (children.some((child) => ['claimed', 'running', 'dispatched'].includes(String(child.status || '').trim().toLowerCase()))) {
        return { blocked: false, reason: 'child_still_active' };
      }
      if (workflowWatchdogApprovalBlocked(parent, children)) {
        return { blocked: false, reason: 'approval_blocked' };
      }
      const blockedAt = nowIso();
      parent.status = 'blocked';
      parent.completedAt = null;
      parent.failedAt = null;
      parent.failureCategory = 'workflow_orchestration_stalled';
      parent.failureReason = reason;
      parent.dispatch = {
        ...(parent.dispatch || {}),
        completionStatus: 'workflow_orchestration_stalled',
        retryable: true,
        nextRetryAt: null,
        completedAt: null
      };
      parent.workflow = {
        ...(parent.workflow || {}),
        watchdog: {
          ...(parent.workflow?.watchdog || {}),
          policyVersion: ORCHESTRATION_WATCHDOG_POLICY.version,
          status: 'blocked',
          reason,
          blockedAt,
          ...meta
        }
      };
      parent.logs = [
        ...(parent.logs || []),
        `orchestration watchdog blocked workflow: ${reason} (${blockedAt})`
      ];
      parent.output = buildAgentTeamDeliveryOutput(parent, children);
      syncJobAuthorityRequest(parent);
      return { blocked: true, job: cloneJob(parent) };
    });
  }

  async function runWorkflowOrchestrationWatchdog(storage, env, options = {}) {
    const staleAfterMs = Math.max(30_000, Number(options.staleAfterMs || ORCHESTRATION_WATCHDOG_POLICY.staleAfterMs) || ORCHESTRATION_WATCHDOG_POLICY.staleAfterMs);
    const blockedAfterMs = Math.max(staleAfterMs, Number(options.blockedAfterMs || ORCHESTRATION_WATCHDOG_POLICY.blockedAfterMs) || ORCHESTRATION_WATCHDOG_POLICY.blockedAfterMs);
    const limit = Math.max(1, Math.min(
      ORCHESTRATION_WATCHDOG_POLICY.maxParentsPerSweep,
      Number(options.limit || ORCHESTRATION_WATCHDOG_POLICY.maxParentsPerSweep) || ORCHESTRATION_WATCHDOG_POLICY.maxParentsPerSweep
    ));
    const maxTargets = Math.max(1, Math.min(
      ORCHESTRATION_WATCHDOG_POLICY.maxDispatchTargetsPerParent,
      Number(options.maxTargets || ORCHESTRATION_WATCHDOG_POLICY.maxDispatchTargetsPerParent) || ORCHESTRATION_WATCHDOG_POLICY.maxDispatchTargetsPerParent
    ));
    const waitUntil = typeof options.waitUntil === 'function' ? options.waitUntil : null;
    const nowMs = Date.now();
    const state = typeof storage.getFreshState === 'function' ? await storage.getFreshState() : await storage.getState();
    const candidates = (state.jobs || [])
      .filter((job) => job.jobKind === 'workflow')
      .filter((job) => ['queued', 'running'].includes(String(job.status || '').trim().toLowerCase()) || workflowBlockedNeedsReconciliation(job))
      .map((parent) => {
        const children = sortWorkflowChildren(parent, (state.jobs || []).filter((job) => job.workflowParentId === parent.id));
        const lastActivityMs = workflowWatchdogLastActivityMs(parent, children);
        const idleMs = lastActivityMs ? Math.max(0, nowMs - lastActivityMs) : Number.MAX_SAFE_INTEGER;
        return { parent, children, lastActivityMs, idleMs };
      })
      .filter((item) => options.force || item.idleMs >= staleAfterMs)
      .sort((left, right) => {
        const repairPriority = Number(workflowBlockedNeedsReconciliation(right.parent)) - Number(workflowBlockedNeedsReconciliation(left.parent));
        if (repairPriority) return repairPriority;
        return left.lastActivityMs - right.lastActivityMs;
      })
      .slice(0, limit);
    const checked = [];
    const scheduledJobIds = [];
    const blockedJobIds = [];
    let reconciledCount = 0;
    let refreshedCount = 0;
    for (const candidate of candidates) {
      const parentId = candidate.parent.id;
      const checkedItem = {
        job_id: parentId,
        idle_ms: candidate.idleMs,
        action: 'checked'
      };
      checked.push(checkedItem);
      const reconciled = await reconcileWorkflowParent(storage, parentId);
      if (reconciled) reconciledCount += 1;
      if (reconciled && !['queued', 'running'].includes(String(reconciled.status || '').trim().toLowerCase())) {
        checkedItem.action = `reconciled_${String(reconciled.status || 'inactive')}`;
        if (String(reconciled.status || '').trim().toLowerCase() === 'blocked') blockedJobIds.push(parentId);
        continue;
      }
      const refreshed = await refreshWorkflowLeaderHandoffForJobId(storage, parentId);
      refreshedCount += Number(refreshed?.updated || 0) || 0;
      const dispatchResult = await scheduleProgressDispatchesForJobId(storage, env, waitUntil, parentId, options.reason || 'orchestration watchdog dispatch', {
        maxTargets,
        awaitDispatch: options.awaitDispatch === true,
        refresh: false
      });
      if (dispatchResult?.scheduled) {
        const ids = (dispatchResult.jobs || []).map((job) => job?.id).filter(Boolean);
        scheduledJobIds.push(...ids);
        checkedItem.action = 'scheduled_dispatch';
        checkedItem.scheduled_job_ids = ids;
        continue;
      }
      checkedItem.action = dispatchResult?.reason || 'no_dispatch_target';
      if (candidate.idleMs >= blockedAfterMs) {
        const blocked = await markWorkflowParentBlockedByWatchdog(
          storage,
          parentId,
          `Workflow watchdog found no eligible dispatch target after ${Math.round(candidate.idleMs / 60000)} minutes. The order is not being treated as completed; review queued children, leader checkpoints, agent endpoints, and approval blockers.`,
          {
            checkedAt: nowIso(),
            idleMs: candidate.idleMs,
            lastDispatchReason: checkedItem.action
          }
        );
        if (blocked?.blocked) {
          blockedJobIds.push(parentId);
          checkedItem.action = 'blocked_visible';
        } else if (blocked?.reason) {
          checkedItem.block_skipped_reason = blocked.reason;
        }
      }
    }
    if (checked.length || scheduledJobIds.length || blockedJobIds.length) {
      await touchEvent(storage, scheduledJobIds.length ? 'RUNNING' : 'SYSTEM', `orchestration watchdog checked ${checked.length} workflow(s), scheduled ${scheduledJobIds.length}, blocked ${blockedJobIds.length}`, {
        kind: 'orchestration_watchdog',
        policyVersion: ORCHESTRATION_WATCHDOG_POLICY.version,
        jobIds: checked.map((item) => item.job_id),
        scheduledJobIds,
        blockedJobIds
      });
    }
    return {
      ok: true,
      policy_version: ORCHESTRATION_WATCHDOG_POLICY.version,
      checked_count: checked.length,
      reconciled_count: reconciledCount,
      refreshed_count: refreshedCount,
      scheduled_count: scheduledJobIds.length,
      blocked_count: blockedJobIds.length,
      scheduled_job_ids: scheduledJobIds,
      blocked_job_ids: blockedJobIds,
      checked
    };
  }

  return {
    runWorkflowOrchestrationWatchdog
  };
}
