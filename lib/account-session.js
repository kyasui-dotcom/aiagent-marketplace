export function createAccountSessionHelpers(deps = {}) {
  const {
    accountIdentityForProvider,
    defaultLoginForAuthUser
  } = deps;

  function githubOAuthScope(env, action = 'login', capabilities = []) {
    const configured = String(env?.GITHUB_OAUTH_SCOPE || '').trim();
    const requested = Array.isArray(capabilities) ? capabilities : String(capabilities || '').split(/[,\s]+/);
    const needsRepo = requested.some((item) => /github\.(?:write_repo|write_pr|read_private_repo)|\brepo\b/i.test(String(item || '')))
      || ['repo', 'private_repo', 'write_repo'].includes(String(action || '').trim().toLowerCase());
    if (needsRepo) return configured || 'read:user repo';
    return 'read:user';
  }

  function oauthCapabilitiesFromUrl(url = null) {
    if (!url) return [];
    return [
      ...url.searchParams.getAll('capability'),
      ...url.searchParams.getAll('capabilities'),
      ...url.searchParams.getAll('required_capability'),
      ...url.searchParams.getAll('required_capabilities')
    ].flatMap((value) => String(value || '').split(/[,\s]+/)).map((item) => String(item || '').trim()).filter(Boolean);
  }

  function sessionHasGithubOauth(session) {
    return Boolean(session?.githubAccessToken && (session?.githubIdentity?.login || session?.githubIdentity?.providerUserId));
  }

  function sessionHasGithubApp(session) {
    return Boolean(session?.githubAppUserAccessToken && (session?.githubIdentity?.login || session?.githubIdentity?.providerUserId));
  }

  function sessionHasGoogleOauth(session) {
    return Boolean(session?.googleAccessToken && (session?.googleIdentity?.email || session?.googleIdentity?.providerUserId));
  }

  function githubAuthProvider(session) {
    return String(session?.authProvider || '').trim() || 'guest';
  }

  function sessionAuthProvider(session) {
    const explicit = String(session?.authProvider || '').trim();
    if (explicit) return explicit;
    if (sessionHasGoogleOauth(session)) return 'google-oauth';
    if (sessionHasGithubApp(session)) return 'github-app';
    if (sessionHasGithubOauth(session)) return 'github-oauth';
    return 'guest';
  }

  function githubAppReposFromSession(session) {
    return Array.isArray(session?.githubApp?.repos) ? session.githubApp.repos : [];
  }

  function githubAppInstallationsFromSession(session) {
    return Array.isArray(session?.githubApp?.installations) ? session.githubApp.installations : [];
  }

  function xOAuthScopeLabel() {
    return 'tweet.read users.read';
  }

  function lightweightCurrentFromSession(session = null) {
    const provider = sessionAuthProvider(session);
    const identityUser = session?.user || session?.googleIdentity || session?.githubIdentity || null;
    const login = String(
      session?.accountLogin
      || session?.user?.login
      || defaultLoginForAuthUser(identityUser, provider)
      || ''
    ).trim().toLowerCase();
    if (!login) return { session: null, user: null, login: '', authProvider: 'guest' };
    const user = session?.user || { ...(identityUser || {}), login };
    return {
      session,
      user,
      login,
      authProvider: provider,
      account: null,
      githubIdentity: session?.githubIdentity || (provider.startsWith('github') ? identityUser : null),
      googleIdentity: session?.googleIdentity || (provider.startsWith('google') ? identityUser : null),
      githubLinked: Boolean(sessionHasGithubOauth(session) || sessionHasGithubApp(session) || session?.githubIdentity),
      googleLinked: Boolean(sessionHasGoogleOauth(session) || session?.googleIdentity),
      xLinked: false,
      githubAuthorized: Boolean(sessionHasGithubOauth(session) || sessionHasGithubApp(session)),
      googleAuthorized: Boolean(sessionHasGoogleOauth(session)),
      xAuthorized: false
    };
  }

  function githubUserRecord(user) {
    return {
      id: user.id,
      providerUserId: String(user.id || ''),
      login: String(user.login || '').toLowerCase(),
      name: user.name,
      avatarUrl: user.avatar_url,
      profileUrl: user.html_url,
      email: String(user.email || '').toLowerCase()
    };
  }

  function googleUserRecord(user) {
    const email = String(user?.email || '').trim().toLowerCase();
    const providerUserId = String(user?.sub || '').trim();
    return {
      id: providerUserId,
      providerUserId,
      login: email || defaultLoginForAuthUser({ email, providerUserId }, 'google-oauth'),
      name: String(user?.name || email || 'Google user').trim(),
      avatarUrl: String(user?.picture || '').trim(),
      profileUrl: '',
      email
    };
  }

  function xConnectorForAccount(account = null) {
    return account?.connectors?.x && typeof account.connectors.x === 'object' ? account.connectors.x : null;
  }

  function githubConnectorForAccount(account = null) {
    return account?.connectors?.github && typeof account.connectors.github === 'object' ? account.connectors.github : null;
  }

  function googleConnectorForAccount(account = null) {
    return account?.connectors?.google && typeof account.connectors.google === 'object' ? account.connectors.google : null;
  }

  function accountHasGithubConnector(account = null) {
    const connector = githubConnectorForAccount(account);
    return Boolean(connector?.connected && connector?.accessTokenEnc && (connector?.login || connector?.providerUserId));
  }

  function accountHasGoogleConnector(account = null) {
    const connector = googleConnectorForAccount(account);
    return Boolean(connector?.connected && connector?.accessTokenEnc && (connector?.email || connector?.providerUserId));
  }

  function accountHasXConnector(account = null) {
    const connector = xConnectorForAccount(account);
    return Boolean(connector?.connected && connector?.accessTokenEnc && connector?.username);
  }

  function linkedProvidersFromAccount(account = null) {
    const providers = [];
    const emailIdentity = accountIdentityForProvider(account, 'email');
    const googleIdentity = accountIdentityForProvider(account, 'google');
    const githubIdentity = accountIdentityForProvider(account, 'github');
    if (emailIdentity?.provider) providers.push(emailIdentity.provider);
    if (googleIdentity?.provider) providers.push(googleIdentity.provider);
    else if (accountHasGoogleConnector(account)) providers.push('google-oauth');
    if (githubIdentity?.provider) providers.push(githubIdentity.provider);
    else if (accountHasGithubConnector(account)) providers.push('github-oauth');
    if (accountHasXConnector(account)) providers.push('x-oauth');
    return providers;
  }

  function mergeLinkedSession(baseSession = {}, patch = {}) {
    const hasPatchField = (field) => Object.prototype.hasOwnProperty.call(patch, field);
    return {
      ...baseSession,
      ...patch,
      authProvider: patch.authProvider || baseSession.authProvider || 'guest',
      user: patch.user || baseSession.user || null,
      accountLogin: patch.accountLogin || baseSession.accountLogin || '',
      githubIdentity: patch.githubIdentity || baseSession.githubIdentity || null,
      githubAccessToken: patch.githubAccessToken || baseSession.githubAccessToken || '',
      githubScopes: patch.githubScopes || baseSession.githubScopes || [],
      githubAppUserAccessToken: patch.githubAppUserAccessToken || baseSession.githubAppUserAccessToken || '',
      githubApp: patch.githubApp || baseSession.githubApp || null,
      googleIdentity: patch.googleIdentity || baseSession.googleIdentity || null,
      googleAccessToken: hasPatchField('googleAccessToken') ? String(patch.googleAccessToken || '') : (baseSession.googleAccessToken || ''),
      googleScopes: hasPatchField('googleScopes') ? String(patch.googleScopes || '') : String(baseSession.googleScopes || ''),
      linkedProviders: [...new Set([
        ...(Array.isArray(baseSession.linkedProviders) ? baseSession.linkedProviders : []),
        ...(Array.isArray(patch.linkedProviders) ? patch.linkedProviders : [])
      ])]
    };
  }

  return {
    accountHasGithubConnector,
    accountHasGoogleConnector,
    accountHasXConnector,
    githubAppInstallationsFromSession,
    githubAppReposFromSession,
    githubAuthProvider,
    githubConnectorForAccount,
    githubOAuthScope,
    githubUserRecord,
    googleConnectorForAccount,
    googleUserRecord,
    lightweightCurrentFromSession,
    linkedProvidersFromAccount,
    mergeLinkedSession,
    oauthCapabilitiesFromUrl,
    sessionAuthProvider,
    sessionHasGithubApp,
    sessionHasGithubOauth,
    sessionHasGoogleOauth,
    xConnectorForAccount,
    xOAuthScopeLabel
  };
}
