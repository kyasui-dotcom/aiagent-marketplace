import { timingSafeEqual } from 'node:crypto';

const secretEncoder = new TextEncoder();

export function createRequestIdentityHelpers({
  aliasLoginsForAccount,
  isAgentOwnedByLogin,
  runtimePolicy
}) {
  function identityLoginsForCurrent(current = null) {
    const linkedIdentities = Array.isArray(current?.account?.linkedIdentities) ? current.account.linkedIdentities : [];
    return [...new Set([
      current?.login,
      current?.user?.login,
      current?.user?.email,
      current?.githubIdentity?.login,
      current?.githubIdentity?.email,
      current?.googleIdentity?.login,
      current?.googleIdentity?.email,
      ...linkedIdentities.flatMap((identity) => [identity?.login, identity?.email]),
      ...aliasLoginsForAccount(current?.account || null)
    ].map((value) => String(value || '').trim().toLowerCase()).filter(Boolean))];
  }

  function requesterOwnsJobForCurrent(job, current = null) {
    const identityLogins = identityLoginsForCurrent(current);
    if (!identityLogins.length) return false;
    const requester = (((job || {}).input || {})._broker || {}).requester || {};
    const requesterLogin = String(requester.login || '').trim().toLowerCase();
    if (requesterLogin && identityLogins.includes(requesterLogin)) return true;
    const requesterAccountId = String(requester.accountId || '').trim().toLowerCase();
    if (requesterAccountId && identityLogins.some((login) => requesterAccountId === `acct:${login}`)) return true;
    return false;
  }

  function secretEquals(left = '', right = '') {
    const a = secretEncoder.encode(String(left || ''));
    const b = secretEncoder.encode(String(right || ''));
    if (a.byteLength !== b.byteLength) return false;
    return timingSafeEqual(a, b);
  }

  function extractAgentToken(request) {
    const headerToken = String(request.headers.get('x-agent-token') || '').trim();
    if (headerToken) return headerToken;
    const authHeader = String(request.headers.get('authorization') || '').trim();
    if (authHeader.toLowerCase().startsWith('bearer ')) return authHeader.slice(7).trim();
    return '';
  }

  function requireWriteAccess(request, env, current = null) {
    const resolvedCurrent = current || null;
    const policy = runtimePolicy(env);
    if (policy.openWriteApiEnabled || resolvedCurrent?.user) return { current: resolvedCurrent, policy };
    return { error: 'Login required', statusCode: 401, current: resolvedCurrent, policy };
  }

  function loginsForCurrentAccount(current = null) {
    const aliases = aliasLoginsForAccount(current?.account || null);
    return [...new Set([
      current?.login,
      current?.user?.login,
      current?.githubIdentity?.login,
      current?.googleIdentity?.login,
      ...aliases
    ].map((value) => String(value || '').trim().toLowerCase()).filter(Boolean))];
  }

  function isAgentOwnedByCurrent(agent, current = null) {
    return loginsForCurrentAccount(current).some((login) => isAgentOwnedByLogin(agent, login));
  }

  function authorizeAgentOwnerAction(state, request, env, agentId, current = null) {
    const resolvedCurrent = current || null;
    const policy = runtimePolicy(env);
    const agent = state.agents.find((item) => item.id === agentId);
    if (!agent) return { error: 'Agent not found', statusCode: 404, current: resolvedCurrent, policy };
    if (policy.openWriteApiEnabled || isAgentOwnedByCurrent(agent, resolvedCurrent)) return { agent, current: resolvedCurrent, policy };
    if (!resolvedCurrent?.user && resolvedCurrent?.apiKeyStatus === 'invalid') return { error: 'Invalid API key', statusCode: 401, current: resolvedCurrent, policy };
    if (!resolvedCurrent?.user && resolvedCurrent?.apiKeyStatus !== 'valid') return { error: 'Login or CAIt API key required', statusCode: 401, current: resolvedCurrent, policy };
    return { error: 'Only the agent owner can perform this action', statusCode: 403, current: resolvedCurrent, policy };
  }

  function authorizeConnectedAgentAction(state, request, env, agentId, current = null) {
    const resolvedCurrent = current || null;
    const policy = runtimePolicy(env);
    const agent = state.agents.find((item) => item.id === agentId);
    if (!agent) return { error: 'Agent not found', statusCode: 404, current: resolvedCurrent, policy };
    if (policy.openWriteApiEnabled || isAgentOwnedByCurrent(agent, resolvedCurrent)) return { agent, current: resolvedCurrent, policy, authMode: policy.openWriteApiEnabled ? 'open-write' : 'owner-session' };
    const token = extractAgentToken(request);
    if (token && agent.token && secretEquals(token, agent.token)) return { agent, current: resolvedCurrent, policy, authMode: 'agent-token' };
    if (!resolvedCurrent?.user) return { error: 'Login or valid agent token required', statusCode: 401, current: resolvedCurrent, policy };
    return { error: 'Agent owner login or valid agent token required', statusCode: 403, current: resolvedCurrent, policy };
  }

  return {
    authorizeAgentOwnerAction,
    authorizeConnectedAgentAction,
    extractAgentToken,
    identityLoginsForCurrent,
    isAgentOwnedByCurrent,
    loginsForCurrentAccount,
    requesterOwnsJobForCurrent,
    requireWriteAccess,
    secretEquals
  };
}

export function createRequestVisibilityHelpers({
  billingAuditsForJobIds,
  canReviewFeedbackReports,
  canViewAdminDashboard,
  clearJobAuthorityRequest,
  cloneJob,
  identityLoginsForCurrent,
  normalizeJobStatus,
  publicEventView,
  requesterOwnsJobForCurrent,
  runtimePolicy
}) {
  function visibleEventsForRequest(state, current, env) {
    const policy = runtimePolicy(env);
    const activityEvents = state.events.filter((event) => String(event?.type || '').toUpperCase() !== 'TRACK');
    if (policy.exposeJobSecrets || canReviewFeedbackReports(current, env)) return activityEvents.map((event) => structuredClone(event));
    return activityEvents.map((event) => publicEventView(event));
  }

  function sanitizeJobForViewer(job, env) {
    const cloned = cloneJob(job);
    if (!cloned) return null;
    if (['failed', 'timed_out'].includes(normalizeJobStatus(cloned.status))) {
      clearJobAuthorityRequest(cloned);
    }
    if (!runtimePolicy(env).exposeJobSecrets) delete cloned.callbackToken;
    return cloned;
  }

  function visibleJobsForRequest(state, current, env, request = null) {
    const byId = new Map();
    const addJobs = (jobs) => {
      for (const job of jobs || []) {
        if (job?.id) byId.set(job.id, job);
      }
    };
    if (canViewAdminDashboard(current, env)) addJobs(Array.isArray(state?.jobs) ? state.jobs : []);
    else addJobs((Array.isArray(state?.jobs) ? state.jobs : []).filter((job) => requesterOwnsJobForCurrent(job, current)));
    return [...byId.values()]
      .map((job) => sanitizeJobForViewer(job, env))
      .sort((left, right) => {
        const leftTs = String(left?.createdAt || left?.updatedAt || left?.startedAt || left?.ts || '');
        const rightTs = String(right?.createdAt || right?.updatedAt || right?.startedAt || right?.ts || '');
        const diff = rightTs.localeCompare(leftTs);
        if (diff !== 0) return diff;
        return String(right?.id || '').localeCompare(String(left?.id || ''));
      });
  }

  function jobListPaginationFromRequest(request = null) {
    let limit = 50;
    let offset = 0;
    try {
      const url = new URL(request?.url || 'https://example.test/');
      limit = Math.max(1, Math.min(100, Number(url.searchParams.get('limit') || 50) || 50));
      const page = Math.max(1, Number(url.searchParams.get('page') || 1) || 1);
      offset = Math.max(0, Number(url.searchParams.get('offset') || ((page - 1) * limit)) || 0);
    } catch {}
    return { limit, offset };
  }

  async function visibleJobsForRequestFast(storage, current, env, request = null) {
    const pagination = jobListPaginationFromRequest(request);
    if (typeof storage.listJobs !== 'function') {
      const state = await storage.getState();
      return {
        jobs: visibleJobsForRequest(state, current, env, request).slice(pagination.offset, pagination.offset + pagination.limit),
        pagination
      };
    }
    const identityLogins = identityLoginsForCurrent(current);
    const jobs = await storage.listJobs({
      admin: canViewAdminDashboard(current, env),
      identityLogins,
      accountIds: identityLogins.map((login) => `acct:${login}`),
      limit: pagination.limit,
      offset: pagination.offset
    });
    return {
      jobs: (Array.isArray(jobs) ? jobs : [])
        .map((job) => sanitizeJobForViewer(job, env))
        .filter(Boolean),
      pagination
    };
  }

  function sanitizeDeliveryItemForViewer(item = {}) {
    if (!item?.id) return null;
    return {
      id: String(item.id || ''),
      ownerLogin: String(item.ownerLogin || ''),
      surface: String(item.surface || ''),
      itemType: String(item.itemType || ''),
      status: String(item.status || ''),
      title: String(item.title || ''),
      summary: String(item.summary || ''),
      body: String(item.body || ''),
      metadata: item.metadata && typeof item.metadata === 'object' ? item.metadata : {},
      source: item.source && typeof item.source === 'object' ? item.source : {},
      jobId: String(item.jobId || ''),
      workflowParentId: String(item.workflowParentId || ''),
      workflowTask: String(item.workflowTask || ''),
      workflowAgentName: String(item.workflowAgentName || ''),
      createdAt: String(item.createdAt || ''),
      updatedAt: String(item.updatedAt || '')
    };
  }

  async function visibleDeliveryItemsForRequestFast(storage, current, env, request = null) {
    const url = new URL(request?.url || 'https://example.test/');
    const limit = Math.max(1, Math.min(200, Number(url.searchParams.get('limit') || 100) || 100));
    const surface = String(url.searchParams.get('surface') || '').trim().toLowerCase();
    const jobId = String(url.searchParams.get('job_id') || url.searchParams.get('order_id') || '').trim();
    const ownerLogins = identityLoginsForCurrent(current);
    const admin = canViewAdminDashboard(current, env);
    if (typeof storage.listDeliveryItems === 'function') {
      const items = await storage.listDeliveryItems({ admin, ownerLogins, surface, jobId, limit });
      return {
        items: (Array.isArray(items) ? items : []).map(sanitizeDeliveryItemForViewer).filter(Boolean),
        pagination: { limit, offset: 0 }
      };
    }
    const state = await storage.getState();
    const visibleJobs = visibleJobsForRequest(state, current, env, request);
    const items = visibleJobs
      .flatMap((job) => Array.isArray(job?.deliveryItems) ? job.deliveryItems : [])
      .filter((item) => !surface || String(item?.surface || '').trim().toLowerCase() === surface)
      .filter((item) => !jobId || String(item?.jobId || '') === jobId || String(item?.workflowParentId || '') === jobId)
      .slice(0, limit);
    return { items: items.map(sanitizeDeliveryItemForViewer).filter(Boolean), pagination: { limit, offset: 0 } };
  }

  function visibleBillingAuditsForRequest(state, current, env, jobs = null) {
    const visibleJobs = Array.isArray(jobs) ? jobs : visibleJobsForRequest(state, current, env);
    return billingAuditsForJobIds(state.events, visibleJobs.map((job) => job.id));
  }

  function canViewJobFromRequest(state, current, env, job, request = null) {
    const policy = runtimePolicy(env);
    if (policy.guestRunReadEnabled) return true;
    if (canViewAdminDashboard(current, env)) return true;
    return requesterOwnsJobForCurrent(job, current);
  }

  return {
    canViewJobFromRequest,
    jobListPaginationFromRequest,
    sanitizeDeliveryItemForViewer,
    sanitizeJobForViewer,
    visibleBillingAuditsForRequest,
    visibleDeliveryItemsForRequestFast,
    visibleEventsForRequest,
    visibleJobsForRequest,
    visibleJobsForRequestFast
  };
}
