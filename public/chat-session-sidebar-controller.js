export function createChatSessionSidebarController(options = {}) {
  const state = options.state && typeof options.state === 'object' ? options.state : {};
  const els = options.els && typeof options.els === 'object' ? options.els : {};
  const windowRef = options.window || globalThis.window || {};
  const api = typeof options.api === 'function' ? options.api : async () => ({});
  const compact = typeof options.compact === 'function' ? options.compact : ((value = '', max = 96) => String(value || '').slice(0, max));
  const escapeHtml = typeof options.escapeHtml === 'function' ? options.escapeHtml : ((value = '') => String(value || ''));
  const isoNow = typeof options.isoNow === 'function' ? options.isoNow : (() => new Date().toISOString());
  const normalizeChatSession = typeof options.normalizeChatSession === 'function' ? options.normalizeChatSession : ((session) => session || null);
  const currentChatSessionPayload = typeof options.currentChatSessionPayload === 'function' ? options.currentChatSessionPayload : (() => null);
  const upsertChatSession = typeof options.upsertChatSession === 'function' ? options.upsertChatSession : (() => null);
  const ensureChatSessionId = typeof options.ensureChatSessionId === 'function' ? options.ensureChatSessionId : (() => '');
  const makeChatTranscriptId = typeof options.makeChatTranscriptId === 'function' ? options.makeChatTranscriptId : (() => `chat_turn_${Date.now().toString(36)}`);
  const chatSessionTitle = typeof options.chatSessionTitle === 'function' ? options.chatSessionTitle : (() => 'Saved chat');
  const chatSessionOrderIds = typeof options.chatSessionOrderIds === 'function' ? options.chatSessionOrderIds : (() => []);
  const restoredSessionHasActiveWork = typeof options.restoredSessionHasActiveWork === 'function' ? options.restoredSessionHasActiveWork : (() => false);
  const renderRestoredSessionOrderContext = typeof options.renderRestoredSessionOrderContext === 'function' ? options.renderRestoredSessionOrderContext : async () => {};
  const startPolling = typeof options.startPolling === 'function' ? options.startPolling : (() => {});
  const rememberTrackedOrder = typeof options.rememberTrackedOrder === 'function' ? options.rememberTrackedOrder : (() => {});
  const stopProgressNarratorAnimation = typeof options.stopProgressNarratorAnimation === 'function' ? options.stopProgressNarratorAnimation : (() => {});
  const clearActiveOrderMemory = typeof options.clearActiveOrderMemory === 'function' ? options.clearActiveOrderMemory : (() => {});
  const clearChatRuntimeState = typeof options.clearChatRuntimeState === 'function' ? options.clearChatRuntimeState : (() => {});
  const clearQueuedChatSessionSnapshot = typeof options.clearQueuedChatSessionSnapshot === 'function' ? options.clearQueuedChatSessionSnapshot : (() => {});
  const clearChatRestoreParamsFromUrl = typeof options.clearChatRestoreParamsFromUrl === 'function' ? options.clearChatRestoreParamsFromUrl : (() => {});
  const bumpChatViewRevision = typeof options.bumpChatViewRevision === 'function' ? options.bumpChatViewRevision : (() => 0);
  const renderActiveLeaderStatus = typeof options.renderActiveLeaderStatus === 'function' ? options.renderActiveLeaderStatus : (() => {});
  const appendTextMessage = typeof options.appendTextMessage === 'function' ? options.appendTextMessage : (() => {});
  const appendMessage = typeof options.appendMessage === 'function' ? options.appendMessage : (() => {});
  const orderConfirmationHtml = typeof options.orderConfirmationHtml === 'function' ? options.orderConfirmationHtml : (() => '');
  const orderErrorMessage = typeof options.orderErrorMessage === 'function' ? options.orderErrorMessage : ((error) => String(error?.message || error || 'Unable to load chat history.'));
  const chatText = typeof options.chatText === 'function' ? options.chatText : ((en) => en);
  const chatWelcomeText = typeof options.chatWelcomeText === 'function' ? options.chatWelcomeText : (() => 'What do you want done?');
  const updateComposerMode = typeof options.updateComposerMode === 'function' ? options.updateComposerMode : (() => {});
  const saveChatRuntimeState = typeof options.saveChatRuntimeState === 'function' ? options.saveChatRuntimeState : (() => false);
  const persistRuntimeChatSession = typeof options.persistRuntimeChatSession === 'function' ? options.persistRuntimeChatSession : (() => null);
  const applyAuthState = typeof options.applyAuthState === 'function' ? options.applyAuthState : (() => {});

  function chatSessionTimeLabel(value = '') {
    if (!Number.isFinite(Date.parse(value))) return 'saved';
    return new Date(value).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function chatSessionFromMemory(item = {}) {
    const prompt = String(item.prompt || '').trim();
    const answer = String(item.answer || '').trim();
    const sessionId = String(item.sessionId || item.id || '').trim();
    const messages = Array.isArray(item.messages) ? item.messages : [];
    if (!sessionId || (!prompt && !answer && !messages.length)) return null;
    const createdAt = String(item.createdAt || item.updatedAt || isoNow()).trim();
    return normalizeChatSession({
      id: sessionId,
      sessionId,
      title: String(item.title || '').trim() || prompt || answer || 'Saved chat',
      activeWork: Boolean(item.activeWork),
      linkedOrderId: String(item.linkedOrderId || '').trim(),
      activeJobIds: Array.isArray(item.activeJobIds) ? item.activeJobIds : [],
      relatedOrderIds: Array.isArray(item.relatedOrderIds) ? item.relatedOrderIds : [],
      createdAt,
      updatedAt: String(item.updatedAt || createdAt).trim(),
      messages: messages.length ? messages : [
        ...(prompt ? [{ role: 'user', body: prompt, ts: createdAt }] : []),
        ...(answer ? [{ role: 'assistant', body: answer, tone: item.status === 'blocked' ? 'warn' : 'info', ts: item.updatedAt || createdAt }] : [])
      ]
    });
  }

  function renderChatSessionSidebar() {
    if (!els.chatSessionList) return;
    const current = currentChatSessionPayload();
    const sessions = [
      ...(current ? [current] : []),
      ...(Array.isArray(state.chatSessions) ? state.chatSessions : []).filter((session) => !current || (session.id !== current.id && session.sessionId !== current.sessionId))
    ]
      .map(normalizeChatSession)
      .filter(Boolean)
      .sort((left, right) => {
        if (left.id === state.currentChatSessionId) return -1;
        if (right.id === state.currentChatSessionId) return 1;
        return String(right.updatedAt || '').localeCompare(String(left.updatedAt || ''));
      })
      .slice(0, 200);
    if (els.chatSessionSidebar) {
      els.chatSessionSidebar.classList.toggle('mobile-open', Boolean(state.chatSidebarOpen));
    }
    if (els.chatSessionStatus) {
      if (sessions.length) {
        const savedCount = Math.max(0, sessions.length - (current ? 1 : 0));
        els.chatSessionStatus.textContent = savedCount ? `${savedCount} saved chat${savedCount === 1 ? '' : 's'}` : 'Current chat';
      } else if (state.auth?.loggedIn || state.auth?.user || state.auth?.login) {
        els.chatSessionStatus.textContent = 'No saved chats yet';
      } else {
        els.chatSessionStatus.textContent = 'Sign in to restore chats';
      }
    }
    if (!sessions.length) {
      els.chatSessionList.innerHTML = '<div class="empty-session-list">Start a chat and it will appear here. Signed-in chat memory is restored from your account.</div>';
      return;
    }
    els.chatSessionList.innerHTML = sessions.map((session) => {
      const active = session.id === state.currentChatSessionId || session.sessionId === state.currentChatSessionId;
      const messageCount = Array.isArray(session.messages) ? session.messages.length : 0;
      const activeWork = session.activeWork ? ' / live order' : '';
      return [
        `<div class="chat-session-row ${active ? 'active' : ''}">`,
        `<button type="button" class="chat-session-item" data-chat-session-id="${escapeHtml(session.id)}" aria-current="${active ? 'true' : 'false'}">`,
        `<span class="chat-session-title">${escapeHtml(session.title || 'New chat')}</span>`,
        `<span class="chat-session-meta">${escapeHtml(`${chatSessionTimeLabel(session.updatedAt)} / ${messageCount} msg${activeWork}`)}</span>`,
        '</button>',
        `<button type="button" class="chat-session-delete" data-chat-session-delete="${escapeHtml(session.id)}" aria-label="Delete chat">x</button>`,
        '</div>'
      ].join('');
    }).join('\n');
  }

  function startNewChatSession() {
    bumpChatViewRevision();
    stopProgressNarratorAnimation();
    state.currentChatSessionId = '';
    state.chatMessages = [];
    state.lastTranscriptPrompt = '';
    state.lastTranscriptId = '';
    state.draft = null;
    state.pendingIntake = null;
    state.activeOwner = null;
    state.activeOwnerLocked = false;
    state.activeLeader = null;
    state.activeLeaderLocked = false;
    state.pendingLeaderChange = null;
    state.pendingAppContext = null;
    state.conversationLanguage = '';
    state.draftRevision += 1;
    clearActiveOrderMemory();
    clearChatRuntimeState();
    clearQueuedChatSessionSnapshot();
    clearChatRestoreParamsFromUrl();
    if (els.promptInput) els.promptInput.value = '';
    if (els.chatThread) els.chatThread.innerHTML = '';
    renderActiveLeaderStatus();
    appendTextMessage('assistant', chatWelcomeText(), { record: false });
    updateComposerMode();
    renderChatSessionSidebar();
  }

  function loadChatSession(sessionId = '', options = {}) {
    const session = (Array.isArray(state.chatSessions) ? state.chatSessions : [])
      .find((item) => item.id === sessionId || item.sessionId === sessionId);
    if (!session) return;
    const viewRevision = bumpChatViewRevision();
    if (state.polling) windowRef.clearInterval(state.polling);
    stopProgressNarratorAnimation();
    state.polling = null;
    state.progressNarratorArticle = null;
    state.progressNarratorKey = '';
    state.liveProgressStoppedOrderIds.clear();
    state.currentChatSessionId = session.id;
    state.chatMessages = (Array.isArray(session.messages) ? session.messages : []).slice(-80);
    state.lastTranscriptPrompt = '';
    state.lastTranscriptId = '';
    state.draft = null;
    state.pendingIntake = null;
    state.activeOwner = session.activeOwner && typeof session.activeOwner === 'object'
      ? session.activeOwner
      : (session.activeLeader && typeof session.activeLeader === 'object' ? { type: 'leader', ...session.activeLeader } : null);
    state.activeOwnerLocked = Boolean(session.activeOwnerLocked && state.activeOwner?.taskType);
    state.activeLeader = session.activeLeader && typeof session.activeLeader === 'object' ? session.activeLeader : (state.activeOwner?.type === 'leader' ? state.activeOwner : null);
    state.activeLeaderLocked = Boolean(session.activeLeaderLocked && state.activeLeader?.taskType);
    state.pendingLeaderChange = null;
    state.draftRevision += 1;
    clearActiveOrderMemory();
    state.orderId = session.linkedOrderId || '';
    for (const id of chatSessionOrderIds(session)) {
      const safeId = String(id || '').trim();
      if (safeId) state.trackedOrderIds.add(safeId);
    }
    if (els.chatThread) els.chatThread.innerHTML = '';
    if (state.chatMessages.length) {
      for (const message of state.chatMessages) {
        appendTextMessage(message.role || 'assistant', message.body || '', {
          tone: message.tone || '',
          label: message.label || '',
          record: false
        });
      }
    } else {
      appendTextMessage('assistant', chatWelcomeText(), { record: false });
    }
    renderActiveLeaderStatus();
    updateComposerMode();
    renderChatSessionSidebar();
    state.chatSidebarOpen = false;
    renderChatSessionSidebar();
    void renderRestoredSessionOrderContext(session, {
      viewRevision,
      sessionId: session.id || session.sessionId,
      resumeActiveWork: options.resumeActiveWork === true
    });
  }

  function deleteChatSession(sessionId = '') {
    const safeId = String(sessionId || '').trim();
    if (!safeId) return;
    state.chatSessions = (Array.isArray(state.chatSessions) ? state.chatSessions : [])
      .filter((session) => session.id !== safeId && session.sessionId !== safeId);
    void api(`/api/settings/chat-memory/${encodeURIComponent(safeId)}`, { method: 'DELETE' })
      .then(() => { state.chatSessionHistoryFetchedAt = 0; })
      .catch(() => {});
    if (state.currentChatSessionId === safeId) startNewChatSession();
    renderChatSessionSidebar();
  }

  function chatSessionHistoryApiPath() {
    return '/api/chat-memory?limit=200';
  }

  async function refreshChatSessionHistory(options = {}) {
    const force = options.force === true;
    if (!force && state.chatSessionHistoryFetchedAt && Date.now() - state.chatSessionHistoryFetchedAt < 60_000) return state.chatSessions;
    if (state.chatSessionHistoryRequest) return state.chatSessionHistoryRequest;
    const requestBoundaryRevision = Number(state.accountBoundaryRevision) || 0;
    state.chatSessionHistoryRequest = api(chatSessionHistoryApiPath(), { method: 'GET' })
      .then((result) => {
        if (requestBoundaryRevision !== (Number(state.accountBoundaryRevision) || 0)) return state.chatSessions;
        if (result?.auth && typeof result.auth === 'object') applyAuthState(result.auth);
        const serverSessions = (Array.isArray(result?.chatMemory) ? result.chatMemory : [])
          .map(chatSessionFromMemory)
          .filter(Boolean);
        const currentSession = currentChatSessionPayload();
        state.chatSessions = currentSession ? [currentSession] : [];
        for (const session of serverSessions) upsertChatSession(session);
        state.chatSessionHistoryFetchedAt = Date.now();
        renderChatSessionSidebar();
        return state.chatSessions;
      })
      .catch((error) => {
        if (els.chatSessionStatus) els.chatSessionStatus.textContent = orderErrorMessage(error);
        return state.chatSessions;
      })
      .finally(() => {
        state.chatSessionHistoryRequest = null;
      });
    return state.chatSessionHistoryRequest;
  }

  function recordChatSessionMessage(role, body = '', options = {}) {
    if (options.record === false) return;
    const text = compact(String(options.plainText || body || '').trim(), 4000);
    if (!text) return;
    ensureChatSessionId({ force: true });
    const message = {
      role: ['user', 'assistant', 'system'].includes(role) ? role : 'assistant',
      body: text,
      tone: String(options.tone || '').trim(),
      label: String(options.label || '').trim(),
      ts: isoNow()
    };
    state.chatMessages.push(message);
    state.chatMessages = state.chatMessages.slice(-80);
    if (message.role === 'user') {
      state.lastTranscriptPrompt = text;
      state.lastTranscriptId = makeChatTranscriptId(state.currentChatSessionId);
    } else if (state.lastTranscriptPrompt) {
      const transcriptAnswerKind = message.tone || message.role;
      const transcriptStatus = message.tone || (message.role === 'system' ? 'system' : 'ok');
      void trackChatTranscript(state.lastTranscriptPrompt, text, {
        transcriptId: makeChatTranscriptId(state.currentChatSessionId),
        answerKind: transcriptAnswerKind,
        status: transcriptStatus
      });
    }
    persistRuntimeChatSession();
  }

  async function trackChatTranscript(prompt = '', answer = '', meta = {}) {
    const cleanPrompt = String(prompt || '').trim();
    const cleanAnswer = String(answer || '').trim();
    if (!cleanPrompt && !cleanAnswer) return;
    try {
      const sessionId = ensureChatSessionId({ force: true });
      const headers = new Headers({ 'content-type': 'application/json' });
      if (state.auth?.csrfToken) headers.set('x-aiagent2-csrf', state.auth.csrfToken);
      if (state.visitorId) headers.set('x-aiagent2-visitor-id', state.visitorId);
      await fetch('/api/analytics/chat-transcripts', {
        method: 'POST',
        headers,
        credentials: 'same-origin',
        keepalive: true,
        body: JSON.stringify({
          id: String(meta.transcriptId || '').trim() || makeChatTranscriptId(sessionId),
          prompt: cleanPrompt.slice(0, 8000),
          answer: cleanAnswer.slice(0, 8000),
          answer_kind: String(meta.answerKind || 'chat').slice(0, 40),
          status: String(meta.status || '').slice(0, 80),
          session_id: sessionId,
          visitor_id: state.visitorId,
          page_path: windowRef.location.pathname || '/chat',
          current_tab: 'chat',
          source: 'chatux',
          meta: {
            source: 'chatux_session_sidebar',
            visitorId: state.visitorId
          }
        })
      });
      state.chatSessionHistoryFetchedAt = 0;
    } catch {
      // Chat transcript persistence must not block chat, intake, or order dispatch.
    }
  }

  function restoreRequestedChatSessionFromHistory(request = {}) {
    if (!request.requested || (!request.sessionId && !request.orderId)) return false;
    const session = (Array.isArray(state.chatSessions) ? state.chatSessions : []).find((item) => {
      if (request.sessionId && (item.id === request.sessionId || item.sessionId === request.sessionId)) return true;
      if (!request.orderId) return false;
      return item.linkedOrderId === request.orderId || (Array.isArray(item.relatedOrderIds) && item.relatedOrderIds.includes(request.orderId));
    });
    if (!session) {
      if (!request.orderId) return false;
      state.orderId = request.orderId;
      rememberTrackedOrder(request.orderId);
      appendTextMessage('system', chatText(
        'Order link restored. Loading current Order state.',
        'Orderリンクを復元しました。現在のOrder状態を読み込みます。',
        state.conversationLanguage
      ), { label: 'Order restored', record: false });
      startPolling(request.orderId);
      clearChatRestoreParamsFromUrl();
      saveChatRuntimeState('runtime_order_restore');
      return true;
    }
    loadChatSession(session.id || session.sessionId, { resumeActiveWork: true });
    if (request.orderId && !state.orderId) {
      state.orderId = request.orderId;
      rememberTrackedOrder(request.orderId);
      startPolling(request.orderId);
    }
    appendTextMessage('system', chatText(
      'Returned from Google connection. I restored this chat from saved history.',
      'Google接続から戻りました。保存済み履歴からこのチャットを復元しました。',
      session.messages?.[0]?.body || ''
    ), { label: 'Chat restored', record: false });
    clearChatRestoreParamsFromUrl();
    return true;
  }

  return {
    chatSessionTimeLabel,
    chatSessionFromMemory,
    renderChatSessionSidebar,
    startNewChatSession,
    loadChatSession,
    deleteChatSession,
    chatSessionHistoryApiPath,
    refreshChatSessionHistory,
    recordChatSessionMessage,
    trackChatTranscript,
    restoreRequestedChatSessionFromHistory
  };
}
