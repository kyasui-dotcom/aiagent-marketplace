export function createAgentManagementRouteHandlers(deps = {}) {
  const {
    MAX_PROVIDER_MARKUP_RATE,
    WELCOME_CREDITS_GRANT_AMOUNT,
    agentReviewRouteBlockReason,
    agentSafetyOptionsForRequest,
    applyAgentReviewToAgentRecord,
    assessAgentRegistrationSafety,
    authorizeAgentOwnerAction,
    baseUrl,
    canReviewAgents,
    currentAgentRequesterContext,
    currentUserContext,
    isAgentReviewApproved,
    json,
    manualAgentReviewFromBody,
    maybeGrantWelcomeCreditsForVerifiedAgentInState,
    nonNegativeUsdFromInput,
    normalizeManifest,
    nowIso,
    overageModeFromInput,
    parseBody,
    pricingModelFromInput,
    providerMarkupRateFromInput,
    publicAgent,
    recordOrderApiKeyUsage,
    runAgentOnboardingCheck,
    runAgentReviewForRequest,
    touchEvent,
    verifyAgentByHealthcheck
  } = deps;

  async function handleDeleteAgent(storage, request, env, agentId) {
    const current = await currentAgentRequesterContext(storage, request, env);
    const state = await storage.getState();
    const authorization = authorizeAgentOwnerAction(state, request, env, agentId, current);
    if (authorization.error) return json({ error: authorization.error }, authorization.statusCode || 400);
    const result = await storage.mutate(async (draft) => {
      const agent = draft.agents.find((item) => item.id === agentId);
      if (!agent) return { error: 'Agent not found', statusCode: 404 };
      const relatedRuns = draft.jobs.filter((job) => job.assignedAgentId === agentId || job.parentAgentId === agentId).length;
      const deletedAt = nowIso();
      const visibleAgent = publicAgent(agent);
      agent.online = false;
      agent.metadata = {
        ...(agent.metadata && typeof agent.metadata === 'object' ? agent.metadata : {}),
        hidden_from_catalog: true,
        not_routable: true,
        deleted_at: deletedAt,
        deletedAt,
        deleted_reason: 'owner_removed_from_catalog',
        deletedReason: 'owner_removed_from_catalog'
      };
      agent.verificationStatus = 'deprecated';
      agent.verificationCheckedAt = deletedAt;
      agent.verificationError = agent.verificationError || 'Agent retained for audit after owner removed it from the catalog.';
      agent.updatedAt = deletedAt;
      return { ok: true, agent: visibleAgent || { id: agent.id, name: agent.name }, related_runs: relatedRuns, soft_deleted: true };
    });
    if (result.error) return json({ error: result.error }, result.statusCode || 400);
    await touchEvent(storage, 'REMOVED', `${result.agent.name} removed from catalog (${result.related_runs} related runs kept; row retained)`);
    if (current.apiKey?.id) await recordOrderApiKeyUsage(storage, current, request);
    return json(result);
  }

  async function handleUpdateAgentPricing(storage, request, env, agentId) {
    const current = await currentAgentRequesterContext(storage, request, env);
    const state = await storage.getState();
    const authorization = authorizeAgentOwnerAction(state, request, env, agentId, current);
    if (authorization.error) return json({ error: authorization.error }, authorization.statusCode || 400);
    let body;
    try {
      body = await parseBody(request);
    } catch (error) {
      return json({ error: error.message }, 400);
    }
    const providerMarkupRate = providerMarkupRateFromInput(body);
    const pricingModel = pricingModelFromInput(body);
    const fixedRunPriceUsd = nonNegativeUsdFromInput(body.fixed_run_price_usd, body.fixedRunPriceUsd, body.run_price_usd, body.runPriceUsd);
    const subscriptionMonthlyPriceUsd = nonNegativeUsdFromInput(body.subscription_monthly_price_usd, body.subscriptionMonthlyPriceUsd, body.monthly_price_usd, body.monthlyPriceUsd);
    const overageMode = overageModeFromInput(body);
    const overageFixedRunPriceUsd = nonNegativeUsdFromInput(body.overage_fixed_run_price_usd, body.overageFixedRunPriceUsd);
    if (!Number.isFinite(providerMarkupRate) || providerMarkupRate < 0 || providerMarkupRate > MAX_PROVIDER_MARKUP_RATE) {
      return json({ error: 'provider_markup_rate must be a number between 0 and 1' }, 400);
    }
    if (pricingModel === 'fixed_per_run' && fixedRunPriceUsd <= 0) {
      return json({ error: 'fixed_run_price_usd is required when pricing_model=fixed_per_run' }, 400);
    }
    if ((pricingModel === 'subscription_required' || pricingModel === 'hybrid') && subscriptionMonthlyPriceUsd <= 0) {
      return json({ error: 'subscription_monthly_price_usd is required when pricing_model=subscription_required or hybrid' }, 400);
    }
    if (pricingModel === 'hybrid' && overageMode === 'fixed_per_run' && overageFixedRunPriceUsd <= 0) {
      return json({ error: 'overage_fixed_run_price_usd is required when pricing_model=hybrid and overage_mode=fixed_per_run' }, 400);
    }
    const result = await storage.mutate(async (draft) => {
      const agent = draft.agents.find((item) => item.id === agentId);
      if (!agent) return { error: 'Agent not found', statusCode: 404 };
      const manifest = agent.metadata?.manifest && typeof agent.metadata.manifest === 'object' ? agent.metadata.manifest : {};
      const pricing = manifest.pricing && typeof manifest.pricing === 'object' ? manifest.pricing : {};
      agent.providerMarkupRate = providerMarkupRate;
      agent.pricingModel = pricingModel;
      agent.fixedRunPriceUsd = fixedRunPriceUsd;
      agent.subscriptionMonthlyPriceUsd = subscriptionMonthlyPriceUsd;
      agent.overageMode = overageMode;
      agent.overageFixedRunPriceUsd = overageFixedRunPriceUsd;
      agent.tokenMarkupRate = providerMarkupRate;
      agent.creatorFeeRate = providerMarkupRate;
      agent.premiumRate = providerMarkupRate;
      agent.platformMarginRate = 0.1;
      agent.marketplaceFeeRate = 0.1;
      agent.basicRate = 0.1;
      agent.metadata = {
        ...(agent.metadata || {}),
        manifest: {
          ...manifest,
          pricing: {
            ...pricing,
            pricing_model: pricingModel,
            fixed_run_price_usd: fixedRunPriceUsd,
            subscription_monthly_price_usd: subscriptionMonthlyPriceUsd,
            overage_mode: overageMode,
            overage_fixed_run_price_usd: overageFixedRunPriceUsd,
            provider_markup_rate: providerMarkupRate,
            token_markup_rate: providerMarkupRate,
            platform_margin_rate: 0.1,
            creator_fee_rate: providerMarkupRate,
            marketplace_fee_rate: 0.1
          }
        },
        pricingUpdatedAt: nowIso()
      };
      agent.updatedAt = nowIso();
      return { ok: true, agent: publicAgent(agent) };
    });
    if (result.error) return json({ error: result.error }, result.statusCode || 400);
    await touchEvent(storage, 'UPDATED', `${result.agent.name} pricing updated model=${pricingModel} provider_markup_rate=${providerMarkupRate}`);
    if (current.apiKey?.id) await recordOrderApiKeyUsage(storage, current, request);
    return json(result);
  }

  async function handleReviewAgent(storage, request, env, agentId) {
    const current = await currentUserContext(request, env);
    if (!canReviewAgents(current, env)) return json({ error: 'Agent reviews are restricted to operators' }, 403);
    let body;
    try {
      body = await parseBody(request);
    } catch (error) {
      return json({ error: error.message }, 400);
    }
    let review;
    try {
      review = manualAgentReviewFromBody(body, current.login);
    } catch (error) {
      return json({ error: error.message }, 400);
    }
    const result = await storage.mutate(async (state) => {
      const agent = state.agents.find((item) => item.id === agentId);
      if (!agent) return { error: 'Agent not found', statusCode: 404 };
      applyAgentReviewToAgentRecord(agent, review);
      return { ok: true, agent: publicAgent(agent), review };
    });
    if (result.error) return json({ error: result.error }, result.statusCode || 400);
    await touchEvent(storage, 'REVIEWED', `${result.agent.name} agent review marked ${review.decision} by ${current.login}`);
    return json(result);
  }

  async function handleVerifyAgent(storage, request, env, agentId) {
    const current = await currentAgentRequesterContext(storage, request, env);
    const state = await storage.getState();
    const authorization = authorizeAgentOwnerAction(state, request, env, agentId, current);
    if (authorization.error) return json({ error: authorization.error }, authorization.statusCode || 400);
    const safetyOptions = agentSafetyOptionsForRequest(request, env);
    const result = await storage.mutate(async (state) => {
      const agent = state.agents.find((item) => item.id === agentId);
      if (!agent) return { error: 'Agent not found', statusCode: 404 };
      const manifestRecord = agent?.metadata?.manifest && typeof agent.metadata.manifest === 'object' ? agent.metadata.manifest : null;
      let safety = null;
      if (manifestRecord) {
        const safetyManifest = normalizeManifest({
          ...manifestRecord,
          name: manifestRecord.name || agent.name,
          description: manifestRecord.description || agent.description,
          task_types: manifestRecord.task_types || manifestRecord.taskTypes || agent.taskTypes
        });
        safety = assessAgentRegistrationSafety(safetyManifest, safetyOptions);
        if (!safety.ok) {
          const review = await runAgentReviewForRequest(agent, request, env, { source: 'manual-verify', safety });
          applyAgentReviewToAgentRecord(agent, review);
          const verification = {
            ok: false,
            status: 'verification_failed',
            checkedAt: nowIso(),
            code: 'agent_safety_blocked',
            category: 'safety_review',
            reason: safety.summary,
            details: { safety }
          };
          agent.verificationStatus = verification.status;
          agent.verificationCheckedAt = verification.checkedAt;
          agent.verificationError = verification.reason;
          agent.verificationDetails = {
            category: verification.category,
            code: verification.code,
            reason: verification.reason,
            details: verification.details
          };
          agent.updatedAt = nowIso();
          return { ok: true, agent: publicAgent(agent), verification, welcome_credits: null, safety, review };
        }
      }
      let review = agent.agentReview && typeof agent.agentReview === 'object' ? agent.agentReview : null;
      const manualApproval = agent.agentReviewStatus === 'approved' && review?.source === 'manual-review';
      if (!manualApproval) {
        review = await runAgentReviewForRequest(agent, request, env, { source: 'manual-verify', safety });
        applyAgentReviewToAgentRecord(agent, review);
      }
      if (!isAgentReviewApproved(agent)) {
        const verification = {
          ok: false,
          status: 'verification_failed',
          checkedAt: nowIso(),
          code: 'agent_review_not_approved',
          category: 'agent_review',
          reason: agentReviewRouteBlockReason(agent),
          details: { review }
        };
        agent.verificationStatus = verification.status;
        agent.verificationCheckedAt = verification.checkedAt;
        agent.verificationError = verification.reason;
        agent.verificationDetails = {
          category: verification.category,
          code: verification.code,
          reason: verification.reason,
          details: verification.details
        };
        agent.updatedAt = nowIso();
        return { ok: true, agent: publicAgent(agent), verification, welcome_credits: null, safety, review };
      }
      const verification = await verifyAgentByHealthcheck(agent);
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
      const welcomeCredits = verification.ok
        ? maybeGrantWelcomeCreditsForVerifiedAgentInState(state, authorization.agent.owner || current.login, agent.id)
        : null;
      return { ok: true, agent: publicAgent(agent), verification, welcome_credits: welcomeCredits, safety, review };
    });
    if (result.error) return json({ error: result.error }, result.statusCode || 400);
    if (result.verification.ok) {
      await touchEvent(storage, 'VERIFIED', `${result.agent.name} verification succeeded`);
      if (['granted', 'topped_up'].includes(String(result.welcome_credits?.status || ''))) {
        await touchEvent(storage, 'CREDIT', `${authorization.agent.owner || current.login} earned ${WELCOME_CREDITS_GRANT_AMOUNT} welcome credits for ${result.agent.name}`);
      } else if (result.welcome_credits?.status === 'rejected') {
        await touchEvent(storage, 'CREDIT', `${result.agent.name} welcome credits rejected: ${result.welcome_credits.reason}`);
      }
    } else {
      await touchEvent(storage, 'FAILED', `${result.agent.name} verification failed: ${result.verification.reason}`);
    }
    if (current.apiKey?.id) await recordOrderApiKeyUsage(storage, current, request);
    return json(result);
  }

  async function handleAgentOnboardingCheck(storage, request, env, agentId) {
    const current = await currentAgentRequesterContext(storage, request, env);
    const state = await storage.getState();
    const authorization = authorizeAgentOwnerAction(state, request, env, agentId, current);
    if (authorization.error) return json({ error: authorization.error }, authorization.statusCode || 400);
    const agent = publicAgent(authorization.agent);
    const onboarding = await runAgentOnboardingCheck(agent, {
      runtimeOrigin: baseUrl(request, env)
    });
    if (current.apiKey?.id) await recordOrderApiKeyUsage(storage, current, request);
    return json({ ok: true, agent, onboarding });
  }

  return {
    handleDeleteAgent,
    handleUpdateAgentPricing,
    handleReviewAgent,
    handleVerifyAgent,
    handleAgentOnboardingCheck
  };
}
