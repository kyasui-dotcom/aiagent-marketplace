export function createWorkflowJobResultHandlers({
  agentCompletionFailureReason,
  appendWorkflowOriginalInfoUsage,
  authorityBlockReasonFromRequest,
  authorityRequestFromReport,
  billingLogLine,
  canTransitionJob,
  clearDeliveryCompletionGate,
  cloneJob,
  deliveryPayloadValueToText,
  estimateBilling,
  isAgentVerified,
  isBlockedAgentResultStatus,
  isTerminalJobStatus,
  markAgentCompletionFailedFreeInState,
  normalizeAgentReportPayload,
  normalizeDeliveryPayloadFiles,
  nowIso,
  providerRunAttempts,
  reconcileWorkflowParent,
  releaseBillingReservationInState,
  setDeliveryCompletionGate,
  settleAgentEarnings,
  shouldBlockCompletedJobForAuthorityRequest,
  sourceCollectionFailureRetryMeta,
  syncJobAuthorityRequest,
  topLevelAgentReportCandidate,
  transitionErrorCode,
  usageWithObservedJobTokens,
  workflowChildDispatchFailureRequiresRestart,
  workflowRestartRequiredReason,
  workflowSearchCompletionFailureReason,
  workflowTaskName
}) {
  async function completeJobFromAgentResult(storage, jobId, agentId, payload = {}, meta = {}) {
    const mutateComplete = async (state) => {
      const job = state.jobs.find((item) => item.id === jobId);
      if (!job) return { error: 'Job not found', statusCode: 404 };
      if (isTerminalJobStatus(job.status)) {
        return { error: `Job is already terminal (${job.status})`, statusCode: 409, code: 'job_already_terminal', job };
      }
      if (meta.source === 'callback' && !canTransitionJob(job, 'callback')) {
        return { error: `Job status ${job.status} cannot be changed by callback`, statusCode: 409, code: transitionErrorCode(job, 'callback'), job };
      }
      if (meta.source === 'manual-result' && !canTransitionJob(job, 'manualResult')) {
        return { error: `Job status ${job.status} cannot be changed by manual result`, statusCode: 409, code: transitionErrorCode(job, 'manualResult'), job };
      }
      const agent = state.agents.find((item) => item.id === agentId);
      if (!agent) return { error: 'Agent not found', statusCode: 404 };
      if (!isAgentVerified(agent)) return { error: 'Agent is not verified', statusCode: 403 };
      if (job.assignedAgentId && job.assignedAgentId !== agent.id) return { error: 'Invalid assignment', statusCode: 401 };
      const completionAt = nowIso();
      const outputReport = normalizeAgentReportPayload(
        payload,
        topLevelAgentReportCandidate(payload)
      );
      const explicitAuthorityRequest = authorityRequestFromReport(outputReport);
      const usage = usageWithObservedJobTokens(job, payload?.usage, outputReport);
      const payloadFileMarkdown = deliveryPayloadValueToText(
        payload.file_markdown
        || payload.markdown
        || payload.deliverableMarkdown
        || payload.deliverable_markdown
        || outputReport.file_markdown
        || outputReport.markdown
        || outputReport.deliverableMarkdown
        || outputReport.deliverable_markdown
        || ''
      ).trim();
      const payloadFiles = Array.isArray(payload.files)
        ? normalizeDeliveryPayloadFiles(payload.files, workflowTaskName(job) || job.taskType || 'delivery')
        : (payloadFileMarkdown ? [{ name: `${String(workflowTaskName(job) || job.taskType || 'delivery').slice(0, 80)}.md`, content: payloadFileMarkdown }] : []);
      let targetStatus = isBlockedAgentResultStatus(meta.targetStatus || payload.status) ? 'blocked' : 'completed';
      job.assignedAgentId = agent.id;
      job.startedAt = job.startedAt || completionAt;
      job.lastCallbackAt = meta.source === 'callback' ? completionAt : (job.lastCallbackAt || null);
      job.output = {
        report: outputReport,
        files: payloadFiles,
        returnTargets: payload.return_targets || payload.returnTargets || ['chat', 'api', 'webhook']
      };
      appendWorkflowOriginalInfoUsage(job);
      const sourceProofFailure = targetStatus === 'completed' ? workflowSearchCompletionFailureReason(job, outputReport) : '';
      if (sourceProofFailure) {
        const sourceRetryMeta = sourceCollectionFailureRetryMeta(meta.env || {}, job, { alreadyAttempted: true });
        const restartRequired = workflowChildDispatchFailureRequiresRestart(meta.env || {}, job, {
          category: 'missing_required_sources',
          ...sourceRetryMeta
        });
        targetStatus = 'failed';
        job.status = 'failed';
        job.completedAt = null;
        job.failedAt = completionAt;
        job.timedOutAt = null;
        job.failureReason = restartRequired ? workflowRestartRequiredReason(job, sourceProofFailure) : sourceProofFailure;
        job.failureCategory = restartRequired ? 'workflow_restart_required' : 'missing_required_sources';
        job.usage = usage;
        job.actualBilling = null;
        clearDeliveryCompletionGate(job);
        if (job.billingReservation && !job.billingSettlement?.settledAt && !job.billingReservation?.releasedAt) {
          releaseBillingReservationInState(state, job);
        }
        job.dispatch = {
          ...(job.dispatch || {}),
          externalJobId: meta.externalJobId || job.dispatch?.externalJobId || null,
          completionSource: meta.source || job.dispatch?.completionSource || null,
          completionStatus: restartRequired ? 'workflow_restart_required' : 'failed',
          completedAt: null,
          lastCallbackAt: meta.source === 'callback' ? completionAt : (job.dispatch?.lastCallbackAt || null),
          retryable: restartRequired ? false : sourceRetryMeta.retryable,
          nextRetryAt: restartRequired ? null : sourceRetryMeta.nextRetryAt,
          attempts: restartRequired ? providerRunAttempts(job) : sourceRetryMeta.attempts,
          maxRetries: sourceRetryMeta.maxRetries,
          restartRequired
        };
        job.logs = [...(job.logs || []), sourceProofFailure, restartRequired ? 'full order retry required after missing search execution proof' : 'failed before completion: missing search execution proof'];
        if (meta.source) job.logs.push(`completion source=${meta.source}`);
        return { ok: true, mode: 'failed', job: cloneJob(job), billing: null, workflowParentId: job.workflowParentId || null };
      }
      const completionFailure = targetStatus === 'completed' ? agentCompletionFailureReason(job) : '';
      if (completionFailure) {
        markAgentCompletionFailedFreeInState(state, job, completionFailure, meta.env || {}, { failedAt: completionAt });
        if (meta.source) job.logs.push(`completion source=${meta.source}`);
        return { ok: true, mode: 'failed', job: cloneJob(job), billing: null, workflowParentId: job.workflowParentId || null };
      }
      const authorityRequest = syncJobAuthorityRequest(job, agent);
      if (targetStatus === 'completed' && shouldBlockCompletedJobForAuthorityRequest(job, authorityRequest || explicitAuthorityRequest)) {
        targetStatus = 'blocked';
      }
      const billing = targetStatus === 'completed' ? estimateBilling(agent, usage) : null;
      job.status = targetStatus;
      job.completedAt = targetStatus === 'completed' ? completionAt : null;
      job.failedAt = null;
      job.timedOutAt = null;
      job.failureReason = targetStatus === 'blocked'
        ? authorityBlockReasonFromRequest(authorityRequest || explicitAuthorityRequest, 'Agent is blocked pending approval or connector setup.')
        : null;
      job.failureCategory = targetStatus === 'blocked' ? 'blocked_waiting_for_approval' : null;
      job.usage = usage;
      job.actualBilling = billing;
      if (targetStatus === 'completed') {
        setDeliveryCompletionGate(job, completionAt);
      } else {
        clearDeliveryCompletionGate(job);
      }
      job.dispatch = {
        ...(job.dispatch || {}),
        externalJobId: meta.externalJobId || job.dispatch?.externalJobId || null,
        completionSource: meta.source || job.dispatch?.completionSource || null,
        completionStatus: targetStatus === 'blocked' ? 'blocked_waiting_for_approval' : targetStatus,
        completedAt: targetStatus === 'completed' ? completionAt : null,
        lastCallbackAt: meta.source === 'callback' ? completionAt : (job.dispatch?.lastCallbackAt || null),
        retryable: false,
        nextRetryAt: null
      };
      job.logs = [...(job.logs || []), `${targetStatus} by ${agent.id}`];
      if (targetStatus === 'blocked') job.logs.push(`blocked waiting for authority approval: ${job.failureReason}`);
      if (billing) job.logs.push(billingLogLine(job, billing));
      if (meta.source) job.logs.push(`completion source=${meta.source}`);
      if (meta.externalJobId) job.logs.push(`external_job_id=${meta.externalJobId}`);
      if (billing) settleAgentEarnings(job, agent, billing);
      return { ok: true, mode: targetStatus, job: cloneJob(job), billing, workflowParentId: job.workflowParentId || null };
    };
    const result = typeof storage.mutateJobAndAgent === 'function'
      ? await storage.mutateJobAndAgent(jobId, agentId, mutateComplete)
      : await storage.mutate(mutateComplete);
    if (result?.ok && result.workflowParentId) await reconcileWorkflowParent(storage, result.workflowParentId);
    return result;
  }

  async function failJob(storage, jobId, reason, extraLogs = [], options = {}) {
    const failureReason = String(reason || options.failureReason || 'Job failed without a detailed reason.').trim();
    const result = await storage.mutate(async (state) => {
      const job = state.jobs.find((item) => item.id === jobId);
      if (!job) return null;
      if (isTerminalJobStatus(job.status) && !options.force) return cloneJob(job);
      const failedAt = nowIso();
      const failureStatus = options.failureStatus || (job.status === 'dispatched' ? 'timed_out' : 'failed');
      job.status = failureStatus;
      job.failedAt = failedAt;
      job.failureReason = failureReason;
      job.failureCategory = options.failureCategory || job.failureCategory || 'agent_failed';
      if (job.billingReservation && !job.billingSettlement?.settledAt && !job.billingReservation?.releasedAt) {
        releaseBillingReservationInState(state, job);
      }
      if (failureStatus === 'timed_out') job.timedOutAt = failedAt;
      job.lastCallbackAt = options.source === 'callback' ? failedAt : (job.lastCallbackAt || null);
      job.dispatch = {
        ...(job.dispatch || {}),
        externalJobId: options.externalJobId || job.dispatch?.externalJobId || null,
        completionSource: options.source || job.dispatch?.completionSource || null,
        completionStatus: options.completionStatus || (options.restartRequired ? 'workflow_restart_required' : failureStatus),
        failedAt,
        lastCallbackAt: options.source === 'callback' ? failedAt : (job.dispatch?.lastCallbackAt || null),
        retryable: options.retryable ?? job.dispatch?.retryable ?? false,
        nextRetryAt: options.nextRetryAt ?? job.dispatch?.nextRetryAt ?? null,
        attempts: options.attempts ?? job.dispatch?.attempts ?? 0,
        maxRetries: options.maxRetries ?? job.dispatch?.maxRetries,
        restartRequired: options.restartRequired ?? job.dispatch?.restartRequired ?? false
      };
      job.logs = [...(job.logs || []), ...extraLogs, failureReason];
      return { ...cloneJob(job), workflowParentId: job.workflowParentId || null };
    });
    if (result?.workflowParentId) await reconcileWorkflowParent(storage, result.workflowParentId);
    if (!result) return null;
    const { workflowParentId, ...job } = result;
    return job;
  }

  return Object.freeze({
    completeJobFromAgentResult,
    failJob
  });
}
