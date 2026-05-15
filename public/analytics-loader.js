(function initGlobalAnalytics() {
  const ANALYTICS_ID = 'G-CDHM437KEX';
  const PRODUCTION_HOSTS = new Set(['aiagent-marketplace.net', 'www.aiagent-marketplace.net']);
  const DISABLE_COOKIE_NAME = 'cait_disable_ga4';
  const AUTH_EVENT_COOKIE_NAME = 'cait_ga4_auth_event';
  const DISABLE_PARAMS = ['no_ga', 'disable_ga', 'cait_no_ga', 'cait_disable_ga4', 'ga_opt_out'];
  const ENABLE_PARAMS = ['enable_ga', 'cait_enable_ga4', 'ga_opt_in'];
  const pendingEvents = [];
  let analyticsReady = false;
  let clickTrackingInstalled = false;

  const EVENT_NAME_MAP = {
    signup_completed: 'sign_up',
    google_signup_completed: 'sign_up',
    github_signup_completed: 'sign_up',
    email_signup_completed: 'sign_up',
    google_login_completed: 'login',
    github_login_completed: 'login',
    email_login_completed: 'login',
    order_created: 'order_submitted',
    order_submitted: 'order_submitted',
    chat_intake_started: 'chat_intake_started',
    primary_cta_click: 'primary_cta_click',
    feedback_submitted: 'generate_lead',
    contact_submitted: 'generate_lead',
    lead_submitted: 'generate_lead',
    generate_lead: 'generate_lead',
    purchase: 'purchase'
  };

  function flagEnabled(value) {
    return !['0', 'false', 'off', 'no'].includes(String(value || '1').trim().toLowerCase());
  }

  function rememberDisabled(value) {
    try {
      const maxAge = value ? 31536000 : 0;
      const secure = window.location.protocol === 'https:' ? '; Secure' : '';
      document.cookie = `${DISABLE_COOKIE_NAME}=${value ? '1' : ''}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
    } catch {}
  }

  function isRememberedDisabled() {
    try {
      return document.cookie.split(';').some((item) => item.trim() === `${DISABLE_COOKIE_NAME}=1`);
    } catch {
      return false;
    }
  }

  function disableAnalytics(reason, persist = false) {
    window[`ga-disable-${ANALYTICS_ID}`] = true;
    window.__aiagent2AnalyticsDisabledReason = reason;
    if (persist) rememberDisabled(true);
  }

  function applyQueryOptOut() {
    const params = new URLSearchParams(window.location.search || '');
    for (const key of ENABLE_PARAMS) {
      if (params.has(key) && flagEnabled(params.get(key))) {
        rememberDisabled(false);
        window[`ga-disable-${ANALYTICS_ID}`] = false;
      }
    }
    for (const key of DISABLE_PARAMS) {
      if (params.has(key) && flagEnabled(params.get(key))) {
        disableAnalytics(`query:${key}`, true);
      }
    }
  }

  function baseSkipReason() {
    if (!ANALYTICS_ID) return 'missing_id';
    if (!/^https?:$/.test(window.location.protocol)) return 'unsupported_protocol';
    if (!PRODUCTION_HOSTS.has(String(window.location.hostname || '').toLowerCase())) return 'non_production_host';
    if (window[`ga-disable-${ANALYTICS_ID}`] || isRememberedDisabled()) return 'opted_out';
    return '';
  }

  function platformAdminStatus(status) {
    return Boolean(status && typeof status === 'object' && status.isPlatformAdmin);
  }

  function safeString(value = '', max = 160) {
    return String(value ?? '')
      .replace(/[\u0000-\u001f\u007f]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, max);
  }

  function safeEventName(value = '') {
    const normalized = safeString(value, 80).toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '');
    return EVENT_NAME_MAP[normalized] || normalized;
  }

  function safeParamKey(value = '') {
    return safeString(value, 40).toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40);
  }

  function safeParamValue(value) {
    if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
    if (typeof value === 'boolean') return value;
    if (Array.isArray(value)) return safeString(value.join(','), 160);
    if (value && typeof value === 'object') return safeString(JSON.stringify(value), 160);
    const text = safeString(value, 160);
    return text || undefined;
  }

  function safeEventParams(params = {}) {
    const out = {
      page_path: window.location.pathname || '/',
      page_location: window.location.href,
      page_title: document.title || '',
      event_source: 'web'
    };
    if (!params || typeof params !== 'object') return out;
    for (const [key, value] of Object.entries(params)) {
      const safeKey = safeParamKey(key);
      if (!safeKey) continue;
      const safeValue = safeParamValue(value);
      if (safeValue !== undefined) out[safeKey] = safeValue;
    }
    return out;
  }

  function readCookie(name = '') {
    try {
      const prefix = `${name}=`;
      const match = document.cookie
        .split(';')
        .map((item) => item.trim())
        .find((item) => item.startsWith(prefix));
      return match ? decodeURIComponent(match.slice(prefix.length)) : '';
    } catch {
      return '';
    }
  }

  function clearReadableCookie(name = '') {
    try {
      const secure = window.location.protocol === 'https:' ? '; Secure' : '';
      document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
    } catch {}
  }

  function trackGa4Event(eventName, params = {}) {
    const safeName = safeEventName(eventName);
    if (!safeName) return false;
    const reason = baseSkipReason();
    if (reason) return false;
    const payload = safeEventParams(params);
    if (analyticsReady && typeof window.gtag === 'function') {
      window.gtag('event', safeName, payload);
      return true;
    }
    pendingEvents.push({ eventName: safeName, params: payload });
    return true;
  }

  function flushPendingEvents() {
    if (!analyticsReady || typeof window.gtag !== 'function') return;
    while (pendingEvents.length) {
      const event = pendingEvents.shift();
      if (!event?.eventName) continue;
      window.gtag('event', event.eventName, event.params || {});
    }
  }

  function consumeAuthEventCookie() {
    const raw = readCookie(AUTH_EVENT_COOKIE_NAME);
    if (!raw) return;
    clearReadableCookie(AUTH_EVENT_COOKIE_NAME);
    let payload = null;
    try {
      payload = JSON.parse(raw);
    } catch {
      payload = null;
    }
    if (!payload || typeof payload !== 'object') return;
    const ts = Number(payload.ts || 0) || 0;
    if (ts && Date.now() - ts > 10 * 60 * 1000) return;
    const eventName = safeEventName(payload.event || '');
    if (!['sign_up', 'login'].includes(eventName)) return;
    trackGa4Event(eventName, {
      method: payload.provider || payload.method || '',
      status: payload.status || '',
      source: payload.source || 'auth_callback'
    });
  }

  function primaryCtaMeta(element) {
    if (!element) return null;
    const explicit = safeString(element.getAttribute('data-ga-event') || '', 80);
    if (explicit) {
      return {
        eventName: explicit,
        params: {
          cta_id: element.id || element.getAttribute('data-ga-id') || '',
          cta_text: element.textContent || '',
          link_url: element.href || element.getAttribute('href') || ''
        }
      };
    }
    const href = String(element.href || element.getAttribute?.('href') || '').trim();
    const className = String(element.className || '');
    const text = safeString(element.textContent || '', 80).toLowerCase();
    const isStartAction = /\b(primary-action|start-action|auth-continue|primary-btn)\b/.test(className)
      || /\/login\?[^#]*(next=%2fchat|next=\/chat)/i.test(href)
      || (/\/chat(?:\.html)?(?:$|[?#])/i.test(href) && /(start|chat|try|signup|sign up|begin)/i.test(text));
    if (!isStartAction) return null;
    return {
      eventName: 'primary_cta_click',
      params: {
        cta_id: element.id || '',
        cta_text: element.textContent || '',
        link_url: href
      }
    };
  }

  function installClickTracking() {
    if (clickTrackingInstalled) return;
    clickTrackingInstalled = true;
    document.addEventListener('click', (event) => {
      const target = event.target?.closest?.('[data-ga-event], a, button');
      const meta = primaryCtaMeta(target);
      if (!meta) return;
      trackGa4Event(meta.eventName, meta.params);
    }, true);
  }

  async function promiseWithTimeout(promise, timeoutMs = 1500) {
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

  async function authStatus() {
    if (window.__CAIT_FAST_AUTH_RESOLVED__) return window.__CAIT_FAST_AUTH_RESOLVED__;
    if (window.__CAIT_FAST_AUTH_STATUS__ && typeof window.__CAIT_FAST_AUTH_STATUS__.then === 'function') {
      return promiseWithTimeout(window.__CAIT_FAST_AUTH_STATUS__);
    }
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 1500);
    try {
      const response = await fetch('/auth/status', {
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

  function loadAnalytics() {
    if (window.__aiagent2AnalyticsLoaded) {
      analyticsReady = true;
      flushPendingEvents();
      consumeAuthEventCookie();
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
    window.gtag('config', ANALYTICS_ID);
    analyticsReady = true;
    flushPendingEvents();
    consumeAuthEventCookie();
  }

  async function start() {
    applyQueryOptOut();
    const initialReason = baseSkipReason();
    if (initialReason) {
      disableAnalytics(initialReason);
      return;
    }
    const status = await authStatus();
    if (platformAdminStatus(status)) {
      disableAnalytics('platform_admin', true);
      return;
    }
    const finalReason = baseSkipReason();
    if (finalReason) {
      disableAnalytics(finalReason);
      return;
    }
    loadAnalytics();
  }

  window.caitTrackGa4Event = trackGa4Event;
  window.caitFlushGa4Events = flushPendingEvents;
  installClickTracking();
  void start();
}());
