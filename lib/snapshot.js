import { billingPeriodId } from './shared.js';

export function requestedBillingPeriod(url) {
  const raw = String(url.searchParams.get('period') || '').trim();
  return /^\d{4}-\d{2}$/.test(raw) ? raw : billingPeriodId();
}

export function createSnapshotHelpers(deps = {}) {
  const {
    accountSettingsForLogin,
    appSettingsMap,
    authStatus,
    buildAdminDashboard,
    buildConversionAnalytics,
    buildMonthlyAccountSummary,
    canReviewFeedbackReports,
    canViewAdminDashboard,
    chatTranscriptsForClient,
    currentUserContext,
    d1ChatMemoryForCurrent,
    feedbackReportsForClient,
    getSession,
    identityLoginsForCurrent,
    jobListPaginationFromRequest,
    lazyAppSettingsMap,
    lightweightCurrentFromSession,
    ownChatMemoryForClient,
    publicAgent,
    publicApp,
    recoverMissingAccountsInState,
    recurringOrdersVisibleToLogin,
    sanitizeAccountSettingsForClient,
    sanitizeExactMatchActionsForClient,
    statsOf,
    visibleBillingAuditsForRequest,
    visibleEventsForRequest,
    visibleJobsForRequest,
    visibleJobsForRequestFast
  } = deps;

  async function lazyStats(storage, env) {
    const db = env?.MY_BINDING;
    if (db?.prepare) {
      const firstNumber = async (sql, binds = [], key = 'value') => {
        const row = await db.prepare(sql).bind(...binds).first();
        return Number(row?.[key] || 0);
      };
      const [
        activeJobs,
        onlineAgents,
        registeredApps,
        failedJobs,
        timedOutRuns,
        terminalRuns,
        totalJobs,
        nextRetryRow
      ] = await Promise.all([
        firstNumber("SELECT COUNT(*) AS value FROM jobs WHERE lower(status) IN ('queued','claimed','running','dispatched')"),
        firstNumber('SELECT COUNT(*) AS value FROM agents WHERE online=1'),
        firstNumber("SELECT COUNT(*) AS value FROM apps WHERE COALESCE(status,'active') != 'deprecated'"),
        firstNumber("SELECT COUNT(*) AS value FROM jobs WHERE lower(status)='failed'"),
        firstNumber("SELECT COUNT(*) AS value FROM jobs WHERE lower(status)='timed_out'"),
        firstNumber("SELECT COUNT(*) AS value FROM jobs WHERE lower(status) IN ('completed','failed','timed_out')"),
        firstNumber('SELECT COUNT(*) AS value FROM jobs'),
        db.prepare("SELECT json_extract(dispatch_json,'$.nextRetryAt') AS next_retry_at FROM jobs WHERE json_extract(dispatch_json,'$.nextRetryAt') IS NOT NULL ORDER BY json_extract(dispatch_json,'$.nextRetryAt') ASC LIMIT 1").first()
      ]);
      return {
        activeJobs,
        onlineAgents,
        registeredApps,
        grossVolume: 0,
        todayCost: 0,
        platformRevenue: 0,
        failedJobs,
        retryableRuns: 0,
        timedOutRuns,
        terminalRuns,
        nextRetryAt: nextRetryRow?.next_retry_at || null,
        totalJobs
      };
    }
    return statsOf(await storage.getState());
  }

  async function lazySnapshot(storage, request, env, options = {}) {
    const url = new URL(request.url);
    const session = Object.prototype.hasOwnProperty.call(options, 'session')
      ? options.session
      : await getSession(request, env);
    const current = lightweightCurrentFromSession(session);
    const auth = await authStatus(request, env);
    const [stats, agentCatalog, appCatalog, settings] = await Promise.all([
      lazyStats(storage, env),
      typeof storage.listAgents === 'function' ? storage.listAgents({ limit: 500 }) : null,
      typeof storage.listApps === 'function' ? storage.listApps({ limit: 500 }) : null,
      lazyAppSettingsMap(storage)
    ]);
    const agents = Array.isArray(agentCatalog)
      ? agentCatalog.map((agent) => publicAgent(agent, agentCatalog)).filter(Boolean)
      : (Array.isArray((await storage.getState()).agents) ? (await storage.getState()).agents : []).map((agent) => publicAgent(agent)).filter(Boolean);
    const apps = Array.isArray(appCatalog)
      ? appCatalog.map((app) => publicApp(app)).filter(Boolean)
      : [];
    const jobsResult = current?.login
      ? await visibleJobsForRequestFast(storage, { ...current, apiKeyStatus: 'session', apiKey: null }, env, request)
      : { jobs: [], pagination: jobListPaginationFromRequest(request) };
    const recurringOrders = current?.login && typeof storage.listRecurringOrders === 'function'
      ? recurringOrdersVisibleToLogin({
          recurringOrders: await storage.listRecurringOrders({
            admin: canViewAdminDashboard(current, env),
            ownerLogins: identityLoginsForCurrent(current),
            limit: 100
          })
        }, current.login)
      : [];
    const account = current?.login && typeof storage.getAccountByLogin === 'function'
      ? await storage.getAccountByLogin(current.login)
      : null;
    const effectiveAccount = account || (current?.login ? accountSettingsForLogin({ accounts: [] }, current.login, current.user, current.authProvider) : null);
    const chatMemory = current?.login ? (await d1ChatMemoryForCurrent(env, current, 20, storage) || []) : [];
    const monthlySummary = current?.login
      ? buildMonthlyAccountSummary({ jobs: [], events: [], accounts: effectiveAccount ? [effectiveAccount] : [] }, current.login, requestedBillingPeriod(url), effectiveAccount)
      : null;
    return {
      stats,
      agents,
      apps,
      jobs: jobsResult.jobs,
      events: [],
      billingAudits: [],
      recurringOrders,
      storage: {
        kind: storage.kind,
        supportsPersistence: storage.supportsPersistence,
        path: null,
        note: storage.note || (storage.kind === 'd1' ? 'Cloudflare D1 active (lazy snapshot)' : 'In-memory fallback active')
      },
      auth,
      exactActions: [],
      appSettings: settings,
      accountSettings: sanitizeAccountSettingsForClient(effectiveAccount),
      monthlySummary,
      chatMemory
    };
  }

  async function snapshot(storage, request, env, options = {}) {
    const url = new URL(request.url);
    const adminDashboardOnly = Boolean(options.adminDashboardOnly || url.searchParams.get('adminDashboard') === '1');
    if (storage?.kind === 'd1' && url.searchParams.get('full') !== '1') {
      const payload = await lazySnapshot(storage, request, env, options);
      if (adminDashboardOnly) {
        return {
          auth: payload.auth,
          apps: payload.apps,
          storage: payload.storage
        };
      }
      return payload;
    }
    let state = await storage.getState();
    const auth = await authStatus(request, env);
    const current = await currentUserContext(request, env);
    let accountSettings = null;
    let monthlySummary = null;
    let feedbackReports = null;
    let conversionAnalytics = null;
    let chatTranscripts = null;
    let adminDashboard = null;
    const canReviewReports = canReviewFeedbackReports(current, env);
    const canRepairAdminAccounts = canViewAdminDashboard(current, env);
    if (canRepairAdminAccounts && !adminDashboardOnly) {
      if (typeof storage.getFreshState === 'function') state = await storage.getFreshState();
      const repairProbe = structuredClone(state);
      const repairPreview = recoverMissingAccountsInState(repairProbe);
      if (Number(repairPreview?.recovered || 0) > 0) {
        await storage.mutate(async (draft) => recoverMissingAccountsInState(draft));
        state = typeof storage.getFreshState === 'function' ? await storage.getFreshState() : await storage.getState();
      }
    }
    if (current.user?.login) {
      accountSettings = accountSettingsForLogin(state, current.login, current.user, current.authProvider);
      monthlySummary = buildMonthlyAccountSummary(state, current.login, requestedBillingPeriod(url), accountSettings);
      feedbackReports = canReviewReports ? feedbackReportsForClient(state, 200) : null;
      conversionAnalytics = canReviewReports ? buildConversionAnalytics(state) : null;
      chatTranscripts = canReviewReports ? chatTranscriptsForClient(state, 200) : null;
      adminDashboard = canRepairAdminAccounts
        ? buildAdminDashboard(state, {
            operator: current.login,
            compact: true,
            includeConversionAnalytics: false,
            limits: {
              accounts: 200,
              chats: 120,
              agents: 200,
              orders: 160,
              reports: 120,
              events: 200
            }
          })
        : null;
    }
    if (adminDashboardOnly) {
      return {
        auth,
        apps: (Array.isArray(state.apps) ? state.apps : []).map((app) => publicApp(app)).filter(Boolean),
        storage: {
          kind: storage.kind,
          supportsPersistence: storage.supportsPersistence,
          path: null,
          note: storage.note || (storage.kind === 'd1' ? 'Cloudflare D1 active' : 'In-memory fallback active')
        },
        ...(adminDashboard ? { adminDashboard } : {})
      };
    }
    const chatMemory = current?.login ? ownChatMemoryForClient(state, current.login, 20) : [];
    const jobs = visibleJobsForRequest(state, current, env, request);
    const payload = {
      stats: statsOf(state),
      agents: state.agents.map((agent) => publicAgent(agent, state.agents)).filter(Boolean),
      apps: (Array.isArray(state.apps) ? state.apps : []).map((app) => publicApp(app)).filter(Boolean),
      jobs,
      events: visibleEventsForRequest(state, current, env),
      billingAudits: visibleBillingAuditsForRequest(state, current, env, jobs),
      recurringOrders: recurringOrdersVisibleToLogin(state, current.login),
      storage: {
        kind: storage.kind,
        supportsPersistence: storage.supportsPersistence,
        path: null,
        note: storage.note || (storage.kind === 'd1' ? 'Cloudflare D1 active' : 'In-memory fallback active')
      },
      auth,
      exactActions: sanitizeExactMatchActionsForClient(state.exactMatchActions || []),
      appSettings: appSettingsMap(state),
      accountSettings: sanitizeAccountSettingsForClient(accountSettings),
      monthlySummary,
      chatMemory
    };
    if (feedbackReports) payload.feedbackReports = feedbackReports;
    if (conversionAnalytics) payload.conversionAnalytics = conversionAnalytics;
    if (chatTranscripts) payload.chatTranscripts = chatTranscripts;
    if (adminDashboard) payload.adminDashboard = adminDashboard;
    return payload;
  }

  return {
    lazySnapshot,
    lazyStats,
    snapshot
  };
}
