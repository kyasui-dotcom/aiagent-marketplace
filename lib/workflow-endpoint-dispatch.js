export function createWorkflowEndpointDispatchHelpers(dependencies = {}) {
  const {
    WORKFLOW_PROGRESS_DISPATCH_MAX_TARGETS,
    agentCompletionFailureReason,
    appendWorkflowOriginalInfoUsage,
    authorityRequestFromReport,
    authorityRequestHandledBySaasHandoff,
    billingLogLine,
    buildDispatchFailureMeta,
    buildDispatchHeaders,
    buildDispatchPayload,
    clearDeliveryCompletionGate,
    cloneJob,
    completeWorkflowSaasHandoffOnlyChild,
    computeNextRetryAt,
    dispatchExecutionIsFresh,
    dispatchScheduleIsFreshForAgent,
    endpointDispatchTimeoutMs,
    estimateBilling,
    failJob,
    isTerminalJobStatus,
    markAgentCompletionFailedFreeInState,
    markJobBlockedForAuthority,
    markWorkflowParentBlockedIfNeeded,
    maxDispatchRetriesForJob,
    normalizeDispatchResponse,
    nowIso,
    postJsonWithTimeout,
    providerRunAttempts,
    providerRunLimitReached,
    recordBillingOutcome,
    reconcileWorkflowParent,
    refreshWorkflowLeaderHandoffForJobId,
    releaseBillingReservationInState,
    resolveAgentJobEndpoint,
    resolveDispatchEndpointUrl,
    scheduleProgressDispatchesForJobId,
    setDeliveryCompletionGate,
    settleAgentEarnings,
    shouldBlockCompletedJobForAuthorityRequest,
    sourceCollectionFailureRetryMeta,
    syncJobAuthorityRequest,
    touchEvent,
    usageWithObservedJobTokens,
    workflowChildDispatchFailureRequiresRestart,
    workflowChildIsAdaptivePending,
    workflowChildIsSaasHandoffOnly,
    workflowChildShouldRestartFromBeginning,
    workflowCompletionRetryLimitForJob,
    workflowDispatchQueue,
    workflowPrimaryTaskFromJobOrProfile,
    workflowProviderRunMaxAttempts,
    workflowRestartRequiredReason,
    workflowSearchCompletionFailureReason,
    workflowTaskName
  } = dependencies;

  async function dispatchJobToAssignedAgent(job, agent, env) {
    const endpoint = resolveAgentJobEndpoint(agent);
    const dispatchEndpoint = resolveDispatchEndpointUrl(endpoint, env);
    if (!dispatchEndpoint) {
      return { ok: false, failureReason: 'Assigned verified agent does not expose a job endpoint in manifest metadata' };
    }
    const payload = buildDispatchPayload(job, agent);
    const dispatchHeaders = buildDispatchHeaders(agent);
    const timeoutMs = endpointDispatchTimeoutMs(env, job, agent);
    const dispatchResult = await postJsonWithTimeout(dispatchEndpoint, payload, timeoutMs, dispatchHeaders);
    const { response, body } = dispatchResult;
    const observedEndpoint = dispatchEndpoint;
    if (!response.ok) {
      const reason = body?.error || body?.message || `Dispatch failed with status ${response.status}`;
      return { ok: false, endpoint: observedEndpoint, failureReason: reason, statusCode: response.status, responseBody: body };
    }
    const normalized = normalizeDispatchResponse(body);
    if (normalized.failed) {
      return { ok: false, endpoint: observedEndpoint, failureReason: normalized.failureReason || 'Agent reported failure', statusCode: response.status, responseBody: body };
    }
    normalized.usage = usageWithObservedJobTokens(job, normalized.usage, normalized.report);
    if (!normalized.accepted && !normalized.completed && !normalized.blocked) {
      return { ok: false, endpoint: observedEndpoint, failureReason: 'Dispatch response was malformed or did not acknowledge the job', statusCode: response.status, responseBody: body };
    }
    return { ok: true, endpoint: observedEndpoint, normalized, statusCode: response.status, responseBody: body };
  }
  
  async function loadDispatchJobAndAgent(storage, jobId, agentId) {
    if (
      typeof storage?.getJobById === 'function'
      && typeof storage?.getAgentById === 'function'
    ) {
      const [job, agent] = await Promise.all([
        storage.getJobById(jobId),
        storage.getAgentById(agentId)
      ]);
      return { job, agent };
    }
    const state = await storage.getState();
    return {
      job: state.jobs.find((item) => item.id === jobId),
      agent: state.agents.find((item) => item.id === agentId)
    };
  }
  
  async function dispatchExistingJobToAssignedAgent(storage, env, jobId, agentId, options = {}) {
    const { job, agent } = await loadDispatchJobAndAgent(storage, jobId, agentId);
    if (!job) return { error: 'Job not found', statusCode: 404 };
    if (!agent) return { error: 'Agent not found', statusCode: 404 };
    if (isTerminalJobStatus(job.status) && !workflowChildIsAdaptivePending(job)) {
      return { ok: true, mode: job.status, job: cloneJob(job) };
    }
    if (!resolveAgentJobEndpoint(agent)) {
      return { ok: true, mode: 'queued', job: cloneJob(job) };
    }
    if (dispatchExecutionIsFresh(job, agent)) {
      return { ok: true, mode: 'running', job: cloneJob(job), skippedInProgress: true };
    }
    if (workflowChildShouldRestartFromBeginning(job) && providerRunLimitReached(env, job)) {
      const reason = workflowRestartRequiredReason(job, `provider run limit reached (${providerRunAttempts(job)}/${workflowProviderRunMaxAttempts(env, job)})`);
      const failed = await failJob(storage, job.id, reason, ['provider run limit reached; full order retry required'], {
        failureStatus: 'failed',
        failureCategory: 'workflow_restart_required',
        retryable: false,
        attempts: providerRunAttempts(job),
        maxRetries: workflowProviderRunMaxAttempts(env, job),
        restartRequired: true,
        source: 'provider-run-limit'
      });
      await touchEvent(storage, 'FAILED', `${job.taskType}/${job.id.slice(0, 6)} provider run limit reached; retry from beginning`, {
        kind: 'provider_run_limit_reached',
        jobId: job.id,
        parentJobId: job.workflowParentId || null,
        attempts: providerRunAttempts(job),
        maxAttempts: workflowProviderRunMaxAttempts(env, job)
      });
      return { ok: true, mode: 'failed', job: failed, restartRequired: true, error: reason };
    }
    const lockDispatchJob = async (draft) => {
      const draftJob = draft.jobs.find((item) => item.id === job.id);
      const draftAgent = draft.agents.find((item) => item.id === agent.id);
      if (!draftJob) return { error: 'Job disappeared before dispatch lock', statusCode: 500 };
      if (!draftAgent) return { error: 'Agent disappeared before dispatch lock', statusCode: 500 };
      if (isTerminalJobStatus(draftJob.status) && !workflowChildIsAdaptivePending(draftJob)) {
        return { ok: true, mode: draftJob.status, job: cloneJob(draftJob), skippedTerminal: true };
      }
      if (dispatchExecutionIsFresh(draftJob, draftAgent)) {
        return { ok: true, mode: 'running', job: cloneJob(draftJob), skippedInProgress: true };
      }
      const completionStatus = String(draftJob.dispatch?.completionStatus || '').trim().toLowerCase();
      if (workflowChildShouldRestartFromBeginning(draftJob) && providerRunLimitReached(env, draftJob)) {
        const failedAt = nowIso();
        draftJob.status = 'failed';
        draftJob.failedAt = failedAt;
        draftJob.timedOutAt = null;
        draftJob.completedAt = null;
        draftJob.failureCategory = 'workflow_restart_required';
        draftJob.failureReason = workflowRestartRequiredReason(draftJob, `provider run limit reached (${providerRunAttempts(draftJob)}/${workflowProviderRunMaxAttempts(env, draftJob)})`);
        if (draftJob.billingReservation && !draftJob.billingSettlement?.settledAt && !draftJob.billingReservation?.releasedAt) {
          releaseBillingReservationInState(draft, draftJob);
        }
        draftJob.dispatch = {
          ...(draftJob.dispatch || {}),
          completionStatus: 'workflow_restart_required',
          failedAt,
          retryable: false,
          nextRetryAt: null,
          restartRequired: true,
          attempts: providerRunAttempts(draftJob),
          maxRetries: workflowProviderRunMaxAttempts(env, draftJob)
        };
        draftJob.logs = [...(draftJob.logs || []), 'provider run limit reached before dispatch; full order retry required'];
        return { ok: true, mode: 'failed', job: cloneJob(draftJob), restartRequired: true };
      }
      if (completionStatus && !['dispatch_scheduled', 'dispatch_in_progress', 'timed_out', 'failed', 'retry_queued', 'leader_auto_retry_queued', 'leader_checkpoint_queued', 'leader_final_summary_queued', 'leader_adaptive_queued'].includes(completionStatus)) {
        return { ok: true, mode: draftJob.status || completionStatus, job: cloneJob(draftJob), skippedLocked: true };
      }
      const at = nowIso();
      const providerRunAttempt = providerRunAttempts(draftJob) + 1;
      const dispatchTimeoutMs = endpointDispatchTimeoutMs(env, draftJob, draftAgent);
      draftJob.status = 'running';
      draftJob.startedAt = draftJob.startedAt || at;
      draftJob.dispatch = {
        ...(draftJob.dispatch || {}),
        endpoint: resolveAgentJobEndpoint(draftAgent),
        dispatchInProgressAt: at,
        dispatchTimeoutMs,
        lastAttemptAt: at,
        completionStatus: 'dispatch_in_progress',
        retryable: false,
        nextRetryAt: null,
        maxRetries: maxDispatchRetriesForJob(draftJob),
        providerRunAttempts: providerRunAttempt,
        providerRunMaxAttempts: workflowProviderRunMaxAttempts(env, draftJob)
      };
      draftJob.logs = [...(draftJob.logs || []), `dispatch locked for ${draftAgent.id} provider_run_attempt=${providerRunAttempt}/${workflowProviderRunMaxAttempts(env, draftJob)}`];
      return { ok: true, mode: 'locked', job: cloneJob(draftJob), agent: structuredClone(draftAgent) };
    };
    const locked = typeof storage.mutateJobAndAgent === 'function'
      ? await storage.mutateJobAndAgent(job.id, agent.id, lockDispatchJob)
      : await storage.mutate(lockDispatchJob);
    if (locked?.error) return { error: locked.error, statusCode: locked.statusCode || 500 };
    if (locked?.mode && locked.mode !== 'locked') {
      if (locked.mode === 'failed' && locked.job?.workflowParentId) await reconcileWorkflowParent(storage, locked.job.workflowParentId);
      return locked;
    }
    const dispatchJob = locked?.job || job;
    const dispatchAgent = locked?.agent || agent;
    try {
      const dispatch = await dispatchJobToAssignedAgent(dispatchJob, dispatchAgent, env);
      const mutateDispatchResult = async (draft) => {
        const draftJob = draft.jobs.find((item) => item.id === dispatchJob.id);
        const draftAgent = draft.agents.find((item) => item.id === dispatchAgent.id);
        if (!draftJob) return { error: 'Job disappeared during dispatch', statusCode: 500 };
        if (isTerminalJobStatus(draftJob.status)) {
          return { ok: true, mode: draftJob.status, job: cloneJob(draftJob), skippedTerminal: true };
        }
        if (String(draftJob.status || '').trim().toLowerCase() === 'blocked') {
          return { ok: true, mode: 'blocked', job: cloneJob(draftJob), skippedBlocked: true };
        }
        if (!dispatch.ok) {
          const failureMeta = buildDispatchFailureMeta(draftJob, dispatch.statusCode, dispatch.failureReason);
          const sourceRetryMeta = failureMeta.category === 'missing_required_sources'
            ? sourceCollectionFailureRetryMeta(env, draftJob)
            : null;
          const effectiveFailureMeta = sourceRetryMeta
            ? { ...failureMeta, ...sourceRetryMeta, category: failureMeta.category }
            : failureMeta;
          const restartRequired = workflowChildDispatchFailureRequiresRestart(env, draftJob, effectiveFailureMeta);
          draftJob.status = 'failed';
          draftJob.failedAt = nowIso();
          draftJob.failureReason = restartRequired ? workflowRestartRequiredReason(draftJob, dispatch.failureReason) : dispatch.failureReason;
          draftJob.failureCategory = restartRequired ? 'workflow_restart_required' : failureMeta.category;
          if (draftJob.billingReservation && !draftJob.billingReservation?.releasedAt) {
            releaseBillingReservationInState(draft, draftJob);
          }
          draftJob.dispatch = {
            ...(draftJob.dispatch || {}),
            endpoint: dispatch.endpoint || draftJob.dispatch?.endpoint || null,
            statusCode: dispatch.statusCode || null,
            responseStatus: dispatch.responseBody?.status || null,
            lastAttemptAt: nowIso(),
            attempts: providerRunAttempts(draftJob) || effectiveFailureMeta.attempts,
            retryable: restartRequired ? false : (sourceRetryMeta?.retryable ?? failureMeta.retryable),
            nextRetryAt: restartRequired ? null : (sourceRetryMeta?.nextRetryAt ?? failureMeta.nextRetryAt),
            maxRetries: sourceRetryMeta?.maxRetries ?? workflowCompletionRetryLimitForJob(env, draftJob),
            completionStatus: restartRequired ? 'workflow_restart_required' : 'failed',
            restartRequired
          };
          draftJob.logs = [...(draftJob.logs || []), `dispatch failed for ${dispatchAgent.id}`, dispatch.failureReason, restartRequired ? 'full order retry required' : `retryable=${sourceRetryMeta?.retryable ?? failureMeta.retryable}`];
          return { ok: true, mode: 'failed', job: cloneJob(draftJob) };
        }
  
        draftJob.dispatchedAt = nowIso();
        draftJob.startedAt = draftJob.startedAt || draftJob.dispatchedAt;
        draftJob.status = 'dispatched';
        draftJob.dispatch = {
          ...(draftJob.dispatch || {}),
          endpoint: dispatch.endpoint,
          statusCode: dispatch.statusCode,
          externalJobId: dispatch.normalized.externalJobId,
          responseStatus: dispatch.normalized.status,
          lastAttemptAt: nowIso(),
          attempts: Number(draftJob.dispatch?.attempts || 0) + 1,
          retryable: false,
          nextRetryAt: null,
          completionStatus: dispatch.normalized.blocked ? 'blocked' : (dispatch.normalized.completed ? 'completed' : 'accepted'),
          ...(dispatch.normalized.accepted && !dispatch.normalized.completed && !dispatch.normalized.blocked ? { providerQueueAcceptedAt: nowIso() } : {})
        };
        draftJob.logs = [...(draftJob.logs || []), `dispatched to ${dispatchAgent.id} endpoint=${dispatch.endpoint}`];
  
        if (dispatch.normalized.completed) {
          const explicitAuthorityRequest = authorityRequestFromReport(dispatch.normalized.report);
          draftJob.status = 'completed';
          draftJob.completedAt = nowIso();
          draftJob.usage = dispatch.normalized.usage;
          draftJob.output = {
            report: dispatch.normalized.report,
            files: dispatch.normalized.files,
            returnTargets: dispatch.normalized.returnTargets
          };
          appendWorkflowOriginalInfoUsage(draftJob);
          const sourceProofFailure = workflowSearchCompletionFailureReason(draftJob, dispatch.normalized.report);
          if (sourceProofFailure) {
            const sourceRetryMeta = sourceCollectionFailureRetryMeta(env, draftJob, { alreadyAttempted: true });
            const restartRequired = workflowChildDispatchFailureRequiresRestart(env, draftJob, {
              category: 'missing_required_sources',
              ...sourceRetryMeta
            });
            draftJob.status = 'failed';
            draftJob.completedAt = null;
            draftJob.failedAt = nowIso();
            draftJob.failureReason = restartRequired ? workflowRestartRequiredReason(draftJob, sourceProofFailure) : sourceProofFailure;
            draftJob.failureCategory = restartRequired ? 'workflow_restart_required' : 'missing_required_sources';
            draftJob.actualBilling = null;
            clearDeliveryCompletionGate(draftJob);
            if (draftJob.billingReservation && !draftJob.billingReservation?.releasedAt) {
              releaseBillingReservationInState(draft, draftJob);
            }
            draftJob.dispatch = {
              ...(draftJob.dispatch || {}),
              completionStatus: restartRequired ? 'workflow_restart_required' : 'failed',
              retryable: restartRequired ? false : sourceRetryMeta.retryable,
              attempts: restartRequired ? providerRunAttempts(draftJob) : sourceRetryMeta.attempts,
              nextRetryAt: restartRequired ? null : sourceRetryMeta.nextRetryAt,
              maxRetries: sourceRetryMeta.maxRetries,
              restartRequired
            };
            draftJob.logs.push(sourceProofFailure, restartRequired ? 'full order retry required after missing search execution proof' : 'failed before completion: missing search execution proof');
            return { ok: true, mode: 'failed', job: cloneJob(draftJob) };
          }
          const completionFailure = agentCompletionFailureReason(draftJob);
          if (completionFailure) {
            markAgentCompletionFailedFreeInState(draft, draftJob, completionFailure, env, { failedAt: nowIso() });
            return { ok: true, mode: 'failed', job: cloneJob(draftJob), billing: null };
          }
          const authorityRequest = syncJobAuthorityRequest(draftJob, draftAgent);
          if (shouldBlockCompletedJobForAuthorityRequest(draftJob, authorityRequest || explicitAuthorityRequest)) {
            markJobBlockedForAuthority(draftJob, authorityRequest || explicitAuthorityRequest, 'External execution is blocked waiting for connector approval.');
            markWorkflowParentBlockedIfNeeded(draft, draftJob);
            return { ok: true, mode: 'blocked', job: cloneJob(draftJob) };
          }
          const billing = estimateBilling(dispatchAgent, dispatch.normalized.usage);
          draftJob.actualBilling = billing;
          setDeliveryCompletionGate(draftJob, draftJob.completedAt);
          draftJob.logs.push(`completed by dispatch response from ${dispatchAgent.id}`, billingLogLine(draftJob, billing), `delivery completion gate score=${draftJob.deliveryCompletionGate.score}`);
          settleAgentEarnings(draftJob, draftAgent, billing);
          return { ok: true, mode: 'completed', job: cloneJob(draftJob), billing };
        }
  
        if (dispatch.normalized.blocked) {
          const explicitAuthorityRequest = authorityRequestFromReport(dispatch.normalized.report);
          draftJob.status = 'blocked';
          draftJob.completedAt = null;
          draftJob.failedAt = null;
          draftJob.timedOutAt = null;
          draftJob.failureReason = null;
          draftJob.failureCategory = null;
          draftJob.usage = dispatch.normalized.usage;
          draftJob.output = {
            report: dispatch.normalized.report,
            files: dispatch.normalized.files,
            returnTargets: dispatch.normalized.returnTargets
          };
          appendWorkflowOriginalInfoUsage(draftJob);
          draftJob.actualBilling = null;
          clearDeliveryCompletionGate(draftJob);
          const authorityRequest = syncJobAuthorityRequest(draftJob, draftAgent);
          if (authorityRequestHandledBySaasHandoff(draftJob, authorityRequest || explicitAuthorityRequest) || workflowChildIsSaasHandoffOnly(draftJob)) {
            const primaryTask = workflowPrimaryTaskFromJobOrProfile(draftJob) || workflowTaskName(draftJob);
            completeWorkflowSaasHandoffOnlyChild({ taskType: primaryTask, workflow: { plannedTasks: [primaryTask] } }, draftJob, 'provider_blocked_saas_handoff');
            const billing = estimateBilling(dispatchAgent, dispatch.normalized.usage);
            draftJob.actualBilling = billing;
            setDeliveryCompletionGate(draftJob, draftJob.completedAt);
            settleAgentEarnings(draftJob, draftAgent, billing);
            return { ok: true, mode: 'completed', job: cloneJob(draftJob), billing };
          }
          markJobBlockedForAuthority(draftJob, authorityRequest, 'External execution is blocked waiting for connector approval.');
          draftJob.logs.push(`dispatch blocked by ${dispatchAgent.id} status=${dispatch.normalized.status}`);
          markWorkflowParentBlockedIfNeeded(draft, draftJob);
          return { ok: true, mode: 'blocked', job: cloneJob(draftJob) };
        }
  
        draftJob.logs.push(`dispatch accepted by ${dispatchAgent.id} status=${dispatch.normalized.status}`);
        return { ok: true, mode: 'dispatched', job: cloneJob(draftJob) };
      };
      const canUseTargetedDispatchResult = typeof storage.mutateJobAndAgent === 'function';
      const final = canUseTargetedDispatchResult
        ? await storage.mutateJobAndAgent(dispatchJob.id, dispatchAgent.id, mutateDispatchResult)
        : await storage.mutate(mutateDispatchResult);
  
      if (final.error) return { error: final.error, statusCode: final.statusCode || 500 };
      if (final.mode === 'completed') {
        if (!final.skippedTerminal) await touchEvent(storage, 'COMPLETED', `${dispatchJob.taskType}/${dispatchJob.id.slice(0, 6)} completed by dispatch`);
        if (final.billing) await recordBillingOutcome(storage, final.job, final.billing, 'external-dispatch');
      } else if (final.mode === 'blocked') {
        await touchEvent(storage, 'RUNNING', `${dispatchJob.taskType}/${dispatchJob.id.slice(0, 6)} blocked waiting for approval or connector setup`);
      } else if (final.mode === 'dispatched') {
        await touchEvent(storage, 'RUNNING', `${dispatchAgent.name} accepted ${dispatchJob.taskType}/${dispatchJob.id.slice(0, 6)}`);
      } else if (!final.skippedTerminal) {
        await touchEvent(storage, 'FAILED', `${dispatchJob.taskType}/${dispatchJob.id.slice(0, 6)} dispatch failed`);
      }
      if (dispatchJob.workflowParentId) {
        await reconcileWorkflowParent(storage, dispatchJob.workflowParentId);
        if (final.mode === 'completed') {
          await refreshWorkflowLeaderHandoffForJobId(storage, dispatchJob.workflowParentId);
          const queueNextDispatch = Boolean(workflowDispatchQueue(env));
          await scheduleProgressDispatchesForJobId(storage, env, null, dispatchJob.workflowParentId, 'leader workflow handoff', {
            maxTargets: WORKFLOW_PROGRESS_DISPATCH_MAX_TARGETS,
            awaitDispatch: !queueNextDispatch,
            dispatchMode: queueNextDispatch ? 'queue' : (options.nextDispatchMode || 'direct')
          });
          await reconcileWorkflowParent(storage, dispatchJob.workflowParentId);
        }
      }
      return final;
    } catch (error) {
      const restartRequired = workflowChildShouldRestartFromBeginning(dispatchJob);
      const failed = await failJob(storage, dispatchJob.id, restartRequired ? workflowRestartRequiredReason(dispatchJob, error.message) : error.message, [`dispatch exception for ${dispatchAgent.id}`], {
        failureCategory: restartRequired ? 'workflow_restart_required' : 'dispatch_error',
        retryable: restartRequired ? false : true,
        attempts: providerRunAttempts(dispatchJob) || 1,
        nextRetryAt: restartRequired ? null : computeNextRetryAt(1),
        restartRequired
      });
      await touchEvent(storage, 'FAILED', `${dispatchJob.taskType}/${dispatchJob.id.slice(0, 6)} dispatch exception`);
      if (dispatchJob.workflowParentId) await reconcileWorkflowParent(storage, dispatchJob.workflowParentId);
      return { ok: true, mode: failed?.status || 'failed', job: failed, error: error.message };
    }
  }
  
  function canAutoScheduleAsyncDispatch(job, agent) {
    if (!job || !agent) return false;
    const status = String(job.status || '').toLowerCase();
    if (status !== 'queued') {
      const completionStatus = String(job.dispatch?.completionStatus || '').toLowerCase();
      const staleScheduledDispatch = status === 'running'
        && completionStatus === 'dispatch_scheduled'
        && !dispatchScheduleIsFreshForAgent(job, agent);
      const staleInProgressDispatch = status === 'running'
        && completionStatus === 'dispatch_in_progress'
        && !dispatchExecutionIsFresh(job, agent);
      if ((staleScheduledDispatch || staleInProgressDispatch) && Number(job.dispatch?.scheduleAttempts || 0) >= maxDispatchRetriesForJob(job)) return false;
      if (!staleScheduledDispatch && !staleInProgressDispatch) return false;
    }
    if (!job.assignedAgentId || job.assignedAgentId !== agent.id) return false;
    if (!resolveAgentJobEndpoint(agent)) return false;
    return true;
  }

  return {
    dispatchJobToAssignedAgent,
    loadDispatchJobAndAgent,
    dispatchExistingJobToAssignedAgent,
    canAutoScheduleAsyncDispatch
  };
}
