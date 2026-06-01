import { compactClientText as compactChatText } from './client-text-utils.js?v=20260521a';

export function createClientOpenChatContextUtils(options = {}) {
  const getState = typeof options.getState === 'function' ? options.getState : () => ({});
  const getEls = typeof options.getEls === 'function' ? options.getEls : () => ({});
  const workOrderUiLabels = typeof options.workOrderUiLabels === 'function'
    ? options.workOrderUiLabels
    : () => ({ sendOrder: 'Send order', revise: 'Revise', addConstraints: 'Add constraints', cancel: 'Cancel' });
  const normalizeOpenChatIntentText = typeof options.normalizeOpenChatIntentText === 'function'
    ? options.normalizeOpenChatIntentText
    : (value) => String(value || '').trim().toLowerCase();
  const openChatIntentMatchText = typeof options.openChatIntentMatchText === 'function'
    ? options.openChatIntentMatchText
    : (value) => String(value || '').trim().toLowerCase();
  const isStructuredOrderBrief = typeof options.isStructuredOrderBrief === 'function'
    ? options.isStructuredOrderBrief
    : () => false;
  const structuredOrderBriefParts = typeof options.structuredOrderBriefParts === 'function'
    ? options.structuredOrderBriefParts
    : () => ({});
  const extractPreparedBriefFromChatText = typeof options.extractPreparedBriefFromChatText === 'function'
    ? options.extractPreparedBriefFromChatText
    : () => '';
  const rewriteStructuredBriefTaskType = typeof options.rewriteStructuredBriefTaskType === 'function'
    ? options.rewriteStructuredBriefTaskType
    : (brief) => brief;
  const openChatCanonicalOrderTaskType = typeof options.openChatCanonicalOrderTaskType === 'function'
    ? options.openChatCanonicalOrderTaskType
    : (taskType) => String(taskType || '').trim().toLowerCase();
  const inferClientTaskSequence = typeof options.inferClientTaskSequence === 'function'
    ? options.inferClientTaskSequence
    : () => [];
  const currentRoutingTask = typeof options.currentRoutingTask === 'function'
    ? options.currentRoutingTask
    : () => 'research';
  const openChatPendingQuestionContext = typeof options.openChatPendingQuestionContext === 'function'
    ? options.openChatPendingQuestionContext
    : () => null;
  const openChatPreviousUserMessageBody = typeof options.openChatPreviousUserMessageBody === 'function'
    ? options.openChatPreviousUserMessageBody
    : () => '';
  const openChatLastPromptWasOrderDecision = typeof options.openChatLastPromptWasOrderDecision === 'function'
    ? options.openChatLastPromptWasOrderDecision
    : () => false;
  const orderInputCounts = typeof options.orderInputCounts === 'function' ? options.orderInputCounts : () => ({});
  const orderInputFromComposer = typeof options.orderInputFromComposer === 'function'
    ? options.orderInputFromComposer
    : () => null;
  const buildOpenChatDispatchBriefFromPendingAnswer = typeof options.buildOpenChatDispatchBriefFromPendingAnswer === 'function'
    ? options.buildOpenChatDispatchBriefFromPendingAnswer
    : () => '';
  const looksJapanese = typeof options.looksJapanese === 'function' ? options.looksJapanese : () => false;
  const makeParallelDraftId = typeof options.makeParallelDraftId === 'function'
    ? options.makeParallelDraftId
    : () => String(Date.now());
  const orderRoutingDecision = typeof options.orderRoutingDecision === 'function'
    ? options.orderRoutingDecision
    : () => ({ strategy: 'single', plan: {} });

  function latestOpenChatAgentConfirmationBody() {
    const state = getState();
    const messages = Array.isArray(state.orderChatMessages) ? state.orderChatMessages : [];
    const labels = workOrderUiLabels();
    const sendLabel = normalizeOpenChatIntentText(labels.sendOrder).replace(/\s+/g, '');
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const message = messages[index];
      if (message?.role === 'user') continue;
      const body = String(message?.fullBody || message?.body || '').trim();
      if (!body) continue;
      const text = openChatIntentMatchText(body);
      const looksConfirmation = /(?:接続先:|Route:|Work:|Delivery:|対応するオーダーに繋げます|I will connect this to the matching order|内容が合っていれば\s*SEND ORDER|press SEND ORDER|SEND ORDERできます)/i.test(text);
      if (looksConfirmation || (sendLabel && text.includes(sendLabel))) return body;
    }
    return '';
  }

  function openChatPreserveSeedTaskType(prompt = '', preferredTaskType = '') {
    const source = String(prompt || '').trim();
    const preferred = String(preferredTaskType || '').trim();
    if (isStructuredOrderBrief(source)) {
      const structuredTask = String(structuredOrderBriefParts(source).taskType || '').trim();
      if (structuredTask) return structuredTask;
    }
    if (preferred) return preferred;
    return openChatCanonicalOrderTaskType('', source)
      || openChatCanonicalOrderTaskType(inferClientTaskSequence('', source)[0], source)
      || currentRoutingTask()
      || 'research';
  }

  function openChatDecisionSeedContext(original = '') {
    const state = getState();
    const prepared = String(state.openChatPreparedBrief || '').trim();
    if (isStructuredOrderBrief(prepared)) {
      const taskType = openChatPreserveSeedTaskType(prepared, structuredOrderBriefParts(prepared).taskType);
      return { prompt: prepared, taskType };
    }
    const pending = openChatPendingQuestionContext();
    if (pending?.prompt) {
      const taskType = openChatPreserveSeedTaskType(pending.prompt, pending.taskType);
      return { prompt: pending.prompt, taskType };
    }
    const leaderPrompt = String(state.openChatLeaderIntakePrompt || '').trim();
    if (leaderPrompt) {
      const leaderTask = String(state.openChatLeaderIntakeTask || '').trim();
      const taskType = openChatPreserveSeedTaskType(leaderPrompt, leaderTask);
      return { prompt: leaderPrompt, taskType };
    }
    const seedPrompt = String(original || openChatPreviousUserMessageBody() || '').trim();
    const confirmationBody = latestOpenChatAgentConfirmationBody();
    const taskType = openChatPreserveSeedTaskType([seedPrompt, confirmationBody].filter(Boolean).join('\n'), '');
    return { prompt: seedPrompt, taskType };
  }

  function fallbackStructuredBriefFromOpenChatConfirmation() {
    const confirmationBody = latestOpenChatAgentConfirmationBody();
    const labels = workOrderUiLabels();
    const sendLabel = normalizeOpenChatIntentText(labels.sendOrder).replace(/\s+/g, '');
    const reviseLabel = normalizeOpenChatIntentText(labels.revise).replace(/\s+/g, '');
    const cancelLabel = normalizeOpenChatIntentText(labels.cancel).replace(/\s+/g, '');
    const addConstraintsLabel = normalizeOpenChatIntentText(labels.addConstraints).replace(/\s+/g, '');
    const confirmationText = openChatIntentMatchText(confirmationBody);
    const hasDecision = openChatLastPromptWasOrderDecision()
      || /(?:SEND ORDER|発注する|条件を修正|キャンセル|Revise conditions|Cancel)/i.test(confirmationText)
      || (Boolean(sendLabel) && confirmationText.includes(sendLabel))
      || (Boolean(reviseLabel) && confirmationText.includes(reviseLabel))
      || (Boolean(addConstraintsLabel) && confirmationText.includes(addConstraintsLabel))
      || (Boolean(cancelLabel) && confirmationText.includes(cancelLabel));
    if (!confirmationBody || !hasDecision) return '';
    const inputCounts = orderInputCounts(orderInputFromComposer());
    const seed = openChatDecisionSeedContext('');
    const original = compactChatText(seed.prompt, 3200);
    const context = [
      seed.prompt,
      confirmationBody,
      seed.taskType
    ].filter(Boolean).join('\n');
    const taskType = openChatPreserveSeedTaskType(seed.prompt, seed.taskType);
    const confirmation = looksJapanese(context)
      ? 'ユーザーはこの内容で発注すると確認しました。会話で提供された情報を使い、同じヒアリングを繰り返さず、不足分は仮定として明記してください。'
      : 'The user confirmed this should be sent as an order. Use the conversation context, do not repeat the same intake, and state missing details as assumptions.';
    const clarificationContext = [confirmation, confirmationBody].filter(Boolean).join('\n\n');
    const brief = isStructuredOrderBrief(seed.prompt)
      ? seed.prompt
      : buildOpenChatDispatchBriefFromPendingAnswer(
        original || openChatPreviousUserMessageBody() || confirmationBody,
        clarificationContext,
        taskType,
        inputCounts
      );
    return isStructuredOrderBrief(brief) ? rewriteStructuredBriefTaskType(brief, structuredOrderBriefParts(brief).taskType || taskType) : '';
  }

  function lastOpenChatPreparedBrief() {
    const state = getState();
    const els = getEls();
    const current = String(els.jobPrompt?.value || '').trim();
    if (isStructuredOrderBrief(current)) return current;
    if (isStructuredOrderBrief(state.openChatPreparedBrief)) return state.openChatPreparedBrief;
    const messages = Array.isArray(state.orderChatMessages) ? state.orderChatMessages : [];
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const brief = extractPreparedBriefFromChatText(messages[index]?.fullBody || messages[index]?.body || '');
      if (brief) return brief;
    }
    const fallback = fallbackStructuredBriefFromOpenChatConfirmation();
    if (isStructuredOrderBrief(fallback)) {
      state.openChatPreparedBrief = fallback;
      return fallback;
    }
    return '';
  }

  function currentVisibleOrderPrompt() {
    return String(getEls().jobPrompt?.value || '').trim();
  }

  function currentEffectiveOrderPrompt() {
    const state = getState();
    const visible = currentVisibleOrderPrompt();
    if (visible) return visible;
    const prepared = String(state.openChatPreparedBrief || '').trim();
    return isStructuredOrderBrief(prepared) ? prepared : '';
  }

  function openChatConversationContextForLlm() {
    const state = getState();
    const rows = [];
    const pushRow = (role, body, createdAt = '') => {
      const safeBody = compactChatText(String(body || '').replace(/\s+/g, ' '), 900);
      if (!safeBody) return;
      rows.push({
        role: role === 'assistant' ? 'assistant' : 'user',
        content: safeBody,
        created_at: compactChatText(createdAt || '', 80)
      });
    };
    // New Chat is a hard context boundary. Account chatMemory is restored only
    // when the user explicitly opens a saved session, which populates local messages.
    const local = Array.isArray(state.orderChatMessages) ? state.orderChatMessages.slice(-8) : [];
    for (const message of local) {
      pushRow(message?.role || 'assistant', message?.body || message?.fullBody || '', message?.ts || '');
    }
    return rows.slice(-12);
  }

  function parallelDraftFromOpenChatPlanItem(item = {}, input = null) {
    const els = getEls();
    const prompt = String(item.prompt || '').trim();
    const taskType = String(item.taskType || inferClientTaskSequence('', prompt)[0] || 'research').trim().toLowerCase();
    if (!prompt || !taskType) return null;
    const routingDecision = orderRoutingDecision(taskType, prompt, 'auto');
    return {
      id: makeParallelDraftId(),
      parent_agent_id: els.jobParent?.value || 'cloudcode-main',
      order_strategy: 'auto',
      resolved_order_strategy: routingDecision.strategy === 'multi' ? 'single' : routingDecision.strategy,
      route_plan: routingDecision.plan,
      task_type: taskType,
      agent_id: '',
      prompt,
      budget_cap: Number(els.jobBudget?.value || 300),
      deadline_sec: Number(els.jobDeadline?.value || 120),
      input: input || undefined
    };
  }

  return {
    latestOpenChatAgentConfirmationBody,
    openChatPreserveSeedTaskType,
    openChatDecisionSeedContext,
    fallbackStructuredBriefFromOpenChatConfirmation,
    lastOpenChatPreparedBrief,
    currentVisibleOrderPrompt,
    currentEffectiveOrderPrompt,
    openChatConversationContextForLlm,
    parallelDraftFromOpenChatPlanItem
  };
}
