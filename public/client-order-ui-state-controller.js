export function createClientOrderUiStateController(deps = {}) {
  const {
    state,
    els,
    document,
    window,
    orderComposerInputDebounceMs = 260,
    canOrderFromBrowser,
    currentEffectiveOrderPrompt,
    currentOrderDraft,
    currentRoutingTask,
    flash,
    inferListCreatorRequestedCount,
    listCreatorUsageEstimateForCount,
    looksJapanese,
    normalizeOpenChatMode,
    normalizeTaskTypeToken,
    renderOrderComposer,
    setElementVisible,
    updateOrderSettingsDrawerControls,
    updateParallelToolsControls
  } = deps;

  let orderComposerInputTimer = null;

  function scheduleOrderComposerRender() {
    if (orderComposerInputTimer) window.clearTimeout(orderComposerInputTimer);
    orderComposerInputTimer = window.setTimeout(() => {
      orderComposerInputTimer = null;
      renderOrderComposer();
    }, orderComposerInputDebounceMs);
  }

  function cancelOrderComposerRender() {
    if (!orderComposerInputTimer) return;
    window.clearTimeout(orderComposerInputTimer);
    orderComposerInputTimer = null;
  }

  function guestTrialAlreadyUsedLocally(auth = state.snapshot?.auth || {}) {
    return false;
  }

  function markGuestTrialUsedLocally(result = null) {
    return null;
  }

  function shouldOfferGuestTrialForDraft(draft = currentOrderDraft()) {
    return false;
  }

  function guestTrialPromoTextForDraft(draft = currentOrderDraft(), prompt = draft?.prompt || '') {
    const auth = state.snapshot?.auth || {};
    if (canOrderFromBrowser(auth)) return '';
    if (looksJapanese(prompt || draft?.prompt || '')) {
      return [
        '実行はログイン後のみです。',
        'CAItはオープンソースなので利用はフリーです。ただしOpenAI/APIコストがかかるため、1アカウント月10ドルまでで止まります。'
      ].join('\n');
    }
    return [
      'Dispatch requires sign-in.',
      'CAIt is free to use because it is open source. OpenAI/API calls still cost money, so each account stops at $10 per month.'
    ].join('\n');
  }

  async function maybeClaimGuestTrialCredits(auth = state.snapshot?.auth || {}) {
    return null;
  }

  function listCreatorEstimateForDraft(draft = {}) {
    const taskType = normalizeTaskTypeToken(draft.task_type || draft.taskType || currentRoutingTask());
    if (taskType !== 'list_creator') return null;
    const requestedCount = inferListCreatorRequestedCount([
      draft.prompt,
      draft.goal,
      draft.input,
      currentEffectiveOrderPrompt()
    ]);
    return listCreatorUsageEstimateForCount(requestedCount);
  }

  function renderParallelTools() {
    updateParallelToolsControls(els, state.parallelToolsExpanded, (element, visible) => setElementVisible(element, visible));
  }

  function renderOrderSettingsDrawer() {
    updateOrderSettingsDrawerControls(els, state.orderSettingsExpanded, {
      body: document.body,
      setElementVisible: (element, visible) => setElementVisible(element, visible)
    });
  }

  function openChatMode() {
    return normalizeOpenChatMode(state.openChatMode);
  }

  function isOpenChatClarifyMode() {
    return openChatMode() === 'clarify';
  }

  function persistOpenChatModeValue(mode = 'clarify') {
    state.openChatMode = normalizeOpenChatMode(mode);
  }

  function promotePreparedBriefToOrderMode() {
    // Keep explicit mode control user-driven to avoid surprise mode switches.
  }

  function setOpenChatMode(mode = 'clarify', options = {}) {
    const next = normalizeOpenChatMode(mode);
    state.openChatMode = next;
    persistOpenChatModeValue(next);
    if (els.openChatModeMenu) els.openChatModeMenu.open = false;
    renderOrderComposer();
    if (!options.silent) {
      flash(next === 'clarify'
        ? 'PLAN mode enabled. Chat prepares and revises order drafts.'
        : 'ORDER mode enabled. Chat keeps dispatch-ready structure before SEND ORDER.', 'info');
    }
  }

  function closeOrderSettings() {
    state.orderSettingsExpanded = false;
    renderOrderSettingsDrawer();
  }

  function renderOrderAdvancedPanel() {
    setElementVisible(els.orderAdvancedPanel, true);
  }

  return {
    cancelOrderComposerRender,
    closeOrderSettings,
    guestTrialAlreadyUsedLocally,
    guestTrialPromoTextForDraft,
    isOpenChatClarifyMode,
    listCreatorEstimateForDraft,
    markGuestTrialUsedLocally,
    maybeClaimGuestTrialCredits,
    openChatMode,
    persistOpenChatModeValue,
    promotePreparedBriefToOrderMode,
    renderOrderAdvancedPanel,
    renderOrderSettingsDrawer,
    renderParallelTools,
    scheduleOrderComposerRender,
    setOpenChatMode,
    shouldOfferGuestTrialForDraft
  };
}
