const $ = (id) => document.getElementById(id);

const els = {
  flash: $('loginFlash'),
  checkingPanel: $('loginCheckingPanel'),
  checkingStatus: $('loginCheckingStatus'),
  panel: $('loginPanel'),
  hint: $('loginHint'),
  status: $('loginStatus'),
  emailInput: $('loginEmailInput'),
  emailBtn: $('loginEmailBtn'),
  google: $('loginGoogleBtn'),
  github: $('loginGithubBtn'),
  continueBtn: $('loginContinueBtn'),
  trustNotice: $('loginTrustNotice')
};

let runtimeVisitorId = '';
let authStatusChecked = false;
let runtimeAuthBaseUrl = '';
let runtimeUsesExternalAuth = false;
const LOGIN_ACTION_WAIT_MS = 60 * 60 * 1000;
const AUTH_STATUS_SOFT_REVEAL_MS = 3500;
const LOGIN_ATTEMPT_STARTED_AT_KEY = 'cait.login.startedAt.v1';
const CAIT_TRUSTED_AUTH_ORIGIN = 'https://aiagent-marketplace.net';
const LOGIN_TEST_TRAFFIC_PARAMS = ['e2e', 'smoke', 'playwright', 'test', 'cait_test', 'qa'];

function safeString(value = '', max = 100) {
  return String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function visitorId() {
  if (runtimeVisitorId) return runtimeVisitorId;
  const url = new URL(window.location.href);
  const hinted = safeString(url.searchParams.get('visitor_id') || '', 80);
  runtimeVisitorId = hinted || window.crypto?.randomUUID?.() || `v_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  return runtimeVisitorId;
}

function loginInternalTestTraffic() {
  try {
    const params = new URLSearchParams(window.location.search || '');
    const explicit = String(params.get('traffic_type') || params.get('trafic_type') || '').trim().toLowerCase();
    if (explicit === 'internal') return true;
    if (LOGIN_TEST_TRAFFIC_PARAMS.some((key) => params.has(key))) return true;
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

function loginInternalTrafficParams() {
  return loginInternalTestTraffic()
    ? { traffic_type: 'internal', trafic_type: 'internal' }
    : {};
}

function normalizeLocalPath(value = '', fallback = '/') {
  const raw = String(value || '').trim();
  if (!raw) return fallback;
  if (raw.startsWith('/') && !raw.startsWith('//')) return raw;
  try {
    const parsed = new URL(raw, window.location.origin);
    if (parsed.origin !== window.location.origin) return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}` || fallback;
  } catch {
    return fallback;
  }
}

function postLoginPath(value = '', fallback = '/') {
  const next = normalizeLocalPath(value, fallback);
  try {
    const parsed = new URL(next, window.location.origin);
    if (['/login', '/login.html'].includes(parsed.pathname)) return fallback;
    if (parsed.pathname === '/' && String(parsed.searchParams.get('tab') || '').toLowerCase() === 'work') return '/chat';
    if (parsed.pathname === '/chat.html') return `/chat${parsed.search}${parsed.hash}`;
    if (parsed.pathname === '/admin.html') return `/admin${parsed.search}${parsed.hash}`;
    return `${parsed.pathname}${parsed.search}${parsed.hash}` || fallback;
  } catch {
    return fallback;
  }
}

function originFromUrl(value = '') {
  try {
    return new URL(value).origin;
  } catch {
    return '';
  }
}

function isLoopbackOrigin(origin = window.location.origin) {
  try {
    const host = new URL(origin).hostname.toLowerCase();
    return host === 'localhost' || host === '127.0.0.1' || host === '::1';
  } catch {
    return false;
  }
}

function trustedAuthOrigin(status = {}) {
  const candidate = originFromUrl(status?.authBaseUrl || '');
  if (candidate && candidate.startsWith('https://')) return candidate;
  if (isLoopbackOrigin()) return CAIT_TRUSTED_AUTH_ORIGIN;
  return '';
}

function applyTrustedAuthOrigin(status = {}) {
  runtimeAuthBaseUrl = trustedAuthOrigin(status);
  runtimeUsesExternalAuth = Boolean(runtimeAuthBaseUrl && runtimeAuthBaseUrl !== window.location.origin);
  if (els.trustNotice) {
    els.trustNotice.hidden = false;
    const label = runtimeUsesExternalAuth
      ? `Sign-in opens ${runtimeAuthBaseUrl}.`
      : 'You are on the official CAIt sign-in origin.';
    els.trustNotice.querySelector('span').textContent = `${label} If Google shows an unverified-app warning for analytics access, use email login first and connect Google from the official CAIt domain after the consent screen is verified.`;
  }
  return runtimeUsesExternalAuth;
}

function currentRoute() {
  const url = new URL(window.location.href);
  return {
    source: safeString(url.searchParams.get('source') || 'direct', 40).toLowerCase() || 'direct',
    next: postLoginPath(url.searchParams.get('next') || '', '/chat'),
    authError: safeString(url.searchParams.get('auth_error') || '', 120)
  };
}

function flash(message = '', kind = 'info') {
  if (!els.flash) return;
  const safe = safeString(message, 240);
  if (!safe) {
    els.flash.hidden = true;
    els.flash.textContent = '';
    return;
  }
  els.flash.hidden = false;
  els.flash.className = `auth-flash ${kind}`;
  els.flash.textContent = safe;
}

function recordLoginAttemptStarted(provider = 'login', route = currentRoute()) {
  const startedAt = Date.now();
  try {
    window.sessionStorage.setItem(LOGIN_ATTEMPT_STARTED_AT_KEY, JSON.stringify({
      provider: safeString(provider, 40),
      startedAt,
      expiresAt: startedAt + LOGIN_ACTION_WAIT_MS,
      next: postLoginPath(route.next),
      source: safeString(route.source, 60)
    }));
  } catch {}
  return startedAt;
}

function showLoginPanel(visible = true) {
  if (els.panel) els.panel.hidden = !visible;
  if (els.checkingPanel) els.checkingPanel.hidden = Boolean(visible);
}

function setCheckingStatus(message = '') {
  if (els.checkingStatus) els.checkingStatus.textContent = safeString(message, 240);
}

async function track(event, meta = {}) {
  const eventName = safeString(event, 64).toLowerCase().replace(/[^a-z0-9_:-]+/g, '_').replace(/^_+|_+$/g, '');
  if (!eventName) return;
  try {
    await fetch('/api/analytics/events', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'same-origin',
      keepalive: true,
      body: JSON.stringify({
        event: eventName,
        visitor_id: visitorId(),
        page_path: window.location.pathname || '/login.html',
        current_tab: '',
        source: 'web',
        ...loginInternalTrafficParams(),
        meta: {
          source: safeString(meta.source || '', 60),
          status: safeString(meta.status || '', 60),
          action: safeString(meta.action || '', 60),
          ...loginInternalTrafficParams()
        }
      })
    });
  } catch {
    // Analytics must never block login.
  }
}

function buildAuthUrl(provider = 'google', route = currentRoute()) {
  const base = provider === 'github' ? '/auth/github' : '/auth/google';
  const url = new URL(base, runtimeAuthBaseUrl || window.location.origin);
  url.searchParams.set('return_to', postLoginPath(route.next));
  url.searchParams.set('login_source', route.source);
  url.searchParams.set('visitor_id', visitorId());
  return runtimeAuthBaseUrl && runtimeAuthBaseUrl !== window.location.origin
    ? url.toString()
    : `${url.pathname}${url.search}`;
}

function buildOfficialLoginUrl(route = currentRoute()) {
  const url = new URL('/login', runtimeAuthBaseUrl || window.location.origin);
  url.searchParams.set('next', postLoginPath(route.next));
  url.searchParams.set('source', route.source);
  url.searchParams.set('visitor_id', visitorId());
  return url.toString();
}

function applyProviderAvailability(status = {}) {
  const externalAuth = Boolean(runtimeUsesExternalAuth);
  const emailAvailable = Boolean(status?.emailConfigured || externalAuth);
  const googleAvailable = Boolean(status?.googleConfigured || externalAuth);
  const githubAvailable = Boolean(status?.githubConfigured || status?.githubAppConfigured || externalAuth);
  if (els.emailInput) els.emailInput.disabled = !emailAvailable || !authStatusChecked || Boolean(status?.loggedIn);
  if (els.emailBtn) {
    els.emailBtn.hidden = !emailAvailable;
    els.emailBtn.disabled = !emailAvailable || !authStatusChecked || Boolean(status?.loggedIn);
  }
  if (els.google) {
    els.google.hidden = !googleAvailable;
    els.google.disabled = !googleAvailable || !authStatusChecked || Boolean(status?.loggedIn);
  }
  if (els.github) {
    els.github.hidden = !githubAvailable;
    els.github.disabled = !githubAvailable || !authStatusChecked || Boolean(status?.loggedIn);
  }
  if (els.continueBtn) {
    els.continueBtn.hidden = !status?.loggedIn;
  }
  if (!emailAvailable && !googleAvailable && !githubAvailable && els.status) {
    els.status.textContent = 'No login provider is configured on this deployment yet.';
  }
}

function gatedSourceTabLabel(source = '') {
  const safe = safeString(source, 80)
    .replace(/^gate_timeout_/, '')
    .replace(/^gate_/, '')
    .replace(/[^a-z0-9_-]/gi, '')
    .trim();
  return (safe || 'work').toUpperCase();
}

async function loadAuthStatus(route = currentRoute()) {
  authStatusChecked = false;
  showLoginPanel(false);
  setCheckingStatus('Checking your session. Login options will remain available if the check takes longer than a few seconds.');
  applyProviderAvailability({});
  const revealLoginOptionsDuringLongCheck = () => {
    if (authStatusChecked) return;
    authStatusChecked = true;
    applyTrustedAuthOrigin({});
    showLoginPanel(true);
    if (els.emailInput) els.emailInput.disabled = false;
    if (els.emailBtn) {
      els.emailBtn.hidden = false;
      els.emailBtn.disabled = false;
    }
    if (els.google) {
      els.google.hidden = false;
      els.google.disabled = false;
    }
    if (els.github) {
      els.github.hidden = false;
      els.github.disabled = false;
    }
    setCheckingStatus('Still checking your current session. You can also start a sign-in provider below.');
    if (els.status) els.status.textContent = 'Still checking your session in the background. You can choose a provider now if needed.';
  };
  const softReveal = window.setTimeout(revealLoginOptionsDuringLongCheck, AUTH_STATUS_SOFT_REVEAL_MS);
  try {
    const response = await fetch('/auth/status', {
      credentials: 'same-origin'
    });
    if (!response.ok) throw new Error('Auth status check failed');
    const status = await response.json().catch(() => ({}));
    const nextPath = postLoginPath(route.next);
    authStatusChecked = true;
    const usingExternalAuth = applyTrustedAuthOrigin(status);
    if (status?.loggedIn && els.status) {
      els.status.textContent = 'You are already signed in. Redirecting now.';
    } else if (els.status) {
      els.status.textContent = usingExternalAuth
        ? `Choose a provider. CAIt will open ${runtimeAuthBaseUrl} for trusted sign-in.`
        : 'Choose Google, GitHub, or email. After login, CAIt opens the requested chat workspace.';
    }
    if (els.continueBtn) {
      els.continueBtn.hidden = !status?.loggedIn;
      els.continueBtn.onclick = () => { window.location.replace(nextPath); };
    }
    applyProviderAvailability(status);
    if (status?.loggedIn) {
      setCheckingStatus('You are already signed in. Opening your workspace.');
      window.location.replace(nextPath);
      return;
    }
    showLoginPanel(true);
    await track('sign_in_required_shown', { source: `login_page:${route.source}`, status: 'visible' });
  } catch {
    authStatusChecked = true;
    applyTrustedAuthOrigin({});
    showLoginPanel(true);
    if (els.emailInput) els.emailInput.disabled = false;
    if (els.emailBtn) {
      els.emailBtn.hidden = false;
      els.emailBtn.disabled = false;
    }
    if (els.google) {
      els.google.hidden = false;
      els.google.disabled = false;
    }
    if (els.github) {
      els.github.hidden = false;
      els.github.disabled = false;
    }
    if (els.status) els.status.textContent = 'Could not verify login provider status. You can still try a provider below.';
    await track('sign_in_required_shown', { source: `login_page:${route.source}`, status: 'unknown' });
  } finally {
    window.clearTimeout(softReveal);
  }
}

function bindProviderButton(button, provider, route = currentRoute()) {
  if (!button) return;
  button.onclick = () => {
    recordLoginAttemptStarted(provider, route);
    if (els.status) els.status.textContent = 'Login started. CAIt will wait up to 60 minutes from this login attempt.';
    void track(`${provider}_login_started`, {
      source: `login_page:${route.source}`,
      action: route.next
    });
    window.location.href = buildAuthUrl(provider, route);
  };
}

async function requestEmailLink(route = currentRoute()) {
  if (runtimeUsesExternalAuth) {
    recordLoginAttemptStarted('email', route);
    window.location.href = buildOfficialLoginUrl(route);
    return;
  }
  const email = safeString(els.emailInput?.value || '', 160).toLowerCase();
  const nextPath = postLoginPath(route.next);
  if (!email || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)) {
    flash('Enter a valid email address first.', 'error');
    els.emailInput?.focus();
    return;
  }
  if (els.emailBtn) els.emailBtn.disabled = true;
  if (els.status) els.status.textContent = 'Sending your sign-in link. The page stays here.';
  recordLoginAttemptStarted('email', route);
  await track('email_login_started', {
    source: `login_page:${route.source}`,
    action: nextPath
  });
  try {
    const response = await fetch('/auth/email/request', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({
        email,
        return_to: nextPath,
        login_source: route.source,
        visitor_id: visitorId()
      })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload?.error || 'Could not send the email sign-in link.');
    flash('Check your inbox. The email link signs you in and creates your account if needed.', 'ok');
    if (els.status) els.status.textContent = 'Email link sent. Open the link in the same browser if possible.';
  } catch (error) {
    flash(String(error?.message || error || 'Could not send the email sign-in link.'), 'error');
    if (els.status) els.status.textContent = 'Email sign-in failed. Review the address and try again.';
  } finally {
    if (els.emailBtn) els.emailBtn.disabled = false;
  }
}

async function init() {
  const route = currentRoute();
  if (els.hint && route.source.startsWith('gate_')) {
    const gatedTab = gatedSourceTabLabel(route.source);
    els.hint.textContent = `${gatedTab} is private. Sign in or sign up here, then CAIt opens that area.`;
  }
  if (route.authError) {
    flash(`Sign-in failed: ${route.authError}`, 'error');
  }
  if (els.emailBtn) els.emailBtn.onclick = () => { void requestEmailLink(route); };
  if (els.emailInput) els.emailInput.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    void requestEmailLink(route);
  });
  bindProviderButton(els.google, 'google', route);
  bindProviderButton(els.github, 'github', route);
  await track('page_view', { source: `login_page:${route.source}` });
  await loadAuthStatus(route);
}

void init();
