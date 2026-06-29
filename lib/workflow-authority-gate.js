export function createWorkflowAuthorityGate({
  authorityBlockReasonFromRequest,
  authorityBool,
  authorityRequestFromReport,
  authorityRequestIsExternalWriteOrPublish,
  authorityRequestRequiresApproval,
  authorityStringList,
  buildAgentTeamDeliveryOutput,
  clearDeliveryCompletionGate,
  clearJobAuthorityRequest,
  cloneJob,
  executorStatePatchFromAuthorityRequest,
  isTerminalJobStatus,
  isWorkflowLeaderTask,
  normalizeAuthorityRequest,
  normalizeJobStatus,
  nowIso,
  sortWorkflowChildren,
  workflowChildIsSaasHandoffOnly,
  workflowTaskName,
  workflowUsesSaasPublishHandoff
}) {
  function authorityRequestHandledBySaasHandoff(job = {}, request = null, parent = null) {
    return Boolean(
      workflowUsesSaasPublishHandoff(job, parent)
      && authorityRequestIsExternalWriteOrPublish(request)
    );
  }

  function markJobBlockedForAuthority(job = {}, request = null, fallback = 'External execution is blocked waiting for connector approval.') {
    const reason = authorityBlockReasonFromRequest(request, fallback);
    const normalizedRequest = normalizeAuthorityRequest(request, {
      ownerLabel: String(job.workflowAgentName || job.taskType || '').trim() || 'CAIt',
      source: 'agent_delivery'
    });
    const logLine = `blocked waiting for authority approval: ${reason}`;
    job.status = 'blocked';
    job.completedAt = null;
    job.failedAt = null;
    job.timedOutAt = null;
    job.failureReason = reason;
    job.failureCategory = 'blocked_waiting_for_approval';
    job.actualBilling = null;
    clearDeliveryCompletionGate(job);
    job.dispatch = {
      ...(job.dispatch || {}),
      completionStatus: 'blocked_waiting_for_approval',
      retryable: false,
      nextRetryAt: null,
      completedAt: null
    };
    job.logs = (job.logs || []).includes(logLine)
      ? (job.logs || [])
      : [...(job.logs || []), logLine];
    if (job.output?.report && typeof job.output.report === 'object') {
      job.output.report.completion_state = 'blocked_waiting_for_approval';
      if (normalizedRequest && !authorityRequestFromReport(job.output.report)) {
        job.output.report.authority_request = normalizedRequest;
      }
    }
    return job;
  }

  function workflowParentAuthorityRequest(parent = {}) {
    const request = authorityRequestFromReport(parent?.output?.report);
    if (!authorityRequestRequiresApproval(request)) return null;
    if (authorityRequestHandledBySaasHandoff(parent, request, parent)) return null;
    const source = String(request?.source || request?.reason_code || request?.reasonCode || '').trim().toLowerCase();
    if (source === 'leader_execution_approval') return null;
    const missingConnectors = authorityStringList(
      request?.missing_connectors || request?.missingConnectors || request?.connectors,
      8,
      60
    );
    const missingCapabilities = authorityStringList(
      request?.missing_connector_capabilities || request?.missingConnectorCapabilities || request?.capabilities,
      16,
      120
    );
    const googleSources = authorityStringList(
      request?.required_google_sources || request?.requiredGoogleSources || request?.google_source_types || request?.googleSourceTypes,
      8,
      60
    );
    const explicitSelection = authorityBool(
      request?.required_channel_selection
        || request?.requiredChannelSelection
        || request?.required_repository_selection
        || request?.requiredRepositorySelection
        || request?.required_account_selection
        || request?.requiredAccountSelection
    );
    const writeCapabilities = missingCapabilities.filter((item) => (
      /(post|publish|send|write|submit|create|update|delete|calendar|gmail|email|x\.post|github\.write)/i.test(String(item || ''))
      && !/^google\.read_/i.test(String(item || ''))
    ));
    const sourceReadCapabilities = missingCapabilities.filter((item) => (
      /^(google|github)\.read_/i.test(String(item || ''))
      || /^read_/i.test(String(item || ''))
    ));
    const sourceConnectors = missingConnectors.filter((item) => (
      /^(google|ga4|gsc|search_console|google_analytics|analytics|drive|search|web_search|brave)$/i.test(String(item || ''))
    ));
    return googleSources.length
      || sourceReadCapabilities.length
      || (sourceConnectors.length && sourceConnectors.length === missingConnectors.length && !writeCapabilities.length)
      || (explicitSelection && !writeCapabilities.length)
      ? request
      : null;
  }

  function shouldBlockCompletedJobForAuthorityRequest(job = {}, request = null) {
    if (!authorityRequestRequiresApproval(request)) return false;
    if (authorityRequestHandledBySaasHandoff(job, request)) return false;
    if (workflowChildIsSaasHandoffOnly(job)) return false;
    const workflowParentId = String(job?.workflowParentId || '').trim();
    if (workflowParentId && isWorkflowLeaderTask(workflowTaskName(job))) return false;
    if (workflowParentId) {
      const task = workflowTaskName(job);
      const actionAuthorityTasks = new Set([
        'x_post',
        'instagram',
        'reddit',
        'indie_hackers',
        'email_ops',
        'cold_email',
        'directory_submission',
        'citation_ops'
      ]);
      if (!actionAuthorityTasks.has(task)) return false;
    }
    return true;
  }

  function syncJobAuthorityRequest(job = {}, agent = null) {
    if (['failed', 'timed_out'].includes(normalizeJobStatus(job.status))) {
      clearJobAuthorityRequest(job);
      return null;
    }
    if (!job?.output || typeof job.output !== 'object') return null;
    const existingExecutorState = job.executorState && typeof job.executorState === 'object' ? job.executorState : {};
    const completionStatus = String(job?.dispatch?.completionStatus || '').trim().toLowerCase();
    if (existingExecutorState.authorityApprovedAt && completionStatus.startsWith('approval_resolved')) {
      clearJobAuthorityRequest(job);
      return null;
    }
    const report = job.output.report && typeof job.output.report === 'object' ? job.output.report : {};
    const existingRequest = authorityRequestFromReport(report);
    const normalizedExistingRequest = normalizeAuthorityRequest(existingRequest, {
      ownerLabel: String(job.workflowAgentName || agent?.name || '').trim() || 'CAIt',
      source: 'agent_delivery'
    });
    const request = normalizedExistingRequest;
    if (authorityRequestHandledBySaasHandoff(job, request)) {
      clearJobAuthorityRequest(job);
      return null;
    }
    if (!request || !authorityRequestRequiresApproval(request)) {
      if (report.authority_request || report.authorityRequest || report.action_required || report.actionRequired || report.executor_request || report.executorRequest) {
        const cleanReport = { ...report };
        delete cleanReport.authority_request;
        delete cleanReport.authorityRequest;
        delete cleanReport.action_required;
        delete cleanReport.actionRequired;
        delete cleanReport.executor_request;
        delete cleanReport.executorRequest;
        job.output.report = cleanReport;
      }
      return null;
    }
    job.output.report = {
      ...report,
      authority_request: request
    };
    const patch = executorStatePatchFromAuthorityRequest(request, existingExecutorState);
    if (!patch) return request;
    job.executorState = {
      ...existingExecutorState,
      ...patch,
      updatedAt: nowIso()
    };
    return request;
  }

  async function pauseWorkflowChildDispatchForParentAuthority(storage, childJob = {}, options = {}) {
    const jobId = String(childJob?.id || options.jobId || '').trim();
    const agentId = String(childJob?.assignedAgentId || options.agentId || '').trim();
    const parentId = String(childJob?.workflowParentId || options.parentJobId || '').trim();
    if (!jobId || !parentId) return { paused: false, reason: 'job_or_parent_missing' };
    let parent = null;
    if (typeof storage.getJobById === 'function') parent = await storage.getJobById(parentId);
    if (!parent && typeof storage.getState === 'function') {
      const state = await storage.getState();
      parent = (Array.isArray(state?.jobs) ? state.jobs : []).find((item) => item.id === parentId) || null;
    }
    const authorityRequest = workflowParentAuthorityRequest(parent);
    if (!authorityRequest) return { paused: false, reason: 'parent_not_waiting_for_authority' };
    const pauseReason = authorityBlockReasonFromRequest(authorityRequest, 'Parent workflow is waiting for connector approval.');
    const pauseDispatch = (draft) => {
      const draftJob = Array.isArray(draft?.jobs) ? draft.jobs.find((item) => item.id === jobId) : null;
      if (!draftJob || isTerminalJobStatus(draftJob.status)) return null;
      if (String(draftJob.workflowParentId || '') !== parentId) return null;
      const at = nowIso();
      const logLine = `paused retry while parent waits for authority approval: ${pauseReason}`;
      draftJob.status = 'queued';
      draftJob.claimedAt = null;
      draftJob.dispatchedAt = null;
      draftJob.startedAt = null;
      draftJob.completedAt = null;
      draftJob.failedAt = null;
      draftJob.timedOutAt = null;
      draftJob.failureReason = null;
      draftJob.failureCategory = null;
      draftJob.dispatch = {
        ...(draftJob.dispatch || {}),
        completionStatus: 'approval_waiting_retry_paused',
        retryable: false,
        nextRetryAt: null,
        approvalPausedAt: at,
        approvalPauseReason: pauseReason
      };
      draftJob.logs = (draftJob.logs || []).includes(logLine)
        ? (draftJob.logs || [])
        : [...(draftJob.logs || []), logLine];
      return cloneJob(draftJob);
    };
    const paused = typeof storage.mutateJobAndAgent === 'function' && agentId
      ? await storage.mutateJobAndAgent(jobId, agentId, pauseDispatch)
      : await storage.mutate(pauseDispatch);
    if (!paused) return { paused: false, reason: 'pause_rejected', request: authorityRequest };
    return { paused: true, job: paused, parent, request: authorityRequest };
  }

  async function pauseTerminalWorkflowChildRetryForParentAuthority(storage, childJob = {}, options = {}) {
    const jobId = String(childJob?.id || options.jobId || '').trim();
    const agentId = String(childJob?.assignedAgentId || options.agentId || '').trim();
    const parentId = String(childJob?.workflowParentId || options.parentJobId || '').trim();
    if (!jobId || !parentId) return { paused: false, reason: 'job_or_parent_missing' };
    let parent = null;
    if (typeof storage.getJobById === 'function') parent = await storage.getJobById(parentId);
    if (!parent && typeof storage.getState === 'function') {
      const state = await storage.getState();
      parent = (Array.isArray(state?.jobs) ? state.jobs : []).find((item) => item.id === parentId) || null;
    }
    const authorityRequest = workflowParentAuthorityRequest(parent);
    if (!authorityRequest) return { paused: false, reason: 'parent_not_waiting_for_authority' };
    const pauseReason = authorityBlockReasonFromRequest(authorityRequest, 'Parent workflow is waiting for connector approval.');
    const pauseRetry = (draft) => {
      const draftJob = Array.isArray(draft?.jobs) ? draft.jobs.find((item) => item.id === jobId) : null;
      if (!draftJob) return null;
      if (String(draftJob.workflowParentId || '') !== parentId) return null;
      const status = String(draftJob.status || '').trim().toLowerCase();
      if (!['failed', 'timed_out'].includes(status)) return null;
      if (draftJob.dispatch?.retryable !== true) return null;
      const at = nowIso();
      const logLine = `paused terminal retry while parent waits for authority approval: ${pauseReason}`;
      draftJob.dispatch = {
        ...(draftJob.dispatch || {}),
        completionStatus: 'approval_waiting_retry_paused',
        retryable: false,
        nextRetryAt: null,
        approvalPausedAt: at,
        approvalPauseReason: pauseReason,
        retryPausedFromStatus: status
      };
      draftJob.logs = (draftJob.logs || []).includes(logLine)
        ? (draftJob.logs || [])
        : [...(draftJob.logs || []), logLine];
      return cloneJob(draftJob);
    };
    const paused = typeof storage.mutateJobAndAgent === 'function' && agentId
      ? await storage.mutateJobAndAgent(jobId, agentId, pauseRetry)
      : await storage.mutate(pauseRetry);
    if (!paused) return { paused: false, reason: 'pause_rejected', request: authorityRequest };
    const mutateParent = typeof storage.mutateWorkflow === 'function'
      ? (mutator) => storage.mutateWorkflow(parentId, mutator)
      : (mutator) => storage.mutate(mutator);
    const blockedParent = await mutateParent(async (draft) => {
      const draftParent = Array.isArray(draft?.jobs)
        ? draft.jobs.find((item) => item.id === parentId && item.jobKind === 'workflow')
        : null;
      if (!draftParent) return null;
      const children = Array.isArray(draft?.jobs)
        ? sortWorkflowChildren(draftParent, draft.jobs.filter((item) => item.workflowParentId === parentId))
        : [];
      draftParent.output = draftParent.output || buildAgentTeamDeliveryOutput(draftParent, children);
      markJobBlockedForAuthority(draftParent, authorityRequest, pauseReason);
      draftParent.logs = [
        ...(draftParent.logs || []),
        `workflow retry paused while waiting for authority approval: ${pauseReason}`
      ];
      return cloneJob(draftParent);
    });
    return { paused: true, job: paused, parent: blockedParent || parent, request: authorityRequest };
  }

  return Object.freeze({
    authorityRequestHandledBySaasHandoff,
    markJobBlockedForAuthority,
    pauseTerminalWorkflowChildRetryForParentAuthority,
    pauseWorkflowChildDispatchForParentAuthority,
    shouldBlockCompletedJobForAuthorityRequest,
    syncJobAuthorityRequest,
    workflowParentAuthorityRequest
  });
}
