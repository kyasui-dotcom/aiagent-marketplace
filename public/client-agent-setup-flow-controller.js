export function createClientAgentSetupFlowController(deps = {}) {
  const {
    state,
    els,
    productName = 'CAIt',
    productShortName = 'CAIt',
    connectorActionLabel = (value) => String(value || ''),
    isGithubAuthorized = () => false,
    isGithubLinked = () => false,
    selectedRepoFromPicker = () => null,
    setElementVisible = () => {}
  } = deps;

  function hasManifestDraft() {
    return Boolean(String(els.manifestJson?.value || '').trim() || String(els.manifestUrl?.value || '').trim());
  }

  function resetAgentSetupFlow(options = {}) {
    state.agentSetupStarted = false;
    state.agentSetupMode = '';
    state.agentSetupCompletedId = null;
    state.showAgentList = false;
    if (options.clearManifest) {
      if (els.agentSkillMd) els.agentSkillMd.value = '';
      if (els.manifestJson) els.manifestJson.value = '';
      if (els.manifestUrl) els.manifestUrl.value = '';
    }
    if (options.clearSelection) {
      state.selectedAgentId = null;
    }
  }

  function completeAgentSetup(agentId) {
    state.agentSetupStarted = true;
    state.agentSetupMode = '';
    state.agentSetupCompletedId = agentId || null;
    state.showAgentList = true;
  }

  function renderAgentSetupFlow(auth = state.snapshot?.auth || {}) {
    const hasAgents = Array.isArray(state.snapshot?.agents) && state.snapshot.agents.length > 0;
    const completedAgent = state.agentSetupCompletedId
      ? state.snapshot?.agents?.find((agent) => agent.id === state.agentSetupCompletedId) || null
      : null;
    const setupStarted = Boolean(state.agentSetupStarted || state.agentSetupMode || state.agentSetupCompletedId);
    const setupMode = String(state.agentSetupMode || '');
    const setupCompleted = Boolean(state.agentSetupCompletedId);
    const showAgentList = Boolean(state.showAgentList || hasAgents);
    const loggedIn = Boolean(auth?.loggedIn);
    const githubLinked = isGithubLinked(auth);
    const githubAuthorized = isGithubAuthorized(auth);
    const githubReady = Boolean(auth?.githubAppConfigured);
    const reposLoaded = Array.isArray(state.repos) && state.repos.length > 0;
    const repoSelected = Boolean(selectedRepoFromPicker());
    let statusTitle = 'Browse ready agents or list your own.';
    let statusBody = 'Start by trying a managed sample agent. Developers can click LIST YOUR AGENT to publish from GitHub or a manifest.';
    let tone = 'info';
    const showSetupControls = Boolean(setupStarted || setupCompleted);

    setElementVisible(els.agentSetupControls, showSetupControls);
    setElementVisible(els.startAgentOnboardingBtn, !showSetupControls);
    setElementVisible(els.useGithubOnboardingBtn, setupStarted && !setupMode && !setupCompleted);
    setElementVisible(els.useManualOnboardingBtn, setupStarted && !setupMode && !setupCompleted);
    setElementVisible(els.resetAgentOnboardingBtn, setupStarted && !setupCompleted);
    setElementVisible(els.addAnotherAgentBtn, setupCompleted);
    setElementVisible(els.checkAgentListBtn, false);
    setElementVisible(els.agentSetupPanels, setupStarted && !setupCompleted && Boolean(setupMode));
    setElementVisible(els.agentManualPanel, setupMode === 'manual' && !setupCompleted);
    setElementVisible(els.agentGithubPanel, setupMode === 'github' && !setupCompleted);
    setElementVisible(els.agentListPanels, showAgentList);
    setElementVisible(els.agentFlowGithubLoginBtn, setupMode === 'github' && (!loggedIn || !githubAuthorized));
    setElementVisible(els.installGithubAppBtn, setupMode === 'github' && loggedIn && githubAuthorized && githubReady && !reposLoaded);
    setElementVisible(els.loadReposBtn, setupMode === 'github' && loggedIn && githubAuthorized);
    setElementVisible(els.repoSearch, setupMode === 'github' && loggedIn && githubAuthorized);
    setElementVisible(els.repoPrevBtn, setupMode === 'github' && loggedIn && githubAuthorized && reposLoaded);
    setElementVisible(els.repoNextBtn, setupMode === 'github' && loggedIn && githubAuthorized && reposLoaded);
    setElementVisible(els.repoPagerStatus, setupMode === 'github');
    setElementVisible(els.repoPicker, setupMode === 'github' && loggedIn && githubAuthorized);
    setElementVisible(els.repoPreview, setupMode === 'github');
    setElementVisible(els.clearRepoSelectionBtn, setupMode === 'github' && loggedIn && githubAuthorized && repoSelected);
    setElementVisible(els.generateRepoManifestBtn, setupMode === 'github' && loggedIn && githubAuthorized && repoSelected);
    setElementVisible(els.importSelectedRepoBtn, setupMode === 'github' && loggedIn && githubAuthorized && repoSelected);
    setElementVisible(els.createAdapterPrBtn, setupMode === 'github' && loggedIn && githubAuthorized && repoSelected);
    setElementVisible(els.importDeployedAdapterBtn, setupMode === 'github' && loggedIn && githubAuthorized && repoSelected);
    setElementVisible(els.githubInstallHelp, setupMode === 'github' && loggedIn && githubAuthorized && githubReady && !reposLoaded);
    if (els.agentFlowGithubLoginBtn) {
      els.agentFlowGithubLoginBtn.textContent = !loggedIn
        ? 'GITHUB SIGN IN'
        : githubLinked
          ? 'REFRESH GITHUB ACCESS'
          : connectorActionLabel('connect_github');
    }

    if (setupCompleted) {
      statusTitle = completedAgent ? `${completedAgent.name} registered.` : 'Agent registered.';
      statusBody = 'The agent list below is updated. Verify the new agent there, or LIST ANOTHER AGENT to register another one.';
      tone = 'ok';
    } else if (!setupStarted) {
      statusTitle = hasAgents ? 'Agent catalog is ready.' : 'Start agent registration.';
      statusBody = hasAgents
        ? 'Pick USE IN CAIt Chat on a sample agent to prefill Chat, or click LIST YOUR AGENT to publish your own.'
        : 'Click LIST YOUR AGENT. Then choose GitHub repo or direct manifest import.';
    } else if (!setupMode) {
      statusTitle = 'Choose registration method.';
      statusBody = 'Use GITHUB REPO if the app already lives in GitHub. Use PASTE MANIFEST if you already have the manifest details.';
    } else if (setupMode === 'manual') {
      statusTitle = 'Paste or import a manifest.';
      statusBody = 'Fill the fields directly, paste JSON, or import a manifest URL. After import, verify the agent from AGENTS.';
    } else if (!loggedIn || !githubLinked) {
      statusTitle = 'Step 1. Connect GitHub.';
      statusBody = loggedIn ? 'This account is signed in, but GitHub is not linked yet. Connect GitHub, then continue with one repo.' : 'Sign in and connect GitHub, then load repos and register an agent.';
    } else if (!githubAuthorized) {
      statusTitle = 'Step 1. Refresh GitHub access.';
      statusBody = `GitHub is already linked to this ${productName} account, but this browser session does not have active GitHub access. Refresh GitHub access, then load repos.`;
    } else if (!reposLoaded) {
      statusTitle = 'Step 2. Load repos.';
      statusBody = githubReady
        ? `Use INSTALL OR CONFIGURE APP only if the repo is not listed yet. If you are not the repo admin, ask the owner to install ${productName}. Then return here and click LOAD MY REPOS.`
        : 'Use LOAD MY REPOS to fetch the repositories available in this session.';
    } else if (!repoSelected) {
      statusTitle = 'Step 3. Choose one repo.';
      statusBody = `Pick the app repo you want to turn into an agent. If the repo is already listed, skip install and continue. If it is missing and you are not the repo admin, ask the owner to install ${productName}.`;
    } else {
      const repo = selectedRepoFromPicker();
      statusTitle = `Step 4. Set up ${repo?.name || 'this repo'}.`;
      statusBody = 'Use GENERATE DRAFT JSON, IMPORT SELECTED MANIFEST, CREATE ADAPTER PR, or IMPORT + VERIFY. Use CHANGE REPO if you want to switch to another repo.';
      tone = 'ok';
    }

    if (els.agentSetupStatus) {
      els.agentSetupStatus.textContent = `${statusTitle}\n\n${statusBody}`;
      els.agentSetupStatus.className = `detail-box action-card ${tone} compact-card`;
    }
  }

  return {
    completeAgentSetup,
    hasManifestDraft,
    renderAgentSetupFlow,
    resetAgentSetupFlow
  };
}
