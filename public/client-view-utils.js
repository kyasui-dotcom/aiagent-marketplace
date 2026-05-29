export function createClientViewUtils(deps = {}) {
  const {
    document,
    now = () => new Date()
  } = deps;

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function safeCssToken(value, fallback = 'info') {
    const token = String(value || '').toLowerCase().replace(/[^a-z0-9_-]/g, '');
    return token || fallback;
  }

  function safeText(el, value) {
    if (!el) return;
    el.textContent = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  }

  function renderSummaryRows(el, rows = []) {
    if (!el) return;
    el.innerHTML = rows.map((row) => `
      <div class="summary-row">
        <span class="summary-label">${escapeHtml(row.label)}</span>
        <strong class="summary-value">${escapeHtml(row.value)}</strong>
      </div>
    `).join('');
  }

  function formatTime(value) {
    return value ? new Date(value).toLocaleString('ja-JP') : '-';
  }

  function clipText(value, max = 96) {
    const text = String(value || '').trim();
    if (!text) return '-';
    return text.length > max ? `${text.slice(0, Math.max(0, max - 1)).trimEnd()}…` : text;
  }

  function currentMonthPeriod() {
    const date = now();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  function setButtonAccess(el, enabled) {
    if (!el) return;
    el.disabled = !enabled;
  }

  function setElementVisible(el, visible) {
    if (!el) return;
    el.hidden = !visible;
  }

  function setInputValue(el, value) {
    if (!el) return;
    if (document?.activeElement === el) return;
    el.value = value == null ? '' : String(value);
  }

  function formatPercent(value) {
    return `${Math.round(Number(value || 0) * 100)}%`;
  }

  function formatDurationMs(ms) {
    const safeMs = Number(ms || 0);
    if (!Number.isFinite(safeMs) || safeMs <= 0) return '0s';
    const totalSec = Math.round(safeMs / 1000);
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  }

  function formatRelativeDurationMs(ms) {
    const safeMs = Number(ms || 0);
    if (!Number.isFinite(safeMs) || safeMs <= 0) return '0s';
    const totalSec = Math.round(safeMs / 1000);
    if (totalSec < 60) return `${totalSec}s`;
    const totalMin = Math.floor(totalSec / 60);
    if (totalMin < 60) return `${totalMin}m`;
    const totalHours = Math.floor(totalMin / 60);
    if (totalHours < 24) return `${totalHours}h`;
    const totalDays = Math.floor(totalHours / 24);
    if (totalDays < 30) return `${totalDays}d`;
    const totalMonths = Math.floor(totalDays / 30);
    if (totalMonths < 12) return `${totalMonths}mo`;
    const totalYears = Math.floor(totalMonths / 12);
    return `${totalYears}y`;
  }

  function formatSecRange(minSec, maxSec) {
    return `${formatDurationMs((minSec || 0) * 1000)} – ${formatDurationMs((maxSec || 0) * 1000)}`;
  }

  function sinceLabel(value) {
    if (!value) return '-';
    const ts = new Date(value).getTime();
    if (!Number.isFinite(ts)) return '-';
    const diff = Date.now() - ts;
    if (diff <= 0) return 'now';
    return `${formatRelativeDurationMs(diff)} ago`;
  }

  function untilLabel(value) {
    if (!value) return '-';
    const ts = new Date(value).getTime();
    if (!Number.isFinite(ts)) return '-';
    const diff = ts - Date.now();
    if (diff <= 0) return 'now';
    return `in ${formatRelativeDurationMs(diff)}`;
  }

  return {
    clipText,
    currentMonthPeriod,
    escapeHtml,
    formatDurationMs,
    formatPercent,
    formatRelativeDurationMs,
    formatSecRange,
    formatTime,
    renderSummaryRows,
    safeCssToken,
    safeText,
    setButtonAccess,
    setElementVisible,
    setInputValue,
    sinceLabel,
    untilLabel
  };
}
