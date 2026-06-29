export function createClientMarketingTimelineUtils(deps = {}) {
  const {
    state,
    els,
    articleCandidateFromDelivery,
    compactChatText,
    copyTextToClipboard,
    deliverySummaryText,
    escapeHtml,
    flash,
    getRenderFlexibleToolPanel,
    jobById,
    loadOrderDraftIntoComposer,
    looksJapanese,
    openChatPreviousUserMessageBody,
    openJobDetail,
    orderProgressStatusLabel,
    prepareFollowupOrderFromDelivery,
    prepareGenericDeliverableOrderFromDelivery,
    preparePublishOrderFromDelivery,
    recurringOrderMatchesRequesterScope,
    requesterLoginOf,
    requesterScopeForClient,
    runMatchesRequesterScope,
    runNextAction,
    safeCssToken,
    scheduledWorkById,
    scheduledWorkScheduleLabel,
    scheduledWorkTimeLabel,
    selectedJob,
    setDetail,
    setElementVisible,
    switchTab,
    renderOrderComposer,
    visibleDeliveryFiles,
    workflowChildRunsFromDelivery
  } = deps;

  const MARKETING_EMAIL_TASKS = new Set([
    'email_ops',
    'cold_email',
    'reply_draft'
  ]);
  const MARKETING_SOCIAL_TASKS = new Set([
    'x_post',
    'instagram',
    'media_planner'
  ]);

  function renderFlexibleToolPanel() {
    const fn = typeof getRenderFlexibleToolPanel === 'function' ? getRenderFlexibleToolPanel() : null;
    if (typeof fn === 'function') fn();
  }

  function isMarketingTimelineTask(taskType = '') {
    const task = String(taskType || '').trim().toLowerCase();
    return Boolean(task);
  }

  function marketingTimelineIntentText(value = '') {
    return /(?:timeline|history|scheduled|schedule|future action|future actions|what will|what is going to|delivery history|run history|show.*(?:run|history|schedule)|履歴|実行履歴|予約|今後|次に何が|何が送られる|何が投稿|何が実行|配信予定|投稿予定|実行予定|timeline|agent work)/i.test(String(value || ''));
  }

  function openChatLooksExplicitTimelineView(value = '') {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    if (!text) return false;
    if (/^(?:work timeline|timeline|run history|history|schedule|実行履歴|履歴|予約|今後|配信予定|投稿予定|実行予定)$/.test(text.toLowerCase())) return true;
    return /(?:(?:show|open|view|see|display|look at|見せ|見たい|見る|開い|表示|呼び出|確認).{0,16}(?:work timeline|timeline|history|schedule|実行履歴|履歴|予約|今後|配信予定|投稿予定|実行予定)|(?:work timeline|timeline|history|schedule|実行履歴|履歴|予約|今後|配信予定|投稿予定|実行予定).{0,16}(?:show|open|view|see|display|見せ|見たい|見る|開い|表示|呼び出|確認))/i.test(text);
  }

  function openChatLooksExplicitTimelinePlan(value = '') {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    if (!text) return false;
    return /(?:(?:plan|create|make|build|draft|prepare|organize|roadmap|day-by-day|week-by-week|作っ|作成|計画|設計|立て|組ん|引い|策定).{0,18}(?:timeline|schedule|roadmap|タイムライン|日程|計画)|(?:timeline|schedule|roadmap|タイムライン|日程|計画).{0,18}(?:plan|create|make|build|draft|prepare|organize|day-by-day|week-by-week|作っ|作成|計画|設計|立て|組ん|引い|策定))/i.test(text);
  }

  function openChatLooksTimelineReference(value = '') {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    if (!text) return false;
    return /(?:work timeline|timeline|roadmap|schedule|execution plan|launch plan|go to market plan|タイムライン|ロードマップ|スケジュール|予定|実行計画|今後の計画|今後の予定|配信予定|投稿予定|実行予定)/i.test(text);
  }

  function openChatLooksConcreteTimelinePlanContext(value = '') {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    if (!text) return false;
    if (openChatLooksExplicitTimelinePlan(text)) return true;
    const hasTarget = /(?:for|to|toward|until|before|after|launch|release|campaign|project|feature|migration|rollout|plan for|向け|までの|について|対象|案件|仕事|プロジェクト|機能|施策|キャンペーン|ローンチ|リリース|移行)/i.test(text);
    const hasTimeFrame = /(?:today|tomorrow|this week|next week|this month|next month|next quarter|q[1-4]|by [a-z0-9]|due|deadline|yyyy|day-by-day|week-by-week|日次|週次|月次|四半期|今日|明日|今週|来週|今月|来月|期限|締切|まで|日ごと|週ごと)/i.test(text)
      || /\b20\d{2}\b/.test(text)
      || /\b\d{1,2}\/\d{1,2}\b/.test(text);
    return hasTarget && hasTimeFrame;
  }

  function openChatLooksAmbiguousTimelineIntent(value = '') {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    if (!text) return false;
    if (!openChatLooksTimelineReference(text)) return false;
    if (/^(?:work timeline|timeline|run history|history|schedule|実行履歴|履歴|予約|今後|配信予定|投稿予定|実行予定)$/.test(text.toLowerCase())) return false;
    if (openChatLooksExplicitTimelineView(text) || openChatLooksExplicitTimelinePlan(text)) return false;
    if (openChatLooksConcreteTimelinePlanContext(text)) return false;
    return text.length <= 72;
  }

  function timelineIntentChoiceAnswer(prompt = '') {
    if (!openChatLooksAmbiguousTimelineIntent(prompt)) return null;
    const ja = looksJapanese(prompt);
    return {
      kind: 'clarify',
      tone: 'info',
      patternId: 'pattern_timeline_intent_choice',
      skipOpenAiPolish: true,
      clearClarifyOptions: false,
      options: [
        {
          command: 'open_marketing_timeline',
          labelJa: '保存済みのスケジュール履歴を見る',
          labelEn: 'Open saved schedule timeline',
          terms: ['1', 'timelineを見る', 'work timeline', 'timeline', '履歴', '実行履歴', '予約', '今後', 'open timeline', 'show timeline', 'history', 'schedule']
        },
        {
          command: 'clarify_timeline_plan',
          labelJa: '新しいタイムラインを計画する',
          labelEn: 'Plan a new timeline',
          terms: ['2', '計画', 'タイムラインを作る', 'タイムライン作成', 'timeline plan', 'plan timeline', 'create timeline', 'roadmap', 'day-by-day', 'week-by-week']
        }
      ],
      body: ja
        ? [
            '「timeline」は2通りに受け取れます。どちらですか？',
            '',
            '1. 保存済みのスケジュール履歴を見る',
            '2. 新しいタイムラインを計画する',
            '',
            '番号で返してください。まだ注文も課金も発生しません。'
          ].join('\n')
        : [
            '"Timeline" could mean two different things here. Which one do you want?',
            '',
            '1. Open the saved schedule timeline',
            '2. Plan a new timeline',
            '',
            'Reply with a number. No order or billing happens yet.'
          ].join('\n'),
      status: 'Timeline intent needs one choice.\n\nNo order was created and no billing occurred.'
    };
  }

  function timelinePlanClarifyAnswer(prompt = '') {
    const ja = looksJapanese(`${prompt}\n${openChatPreviousUserMessageBody()}`);
    return {
      kind: 'clarify',
      tone: 'info',
      patternId: 'pattern_timeline_plan_details',
      skipOpenAiPolish: true,
      clearClarifyOptions: true,
      pendingQuestionPrompt: String(prompt || openChatPreviousUserMessageBody() || 'timeline').trim(),
      pendingQuestionTask: 'research',
      body: ja
        ? [
            '新しいタイムラインを計画したい理解です。次の3点をください。',
            '',
            '1. 対象の仕事 / プロジェクト',
            '2. 目標の期限',
            '3. 粒度: week-by-week か day-by-day',
            '',
            'これがあれば、計画用の発注ブリーフに整理できます。まだ注文も課金も発生しません。'
          ].join('\n')
        : [
            'Understood as planning a new timeline. Send these three details:',
            '',
            '1. The work item or project',
            '2. The target deadline',
            '3. Granularity: week-by-week or day-by-day',
            '',
            'Then I can turn it into a timeline-planning brief. No order or billing happens yet.'
          ].join('\n'),
      status: 'Timeline planning details needed.\n\nNo order was created and no billing occurred.'
    };
  }

  function humanTaskLabel(taskType = '') {
    const safe = String(taskType || '').trim().toLowerCase();
    if (!safe) return 'Work';
    return safe
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  function marketingTaskFamily(taskType = '', deliverable = null) {
    const task = String(taskType || '').trim().toLowerCase();
    const deliverableType = String(deliverable?.type || '').trim().toLowerCase();
    if (deliverableType === 'email_pack' || MARKETING_EMAIL_TASKS.has(task) || /email/.test(task)) return 'email';
    if (deliverableType === 'social_post_pack' || MARKETING_SOCIAL_TASKS.has(task) || /x_post|social|reddit|indie|instagram/.test(task)) return 'social';
    if (task.endsWith('_leader')) return 'leader';
    if (task === 'landing') return 'landing';
    if (task === 'seo_specialist' || task === 'seo_specialist') return 'seo';
    if (task === 'pricing') return 'pricing';
    if (task === 'teardown') return 'teardown';
    if (task === 'validation') return 'validation';
    if (task === 'data_analysis') return 'analysis';
    if (task === 'acquisition_automation') return 'automation';
    return 'generic';
  }

  function marketingTaskLabel(taskType = '', deliverable = null) {
    const family = marketingTaskFamily(taskType, deliverable);
    if (family === 'email') return 'Email';
    if (family === 'social') return 'Social';
    if (family === 'leader') return 'Team leader';
    if (family === 'landing') return 'Landing';
    if (family === 'seo') return 'SEO';
    if (family === 'pricing') return 'Pricing';
    if (family === 'teardown') return 'Teardown';
    if (family === 'validation') return 'Validation';
    if (family === 'analysis') return 'Analytics';
    if (family === 'automation') return 'Automation';
    return humanTaskLabel(taskType);
  }

  function marketingRunTimeValue(job = {}) {
    return Date.parse(job?.completedAt || job?.lastCallbackAt || job?.startedAt || job?.createdAt || '') || 0;
  }

  function marketingRunTimeLabel(job = {}) {
    return deps.formatTime(job?.completedAt || job?.lastCallbackAt || job?.startedAt || job?.createdAt || '');
  }

  function marketingFocusJobIds(contextJob = null) {
    const jobs = Array.isArray(state.snapshot?.jobs) ? state.snapshot.jobs : [];
    const current = contextJob?.id ? contextJob : selectedJob();
    const parent = current?.workflowParentId ? jobById(current.workflowParentId) : null;
    const focusRoot = current?.jobKind === 'workflow' && isMarketingTimelineTask(current.taskType)
      ? current
      : (parent?.jobKind === 'workflow' && isMarketingTimelineTask(parent.taskType)
          ? parent
          : (current && isMarketingTimelineTask(current.taskType) ? current : null));
    const ids = new Set();
    if (!focusRoot?.id) return ids;
    ids.add(String(focusRoot.id));
    if (focusRoot.jobKind === 'workflow') {
      workflowChildRunsFromDelivery(focusRoot, focusRoot.output?.report || {}).forEach((child) => {
        const childId = String(child?.id || '').trim();
        if (childId) ids.add(childId);
      });
      jobs.filter((job) => String(job?.workflowParentId || '') === String(focusRoot.id)).forEach((job) => ids.add(String(job.id)));
    } else if (focusRoot.workflowParentId) {
      ids.add(String(focusRoot.workflowParentId));
      jobs.filter((job) => String(job?.workflowParentId || '') === String(focusRoot.workflowParentId)).forEach((job) => ids.add(String(job.id)));
    }
    return ids;
  }

  function marketingDeliverableForJob(job = null) {
    if (!job?.id) return { genericDeliverable: null, article: null, summaryText: '', previewText: '', previewLabel: '', report: null, files: [] };
    const report = job.output?.report || null;
    const files = visibleDeliveryFiles(job.output?.files);
    const genericDeliverable = null;
    const article = articleCandidateFromDelivery(job, report || {}, files);
    const summaryText = deliverySummaryText(report || {});
    const previewText = String(genericDeliverable?.content || article?.content || summaryText || files[0]?.content || '').trim();
    const previewLabel = genericDeliverable?.title || article?.title || files[0]?.name || '';
    return {
      genericDeliverable,
      article,
      summaryText,
      previewText,
      previewLabel,
      report,
      files
    };
  }

  function marketingTimelineSnapshot(contextJob = null, options = {}) {
    const jobs = Array.isArray(state.snapshot?.jobs) ? state.snapshot.jobs : [];
    const recurringOrders = Array.isArray(state.snapshot?.recurringOrders) ? state.snapshot.recurringOrders : [];
    const scope = requesterScopeForClient();
    const focusedIds = marketingFocusJobIds(contextJob);
    const focusedRootId = [...focusedIds][0] || '';
    const marketingRuns = jobs
      .filter((job) => isMarketingTimelineTask(job?.taskType) && runMatchesRequesterScope(job, scope))
      .sort((a, b) => marketingRunTimeValue(b) - marketingRunTimeValue(a));
    const focusedRuns = marketingRuns
      .filter((job) => focusedIds.has(String(job.id || '')))
      .sort((a, b) => {
        if (String(a.id || '') === focusedRootId) return -1;
        if (String(b.id || '') === focusedRootId) return 1;
        return marketingRunTimeValue(b) - marketingRunTimeValue(a);
      });
    const remainingRuns = marketingRuns.filter((job) => !focusedIds.has(String(job.id || '')));
    const maxRecentRuns = Math.max(0, Number(options.maxRecentRuns ?? 6));
    const marketingSchedules = recurringOrders
      .filter((order) => isMarketingTimelineTask(order?.taskType) && recurringOrderMatchesRequesterScope(order, scope))
      .sort((a, b) => {
        const left = Date.parse(a?.nextRunAt || '') || Number.MAX_SAFE_INTEGER;
        const right = Date.parse(b?.nextRunAt || '') || Number.MAX_SAFE_INTEGER;
        return left - right;
      })
      .slice(0, Math.max(0, Number(options.maxScheduleItems ?? 4)));

    const runItems = [...focusedRuns, ...remainingRuns.slice(0, maxRecentRuns)].map((job) => {
      const deliverable = marketingDeliverableForJob(job);
      const report = deliverable.report || {};
      const nextAction = String(report?.nextAction || report?.next_action || runNextAction(job).title.replace(/^ACTION:\s*/, '')).trim();
      const requester = requesterLoginOf(job) || '-';
      const executor = String(job?.assignedAgentId || job?.workflowAgentName || '').trim() || 'auto-routing';
      const parentAgentId = String(job?.parentAgentId || '').trim() || 'cloudcode-main';
      const previewText = compactChatText(deliverable.previewText || job.prompt || '', 320);
      const summary = compactChatText(deliverable.summaryText || report?.summary || runNextAction(job).body || job.prompt || '', 220);
      const taskLabel = marketingTaskLabel(job.taskType, deliverable.genericDeliverable || deliverable.article);
      return {
        kind: 'run',
        id: String(job.id || ''),
        focused: focusedIds.has(String(job.id || '')),
        status: orderProgressStatusLabel(job.status || 'unknown'),
        tone: safeCssToken(String(job.status || 'info').toLowerCase(), 'info'),
        taskType: String(job.taskType || ''),
        taskLabel,
        title: compactChatText(deliverable.previewLabel || report?.headline || report?.title || `${taskLabel} ${orderProgressStatusLabel(job.status || 'run')}`, 90),
        summary,
        previewText,
        previewLabel: deliverable.previewLabel || '',
        nextAction,
        requester,
        parentAgentId,
        executor,
        createdAt: job.createdAt || '',
        timeLabel: marketingRunTimeLabel(job),
        job,
        genericDeliverable: deliverable.genericDeliverable || null,
        article: deliverable.article || null
      };
    });
    const scheduleItems = marketingSchedules.map((order) => {
      const lastRunId = String(order?.lastWorkflowJobId || order?.lastJobId || '').trim();
      return {
        kind: 'schedule',
        id: String(order.id || ''),
        focused: false,
        status: String(order.status || 'active').toLowerCase(),
        tone: String(order.status || '').toLowerCase() === 'paused' ? 'warn' : (String(order.status || '').toLowerCase() === 'needs_action' ? 'warn' : 'info'),
        taskType: String(order.taskType || ''),
        taskLabel: marketingTaskLabel(order.taskType),
        title: compactChatText(order.inputSummary?.label || order.prompt || 'Scheduled work', 90),
        summary: compactChatText(order.prompt || order.inputSummary?.label || '', 220),
        previewText: compactChatText(order.prompt || '', 320),
        previewLabel: order.inputSummary?.label || '',
        nextAction: `${scheduledWorkScheduleLabel(order.schedule || {})} · next ${scheduledWorkTimeLabel(order.nextRunAt)}`,
        requester: String(order.ownerLogin || '-').trim() || '-',
        parentAgentId: String(order.parentAgentId || 'cloudcode-main').trim() || 'cloudcode-main',
        executor: String(order.agentId || '').trim() || 'auto-routing',
        createdAt: order.createdAt || '',
        timeLabel: scheduledWorkTimeLabel(order.nextRunAt),
        recurringOrder: order,
        lastRunId
      };
    });

    const items = focusedRuns.length
      ? [...runItems.slice(0, focusedRuns.length), ...scheduleItems, ...runItems.slice(focusedRuns.length)]
      : [...scheduleItems, ...runItems];
    const requesterLabel = scope.filter === 'all' ? 'all visible requesters' : (scope.filter === 'mine' ? 'your requester scope' : scope.filter);
    const recentRunSummary = runItems
      .slice(0, 3)
      .map((item) => `${item.taskLabel} ${String(item.status || '').toLowerCase()} · ${item.timeLabel || '-'} · ${item.summary || item.title}`)
      .join('\n');
    const upcomingSummary = scheduleItems
      .slice(0, 3)
      .map((item) => `${item.taskLabel} · ${item.timeLabel || '-'} · ${item.summary || item.title}`)
      .join('\n');
    const summary = [
      `Stored source: jobs + recurring orders in DB.`,
      `Scope: ${requesterLabel}. ${marketingRuns.length} stored run(s), ${marketingSchedules.length} scheduled action(s).`,
      focusedRuns.length ? `Focused flow: ${focusedRuns[0]?.taskLabel || 'work'} ${focusedRuns[0]?.id?.slice(0, 8) || ''}.` : 'No flow pinned. Open any run if you want one family pinned at the top.',
      recentRunSummary ? `Latest runs:\n${recentRunSummary}` : 'Latest runs:\nNo completed or visible runs yet.',
      upcomingSummary ? `Next scheduled:\n${upcomingSummary}` : 'Next scheduled:\nNo scheduled actions are stored right now.'
    ].join('\n\n');
    return {
      items,
      marketingRuns,
      marketingSchedules,
      summary
    };
  }

  function hideMarketingTimelineModal() {
    state.marketingTimelineItems = [];
    if (els.marketingTimelineList) {
      els.marketingTimelineList.innerHTML = '';
    }
    if (els.marketingTimelineSummary) els.marketingTimelineSummary.textContent = '';
    setElementVisible(els.marketingTimelineList, false);
    setElementVisible(els.marketingTimelineModal, false);
  }

  function openMarketingTimelineModal(contextJob = null) {
    renderMarketingTimelineModal(contextJob, { reveal: true });
    if (!state.marketingTimelineItems.length) {
      flash('No stored work timeline is available yet.', 'info');
      return;
    }
    setElementVisible(els.marketingTimelineModal, true);
    window.requestAnimationFrame(() => els.closeMarketingTimelineModalBtn?.focus());
  }

  function loadScheduledWorkIntoComposer(recurringOrderId = '') {
    const order = scheduledWorkById(recurringOrderId);
    if (!order) throw new Error('Scheduled work record not found.');
    loadOrderDraftIntoComposer({
      followupToJobId: '',
      taskType: String(order.taskType || 'research'),
      agentId: String(order.agentId || ''),
      prompt: String(order.prompt || ''),
      budgetCap: Number(order.budgetCap ?? 300),
      deadlineSec: Number(order.deadlineSec ?? 120),
      orderStrategy: String(order.orderStrategy || 'auto')
    });
    if (els.jobUrls) els.jobUrls.value = '';
    state.orderInputFiles = [];
    state.orderInputFileWarnings = [];
    if (els.jobFiles) els.jobFiles.value = '';
    flash('Scheduled brief loaded into CAIt Chat. Review and re-save if you want to change future runs.', 'info');
  }

  function renderMarketingTimelineModal(contextJob = null, options = {}) {
    if (!els.marketingTimelineModal || !els.marketingTimelineSummary || !els.marketingTimelineList) return;
    const reveal = options.reveal === true || !els.marketingTimelineModal.hidden;
    const snapshot = marketingTimelineSnapshot(contextJob);
    state.marketingTimelineItems = snapshot.items;
    if (!snapshot.items.length) {
      hideMarketingTimelineModal();
      renderFlexibleToolPanel();
      return;
    }
    els.marketingTimelineSummary.textContent = snapshot.summary;
    els.marketingTimelineList.innerHTML = snapshot.items.map((item, index) => {
      const safeTone = safeCssToken(item.tone, 'info');
      const title = item.kind === 'schedule' ? `${item.taskLabel} scheduled` : item.title;
      const factRows = [
        ['USER', item.requester],
        ['PARENT', item.parentAgentId],
        ['EXEC', item.executor],
        ['TASK', item.taskType || '-'],
        ['TIME', item.timeLabel || '-'],
        ['NEXT', item.nextAction || '-']
      ];
      const buttons = [];
      if (item.kind === 'run') {
        buttons.push(`<button class="mini-btn" type="button" data-marketing-open-run="${escapeHtml(item.id)}">OPEN DELIVERY</button>`);
        if (item.status === 'completed') buttons.push(`<button class="mini-btn" type="button" data-marketing-revise-run="${escapeHtml(item.id)}">REVISE IN CAIT CHAT</button>`);
        if (item.previewText) buttons.push(`<button class="mini-btn" type="button" data-marketing-copy-index="${index}">COPY DRAFT</button>`);
        if (item.genericDeliverable) buttons.push(`<button class="mini-btn" type="button" data-marketing-prepare-generic="${index}">PREPARE ORDER</button>`);
        if (item.article) buttons.push(`<button class="mini-btn" type="button" data-marketing-prepare-publish="${index}">PREPARE PUBLISH</button>`);
      } else {
        buttons.push(`<button class="mini-btn" type="button" data-marketing-open-schedule="${escapeHtml(item.id)}">OPEN SCHEDULE</button>`);
        buttons.push(`<button class="mini-btn" type="button" data-marketing-load-schedule="${escapeHtml(item.id)}">LOAD BRIEF TO CHAT</button>`);
        if (item.previewText) buttons.push(`<button class="mini-btn" type="button" data-marketing-copy-index="${index}">COPY BRIEF</button>`);
        if (item.lastRunId) buttons.push(`<button class="mini-btn" type="button" data-marketing-open-run="${escapeHtml(item.lastRunId)}">OPEN LAST RUN</button>`);
      }
      return `
        <div class="marketing-timeline-card ${item.focused ? 'focus' : ''} ${item.kind === 'schedule' ? 'schedule' : 'run'}">
          <div class="marketing-timeline-head">
            <div>
              <div class="marketing-timeline-title">${escapeHtml(title)}</div>
              <div class="marketing-timeline-meta">${escapeHtml(item.taskLabel)} · ${escapeHtml(item.kind === 'schedule' ? 'scheduled action' : `run ${item.id.slice(0, 8)}`)}</div>
            </div>
            <span class="status-pill ${safeTone}">${escapeHtml(String(item.status || 'unknown').toUpperCase())}</span>
          </div>
          <div class="marketing-timeline-summary-box">${escapeHtml(item.summary || item.previewLabel || '-')}</div>
          <div class="marketing-timeline-facts">
            ${factRows.map(([label, value]) => `
              <div class="marketing-timeline-fact">
                <strong>${escapeHtml(label)}</strong>
                <span>${escapeHtml(value || '-')}</span>
              </div>
            `).join('')}
          </div>
          ${item.previewText ? `<div class="marketing-timeline-preview">${escapeHtml(item.previewText)}</div>` : ''}
          <div class="helper-row">${buttons.join('')}</div>
        </div>
      `;
    }).join('');
    setElementVisible(els.marketingTimelineList, true);
    if (reveal) setElementVisible(els.marketingTimelineModal, true);
    els.marketingTimelineList.querySelectorAll('[data-marketing-open-run]').forEach((button) => {
      button.onclick = () => {
        hideMarketingTimelineModal();
        openJobDetail(button.dataset.marketingOpenRun || '');
      };
    });
    els.marketingTimelineList.querySelectorAll('[data-marketing-revise-run]').forEach((button) => {
      button.onclick = () => {
        const job = jobById(button.dataset.marketingReviseRun || '');
        if (!job?.id) return;
        hideMarketingTimelineModal();
        state.selectedJobId = job.id;
        setDetail(job);
        void prepareFollowupOrderFromDelivery();
      };
    });
    els.marketingTimelineList.querySelectorAll('[data-marketing-copy-index]').forEach((button) => {
      button.onclick = () => {
        const item = state.marketingTimelineItems[Number(button.dataset.marketingCopyIndex)];
        if (!item?.previewText) return;
        void copyTextToClipboard(String(item.previewText || ''), item.kind === 'schedule' ? 'Scheduled brief copied.' : 'Draft copied.');
      };
    });
    els.marketingTimelineList.querySelectorAll('[data-marketing-prepare-generic]').forEach((button) => {
      button.onclick = () => {
        const item = state.marketingTimelineItems[Number(button.dataset.marketingPrepareGeneric)];
        const job = jobById(item?.id || '');
        if (!job || !item?.genericDeliverable) return;
        hideMarketingTimelineModal();
        void prepareGenericDeliverableOrderFromDelivery(job, item.genericDeliverable);
      };
    });
    els.marketingTimelineList.querySelectorAll('[data-marketing-prepare-publish]').forEach((button) => {
      button.onclick = () => {
        const item = state.marketingTimelineItems[Number(button.dataset.marketingPreparePublish)];
        const job = jobById(item?.id || '');
        if (!job || !item?.article) return;
        hideMarketingTimelineModal();
        preparePublishOrderFromDelivery(job, item.article);
      };
    });
    els.marketingTimelineList.querySelectorAll('[data-marketing-open-schedule]').forEach((button) => {
      button.onclick = () => {
        hideMarketingTimelineModal();
        state.openChatHistoryOpen = true;
        switchTab('work');
        renderOrderComposer();
        window.requestAnimationFrame(() => els.scheduledWorkStatus?.scrollIntoView?.({ behavior: 'smooth', block: 'center' }));
      };
    });
    els.marketingTimelineList.querySelectorAll('[data-marketing-load-schedule]').forEach((button) => {
      button.onclick = () => {
        hideMarketingTimelineModal();
        loadScheduledWorkIntoComposer(button.dataset.marketingLoadSchedule || '');
      };
    });
    renderFlexibleToolPanel();
  }

  return {
    buildOpenChatTimelineIntentChoiceAnswer: timelineIntentChoiceAnswer,
    buildOpenChatTimelinePlanClarifyAnswer: timelinePlanClarifyAnswer,
    hideMarketingTimelineModal,
    isMarketingTimelineTask,
    marketingTimelineIntentText,
    marketingTimelineSnapshot,
    openMarketingTimelineModal,
    renderMarketingTimelineModal
  };
}
