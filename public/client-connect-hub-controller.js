export function createClientConnectHubController(deps = {}) {
  const {
    state,
    els,
    developerSurfacesNotice = '',
    developerSurfacesStatus = 'Runtime gated',
    activeApiKeys = (items) => items || [],
    canUseGithubAgentFlow = () => false,
    connectorActionLabel = (value) => String(value || ''),
    isGithubAuthorized = () => false,
    isGithubLinked = () => false,
    setButtonAccess = () => {}
  } = deps;

  function renderConnectHub(snapshot = state.snapshot || {}) {
    const auth = snapshot?.auth || {};
    const account = snapshot?.accountSettings || {};
    const orderKeys = activeApiKeys(account?.apiAccess?.orderKeys || []);
    const liveOrderKeys = orderKeys.filter((key) => String(key?.mode || 'live').toLowerCase() !== 'test');
    const testOrderKeys = orderKeys.filter((key) => String(key?.mode || 'live').toLowerCase() === 'test');
    const provider = auth?.authProvider || (auth?.githubAppConfigured ? 'github-app' : auth?.githubConfigured ? 'github-oauth' : 'not configured');
    const repoCount = state.repos.length;
    const filteredRepoCount = state.filteredRepos.length;
    const canLogin = Boolean(auth?.githubConfigured || auth?.githubAppConfigured);
    const githubLinked = isGithubLinked(auth);
    const githubAuthorized = isGithubAuthorized(auth);
    const githubFlowReady = canUseGithubAgentFlow(auth);

    if (els.connectGithubStatus) {
      const lines = [];
      if (!auth?.loggedIn || !githubLinked) {
        lines.push(
          'GitHub connection: not linked',
          `Auth mode available: ${canLogin ? provider : 'not configured'}`,
          `GitHub App configured: ${auth?.githubAppConfigured ? 'yes' : 'no'}`,
          `Repos loaded in this browser: ${repoCount}`,
          auth?.loggedIn
            ? 'Next: connect GitHub, then install the app if the repo list is still empty.'
            : 'Next: sign in or connect GitHub, then install the app if the repo list is still empty.'
        );
      } else if (!githubAuthorized) {
        lines.push(
          'GitHub connection: linked',
          `Auth mode available: ${canLogin ? provider : 'not configured'}`,
          `GitHub App configured: ${auth?.githubAppConfigured ? 'yes' : 'no'}`,
          `Repos loaded in this browser: ${repoCount}`,
          'Next: refresh GitHub access in this browser, then load repos.'
        );
      } else {
        lines.push(
          'GitHub connection: linked',
          `Auth mode: ${provider}`,
          `GitHub App configured: ${auth?.githubAppConfigured ? 'yes' : 'no'}`,
          `Repos loaded: ${repoCount}${repoCount ? ` (${filteredRepoCount} in current filter)` : ''}`,
          repoCount
            ? 'Next: open AGENTS to import a manifest or create an adapter PR.'
            : 'Next: install the app or load repos again to fetch installation-authorized repos.'
        );
      }
      els.connectGithubStatus.textContent = lines.join('\n');
    }

    if (els.connectOrderApiStatus) {
      const lines = [
        `Public order endpoint: ${developerSurfacesStatus}`,
        developerSurfacesNotice,
        `Previous CAIt API keys on this account: ${orderKeys.length} (${liveOrderKeys.length} live / ${testOrderKeys.length} test)`,
        'Next: use Chat, Apps, Deliveries, or Publisher in the browser. External API ordering will return after the contract is stable.'
      ];
      els.connectOrderApiStatus.textContent = lines.join('\n');
    }

    if (els.connectAgentApiStatus) {
      const lines = [
        `Agent import endpoint: ${developerSurfacesStatus}`,
        developerSurfacesNotice,
        `Previous CAIt API keys on this account: ${orderKeys.length}`,
        'Next: manage provider setup from the browser. External agent API registration will return after the contract is stable.'
      ];
      els.connectAgentApiStatus.textContent = lines.join('\n');
    }

    if (els.connectHubGithubBtn) {
      els.connectHubGithubBtn.textContent = !auth?.loggedIn
        ? 'GITHUB SIGN IN'
        : githubLinked
          ? 'REFRESH GITHUB ACCESS'
          : connectorActionLabel('connect_github');
    }
    setButtonAccess(els.connectHubGithubBtn, canLogin && (!auth?.loggedIn || !githubAuthorized));
    setButtonAccess(els.connectHubInstallBtn, Boolean(auth?.githubAppConfigured) && githubFlowReady);
    setButtonAccess(els.connectHubLoadReposBtn, githubFlowReady);
    setButtonAccess(els.connectHubOpenAgentsBtn, true);
    setButtonAccess(els.connectHubOpenSettingsOrderBtn, true);
    setButtonAccess(els.connectHubCopyOrderBtn, true);
    setButtonAccess(els.connectHubOpenAgentsPublishBtn, true);
    setButtonAccess(els.connectHubOpenSettingsAgentBtn, true);
    setButtonAccess(els.connectHubCopyAgentBtn, true);
  }

  return { renderConnectHub };
}
