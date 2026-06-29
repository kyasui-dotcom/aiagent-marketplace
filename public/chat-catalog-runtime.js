export function createChatCatalogRuntime(options = {}) {
  const state = options.state && typeof options.state === 'object' ? options.state : {};
  const api = typeof options.api === 'function' ? options.api : (() => Promise.reject(new Error('api helper is required.')));
  const normalizeUsageId = typeof options.normalizeUsageId === 'function' ? options.normalizeUsageId : ((value = '') => String(value || '').trim().toLowerCase());
  const isCoreFeatureAppId = typeof options.isCoreFeatureAppId === 'function' ? options.isCoreFeatureAppId : (() => false);
  const orderRuntimeRecentJobsApiPath = typeof options.orderRuntimeRecentJobsApiPath === 'function' ? options.orderRuntimeRecentJobsApiPath : (() => '/api/jobs/recent');
  const visibleJobApiPath = typeof options.visibleJobApiPath === 'function' ? options.visibleJobApiPath : ((jobId = '') => `/api/jobs/${encodeURIComponent(jobId)}`);
  const orderRuntimeCachedJob = typeof options.orderRuntimeCachedJob === 'function' ? options.orderRuntimeCachedJob : (() => null);
  const orderRuntimeUpsertRecentJob = typeof options.orderRuntimeUpsertRecentJob === 'function' ? options.orderRuntimeUpsertRecentJob : ((jobs = [], job = {}) => [job, ...(Array.isArray(jobs) ? jobs : [])]);
  const rememberAiAgentsFromJob = typeof options.rememberAiAgentsFromJob === 'function' ? options.rememberAiAgentsFromJob : (() => {});
  const getVisitorId = typeof options.getVisitorId === 'function' ? options.getVisitorId : (() => state.visitorId);
  const catalogCacheTtlMs = Math.max(1, Number(options.catalogCacheTtlMs || 60000));
  const catalogPageSize = Math.max(1, Number(options.catalogPageSize || 10));
  const locationOrigin = () => options.window?.location?.origin || window.location.origin;

  function catalogCacheFresh(fetchedAt = 0) {
    const timestamp = Number(fetchedAt || 0);
    return timestamp > 0 && Date.now() - timestamp < catalogCacheTtlMs;
  }

  function catalogApiPath(path = '', catalogOptions = {}) {
    const url = new URL(path, locationOrigin());
    const requestedLimit = Number(catalogOptions.limit || catalogPageSize);
    const requestedOffset = Number(catalogOptions.offset || 0);
    const limit = Number.isFinite(requestedLimit) ? Math.max(1, requestedLimit) : catalogPageSize;
    const offset = Number.isFinite(requestedOffset) ? Math.max(0, requestedOffset) : 0;
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('offset', String(offset));
    return `${url.pathname}${url.search}`;
  }

  function mergeCatalogById(existing = [], incoming = []) {
    const byId = new Map();
    for (const item of [...(Array.isArray(existing) ? existing : []), ...(Array.isArray(incoming) ? incoming : [])]) {
      const id = normalizeUsageId(item?.id || item?.name);
      if (!id) continue;
      byId.set(id, { ...(byId.get(id) || {}), ...item });
    }
    return [...byId.values()];
  }

  async function refreshRegisteredApps(refreshOptions = {}) {
    const force = refreshOptions.force === true;
    const offset = Math.max(0, Number(refreshOptions.offset || 0));
    const append = refreshOptions.append === true || offset > 0;
    if (!force && !append && catalogCacheFresh(state.registeredAppsFetchedAt)) return state.registeredApps;
    if (state.registeredAppsRequest) return state.registeredAppsRequest;
    state.registeredAppsRequest = api(catalogApiPath('/api/apps', refreshOptions), { method: 'GET' })
      .then((result) => {
        const apps = (Array.isArray(result?.apps) ? result.apps : []).filter((app) => !isCoreFeatureAppId(app?.id));
        state.registeredApps = append ? mergeCatalogById(state.registeredApps, apps) : apps;
        state.registeredAppsTotal = Math.max(state.registeredApps.length, Number(result?.total || 0));
        const nextOffset = Number(result?.offset ?? offset) + apps.length;
        state.registeredAppsHasMore = Boolean(result?.hasMore ?? (state.registeredAppsTotal > nextOffset));
        state.registeredAppsFetchedAt = Date.now();
        return state.registeredApps;
      })
      .finally(() => {
        state.registeredAppsRequest = null;
      });
    return state.registeredAppsRequest;
  }

  async function refreshAppContexts(refreshOptions = {}) {
    const force = refreshOptions.force === true;
    const limit = Math.max(1, Math.min(50, Number(refreshOptions.limit || 10) || 10));
    if (!force && catalogCacheFresh(state.appContextsFetchedAt)) return state.appContexts;
    if (state.appContextsRequest) return state.appContextsRequest;
    const url = new URL('/api/app-contexts', locationOrigin());
    url.searchParams.set('limit', String(limit));
    state.appContextsRequest = api(`${url.pathname}${url.search}`, { method: 'GET' })
      .then((result) => {
        const contexts = Array.isArray(result?.app_contexts) ? result.app_contexts : [];
        state.appContexts = contexts;
        state.appContextsFetchedAt = Date.now();
        return state.appContexts;
      })
      .finally(() => {
        state.appContextsRequest = null;
      });
    return state.appContextsRequest;
  }

  async function fetchAppContext(contextId = '') {
    const id = String(contextId || '').trim();
    if (!id) throw new Error('App context id is required.');
    const result = await api(`/api/app-contexts/${encodeURIComponent(id)}`, { method: 'GET' });
    const context = result?.app_context?.context;
    if (!context || typeof context !== 'object') throw new Error('App context response did not include a context payload.');
    return context;
  }

  function recentJobsApiPath(recentOptions = {}) {
    return orderRuntimeRecentJobsApiPath({
      ...recentOptions,
      origin: locationOrigin(),
      visitorId: getVisitorId()
    });
  }

  async function refreshRecentJobs(refreshOptions = {}) {
    const force = refreshOptions.force === true;
    if (!force && catalogCacheFresh(state.recentJobsFetchedAt)) return state.recentJobs;
    if (state.recentJobsRequest) return state.recentJobsRequest;
    state.recentJobsRequest = api(recentJobsApiPath(refreshOptions), { method: 'GET' })
      .then((result) => {
        const jobs = Array.isArray(result?.jobs) ? result.jobs : [];
        state.recentJobs = jobs;
        state.recentJobsFetchedAt = Date.now();
        for (const job of jobs) rememberAiAgentsFromJob(job);
        return state.recentJobs;
      })
      .finally(() => {
        state.recentJobsRequest = null;
      });
    return state.recentJobsRequest;
  }

  async function fetchVisibleJob(jobId = '', fetchOptions = {}) {
    const safeId = String(jobId || '').trim();
    if (!safeId) return null;
    if (fetchOptions.force !== true) {
      const cached = orderRuntimeCachedJob(state.recentJobs, safeId);
      if (cached) return cached;
    }
    const result = await api(visibleJobApiPath(safeId, {
      ...fetchOptions,
      visitorId: getVisitorId()
    }), { method: 'GET' });
    const job = result?.job && typeof result.job === 'object' ? { ...result.job, id: result.job.id || safeId } : null;
    if (job?.id) {
      state.recentJobs = orderRuntimeUpsertRecentJob(state.recentJobs, job, 50);
      state.recentJobsFetchedAt = Date.now();
      rememberAiAgentsFromJob(job);
    }
    return job;
  }

  async function refreshRecurringOrders(refreshOptions = {}) {
    const force = refreshOptions.force === true;
    if (!force && catalogCacheFresh(state.recurringOrdersFetchedAt)) return state.recurringOrders;
    if (state.recurringOrdersRequest) return state.recurringOrdersRequest;
    state.recurringOrdersRequest = api('/api/recurring-orders', { method: 'GET' })
      .then((result) => {
        state.recurringOrders = Array.isArray(result?.recurring_orders) ? result.recurring_orders : [];
        state.recurringOrdersFetchedAt = Date.now();
        return state.recurringOrders;
      })
      .finally(() => {
        state.recurringOrdersRequest = null;
      });
    return state.recurringOrdersRequest;
  }

  async function refreshWorkerAgents(refreshOptions = {}) {
    const force = refreshOptions.force === true;
    const offset = Math.max(0, Number(refreshOptions.offset || 0));
    const append = refreshOptions.append === true || offset > 0;
    if (!force && !append && catalogCacheFresh(state.workerAgentsFetchedAt)) return state.workerAgents;
    if (state.workerAgentsRequest) return state.workerAgentsRequest;
    state.workerAgentsRequest = api(catalogApiPath('/api/agents', refreshOptions), { method: 'GET' })
      .then((result) => {
        const agents = Array.isArray(result?.agents) ? result.agents : [];
        state.workerAgents = append ? mergeCatalogById(state.workerAgents, agents) : agents;
        state.workerAgentsTotal = Math.max(state.workerAgents.length, Number(result?.total || 0));
        const nextOffset = Number(result?.offset ?? offset) + agents.length;
        state.workerAgentsHasMore = Boolean(result?.hasMore ?? (state.workerAgentsTotal > nextOffset));
        state.workerAgentsFetchedAt = Date.now();
        return state.workerAgents;
      })
      .finally(() => {
        state.workerAgentsRequest = null;
      });
    return state.workerAgentsRequest;
  }

  function warmUtilityCatalogs() {
    void refreshWorkerAgents().catch(() => {});
    void refreshRegisteredApps().catch(() => {});
    void refreshAppContexts().catch(() => {});
    void refreshRecentJobs().catch(() => {});
    void refreshRecurringOrders().catch(() => {});
  }

  return {
    fetchAppContext,
    fetchVisibleJob,
    recentJobsApiPath,
    refreshAppContexts,
    refreshRecentJobs,
    refreshRecurringOrders,
    refreshRegisteredApps,
    refreshWorkerAgents,
    warmUtilityCatalogs
  };
}
