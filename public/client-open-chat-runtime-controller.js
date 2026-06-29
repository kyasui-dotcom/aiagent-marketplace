export function createClientOpenChatRuntimeController(deps = {}) {
  const {
    state,
    window,
    productShortName = 'CAIt',
    liveSnapshotRefreshMs = 5000,
    chatAnswerKind,
    looksJapanese,
    normalizeOrderProgressStatus,
    refresh,
    renderWorkChatThread,
    updateWorkChatStatusCard
  } = deps;

  let openChatTypingTimer = null;
  let liveSnapshotRefreshTimer = null;
  let openChatMessageSequence = 0;

  function makeOpenChatMessageId() {
    openChatMessageSequence += 1;
    return `open-chat-${Date.now()}-${openChatMessageSequence}`;
  }

  function clearOpenChatTypingTimer() {
    if (!openChatTypingTimer) return;
    window.clearInterval(openChatTypingTimer);
    openChatTypingTimer = null;
  }

  function finishOpenChatTyping(options = {}) {
    clearOpenChatTypingTimer();
    let changed = false;
    state.orderChatMessages = (Array.isArray(state.orderChatMessages) ? state.orderChatMessages : []).map((message) => {
      if (!message?.typing) return message;
      const { fullBody, ...rest } = message;
      changed = true;
      return { ...rest, body: String(fullBody || message.body || ''), typing: false };
    });
    if (changed && options.render !== false) renderWorkChatThread();
  }

  function shouldAnimateOpenChatAnswer(answer, answerBody = '') {
    if (!String(answerBody || '').trim()) return false;
    return chatAnswerKind(answer) !== 'command';
  }

  function startOpenChatTyping(messageId) {
    clearOpenChatTypingTimer();
    const findTypingMessage = () => (Array.isArray(state.orderChatMessages) ? state.orderChatMessages : [])
      .find((message) => message?.id === messageId && message.typing);
    const message = findTypingMessage();
    const fullBody = String(message?.fullBody || '');
    const chars = Array.from(fullBody);
    if (!message || !chars.length) {
      finishOpenChatTyping();
      return;
    }

    const intervalMs = 28;
    const targetMs = Math.max(850, Math.min(3800, chars.length * 10));
    const charsPerTick = Math.max(2, Math.ceil(chars.length / (targetMs / intervalMs)));
    let visibleChars = 0;

    openChatTypingTimer = window.setInterval(() => {
      const current = findTypingMessage();
      if (!current) {
        clearOpenChatTypingTimer();
        return;
      }
      visibleChars = Math.min(chars.length, visibleChars + charsPerTick);
      current.body = chars.slice(0, visibleChars).join('');
      if (visibleChars >= chars.length) {
        current.body = fullBody;
        current.typing = false;
        delete current.fullBody;
        clearOpenChatTypingTimer();
      }
      renderWorkChatThread();
    }, intervalMs);
  }

  function startOpenChatThinking(prompt = '') {
    finishOpenChatTyping({ render: false });
    const ja = looksJapanese(prompt);
    const messageId = makeOpenChatMessageId();
    const body = ja
      ? 'CAItが意図を整理しています'
      : 'CAIt is thinking through the request';
    state.orderChatMessages = [
      ...(Array.isArray(state.orderChatMessages) ? state.orderChatMessages : []),
      {
        id: messageId,
        role: 'agent',
        label: productShortName,
        body,
        tone: 'info',
        typing: true,
        thinking: true
      }
    ];
    updateWorkChatStatusCard(
      ja ? 'CAItが考えています。' : 'CAIt is thinking.',
      ja ? '意図を確認して、チャット回答か発注準備かを判断しています。' : 'Checking intent before choosing chat answer or order prep.',
      'info'
    );
    renderWorkChatThread();
    return messageId;
  }

  function stopOpenChatThinking(messageId = '', options = {}) {
    if (!messageId) return;
    const before = Array.isArray(state.orderChatMessages) ? state.orderChatMessages.length : 0;
    state.orderChatMessages = (Array.isArray(state.orderChatMessages) ? state.orderChatMessages : [])
      .filter((message) => !(message?.id === messageId && message.thinking));
    if (state.orderChatMessages.length !== before && options.render !== false) renderWorkChatThread();
  }

  function clearLiveSnapshotRefreshTimer() {
    if (!liveSnapshotRefreshTimer) return;
    window.clearTimeout(liveSnapshotRefreshTimer);
    liveSnapshotRefreshTimer = null;
  }

  function isActiveLiveOrderStatus(status = '') {
    return ['queued', 'claimed', 'running', 'dispatched', 'created'].includes(normalizeOrderProgressStatus(status));
  }

  function hasActiveLiveJobs(snapshot = state.snapshot || {}) {
    const jobs = Array.isArray(snapshot?.jobs) ? snapshot.jobs : [];
    return jobs.some((job) => isActiveLiveOrderStatus(job?.status || ''));
  }

  function hasActiveOpenChatOrderProgress() {
    const messages = Array.isArray(state.orderChatMessages) ? state.orderChatMessages : [];
    return messages.some((message) => {
      if (message?.pendingDispatch === true) return true;
      if (!message?.orderProgressId && !message?.workflowParentId) return false;
      return isActiveLiveOrderStatus(message?.orderProgressStatus || '');
    });
  }

  function scheduleLiveSnapshotRefresh(snapshot = state.snapshot || {}) {
    clearLiveSnapshotRefreshTimer();
    if (!hasActiveLiveJobs(snapshot)) return;
    liveSnapshotRefreshTimer = window.setTimeout(() => {
      liveSnapshotRefreshTimer = null;
      void refresh().catch(() => {});
    }, liveSnapshotRefreshMs);
  }

  return {
    clearLiveSnapshotRefreshTimer,
    finishOpenChatTyping,
    hasActiveOpenChatOrderProgress,
    makeOpenChatMessageId,
    scheduleLiveSnapshotRefresh,
    shouldAnimateOpenChatAnswer,
    startOpenChatThinking,
    startOpenChatTyping,
    stopOpenChatThinking
  };
}
