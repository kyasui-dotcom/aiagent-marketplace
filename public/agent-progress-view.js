export function progressNarratorProgress(options = {}) {
  const explicit = Number(options.progressPercent ?? options.percent ?? options.progress?.percent);
  if (Number.isFinite(explicit)) {
    return { percent: Math.max(0, Math.min(100, Math.round(explicit))), known: true };
  }
  const total = Number(options.total ?? options.progress?.total);
  const completed = Number(options.completed ?? options.progress?.completed);
  if (Number.isFinite(total) && total > 0 && Number.isFinite(completed)) {
    const percent = Math.round((Math.max(0, completed) / total) * 100);
    return { percent: Math.max(options.done === true ? 100 : 6, Math.min(100, percent)), known: true };
  }
  return { percent: options.done === true ? 100 : 12, known: false };
}

export function progressNarratorProgressLabel(options = {}, progress = progressNarratorProgress(options)) {
  const explicitLabel = String(options.progressLabel || options.progress?.label || '').trim();
  if (explicitLabel) return explicitLabel;
  const total = Number(options.total ?? options.progress?.total);
  const completed = Number(options.completed ?? options.progress?.completed);
  if (Number.isFinite(total) && total > 0 && Number.isFinite(completed)) {
    return `${Math.max(0, Math.min(total, completed))}/${total}`;
  }
  if (options.done === true) return '100%';
  return progress.known ? `${progress.percent}%` : 'Working';
}

export function progressNarratorStreamSegments(text = '', options = {}) {
  const language = String(options.language || '').trim();
  const ja = options.isJapanese?.([text, options.detail, options.phase, options.status, language].join(' ')) === true;
  const base = ja
    ? ['progress update', 'agent tree sync', 'completion check'].map((item, index) => ['進捗を更新中', 'エージェントツリーを同期中', '完了状況を確認中'][index] || item)
    : ['updating progress', 'syncing agent map', 'checking completion'];
  const specific = [
    options.phase ? `${ja ? '現在' : 'now'}: ${options.phase}` : '',
    options.status ? `${ja ? '状況' : 'status'}: ${options.status}` : '',
    ...(Array.isArray(options.steps) ? options.steps : []).slice(0, 3)
  ].map((item) => String(item || '').trim()).filter(Boolean);
  return [...specific, ...base].filter(Boolean).slice(0, 5);
}

export function progressNarratorStreamText(text = '', options = {}, frame = 0) {
  const segments = progressNarratorStreamSegments(text, options);
  const cursor = ['|', '/', '-', '\\'][Math.abs(Number(frame || 0)) % 4];
  const start = Math.abs(Number(frame || 0)) % Math.max(1, segments.length);
  const ordered = [...segments.slice(start), ...segments.slice(0, start)];
  const count = Math.min(3, Math.max(1, 1 + (Math.abs(Number(frame || 0)) % 2)));
  const dots = '.'.repeat(1 + (Math.abs(Number(frame || 0)) % 3));
  return `${cursor} ${ordered.slice(0, count).join('  ·  ')}${dots}`;
}

export function progressNarratorHtml(text = '', options = {}) {
  const escapeHtml = options.escapeHtml || ((value) => String(value || ''));
  const detail = String(options.detail || '').trim();
  const status = String(options.status || '').trim();
  const phase = String(options.phase || '').trim();
  const steps = Array.isArray(options.steps) ? options.steps.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 4) : [];
  const streamText = progressNarratorStreamText(text, options, 0);
  const progress = progressNarratorProgress(options);
  const progressLabel = progressNarratorProgressLabel(options, progress);
  return [
    '<div class="progress-narrator" data-progress-narrator>',
    '<div class="progress-narrator-row">',
    `<span class="progress-narrator-pulse" aria-hidden="true"></span>`,
    `<strong data-progress-narrator-text>${escapeHtml(text || 'Working through the order...')}</strong>`,
    '<span class="progress-narrator-caret" aria-hidden="true"></span>',
    '</div>',
    '<div class="progress-narrator-bar-row">',
    `<div class="progress-narrator-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${escapeHtml(String(progress.percent))}" style="--progress-value: ${escapeHtml(String(progress.percent))}%"><span></span></div>`,
    `<span class="progress-narrator-bar-label" data-progress-narrator-bar-label>${escapeHtml(progressLabel)}</span>`,
    '</div>',
    `<div class="progress-narrator-stream" data-progress-narrator-stream aria-live="off">${escapeHtml(streamText)}</div>`,
    detail ? `<div class="progress-narrator-detail" data-progress-narrator-detail>${escapeHtml(detail)}</div>` : '<div class="progress-narrator-detail" data-progress-narrator-detail hidden></div>',
    (status || phase) ? `<div class="progress-narrator-meta" data-progress-narrator-meta>${escapeHtml([phase, status].filter(Boolean).join(' / '))}</div>` : '<div class="progress-narrator-meta" data-progress-narrator-meta hidden></div>',
    steps.length ? `<div class="progress-narrator-steps" data-progress-narrator-steps>${steps.map((step) => `<span>${escapeHtml(step)}</span>`).join('')}</div>` : '<div class="progress-narrator-steps" data-progress-narrator-steps hidden></div>',
    '</div>'
  ].join('\n');
}

export function renderAgentRunDetailHtml(run = {}, job = null, options = {}) {
  const escapeHtml = options.escapeHtml || ((value) => String(value || ''));
  const loading = options.loading === true;
  const error = String(options.error || '').trim();
  const status = String(job?.status || run.status || 'planned').trim().toLowerCase();
  const label = options.workflowChildDisplayLabel?.({
    ...run,
    agentName: job?.workflowAgentName || run.agentName || run.agent_name || ''
  }) || 'Agent run';
  const rows = options.agentRunDetailRows?.(run, job) || [];
  const latestLog = String(job?.logs?.slice?.(-1)?.[0] || run.latestLog || '').trim();
  const failureReason = String(job?.failureReason || job?.failure_reason || run.failureReason || run.failure_reason || '').trim();
  const text = job ? options.deliveryText?.(job) || '' : '';
  const files = job ? options.deliveryFiles?.(job) || [] : [];
  const detailBody = loading
    ? '<div class="agent-run-empty">Loading this agent run...</div>'
    : [
        text ? `<pre class="agent-run-output-text">${escapeHtml(text)}</pre>` : '',
        files.length ? options.renderFileCards?.(files) : '',
        !text && !files.length ? '<div class="agent-run-empty">No intermediate deliverable has been recorded for this agent run yet.</div>' : ''
      ].filter(Boolean).join('\n');
  return [
    '<div class="agent-run-detail-inner">',
    '<div class="agent-run-detail-head">',
    `<strong>${escapeHtml(label)}</strong>`,
    `<span class="${escapeHtml(status.replace(/[^a-z0-9_-]+/g, '') || 'planned')}">${escapeHtml(options.statusDisplayLabel?.(status || 'planned') || status)}</span>`,
    '</div>',
    rows.length ? `<dl class="agent-run-meta">${rows.map(([key, value]) => `<div><dt>${escapeHtml(key)}</dt><dd>${escapeHtml(value)}</dd></div>`).join('')}</dl>` : '',
    latestLog ? `<div class="chat-hint">Latest log: ${escapeHtml(latestLog)}</div>` : '',
    failureReason ? `<div class="chat-hint error-text">Failure: ${escapeHtml(failureReason)}</div>` : '',
    error ? `<div class="chat-hint error-text">Could not load live run detail: ${escapeHtml(error)}</div>` : '',
    '<div class="agent-run-section">',
    '<strong>Intermediate deliverables</strong>',
    detailBody,
    '</div>',
    '</div>'
  ].filter(Boolean).join('\n');
}
