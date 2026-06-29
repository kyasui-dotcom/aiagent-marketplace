export function createWorkflowDispatchQueueHelpers({ nowIso } = {}) {
  function workflowDispatchQueue(env = {}) {
    const queue = env?.WORKFLOW_DISPATCH_QUEUE;
    return queue && typeof queue.send === 'function' ? queue : null;
  }

  async function enqueueEndpointDispatch(env = {}, job = {}, agent = {}, options = {}) {
    const queue = workflowDispatchQueue(env);
    const jobId = String(job?.id || options.jobId || '').trim();
    const agentId = String(agent?.id || options.agentId || '').trim();
    if (!queue) return { ok: false, reason: 'queue_not_configured' };
    if (!jobId || !agentId) return { ok: false, reason: 'job_or_agent_missing' };
    await queue.send({
      kind: 'endpoint_dispatch',
      jobId,
      agentId,
      workflowParentId: job?.workflowParentId || options.workflowParentId || null,
      source: options.source || 'endpoint-dispatch-queue',
      queuedAt: nowIso()
    }, { contentType: 'json' });
    return { ok: true, jobId, agentId };
  }

  function workflowQueueSourceCollectionTimeoutMs(env = {}) {
    const configured = Number(env?.WORKFLOW_QUEUE_SOURCE_COLLECTION_TIMEOUT_MS || env?.WORKFLOW_SOURCE_COLLECTION_QUEUE_TIMEOUT_MS || 0);
    return Number.isFinite(configured) && configured > 0
      ? Math.max(5000, Math.min(25000, configured))
      : 20000;
  }

  function workflowQueueGenerationTimeoutMs(env = {}, sourceTimeoutMs = 30000) {
    const configured = Number(env?.WORKFLOW_QUEUE_GENERATION_TIMEOUT_MS || env?.WORKFLOW_DISPATCH_QUEUE_GENERATION_TIMEOUT_MS || 0);
    if (Number.isFinite(configured) && configured > 0) return Math.max(8000, Math.min(28000, configured));
    const sourceBudget = Number(sourceTimeoutMs) || 30000;
    return Math.max(10000, Math.min(28000, sourceBudget + 4000));
  }

  return {
    enqueueEndpointDispatch,
    workflowDispatchQueue,
    workflowQueueGenerationTimeoutMs,
    workflowQueueSourceCollectionTimeoutMs
  };
}
