export function createRecurringOrderRouteHandlers(deps = {}) {
  const {
    canViewAdminDashboard,
    createRecurringOrderInState,
    currentOrderRequesterContext,
    deleteRecurringOrderInState,
    identityLoginsForCurrent,
    json,
    parseBody,
    promptInjectionGuardForPrompt,
    promptPolicyBlockPayload,
    recordOrderApiKeyUsage,
    recurringOrdersVisibleToLogin,
    requireOrderWriteAccess,
    touchEvent,
    updateRecurringOrderInState
  } = deps;

  async function handleListRecurringOrders(storage, request, env) {
    const current = await currentOrderRequesterContext(storage, request, env, { lightweight: true });
    if (!current.user && current.apiKeyStatus === 'invalid') return json({ error: 'Invalid API key' }, 401);
    if (!current.user && current.apiKeyStatus !== 'valid') return json({ error: 'Login or CAIt API key required' }, 401);
    if (current.apiKey?.id) await recordOrderApiKeyUsage(storage, current, request);
    if (typeof storage.listRecurringOrders === 'function') {
      const recurringOrders = await storage.listRecurringOrders({
        admin: canViewAdminDashboard(current, env),
        ownerLogins: identityLoginsForCurrent(current),
        limit: 100
      });
      return json({ recurring_orders: recurringOrdersVisibleToLogin({ recurringOrders }, current.login) });
    }
    const state = await storage.getState();
    return json({ recurring_orders: recurringOrdersVisibleToLogin(state, current.login) });
  }

  async function handleCreateRecurringOrder(storage, request, env) {
    const current = await currentOrderRequesterContext(storage, request, env);
    const access = requireOrderWriteAccess(current, env);
    if (access.error) return json({ error: access.error }, access.statusCode || 400);
    const body = await parseBody(request).catch((error) => ({ __error: error.message }));
    if (body.__error) return json({ error: body.__error }, 400);
    const promptInjection = promptInjectionGuardForPrompt(body.prompt || '');
    if (promptInjection.blocked) {
      if (current.apiKey?.id) await recordOrderApiKeyUsage(storage, current, request);
      return json(promptPolicyBlockPayload(promptInjection), 400);
    }
    let result = null;
    await storage.mutate(async (draft) => {
      result = createRecurringOrderInState(draft, body, current);
    });
    if (result?.error) return json(result, result.statusCode || 400);
    await touchEvent(storage, 'RECURRING', `scheduled work ${result.recurringOrder.id.slice(0, 12)} created`, {
      recurringOrderId: result.recurringOrder.id,
      ownerLogin: current.login,
      interval: result.recurringOrder.schedule?.interval || 'daily',
      nextRunAt: result.recurringOrder.nextRunAt || null
    });
    if (current.apiKey?.id) await recordOrderApiKeyUsage(storage, current, request);
    return json({ ok: true, recurring_order: result.recurringOrder }, 201);
  }

  async function handleUpdateRecurringOrder(storage, request, env, recurringOrderId) {
    const current = await currentOrderRequesterContext(storage, request, env);
    const access = requireOrderWriteAccess(current, env);
    if (access.error) return json({ error: access.error }, access.statusCode || 400);
    const body = await parseBody(request).catch((error) => ({ __error: error.message }));
    if (body.__error) return json({ error: body.__error }, 400);
    const promptInjection = body.prompt !== undefined ? promptInjectionGuardForPrompt(body.prompt || '') : { blocked: false };
    if (promptInjection.blocked) {
      if (current.apiKey?.id) await recordOrderApiKeyUsage(storage, current, request);
      return json(promptPolicyBlockPayload(promptInjection), 400);
    }
    let result = null;
    await storage.mutate(async (draft) => {
      result = updateRecurringOrderInState(draft, recurringOrderId, body, current);
    });
    if (result?.error) return json(result, result.statusCode || 400);
    await touchEvent(storage, 'RECURRING', `scheduled work ${result.recurringOrder.id.slice(0, 12)} updated`, {
      recurringOrderId: result.recurringOrder.id,
      status: result.recurringOrder.status,
      nextRunAt: result.recurringOrder.nextRunAt || null
    });
    if (current.apiKey?.id) await recordOrderApiKeyUsage(storage, current, request);
    return json({ ok: true, recurring_order: result.recurringOrder });
  }

  async function handleDeleteRecurringOrder(storage, request, env, recurringOrderId) {
    const current = await currentOrderRequesterContext(storage, request, env);
    const access = requireOrderWriteAccess(current, env);
    if (access.error) return json({ error: access.error }, access.statusCode || 400);
    let result = null;
    await storage.mutate(async (draft) => {
      result = deleteRecurringOrderInState(draft, recurringOrderId, current);
    });
    if (result?.error) return json(result, result.statusCode || 400);
    await touchEvent(storage, 'RECURRING', `scheduled work ${result.recurringOrder.id.slice(0, 12)} cancelled (row retained)`, {
      recurringOrderId: result.recurringOrder.id,
      status: result.recurringOrder.status
    });
    if (current.apiKey?.id) await recordOrderApiKeyUsage(storage, current, request);
    return json({ ok: true, recurring_order: result.recurringOrder });
  }

  return {
    handleListRecurringOrders,
    handleCreateRecurringOrder,
    handleUpdateRecurringOrder,
    handleDeleteRecurringOrder
  };
}
