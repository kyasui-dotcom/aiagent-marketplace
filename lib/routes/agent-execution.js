export function createAgentExecutionRouteHandlers(deps = {}) {
  const {
    authorizeConnectedAgentAction,
    canTransitionJob,
    cloneJob,
    completeJobFromAgentResult,
    currentUserContext,
    extractCallbackToken,
    failJob,
    isAgentVerified,
    isTerminalJobStatus,
    json,
    normalizeCallbackPayload,
    nowIso,
    parseBody,
    publicAgent,
    reconcileWorkflowParent,
    recordBillingOutcome,
    secretEquals,
    touchEvent,
    transitionErrorCode
  } = deps;

  async function handleClaimJob(storage, request, env, jobId) {
    const current = await currentUserContext(request, env);
    let body = {};
    try {
      body = await parseBody(request);
    } catch (error) {
      return json({ error: error.message }, 400);
    }
    const state = await storage.getState();
    const existingJob = state.jobs.find((item) => item.id === jobId);
    if (!existingJob) return json({ error: 'Job not found' }, 404);
    const requestedAgentId = String(body.agent_id || existingJob.assignedAgentId || '').trim();
    if (!requestedAgentId) return json({ error: 'agent_id required' }, 400);
    const authorization = authorizeConnectedAgentAction(state, request, env, requestedAgentId, current);
    if (authorization.error) return json({ error: authorization.error }, authorization.statusCode || 400);
    const result = await storage.mutate(async (state) => {
      const job = state.jobs.find((item) => item.id === jobId);
      if (!job) return { error: 'Job not found', statusCode: 404 };
      const agent = state.agents.find((item) => item.id === requestedAgentId);
      if (!agent) return { error: 'Agent not found', statusCode: 404 };
      if (!isAgentVerified(agent)) return { error: 'Agent is not verified', statusCode: 403 };
      if (!agent.taskTypes.includes(job.taskType)) return { error: 'Agent cannot accept this job type', statusCode: 400 };
      if (job.assignedAgentId && job.assignedAgentId !== agent.id) return { error: 'Invalid assignment', statusCode: 401 };
      if (isTerminalJobStatus(job.status)) return { error: `Job is already terminal (${job.status})`, statusCode: 409, code: 'job_already_terminal' };
      if (!canTransitionJob(job, 'claim')) return { error: `Job status ${job.status} cannot be claimed`, statusCode: 400, code: transitionErrorCode(job, 'claim') };
      job.assignedAgentId = agent.id;
      job.status = 'claimed';
      job.claimedAt = nowIso();
      job.logs = [...(job.logs || []), `claimed by ${agent.id}`];
      return { ok: true, job: cloneJob(job), agent: publicAgent(agent) };
    });
    if (result.error) return json({ error: result.error, code: result.code || null }, result.statusCode || 400);
    if (result.job?.workflowParentId) await reconcileWorkflowParent(storage, result.job.workflowParentId);
    await touchEvent(storage, 'RUNNING', `${result.agent.name} claimed ${result.job.taskType}/${result.job.id.slice(0, 6)}`);
    return json(result);
  }

  async function handleSubmitResult(storage, request, env, jobId) {
    const current = await currentUserContext(request, env);
    let body;
    try {
      body = await parseBody(request);
    } catch (error) {
      return json({ error: error.message }, 400);
    }
    const requestedAgentId = String(body.agent_id || '').trim();
    if (!requestedAgentId) return json({ error: 'agent_id required' }, 400);
    const state = await storage.getState();
    const authorization = authorizeConnectedAgentAction(state, request, env, requestedAgentId, current);
    if (authorization.error) return json({ error: authorization.error }, authorization.statusCode || 400);
    const result = await completeJobFromAgentResult(storage, jobId, requestedAgentId, body, { source: 'manual-result', targetStatus: body.status, env });
    if (result.error) return json({ error: result.error, code: result.code || null }, result.statusCode || 400);
    if (result.mode === 'failed') {
      await touchEvent(storage, 'FAILED', `${result.job.taskType}/${result.job.id.slice(0, 6)} failed by connected agent: ${String(result.job.failureReason || '').slice(0, 120)}`);
    } else if (result.mode === 'blocked') {
      await touchEvent(storage, 'RUNNING', `${result.job.taskType}/${result.job.id.slice(0, 6)} blocked by connected agent result`);
    } else {
      await touchEvent(storage, 'COMPLETED', `${result.job.taskType}/${result.job.id.slice(0, 6)} completed by connected agent`);
      await recordBillingOutcome(storage, result.job, result.billing, 'manual-result');
    }
    return json({
      ...result,
      delivery: {
        report: result.job.output?.report || null,
        files: result.job.output?.files || [],
        returnTargets: result.job.output?.returnTargets || ['chat', 'api', 'webhook']
      }
    });
  }

  async function handleAgentCallback(storage, request, env = {}) {
    let body;
    try {
      body = await parseBody(request);
    } catch (error) {
      return json({ error: error.message }, 400);
    }
    if (!body.job_id || !body.agent_id) return json({ error: 'job_id and agent_id required' }, 400);
    const callback = normalizeCallbackPayload(body);
    const state = await storage.getState();
    const job = state.jobs.find((item) => item.id === body.job_id);
    if (!job) return json({ error: 'Job not found' }, 404);
    if (job.assignedAgentId !== body.agent_id) return json({ error: 'Invalid assignment' }, 401);
    if (!canTransitionJob(job, 'callback')) {
      const code = transitionErrorCode(job, 'callback');
      return json({ error: `Job status ${job.status} cannot be changed by callback`, code, job_status: job.status }, 409);
    }
    const providedToken = extractCallbackToken(request, body);
    if (!providedToken || !job.callbackToken || !secretEquals(providedToken, job.callbackToken)) return json({ error: 'Invalid callback token' }, 403);
    if (callback.status === 'failed') {
      const failed = await failJob(storage, body.job_id, callback.failureReason || 'Agent reported failure', [`failed by ${body.agent_id}`, 'failure source=callback'], {
        failureStatus: 'failed',
        failureCategory: 'agent_failed',
        source: 'callback',
        externalJobId: callback.externalJobId
      });
      if (!failed) return json({ error: 'Job not found' }, 404);
      await touchEvent(storage, 'FAILED', `${failed.taskType}/${failed.id.slice(0, 6)} failed by callback`);
      return json({
        ok: true,
        status: failed.status,
        failure_reason: failed.failureReason || callback.failureReason || 'Agent reported failure without a detailed reason.',
        job: failed,
        delivery: { report: null, files: [], returnTargets: [] }
      });
    }
    const result = await completeJobFromAgentResult(storage, body.job_id, body.agent_id, {
      report: callback.report,
      files: callback.files,
      usage: callback.usage,
      return_targets: callback.returnTargets
    }, { source: 'callback', externalJobId: callback.externalJobId, targetStatus: callback.status, env });
    if (result.error) return json({ error: result.error, code: result.code || null, job_status: result.job?.status || null }, result.statusCode || 400);
    if (result.mode === 'failed') {
      await touchEvent(storage, 'FAILED', `${result.job.taskType}/${result.job.id.slice(0, 6)} failed by callback: ${String(result.job.failureReason || '').slice(0, 120)}`);
    } else if (result.mode === 'blocked') {
      await touchEvent(storage, 'RUNNING', `${result.job.taskType}/${result.job.id.slice(0, 6)} blocked by callback`);
    } else {
      await touchEvent(storage, 'COMPLETED', `${result.job.taskType}/${result.job.id.slice(0, 6)} completed by callback`);
      await recordBillingOutcome(storage, result.job, result.billing, 'callback');
    }
    return json({
      ok: true,
      status: result.job.status,
      job: result.job,
      billing: result.billing,
      delivery: {
        report: result.job.output?.report || null,
        files: result.job.output?.files || [],
        returnTargets: result.job.output?.returnTargets || ['chat', 'api', 'webhook']
      }
    });
  }

  return {
    handleClaimJob,
    handleSubmitResult,
    handleAgentCallback
  };
}
