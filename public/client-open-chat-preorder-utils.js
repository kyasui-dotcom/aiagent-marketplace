import { compactClientText as compactChatText } from './client-text-utils.js?v=20260521a';

export function createClientOpenChatPreorderUtils(options = {}) {
  const getState = typeof options.getState === 'function' ? options.getState : () => ({});
  const getEls = typeof options.getEls === 'function' ? options.getEls : () => ({});
  const normalizeOpenChatIntentText = typeof options.normalizeOpenChatIntentText === 'function'
    ? options.normalizeOpenChatIntentText
    : (value) => String(value || '').trim().toLowerCase();
  const openChatIntentMatchText = typeof options.openChatIntentMatchText === 'function'
    ? options.openChatIntentMatchText
    : (value) => String(value || '').trim().toLowerCase();
  const workOrderUiLabels = typeof options.workOrderUiLabels === 'function'
    ? options.workOrderUiLabels
    : () => ({ sendOrder: 'Send order', revise: 'Revise', addConstraints: 'Add constraints', cancel: 'Cancel' });
  const resolveOpenChatClarifyReply = typeof options.resolveOpenChatClarifyReply === 'function'
    ? options.resolveOpenChatClarifyReply
    : () => '';
  const isStructuredOrderBrief = typeof options.isStructuredOrderBrief === 'function'
    ? options.isStructuredOrderBrief
    : () => false;
  const lastOpenChatPreparedBrief = typeof options.lastOpenChatPreparedBrief === 'function'
    ? options.lastOpenChatPreparedBrief
    : () => '';
  const openChatLastPromptWasOrderDecision = typeof options.openChatLastPromptWasOrderDecision === 'function'
    ? options.openChatLastPromptWasOrderDecision
    : () => false;
  const looksJapanese = typeof options.looksJapanese === 'function' ? options.looksJapanese : () => false;
  const openChatDecisionSeedContext = typeof options.openChatDecisionSeedContext === 'function'
    ? options.openChatDecisionSeedContext
    : () => ({});
  const openChatCanonicalOrderTaskType = typeof options.openChatCanonicalOrderTaskType === 'function'
    ? options.openChatCanonicalOrderTaskType
    : (taskType) => taskType;
  const inferClientTaskSequence = typeof options.inferClientTaskSequence === 'function'
    ? options.inferClientTaskSequence
    : () => [];
  const currentRoutingTask = typeof options.currentRoutingTask === 'function'
    ? options.currentRoutingTask
    : () => '';
  const rewriteStructuredBriefTaskType = typeof options.rewriteStructuredBriefTaskType === 'function'
    ? options.rewriteStructuredBriefTaskType
    : (brief) => brief;
  const buildOpenChatDispatchBriefFromPendingAnswer = typeof options.buildOpenChatDispatchBriefFromPendingAnswer === 'function'
    ? options.buildOpenChatDispatchBriefFromPendingAnswer
    : (original) => original;
  const structuredOrderBriefParts = typeof options.structuredOrderBriefParts === 'function'
    ? options.structuredOrderBriefParts
    : () => ({});
  const openChatHumanDispatchPreview = typeof options.openChatHumanDispatchPreview === 'function'
    ? options.openChatHumanDispatchPreview
    : () => '';
  const latestOpenChatAgentConfirmationBody = typeof options.latestOpenChatAgentConfirmationBody === 'function'
    ? options.latestOpenChatAgentConfirmationBody
    : () => '';
  const openChatPreserveSeedTaskType = typeof options.openChatPreserveSeedTaskType === 'function'
    ? options.openChatPreserveSeedTaskType
    : (_brief, taskType) => taskType;
  const openChatPreviousUserMessageBody = typeof options.openChatPreviousUserMessageBody === 'function'
    ? options.openChatPreviousUserMessageBody
    : () => '';
  const openChatLocalUserConversationText = typeof options.openChatLocalUserConversationText === 'function'
    ? options.openChatLocalUserConversationText
    : () => '';
  const openChatPreviousAgentMessageBody = typeof options.openChatPreviousAgentMessageBody === 'function'
    ? options.openChatPreviousAgentMessageBody
    : () => '';
  const acceptPreparedOpenChatOrderForDispatch = typeof options.acceptPreparedOpenChatOrderForDispatch === 'function'
    ? options.acceptPreparedOpenChatOrderForDispatch
    : () => null;
  const orderInputCounts = typeof options.orderInputCounts === 'function' ? options.orderInputCounts : () => ({});
  const orderInputFromComposer = typeof options.orderInputFromComposer === 'function'
    ? options.orderInputFromComposer
    : () => null;
  const createAndOptionallyRunJob = typeof options.createAndOptionallyRunJob === 'function'
    ? options.createAndOptionallyRunJob
    : async () => {};
  const renderOpenChatChoiceBar = typeof options.renderOpenChatChoiceBar === 'function'
    ? options.renderOpenChatChoiceBar
    : () => {};
  const appendOrderChatExchange = typeof options.appendOrderChatExchange === 'function'
    ? options.appendOrderChatExchange
    : () => {};
  const flash = typeof options.flash === 'function' ? options.flash : () => {};
  const markOpenChatDecisionSuppressedForBrief = typeof options.markOpenChatDecisionSuppressedForBrief === 'function'
    ? options.markOpenChatDecisionSuppressedForBrief
    : () => {};

  function openChatChoiceReplyToken(prompt = '') {
    return String(prompt || '')
      .normalize('NFKC')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^[#\s]+/, '')
      .replace(/[.．。、):：\s]+$/g, '')
      .toLowerCase();
  }

  function openChatChoiceNormalizedLabel(label = '') {
    return normalizeOpenChatIntentText(label).replace(/\s+/g, '');
  }

  function openChatLooksNegativeOrderChoice(prompt = '') {
    const token = openChatChoiceReplyToken(prompt);
    const text = openChatIntentMatchText(prompt);
    if (!token) return false;
    return /(?:^| )(?:しない|やめる|中止|取消|取り消し|キャンセル|しません|later|not now|cancel|abort|do not|don't|stop)(?: |$)/i.test(token)
      || /(?:しない|やめる|中止|取消|取り消し|キャンセル|later|not now|cancel|abort|do not|don't|stop)/i.test(text);
  }

  function openChatLooksConfirmOrderChoice(prompt = '') {
    const token = openChatChoiceReplyToken(prompt);
    const sendLabelNormalized = openChatChoiceNormalizedLabel(workOrderUiLabels().sendOrder);
    if (!token) return false;
    if (openChatLooksNegativeOrderChoice(prompt)) return false;
    if (/^(?:1|発注する|発注|注文する|注文|send order|order|dispatch|execute|run|proceed)$/i.test(token)) return true;
    return Boolean(sendLabelNormalized) && (token === sendLabelNormalized || token === `1 ${sendLabelNormalized}`);
  }

  function openChatLooksReviseOrderChoice(prompt = '') {
    const token = openChatChoiceReplyToken(prompt);
    const labels = workOrderUiLabels();
    const reviseLabelNormalized = openChatChoiceNormalizedLabel(labels.revise);
    const addConstraintsNormalized = openChatChoiceNormalizedLabel(labels.addConstraints);
    if (!token) return false;
    if (openChatLooksNegativeOrderChoice(prompt)) return false;
    if (/^(?:2|修正する|修正|条件を修正|条件追加|条件|add constraints|revise|edit|change|modify)$/i.test(token)) return true;
    return (Boolean(reviseLabelNormalized) && (token === reviseLabelNormalized || token === `2 ${reviseLabelNormalized}`))
      || (Boolean(addConstraintsNormalized) && (token === addConstraintsNormalized || token === `2 ${addConstraintsNormalized}`));
  }

  function openChatLooksCancelOrderChoice(prompt = '') {
    const token = openChatChoiceReplyToken(prompt);
    const cancelLabelNormalized = openChatChoiceNormalizedLabel(workOrderUiLabels().cancel);
    if (!token) return false;
    return /^(?:3|キャンセル|やめる|中止|取消|取り消し|cancel|stop|abort|never mind)$/i.test(token)
      || (Boolean(cancelLabelNormalized) && (token === cancelLabelNormalized || token === `3 ${cancelLabelNormalized}`));
  }

  function openChatOrderDecisionBlock(ja = false) {
    const labels = workOrderUiLabels();
    return ja
      ? [
        '次のどれかを選んでください。番号だけでも大丈夫です。',
        `1. 発注する: ${labels.sendOrder}でAgentに送る`,
        '2. 条件を修正する: 追加条件をこのチャットに書く',
        '3. キャンセル: 下書きを破棄する'
      ].join('\n')
      : [
        'Choose the next step. A number is enough.',
        `1. Send order: dispatch to the agent with ${labels.sendOrder}`,
        `2. ${labels.revise}: write the extra constraint here`,
        `3. ${labels.cancel}: discard this draft`
      ].join('\n');
  }

  function openChatPreorderDecisionCommand(prompt = '') {
    const clarified = resolveOpenChatClarifyReply(prompt);
    if (['confirm_preorder_order', 'revise_preorder_order', 'cancel_preorder_order'].includes(clarified)) return clarified;
    if (isStructuredOrderBrief(lastOpenChatPreparedBrief())) {
      if (openChatLooksConfirmOrderChoice(prompt)) return 'confirm_preorder_order';
      if (openChatLooksReviseOrderChoice(prompt)) return 'revise_preorder_order';
      if (openChatLooksCancelOrderChoice(prompt)) return 'cancel_preorder_order';
    }
    if (!openChatLastPromptWasOrderDecision()) return '';
    if (openChatLooksConfirmOrderChoice(prompt)) return 'confirm_preorder_order';
    if (openChatLooksReviseOrderChoice(prompt)) return 'revise_preorder_order';
    if (openChatLooksCancelOrderChoice(prompt)) return 'cancel_preorder_order';
    return '';
  }

  function openChatPreorderClarifyOptions(optionsList = [], ja = false) {
    const labelsUi = workOrderUiLabels();
    const labels = Array.isArray(optionsList)
      ? optionsList.map((option) => compactChatText(String(option?.label || option?.description || option || ''), 120)).filter(Boolean)
      : [];
    const hasOrderOption = labels.some((label) => openChatLooksConfirmOrderChoice(label));
    if (!hasOrderOption) return [];
    return [
      {
        command: 'confirm_preorder_order',
        labelJa: '発注する',
        labelEn: labelsUi.sendOrder,
        terms: ['1', '発注', '発注する', '注文', '実行', 'send order', 'order', 'dispatch', 'execute']
      },
      {
        command: 'revise_preorder_order',
        labelJa: '条件を修正する',
        labelEn: labelsUi.revise,
        terms: ['2', '修正', '条件', '制約', '追加', 'add constraints', 'revise', 'edit', 'modify']
      },
      {
        command: 'cancel_preorder_order',
        labelJa: 'キャンセル',
        labelEn: labelsUi.cancel,
        terms: ['3', 'キャンセル', '中止', 'やめる', 'cancel', 'stop', 'abort']
      }
    ].map((option) => ({
      ...option,
      label: ja ? option.labelJa : option.labelEn
    }));
  }

  function composeOpenChatPreorderConfirmResponse(original = '', prompt = '', inputCounts = {}) {
    const ja = looksJapanese(original) || looksJapanese(prompt);
    const seed = openChatDecisionSeedContext(original);
    const source = String(seed.prompt || original || prompt || '').trim();
    const taskType = openChatCanonicalOrderTaskType(seed.taskType || '', source)
      || openChatCanonicalOrderTaskType(inferClientTaskSequence('', source)[0], source)
      || currentRoutingTask()
      || 'research';
    const confirmationContext = ja
      ? 'ユーザーはこの方向で発注すると確認しました。会話内で不足する情報は同じ質問を繰り返さず、納品内で仮定として明記してください。'
      : 'The user confirmed this should become an order. Do not repeat the same questions; if details are missing, state assumptions in the delivery.';
    const brief = isStructuredOrderBrief(source)
      ? rewriteStructuredBriefTaskType(source, taskType)
      : buildOpenChatDispatchBriefFromPendingAnswer(source, confirmationContext, taskType, inputCounts);
    const finalTaskType = openChatCanonicalOrderTaskType(structuredOrderBriefParts(brief).taskType, brief) || taskType || 'research';
    const previewBlock = openChatHumanDispatchPreview(brief, finalTaskType, `${source}\n${original}\n${prompt}`, inputCounts);
    return {
      kind: 'assist',
      tone: 'ok',
      patternId: 'pattern_preorder_confirm_order',
      nextPrompt: brief,
      clearVagueChoice: true,
      clearNaturalChoice: true,
      clearClarifyOptions: true,
      clearPinnedAgent: true,
      skipOpenAiPolish: true,
      body: ja
        ? [
          '発注する意図として受け取りました。',
          '確認段階なので、ここでは意図を再判定せず、このまま注文確認へ進めます。まだ実行も課金もしていません。',
          '',
          previewBlock,
          '',
          '内容が合っていれば、そのまま SEND ORDER してください。修正する場合は追加条件をこのまま書いてください。'
        ].join('\n')
        : [
          'I read this as confirmation to order.',
          'At this confirmation step, I will not reclassify the choice. Nothing has run or been billed yet.',
          '',
          previewBlock,
          '',
          'If this looks right, press SEND ORDER now. If anything should change, write the extra condition here.'
        ].join('\n'),
      status: 'Order confirmation accepted locally.\n\nPress SEND ORDER to dispatch, or write a revision in chat.'
    };
  }

  function buildOpenChatConfirmedDispatchDraft(original = '', inputCounts = {}) {
    const seed = openChatDecisionSeedContext(original);
    const source = String(seed.prompt || original || '').trim();
    const confirmationBody = latestOpenChatAgentConfirmationBody();
    const taskType = openChatPreserveSeedTaskType([source, confirmationBody].filter(Boolean).join('\n'), seed.taskType);
    const ja = looksJapanese(source) || looksJapanese(original);
    const confirmationContext = ja
      ? 'ユーザーはこの方向で発注すると確認しました。会話内で不足する情報は同じ質問を繰り返さず、納品内で仮定として明記してください。'
      : 'The user confirmed this should become an order. Do not repeat the same questions; if details are missing, state assumptions in the delivery.';
    const clarificationContext = [confirmationContext, confirmationBody].filter(Boolean).join('\n\n');
    const brief = isStructuredOrderBrief(source)
      ? rewriteStructuredBriefTaskType(source, taskType)
      : buildOpenChatDispatchBriefFromPendingAnswer(source, clarificationContext, taskType, inputCounts);
    const finalTaskType = openChatPreserveSeedTaskType(brief, structuredOrderBriefParts(brief).taskType || taskType);
    return {
      prompt: isStructuredOrderBrief(brief) ? rewriteStructuredBriefTaskType(brief, finalTaskType) : brief,
      taskType: finalTaskType
    };
  }

  function composeOpenChatPreorderCancelResponse(ja = false) {
    return {
      kind: 'command',
      command: 'reset_chat',
      tone: 'info',
      patternId: 'pattern_preorder_cancel_order',
      body: ja
        ? 'キャンセルしました。下書きと確認状態をクリアしました。別件があればそのまま書いてください。'
        : 'Canceled. I cleared the draft and confirmation state. Write a new request when ready.',
      nextPrompt: '',
      status: 'Order prep canceled.\n\nNo order was created and no billing occurred.'
    };
  }

  function composeOpenChatPreorderReviseResponse(original = '', intent = '', ja = false) {
    return {
      kind: 'clarify',
      tone: 'info',
      patternId: 'pattern_preorder_revise_order',
      vagueChoicePrompt: original,
      naturalChoiceIntent: intent,
      clearClarifyOptions: true,
      body: ja
        ? [
          '条件修正として受け取りました。',
          '',
          '追加・変更したい条件をそのまま書いてください。例: 対象URL、対象ユーザー、成果物、予算、期限、使いたい媒体。',
          '',
          '修正内容を受け取ったら、同じ会話内の文脈を使ってSEND ORDER用の内容に反映します。まだ注文も課金も発生しません。'
        ].join('\n')
        : [
          'I read this as a request to revise conditions.',
          '',
          'Write the conditions to add or change: URL, audience, deliverable, budget, deadline, or channels.',
          '',
          'After that, I will use this chat context and update the SEND ORDER-ready draft. No order or billing happens yet.'
        ].join('\n'),
      status: 'Waiting for revised conditions.\n\nNo order was created and no billing occurred.'
    };
  }

  function openChatDecisionOriginalPrompt() {
    const state = getState();
    return String(
      state.openChatVagueChoicePrompt
      || state.openChatLeaderIntakePrompt
      || state.openChatPendingQuestionPrompt
      || openChatPreviousUserMessageBody()
      || openChatLocalUserConversationText('')
      || ''
    ).trim();
  }

  async function dispatchOpenChatConfirmedChoice() {
    const state = getState();
    const els = getEls();
    state.openChatDecisionSuppressed = true;
    state.openChatClarifyOptions = [];
    const prepared = lastOpenChatPreparedBrief();
    const inputCounts = orderInputCounts(orderInputFromComposer());
    if (acceptPreparedOpenChatOrderForDispatch(prepared)) {
      renderOpenChatChoiceBar();
      await createAndOptionallyRunJob();
      return;
    }

    const original = openChatDecisionOriginalPrompt();
    const ja = looksJapanese(original) || looksJapanese(openChatPreviousAgentMessageBody());
    const confirmed = buildOpenChatConfirmedDispatchDraft(original, inputCounts);
    if (!confirmed.prompt || !isStructuredOrderBrief(confirmed.prompt)) {
    appendOrderChatExchange(ja ? '発注する' : 'send order', {
        kind: 'clarify',
        tone: 'warn',
        patternId: 'pattern_preorder_missing_brief',
        clearClarifyOptions: true,
        body: ja
          ? [
              '発注の意図は受け取りましたが、実行用ブリーフが不足しています。',
              '',
              '対象・目的・制約を1文で追記してください。整い次第すぐ実行確認へ進みます。'
            ].join('\n')
          : [
              'I received your confirmation to order, but the runnable brief is still incomplete.',
              '',
              'Add target, outcome, and constraints in one short line. Then I will move straight to execution checks.'
            ].join('\n'),
        status: 'Need one more detail before dispatch.'
      });
      state.openChatDecisionSuppressed = true;
      state.openChatClarifyOptions = [];
      renderOpenChatChoiceBar();
      return;
    }
    state.openChatPreparedBrief = confirmed.prompt;
    markOpenChatDecisionSuppressedForBrief(confirmed.prompt);
    state.openChatClarifyOptions = [];
    state.pendingOrderConfirmation = {
      accepted: true,
      agentId: '',
      acceptedAt: new Date().toISOString()
    };
    if (els.jobPrompt) els.jobPrompt.value = '';
    flash(ja ? '発注確認を受け付けました。実行前チェックへ進みます。' : 'Order confirmation accepted. Moving to pre-dispatch checks.', 'info');
    renderOpenChatChoiceBar();
    await createAndOptionallyRunJob();
  }

  function enterOpenChatRevisionChoice() {
    const state = getState();
    const els = getEls();
    state.openChatDecisionSuppressed = true;
    state.openChatClarifyOptions = [];
    const ja = looksJapanese(openChatPreviousAgentMessageBody());
    renderOpenChatChoiceBar();
    if (els.jobPrompt) {
      els.jobPrompt.value = '';
      els.jobPrompt.placeholder = ja ? '変更したい条件をそのまま書いてください' : 'Write the condition to change';
      els.jobPrompt.focus();
    }
    flash(ja ? '変更したい条件をチャットに書いてください。' : 'Write the condition to change in chat.', 'info');
  }

  return {
    openChatLooksConfirmOrderChoice,
    openChatLooksReviseOrderChoice,
    openChatLooksCancelOrderChoice,
    openChatOrderDecisionBlock,
    openChatPreorderDecisionCommand,
    openChatPreorderClarifyOptions,
    composeOpenChatPreorderConfirmResponse,
    buildOpenChatConfirmedDispatchDraft,
    composeOpenChatPreorderCancelResponse,
    composeOpenChatPreorderReviseResponse,
    openChatDecisionOriginalPrompt,
    dispatchOpenChatConfirmedChoice,
    enterOpenChatRevisionChoice
  };
}
