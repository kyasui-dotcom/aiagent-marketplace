const state = {
  auth: null,
  account: null
};

const $ = (id) => document.getElementById(id);

const els = {
  accountStatus: $('accountStatus'),
  accountLogin: $('accountLogin'),
  uiLanguageSelect: $('uiLanguageSelect'),
  saveLanguageBtn: $('saveLanguageBtn'),
  languageStatus: $('languageStatus'),
  deleteConfirmInput: $('deleteConfirmInput'),
  deleteAccountBtn: $('deleteAccountBtn'),
  deleteStatus: $('deleteStatus')
};

const UI_LANGUAGE_STORAGE_KEY = 'cait.uiLanguage.v1';

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
    rememberLocalUiLanguage(state.account?.profile?.uiLanguage || 'en');
  } catch (error) {
    setLanguageStatus(error.message || 'Could not load language setting.', 'error');
  }
  updateDeleteEnabled();
  updateLanguageControls();
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

void loadAuth().catch((error) => {
  els.accountStatus.textContent = 'Could not load account status.';
  setStatus(error.message || 'Could not load account status.', 'error');
});
