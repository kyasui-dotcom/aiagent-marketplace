export function createChatUiRuntimeController(deps = {}) {
  const {
    state,
    window,
    document,
    normalizeUiLanguage,
    safeLocalStorageSet,
    uiLanguageStorageKey,
    welcomeText,
    welcomeTextJa,
    getEls = () => ({}),
    refreshAuth = async () => {},
    updateComposerMode = () => {},
    sleep = (ms = 0) => new Promise((resolve) => window.setTimeout(resolve, Math.max(0, Number(ms || 0))))
  } = deps;

  function looksJapanese(value = '') {
    return /[\u3040-\u30ff\u3400-\u9fff]/.test(String(value || ''));
  }

  function chatLanguage(sample = '') {
    return chatUiLanguage();
  }

  function chatText(en, ja, sample = '') {
    return chatLanguage(sample) === 'ja' ? ja : en;
  }

  function chatUiLanguage() {
    return normalizeUiLanguage(state.uiLanguage || document.documentElement?.lang || '', 'en');
  }

  function chatUiText(en, ja) {
    return chatUiLanguage() === 'ja' ? ja : en;
  }

  function chatWelcomeText() {
    return chatUiText(welcomeText, welcomeTextJa);
  }

  function syncDocumentUiLanguage() {
    const language = chatUiLanguage();
    if (document.documentElement) document.documentElement.lang = language;
    return language;
  }

  function refreshDefaultWelcomeMessage() {
    const els = getEls();
    const firstMessage = els.chatThread?.querySelector('.message.assistant .message-body');
    if (!firstMessage) return;
    const current = String(firstMessage.textContent || '').trim();
    if (current === welcomeText || current === welcomeTextJa) {
      firstMessage.textContent = chatWelcomeText();
    }
  }

  function setChatUiLanguage(value = '', options = {}) {
    const next = normalizeUiLanguage(value, 'en');
    state.uiLanguage = next;
    syncDocumentUiLanguage();
    if (options.persist !== false) safeLocalStorageSet(uiLanguageStorageKey, next);
    refreshDefaultWelcomeMessage();
    updateComposerMode();
    return next;
  }

  function detectedInputLanguage(sample = '') {
    return looksJapanese(sample) ? 'ja' : 'en';
  }

  function rememberConversationLanguage(sample = '') {
    if (!state.conversationLanguage && String(sample || '').trim()) {
      state.conversationLanguage = detectedInputLanguage(sample);
    }
    return state.conversationLanguage || chatLanguage(sample);
  }

  function unsafeApiMethod(method = 'GET') {
    return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(String(method || 'GET').toUpperCase());
  }

  function csrfRequiredApiError(error = {}) {
    const status = Number(error?.status || 0);
    const message = String(error?.data?.error || error?.message || '').toLowerCase();
    return status === 403 && message.includes('csrf');
  }

  async function refreshAuthForUnsafeWrite(options = {}) {
    try {
      await refreshAuth({
        maxAttempts: Math.max(1, Math.min(5, Number(options.maxAttempts || 3) || 3)),
        scheduleRetry: false
      });
    } catch {
      // The write request below will surface the real error if auth refresh is unavailable.
    }
    return Boolean(state.auth?.csrfToken);
  }

  async function api(path, options = {}) {
    const method = String(options.method || 'GET').toUpperCase();
    const needsCsrf = unsafeApiMethod(method);
    const originalHeaders = new Headers(options.headers || {});
    const explicitCsrfHeader = originalHeaders.has('x-aiagent2-csrf');
    let lastError = null;
    const attempts = needsCsrf && !explicitCsrfHeader ? 2 : 1;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      if (needsCsrf && !explicitCsrfHeader && (!state.auth?.csrfToken || attempt > 1)) {
        await refreshAuthForUnsafeWrite({ maxAttempts: attempt > 1 ? 4 : 2 });
      }
      const headers = new Headers(options.headers || {});
      if (!headers.has('content-type')) headers.set('content-type', 'application/json');
      if (needsCsrf && !explicitCsrfHeader && state.auth?.csrfToken) {
        headers.set('x-aiagent2-csrf', state.auth.csrfToken);
      }
      if (state.visitorId) headers.set('x-aiagent2-visitor-id', state.visitorId);
      const timeoutMs = Math.max(0, Number(options.attemptTimeoutMs || options.timeoutMs || 0) || 0);
      const controller = timeoutMs && !options.signal ? new AbortController() : null;
      const timeout = controller ? window.setTimeout(() => controller.abort(), timeoutMs) : null;
      try {
        const response = await fetch(path, {
          ...options,
          method,
          headers,
          credentials: 'same-origin',
          ...(controller ? { signal: controller.signal } : {})
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          const error = new Error(String(data?.error || `Request failed (${response.status})`));
          error.status = response.status;
          error.data = data;
          throw error;
        }
        return data;
      } catch (error) {
        if (error?.name === 'AbortError') {
          const timeoutError = new Error(`Request timed out (${timeoutMs}ms)`);
          timeoutError.status = 0;
          timeoutError.data = { error: 'request_timeout', timeout_ms: timeoutMs };
          throw timeoutError;
        }
        lastError = error;
        if (attempt < attempts && csrfRequiredApiError(error)) continue;
        throw error;
      } finally {
        if (timeout) window.clearTimeout(timeout);
      }
    }
    throw lastError || new Error('Request failed');
  }

  function apiRetryableError(error = {}, statuses = []) {
    const status = Number(error?.status || 0);
    if (!status) return true;
    return (statuses.length ? statuses : [408, 429, 500, 502, 503, 504]).includes(status);
  }

  function apiRetryDelay(error = {}, attempt = 1, options = {}) {
    const retryAfter = Number(error?.data?.retry_after || error?.data?.retryAfter || 0);
    const maxDelayMs = Math.max(500, Number(options.maxDelayMs || 8000) || 8000);
    if (Number.isFinite(retryAfter) && retryAfter > 0) return Math.min(maxDelayMs, retryAfter * 1000);
    return Math.min(maxDelayMs, Math.max(500, Number(options.baseDelayMs || 1000) || 1000) * Math.max(1, attempt));
  }

  async function apiWithRetry(path, options = {}, retryOptions = {}) {
    const maxAttempts = Math.max(1, Math.min(8, Number(retryOptions.maxAttempts || 1) || 1));
    const retryStatuses = Array.isArray(retryOptions.retryStatuses) ? retryOptions.retryStatuses : [];
    let lastError = null;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        return await api(path, options);
      } catch (error) {
        lastError = error;
        if (attempt >= maxAttempts || !apiRetryableError(error, retryStatuses)) throw error;
        await sleep(apiRetryDelay(error, attempt, retryOptions));
      }
    }
    throw lastError || new Error('Request failed');
  }

  function accountSettingsUiLanguage(payload = {}) {
    return normalizeUiLanguage(payload?.account?.profile?.uiLanguage || payload?.profile?.uiLanguage || '', '');
  }

  async function refreshUiLanguageFromAccount(options = {}) {
    const loggedIn = Boolean(state.auth?.loggedIn || state.auth?.login || state.auth?.user);
    if (!loggedIn) return chatUiLanguage();
    const force = options.force === true;
    if (!force && state.uiLanguageSettingsFetchedAt && Date.now() - state.uiLanguageSettingsFetchedAt < 60_000) {
      return chatUiLanguage();
    }
    if (state.uiLanguageSettingsRequest) return state.uiLanguageSettingsRequest;
    state.uiLanguageSettingsRequest = api('/api/settings', { method: 'GET', timeoutMs: 8000 })
      .then((result) => {
        const savedLanguage = accountSettingsUiLanguage(result);
        state.uiLanguageSettingsFetchedAt = Date.now();
        if (savedLanguage) setChatUiLanguage(savedLanguage);
        return chatUiLanguage();
      })
      .catch(() => chatUiLanguage())
      .finally(() => {
        state.uiLanguageSettingsRequest = null;
      });
    return state.uiLanguageSettingsRequest;
  }

  async function saveChatUiLanguagePreference(value = '') {
    const next = setChatUiLanguage(value);
    const loggedIn = Boolean(state.auth?.loggedIn || state.auth?.login || state.auth?.user);
    if (!loggedIn) return next;
    const result = await api('/api/settings/profile', {
      method: 'POST',
      body: JSON.stringify({ uiLanguage: next }),
      timeoutMs: 8000
    });
    state.uiLanguageSettingsFetchedAt = Date.now();
    const savedLanguage = accountSettingsUiLanguage(result);
    if (savedLanguage) setChatUiLanguage(savedLanguage);
    return chatUiLanguage();
  }

  return {
    api,
    apiWithRetry,
    chatLanguage,
    chatText,
    chatUiLanguage,
    chatUiText,
    chatWelcomeText,
    csrfRequiredApiError,
    detectedInputLanguage,
    looksJapanese,
    refreshUiLanguageFromAccount,
    rememberConversationLanguage,
    saveChatUiLanguagePreference,
    setChatUiLanguage,
    syncDocumentUiLanguage
  };
}
