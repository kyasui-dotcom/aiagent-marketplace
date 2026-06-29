export function createClientTabNavigationController(deps = {}) {
  const {
    document,
    els,
    state,
    window,
    clearOpenChatAcceptanceProgressTimer,
    clearOpenChatOrderProgressTimer,
    defaultLoggedInTab,
    finishOpenChatTyping,
    flash,
    normalizeTab,
    openDedicatedLoginPage,
    persistCurrentOpenChatSession,
    refresh,
    rememberTab,
    setElementVisible,
    syncRouteState,
    trackConversionEvent,
    trackConversionOnce
  } = deps;

  function syncTopWorkChatCta() {
    setElementVisible(els.topOpenChatBtn, state.currentTab !== 'work');
  }

  function requireStartLoginGate(targetTab = 'start') {
    if (els.mainNavMenu) els.mainNavMenu.open = false;
    const safeTargetTab = normalizeTab(targetTab) || 'work';
    void trackConversionEvent('start_login_gate_hit', {
      source: safeTargetTab,
      current_tab: state.currentTab || 'start'
    });
    openDedicatedLoginPage({
      source: `gate_${safeTargetTab}`,
      nextTab: safeTargetTab
    });
  }

  function showAuthCheckingScreen(targetTab = 'work') {
    state.pendingAuthTab = normalizeTab(targetTab) || 'work';
    state.currentTab = 'auth-check';
    document.querySelectorAll('[data-screen]').forEach((node) => {
      node.hidden = node.dataset.screen !== 'auth-check';
    });
    document.querySelectorAll('.tab-btn').forEach((btn) => {
      btn.classList.toggle('active', false);
    });
    syncTopWorkChatCta();
  }

  function pauseWorkChatOnTabLeave() {
    const hasBoundaryState = Boolean(
      state.pendingOrderConfirmation
      || state.pendingIntake
      || state.intakeConfirmed
      || (Array.isArray(state.openChatClarifyOptions) && state.openChatClarifyOptions.length)
      || deps.openChatLastPromptWasOrderDecision()
      || String(state.openChatPreparedBrief || '').trim()
    );
    if (!hasBoundaryState) return;
    finishOpenChatTyping({ render: false });
    clearOpenChatOrderProgressTimer();
    clearOpenChatAcceptanceProgressTimer();
    state.openChatProgressOrderId = '';
    state.openChatProgressLastKey = '';
    state.openChatProgressPollCount = 0;
    state.openChatPendingDispatchMessageId = '';
    state.pendingOrderConfirmation = null;
    state.pendingIntake = null;
    state.intakeConfirmed = false;
    state.intakeAnswer = '';
    state.openChatClarifyOptions = [];
    state.openChatDecisionSuppressed = true;
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
    state.openChatPausedByTabLeave = true;
    if (els.intakeAnswer) els.intakeAnswer.value = '';
    state.openChatLastStatus = 'CAIt Chat paused after leaving the chat view.\n\nType "continue" to resume this draft, or send a new request.';
    state.openChatLastStatusTone = 'info';
    persistCurrentOpenChatSession();
  }

  function switchTab(tab, options = {}) {
    if (els.mainNavMenu) els.mainNavMenu.open = false;
    const auth = state.snapshot?.auth || null;
    const authKnown = Boolean(state.snapshot?.auth);
    const loggedIn = Boolean(auth?.loggedIn);
    const previousTab = state.currentTab;
    let nextTab = String(tab || '').trim() || 'start';
    if (previousTab === 'work' && nextTab !== 'work') {
      pauseWorkChatOnTabLeave();
    }
    if (!loggedIn && nextTab !== 'start') {
      if (!authKnown && options.allowBootstrapAccess === true) {
        showAuthCheckingScreen(nextTab);
        return;
      }
      requireStartLoginGate(nextTab);
      return;
    }
    if (loggedIn && nextTab === 'start') {
      nextTab = defaultLoggedInTab(state.snapshot);
    }
    if (nextTab === 'admin' && !auth?.isPlatformAdmin) {
      nextTab = loggedIn ? defaultLoggedInTab(state.snapshot) : 'start';
    }
    state.currentTab = nextTab;
    rememberTab(nextTab);
    document.querySelectorAll('[data-screen]').forEach((node) => {
      node.hidden = node.dataset.screen !== nextTab;
    });
    document.querySelectorAll('.tab-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.tab === nextTab);
    });
    syncTopWorkChatCta();
    syncRouteState();
    if (nextTab === 'work') trackConversionOnce('work_chat_opened', { source: 'tab' }, 'work_chat_opened');
    if (nextTab === 'agents') trackConversionOnce('agent_catalog_opened', { source: 'tab' }, 'agent_catalog_opened');
    if (nextTab === 'settings' && state.snapshot && !state.initialSnapshotLoading) {
      void refresh().catch((error) => {
        flash(error.message, 'error');
      });
    }
  }

  function syncLanding(snapshot = state.snapshot || {}) {
    const auth = snapshot?.auth || {};
    const loggedIn = Boolean(auth?.loggedIn);
    if (state.currentTab === 'auth-check') {
      const targetTab = state.pendingAuthTab || 'work';
      state.pendingAuthTab = '';
      if (loggedIn) {
        switchTab(targetTab);
      } else {
        requireStartLoginGate(targetTab);
      }
      return;
    }
    deps.setTabVisible('start', !loggedIn);
    if (!loggedIn && state.currentTab !== 'start') {
      switchTab('start');
      return;
    }
    if (loggedIn && state.currentTab === 'start') {
      switchTab(defaultLoggedInTab(snapshot));
    }
  }

  return {
    pauseWorkChatOnTabLeave,
    requireStartLoginGate,
    showAuthCheckingScreen,
    switchTab,
    syncLanding,
    syncTopWorkChatCta
  };
}
