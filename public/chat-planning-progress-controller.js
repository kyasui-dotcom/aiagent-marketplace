import {
  progressNarratorHtml as agentProgressNarratorHtml,
  progressNarratorProgress as agentProgressNarratorProgress,
  progressNarratorProgressLabel as agentProgressNarratorProgressLabel,
  progressNarratorStreamSegments as agentProgressNarratorStreamSegments,
  progressNarratorStreamText as agentProgressNarratorStreamText
} from './agent-progress-view.js?v=20260519a';

export function createChatPlanningProgressController(options = {}) {
  const state = options.state && typeof options.state === 'object' ? options.state : {};
  const windowRef = options.window || globalThis.window || {};
  const appendMessage = typeof options.appendMessage === 'function' ? options.appendMessage : (() => null);
  const chatLanguage = typeof options.chatLanguage === 'function' ? options.chatLanguage : (() => 'en');
  const chatText = typeof options.chatText === 'function' ? options.chatText : ((en) => en);
  const escapeHtml = typeof options.escapeHtml === 'function' ? options.escapeHtml : ((value = '') => String(value || ''));
  const selectedDeliveryFormatLabel = typeof options.selectedDeliveryFormatLabel === 'function'
    ? options.selectedDeliveryFormatLabel
    : (() => '');
  const threadIsNearBottom = typeof options.threadIsNearBottom === 'function' ? options.threadIsNearBottom : (() => true);
  const scrollThread = typeof options.scrollThread === 'function' ? options.scrollThread : (() => {});

  function conversationSample(sample = '') {
    return [sample, state.conversationLanguage].join(' ');
  }

  function progressNarratorHtml(text = '', narratorOptions = {}) {
    return agentProgressNarratorHtml(text, {
      ...narratorOptions,
      language: state.conversationLanguage,
      isJapanese: (sample) => chatLanguage(sample) === 'ja',
      escapeHtml
    });
  }

  function planningStatusConfig(sample = '', stage = 'prepare', overrides = {}) {
    const ja = chatLanguage(conversationSample(sample)) === 'ja';
    const formatLabel = String(selectedDeliveryFormatLabel?.() || '').trim();
    const stages = {
      intent: ja
        ? {
          text: '依頼を読み取り中...',
          phase: '入力整理',
          status: '判定中',
          detail: 'チャット回答、追加質問、発注ドラフトのどれに進むか確認しています。まだ発注も外部実行もしていません。',
          progressPercent: 18,
          progressLabel: '判定中',
          steps: ['依頼の種類を確認', '不足情報を確認', '次の表示を決定']
        }
        : {
          text: 'Reading the request...',
          phase: 'Input check',
          status: 'Classifying',
          detail: 'Deciding whether to answer in chat, ask a follow-up, or prepare an order draft. Nothing has been dispatched yet.',
          progressPercent: 18,
          progressLabel: 'Classifying',
          steps: ['Check request type', 'Check missing input', 'Choose next screen']
        },
      prepare: ja
        ? {
          text: '実行プランを作成中...',
          phase: 'プラン作成',
          status: '準備中',
          detail: `担当領域、必要な確認事項、納品形式${formatLabel ? `（${formatLabel}）` : ''}を整理しています。SEND ORDER までは実行されません。`,
          progressPercent: 34,
          progressLabel: '準備中',
          steps: ['目的を整理', '担当候補を確認', '不足条件を確認']
        }
        : {
          text: 'Preparing the execution plan...',
          phase: 'Planning',
          status: 'Preparing',
          detail: `Checking the owner, required inputs, and output format${formatLabel ? ` (${formatLabel})` : ''}. Work will not run until SEND ORDER.`,
          progressPercent: 34,
          progressLabel: 'Preparing',
          steps: ['Frame goal', 'Check owner', 'Check missing conditions']
        },
      merge: ja
        ? {
          text: '回答をプランに統合中...',
          phase: 'ヒアリング反映',
          status: '整理中',
          detail: '回答済みの内容を発注ドラフトへ反映しています。まだ発注も外部実行もしていません。',
          progressPercent: 42,
          progressLabel: '整理中',
          steps: ['回答を反映', '担当を確認', 'ドラフトを更新']
        }
        : {
          text: 'Merging your answers into the plan...',
          phase: 'Intake merge',
          status: 'Organizing',
          detail: 'Applying the answered details to the order draft. Nothing has been dispatched yet.',
          progressPercent: 42,
          progressLabel: 'Organizing',
          steps: ['Merge answers', 'Confirm owner', 'Update draft']
        },
      route: ja
        ? {
          text: '担当と進め方を確認中...',
          phase: 'ルーティング確認',
          status: '確認中',
          detail: '単独エージェントかリーダー主導か、先に質問が必要かを確認しています。',
          progressPercent: 62,
          progressLabel: '確認中',
          steps: ['実行形を確認', '承認前の不足を確認', '次のカードを準備']
        }
        : {
          text: 'Checking owner and routing...',
          phase: 'Routing check',
          status: 'Checking',
          detail: 'Checking whether this should be single-agent, leader-led, or needs one more question first.',
          progressPercent: 62,
          progressLabel: 'Checking',
          steps: ['Check route', 'Check pre-approval gaps', 'Prepare next card']
        },
      intake: ja
        ? {
          text: '追加確認に進みます。',
          phase: '次の入力',
          status: '質問あり',
          detail: '不足情報があるため、次に質問を表示します。発注はまだ送信していません。',
          progressPercent: 100,
          progressLabel: '質問へ',
          steps: ['不足情報あり', '質問を表示', '発注は未送信'],
          done: true
        }
        : {
          text: 'Moving to a follow-up question.',
          phase: 'Next input',
          status: 'Needs input',
          detail: 'A required detail is missing, so the next card will ask for it. No order has been sent.',
          progressPercent: 100,
          progressLabel: 'Question',
          steps: ['Missing detail found', 'Show question', 'Order not sent'],
          done: true
        },
      draft: ja
        ? {
          text: '発注ドラフトを表示します。',
          phase: 'ドラフト完成',
          status: '確認待ち',
          detail: '内容確認後に SEND ORDER を押すまで、実作業・課金・外部実行は始まりません。',
          progressPercent: 100,
          progressLabel: 'ドラフト',
          steps: ['ドラフト作成済み', '内容確認待ち', 'SEND ORDER で実行']
        }
        : {
          text: 'Showing the order draft.',
          phase: 'Draft ready',
          status: 'Review needed',
          detail: 'Work, billing, and external execution do not start until you press SEND ORDER.',
          progressPercent: 100,
          progressLabel: 'Draft',
          steps: ['Draft created', 'Waiting for review', 'SEND ORDER runs it']
        },
      error: ja
        ? {
          text: 'プラン作成で止まりました。',
          phase: 'プラン作成',
          status: '停止',
          detail: '発注・課金・外部実行は発生していません。エラー内容を確認してください。',
          progressPercent: 100,
          progressLabel: '停止',
          steps: ['発注なし', '課金なし', 'エラーを表示'],
          done: true
        }
        : {
          text: 'Planning stopped.',
          phase: 'Planning',
          status: 'Stopped',
          detail: 'No order, billing, or external execution happened. Review the error message.',
          progressPercent: 100,
          progressLabel: 'Stopped',
          steps: ['No order sent', 'No billing', 'Error shown'],
          done: true
        }
    };
    const config = { ...(stages[stage] || stages.prepare), ...overrides };
    config.steps = Array.isArray(config.steps) ? config.steps.filter(Boolean).slice(0, 4) : [];
    return config;
  }

  function setPlanningArticleTone(article, tone = '') {
    if (!article) return;
    article.classList.remove('thinking', 'ok', 'warn', 'error', 'info');
    if (tone) article.classList.add(tone);
  }

  function appendPlanningStatusMessage(sample = '', stage = 'prepare', statusOptions = {}) {
    const config = planningStatusConfig(sample, stage, statusOptions);
    const article = appendMessage('assistant', progressNarratorHtml(config.text, config), {
      tone: statusOptions.tone || (config.done ? 'ok' : 'thinking'),
      label: statusOptions.label || chatText('Plan status', 'プラン状況', sample),
      record: false,
      forceScroll: statusOptions.forceScroll === true
    });
    if (!article) return null;
    article.dataset.transient = statusOptions.transient || 'planning';
    article.setAttribute('aria-live', 'polite');
    syncProgressNarratorAnimation(article, config.text, config);
    return article;
  }

  function updatePlanningStatusMessage(article, sample = '', stage = 'prepare', statusOptions = {}) {
    if (!article?.isConnected) return null;
    const config = planningStatusConfig(sample, stage, statusOptions);
    updateProgressNarratorArticle(article, config.text, config);
    setPlanningArticleTone(article, statusOptions.tone || (config.done ? 'ok' : 'thinking'));
    return article;
  }

  function finishPlanningStatusMessage(article, sample = '', stage = 'draft', statusOptions = {}) {
    if (!article?.isConnected) return null;
    const tone = statusOptions.tone || (stage === 'error' ? 'error' : 'ok');
    const config = planningStatusConfig(sample, stage, { ...statusOptions, done: true });
    updateProgressNarratorArticle(article, config.text, config);
    setPlanningArticleTone(article, tone);
    return article;
  }

  function appendThinkingMessage(sample = '') {
    return appendPlanningStatusMessage(sample, 'intent', {
      transient: 'thinking'
    });
  }

  function progressNarratorProgress(narratorOptions = {}) {
    return agentProgressNarratorProgress(narratorOptions);
  }

  function progressNarratorProgressLabel(narratorOptions = {}, progress = progressNarratorProgress(narratorOptions)) {
    return agentProgressNarratorProgressLabel(narratorOptions, progress);
  }

  function progressNarratorStreamText(text = '', narratorOptions = {}, frame = 0) {
    return agentProgressNarratorStreamText(text, {
      ...narratorOptions,
      language: state.conversationLanguage,
      isJapanese: (sample) => chatLanguage(sample) === 'ja'
    }, frame);
  }

  function stopProgressNarratorAnimation(article = null) {
    if (article && state.progressNarratorTimerArticle && state.progressNarratorTimerArticle !== article) return;
    if (state.progressNarratorTimer) windowRef.clearInterval(state.progressNarratorTimer);
    state.progressNarratorTimer = null;
    state.progressNarratorTimerArticle = null;
  }

  function syncProgressNarratorAnimation(article, text = '', narratorOptions = {}) {
    if (!article) return;
    const streamNode = article.querySelector('[data-progress-narrator-stream]');
    if (!streamNode) return;
    article.dataset.progressNarratorText = String(text || '');
    article.dataset.progressNarratorOptions = JSON.stringify({
      detail: String(narratorOptions.detail || ''),
      phase: String(narratorOptions.phase || ''),
      status: String(narratorOptions.status || ''),
      steps: Array.isArray(narratorOptions.steps) ? narratorOptions.steps.slice(0, 4) : []
    });
    if (narratorOptions.done === true) {
      streamNode.textContent = progressNarratorStreamText(text, narratorOptions, 0);
      streamNode.classList.add('done');
      stopProgressNarratorAnimation(article);
      return;
    }
    streamNode.classList.remove('done');
    const renderFrame = () => {
      if (!article.isConnected) {
        stopProgressNarratorAnimation(article);
        return;
      }
      const frame = Number(article.dataset.progressNarratorFrame || 0) + 1;
      article.dataset.progressNarratorFrame = String(frame);
      let parsed = {};
      try {
        parsed = JSON.parse(article.dataset.progressNarratorOptions || '{}');
      } catch {
        parsed = {};
      }
      streamNode.textContent = progressNarratorStreamText(article.dataset.progressNarratorText || text, parsed, frame);
    };
    renderFrame();
    if (state.progressNarratorTimerArticle !== article) {
      stopProgressNarratorAnimation();
      state.progressNarratorTimerArticle = article;
      state.progressNarratorTimer = windowRef.setInterval(renderFrame, 820);
    }
  }

  function updateProgressNarratorArticle(article, text = '', narratorOptions = {}) {
    if (!article) return;
    const textNode = article.querySelector('[data-progress-narrator-text]');
    const detailNode = article.querySelector('[data-progress-narrator-detail]');
    const metaNode = article.querySelector('[data-progress-narrator-meta]');
    const stepsNode = article.querySelector('[data-progress-narrator-steps]');
    const barNode = article.querySelector('.progress-narrator-bar');
    const barLabelNode = article.querySelector('[data-progress-narrator-bar-label]');
    if (textNode) textNode.textContent = String(text || 'Working through the order...');
    const progress = progressNarratorProgress(narratorOptions);
    if (barNode) {
      barNode.style.setProperty('--progress-value', `${progress.percent}%`);
      barNode.setAttribute('aria-valuenow', String(progress.percent));
      barNode.classList.toggle('complete', progress.percent >= 100 || narratorOptions.done === true);
    }
    if (barLabelNode) barLabelNode.textContent = progressNarratorProgressLabel(narratorOptions, progress);
    if (detailNode) {
      const detail = String(narratorOptions.detail || '').trim();
      detailNode.textContent = detail;
      detailNode.hidden = !detail;
    }
    if (metaNode) {
      const meta = [narratorOptions.phase, narratorOptions.status].map((item) => String(item || '').trim()).filter(Boolean).join(' / ');
      metaNode.textContent = meta;
      metaNode.hidden = !meta;
    }
    if (stepsNode) {
      const steps = Array.isArray(narratorOptions.steps) ? narratorOptions.steps.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 4) : [];
      stepsNode.innerHTML = steps.map((step) => `<span>${escapeHtml(step)}</span>`).join('');
      stepsNode.hidden = !steps.length;
    }
    article.classList.toggle('ok', narratorOptions.done === true);
    syncProgressNarratorAnimation(article, text, narratorOptions);
  }

  function showProgressNarrator(text = '', narratorOptions = {}) {
    const key = String(narratorOptions.key || state.orderId || 'progress').trim();
    const shouldScroll = narratorOptions.forceScroll === true || threadIsNearBottom();
    if (!state.progressNarratorArticle || !state.progressNarratorArticle.isConnected || (key && state.progressNarratorKey !== key)) {
      state.progressNarratorArticle = appendMessage('assistant', progressNarratorHtml(text, narratorOptions), {
        tone: narratorOptions.done ? 'ok' : 'thinking',
        label: narratorOptions.label || 'CAIt',
        record: false,
        forceScroll: shouldScroll
      });
      state.progressNarratorKey = key;
      syncProgressNarratorAnimation(state.progressNarratorArticle, text, narratorOptions);
      return state.progressNarratorArticle;
    }
    updateProgressNarratorArticle(state.progressNarratorArticle, text, narratorOptions);
    if (shouldScroll) scrollThread({ force: true });
    return state.progressNarratorArticle;
  }

  function stopLiveProgressNarrator(text = '', narratorOptions = {}) {
    const article = state.progressNarratorArticle && state.progressNarratorArticle.isConnected
      ? state.progressNarratorArticle
      : null;
    const key = String(narratorOptions.key || '').trim();
    if (key) state.progressNarratorKey = key;
    if (!article) {
      stopProgressNarratorAnimation();
      state.progressNarratorArticle = null;
      state.progressNarratorKey = '';
      return null;
    }
    const textNode = article.querySelector('[data-progress-narrator-text]');
    const finalText = String(text || textNode?.textContent || 'Progress stopped.').trim();
    updateProgressNarratorArticle(article, finalText, { ...narratorOptions, done: true });
    return article;
  }

  function markLiveProgressStopped(orderId = '') {
    const safeId = String(orderId || state.orderId || '').trim();
    if (safeId) state.liveProgressStoppedOrderIds.add(safeId);
  }

  function resumeLiveProgress(orderId = '') {
    const safeId = String(orderId || state.orderId || '').trim();
    if (safeId) state.liveProgressStoppedOrderIds.delete(safeId);
  }

  return {
    appendPlanningStatusMessage,
    appendThinkingMessage,
    finishPlanningStatusMessage,
    markLiveProgressStopped,
    resumeLiveProgress,
    showProgressNarrator,
    stopLiveProgressNarrator,
    stopProgressNarratorAnimation,
    updatePlanningStatusMessage,
    progressNarratorStreamSegments: (text = '', narratorOptions = {}) => agentProgressNarratorStreamSegments(text, {
      ...narratorOptions,
      language: state.conversationLanguage,
      isJapanese: (sample) => chatLanguage(sample) === 'ja'
    })
  };
}
