export function createAuthContextHelpers(deps = {}) {
  const {
    accountHasGithubConnector,
    accountHasGoogleConnector,
    accountHasXConnector,
    accountIdentityForProvider,
    accountSettingsForIdentity,
    accountSettingsForLogin,
    aliasLoginsForAccount,
    authenticateOrderApiKey,
    claimSignupWelcomeEmailAttempt,
    configuredBaseUrls,
    csrfExemptPath,
    defaultLoginForAuthUser,
    getSession,
    hmacSha256Base64Url,
    isUnsafeMethod,
    json,
    lightweightCurrentFromSession,
    linkIdentityToAccountInState,
    maybeGrantWelcomeCreditsForSignupInState,
    maybeSendSignupWelcomeEmail,
    mergeAccountsInState,
    mutateAccountByLogin,
    parseCookies,
    runtimePolicy,
    runtimeStorage,
    secretEquals,
    sessionAuthProvider,
    sessionCookieName,
    sessionHasGithubApp,
    sessionHasGithubOauth,
    sessionHasGoogleOauth,
    sessionSecretMaterial,
    touchEvent,
    trackAuthConversionEvent,
    trackAuthLoginCompletion,
    upsertAccountSettingsForIdentityInState,
    upsertAccountSettingsInState
  } = deps;

  function sessionAccountRepairLogin(session = null, account = null) {
    return String(
      session?.accountLogin
      || account?.login
      || session?.user?.login
      || defaultLoginForAuthUser(session?.user || null, sessionAuthProvider(session))
      || ''
    ).trim().toLowerCase();
  }

  function accountRecordForLogin(state = {}, login = '') {
    const safeLogin = String(login || '').trim().toLowerCase();
    if (!safeLogin) return null;
    return (Array.isArray(state?.accounts) ? state.accounts : [])
      .find((account) => aliasLoginsForAccount(account).includes(safeLogin)) || null;
  }

  function sessionAccountIdentities(session = null) {
    const identities = [];
    if (sessionHasGoogleOauth(session) && session?.googleIdentity) {
      identities.push({ provider: 'google-oauth', prefix: 'google', user: session.googleIdentity });
    }
    if (sessionHasGithubApp(session) && session?.githubIdentity) {
      identities.push({ provider: 'github-app', prefix: 'github', user: session.githubIdentity });
    } else if (sessionHasGithubOauth(session) && session?.githubIdentity) {
      identities.push({ provider: 'github-oauth', prefix: 'github', user: session.githubIdentity });
    }
    const explicitProvider = sessionAuthProvider(session);
    if (!identities.length && explicitProvider !== 'guest' && session?.user?.login) {
      const prefix = explicitProvider.split('-')[0] || explicitProvider;
      identities.push({ provider: explicitProvider, prefix, user: session.user });
    }
    return identities.filter((identity) => identity.provider && identity.user);
  }

  function sessionAccountNeedsRepair(state = {}, session = null, account = null) {
    const targetLogin = sessionAccountRepairLogin(session, account);
    if (!targetLogin) return false;
    const persisted = accountRecordForLogin(state, targetLogin);
    if (!persisted) return true;
    const normalized = accountSettingsForLogin(state, persisted.login || targetLogin, session?.user || null, sessionAuthProvider(session));
    return sessionAccountIdentities(session).some((identity) => !accountIdentityForProvider(normalized, identity.prefix));
  }

  async function repairSessionAccountIfNeeded(storage, state = {}, session = null, account = null) {
    if (!sessionAccountNeedsRepair(state, session, account)) return { state, account };
    const initialLogin = sessionAccountRepairLogin(session, account);
    const identities = sessionAccountIdentities(session);
    let repairedLogin = initialLogin;
    await storage.mutate(async (draft) => {
      if (!Array.isArray(draft.accounts)) draft.accounts = [];
      const persisted = accountRecordForLogin(draft, repairedLogin);
      if (persisted?.login) repairedLogin = persisted.login;
      if (!persisted && repairedLogin) {
        upsertAccountSettingsInState(draft, repairedLogin, session?.user || { login: repairedLogin }, sessionAuthProvider(session), {});
      }
      for (const identity of identities) {
        const linked = linkIdentityToAccountInState(draft, repairedLogin, identity.user, identity.provider);
        if (!linked?.ok && linked?.reason === 'identity_already_linked' && linked?.linkedAccount?.login) {
          const merged = mergeAccountsInState(draft, linked.linkedAccount.login, repairedLogin);
          repairedLogin = merged?.targetLogin || repairedLogin;
        }
      }
    });
    const freshState = typeof storage.getFreshState === 'function' ? await storage.getFreshState() : await storage.getState();
    return {
      state: freshState,
      account: accountSettingsForLogin(freshState, repairedLogin, session?.user || null, sessionAuthProvider(session))
    };
  }

  async function currentUserContext(request, env, options = {}) {
    const session = Object.prototype.hasOwnProperty.call(options, 'session')
      ? options.session
      : await getSession(request, env);
    if (!session?.user?.login && !session?.accountLogin) return { session: null, user: null, login: '', authProvider: 'guest' };
    if (sessionAuthProvider(session) === 'e2e') {
      return {
        session,
        user: session.user || null,
        login: session.accountLogin || session.user?.login || '',
        authProvider: 'e2e',
        account: null,
        githubIdentity: null,
        googleIdentity: null,
        githubLinked: false,
        googleLinked: false,
        xLinked: false,
        githubAuthorized: false,
        googleAuthorized: false,
        xAuthorized: false
      };
    }
    const storage = runtimeStorage(env);
    let state = options.state && typeof options.state === 'object' ? options.state : await storage.getState();
    let account = session?.accountLogin
      ? accountSettingsForLogin(state, session.accountLogin)
      : sessionHasGithubOauth(session)
        ? accountSettingsForIdentity(state, session.githubIdentity, 'github-oauth')
        : sessionHasGoogleOauth(session)
          ? accountSettingsForIdentity(state, session.googleIdentity, 'google-oauth')
          : accountSettingsForIdentity(state, session.user, sessionAuthProvider(session));
    ({ state, account } = await repairSessionAccountIfNeeded(storage, state, session, account));
    const githubAuthorized = Boolean(sessionHasGithubOauth(session) || sessionHasGithubApp(session) || accountHasGithubConnector(account));
    const googleAuthorized = Boolean(sessionHasGoogleOauth(session) || accountHasGoogleConnector(account));
    const githubIdentity = accountIdentityForProvider(account, 'github') || session?.githubIdentity || null;
    const googleIdentity = accountIdentityForProvider(account, 'google') || session?.googleIdentity || null;
    const githubLinked = Boolean(githubAuthorized || githubIdentity);
    const googleLinked = Boolean(googleAuthorized || googleIdentity);
    const xLinked = accountHasXConnector(account);
    return {
      session,
      user: accountUserFromSettings(account) || session.user,
      login: account?.login || session.accountLogin || session.user?.login || '',
      authProvider: sessionAuthProvider(session),
      account,
      githubIdentity,
      googleIdentity,
      githubLinked,
      googleLinked,
      xLinked,
      githubAuthorized,
      googleAuthorized,
      xAuthorized: xLinked
    };
  }

  async function oauthCallbackCurrentContext(storage, request, env, session = null) {
    const existingSession = session || await getSession(request, env);
    if (!existingSession?.user?.login && !existingSession?.accountLogin) {
      return { session: null, user: null, login: '', authProvider: 'guest' };
    }
    if (sessionAuthProvider(existingSession) === 'e2e') {
      return {
        session: existingSession,
        user: existingSession.user || null,
        login: existingSession.accountLogin || existingSession.user?.login || '',
        authProvider: 'e2e',
        account: null,
        githubIdentity: null,
        googleIdentity: null,
        githubLinked: false,
        googleLinked: false,
        xLinked: false,
        githubAuthorized: false,
        googleAuthorized: false,
        xAuthorized: false
      };
    }
    const login = String(existingSession.accountLogin || existingSession.user?.login || '').trim().toLowerCase();
    const account = login && typeof storage.getAccountByLogin === 'function'
      ? await storage.getAccountByLogin(login)
      : null;
    const githubAuthorized = Boolean(sessionHasGithubOauth(existingSession) || sessionHasGithubApp(existingSession) || accountHasGithubConnector(account));
    const googleAuthorized = Boolean(sessionHasGoogleOauth(existingSession) || accountHasGoogleConnector(account));
    const githubIdentity = accountIdentityForProvider(account, 'github') || existingSession.githubIdentity || null;
    const googleIdentity = accountIdentityForProvider(account, 'google') || existingSession.googleIdentity || null;
    const xLinked = accountHasXConnector(account);
    return {
      session: existingSession,
      user: accountUserFromSettings(account) || existingSession.user,
      login: account?.login || login,
      authProvider: sessionAuthProvider(existingSession),
      account,
      githubIdentity,
      googleIdentity,
      githubLinked: Boolean(githubAuthorized || githubIdentity),
      googleLinked: Boolean(googleAuthorized || googleIdentity),
      xLinked,
      githubAuthorized,
      googleAuthorized,
      xAuthorized: xLinked
    };
  }

  function accountUserFromSettings(account) {
    if (!account?.login) return null;
    return {
      login: account.login,
      name: account?.profile?.displayName || account.login,
      avatarUrl: account?.profile?.avatarUrl || '',
      profileUrl: account?.profile?.profileUrl || '',
      email: account?.billing?.billingEmail || account?.payout?.payoutEmail || '',
      accountId: account?.id || ''
    };
  }

  async function persistAccountForIdentity(storage, env, user, authProvider) {
    let account = null;
    let signupCredits = null;
    const login = defaultLoginForAuthUser(user, authProvider);
    await mutateAccountByLogin(storage, login, async (draft) => {
      account = upsertAccountSettingsForIdentityInState(draft, user, authProvider, {});
      signupCredits = maybeGrantWelcomeCreditsForSignupInState(draft, account.login, user, authProvider);
      account = accountSettingsForLogin(draft, account.login, user, authProvider);
    });
    const signupWelcomeClaim = await claimSignupWelcomeEmailAttempt(storage, account, user, authProvider);
    if (signupWelcomeClaim?.account) account = signupWelcomeClaim.account;
    const accountCreated = Boolean(signupWelcomeClaim?.claimed);
    if (accountCreated) {
      await trackAuthConversionEvent(storage, 'signup_completed', {
        loggedIn: true,
        authProvider,
        login: account?.login || ''
      }, {
        source: 'auth_callback',
        status: 'created'
      });
      await maybeSendSignupWelcomeEmail(storage, env, account, user, authProvider, { alreadyClaimed: true });
    }
    if (['granted', 'topped_up'].includes(String(signupCredits?.status || ''))) {
      await touchEvent(storage, 'CREDIT', `${account.login} earned ${signupCredits.amount} signup welcome credits`);
    }
    await trackAuthLoginCompletion(storage, authProvider, account, {
      source: 'auth_callback',
      status: accountCreated ? 'created' : 'existing'
    });
    if (account && typeof account === 'object') {
      try {
        Object.defineProperty(account, '__authAccountCreated', {
          value: accountCreated,
          enumerable: false,
          configurable: true
        });
      } catch {
        account.__authAccountCreated = accountCreated;
      }
    }
    return account;
  }

  async function linkSessionIdentityToAccount(storage, env, targetLogin, user, authProvider) {
    let result = null;
    let signupCredits = null;
    await mutateAccountByLogin(storage, targetLogin, async (draft) => {
      result = linkIdentityToAccountInState(draft, targetLogin, user, authProvider);
      if (result?.ok) {
        signupCredits = maybeGrantWelcomeCreditsForSignupInState(draft, result.account.login, { ...(user || {}), login: result.account.login }, authProvider);
        result.account = accountSettingsForLogin(draft, result.account.login, user, authProvider);
        return;
      }
    });
    if (['granted', 'topped_up'].includes(String(signupCredits?.status || ''))) {
      await touchEvent(storage, 'CREDIT', `${result.account.login} earned ${signupCredits.amount} signup welcome credits`);
      await maybeSendSignupWelcomeEmail(storage, env, result.account, user, authProvider);
    }
    return result;
  }

  function extractOrderApiKey(request) {
    const headerToken = String(request.headers.get('x-api-key') || '').trim();
    if (headerToken) return headerToken;
    const authHeader = String(request.headers.get('authorization') || '').trim();
    if (authHeader.toLowerCase().startsWith('bearer ')) return authHeader.slice(7).trim();
    return '';
  }

  function hasSessionCookie(request) {
    return Boolean(parseCookies(request)[sessionCookieName]);
  }

  function trustedOrigins(request, env) {
    const origins = new Set();
    try {
      origins.add(new URL(request.url).origin);
    } catch {}
    for (const item of configuredBaseUrls(request, env)) {
      try {
        origins.add(new URL(item).origin);
      } catch {}
    }
    return origins;
  }

  function requestSourceOrigin(request) {
    const origin = String(request.headers.get('origin') || '').trim();
    if (origin) return origin.replace(/\/$/, '');
    const referer = String(request.headers.get('referer') || '').trim();
    if (!referer) return '';
    try {
      return new URL(referer).origin;
    } catch {
      return '';
    }
  }

  async function csrfTokenForRequest(request, env, session = null) {
    if (session?.csrfToken) return String(session.csrfToken);
    const rawSession = String(parseCookies(request)[sessionCookieName] || '');
    if (!rawSession) return '';
    return `v1.${await hmacSha256Base64Url(sessionSecretMaterial(env), rawSession)}`;
  }

  async function enforceBrowserWriteProtection(request, env) {
    const url = new URL(request.url);
    if (!isUnsafeMethod(request.method) || csrfExemptPath(url.pathname) || !hasSessionCookie(request)) return null;
    const sourceOrigin = requestSourceOrigin(request);
    if (!sourceOrigin || !trustedOrigins(request, env).has(sourceOrigin)) {
      return json({ error: 'Cross-site write blocked' }, 403);
    }
    const session = await getSession(request, env);
    if (!session) return null;
    const expected = await csrfTokenForRequest(request, env, session);
    const provided = String(request.headers.get('x-aiagent2-csrf') || '').trim();
    if (!provided || !expected || !secretEquals(provided, expected)) {
      return json({ error: 'CSRF token required' }, 403);
    }
    return null;
  }

  function resolveOrderApiKeyContext(state, request) {
    const token = extractOrderApiKey(request);
    if (!token) return { session: null, user: null, login: '', authProvider: 'guest', apiKeyStatus: 'missing', apiKey: null };
    const matched = authenticateOrderApiKey(state, token);
    if (!matched) return invalidOrderApiKeyContext();
    return orderApiKeyContextFromMatch(matched);
  }

  function invalidOrderApiKeyContext() {
    return { session: null, user: null, login: '', authProvider: 'guest', apiKeyStatus: 'invalid', apiKey: null };
  }

  function orderApiKeyContextFromMatch(matched) {
    return {
      session: null,
      user: accountUserFromSettings(matched.account),
      login: matched.account.login,
      authProvider: 'api-key',
      account: matched.account,
      apiKeyStatus: 'valid',
      apiKey: matched.apiKey,
      apiKeyKind: 'cait'
    };
  }

  async function currentOrderRequesterContext(storage, request, env, options = {}) {
    const current = options.lightweight ? lightweightCurrentFromSession(await getSession(request, env)) : await currentUserContext(request, env);
    if (current?.user) return { ...current, apiKeyStatus: 'session', apiKey: null };
    const token = extractOrderApiKey(request);
    if (!token) return resolveOrderApiKeyContext({ accounts: [] }, request);
    if (typeof storage.authenticateOrderApiKey === 'function') {
      const matched = await storage.authenticateOrderApiKey(token);
      return matched ? orderApiKeyContextFromMatch(matched) : invalidOrderApiKeyContext();
    }
    const state = typeof storage.getFreshState === 'function'
      ? await storage.getFreshState()
      : await storage.getState();
    return resolveOrderApiKeyContext(state, request);
  }

  function resolveCaitApiKeyAgentContext(state, request) {
    const token = extractOrderApiKey(request);
    if (!token) return { session: null, user: null, login: '', authProvider: 'guest', apiKeyStatus: 'missing', apiKey: null };
    const matched = authenticateOrderApiKey(state, token);
    if (!matched) return invalidOrderApiKeyContext();
    return agentApiKeyContextFromMatch(matched);
  }

  function agentApiKeyContextFromMatch(matched) {
    return {
      session: null,
      user: accountUserFromSettings(matched.account),
      login: matched.account.login,
      authProvider: 'api-key',
      account: matched.account,
      githubLinked: true,
      googleLinked: false,
      apiKeyStatus: 'valid',
      apiKey: matched.apiKey,
      apiKeyKind: 'cait'
    };
  }

  async function currentAgentRequesterContext(storage, request, env, options = {}) {
    const current = options.lightweight ? lightweightCurrentFromSession(await getSession(request, env)) : await currentUserContext(request, env);
    if (current?.user) return { ...current, apiKeyStatus: 'session', apiKey: null };
    const token = extractOrderApiKey(request);
    if (!token) return resolveCaitApiKeyAgentContext({ accounts: [] }, request);
    if (typeof storage.authenticateOrderApiKey === 'function') {
      const matched = await storage.authenticateOrderApiKey(token);
      return matched ? agentApiKeyContextFromMatch(matched) : invalidOrderApiKeyContext();
    }
    const state = typeof storage.getFreshState === 'function'
      ? await storage.getFreshState()
      : await storage.getState();
    return resolveCaitApiKeyAgentContext(state, request);
  }

  async function currentAgentRequesterContextWithAccount(storage, request, env) {
    const current = await currentAgentRequesterContext(storage, request, env, { lightweight: true });
    if (!current?.user || current?.account || !current?.login || typeof storage.getAccountByLogin !== 'function') return current;
    const account = await storage.getAccountByLogin(current.login);
    if (!account) return current;
    return {
      ...current,
      user: accountUserFromSettings(account) || current.user,
      account,
      googleAuthorized: Boolean(current.googleAuthorized || accountHasGoogleConnector(account)),
      googleLinked: Boolean(current.googleLinked || accountHasGoogleConnector(account) || accountIdentityForProvider(account, 'google'))
    };
  }

  function requireOrderWriteAccess(current, env) {
    const policy = runtimePolicy(env);
    if (policy.releaseStage === 'public' && current?.apiKeyStatus === 'valid' && String(current?.apiKey?.mode || '').toLowerCase() === 'test') {
      return { error: 'Test API keys are disabled on the public deployment.', statusCode: 403, current, policy };
    }
    if (policy.openWriteApiEnabled || current?.user) return { current, policy };
    if (current?.apiKeyStatus === 'invalid') return { error: 'Invalid API key', statusCode: 401, current, policy };
    return { error: 'Login or API key required', statusCode: 401, current, policy };
  }

  function requireAgentWriteAccess(current, env) {
    const policy = runtimePolicy(env);
    if (current?.user && !current?.githubLinked) {
      return { error: 'GitHub connection required for agent registration.', statusCode: 403, current, policy };
    }
    if (policy.openWriteApiEnabled || current?.user || current?.apiKeyStatus === 'valid') return { current, policy };
    if (current?.apiKeyStatus === 'invalid') return { error: 'Invalid API key', statusCode: 401, current, policy };
    return { error: 'Login or CAIt API key required', statusCode: 401, current, policy };
  }

  return {
    accountRecordForLogin,
    accountUserFromSettings,
    agentApiKeyContextFromMatch,
    csrfTokenForRequest,
    currentAgentRequesterContext,
    currentAgentRequesterContextWithAccount,
    currentOrderRequesterContext,
    currentUserContext,
    enforceBrowserWriteProtection,
    extractOrderApiKey,
    hasSessionCookie,
    invalidOrderApiKeyContext,
    linkSessionIdentityToAccount,
    oauthCallbackCurrentContext,
    orderApiKeyContextFromMatch,
    persistAccountForIdentity,
    repairSessionAccountIfNeeded,
    requestSourceOrigin,
    requireAgentWriteAccess,
    requireOrderWriteAccess,
    resolveCaitApiKeyAgentContext,
    resolveOrderApiKeyContext,
    sessionAccountIdentities,
    sessionAccountNeedsRepair,
    sessionAccountRepairLogin,
    trustedOrigins
  };
}
