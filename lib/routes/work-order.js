import {
  chatSessionMemoryResponseMeta,
  persistApiChatSessionTurn,
  prepareApiChatSessionBody
} from '../api-chat-session-context.js';

export function createWorkOrderRouteHandlers(deps = {}) {
  const {
    accountSettingsForLogin,
    authorizeOpenChatIntentLlm,
    buildIntakeClarification,
    buildIntakeClarificationWithAi,
    buildOpenChatRuntimeContextMarkdown,
    classifyOpenChatIntent,
    currentOrderRequesterContext,
    currentUserContext,
    inferTaskType,
    isAutoWorkflowSpecialtyTask,
    isDeveloperExecutionIntentText,
    lazyAppSettingsMap,
    lazyOpenChatRuntimeState,
    leaderTaskTypeForInitialWork,
    normalizeOrderStrategy,
    openChatIntentEnvValue,
    openChatIntentLanguage,
    optimizeOrderPromptForBroker,
    orderBodyWithLeaderFollowupSpecialistRouting,
    orderPreflightForAgent,
    orderStrategyWithFollowupContext,
    orderUiLabelsFromAppSettings,
    parseBody,
    assignAgentForTask,
    promptInjectionGuardForPrompt,
    promptPolicyBlockPayload,
    resolveOrderStrategy,
    resolveStaticWorkAction,
    sampleAgentDefinitionForKind,
    selectedAgentIdFromOrderBody,
    selectedAgentNameFromOrderBody,
    selectedAgentTaskTypeFromOrderBody
  } = deps;

  function workIntentNormalizeText(value = '') {
    return String(value || '').trim().toLowerCase();
  }

  function workIntentLeaderLabel(taskType = '') {
    const token = String(taskType || '').trim().toLowerCase();
    if (!token) return 'Leader';
    const parts = token.replace(/_leader$/, '').split(/[_\s-]+/).filter(Boolean);
    const label = parts
      .map((part) => part.length <= 3 ? part.toUpperCase() : `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
      .join(' ');
    return label ? `${label} Leader` : 'Leader';
  }

  function workIntentRouteForLeader(taskType = '', reason = '') {
    const task = String(taskType || '').trim().toLowerCase();
    if (!task || !task.endsWith('_leader')) return null;
    const label = workIntentLeaderLabel(task);
    return {
      taskType: task,
      strategyHint: 'multi',
      routeHint: 'leader_handoff',
      ownerType: 'leader',
      activeLeaderTaskType: task,
      activeLeaderName: label,
      conversationOwner: {
        type: 'leader',
        taskType: task,
        label,
        reason: reason || 'CAIt selected a leader from the agent definition because this request needs cross-agent intake, research, planning, approval, or app handoff.'
      },
      reason: reason || 'CAIt selected a leader from the agent definition because this request needs cross-agent intake, research, planning, approval, or app handoff.'
    };
  }

  function workIntentAgentLabel(taskType = '') {
    const task = workIntentNormalizeText(taskType);
    const definition = task ? sampleAgentDefinitionForKind(task) : null;
    const manifest = definition?.manifest && typeof definition.manifest === 'object' ? definition.manifest : {};
    const label = String(manifest.name || manifest.label || manifest.title || '').trim();
    if (label) return label;
    return task
      ? task.split(/[_\s-]+/).filter(Boolean).map((part) => part.length <= 3 ? part.toUpperCase() : `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`).join(' ')
      : 'Agent';
  }

  function workIntentRouteForAgent(taskType = '', reason = '') {
    const task = workIntentNormalizeText(taskType) || 'research';
    if (task.endsWith('_leader')) return workIntentRouteForLeader(task, reason);
    const label = workIntentAgentLabel(task);
    return {
      taskType: task,
      strategyHint: 'single',
      routeHint: 'agent_chat',
      ownerType: 'agent',
      activeLeaderTaskType: '',
      activeLeaderName: '',
      activeOwnerType: 'agent',
      activeOwnerTaskType: task,
      activeOwnerName: label,
      conversationOwner: {
        type: 'agent',
        taskType: task,
        label,
        reason: reason || 'CAIt handed this chat to the matching agent so the user can continue intake, drafting, and revisions with that agent.'
      },
      reason: reason || 'CAIt handed this chat to the matching agent so the user can continue intake, drafting, and revisions with that agent.'
    };
  }

  function inferWorkIntentRouteFromDefinitions(prompt = '', options = {}) {
    const explicitTaskType = workIntentNormalizeText(options.taskType || options.task_type || options.selectedTaskType || '');
    const inferredTaskType = explicitTaskType || inferTaskType('', prompt);
    const leaderTaskType = leaderTaskTypeForInitialWork(inferredTaskType, prompt);
    if (leaderTaskType) {
      return workIntentRouteForLeader(
        leaderTaskType,
        'CAIt handed this chat to the matching leader definition because the intent is broad enough to need intake, research, planning, approval, and specialist/app orchestration.'
      );
    }
    return workIntentRouteForAgent(
      inferredTaskType,
      'CAIt handed this chat to the matching agent definition so the user can discuss details and iterate in the same agent context.'
    );
  }

  function prepareWorkOrderSeed(prompt = '', requestedStrategy = 'auto', options = {}) {
    const explicitTaskType = workIntentNormalizeText(options.taskType || options.task_type || options.selectedTaskType || '');
    const selectedAgentId = workIntentNormalizeText(options.selectedAgentId || options.selected_agent_id || '');
    const selectedWorker = Boolean(selectedAgentId && explicitTaskType);
    const selectedLeaderTaskType = selectedWorker ? leaderTaskTypeForInitialWork(explicitTaskType, prompt) : '';
    const route = selectedWorker && !selectedLeaderTaskType
      ? {
          ...workIntentRouteForAgent(explicitTaskType, `Selected worker ${selectedAgentId} for task ${explicitTaskType}; preserving that agent route for intake and dispatch.`),
          routeHint: 'selected_worker'
        }
      : inferWorkIntentRouteFromDefinitions(prompt, { taskType: explicitTaskType });
    const requested = ['single', 'multi'].includes(String(requestedStrategy || '').trim().toLowerCase())
      ? String(requestedStrategy || '').trim().toLowerCase()
      : 'auto';
    let resolvedOrderStrategy = route.strategyHint || 'single';
    if (requested === 'multi') resolvedOrderStrategy = 'multi';
    if (requested === 'single' && route.ownerType !== 'leader') resolvedOrderStrategy = 'single';
    if (route.ownerType === 'leader') resolvedOrderStrategy = 'multi';
    return {
      taskType: route.taskType,
      requestedOrderStrategy: requested,
      resolvedOrderStrategy,
      routeHint: route.routeHint,
      reason: route.reason,
      ownerType: route.ownerType || 'cait',
      activeLeaderTaskType: route.activeLeaderTaskType || '',
      activeLeaderName: route.activeLeaderName || '',
      activeOwnerType: route.activeOwnerType || route.ownerType || '',
      activeOwnerTaskType: route.activeOwnerTaskType || (route.ownerType === 'leader' ? route.activeLeaderTaskType : ''),
      activeOwnerName: route.activeOwnerName || (route.ownerType === 'leader' ? route.activeLeaderName : ''),
      activeOwnerLocked: route.ownerType === 'agent' || route.ownerType === 'leader',
      conversationOwner: route.conversationOwner || { type: 'cait', label: 'CAIt' }
    };
  }

  function preparedOrderBriefFromServerContract(prompt = '', prepared = {}, body = {}) {
    if (typeof optimizeOrderPromptForBroker !== 'function') return String(prompt || '').trim();
    const taskType = prepared.taskType || body.task_type || body.taskType || 'research';
    const optimized = optimizeOrderPromptForBroker({
      ...body,
      prompt,
      task_type: taskType
    }, { taskType });
    return String(optimized?.prompt || prompt || '').trim();
  }

  function withPreparedOrderBrief(payload = {}, prompt = '', prepared = {}, body = {}) {
    const orderBrief = preparedOrderBriefFromServerContract(prompt, prepared, body);
    return {
      ...payload,
      order_brief: orderBrief,
      orderBrief
    };
  }

  function isNonOrderConversationIntentText(prompt = '') {
    const raw = String(prompt || '').replace(/\s+/g, ' ').trim();
    const text = workIntentNormalizeText(raw).replace(/[?？!！。.,、\s]+$/g, '').trim();
    if (!text) return false;
    const deliveryTarget = /(?:\b(?:orders?|order history|deliver(?:y|ies|able|ables)|results?|completed|complete|done|finished)\b|注文|注文履歴|納品|納品物|成果物|履歴|結果|完了|完了済)/i.test(text);
    const deliveryView = /(?:見る|見たい|見せ|表示|出して|確認|開く|開いて|一覧|リスト|探|show|view|open|list|display|inspect|review)/i.test(raw);
    const deliveryCreate = /(?:作って|作成|生成|改善|書いて|発注|注文して|実行|調べて|分析して|\b(?:create|build|write|draft|prepare|run|execute|research|analy[sz]e|improve)\b)/i.test(raw);
    if (deliveryTarget && deliveryView && !deliveryCreate) return true;
    if (/^(pause|hold|stop|later|not now|cancel|status|help|what now|where are we|continue chatting)$/i.test(text)) return true;
    if (/^(一旦保留|いったん保留|保留|あとで|後で|また後で|ストップ|止めて|中断|キャンセル|やめる|やっぱやめる|今はやめる|状況|現状|今どこ|何待ち|ヘルプ|相談だけ)$/i.test(text)) return true;
    if (/^(pause|hold|stop|later|not now|cancel)\s*(please|pls)?$/i.test(text)) return true;
    if (/^(いや|いえ|no|nope|nah)[、。,.!\s-]*(pause|hold|stop|later|not now|cancel|保留|あとで|後で|やめる|中断)$/i.test(text)) return true;
    return false;
  }

  async function resolveWorkActionRequest(storage, request) {
    let body;
    try {
      body = await parseBody(request);
    } catch (error) {
      return { error: error.message, statusCode: 400 };
    }
    body = applyActiveConversationOwnerLockToOrderBody(body);
    const prompt = String(body?.prompt || '').trim();
    if (!prompt) return { ok: true, action: '', source: 'empty' };
    if (isDeveloperExecutionIntentText(prompt)) {
      return { ok: true, action: '', source: 'developer_execution_intent' };
    }
    const state = await storage.getState();
    const action = resolveStaticWorkAction(prompt, { exactActions: state.exactMatchActions || [] }) || '';
    return {
      ok: true,
      prompt,
      action,
      source: action ? 'shared_registry' : 'none'
    };
  }

  async function resolveWorkIntentRequest(storage, request) {
    let body;
    try {
      body = await parseBody(request);
    } catch (error) {
      return { error: error.message, statusCode: 400 };
    }
    const prompt = String(body?.prompt || '').trim();
    if (!prompt) return { ok: true, kind: 'empty', action: '', source: 'empty' };
    const promptInjection = promptInjectionGuardForPrompt(prompt);
    if (promptInjection.blocked) return { ...promptPolicyBlockPayload(promptInjection), statusCode: 400 };
    if (isNonOrderConversationIntentText(prompt)) {
      return { ok: true, kind: 'chat', action: 'answer_in_chat', source: 'non_order_conversation', prompt };
    }
    if (isDeveloperExecutionIntentText(prompt)) {
      const route = inferWorkIntentRouteFromDefinitions(prompt);
      return {
        ok: true,
        kind: 'order',
        action: '',
        source: 'developer_execution_intent',
        taskType: route.taskType,
        strategyHint: route.strategyHint,
        routeHint: route.routeHint,
        reason: route.reason
      };
    }
    const state = await storage.getState();
    const action = resolveStaticWorkAction(prompt, { exactActions: state.exactMatchActions || [] }) || '';
    const route = action ? null : inferWorkIntentRouteFromDefinitions(prompt);
    return {
      ok: true,
      kind: action ? 'command' : 'order',
      action,
      prompt,
      source: action ? 'shared_registry' : 'none',
      taskType: route?.taskType || '',
      strategyHint: route?.strategyHint || '',
      routeHint: route?.routeHint || '',
      reason: route?.reason || ''
    };
  }

  function serverStructuredOrderBriefParts(value = '') {
    const text = String(value || '').replace(/\r\n/g, '\n').trim();
    const pick = (label) => {
      const pattern = new RegExp(`(?:^|\\n)\\s*${label}:\\s*([\\s\\S]*?)(?=\\n\\s*(?:Task|Goal|Work split|Inputs|Constraints|Deliver|Output language|Acceptance):|$)`, 'i');
      return String(text.match(pattern)?.[1] || '').trim();
    };
    return {
      taskType: pick('Task').toLowerCase().replace(/[^a-z0-9_ -]+/g, '').replace(/\s+/g, '_'),
      goal: pick('Goal'),
      deliver: pick('Deliver')
    };
  }

  function serverIsStructuredOrderBrief(value = '') {
    const text = String(value || '').trim();
    return Boolean(/^Task:\s+/im.test(text) && /(?:^|\n)\s*Goal:\s+/im.test(text) && /(?:^|\n)\s*Deliver:\s+/im.test(text));
  }

  function normalizeLockedLeaderTaskType(value = '') {
    const normalized = leaderTaskTypeForInitialWork(value, '');
    const token = String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
    return normalized || (token.endsWith('_leader') ? token : '');
  }

  function explicitLeaderChangeTaskTypeFromServerText(value = '') {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    if (!text) return '';
    const targetLeader = leaderTaskTypeForInitialWork('', text);
    if (!targetLeader) return '';
    const explicitChange = /(?:leader|リーダー|担当|主体|lead|owner|route|routing|use|switch|change|変更|切替|切り替|変え|にして|で進め|でお願い|に戻|に固定|固定|指名|選択)/i.test(text)
      || Boolean(normalizeLockedLeaderTaskType(text));
    if (!explicitChange) return '';
    return targetLeader;
  }

  function lockedLeaderTaskTypeFromOrderBody(body = {}) {
    const input = body?.input && typeof body.input === 'object' ? body.input : {};
    const broker = input._broker && typeof input._broker === 'object' ? input._broker : {};
    const owner = body.conversationOwner || body.conversation_owner || broker.conversationOwner || {};
    const active = broker.activeLeader || {};
    return normalizeLockedLeaderTaskType(
      body.active_leader_task_type
      || body.activeLeaderTaskType
      || owner.taskType
      || owner.task_type
      || active.taskType
      || active.task_type
      || ''
    );
  }

  function orderBodyHasActiveLeaderLock(body = {}) {
    const broker = body?.input?._broker && typeof body.input._broker === 'object' ? body.input._broker : {};
    return body.active_leader_locked === true
      || body.activeLeaderLocked === true
      || body.leader_locked === true
      || broker.activeLeaderLocked === true
      || broker.active_leader_locked === true;
  }

  function orderBodyLeaderChangeRequested(body = {}) {
    const broker = body?.input?._broker && typeof body.input._broker === 'object' ? body.input._broker : {};
    return body.leader_change_requested === true
      || body.leaderChangeRequested === true
      || broker.leaderChangeRequested === true
      || broker.leader_change_requested === true;
  }

  function lockedAgentOwnerFromOrderBody(body = {}) {
    const input = body?.input && typeof body.input === 'object' ? body.input : {};
    const broker = input._broker && typeof input._broker === 'object' ? input._broker : {};
    const owner = body.conversationOwner || body.conversation_owner || broker.conversationOwner || broker.activeOwner || {};
    const active = broker.activeOwner || {};
    const type = String(
      body.active_owner_type
      || body.activeOwnerType
      || owner.type
      || active.type
      || ''
    ).trim().toLowerCase();
    const taskType = workIntentNormalizeText(
      body.active_owner_task_type
      || body.activeOwnerTaskType
      || owner.taskType
      || owner.task_type
      || active.taskType
      || active.task_type
      || ''
    );
    if (!taskType || taskType.endsWith('_leader')) return null;
    if (type !== 'agent' && type !== 'specialist') return null;
    const label = String(
      body.active_owner_name
      || body.activeOwnerName
      || owner.label
      || active.label
      || workIntentAgentLabel(taskType)
    ).trim();
    return {
      type: 'agent',
      taskType,
      label: label || workIntentAgentLabel(taskType),
      reason: String(owner.reason || active.reason || 'Agent was already confirmed in chat.').trim()
    };
  }

  function orderBodyHasActiveOwnerLock(body = {}) {
    const broker = body?.input?._broker && typeof body.input._broker === 'object' ? body.input._broker : {};
    return body.active_owner_locked === true
      || body.activeOwnerLocked === true
      || broker.activeOwnerLocked === true
      || broker.active_owner_locked === true;
  }

  function applyActiveLeaderLockToOrderBody(body = {}) {
    if (!body || typeof body !== 'object') return body;
    const lockedTaskType = lockedLeaderTaskTypeFromOrderBody(body);
    if (!lockedTaskType || !orderBodyHasActiveLeaderLock(body)) return body;
    const explicitChangeTaskType = explicitLeaderChangeTaskTypeFromServerText(body.prompt || '');
    const taskType = explicitChangeTaskType || lockedTaskType;
    const leaderChangeRequested = orderBodyLeaderChangeRequested(body) || Boolean(explicitChangeTaskType);
    const input = body.input && typeof body.input === 'object' ? body.input : {};
    const broker = input._broker && typeof input._broker === 'object' ? input._broker : {};
    const label = String(explicitChangeTaskType ? '' : (body.active_leader_name || body.activeLeaderName || broker.activeLeader?.label || '')).trim()
      || taskType.split(/[_\s-]+/).filter(Boolean).map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`).join(' ');
    return {
      ...body,
      task_type: taskType,
      taskType,
      active_leader_task_type: taskType,
      activeLeaderTaskType: taskType,
      active_leader_name: label,
      activeLeaderName: label,
      active_leader_locked: true,
      activeLeaderLocked: true,
      ...(leaderChangeRequested ? { leader_change_requested: true, leaderChangeRequested: true } : {}),
      input: {
        ...input,
        _broker: {
          ...broker,
          activeLeaderLocked: true,
          ...(leaderChangeRequested ? { leaderChangeRequested: true } : {}),
          conversationOwner: {
            type: 'leader',
            taskType,
            label,
            reason: leaderChangeRequested
              ? 'User explicitly changed the locked leader.'
              : 'Leader was already confirmed in chat.'
          },
          activeLeader: {
            taskType,
            label,
            reason: leaderChangeRequested
              ? 'User explicitly changed the locked leader.'
              : 'Leader was already confirmed in chat.'
          }
        }
      }
    };
  }

  function applyActiveAgentLockToOrderBody(body = {}) {
    if (!body || typeof body !== 'object') return body;
    if (!orderBodyHasActiveOwnerLock(body)) return body;
    const owner = lockedAgentOwnerFromOrderBody(body);
    if (!owner?.taskType) return body;
    if (explicitLeaderChangeTaskTypeFromServerText(body.prompt || '') || orderBodyLeaderChangeRequested(body)) return body;
    const input = body.input && typeof body.input === 'object' ? body.input : {};
    const broker = input._broker && typeof input._broker === 'object' ? input._broker : {};
    return {
      ...body,
      task_type: owner.taskType,
      taskType: owner.taskType,
      active_owner_type: 'agent',
      activeOwnerType: 'agent',
      active_owner_task_type: owner.taskType,
      activeOwnerTaskType: owner.taskType,
      active_owner_name: owner.label,
      activeOwnerName: owner.label,
      active_owner_locked: true,
      activeOwnerLocked: true,
      input: {
        ...input,
        _broker: {
          ...broker,
          activeOwnerLocked: true,
          conversationOwner: owner,
          activeOwner: owner
        }
      }
    };
  }

  function applyActiveConversationOwnerLockToOrderBody(body = {}) {
    const leaderApplied = applyActiveLeaderLockToOrderBody(body);
    if (leaderApplied?.active_leader_locked === true || leaderApplied?.activeLeaderLocked === true) return leaderApplied;
    return applyActiveAgentLockToOrderBody(leaderApplied);
  }

  function openChatIntentTaskTypeForPrepare(result = {}, prompt = '') {
    const briefTask = serverStructuredOrderBriefParts(result.order_brief || result.orderBrief || '').taskType;
    if (briefTask) return briefTask;
    const intent = String(result.intent || '').trim();
    if (intent === 'natural_business_growth' || intent === 'natural_marketing_launch') return 'growth';
    if (intent === 'natural_idea_discovery') return 'research';
    if (intent === 'natural_entity_exploration') return 'research';
    return String(result.task_type || result.taskType || '').trim().toLowerCase();
  }

  function prepareOrderSeedFromOpenChatIntent(result = {}, prompt = '', requestedStrategy = 'auto') {
    const taskType = openChatIntentTaskTypeForPrepare(result, prompt) || '';
    if (!taskType) return null;
    return prepareWorkOrderSeed(prompt, requestedStrategy, { taskType });
  }

  async function prepareWorkOrderRequest(_storage, request, env = {}) {
    let body;
    try {
      body = await parseBody(request);
    } catch (error) {
      return { error: error.message, statusCode: 400 };
    }
    body = applyActiveConversationOwnerLockToOrderBody(body);
    let current = null;
    if (typeof currentOrderRequesterContext === 'function') {
      try {
        current = await currentOrderRequesterContext(_storage, request, env, { lightweight: true });
      } catch {
        current = null;
      }
    }
    if (current?.apiKeyStatus === 'invalid') return { error: 'Invalid API key', statusCode: 401 };
    if (current?.apiKeyStatus === 'disabled') return { error: 'CAIt developer API and API key access are temporarily disabled.', code: 'developer_api_disabled', statusCode: 403 };
    const chatSessionPrepared = await prepareApiChatSessionBody(_storage, current, body, { mode: 'prepare-order' });
    body = chatSessionPrepared.body;
    const chatSessionContext = chatSessionPrepared.context;
    const withSessionMemory = async (result = {}) => {
      const persistedSession = await persistApiChatSessionTurn(_storage, current, body, result, chatSessionContext, { mode: 'prepare-order' });
      const chatSessionMeta = chatSessionMemoryResponseMeta(chatSessionContext || {}, persistedSession);
      return chatSessionMeta ? { ...result, chat_session_memory: chatSessionMeta } : result;
    };
    const prompt = String(body?.prompt || '').trim();
    const promptInjection = promptInjectionGuardForPrompt(prompt);
    if (promptInjection.blocked) return { ...promptPolicyBlockPayload(promptInjection), statusCode: 400 };
    const requestedStrategy = String(body?.requestedStrategy || body?.orderStrategy || '').trim().toLowerCase();
    const selectedAgentId = selectedAgentIdFromOrderBody(body);
    const selectedAgentTaskType = selectedAgentTaskTypeFromOrderBody(body);
    let selectedAgentName = selectedAgentNameFromOrderBody(body);
    if (selectedAgentId && !selectedAgentName && _storage?.getAgentById) {
      try {
        selectedAgentName = String((await _storage.getAgentById(selectedAgentId))?.name || '').trim();
      } catch {}
    } else if (selectedAgentId && !selectedAgentName && _storage?.getState) {
      try {
        const state = await _storage.getState();
        selectedAgentName = String(state?.agents?.find((agent) => String(agent?.id || '') === selectedAgentId)?.name || '').trim();
      } catch {}
    }
    if (!prompt) {
      return withSessionMemory({
        ok: true,
        prompt: '',
        taskType: '',
        requestedOrderStrategy: requestedStrategy || 'auto',
        resolvedOrderStrategy: requestedStrategy === 'multi' ? 'multi' : 'single',
        routeHint: '',
        reason: ''
      });
    }
    const explicitTaskType = String(body?.task_type || body?.taskType || body?.selected_task_type || body?.selectedTaskType || selectedAgentTaskType || '').trim();
    const skipOpenAiIntent = body?.skip_openai_intent === true || body?.skipOpenAiIntent === true;
    const shouldUseOpenAiIntent = Boolean(!skipOpenAiIntent && !explicitTaskType && !selectedAgentId && !serverIsStructuredOrderBrief(prompt));
    let prepared = null;
    if (shouldUseOpenAiIntent) {
      const authorization = await authorizeOpenChatIntentLlm(_storage, request, env);
      if (!authorization.ok) {
        prepared = prepareWorkOrderSeed(prompt, requestedStrategy);
      }
      if (!prepared && !authorization.config?.enabled) {
        prepared = prepareWorkOrderSeed(prompt, requestedStrategy);
      } else if (!prepared) {
        const state = await lazyOpenChatRuntimeState(_storage, authorization.current || {}, env);
        const settings = await lazyAppSettingsMap(_storage);
        const uiLabels = orderUiLabelsFromAppSettings(settings);
        const contextMarkdown = buildOpenChatRuntimeContextMarkdown(state, authorization.current || {}, {
          prompt,
          user_language: openChatIntentLanguage(prompt, body?.user_language || body?.userLanguage),
          input_counts: body?.input_counts || body?.inputCounts || {}
        }, uiLabels);
        const intentResult = await classifyOpenChatIntent({
          prompt,
          fallback_intent: '',
          prepared_brief: '',
          conversation_context: body?.conversation_context || body?.conversationContext || [],
          desired_output: 'Classify the user intent before any CAIt order draft. Treat existing delivery display requests like "completedの納品物を見せてください" as normal chat/display, not intake or a new order. If enough context exists, return a structured order brief. If not, ask concise clarification questions.',
          user_language: openChatIntentLanguage(prompt, body?.user_language || body?.userLanguage),
          input_counts: body?.input_counts || body?.inputCounts || {}
        }, env, {
          allowOpenAiApiKeyFallback: authorization.allowOpenAiApiKeyFallback,
          allowPlatformOpenAiApiKeyFallback: authorization.allowPlatformOpenAiApiKeyFallback,
          contextMarkdown,
          uiLabels
        });
        if (!intentResult?.ok) {
          prepared = prepareWorkOrderSeed(prompt, requestedStrategy);
        }
        if (prepared) {
          // Continue with deterministic work-order seeding. The actual order creation path
          // still runs the stricter leader planner and quality gates before dispatch.
        } else {
          const action = String(intentResult.action || '').trim();
          prepared = prepareOrderSeedFromOpenChatIntent(intentResult, prompt, requestedStrategy);
          if (action === 'answer_in_chat') {
            return withSessionMemory({
              ok: true,
              kind: 'chat',
              status: 'chat_answer',
              prompt,
              source: intentResult.source || 'openai',
              message: intentResult.chat_answer || intentResult.summary || 'OpenAI classified this as chat, not an order.'
            });
          }
          if (action === 'ask_clarifying_question') {
            const taskType = prepared?.taskType || openChatIntentTaskTypeForPrepare(intentResult, prompt) || 'research';
            const dynamicQuestions = [
              ...(Array.isArray(intentResult.intake_questions) ? intentResult.intake_questions : []),
              intentResult.narrowing_question || ''
            ].map((question) => String(question || '').trim()).filter(Boolean);
            const clarificationBody = {
              prompt,
              task_type: taskType
            };
            const rulesClarification = buildIntakeClarification(clarificationBody, { taskType });
            const allowAgentQuestionOverride = ['1', 'true', 'yes', 'on'].includes(String(openChatIntentEnvValue(env, 'LEADER_INTAKE_LLM_OVERRIDE_AGENT_QUESTIONS')).toLowerCase());
            const preserveAgentOwnedLeaderQuestions = Boolean(
              !allowAgentQuestionOverride
              && rulesClarification?.reason === 'leader_context_required'
              && rulesClarification?.intake?.questionSource === 'rules'
            );
            const clarification = preserveAgentOwnedLeaderQuestions
              ? rulesClarification
              : buildIntakeClarification(clarificationBody, { taskType, dynamicIntakeQuestions: dynamicQuestions });
            return withSessionMemory({
              ok: true,
              prompt,
              ...withPreparedOrderBrief(
                prepared || prepareWorkOrderSeed(prompt, requestedStrategy, { taskType }),
                prompt,
                prepared || { taskType },
                body
              ),
              ...(clarification || {
                status: 'needs_input',
                needs_input: true,
                reason: 'openai_clarification_required',
                inferred_task_type: taskType,
                questions: dynamicQuestions.slice(0, 4),
                message: intentResult.summary || intentResult.narrowing_question || 'OpenAI needs one more clarification before preparing this order.'
              }),
              source: intentResult.source || 'openai'
            });
          }
          if (!prepared) {
            prepared = prepareWorkOrderSeed(prompt, requestedStrategy);
          }
        }
      }
    } else {
      prepared = prepareWorkOrderSeed(prompt, requestedStrategy, {
        taskType: explicitTaskType,
        selectedAgentId
      });
    }
    const intakeClarification = await buildIntakeClarificationWithAi({
      prompt: String(body?.original_prompt || body?.originalPrompt || body?.input?.original_prompt || '').trim() || prompt,
      task_type: prepared.taskType || 'research',
      order_strategy: prepared.resolvedOrderStrategy || requestedStrategy || 'auto',
      intake_answered: body?.intake_answered === true || body?.intakeAnswered === true,
      input_counts: body?.input_counts || body?.inputCounts || {},
      inputCounts: body?.input_counts || body?.inputCounts || {},
      selected_agent_id: selectedAgentId,
      selected_agent_name: selectedAgentName
    }, { taskType: prepared.taskType || 'research' }, env);
    if (intakeClarification) {
      return withSessionMemory({
        ok: true,
        prompt,
        selected_agent_id: selectedAgentId,
        selectedAgentId,
        selected_agent_name: selectedAgentName,
        selectedAgentName,
        ...withPreparedOrderBrief(prepared, prompt, prepared, body),
        ...intakeClarification
      });
    }
    return withSessionMemory({
      ok: true,
      prompt,
      selected_agent_id: selectedAgentId,
      selectedAgentId,
      selected_agent_name: selectedAgentName,
      selectedAgentName,
      ...withPreparedOrderBrief(prepared, prompt, prepared, body)
    });
  }

  async function preflightWorkOrderRequest(storage, request, env) {
    let body;
    try {
      body = await parseBody(request);
    } catch (error) {
      return { error: error.message, statusCode: 400 };
    }
    const prompt = String(body?.prompt || '').trim();
    if (!prompt) return { ok: false, code: 'missing_prompt', error: 'prompt required', statusCode: 400 };
    const state = await storage.getState();
    const current = await currentUserContext(request, env);
    body = orderBodyWithLeaderFollowupSpecialistRouting(state || {}, body);
    const requestedStrategy = normalizeOrderStrategy(body?.order_strategy || body?.requestedOrderStrategy || body?.resolved_order_strategy || body?.resolvedOrderStrategy || 'auto');
    const effectiveRequestedStrategy = orderStrategyWithFollowupContext(requestedStrategy, state || {}, body);
    const seed = prepareWorkOrderSeed(prompt, effectiveRequestedStrategy, {
      taskType: body?.task_type || body?.taskType || selectedAgentTaskTypeFromOrderBody(body),
      selectedAgentId: selectedAgentIdFromOrderBody(body)
    });
    const taskType = String(body?.task_type || body?.taskType || seed.taskType || 'research').trim().toLowerCase();
    const resolvedOrderStrategy = String(body?.resolved_order_strategy || body?.resolvedOrderStrategy || seed.resolvedOrderStrategy || effectiveRequestedStrategy || 'single').trim().toLowerCase();
    const account = current?.login ? accountSettingsForLogin(state, current.login, current.user, current.authProvider) : null;
    const requestedAgentId = String(body?.agent_id || body?.agentId || selectedAgentIdFromOrderBody(body)).trim();
    const resolvedStrategyPlan = resolveOrderStrategy(state.agents, {
      ...body,
      task_type: taskType,
      prompt,
      budget_cap: Number(body?.budget_cap || body?.budgetCap || 0),
      agent_id: String(body?.agent_id || body?.agentId || '').trim(),
      selected_agent_id: selectedAgentIdFromOrderBody(body),
      selected_agent_task_type: selectedAgentTaskTypeFromOrderBody({ ...body, task_type: taskType })
    }, effectiveRequestedStrategy || resolvedOrderStrategy);
    if (resolvedStrategyPlan.strategy === 'multi' || resolvedOrderStrategy === 'multi') {
      const plan = resolvedStrategyPlan.plan || { plannedTasks: [], assignments: [] };
      const plannedSpecialties = [...new Set((plan.plannedTasks || []).filter(isAutoWorkflowSpecialtyTask))];
      const assignedSpecialties = [...new Set((plan.assignments || []).filter((assignment) => isAutoWorkflowSpecialtyTask(assignment.taskType)).map((assignment) => assignment.taskType))];
      if ((plan.assignments || []).length < 2 || assignedSpecialties.length < 2) {
        return {
          ok: false,
          code: 'agent_unavailable',
          error: 'Need at least 2 ready specialist agents before sending an Agent Team objective.',
          inferred_task_type: taskType,
          requested_agent_id: requestedAgentId,
          resolvedOrderStrategy: 'multi',
          plannedTasks: plan.plannedTasks || [],
          assignedSpecialties,
          plannedSpecialties,
          statusCode: 400
        };
      }
      return {
        ok: true,
        mode: 'multi',
        taskType,
        resolvedOrderStrategy: 'multi',
        routeHint: seed.routeHint,
        reason: resolvedStrategyPlan.reason || seed.reason,
        plannedTasks: plan.plannedTasks || [],
        assignedSpecialties,
        plannedSpecialties,
        assignmentCount: (plan.assignments || []).length
      };
    }
    const picked = assignAgentForTask(state.agents, taskType, Number(body?.budget_cap || body?.budgetCap || 0), requestedAgentId, {
      body,
      tagHints: body?.workflow_tag_hints || body?.workflowTagHints || [],
      scheduled: Boolean(body?.input?._broker?.recurring),
      recurring: Boolean(body?.input?._broker?.recurring)
    });
    if (picked?.error) {
      return {
        ok: false,
        code: 'agent_unavailable',
        error: picked.error,
        inferred_task_type: taskType,
        requested_agent_id: requestedAgentId,
        statusCode: 400
      };
    }
    if (!picked?.agent) {
      return {
        ok: false,
        code: 'agent_unavailable',
        error: 'No verified agent available for this task.',
        inferred_task_type: taskType,
        requested_agent_id: requestedAgentId,
        statusCode: 400
      };
    }
    const preflight = orderPreflightForAgent(picked.agent, current, account, body, {
      scheduled: Boolean(body?.input?._broker?.recurring)
    });
    if (!preflight.ok) {
      return {
        ...preflight,
        inferred_task_type: taskType,
        requested_agent_id: requestedAgentId,
        statusCode: preflight.statusCode || 400
      };
    }
    return {
      ok: true,
      mode: 'single',
      taskType,
      resolvedOrderStrategy,
      routeHint: seed.routeHint,
      reason: seed.reason,
      selectedAgent: {
        id: picked.agent.id,
        name: picked.agent.name
      },
      assignmentMode: picked.assignmentMode,
      score: picked.score
    };
  }

  return {
    applyActiveConversationOwnerLockToOrderBody,
    prepareWorkOrderRequest,
    preflightWorkOrderRequest,
    resolveWorkActionRequest,
    resolveWorkIntentRequest
  };
}
