import { createOrderSingleJobCreateHandlers } from './order-create-single.js';
import { createOrderCreateWorkflowHandler } from './order-create-workflow.js';
import {
  chatSessionMemoryResponseMeta,
  persistApiChatSessionTurn,
  prepareApiChatSessionBody
} from '../api-chat-session-context.js';

export function createOrderCreateHandlers(deps = {}) {
  const {
    applyActiveConversationOwnerLockToOrderBody,
    clientOrderIdFromCreateBody,
    createJobResponseFromPersistedJob,
    currentOrderRequesterContext,
    inferTaskType,
    isWorkflowLeaderTask,
    jobRequesterMatchesCurrent,
    json,
    maybeRefineWorkflowPlanWithLeaderLlm,
    normalizeOrderStrategy,
    normalizeTaskTypes,
    orderBodyWithLeaderFollowupSpecialistRouting,
    orderCreateSkipIntake,
    orderCreateSkipPrePersistencePlanning,
    orderStrategyWithFollowupContext,
    parseBody,
    persistedJobForClientOrderId,
    prepareGuestTrialOrderContext,
    promptInjectionGuardForPrompt,
    promptPolicyBlockPayload,
    recordOrderApiKeyUsage,
    requestedFollowupJobIdFromCreateBody,
    requireOrderWriteAccess,
    resolveOrderStrategy
  } = deps;

  const {
    performSingleJobCreate,
    loadOrderCreatePlanningState,
    recoverCreateJobException
  } = createOrderSingleJobCreateHandlers(deps);
  const { handleCreateWorkflowJob } = createOrderCreateWorkflowHandler(deps);



  async function handleCreateJob(storage, request, env, ctx = null) {
    let current = null;
    let body;
    try {
      body = await parseBody(request);
    } catch (error) {
      return json({ error: error.message }, 400);
    }
    body = applyActiveConversationOwnerLockToOrderBody(body);
    let chatSessionContext = null;
    try {
      current = await currentOrderRequesterContext(storage, request, env, { lightweight: true });
      const chatSessionPrepared = await prepareApiChatSessionBody(storage, current, body, { mode: 'jobs' });
      body = chatSessionPrepared.body;
      chatSessionContext = chatSessionPrepared.context;
      const touchUsage = async () => {
        if (current.apiKey?.id) await recordOrderApiKeyUsage(storage, current, request);
      };
      if (!body.parent_agent_id || !body.prompt) {
        return json({ error: 'parent_agent_id and prompt required' }, 400);
      }
      const promptInjection = promptInjectionGuardForPrompt(body.prompt);
      if (promptInjection.blocked) {
        await touchUsage();
        return json(promptPolicyBlockPayload(promptInjection), 400);
      }
      const requestedStrategy = normalizeOrderStrategy(body.order_strategy || body.orderStrategy || body.execution_mode || body.executionMode);
      const asyncDispatch = body.async_dispatch === true || body.asyncDispatch === true || body.respond_async === true || body.respondAsync === true;
      const clientOrderId = clientOrderIdFromCreateBody(body);
      const requestedTaskForRouting = normalizeTaskTypes([body.task_type])[0] || inferTaskType(body.task_type, body.prompt);
      const requestedLeaderSingle = requestedStrategy === 'single' && isWorkflowLeaderTask(requestedTaskForRouting);
      const state = requestedStrategy !== 'single' || clientOrderId || requestedFollowupJobIdFromCreateBody(body) || requestedLeaderSingle
        ? await loadOrderCreatePlanningState(storage, current, body)
        : null;
      if (clientOrderId && state) {
        const existingClientOrder = persistedJobForClientOrderId(state, body);
        if (existingClientOrder?.id) {
          if (!jobRequesterMatchesCurrent(existingClientOrder, current)) {
            await touchUsage();
            return json({
              error: 'Client order id is already used by another requester.',
              code: 'client_order_id_conflict'
            }, 409);
          }
          await touchUsage();
          return json(createJobResponseFromPersistedJob(existingClientOrder, {
            idempotent: true,
            code: 'order_create_idempotent'
          }), 202);
        }
      }
      body = orderBodyWithLeaderFollowupSpecialistRouting(state || {}, body);
      const effectiveRequestedStrategy = orderStrategyWithFollowupContext(requestedStrategy, state || {}, body);
      let resolved = resolveOrderStrategy(state?.agents || [], body, effectiveRequestedStrategy);
      if (!orderCreateSkipPrePersistencePlanning(body)) {
        resolved = await maybeRefineWorkflowPlanWithLeaderLlm(state?.agents || [], body, resolved, env);
      }
      if (resolved?.error) {
        await touchUsage();
        return json({
          error: resolved.error,
          code: resolved.code || 'leader_planner_unavailable',
          planner_error: resolved.planner_error || null,
          routing_reason: resolved.reason,
          routing_planned_task_types: resolved.plan?.plannedTasks || []
        }, resolved.statusCode || 503);
      }
      const guestPrepared = await prepareGuestTrialOrderContext(storage, current, body, resolved);
      if (guestPrepared.error) return json(guestPrepared, guestPrepared.statusCode || 400);
      current = guestPrepared.current;
      body = guestPrepared.body;
      const access = requireOrderWriteAccess(current, env);
      if (access.error) return json({ error: access.error }, access.statusCode || 400);
      const waitUntil = ctx && typeof ctx.waitUntil === 'function'
        ? (promise) => ctx.waitUntil(promise)
        : null;
      const result = resolved.strategy === 'multi'
        ? await handleCreateWorkflowJob(storage, request, env, current, body, { touchUsage, workflowPlan: resolved.plan, asyncDispatch, waitUntil, initialState: state, skipIntake: orderCreateSkipIntake(body) })
        : await performSingleJobCreate(storage, env, current, body, { touchUsage, request, asyncDispatch, waitUntil, initialState: state, skipIntake: orderCreateSkipIntake(body) });
      if (result?.error) return json(result, result.statusCode || 400);
      result.order_strategy_requested = requestedStrategy;
      result.order_strategy_resolved = resolved.strategy;
      result.routing_reason = resolved.reason;
      if (resolved.plan?.plannedTasks) result.routing_planned_task_types = resolved.plan.plannedTasks;
      const persistedSession = await persistApiChatSessionTurn(storage, current, body, result, chatSessionContext, { mode: 'jobs' });
      const chatSessionMeta = chatSessionMemoryResponseMeta(chatSessionContext || {}, persistedSession);
      if (chatSessionMeta) result.chat_session_memory = chatSessionMeta;
      return json(result, result.statusCode || 201);
    } catch (error) {
      return recoverCreateJobException(storage, current || {}, body, error);
    }
  }

  return {
    handleCreateJob,
    handleCreateWorkflowJob,
    performSingleJobCreate
  };
}
