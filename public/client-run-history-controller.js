export function createClientRunHistoryController(deps = {}) {
  const {
    state,
    els,
    orderHistoryPageSize = 50,
    escapeHtml,
    fundingBreakdownCompact,
    orderProgressStatusLabel,
    renderMarketingTimelineModal,
    requesterAccountIdOf,
    requesterLoginOf,
    requesterMatchesScope,
    requesterScopeForClient,
    runNextAction,
    safeCssToken,
    setDetail,
    sinceLabel,
    yen
  } = deps;

  function renderRunHealth(stats = {}) {
    if (!els?.runHealthSummary) return;
    const nextRetry = stats.nextRetryAt ? new Date(stats.nextRetryAt).toLocaleString('ja-JP') : '-';
    els.runHealthSummary.textContent = [
      `activeRuns: ${stats.activeJobs ?? 0}`,
      `retryableRuns: ${stats.retryableRuns ?? 0}`,
      `timedOutRuns: ${stats.timedOutRuns ?? 0}`,
      `terminalRuns: ${stats.terminalRuns ?? 0}`,
      `nextRetryAt: ${nextRetry}`,
      `failedRuns: ${stats.failedJobs ?? 0}`
    ].join('\n');
  }

  function renderStream(events = []) {
    if (!els?.stream) return;
    const q = String(state?.eventFilter || '').trim().toLowerCase();
    const loggedIn = Boolean(state?.snapshot?.auth?.loggedIn);
    const publicEvents = loggedIn
      ? events
      : events.filter((event) => !['FAILED', 'FAIL', 'ERROR', 'TIMEOUT', 'TIMED_OUT'].includes(String(event.type || '').toUpperCase()));
    const filtered = !q ? publicEvents : publicEvents.filter((event) => `${event.type} ${event.message}`.toLowerCase().includes(q));
    els.stream.innerHTML = '';
    if (!filtered.length) {
      els.stream.innerHTML = '<div class="empty">No public activity yet.</div>';
      return;
    }
    filtered.slice(-8).reverse().forEach((event) => {
      const row = document.createElement('div');
      row.className = 'log-line';
      const costText = event.meta?.settlement?.total
        ? ` · ${yen(event.meta.settlement.total)}`
        : event.meta?.billable?.totalCostBasis
          ? ` · basis ${yen(event.meta.billable.totalCostBasis)}`
          : '';
      const safeType = safeCssToken(event.type, 'info');
      row.innerHTML = `<span class="ts">${escapeHtml(new Date(event.ts).toLocaleTimeString('ja-JP'))}</span><span class="type-${safeType}">[${escapeHtml(event.type)}]</span> ${escapeHtml(event.message)}${escapeHtml(costText)}`;
      row.onclick = () => setDetail(event);
      els.stream.appendChild(row);
    });
  }

  function renderJobs(jobs = []) {
    if (!els?.jobsTable) return;
    const q = String(state?.runSearch || '').trim().toLowerCase();
    const auth = state?.snapshot?.auth || {};
    const requesterFilter = String(state?.runRequesterFilter || 'all').trim().toLowerCase();
    if (els.runRequesterFilter) {
      const requesterValues = [...new Set(jobs.map((job) => requesterLoginOf(job)).filter(Boolean))].sort();
      const options = auth?.isPlatformAdmin
        ? [
            { value: 'all', label: 'all visible' },
            { value: 'mine', label: 'my orders' },
            ...requesterValues.map((value) => ({ value, label: value }))
          ]
        : [
            { value: 'mine', label: 'my orders' }
          ];
      els.runRequesterFilter.innerHTML = options.map((option) => `<option value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</option>`).join('');
      els.runRequesterFilter.value = options.some((option) => option.value === requesterFilter) ? requesterFilter : (auth?.isPlatformAdmin ? 'all' : 'mine');
      state.runRequesterFilter = els.runRequesterFilter.value;
    }
    const requesterScope = requesterScopeForClient(auth);
    const filtered = jobs.filter((job) => {
      const hay = [job.id, job.taskType, job.status, job.assignedAgentId, job.failureReason, job.failureCategory, job.dispatch?.responseStatus, job.prompt].filter(Boolean).join(' ').toLowerCase();
      const matchesSearch = !q || hay.includes(q);
      const matchesRequester = requesterMatchesScope(requesterLoginOf(job), requesterAccountIdOf(job), requesterScope);
      return matchesSearch && matchesRequester;
    });
    const totalPages = Math.max(1, Math.ceil(filtered.length / orderHistoryPageSize));
    state.runPage = Math.min(Math.max(0, Number(state.runPage || 0) || 0), Math.max(0, totalPages - 1));
    const pageStart = state.runPage * orderHistoryPageSize;
    const paged = filtered.slice(pageStart, pageStart + orderHistoryPageSize);
    if (!filtered.length) {
      state.selectedJobId = null;
      els.jobsTable.innerHTML = '<div class="empty">No orders match the current filter.</div>';
      if (els.jobsPager) {
        els.jobsPager.hidden = true;
        els.jobsPager.innerHTML = '';
      }
      renderMarketingTimelineModal(null);
      return;
    }
    if (!filtered.some((job) => job.id === state.selectedJobId)) state.selectedJobId = null;
    els.jobsTable.innerHTML = `<div class="table-header runs-grid"><div>ORDER</div><div>STATUS</div><div>NEXT STEP</div></div>${paged.map((job) => {
      const nextAction = runNextAction(job);
      const runLabel = job.jobKind === 'workflow' ? 'agent-team' : (job.assignedAgentId ? job.assignedAgentId.slice(0, 12) : 'auto-routing');
      const safeNextTone = safeCssToken(nextAction.tone, 'info');
      const safeStatus = safeCssToken(job.status, 'info');
      const fundingSummary = fundingBreakdownCompact(job);
      const requesterLogin = requesterLoginOf(job) || '-';
      return `
    <div class="table-row runs-grid ${state.selectedJobId === job.id ? 'selected-row' : ''}" data-job-id="${escapeHtml(job.id)}">
      <div>${escapeHtml(job.id.slice(0, 8))}<div class="row-muted">${escapeHtml(`${job.taskType} · ${runLabel}`)}</div><div class="row-muted">${escapeHtml(`by ${requesterLogin}`)}</div></div>
      <div class="${safeStatus}">${escapeHtml(orderProgressStatusLabel(job.status).toUpperCase())}<div class="row-muted">${escapeHtml(fundingSummary || sinceLabel(job.createdAt))}</div></div>
      <div><span class="status-pill ${safeNextTone}">${escapeHtml(nextAction.title.replace('ACTION: ', '').replace('ORDER ', ''))}</span><div class="row-muted">${escapeHtml(job.failureReason || nextAction.body)}</div></div>
    </div>`;
    }).join('')}`;
    [...els.jobsTable.querySelectorAll('[data-job-id]')].forEach((row) => {
      row.onclick = () => {
        const job = jobs.find((item) => item.id === row.dataset.jobId);
        state.selectedJobId = job?.id || null;
        setDetail(job);
        renderJobs(state.snapshot?.jobs || []);
      };
    });
    if (els.jobsPager) {
      els.jobsPager.hidden = false;
      els.jobsPager.innerHTML = [
        `<span class="admin-pager-summary">${escapeHtml(`${pageStart + 1}-${pageStart + paged.length} of ${filtered.length} · page ${state.runPage + 1}/${totalPages}`)}</span>`,
        '<div class="helper-row">',
        `<button type="button" class="mini-btn" data-run-page-direction="prev"${state.runPage <= 0 ? ' disabled' : ''}>PREV</button>`,
        `<button type="button" class="mini-btn" data-run-page-direction="next"${state.runPage >= totalPages - 1 ? ' disabled' : ''}>NEXT</button>`,
        '</div>'
      ].join('');
      [...els.jobsPager.querySelectorAll('[data-run-page-direction]')].forEach((button) => {
        button.onclick = () => {
          state.runPage = Math.max(0, state.runPage + (button.dataset.runPageDirection === 'prev' ? -1 : 1));
          renderJobs(state.snapshot?.jobs || []);
        };
      });
    }
    renderMarketingTimelineModal(filtered.find((job) => job.id === state.selectedJobId) || null);
    const selected = filtered.find((job) => job.id === state.selectedJobId) || null;
    if (selected) setDetail(selected);
  }

  return {
    renderJobs,
    renderRunHealth,
    renderStream
  };
}
