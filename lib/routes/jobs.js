export function createJobRouteHandlers(deps = {}) {
  const {
    ORCHESTRATION_WATCHDOG_POLICY,
    WORKFLOW_PROGRESS_DISPATCH_MAX_TARGETS,
    agentCompletionFailureReason,
    appendWorkflowOriginalInfoUsage,
    authorityRequestFromReport,
    authorityRequestHandledBySaasHandoff,
    billingLogLine,
    buildDispatchFailureMeta,
    canViewJobFromRequest,
    canRetryJob,
    clearDeliveryCompletionGate,
    cloneJob,
    completeWorkflowSaasHandoffOnlyChild,
    currentOrderRequesterContext,
    dispatchJobToAssignedAgent,
    estimateBilling,
    json,
    markAgentCompletionFailedFreeInState,
    markJobBlockedForAuthority,
    markWorkflowParentBlockedIfNeeded,
    maxDispatchRetriesForJob,
    nowIso,
    parseBody,
    providerRunAttempts,
    reconcileWorkflowParent,
    recordBillingOutcome,
    recordOrderApiKeyUsage,
    releaseBillingReservationInState,
    refreshWorkflowLeaderHandoffForJobId,
    resolveAgentJobEndpoint,
    runQueuedEndpointDispatchSweep,
    runWorkflowOrchestrationWatchdog,
    runWorkflowTimeoutRetrySweep,
    runtimePolicy,
    sanitizeJobForViewer,
    scheduleProgressDispatchesForJobId,
    settleAgentEarnings,
    setDeliveryCompletionGate,
    shouldBlockCompletedJobForAuthorityRequest,
    sourceCollectionFailureRetryMeta,
    syncJobAuthorityRequest,
    touchEvent,
    workflowChildDispatchFailureRequiresRestart,
    workflowChildIsSaasHandoffOnly,
    workflowChildShouldRestartFromBeginning,
    workflowLeaderSequenceNeedsProgress,
    workflowPrimaryTaskFromJobOrProfile,
    workflowProviderRunMaxAttempts,
    workflowRestartRequiredReason,
    workflowSearchCompletionFailureReason,
    workflowTaskName
  } = deps;

  async function handleGetJob(storage, request, env, jobId, ctx = null) {
    const current = await currentOrderRequesterContext(storage, request, env, { lightweight: true });
    if (!current.user && current.apiKeyStatus === 'invalid') return json({ error: 'Invalid API key' }, 401);
    let url = null;
    try {
      url = new URL(request.url);
    } catch {}
    const inspectOnly = ['0', 'false', 'no'].includes(String(url?.searchParams?.get('progress') || '').trim().toLowerCase())
      || ['1', 'true', 'yes'].includes(String(url?.searchParams?.get('inspect_only') || url?.searchParams?.get('inspectOnly') || '').trim().toLowerCase());
    const loadJob = async () => (
      typeof storage.getJobById === 'function'
        ? storage.getJobById(jobId)
        : (await storage.getState()).jobs.find((item) => item.id === jobId)
    );
    let job = await loadJob();
    if (!job || !canViewJobFromRequest({ jobs: [job] }, current, env, job, request)) return json({ error: 'Job not found' }, 404);
    const waitUntil = ctx && typeof ctx.waitUntil === 'function'
      ? (promise) => ctx.waitUntil(promise)
      : null;
    const shouldRunProgress = !inspectOnly && (
      !['completed', 'failed', 'timed_out'].includes(String(job.status || '').toLowerCase())
      || (job.jobKind === 'workflow' && workflowLeaderSequenceNeedsProgress(job))
    );
    if (shouldRunProgress) {
      if (waitUntil && storage.kind === 'd1') {
        const fastProgress = await (async () => {
          if (job.jobKind === 'workflow') {
            await refreshWorkflowLeaderHandoffForJobId(storage, job.id);
            await reconcileWorkflowParent(storage, job.id);
          }
          return scheduleProgressDispatchesForJobId(storage, env, waitUntil, job.id, 'progress poll', {
            maxTargets: WORKFLOW_PROGRESS_DISPATCH_MAX_TARGETS,
            awaitDispatch: false,
            refresh: job.jobKind === 'workflow'
          });
        })().catch(async (error) => {
          await touchEvent(storage, 'FAILED', `progress poll exception ${String(error?.message || error).slice(0, 120)}`);
          return null;
        });
        if (job.jobKind === 'workflow' || fastProgress?.scheduled) {
          job = await loadJob() || job;
        }
        waitUntil((async () => {
          if (job.jobKind === 'workflow') {
            await runWorkflowTimeoutRetrySweep(storage, env, {
              source: 'progress-poll',
              limit: Math.min(4, Number(env?.WORKFLOW_TIMEOUT_RETRY_SWEEP_LIMIT || 4) || 4),
              waitUntil
            });
            await runQueuedEndpointDispatchSweep(storage, env, {
              source: 'progress-poll',
              limit: Math.min(8, Number(env?.QUEUED_DISPATCH_SWEEP_LIMIT || 8) || 8),
              reason: 'progress poll dispatch sweep',
              waitUntil
            });
            await runWorkflowOrchestrationWatchdog(storage, env, {
              source: 'progress-poll',
              limit: Math.min(5, Number(env?.WORKFLOW_ORCHESTRATION_WATCHDOG_LIMIT || 5) || 5),
              staleAfterMs: Number(env?.WORKFLOW_ORCHESTRATION_STALE_MS || ORCHESTRATION_WATCHDOG_POLICY.staleAfterMs) || ORCHESTRATION_WATCHDOG_POLICY.staleAfterMs,
              blockedAfterMs: Number(env?.WORKFLOW_ORCHESTRATION_BLOCKED_MS || ORCHESTRATION_WATCHDOG_POLICY.blockedAfterMs) || ORCHESTRATION_WATCHDOG_POLICY.blockedAfterMs,
              reason: 'progress poll orchestration watchdog dispatch',
              waitUntil
            });
          }
        })().catch((error) => touchEvent(storage, 'FAILED', `progress poll recovery exception ${String(error?.message || error).slice(0, 120)}`)));
      } else {
        const progressWork = (async () => {
          if (job.jobKind === 'workflow') {
            await refreshWorkflowLeaderHandoffForJobId(storage, job.id);
            await reconcileWorkflowParent(storage, job.id);
            await runWorkflowTimeoutRetrySweep(storage, env, {
              source: 'progress-poll',
              limit: Math.min(4, Number(env?.WORKFLOW_TIMEOUT_RETRY_SWEEP_LIMIT || 4) || 4),
              waitUntil
            });
          }
          const scheduled = await scheduleProgressDispatchesForJobId(storage, env, waitUntil, job.id, 'progress poll', {
            maxTargets: WORKFLOW_PROGRESS_DISPATCH_MAX_TARGETS,
            awaitDispatch: !waitUntil,
            refresh: job.jobKind === 'workflow'
          });
          if (job.jobKind === 'workflow' && !scheduled?.scheduled) {
            await runQueuedEndpointDispatchSweep(storage, env, {
              source: 'progress-poll',
              limit: Math.min(8, Number(env?.QUEUED_DISPATCH_SWEEP_LIMIT || 8) || 8),
              reason: 'progress poll dispatch sweep',
              waitUntil
            });
          }
          return scheduled;
        })();
        const scheduled = await progressWork.catch(async (error) => {
          await touchEvent(storage, 'FAILED', `progress poll exception ${String(error?.message || error).slice(0, 120)}`);
          return null;
        });
        if (job.jobKind === 'workflow' || scheduled?.scheduled) {
          job = await loadJob() || job;
        }
      }
    }
    if (current.apiKey?.id) await recordOrderApiKeyUsage(storage, current, request);
    const sanitizedJob = sanitizeJobForViewer(job, env);
    return json({ ...sanitizedJob, job: sanitizedJob });
  }

  async function handleRetryDispatch(storage, request, env) {
    if (!runtimePolicy(env).devApiEnabled) return json({ error: 'Dev API disabled' }, 403);
    let body;
    try {
      body = await parseBody(request);
    } catch (error) {
      return json({ error: error.message }, 400);
    }
    const jobId = String(body.job_id || '').trim();
    if (!jobId) return json({ error: 'job_id required' }, 400);
    const state = await storage.getState();
    const job = state.jobs.find((item) => item.id === jobId);
    if (!job) return json({ error: 'Job not found' }, 404);
    if (!canRetryJob(job)) return json({ error: 'Job is not retryable' }, 409);
    if (workflowChildShouldRestartFromBeginning(job)) {
      return json({
        error: 'Workflow child jobs are not retryable in-place. Retry the order from the beginning.',
        restart_required: true
      }, 409);
    }
    const agent = state.agents.find((item) => item.id === job.assignedAgentId);
    if (!agent) return json({ error: 'Assigned agent not found' }, 404);
    const attempts = Number(job.dispatch?.attempts || 0) + 1;

    if (!resolveAgentJobEndpoint(agent)) {
      const queued = await storage.mutate(async (draft) => {
        const draftJob = draft.jobs.find((item) => item.id === jobId);
        if (!draftJob) return { error: 'Job not found', statusCode: 404 };
        draftJob.status = 'queued';
        draftJob.failedAt = null;
        draftJob.timedOutAt = null;
        draftJob.completedAt = null;
        draftJob.failureReason = null;
        draftJob.failureCategory = null;
        draftJob.logs = [...(draftJob.logs || []), `worker retry requested; job reset to queued (attempt=${attempts})`];
        draftJob.dispatch = {
          ...(draftJob.dispatch || {}),
          attempts,
          retryable: false,
          nextRetryAt: null,
          completionStatus: 'retry_queued',
          retriedAt: nowIso(),
          maxRetries: maxDispatchRetriesForJob(draftJob)
        };
        return { job: cloneJob(draftJob) };
      });
      if (queued.error) return json({ error: queued.error }, queued.statusCode || 400);
      await touchEvent(storage, 'RETRY', `${queued.job.taskType}/${queued.job.id.slice(0, 6)} moved back to queued`);
      if (queued.job?.workflowParentId) await reconcileWorkflowParent(storage, queued.job.workflowParentId);
      return json({ ok: true, mode: 'queued', job: queued.job });
    }

    try {
      const dispatch = await dispatchJobToAssignedAgent(job, agent, env);
      const result = await storage.mutate(async (draft) => {
        const draftJob = draft.jobs.find((item) => item.id === jobId);
        const draftAgent = draft.agents.find((item) => item.id === agent.id);
        if (!draftJob) return { error: 'Job not found', statusCode: 404 };
        if (String(draftJob.status || '').trim().toLowerCase() === 'blocked') {
          return { ok: true, mode: 'blocked', job: cloneJob(draftJob), skippedBlocked: true };
        }
        if (!dispatch.ok) {
          const failureMeta = buildDispatchFailureMeta(draftJob, dispatch.statusCode, dispatch.failureReason);
          const sourceRetryMeta = failureMeta.category === 'missing_required_sources'
            ? sourceCollectionFailureRetryMeta(env, draftJob)
            : null;
          const restartRequired = workflowChildShouldRestartFromBeginning(draftJob);
          draftJob.status = 'failed';
          draftJob.failedAt = nowIso();
          draftJob.failureReason = restartRequired ? workflowRestartRequiredReason(draftJob, dispatch.failureReason) : dispatch.failureReason;
          draftJob.failureCategory = restartRequired ? 'workflow_restart_required' : failureMeta.category;
          draftJob.actualBilling = null;
          clearDeliveryCompletionGate(draftJob);
          if (draftJob.billingReservation && !draftJob.billingSettlement?.settledAt && !draftJob.billingReservation?.releasedAt) {
            releaseBillingReservationInState(draft, draftJob);
          }
          draftJob.dispatch = {
            ...(draftJob.dispatch || {}),
            endpoint: dispatch.endpoint || draftJob.dispatch?.endpoint || null,
            statusCode: dispatch.statusCode || null,
            responseStatus: dispatch.responseBody?.status || null,
            lastAttemptAt: nowIso(),
            attempts: restartRequired ? providerRunAttempts(draftJob) : (sourceRetryMeta?.attempts ?? failureMeta.attempts),
            retryable: restartRequired ? false : (sourceRetryMeta?.retryable ?? failureMeta.retryable),
            nextRetryAt: restartRequired ? null : (sourceRetryMeta?.nextRetryAt ?? failureMeta.nextRetryAt),
            maxRetries: restartRequired ? workflowProviderRunMaxAttempts(env, draftJob) : (sourceRetryMeta?.maxRetries ?? maxDispatchRetriesForJob(draftJob)),
            completionStatus: restartRequired ? 'workflow_restart_required' : 'failed',
            restartRequired
          };
          draftJob.logs = [...(draftJob.logs || []), 'worker dispatch retry failed', dispatch.failureReason, restartRequired ? 'full order retry required' : `retryable=${sourceRetryMeta?.retryable ?? failureMeta.retryable}`];
          return { ok: true, mode: 'failed', job: cloneJob(draftJob) };
        }

        draftJob.dispatchedAt = nowIso();
        draftJob.startedAt = draftJob.startedAt || draftJob.dispatchedAt;
        draftJob.status = 'dispatched';
        draftJob.completedAt = null;
        draftJob.failedAt = null;
        draftJob.timedOutAt = null;
        draftJob.failureReason = null;
        draftJob.failureCategory = null;
        draftJob.dispatch = {
          endpoint: dispatch.endpoint,
          statusCode: dispatch.statusCode,
          externalJobId: dispatch.normalized.externalJobId,
          responseStatus: dispatch.normalized.status,
          lastAttemptAt: nowIso(),
          attempts,
          retryable: false,
          nextRetryAt: null,
          completionStatus: dispatch.normalized.blocked ? 'blocked' : (dispatch.normalized.completed ? 'completed' : 'accepted'),
          maxRetries: maxDispatchRetriesForJob(draftJob)
        };
        draftJob.logs = [...(draftJob.logs || []), `worker dispatch retry sent to ${agent.id}`];

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
            if (draftJob.billingReservation && !draftJob.billingSettlement?.settledAt && !draftJob.billingReservation?.releasedAt) {
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
            draftJob.logs.push(sourceProofFailure, restartRequired ? 'full order retry required after missing search execution proof' : 'failed before retry completion: missing search execution proof');
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
          const billing = estimateBilling(agent, dispatch.normalized.usage);
          draftJob.actualBilling = billing;
          setDeliveryCompletionGate(draftJob, draftJob.completedAt);
          draftJob.logs.push(`completed by dispatch response from ${agent.id}`, billingLogLine(draftJob, billing), `delivery completion gate score=${draftJob.deliveryCompletionGate.score}`);
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
            completeWorkflowSaasHandoffOnlyChild({ taskType: primaryTask, workflow: { plannedTasks: [primaryTask] } }, draftJob, 'provider_retry_blocked_saas_handoff');
            const billing = estimateBilling(agent, dispatch.normalized.usage);
            draftJob.actualBilling = billing;
            setDeliveryCompletionGate(draftJob, draftJob.completedAt);
            settleAgentEarnings(draftJob, draftAgent, billing);
            return { ok: true, mode: 'completed', job: cloneJob(draftJob), billing };
          }
          markJobBlockedForAuthority(draftJob, authorityRequest, 'External execution is blocked waiting for connector approval.');
          draftJob.logs.push(`dispatch retry blocked by ${agent.id} status=${dispatch.normalized.status}`);
          markWorkflowParentBlockedIfNeeded(draft, draftJob);
          return { ok: true, mode: 'blocked', job: cloneJob(draftJob) };
        }

        draftJob.logs.push(`dispatch retry accepted by ${agent.id} status=${dispatch.normalized.status}`);
        return { ok: true, mode: 'dispatched', job: cloneJob(draftJob) };
      });

      if (result.error) return json({ error: result.error }, result.statusCode || 400);
      await touchEvent(storage, 'RETRY', `${job.taskType}/${job.id.slice(0, 6)} retry dispatched`);
      if (result.mode === 'completed') {
        await touchEvent(storage, 'COMPLETED', `${job.taskType}/${job.id.slice(0, 6)} completed by retry dispatch`);
        await recordBillingOutcome(storage, result.job, result.billing, 'worker-dispatch-retry');
      } else if (result.mode === 'blocked') {
        await touchEvent(storage, 'RUNNING', `${job.taskType}/${job.id.slice(0, 6)} retry blocked waiting for approval or connector setup`);
      }
      const workflowParentId = result.job?.workflowParentId || job.workflowParentId || null;
      if (workflowParentId) await reconcileWorkflowParent(storage, workflowParentId);
      return json({ ok: true, mode: result.mode, job: result.job });
    } catch (error) {
      return json({ error: error.message }, 500);
    }
  }

  return {
    handleGetJob,
    handleRetryDispatch
  };
}
