export function createClientAuthActionsController(deps = {}) {
  const {
    state,
    els,
    window,
    canManageAgentsFromBrowser,
    canManagePaymentsFromBrowser,
    canManagePayoutsFromBrowser,
    canOrderFromBrowser,
    connectorActionLabel,
    defaultLoggedInTab,
    flash,
    googleAuthActionUrl,
    googleOAuthBrowserWarning,
    isGithubAuthorized,
    isGithubLinked,
    isGoogleAuthorized,
    isGoogleLinked,
    isLikelyRestrictedGoogleOAuthBrowser,
    linkedProvidersLabel,
    openGithubSignIn,
    openLoginForProtectedAction,
    openSettingsSection,
    renderAgentSetupFlow,
    renderAgents,
    renderOrderComposer,
    renderReleaseAccess,
    requireStartLoginGate,
    setElementVisible,
    setTabVisible,
    switchTab,
    trackConversionEvent,
    trackAuthCompletion,
    trackLoginStarted
  } = deps;

  function renderAuth(auth) {
    if (!auth) return;
    setTabVisible('admin', Boolean(auth.isPlatformAdmin));
    if (!auth.isPlatformAdmin && state.currentTab === 'admin') switchTab(auth.loggedIn ? defaultLoggedInTab(state.snapshot) : 'start');
    if (els.authStatus) {
      const lines = [
        `Login: ${auth.loggedIn ? 'connected' : 'not connected'}`,
        `User: ${auth.user ? `${auth.user.login}` : '-'}`,
        `Mode: ${auth.authProvider || 'guest'}`,
        `Linked: ${linkedProvidersLabel(auth)}`,
        `Google access in this browser: ${isGoogleAuthorized(auth) ? 'yes' : 'no'}`,
        `GitHub access in this browser: ${isGithubAuthorized(auth) ? 'yes' : 'no'}`,
        `Can order/pay: ${canOrderFromBrowser(auth) ? 'yes' : 'no'}`,
        `Can register agents: ${canManageAgentsFromBrowser(auth) ? 'yes' : 'no'}`,
        `Can receive payouts: ${canManagePayoutsFromBrowser(auth) ? 'yes' : 'no'}`,
        `Admin dashboard: ${auth.isPlatformAdmin ? 'yes' : 'no'}`
      ];
      if (Boolean(auth.googleConfigured) && isLikelyRestrictedGoogleOAuthBrowser()) {
        lines.push('Google sign-in note: use Chrome, Edge, or Safari if Google blocks this browser.');
      }
      els.authStatus.textContent = lines.join('\n');
    }
    const googleAvailable = Boolean(auth.googleConfigured);
    const githubAvailable = Boolean(auth.githubConfigured || auth.githubAppConfigured);
    const googleLinked = isGoogleLinked(auth);
    const githubLinked = isGithubLinked(auth);
    const googleAuthorized = isGoogleAuthorized(auth);
    const githubAuthorized = isGithubAuthorized(auth);
    const showGoogleButton = !auth.loggedIn || !googleAuthorized;
    const showGithubButton = !auth.loggedIn || !githubAuthorized;
    setElementVisible(els.googleLoginBtn, showGoogleButton && googleAvailable);
    setElementVisible(els.githubLoginBtn, showGithubButton && githubAvailable);
    setElementVisible(els.logoutBtn, true);
    if (els.googleLoginBtn) {
      els.googleLoginBtn.disabled = !googleAvailable;
      els.googleLoginBtn.textContent = !auth.loggedIn
        ? 'GOOGLE SIGN IN'
        : googleLinked
          ? 'REFRESH GOOGLE ACCESS'
          : connectorActionLabel('connect_google');
    }
    if (els.githubLoginBtn) {
      els.githubLoginBtn.disabled = !githubAvailable;
      els.githubLoginBtn.textContent = !auth.loggedIn
        ? 'GITHUB SIGN IN'
        : githubLinked
          ? 'REFRESH GITHUB ACCESS'
          : connectorActionLabel('connect_github');
    }
    if (els.logoutBtn) {
      els.logoutBtn.disabled = false;
      els.logoutBtn.textContent = auth.loggedIn ? 'LOGOUT' : 'RESET SESSION';
    }
    trackAuthCompletion(auth);
    renderReleaseAccess(auth);
  }

  function openPrimaryGoogleSignIn(options = {}) {
    if (isLikelyRestrictedGoogleOAuthBrowser()) {
      flash(googleOAuthBrowserWarning(), 'warn');
    }
    if (!state.snapshot?.auth?.loggedIn && !state.snapshot?.auth?.googleConfigured) {
      openLoginForProtectedAction('google_login_unavailable', 'work');
      return;
    }
    trackLoginStarted('google');
    window.location.href = googleAuthActionUrl(state.snapshot?.auth || {}, options);
  }

  function continueOpenChatAsGuest() {
    state.openChatEntryDismissed = true;
    renderOrderComposer();
    els.jobPrompt?.focus();
  }

  function connectXAccount(options = {}) {
    const auth = state.snapshot?.auth || {};
    if (!auth.loggedIn) {
      flash('Sign in first, then connect X. The X connector is saved to your CAIt account.', 'warn');
      openLoginForProtectedAction('connect_x', 'work');
      return;
    }
    if (auth.xConfigured === false || auth.xTokenEncryptionConfigured === false) {
      flash('X OAuth is not configured on this deployment yet.', 'error');
      return;
    }
    const capabilities = Array.isArray(options.capabilities)
      ? options.capabilities
      : String(options.capabilities || '').split(/[,\s]+/).filter(Boolean);
    const url = new URL('/auth/x', window.location.origin);
    if (capabilities.length) url.searchParams.set('capabilities', capabilities.join(','));
    else url.searchParams.set('capabilities', 'x.post');
    window.location.href = `${url.pathname}${url.search}`;
  }

  function openOrderTab() {
    if (!state.snapshot?.auth?.loggedIn) {
      requireStartLoginGate('work', 'Sign in from START first to use CAIt Chat.');
      return;
    }
    if (els.mainNavMenu) els.mainNavMenu.open = false;
    switchTab('work');
    window.requestAnimationFrame(() => els.jobPrompt?.focus());
  }

  function openAgentCatalog() {
    if (!state.snapshot?.auth?.loggedIn) {
      requireStartLoginGate('agents', 'Sign in from START first to open the agent catalog.');
      return;
    }
    state.showAgentList = true;
    switchTab('agents');
    renderAgentSetupFlow(state.snapshot?.auth || {});
    renderAgents(state.snapshot?.agents || []);
  }

  function openAgentListingFlow() {
    if (!state.snapshot?.auth?.loggedIn) {
      requireStartLoginGate('agents', 'Sign in from START first to publish an agent.');
      return;
    }
    state.agentSetupStarted = true;
    state.agentSetupMode = '';
    state.agentSetupCompletedId = null;
    state.showAgentList = true;
    void trackConversionEvent('agent_publish_started', { source: 'listing_flow' });
    switchTab('agents');
    renderAgentSetupFlow(state.snapshot?.auth || {});
    renderAgents(state.snapshot?.agents || []);
  }

  function ensureSettingsLogin() {
    const loggedIn = Boolean(state.snapshot?.auth?.loggedIn && state.snapshot?.auth?.user?.login);
    if (loggedIn) return true;
    requireStartLoginGate('settings', 'Login required. SETTINGS actions are private.');
    return false;
  }

  function ensureGithubLinkedAccess(options = {}) {
    const auth = state.snapshot?.auth || {};
    const githubLinked = isGithubLinked(auth);
    const githubAuthorized = isGithubAuthorized(auth);
    const requiresGithubFlow = Boolean(options.requireGithubFlow);
    if (requiresGithubFlow ? githubAuthorized : (githubLinked || canManageAgentsFromBrowser(auth) || canManagePayoutsFromBrowser(auth))) return true;
    if (!auth?.loggedIn) {
      flash('Sign in first, then connect GitHub.', 'error');
      openGithubSignIn();
      return false;
    }
    if (githubLinked && requiresGithubFlow && !githubAuthorized) {
      if (options.section === 'provider') openSettingsSection('provider');
      else if (options.section === 'keys') openSettingsSection('keys');
      else switchTab('agents');
      flash(options.reconnectMessage || 'GitHub is already linked. Refresh GitHub access in this browser, then retry.', 'error');
      return false;
    }
    if (options.section === 'provider') openSettingsSection('provider');
    else if (options.section === 'keys') openSettingsSection('keys');
    else switchTab('agents');
    flash(options.message || 'GitHub connection required for this action.', 'error');
    return false;
  }

  return {
    connectXAccount,
    continueOpenChatAsGuest,
    ensureGithubLinkedAccess,
    ensureSettingsLogin,
    openAgentCatalog,
    openAgentListingFlow,
    openOrderTab,
    openPrimaryGoogleSignIn,
    renderAuth
  };
}
