export function createClientOpenChatExchangeController(deps = {}) {
  const {
    state,
    els,
    productShortName = 'CAIt',
    orderInputMaxFiles = 5,
    applyOpenChatCommand,
    buildOpenChatTrioDiscussion,
    chatAnswerDisplayBody,
    chatAnswerKind,
    clearOpenChatDecisionSuppressionForNewBrief,
    clearPinnedAgentIfMismatchedBrief,
    compactChatText,
    currentRoutingTask,
    finishOpenChatTyping,
    inferClientTaskSequence,
    isStructuredOrderBrief,
    makeOpenChatMessageId,
    normalizeOrderInputFile,
    openChatCanonicalOrderTaskType,
    openChatPendingQuestionTaskType,
    openChatPreparedOrderActions,
    openChatStatusDisplayText,
    openChatStepItems,
    orderInputCounts,
    orderInputFromComposer,
    persistCurrentOpenChatSession,
    renderOpenChatSessionControls,
    renderOrderComposer,
    rewriteStructuredBriefTaskType,
    shouldAnimateOpenChatAnswer,
    shouldStoreOpenChatPendingQuestion,
    startOpenChatTyping,
    structuredOrderBriefParts,
    syncCreateJobButtonForCurrentPrompt,
    trackChatTranscript,
    updateWorkChatStatusCard
  } = deps;

  function appendOrderChatExchange(prompt, answer, options = {}) {
    finishOpenChatTyping({ render: false });
    const inputCounts = orderInputCounts(orderInputFromComposer());
    let nextPrompt = options.nextPrompt || answer?.nextPrompt || '';
    if (isStructuredOrderBrief(nextPrompt)) {
      const existingTask = String(structuredOrderBriefParts(nextPrompt).taskType || '').trim();
      if (!existingTask) {
        const canonicalTask = openChatCanonicalOrderTaskType('', nextPrompt)
          || openChatCanonicalOrderTaskType(inferClientTaskSequence('', nextPrompt)[0], nextPrompt)
          || 'research';
        nextPrompt = rewriteStructuredBriefTaskType(nextPrompt, canonicalTask);
      }
      if (answer && typeof answer === 'object') answer = { ...answer, nextPrompt };
    }
    const answerBody = chatAnswerDisplayBody(answer, prompt, inputCounts);
    const displayAnswer = typeof answer === 'object' && answer ? { ...answer, body: answerBody } : answer;
    const answerKind = chatAnswerKind(answer);
    const answerCommand = answerKind === 'command' ? String(answer.command || '') : '';
    const explicitActions = Array.isArray(answer?.actions) ? answer.actions : [];
    const chatActions = explicitActions.length ? explicitActions : openChatPreparedOrderActions(answerKind, nextPrompt);
    const messageBase = answerCommand === 'reset_chat' ? [] : state.orderChatMessages;
    const tone = options.tone || answer?.tone || (answerKind === 'assist' ? 'ok' : (answerKind === 'command' ? 'info' : 'info'));
    const steps = options.steps || openChatStepItems(prompt, displayAnswer);
    const shouldAnimate = shouldAnimateOpenChatAnswer(answer, answerBody);
    const discussionTurns = nextPrompt ? [] : buildOpenChatTrioDiscussion(prompt, answer, { inputCounts, nextPrompt });
    const agentMessage = shouldAnimate
      ? {
        id: makeOpenChatMessageId(),
        role: 'agent',
        label: productShortName,
        body: '',
        fullBody: compactChatText(answerBody),
        tone,
        steps,
        actions: chatActions,
        discussionTurns,
        typing: true
      }
      : { role: 'agent', label: productShortName, body: answerBody, tone, steps, actions: chatActions, discussionTurns };
    const nextMessages = [
      ...messageBase,
      { role: 'user', label: 'YOU', body: prompt },
      agentMessage
    ];
    state.orderChatMessages = nextMessages.slice(-16);
    const exposeNextPrompt = Boolean(options.exposeNextPrompt || answer?.exposeNextPrompt);
    if (els.jobPrompt) els.jobPrompt.value = exposeNextPrompt ? nextPrompt : '';
    if (answerKind === 'assist' && nextPrompt) {
      state.openChatPreparedBrief = nextPrompt;
      if (answer?.clearPinnedAgent || isStructuredOrderBrief(nextPrompt)) clearPinnedAgentIfMismatchedBrief(nextPrompt);
    } else if (answerKind === 'command' && answerCommand === 'restore_brief' && nextPrompt) {
      state.openChatPreparedBrief = nextPrompt;
    }
    const sourceFiles = Array.isArray(answer?.sourceFiles) && answer.sourceFiles.length
      ? answer.sourceFiles
      : (answer?.sourceFile ? [answer.sourceFile] : []);
    if (sourceFiles.length) {
      const normalizedSourceFiles = sourceFiles
        .map((file) => normalizeOrderInputFile(file))
        .filter((file) => file.content);
      if (normalizedSourceFiles.length) {
        const sourceNames = new Set(normalizedSourceFiles.map((file) => String(file.name || '')));
        const existing = Array.isArray(state.orderInputFiles)
          ? state.orderInputFiles.filter((file) => !sourceNames.has(String(file?.name || '')))
          : [];
        state.orderInputFiles = [...normalizedSourceFiles, ...existing].slice(0, orderInputMaxFiles);
        state.orderInputFileWarnings = [
          ...(Array.isArray(state.orderInputFileWarnings) ? state.orderInputFileWarnings : []),
          `Long prompt was separated into ${normalizedSourceFiles.length} protected source file(s) before dispatch.`
        ].slice(-4);
      }
    }
    state.openChatParallelPlan = Array.isArray(answer?.parallelPlan) ? answer.parallelPlan : [];
    if (answer?.vagueChoicePrompt) {
      state.openChatVagueChoicePrompt = String(answer.vagueChoicePrompt || '').trim();
    } else if (answer?.clearVagueChoice || answerKind !== 'clarify') {
      state.openChatVagueChoicePrompt = '';
    }
    if (answer?.naturalChoiceIntent) {
      state.openChatNaturalChoiceIntent = String(answer.naturalChoiceIntent || '').trim();
    } else if (answer?.clearNaturalChoice || answer?.clearVagueChoice || answerKind !== 'clarify') {
      state.openChatNaturalChoiceIntent = '';
    }
    if (answer?.intentShiftPrompt) {
      state.openChatIntentShiftPrompt = String(answer.intentShiftPrompt || '').trim();
    } else if (answer?.clearIntentShift || answerKind !== 'clarify') {
      state.openChatIntentShiftPrompt = '';
    }
    if (answer?.ideaBacklogPrompt) {
      state.openChatIdeaBacklogPrompt = String(answer.ideaBacklogPrompt || '').trim();
    } else if (answer?.clearIdeaBacklog || answerCommand === 'reset_chat' || answerKind !== 'clarify') {
      state.openChatIdeaBacklogPrompt = '';
    }
    if (answer?.leaderChoicePrompt) {
      state.openChatLeaderChoicePrompt = String(answer.leaderChoicePrompt || prompt || '').trim();
      state.openChatLeaderChoiceCandidates = Array.isArray(answer.leaderChoiceCandidates) ? answer.leaderChoiceCandidates : [];
    } else if (answer?.clearLeaderChoice || answer?.leaderIntakePrompt || answerCommand === 'reset_chat' || answerKind !== 'clarify') {
      state.openChatLeaderChoicePrompt = '';
      state.openChatLeaderChoiceCandidates = [];
    }
    if (answer?.leaderIntakePrompt || answer?.leaderIntakeTask) {
      state.openChatLeaderIntakePrompt = String(answer.leaderIntakePrompt || prompt || '').trim();
      state.openChatLeaderIntakeTask = String(answer.leaderIntakeTask || '').trim();
    } else if (answer?.clearLeaderIntake || answerCommand === 'reset_chat' || answerKind !== 'clarify') {
      state.openChatLeaderIntakePrompt = '';
      state.openChatLeaderIntakeTask = '';
    }
    const storePendingQuestion = shouldStoreOpenChatPendingQuestion(prompt, answer);
    if (answer?.pendingQuestionPrompt || answer?.pendingQuestionTask || storePendingQuestion) {
      const pendingSource = String(answer?.pendingQuestionPrompt || answer?.nextPrompt || prompt || '').trim();
      state.openChatPendingQuestionPrompt = compactChatText(pendingSource, 4000);
      state.openChatPendingQuestionTask = compactChatText(openChatPendingQuestionTaskType(pendingSource, answer), 120);
      state.openChatPendingQuestionPattern = compactChatText(answer?.pendingQuestionPattern || answer?.patternId || '', 120);
    } else if (
      answer?.clearPendingQuestion
      || answerCommand === 'reset_chat'
      || answer?.leaderIntakePrompt
      || answer?.vagueChoicePrompt
      || answer?.naturalChoiceIntent
      || answer?.intentShiftPrompt
      || answer?.ideaBacklogPrompt
      || answer?.leaderChoicePrompt
      || (Array.isArray(answer?.options) && answer.options.length)
      || answerKind !== 'clarify'
    ) {
      state.openChatPendingQuestionPrompt = '';
      state.openChatPendingQuestionTask = '';
      state.openChatPendingQuestionPattern = '';
    }
    if (answerKind === 'clarify' && Array.isArray(answer?.options)) {
      state.openChatClarifyOptions = answer.options;
      state.openChatDecisionSuppressed = false;
    } else if (answer?.clearClarifyOptions) {
      state.openChatClarifyOptions = [];
    } else if (answerKind === 'command') {
      state.openChatClarifyOptions = [];
    }
    if (answerKind === 'assist' && nextPrompt) clearOpenChatDecisionSuppressionForNewBrief(nextPrompt);
    if (answerCommand === 'reset_chat') state.openChatDecisionSuppressed = false;
    state.pendingIntake = null;
    state.intakeConfirmed = false;
    state.intakeAnswer = '';
    if (els.intakeAnswer) els.intakeAnswer.value = '';
    applyOpenChatCommand(answer);
    state.openChatLastStatus = openChatStatusDisplayText(options.status || answer?.status || 'Answered in chat.\n\nNo order was created and no billing occurred.');
    state.openChatLastStatusTone = tone;
    void trackChatTranscript(prompt, displayAnswer, {
      ...inputCounts,
      taskType: inferClientTaskSequence('', nextPrompt || prompt)[0] || currentRoutingTask() || '',
      status: answerKind || 'quick',
      transcriptId: options.transcriptId || ''
    });
    renderOrderComposer();
    if (els.runCreateStatus) {
      els.runCreateStatus.textContent = state.openChatLastStatus;
      els.runCreateStatus.className = `detail-box action-card ${tone} compact-card`;
    }
    const statusParts = String(state.openChatLastStatus || '').split(/\n\n+/);
    updateWorkChatStatusCard(statusParts.shift() || 'Answered in chat.', statusParts.join('\n\n') || 'No order was created and no billing occurred.', tone);
    syncCreateJobButtonForCurrentPrompt();
    if (answerCommand === 'reset_chat') {
      state.currentOpenChatSessionId = '';
      renderOpenChatSessionControls();
    } else {
      persistCurrentOpenChatSession();
    }
    if (shouldAnimate) startOpenChatTyping(agentMessage.id);
  }

  return {
    appendOrderChatExchange
  };
}
