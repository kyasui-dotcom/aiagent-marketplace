export function createWorkerLifecycleHandlers({
  ORCHESTRATION_WATCHDOG_POLICY,
  failJob,
  processWorkflowDispatchQueueMessage,
  recoverWorkflowEndpointDispatchJobs,
  runMinuteWorkflowCompletionSweep,
  runQueuedEndpointDispatchSweep,
  runRecurringOrderSweep,
  runWorkflowOrchestrationWatchdog,
  runWorkflowTimeoutRetrySweep,
  runtimeStorage,
  sweepTimedOutJobs,
  touchEvent
}) {
  async function queue(batch, env, ctx) {
    const storage = runtimeStorage(env);
    for (const message of batch?.messages || []) {
      try {
        const result = await processWorkflowDispatchQueueMessage(storage, env, message?.body || {});
        if (['already_running_fresh', 'lock_not_persisted'].includes(String(result?.mode || '')) && typeof message?.retry === 'function') {
          message.retry({ delaySeconds: result.retryDelaySeconds || 180 });
        } else if (typeof message?.ack === 'function') {
          message.ack();
        }
      } catch (error) {
        const jobId = String(message?.body?.jobId || message?.body?.job_id || '').trim();
        await touchEvent(storage, 'FAILED', `workflow dispatch queue message failed${jobId ? ` for ${jobId.slice(0, 6)}` : ''}: ${String(error?.message || error).slice(0, 160)}`);
        if (jobId) {
          await failJob(storage, jobId, `Workflow dispatch queue message failed: ${String(error?.message || error).slice(0, 260)}`, ['queue consumer exception before durable completion'], {
            failureStatus: 'failed',
            failureCategory: 'dispatch_queue_consumer_failed',
            retryable: false,
            source: 'workflow-dispatch-queue'
          }).catch(() => null);
        }
        if (typeof message?.ack === 'function') message.ack();
      }
    }
  }

  async function scheduled(controller, env, ctx) {
    const cron = controller?.cron || '';
    const storage = runtimeStorage(env);
    if (cron === '* * * * *') {
      const scheduledTime = Number(controller?.scheduledTime || Date.now()) || Date.now();
      ctx.waitUntil((async () => {
        await runMinuteWorkflowCompletionSweep(storage, env, cron, scheduledTime);
        await sweepTimedOutJobs(storage, {
          eventSource: 'cron',
          env
        });
        await runWorkflowTimeoutRetrySweep(storage, env, {
          source: 'minute-cron',
          cron,
          limit: Math.min(5, Number(env?.WORKFLOW_TIMEOUT_RETRY_SWEEP_LIMIT || 5) || 5),
          waitUntil: (promise) => ctx.waitUntil(promise)
        });
        await runWorkflowOrchestrationWatchdog(storage, env, {
          source: 'minute-cron',
          cron,
          limit: Math.min(10, Number(env?.WORKFLOW_ORCHESTRATION_WATCHDOG_LIMIT || 10) || 10),
          staleAfterMs: Number(env?.WORKFLOW_ORCHESTRATION_STALE_MS || ORCHESTRATION_WATCHDOG_POLICY.staleAfterMs) || ORCHESTRATION_WATCHDOG_POLICY.staleAfterMs,
          blockedAfterMs: Number(env?.WORKFLOW_ORCHESTRATION_BLOCKED_MS || ORCHESTRATION_WATCHDOG_POLICY.blockedAfterMs) || ORCHESTRATION_WATCHDOG_POLICY.blockedAfterMs,
          reason: 'minute cron orchestration watchdog dispatch',
          waitUntil: (promise) => ctx.waitUntil(promise)
        });
        await runQueuedEndpointDispatchSweep(storage, env, {
          source: 'minute-cron',
          cron,
          limit: Math.min(8, Number(env?.QUEUED_DISPATCH_SWEEP_LIMIT || 8) || 8),
          reason: 'minute cron dispatch sweep',
          waitUntil: (promise) => ctx.waitUntil(promise)
        });
      })());
      return;
    }
    ctx.waitUntil((async () => {
      await recoverWorkflowEndpointDispatchJobs(storage, env, {
        source: 'cron',
        cron,
        limit: Number(env?.SCHEDULED_BUILTIN_COMPLETION_SWEEP_LIMIT || 10) || 10
      });
      await sweepTimedOutJobs(storage, {
        eventSource: 'cron',
        env
      });
      await runWorkflowTimeoutRetrySweep(storage, env, {
        source: 'cron',
        cron,
        limit: Number(env?.WORKFLOW_TIMEOUT_RETRY_SWEEP_LIMIT || 10) || 10,
        waitUntil: (promise) => ctx.waitUntil(promise)
      });
      await runWorkflowOrchestrationWatchdog(storage, env, {
        source: 'cron',
        cron,
        limit: Number(env?.WORKFLOW_ORCHESTRATION_WATCHDOG_LIMIT || ORCHESTRATION_WATCHDOG_POLICY.maxParentsPerSweep) || ORCHESTRATION_WATCHDOG_POLICY.maxParentsPerSweep,
        staleAfterMs: Number(env?.WORKFLOW_ORCHESTRATION_STALE_MS || ORCHESTRATION_WATCHDOG_POLICY.staleAfterMs) || ORCHESTRATION_WATCHDOG_POLICY.staleAfterMs,
        blockedAfterMs: Number(env?.WORKFLOW_ORCHESTRATION_BLOCKED_MS || ORCHESTRATION_WATCHDOG_POLICY.blockedAfterMs) || ORCHESTRATION_WATCHDOG_POLICY.blockedAfterMs,
        reason: 'cron orchestration watchdog dispatch',
        waitUntil: (promise) => ctx.waitUntil(promise)
      });
      await runQueuedEndpointDispatchSweep(storage, env, {
        source: 'cron',
        cron,
        limit: Number(env?.QUEUED_DISPATCH_SWEEP_LIMIT || 12) || 12,
        reason: 'cron dispatch sweep',
        waitUntil: (promise) => ctx.waitUntil(promise)
      });
    })());
    if (cron !== '* * * * *') {
      ctx.waitUntil(runRecurringOrderSweep(storage, env, {
        source: 'cron',
        cron,
        limit: Number(env?.RECURRING_SWEEP_LIMIT || 10) || 10
      }));
    }
  }

  return Object.freeze({ queue, scheduled });
}
