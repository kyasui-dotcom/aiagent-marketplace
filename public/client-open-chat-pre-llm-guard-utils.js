export function createClientOpenChatPreLlmGuardUtils(options = {}) {
  const getState = typeof options.getState === 'function' ? options.getState : () => ({});
  const chatAnswerBody = typeof options.chatAnswerBody === 'function' ? options.chatAnswerBody : () => '';
  const chatAnswerKind = typeof options.chatAnswerKind === 'function' ? options.chatAnswerKind : () => '';
  const openChatLooksGreetingPrompt = typeof options.openChatLooksGreetingPrompt === 'function' ? options.openChatLooksGreetingPrompt : () => false;
  const openChatLooksLowInfoTestPrompt = typeof options.openChatLooksLowInfoTestPrompt === 'function' ? options.openChatLooksLowInfoTestPrompt : () => false;
  const isStructuredOrderBrief = typeof options.isStructuredOrderBrief === 'function' ? options.isStructuredOrderBrief : () => false;
  const structuredOrderBriefParts = typeof options.structuredOrderBriefParts === 'function' ? options.structuredOrderBriefParts : () => ({});
  const inferClientTaskSequence = typeof options.inferClientTaskSequence === 'function' ? options.inferClientTaskSequence : () => [];
  const currentRoutingTask = typeof options.currentRoutingTask === 'function' ? options.currentRoutingTask : () => '';
  const openChatLooksStandaloneQuestionText = typeof options.openChatLooksStandaloneQuestionText === 'function' ? options.openChatLooksStandaloneQuestionText : () => false;
  const openChatProductQuestionContext = typeof options.openChatProductQuestionContext === 'function' ? options.openChatProductQuestionContext : () => false;
  const openChatPromptInjectionGuard = typeof options.openChatPromptInjectionGuard === 'function' ? options.openChatPromptInjectionGuard : () => ({ blocked: false });
  const openChatLooksSensitiveSecret = typeof options.openChatLooksSensitiveSecret === 'function' ? options.openChatLooksSensitiveSecret : () => false;
  const openChatLooksUnsafeRequest = typeof options.openChatLooksUnsafeRequest === 'function' ? options.openChatLooksUnsafeRequest : () => false;
  const looksJapanese = typeof options.looksJapanese === 'function' ? options.looksJapanese : () => false;
  const openChatNormalizeDispatchTask = typeof options.openChatNormalizeDispatchTask === 'function' ? options.openChatNormalizeDispatchTask : (taskType) => taskType;
  const openChatLooksOrderIntentOnly = typeof options.openChatLooksOrderIntentOnly === 'function' ? options.openChatLooksOrderIntentOnly : () => false;
  const lastOpenChatPreparedBrief = typeof options.lastOpenChatPreparedBrief === 'function' ? options.lastOpenChatPreparedBrief : () => '';
  const mergeClarificationAnswersIntoBrief = typeof options.mergeClarificationAnswersIntoBrief === 'function' ? options.mergeClarificationAnswersIntoBrief : (brief) => brief;
  const buildOpenChatDispatchBriefFromPendingAnswer = typeof options.buildOpenChatDispatchBriefFromPendingAnswer === 'function' ? options.buildOpenChatDispatchBriefFromPendingAnswer : () => '';
  const openChatReadinessBlock = typeof options.openChatReadinessBlock === 'function' ? options.openChatReadinessBlock : () => '';
  const openChatHumanDispatchPreview = typeof options.openChatHumanDispatchPreview === 'function' ? options.openChatHumanDispatchPreview : () => '';
  const cleanOpenChatClarificationAnswer = typeof options.cleanOpenChatClarificationAnswer === 'function' ? options.cleanOpenChatClarificationAnswer : (value) => String(value || '').trim();
  const openChatReadyToRunBlock = typeof options.openChatReadyToRunBlock === 'function' ? options.openChatReadyToRunBlock : () => '';
  const openChatPendingLeaderIntakeContext = typeof options.openChatPendingLeaderIntakeContext === 'function' ? options.openChatPendingLeaderIntakeContext : () => null;
  const openChatChoiceReplyToken = typeof options.openChatChoiceReplyToken === 'function' ? options.openChatChoiceReplyToken : () => '';
  const isOpenChatRunConfirmation = typeof options.isOpenChatRunConfirmation === 'function' ? options.isOpenChatRunConfirmation : () => false;
  const openChatFollowupMode = typeof options.openChatFollowupMode === 'function' ? options.openChatFollowupMode : () => '';
  const isOpenChatGenericProceed = typeof options.isOpenChatGenericProceed === 'function' ? options.isOpenChatGenericProceed : () => false;
  const buildOpenChatLeaderChoiceAnswer = typeof options.buildOpenChatLeaderChoiceAnswer === 'function' ? options.buildOpenChatLeaderChoiceAnswer : () => null;
  const buildOpenChatLeaderChoiceFollowupAnswer = typeof options.buildOpenChatLeaderChoiceFollowupAnswer === 'function' ? options.buildOpenChatLeaderChoiceFollowupAnswer : () => null;
  const buildOpenChatPromptInjectionAnswer = typeof options.buildOpenChatPromptInjectionAnswer === 'function' ? options.buildOpenChatPromptInjectionAnswer : () => null;
  const buildOpenChatLongPromptGuardAnswer = typeof options.buildOpenChatLongPromptGuardAnswer === 'function' ? options.buildOpenChatLongPromptGuardAnswer : () => null;
  const buildOpenChatRecoveredLeaderIntakeAnswer = typeof options.buildOpenChatRecoveredLeaderIntakeAnswer === 'function' ? options.buildOpenChatRecoveredLeaderIntakeAnswer : () => null;
  const buildOpenChatLeaderIntakeFollowupAnswer = typeof options.buildOpenChatLeaderIntakeFollowupAnswer === 'function' ? options.buildOpenChatLeaderIntakeFollowupAnswer : () => null;
  const buildOpenChatPatternGuardAnswer = typeof options.buildOpenChatPatternGuardAnswer === 'function' ? options.buildOpenChatPatternGuardAnswer : () => null;
  const buildOpenChatPauseAnswer = typeof options.buildOpenChatPauseAnswer === 'function' ? options.buildOpenChatPauseAnswer : () => null;
  const buildOpenChatStatusAnswer = typeof options.buildOpenChatStatusAnswer === 'function' ? options.buildOpenChatStatusAnswer : () => null;
  const buildOpenChatLowInfoTestAnswer = typeof options.buildOpenChatLowInfoTestAnswer === 'function' ? options.buildOpenChatLowInfoTestAnswer : () => null;
  const buildOpenChatGreetingAnswer = typeof options.buildOpenChatGreetingAnswer === 'function' ? options.buildOpenChatGreetingAnswer : () => null;
  const buildOpenChatIntentShiftFollowup = typeof options.buildOpenChatIntentShiftFollowup === 'function' ? options.buildOpenChatIntentShiftFollowup : () => null;
  const buildOpenChatIdeaOperatorFollowup = typeof options.buildOpenChatIdeaOperatorFollowup === 'function' ? options.buildOpenChatIdeaOperatorFollowup : () => null;
  const buildOpenChatNaturalChoiceFollowup = typeof options.buildOpenChatNaturalChoiceFollowup === 'function' ? options.buildOpenChatNaturalChoiceFollowup : () => null;
  const buildOpenChatVagueChoiceFollowup = typeof options.buildOpenChatVagueChoiceFollowup === 'function' ? options.buildOpenChatVagueChoiceFollowup : () => null;
  const buildOpenChatPendingChoiceReminder = typeof options.buildOpenChatPendingChoiceReminder === 'function' ? options.buildOpenChatPendingChoiceReminder : () => null;
  const buildOpenChatLeaderCatalogAnswer = typeof options.buildOpenChatLeaderCatalogAnswer === 'function' ? options.buildOpenChatLeaderCatalogAnswer : () => null;
  const buildOpenChatRunConfirmationAnswer = typeof options.buildOpenChatRunConfirmationAnswer === 'function' ? options.buildOpenChatRunConfirmationAnswer : () => null;
  const buildOpenChatCommandAnswer = typeof options.buildOpenChatCommandAnswer === 'function' ? options.buildOpenChatCommandAnswer : () => null;
  const buildOpenChatFollowupAnswer = typeof options.buildOpenChatFollowupAnswer === 'function' ? options.buildOpenChatFollowupAnswer : () => null;
  const buildOpenChatLeaderIntakeAnswer = typeof options.buildOpenChatLeaderIntakeAnswer === 'function' ? options.buildOpenChatLeaderIntakeAnswer : () => null;
  const openChatIntentMatchText = typeof options.openChatIntentMatchText === 'function' ? options.openChatIntentMatchText : (value) => String(value || '').trim().toLowerCase();
  const openChatLooksGeneralHelpPrompt = typeof options.openChatLooksGeneralHelpPrompt === 'function' ? options.openChatLooksGeneralHelpPrompt : () => false;
  const openChatMustUseLlmFallback = typeof options.openChatMustUseLlmFallback === 'function' ? options.openChatMustUseLlmFallback : () => false;
  const shouldDeferOpenChatCommandForAnswer = typeof options.shouldDeferOpenChatCommandForAnswer === 'function' ? options.shouldDeferOpenChatCommandForAnswer : () => false;
  const openChatCommandMode = typeof options.openChatCommandMode === 'function' ? options.openChatCommandMode : () => false;
  const openChatLooksHighStakesAdvice = typeof options.openChatLooksHighStakesAdvice === 'function' ? options.openChatLooksHighStakesAdvice : () => false;

  function openChatPendingQuestionContext() {
    const state = getState();
    const prompt = String(state.openChatPendingQuestionPrompt || '').trim();
    if (!prompt) return null;
    return {
      prompt,
      taskType: String(state.openChatPendingQuestionTask || '').trim(),
      patternId: String(state.openChatPendingQuestionPattern || '').trim()
    };
  }

  function openChatAnswerAsksUserQuestion(answer) {
    const body = chatAnswerBody(answer);
    if (!body) return false;
    return /(確認質問|発注前に確認できること|追加すると良い情報|不足分だけ聞きます|先にこれを教えてください|このまま返信|次の形で送ってください|教えてください|送ってください|短く追記してください|Useful details to confirm|Useful additions|Clarifying questions|Please answer these first|reply with missing constraints|Please send|Please add|Add one sentence|I will not repeat the whole intake)/i.test(body)
      || /(?:\n|^)\s*(?:1|１)[\).．、:：]\s+.{4,}/.test(body);
  }

  function shouldStoreOpenChatPendingQuestion(prompt = '', answer = null) {
    const kind = chatAnswerKind(answer);
    if (!['clarify', 'assist'].includes(kind)) return false;
    if (answer?.clearPendingQuestion || answer?.clearLeaderIntake) return false;
    if (answer?.leaderIntakePrompt || answer?.leaderIntakeTask) return false;
    if (answer?.vagueChoicePrompt || answer?.naturalChoiceIntent || answer?.intentShiftPrompt || answer?.ideaBacklogPrompt) return false;
    if (Array.isArray(answer?.options) && answer.options.length) return false;
    if (!openChatAnswerAsksUserQuestion(answer)) return false;
    const source = String(answer?.nextPrompt || prompt || '').trim();
    if (!source || openChatLooksGreetingPrompt(source) || openChatLooksLowInfoTestPrompt(source)) return false;
    return true;
  }

  function openChatPendingQuestionTaskType(prompt = '', answer = null) {
    const explicit = String(answer?.pendingQuestionTask || '').trim();
    if (explicit) return explicit;
    const source = String(answer?.nextPrompt || prompt || '').trim();
    const parts = isStructuredOrderBrief(source) ? structuredOrderBriefParts(source) : {};
    return parts.taskType || inferClientTaskSequence('', source)[0] || currentRoutingTask() || 'research';
  }

  function resolveOpenChatPendingQuestionFollowup(prompt = '', inputCounts = {}) {
    const state = getState();
    const pending = openChatPendingQuestionContext();
    const answer = String(prompt || '').trim();
    if (!pending || !answer || isStructuredOrderBrief(answer)) return null;
    if (state.openChatLeaderIntakePrompt || state.openChatVagueChoicePrompt || state.openChatNaturalChoiceIntent || state.openChatIntentShiftPrompt || state.openChatIdeaBacklogPrompt) return null;
    if (/^[0-9０-９]+$/.test(answer) && Array.isArray(state.openChatClarifyOptions) && state.openChatClarifyOptions.length) return null;
    const questionLikeAnswer = openChatLooksStandaloneQuestionText(answer);
    const asksStandaloneProductQuestion = openChatProductQuestionContext(answer) && questionLikeAnswer;
    if (openChatLooksGreetingPrompt(answer) || openChatLooksLowInfoTestPrompt(answer) || asksStandaloneProductQuestion) return null;
    if (openChatPromptInjectionGuard(answer).blocked || openChatLooksSensitiveSecret(answer) || openChatLooksUnsafeRequest(answer)) return null;

    const ja = looksJapanese(answer) || looksJapanese(pending.prompt);
    const taskType = pending.taskType || inferClientTaskSequence('', pending.prompt)[0] || currentRoutingTask() || 'research';
    const dispatchTask = openChatNormalizeDispatchTask(taskType, pending.prompt, answer);
    if (openChatLooksOrderIntentOnly(answer)) {
      return {
        kind: 'clarify',
        tone: 'info',
        patternId: 'pattern_pending_order_intent_only',
        pendingQuestionPrompt: pending.prompt,
        pendingQuestionTask: dispatchTask,
        pendingQuestionPattern: pending.patternId || 'pattern_pending_order_intent_only',
        body: ja
          ? [
            '対応するオーダーに繋ぎます。まだ実行も課金もしていません。',
            '',
            `接続先: ${dispatchTask || 'matching agent'}`,
            '',
            'ただ、今のままだとAgentに渡す中身が薄く、納品の方向がぶれます。',
            '次のうち分かる範囲だけ1行で足してください。',
            '',
            '1. 対象URLまたは商材/サービス内容',
            '2. 誰に使ってほしいか、誰を集めたいか',
            '3. 何を増やしたいか。例: 登録、購入、問い合わせ、認知',
            '4. 制約。例: 広告費なし、英語、日本向け、今週中',
            '',
            '具体になったら「この指示をAgentに繋ぎます。修正があれば言ってください」という形で確認します。'
          ].join('\n')
          : [
            'I will connect this to the matching order. Nothing has run or been billed yet.',
            '',
            `Route: ${dispatchTask || 'matching agent'}`,
            '',
            'Right now the agent handoff is still too thin, so the delivery could drift.',
            'Add any of these in one line:',
            '',
            '1. Target URL or product/service',
            '2. Audience or customer to attract',
            '3. Desired outcome: signups, purchases, leads, awareness',
            '4. Constraints: no paid ads, English, Japan, this week',
            '',
            'Once concrete enough, I will confirm: this instruction will be handed to the agent; tell me if anything should change.'
          ].join('\n'),
        status: 'Order intent received, but more context is needed.\n\nNo order was created and no billing occurred.'
      };
    }
    const usefulShortAnswer = /(なし|特になし|任せ|おまかせ|日本|英語|日本語|表|箇条|無料|広告費|https?:\/\/|\d|none|n\/a|up to you|japan|english|table|free|organic)/i.test(answer);
    if (answer.replace(/\s+/g, '').length < 6 && !usefulShortAnswer) {
      return {
        kind: 'clarify',
        tone: 'warn',
        patternId: 'pattern_pending_question_followup',
        pendingQuestionPrompt: pending.prompt,
        pendingQuestionTask: taskType,
        pendingQuestionPattern: pending.patternId || 'pattern_pending_question_followup',
        body: ja
          ? [
            '受け取りました。まだ反映先が曖昧なので、条件をもう一つだけ足してください。',
            '',
            '同じ質問は繰り返しません。',
            '例: 対象URL、対象ユーザー、欲しい成果、制約、納品形式のどれか1つ。',
            '',
            'まだ注文も課金も発生しません。'
          ].join('\n')
          : [
            'I received it, but it is still too thin to merge cleanly into the draft.',
            '',
            'I will not repeat the same question block.',
            'Add one more detail such as the target URL, audience, desired outcome, constraint, or delivery format.',
            '',
            'No order or billing happens yet.'
          ].join('\n'),
        status: 'Need one more detail before SEND ORDER.'
      };
    }

    const previousBrief = isStructuredOrderBrief(pending.prompt)
      ? pending.prompt
      : (isStructuredOrderBrief(lastOpenChatPreparedBrief()) ? lastOpenChatPreparedBrief() : '');
    const nextBrief = previousBrief
      ? mergeClarificationAnswersIntoBrief(previousBrief, answer)
      : buildOpenChatDispatchBriefFromPendingAnswer(pending.prompt, answer, taskType, inputCounts);
    const nextTaskType = structuredOrderBriefParts(nextBrief).taskType || dispatchTask || taskType;
    const readinessBlock = openChatReadinessBlock(nextTaskType, nextBrief, inputCounts, { ja });
    const previewBlock = openChatHumanDispatchPreview(nextBrief, nextTaskType, `${pending.prompt}\n${answer}`, inputCounts);
    return {
      kind: 'assist',
      tone: 'ok',
      patternId: 'pattern_pending_question_followup',
      nextPrompt: nextBrief,
      clearPendingQuestion: true,
      clearClarifyOptions: true,
      body: ja
        ? [
          '前回の質問への回答として反映しました。同じ質問は繰り返しません。',
          '',
          previewBlock,
          '',
          '反映した回答:',
          cleanOpenChatClarificationAnswer(answer),
          '',
          readinessBlock,
          '',
          openChatReadyToRunBlock(true),
          '',
          'さらに条件を足す場合はそのまま追記してください。実行する場合だけログインして SEND ORDER してください。'
        ].join('\n')
        : [
          'I merged this as the answer to the previous question. I will not repeat the same question block.',
          '',
          previewBlock,
          '',
          'Merged answer:',
          cleanOpenChatClarificationAnswer(answer),
          '',
          readinessBlock,
          '',
          openChatReadyToRunBlock(false),
          '',
          'Add more constraints here if needed, or sign in and press SEND ORDER only when you want paid dispatch.'
        ].join('\n'),
      status: 'Question answer merged into draft.\n\nNo order was created and no billing occurred.'
    };
  }

  function openChatHasActiveLocalFollowupState(prompt = '') {
    const state = getState();
    const text = String(prompt || '').replace(/\s+/g, ' ').trim();
    if (!text) return false;
    if (openChatPendingLeaderIntakeContext() || state.openChatLeaderChoicePrompt || state.openChatPendingQuestionPrompt || state.openChatIntentShiftPrompt || state.openChatIdeaBacklogPrompt) return true;
    if (state.openChatVagueChoicePrompt || state.openChatNaturalChoiceIntent) return true;
    if (/^[0-9A-Da-d]$/.test(openChatChoiceReplyToken(text)) && Array.isArray(state.openChatClarifyOptions) && state.openChatClarifyOptions.length) return true;
    if (lastOpenChatPreparedBrief() && (isOpenChatRunConfirmation(text) || openChatFollowupMode(text) || isOpenChatGenericProceed(text))) return true;
    return false;
  }

  function resolveOpenChatLocalPriority(prompt = '', inputCounts = {}) {
    const text = String(prompt || '').trim();
    if (!text) return null;
    const promptInjectionAnswer = buildOpenChatPromptInjectionAnswer(text);
    if (promptInjectionAnswer) return promptInjectionAnswer;
    const longPromptAnswer = buildOpenChatLongPromptGuardAnswer(text, inputCounts);
    if (longPromptAnswer) return longPromptAnswer;
    if (isStructuredOrderBrief(text)) return null;
    const compact = text.replace(/\s+/g, ' ').trim();
    const pauseAnswer = buildOpenChatPauseAnswer(compact);
    if (pauseAnswer) return pauseAnswer;
    const statusAnswer = buildOpenChatStatusAnswer(compact);
    if (statusAnswer) return statusAnswer;
    const recoveredLeaderIntakeAnswer = buildOpenChatRecoveredLeaderIntakeAnswer(compact, inputCounts);
    if (recoveredLeaderIntakeAnswer) return recoveredLeaderIntakeAnswer;
    const leaderIntakeFollowupAnswer = buildOpenChatLeaderIntakeFollowupAnswer(compact, inputCounts);
    if (leaderIntakeFollowupAnswer) return leaderIntakeFollowupAnswer;
    const leaderChoiceFollowupAnswer = buildOpenChatLeaderChoiceFollowupAnswer(compact, inputCounts);
    if (leaderChoiceFollowupAnswer) return leaderChoiceFollowupAnswer;
    const leaderChoiceAnswer = buildOpenChatLeaderChoiceAnswer(compact, inputCounts);
    if (leaderChoiceAnswer) return leaderChoiceAnswer;
    const pendingQuestionFollowupAnswer = resolveOpenChatPendingQuestionFollowup(compact, inputCounts);
    if (pendingQuestionFollowupAnswer) return pendingQuestionFollowupAnswer;
    const precommandPatternAnswer = buildOpenChatPatternGuardAnswer(compact, inputCounts, { phase: 'precommand' });
    if (precommandPatternAnswer) return precommandPatternAnswer;
    const lowInfoTestAnswer = buildOpenChatLowInfoTestAnswer(compact);
    if (lowInfoTestAnswer) return lowInfoTestAnswer;
    const greetingAnswer = buildOpenChatGreetingAnswer(compact);
    if (greetingAnswer) return greetingAnswer;
    const intentShiftFollowup = buildOpenChatIntentShiftFollowup(compact, inputCounts);
    if (intentShiftFollowup) return intentShiftFollowup;
    const ideaOperatorFollowup = buildOpenChatIdeaOperatorFollowup(compact, inputCounts);
    if (ideaOperatorFollowup) return ideaOperatorFollowup;
    const naturalChoiceFollowup = buildOpenChatNaturalChoiceFollowup(compact, inputCounts);
    if (naturalChoiceFollowup) return naturalChoiceFollowup;
    const vagueChoiceFollowup = buildOpenChatVagueChoiceFollowup(compact, inputCounts);
    if (vagueChoiceFollowup) return vagueChoiceFollowup;
    const pendingChoiceReminder = buildOpenChatPendingChoiceReminder(compact);
    if (pendingChoiceReminder) return pendingChoiceReminder;
    const leaderCatalogAnswer = buildOpenChatLeaderCatalogAnswer(compact);
    if (leaderCatalogAnswer) return leaderCatalogAnswer;
    const runConfirmationAnswer = buildOpenChatRunConfirmationAnswer(compact);
    if (runConfirmationAnswer) return runConfirmationAnswer;
    const commandAnswer = buildOpenChatCommandAnswer(compact);
    if (commandAnswer) return commandAnswer;
    const followupAnswer = buildOpenChatFollowupAnswer(compact, inputCounts);
    if (followupAnswer) return followupAnswer;
    return null;
  }

  function resolveOpenChatPreLlmGuard(prompt = '', inputCounts = {}) {
    const text = String(prompt || '').trim();
    if (!text || isStructuredOrderBrief(text)) return null;
    const promptInjectionAnswer = buildOpenChatPromptInjectionAnswer(text);
    if (promptInjectionAnswer) return promptInjectionAnswer;
    const longPromptAnswer = buildOpenChatLongPromptGuardAnswer(text, inputCounts);
    if (longPromptAnswer) return longPromptAnswer;
    const compact = text.replace(/\s+/g, ' ').trim();
    const pauseAnswer = buildOpenChatPauseAnswer(compact);
    if (pauseAnswer) return pauseAnswer;
    const statusAnswer = buildOpenChatStatusAnswer(compact);
    if (statusAnswer) return statusAnswer;
    const recoveredLeaderIntakeAnswer = buildOpenChatRecoveredLeaderIntakeAnswer(compact, inputCounts);
    if (recoveredLeaderIntakeAnswer) return recoveredLeaderIntakeAnswer;
    const leaderIntakeFollowupAnswer = buildOpenChatLeaderIntakeFollowupAnswer(compact, inputCounts);
    if (leaderIntakeFollowupAnswer) return leaderIntakeFollowupAnswer;
    const leaderChoiceFollowupAnswer = buildOpenChatLeaderChoiceFollowupAnswer(compact, inputCounts);
    if (leaderChoiceFollowupAnswer) return leaderChoiceFollowupAnswer;
    const leaderChoiceAnswer = buildOpenChatLeaderChoiceAnswer(compact, inputCounts);
    if (leaderChoiceAnswer) return leaderChoiceAnswer;
    const pendingQuestionFollowupAnswer = resolveOpenChatPendingQuestionFollowup(compact, inputCounts);
    if (pendingQuestionFollowupAnswer) return pendingQuestionFollowupAnswer;
    const precommandPatternAnswer = buildOpenChatPatternGuardAnswer(compact, inputCounts, { phase: 'precommand' });
    if (precommandPatternAnswer) return precommandPatternAnswer;
    const localPriorityAnswer = resolveOpenChatLocalPriority(compact, inputCounts);
    if (localPriorityAnswer) return localPriorityAnswer;
    const commandAnswer = buildOpenChatCommandAnswer(compact);
    if (commandAnswer) return commandAnswer;
    const leaderIntakeAnswer = buildOpenChatLeaderIntakeAnswer(compact, inputCounts);
    if (leaderIntakeAnswer) return leaderIntakeAnswer;
    const naturalChoiceFollowup = buildOpenChatNaturalChoiceFollowup(compact, inputCounts);
    if (naturalChoiceFollowup) return naturalChoiceFollowup;
    const vagueChoiceFollowup = buildOpenChatVagueChoiceFollowup(compact, inputCounts);
    if (vagueChoiceFollowup) return vagueChoiceFollowup;
    const pendingChoiceReminder = buildOpenChatPendingChoiceReminder(compact);
    if (pendingChoiceReminder) return pendingChoiceReminder;
    return null;
  }

  function openChatShouldPreferOpenAiReasoning(prompt = '', inputCounts = {}) {
    if (new URLSearchParams(window.location.search || '').has('smoke')) return false;
    const state = getState();
    const text = String(prompt || '').replace(/\s+/g, ' ').trim();
    if (text.length < 3 || text.length > 1200) return false;
    if (isStructuredOrderBrief(text)) return false;
    if (Number(inputCounts.fileCount || 0) || Number(inputCounts.fileChars || 0)) return false;
    if (openChatLooksGreetingPrompt(text) || openChatLooksLowInfoTestPrompt(text)) return false;
    if (openChatPromptInjectionGuard(text).blocked) return false;
    if (openChatLooksSensitiveSecret(text) || openChatLooksUnsafeRequest(text) || openChatLooksHighStakesAdvice(text)) return false;
    if (openChatHasActiveLocalFollowupState(text)) {
      if (/^[0-9０-９A-Da-dＡ-Ｄａ-ｄ]+$/.test(text) && Array.isArray(state.openChatClarifyOptions) && state.openChatClarifyOptions.length) return false;
      if (shouldDeferOpenChatCommandForAnswer(text) || openChatCommandMode(text)) return false;
      return true;
    }
    if (shouldDeferOpenChatCommandForAnswer(text)) return true;
    if (openChatCommandMode(text)) return false;
    return true;
  }

  function openChatLooksBareTopicPrompt(prompt = '') {
    const text = String(prompt || '').replace(/\s+/g, ' ').trim();
    const matchText = openChatIntentMatchText(text);
    if (!text || text.length > 72) return false;
    if (openChatLooksGreetingPrompt(text) || openChatLooksLowInfoTestPrompt(text) || openChatLooksGeneralHelpPrompt(text)) return false;
    if (/^[0-9０-９]+$/.test(text)) return false;
    if (/[?？。！？!,;:]/.test(text)) return false;
    if (/\b(compare|research|analy[sz]e|review|summari[sz]e|write|draft|create|build|fix|debug|find|explain|translate|improve|triage|check|order|buy|sell)\b/i.test(matchText)) return false;
    if (/(調査|比較|分析|レビュー|要約|作成|書いて|直して|修正|翻訳|改善|確認|教えて|調べ|探して|説明|発注|注文|買|売)/i.test(matchText)) return false;
    if (/(CAIt|aiagent2|ai agent|agent|order|work|delivery|deposit|billing|payment|stripe|github|google|cli|api|payout|provider|manifest|verify|settings|エージェント|オーダー|注文|ワーク|納品|デポジット|残高|料金|課金|支払|お金|ログイン|登録|使い方|入金|出金|受け取り|マニフェスト|ベリファイ|検証|設定)/i.test(matchText)) return false;
    const words = text.split(/\s+/).filter(Boolean);
    return words.length <= 4 && /^[\p{L}\p{N}\s._#@+-]{1,72}$/u.test(text);
  }

  function openChatLlmFallbackReason(prompt = '', inputCounts = {}, fallbackAnswer = null) {
    if (new URLSearchParams(window.location.search || '').has('smoke')) return false;
    if (Number(inputCounts.urlCount || 0) || Number(inputCounts.fileCount || 0)) return false;
    const text = String(prompt || '').replace(/\s+/g, ' ').trim();
    const matchText = openChatIntentMatchText(text);
    if (text.length < 3 || text.length > 1200) return '';
    if (isStructuredOrderBrief(text)) return false;
    if (openChatLooksGreetingPrompt(text) || openChatLooksLowInfoTestPrompt(text) || openChatLooksGeneralHelpPrompt(text)) return false;
    if (openChatPromptInjectionGuard(text).blocked) return false;
    if (openChatLooksSensitiveSecret(text) || openChatLooksUnsafeRequest(text) || openChatLooksHighStakesAdvice(text)) return false;
    if (fallbackAnswer?.skipOpenAiPolish === true) return '';
    const mustUseLocalFallback = openChatMustUseLlmFallback(prompt, fallbackAnswer);
    const patternId = String(fallbackAnswer?.patternId || '').trim();
    if (fallbackAnswer && !mustUseLocalFallback) return '';
    if (!fallbackAnswer && openChatShouldPreferOpenAiReasoning(text, inputCounts)) return 'default_openai_reasoning';
    if (mustUseLocalFallback) return 'uncertain_local_answer';
    if (patternId === 'pattern_low_info_ambiguous' && openChatLooksBareTopicPrompt(text)) return 'bare_topic_disambiguation';
    if (fallbackAnswer) return '';
    if (/(?:^|\b)(compare|research|analy[sz]e|review|summari[sz]e|write|draft|create|build|fix|debug|find|explain|translate|improve|triage|check)\b/i.test(matchText)
      || /(調査|比較|分析|レビュー|要約|作成|書いて|直して|修正|翻訳|改善|確認|教えて|調べ|探して|説明)/i.test(matchText)) {
      return '';
    }
    if (openChatLooksBareTopicPrompt(text)) return 'bare_topic_disambiguation';
    if (/(cait|ai agent|agent|order|work|payment|billing|deposit|stripe|github|repo|manifest|verify|api key|settings|login|connect)/i.test(matchText)
      && /(わから|分から|迷|どう|なに|何|help|stuck|confused|unknown|not sure|how|what|why)/i.test(matchText)) {
      return 'service_question_uncertain';
    }
    return /(i want|i need|need to|trying to|not sure|what should i|how should i|how do i|make money|earn money|grow|sales|customers|users|conversion|launch|market|idea|app people want|したい|やりたい|どうすれば|どうしたら|何をすれば|何から|わからない|分からない|相談|稼ぎたい|儲けたい|売上|集客|ユーザー|顧客|反応|アイデア|アプリ)/i.test(matchText)
      ? 'broad_goal_clarification'
      : '';
  }

  function openChatLooksPreorderIntentLlmCandidate(prompt = '', inputCounts = {}, fallbackAnswer = null) {
    if (fallbackAnswer) return openChatMustUseLlmFallback(prompt, fallbackAnswer);
    return Boolean(openChatLlmFallbackReason(prompt, inputCounts, fallbackAnswer) || openChatShouldPreferOpenAiReasoning(prompt, inputCounts));
  }

  return {
    openChatPendingQuestionContext,
    shouldStoreOpenChatPendingQuestion,
    openChatPendingQuestionTaskType,
    buildOpenChatPendingQuestionFollowupAnswer: resolveOpenChatPendingQuestionFollowup,
    openChatHasActiveLocalFollowupState,
    buildOpenChatLocalPriorityAnswer: resolveOpenChatLocalPriority,
    buildOpenChatPreLlmGuardAnswer: resolveOpenChatPreLlmGuard,
    openChatShouldPreferOpenAiReasoning,
    openChatLooksBareTopicPrompt,
    openChatLlmFallbackReason,
    openChatLooksPreorderIntentLlmCandidate
  };
}
