export function createClientOperatorDashboardUtils(deps = {}) {
  const {
    state,
    els,
    api,
    document,
    Blob,
    URL,
    escapeHtml,
    flash,
    formatPercent,
    formatTime,
    orderProgressStatusLabel,
    refresh,
    renderSummaryRows,
    safeText,
    setButtonAccess,
    setInputValue,
    sinceLabel,
    trackConversionEvent,
    yen
  } = deps;

  function selectedFeedbackReport() {
    return state.snapshot?.feedbackReports?.find((report) => report.id === state.selectedFeedbackId) || null;
  }
  function selectedChatTranscript() {
    return state.snapshot?.chatTranscripts?.find((item) => item.id === state.selectedChatTranscriptId) || null;
  }
  function setChatTranscriptDetail(transcript) {
    if (!els.chatTranscriptDetail) return;
    if (!transcript) {
      safeText(els.chatTranscriptDetail, 'Select a chat transcript.');
      if (els.chatTranscriptExpectedHandling) els.chatTranscriptExpectedHandling.value = '';
      if (els.chatTranscriptImprovementNote) els.chatTranscriptImprovementNote.value = '';
      return;
    }
    safeText(els.chatTranscriptDetail, [
      `Status: ${String(transcript.reviewStatus || 'new').toUpperCase()}`,
      `Created: ${formatTime(transcript.createdAt)}`,
      `Task: ${transcript.taskType || '-'}`,
      `Answer kind: ${transcript.answerKind || '-'}`,
      `Visitor: ${transcript.visitorId || transcript.accountHash || '-'}`,
      `Login: ${transcript.loggedIn ? 'yes' : 'no'} (${transcript.authProvider || 'guest'})`,
      `Redacted: ${transcript.redacted ? 'yes' : 'no'}`,
      `Reviewed by: ${transcript.reviewedBy || '-'}`,
      `Reviewed at: ${formatTime(transcript.reviewedAt)}`,
      '',
      'User input:',
      transcript.prompt || '-',
      '',
      'Current CAIt answer:',
      transcript.answer || '-',
      '',
      'Expected next handling:',
      transcript.expectedHandling || '-',
      '',
      'Improvement note:',
      transcript.improvementNote || '-'
    ].join('\n'));
    if (els.chatTranscriptExpectedHandling) els.chatTranscriptExpectedHandling.value = transcript.expectedHandling || '';
    if (els.chatTranscriptImprovementNote) els.chatTranscriptImprovementNote.value = transcript.improvementNote || '';
  }
  function setFeedbackDetail(report) {
    if (!els.feedbackDetail) return;
    if (!report) {
      safeText(els.feedbackDetail, 'Select a feedback report.');
      return;
    }
    safeText(els.feedbackDetail, [
      `Title: ${report.title || '-'}`,
      `Type: ${String(report.type || '-').toUpperCase()}`,
      `Status: ${String(report.status || '-').toUpperCase()}`,
      `Created: ${formatTime(report.createdAt)}`,
      `Reporter: ${report.reporterLogin || report.email || 'anonymous'}`,
      `Page: ${report.context?.pagePath || '-'}`,
      `Tab: ${report.context?.currentTab || '-'}`,
      `Source: ${report.context?.source || '-'}`,
      `Reviewed by: ${report.reviewedBy || '-'}`,
      `Reviewed at: ${formatTime(report.reviewedAt)}`,
      `Resolution note: ${report.resolutionNote || '-'}`,
      '',
      'Message:',
      report.message || '-'
    ].join('\n'));
  }
  function renderFeedbackForm(auth = state.snapshot?.auth || {}) {
    if (!els.submitFeedbackBtn) return;
    setButtonAccess(els.submitFeedbackBtn, true);
    if (auth?.user?.email && !String(els.feedbackEmail?.value || '').trim()) {
      setInputValue(els.feedbackEmail, auth.user.email);
    }
    if (!String(els.feedbackSubmitResult?.textContent || '').trim()) {
      safeText(els.feedbackSubmitResult, 'Send a bug report or product request here. It will be stored in DB and forwarded to support@aiagent-marketplace.net.');
    }
  }
  function renderFeedbackReports(reports = [], auth = state.snapshot?.auth || {}) {
    const canReview = Boolean(auth?.loggedIn && auth?.user?.login && auth?.canReviewFeedbackReports);
    if (!els.feedbackSummaryCard || !els.feedbackTable || !els.feedbackDetail) return;
    if (!canReview) {
      state.selectedFeedbackId = null;
      safeText(els.feedbackSummaryCard, auth?.loggedIn ? 'Reports are only visible to operators.' : 'Login required to review feedback reports.');
      els.feedbackSummaryCard.className = 'detail-box action-card warn compact-card';
      els.feedbackTable.innerHTML = `<div class="empty">${auth?.loggedIn ? 'Reports are only visible to operators.' : 'Login to review reports.'}</div>`;
      safeText(els.feedbackDetail, auth?.loggedIn ? 'Reports are only visible to operators.' : 'Select a feedback report.');
      setButtonAccess(els.feedbackReviewingBtn, false);
      setButtonAccess(els.feedbackResolvedBtn, false);
      setButtonAccess(els.feedbackReopenBtn, false);
      return;
    }
    const safeReports = Array.isArray(reports) ? [...reports] : [];
    const openCount = safeReports.filter((report) => report.status === 'open').length;
    const reviewingCount = safeReports.filter((report) => report.status === 'reviewing').length;
    const resolvedCount = safeReports.filter((report) => report.status === 'resolved').length;
    const latest = safeReports[0] || null;
    safeText(els.feedbackSummaryCard, [
      `Open: ${openCount}`,
      `Reviewing: ${reviewingCount}`,
      `Resolved: ${resolvedCount}`,
      `Latest: ${latest ? `${latest.title} (${sinceLabel(latest.createdAt)})` : 'none'}`
    ].join('\n'));
    els.feedbackSummaryCard.className = openCount ? 'detail-box action-card warn compact-card' : 'detail-box action-card ok compact-card';
    if (!safeReports.length) {
      state.selectedFeedbackId = null;
      els.feedbackTable.innerHTML = '<div class="empty">No feedback reports yet.</div>';
      safeText(els.feedbackDetail, 'No feedback reports yet.');
      setButtonAccess(els.feedbackReviewingBtn, false);
      setButtonAccess(els.feedbackResolvedBtn, false);
      setButtonAccess(els.feedbackReopenBtn, false);
      return;
    }
    if (!safeReports.some((report) => report.id === state.selectedFeedbackId)) {
      state.selectedFeedbackId = safeReports[0]?.id || null;
    }
    els.feedbackTable.innerHTML = `<div class="table-header feedback-grid"><div>TITLE</div><div>REPORTER</div><div>STATUS</div><div>TIME</div></div>${safeReports.map((report) => `
      <div class="table-row feedback-grid ${state.selectedFeedbackId === report.id ? 'selected-row' : ''}" data-feedback-id="${report.id}">
        <div>${escapeHtml(report.title || '-')}<div class="row-muted">${String(report.type || 'bug').toUpperCase()} · ${escapeHtml((report.context?.pagePath || '/').slice(0, 48))}</div></div>
        <div>${escapeHtml(report.reporterLogin || report.email || 'anonymous')}<div class="row-muted">${escapeHtml(report.context?.currentTab || report.context?.source || '-')}</div></div>
        <div><span class="status-pill ${report.status === 'resolved' ? 'ok' : report.status === 'reviewing' ? 'info' : 'warn'}">${String(report.status || 'open').toUpperCase()}</span><div class="row-muted">${escapeHtml((report.message || '').slice(0, 64) || '-')}</div></div>
        <div>${sinceLabel(report.createdAt)}<div class="row-muted">${formatTime(report.createdAt)}</div></div>
      </div>
    `).join('')}`;
    [...els.feedbackTable.querySelectorAll('[data-feedback-id]')].forEach((row) => {
      row.onclick = () => {
        state.selectedFeedbackId = row.dataset.feedbackId || null;
        renderFeedbackReports(state.snapshot?.feedbackReports || [], auth);
      };
    });
    const selected = selectedFeedbackReport();
    setFeedbackDetail(selected);
    const canAct = Boolean(selected);
    setButtonAccess(els.feedbackReviewingBtn, canAct);
    setButtonAccess(els.feedbackResolvedBtn, canAct);
    setButtonAccess(els.feedbackReopenBtn, canAct);
  }
  function renderConversionAnalytics(analytics = null, auth = state.snapshot?.auth || {}) {
    const canReview = Boolean(auth?.loggedIn && auth?.user?.login && auth?.canReviewFeedbackReports);
    if (!els.conversionSummaryCard || !els.conversionFunnelTable || !els.conversionRecentEvents) return;
    if (!canReview) {
      safeText(els.conversionSummaryCard, auth?.loggedIn ? 'Funnel analytics are only visible to operators.' : 'Login required to review funnel analytics.');
      els.conversionSummaryCard.className = 'detail-box action-card warn compact-card';
      els.conversionFunnelTable.innerHTML = `<div class="empty">${auth?.loggedIn ? 'Operator access required.' : 'Login to review conversion analytics.'}</div>`;
      safeText(els.conversionRecentEvents, 'No conversion analytics visible.');
      return;
    }
    const actuals = analytics?.actuals || {};
    const pageViews = (analytics?.funnel || []).find((row) => row.event === 'page_view') || {};
    const chatMessages = (analytics?.funnel || []).find((row) => row.event === 'chat_message_sent') || {};
    const orders = (analytics?.funnel || []).find((row) => row.event === 'order_created') || {};
    const agentStarts = (analytics?.funnel || []).find((row) => row.event === 'agent_publish_started') || {};
    renderSummaryRows(els.conversionSummaryCard, [
      { label: 'Tracked visitors', value: `${pageViews.uniqueVisitors || 0}` },
      { label: 'Chat messages 24h / 7d', value: `${chatMessages.last24h || 0} / ${chatMessages.last7d || 0}` },
      { label: 'Orders 24h / 7d', value: `${orders.last24h || 0} / ${orders.last7d || 0}` },
      { label: 'Agent publish starts 24h / 7d', value: `${agentStarts.last24h || 0} / ${agentStarts.last7d || 0}` },
      { label: 'Actual accounts 24h / 7d / total', value: `${actuals.accounts?.last24h || 0} / ${actuals.accounts?.last7d || 0} / ${actuals.accounts?.total || 0}` },
      { label: 'Actual orders 24h / 7d / total', value: `${actuals.orders?.last24h || 0} / ${actuals.orders?.last7d || 0} / ${actuals.orders?.total || 0}` },
      { label: 'User agents current', value: `${actuals.userAgents?.total || 0}` }
    ]);
    els.conversionSummaryCard.className = 'detail-box action-card info compact-card';
    const rows = Array.isArray(analytics?.funnel) ? analytics.funnel : [];
    els.conversionFunnelTable.innerHTML = `<div class="table-header conversion-grid"><div>EVENT</div><div>24H</div><div>7D</div><div>TOTAL</div><div>VISITORS</div><div>LAST SEEN</div></div>${rows.map((row) => `
      <div class="table-row conversion-grid">
        <div>${escapeHtml(row.label || row.event || '-')}<div class="row-muted">${escapeHtml(row.event || '-')}</div></div>
        <div>${Number(row.last24h || 0)}</div>
        <div>${Number(row.last7d || 0)}</div>
        <div>${Number(row.total || 0)}</div>
        <div>${Number(row.uniqueVisitors || 0)}</div>
        <div>${row.lastSeenAt ? sinceLabel(row.lastSeenAt) : '-'}<div class="row-muted">${escapeHtml(formatTime(row.lastSeenAt))}</div></div>
      </div>
    `).join('')}`;
    const recent = Array.isArray(analytics?.recent) ? analytics.recent : [];
    safeText(els.conversionRecentEvents, recent.length
      ? recent.map((event) => [
          `${formatTime(event.ts)} · ${event.label || event.event}`,
          `visitor=${event.visitor || '-'} login=${event.loggedIn ? 'yes' : 'no'} auth=${event.authProvider || 'guest'} tab=${event.tab || '-'}`,
          `source=${event.source || '-'} page=${event.pagePath || '/'}${event.promptChars ? ` promptChars=${event.promptChars}` : ''}${event.status ? ` status=${event.status}` : ''}`
        ].join('\n')).join('\n\n')
      : 'No conversion events recorded yet.');
  }
  function renderChatTranscripts(transcripts = [], auth = state.snapshot?.auth || {}) {
    const canReview = Boolean(auth?.loggedIn && auth?.user?.login && auth?.canReviewFeedbackReports);
    if (!els.chatTranscriptSummaryCard || !els.chatTranscriptRecent || !els.chatTranscriptTable || !els.chatTranscriptDetail) return;
    if (!canReview) {
      state.selectedChatTranscriptId = null;
      safeText(els.chatTranscriptSummaryCard, auth?.loggedIn ? 'Chat transcripts are only visible to operators.' : 'Login required to review chat transcripts.');
      els.chatTranscriptSummaryCard.className = 'detail-box action-card warn compact-card';
      els.chatTranscriptTable.innerHTML = `<div class="empty">${auth?.loggedIn ? 'Operator access required.' : 'Login to review chat transcripts.'}</div>`;
      setChatTranscriptDetail(null);
      safeText(els.chatTranscriptRecent, 'No chat transcripts visible.');
      setButtonAccess(els.chatTranscriptReviewingBtn, false);
      setButtonAccess(els.chatTranscriptFixedBtn, false);
      setButtonAccess(els.chatTranscriptIgnoreBtn, false);
      setButtonAccess(els.chatTrainingExportBtn, false);
      safeText(els.chatTrainingExportResult, 'Operator access required to export reviewed training data.');
      return;
    }
    const safeTranscripts = Array.isArray(transcripts) ? transcripts : [];
    const last24h = safeTranscripts.filter((item) => {
      const ms = Date.parse(item.createdAt || '');
      return Number.isFinite(ms) && Date.now() - ms <= 24 * 60 * 60 * 1000;
    }).length;
    const redactedCount = safeTranscripts.filter((item) => item.redacted).length;
    const newCount = safeTranscripts.filter((item) => (item.reviewStatus || 'new') === 'new').length;
    const reviewingCount = safeTranscripts.filter((item) => item.reviewStatus === 'reviewing').length;
    const fixedCount = safeTranscripts.filter((item) => item.reviewStatus === 'fixed').length;
    const latest = safeTranscripts[0] || null;
    renderSummaryRows(els.chatTranscriptSummaryCard, [
      { label: 'Saved chats 24h / total', value: `${last24h} / ${safeTranscripts.length}` },
      { label: 'New / reviewing / fixed', value: `${newCount} / ${reviewingCount} / ${fixedCount}` },
      { label: 'Redacted or truncated', value: `${redactedCount}` },
      { label: 'Latest', value: latest ? `${sinceLabel(latest.createdAt)} · ${latest.answerKind || latest.status || 'chat'}` : 'none' }
    ]);
    els.chatTranscriptSummaryCard.className = 'detail-box action-card info compact-card';
    if (!safeTranscripts.length) {
      state.selectedChatTranscriptId = null;
      els.chatTranscriptTable.innerHTML = '<div class="empty">No chat transcripts recorded yet.</div>';
      setChatTranscriptDetail(null);
      safeText(els.chatTranscriptRecent, 'No chat transcripts recorded yet.');
      setButtonAccess(els.chatTranscriptReviewingBtn, false);
      setButtonAccess(els.chatTranscriptFixedBtn, false);
      setButtonAccess(els.chatTranscriptIgnoreBtn, false);
      setButtonAccess(els.chatTrainingExportBtn, true);
      return;
    }
    if (!safeTranscripts.some((item) => item.id === state.selectedChatTranscriptId)) {
      state.selectedChatTranscriptId = safeTranscripts.find((item) => (item.reviewStatus || 'new') === 'new')?.id || safeTranscripts[0]?.id || null;
    }
    els.chatTranscriptTable.innerHTML = `<div class="table-header chat-transcript-grid"><div>STATUS</div><div>TASK</div><div>USER INPUT</div><div>TIME</div></div>${safeTranscripts.slice(0, 80).map((item) => {
      const status = String(item.reviewStatus || 'new');
      const tone = status === 'fixed' ? 'ok' : status === 'reviewing' ? 'info' : status === 'ignored' ? 'muted' : 'warn';
      return `
        <div class="table-row chat-transcript-grid ${state.selectedChatTranscriptId === item.id ? 'selected-row' : ''}" data-chat-transcript-id="${escapeHtml(item.id)}">
          <div><span class="status-pill ${tone}">${status.toUpperCase()}</span><div class="row-muted">${escapeHtml(item.answerKind || item.status || 'chat')}</div></div>
          <div>${escapeHtml(item.taskType || '-')}<div class="row-muted">${escapeHtml(item.source || 'work_chat')}</div></div>
          <div>${escapeHtml((item.prompt || '-').slice(0, 110))}<div class="row-muted">${escapeHtml((item.improvementNote || item.expectedHandling || '').slice(0, 90) || 'No improvement note yet')}</div></div>
          <div>${sinceLabel(item.createdAt)}<div class="row-muted">${escapeHtml(formatTime(item.createdAt))}</div></div>
        </div>
      `;
    }).join('')}`;
    [...els.chatTranscriptTable.querySelectorAll('[data-chat-transcript-id]')].forEach((row) => {
      row.onclick = () => {
        state.selectedChatTranscriptId = row.dataset.chatTranscriptId || null;
        renderChatTranscripts(state.snapshot?.chatTranscripts || [], auth);
      };
    });
    const selected = selectedChatTranscript();
    setChatTranscriptDetail(selected);
    const canAct = Boolean(selected);
    setButtonAccess(els.chatTranscriptReviewingBtn, canAct);
    setButtonAccess(els.chatTranscriptFixedBtn, canAct);
    setButtonAccess(els.chatTranscriptIgnoreBtn, canAct);
    setButtonAccess(els.chatTrainingExportBtn, true);
    safeText(els.chatTranscriptRecent, safeTranscripts.length
      ? safeTranscripts.slice(0, 12).map((item) => [
          `${formatTime(item.createdAt)} · ${String(item.reviewStatus || 'new').toUpperCase()} · ${item.answerKind || item.status || 'chat'} · visitor=${item.visitorId || item.accountHash || '-'}`,
          `login=${item.loggedIn ? 'yes' : 'no'} auth=${item.authProvider || 'guest'} tab=${item.tab || '-'} task=${item.taskType || '-'}`,
          `chars prompt=${item.promptChars || 0} answer=${item.answerChars || 0}${item.redacted ? ' redacted=yes' : ''}`,
          `expected=${item.expectedHandling || '-'}`,
          `note=${item.improvementNote || '-'}`,
          'USER:',
          item.prompt || '-',
          'CAIt:',
          item.answer || '-'
        ].join('\n')).join('\n\n---\n\n')
      : 'No chat transcripts recorded yet.');
  }
  function setAdminDetail(title, value) {
    if (!els.adminDetail) return;
    safeText(els.adminDetail, `${title}\n\n${JSON.stringify(value || {}, null, 2)}`);
  }
  function adminChatSessionDetailText(chat = {}) {
    const turns = Array.isArray(chat.turns) && chat.turns.length ? chat.turns : [chat];
    const lines = [
      'CHAT SESSION DETAIL',
      '',
      `Session: ${chat.sessionId || chat.id || '-'}`,
      `Segment: ${chat.adminSegmentLabel || chat.adminSegment || chat.authProvider || '-'}`,
      `Handling: ${chat.handlingLabel || chat.handlingStatus || '-'}`,
      `Started: ${formatTime(chat.startedAt || chat.createdAt)}`,
      `Updated: ${formatTime(chat.updatedAt || chat.createdAt)}`,
      `Turns: ${chat.turnCount || turns.length}`,
      `Active order: ${chat.linkedOrderId || (Array.isArray(chat.activeJobIds) && chat.activeJobIds.length ? chat.activeJobIds.join(', ') : '-')}`,
      ''
    ];
    turns.forEach((turn, index) => {
      lines.push(
        `#${index + 1} ${formatTime(turn.createdAt || chat.createdAt)} · ${String(turn.answerKind || turn.status || 'chat').toUpperCase()} · task=${turn.taskType || chat.latestTaskType || '-'}`,
        `Review: ${turn.reviewStatus || chat.latestReviewStatus || 'new'}${turn.redacted ? ' · redacted' : ''}`,
        'USER:',
        turn.prompt || '-',
        'CAIt:',
        turn.answer || '-'
      );
      if (turn.expectedHandling) lines.push('Expected handling:', turn.expectedHandling);
      if (turn.improvementNote) lines.push('Improvement note:', turn.improvementNote);
      lines.push('');
    });
    return lines.join('\n').trim();
  }
  function setAdminChatSessionDetail(chat = {}) {
    const detailText = adminChatSessionDetailText(chat);
    safeText(els.adminDetail, detailText);
    safeText(els.adminChatSessionDetail, detailText);
  }
  function renderAdminRows(container, gridClass, headers = [], rows = [], emptyText = 'No records yet.') {
    if (!container) return;
    if (!rows.length) {
      container.innerHTML = `<div class="empty">${escapeHtml(emptyText)}</div>`;
      return;
    }
    container.innerHTML = [
      `<div class="table-header ${gridClass}">${headers.map((header) => `<div>${escapeHtml(header)}</div>`).join('')}</div>`,
      ...rows.map((row) => `<div class="table-row ${gridClass}" data-admin-kind="${escapeHtml(row.kind)}" data-admin-index="${row.index}" data-admin-key="${escapeHtml(row.key || '')}">${row.cells.map((cell) => `<div>${cell}</div>`).join('')}</div>`)
    ].join('');
    [...container.querySelectorAll('[data-admin-kind]')].forEach((node) => {
      node.onclick = () => {
        const kind = node.dataset.adminKind || '';
        const index = Number(node.dataset.adminIndex || 0);
        const key = String(node.dataset.adminKey || '').trim();
        const source = state.snapshot?.adminDashboard?.[kind] || [];
        const item = key
          ? (source.find((entry) => [entry?.id, entry?.sessionId].map((value) => String(value || '')).includes(key)) || source[index] || {})
          : (source[index] || {});
        [...container.querySelectorAll('.selected-row')].forEach((row) => row.classList.remove('selected-row'));
        node.classList.add('selected-row');
        if (kind === 'chats') {
          setAdminChatSessionDetail(item);
          return;
        }
        setAdminDetail(`${kind.toUpperCase()} DETAIL`, item);
      };
    });
  }
  const ADMIN_PAGE_SIZES = {
    accounts: 80,
    orders: 80,
    chats: 80,
    agents: 80,
    reports: 80,
    events: 100
  };
  function adminPageSize(kind = '') {
    return Number(ADMIN_PAGE_SIZES[kind] || 80);
  }
  function adminPageIndex(kind = '') {
    const raw = Number(state.adminPages?.[kind] || 0);
    return Number.isFinite(raw) && raw >= 0 ? Math.floor(raw) : 0;
  }
  function paginateAdminItems(kind = '', items = []) {
    const source = Array.isArray(items) ? items : [];
    const pageSize = adminPageSize(kind);
    const totalItems = source.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const currentPage = Math.min(adminPageIndex(kind), Math.max(0, totalPages - 1));
    if (!state.adminPages || typeof state.adminPages !== 'object') state.adminPages = {};
    state.adminPages[kind] = currentPage;
    const start = currentPage * pageSize;
    const visibleItems = source.slice(start, start + pageSize);
    return {
      items: visibleItems,
      start,
      end: start + visibleItems.length,
      pageSize,
      currentPage,
      totalItems,
      totalPages
    };
  }
  function renderAdminPager(container, kind = '', page = null) {
    if (!container) return;
    const data = page && typeof page === 'object' ? page : paginateAdminItems(kind, []);
    if (!data.totalItems) {
      container.hidden = true;
      container.innerHTML = '';
      return;
    }
    container.hidden = false;
    container.innerHTML = [
      `<span class="admin-pager-summary">${escapeHtml(`${data.start + 1}-${data.end} of ${data.totalItems} · page ${data.currentPage + 1}/${data.totalPages}`)}</span>`,
      '<div class="helper-row">',
      `<button type="button" class="mini-btn" data-admin-page-kind="${escapeHtml(kind)}" data-admin-page-direction="prev"${data.currentPage <= 0 ? ' disabled' : ''}>PREV</button>`,
      `<button type="button" class="mini-btn" data-admin-page-kind="${escapeHtml(kind)}" data-admin-page-direction="next"${data.currentPage >= data.totalPages - 1 ? ' disabled' : ''}>NEXT</button>`,
      '</div>'
    ].join('');
    [...container.querySelectorAll('[data-admin-page-kind]')].forEach((button) => {
      button.onclick = () => {
        const direction = button.dataset.adminPageDirection || 'next';
        const delta = direction === 'prev' ? -1 : 1;
        state.adminPages[kind] = Math.max(0, adminPageIndex(kind) + delta);
        renderAdminDashboard(state.snapshot?.adminDashboard || null, state.snapshot?.auth || {});
      };
    });
  }
  const ADMIN_CHAT_FILTERS = {
    needsReview: (chat) => chat?.adminSegment !== 'mine' && chat?.handlingStatus === 'needs_review',
    handled: (chat) => chat?.adminSegment !== 'mine' && chat?.handlingStatus !== 'needs_review',
    nonMine: (chat) => chat?.adminSegment !== 'mine',
    guest: (chat) => chat?.adminSegment === 'guest_unknown',
    other: (chat) => chat?.adminSegment === 'other_account',
    mine: (chat) => chat?.adminSegment === 'mine',
    all: () => true
  };
  function activeAdminChatFilter() {
    return ADMIN_CHAT_FILTERS[state.adminChatFilter] ? state.adminChatFilter : 'all';
  }
  function adminChatFilterCounts(dashboard = state.snapshot?.adminDashboard || null) {
    const summary = dashboard?.summary?.chats || {};
    return {
      needsReview: Number(summary.needsReviewNonMine || 0),
      handled: Number(summary.handledNonMine || 0),
      nonMine: Number(summary.nonMine || 0),
      guest: Number(summary.guestUnknown || 0),
      other: Number(summary.otherLoggedIn || 0),
      mine: Number(summary.mine || 0),
      all: Number(summary.total || 0)
    };
  }
  function renderAdminChatFilterButtons(dashboard = state.snapshot?.adminDashboard || null) {
    const active = activeAdminChatFilter();
    const counts = adminChatFilterCounts(dashboard);
    [
      [els.adminChatFilterNeedsReviewBtn, 'needsReview', 'NEEDS REVIEW'],
      [els.adminChatFilterHandledBtn, 'handled', 'HANDLED'],
      [els.adminChatFilterNonMineBtn, 'nonMine', 'NON-ME'],
      [els.adminChatFilterGuestBtn, 'guest', 'GUEST / UNKNOWN'],
      [els.adminChatFilterOtherBtn, 'other', 'OTHER LOGIN'],
      [els.adminChatFilterMineBtn, 'mine', 'MY LOGIN'],
      [els.adminChatFilterAllBtn, 'all', 'ALL']
    ].forEach(([button, filter, label]) => {
      if (!button) return;
      button.classList.toggle('active', active === filter);
      button.textContent = `${label} ${counts[filter] ?? 0}`;
    });
  }
  function adminChatHandlingClass(chat = {}) {
    if (chat.handlingNeedsReview || chat.handlingStatus === 'needs_review') return 'error';
    if (chat.handlingStatus === 'clarified') return 'warn';
    if (chat.handlingStatus === 'order_brief_prepared') return 'ok';
    return 'info';
  }
  function setAdminChatFilter(filter = 'all') {
    state.adminChatFilter = ADMIN_CHAT_FILTERS[filter] ? filter : 'all';
    state.adminPages.chats = 0;
    renderAdminDashboard(state.snapshot?.adminDashboard || null, state.snapshot?.auth || {});
  }
  function renderAdminDashboard(dashboard = null, auth = state.snapshot?.auth || {}) {
    const isAdmin = Boolean(auth?.isPlatformAdmin && dashboard);
    if (!els.adminAccessCard) return;
    if (!isAdmin) {
      safeText(els.adminAccessCard, auth?.loggedIn ? 'Admin dashboard is only visible to the platform admin login.' : 'Login as platform admin to view this dashboard.');
      els.adminAccessCard.className = 'detail-box action-card warn compact-card';
      safeText(els.adminChatSegmentationCard, 'Admin access required.');
      [els.adminAccountsTable, els.adminOrdersTable, els.adminChatTable, els.adminAgentsTable, els.adminFeedbackTable, els.adminEventsTable].forEach((node) => {
        if (node) node.innerHTML = '<div class="empty">Admin access required.</div>';
      });
      [els.adminAccountsPager, els.adminOrdersPager, els.adminChatPager, els.adminAgentsPager, els.adminFeedbackPager, els.adminEventsPager].forEach((node) => {
        if (!node) return;
        node.hidden = true;
        node.innerHTML = '';
      });
      safeText(els.adminAccountsMetric, '-');
      safeText(els.adminChatsMetric, '-');
      safeText(els.adminOrdersMetric, '-');
      safeText(els.adminAgentsMetric, '-');
      safeText(els.adminIssuesMetric, '-');
      safeText(els.adminActiveMetric, '-');
      safeText(els.adminDetail, 'Admin access required.');
      safeText(els.adminChatSessionDetail, 'Admin access required.');
      renderAdminChatFilterButtons();
      return;
    }
    const summary = dashboard.summary || {};
    safeText(els.adminAccountsMetric, summary.accounts?.total || 0);
    safeText(els.adminChatsMetric, summary.chats?.total || 0);
    safeText(els.adminOrdersMetric, summary.orders?.total || 0);
    safeText(els.adminAgentsMetric, summary.agents?.total ?? 0);
    safeText(els.adminIssuesMetric, summary.reports?.open || 0);
    safeText(els.adminActiveMetric, summary.orders?.active || 0);
    renderSummaryRows(els.adminAccessCard, [
      { label: 'Generated', value: formatTime(dashboard.generatedAt) },
      { label: 'Operator', value: dashboard.operator || auth.login || '-' },
      { label: 'Accounts 24h / 7d / total', value: `${summary.accounts?.last24h || 0} / ${summary.accounts?.last7d || 0} / ${summary.accounts?.total || 0}` },
      { label: 'Chat sessions 24h / 7d / total', value: `${summary.chats?.last24h || 0} / ${summary.chats?.last7d || 0} / ${summary.chats?.total || 0}` },
      { label: 'Chat turns total', value: `${summary.chats?.turnsTotal || 0}` },
      { label: 'Agents total / user / ready', value: `${summary.agents?.total || 0} / ${summary.agents?.userAgents || 0} / ${summary.agents?.ready || 0}` },
      { label: 'Orders active / completed / failed', value: `${summary.orders?.active || 0} / ${summary.orders?.completed || 0} / ${summary.orders?.failed || 0}` },
      { label: 'Issues open / reviewing / resolved', value: `${summary.reports?.open || 0} / ${summary.reports?.reviewing || 0} / ${summary.reports?.resolved || 0}` },
      { label: 'Provider billing accounts / retrying / notified', value: `${summary.providerBilling?.accounts || 0} / ${summary.providerBilling?.retrying || 0} / ${summary.providerBilling?.notified || 0}` }
    ]);
    els.adminAccessCard.className = 'detail-box action-card info compact-card';
    const chatHandling = dashboard.chatHandling || {};
    const chatStatusCounts = chatHandling.byStatus || {};
    renderSummaryRows(els.adminChatSegmentationCard, [
      { label: 'My logged-in sessions', value: summary.chats?.mine || 0 },
      { label: 'Other logged-in sessions', value: summary.chats?.otherLoggedIn || 0 },
      { label: 'Guest / unknown sessions', value: summary.chats?.guestUnknown || 0 },
      { label: 'Non-me handled / total', value: `${summary.chats?.handledNonMine || 0} / ${summary.chats?.nonMine || 0}` },
      { label: 'Needs review sessions', value: summary.chats?.needsReviewNonMine || 0 },
      { label: 'Handling breakdown', value: Object.entries(chatStatusCounts).map(([key, value]) => `${key}:${value}`).join(' · ') || '-' }
    ]);
    els.adminChatSegmentationCard.className = `detail-box action-card ${summary.chats?.needsReviewNonMine ? 'warn' : 'info'} compact-card`;
    renderAdminChatFilterButtons(dashboard);
    const accounts = dashboard.accounts || [];
    const pagedAccounts = paginateAdminItems('accounts', accounts.map((account, index) => ({ account, index })));
    renderAdminRows(els.adminAccountsTable, 'admin-accounts-grid', ['LOGIN', 'AUTH', 'BILLING', 'UPDATED'], pagedAccounts.items.map(({ account, index }) => ({
      kind: 'accounts',
      index,
      cells: [
        `${escapeHtml(account.login || '-')}<div class="row-muted">${escapeHtml(account.email || account.displayName || '-')}</div>`,
        `${escapeHtml((account.linkedProviders || []).join(', ') || account.authProvider || '-')}<div class="row-muted">keys ${account.apiKeys?.active || 0}/${account.apiKeys?.total || 0} · repos ${account.githubRepos || 0}</div>`,
        `${yen(account.arrearsTotal || 0)} due<div class="row-muted">welcome ${yen(account.welcomeCreditsBalance || 0)}</div>`,
        `${sinceLabel(account.updatedAt || account.createdAt)}<div class="row-muted">${escapeHtml(formatTime(account.createdAt))} · provider retry ${escapeHtml(String(account.providerMonthlyRetryCount || 0))}${account.providerMonthlyLastNotificationPeriod ? ` · notified ${escapeHtml(account.providerMonthlyLastNotificationPeriod)}` : ''}</div>`
      ]
    })), 'No member registrations yet.');
    renderAdminPager(els.adminAccountsPager, 'accounts', pagedAccounts);
    const orders = dashboard.orders || [];
    const pagedOrders = paginateAdminItems('orders', orders.map((job, index) => ({ job, index })));
    renderAdminRows(els.adminOrdersTable, 'admin-orders-grid', ['ORDER', 'REQUESTER', 'STATUS', 'COST'], pagedOrders.items.map(({ job, index }) => ({
      kind: 'orders',
      index,
      cells: [
        `${escapeHtml(job.taskType || '-')}<div class="row-muted">${escapeHtml((job.prompt || '-').slice(0, 70))}</div>`,
        `${escapeHtml(job.requesterLogin || '-')}<div class="row-muted">${escapeHtml(job.assignedAgentId || job.parentAgentId || '-')}</div>`,
        `<span class="status-pill ${job.status === 'completed' ? 'ok' : ['failed', 'timed_out'].includes(job.status) ? 'error' : 'info'}">${escapeHtml(orderProgressStatusLabel(job.status).toUpperCase())}</span><div class="row-muted">${sinceLabel(job.createdAt)}</div>`,
        `${job.actualBilling ? yen(job.actualBilling.total || 0) : '-'}<div class="row-muted">platform ${job.actualBilling ? yen(job.actualBilling.platformRevenue || 0) : '-'}</div>`
      ]
    })), 'No orders yet.');
    renderAdminPager(els.adminOrdersPager, 'orders', pagedOrders);
    const chats = dashboard.chats || [];
    const chatFilter = activeAdminChatFilter();
    const allChatRows = chats
      .map((chat, index) => ({ chat, index }))
      .filter(({ chat }) => ADMIN_CHAT_FILTERS[chatFilter](chat));
    const pagedChats = paginateAdminItems('chats', allChatRows);
    renderAdminRows(els.adminChatTable, 'admin-chat-grid', ['TIME', 'USER INPUT', 'ANSWER', 'HANDLING'], pagedChats.items.map(({ chat, index }) => ({
      kind: 'chats',
      index,
      key: chat.id || chat.sessionId || '',
      cells: [
        `${sinceLabel(chat.createdAt)}<div class="row-muted">${escapeHtml(chat.adminSegmentLabel || chat.authProvider || 'guest')} · ${escapeHtml(chat.sessionId || chat.id || '-')}</div>`,
        `${escapeHtml((chat.prompt || '-').slice(0, 90))}<div class="row-muted">${escapeHtml(`${chat.turnCount || 1} turns`)} · task ${escapeHtml(chat.latestTaskType || chat.taskType || '-')}</div>`,
        `${escapeHtml((chat.answer || '-').slice(0, 90))}<div class="row-muted">started ${escapeHtml(formatTime(chat.startedAt || chat.createdAt))}${chat.recentPromptPreview ? ` · ${escapeHtml(chat.recentPromptPreview.slice(0, 110))}` : ''}</div>`,
        `<span class="status-pill ${adminChatHandlingClass(chat)}">${escapeHtml(String(chat.handlingLabel || chat.handlingStatus || 'needs_review').toUpperCase())}</span><div class="row-muted">review ${escapeHtml(chat.latestReviewStatus || chat.reviewStatus || 'new')} · ${chat.redacted ? 'redacted' : 'plain'}</div>`
      ]
    })), chatFilter === 'needsReview' ? 'No chats currently need review.' : `No chat history for ${chatFilter}.`);
    renderAdminPager(els.adminChatPager, 'chats', pagedChats);
    const agents = dashboard.agents || [];
    const pagedAgents = paginateAdminItems('agents', agents.map((agent, index) => ({ agent, index })));
    renderAdminRows(els.adminAgentsTable, 'admin-agents-grid', ['AGENT', 'OWNER', 'STATUS', 'PRICING'], pagedAgents.items.map(({ agent, index }) => ({
      kind: 'agents',
      index,
      cells: [
        `${escapeHtml(agent.name || '-')}<div class="row-muted">${escapeHtml((agent.taskTypes || []).join(', ') || '-')}</div>`,
        `${escapeHtml(agent.owner || '-')}<div class="row-muted">${escapeHtml(agent.productKind || 'agent')}</div>`,
        `<span class="status-pill ${agent.ready ? 'ok' : agent.online ? 'info' : 'warn'}">${agent.ready ? 'READY' : agent.online ? 'ONLINE' : 'OFFLINE'}</span><div class="row-muted">${escapeHtml(agent.verificationStatus || '-')} · ${escapeHtml(agent.agentReviewStatus || '-')}</div>`,
        `${formatPercent(agent.providerMarkupRate || 0)}<div class="row-muted">margin ${formatPercent(agent.platformMarginRate || 0)}</div>`
      ]
    })), 'No agents yet.');
    renderAdminPager(els.adminAgentsPager, 'agents', pagedAgents);
    const reports = dashboard.reports || [];
    const pagedReports = paginateAdminItems('reports', reports.map((report, index) => ({ report, index })));
    renderAdminRows(els.adminFeedbackTable, 'admin-feedback-grid', ['REPORT', 'REPORTER', 'STATUS', 'TIME'], pagedReports.items.map(({ report, index }) => ({
      kind: 'reports',
      index,
      cells: [
        `${escapeHtml(report.title || '-')}<div class="row-muted">${escapeHtml((report.message || '-').slice(0, 70))}</div>`,
        `${escapeHtml(report.reporterLogin || report.email || 'anonymous')}<div class="row-muted">${escapeHtml(report.context?.pagePath || '-')}</div>`,
        `<span class="status-pill ${report.status === 'resolved' ? 'ok' : report.status === 'reviewing' ? 'info' : 'warn'}">${escapeHtml(String(report.status || 'open').toUpperCase())}</span><div class="row-muted">${escapeHtml(report.type || 'bug')}</div>`,
        `${sinceLabel(report.createdAt)}<div class="row-muted">${escapeHtml(formatTime(report.createdAt))}</div>`
      ]
    })), 'No report issues yet.');
    renderAdminPager(els.adminFeedbackPager, 'reports', pagedReports);
    const events = dashboard.events || [];
    const pagedEvents = paginateAdminItems('events', events.map((event, index) => ({ event, index })));
    renderAdminRows(els.adminEventsTable, 'admin-events-grid', ['TIME', 'TYPE', 'MESSAGE'], pagedEvents.items.map(({ event, index }) => ({
      kind: 'events',
      index,
      cells: [
        `${sinceLabel(event.createdAt)}<div class="row-muted">${escapeHtml(formatTime(event.createdAt))}</div>`,
        `<span class="status-pill info">${escapeHtml(event.type || '-')}</span>`,
        `${escapeHtml(event.message || '-')}<div class="row-muted">${escapeHtml(JSON.stringify(event.meta || {}).slice(0, 90))}</div>`
      ]
    })), 'No system events yet.');
    renderAdminPager(els.adminEventsPager, 'events', pagedEvents);
    if (!String(els.adminDetail?.textContent || '').trim() || els.adminDetail.textContent === 'Admin access required.') {
      setAdminDetail('ADMIN SUMMARY', {
        summary: dashboard.summary,
        generatedAt: dashboard.generatedAt
      });
    }
  }

  async function submitFeedback() {
    const title = String(els.feedbackTitle?.value || '').trim();
    const message = String(els.feedbackMessage?.value || '').trim();
    if (!title && !message) throw new Error('Write a title or message first.');
    const payload = {
      type: els.feedbackType?.value || 'bug',
      email: els.feedbackEmail?.value || '',
      title,
      message,
      page_path: window.location.pathname,
      current_tab: state.currentTab,
      source: 'footer_form'
    };
    const result = await api('/api/feedback', { method: 'POST', body: JSON.stringify(payload) });
    safeText(els.feedbackSubmitResult, [
      `Saved: ${result.report?.title || 'feedback report'}`,
      `Email: ${result.email_forwarded ? 'forwarded to support@aiagent-marketplace.net' : `not forwarded (${result.email_status || 'not_configured'})`}`,
      `Type: ${String(result.report?.type || 'bug').toUpperCase()}`,
      `Status: ${String(result.report?.status || 'open').toUpperCase()}`,
      `Created: ${formatTime(result.report?.createdAt)}`
    ].join('\n'));
    if (els.feedbackTitle) els.feedbackTitle.value = '';
    if (els.feedbackMessage) els.feedbackMessage.value = '';
    if (els.feedbackType) els.feedbackType.value = 'bug';
    flash('Feedback report saved.', 'ok');
    void trackConversionEvent('feedback_submitted', { source: 'footer_form', status: result.report?.status || 'open' });
    if (state.snapshot?.auth?.loggedIn) await refresh();
  }
  async function updateSelectedFeedbackStatus(status) {
    const report = selectedFeedbackReport();
    if (!report) throw new Error('Select a feedback report first.');
    const result = await api(`/api/settings/feedback-reports/${encodeURIComponent(report.id)}`, {
      method: 'POST',
      body: JSON.stringify({ status })
    });
    flash(`Feedback ${String(result.report?.title || report.title || '').slice(0, 48)} marked ${String(status).toUpperCase()}.`, 'ok');
    await refresh();
  }
  async function updateSelectedChatTranscriptReview(reviewStatus) {
    const transcript = selectedChatTranscript();
    if (!transcript) throw new Error('Select a chat transcript first.');
    const expectedHandling = String(els.chatTranscriptExpectedHandling?.value || '').trim();
    const improvementNote = String(els.chatTranscriptImprovementNote?.value || '').trim();
    const result = await api(`/api/settings/chat-transcripts/${encodeURIComponent(transcript.id)}`, {
      method: 'POST',
      body: JSON.stringify({
        reviewStatus,
        expectedHandling,
        improvementNote
      })
    });
    flash(`Chat transcript marked ${String(result.transcript?.reviewStatus || reviewStatus).toUpperCase()}.`, 'ok');
    await refresh();
  }
  async function exportChatTrainingData() {
    const result = await api('/api/settings/chat-training-data');
    const examples = Array.isArray(result.examples) ? result.examples : [];
    const exportedAt = new Date().toISOString();
    const exportPayload = {
      ...result,
      exportedAt
    };
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json;charset=utf-8' });
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = `cait-chat-training-${exportedAt.slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
    safeText(els.chatTrainingExportResult, [
      `Exported ${examples.length} reviewed training examples.`,
      `Schema: ${result.schema || 'cait-chat-training-export/v1'}`,
      `Policy: ${result.policy?.source || 'Reviewed CAIt Chat transcripts only.'}`,
      'Download started as JSON.'
    ].join('\n'));
    flash(`Exported ${examples.length} reviewed chat examples.`, 'ok');
  }

  return {
    updateSelectedFeedbackStatus,
    updateSelectedChatTranscriptReview,
    submitFeedback,
    exportChatTrainingData,
    renderAdminDashboard,
    renderChatTranscripts,
    renderConversionAnalytics,
    renderFeedbackForm,
    renderFeedbackReports,
    selectedChatTranscript,
    selectedFeedbackReport,
    setAdminChatFilter
  };
}
