function ga4SafeString(value = '', max = 120) {
  return String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

export function createChatTelemetry(options = {}) {
  const trackedEventKeys = new Set();
  const windowRef = options.window || globalThis.window;
  const getCurrentChatSessionId = typeof options.getCurrentChatSessionId === 'function' ? options.getCurrentChatSessionId : (() => '');
  const getVisitorId = typeof options.getVisitorId === 'function' ? options.getVisitorId : (() => '');
  const getActiveLeaderTaskType = typeof options.getActiveLeaderTaskType === 'function' ? options.getActiveLeaderTaskType : (() => '');
  const chatLanguage = typeof options.chatLanguage === 'function' ? options.chatLanguage : (() => 'en');

  function trackChatGa4Event(eventName = '', params = {}) {
    try {
      if (typeof windowRef.caitTrackGa4Event !== 'function') return false;
      return windowRef.caitTrackGa4Event(eventName, {
        source: 'chat',
        chat_session_id: ga4SafeString(getCurrentChatSessionId(), 80),
        ...params
      });
    } catch {
      return false;
    }
  }

  function trackChatGa4Once(key = '', eventName = '', params = {}) {
    const safeKey = ga4SafeString(key, 160);
    if (!safeKey || trackedEventKeys.has(safeKey)) return false;
    trackedEventKeys.add(safeKey);
    return trackChatGa4Event(eventName, params);
  }

  function trackChatIntakeStarted(prompt = '', source = 'chat_submit') {
    const sessionKey = getCurrentChatSessionId() || getVisitorId() || 'anonymous';
    return trackChatGa4Once(`chat_intake_started:${sessionKey}`, 'chat_intake_started', {
      source,
      prompt_length: String(prompt || '').length,
      language: chatLanguage(prompt),
      active_leader: getActiveLeaderTaskType()
    });
  }

  return {
    trackChatGa4Event,
    trackChatGa4Once,
    trackChatIntakeStarted
  };
}
