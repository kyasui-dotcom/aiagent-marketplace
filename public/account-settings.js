const state = {
  auth: null,
  account: null,
  monthlySummary: null
};

const $ = (id) => document.getElementById(id);

const els = {
  accountStatus: $('accountStatus'),
  accountLogin: $('accountLogin'),
  uiLanguageSelect: $('uiLanguageSelect'),
  saveLanguageBtn: $('saveLanguageBtn'),
  languageStatus: $('languageStatus'),
  openAiMonthlyCostLimitInput: $('openAiMonthlyCostLimitInput'),
  saveCostLimitBtn: $('saveCostLimitBtn'),
  costLimitSummary: $('costLimitSummary'),
  costLimitStatus: $('costLimitStatus'),
  deleteConfirmInput: $('deleteConfirmInput'),
  deleteAccountBtn: $('deleteAccountBtn'),
  deleteStatus: $('deleteStatus')
};

const UI_LANGUAGE_STORAGE_KEY = 'cait.uiLanguage.v1';
const LEDGER_UNITS_PER_USD = 150;

function setStatus(message = '', tone = '') {
  els.deleteStatus.textContent = message;
  els.deleteStatus.classList.toggle('error', tone === 'error');
}

function normalizeUiLanguage(value = '') {
  const text = String(value || '').trim().toLowerCase();
  if (text.startsWith('ja')) return 'ja';
  return 'en';
}

function setLanguageStatus(message = '', tone = '') {
  if (!els.languageStatus) return;
  els.languageStatus.textContent = message;
  els.languageStatus.classList.toggle('error', tone === 'error');
}

function setCostLimitStatus(message = '', tone = '') {
  if (!els.costLimitStatus) return;
  els.costLimitStatus.textContent = message;
  els.costLimitStatus.classList.toggle('error', tone === 'error');
}

function ledgerToUsd(value = 0) {
  return +(Number(value || 0) / LEDGER_UNITS_PER_USD).toFixed(2);
}

function usdToLedger(value = 0) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 0;
  return +(Math.max(0, Math.min(10, amount)) * LEDGER_UNITS_PER_USD).toFixed(2);
}

function moneyLabel(value = 0) {
  return `$${ledgerToUsd(value).toFixed(2)}`;
}

function rememberLocalUiLanguage(value = '') {
  try {
    window.localStorage.setItem(UI_LANGUAGE_STORAGE_KEY, normalizeUiLanguage(value));
  } catch {
    // Storage can be disabled by the browser.
  }
}

function unsafeMethod(method = '') {
  return !['GET', 'HEAD', 'OPTIONS'].includes(String(method || 'GET').toUpperCase());
}

async function api(path, options = {}) {
  const method = String(options.method || 'GET').toUpperCase();
  const headers = new Headers(options.headers || {});
  if (!headers.has('content-type')) headers.set('content-type', 'application/json');
  if (unsafeMethod(method) && state.auth?.csrfToken && !headers.has('x-aiagent2-csrf')) {
    headers.set('x-aiagent2-csrf', state.auth.csrfToken);
  }
  const response = await fetch(path, {
    ...options,
    method,
    headers,
    credentials: 'same-origin',
    body: options.body && typeof options.body !== 'string' ? JSON.stringify(options.body) : options.body
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(String(data?.error || `Request failed (${response.status})`));
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

function loginPath() {
  const url = new URL('/login', window.location.origin);
  url.searchParams.set('next', `${window.location.pathname}${window.location.search}`);
  return `${url.pathname}${url.search}`;
}

function updateDeleteEnabled() {
  const loggedIn = Boolean(state.auth?.loggedIn || state.auth?.login || state.auth?.user?.login || state.auth?.user?.email);
  els.deleteAccountBtn.disabled = !loggedIn || els.deleteConfirmInput.value.trim() !== 'DELETE';
}

function updateLanguageControls() {
  const loggedIn = Boolean(state.auth?.loggedIn || state.auth?.login || state.auth?.user?.login || state.auth?.user?.email);
  const language = normalizeUiLanguage(state.account?.profile?.uiLanguage || 'en');
  if (els.uiLanguageSelect) els.uiLanguageSelect.value = language;
  if (els.saveLanguageBtn) els.saveLanguageBtn.disabled = !loggedIn;
}

function updateCostLimitControls() {
  const loggedIn = Boolean(state.auth?.loggedIn || state.auth?.login || state.auth?.user?.login || state.auth?.user?.email);
  const billing = state.account?.billing || {};
  const customer = state.monthlySummary?.customer || {};
  const rawLimit = Number(billing.openAiMonthlyCostLimit ?? customer.openAiMonthlyCostLimit ?? 1500);
  const limit = Number.isFinite(rawLimit) ? Math.max(0, Math.min(1500, rawLimit)) : 1500;
  if (els.openAiMonthlyCostLimitInput) els.openAiMonthlyCostLimitInput.value = ledgerToUsd(limit).toFixed(2);
  if (els.saveCostLimitBtn) els.saveCostLimitBtn.disabled = !loggedIn;
  if (els.costLimitSummary) {
    const used = Number(customer.openAiCostUsed ?? billing.openAiCostUsed ?? 0) || 0;
    const reserved = Number(customer.openAiCostReserved ?? billing.openAiCostReserved ?? 0) || 0;
    const available = Math.max(0, limit - used - reserved);
    els.costLimitSummary.textContent = `This period: ${moneyLabel(used)} used, ${moneyLabel(reserved)} reserved, ${moneyLabel(available)} available.`;
  }
}

function clearAccountLocalState() {
  for (const store of [window.localStorage, window.sessionStorage]) {
    try {
      for (let index = store.length - 1; index >= 0; index -= 1) {
        const key = store.key(index) || '';
        if (/chatux|aiagent2|cait/i.test(key)) store.removeItem(key);
      }
    } catch {
      // Storage access can be disabled by the browser.
    }
  }
}

async function loadAuth() {
  const auth = await api('/auth/status', { method: 'GET' });
  state.auth = auth || {};
  const login = state.auth.login || state.auth.user?.login || state.auth.user?.email || '';
  if (!state.auth.loggedIn && !login) {
    els.accountStatus.innerHTML = `You are not signed in. <a href="${loginPath()}">Sign in</a> to manage your account.`;
    els.accountLogin.textContent = '-';
    updateDeleteEnabled();
    updateLanguageControls();
    return;
  }
  els.accountStatus.textContent = 'Manage your CAIt account profile and deletion request.';
  els.accountLogin.textContent = login || 'Signed in';
  try {
    const settings = await api('/api/settings', { method: 'GET' });
    state.account = settings?.account || null;
    state.monthlySummary = settings?.monthly_summary || null;
    rememberLocalUiLanguage(state.account?.profile?.uiLanguage || 'en');
  } catch (error) {
    setLanguageStatus(error.message || 'Could not load language setting.', 'error');
    setCostLimitStatus(error.message || 'Could not load cost limit.', 'error');
  }
  updateDeleteEnabled();
  updateLanguageControls();
  updateCostLimitControls();
}

async function saveLanguage() {
  const uiLanguage = normalizeUiLanguage(els.uiLanguageSelect?.value || 'en');
  els.saveLanguageBtn.disabled = true;
  setLanguageStatus('Saving language...');
  try {
    const result = await api('/api/settings/profile', {
      method: 'POST',
      body: { uiLanguage }
    });
    state.account = result?.account || state.account;
    rememberLocalUiLanguage(state.account?.profile?.uiLanguage || uiLanguage);
    updateLanguageControls();
    setLanguageStatus('Language saved.');
  } catch (error) {
    setLanguageStatus(error.message || 'Could not save language.', 'error');
    updateLanguageControls();
  }
}

async function saveCostLimit() {
  const usd = Number(els.openAiMonthlyCostLimitInput?.value || 0);
  if (!Number.isFinite(usd) || usd < 0 || usd > 10) {
    setCostLimitStatus('Enter a monthly limit from 0 to 10 USD.', 'error');
    return;
  }
  els.saveCostLimitBtn.disabled = true;
  setCostLimitStatus('Saving cost limit...');
  try {
    const result = await api('/api/settings/cost-limits', {
      method: 'POST',
      body: { openAiMonthlyCostLimit: usdToLedger(usd) }
    });
    state.account = result?.account || state.account;
    state.monthlySummary = result?.monthly_summary || state.monthlySummary;
    updateCostLimitControls();
    setCostLimitStatus('Cost limit saved.');
  } catch (error) {
    setCostLimitStatus(error.message || 'Could not save cost limit.', 'error');
    updateCostLimitControls();
  }
}

async function deleteAccount() {
  if (els.deleteConfirmInput.value.trim() !== 'DELETE') {
    setStatus('Type DELETE to confirm account deletion.', 'error');
    return;
  }
  const accepted = window.confirm('Delete this CAIt account? This signs you out and cannot be undone from the account page.');
  if (!accepted) return;
  els.deleteAccountBtn.disabled = true;
  setStatus('Deleting account...');
  try {
    const result = await api('/api/settings/account', {
      method: 'DELETE',
      body: { confirm: 'DELETE' }
    });
    clearAccountLocalState();
    setStatus('Account deleted. Redirecting...');
    window.location.href = String(result?.redirect_to || '/').trim() || '/';
  } catch (error) {
    setStatus(error.message || 'Could not delete account.', 'error');
    updateDeleteEnabled();
  }
}

els.deleteConfirmInput.addEventListener('input', updateDeleteEnabled);
els.deleteAccountBtn.addEventListener('click', deleteAccount);
els.saveLanguageBtn?.addEventListener('click', saveLanguage);
els.uiLanguageSelect?.addEventListener('change', () => setLanguageStatus('Press Save language to apply this account setting.'));
els.saveCostLimitBtn?.addEventListener('click', saveCostLimit);
els.openAiMonthlyCostLimitInput?.addEventListener('input', () => setCostLimitStatus('Press Save cost limit to apply this account setting.'));

void loadAuth().catch((error) => {
  els.accountStatus.textContent = 'Could not load account status.';
  setStatus(error.message || 'Could not load account status.', 'error');
});
