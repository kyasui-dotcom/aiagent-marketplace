export function createClientBootstrapController(deps = {}) {
  const {
    state,
    document,
    window,
    history,
    closePlanModal,
    flash,
    initAnalytics,
    loadManifestExample,
    pauseWorkChatOnTabLeave,
    primeAuthCheckFromStatus,
    readInitialRouteState,
    readRememberedTab,
    refresh,
    requireStartLoginGate,
    switchTab,
    trackConversionEvent,
    trackPageViewOnce
  } = deps;

  function applyInitialRoute() {
    const initialRoute = readInitialRouteState();
    closePlanModal();
    state.routeAgentId = initialRoute.agentId;
    if (initialRoute.settingsSection) state.settingsSection = initialRoute.settingsSection;
    switchTab(initialRoute.tab || readRememberedTab() || 'start', { allowBootstrapAccess: true });

    if (initialRoute.stripeState) {
      if (initialRoute.stripeState === 'subscription_success') {
        void trackConversionEvent('purchase', {
          source: 'stripe_return',
          status: initialRoute.stripeState
        });
      }
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.delete('stripe');
      history.replaceState({}, '', `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`);
    }

    if (initialRoute.authError) {
      const currentUrl = new URL(window.location.href);
      flash(`Sign-in failed: ${initialRoute.authError}`, 'error');
      currentUrl.searchParams.delete('auth_error');
      history.replaceState({}, '', `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`);
    }
  }

  function bindLifecycleHandlers() {
    window.addEventListener('pageshow', () => {
      closePlanModal();
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && state.currentTab === 'work') pauseWorkChatOnTabLeave();
    });
    window.addEventListener('pagehide', () => {
      if (state.currentTab === 'work') pauseWorkChatOnTabLeave();
    });
  }

  async function bootstrapInitialSnapshot() {
    const startedOnAuthCheck = state.currentTab === 'auth-check';
    if (startedOnAuthCheck) {
      const resolved = await primeAuthCheckFromStatus();
      if (resolved && !state.snapshot?.auth?.loggedIn && state.currentTab === 'auth-check') return;
    }
    state.initialSnapshotLoading = true;
    try {
      await refresh();
    } catch (error) {
      flash(error.message || 'Initial data load failed. Refresh the page or sign in again.', 'error');
      if (startedOnAuthCheck && state.currentTab === 'auth-check') {
        requireStartLoginGate(state.pendingAuthTab || 'work', 'Session check timed out. Sign in to continue.');
      }
    } finally {
      state.initialSnapshotLoading = false;
      trackPageViewOnce();
    }
  }

  function start() {
    initAnalytics();
    loadManifestExample();
    applyInitialRoute();
    bindLifecycleHandlers();
    void bootstrapInitialSnapshot();
  }

  return {
    applyInitialRoute,
    bindLifecycleHandlers,
    bootstrapInitialSnapshot,
    start
  };
}
