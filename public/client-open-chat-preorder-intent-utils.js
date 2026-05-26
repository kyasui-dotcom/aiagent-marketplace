import { compactClientText as compactChatText } from './client-text-utils.js?v=20260521a';

const PREORDER_INTENT_LLM_PATTERNS = new Set([
  'natural_business_growth',
  'natural_idea_discovery',
  'natural_marketing_launch',
  'natural_entity_exploration',
  'natural_stuck_start'
]);

export function createClientOpenChatPreorderIntentUtils(options = {}) {
  const looksJapanese = typeof options.looksJapanese === 'function' ? options.looksJapanese : () => false;
  const openChatLocalUserConversationText = typeof options.openChatLocalUserConversationText === 'function'
    ? options.openChatLocalUserConversationText
    : () => '';
  const openChatPreviousAgentMessageBody = typeof options.openChatPreviousAgentMessageBody === 'function'
    ? options.openChatPreviousAgentMessageBody
    : () => '';
  const lastOpenChatPreparedBrief = typeof options.lastOpenChatPreparedBrief === 'function'
    ? options.lastOpenChatPreparedBrief
    : () => '';
  const isStructuredOrderBrief = typeof options.isStructuredOrderBrief === 'function'
    ? options.isStructuredOrderBrief
    : () => false;
  const structuredOrderBriefParts = typeof options.structuredOrderBriefParts === 'function'
    ? options.structuredOrderBriefParts
    : () => ({});
  const openChatCanonicalOrderTaskType = typeof options.openChatCanonicalOrderTaskType === 'function'
    ? options.openChatCanonicalOrderTaskType
    : (taskType) => taskType;
  const inferClientTaskSequence = typeof options.inferClientTaskSequence === 'function'
    ? options.inferClientTaskSequence
    : () => [];
  const currentRoutingTask = typeof options.currentRoutingTask === 'function'
    ? options.currentRoutingTask
    : () => '';
  const catCompactDispatchBrief = typeof options.catCompactDispatchBrief === 'function'
    ? options.catCompactDispatchBrief
    : (brief) => brief;
  const rewriteStructuredBriefTaskType = typeof options.rewriteStructuredBriefTaskType === 'function'
    ? options.rewriteStructuredBriefTaskType
    : (brief) => brief;
  const openChatHumanDispatchPreview = typeof options.openChatHumanDispatchPreview === 'function'
    ? options.openChatHumanDispatchPreview
    : () => '';
  const openChatNaturalIntentLabel = typeof options.openChatNaturalIntentLabel === 'function'
    ? options.openChatNaturalIntentLabel
    : (intent) => intent;
  const openChatPreorderClarifyOptions = typeof options.openChatPreorderClarifyOptions === 'function'
    ? options.openChatPreorderClarifyOptions
    : () => [];
  const openChatLooksPreorderIntentLlmCandidate = typeof options.openChatLooksPreorderIntentLlmCandidate === 'function'
    ? options.openChatLooksPreorderIntentLlmCandidate
    : () => false;
  const startOpenChatThinking = typeof options.startOpenChatThinking === 'function'
    ? options.startOpenChatThinking
    : () => null;
  const stopOpenChatThinking = typeof options.stopOpenChatThinking === 'function'
    ? options.stopOpenChatThinking
    : () => {};
  const getSnapshot = typeof options.getSnapshot === 'function'
    ? options.getSnapshot
    : () => ({});
  const openChatConversationContextForLlm = typeof options.openChatConversationContextForLlm === 'function'
    ? options.openChatConversationContextForLlm
    : () => '';
  const trackConversionEvent = typeof options.trackConversionEvent === 'function'
    ? options.trackConversionEvent
    : () => {};
  const openChatServerLeaderIntakeGuardAnswer = typeof options.openChatServerLeaderIntakeGuardAnswer === 'function'
    ? options.openChatServerLeaderIntakeGuardAnswer
    : async () => null;

  function openChatPreorderDefaultOptionLines(intent = '', ja = false, prompt = '') {
    const commerce = /(shopify|e-?commerce|online store|store|cart|checkout|product page|ecサイト|ネットショップ|通販|カート|チェックアウト|商品ページ)/i.test(String(prompt || ''));
    if (intent === 'natural_business_growth') {
      if (commerce) {
        return ja
          ? ['0. ストア全体を診断する', '1. 購入意欲のある流入が少ない', '2. 商品ページは見られるが購入/カート/決済まで進まない', '3. リピート購入やメール/CRMが弱い']
          : ['0. Diagnose the whole store funnel first', '1. Not enough qualified traffic', '2. Product pages get visits, but people do not buy, add to cart, or complete checkout', '3. Repeat purchase, email/CRM, or retention is weak'];
      }
      return ja
        ? ['0. まず全体診断する', '1. 流入が少ないのか', '2. 見られているが登録/購入されないのか', '3. 登録後に使われないのか']
        : ['0. Diagnose the whole funnel first', '1. Not enough traffic', '2. People visit but do not sign up or buy', '3. People sign up but do not keep using it'];
    }
    if (intent === 'natural_idea_discovery') {
      return ja
        ? ['1. 市場/需要をリサーチして候補を出す', '2. ジャンルや得意領域を先に教えて、狭く案出しする']
        : ['1. Research market/demand and generate options', '2. Tell me your preferred niche or strengths and narrow the ideas first'];
    }
    if (intent === 'natural_marketing_launch') {
      return ja
        ? ['1. 投稿先と反応を見て、どこを改善すべきか調査する', '2. 実際の投稿文、LP、スクショを貼って、表現と導線を直す']
        : ['1. Review channels and response signals to decide what to improve', '2. Paste the actual post, landing page, or screenshot and improve the message/CTA'];
    }
    if (intent === 'natural_entity_exploration') {
      const topic = compactChatText(String(prompt || '').replace(/\s+/g, ' '), 80);
      return ja
        ? [`1. ${topic || 'この対象'}の最新情報/価格/相場を調べる`, `2. ${topic || 'この対象'}を比較・ランキング化する`, `3. ${topic || 'この対象'}の購入/価値判断をする`, '4. 背景、リスク、注意点を整理する']
        : [`1. Research current info, price, or market range for ${topic || 'this topic'}`, `2. Compare or rank options around ${topic || 'this topic'}`, `3. Evaluate buying, value, or procurement decisions for ${topic || 'this topic'}`, '4. Summarize background, risks, and caveats'];
    }
    return ja
      ? ['1. 選択肢をリサーチしてから決める', '2. いま分かっている条件を使って、依頼文を具体化する']
      : ['1. Research options first, then choose', '2. Use what you already know and turn it into a concrete request'];
  }

  function preorderIntentLlmAnswerFromResult(prompt = '', result = {}, fallbackAnswer = null) {
    if (!result?.ok) return null;
    const languageContext = [
      prompt,
      openChatLocalUserConversationText(''),
      openChatPreviousAgentMessageBody(),
      result.intent_label,
      result.summary,
      result.narrowing_question
    ].filter(Boolean).join('\n');
    const ja = looksJapanese(languageContext);
    const rawBrief = String(result.order_brief || result.orderBrief || '').trim();
    const action = String(result.action || '').trim();
    if (action === 'answer_in_chat') {
      const chatAnswer = compactChatText(String(result.chat_answer || result.chatAnswer || result.summary || result.narrowing_question || ''), 1400);
      return {
        kind: 'quick',
        tone: 'info',
        patternId: 'pattern_openai_chat_answer',
        responseSource: result.source === 'openai' ? 'openai' : (result.source || 'llm'),
        llmProvider: result.source || 'openai',
        suppressTrio: true,
        body: chatAnswer || (ja
          ? 'ここでは発注せず、チャットとして扱いました。続けて相談できます。'
          : 'I treated this as chat, not an order. You can keep discussing it here.'),
        status: 'Answered in chat with OpenAI.\n\nNo order was created and no billing occurred.'
      };
    }
    const previousBrief = lastOpenChatPreparedBrief();
    const orderContext = `${prompt}\n${rawBrief}\n${previousBrief}`;
    const rawTaskType = isStructuredOrderBrief(rawBrief)
      ? structuredOrderBriefParts(rawBrief).taskType
      : String(result.task_type || result.taskType || '');
    const canonicalTaskType = openChatCanonicalOrderTaskType(rawTaskType, orderContext)
      || openChatCanonicalOrderTaskType(inferClientTaskSequence('', orderContext)[0], orderContext)
      || openChatCanonicalOrderTaskType(currentRoutingTask(), orderContext)
      || 'research';
    const coercedBrief = rawBrief && ['prepare_order', 'use_previous_brief'].includes(action) && !isStructuredOrderBrief(rawBrief)
      ? catCompactDispatchBrief(rawBrief, canonicalTaskType, {}, { maxGoalLength: 900, outputLanguage: ja ? 'Japanese' : 'English' })
      : '';
    const candidatePreparedBrief = isStructuredOrderBrief(rawBrief)
      ? rawBrief
      : (isStructuredOrderBrief(coercedBrief)
        ? coercedBrief
        : (['prepare_order', 'use_previous_brief'].includes(action) && isStructuredOrderBrief(previousBrief)
          ? previousBrief
          : ''));
    const preparedBrief = isStructuredOrderBrief(candidatePreparedBrief)
      ? rewriteStructuredBriefTaskType(candidatePreparedBrief, canonicalTaskType)
      : '';
    if (preparedBrief) {
      const taskType = openChatCanonicalOrderTaskType(structuredOrderBriefParts(preparedBrief).taskType, preparedBrief)
        || canonicalTaskType
        || 'research';
      const finalPreparedBrief = rewriteStructuredBriefTaskType(preparedBrief, taskType);
      return {
        kind: 'assist',
        tone: 'ok',
        patternId: 'pattern_openai_order_brief',
        responseSource: result.source === 'openai' ? 'openai' : (result.source || 'llm'),
        llmProvider: result.source || 'openai',
        suppressTrio: true,
        nextPrompt: finalPreparedBrief,
        clearPinnedAgent: true,
        clearLeaderIntake: true,
        clearClarifyOptions: true,
        body: ja
          ? [
              '会話履歴を踏まえて、OpenAIで発注内容をブラッシュアップしました。まだ実行も課金もしていません。',
              '',
              openChatHumanDispatchPreview(finalPreparedBrief, taskType, `${prompt}\n${finalPreparedBrief}`, {}),
              '',
              '次の操作は下のボタンから選んでください。'
            ].join('\n')
          : [
              'I used the chat history and OpenAI to polish this into an order-ready brief. Nothing has run or been billed yet.',
              '',
              openChatHumanDispatchPreview(finalPreparedBrief, taskType, `${prompt}\n${finalPreparedBrief}`, {}),
              '',
              'Choose the next action from the buttons below.'
            ].join('\n'),
        status: 'OpenAI-polished order brief ready.\n\nReview the summary, then press SEND ORDER.'
      };
    }
    const fallbackIntent = String(fallbackAnswer?.naturalChoiceIntent || fallbackAnswer?.patternId || '').trim();
    const naturalChoiceIntent = PREORDER_INTENT_LLM_PATTERNS.has(String(result.intent || '').trim())
      ? String(result.intent || '').trim()
      : fallbackIntent;
    if (!PREORDER_INTENT_LLM_PATTERNS.has(naturalChoiceIntent)) return null;
    const rawLabel = compactChatText(String(result.intent_label || ''), 120);
    const label = /^[a-z][a-z0-9_ -]{2,}$/i.test(rawLabel) && /_/.test(rawLabel)
      ? openChatNaturalIntentLabel(naturalChoiceIntent, prompt, ja)
      : (rawLabel || openChatNaturalIntentLabel(naturalChoiceIntent, prompt, ja));
    const summary = compactChatText(String(result.summary || ''), 260);
    const question = compactChatText(String(result.narrowing_question || ''), 180);
    const preorderDecisionOptions = openChatPreorderClarifyOptions(result.options || [], ja);
    const optionLines = preorderDecisionOptions.length
      ? []
      : (Array.isArray(result.options) && result.options.length
        ? result.options.map((option, index) => `${index + 1}. ${compactChatText(option.label || option.description || '', 120)}`).filter((line) => !/^\d+\.\s*$/.test(line))
        : openChatPreorderDefaultOptionLines(naturalChoiceIntent, ja, prompt));
    return {
      kind: 'clarify',
      tone: 'info',
      patternId: 'pattern_preorder_llm_intent',
      responseSource: result.source === 'openai' ? 'openai' : (result.source || 'llm'),
      llmProvider: result.source || 'openai',
      suppressTrio: true,
      vagueChoicePrompt: String(prompt || '').trim(),
      naturalChoiceIntent,
      clearClarifyOptions: !preorderDecisionOptions.length,
      options: preorderDecisionOptions.length ? preorderDecisionOptions : undefined,
      body: ja
        ? [
            `こう受け取りました: ${label}`,
            preorderDecisionOptions.length
              ? 'Agentに渡す前に、下のボタンから次の操作を選んでください。'
              : 'Agentに渡す前に、近い方向を選んでください。番号だけでも大丈夫です。',
            '',
            summary || '目的入力として受け取りました。',
            question || 'まずどの方向で絞りますか？',
            '',
            ...optionLines,
            '',
            '曖昧な目的を整理しました。まだ注文も課金も発生しません。'
          ].join('\n')
        : [
            `I read this as: ${label}`,
            preorderDecisionOptions.length
              ? 'Before handing this to an agent, choose the next action from the buttons below.'
              : 'Before handing this to an agent, choose the closest direction. A number is enough.',
            '',
            summary || 'I read this as a goal-level request.',
            question || 'Which direction should we narrow first?',
            '',
            ...optionLines,
            '',
            'CAIt clarified the intent. No order or billing happens yet.'
          ].join('\n'),
      status: 'Pre-order intent check.\n\nNo order was created and no billing occurred.'
    };
  }

  async function requestOpenChatPreorderIntentResolution(prompt = '', inputCounts = {}, fallbackAnswer = null, options = {}) {
    if (!options.force && !openChatLooksPreorderIntentLlmCandidate(prompt, inputCounts, fallbackAnswer)) return null;
    const telemetry = options.telemetry && typeof options.telemetry === 'object' ? options.telemetry : null;
    if (telemetry) {
      telemetry.attempted = true;
      telemetry.provider = 'openai';
    }
    const thinkingMessageId = startOpenChatThinking(prompt);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 20000);
    try {
      const headers = new Headers({ 'content-type': 'application/json' });
      const snapshot = getSnapshot();
      if (snapshot?.auth?.csrfToken) headers.set('x-aiagent2-csrf', snapshot.auth.csrfToken);
      const response = await fetch('/api/open-chat/intent', {
        method: 'POST',
        headers,
        credentials: 'same-origin',
        signal: controller.signal,
        body: JSON.stringify({
          prompt,
          fallback_intent: fallbackAnswer?.naturalChoiceIntent || fallbackAnswer?.patternId || '',
          prepared_brief: options.preparedBrief || fallbackAnswer?.nextPrompt || lastOpenChatPreparedBrief() || '',
          conversation_context: openChatConversationContextForLlm(),
          desired_output: 'If this is not an order request, answer in chat with action=answer_in_chat. If enough context exists for an order, return a polished CAIt order brief in order_brief. Otherwise ask one clarifying question.',
          user_language: looksJapanese(prompt) ? 'Japanese' : 'English',
          input_counts: {
            url_count: Number(inputCounts.urlCount || 0),
            file_count: Number(inputCounts.fileCount || 0),
            file_chars: Number(inputCounts.fileChars || 0)
          }
        })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (telemetry) {
          telemetry.ok = false;
          telemetry.error = String(result?.error || response.status || 'failed').slice(0, 120);
          telemetry.source = result?.source || 'openai';
        }
        void trackConversionEvent('open_chat_intent_failed', {
          source: 'work_chat',
          llmProvider: result?.source || 'openai',
          status: String(result?.error || response.status || 'failed').slice(0, 60),
          promptChars: String(prompt || '').length
        });
        return null;
      }
      const serverLeaderGuardAnswer = await openChatServerLeaderIntakeGuardAnswer(prompt, result, fallbackAnswer, inputCounts);
      const answer = serverLeaderGuardAnswer || preorderIntentLlmAnswerFromResult(prompt, result, fallbackAnswer);
      if (telemetry) {
        telemetry.ok = Boolean(answer);
        telemetry.error = answer ? '' : 'openai_returned_unusable_intent';
        telemetry.source = result.source || 'openai';
        telemetry.intent = result.intent || '';
      }
      if (answer) {
        void trackConversionEvent('open_chat_intent_classified', {
          source: 'work_chat',
          llmProvider: result.source || 'openai',
          intent: result.intent || answer.naturalChoiceIntent || '',
          status: answer.patternId || 'pattern_preorder_llm_intent',
          promptChars: String(prompt || '').length,
          confidence: Math.round(Number(result.confidence || 0) * 100)
        });
      }
      return answer;
    } catch {
      if (telemetry) {
        telemetry.ok = false;
        telemetry.error = 'client_error';
        telemetry.source = 'openai';
      }
      void trackConversionEvent('open_chat_intent_failed', {
        source: 'work_chat',
        llmProvider: 'openai',
        status: 'client_error',
        promptChars: String(prompt || '').length
      });
      return null;
    } finally {
      window.clearTimeout(timeout);
      stopOpenChatThinking(thinkingMessageId);
    }
  }

  return {
    requestOpenChatPreorderIntentResolution
  };
}
