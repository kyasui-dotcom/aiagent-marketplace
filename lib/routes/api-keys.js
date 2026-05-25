import {
  accountIdForLogin,
  accountSettingsForLogin,
  createOrderApiKeyInState,
  revokeOrderApiKeyInState,
  sanitizeAccountSettingsForClient
} from '../shared.js';

function configuredCaitAdminApiTokens(env) {
  return [...new Set(String(env?.CAIT_ADMIN_API_TOKENS || env?.CAIT_ADMIN_API_TOKEN || env?.CAIT_OPERATOR_TOKEN || '')
    .split(',')
    .map((value) => String(value || '').trim())
    .filter(Boolean))];
}

function extractCaitAdminApiToken(request) {
  const direct = String(request.headers.get('x-cait-admin-token') || request.headers.get('x-admin-token') || '').trim();
  if (direct) return direct;
  const authHeader = String(request.headers.get('authorization') || '').trim();
  if (authHeader.toLowerCase().startsWith('bearer ')) return authHeader.slice(7).trim();
  return '';
}

function sanitizeAdminApiKeyLogin(body = {}) {
  const login = String(body?.login || body?.account_login || body?.accountLogin || body?.email || '').trim().toLowerCase();
  if (!login) return { error: 'login is required' };
  if (login.length > 160) return { error: 'login is too long' };
  if (!/^[a-z0-9._%+\-@]+$/i.test(login)) return { error: 'login contains unsupported characters' };
  return { login };
}

export function createApiKeyRouteHandlers(deps = {}) {
  const {
    accountUserFromSettings,
    canViewAdminDashboard,
    currentUserContext,
    parseBody,
    runtimePolicy,
    secretEquals,
    touchEvent
  } = deps;

  function developerApiDisabled(env) {
    return !runtimePolicy(env).developerApiEnabled;
  }

  function developerApiDisabledResult() {
    return {
      error: 'CAIt developer API, CLI, and API-key access are temporarily disabled while the external contract is stabilized.',
      code: 'developer_api_disabled',
      statusCode: 403
    };
  }

  async function authorizeCaitAdminApiKeyIssuer(request, env) {
    if (developerApiDisabled(env)) return developerApiDisabledResult();
    const providedToken = extractCaitAdminApiToken(request);
    const configuredTokens = configuredCaitAdminApiTokens(env);
    if (providedToken) {
      if (configuredTokens.some((token) => secretEquals(providedToken, token))) {
        return { ok: true, authMode: 'operator-token', actor: 'operator-token' };
      }
      return { error: 'Invalid admin API token', statusCode: 401 };
    }
    const current = await currentUserContext(request, env);
    if (canViewAdminDashboard(current, env)) {
      return { ok: true, authMode: 'admin-session', actor: current.login || 'admin-session', current };
    }
    return {
      error: configuredTokens.length ? 'Admin API token or platform admin login required' : 'Admin API key issuance is disabled',
      statusCode: configuredTokens.length ? 401 : 404
    };
  }

  async function listOrderApiKeys(storage, request, env) {
    if (developerApiDisabled(env)) return developerApiDisabledResult();
    const current = await currentUserContext(request, env);
    if (!current.user) return { error: 'Login required', statusCode: 401 };
    const storedAccount = typeof storage.getAccountByLogin === 'function'
      ? await storage.getAccountByLogin(current.login)
      : null;
    const account = storedAccount || accountSettingsForLogin({ accounts: [] }, current.login, current.user, current.authProvider);
    return { apiKeys: sanitizeAccountSettingsForClient(account)?.apiAccess?.orderKeys || [] };
  }

  async function createOrderApiKey(storage, request, env) {
    if (developerApiDisabled(env)) return developerApiDisabledResult();
    const current = await currentUserContext(request, env);
    if (!current.user) return { error: 'Login required', statusCode: 401 };
    let body;
    try {
      body = await parseBody(request);
    } catch (error) {
      return { error: error.message, statusCode: 400 };
    }
    if (runtimePolicy(env).releaseStage === 'public' && String(body?.mode || 'live').toLowerCase() === 'test') {
      return { error: 'Test API keys are disabled on the public deployment.', statusCode: 403 };
    }
    let created = null;
    try {
      const mutate = typeof storage.mutateAccount === 'function'
        ? (mutator) => storage.mutateAccount(current.login, mutator)
        : (mutator) => storage.mutate(mutator);
      await mutate(async (draft) => {
        created = createOrderApiKeyInState(draft, current.login, current.user, current.authProvider, {
          label: body?.label || '',
          mode: body?.mode || 'live'
        });
      });
    } catch (error) {
      if (/^API key title /.test(String(error?.message || ''))) {
        return { error: error.message, statusCode: 400 };
      }
      throw error;
    }
    await touchEvent(storage, 'API_KEY', `${current.login} issued ${created.apiKey.mode} CAIt API key ${created.apiKey.label}`);
    return {
      ok: true,
      apiKey: created.apiKey,
      account: sanitizeAccountSettingsForClient(created.account)
    };
  }

  async function createAdminOrderApiKey(storage, request, env) {
    if (developerApiDisabled(env)) return developerApiDisabledResult();
    const authorization = await authorizeCaitAdminApiKeyIssuer(request, env);
    if (authorization.error) return authorization;
    let body;
    try {
      body = await parseBody(request);
    } catch (error) {
      return { error: error.message, statusCode: 400 };
    }
    const target = sanitizeAdminApiKeyLogin(body || {});
    if (target.error) return { error: target.error, statusCode: 400 };
    if (runtimePolicy(env).releaseStage === 'public' && String(body?.mode || 'live').toLowerCase() === 'test') {
      return { error: 'Test API keys are disabled on the public deployment.', statusCode: 403 };
    }
    let created = null;
    try {
      const mutate = typeof storage.mutateAccount === 'function'
        ? (mutator) => storage.mutateAccount(target.login, mutator)
        : (mutator) => storage.mutate(mutator);
      await mutate(async (draft) => {
        const existing = (Array.isArray(draft.accounts) ? draft.accounts : [])
          .find((account) => String(account?.login || '').trim().toLowerCase() === target.login);
        const existingUser = accountUserFromSettings(existing);
        const user = existingUser || {
          login: target.login,
          name: String(body?.name || target.login).trim() || target.login,
          email: String(body?.email || (target.login.includes('@') ? target.login : '')).trim(),
          accountId: accountIdForLogin(target.login)
        };
        const authProvider = existing?.authProvider || 'operator-cli';
        created = createOrderApiKeyInState(draft, target.login, user, authProvider, {
          label: body?.label || '',
          mode: body?.mode || 'live'
        });
      });
    } catch (error) {
      if (/^API key title /.test(String(error?.message || ''))) {
        return { error: error.message, statusCode: 400 };
      }
      throw error;
    }
    await touchEvent(storage, 'API_KEY', `${authorization.actor} issued ${created.apiKey.mode} CAIt API key ${created.apiKey.label} for ${target.login}`, {
      source: 'admin_api_key_cli',
      actor: authorization.actor,
      authMode: authorization.authMode,
      targetLogin: target.login,
      keyId: created.apiKey.id
    });
    return {
      ok: true,
      apiKey: created.apiKey,
      account: sanitizeAccountSettingsForClient(created.account),
      issuedBy: authorization.actor,
      authMode: authorization.authMode
    };
  }

  async function revokeOrderApiKey(storage, request, env, keyId) {
    if (developerApiDisabled(env)) return developerApiDisabledResult();
    const current = await currentUserContext(request, env);
    if (!current.user) return { error: 'Login required', statusCode: 401 };
    let revoked = null;
    const mutate = typeof storage.mutateAccount === 'function'
      ? (mutator) => storage.mutateAccount(current.login, mutator)
      : (mutator) => storage.mutate(mutator);
    await mutate(async (draft) => {
      revoked = revokeOrderApiKeyInState(draft, current.login, keyId, current.user, current.authProvider);
    });
    if (!revoked) return { error: 'API key not found', statusCode: 404 };
    await touchEvent(storage, 'API_KEY', `${current.login} revoked CAIt API key ${revoked.apiKey.label}`);
    return {
      ok: true,
      apiKey: revoked.apiKey,
      account: sanitizeAccountSettingsForClient(revoked.account)
    };
  }

  return {
    authorizeCaitAdminApiKeyIssuer,
    createAdminOrderApiKey,
    createOrderApiKey,
    developerApiDisabled,
    developerApiDisabledResult,
    listOrderApiKeys,
    revokeOrderApiKey
  };
}
