export function createRecurringOrderSweep({
  currentFromRecurringOrder,
  dueRecurringOrders,
  executeScheduledExactConnectorAction,
  handleCreateWorkflowJob,
  markRecurringOrderRunInState,
  maybeRefineWorkflowPlanWithLeaderLlm,
  normalizeBaseUrl,
  normalizeOrderStrategy,
  nowIso,
  performSingleJobCreate,
  promptInjectionGuardForPrompt,
  promptPolicyBlockPayload,
  recurringOrderToJobPayload,
  resolveOrderStrategy,
  touchEvent
}) {
  async function runRecurringOrderSweep(storage, env, options = {}) {
    const at = options.at || nowIso();
    const state = await storage.getState();
    const due = dueRecurringOrders(state, at, options.limit || 10);
    const results = [];
    const base = normalizeBaseUrl(env?.PRIMARY_BASE_URL || env?.BASE_URL) || 'https://aiagent-marketplace.net';
    const request = options.request || new Request(`${base}/api/recurring-orders/sweep`, { method: 'POST' });
    for (const order of due) {
      const latestState = await storage.getState();
      const fresh = (latestState.recurringOrders || []).find((item) => item.id === order.id) || order;
      const current = currentFromRecurringOrder(latestState, fresh);
      let result;
      const exactConnectorResult = await executeScheduledExactConnectorAction(storage, env, fresh, current);
      if (exactConnectorResult) {
        result = exactConnectorResult;
      } else {
        const body = recurringOrderToJobPayload(fresh);
        const promptInjection = promptInjectionGuardForPrompt(body.prompt || '');
        if (promptInjection.blocked) {
          result = {
            ...promptPolicyBlockPayload(promptInjection),
            statusCode: 400
          };
        } else {
          const requestedStrategy = normalizeOrderStrategy(body.order_strategy || body.orderStrategy || 'auto');
          let resolved = resolveOrderStrategy(latestState.agents || [], body, requestedStrategy);
          resolved = await maybeRefineWorkflowPlanWithLeaderLlm(latestState.agents || [], body, resolved, env, { recurring: true });
          result = resolved.error
            ? {
                error: resolved.error,
                code: resolved.code || 'leader_planner_unavailable',
                planner_error: resolved.planner_error || null,
                statusCode: resolved.statusCode || 503,
                status: 'failed'
              }
            : resolved.strategy === 'multi'
              ? await handleCreateWorkflowJob(storage, request, env, current, body, { workflowPlan: resolved.plan, initialState: latestState })
              : await performSingleJobCreate(storage, env, current, body, { request });
          if (!result.error) {
            result.order_strategy_requested = requestedStrategy;
            result.order_strategy_resolved = resolved.strategy;
            result.routing_reason = resolved.reason;
          }
        }
      }
      let updated = null;
      await storage.mutate(async (draft) => {
        updated = markRecurringOrderRunInState(draft, fresh.id, result, { at: nowIso() });
      });
      const summary = {
        recurring_order_id: fresh.id,
        job_id: result.job_id || null,
        workflow_job_id: result.workflow_job_id || null,
        status: result.status || result.mode || (result.error ? 'failed' : 'created'),
        error: result.error || null,
        next_run_at: updated?.nextRunAt || null
      };
      results.push(summary);
      await touchEvent(storage, 'RECURRING', `scheduled work ${fresh.id.slice(0, 12)} run ${summary.status}`, summary);
    }
    return { ok: true, checked_at: at, due_count: due.length, results };
  }

  return Object.freeze({ runRecurringOrderSweep });
}
