export function createAgentRegistrationRouteHandlers(deps = {}) {
  const {
    agentRoutingConfirmationAccepted,
    agentRoutingConfirmationResponse,
    agentSafetyErrorResponse,
    agentSafetyOptionsForRequest,
    applyAgentReviewToAgentRecord,
    applyConfirmedAgentRoutingToAgent,
    assessAgentRegistrationSafety,
    createAgentFromInput,
    createAgentFromManifest,
    currentAgentRequesterContext,
    json,
    loadManifestFromUrl,
    maybeAutoVerifyImportedAgent,
    normalizeManifest,
    ownerInfoFromRequest,
    parseBody,
    providerMoneyReadinessForCurrent,
    recordOrderApiKeyUsage,
    requireAgentWriteAccess,
    runAgentReviewForRequest,
    touchEvent,
    validateManifest
  } = deps;

  async function handleRegisterAgent(storage, request, env) {
    const current = await currentAgentRequesterContext(storage, request, env);
    const access = requireAgentWriteAccess(current, env);
    if (access.error) return json({ error: access.error }, access.statusCode || 400);
    const providerMoneyReadiness = await providerMoneyReadinessForCurrent(storage, current);
    let body;
    try {
      body = await parseBody(request);
    } catch (error) {
      return json({ error: error.message }, 400);
    }
    if (!body.name) return json({ error: 'name required' }, 400);
    const ownerInfo = await ownerInfoFromRequest(request, env, current);
    const safetyManifest = normalizeManifest({
      schema_version: 'agent-manifest/v1',
      name: body.name,
      description: body.description || '',
      task_types: body.task_types || body.taskTypes || ['summary'],
      metadata: body.metadata || {}
    });
    const safety = assessAgentRegistrationSafety(safetyManifest, agentSafetyOptionsForRequest(request, env));
    if (!safety.ok) return agentSafetyErrorResponse(safety);
    const agent = createAgentFromInput(body, ownerInfo);
    const state = await storage.getState();
    if (!agentRoutingConfirmationAccepted(body)) {
      return json({ ...agentRoutingConfirmationResponse(agent, state, ownerInfo, 'manual-register'), safety, provider_money_readiness: providerMoneyReadiness }, 428);
    }
    const confirmedRouting = applyConfirmedAgentRoutingToAgent(agent, {
      catalog: [agent, ...state.agents],
      confirmedBy: ownerInfo.owner,
      source: 'manual-register'
    });
    const review = await runAgentReviewForRequest(agent, request, env, { source: 'manual-register', safety });
    applyAgentReviewToAgentRecord(agent, review);
    await storage.mutate(async (state) => { state.agents.unshift(agent); });
    await touchEvent(storage, 'REGISTERED', `${agent.name} registered with tasks ${agent.taskTypes.join(', ')}`);
    if (current.apiKey?.id) await recordOrderApiKeyUsage(storage, current, request);
    return json({ ok: true, agent, safety, review, routing_confirmation: confirmedRouting.routing_confirmation, provider_money_readiness: providerMoneyReadiness }, 201);
  }

  async function handleImportManifest(storage, request, env) {
    const current = await currentAgentRequesterContext(storage, request, env);
    const access = requireAgentWriteAccess(current, env);
    if (access.error) return json({ error: access.error }, access.statusCode || 400);
    const providerMoneyReadiness = await providerMoneyReadinessForCurrent(storage, current);
    let body;
    try {
      body = await parseBody(request);
    } catch (error) {
      return json({ error: error.message }, 400);
    }
    const manifest = normalizeManifest(body.manifest || {});
    const validation = validateManifest(manifest);
    if (!validation.ok) return json({ error: validation.errors.join('; ') }, 400);
    const safety = assessAgentRegistrationSafety(manifest, agentSafetyOptionsForRequest(request, env));
    if (!safety.ok) return agentSafetyErrorResponse(safety);
    const ownerInfo = await ownerInfoFromRequest(request, env, current);
    const agent = createAgentFromManifest(manifest, ownerInfo, {
      manifestSource: 'manifest-json',
      verificationStatus: 'manifest_loaded',
      importMode: 'manifest-json'
    });
    const state = await storage.getState();
    if (!agentRoutingConfirmationAccepted(body)) {
      return json({ ...agentRoutingConfirmationResponse(agent, state, ownerInfo, 'manifest-json'), safety, provider_money_readiness: providerMoneyReadiness }, 428);
    }
    const confirmedRouting = applyConfirmedAgentRoutingToAgent(agent, {
      catalog: [agent, ...state.agents],
      confirmedBy: ownerInfo.owner,
      source: 'manifest-json'
    });
    const review = await runAgentReviewForRequest(agent, request, env, { source: 'manifest-json', safety });
    applyAgentReviewToAgentRecord(agent, review);
    await storage.mutate(async (state) => { state.agents.unshift(agent); });
    await touchEvent(storage, 'REGISTERED', `${agent.name} imported from manifest JSON (pending verification)`);
    const autoVerification = await maybeAutoVerifyImportedAgent(storage, agent, ownerInfo.owner);
    if (current.apiKey?.id) await recordOrderApiKeyUsage(storage, current, request);
    return json({ ok: true, agent: autoVerification.agent, auto_verification: autoVerification.verification, welcome_credits: autoVerification.welcome_credits || null, safety, review, routing_confirmation: confirmedRouting.routing_confirmation, provider_money_readiness: providerMoneyReadiness }, 201);
  }

  async function handleImportUrl(storage, request, env) {
    const current = await currentAgentRequesterContext(storage, request, env);
    const access = requireAgentWriteAccess(current, env);
    if (access.error) return json({ error: access.error }, access.statusCode || 400);
    const providerMoneyReadiness = await providerMoneyReadinessForCurrent(storage, current);
    let body;
    try {
      body = await parseBody(request);
    } catch (error) {
      return json({ error: error.message }, 400);
    }
    if (!body.manifest_url) return json({ error: 'manifest_url required' }, 400);
    let manifest;
    try {
      manifest = await loadManifestFromUrl(body.manifest_url, env);
    } catch (error) {
      return json({ error: error.message }, 400);
    }
    const safety = assessAgentRegistrationSafety(manifest, agentSafetyOptionsForRequest(request, env));
    if (!safety.ok) return agentSafetyErrorResponse(safety);
    const ownerInfo = await ownerInfoFromRequest(request, env, current);
    const agent = createAgentFromManifest(manifest, ownerInfo, {
      manifestUrl: body.manifest_url,
      manifestSource: body.manifest_url,
      verificationStatus: 'manifest_loaded',
      importMode: 'manifest-url'
    });
    const state = await storage.getState();
    if (!agentRoutingConfirmationAccepted(body)) {
      return json({ ...agentRoutingConfirmationResponse(agent, state, ownerInfo, 'manifest-url'), import_mode: 'manifest-url', safety, provider_money_readiness: providerMoneyReadiness }, 428);
    }
    const confirmedRouting = applyConfirmedAgentRoutingToAgent(agent, {
      catalog: [agent, ...state.agents],
      confirmedBy: ownerInfo.owner,
      source: 'manifest-url'
    });
    const review = await runAgentReviewForRequest(agent, request, env, { source: 'manifest-url', safety });
    applyAgentReviewToAgentRecord(agent, review);
    await storage.mutate(async (state) => { state.agents.unshift(agent); });
    await touchEvent(storage, 'REGISTERED', `${agent.name} manifest loaded from URL`);
    const autoVerification = await maybeAutoVerifyImportedAgent(storage, agent, ownerInfo.owner);
    if (current.apiKey?.id) await recordOrderApiKeyUsage(storage, current, request);
    return json({ ok: true, agent: autoVerification.agent, auto_verification: autoVerification.verification, welcome_credits: autoVerification.welcome_credits || null, import_mode: 'manifest-url', owner: agent.owner, safety, review, routing_confirmation: confirmedRouting.routing_confirmation, provider_money_readiness: providerMoneyReadiness }, 201);
  }

  return {
    handleRegisterAgent,
    handleImportManifest,
    handleImportUrl
  };
}
