import {
  authAccountKey,
  chatSessionSnapshotExpired,
  chatSnapshotAccountKey,
  compactChatRuntimeSnapshot as compactChatRuntimeSnapshotForSession,
  normalizeChatAccountKey,
  safeLocalStorageGet,
  safeLocalStorageRemove,
  safeLocalStorageSet,
  safeSessionStorageGet,
  safeSessionStorageRemove,
  safeSessionStorageSet
} from './chat-session-state.js?v=20260519a';

export function createChatRuntimeStateController(options = {}) {
  const state = options.state && typeof options.state === 'object' ? options.state : {};
  const els = options.els && typeof options.els === 'object' ? options.els : {};
  const windowRef = options.window || globalThis.window || {};
  const runtimeStateKey = String(options.runtimeStateKey || 'cait.chat.runtimeState.v1');
  const oauthReturnStateKey = String(options.oauthReturnStateKey || 'cait.chat.oauthReturnState.v1');
  const runtimeStateMaxAgeMs = Number(options.runtimeStateMaxAgeMs || 0) || 12 * 60 * 60 * 1000;
  const oauthReturnMaxAgeMs = Number(options.oauthReturnMaxAgeMs || 0) || 60 * 60 * 1000;
  const returnPath = String(options.returnPath || '/chat');
  const api = typeof options.api === 'function' ? options.api : async () => ({});
  const activeActorLabel = typeof options.activeActorLabel === 'function' ? options.activeActorLabel : ((fallback = 'CAIt') => fallback);
  const appendMessage = typeof options.appendMessage === 'function' ? options.appendMessage : (() => {});
  const appendTextMessage = typeof options.appendTextMessage === 'function' ? options.appendTextMessage : (() => {});
  const bumpChatViewRevision = typeof options.bumpChatViewRevision === 'function' ? options.bumpChatViewRevision : (() => 0);
  const chatSessionTitle = typeof options.chatSessionTitle === 'function' ? options.chatSessionTitle : (() => 'New chat');
  const chatText = typeof options.chatText === 'function' ? options.chatText : ((en) => en);
  const chatWelcomeText = typeof options.chatWelcomeText === 'function' ? options.chatWelcomeText : (() => 'What do you want done?');
  const clearActiveOrderMemory = typeof options.clearActiveOrderMemory === 'function' ? options.clearActiveOrderMemory : (() => {});
  const compactTransferObject = typeof options.compactTransferObject === 'function' ? options.compactTransferObject : ((value) => value);
  const currentChatReturnPath = typeof options.currentChatReturnPath === 'function' ? options.currentChatReturnPath : (() => returnPath);
  const currentChatSessionPayload = typeof options.currentChatSessionPayload === 'function' ? options.currentChatSessionPayload : (() => null);
  const ensureChatSessionId = typeof options.ensureChatSessionId === 'function' ? options.ensureChatSessionId : (() => '');
  const isoNow = typeof options.isoNow === 'function' ? options.isoNow : (() => new Date().toISOString());
  const normalizeChatSession = typeof options.normalizeChatSession === 'function' ? options.normalizeChatSession : ((session) => session || null);
  const orderConfirmationHtml = typeof options.orderConfirmationHtml === 'function' ? options.orderConfirmationHtml : (() => '');
  const rememberTrackedOrder = typeof options.rememberTrackedOrder === 'function' ? options.rememberTrackedOrder : (() => {});
  const renderActiveLeaderStatus = typeof options.renderActiveLeaderStatus === 'function' ? options.renderActiveLeaderStatus : (() => {});
  const renderChatSessionSidebar = typeof options.renderChatSessionSidebar === 'function' ? options.renderChatSessionSidebar : (() => {});
  const renderRestoredSessionOrderContext = typeof options.renderRestoredSessionOrderContext === 'function' ? options.renderRestoredSessionOrderContext : async () => {};
  const restoredSessionHasActiveWork = typeof options.restoredSessionHasActiveWork === 'function' ? options.restoredSessionHasActiveWork : (() => false);
  const restoreRequestedChatSessionFromHistoryController = typeof options.restoreRequestedChatSessionFromHistoryController === 'function'
    ? options.restoreRequestedChatSessionFromHistoryController
    : (() => false);
  const startDeliveryBackfillLoop = typeof options.startDeliveryBackfillLoop === 'function' ? options.startDeliveryBackfillLoop : (() => {});
  const startPolling = typeof options.startPolling === 'function' ? options.startPolling : (() => {});
  const stopProgressNarratorAnimation = typeof options.stopProgressNarratorAnimation === 'function' ? options.stopProgressNarratorAnimation : (() => {});
  const upsertChatSession = typeof options.upsertChatSession === 'function' ? options.upsertChatSession : (() => null);
  const updateComposerMode = typeof options.updateComposerMode === 'function' ? options.updateComposerMode : (() => {});

  let pendingServerChatSessionSnapshot = null;
  let chatSessionSnapshotTimer = null;

  function safeJsonClone(value = null, fallbackOptions = {}) {
    if (value == null) return null;
    try {
      return JSON.parse(JSON.stringify(value));
    } catch {
      return compactTransferObject(value, fallbackOptions);
    }
  }

  function currentChatAccountKey() {
    return normalizeChatAccountKey(state.authAccountKey || authAccountKey(state.auth || {}));
  }

  function chatRestoreRequestFromUrl() {
    try {
      const url = new URL(windowRef.location.href);
      return {
        requested: url.searchParams.get('cait_restore_chat') === '1'
          || url.searchParams.has('cait_chat_session_id')
          || url.searchParams.has('cait_order_id'),
        sessionId: String(url.searchParams.get('cait_chat_session_id') || '').trim(),
        orderId: String(url.searchParams.get('cait_order_id') || '').trim()
      };
    } catch {
      return { requested: false, sessionId: '', orderId: '' };
    }
  }

  function clearChatRestoreParamsFromUrl() {
    try {
      const url = new URL(windowRef.location.href);
      for (const key of ['cait_restore_chat', 'cait_chat_session_id', 'cait_order_id']) {
        url.searchParams.delete(key);
      }
      windowRef.history.replaceState(windowRef.history.state, '', `${url.pathname}${url.search}${url.hash}`);
    } catch {}
  }

  function persistRuntimeChatSession() {
    const session = currentChatSessionPayload();
    if (!session) return null;
    upsertChatSession(session);
    saveChatRuntimeState('runtime_session');
    renderChatSessionSidebar();
    return session;
  }

  function chatRuntimeStateSnapshot(reason = '') {
    const hasRuntimeState = Boolean(state.chatMessages.length || state.orderId || state.pendingIntake || state.draft);
    const sessionId = ensureChatSessionId({ force: hasRuntimeState });
    let session = currentChatSessionPayload();
    if (!session && sessionId && state.chatMessages.length) {
      session = normalizeChatSession({
        id: sessionId,
        sessionId,
        title: chatSessionTitle(state.chatMessages),
        messages: state.chatMessages.slice(-80),
        linkedOrderId: state.orderId,
        activeJobIds: [],
        activeWork: false,
        createdAt: state.chatMessages[0]?.ts || isoNow(),
        updatedAt: isoNow()
      });
    }
    if (session && state.orderId) {
      session = normalizeChatSession({
        ...session,
        linkedOrderId: session.linkedOrderId || state.orderId,
        activeJobIds: [],
        relatedOrderIds: [...new Set([
          ...(Array.isArray(session.relatedOrderIds) ? session.relatedOrderIds : []),
          state.orderId
        ].filter(Boolean))],
        activeWork: false,
        updatedAt: isoNow()
      });
    }
    return {
      version: 1,
      accountKey: currentChatAccountKey(),
      savedAt: isoNow(),
      reason: String(reason || '').slice(0, 80),
      returnPath: currentChatReturnPath({ includeRestoreParams: false }),
      currentChatSessionId: sessionId,
      session,
      orderId: String(state.orderId || session?.linkedOrderId || '').trim(),
      trackedOrderIds: [...state.trackedOrderIds].slice(-20),
      pendingIntake: safeJsonClone(state.pendingIntake, { depth: 6, maxText: 2000, maxArray: 24 }),
      draft: safeJsonClone(state.draft, { depth: 7, maxText: 2600, maxArray: 24 }),
      pendingAppContext: safeJsonClone(state.pendingAppContext, { depth: 5, maxText: 1600, maxArray: 16 }),
      activeOwner: safeJsonClone(state.activeOwner, { depth: 4, maxText: 900, maxArray: 12 }),
      activeOwnerLocked: Boolean(state.activeOwnerLocked && state.activeOwner?.taskType),
      activeLeader: safeJsonClone(state.activeLeader, { depth: 4, maxText: 900, maxArray: 12 }),
      activeLeaderLocked: Boolean(state.activeLeaderLocked && state.activeLeader?.taskType),
      pendingLeaderChange: safeJsonClone(state.pendingLeaderChange, { depth: 3, maxText: 1000, maxArray: 4 }),
      conversationLanguage: String(state.conversationLanguage || '').trim(),
      promptValue: String(els.promptInput?.value || '').slice(0, 8000)
    };
  }

  function saveChatOAuthReturnState(reason = 'oauth') {
    return saveChatRuntimeSnapshot(oauthReturnStateKey, reason);
  }

  function saveChatRuntimeSnapshot(key = runtimeStateKey, reason = 'runtime') {
    const snapshot = chatRuntimeStateSnapshot(reason);
    return saveChatRuntimeSnapshotObject(key, snapshot);
  }

  function compactChatRuntimeSnapshot(snapshot = {}) {
    return compactChatRuntimeSnapshotForSession(snapshot, {
      normalizeChatSession,
      currentAccountKey: currentChatAccountKey(),
      returnPath,
      nowIso: isoNow
    });
  }

  function saveChatRuntimeSnapshotObject(key = runtimeStateKey, snapshot = {}) {
    let serialized = '';
    try {
      serialized = JSON.stringify(snapshot);
    } catch {
      return false;
    }
    if (serialized.length > 700_000) {
      try {
        serialized = JSON.stringify({
          ...snapshot,
          pendingIntake: compactTransferObject(snapshot.pendingIntake, { depth: 5, maxText: 1400, maxArray: 16 }),
          draft: compactTransferObject(snapshot.draft, { depth: 5, maxText: 1400, maxArray: 16 }),
          pendingAppContext: compactTransferObject(snapshot.pendingAppContext, { depth: 4, maxText: 900, maxArray: 12 })
        });
      } catch {
        return false;
      }
    }
    const savedSession = safeSessionStorageSet(key, serialized);
    if (key !== runtimeStateKey) return savedSession;
    const savedLocal = safeLocalStorageSet(key, serialized);
    if (savedSession || savedLocal) return true;
    try {
      const compactSerialized = JSON.stringify(compactChatRuntimeSnapshot(snapshot));
      return safeSessionStorageSet(key, compactSerialized) || safeLocalStorageSet(key, compactSerialized);
    } catch {
      return false;
    }
  }

  function saveChatRuntimeState(reason = 'runtime') {
    const snapshot = chatRuntimeStateSnapshot(reason);
    const hasSession = Boolean(snapshot?.session?.messages?.length);
    const hasActiveState = Boolean(snapshot?.orderId || snapshot?.pendingIntake || snapshot?.draft || snapshot?.promptValue);
    if (!hasSession && !hasActiveState) return false;
    queueServerChatSessionSnapshot(snapshot, {
      immediate: /beforeunload|order|restore/i.test(String(reason || '')),
      delayMs: 1000
    });
    return saveChatRuntimeSnapshotObject(runtimeStateKey, snapshot);
  }

  function clearChatRuntimeState() {
    safeSessionStorageRemove(runtimeStateKey);
    safeLocalStorageRemove(runtimeStateKey);
  }

  function clearQueuedChatSessionSnapshot() {
    pendingServerChatSessionSnapshot = null;
    if (chatSessionSnapshotTimer) windowRef.clearTimeout(chatSessionSnapshotTimer);
    chatSessionSnapshotTimer = null;
  }

  function stopChatRuntimeTimers() {
    if (state.polling) windowRef.clearInterval(state.polling);
    if (state.deliveryBackfill) windowRef.clearInterval(state.deliveryBackfill);
    if (state.oauthPopupMonitor) windowRef.clearInterval(state.oauthPopupMonitor);
    if (state.authRefreshRetryTimer) windowRef.clearTimeout(state.authRefreshRetryTimer);
    state.polling = null;
    state.deliveryBackfill = null;
    state.oauthPopupMonitor = null;
    state.authRefreshRetryTimer = null;
  }

  function purgeChatStateForAccountBoundary(reason = 'account_boundary') {
    state.accountBoundaryRevision = (Number(state.accountBoundaryRevision) || 0) + 1;
    stopChatRuntimeTimers();
    stopProgressNarratorAnimation();
    state.pendingChatRestoreSnapshot = null;
    state.restoredRuntimeAccountKey = '';
    state.currentChatSessionId = '';
    state.chatMessages = [];
    state.chatSessions = [];
    state.lastTranscriptPrompt = '';
    state.lastTranscriptId = '';
    state.pendingIntake = null;
    state.draft = null;
    state.pendingAppContext = null;
    state.activeOwner = null;
    state.activeOwnerLocked = false;
    state.activeLeader = null;
    state.activeLeaderLocked = false;
    state.pendingLeaderChange = null;
    state.conversationLanguage = '';
    state.chatSessionHistoryFetchedAt = 0;
    state.chatSessionHistoryRequest = null;
    state.draftRevision += 1;
    clearActiveOrderMemory();
    clearQueuedChatSessionSnapshot();
    clearChatRuntimeState();
    safeSessionStorageRemove(oauthReturnStateKey);
    clearChatRestoreParamsFromUrl();
    if (els.promptInput) els.promptInput.value = '';
    if (els.chatThread) {
      els.chatThread.innerHTML = '';
      appendTextMessage('assistant', chatWelcomeText(), { record: false });
    }
    renderActiveLeaderStatus();
    updateComposerMode();
    renderChatSessionSidebar();
    return reason;
  }

  function serverChatSessionPayload(snapshot = {}) {
    const session = normalizeChatSession(snapshot.session || {});
    if (!session) return null;
    return {
      accountKey: normalizeChatAccountKey(snapshot.accountKey || currentChatAccountKey()),
      session,
      orderId: String(snapshot.orderId || session.linkedOrderId || '').trim(),
      trackedOrderIds: Array.isArray(snapshot.trackedOrderIds) ? snapshot.trackedOrderIds.slice(-40) : []
    };
  }

  async function flushServerChatSessionSnapshot() {
    const payload = pendingServerChatSessionSnapshot;
    pendingServerChatSessionSnapshot = null;
    if (!payload) return false;
    try {
      await api('/api/chat-sessions', {
        method: 'POST',
        body: JSON.stringify(payload),
        timeoutMs: 8000
      });
      state.chatSessionHistoryFetchedAt = 0;
      return true;
    } catch {
      return false;
    }
  }

  function queueServerChatSessionSnapshot(snapshot = {}, snapshotOptions = {}) {
    const payload = serverChatSessionPayload(snapshot);
    if (!payload?.session?.id) return false;
    pendingServerChatSessionSnapshot = payload;
    if (chatSessionSnapshotTimer) windowRef.clearTimeout(chatSessionSnapshotTimer);
    if (snapshotOptions.immediate === true) {
      chatSessionSnapshotTimer = null;
      void flushServerChatSessionSnapshot();
      return true;
    }
    chatSessionSnapshotTimer = windowRef.setTimeout(() => {
      chatSessionSnapshotTimer = null;
      void flushServerChatSessionSnapshot();
    }, Math.max(400, Number(snapshotOptions.delayMs || 1200) || 1200));
    return true;
  }

  function restoreChatMessagesFromSession(session = null) {
    const messages = Array.isArray(session?.messages) ? session.messages : [];
    els.chatThread.innerHTML = '';
    if (messages.length) {
      for (const message of messages) {
        appendTextMessage(message.role || 'assistant', message.body || '', {
          tone: message.tone || '',
          label: message.label || '',
          record: false
        });
      }
    } else {
      appendTextMessage('assistant', chatWelcomeText(), { record: false });
    }
  }

  function applyRestoredChatSnapshot(snapshot = {}, request = {}) {
    const session = normalizeChatSession(snapshot.session || {});
    if (!session && !snapshot.orderId && !snapshot.pendingIntake && !snapshot.draft) return false;
    state.restoredRuntimeAccountKey = chatSnapshotAccountKey(snapshot);
    const viewRevision = bumpChatViewRevision();
    if (state.polling) windowRef.clearInterval(state.polling);
    stopProgressNarratorAnimation();
    state.polling = null;
    state.progressNarratorArticle = null;
    state.progressNarratorKey = '';
    state.progressMapArticle = null;
    state.progressMapKey = '';
    state.liveProgressStoppedOrderIds.clear();
    state.currentChatSessionId = session?.id || String(snapshot.currentChatSessionId || request.sessionId || '').trim();
    state.chatMessages = (Array.isArray(session?.messages) ? session.messages : []).slice(-80);
    state.lastTranscriptPrompt = '';
    state.lastTranscriptId = '';
    state.pendingIntake = snapshot.pendingIntake && typeof snapshot.pendingIntake === 'object' ? snapshot.pendingIntake : null;
    state.draft = snapshot.draft && typeof snapshot.draft === 'object' ? snapshot.draft : null;
    state.pendingAppContext = snapshot.pendingAppContext && typeof snapshot.pendingAppContext === 'object' ? snapshot.pendingAppContext : null;
    state.activeOwner = snapshot.activeOwner && typeof snapshot.activeOwner === 'object'
      ? snapshot.activeOwner
      : (session?.activeOwner && typeof session.activeOwner === 'object' ? session.activeOwner : null);
    state.activeOwnerLocked = Boolean((snapshot.activeOwnerLocked || session?.activeOwnerLocked) && state.activeOwner?.taskType);
    state.activeLeader = snapshot.activeLeader && typeof snapshot.activeLeader === 'object' ? snapshot.activeLeader : (state.activeOwner?.type === 'leader' ? state.activeOwner : null);
    state.activeLeaderLocked = Boolean((snapshot.activeLeaderLocked || session?.activeLeaderLocked) && state.activeLeader?.taskType);
    state.pendingLeaderChange = snapshot.pendingLeaderChange && typeof snapshot.pendingLeaderChange === 'object' ? snapshot.pendingLeaderChange : null;
    state.conversationLanguage = String(snapshot.conversationLanguage || '').trim();
    state.draftRevision += 1;
    clearActiveOrderMemory();
    state.orderId = String(snapshot.orderId || session?.linkedOrderId || request.orderId || '').trim();
    if (Array.isArray(snapshot.trackedOrderIds)) {
      for (const id of snapshot.trackedOrderIds) rememberTrackedOrder(id);
    }
    if (state.orderId) rememberTrackedOrder(state.orderId);
    if (session) upsertChatSession(session);
    restoreChatMessagesFromSession(session);
    if (state.draft && !els.chatThread.querySelector('[data-chat-action="send-order"]')) {
      appendMessage('assistant', orderConfirmationHtml(), { tone: 'ok', label: activeActorLabel('Order check'), record: false });
    }
    if (els.promptInput && snapshot.promptValue) els.promptInput.value = String(snapshot.promptValue || '');
    renderActiveLeaderStatus();
    updateComposerMode();
    renderChatSessionSidebar();
    const restoredFromReload = /^runtime/i.test(String(snapshot.reason || ''));
    appendTextMessage('system', chatText(
      restoredFromReload
        ? 'Chat restored. Loading current Order state.'
        : 'Returned from Google connection. Chat restored and current Order state is loading.',
      restoredFromReload
        ? 'チャットを復元しました。現在のOrder状態を読み込みます。'
        : 'Google接続から戻りました。チャットを復元し、現在のOrder状態を読み込みます。',
      state.chatMessages[0]?.body || state.conversationLanguage
    ), { label: 'Chat restored', record: false });
    if (session) void renderRestoredSessionOrderContext(session, {
      viewRevision,
      sessionId: session.id || session.sessionId,
      resumeActiveWork: true
    });
    if (!session && state.orderId && restoredSessionHasActiveWork({}, snapshot)) startPolling(state.orderId);
    startDeliveryBackfillLoop({ maxRuns: 6, renderTerminalDeliveries: false, notifyMilestones: false });
    return true;
  }

  function restoreChatSnapshotForCurrentAccount(snapshot = {}, request = {}, restoreOptions = {}) {
    const snapshotKey = chatSnapshotAccountKey(snapshot);
    const currentKey = currentChatAccountKey();
    const storageKey = String(restoreOptions.storageKey || runtimeStateKey);
    if (!snapshotKey) {
      if (storageKey === oauthReturnStateKey) safeSessionStorageRemove(oauthReturnStateKey);
      else clearChatRuntimeState();
      return false;
    }
    if (!currentKey) {
      state.restoredRuntimeAccountKey = snapshotKey;
      state.pendingChatRestoreSnapshot = {
        snapshot,
        request: request && typeof request === 'object' ? request : {},
        storageKey
      };
      return false;
    }
    if (snapshotKey !== currentKey) {
      if (storageKey === oauthReturnStateKey) safeSessionStorageRemove(oauthReturnStateKey);
      else clearChatRuntimeState();
      state.pendingChatRestoreSnapshot = null;
      state.restoredRuntimeAccountKey = '';
      return false;
    }
    const restored = applyRestoredChatSnapshot(snapshot, request);
    if (restored) {
      if (storageKey === oauthReturnStateKey) safeSessionStorageRemove(oauthReturnStateKey);
      state.pendingChatRestoreSnapshot = null;
      state.restoredRuntimeAccountKey = '';
    }
    return restored;
  }

  function restorePendingChatSnapshotForCurrentAccount() {
    const pending = state.pendingChatRestoreSnapshot;
    if (!pending?.snapshot) return false;
    return restoreChatSnapshotForCurrentAccount(pending.snapshot, pending.request || {}, {
      storageKey: pending.storageKey || runtimeStateKey
    });
  }

  function restoreChatOAuthReturnStateFromUrl() {
    const request = chatRestoreRequestFromUrl();
    if (!request.requested) return false;
    const raw = safeSessionStorageGet(oauthReturnStateKey);
    if (!raw) return false;
    let snapshot = null;
    try {
      snapshot = JSON.parse(raw);
    } catch {
      safeSessionStorageRemove(oauthReturnStateKey);
      return false;
    }
    if (chatSessionSnapshotExpired(snapshot, oauthReturnMaxAgeMs)) {
      safeSessionStorageRemove(oauthReturnStateKey);
      return false;
    }
    const savedSessionId = String(snapshot?.session?.id || snapshot?.session?.sessionId || snapshot?.currentChatSessionId || '').trim();
    if (request.sessionId && savedSessionId && request.sessionId !== savedSessionId) return false;
    const restored = restoreChatSnapshotForCurrentAccount(snapshot, request, {
      storageKey: oauthReturnStateKey
    });
    if (restored) {
      safeSessionStorageRemove(oauthReturnStateKey);
      clearChatRestoreParamsFromUrl();
    }
    return restored;
  }

  function restoreChatRuntimeState() {
    const raw = safeSessionStorageGet(runtimeStateKey) || safeLocalStorageGet(runtimeStateKey);
    if (!raw) return false;
    let snapshot = null;
    try {
      snapshot = JSON.parse(raw);
    } catch {
      clearChatRuntimeState();
      return false;
    }
    if (chatSessionSnapshotExpired(snapshot, runtimeStateMaxAgeMs)) {
      clearChatRuntimeState();
      return false;
    }
    return restoreChatSnapshotForCurrentAccount({ ...snapshot, reason: snapshot.reason || 'runtime_reload' }, {}, {
      storageKey: runtimeStateKey
    });
  }

  function restoreRequestedChatSessionFromHistory() {
    return restoreRequestedChatSessionFromHistoryController(chatRestoreRequestFromUrl());
  }

  return {
    authAccountKey,
    chatRestoreRequestFromUrl,
    clearChatRestoreParamsFromUrl,
    clearChatRuntimeState,
    clearQueuedChatSessionSnapshot,
    currentChatAccountKey,
    persistRuntimeChatSession,
    purgeChatStateForAccountBoundary,
    restoreChatOAuthReturnStateFromUrl,
    restoreChatRuntimeState,
    restorePendingChatSnapshotForCurrentAccount,
    restoreRequestedChatSessionFromHistory,
    saveChatOAuthReturnState,
    saveChatRuntimeState
  };
}
