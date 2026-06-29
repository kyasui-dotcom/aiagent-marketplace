export function createClientJobCreateController(deps = {}) {
  const {
    state,
    els,
    productShortName = 'CAIt',
    openChatDispatchInFlightTtlMs = 45000,
    api,
    apiPayloadFromOrderDraftWithChatSession,
    appendOpenChatOrderProgressMessage,
    appendOrderChatExchange,
    applyServerPreparedOrder,
    applyServerResolvedIntent,
    buildOpenChatClarifyModeAnswer,
    buildOpenChatCommandAnswer,
    buildOpenChatConfirmedDispatchDraft,
    buildOpenChatImplicitOrderPrepAnswer,
    buildOpenChatLlmFallbackUnavailableAnswer,
    buildOpenChatPreLlmGuardAnswer,
    cancelOrderComposerRender,
    chatAnswerKind,
    chatEngineIsNeedsInputResponse,
    clearOpenChatPendingDispatchMessage,
    clearOrderComposerPrompt,
    clearPinnedAgentIfMismatchedBrief,
    clearPinnedAgentIfMismatchedTask,
    clientOrderIdFromOrderCreate,
    compactChatText,
    createdOrderPrimaryId,
    currentOrderDraft,
    currentRoutingTask,
    currentVisibleOrderPrompt,
    dispatchOpenChatConfirmedChoice,
    fallbackPromptFromOrderInput,
    flash,
    focusWorkResults,
    handleAgentSkillMarkdownFromChat,
    handleNeedsInputResponse,
    handleOrderFundingPrompt,
    handleOrderPreflightPrompt,
    ensureCurrentOpenChatSessionId,
    isNonOrderConversationIntentText,
    isOpenChatClarifyMode,
    isOpenChatDispatchReadyPrompt,
    isOpenChatExplicitDispatchRequest,
    isStructuredOrderBrief,
    lastOpenChatPreparedBrief,
    looksJapanese,
    looksLikeAgentSkillMarkdown,
    makeClientOrderId,
    markCurrentOpenChatSessionLinkedOrder,
    markOpenChatDecisionSuppressedForBrief,
    normalizeOrderProgressStatus,
    openChatCanDirectDispatchAssistAnswer,
    openChatCanonicalOrderTaskType,
    openChatDecisionOriginalPrompt,
    openChatHasActiveLocalFollowupState,
    openChatLlmFallbackReason,
    openChatMustUseLlmFallback,
    openChatPreorderDecisionCommand,
    openChatPreserveSeedTaskType,
    openChatShouldPreferOpenAiReasoning,
    openSettingsSection,
    orderAcceptanceProgressBody,
    orderAcceptanceProgressMeta,
    orderCreateRequestBody,
    orderInputCounts,
    orderInputFromComposer,
    orderProgressMessageFromCreated,
    orderProgressMessageLabel,
    orderProgressMeta,
    orderProgressTone,
    prepareWorkOrderViaApi,
    persistCurrentOpenChatSession,
    quickOrderChatAnswer,
    recoverAcceptedOrderAfterCreateError,
    refresh,
    renderOrderComposer,
    requestOpenChatPreorderIntentResolution,
    requestedOrderStrategy,
    resolveOpenChatServerLeaderIntake,
    resolveWorkIntentViaApi,
    revealCreatedOrderInHistory,
    rewriteStructuredBriefTaskType,
    setDetail,
    shouldPrepareOrderBeforeDispatch,
    startOpenChatAcceptanceProgress,
    startOpenChatOrderProgressPolling,
    structuredOrderBriefParts,
    summarizeOrderDraftForAnalytics,
    switchTab,
    syncCreateJobButtonForCurrentPrompt,
    trackChatTranscript,
    trackConversionEvent,
    trackOpenChatSubmitTranscript,
    updateWorkChatStatusCard,
    upsertOpenChatOrderProgressMessage,
    upsertOpenChatPendingDispatchMessage,
    validateOrderDraft,
    visitorId,
    withOpenChatResponseSource,
    window
  } = deps;

  async function runOpenChatHubCommand(command = '') {
    const prompt = String(command || '').trim();
    if (!prompt || !els.jobPrompt) return;
    els.jobPrompt.value = prompt;
    renderOrderComposer();
    await createAndOptionallyRunJob();
  }
  
  function acceptPreparedOpenChatOrderForDispatch(preparedBrief = '') {
    const prepared = String(preparedBrief || lastOpenChatPreparedBrief() || '').trim();
    if (!isStructuredOrderBrief(prepared)) return null;
    const structuredTask = String(structuredOrderBriefParts(prepared).taskType || '').trim();
    const taskType = openChatPreserveSeedTaskType(prepared, structuredTask);
    const prompt = structuredTask ? prepared : rewriteStructuredBriefTaskType(prepared, taskType);
    state.openChatPreparedBrief = prompt;
    markOpenChatDecisionSuppressedForBrief(prompt);
    clearPinnedAgentIfMismatchedBrief(prompt);
    state.pendingOrderConfirmation = {
      accepted: true,
      agentId: '',
      acceptedAt: new Date().toISOString()
    };
    if (els.jobPrompt) els.jobPrompt.value = '';
    return { prompt, taskType };
  }
  
  async function handleCreateJobButtonClick() {
    const inputCounts = orderInputCounts(orderInputFromComposer());
    const visiblePrompt = currentVisibleOrderPrompt();
    const prepared = lastOpenChatPreparedBrief();
    if (!visiblePrompt && !inputCounts.urlCount && !inputCounts.fileCount && isStructuredOrderBrief(prepared)) {
      await dispatchOpenChatConfirmedChoice();
      return;
    }
    await createAndOptionallyRunJob();
  }
  
  async function createAndOptionallyRunJob() {
    cancelOrderComposerRender();
    state.orderComposerDirtySinceSend = false;
    const resumePrompt = String(els.jobPrompt?.value || '').trim();
    if (state.openChatPausedByTabLeave && !resumePrompt) {
      const pausedBody = 'CAIt Chat is paused after leaving the chat view.\n\nType "continue" to resume this draft, or send a new request.';
      state.openChatLastStatus = pausedBody;
      state.openChatLastStatusTone = 'info';
      updateWorkChatStatusCard('CAIt Chat paused.', 'Type "continue" to resume this draft, or send a new request.', 'info');
      flash('CAIt Chat is paused. Type "continue" or send a new request.', 'info');
      persistCurrentOpenChatSession();
      syncCreateJobButtonForCurrentPrompt();
      return;
    }
    if (state.openChatPausedByTabLeave && resumePrompt) {
      state.openChatPausedByTabLeave = false;
    }
    let draft = currentOrderDraft();
    const inputCounts = orderInputCounts(draft.input || null);
    const preparedBriefForChoice = lastOpenChatPreparedBrief();
    if (!String(draft.prompt || '').trim() && !inputCounts.urlCount && !inputCounts.fileCount) {
      const accepted = acceptPreparedOpenChatOrderForDispatch(preparedBriefForChoice);
      if (accepted) {
        draft = {
          ...draft,
          prompt: accepted.prompt,
          task_type: accepted.taskType,
          agent_id: ''
        };
      } else {
        flash('Write a request first.', 'info');
        updateWorkChatStatusCard(
          'Write the request first.',
          `${productShortName} can chat, prepare an order, or dispatch work after a draft is ready.`,
          'info'
        );
        syncCreateJobButtonForCurrentPrompt();
        return;
      }
    }
    const analyticsDraft = summarizeOrderDraftForAnalytics(draft, 'work_chat');
    const originalChatPrompt = String(draft.prompt || '').trim();
    const explicitDispatchRequested = isOpenChatExplicitDispatchRequest(originalChatPrompt);
    void trackConversionEvent('chat_message_sent', analyticsDraft);
    const submittedTranscriptId = trackOpenChatSubmitTranscript(draft, analyticsDraft);
    if (looksLikeAgentSkillMarkdown(draft.prompt)) {
      await handleAgentSkillMarkdownFromChat(draft.prompt, { transcriptId: submittedTranscriptId });
      return;
    }
    let structuredDispatchPrompt = isOpenChatDispatchReadyPrompt(draft.prompt);
    const preorderDecisionCommand = structuredDispatchPrompt ? '' : openChatPreorderDecisionCommand(originalChatPrompt);
    if (!structuredDispatchPrompt && preorderDecisionCommand === 'confirm_preorder_order') {
      const confirmed = buildOpenChatConfirmedDispatchDraft(openChatDecisionOriginalPrompt() || originalChatPrompt, inputCounts);
      draft = {
        ...draft,
        prompt: confirmed.prompt,
        task_type: confirmed.taskType,
        agent_id: ''
      };
      state.openChatPreparedBrief = confirmed.prompt;
      markOpenChatDecisionSuppressedForBrief(confirmed.prompt);
      state.pendingOrderConfirmation = {
        accepted: true,
        agentId: '',
        acceptedAt: new Date().toISOString()
      };
      if (els.jobPrompt) els.jobPrompt.value = '';
      structuredDispatchPrompt = true;
    }
    if (!structuredDispatchPrompt && !isNonOrderConversationIntentText(originalChatPrompt) && !openChatHasActiveLocalFollowupState(originalChatPrompt)) {
      const resolvedIntent = await resolveWorkIntentViaApi(originalChatPrompt);
      if (resolvedIntent?.kind === 'order') {
        applyServerResolvedIntent(resolvedIntent, originalChatPrompt);
        const preparedOrder = await prepareWorkOrderViaApi(originalChatPrompt, requestedOrderStrategy());
        if (preparedOrder?.ok === false && preparedOrder.status === 'intent_failed') {
          appendOrderChatExchange(originalChatPrompt, {
            kind: 'clarify',
            tone: 'warn',
            body: [
              'I could not classify this request with OpenAI, so I did not create an order draft.',
              '',
              `Reason: ${preparedOrder.error || 'OpenAI intent classification failed.'}`,
              '',
              'Please try again in a moment, or add the target URL/product, desired outcome, and constraints.'
            ].join('\n'),
            status: 'OpenAI intent classification failed. No order was created.'
          }, { transcriptId: submittedTranscriptId, tone: 'warn' });
          void trackConversionEvent('open_chat_intent_failed', { ...analyticsDraft, status: preparedOrder.code || 'openai_intent_failed', source: preparedOrder.source || 'openai' });
          return;
        }
        if (chatEngineIsNeedsInputResponse(preparedOrder)) {
          handleNeedsInputResponse(preparedOrder, {
            ...draft,
            prompt: originalChatPrompt,
            task_type: preparedOrder.inferred_task_type || preparedOrder.taskType || draft.task_type
          });
          appendOrderChatExchange(originalChatPrompt, {
            kind: 'clarify',
            tone: 'warn',
            body: [
              preparedOrder.message || 'I need a few more details before preparing or dispatching this order.',
              '',
              ...(Array.isArray(preparedOrder.questions) ? preparedOrder.questions.map((question, index) => `${index + 1}. ${question}`) : []),
              '',
              'Nothing has run and nothing has been billed yet.'
            ].filter(Boolean).join('\n'),
            status: 'More information is required before SEND ORDER.'
          }, { transcriptId: submittedTranscriptId, tone: 'warn' });
          void trackConversionEvent('intake_questions_shown', { ...analyticsDraft, status: 'prepare_needs_input' });
          return;
        }
        applyServerPreparedOrder(preparedOrder, originalChatPrompt);
        draft = currentOrderDraft();
      } else if (resolvedIntent?.kind === 'command' || resolvedIntent?.kind === 'chat') {
        applyServerResolvedIntent(null);
        applyServerPreparedOrder(null);
      }
      if (resolvedIntent?.kind === 'command' && resolvedIntent.action) {
        const resolvedCommandAnswer = buildOpenChatCommandAnswer(originalChatPrompt);
        if (resolvedCommandAnswer) {
          appendOrderChatExchange(draft.prompt, resolvedCommandAnswer, { transcriptId: submittedTranscriptId });
          const resolvedKind = chatAnswerKind(resolvedCommandAnswer);
          flash(
            resolvedKind === 'command'
              ? 'CAIt Chat command ran. No order was created.'
              : 'Answered in chat. No order was created.',
            resolvedKind === 'command' ? 'ok' : 'info'
          );
          void trackConversionEvent('chat_answered', { ...analyticsDraft, status: resolvedKind || 'command', source: 'server_intent_resolution' });
          return;
        }
      }
    }
    let quickAnswer = structuredDispatchPrompt
      ? null
      : await resolveOpenChatServerLeaderIntake(draft.prompt, inputCounts, draft);
    if (!quickAnswer && !structuredDispatchPrompt) {
      quickAnswer = buildOpenChatPreLlmGuardAnswer(draft.prompt, inputCounts);
    }
    const skipOpenAiPolish = quickAnswer?.skipOpenAiPolish === true;
    const openAiBriefPolishCandidate = !structuredDispatchPrompt
      && !skipOpenAiPolish
      && quickAnswer
      && chatAnswerKind(quickAnswer) === 'assist'
      && isStructuredOrderBrief(quickAnswer.nextPrompt || lastOpenChatPreparedBrief());
    const openAiReasoningCandidate = !structuredDispatchPrompt
      && !skipOpenAiPolish
      && !quickAnswer
      && openChatShouldPreferOpenAiReasoning(draft.prompt, inputCounts);
    const preferOpenAiReasoning = !structuredDispatchPrompt
      && !skipOpenAiPolish
      && (openAiBriefPolishCandidate || openAiReasoningCandidate);
    let llmFallbackReason = preferOpenAiReasoning
      ? (openAiBriefPolishCandidate ? 'openai_order_brief_polish' : 'default_openai_reasoning')
      : (structuredDispatchPrompt ? '' : openChatLlmFallbackReason(draft.prompt, inputCounts, quickAnswer));
    let mustUseLlmFallback = !structuredDispatchPrompt && openChatMustUseLlmFallback(draft.prompt, quickAnswer);
    if (llmFallbackReason) {
      void trackConversionEvent('open_chat_llm_fallback_recommended', {
        ...analyticsDraft,
        status: String(llmFallbackReason).slice(0, 60),
        patternId: String(quickAnswer?.patternId || '').slice(0, 80),
        answerKind: chatAnswerKind(quickAnswer) || ''
      });
    }
    const llmTelemetry = {};
    const preorderIntentLlmAnswer = structuredDispatchPrompt
      ? null
      : await requestOpenChatPreorderIntentResolution(draft.prompt, inputCounts, quickAnswer, {
        force: preferOpenAiReasoning,
        telemetry: llmTelemetry,
        preparedBrief: quickAnswer?.nextPrompt || lastOpenChatPreparedBrief() || ''
      });
    if (preorderIntentLlmAnswer) quickAnswer = preorderIntentLlmAnswer;
    if (!quickAnswer && preferOpenAiReasoning) {
      quickAnswer = quickOrderChatAnswer(draft.prompt, inputCounts);
      if (quickAnswer) {
        quickAnswer = withOpenChatResponseSource(
          quickAnswer,
          'openai_unavailable_local',
          llmTelemetry.error || llmFallbackReason || 'default_openai_reasoning'
        );
      } else {
        quickAnswer = buildOpenChatLlmFallbackUnavailableAnswer(draft.prompt, llmTelemetry.error || llmFallbackReason || 'default_openai_reasoning');
      }
    }
    if (!quickAnswer && !structuredDispatchPrompt) {
      quickAnswer = quickOrderChatAnswer(draft.prompt, inputCounts);
      llmFallbackReason = openChatLlmFallbackReason(draft.prompt, inputCounts, quickAnswer);
      mustUseLlmFallback = openChatMustUseLlmFallback(draft.prompt, quickAnswer);
    }
    if (!structuredDispatchPrompt && (!quickAnswer || mustUseLlmFallback) && llmFallbackReason && !preorderIntentLlmAnswer) {
      if (quickAnswer && llmTelemetry.attempted && llmTelemetry.error) {
        quickAnswer = withOpenChatResponseSource(quickAnswer, 'openai_unavailable_local', llmTelemetry.error || llmFallbackReason);
        mustUseLlmFallback = false;
      } else {
        quickAnswer = buildOpenChatLlmFallbackUnavailableAnswer(draft.prompt, llmFallbackReason);
      }
    }
    const directDispatchBrief = explicitDispatchRequested && openChatCanDirectDispatchAssistAnswer(originalChatPrompt, quickAnswer)
      ? String(quickAnswer.nextPrompt || lastOpenChatPreparedBrief() || '').trim()
      : '';
    if (directDispatchBrief && isStructuredOrderBrief(directDispatchBrief)) {
      const directParts = structuredOrderBriefParts(directDispatchBrief);
      const directTaskType = openChatCanonicalOrderTaskType(directParts.taskType, directDispatchBrief) || directParts.taskType || draft.task_type || currentRoutingTask() || 'research';
      const finalDirectDispatchBrief = rewriteStructuredBriefTaskType(directDispatchBrief, directTaskType);
      state.openChatPreparedBrief = finalDirectDispatchBrief;
      markOpenChatDecisionSuppressedForBrief(finalDirectDispatchBrief);
      clearPinnedAgentIfMismatchedTask(directTaskType);
      if (els.jobPrompt) els.jobPrompt.value = '';
      draft = {
        ...draft,
        prompt: finalDirectDispatchBrief,
        task_type: directTaskType,
        agent_id: ''
      };
      structuredDispatchPrompt = true;
      quickAnswer = null;
      void trackConversionEvent('chat_direct_order_requested', {
        ...analyticsDraft,
        status: quickAnswer?.patternId || 'explicit_dispatch',
        taskType: draft.task_type
      });
    }
    if (quickAnswer) {
      appendOrderChatExchange(draft.prompt, quickAnswer, { transcriptId: submittedTranscriptId });
      const quickKind = chatAnswerKind(quickAnswer);
      flash(
        quickKind === 'assist'
          ? 'Order draft ready. Review it, then press SEND ORDER.'
          : (quickKind === 'command' ? 'CAIt Chat command ran. No order was created.' : (quickKind === 'clarify' ? 'Need one more detail before SEND ORDER.' : 'Answered in chat. No order was created.')),
        quickKind === 'assist' || quickKind === 'command' ? 'ok' : (quickKind === 'clarify' ? 'warn' : 'info')
      );
      void trackConversionEvent('chat_answered', { ...analyticsDraft, status: quickKind });
      return;
    }
    if (isOpenChatClarifyMode() && !structuredDispatchPrompt) {
      const prepPrompt = draft.prompt || fallbackPromptFromOrderInput(draft.input || null);
      const prepAnswer = buildOpenChatClarifyModeAnswer(prepPrompt, inputCounts, {
        sourceOnly: !String(draft.prompt || '').trim()
      });
      appendOrderChatExchange(prepPrompt, prepAnswer, { transcriptId: submittedTranscriptId });
      flash('Order draft ready. Review it, then press SEND ORDER.', 'ok');
      void trackConversionEvent('draft_order_clarified', { ...analyticsDraft, source: 'clarify_mode' });
      return;
    }
    if (shouldPrepareOrderBeforeDispatch(draft)) {
      const prepPrompt = draft.prompt || fallbackPromptFromOrderInput(draft.input || null);
      const prepAnswer = buildOpenChatImplicitOrderPrepAnswer(prepPrompt, inputCounts, {
        sourceOnly: !String(draft.prompt || '').trim()
      });
      appendOrderChatExchange(prepPrompt, prepAnswer, { transcriptId: submittedTranscriptId });
      flash('Order prepared. Review the structured brief, then press SEND ORDER when ready.', 'ok');
      void trackConversionEvent('draft_order_created', { ...analyticsDraft, source: 'implicit_order_prep' });
      return;
    }
    const dispatchCheckJa = looksJapanese(draft.prompt || originalChatPrompt);
    const dispatchCheckTitle = dispatchCheckJa ? 'SEND ORDERを受け付けました。' : 'SEND ORDER received.';
    const dispatchCheckBody = dispatchCheckJa
      ? '実行前チェック中です。ログイン、支払い、接続先を確認してからOrder IDと進捗を表示します。'
      : 'Running pre-dispatch checks now. CAIt is checking sign-in, billing, and routing before posting the Order ID and progress.';
    state.openChatLastStatus = `${dispatchCheckTitle}\n\n${dispatchCheckBody}`;
    state.openChatLastStatusTone = 'info';
    updateWorkChatStatusCard(dispatchCheckTitle, dispatchCheckBody, 'info');
    upsertOpenChatPendingDispatchMessage(`${dispatchCheckTitle}\n\n${dispatchCheckBody}`, {
      tone: 'info',
      ja: dispatchCheckJa,
      progressMeta: orderAcceptanceProgressMeta(0, { ja: dispatchCheckJa })
    });
    flash(dispatchCheckJa ? 'SEND ORDERを受け付けました。実行前チェック中です。' : 'SEND ORDER received. Running checks...', 'info');
    try {
      validateOrderDraft(draft, { checkAccess: true, checkFunding: false });
    } catch (error) {
      clearOpenChatPendingDispatchMessage();
      const blockedStatus = String(error?.message || 'Order is waiting before dispatch.').slice(0, 240);
      void trackChatTranscript(draft.prompt, {
        kind: 'error',
        body: blockedStatus,
        status: blockedStatus
      }, { ...analyticsDraft, status: 'blocked', transcriptId: submittedTranscriptId });
      if (/login|sign in|sign-in|required/i.test(String(error?.message || ''))) {
        void trackConversionEvent('sign_in_required_shown', { ...analyticsDraft, status: 'blocked' });
      }
      if (/payment|deposit|funding/i.test(String(error?.message || ''))) {
        void trackConversionEvent('payment_required_shown', { ...analyticsDraft, status: 'blocked' });
      }
      if (handleOrderPreflightPrompt(error, draft, { analytics: analyticsDraft, source: 'work_chat_validation' })) return;
      throw error;
    }
    let stopAcceptanceProgress = () => {};
    let payload;
    let dispatchInFlightKey = '';
    try {
      const dispatchSessionId = ensureCurrentOpenChatSessionId({ force: true });
      payload = {
        ...apiPayloadFromOrderDraftWithChatSession(draft, dispatchSessionId),
        agent_id: draft.agent_id || undefined,
        prompt: draft.prompt || fallbackPromptFromOrderInput(draft.input),
        visitor_id: visitorId(),
        async_dispatch: true
      };
      const clientOrderId = clientOrderIdFromOrderCreate(payload) || makeClientOrderId();
      const payloadInput = payload.input && typeof payload.input === 'object' && !Array.isArray(payload.input)
        ? payload.input
        : {};
      const payloadBroker = payloadInput._broker && typeof payloadInput._broker === 'object' && !Array.isArray(payloadInput._broker)
        ? payloadInput._broker
        : {};
      payload.client_order_id = clientOrderId;
      payload.clientOrderId = clientOrderId;
      payload.input = {
        ...payloadInput,
        client_order_id: clientOrderId,
        _broker: {
          ...payloadBroker,
          clientOrderId,
          clientOrderPreparedAt: new Date().toISOString()
        }
      };
      dispatchInFlightKey = compactChatText([
        payload.session_id || payload.sessionId || '',
        payload.parent_agent_id || '',
        payload.task_type || '',
        payload.order_strategy || '',
        payload.prompt || ''
      ].join('|'), 1200);
    } catch (error) {
      clearOpenChatPendingDispatchMessage();
      const failedStatus = String(error?.message || 'Order request could not be prepared.').slice(0, 240);
      void trackChatTranscript(draft.prompt, {
        kind: 'error',
        body: failedStatus,
        status: failedStatus
      }, { ...analyticsDraft, status: 'client_prepare_error', transcriptId: submittedTranscriptId });
      updateWorkChatStatusCard('Order request could not be prepared.', failedStatus, 'error');
      flash(failedStatus, 'error');
      throw error;
    }
    const existingInFlightAgeMs = Date.now() - Number(state.openChatDispatchInFlightAt || 0);
    if (
      state.openChatDispatchInFlightKey
      && state.openChatDispatchInFlightKey === dispatchInFlightKey
      && existingInFlightAgeMs >= 0
      && existingInFlightAgeMs < openChatDispatchInFlightTtlMs
    ) {
      upsertOpenChatPendingDispatchMessage(orderAcceptanceProgressBody(payload.prompt, Date.now(), { ja: looksJapanese(payload.prompt) }), {
        tone: 'info',
        ja: looksJapanese(payload.prompt),
        progressMeta: orderAcceptanceProgressMeta(0, { ja: looksJapanese(payload.prompt) })
      });
      flash(looksJapanese(payload.prompt) ? '同じ発注を送信中です。再送せず進捗表示を待っています。' : 'This order is already being sent. Waiting for the progress message instead of resubmitting.', 'info');
      return;
    }
    if (state.openChatDispatchInFlightKey === dispatchInFlightKey) {
      state.openChatDispatchInFlightKey = '';
      state.openChatDispatchInFlightAt = 0;
    }
    state.openChatDispatchInFlightKey = dispatchInFlightKey;
    state.openChatDispatchInFlightAt = Date.now();
    const sendingJa = looksJapanese(payload.prompt);
    let created;
    try {
      const sendingTitle = sendingJa ? '発注を送信しています。' : 'Sending order...';
      const sendingBody = sendingJa
        ? '受付が完了したら、Order ID と進捗をこのチャットに表示します。'
        : 'When accepted, CAIt will post the Order ID and progress in this chat.';
      state.openChatLastStatus = `${sendingTitle}\n\n${sendingBody}`;
      state.openChatLastStatusTone = 'info';
      updateWorkChatStatusCard(sendingTitle, sendingBody, 'info');
      if (els.runCreateStatus) {
        els.runCreateStatus.textContent = `${sendingTitle}\n\n${sendingBody}`;
        els.runCreateStatus.className = 'detail-box action-card info compact-card';
      }
      upsertOpenChatPendingDispatchMessage(`${sendingTitle}\n\n${sendingBody}`, {
        tone: 'info',
        ja: sendingJa,
        progressMeta: orderAcceptanceProgressMeta(0, { ja: sendingJa })
      });
      stopAcceptanceProgress = startOpenChatAcceptanceProgress(payload.prompt, { ja: sendingJa });
      flash(sendingJa ? '発注を送信中です。' : 'Sending order request...', 'info');
      created = await api('/api/jobs', { method: 'POST', body: orderCreateRequestBody(payload) });
    } catch (error) {
      stopAcceptanceProgress();
      const recovered = await recoverAcceptedOrderAfterCreateError(payload, { error, ja: sendingJa });
      if (recovered) {
        created = recovered;
        flash(
          sendingJa
            ? 'レスポンス失敗後に保存済みオーダーを確認しました。進捗表示へ切り替えます。'
            : 'Recovered a saved order after the create response failed. Switching to progress tracking.',
          'ok'
        );
      } else {
        clearOpenChatPendingDispatchMessage();
        if (state.openChatDispatchInFlightKey === dispatchInFlightKey) {
          state.openChatDispatchInFlightKey = '';
          state.openChatDispatchInFlightAt = 0;
        }
        const failedStatus = String(error?.message || 'Order request failed before dispatch.').slice(0, 240);
        void trackChatTranscript(payload.prompt, {
          kind: 'error',
          body: failedStatus,
          status: failedStatus
        }, { ...analyticsDraft, status: 'api_error', transcriptId: submittedTranscriptId });
        if (handleOrderPreflightPrompt(error, draft, { analytics: analyticsDraft, source: 'work_chat_api' })) return;
        if (/payment|required|deposit|funding/i.test(String(error?.message || ''))) {
          void trackConversionEvent('payment_required_shown', { ...analyticsDraft, status: 'blocked' });
          if (handleOrderFundingPrompt(error, draft, { analytics: analyticsDraft, source: 'work_chat' })) return;
          openSettingsSection('payments');
        }
        throw error;
      }
    } finally {
      if (state.openChatDispatchInFlightKey === dispatchInFlightKey) {
        state.openChatDispatchInFlightKey = '';
        state.openChatDispatchInFlightAt = 0;
      }
    }
    if (!created) {
      stopAcceptanceProgress();
      clearOpenChatPendingDispatchMessage();
      throw new Error('Order request ended without an Order ID. Reload Chat and check order history before retrying.');
    }
    stopAcceptanceProgress();
    clearOpenChatPendingDispatchMessage();
    if (chatEngineIsNeedsInputResponse(created)) {
      void trackConversionEvent('intake_questions_shown', { ...analyticsDraft, status: 'needs_input' });
      void trackChatTranscript(payload.prompt, {
        kind: 'clarify',
        body: [
          String(created?.message || 'More information needed before dispatch.').slice(0, 500),
          ...(Array.isArray(created?.questions) ? created.questions.map((question, index) => `${index + 1}. ${question}`) : [])
        ].filter(Boolean).join('\n'),
        status: 'needs_input'
      }, { ...analyticsDraft, status: 'needs_input', transcriptId: submittedTranscriptId });
      handleNeedsInputResponse(created, draft);
      return;
    }
    const createdOrderId = createdOrderPrimaryId(created);
    const createdOrderStatus = normalizeOrderProgressStatus(created?.status || 'created');
    const createdOrderBody = orderProgressMessageFromCreated(created, payload.prompt);
    const createdOrderTone = orderProgressTone(createdOrderStatus);
    const createdOrderJa = looksJapanese(payload.prompt);
    revealCreatedOrderInHistory(created, payload);
    void trackConversionEvent('order_created', {
      ...analyticsDraft,
      mode: created.mode || 'run',
      status: createdOrderStatus
    });
    state.pendingOrderConfirmation = null;
    if (createdOrderId) {
      markCurrentOpenChatSessionLinkedOrder(createdOrderId, { status: createdOrderStatus });
    }
    if (createdOrderId) {
      upsertOpenChatOrderProgressMessage(createdOrderId, createdOrderBody, {
        status: createdOrderStatus,
        tone: createdOrderTone,
        ja: createdOrderJa,
        progressMeta: orderProgressMeta(created, { status: createdOrderStatus }),
        label: orderProgressMessageLabel(created)
      });
    } else {
      appendOpenChatOrderProgressMessage(createdOrderBody, {
        status: createdOrderStatus,
        tone: createdOrderTone,
        ja: createdOrderJa,
        label: orderProgressMessageLabel(created)
      });
    }
    void trackChatTranscript(payload.prompt, {
      kind: 'order',
      body: createdOrderBody,
      status: createdOrderStatus
    }, {
      ...analyticsDraft,
      status: createdOrderStatus,
      mode: created.mode || 'run',
      transcriptId: submittedTranscriptId
    });
    state.selectedJobId = createdOrderId || state.selectedJobId;
    if (created.matched_agent_id) state.selectedAgentId = created.matched_agent_id;
    state.runSearch = '';
    if (els.runSearch) els.runSearch.value = '';
    state.workFlowMode = '';
    state.workFlowShowList = true;
    state.workFlowLastCreatedJobId = createdOrderId || null;
    state.followupToJobId = '';
    state.followupSourceTaskType = '';
    state.followupSourceAgentId = '';
    state.pendingIntake = null;
    state.intakeConfirmed = false;
    state.intakeAnswer = '';
    if (els.intakeAnswer) els.intakeAnswer.value = '';
    switchTab('work');
    if (createdOrderStatus === 'failed' || createdOrderStatus === 'timed_out') {
      flash(`Order ${createdOrderId.slice(0, 8) || ''} stopped: ${created.failure_reason || created.error || createdOrderStatus}.`, 'error');
      await refresh();
      return;
    }
    startOpenChatOrderProgressPolling(createdOrderId, {
      status: createdOrderStatus,
      ja: createdOrderJa,
      immediate: true
    });
    if (createdOrderId) {
      window.requestAnimationFrame(() => focusWorkResults());
    }
    if (created.mode === 'workflow') {
      flash(`Agent Team ${created.workflow_job_id?.slice(0, 8) || ''} accepted ${created.child_runs?.length || 0} agent runs.`, createdOrderTone);
    } else {
      flash(
        createdOrderJa
          ? `発注を受け付けました。${createdOrderId ? ` Order ${createdOrderId.slice(0, 8)}.` : ''}`
          : `Order ${created.job_id?.slice(0, 8) || ''} ${createdOrderStatus}.`,
        createdOrderTone
      );
    }
    if (created.async_dispatch || created.dispatch_status === 'scheduled') {
      flash(
        createdOrderJa
          ? `発注を受け付けました。進捗はこのチャットで更新します。${createdOrderId ? ` Order ${createdOrderId.slice(0, 8)}.` : ''}`
          : `Order ${createdOrderId.slice(0, 8)} sent. CAIt will update chat progress until delivery is ready.`,
        'ok'
      );
      await refresh();
      clearOrderComposerPrompt();
      window.setTimeout(() => { void refresh(); }, 5000);
      return;
    }
    if (created.mode === 'workflow') {
      await refresh();
      clearOrderComposerPrompt();
      return;
    }
    if ((els.jobMode?.value || 'complete') === 'create-only' || created.status === 'completed' || created.status === 'dispatched' || created.status === 'failed') {
      await refresh();
      clearOrderComposerPrompt();
      return;
    }
    if (els.jobMode?.value === 'external-demo') {
      const claim = await api(`/api/jobs/${created.job_id}/claim`, { method: 'POST', body: JSON.stringify({ agent_id: created.matched_agent_id }) });
      const submit = await api(`/api/jobs/${created.job_id}/result`, { method: 'POST', body: JSON.stringify({ agent_id: created.matched_agent_id, status: 'completed', output: { summary: `Connected aiagent handled: ${draft.prompt || fallbackPromptFromOrderInput(draft.input)}` }, usage: { api_cost: Math.max(60, Math.round(Number(draft.budget_cap || 300) * 0.3)) } }) });
      setDetail({ created, claim, submit });
      flash(`Order ${created.job_id.slice(0, 8)} dispatched to connected agent demo.`, 'ok');
      await refresh();
      clearOrderComposerPrompt();
      return;
    }
    const dev = await api('/api/dev/resolve-job', { method: 'POST', body: JSON.stringify({ job_id: created.job_id, mode: els.jobMode?.value || 'complete' }) });
    setDetail({ created, resolved: dev });
    flash(`Order ${created.job_id.slice(0, 8)} ${dev.status}.`, dev.status === 'failed' ? 'error' : 'ok');
    await refresh();
    clearOrderComposerPrompt();
  }

  return {
    acceptPreparedOpenChatOrderForDispatch,
    createAndOptionallyRunJob,
    handleCreateJobButtonClick,
    runOpenChatHubCommand
  };
}
