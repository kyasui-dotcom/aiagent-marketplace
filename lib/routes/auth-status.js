export function createAuthStatusRouteHandlers(deps = {}) {
  const {
    accountHasGithubConnector,
    accountHasGoogleConnector,
    accountHasXConnector,
    accountIdentityForProvider,
    baseUrl,
    canReviewAgents,
    canReviewFeedbackReports,
    canViewAdminDashboard,
    csrfTokenForRequest,
    getSession,
    githubAppConfigured,
    githubAppInstallationsFromSession,
    githubAppReposFromSession,
    githubClientId,
    githubClientSecret,
    githubGrantedScopes,
    githubOAuthScope,
    githubPrivateRepoImportEnabled,
    googleConfigured,
    googleConnectorForAccount,
    googleConnectorScopeSet,
    googleOAuthCapabilitiesFromGroups,
    identityLoginsForCurrent,
    lightweightCurrentFromSession,
    missingGoogleScopeGroups,
    requestOrigin,
    resendConfigured,
    runtimePolicy,
    runtimeStorage,
    sessionHasGithubApp,
    sessionHasGithubOauth,
    xOAuthConfigured,
    xOAuthScopeLabel,
    xTokenEncryptionConfigured
  } = deps;

  async function authStatus(request, env) {
    const session = await getSession(request, env);
    const policy = runtimePolicy(env);
    const current = lightweightCurrentFromSession(session);
    const storage = runtimeStorage(env);
    let account = current?.account || null;
    if (!account && current?.login && typeof storage.getAccountByLogin === 'function') {
      try {
        account = await storage.getAccountByLogin(current.login);
      } catch {
        account = null;
      }
    }
    const githubIdentity = accountIdentityForProvider(account, 'github') || current?.githubIdentity || null;
    const googleIdentity = accountIdentityForProvider(account, 'google') || current?.googleIdentity || null;
    const currentWithAccount = {
      ...current,
      account,
      githubIdentity,
      googleIdentity
    };
    const loggedIn = Boolean(current?.user);
    const githubLinked = Boolean(current?.githubLinked || githubIdentity || accountHasGithubConnector(account));
    const googleLinked = Boolean(current?.googleLinked || googleIdentity || accountHasGoogleConnector(account));
    const xLinked = Boolean(current?.xLinked || accountHasXConnector(account));
    const githubAuthorized = Boolean(current?.githubAuthorized || accountHasGithubConnector(account));
    const googleAuthorized = Boolean(current?.googleAuthorized || accountHasGoogleConnector(account));
    const xAuthorized = Boolean(current?.xAuthorized || accountHasXConnector(account));
    const identityLogins = identityLoginsForCurrent(currentWithAccount);
    const googleConnector = googleConnectorForAccount(account);
    const googleGrantedScopes = [...googleConnectorScopeSet({
      scopes: [
        session?.googleScopes,
        googleConnector?.scopes
      ].filter(Boolean).join(' ')
    })];
    const googleGrantedCapabilities = googleOAuthCapabilitiesFromGroups(
      ['ga4', 'gsc', 'drive', 'docs', 'sheets', 'presentations', 'calendar_read', 'calendar_write', 'gmail_read', 'gmail_send']
        .filter((group) => !missingGoogleScopeGroups({ connected: true, scopes: googleGrantedScopes.join(' ') }, [group]).length)
    );
    return {
      loggedIn,
      authProvider: current?.authProvider || 'guest',
      authBaseUrl: baseUrl(request, env),
      currentOrigin: requestOrigin(request),
      emailConfigured: resendConfigured(env),
      githubConfigured: Boolean(githubClientId(env) && githubClientSecret(env)),
      googleConfigured: googleConfigured(env),
      xConfigured: xOAuthConfigured(env),
      xTokenEncryptionConfigured: xTokenEncryptionConfigured(env),
      githubAppConfigured: githubAppConfigured(env),
      githubRequestedScope: githubOAuthScope(env),
      xRequestedScope: xOAuthScopeLabel(),
      githubGrantedScopes: githubGrantedScopes(session),
      googleGrantedScopes,
      googleGrantedCapabilities,
      privateRepoImportEnabled: githubPrivateRepoImportEnabled(env),
      githubAppInstallations: githubAppInstallationsFromSession(session).length,
      githubAppRepoCount: githubAppReposFromSession(session).length,
      githubLinked,
      googleLinked,
      xLinked,
      githubAuthorized,
      googleAuthorized,
      xAuthorized,
      linkedProviders: [
        ...new Set([
          ...(Array.isArray(session?.linkedProviders)
            ? session.linkedProviders
            : [
                ...(googleLinked ? ['google-oauth'] : []),
                ...(sessionHasGithubOauth(session) ? ['github-oauth'] : []),
                ...(sessionHasGithubApp(session) ? ['github-app'] : [])
              ]),
          ...(xLinked ? ['x-oauth'] : [])
        ])
      ],
      canOrder: loggedIn,
      canManagePayments: loggedIn && !policy.billingPaused,
      canRegisterAgents: githubLinked,
      canUseGithubAgentFlow: githubAuthorized,
      canManagePayouts: githubLinked,
      releaseStage: policy.releaseStage,
      openWriteApiEnabled: policy.openWriteApiEnabled,
      guestRunReadEnabled: policy.guestRunReadEnabled,
      devApiEnabled: policy.devApiEnabled,
      exposeJobSecrets: policy.exposeJobSecrets,
      billingPaused: policy.billingPaused,
      billingActivationEnabled: policy.billingActivationEnabled,
      isPlatformAdmin: canViewAdminDashboard(current, env),
      canReviewFeedbackReports: canReviewFeedbackReports(current, env),
      canReviewAgents: canReviewAgents(current, env),
      csrfToken: loggedIn ? await csrfTokenForRequest(request, env, session) : '',
      user: current?.user || null,
      login: current?.login || '',
      accountLogin: current?.login || '',
      githubIdentity,
      googleIdentity,
      identityLogins
    };
  }

  async function chatMemoryAuthStatus(request, env, current = null) {
    const session = current?.session || null;
    const policy = runtimePolicy(env);
    const loggedIn = Boolean(current?.user);
    return {
      loggedIn,
      authProvider: current?.authProvider || 'guest',
      authBaseUrl: baseUrl(request, env),
      currentOrigin: requestOrigin(request),
      emailConfigured: resendConfigured(env),
      githubConfigured: Boolean(githubClientId(env) && githubClientSecret(env)),
      googleConfigured: googleConfigured(env),
      xConfigured: xOAuthConfigured(env),
      xTokenEncryptionConfigured: xTokenEncryptionConfigured(env),
      githubLinked: Boolean(current?.githubLinked),
      googleLinked: Boolean(current?.googleLinked),
      xLinked: Boolean(current?.xLinked),
      githubAuthorized: Boolean(current?.githubAuthorized),
      googleAuthorized: Boolean(current?.googleAuthorized),
      xAuthorized: Boolean(current?.xAuthorized),
      canOrder: loggedIn,
      canManagePayments: loggedIn,
      canRegisterAgents: Boolean(current?.githubLinked),
      canUseGithubAgentFlow: Boolean(current?.githubAuthorized),
      releaseStage: policy.releaseStage,
      isPlatformAdmin: canViewAdminDashboard(current, env),
      canReviewFeedbackReports: canReviewFeedbackReports(current, env),
      canReviewAgents: canReviewAgents(current, env),
      csrfToken: loggedIn ? await csrfTokenForRequest(request, env, session) : '',
      user: current?.user || null,
      login: current?.login || '',
      accountLogin: current?.login || '',
      githubIdentity: current?.githubIdentity || null,
      googleIdentity: current?.googleIdentity || null,
      identityLogins: identityLoginsForCurrent(current)
    };
  }

  return {
    authStatus,
    chatMemoryAuthStatus
  };
}
