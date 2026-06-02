export function createClientFlexibleToolUtils({
  state,
  els,
  workActionIds,
  productShortName,
  workChatInternalStatusVisible,
  orderInputFromComposer,
  orderInputCounts,
  openChatLooksGreetingPrompt,
  openChatLooksLowInfoTestPrompt,
  connectorActionLabel,
  isExplicitClientLeaderTask,
  currentRoutingTask,
  marketingTimelineSnapshot,
  marketingTimelineIntentText,
  isOpenChatClarifyMode,
  trackConversionEvent,
  setElementVisible,
  safeText,
  escapeHtml,
  renderOrderComposer,
  openMarketingTimelineModal,
  openSettingsSection,
  switchTab,
  openGithubSignIn,
  connectXAccount,
  openAgentListingFlow,
  openAgentCatalog
} = {}) {
  const currentInput = () => orderInputFromComposer?.() || {};
  const inputCounts = (input) => orderInputCounts?.(input || currentInput()) || { urlCount: 0, fileCount: 0, fileChars: 0 };
  const routeTask = () => currentRoutingTask?.() || '';
  const ids = workActionIds || {};

  function flexibleToolPromptText(prompt = '', input = currentInput()) {
    const urls = Array.isArray(input?.urls) ? input.urls.join('\n') : '';
    const fileNames = Array.isArray(input?.files) ? input.files.map((file) => file?.name || '').join('\n') : '';
    return [prompt, urls, fileNames].filter(Boolean).join('\n');
  }

  function flexibleToolCandidates(prompt = String(els?.jobPrompt?.value || ''), input = currentInput()) {
    const rawPrompt = String(prompt || '').trim();
    const text = flexibleToolPromptText(rawPrompt, input);
    const compact = text.replace(/\s+/g, ' ').trim();
    const counts = inputCounts(input);
    if (!compact && !counts.urlCount && !counts.fileCount) return [];
    if (openChatLooksGreetingPrompt?.(rawPrompt) || openChatLooksLowInfoTestPrompt?.(rawPrompt)) return [];

    const candidates = [];
    const add = (tool) => {
      if (!tool?.id || candidates.some((item) => item.id === tool.id)) return;
      candidates.push({
        tone: 'info',
        priority: 10,
        requirements: '',
        actions: [],
        ...tool
      });
    };

    if (/(?:ignore previous|system prompt|developer message|hidden instruction|prompt injection|jailbreak|leak|exfiltrate|dump).{0,90}(?:secret|api key|token|prompt|instruction|tool)|(?:api key|apiキー|apikey|secret|client secret|token|oauth|credential|シークレット|トークン|認証情報|資格情報|プロンプトインジェクション)/i.test(compact)) {
      add({
        id: 'secure_access',
        title: 'Secure access handoff',
        tone: 'warn',
        priority: 95,
        body: 'This looks like it may need credentials, OAuth, or secret-handling rules. Do not paste production secrets into chat. CAIt should turn access into a prerequisite before any agent runs.',
        requirements: 'Preferred: OAuth connector or provider-owned secret. If a raw API key is unavoidable, keep it out of delivery text and store it as setup data.',
        actions: [
          { action: 'open_api_keys', label: 'OPEN API KEYS' },
          { action: 'open_connect', label: 'CLI / API' },
          { action: 'add_secure_requirement', label: 'ADD SAFE REQUIREMENT' }
        ]
      });
    }

    if (/(?:\b(?:github|git hub|repo|repository|pull request|pr|branch|commit|diff|sandbox|code review)\b|コードレビュー|リポジトリ|プルリク|ブランチ|コミット|差分|サンドボックス)/i.test(compact)) {
      add({
        id: 'github_work',
        title: 'GitHub work mode',
        tone: 'ok',
        priority: 80,
        body: 'Repo-changing work should be handled through GitHub connection, a sandbox branch, and a pull request handoff instead of free-form chat.',
        requirements: 'Need: GitHub login/link, target repo, intended branch, allowed change scope, and tests or acceptance criteria.',
        actions: [
          { action: 'connect_github', label: connectorActionLabel?.('connect_github') || 'CONNECT GITHUB' },
          { action: 'open_agents_github', label: 'LIST AGENT FLOW' },
          { action: 'add_pr_handoff', label: 'ADD PR HANDOFF' }
        ]
      });
    }

    if (/(?:x\.com|\btwitter\b|\btweet(?:s|ing)?\b|\bx post\b|\bx thread\b|social post|ツイート|X投稿|ポスト|スレッド|返信投稿|sns投稿|ＳＮＳ投稿)/i.test(compact)
      || /(?:^|[\s　])x(?:[\s　]|で|に|へ|投稿|返信|dm|DM)/i.test(compact)) {
      add({
        id: 'x_social',
        title: 'Social publishing handoff',
        tone: 'info',
        priority: 76,
        body: 'This looks like social publishing work. CAIt should collect the goal and source material, then route the order to an agent/provider contract that can return a SaaS-ready handoff packet.',
        requirements: 'Need: target channel, audience, tone, source material, approval owner, and whether the final delivery should be a draft, schedule packet, or app handoff.',
        actions: [
          { action: 'use_agent_team', label: 'AGENT TEAM' },
          { action: 'browse_agents', label: 'BROWSE AGENTS' },
          { action: 'add_social_handoff_rule', label: 'ADD HANDOFF RULE' }
        ]
      });
    }

    if (isExplicitClientLeaderTask?.(routeTask(), compact)
      || /(agent team|leader agent|team leader|複数エージェント|チームリーダー|まとめて.*(?:告知|投稿|分析)|一括.*(?:告知|投稿|分析)|責任者|部長|リーダー)/i.test(compact)) {
      add({
        id: 'agent_team',
        title: 'Agent Team planner',
        tone: 'ok',
        priority: 74,
        body: 'This may be better as one input coordinated by a Team Leader, then split across specialist agents.',
        requirements: 'Need: final outcome, departments or channels, priority order, budget sensitivity, and whether outputs should be merged into one delivery.',
        actions: [
          { action: 'use_agent_team', label: 'USE AGENT TEAM' },
          { action: 'browse_agents', label: 'BROWSE LEADERS' },
          { action: ids.OPEN_ORDER_SETTINGS, label: 'ORDER SETTINGS' }
        ]
      });
    }

    const marketingTimeline = marketingTimelineSnapshot?.(null, { maxRecentRuns: 4, maxScheduleItems: 2 }) || { items: [], marketingRuns: [], marketingSchedules: [] };
    if (marketingTimeline.items.length && (marketingTimelineIntentText?.(compact) || marketingTimeline.items.some((item) => item.focused))) {
      add({
        id: 'marketing_timeline',
        title: 'Saved schedule timeline',
        tone: 'info',
        priority: 73,
        body: 'Stored agent history is available. You can inspect completed deliveries, see upcoming scheduled actions, and continue them from Chat history, Deliveries, or Campaign Operations.',
        requirements: `${marketingTimeline.marketingRuns.length} stored run(s) · ${marketingTimeline.marketingSchedules.length} scheduled action(s) from jobs and recurring orders in DB.`,
        actions: [
          { action: ids.OPEN_MARKETING_TIMELINE, label: 'OPEN TIMELINE' },
          ...(marketingTimeline.marketingSchedules.length ? [{ action: 'open_scheduled_work', label: 'OPEN SCHEDULE' }] : []),
          { action: ids.OPEN_ORDER_SETTINGS, label: 'ORDER SETTINGS' }
        ]
      });
    }

    if (/(?:schedule|scheduled|recurring|cron|daily|weekly|hourly|monitor|watch|定期|毎日|毎週|毎時|監視|巡回|くろん|クロン)/i.test(compact)) {
      add({
        id: 'scheduled_work',
        title: 'Scheduled Work',
        tone: 'info',
        priority: 70,
        body: 'This looks like work that may need to run repeatedly. Keep the chat brief as the task definition, then manage timing from Scheduled Work.',
        requirements: 'Need: repeat interval, time zone, stop condition, failure notification rule, and what should change between runs.',
        actions: [
          { action: 'open_scheduled_work', label: 'OPEN SCHEDULE' },
          { action: 'add_schedule_rule', label: 'ADD SCHEDULE RULE' }
        ]
      });
    }

    if (counts.urlCount || counts.fileCount || /(?:https?:\/\/|source url|source file|attach|attachment|csv|pdf|markdown|添付|ファイル|URL|ソース|資料|データ)/i.test(compact)) {
      add({
        id: 'sources',
        title: 'Source material',
        tone: 'info',
        priority: 62,
        body: 'This work depends on source material. Keep large files and URLs in Order Settings so the chat stays readable and the order records the input cleanly.',
        requirements: `Current sources: ${counts.urlCount} URL(s), ${counts.fileCount} file(s). Add only source material that the agent should rely on.`,
        actions: [
          { action: 'open_sources', label: 'ADD SOURCES' },
          { action: 'add_source_rule', label: 'ADD SOURCE RULE' }
        ]
      });
    }

    if (/(?:payment|billing|deposit|balance|checkout|plan|refund|payout|withdraw|課金|支払い|決済|デポジット|残高|返金|出金|受け取り|請求)/i.test(compact)) {
      add({
        id: 'payments',
        title: 'Donation-only support',
        tone: 'warn',
        priority: 58,
        body: 'CAIt no longer processes checkout, cards, subscriptions, donations, charges, or payouts inside the app. A Stripe Payment Link for external donation support is only a future option after compliance review.',
        requirements: 'No card registration, billing setup, checkout, donation collection, withdrawal, or payout action is available in CAIt.',
        actions: [
          { action: 'open_payments', label: 'SUPPORT / DONATION' },
          { action: 'open_provider', label: 'PROVIDER INFO' }
        ]
      });
    }

    if (/(?:list my agent|publish agent|register agent|agent manifest|skill\.md|verify agent|adapter pr|エージェント登録|agent登録|マニフェスト|ベリファイ|公開したい|稼ぎたい)/i.test(compact)) {
      add({
        id: 'agent_listing',
        title: 'Agent listing flow',
        tone: 'ok',
        priority: 84,
        body: 'This is provider-side work. CAIt should move this into the guided agent listing flow instead of treating it as a buyer order.',
        requirements: 'Need: capability summary, manifest or repo, endpoint/adapter path, pricing markup, and verification readiness.',
        actions: [
          { action: 'list_agent', label: 'LIST YOUR AGENT' },
          { action: 'connect_github', label: connectorActionLabel?.('connect_github') || 'CONNECT GITHUB' },
          { action: 'add_agent_listing_rule', label: 'ADD LISTING RULE' }
        ]
      });
    }

    if (/(?:bug|broken|issue|feedback|report|改善要望|不具合|バグ|問い合わせ|報告|動かない|壊れて)/i.test(compact)) {
      add({
        id: 'feedback',
        title: 'Feedback / bug report',
        tone: 'info',
        priority: 50,
        body: 'This looks like a product issue or feedback item. Use the report form when you want it saved for review; keep chat for quick clarification.',
        requirements: 'Best report: what happened, expected behavior, page name, account state, and reproduction steps.',
        actions: [
          { action: ids.OPEN_FEEDBACK, label: 'REPORT ISSUE' },
          { action: 'add_bug_report_rule', label: 'ADD BUG TEMPLATE' }
        ]
      });
    }

    return candidates.sort((a, b) => Number(b.priority || 0) - Number(a.priority || 0));
  }

  function activeFlexibleTool(prompt = String(els?.jobPrompt?.value || ''), input = currentInput()) {
    return flexibleToolCandidates(prompt, input)[0] || null;
  }

  function flexibleToolPromptBucket(prompt = String(els?.jobPrompt?.value || ''), input = currentInput()) {
    const counts = inputCounts(input);
    const promptChars = String(prompt || '').trim().length;
    return [
      routeTask() || 'unknown',
      Math.floor(promptChars / 120),
      counts.urlCount,
      counts.fileCount
    ].join(':');
  }

  function flexibleToolAnalyticsMeta(tool = {}, extra = {}) {
    const input = currentInput();
    const counts = inputCounts(input);
    return {
      source: 'work_chat_flexible_ui',
      toolId: tool.id || '',
      toolTitle: tool.title || '',
      trigger: extra.trigger || 'rule',
      taskType: routeTask() || '',
      mode: isOpenChatClarifyMode?.() ? 'plan' : 'order',
      status: extra.status || tool.tone || '',
      action: extra.action || '',
      actionLabel: extra.actionLabel || '',
      promptChars: String(els?.jobPrompt?.value || '').trim().length,
      urlCount: counts.urlCount,
      fileCount: counts.fileCount,
      fileChars: counts.fileChars,
      candidateCount: Number(extra.candidateCount || 0),
      priority: Number(tool.priority || 0),
      helpful: extra.helpful,
      userDismissed: extra.userDismissed
    };
  }

  function trackFlexibleToolEvent(event = '', tool = {}, extra = {}) {
    void trackConversionEvent?.(event, flexibleToolAnalyticsMeta(tool, extra));
  }

  function renderFlexibleToolPanel() {
    if (!els?.flexToolPanel || !els.flexToolCard) return;
    const candidates = flexibleToolCandidates();
    const tool = candidates[0] || null;
    if (!workChatInternalStatusVisible && tool?.id !== 'marketing_timeline') {
      setElementVisible?.(els.flexToolPanel, false);
      return;
    }
    if (!tool) {
      state.flexToolDismissedKey = '';
      state.flexToolLastActiveId = '';
      state.flexToolLastShownKey = '';
      setElementVisible?.(els.flexToolPanel, false);
      return;
    }
    if (state.flexToolDismissedKey && state.flexToolDismissedKey !== tool.id) {
      state.flexToolDismissedKey = '';
    }
    if (state.flexToolDismissedKey === tool.id) {
      setElementVisible?.(els.flexToolPanel, false);
      return;
    }
    state.flexToolLastActiveId = tool.id;
    const tone = ['ok', 'warn', 'error', 'info'].includes(tool.tone) ? tool.tone : 'info';
    els.flexToolCard.className = `modal-panel box panel-stack flex-tool-panel ${tone}`;
    safeText?.(els.flexToolTitle, tool.title || 'Relevant tool');
    safeText?.(els.flexToolBody, tool.body || `${productShortName} found a relevant tool for this message.`);
    safeText?.(els.flexToolRequirements, tool.requirements || 'No extra setup detected.');
    if (els.flexToolActions) {
      els.flexToolActions.innerHTML = (Array.isArray(tool.actions) ? tool.actions : [])
        .filter((action) => action?.action && action?.label)
        .slice(0, 4)
        .map((action) => `<button class="mini-btn" type="button" data-flex-tool-action="${escapeHtml?.(action.action) || ''}">${escapeHtml?.(action.label) || ''}</button>`)
        .join('');
      els.flexToolActions.querySelectorAll('[data-flex-tool-action]').forEach((button) => {
        button.onclick = () => handleFlexibleToolAction(button.dataset.flexToolAction || '', button.textContent || '');
      });
    }
    setElementVisible?.(els.flexToolPanel, true);
    const shownKey = `${tool.id}:${flexibleToolPromptBucket()}`;
    if (state.flexToolLastShownKey !== shownKey) {
      state.flexToolLastShownKey = shownKey;
      trackFlexibleToolEvent('flex_tool_shown', tool, { candidateCount: candidates.length, trigger: 'rule' });
    }
  }

  function addFlexibleToolInstruction(instruction = '') {
    const line = String(instruction || '').trim();
    if (!line || !els?.jobPrompt) return;
    const current = String(els.jobPrompt.value || '').trim();
    if (current.includes(line)) return;
    els.jobPrompt.value = current ? `${current}\n\n${line}` : line;
    state.orderComposerDirtySinceSend = true;
    renderOrderComposer?.();
    window.requestAnimationFrame(() => els.jobPrompt?.focus());
  }

  function handleFlexibleToolAction(action = '', actionLabel = '') {
    const kind = String(action || '').trim();
    const toolForLog = activeFlexibleTool() || { id: state.flexToolLastActiveId || '', title: '' };
    trackFlexibleToolEvent('flex_tool_action_clicked', toolForLog, { action: kind, actionLabel: actionLabel || kind });
    setElementVisible?.(els.flexToolPanel, false);
    if (kind === ids.OPEN_ORDER_SETTINGS) {
      state.orderSettingsExpanded = true;
      renderOrderComposer?.();
      return;
    }
    if (kind === ids.OPEN_MARKETING_TIMELINE) {
      openMarketingTimelineModal?.();
      return;
    }
    if (kind === 'open_sources') {
      state.orderSettingsExpanded = true;
      renderOrderComposer?.();
      window.requestAnimationFrame(() => els?.jobUrls?.focus());
      return;
    }
    if (kind === 'open_payments') {
      openSettingsSection?.('payments');
      return;
    }
    if (kind === 'open_provider') {
      openSettingsSection?.('provider');
      return;
    }
    if (kind === 'open_api_keys') {
      window.location.href = '/ai-agent-api.html#api-keys';
      return;
    }
    if (kind === 'open_connect') {
      switchTab?.('connect');
      return;
    }
    if (kind === 'connect_github') {
      openGithubSignIn?.();
      return;
    }
    if (kind === 'connect_x') {
      connectXAccount?.();
      return;
    }
    if (kind === 'open_agents_github' || kind === 'list_agent') {
      openAgentListingFlow?.();
      return;
    }
    if (kind === 'browse_agents') {
      openAgentCatalog?.();
      return;
    }
    if (kind === 'open_scheduled_work') {
      state.openChatHistoryOpen = true;
      renderOrderComposer?.();
      window.requestAnimationFrame(() => els?.scheduledWorkStatus?.scrollIntoView?.({ behavior: 'smooth', block: 'center' }));
      return;
    }
    if (kind === ids.OPEN_FEEDBACK) {
      switchTab?.('start');
      window.requestAnimationFrame(() => els?.feedbackType?.scrollIntoView?.({ behavior: 'smooth', block: 'center' }));
      return;
    }
    const instructionMap = {
      add_secure_requirement: 'Access rule: do not include production secrets in chat or delivery. Use OAuth/connector setup or provider-owned secret storage before execution.',
      add_pr_handoff: 'Delivery rule: if code changes are needed, use a sandbox branch and return a pull request URL, diff summary, and test results.',
      add_social_handoff_rule: 'Social publishing rule: prepare a draft or SaaS handoff packet through the assigned agent/provider contract; do not publish directly from pre-dispatch chat.',
      use_agent_team: 'Routing preference: use an Agent Team with a Team Leader if multiple specialties or channels improve quality/cost.',
      add_schedule_rule: 'Schedule rule: ask me to confirm interval, timezone, stop condition, and failure notification before creating scheduled work.',
      add_source_rule: 'Source rule: rely only on the attached URLs/files and clearly separate source-backed facts from inference.',
      add_agent_listing_rule: 'Agent listing rule: treat this as provider setup, not buyer work. Prepare manifest, pricing markup, endpoint/adapter, and verification checklist.',
      add_bug_report_rule: 'Bug report template: include page, action taken, expected result, actual result, account state, and reproduction steps.'
    };
    if (instructionMap[kind]) {
      addFlexibleToolInstruction(instructionMap[kind]);
      trackFlexibleToolEvent('flex_tool_instruction_added', toolForLog, { action: kind, actionLabel: actionLabel || kind });
    }
  }

  return {
    flexibleToolPromptText,
    flexibleToolCandidates,
    activeFlexibleTool,
    flexibleToolPromptBucket,
    flexibleToolAnalyticsMeta,
    trackFlexibleToolEvent,
    renderFlexibleToolPanel,
    addFlexibleToolInstruction,
    handleFlexibleToolAction
  };
}
