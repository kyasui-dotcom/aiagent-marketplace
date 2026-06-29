import { compactClientText as compactChatText } from './client-text-utils.js?v=20260521a';

export function createClientOpenChatLocalAnswerUtils(options = {}) {
  const getState = typeof options.getState === 'function' ? options.getState : () => ({});
  const looksJapanese = typeof options.looksJapanese === 'function' ? options.looksJapanese : () => false;
  const normalizeOpenChatIntentText = typeof options.normalizeOpenChatIntentText === 'function'
    ? options.normalizeOpenChatIntentText
    : (value) => String(value || '').trim().toLowerCase();
  const isStructuredOrderBrief = typeof options.isStructuredOrderBrief === 'function' ? options.isStructuredOrderBrief : () => false;
  const openChatProductQuestionContext = typeof options.openChatProductQuestionContext === 'function' ? options.openChatProductQuestionContext : () => false;
  const explicitOpenChatAssistMode = typeof options.explicitOpenChatAssistMode === 'function' ? options.explicitOpenChatAssistMode : () => '';
  const openChatLooksSensitiveSecret = typeof options.openChatLooksSensitiveSecret === 'function' ? options.openChatLooksSensitiveSecret : () => false;
  const openChatLooksUnsafeRequest = typeof options.openChatLooksUnsafeRequest === 'function' ? options.openChatLooksUnsafeRequest : () => false;
  const openChatLooksHighStakesAdvice = typeof options.openChatLooksHighStakesAdvice === 'function' ? options.openChatLooksHighStakesAdvice : () => false;
  const lastOpenChatPreparedBrief = typeof options.lastOpenChatPreparedBrief === 'function' ? options.lastOpenChatPreparedBrief : () => '';
  const structuredOrderBriefParts = typeof options.structuredOrderBriefParts === 'function' ? options.structuredOrderBriefParts : () => ({});
  const reviseStructuredBriefWithInstruction = typeof options.reviseStructuredBriefWithInstruction === 'function'
    ? options.reviseStructuredBriefWithInstruction
    : (brief) => brief;
  const openChatReadyToRunBlock = typeof options.openChatReadyToRunBlock === 'function' ? options.openChatReadyToRunBlock : () => '';
  const isOpenChatGenericProceed = typeof options.isOpenChatGenericProceed === 'function' ? options.isOpenChatGenericProceed : () => false;
  const PRODUCT_NAME = String(options.productName || 'CAIt');
  const PRODUCT_SHORT_NAME = String(options.productShortName || PRODUCT_NAME);

  const stateText = (key) => String(getState()?.[key] || '').trim();

  const openChatIdeaSeeds = (prompt = '') => {
    const text = String(prompt || '').trim();
    if (!text) return [];
    const normalized = text
      .replace(/\r/g, '\n')
      .replace(/[。！？]/g, '\n')
      .replace(/\s*(?:あと|それと|さらに|ついでに|加えて|and also|also|plus|then)\s*/gi, '\n')
      .split(/\n+|(?:^|\s)[\-*・]\s+/)
      .map((item) => compactChatText(item.replace(/^[0-9０-９]+[).．、:\s]+/, '').trim(), 120))
      .filter((item) => item.length >= 5);
    return [...new Set(normalized)].slice(0, 5);
  };

  const isOpenChatCeoIdeaDump = (prompt = '', inputCounts = {}) => {
    const text = String(prompt || '').replace(/\s+/g, ' ').trim();
    if (!text || text.length < 16 || text.length > 1600) return false;
    if (Number(inputCounts.urlCount || 0) || Number(inputCounts.fileCount || 0)) return false;
    if (isStructuredOrderBrief(text) || openChatProductQuestionContext(text) || explicitOpenChatAssistMode(text)) return false;
    if (openChatLooksSensitiveSecret(text) || openChatLooksUnsafeRequest(text) || openChatLooksHighStakesAdvice(text)) return false;
    const seeds = openChatIdeaSeeds(prompt);
    const connectorScore = (text.match(/(あと|それと|さらに|ついで|加えて|これも|あれも|全部|まとめて|and also|also|plus|then)/gi) || []).length;
    const ideaScore = (text.match(/(アイデア|思いつ|ひらめ|やりたい|作りたい|入れたい|追加したい|試したい|伸ばしたい|売りたい|稼ぎたい|改善したい|idea|ideas|feature|experiment|try|build|add|launch|growth)/gi) || []).length;
    const ceoScore = /(ceo|CEO|社長|代表|創業者|founder|アイディアマン|アイデアマン)/i.test(text) ? 2 : 0;
    const actionScore = (text.match(/(作|入れ|追加|改善|強化|投稿|公開|売|稼|伸ば|試|連携|自動化|build|add|improve|launch|sell|grow|automate)/gi) || []).length;
    if (ceoScore > 0) return true;
    if (ideaScore <= 0) return false;
    return (seeds.length >= 2 && connectorScore + actionScore >= 1)
      || connectorScore + ideaScore + actionScore >= 4;
  };

  const openChatIdeaOperatorMode = (prompt = '') => {
    const text = String(prompt || '').replace(/\s+/g, ' ').trim();
    if (!text || !stateText('openChatIdeaBacklogPrompt')) return '';
    if (/^(1|優先|優先順位|順位|prioritize|priority|rank|diagnose)$/i.test(text)) return 'prioritize';
    if (/^(2|一つ|1つ|ブリーフ|発注文|order|brief|best|top|一番良い|一番よさそう)$/i.test(text)) return 'brief';
    if (/^(3|メモ|バックログ|保存|backlog|memo|later|keep)$/i.test(text)) return 'backlog';
    if (isOpenChatGenericProceed(text)) return 'prioritize';
    return '';
  };

  const openChatIdeaOperatorSummary = (prompt = '') => {
    const seeds = openChatIdeaSeeds(prompt);
    if (!seeds.length) return compactChatText(String(prompt || '').replace(/\s+/g, ' '), 260);
    return seeds.map((seed, index) => `${index + 1}. ${seed}`).join('\n');
  };

  const buildOpenChatCeoIdeaAnswer = (prompt = '', inputCounts = {}) => {
    if (!isOpenChatCeoIdeaDump(prompt, inputCounts)) return null;
    const source = String(prompt || '').trim();
    const ja = looksJapanese(source);
    return {
      kind: 'clarify',
      tone: 'info',
      patternId: 'pattern_ceo_idea_dump',
      suppressTrio: true,
      ideaBacklogPrompt: source,
      clearClarifyOptions: true,
      body: ja
        ? [
          'Bさんとして受けます。これはまだ発注ではなく、Aさんのアイデア束として扱います。',
          '',
          'Aさんメモ:',
          openChatIdeaOperatorSummary(source),
          '',
          'Bさん整理:',
          '1. そのまま全部走らせると散らかるので、まず優先順位をつける',
          '2. 一番よさそうな1つだけ、発注ブリーフにする',
          '3. いったんバックログとして整理して残す',
          '',
          '番号だけで大丈夫です。選んだあと SEND ORDER 用の内容に整理します。'
        ].join('\n')
        : [
          'I will handle this as B. This is not an order yet; I am treating it as A-style idea intake.',
          '',
          'A notes:',
          openChatIdeaOperatorSummary(source),
          '',
          'B organization:',
          '1. Prioritize first, because running everything would scatter the work',
          '2. Turn the strongest one into a work-order brief',
          '3. Keep it as a structured backlog for later',
          '',
          'Reply with a number. Then I will turn the selected path into a SEND ORDER-ready draft.'
        ].join('\n'),
      status: 'CEO idea intake organized.\n\nChoose a path, then CAIt will prepare the order summary.'
    };
  };

  const buildOpenChatIdeaOperatorFollowup = (prompt = '') => {
    const mode = openChatIdeaOperatorMode(prompt);
    const original = stateText('openChatIdeaBacklogPrompt');
    if (!mode || !original) return null;
    const ja = looksJapanese(prompt) || looksJapanese(original);
    const summary = openChatIdeaOperatorSummary(original);
    if (mode === 'brief') {
      const brief = [
        'Task: research',
        `Goal: Prioritize this CEO idea bundle and turn the strongest near-term opportunity into a practical execution plan: ${compactChatText(original.replace(/\s+/g, ' '), 360)}`,
        'Work split: research -> pricing -> writing -> summary',
        'Inputs: Written idea bundle only. Ask for product URL, target user, metrics, or screenshots only if they materially change the recommendation.',
        'Constraints: Do not execute every idea. Choose one lead idea, explain why it wins, define the smallest useful experiment, and keep cost low.',
        'Deliver: ranked idea table, chosen first experiment, rejected/parked ideas with reasons, required inputs, 7-day action plan, and copy/CTA suggestions if relevant.',
        `Output language: ${looksJapanese(original) ? 'Japanese' : 'English'}`,
        'Acceptance: answer first, separate facts from inference, state assumptions, and make the next action executable.'
      ].join('\n');
      return {
        kind: 'assist',
        tone: 'ok',
        suppressTrio: true,
        clearIdeaBacklog: true,
        body: ja
          ? [
            'Bさん判断で、まず「一番良さそうな1つを選ぶ」発注ブリーフにしました。',
            '',
            '発注文:',
            brief,
            '',
            openChatReadyToRunBlock(true),
            '',
            '次の動き: 入力欄にこの発注文を入れました。実行する場合だけ SEND ORDER してください。'
          ].join('\n')
          : [
            'B selected the safest next move: choose one strongest idea before execution.',
            '',
            'Work order:',
            brief,
            '',
            openChatReadyToRunBlock(false),
            '',
            'Next: I put this brief back into the input box. Press SEND ORDER only when you want paid execution.'
          ].join('\n'),
        nextPrompt: brief,
        status: 'CEO idea brief prepared.\n\nNo order was created and no billing occurred.'
      };
    }
    if (mode === 'backlog') {
      return {
        kind: 'clarify',
        tone: 'info',
        suppressTrio: true,
        clearIdeaBacklog: true,
        body: ja
          ? [
            'Bさんメモとしてバックログ化しました。まだ発注も課金もしていません。',
            '',
            'NOW候補: すぐ検証でき、売上/登録/利用継続に近いもの',
            'NEXT候補: 実装や連携が必要だが伸びしろがあるもの',
            'LATER候補: 面白いが、今やると焦点がぼけるもの',
            '',
            '元アイデア:',
            summary,
            '',
            '次にやる時は「このバックログから優先順位」または「2」で発注ブリーフ化できます。'
          ].join('\n')
          : [
            'B converted this into backlog. No order or billing happened.',
            '',
            'NOW: closest to revenue, signup, or retention validation',
            'NEXT: useful but needs implementation or integration',
            'LATER: interesting, but likely to blur focus now',
            '',
            'Original ideas:',
            summary,
            '',
            'Next time, ask to prioritize this backlog or reply “2” to turn it into a work brief.'
          ].join('\n'),
        status: 'CEO idea backlog organized.\n\nNo order was created and no billing occurred.'
      };
    }
    return {
      kind: 'clarify',
      tone: 'info',
      suppressTrio: true,
      clearLeaderIntake: true,
      clearPendingQuestion: true,
      clearVagueChoice: true,
      clearNaturalChoice: true,
      clearIntentShift: true,
      clearClarifyOptions: true,
      body: ja
        ? [
          'Bさんとして優先順位づけします。まず見る軸は3つです。',
          '',
          '1. 売上/登録/継続に近いか',
          '2. 1週間以内に小さく試せるか',
          '3. 既存プロダクトの強みとつながるか',
          '',
          'Aさんアイデア:',
          summary,
          '',
          'おすすめは「2」で、一番良さそうな1つを発注ブリーフにすることです。まだ注文も課金も発生しません。'
        ].join('\n')
        : [
          'B will prioritize this with three criteria:',
          '',
          '1. Close to revenue, signup, or retention',
          '2. Testable within one week',
          '3. Connected to the existing product advantage',
          '',
          'A ideas:',
          summary,
          '',
          'Recommended next step: reply “2” to turn the strongest one into a work-order brief. No order or billing happens yet.'
        ].join('\n'),
      status: 'CEO idea priorities explained.\n\nNo order was created and no billing occurred.'
    };
  };

  const isOpenChatBenignNegativeReply = (prompt = '') => {
    const text = String(prompt || '').replace(/\s+/g, ' ').trim();
    if (!text) return false;
    return /^(いや|いえ)[、。,.!\s-]*(大丈夫|問題ない|そのまま|それで|ok|okay|了解|ありがとう|ありがと|thanks|thank you|結構です|いいです)(?:[、。,.!\s-]|$)/i.test(text);
  };

  const isOpenChatPausePrompt = (prompt = '') => {
    const text = String(prompt || '').replace(/\s+/g, ' ').trim().replace(/[?？!！。.,、\s]+$/g, '');
    if (!text) return false;
    return /^(一旦保留|いったん保留|保留|あとで|後で|また後で|ストップ|止めて|中断|キャンセル|やめる|やっぱやめる|今はやめる|pause|hold|stop|later|not now|cancel)$/i.test(text)
      || /^(いや|いえ)[、。,.!\s-]*(?:一旦保留|いったん保留|保留|あとで|後で|ストップ|止めて|中断|キャンセル|やめる|今はやめる|pause|hold|stop|later|not now|cancel)$/i.test(text);
  };

  const isOpenChatNoLoginPrompt = (prompt = '') => {
    const text = String(prompt || '').replace(/\s+/g, ' ').trim();
    return /(ログインしたくない|登録したくない|アカウントなし|匿名|ログインなし|登録なし|without login|no login|without signing in|anonymous|do not want to sign in)/i.test(text);
  };

  const isOpenChatRepairPrompt = (prompt = '') => {
    const text = String(prompt || '').replace(/\s+/g, ' ').trim();
    if (!text || isOpenChatBenignNegativeReply(text) || isOpenChatPausePrompt(text)) return false;
    if (/^(違う|ちがう|違います|そうじゃない|それじゃない|not that|nope|wrong|that's wrong|not right|that is wrong)(?:[、。,.!\s-]|$)/i.test(text)) return true;
    if (/^(微妙)(?:[、。,.!\s-]|$)/i.test(text)) return true;
    if (/^(いや|いえ)(?:[、。,.!\s-]|$)/i.test(text)) {
      if (isOpenChatNoLoginPrompt(text)) return false;
      const correction = text.replace(/^(いや|いえ)[、。,.!\s-]*/i, '').trim();
      return correction.length >= 4 && !/^(大丈夫|問題ない|そのまま|それで|ok|okay|了解|ありがとう|ありがと|thanks|thank you|結構|いいです)/i.test(correction);
    }
    return false;
  };

  const openChatCorrectionText = (prompt = '') => {
    const text = String(prompt || '').trim();
    if (!text) return '';
    if (!isOpenChatRepairPrompt(text)) return '';
    const correction = text
      .replace(/^(いや|いえ|違う|ちがう|そうじゃない|それじゃない|微妙|not that|nope|wrong|that's wrong|not right|that is wrong|違います)[、。,.!\s-]*/i, '')
      .trim();
    if (correction && correction !== text) return correction;
    return '';
  };

  const buildOpenChatRepairAnswer = (prompt = '') => {
    const text = String(prompt || '').replace(/\s+/g, ' ').trim();
    if (!text) return null;
    if (!isOpenChatRepairPrompt(text)) return null;
    const previousBrief = lastOpenChatPreparedBrief();
    const correction = openChatCorrectionText(prompt);
    const ja = looksJapanese(prompt) || looksJapanese(previousBrief);
    if (previousBrief && correction.length >= 4) {
      const nextBrief = reviseStructuredBriefWithInstruction(previousBrief, correction);
      return {
        kind: 'assist',
        tone: 'ok',
        suppressTrio: true,
        body: ja
          ? [
            '修正として受け取りました。今の発注ブリーフに反映します。まだ注文も課金も発生しません。',
            '',
            '反映した修正:',
            correction,
            '',
            '更新後の発注文:',
            nextBrief,
            '',
            '内容が合っていれば SEND ORDER、まだ違う場合は「違う、...」で続けて直せます。'
          ].join('\n')
          : [
            'I treated that as a correction and updated the prepared brief. No order or billing happened.',
            '',
            'Correction applied:',
            correction,
            '',
            'Updated work order:',
            nextBrief,
            '',
            'If this now matches, press SEND ORDER. If not, reply with “not that, ...” and I will keep adjusting it.'
          ].join('\n'),
        nextPrompt: nextBrief,
        status: 'Correction applied to draft.\n\nNo order was created and no billing occurred.'
      };
    }
    return {
      kind: 'clarify',
      tone: 'warn',
      suppressTrio: true,
      body: ja
        ? [
          'ズレを検知しました。勝手に進めません。',
          '',
          previousBrief
            ? '今の発注ブリーフは保持しています。どこを直すかを「違う、対象は...」「違う、納品は表で...」のように続けてください。'
            : 'まだ修正対象の発注ブリーフがありません。やりたいことを1文で書き直してください。',
          '',
          'まだ注文も課金も発生しません。'
        ].join('\n')
        : [
          'I detected that the direction is wrong. I will not proceed automatically.',
          '',
          previousBrief
            ? 'The current brief is still kept. Tell me what to change, for example: “not that, target X” or “not that, deliver as a table”.'
            : 'There is no prepared brief to correct yet. Rewrite the desired task in one sentence.',
          '',
          'No order or billing happens yet.'
        ].join('\n'),
      nextPrompt: previousBrief || '',
      status: 'Correction needed.\n\nNo order was created and no billing occurred.'
    };
  };

  const buildOpenChatPauseAnswer = (prompt = '') => {
    const text = String(prompt || '').replace(/\s+/g, ' ').trim();
    if (!isOpenChatPausePrompt(text)) return null;
    const previousBrief = lastOpenChatPreparedBrief();
    const ja = looksJapanese(prompt) || looksJapanese(previousBrief);
    return {
      kind: 'clarify',
      tone: 'info',
      suppressTrio: true,
      body: ja
        ? [
          '保留にしました。ここでは実行も課金もしていません。',
          '',
          previousBrief
            ? '準備済みの発注ブリーフは入力欄に戻せます。再開する時は「発注文を戻して」または追加条件を書いてください。完全に消すなら「リセット」です。'
            : 'まだ準備済みの発注ブリーフはありません。再開する時は、そのまま相談を書いてください。',
          '',
          '今は何もしません。'
        ].join('\n')
        : [
          'Paused. Nothing has run and nothing has been billed.',
          '',
          previousBrief
            ? 'A prepared brief is still available. To resume, ask me to restore the brief or add more constraints. To clear everything, send “reset”.'
            : 'No prepared brief exists yet. When ready, just write the next request.',
          '',
          'No action is being taken now.'
        ].join('\n'),
      nextPrompt: previousBrief || '',
      status: 'Chat paused.\n\nNo order was created and no billing occurred.'
    };
  };

  const buildOpenChatStatusAnswer = (prompt = '') => {
    const text = String(prompt || '').replace(/\s+/g, ' ').trim();
    if (!/(今どこ|今の状態|どこまで|現状|まとめて|状況|何待ち|current status|where are we|summari[sz]e status|what now)/i.test(text)) return null;
    const previousBrief = lastOpenChatPreparedBrief();
    const pendingIdea = stateText('openChatIdeaBacklogPrompt');
    const pendingChoice = stateText('openChatVagueChoicePrompt');
    const pendingIntentShift = stateText('openChatIntentShiftPrompt');
    const ja = looksJapanese(prompt) || looksJapanese(previousBrief || pendingIdea || pendingChoice || pendingIntentShift);
    const linesJa = [
      '現状まとめです。まだ注文も課金も発生していません。',
      '',
      previousBrief ? `準備済み発注文: あります (${structuredOrderBriefParts(previousBrief).taskType || 'research'})` : '準備済み発注文: まだありません',
      pendingIdea ? `Aさんアイデア束: 保留中 (${compactChatText(pendingIdea.replace(/\s+/g, ' '), 110)})` : 'Aさんアイデア束: なし',
      pendingChoice ? `選択待ち: あり (${compactChatText(pendingChoice.replace(/\s+/g, ' '), 110)})` : '選択待ち: なし',
      pendingIntentShift ? '意図変更確認: あり' : '意図変更確認: なし',
      '',
      previousBrief
        ? '次にできること: SEND ORDER、条件追加、短くする、納品プレビュー、リセット。'
        : '次にできること: やりたい作業を書く、アイデアを投げる、FAQを聞く、URL/Fileを追加する。'
    ];
    const linesEn = [
      'Current status. Nothing has run and nothing has been billed.',
      '',
      previousBrief ? `Prepared brief: yes (${structuredOrderBriefParts(previousBrief).taskType || 'research'})` : 'Prepared brief: none yet',
      pendingIdea ? `A-style idea bundle: pending (${compactChatText(pendingIdea.replace(/\s+/g, ' '), 110)})` : 'A-style idea bundle: none',
      pendingChoice ? `Choice pending: yes (${compactChatText(pendingChoice.replace(/\s+/g, ' '), 110)})` : 'Choice pending: none',
      pendingIntentShift ? 'Intent-shift confirmation: pending' : 'Intent-shift confirmation: none',
      '',
      previousBrief
        ? 'Next options: SEND ORDER, add constraints, make it shorter, preview delivery, or reset.'
        : 'Next options: write a task, dump ideas, ask an FAQ, or add URL/files.'
    ];
    return {
      kind: 'clarify',
      tone: 'info',
      suppressTrio: true,
      body: (ja ? linesJa : linesEn).join('\n'),
      nextPrompt: previousBrief || '',
      status: 'Chat status summarized.\n\nNo order was created and no billing occurred.'
    };
  };

  const openChatLooksLowInfoTestPrompt = (prompt = '') => {
    const text = String(prompt || '').replace(/\s+/g, ' ').trim();
    if (!text || text.length > 48) return false;
    return /^(hello\s+world|test|testing|ping|pong|sample|demo|demo test|smoke test|just testing|お試し|テスト|てすと|疎通確認|動作確認)[!！。.\s]*$/i.test(text);
  };

  const buildOpenChatLowInfoTestAnswer = (prompt = '') => {
    if (!openChatLooksLowInfoTestPrompt(prompt)) return null;
    const ja = looksJapanese(prompt);
    return {
      kind: 'clarify',
      tone: 'info',
      patternId: 'pattern_low_info_test',
      body: ja
        ? [
          'こんにちは。疎通確認ですね。',
          '',
          'この入力だけでは作業内容がないため、注文ブリーフにはしません。何をしましょうか？',
          '',
          'やりたいことを1文で書いてください。例:',
          '1. このURLを要約して',
          '2. AとBを比較して',
          '3. 投稿文を作って',
          '4. エラー原因を整理して',
          '',
          'ここではまだ注文も課金も発生しません。'
        ].join('\n')
        : [
          `Hi. ${PRODUCT_SHORT_NAME} is responding. This looks like a quick test message.`,
          '',
          'There is no work request yet, so I will not turn it into an order brief. What would you like me to do?',
          '',
          'Write what you want done in one sentence. Examples:',
          '1. Summarize this URL',
          '2. Compare A and B',
          '3. Draft a post or email',
          '4. Triage this error',
          '',
          'No order or billing happens here.'
        ].join('\n'),
      status: 'Test message handled in chat.\n\nNo order was created and no billing occurred.'
    };
  };

  const openChatLooksGreetingPrompt = (prompt = '') => {
    const raw = String(prompt || '').replace(/\s+/g, ' ').trim();
    const normalized = normalizeOpenChatIntentText(raw);
    const text = normalized
      .replace(/(?:caitt|ca1t|cai\s*t|ca\s*it|けいと|毛糸|aiagent2|ai\s*agent\s*market(?:place)?|aiagent\s*market(?:place)?)/g, ' cait ')
      .replace(/\s+/g, ' ')
      .trim();
    const compact = text.replace(/\s+/g, '');
    if (!raw || raw.length > 64 || !text) return false;
    const alias = '(?:cait|ca\\s*it|aiagent2|ai\\s*agent2|ai\\s*agent\\s*market(?:place)?)';
    const enGreeting = '(?:hi|hello|hey|yo|good\\s+morning|good\\s+afternoon|good\\s+evening|thanks|thank\\s+you|ok(?:ay)?)';
    const jaGreeting = '(?:こんにちは|こんばんは|おはよう|ありがとう|ありがと|助かる|了解|はい|うん)';
    const ending = '[!！。.?？,、\\s]*';
    return new RegExp(`^(?:${enGreeting}|${jaGreeting})${ending}$`, 'i').test(raw)
      || new RegExp(`^(?:${enGreeting}|${jaGreeting})${ending}$`, 'i').test(text)
      || new RegExp(`^${enGreeting}\\s*,?\\s*${alias}${ending}$`, 'i').test(text)
      || new RegExp(`^${alias}\\s*,?\\s*${enGreeting}${ending}$`, 'i').test(text)
      || new RegExp(`^${alias}\\s*,?\\s*${jaGreeting}${ending}$`, 'i').test(text)
      || new RegExp(`^${jaGreeting}\\s*(?:${alias}|ai agent|エージェント)?${ending}$`, 'i').test(text)
      || new RegExp(`^${alias}${jaGreeting}$`, 'i').test(compact)
      || new RegExp(`^${jaGreeting}${alias}$`, 'i').test(compact)
      || new RegExp(`^(?:${alias})${ending}$`, 'i').test(text);
  };

  const buildOpenChatGreetingAnswer = (prompt = '') => {
    if (!openChatLooksGreetingPrompt(prompt)) return null;
    const ja = looksJapanese(prompt);
    return {
      kind: 'quick',
      tone: 'info',
      patternId: 'pattern_greeting',
      suppressTrio: true,
      body: ja
        ? [
          `こんにちは。${PRODUCT_NAME}です。`,
          '',
          '何をしましょうか？やりたいことをそのまま書いてください。',
          '',
          '料金、ログイン、GitHub連携、支払い、納品形式などの簡単な質問なら、このチャット内で答えます。実作業として送る場合だけ、発注ブリーフを確認してから SEND ORDER します。'
        ].join('\n')
        : [
          `Hi. This is ${PRODUCT_NAME}.`,
          '',
          'What would you like me to do?',
          '',
          'You can ask a quick question about pricing, login, GitHub connection, payments, or delivery here. If you want real work done, I will prepare a work-order brief first and only dispatch it after SEND ORDER.'
        ].join('\n'),
      status: 'Greeting answered in chat.\n\nNo order was created and no billing occurred.'
    };
  };

  return {
    openChatIdeaSeeds,
    isOpenChatCeoIdeaDump,
    openChatIdeaOperatorMode,
    openChatIdeaOperatorSummary,
    buildOpenChatCeoIdeaAnswer,
    buildOpenChatIdeaOperatorFollowup,
    isOpenChatBenignNegativeReply,
    isOpenChatPausePrompt,
    isOpenChatNoLoginPrompt,
    isOpenChatRepairPrompt,
    openChatCorrectionText,
    buildOpenChatRepairAnswer,
    buildOpenChatPauseAnswer,
    buildOpenChatStatusAnswer,
    openChatLooksLowInfoTestPrompt,
    buildOpenChatLowInfoTestAnswer,
    openChatLooksGreetingPrompt,
    buildOpenChatGreetingAnswer
  };
}
