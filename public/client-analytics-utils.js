import {
  fallbackPromptFromOrderInput,
  orderInputCounts
} from './client-order-input-utils.js?v=20260521a';
import {
  chatAnswerBody,
  chatAnswerKind
} from './client-answer-utils.js?v=20260522a';

const ANALYTICS_ID = 'G-CDHM437KEX';
const ANALYTICS_PRODUCTION_HOSTS = new Set(['aiagent-marketplace.net', 'www.aiagent-marketplace.net']);
const ANALYTICS_DISABLE_COOKIE_NAME = 'cait_disable_ga4';
const ANALYTICS_DISABLE_PARAMS = ['no_ga', 'disable_ga', 'cait_no_ga', 'cait_disable_ga4', 'ga_opt_out'];
const ANALYTICS_ENABLE_PARAMS = ['enable_ga', 'cait_enable_ga4', 'ga_opt_in'];
const ANALYTICS_TEST_TRAFFIC_PARAMS = ['e2e', 'smoke', 'playwright', 'test', 'cait_test', 'qa'];
const CLIENT_GA4_EVENT_NAME_MAP = {
  order_created: 'order_submitted',
  order_submitted: 'order_submitted',
  draft_order_created: 'chat_intake_started',
  intake_questions_shown: 'chat_intake_started',
  feedback_submitted: 'generate_lead',
  lead_submitted: 'generate_lead',
  contact_submitted: 'generate_lead',
  signup_completed: 'sign_up',
  google_login_completed: 'login',
  github_login_completed: 'login',
  email_login_completed: 'login',
  begin_checkout: 'begin_checkout',
  purchase: 'purchase'
};

export function safeAnalyticsString(value = '', max = 100) {
  return String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function safeAnalyticsNumber(value = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.min(1000000, Math.round(n))) : 0;
}

function sanitizeClientAnalyticsMeta(meta = {}) {
  const safe = {};
  const strings = ['source', 'action', 'actionLabel', 'section', 'taskType', 'orderStrategy', 'resolvedStrategy', 'mode', 'status', 'agentId', 'agentSource', 'toolId', 'toolTitle', 'trigger', 'answerKind', 'patternId', 'llmProvider', 'responseSource', 'intent'];
  const numbers = ['promptChars', 'urlCount', 'fileCount', 'fileChars', 'draftCount', 'successCount', 'failureCount', 'candidateCount', 'priority', 'confidence'];
  const booleans = ['agentPinned', 'silent', 'userDismissed', 'helpful'];
  strings.forEach((key) => {
    if (meta[key] !== undefined) safe[key] = safeAnalyticsString(meta[key], key === 'agentId' ? 80 : 60);
  });
  numbers.forEach((key) => {
    if (meta[key] !== undefined) safe[key] = safeAnalyticsNumber(meta[key]);
  });
  booleans.forEach((key) => {
    if (meta[key] !== undefined) safe[key] = Boolean(meta[key]);
  });
  return safe;
}

export function createClientAnalyticsUtils(options = {}) {
  const getState = typeof options.getState === 'function' ? options.getState : () => ({});
  const getCsrfToken = typeof options.getCsrfToken === 'function' ? options.getCsrfToken : () => '';
  const getCurrentTab = typeof options.getCurrentTab === 'function' ? options.getCurrentTab : () => '';
  const getCurrentRoutingTask = typeof options.getCurrentRoutingTask === 'function' ? options.getCurrentRoutingTask : () => '';
  const getRequestedOrderStrategy = typeof options.getRequestedOrderStrategy === 'function' ? options.getRequestedOrderStrategy : () => 'auto';
  const getCurrentOrderStrategy = typeof options.getCurrentOrderStrategy === 'function' ? options.getCurrentOrderStrategy : () => 'auto';
  const ensureCurrentOpenChatSessionId = typeof options.ensureCurrentOpenChatSessionId === 'function'
    ? options.ensureCurrentOpenChatSessionId
    : () => '';
  const fetchImpl = typeof options.fetchImpl === 'function' ? options.fetchImpl : (...args) => fetch(...args);
  const authStatusFetcher = typeof options.authStatusFetcher === 'function' ? options.authStatusFetcher : null;

  let runtimeVisitorId = '';
  let openChatTranscriptSequence = 0;
  let clientAnalyticsReady = false;
  const runtimeConversionEvents = new Set();
  const runtimeStartedLogins = new Set();
  const runtimeCompletedLogins = new Set();
  const clientPendingGa4Events = [];
  const openChatTranscriptWriteQueue = new Map();

  function analyticsFlagEnabled(value) {
    return !['0', 'false', 'off', 'no'].includes(String(value || '1').trim().toLowerCase());
  }

  function rememberAnalyticsDisabled(value) {
    try {
      const maxAge = value ? 31536000 : 0;
      const secure = window.location.protocol === 'https:' ? '; Secure' : '';
      document.cookie = `${ANALYTICS_DISABLE_COOKIE_NAME}=${value ? '1' : ''}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
    } catch {}
  }

  function rememberedAnalyticsDisabled() {
    try {
      return document.cookie.split(';').some((item) => item.trim() === `${ANALYTICS_DISABLE_COOKIE_NAME}=1`);
    } catch {
      return false;
    }
  }

  function disableAnalytics(reason, persist = false) {
    window[`ga-disable-${ANALYTICS_ID}`] = true;
    window.__aiagent2AnalyticsDisabledReason = reason;
    if (persist) rememberAnalyticsDisabled(true);
  }

  function applyAnalyticsQueryOptOut() {
    const params = new URLSearchParams(window.location.search || '');
    for (const key of ANALYTICS_ENABLE_PARAMS) {
      if (params.has(key) && analyticsFlagEnabled(params.get(key))) {
        rememberAnalyticsDisabled(false);
        window[`ga-disable-${ANALYTICS_ID}`] = false;
      }
    }
    for (const key of ANALYTICS_DISABLE_PARAMS) {
      if (params.has(key) && analyticsFlagEnabled(params.get(key))) {
        disableAnalytics(`query:${key}`, true);
      }
    }
  }

  function analyticsBaseSkipReason() {
    if (!ANALYTICS_ID) return 'missing_id';
    if (!/^https?:$/.test(window.location.protocol)) return 'unsupported_protocol';
    if (!ANALYTICS_PRODUCTION_HOSTS.has(String(window.location.hostname || '').toLowerCase())) return 'non_production_host';
    if (window[`ga-disable-${ANALYTICS_ID}`] || rememberedAnalyticsDisabled()) return 'opted_out';
    return '';
  }

  function clientInternalTestTraffic() {
    try {
      const params = new URLSearchParams(window.location.search || '');
      const explicit = String(params.get('traffic_type') || params.get('trafic_type') || '').trim().toLowerCase();
      if (explicit === 'internal') return true;
      if (ANALYTICS_TEST_TRAFFIC_PARAMS.some((key) => params.has(key))) return true;
      const hints = [
        params.get('login_source'),
        params.get('source'),
        params.get('utm_source'),
        params.get('next'),
        params.get('return_to')
      ].join(' ');
      if (/\b(?:playwright|e2e|smoke|test|qa)\b/i.test(hints)) return true;
    } catch {}
    return Boolean(window.navigator?.webdriver);
  }

  function clientInternalTrafficParams() {
    return clientInternalTestTraffic()
      ? { traffic_type: 'internal', trafic_type: 'internal' }
      : {};
  }

  function analyticsPlatformAdminStatus(status) {
    return Boolean(status && typeof status === 'object' && status.isPlatformAdmin);
  }

  async function analyticsPromiseWithTimeout(promise, timeoutMs = 1500) {
    let timeoutId = 0;
    try {
      return await Promise.race([
        promise,
        new Promise((resolve) => {
          timeoutId = window.setTimeout(() => resolve(null), timeoutMs);
        })
      ]);
    } finally {
      if (timeoutId) window.clearTimeout(timeoutId);
    }
  }

  async function analyticsAuthStatus() {
    const state = getState();
    if (analyticsPlatformAdminStatus(state?.snapshot?.auth)) return state.snapshot.auth;
    if (window.__CAIT_FAST_AUTH_RESOLVED__) return window.__CAIT_FAST_AUTH_RESOLVED__;
    if (window.__CAIT_FAST_AUTH_STATUS__ && typeof window.__CAIT_FAST_AUTH_STATUS__.then === 'function') {
      return analyticsPromiseWithTimeout(window.__CAIT_FAST_AUTH_STATUS__);
    }
    if (authStatusFetcher) return authStatusFetcher();
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 1500);
    try {
      const response = await fetchImpl('/auth/status', {
        credentials: 'same-origin',
        signal: controller.signal
      });
      return response.ok ? response.json() : null;
    } catch {
      return null;
    } finally {
      window.clearTimeout(timeout);
    }
  }

  function flushClientGa4Events() {
    if (!clientAnalyticsReady || typeof window.gtag !== 'function') return;
    while (clientPendingGa4Events.length) {
      const item = clientPendingGa4Events.shift();
      if (!item?.eventName) continue;
      window.gtag('event', item.eventName, item.params || {});
    }
  }

  function loadAnalytics() {
    if (window.__aiagent2AnalyticsLoaded) {
      clientAnalyticsReady = true;
      flushClientGa4Events();
      return;
    }
    window.__aiagent2AnalyticsLoaded = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function gtag() { window.dataLayer.push(arguments); };
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ANALYTICS_ID)}`;
    document.head.appendChild(script);
    window.gtag('js', new Date());
    window.gtag('config', ANALYTICS_ID, clientInternalTrafficParams());
    clientAnalyticsReady = true;
    flushClientGa4Events();
  }

  async function initAnalytics() {
    applyAnalyticsQueryOptOut();
    const initialReason = analyticsBaseSkipReason();
    if (initialReason) {
      disableAnalytics(initialReason);
      return;
    }
    const status = await analyticsAuthStatus();
    if (analyticsPlatformAdminStatus(status)) {
      disableAnalytics('platform_admin', true);
      return;
    }
    const finalReason = analyticsBaseSkipReason();
    if (finalReason) {
      disableAnalytics(finalReason);
      return;
    }
    loadAnalytics();
  }

  function visitorId() {
    if (runtimeVisitorId) return runtimeVisitorId;
    runtimeVisitorId = window.crypto?.randomUUID?.() || `v_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    return runtimeVisitorId;
  }

  function chatTranscriptSourceForAnswer(answer = null) {
    const explicit = safeAnalyticsString(answer?.responseSource || '', 40).toLowerCase();
    if (explicit) return `work_chat:${explicit}`;
    const provider = safeAnalyticsString(answer?.llmProvider || '', 40).toLowerCase();
    if (provider) return `work_chat:${provider}`;
    return 'work_chat:local';
  }

  function makeOpenChatTranscriptId(sessionId = '') {
    openChatTranscriptSequence += 1;
    const state = getState();
    const base = safeAnalyticsString(sessionId || state.currentOpenChatSessionId || 'chat', 80)
      .replace(/[^a-zA-Z0-9_-]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 80) || 'chat';
    return `${base}_turn_${Date.now().toString(36)}_${openChatTranscriptSequence}`;
  }

  function clientGa4EventName(event = '') {
    const eventName = safeAnalyticsString(event, 64).toLowerCase().replace(/[^a-z0-9_:-]+/g, '_').replace(/^_+|_+$/g, '');
    return CLIENT_GA4_EVENT_NAME_MAP[eventName] || eventName;
  }

  function clientGa4Params(meta = {}) {
    return {
      page_path: window.location.pathname || '/',
      current_tab: getCurrentTab() || '',
      source: 'web',
      ...clientInternalTrafficParams(),
      ...sanitizeClientAnalyticsMeta(meta)
    };
  }

  function trackClientGa4Event(event = '', meta = {}) {
    const eventName = clientGa4EventName(event);
    if (!eventName) return false;
    if (typeof window.caitTrackGa4Event === 'function') {
      return window.caitTrackGa4Event(eventName, clientGa4Params(meta));
    }
    if (analyticsBaseSkipReason()) return false;
    const params = clientGa4Params(meta);
    if (clientAnalyticsReady && typeof window.gtag === 'function') {
      window.gtag('event', eventName, params);
      return true;
    }
    clientPendingGa4Events.push({ eventName, params });
    return true;
  }

  async function trackConversionEvent(event, meta = {}) {
    const eventName = safeAnalyticsString(event, 64).toLowerCase().replace(/[^a-z0-9_:-]+/g, '_').replace(/^_+|_+$/g, '');
    if (!eventName) return;
    trackClientGa4Event(eventName, meta);
    try {
      const csrfToken = getCsrfToken();
      const headers = new Headers({ 'content-type': 'application/json' });
      if (csrfToken) headers.set('x-aiagent2-csrf', csrfToken);
      const payload = JSON.stringify({
        event: eventName,
        visitor_id: visitorId(),
        page_path: window.location.pathname || '/',
        current_tab: getCurrentTab() || '',
        source: 'web',
        ...clientInternalTrafficParams(),
        meta: sanitizeClientAnalyticsMeta(meta)
      });
      const response = await fetchImpl('/api/analytics/events', {
        method: 'POST',
        headers,
        credentials: csrfToken ? 'same-origin' : 'omit',
        keepalive: true,
        body: payload
      });
      if (!response.ok && csrfToken && response.status === 403) {
        await fetchImpl('/api/analytics/events', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          credentials: 'omit',
          keepalive: true,
          body: payload
        });
      }
    } catch {}
  }

  async function trackChatTranscript(prompt = '', answer = null, meta = {}) {
    const answerBody = chatAnswerBody(answer);
    if (!String(prompt || '').trim() && !answerBody) return;
    try {
      const csrfToken = getCsrfToken();
      const transcriptSource = chatTranscriptSourceForAnswer(answer);
      const state = getState();
      const sessionId = ensureCurrentOpenChatSessionId({ force: true });
      const transcriptId = safeAnalyticsString(meta.transcriptId || meta.transcript_id || meta.id || '', 160)
        .replace(/[^a-zA-Z0-9:_-]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 160);
      const body = {
        prompt: String(prompt || '').slice(0, 8000),
        answer: answerBody.slice(0, 8000),
        answer_kind: chatAnswerKind(answer) || 'quick',
        status: String(answer?.status || meta.status || '').slice(0, 120),
        session_id: String(sessionId || state.currentOpenChatSessionId || '').trim(),
        visitor_id: visitorId(),
        page_path: window.location.pathname || '/',
        current_tab: getCurrentTab() || 'work',
        source: transcriptSource,
        meta: sanitizeClientAnalyticsMeta({
          ...meta,
          answerKind: chatAnswerKind(answer) || meta.answerKind || '',
          patternId: answer?.patternId || meta.patternId || '',
          llmProvider: answer?.llmProvider || meta.llmProvider || '',
          responseSource: answer?.responseSource || meta.responseSource || ''
        })
      };
      if (transcriptId) body.id = transcriptId;
      const payload = JSON.stringify(body);
      const previousWrite = transcriptId ? openChatTranscriptWriteQueue.get(transcriptId) : null;
      const write = (async () => {
        if (previousWrite) await previousWrite.catch(() => {});
        const headers = new Headers({ 'content-type': 'application/json' });
        if (csrfToken) headers.set('x-aiagent2-csrf', csrfToken);
        const response = await fetchImpl('/api/analytics/chat-transcripts', {
          method: 'POST',
          headers,
          credentials: csrfToken ? 'same-origin' : 'omit',
          keepalive: true,
          body: payload
        });
        if (!response.ok && csrfToken && response.status === 403) {
          await fetchImpl('/api/analytics/chat-transcripts', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            credentials: 'omit',
            keepalive: true,
            body: payload
          });
        }
      })();
      if (transcriptId) {
        const queuedWrite = write.catch(() => {}).finally(() => {
          if (openChatTranscriptWriteQueue.get(transcriptId) === queuedWrite) {
            openChatTranscriptWriteQueue.delete(transcriptId);
          }
        });
        openChatTranscriptWriteQueue.set(transcriptId, queuedWrite);
      }
      await write;
    } catch {}
  }

  function trackOpenChatSubmitTranscript(draft = {}, analyticsDraft = {}) {
    const prompt = String(draft?.prompt || fallbackPromptFromOrderInput(draft?.input || null)).trim();
    if (!prompt) return '';
    const sessionId = ensureCurrentOpenChatSessionId({ force: true });
    const transcriptId = makeOpenChatTranscriptId(sessionId);
    void trackChatTranscript(prompt, {
      kind: 'submitted',
      body: 'Request received. CAIt is preparing the response.',
      status: 'submitted',
      responseSource: 'submitted'
    }, {
      ...analyticsDraft,
      answerKind: 'submitted',
      status: 'submitted',
      transcriptId
    });
    return transcriptId;
  }

  function trackConversionOnce(event, meta = {}, key = event) {
    const storageKey = `aim:track-once:${safeAnalyticsString(key, 80)}`;
    if (runtimeConversionEvents.has(storageKey)) return;
    runtimeConversionEvents.add(storageKey);
    void trackConversionEvent(event, meta);
  }

  function trackLoginStarted(provider = '') {
    const safeProvider = safeAnalyticsString(provider, 20).toLowerCase();
    if (!safeProvider) return;
    runtimeStartedLogins.add(safeProvider);
    void trackConversionEvent(`${safeProvider}_login_started`, { source: getCurrentTab() || 'unknown' });
  }

  function trackAuthCompletion(auth = {}) {
    if (!auth?.loggedIn) return;
    const provider = String(auth.authProvider || '').toLowerCase().includes('google')
      ? 'google'
      : (String(auth.authProvider || '').toLowerCase().includes('github') ? 'github' : '');
    if (!provider) return;
    const login = safeAnalyticsString(auth?.accountLogin || auth?.user?.login || 'session', 60);
    const completedKey = `aim:login-completed:${provider}:${login}`;
    if (!runtimeStartedLogins.has(provider) || runtimeCompletedLogins.has(completedKey)) return;
    runtimeCompletedLogins.add(completedKey);
    void trackConversionEvent(`${provider}_login_completed`, { source: getCurrentTab() || 'unknown' });
  }

  function trackPageViewOnce() {
    const state = getState();
    if (state.pageViewTracked) return;
    state.pageViewTracked = true;
    trackConversionOnce('page_view', { source: 'initial_load' }, `page_view:${window.location.pathname}`);
  }

  function summarizeOrderDraftForAnalytics(draft = {}, source = 'work_chat') {
    const counts = orderInputCounts(draft?.input || null);
    return {
      source,
      taskType: draft.task_type || getCurrentRoutingTask() || 'research',
      orderStrategy: draft.order_strategy || getRequestedOrderStrategy(),
      resolvedStrategy: draft.resolved_order_strategy || getCurrentOrderStrategy(),
      promptChars: String(draft.prompt || '').length,
      urlCount: counts.urlCount,
      fileCount: counts.fileCount,
      fileChars: counts.fileChars,
      agentPinned: Boolean(draft.agent_id),
      agentId: draft.agent_id || '',
      draftCount: Array.isArray(draft.parallel_drafts) ? draft.parallel_drafts.length : 0
    };
  }

  return {
    initAnalytics,
    safeAnalyticsString,
    trackAuthCompletion,
    trackChatTranscript,
    trackConversionEvent,
    trackConversionOnce,
    trackLoginStarted,
    trackOpenChatSubmitTranscript,
    trackPageViewOnce,
    summarizeOrderDraftForAnalytics,
    visitorId
  };
}
