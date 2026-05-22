export function createAppRouteHandlers(deps = {}) {
  const {
    appContextIsExpired,
    appManifestOptionsForRequest,
    applyVerificationToAppRecord,
    authorizeAppOwnerAction,
    createAppContextRecord,
    createAppFromInput,
    createAppFromManifest,
    currentAgentRequesterContext,
    isCoreFeatureAppId,
    json,
    loadAppManifestFromUrl,
    loginsForCurrentAccount,
    normalizeAppManifest,
    nowIso,
    ownerInfoFromRequest,
    parseBody,
    publicApp,
    publicAppContext,
    recordOrderApiKeyUsage,
    requireAgentWriteAccess,
    runtimePolicy,
    shapePublisherContextWithOpenAi,
    touchEvent,
    validateAppManifest,
    validateManifestUrlInput,
    verifyAppHealth
  } = deps;

  async function handleRegisterApp(storage, request, env) {
    const current = await currentAgentRequesterContext(storage, request, env);
    const access = requireAgentWriteAccess(current, env);
    if (access.error) return json({ error: access.error }, access.statusCode || 400);
    let body;
    try {
      body = await parseBody(request);
    } catch (error) {
      return json({ error: error.message }, 400);
    }
    const ownerInfo = await ownerInfoFromRequest(request, env, current);
    const app = createAppFromInput(body, ownerInfo, {
      verificationStatus: body.verification_status || body.verificationStatus || 'manual_registered'
    });
    const validation = validateAppManifest(app, appManifestOptionsForRequest(request, env));
    if (!validation.ok) return json({ error: validation.errors.join('; ') }, 400);
    await storage.mutate(async (state) => {
      if (!Array.isArray(state.apps)) state.apps = [];
      state.apps = [app, ...state.apps.filter((item) => String(item?.id || '') !== app.id)];
    });
    await touchEvent(storage, 'APP_REGISTERED', `${app.name} registered as an app`, { app_id: app.id, owner: app.owner });
    if (current.apiKey?.id) await recordOrderApiKeyUsage(storage, current, request);
    return json({ ok: true, app: publicApp(app), validation, owner: ownerInfo.owner }, 201);
  }

  async function handleImportAppManifest(storage, request, env) {
    const current = await currentAgentRequesterContext(storage, request, env);
    const access = requireAgentWriteAccess(current, env);
    if (access.error) return json({ error: access.error }, access.statusCode || 400);
    let body;
    try {
      body = await parseBody(request);
    } catch (error) {
      return json({ error: error.message }, 400);
    }
    const manifest = normalizeAppManifest(body.manifest || body, appManifestOptionsForRequest(request, env));
    const validation = validateAppManifest(manifest, appManifestOptionsForRequest(request, env));
    if (!validation.ok) return json({ error: validation.errors.join('; ') }, 400);
    const ownerInfo = await ownerInfoFromRequest(request, env, current);
    const app = createAppFromManifest(manifest, ownerInfo, {
      manifestSource: 'app-manifest-json',
      verificationStatus: 'manifest_loaded',
      importMode: 'app-manifest-json'
    });
    await storage.mutate(async (state) => {
      if (!Array.isArray(state.apps)) state.apps = [];
      state.apps = [app, ...state.apps.filter((item) => String(item?.id || '') !== app.id)];
    });
    await touchEvent(storage, 'APP_REGISTERED', `${app.name} imported from app manifest JSON`, { app_id: app.id, owner: app.owner });
    if (current.apiKey?.id) await recordOrderApiKeyUsage(storage, current, request);
    return json({ ok: true, app: publicApp(app), validation, owner: ownerInfo.owner }, 201);
  }

  async function handleImportAppUrl(storage, request, env) {
    const current = await currentAgentRequesterContext(storage, request, env);
    const access = requireAgentWriteAccess(current, env);
    if (access.error) return json({ error: access.error }, access.statusCode || 400);
    let body;
    try {
      body = await parseBody(request);
    } catch (error) {
      return json({ error: error.message }, 400);
    }
    const manifestUrl = body.manifest_url || body.manifestUrl || body.url;
    if (!manifestUrl) return json({ error: 'manifest_url required' }, 400);
    let manifest;
    try {
      manifest = await loadAppManifestFromUrl(manifestUrl, request, env);
    } catch (error) {
      return json({ error: error.message }, 400);
    }
    const validation = validateAppManifest(manifest, appManifestOptionsForRequest(request, env));
    if (!validation.ok) return json({ error: validation.errors.join('; ') }, 400);
    const safeManifestUrl = validateManifestUrlInput(manifestUrl, env);
    const ownerInfo = await ownerInfoFromRequest(request, env, current);
    const app = createAppFromManifest(manifest, ownerInfo, {
      manifestUrl: manifest.manifestUrl || safeManifestUrl,
      manifestSource: manifest.manifestSource || safeManifestUrl,
      verificationStatus: 'manifest_loaded',
      importMode: 'app-manifest-url'
    });
    await storage.mutate(async (state) => {
      if (!Array.isArray(state.apps)) state.apps = [];
      state.apps = [app, ...state.apps.filter((item) => String(item?.id || '') !== app.id)];
    });
    await touchEvent(storage, 'APP_REGISTERED', `${app.name} app manifest loaded from URL`, { app_id: app.id, owner: app.owner });
    if (current.apiKey?.id) await recordOrderApiKeyUsage(storage, current, request);
    return json({ ok: true, app: publicApp(app), validation, owner: ownerInfo.owner, import_mode: 'app-manifest-url' }, 201);
  }

  function findAppByCatalogId(state = {}, appId = '') {
    const safeId = String(appId || '').trim();
    if (!safeId) return null;
    return (Array.isArray(state.apps) ? state.apps : [])
      .find((item) => String(item?.id || '').trim() === safeId) || null;
  }

  async function handleAppHandoff(storage, request, env, appId = '') {
    const current = await currentAgentRequesterContext(storage, request, env);
    if (!current.user && current.apiKeyStatus === 'invalid') return json({ error: 'Invalid API key' }, 401);
    if (!current.user && current.apiKeyStatus !== 'valid') return json({ error: 'Login or CAIt API key required' }, 401);
    if (isCoreFeatureAppId(appId)) return json({ error: 'This CAIt feature is not an app handoff target.' }, 400);
    let body;
    try {
      body = await parseBody(request);
    } catch (error) {
      return json({ error: error.message }, 400);
    }
    const state = await storage.getState();
    const app = findAppByCatalogId(state, appId);
    if (!app) return json({ error: 'App not found' }, 404);
    if (String(app.status || '').toLowerCase() === 'deprecated') return json({ error: 'App is not active' }, 410);
    const createUrl = String(app.handoff?.createUrl || app.metadata?.manifest?.handoff?.createUrl || app.metadata?.manifest?.handoff?.create_url || '').trim();
    if (!createUrl) return json({ error: 'App does not expose handoff.create_url' }, 400);
    const methodInput = String(app.handoff?.method || app.metadata?.manifest?.handoff?.method || 'POST').trim().toUpperCase();
    const method = ['POST', 'PUT', 'PATCH'].includes(methodInput) ? methodInput : 'POST';
    let response;
    let text = '';
    try {
      response = await fetch(createUrl, {
        method,
        headers: {
          'content-type': 'application/json',
          accept: 'application/json',
          'x-cait-app-id': String(app.id || ''),
          'x-cait-transfer-id': String(body.transfer_id || body.transferId || '')
        },
        body: JSON.stringify({
          ...body,
          app_id: app.id,
          app_name: app.name,
          source_platform: 'CAIt'
        })
      });
      text = await response.text();
    } catch (error) {
      return json({ error: `App handoff request failed: ${error.message}` }, 502);
    }
    let data = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { raw: text.slice(0, 1000) };
    }
    const handoffUrl = String(data.handoff_url || data.handoffUrl || data.open_url || data.openUrl || data.url || '').trim();
    if (!response.ok) {
      return json({
        error: String(data.error || data.message || `App handoff failed (${response.status})`),
        upstream_status: response.status,
        upstream_response: data
      }, response.status >= 400 && response.status < 600 ? response.status : 502);
    }
    if (!handoffUrl) {
      return json({
        error: 'App handoff response did not include handoff_url',
        upstream_status: response.status,
        upstream_response: data
      }, 502);
    }
    await touchEvent(storage, 'APP_HANDOFF', `${current.login} sent CAIt context to ${app.name}`, {
      app_id: app.id,
      app_name: app.name,
      login: current.login,
      transfer_id: String(body.transfer_id || body.transferId || ''),
      handoff_url: handoffUrl
    });
    if (current.apiKey?.id) await recordOrderApiKeyUsage(storage, current, request);
    return json({
      ok: true,
      app: publicApp(app),
      handoff_url: handoffUrl,
      upstream_status: response.status,
      upstream_response: data
    });
  }

  function appContextAccessToken() {
    return `ctx_${crypto.randomUUID().replace(/-/g, '')}`;
  }

  function appContextChatUrl(request, record = {}) {
    const url = new URL('/chat', new URL(request.url).origin);
    url.searchParams.set('app_context_id', String(record.id || ''));
    if (record.accessToken) url.searchParams.set('app_context_token', String(record.accessToken));
    return `${url.pathname}${url.search}`;
  }

  function appContextOwnerAllowed(record = {}, current = null, token = '', policy = {}) {
    if (!record?.id || appContextIsExpired(record)) return false;
    const suppliedToken = String(token || '').trim();
    if (suppliedToken && record.accessToken && suppliedToken === String(record.accessToken)) return true;
    if (policy.openWriteApiEnabled) return true;
    const owner = String(record.ownerLogin || '').trim().toLowerCase();
    return Boolean(owner && loginsForCurrentAccount(current).includes(owner));
  }

  async function handleCreateAppContext(storage, request, env) {
    const current = await currentAgentRequesterContext(storage, request, env);
    if (!current.user && current.apiKeyStatus === 'invalid') return json({ error: 'Invalid API key' }, 401);
    let body;
    try {
      body = await parseBody(request);
    } catch (error) {
      return json({ error: error.message }, 400);
    }
    const sourceApp = String(body.app_id || body.appId || body.source_app || body.sourceApp || body.context?.source_app || '').trim();
    const ownerLogin = current.login || current.user?.login || current.apiKey?.accountLogin || current.apiKey?.account_login || '';
    const rawContext = {
      ...(body.context && typeof body.context === 'object' ? body.context : body),
      source_app: sourceApp || body.context?.source_app,
      source_app_label: body.context?.source_app_label || body.source_app_label
    };
    const record = createAppContextRecord(rawContext, { login: ownerLogin }, {
      accessToken: appContextAccessToken(),
      expiresAt: body.expires_at || body.expiresAt || ''
    });
    await storage.appendAppContext(record);
    await touchEvent(storage, 'APP_CONTEXT_CREATED', `${ownerLogin || 'api client'} created app context from ${record.sourceAppLabel || record.sourceApp}`, {
      app_id: record.sourceApp,
      context_id: record.id,
      owner: ownerLogin
    });
    if (current.apiKey?.id) await recordOrderApiKeyUsage(storage, current, request);
    return json({
      ok: true,
      app_context: publicAppContext(record),
      app_context_id: record.id,
      app_context_token: record.accessToken,
      chat_url: appContextChatUrl(request, record)
    }, 201);
  }

  async function handlePublisherContextIngest(storage, request, env) {
    const current = await currentAgentRequesterContext(storage, request, env);
    const policy = runtimePolicy(env);
    if (!current.user && current.apiKeyStatus === 'invalid') return json({ error: 'Invalid API key' }, 401);
    if (!current.user && current.apiKeyStatus !== 'valid' && !policy.openWriteApiEnabled) return json({ error: 'Login or CAIt API key required' }, 401);
    let body;
    try {
      body = await parseBody(request);
    } catch (error) {
      return json({ error: error.message }, 400);
    }
    const ownerLogin = current.login || current.user?.login || current.apiKey?.accountLogin || current.apiKey?.account_login || '';
    const inputContext = body.context && typeof body.context === 'object' ? body.context : body;
    const rawContext = {
      ...inputContext,
      source_app: 'publisher_approval_studio',
      source_app_label: 'Publisher & Approval Studio',
      raw_context: {
        ...(inputContext.raw_context && typeof inputContext.raw_context === 'object' ? inputContext.raw_context : {}),
        publisher_ingest: {
          received_from: String(body.source_app || body.sourceApp || inputContext.source_app || inputContext.sourceApp || 'external_agent').slice(0, 160),
          received_at: nowIso()
        }
      }
    };
    const shaped = await shapePublisherContextWithOpenAi(rawContext, env);
    const record = createAppContextRecord(shaped.context, { login: ownerLogin }, {
      accessToken: appContextAccessToken(),
      expiresAt: body.expires_at || body.expiresAt || ''
    });
    await storage.appendAppContext(record);
    await touchEvent(storage, 'PUBLISHER_CONTEXT_INGESTED', `${ownerLogin || 'api client'} pushed context into Publisher`, {
      context_id: record.id,
      owner: ownerLogin,
      context_shape: shaped.shape
    });
    if (current.apiKey?.id) await recordOrderApiKeyUsage(storage, current, request);
    return json({
      ok: true,
      publisher_context: publicAppContext(record),
      app_context: publicAppContext(record),
      app_context_id: record.id,
      app_context_token: record.accessToken,
      app_context_shape: shaped.shape,
      chat_url: appContextChatUrl(request, record)
    }, 201);
  }

  async function handleGetAppContext(storage, request, env, contextId = '') {
    const current = await currentAgentRequesterContext(storage, request, env);
    const policy = runtimePolicy(env);
    const url = new URL(request.url);
    const token = String(url.searchParams.get('token') || url.searchParams.get('app_context_token') || request.headers.get('x-cait-app-context-token') || '').trim();
    const record = await storage.getAppContextById(contextId);
    if (!record) return json({ error: 'App context not found' }, 404);
    if (appContextIsExpired(record)) return json({ error: 'App context expired' }, 410);
    if (!appContextOwnerAllowed(record, current, token, policy)) {
      if (!current.user && current.apiKeyStatus === 'invalid') return json({ error: 'Invalid API key' }, 401);
      return json({ error: 'Login, owner access, or app context token required' }, 401);
    }
    return json({ ok: true, app_context: publicAppContext(record) });
  }

  async function handleListAppContexts(storage, request, env) {
    const current = await currentAgentRequesterContext(storage, request, env);
    const policy = runtimePolicy(env);
    if (!current.user && current.apiKeyStatus === 'invalid') return json({ error: 'Invalid API key' }, 401);
    if (!current.user && current.apiKeyStatus !== 'valid' && !policy.openWriteApiEnabled) return json({ error: 'Login or CAIt API key required' }, 401);
    const url = new URL(request.url);
    const limit = Math.max(1, Math.min(50, Number(url.searchParams.get('limit') || 20) || 20));
    const logins = new Set(loginsForCurrentAccount(current));
    const contexts = (await storage.listAppContexts({
      limit,
      admin: policy.openWriteApiEnabled,
      ownerLogins: [...logins]
    }))
      .filter((record) => !appContextIsExpired(record))
      .filter((record) => policy.openWriteApiEnabled || logins.has(String(record.ownerLogin || '').trim().toLowerCase()))
      .map((record) => publicAppContext(record, { includePayload: false }));
    return json({ ok: true, app_contexts: contexts });
  }

  async function handleVerifyApp(storage, request, env, appId) {
    const current = await currentAgentRequesterContext(storage, request, env);
    const state = await storage.getState();
    const authorization = authorizeAppOwnerAction(state, request, env, appId, current);
    if (authorization.error) return json({ error: authorization.error }, authorization.statusCode || 400);
    const result = await storage.mutate(async (draft) => {
      const app = (Array.isArray(draft.apps) ? draft.apps : []).find((item) => String(item?.id || '') === String(appId || ''));
      if (!app) return { error: 'App not found', statusCode: 404 };
      const verification = await verifyAppHealth(app, request, env);
      applyVerificationToAppRecord(app, verification);
      return { ok: true, app: publicApp(app), verification };
    });
    if (result.error) return json({ error: result.error }, result.statusCode || 400);
    await touchEvent(storage, result.verification.ok ? 'APP_VERIFIED' : 'APP_FAILED', `${result.app.name} app verification ${result.verification.status}`, { app_id: result.app.id, status: result.verification.status });
    if (current.apiKey?.id) await recordOrderApiKeyUsage(storage, current, request);
    return json(result);
  }

  async function handleDeleteApp(storage, request, env, appId) {
    const current = await currentAgentRequesterContext(storage, request, env);
    const state = await storage.getState();
    const authorization = authorizeAppOwnerAction(state, request, env, appId, current);
    if (authorization.error) return json({ error: authorization.error }, authorization.statusCode || 400);
    const result = await storage.mutate(async (draft) => {
      const app = (Array.isArray(draft.apps) ? draft.apps : []).find((item) => String(item?.id || '') === String(appId || ''));
      if (!app) return { error: 'App not found', statusCode: 404 };
      const visibleApp = publicApp(app) || { id: app.id, name: app.name };
      const deletedAt = nowIso();
      app.status = 'deprecated';
      app.metadata = {
        ...(app.metadata && typeof app.metadata === 'object' ? app.metadata : {}),
        hidden_from_catalog: true,
        deleted_at: deletedAt,
        deletedAt,
        deleted_reason: 'owner_removed_from_catalog',
        deletedReason: 'owner_removed_from_catalog'
      };
      app.updatedAt = deletedAt;
      return { ok: true, app: visibleApp, soft_deleted: true };
    });
    if (result.error) return json({ error: result.error }, result.statusCode || 400);
    await touchEvent(storage, 'APP_REMOVED', `${result.app.name} removed from app catalog`, { app_id: result.app.id });
    if (current.apiKey?.id) await recordOrderApiKeyUsage(storage, current, request);
    return json(result);
  }

  return {
    handleRegisterApp,
    handleImportAppManifest,
    handleImportAppUrl,
    handleAppHandoff,
    handleCreateAppContext,
    handlePublisherContextIngest,
    handleGetAppContext,
    handleListAppContexts,
    handleVerifyApp,
    handleDeleteApp
  };
}
