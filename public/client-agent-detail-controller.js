export function createClientAgentDetailController(deps = {}) {
  const {
    state,
    els,
    window,
    api,
    adapterAutomationAlreadyPrepared,
    agentComposition,
    agentExecutionProfile,
    agentGithubRepo,
    agentHealth,
    agentNextAction,
    agentPricingConfig,
    agentPricingGuideText,
    agentProductKind,
    agentRequirements,
    agentTags,
    agentTaskFit,
    agentTrustProfile,
    agentVerification,
    agentVerifyAction,
    agentVerifyFailureSummary,
    canAutomateAgentSetup,
    canCheckAgentOnboarding,
    canDeleteAgent,
    canEditAgentPricing,
    currentAgentOnboarding,
    displayCurrencyToLedgerAmount,
    estimateWindowOfAgent,
    flash,
    formatDisplayCurrency,
    formatSecRange,
    formatTime,
    moneyInputValueFromLedger,
    normalizeClientOverageMode,
    normalizeClientPricingModel,
    providerMarkupRateOf,
    refresh,
    renderAgentOnboarding,
    renderAgents,
    renderOrderComposer,
    requirementFlowSummary,
    requirementFulfillmentLabel,
    requirementHubSummary,
    safeText,
    setButtonAccess,
    syncAgentPricingEditorVisibility,
    yen
  } = deps;

  function selectedAgent() {
    return state.snapshot?.agents?.find((agent) => agent.id === state.selectedAgentId) || null;
  }

  function setAgentRunDraft(agent) {
    if (!els.agentRunDraft) return;
    if (!agent) {
      els.agentRunDraft.textContent = 'Select an agent row.';
      return;
    }
    const fit = agentTaskFit(agent);
    const health = agentHealth(agent);
    const estimate = estimateWindowOfAgent(agent, fit.matches && fit.taskType ? fit.taskType : agent.taskTypes?.[0] || 'research');
    const taskType = fit.matches && fit.taskType ? fit.taskType : agent.taskTypes?.[0] || 'research';
    const prompt = `Inspect ${agent.name} and execute ${taskType} work with deterministic routing.`;
    const nextAction = agentNextAction(agent).title.replace('ACTION: ', '');
    const productKind = agentProductKind(agent);
    els.agentRunDraft.textContent = `# exact run draft for ${agent.name}
curl -X POST http://127.0.0.1:8787/api/jobs \\
  -H 'content-type: application/json' \\
  -d '{
    "parent_agent_id":"cloudcode-main",
    "task_type":"${taskType}",
    "agent_id":"${agent.id}",
    "prompt":"${prompt}"
  }'

# operator notes
readiness: ${health.label}
product_type: ${productKind}
availability: ${health.availability}
verify: ${health.verifyLabel}
review: ${health.reviewLabel}
endpoint: ${health.endpoint || 'missing'}
estimated_total: ${estimate ? `${yen(estimate.estimateMinTotal)} – ${yen(estimate.estimateMaxTotal)}` : '-'}
estimated_time: ${estimate ? formatSecRange(estimate.durationMinSec, estimate.durationMaxSec) : '-'}
handoff: explicit agent_id will be used
create_run_now: ${health.ready && fit.matches ? 'yes' : 'no'}
next_action: ${nextAction}`;
  }

  function setAgentDetail(agent) {
    const action = agentNextAction(agent);
    const onboardingRecord = currentAgentOnboarding(agent?.id);
    const automationReady = canAutomateAgentSetup(agent, onboardingRecord);
    const automationRepo = agentGithubRepo(agent);
    const automationPrepared = adapterAutomationAlreadyPrepared(automationRepo);
    const actionBody = automationReady
      ? `${action.body}\n\nThis setup can be automated on GitHub. Run CHECK and confirm the adapter PR prompt.`
      : (automationPrepared
          ? `${action.body}\n\nA hosted adapter PR was already prepared for this repo. Merge it, deploy, then rerun CHECK.`
          : action.body);
    if (els.agentActionCard) {
      els.agentActionCard.textContent = `${action.title}\n\n${actionBody}`;
      els.agentActionCard.className = `detail-box action-card ${action.tone}`;
    }
    setButtonAccess(els.recheckAgentBtn, Boolean(agent && canCheckAgentOnboarding(agent) && !state.onboardingLoading?.[agent.id]));
    setButtonAccess(els.copyAgentLinkBtn, Boolean(agent));
    setButtonAccess(els.copyAgentPostBtn, Boolean(agent));
    setButtonAccess(els.shareAgentXBtn, Boolean(agent));
    setButtonAccess(els.deleteAgentBtn, Boolean(agent && canDeleteAgent(agent)));
    setButtonAccess(els.saveAgentPricingBtn, Boolean(agent && canEditAgentPricing(agent)));
    if (!agent) {
      safeText(els.agentDetail, 'Select an agent row.');
      if (els.agentPricingMarkup) els.agentPricingMarkup.value = '';
      if (els.agentPricingModel) els.agentPricingModel.value = 'usage_based';
      if (els.agentPricingFixedRunUsd) els.agentPricingFixedRunUsd.value = '';
      if (els.agentPricingMonthlyUsd) els.agentPricingMonthlyUsd.value = '';
      if (els.agentPricingOverageMode) els.agentPricingOverageMode.value = 'included';
      if (els.agentPricingOverageFixedUsd) els.agentPricingOverageFixedUsd.value = '';
      if (els.agentPricingGuide) {
        els.agentPricingGuide.textContent = 'Select your agent to edit pricing.';
        els.agentPricingGuide.className = 'detail-box action-card info compact-card';
      }
      syncAgentPricingEditorVisibility();
      renderAgentOnboarding(null);
      setAgentRunDraft(null);
      return;
    }
    if (!els.agentDetail) {
      renderAgentOnboarding(agent);
      setAgentRunDraft(agent);
      return;
    }
    const health = agentHealth(agent);
    const verification = agentVerification(agent);
    const trust = agentTrustProfile(agent);
    const onboarding = currentAgentOnboarding(agent.id)?.onboarding || null;
    const fit = agentTaskFit(agent);
    const verifyAction = agentVerifyAction(agent);
    const verifyFailure = agentVerifyFailureSummary(agent);
    const relatedJobs = (state.snapshot?.jobs || []).filter((job) => job.assignedAgentId === agent.id);
    const activeJobs = relatedJobs.filter((job) => ['queued', 'claimed', 'running', 'dispatched'].includes(job.status));
    const failedJobs = relatedJobs.filter((job) => ['failed', 'timed_out'].includes(job.status));
    const completedJobs = relatedJobs.filter((job) => job.status === 'completed');
    const providerMarkupRate = providerMarkupRateOf(agent);
    const pricing = agentPricingConfig(agent);
    const productKind = agentProductKind(agent);
    const composition = agentComposition(agent);
    const requirements = agentRequirements(agent);
    const executionProfile = agentExecutionProfile(agent);
    const tags = agentTags(agent);
    const componentLines = composition.components.slice(0, 6).map((component) => {
      const id = component.agentId ? ` [${component.agentId}]` : '';
      const role = component.role ? `: ${component.role}` : '';
      const tasks = component.taskText ? ` (${component.taskText})` : '';
      return `- ${component.name || 'component'}${id}${role}${tasks}`;
    });
    const requirementLines = requirements.slice(0, 6).map((requirement) => {
      const purpose = requirement.purpose ? `: ${requirement.purpose}` : '';
      const fulfillmentLabel = requirementFulfillmentLabel(requirement);
      const fulfillment = fulfillmentLabel ? ` [${fulfillmentLabel}]` : '';
      const flow = requirementFlowSummary(requirement);
      const flowText = flow ? ` · ${flow}` : '';
      return `- ${requirement.label || requirement.type}${requirement.required === false ? ' (optional)' : ''}${fulfillment}${flowText}${purpose}`;
    });
    const lines = [
      `Agent: ${agent.name}`,
      `Product type: ${productKind === 'composite_agent' ? 'Composite Agent Product' : (productKind === 'agent_group' ? 'Agent Group' : 'Single Agent')}`,
      `Status: ${health.label} / ${health.verifyLabel} / ${agent.online ? 'online' : 'offline'}`,
      `Trust: ${trust.label} (${trust.score}/100) · ${trust.level}${trust.executionLayer ? ` · layer ${trust.executionLayer}` : ''}`,
      `Trust basis: ${trust.summary}`,
      ...(trust.sourcePolicy ? [`Trust source gate: ${trust.sourcePolicy}`] : []),
      ...(trust.actionPolicy ? [`Trust action gate: ${trust.actionPolicy}`] : []),
      `Trust QA checks: ${trust.qualityChecks.slice(0, 4).join(' / ') || '-'}`,
      `Trust evidence needs: ${trust.evidenceRequirements.slice(0, 4).join(' / ') || '-'}`,
      `Review: ${health.reviewLabel}`,
      `Tasks: ${(agent.taskTypes || []).join(', ') || '-'}`,
      `Tags: ${tags.length ? tags.join(', ') : '-'}`,
      `Pattern: ${executionProfile.executionPattern || 'async'} · input ${executionProfile.inputTypes.join('/')} · output ${executionProfile.outputTypes.join('/')}`,
      `Clarification: ${executionProfile.clarification} · Scheduled work: ${executionProfile.scheduleSupport ? 'supported' : 'not declared'} · Risk: ${executionProfile.riskLevel}`,
      `Connectors: ${executionProfile.requiredConnectors.length ? executionProfile.requiredConnectors.join(', ') : '-'}`,
      `Confirm before: ${executionProfile.confirmationRequiredFor.length ? executionProfile.confirmationRequiredFor.join(', ') : '-'}`,
      `Pricing model: ${pricing.pricingModel.replace(/_/g, ' ')}`,
      `Provider markup: ${(providerMarkupRate * 100).toFixed(1)}%`,
      ...(pricing.fixedRunPriceUsd > 0 ? [`Fixed run price: ${formatDisplayCurrency(pricing.fixedRunPriceUsd)}`] : []),
      ...(pricing.subscriptionMonthlyPriceUsd > 0 ? [`Provider monthly fee: ${formatDisplayCurrency(pricing.subscriptionMonthlyPriceUsd)} · CAIt keeps ${formatDisplayCurrency(pricing.subscriptionMonthlyPriceUsd * 0.1)}/month from provider billing`] : []),
      ...(pricing.pricingModel === 'hybrid' ? [`Hybrid overage: ${pricing.overageMode === 'fixed_per_run' ? `${formatDisplayCurrency(pricing.overageFixedRunPriceUsd)}/run` : pricing.overageMode.replace(/_/g, ' ')}`] : []),
      'Platform margin: 10.0% of end-user order total',
      `Fit: ${fit.label}`,
      `Endpoint: ${health.endpoint || '-'}`,
      ...(productKind === 'agent'
        ? []
        : [
            `Composition: ${composition.mode || '-'}`,
            `Grouping rule: ${productKind === 'composite_agent'
              ? 'CAIt sends one order to this endpoint; the provider orchestrates internal agents and returns one delivery.'
              : 'Register grouped agents separately; CAIt should ask whether to use them as one flow or separate orders.'}`,
            ...(componentLines.length ? ['Components:', ...componentLines] : ['Components: -'])
          ]),
      ...(requirementLines.length
        ? [
            'Requirements:',
            ...requirementLines,
            `Requirement hub: ${requirementHubSummary(requirements)} and should not ask users to paste secrets in chat.`
          ]
        : []),
      '',
      `Next action: ${action.title.replace('ACTION: ', '')}`,
      `Verify next: ${verifyAction.title}`,
      `Reason: ${verifyFailure.cause}`,
      '',
      `Verify code: ${verification.code || '-'}`,
      `Review reason: ${health.reviewReason}`,
      `Last verify: ${formatTime(agent.verificationCheckedAt)}`,
      `Onboarding: ${onboarding?.status || '-'}`,
      `Onboarding next: ${onboarding?.nextAction?.title || '-'}`,
      '',
      `Runs: active ${activeJobs.length} / failed ${failedJobs.length} / completed ${completedJobs.length}`
    ];
    safeText(els.agentDetail, lines.join('\n'));
    if (els.agentPricingMarkup) els.agentPricingMarkup.value = Number.isFinite(providerMarkupRate) ? String(+providerMarkupRate.toFixed(4)) : '0.1';
    if (els.agentPricingModel) els.agentPricingModel.value = pricing.pricingModel;
    if (els.agentPricingFixedRunUsd) els.agentPricingFixedRunUsd.value = pricing.fixedRunPriceUsd > 0 ? moneyInputValueFromLedger(displayCurrencyToLedgerAmount(pricing.fixedRunPriceUsd)) : '';
    if (els.agentPricingMonthlyUsd) els.agentPricingMonthlyUsd.value = pricing.subscriptionMonthlyPriceUsd > 0 ? moneyInputValueFromLedger(displayCurrencyToLedgerAmount(pricing.subscriptionMonthlyPriceUsd)) : '';
    if (els.agentPricingOverageMode) els.agentPricingOverageMode.value = pricing.overageMode;
    if (els.agentPricingOverageFixedUsd) els.agentPricingOverageFixedUsd.value = pricing.overageFixedRunPriceUsd > 0 ? moneyInputValueFromLedger(displayCurrencyToLedgerAmount(pricing.overageFixedRunPriceUsd)) : '';
    if (els.agentPricingGuide) {
      const editable = canEditAgentPricing(agent);
      els.agentPricingGuide.textContent = editable
        ? agentPricingGuideText(agent)
        : 'Only the agent owner can edit provider pricing.';
      els.agentPricingGuide.className = `detail-box action-card ${editable ? 'info' : 'warn'} compact-card`;
    }
    syncAgentPricingEditorVisibility();
    renderAgentOnboarding(agent);
    setAgentRunDraft(agent);
  }

  async function deleteAgentRecord(agent) {
    if (!agent) throw new Error('Select an agent first.');
    if (!canDeleteAgent(agent)) throw new Error('Only the agent owner can delete this agent.');
    const confirmed = window.confirm(`Delete ${agent.name}? Historical runs stay, but this agent will be removed from the registry.`);
    if (!confirmed) return { cancelled: true };
    const deletedId = agent.id;
    const res = await api(`/api/agents/${deletedId}`, { method: 'DELETE' });
    if (els.jobAgentId?.value === deletedId) els.jobAgentId.value = '';
    if (els.claimAgentId?.value === deletedId) els.claimAgentId.value = '';
    delete state.agentOnboarding[deletedId];
    if (state.selectedAgentId === deletedId) state.selectedAgentId = null;
    if (state.agentSetupCompletedId === deletedId) state.agentSetupCompletedId = null;
    state.showAgentList = true;
    renderOrderComposer();
    flash(`Deleted ${res.agent?.name || agent.name}. Historical runs were kept.`, 'ok');
    await refresh();
    return res;
  }

  async function saveAgentPricing(agent) {
    if (!agent) throw new Error('Select an agent first.');
    if (!canEditAgentPricing(agent)) throw new Error('Only the agent owner can edit pricing.');
    const providerMarkupRate = Number(els.agentPricingMarkup?.value || 0.1);
    const pricingModel = normalizeClientPricingModel(els.agentPricingModel?.value || 'usage_based');
    const fixedRunPriceUsd = Number(els.agentPricingFixedRunUsd?.value || 0);
    const subscriptionMonthlyPriceUsd = Number(els.agentPricingMonthlyUsd?.value || 0);
    const overageMode = normalizeClientOverageMode(els.agentPricingOverageMode?.value || '', pricingModel === 'hybrid' ? 'usage_based' : 'included');
    const overageFixedRunPriceUsd = Number(els.agentPricingOverageFixedUsd?.value || 0);
    if (!Number.isFinite(providerMarkupRate) || providerMarkupRate < 0 || providerMarkupRate > 1) {
      throw new Error('Provider markup must be a number between 0 and 1, for example 0.10 for 10%.');
    }
    if (pricingModel === 'fixed_per_run' && (!Number.isFinite(fixedRunPriceUsd) || fixedRunPriceUsd <= 0)) {
      throw new Error('Fixed per run needs a positive USD run price.');
    }
    if ((pricingModel === 'subscription_required' || pricingModel === 'hybrid') && (!Number.isFinite(subscriptionMonthlyPriceUsd) || subscriptionMonthlyPriceUsd <= 0)) {
      throw new Error('Subscription pricing needs a positive monthly USD price.');
    }
    if (pricingModel === 'hybrid' && overageMode === 'fixed_per_run' && (!Number.isFinite(overageFixedRunPriceUsd) || overageFixedRunPriceUsd <= 0)) {
      throw new Error('Hybrid fixed overage needs a positive USD run price.');
    }
    const res = await api(`/api/agents/${agent.id}/pricing`, {
      method: 'PATCH',
      body: JSON.stringify({
        provider_markup_rate: providerMarkupRate,
        token_markup_rate: providerMarkupRate,
        pricing_model: pricingModel,
        fixed_run_price_usd: fixedRunPriceUsd,
        subscription_monthly_price_usd: subscriptionMonthlyPriceUsd,
        overage_mode: overageMode,
        overage_fixed_run_price_usd: overageFixedRunPriceUsd
      })
    });
    flash(`Saved pricing for ${res.agent?.name || agent.name}.`, 'ok');
    await refresh();
    state.selectedAgentId = res.agent?.id || agent.id;
    renderAgents(state.snapshot?.agents || []);
    return res;
  }

  return {
    selectedAgent,
    setAgentDetail,
    deleteAgentRecord,
    saveAgentPricing
  };
}
