export function createClientOrderDraftController(deps = {}) {
  const {
    state,
    els,
    window,
    productShortName = 'CAIt',
    orderInputTotalFileChars = 0,
    orderInputMaxFiles = 0,
    orderInputMaxFileBytes = 0,
    orderInputMaxFileChars = 0,
    inAppPaymentsRemoved = false,
    temporaryInvoiceBillingEnabled = false,
    agentHealth,
    agentTaskFit,
    appendOrderChatExchange,
    canOrderFromBrowser,
    chatEngineBuildIntakeCombinedPrompt,
    chatEngineBuildIntakeState,
    clientOrderPreflight,
    connectorActionLabel,
    currentEffectiveOrderPrompt,
    currentRunTargetAgent,
    currentRoutingTask,
    currentServerPreparedOrderForPrompt,
    estimateWindowOfAgent,
    fallbackPromptFromOrderInput,
    flash,
    formatBytes,
    formatDisplayCurrency,
    inferTextMimeFromName,
    isOrderInputFileSupported,
    isStructuredOrderBrief,
    ledgerAmountToDisplayCurrency,
    normalizeClientConnector,
    normalizeOrderInputFile,
    normalizeOrderInputUrls,
    openChatCanonicalOrderTaskType,
    openSettingsSection,
    orderInputCounts,
    orderRoutingDecision,
    orderStrategyLabel,
    primarySignInUrl,
    readyAgentsForTask,
    renderOrderComposer,
    requestedOrderStrategy,
    rewriteStructuredBriefTaskType,
    setElementVisible,
    summarizeOrderDraftForAnalytics,
    trackConversionEvent,
    trackLoginStarted
  } = deps;

  function makeParallelDraftId() {
    return `draft_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function orderInputFromComposer() {
    const parsedUrls = normalizeOrderInputUrls?.(els?.jobUrls?.value || '') || { urls: [] };
    const files = Array.isArray(state?.orderInputFiles)
      ? state.orderInputFiles.map((file) => normalizeOrderInputFile?.(file)).filter((file) => file?.content)
      : [];
    let totalChars = 0;
    const clippedFiles = [];
    for (const file of files) {
      if (totalChars >= orderInputTotalFileChars) break;
      let content = String(file.content || '');
      let truncated = Boolean(file.truncated);
      if (totalChars + content.length > orderInputTotalFileChars) {
        const available = Math.max(0, orderInputTotalFileChars - totalChars);
        if (!available) break;
        content = `${content.slice(0, available)}\n\n[truncated]`;
        truncated = true;
      }
      totalChars += content.length;
      clippedFiles.push({
        name: file.name,
        type: file.type,
        size: file.size,
        content,
        truncated
      });
    }
    const input = {};
    if (parsedUrls.urls?.length) input.urls = parsedUrls.urls;
    if (clippedFiles.length) input.files = clippedFiles;
    return Object.keys(input).length ? input : null;
  }

  function renderOrderInputFilesSummary() {
    if (!els?.jobFilesSummary) return;
    const parsedUrls = normalizeOrderInputUrls?.(els?.jobUrls?.value || '') || { urls: [], omitted: 0 };
    const files = Array.isArray(state?.orderInputFiles)
      ? state.orderInputFiles.map((file) => normalizeOrderInputFile?.(file)).filter((file) => file?.content)
      : [];
    const warnings = Array.isArray(state?.orderInputFileWarnings) ? state.orderInputFileWarnings : [];
    const lines = [
      `URLs: ${parsedUrls.urls.length}${parsedUrls.omitted ? ` (${parsedUrls.omitted} ignored)` : ''}`,
      `Files: ${files.length}`
    ];
    if (files.length) {
      const listed = files.slice(0, 3).map((file) => `- ${file.name} (${formatBytes?.(file.size) || file.size}${file.truncated ? ', truncated' : ''})`);
      lines.push('', ...listed);
      if (files.length > 3) lines.push(`...and ${files.length - 3} more file(s)`);
    }
    if (warnings.length) {
      lines.push('', `Notes: ${warnings.slice(0, 2).join(' | ')}`);
    }
    els.jobFilesSummary.textContent = lines.join('\n');
    const tone = warnings.length || parsedUrls.omitted ? 'warn' : (files.length || parsedUrls.urls.length ? 'ok' : 'info');
    els.jobFilesSummary.className = `detail-box action-card ${tone} compact-card`;
  }

  async function handleOrderFilesChanged() {
    if (!els?.jobFiles) return;
    const selected = Array.from(els.jobFiles.files || []);
    const warnings = [];
    const files = [];
    if (selected.length > orderInputMaxFiles) {
      warnings.push(`Only the first ${orderInputMaxFiles} files were used.`);
    }
    let totalChars = 0;
    for (const file of selected.slice(0, orderInputMaxFiles)) {
      if (!isOrderInputFileSupported?.(file)) {
        warnings.push(`Skipped unsupported file type: ${file.name}`);
        continue;
      }
      if (Number(file.size || 0) > orderInputMaxFileBytes) {
        warnings.push(`Skipped ${file.name}: larger than ${formatBytes?.(orderInputMaxFileBytes) || orderInputMaxFileBytes}.`);
        continue;
      }
      let content = String(await file.text()).replace(/\u0000/g, '').trim();
      if (!content) {
        warnings.push(`Skipped ${file.name}: empty file.`);
        continue;
      }
      let truncated = false;
      if (content.length > orderInputMaxFileChars) {
        content = `${content.slice(0, orderInputMaxFileChars)}\n\n[truncated]`;
        truncated = true;
      }
      if (totalChars >= orderInputTotalFileChars) {
        warnings.push(`Total file text limit reached (${orderInputTotalFileChars} chars).`);
        break;
      }
      if (totalChars + content.length > orderInputTotalFileChars) {
        const available = orderInputTotalFileChars - totalChars;
        if (available <= 0) {
          warnings.push(`Total file text limit reached (${orderInputTotalFileChars} chars).`);
          break;
        }
        content = `${content.slice(0, available)}\n\n[truncated]`;
        truncated = true;
        warnings.push(`Trimmed ${file.name} to stay within total file text limit.`);
      }
      totalChars += content.length;
      files.push({
        name: String(file.name || 'source.txt'),
        type: String(file.type || inferTextMimeFromName?.(file.name) || ''),
        size: Number(file.size || 0),
        content,
        truncated
      });
    }
    state.orderInputFiles = files;
    state.orderInputFileWarnings = warnings;
    renderOrderComposer?.();
  }

  function currentOrderDraft() {
    let input = orderInputFromComposer();
    const requestedStrategy = requestedOrderStrategy?.() || 'auto';
    const effectivePrompt = currentEffectiveOrderPrompt?.() || '';
    const preparedSeed = currentServerPreparedOrderForPrompt?.(effectivePrompt);
    const taskType = openChatCanonicalOrderTaskType?.(preparedSeed?.taskType || currentRoutingTask?.(), effectivePrompt)
      || preparedSeed?.taskType
      || currentRoutingTask?.()
      || 'research';
    const safePrompt = isStructuredOrderBrief?.(effectivePrompt)
      ? rewriteStructuredBriefTaskType?.(effectivePrompt, taskType)
      : effectivePrompt;
    const selectedAgentId = String(els?.jobAgentId?.value || '').trim();
    const selectedAgent = selectedAgentId
      ? (state?.snapshot?.agents || []).find((agent) => agent.id === selectedAgentId) || null
      : null;
    const safeAgentId = selectedAgent && agentTaskFit?.(selectedAgent, taskType).matches ? selectedAgentId : '';
    const routingDecision = preparedSeed
      ? {
        strategy: preparedSeed.resolvedOrderStrategy || orderRoutingDecision?.(taskType, safePrompt, requestedStrategy).strategy,
        requested: preparedSeed.requestedOrderStrategy || requestedStrategy,
        plan: orderRoutingDecision?.(taskType, safePrompt, requestedStrategy).plan,
        routeHint: preparedSeed.routeHint || '',
        reason: preparedSeed.reason || ''
      }
      : orderRoutingDecision?.(taskType, safePrompt, requestedStrategy);
    const intakeAnswer = String(els?.intakeAnswer?.value || state?.intakeAnswer || '').trim();
    if (state?.intakeConfirmed && state?.pendingIntake) {
      input = {
        ...(input || {}),
        _broker: {
          ...((input && input._broker) || {}),
          intake: {
            ...state.pendingIntake,
            answer: intakeAnswer,
            answered: true
          }
        }
      };
    }
    return {
      id: makeParallelDraftId(),
      parent_agent_id: els?.jobParent?.value || 'cloudcode-main',
      order_strategy: requestedStrategy,
      resolved_order_strategy: routingDecision?.strategy,
      route_plan: routingDecision?.plan,
      task_type: taskType,
      agent_id: safeAgentId,
      prompt: safePrompt,
      budget_cap: Number(els?.jobBudget?.value || 300),
      deadline_sec: Number(els?.jobDeadline?.value || 120),
      followup_to_job_id: state?.followupToJobId || undefined,
      confirmation: state?.pendingOrderConfirmation?.accepted ? {
        accepted: true,
        agent_id: state.pendingOrderConfirmation.agentId || undefined,
        accepted_at: state.pendingOrderConfirmation.acceptedAt || new Date().toISOString()
      } : undefined,
      input: input || undefined
    };
  }

  function clearFollowupContext(options = {}) {
    state.followupToJobId = '';
    state.followupSourceTaskType = '';
    state.followupSourceAgentId = '';
    if (!options.keepAnswer && els?.followupAnswer) els.followupAnswer.value = '';
    renderOrderComposer?.();
  }

  function clearIntakeContext(options = {}) {
    state.pendingIntake = null;
    state.intakeConfirmed = false;
    state.intakeAnswer = '';
    if (!options.keepAnswer && els?.intakeAnswer) els.intakeAnswer.value = '';
    renderOrderComposer?.();
  }

  function renderIntakePanel() {
    if (!els?.intakePanel || !els?.intakeQuestionCard) return;
    const intake = state.pendingIntake;
    if (!intake) {
      setElementVisible?.(els.intakePanel, false);
      return;
    }
    const questions = Array.isArray(intake.questions) ? intake.questions : [];
    const lines = [
      state.intakeConfirmed ? 'Clarification answers are applied.' : `${productShortName} needs a few details before billing or dispatch.`,
      '',
      `Original request: ${intake.originalPrompt || '-'}`,
      '',
      ...questions.map((question, index) => `${index + 1}. ${question}`),
      '',
      state.intakeConfirmed
        ? 'Clarification context is attached. SEND ORDER will use the answered details.'
        : 'Answer these, then APPLY ANSWERS. CAIt will not dispatch until the missing details are supplied.'
    ];
    els.intakeQuestionCard.textContent = lines.join('\n');
    els.intakePanel.className = `detail-box action-card ${state.intakeConfirmed ? 'ok' : 'warn'} compact-card`;
    setElementVisible?.(els.intakePanel, true);
  }

  function handleNeedsInputResponse(response = {}, draft = {}) {
    state.pendingIntake = chatEngineBuildIntakeState?.(response, draft.prompt || response.prompt || '', {
      taskType: response.inferred_task_type || draft.task_type || 'research'
    });
    state.intakeConfirmed = false;
    state.intakeAnswer = '';
    if (els?.intakeAnswer) els.intakeAnswer.value = '';
    if (els?.runCreateStatus) {
      els.runCreateStatus.textContent = [
        'More information needed.',
        '',
        response.message || 'Answer the clarification questions before this order is billed or dispatched.'
      ].join('\n');
      els.runCreateStatus.className = 'detail-box action-card warn compact-card';
    }
    renderOrderComposer?.();
    window?.requestAnimationFrame?.(() => els?.intakeAnswer?.focus());
    flash?.('Clarification questions returned. No order was billed or dispatched.', 'info');
  }

  function applyIntakeAnswers() {
    if (!state.pendingIntake) throw new Error('No clarification questions are active.');
    const answer = String(els?.intakeAnswer?.value || '').trim();
    if (!answer) throw new Error('Answer the clarification questions first.');
    state.intakeAnswer = answer;
    state.intakeConfirmed = true;
    const original = String(state.pendingIntake.originalPrompt || els?.jobPrompt?.value || '').trim();
    if (els?.jobPrompt) {
      els.jobPrompt.value = chatEngineBuildIntakeCombinedPrompt?.(
        { ...state.pendingIntake, originalPrompt: original },
        answer
      );
    }
    renderOrderComposer?.();
    flash?.('Answers applied. SEND ORDER will run the clarified order.', 'ok');
  }

  function followupSourceJob() {
    if (!state.followupToJobId) return null;
    return state.snapshot?.jobs?.find((job) => job.id === state.followupToJobId) || null;
  }

  function renderFollowupContextCard() {
    if (!els?.followupContextCard) return;
    const job = followupSourceJob();
    if (!state.followupToJobId) {
      setElementVisible?.(els.followupContextCard, false);
      return;
    }
    const taskType = state.followupSourceTaskType || job?.taskType || 'auto';
    const agentId = state.followupSourceAgentId || job?.assignedAgentId || 'auto-route';
    els.followupContextCard.textContent = [
      `Following up on order: ${state.followupToJobId.slice(0, 8)}`,
      `Previous task: ${taskType}`,
      `Target agent: ${agentId}`,
      'The next order will include the previous prompt, delivery summary, and clarifying questions.'
    ].join('\n');
    els.followupContextCard.className = 'detail-box action-card info compact-card';
    setElementVisible?.(els.followupContextCard, true);
  }

  function queuedDraftAgent(draft) {
    if (!draft?.agent_id) return null;
    return (state?.snapshot?.agents || []).find((agent) => agent.id === draft.agent_id) || null;
  }

  function resolvedOrderStrategyOfDraft(draft = {}) {
    if (draft.resolved_order_strategy === 'single' || draft.resolved_order_strategy === 'multi') return draft.resolved_order_strategy;
    if (draft.order_strategy === 'single' || draft.order_strategy === 'multi') return draft.order_strategy;
    return orderRoutingDecision?.(draft.task_type, draft.prompt, draft.order_strategy || 'auto').strategy;
  }

  function routePlanOfDraft(draft = {}) {
    if (draft.route_plan) return draft.route_plan;
    return orderRoutingDecision?.(draft.task_type, draft.prompt, draft.order_strategy || 'auto').plan;
  }

  function estimateWindowOfDraft(draft) {
    if (!draft) return null;
    if (resolvedOrderStrategyOfDraft(draft) === 'multi') {
      const planned = routePlanOfDraft(draft);
      if (planned.picks.length < 2) return null;
      return planned.picks.reduce((acc, item) => {
        const estimate = estimateWindowOfAgent?.(item.agent, item.taskType, { prompt: draft.prompt, input: draft.input });
        acc.min += Number(estimate?.estimateMinTotal || 0);
        acc.max += Number(estimate?.estimateMaxTotal || 0);
        return acc;
      }, { min: 0, max: 0 });
    }
    const agent = queuedDraftAgent(draft) || readyAgentsForTask?.(draft.task_type)[0] || null;
    const estimate = estimateWindowOfAgent?.(agent, draft.task_type, { prompt: draft.prompt, input: draft.input });
    if (!estimate) return null;
    return { min: Number(estimate.estimateMinTotal || 0), max: Number(estimate.estimateMaxTotal || 0) };
  }

  function clearOrderComposerPrompt() {
    if (els?.jobPrompt) els.jobPrompt.value = '';
    if (els?.jobUrls) els.jobUrls.value = '';
    if (els?.jobFiles) els.jobFiles.value = '';
    state.orderInputFiles = [];
    state.orderInputFileWarnings = [];
    state.followupToJobId = '';
    state.followupSourceTaskType = '';
    state.followupSourceAgentId = '';
    state.pendingIntake = null;
    state.intakeConfirmed = false;
    state.intakeAnswer = '';
    state.pendingOrderConfirmation = null;
    state.openChatPreparedBrief = '';
    state.openChatParallelPlan = [];
    state.openChatClarifyOptions = [];
    state.openChatVagueChoicePrompt = '';
    state.openChatNaturalChoiceIntent = '';
    state.openChatIntentShiftPrompt = '';
    state.openChatIdeaBacklogPrompt = '';
    state.openChatLeaderChoicePrompt = '';
    state.openChatLeaderChoiceCandidates = [];
    state.openChatLeaderIntakePrompt = '';
    state.openChatLeaderIntakeTask = '';
    state.openChatPendingQuestionPrompt = '';
    state.openChatPendingQuestionTask = '';
    state.openChatPendingQuestionPattern = '';
    state.serverResolvedIntent = null;
    state.serverPreparedOrder = null;
    if (els?.intakeAnswer) els.intakeAnswer.value = '';
    if (els?.jobType) els.jobType.value = '';
    renderOrderComposer?.();
  }

  function ensureOrderFunding() {
    if (inAppPaymentsRemoved) return;
    if (state.snapshot?.auth?.isPlatformAdmin) return;
    const billingProfile = state.stripeStatus?.billingProfile || state.snapshot?.monthlySummary?.customer || {};
    const accountStripe = state.stripeStatus?.stripe?.accountStripe || state.snapshot?.accountSettings?.stripe || {};
    const monthlyBillingReady = String(billingProfile.mode || '').toLowerCase() === 'monthly_invoice'
      && (Boolean(accountStripe.defaultPaymentMethodId) || String(accountStripe.defaultPaymentMethodStatus || '') === 'ready');
    const hasFunding = Number(billingProfile.fundingAvailable || 0) > 0
      || Number(billingProfile.welcomeCreditsAvailable || 0) > 0
      || Number(billingProfile.subscriptionCreditsAvailable || 0) > 0
      || monthlyBillingReady;
    if (!hasFunding) {
      openSettingsSection?.('payments');
      throw new Error(temporaryInvoiceBillingEnabled
        ? 'Payment required. Open PAYMENTS and use REQUEST INVOICE before ordering.'
        : 'Payment required. Open PAYMENTS and register a card before ordering.');
    }
  }

  function orderFundingErrorInfo(error) {
    const data = error?.data || {};
    const code = String(data?.code || '').trim().toLowerCase();
    const message = String(error?.message || '').trim();
    const billingProfile = state.stripeStatus?.billingProfile || state.snapshot?.monthlySummary?.customer || {};
    const account = state.snapshot?.accountSettings || {};
    const accountStripe = state.stripeStatus?.stripe?.accountStripe || account?.stripe || {};
    const paymentLike = Number(error?.status || 0) === 402
      || ['payment_required', 'payment_method_missing'].includes(code)
      || /payment|required|deposit|funding|balance/i.test(message);
    if (!paymentLike) return null;
    const registerCardRequired = true;
    const missingLedger = Number(data?.missing_amount ?? data?.missingAmount ?? 0);
    const estimatedLedger = Number(data?.estimated_cost?.total ?? data?.estimatedCost?.total ?? 0);
    const requiredLedger = missingLedger > 0 ? missingLedger : estimatedLedger;
    const missingUsd = Math.max(0, ledgerAmountToDisplayCurrency?.(requiredLedger) || 0);
    return {
      code,
      message,
      action: registerCardRequired ? 'register_card' : 'funding',
      missingUsd,
      suggestedUsd: 0,
      estimatedBilling: data?.estimated_cost || null
    };
  }

  function handleOrderFundingPrompt(error, draft = {}, options = {}) {
    const info = orderFundingErrorInfo(error);
    if (!info) return false;
    const prompt = draft.prompt || fallbackPromptFromOrderInput?.(draft.input || null) || 'Order request';
    if (info.action === 'register_card') {
      appendOrderChatExchange?.(prompt, {
        kind: 'clarify',
        tone: 'warn',
        body: [
          'In-app payments are removed, so CAIt no longer asks for card registration before sending orders.',
          '',
          'Send the order again. External donation support is only a future option after compliance review.',
          info.missingUsd > 0 ? `Order estimate: ${formatDisplayCurrency?.(info.missingUsd) || info.missingUsd}` : ''
        ].filter(Boolean).join('\n'),
        actions: [
          { action: 'open_payments', label: 'SUPPORT / DONATION' }
        ],
        status: 'In-app payment requirement removed.'
      }, { tone: 'warn', nextPrompt: prompt });
      openSettingsSection?.('payments');
      flash?.('In-app payments are removed. Send the order again without card setup.', 'warn');
      void trackConversionEvent?.('payment_required_shown', {
        ...(options.analytics || summarizeOrderDraftForAnalytics?.(draft, options.source || 'work_chat')),
        status: 'register_card_required',
        missingUsd: info.missingUsd
      });
      return true;
    }
    return undefined;
  }

  function preflightFromError(error = null) {
    if (error?.preflight) return error.preflight;
    const data = error?.data && typeof error.data === 'object' ? error.data : {};
    if (data.code === 'agent_unavailable') {
      return {
        ok: false,
        code: 'agent_unavailable',
        error: data.error || 'No ready agent is available for this task.'
      };
    }
    if (data.needs_confirmation || data.code === 'confirmation_required') {
      return {
        ok: false,
        code: 'confirmation_required',
        agent: data.agent_id ? { id: data.agent_id, name: data.agent_name || data.agent_id } : null,
        riskLevel: data.risk_level || 'confirm_required',
        confirmationRequiredFor: Array.isArray(data.confirmation_required_for) ? data.confirmation_required_for : [],
        error: data.error || 'Explicit confirmation is required before this agent can run.'
      };
    }
    if (data.needs_connector || data.code === 'connector_required') {
      return {
        ok: false,
        code: 'connector_required',
        agent: data.agent_id ? { id: data.agent_id, name: data.agent_name || data.agent_id } : null,
        missingConnectors: Array.isArray(data.missing_connectors) ? data.missing_connectors : [],
        missingConnectorCapabilities: Array.isArray(data.missing_connector_capabilities) ? data.missing_connector_capabilities : [],
        connectorStatus: data.connector_status || {},
        error: data.error || 'Connector setup is required before this agent can run.'
      };
    }
    return null;
  }

  function connectorActionForChat(connector = '') {
    const normalized = normalizeClientConnector?.(connector) || '';
    if (normalized === 'github') return { action: 'connect_github', label: connectorActionLabel?.('connect_github'), connector: normalized };
    if (normalized === 'google') return { action: 'connect_google', label: connectorActionLabel?.('connect_google'), connector: normalized };
    if (normalized === 'x') return { action: 'connect_x', label: connectorActionLabel?.('connect_x'), connector: normalized };
    if (normalized === 'stripe') return { action: 'open_payments', label: 'SUPPORT / DONATION', connector: normalized };
    return { action: 'open_settings', label: 'OPEN SETTINGS', connector: normalized };
  }

  function handleOrderPreflightPrompt(error, draft = {}, options = {}) {
    const preflight = preflightFromError(error);
    if (!preflight || preflight.ok) return false;
    const prompt = draft.prompt || fallbackPromptFromOrderInput?.(draft.input) || 'order preflight';
    if (preflight.code === 'confirmation_required') {
      const agentName = preflight.agent?.name || 'the selected agent';
      const required = Array.isArray(preflight.confirmationRequiredFor) && preflight.confirmationRequiredFor.length
        ? preflight.confirmationRequiredFor.join(', ')
        : (preflight.riskLevel || 'confirm_required');
      appendOrderChatExchange?.(prompt, {
        kind: 'clarify',
        tone: 'warn',
        body: [
          `${agentName} needs explicit confirmation before dispatch.`,
          '',
          `Reason: ${required}`,
          '',
          'No order was created and no billing occurred.',
          '',
          'If this is intentional, press Send order. Otherwise edit the request or choose another agent.'
        ].join('\n'),
        actions: [
          { action: 'confirm_order', label: 'Send order', agentId: preflight.agent?.id || draft.agent_id || '' }
        ],
        status: 'Confirmation required before dispatch.\n\nNo order was created and no billing occurred.'
      }, { tone: 'warn', nextPrompt: prompt });
      void trackConversionEvent?.('order_confirmation_required', {
        ...(options.analytics || summarizeOrderDraftForAnalytics?.(draft, 'order_preflight')),
        agentId: preflight.agent?.id || draft.agent_id || '',
        status: 'confirmation_required'
      });
      return true;
    }
    if (preflight.code === 'connector_required') {
      const missing = Array.isArray(preflight.missingConnectors) ? preflight.missingConnectors : [];
      const capabilities = Array.isArray(preflight.missingConnectorCapabilities) ? preflight.missingConnectorCapabilities : [];
      appendOrderChatExchange?.(prompt, {
        kind: 'clarify',
        tone: 'warn',
        body: [
          `${preflight.agent?.name || 'The selected agent'} needs connector setup before it can run.`,
          '',
          `Missing: ${missing.length ? missing.join(', ') : 'connector access'}`,
          ...(capabilities.length ? ['', `Required authority: ${capabilities.join(', ')}`] : []),
          '',
          'No order was created and no billing occurred.',
          '',
          'Connect the required account, then SEND again.'
        ].join('\n'),
        actions: missing.slice(0, 3).map(connectorActionForChat),
        status: 'Connector setup required before dispatch.\n\nNo order was created and no billing occurred.'
      }, { tone: 'warn', nextPrompt: prompt });
      void trackConversionEvent?.('order_connector_required', {
        ...(options.analytics || summarizeOrderDraftForAnalytics?.(draft, 'order_preflight')),
        agentId: preflight.agent?.id || draft.agent_id || '',
        status: 'connector_required'
      });
      return true;
    }
    if (preflight.code === 'agent_unavailable') {
      appendOrderChatExchange?.(prompt, {
        kind: 'clarify',
        tone: 'warn',
        body: [
          'No ready agent is available for this order yet.',
          '',
          preflight.error || 'Finish onboarding a compatible agent or adjust the request.',
          '',
          'No order was created and no billing occurred.'
        ].join('\n'),
        status: 'No ready agent available before dispatch.\n\nNo order was created and no billing occurred.'
      }, { tone: 'warn', nextPrompt: prompt });
      void trackConversionEvent?.('order_agent_unavailable', {
        ...(options.analytics || summarizeOrderDraftForAnalytics?.(draft, 'order_preflight')),
        status: 'agent_unavailable'
      });
      return true;
    }
    return false;
  }

  function validateOrderDraft(draft, options = {}) {
    const { checkAccess = false, checkFunding = checkAccess } = options;
    const auth = state.snapshot?.auth || {};
    if (checkAccess && !canOrderFromBrowser?.(auth)) {
      flash?.('Sign-in required. Redirecting...', 'info');
      void trackConversionEvent?.('sign_in_required_shown', summarizeOrderDraftForAnalytics?.(draft, 'order_validation'));
      const signInUrl = primarySignInUrl?.(auth) || '/login';
      trackLoginStarted?.(signInUrl.includes('/auth/google') ? 'google' : 'github');
      window.location.href = signInUrl;
      throw new Error('Sign-in required.');
    }
    const inputCounts = orderInputCounts?.(draft?.input || null) || {};
    if (!String(draft?.prompt || '').trim() && !inputCounts.urlCount && !inputCounts.fileCount) {
      throw new Error('Write a request or add source URLs/files first.');
    }
    if (state.pendingIntake && !state.intakeConfirmed) {
      throw new Error('Answer the clarification questions first.');
    }
    if (checkFunding) ensureOrderFunding();
    const resolvedStrategy = resolvedOrderStrategyOfDraft(draft);
    const plan = routePlanOfDraft(draft);
    if (resolvedStrategy === 'multi' && draft.agent_id) {
      throw new Error('Clear the pinned agent before sending an Agent Team objective.');
    }
    if (resolvedStrategy === 'multi' && plan.picks.length < 2) {
      throw new Error('Need at least 2 ready agents before sending an Agent Team objective.');
    }
    const pinnedAgent = queuedDraftAgent(draft);
    if (resolvedStrategy !== 'multi' && pinnedAgent && !agentHealth?.(pinnedAgent).ready) {
      throw new Error('Pinned agent is not ready. Clear the pin or finish onboarding first.');
    }
    if (resolvedStrategy !== 'multi' && !draft.agent_id && !readyAgentsForTask?.(draft.task_type).length) {
      throw new Error('No ready agent for this task. Open AGENTS and finish onboarding or register a ready agent first.');
    }
    const preflight = clientOrderPreflight?.(draft);
    if (!preflight.ok) {
      const error = new Error(preflight.error || 'Order preflight blocked dispatch.');
      error.preflight = preflight;
      throw error;
    }
  }

  function renderOrderInputGuide() {
    if (!els?.orderInputGuide) return;
    const prompt = String(els.jobPrompt?.value || '').trim();
    const inputCounts = orderInputCounts?.(orderInputFromComposer()) || {};
    const inferredTask = currentRoutingTask?.() || 'research';
    const pinnedAgent = currentRunTargetAgent?.();
    if (!prompt && !inputCounts.urlCount && !inputCounts.fileCount) {
      els.orderInputGuide.textContent = [
        `${productShortName} will infer the task and route it.`,
        'Write the outcome you want, choose a template, or open settings to attach source URLs/files.',
        'Built-in orders do not require your own model-provider API key.'
      ].join('\n');
      els.orderInputGuide.className = 'detail-box action-card info compact-card';
      return;
    }
    const routingDecision = orderRoutingDecision?.(inferredTask, prompt) || {};
    const routeText = routingDecision.strategy === 'multi'
      ? `${orderStrategyLabel?.()} · ${routingDecision.reason}`
      : (pinnedAgent ? `pinned agent: ${pinnedAgent.name}` : 'auto route');
    els.orderInputGuide.textContent = [
      `Task: ${inferredTask}`,
      `Route: ${routeText}`,
      `Sources: urls=${inputCounts.urlCount} files=${inputCounts.fileCount}`,
      'Use settings only if source material or routing looks wrong.'
    ].join('\n');
    els.orderInputGuide.className = 'detail-box action-card ok compact-card';
  }

  return {
    applyIntakeAnswers,
    clearFollowupContext,
    clearIntakeContext,
    clearOrderComposerPrompt,
    connectorActionForChat,
    currentOrderDraft,
    estimateWindowOfDraft,
    handleNeedsInputResponse,
    handleOrderFilesChanged,
    handleOrderFundingPrompt,
    handleOrderPreflightPrompt,
    makeParallelDraftId,
    orderInputFromComposer,
    preflightFromError,
    queuedDraftAgent,
    renderFollowupContextCard,
    renderIntakePanel,
    renderOrderInputFilesSummary,
    renderOrderInputGuide,
    resolvedOrderStrategyOfDraft,
    routePlanOfDraft,
    validateOrderDraft
  };
}
