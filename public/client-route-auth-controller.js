export function createClientRouteAuthController(deps = {}) {
  const {
    state,
    els,
    safeAnalyticsString,
    visitorId,
    githubAuthActionUrl,
    trackLoginStarted,
    renderReleaseAccess,
    renderAgentSetupFlow,
    render,
    switchTab,
    requireStartLoginGate
  } = deps;

  let runtimeRememberedTab = '';
  let runtimeRememberedAuth = false;

  function readRememberedTab() {
    return runtimeRememberedTab;
  }

  function clearRememberedTab() {
    runtimeRememberedTab = '';
  }

  function rememberTab(tab) {
    const safeTab = String(tab || '').trim();
    if (!safeTab || safeTab === 'start' || safeTab === 'ops') return;
    runtimeRememberedTab = safeTab;
  }

  function normalizeTab(tab) {
    const safe = String(tab || '').trim().toLowerCase();
    return ['start', 'work', 'agents', 'connect', 'settings', 'admin', 'ops'].includes(safe) ? safe : '';
  }

  function normalizeSettingsSection(section) {
    const safe = String(section || '').trim().toLowerCase();
    return ['payments', 'provider', 'keys', 'funnel', 'reports'].includes(safe) ? safe : '';
  }

  function loginReturnPathForTab(tab = 'work') {
    const safeTab = normalizeTab(tab);
    if (!safeTab || safeTab === 'start') return '/';
    if (safeTab === 'work') return '/chat';
    if (safeTab === 'settings' && state.settingsSection) {
      return `/?tab=settings&section=${encodeURIComponent(state.settingsSection)}`;
    }
    return `/?tab=${encodeURIComponent(safeTab)}`;
  }

  function buildLoginPageUrl({ source = 'direct', nextTab = 'work', nextPath = '' } = {}) {
    const url = new URL('/login.html', window.location.origin);
    const safeSource = safeAnalyticsString(source, 40).toLowerCase() || 'direct';
    const targetPath = String(nextPath || loginReturnPathForTab(nextTab)).trim() || '/chat';
    url.searchParams.set('source', safeSource);
    url.searchParams.set('next', targetPath);
    url.searchParams.set('visitor_id', visitorId());
    return `${url.pathname}${url.search}`;
  }

  function openDedicatedLoginPage(options = {}) {
    window.location.href = buildLoginPageUrl(options);
  }

  function currentPrivateReturnTab(fallback = 'work') {
    const tab = normalizeTab(state.currentTab);
    if (tab && tab !== 'start') return tab;
    return normalizeTab(fallback) || 'work';
  }

  function openLoginForProtectedAction(source = 'protected_action', fallbackTab = 'work') {
    openDedicatedLoginPage({
      source,
      nextTab: currentPrivateReturnTab(fallbackTab)
    });
  }

  function openGithubSignIn() {
    trackLoginStarted('github');
    window.location.href = githubAuthActionUrl(state.snapshot?.auth || {});
  }

  async function fetchFastAuthStatus(timeoutMs = 60 * 60 * 1000) {
    const inlineResolved = window.__CAIT_FAST_AUTH_RESOLVED__;
    if (inlineResolved && typeof inlineResolved === 'object') return inlineResolved;
    const inlinePromise = window.__CAIT_FAST_AUTH_STATUS__;
    if (inlinePromise && typeof inlinePromise.then === 'function') {
      const timeoutValue = Symbol('fast-auth-timeout');
      const timeoutPromise = new Promise((resolve) => {
        window.setTimeout(() => resolve(timeoutValue), Math.max(500, Number(timeoutMs) || 60 * 60 * 1000));
      });
      const result = await Promise.race([inlinePromise, timeoutPromise]);
      if (result && result !== timeoutValue) return result;
    }
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), Math.max(500, Number(timeoutMs) || 60 * 60 * 1000));
    try {
      const response = await fetch('/auth/status', {
        credentials: 'same-origin',
        signal: controller.signal
      });
      if (!response.ok) return null;
      return await response.json().catch(() => null);
    } catch {
      return null;
    } finally {
      window.clearTimeout(timeout);
    }
  }

  function applyFastAuthStatusForAuthCheck(authStatus = null) {
    if (!authStatus || state.currentTab !== 'auth-check') return false;
    const targetTab = state.pendingAuthTab || 'work';
    const auth = {
      ...(state.snapshot?.auth || {}),
      ...authStatus
    };
    state.snapshot = {
      ...(state.snapshot || {}),
      auth
    };
    rememberAuthState(Boolean(auth.loggedIn));
    renderReleaseAccess(auth);
    if (auth.loggedIn) {
      state.pendingAuthTab = '';
      switchTab(targetTab);
    } else {
      state.pendingAuthTab = '';
      requireStartLoginGate(targetTab, 'Sign in from START first. The product experience is private after login.');
    }
    return true;
  }

  async function primeAuthCheckFromStatus() {
    if (state.currentTab !== 'auth-check') return undefined;
    const status = await fetchFastAuthStatus();
    return applyFastAuthStatusForAuthCheck(status);
  }

  function readRememberedAuthState() {
    return runtimeRememberedAuth;
  }

  function rememberAuthState(loggedIn) {
    runtimeRememberedAuth = Boolean(loggedIn);
  }

  function readInitialRouteState() {
    const url = new URL(window.location.href);
    const agentId = String(url.searchParams.get('agent') || '').trim();
    const requestedTab = normalizeTab(url.searchParams.get('tab'));
    return {
      authError: String(url.searchParams.get('auth_error') || '').trim(),
      stripeState: String(url.searchParams.get('stripe') || '').trim(),
      settingsSection: normalizeSettingsSection(url.searchParams.get('section')),
      tab: requestedTab || (agentId ? 'agents' : ''),
      agentId
    };
  }

  function syncRouteState() {
    const url = new URL(window.location.href);
    if (state.currentTab && state.currentTab !== 'start') url.searchParams.set('tab', state.currentTab);
    else url.searchParams.delete('tab');
    if (state.currentTab === 'agents' && state.selectedAgentId) url.searchParams.set('agent', state.selectedAgentId);
    else url.searchParams.delete('agent');
    if (state.currentTab === 'settings' && state.settingsSection) url.searchParams.set('section', state.settingsSection);
    else url.searchParams.delete('section');
    history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  }

  function defaultLoggedInTab(snapshot = state.snapshot || {}) {
    const remembered = readRememberedTab();
    if (remembered === 'admin' && snapshot?.auth?.isPlatformAdmin) return remembered;
    if (['work', 'agents', 'connect', 'settings'].includes(remembered)) return remembered;
    const agents = snapshot?.agents || [];
    return agents.length ? 'work' : 'agents';
  }

  function openStartFromLogo(event) {
    if (event?.button || event?.metaKey || event?.ctrlKey || event?.shiftKey || event?.altKey) return;
    event?.preventDefault();
    if (state.snapshot?.auth?.loggedIn) {
      const nextTab = defaultLoggedInTab(state.snapshot);
      switchTab(nextTab);
      history.pushState({}, '', nextTab === 'work' ? '/chat' : `/?tab=${encodeURIComponent(nextTab)}`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    clearRememberedTab();
    state.currentTab = 'start';
    state.routeAgentId = '';
    state.selectedAgentId = '';
    document.querySelectorAll('[data-screen]').forEach((node) => {
      node.hidden = node.dataset.screen !== 'start';
    });
    document.querySelectorAll('.tab-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.tab === 'start');
    });
    history.pushState({}, '', '/');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function openAgentsGithubFlow() {
    switchTab('agents');
    state.agentSetupStarted = true;
    state.agentSetupMode = 'github';
    state.agentSetupCompletedId = null;
    state.showAgentList = false;
    renderAgentSetupFlow(state.snapshot?.auth);
    if (els.agentGithubPanel?.scrollIntoView) {
      window.requestAnimationFrame(() => {
        els.agentGithubPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
    if (state.snapshot) render(state.snapshot);
  }

  return {
    readRememberedTab,
    clearRememberedTab,
    rememberTab,
    loginReturnPathForTab,
    buildLoginPageUrl,
    openDedicatedLoginPage,
    currentPrivateReturnTab,
    openLoginForProtectedAction,
    openGithubSignIn,
    fetchFastAuthStatus,
    applyFastAuthStatusForAuthCheck,
    primeAuthCheckFromStatus,
    readRememberedAuthState,
    rememberAuthState,
    normalizeTab,
    normalizeSettingsSection,
    readInitialRouteState,
    syncRouteState,
    openStartFromLogo,
    defaultLoggedInTab,
    openAgentsGithubFlow
  };
}
