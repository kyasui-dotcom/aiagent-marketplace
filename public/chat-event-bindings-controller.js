import { connectorGateHandleOAuthLinkClick } from './connector-gate.js?v=20260519a';

export function createChatEventBindingsController(deps = {}) {
  const {
    state,
    els,
    window,
    document,
    libraryCommandScope,
    directAppCommandId,
    rememberConversationLanguage,
    appendTextMessage,
    setBusy,
    appendUsageLibrary,
    openAppAgent,
    sendOrder,
    handlePromptInjectionInput,
    handleRetryCommand,
    showDeliveryHistoryForPrompt,
    handleLeaderConversationRequest,
    handleNonOrderConversation,
    answerPendingIntake,
    activeOrderFollowupAllowedText,
    prepareFollowupForRunningOrder,
    addChatAdjustmentToDraft,
    handleDeterministicWorkIntakeRequest,
    handleChatIntentWithLlm,
    prepareOrder,
    orderErrorMessage,
    handleOAuthPopupReturnMessage,
    handleCaitAppContextMessage,
    saveChatOAuthReturnState,
    openChatOAuthPopup,
    chatuxReturnPath,
    signOut,
    openAgentRunDetail,
    reuseAppAgent,
    reuseAiAgent,
    chatAppHandoffController,
    createAppAgentHandoffUrl,
    appHandoffRememberDetails,
    createAppAgentContextOpenUrl,
    copyTextToClipboard,
    getDeliveryFile,
    downloadTextFile,
    approveAndResumeOrder,
    fetchVisibleJob,
    rememberTrackedOrder,
    maybeRenderAuthorityNotice,
    appendOrderStatusCheck,
    jobHasDeliveryResult,
    renderDeliveryOnce,
    notifyOrderMilestone,
    resumeLiveProgress,
    startPolling,
    prepareRetryFromOrder,
    selectedRetryReuseArtifactsForOrder,
    showSchedulePanel,
    handleIntakeThreadClick,
    resetChat,
    resolvePendingLeaderChange,
    handleIntakeOtherInputKeydown,
    normalizeUiLanguage,
    chatUiText,
    saveChatUiLanguagePreference,
    utilityModalIsOpen,
    showInfoPanel,
    closeUtilityModal,
    loadChatSession,
    loadMoreUtilityCatalog,
    updateRecurringOrderStatus,
    cancelRecurringOrder,
    loadAppContextIntoChat,
    taskLabel,
    chatText,
    createScheduleFromForm,
    openUtilityModal,
    schedulePanelHtml,
    closeChatHeaderMenu,
    renderChatSessionSidebar,
    refreshChatSessionHistory,
    startNewChatSession,
    deleteChatSession,
    showWorkerListPanel,
    showAppListPanel,
    setChatUiLanguage,
    renderActiveLeaderStatus,
    updateComposerMode,
    startAppContextBroadcastListener,
    handleChatOAuthPopupReturn,
    restoreChatOAuthReturnStateFromUrl,
    shouldStartFreshChatFromUrl,
    chatRestoreRequestFromUrl,
    restoreChatRuntimeState,
    hydrateAppContextFromUrl,
    restoreRequestedChatSessionFromHistory,
    refreshAuth,
    ensureAuthRefreshProgress,
    saveChatRuntimeState,
    startDeliveryBackfillLoop
  } = deps;

  async function handleComposerSubmit(event) {
    event.preventDefault();
    const prompt = String(els.promptInput.value || '').trim();
    if (!prompt) return;
    rememberConversationLanguage(prompt);
    els.promptInput.value = '';
    appendTextMessage('user', prompt);
    setBusy(true);
    try {
      const libraryScope = libraryCommandScope(prompt);
      const appCommandId = directAppCommandId(prompt);
      if (!state.pendingIntake && libraryScope) {
        await appendUsageLibrary(libraryScope);
      } else if (!state.pendingIntake && appCommandId) {
        openAppAgent(appCommandId, { source: 'chat_command' });
      } else if (/^(send|send order|発注|注文|実行)$/i.test(prompt) && state.draft) {
        await sendOrder();
      } else if (handlePromptInjectionInput(prompt)) {
        // Blocked before intent classification, draft adjustment, or dispatch prep.
      } else if (await handleRetryCommand(prompt)) {
        // Prepared an exact retry draft from the latest terminal order.
      } else if (await showDeliveryHistoryForPrompt(prompt)) {
        // Displayed existing delivery/history instead of preparing a new order.
      } else if (handleLeaderConversationRequest(prompt)) {
        // Switched to a leader-led chat consultation without starting an order.
      } else if (handleNonOrderConversation(prompt)) {
        // Handled as chat, not a work order.
      } else if (state.pendingIntake) {
        await answerPendingIntake(prompt);
      } else if (activeOrderFollowupAllowedText(prompt) && await prepareFollowupForRunningOrder(prompt)) {
        // Prepared as an add-on request attached to the running order.
      } else if (state.draft) {
        addChatAdjustmentToDraft(prompt);
      } else if (await handleDeterministicWorkIntakeRequest(prompt)) {
        // Server-side deterministic routing selected the owning leader or agent before Open Chat intent classification.
      } else if (await handleChatIntentWithLlm(prompt)) {
        // OpenAI classified this as chat, clarification, or an order-ready brief.
      } else {
        await prepareOrder(prompt, { skipOpenAiIntent: true });
      }
    } catch (error) {
      appendTextMessage('assistant', orderErrorMessage(error), { tone: 'error' });
    } finally {
      setBusy(false);
    }
  }

  function handleWindowMessage(event) {
    if (event.origin !== window.location.origin) return;
    const data = event.data && typeof event.data === 'object' ? event.data : {};
    if (data.type === 'cait-oauth-return') {
      void handleOAuthPopupReturnMessage(data);
      return;
    }
    handleCaitAppContextMessage(data, { origin: event.origin });
  }

  function handleOAuthDocumentClick(event) {
    connectorGateHandleOAuthLinkClick(event, {
      saveOAuthState: saveChatOAuthReturnState,
      openOAuthPopup: openChatOAuthPopup,
      fallbackReturnPath: chatuxReturnPath
    });
  }

  async function handleChatThreadClick(event) {
    const agentRunButton = event.target.closest('[data-agent-run-open]');
    if (agentRunButton) {
      event.preventDefault();
      await openAgentRunDetail(agentRunButton);
      return;
    }
    const appOpenButton = event.target.closest('[data-app-agent-open]');
    if (appOpenButton) {
      openAppAgent(appOpenButton.dataset.appAgentOpen || '', { source: 'chat_library_button' });
      return;
    }
    const appReuseButton = event.target.closest('[data-app-agent-reuse]');
    if (appReuseButton) {
      setBusy(true);
      try {
        await reuseAppAgent(appReuseButton.dataset.appAgentReuse || '');
      } catch (error) {
        appendTextMessage('assistant', orderErrorMessage(error), { tone: 'error', label: 'Library' });
      } finally {
        setBusy(false);
      }
      return;
    }
    const aiAgentReuseButton = event.target.closest('[data-ai-agent-reuse]');
    if (aiAgentReuseButton) {
      setBusy(true);
      try {
        await reuseAiAgent(aiAgentReuseButton.dataset.aiAgentReuse || '');
      } catch (error) {
        appendTextMessage('assistant', orderErrorMessage(error), { tone: 'error', label: 'Library' });
      } finally {
        setBusy(false);
      }
      return;
    }
    const appHandoffButton = event.target.closest('[data-app-agent-handoff]');
    if (appHandoffButton) {
      event.preventDefault();
      const appId = String(appHandoffButton.dataset.appAgentHandoff || '').trim();
      const transferId = String(appHandoffButton.dataset.appTransferId || '').trim();
      const { manifest, payload, contractError, missing } = chatAppHandoffController.prepareAppHandoffPayload(appId, transferId, appHandoffButton);
      if (missing) {
        appendTextMessage('assistant', 'The app handoff context is no longer available. Reload the delivery or run the order again.', { tone: 'error', label: 'App handoff' });
        return;
      }
      if (contractError) {
        appendTextMessage('assistant', contractError, { tone: 'error', label: 'App handoff' });
        return;
      }
      setBusy(true);
      try {
        const handoffUrl = await createAppAgentHandoffUrl(appId, payload);
        if (!handoffUrl) throw new Error(`${manifest.name || 'App'} does not have an entry URL or handoff URL.`);
        appHandoffRememberDetails(appId, payload, handoffUrl, 'generic_app_handoff');
        window.open(handoffUrl, '_blank', 'noopener,noreferrer');
        appendTextMessage('system', `Sent CAIt transfer context to ${manifest.name || 'the registered app'} and opened the handoff URL.`, { label: 'App handoff' });
      } catch (error) {
        try {
          const contextUrl = await createAppAgentContextOpenUrl(appId, payload);
          appHandoffRememberDetails(appId, payload, contextUrl, 'generic_app_context_fallback');
          window.open(contextUrl, '_blank', 'noopener,noreferrer');
          appendTextMessage('assistant', `${manifest.name || 'App'} handoff API failed, so I created a server-side CAIt app context and opened the app with only the context id/token in the URL.\n\n${String(error?.message || error || '')}`, { tone: 'warn', label: 'App handoff' });
        } catch (fallbackError) {
          appendTextMessage('assistant', `${String(error?.message || error || 'App handoff failed.')}\n\nFallback also failed: ${String(fallbackError?.message || fallbackError || 'unknown error')}`, { tone: 'error', label: 'App handoff' });
        }
      } finally {
        setBusy(false);
      }
      return;
    }
    const appTransferCopyButton = event.target.closest('[data-app-transfer-copy]');
    if (appTransferCopyButton) {
      const card = appTransferCopyButton.closest('[data-app-transfer-edit-root]');
      const textarea = card?.querySelector('[data-app-transfer-editable="text"]');
      const text = String(textarea?.value || '').trim();
      void copyTextToClipboard(text)
        .then(() => appendTextMessage('system', 'Copied handoff text.'))
        .catch(() => appendTextMessage('assistant', 'Could not copy the handoff text.', { tone: 'error', label: 'App handoff' }));
      return;
    }
    const fileButton = event.target.closest('[data-file-action]');
    if (fileButton) {
      const file = getDeliveryFile(fileButton.dataset.fileId || '');
      if (!file) {
        appendTextMessage('system', 'This file is no longer available in the chat buffer.');
        return;
      }
      const action = String(fileButton.dataset.fileAction || '').trim();
      if (action === 'download') {
        downloadTextFile(file);
        appendTextMessage('system', `Downloaded ${file.name}.`);
      } else if (action === 'copy') {
        void copyTextToClipboard(file.content)
          .then(() => appendTextMessage('system', `Copied ${file.name}.`))
          .catch(() => appendTextMessage('assistant', `Could not copy ${file.name}. Use Download instead.`, { tone: 'error' }));
      }
      return;
    }
    const orderApproveButton = event.target.closest('[data-chat-order-approve]');
    if (orderApproveButton) {
      const orderId = String(orderApproveButton.dataset.chatOrderApprove || '').trim();
      if (!orderId) return;
      await approveAndResumeOrder(orderId);
      return;
    }
    const orderOpenButton = event.target.closest('[data-chat-order-open]');
    if (orderOpenButton) {
      const orderId = String(orderOpenButton.dataset.chatOrderOpen || '').trim();
      if (!orderId) return;
      setBusy(true);
      try {
        const job = await fetchVisibleJob(orderId, { force: true });
        if (!job?.id) throw new Error('Order was not found.');
        rememberTrackedOrder(job.id);
        maybeRenderAuthorityNotice(job, { label: 'Approval required' });
        appendOrderStatusCheck(job);
        if (jobHasDeliveryResult(job)) {
          renderDeliveryOnce(job, { force: true });
        } else {
          notifyOrderMilestone(job);
          resumeLiveProgress(job.id);
          startPolling(job.id);
        }
      } catch (error) {
        appendTextMessage('assistant', orderErrorMessage(error), { tone: 'error', label: 'Order history' });
      } finally {
        setBusy(false);
      }
      return;
    }
    const orderRetryButton = event.target.closest('[data-chat-order-retry]');
    if (orderRetryButton) {
      const orderId = String(orderRetryButton.dataset.chatOrderRetry || '').trim();
      await prepareRetryFromOrder(orderId, { reuseArtifacts: selectedRetryReuseArtifactsForOrder(orderId) });
      return;
    }
    const orderScheduleButton = event.target.closest('[data-chat-order-schedule]');
    if (orderScheduleButton) {
      const orderId = String(orderScheduleButton.dataset.chatOrderSchedule || '').trim();
      if (orderId) {
        try {
          await fetchVisibleJob(orderId);
        } catch {}
      }
      await showSchedulePanel();
      return;
    }
    if (await handleIntakeThreadClick(event)) return;
    const button = event.target.closest('[data-chat-action]');
    if (!button) return;
    const action = String(button.dataset.chatAction || '').trim();
    if (action === 'send-order') {
      void sendOrder();
    } else if (action === 'reset-chat') {
      resetChat();
    } else if (action === 'keep-leader') {
      setBusy(true);
      void resolvePendingLeaderChange(false)
        .catch((error) => appendTextMessage('assistant', orderErrorMessage(error), { tone: 'error', label: 'Leader choice' }))
        .finally(() => setBusy(false));
    } else if (action === 'switch-leader') {
      setBusy(true);
      void resolvePendingLeaderChange(true, button.dataset.leaderTask || '')
        .catch((error) => appendTextMessage('assistant', orderErrorMessage(error), { tone: 'error', label: 'Leader choice' }))
        .finally(() => setBusy(false));
    }
  }

  async function handleUtilityModalChange(event) {
    const select = event.target.closest('[data-chat-ui-language]');
    if (!select) return;
    const next = normalizeUiLanguage(select.value, 'en');
    const status = els.utilityModalBody?.querySelector('[data-ui-language-status]');
    if (status) status.textContent = chatUiText('Saving language...', '言語を保存しています...');
    try {
      const savedLanguage = await saveChatUiLanguagePreference(next);
      if (utilityModalIsOpen('Info')) {
        showInfoPanel(savedLanguage === 'ja' ? '言語を保存しました。' : 'Language saved.');
      }
    } catch (error) {
      if (status) status.textContent = orderErrorMessage(error);
    }
  }

  async function handleUtilityModalClick(event) {
    const logoutButton = event.target.closest('[data-chat-logout]');
    if (logoutButton) {
      await signOut();
      return;
    }
    const openJobButton = event.target.closest('[data-utility-open-job]');
    if (openJobButton) {
      const jobId = String(openJobButton.dataset.utilityOpenJob || '').trim();
      if (jobId) {
        rememberTrackedOrder(jobId);
        closeUtilityModal();
        appendTextMessage('system', `Reopened order ${jobId.slice(0, 8)} from history.`);
        setBusy(true);
        try {
          const job = await fetchVisibleJob(jobId, { force: true });
          state.orderId = job?.id || jobId;
          if (jobHasDeliveryResult(job)) renderDeliveryOnce(job, { force: true });
          else startPolling(jobId);
        } catch {
          startPolling(jobId);
        } finally {
          setBusy(false);
        }
      }
      return;
    }
    const openChatSessionButton = event.target.closest('[data-utility-chat-session-open]');
    if (openChatSessionButton) {
      const sessionId = String(openChatSessionButton.dataset.utilityChatSessionOpen || '').trim();
      if (sessionId) {
        closeUtilityModal();
        loadChatSession(sessionId);
      }
      return;
    }
    const loadMoreButton = event.target.closest('[data-utility-load-more]');
    if (loadMoreButton) {
      await loadMoreUtilityCatalog(String(loadMoreButton.dataset.utilityLoadMore || '').trim());
      return;
    }
    const recurringStatusButton = event.target.closest('[data-recurring-status]');
    if (recurringStatusButton) {
      setBusy(true);
      try {
        await updateRecurringOrderStatus(recurringStatusButton.dataset.recurringStatus || '', recurringStatusButton.dataset.status || 'paused');
      } catch (error) {
        appendTextMessage('assistant', orderErrorMessage(error), { tone: 'error', label: 'Schedules' });
      } finally {
        setBusy(false);
      }
      return;
    }
    const recurringCancelButton = event.target.closest('[data-recurring-cancel]');
    if (recurringCancelButton) {
      setBusy(true);
      try {
        await cancelRecurringOrder(recurringCancelButton.dataset.recurringCancel || '');
      } catch (error) {
        appendTextMessage('assistant', orderErrorMessage(error), { tone: 'error', label: 'Schedules' });
      } finally {
        setBusy(false);
      }
      return;
    }
    const appContextLoadButton = event.target.closest('[data-app-context-load]');
    if (appContextLoadButton) {
      setBusy(true);
      try {
        await loadAppContextIntoChat(appContextLoadButton.dataset.appContextLoad || '');
      } catch (error) {
        appendTextMessage('assistant', orderErrorMessage(error), { tone: 'error', label: 'App context' });
      } finally {
        setBusy(false);
      }
      return;
    }
    const agentTaskButton = event.target.closest('[data-utility-agent-task]');
    if (agentTaskButton) {
      const task = String(agentTaskButton.dataset.utilityAgentTask || '').trim();
      const agentId = String(agentTaskButton.dataset.utilityAgentId || '').trim();
      const agentName = String(agentTaskButton.dataset.utilityAgentName || '').trim();
      if (task) {
        closeUtilityModal();
        const label = agentName || taskLabel(task);
        const prompt = `Use the selected worker "${label}" (${agentId || task}) for the next order.`;
        appendTextMessage('assistant', chatText(
          `I will prepare an order in chat using ${label}.`,
          `I will prepare an order in chat using ${label}.`,
          prompt
        ), { label: 'Workers' });
        setBusy(true);
        try {
          await prepareOrder(prompt, {
            originalPrompt: prompt,
            taskType: task,
            selectedAgentId: agentId,
            selectedAgentName: label
          });
        } catch (error) {
          appendTextMessage('assistant', orderErrorMessage(error), { tone: 'error', label: 'Workers' });
        } finally {
          setBusy(false);
        }
      }
      return;
    }
    const appOpenButton = event.target.closest('[data-app-agent-open]');
    if (appOpenButton) {
      openAppAgent(appOpenButton.dataset.appAgentOpen || '', { source: 'utility_apps_panel' });
      return;
    }
    const appReuseButton = event.target.closest('[data-app-agent-reuse]');
    if (appReuseButton) {
      setBusy(true);
      try {
        await reuseAppAgent(appReuseButton.dataset.appAgentReuse || '');
        closeUtilityModal();
      } catch (error) {
        appendTextMessage('assistant', orderErrorMessage(error), { tone: 'error', label: 'Library' });
      } finally {
        setBusy(false);
      }
      return;
    }
    const aiAgentReuseButton = event.target.closest('[data-ai-agent-reuse]');
    if (aiAgentReuseButton) {
      setBusy(true);
      try {
        await reuseAiAgent(aiAgentReuseButton.dataset.aiAgentReuse || '');
        closeUtilityModal();
      } catch (error) {
        appendTextMessage('assistant', orderErrorMessage(error), { tone: 'error', label: 'Library' });
      } finally {
        setBusy(false);
      }
    }
  }

  async function handleUtilityModalSubmit(event) {
    const form = event.target.closest('[data-schedule-create]');
    if (!form) return;
    event.preventDefault();
    setBusy(true);
    try {
      await createScheduleFromForm(form);
    } catch (error) {
      const message = orderErrorMessage(error);
      appendTextMessage('assistant', message, { tone: 'error', label: 'Schedules' });
      if (utilityModalIsOpen('Schedules')) openUtilityModal('Schedules', schedulePanelHtml(message));
    } finally {
      setBusy(false);
    }
  }

  function handleOpenChatListClick() {
    closeChatHeaderMenu();
    state.chatSidebarOpen = !state.chatSidebarOpen;
    renderChatSessionSidebar();
    void refreshChatSessionHistory({ force: true });
    if (els.chatSessionSidebar && window.matchMedia('(min-width: 721px)').matches) {
      els.chatSessionSidebar.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  }

  function handleNewChatClick() {
    if (state.polling) window.clearInterval(state.polling);
    if (state.deliveryBackfill) window.clearInterval(state.deliveryBackfill);
    if (state.oauthPopupMonitor) window.clearInterval(state.oauthPopupMonitor);
    state.polling = null;
    state.deliveryBackfill = null;
    state.oauthPopupMonitor = null;
    startNewChatSession();
    setBusy(false);
  }

  function handleChatSessionListClick(event) {
    const deleteButton = event.target.closest('[data-chat-session-delete]');
    if (deleteButton) {
      deleteChatSession(deleteButton.dataset.chatSessionDelete || '');
      return;
    }
    const sessionButton = event.target.closest('[data-chat-session-id]');
    if (sessionButton) loadChatSession(sessionButton.dataset.chatSessionId || '');
  }

  function handleDocumentClick(event) {
    if (!els.chatHeaderMenu?.open) return;
    if (event.target?.closest?.('#chatHeaderMenu')) return;
    closeChatHeaderMenu();
  }

  function handleDocumentKeydown(event) {
    if (event.key !== 'Escape') return;
    if (els.utilityModal && !els.utilityModal.hidden) closeUtilityModal();
    closeChatHeaderMenu();
  }

  function handlePromptInputKeydown(event) {
    if (event.key !== 'Enter' || (!event.ctrlKey && !event.metaKey) || event.isComposing) return;
    event.preventDefault();
    if (!state.busy) els.composer.requestSubmit();
  }

  function bind() {
    els.composer.addEventListener('submit', handleComposerSubmit);
    window.addEventListener('message', handleWindowMessage);
    document.addEventListener('click', handleOAuthDocumentClick, { capture: true });
    els.authStatus?.addEventListener('click', (event) => {
      if (event.target.closest('[data-chat-logout]')) void signOut();
    });
    els.chatThread.addEventListener('click', handleChatThreadClick);
    els.chatThread.addEventListener('keydown', handleIntakeOtherInputKeydown);
    els.utilityModalBody?.addEventListener('change', handleUtilityModalChange);
    els.utilityModalBody?.addEventListener('click', handleUtilityModalClick);
    els.utilityModalBody?.addEventListener('submit', handleUtilityModalSubmit);
    els.openChatListBtn?.addEventListener('click', handleOpenChatListClick);
    els.newChatBtn?.addEventListener('click', handleNewChatClick);
    els.chatSessionList?.addEventListener('click', handleChatSessionListClick);
    els.openScheduleBtn?.addEventListener('click', () => {
      closeChatHeaderMenu();
      void showSchedulePanel();
    });
    els.openScheduleComposerBtn?.addEventListener('click', () => {
      void showSchedulePanel();
    });
    els.openWorkerListBtn?.addEventListener('click', () => {
      closeChatHeaderMenu();
      void showWorkerListPanel();
    });
    els.openAppListBtn?.addEventListener('click', () => {
      closeChatHeaderMenu();
      void showAppListPanel();
    });
    els.openInfoBtn?.addEventListener('click', () => {
      closeChatHeaderMenu();
      showInfoPanel();
    });
    els.utilityModalCloseBtn?.addEventListener('click', closeUtilityModal);
    els.utilityModal?.addEventListener('click', (event) => {
      if (event.target?.closest?.('[data-utility-close]')) closeUtilityModal();
    });
    document.addEventListener('click', handleDocumentClick);
    document.addEventListener('keydown', handleDocumentKeydown);
    els.promptInput?.addEventListener('keydown', handlePromptInputKeydown);
    els.resetBtn.addEventListener('click', resetChat);
    window.addEventListener('beforeunload', () => {
      saveChatRuntimeState('runtime_beforeunload');
    });
  }

  function start() {
    setChatUiLanguage(state.uiLanguage, { persist: false });
    renderActiveLeaderStatus();
    updateComposerMode();
    renderChatSessionSidebar();
    startAppContextBroadcastListener();
    if (!handleChatOAuthPopupReturn()) {
      const restoredFromOAuth = restoreChatOAuthReturnStateFromUrl();
      if (shouldStartFreshChatFromUrl()) {
        startNewChatSession();
      } else if (!restoredFromOAuth && !chatRestoreRequestFromUrl().requested) {
        restoreChatRuntimeState();
      }
      void hydrateAppContextFromUrl();
      void refreshChatSessionHistory({ force: true }).then(() => {
        restoreRequestedChatSessionFromHistory();
      });
      void refreshAuth({ maxAttempts: 1 });
      window.setTimeout(ensureAuthRefreshProgress, 9000);
    }
  }

  return {
    bind,
    start
  };
}
