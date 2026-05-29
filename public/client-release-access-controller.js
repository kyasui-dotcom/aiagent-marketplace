export function createClientReleaseAccessController(deps = {}) {
  const {
    document,
    els,
    state,
    productShortName = 'CAIt',
    agentHealth,
    canManageAgentsFromBrowser,
    canManagePaymentsFromBrowser,
    canManagePayoutsFromBrowser,
    canOrderFromBrowser,
    canUseDevApi,
    canUseGithubAgentFlow,
    defaultLoggedInTab,
    setButtonAccess,
    setElementVisible,
    switchTab
  } = deps;

  function setTabVisible(tab, visible) {
    const btn = document.querySelector(`.tab-btn[data-tab="${tab}"]`);
    if (!btn) return;
    btn.hidden = !visible;
  }

  function renderStartGuide(snapshot = state.snapshot || {}) {
    if (!els.startGuideCard) return;
    const auth = snapshot?.auth || {};
    const agents = snapshot?.agents || [];
    const jobs = snapshot?.jobs || [];
    const readyAgents = agents.filter((agent) => agentHealth(agent).ready);
    const lastJob = jobs[0] || null;
    let tone = 'info';
    let title = 'Start with CAIt Chat.';
    let body = 'Ask a product question or describe rough work. CAIt Chat can prepare the order brief first; billing starts only after you confirm SEND ORDER.';

    if (!auth?.loggedIn) {
      tone = 'ok';
    } else if (auth?.loggedIn && !agents.length) {
      title = 'CAIt Chat is ready.';
      body = 'Use Chat to prepare or send an order. Use AGENTS when you want to publish your own agent from GitHub or a manifest.';
    } else if (auth?.loggedIn && agents.length && !readyAgents.length) {
      title = 'CAIt Chat can still prepare work.';
      body = 'Your agent list needs verification before routing to your agents. Built-in and verified agents can still be used from Chat.';
      tone = 'warn';
    } else if (readyAgents.length) {
      title = `CAIt Chat can route to ${readyAgents.length} ready agent${readyAgents.length === 1 ? '' : 's'}.`;
      body = `Start in Chat, let ${productShortName} prepare the brief, then SEND ORDER only when the task and cost are clear.`;
      tone = 'ok';
    }
    if (auth?.loggedIn && lastJob && ['failed', 'timed_out'].includes(lastJob.status)) {
      title = 'Inspect the last failed run.';
      body = 'Open Chat, inspect the selected run, then retry only after the cause is clear.';
      tone = 'warn';
    }
    els.startGuideCard.textContent = `${title}\n\n${body}`;
    els.startGuideCard.className = `detail-box action-card ${tone} compact-card`;
  }

  function renderJobModeOptions(auth) {
    if (!els.jobMode) return;
    const options = canUseDevApi(auth)
      ? [
          { value: 'complete', label: 'simulate complete' },
          { value: 'fail', label: 'simulate fail' },
          { value: 'create-only', label: 'create only' },
          { value: 'external-demo', label: 'dispatch to connected agent' }
        ]
      : [
          { value: 'create-only', label: 'broker default' }
        ];
    const signature = JSON.stringify(options);
    if (els.jobMode.dataset.signature !== signature) {
      els.jobMode.innerHTML = options.map((option) => `<option value="${option.value}">${option.label}</option>`).join('');
      els.jobMode.dataset.signature = signature;
    }
    if (!options.some((option) => option.value === els.jobMode.value)) {
      els.jobMode.value = options[0]?.value || 'create-only';
    }
  }

  function renderReleaseAccess(auth) {
    const canOrder = canOrderFromBrowser(auth);
    const canManagePayments = canManagePaymentsFromBrowser(auth);
    const canManageAgents = canManageAgentsFromBrowser(auth);
    const canGithubFlow = canUseGithubAgentFlow(auth);
    const canManagePayouts = canManagePayoutsFromBrowser(auth);
    const canDev = canUseDevApi(auth);
    const showDemoTools = Boolean(canDev);
    const canUseOps = Boolean(canDev);
    const loggedIn = Boolean(auth?.loggedIn);
    setTabVisible('start', !loggedIn);
    setTabVisible('work', loggedIn);
    setTabVisible('agents', loggedIn);
    setTabVisible('connect', loggedIn);
    setTabVisible('settings', loggedIn);
    setButtonAccess(els.registerAgentBtn, canManageAgents);
    setButtonAccess(els.draftAgentSkillBtn, true);
    setButtonAccess(els.importManifestBtn, canManageAgents);
    setButtonAccess(els.importUrlBtn, canManageAgents);
    setButtonAccess(els.createJobBtn, true);
    setButtonAccess(els.loadReposBtn, canGithubFlow);
    setButtonAccess(els.generateRepoManifestBtn, canGithubFlow);
    setButtonAccess(els.importSelectedRepoBtn, canGithubFlow);
    setButtonAccess(els.createAdapterPrBtn, canGithubFlow);
    setButtonAccess(els.importDeployedAdapterBtn, canGithubFlow);
    setButtonAccess(els.saveBillingSettingsBtn, canManagePayments);
    setButtonAccess(els.savePayoutSettingsBtn, canManagePayouts);
    setButtonAccess(els.retryDispatchBtn, canDev);
    setButtonAccess(els.claimJobBtn, canUseOps);
    setButtonAccess(els.submitResultBtn, canUseOps);
    setElementVisible(els.retryDispatchBtn, canDev);
    setElementVisible(els.seedBtn, showDemoTools);
    setTabVisible('ops', canUseOps);
    if (els.topOpenChatBtn) els.topOpenChatBtn.textContent = loggedIn ? 'CHAT' : 'SIGN IN';
    if (!canUseOps && state.currentTab === 'ops') {
      switchTab(loggedIn ? defaultLoggedInTab(state.snapshot) : 'start');
    }
    renderJobModeOptions(auth);
  }

  return {
    renderReleaseAccess,
    renderStartGuide,
    setTabVisible
  };
}
