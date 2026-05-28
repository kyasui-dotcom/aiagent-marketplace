export function createWorkflowDispatchRuntime(dependencies = {}) {
  const {
    DISPATCH_IN_PROGRESS_STALE_MS,
    DISPATCH_SCHEDULE_STALE_MS,
    WORKFLOW_PROGRESS_DISPATCH_MAX_TARGETS,
    acceptedEndpointRecoveryAttempts,
    applyWorkflowHandoffPromptContextToJob,
    canAutoScheduleAsyncDispatch,
    cloneJob,
    completedWorkflowLeader,
    completionQueueRecoveryStaleMs,
    dispatchExistingJobToAssignedAgent,
    dispatchScheduleIsFreshForAgent,
    e2eAuthSecret,
    enqueueEndpointDispatch,
    failJob,
    internalCronToken,
    isTerminalJobStatus,
    isWorkflowLeaderTask,
    jobWithinDispatchAge,
    json,
    nowIso,
    parseBody,
    pauseWorkflowChildDispatchForParentAuthority,
    providerRunAttempts,
    providerRunLimitReached,
    publicAgent,
    reconcileWorkflowParent,
    refreshWorkflowLeaderHandoffForJobId,
    releaseBillingReservationInState,
    runtimeStorage,
    secretEquals,
    sortWorkflowChildren,
    touchEvent,
    workflowBlockingQualityGateBeforeLayer,
    workflowCheckpointBlocksLayer,
    workflowChildIsInternalLeaderSequenceRun,
    workflowChildIsSaasHandoffOnly,
    workflowChildIsTerminal,
    workflowChildIsTerminalForProgress,
    workflowHasActiveSequentialUserActionWait,
    workflowChildRequiresSequentialUserAction,
    workflowChildShouldRestartFromBeginning,
    workflowCompletionRetryLimitForJob,
    workflowDispatchLayer,
    workflowDispatchMaxAgeMs,
    workflowDispatchQueue,
    workflowLeaderCheckpoints,
    workflowLeaderHandoff,
    workflowLeaderSequence,
    workflowParentAuthorityRequest,
    workflowProviderRunMaxAttempts,
    workflowRestartRequiredReason,
    workflowSequentialUserActionPriority,
    workflowTaskName
  } = dependencies;

  function pickProgressDispatchTargets(state, jobId, options = {}) {
    const maxTargets = Math.max(1, Math.min(WORKFLOW_PROGRESS_DISPATCH_MAX_TARGETS, Number(options.maxTargets || 1) || 1));
    const parentOrJob = state.jobs.find((item) => item.id === jobId);
    if (!parentOrJob) return [];
    const now = Date.now();
    if (parentOrJob.jobKind === 'workflow') {
      const children = sortWorkflowChildren(
        parentOrJob,
        state.jobs.filter((item) => item.workflowParentId === parentOrJob.id)
      );
      if (workflowParentAuthorityRequest(parentOrJob)) return [];
      const leaderSequence = workflowLeaderSequence(parentOrJob);
      const leaderChildren = children.filter((child) => isWorkflowLeaderTask(workflowTaskName(child)));
      const pendingLeader = leaderChildren.find((child) => !workflowChildIsTerminal(child) && String(child.status || '').toLowerCase() !== 'blocked');
      if (pendingLeader) {
        const agent = state.agents.find((item) => item.id === pendingLeader.assignedAgentId);
        if (canAutoScheduleAsyncDispatch(pendingLeader, agent)) {
          return [{ job: pendingLeader, agent, parentJobId: parentOrJob.id, workflowLeaderHandoff: null }];
        }
        return [];
      }
      const leader = completedWorkflowLeader(parentOrJob, children);
      if (leaderChildren.length && !leader) return [];
      const pendingLayers = children
        .filter((child) => !workflowChildIsTerminalForProgress(child) && !isWorkflowLeaderTask(workflowTaskName(child)))
        .map((child) => workflowDispatchLayer(parentOrJob, child));
      const nextLayer = pendingLayers.length ? Math.min(...pendingLayers) : null;
      if (leaderSequence?.enabled && nextLayer !== null && nextLayer >= 2 && workflowCheckpointBlocksLayer(parentOrJob, children, nextLayer)) {
        return [];
      }
      const leaderCheckpointClearedLayer = Boolean(
        leaderSequence?.enabled
        && nextLayer !== null
        && nextLayer >= 2
        && (
          (
            workflowLeaderCheckpoints(parentOrJob).length
            && !workflowCheckpointBlocksLayer(parentOrJob, children, nextLayer)
          )
          || children.some((child) => {
            if (!workflowChildIsInternalLeaderSequenceRun(child)) return false;
            if (String(child.status || '').trim().toLowerCase() !== 'completed') return false;
            const workflow = child?.input?._broker?.workflow && typeof child.input._broker.workflow === 'object'
              ? child.input._broker.workflow
              : {};
            return String(workflow.sequencePhase || '').trim().toLowerCase() === 'checkpoint'
              && Number(workflow.requiredBeforeLayer || workflow.required_before_layer || 0) <= nextLayer;
          })
        )
      );
      const blockingQualityGate = nextLayer !== null
        && !leaderCheckpointClearedLayer
        ? workflowBlockingQualityGateBeforeLayer(parentOrJob, children, nextLayer)
        : null;
      if (blockingQualityGate) {
        parentOrJob.workflow = {
          ...(parentOrJob.workflow || {}),
          blockedHandoffGate: {
            ...blockingQualityGate,
            blockedBeforeLayer: nextLayer,
            checkedAt: nowIso()
          }
        };
        return [];
      }
      const targets = [];
      const activeSequentialUserActionWait = workflowHasActiveSequentialUserActionWait(parentOrJob, children);
      let sequentialUserActionTargetPicked = false;
      const childOrder = new Map(children.map((child, index) => [child.id, index]));
      const dispatchChildren = nextLayer === null
        ? children
        : [...children].sort((left, right) => {
            const leftInLayer = workflowDispatchLayer(parentOrJob, left) === nextLayer;
            const rightInLayer = workflowDispatchLayer(parentOrJob, right) === nextLayer;
            if (leftInLayer !== rightInLayer) return leftInLayer ? -1 : 1;
            if (!leftInLayer || activeSequentialUserActionWait) return (childOrder.get(left.id) || 0) - (childOrder.get(right.id) || 0);
            const leftSequential = workflowChildRequiresSequentialUserAction(parentOrJob, left);
            const rightSequential = workflowChildRequiresSequentialUserAction(parentOrJob, right);
            if (leftSequential !== rightSequential) return leftSequential ? -1 : 1;
            if (!leftSequential) return (childOrder.get(left.id) || 0) - (childOrder.get(right.id) || 0);
            return workflowSequentialUserActionPriority(parentOrJob, right) - workflowSequentialUserActionPriority(parentOrJob, left)
              || (childOrder.get(left.id) || 0) - (childOrder.get(right.id) || 0);
          });
      for (const child of dispatchChildren) {
        const targetLayer = workflowDispatchLayer(parentOrJob, child);
        if (nextLayer !== null && targetLayer !== nextLayer) continue;
        if (workflowChildIsSaasHandoffOnly(child)) continue;
        const agent = state.agents.find((item) => item.id === child.assignedAgentId);
        if (canAutoScheduleAsyncDispatch(child, agent)) {
          const requiresSequentialUserAction = workflowChildRequiresSequentialUserAction(parentOrJob, child);
          if (requiresSequentialUserAction && (activeSequentialUserActionWait || sequentialUserActionTargetPicked)) continue;
          const handoff = workflowLeaderHandoff(parentOrJob, leader, children, targetLayer);
          targets.push({ job: child, agent, parentJobId: parentOrJob.id, workflowLeaderHandoff: handoff, requiresSequentialUserAction });
          if (requiresSequentialUserAction) sequentialUserActionTargetPicked = true;
          if (targets.length >= maxTargets) break;
        }
      }
      return targets;
    }
    const agent = state.agents.find((item) => item.id === parentOrJob.assignedAgentId);
    if (workflowParentAuthorityRequest(parentOrJob)) return [];
    if (!canAutoScheduleAsyncDispatch(parentOrJob, agent)) return [];
    if (dispatchScheduleIsFreshForAgent(parentOrJob, agent, now)) return [];
    return [{ job: parentOrJob, agent, parentJobId: parentOrJob.workflowParentId || null, workflowLeaderHandoff: null }];
  }
  
  function pickProgressDispatchTarget(state, jobId) {
    return pickProgressDispatchTargets(state, jobId, { maxTargets: 1 })[0] || null;
  }
  
  async function markDispatchScheduled(storage, jobId, agentId, reason = 'dispatch scheduled', options = {}) {
    const at = nowIso();
    const env = options.env || {};
    const mutateScheduled = async (state) => {
      const job = state.jobs.find((item) => item.id === jobId);
      const agent = state.agents.find((item) => item.id === agentId);
      if (!canAutoScheduleAsyncDispatch(job, agent)) {
        return { scheduled: false, reason: 'not_eligible', job: cloneJob(job), agent: agent ? publicAgent(agent) : null };
      }
      if (dispatchScheduleIsFreshForAgent(job, agent)) {
        return { scheduled: false, reason: 'already_scheduled', job: cloneJob(job), agent: publicAgent(agent) };
      }
      const previousDispatch = job.dispatch && typeof job.dispatch === 'object' ? job.dispatch : {};
      const previousCompletionStatus = String(previousDispatch.completionStatus || '').trim().toLowerCase();
      if (workflowChildShouldRestartFromBeginning(job) && providerRunLimitReached(env, job)) {
        const failedAt = nowIso();
        job.status = 'failed';
        job.failedAt = failedAt;
        job.timedOutAt = null;
        job.completedAt = null;
        job.failureCategory = 'workflow_restart_required';
        job.failureReason = workflowRestartRequiredReason(job, `provider run limit reached (${providerRunAttempts(job)}/${workflowProviderRunMaxAttempts(env, job)})`);
        if (job.billingReservation && !job.billingSettlement?.settledAt && !job.billingReservation?.releasedAt) {
          releaseBillingReservationInState(state, job);
        }
        job.dispatch = {
          ...previousDispatch,
          completionStatus: 'workflow_restart_required',
          failedAt,
          retryable: false,
          nextRetryAt: null,
          restartRequired: true,
          attempts: providerRunAttempts(job),
          maxRetries: workflowProviderRunMaxAttempts(env, job)
        };
        job.logs = [...(job.logs || []), 'provider run limit reached before scheduling; full order retry required'];
        return { scheduled: false, reason: 'provider_run_limit_reached', job: cloneJob(job), agent: publicAgent(agent), restartRequired: true };
      }
      job.status = 'running';
      job.startedAt = job.startedAt || at;
      job.failureReason = null;
      job.failureCategory = null;
      let workflowLeaderHandoffForDispatch = options.workflowLeaderHandoff || null;
      if (job.workflowParentId && !isWorkflowLeaderTask(workflowTaskName(job))) {
        const parent = state.jobs.find((item) => item.id === job.workflowParentId && item.jobKind === 'workflow') || null;
        if (parent) {
          const children = sortWorkflowChildren(
            parent,
            state.jobs.filter((item) => item.workflowParentId === parent.id)
          );
          const leader = completedWorkflowLeader(parent, children);
          const targetLayer = workflowDispatchLayer(parent, job);
          const freshHandoff = workflowLeaderHandoff(parent, leader, children, targetLayer);
          if (freshHandoff) workflowLeaderHandoffForDispatch = freshHandoff;
        }
      }
      const firstDispatchRequestedAt = previousDispatch.firstDispatchRequestedAt || previousDispatch.dispatchRequestedAt || at;
      const scheduleAttempts = Number(previousDispatch.scheduleAttempts || 0) + 1;
      const recoveringStaleInProgressDispatch = previousCompletionStatus === 'dispatch_in_progress';
      job.dispatch = {
        ...previousDispatch,
        firstDispatchRequestedAt,
        dispatchRequestedAt: at,
        completionStatus: 'dispatch_scheduled',
        scheduleAttempts,
        retryable: true,
        nextRetryAt: null,
        maxRetries: workflowCompletionRetryLimitForJob(env, job),
        ...(recoveringStaleInProgressDispatch ? { endpointDispatchRecoveredAt: at } : {})
      };
      if (workflowLeaderHandoffForDispatch && job.workflowParentId && !isWorkflowLeaderTask(workflowTaskName(job))) {
        const input = job.input && typeof job.input === 'object' ? { ...job.input } : {};
        const broker = input._broker && typeof input._broker === 'object' ? { ...input._broker } : {};
        const workflow = broker.workflow && typeof broker.workflow === 'object' ? { ...broker.workflow } : {};
        workflow.leaderHandoff = workflowLeaderHandoffForDispatch;
        if (!workflow.leaderActionProtocol && workflowLeaderHandoffForDispatch?.actionProtocol) {
          workflow.leaderActionProtocol = workflowLeaderHandoffForDispatch.actionProtocol;
        }
        broker.workflow = workflow;
        input._broker = broker;
        job.input = input;
        applyWorkflowHandoffPromptContextToJob(job);
      }
      job.logs = [
        ...(job.logs || []),
        ...(workflowLeaderHandoffForDispatch && job.workflowParentId && !isWorkflowLeaderTask(workflowTaskName(job))
          ? [`leader handoff attached from ${workflowLeaderHandoffForDispatch.leaderTaskType}/${String(workflowLeaderHandoffForDispatch.leaderJobId || '').slice(0, 6)}`]
          : []),
        ...(recoveringStaleInProgressDispatch ? ['stale endpoint dispatch lock recovered for retry'] : []),
        `${reason}; dispatch scheduled for ${agent.id}`
      ];
      return { scheduled: true, job: cloneJob(job), agent: publicAgent(agent) };
    };
    return typeof storage.mutateJobAndAgent === 'function'
      ? storage.mutateJobAndAgent(jobId, agentId, mutateScheduled)
      : storage.mutate(mutateScheduled);
  }
  
  async function scheduleProgressDispatchesForJobId(storage, env, waitUntil, jobId, reason = 'progress dispatch', options = {}) {
    if (!jobId) return { scheduled: false, scheduled_count: 0, reason: 'job_id_missing', jobs: [] };
    const awaitDispatch = options.awaitDispatch !== false;
    if (options.refresh !== false) await refreshWorkflowLeaderHandoffForJobId(storage, jobId);
    const state = typeof storage.loadWorkflowDispatchState === 'function'
      ? await storage.loadWorkflowDispatchState(jobId)
      : (typeof storage.getFreshState === 'function' ? await storage.getFreshState() : await storage.getState());
    const targets = pickProgressDispatchTargets(state, jobId, { maxTargets: options.maxTargets || 1 });
    if (!targets.length) return { scheduled: false, scheduled_count: 0, reason: 'no_dispatch_target', jobs: [] };
    const scheduled = [];
    const dispatchPromises = [];
    const queueDispatch = options.dispatchMode !== 'direct' && Boolean(workflowDispatchQueue(env));
    for (const target of targets) {
      const marked = await markDispatchScheduled(storage, target.job.id, target.agent.id, reason, {
        env,
        workflowLeaderHandoff: target.workflowLeaderHandoff || null
      });
      if (!marked.scheduled) {
        if (marked.restartRequired && marked.job?.workflowParentId) await reconcileWorkflowParent(storage, marked.job.workflowParentId);
        continue;
      }
      scheduled.push({ ...marked, parentJobId: target.parentJobId || marked.job.workflowParentId || null });
      await touchEvent(storage, 'RUNNING', `${marked.agent.name} scheduled ${marked.job.taskType}/${marked.job.id.slice(0, 6)}`, {
        kind: 'dispatch_scheduled',
        jobId: marked.job.id,
        parentJobId: marked.job.workflowParentId || target.parentJobId || null
      });
      if (marked.job.workflowParentId) {
        try {
          await reconcileWorkflowParent(storage, marked.job.workflowParentId);
        } catch (error) {
          await touchEvent(storage, 'FAILED', `${marked.job.taskType}/${marked.job.id.slice(0, 6)} pre-dispatch reconcile exception ${String(error?.message || error).slice(0, 120)}`);
        }
      }
      if (queueDispatch) {
        try {
          await enqueueEndpointDispatch(env, marked.job, marked.agent, {
            workflowParentId: marked.job.workflowParentId || target.parentJobId || null,
            source: reason
          });
          await touchEvent(storage, 'RUNNING', `${marked.agent.name} queued ${marked.job.taskType}/${marked.job.id.slice(0, 6)} for endpoint dispatch`, {
            kind: 'endpoint_dispatch_queued',
            jobId: marked.job.id,
            parentJobId: marked.job.workflowParentId || target.parentJobId || null
          });
          continue;
        } catch (error) {
          await touchEvent(storage, 'FAILED', `${marked.job.taskType}/${marked.job.id.slice(0, 6)} endpoint dispatch queue send failed ${String(error?.message || error).slice(0, 120)}`);
        }
      }
      dispatchPromises.push(dispatchExistingJobToAssignedAgent(storage, env, marked.job.id, marked.agent.id)
        .catch((error) => touchEvent(storage, 'FAILED', `${marked.job.taskType}/${marked.job.id.slice(0, 6)} scheduled dispatch exception ${String(error?.message || error).slice(0, 120)}`)));
    }
    if (!scheduled.length) return { scheduled: false, scheduled_count: 0, reason: 'not_eligible', jobs: [] };
    const dispatchBatch = Promise.allSettled(dispatchPromises);
    if (awaitDispatch) {
      await dispatchBatch;
    } else if (typeof waitUntil === 'function') {
      waitUntil(dispatchBatch);
    } else {
      void dispatchBatch;
    }
    return {
      scheduled: true,
      scheduled_count: scheduled.length,
      jobs: scheduled.map((item) => item.job),
      agents: scheduled.map((item) => item.agent)
    };
  }
  
  async function scheduleProgressDispatchForJobId(storage, env, waitUntil, jobId, reason = 'progress dispatch') {
    const result = await scheduleProgressDispatchesForJobId(storage, env, waitUntil, jobId, reason, { maxTargets: 1 });
    if (!result.scheduled) return { scheduled: false, reason: result.reason || 'no_dispatch_target' };
    return {
      scheduled: true,
      job: result.jobs[0],
      agent: result.agents[0],
      scheduled_count: result.scheduled_count
    };
  }
  
  async function scheduleInitialWorkflowDispatchFromChildren(storage, env, waitUntil, parentJob, childJobs = [], reason = 'async workflow create') {
    const children = sortWorkflowChildren(parentJob, Array.isArray(childJobs) ? childJobs : []);
    const initialLeader = children.find((child) => (
      String(child?.status || '').trim().toLowerCase() === 'queued'
      && isWorkflowLeaderTask(workflowTaskName(child))
      && child.assignedAgentId
    ));
    const firstQueued = initialLeader || children.find((child) => (
      String(child?.status || '').trim().toLowerCase() === 'queued'
      && child.assignedAgentId
    ));
    if (!firstQueued) return { scheduled: false, scheduled_count: 0, reason: 'no_initial_child' };
    const agent = typeof storage.getAgentById === 'function'
      ? await storage.getAgentById(firstQueued.assignedAgentId)
      : null;
    if (!agent || !canAutoScheduleAsyncDispatch(firstQueued, agent)) {
      return { scheduled: false, scheduled_count: 0, reason: agent ? 'initial_child_not_eligible' : 'initial_child_agent_missing' };
    }
    const marked = await markDispatchScheduled(storage, firstQueued.id, agent.id, reason, { env });
    if (!marked?.scheduled) return { scheduled: false, scheduled_count: 0, reason: marked?.reason || 'initial_child_mark_rejected' };
    await touchEvent(storage, 'RUNNING', `${marked.agent.name} scheduled ${marked.job.taskType}/${marked.job.id.slice(0, 6)}`, {
      kind: 'dispatch_scheduled',
      jobId: marked.job.id,
      parentJobId: marked.job.workflowParentId || parentJob.id || null
    });
    if (workflowDispatchQueue(env)) {
      await enqueueEndpointDispatch(env, marked.job, marked.agent, {
        workflowParentId: marked.job.workflowParentId || parentJob.id || null,
        source: reason
      });
      await touchEvent(storage, 'RUNNING', `${marked.agent.name} queued ${marked.job.taskType}/${marked.job.id.slice(0, 6)} for endpoint dispatch`, {
        kind: 'endpoint_dispatch_queued',
        jobId: marked.job.id,
        parentJobId: marked.job.workflowParentId || parentJob.id || null
      });
      return { scheduled: true, scheduled_count: 1, jobs: [marked.job], agents: [marked.agent] };
    }
    const dispatchPromise = dispatchExistingJobToAssignedAgent(storage, env, marked.job.id, marked.agent.id)
      .catch((error) => touchEvent(storage, 'FAILED', `${marked.job.taskType}/${marked.job.id.slice(0, 6)} initial dispatch exception ${String(error?.message || error).slice(0, 120)}`));
    if (typeof waitUntil === 'function') waitUntil(dispatchPromise);
    else void dispatchPromise;
    return { scheduled: true, scheduled_count: 1, jobs: [marked.job], agents: [marked.agent] };
  }
  
  async function scheduleNextWorkflowDispatchLightweight(storage, env, waitUntil, parentJobId, reason = 'workflow completion handoff', options = {}) {
    const parentId = String(parentJobId || '').trim();
    if (!parentId) return { scheduled: false, scheduled_count: 0, reason: 'parent_missing' };
    if (options.refresh !== false) await refreshWorkflowLeaderHandoffForJobId(storage, parentId);
    const mutateWorkflow = typeof storage.mutateWorkflow === 'function'
      ? (mutator) => storage.mutateWorkflow(parentId, mutator)
      : (mutator) => storage.mutate(mutator);
    const result = await mutateWorkflow(async (state) => {
      const parent = state.jobs.find((item) => item.id === parentId && item.jobKind === 'workflow') || null;
      if (!parent || workflowParentAuthorityRequest(parent)) return { scheduled: false, reason: parent ? 'parent_authority_wait' : 'parent_missing' };
      const children = sortWorkflowChildren(parent, state.jobs.filter((item) => item.workflowParentId === parent.id));
      const queued = children.filter((child) => String(child?.status || '').trim().toLowerCase() === 'queued' && child.assignedAgentId);
      const target = queued.find((child) => isWorkflowLeaderTask(workflowTaskName(child))) || queued[0] || null;
      if (!target) return { scheduled: false, reason: 'no_queued_child' };
      const at = nowIso();
      const previousDispatch = target.dispatch && typeof target.dispatch === 'object' ? target.dispatch : {};
      const firstDispatchRequestedAt = previousDispatch.firstDispatchRequestedAt || previousDispatch.dispatchRequestedAt || at;
      target.status = 'running';
      target.startedAt = target.startedAt || at;
      target.failureReason = null;
      target.failureCategory = null;
      target.dispatch = {
        ...previousDispatch,
        firstDispatchRequestedAt,
        dispatchRequestedAt: at,
        completionStatus: 'dispatch_scheduled',
        scheduleAttempts: Number(previousDispatch.scheduleAttempts || 0) + 1,
        retryable: true,
        nextRetryAt: null,
        maxRetries: workflowCompletionRetryLimitForJob(env, target)
      };
      target.logs = [...(target.logs || []), `${reason}; lightweight dispatch scheduled`];
      return { scheduled: true, job: cloneJob(target), agentId: target.assignedAgentId };
    });
    if (!result?.scheduled || !result.job?.id || !result.agentId) return { scheduled: false, scheduled_count: 0, reason: result?.reason || 'lightweight_mark_rejected' };
    const agent = typeof storage.getAgentById === 'function' ? await storage.getAgentById(result.agentId) : null;
    if (!agent) return { scheduled: false, scheduled_count: 0, reason: 'agent_missing_after_lightweight_mark', jobs: [result.job] };
    await touchEvent(storage, 'RUNNING', `${agent.name} scheduled ${result.job.taskType}/${result.job.id.slice(0, 6)}`, {
      kind: 'dispatch_scheduled',
      jobId: result.job.id,
      parentJobId: result.job.workflowParentId || parentId
    });
    if (workflowDispatchQueue(env)) {
      await enqueueEndpointDispatch(env, result.job, agent, {
        workflowParentId: result.job.workflowParentId || parentId,
        source: reason
      });
      await touchEvent(storage, 'RUNNING', `${agent.name} queued ${result.job.taskType}/${result.job.id.slice(0, 6)} for endpoint dispatch`, {
        kind: 'endpoint_dispatch_queued',
        jobId: result.job.id,
        parentJobId: result.job.workflowParentId || parentId
      });
      return { scheduled: true, scheduled_count: 1, jobs: [result.job], agents: [agent] };
    }
    const dispatchPromise = dispatchExistingJobToAssignedAgent(storage, env, result.job.id, agent.id)
      .catch((error) => touchEvent(storage, 'FAILED', `${result.job.taskType}/${result.job.id.slice(0, 6)} lightweight dispatch exception ${String(error?.message || error).slice(0, 120)}`));
    if (typeof waitUntil === 'function') waitUntil(dispatchPromise);
    else void dispatchPromise;
    return { scheduled: true, scheduled_count: 1, jobs: [result.job], agents: [agent] };
  }
  
  async function recoverWorkflowEndpointDispatchJobs(storage, env, options = {}) {
    const requestedLegacyLimit = Math.max(1, Number(env?.LEGACY_WORKFLOW_DISPATCH_RECOVERY_LIMIT || 500) || 500);
    const legacyLimit = Math.max(50, Math.min(1000, requestedLegacyLimit));
    const legacyRecovered = [];
    const legacyDispatchSortMs = (job = {}) => {
      const ms = Date.parse(String(
        job?.dispatch?.firstDispatchRequestedAt
        || job?.dispatch?.completionQueueRequestedAt
        || job?.dispatch?.completionSweepRequestedAt
        || job?.dispatch?.dispatchRequestedAt
        || job?.startedAt
        || job?.createdAt
        || ''
      ));
      return Number.isFinite(ms) ? ms : Number.MAX_SAFE_INTEGER;
    };
    const legacyCandidates = (
      typeof storage.listStaleCompletionQueuedJobs === 'function'
      && typeof storage.listStaleCompletionSweepJobs === 'function'
    )
      ? [
          ...(await storage.listStaleCompletionQueuedJobs({
            limit: legacyLimit,
            maxAgeMs: workflowDispatchMaxAgeMs(env),
            minAgeMs: completionQueueRecoveryStaleMs(env)
          })),
          ...(await storage.listStaleCompletionSweepJobs({
            limit: legacyLimit,
            maxAgeMs: workflowDispatchMaxAgeMs(env),
            minAgeMs: completionQueueRecoveryStaleMs(env)
          }))
        ]
          .filter((job, index, all) => job?.id && all.findIndex((item) => item?.id === job.id) === index)
          .filter((job) => job?.assignedAgentId)
          .sort((a, b) => legacyDispatchSortMs(a) - legacyDispatchSortMs(b))
          .slice(0, legacyLimit)
      : (Array.isArray((typeof storage.getFreshState === 'function' ? await storage.getFreshState() : await storage.getState())?.jobs)
          ? (typeof storage.getFreshState === 'function' ? await storage.getFreshState() : await storage.getState()).jobs
          : [])
          .filter((job) => ['queued', 'running'].includes(String(job?.status || '').trim().toLowerCase()))
          .filter((job) => job?.assignedAgentId)
          .filter((job) => ['completion_queued', 'completion_sweep_running'].includes(String(job?.dispatch?.completionStatus || '').trim().toLowerCase()))
          .sort((a, b) => legacyDispatchSortMs(a) - legacyDispatchSortMs(b))
          .slice(0, legacyLimit);
    for (const candidate of legacyCandidates) {
      try {
        const approvalPause = await pauseWorkflowChildDispatchForParentAuthority(storage, candidate);
        if (approvalPause.paused) {
          if (candidate.workflowParentId) await reconcileWorkflowParent(storage, candidate.workflowParentId);
          continue;
        }
        const reset = typeof storage.mutateJobAndAgent === 'function'
          ? await storage.mutateJobAndAgent(candidate.id, candidate.assignedAgentId, (draft) => {
              const draftJob = draft.jobs.find((item) => item.id === candidate.id);
              if (!draftJob || isTerminalJobStatus(draftJob.status)) return null;
              draftJob.status = 'queued';
              draftJob.startedAt = null;
              draftJob.dispatch = {
                ...(draftJob.dispatch || {}),
                completionStatus: 'dispatch_scheduled',
                retryable: true,
                nextRetryAt: null,
                endpointDispatchRecoveredAt: nowIso()
              };
              draftJob.logs = [...(draftJob.logs || []), 'legacy completion sweep converted this job to endpoint dispatch'];
              return cloneJob(draftJob);
            })
          : await storage.mutate((draft) => {
              const draftJob = draft.jobs.find((item) => item.id === candidate.id);
              if (!draftJob || isTerminalJobStatus(draftJob.status)) return null;
              draftJob.status = 'queued';
              draftJob.startedAt = null;
              draftJob.dispatch = {
                ...(draftJob.dispatch || {}),
                completionStatus: 'dispatch_scheduled',
                retryable: true,
                nextRetryAt: null,
                endpointDispatchRecoveredAt: nowIso()
              };
              draftJob.logs = [...(draftJob.logs || []), 'legacy completion sweep converted this job to endpoint dispatch'];
              return cloneJob(draftJob);
            });
        if (!reset) continue;
        if (workflowDispatchQueue(env)) {
          await enqueueEndpointDispatch(env, reset, { id: reset.assignedAgentId }, {
            workflowParentId: reset.workflowParentId || null,
            source: options.source || 'legacy-completion-sweep'
          });
          legacyRecovered.push(reset.id);
        } else {
          const dispatch = await dispatchExistingJobToAssignedAgent(storage, env, reset.id, reset.assignedAgentId);
          if (!dispatch?.error) legacyRecovered.push(reset.id);
        }
      } catch (error) {
        await touchEvent(storage, 'FAILED', `${String(candidate?.taskType || 'job')}/${String(candidate?.id || '').slice(0, 6)} endpoint dispatch recovery exception ${String(error?.message || error).slice(0, 120)}`);
      }
    }
    const dispatchSweep = await runQueuedEndpointDispatchSweep(storage, env, {
      source: options.source || 'legacy-completion-sweep',
      cron: options.cron || '',
      limit: options.limit || env?.QUEUED_DISPATCH_SWEEP_LIMIT || 8,
      reason: 'legacy completion sweep converted to endpoint dispatch'
    });
    return {
      ok: true,
      mode: 'external_agent_dispatch_contract',
      completed_count: 0,
      queued_count: 0,
      job_ids: [],
      queued_job_ids: [],
      scanned_count: legacyCandidates.length + (dispatchSweep.scheduled_count || 0),
      skipped: {},
      expired_count: 0,
      expired_job_ids: [],
      recovered_queued_count: 0,
      recovered_queued_job_ids: [],
      retried_recovered_sweep_count: 0,
      retried_recovered_sweep_job_ids: [],
      endpoint_dispatch_count: legacyRecovered.length + (dispatchSweep.scheduled_count || 0),
      endpoint_dispatch_job_ids: [...legacyRecovered, ...(dispatchSweep.job_ids || [])]
    };
  }
  
  async function verifyInternalCronRequest(request, env, cron = '') {
    const provided = String(request.headers.get('x-cait-cron-token') || '').trim();
    const scheduledTime = Number(request.headers.get('x-cait-cron-time') || Date.now()) || Date.now();
    if (provided) {
      for (const offset of [0, -60_000, 60_000]) {
        const expected = await internalCronToken(env, cron, scheduledTime + offset);
        if (secretEquals(provided, expected)) return true;
      }
    }
    const e2eSecret = e2eAuthSecret(env);
    const providedE2e = String(request.headers.get('x-e2e-auth-secret') || '').trim();
    return Boolean(e2eSecret && providedE2e && secretEquals(providedE2e, e2eSecret));
  }
  
  async function handleInternalWorkflowCompletionSweep(request, env) {
    let body = {};
    try {
      body = await parseBody(request);
    } catch {}
    const cron = String(body.cron || request.headers.get('x-cait-cron') || '').trim();
    if (!(await verifyInternalCronRequest(request, env, cron))) return json({ error: 'Not found' }, 404);
    const storage = runtimeStorage(env);
    const result = await recoverWorkflowEndpointDispatchJobs(storage, env, {
      source: 'internal-cron-fetch',
      cron,
      limit: Number(body.limit || env?.SCHEDULED_BUILTIN_COMPLETION_SWEEP_LIMIT || 2) || 2
    });
    return json({ ok: true, ...result });
  }
  
  async function runMinuteWorkflowCompletionSweep(storage, env, cron = '', scheduledTime = Date.now()) {
    const dispatchSweep = await recoverWorkflowEndpointDispatchJobs(storage, env, {
      source: 'minute-cron-endpoint-dispatch',
      cron,
      limit: Math.min(8, Number(env?.QUEUED_DISPATCH_SWEEP_LIMIT || 8) || 8)
    });
    return {
      ok: true,
      mode: 'external_agent_dispatch_contract',
      scheduledTime,
      endpoint_dispatch_count: dispatchSweep.endpoint_dispatch_count || dispatchSweep.scheduled_count || 0,
      endpoint_dispatch_job_ids: dispatchSweep.endpoint_dispatch_job_ids || dispatchSweep.job_ids || []
    };
  }
  
  async function processWorkflowDispatchQueueMessage(storage, env, body = {}) {
    const message = body && typeof body === 'object' ? body : {};
    const kind = String(message.kind || message.type || '').trim();
    if (kind === 'endpoint_dispatch') {
      const jobId = String(message.jobId || message.job_id || '').trim();
      const agentId = String(message.agentId || message.agent_id || '').trim();
      if (!jobId || !agentId) return { ok: false, mode: 'invalid', error: 'Missing jobId or agentId' };
      await touchEvent(storage, 'RUNNING', `endpoint dispatch queue received ${jobId.slice(0, 6)}`, {
        kind: 'endpoint_dispatch_received',
        jobId,
        agentId,
        parentJobId: message.workflowParentId || message.workflow_parent_id || null
      });
      const approvalPauseJob = typeof storage.getJobById === 'function' ? await storage.getJobById(jobId) : null;
      if (approvalPauseJob?.workflowParentId) {
        const approvalPause = await pauseWorkflowChildDispatchForParentAuthority(storage, approvalPauseJob, { agentId });
        if (approvalPause.paused) {
          await touchEvent(storage, 'RUNNING', `${approvalPauseJob.taskType}/${approvalPauseJob.id.slice(0, 6)} endpoint dispatch queue paused while parent waits for approval`, {
            kind: 'dispatch_paused_for_parent_authority',
            jobId: approvalPauseJob.id,
            parentJobId: approvalPauseJob.workflowParentId || null
        });
        await reconcileWorkflowParent(storage, approvalPauseJob.workflowParentId);
        return { ok: true, mode: 'parent_authority_wait' };
        }
      }
      const dispatch = await dispatchExistingJobToAssignedAgent(storage, env, jobId, agentId, {
        source: message.source || 'endpoint-dispatch-queue',
        nextDispatchMode: 'queue'
      });
      await touchEvent(storage, dispatch?.error ? 'FAILED' : 'RUNNING', `endpoint dispatch queue processed ${jobId.slice(0, 6)} mode=${dispatch?.mode || 'unknown'}`, {
        kind: 'endpoint_dispatch_processed',
        jobId,
        agentId,
        parentJobId: message.workflowParentId || message.workflow_parent_id || null,
        mode: dispatch?.mode || null
      });
      return {
        ok: !dispatch?.error,
        mode: dispatch?.mode || 'endpoint_dispatch',
        dispatch
      };
    }
    return { ok: true, mode: 'ignored' };
  }
  
  async function runQueuedEndpointDispatchSweep(storage, env, options = {}) {
    const limit = Math.max(1, Math.min(20, Number(options.limit || 12) || 12));
    const scheduled = [];
    const acceptedRecovered = [];
    const scheduledJobIds = new Set();
    const scheduledRootJobIds = new Set();
    const skippedRootJobIds = new Set();
    if (
      storage?.kind === 'd1'
      && typeof storage.listScheduledWorkflowJobs === 'function'
      && typeof storage.listStaleDispatchInProgressJobs === 'function'
      && typeof storage.listQueuedWorkflowDispatchRoots === 'function'
      && typeof storage.listAcceptedEndpointDispatchJobs === 'function'
      && typeof storage.getAgentById === 'function'
    ) {
      const scheduledCandidates = await storage.listScheduledWorkflowJobs({
        limit,
        maxAgeMs: workflowDispatchMaxAgeMs(env),
        minAgeMs: DISPATCH_SCHEDULE_STALE_MS
      });
      const inProgressCandidates = await storage.listStaleDispatchInProgressJobs({
        limit,
        maxAgeMs: workflowDispatchMaxAgeMs(env),
        minAgeMs: DISPATCH_IN_PROGRESS_STALE_MS
      });
      const lightCandidates = [...scheduledCandidates, ...inProgressCandidates]
        .filter((job, index, all) => job?.id && all.findIndex((item) => item?.id === job.id) === index)
        .sort((left, right) => String(
          left?.dispatch?.dispatchInProgressAt
          || left?.dispatch?.lastAttemptAt
          || left?.dispatch?.firstDispatchRequestedAt
          || left?.dispatch?.dispatchRequestedAt
          || left?.startedAt
          || left?.createdAt
          || ''
        ).localeCompare(String(
          right?.dispatch?.dispatchInProgressAt
          || right?.dispatch?.lastAttemptAt
          || right?.dispatch?.firstDispatchRequestedAt
          || right?.dispatch?.dispatchRequestedAt
          || right?.startedAt
          || right?.createdAt
          || ''
        )))
        .slice(0, limit);
      for (const candidate of lightCandidates) {
        const rootJobId = String(candidate.workflowParentId || candidate.id || '').trim();
        if (!rootJobId || skippedRootJobIds.has(rootJobId) || scheduledRootJobIds.has(rootJobId) || scheduledJobIds.has(candidate.id)) continue;
        const agent = await storage.getAgentById(candidate.assignedAgentId);
        if (!agent) {
          skippedRootJobIds.add(rootJobId);
          continue;
        }
        const approvalPause = await pauseWorkflowChildDispatchForParentAuthority(storage, candidate);
        if (approvalPause.paused) {
          skippedRootJobIds.add(rootJobId);
          if (candidate.workflowParentId) await reconcileWorkflowParent(storage, candidate.workflowParentId);
          continue;
        }
        if (workflowChildShouldRestartFromBeginning(candidate) && providerRunLimitReached(env, candidate)) {
          const reason = workflowRestartRequiredReason(candidate, `provider run limit reached (${providerRunAttempts(candidate)}/${workflowProviderRunMaxAttempts(env, candidate)})`);
          const failed = await failJob(storage, candidate.id, reason, ['provider run limit reached during sweep; full order retry required'], {
            failureStatus: 'failed',
            failureCategory: 'workflow_restart_required',
            retryable: false,
            attempts: providerRunAttempts(candidate),
            maxRetries: workflowProviderRunMaxAttempts(env, candidate),
            restartRequired: true,
            source: 'queued-dispatch-sweep'
          });
          skippedRootJobIds.add(rootJobId);
          if (failed?.workflowParentId || candidate.workflowParentId) await reconcileWorkflowParent(storage, candidate.workflowParentId || failed.workflowParentId);
          await touchEvent(storage, 'FAILED', `${candidate.taskType}/${candidate.id.slice(0, 6)} provider run limit reached; full order retry required`, {
            kind: 'provider_run_limit_reached',
            jobId: candidate.id,
            parentJobId: candidate.workflowParentId || null
          });
          continue;
        }
        const marked = await markDispatchScheduled(storage, candidate.id, agent.id, options.reason || 'cron dispatch sweep', {
          env,
          workflowLeaderHandoff: null
        });
        if (!marked?.scheduled) {
          skippedRootJobIds.add(rootJobId);
          if (marked?.restartRequired && marked.job?.workflowParentId) await reconcileWorkflowParent(storage, marked.job.workflowParentId);
          continue;
        }
        scheduledJobIds.add(marked.job.id);
        scheduledRootJobIds.add(rootJobId);
        scheduled.push(marked.job.id);
        await touchEvent(storage, 'RUNNING', `${marked.agent.name} scheduled ${marked.job.taskType}/${marked.job.id.slice(0, 6)}`, {
          kind: 'dispatch_scheduled',
          jobId: marked.job.id,
          parentJobId: marked.job.workflowParentId || rootJobId
        });
        if (workflowDispatchQueue(env)) {
          await enqueueEndpointDispatch(env, marked.job, marked.agent, {
            workflowParentId: marked.job.workflowParentId || rootJobId,
            source: options.reason || 'cron dispatch sweep'
          });
          await touchEvent(storage, 'RUNNING', `${marked.agent.name} queued ${marked.job.taskType}/${marked.job.id.slice(0, 6)} for endpoint dispatch`, {
            kind: 'endpoint_dispatch_queued',
            jobId: marked.job.id,
            parentJobId: marked.job.workflowParentId || rootJobId
          });
        } else {
          const dispatch = await dispatchExistingJobToAssignedAgent(storage, env, marked.job.id, marked.agent.id)
            .catch((error) => ({ error: String(error?.message || error) }));
          if (dispatch?.error) await touchEvent(storage, 'FAILED', `${marked.job.taskType}/${marked.job.id.slice(0, 6)} light dispatch sweep failed ${String(dispatch.error).slice(0, 120)}`);
        }
      }
      if (scheduled.length) {
        await touchEvent(storage, 'RUNNING', `queued endpoint dispatch sweep scheduled ${scheduled.length} job(s)`, {
          kind: 'queued_dispatch_sweep',
          jobIds: scheduled
        });
      }
      if (scheduled.length < limit) {
        const queuedRootIds = await storage.listQueuedWorkflowDispatchRoots({
          limit: Math.max(1, limit - scheduled.length),
          maxAgeMs: workflowDispatchMaxAgeMs(env)
        });
        for (const rootJobId of queuedRootIds) {
          if (scheduled.length >= limit) break;
          if (!rootJobId || skippedRootJobIds.has(rootJobId) || scheduledRootJobIds.has(rootJobId)) continue;
          const result = await scheduleProgressDispatchesForJobId(storage, env, options.waitUntil, rootJobId, options.reason || 'cron dispatch sweep', {
            maxTargets: Math.max(1, limit - scheduled.length),
            refresh: true
          });
          if (!result?.scheduled) {
            skippedRootJobIds.add(rootJobId);
            continue;
          }
          const scheduledIds = Array.isArray(result.jobs) && result.jobs.length
            ? result.jobs.map((job) => job?.id).filter(Boolean)
            : [result.job?.id].filter(Boolean);
          for (const scheduledJobId of scheduledIds) {
            if (!scheduledJobId || scheduledJobIds.has(scheduledJobId)) continue;
            scheduledJobIds.add(scheduledJobId);
            scheduled.push(scheduledJobId);
          }
          if (scheduledIds.length) scheduledRootJobIds.add(rootJobId);
        }
      }
      {
        const acceptedRecoveryLimit = Math.max(0, Math.min(4, Number(env?.ACCEPTED_ENDPOINT_RECOVERY_LIMIT || env?.ACCEPTED_ENDPOINT_RECOVERY_MAX_ATTEMPTS || 0) || 0));
        const acceptedTime = (job = {}) => Date.parse(String(
          job?.dispatch?.providerQueueAcceptedAt
          || job?.dispatch?.lastAttemptAt
          || job?.dispatchedAt
          || job?.startedAt
          || job?.createdAt
          || ''
        )) || 0;
        const acceptedCandidates = acceptedRecoveryLimit > 0
          ? await storage.listAcceptedEndpointDispatchJobs({
              limit: Math.max(limit, acceptedRecoveryLimit * 4),
              maxAgeMs: workflowDispatchMaxAgeMs(env),
              minAgeMs: DISPATCH_IN_PROGRESS_STALE_MS
            })
          : [];
        for (const candidate of acceptedCandidates.sort((left, right) => acceptedTime(right) - acceptedTime(left))) {
          if (acceptedRecovered.length >= acceptedRecoveryLimit) break;
          if (!candidate?.id || scheduledJobIds.has(candidate.id)) continue;
          const rootJobId = String(candidate.workflowParentId || candidate.id || '').trim();
          if (!rootJobId || skippedRootJobIds.has(rootJobId)) continue;
          if (workflowChildShouldRestartFromBeginning(candidate)) {
            const reason = workflowRestartRequiredReason(candidate, 'accepted endpoint dispatch became stale before provider completion');
            const failed = await failJob(storage, candidate.id, reason, ['stale accepted endpoint dispatch failed; full order retry required'], {
              failureStatus: 'failed',
              failureCategory: 'workflow_restart_required',
              retryable: false,
              attempts: providerRunAttempts(candidate),
              maxRetries: workflowProviderRunMaxAttempts(env, candidate),
              restartRequired: true,
              source: 'accepted-endpoint-recovery'
            });
            skippedRootJobIds.add(rootJobId);
            if (failed?.workflowParentId || candidate.workflowParentId) await reconcileWorkflowParent(storage, candidate.workflowParentId || failed.workflowParentId);
            await touchEvent(storage, 'FAILED', `${candidate.taskType}/${candidate.id.slice(0, 6)} stale accepted endpoint dispatch requires full order retry`, {
              kind: 'workflow_restart_required',
              jobId: candidate.id,
              parentJobId: candidate.workflowParentId || null
            });
            continue;
          }
          const agent = await storage.getAgentById(candidate.assignedAgentId);
          if (!agent) {
            skippedRootJobIds.add(rootJobId);
            continue;
          }
          const reset = typeof storage.mutateJobAndAgent === 'function'
            ? await storage.mutateJobAndAgent(candidate.id, agent.id, (draft) => {
                const draftJob = draft.jobs.find((item) => item.id === candidate.id);
                const draftAgent = draft.agents.find((item) => item.id === agent.id);
                if (!draftJob || !draftAgent || isTerminalJobStatus(draftJob.status)) return null;
                const recoveryAttempts = acceptedEndpointRecoveryAttempts(draftJob) + 1;
                draftJob.status = 'running';
                draftJob.startedAt = draftJob.startedAt || nowIso();
                draftJob.dispatch = {
                  ...(draftJob.dispatch || {}),
                  completionStatus: 'dispatch_scheduled',
                  retryable: true,
                  nextRetryAt: null,
                  acceptedEndpointRecoveryAttempts: recoveryAttempts,
                  endpointDispatchRecoveredAt: nowIso(),
                  acceptedEndpointRecoveredAt: nowIso()
                };
                draftJob.logs = [
                  ...(draftJob.logs || []),
                  `legacy accepted endpoint dispatch recovered for ${draftAgent.id}`
                ];
                return cloneJob(draftJob);
              })
            : null;
          if (!reset) {
            skippedRootJobIds.add(rootJobId);
            await touchEvent(storage, 'FAILED', `${candidate.taskType}/${candidate.id.slice(0, 6)} accepted endpoint recovery failed`, {
              kind: 'accepted_endpoint_recovery_failed',
              jobId: candidate.id,
              parentJobId: candidate.workflowParentId || null
            });
            continue;
          }
          await enqueueEndpointDispatch(env, reset, agent, {
            workflowParentId: reset.workflowParentId || rootJobId,
            source: options.reason || 'accepted-endpoint-recovery'
          });
          scheduledJobIds.add(candidate.id);
          scheduledRootJobIds.add(rootJobId);
          acceptedRecovered.push(candidate.id);
          scheduled.push(candidate.id);
          await touchEvent(storage, 'RUNNING', `${agent.name || agent.id} recovered accepted ${candidate.taskType}/${candidate.id.slice(0, 6)} as normal endpoint dispatch`, {
            kind: 'accepted_endpoint_recovered',
            jobId: candidate.id,
            parentJobId: candidate.workflowParentId || null
          });
        }
      }
      if (scheduled.length >= limit) {
        return { ok: true, scheduled_count: scheduled.length, job_ids: scheduled, accepted_endpoint_recovered_count: acceptedRecovered.length, accepted_endpoint_recovered_job_ids: acceptedRecovered, mode: 'd1_light_dispatch_sweep' };
      }
      return { ok: true, scheduled_count: scheduled.length, job_ids: scheduled, accepted_endpoint_recovered_count: acceptedRecovered.length, accepted_endpoint_recovered_job_ids: acceptedRecovered, mode: 'd1_light_dispatch_sweep' };
    }
    for (let i = 0; i < limit; i += 1) {
      const state = typeof storage.getFreshState === 'function' ? await storage.getFreshState() : await storage.getState();
      const candidates = state.jobs
        .filter((job) => ['queued', 'running'].includes(String(job.status || '').toLowerCase()))
        .filter((job) => jobWithinDispatchAge(job, env))
        .filter((job) => job.jobKind === 'workflow' || job.workflowParentId || (job.assignedAgentId && !job.workflowParentId))
        .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
      let picked = null;
      const consideredRootJobIds = new Set();
      for (const candidate of candidates) {
        const rootJobId = String(candidate.workflowParentId || candidate.id || '').trim();
        if (!rootJobId || consideredRootJobIds.has(rootJobId) || skippedRootJobIds.has(rootJobId)) continue;
        consideredRootJobIds.add(rootJobId);
        const target = pickProgressDispatchTarget(state, rootJobId);
        if (target && !scheduledJobIds.has(target.job.id)) {
          picked = { candidate, rootJobId, targetJobId: target.job.id };
          break;
        }
      }
      if (!picked) break;
      const result = await scheduleProgressDispatchesForJobId(storage, env, options.waitUntil, picked.rootJobId, options.reason || 'cron dispatch sweep', {
        maxTargets: Math.max(1, limit - scheduled.length),
        refresh: false
      });
      if (!result?.scheduled) {
        skippedRootJobIds.add(picked.rootJobId);
        continue;
      }
      const scheduledIds = Array.isArray(result.jobs) && result.jobs.length
        ? result.jobs.map((job) => job?.id).filter(Boolean)
        : [result.job?.id || picked.targetJobId || picked.candidate.id].filter(Boolean);
      for (const scheduledJobId of scheduledIds) {
        if (scheduledJobIds.has(scheduledJobId)) continue;
        scheduledJobIds.add(scheduledJobId);
        scheduled.push(scheduledJobId);
      }
    }
    if (scheduled.length) {
      await touchEvent(storage, 'RUNNING', `queued endpoint dispatch sweep scheduled ${scheduled.length} job(s)`, {
        kind: 'queued_dispatch_sweep',
        jobIds: scheduled
      });
    }
    return { ok: true, scheduled_count: scheduled.length, job_ids: scheduled };
  }

  return {
    handleInternalWorkflowCompletionSweep,
    markDispatchScheduled,
    pickProgressDispatchTarget,
    pickProgressDispatchTargets,
    processWorkflowDispatchQueueMessage,
    recoverWorkflowEndpointDispatchJobs,
    runMinuteWorkflowCompletionSweep,
    runQueuedEndpointDispatchSweep,
    scheduleInitialWorkflowDispatchFromChildren,
    scheduleNextWorkflowDispatchLightweight,
    scheduleProgressDispatchForJobId,
    scheduleProgressDispatchesForJobId,
    verifyInternalCronRequest
  };
}
