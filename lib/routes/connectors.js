// Connector route handlers extracted from worker.js.
// Keep these as HTTP/account glue; low-level provider calls stay in connector service modules.

export function createConnectorRouteHandlers(deps = {}) {
  const {
    accountSettingsForLogin,
    baseUrl,
    buildXAuthorizeUrl,
    buildXPkcePair,
    connectorOAuthActionInstruction,
    connectorTokenEncryptionConfigured,
    createWordPressDraft,
    currentAgentRequesterContext,
    currentAgentRequesterContextWithAccount,
    currentUserContext,
    encryptConnectorSecret,
    exchangeXOAuthCode,
    fetchXProfile,
    hasPostConfirmation,
    isPrivateNetworkHostname,
    json,
    normalizeLocalRedirectPath,
    normalizeOAuthLoginSource,
    normalizeOAuthVisitorId,
    normalizeWordPressSiteUrl,
    nowIso,
    parseBody,
    postXTweet,
    publicWordPressConnectorStatus,
    publicXConnectorStatus,
    pushOAuthStateCookie,
    recordOrderApiKeyUsage,
    redirect,
    redirectWithCookies,
    runtimeStorage,
    testWordPressApplicationPassword,
    touchEvent,
    upsertAccountSettingsInState,
    validateXPostExecutionApproval,
    validateXPostText,
    wordpressConnectorFromApplicationPassword,
    xConnectorFromOAuthToken,
    xOAuthConfigured,
    xTokenEncryptionConfigured
  } = deps;

  function xCallbackUrl(request, env) {
    return String(env?.X_CALLBACK_URL || '').trim() || `${baseUrl(request, env)}/auth/x/callback`;
  }
  function xAuthErrorRedirect(code = 'x_auth_failed') {
    return `/?auth_error=${encodeURIComponent(code)}`;
  }
  function xAuthSuccessRedirectPath(request, env, cookieState = null) {
    const returnTo = normalizeLocalRedirectPath(request, env, cookieState?.returnTo || '', '/chat');
    try {
      const target = new URL(returnTo, baseUrl(request, env));
      target.searchParams.set('connect', 'x_connected');
      return `${target.pathname}${target.search}${target.hash}` || '/?connect=x_connected';
    } catch {
      return '/?connect=x_connected';
    }
  }
  async function handleXAuthStart(request, env) {
    if (!xOAuthConfigured(env)) {
      return json({ error: 'X OAuth is not configured. Set X_CLIENT_ID and X_CLIENT_SECRET.' }, 503);
    }
    if (!xTokenEncryptionConfigured(env)) {
      return json({ error: 'X token encryption is not configured. Set X_TOKEN_ENCRYPTION_KEY to base64 32 bytes.' }, 503);
    }
    const current = await currentUserContext(request, env);
    if (!current?.login) return redirect(xAuthErrorRedirect('login_required_for_x'));
    const url = new URL(request.url);
    const capabilities = [
      ...url.searchParams.getAll('capability'),
      ...url.searchParams.getAll('capabilities')
    ].flatMap((value) => String(value || '').split(/[,\s]+/)).filter(Boolean);
    const state = crypto.randomUUID();
    const pkce = await buildXPkcePair();
    const authUrl = buildXAuthorizeUrl(env, {
      callbackUrl: xCallbackUrl(request, env),
      state,
      codeChallenge: pkce.challenge,
      capabilities
    });
    return redirectWithCookies(authUrl.toString(), [
      await pushOAuthStateCookie(request, env, state, {
        provider: 'x-oauth',
        action: 'connect',
        accountLogin: current.login,
        codeVerifier: pkce.verifier,
        returnTo: normalizeLocalRedirectPath(request, env, url.searchParams.get('return_to') || '', '/chat'),
        loginSource: normalizeOAuthLoginSource(url.searchParams.get('login_source') || ''),
        visitorId: normalizeOAuthVisitorId(url.searchParams.get('visitor_id') || '')
      })
    ]);
  }
  async function handleXAuthCallback(request, env) {
    if (!xOAuthConfigured(env)) return redirect('/?auth_error=x_not_configured');
    if (!xTokenEncryptionConfigured(env)) return redirect('/?auth_error=x_token_encryption_not_configured');
    const storage = runtimeStorage(env);
    const url = new URL(request.url);
    const code = String(url.searchParams.get('code') || '').trim();
    const state = String(url.searchParams.get('state') || '').trim();
    const errorParam = String(url.searchParams.get('error') || '').trim();
    if (errorParam) return redirect(xAuthErrorRedirect(`x_oauth_${errorParam}`));
    if (!code || !state) return redirect('/?auth_error=invalid_x_oauth_state');
    const oauthState = await consumeOAuthState(request, env, state);
    const cookieState = oauthState.entry;
    if (!cookieState || cookieState.provider !== 'x-oauth' || !cookieState.codeVerifier || !cookieState.accountLogin) {
      return redirectWithCookies('/?auth_error=invalid_x_oauth_state', [oauthState.cookie]);
    }
    const current = await currentUserContext(request, env);
    if (!current?.login) return redirectWithCookies('/?auth_error=login_required_for_x', [oauthState.cookie]);
    if (String(current.login).toLowerCase() !== String(cookieState.accountLogin).toLowerCase()) {
      return redirectWithCookies('/?auth_error=x_oauth_account_mismatch', [oauthState.cookie]);
    }
    try {
      const token = await exchangeXOAuthCode(env, {
        code,
        codeVerifier: cookieState.codeVerifier,
        callbackUrl: xCallbackUrl(request, env)
      });
      const profile = await fetchXProfile(token.access_token);
      if (!profile?.id || !profile?.username) throw new Error('X profile missing id or username.');
      await storage.mutate(async (draft) => {
        const account = accountSettingsForLogin(draft, current.login, current.user, current.authProvider);
        const existingX = account?.connectors?.x || {};
        const x = await xConnectorFromOAuthToken(env, profile, token, existingX);
        upsertAccountSettingsInState(draft, current.login, current.user, current.authProvider, {
          connectors: {
            ...(account.connectors || {}),
            x
          }
        });
      });
      await touchEvent(storage, 'X_CONNECTED', `${current.login} connected X @${profile.username}`, {
        login: current.login,
        username: profile.username
      });
      return redirectWithCookies(xAuthSuccessRedirectPath(request, env, cookieState), [oauthState.cookie], { 'cache-control': 'no-store' });
    } catch (error) {
      return redirectWithCookies(xAuthErrorRedirect(error.message || 'x_callback_failed'), [oauthState.cookie]);
    }
  }
  async function handleXConnectorStatus(request, env) {
    const storage = runtimeStorage(env);
    const state = await storage.getState();
    const current = await currentAgentRequesterContext(storage, request, env);
    if (!current?.user && current.apiKeyStatus === 'invalid') return json({ error: 'Invalid API key' }, 401);
    if (!current?.user && current.apiKeyStatus !== 'valid') return json({ error: 'Login or CAIt API key required' }, 401);
    const account = current.account || accountSettingsForLogin(state, current.login, current.user, current.authProvider);
    if (current.apiKey?.id) await recordOrderApiKeyUsage(storage, current, request);
    return json({
      ok: true,
      x: publicXConnectorStatus(account?.connectors?.x || null, env)
    });
  }
  async function handleXConnectorPost(request, env) {
    const storage = runtimeStorage(env);
    const body = await parseBody(request).catch((error) => ({ __error: error.message }));
    if (body.__error) return json({ error: body.__error }, 400);
    if (!hasPostConfirmation(body)) {
      return json({
        error: 'Explicit confirmation required before posting to X.',
        required: 'confirm_post=true'
      }, 428);
    }
    const validation = validateXPostText(body.text || body.post || body.tweet || '');
    if (!validation.ok) return json({ error: validation.error, length: validation.length || 0 }, 400);
    const state = await storage.getState();
    const current = await currentAgentRequesterContext(storage, request, env);
    if (!current?.user && current.apiKeyStatus === 'invalid') return json({ error: 'Invalid API key' }, 401);
    if (!current?.user && current.apiKeyStatus !== 'valid') return json({ error: 'Login or CAIt API key required' }, 401);
    const account = current.account || accountSettingsForLogin(state, current.login, current.user, current.authProvider);
    const connector = account?.connectors?.x || null;
    if (!connector?.connected || !connector?.accessTokenEnc) {
      return json({
        error: 'X connection required before posting.',
        code: 'connector_required',
        needs_connector: true,
        missing_connectors: ['x'],
        missing_connector_capabilities: ['x.post'],
        action: connectorOAuthActionInstruction('connect_x')
      }, 409);
    }
    const approval = validateXPostExecutionApproval(connector, {
      ...body,
      text: validation.text
    });
    if (!approval.ok) {
      return json({
        error: approval.error,
        code: approval.code,
        needs_confirmation: true,
        required: approval.required,
        account: approval.account
      }, approval.statusCode || 428);
    }
    try {
      const posted = await postXTweet(env, connector, {
        text: validation.text,
        replyToTweetId: body.reply_to_tweet_id || body.replyToTweetId || ''
      });
      let updated = null;
      await storage.mutate(async (draft) => {
        const latest = accountSettingsForLogin(draft, current.login, current.user, current.authProvider);
        updated = upsertAccountSettingsInState(draft, current.login, current.user, current.authProvider, {
          connectors: {
            ...(latest.connectors || {}),
            x: posted.connector
          }
        });
      });
      await touchEvent(storage, 'X_POSTED', `${current.login} posted to X`, {
        login: current.login,
        tweetId: posted.tweetId,
        url: posted.url,
        source: String(body.source || 'web')
      });
      return json({
        ok: true,
        tweet_id: posted.tweetId,
        url: posted.url,
        account: approval.account,
        x: publicXConnectorStatus(updated?.connectors?.x || posted.connector, env)
      }, 201);
    } catch (error) {
      return json({ error: error.message || 'X post failed' }, Number(error?.statusCode || 502));
    } finally {
      if (current?.apiKey?.id) await recordOrderApiKeyUsage(storage, current, request);
    }
  }
  async function handleWordPressConnectorStatus(request, env) {
    const storage = runtimeStorage(env);
    const state = await storage.getState();
    const current = await currentAgentRequesterContext(storage, request, env);
    if (!current?.user && current.apiKeyStatus === 'invalid') return json({ error: 'Invalid API key' }, 401);
    if (!current?.user && current.apiKeyStatus !== 'valid') return json({ error: 'Login or CAIt API key required' }, 401);
    const account = current.account || accountSettingsForLogin(state, current.login, current.user, current.authProvider);
    if (current.apiKey?.id) await recordOrderApiKeyUsage(storage, current, request);
    return json({
      ok: true,
      wordpress: publicWordPressConnectorStatus(account?.connectors?.wordpress || null, env)
    });
  }
  async function handleWordPressConnectorConnect(request, env) {
    const storage = runtimeStorage(env);
    const body = await parseBody(request).catch((error) => ({ __error: error.message }));
    if (body.__error) return json({ error: body.__error }, 400);
    const current = await currentAgentRequesterContextWithAccount(storage, request, env);
    if (!current?.user && current.apiKeyStatus === 'invalid') return json({ error: 'Invalid API key' }, 401);
    if (!current?.user && current.apiKeyStatus !== 'valid') return json({ error: 'Login or CAIt API key required' }, 401);
    if (!connectorTokenEncryptionConfigured(env)) {
      return json({
        error: 'Connector secret encryption is not configured.',
        code: 'connector_secret_encryption_required'
      }, 503);
    }
    const siteUrl = String(body.site_url || body.siteUrl || '').trim();
    const username = String(body.username || '').trim();
    const applicationPassword = String(body.application_password || body.applicationPassword || '').trim();
    try {
      const normalizedSiteUrl = normalizeWordPressSiteUrl(siteUrl);
      if (isPrivateNetworkHostname(new URL(normalizedSiteUrl).hostname)) {
        return json({
          error: 'WordPress site URL must be a public HTTPS host.',
          code: 'wordpress_public_https_required'
        }, 400);
      }
      const checked = await testWordPressApplicationPassword({ siteUrl, username, applicationPassword });
      const applicationPasswordEnc = await encryptConnectorSecret(env, applicationPassword);
      let updated = null;
      await storage.mutate(async (draft) => {
        const latest = accountSettingsForLogin(draft, current.login, current.user, current.authProvider);
        const existing = latest?.connectors?.wordpress || {};
        const wordpress = wordpressConnectorFromApplicationPassword({
          siteUrl: checked.siteUrl,
          username: checked.username,
          applicationPasswordEnc,
          displayName: checked.displayName,
          existing
        });
        updated = upsertAccountSettingsInState(draft, current.login, current.user, current.authProvider, {
          connectors: {
            ...(latest.connectors || {}),
            wordpress
          }
        });
      });
      await touchEvent(storage, 'WORDPRESS_CONNECTED', `${current.login} connected WordPress ${normalizedSiteUrl}`, {
        login: current.login,
        siteUrl: normalizedSiteUrl,
        source: String(body.source || 'publisher_approval_studio')
      });
      return json({
        ok: true,
        wordpress: publicWordPressConnectorStatus(updated?.connectors?.wordpress || null, env)
      }, 201);
    } catch (error) {
      return json({
        error: error.message || 'WordPress connection failed',
        code: error?.statusCode === 401 || error?.statusCode === 403 ? 'wordpress_auth_failed' : 'wordpress_connect_failed',
        details: error?.payload || null
      }, Number(error?.statusCode || 400));
    } finally {
      if (current?.apiKey?.id) await recordOrderApiKeyUsage(storage, current, request);
    }
  }
  async function handleWordPressConnectorCreateDraft(request, env) {
    const storage = runtimeStorage(env);
    const body = await parseBody(request).catch((error) => ({ __error: error.message }));
    if (body.__error) return json({ error: body.__error }, 400);
    if (!body.confirm_create_draft && !body.confirmCreateDraft) {
      return json({
        error: 'Explicit confirmation required before creating a WordPress draft.',
        required: 'confirm_create_draft=true'
      }, 428);
    }
    const current = await currentAgentRequesterContextWithAccount(storage, request, env);
    if (!current?.user && current.apiKeyStatus === 'invalid') return json({ error: 'Invalid API key' }, 401);
    if (!current?.user && current.apiKeyStatus !== 'valid') return json({ error: 'Login or CAIt API key required' }, 401);
    const account = current.account || {};
    const connector = account?.connectors?.wordpress || null;
    if (!connector?.connected || !connector?.applicationPasswordEnc) {
      return json({
        error: 'WordPress connection required before creating a draft.',
        code: 'connector_required',
        needs_connector: true,
        missing_connectors: ['wordpress'],
        missing_connector_capabilities: ['wordpress.create_draft'],
        action: 'Connect WordPress in Publisher & Approval Studio.'
      }, 409);
    }
    if (isPrivateNetworkHostname(new URL(normalizeWordPressSiteUrl(connector.siteUrl)).hostname)) {
      return json({
        error: 'WordPress site URL must be a public HTTPS host.',
        code: 'wordpress_public_https_required'
      }, 400);
    }
    try {
      const draft = await createWordPressDraft(env, connector, {
        title: body.title || body.name || '',
        slug: body.slug || body.path || '',
        excerpt: body.excerpt || body.meta || body.meta_description || '',
        content: body.content || body.body || body.markdown || '',
        contentHtml: body.content_html || body.contentHtml || '',
        postType: body.post_type || body.postType || 'posts',
        status: 'draft'
      });
      let updated = null;
      await storage.mutate(async (state) => {
        const latest = accountSettingsForLogin(state, current.login, current.user, current.authProvider);
        const existing = latest?.connectors?.wordpress || {};
        const wordpress = {
          ...existing,
          lastDraftAt: nowIso(),
          lastDraftId: draft.id,
          lastDraftUrl: draft.editUrl || draft.link,
          updatedAt: nowIso()
        };
        updated = upsertAccountSettingsInState(state, current.login, current.user, current.authProvider, {
          connectors: {
            ...(latest.connectors || {}),
            wordpress
          }
        });
      });
      await touchEvent(storage, 'WORDPRESS_DRAFT_CREATED', `${current.login} created WordPress draft ${draft.id || ''}`.trim(), {
        login: current.login,
        siteUrl: connector.siteUrl,
        draftId: draft.id,
        editUrl: draft.editUrl,
        source: String(body.source || 'publisher_approval_studio')
      });
      return json({
        ok: true,
        wordpress: publicWordPressConnectorStatus(updated?.connectors?.wordpress || connector, env),
        draft
      }, 201);
    } catch (error) {
      return json({
        error: error.message || 'WordPress draft creation failed',
        code: error?.statusCode === 401 || error?.statusCode === 403 ? 'wordpress_auth_failed' : 'wordpress_draft_failed',
        details: error?.payload || null
      }, Number(error?.statusCode || 502));
    } finally {
      if (current?.apiKey?.id) await recordOrderApiKeyUsage(storage, current, request);
    }
  }

  return {
    handleXAuthStart,
    handleXAuthCallback,
    handleXConnectorStatus,
    handleXConnectorPost,
    handleWordPressConnectorStatus,
    handleWordPressConnectorConnect,
    handleWordPressConnectorCreateDraft
  };
}
