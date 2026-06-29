export function deliveryRendererMeta(job = {}, options = {}) {
  const status = String(job.status || '').trim().toLowerCase();
  const failed = ['failed', 'timed_out'].includes(status) || Boolean(options.jobBlockedByLeaderQualityGate?.(job));
  const completed = status === 'completed';
  return {
    status,
    failed,
    completed,
    heading: failed ? 'Order failed' : 'Delivery update',
    tone: completed ? 'ok' : (failed ? 'error' : (status === 'blocked' ? 'warn' : '')),
    label: completed ? 'Review' : (options.jobHasDeliveryResult?.(job) ? 'Delivery' : 'Order')
  };
}

export function deliveryOrderActionsHtml(job = {}, options = {}) {
  const escapeHtml = options.escapeHtml || ((value) => String(value || ''));
  const orderId = String(job.id || '').trim();
  if (!orderId || !options.jobHasDeliveryResult?.(job)) return '';
  const meta = deliveryRendererMeta(job, options);
  const actions = [
    `<button class="ghost-btn inline-btn file-action" type="button" data-chat-order-open="${escapeHtml(orderId)}">${escapeHtml(meta.completed ? 'Review delivery' : 'Check status')}</button>`,
    meta.failed ? `<button class="primary-btn inline-btn file-action" type="button" data-chat-order-retry="${escapeHtml(orderId)}">Retry as new order</button>` : '',
    meta.completed ? `<button class="ghost-btn inline-btn file-action" type="button" data-chat-order-schedule="${escapeHtml(orderId)}">Schedule</button>` : ''
  ].filter(Boolean).join('');
  return actions ? `<div class="inline-actions">${actions}</div>` : '';
}

function deliveryLedgerFileNames(value = []) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (item && typeof item === 'object') return String(item.name || item.file || item.displayTitle || '').trim();
      return String(item || '').trim();
    })
    .filter(Boolean);
}

function deliveryLedgerFromJob(job = {}) {
  const output = job.output && typeof job.output === 'object' ? job.output : {};
  const report = output.report && typeof output.report === 'object' ? output.report : {};
  const explicitLedger = report.specialist_output_ledger
    || report.specialistOutputLedger
    || output.specialist_output_ledger
    || output.specialistOutputLedger;
  if (Array.isArray(explicitLedger) && explicitLedger.length) return explicitLedger;
  const childRuns = Array.isArray(report.childRuns)
    ? report.childRuns
    : (Array.isArray(output.child_runs)
      ? output.child_runs
      : (Array.isArray(job.workflow?.childRuns) ? job.workflow.childRuns : []));
  return childRuns.map((child) => {
    const files = deliveryLedgerFileNames(child.files || child.returnedFiles || []);
    return {
      runId: child.id || child.runId || '',
      agentName: child.agentName || child.workflowAgentName || '',
      taskType: child.taskType || child.workflowTask || '',
      dispatchTaskType: child.dispatchTaskType || child.dispatch_task_type || '',
      phase: child.phase || child.sequencePhase || '',
      status: child.status || '',
      summary: child.summary || child.failureReason || child.failure_reason || '',
      returnedFileCount: files.length,
      returnedFiles: files,
      rawUserVisibleFileCount: files.length,
      rawUserVisibleFiles: files,
      attachedDeliveryFileCount: 0,
      attachedDeliveryFiles: [],
      hasUserFacingArtifact: files.length > 0,
      hasAttachedDeliveryArtifact: false,
      artifactState: files.length ? 'available_in_child_run' : 'not_reported'
    };
  });
}

function renderAgentWorkProducts(job = {}, options = {}) {
  const escapeHtml = options.escapeHtml || ((value) => String(value || ''));
  const ledger = deliveryLedgerFromJob(job)
    .filter((item) => item && (item.runId || item.taskType || item.agentName || item.status));
  if (!ledger.length) return '';
  const completed = ledger.filter((item) => String(item.status || '').trim().toLowerCase() === 'completed').length;
  const attached = ledger.reduce((sum, item) => sum + Number(item.attachedDeliveryFileCount || 0), 0);
  const returned = ledger.reduce((sum, item) => sum + Number(item.rawUserVisibleFileCount || item.returnedFileCount || 0), 0);
  const rows = ledger.map((item, index) => {
    const title = [
      item.agentName,
      item.taskType || item.dispatchTaskType
    ].map((part) => String(part || '').trim()).filter(Boolean).join(' / ') || `Agent ${index + 1}`;
    const meta = [
      item.phase ? `phase: ${item.phase}` : '',
      item.status ? `status: ${item.status}` : '',
      item.runId ? `run: ${String(item.runId).slice(0, 8)}` : ''
    ].filter(Boolean).join(' · ');
    const attachedFiles = deliveryLedgerFileNames(item.attachedDeliveryFiles);
    const rawFiles = deliveryLedgerFileNames(item.rawUserVisibleFiles);
    const returnedFiles = deliveryLedgerFileNames(item.returnedFiles);
    const files = attachedFiles.length ? attachedFiles : (rawFiles.length ? rawFiles : returnedFiles);
    const artifactState = String(item.artifactState || '').replace(/_/g, ' ').trim();
    const fileText = files.length ? files.join(', ') : (artifactState || 'no file returned');
    const summary = String(item.summary || item.nextAction || '').trim();
    return [
      '<div class="agent-work-product-row">',
      '<div>',
      `<strong>${escapeHtml(`${index + 1}. ${title}`)}</strong>`,
      meta ? `<div class="row-muted">${escapeHtml(meta)}</div>` : '',
      summary ? `<div>${escapeHtml(summary)}</div>` : '',
      `<div class="row-muted">${escapeHtml(fileText)}</div>`,
      '</div>',
      '</div>'
    ].join('');
  }).join('');
  return [
    '<details class="agent-work-products" open>',
    `<summary>Agent work products (${ledger.length} runs · ${completed} completed · ${attached} attached files · ${returned} returned files)</summary>`,
    '<div class="agent-work-product-list">',
    rows,
    '</div>',
    '</details>'
  ].join('');
}

export function renderDeliveryBody(job = {}, options = {}) {
  const escapeHtml = options.escapeHtml || ((value) => String(value || ''));
  const files = Array.isArray(options.files) ? options.files : [];
  const meta = deliveryRendererMeta(job, options);
  const text = String(options.text || `Order ${job.id || ''} is ${options.statusDisplayLabel?.(job.status || 'updated') || job.status || 'updated'}.`);
  return [
    options.renderAuthorityRequest?.(job),
    options.renderRetryReuseControls?.(job),
    options.deliveryOrderActionsHtml?.(job),
    options.renderDedicatedAppDeliveryTools?.(job),
    options.renderAppHandoffTools?.(job),
    `<strong>${escapeHtml(meta.heading)}</strong>\n${escapeHtml(text)}`,
    renderAgentWorkProducts(job, { escapeHtml }),
    files.length ? options.renderFileCards?.(files) : ''
  ].filter(Boolean).join('\n\n');
}
