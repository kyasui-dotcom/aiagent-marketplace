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
    files.length ? options.renderFileCards?.(files) : ''
  ].filter(Boolean).join('\n\n');
}
