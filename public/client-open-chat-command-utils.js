import {
  WORK_ACTION_IDS,
  buttonActionsForWorkCommand,
  commandCopyForWorkAction,
  isDeveloperExecutionIntentText,
  resolveStaticWorkAction
} from './work-action-registry.js?v=20260430b';
import {
  buildOpenChatIntentClarification,
  isOpenChatEscapeCommand,
  openChatCommandHelpText,
  openChatFuzzyIntent,
  openChatIntentScore,
  openChatMixedCommandNote,
  slashCommandMode
} from './client-chat-command-utils.js?v=20260522a';

export function createClientOpenChatCommandUtils(options = {}) {
  const getState = typeof options.getState === 'function' ? options.getState : () => ({});
  const getEls = typeof options.getEls === 'function' ? options.getEls : () => ({});
  const looksJapanese = typeof options.looksJapanese === 'function' ? options.looksJapanese : () => false;
  const normalizeOpenChatIntentText = typeof options.normalizeOpenChatIntentText === 'function'
    ? options.normalizeOpenChatIntentText
    : (value) => String(value || '').trim().toLowerCase();
  const isStructuredOrderBrief = typeof options.isStructuredOrderBrief === 'function' ? options.isStructuredOrderBrief : () => false;
  const lastOpenChatPreparedBrief = typeof options.lastOpenChatPreparedBrief === 'function' ? options.lastOpenChatPreparedBrief : () => '';
  const isOpenChatClarificationAnswer = typeof options.isOpenChatClarificationAnswer === 'function' ? options.isOpenChatClarificationAnswer : () => false;
  const openChatLooksCancelOrderChoice = typeof options.openChatLooksCancelOrderChoice === 'function' ? options.openChatLooksCancelOrderChoice : () => false;
  const openChatHasActiveLocalFollowupState = typeof options.openChatHasActiveLocalFollowupState === 'function' ? options.openChatHasActiveLocalFollowupState : () => false;
  const isOpenChatBriefEditInstruction = typeof options.isOpenChatBriefEditInstruction === 'function' ? options.isOpenChatBriefEditInstruction : () => false;
  const openChatFollowupMode = typeof options.openChatFollowupMode === 'function' ? options.openChatFollowupMode : () => '';
  const openChatLooksLikeNaturalChoiceDetails = typeof options.openChatLooksLikeNaturalChoiceDetails === 'function' ? options.openChatLooksLikeNaturalChoiceDetails : () => false;
  const openChatChoiceReplyToken = typeof options.openChatChoiceReplyToken === 'function' ? options.openChatChoiceReplyToken : () => '';
  const orderInputCounts = typeof options.orderInputCounts === 'function' ? options.orderInputCounts : () => ({});
  const orderInputFromComposer = typeof options.orderInputFromComposer === 'function' ? options.orderInputFromComposer : () => ({});
  const openChatParallelPlanFromBrief = typeof options.openChatParallelPlanFromBrief === 'function' ? options.openChatParallelPlanFromBrief : () => [];
  const chatAnswerKind = typeof options.chatAnswerKind === 'function' ? options.chatAnswerKind : (answer) => answer?.kind || '';
  const flash = typeof options.flash === 'function' ? options.flash : () => {};
  const openPrimaryGoogleSignIn = typeof options.openPrimaryGoogleSignIn === 'function' ? options.openPrimaryGoogleSignIn : () => {};
  const openGithubSignIn = typeof options.openGithubSignIn === 'function' ? options.openGithubSignIn : () => {};
  const setOpenChatMode = typeof options.setOpenChatMode === 'function' ? options.setOpenChatMode : () => {};
  const setOrderStrategyChoice = typeof options.setOrderStrategyChoice === 'function' ? options.setOrderStrategyChoice : () => {};
  const parallelDraftFromOpenChatPlanItem = typeof options.parallelDraftFromOpenChatPlanItem === 'function'
    ? options.parallelDraftFromOpenChatPlanItem
    : () => null;

  const state = () => getState() || {};

  const resolveOpenChatClarifyReply = (prompt = '') => {
    const text = normalizeOpenChatIntentText(prompt);
    const optionsList = Array.isArray(state().openChatClarifyOptions) ? state().openChatClarifyOptions : [];
    if (!text || !optionsList.length) return '';
    const numbered = text.match(/^([1-3])$/);
    if (numbered) return optionsList[Number(numbered[1]) - 1]?.command || '';
    const scored = optionsList
      .map((option) => ({ ...option, score: openChatIntentScore(text, option) }))
      .filter((option) => option.score > 0)
      .sort((left, right) => right.score - left.score);
    return scored[0]?.command || '';
  };

  const openChatCommandMode = (prompt = '') => {
    const text = String(prompt || '').trim();
    if (!text) return '';
    if (isStructuredOrderBrief(text)) return '';
    const compact = text.replace(/\s+/g, ' ').trim();
    if (isDeveloperExecutionIntentText(compact)) return '';
    const clarified = resolveOpenChatClarifyReply(compact);
    if (clarified) return clarified;
    if (lastOpenChatPreparedBrief() && isOpenChatClarificationAnswer(compact)) return '';
    return resolveStaticWorkAction(compact, {
      exactActions: Array.isArray(state().snapshot?.exactActions) ? state().snapshot.exactActions : []
    });
  };

  const shouldDeferOpenChatCommandForAnswer = (prompt = '') => {
    const text = String(prompt || '').trim();
    if (!text || slashCommandMode(text)) return false;
    if (isOpenChatEscapeCommand(openChatCommandMode(text))) return false;
    if (openChatLooksCancelOrderChoice(text)
      && (openChatHasActiveLocalFollowupState(text) || Boolean(lastOpenChatPreparedBrief()))) {
      return false;
    }
    const currentState = state();
    if (currentState.openChatLeaderIntakePrompt
      || currentState.openChatPendingQuestionPrompt
      || currentState.openChatVagueChoicePrompt
      || currentState.openChatNaturalChoiceIntent
      || currentState.openChatIntentShiftPrompt
      || currentState.openChatIdeaBacklogPrompt) {
      return true;
    }
    if (Array.isArray(currentState.openChatClarifyOptions)
      && currentState.openChatClarifyOptions.length
      && /^[0-9A-Da-d]$/.test(openChatChoiceReplyToken(text))) {
      return true;
    }
    if (isOpenChatClarificationAnswer(text) || openChatLooksLikeNaturalChoiceDetails(text)) return true;
    const lines = text.split(/\n+/).map((line) => line.trim()).filter(Boolean);
    const numberedDetailLines = lines.filter((line) => /^(?:[0-9０-９]+|[A-Da-dＡ-Ｄａ-ｄ])[\).．、:：]\s*\S+/.test(line)).length;
    if (numberedDetailLines >= 2) return true;
    return /https?:\/\//i.test(text)
      && /(対象|ユーザー|顧客|商材|商品|サービス|目的|成果|KPI|広告費|予算|媒体|投稿|プラン|納品|audience|customer|product|service|goal|kpi|budget|channel|deliverable)/i.test(text);
  };

  const shouldHandleOpenChatFollowupBeforeCommand = (prompt = '') => {
    const text = String(prompt || '').trim();
    if (!text) return false;
    const command = openChatCommandMode(text);
    if (isOpenChatEscapeCommand(command)) return false;
    if (openChatLooksCancelOrderChoice(text)
      && (openChatHasActiveLocalFollowupState(text) || Boolean(lastOpenChatPreparedBrief()))) {
      return false;
    }
    if (shouldDeferOpenChatCommandForAnswer(text)) return true;
    if (!lastOpenChatPreparedBrief()) return false;
    if (/^(queue parallel|add parallel|add to parallel queue|queue these|並列キューに追加|キューに追加|並列に追加|これを並列に追加)$/i.test(text)
      || /(?:parallel|並列).*(?:queue|キュー|追加|add)/i.test(text)) {
      return false;
    }
    return isOpenChatClarificationAnswer(text)
      || isOpenChatBriefEditInstruction(text)
      || Boolean(openChatFollowupMode(text));
  };

  const buildOpenChatCommandAnswer = (prompt = '') => {
    if (shouldHandleOpenChatFollowupBeforeCommand(prompt)) return null;
    let command = openChatCommandMode(prompt);
    if (!command
      && openChatLooksCancelOrderChoice(prompt)
      && (openChatHasActiveLocalFollowupState(prompt) || Boolean(lastOpenChatPreparedBrief()))) {
      command = 'cancel_preorder_order';
    }
    if (!command) {
      const questionShape = /[?？]|\b(what|how|why|can|do|does|is|are|where|when)\b/i.test(String(prompt || ''))
        || /(ですか|ますか|何|どう|なに|できる|教えて|とは|使い方)/.test(String(prompt || ''));
      if (!questionShape) {
        const fuzzy = openChatFuzzyIntent(prompt);
        if (fuzzy?.clarify) return buildOpenChatIntentClarification(prompt, fuzzy.candidates || [], { ja: looksJapanese(prompt) });
        command = fuzzy?.command || '';
      }
    }
    if (!command) return null;
    const ja = looksJapanese(prompt);
    const preparedBrief = lastOpenChatPreparedBrief();
    if (command === 'cancel_preorder_order') {
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
    if (command === 'show_commands') {
      return {
        kind: 'command',
        command,
        tone: 'info',
        body: openChatCommandHelpText(ja),
        nextPrompt: '',
        status: 'Command help shown.\n\nNo order was created and no billing occurred.'
      };
    }
    if (command === 'reset_chat') {
      return {
        kind: 'command',
        command,
        tone: 'info',
        body: ja
          ? 'チャットをリセットしました。入力欄と発注前ブリーフも空にしました。別件をそのまま書いてください。'
          : 'Open chat reset. I cleared the input and prepared brief. Write the next topic when ready.',
        nextPrompt: '',
        status: 'Open chat reset.\n\nNo order was created and no billing occurred.'
      };
    }
    if (command === 'restore_brief') {
      if (!preparedBrief) {
        return {
          kind: 'command',
          command,
          tone: 'warn',
          body: ja
            ? '戻せる発注文がまだありません。先に「発注ブラッシュアップ: ...」のように依頼内容を整理してください。'
            : 'No prepared brief is available yet. First ask me to refine a rough request into a work order.',
          nextPrompt: '',
          status: 'No prepared brief to restore.\n\nNo order was created and no billing occurred.'
        };
      }
      return {
        kind: 'command',
        command,
        tone: 'ok',
        body: ja
          ? '保存済みのオーダー内容を使える状態にしました。内容が合っていれば SEND ORDER、直す場合は追加条件を書いてください。可能ならクリップボードにもコピーします。'
          : 'I restored the saved order draft behind the chat. If it looks right, press SEND ORDER; otherwise write the correction here. I will also copy it to the clipboard when the browser allows it.',
        nextPrompt: preparedBrief,
        copyText: preparedBrief,
        status: 'Prepared brief restored.\n\nNo order was created and no billing occurred.'
      };
    }
    if (command === 'queue_parallel_plan') {
      const plan = openChatParallelPlanFromBrief(preparedBrief, orderInputCounts(orderInputFromComposer()));
      if (!preparedBrief || plan.length < 2) {
        return {
          kind: 'command',
          command,
          tone: 'warn',
          body: ja
            ? '並列キューに入れる発注文がまだありません。先に依頼をブラッシュアップしてから「並列に分けて」と送ってください。'
            : 'No parallel-ready work order is available yet. First refine the request, then ask me to split it for parallel work.',
          nextPrompt: '',
          status: 'No parallel plan to queue.\n\nNo order was created and no billing occurred.'
        };
      }
      return {
        kind: 'command',
        command,
        tone: 'ok',
        body: ja
          ? [
            `${plan.length}件の並列ドラフトをキューに追加しました。これはまだ注文ではなく、課金も発生しません。`,
            '',
            ...plan.map((item, index) => `${index + 1}. ${item.taskType}: ${item.title}`),
            '',
            '次の動き: ORDER SETTINGS の並列キューを確認し、実行する場合だけログインして CREATE ALL してください。'
          ].join('\n')
          : [
            `Queued ${plan.length} parallel drafts. No order was created and no billing occurred.`,
            '',
            ...plan.map((item, index) => `${index + 1}. ${item.taskType}: ${item.title}`),
            '',
            'Next: review the parallel queue in ORDER SETTINGS, then sign in and use CREATE ALL only when you want paid dispatch.'
          ].join('\n'),
        parallelPlan: plan,
        nextPrompt: preparedBrief,
        status: 'Parallel drafts queued.\n\nNo order was created and no billing occurred. Review them before paid dispatch.'
      };
    }
    const commandCopy = commandCopyForWorkAction(command);
    if (!commandCopy) return null;
    const commandActions = buttonActionsForWorkCommand(command, ja);
    const mixedNote = openChatMixedCommandNote(prompt, command, ja);
    return {
      kind: 'command',
      command,
      tone: 'info',
      body: mixedNote
        ? `${ja ? commandCopy.ja : commandCopy.en}\n\n${mixedNote}`
        : (ja ? commandCopy.ja : commandCopy.en),
      nextPrompt: '',
      actions: commandActions,
      status: mixedNote
        ? `${commandCopy.status}\n\nMixed chat command detected. Only the navigation/mode command was handled.`
        : commandCopy.status
    };
  };

  const applyOpenChatCommand = (answer) => {
    if (chatAnswerKind(answer) !== 'command') return;
    const command = String(answer.command || '');
    const currentState = state();
    const els = getEls() || {};
    if (command === 'reset_chat') {
      currentState.openChatPreparedBrief = '';
      currentState.pendingIntake = null;
      currentState.intakeConfirmed = false;
      currentState.intakeAnswer = '';
      currentState.followupToJobId = '';
      currentState.followupSourceTaskType = '';
      currentState.followupSourceAgentId = '';
      currentState.orderInputFiles = [];
      currentState.orderInputFileWarnings = [];
      currentState.openChatParallelPlan = [];
      currentState.openChatClarifyOptions = [];
      currentState.openChatVagueChoicePrompt = '';
      currentState.openChatNaturalChoiceIntent = '';
      currentState.openChatIntentShiftPrompt = '';
      currentState.openChatIdeaBacklogPrompt = '';
      currentState.openChatLeaderIntakePrompt = '';
      currentState.openChatLeaderIntakeTask = '';
      currentState.openChatPendingQuestionPrompt = '';
      currentState.openChatPendingQuestionTask = '';
      currentState.openChatPendingQuestionPattern = '';
      currentState.openChatDecisionSuppressed = false;
      currentState.openChatDecisionSuppressedBriefKey = '';
      if (els.jobUrls) els.jobUrls.value = '';
      if (els.jobFiles) els.jobFiles.value = '';
      if (els.intakeAnswer) els.intakeAnswer.value = '';
      return;
    }
    if (command === 'restore_brief' && answer.copyText && navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(answer.copyText)
        .then(() => flash('Saved order draft copied.', 'ok'))
        .catch(() => flash('Saved order draft is ready behind the chat. Clipboard copy was blocked by the browser.', 'info'));
      return;
    }
    if (command === 'open_google_login') {
      openPrimaryGoogleSignIn();
      return;
    }
    if (command === 'open_github_login') {
      openGithubSignIn();
      return;
    }
    if (command === 'open_logout') {
      els.logoutBtn?.click();
      return;
    }
    if (command === WORK_ACTION_IDS.SET_CLARIFY_MODE) {
      setOpenChatMode('clarify', { silent: true });
      return;
    }
    if (command === WORK_ACTION_IDS.SET_ORDER_MODE) {
      setOpenChatMode('order', { silent: true });
      return;
    }
    if (command === WORK_ACTION_IDS.SET_ROUTE_AUTO) {
      setOrderStrategyChoice('auto');
      return;
    }
    if (command === WORK_ACTION_IDS.SET_ROUTE_SINGLE) {
      setOrderStrategyChoice('single');
      return;
    }
    if (command === WORK_ACTION_IDS.SET_ROUTE_MULTI) {
      setOrderStrategyChoice('multi');
      return;
    }
    if (command === WORK_ACTION_IDS.QUEUE_PARALLEL_PLAN) {
      const plan = Array.isArray(answer.parallelPlan) ? answer.parallelPlan : [];
      const input = orderInputFromComposer();
      const drafts = plan.map((item) => parallelDraftFromOpenChatPlanItem(item, input)).filter(Boolean);
      if (drafts.length) {
        currentState.parallelOrderDrafts = [...currentState.parallelOrderDrafts, ...drafts];
        currentState.orderSettingsExpanded = true;
        currentState.parallelToolsExpanded = true;
        currentState.openChatParallelPlan = plan;
      }
    }
  };

  return {
    resolveOpenChatClarifyReply,
    openChatCommandMode,
    shouldDeferOpenChatCommandForAnswer,
    buildOpenChatCommandAnswer,
    applyOpenChatCommand
  };
}
