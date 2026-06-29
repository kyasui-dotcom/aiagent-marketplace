export function createClientAppShellController(deps = {}) {
  const {
    state,
    els,
    api,
    clientAuthActionsController,
    clientWorkSelectionController,
    currentMonthPeriod,
    mergeOptimisticOrderJobsIntoSnapshot,
    formatWorkUiText,
    rememberAuthState,
    writeOpenChatSessions,
    syncLanding,
    mergeServerChatMemorySessions,
    renderAgentTaskFilter,
    renderStartGuide,
    safeText,
    yen,
    renderAgentSetupFlow,
    renderWorkFlow,
    renderScheduledWorkList,
    renderConnectHub,
    renderStream,
    renderRunHealth,
    renderAgentOps,
    renderAgents,
    renderOrderComposer,
    renderJobs,
    renderBilling,
    renderBillingAudits,
    renderSettings,
    renderSettingsFlow,
    renderFeedbackForm,
    renderFeedbackReports,
    renderConversionAnalytics,
    renderChatTranscripts,
    renderAdminDashboard,
    updateCliPanels,
    setDetail,
    maybeAutoCheckSelectedAgent,
    syncOpenChatTrackedJobsFromSnapshot,
    scheduleLiveSnapshotRefresh,
    backfillTrackedJobsIntoSnapshot,
    maybeAutoLoadRepos,
    syncCreateJobButtonForCurrentPrompt
  } = deps;

  function flash(message, kind = 'ok') {
    if (!els.flash) return;
    els.flash.hidden = false;
    els.flash.textContent = formatWorkUiText(String(message || ''));
    els.flash.className = `box flash ${kind}`;
  }

  function clearFlash() {
    if (!els.flash) return;
    els.flash.hidden = true;
    els.flash.textContent = '';
    els.flash.className = 'box flash';
  }

  function renderAuth(auth) {
    return clientAuthActionsController.renderAuth(auth);
  }

  function render(snapshot) {
    state.snapshot = snapshot;
    const { stats, agents, jobs, events, storage, auth, billingAudits, accountSettings, monthlySummary } = snapshot;
    const runtimeOwner = String(state.openChatRuntimeOwnerLogin || '').toLowerCase();
    const activeOwner = String(auth?.user?.login || 'guest').toLowerCase();
    if (runtimeOwner && runtimeOwner !== activeOwner) {
      writeOpenChatSessions([]);
      state.currentOpenChatSessionId = '';
    }
    state.openChatRuntimeOwnerLogin = activeOwner;
    rememberAuthState(Boolean(auth?.loggedIn));
    if (state.routeAgentId && agents.some((agent) => agent.id === state.routeAgentId)) {
      state.selectedAgentId = state.routeAgentId;
      state.routeAgentId = '';
      if (state.currentTab !== 'agents') deps.switchTab('agents');
    }
    syncLanding(snapshot);
    mergeServerChatMemorySessions(snapshot);
    renderAgentTaskFilter(agents);
    renderStartGuide(snapshot);
    safeText(els.activeJobs, stats.activeJobs);
    safeText(els.onlineAgents, stats.onlineAgents);
    safeText(els.grossVolume, yen(stats.grossVolume));
    safeText(els.platformRevenue, yen(stats.platformRevenue));
    safeText(els.todayCost, yen(stats.todayCost));
    safeText(els.failedJobs, stats.failedJobs);
    safeText(els.storageDetail, [
      `Storage: ${storage.kind}`,
      `Persistent: ${storage.supportsPersistence ? 'yes' : 'no'}`,
      `Deploy target: cloudflare-worker`,
      `Path: ${storage.path || '-'}`,
      `Note: ${storage.note || '-'}`
    ].join('\n'));
    renderAuth(auth);
    renderAgentSetupFlow(auth);
    renderWorkFlow(snapshot);
    renderScheduledWorkList(snapshot.recurringOrders || []);
    renderConnectHub(snapshot);
    renderStream(events);
    renderRunHealth(stats);
    renderAgentOps(agents);
    renderAgents(agents);
    renderOrderComposer();
    renderJobs(jobs);
    renderBilling(jobs);
    renderBillingAudits(billingAudits || []);
    renderSettings(accountSettings, monthlySummary, auth);
    renderSettingsFlow(accountSettings, monthlySummary, auth);
    renderFeedbackForm(auth);
    renderFeedbackReports(snapshot.feedbackReports || [], auth);
    renderConversionAnalytics(snapshot.conversionAnalytics || null, auth);
    renderChatTranscripts(snapshot.chatTranscripts || [], auth);
    renderAdminDashboard(snapshot.adminDashboard || null, auth);
    updateCliPanels(snapshot);
    if (state.selectedJobId) {
      const job = snapshot.jobs.find((item) => item.id === state.selectedJobId);
      if (job) {
        setDetail(job);
      }
    }
    if (state.selectedAgentId) {
      const agent = snapshot.agents.find((item) => item.id === state.selectedAgentId);
      if (agent) {
        deps.setAgentDetail(agent);
        maybeAutoCheckSelectedAgent(agent);
      }
    }
  }

  async function refresh() {
    const period = encodeURIComponent(state.settingsPeriod || currentMonthPeriod());
    const snapshot = mergeOptimisticOrderJobsIntoSnapshot(await api(`/api/snapshot?period=${period}`));
    state.snapshot = snapshot;
    state.stripeStatus = null;
    render(snapshot);
    syncOpenChatTrackedJobsFromSnapshot(snapshot);
    scheduleLiveSnapshotRefresh(snapshot);
    void backfillTrackedJobsIntoSnapshot(snapshot).catch(() => {});
    void maybeAutoLoadRepos(snapshot.auth).catch(() => {});
  }

  function applyAgentToRunForm(agent, options = {}) {
    return clientWorkSelectionController.applyAgentToRunForm(agent, options);
  }

  async function runAction(action, fn) {
    clearFlash();
    const original = action.textContent;
    action.disabled = true;
    action.textContent = 'WORKING...';
    try {
      await fn();
    } catch (error) {
      flash(error.message, 'error');
      setDetail({ error: error.message });
    } finally {
      action.disabled = false;
      if (action === els.createJobBtn) syncCreateJobButtonForCurrentPrompt();
      else action.textContent = original;
    }
  }

  function ensureSettingsLogin() {
    return clientAuthActionsController.ensureSettingsLogin();
  }

  function ensureGithubLinkedAccess(options = {}) {
    return clientAuthActionsController.ensureGithubLinkedAccess(options);
  }

  return {
    flash,
    clearFlash,
    renderAuth,
    render,
    refresh,
    applyAgentToRunForm,
    runAction,
    ensureSettingsLogin,
    ensureGithubLinkedAccess
  };
}
