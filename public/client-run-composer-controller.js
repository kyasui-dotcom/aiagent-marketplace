export function createClientRunComposerController(deps = {}) {
  const {
    state,
    els,
    productName = 'CAIt',
    productShortName = 'CAIt',
    workChatInternalStatusVisible = false,
    inAppPaymentsRemoved = false,
    agentHealth,
    agentTaskFit,
    agentVerifyAction,
    canOrderFromBrowser,
    chatAnswerKind,
    currentEffectiveOrderPrompt,
    currentRoutingTask,
    currentRunTargetAgent,
    currentVisibleOrderPrompt,
    escapeHtml,
    estimateWindowOfAgent,
    formatDisplayCurrency,
    formatPercent,
    formatSecRange,
    formatWorkUiText,
    isOpenChatClarifyMode,
    isOpenChatDispatchReadyPrompt,
    isStructuredOrderBrief,
    lastOpenChatPreparedBrief,
    looksLikeAgentSkillMarkdown,
    openChatLooksPreorderIntentLlmCandidate,
    openChatMustUseLlmFallback,
    orderInputCounts,
    orderInputFromComposer,
    orderRoutingDecision,
    orderStrategyLabel,
    quickOrderChatAnswer,
    readyAgentsForTask,
    renderFlexibleToolPanel,
    renderFollowupContextCard,
    renderIntakePanel,
    renderOpenChatChoiceBar,
    renderOpenChatModeControls,
    renderOpenChatSessionControls,
    renderOrderAgentPicker,
    renderOrderInputFilesSummary,
    renderOrderInputGuide,
    renderOrderSettingsDrawer,
    renderOrderStrategyControls,
    renderParallelOrderQueue,
    renderParallelTools,
    renderWorkChatEntryCard,
    renderWorkChatThread,
    setElementVisible,
    workOrderUiLabels,
    yen
  } = deps;

  function updateWorkChatStatusCard(title = 'Write the request first.', body = '', tone = 'info') {
    if (!els?.workChatStatusCard || !els?.workChatStatusText) return;
    if (!workChatInternalStatusVisible) {
      setElementVisible?.(els.workChatStatusCard, false);
      return;
    }
    const safeTone = ['ok', 'warn', 'error', 'info'].includes(String(tone || '')) ? String(tone) : 'info';
    const safeTitle = formatWorkUiText?.(String(title || '').trim()) || 'Write the request first.';
    const safeBody = formatWorkUiText?.(String(body || '').trim()) || 'CAIt will answer quick questions or prepare an order brief.';
    els.workChatStatusCard.className = `work-chat-status-card ${safeTone}`;
    els.workChatStatusText.innerHTML = `<strong>${escapeHtml?.(safeTitle) || safeTitle}</strong><span>${escapeHtml?.(safeBody) || safeBody}</span>`;
  }

  function neutralUnsentComposerStatus(buttonText = '') {
    const labels = workOrderUiLabels?.() || {};
    const action = String(buttonText || labels.sendChat || '').trim().toUpperCase();
    if (action === String(labels.sendOrder || '').toUpperCase()) {
      return {
        title: 'Message not sent yet.',
        body: `Review the prepared text, then press ${labels.sendOrder} when you want paid dispatch.`,
        tone: 'info'
      };
    }
    if (action === String(labels.prepareOrder || '').toUpperCase()) {
      return {
        title: 'Message not sent yet.',
        body: `Press ${labels.prepareOrder} to turn this into a draft order. After that, the button changes to ${labels.sendOrder}.`,
        tone: 'info'
      };
    }
    if (action === String(labels.answerFirst || '').toUpperCase()) {
      return {
        title: 'Message not sent yet.',
        body: `Press ${labels.answerFirst} when ready. No chat response appears before you send.`,
        tone: 'info'
      };
    }
    return {
      title: 'Message not sent yet.',
      body: `Press ${labels.sendChat || 'SEND CHAT'} when ready. No chat response appears before you send.`,
      tone: 'info'
    };
  }

  function renderRunCreateStatus(snapshot = state?.snapshot || {}) {
    if (!els?.runCreateStatus) return;
    const auth = snapshot?.auth || {};
    const pinnedAgent = currentRunTargetAgent?.();
    const taskType = currentRoutingTask?.() || 'research';
    const visiblePrompt = currentVisibleOrderPrompt?.() || '';
    const prompt = currentEffectiveOrderPrompt?.() || '';
    const sourceCounts = orderInputCounts?.(orderInputFromComposer?.()) || {};
    const hasRequest = Boolean(prompt || sourceCounts.urlCount || sourceCounts.fileCount);
    const readyMatches = readyAgentsForTask?.(taskType) || [];
    const routingDecision = orderRoutingDecision?.(taskType, prompt) || {};
    const strategy = routingDecision.strategy;
    const planned = routingDecision.plan || { picks: [], plannedTasks: [] };
    const billingProfile = state?.stripeStatus?.billingProfile || snapshot?.monthlySummary?.customer || {};
    const account = snapshot?.accountSettings || {};
    const accountStripe = state?.stripeStatus?.stripe?.accountStripe || account?.stripe || {};
    const configuredBillingMode = String(account?.billing?.mode || billingProfile?.configuredMode || '').trim().toLowerCase();
    const savedCard = Boolean(accountStripe.defaultPaymentMethodId) || String(accountStripe.defaultPaymentMethodStatus || '') === 'ready';
    const monthlyBillingSelected = configuredBillingMode === 'monthly_invoice';
    const monthlyBillingReady = monthlyBillingSelected && savedCard;
    const nonCardCreditsReady = Number(billingProfile.welcomeCreditsAvailable || 0) > 0 || Number(billingProfile.subscriptionCreditsAvailable || 0) > 0;
    const adminBillingBypass = Boolean(auth?.isPlatformAdmin);
    const billingReady = inAppPaymentsRemoved || adminBillingBypass || monthlyBillingReady || nonCardCreditsReady;
    const dispatchReady = Boolean(isOpenChatDispatchReadyPrompt?.(prompt));
    const skillDraft = Boolean(looksLikeAgentSkillMarkdown?.(prompt));
    const quickAnswer = skillDraft || dispatchReady ? null : quickOrderChatAnswer?.(prompt, sourceCounts);
    const mustUseLlmFallback = !dispatchReady && Boolean(openChatMustUseLlmFallback?.(prompt, quickAnswer));
    const llmFallbackCandidate = Boolean(prompt && !skillDraft && !dispatchReady && openChatLooksPreorderIntentLlmCandidate?.(prompt, sourceCounts, quickAnswer));
    const uiLabels = workOrderUiLabels?.() || {};
    let title = 'Ready to start.';
    let body = `Write the request in natural language. ${productShortName} prepares the order summary first, then shows ${uiLabels.sendOrder}.`;
    let tone = 'ok';
    let buttonText = uiLabels.sendChat;

    if (skillDraft) {
      title = 'Agent Skill detected.';
      body = `${uiLabels.sendChat} will convert SKILL.md into a ${productName} manifest draft, open AGENTS, and let you review before import. Listing can proceed, but CAIt no longer processes payments, billing, donations, or payouts. A Stripe Payment Link for external donation support is only a future option after review.`;
      tone = 'ok';
      buttonText = uiLabels.sendChat;
    } else if (llmFallbackCandidate && mustUseLlmFallback) {
      title = 'Intent check first.';
      body = `${uiLabels.sendChat} will ask ChatGPT to clarify this before CAIt uses the local answer. If the check is unavailable, CAIt will stop and ask for one more sentence instead of guessing.`;
      tone = 'warn';
      buttonText = uiLabels.sendChat;
    } else if (quickAnswer) {
      const quickKind = chatAnswerKind?.(quickAnswer);
      if (quickKind === 'command') {
        title = 'CAIt Chat control.';
        body = `${uiLabels.sendChat} will run this chat command without creating an order or billing. Use it to reset chat, restore a prepared brief, or jump to the right setup area.`;
        tone = quickAnswer.tone || 'info';
        buttonText = uiLabels.sendChat;
      } else if (quickKind === 'assist') {
        title = 'Order-prep chat.';
        body = `${uiLabels.sendChat} will prepare or update the order draft. When it is ready, the next step is ${uiLabels.sendOrder}.`;
        tone = 'ok';
        buttonText = uiLabels.sendChat;
      } else if (quickKind === 'clarify') {
        title = quickAnswer.vagueChoicePrompt ? 'Choose research or scope first.' : 'Clarification needed.';
        body = quickAnswer.vagueChoicePrompt
          ? `${uiLabels.sendChat} will ask whether to spend tokens on broad research or narrow the request first.`
          : `${uiLabels.sendChat} will ask one short question and show likely paths. Reply with a number or short phrase before ${productShortName} opens a flow.`;
        tone = 'warn';
        buttonText = uiLabels.sendChat;
      } else {
        title = 'Quick question.';
        body = `This looks like a product or FAQ question. ${uiLabels.sendChat} will answer in chat without billing. To create paid work, describe the delivery you want.`;
        tone = 'info';
        buttonText = uiLabels.sendChat;
      }
    } else if (llmFallbackCandidate) {
      title = 'Intent check first.';
      body = `${uiLabels.sendChat} will ask ChatGPT to clarify this before CAIt prepares any order brief. If the check is unavailable, CAIt will stop and ask for one more sentence instead of guessing.`;
      tone = 'warn';
      buttonText = uiLabels.sendChat;
    } else if (!hasRequest) {
      const lastStatus = String(state?.openChatLastStatus || '').trim();
      if (lastStatus) {
        const statusParts = lastStatus.split(/\n\n+/);
        title = statusParts.shift() || 'Answered in chat.';
        body = statusParts.join('\n\n') || 'No order was created and no billing occurred.';
        tone = state?.openChatLastStatusTone || 'info';
      } else {
        title = 'Write the request first.';
        body = `Ask a quick product question, describe the result you want, or open settings to add source URLs/files. ${productShortName} handles task inference and routing.`;
        tone = 'info';
      }
    } else if (state?.pendingIntake && !state?.intakeConfirmed) {
      title = 'Answer clarification questions first.';
      body = `${productShortName} detected missing order details. Answer the questions below before billing or dispatch.`;
      tone = 'warn';
      buttonText = uiLabels.answerFirst;
    } else if (isOpenChatClarifyMode?.()) {
      title = dispatchReady ? 'Order draft ready.' : 'Prepare the order.';
      body = `${uiLabels.prepareOrder} turns this into a reviewable order summary. After preparation, CAIt switches to ORDER and shows ${uiLabels.sendOrder}.`;
      tone = 'info';
      buttonText = uiLabels.prepareOrder;
    } else if (!dispatchReady) {
      title = 'Prepare order first.';
      body = `${uiLabels.prepareOrder} turns this request into an order summary. Review it, then press ${uiLabels.sendOrder} to run it.`;
      tone = 'info';
      buttonText = uiLabels.prepareOrder;
    } else if (!canOrderFromBrowser?.(auth)) {
      title = 'Login required to send order.';
      body = `The CAIt Chat brief is ready. Sign in when you want to dispatch agent work, then press ${uiLabels.sendOrder}. CAIt no longer requires in-app payment setup.`;
      tone = 'warn';
      buttonText = uiLabels.sendOrder;
    } else if (state?.pendingIntake && state?.intakeConfirmed) {
      title = 'Clarified order ready.';
      body = `Your answers are attached. ${uiLabels.sendOrder} will skip the intake check and dispatch normally.`;
      tone = 'ok';
      buttonText = uiLabels.sendOrder;
    } else if (!prompt && (sourceCounts.urlCount || sourceCounts.fileCount)) {
      title = 'Source-driven order ready.';
      body = `Using ${sourceCounts.urlCount} URL(s) and ${sourceCounts.fileCount} file(s). Add a prompt if you want explicit instructions.`;
      tone = 'ok';
    } else if (!billingReady) {
      title = 'Support is donation-only.';
      body = `CAIt no longer requires card registration before ${uiLabels.sendOrder}. External donation support is only a future option after recipient, purpose, compliance, and gift or donation agreement review.`;
      tone = 'warn';
      buttonText = uiLabels.sendOrder;
    } else if (strategy === 'multi' && pinnedAgent) {
      title = 'Clear pinned agent first.';
      body = `Multi-agent objective routing picks several agents automatically. Clear the pin before pressing ${uiLabels.sendOrder}.`;
      tone = 'warn';
      buttonText = uiLabels.sendOrder;
    } else if (strategy === 'multi' && planned.picks.length < 2) {
      title = 'Need more ready agents.';
      body = `Multi-agent objective planning found ${planned.picks.length} ready agent${planned.picks.length === 1 ? '' : 's'}. Register or verify more agents for tasks: ${planned.plannedTasks.join(', ')}.`;
      tone = 'warn';
      buttonText = uiLabels.sendOrder;
    } else if (strategy === 'multi') {
      title = 'Multi-agent objective ready.';
      body = `${orderStrategyLabel?.()} selected. ${routingDecision.reason} This order will create ${planned.picks.length} Agent Team runs across ${planned.picks.map((item) => `${item.taskType}:${item.agent.name}`).join(' / ')}.`;
      tone = 'ok';
      buttonText = uiLabels.sendOrder;
    } else if (pinnedAgent && !agentHealth?.(pinnedAgent).ready) {
      title = 'Pinned agent is not ready.';
      body = 'Clear the pin or finish onboarding before sending the order.';
      tone = 'warn';
      buttonText = uiLabels.sendOrder;
    } else if (!pinnedAgent && !readyMatches.length) {
      title = 'No ready agent for this task.';
      body = 'Open AGENTS to register a ready agent. Provider money actions stay locked until SETTINGS > PAYMENTS, PROVIDER IDENTITY, and CAIt manual settlement review are complete.';
      tone = 'warn';
      buttonText = uiLabels.sendOrder;
    } else {
      title = 'Ready to send order.';
      body = adminBillingBypass
        ? `Admin test billing is active for this account. ${uiLabels.sendOrder} will run without consuming credits or monthly billing.`
        : 'The prepared brief will be dispatched as a paid order. Max reserve and delivery expectations are shown in ORDER SETTINGS.';
      tone = 'ok';
      buttonText = uiLabels.sendOrder;
    }

    if (state?.orderComposerDirtySinceSend && visiblePrompt) {
      const neutral = neutralUnsentComposerStatus(buttonText);
      title = neutral.title;
      body = neutral.body;
      tone = neutral.tone;
    }

    const statusText = formatWorkUiText?.(`${title}\n\n${body}`) || `${title}\n\n${body}`;
    els.runCreateStatus.textContent = statusText;
    els.runCreateStatus.className = `detail-box action-card ${tone} compact-card`;
    if (!workChatInternalStatusVisible) setElementVisible?.(els.runCreateStatus, false);
    updateWorkChatStatusCard(title, body, tone);
    if (els.createJobBtn) els.createJobBtn.textContent = buttonText;
  }

  function syncCreateJobButtonForCurrentPrompt() {
    if (!els?.createJobBtn) return;
    els.createJobBtn.textContent = createJobButtonTextForCurrentInput();
  }

  function createJobButtonTextForCurrentInput() {
    const uiLabels = workOrderUiLabels?.() || {};
    const input = orderInputFromComposer?.();
    const counts = orderInputCounts?.(input) || {};
    const prompt = currentEffectiveOrderPrompt?.() || '';
    if (!prompt && !counts.urlCount && !counts.fileCount && isStructuredOrderBrief?.(lastOpenChatPreparedBrief?.())) return uiLabels.sendOrder;
    if (!prompt && !counts.urlCount && !counts.fileCount) return uiLabels.sendChat;
    if (state?.pendingIntake && !state?.intakeConfirmed) return uiLabels.answerFirst;
    if (looksLikeAgentSkillMarkdown?.(prompt)) return uiLabels.sendChat;
    if (isOpenChatDispatchReadyPrompt?.(prompt)) return uiLabels.sendOrder;
    if (quickOrderChatAnswer?.(prompt, counts)) return uiLabels.sendChat;
    if (openChatLooksPreorderIntentLlmCandidate?.(prompt, counts, null)) return uiLabels.sendChat;
    if (isOpenChatClarifyMode?.()) return uiLabels.prepareOrder;
    return uiLabels.prepareOrder;
  }

  function renderRunAgentContext() {
    if (!els?.agentRunContext) return;
    const routingDecision = orderRoutingDecision?.(currentRoutingTask?.(), currentEffectiveOrderPrompt?.()) || {};
    if (routingDecision.strategy === 'multi') {
      const planned = routingDecision.plan || { picks: [], plannedTasks: [] };
      els.agentRunContext.textContent = planned.picks.length
        ? `Auto routing: Agent Team\nReason: ${routingDecision.reason}\nTasks: ${planned.plannedTasks.join(', ')}\nAgents: ${planned.picks.map((item) => `${item.taskType}:${item.agent.name}`).join(' / ')}`
        : 'Multi-agent plan\nNeed at least 2 ready agents to build the plan.';
      els.agentRunContext.className = `detail-box action-card ${planned.picks.length >= 2 ? 'ok' : 'warn'} compact-card`;
      return;
    }
    const enteredAgentId = String(els.jobAgentId?.value || '').trim();
    const agent = currentRunTargetAgent?.();
    if (!enteredAgentId) {
      const taskType = currentRoutingTask?.();
      els.agentRunContext.textContent = taskType
        ? `Auto routing: single-agent\nReason: ${routingDecision.reason}\nTask fit: ${taskType}`
        : `Target agent: auto\nWrite the request first and ${productShortName} will infer the task.`;
      els.agentRunContext.className = 'detail-box action-card info compact-card';
      return;
    }
    if (!agent) {
      els.agentRunContext.textContent = [
        `Pinned agent: ${enteredAgentId}`,
        'This id is not in the current agent list.',
        'Clear the pin to return to auto-routing.'
      ].join('\n');
      els.agentRunContext.className = 'detail-box action-card warn compact-card';
      return;
    }
    const health = agentHealth?.(agent) || {};
    const fit = agentTaskFit?.(agent) || {};
    const verifyAction = agentVerifyAction?.(agent) || {};
    const selected = deps.selectedAgent?.();
    const source = selected?.id === agent.id ? 'selected agent row' : 'manual agent_id entry';
    const createNow = health.ready && fit.matches;
    els.agentRunContext.textContent = [
      `Target agent: ${agent.name}`,
      `Status: ${health.label} / ${fit.label}`,
      `Chosen from: ${source}`,
      `Next: ${createNow ? 'Ready to create.' : verifyAction.title}`
    ].join('\n');
    els.agentRunContext.className = `detail-box action-card ${createNow ? 'ok' : (fit.matches ? health.tone : 'warn')} compact-card`;
  }

  function renderRunEstimateCard() {
    if (!els?.runEstimateCard) return;
    const taskType = currentRoutingTask?.() || 'research';
    const prompt = currentEffectiveOrderPrompt?.() || '';
    const sourceCounts = orderInputCounts?.(orderInputFromComposer?.()) || {};
    if (!prompt && !sourceCounts.urlCount && !sourceCounts.fileCount) {
      els.runEstimateCard.textContent = 'Estimate appears after you write the request.\nMaximum reserve, delivery format, and actual settlement appear before order creation.';
      els.runEstimateCard.className = 'detail-box action-card info compact-card';
      return;
    }
    const routingDecision = orderRoutingDecision?.(taskType, prompt) || {};
    if (routingDecision.strategy === 'multi') {
      const planned = routingDecision.plan || { picks: [], plannedTasks: [] };
      if (planned.picks.length < 2) {
        els.runEstimateCard.textContent = `Agent Team plan: ${planned.plannedTasks.join(', ') || taskType}\nNeed at least 2 ready agents to estimate an Agent Team order.\nNo billing is reserved until a valid order can be created.`;
        els.runEstimateCard.className = 'detail-box action-card warn compact-card';
        return;
      }
      const total = planned.picks.reduce((acc, item) => {
        const estimate = estimateWindowOfAgent?.(item.agent, item.taskType, { prompt });
        acc.min += Number(estimate?.estimateMinTotal || 0);
        acc.max += Number(estimate?.estimateMaxTotal || 0);
        acc.durationMin += Number(estimate?.durationMinSec || 0);
        acc.durationMax += Number(estimate?.durationMaxSec || 0);
        return acc;
      }, { min: 0, max: 0, durationMin: 0, durationMax: 0 });
      els.runEstimateCard.textContent = [
        `Agent Team plan: ${planned.picks.map((item) => `${item.taskType}:${item.agent.name}`).join(' / ')}`,
        `Estimate: ${yen?.(total.min)} – ${yen?.(total.max)}`,
        `Estimated time: ${formatSecRange?.(total.durationMin, total.durationMax)}`,
        `Max reserve before dispatch: ${yen?.(total.max)}`,
        'Completed orders settle on actual usage. Failed or cancelled orders release unused reserve.'
      ].join('\n');
      els.runEstimateCard.className = 'detail-box action-card ok compact-card';
      return;
    }
    const agent = currentRunTargetAgent?.()
      || (state?.snapshot?.agents || []).find((item) => agentHealth?.(item).ready && agentTaskFit?.(item, taskType).matches)
      || null;
    if (!agent) {
      els.runEstimateCard.textContent = `Task: ${taskType}\nNo ready agent matches yet.\nRegister or finish onboarding first.\nFinal billing uses actual usage after completion.`;
      els.runEstimateCard.className = 'detail-box action-card warn compact-card';
      return;
    }
    const estimate = estimateWindowOfAgent?.(agent, taskType, { prompt, input: orderInputFromComposer?.() }) || {};
    const why = [
      `${agent.name}`,
      `task=${taskType}`,
      `success=${formatPercent?.(agent.successRate)}`
    ].join(' · ');
    els.runEstimateCard.textContent = [
      `Estimated end-user cost: ${yen?.(estimate.estimateMinTotal)} – ${yen?.(estimate.estimateMaxTotal)}`,
      `Estimated time: ${formatSecRange?.(estimate.durationMinSec, estimate.durationMaxSec)}`,
      `Based on ${why}`,
      `Max end-user reserve before dispatch: ${yen?.(estimate.estimateMaxTotal)}`,
      estimate.listCreatorPlan ? `List size: ${estimate.listCreatorPlan.requestedCount} companies · ${estimate.listCreatorPlan.batchCount} batch${estimate.listCreatorPlan.batchCount === 1 ? '' : 'es'} · public contact only` : null,
      estimate.providerMonthlyUsd > 0 ? `Provider monthly fee: ${formatDisplayCurrency?.(estimate.providerMonthlyUsd)} · CAIt bills 10% of that monthly fee to the provider, not the end user.` : null,
      estimate.pricingNote || null,
      'Completed orders settle on actual usage. Failed or cancelled orders release unused reserve.'
    ].filter(Boolean).join('\n');
    els.runEstimateCard.className = 'detail-box action-card ok compact-card';
  }

  function renderOrderComposer() {
    renderOpenChatModeControls?.();
    renderOpenChatSessionControls?.();
    renderWorkChatEntryCard?.(state?.snapshot?.auth || {});
    renderOrderStrategyControls?.();
    renderOrderInputFilesSummary?.();
    renderOrderInputGuide?.();
    renderFlexibleToolPanel?.();
    renderOpenChatChoiceBar?.();
    renderIntakePanel?.();
    renderFollowupContextCard?.();
    renderOrderAgentPicker?.();
    renderRunAgentContext();
    renderRunEstimateCard();
    renderRunCreateStatus();
    renderParallelOrderQueue?.();
    renderOrderSettingsDrawer?.();
    renderParallelTools?.();
    setElementVisible?.(els?.clearRunAgentBtn, Boolean(els?.jobAgentId?.value));
    renderWorkChatThread?.();
    syncCreateJobButtonForCurrentPrompt();
  }

  return {
    createJobButtonTextForCurrentInput,
    renderOrderComposer,
    renderRunAgentContext,
    renderRunCreateStatus,
    renderRunEstimateCard,
    syncCreateJobButtonForCurrentPrompt,
    updateWorkChatStatusCard
  };
}
