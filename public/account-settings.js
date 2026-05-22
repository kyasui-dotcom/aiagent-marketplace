const state = {
  auth: null
};

const $ = (id) => document.getElementById(id);

const els = {
  accountStatus: $('accountStatus'),
  accountLogin: $('accountLogin'),
  deleteConfirmInput: $('deleteConfirmInput'),
  deleteAccountBtn: $('deleteAccountBtn'),
  deleteStatus: $('deleteStatus')
};

function setStatus(message = '', tone = '') {
  els.deleteStatus.textContent = message;
  els.deleteStatus.classList.toggle('error', tone === 'error');
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
    return;
  }
  els.accountStatus.textContent = 'Manage your CAIt account profile and deletion request.';
  els.accountLogin.textContent = login || 'Signed in';
  updateDeleteEnabled();
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

void loadAuth().catch((error) => {
  els.accountStatus.textContent = 'Could not load account status.';
  setStatus(error.message || 'Could not load account status.', 'error');
});
