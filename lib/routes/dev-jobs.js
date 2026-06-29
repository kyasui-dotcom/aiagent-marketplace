export function createDevJobRouteHandlers(deps = {}) {
  const {
    accountIdForLogin,
    appendBillingAudit,
    billingLogLine,
    currentUserContext,
    clearDeliveryCompletionGate,
    estimateBilling,
    json,
    nowIso,
    parseBody,
    assignAgentForTask,
    reconcileWorkflowParent,
    recordBillingOutcome,
    requesterContextFromUser,
    runRecurringOrderSweep,
    runWorkflowTimeoutRetrySweep,
    runtimePolicy,
    settleAgentEarnings,
    setDeliveryCompletionGate,
    sweepTimedOutJobs,
    touchEvent
  } = deps;

  function devApiDisabledResponse(env) {
    return runtimePolicy(env).devApiEnabled ? null : json({ error: 'Dev API disabled' }, 403);
  }

  async function handleResolveJob(storage, request, env) {
    const disabled = devApiDisabledResponse(env);
    if (disabled) return disabled;
    let body;
    try {
      body = await parseBody(request);
    } catch (error) {
      return json({ error: error.message }, 400);
    }
    const mode = body.mode || 'complete';
    const result = await storage.mutate(async (state) => {
      const job = state.jobs.find((j) => j.id === body.job_id);
      if (!job) return { error: 'Job not found', statusCode: 404 };
      if (!job.assignedAgentId) return { error: 'No assigned agent', statusCode: 400 };
      const agent = state.agents.find((a) => a.id === job.assignedAgentId);
      if (!agent) return { error: 'Assigned agent not found', statusCode: 404 };
      job.startedAt = nowIso();
      job.status = 'running';
      job.logs.push(`started by ${agent.id}`);
      if (mode === 'fail') {
        job.status = 'failed';
        job.failedAt = nowIso();
        job.failureReason = 'Simulated failure';
        job.logs.push('simulated failure');
        return { status: 'failed', job };
      }
      const usage = { api_cost: Math.max(60, Math.min(240, Math.round((job.budgetCap || 180) * 0.35))), simulated: true };
      const billing = estimateBilling(agent, usage);
      job.dispatch = {
        ...(job.dispatch || {}),
        attempts: Math.max(1, Number(job.dispatch?.attempts || 0)),
        retryable: false,
        nextRetryAt: null,
        completionStatus: 'completed',
        lastAttemptAt: nowIso()
      };
      job.status = 'completed';
      job.completedAt = nowIso();
      job.usage = usage;
      job.output = { summary: `Simulated completion for ${job.taskType}`, naturalLanguageIntent: job.prompt };
      job.actualBilling = billing;
      setDeliveryCompletionGate(job, job.completedAt);
      job.logs.push(`completed by ${agent.id}`, billingLogLine(job, billing), `delivery completion gate score=${job.deliveryCompletionGate.score}`);
      settleAgentEarnings(job, agent, billing);
      return { status: 'completed', job, billing };
    });
    if (result.error) return json({ error: result.error }, result.statusCode || 400);
    if (result.status === 'failed') {
      await touchEvent(storage, 'FAILED', `${result.job.taskType}/${result.job.id.slice(0, 6)} failed`);
      return json({ status: 'failed', failure_reason: result.job.failureReason, job: result.job });
    }
    await touchEvent(storage, 'RUNNING', `${result.job.assignedAgentId} started ${result.job.taskType}/${result.job.id.slice(0, 6)}`);
    await touchEvent(storage, 'COMPLETED', `${result.job.taskType}/${result.job.id.slice(0, 6)} completed`);
    await recordBillingOutcome(storage, result.job, result.billing, 'worker-dev-resolve-job');
    if (result.job?.workflowParentId) await reconcileWorkflowParent(storage, result.job.workflowParentId);
    return json({ status: 'completed', billing: result.billing, job: result.job });
  }

  async function handleTimeoutSweep(storage, request, env) {
    const disabled = devApiDisabledResponse(env);
    if (disabled) return disabled;
    let body = {};
    try {
      body = await parseBody(request);
    } catch (error) {
      return json({ error: error.message }, 400);
    }
    const now = Date.now();
    const hasExplicitStaleMs = Object.prototype.hasOwnProperty.call(body || {}, 'stale_ms');
    const rawStaleMs = Number(body?.stale_ms);
    const staleMs = hasExplicitStaleMs
      ? (Number.isFinite(rawStaleMs) ? Math.max(0, rawStaleMs) : 0)
      : null;
    const result = await sweepTimedOutJobs(storage, {
      nowMs: now,
      staleMs,
      eventSource: 'dev_api',
      env
    });
    const retry = await runWorkflowTimeoutRetrySweep(storage, env, {
      limit: body.retry_limit || body.retryLimit || 3
    });
    return json({ ok: true, swept: result.swept, count: result.swept.length, retry });
  }

  async function handleRecurringSweep(storage, request, env) {
    const disabled = devApiDisabledResponse(env);
    if (disabled) return disabled;
    const body = await parseBody(request).catch((error) => ({ __error: error.message }));
    if (body.__error) return json({ error: body.__error }, 400);
    return json(await runRecurringOrderSweep(storage, env, {
      request,
      limit: body.limit || 10,
      at: body.at || nowIso()
    }));
  }

  async function handleSeed(storage, request, env) {
    const disabled = devApiDisabledResponse(env);
    if (disabled) return disabled;
    const samples = [
      ['research', 'Compare used iPhone resale routes'],
      ['summary', 'Summarize broker operator workflow'],
      ['code', 'Improve retryable failure output']
    ];
    const current = await currentUserContext(request, env);
    const requester = requesterContextFromUser(current.user, current.authProvider, {
      login: current.login,
      accountId: accountIdForLogin(current.login)
    });
    const state = await storage.getState();
    const seededIds = [];
    for (const [taskType, prompt] of samples) {
      const picked = assignAgentForTask(state.agents, taskType, 300);
      if (!picked) continue;
      const usage = { api_cost: 90, simulated: true };
      const billing = estimateBilling(picked.agent, usage);
      const job = {
        id: crypto.randomUUID(),
        parentAgentId: 'cloudcode-main',
        taskType,
        prompt,
        input: { _broker: { requester, billingMode: 'monthly_invoice' } },
        budgetCap: 300,
        deadlineSec: 120,
        priority: 'normal',
        status: 'completed',
        assignedAgentId: picked.agent.id,
        score: picked.score,
        createdAt: nowIso(),
        startedAt: nowIso(),
        completedAt: nowIso(),
        actualBilling: billing,
        usage,
        output: { summary: 'demo output' },
        logs: ['seeded demo job']
      };
      await storage.mutate(async (draft) => {
        draft.jobs.unshift(job);
        const agent = draft.agents.find((a) => a.id === picked.agent.id);
        if (agent) agent.earnings = +(Number(agent.earnings || 0) + billing.agentPayout).toFixed(1);
      });
      seededIds.push(job.id);
      await touchEvent(storage, 'MATCHED', `${job.taskType}/${job.id.slice(0, 6)} -> ${picked.agent.name}`);
      await touchEvent(storage, 'COMPLETED', `${job.taskType}/${job.id.slice(0, 6)} completed`);
      await touchEvent(storage, 'BILLED', `api=${job.actualBilling.apiCost} total=${job.actualBilling.total}`);
      await appendBillingAudit(storage, job, job.actualBilling, { source: 'worker-seed' });
    }
    return json({ ok: true, job_ids: seededIds });
  }

  return {
    handleRecurringSweep,
    handleResolveJob,
    handleSeed,
    handleTimeoutSweep
  };
}
