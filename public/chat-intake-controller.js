export function createChatIntakeController(deps = {}) {
  const {
    state,
    els,
    window,
    chatEngineBuildIntakeCombinedPrompt,
    chatEngineBuildIntakeState,
    appContextGateAnswerLine,
    appContextGateMatchesManifest,
    appContextGateStatusForDraft,
    caitAppContextChatPrompt,
    answerSaysAnalyticsAvailable,
    draftExplicitlyRequestsMeasurementEvidence,
    intakeHasMeasurementEvidenceQuestion,
    measurementEvidenceGateAppId,
    measurementEvidenceGateAppManifest,
    measurementEvidenceGateAppName,
    escapeHtml,
    conversationOwnerFromPrepared,
    explicitLeaderChangeTaskTypeFromText,
    leaderOwner,
    taskLabel,
    withConversationOwner,
    activeActorLabel,
    appAgentLaunchUrl,
    appManifestSources,
    appendMessage,
    appendTextMessage,
    chatLanguage,
    chatText,
    createAppAgentContextOpenUrl,
    currentChatReturnPath,
    draftIsSameContentNewOrderRetry,
    listValues,
    lockedAgentOwnerForPrompt,
    lockedLeaderOwnerForPrompt,
    makeChatHandoffId,
    orderErrorMessage,
    prepareOrder,
    renderActiveLeaderStatus,
    retryDraftSourceOrderId,
    setBusy,
    setConversationOwnerFromPrepared,
    trackChatIntakeStarted,
    updateComposerMode
  } = deps;

  function intakeStoredAnswers(intake = {}) {
    return Array.isArray(intake.stepAnswers)
      ? intake.stepAnswers.filter((item) => item && typeof item === 'object')
      : [];
  }
  
  function intakeQuestionList(intake = {}) {
    return (Array.isArray(intake.questions) ? intake.questions : [])
      .map((question) => String(question || '').replace(/\s+/g, ' ').trim())
      .filter(Boolean);
  }
  
  function intakeStepGroups(intake = {}, sample = '') {
    return intakeChoiceGroups(intake, sample)
      .map((group) => ({
        ...group,
        initialChoices: []
      }))
      .filter((group) => group?.id && group?.title);
  }
  
  function intakeSteps(intake = {}) {
    const sample = intake.originalPrompt || intake.original_prompt || '';
    const groups = intakeStepGroups(intake, sample);
    if (groups.length) {
      return groups.map((group) => ({
        type: 'choice_group',
        id: group.id,
        title: group.title,
        prompt: group.hint || group.title,
        group
      }));
    }
    return intakeQuestionList(intake).map((question, index) => ({
      type: 'question',
      id: `question-${index + 1}`,
      title: chatText(`Question ${index + 1}`, `質問 ${index + 1}`, sample),
      prompt: question,
      group: null
    }));
  }
  
  function intakeCurrentStepIndex(intake = {}) {
    const steps = intakeSteps(intake);
    if (!steps.length) return 0;
    const raw = Number(intake.currentStepIndex ?? intake.current_step_index ?? intake.currentQuestionIndex ?? intake.current_question_index ?? 0);
    const index = Number.isFinite(raw) ? Math.max(0, Math.floor(raw)) : 0;
    return Math.min(index, steps.length - 1);
  }
  
  function setIntakeCurrentStepIndex(intake = {}, index = 0) {
    const steps = intakeSteps(intake);
    const nextIndex = Math.max(0, Math.min(Number(index) || 0, Math.max(steps.length - 1, 0)));
    intake.currentStepIndex = nextIndex;
    intake.currentQuestionIndex = nextIndex;
    return nextIndex;
  }
  
  function intakeCurrentStep(intake = {}) {
    const steps = intakeSteps(intake);
    if (!steps.length) return null;
    return steps[intakeCurrentStepIndex(intake)] || steps[0] || null;
  }
  
  function intakeProgressLine(intake = {}, sample = '') {
    const steps = intakeSteps(intake);
    if (steps.length <= 1) return chatText('Question', '質問', sample);
    const index = intakeCurrentStepIndex(intake);
    return chatText(`Question ${index + 1} of ${steps.length}`, `質問 ${index + 1}/${steps.length}`, sample);
  }
  
  function intakeStepAnswerPrompt(intake = {}) {
    const sample = intake.originalPrompt || intake.original_prompt || '';
    return chatText(
      'Choose one or more options, or type a short answer, then send it to continue.',
      '選択肢は複数選べます。短く入力して送信すると次に進みます。',
      sample
    );
  }
  
  function intakeStepCardHtml(intake = {}) {
    const step = intakeCurrentStep(intake);
    if (!step?.group) return '';
    return intakeChoiceCardsHtml(intake, intake.originalPrompt || '', {
      groups: [step.group],
      includeInitialChoices: false,
      title: chatText('Answer this item', 'この項目に回答', intake.originalPrompt || ''),
      detail: intakeStepAnswerPrompt(intake),
      footer: chatText(
        'Choices only fill the composer. Work starts only after the final order approval.',
        '選択肢は入力欄に入るだけです。最後の発注承認まで実行されません。',
        intake.originalPrompt || ''
      )
    });
  }
  
  function disableRenderedIntakeControls() {
    els.chatThread?.querySelectorAll('[data-intake-choice], [data-intake-other-add], [data-intake-confirmed-edit], [data-intake-confirmed-remove]').forEach((button) => {
      button.disabled = true;
    });
    els.chatThread?.querySelectorAll('[data-intake-other-input]').forEach((input) => {
      input.disabled = true;
    });
  }
  
  function appendPendingIntakeStep(options = {}) {
    const intake = state.pendingIntake;
    if (!intake) return;
    const sample = intake.originalPrompt || '';
    const step = intakeCurrentStep(intake);
    if (!step) return;
    const owner = intake.conversationOwner || { type: 'cait', label: 'Intake' };
    const label = owner.type === 'leader' || owner.type === 'agent' ? (owner.label || activeActorLabel('Intake')) : 'Intake';
    const leadLine = options.includeLead === true && (owner.type === 'leader' || owner.type === 'agent')
      ? chatText(
          `${owner.label || 'The selected agent'} will ask one item at a time before dispatch.`,
          `${owner.label || '選択されたエージェント'} が実行前に1項目ずつ確認します。`,
          sample
        )
      : '';
    const dataHint = step.id === 'analytics' && intakeHasMeasurementEvidenceQuestion(intake)
      ? growthLeaderNeedsDataHint(sample)
      : '';
    appendTextMessage('assistant', [
      options.includeMessage === true ? options.message : '',
      leadLine,
      `${intakeProgressLine(intake, sample)}: ${step.title}`,
      step.prompt,
      dataHint,
      intakeStepAnswerPrompt(intake),
      chatText('Nothing has been dispatched yet.', 'まだ実行も課金も発生していません。', sample)
    ].filter(Boolean).join('\n'), { tone: 'ok', label });
    const cardHtml = intakeStepCardHtml(intake);
    if (cardHtml) {
      appendMessage('assistant', cardHtml, { tone: 'ok', label: chatText('Choices', '選択肢', sample) });
    }
  }
  
  function recordIntakeStepAnswer(intake = {}, answer = '') {
    const step = intakeCurrentStep(intake);
    const text = String(answer || '').trim();
    if (!step || !text) return;
    const answers = intakeStoredAnswers(intake);
    answers.push({
      id: step.id,
      title: step.title,
      prompt: step.prompt,
      answer: text
    });
    intake.stepAnswers = answers;
  }
  
  function intakeCombinedAnswerText(intake = {}, latestAnswer = '') {
    const answers = intakeStoredAnswers(intake);
    if (!answers.length) return String(latestAnswer || '').trim();
    return answers
      .map((entry) => {
        const title = String(entry.title || entry.prompt || 'Answer').trim();
        const answer = String(entry.answer || '').trim();
        return answer ? `- ${title}: ${answer}` : '';
      })
      .filter(Boolean)
      .join('\n')
      .trim();
  }
  
  function intakeAnswerLooksLikeCompleteBrief(answer = '', options = {}) {
    const text = String(answer || '').trim();
    if (!text) return false;
    const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
    if (options.allowLineCount === true && lines.length >= 3) return true;
    if (options.allowRichParagraph === true
      && text.length >= 80
      && /(納品|成果|制約|対象|目標|優先|資料|データ|コネクタ|検証|レビュー|価格|原価|粗利|タイムゾーン|GitHub|repo|repository|Calendar|Gmail|deliver|output|constraint|target|priority|evidence|data)/i.test(text)
      && (text.match(/[。、,.;；]/g) || []).length >= 3) {
      return true;
    }
    const signals = [
      /(?:https?:\/\/|www\.|[a-z0-9-]+\.[a-z]{2,})/i,
      /(ga4|google analytics|search console|サーチコンソール|アナリティクス|sales deck|pricing|資料|LP)/i,
      /(purchase|sales|revenue|inquir|lead|signup|trial|購入|売上|問い合わせ|リード|登録|トライアル)/i,
      /(audience|target|customer|founder|developer|consumer|対象|ターゲット|顧客|ユーザー)/i,
      /(channel|seo|organic|sns|social|ads|広告|自然検索|チャネル)/i,
      /(budget|deadline|constraint|no paid|deliver|checklist|copy|asset|予算|期限|制約|納品|チェックリスト|原稿)/i
    ];
    return signals.filter((pattern) => pattern.test(text)).length >= 3;
  }
  
  function startIntake(response = {}, originalPrompt = '') {
    trackChatIntakeStarted(originalPrompt, 'step_intake');
    const explicitLeaderTaskType = explicitLeaderChangeTaskTypeFromText(originalPrompt);
    const requestedLeaderOwner = explicitLeaderTaskType ? leaderOwner(explicitLeaderTaskType, 'User explicitly changed the leader.') : null;
    const lockedOwner = lockedLeaderOwnerForPrompt(originalPrompt, { leaderChangeRequested: Boolean(requestedLeaderOwner) })
      || lockedAgentOwnerForPrompt(originalPrompt, { leaderChangeRequested: Boolean(requestedLeaderOwner) });
    const intakeResponse = requestedLeaderOwner || lockedOwner
      ? withConversationOwner(response, requestedLeaderOwner || lockedOwner, {
          leaderChangeRequested: Boolean(requestedLeaderOwner),
          leader_change_requested: Boolean(requestedLeaderOwner)
        })
      : response;
    state.pendingLeaderChange = null;
    state.pendingIntake = chatEngineBuildIntakeState(intakeResponse, originalPrompt);
    state.pendingIntake.stepAnswers = [];
    setIntakeCurrentStepIndex(state.pendingIntake, 0);
    setConversationOwnerFromPrepared(intakeResponse, {
      sample: originalPrompt,
      leaderChangeRequested: Boolean(requestedLeaderOwner)
    });
    state.draft = null;
    state.draftRevision += 1;
    updateComposerMode();
    appendPendingIntakeStep({
      includeMessage: true,
      includeLead: true,
      message: [
        response.message || 'I need a few more details before preparing or dispatching the order.',
        state.pendingIntake.selectedAgentName ? `Selected worker: ${state.pendingIntake.selectedAgentName}` : ''
      ].filter(Boolean).join('\n')
    });
  }
  
  function measurementEvidenceAppManifest() {
    return measurementEvidenceGateAppManifest(appManifestSources());
  }
  
  function measurementEvidenceAppId() {
    return measurementEvidenceGateAppId(appManifestSources());
  }
  
  function measurementEvidenceAppName() {
    return measurementEvidenceGateAppName(appManifestSources());
  }
  
  function growthLeaderNeedsDataHint(sample = '') {
    const appName = measurementEvidenceAppName();
    return chatText(
      `If you have GA4/Search Console, answer "yes, I have GA4" and I will open ${appName} so you can choose the Google account, property, and site. If not, say "skip analytics" and CAIt will proceed with assumptions.`,
      `GA4/Search Console を持っている場合は「GA4あります」と答えてください。${appName} を開き、Googleアカウント、プロパティ、サイトを選べるようにします。使わない場合は「アナリティクスをスキップ」と答えれば、仮説で進めます。`,
      sample
    );
  }
  
  function authGrantedGoogleCapabilities() {
    return new Set(listValues(state.auth?.googleGrantedCapabilities || state.auth?.google_granted_capabilities)
      .map((item) => String(item || '').trim().toLowerCase()));
  }
  
  function measurementEvidencePreOrderHintHtml(draft = null) {
    const sourceDraft = draft || state.draft || {};
    if (!draftExplicitlyRequestsMeasurementEvidence(sourceDraft)) return '';
    const prompt = sourceDraft.originalPrompt || sourceDraft.prompt || '';
    const appName = measurementEvidenceAppName();
    const status = measurementEvidenceContextStatus(state.draft);
    const granted = authGrantedGoogleCapabilities();
    const googleConnected = granted.has('google.read_ga4') || granted.has('google.read_gsc') || state.auth?.googleLinked || state.auth?.googleAuthorized;
    const explicit = draftExplicitlyRequestsMeasurementEvidence(state.draft || { prompt });
    const title = status.loaded
      ? chatText('Analytics context attached', 'アナリティクス添付済み', prompt)
      : status.skipped
        ? chatText('Analytics skipped by user choice', 'アナリティクスはスキップ指定', prompt)
        : googleConnected
          ? chatText('Connected Google analytics can be attached', '接続済みGoogle分析を添付できます', prompt)
          : chatText('Analytics data requires attachment', 'アナリティクスは添付が必要', prompt);
    const detail = status.loaded
      ? chatText('Loaded GA4/Search Console evidence is attached to this order draft and will be passed to the data layer.', '読み込み済みのGA4/Search Console根拠をこの発注ドラフトに添付済みです。データ層へ渡します。', prompt)
      : status.skipped
        ? chatText('This order will proceed without GA4/Search Console evidence because analytics was skipped for this draft.', 'このドラフトではアナリティクスをスキップしたため、GA4/Search Console根拠なしで進めます。', prompt)
        : googleConnected
          ? chatText(`Google OAuth is already connected. Open ${appName} to choose the GA4 property/Search Console site and send the loaded report back to this draft. OAuth should not be requested again unless a missing scope is selected.`, `Google OAuth は接続済みです。${appName} でGA4プロパティ/Search Consoleサイトを選び、レポートを読み込んでこのドラフトへ戻してください。不足scopeを選ばない限りOAuthを再要求しません。`, prompt)
          : chatText(`Open ${appName}, connect the needed Google source once, choose the property/site, load the report, then send it back to this draft.`, `${appName} を開き、必要なGoogleソースを1回接続して、プロパティ/サイトを選び、レポートを読み込んでこのドラフトへ戻してください。`, prompt);
    const actions = status.loaded || status.skipped
      ? []
      : [
          `<button class="ghost-btn inline-btn" type="button" data-chat-action="app-context-use">${escapeHtml(googleConnected ? chatText('Use connected GA4/Search Console', '接続済みGA4/Search Consoleを使う', prompt) : chatText(`Open ${appName}`, `${appName}を開く`, prompt))}</button>`,
          explicit ? `<button class="ghost-btn inline-btn" type="button" data-chat-action="app-context-skip">${escapeHtml(chatText('Skip analytics for this order', 'この注文ではスキップ', prompt))}</button>` : ''
        ].filter(Boolean);
    return [
      '<div class="preflight-card">',
      `<strong>${escapeHtml(title)}</strong>`,
      `<span>${escapeHtml(detail)}</span>`,
      actions.length ? `<div class="inline-actions">${actions.join('')}</div>` : '',
      '</div>'
    ].filter(Boolean).join('\n');
  }
  
  function intakeSourceText(intake = {}, sample = '') {
    return [...new Set([
      sample,
      intake.originalPrompt
    ].map((item) => String(item || '').trim()).filter(Boolean))]
      .join('\n');
  }
  
  function compactIntakeText(value = '', maxLength = 140) {
    const text = String(value || '')
      .replace(/\s+/g, ' ')
      .replace(/^[\s:：、。,.]+|[\s、。,.]+$/g, '')
      .trim();
    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength - 1).trim()}…`;
  }
  
  function intakeSuggestionLooksLikeQuestion(value = '') {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    if (!text) return false;
    return /[?？]$/.test(text)
      || /(教えて|ください|選んで|選択|どれ|どの|何を|何です|ありますか|使いますか|必要ですか|want to|which|what|do you|please|choose|select|provide|tell us)/i.test(text);
  }
  
  function intakeInitialAnswerSuggestions(intake = {}, sample = '') {
    const text = intakeSourceText(intake, sample);
    const pick = (en, ja) => chatText(en, ja, sample || intake.originalPrompt || text);
    const result = {};
    const add = (id, value) => {
      const safeValue = compactIntakeText(value);
      if (!id || !safeValue) return;
      if (intakeSuggestionLooksLikeQuestion(safeValue)) return;
      result[id] ||= [];
      if (!result[id].some((item) => item === safeValue)) result[id].push(safeValue);
    };
    const urls = [...new Set((text.match(/(?:https?:\/\/|www\.)[^\s<>"'）)]+|[a-z0-9-]+\.[a-z]{2,}(?:\/[^\s<>"'）)]*)?/gi) || [])
      .map((url) => url.replace(/[、。,.]+$/g, '')))]
      .filter((url) => !/^(?:ga4|seo)$/i.test(url));
    urls.slice(0, 2).forEach((url) => add('service', url));
  
    const serviceMatch = text.match(/(?:商材|サービス|商品|対象サービス|対象サイト|URL|LP|landing page|product|service|website|site)\s*(?:は|:|：|-)?\s*([^\n。]{3,140})/i);
    if (!urls.length && serviceMatch?.[1]) add('service', serviceMatch[1]);
  
    if (/(ga4|google analytics|アナリティクス|サーチコンソール|search console).{0,24}(ある|あります|有|使う|使いたい|use|yes|available|持って)/i.test(text)
      || /(ある|あります|有|使う|use|yes|available|持って).{0,24}(ga4|google analytics|アナリティクス|サーチコンソール|search console)/i.test(text)) {
      add('analytics', pick('Use GA4/Search Console', 'GA4/Search Consoleを使う'));
    }
    if (/(アナリティクス|ga4|search console|サーチコンソール).{0,20}(スキップ|不要|なし|使わない|skip|without|no)/i.test(text)) {
      add('analytics', pick('Skip analytics', 'アナリティクスをスキップ'));
    }
  
    if (/(問い合わせ|問合せ|リード|lead|inquir|contact)/i.test(text)) add('goal', pick('Increase leads/inquiries', '問い合わせ・リード獲得を増やす'));
    if (/(売上|購入|受注|sales|revenue|purchase|order)/i.test(text)) add('goal', pick('Increase sales/revenue', '売上・購入を増やす'));
    if (/(登録|トライアル|signup|sign up|trial|registration)/i.test(text)) add('goal', pick('Increase signups/trials', '登録・トライアルを増やす'));
    if (/(流入|認知|traffic|awareness|brand)/i.test(text)) add('goal', pick('Increase traffic/awareness', '流入・認知を増やす'));
  
    if (/(経営者|事業責任者|founder|operator|owner|executive)/i.test(text)) add('audience', pick('Founders/operators', '経営者・事業責任者'));
    if (/(マーケ|グロース|marketing|growth)/i.test(text)) add('audience', pick('Marketing/growth teams', 'マーケ・グロース担当'));
    if (/(開発者|技術|developer|engineer|technical)/i.test(text)) add('audience', pick('Developers/technical users', '開発者・技術ユーザー'));
    if (/(一般消費者|consumer|b2c|individual)/i.test(text)) add('audience', pick('General consumers', '一般消費者'));
    const audienceMatch = text.match(/(?:ターゲット|対象ユーザー|誰向け|audience|target)\s*(?:は|:|：|-)?\s*([^\n。]{3,120})/i);
    if (!result.audience?.length && audienceMatch?.[1]) add('audience', audienceMatch[1]);
  
    if (/(自然検索|seo|organic)/i.test(text)) add('channel', pick('Organic search / SEO', '自然検索・SEO'));
    if (/(リファラル|参照元|referral|referrer)/i.test(text)) add('channel', pick('Referral sites', 'リファラル・参照元サイト'));
    if (/(sns|social|x\/twitter|twitter|ソーシャル)/i.test(text)) add('channel', pick('SNS / social', 'SNS・ソーシャル'));
    if (/(広告|paid|ads|ppc)/i.test(text)) add('channel', pick('Paid ads', '広告'));
  
    if (/(広告なし|広告無し|オーガニックのみ|no paid ads|organic only|without ads)/i.test(text)) add('constraints', pick('No paid ads / organic only', '広告なし・オーガニックのみ'));
    if (/(低予算|予算少|low budget|cheap|cost)/i.test(text)) add('constraints', pick('Low budget first', '低予算優先'));
    if (/(早く|最短|急ぎ|fast|quick|asap)/i.test(text)) add('constraints', pick('Fast first draft', 'まず早く叩き台'));
    if (/(品質|深さ|quality|deep|depth)/i.test(text)) add('constraints', pick('Depth and quality first', '深さ・品質優先'));
  
    if (/(レポート|report|分析資料)/i.test(text)) add('deliverable', pick('Strategy report', '分析レポート'));
    if (/(チェックリスト|checklist|todo)/i.test(text)) add('deliverable', pick('Execution checklist', '実行チェックリスト'));
    if (/(原稿|素材|copy|asset|creative)/i.test(text)) add('deliverable', pick('Copy/assets draft', '原稿・素材案'));
    if (/(引き継ぎ|handoff|実装|運用)/i.test(text)) add('deliverable', pick('Implementation handoff', '実装・運用への引き継ぎ'));
  
    Object.keys(result).forEach((key) => {
      result[key] = result[key].slice(0, 3);
    });
    return result;
  }
  
  function seedIntakeInitialChoices(intake = {}, sample = '') {
    intakeChoiceGroups(intake, sample).forEach((group) => {
      (group.initialChoices || []).forEach((choice) => {
        appendIntakeChoiceToComposer(group.title, choice);
      });
    });
  }
  
  function intakeChoiceGroups(intake = {}, sample = '') {
    const text = [
      sample,
      intake.originalPrompt,
      intake.taskType,
      intake.activeLeaderTaskType,
      intake.conversationOwner?.taskType,
      ...(Array.isArray(intake.questions) ? intake.questions : [])
    ].join('\n');
    const groups = [];
    const seen = new Set();
    const pick = (en, ja) => chatText(en, ja, sample || intake.originalPrompt || text);
    const pushGroup = (id, titleEn, titleJa, hintEn, hintJa, options = [], config = {}) => {
      if (seen.has(id)) return;
      const normalizedOptions = options
        .filter((option) => option?.id && option?.label)
        .slice(0, 4);
      if (!normalizedOptions.length && config.freeText !== true) return;
      seen.add(id);
      groups.push({
        id,
        title: pick(titleEn, titleJa),
        hint: hintEn || hintJa ? pick(hintEn, hintJa) : '',
        singleChoice: config.singleChoice === true,
        inputPlaceholder: config.inputPlaceholderEn || config.inputPlaceholderJa
          ? pick(config.inputPlaceholderEn || 'Other: type your own answer', config.inputPlaceholderJa || 'その他: 自由に入力')
          : '',
        options: normalizedOptions,
        initialChoices: []
      });
    };
  
    if (/(product|service|website|site|url|landing page|lp|pricing|商材|サービス|商品|サイト|URL|ＵＲＬ|LP|ランディング|価格|売りたい)/i.test(text)) {
      pushGroup(
        'service',
        'Product/service',
        '対象サービス',
        'Enter the exact product, service, website, or LP CAIt should analyze.',
        '分析対象の商材・サービス名、URL、LPを入力してください。',
        [],
        {
          freeText: true,
          inputPlaceholderEn: 'Service name, website/LP URL, or product notes',
          inputPlaceholderJa: '商材・サービス名、URL、LP、補足'
        }
      );
    }
  
    if (intakeHasMeasurementEvidenceQuestion(intake)) {
      const appName = measurementEvidenceAppName();
      pushGroup(
        'analytics',
        'Analytics data',
        'アナリティクス',
        `Use ${appName} first, or skip and proceed with assumptions.`,
        `先に${appName}を使うか、仮説で進めるかを選んでください。`,
        [
          { id: 'use', label: pick('Use GA4/Search Console', 'GA4/Search Consoleを使う'), action: 'app-context-use' },
          { id: 'skip', label: pick('Skip analytics', 'アナリティクスをスキップ'), action: 'app-context-skip' }
        ],
        { singleChoice: true }
      );
    }
  
    if (/(goal|objective|outcome|final action|action should increase|conversion|kpi|sales|revenue|purchase|inquir|lead|signup|trial|traffic|awareness|increase|目的|成果|ゴール|増やしたい行動|コンバージョン|登録|問い合わせ|売上|購入|リード|認知|集客|流入)/i.test(text)) {
      pushGroup(
        'goal',
        'Main goal',
        '主な目的',
        'Choose the outcome CAIt should optimize for.',
        'CAItが優先すべき成果を選んでください。',
        [
          { id: 'leads', label: pick('Increase leads/inquiries', '問い合わせ・リード獲得を増やす') },
          { id: 'sales', label: pick('Increase sales/revenue', '売上・購入を増やす') },
          { id: 'signup', label: pick('Increase signups/trials', '登録・トライアルを増やす') },
          { id: 'awareness', label: pick('Increase traffic/awareness', '流入・認知を増やす') }
        ]
      );
    }
  
    if (/(audience|target|customer|persona|segment|ユーザー|顧客|ターゲット|誰|ペルソナ|業種|業界)/i.test(text)) {
      pushGroup(
        'audience',
        'Target audience',
        '対象ユーザー',
        'Pick the closest audience. You can edit the text before sending.',
        '近い対象を選んでください。送信前に入力欄で編集できます。',
        [
          { id: 'founders', label: pick('Founders/operators', '経営者・事業責任者') },
          { id: 'marketers', label: pick('Marketing/growth teams', 'マーケ・グロース担当') },
          { id: 'developers', label: pick('Developers/technical users', '開発者・技術ユーザー') },
          { id: 'consumers', label: pick('General consumers', '一般消費者') }
        ]
      );
    }
  
    if (/(deliverable|format|output|report|plan|checklist|copy|asset|handoff|納品|形式|アウトプット|レポート|計画|チェックリスト|原稿|引き継ぎ)/i.test(text)) {
      pushGroup(
        'deliverable',
        'Output format',
        '納品形式',
        'Choose what would be easiest to use next.',
        '次に使いやすい納品形式を選んでください。',
        [
          { id: 'report', label: pick('Strategy report', '分析レポート') },
          { id: 'checklist', label: pick('Execution checklist', '実行チェックリスト') },
          { id: 'copy', label: pick('Copy/assets draft', '原稿・素材案') },
          { id: 'handoff', label: pick('Implementation handoff', '実装・運用への引き継ぎ') }
        ]
      );
    }
  
    if (/(constraint|budget|deadline|scope|must|cannot|ads|制約|予算|期限|範囲|禁止|広告|スコープ)/i.test(text)) {
      pushGroup(
        'constraints',
        'Constraints',
        '制約',
        'Choose the operating constraint that matters most.',
        '最も重要な制約を選んでください。',
        [
          { id: 'organic-only', label: pick('No paid ads / organic only', '広告なし・オーガニックのみ') },
          { id: 'low-budget', label: pick('Low budget first', '低予算優先') },
          { id: 'fast', label: pick('Fast first draft', 'まず早く叩き台') },
          { id: 'quality', label: pick('Depth and quality first', '深さ・品質優先') }
        ]
      );
    }
  
    if (/(channel|traffic|acquisition|seo|sns|ads|referral|流入|チャネル|広告|自然検索|SNS|リファラル|参照元)/i.test(text)) {
      pushGroup(
        'channel',
        'Priority channel',
        '優先チャネル',
        'Select where the work should start.',
        'どのチャネルから着手するか選んでください。',
        [
          { id: 'organic', label: pick('Organic search / SEO', '自然検索・SEO') },
          { id: 'referral', label: pick('Referral sites', 'リファラル・参照元サイト') },
          { id: 'social', label: pick('SNS / social', 'SNS・ソーシャル') },
          { id: 'paid', label: pick('Paid ads', '広告') }
        ]
      );
    }
  
    if (!groups.length && Array.isArray(intake.questions) && intake.questions.length) {
      pushGroup(
        'direction',
        'Direction',
        '進め方',
        'Choose a practical default if you do not know the exact answer yet.',
        '正確な答えがまだない場合は、近い進め方を選んでください。',
        [
          { id: 'recommend', label: pick('Recommend the best option', '最適案を提案してほしい') },
          { id: 'compare', label: pick('Compare a few options', '複数案を比較してほしい') },
          { id: 'assume', label: pick('Proceed with assumptions', '仮説で進めてほしい') }
        ]
      );
    }
  
    const initialChoices = intakeInitialAnswerSuggestions(intake, sample);
    groups.forEach((group) => {
      group.initialChoices = (initialChoices[group.id] || [])
        .filter(Boolean)
        .slice(0, group.singleChoice ? 1 : 3);
      if (group.id === 'analytics') {
        group.options.forEach((option) => {
          if (group.initialChoices.includes(option.label)) {
            option.selected = true;
          }
        });
      }
    });
    const intakeGroupOrder = new Map([
      ['service', 1],
      ['analytics', 2],
      ['goal', 3],
      ['audience', 4],
      ['constraints', 5],
      ['channel', 6],
      ['deliverable', 7],
      ['direction', 8]
    ]);
    groups.sort((left, right) => (intakeGroupOrder.get(left.id) || 50) - (intakeGroupOrder.get(right.id) || 50));
    return groups.slice(0, 6);
  }
  
  function intakeChoiceCardsHtml(intake = {}, sample = '', options = {}) {
    const groups = Array.isArray(options.groups)
      ? options.groups.filter((group) => group?.id && group?.title)
      : intakeChoiceGroups(intake, sample);
    if (!groups.length) return '';
    const includeInitialChoices = options.includeInitialChoices !== false;
    const initialSourceLabel = chatText('From initial request', '初回文面から', sample);
    const groupHtml = groups.map((group) => [
      `<div class="intake-choice-group" data-choice-mode="${group.singleChoice ? 'single' : 'multiple'}">`,
      `<div class="intake-choice-title">${escapeHtml(group.title)}</div>`,
      group.hint ? `<span>${escapeHtml(group.hint)}</span>` : '',
      group.options.length ? '<div class="inline-actions intake-choice-actions">' : '',
      ...group.options.map((option) => {
        const action = option.action ? ` data-chat-action="${escapeHtml(option.action)}"` : '';
        const selectedClass = option.selected ? ' selected' : '';
        return `<button class="ghost-btn inline-btn intake-choice-btn${selectedClass}" type="button" aria-pressed="${option.selected ? 'true' : 'false'}" data-intake-choice="${escapeHtml(option.id)}" data-choice-group="${escapeHtml(group.title)}" data-choice-label="${escapeHtml(option.label)}"${action}>${escapeHtml(option.label)}</button>`;
      }),
      group.options.length ? '</div>' : '',
      '<div class="intake-other-row">',
      `<input class="intake-other-input" type="text" data-intake-other-input="${escapeHtml(group.id)}" data-choice-group="${escapeHtml(group.title)}" placeholder="${escapeHtml(group.inputPlaceholder || chatText('Other: type your own answer', 'その他: 自由に入力', sample))}" aria-label="${escapeHtml(chatText(`Other answer for ${group.title}`, `${group.title} のその他回答`, sample))}" />`,
      `<button class="ghost-btn inline-btn intake-other-add" type="button" data-intake-other-add="${escapeHtml(group.id)}" data-choice-group="${escapeHtml(group.title)}">${escapeHtml(chatText('Add', '追加', sample))}</button>`,
      '</div>',
      `<div class="intake-confirmed-list" data-intake-confirmed-list="${escapeHtml(group.id)}" data-choice-group="${escapeHtml(group.title)}"${includeInitialChoices && group.initialChoices?.length ? '' : ' hidden'}>`,
      ...(includeInitialChoices ? (group.initialChoices || []).map((choice) => intakeConfirmedChoiceHtml(group.title, choice, initialSourceLabel, sample)) : []),
      '</div>',
      '</div>'
    ].filter(Boolean).join('\n')).join('\n');
    return [
      '<div class="preflight-card intake-choice-card">',
      `<strong>${escapeHtml(options.title || chatText('Choose concrete answers', '具体的な選択肢から選んでください', sample))}</strong>`,
      `<span>${escapeHtml(options.detail || chatText('Click one or more choices to add them to the answer box. You can edit or remove text before sending.', 'ボタンは複数選べます。入力欄に追加されるだけなので、送信前に編集・削除できます。', sample))}</span>`,
      groupHtml,
      `<span class="chat-hint">${escapeHtml(options.footer || chatText('Selected choices are added to the composer; nothing is dispatched until you send the answer and approve the order.', '選択内容は入力欄に入るだけです。回答送信と発注承認までは実行されません。', sample))}</span>`,
      '</div>'
    ].join('\n');
  }
  
  function appendIntakeChoiceToComposer(group = '', choice = '') {
    const safeGroup = String(group || '').trim();
    const safeChoice = String(choice || '').trim();
    if (!safeGroup || !safeChoice || !els.promptInput) return;
    const prefix = `- ${safeGroup}:`;
    const nextLine = `${prefix} ${safeChoice}`;
    const currentLines = String(els.promptInput.value || '')
      .split('\n')
      .map((line) => line.trimEnd())
      .filter((line) => line.trim());
    if (currentLines.some((line) => line.trim() === nextLine)) {
      els.promptInput.focus();
      return;
    }
    currentLines.push(nextLine);
    els.promptInput.value = currentLines.join('\n');
    els.promptInput.focus();
    updateComposerMode();
  }
  
  function removeIntakeChoiceFromComposer(group = '', choice = '') {
    const safeGroup = String(group || '').trim();
    if (!safeGroup || !els.promptInput) return;
    const prefix = `- ${safeGroup}:`;
    const safeChoice = String(choice || '').trim();
    const exactLine = safeChoice ? `${prefix} ${safeChoice}` : '';
    els.promptInput.value = String(els.promptInput.value || '')
      .split('\n')
      .map((line) => line.trimEnd())
      .filter((line) => {
        const trimmed = line.trim();
        if (!trimmed) return false;
        if (exactLine) return trimmed !== exactLine;
        return !trimmed.startsWith(prefix);
      })
      .join('\n');
    updateComposerMode();
  }
  
  function resetIntakeChoiceGroup(groupElement = null, group = '') {
    const safeGroup = String(group || '').trim();
    if (!safeGroup || !groupElement) return;
    removeIntakeChoiceFromComposer(safeGroup);
    groupElement.querySelectorAll('[data-intake-choice].selected').forEach((button) => {
      button.classList.remove('selected');
      button.setAttribute('aria-pressed', 'false');
    });
    const list = groupElement.querySelector('[data-intake-confirmed-list]');
    list?.querySelectorAll('[data-confirmed-choice]').forEach((item) => item.remove());
    if (list) list.hidden = true;
  }
  
  function findIntakeChoiceGroupElement(group = '') {
    const safeGroup = String(group || '').trim();
    if (!safeGroup || !els.chatThread) return null;
    return [...els.chatThread.querySelectorAll('.intake-choice-group')]
      .find((groupElement) => {
        const confirmedGroup = String(groupElement.querySelector('[data-intake-confirmed-list]')?.dataset.choiceGroup || '').trim();
        const choiceGroup = String(groupElement.querySelector('[data-choice-group]')?.dataset.choiceGroup || '').trim();
        return confirmedGroup === safeGroup || choiceGroup === safeGroup;
      }) || null;
  }
  
  function intakeConfirmedChoiceHtml(group = '', choice = '', label = '', sample = '') {
    const safeGroup = String(group || '').trim();
    const safeChoice = String(choice || '').trim();
    const sourceLabel = label || chatText('Added', '追加済み', sample || state.pendingIntake?.originalPrompt || '');
    return [
      `<div class="intake-confirmed-item" data-confirmed-choice="${escapeHtml(safeChoice)}">`,
      `<span class="intake-confirmed-label">${escapeHtml(sourceLabel)}</span>`,
      `<strong>${escapeHtml(safeChoice)}</strong>`,
      '<div class="intake-confirmed-actions">',
      `<button class="ghost-btn inline-btn intake-confirmed-edit" type="button" data-intake-confirmed-edit data-choice-group="${escapeHtml(safeGroup)}">${escapeHtml(chatText('Edit', '編集', sample || state.pendingIntake?.originalPrompt || ''))}</button>`,
      `<button class="ghost-btn inline-btn intake-confirmed-remove" type="button" data-intake-confirmed-remove data-choice-group="${escapeHtml(safeGroup)}">${escapeHtml(chatText('Remove', '削除', sample || state.pendingIntake?.originalPrompt || ''))}</button>`,
      '</div>',
      '</div>'
    ].join('\n');
  }
  
  function setIntakeConfirmedChoice(groupElement = null, group = '', choice = '') {
    const safeGroup = String(group || '').trim();
    const safeChoice = String(choice || '').trim();
    const list = groupElement?.querySelector('[data-intake-confirmed-list]');
    if (!safeGroup || !safeChoice || !list) return;
    if ([...list.querySelectorAll('[data-confirmed-choice]')]
      .some((item) => String(item.dataset.confirmedChoice || '').trim() === safeChoice)) {
      list.hidden = false;
      return;
    }
    list.hidden = false;
    list.insertAdjacentHTML('beforeend', intakeConfirmedChoiceHtml(safeGroup, safeChoice, '', state.pendingIntake?.originalPrompt || ''));
  }
  
  function pendingIntakeHasAttachedAppContext(intake = {}) {
    return Boolean(
      intake?.appContextAttached
      || intake?.analyticsContextAttached
      || String(intake?.appContextPrompt || '').trim()
    );
  }
  
  function appContextMatchesMeasurementEvidenceApp(context = {}) {
    const manifest = measurementEvidenceAppManifest();
    return Boolean(manifest && appContextGateMatchesManifest(context, manifest));
  }
  
  function draftBroker(draft = null) {
    return draft?.input?._broker && typeof draft.input._broker === 'object' ? draft.input._broker : {};
  }
  
  function measurementEvidenceContextStatus(draft = null) {
    return appContextGateStatusForDraft(draft, measurementEvidenceAppManifest());
  }
  
  function mergeUniqueContexts(existing = [], nextContext = null) {
    const list = Array.isArray(existing) ? existing.filter((context) => context && typeof context === 'object') : [];
    if (!nextContext || typeof nextContext !== 'object') return list;
    const nextKey = [
      nextContext.id,
      nextContext.source_app || nextContext.sourceApp,
      nextContext.title
    ].map((item) => String(item || '').trim()).filter(Boolean).join('|').toLowerCase();
    if (nextKey && list.some((context) => [
      context.id,
      context.source_app || context.sourceApp,
      context.title
    ].map((item) => String(item || '').trim()).filter(Boolean).join('|').toLowerCase() === nextKey)) {
      return list.map((context) => {
        const key = [
          context.id,
          context.source_app || context.sourceApp,
          context.title
        ].map((item) => String(item || '').trim()).filter(Boolean).join('|').toLowerCase();
        return key === nextKey ? { ...context, ...nextContext } : context;
      });
    }
    return [nextContext, ...list].slice(0, 8);
  }
  
  function attachAppContextToDraft(context = null) {
    if (!state.draft || !context || typeof context !== 'object') return false;
    const input = state.draft.input && typeof state.draft.input === 'object' ? state.draft.input : {};
    const broker = input._broker && typeof input._broker === 'object' ? input._broker : {};
    const appContexts = mergeUniqueContexts(broker.appContexts || input.appContexts || [], context);
    const connectorContexts = appContextMatchesMeasurementEvidenceApp(context)
      ? mergeUniqueContexts(broker.connectorContexts || input.connectorContexts || [], context)
      : (Array.isArray(broker.connectorContexts) ? broker.connectorContexts : []);
    state.draft.input = {
      ...input,
      appContexts,
      ...(connectorContexts.length ? { connectorContexts } : {}),
      _broker: {
        ...broker,
        appContexts,
        ...(connectorContexts.length ? { connectorContexts } : {}),
        measurementEvidenceSkipped: false,
        measurement_evidence_skipped: false,
        analyticsContextSkipped: false,
        analytics_context_skipped: false
      }
    };
    state.draft.updatedAt = new Date().toISOString();
    state.draftRevision += 1;
    return true;
  }
  
  function markDraftMeasurementEvidenceSkipped() {
    if (!state.draft) return false;
    const input = state.draft.input && typeof state.draft.input === 'object' ? state.draft.input : {};
    const broker = input._broker && typeof input._broker === 'object' ? input._broker : {};
    state.draft.input = {
      ...input,
      _broker: {
        ...broker,
        measurementEvidenceSkipped: true,
        measurement_evidence_skipped: true,
        analyticsContextSkipped: true,
        analytics_context_skipped: true
      }
    };
    state.draft.updatedAt = new Date().toISOString();
    state.draftRevision += 1;
    return true;
  }
  
  function caitAppContextAnswerLine(context = {}) {
    const connectorPrompt = caitAppContextChatPrompt(context);
    if (appContextMatchesMeasurementEvidenceApp(context)) return appContextGateAnswerLine(context, measurementEvidenceAppManifest());
    return connectorPrompt.split('\n').map((line) => line.trim()).filter(Boolean)[0]
      || `Attached context from ${context?.source_app_label || context?.source_app || 'app'}.`;
  }
  
  async function openMeasurementEvidenceAppForIntake(intake = {}, answer = '') {
    const app = measurementEvidenceAppManifest();
    const appId = measurementEvidenceAppId();
    const appName = measurementEvidenceAppName();
    if (!app || !appId) {
      appendTextMessage('assistant', chatText(
        'No registered measurement evidence app is available for this order. You can skip analytics or try again after the app manifest is restored.',
        'この発注で使える計測根拠アプリが登録されていません。アナリティクスをスキップするか、アプリマニフェスト復旧後に再試行してください。',
        answer
      ), { tone: 'error', label: 'App context' });
      return;
    }
    const popup = window.open('about:blank', '_blank');
    const handoffId = makeChatHandoffId('measurement-evidence-intake');
    const chatReturnTo = currentChatReturnPath();
    const payload = {
      schema_version: 'cait-app-agent-transfer/v1',
      transfer_id: `measurement-evidence-intake-${Date.now().toString(36)}`,
      title: 'Measurement evidence requested from chat intake',
      source: 'CAIt Chat intake',
      summary: 'The user said GA4/Search Console data is available. Connect the right Google account, select the GA4 property and Search Console site, load the report, then send the app context back to CAIt before dispatching the order.',
      action: {
        kind: 'analytics_report_load',
        title: 'Select the Google account/property/site and load GA4/Search Console before order dispatch',
        text: String(answer || '').trim(),
        source: 'CAIt Chat intake',
        requiresApproval: false
      },
      context: {
        original_prompt: intake.originalPrompt || '',
        intake_answer: answer,
        questions: Array.isArray(intake.questions) ? intake.questions : [],
        task_type: intake.taskType || intake.activeLeaderTaskType || '',
        leader: intake.conversationOwner || null,
        chat_handoff_id: handoffId,
        chat_return_to: chatReturnTo
      },
      settings: {
        outputLanguage: chatLanguage(intake.originalPrompt || answer),
        workspaceNotes: `Original prompt:\n${intake.originalPrompt || ''}\n\nIntake answer:\n${answer}`
      }
    };
    try {
      const href = await createAppAgentContextOpenUrl(appId, payload);
      const url = new URL(href, window.location.origin);
      url.searchParams.set('chat_handoff_id', handoffId);
      url.searchParams.set('chat_return_to', chatReturnTo);
      if (popup) popup.location.href = url.toString();
      else window.open(url.toString(), '_blank');
      appendTextMessage('assistant', chatText(
        `I opened ${appName}. Connect the right Google account, choose the GA4 property and Search Console site, load the report, then press Send to CAIt. I will pause this order until app context comes back; if you want to skip analytics, type "skip analytics".`,
        `${appName} を開きました。正しいGoogleアカウント、GA4プロパティ、Search Consoleサイトを選び、レポートをLoadしてから Send to CAIt を押してください。この発注はアプリコンテキストが戻るまで止めます。分析を使わない場合は「アナリティクスをスキップ」と入力してください。`,
        answer
      ), { tone: 'ok', label: 'Analytics' });
    } catch (error) {
      const fallback = new URL(appAgentLaunchUrl(app) || '/apps.html', window.location.origin);
      fallback.searchParams.set('chat_handoff_id', handoffId);
      fallback.searchParams.set('chat_return_to', chatReturnTo);
      if (popup) popup.location.href = fallback.toString();
      else window.open(fallback.toString(), '_blank');
      appendTextMessage('assistant', `${chatText(`I opened ${appName}, but could not attach the intake context automatically.`, `${appName}を開きましたが、ヒアリング文脈の自動添付には失敗しました。`, answer)} ${orderErrorMessage(error)}`, { tone: 'error', label: 'Analytics' });
    }
  }
  
  async function openMeasurementEvidenceAppForDraft(draft = null) {
    const app = measurementEvidenceAppManifest();
    const appId = measurementEvidenceAppId();
    const appName = measurementEvidenceAppName();
    const sourceDraft = draft || state.draft || {};
    const sample = sourceDraft.originalPrompt || sourceDraft.prompt || state.conversationLanguage || '';
    if (!app || !appId) {
      appendTextMessage('assistant', chatText(
        'No registered measurement evidence app is available for this prepared order. Skip analytics or restore the app manifest before sending the order.',
        'この発注ドラフトで使える計測根拠アプリが登録されていません。アナリティクスをスキップするか、アプリマニフェストを復旧してから送信してください。',
        sample
      ), { tone: 'error', label: 'App context' });
      return;
    }
    const popup = window.open('about:blank', '_blank');
    const handoffId = makeChatHandoffId('measurement-evidence-draft');
    const chatReturnTo = currentChatReturnPath();
    const payload = {
      schema_version: 'cait-app-agent-transfer/v1',
      transfer_id: `measurement-evidence-draft-${Date.now().toString(36)}`,
      title: 'Measurement evidence requested before order dispatch',
      source: 'CAIt Chat order check',
      summary: 'The prepared order explicitly requests GA4/Search Console. Use the already connected Google account when possible, choose the exact property/site, load the report, then send the app context back to CAIt before dispatching the order.',
      action: {
        kind: 'analytics_report_load',
        title: 'Load GA4/Search Console evidence into this prepared order',
        text: sourceDraft.prompt || sourceDraft.originalPrompt || '',
        source: 'CAIt Chat order check',
        requiresApproval: false
      },
      context: {
        original_prompt: sourceDraft.originalPrompt || '',
        prepared_prompt: sourceDraft.prompt || '',
        task_type: sourceDraft.taskType || sourceDraft.task_type || '',
        leader: sourceDraft.conversationOwner || null,
        chat_handoff_id: handoffId,
        chat_return_to: chatReturnTo
      },
      settings: {
        outputLanguage: chatLanguage(sample),
        workspaceNotes: `Prepared order:\n${sourceDraft.prompt || ''}\n\nOriginal prompt:\n${sourceDraft.originalPrompt || ''}`
      }
    };
    try {
      const href = await createAppAgentContextOpenUrl(appId, payload);
      const url = new URL(href, window.location.origin);
      url.searchParams.set('chat_handoff_id', handoffId);
      url.searchParams.set('chat_return_to', chatReturnTo);
      if (popup) popup.location.href = url.toString();
      else window.open(url.toString(), '_blank');
      appendTextMessage('assistant', chatText(
        `I opened ${appName} for this prepared order. If Google is already connected, choose the GA4 property/Search Console site, load the report, then press Send to CAIt. I will attach it to this draft; no order will be sent until you press Send order again.`,
        `この発注ドラフト用に ${appName} を開きました。Google接続済みなら、GA4プロパティ/Search Consoleサイトを選び、レポートをLoadしてから Send to CAIt を押してください。戻ったコンテキストはこのドラフトに添付します。もう一度 Send order を押すまで発注は送信しません。`,
        sample
      ), { tone: 'ok', label: 'Analytics' });
    } catch (error) {
      const fallback = new URL(appAgentLaunchUrl(app) || '/apps.html', window.location.origin);
      fallback.searchParams.set('chat_handoff_id', handoffId);
      fallback.searchParams.set('chat_return_to', chatReturnTo);
      if (popup) popup.location.href = fallback.toString();
      else window.open(fallback.toString(), '_blank');
      appendTextMessage('assistant', `${chatText(`I opened ${appName}, but could not attach the prepared order context automatically.`, `${appName}を開きましたが、発注ドラフト文脈の自動添付には失敗しました。`, sample)} ${orderErrorMessage(error)}`, { tone: 'error', label: 'Analytics' });
    }
  }
  
  async function answerPendingIntake(answer = '', options = {}) {
    const intake = state.pendingIntake;
    if (!intake) return false;
    const text = String(answer || '').trim();
    if (!text) {
      appendTextMessage('assistant', chatLanguage(intake.originalPrompt) === 'ja'
        ? '分かる範囲で回答してください。まだ発注は開始していません。'
        : 'Answer what you can first. Nothing has been dispatched yet.', { tone: 'error', label: 'Intake' });
      return true;
    }
    if (options.skipAnalyticsRedirect !== true && !pendingIntakeHasAttachedAppContext(intake) && intakeHasMeasurementEvidenceQuestion(intake) && answerSaysAnalyticsAvailable(text)) {
      await openMeasurementEvidenceAppForIntake(intake, text);
      return true;
    }
    const explicitLeaderTaskType = explicitLeaderChangeTaskTypeFromText(text);
    const changedLeaderOwner = explicitLeaderTaskType ? leaderOwner(explicitLeaderTaskType, 'User explicitly changed the leader during intake.') : null;
    if (changedLeaderOwner) {
      state.activeOwner = {
        type: 'leader',
        taskType: changedLeaderOwner.taskType,
        label: changedLeaderOwner.label,
        reason: changedLeaderOwner.reason
      };
      state.activeOwnerLocked = true;
      state.activeLeader = {
        taskType: changedLeaderOwner.taskType,
        label: changedLeaderOwner.label,
        reason: changedLeaderOwner.reason
      };
      state.activeLeaderLocked = true;
      intake.taskType = changedLeaderOwner.taskType;
      intake.activeLeaderTaskType = changedLeaderOwner.taskType;
      intake.activeLeaderName = changedLeaderOwner.label;
      intake.conversationOwner = changedLeaderOwner;
      renderActiveLeaderStatus();
    }
    recordIntakeStepAnswer(intake, text);
    disableRenderedIntakeControls();
    const steps = intakeSteps(intake);
    const currentIndex = intakeCurrentStepIndex(intake);
    const answeredAllAtOnce = intakeAnswerLooksLikeCompleteBrief(text, {
      allowLineCount: currentIndex === 0,
      allowRichParagraph: currentIndex === 0
    });
    if (!answeredAllAtOnce && currentIndex < steps.length - 1) {
      setIntakeCurrentStepIndex(intake, currentIndex + 1);
      els.promptInput.value = '';
      updateComposerMode();
      appendPendingIntakeStep();
      return true;
    }
    const combinedAnswer = intakeCombinedAnswerText(intake, text);
    const combined = chatEngineBuildIntakeCombinedPrompt(intake, combinedAnswer, {
      connectorContext: intake.appContextPrompt || ''
    });
    state.pendingIntake = null;
    updateComposerMode();
    const lockedStateLeader = state.activeLeaderLocked && state.activeLeader?.taskType
      ? state.activeLeader
      : null;
    await prepareOrder(combined, {
      intakeAnswered: true,
      originalPrompt: intake.originalPrompt || combined,
      taskType: changedLeaderOwner?.taskType || intake.taskType || intake.task_type || '',
      selectedAgentId: intake.selectedAgentId || intake.selected_agent_id || '',
      selectedAgentName: intake.selectedAgentName || intake.selected_agent_name || '',
      activeLeaderTaskType: changedLeaderOwner?.taskType || intake.activeLeaderTaskType || intake.active_leader_task_type || intake.conversationOwner?.taskType || lockedStateLeader?.taskType || '',
      activeLeaderName: changedLeaderOwner?.label || intake.activeLeaderName || intake.active_leader_name || intake.conversationOwner?.label || lockedStateLeader?.label || '',
      activeLeaderLocked: Boolean(state.activeLeaderLocked && state.activeLeader?.taskType),
      leaderChangeRequested: Boolean(changedLeaderOwner),
      conversationOwner: changedLeaderOwner || intake.conversationOwner || null,
      appContext: intake.appContext || null
    });
    return true;
  }
  
  function orderConfirmationHtml(options = {}) {
    const draft = state.draft || {};
    const updated = options.updated === true;
    const task = draft.taskType || '-';
    const route = String(draft.resolvedOrderStrategy || 'single').toUpperCase();
    const reason = draft.reason || draft.routeHint || 'Prepared from your chat request.';
    const prompt = draft.prompt || '';
    const selectedAgent = String(draft.selectedAgentName || draft.selected_agent_name || draft.selectedAgentId || draft.selected_agent_id || '').trim();
    const owner = conversationOwnerFromPrepared(draft);
    const lead = owner.type === 'leader'
      ? `${owner.label || taskLabel(owner.taskType)} (${owner.taskType})`
      : owner.type === 'agent'
        ? `${owner.label || taskLabel(owner.taskType)} (${owner.taskType})`
        : 'CAIt specialist router';
    const sameContentRetry = draftIsSameContentNewOrderRetry(draft);
    const retrySourceOrderId = retryDraftSourceOrderId(draft);
    const reuseArtifacts = Array.isArray(draft.retryReuseArtifacts || draft.retry_reuse_artifacts)
      ? (draft.retryReuseArtifacts || draft.retry_reuse_artifacts).filter((item) => item && (item.task_type || item.taskType))
      : [];
    return [
      `<strong>${updated ? 'Updated order check' : 'Order check'}</strong>`,
      '',
      `Lead: ${escapeHtml(lead)}`,
      `Task: ${escapeHtml(task)}`,
      `Route: ${escapeHtml(route)}`,
      selectedAgent ? `Selected worker: ${escapeHtml(selectedAgent)}` : '',
      `Reason: ${escapeHtml(reason)}`,
      sameContentRetry
        ? `Retry mode: ${escapeHtml(`Same content as a NEW order${retrySourceOrderId ? `; not a continuation of #${retrySourceOrderId.slice(0, 8)}` : '; not a continuation'}.`)}`
        : '',
      reuseArtifacts.length
        ? `Reuse selected artifacts: ${escapeHtml(reuseArtifacts.map((item) => item.task_type || item.taskType).join(', '))}`
        : '',
      '',
      measurementEvidencePreOrderHintHtml(draft),
      '<details class="file-card order-brief" open>',
      '<summary>Instruction that will be sent</summary>',
      `<pre>${escapeHtml(prompt)}</pre>`,
      '</details>',
      '<div class="inline-actions">',
      '<button class="primary-btn inline-btn" type="button" data-chat-action="send-order">Send order</button>',
      '<button class="ghost-btn inline-btn" type="button" data-chat-action="reset-chat">Reset</button>',
      '</div>',
      '<span class="chat-hint">Type adjustments here to update this order, or type SEND ORDER to dispatch.</span>'
    ].join('\n');
  }
  
  function appendOrderConfirmation(options = {}) {
    appendMessage('assistant', orderConfirmationHtml(options), { tone: 'ok', label: activeActorLabel('Order check') });
    updateComposerMode();
    setBusy(state.busy);
  }

  async function handleIntakeThreadClick(event = {}) {
    const target = event.target;
    const intakeConfirmedEditButton = target?.closest?.('[data-intake-confirmed-edit]');
    if (intakeConfirmedEditButton) {
      const groupElement = intakeConfirmedEditButton.closest('.intake-choice-group');
      const item = intakeConfirmedEditButton.closest('.intake-confirmed-item');
      const input = groupElement?.querySelector('[data-intake-other-input]');
      const value = String(item?.dataset.confirmedChoice || item?.querySelector('strong')?.textContent || '').trim();
      if (input && value) {
        input.value = value;
        input.focus();
        input.select?.();
      }
      return true;
    }
    const intakeConfirmedRemoveButton = target?.closest?.('[data-intake-confirmed-remove]');
    if (intakeConfirmedRemoveButton) {
      const group = String(intakeConfirmedRemoveButton.dataset.choiceGroup || '').trim();
      const groupElement = intakeConfirmedRemoveButton.closest('.intake-choice-group');
      const item = intakeConfirmedRemoveButton.closest('.intake-confirmed-item');
      const value = String(item?.dataset.confirmedChoice || item?.querySelector('strong')?.textContent || '').trim();
      removeIntakeChoiceFromComposer(group, value);
      groupElement?.querySelectorAll('[data-intake-choice].selected').forEach((button) => {
        const label = String(button.dataset.choiceLabel || button.textContent || '').trim();
        if (label !== value) return;
        button.classList.remove('selected');
        button.setAttribute('aria-pressed', 'false');
      });
      const list = groupElement?.querySelector('[data-intake-confirmed-list]');
      item?.remove();
      if (list && !list.querySelector('[data-confirmed-choice]')) {
        list.hidden = true;
      }
      return true;
    }
    const intakeOtherButton = target?.closest?.('[data-intake-other-add]');
    if (intakeOtherButton) {
      if (!state.pendingIntake) {
        appendTextMessage('assistant', 'There is no active intake to answer.', { tone: 'error', label: 'Intake' });
        return true;
      }
      const group = String(intakeOtherButton.dataset.choiceGroup || '').trim();
      const row = intakeOtherButton.closest('.intake-other-row');
      const input = row?.querySelector('[data-intake-other-input]');
      const value = String(input?.value || '').trim();
      if (!value) {
        input?.focus();
        return true;
      }
      const groupElement = intakeOtherButton.closest('.intake-choice-group');
      if (groupElement?.dataset.choiceMode === 'single') resetIntakeChoiceGroup(groupElement, group);
      appendIntakeChoiceToComposer(group, value);
      setIntakeConfirmedChoice(groupElement, group, value);
      input.value = '';
      input.focus();
      return true;
    }
    const intakeChoiceButton = target?.closest?.('[data-intake-choice]');
    if (intakeChoiceButton) {
      if (!state.pendingIntake) {
        appendTextMessage('assistant', 'There is no active intake to answer.', { tone: 'error', label: 'Intake' });
        return true;
      }
      const action = String(intakeChoiceButton.dataset.chatAction || '').trim();
      const group = String(intakeChoiceButton.dataset.choiceGroup || '').trim();
      const label = String(intakeChoiceButton.dataset.choiceLabel || intakeChoiceButton.textContent || '').trim();
      const groupElement = intakeChoiceButton.closest('.intake-choice-group');
      if (groupElement?.dataset.choiceMode === 'single') resetIntakeChoiceGroup(groupElement, group);
      intakeChoiceButton.classList.add('selected');
      intakeChoiceButton.setAttribute('aria-pressed', 'true');
      appendIntakeChoiceToComposer(group, label);
      setIntakeConfirmedChoice(groupElement, group, label);
      if (action === 'app-context-use') {
        setBusy(true);
        void openMeasurementEvidenceAppForIntake(
          state.pendingIntake,
          chatText('GA4/Search Console is available.', 'GA4/Search Consoleがあります。', state.pendingIntake.originalPrompt)
        ).finally(() => setBusy(false));
      }
      return true;
    }
    const actionButton = target?.closest?.('[data-chat-action]');
    const action = String(actionButton?.dataset.chatAction || '').trim();
    if (action === 'app-context-use') {
      setBusy(true);
      const analyticsOpen = state.pendingIntake
        ? openMeasurementEvidenceAppForIntake(state.pendingIntake, chatText('GA4/Search Console is available.', 'GA4/Search Consoleがあります。', state.pendingIntake.originalPrompt))
        : state.draft
          ? openMeasurementEvidenceAppForDraft(state.draft)
          : Promise.reject(new Error('There is no active intake or prepared order to attach analytics to.'));
      void analyticsOpen
        .catch((error) => appendTextMessage('assistant', orderErrorMessage(error), { tone: 'error', label: 'Analytics' }))
        .finally(() => setBusy(false));
      return true;
    }
    if (action === 'app-context-skip') {
      if (state.draft && !state.pendingIntake) {
        markDraftMeasurementEvidenceSkipped();
        appendTextMessage('system', chatText(
          'Analytics was skipped for this prepared order. Press Send order to proceed without GA4/Search Console evidence.',
          'この発注ドラフトではアナリティクスをスキップしました。GA4/Search Console根拠なしで進める場合は Send order を押してください。',
          state.draft.originalPrompt || state.draft.prompt || ''
        ), { label: 'Analytics' });
        appendOrderConfirmation({ updated: true });
        return true;
      }
      if (!state.pendingIntake) {
        appendTextMessage('assistant', 'There is no active intake or prepared order to continue.', { tone: 'error', label: 'Analytics' });
        return true;
      }
      const analyticsGroupName = chatText('Analytics data', 'アナリティクス', state.pendingIntake.originalPrompt);
      const analyticsSkipChoice = chatText('Skip analytics', 'アナリティクスをスキップ', state.pendingIntake.originalPrompt);
      const analyticsGroup = [...els.chatThread.querySelectorAll('.intake-choice-group')]
        .find((groupElement) => String(groupElement.querySelector('[data-intake-confirmed-list]')?.dataset.choiceGroup || '') === analyticsGroupName);
      if (analyticsGroup?.dataset.choiceMode === 'single') {
        resetIntakeChoiceGroup(analyticsGroup, analyticsGroupName);
      }
      appendIntakeChoiceToComposer(analyticsGroupName, analyticsSkipChoice);
      setIntakeConfirmedChoice(analyticsGroup, analyticsGroupName, analyticsSkipChoice);
      return true;
    }
    return false;
  }

  function handleIntakeOtherInputKeydown(event = {}) {
    const input = event.target?.closest?.('[data-intake-other-input]');
    if (!input || event.key !== 'Enter' || event.shiftKey || event.isComposing) return false;
    event.preventDefault();
    input.closest('.intake-other-row')?.querySelector('[data-intake-other-add]')?.click();
    return true;
  }

  function attachInboundAppContext(context = {}, options = {}) {
    if (state.pendingIntake) {
      const prompt = caitAppContextChatPrompt(context);
      state.pendingIntake.appContextAttached = true;
      state.pendingIntake.analyticsContextAttached = appContextMatchesMeasurementEvidenceApp(context);
      state.pendingIntake.appContextPrompt = prompt;
      state.pendingIntake.appContext = context;
      const contextGroupName = chatText('Analytics data', 'アナリティクス', state.pendingIntake.originalPrompt || prompt);
      const contextChoice = caitAppContextAnswerLine(context);
      const contextGroupElement = findIntakeChoiceGroupElement(contextGroupName);
      if (contextGroupElement?.dataset.choiceMode === 'single') {
        resetIntakeChoiceGroup(contextGroupElement, contextGroupName);
      }
      appendIntakeChoiceToComposer(contextGroupName, contextChoice);
      setIntakeConfirmedChoice(contextGroupElement, contextGroupName, contextChoice);
      updateComposerMode();
      setBusy(false);
      appendTextMessage('system', chatText(
        'App context returned to the active intake. Continue filling any missing choices or send the current answer when ready; nothing has been dispatched yet.',
        'アプリの情報を進行中のヒアリングに戻しました。未入力の選択肢を続けて入力するか、準備できたらこの回答を送信してください。まだ実行も課金も発生していません。',
        state.pendingIntake.originalPrompt || prompt
      ), { label: options.label || 'App context' });
      return true;
    }
    if (state.draft) {
      attachAppContextToDraft(context);
      state.pendingAppContext = context;
      appendTextMessage('system', chatText(
        'Analytics/app context was attached to the prepared order. Review the updated order check, then press Send order when ready.',
        'アナリティクス/アプリコンテキストを発注ドラフトに添付しました。更新された注文確認を見て、問題なければ Send order を押してください。',
        state.draft.originalPrompt || state.draft.prompt || ''
      ), { label: options.label || 'App context' });
      appendOrderConfirmation({ updated: true });
      setBusy(false);
      return true;
    }
    return false;
  }

  return {
    answerPendingIntake,
    appendIntakeChoiceToComposer,
    appendOrderConfirmation,
    appContextMatchesMeasurementEvidenceApp,
    attachInboundAppContext,
    attachAppContextToDraft,
    caitAppContextAnswerLine,
    findIntakeChoiceGroupElement,
    handleIntakeOtherInputKeydown,
    handleIntakeThreadClick,
    intakeChoiceCardsHtml,
    markDraftMeasurementEvidenceSkipped,
    measurementEvidenceContextStatus,
    openMeasurementEvidenceAppForDraft,
    openMeasurementEvidenceAppForIntake,
    orderConfirmationHtml,
    removeIntakeChoiceFromComposer,
    resetIntakeChoiceGroup,
    setIntakeConfirmedChoice,
    startIntake
  };
}
