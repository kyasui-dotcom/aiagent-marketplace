export function createGithubAppAccessHelpers(deps = {}) {
  const {
    accountSettingsForLogin,
    baseUrl,
    fetchGithubUserProfile,
    githubAppInstallationToken,
    githubAppUserInstallationRepos,
    githubAppUserInstallations,
    githubAppUserTokenFromCode,
    githubUserRecord,
    mutateAccountByLogin,
    nowIso,
    sessionHasGithubApp,
    upsertAccountSettingsInState
  } = deps;

  function mapGithubAppInstallation(installation = {}) {
    return {
      id: installation.id,
      accountLogin: installation.account?.login || '',
      targetType: installation.target_type || '',
      repositorySelection: installation.repository_selection || '',
      htmlUrl: installation.html_url || ''
    };
  }

  function mapGithubAppRepo(repo = {}, installation = {}) {
    return {
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      homepage: repo.homepage || '',
      private: Boolean(repo.private),
      defaultBranch: repo.default_branch,
      htmlUrl: repo.html_url,
      owner: repo.owner?.login,
      installationId: installation.id,
      installationAccountLogin: installation.account?.login || '',
      installationTargetType: installation.target_type || ''
    };
  }

  async function buildGithubAppSession(request, env, code, requestedInstallationId = '') {
    const callback = `${baseUrl(request, env)}/auth/github-app/callback`;
    const token = await githubAppUserTokenFromCode(env, code, callback);
    const { user } = await fetchGithubUserProfile(token.access_token);
    const githubIdentity = githubUserRecord(user);
    const installations = await githubAppUserInstallations(token.access_token);
    const filteredInstallations = requestedInstallationId
      ? installations.filter((installation) => String(installation.id) === String(requestedInstallationId))
      : installations;
    if (requestedInstallationId && !filteredInstallations.length) {
      throw new Error('GitHub App installation is not accessible to this user');
    }
    return {
      authProvider: 'github-app',
      user: githubIdentity,
      githubIdentity,
      githubAppUserAccessToken: token.access_token,
      githubApp: {
        installations: filteredInstallations.map(mapGithubAppInstallation)
      },
      linkedProviders: ['github-app'],
      createdAt: Date.now()
    };
  }

  async function githubAppReposForSession(session) {
    const userToken = String(session?.githubAppUserAccessToken || '').trim();
    if (!userToken) return [];
    const installations = await githubAppUserInstallations(userToken);
    const repos = [];
    for (const installation of installations) {
      const installationRepos = await githubAppUserInstallationRepos(userToken, installation.id);
      for (const repo of installationRepos) repos.push(mapGithubAppRepo(repo, installation));
    }
    const dedupedRepos = [];
    const seenRepos = new Set();
    for (const repo of repos) {
      const key = `${repo.installationId}:${repo.fullName}`;
      if (seenRepos.has(key)) continue;
      seenRepos.add(key);
      dedupedRepos.push(repo);
    }
    return dedupedRepos;
  }

  async function githubAppAuthorizedRepoForSession(session, owner, repo, installationId = '') {
    const repos = await githubAppReposForSession(session);
    const target = `${owner}/${repo}`.toLowerCase();
    return repos.find((item) => {
      if (installationId && String(item.installationId) !== String(installationId)) return false;
      return String(item.fullName || '').toLowerCase() === target;
    }) || null;
  }

  function githubAppAccessFromSession(session = null, repos = []) {
    return {
      installations: githubAppInstallationsFromSession(session),
      repos: Array.isArray(repos) ? repos : [],
      updatedAt: nowIso()
    };
  }

  function githubAppInstallationsFromSession(session = null) {
    return Array.isArray(session?.githubApp?.installations) ? session.githubApp.installations : [];
  }

  function githubAppRepoFromAccount(account = null, owner, repo, installationId = '') {
    const target = `${owner}/${repo}`.toLowerCase();
    const repos = Array.isArray(account?.githubAppAccess?.repos) ? account.githubAppAccess.repos : [];
    return repos.find((item) => {
      if (installationId && String(item.installationId) !== String(installationId)) return false;
      return String(item.fullName || '').toLowerCase() === target;
    }) || null;
  }

  async function githubAppRepoForRequester(current = null, owner, repo, installationId = '') {
    if (current?.session && sessionHasGithubApp(current.session)) {
      return githubAppAuthorizedRepoForSession(current.session, owner, repo, installationId);
    }
    return githubAppRepoFromAccount(current?.account || null, owner, repo, installationId);
  }

  async function githubAppRepoTokenForRequester(current = null, owner, repo, installationId = '', env = {}) {
    const selectedRepo = await githubAppRepoForRequester(current, owner, repo, installationId);
    if (!selectedRepo) {
      return {
        error: 'Selected repository is not authorized by this account GitHub App access',
        statusCode: 403,
        use: '/agents.html',
        next_step: 'Open AGENTS, connect GitHub, load/select the repo, then retry with CAIT_API_KEY.'
      };
    }
    return {
      selectedRepo,
      installationToken: await githubAppInstallationToken(env, selectedRepo.installationId)
    };
  }

  async function persistGithubAppAccess(storage, login, session = null, repos = []) {
    const safeLogin = String(login || '').trim().toLowerCase();
    if (!safeLogin || !sessionHasGithubApp(session)) return null;
    let account = null;
    await mutateAccountByLogin(storage, safeLogin, async (draft) => {
      account = upsertAccountSettingsInState(draft, safeLogin, null, 'github-app', {
        githubAppAccess: githubAppAccessFromSession(session, repos)
      });
    });
    return account;
  }

  return {
    buildGithubAppSession,
    githubAppAccessFromSession,
    githubAppAuthorizedRepoForSession,
    githubAppInstallationsFromSession,
    githubAppRepoForRequester,
    githubAppRepoFromAccount,
    githubAppRepoTokenForRequester,
    githubAppReposForSession,
    mapGithubAppInstallation,
    mapGithubAppRepo,
    persistGithubAppAccess
  };
}
