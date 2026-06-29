export function createSampleAgentManifestRouteHandlers(deps = {}) {
  const {
    json,
    normalizeTaskTypes,
    parseBody,
    sampleAgentDefinitionForKind
  } = deps;

  function sampleAgentManifestRoute(pathname = '') {
    const match = String(pathname || '').match(/^\/sample-agents\/([^/]+)\/(health|jobs)$/);
    if (!match) return null;
    const kind = decodeURIComponent(match[1] || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
    const action = String(match[2] || '').trim().toLowerCase();
    const definition = sampleAgentDefinitionForKind(kind);
    if (!kind || !definition?.manifest) return { error: 'Unknown sample agent kind', statusCode: 404 };
    if (!definition.provider || typeof definition.provider.health !== 'function' || typeof definition.provider.runJob !== 'function') {
      return { error: 'Sample agent manifest does not expose an agent-file provider', statusCode: 500 };
    }
    return { kind, action, definition, manifest: definition.manifest };
  }

  function normalizeSampleAgentManifestJobBody(kind = '', body = {}) {
    const input = body?.input && typeof body.input === 'object' ? body.input : {};
    return {
      ...body,
      agent_kind: kind,
      agentKind: kind,
      task_type: body.task_type || body.taskType || body.dispatch_task_type || body.dispatchTaskType || kind,
      taskType: body.taskType || body.task_type || body.dispatchTaskType || body.dispatch_task_type || kind,
      workflow_task: body.workflow_task || body.workflowTask || body.task_type || kind,
      workflowTask: body.workflowTask || body.workflow_task || body.taskType || kind,
      prompt: String(body.full_prompt || body.fullPrompt || body.prompt || '').trim(),
      goal: body.goal || body.full_prompt || body.fullPrompt || body.prompt || '',
      input,
      return_targets: body.return_targets || body.returnTargets || ['chat', 'api']
    };
  }

  async function handleSampleAgentManifestRequest(request, env, route) {
    if (!route || route.error) {
      return json({ error: route?.error || 'Sample agent manifest route not found' }, route?.statusCode || 404);
    }
    if (route.action === 'health') {
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        return json({ error: 'Method not allowed' }, 405);
      }
      return json(route.definition.provider.health({ kind: route.kind, definition: route.definition, source: env, manifest: route.manifest }));
    }
    if (route.action !== 'jobs') return json({ error: 'Sample agent manifest route not found' }, 404);
    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405);
    }
    const body = await parseBody(request).catch((error) => ({ __error: error.message }));
    if (body.__error) return json({ error: body.__error }, 400);
    try {
      const result = await route.definition.provider.runJob({
        kind: route.kind,
        definition: route.definition,
        body: normalizeSampleAgentManifestJobBody(route.kind, body),
        source: env,
        manifest: route.manifest
      });
      return json(result);
    } catch (error) {
      return json({
        status: 'failed',
        error: String(error?.message || error || 'Sample agent manifest provider failed'),
        failure_reason: String(error?.message || error || 'Sample agent manifest provider failed')
      }, 500);
    }
  }

  return {
    handleSampleAgentManifestRequest,
    sampleAgentManifestRoute
  };
}
