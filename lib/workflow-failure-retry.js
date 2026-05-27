export function workflowQualitySourceTask(job = {}) {
  const task = String(job?.workflowTask || job?.taskType || '').trim().toLowerCase();
  return Boolean(job?.workflowParentId) && ['research', 'teardown', 'data_analysis', 'validation', 'diligence'].includes(task);
}

export function createWorkflowFailureRetryHelpers({
  clearDeliveryCompletionGate,
  computeNextRetryAt,
  maxDispatchRetriesForJob,
  nowIso,
  providerRunAttempts,
  releaseBillingReservationInState,
  workflowChildDispatchFailureRequiresRestart,
  workflowCompletionRetryLimitForJob,
  workflowLeaderControlMaxRetries,
  workflowLeaderControlTask,
  workflowProviderRunMaxAttempts,
  workflowRestartRequiredReason,
  workflowSourceCollectionMaxRetries,
  workflowTaskRequiresConcreteSpecialistArtifact
}) {
  function agentCompletionFailureRetryMeta(env = {}, job = {}) {
    const attempts = Math.max(providerRunAttempts(job), Number(job?.dispatch?.attempts || 0) || 0, 1);
    const maxRetries = workflowCompletionRetryLimitForJob(env, job);
    const retryable = attempts < maxRetries;
    return {
      category: 'missing_required_deliverable',
      attempts,
      maxRetries,
      retryable,
      nextRetryAt: retryable ? computeNextRetryAt(attempts) : null
    };
  }

  function markAgentCompletionFailedFreeInState(state, job, reason, env = {}, options = {}) {
    if (!job) return null;
    const failedAt = options.failedAt || nowIso();
    const retryMeta = agentCompletionFailureRetryMeta(env, job);
    job.status = 'failed';
    job.completedAt = null;
    job.failedAt = failedAt;
    job.timedOutAt = null;
    job.failureReason = reason || 'Agent did not return a required delivery artifact.';
    job.failureCategory = 'missing_required_deliverable';
    job.actualBilling = null;
    clearDeliveryCompletionGate(job);
    if (job.billingReservation && !job.billingSettlement?.settledAt && !job.billingReservation?.releasedAt) {
      releaseBillingReservationInState(state, job);
    }
    job.dispatch = {
      ...(job.dispatch || {}),
      completionStatus: 'failed',
      retryable: retryMeta.retryable,
      attempts: retryMeta.attempts,
      nextRetryAt: retryMeta.nextRetryAt,
      maxRetries: retryMeta.maxRetries,
      restartRequired: false
    };
    job.logs = [
      ...(job.logs || []),
      job.failureReason,
      retryMeta.retryable
        ? `failed before completion: missing agent delivery artifact; retry ${retryMeta.attempts + 1}/${retryMeta.maxRetries} scheduled`
        : `failed before completion: missing agent delivery artifact; retries exhausted at ${retryMeta.attempts}/${retryMeta.maxRetries}`,
      'billing released: agent did not complete a user-facing delivery'
    ];
    return retryMeta;
  }

  function sourceCollectionFailureRetryMeta(env = {}, job = {}, options = {}) {
    const attempts = Number(job?.dispatch?.attempts || 0) + (options.alreadyAttempted ? 0 : 1);
    const maxRetries = workflowSourceCollectionMaxRetries(env);
    const retryable = attempts < maxRetries;
    return {
      attempts,
      maxRetries,
      retryable,
      nextRetryAt: retryable ? computeNextRetryAt(attempts) : null
    };
  }

  function workflowBuiltInFailureRetryMeta(env = {}, job = {}, failureMeta = {}) {
    const category = String(failureMeta.category || '').trim().toLowerCase();
    const attempts = Number.isFinite(Number(failureMeta.attempts))
      ? Number(failureMeta.attempts)
      : Number(job?.dispatch?.attempts || 0) + 1;
    const qualityRetryCategory = [
      'missing_required_sources',
      'missing_required_deliverable',
      'dispatch_timeout',
      'dispatch_provider_timeout',
      'dispatch_deadline_timeout',
      'dispatch_http_timeout',
      'dispatch_http_gateway_timeout',
      'dispatch_network_timeout',
      'dispatch_queue_timeout',
      'dispatch_http_5xx',
      'dispatch_error',
      'dispatch_malformed_response',
      'agent_quality_gate_failed',
      'leader_quality_gate_failed'
    ].includes(category);
    const qualitySourceRetry = workflowQualitySourceTask(job) && qualityRetryCategory;
    const concreteArtifactRetry = Boolean(job?.workflowParentId)
      && workflowTaskRequiresConcreteSpecialistArtifact(job)
      && category === 'missing_required_deliverable';
    const leaderControlRetry = workflowLeaderControlTask(job) && qualityRetryCategory;
    const maxRetries = qualitySourceRetry
      ? Math.max(maxDispatchRetriesForJob(job), workflowSourceCollectionMaxRetries(env))
      : concreteArtifactRetry
        ? Math.max(maxDispatchRetriesForJob(job), 3)
      : leaderControlRetry
        ? workflowLeaderControlMaxRetries(env, job)
      : (Number.isFinite(Number(failureMeta.maxRetries)) ? Number(failureMeta.maxRetries) : maxDispatchRetriesForJob(job));
    const retryable = Boolean((qualitySourceRetry || concreteArtifactRetry || leaderControlRetry || failureMeta.retryable) && attempts < maxRetries);
    return {
      attempts,
      maxRetries,
      retryable,
      nextRetryAt: retryable ? computeNextRetryAt(attempts) : null
    };
  }

  function workflowRestartRequiredFailureMeta(env = {}, job = {}, reason = '') {
    return {
      failureCategory: 'workflow_restart_required',
      retryable: false,
      attempts: providerRunAttempts(job) || 1,
      maxRetries: workflowProviderRunMaxAttempts(env, job),
      restartRequired: true,
      reason: workflowRestartRequiredReason(job, reason)
    };
  }

  return {
    agentCompletionFailureRetryMeta,
    markAgentCompletionFailedFreeInState,
    sourceCollectionFailureRetryMeta,
    workflowBuiltInFailureRetryMeta,
    workflowChildDispatchFailureRequiresRestart,
    workflowQualitySourceTask,
    workflowRestartRequiredFailureMeta
  };
}
