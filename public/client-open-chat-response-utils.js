import { compactClientText as defaultCompactChatText } from './client-text-utils.js?v=20260521a';

function defaultLooksJapanese(value = '') {
  return /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(String(value || ''));
}

export function createClientOpenChatResponseUtils(options = {}) {
  const state = options.state || {};
  const compactChatText = typeof options.compactChatText === 'function'
    ? options.compactChatText
    : defaultCompactChatText;
  const getLastOpenChatPreparedBrief = typeof options.getLastOpenChatPreparedBrief === 'function'
    ? options.getLastOpenChatPreparedBrief
    : () => '';
  const isOpenChatClarificationAnswer = typeof options.isOpenChatClarificationAnswer === 'function'
    ? options.isOpenChatClarificationAnswer
    : () => false;
  const isOpenChatBriefEditInstruction = typeof options.isOpenChatBriefEditInstruction === 'function'
    ? options.isOpenChatBriefEditInstruction
    : () => false;
  const openChatIntentMatchText = typeof options.openChatIntentMatchText === 'function'
    ? options.openChatIntentMatchText
    : (value = '') => String(value || '').trim().toLowerCase();
  const isStructuredOrderBrief = typeof options.isStructuredOrderBrief === 'function'
    ? options.isStructuredOrderBrief
    : () => false;
  const structuredOrderBriefParts = typeof options.structuredOrderBriefParts === 'function'
    ? options.structuredOrderBriefParts
    : () => ({});
  const openChatConversationContextForLlm = typeof options.openChatConversationContextForLlm === 'function'
    ? options.openChatConversationContextForLlm
    : () => [];
  const chatAnswerKind = typeof options.chatAnswerKind === 'function'
    ? options.chatAnswerKind
    : () => '';
  const openChatReadiness = typeof options.openChatReadiness === 'function'
    ? options.openChatReadiness
    : () => ({ label: '', score: 0 });
  const orderRoutingDecision = typeof options.orderRoutingDecision === 'function'
    ? options.orderRoutingDecision
    : () => ({ strategy: 'single', plan: {}, reason: '' });
  const openChatDeliverableForTask = typeof options.openChatDeliverableForTask === 'function'
    ? options.openChatDeliverableForTask
    : () => '';
  const productShortName = String(options.productShortName || 'CAIt');

  function looksJapanese(value = '') {
    return defaultLooksJapanese(value);
  }

  function openChatFollowupMode(prompt = '') {
    const text = String(prompt || '').trim();
    if (!text || !getLastOpenChatPreparedBrief()) return '';
    if (isOpenChatClarificationAnswer(text)) return 'answers';
    if (/(短く|もっと短|圧縮|省トークン|compact|shorter|compress)/i.test(text)) return 'compact';
    if (/(安く|低コスト|費用抑え|浅め|軽め|最小|cheap|low cost|lower cost|budget|shallow|minimal|max \$|under \$)/i.test(text)) return 'cheap';
    if (/(要点|一言|一行|1行|ざっくり説明|今の内容|どんな発注|summary|summari[sz]e|one line|tl;dr|briefly explain)/i.test(text)) return 'explain';
    if (/(英語|英訳|english|英語寄り)/i.test(text)) return 'english';
    if (/(日本語|和訳|japanese|日本語に)/i.test(text)) return 'japanese';
    if (/(納品プレビュー|納品イメージ|納品形式|何が返る|何が納品|どう受け取|受け取り方|delivery preview|what will i get|deliverable preview|output preview|sample delivery)/i.test(text)) return 'delivery';
    if (/(分解|分けて|分ける|切って|タスク化|マルチ|分担|並列|split|break down|decompose|parallel|multi[- ]agent)/i.test(text)) return 'split';
    if (/(足りない|不足|抜け漏れ|確認|質問|ヒアリング|これで発注|発注していい|ready|missing|clarifying|question|dispatch)/i.test(text)) return 'review';
    if (isOpenChatBriefEditInstruction(text)) return 'edit';
    return '';
  }

  function isOpenChatRunConfirmation(prompt = '') {
    const text = String(prompt || '').replace(/\s+/g, ' ').trim();
    if (!text || !getLastOpenChatPreparedBrief()) return false;
    if (/(copy|restore|コピー|戻|入力欄|発注文|ブリーフ)/i.test(text)) return false;
    return /^(はい|はいお願いします|お願いします|お願い|進めて|進めてください|実行|実行して|走らせて|走らせる|これで|これでお願いします|これで実行|go|yes|yep|ok|okay|proceed|run it|run this|send it|send order|dispatch)$/i.test(text)
      || /(run|send|dispatch|proceed|実行|走らせ|送って|発注).{0,20}(please|now|して|お願いします|ください)?$/i.test(text);
  }

  function isOpenChatExplicitDispatchRequest(prompt = '') {
    const text = String(prompt || '').replace(/\s+/g, ' ').trim();
    if (!text) return false;
    if (/(copy|restore|コピー|戻|入力欄|発注文を戻|ブリーフを戻)/i.test(text)) return false;
    const workImperative = /(調査して|調べて|比較して|分析して|要約して|レビューして|改善して|修正して|直して|作って|書いて|投稿して|集客して|探して|まとめて|実装して|デバッグして|確認して|対応して|やって|お願いします|お願い|頼む|research|compare|analy[sz]e|summari[sz]e|review|improve|fix|debug|build|create|write|post|find|check|handle|do this|please do)/i.test(text);
    const questionOnly = /[?？]|\b(can|could|would|should|what|how|why|where|when)\b|ですか|ますか|でしょうか|どう思う|相談/i.test(text)
      && !/(発注|注文|実行|走らせ|送って|dispatch|order|run|execute)/i.test(text);
    return isOpenChatRunConfirmation(text)
      || /(発注したい|発注して|注文したい|注文して|オーダーしたい|オーダーして|実行したい|実行して|走らせて|この内容で発注|さっきの内容で発注|前の内容で発注|send order|dispatch|place order|order this|run this|proceed with order)/i.test(text)
      || (workImperative && !questionOnly);
  }

  function isOpenChatGenericProceed(prompt = '') {
    const text = String(prompt || '').replace(/\s+/g, ' ').trim();
    return /^(はい|はいお願いします|お願いします|お願い|進めて|進めてください|やって|やってください|頼む|go|yes|yep|ok|okay|please|proceed)$/i.test(text);
  }

  function openChatLooksStandaloneQuestionText(prompt = '') {
    const raw = String(prompt || '').trim();
    const text = openChatIntentMatchText(raw);
    if (!raw) return false;
    return /[?？]/.test(raw)
      || /^(?:what|how|why|can|do|does|is|are|where|when)\b/i.test(raw)
      || /(ですか|ますか|何|どう|なに|できますか|できる[?？か]|教えて|とは|使い方)/.test(raw)
      || /(?:料金|課金|支払|ログイン|登録).{0,18}(?:ですか|ますか|でき|教えて|方法|やり方|どう|何|なに|\?|\？)/i.test(raw)
      || /\b(?:help|start|confused|what|how)\b/i.test(text);
  }

  function openChatProductQuestionContext(prompt = '') {
    const raw = String(prompt || '').trim();
    const text = openChatIntentMatchText(raw);
    if (!text) return false;
    const productContext = /\b(cait|ca\s*it|aiagent2|ai agent2|ai agent marketplace|aim|agent marketplace|work chat|order|delivery|deposit|billing|payment|stripe|github|google|cli|api|payout|provider|manifest|verify|verification)\b/i.test(text)
      || /(CAIt|aiagent2|ai agent marketplace|エージェントマーケット|ワークチャット|オーダー|注文|納品|デポジット|残高|料金|課金|支払|ログイン|登録|使い方|github|google|stripe|api|cli|入金|出金|受け取り|マニフェスト|ベリファイ|検証)/i.test(text);
    return productContext && openChatLooksStandaloneQuestionText(raw);
  }

  function openChatDecisionBriefKey(brief = '') {
    const normalized = String(brief || '').replace(/\s+/g, ' ').trim();
    if (!isStructuredOrderBrief(normalized)) return '';
    let hash = 2166136261;
    for (let index = 0; index < normalized.length; index += 1) {
      hash ^= normalized.charCodeAt(index);
      hash = Math.imul(hash, 16777619) >>> 0;
    }
    return `${normalized.length}:${hash.toString(16)}`;
  }

  function isOpenChatDecisionSuppressedForBrief(brief = '') {
    const key = openChatDecisionBriefKey(brief);
    return Boolean(key && state.openChatDecisionSuppressedBriefKey === key);
  }

  function markOpenChatDecisionSuppressedForBrief(brief = '') {
    const key = openChatDecisionBriefKey(brief);
    if (key) state.openChatDecisionSuppressedBriefKey = key;
    state.openChatDecisionSuppressed = true;
  }

  function clearOpenChatDecisionSuppressionForNewBrief(brief = '') {
    const key = openChatDecisionBriefKey(brief);
    if (!key || key !== state.openChatDecisionSuppressedBriefKey) {
      state.openChatDecisionSuppressed = false;
      state.openChatDecisionSuppressedBriefKey = '';
    }
  }

  function openChatLocalUserConversationText(extra = '') {
    const rows = openChatConversationContextForLlm()
      .filter((row) => row.role === 'user')
      .map((row) => row.content)
      .filter(Boolean);
    const appended = String(extra || '').trim();
    if (appended) rows.push(appended);
    return [...new Set(rows)].join('\n').trim();
  }

  function openChatHasUncertaintyMarker(prompt = '') {
    const raw = String(prompt || '').replace(/\s+/g, ' ').trim();
    const text = openChatIntentMatchText(raw);
    return /(よくわから|わから|分から|不明|迷|どうすれば|どうしたら|何から|何をすれば|なんか|とりあえず|help|stuck|confused|not sure|do not know|don't know|where.*start|what should i)/i.test(raw)
      || /(unknown|confused|not sure|stuck|help|what should i|where start)/i.test(text);
  }

  function openChatMustUseLlmFallback(prompt = '', fallbackAnswer = null) {
    if (!fallbackAnswer) return false;
    const patternId = String(fallbackAnswer?.patternId || '').trim();
    const kind = chatAnswerKind(fallbackAnswer);
    if (!openChatHasUncertaintyMarker(prompt)) return false;
    if (patternId === 'pattern_leader_required_intake') return true;
    if (kind === 'clarify' && !['pattern_low_info_test', 'pattern_greeting', 'pattern_general_help'].includes(patternId)) return true;
    return false;
  }

  function withOpenChatResponseSource(answer = null, responseSource = 'local', detail = '') {
    if (!answer || typeof answer !== 'object') return answer;
    return {
      ...answer,
      responseSource,
      llmProvider: responseSource,
      fallbackDetail: String(detail || '').slice(0, 120)
    };
  }

  function openChatPreparedOrderActions(answerKind = '', nextPrompt = '') {
    const brief = String(nextPrompt || '').trim();
    if (answerKind !== 'assist' || !isStructuredOrderBrief(brief)) return [];
    return [];
  }

  function optimizedWorkOrderBrief(prompt = '', taskType = 'research', sourceCounts = {}) {
    const task = String(taskType || 'research').toLowerCase();
    const goal = compactChatText(String(prompt || '').replace(/\s+/g, ' '), 260)
      || 'Use the attached sources and infer the strongest deliverable.';
    const outputLanguage = looksJapanese(prompt) ? 'Japanese' : 'English';
    const deliverables = {
      code: 'Find the likely root cause, smallest safe fix path, PR/diff handoff when repo access exists, and tests to run.',
      debug: 'Identify failure conditions, reproduction steps, likely cause, fix path, and verification checks.',
      seo: 'Return search intent, content gaps, priority keywords, article briefs, and internal-link actions.',
      writing: 'Return a polished draft with target audience, structure, tone, constraints, and acceptance criteria.',
      listing: 'Return listing copy, pricing/positioning notes, SEO terms, risk flags, and publishing checklist.',
      pricing: 'Return tier recommendations, value metric, competitor assumptions, risks, and launch recommendation.',
      research: 'Return answer-first summary, comparison table, assumptions, sources when current information is needed, and recommendation.'
    };
    const sourceLine = Number(sourceCounts.urlCount || 0) || Number(sourceCounts.fileCount || 0)
      ? `Use ${Number(sourceCounts.urlCount || 0)} URL(s) and ${Number(sourceCounts.fileCount || 0)} file(s) as source material.`
      : 'Ask for sources only if they materially change the answer.';
    return [
      `${productShortName} will compact this into a runnable work order before dispatch:`,
      `Goal: ${goal}`,
      `Deliverable: ${deliverables[task] || deliverables.research}`,
      `Inputs: ${sourceLine}`,
      `Output language: ${outputLanguage}`,
      'Dispatch prep: split vague work when needed and use a compact English execution brief to reduce wasted tokens.',
      'Quality bar: answer first, state assumptions, separate facts from inference, and make the delivery reusable.'
    ].join('\n');
  }

  function openChatConfirmationPauseBlock(brief = '', taskType = 'research', sourceCounts = {}, config = {}) {
    const ja = config.ja ?? looksJapanese(brief);
    const parts = structuredOrderBriefParts(brief);
    const readiness = openChatReadiness(taskType, brief, sourceCounts);
    const estimate = compactChatText(config.estimate || '', 360);
    const status = compactChatText(config.status || '', 300);
    const routing = orderRoutingDecision(taskType, brief);
    const routeLine = routing.strategy === 'multi'
      ? `Agent Team (${routing.plan?.picks?.length || 0} agent runs)`
      : 'single-agent';
    const goal = parts.goal || compactChatText(String(brief || '').replace(/\s+/g, ' '), 220);
    const deliver = parts.deliver || openChatDeliverableForTask(taskType);
    const inputs = parts.inputs || (
      Number(sourceCounts.urlCount || 0) || Number(sourceCounts.fileCount || 0)
        ? `${Number(sourceCounts.urlCount || 0)} URL(s), ${Number(sourceCounts.fileCount || 0)} file(s), plus the written request.`
        : 'Written request only.'
    );
    if (ja) {
      return [
        '確認の一時停止です。まだ実行も課金もしていません。',
        '',
        `理解した目的: ${goal}`,
        `タスク: ${taskType}`,
        `実行形: ${routeLine}`,
        `入力: ${inputs}`,
        `納品: ${deliver}`,
        `準備度: ${readiness.label} (${readiness.score}/100)`,
        ...(estimate ? ['', estimate] : []),
        ...(status ? ['', status] : []),
        '',
        '次の操作は下のボタンから選んでください。'
      ].join('\n');
    }
    return [
      'Confirmation pause. Nothing has run and nothing has been billed yet.',
      '',
      `Understood outcome: ${goal}`,
      `Task: ${taskType}`,
      `Execution shape: ${routeLine}`,
      `Inputs: ${inputs}`,
      `Delivery: ${deliver}`,
      `Readiness: ${readiness.label} (${readiness.score}/100)`,
      ...(estimate ? ['', estimate] : []),
      ...(status ? ['', status] : []),
      '',
      'Choose the next action from the buttons below.'
    ].join('\n');
  }

  return {
    looksJapanese,
    openChatFollowupMode,
    isOpenChatRunConfirmation,
    isOpenChatExplicitDispatchRequest,
    isOpenChatGenericProceed,
    openChatLooksStandaloneQuestionText,
    openChatProductQuestionContext,
    openChatDecisionBriefKey,
    isOpenChatDecisionSuppressedForBrief,
    markOpenChatDecisionSuppressedForBrief,
    clearOpenChatDecisionSuppressionForNewBrief,
    openChatLocalUserConversationText,
    openChatHasUncertaintyMarker,
    openChatMustUseLlmFallback,
    withOpenChatResponseSource,
    openChatPreparedOrderActions,
    optimizedWorkOrderBrief,
    openChatConfirmationPauseBlock
  };
}
