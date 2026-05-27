import { compactClientText as compactChatText } from './client-text-utils.js?v=20260521a';

export function createOpenChatIntakeUtils(options = {}) {
  const getState = typeof options.getState === 'function' ? options.getState : () => ({});
  const getEls = typeof options.getEls === 'function' ? options.getEls : () => ({});
  const normalizeOpenChatIntentText = typeof options.normalizeOpenChatIntentText === 'function'
    ? options.normalizeOpenChatIntentText
    : (value) => String(value || '').trim().toLowerCase();
  const openChatIntentMatchText = typeof options.openChatIntentMatchText === 'function'
    ? options.openChatIntentMatchText
    : (value) => String(value || '').trim().toLowerCase();
  const currentRoutingTask = typeof options.currentRoutingTask === 'function' ? options.currentRoutingTask : () => '';
  const inferClientTaskSequence = typeof options.inferClientTaskSequence === 'function'
    ? options.inferClientTaskSequence
    : () => [];
  const looksJapanese = typeof options.looksJapanese === 'function' ? options.looksJapanese : () => false;
  const openChatConversationContextForLlm = typeof options.openChatConversationContextForLlm === 'function'
    ? options.openChatConversationContextForLlm
    : () => [];
  const currentRunTargetAgent = typeof options.currentRunTargetAgent === 'function'
    ? options.currentRunTargetAgent
    : () => null;
  const agentTaskFit = typeof options.agentTaskFit === 'function' ? options.agentTaskFit : () => ({ matches: true });
  const structuredOrderBriefParts = typeof options.structuredOrderBriefParts === 'function'
    ? options.structuredOrderBriefParts
    : () => ({});
  const isStructuredOrderBrief = typeof options.isStructuredOrderBrief === 'function'
    ? options.isStructuredOrderBrief
    : () => false;
  const catCompactDispatchBrief = typeof options.catCompactDispatchBrief === 'function'
    ? options.catCompactDispatchBrief
    : (value) => String(value || '');
  const openChatPreviousUserMessageBody = typeof options.openChatPreviousUserMessageBody === 'function'
    ? options.openChatPreviousUserMessageBody
    : () => '';

  const OPEN_CHAT_LEADER_INTAKE_TASKS = new Set([
    'research_team_leader',
    'build_team_leader',
    'secretary_leader',
    'cto_leader',
    'cpo_leader',
    'cmo_leader',
    'cfo_leader',
    'legal_leader'
  ]);

  const OPEN_CHAT_CANONICAL_ORDER_TASKS = new Set([
    'prompt_brushup',
    'research_team_leader',
    'build_team_leader',
    'secretary_leader',
    'cto_leader',
    'cpo_leader',
    'cmo_leader',
    'media_planner',
    'citation_ops',
    'cfo_leader',
    'legal_leader',
    'growth',
    'marketing',
    'list_creator',
    'directory_submission',
    'acquisition_automation',
    'teardown',
    'landing',
    'instagram',
    'x_post',
    'reddit',
    'indie_hackers',
    'data_analysis',
    'seo_specialist',
    'seo',
    'research',
    'summary',
    'writing',
    'pricing',
    'listing',
    'code',
    'debug',
    'ops',
    'automation',
    'translation',
    'validation',
    'diligence',
    'hiring'
  ]);

  function openChatSourceText(prompt = '') {
    const text = String(prompt || '').trim();
    if (!text) return '';
    const firstLineBreak = text.indexOf('\n');
    if (firstLineBreak > -1) {
      const firstLine = text.slice(0, firstLineBreak);
      const rest = text.slice(firstLineBreak + 1).trim();
      if (rest && explicitOpenChatAssistMode(firstLine)) return rest;
    }
    const colon = text.match(/^(.{0,120}?)(?:[:：])\s*([\s\S]{8,})$/);
    if (colon && explicitOpenChatAssistMode(colon[1])) return colon[2].trim();
    const stripped = text
      .replace(/^(この|これを|以下を|発注|注文|依頼|プロンプト|order|prompt|brief|task)?\s*(を|の)?\s*(ブラッシュアップ|具体化|整理|分解|切って|英語化|圧縮|短く|ヒアリング|確認質問|質問して|refine|compact|split|break down|ask questions)\s*(して|してください|please)?[。.!！\s:：-]*/i, '')
      .trim();
    return stripped || text;
  }

  function openChatClarifyingQuestions(taskType = 'research', prompt = '') {
    const ja = looksJapanese(prompt);
    const task = String(taskType || 'research').toLowerCase();
    const leaderQuestions = openChatLeaderIntakeQuestionsForTask(task, prompt);
    if (leaderQuestions.length) return leaderQuestions.slice(0, 5);
    const commonJa = [
      '最終的に何を判断・完成したいですか？',
      '対象範囲、地域、期間、使ってよい情報源、除外条件はありますか？',
      '納品形式は短い結論、表、Markdown、チェックリスト、実装手順のどれがよいですか？'
    ];
    const commonEn = [
      'What decision or finished output should this produce?',
      'What scope, region, time period, allowed sources, or exclusions should apply?',
      'What delivery format should be used: short answer, table, Markdown, checklist, or implementation steps?'
    ];
    const byTaskJa = {
      code: ['対象リポジトリ、ファイル、エラー、期待動作は何ですか？', '変更してよい範囲と壊してはいけない挙動は何ですか？', 'テスト方法や完了条件は何ですか？'],
      seo: ['対象URL、狙うキーワード、対象地域/言語は何ですか？', '競合URLや既存コンテンツはありますか？', '納品は改善リスト、記事案、メタ案、比較表のどれがよいですか？'],
      writing: ['誰向けで、読後に何をしてほしい文章ですか？', 'トーン、文字量、必須要素、避けたい表現はありますか？', '記事、LP、メール、SNS投稿、箇条書きのどれで納品しますか？'],
      pricing: ['対象商品、顧客層、現在価格、競合価格は何ですか？', '利益率、成約率、継続率、初回獲得のどれを重視しますか？', '価格案、プラン表、検証計画のどれを納品しますか？'],
      research: commonJa
    };
    const byTaskEn = {
      code: ['Which repository, files, error, and expected behavior should be used?', 'What can be changed, and what behavior must not break?', 'How should the result be tested or accepted?'],
      seo: ['What URL, keyword, region, and language should this target?', 'Do you have competitor URLs or existing content to compare?', 'Should the delivery be an improvement list, article plan, meta tags, or comparison table?'],
      writing: ['Who is the target reader, and what should they do after reading?', 'What tone, length, required points, or blocked phrasing should be used?', 'Should the delivery be an article, landing page, email, social post, or bullets?'],
      pricing: ['What product, customer segment, current price, and competitor prices should be used?', 'Which metric matters most: margin, conversion, retention, or acquisition?', 'Should the delivery be price recommendations, plan table, or test plan?'],
      research: commonEn
    };
    const table = ja ? byTaskJa : byTaskEn;
    return (table[task] || table.research || (ja ? commonJa : commonEn)).slice(0, 4);
  }

  function openChatIsLeaderIntakeTask(taskType = '') {
    const task = String(taskType || '').trim().toLowerCase();
    return Boolean(task && (OPEN_CHAT_LEADER_INTAKE_TASKS.has(task) || task.endsWith('_leader')));
  }

  function openChatLeaderIntakeProfile(taskType = '') {
    const task = String(taskType || '').toLowerCase();
    if (task === 'research_team_leader') return 'research';
    if (task === 'build_team_leader' || task === 'cto_leader') return 'build';
    if (task === 'secretary_leader') return 'operations';
    if (task === 'cpo_leader') return 'product';
    if (task === 'cmo_leader') return 'general';
    if (task === 'cfo_leader') return 'finance';
    if (task === 'legal_leader') return 'legal';
    if (openChatIsLeaderIntakeTask(task)) return 'general';
    return '';
  }

  function openChatImplicitLeaderIntakeTask(prompt = '') {
    const raw = normalizeOpenChatIntentText(prompt);
    const text = openChatIntentMatchText(prompt);
    if (!text) return '';
    const providerListingIntent = /(list your agent|publish agent|agent listing|agent registration)/i.test(text)
      || /(?:manifest|verify|verification).*(?:register|registration|publish|listing|agent)/i.test(text)
      || /(ai agent|agent).{0,50}(signup|register|registration|publish|listing)/i.test(text)
      || /(えーじぇんと|えいじぇんと|エージェント|agent).{0,30}(登録|とうろく|公開|こうかい|マニフェスト|ベリファイ|検証)/i.test(String(prompt || ''))
      || /(えーじぇんと|えいじぇんと|agent).{0,30}(とうろく|こうかい|まにふぇすと|べりふぁい|けんしょう)/i.test(raw);
    if (providerListingIntent) return '';
    const current = String(currentRoutingTask() || '').trim().toLowerCase();
    if (openChatIsLeaderIntakeTask(current)) return current;
    const inferred = inferClientTaskSequence('', text)[0] || '';
    if (openChatIsLeaderIntakeTask(inferred)) return inferred;
    return '';
  }

  function openChatLeaderIntakeSignals(prompt = '', inputCounts = {}) {
    const raw = String(prompt || '').trim();
    const text = openChatIntentMatchText(raw);
    const hasAttachment = Boolean(Number(inputCounts.urlCount || 0) || Number(inputCounts.fileCount || 0));
    return {
      objective: /(目的|ゴール|目標|KPI|伸ば|増や|獲得|改善|検証|判断|決め|作りたい|したい|使って|使われ|利用|導入|広め|認知|goal|objective|kpi|increase|grow|improve|validate|decide|launch|convert|revenue|sales|signup|activation|retention|adoption|usage)/i.test(text),
      business: hasAttachment || /https?:\/\//i.test(raw) || /(商材|商品|サービス|プロダクト|事業|会社|ブランド|アプリ|サイト|SaaS|マーケットプレイス|プラットフォーム|ツール|顧客|課金|価格|product|service|business|company|brand|app|site|saas|marketplace|platform|tool|customer|pricing)/i.test(text),
      audience: /(誰向け|対象|顧客|ユーザー|ペルソナ|ICP|業界|開発者|創業者|法人|個人|audience|customer|user|persona|segment|icp|developer|founder|buyer|b2b|b2c)/i.test(text),
      currentState: /(現状|今|現在|月間|PV|登録|売上|CVR|流入|チャネル|使っている|課題|数字|baseline|current|traffic|signup|revenue|conversion|funnel|channel|metric|analytics)/i.test(text),
      sourceData: hasAttachment || /(資料|営業資料|提案資料|DL資料|ダウンロード資料|ホワイトペーパー|事例|価格表|LP|ランディングページ|GA4|Google Analytics|アナリティクス|Search Console|サーチコンソール|GSC|CRM|商談|問い合わせ|ログ|レポート|データ|ファイル|読み込|読ませ|参照|添付|material|deck|sales deck|download|whitepaper|case study|pricing page|landing page|analytics|search console|crm|pipeline|lead data|sales data|report|source|file|attachment|reference|context data|no analytics|no source data|no files|no materials|資料なし|データなし|ファイルなし)/i.test(text),
      constraints: /(制約|予算|広告費|無料|なし|使わない|期間|地域|日本|英語|NG|避け|X|Twitter|Reddit|Indie Hackers|SEO|Product Hunt|budget|no ads|without ads|free|constraint|region|deadline|channel|avoid)/i.test(text),
      deliverable: /(納品|出力|形式|レポート|表|計画|プラン|施策|アクション|実行|投稿|媒体|コピー|KPI|チェックリスト|deliver|output|report|table|plan|copy|asset|checklist|brief|strategy|roadmap|action|execution|channel)/i.test(text),
      system: hasAttachment || /(リポジトリ|repo|GitHub|コード|システム|アプリ|API|DB|データベース|設計|実装|バグ|エラー|テスト|repository|codebase|system|api|database|architecture|bug|error|test|deploy)/i.test(text),
      legalScope: /(規約|プライバシー|特商法|返金|課金|表示|契約|個人情報|同意|免責|法域|日本法|terms|privacy|refund|billing|contract|compliance|jurisdiction|policy|disclaimer)/i.test(text),
      numbers: /(円|ドル|%|％|月額|単価|原価|粗利|利益|売上|費用|LTV|CAC|ARPU|MRR|ARR|churn|margin|cost|price|revenue|profit|unit economics|\d)/i.test(text),
      longEnough: raw.length >= 80 || (hasAttachment && raw.length >= 35)
    };
  }

  function openChatMissingLeaderIntakeFields(taskType = '', prompt = '', inputCounts = {}) {
    const profile = openChatLeaderIntakeProfile(taskType);
    if (!profile) return [];
    const signals = openChatLeaderIntakeSignals(prompt, inputCounts);
    const missing = [];
    const require = (key, label) => {
      if (!signals[key]) missing.push(label);
    };
    if (profile === 'general') {
      require('objective', 'objective');
      if (!signals.business && !signals.system) missing.push('target_context');
      if (!signals.sourceData) missing.push('source_data_context');
      if (!signals.currentState && !signals.constraints) missing.push('current_state_or_constraints');
      if (!signals.deliverable) missing.push('desired_delivery');
      if (!signals.longEnough) missing.push('context_detail');
    } else if (profile === 'research') {
      require('objective', 'decision_objective');
      require('business', 'research_target');
      if (!signals.sourceData) missing.push('source_data_context');
      if (!signals.currentState && !signals.constraints) missing.push('scope_or_evidence_constraints');
      if (!signals.deliverable) missing.push('decision_memo_format');
    } else if (profile === 'build') {
      require('objective', 'technical_objective');
      require('system', 'system_or_repository_context');
      if (!signals.sourceData) missing.push('source_data_context');
      if (!signals.constraints && !signals.currentState) missing.push('constraints_or_failure_context');
      if (!signals.deliverable) missing.push('validation_or_delivery_format');
    } else if (profile === 'product') {
      require('objective', 'product_objective');
      require('business', 'product_or_service');
      if (!signals.audience) missing.push('target_user');
      if (!signals.sourceData) missing.push('source_data_context');
      if (!signals.currentState && !signals.constraints) missing.push('user_problem_or_constraints');
      if (!signals.deliverable) missing.push('product_output_format');
    } else if (profile === 'finance') {
      require('objective', 'financial_objective');
      require('business', 'business_model_or_product');
      if (!signals.sourceData) missing.push('source_data_context');
      if (!signals.numbers && !signals.currentState) missing.push('current_numbers_or_assumptions');
      if (!signals.deliverable) missing.push('financial_output_format');
    } else if (profile === 'legal') {
      require('objective', 'legal_review_objective');
      require('business', 'business_or_service_context');
      require('legalScope', 'legal_scope');
      if (!signals.sourceData) missing.push('source_data_context');
      if (!signals.constraints && !signals.currentState) missing.push('jurisdiction_or_operational_context');
      if (!signals.deliverable) missing.push('legal_output_format');
    } else if (profile === 'operations') {
      require('objective', 'operations_objective');
      if (!signals.sourceData) missing.push('source_data_context');
      if (!signals.currentState && !signals.constraints) missing.push('operational_context_or_constraints');
      if (!signals.deliverable) missing.push('operations_output_format');
    }
    return missing;
  }

  function openChatNormalizeLeaderIntakeTask(taskType = '') {
    const task = String(taskType || '').trim().toLowerCase();
    if (openChatIsLeaderIntakeTask(task)) return task;
    return '';
  }

  function openChatTaskToken(value = '') {
    return String(value || '')
      .normalize('NFKC')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  function openChatCanonicalOrderTaskType(taskType = '', context = '') {
    const token = openChatTaskToken(taskType);
    if (['secretary_team', 'secretary', 'executive_secretary', 'executive_assistant', 'assistant_ops'].includes(token)) return 'secretary_leader';
    if (token === 'build_team' || token === 'coding_team' || token === 'engineering_team') return 'build_team_leader';
    if (token === 'research_team' || token === 'analysis_team') return 'research_team_leader';
    if (['list_creator', 'lead_sourcing', 'lead_qualification', 'company_list_builder', 'prospect_research', 'lead_list_building', 'prospect_list', 'lead_list'].includes(token)) return 'list_creator';
    if (OPEN_CHAT_CANONICAL_ORDER_TASKS.has(token)) return token;
    const leaderTask = openChatNormalizeLeaderIntakeTask(token);
    if (leaderTask) return leaderTask;
    void context;
    return '';
  }

  function clearPinnedAgentIfMismatchedTask(taskType = '') {
    const task = openChatCanonicalOrderTaskType(taskType) || String(taskType || '').trim().toLowerCase();
    const els = getEls();
    if (!task || !els.jobAgentId?.value) return false;
    const pinned = currentRunTargetAgent();
    if (!pinned || agentTaskFit(pinned, task).matches) return false;
    els.jobAgentId.value = '';
    return true;
  }

  function clearPinnedAgentIfMismatchedBrief(brief = '') {
    if (!isStructuredOrderBrief(brief)) return false;
    return clearPinnedAgentIfMismatchedTask(structuredOrderBriefParts(brief).taskType);
  }

  function openChatUserOnlyContextForIntake(prompt = '') {
    const userRows = openChatConversationContextForLlm()
      .filter((row) => row.role === 'user')
      .map((row) => row.content)
      .filter(Boolean);
    userRows.push(String(prompt || '').trim());
    return userRows.join('\n').trim();
  }

  function openChatLeaderIntakeQuestionsForTask(taskType = '', prompt = '') {
    void taskType;
    void prompt;
    return [];
  }

  function normalizeOpenChatDynamicLeaderIntakeQuestions(value = []) {
    const seen = new Set();
    return (Array.isArray(value) ? value : [])
      .map((question) => String(question || '').replace(/\s+/g, ' ').trim())
      .filter((question) => question.length >= 12 && question.length <= 260)
      .filter((question) => {
        const key = question.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .filter((question) => !/(password|secret|api key|hidden prompt|system prompt|ignore previous|パスワード|秘密|システムプロンプト|隠しプロンプト)/i.test(question))
      .slice(0, 6);
  }

  function buildOpenChatLeaderIntakeClarifyAnswer(taskType = 'research_team_leader', prompt = '', missing = [], options = {}) {
    const text = String(prompt || '').trim();
    const safeTaskType = openChatNormalizeLeaderIntakeTask(taskType) || taskType || 'research_team_leader';
    const questions = openChatLeaderIntakeQuestionsForTask(safeTaskType, text);
    const ja = looksJapanese(text);
    const guardedByOpenAi = options.source === 'openai_guarded';
    void missing;
    return {
      kind: 'clarify',
      tone: 'warn',
      patternId: guardedByOpenAi ? 'pattern_openai_leader_intake_guard' : 'pattern_leader_required_intake',
      responseSource: guardedByOpenAi ? 'openai_guarded' : undefined,
      llmProvider: guardedByOpenAi ? 'openai' : undefined,
      suppressTrio: Boolean(options.suppressTrio),
      leaderIntakePrompt: text,
      leaderIntakeTask: safeTaskType,
      body: ja
        ? [
            guardedByOpenAi
              ? '方向は分かりました。良いリーダー提案にするため、先に前提・資料・実データを確認します。'
              : 'より良い結果にするため、目的、対象、読ませたい資料や実データを少し確認します。',
            'まだ実行も課金もしていません。',
            '',
            '分かる範囲で答えてください。空欄があっても大丈夫です:',
            ...questions.map((question, index) => `${index + 1}. ${question}`),
            '',
            '回答をもらったら、同じ質問は繰り返さず、チームリーダー用のオーダー内容に整理して SEND ORDER できる状態にします。'
          ].join('\n')
        : [
            guardedByOpenAi
              ? 'I understand the direction. I need context, source materials, and real-data status first so the leader proposal is useful.'
              : 'I need the objective, target, source materials, and real-data status first so the result is useful.',
            'Nothing has run and nothing has been billed yet.',
            '',
            'Answer what you can. It is fine to leave unknown items blank:',
            ...questions.map((question, index) => `${index + 1}. ${question}`),
            '',
            'After that, I will not repeat the same questions. I will turn the answers into a Team Leader order summary and make SEND ORDER available.'
          ].join('\n'),
      status: 'Need Team Leader intake before SEND ORDER.\n\nAnswer the missing context questions, then CAIt will prepare the order summary.'
    };
  }

  function openChatLooksLeaderIntakePromptBody(body = '') {
    const text = String(body || '').trim();
    if (!text) return false;
    return /(回答をもらったら、同じ質問は繰り返さず|After that, I will not repeat the same questions|I will not repeat the whole intake|同じ質問は繰り返しません)/i.test(text)
      && /(SEND ORDER|チームリーダー|Team Leader|目的や商材内容|objective and product context|足りないところだけ確認します|only ask for what is still missing)/i.test(text);
  }

  function openChatLeaderIntakeTaskFromPromptBody(body = '', original = '') {
    const inferred = openChatNormalizeLeaderIntakeTask(openChatImplicitLeaderIntakeTask(original))
      || openChatNormalizeLeaderIntakeTask(inferClientTaskSequence('', original)[0]);
    if (inferred) return inferred;
    const text = String(body || '');
    if (/(この調査で最終的に何を判断|What decision should this research support)/i.test(text)) return 'research_team_leader';
    if (/(対象のシステム、リポジトリ|What system, repository)/i.test(text)) return 'build_team_leader';
    if (/(対象プロダクトや機能|What product or feature)/i.test(text)) return 'cpo_leader';
    if (/(商売モデル、商品、価格|business model, product, price)/i.test(text)) return 'cfo_leader';
    if (/(確認したい法務領域|legal area should be reviewed)/i.test(text)) return 'legal_leader';
    return '';
  }

  function recoverOpenChatLeaderIntakeContextFromMessages() {
    const state = getState();
    const messages = Array.isArray(state.orderChatMessages) ? state.orderChatMessages : [];
    const recent = messages.slice(-10);
    for (let index = recent.length - 1; index >= 0; index -= 1) {
      const message = recent[index];
      if (message?.role !== 'agent') continue;
      const body = String(message.fullBody || message.body || '').trim();
      if (!openChatLooksLeaderIntakePromptBody(body)) continue;
      const priorUsers = recent
        .slice(0, index)
        .filter((item) => item?.role === 'user')
        .map((item) => String(item.fullBody || item.body || '').trim())
        .filter(Boolean);
      const original = priorUsers.find((item) => openChatImplicitLeaderIntakeTask(item))
        || priorUsers[0]
        || openChatPreviousUserMessageBody();
      const taskType = openChatLeaderIntakeTaskFromPromptBody(body, original);
      if (original && taskType) return { prompt: original, taskType, recovered: true };
    }
    return null;
  }

  function openChatPendingLeaderIntakeContext() {
    const state = getState();
    const prompt = String(state.openChatLeaderIntakePrompt || '').trim();
    const taskType = String(state.openChatLeaderIntakeTask || '').trim();
    if (prompt && taskType) return { prompt, taskType };
    const recovered = recoverOpenChatLeaderIntakeContextFromMessages();
    if (!recovered) return null;
    state.openChatLeaderIntakePrompt = compactChatText(recovered.prompt, 2000);
    state.openChatLeaderIntakeTask = compactChatText(recovered.taskType, 120);
    return recovered;
  }

  function combinedLeaderIntakePrompt(original = '', answer = '') {
    return [
      'Original request:',
      String(original || '').trim(),
      '',
      'User intake answers:',
      String(answer || '').trim()
    ].join('\n').trim();
  }

  function openChatLeaderChoiceSourcePrompt(prompt = '') {
    const answer = String(prompt || '').trim();
    const pending = String(getState()?.openChatPendingQuestionPrompt || '').trim();
    if (pending && answer && !isStructuredOrderBrief(answer)) return combinedLeaderIntakePrompt(pending, answer);
    return answer;
  }

  function openChatLeaderChoiceCandidatesForIntent(prompt = '', inputCounts = {}) {
    const source = openChatLeaderChoiceSourcePrompt(prompt);
    const raw = String(source || '').trim();
    const text = openChatIntentMatchText(raw);
    if (!raw) return [];
    const hasSource = Number(inputCounts.urlCount || 0) || Number(inputCounts.fileCount || 0) || /https?:\/\/|\.net|\.com|サイト|ホームページ|ページ|トップ|LP|landing page/i.test(raw);
    const conversionReviewIntent = Boolean(
      hasSource
      && /(uiux|ui\s*ux|ux|ユーザー体験|導線|トップページ|ファーストビュー|landing page|lp|cvr|cv|コンバージョン|会員登録|signup|登録|conversion)/i.test(text)
      && /(読み込|読んで|見て|レビュー|診断|改善|提案|変えたほう|recommend|review|audit|diagnose|improve|proposal)/i.test(text)
    );
    if (!conversionReviewIntent) return [];
    return [
      {
        taskType: 'cpo_leader',
        labelJa: 'CPOリーダー',
        labelEn: 'CPO Leader',
        descriptionJa: '登録CVのために、トップページの体験・情報設計・導線を決める',
        descriptionEn: 'Decide the homepage UX, information architecture, and signup path'
      },
      {
        taskType: 'cmo_leader',
        labelJa: 'CMO/Growthリーダー',
        labelEn: 'CMO/Growth Leader',
        descriptionJa: '会員登録CVR、訴求、ファネル、計測観点を優先する',
        descriptionEn: 'Prioritize signup CVR, messaging, funnel, and measurement'
      },
      {
        taskType: 'research_team_leader',
        labelJa: 'Researchリーダー',
        labelEn: 'Research Leader',
        descriptionJa: '競合・ユーザー仮説・根拠を調べてから改善案を出す',
        descriptionEn: 'Research competitors, user assumptions, and evidence first'
      }
    ];
  }

  function openChatLeaderChoiceTargetLabel(prompt = '') {
    const source = String(prompt || '');
    return (
      source.match(/https?:\/\/[^\s)\]）]+/i)?.[0]
      || source.match(/[a-z0-9][a-z0-9.-]+\.(?:com|net|jp|dev|app|io|co|org)(?:\/[^\s)\]）]*)?/i)?.[0]
      || ''
    ).trim();
  }

  function buildOpenChatLeaderChoiceAnswer(prompt = '', inputCounts = {}) {
    const state = getState();
    if (String(state.openChatLeaderChoicePrompt || '').trim()) return null;
    const source = openChatLeaderChoiceSourcePrompt(prompt);
    const candidates = openChatLeaderChoiceCandidatesForIntent(source, inputCounts);
    if (!candidates.length) return null;
    const ja = looksJapanese(source);
    const target = openChatLeaderChoiceTargetLabel(source) || (ja ? '対象サイト' : 'the target site');
    return {
      kind: 'clarify',
      tone: 'info',
      patternId: 'pattern_leader_choice_required',
      suppressTrio: true,
      leaderChoicePrompt: source,
      leaderChoiceCandidates: candidates,
      clearPendingQuestion: true,
      options: candidates.map((candidate, index) => ({
        command: `select_leader:${candidate.taskType}`,
        label: ja ? `${index + 1}. ${candidate.labelJa}` : `${index + 1}. ${candidate.labelEn}`,
        description: ja ? candidate.descriptionJa : candidate.descriptionEn
      })),
      body: ja
        ? [
            'インテントは確認できました。',
            '',
            `確認した内容: ${target} のトップページを読み込み、会員登録CVを増やすためのUI/UX改善提案を作る。`,
            '',
            '次に、どのリーダーと会話するか選んでください。番号だけでも大丈夫です。',
            ...candidates.map((candidate, index) => `${index + 1}. ${candidate.labelJa}: ${candidate.descriptionJa}`),
            '',
            '選んだリーダーに移ったあと、そのリーダーが足りない前提だけを確認します。まだ実行も課金もしていません。'
          ].join('\n')
        : [
            'Intent confirmed.',
            '',
            `Confirmed request: read ${target}'s homepage and propose UI/UX improvements to increase member signup conversion.`,
            '',
            'Next, choose which leader should own the conversation. A number is enough.',
            ...candidates.map((candidate, index) => `${index + 1}. ${candidate.labelEn}: ${candidate.descriptionEn}`),
            '',
            'After you choose, CAIt will move into that leader conversation and ask only the missing leader-specific context. Nothing has run or been billed yet.'
          ].join('\n'),
      status: 'Leader choice required.\n\nChoose the leader before continuing.'
    };
  }

  function openChatLeaderChoiceSelection(prompt = '') {
    const state = getState();
    const candidates = Array.isArray(state.openChatLeaderChoiceCandidates) ? state.openChatLeaderChoiceCandidates : [];
    const text = String(prompt || '').normalize('NFKC').replace(/\s+/g, ' ').trim();
    if (!text || !candidates.length) return null;
    const commandTask = (text.match(/^select_leader:([a-z0-9_ -]+)$/i)?.[1] || '').trim().toLowerCase();
    if (commandTask) return candidates.find((candidate) => String(candidate.taskType || '').toLowerCase() === commandTask) || null;
    const choice = text.replace(/^[#\s]+/, '').replace(/[.．。、):：\s]+$/g, '');
    const numeric = Number(choice);
    if (Number.isInteger(numeric) && numeric >= 1 && numeric <= candidates.length) return candidates[numeric - 1];
    const lower = openChatIntentMatchText(text);
    if (/(cpo|product|プロダクト|体験|情報設計|ux|uiux)/i.test(lower)) return candidates.find((candidate) => candidate.taskType === 'cpo_leader') || null;
    if (/(cmo|growth|グロース|cvr|cv|ファネル|登録率|会員登録|signup|conversion|マーケ|マーケティング)/i.test(lower)) return candidates.find((candidate) => candidate.taskType === 'cmo_leader') || null;
    if (/(research|リサーチ|調査|競合|根拠|evidence)/i.test(lower)) return candidates.find((candidate) => candidate.taskType === 'research_team_leader') || null;
    return null;
  }

  function buildOpenChatLeaderChoiceFollowupAnswer(prompt = '', inputCounts = {}) {
    const state = getState();
    const original = String(state.openChatLeaderChoicePrompt || '').trim();
    if (!original) return null;
    const selected = openChatLeaderChoiceSelection(prompt);
    const ja = looksJapanese(prompt) || looksJapanese(original);
    if (!selected) {
      return {
        kind: 'clarify',
        tone: 'warn',
        patternId: 'pattern_leader_choice_required',
        suppressTrio: true,
        leaderChoicePrompt: original,
        leaderChoiceCandidates: Array.isArray(state.openChatLeaderChoiceCandidates) ? state.openChatLeaderChoiceCandidates : [],
        body: ja
          ? 'どのリーダーに移るかだけ選んでください。例: 1 / CPO、2 / CMO/Growth、3 / Research。まだ実行も課金もしていません。'
          : 'Choose which leader should own this conversation: 1 / CPO, 2 / CMO/Growth, or 3 / Research. Nothing has run or been billed yet.',
        status: 'Leader choice still required.'
      };
    }
    const sourcePrompt = original;
    const target = openChatLeaderChoiceTargetLabel(sourcePrompt) || (ja ? '対象サイト' : 'the target site');
    const questions = openChatClarifyingQuestions(selected.taskType, sourcePrompt).slice(0, 4);
    void inputCounts;
    return {
      kind: 'clarify',
      tone: 'info',
      patternId: 'pattern_leader_choice_selected',
      suppressTrio: true,
      clearLeaderChoice: true,
      clearPendingQuestion: true,
      clearClarifyOptions: true,
      leaderIntakePrompt: sourcePrompt,
      leaderIntakeTask: selected.taskType,
      body: ja
        ? [
            `${selected.labelJa}との会話に移ります。`,
            '',
            '確認済みインテント:',
            `${target} のトップページを読み込み、会員登録CVを増やすためのUI/UX改善提案を作る。`,
            '',
            'このリーダーに渡す前提として、分かる範囲だけ答えてください。空欄や「不明」でも進められます。',
            ...questions.map((question, index) => `${index + 1}. ${question}`),
            '',
            '回答後は同じ確認を繰り返さず、リーダー用の注文内容に整理します。まだ実行も課金もしていません。'
          ].join('\n')
        : [
            `Moving into the ${selected.labelEn} conversation.`,
            '',
            'Confirmed intent:',
            `Read ${target}'s homepage and propose UI/UX improvements to increase member signup conversion.`,
            '',
            'Answer what you can before handing this to the leader. Unknown is fine.',
            ...questions.map((question, index) => `${index + 1}. ${question}`),
            '',
            'After you answer, CAIt will not repeat the same check; it will prepare the leader order summary. Nothing has run or been billed yet.'
          ].join('\n'),
      status: 'Leader conversation selected.\n\nAnswer the leader-specific context questions.'
    };
  }

  function buildOpenChatRecoveredLeaderIntakeAnswer(prompt = '', inputCounts = {}) {
    const state = getState();
    const answer = String(prompt || '').trim();
    if (!openChatLooksNumberedLeaderIntakeAnswer(answer)) return null;
    const previousAgentBody = options.openChatPreviousAgentMessageBody?.() || '';
    if (!openChatLooksLeaderIntakePromptBody(previousAgentBody)) return null;
    const recovered = recoverOpenChatLeaderIntakeContextFromMessages();
    const original = String(recovered?.prompt || openChatPreviousUserMessageBody() || '').trim();
    const taskType = String(
      recovered?.taskType
        || openChatLeaderIntakeTaskFromPromptBody(previousAgentBody, original)
        || openChatNormalizeLeaderIntakeTask(openChatImplicitLeaderIntakeTask(`${original}\n${answer}`))
        || currentRoutingTask()
        || 'research_team_leader'
    ).trim();
    if (!original || !taskType) return null;
    state.openChatLeaderIntakePrompt = compactChatText(original, 2000);
    state.openChatLeaderIntakeTask = compactChatText(taskType, 120);
    void inputCounts;
    return buildOpenChatLeaderIntakeFollowupAnswer(answer, inputCounts);
  }

  function openChatNormalizeDispatchTask(taskType = '', original = '', answer = '') {
    const task = openChatCanonicalOrderTaskType(taskType, `${original}\n${answer}`) || String(taskType || '').toLowerCase();
    return task || openChatCanonicalOrderTaskType(inferClientTaskSequence('', `${original}\n${answer}`)[0], `${original}\n${answer}`) || currentRoutingTask() || 'research';
  }

  function openChatLooksOrderIntentOnly(answer = '') {
    const text = String(answer || '').replace(/\s+/g, ' ').trim();
    if (!text || text.length > 80) return false;
    if (/https?:\/\//i.test(text)) return false;
    if (/(対象|ユーザー|顧客|商材|商品|サービス|URL|広告費|予算|媒体|投稿|納品|成果物|persona|audience|customer|product|service|budget|channel|deliverable)/i.test(text)) return false;
    return /(発注|注文|依頼|お願い|頼みたい|やって|進めて|実行|対応|order|send order|dispatch|execute|proceed)/i.test(text);
  }

  function openChatLooksNumberedLeaderIntakeAnswer(prompt = '') {
    const raw = String(prompt || '').trim();
    if (!raw || raw.length > 2400) return false;
    const lines = raw.split(/\n+/).map((line) => line.trim()).filter(Boolean);
    const numbered = lines.filter((line) => /^(?:[1-7１-７][\).．、:：]|Q?[1-7１-７][:：]|A[1-7１-７][:：])\s*\S+/i.test(line)).length;
    if (numbered < 2 && !/^(?:1|１)[\).．、:：]/.test(raw)) return false;
    return /(https?:\/\/|商材|商品|サービス|プロダクト|対象|ユーザー|顧客|ICP|目的|登録|会員|資料|GA4|Search Console|サーチコンソール|CRM|データ|広告費|予算|SEO|X|Twitter|媒体|投稿|納品|プラン|アクション|product|service|customer|audience|objective|signup|material|analytics|search console|crm|data|budget|channel|deliverable|plan|action)/i.test(raw);
  }

  function openChatLeaderHasMinimumRouteContext(taskType = '', prompt = '', inputCounts = {}) {
    const profile = openChatLeaderIntakeProfile(taskType);
    const signals = openChatLeaderIntakeSignals(prompt, inputCounts);
    if (profile === 'general') return Boolean((signals.business || signals.system) && signals.objective);
    if (profile === 'research') return Boolean(signals.business && signals.objective);
    if (profile === 'build') return Boolean(signals.system && signals.objective);
    if (profile === 'product') return Boolean(signals.business && (signals.audience || signals.objective));
    if (profile === 'finance') return Boolean(signals.business && signals.objective);
    if (profile === 'legal') return Boolean(signals.business && signals.legalScope);
    return false;
  }

  function buildOpenChatDispatchBriefFromPendingAnswer(original = '', answer = '', taskType = 'research', inputCounts = {}) {
    const dispatchTask = openChatNormalizeDispatchTask(taskType, original, answer);
    return catCompactDispatchBrief([
      'Original request:',
      original,
      '',
      'User clarification:',
      answer
    ].join('\n'), dispatchTask, inputCounts, { maxGoalLength: 900 });
  }

  function buildOpenChatLeaderIntakeFollowupAnswer(prompt = '', inputCounts = {}) {
    void prompt;
    void inputCounts;
    return null;
  }

  function buildOpenChatLeaderIntakeAnswer(prompt = '', inputCounts = {}) {
    void prompt;
    void inputCounts;
    return null;
  }

  function explicitOpenChatAssistMode(prompt = '') {
    const mode = normalizeOpenChatIntentText(prompt);
    return ['refine', 'compact', 'break down', 'ask questions', 'ブラッシュアップ', '具体化', '整理', '分解', 'ヒアリング', '確認質問', '質問して'].some((token) => mode.includes(token));
  }

  return {
    openChatSourceText,
    openChatClarifyingQuestions,
    openChatIsLeaderIntakeTask,
    openChatLeaderIntakeProfile,
    openChatImplicitLeaderIntakeTask,
    openChatLeaderIntakeSignals,
    openChatMissingLeaderIntakeFields,
    openChatNormalizeLeaderIntakeTask,
    openChatCanonicalOrderTaskType,
    clearPinnedAgentIfMismatchedTask,
    clearPinnedAgentIfMismatchedBrief,
    openChatUserOnlyContextForIntake,
    normalizeOpenChatDynamicLeaderIntakeQuestions,
    buildOpenChatLeaderIntakeClarifyAnswer,
    openChatPendingLeaderIntakeContext,
    combinedLeaderIntakePrompt,
    buildOpenChatLeaderChoiceAnswer,
    buildOpenChatLeaderChoiceFollowupAnswer,
    buildOpenChatRecoveredLeaderIntakeAnswer,
    openChatNormalizeDispatchTask,
    openChatLooksOrderIntentOnly,
    openChatLooksNumberedLeaderIntakeAnswer,
    openChatLeaderHasMinimumRouteContext,
    buildOpenChatDispatchBriefFromPendingAnswer,
    buildOpenChatLeaderIntakeFollowupAnswer,
    buildOpenChatLeaderIntakeAnswer
  };
}
