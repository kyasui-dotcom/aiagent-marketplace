export function createChatRestoredOrderContextController(options = {}) {
  const {
    state,
    compact,
    escapeHtml,
    taskLabel,
    statusDisplayLabel,
    shortDateTime,
    jobBlockedByLeaderQualityGate,
    isTerminalStatus,
    fetchVisibleJob,
    rememberTrackedOrder,
    orderErrorMessage,
    appendMessage,
    jobHasDeliveryResult,
    renderDeliveryOnce,
    startPolling
  } = options;

  function orderIdsFromText(value = '') {
    const text = String(value || '');
    const ids = [];
    const patterns = [
      /Order ID:\s*([0-9a-f]{8}-[0-9a-f-]{27,})/ig,
      /Order accepted\.[\s\S]{0,140}?([0-9a-f]{8}-[0-9a-f-]{27,})/ig
    ];
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text))) {
        const id = String(match[1] || '').trim();
        if (id) ids.push(id);
      }
    }
    return ids;
  }

  function restoredSessionHasActiveWork(session = {}, snapshot = {}) {
    return Boolean(
      session?.activeWork
      || snapshot?.activeWork
      || (Array.isArray(session?.activeJobIds) && session.activeJobIds.length)
      || (Array.isArray(snapshot?.activeJobIds) && snapshot.activeJobIds.length)
    );
  }

  function chatSessionOrderIds(session = {}, options = {}) {
    const relatedIds = Array.isArray(session.relatedOrderIds) ? session.relatedOrderIds : [];
    const activeIds = restoredSessionHasActiveWork(session)
      ? (Array.isArray(session.activeJobIds) ? session.activeJobIds : [])
      : [];
    const directIds = [
      ...activeIds,
      session.linkedOrderId,
      ...(options.includeRelatedHistory === true ? relatedIds : [])
    ].map((item) => String(item || '').trim()).filter(Boolean);
    if (!directIds.length && relatedIds.length) {
      directIds.push(String(relatedIds[0] || '').trim());
    }
    const max = options.includeRelatedHistory === true ? 8 : 1;
    return [...new Set(directIds)].filter(Boolean).slice(0, max);
  }

  function restoredSessionOrderCardHtml(job = {}) {
    const orderId = String(job.id || '').trim();
    const status = String(job.status || '').trim().toLowerCase();
    const qualityBlocked = jobBlockedByLeaderQualityGate(job);
    const terminal = isTerminalStatus(status) || qualityBlocked;
    const failed = ['failed', 'timed_out'].includes(status) || qualityBlocked;
    const completed = status === 'completed';
    const waiting = status === 'blocked' && !qualityBlocked;
    const active = !terminal && !waiting;
    const title = [
      taskLabel(job.taskType || job.workflowTask || 'work'),
      orderId ? `#${orderId.slice(0, 8)}` : ''
    ].filter(Boolean).join(' ');
    const summary = completed
      ? 'The delivery is rendered below. Use Show result only if you need to reload it.'
      : failed
        ? (job.failureReason || job.failure_reason || 'This order ended without a successful delivery.')
        : (waiting ? 'Waiting for approval or connector action.' : (job.prompt || 'Order details are available.'));
    const meta = [
      `Status: ${qualityBlocked ? 'blocked by quality gate' : statusDisplayLabel(status || 'created')}`,
      job.createdAt ? `Started: ${shortDateTime(job.createdAt)}` : '',
      job.completedAt ? `Completed: ${shortDateTime(job.completedAt)}` : '',
      job.failedAt ? `Failed: ${shortDateTime(job.failedAt)}` : '',
      job.timedOutAt ? `Timed out: ${shortDateTime(job.timedOutAt)}` : ''
    ].filter(Boolean).join(' / ');
    const hint = qualityBlocked
      ? 'This order is blocked by a leader quality gate. Review the failed specialist output before preparing a retry or repair.'
      : waiting
        ? 'This order is waiting for an approval or connector action. Review the requested action before continuing.'
        : active
          ? 'This order is still in progress. CAIt will resume polling from this chat.'
          : completed
            ? 'This order has a result. Review it here before scheduling or retrying.'
            : 'This order ended without a successful delivery. Review the reason before preparing a retry.';
    const actions = [
      orderId ? `<button class="ghost-btn inline-btn file-action" type="button" data-chat-order-open="${escapeHtml(orderId)}">${escapeHtml(terminal ? 'Show result' : 'Check status')}</button>` : '',
      orderId && terminal ? `<button class="ghost-btn inline-btn file-action" type="button" data-chat-order-retry="${escapeHtml(orderId)}">${escapeHtml(failed ? 'Retry as new order' : 'Run again as new order')}</button>` : '',
      orderId && completed ? `<button class="ghost-btn inline-btn file-action" type="button" data-chat-order-schedule="${escapeHtml(orderId)}">Schedule</button>` : ''
    ].filter(Boolean).join('');
    return [
      '<div class="restored-order-card">',
      `<strong>${escapeHtml(title || 'Related order')}</strong>`,
      meta ? `<div class="utility-meta">${escapeHtml(meta)}</div>` : '',
      summary ? `<div>${escapeHtml(compact(summary, 520))}</div>` : '<div>Order details are available. Open the result to inspect the delivery.</div>',
      actions ? `<div class="inline-actions">${actions}</div>` : '',
      `<span class="chat-hint">${escapeHtml(hint)}</span>`,
      '</div>'
    ].join('\n');
  }

  function restoredSessionOrderContextIsCurrent(sessionId = '', viewRevision = 0) {
    const safeSessionId = String(sessionId || '').trim();
    const safeRevision = Number(viewRevision || 0) || 0;
    if (safeRevision && Number(state.chatViewRevision || 0) !== safeRevision) return false;
    if (safeSessionId && String(state.currentChatSessionId || '').trim() !== safeSessionId) return false;
    return true;
  }

  async function renderRestoredSessionOrderContext(session = {}, options = {}) {
    const sessionId = String(options.sessionId || session.id || session.sessionId || '').trim();
    const viewRevision = Number(options.viewRevision || state.chatViewRevision || 0) || 0;
    if (!restoredSessionOrderContextIsCurrent(sessionId, viewRevision)) return;
    const ids = chatSessionOrderIds(session);
    if (!ids.length) return;
    for (const id of ids) rememberTrackedOrder(id);
    const settled = await Promise.allSettled(ids.map((id) => fetchVisibleJob(id)));
    if (!restoredSessionOrderContextIsCurrent(sessionId, viewRevision)) return;
    const jobs = settled
      .map((item) => item.status === 'fulfilled' ? item.value : null)
      .filter((job) => job?.id);
    const failures = settled
      .map((item, index) => item.status === 'rejected' ? `${ids[index].slice(0, 8)}: ${orderErrorMessage(item.reason)}` : '')
      .filter(Boolean);
    if (!jobs.length && !failures.length) return;
    const body = [
      '<strong>Restored order context</strong>',
      '<span class="chat-hint">This chat session has related order history. No new order was created.</span>',
      ...jobs.map(restoredSessionOrderCardHtml),
      failures.length ? `<div class="chat-hint">${escapeHtml(`Could not load: ${failures.join(' / ')}`)}</div>` : ''
    ].filter(Boolean).join('\n\n');
    appendMessage('system', body, { label: 'Order history', tone: jobs.some((job) => !jobHasDeliveryResult(job)) ? 'warn' : 'info', record: false });
    for (const job of jobs) {
      if (jobHasDeliveryResult(job)) renderDeliveryOnce(job);
    }
    const activeJob = jobs.find((job) => !jobHasDeliveryResult(job));
    const primary = activeJob || jobs[0] || null;
    if (primary?.id) {
      if (!restoredSessionOrderContextIsCurrent(sessionId, viewRevision)) return;
      state.orderId = primary.id;
      if (options.resumeActiveWork === true && restoredSessionHasActiveWork(session) && !isTerminalStatus(primary.status)) startPolling(primary.id);
    }
  }

  return {
    orderIdsFromText,
    chatSessionOrderIds,
    restoredSessionHasActiveWork,
    renderRestoredSessionOrderContext
  };
}
