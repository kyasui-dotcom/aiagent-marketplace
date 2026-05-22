function safeParseAdminJson(raw = '', fallback = null) {
  try {
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function adminSessionIdentityLogins(session = null) {
  return [...new Set([
    session?.accountLogin,
    session?.user?.login,
    session?.user?.email,
    session?.githubIdentity?.login,
    session?.githubIdentity?.email,
    session?.googleIdentity?.login,
    session?.googleIdentity?.email
  ].map((value) => String(value || '').trim().toLowerCase()).filter(Boolean))];
}

export function createAdminDashboardRouteHandlers(deps = {}) {
  const {
    getSession,
    json,
    nowIso,
    platformAdminLogins,
    sessionAuthProvider
  } = deps;

  function canViewAdminDashboardSession(session, env) {
    const admins = platformAdminLogins(env);
    return adminSessionIdentityLogins(session).some((login) => admins.includes(login));
  }

  function adminDashboardAuthPayload(session = null, env = {}) {
    const loggedIn = Boolean(session?.user?.login || session?.accountLogin);
    return {
      loggedIn,
      authProvider: sessionAuthProvider(session),
      isPlatformAdmin: loggedIn && canViewAdminDashboardSession(session, env),
      login: String(session?.accountLogin || session?.user?.login || '').trim().toLowerCase(),
      user: session?.user || null,
      identityLogins: adminSessionIdentityLogins(session)
    };
  }

  async function handleAdminDashboardApi(request, env) {
    const session = await getSession(request, env);
    const auth = adminDashboardAuthPayload(session, env);
    if (!auth.loggedIn) return json({ auth, error: 'Sign in required' }, 200);
    if (!auth.isPlatformAdmin) return json({ auth, error: 'Admin access required' }, 200);
    try {
      const db = env?.MY_BINDING;
      if (!db?.prepare) return json({ auth, error: 'D1 binding unavailable' }, 503);
      const now = Date.now();
      const since24h = new Date(now - 24 * 60 * 60 * 1000).toISOString();
      const since7d = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
      const firstValue = async (sql, binds = [], key = 'count') => {
        const statement = db.prepare(sql);
        const row = await (binds.length ? statement.bind(...binds) : statement).first();
        return Number(row?.[key] || 0);
      };
      const allRows = async (sql, binds = []) => {
        const statement = db.prepare(sql);
        const result = await (binds.length ? statement.bind(...binds) : statement).all();
        return Array.isArray(result?.results) ? result.results : [];
      };
      const [
        accountsTotal,
        accounts24h,
        accounts7d,
        ordersTotal,
        ordersActive,
        ordersCompleted,
        ordersFailed,
        orders24h,
        orders7d,
        agentsTotal,
        agentsReady,
        agents24h,
        agents7d,
        reportsTotal,
        reportsOpen,
        reportsReviewing,
        reportsResolved,
        reports24h,
        reports7d,
        chatTurnsTotal,
        chatTurns24h,
        chatTurns7d,
        accountsRows,
        ordersRows,
        agentsRows,
        reportsRows,
        appsRows
      ] = await Promise.all([
        firstValue('SELECT COUNT(*) AS count FROM accounts'),
        firstValue('SELECT COUNT(*) AS count FROM accounts WHERE created_at >= ?', [since24h]),
        firstValue('SELECT COUNT(*) AS count FROM accounts WHERE created_at >= ?', [since7d]),
        firstValue("SELECT COUNT(*) AS count FROM (SELECT COALESCE(NULLIF(workflow_parent_id,''), id) AS work_id FROM jobs GROUP BY work_id)"),
        firstValue("SELECT COUNT(*) AS count FROM (SELECT COALESCE(NULLIF(workflow_parent_id,''), id) AS work_id, SUM(CASE WHEN status IN ('queued','claimed','running','dispatched') THEN 1 ELSE 0 END) AS active_count FROM jobs GROUP BY work_id) WHERE active_count > 0"),
        firstValue("SELECT COUNT(*) AS count FROM (SELECT COALESCE(NULLIF(workflow_parent_id,''), id) AS work_id, COUNT(*) AS total_count, SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) AS completed_count FROM jobs GROUP BY work_id) WHERE total_count = completed_count"),
        firstValue("SELECT COUNT(*) AS count FROM (SELECT COALESCE(NULLIF(workflow_parent_id,''), id) AS work_id, SUM(CASE WHEN status IN ('failed','timed_out') THEN 1 ELSE 0 END) AS failed_count FROM jobs GROUP BY work_id) WHERE failed_count > 0"),
        firstValue('SELECT COUNT(*) AS count FROM jobs WHERE created_at >= ?', [since24h]),
        firstValue('SELECT COUNT(*) AS count FROM jobs WHERE created_at >= ?', [since7d]),
        firstValue('SELECT COUNT(*) AS count FROM agents'),
        firstValue('SELECT COUNT(*) AS count FROM agents WHERE online=1'),
        firstValue('SELECT COUNT(*) AS count FROM agents WHERE created_at >= ?', [since24h]),
        firstValue('SELECT COUNT(*) AS count FROM agents WHERE created_at >= ?', [since7d]),
        firstValue('SELECT COUNT(*) AS count FROM feedback_reports'),
        firstValue("SELECT COUNT(*) AS count FROM feedback_reports WHERE status='open'"),
        firstValue("SELECT COUNT(*) AS count FROM feedback_reports WHERE status='reviewing'"),
        firstValue("SELECT COUNT(*) AS count FROM feedback_reports WHERE status='resolved'"),
        firstValue('SELECT COUNT(*) AS count FROM feedback_reports WHERE created_at >= ?', [since24h]),
        firstValue('SELECT COUNT(*) AS count FROM feedback_reports WHERE created_at >= ?', [since7d]),
        firstValue('SELECT COUNT(*) AS count FROM chat_transcripts'),
        firstValue('SELECT COUNT(*) AS count FROM chat_transcripts WHERE created_at >= ?', [since24h]),
        firstValue('SELECT COUNT(*) AS count FROM chat_transcripts WHERE created_at >= ?', [since7d]),
        allRows('SELECT * FROM accounts ORDER BY updated_at DESC LIMIT 200'),
        allRows('SELECT id,parent_agent_id,task_type,status,prompt,input_json,actual_billing_json,created_at,completed_at,failed_at,timed_out_at,last_callback_at,job_kind,workflow_parent_id,workflow_task,workflow_agent_name,original_prompt FROM jobs ORDER BY created_at DESC, id DESC LIMIT 260'),
        allRows('SELECT id,name,task_types,owner,online,metadata_json,created_at,updated_at FROM agents ORDER BY updated_at DESC LIMIT 200'),
        allRows('SELECT id,type,status,title,message,email,reporter_login,created_at,updated_at FROM feedback_reports ORDER BY created_at DESC LIMIT 120'),
        allRows('SELECT id,name,description,capabilities_json,task_types_json,status,verification_status,owner,base_url,updated_at FROM apps ORDER BY updated_at DESC LIMIT 100').catch(() => [])
      ]);
      const accounts = accountsRows.map((row) => {
        const account = safeParseAdminJson(row.profile_json, {}) || {};
        const linked = Array.isArray(account.linkedIdentities) ? account.linkedIdentities : [];
        const apiKeys = Array.isArray(account.apiKeys) ? account.apiKeys : [];
        return {
          id: row.id,
          login: account.login || row.login,
          displayName: account.profile?.displayName || account.login || row.login,
          email: account.billing?.billingEmail || account.payout?.payoutEmail || linked.find((item) => item?.email)?.email || '',
          authProvider: account.authProvider || '',
          linkedProviders: [...new Set(linked.map((item) => item?.provider).filter(Boolean))],
          createdAt: account.createdAt || row.created_at,
          updatedAt: account.updatedAt || row.updated_at,
          subscriptionPlan: account.billing?.subscriptionPlan || account.billing?.plan || 'none',
          welcomeCreditsBalance: Number(account.billing?.welcomeCreditsBalance || 0),
          depositBalance: Number(account.billing?.depositBalance || 0),
          stripeCustomerStatus: account.stripe?.customerId ? 'created' : 'not_started',
          githubRepos: Array.isArray(account.githubAppAccess?.repos) ? account.githubAppAccess.repos.length : 0,
          apiKeys: { total: apiKeys.length, active: apiKeys.filter((key) => !key.revokedAt).length }
        };
      });
      const orders = ordersRows.map((row) => {
        const input = safeParseAdminJson(row.input_json, {}) || {};
        const billing = safeParseAdminJson(row.actual_billing_json, null);
        return {
          id: row.id,
          parentAgentId: row.parent_agent_id || '',
          taskType: row.task_type,
          status: row.status,
          prompt: String(row.prompt || '').slice(0, 600),
          originalPrompt: String(row.original_prompt || '').slice(0, 600),
          requesterLogin: input?._broker?.requester?.login || '',
          createdAt: row.created_at,
          updatedAt: row.last_callback_at || row.completed_at || row.failed_at || row.timed_out_at || row.created_at,
          completedAt: row.completed_at || '',
          failedAt: row.failed_at || '',
          timedOutAt: row.timed_out_at || '',
          actualBilling: billing,
          billingMode: input?._broker?.billingMode || '',
          jobKind: row.job_kind || '',
          workflowParentId: row.workflow_parent_id || '',
          workflowTask: row.workflow_task || '',
          workflowAgentName: row.workflow_agent_name || '',
          workId: row.workflow_parent_id || row.id,
          workTitle: input?._broker?.workflow?.objective || input?.original_prompt || row.original_prompt || row.prompt || ''
        };
      });
      const agents = agentsRows.map((row) => {
        const metadata = safeParseAdminJson(row.metadata_json, {}) || {};
        return {
          id: row.id,
          name: row.name,
          taskTypes: safeParseAdminJson(row.task_types, []),
          owner: row.owner || '',
          online: Boolean(row.online),
          ready: Boolean(row.online),
          verificationStatus: metadata?.__verification?.status || '',
          productKind: metadata?.productKind || 'agent',
          createdAt: row.created_at,
          updatedAt: row.updated_at
        };
      });
      const reports = reportsRows.map((row) => ({
        id: row.id,
        type: row.type,
        status: row.status,
        title: row.title,
        message: String(row.message || '').slice(0, 500),
        email: row.email || '',
        reporterLogin: row.reporter_login || '',
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
      const apps = appsRows.map((row) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        capabilities: safeParseAdminJson(row.capabilities_json, []),
        taskTypes: safeParseAdminJson(row.task_types_json, []),
        status: row.status || 'active',
        verificationStatus: row.verification_status || '',
        owner: row.owner || '',
        baseUrl: row.base_url || ''
      }));
      return json({
        auth,
        apps,
        adminDashboard: {
          generatedAt: nowIso(),
          operator: auth.login,
          summary: {
            accounts: { total: accountsTotal, last24h: accounts24h, last7d: accounts7d },
            chats: { total: chatTurnsTotal, last24h: chatTurns24h, last7d: chatTurns7d, turnsTotal: chatTurnsTotal, mine: 0, otherLoggedIn: 0, guestUnknown: chatTurnsTotal, nonMine: chatTurnsTotal, handledNonMine: 0, needsReviewNonMine: 0 },
            agents: { total: agentsTotal, userAgents: agents.filter((agent) => agent.owner && !['aiagent2', 'system'].includes(agent.owner.toLowerCase())).length, ready: agentsReady, last24h: agents24h, last7d: agents7d },
            orders: { total: ordersTotal, active: ordersActive, completed: ordersCompleted, failed: ordersFailed, last24h: orders24h, last7d: orders7d },
            reports: { total: reportsTotal, open: reportsOpen, reviewing: reportsReviewing, resolved: reportsResolved, last24h: reports24h, last7d: reports7d },
            providerBilling: { accounts: 0, retrying: 0, notified: 0 }
          },
          accounts,
          chats: [],
          chatSegments: { mine: 0, otherLoggedIn: 0, guestUnknown: chatTurnsTotal, nonMine: chatTurnsTotal },
          chatHandling: { nonMineTotal: chatTurnsTotal, handledNonMine: 0, needsReviewNonMine: 0, byStatus: {} },
          agents,
          orders,
          reports,
          events: [],
          conversionAnalytics: null
        }
      });
    } catch (error) {
      return json({
        auth,
        error: 'Admin dashboard query failed',
        detail: String(error?.message || error).slice(0, 1000)
      }, 500);
    }
  }

  return {
    adminDashboardAuthPayload,
    handleAdminDashboardApi
  };
}
