export function createMarketplaceRegistrationHelpers(deps = {}) {
  const {
    agentReviewRouteBlockReason,
    boolFlag,
    buildAgentId,
    buildAgentRoutingConfirmation,
    currentUserContext,
    inferAgentTagsFromSignals,
    isAgentReviewApproved,
    isCoreFeatureAppId,
    json,
    loginsForCurrentAccount,
    maybeGrantWelcomeCreditsForVerifiedAgentInState,
    normalizeAppManifest,
    normalizeTaskTypes,
    nowIso,
    pricingHelpers,
    publicAgent,
    publicApp,
    runtimePolicy,
    runAgentAutoReview,
    touchEvent,
    validateAppManifest,
    validateManifestUrlInput,
    verifyAgentByHealthcheck,
    WELCOME_CREDITS_GRANT_AMOUNT
  } = deps;
  const {
    creatorFeeRateFromInput,
    marketplaceFeeRateFromInput,
    nonNegativeUsdFromInput,
    overageModeFromInput,
    platformMarginRateFromInput,
    pricingModelFromInput,
    providerMarkupRateFromInput
  } = pricingHelpers || {};

  function createAgentFromInput(body = {}, ownerInfo = { owner: 'samurai', metadata: {} }) {
    const taskTypes = normalizeTaskTypes(body.task_types || body.taskTypes || 'summary');
    const verificationStatus = body.verification_status || body.verificationStatus || 'legacy_unverified';
    const agentReviewStatus = body.agent_review_status || body.agentReviewStatus || 'pending';
    const agentReview = body.agent_review || body.agentReview || null;
    const baseMetadata = { ...(ownerInfo.metadata || {}), ...(body.metadata || {}) };
    const tags = inferAgentTagsFromSignals({
      tags: body.tags || body.team_tags || body.teamTags || baseMetadata.tags || baseMetadata.team_tags || baseMetadata.teamTags || baseMetadata.agent_tags,
      taskTypes,
      name: body.name || 'agent',
      description: body.description || 'Custom registered agent.',
      kind: body.kind || body.agent_kind || baseMetadata.category || baseMetadata.kind,
      agentRole: body.agent_role || body.agentRole || baseMetadata.agentRole || baseMetadata.agent_role,
      metadata: baseMetadata
    });
    return {
      id: buildAgentId(body.name || 'agent'),
      name: String(body.name || 'custom_agent').toUpperCase(),
      description: body.description || 'Custom registered agent.',
      taskTypes: taskTypes.length ? taskTypes : ['summary'],
      providerMarkupRate: providerMarkupRateFromInput(body),
      pricingModel: pricingModelFromInput(body),
      fixedRunPriceUsd: nonNegativeUsdFromInput(body.fixed_run_price_usd, body.fixedRunPriceUsd, body.run_price_usd, body.runPriceUsd),
      subscriptionMonthlyPriceUsd: nonNegativeUsdFromInput(body.subscription_monthly_price_usd, body.subscriptionMonthlyPriceUsd, body.monthly_price_usd, body.monthlyPriceUsd),
      overageMode: overageModeFromInput(body),
      overageFixedRunPriceUsd: nonNegativeUsdFromInput(body.overage_fixed_run_price_usd, body.overageFixedRunPriceUsd),
      tokenMarkupRate: providerMarkupRateFromInput(body),
      platformMarginRate: platformMarginRateFromInput(body),
      creatorFeeRate: providerMarkupRateFromInput(body),
      marketplaceFeeRate: platformMarginRateFromInput(body),
      premiumRate: providerMarkupRateFromInput(body),
      basicRate: platformMarginRateFromInput(body),
      successRate: Number(body.success_rate ?? body.successRate ?? 0.9),
      avgLatencySec: Number(body.avg_latency_sec ?? body.avgLatencySec ?? 20),
      online: body.online ?? true,
      token: String(body.token || `secret_${crypto.randomUUID().slice(0, 8)}`),
      earnings: Number(body.earnings ?? 0),
      owner: body.owner || ownerInfo.owner || 'samurai',
      manifestUrl: body.manifest_url || body.manifestUrl || null,
      manifestSource: body.manifest_source || body.manifestSource || null,
      tags,
      metadata: { ...baseMetadata, tags, teamTags: tags, team_tags: tags },
      verificationStatus,
      verificationCheckedAt: body.verification_checked_at || body.verificationCheckedAt || null,
      verificationError: body.verification_error || body.verificationError || null,
      verificationDetails: body.verification_details || body.verificationDetails || null,
      agentReviewStatus,
      agentReview,
      createdAt: body.created_at || body.createdAt || nowIso(),
      updatedAt: nowIso()
    };
  }

  function createAgentFromManifest(manifest, ownerInfo = { owner: 'samurai', metadata: {} }, options = {}) {
    const tags = inferAgentTagsFromSignals({
      tags: manifest.tags || manifest.raw?.tags || manifest.raw?.team_tags || manifest.raw?.teamTags || manifest.metadata?.tags || manifest.metadata?.team_tags || manifest.metadata?.teamTags,
      taskTypes: manifest.taskTypes,
      name: manifest.name,
      description: manifest.description,
      kind: manifest.kind,
      agentRole: manifest.agentRole || 'worker',
      metadata: {
        ...ownerInfo.metadata,
        ...(manifest.metadata || {}),
        manifest: manifest.raw || {}
      }
    });
    return createAgentFromInput({
      name: manifest.name,
      description: manifest.description || `Imported from manifest ${options.manifestUrl || ''}`.trim(),
      task_types: manifest.taskTypes,
      tags,
      provider_markup_rate: manifest.providerMarkupRate,
      pricing_model: manifest.pricingModel,
      fixed_run_price_usd: manifest.fixedRunPriceUsd,
      subscription_monthly_price_usd: manifest.subscriptionMonthlyPriceUsd,
      overage_mode: manifest.overageMode,
      overage_fixed_run_price_usd: manifest.overageFixedRunPriceUsd,
      token_markup_rate: manifest.tokenMarkupRate,
      platform_margin_rate: manifest.platformMarginRate,
      creator_fee_rate: manifest.creatorFeeRate,
      marketplace_fee_rate: manifest.marketplaceFeeRate,
      success_rate: manifest.successRate,
      avg_latency_sec: manifest.avgLatencySec,
      owner: manifest.owner || ownerInfo.owner,
      manifest_url: options.manifestUrl || manifest.sourceUrl || null,
      manifest_source: options.manifestSource || 'manifest',
      verification_status: options.verificationStatus || 'manifest_loaded',
      metadata: {
        ...ownerInfo.metadata,
        ...(manifest.metadata || {}),
        tags,
        teamTags: tags,
        team_tags: tags,
        agentRole: manifest.agentRole || 'worker',
        agent_layer: manifest.metadata?.agent_layer || manifest.metadata?.workflow_layer || manifest.taskRouting?.workflow_layer || null,
        workflow_layer: manifest.metadata?.workflow_layer || manifest.metadata?.agent_layer || manifest.taskRouting?.workflow_layer || null,
        taskRouting: manifest.taskRouting || manifest.metadata?.taskRouting || manifest.metadata?.task_routing || null,
        task_routing: manifest.taskRouting || manifest.metadata?.task_routing || manifest.metadata?.taskRouting || null,
        importMode: options.importMode || 'manifest',
        manifest: {
          ...manifest.raw,
          schema_version: manifest.schemaVersion,
          kind: manifest.kind,
          agent_role: manifest.agentRole || 'worker',
          tags,
          team_tags: tags,
          task_routing: manifest.taskRouting || manifest.raw?.task_routing || manifest.raw?.taskRouting || manifest.metadata?.task_routing || manifest.metadata?.taskRouting || {},
          workflow_layer: manifest.metadata?.workflow_layer || manifest.metadata?.agent_layer || manifest.taskRouting?.workflow_layer || '',
          agent_layer: manifest.metadata?.agent_layer || manifest.metadata?.workflow_layer || manifest.taskRouting?.workflow_layer || '',
          task_types: manifest.taskTypes,
          execution_pattern: manifest.executionPattern,
          input_types: manifest.inputTypes,
          output_types: manifest.outputTypes,
          clarification: manifest.clarification,
          schedule_support: manifest.scheduleSupport,
          required_connectors: manifest.requiredConnectors,
          risk_level: manifest.riskLevel,
          confirmation_required_for: manifest.confirmationRequiredFor,
          capabilities: manifest.capabilities,
          healthcheckUrl: manifest.healthcheckUrl || '',
          jobEndpoint: manifest.jobEndpoint || manifest.raw?.jobEndpoint || manifest.raw?.job_endpoint || manifest.raw?.endpoints?.jobs || manifest.raw?.metadata?.job_endpoint || manifest.raw?.metadata?.jobEndpoint || '',
          verification: manifest.verification || {},
          composition: manifest.composition || {},
          requirements: manifest.requirements || manifest.raw?.requirements || manifest.raw?.required_context || manifest.raw?.requiredContext || [],
          usage_contract: manifest.usageContract || manifest.raw?.usage_contract || manifest.raw?.usageContract || {},
          sourceUrl: options.manifestUrl || manifest.sourceUrl || null,
          endpoints: manifest.raw?.endpoints && typeof manifest.raw.endpoints === 'object' ? manifest.raw.endpoints : {},
          metadata: {
            ...(manifest.raw?.metadata && typeof manifest.raw.metadata === 'object' ? manifest.raw.metadata : {}),
            ...(manifest.metadata || {}),
            task_routing: manifest.taskRouting || manifest.metadata?.task_routing || manifest.metadata?.taskRouting || {},
            workflow_layer: manifest.metadata?.workflow_layer || manifest.metadata?.agent_layer || manifest.taskRouting?.workflow_layer || '',
            agent_layer: manifest.metadata?.agent_layer || manifest.metadata?.workflow_layer || manifest.taskRouting?.workflow_layer || '',
            tags,
            team_tags: tags
          },
          pricing: {
            provider_markup_rate: manifest.providerMarkupRate,
            token_markup_rate: manifest.tokenMarkupRate,
            platform_margin_rate: manifest.platformMarginRate,
            creator_fee_rate: manifest.creatorFeeRate,
            marketplace_fee_rate: manifest.marketplaceFeeRate
          }
        }
      }
    }, ownerInfo);
  }

  function agentRoutingConfirmationResponse(agent = {}, state = {}, ownerInfo = {}, source = 'agent-register') {
    const catalog = [agent, ...(Array.isArray(state.agents) ? state.agents : [])];
    const routingConfirmation = buildAgentRoutingConfirmation(agent, { catalog });
    return {
      ok: false,
      code: routingConfirmation.code,
      needs_confirmation: true,
      required: `${routingConfirmation.confirm_field}=true`,
      agent_preview: publicAgent(agent, catalog),
      routing_confirmation: routingConfirmation,
      owner: ownerInfo.owner || agent.owner || null,
      source,
      error: 'Confirm the inferred agent routing before registration.'
    };
  }

  function applyVerificationToAgentRecord(agent, verification) {
    agent.verificationStatus = verification.status;
    agent.verificationCheckedAt = verification.checkedAt;
    agent.verificationError = verification.ok ? null : verification.reason;
    agent.verificationDetails = {
      category: verification.category || (verification.ok ? 'verified' : 'unknown'),
      code: verification.code || (verification.ok ? 'verified' : 'verification_failed'),
      reason: verification.reason || null,
      healthcheckUrl: verification.healthcheckUrl || null,
      challengeUrl: verification.challengeUrl || verification.details?.challengeUrl || null,
      details: verification.details || null
    };
    agent.updatedAt = nowIso();
  }

  async function maybeAutoVerifyImportedAgent(storage, agent, rewardLogin = '') {
    const manifest = agent?.metadata?.manifest || {};
    const explicitHealthcheckUrl = String(manifest.healthcheckUrl || manifest.healthcheck_url || '').trim();
    if (!explicitHealthcheckUrl) return { attempted: false, agent: publicAgent(agent), verification: null, welcome_credits: null };
    if (!isAgentReviewApproved(agent)) {
      return {
        attempted: false,
        agent: publicAgent(agent),
        verification: {
          ok: false,
          status: 'review_pending',
          checkedAt: nowIso(),
          code: 'agent_review_not_approved',
          category: 'agent_review',
          reason: agentReviewRouteBlockReason(agent)
        },
        welcome_credits: null
      };
    }
    const verification = await verifyAgentByHealthcheck(agent);
    const result = await storage.mutate(async (state) => {
      const current = state.agents.find((item) => item.id === agent.id);
      if (!current) return null;
      applyVerificationToAgentRecord(current, verification);
      const welcomeCredits = verification.ok && rewardLogin
        ? maybeGrantWelcomeCreditsForVerifiedAgentInState(state, rewardLogin, current.id)
        : null;
      return { agent: publicAgent(current), welcomeCredits };
    });
    if (verification.ok) {
      await touchEvent(storage, 'VERIFIED', `${agent.name} auto verification succeeded after import`);
      if (['granted', 'topped_up'].includes(String(result?.welcomeCredits?.status || ''))) {
        await touchEvent(storage, 'CREDIT', `${rewardLogin} earned ${WELCOME_CREDITS_GRANT_AMOUNT} welcome credits for ${agent.name}`);
      } else if (result?.welcomeCredits?.status === 'rejected') {
        await touchEvent(storage, 'CREDIT', `${agent.name} welcome credits rejected: ${result.welcomeCredits.reason}`);
      }
    } else {
      await touchEvent(storage, 'FAILED', `${agent.name} auto verification failed after import: ${verification.reason}`);
    }
    return { attempted: true, agent: result?.agent || publicAgent(agent), verification, welcome_credits: result?.welcomeCredits || null };
  }

  function appManifestOptionsForRequest(request, env) {
    return { allowLocalEndpoints: agentSafetyOptionsForRequest(request, env).allowLocalEndpoints };
  }

  async function loadAppManifestFromUrl(manifestUrl, request, env) {
    const safeUrl = validateManifestUrlInput(manifestUrl, env);
    const response = await fetch(safeUrl, {
      headers: { accept: 'application/json, text/plain;q=0.8' }
    });
    if (!response.ok) throw new Error(`App manifest fetch failed (${response.status})`);
    const payload = await response.json().catch(() => null);
    if (!payload || typeof payload !== 'object') throw new Error('App manifest URL must return JSON');
    return normalizeAppManifest(payload, {
      manifestUrl: safeUrl,
      manifestSource: safeUrl,
      ...appManifestOptionsForRequest(request, env)
    });
  }

  function appOwnerMatches(app = {}, current = null) {
    const owner = String(app.owner || '').trim().toLowerCase();
    if (!owner) return false;
    return loginsForCurrentAccount(current).includes(owner);
  }

  function authorizeAppOwnerAction(state, request, env, appId, current = null) {
    const resolvedCurrent = current || null;
    const policy = runtimePolicy(env);
    if (isCoreFeatureAppId(appId)) {
      return { error: 'This CAIt feature is not part of the app catalog.', statusCode: 400, current: resolvedCurrent, policy };
    }
    const app = (Array.isArray(state.apps) ? state.apps : []).find((item) => String(item?.id || '') === String(appId || ''));
    if (!app) return { error: 'App not found', statusCode: 404, current: resolvedCurrent, policy };
    if (String(app.owner || '').toLowerCase() === 'built-in' && !policy.openWriteApiEnabled) {
      return { error: 'Built-in apps cannot be modified from the public API.', statusCode: 403, current: resolvedCurrent, policy };
    }
    if (policy.openWriteApiEnabled || appOwnerMatches(app, resolvedCurrent)) return { app, current: resolvedCurrent, policy };
    if (!resolvedCurrent?.user && resolvedCurrent?.apiKeyStatus === 'invalid') return { error: 'Invalid API key', statusCode: 401, current: resolvedCurrent, policy };
    if (!resolvedCurrent?.user && resolvedCurrent?.apiKeyStatus !== 'valid') return { error: 'Login or CAIt API key required', statusCode: 401, current: resolvedCurrent, policy };
    return { error: 'Only the app owner can perform this action', statusCode: 403, current: resolvedCurrent, policy };
  }

  function applyVerificationToAppRecord(app, verification) {
    app.verificationStatus = verification.status;
    app.verificationCheckedAt = verification.checkedAt;
    app.verificationError = verification.ok ? null : verification.reason;
    app.verificationDetails = {
      category: verification.category || (verification.ok ? 'verified' : 'unknown'),
      code: verification.code || (verification.ok ? 'verified' : 'verification_failed'),
      reason: verification.reason || null,
      healthcheckUrl: verification.healthcheckUrl || null,
      details: verification.details || null
    };
    app.status = verification.ok ? 'active' : 'verification_failed';
    app.updatedAt = nowIso();
  }

  async function verifyAppHealth(app, request, env) {
    const checkedAt = nowIso();
    const healthcheckUrl = String(app?.healthcheckUrl || app?.metadata?.manifest?.healthcheck_url || app?.metadata?.manifest?.healthcheckUrl || '').trim();
    if (!healthcheckUrl) {
      return {
        ok: false,
        status: 'verification_skipped',
        checkedAt,
        code: 'missing_healthcheck',
        category: 'app_healthcheck',
        reason: 'No app healthcheck URL declared.',
        healthcheckUrl: null
      };
    }
    const validation = validateAppManifest({
      name: app.name || 'app',
      description: app.description || 'app',
      entryUrl: app.entryUrl || app.baseUrl || healthcheckUrl,
      healthcheckUrl
    }, appManifestOptionsForRequest(request, env));
    if (!validation.ok) {
      return {
        ok: false,
        status: 'verification_failed',
        checkedAt,
        code: 'invalid_healthcheck_url',
        category: 'app_healthcheck',
        reason: validation.errors.join('; '),
        healthcheckUrl
      };
    }
    try {
      const response = await fetch(healthcheckUrl, {
        headers: { accept: 'application/json, text/plain;q=0.8' }
      });
      const text = await response.text().catch(() => '');
      return {
        ok: response.ok,
        status: response.ok ? 'verified' : 'verification_failed',
        checkedAt,
        code: response.ok ? 'verified' : `http_${response.status}`,
        category: 'app_healthcheck',
        reason: response.ok ? null : `Healthcheck returned HTTP ${response.status}`,
        healthcheckUrl,
        details: {
          httpStatus: response.status,
          contentType: response.headers.get('content-type') || '',
          sample: text.slice(0, 300)
        }
      };
    } catch (error) {
      return {
        ok: false,
        status: 'verification_failed',
        checkedAt,
        code: 'fetch_failed',
        category: 'app_healthcheck',
        reason: error.message,
        healthcheckUrl
      };
    }
  }

  async function ownerInfoFromRequest(request, env, current = null) {
    const url = new URL(request.url);
    const resolvedCurrent = current || await currentUserContext(request, env);
    if (!resolvedCurrent.login) {
      return {
        owner: 'samurai',
        metadata: {
          brokerCallbackUrl: `${url.origin}/api/agent-callbacks/jobs`
        }
      };
    }
    const githubIdentity = resolvedCurrent.githubIdentity || null;
    return {
      owner: resolvedCurrent.login,
      metadata: {
        githubLogin: githubIdentity?.login || resolvedCurrent.login,
        githubName: githubIdentity?.name || resolvedCurrent.user?.name || resolvedCurrent.login,
        githubAvatarUrl: githubIdentity?.avatarUrl || resolvedCurrent.user?.avatarUrl || '',
        githubProfileUrl: githubIdentity?.profileUrl || resolvedCurrent.user?.profileUrl || '',
        brokerCallbackUrl: `${url.origin}/api/agent-callbacks/jobs`
      }
    };
  }

  async function recordOrderApiKeyUsage(storage, current, request) {
    // Do not rewrite account JSON on API-key authenticated traffic. A usage-only
    // account write can invalidate the same key if a stale/sanitized account copy
    // wins a later D1 merge; billing/job mutations still persist normally.
    return;
  }

  function requestHostLooksLocal(request) {
    try {
      const host = new URL(request.url).hostname;
      return ['localhost', '127.0.0.1', '::1'].includes(String(host || '').toLowerCase());
    } catch {
      return false;
    }
  }

  function agentSafetyOptionsForRequest(request, env) {
    return {
      allowLocalEndpoints: boolFlag(env?.ALLOW_LOCAL_MANIFEST_URLS, requestHostLooksLocal(request))
    };
  }

  function agentSafetyErrorResponse(safety) {
    return json({
      error: safety?.summary || 'Agent registration blocked by safety review',
      code: 'agent_safety_blocked',
      safety
    }, 400);
  }

  async function runAgentReviewForRequest(agent, request, env, options = {}) {
    return runAgentAutoReview(agent, {
      env,
      fetchImpl: fetch,
      safetyOptions: agentSafetyOptionsForRequest(request, env),
      source: options.source || 'agent-registration',
      safety: options.safety || null
    });
  }

  return {
    createAgentFromInput,
    createAgentFromManifest,
    agentRoutingConfirmationResponse,
    applyVerificationToAgentRecord,
    maybeAutoVerifyImportedAgent,
    appManifestOptionsForRequest,
    loadAppManifestFromUrl,
    appOwnerMatches,
    authorizeAppOwnerAction,
    applyVerificationToAppRecord,
    verifyAppHealth,
    ownerInfoFromRequest,
    recordOrderApiKeyUsage,
    requestHostLooksLocal,
    agentSafetyOptionsForRequest,
    agentSafetyErrorResponse,
    runAgentReviewForRequest
  };
}
