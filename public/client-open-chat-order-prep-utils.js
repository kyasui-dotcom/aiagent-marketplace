import { compactClientText as compactChatText } from './client-text-utils.js?v=20260521a';

export function createClientOpenChatOrderPrepUtils(options = {}) {
  const getState = typeof options.getState === 'function' ? options.getState : () => ({});
  const looksJapanese = typeof options.looksJapanese === 'function' ? options.looksJapanese : () => false;
  const openChatFollowupMode = typeof options.openChatFollowupMode === 'function' ? options.openChatFollowupMode : () => '';
  const lastOpenChatPreparedBrief = typeof options.lastOpenChatPreparedBrief === 'function' ? options.lastOpenChatPreparedBrief : () => '';
  const structuredOrderBriefParts = typeof options.structuredOrderBriefParts === 'function' ? options.structuredOrderBriefParts : () => ({});
  const inferClientTaskSequence = typeof options.inferClientTaskSequence === 'function' ? options.inferClientTaskSequence : () => [];
  const orderRoutingDecision = typeof options.orderRoutingDecision === 'function' ? options.orderRoutingDecision : () => ({ strategy: 'single', reason: '', plan: {} });
  const openChatClarifyingQuestions = typeof options.openChatClarifyingQuestions === 'function' ? options.openChatClarifyingQuestions : () => [];
  const openChatReadinessBlock = typeof options.openChatReadinessBlock === 'function' ? options.openChatReadinessBlock : () => '';
  const isStructuredOrderBrief = typeof options.isStructuredOrderBrief === 'function' ? options.isStructuredOrderBrief : () => false;
  const openChatDeliverableForTask = typeof options.openChatDeliverableForTask === 'function' ? options.openChatDeliverableForTask : () => '';
  const openChatDeliveryPreviewBlock = typeof options.openChatDeliveryPreviewBlock === 'function' ? options.openChatDeliveryPreviewBlock : () => '';
  const mergeClarificationAnswersIntoBrief = typeof options.mergeClarificationAnswersIntoBrief === 'function' ? options.mergeClarificationAnswersIntoBrief : (brief) => brief;
  const cleanOpenChatClarificationAnswer = typeof options.cleanOpenChatClarificationAnswer === 'function' ? options.cleanOpenChatClarificationAnswer : (value) => String(value || '').trim();
  const reviseStructuredBriefWithInstruction = typeof options.reviseStructuredBriefWithInstruction === 'function' ? options.reviseStructuredBriefWithInstruction : (brief) => brief;
  const openChatParallelPlanBlock = typeof options.openChatParallelPlanBlock === 'function' ? options.openChatParallelPlanBlock : () => ({ body: '', plan: [] });
  const catCompactDispatchBrief = typeof options.catCompactDispatchBrief === 'function' ? options.catCompactDispatchBrief : (value) => String(value || '');
  const openChatHumanDispatchPreview = typeof options.openChatHumanDispatchPreview === 'function' ? options.openChatHumanDispatchPreview : () => '';
  const openChatReadyToRunBlock = typeof options.openChatReadyToRunBlock === 'function' ? options.openChatReadyToRunBlock : () => '';
  const currentRoutingTask = typeof options.currentRoutingTask === 'function' ? options.currentRoutingTask : () => '';
  const currentOrderDraft = typeof options.currentOrderDraft === 'function' ? options.currentOrderDraft : () => ({});
  const currentComposerPrompt = typeof options.currentComposerPrompt === 'function' ? options.currentComposerPrompt : () => '';
  const preflightAgentsForDraft = typeof options.preflightAgentsForDraft === 'function' ? options.preflightAgentsForDraft : () => [];
  const agentExecutionProfile = typeof options.agentExecutionProfile === 'function' ? options.agentExecutionProfile : () => null;
  const clientOrderPreflight = typeof options.clientOrderPreflight === 'function' ? options.clientOrderPreflight : () => ({ ok: true, code: '', missingConnectors: [] });
  const openChatSourceText = typeof options.openChatSourceText === 'function' ? options.openChatSourceText : (value) => String(value || '').trim();
  const explicitOpenChatAssistMode = typeof options.explicitOpenChatAssistMode === 'function' ? options.explicitOpenChatAssistMode : () => '';
  const openChatRequirementHubSpec = typeof options.openChatRequirementHubSpec === 'function' ? options.openChatRequirementHubSpec : () => null;
  const isOpenChatLongPromptSource = typeof options.isOpenChatLongPromptSource === 'function' ? options.isOpenChatLongPromptSource : () => false;
  const openChatLongPromptSourceSummary = typeof options.openChatLongPromptSourceSummary === 'function' ? options.openChatLongPromptSourceSummary : () => ({ files: [], preservedChars: 0, clipped: false });
  const buildOpenChatProtectedSourceBrief = typeof options.buildOpenChatProtectedSourceBrief === 'function' ? options.buildOpenChatProtectedSourceBrief : (value) => String(value || '');
  const orderInputCounts = typeof options.orderInputCounts === 'function' ? options.orderInputCounts : () => ({});

  function openChatDispatchReady(prompt = '') {
    const text = String(prompt || '').trim();
    if (!text) return false;
    return isStructuredOrderBrief(text) || Boolean(getState()?.intakeConfirmed && text);
  }

  function openChatShouldPrepareBeforeDispatch(draft = {}) {
    const prompt = String(draft?.prompt || '').trim();
    const counts = orderInputCounts(draft?.input || null);
    if (!prompt && !counts.urlCount && !counts.fileCount) return false;
    return !openChatDispatchReady(prompt);
  }

  function openChatPreflightPreviewLines(taskType = 'research', prompt = '', ja = false) {
    const draft = {
      ...currentOrderDraft(),
      task_type: taskType,
      prompt: prompt || currentComposerPrompt()
    };
    const agents = preflightAgentsForDraft(draft);
    const agent = agents[0] || null;
    const profile = agent ? agentExecutionProfile(agent) : null;
    const preflight = clientOrderPreflight(draft);
    if (!agent || !profile) {
      return ja
        ? ['候補agent: 未確定', '事前確認: ready agentが見つかると connector/risk を確認します。']
        : ['Candidate agent: not fixed yet', 'Preflight: connector/risk checks will run once a ready agent is selected.'];
    }
    const connectorText = profile.requiredConnectors.length ? profile.requiredConnectors.join(', ') : '-';
    const riskText = profile.confirmationRequiredFor.length ? `${profile.riskLevel} (${profile.confirmationRequiredFor.join(', ')})` : profile.riskLevel;
    const status = preflight.ok
      ? (ja ? '通過見込み' : 'likely clear')
      : (preflight.code === 'connector_required'
          ? (ja ? `connector不足: ${preflight.missingConnectors.join(', ')}` : `missing connector: ${preflight.missingConnectors.join(', ')}`)
          : (ja ? '実行前確認が必要' : 'confirmation required before dispatch'));
    return ja
      ? [
          `候補agent: ${agent.name}`,
          `Connector: ${connectorText}`,
          `Risk: ${riskText}`,
          `事前確認: ${status}`
        ]
      : [
          `Candidate agent: ${agent.name}`,
          `Connectors: ${connectorText}`,
          `Risk: ${riskText}`,
          `Preflight: ${status}`
        ];
  }

  const resolveOpenChatFollowupAnswer = (prompt = '', inputCounts = {}) => {
    const mode = openChatFollowupMode(prompt);
    if (!mode) return null;
    const previousBrief = lastOpenChatPreparedBrief();
    if (!previousBrief) return null;
    const parts = structuredOrderBriefParts(previousBrief);
    const ja = looksJapanese(prompt);
    const taskType = parts.taskType || inferClientTaskSequence('', previousBrief)[0] || 'research';
    const route = orderRoutingDecision(taskType, previousBrief, 'auto');
    const questions = openChatClarifyingQuestions(taskType, previousBrief);
    const readinessBlock = openChatReadinessBlock(taskType, previousBrief, inputCounts, { ja });
    const missing = [];
    if (!parts.goal) missing.push(ja ? 'Goal が空です。最終目的を1文で足してください。' : 'Goal is missing. Add the final objective in one sentence.');
    if (/seo/i.test(taskType) && !/(url|https?:\/\/|キーワード|keyword|地域|language|言語)/i.test(previousBrief)) {
      missing.push(ja ? 'SEO系は対象URL、狙うキーワード、対象地域/言語があると精度が上がります。' : 'For SEO work, add target URL, keyword, region, and language if available.');
    }
    if (/pricing|research/i.test(taskType) && !/(競合|compare|competitor|source|https?:\/\/|市場|market)/i.test(previousBrief)) {
      missing.push(ja ? '比較/調査系は競合、情報源、対象市場があると納品品質が上がります。' : 'For research/comparison work, add competitors, sources, or target market if available.');
    }
    if (!isStructuredOrderBrief(previousBrief)) {
      missing.push(ja ? '構造化された発注文ではありません。もう一度ブラッシュアップしてください。' : 'This is not a structured work order. Refine it once first.');
    }
    if (mode === 'explain') {
      const goal = parts.goal || compactChatText(previousBrief.replace(/\s+/g, ' '), 180);
      return {
        kind: 'clarify',
        tone: 'info',
        suppressTrio: true,
        body: ja
          ? [
            '要点だけで言うと、今の発注文はこれです。',
            '',
            `目的: ${goal}`,
            `タスク: ${taskType}`,
            `納品: ${parts.deliver || openChatDeliverableForTask(taskType)}`,
            '',
            'この方向で合っていれば SEND ORDER。違う場合は「違う、...」で修正できます。'
          ].join('\n')
          : [
            'In short, the current work order is:',
            '',
            `Goal: ${goal}`,
            `Task: ${taskType}`,
            `Delivery: ${parts.deliver || openChatDeliverableForTask(taskType)}`,
            '',
            'If this direction is right, press SEND ORDER. If not, reply with “not that, ...” to correct it.'
          ].join('\n'),
        nextPrompt: previousBrief,
        status: 'Draft explained.\n\nPress SEND ORDER if the direction is right.'
      };
    }
    if (mode === 'delivery') {
      return {
        kind: 'assist',
        body: ja
          ? [
            '発注前の納品イメージです。内容が合っていれば SEND ORDER できます。',
            '',
            openChatDeliveryPreviewBlock(taskType, previousBrief, inputCounts, { ja })
          ].join('\n')
          : [
            'Pre-dispatch delivery preview. If this looks right, press SEND ORDER.',
            '',
            openChatDeliveryPreviewBlock(taskType, previousBrief, inputCounts, { ja })
          ].join('\n'),
        nextPrompt: previousBrief,
        status: 'Delivery preview created.\n\nReview the expected output, then press SEND ORDER when ready.'
      };
    }
    if (mode === 'answers') {
      const nextBrief = mergeClarificationAnswersIntoBrief(previousBrief, prompt);
      const nextReadinessBlock = openChatReadinessBlock(taskType, nextBrief, inputCounts, { ja });
      return {
        kind: 'assist',
        body: ja
          ? [
            '回答をオーダー内容に統合しました。内容が合っていれば SEND ORDER できます。',
            '',
            nextReadinessBlock,
            '',
            '回答統合後のオーダー内容:',
            nextBrief,
            '',
            '統合した回答:',
            cleanOpenChatClarificationAnswer(prompt),
            '',
            '次の動き: さらに「回答: ...」で補足する、短くする、足りない情報を確認する、または SEND ORDER してください。'
          ].join('\n')
          : [
            'I merged those answers into the prepared order. If this looks right, press SEND ORDER.',
            '',
            nextReadinessBlock,
            '',
            'Order summary with answers:',
            nextBrief,
            '',
            'Merged answers:',
            cleanOpenChatClarificationAnswer(prompt),
            '',
            'Next: add more answers with “Answers: ...”, make it shorter, check missing inputs, or press SEND ORDER.'
          ].join('\n'),
        nextPrompt: nextBrief,
        status: 'Clarification answers merged.\n\nReview the updated order summary, then press SEND ORDER.'
      };
    }
    if (mode === 'edit') {
      const nextBrief = reviseStructuredBriefWithInstruction(previousBrief, prompt);
      return {
        kind: 'assist',
        body: ja
          ? [
            '条件を追加しました。内容が合っていれば SEND ORDER できます。',
            '',
            '更新後のオーダー内容:',
            nextBrief,
            '',
            '次の動き: さらに条件を足す、短くする、足りない情報を確認する、または SEND ORDER してください。'
          ].join('\n')
          : [
            'I added that condition to the prepared order. If this looks right, press SEND ORDER.',
            '',
            'Updated order summary:',
            nextBrief,
            '',
            'Next: add more constraints, make it shorter, check missing inputs, or press SEND ORDER.'
          ].join('\n'),
        nextPrompt: nextBrief,
        status: 'Order prep updated.\n\nReview the updated order summary, then press SEND ORDER.'
      };
    }
    if (mode === 'cheap') {
      const nextBrief = reviseStructuredBriefWithInstruction(
        previousBrief,
        ja
          ? `${prompt}; コスト最小化。浅い調査から始め、必要な場合だけ追加調査する。納品は要点優先。`
          : `${prompt}; optimize for low cost. Start with shallow research, expand only if necessary, and keep delivery concise.`
      );
      return {
        kind: 'assist',
        tone: 'ok',
        body: ja
          ? [
            '低コスト優先の条件を追加しました。内容が合っていれば SEND ORDER できます。',
            '',
            '更新後のオーダー内容:',
            nextBrief,
            '',
            '実行前に見積もりと最大予約額を確認してください。さらに上限がある場合は「最大 $X 以内」と追加できます。'
          ].join('\n')
          : [
            'I added low-cost constraints to the prepared order. If this looks right, press SEND ORDER.',
            '',
            'Updated order summary:',
            nextBrief,
            '',
            'Review the estimate and max reserve before dispatch. If you have a hard cap, add “max $X”.'
          ].join('\n'),
        nextPrompt: nextBrief,
        status: 'Low-cost constraint added.\n\nReview the estimate, then press SEND ORDER.'
      };
    }
    if (mode === 'review') {
      return {
        kind: 'assist',
        body: ja
          ? [
            '発注前レビューです。内容が合っていれば SEND ORDER できます。',
            '',
            `判定: ${missing.length ? '追加情報があると良いです。' : 'このまま発注可能な形です。'}`,
            `推定タスク: ${taskType}`,
            `実行形: ${route.strategy === 'multi' ? 'Agent Team candidate' : 'single-agent candidate'}`,
            readinessBlock,
            '',
            '追加すると良い情報:',
            ...(missing.length ? missing.map((item, index) => `${index + 1}. ${item}`) : ['1. 追加必須項目は見当たりません。必要なら対象範囲や納品形式だけ微調整してください。']),
            '',
            '確認質問:',
            ...questions.map((question, index) => `${index + 1}. ${question}`),
            '',
            '次の動き: 「回答: 1. ... 2. ...」で答えるとオーダー内容に統合します。実作業として送る場合は SEND ORDER してください。'
          ].join('\n')
          : [
            'Order-prep review. If this looks right, press SEND ORDER.',
            '',
            `Verdict: ${missing.length ? 'More input would improve the order.' : 'This is ready enough to dispatch.'}`,
            `Inferred task: ${taskType}`,
            `Routing shape: ${route.strategy === 'multi' ? 'Agent Team candidate' : 'single-agent candidate'}`,
            readinessBlock,
            '',
            'Useful additions:',
            ...(missing.length ? missing.map((item, index) => `${index + 1}. ${item}`) : ['1. No required gaps detected. Optionally refine scope or delivery format.']),
            '',
            'Clarifying questions:',
            ...questions.map((question, index) => `${index + 1}. ${question}`),
            '',
            'Next: reply with “Answers: 1. ... 2. ...” to merge details into the brief, or press SEND ORDER.'
          ].join('\n'),
        nextPrompt: previousBrief,
        status: 'Order prep reviewed.\n\nReview the summary, then press SEND ORDER.'
      };
    }
    if (mode === 'split') {
      const parallel = openChatParallelPlanBlock(previousBrief, inputCounts, { ja });
      return {
        kind: 'assist',
        body: ja
          ? [
            '並列ワークへ分けました。内容が合っていれば SEND ORDER できます。',
            '',
            `推定タスク: ${taskType}`,
            `実行形: ${route.strategy === 'multi' ? 'Agent Team candidate' : 'single-agent order split into parallel drafts'}`,
            readinessBlock,
            '',
            parallel.body,
            '',
            '元の発注文:',
            previousBrief
          ].join('\n')
          : [
            'I split this into parallel work drafts. If this looks right, press SEND ORDER.',
            '',
            `Inferred task: ${taskType}`,
            `Routing shape: ${route.strategy === 'multi' ? 'Agent Team candidate' : 'single-agent order split into parallel drafts'}`,
            readinessBlock,
            '',
            parallel.body,
            '',
            'Source work order:',
            previousBrief
          ].join('\n'),
        nextPrompt: previousBrief,
        parallelPlan: parallel.plan,
        status: ja
          ? '並列ワーク案を作成しました。\n\n発注も課金も発生していません。内容を確認してから SEND ORDER してください。'
          : 'Parallel work plan created.\n\nNo order was created and no billing occurred. Review the drafts, then press SEND ORDER when ready.'
      };
    }
    const nextBrief = catCompactDispatchBrief(previousBrief, taskType, inputCounts, {
      maxGoalLength: mode === 'compact' ? 170 : 320,
      outputLanguage: mode === 'english' ? 'English' : (mode === 'japanese' ? 'Japanese' : parts.outputLanguage || undefined),
      englishSkeleton: mode === 'english' || mode === 'compact'
    });
    const labelJa = {
      compact: '短く再整理しました。',
      english: '英語寄りの実行ブリーフにしました。',
      japanese: '日本語出力指定の発注文に戻しました。',
      split: '分割前提の発注文として再整理しました。'
    }[mode] || '発注文を再整理しました。';
    const labelEn = {
      compact: 'I compacted the prepared brief.',
      english: 'I made the execution brief more English-first.',
      japanese: 'I switched the prepared brief back to Japanese output.',
      split: 'I reframed the brief around task splitting.'
    }[mode] || 'I revised the prepared brief.';
    return {
      kind: 'assist',
      body: ja
        ? [
          `${labelJa} 内容が合っていれば SEND ORDER できます。`,
          '',
          '更新後のオーダー内容:',
          nextBrief,
          '',
          '次の動き: さらに「足りない情報は？」などで確認できます。内容が合っていれば SEND ORDER してください。'
        ].join('\n')
        : [
          `${labelEn} If this looks right, press SEND ORDER.`,
          '',
          'Updated order summary:',
          nextBrief,
          '',
          'Next: you can still ask “what is missing?”, or press SEND ORDER when ready.'
        ].join('\n'),
      nextPrompt: nextBrief,
      status: 'Order prep updated.\n\nReview the updated order summary, then press SEND ORDER.'
    };
  };

  const resolveOpenChatImplicitOrderPrepAnswer = (prompt = '', inputCounts = {}, options = {}) => {
    const source = String(prompt || '').trim() || 'Use the attached source material and infer the most useful delivery.';
    const ja = looksJapanese(source);
    const taskType = inferClientTaskSequence('', source)[0] || currentRoutingTask() || 'research';
    const questions = openChatClarifyingQuestions(taskType, source);
    const brief = catCompactDispatchBrief(source, taskType, inputCounts);
    const preflightLines = openChatPreflightPreviewLines(taskType, source, ja);
    const sourceNote = options.sourceOnly
      ? (ja ? '入力ソースをもとに発注ブリーフを作りました。' : 'I prepared this from the attached source material.')
      : (ja ? '依頼文を発注ブリーフに変換しました。' : 'I converted the request into a structured work order brief.');
    const body = ja
      ? [
        `${sourceNote} 内容が合っていれば、このまま SEND ORDER できます。`,
        '',
        openChatHumanDispatchPreview(brief, taskType, source, inputCounts),
        ...preflightLines,
        '',
        '発注前に確認できること:',
        ...questions.map((question, index) => `${index + 1}. ${question}`),
        '',
        openChatReadyToRunBlock(true),
        '',
        '次の動き: 直すなら追記してください。実行するなら SEND ORDER を押してください。'
      ].join('\n')
      : [
        `${sourceNote} If this looks right, you can press SEND ORDER from here.`,
        '',
        openChatHumanDispatchPreview(brief, taskType, source, inputCounts),
        ...preflightLines,
        '',
        'Useful details to confirm before dispatch:',
        ...questions.map((question, index) => `${index + 1}. ${question}`),
        '',
        openChatReadyToRunBlock(false),
        '',
        'Next: add corrections here if needed, or press SEND ORDER to run it.'
      ].join('\n');
    return {
      kind: 'assist',
      body,
      nextPrompt: brief,
      status: 'Order draft ready.\n\nReview the order summary, then press SEND ORDER to run it.'
    };
  };

  const resolveOpenChatRequirementHubAnswer = (prompt = '', inputCounts = {}) => {
    const spec = openChatRequirementHubSpec(prompt, inputCounts);
    if (!spec?.requirements?.length) return null;
    const ja = looksJapanese(prompt);
    const hasGithub = spec.requirements.some((item) => item.type === 'github_repo');
    const commandOptions = spec.requirements
      .filter((item) => item.command)
      .map((item) => ({
        command: item.command,
        labelJa: item.type === 'github_repo' ? 'GitHubを連携する' : (item.type === 'google_workspace' ? 'Googleを連携する' : '関連設定を開く'),
        labelEn: item.type === 'github_repo' ? 'Connect GitHub' : (item.type === 'google_workspace' ? 'Connect Google' : 'Open related settings')
      }));
    return {
      kind: 'clarify',
      tone: hasGithub && !spec.githubAuthorized ? 'warn' : 'info',
      patternId: 'pattern_requirement_hub',
      suppressTrio: true,
      clearVagueChoice: true,
      clearNaturalChoice: true,
      options: commandOptions,
      body: ja
        ? [
            'これは外部アカウント、権限、source、またはagent固有の入力が必要な作業として受け取りました。',
            '',
            'CAItがハブになり、agentへ渡す前に必要条件を整理します。secret、password、API key、tokenはチャットに貼らないでください。',
            '',
            '検出した要件:',
            ...spec.requirements.map((item, index) => `${index + 1}. ${item.labelJa}: ${item.purposeJa}`),
            '',
            hasGithub
              ? `GitHub状態: ${spec.githubAuthorized ? '連携済みです。次は対象repo、branch、変更してよい範囲、完了条件を確認します。' : (spec.githubLinked ? 'GitHubは紐づいていますが、このブラウザのrepo操作権限を更新してください。' : 'GitHub連携が必要です。repo-backed coding は sandbox branch と pull request で納品します。')}`
              : '',
            hasGithub
              ? 'GitHub作業の納品: PR URL、branch/commit、diff summary、実行したtest、残リスク。mergeはユーザーが確認して行います。'
              : '',
            '',
            '次の動き: 必要な連携/権限/sourceを用意してください。そろったら、CAItが実行ブリーフに変換して SEND ORDER 前に確認します。まだ注文も課金も発生しません。'
          ].filter((line) => line !== '').join('\n')
        : [
            'I read this as work that needs an external account, permission, source, or agent-specific input.',
            '',
            'CAIt will act as the requirement hub before handing anything to an agent. Do not paste secrets, passwords, API keys, or tokens into chat.',
            '',
            'Detected requirements:',
            ...spec.requirements.map((item, index) => `${index + 1}. ${item.labelEn}: ${item.purposeEn}`),
            '',
            hasGithub
              ? `GitHub status: ${spec.githubAuthorized ? 'connected. Next confirm repo, branch, allowed change scope, and acceptance criteria.' : (spec.githubLinked ? 'linked, but this browser needs refreshed repo access.' : 'GitHub connection is required. Repo-backed coding should be delivered through a sandbox branch and pull request.')}`
              : '',
            hasGithub
              ? 'GitHub delivery: PR URL, branch/commit, diff summary, tests run, and remaining risks. The user reviews and merges.'
              : '',
            '',
            'Next: provide the required connection, permission, or source. Once ready, CAIt will turn it into an execution brief and pause before SEND ORDER. No order or billing happens yet.'
          ].filter((line) => line !== '').join('\n'),
      status: 'Requirement hub check.\n\nNo order was created and no billing occurred.'
    };
  };

  const resolveOpenChatLongPromptGuardAnswer = (prompt = '', inputCounts = {}) => {
    const source = String(prompt || '').trim();
    if (!isOpenChatLongPromptSource(source)) return null;
    const ja = looksJapanese(source);
    const brief = buildOpenChatProtectedSourceBrief(source, inputCounts);
    const sourceSummary = openChatLongPromptSourceSummary(source);
    const preservationLineJa = sourceSummary.clipped
      ? `元の本文は ${sourceSummary.files.length} 個の source file に分割し、先頭 ${sourceSummary.preservedChars} 文字まで保持します。それ以降は切り捨てます。`
      : `元の本文は ${sourceSummary.files.length} 個の source file として保持します。`;
    const preservationLineEn = sourceSummary.clipped
      ? `The original text will be split into ${sourceSummary.files.length} source files. The first ${sourceSummary.preservedChars} chars are preserved; anything after that is clipped.`
      : `The original text will be kept as ${sourceSummary.files.length} source file(s).`;
    return {
      kind: 'assist',
      tone: 'warn',
      body: ja
        ? [
          '超長文、またはAIプロンプト風の入力を検出しました。本文をそのままagent promptには混ぜません。',
          '',
          '入力欄には安全な実行ブリーフだけを残し、元の本文は source file として分離します。',
          preservationLineJa,
          '',
          'source内の system/developer/assistant/tool 指示は「引用された資料」として扱い、agentの実行指示として採用しないルールを入れています。',
          '',
          '実行する場合だけ、内容を確認して SEND ORDER してください。まだ注文も課金も発生しません。'
        ].join('\n')
        : [
          'I detected an ultra-long or prompt-like input. I will not mix the full text directly into the agent prompt.',
          '',
          'The input box will keep only a safe execution brief, and the original text will be separated as a source file.',
          preservationLineEn,
          '',
          'Any system/developer/assistant/tool instructions inside the source are treated as quoted material, not execution instructions.',
          '',
          'Review the brief, then press SEND ORDER only if you want paid dispatch. No order or billing happens yet.'
        ].join('\n'),
      nextPrompt: brief,
      sourceFiles: sourceSummary.files,
      status: 'Long prompt separated as source.\n\nNo order was created and no billing occurred. Review the safe brief before dispatch.'
    };
  };

  const resolveOpenChatAssistAnswer = (prompt = '', inputCounts = {}) => {
    const mode = explicitOpenChatAssistMode(prompt);
    if (!mode) return null;
    const source = openChatSourceText(prompt);
    const ja = looksJapanese(prompt);
    if (!source || source.length < 6 || (source === prompt && /^(ブラッシュアップ|整理|分解|英語化|ヒアリング|refine|compact|split|questions)\s*[。.!！\s]*$/i.test(source))) {
      return {
        kind: 'assist',
        body: ja
          ? '発注前に整理したい内容を同じ入力欄に追加してください。例文は不要です。やりたいこと、対象、欲しい納品形式が少しでもあれば、抜け漏れ確認と発注文への整理ができます。'
          : 'Add the rough request you want to prepare in the same input box. If you include the goal, target, and preferred delivery format, I can turn it into a clearer work order.',
        status: 'Order-prep chat.\n\nAdd the rough request, then CAIt will prepare it for SEND ORDER.'
      };
    }
    const taskType = inferClientTaskSequence('', source)[0] || currentRoutingTask() || 'research';
    const questions = openChatClarifyingQuestions(taskType, source);
    const brief = catCompactDispatchBrief(source, taskType, inputCounts);
    const modeLabelJa = {
      brushup: '発注文として具体化しました。',
      questions: '発注前に聞くべき確認事項を出しました。',
      split: 'タスク分解とルーティング候補を整理しました。',
      compact: '省トークンで実行しやすい英語寄りの実行ブリーフに圧縮しました。'
    }[mode] || '発注前に整理しました。';
    const modeLabelEn = {
      brushup: 'I refined this into a clearer work order.',
      questions: 'I listed the clarification questions to ask before dispatch.',
      split: 'I split the work and identified the routing shape.',
      compact: 'I compacted this into an execution brief for lower token waste.'
    }[mode] || 'I prepared this before ordering.';
    const body = ja
      ? [
        `${modeLabelJa} 内容が合っていれば SEND ORDER できます。`,
        '',
        openChatHumanDispatchPreview(brief, taskType, source, inputCounts),
        '',
        '不足しがちな確認:',
        ...questions.map((question, index) => `${index + 1}. ${question}`),
        '',
        openChatReadyToRunBlock(true),
        '',
        '次の動き: 「回答: 1. ... 2. ...」で確認事項に答えると、オーダー内容に反映します。実作業として送る場合は SEND ORDER してください。'
      ].join('\n')
      : [
        `${modeLabelEn} If this looks right, press SEND ORDER.`,
        '',
        openChatHumanDispatchPreview(brief, taskType, source, inputCounts),
        '',
        'Missing inputs to confirm:',
        ...questions.map((question, index) => `${index + 1}. ${question}`),
        '',
        openChatReadyToRunBlock(false),
        '',
        'Next: reply with “Answers: 1. ... 2. ...” to merge clarifications, or press SEND ORDER.'
      ].join('\n');
    return {
      kind: 'assist',
      body,
      nextPrompt: brief,
      status: 'Order draft ready.\n\nReview the order summary, then press SEND ORDER.'
    };
  };

  return {
    isOpenChatDispatchReadyPrompt: openChatDispatchReady,
    shouldPrepareOrderBeforeDispatch: openChatShouldPrepareBeforeDispatch,
    buildOpenChatFollowupAnswer: resolveOpenChatFollowupAnswer,
    buildOpenChatImplicitOrderPrepAnswer: resolveOpenChatImplicitOrderPrepAnswer,
    buildOpenChatRequirementHubAnswer: resolveOpenChatRequirementHubAnswer,
    buildOpenChatLongPromptGuardAnswer: resolveOpenChatLongPromptGuardAnswer,
    buildOpenChatAssistAnswer: resolveOpenChatAssistAnswer
  };
}
