export function createJobAuthorityRouteHandlers(deps = {}) {
  const {
    authorityRequestFromReport,
    authorityRequestRequiresApproval,
    canViewJobFromRequest,
    clearJobAuthorityRequest,
    cloneJob,
    currentOrderRequesterContext,
    currentUserContext,
    json,
    maxDispatchRetriesForJob,
    nowIso,
    parseBody,
    reconcileWorkflowParent,
    sanitizeExecutorStatePatch,
    sanitizeJobForViewer,
    scheduleProgressDispatchesForJobId,
    touchEvent,
    workflowChildIsSequentialUserActionDeferred,
    WORKFLOW_PROGRESS_DISPATCH_MAX_TARGETS
  } = deps;

  async function updateJobExecutorState(storage, request, env, jobId = '') {
    const id = String(jobId || '').trim();
    if (!id) return { error: 'job id required', statusCode: 400 };
    let body;
    try {
      body = await parseBody(request);
    } catch (error) {
      return { error: error.message, statusCode: 400 };
    }
    const patch = sanitizeExecutorStatePatch(body || {});
    const current = await currentUserContext(request, env);
    let updated = null;
    await storage.mutate(async (draft) => {
      const index = Array.isArray(draft.jobs) ? draft.jobs.findIndex((job) => job?.id === id) : -1;
      if (index < 0) return;
      const job = draft.jobs[index];
      if (!canViewJobFromRequest(draft, current, env, job, request)) return;
      const existing = job?.executorState && typeof job.executorState === 'object' ? job.executorState : {};
      const next = { ...existing, ...patch, updatedAt: nowIso() };
      job.executorState = next;
      draft.jobs[index] = job;
      updated = cloneJob(job);
    });
    if (!updated) return { error: 'Job not found or access denied', statusCode: 404 };
    return { ok: true, job: sanitizeJobForViewer(updated, env) };
  }

  function jobHasApprovalWait(job = {}) {
    const executorState = job?.executorState && typeof job.executorState === 'object' ? job.executorState : {};
    const executorAuthority = executorState.authorityRequired && typeof executorState.authorityRequired === 'object'
      ? executorState.authorityRequired
      : null;
    const reportAuthority = authorityRequestFromReport(job?.output?.report);
    const completionStatus = String(job?.dispatch?.completionStatus || '').trim().toLowerCase();
    return Boolean(
      authorityRequestRequiresApproval(executorAuthority)
      || authorityRequestRequiresApproval(reportAuthority)
      || String(job?.failureCategory || '').trim().toLowerCase() === 'blocked_waiting_for_approval'
      || ['blocked_waiting_for_approval', 'approval_waiting_retry_paused'].includes(completionStatus)
    );
  }

  function clearWorkflowUserActionDeferral(job = {}) {
    const input = job.input && typeof job.input === 'object' ? { ...job.input } : {};
    const broker = input._broker && typeof input._broker === 'object' ? { ...input._broker } : {};
    const workflow = broker.workflow && typeof broker.workflow === 'object' ? { ...broker.workflow } : null;
    if (!workflow) return;
    delete workflow.sequentialUserActionDeferred;
    delete workflow.sequentialUserActionDeferredAt;
    broker.workflow = workflow;
    input._broker = broker;
    job.input = input;
  }

  function markJobAuthorityApproved(job = {}, at = nowIso(), approvedBy = '') {
    clearJobAuthorityRequest(job);
    if (job.output?.report && typeof job.output.report === 'object' && String(job.output.report.completion_state || '').trim() === 'blocked_waiting_for_approval') {
      delete job.output.report.completion_state;
    }
    const existingExecutorState = job.executorState && typeof job.executorState === 'object' ? job.executorState : {};
    const nextExecutorState = { ...existingExecutorState };
    delete nextExecutorState.authorityRequired;
    delete nextExecutorState.authority_required;
    nextExecutorState.authorityApprovedAt = at;
    nextExecutorState.authorityApprovedBy = approvedBy || 'chat';
    nextExecutorState.updatedAt = at;
    job.executorState = nextExecutorState;
  }

  function queueJobAfterAuthorityApproval(job = {}, at = nowIso(), approvedBy = '') {
    const wasWaiting = jobHasApprovalWait(job) || workflowChildIsSequentialUserActionDeferred(job);
    if (!wasWaiting) return false;
    markJobAuthorityApproved(job, at, approvedBy);
    clearWorkflowUserActionDeferral(job);
    job.status = 'queued';
    job.claimedAt = null;
    job.dispatchedAt = null;
    job.startedAt = null;
    job.completedAt = null;
    job.failedAt = null;
    job.timedOutAt = null;
    job.failureReason = null;
    job.failureCategory = null;
    job.dispatch = {
      ...(job.dispatch || {}),
      completionStatus: 'approval_resolved_queued',
      retryable: true,
      restartRequired: false,
      nextRetryAt: null,
      dispatchRequestedAt: null,
      completedAt: null,
      maxRetries: maxDispatchRetriesForJob(job)
    };
    if (job.output && typeof job.output === 'object') {
      job.output = {
        ...job.output,
        summary: 'Approval recorded. This action lane is queued to resume.',
        report: {
          ...(job.output.report && typeof job.output.report === 'object' ? job.output.report : {}),
          summary: 'Approval recorded. This action lane is queued to resume.',
          bullets: ['External action approval was recorded in chat.'],
          nextAction: 'Resume dispatch from the same workflow context.'
        }
      };
      clearJobAuthorityRequest(job);
    }
    job.logs = [...(job.logs || []), `authority approval recorded; queued for resume (${at})`];
    return true;
  }

  async function handleApproveJobAuthority(storage, request, env, jobId = '', ctx = null) {
    const id = String(jobId || '').trim();
    if (!id) return { error: 'job id required', statusCode: 400 };
    let body = {};
    try {
      body = await parseBody(request);
    } catch {
      body = {};
    }
    const confirmed = body.confirm_approval === true || body.confirmApproval === true || body.approved === true;
    if (!confirmed) {
      return {
        error: 'Explicit approval confirmation is required.',
        code: 'approval_confirmation_required',
        statusCode: 428
      };
    }
    const current = await currentOrderRequesterContext(storage, request, env, { lightweight: true });
    const initialJob = typeof storage.getJobById === 'function'
      ? await storage.getJobById(id)
      : (await storage.getState()).jobs.find((item) => item.id === id);
    if (!initialJob) return { error: 'Job not found', statusCode: 404 };
    if (!canViewJobFromRequest({ jobs: [initialJob] }, current, env, initialJob, request)) {
      return { error: 'Job not found or access denied', statusCode: 404 };
    }
    const initialCompletionStatus = String(initialJob?.dispatch?.completionStatus || '').trim().toLowerCase();
    if (
      String(initialJob?.failureCategory || '').trim().toLowerCase() === 'leader_quality_gate_failed'
      || initialCompletionStatus === 'leader_quality_gate_failed'
      || /leader quality gate/i.test(String(initialJob?.failureReason || ''))
    ) {
      return {
        error: initialJob.failureReason || 'This order is blocked by a leader quality gate, not by connector approval. Retry or repair the failed specialist output before resuming.',
        code: 'leader_quality_gate_failed',
        statusCode: 409,
        job: sanitizeJobForViewer(initialJob, env)
      };
    }
    const parentId = initialJob.jobKind === 'workflow'
      ? initialJob.id
      : (String(initialJob.workflowParentId || '').trim() || initialJob.id);
    const approvedBy = current.login || current.user?.email || current.user?.id || 'chat';
    const approvedAt = nowIso();
    const mutateTarget = typeof storage.mutateWorkflow === 'function'
      ? (mutator) => storage.mutateWorkflow(parentId, mutator)
      : (mutator) => storage.mutate(mutator);
    let approvedCount = 0;
    let parentAfter = null;
    await mutateTarget(async (draft) => {
      const jobs = Array.isArray(draft.jobs) ? draft.jobs : [];
      const parent = jobs.find((job) => job.id === parentId) || jobs.find((job) => job.id === id) || null;
      if (!parent || !canViewJobFromRequest(draft, current, env, parent, request)) return;
      if (parent.jobKind === 'workflow') {
        markJobAuthorityApproved(parent, approvedAt, approvedBy);
        if (String(parent.status || '').trim().toLowerCase() === 'blocked') {
          parent.status = 'running';
          parent.completedAt = null;
          parent.failedAt = null;
          parent.timedOutAt = null;
          parent.failureReason = null;
          parent.failureCategory = null;
          parent.dispatch = {
            ...(parent.dispatch || {}),
            completionStatus: 'approval_resolved',
            retryable: true,
            nextRetryAt: null,
            completedAt: null
          };
        }
        parent.logs = [...(parent.logs || []), `authority approval recorded from chat (${approvedAt})`];
        for (const child of jobs.filter((job) => String(job.workflowParentId || '') === parent.id)) {
          if (queueJobAfterAuthorityApproval(child, approvedAt, approvedBy)) approvedCount += 1;
        }
        parentAfter = cloneJob(parent);
        return;
      }
      if (queueJobAfterAuthorityApproval(parent, approvedAt, approvedBy)) approvedCount += 1;
      parentAfter = cloneJob(parent);
    });
    if (!parentAfter) return { error: 'Job not found or access denied', statusCode: 404 };
    await touchEvent(storage, 'RUNNING', `${parentAfter.taskType}/${parentAfter.id.slice(0, 6)} approval recorded`, {
      kind: 'authority_approved',
      jobId: parentAfter.id,
      approvedCount
    });
    const waitUntil = ctx && typeof ctx.waitUntil === 'function'
      ? (promise) => ctx.waitUntil(promise)
      : null;
    let reconciled = parentAfter;
    if (parentAfter.jobKind === 'workflow') {
      reconciled = await reconcileWorkflowParent(storage, parentAfter.id) || parentAfter;
      const schedulePromise = scheduleProgressDispatchesForJobId(storage, env, waitUntil, parentAfter.id, 'authority approval resume', {
        maxTargets: WORKFLOW_PROGRESS_DISPATCH_MAX_TARGETS,
        awaitDispatch: !waitUntil,
        refresh: true
      });
      if (waitUntil && storage.kind === 'd1') waitUntil(schedulePromise.catch(() => null));
      else await schedulePromise.catch(() => null);
      if (typeof storage.getJobById === 'function') {
        reconciled = await storage.getJobById(parentAfter.id) || reconciled;
      }
    } else {
      const schedulePromise = scheduleProgressDispatchesForJobId(storage, env, waitUntil, parentAfter.id, 'authority approval resume', {
        maxTargets: 1,
        awaitDispatch: !waitUntil,
        refresh: true
      });
      if (waitUntil && storage.kind === 'd1') waitUntil(schedulePromise.catch(() => null));
      else await schedulePromise.catch(() => null);
      if (typeof storage.getJobById === 'function') {
        reconciled = await storage.getJobById(parentAfter.id) || reconciled;
      }
    }
    return {
      ok: true,
      approved: true,
      approved_count: approvedCount,
      job: sanitizeJobForViewer(reconciled, env)
    };
  }

  return {
    handleApproveJobAuthority,
    updateJobExecutorState,
    jobHasApprovalWait,
    markJobAuthorityApproved,
    queueJobAfterAuthorityApproval
  };
}
