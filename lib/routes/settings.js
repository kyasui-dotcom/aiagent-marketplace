import {
  sanitizeAccountSettingsForClient,
  sanitizeBillingSettingsPatch,
  sanitizeExecutorPreferencesPatch,
  sanitizePayoutSettingsPatch,
  upsertAccountSettingsInState
} from '../shared.js';

export function createSettingsRouteHandlers(deps = {}) {
  const {
    accountSettingsForLogin,
    accountHash,
    buildMonthlyAccountSummary,
    currentUserContext,
    getSession,
    lightweightCurrentFromSession,
    nowIso,
    parseBody,
    requestedBillingPeriod,
    touchEvent
  } = deps;

  async function getSettingsPayload(storage, request, env) {
    const current = lightweightCurrentFromSession(await getSession(request, env));
    if (!current.user) return { error: 'Login required', statusCode: 401 };
    const url = new URL(request.url);
    const account = typeof storage.getAccountByLogin === 'function'
      ? await storage.getAccountByLogin(current.login)
      : accountSettingsForLogin({ accounts: [] }, current.login, current.user, current.authProvider);
    const effectiveAccount = account || accountSettingsForLogin({ accounts: [] }, current.login, current.user, current.authProvider);
    const monthlySummary = buildMonthlyAccountSummary({ jobs: [], events: [], accounts: effectiveAccount ? [effectiveAccount] : [] }, current.login, requestedBillingPeriod(url), effectiveAccount);
    return { account: sanitizeAccountSettingsForClient(effectiveAccount), monthlySummary };
  }

  async function saveSettingsSection(storage, request, env, section) {
    const current = await currentUserContext(request, env);
    if (!current.user) return { error: 'Login required', statusCode: 401 };
    if (section === 'payout' && !current.githubLinked) {
      return { error: 'GitHub connection required for provider actions.', statusCode: 403 };
    }
    let body;
    try {
      body = await parseBody(request);
    } catch (error) {
      return { error: error.message, statusCode: 400 };
    }
    const patch = section === 'billing'
      ? sanitizeBillingSettingsPatch(body || {})
      : section === 'payout'
        ? sanitizePayoutSettingsPatch(body || {})
        : section === 'executorPreferences'
          ? sanitizeExecutorPreferencesPatch(body || {})
        : (body || {});
    let account = null;
    await storage.mutate(async (draft) => {
      account = upsertAccountSettingsInState(draft, current.login, current.user, current.authProvider, { [section]: patch });
    });
    const url = new URL(request.url);
    const state = await storage.getState();
    const monthlySummary = buildMonthlyAccountSummary(state, current.login, requestedBillingPeriod(url), account);
    return { account: sanitizeAccountSettingsForClient(account), monthlySummary };
  }

  async function deleteCurrentAccount(storage, request, env) {
    const current = await currentUserContext(request, env);
    if (!current.user) return { error: 'Login required', statusCode: 401 };
    let body;
    try {
      body = await parseBody(request);
    } catch (error) {
      return { error: error.message, statusCode: 400 };
    }
    const confirmation = String(body?.confirm || body?.confirmation || '').trim();
    if (confirmation !== 'DELETE') {
      return { error: 'Type DELETE to confirm account deletion.', statusCode: 400 };
    }
    const login = String(current.login || current.user?.login || current.user?.email || '').trim().toLowerCase();
    if (!login) return { error: 'Login required', statusCode: 401 };
    const deletedAt = typeof nowIso === 'function' ? nowIso() : new Date().toISOString();
    const hash = typeof accountHash === 'function' ? accountHash(login) : '';
    let result = null;
    if (typeof storage.deleteAccountByLogin === 'function') {
      result = await storage.deleteAccountByLogin(login, { accountHash: hash, deletedAt });
    } else {
      await storage.mutate(async (draft) => {
        const accounts = Array.isArray(draft.accounts) ? draft.accounts : [];
        draft.accounts = accounts.filter((account) => String(account?.login || '').trim().toLowerCase() !== login);
      });
      result = { deleted: true };
    }
    if (typeof touchEvent === 'function') {
      await touchEvent(storage, 'ACCOUNT', `${login} deleted account`, {
        login,
        accountHash: hash,
        deletedAt
      });
    }
    return {
      ok: true,
      deleted: Boolean(result?.deleted),
      redirect_to: '/'
    };
  }

  return {
    deleteCurrentAccount,
    getSettingsPayload,
    saveSettingsSection
  };
}
