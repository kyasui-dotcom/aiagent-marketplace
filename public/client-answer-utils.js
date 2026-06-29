import { compactClientText as compactChatText } from './client-text-utils.js?v=20260521a';

const noopString = () => '';
const noopObject = () => ({});
const noopArray = () => [];
const noopBoolean = () => false;

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function chatAnswerBody(answer) {
  if (typeof answer === 'string') return answer;
  return String(answer?.body || '');
}

export function chatAnswerKind(answer) {
  return typeof answer === 'object' && answer ? String(answer.kind || '') : '';
}

function normalizeOpenChatTrioTurn(turn = {}) {
  const role = String(turn.role || 'proposal').trim().toLowerCase();
  const tone = ['warn', 'ok', 'info'].includes(String(turn.tone || '').trim()) ? String(turn.tone || '').trim() : 'info';
  return {
    role,
    label: String(turn.label || role).trim(),
    body: compactChatText(turn.body || '', 280),
    tone
  };
}

export function createClientAnswerUtils(options = {}) {
  const hooks = {
    looksJapanese: options.looksJapanese || noopBoolean,
    isStructuredOrderBrief: options.isStructuredOrderBrief || noopBoolean,
    structuredOrderBriefParts: options.structuredOrderBriefParts || noopObject,
    inferClientTaskSequence: options.inferClientTaskSequence || noopArray,
    currentRoutingTask: options.currentRoutingTask || noopString,
    openChatHumanDispatchPreview: options.openChatHumanDispatchPreview || noopString,
    stripStandaloneInternalBriefsFromChatBody: options.stripStandaloneInternalBriefsFromChatBody || ((body) => String(body || '')),
    stripInternalBriefFromChatBody: options.stripInternalBriefFromChatBody || ((body) => String(body || '')),
    guestTrialPromoTextForDraft: options.guestTrialPromoTextForDraft || noopString,
    currentOrderDraft: options.currentOrderDraft || noopObject,
    openChatLooksNumberedLeaderIntakeAnswer: options.openChatLooksNumberedLeaderIntakeAnswer || noopBoolean,
    hasOpenChatPendingLeaderIntake: options.hasOpenChatPendingLeaderIntake || noopBoolean,
    hasOpenChatPendingQuestionPrompt: options.hasOpenChatPendingQuestionPrompt || noopBoolean,
    isOpenChatExplicitDispatchRequest: options.isOpenChatExplicitDispatchRequest || noopBoolean,
    lastOpenChatPreparedBrief: options.lastOpenChatPreparedBrief || noopString,
    isOpenChatRunConfirmation: options.isOpenChatRunConfirmation || noopBoolean,
    openChatLooksConfirmOrderChoice: options.openChatLooksConfirmOrderChoice || noopBoolean,
    isOpenChatGenericProceed: options.isOpenChatGenericProceed || noopBoolean,
    openChatVagueChoicePrompt: options.openChatVagueChoicePrompt || noopString,
    openChatNaturalChoiceIntent: options.openChatNaturalChoiceIntent || noopString,
    openChatProductQuestionContext: options.openChatProductQuestionContext || noopBoolean,
    openChatReadiness: options.openChatReadiness || (() => null)
  };

  function chatAnswerDisplayBody(answer, prompt = '', inputCounts = {}) {
    const body = chatAnswerBody(answer);
    const brief = String(answer?.nextPrompt || '').trim();
    if (!hooks.isStructuredOrderBrief(brief)) return hooks.stripStandaloneInternalBriefsFromChatBody(body);
    const taskType = hooks.structuredOrderBriefParts(brief).taskType || hooks.inferClientTaskSequence('', prompt)[0] || hooks.currentRoutingTask() || 'research';
    const preview = hooks.openChatHumanDispatchPreview(brief, taskType, prompt || brief, inputCounts);
    const displayBody = hooks.stripInternalBriefFromChatBody(body, brief, preview);
    const promo = hooks.guestTrialPromoTextForDraft({
      ...hooks.currentOrderDraft(),
      prompt: brief,
      task_type: taskType
    }, prompt || brief);
    if (!promo || displayBody.includes('ゲストでも1回だけトライできます') || displayBody.includes('try this once as a guest')) {
      return displayBody;
    }
    return `${displayBody}\n\n${promo}`;
  }

  function isOpenChatClarificationAnswer(prompt = '') {
    const text = String(prompt || '').trim();
    if (!text || text.length > 1200) return false;
    if (hooks.isStructuredOrderBrief(text)) return false;
    if (/^(回答|答え|回答です|answers?|my answers?|clarification answers?)\s*[:：]/i.test(text)) return true;
    if (/^(1[\).．、:]|１[\).．、:]|Q?1[:：]|A1[:：])\s*/i.test(text)) return true;
    if (/^(?:[A-Da-dＡ-Ｄａ-ｄ][\).．、:]|Q?[A-Da-dＡ-Ｄａ-ｄ][:：])\s*/i.test(text)) return true;
    const lines = text.split(/\n+/).map((line) => line.trim()).filter(Boolean);
    if (lines.length >= 2 && lines.slice(0, 4).some((line) => /^(?:[1-4１-４][\).．、:]|[A-Da-dＡ-Ｄａ-ｄ][\).．、:]|[-・*])\s+/.test(line))) return true;
    if (/(質問|確認|不足|clarifying|missing)/i.test(text) && /(回答|answer|答え)/i.test(text)) return true;
    return false;
  }

  function cleanOpenChatClarificationAnswer(prompt = '') {
    return compactChatText(String(prompt || '')
      .trim()
      .replace(/^(回答|答え|回答です|answers?|my answers?|clarification answers?)\s*[:：]\s*/i, '')
      .replace(/\s+/g, ' '), 520);
  }

  function mergeClarificationAnswersIntoBrief(brief = '', answer = '') {
    const original = String(brief || '').trim();
    const addition = cleanOpenChatClarificationAnswer(answer);
    if (!original || !addition) return original;
    const lines = original.split('\n');
    const clarificationIndex = lines.findIndex((line) => /^Clarifications:\s*/i.test(line));
    if (clarificationIndex >= 0) {
      const current = lines[clarificationIndex].replace(/^Clarifications:\s*/i, '').trim();
      lines[clarificationIndex] = `Clarifications: ${current ? `${current}; ${addition}` : addition}`;
    } else {
      const insertAfterIndex = Math.max(
        lines.findIndex((line) => /^Constraints:\s*/i.test(line)),
        lines.findIndex((line) => /^Inputs:\s*/i.test(line))
      );
      lines.splice(insertAfterIndex >= 0 ? insertAfterIndex + 1 : Math.min(lines.length, 4), 0, `Clarifications: ${addition}`);
    }
    const languageIndex = lines.findIndex((line) => /^Output language:\s*/i.test(line));
    if (languageIndex >= 0 && /(英語|english)/i.test(addition)) {
      lines[languageIndex] = 'Output language: English';
    } else if (languageIndex >= 0 && /(日本語|japanese)/i.test(addition)) {
      lines[languageIndex] = 'Output language: Japanese';
    }
    return lines.join('\n');
  }

  function openChatAnswerMustPauseForSendOrder(prompt = '', answer = null) {
    const patternId = String(answer?.patternId || '').trim();
    if (patternId === 'pattern_leader_intake_followup' || patternId === 'pattern_pending_question_followup') return true;
    if (answer?.clearLeaderIntake || answer?.leaderIntakePrompt || answer?.leaderIntakeTask) return true;
    if (answer?.clearPendingQuestion || answer?.pendingQuestionPrompt || answer?.pendingQuestionTask) return true;
    if (hooks.openChatLooksNumberedLeaderIntakeAnswer(prompt)) return true;
    if (hooks.hasOpenChatPendingLeaderIntake() || hooks.hasOpenChatPendingQuestionPrompt()) return true;
    return false;
  }

  function openChatCanDirectDispatchAssistAnswer(prompt = '', answer = null) {
    if (!answer || chatAnswerKind(answer) !== 'assist') return false;
    if (!hooks.isOpenChatExplicitDispatchRequest(prompt)) return false;
    if (openChatAnswerMustPauseForSendOrder(prompt, answer)) return false;
    const preparedBrief = hooks.lastOpenChatPreparedBrief();
    if (!hooks.isStructuredOrderBrief(preparedBrief)) return false;
    return hooks.isOpenChatRunConfirmation(prompt) || hooks.openChatLooksConfirmOrderChoice(prompt);
  }

  function buildOpenChatPendingChoiceReminder(prompt = '') {
    const original = String(hooks.openChatVagueChoicePrompt() || '').trim();
    if (!original || !hooks.isOpenChatGenericProceed(prompt)) return null;
    const intent = String(hooks.openChatNaturalChoiceIntent() || '').trim();
    const ja = hooks.looksJapanese(prompt) || hooks.looksJapanese(original);
    const optionTwo = intent === 'natural_marketing_launch'
      ? (ja ? '2. 投稿文、LP、スクショなど材料を貼って改善する' : '2. Paste the post, landing page, or screenshot and improve it')
      : (ja ? '2. 条件を自分で具体化してから発注ブリーフにする' : '2. Narrow the conditions yourself before preparing the brief');
    return {
      kind: 'clarify',
      tone: 'warn',
      body: ja
        ? [
          '進められます。ただ、今はまだ「どの進め方にするか」が未選択です。',
          '',
          `元の相談: ${compactChatText(original, 220)}`,
          '',
          '番号だけで選んでください。',
          '1. 先にリサーチ/診断して選択肢を出す',
          optionTwo,
          '',
          'まだ注文も課金も発生しません。'
        ].join('\n')
        : [
          'I can proceed, but the path is not selected yet.',
          '',
          `Original request: ${compactChatText(original, 220)}`,
          '',
          'Reply with a number:',
          '1. Research/diagnose first and return options',
          optionTwo,
          '',
          'No order or billing happens yet.'
        ].join('\n'),
      status: 'Choose a path first.\n\nNo order was created and no billing occurred.'
    };
  }

  function shouldUseOpenChatTrio(prompt = '', answer = null) {
    const kind = chatAnswerKind(answer);
    if (!['assist', 'clarify'].includes(kind)) return false;
    if (answer?.suppressTrio) return false;
    if (answer?.nextPrompt) return false;
    if (hooks.openChatProductQuestionContext(prompt)) return false;
    if ([
      'pattern_sensitive_secret',
      'pattern_unsafe_request',
      'pattern_high_stakes_advice',
      'pattern_cost_budget',
      'pattern_payment_confusion',
      'pattern_capability_question',
      'pattern_greeting',
      'pattern_general_help',
      'pattern_low_info_test',
      'pattern_low_info_ambiguous'
    ].includes(String(answer?.patternId || ''))) return false;
    const body = chatAnswerBody(answer);
    return Boolean(String(prompt || '').trim() && String(body || '').trim());
  }

  function buildOpenChatTrioDiscussion(prompt = '', answer = null, context = {}) {
    if (!shouldUseOpenChatTrio(prompt, answer)) return [];
    const body = chatAnswerBody(answer);
    const kind = chatAnswerKind(answer);
    const ja = hooks.looksJapanese(prompt) || hooks.looksJapanese(body);
    const patternId = String(answer?.patternId || '').trim();
    const nextPrompt = String(context.nextPrompt || answer?.nextPrompt || '').trim();
    const fallbackBrief = hooks.lastOpenChatPreparedBrief();
    const hasPreparedBrief = hooks.isStructuredOrderBrief(nextPrompt) || hooks.isStructuredOrderBrief(fallbackBrief);
    const hasSourceFile = Boolean(answer?.sourceFile || (Array.isArray(answer?.sourceFiles) && answer.sourceFiles.length));
    const readiness = hasPreparedBrief
      ? hooks.openChatReadiness(hooks.structuredOrderBriefParts(nextPrompt || fallbackBrief).taskType || 'research', nextPrompt || fallbackBrief, context.inputCounts || {})
      : null;

    if (patternId.startsWith('natural_ai_beginner_')) {
      const focusMapJa = {
        natural_ai_beginner_start: 'AIの知識より、まず「困っていること」をそのまま書けば十分です。',
        natural_ai_beginner_examples: '最初は高度な依頼より、要約、比較、文章作成、改善点出しが試しやすいです。',
        natural_ai_beginner_prompt_help: 'プロンプトを完成させる必要はありません。足りない部分はチャットで聞き返します。',
        natural_ai_beginner_terms: '用語を覚えるより、やりたい作業を1文で書く方が早いです。',
        natural_ai_beginner_safety: 'SEND ORDERを押す前は実作業も課金も走らない、という区切りを見せるのが重要です。',
        natural_ai_beginner_chatgpt_diff: '普通のチャットから始めて、必要な時だけ納品付きの作業に変える流れです。'
      };
      const focusMapEn = {
        natural_ai_beginner_start: 'You do not need AI knowledge. Start by writing the problem in normal words.',
        natural_ai_beginner_examples: 'For a first try, summaries, comparisons, writing, and improvement ideas are easiest.',
        natural_ai_beginner_prompt_help: 'The prompt does not need to be perfect. Missing details can be clarified in chat.',
        natural_ai_beginner_terms: 'It is faster to write the task in one sentence than to learn every term first.',
        natural_ai_beginner_safety: 'The important boundary is that paid work does not run before SEND ORDER.',
        natural_ai_beginner_chatgpt_diff: 'Start like normal chat, then turn it into delivered work only when needed.'
      };
      const turns = ja
        ? [
          { role: 'beginner', label: '初心者目線', tone: 'info', body: focusMapJa[patternId] || '専門用語なしで、まず目的だけを確認します。' },
          { role: 'guide', label: '案内役', tone: 'ok', body: '番号か短い文章で続けられます。回答後にSEND ORDER用の内容へ整理します。' }
        ]
        : [
          { role: 'beginner', label: 'Beginner view', tone: 'info', body: focusMapEn[patternId] || 'We will avoid jargon and clarify the goal first.' },
          { role: 'guide', label: 'Guide', tone: 'ok', body: 'Reply with a number or short sentence. No order or billing happens here.' }
        ];
      return turns.map(normalizeOpenChatTrioTurn);
    }

    if (patternId.startsWith('natural_engineer_')) {
      const focusMapJa = {
        natural_engineer_bug_debug: 'ログ、再現手順、期待挙動がないと原因調査が空振りします。',
        natural_engineer_code_review: 'diffだけでなく、見てほしい観点を決めるとレビューの精度が上がります。',
        natural_engineer_feature_impl: '要件を受け入れ条件に変換してから実装に進む方が手戻りが少ないです。',
        natural_engineer_ci_deploy: 'CI/デプロイは最後の失敗ログと直前変更を先に固定します。',
        natural_engineer_agent_adapter: 'repoをagent化する場合は、入力、出力、endpoint/adapter、verify条件を先に分けます。',
        natural_engineer_api_cli: 'API/CLI連携は、実行元、課金元、納品取得方法を分ける必要があります。',
        natural_engineer_architecture: '設計レビューは、制約とリスクを先に固定しないと一般論になります。'
      };
      const focusMapEn = {
        natural_engineer_bug_debug: 'Without logs, repro steps, and expected behavior, debugging becomes guesswork.',
        natural_engineer_code_review: 'Review quality improves when the diff and review focus are both explicit.',
        natural_engineer_feature_impl: 'Turning requirements into acceptance criteria before implementation reduces rework.',
        natural_engineer_ci_deploy: 'For CI/deploy failures, pin down the failing log and recent change first.',
        natural_engineer_agent_adapter: 'For repo-to-agent work, separate input, output, endpoint/adapter, and verify conditions first.',
        natural_engineer_api_cli: 'For API/CLI integration, split caller, funding source, and delivery retrieval.',
        natural_engineer_architecture: 'Architecture review becomes generic unless constraints and risks are fixed first.'
      };
      const turns = ja
        ? [
          { role: 'engineer-a', label: 'Engineer A', tone: 'warn', body: focusMapJa[patternId] || 'このまま実行すると前提不足で外す可能性があります。' },
          { role: 'engineer-b', label: 'Engineer B', tone: 'ok', body: '次の返信で不足情報を足せば、発注ブリーフに落としてからSEND ORDERできます。' }
        ]
        : [
          { role: 'engineer-a', label: 'Engineer A', tone: 'warn', body: focusMapEn[patternId] || 'Running this now could miss important assumptions.' },
          { role: 'engineer-b', label: 'Engineer B', tone: 'ok', body: 'Add the missing details next, then I can turn it into a work brief before SEND ORDER.' }
        ];
      return turns.map(normalizeOpenChatTrioTurn);
    }

    if (ja) {
      const turns = kind === 'clarify'
        ? [
          { role: 'tsukkomi', label: '突っ込み', tone: 'warn', body: 'このまま走らせると意図がずれる可能性があります。先に進め方か不足情報を1つだけ確認します。' },
          { role: 'proposal', label: '提案', tone: 'info', body: '番号だけ、または短い補足だけで続けられます。長い説明は不要です。' },
          { role: 'engineer', label: 'エンジニア', tone: 'ok', body: '回答後にSEND ORDER用の発注ブリーフへ反映します。' }
        ]
        : [
          {
            role: 'tsukkomi',
            label: '突っ込み',
            tone: readiness?.score >= 75 ? 'info' : 'warn',
            body: hasSourceFile
              ? '長文やプロンプト風の本文をそのまま実行指示に混ぜると危険なので、sourceとして分離しています。'
              : (readiness ? `準備度は ${readiness.label} (${readiness.score}/100)。足りない条件があれば今足す方が安全です。` : '目的は拾えていますが、実行前に成果物の形だけ確認した方が安全です。')
          },
          { role: 'proposal', label: '提案', tone: 'info', body: '内容が合っていれば次はSEND ORDER。違う場合は、条件をそのまま追加してください。' },
          { role: 'engineer', label: 'エンジニア', tone: 'ok', body: hasPreparedBrief ? '実行用の下書きは裏側に保存しています。チャット返信だけでは実行も課金もしません。' : '次の返信でオーダー内容に整理できる状態です。' }
        ];
      return turns.map(normalizeOpenChatTrioTurn);
    }

    const turns = kind === 'clarify'
      ? [
        { role: 'tsukkomi', label: 'Critique', tone: 'warn', body: 'Running this as-is could miss the intent, so I need one path or missing input first.' },
        { role: 'proposal', label: 'Proposal', tone: 'info', body: 'A number or short clarification is enough. No long explanation is required.' },
        { role: 'engineer', label: 'Engineer', tone: 'ok', body: 'I will fold the answer into the SEND ORDER-ready work brief.' }
      ]
      : [
        {
          role: 'tsukkomi',
          label: 'Critique',
          tone: readiness?.score >= 75 ? 'info' : 'warn',
          body: hasSourceFile
            ? 'I separated the long or prompt-like source so quoted instructions do not become execution instructions.'
            : (readiness ? `Readiness is ${readiness.label} (${readiness.score}/100). Add constraints now if the output shape is still off.` : 'The intent is understandable, but the output shape should be checked before execution.')
        },
        { role: 'proposal', label: 'Proposal', tone: 'info', body: 'If this matches the outcome, press SEND ORDER next. If not, add the constraint here.' },
        { role: 'engineer', label: 'Engineer', tone: 'ok', body: hasPreparedBrief ? 'The runnable draft is saved behind the chat. This reply does not execute or charge anything.' : 'The next reply can be turned into a runnable work draft.' }
      ];
    return turns.map(normalizeOpenChatTrioTurn);
  }

  function renderOpenChatTrioTurns(turns = []) {
    const normalized = (Array.isArray(turns) ? turns : [])
      .map(normalizeOpenChatTrioTurn)
      .filter((turn) => turn.body);
    if (!normalized.length) return '';
    return `
      <div class="open-chat-trio" aria-label="Chat review">
        ${normalized.map((turn) => `
          <div class="open-chat-trio-turn ${escapeHtml(turn.role)} ${escapeHtml(turn.tone)}">
            <span class="open-chat-trio-label">${escapeHtml(turn.label)}</span>
            <span class="open-chat-trio-body">${escapeHtml(turn.body)}</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  return {
    chatAnswerDisplayBody,
    isOpenChatClarificationAnswer,
    cleanOpenChatClarificationAnswer,
    mergeClarificationAnswersIntoBrief,
    openChatAnswerMustPauseForSendOrder,
    openChatCanDirectDispatchAssistAnswer,
    buildOpenChatPendingChoiceReminder,
    shouldUseOpenChatTrio,
    buildOpenChatTrioDiscussion,
    renderOpenChatTrioTurns
  };
}
