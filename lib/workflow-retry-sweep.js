export function createWorkflowRetrySweep(deps = {}) {
  const {
    cloneJob,
    clearDeliveryCompletionGate,
    failJob,
    maxDispatchRetriesForJob,
    nowIso,
    pauseTerminalWorkflowChildRetryForParentAuthority,
    providerRunAttempts,
    reconcileWorkflowParent,
    touchEvent,
    workflowChildDispatchFailureRequiresRestart,
    workflowCompletionRetryLimitForJob,
    workflowDispatchMaxAgeMs,
    workflowProviderRunMaxAttempts,
    workflowRestartRequiredReason
  } = deps;

  async function mutateRetryJob(storage, job, mutator) {
    const jobId = String(job?.id || '').trim();
    const agentId = String(job?.assignedAgentId || '').trim();
    if (jobId && agentId && typeof storage.mutateJobAndAgent === 'function') {
      return storage.mutateJobAndAgent(jobId, agentId, mutator);
    }
    return storage.mutate(mutator);
  }

  async function runWorkflowTimeoutRetrySweep(storage, env, options = {}) {
    const limit = Math.max(1, Math.min(10, Number(options.limit || 3) || 3));
    const workflowCandidates = typeof storage.listRetryableWorkflowChildren === 'function'
      ? await storage.listRetryableWorkflowChildren({
        limit: Math.max(limit * 4, 12),
        maxAgeMs: workflowDispatchMaxAgeMs(env)
      })
      : null;
    const retryableCandidates = typeof storage.listRetryableDispatchJobs === 'function'
      ? await storage.listRetryableDispatchJobs({
        limit: Math.max(limit * 4, 12),
        maxAgeMs: workflowDispatchMaxAgeMs(env)
      })
      : null;
    const targetedCandidates = workflowCandidates || retryableCandidates
      ? [...(workflowCandidates || []), ...(retryableCandidates || [])]
        .filter((job, index, all) => job?.id && all.findIndex((item) => item?.id === job.id) === index)
        .sort((left, right) => String(left?.dispatch?.nextRetryAt || left?.failedAt || left?.timedOutAt || left?.createdAt || '').localeCompare(String(right?.dispatch?.nextRetryAt || right?.failedAt || right?.timedOutAt || right?.createdAt || '')))
      : null;
    const state = targetedCandidates ? null : await storage.getState();
    const candidates = targetedCandidates || state.jobs
      .filter((job) => ['timed_out', 'failed'].includes(String(job.status || '').trim().toLowerCase()))
      .filter((job) => job.assignedAgentId && job.dispatch?.retryable === true)
      .filter((job) => {
        const nextRetryMs = Date.parse(String(job?.dispatch?.nextRetryAt || ''));
        return !Number.isFinite(nextRetryMs) || nextRetryMs <= Date.now();
      })
      .sort((a, b) => String(a.timedOutAt || a.failedAt || a.createdAt || '').localeCompare(String(b.timedOutAt || b.failedAt || b.createdAt || '')));
    const restartRequired = [];
    const retried = [];
    for (const job of candidates) {
      if ((restartRequired.length + retried.length) >= limit) break;
      if (!job?.workflowParentId) {
        const status = String(job?.status || '').trim().toLowerCase();
        if (!['failed', 'timed_out'].includes(status)) continue;
        const retryMeta = {
          category: String(job.failureCategory || job.dispatch?.completionStatus || (status === 'timed_out' ? 'dispatch_deadline_timeout' : 'dispatch_error')).trim().toLowerCase(),
          attempts: Number(job.dispatch?.attempts || 0) || 0,
          maxRetries: maxDispatchRetriesForJob(job)
        };
        const queued = await mutateRetryJob(storage, job, async (draft) => {
          const draftJob = draft.jobs.find((item) => item.id === job.id);
          if (!draftJob) return { error: 'Job not found', statusCode: 404 };
          const queuedAt = nowIso();
          draftJob.status = 'queued';
          draftJob.startedAt = null;
          draftJob.dispatchedAt = null;
          draftJob.claimedAt = null;
          draftJob.completedAt = null;
          draftJob.failedAt = null;
          draftJob.timedOutAt = null;
          draftJob.failureReason = null;
          draftJob.failureCategory = null;
          draftJob.output = null;
          draftJob.actualBilling = null;
          clearDeliveryCompletionGate(draftJob);
          draftJob.dispatch = {
            ...(draftJob.dispatch || {}),
            completionStatus: 'retry_queued',
            retryable: false,
            nextRetryAt: null,
            restartRequired: false,
            retryQueuedAt: queuedAt,
            retrySource: 'agent-retry-sweep',
            maxRetries: retryMeta.maxRetries
          };
          draftJob.logs = [...(draftJob.logs || []), `agent run requeued by retry sweep after ${retryMeta.category} (${retryMeta.attempts}/${retryMeta.maxRetries})`];
          return { ok: true, job: cloneJob(draftJob) };
        });
        if (!queued?.error) {
          retried.push(job.id);
          await touchEvent(storage, 'RUNNING', `${job.taskType}/${job.id.slice(0, 6)} agent run requeued after ${retryMeta.category}`, {
            kind: 'agent_run_retry_queued',
            jobId: job.id,
            taskType: job.workflowTask || job.taskType || '',
            category: retryMeta.category,
            attempts: retryMeta.attempts,
            maxRetries: retryMeta.maxRetries
          });
        }
        continue;
      }
      const authorityRetryPause = await pauseTerminalWorkflowChildRetryForParentAuthority(storage, job);
      if (authorityRetryPause.paused) {
        await touchEvent(storage, 'RUNNING', `${job.taskType}/${job.id.slice(0, 6)} retry paused while parent waits for approval`, {
          kind: 'retry_paused_for_parent_authority',
          jobId: job.id,
          parentJobId: job.workflowParentId,
          taskType: job.workflowTask || job.taskType || ''
        });
        continue;
      }
      const status = String(job.status || '').trim().toLowerCase();
      if (!['failed', 'timed_out'].includes(status)) continue;
      if (String(job.failureCategory || '').trim().toLowerCase() === 'workflow_restart_required' || job.dispatch?.restartRequired === true) {
        await reconcileWorkflowParent(storage, job.workflowParentId);
        continue;
      }
      const category = String(job.failureCategory || job.dispatch?.completionStatus || (status === 'timed_out' ? 'dispatch_deadline_timeout' : 'dispatch_error')).trim().toLowerCase();
      const retryMeta = {
        category: category === 'deadline_timeout' ? 'dispatch_deadline_timeout' : category,
        retryable: job.dispatch?.retryable === true,
        attempts: providerRunAttempts(job) || Number(job.dispatch?.attempts || 0) || 0,
        maxRetries: workflowCompletionRetryLimitForJob(env, job),
        nextRetryAt: null
      };
      if (!workflowChildDispatchFailureRequiresRestart(env, job, retryMeta)) {
        const queued = await mutateRetryJob(storage, job, async (draft) => {
          const draftJob = draft.jobs.find((item) => item.id === job.id);
          if (!draftJob) return { error: 'Job not found', statusCode: 404 };
          const queuedAt = nowIso();
          draftJob.status = 'queued';
          draftJob.startedAt = null;
          draftJob.dispatchedAt = null;
          draftJob.claimedAt = null;
          draftJob.completedAt = null;
          draftJob.failedAt = null;
          draftJob.timedOutAt = null;
          draftJob.failureReason = null;
          draftJob.failureCategory = null;
          draftJob.output = null;
          draftJob.actualBilling = null;
          clearDeliveryCompletionGate(draftJob);
          draftJob.dispatch = {
            ...(draftJob.dispatch || {}),
            completionStatus: 'retry_queued',
            retryable: false,
            nextRetryAt: null,
            restartRequired: false,
            retryQueuedAt: queuedAt,
            retrySource: 'workflow-timeout-retry-sweep',
            maxRetries: retryMeta.maxRetries
          };
          draftJob.logs = [...(draftJob.logs || []), `workflow child requeued by retry sweep after ${retryMeta.category} (${retryMeta.attempts}/${retryMeta.maxRetries})`];
          return { ok: true, job: cloneJob(draftJob) };
        });
        if (!queued?.error) {
          retried.push(job.id);
          await touchEvent(storage, 'RUNNING', `${job.taskType}/${job.id.slice(0, 6)} workflow child requeued after ${retryMeta.category}`, {
            kind: 'workflow_child_retry_queued',
            jobId: job.id,
            parentJobId: job.workflowParentId,
            taskType: job.workflowTask || job.taskType || '',
            category: retryMeta.category,
            attempts: retryMeta.attempts,
            maxRetries: retryMeta.maxRetries
          });
          await reconcileWorkflowParent(storage, job.workflowParentId);
          continue;
        }
      }
      const reason = workflowRestartRequiredReason(job, job.failureReason || `${status} workflow child was previously retryable`);
      await failJob(storage, job.id, reason, ['workflow child in-place retry disabled; full order retry required'], {
        force: true,
        failureStatus: 'failed',
        failureCategory: 'workflow_restart_required',
        retryable: false,
        attempts: providerRunAttempts(job) || Number(job.dispatch?.attempts || 0) || 0,
        maxRetries: workflowProviderRunMaxAttempts(env, job),
        restartRequired: true,
        source: 'workflow-retry-sweep'
      });
      restartRequired.push(job.id);
      await touchEvent(storage, 'FAILED', `${job.taskType}/${job.id.slice(0, 6)} workflow child retry disabled; full order retry required`, {
        kind: 'workflow_restart_required',
        jobId: job.id,
        parentJobId: job.workflowParentId,
        taskType: job.workflowTask || job.taskType || ''
      });
      await reconcileWorkflowParent(storage, job.workflowParentId);
    }
    return {
      ok: true,
      retried_count: retried.length,
      job_ids: retried,
      restart_required_count: restartRequired.length,
      restart_required_job_ids: restartRequired,
      mode: retried.length ? 'workflow_child_retry_queued' : 'workflow_child_retry_exhausted'
    };
  }

  return {
    runWorkflowTimeoutRetrySweep
  };
}
