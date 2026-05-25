import { buildMcpDiscovery, handleMcpJsonRpc } from '../mcp.js';

export function createMcpRouteHandlers(deps = {}) {
  const {
    parseBody,
    publicAgent,
    publicApp,
    runtimePolicy
  } = deps;

  function mcpDisabledPayload() {
    return {
      ok: false,
      disabled: true,
      code: 'mcp_disabled',
      error: 'CAIt MCP is temporarily disabled while the external contract is stabilized.'
    };
  }

  function mcpEnabled(env) {
    return Boolean(runtimePolicy(env).mcpEnabled);
  }

  async function mcpCatalogForPublicRequest(storage) {
    if (typeof storage.listAgents === 'function' && typeof storage.listApps === 'function') {
      const [agents, apps] = await Promise.all([
        storage.listAgents({ limit: 500 }),
        storage.listApps({ limit: 500 })
      ]);
      return {
        apps: (Array.isArray(apps) ? apps : []).map((app) => publicApp(app)).filter(Boolean),
        agents: (Array.isArray(agents) ? agents : []).map((agent) => publicAgent(agent, agents)).filter(Boolean)
      };
    }
    const state = await storage.getState();
    return {
      apps: (Array.isArray(state.apps) ? state.apps : []).map((app) => publicApp(app)).filter(Boolean),
      agents: (Array.isArray(state.agents) ? state.agents : []).map((agent) => publicAgent(agent, state.agents)).filter(Boolean)
    };
  }

  function getMcpDiscoveryPayload(request, env) {
    if (!mcpEnabled(env)) return mcpDisabledPayload();
    return buildMcpDiscovery(request.url);
  }

  async function handleMcpRequest(storage, request, env) {
    if (!mcpEnabled(env)) return { error: 'CAIt MCP is temporarily disabled while the external contract is stabilized.', code: 'mcp_disabled', statusCode: 503, payload: mcpDisabledPayload() };
    let body;
    try {
      body = await parseBody(request);
    } catch (error) {
      return { error: error.message, statusCode: 400 };
    }
    const payload = handleMcpJsonRpc(body, await mcpCatalogForPublicRequest(storage), {
      requestUrl: request.url,
      version: String(env?.APP_VERSION || '0.2.0')
    });
    return { payload: payload || { ok: true } };
  }

  return {
    getMcpDiscoveryPayload,
    handleMcpRequest,
    mcpDisabledPayload,
    mcpEnabled,
    mcpCatalogForPublicRequest
  };
}
