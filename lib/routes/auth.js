const EMAIL_AUTH_MAX_AGE_SEC = 20 * 60;

export function createAuthRouteHandlers(deps = {}) {
  const {
    accountIdentityForProvider,
    accountSettingsForLogin,
    authFailureRedirectPath,
    authSuccessRedirectPath,
    baseUrl,
    buildGithubAppSession,
    connectorTokenEncryptionConfigured,
    consumeOAuthState,
    fetchGithubUserProfile,
    fetchGoogleUserProfile,
    fetchJson,
    ga4AuthEventCookieForAccount,
    getSession,
    githubAppClientId,
    githubAppConfigured,
    githubAppInstallSlug,
    githubAppRecommendedSettings,
    githubAppReposForSession,
    githubClientId,
    githubClientSecret,
    githubConnectorFromOAuthToken,
    githubOAuthScope,
    githubUserRecord,
    googleClientId,
    googleClientSecret,
    googleConfigured,
    googleConnectorFromOAuthToken,
    googleOAuthScopeGroupsFromUrl,
    googlePromptForOAuthAction,
    googleRequestedScopeForOAuthState,
    googleScopeForOAuthAction,
    googleScopeString,
    googleUserRecord,
    hmacSha256Base64Url,
    json,
    linkedProvidersFromAccount,
    linkSessionIdentityToAccount,
    makeSessionCookie,
    mergeLinkedSession,
    mutateAccountByLogin,
    normalizeLocalRedirectPath,
    normalizeOAuthLoginSource,
    normalizeOAuthVisitorId,
    oauthCallbackCurrentContext,
    oauthCapabilitiesFromUrl,
    openPayload,
    parseBody,
    persistAccountForIdentity,
    persistGithubAppAccess,
    pushOAuthStateCookie,
    redirect,
    redirectWithCookies,
    resendConfigured,
    runtimeStorage,
    sealPayload,
    secretEquals,
    securityHeaders,
    sendEmailAuthLink,
    sessionHasGithubApp,
    sessionHasGithubOauth,
    shouldLinkOAuthCallback,
    trackAuthLoginFailure,
    upsertAccountSettingsInState,
    validateEmailAddress
  } = deps;

  async function oauthStartContext(request, env) {
    const url = new URL(request.url);
    const explicitMode = String(url.searchParams.get('mode') || url.searchParams.get('action') || '').toLowerCase();
    const existingSession = await getSession(request, env);
    const action = ['link', 'connect', 'analytics_connect'].includes(explicitMode) ? explicitMode : 'login';
    return {
      url,
      existingSession,
      action,
      returnTo: normalizeLocalRedirectPath(request, env, url.searchParams.get('return_to') || '', '/'),
      loginSource: normalizeOAuthLoginSource(url.searchParams.get('login_source') || ''),
      visitorId: normalizeOAuthVisitorId(url.searchParams.get('visitor_id') || ''),
      googleScopeGroups: [...googleOAuthScopeGroupsFromUrl(url)]
    };
  }

  async function createEmailAuthToken(env, payload = {}) {
    const now = Date.now();
    return sealPayload({
      kind: 'email-auth',
      email: String(payload.email || '').trim().toLowerCase(),
      returnTo: String(payload.returnTo || '/chat').trim() || '/chat',
      loginSource: String(payload.loginSource || 'login_page').trim().toLowerCase(),
      visitorId: String(payload.visitorId || '').trim(),
      exp: now + EMAIL_AUTH_MAX_AGE_SEC * 1000
    }, env);
  }

  async function parseEmailAuthToken(env, raw = '') {
    const payload = await openPayload(raw, env);
    if (!payload || payload.kind !== 'email-auth') return null;
    if (Number(payload.exp || 0) < Date.now()) return null;
    const email = String(payload.email || '').trim().toLowerCase();
    if (!validateEmailAddress(email)) return null;
    return {
      email,
      returnTo: String(payload.returnTo || '/chat').trim() || '/chat',
      loginSource: String(payload.loginSource || 'login_page').trim().toLowerCase() || 'login_page',
      visitorId: String(payload.visitorId || '').trim()
    };
  }

  const DEFAULT_E2E_AUTH_EMAIL = 'e2e@aiagent-marketplace.net';

  function e2eAuthSecret(env) {
    return String(env?.E2E_AUTH_SECRET || '').trim();
  }

  function e2eAuthAllowedEmails(env) {
    const configured = String(env?.E2E_AUTH_ALLOWED_EMAILS || DEFAULT_E2E_AUTH_EMAIL)
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter((item) => validateEmailAddress(item));
    return new Set(configured.length ? configured : [DEFAULT_E2E_AUTH_EMAIL]);
  }

  function decodeSignedE2ePayload(raw = '') {
    const [payloadPart = ''] = String(raw || '').split('.');
    if (!payloadPart) return null;
    try {
      return JSON.parse(Buffer.from(payloadPart, 'base64url').toString('utf8'));
    } catch {
      return null;
    }
  }

  async function parseE2eAuthToken(env, raw = '') {
    const secret = e2eAuthSecret(env);
    if (!secret) return null;
    const token = String(raw || '').trim();
    const [payloadPart = '', signaturePart = ''] = token.split('.');
    if (!payloadPart || !signaturePart) return null;
    const expected = await hmacSha256Base64Url(secret, payloadPart);
    if (!secretEquals(signaturePart, expected)) return null;
    const payload = decodeSignedE2ePayload(token);
    if (!payload || payload.kind !== 'e2e-auth') return null;
    if (Number(payload.exp || 0) < Date.now()) return null;
    const email = String(payload.email || '').trim().toLowerCase();
    if (!validateEmailAddress(email)) return null;
    if (!e2eAuthAllowedEmails(env).has(email)) return null;
    return {
      email,
      returnTo: String(payload.returnTo || '/chat').trim() || '/chat',
      loginSource: String(payload.loginSource || 'playwright_e2e').trim().toLowerCase() || 'playwright_e2e',
      visitorId: String(payload.visitorId || '').trim()
    };
  }

  async function handleGithubAppInstallStart(request, env) {
    if (!githubAppConfigured(env)) return json({
      error: 'GitHub App is not configured yet.',
      setup: githubAppRecommendedSettings(request, env)
    }, 503);
    const slug = await githubAppInstallSlug(env);
    if (!slug) return json({ error: 'GitHub App slug is unavailable. Set GITHUB_APP_SLUG or complete app registration.' }, 503);
    const { action, returnTo, loginSource, visitorId } = await oauthStartContext(request, env);
    const state = crypto.randomUUID();
    const installUrl = new URL(`https://github.com/apps/${slug}/installations/new`);
    installUrl.searchParams.set('state', state);
    return redirectWithCookies(installUrl.toString(), [await pushOAuthStateCookie(request, env, state, { provider: 'github-app', action, returnTo, loginSource, visitorId })]);
  }

  async function handleGithubAppConnectStart(request, env) {
    if (!githubAppConfigured(env)) return json({
      error: 'GitHub App is not configured yet.',
      setup: githubAppRecommendedSettings(request, env)
    }, 503);
    const { existingSession, action, returnTo, loginSource, visitorId } = await oauthStartContext(request, env);
    if (existingSession?.user && sessionHasGithubApp(existingSession)) return redirect(returnTo || '/');
    const state = crypto.randomUUID();
    const callback = `${baseUrl(request, env)}/auth/github-app/callback`;
    const githubUrl = new URL('https://github.com/login/oauth/authorize');
    githubUrl.searchParams.set('client_id', githubAppClientId(env));
    githubUrl.searchParams.set('redirect_uri', callback);
    githubUrl.searchParams.set('state', state);
    return redirectWithCookies(githubUrl.toString(), [await pushOAuthStateCookie(request, env, state, { provider: 'github-app', action, returnTo, loginSource, visitorId })]);
  }

  async function handleGithubAppCallback(request, env) {
    if (!githubAppConfigured(env)) return redirect('/?auth_error=github_app_not_configured');
    const storage = runtimeStorage(env);
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const installationId = url.searchParams.get('installation_id') || '';
    if (!code || !state) {
      await trackAuthLoginFailure(storage, 'github-app', {
        source: 'auth_callback',
        status: 'invalid_state'
      });
      return redirect('/?auth_error=invalid_github_app_state');
    }
    const oauthState = await consumeOAuthState(request, env, state);
    const cookieState = oauthState.entry;
    if (!cookieState) {
      await trackAuthLoginFailure(storage, 'github-app', {
        source: 'auth_callback',
        status: 'missing_oauth_cookie'
      });
      return redirect('/?auth_error=invalid_github_app_state');
    }
    try {
      const existingSession = await getSession(request, env);
      const linkedSession = await buildGithubAppSession(request, env, code, installationId);
      let session = linkedSession;
      let authEventCookie = '';
      if (shouldLinkOAuthCallback(cookieState, existingSession)) {
        const current = await oauthCallbackCurrentContext(storage, request, env, existingSession);
        if (!current?.login) {
          return redirectWithCookies(authFailureRedirectPath(request, env, 'login_required_for_link', cookieState), [oauthState.cookie]);
        }
        const linked = await linkSessionIdentityToAccount(storage, env, current.login, linkedSession.githubIdentity, 'github-app');
        if (!linked?.ok) {
          return redirectWithCookies(authFailureRedirectPath(request, env, 'github_identity_already_linked', cookieState), [oauthState.cookie]);
        }
        session = mergeLinkedSession(existingSession || {}, {
          accountLogin: linked.account.login,
          githubIdentity: accountIdentityForProvider(linked.account, 'github') || linkedSession.githubIdentity,
          googleIdentity: accountIdentityForProvider(linked.account, 'google') || existingSession?.googleIdentity || null,
          githubAppUserAccessToken: linkedSession.githubAppUserAccessToken,
          githubApp: linkedSession.githubApp,
          linkedProviders: linkedProvidersFromAccount(linked.account)
        });
      } else {
        const account = await persistAccountForIdentity(storage, env, linkedSession.githubIdentity, 'github-app');
        authEventCookie = ga4AuthEventCookieForAccount(request, 'github-app', account);
        session = mergeLinkedSession(linkedSession, {
          accountLogin: account.login,
          githubIdentity: accountIdentityForProvider(account, 'github') || linkedSession.githubIdentity,
          googleIdentity: accountIdentityForProvider(account, 'google') || linkedSession.googleIdentity || null,
          linkedProviders: linkedProvidersFromAccount(account)
        });
      }
      const repos = await githubAppReposForSession(session);
      session = {
        ...session,
        githubApp: {
          ...(session.githubApp || {}),
          repos
        }
      };
      await persistGithubAppAccess(storage, session.accountLogin || session.user?.login || '', session, repos);
      return redirectWithCookies(authSuccessRedirectPath(request, env, cookieState), [
        await makeSessionCookie(session, env),
        oauthState.cookie,
        authEventCookie
      ].filter(Boolean));
    } catch (error) {
      await trackAuthLoginFailure(storage, 'github-app', {
        source: 'auth_callback',
        status: 'callback_error'
      });
      return redirectWithCookies(authFailureRedirectPath(request, env, error.message, cookieState), [oauthState.cookie]);
    }
  }

  async function handleGithubAppSetup(request, env) {
    const url = new URL(request.url);
    if (url.searchParams.get('code')) return handleGithubAppCallback(request, env);
    if (!githubAppConfigured(env)) return json({
      error: 'GitHub App is not configured yet.',
      setup: githubAppRecommendedSettings(request, env)
    }, 503);
    return redirect('/?auth_error=github_app_setup_requires_reconnect');
  }

  async function handleAuthStart(request, env) {
    if (!(githubClientId(env) && githubClientSecret(env))) {
      if (githubAppConfigured(env)) return handleGithubAppConnectStart(request, env);
      return json({ error: 'GitHub OAuth is not configured yet. Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET.' }, 503);
    }
    const { existingSession, action, returnTo, loginSource, visitorId } = await oauthStartContext(request, env);
    if (existingSession?.user && action === 'link' && sessionHasGithubOauth(existingSession)) return redirect(returnTo || '/');
    if (existingSession?.user && action === 'login') return redirect(returnTo || '/');
    const state = crypto.randomUUID();
    const callback = `${baseUrl(request, env)}/auth/github/callback`;
    const url = new URL(request.url);
    const requestedCapabilities = oauthCapabilitiesFromUrl(url);
    const githubUrl = new URL('https://github.com/login/oauth/authorize');
    githubUrl.searchParams.set('client_id', githubClientId(env));
    githubUrl.searchParams.set('redirect_uri', callback);
    githubUrl.searchParams.set('scope', githubOAuthScope(env, action, requestedCapabilities));
    githubUrl.searchParams.set('state', state);
    return redirectWithCookies(githubUrl.toString(), [await pushOAuthStateCookie(request, env, state, { provider: 'github-oauth', action, returnTo, loginSource, visitorId, requestedCapabilities })]);
  }

  async function handleAuthCallback(request, env) {
    if (!(githubClientId(env) && githubClientSecret(env))) return redirect('/?auth_error=github_not_configured');
    const storage = runtimeStorage(env);
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    if (!code || !state) {
      await trackAuthLoginFailure(storage, 'github-oauth', {
        source: 'auth_callback',
        status: 'invalid_state'
      });
      return redirect('/?auth_error=invalid_oauth_state');
    }
    const oauthState = await consumeOAuthState(request, env, state);
    const cookieState = oauthState.entry;
    if (!cookieState) {
      await trackAuthLoginFailure(storage, 'github-oauth', {
        source: 'auth_callback',
        status: 'missing_oauth_cookie'
      });
      return redirect('/?auth_error=invalid_oauth_state');
    }
    try {
      const existingSession = await getSession(request, env);
      const callback = `${baseUrl(request, env)}/auth/github/callback`;
      const token = await fetchJson('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({
          client_id: githubClientId(env),
          client_secret: githubClientSecret(env),
          code,
          redirect_uri: callback,
          state
        })
      });
      const { user, scopes } = await fetchGithubUserProfile(token.access_token);
      const githubIdentity = githubUserRecord(user);
      let session;
      let authEventCookie = '';
      if (shouldLinkOAuthCallback(cookieState, existingSession)) {
        const current = await oauthCallbackCurrentContext(storage, request, env, existingSession);
        if (!current?.login) {
          return redirectWithCookies(authFailureRedirectPath(request, env, 'login_required_for_link', cookieState), [oauthState.cookie]);
        }
        const linked = await linkSessionIdentityToAccount(storage, env, current.login, githubIdentity, 'github-oauth');
        if (!linked?.ok) {
          return redirectWithCookies(authFailureRedirectPath(request, env, 'github_identity_already_linked', cookieState), [oauthState.cookie]);
        }
        if (connectorTokenEncryptionConfigured(env)) {
          await mutateAccountByLogin(storage, linked.account.login, async (draft) => {
            const latest = accountSettingsForLogin(draft, linked.account.login, { ...githubIdentity, login: linked.account.login }, 'github-oauth');
            const github = await githubConnectorFromOAuthToken(env, githubIdentity, token, scopes, latest?.connectors?.github || {});
            linked.account = upsertAccountSettingsInState(draft, linked.account.login, { ...githubIdentity, login: linked.account.login }, 'github-oauth', {
              connectors: {
                ...(latest.connectors || {}),
                github
              }
            });
          });
        }
        session = mergeLinkedSession(existingSession || {}, {
          accountLogin: linked.account.login,
          githubIdentity: accountIdentityForProvider(linked.account, 'github') || githubIdentity,
          googleIdentity: accountIdentityForProvider(linked.account, 'google') || existingSession?.googleIdentity || null,
          githubScopes: scopes,
          githubAccessToken: token.access_token,
          linkedProviders: linkedProvidersFromAccount(linked.account)
        });
      } else {
        let account = await persistAccountForIdentity(storage, env, githubIdentity, 'github-oauth');
        authEventCookie = ga4AuthEventCookieForAccount(request, 'github-oauth', account);
        if (connectorTokenEncryptionConfigured(env)) {
          await mutateAccountByLogin(storage, account.login, async (draft) => {
            const latest = accountSettingsForLogin(draft, account.login, githubIdentity, 'github-oauth');
            const github = await githubConnectorFromOAuthToken(env, githubIdentity, token, scopes, latest?.connectors?.github || {});
            account = upsertAccountSettingsInState(draft, account.login, githubIdentity, 'github-oauth', {
              connectors: {
                ...(latest.connectors || {}),
                github
              }
            });
          });
        }
        session = mergeLinkedSession({}, {
          authProvider: 'github-oauth',
          user: githubIdentity,
          accountLogin: account.login,
          githubIdentity: accountIdentityForProvider(account, 'github') || githubIdentity,
          googleIdentity: accountIdentityForProvider(account, 'google') || null,
          githubScopes: scopes,
          githubAccessToken: token.access_token,
          linkedProviders: linkedProvidersFromAccount(account),
          createdAt: Date.now()
        });
      }
      return redirectWithCookies(authSuccessRedirectPath(request, env, cookieState), [
        await makeSessionCookie(session, env),
        oauthState.cookie,
        authEventCookie
      ].filter(Boolean));
    } catch (error) {
      await trackAuthLoginFailure(storage, 'github-oauth', {
        source: 'auth_callback',
        status: 'callback_error'
      });
      return redirectWithCookies(authFailureRedirectPath(request, env, error.message, cookieState), [oauthState.cookie]);
    }
  }

  async function handleGoogleAuthStart(request, env) {
    if (!googleConfigured(env)) {
      return json({ error: 'Google OAuth is not configured yet. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.' }, 503);
    }
    const { url, existingSession, action, returnTo, loginSource, visitorId, googleScopeGroups } = await oauthStartContext(request, env);
    if (existingSession?.user && action === 'login') return redirect(returnTo || '/');
    const state = crypto.randomUUID();
    const callback = `${baseUrl(request, env)}/auth/google/callback`;
    const requestedScope = googleScopeForOAuthAction(env, action, url);
    const googleUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    googleUrl.searchParams.set('client_id', googleClientId(env));
    googleUrl.searchParams.set('redirect_uri', callback);
    googleUrl.searchParams.set('response_type', 'code');
    googleUrl.searchParams.set('scope', requestedScope);
    googleUrl.searchParams.set('state', state);
    googleUrl.searchParams.set('access_type', 'offline');
    googleUrl.searchParams.set('include_granted_scopes', 'true');
    googleUrl.searchParams.set('prompt', googlePromptForOAuthAction(action));
    return redirectWithCookies(googleUrl.toString(), [await pushOAuthStateCookie(request, env, state, { provider: 'google-oauth', action, returnTo, loginSource, visitorId, googleScopeGroups, requestedScope })]);
  }

  async function handleGoogleAuthCallback(request, env) {
    if (!googleConfigured(env)) return redirect('/?auth_error=google_not_configured');
    const storage = runtimeStorage(env);
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    if (!code || !state) {
      await trackAuthLoginFailure(storage, 'google-oauth', {
        source: 'auth_callback',
        status: 'invalid_state'
      });
      return redirect('/?auth_error=invalid_google_oauth_state');
    }
    const oauthState = await consumeOAuthState(request, env, state);
    const cookieState = oauthState.entry;
    if (!cookieState) {
      await trackAuthLoginFailure(storage, 'google-oauth', {
        source: 'auth_callback',
        status: 'missing_oauth_cookie'
      });
      return redirect('/?auth_error=invalid_google_oauth_state');
    }
    try {
      const existingSession = await getSession(request, env);
      const callback = `${baseUrl(request, env)}/auth/google/callback`;
      const token = await fetchJson('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
        body: new URLSearchParams({
          client_id: googleClientId(env),
          client_secret: googleClientSecret(env),
          code,
          redirect_uri: callback,
          grant_type: 'authorization_code'
        }).toString()
      });
      const user = await fetchGoogleUserProfile(token.access_token);
      const googleIdentity = googleUserRecord(user);
      const requestedGoogleScope = googleRequestedScopeForOAuthState(env, cookieState);
      const grantedGoogleScope = String(token.scope || requestedGoogleScope || '').trim();
      let session;
      let authEventCookie = '';
      if (shouldLinkOAuthCallback(cookieState, existingSession)) {
        const current = await oauthCallbackCurrentContext(storage, request, env, existingSession);
        if (!current?.login) {
          return redirectWithCookies(authFailureRedirectPath(request, env, 'login_required_for_link', cookieState), [oauthState.cookie]);
        }
        const linked = await linkSessionIdentityToAccount(storage, env, current.login, googleIdentity, 'google-oauth');
        if (!linked?.ok) {
          return redirectWithCookies(authFailureRedirectPath(request, env, 'google_identity_already_linked', cookieState), [oauthState.cookie]);
        }
        const persistentGoogleConnector = connectorTokenEncryptionConfigured(env);
        if (persistentGoogleConnector) {
          await mutateAccountByLogin(storage, linked.account.login, async (draft) => {
            const latest = accountSettingsForLogin(draft, linked.account.login, { ...googleIdentity, login: linked.account.login }, 'google-oauth');
            const google = await googleConnectorFromOAuthToken(env, googleIdentity, token, latest?.connectors?.google || {}, requestedGoogleScope);
            linked.account = upsertAccountSettingsInState(draft, linked.account.login, { ...googleIdentity, login: linked.account.login }, 'google-oauth', {
              connectors: {
                ...(latest.connectors || {}),
                google
              }
            });
          });
        }
        session = mergeLinkedSession(existingSession || {}, {
          accountLogin: linked.account.login,
          googleIdentity: accountIdentityForProvider(linked.account, 'google') || googleIdentity,
          githubIdentity: accountIdentityForProvider(linked.account, 'github') || existingSession?.githubIdentity || null,
          googleAccessToken: persistentGoogleConnector ? '' : token.access_token,
          googleScopes: googleScopeString(existingSession?.googleScopes, grantedGoogleScope),
          linkedProviders: linkedProvidersFromAccount(linked.account)
        });
      } else {
        let account = await persistAccountForIdentity(storage, env, googleIdentity, 'google-oauth');
        authEventCookie = ga4AuthEventCookieForAccount(request, 'google-oauth', account);
        const persistentGoogleConnector = connectorTokenEncryptionConfigured(env);
        if (persistentGoogleConnector) {
          await mutateAccountByLogin(storage, account.login, async (draft) => {
            const latest = accountSettingsForLogin(draft, account.login, googleIdentity, 'google-oauth');
            const google = await googleConnectorFromOAuthToken(env, googleIdentity, token, latest?.connectors?.google || {}, requestedGoogleScope);
            account = upsertAccountSettingsInState(draft, account.login, googleIdentity, 'google-oauth', {
              connectors: {
                ...(latest.connectors || {}),
                google
              }
            });
          });
        }
        session = mergeLinkedSession({}, {
          authProvider: 'google-oauth',
          user: googleIdentity,
          accountLogin: account.login,
          googleIdentity: accountIdentityForProvider(account, 'google') || googleIdentity,
          githubIdentity: accountIdentityForProvider(account, 'github') || null,
          googleAccessToken: persistentGoogleConnector ? '' : token.access_token,
          googleScopes: googleScopeString(grantedGoogleScope),
          linkedProviders: linkedProvidersFromAccount(account),
          createdAt: Date.now()
        });
      }
      return redirectWithCookies(authSuccessRedirectPath(request, env, cookieState), [
        await makeSessionCookie(session, env),
        oauthState.cookie,
        authEventCookie
      ].filter(Boolean));
    } catch (error) {
      await trackAuthLoginFailure(storage, 'google-oauth', {
        source: 'auth_callback',
        status: 'callback_error'
      });
      return redirectWithCookies(authFailureRedirectPath(request, env, error.message, cookieState), [oauthState.cookie]);
    }
  }

  async function handleEmailAuthRequest(request, env) {
    const storage = runtimeStorage(env);
    let body = {};
    try {
      body = await parseBody(request);
    } catch (error) {
      await trackAuthLoginFailure(storage, 'email', {
        source: 'email_auth_request',
        status: 'invalid_json'
      });
      return json({ error: error.message }, 400);
    }
    const email = String(body?.email || '').trim().toLowerCase();
    const returnTo = normalizeLocalRedirectPath(request, env, body?.return_to || '', '/chat');
    const loginSource = normalizeOAuthLoginSource(body?.login_source || 'login_page') || 'login_page';
    const visitorId = normalizeOAuthVisitorId(body?.visitor_id || '');
    if (!validateEmailAddress(email)) {
      await trackAuthLoginFailure(storage, 'email', {
        source: 'email_auth_request',
        status: 'invalid_email'
      });
      return json({ error: 'A valid email address is required.' }, 400);
    }
    if (!resendConfigured(env)) {
      await trackAuthLoginFailure(storage, 'email', {
        source: 'email_auth_request',
        status: 'provider_not_configured',
        login: email
      });
      return json({ error: 'Email sign-in is not configured yet.' }, 503);
    }
    const token = await createEmailAuthToken(env, {
      email,
      returnTo,
      loginSource,
      visitorId
    });
    const verifyUrl = new URL('/auth/email/verify', baseUrl(request, env));
    verifyUrl.searchParams.set('token', token);
    const delivery = await sendEmailAuthLink(storage, env, email, verifyUrl.toString(), {
      returnTo,
      loginSource,
      visitorId
    });
    if (delivery.status !== 'sent') {
      await trackAuthLoginFailure(storage, 'email', {
        source: 'email_auth_request',
        status: delivery.status === 'failed' ? 'send_failed' : 'send_skipped',
        login: email
      });
      return json({ error: delivery.errorText || 'Could not send the email sign-in link.' }, delivery.status === 'failed' ? 502 : 503);
    }
    return json({ ok: true, status: 'sent' }, 201);
  }

  async function handleEmailAuthVerify(request, env) {
    const storage = runtimeStorage(env);
    const url = new URL(request.url);
    const token = String(url.searchParams.get('token') || '').trim();
    const fallbackState = {
      action: 'login',
      loginSource: 'login_page',
      returnTo: '/chat',
      visitorId: ''
    };
    if (!token) {
      await trackAuthLoginFailure(storage, 'email', {
        source: 'email_auth_verify',
        status: 'missing_token'
      });
      return redirect(authFailureRedirectPath(request, env, 'email_link_invalid', fallbackState));
    }
    const emailState = await parseEmailAuthToken(env, token);
    if (!emailState) {
      await trackAuthLoginFailure(storage, 'email', {
        source: 'email_auth_verify',
        status: 'invalid_token'
      });
      return redirect(authFailureRedirectPath(request, env, 'email_link_invalid', fallbackState));
    }
    try {
      const account = await persistAccountForIdentity(storage, env, {
        providerUserId: emailState.email,
        login: emailState.email,
        email: emailState.email,
        name: emailState.email.split('@')[0] || emailState.email,
        avatarUrl: '',
        profileUrl: ''
      }, 'email');
      const session = mergeLinkedSession({}, {
        authProvider: 'email',
        user: {
          login: account?.login || emailState.email,
          name: account?.profile?.displayName || emailState.email,
          avatarUrl: '',
          profileUrl: '',
          email: emailState.email,
          accountId: account?.id || ''
        },
        accountLogin: account?.login || emailState.email,
        linkedProviders: linkedProvidersFromAccount(account)
      });
      return redirectWithCookies(authSuccessRedirectPath(request, env, {
        action: 'login',
        loginSource: emailState.loginSource,
        returnTo: emailState.returnTo,
        visitorId: emailState.visitorId
      }), [
        await makeSessionCookie(session, env),
        ga4AuthEventCookieForAccount(request, 'email', account, { source: 'email_auth_verify' })
      ].filter(Boolean));
    } catch (error) {
      await trackAuthLoginFailure(storage, 'email', {
        source: 'email_auth_verify',
        status: 'verify_error',
        login: emailState.email
      });
      return redirect(authFailureRedirectPath(request, env, 'email_link_invalid', {
        action: 'login',
        loginSource: emailState.loginSource,
        returnTo: emailState.returnTo,
        visitorId: emailState.visitorId
      }));
    }
  }

  async function handleE2eAuthVerify(request, env) {
    if (!e2eAuthSecret(env)) {
      return new Response('Not found', {
        status: 404,
        headers: securityHeaders({ 'cache-control': 'no-store' })
      });
    }
    const storage = runtimeStorage(env);
    const url = new URL(request.url);
    const token = String(url.searchParams.get('token') || '').trim();
    const fallbackState = {
      action: 'login',
      loginSource: 'playwright_e2e',
      returnTo: '/chat',
      visitorId: ''
    };
    if (!token) {
      await trackAuthLoginFailure(storage, 'e2e', {
        source: 'e2e_auth_verify',
        status: 'missing_token'
      });
      return redirect(authFailureRedirectPath(request, env, 'e2e_link_invalid', fallbackState));
    }
    const e2eState = await parseE2eAuthToken(env, token);
    if (!e2eState) {
      await trackAuthLoginFailure(storage, 'e2e', {
        source: 'e2e_auth_verify',
        status: 'invalid_token'
      });
      return redirect(authFailureRedirectPath(request, env, 'e2e_link_invalid', fallbackState));
    }
    try {
      const session = mergeLinkedSession({}, {
        authProvider: 'e2e',
        user: {
          login: e2eState.email,
          name: e2eState.email.split('@')[0] || e2eState.email,
          avatarUrl: '',
          profileUrl: '',
          email: e2eState.email,
          accountId: ''
        },
        accountLogin: e2eState.email,
        linkedProviders: ['e2e']
      });
      return redirectWithCookies(authSuccessRedirectPath(request, env, {
        action: 'login',
        loginSource: e2eState.loginSource,
        returnTo: e2eState.returnTo,
        visitorId: e2eState.visitorId
      }), [
        await makeSessionCookie(session, env)
      ]);
    } catch (error) {
      await trackAuthLoginFailure(storage, 'e2e', {
        source: 'e2e_auth_verify',
        status: 'verify_error',
        login: e2eState.email
      });
      return redirect(authFailureRedirectPath(request, env, 'e2e_link_invalid', {
        action: 'login',
        loginSource: e2eState.loginSource,
        returnTo: e2eState.returnTo,
        visitorId: e2eState.visitorId
      }));
    }
  }

  return {
    e2eAuthSecret,
    handleAuthCallback,
    handleAuthStart,
    handleE2eAuthVerify,
    handleEmailAuthRequest,
    handleEmailAuthVerify,
    handleGithubAppCallback,
    handleGithubAppConnectStart,
    handleGithubAppInstallStart,
    handleGithubAppSetup,
    handleGoogleAuthCallback,
    handleGoogleAuthStart
  };
}
