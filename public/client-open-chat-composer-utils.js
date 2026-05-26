import { compactClientText as compactChatText } from './client-text-utils.js?v=20260521a';

export function createClientOpenChatComposerUtils(options = {}) {
  const getState = typeof options.getState === 'function' ? options.getState : () => ({});
  const getEls = typeof options.getEls === 'function' ? options.getEls : () => ({});
  const openChatMode = typeof options.openChatMode === 'function' ? options.openChatMode : () => 'order';
  const updateOpenChatModeControls = typeof options.updateOpenChatModeControls === 'function' ? options.updateOpenChatModeControls : () => {};
  const readOpenChatSessions = typeof options.readOpenChatSessions === 'function' ? options.readOpenChatSessions : () => [];
  const dedupeOpenChatSessionsForDisplay = typeof options.dedupeOpenChatSessionsForDisplay === 'function'
    ? options.dedupeOpenChatSessionsForDisplay
    : (sessions) => sessions;
  const isStructuredOrderBrief = typeof options.isStructuredOrderBrief === 'function' ? options.isStructuredOrderBrief : () => false;
  const openChatSessionTimeLabel = typeof options.openChatSessionTimeLabel === 'function' ? options.openChatSessionTimeLabel : () => 'saved';
  const openChatSessionsShareIdentity = typeof options.openChatSessionsShareIdentity === 'function'
    ? options.openChatSessionsShareIdentity
    : () => false;
  const loadOpenChatSession = typeof options.loadOpenChatSession === 'function' ? options.loadOpenChatSession : () => {};
  const runAction = typeof options.runAction === 'function' ? options.runAction : async (_button, action) => action();
  const deleteOpenChatSession = typeof options.deleteOpenChatSession === 'function' ? options.deleteOpenChatSession : async () => {};
  const renderOpenChatSessionControlsElement = typeof options.renderOpenChatSessionControlsElement === 'function'
    ? options.renderOpenChatSessionControlsElement
    : () => {};
  const renderWorkChatEntryCardElement = typeof options.renderWorkChatEntryCardElement === 'function'
    ? options.renderWorkChatEntryCardElement
    : () => {};
  const setElementVisible = typeof options.setElementVisible === 'function' ? options.setElementVisible : () => {};
  const hasActiveOpenChatOrderProgress = typeof options.hasActiveOpenChatOrderProgress === 'function'
    ? options.hasActiveOpenChatOrderProgress
    : () => false;
  const openChatSessionHasLinkedWork = typeof options.openChatSessionHasLinkedWork === 'function'
    ? options.openChatSessionHasLinkedWork
    : () => false;
  const lastOpenChatPreparedBrief = typeof options.lastOpenChatPreparedBrief === 'function'
    ? options.lastOpenChatPreparedBrief
    : () => '';
  const isOpenChatDecisionSuppressedForBrief = typeof options.isOpenChatDecisionSuppressedForBrief === 'function'
    ? options.isOpenChatDecisionSuppressedForBrief
    : () => false;
  const looksJapanese = typeof options.looksJapanese === 'function' ? options.looksJapanese : () => false;
  const workOrderUiLabels = typeof options.workOrderUiLabels === 'function' ? options.workOrderUiLabels : () => ({
    sendOrder: 'Send order',
    revise: 'Revise',
    addConstraints: 'Add constraints',
    cancel: 'Cancel'
  });
  const normalizeOpenChatIntentText = typeof options.normalizeOpenChatIntentText === 'function'
    ? options.normalizeOpenChatIntentText
    : (value) => String(value || '').trim().toLowerCase();
  const openChatIntentMatchText = typeof options.openChatIntentMatchText === 'function'
    ? options.openChatIntentMatchText
    : (value) => String(value || '').trim().toLowerCase();

  function renderOpenChatModeControls() {
    const els = getEls();
    updateOpenChatModeControls(els, openChatMode());
  }

  function currentOpenChatSessionHasLinkedWork() {
    const state = getState();
    const currentSessionId = compactChatText(state.currentOpenChatSessionId || '', 120);
    const runtimeSession = currentSessionId && Array.isArray(state.openChatRuntimeSessions)
      ? state.openChatRuntimeSessions.find((session) => session?.id === currentSessionId)
      : null;
    const messages = Array.isArray(state.orderChatMessages) && state.orderChatMessages.length
      ? state.orderChatMessages
      : (Array.isArray(runtimeSession?.messages) ? runtimeSession.messages : []);
    return openChatSessionHasLinkedWork({
      ...(runtimeSession || {}),
      activeWork: Boolean(runtimeSession?.activeWork || hasActiveOpenChatOrderProgress()),
      linkedOrderId: runtimeSession?.linkedOrderId || state.openChatProgressOrderId || '',
      messages
    }, messages);
  }

  function clearOpenChatDispatchDraftState(config = {}) {
    const state = getState();
    const els = getEls();
    state.openChatPreparedBrief = '';
    state.openChatParallelPlan = [];
    state.openChatClarifyOptions = [];
    state.openChatVagueChoicePrompt = '';
    state.openChatNaturalChoiceIntent = '';
    state.openChatIntentShiftPrompt = '';
    state.openChatIdeaBacklogPrompt = '';
    state.openChatLeaderIntakePrompt = '';
    state.openChatLeaderIntakeTask = '';
    state.openChatPendingQuestionPrompt = '';
    state.openChatPendingQuestionTask = '';
    state.openChatPendingQuestionPattern = '';
    state.pendingOrderConfirmation = null;
    state.serverResolvedIntent = null;
    state.serverPreparedOrder = null;
    state.openChatDecisionSuppressed = true;
    if (config.clearComposer !== false) {
      if (els.jobPrompt) els.jobPrompt.value = '';
      if (els.jobType) els.jobType.value = '';
    }
  }

  function renderOpenChatSessionControls() {
    const state = getState();
    const els = getEls();
    renderOpenChatSessionControlsElement(els, {
      sessions: dedupeOpenChatSessionsForDisplay(readOpenChatSessions()),
      currentSessionId: compactChatText(state.currentOpenChatSessionId || '', 120),
      loggedIn: Boolean(state.snapshot?.auth?.loggedIn),
      historyOpen: Boolean(state.openChatHistoryOpen),
      isStructuredOrderBrief: (value) => isStructuredOrderBrief(value),
      openChatSessionTimeLabel: (value) => openChatSessionTimeLabel(value),
      openChatSessionsShareIdentity: (left, right) => openChatSessionsShareIdentity(left, right),
      onLoadSession: (sessionId) => loadOpenChatSession(sessionId),
      onDeleteSession: (button, sessionId) => {
        void runAction(button, async () => {
          await deleteOpenChatSession(sessionId);
        });
      }
    });
  }

  function currentOpenChatHasMeaningfulContent() {
    const state = getState();
    const els = getEls();
    const prompt = String(els.jobPrompt?.value || '').trim();
    if (prompt) return true;
    return (Array.isArray(state.orderChatMessages) ? state.orderChatMessages : [])
      .some((message) => String(message?.body || '').trim() && !message.typing);
  }

  function shouldShowWorkChatEntryCard(auth = getState().snapshot?.auth || {}) {
    const state = getState();
    if (auth?.loggedIn) return false;
    if (state.openChatEntryDismissed) return false;
    return !currentOpenChatHasMeaningfulContent();
  }

  function renderWorkChatEntryCard(auth = getState().snapshot?.auth || {}) {
    const els = getEls();
    renderWorkChatEntryCardElement(els, auth, {
      show: shouldShowWorkChatEntryCard(auth),
      setElementVisible: (element, visible) => setElementVisible(element, visible)
    });
  }

  function openChatPreviousAgentMessageBody() {
    const state = getState();
    const messages = Array.isArray(state.orderChatMessages) ? state.orderChatMessages : [];
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const message = messages[index];
      if (message?.role !== 'agent') continue;
      return String(message.fullBody || message.body || '').trim();
    }
    return '';
  }

  function openChatPreviousUserMessageBody() {
    const state = getState();
    const messages = Array.isArray(state.orderChatMessages) ? state.orderChatMessages : [];
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const message = messages[index];
      if (message?.role !== 'user') continue;
      return String(message.fullBody || message.body || '').trim();
    }
    return '';
  }

  function openChatLastPromptWasOrderDecision() {
    const body = openChatPreviousAgentMessageBody();
    if (!body) return false;
    const text = openChatIntentMatchText(body);
    const labels = workOrderUiLabels();
    const sendLabel = normalizeOpenChatIntentText(labels.sendOrder).replace(/\s+/g, '');
    const reviseLabel = normalizeOpenChatIntentText(labels.revise).replace(/\s+/g, '');
    const addConstraintsLabel = normalizeOpenChatIntentText(labels.addConstraints).replace(/\s+/g, '');
    const hasConfirm = /(1\s*(発注|注文|実行|send order|order|dispatch)|発注する|send order)/i.test(text)
      || (Boolean(sendLabel) && text.includes(sendLabel));
    const hasRevise = /(2\s*(修正|条件|制約|add constraints|revise)|条件を修正|制約を追加|add constraints|revise conditions)/i.test(text)
      || (Boolean(reviseLabel) && text.includes(reviseLabel))
      || (Boolean(addConstraintsLabel) && text.includes(addConstraintsLabel));
    return hasConfirm && hasRevise;
  }

  function openChatDefaultDecisionOptions(ja = false) {
    const labels = workOrderUiLabels();
    return [
      {
        command: 'confirm_preorder_order',
        label: ja ? '発注する' : labels.sendOrder,
        description: ja ? 'Agentに送ります' : 'Dispatch to an agent'
      },
      {
        command: 'revise_preorder_order',
        label: ja ? '条件を修正する' : labels.revise,
        description: ja ? 'チャットで条件を足します' : 'Add constraints in chat'
      },
      {
        command: 'cancel_preorder_order',
        label: ja ? 'キャンセル' : labels.cancel,
        description: ja ? '下書きを破棄します' : 'Discard the draft'
      }
    ];
  }

  function openChatComposerDecisionOptions() {
    const state = getState();
    if (state.openChatDecisionSuppressed) return [];
    if (currentOpenChatSessionHasLinkedWork()) return [];
    const preparedBrief = lastOpenChatPreparedBrief();
    if (isOpenChatDecisionSuppressedForBrief(preparedBrief)) return [];
    const rawOptions = Array.isArray(state.openChatClarifyOptions) ? state.openChatClarifyOptions : [];
    const decisionOptions = rawOptions.filter((option) => ['confirm_preorder_order', 'revise_preorder_order', 'cancel_preorder_order'].includes(String(option?.command || '')));
    const context = `${openChatPreviousAgentMessageBody()}\n${openChatPreviousUserMessageBody()}\n${preparedBrief}`;
    const ja = looksJapanese(context);
    if (decisionOptions.length) {
      const defaults = openChatDefaultDecisionOptions(ja);
      return defaults.map((fallback) => {
        const matched = decisionOptions.find((option) => option.command === fallback.command) || {};
        return {
          ...fallback,
          label: String(matched.label || (ja ? matched.labelJa : matched.labelEn) || fallback.label).trim() || fallback.label
        };
      });
    }
    if (openChatLastPromptWasOrderDecision() || isStructuredOrderBrief(preparedBrief)) {
      return openChatDefaultDecisionOptions(ja);
    }
    return [];
  }

  return {
    renderOpenChatModeControls,
    currentOpenChatSessionHasLinkedWork,
    clearOpenChatDispatchDraftState,
    renderOpenChatSessionControls,
    currentOpenChatHasMeaningfulContent,
    shouldShowWorkChatEntryCard,
    renderWorkChatEntryCard,
    openChatPreviousAgentMessageBody,
    openChatPreviousUserMessageBody,
    openChatLastPromptWasOrderDecision,
    openChatComposerDecisionOptions
  };
}
