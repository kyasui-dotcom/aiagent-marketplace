export function createClientOpenChatServerOrderUtils(options = {}) {
  const getState = typeof options.getState === 'function' ? options.getState : () => ({});
  const requestJson = typeof options.requestJson === 'function' ? options.requestJson : async () => null;
  const isStructuredOrderBrief = typeof options.isStructuredOrderBrief === 'function' ? options.isStructuredOrderBrief : () => false;
  const chatEngineIsNeedsInputResponse = typeof options.chatEngineIsNeedsInputResponse === 'function'
    ? options.chatEngineIsNeedsInputResponse
    : () => false;
  const looksJapanese = typeof options.looksJapanese === 'function' ? options.looksJapanese : () => false;
  const normalizeLeaderIntakeQuestions = typeof options.normalizeLeaderIntakeQuestions === 'function'
    ? options.normalizeLeaderIntakeQuestions
    : (value) => (Array.isArray(value) ? value.map((item) => String(item || '').trim()).filter(Boolean) : []);
  const normalizeLeaderIntakeTask = typeof options.normalizeLeaderIntakeTask === 'function'
    ? options.normalizeLeaderIntakeTask
    : (value) => String(value || '').trim();
  const currentRoutingTask = typeof options.currentRoutingTask === 'function' ? options.currentRoutingTask : () => '';
  const pendingLeaderIntakeContext = typeof options.pendingLeaderIntakeContext === 'function'
    ? options.pendingLeaderIntakeContext
    : () => null;
  const implicitLeaderIntakeTask = typeof options.implicitLeaderIntakeTask === 'function'
    ? options.implicitLeaderIntakeTask
    : () => '';
  const combineLeaderIntakePrompt = typeof options.combineLeaderIntakePrompt === 'function'
    ? options.combineLeaderIntakePrompt
    : (previous, next) => [previous, next].map((part) => String(part || '').trim()).filter(Boolean).join('\n\n');
  const requestedOrderStrategy = typeof options.requestedOrderStrategy === 'function' ? options.requestedOrderStrategy : () => 'auto';
  const conversationContextForLlm = typeof options.conversationContextForLlm === 'function'
    ? options.conversationContextForLlm
    : () => [];
  const handleNeedsInputResponse = typeof options.handleNeedsInputResponse === 'function'
    ? options.handleNeedsInputResponse
    : () => {};
  const isLeaderIntakeTask = typeof options.isLeaderIntakeTask === 'function' ? options.isLeaderIntakeTask : () => false;
  const apiPayloadFromOrderDraft = typeof options.apiPayloadFromOrderDraft === 'function'
    ? options.apiPayloadFromOrderDraft
    : (draft) => ({ ...draft });
  const userOnlyContextForIntake = typeof options.userOnlyContextForIntake === 'function'
    ? options.userOnlyContextForIntake
    : (prompt) => String(prompt || '').trim();
  const structuredOrderBriefParts = typeof options.structuredOrderBriefParts === 'function'
    ? options.structuredOrderBriefParts
    : () => ({});
  const inferClientTaskSequence = typeof options.inferClientTaskSequence === 'function'
    ? options.inferClientTaskSequence
    : () => [];
  const missingLeaderIntakeFields = typeof options.missingLeaderIntakeFields === 'function'
    ? options.missingLeaderIntakeFields
    : () => [];
  const orderInputCounts = typeof options.orderInputCounts === 'function' ? options.orderInputCounts : () => ({});
  const orderInputFromComposer = typeof options.orderInputFromComposer === 'function' ? options.orderInputFromComposer : () => ({});

  function normalizeServerPrompt(prompt = '') {
    return String(prompt || '').trim();
  }

  function currentServerResolvedIntentForPrompt(prompt = '') {
    const currentPrompt = normalizeServerPrompt(prompt);
    const resolved = getState().serverResolvedIntent || null;
    if (!resolved || !currentPrompt) return null;
    if (normalizeServerPrompt(resolved.prompt) !== currentPrompt) return null;
    return resolved;
  }

  function applyServerResolvedIntent(result = null, prompt = '') {
    const state = getState();
    const currentPrompt = normalizeServerPrompt(prompt);
    if (!result || result.kind !== 'order' || !currentPrompt) {
      state.serverResolvedIntent = null;
      return null;
    }
    state.serverResolvedIntent = {
      prompt: currentPrompt,
      taskType: String(result.taskType || '').trim().toLowerCase(),
      strategyHint: String(result.strategyHint || '').trim().toLowerCase(),
      routeHint: String(result.routeHint || '').trim().toLowerCase(),
      reason: String(result.reason || '').trim()
    };
    return state.serverResolvedIntent;
  }

  function currentServerPreparedOrderForPrompt(prompt = '') {
    const currentPrompt = normalizeServerPrompt(prompt);
    const prepared = getState().serverPreparedOrder || null;
    if (!prepared || !currentPrompt) return null;
    if (normalizeServerPrompt(prepared.prompt) !== currentPrompt) return null;
    return prepared;
  }

  function applyServerPreparedOrder(result = null, prompt = '') {
    const state = getState();
    const currentPrompt = normalizeServerPrompt(prompt);
    if (!result || !currentPrompt) {
      state.serverPreparedOrder = null;
      return null;
    }
    state.serverPreparedOrder = {
      prompt: currentPrompt,
      taskType: String(result.taskType || '').trim().toLowerCase(),
      requestedOrderStrategy: String(result.requestedOrderStrategy || '').trim().toLowerCase(),
      resolvedOrderStrategy: String(result.resolvedOrderStrategy || '').trim().toLowerCase(),
      routeHint: String(result.routeHint || '').trim().toLowerCase(),
      reason: String(result.reason || '').trim()
    };
    return state.serverPreparedOrder;
  }

  async function resolveWorkIntentViaApi(prompt = '') {
    const text = String(prompt || '').trim();
    if (!text || isStructuredOrderBrief(text)) return null;
    try {
      const result = await requestJson('/api/work/resolve-intent', {
        method: 'POST',
        body: JSON.stringify({ prompt: text })
      });
      return result?.kind ? result : null;
    } catch {
      return null;
    }
  }

  async function prepareWorkOrderViaApi(prompt = '', requestedStrategy = 'auto', config = {}) {
    const text = String(prompt || '').trim();
    if (!text || isStructuredOrderBrief(text)) return null;
    const inputCounts = config.inputCounts || config.input_counts || {};
    try {
      const result = await requestJson('/api/work/prepare-order', {
        method: 'POST',
        body: JSON.stringify({
          prompt: text,
          requestedStrategy: String(requestedStrategy || 'auto').trim().toLowerCase(),
          ...(config.taskType || config.task_type ? { task_type: String(config.taskType || config.task_type || '').trim() } : {}),
          ...(config.intakeAnswered === true || config.intake_answered === true ? { intake_answered: true } : {}),
          input_counts: {
            url_count: Number(inputCounts.urlCount || inputCounts.url_count || 0),
            file_count: Number(inputCounts.fileCount || inputCounts.file_count || 0),
            file_chars: Number(inputCounts.fileChars || inputCounts.file_chars || 0)
          },
          ...(Array.isArray(config.conversationContext || config.conversation_context)
            ? { conversation_context: config.conversationContext || config.conversation_context }
            : {})
        })
      });
      return result?.taskType ? result : null;
    } catch (error) {
      const data = error?.data && typeof error.data === 'object' ? error.data : {};
      if (/openai_intent|intent/i.test(String(data.code || data.error || error?.message || ''))) {
        return {
          ok: false,
          status: 'intent_failed',
          code: String(data.code || 'openai_intent_failed'),
          error: String(data.error || error?.message || 'OpenAI intent classification failed.'),
          source: String(data.source || 'openai')
        };
      }
      return null;
    }
  }

  function preparedOrderBriefFromServer(result = {}, fallbackPrompt = '') {
    return String(result?.orderBrief || result?.order_brief || result?.preparedBrief || result?.prepared_brief || fallbackPrompt || '').trim();
  }

  function serverIntakeAnswerFromPreparedOrder(result = {}, prompt = '') {
    const questions = normalizeLeaderIntakeQuestions(result.questions || result.intake?.questions || []);
    if (!questions.length) return null;
    const taskType = normalizeLeaderIntakeTask(result.inferred_task_type || result.taskType || result.task_type || '') || result.taskType || 'research';
    const ja = looksJapanese(prompt);
    return {
      kind: 'clarify',
      tone: 'warn',
      patternId: 'pattern_server_leader_intake_contract',
      responseSource: result.source || 'server_contract',
      suppressTrio: true,
      leaderIntakePrompt: String(prompt || result.prompt || '').trim(),
      leaderIntakeTask: String(taskType || '').trim(),
      body: [
        result.message || (ja
          ? 'チームリーダーが動く前に、agent側のintake契約から確認が返りました。'
          : 'The agent-side intake contract needs a few details before dispatch.'),
        '',
        ...questions.map((question, index) => `${index + 1}. ${question}`),
        '',
        ja
          ? 'まだ実行も課金もしていません。回答後、サーバー側の契約で注文内容を整えます。'
          : 'Nothing has run or been billed. After you answer, the server-side contract will prepare the order.'
      ].filter(Boolean).join('\n'),
      status: 'Need agent-owned intake before SEND ORDER.\n\nNo order was created and no billing occurred.'
    };
  }

  function serverPreparedOrderAnswerFromResult(result = {}, sourcePrompt = '', config = {}) {
    const nextPrompt = preparedOrderBriefFromServer(result, sourcePrompt);
    if (!nextPrompt) return null;
    const ja = looksJapanese(sourcePrompt);
    return {
      kind: 'assist',
      tone: 'ok',
      patternId: 'pattern_server_prepared_order_contract',
      responseSource: result.source || 'server_contract',
      nextPrompt,
      exposeNextPrompt: false,
      clearLeaderIntake: true,
      clearClarifyOptions: true,
      skipOpenAiPolish: true,
      body: ja
        ? [
            config.followup ? '回答を反映しました。同じ質問は繰り返しません。' : 'agent/server側の契約で注文内容を準備しました。',
            '',
            '内容が合っていれば、このまま SEND ORDER できます。',
            '',
            `ルート: ${result.resolvedOrderStrategy === 'multi' ? 'Leader Agent' : 'Specialist Agent'}`,
            result.reason ? `理由: ${result.reason}` : '',
            '',
            'まだ実行も課金もしていません。'
          ].filter(Boolean).join('\n')
        : [
            config.followup ? 'I merged your answer and will not repeat the same questions.' : 'The agent/server-side contract prepared this order.',
            '',
            'If this looks right, you can SEND ORDER now.',
            '',
            `Route: ${result.resolvedOrderStrategy === 'multi' ? 'Leader Agent' : 'Specialist Agent'}`,
            result.reason ? `Reason: ${result.reason}` : '',
            '',
            'Nothing has run or been billed yet.'
          ].filter(Boolean).join('\n'),
      status: 'Draft prepared by server contract. Ready for SEND ORDER.'
    };
  }

  async function resolveOpenChatServerLeaderIntake(prompt = '', inputCounts = {}, draft = {}) {
    const text = String(prompt || '').trim();
    if (!text || isStructuredOrderBrief(text)) return null;
    const pending = pendingLeaderIntakeContext();
    const taskType = pending?.taskType
      || implicitLeaderIntakeTask(text)
      || normalizeLeaderIntakeTask(currentRoutingTask())
      || '';
    if (!taskType) return null;
    const sourcePrompt = pending ? combineLeaderIntakePrompt(pending.prompt, text) : text;
    const prepared = await prepareWorkOrderViaApi(sourcePrompt, requestedOrderStrategy(), {
      taskType,
      intakeAnswered: Boolean(pending),
      inputCounts,
      conversationContext: conversationContextForLlm()
    });
    if (!prepared) return null;
    if (chatEngineIsNeedsInputResponse(prepared)) {
      handleNeedsInputResponse(prepared, {
        ...draft,
        prompt: text,
        task_type: prepared.inferred_task_type || prepared.taskType || taskType
      });
      return serverIntakeAnswerFromPreparedOrder(prepared, text);
    }
    if (pending || isLeaderIntakeTask(prepared.taskType || taskType)) {
      applyServerPreparedOrder(prepared, sourcePrompt);
      return serverPreparedOrderAnswerFromResult(prepared, sourcePrompt, { followup: Boolean(pending) });
    }
    return null;
  }

  async function preflightWorkOrderViaApi(draft = {}) {
    const prompt = String(draft?.prompt || '').trim();
    if (!prompt) return null;
    try {
      return await requestJson('/api/work/preflight-order', {
        method: 'POST',
        body: JSON.stringify({
          ...apiPayloadFromOrderDraft(draft),
          prompt,
          task_type: draft.task_type || '',
          order_strategy: draft.order_strategy || 'auto',
          resolved_order_strategy: draft.resolved_order_strategy || ''
        })
      });
    } catch (error) {
      return error?.data && typeof error.data === 'object'
        ? { ...error.data, ok: false }
        : null;
    }
  }

  function openChatLlmLeaderIntakeGuardCandidate(prompt = '', result = {}, fallbackAnswer = null) {
    const action = String(result?.action || '').trim();
    const rawBrief = String(result?.order_brief || result?.orderBrief || '').trim();
    const userContext = userOnlyContextForIntake(prompt);
    const briefParts = structuredOrderBriefParts(rawBrief);
    const candidates = [
      briefParts.taskType,
      fallbackAnswer?.leaderIntakeTask,
      implicitLeaderIntakeTask(userContext),
      implicitLeaderIntakeTask(rawBrief),
      inferClientTaskSequence('', userContext)[0],
      inferClientTaskSequence('', rawBrief)[0]
    ];
    const taskType = candidates.map(normalizeLeaderIntakeTask).find(Boolean) || '';
    if (!taskType) return null;
    const isOrderLike = ['prepare_order', 'use_previous_brief'].includes(action) || rawBrief || fallbackAnswer?.leaderIntakeTask;
    const isLeaderIntent = Boolean(implicitLeaderIntakeTask(userContext)) || isLeaderIntakeTask(taskType);
    if (!isOrderLike && !isLeaderIntent) return null;
    const missing = missingLeaderIntakeFields(taskType, userContext, orderInputCounts(orderInputFromComposer()));
    if (!missing.length) return null;
    return { taskType, userContext, missing };
  }

  async function openChatServerLeaderIntakeGuardAnswer(prompt = '', result = {}, fallbackAnswer = null, inputCounts = {}) {
    const candidate = openChatLlmLeaderIntakeGuardCandidate(prompt, result, fallbackAnswer);
    if (!candidate) return null;
    const prepared = await prepareWorkOrderViaApi(candidate.userContext || prompt, requestedOrderStrategy(), {
      taskType: candidate.taskType,
      inputCounts,
      conversationContext: conversationContextForLlm()
    });
    if (!prepared) return null;
    if (chatEngineIsNeedsInputResponse(prepared)) {
      return serverIntakeAnswerFromPreparedOrder(prepared, prompt);
    }
    if (isLeaderIntakeTask(prepared.taskType || candidate.taskType)) {
      applyServerPreparedOrder(prepared, candidate.userContext || prompt);
      return serverPreparedOrderAnswerFromResult(prepared, candidate.userContext || prompt, { followup: false });
    }
    return null;
  }

  return {
    currentServerResolvedIntentForPrompt,
    applyServerResolvedIntent,
    currentServerPreparedOrderForPrompt,
    applyServerPreparedOrder,
    resolveWorkIntentViaApi,
    prepareWorkOrderViaApi,
    preparedOrderBriefFromServer,
    serverIntakeAnswerFromPreparedOrder,
    serverPreparedOrderAnswerFromResult,
    resolveOpenChatServerLeaderIntake,
    preflightWorkOrderViaApi,
    openChatLlmLeaderIntakeGuardCandidate,
    openChatServerLeaderIntakeGuardAnswer
  };
}
