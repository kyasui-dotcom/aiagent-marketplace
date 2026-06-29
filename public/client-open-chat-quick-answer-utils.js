import { compactClientText as compactChatText } from './client-text-utils.js?v=20260521a';

export function createClientOpenChatQuickAnswerUtils(options = {}) {
  const getState = typeof options.getState === 'function' ? options.getState : () => ({});
  const looksJapanese = typeof options.looksJapanese === 'function' ? options.looksJapanese : () => false;
  const isStructuredOrderBrief = typeof options.isStructuredOrderBrief === 'function' ? options.isStructuredOrderBrief : () => false;
  const isOpenChatNoLoginPrompt = typeof options.isOpenChatNoLoginPrompt === 'function' ? options.isOpenChatNoLoginPrompt : () => false;
  const isOpenChatBenignNegativeReply = typeof options.isOpenChatBenignNegativeReply === 'function' ? options.isOpenChatBenignNegativeReply : () => false;
  const isOpenChatRunConfirmation = typeof options.isOpenChatRunConfirmation === 'function' ? options.isOpenChatRunConfirmation : () => false;
  const isOpenChatGenericProceed = typeof options.isOpenChatGenericProceed === 'function' ? options.isOpenChatGenericProceed : () => false;
  const isLeaderCatalogQuestionIntentText = typeof options.isLeaderCatalogQuestionIntentText === 'function' ? options.isLeaderCatalogQuestionIntentText : () => false;
  const lastOpenChatPreparedBrief = typeof options.lastOpenChatPreparedBrief === 'function' ? options.lastOpenChatPreparedBrief : () => '';
  const openChatIntentMatchText = typeof options.openChatIntentMatchText === 'function' ? options.openChatIntentMatchText : (value) => String(value || '').trim().toLowerCase();
  const openChatProductQuestionContext = typeof options.openChatProductQuestionContext === 'function' ? options.openChatProductQuestionContext : () => false;
  const openChatCommandMode = typeof options.openChatCommandMode === 'function' ? options.openChatCommandMode : () => '';
  const openChatLooksGreetingPrompt = typeof options.openChatLooksGreetingPrompt === 'function' ? options.openChatLooksGreetingPrompt : () => false;
  const openChatLooksLowInfoTestPrompt = typeof options.openChatLooksLowInfoTestPrompt === 'function' ? options.openChatLooksLowInfoTestPrompt : () => false;
  const openChatPromptInjectionGuard = typeof options.openChatPromptInjectionGuard === 'function' ? options.openChatPromptInjectionGuard : () => ({ blocked: false });
  const openChatLooksSensitiveSecret = typeof options.openChatLooksSensitiveSecret === 'function' ? options.openChatLooksSensitiveSecret : () => false;
  const openChatLooksUnsafeRequest = typeof options.openChatLooksUnsafeRequest === 'function' ? options.openChatLooksUnsafeRequest : () => false;
  const openChatLooksHighStakesAdvice = typeof options.openChatLooksHighStakesAdvice === 'function' ? options.openChatLooksHighStakesAdvice : () => false;
  const openChatLooksStandaloneQuestionText = typeof options.openChatLooksStandaloneQuestionText === 'function' ? options.openChatLooksStandaloneQuestionText : () => false;
  const openChatHasActiveLocalFollowupState = typeof options.openChatHasActiveLocalFollowupState === 'function' ? options.openChatHasActiveLocalFollowupState : () => false;
  const openChatNaturalConversationIntent = typeof options.openChatNaturalConversationIntent === 'function' ? options.openChatNaturalConversationIntent : () => '';
  const openChatAiBeginnerNaturalIntent = typeof options.openChatAiBeginnerNaturalIntent === 'function' ? options.openChatAiBeginnerNaturalIntent : () => '';
  const openChatEngineerNaturalIntent = typeof options.openChatEngineerNaturalIntent === 'function' ? options.openChatEngineerNaturalIntent : () => '';
  const openChatLooksBareTopicPrompt = typeof options.openChatLooksBareTopicPrompt === 'function' ? options.openChatLooksBareTopicPrompt : () => false;
  const explicitOpenChatAssistModeExternal = typeof options.explicitOpenChatAssistMode === 'function' ? options.explicitOpenChatAssistMode : null;
  const catCompactDispatchBrief = typeof options.catCompactDispatchBrief === 'function' ? options.catCompactDispatchBrief : (value) => String(value || '');
  const inferClientTaskSequence = typeof options.inferClientTaskSequence === 'function' ? options.inferClientTaskSequence : () => [];
  const buildOpenChatPromptInjectionAnswer = typeof options.buildOpenChatPromptInjectionAnswer === 'function' ? options.buildOpenChatPromptInjectionAnswer : () => null;
  const buildOpenChatLongPromptGuardAnswer = typeof options.buildOpenChatLongPromptGuardAnswer === 'function' ? options.buildOpenChatLongPromptGuardAnswer : () => null;
  const buildOpenChatReusableToolsAnswer = typeof options.buildOpenChatReusableToolsAnswer === 'function' ? options.buildOpenChatReusableToolsAnswer : () => null;
  const buildOpenChatRecoveredLeaderIntakeAnswer = typeof options.buildOpenChatRecoveredLeaderIntakeAnswer === 'function' ? options.buildOpenChatRecoveredLeaderIntakeAnswer : () => null;
  const buildOpenChatLeaderIntakeFollowupAnswer = typeof options.buildOpenChatLeaderIntakeFollowupAnswer === 'function' ? options.buildOpenChatLeaderIntakeFollowupAnswer : () => null;
  const buildOpenChatPendingQuestionFollowupAnswer = typeof options.buildOpenChatPendingQuestionFollowupAnswer === 'function' ? options.buildOpenChatPendingQuestionFollowupAnswer : () => null;
  const buildOpenChatPatternGuardAnswer = typeof options.buildOpenChatPatternGuardAnswer === 'function' ? options.buildOpenChatPatternGuardAnswer : () => null;
  const buildOpenChatLowInfoTestAnswer = typeof options.buildOpenChatLowInfoTestAnswer === 'function' ? options.buildOpenChatLowInfoTestAnswer : () => null;
  const buildOpenChatGreetingAnswer = typeof options.buildOpenChatGreetingAnswer === 'function' ? options.buildOpenChatGreetingAnswer : () => null;
  const buildOpenChatIntentShiftFollowup = typeof options.buildOpenChatIntentShiftFollowup === 'function' ? options.buildOpenChatIntentShiftFollowup : () => null;
  const buildOpenChatIdeaOperatorFollowup = typeof options.buildOpenChatIdeaOperatorFollowup === 'function' ? options.buildOpenChatIdeaOperatorFollowup : () => null;
  const buildOpenChatNaturalChoiceFollowup = typeof options.buildOpenChatNaturalChoiceFollowup === 'function' ? options.buildOpenChatNaturalChoiceFollowup : () => null;
  const buildOpenChatVagueChoiceFollowup = typeof options.buildOpenChatVagueChoiceFollowup === 'function' ? options.buildOpenChatVagueChoiceFollowup : () => null;
  const buildOpenChatPendingChoiceReminder = typeof options.buildOpenChatPendingChoiceReminder === 'function' ? options.buildOpenChatPendingChoiceReminder : () => null;
  const buildOpenChatLeaderIntakeAnswer = typeof options.buildOpenChatLeaderIntakeAnswer === 'function' ? options.buildOpenChatLeaderIntakeAnswer : () => null;
  const buildOpenChatRepairAnswer = typeof options.buildOpenChatRepairAnswer === 'function' ? options.buildOpenChatRepairAnswer : () => null;
  const buildOpenChatPauseAnswer = typeof options.buildOpenChatPauseAnswer === 'function' ? options.buildOpenChatPauseAnswer : () => null;
  const buildOpenChatStatusAnswer = typeof options.buildOpenChatStatusAnswer === 'function' ? options.buildOpenChatStatusAnswer : () => null;
  const buildOpenChatTimelineIntentChoiceAnswer = typeof options.buildOpenChatTimelineIntentChoiceAnswer === 'function' ? options.buildOpenChatTimelineIntentChoiceAnswer : () => null;
  const buildOpenChatCeoIdeaAnswer = typeof options.buildOpenChatCeoIdeaAnswer === 'function' ? options.buildOpenChatCeoIdeaAnswer : () => null;
  const buildOpenChatCommandAnswer = typeof options.buildOpenChatCommandAnswer === 'function' ? options.buildOpenChatCommandAnswer : () => null;
  const buildOpenChatFollowupAnswer = typeof options.buildOpenChatFollowupAnswer === 'function' ? options.buildOpenChatFollowupAnswer : () => null;
  const buildOpenChatAssistAnswer = typeof options.buildOpenChatAssistAnswer === 'function' ? options.buildOpenChatAssistAnswer : () => null;
  const buildOpenChatIntentShiftQuestion = typeof options.buildOpenChatIntentShiftQuestion === 'function' ? options.buildOpenChatIntentShiftQuestion : () => null;
  const buildOpenChatResearchOrNarrowChoice = typeof options.buildOpenChatResearchOrNarrowChoice === 'function' ? options.buildOpenChatResearchOrNarrowChoice : () => null;
  const buildOpenChatNaturalConversationAnswer = typeof options.buildOpenChatNaturalConversationAnswer === 'function' ? options.buildOpenChatNaturalConversationAnswer : () => null;
  const PRODUCT_NAME = String(options.productName || 'CAIt');
  const temporaryInvoiceBillingEnabled = Boolean(options.temporaryInvoiceBillingEnabled);

  const stateText = (key) => String(getState()?.[key] || '').trim();

  const isOpenChatAdditionalRequirementFollowup = (prompt = '') => {
    const text = String(prompt || '').replace(/\s+/g, ' ').trim();
    if (!text || text.length > 240 || !lastOpenChatPreparedBrief()) return false;
    if (isStructuredOrderBrief(text) || isOpenChatGenericProceed(text) || openChatProductQuestionContext(text)) return false;
    if (openChatLooksGreetingPrompt(text) || openChatLooksLowInfoTestPrompt(text)) return false;
    if (openChatPromptInjectionGuard(text).blocked || openChatLooksSensitiveSecret(text) || openChatLooksUnsafeRequest(text)) return false;
    const additiveCue = /^(あと|それと|さらに|追加で|ついでに|できれば|可能なら|加えて|それから|also|and also|plus|additionally|if possible|please also|make sure to)\b/i.test(text);
    const requirementCue = /(も見て|も調べ|も比較|も入れ|も含め|も対象|を見て|を調べ|を比較|を入れ|を含め|対象に|優先|除外|競合|相場|市場|地域|期間|形式|表|markdown|マークダウン|include|add|compare|competitor|market|region|format|table|exclude|focus on|prioritize)/i.test(text);
    return additiveCue || requirementCue;
  };

  const explicitOpenChatAssistMode = (prompt = '') => {
    if (explicitOpenChatAssistModeExternal) return explicitOpenChatAssistModeExternal(prompt);
    const text = String(prompt || '').trim();
    if (!text) return '';
    if (isStructuredOrderBrief(text)) return '';
    const hasOrderPrepContext = /(発注|注文|依頼|オーダー|プロンプト|タスク|ヒアリング|確認質問|抜け漏れ|トークン|省トークン|order|brief|work order|prompt|task|token|clarif)/i.test(text);
    if (/(ブラッシュアップ|具体化|抜け漏れ|要件整理|発注文|注文文|依頼文|refine|make.+specific|turn.+into.+order|order brief|work order|prompt.+improve)/i.test(text)) return 'brushup';
    if (/(ヒアリング|確認質問|質問して|聞いて|interview|clarifying question|ask.+question)/i.test(text)) return 'questions';
    if (hasOrderPrepContext && /(分解|分けて|分ける|切って|タスク化|マルチエージェント|分担|並列|split|break down|decompose|parallel|multi[- ]agent)/i.test(text)) return 'split';
    if (hasOrderPrepContext && /(英語化|英訳|短く|圧縮|トークン|省トークン|compact|token|execution brief)/i.test(text)) return 'compact';
    return '';
  };

  const isOpenChatBriefEditInstruction = (prompt = '') => {
    const text = String(prompt || '').trim();
    if (!text || text.length > 240) return false;
    if (/[?？]|\b(what|how|why|can|do|does|is|are|where|when)\b/i.test(text)) return false;
    const editMarkers = /(対象|範囲|地域|国|期間|期限|納品|形式|フォーマット|Markdown|マークダウン|表|チェックリスト|キーワード|URL|競合|トーン|文体|文字数|除外|含め|追加|条件|前提|source|url|keyword|region|country|market|format|markdown|table|checklist|tone|length|exclude|include|constraint|assumption|competitor|deadline)/i;
    const lightEditShape = /(で|として|にして|を追加|も入れて|は|:|：)/i;
    return editMarkers.test(text) && lightEditShape.test(text) || isOpenChatAdditionalRequirementFollowup(text);
  };

  const buildOpenChatNoLoginAnswer = (prompt = '') => {
    const text = String(prompt || '').replace(/\s+/g, ' ').trim();
    if (!isOpenChatNoLoginPrompt(text)) return null;
    const ja = looksJapanese(prompt);
    return {
      kind: 'clarify',
      tone: 'info',
      suppressTrio: true,
      body: ja
        ? [
          'ログインなしでも、このチャットで相談、FAQ、発注ブリーフ作成まではできます。',
          '',
          'ただし、実際にagentへ仕事を送る、納品履歴の保存、API key発行にはログインが必要です。',
          '',
          'CAItはオープンソースなので利用はフリーです。ただしOpenAI/APIコストがかかるため、1アカウント月10ドルまでで止まります。',
          '',
          '今できること: 依頼内容をここで整理して、実行直前まで進める。実行する時だけGoogleログインに進む、という使い方ができます。'
        ].join('\n')
        : [
          'Without login, you can still use this chat for discussion, FAQs, and work-order preparation.',
          '',
          'Login is required only for sending real work to agents, saved delivery history, and API key issuance.',
          '',
          'CAIt is free to use because it is open source. OpenAI/API calls still cost money, so each account stops at $10 per month.',
          '',
          'A practical path: prepare the request here first, then sign in with Google only when you are ready to run it.'
        ].join('\n'),
      actions: [
        { action: 'connect_google', label: ja ? 'Googleでログインして開始' : 'SIGN IN AND START' }
      ],
      status: 'No-login path explained.\n\nNo order was created and no billing occurred.'
    };
  };

  const buildOpenChatExamplesAnswer = (prompt = '') => {
    const text = String(prompt || '').replace(/\s+/g, ' ').trim();
    if (!/(何を頼める|頼めること|依頼例|注文例|発注例|サンプル依頼|プロンプト例|examples?|sample prompts?|what can i order|what should i ask)/i.test(text)) return null;
    const ja = looksJapanese(prompt);
    return {
      kind: 'clarify',
      tone: 'info',
      suppressTrio: true,
      body: ja
        ? [
          '依頼例です。ここではまだ注文も課金も発生しません。',
          '',
          '1. 「このURLをSEO観点でレビューして、優先度付き改善案を表で出して」',
          '2. 「競合3社と比較して、価格・機能・訴求の違いをまとめて」',
          '3. 「このGitHub repoのREADMEと導入手順を改善して」',
          '4. 「Product Hunt投稿文を、開発者向けに3パターン作って」',
          '5. 「この長い要件を、実行しやすい発注文にブラッシュアップして」',
          '',
          '迷う場合は雑に書いてください。こちらで発注ブリーフに整えて、実行前に確認します。'
        ].join('\n')
        : [
          'Here are useful order examples. Nothing is ordered or billed here.',
          '',
          '1. “Review this URL for SEO and deliver prioritized fixes as a table.”',
          '2. “Compare these three competitors by pricing, features, and positioning.”',
          '3. “Improve this GitHub repo README and setup flow.”',
          '4. “Write three Product Hunt post variants for developers.”',
          '5. “Turn this rough requirement into an executable work order.”',
          '',
          'If unsure, write it roughly. I will turn it into a brief and pause for confirmation before execution.'
        ].join('\n'),
      status: 'Order examples shown.\n\nNo order was created and no billing occurred.'
    };
  };

  const buildOpenChatAcknowledgementAnswer = (prompt = '') => {
    const text = String(prompt || '').replace(/\s+/g, ' ').trim();
    if (!isOpenChatBenignNegativeReply(text)
      && !/^(ありがとう|ありがと|助かる|了解|りょうかい|わかりました|分かりました|ok|okay|thanks|thank you|got it)[!！。.\s]*$/i.test(text)) return null;
    if (isOpenChatRunConfirmation(text)) return null;
    const previousBrief = lastOpenChatPreparedBrief();
    const ja = looksJapanese(prompt) || looksJapanese(previousBrief);
    return {
      kind: 'clarify',
      tone: 'info',
      suppressTrio: true,
      body: ja
        ? [
          '了解です。ここでは実行も課金もしていません。',
          '',
          previousBrief
            ? '準備済みの発注ブリーフは残しています。実行するなら SEND ORDER、直すなら追加条件、別件なら「リセット」と送ってください。'
            : '次に、やりたい作業、質問、URL/Fileの追加、エージェント登録などをそのまま書いてください。'
        ].join('\n')
        : [
          'Got it. Nothing has run and nothing has been billed.',
          '',
          previousBrief
            ? 'The prepared brief is still available. Press SEND ORDER to run it, add constraints to revise it, or send “reset” for a new topic.'
            : 'Next, describe the work, ask a question, add URL/files, or ask about listing an agent.'
        ].join('\n'),
      nextPrompt: previousBrief || '',
      status: 'Acknowledgement handled.\n\nNo order was created and no billing occurred.'
    };
  };

  const buildOpenChatDirectResearchQuestionAnswer = (prompt = '', inputCounts = {}) => {
    const text = String(prompt || '').replace(/\s+/g, ' ').trim();
    if (!text || text.length > 280 || lastOpenChatPreparedBrief()) return null;
    if (openChatProductQuestionContext(text) || openChatCommandMode(text) || explicitOpenChatAssistMode(text)) return null;
    if (openChatLooksSensitiveSecret(text) || openChatLooksUnsafeRequest(text) || openChatLooksHighStakesAdvice(text)) return null;
    const directQuestion = /[?？]|\b(what|who|where|when|which|how much|how many|find)\b/i.test(text)
      || /(知りたい|調べたい|教えて|探して|いくら|価格|値段|最新|一番|最大|最安|おすすめ|相場|ランキング|どれ|どこ|いつ|誰|何)/i.test(text);
    if (!directQuestion) return null;
    const taskType = /(価格|値段|相場|いくら|pricing|price|cost|how much)/i.test(text) ? 'pricing' : 'research';
    const brief = catCompactDispatchBrief(text, taskType, inputCounts);
    const ja = looksJapanese(text);
    return {
      kind: 'assist',
      tone: 'ok',
      suppressTrio: true,
      body: ja
        ? [
          'これは直接回答が欲しい調査質問として受け取りました。',
          '',
          '正確性が必要な場合は、agentに調査として渡します。先に発注ブリーフに整えました。まだ注文も課金も発生しません。',
          '',
          '発注文:',
          brief,
          '',
          'このまま調査するなら SEND ORDER。軽く方向だけ相談したい場合は、追加条件や予算上限を書いてください。'
        ].join('\n')
        : [
          'I read this as a direct research question.',
          '',
          'For accurate answers, I will route it as agent research. I prepared the work brief first. No order or billing has happened.',
          '',
          'Work order:',
          brief,
          '',
          'Press SEND ORDER to run it, or add constraints/budget limits if you only want a lighter pass.'
        ].join('\n'),
      nextPrompt: brief,
      status: 'Direct research question prepared.\n\nNo order was created and no billing occurred.'
    };
  };

  const buildOpenChatRunConfirmationAnswer = (prompt = '') => {
    const previousBrief = lastOpenChatPreparedBrief();
    if (!previousBrief || !isOpenChatRunConfirmation(prompt)) return null;
    const ja = looksJapanese(prompt) || looksJapanese(previousBrief);
    return {
      kind: 'assist',
      tone: 'ok',
      body: ja
        ? [
          '確認しました。この内容で agent を走らせられます。',
          '',
          '準備済みのオーダー内容は裏側に保存しています。',
          '',
          '実行する場合は SEND ORDER を押してください。まだ直す場合は、追加条件をそのまま送ってください。'
        ].join('\n')
        : [
          'Confirmed. This is specific enough to run through an agent.',
          '',
          'I saved the prepared order behind the chat.',
          '',
          'To run it, press SEND ORDER. If it still needs changes, send the extra constraint here.'
        ].join('\n'),
      nextPrompt: previousBrief,
      status: 'Ready to run after confirmation.\n\nPress SEND ORDER to dispatch the prepared order.'
    };
  };

  const openChatLooksGeneralHelpPrompt = (prompt = '') => {
    const raw = String(prompt || '').replace(/\s+/g, ' ').trim();
    const text = openChatIntentMatchText(raw);
    if (!raw || raw.length > 96) return false;
    if (isStructuredOrderBrief(raw) || openChatLooksLowInfoTestPrompt(raw)) return false;
    return /^(help|help me|can you help|can you help me|what can you do|what do you do|what can you help with|what can i do here|what can i ask|what should i ask|where should i start|how do i start|how should i start)[?!.！。\s]*$/i.test(raw)
      || /^(ヘルプ|へるぷ|助けて|たすけて|何ができる|なにができる|何を頼める|なにを頼める|どう使う|使い方|何から始める|なにから始める|何から始めればいい|なにから始めればいい|どう始める)[?？!！。.\s]*$/i.test(raw)
      || /^(help|start|confused)(?:\s+(?:cait|ai agent|service))*$/i.test(text);
  };

  const buildOpenChatGeneralHelpAnswer = (prompt = '') => {
    if (!openChatLooksGeneralHelpPrompt(prompt)) return null;
    const ja = looksJapanese(prompt);
    const previousBrief = lastOpenChatPreparedBrief();
    return {
      kind: 'clarify',
      tone: 'info',
      patternId: 'pattern_general_help',
      suppressTrio: true,
      body: ja
        ? [
          'できます。ここではまず普通に相談して大丈夫です。',
          '',
          'よくある始め方:',
          '1. URLや文章を要約して',
          '2. AとBを比較して',
          '3. 投稿文や返信を作って',
          '4. エラー原因を整理して',
          '',
          'この画面は発注前提です。内容を発注ブリーフに整理して、SEND ORDER で実行します。'
        ].join('\n')
        : [
          'Yes. Start by describing what you want in normal words.',
          '',
          'Common starts:',
          '1. Summarize this URL or text',
          '2. Compare A and B',
          '3. Draft a post, reply, or email',
          '4. Triage an error',
          '',
          'This screen is for work orders. I turn the request into a work-order brief and only dispatch after SEND ORDER.'
        ].join('\n'),
      nextPrompt: previousBrief || '',
      status: 'Help answered in chat.\n\nNo order was created and no billing occurred.'
    };
  };

  const openChatLooksMarketingAgentListPrompt = (prompt = '') => {
    const raw = String(prompt || '').replace(/\s+/g, ' ').trim();
    const text = openChatIntentMatchText(raw);
    if (!raw || raw.length > 220) return false;
    if (isStructuredOrderBrief(raw) || openChatLooksGreetingPrompt(raw) || openChatLooksLowInfoTestPrompt(raw)) return false;
    const asksForList = /(一覧|リスト|見せて|教えて|ください|どれ|どんな|候補|おすすめ|探して|catalog|catalogue|list|show|browse|recommend|available|which)/i.test(text);
    const hasAgent = /(agent|agents|ai agent|エージェント|AIエージェント)/i.test(text);
    const hasMarketing = /(marketing|marketer|growth|go[-\s]?to[-\s]?market|gtm|launch|acquisition|lead gen|lead generation|outreach|seo|social|community|マーケ|マーケティング|集客|グロース|告知|ローンチ|SEO|SNS|ソーシャル|コミュニティ|リード獲得)/i.test(text);
    return Boolean(asksForList && hasAgent && hasMarketing);
  };

  const buildOpenChatMarketingAgentListAnswer = (prompt = '') => {
    if (!openChatLooksMarketingAgentListPrompt(prompt)) return null;
    const ja = looksJapanese(prompt);
    return {
      kind: 'quick',
      tone: 'info',
      patternId: 'pattern_marketing_agent_list',
      suppressTrio: true,
      actions: [
        { action: 'browse_agents', label: 'BROWSE AGENTS' },
        { action: 'use_agent_team', label: 'USE AGENT TEAM' }
      ],
      body: ja
        ? [
          'マーケティング系の agent 候補は登録済み agent manifest から選ばれます。',
          '',
          '- BROWSE AGENTS: 現在登録されている agent の task types、capabilities、manifest を確認します。',
          '- USE AGENT TEAM: CAIt が manifest と注文内容を照合して、必要な leader または specialist に渡します。',
          '- Send order 前なら、まだ実行も課金も発生しません。',
          '',
          '迷う場合は、対象サービス、目標、使いたいデータ、避けたい制約を書いてください。agent 固有の納品範囲や実行可否は各 manifest/provider contract に従います。'
        ].join('\n')
        : [
          'Marketing agent candidates come from registered agent manifests.',
          '',
          '- BROWSE AGENTS: inspect currently registered agent task types, capabilities, and manifests.',
          '- USE AGENT TEAM: CAIt matches the order against manifests and hands it to the relevant leader or specialist.',
          '- Before Send order, nothing has run and nothing has been billed.',
          '',
          'If unsure, describe the target service, goal, available data, and constraints. Agent-specific scope and execution claims come from each manifest/provider contract.'
        ].join('\n'),
      status: 'Marketing agent list answered in chat.\n\nNo order was created and no billing occurred.'
    };
  };

  const buildOpenChatLeaderCatalogAnswer = (prompt = '') => {
    if (!isLeaderCatalogQuestionIntentText(prompt)) return null;
    const ja = looksJapanese(prompt);
    return {
      kind: 'quick',
      tone: 'info',
      patternId: 'pattern_leader_catalog',
      suppressTrio: true,
      actions: [
        { action: 'browse_agents', label: 'BROWSE AGENTS' },
        { action: 'use_agent_team', label: 'USE AGENT TEAM' }
      ],
      body: ja
        ? [
          '利用できるリーダーは登録済みエージェントの manifest に従います。これは案内回答なので、まだ注文も課金も発生していません。',
          '',
          '- Team Leader: 複数エージェントの目的、根拠、順序、承認点、最終統合を管理する',
          '- Specialist: 単一領域の調査、実装、分析、文章化などを直接担当する',
          '- External/Sample Agent: manifest の task types、layer、capability に基づいて同じルールで扱われる',
          '',
          '迷う場合は、やりたい成果をそのまま書けば CAIt がリーダーか専門エージェントかを判断します。実行する場合だけ Send order を押してください。'
        ].join('\n')
        : [
          'Available leaders come from registered agent manifests. This is a chat answer, so no order or billing happened.',
          '',
          '- Team Leader: coordinates objective, evidence, order, approvals, and final merge across agents.',
          '- Specialist: handles a single concrete research, implementation, analysis, or writing lane.',
          '- External/Sample Agent: routed by the same manifest task types, layer, and capabilities.',
          '',
          'If you are unsure, describe the outcome you want and CAIt will choose a leader or specialist. Paid work only starts when you press Send order.'
        ].join('\n'),
      status: 'Leader catalog answered in chat.\n\nNo order was created and no billing occurred.'
    };
  };

  const openChatLooksRecurringWorkPrompt = (prompt = '') => {
    const raw = String(prompt || '').replace(/\s+/g, ' ').trim();
    const text = openChatIntentMatchText(raw);
    if (!raw || raw.length > 1200) return false;
    if (openChatLooksGreetingPrompt(raw) || openChatLooksLowInfoTestPrompt(raw)) return false;
    return /\b(schedule|scheduled|recurring|repeat|every day|daily|weekly|hourly|cron|monitor|watch|check every|run every)\b/i.test(text)
      || /(定期|毎日|毎週|毎時|スケジュール|くろん|クロン|cron|監視|モニタリング|繰り返し|定例|自動で|定期的)/i.test(text);
  };

  const buildOpenChatRecurringWorkAnswer = (prompt = '', inputCounts = {}) => {
    if (!openChatLooksRecurringWorkPrompt(prompt)) return null;
    const ja = looksJapanese(prompt);
    const taskType = inferClientTaskSequence('', prompt)[0] || 'automation';
    const sourceLine = inputCounts.urlCount || inputCounts.fileCount
      ? `Sources: ${inputCounts.urlCount || 0} URL(s), ${inputCounts.fileCount || 0} file(s)`
      : 'Sources: Written request only unless you add URLs/files before scheduling';
    const brief = [
      `Task: ${taskType}`,
      `Goal: ${prompt}`,
      'Schedule: recurring work. Use the Scheduled Work controls beside Chat History to choose daily, weekly, or hourly cadence.',
      `Inputs: ${sourceLine}`,
      'Execution: each scheduled run creates a normal CAIt order, uses the current balance at run time, and records delivery in Work history.',
      'Deliver: answer-first result, relevant sources or assumptions, and a reusable summary.',
      `Output language: ${ja ? 'Japanese' : 'English'}`,
      'Acceptance: run only when balance and routing are valid; if an agent cannot run, record the failure and keep the next scheduled run.'
    ].join('\n');
    return {
      kind: 'assist',
      tone: 'ok',
      patternId: 'pattern_recurring_work',
      nextPrompt: brief,
      body: ja
        ? [
          '定期実行の依頼として受け取りました。',
          '',
          'まず発注ブリーフに整理しました。下書きを確認して、左側の SCHEDULED ORDERS で頻度を選び、SCHEDULE DRAFT を押してください。',
          '',
          '重要: スケジュール作成時には課金しません。各実行タイミングで通常の注文として請求確認、ルーティング、予約を行います。',
          '',
          brief
        ].join('\n')
        : [
          'I read this as recurring work.',
          '',
          'I prepared a work-order brief. Review it, choose the cadence in SCHEDULED ORDERS beside Chat History, then press SCHEDULE DRAFT.',
          '',
          'Important: scheduling itself is not billed. Each run becomes a normal order at run time, so billing readiness, routing, and reservation still apply.',
          '',
          brief
        ].join('\n'),
      status: 'Recurring work draft prepared.\n\nNo order was created and no billing occurred. Use SCHEDULED ORDERS to save the schedule.'
    };
  };

  const buildOpenChatPaymentQuestionAnswer = (prompt = '') => {
    const raw = String(prompt || '').replace(/\s+/g, ' ').trim();
    if (!raw || raw.length > 260) return null;
    const text = openChatIntentMatchText(raw);
    const paymentContext = /(stripe|billing|payment|deposit|balance|checkout|refund|plan|invoice|課金|請求|支払|決済|デポジット|残高|返金|プラン|請求書)/i.test(text);
    const questionContext = /[?？]|(わから|分から|不明|教えて|どう|なに|何|とは|意味|できる|使い方|止ま|エラー|失敗|failed|error|how|what|why|where)/i.test(raw)
      || /(help|stuck|confused|unknown|explain|how|what|why)/i.test(text);
    if (!paymentContext || !questionContext) return null;
    const ja = looksJapanese(raw);
    return {
      kind: 'quick',
      tone: 'info',
      patternId: 'pattern_payment_question',
      body: ja
        ? [
          '支払い・請求まわりの質問として受け取りました。',
          '',
          temporaryInvoiceBillingEnabled
            ? '現在、外部決済の画面表示は一時的に隠しています。SETTINGS -> PAYMENTS の REQUEST INVOICE から請求書対応で進めます。'
            : '注文はカード登録後の月締め請求で支払えます。SETTINGS -> PAYMENTS からカード登録、プラン課金に進めます。',
          '',
          'FAQ回答や発注準備だけでは課金されません。実作業として送る場合だけ、見積もりと最大予約額を確認して SEND ORDER します。'
        ].join('\n')
        : [
          'I read this as a payment or balance question.',
          '',
          temporaryInvoiceBillingEnabled
            ? 'Hosted checkout is temporarily hidden. Use SETTINGS -> PAYMENTS -> REQUEST INVOICE for manual billing follow-up.'
            : 'Orders use saved-card month-end billing. Open SETTINGS -> PAYMENTS for card setup or plan billing.',
          '',
          'FAQ replies and order prep are not billed. Paid work only starts when you review the estimate and press SEND ORDER.'
        ].join('\n'),
      status: 'Payment question answered in chat.\n\nNo order was created and no billing occurred.'
    };
  };

  const openChatLooksLowInfoAmbiguousPrompt = (prompt = '', inputCounts = {}) => {
    const text = String(prompt || '').replace(/\s+/g, ' ').trim();
    const matchText = openChatIntentMatchText(text);
    if (!text || text.length > 72) return false;
    if (isStructuredOrderBrief(text) || openChatLooksLowInfoTestPrompt(text)) return false;
    if (openChatLooksGreetingPrompt(text)) return false;
    if (lastOpenChatPreparedBrief()) return false;
    const state = getState() || {};
    if (/^[0-9０-９]+$/.test(text) && (stateText('openChatNaturalChoiceIntent') || stateText('openChatVagueChoicePrompt') || (Array.isArray(state.openChatClarifyOptions) && state.openChatClarifyOptions.length))) return false;
    if (Number(inputCounts.urlCount || 0) || Number(inputCounts.fileCount || 0)) return false;
    if (/https?:\/\//i.test(text)) return false;
    if (/(CAIt|aiagent2|ai agent|agent|order|work|delivery|deposit|billing|payment|stripe|github|google|cli|api|payout|provider|manifest|verify|settings|エージェント|オーダー|注文|ワーク|納品|デポジット|残高|料金|課金|支払|お金|ログイン|登録|使い方|入金|出金|受け取り|マニフェスト|ベリファイ|検証|設定)/i.test(matchText)) return false;
    if (openChatNaturalConversationIntent(text, inputCounts)) return false;
    if (openChatAiBeginnerNaturalIntent(text, inputCounts) || openChatEngineerNaturalIntent(text, inputCounts)) return false;
    if (/^(reset|リセット|clear|クリア|start over|やり直し|back|戻る|copy brief|発注文をコピー|preview|納品プレビュー|status|状況|help|ヘルプ)[!！。.\s]*$/i.test(text)) return false;
    const hasActionOrQuestion = /[?？]|\b(compare|research|analy[sz]e|review|summari[sz]e|write|draft|create|build|fix|debug|find|explain|translate|improve|triage|check|tell|show|order)\b|(?:調査|比較|分析|レビュー|要約|作成|書いて|直して|修正|翻訳|改善|確認|教えて|調べ|知りたい|探して|説明|発注|注文|何|なに|どう|ですか|ますか|始めれば|すれば|いいですか|わからない|分からない)/i.test(matchText);
    if (hasActionOrQuestion) return false;
    const words = text.split(/\s+/).filter(Boolean);
    if (words.length <= 3) return true;
    return /^[\p{L}\p{N}\s._#@+-]{1,72}$/u.test(text) && !/[。！？!?、,;:]/.test(text);
  };

  const buildOpenChatLowInfoAmbiguousAnswer = (prompt = '', inputCounts = {}) => {
    if (!openChatLooksLowInfoAmbiguousPrompt(prompt, inputCounts)) return null;
    const ja = looksJapanese(prompt);
    const topic = compactChatText(String(prompt || '').replace(/\s+/g, ' '), 80);
    const bareTopic = openChatLooksBareTopicPrompt(prompt);
    return {
      kind: 'clarify',
      tone: 'info',
      patternId: 'pattern_low_info_ambiguous',
      naturalChoiceIntent: bareTopic ? 'natural_entity_exploration' : '',
      vagueChoicePrompt: bareTopic ? String(prompt || '').trim() : '',
      llmFallbackRecommended: bareTopic,
      llmFallbackReason: bareTopic ? 'bare_topic_disambiguation' : '',
      body: ja
        ? (bareTopic ? [
            `「${topic}」についてですね。`,
            '',
            'まだ「何をしたいか」が足りないので、Agentには渡しません。近い方向を選んでください。番号だけで大丈夫です。',
            '',
            `1. ${topic}の最新情報/価格/相場を調べる`,
            `2. ${topic}を比較・ランキング化する`,
            `3. ${topic}の売却/購入/価値判断をする`,
            '4. 背景、リスク、注意点を整理する',
            '',
            '必要なら意図をもう少し自然に分解します。まだ注文も課金も発生しません。'
          ] : [
            topic ? `「${topic}」だけだと、まだ作業内容を特定できません。` : 'まだ作業内容を特定できません。',
            '',
            'この入力だけではAgentには渡しません。',
            '',
            '次は、やりたい動作を1つ足してください。例:',
            '1. 調べて',
            '2. 比較して',
            '3. 要約して',
            '4. 投稿文を作って',
            '5. エラー原因を整理して',
            '',
            '例: 「ロレックスの最高価格を調べて、根拠URL付きで教えて」',
            '',
            'ここではまだ注文も課金も発生しません。'
          ]).join('\n')
        : (bareTopic ? [
            `You mentioned “${topic}”.`,
            '',
            'I still need the action before I turn it into a work brief. Choose the closest direction. A number is enough:',
            '',
            `1. Research current info, price, or market range for ${topic}`,
            `2. Compare or rank options around ${topic}`,
            `3. Evaluate buying, value, or procurement decisions for ${topic}`,
            '4. Summarize background, risks, and caveats',
            '',
            'If available, CAIt can use the pre-order LLM fallback to split this more naturally. No order or billing happens yet.'
          ] : [
            topic ? `“${topic}” is not enough to know the work you want yet.` : 'I do not have enough information to know the work you want yet.',
            '',
            'I will not turn this into an order brief.',
            '',
            'Add one action next. Examples:',
            '1. Research it',
            '2. Compare options',
            '3. Summarize it',
            '4. Draft a post',
            '5. Triage an error',
            '',
            'Example: “Research the highest Rolex price and include source URLs.”',
            '',
            'No order or billing happens here.'
          ]).join('\n'),
      status: 'Low-information message kept in chat.\n\nNo order was created and no billing occurred.'
    };
  };

  const quickOrderChatAnswer = (prompt = '', inputCounts = {}) => {
    const text = String(prompt || '').trim();
    if (!text) return null;
    const promptInjectionAnswer = buildOpenChatPromptInjectionAnswer(text);
    if (promptInjectionAnswer) return promptInjectionAnswer;
    const longPromptAnswer = buildOpenChatLongPromptGuardAnswer(text, inputCounts);
    if (longPromptAnswer) return longPromptAnswer;
    if (isStructuredOrderBrief(text)) return null;
    const compact = text.replace(/\s+/g, ' ').trim();
    const reusableToolsAnswer = buildOpenChatReusableToolsAnswer(compact);
    if (reusableToolsAnswer) return reusableToolsAnswer;
    const recoveredLeaderIntakeAnswer = buildOpenChatRecoveredLeaderIntakeAnswer(compact, inputCounts);
    if (recoveredLeaderIntakeAnswer) return recoveredLeaderIntakeAnswer;
    const leaderIntakeFollowupAnswer = buildOpenChatLeaderIntakeFollowupAnswer(compact, inputCounts);
    if (leaderIntakeFollowupAnswer) return leaderIntakeFollowupAnswer;
    const pendingQuestionFollowupAnswer = buildOpenChatPendingQuestionFollowupAnswer(compact, inputCounts);
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
    const generalHelpAnswer = buildOpenChatGeneralHelpAnswer(compact);
    if (generalHelpAnswer) return generalHelpAnswer;
    const leaderCatalogAnswer = buildOpenChatLeaderCatalogAnswer(compact);
    if (leaderCatalogAnswer) return leaderCatalogAnswer;
    const marketingAgentListAnswer = buildOpenChatMarketingAgentListAnswer(compact);
    if (marketingAgentListAnswer) return marketingAgentListAnswer;
    const recurringWorkAnswer = buildOpenChatRecurringWorkAnswer(compact, inputCounts);
    if (recurringWorkAnswer) return recurringWorkAnswer;
    const paymentQuestionAnswer = buildOpenChatPaymentQuestionAnswer(compact);
    if (paymentQuestionAnswer) return paymentQuestionAnswer;
    const leaderIntakeAnswer = buildOpenChatLeaderIntakeAnswer(compact, inputCounts);
    if (leaderIntakeAnswer) return leaderIntakeAnswer;
    const lowInfoAmbiguousAnswer = buildOpenChatLowInfoAmbiguousAnswer(compact, inputCounts);
    if (lowInfoAmbiguousAnswer) return lowInfoAmbiguousAnswer;
    const noLoginAnswer = buildOpenChatNoLoginAnswer(compact);
    if (noLoginAnswer) return noLoginAnswer;
    const repairAnswer = buildOpenChatRepairAnswer(compact);
    if (repairAnswer) return repairAnswer;
    const pauseAnswer = buildOpenChatPauseAnswer(compact);
    if (pauseAnswer) return pauseAnswer;
    const statusAnswer = buildOpenChatStatusAnswer(compact);
    if (statusAnswer) return statusAnswer;
    const timelineIntentChoiceAnswer = buildOpenChatTimelineIntentChoiceAnswer(compact);
    if (timelineIntentChoiceAnswer) return timelineIntentChoiceAnswer;
    const examplesAnswer = buildOpenChatExamplesAnswer(compact);
    if (examplesAnswer) return examplesAnswer;
    const runConfirmationAnswer = buildOpenChatRunConfirmationAnswer(compact);
    if (runConfirmationAnswer) return runConfirmationAnswer;
    const acknowledgementAnswer = buildOpenChatAcknowledgementAnswer(compact);
    if (acknowledgementAnswer) return acknowledgementAnswer;
    const ceoIdeaAnswer = buildOpenChatCeoIdeaAnswer(compact, inputCounts);
    if (ceoIdeaAnswer) return ceoIdeaAnswer;
    const commandAnswer = buildOpenChatCommandAnswer(compact);
    if (commandAnswer) return commandAnswer;
    const followupAnswer = buildOpenChatFollowupAnswer(compact, inputCounts);
    if (followupAnswer) return followupAnswer;
    const patternGuardAnswer = buildOpenChatPatternGuardAnswer(compact, inputCounts);
    if (patternGuardAnswer) return patternGuardAnswer;
    const naturalConversationAnswer = buildOpenChatNaturalConversationAnswer(compact, inputCounts);
    if (naturalConversationAnswer) return naturalConversationAnswer;
    const assistAnswer = buildOpenChatAssistAnswer(compact, inputCounts);
    if (assistAnswer) return assistAnswer;
    const intentShiftAnswer = buildOpenChatIntentShiftQuestion(compact, inputCounts);
    if (intentShiftAnswer) return intentShiftAnswer;
    const broadChoiceAnswer = buildOpenChatResearchOrNarrowChoice(compact, inputCounts);
    if (broadChoiceAnswer) return broadChoiceAnswer;
    const directResearchQuestionAnswer = buildOpenChatDirectResearchQuestionAnswer(compact, inputCounts);
    if (directResearchQuestionAnswer) return directResearchQuestionAnswer;
    if (Number(inputCounts.urlCount || 0) || Number(inputCounts.fileCount || 0)) return null;
    if (compact.length > 260) return null;
    const ja = looksJapanese(compact);
    const matchText = openChatIntentMatchText(compact);
    const hasQuestionShape = openChatLooksStandaloneQuestionText(compact);
    const productContext = /\b(cait|ca\s*it|aiagent2|ai agent2|ai agent marketplace|aim|agent|order|work|delivery|deposit|billing|payment|stripe|github|google|cli|api|payout|provider|manifest|verify|verification)\b/i.test(matchText)
      || /(CAIt|aiagent2|ai agent marketplace|エージェント|オーダー|注文|ワーク|納品|デポジット|残高|料金|課金|支払|ログイン|登録|使い方|できること|これは何|github|google|stripe|api|cli|入金|出金|受け取り|マニフェスト|ベリファイ|検証)/i.test(matchText);
    if (!hasQuestionShape || !productContext) return null;
    if (/(料金|課金|支払|デポジット|残高|プラン|billing|payment|deposit|balance|plan|stripe)/i.test(matchText)) {
      if (temporaryInvoiceBillingEnabled) {
        return ja
          ? `注文は ${PRODUCT_NAME} の月締め請求として扱います。現在、外部決済の画面表示は一時的に隠しているため、SETTINGS -> PAYMENTS の REQUEST INVOICE で請求書を依頼してください。FAQ回答や発注準備だけなら課金されません。`
          : `Orders use ${PRODUCT_NAME} month-end billing. Hosted checkout is temporarily hidden, so use SETTINGS -> PAYMENTS -> REQUEST INVOICE. Quick FAQ replies and order prep are not billed.`;
      }
      return ja
        ? `注文はカード登録後の月締め請求で支払えます。SETTINGS -> PAYMENTS からカード登録とプラン課金に進めます。FAQ回答や発注準備だけなら課金されません。実作業の注文時だけ、見積もりと最大予約額を確認して進みます。`
        : `Orders use saved-card month-end billing. Open SETTINGS -> PAYMENTS for card setup and plan billing. Quick FAQ replies and order prep are not billed. Paid work shows an estimate and max reserve before dispatch.`;
    }
    if (/(api key|apiキー|openai|anthropic|serp|model provider|モデル|プロバイダー|契約)/i.test(matchText)) {
      return ja
        ? `Built-in agent を使う場合、買い手側で OpenAI、Anthropic、検索APIなどを個別契約する必要はありません。CAIt内の決済、請求、サブスク、出金は削除されています。自分の外部システムから注文したい場合は SETTINGS で CAIt API key を発行します。`
        : `For managed sample agents, buyers do not need separate OpenAI, Anthropic, search, or model-provider API contracts. CAIt no longer processes payments, billing, subscriptions, or payouts in-app. External CLI/API/MCP access is coming soon.`;
    }
    if (/(github|git hub|agent.*登録|登録|publish|list|manifest|verify|verification|ベリファイ|検証|マニフェスト|公開)/i.test(matchText)) {
      return ja
        ? 'エージェントを公開する場合は GitHub 連携を使います。AGENTS で LIST YOUR AGENT を押し、repo 選択、manifest 生成、PR 作成、merge、import、verify の順で進めます。ORDER だけなら GitHub は不要です。'
        : 'Publishing an agent uses GitHub. Open AGENTS, choose LIST YOUR AGENT, select a repo, generate the manifest, create/merge the PR, import it, then verify. Ordering work does not require GitHub.';
    }
    if (/(稼|売上|収益|payout|provider|connect|withdraw|受け取り|出金|入金)/i.test(matchText)) {
      return ja
        ? 'CAItアプリ内の決済、請求、寄付受付、出金、提供者への支払いは削除されています。Stripe寄付リンクは将来候補ですが、目的・受取人・審査・贈与/寄付契約を確認するまで設置しません。'
        : 'CAIt no longer processes payments, billing, donation collection, withdrawals, or provider payouts in-app. A Stripe donation link is only a future option after recipient, purpose, compliance, and gift/donation agreement review.';
    }
    if (/(login|sign in|ログイン|google|github|アカウント|連携)/i.test(matchText)) {
      return ja
        ? 'Google ログインは注文と通常利用向けです。GitHub ログイン/連携はエージェント登録とrepo連携に使います。両方を同じアカウントに連携できます。'
        : 'Google login is for ordering and normal use. GitHub login/linking is for publishing agents and repo access. You can link both to the same account.';
    }
    if (/(delivery|納品|結果|ファイル|download|ダウンロード|source|sources|ソース)/i.test(matchText)) {
      return ja
        ? '納品は ORDER の DELIVERY に表示されます。完了後は要約、ファイル、入力ソース、実費、支払い内訳、フォローアップ導線を確認できます。必要に応じてファイルをダウンロードできます。'
        : 'Completed delivery appears in ORDER > DELIVERY. It can include summary, files, input sources, actual billing, funding breakdown, and follow-up actions. Files can be downloaded when provided.';
    }
    if (/(使い方|何ができる|できること|how.*use|what.*do|what.*is|これは何|aiagent2.*とは|ai agent marketplace|order.*how|send.*order)/i.test(matchText)) {
      return ja
        ? `${PRODUCT_NAME} は、AIエージェントに作業を注文して納品を受け取るための実行基盤です。ここに依頼内容を書くと、まず発注ブリーフに整理し、正式オーダー時にルーティング、支払い、納品を扱います。FAQならこのチャットで回答し、実作業なら SEND ORDER で注文します。`
        : `${PRODUCT_NAME} is a runtime for sending work to AI agents and receiving structured delivery. Write the outcome you want, and ${PRODUCT_NAME} first prepares an order brief, then handles routing, billing, and delivery on formal dispatch. FAQ replies stay in chat; paid work uses SEND ORDER.`;
    }
    return ja
      ? `${PRODUCT_NAME} についての簡単な質問として受け取りました。ここでは、使い方、料金、ログイン、GitHub連携、支払い、納品、提供者収益について答えられます。実作業を依頼したい場合は、欲しい成果物を具体的に書いて、まず発注ブリーフを作ってください。`
      : `I read this as a quick ${PRODUCT_NAME} question. I can answer usage, pricing, login, GitHub, payment, delivery, and provider payout questions here. To order paid work, describe the deliverable so I can prepare the order brief first.`;
  };

  return {
    explicitOpenChatAssistMode,
    isOpenChatAdditionalRequirementFollowup,
    isOpenChatBriefEditInstruction,
    openChatLooksGeneralHelpPrompt,
    buildOpenChatNoLoginAnswer,
    buildOpenChatExamplesAnswer,
    buildOpenChatAcknowledgementAnswer,
    buildOpenChatDirectResearchQuestionAnswer,
    buildOpenChatRunConfirmationAnswer,
    buildOpenChatGeneralHelpAnswer,
    buildOpenChatMarketingAgentListAnswer,
    buildOpenChatLeaderCatalogAnswer,
    buildOpenChatRecurringWorkAnswer,
    buildOpenChatPaymentQuestionAnswer,
    buildOpenChatLowInfoAmbiguousAnswer,
    quickOrderChatAnswer
  };
}
