function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function updateOpenChatModeControls(elements = {}, mode = 'clarify') {
  const normalized = mode === 'order' ? 'order' : 'clarify';
  if (elements.openChatClarifyModeBtn) {
    elements.openChatClarifyModeBtn.classList.toggle('active', normalized === 'clarify');
    elements.openChatClarifyModeBtn.setAttribute('aria-pressed', normalized === 'clarify' ? 'true' : 'false');
  }
  if (elements.openChatOrderModeBtn) {
    elements.openChatOrderModeBtn.classList.toggle('active', normalized === 'order');
    elements.openChatOrderModeBtn.setAttribute('aria-pressed', normalized === 'order' ? 'true' : 'false');
  }
  if (elements.openChatModeCurrent) {
    elements.openChatModeCurrent.textContent = normalized === 'clarify' ? 'PLAN' : 'ORDER';
  }
  if (elements.openChatModeStatus) {
    elements.openChatModeStatus.textContent = normalized === 'clarify'
      ? 'PLAN mode: chat prepares and revises the order summary.'
      : 'ORDER mode: chat keeps dispatch-ready structure and checks before SEND ORDER.';
  }
}

export function renderOpenChatChoiceBarElement(element = null, options = [], onChoice = null, setElementVisible = null) {
  if (!element) return;
  const safeOptions = Array.isArray(options) ? options.filter((option) => option?.command && option?.label) : [];
  if (!safeOptions.length) {
    element.innerHTML = '';
    if (typeof setElementVisible === 'function') setElementVisible(element, false);
    return;
  }
  const ja = safeOptions.some((option) => /[ぁ-んァ-ン一-龯]/.test(option.label || option.description || ''));
  element.innerHTML = [
    `<div class="open-chat-choice-title">${escapeHtml(ja ? '次の操作を選んでください' : 'Choose next action')}</div>`,
    '<div class="open-chat-choice-buttons">',
    ...safeOptions.map((option) => `
      <button class="mini-btn open-chat-choice-btn" type="button" data-open-chat-choice="${escapeHtml(option.command)}">
        <span>${escapeHtml(option.label)}</span>
        <small>${escapeHtml(option.description || '')}</small>
      </button>
    `),
    '</div>'
  ].join('');
  element.querySelectorAll('[data-open-chat-choice]').forEach((button) => {
    button.onclick = () => {
      if (typeof onChoice === 'function') onChoice(button, button.dataset.openChatChoice || '');
    };
  });
  if (typeof setElementVisible === 'function') setElementVisible(element, true);
}

export async function runOpenChatChoiceButtonAction(button, fn, hooks = {}) {
  const originalHtml = button?.innerHTML || '';
  if (button) {
    button.disabled = true;
    button.textContent = 'WORKING...';
  }
  try {
    await fn();
  } catch (error) {
    if (typeof hooks.flash === 'function') hooks.flash(error.message || 'Action failed.', 'error');
    if (typeof hooks.setDetail === 'function') hooks.setDetail({ error: error.message || String(error || 'Action failed.') });
  } finally {
    if (button) {
      button.disabled = false;
      button.innerHTML = originalHtml;
    }
  }
}

export function updateScheduledWorkControls(elements = {}, interval = 'daily') {
  const normalized = String(interval || 'daily');
  if (elements.scheduledWorkTime) elements.scheduledWorkTime.hidden = normalized === 'hourly';
  if (elements.scheduledWorkWeekday) elements.scheduledWorkWeekday.hidden = normalized !== 'weekly';
  if (elements.scheduledWorkEvery) elements.scheduledWorkEvery.hidden = normalized !== 'hourly';
}

export function updateParallelToolsControls(elements = {}, expanded = false, setElementVisible = null) {
  const active = Boolean(expanded);
  if (typeof setElementVisible === 'function') setElementVisible(elements.parallelToolsPanel, active);
  if (elements.toggleParallelToolsBtn) {
    elements.toggleParallelToolsBtn.textContent = active ? 'HIDE PARALLEL TOOLS' : 'SEND SEVERAL TASKS';
    elements.toggleParallelToolsBtn.classList.toggle('active', active);
  }
}

export function updateOrderSettingsDrawerControls(elements = {}, expanded = false, options = {}) {
  const active = Boolean(expanded);
  if (typeof options.setElementVisible === 'function') options.setElementVisible(elements.orderSettingsDrawer, active);
  if (options.body?.classList) options.body.classList.toggle('modal-open', active);
  if (elements.toggleOrderSettingsBtn) {
    elements.toggleOrderSettingsBtn.textContent = active ? '⚙ ORDER SETTINGS' : '⚙ SETTINGS';
    elements.toggleOrderSettingsBtn.classList.toggle('active', active);
    elements.toggleOrderSettingsBtn.setAttribute('aria-expanded', active ? 'true' : 'false');
  }
}
