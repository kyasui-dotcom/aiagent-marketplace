function catalogPagination(url, defaultLimit = 10, maxLimit = 100) {
  const requestedLimit = Number(url.searchParams.get('limit') || defaultLimit);
  const requestedOffset = Number(url.searchParams.get('offset') || 0);
  const limit = Number.isFinite(requestedLimit) ? Math.min(maxLimit, Math.max(1, requestedLimit)) : defaultLimit;
  const offset = Number.isFinite(requestedOffset) ? Math.max(0, requestedOffset) : 0;
  return { limit, offset };
}

export function catalogPagePayload(items = [], url, key = 'items') {
  const list = Array.isArray(items) ? items : [];
  const { limit, offset } = catalogPagination(url);
  const page = list.slice(offset, offset + limit);
  return {
    [key]: page,
    total: list.length,
    limit,
    offset,
    hasMore: offset + page.length < list.length
  };
}

export function createCatalogRouteHandlers(deps = {}) {
  const {
    leaderReadableAgentCatalogIndex,
    nowIso,
    publicAgent,
    publicApp
  } = deps;

  async function agentsCatalogPayload(storage, request) {
    const url = new URL(request.url);
    let agents;
    if (typeof storage.listAgents === 'function') {
      const catalog = await storage.listAgents({ limit: 500 });
      agents = (Array.isArray(catalog) ? catalog : []).map((agent) => publicAgent(agent, catalog)).filter(Boolean);
    } else {
      const state = await storage.getState();
      agents = (Array.isArray(state.agents) ? state.agents : []).map((agent) => publicAgent(agent, state.agents)).filter(Boolean);
    }
    return catalogPagePayload(agents, url, 'agents');
  }

  async function agentCatalogIndexPayload(storage, request) {
    const url = new URL(request.url);
    let agents = [];
    if (typeof storage.listAgents === 'function') {
      agents = await storage.listAgents({ limit: 1000 });
    } else {
      const state = await storage.getState();
      agents = Array.isArray(state.agents) ? state.agents : [];
    }
    const catalogIndex = leaderReadableAgentCatalogIndex({ agents, includeInternal: true });
    return {
      ...catalogPagePayload(catalogIndex, url, 'agent_catalog'),
      // Compatibility for older clients. This is a read-only candidate catalog, not an orchestration-owned selection decision.
      selection_index: catalogPagePayload(catalogIndex, url, 'selection_index').selection_index,
      generatedAt: nowIso(),
      source: 'live_agent_state'
    };
  }

  async function appsCatalogPayload(storage, request) {
    const url = new URL(request.url);
    let apps;
    if (typeof storage.listApps === 'function') {
      apps = (await storage.listApps({ limit: 500 })).map((app) => publicApp(app)).filter(Boolean);
    } else {
      const state = await storage.getState();
      apps = (Array.isArray(state.apps) ? state.apps : []).map((app) => publicApp(app)).filter(Boolean);
    }
    return catalogPagePayload(apps, url, 'apps');
  }

  return {
    agentCatalogIndexPayload,
    agentsCatalogPayload,
    appsCatalogPayload
  };
}
