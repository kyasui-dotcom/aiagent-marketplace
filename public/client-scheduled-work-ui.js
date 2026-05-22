import { compactClientText as compactChatText } from './client-text-utils.js?v=20260521a';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const noopString = () => '';

export function renderScheduledWorkListElement(elements = {}, recurringOrders = [], options = {}) {
  const orders = Array.isArray(recurringOrders) ? recurringOrders : [];
  const canOrder = Boolean(options.canOrder);
  const scheduleLabel = options.scheduleLabel || noopString;
  const timeLabel = options.timeLabel || noopString;
  const onToggle = options.onToggle;
  const onDelete = options.onDelete;
  if (elements.scheduleCurrentOrderBtn) {
    elements.scheduleCurrentOrderBtn.disabled = !canOrder;
    elements.scheduleCurrentOrderBtn.title = canOrder ? 'Schedule the current prepared draft' : 'Sign in before scheduling work';
  }
  if (elements.scheduledWorkStatus) {
    elements.scheduledWorkStatus.textContent = !canOrder
      ? 'Sign in to schedule recurring work.'
      : orders.length
        ? `${orders.length} scheduled work item${orders.length === 1 ? '' : 's'} · billed only when each run starts`
        : 'No scheduled work yet. Prepare a draft, then schedule it.';
  }
  if (!elements.scheduledWorkList) return;
  if (!canOrder) {
    elements.scheduledWorkList.innerHTML = '<div class="empty-session-list">Sign in with Google or GitHub to manage scheduled work.</div>';
    return;
  }
  if (!orders.length) {
    elements.scheduledWorkList.innerHTML = '<div class="empty-session-list">No scheduled work. Use SCHEDULE DRAFT after CAIt prepares an order brief.</div>';
    return;
  }
  elements.scheduledWorkList.innerHTML = orders.map((order) => {
    const status = String(order.status || 'active').toLowerCase();
    const paused = status === 'paused';
    const needsAction = status === 'needs_action';
    const title = compactChatText(order.prompt || order.inputSummary?.label || 'Scheduled work', 80);
    const runCount = `${Number(order.runsCreated || 0)} run${Number(order.runsCreated || 0) === 1 ? '' : 's'}`;
    return `
      <div class="scheduled-work-row ${paused ? 'paused' : ''} ${needsAction ? 'needs-action' : ''}">
        <div class="scheduled-work-copy">
          <div class="scheduled-work-title">${escapeHtml(title)}</div>
          <div class="scheduled-work-meta">${escapeHtml(status.toUpperCase())} · ${escapeHtml(scheduleLabel(order.schedule || {}))}</div>
          <div class="scheduled-work-meta">Next: ${escapeHtml(timeLabel(order.nextRunAt))} · ${escapeHtml(runCount)}</div>
          ${order.lastError ? `<div class="scheduled-work-error">${escapeHtml(order.lastError)}</div>` : ''}
        </div>
        <div class="scheduled-work-actions">
          <button type="button" class="mini-btn" data-scheduled-work-toggle="${escapeHtml(order.id)}">${paused || needsAction ? 'RESUME' : 'PAUSE'}</button>
          <button type="button" class="mini-btn chat-session-delete" data-scheduled-work-delete="${escapeHtml(order.id)}">x</button>
        </div>
      </div>
    `;
  }).join('');
  elements.scheduledWorkList.querySelectorAll('[data-scheduled-work-toggle]').forEach((button) => {
    button.onclick = () => {
      if (typeof onToggle === 'function') onToggle(button, button.dataset.scheduledWorkToggle || '');
    };
  });
  elements.scheduledWorkList.querySelectorAll('[data-scheduled-work-delete]').forEach((button) => {
    button.onclick = () => {
      if (typeof onDelete === 'function') onDelete(button, button.dataset.scheduledWorkDelete || '');
    };
  });
}
