import {
  sanitizeExactMatchActionPatch,
  sanitizeExactMatchActionsForClient
} from '../exact-actions.js';

export function createExactActionRouteHandlers(deps = {}) {
  const {
    canViewAdminDashboard,
    currentUserContext,
    nowIso,
    parseBody
  } = deps;

  async function getExactMatchActions(storage, request, env) {
    const current = await currentUserContext(request, env);
    if (!canViewAdminDashboard(current, env)) return { error: 'Admin access required', statusCode: 403 };
    const state = await storage.getState();
    return { actions: sanitizeExactMatchActionsForClient(state.exactMatchActions || []) };
  }

  async function saveExactMatchAction(storage, request, env) {
    const current = await currentUserContext(request, env);
    if (!canViewAdminDashboard(current, env)) return { error: 'Admin access required', statusCode: 403 };
    let body;
    try {
      body = await parseBody(request);
    } catch (error) {
      return { error: error.message, statusCode: 400 };
    }
    const patch = sanitizeExactMatchActionPatch(body || {});
    if (patch.error) return { error: patch.error, statusCode: 400 };
    await storage.mutate(async (draft) => {
      const existing = Array.isArray(draft.exactMatchActions) ? draft.exactMatchActions : [];
      const next = [...existing];
      const matchIndex = next.findIndex((item) => String(item?.id || '').trim() === patch.id);
      const merged = {
        ...(matchIndex >= 0 ? next[matchIndex] : {}),
        ...patch,
        createdAt: matchIndex >= 0 ? (next[matchIndex]?.createdAt || nowIso()) : nowIso(),
        updatedAt: nowIso()
      };
      if (matchIndex >= 0) next[matchIndex] = merged;
      else next.push(merged);
      draft.exactMatchActions = next;
    });
    const state = await storage.getState();
    return { actions: sanitizeExactMatchActionsForClient(state.exactMatchActions || []) };
  }

  async function deleteExactMatchAction(storage, request, env, actionId) {
    const current = await currentUserContext(request, env);
    if (!canViewAdminDashboard(current, env)) return { error: 'Admin access required', statusCode: 403 };
    const targetId = String(actionId || '').trim();
    if (!targetId) return { error: 'Action id is required', statusCode: 400 };
    await storage.mutate(async (draft) => {
      const actions = Array.isArray(draft.exactMatchActions) ? draft.exactMatchActions : [];
      const index = actions.findIndex((item) => String(item?.id || '').trim() === targetId);
      if (index >= 0) {
        actions[index] = {
          ...actions[index],
          enabled: false,
          disabledAt: actions[index].disabledAt || nowIso(),
          updatedAt: nowIso()
        };
      }
      draft.exactMatchActions = actions;
    });
    const state = await storage.getState();
    return { ok: true, actions: sanitizeExactMatchActionsForClient(state.exactMatchActions || []) };
  }

  return {
    deleteExactMatchAction,
    getExactMatchActions,
    saveExactMatchAction
  };
}
