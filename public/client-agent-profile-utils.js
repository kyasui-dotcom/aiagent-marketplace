export function createClientAgentProfileUtils(deps = {}) {
  const {
    state,
    els,
    LIST_CREATOR_BATCH_SIZE,
    displayCurrencyToLedgerAmount,
    formatDisplayCurrency,
    inferListCreatorRequestedCount,
    isGithubAuthorized,
    isGithubLinked,
    isGoogleAuthorized,
    isGoogleLinked,
    listCreatorUsageEstimateForCount,
    currentEffectiveOrderPrompt,
    currentRoutingTask,
    currentAgentOnboarding,
    onboardingAction,
    renderRepoPicker,
    showSelectedRepo,
    orderInputFromComposer,
    orderInputCounts,
    ORDER_INPUT_MAX_URLS,
    normalizeOrderInputFile,
    formatDurationMs,
    formatTime,
    sinceLabel,
    authorityRequestFromReport,
    authorityRequestRequiresClientApproval,
    describeAuthorityNeed,
    resolvedOrderStrategyOfDraft,
    routePlanOfDraft,
    queuedDraftAgent,
    readyAgentsForTask,
    isRepoBackedCodeOrderIntent
  } = deps;

  function providerMarkupRateOf(agent) {
    return Number(agent?.providerMarkupRate ?? agent?.tokenMarkupRate ?? agent?.creatorFeeRate ?? agent?.premiumRate ?? 0.1);
  }

  function platformMarginRateOf(_agent) {
    return 0.1;
  }

  function normalizeClientPricingModel(value = '') {
    const raw = String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
    if (!raw) return 'usage_based';
    if (['usage', 'usage_pricing', 'metered'].includes(raw)) return 'usage_based';
    if (['fixed', 'fixed_run', 'per_run', 'fixed_price'].includes(raw)) return 'fixed_per_run';
    if (['subscription', 'monthly', 'monthly_subscription'].includes(raw)) return 'subscription_required';
    if (['subscription_plus_usage', 'subscription_plus_overage', 'hybrid_subscription'].includes(raw)) return 'hybrid';
    return ['usage_based', 'fixed_per_run', 'subscription_required', 'hybrid'].includes(raw) ? raw : 'usage_based';
  }

  function normalizeClientOverageMode(value = '', fallback = 'usage_based') {
    const raw = String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
    if (!raw) return fallback;
    if (['included', 'none', 'plan_included'].includes(raw)) return 'included';
    if (['usage', 'usage_pricing', 'metered'].includes(raw)) return 'usage_based';
    if (['fixed', 'fixed_run', 'per_run', 'fixed_price'].includes(raw)) return 'fixed_per_run';
    return ['included', 'usage_based', 'fixed_per_run'].includes(raw) ? raw : fallback;
  }

  function agentPricingManifest(agent) {
    const manifest = agentManifest(agent);
    return manifest?.pricing && typeof manifest.pricing === 'object' ? manifest.pricing : {};
  }

  function agentPricingConfig(agent) {
    const pricing = agentPricingManifest(agent);
    const pricingModel = normalizeClientPricingModel(agent?.pricingModel ?? agent?.pricing_model ?? pricing.pricing_model ?? pricing.pricingModel);
    const fixedRunPriceUsd = Number(agent?.fixedRunPriceUsd ?? agent?.fixed_run_price_usd ?? pricing.fixed_run_price_usd ?? pricing.fixedRunPriceUsd ?? pricing.run_price_usd ?? pricing.runPriceUsd ?? 0) || 0;
    const subscriptionMonthlyPriceUsd = Number(agent?.subscriptionMonthlyPriceUsd ?? agent?.subscription_monthly_price_usd ?? pricing.subscription_monthly_price_usd ?? pricing.subscriptionMonthlyPriceUsd ?? pricing.monthly_price_usd ?? pricing.monthlyPriceUsd ?? 0) || 0;
    const overageMode = normalizeClientOverageMode(agent?.overageMode ?? agent?.overage_mode ?? pricing.overage_mode ?? pricing.overageMode, pricingModel === 'hybrid' ? 'usage_based' : 'included');
    const overageFixedRunPriceUsd = Number(agent?.overageFixedRunPriceUsd ?? agent?.overage_fixed_run_price_usd ?? pricing.overage_fixed_run_price_usd ?? pricing.overageFixedRunPriceUsd ?? 0) || 0;
    return {
      pricingModel,
      fixedRunPriceUsd,
      subscriptionMonthlyPriceUsd,
      overageMode,
      overageFixedRunPriceUsd
    };
  }

  function pricingModelLabel(agent) {
    const pricing = agentPricingConfig(agent);
    if (pricing.pricingModel === 'fixed_per_run') return `${formatDisplayCurrency(pricing.fixedRunPriceUsd)}/run`;
    if (pricing.pricingModel === 'subscription_required') return `${formatDisplayCurrency(pricing.subscriptionMonthlyPriceUsd)}/mo provider plan`;
    if (pricing.pricingModel === 'hybrid') {
      const overage = pricing.overageMode === 'fixed_per_run'
        ? `${formatDisplayCurrency(pricing.overageFixedRunPriceUsd)}/run`
        : (pricing.overageMode === 'included' ? 'included usage' : 'usage overage');
      return `${formatDisplayCurrency(pricing.subscriptionMonthlyPriceUsd)}/mo provider plan + ${overage}`;
    }
    return `${(providerMarkupRateOf(agent) * 100).toFixed(1)}% provider markup`;
  }

  function syncAgentPricingEditorVisibility() {
    const model = normalizeClientPricingModel(els.agentPricingModel?.value || 'usage_based');
    if (els.agentPricingMarkup) els.agentPricingMarkup.disabled = model === 'fixed_per_run' || model === 'subscription_required';
    if (els.agentPricingFixedRunUsd) els.agentPricingFixedRunUsd.disabled = model !== 'fixed_per_run';
    if (els.agentPricingMonthlyUsd) els.agentPricingMonthlyUsd.disabled = !(model === 'subscription_required' || model === 'hybrid');
    if (els.agentPricingOverageMode) els.agentPricingOverageMode.disabled = model !== 'hybrid';
    if (els.agentPricingOverageFixedUsd) {
      const overageMode = normalizeClientOverageMode(els.agentPricingOverageMode?.value || '', model === 'hybrid' ? 'usage_based' : 'included');
      els.agentPricingOverageFixedUsd.disabled = !(model === 'hybrid' && overageMode === 'fixed_per_run');
    }
  }

  function agentPricingGuideText(agent = null) {
    const model = normalizeClientPricingModel(els.agentPricingModel?.value || agentPricingConfig(agent || {}).pricingModel || 'usage_based');
    if (model === 'fixed_per_run') {
      return 'Fixed per run: the end user pays one fixed USD amount for each run. CAIt keeps 10% of that run price.';
    }
    if (model === 'subscription_required') {
      return 'Provider monthly subscription: the SaaS provider pays the monthly fee lane. CAIt keeps 10% of that monthly fee. End-user order estimate stays at zero unless a separate overage exists.';
    }
    if (model === 'hybrid') {
      return 'Hybrid: the SaaS provider pays the monthly fee lane, and the end user pays only the declared overage lane. CAIt keeps 10% of provider monthly fees separately from end-user order billing.';
    }
    return 'Usage-based: the end user pays measured usage plus provider markup. Provider markup can be 0-100%. CAIt platform margin stays fixed at 10% of the end-user order total.';
  }

  function estimateWindowOfAgent(agent, taskType = currentRoutingTask(), options = {}) {
    if (!agent) return null;
    const map = {
      research: { minSec: 35, maxSec: 240, minApi: 2, maxApi: 10 },
      summary: { minSec: 25, maxSec: 120, minApi: 1, maxApi: 4 },
      writing: { minSec: 45, maxSec: 220, minApi: 2, maxApi: 10 },
      seo: { minSec: 40, maxSec: 180, minApi: 3, maxApi: 12 },
      pricing: { minSec: 45, maxSec: 240, minApi: 3, maxApi: 12 },
      prompt_brushup: { minSec: 20, maxSec: 90, minApi: 1, maxApi: 4 },
      listing: { minSec: 30, maxSec: 160, minApi: 2, maxApi: 8 },
      code: { minSec: 90, maxSec: 720, minApi: 6, maxApi: 30 },
      debug: { minSec: 120, maxSec: 620, minApi: 6, maxApi: 28 },
      automation: { minSec: 110, maxSec: 560, minApi: 5, maxApi: 24 },
      ops: { minSec: 55, maxSec: 300, minApi: 3, maxApi: 14 }
    };
    const normalizedTaskType = String(taskType || '').toLowerCase();
    const picked = normalizedTaskType === 'list_creator'
      ? { minSec: 70, maxSec: 260, minApi: 2, maxApi: 10 }
      : (map[normalizedTaskType] || map.research);
    const providerMarkupRate = providerMarkupRateOf(agent);
    const platformMarginRate = platformMarginRateOf(agent);
    const pricing = agentPricingConfig(agent);
    const calcTotal = (apiCost) => {
      const providerMarkup = apiCost * providerMarkupRate;
      const subtotal = apiCost + providerMarkup;
      return subtotal / (1 - platformMarginRate);
    };
    const fixedRunTotal = (usd) => displayCurrencyToLedgerAmount(Number(usd || 0));
    let estimateMinTotal = calcTotal(picked.minApi);
    let estimateMaxTotal = calcTotal(picked.maxApi);
    let typicalTotal = calcTotal(Math.round((picked.minApi + picked.maxApi) / 2));
    let pricingNote = 'End-user billing = usage + provider markup + marketplace margin.';
    if (pricing.pricingModel === 'fixed_per_run') {
      estimateMinTotal = fixedRunTotal(pricing.fixedRunPriceUsd);
      estimateMaxTotal = estimateMinTotal;
      typicalTotal = estimateMinTotal;
      pricingNote = 'End-user billing = fixed run price. Marketplace keeps 10% from that run price.';
    } else if (pricing.pricingModel === 'subscription_required') {
      estimateMinTotal = 0;
      estimateMaxTotal = 0;
      typicalTotal = 0;
      pricingNote = `Provider pricing = ${formatDisplayCurrency(pricing.subscriptionMonthlyPriceUsd)}/month. CAIt bills the provider 10% of that monthly fee, not the end user.`;
    } else if (pricing.pricingModel === 'hybrid') {
      if (pricing.overageMode === 'fixed_per_run') {
        estimateMinTotal = fixedRunTotal(pricing.overageFixedRunPriceUsd);
        estimateMaxTotal = estimateMinTotal;
        typicalTotal = estimateMinTotal;
        pricingNote = `Provider pricing = ${formatDisplayCurrency(pricing.subscriptionMonthlyPriceUsd)}/month with fixed end-user overage ${formatDisplayCurrency(pricing.overageFixedRunPriceUsd)}/run.`;
      } else if (pricing.overageMode === 'included') {
        estimateMinTotal = 0;
        estimateMaxTotal = 0;
        typicalTotal = 0;
        pricingNote = `Provider pricing = ${formatDisplayCurrency(pricing.subscriptionMonthlyPriceUsd)}/month with end-user usage included. CAIt bills the provider 10% of the monthly fee.`;
      } else {
        pricingNote = `Provider pricing = ${formatDisplayCurrency(pricing.subscriptionMonthlyPriceUsd)}/month, with end-user usage overage on top. CAIt bills the provider 10% of the monthly fee.`;
      }
    }
    let listCreatorPlan = null;
    if (normalizedTaskType === 'list_creator' && pricing.pricingModel === 'usage_based') {
      const promptForEstimate = options.prompt !== undefined
        ? options.prompt
        : currentEffectiveOrderPrompt();
      listCreatorPlan = listCreatorUsageEstimateForCount(inferListCreatorRequestedCount([
        promptForEstimate,
        options.input
      ]));
      estimateMinTotal = calcTotal(listCreatorPlan.usage.total_cost_basis);
      estimateMaxTotal = estimateMinTotal;
      typicalTotal = estimateMinTotal;
      picked.minSec = Math.max(picked.minSec, 70 * listCreatorPlan.batchCount);
      picked.maxSec = Math.max(picked.maxSec, 260 * listCreatorPlan.batchCount);
      pricingNote = `List Creator estimate = ${listCreatorPlan.requestedCount} companies, ${listCreatorPlan.batchCount} batch${listCreatorPlan.batchCount === 1 ? '' : 'es'} of ${LIST_CREATOR_BATCH_SIZE}. Public email/contact capture is included only when visibly public and source-traced.`;
    }
    return {
      durationMinSec: picked.minSec,
      durationMaxSec: picked.maxSec,
      estimateMinTotal,
      estimateMaxTotal,
      typicalTotal,
      confidence: agent.verificationStatus === 'verified' ? 'high' : 'medium',
      pricingModel: pricing.pricingModel,
      providerMonthlyUsd: pricing.subscriptionMonthlyPriceUsd,
      pricingNote,
      listCreatorPlan
    };
  }

  function agentVerification(agent) {
    return agent?.verificationDetails && typeof agent.verificationDetails === 'object'
      ? agent.verificationDetails
      : {};
  }

  function agentManifest(agent) {
    return agent?.metadata?.manifest && typeof agent.metadata.manifest === 'object'
      ? agent.metadata.manifest
      : {};
  }

  function agentTrustList(value, fallback = []) {
    const source = Array.isArray(value) ? value : (typeof value === 'string' ? value.split(/[,\n]/) : fallback);
    return [...new Set(source
      .map((item) => String(item || '').trim())
      .filter(Boolean))];
  }

  function agentTrustProfile(agent = {}) {
    const manifest = agentManifest(agent);
    const metadata = agent?.metadata && typeof agent.metadata === 'object' ? agent.metadata : {};
    const manifestMetadata = manifest.metadata && typeof manifest.metadata === 'object' ? manifest.metadata : {};
    const verification = agentVerification(agent);
    const verificationDetails = verification.details && typeof verification.details === 'object' ? verification.details : {};
    const source = agent?.trust && typeof agent.trust === 'object'
      ? agent.trust
      : (metadata.trust && typeof metadata.trust === 'object'
          ? metadata.trust
          : (manifest.trust && typeof manifest.trust === 'object'
              ? manifest.trust
              : (manifestMetadata.trust && typeof manifestMetadata.trust === 'object'
                  ? manifestMetadata.trust
                  : (verificationDetails.trust && typeof verificationDetails.trust === 'object' ? verificationDetails.trust : {}))));
    const verified = agent.verificationStatus === 'verified' || isManagedSampleAgent(agent);
    const score = Number(source.score);
    const level = String(source.level || (verified ? 'verified' : 'unverified')).trim().toLowerCase().replace(/[\s-]+/g, '_');
    const label = String(source.label || (verified ? 'Verified agent' : 'Unverified agent')).trim();
    const summary = String(source.summary || (verified
      ? 'Verified endpoint with delivery review; inspect evidence and acceptance checks before acting.'
      : 'Trust profile is not declared yet. Verify endpoint, owner, manifest, evidence policy, and delivery history before routing work.')).trim();
    const qualityChecks = agentTrustList(source.quality_checks || source.qualityChecks, verified
      ? ['Endpoint verification', 'Delivery review', 'Evidence/assumption separation']
      : ['Endpoint verification required', 'Manifest review required', 'Delivery history required']);
    const evidenceRequirements = agentTrustList(source.evidence_requirements || source.evidenceRequirements, ['Prompt, files, URLs, sources, connector proof, and approval where applicable']);
    const limitations = agentTrustList(source.limitations, ['Trust score is workflow assurance, not a guarantee of business correctness']);
    const tone = ['approval_gated', 'source_bound', 'orchestration_reviewed', 'verified', 'sample_verified'].includes(level)
      ? (level === 'approval_gated' ? 'warn' : 'ok')
      : 'info';
    return {
      version: String(source.version || 'agent-trust/client-derived'),
      level,
      label,
      score: Number.isFinite(score) ? score : (verified ? 82 : 45),
      summary,
      executionLayer: String(source.execution_layer || source.executionLayer || '').trim(),
      sourcePolicy: String(source.source_policy || source.sourcePolicy || '').trim(),
      actionPolicy: String(source.action_policy || source.actionPolicy || '').trim(),
      qualityChecks,
      evidenceRequirements,
      limitations,
      tone
    };
  }

  function agentRole(agent) {
    const manifest = agentManifest(agent);
    const metadata = agent?.metadata && typeof agent.metadata === 'object' ? agent.metadata : {};
    const raw = String(manifest.agent_role || manifest.agentRole || metadata.agentRole || metadata.agent_role || metadata.role || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
    if (['leader', 'leader_agent', 'team_leader', 'manager', 'orchestrator', 'director', 'executive'].includes(raw)) return 'leader';
    if ((agent.taskTypes || []).some((task) => /(^|_)(leader|orchestration|planning)(_|$)/i.test(String(task || '')))) return 'leader';
    return 'worker';
  }

  function normalizeClientCompositionMode(value = '') {
    const raw = String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
    if (!raw || ['provider', 'provider_orchestrated', 'provider_managed', 'external', 'external_orchestrated', 'self_orchestrated'].includes(raw)) {
      return 'provider_orchestrated';
    }
    if (['platform', 'platform_orchestrated', 'cait_orchestrated', 'broker_orchestrated'].includes(raw)) return 'platform_orchestrated';
    return raw;
  }

  function agentComposition(agent) {
    const manifest = agentManifest(agent);
    const rootMetadata = agent?.metadata && typeof agent.metadata === 'object' ? agent.metadata : {};
    const manifestMetadata = manifest.metadata && typeof manifest.metadata === 'object' ? manifest.metadata : {};
    const source = manifest.composition && typeof manifest.composition === 'object'
      ? manifest.composition
      : (rootMetadata.composition && typeof rootMetadata.composition === 'object'
          ? rootMetadata.composition
          : (manifestMetadata.composition && typeof manifestMetadata.composition === 'object' ? manifestMetadata.composition : {}));
    const rawComponents = Array.isArray(source.components)
      ? source.components
      : (Array.isArray(source.agents)
          ? source.agents
          : (Array.isArray(manifest.components) ? manifest.components : []));
    const components = rawComponents.map((component, index) => {
      const value = typeof component === 'string' ? { name: component } : (component && typeof component === 'object' ? component : {});
      const agentId = String(value.agent_id || value.agentId || '').trim();
      const name = String(value.name || value.id || agentId || `component_${index + 1}`).trim();
      const role = String(value.role || value.purpose || '').trim();
      const tasks = Array.isArray(value.task_types) ? value.task_types : (Array.isArray(value.taskTypes) ? value.taskTypes : []);
      const taskText = tasks.map((task) => String(task || '').trim()).filter(Boolean).join('/');
      const description = String(value.description || value.summary || '').trim();
      if (!name && !agentId && !role && !taskText && !description) return null;
      return { name, agentId, role, taskText, description };
    }).filter(Boolean);
    const mode = normalizeClientCompositionMode(source.mode || source.orchestration_mode || source.orchestrationMode || manifest.composition_mode || manifest.compositionMode || '');
    return {
      mode,
      components,
      workflowType: String(source.workflow_type || source.workflowType || source.type || '').trim().toLowerCase().replace(/[\s-]+/g, '_'),
      summary: String(source.summary || source.description || rootMetadata.composition_summary || manifestMetadata.composition_summary || '').trim(),
      deliveryModel: String(source.delivery_model || source.deliveryModel || source.delivery || '').trim() || (components.length ? 'single_delivery' : '')
    };
  }

  function agentProductKind(agent) {
    const manifest = agentManifest(agent);
    const rootMetadata = agent?.metadata && typeof agent.metadata === 'object' ? agent.metadata : {};
    const composition = agentComposition(agent);
    const raw = String(manifest.kind || manifest.agent_kind || manifest.agentKind || rootMetadata.kind || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
    if (['group', 'agent_group', 'suite', 'agent_suite', 'agent_bundle', 'agent_pack', 'multi_work_product', 'multi_workstream_product'].includes(raw)) return 'agent_group';
    if (['composite', 'composite_agent', 'composite_agent_product', 'multi_agent', 'multi_agent_product', 'agent_system'].includes(raw)) return 'composite_agent';
    if (agentRole(agent) === 'leader') return 'agent';
    if (['group', 'suite'].includes(String(composition.workflowType || '').trim().toLowerCase())) return 'agent_group';
    if (composition.components.length >= 2) return 'composite_agent';
    return 'agent';
  }

  function isCompositeAgentProduct(agent) {
    return agentProductKind(agent) === 'composite_agent';
  }

  function isAgentSuiteProduct(agent) {
    return agentProductKind(agent) === 'agent_group';
  }

  function agentCompositionSummary(agent) {
    const composition = agentComposition(agent);
    if (isAgentSuiteProduct(agent)) {
      const count = composition.components.length;
      return `Agent group: ${count || 'multiple'} related agents · register each agent separately; CAIt can ask whether to run them as one flow or separate orders`;
    }
    if (!isCompositeAgentProduct(agent)) return '';
    const count = composition.components.length;
    const modeLabel = composition.mode === 'provider_orchestrated' ? 'provider orchestrated' : composition.mode.replace(/_/g, ' ');
    return `Composite product: ${modeLabel} · ${count || 'multiple'} internal agents · one CAIt order and one delivery`;
  }

  function normalizeClientRequirement(input = {}, index = 0) {
    const source = typeof input === 'string' ? { type: input } : (input && typeof input === 'object' ? input : {});
    const type = String(source.type || source.kind || source.service || source.name || `requirement_${index + 1}`)
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, '_');
    const label = String(source.label || source.title || source.name || type.replace(/_/g, ' ')).trim();
    const purpose = String(source.purpose || source.reason || source.description || '').trim();
    const fulfillment = normalizeClientRequirementFulfillment(source.fulfillment || source.fulfillment_mode || source.fulfillmentMode || source.via || 'cait_hub');
    const instructions = String(source.instructions || source.note || source.notes || '').trim();
    if (!type && !label && !purpose && !instructions) return null;
    return {
      type,
      label: label || type.replace(/_/g, ' '),
      required: source.required === undefined ? true : Boolean(source.required),
      purpose,
      fulfillment,
      instructions,
      launchLabel: String(source.launch_label || source.launchLabel || source.cta_label || source.ctaLabel || '').trim(),
      nativeUiUrl: String(source.native_ui_url || source.nativeUiUrl || source.launch_url || source.launchUrl || source.external_url || source.externalUrl || '').trim(),
      callbackPath: String(source.callback_path || source.callbackPath || source.return_path || source.returnPath || source.return_url_path || source.returnUrlPath || '').trim(),
      completionSignal: normalizeClientRequirementCompletionSignal(source.completion_signal || source.completionSignal || '')
    };
  }

  function normalizeClientRequirementFulfillment(value = 'cait_hub') {
    const raw = String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
    if (!raw) return 'cait_hub';
    if (['native', 'native_ui_required', 'native_saas_ui', 'provider_ui', 'provider_console', 'external_ui', 'external_console', 'external_redirect', 'user_ui'].includes(raw)) return 'native_ui';
    if (['guided', 'cait_guided', 'guided_handoff', 'assisted'].includes(raw)) return 'cait_guided';
    if (['callback_supported', 'return_to_cait', 'resume_after_callback'].includes(raw)) return 'callback';
    if (['hub', 'collect', 'collect_or_confirm'].includes(raw)) return 'cait_hub';
    return raw;
  }

  function normalizeClientRequirementCompletionSignal(value = '') {
    const raw = String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
    if (!raw) return '';
    if (['manual', 'manual_confirmation', 'confirm', 'manual_confirm'].includes(raw)) return 'manual_confirm';
    if (['callback_supported', 'oauth_callback', 'return_callback'].includes(raw)) return 'callback';
    if (['web_hook', 'webhooks'].includes(raw)) return 'webhook';
    return raw;
  }

  function requirementFulfillmentLabel(requirement = {}) {
    const fulfillment = String(requirement.fulfillment || '').trim().toLowerCase();
    if (fulfillment === 'native_ui') return 'native SaaS UI';
    if (fulfillment === 'cait_guided') return 'CAIt guided handoff';
    if (fulfillment === 'callback') return 'callback return';
    if (fulfillment === 'cait_hub') return 'CAIt hub';
    return fulfillment ? fulfillment.replace(/_/g, ' ') : '';
  }

  function requirementFlowSummary(requirement = {}) {
    const steps = [];
    if (requirement.fulfillment === 'native_ui') {
      steps.push(requirement.launchLabel || 'open provider UI');
      if (requirement.callbackPath) steps.push(`return to CAIt via ${requirement.callbackPath}`);
      if (requirement.completionSignal === 'manual_confirm') steps.push('confirm completion in CAIt');
      if (requirement.completionSignal === 'callback') steps.push('resume after callback');
      if (requirement.completionSignal === 'webhook') steps.push('resume after webhook');
      return steps.join(' -> ');
    }
    if (requirement.fulfillment === 'callback') {
      steps.push('finish in provider flow');
      if (requirement.callbackPath) steps.push(`return via ${requirement.callbackPath}`);
      return steps.join(' -> ');
    }
    if (requirement.fulfillment === 'cait_guided') {
      steps.push('CAIt guides the handoff');
      if (requirement.nativeUiUrl) steps.push('launch provider UI');
      return steps.join(' -> ');
    }
    return '';
  }

  function requirementHubSummary(requirements = []) {
    if (!requirements.length) return '';
    const nativeCount = requirements.filter((item) => item.fulfillment === 'native_ui').length;
    const callbackCount = requirements.filter((item) => item.fulfillment === 'callback').length;
    if (nativeCount) return `Requirements: ${nativeCount} step${nativeCount === 1 ? '' : 's'} continue in the provider's native UI; CAIt guides the handoff and resumes after return or confirmation`;
    if (callbackCount) return `Requirements: provider flow may return to CAIt after callback or confirmation`;
    return 'Requirements: CAIt should collect or confirm these before dispatch';
  }

  function agentRequirements(agent) {
    const manifest = agentManifest(agent);
    const rootMetadata = agent?.metadata && typeof agent.metadata === 'object' ? agent.metadata : {};
    const manifestMetadata = manifest.metadata && typeof manifest.metadata === 'object' ? manifest.metadata : {};
    const rawRequirements = Array.isArray(manifest.requirements)
      ? manifest.requirements
      : (Array.isArray(rootMetadata.requirements)
          ? rootMetadata.requirements
          : (Array.isArray(manifestMetadata.requirements) ? manifestMetadata.requirements : []));
    return rawRequirements
      .map((item, index) => normalizeClientRequirement(item, index))
      .filter(Boolean)
      .slice(0, 12);
  }

  function agentRequirementSummary(agent) {
    const requirements = agentRequirements(agent);
    if (!requirements.length) return '';
    const required = requirements.filter((item) => item.required !== false);
    const labels = (required.length ? required : requirements)
      .slice(0, 3)
      .map((item) => item.label || item.type)
      .filter(Boolean);
    return `Requirements: ${labels.join(' / ')}${requirements.length > labels.length ? ` +${requirements.length - labels.length}` : ''} · ${requirementHubSummary(requirements).replace(/^Requirements:\s*/, '')}`;
  }

  function normalizeClientList(value, fallback = []) {
    const rawValues = Array.isArray(value)
      ? value
      : (typeof value === 'string' ? value.split(/[,\n]/) : fallback);
    return [...new Set(rawValues
      .map((item) => String(item || '').trim().toLowerCase().replace(/[\s-]+/g, '_'))
      .filter(Boolean))];
  }

  function agentTags(agent) {
    const manifest = agentManifest(agent);
    const metadata = agent?.metadata && typeof agent.metadata === 'object' ? agent.metadata : {};
    const manifestMetadata = manifest.metadata && typeof manifest.metadata === 'object' ? manifest.metadata : {};
    const values = [];
    for (const source of [
      agent?.tags,
      agent?.agentTags,
      agent?.agent_tags,
      metadata.tags,
      metadata.teamTags,
      metadata.team_tags,
      metadata.agent_tags,
      manifest.tags,
      manifest.teamTags,
      manifest.team_tags,
      manifestMetadata.tags,
      manifestMetadata.teamTags,
      manifestMetadata.team_tags
    ]) {
      if (Array.isArray(source)) values.push(...source);
      else if (typeof source === 'string') values.push(...source.split(/[,\n]/));
    }
    return normalizeClientList(values, []).slice(0, 18);
  }

  function agentExecutionProfile(agent) {
    const manifest = agentManifest(agent);
    const metadata = agent?.metadata && typeof agent.metadata === 'object' ? agent.metadata : {};
    const requiredConnectorCapabilities = normalizeClientConnectorCapabilityList(
      manifest.required_connector_capabilities
      || manifest.requiredConnectorCapabilities
      || metadata.required_connector_capabilities
      || metadata.requiredConnectorCapabilities,
      []
    );
    return {
      executionPattern: String(manifest.execution_pattern || manifest.executionPattern || metadata.execution_pattern || metadata.executionPattern || 'async').trim().toLowerCase().replace(/[\s-]+/g, '_'),
      inputTypes: normalizeClientList(manifest.input_types || manifest.inputTypes || metadata.input_types || metadata.inputTypes, ['text']),
      outputTypes: normalizeClientList(manifest.output_types || manifest.outputTypes || metadata.output_types || metadata.outputTypes, ['report', 'file']),
      clarification: String(manifest.clarification || manifest.clarification_mode || manifest.clarificationMode || metadata.clarification || 'optional_clarification').trim().toLowerCase().replace(/[\s-]+/g, '_'),
      scheduleSupport: Boolean(manifest.schedule_support ?? manifest.scheduleSupport ?? metadata.schedule_support ?? metadata.scheduleSupport),
      requiredConnectors: normalizeClientList(manifest.required_connectors || manifest.requiredConnectors || manifest.connectors || metadata.required_connectors || metadata.requiredConnectors || metadata.connectors, []),
      requiredConnectorCapabilities,
      requiredGoogleSources: normalizeClientList(
        manifest.required_google_sources
        || manifest.requiredGoogleSources
        || metadata.required_google_sources
        || metadata.requiredGoogleSources,
        defaultGoogleSourceGroupsForCapabilitiesClient(requiredConnectorCapabilities)
      ),
      riskLevel: String(manifest.risk_level || manifest.riskLevel || metadata.risk_level || metadata.riskLevel || 'safe').trim().toLowerCase().replace(/[\s-]+/g, '_'),
      confirmationRequiredFor: normalizeClientList(manifest.confirmation_required_for || manifest.confirmationRequiredFor || metadata.confirmation_required_for || metadata.confirmationRequiredFor, []),
      capabilities: normalizeClientList(manifest.capabilities || metadata.capabilities, agent?.taskTypes || [])
    };
  }

  function normalizeClientConnector(value = '') {
    const text = String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
    if (!text) return '';
    if (['github', 'github_app', 'github_oauth', 'repo', 'repository', 'pull_request', 'pr'].includes(text)) return 'github';
    if (['google', 'google_oauth', 'google_drive', 'drive', 'gmail', 'docs', 'sheets', 'calendar', 'google_calendar', 'google_meet', 'meet'].includes(text)) return 'google';
    if (['zoom', 'zoom_oauth', 'zoom_meeting'].includes(text)) return 'zoom';
    if (['microsoft', 'microsoft_oauth', 'microsoft_teams', 'teams', 'teams_meeting', 'office365', 'office_365'].includes(text)) return 'microsoft';
    if (['x', 'x_oauth', 'twitter', 'twitter_oauth', 'tweet', 'tweets', 'x_post', 'social_x'].includes(text)) return 'x';
    if (['stripe', 'payment', 'payments', 'billing', 'checkout', 'card'].includes(text)) return 'stripe';
    return text;
  }

  const CLIENT_CONNECTOR_CAPABILITY_ALIASES = new Map([
    ['github.read_repo', 'github.read_repo'],
    ['read_repo', 'github.read_repo'],
    ['github.read_private_repo', 'github.read_private_repo'],
    ['read_private_repo', 'github.read_private_repo'],
    ['github.write_pr', 'github.write_pr'],
    ['write_pr', 'github.write_pr'],
    ['create_pull_request', 'github.write_pr'],
    ['github.create_pull_request', 'github.write_pr'],
    ['github.write_repo', 'github.write_repo'],
    ['write_repo', 'github.write_repo'],
    ['google.read_drive', 'google.read_drive'],
    ['read_drive', 'google.read_drive'],
    ['google.read_docs', 'google.read_docs'],
    ['read_docs', 'google.read_docs'],
    ['google.read_sheets', 'google.read_sheets'],
    ['read_sheets', 'google.read_sheets'],
    ['google.read_presentations', 'google.read_presentations'],
    ['read_presentations', 'google.read_presentations'],
    ['google.read_gmail', 'google.read_gmail'],
    ['read_gmail', 'google.read_gmail'],
    ['google.send_gmail', 'google.send_gmail'],
    ['send_gmail', 'google.send_gmail'],
    ['gmail.send', 'google.send_gmail'],
    ['email.send', 'google.send_gmail'],
    ['email_delivery.send', 'google.send_gmail'],
    ['google.read_calendar', 'google.read_calendar'],
    ['read_calendar', 'google.read_calendar'],
    ['google.write_calendar', 'google.write_calendar'],
    ['write_calendar', 'google.write_calendar'],
    ['calendar.write', 'google.write_calendar'],
    ['google.create_meet', 'google.create_meet'],
    ['create_meet', 'google.create_meet'],
    ['google_meet.create', 'google.create_meet'],
    ['zoom.schedule_meeting', 'zoom.schedule_meeting'],
    ['schedule_zoom', 'zoom.schedule_meeting'],
    ['zoom.create_meeting', 'zoom.schedule_meeting'],
    ['microsoft.create_teams_meeting', 'microsoft.create_teams_meeting'],
    ['teams.create_meeting', 'microsoft.create_teams_meeting'],
    ['microsoft_teams.create_meeting', 'microsoft.create_teams_meeting'],
    ['google.read_gsc', 'google.read_gsc'],
    ['read_gsc', 'google.read_gsc'],
    ['google.read_ga4', 'google.read_ga4'],
    ['read_ga4', 'google.read_ga4'],
    ['x.post', 'x.post'],
    ['post_tweet', 'x.post'],
    ['x.schedule_post', 'x.schedule_post'],
    ['schedule_post', 'x.schedule_post'],
    ['x.read_profile', 'x.read_profile'],
    ['read_profile', 'x.read_profile'],
    ['stripe.manage_billing', 'stripe.manage_billing'],
    ['manage_billing', 'stripe.manage_billing'],
    ['stripe.read_customer', 'stripe.read_customer'],
    ['read_customer', 'stripe.read_customer']
  ]);

  function normalizeClientConnectorCapability(value = '') {
    const key = String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
    if (!key) return '';
    return CLIENT_CONNECTOR_CAPABILITY_ALIASES.get(key) || key;
  }

  function normalizeClientConnectorCapabilityList(value, fallback = []) {
    return normalizeClientList(value, fallback).map(normalizeClientConnectorCapability).filter(Boolean);
  }

  function connectorForRequiredCapability(value = '') {
    const [provider] = normalizeClientConnectorCapability(value).split('.');
    return normalizeClientConnector(provider);
  }

  function defaultGoogleSourceGroupsForCapabilitiesClient(capabilities = []) {
    const output = new Set();
    for (const capability of normalizeClientList(capabilities, [])) {
      const normalized = normalizeClientConnectorCapability(capability);
      if (normalized === 'google.read_gsc') output.add('gsc');
      if (normalized === 'google.read_ga4') output.add('ga4');
      if (['google.read_drive', 'google.read_docs', 'google.read_sheets', 'google.read_presentations'].includes(normalized)) output.add('drive');
      if (normalized === 'google.read_calendar') output.add('calendar');
      if (normalized === 'google.write_calendar') output.add('calendar');
      if (normalized === 'google.create_meet') output.add('calendar');
      if (normalized === 'google.read_gmail') output.add('gmail');
      if (normalized === 'google.send_gmail') output.add('gmail');
    }
    return [...output];
  }

  function connectorStatusForClient(auth = state.snapshot?.auth || {}, account = state.snapshot?.accountSettings || null) {
    const stripe = account?.stripe && typeof account.stripe === 'object' ? account.stripe : {};
    const github = account?.connectors?.github && typeof account.connectors.github === 'object' ? account.connectors.github : {};
    const google = account?.connectors?.google && typeof account.connectors.google === 'object' ? account.connectors.google : {};
    const x = account?.connectors?.x && typeof account.connectors.x === 'object' ? account.connectors.x : {};
    return {
      github: Boolean(isGithubAuthorized(auth) || isGithubLinked(auth) || (github.connected && (github.login || github.providerUserId))),
      google: Boolean(isGoogleAuthorized(auth) || isGoogleLinked(auth) || (google.connected && (google.email || google.providerUserId))),
      x: Boolean(auth?.xAuthorized || auth?.xLinked || (x.connected && x.username)),
      stripe: Boolean(stripe.customerId || stripe.customerStatus === 'ready' || stripe.defaultPaymentMethodId),
      slack: false,
      discord: false,
      notion: false,
      linear: false,
      jira: false,
      zoom: false,
      microsoft: false,
      vercel: false,
      cloudflare: false
    };
  }

  function xConnectorIdentityForClient(account = state.snapshot?.accountSettings || null) {
    const x = account?.connectors?.x && typeof account.connectors.x === 'object' ? account.connectors.x : {};
    const username = String(x.username || '').trim().replace(/^@+/, '');
    const userId = String(x.xUserId || x.providerUserId || '').trim();
    const displayName = String(x.displayName || '').trim();
    return {
      connected: Boolean(x.connected && username),
      username,
      handle: username ? `@${username}` : '',
      userId,
      displayName,
      label: username ? `@${username}` : (displayName || userId || 'connected X account')
    };
  }

  function xApprovalPayloadForClient(postText = '') {
    const identity = xConnectorIdentityForClient();
    return {
      approved_x_username: identity.handle || identity.username || '',
      approved_x_user_id: identity.userId || '',
      approved_text: String(postText || '').trim()
    };
  }

  function connectorScopeSetForClient(value = '') {
    return new Set(String(value || '').split(/\s+/).map((part) => String(part || '').trim().toLowerCase()).filter(Boolean));
  }

  function googleCapabilityStatusForClient(auth = state.snapshot?.auth || {}, account = state.snapshot?.accountSettings || null) {
    const google = account?.connectors?.google && typeof account.connectors.google === 'object' ? account.connectors.google : {};
    const scopes = connectorScopeSetForClient(google.scopes);
    const providerReady = Boolean(isGoogleAuthorized(auth) || isGoogleLinked(auth) || (google.connected && (google.email || google.providerUserId)));
    const hasAny = (...required) => required.some((scope) => scopes.has(String(scope || '').toLowerCase()));
    return {
      providerReady,
      'google.read_drive': providerReady && hasAny(
        'https://www.googleapis.com/auth/drive.readonly',
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/drive.metadata.readonly'
      ),
      'google.read_docs': providerReady && hasAny(
        'https://www.googleapis.com/auth/documents.readonly',
        'https://www.googleapis.com/auth/drive.readonly',
        'https://www.googleapis.com/auth/drive'
      ),
      'google.read_sheets': providerReady && hasAny(
        'https://www.googleapis.com/auth/spreadsheets.readonly',
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive.readonly',
        'https://www.googleapis.com/auth/drive'
      ),
      'google.read_presentations': providerReady && hasAny(
        'https://www.googleapis.com/auth/presentations.readonly',
        'https://www.googleapis.com/auth/drive.readonly',
        'https://www.googleapis.com/auth/drive'
      ),
      'google.read_gmail': providerReady && hasAny(
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.modify',
        'https://mail.google.com/'
      ),
      'google.send_gmail': providerReady && hasAny(
        'https://www.googleapis.com/auth/gmail.send',
        'https://mail.google.com/'
      ),
      'google.read_calendar': providerReady && hasAny(
        'https://www.googleapis.com/auth/calendar.readonly',
        'https://www.googleapis.com/auth/calendar'
      ),
      'google.write_calendar': providerReady && hasAny(
        'https://www.googleapis.com/auth/calendar'
      ),
      'google.create_meet': providerReady && hasAny(
        'https://www.googleapis.com/auth/calendar'
      ),
      'google.read_gsc': providerReady && hasAny(
        'https://www.googleapis.com/auth/webmasters.readonly',
        'https://www.googleapis.com/auth/webmasters'
      ),
      'google.read_ga4': providerReady && hasAny(
        'https://www.googleapis.com/auth/analytics.readonly',
        'https://www.googleapis.com/auth/analytics'
      )
    };
  }

function normalizeRepoFullName(value = '') {
  return String(value || '')
    .trim()
    .replace(/^https?:\/\/github\.com\//i, '')
    .replace(/\.git$/i, '')
    .replace(/^\/+|\/+$/g, '');
}

function repoIdentityParts(value = '') {
  const fullName = normalizeRepoFullName(value);
  const [owner = '', name = ''] = fullName.split('/');
  return { fullName, owner, name };
}

function repoFullNameFromManifestSource(value = '') {
  const match = String(value || '').match(/^(?:github-app|github):([^:]+):/i);
  return normalizeRepoFullName(match?.[1] || '');
}

function findLoadedGithubRepo(fullName = '') {
  const safe = normalizeRepoFullName(fullName).toLowerCase();
  if (!safe) return null;
  return (state.repos || []).find((repo) => normalizeRepoFullName(repo.fullName).toLowerCase() === safe) || null;
}

function agentGithubRepo(agent) {
  const manifest = agentManifest(agent);
  const manifestRepo = manifest?.metadata?.repository && typeof manifest.metadata.repository === 'object'
    ? manifest.metadata.repository
    : {};
  const rootRepo = agent?.metadata?.repository && typeof agent.metadata.repository === 'object'
    ? agent.metadata.repository
    : {};
  const fullName = normalizeRepoFullName(
    manifestRepo.full_name
    || manifestRepo.fullName
    || rootRepo.full_name
    || rootRepo.fullName
    || repoFullNameFromManifestSource(agent?.manifestSource)
  );
  const loadedRepo = findLoadedGithubRepo(fullName);
  const identity = repoIdentityParts(fullName);
  return {
    fullName,
    owner: String(loadedRepo?.owner || identity.owner || '').trim(),
    name: String(loadedRepo?.name || identity.name || '').trim(),
    installationId: String(loadedRepo?.installationId || '').trim(),
    homepage: String(loadedRepo?.homepage || manifestRepo.homepage || manifestRepo.html_url || rootRepo.homepage || '').trim(),
    private: typeof loadedRepo?.private === 'boolean' ? loadedRepo.private : Boolean(manifestRepo.private || rootRepo.private),
    repo: loadedRepo || null
  };
}

function adapterAutomationAlreadyPrepared(repoInfo = {}) {
  if (!repoInfo?.fullName) return false;
  const cacheKey = `${repoInfo.installationId || 'none'}:${repoInfo.fullName}`;
  const cached = state.repoAdapterHints[cacheKey] || null;
  return Boolean(cached?.pullRequestUrl);
}

function onboardingNeedsHostedAutomation(onboarding = null) {
  if (!onboarding || onboarding.status === 'ready') return false;
  const checks = Array.isArray(onboarding.checks) ? onboarding.checks : [];
  return checks.some((item) => {
    const key = String(item?.key || '').trim().toLowerCase();
    if (!['healthcheck', 'job_endpoint', 'dispatch_readiness'].includes(key)) return false;
    const status = String(item?.status || '').trim().toLowerCase();
    if (status === 'pass') return false;
    const hay = [item?.title, item?.detail, item?.fix].filter(Boolean).join(' ').toLowerCase();
    return /missing|local-only|localhost|404|410|deploy|public|endpoint|api\/health|api\/jobs|runtime cannot/.test(hay);
  });
}

function canAutomateAgentSetup(agent, record = currentAgentOnboarding(agent?.id)) {
  if (!agent || !canCheckAgentOnboarding(agent)) return false;
  const onboarding = record?.onboarding || null;
  if (!onboardingNeedsHostedAutomation(onboarding)) return false;
  const repoInfo = agentGithubRepo(agent);
  if (!repoInfo.fullName || !repoInfo.installationId || !repoInfo.owner || !repoInfo.name) return false;
  if (adapterAutomationAlreadyPrepared(repoInfo)) return false;
  return true;
}

function selectGithubRepoInPicker(repoInfo = {}) {
  if (!repoInfo?.fullName || !els.repoPicker) return;
  const target = normalizeRepoFullName(repoInfo.fullName).toLowerCase();
  if (!target) return;
  let index = state.filteredRepos.findIndex((repo) => normalizeRepoFullName(repo.fullName).toLowerCase() === target);
  if (index < 0) {
    state.repoSearch = '';
    if (els.repoSearch) els.repoSearch.value = '';
    state.filteredRepos = [...state.repos];
    index = state.filteredRepos.findIndex((repo) => normalizeRepoFullName(repo.fullName).toLowerCase() === target);
  }
  if (index < 0) return;
  state.repoPage = Math.floor(index / state.repoPageSize);
  state.selectedRepoFullName = state.filteredRepos[index]?.fullName || '';
  renderRepoPicker();
  els.repoPicker.value = state.selectedRepoFullName;
  showSelectedRepo();
}

function sampleKindFromUrl(value, type = 'any') {
  const raw = String(value || '').trim();
  const directMatch = raw.match(/^\/mock\/([^/]+)\/(health|jobs)$/i);
  if (directMatch) {
    const kind = String(directMatch[1] || '').trim().toLowerCase();
    const endpointType = String(directMatch[2] || '').trim().toLowerCase();
    if (type !== 'any' && endpointType !== type) return '';
    return kind;
  }
  try {
    const parsed = new URL(raw);
    const match = parsed.pathname.match(/^\/mock\/([^/]+)\/(health|jobs)$/i);
    if (!match) return '';
    const kind = String(match[1] || '').trim().toLowerCase();
    const endpointType = String(match[2] || '').trim().toLowerCase();
    if (type !== 'any' && endpointType !== type) return '';
    return kind;
  } catch {
    return '';
  }
}

function sampleKindFromAgent(agent) {
  const manifest = agentManifest(agent);
  const rootMetadata = agent?.metadata && typeof agent.metadata === 'object' ? agent.metadata : {};
  const manifestMetadata = manifest.metadata && typeof manifest.metadata === 'object' ? manifest.metadata : {};
  const fallbackName = String(agent?.name || '').trim().toLowerCase();
  const taggedSample = Boolean(rootMetadata.sample === true || manifestMetadata.sample === true || manifest.sample === true);
  const nameTaggedSample = fallbackName.includes('sample_research') || fallbackName.includes('sample_writer') || fallbackName.includes('sample_code');
  if (!taggedSample && !nameTaggedSample) return '';
  const explicitKind = String(
    rootMetadata.sampleKind
    || rootMetadata.sample_kind
    || rootMetadata.category
    || manifestMetadata.sampleKind
    || manifestMetadata.sample_kind
    || manifestMetadata.category
    || manifest.category
    || ''
  ).trim().toLowerCase();
  if (taggedSample && explicitKind) return explicitKind;
  const healthKind = sampleKindFromUrl(manifest.healthcheckUrl || manifest.healthcheck_url || manifest.healthUrl || '', 'health');
  if (healthKind) return healthKind;
  const jobKind = sampleKindFromUrl(
    manifest.jobEndpoint || manifest.job_endpoint || manifest.jobsUrl || manifest.jobs_url || manifestMetadata.job_endpoint || manifestMetadata.jobEndpoint || '',
    'jobs'
  );
  if (jobKind) return jobKind;
  return '';
}

function isManagedSampleAgent(agent) {
  return Boolean(sampleKindFromAgent(agent));
}

function collectAgentEndpoints(agent) {
  const manifest = agentManifest(agent);
  const rootMetadata = agent?.metadata && typeof agent.metadata === 'object' ? agent.metadata : {};
  const rawEndpoints = manifest.endpoints && typeof manifest.endpoints === 'object' ? manifest.endpoints : {};
  const metadataEndpoints = rootMetadata.endpoints && typeof rootMetadata.endpoints === 'object' ? rootMetadata.endpoints : {};
  const endpointMap = new Map();
  const add = (label, value) => {
    const normalized = String(value || '').trim();
    if (!normalized) return;
    endpointMap.set(label, normalized);
  };
  add('jobs', manifest.jobEndpoint || manifest.job_endpoint || manifest.jobsUrl || manifest.jobs_url || rawEndpoints.jobs || rawEndpoints.job || rawEndpoints.dispatch || rawEndpoints.submit || rootMetadata.job_endpoint || rootMetadata.jobEndpoint || metadataEndpoints.jobs || metadataEndpoints.job || metadataEndpoints.dispatch || metadataEndpoints.submit);
  add('health', manifest.healthcheckUrl || manifest.health_url || manifest.healthUrl || rawEndpoints.health);
  add('health', metadataEndpoints.health);
  Object.entries(rawEndpoints).forEach(([key, value]) => add(String(key), value));
  Object.entries(metadataEndpoints).forEach(([key, value]) => add(String(key), value));
  return {
    primaryJob: endpointMap.get('jobs') || '',
    healthcheck: endpointMap.get('health') || '',
    entries: [...endpointMap.entries()].map(([label, value]) => ({ label, value }))
  };
}

function shortUrl(value) {
  const text = String(value || '').trim();
  if (!text) return '-';
  try {
    const parsed = new URL(text);
    return `${parsed.host}${parsed.pathname}`;
  } catch {
    return text;
  }
}

function agentVerifyAction(agent) {
  const verification = agentVerification(agent);
  const code = String(verification.code || '').trim();
  if (!code || agent?.verificationStatus === 'verified') {
    return {
      title: 'Verification healthy',
      body: 'Healthcheck passed. Use endpoint and capability fit to decide whether to route orders here.'
    };
  }
  if (code === 'missing_healthcheck_url') {
    return {
      title: 'Add a health endpoint',
      body: 'Set `healthcheck_url` or `endpoints.health` in the manifest, then verify again.'
    };
  }
  if (code === 'healthcheck_http_error') {
    return {
      title: 'Fix the healthcheck response',
      body: `The broker reached the health URL but did not get HTTP 200. Check ${verification.healthcheckUrl || 'the configured health URL'} and return 200.`
    };
  }
  if (code === 'healthcheck_unhealthy_body') {
    return {
      title: 'Return ok=true from healthcheck',
      body: 'The endpoint responded, but the body did not prove health. Return JSON with `ok: true` and retry verification.'
    };
  }
  if (code === 'ownership_challenge_failed') {
    return {
      title: 'Fix ownership challenge hosting',
      body: `Publish the expected challenge token at ${verification.challengeUrl || 'the configured challenge URL'}, then verify again.`
    };
  }
  if (code === 'healthcheck_fetch_error') {
    return {
      title: 'Restore network reachability',
      body: 'The broker could not fetch the health URL. Check DNS/TLS/public reachability and retry verification.'
    };
  }
  return {
    title: 'Inspect verify configuration',
    body: verification.reason || 'Review manifest fields, healthcheck reachability, and ownership challenge configuration.'
  };
}

function agentVerifyFailureSummary(agent) {
  const verification = agentVerification(agent);
  const action = agentVerifyAction(agent);
  const code = String(verification.code || '').trim();
  const statusCode = verification.details?.statusCode;
  let cause = agent?.verificationError || verification.reason || 'Verification is incomplete.';
  if (code === 'missing_healthcheck_url') cause = 'Manifest is missing a healthcheck URL.';
  else if (code === 'healthcheck_http_error') cause = `Healthcheck returned HTTP ${statusCode ?? 'non-200'}.`;
  else if (code === 'healthcheck_unhealthy_body') cause = 'Healthcheck body did not prove ok=true.';
  else if (code === 'ownership_challenge_failed') cause = `Ownership challenge could not be proved at ${verification.challengeUrl || 'the configured challenge URL'}.`;
  else if (code === 'healthcheck_fetch_error') cause = `Broker could not reach ${verification.healthcheckUrl || 'the configured health URL'}.`;
  else if (agent?.verificationStatus === 'verified') cause = 'Verification succeeded.';
  return {
    cause,
    next: `${action.title}: ${action.body}`
  };
}

function agentReview(agent) {
  return agent?.agentReview && typeof agent.agentReview === 'object'
    ? agent.agentReview
    : {};
}

function agentReviewStatus(agent) {
  if (isManagedSampleAgent(agent)) return 'not_required';
  const status = String(agent?.agentReviewStatus || agent?.agent_review_status || '').trim().toLowerCase();
  if (['approved', 'rejected', 'needs_human_review', 'not_required'].includes(status)) return status;
  if (agent?.verificationStatus === 'verified') return 'approved_legacy';
  return 'pending';
}

function agentReviewLabel(agent) {
  const status = agentReviewStatus(agent);
  if (status === 'approved') return 'REVIEW APPROVED';
  if (status === 'approved_legacy') return 'REVIEW LEGACY';
  if (status === 'rejected') return 'REVIEW REJECTED';
  if (status === 'needs_human_review') return 'HUMAN REVIEW';
  if (status === 'not_required') return 'REVIEW N/A';
  return 'REVIEW PENDING';
}

function agentReviewApproved(agent) {
  return ['approved', 'approved_legacy', 'not_required'].includes(agentReviewStatus(agent));
}

function agentReviewReason(agent) {
  const review = agentReview(agent);
  const reasons = Array.isArray(review.reasons) ? review.reasons.filter(Boolean) : [];
  if (reasons[0]) return reasons[0];
  const status = agentReviewStatus(agent);
  if (status === 'rejected') return 'Agent review rejected this registration.';
  if (status === 'needs_human_review') return 'Agent requires human review before routing.';
  if (status === 'pending') return 'Agent review is pending before routing.';
  if (status === 'approved_legacy') return 'Legacy verified agent. Re-run verify to refresh the review record.';
  return 'Agent review approved.';
}

function agentHealth(agent) {
  const verification = agentVerification(agent);
  const verified = agent?.verificationStatus === 'verified' || isManagedSampleAgent(agent);
  const reviewApproved = agentReviewApproved(agent);
  const reviewLabel = agentReviewLabel(agent);
  const endpoints = collectAgentEndpoints(agent);
  const endpoint = endpoints.primaryJob;
  const healthcheck = endpoints.healthcheck;
  const capabilityCount = (agent?.taskTypes || []).length;
  const groupedCatalogAgent = isAgentSuiteProduct(agent);
  const ready = Boolean(agent?.online && verified && reviewApproved && endpoint && capabilityCount && !groupedCatalogAgent);
  let label = 'DEGRADED';
  let tone = 'warn';
  let reason = agent?.verificationError || verification.reason || 'Agent needs verification and endpoint review.';
  let verifyLabel = verified ? 'VERIFIED' : 'UNVERIFIED';
  if (!agent?.online) {
    label = 'OFFLINE';
    tone = 'error';
    reason = 'Agent is marked offline.';
  } else if (verified && !reviewApproved) {
    label = agentReviewStatus(agent) === 'rejected' ? 'REVIEW REJECTED' : 'REVIEW PENDING';
    tone = agentReviewStatus(agent) === 'rejected' ? 'error' : 'warn';
    reason = agentReviewReason(agent);
    verifyLabel = reviewLabel;
  } else if (ready) {
    label = 'READY';
    tone = 'ok';
    reason = 'Verified, review-approved, online, and exposes a job endpoint.';
  } else if (verified && !endpoint) {
    label = 'NO ENDPOINT';
    tone = 'warn';
    reason = 'Verified, but no dispatch job endpoint is configured.';
  } else if (groupedCatalogAgent) {
    label = 'GROUP SETUP';
    tone = 'warn';
    reason = 'This is a grouped set of related agents. Register each component as its own orderable agent; CAIt can then ask whether to run them together or separately.';
  } else if (verified) {
    label = 'VERIFIED';
    tone = 'info';
    reason = 'Healthcheck passed. Review endpoint/capability fit before dispatch.';
  } else if (String(agent?.verificationStatus || '').includes('failed')) {
    label = 'VERIFY FAIL';
    tone = 'error';
    verifyLabel = 'VERIFY FAIL';
    reason = agent?.verificationError || verification.reason || 'Verification failed.';
  } else if (agent?.verificationStatus === 'manifest_loaded') {
    verifyLabel = 'MANIFEST LOADED';
  } else if (agent?.verificationStatus === 'legacy_unverified') {
    verifyLabel = 'LEGACY';
  }
  return {
    verified,
    endpoint,
    healthcheck,
    endpoints: endpoints.entries,
    ready,
    label,
    tone,
    reason,
    verifyLabel,
    reviewApproved,
    reviewLabel,
    reviewStatus: agentReviewStatus(agent),
    reviewReason: agentReviewReason(agent),
    capabilityCount,
    availability: agent?.online ? 'ONLINE' : 'OFFLINE',
    endpointLabel: endpoint ? 'JOB ENDPOINT' : 'NO ENDPOINT',
    healthLabel: healthcheck ? 'HEALTHCHECK' : 'NO HEALTHCHECK'
  };
}

function runTiming(job) {
  if (!job) return null;
  const createdAt = job.createdAt ? new Date(job.createdAt).getTime() : null;
  const claimedAt = job.claimedAt ? new Date(job.claimedAt).getTime() : null;
  const startedAt = job.startedAt ? new Date(job.startedAt).getTime() : null;
  const terminalAtValue = job.completedAt || job.failedAt || job.timedOutAt || null;
  const terminalAt = terminalAtValue ? new Date(terminalAtValue).getTime() : null;
  const now = Date.now();
  return {
    age: createdAt ? formatDurationMs(now - createdAt) : '-',
    queuedFor: createdAt ? formatDurationMs((claimedAt || startedAt || terminalAt || now) - createdAt) : '-',
    activeFor: startedAt ? formatDurationMs((terminalAt || now) - startedAt) : '-',
    endToEnd: createdAt ? formatDurationMs((terminalAt || now) - createdAt) : '-',
    lastUpdatedAt: terminalAtValue || job.lastCallbackAt || job.dispatchedAt || job.startedAt || job.claimedAt || job.createdAt || null
  };
}

function traceTimeline(job) {
  if (!job) return [];
  return [
    ['created', job.createdAt],
    ['claimed', job.claimedAt],
    ['dispatched', job.dispatchedAt],
    ['started', job.startedAt],
    ['last_callback', job.lastCallbackAt],
    ['completed', job.completedAt],
    ['failed', job.failedAt],
    ['timed_out', job.timedOutAt]
  ]
    .filter(([, value]) => Boolean(value))
    .map(([label, value]) => `${label}: ${formatTime(value)} (${sinceLabel(value)})`);
}

function agentReadinessScore(agent) {
  const health = agentHealth(agent);
  return (health.ready ? 1000 : 0)
    + (health.verified ? 300 : 0)
    + (agent.online ? 120 : 0)
    + (isManagedSampleAgent(agent) ? 0 : 180)
    + Math.round(Number(agent.successRate || 0) * 100)
    - Math.round(Number(agent.avgLatencySec || 0));
}

function agentTaskSpecificityScore(agent = {}, taskType = '') {
  const requestedTask = String(taskType || '').trim().toLowerCase();
  const tasks = Array.isArray(agent?.taskTypes) ? agent.taskTypes.map((item) => String(item || '').toLowerCase()) : [];
  const index = tasks.indexOf(requestedTask);
  if (index < 0) return 0;
  const primaryFit = index === 0 ? 100 : 85;
  const breadthFit = Math.max(65, 100 - Math.max(0, tasks.length - 1) * 8);
  return Math.round(primaryFit * breadthFit / 100);
}

function currentOrderInputTypeHints(prompt = String(els.jobPrompt?.value || ''), input = orderInputFromComposer()) {
  const hints = new Set();
  const text = String(prompt || '');
  if (text.trim()) hints.add('text');
  const counts = orderInputCounts(input || null);
  if (counts.urlCount || /https?:\/\//i.test(text)) hints.add('url');
  if (counts.fileCount) hints.add('file');
  if (/\b(github|repo|repository|pull request|pr)\b|リポジトリ|プルリク/i.test(text)) hints.add('repo');
  if (/\b(api|webhook|json payload)\b/i.test(text)) hints.add('api_payload');
  if (/\b(oauth|gmail|google drive|google calendar|google meet|zoom|teams|microsoft teams|slack|discord|notion|linear|jira)\b/i.test(text)) hints.add('oauth_resource');
  if (!hints.size) hints.add('text');
  return [...hints];
}

function clientTaskRoutingObject(agent = {}) {
  const metadata = agent?.metadata || {};
  const manifest = metadata?.manifest || agent?.manifest || {};
  const manifestMetadata = manifest?.metadata || {};
  const routing = metadata.taskRouting
    || metadata.task_routing
    || manifest.taskRouting
    || manifest.task_routing
    || manifestMetadata.taskRouting
    || manifestMetadata.task_routing
    || {};
  return routing && typeof routing === 'object' && !Array.isArray(routing) ? routing : {};
}

function clientRoutingByTaskValues(routing = {}, taskType = '', field = '') {
  const task = String(taskType || '').trim().toLowerCase();
  if (!task) return [];
  const source = routing[field] && typeof routing[field] === 'object' && !Array.isArray(routing[field])
    ? routing[field]
    : {};
  return normalizeClientList(source[task] || [], []);
}

function clientTaskRoutingTokens(taskType = '', options = {}) {
  const task = String(taskType || '').trim().toLowerCase();
  if (!task) return [];
  const field = options.field || 'soft';
  const directField = field === 'tag' ? 'tag_hints' : 'soft_match_tokens';
  const byTaskField = field === 'tag' ? 'tag_hints_by_task' : 'soft_match_tokens_by_task';
  const tokens = [];
  const push = (items = []) => {
    normalizeClientList(items, []).forEach((item) => {
      if (!tokens.includes(item)) tokens.push(item);
    });
  };
  (state.snapshot?.agents || []).forEach((agent) => {
    const routing = clientTaskRoutingObject(agent);
    const taskTypes = normalizeClientList(agent?.taskTypes || agent?.task_types || [], []);
    const aliases = normalizeClientList(routing.aliases || [], []);
    const ownsTask = taskTypes.includes(task) || aliases.includes(task);
    push(clientRoutingByTaskValues(routing, task, byTaskField));
    if (ownsTask) push(routing[directField] || []);
  });
  return tokens;
}

function clientTaskSignalTokens(value = '') {
  return normalizeClientList(String(value || '').split(/[^a-z0-9_]+/i), []);
}

function clientTaskTagHints(taskType = '') {
  const task = String(taskType || '').trim().toLowerCase();
  return normalizeClientList([
    task,
    ...clientTaskRoutingTokens(task, { field: 'tag' }),
    ...clientTaskSignalTokens(task)
  ], []);
}

function clientTaskMetadataScores(agent = {}) {
  const sources = [
    agent?.metadata?.task_type_scores,
    agent?.metadata?.taskTypeScores,
    agent?.metadata?.manifest?.task_type_scores,
    agent?.metadata?.manifest?.taskTypeScores,
    agent?.metadata?.manifest?.metadata?.task_type_scores,
    agent?.metadata?.manifest?.metadata?.taskTypeScores
  ];
  const scored = new Map();
  const record = (taskType, score) => {
    const safeTask = String(taskType || '').trim().toLowerCase();
    const safeScore = Math.max(0, Math.min(1, Number(score || 0)));
    if (!safeTask || !Number.isFinite(safeScore)) return;
    scored.set(safeTask, Math.max(safeScore, scored.get(safeTask) || 0));
  };
  sources.forEach((source) => {
    if (!source) return;
    if (Array.isArray(source)) {
      source.forEach((item) => {
        if (typeof item === 'string') {
          record(item, 1);
          return;
        }
        if (!item || typeof item !== 'object') return;
        record(item.task_type || item.taskType || item.name || item.id, item.score ?? item.confidence ?? item.weight ?? item.value ?? item.fit ?? 0);
      });
      return;
    }
    if (typeof source !== 'object') return;
    Object.entries(source).forEach(([taskType, score]) => record(taskType, score));
  });
  return scored;
}

function clientWorkflowTaskTokens(taskType = '') {
  const task = String(taskType || '').trim().toLowerCase();
  if (!task) return [];
  return normalizeClientList([
    task,
    ...clientTaskRoutingTokens(task, { field: 'soft' })
  ], []);
}

function clientTaskMatch(agent = {}, taskType = '') {
  const normalizedTask = String(taskType || '').trim().toLowerCase();
  const tasks = (agent?.taskTypes || []).map((task) => String(task).trim().toLowerCase()).filter(Boolean);
  if (!normalizedTask) return { matches: true, exact: false, taskType: '', compatibility: 1, matchKind: 'none' };
  if (tasks.includes(normalizedTask)) {
    return { matches: true, exact: true, taskType: normalizedTask, compatibility: 1, matchKind: 'exact' };
  }
  const desiredTokens = clientWorkflowTaskTokens(normalizedTask);
  if (!desiredTokens.length) return { matches: false, exact: false, taskType: normalizedTask, compatibility: 0, matchKind: 'none' };
  const desiredSet = new Set(desiredTokens);
  const tagList = agentTags(agent);
  const agentOverlap = desiredTokens.filter((token) => tagList.includes(token)).length;
  const metadataScores = clientTaskMetadataScores(agent);
  const metadataBoost = Math.max(...desiredTokens.map((token) => Number(metadataScores.get(token) || 0)), 0);
  let best = null;
  tasks.forEach((candidateTask) => {
    const candidateTokens = clientWorkflowTaskTokens(candidateTask);
    const overlap = candidateTokens.filter((token) => desiredSet.has(token)).length;
    const directAlias = desiredSet.has(candidateTask) ? 1 : 0;
    const overlapScore = desiredTokens.length ? overlap / desiredTokens.length : 0;
    const agentScore = desiredTokens.length ? agentOverlap / desiredTokens.length : 0;
    const compatibility = Math.max(
      directAlias ? 0.82 : 0,
      Math.min(0.92, overlapScore * 0.65 + agentScore * 0.25 + metadataBoost * 0.3)
    );
    const acceptable = directAlias || overlap >= 2 || ((directAlias || overlap >= 1) && metadataBoost >= 0.55) || (overlap >= 1 && agentOverlap >= 2);
    if (!acceptable || compatibility < 0.32) return;
    if (!best || compatibility > best.compatibility || (compatibility === best.compatibility && candidateTask.localeCompare(best.taskType) < 0)) {
      best = { matches: true, exact: false, taskType: candidateTask, compatibility, matchKind: 'soft' };
    }
  });
  return best || { matches: false, exact: false, taskType: normalizedTask, compatibility: 0, matchKind: 'none' };
}

function agentRoutingScore(agent = {}, taskType = '') {
  const health = agentHealth(agent);
  const quality = Math.round(Number(agent.successRate || 0) * 220);
  const speed = Math.max(0, 50 - Math.round(Number(agent.avgLatencySec || 20) * 0.4));
  const profile = agentExecutionProfile(agent);
  const tags = agentTags(agent);
  const taskMatch = clientTaskMatch(agent, taskType);
  const tagFit = clientTaskTagHints(taskType)
    .reduce((total, tag) => total + (tags.includes(tag) ? 18 : 0), 0);
  const inputFit = currentOrderInputTypeHints()
    .reduce((total, inputType) => total + (profile.inputTypes.includes(inputType) ? 14 : 0), 0);
  const scheduleFit = /scheduled|recurring|daily|weekly|hourly|定期|毎日|毎週/i.test(String(els.jobPrompt?.value || ''))
    ? (profile.scheduleSupport || ['scheduled', 'monitoring'].includes(profile.executionPattern) ? 24 : -16)
    : 0;
  const riskPenalty = profile.riskLevel === 'restricted' ? -1000 : (profile.riskLevel === 'confirm_required' ? -12 : 0);
  return (health.ready ? 280 : 0)
    + (taskMatch.matches ? 280 : 0)
    + Math.round(agentTaskSpecificityScore(agent, taskMatch.taskType || taskType) * 1.6)
    + (taskMatch.exact ? 28 : Math.round(Number(taskMatch.compatibility || 0) * 20))
    + quality
    + tagFit
    + (isManagedSampleAgent(agent) ? 0 : 160)
    + speed
    + inputFit
    + scheduleFit
    + riskPenalty
    + (agent.online ? 30 : 0);
}

function compareAgents(a, b) {
  const mode = state.agentSort || 'readiness';
  const verifyRank = (agent) => {
    const status = String(agent?.verificationStatus || '');
    if (status === 'verified') return 3;
    if (status === 'manifest_loaded') return 2;
    if (status === 'legacy_unverified') return 1;
    if (status.includes('failed')) return 0;
    return 1;
  };
  if (mode === 'verify') return verifyRank(b) - verifyRank(a);
  if (mode === 'success') return Number(b.successRate || 0) - Number(a.successRate || 0);
  if (mode === 'latency') return Number(a.avgLatencySec || 0) - Number(b.avgLatencySec || 0);
  if (mode === 'earnings') return Number(b.earnings || 0) - Number(a.earnings || 0);
  if (mode === 'name') return String(a.name || '').localeCompare(String(b.name || ''));
  return agentReadinessScore(b) - agentReadinessScore(a);
}

function parseSearchTokens(raw = '') {
  const tokens = [];
  const free = [];
  String(raw || '').split(/\s+/).filter(Boolean).forEach((token) => {
    const idx = token.indexOf(':');
    if (idx > 0) {
      tokens.push({ key: token.slice(0, idx).toLowerCase(), value: token.slice(idx + 1).toLowerCase() });
      return;
    }
    free.push(token.toLowerCase());
  });
  return { tokens, free };
}

function agentTaskFit(agent, taskType = currentRoutingTask()) {
  const normalizedTask = String(taskType || '').trim().toLowerCase();
  const match = clientTaskMatch(agent, normalizedTask);
  if (!normalizedTask) {
    return {
      taskType: '',
      matches: true,
      label: 'GENERAL FIT',
      tone: 'info',
      reason: 'No specific task is selected. Judge this agent by readiness, endpoint, and verification state.'
    };
  }
  if (match.matches && match.exact) {
    return {
      taskType: normalizedTask,
      matches: true,
      label: 'TASK MATCH',
      tone: 'ok',
      reason: `Supports ${normalizedTask}.`
    };
  }
  if (match.matches) {
    return {
      taskType: match.taskType || normalizedTask,
      matches: true,
      label: 'WORKFLOW MATCH',
      tone: 'ok',
      reason: `Maps ${normalizedTask} to ${match.taskType || normalizedTask} for team routing.`
    };
  }
  return {
    taskType: normalizedTask,
    matches: false,
    label: 'TASK MISMATCH',
    tone: 'warn',
    reason: `Does not advertise ${normalizedTask}.`
  };
}

function agentNextAction(agent) {
  if (!agent) return { title: 'NO AGENT SELECTED', body: 'Select an agent to inspect readiness, dispatch path, and recommended next step.', tone: 'info' };
  const onboarding = currentAgentOnboarding(agent.id);
  if (onboarding?.onboarding) {
    const action = onboardingAction(onboarding.onboarding);
    if (action) return action;
  }
  const health = agentHealth(agent);
  const fit = agentTaskFit(agent);
  const verifyAction = agentVerifyAction(agent);
  const requestedTask = fit.taskType || currentRoutingTask();
  if (!agent.online) return { title: 'ACTION: RESTORE AVAILABILITY', body: 'This agent is offline. Fix service availability before sending orders to it.', tone: 'error' };
  if (!health.verified) return { title: 'ACTION: VERIFY AGENT', body: `${health.reason} Next: ${verifyAction.title}. ${verifyAction.body}${requestedTask ? ` Requested task: ${requestedTask}.` : ''}`, tone: health.tone === 'error' ? 'error' : 'info' };
  if (!health.reviewApproved) return { title: 'ACTION: COMPLETE AGENT REVIEW', body: `${health.reviewReason} Agent routing stays disabled until review is approved.`, tone: health.tone };
  if (isAgentSuiteProduct(agent)) return { title: 'ACTION: REGISTER GROUP COMPONENTS', body: 'This is an agent group, not the default dispatch target. Register the SaaS, marketing, or other component agents separately so CAIt can ask whether to run them as one flow or separate orders.', tone: 'warn' };
  if (!health.endpoint) return { title: 'ACTION: ADD JOB ENDPOINT', body: 'Verification passed, but the manifest does not expose a dispatch endpoint. Add `job_endpoint` or `endpoints.jobs` before routing orders here.', tone: 'error' };
  if (!fit.matches) return { title: 'ACTION: CHOOSE A BETTER TASK MATCH', body: `Current routing task is ${requestedTask}. This agent is healthy, but it does not advertise that capability. Use auto-routing or pick an agent that explicitly supports the task.`, tone: 'warn' };
  return { title: requestedTask ? `READY FOR DISPATCH (${requestedTask})` : 'READY FOR DISPATCH', body: `Best used for ${(agent.taskTypes || []).join(', ') || 'general work'}. Pin this agent only when you need deterministic routing.`, tone: 'ok' };
}

function runNextAction(job) {
  if (!job) return { title: 'NO ORDER SELECTED', body: 'Select an order to inspect current state and recommended next action.', tone: 'info' };
  if (job.jobKind === 'workflow') {
    const counts = job.workflow?.statusCounts || {};
    const authority = authorityRequestFromReport(job.output?.report || {});
    if (authorityRequestRequiresClientApproval(authority)) {
      return {
        title: 'ACTION APPROVAL REQUIRED',
        body: `${counts.completed || 0}/${counts.total || 0} internal work items finished, but external execution is waiting for approval/connector setup. Required: ${describeAuthorityNeed(authority.missingConnectorCapabilities, authority.missingConnectors)}.`,
        tone: 'warn'
      };
    }
    if (job.status === 'blocked') return { title: 'AGENT TEAM WAITING', body: `${counts.completed || 0}/${counts.total || 0} agent runs completed. Resolve the waiting specialist or connector gate before treating this as final.`, tone: 'warn' };
    if (job.status === 'completed') return { title: 'AGENT TEAM COMPLETED', body: `${counts.completed || 0}/${counts.total || 0} internal work items completed. Review the combined integrated delivery.`, tone: 'ok' };
    if (job.status === 'failed') return { title: 'ACTION: INSPECT AGENT RUN FAILURES', body: `${counts.failed || 0} agent runs failed. Review run statuses and retry the failed path only.`, tone: 'error' };
    return { title: 'AGENT TEAM RUNNING', body: `${counts.completed || 0}/${counts.total || 0} agent runs completed. Wait for remaining agent runs or inspect the workflow detail.`, tone: 'info' };
  }
  if (job.status === 'completed') return { title: 'ORDER COMPLETED', body: 'Delivery and billing are recorded. Review output or send another order.', tone: 'ok' };
  if (job.status === 'failed' || job.status === 'timed_out') {
    if (String(job.failureReason || '').toLowerCase().includes('no verified agent')) {
      return { title: 'ACTION: VERIFY OR REGISTER AN AGENT', body: 'No verified agent could accept this order. Verify an agent or choose one manually, then retry.', tone: 'error' };
    }
    if (job.dispatch?.retryable) {
      const nextRetryAt = job.dispatch?.nextRetryAt;
      const overdue = nextRetryAt && new Date(nextRetryAt).getTime() <= Date.now();
      return {
        title: overdue ? 'ACTION: RETRY DISPATCH NOW' : 'ACTION: RETRY DISPATCH',
        body: `Dispatch can be retried.${nextRetryAt ? ` Recommended ${overdue ? 'now' : `after ${nextRetryAt}`}.` : ''} Review trace/logs first if the same endpoint keeps failing.`,
        tone: overdue ? 'ok' : 'info'
      };
    }
    return { title: 'ACTION: INSPECT FAILURE', body: `${job.failureReason || 'Order failed.'} ${job.failureCategory ? `Category: ${job.failureCategory}.` : ''} Fix the root cause before retrying.`, tone: 'error' };
  }
  if (job.status === 'dispatched') return { title: 'ORDER IN FLIGHT', body: 'The order was accepted by an agent. Watch telemetry/logs or wait for callback/result.', tone: 'info' };
  if (job.status === 'queued') return { title: 'ORDER QUEUED', body: 'The order is waiting for claim/dispatch. Confirm agent assignment and status.', tone: 'info' };
  if (job.status === 'claimed' || job.status === 'running') return { title: 'ORDER EXECUTING', body: 'An agent is currently working. Check telemetry/logs before taking action.', tone: 'ok' };
  return { title: 'CHECK ORDER STATE', body: 'Inspect the trace and order detail for the latest execution state.', tone: 'info' };
}

function runActionKey(job) {
  const action = runNextAction(job);
  if (action.title.includes('RETRY DISPATCH')) return 'retry';
  if (action.title.includes('VERIFY AGENT')) return 'verify-agent';
  if (action.title.includes('INSPECT FAILURE')) return 'inspect';
  if (action.title.includes('ORDER IN FLIGHT') || action.title.includes('ORDER EXECUTING') || action.title.includes('ORDER QUEUED')) return 'watch';
  if (action.title.includes('WAITING')) return 'watch';
  if (action.title.includes('ORDER COMPLETED')) return 'done';
  return 'inspect';
}

function inputSourcesFromJob(job) {
  const input = job?.input && typeof job.input === 'object' ? job.input : {};
  const urls = Array.isArray(input.urls)
    ? input.urls.map((url) => String(url || '').trim()).filter(Boolean).slice(0, ORDER_INPUT_MAX_URLS)
    : [];
  const files = Array.isArray(input.files)
    ? input.files.map((file) => normalizeOrderInputFile(file)).filter((file) => file.content)
    : [];
  return { urls, files };
}

function summarizeRun(job) {
  if (!job) return 'No run selected.';
  const timing = runTiming(job);
  const sources = inputSourcesFromJob(job);
  const logs = (job.logs || []).length ? job.logs.map((line, index) => `${index + 1}. ${line}`) : ['-'];
  const actualBilling = job.actualBilling && typeof job.actualBilling === 'object' ? job.actualBilling : null;
  const fundingLines = fundingBreakdownLines(job);
  const lines = [
    `Run: ${job.id}`,
    `Kind: ${job.jobKind || 'job'}`,
    `Status: ${orderProgressStatusLabel(job.status)}`,
    `Task: ${job.taskType}`,
    `Agent: ${job.assignedAgentId || 'auto-routing'}`,
    `Created: ${new Date(job.createdAt).toLocaleString('ja-JP')} (${sinceLabel(job.createdAt)})`,
    `Failure: ${job.failureReason || '-'}`,
    `Next retry: ${job.dispatch?.nextRetryAt || '-'}`,
    `Endpoint: ${job.dispatch?.endpoint || '-'}`,
    '',
    job.originalPrompt ? 'Original prompt:' : 'Prompt:',
    job.originalPrompt || job.prompt || '-',
    ...(job.originalPrompt ? ['', 'Execution prompt:', job.prompt || '-'] : []),
    ...(job.promptOptimization ? [
      '',
      'Prompt optimization:',
      JSON.stringify(job.promptOptimization, null, 2)
    ] : []),
    '',
    `Input URLs: ${sources.urls.length}`,
    `Input files: ${sources.files.length}`,
    '',
    'Timeline:',
    ...(traceTimeline(job).length ? traceTimeline(job) : ['-']),
    '',
    'Timing:',
    `age=${timing?.age || '-'}`,
    `queue=${timing?.queuedFor || '-'}`,
    `active=${timing?.activeFor || '-'}`,
    '',
    'Dispatch:',
    JSON.stringify(job.dispatch || null, null, 2),
    '',
    'Logs:',
    ...logs
  ];
  if (actualBilling) {
    lines.push(
      '',
      'Billing:',
      `total=${yen(actualBilling.total)}`,
      `basis=${yen(actualBilling.totalCostBasis ?? actualBilling.apiCost)}`,
      `agent_payout=${yen(actualBilling.agentPayout)}`,
      `platform_revenue=${yen(actualBilling.platformRevenue)}`
    );
    if (fundingLines.length) lines.push(...fundingLines);
  }
  if (job.workflow) {
    lines.push(
      '',
      'Workflow:',
      `strategy=${job.workflow.strategy || '-'}`,
      `planned_tasks=${(job.workflow.plannedTasks || []).join(', ') || '-'}`,
      `children=${(job.workflow.childJobIds || []).length}`,
      JSON.stringify(job.workflow.childRuns || [], null, 2)
    );
  }
  if (sources.urls.length) {
    lines.push('', 'Source URLs:');
    sources.urls.slice(0, 8).forEach((url, index) => lines.push(`${index + 1}. ${url}`));
  }
  if (sources.files.length) {
    lines.push('', 'Source files:');
    sources.files.slice(0, 8).forEach((file, index) => {
      lines.push(`${index + 1}. ${file.name} (${formatBytes(file.size)}, ${file.content.length} chars${file.truncated ? ', truncated' : ''})`);
    });
  }
  if (job.output) lines.push('', 'Output:', JSON.stringify(job.output, null, 2));
  return lines.join('\n');
}

  function preflightAgentsForDraft(draft = {}) {
    if (resolvedOrderStrategyOfDraft(draft) === 'multi') {
      return (routePlanOfDraft(draft).picks || []).map((item) => item.agent).filter(Boolean);
    }
    const pinned = queuedDraftAgent(draft);
    if (pinned) return [pinned];
    return readyAgentsForTask(draft.task_type)
      .sort((left, right) => agentRoutingScore(right, draft.task_type) - agentRoutingScore(left, draft.task_type))
      .slice(0, 1);
  }

  function clientOrderPreflight(draft = {}) {
    const auth = state.snapshot?.auth || {};
    const account = state.snapshot?.accountSettings || null;
    const connectorStatus = connectorStatusForClient(auth, account);
    const googleCapabilities = googleCapabilityStatusForClient(auth, account);
    if (isRepoBackedCodeOrderIntent(draft.task_type, draft.prompt) && !connectorStatus.github) {
      return {
        ok: false,
        code: 'connector_required',
        missingConnectors: ['github'],
        missingConnectorCapabilities: ['github.write_pr'],
        connectorStatus,
        error: 'GitHub connection is required before repo-backed coding can run.'
      };
    }
    const agents = preflightAgentsForDraft(draft);
    for (const agent of agents) {
      const profile = agentExecutionProfile(agent);
      if (profile.riskLevel === 'restricted') {
        return {
          ok: false,
          code: 'agent_restricted',
          agent,
          error: `${agent.name} is restricted and cannot receive orders.`
        };
      }
      const missing = profile.requiredConnectors
        .map(normalizeClientConnector)
        .filter((connector) => connector && Object.prototype.hasOwnProperty.call(connectorStatus, connector) && !connectorStatus[connector]);
      const missingCapabilities = (profile.requiredConnectorCapabilities || []).map(normalizeClientConnectorCapability).filter((capability) => {
        const normalized = String(capability || '').trim().toLowerCase();
        if (!normalized) return false;
        if (Object.prototype.hasOwnProperty.call(googleCapabilities, normalized)) return !googleCapabilities[normalized];
        const connector = connectorForRequiredCapability(normalized);
        return connector && Object.prototype.hasOwnProperty.call(connectorStatus, connector) && !connectorStatus[connector];
      });
      const missingFromCapabilities = missingCapabilities
        .map(connectorForRequiredCapability)
        .filter((connector) => connector && Object.prototype.hasOwnProperty.call(connectorStatus, connector) && !connectorStatus[connector]);
      const allMissing = [...new Set([...missing, ...missingFromCapabilities])];
      if (allMissing.length || missingCapabilities.length) {
        return {
          ok: false,
          code: 'connector_required',
          agent,
          missingConnectors: allMissing,
          missingConnectorCapabilities: missingCapabilities,
          connectorStatus,
          error: `Connector setup is required before ${agent.name} can run.`
        };
      }
      const confirmationRequired = profile.riskLevel === 'confirm_required' || profile.confirmationRequiredFor.length > 0;
      const accepted = Boolean(state.pendingOrderConfirmation?.accepted)
        && (!state.pendingOrderConfirmation.agentId || state.pendingOrderConfirmation.agentId === agent.id);
      if (confirmationRequired && !accepted) {
        return {
          ok: false,
          code: 'confirmation_required',
          agent,
          riskLevel: profile.riskLevel,
          confirmationRequiredFor: profile.confirmationRequiredFor,
          error: `Explicit confirmation is required before ${agent.name} can run.`
        };
      }
    }
    return { ok: true };
  }

  return {
    providerMarkupRateOf,
    platformMarginRateOf,
    normalizeClientPricingModel,
    normalizeClientOverageMode,
    agentPricingManifest,
    agentPricingConfig,
    pricingModelLabel,
    syncAgentPricingEditorVisibility,
    agentPricingGuideText,
    estimateWindowOfAgent,
    agentVerification,
    agentManifest,
    agentTrustList,
    agentTrustProfile,
    agentRole,
    normalizeClientCompositionMode,
    agentComposition,
    agentProductKind,
    isCompositeAgentProduct,
    isAgentSuiteProduct,
    agentCompositionSummary,
    normalizeClientRequirement,
    normalizeClientRequirementFulfillment,
    normalizeClientRequirementCompletionSignal,
    requirementFulfillmentLabel,
    requirementFlowSummary,
    requirementHubSummary,
    agentRequirements,
    agentRequirementSummary,
    normalizeClientList,
    agentTags,
    agentExecutionProfile,
    normalizeClientConnector,
    normalizeClientConnectorCapability,
    normalizeClientConnectorCapabilityList,
    connectorForRequiredCapability,
    defaultGoogleSourceGroupsForCapabilitiesClient,
    connectorStatusForClient,
    xConnectorIdentityForClient,
    xApprovalPayloadForClient,
    connectorScopeSetForClient,
    googleCapabilityStatusForClient,
    normalizeRepoFullName,
    repoIdentityParts,
    repoFullNameFromManifestSource,
    findLoadedGithubRepo,
    agentGithubRepo,
    adapterAutomationAlreadyPrepared,
    onboardingNeedsHostedAutomation,
    canAutomateAgentSetup,
    selectGithubRepoInPicker,
    sampleKindFromUrl,
    sampleKindFromAgent,
    isManagedSampleAgent,
    collectAgentEndpoints,
    shortUrl,
    agentVerifyAction,
    agentVerifyFailureSummary,
    agentReview,
    agentReviewStatus,
    agentReviewLabel,
    agentReviewApproved,
    agentReviewReason,
    agentHealth,
    runTiming,
    traceTimeline,
    agentReadinessScore,
    agentTaskSpecificityScore,
    currentOrderInputTypeHints,
    clientTaskRoutingObject,
    clientRoutingByTaskValues,
    clientTaskRoutingTokens,
    clientTaskSignalTokens,
    clientTaskTagHints,
    clientTaskMetadataScores,
    clientWorkflowTaskTokens,
    clientTaskMatch,
    agentRoutingScore,
    compareAgents,
    parseSearchTokens,
    agentTaskFit,
    agentNextAction,
    runNextAction,
    runActionKey,
    inputSourcesFromJob,
    summarizeRun,
    preflightAgentsForDraft,
    clientOrderPreflight
  };
}
