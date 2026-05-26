import { compactClientText as compactChatText } from './client-text-utils.js?v=20260521a';

export function createClientOpenChatNaturalFlowUtils(options = {}) {
  const getState = typeof options.getState === 'function' ? options.getState : () => ({});
  const openChatIntentMatchText = typeof options.openChatIntentMatchText === 'function' ? options.openChatIntentMatchText : (value) => String(value || '').trim().toLowerCase();
  const isStructuredOrderBrief = typeof options.isStructuredOrderBrief === 'function' ? options.isStructuredOrderBrief : () => false;
  const explicitOpenChatAssistMode = typeof options.explicitOpenChatAssistMode === 'function' ? options.explicitOpenChatAssistMode : () => false;
  const openChatProductQuestionContext = typeof options.openChatProductQuestionContext === 'function' ? options.openChatProductQuestionContext : () => false;
  const openChatHasSpecificExecutionContext = typeof options.openChatHasSpecificExecutionContext === 'function' ? options.openChatHasSpecificExecutionContext : () => false;
  const looksJapanese = typeof options.looksJapanese === 'function' ? options.looksJapanese : () => false;
  const openChatPreorderDecisionCommand = typeof options.openChatPreorderDecisionCommand === 'function' ? options.openChatPreorderDecisionCommand : () => '';
  const composeOpenChatPreorderConfirmResponse = typeof options.composeOpenChatPreorderConfirmResponse === 'function' ? options.composeOpenChatPreorderConfirmResponse : () => null;
  const composeOpenChatPreorderReviseResponse = typeof options.composeOpenChatPreorderReviseResponse === 'function' ? options.composeOpenChatPreorderReviseResponse : () => null;
  const composeOpenChatPreorderCancelResponse = typeof options.composeOpenChatPreorderCancelResponse === 'function' ? options.composeOpenChatPreorderCancelResponse : () => null;
  const openChatCanonicalOrderTaskType = typeof options.openChatCanonicalOrderTaskType === 'function' ? options.openChatCanonicalOrderTaskType : () => '';
  const currentRoutingTask = typeof options.currentRoutingTask === 'function' ? options.currentRoutingTask : () => '';
  const inferClientTaskSequence = typeof options.inferClientTaskSequence === 'function' ? options.inferClientTaskSequence : () => [];
  const buildOpenChatDispatchBriefFromPendingAnswer = typeof options.buildOpenChatDispatchBriefFromPendingAnswer === 'function' ? options.buildOpenChatDispatchBriefFromPendingAnswer : () => '';
  const openChatHumanDispatchPreview = typeof options.openChatHumanDispatchPreview === 'function' ? options.openChatHumanDispatchPreview : () => '';
  const buildOpenChatNaturalChoiceBrief = typeof options.buildOpenChatNaturalChoiceBrief === 'function' ? options.buildOpenChatNaturalChoiceBrief : () => '';
  const openChatReadyToRunBlock = typeof options.openChatReadyToRunBlock === 'function' ? options.openChatReadyToRunBlock : () => '';
  const buildOpenChatVagueResearchBrief = typeof options.buildOpenChatVagueResearchBrief === 'function' ? options.buildOpenChatVagueResearchBrief : () => '';
  const openChatLooksGreetingPrompt = typeof options.openChatLooksGreetingPrompt === 'function' ? options.openChatLooksGreetingPrompt : () => false;
  const openChatLooksLowInfoTestPrompt = typeof options.openChatLooksLowInfoTestPrompt === 'function' ? options.openChatLooksLowInfoTestPrompt : () => false;
  const openChatCommandMode = typeof options.openChatCommandMode === 'function' ? options.openChatCommandMode : () => '';
  const shouldDeferOpenChatCommandForAnswer = typeof options.shouldDeferOpenChatCommandForAnswer === 'function' ? options.shouldDeferOpenChatCommandForAnswer : () => false;
  const lastOpenChatPreparedBrief = typeof options.lastOpenChatPreparedBrief === 'function' ? options.lastOpenChatPreparedBrief : () => '';
  const structuredOrderBriefParts = typeof options.structuredOrderBriefParts === 'function' ? options.structuredOrderBriefParts : () => ({});
  const isOpenChatClarificationAnswer = typeof options.isOpenChatClarificationAnswer === 'function' ? options.isOpenChatClarificationAnswer : () => false;
  const isOpenChatBriefEditInstruction = typeof options.isOpenChatBriefEditInstruction === 'function' ? options.isOpenChatBriefEditInstruction : () => false;
  const openChatFollowupMode = typeof options.openChatFollowupMode === 'function' ? options.openChatFollowupMode : () => '';
  const reviseStructuredBriefWithInstruction = typeof options.reviseStructuredBriefWithInstruction === 'function' ? options.reviseStructuredBriefWithInstruction : (brief) => brief;
  const catCompactDispatchBrief = typeof options.catCompactDispatchBrief === 'function' ? options.catCompactDispatchBrief : (value) => String(value || '');
  const openChatLooksSensitiveSecret = typeof options.openChatLooksSensitiveSecret === 'function' ? options.openChatLooksSensitiveSecret : () => false;
  const openChatLooksUnsafeRequest = typeof options.openChatLooksUnsafeRequest === 'function' ? options.openChatLooksUnsafeRequest : () => false;
  const openChatLooksHighStakesAdvice = typeof options.openChatLooksHighStakesAdvice === 'function' ? options.openChatLooksHighStakesAdvice : () => false;
  const openChatLastPromptWasOrderDecision = typeof options.openChatLastPromptWasOrderDecision === 'function' ? options.openChatLastPromptWasOrderDecision : () => false;
  const openChatPreviousUserMessageBody = typeof options.openChatPreviousUserMessageBody === 'function' ? options.openChatPreviousUserMessageBody : () => '';

  function stateText(key) {
    return String(getState()?.[key] || '').trim();
  }

  function isOpenChatVagueHighValueRequest(prompt = '', inputCounts = {}) {
    const raw = String(prompt || '').replace(/\s+/g, ' ').trim();
    const text = openChatIntentMatchText(raw);
    if (!raw || raw.length < 6) return false;
    if (isStructuredOrderBrief(raw)) return false;
    if (explicitOpenChatAssistMode(raw)) return false;
    if (openChatProductQuestionContext(raw)) return false;
    if (openChatHasSpecificExecutionContext(raw, inputCounts)) return false;
    const highValuePatterns = [
      /\b(want|need|make|earn|get|grow|increase).{0,35}(money|revenue|sales|customers|users|profit|income|growth)\b/i,
      /\b(make|build|create).{0,45}(app|application|product|saas|service).{0,70}(people|users|customers).{0,35}(want|use|pay|love|need)\b/i,
      /\b(good|successful|profitable|viral|popular).{0,35}(app|application|product|business|startup|service)\b/i,
      /\b(business|startup|app|application|product|saas|service).{0,25}(idea|ideas|opportunity|opportunities)\b/i,
      /\b(market|customer|user|audience|competitor).{0,25}(research|opportunity|validation|demand)\b/i,
      /(お金|収益|売上|利益|稼ぎ|儲け).{0,35}(増や|上げ|たい|ほしい|欲しい|作|出したい|伸ば)/,
      /(売れる|使われる|欲しがられる|儲かる|稼げる|伸びる).{0,25}(アプリ|サービス|プロダクト|事業|ビジネス)/,
      /(ビジネス|事業|アプリ|サービス|プロダクト|起業).{0,16}(案|アイデア|ネタ|機会|チャンス)/,
      /(市場|ユーザー|顧客|需要|競合).{0,16}(調査|リサーチ|探|検証)/
    ];
    return highValuePatterns.some((pattern) => pattern.test(text));
  }

  function openChatVagueChoiceMode(prompt = '') {
    const raw = String(prompt || '').replace(/\s+/g, ' ').trim();
    const matchText = openChatIntentMatchText(raw);
    if (!raw || !stateText('openChatVagueChoicePrompt')) return '';
    if (/^(1|research|research options first|research first|do research|market research|リサーチ|調査|まずリサーチ|選択肢をリサーチ|まず選択肢をリサーチ)$/i.test(raw)
      || /(research|market research|調査|リサーチ).{0,20}(first|先|まず|して)/i.test(matchText)) return 'research';
    if (/^(2|narrow|narrow it|i will narrow it|i'll narrow it|specific|give details|具体化|自分で具体化|具体的にする|絞る|絞ります)$/i.test(raw)
      || /(narrow|specific|details|具体化|具体的|絞).{0,24}(する|します|first|myself|自分)/i.test(matchText)) return 'narrow';
    return '';
  }

  function openChatNaturalChoiceMode(prompt = '') {
    const raw = String(prompt || '').normalize('NFKC').replace(/\s+/g, ' ').trim();
    const choice = raw.replace(/^[#\s]+/, '').replace(/[.．。、):：\s]+$/g, '');
    const matchText = openChatIntentMatchText(raw);
    const intent = stateText('openChatNaturalChoiceIntent');
    const original = stateText('openChatVagueChoicePrompt');
    if (!raw || !intent || !original) return '';
    if (intent === 'natural_ai_beginner_start') {
      if (/^(1|examples?|例|できること|サンプル)$/i.test(choice)) return 'beginner_examples';
      if (/^(2|organize|整理|困りごと|一緒に整理)$/i.test(choice)) return 'beginner_organize';
      if (/^(3|question|ask|質問|チャット|注文しない)$/i.test(choice)) return 'beginner_chat_only';
    }
    if (intent === 'natural_ai_beginner_examples') {
      if (/^(1|summary|summari[sz]e|要約)$/i.test(choice)) return 'beginner_summary';
      if (/^(2|compare|comparison|比較)$/i.test(choice)) return 'beginner_compare';
      if (/^(3|writing|write|draft|文章|返信|投稿|メール)$/i.test(choice)) return 'beginner_writing';
      if (/^(4|improve|improvement|改善|改善点)$/i.test(choice)) return 'beginner_improve';
      if (/^(5|debug|bug|error|エラー|不具合)$/i.test(choice)) return 'beginner_debug';
    }
    if (/^(0|diagnose|diagnosis|audit|overall|全体診断|診断|まず診断|全体を見る|全体を見たい)$/i.test(choice)) return 'diagnose';
    if (/^(1|research|research first|リサーチ|調査|まず調査|まずリサーチ)$/i.test(choice)) return intent === 'natural_business_growth' ? 'traffic' : 'research';
    if (/^(2|narrow|source|paste|post|lp|具体化|自分で具体化|貼る|投稿文|LP|スクショ)$/i.test(choice)) {
      if (intent === 'natural_business_growth') return 'conversion';
      if (intent === 'natural_marketing_launch') return 'source';
      return 'narrow';
    }
    if (/^(3|retention|churn|継続|解約|定着)$/i.test(choice) && intent === 'natural_business_growth') return 'retention';
    if (/(traffic|acquisition|流入|集客)/i.test(matchText) && intent === 'natural_business_growth') return 'traffic';
    if (/(conversion|cvr|signup|purchase|登録|購入|転換|コンバージョン)/i.test(matchText) && intent === 'natural_business_growth') return 'conversion';
    if (/(retention|churn|継続|解約|定着)/i.test(matchText) && intent === 'natural_business_growth') return 'retention';
    if (/(research|channel|distribution|投稿先|チャネル|拡散|調査|リサーチ)/i.test(matchText) && intent === 'natural_marketing_launch') return 'research';
    if (/(post|copy|lp|screenshot|source|投稿文|本文|LP|スクショ|貼る|添削)/i.test(matchText) && intent === 'natural_marketing_launch') return 'source';
    if (intent === 'natural_entity_exploration') {
      if (/^(1|price|pricing|market|range|current|latest|highest|most expensive|相場|価格|値段|最新|最高|一番)$/i.test(choice)) return 'entity_price';
      if (/^(2|compare|rank|ranking|options|比較|ランキング|候補)$/i.test(choice)) return 'entity_compare';
      if (/^(3|buy|value|valuation|worth|購入|価値|査定)$/i.test(choice)) return 'entity_value';
      if (/^(4|background|risk|caveat|summary|背景|リスク|注意点|概要)$/i.test(choice)) return 'entity_background';
    }
    if (/(narrow|specific|details|具体化|具体的|絞)/i.test(matchText)) return 'narrow';
    return '';
  }

  function openChatLooksLikeNaturalChoiceDetails(prompt = '') {
    const text = String(prompt || '').replace(/\s+/g, ' ').trim();
    if (!text || text.length < 18) return false;
    if (/https?:\/\//i.test(text)) return true;
    const hasNumberedAnswers = /(?:^|\s)(?:1|１)[\).．、:：]\s*\S+/.test(text) && /(?:^|\s)(?:2|２)[\).．、:：]\s*\S+/.test(text);
    const hasBusinessContext = /(対象|ユーザー|顧客|商材|商品|サービス|URL|広告費|予算|媒体|投稿|納品|成果物|エンジニア|一般ユーザー|使ってほしい|集客|売上|登録|購入|問い合わせ|audience|customer|product|service|budget|channel|deliverable|signup|purchase|lead)/i.test(text);
    return hasNumberedAnswers || hasBusinessContext;
  }

  function openChatNaturalIntentLabel(intent = '', prompt = '', ja = false) {
    const commerce = /(shopify|e-?commerce|online store|store|cart|checkout|product page|ecサイト|ネットショップ|通販|カート|チェックアウト|商品ページ)/i.test(String(prompt || ''));
    const labels = {
      natural_ai_beginner_start: ja ? 'AIで何ができるかを知りたい' : 'learn what AI/agents can do',
      natural_ai_beginner_examples: ja ? '最初に試せる依頼例を知りたい' : 'find easy first examples',
      natural_stuck_start: ja ? '何を頼めばよいか相談したい' : 'figure out what to ask for',
      natural_idea_discovery: ja ? '需要がありそうな案を見つけたい' : 'find demand-shaped ideas',
      natural_business_growth: commerce ? (ja ? 'EC/Shopifyの売上を伸ばしたい' : 'grow an ecommerce or Shopify store') : (ja ? '売上/集客/転換率を改善したい' : 'improve growth, acquisition, or conversion'),
      natural_marketing_launch: ja ? 'ローンチ/投稿/集客を改善したい' : 'improve launch or distribution performance',
      natural_entity_exploration: ja ? '単語だけの対象を調査・比較・価値判断に分けたい' : 'turn a bare topic into research, comparison, or value work',
      natural_compare_decision: ja ? '比較して意思決定したい' : 'compare options and decide',
      natural_content_help: ja ? '文章や投稿を改善したい' : 'draft or improve content',
      natural_build_help: ja ? '開発/不具合/実装を整理したい' : 'triage build, bug, or implementation work',
      natural_agent_publish: ja ? '自分のAI agentを公開したい' : 'publish an AI agent'
    };
    return labels[intent] || (ja ? '目的を整理したい' : 'clarify the user goal');
  }

  function openChatNaturalChoiceLabel(mode = '', ja = false) {
    const labels = {
      diagnose: ja ? '全体診断' : 'overall diagnosis',
      traffic: ja ? '流入/集客' : 'traffic/acquisition',
      conversion: ja ? '購入/登録への転換' : 'conversion',
      retention: ja ? '継続/リピート' : 'retention',
      research: ja ? 'リサーチして候補出し' : 'research options first',
      narrow: ja ? '条件を絞って具体化' : 'narrow with known details',
      source: ja ? '素材を貼って改善' : 'improve pasted source material',
      entity_price: ja ? '最新情報/価格/相場調査' : 'current info / price research',
      entity_compare: ja ? '比較/ランキング' : 'comparison / ranking',
      entity_value: ja ? '購入/価値判断' : 'buying / value decision',
      entity_background: ja ? '背景/リスク/注意点整理' : 'background / risks / caveats'
    };
    return labels[mode] || String(mode || (ja ? '未選択' : 'unselected'));
  }

  function buildOpenChatNaturalChoiceFollowup(prompt = '', inputCounts = {}) {
    const mode = openChatNaturalChoiceMode(prompt);
    const original = stateText('openChatVagueChoicePrompt') || openChatPreviousUserMessageBody();
    const intent = stateText('openChatNaturalChoiceIntent') || (openChatLastPromptWasOrderDecision() ? 'natural_business_growth' : '');
    if (!original || !intent) return null;
    const ja = looksJapanese(prompt) || looksJapanese(original);
    const decisionCommand = openChatPreorderDecisionCommand(prompt);
    if (decisionCommand === 'confirm_preorder_order') return composeOpenChatPreorderConfirmResponse(original, prompt, inputCounts);
    if (decisionCommand === 'revise_preorder_order') return composeOpenChatPreorderReviseResponse(original, intent, ja);
    if (decisionCommand === 'cancel_preorder_order') return composeOpenChatPreorderCancelResponse(ja);
    if (!mode && openChatLooksLikeNaturalChoiceDetails(prompt)) {
      const taskType = intent === 'natural_business_growth' || intent === 'natural_marketing_launch'
        ? (openChatCanonicalOrderTaskType('', `${original}\n${prompt}`) || currentRoutingTask() || 'growth')
        : (openChatCanonicalOrderTaskType(inferClientTaskSequence('', `${original}\n${prompt}`)[0], `${original}\n${prompt}`) || 'research');
      const brief = buildOpenChatDispatchBriefFromPendingAnswer(original, prompt, taskType, inputCounts);
      const previewBlock = openChatHumanDispatchPreview(brief, taskType, `${original}\n${prompt}`, inputCounts);
      return {
        kind: 'assist',
        tone: 'ok',
        patternId: 'pattern_natural_choice_details',
        nextPrompt: brief,
        clearVagueChoice: true,
        clearNaturalChoice: true,
        clearClarifyOptions: true,
        body: ja
          ? ['追加情報を受け取りました。番号選択だけでなく、具体条件として反映します。', '', previewBlock, '', '次の操作は下のボタンから選んでください。'].join('\n')
          : ['I received the extra details. I will treat them as concrete order context, not just a numbered choice.', '', previewBlock, '', 'Choose the next action from the buttons below.'].join('\n'),
        status: 'Natural-language details converted to a dispatch preview.\n\nNo order was created and no billing occurred.'
      };
    }
    if (!mode) return null;
    if (mode === 'source' || mode === 'narrow') {
      return {
        kind: 'clarify',
        tone: 'info',
        body: ja
          ? ['では、先に材料を具体化しましょう。まだ注文も課金も発生しません。', '', intent === 'natural_marketing_launch' ? '次のうち、あるものだけ貼ってください: 投稿文、LP/URL、スクショ、狙ったユーザー、反応数、どこに投稿したか。' : '次のうち2-3個だけ入れてください: 対象ユーザー、商品/サービス、今の課題、URL、数値、競合、予算、期限。', '', 'それをもとに、具体的な発注ブリーフに整理します。'].join('\n')
          : ['Okay. Let us add concrete material first. No order or billing happens yet.', '', intent === 'natural_marketing_launch' ? 'Paste any of these: post copy, landing page/URL, screenshot, target user, response metrics, and where you posted it.' : 'Send 2-3 of these: target user, product/service, current problem, URL, numbers, competitors, budget, or deadline.', '', 'Then I will turn it into a concrete work brief.'].join('\n'),
        clearVagueChoice: true,
        clearNaturalChoice: true,
        clearClarifyOptions: true,
        status: 'Waiting for concrete source material.\n\nNo order was created and no billing occurred.'
      };
    }
    const brief = buildOpenChatNaturalChoiceBrief(original, intent, mode, inputCounts);
    const intentLabel = openChatNaturalIntentLabel(intent, original, ja);
    const choiceLabel = openChatNaturalChoiceLabel(mode, ja);
    return {
      kind: 'assist',
      tone: 'ok',
      body: ja
        ? ['Agentに渡せる内容に整理しました。これはまだ注文ではなく、課金も発生しません。', '', `確認した意図: ${intentLabel}`, `絞り込み結果: ${choiceLabel}`, '', mode === 'diagnose' ? 'まず全体診断として、ボトルネック仮説と次の実験を出す形にします。' : `選択された方向: ${mode}`, '', '発注文:', brief, '', openChatReadyToRunBlock(true), '', '次の動き: 入力欄にこの発注文を入れました。内容を確認し、実行する場合だけログインして SEND ORDER してください。'].join('\n')
        : ['I organized this so it can be handed to the right agent. This is still chat only; no order was created and no billing occurred.', '', `Confirmed intent: ${intentLabel}`, `Narrowed direction: ${choiceLabel}`, '', mode === 'diagnose' ? 'I will treat this as an overall diagnosis and ask the agent to surface bottleneck hypotheses and next experiments.' : `Selected direction: ${mode}`, '', 'Work order:', brief, '', openChatReadyToRunBlock(false), '', 'Next: I put this brief back into the input box. Review it, then sign in and press SEND ORDER only when you want paid work to run.'].join('\n'),
      nextPrompt: brief,
      clearVagueChoice: true,
      clearNaturalChoice: true,
      clearClarifyOptions: true,
      status: 'Context-specific work order prepared.\n\nNo order was created and no billing occurred.'
    };
  }

  function buildOpenChatVagueChoiceFollowup(prompt = '', inputCounts = {}) {
    const mode = openChatVagueChoiceMode(prompt);
    const original = stateText('openChatVagueChoicePrompt');
    if (!mode || !original) return null;
    const ja = looksJapanese(prompt) || looksJapanese(original);
    if (mode === 'research') {
      const brief = buildOpenChatVagueResearchBrief(original, inputCounts);
      return {
        kind: 'assist',
        tone: 'ok',
        body: ja
          ? ['リサーチ前提でAgentに渡せる内容に整理しました。これはまだ注文ではなく、課金も発生しません。', '', '市場調査は通常のチャット回答よりトークン/API使用量が増える可能性があります。実行する前に見積もりと最大予約額を確認してください。', '', 'リサーチ用発注文:', brief, '', openChatReadyToRunBlock(true), '', '次の動き: 入力欄にこの発注文を入れました。内容を確認し、実行する場合だけログインして SEND ORDER してください。'].join('\n')
          : ['I converted this into a research-first work order. This is still chat only; no order was created and no billing occurred.', '', 'Market research can use more tokens/API calls than a simple chat answer. Review the estimate and max reserve before dispatch.', '', 'Research work order:', brief, '', openChatReadyToRunBlock(false), '', 'Next: I put this brief back into the input box. Review it, then sign in and press SEND ORDER only when you want paid research to run.'].join('\n'),
        nextPrompt: brief,
        clearVagueChoice: true,
        status: 'Research-first order brief prepared.\n\nNo order was created and no billing occurred. Review the estimate before paid dispatch.'
      };
    }
    return {
      kind: 'clarify',
      tone: 'info',
      body: ja
        ? ['では、先に具体化しましょう。まだ注文も課金も発生しません。', '', '次のうち2-3個だけ入れてください。', '1. 誰向けか', '2. 業界またはジャンル', '3. 解決したい課題', '4. 既存のURL、リポジトリ、商品、競合', '5. 予算、期限、避けたいこと', '', 'それをもとに、より絞った安めのOrderブリーフに整理します。'].join('\n')
        : ['Okay. Let us narrow it before any paid work. No order or billing happens yet.', '', 'Send 2-3 of these:', '1. Target user', '2. Industry or app category', '3. Problem to solve', '4. Existing URL, repo, product, or competitors', '5. Budget, deadline, or constraints', '', 'Then I will turn it into a more focused and usually cheaper order brief.'].join('\n'),
      clearVagueChoice: true,
      clearClarifyOptions: true,
      status: 'Waiting for narrower inputs.\n\nNo order was created and no billing occurred.'
    };
  }

  function openChatIntentShiftChoiceMode(prompt = '') {
    const text = String(prompt || '').replace(/\s+/g, ' ').trim();
    if (!text || !stateText('openChatIntentShiftPrompt')) return '';
    if (/^(1|update|update current|merge|add to current|current|same draft|same order|今のdraft|今のドラフト|今の発注文|更新|統合|追加|1\.?\s*更新)$/i.test(text) || /(update|merge|add|current|same|今の|現在|更新|統合|追加).{0,24}(draft|order|brief|発注文|ドラフト)/i.test(text)) return 'update';
    if (/^(2|new|new draft|new order|rebuild|start over|separate|別件|新規|作り直し|新しく|2\.?\s*新規)$/i.test(text) || /(new|rebuild|start over|separate|別件|新規|新しく|作り直).{0,24}(draft|order|brief|発注文|ドラフト)?/i.test(text)) return 'new';
    return '';
  }

  function openChatIntentShiftImplicitMode(prompt = '') {
    const text = String(prompt || '').replace(/\s+/g, ' ').trim();
    if (!text) return '';
    if (openChatLooksGreetingPrompt(text) || openChatLooksLowInfoTestPrompt(text)) return '';
    if (openChatCommandMode(text) || shouldDeferOpenChatCommandForAnswer(text)) return '';
    if (/(update|merge|add to current|same draft|same order|今の|現在|更新|統合|追加)/i.test(text)) return 'update';
    if (/(new task|new request|new draft|new order|different task|different request|separate|別件|新規|別の依頼|別の作業|新しく|作り直し)/i.test(text)) return 'new';
    if (text.length >= 12) return 'new';
    return '';
  }

  function isOpenChatPossibleIntentShift(prompt = '', inputCounts = {}) {
    const text = String(prompt || '').trim();
    const previousBrief = lastOpenChatPreparedBrief();
    if (!previousBrief || !text || isStructuredOrderBrief(text)) return false;
    if (text.length < 18 && !Number(inputCounts.urlCount || 0) && !Number(inputCounts.fileCount || 0)) return false;
    if (openChatIntentShiftChoiceMode(text)) return false;
    if (openChatCommandMode(text) || explicitOpenChatAssistMode(text)) return false;
    if (isOpenChatClarificationAnswer(text) || isOpenChatBriefEditInstruction(text) || openChatFollowupMode(text)) return false;
    if (openChatProductQuestionContext(text)) return false;
    const previous = structuredOrderBriefParts(previousBrief);
    const previousGoal = String(previous.goal || '').toLowerCase();
    const nextTask = inferClientTaskSequence('', text)[0] || '';
    const previousTask = String(previous.taskType || '').toLowerCase();
    const actionLike = /(作|調査|比較|分析|改善|レビュー|書い|作成|実装|探|まとめ|翻訳|稼|売上|伸ば|build|make|create|research|compare|analyze|review|write|improve|debug|fix|translate|grow|sell|launch)/i.test(text);
    const sharedWords = text.toLowerCase().split(/\W+/).filter((word) => word.length >= 4 && previousGoal.includes(word)).length;
    if (nextTask && previousTask && nextTask !== previousTask && actionLike) return true;
    return actionLike && text.length >= 48 && sharedWords < 2;
  }

  function buildOpenChatIntentShiftFollowup(prompt = '', inputCounts = {}) {
    const explicitMode = openChatIntentShiftChoiceMode(prompt);
    const implicitMode = explicitMode ? '' : openChatIntentShiftImplicitMode(prompt);
    const mode = explicitMode || implicitMode;
    const original = stateText('openChatIntentShiftPrompt');
    const previousBrief = lastOpenChatPreparedBrief();
    if (!mode || !original || !previousBrief) return null;
    const ja = looksJapanese(prompt) || looksJapanese(original);
    if (mode === 'update') {
      const nextBrief = reviseStructuredBriefWithInstruction(previousBrief, original);
      return {
        kind: 'assist',
        tone: 'ok',
        clearIntentShift: true,
        body: ja
          ? ['今のdraftに反映しました。まだ注文も課金も発生しません。', '', '更新後の発注文:', nextBrief, '', '内容が合っていれば SEND ORDER。違う場合はさらに条件を足してください。'].join('\n')
          : ['I merged this into the current draft. Nothing has run or been billed yet.', '', 'Updated draft order:', nextBrief, '', 'If this matches, press SEND ORDER. Otherwise add another correction.'].join('\n'),
        nextPrompt: nextBrief,
        status: 'Draft updated. Ready for SEND ORDER.'
      };
    }
    const appended = explicitMode ? original : compactChatText(`${original}\n${String(prompt || '').trim()}`, 1800);
    const taskType = inferClientTaskSequence('', appended)[0] || inferClientTaskSequence('', original)[0] || currentRoutingTask() || 'research';
    const nextBrief = catCompactDispatchBrief(appended, taskType, inputCounts);
    return {
      kind: 'assist',
      tone: 'ok',
      clearIntentShift: true,
      body: ja
        ? [explicitMode ? '別件として新しいdraftを作りました。まだ注文も課金も発生していません。' : '別件として受け取り、新しいdraftにまとめました。まだ注文も課金も発生していません。', '', '新しい発注文:', nextBrief, '', '内容が合っていれば SEND ORDER。違う場合は条件を足してください。'].join('\n')
        : [explicitMode ? 'I rebuilt this as a new draft. Nothing has run or been billed yet.' : 'I treated this as a separate request and turned it into a new draft. Nothing has run or been billed yet.', '', 'New draft order:', nextBrief, '', 'If this matches, press SEND ORDER. Otherwise add constraints.'].join('\n'),
      nextPrompt: nextBrief,
      status: 'New draft ready for SEND ORDER.'
    };
  }

  function buildOpenChatIntentShiftQuestion(prompt = '', inputCounts = {}) {
    const text = String(prompt || '').trim();
    if (!isOpenChatPossibleIntentShift(text, inputCounts)) return null;
    const previousBrief = lastOpenChatPreparedBrief();
    const previous = structuredOrderBriefParts(previousBrief);
    const nextTask = inferClientTaskSequence('', text)[0] || currentRoutingTask() || 'research';
    const ja = looksJapanese(text);
    return {
      kind: 'clarify',
      tone: 'warn',
      intentShiftPrompt: text,
      clearClarifyOptions: true,
      body: ja
        ? ['今のdraftとは別件に見えます。', '', `現在のdraft: ${previous.taskType || 'research'} / ${compactChatText(previous.goal || previousBrief, 150)}`, `新しい入力: ${nextTask} / ${compactChatText(text, 150)}`, '', 'このまま続けるなら、どちらかで返してください。', '1. 今のdraftを更新する', '2. 別件として新しいdraftを作り直す', '', 'そのまま追加条件を書いてくれれば、別件として新しいdraftにまとめることもできます。'].join('\n')
        : ['This looks separate from the current draft.', '', `Current draft: ${previous.taskType || 'research'} / ${compactChatText(previous.goal || previousBrief, 150)}`, `New input: ${nextTask} / ${compactChatText(text, 150)}`, '', 'Reply with one of these if you want to choose explicitly:', '1. Update the current draft', '2. Rebuild as a new draft order', '', 'Or just send the new details and I will treat it as a separate draft.'].join('\n'),
      status: 'Possible topic shift detected.'
    };
  }

  function buildOpenChatResearchOrNarrowChoice(prompt = '', inputCounts = {}) {
    const text = String(prompt || '').replace(/\s+/g, ' ').trim();
    if (!isOpenChatVagueHighValueRequest(text, inputCounts)) return null;
    const ja = looksJapanese(text);
    return {
      kind: 'clarify',
      tone: 'warn',
      vagueChoicePrompt: text,
      clearClarifyOptions: true,
      body: ja
        ? ['できます。今の内容だと「いきなり実行」より、先に方向を決めた方が外しにくいです。', '', '進め方は2つです。番号だけでも大丈夫です。', '', '1. まず選択肢をリサーチ', '広めに調査して、有望な方向性を複数出します。通常のチャット回答よりトークン/API使用量が増える可能性があるため、実行前に見積もりを表示します。', '', '2. 自分で具体化', 'ターゲットユーザー、業界、アプリのジャンル、解決したい課題、URL、リポジトリ、制約などを教えてください。より絞った安めのOrderにできます。', '', '「1」または「リサーチ」、もしくは「2」または「具体化」と返してください。まだ注文も課金も発生しません。'].join('\n')
        : ['Yes. At this level, it is better to choose the direction before executing anything.', '', 'Two good paths. A number is enough:', '', '1. Research options first', 'I can research promising directions and give you options to choose from. This may use more tokens/API calls than a simple chat answer, so I will show estimated cost/time before running it.', '', '2. Narrow it yourself first', 'Tell me the target user, industry, app category, problem, URL, repo, product, or constraints. Then I can prepare a more focused and usually cheaper order.', '', 'Reply with “1” / “Research options first” or “2” / “I will narrow it”. No order or billing happens yet.'].join('\n'),
      status: 'Choose research or narrow scope.\n\nNo order was created and no billing occurred.'
    };
  }

  function openChatNaturalConversationIntent(prompt = '', inputCounts = {}) {
    const raw = String(prompt || '').replace(/\s+/g, ' ').trim();
    const text = openChatIntentMatchText(raw);
    if (!raw || isStructuredOrderBrief(raw)) return '';
    if (Number(inputCounts.urlCount || 0) || Number(inputCounts.fileCount || 0)) return '';
    if (/(料金|課金|支払|デポジット|残高|billing|payment|deposit|balance|stripe|cost|price|budget|見積|費用|予算)/i.test(text)) return '';
    if (openChatProductQuestionContext(raw) || explicitOpenChatAssistMode(raw)) return '';
    if (openChatLooksSensitiveSecret(raw) || openChatLooksUnsafeRequest(raw) || openChatLooksHighStakesAdvice(raw)) return '';
    if (/^(compare|research|analy[sz]e|review|summari[sz]e|write|create|build|fix|debug|調査|比較|分析|レビュー|要約|作成|実装|修正)\b/i.test(text) && raw.split(/\s+/).filter(Boolean).length >= 5) return '';
    if (/(product hunt|indie hackers|reddit|hacker news|x\.com|twitter|ツイート|投稿|ローンチ|公開|拡散|launch|marketing|distribution|posting)/i.test(text)) return 'natural_marketing_launch';
    if (/(売上|集客|CVR|コンバージョン|登録|サインアップ|流入|アクセス|反応|ユーザー|顧客|解約|継続率|sales|customers|conversion|cvr|traffic|signups|retention|churn|growth)/i.test(text)) return 'natural_business_growth';
    if (isOpenChatVagueHighValueRequest(raw, inputCounts) || /(もっとお金|金が欲しい|稼ぎたい|儲けたい|売れる.*作|使われる.*作|良い.*アプリ|いい.*アプリ|more money|make money|profitable idea|good app|app people want|people want to use)/i.test(text)) return 'natural_idea_discovery';
    if (/(どっち|どれ|比較|選ぶ|選べ|迷って|A\/B|ab test|compare|which|choose|better option|versus|vs\.)/i.test(text)) return 'natural_compare_decision';
    if (/(返信|返事|コメント|投稿文|ツイート|メール|文章|コピー|LP|見出し|reply|comment|post|tweet|email|copy|headline|landing page)/i.test(text)) return 'natural_content_help';
    if (/(エラー|バグ|動かない|実装|コード|github|repo|repository|api|deploy|デプロイ|build|bug|error|code|app|website|web app|script)/i.test(text)) return 'natural_build_help';
    if (/(エージェント|agent).{0,24}(売|稼|登録|公開|作|出したい|publish|list|marketplace|earn)/i.test(text)) return 'natural_agent_publish';
    if (/(どこから|何から|なにから|何すれば|何を入力|なにを入力|何を打|なにを打|何て書|なんて書|どうすれば|どうしよう|わからない|分からない|迷って|迷う|困って|詰ま|反応ない|うまくいかない|stuck|not sure|confused|where.*start|what should i do|what should i type|what do i type|don't know|do not know)/i.test(text)) return 'natural_stuck_start';
    return '';
  }

  function resolveOpenChatNaturalConversationAnswer(prompt = '', inputCounts = {}) {
    const text = String(prompt || '').replace(/\s+/g, ' ').trim();
    const intent = openChatNaturalConversationIntent(text, inputCounts);
    if (!intent) return null;
    const ja = looksJapanese(text);
    return {
      kind: 'clarify',
      tone: 'info',
      patternId: intent,
      vagueChoicePrompt: ['natural_stuck_start', 'natural_idea_discovery', 'natural_business_growth', 'natural_marketing_launch', 'natural_ai_beginner_start', 'natural_ai_beginner_examples'].includes(intent) ? text : '',
      naturalChoiceIntent: ['natural_stuck_start', 'natural_idea_discovery', 'natural_business_growth', 'natural_marketing_launch', 'natural_ai_beginner_start', 'natural_ai_beginner_examples'].includes(intent) ? intent : '',
      clearClarifyOptions: true,
      body: (ja
        ? [`こう受け取りました: ${openChatNaturalIntentLabel(intent, text, true)}`, 'Agentに渡す前に、近い方向を選んでください。番号だけでも大丈夫です。']
        : [`I read this as: ${openChatNaturalIntentLabel(intent, text, false)}`, 'Before handing this to an agent, choose the closest direction. A number is enough.']).join('\n\n'),
      status: ja ? '方向を整理しました。番号か短い補足で続けてください。' : 'Direction clarified. Reply with a number or a short follow-up.'
    };
  }

  return {
    isOpenChatVagueHighValueRequest,
    openChatNaturalIntentLabel,
    buildOpenChatIntentShiftFollowup,
    buildOpenChatNaturalChoiceFollowup,
    buildOpenChatVagueChoiceFollowup,
    buildOpenChatIntentShiftQuestion,
    buildOpenChatResearchOrNarrowChoice,
    openChatNaturalConversationIntent,
    buildOpenChatNaturalConversationAnswer: resolveOpenChatNaturalConversationAnswer
  };
}
