export function createClientOpenChatAnswerBuilders(options = {}) {
  const quick = options.quickAnswerUtils || {};
  const productShortName = String(options.productShortName || 'CAIt');
  const looksJapanese = typeof options.looksJapanese === 'function' ? options.looksJapanese : () => false;
  const inferClientTaskSequence = typeof options.inferClientTaskSequence === 'function' ? options.inferClientTaskSequence : () => [];
  const currentRoutingTask = typeof options.currentRoutingTask === 'function' ? options.currentRoutingTask : () => 'research';
  const catCompactDispatchBrief = typeof options.catCompactDispatchBrief === 'function' ? options.catCompactDispatchBrief : (value) => String(value || '');
  const openChatClarifyingQuestions = typeof options.openChatClarifyingQuestions === 'function' ? options.openChatClarifyingQuestions : () => [];
  const openChatReadinessBlock = typeof options.openChatReadinessBlock === 'function' ? options.openChatReadinessBlock : () => '';
  const openChatPreflightPreviewLines = typeof options.openChatPreflightPreviewLines === 'function' ? options.openChatPreflightPreviewLines : () => [];
  const openChatHumanDispatchPreview = typeof options.openChatHumanDispatchPreview === 'function' ? options.openChatHumanDispatchPreview : (brief) => String(brief || '');
  const orderRoutingDecision = typeof options.orderRoutingDecision === 'function'
    ? options.orderRoutingDecision
    : () => ({ strategy: 'single', reason: 'default route', plan: {} });
  const readyAgentsForTask = typeof options.readyAgentsForTask === 'function' ? options.readyAgentsForTask : () => [];
  const agentRoutingScore = typeof options.agentRoutingScore === 'function' ? options.agentRoutingScore : () => 0;
  const isStructuredOrderBrief = typeof options.isStructuredOrderBrief === 'function' ? options.isStructuredOrderBrief : () => false;
  const structuredOrderBriefParts = typeof options.structuredOrderBriefParts === 'function' ? options.structuredOrderBriefParts : () => ({});
  const resolveOpenChatFollowupAnswer = typeof options.resolveOpenChatFollowupAnswer === 'function' ? options.resolveOpenChatFollowupAnswer : () => null;
  const resolveOpenChatDispatchReadyPrompt = typeof options.resolveOpenChatDispatchReadyPrompt === 'function' ? options.resolveOpenChatDispatchReadyPrompt : () => false;
  const resolveOpenChatShouldPrepareOrderBeforeDispatch = typeof options.resolveOpenChatShouldPrepareOrderBeforeDispatch === 'function' ? options.resolveOpenChatShouldPrepareOrderBeforeDispatch : () => false;
  const resolveOpenChatImplicitOrderPrepAnswer = typeof options.resolveOpenChatImplicitOrderPrepAnswer === 'function' ? options.resolveOpenChatImplicitOrderPrepAnswer : () => null;
  const resolveOpenChatLongPromptGuardAnswer = typeof options.resolveOpenChatLongPromptGuardAnswer === 'function' ? options.resolveOpenChatLongPromptGuardAnswer : () => null;

  const openChatRoutePreview = (taskType = 'research', prompt = '') => {
    const decision = orderRoutingDecision(taskType, prompt, 'auto');
    const plan = decision.plan || {};
    if (decision.strategy === 'multi' && Array.isArray(plan.picks) && plan.picks.length) {
      return `Route: Agent Team candidate\nAgents: ${plan.picks.map((item) => `${item.taskType}:${item.agent?.name || item.agent?.id || 'agent'}`).join(' / ')}\nReason: ${decision.reason}`;
    }
    const candidates = readyAgentsForTask(taskType)
      .slice()
      .sort((left, right) => agentRoutingScore(right, taskType) - agentRoutingScore(left, taskType))
      .slice(0, 3);
    if (!candidates.length) {
      return `Route: single-agent candidate\nAgents: no ready ${taskType} agent visible yet\nReason: ${decision.reason}`;
    }
    return [
      'Route: single-agent candidate',
      `Likely agent: ${candidates[0].name || candidates[0].id}`,
      candidates.length > 1 ? `Other matches: ${candidates.slice(1).map((agent) => agent.name || agent.id).join(' / ')}` : '',
      `Reason: ${decision.reason}`
    ].filter(Boolean).join('\n');
  };

  const buildOpenChatOrderPreview = (prompt = '', inputCounts = {}) => {
    const text = String(prompt || '').trim();
    if (!text) return '';
    const ja = looksJapanese(text);
    const taskType = inferClientTaskSequence('', text)[0] || currentRoutingTask() || 'research';
    const brief = catCompactDispatchBrief(text, taskType, inputCounts);
    const questions = openChatClarifyingQuestions(taskType, text);
    const routePreview = openChatRoutePreview(taskType, text);
    const readinessBlock = openChatReadinessBlock(taskType, text, inputCounts, { ja });
    if (ja) {
      return [
        'この内容は注文候補に見えます。まず発注ブリーフに整えてから、正式オーダーとして送ります。',
        '',
        '発注前プレビューです。次に PREPARE ORDER で内容を整えます。',
        '',
        `推定タスク: ${taskType}`,
        routePreview,
        readinessBlock,
        '',
        '発注前に足すと良い情報:',
        ...questions.map((question, index) => `${index + 1}. ${question}`),
        '',
        '実行ブリーフ案:',
        brief,
        '',
        '次の動き: PREPARE ORDER で発注ブリーフを作ります。内容を確認し、実行する場合は SEND ORDER してください。'
      ].join('\n');
    }
    return [
      `This looks like work to prepare as an order. ${productShortName} prepares a structured brief before paid dispatch.`,
      '',
      'Pre-dispatch preview. Next, PREPARE ORDER turns this into a reviewable draft.',
      '',
      `Inferred task: ${taskType}`,
      routePreview,
      readinessBlock,
      '',
      'Useful details to add before dispatch:',
      ...questions.map((question, index) => `${index + 1}. ${question}`),
      '',
      'Execution brief draft:',
      brief,
      '',
      'Next: press PREPARE ORDER to create the structured brief. Review it, then press SEND ORDER to run it.'
    ].join('\n');
  };

  const buildOpenChatClarifyModeAnswer = (prompt = '', inputCounts = {}, config = {}) => {
    const source = String(prompt || '').trim() || 'Use the attached source material and infer the most useful delivery.';
    const ja = looksJapanese(source);
    const parts = isStructuredOrderBrief(source) ? structuredOrderBriefParts(source) : {};
    const taskType = parts.taskType || inferClientTaskSequence('', source)[0] || currentRoutingTask() || 'research';
    const questions = openChatClarifyingQuestions(taskType, source);
    const brief = isStructuredOrderBrief(source) ? source : catCompactDispatchBrief(source, taskType, inputCounts);
    const preflightLines = openChatPreflightPreviewLines(taskType, brief, ja);
    const sourceNote = config.sourceOnly
      ? (ja ? '入力ソースをもとに計画用draftを作りました。' : 'I prepared a planning draft from the attached source material.')
      : (ja ? 'PLAN mode で発注前draftを確認します。' : 'PLAN mode is reviewing this pre-order draft.');
    const body = ja
      ? [
        `${sourceNote} 内容がまとまったので ORDER に切り替えました。`,
        '',
        openChatHumanDispatchPreview(brief, taskType, source, inputCounts),
        ...preflightLines,
        '',
        '確認質問:',
        ...questions.map((question, index) => `${index + 1}. ${question}`),
        '',
        '次の動き: 足りない条件はこのまま返信してください。内容が合っていれば SEND ORDER してください。'
      ].join('\n')
      : [
        `${sourceNote} The draft is ready, so I switched this chat to ORDER.`,
        '',
        openChatHumanDispatchPreview(brief, taskType, source, inputCounts),
        ...preflightLines,
        '',
        'Clarifying questions:',
        ...questions.map((question, index) => `${index + 1}. ${question}`),
        '',
        'Next: reply with missing constraints here, or press SEND ORDER if this is ready.'
      ].join('\n');
    return {
      kind: 'assist',
      tone: 'info',
      body,
      nextPrompt: brief,
      status: 'Order draft ready.\n\nReview the order summary, then press SEND ORDER to run it.'
    };
  };

  const buildOpenChatLlmFallbackUnavailableAnswer = (prompt = '', reason = '') => {
    const ja = looksJapanese(prompt);
    return {
      kind: 'clarify',
      tone: 'warn',
      patternId: 'pattern_llm_fallback_unavailable',
      responseSource: 'openai_unavailable',
      llmProvider: 'openai_unavailable',
      body: ja
        ? [
          '今の内容だと解釈が割れます。まだ実行も課金もしていません。',
          '',
          '質問に答えてほしいのか、実際に作業を発注したいのかを一言で教えてください。',
          '発注なら、対象URL/商材、対象ユーザー、欲しい成果、制約を分かる範囲で足してください。',
          '',
          'まだ注文も課金も発生しません。'
        ].join('\n')
        : [
          'The intent is still ambiguous. Nothing has run or been billed yet.',
          '',
          'Tell me in one short line whether you want an answer here or you want to order actual work.',
          'If you want to order work, add the target URL/product, audience, desired outcome, and any constraint you know.',
          '',
          'No order or billing happens yet.'
        ].join('\n'),
      status: `Need one more clarification before SEND ORDER.\n\nReason: ${String(reason || 'uncertain').slice(0, 80)}`
    };
  };

  return {
    openChatRoutePreview,
    buildOpenChatOrderPreview,
    buildOpenChatClarifyModeAnswer,
    buildOpenChatLlmFallbackUnavailableAnswer,
    buildOpenChatNoLoginAnswer: (prompt = '') => quick.buildOpenChatNoLoginAnswer?.(prompt) || null,
    buildOpenChatExamplesAnswer: (prompt = '') => quick.buildOpenChatExamplesAnswer?.(prompt) || null,
    buildOpenChatAcknowledgementAnswer: (prompt = '') => quick.buildOpenChatAcknowledgementAnswer?.(prompt) || null,
    buildOpenChatDirectResearchQuestionAnswer: (prompt = '', inputCounts = {}) => quick.buildOpenChatDirectResearchQuestionAnswer?.(prompt, inputCounts) || null,
    buildOpenChatRunConfirmationAnswer: (prompt = '') => quick.buildOpenChatRunConfirmationAnswer?.(prompt) || null,
    isOpenChatBriefEditInstruction: (prompt = '') => Boolean(quick.isOpenChatBriefEditInstruction?.(prompt)),
    isOpenChatAdditionalRequirementFollowup: (prompt = '') => Boolean(quick.isOpenChatAdditionalRequirementFollowup?.(prompt)),
    explicitOpenChatAssistMode: (prompt = '') => quick.explicitOpenChatAssistMode?.(prompt) || '',
    buildOpenChatFollowupAnswer: (prompt = '', inputCounts = {}) => resolveOpenChatFollowupAnswer(prompt, inputCounts),
    isOpenChatDispatchReadyPrompt: (prompt = '') => resolveOpenChatDispatchReadyPrompt(prompt),
    shouldPrepareOrderBeforeDispatch: (draft = {}) => resolveOpenChatShouldPrepareOrderBeforeDispatch(draft),
    buildOpenChatImplicitOrderPrepAnswer: (prompt = '', inputCounts = {}, config = {}) => resolveOpenChatImplicitOrderPrepAnswer(prompt, inputCounts, config),
    buildOpenChatLongPromptGuardAnswer: (prompt = '', inputCounts = {}) => resolveOpenChatLongPromptGuardAnswer(prompt, inputCounts),
    openChatLooksGeneralHelpPrompt: (prompt = '') => Boolean(quick.openChatLooksGeneralHelpPrompt?.(prompt)),
    buildOpenChatGeneralHelpAnswer: (prompt = '') => quick.buildOpenChatGeneralHelpAnswer?.(prompt) || null,
    buildOpenChatMarketingAgentListAnswer: (prompt = '') => quick.buildOpenChatMarketingAgentListAnswer?.(prompt) || null,
    buildOpenChatLeaderCatalogAnswer: (prompt = '') => quick.buildOpenChatLeaderCatalogAnswer?.(prompt) || null,
    buildOpenChatRecurringWorkAnswer: (prompt = '', inputCounts = {}) => quick.buildOpenChatRecurringWorkAnswer?.(prompt, inputCounts) || null,
    buildOpenChatPaymentQuestionAnswer: (prompt = '') => quick.buildOpenChatPaymentQuestionAnswer?.(prompt) || null,
    openChatLooksLowInfoAmbiguousPrompt: (prompt = '', inputCounts = {}) => quick.buildOpenChatLowInfoAmbiguousAnswer?.(prompt, inputCounts) !== null,
    buildOpenChatLowInfoAmbiguousAnswer: (prompt = '', inputCounts = {}) => quick.buildOpenChatLowInfoAmbiguousAnswer?.(prompt, inputCounts) || null,
    quickOrderChatAnswer: (prompt = '', inputCounts = {}) => quick.quickOrderChatAnswer?.(prompt, inputCounts) || null
  };
}
