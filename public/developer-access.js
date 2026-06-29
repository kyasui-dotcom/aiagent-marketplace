const els = {
  status: document.getElementById('developerAccessStatus'),
  form: document.getElementById('apiKeyIssueForm'),
  label: document.getElementById('apiKeyIssueLabel'),
  mode: document.getElementById('apiKeyIssueMode'),
  createButton: document.getElementById('apiKeyIssueButton'),
  signIn: document.getElementById('apiKeySignInLink'),
  result: document.getElementById('apiKeyIssueResult'),
  table: document.getElementById('apiKeyIssueTable'),
  reveal: document.getElementById('apiKeyRevealPanel'),
  revealToken: document.getElementById('apiKeyRevealToken'),
  revealCopyButton: document.getElementById('apiKeyRevealCopyButton'),
  revealCloseButton: document.getElementById('apiKeyRevealCloseButton')
};

const state = {
  auth: null,
  account: null,
  apiKeys: []
};

function text(value = '') {
  return String(value || '').trim();
}

function escapeHtml(value = '') {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function setText(element, value = '') {
  if (element) element.textContent = value;
}

function formatTime(value = '') {
  if (!value) return 'never';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
}

function developerApiEnabled(auth = {}) {
  return auth.developerApiEnabled !== false;
}

function csrfHeaders() {
  const token = text(state.auth?.csrfToken);
  return token ? { 'x-aiagent2-csrf': token } : {};
}

async function requestJson(path, init = {}, options = {}) {
  const timeoutMs = Math.max(0, Number(options.timeoutMs || 0) || 0);
  const controller = timeoutMs ? new AbortController() : null;
  const timeoutId = controller ? window.setTimeout(() => controller.abort(), timeoutMs) : null;
  let response;
  try {
    response = await fetch(path, {
      ...init,
      credentials: 'same-origin',
      signal: controller?.signal,
      headers: {
        ...(init.headers || {})
      }
    });
  } catch (error) {
    if (error?.name === 'AbortError') throw new Error(`Request timed out: ${path}`);
    throw error;
  } finally {
    if (timeoutId) window.clearTimeout(timeoutId);
  }
  const raw = await response.text();
  let body = {};
  if (raw) {
    try {
      body = JSON.parse(raw);
    } catch {
      body = { raw };
    }
  }
  if (!response.ok) {
    throw new Error(body.error || body.message || `Request failed (${response.status})`);
  }
  return body;
}

function renderReveal(apiKey = null) {
  const token = text(apiKey?.token || apiKey?.key || '');
  if (!els.reveal || !els.revealToken) return;
  if (!token) {
    els.reveal.hidden = true;
    els.revealToken.value = '';
    return;
  }
  els.revealToken.value = token;
  els.reveal.hidden = false;
  window.requestAnimationFrame(() => {
    els.revealToken.focus();
    els.revealToken.select();
  });
}

function apiKeysFromResponse(result = {}) {
  if (Array.isArray(result.api_keys)) return result.api_keys;
  if (Array.isArray(result.apiKeys)) return result.apiKeys;
  if (Array.isArray(result.account?.apiAccess?.orderKeys)) return result.account.apiAccess.orderKeys;
  return [];
}

function renderKeys(options = {}) {
  const setResultMessage = options.setResultMessage !== false;
  const auth = state.auth || {};
  const loggedIn = Boolean(auth.loggedIn && auth.user?.login);
  const enabled = developerApiEnabled(auth);
  const keys = Array.isArray(state.apiKeys) ? state.apiKeys : [];

  if (els.createButton) els.createButton.disabled = !loggedIn || !enabled;
  if (els.label) els.label.disabled = !loggedIn || !enabled;
  if (els.mode) els.mode.disabled = !loggedIn || !enabled;
  if (els.signIn) els.signIn.hidden = loggedIn;

  if (!loggedIn) {
    setText(els.status, 'Sign in to issue a CAIt API key from this API / CLI / MCP screen.');
    if (setResultMessage) setText(els.result, 'Login required. After sign-in, create a live key here and use it for API, CLI, or authenticated MCP clients.');
  } else if (!enabled) {
    setText(els.status, 'Developer access is disabled by this deployment runtime policy.');
    if (setResultMessage) setText(els.result, 'API key creation, CLI ordering, and authenticated MCP access are disabled by runtime policy.');
  } else {
    setText(els.status, `Signed in as ${auth.user.login}. Create a CAIt API key here for API, CLI, or MCP clients.`);
    if (setResultMessage) setText(els.result, 'Create a live key. The raw token is shown once, so store it in your shell, backend, or secret manager.');
  }

  if (!els.table) return;
  if (!keys.length) {
    els.table.innerHTML = `<div class="empty">${loggedIn && enabled ? 'No CAIt API keys yet.' : 'No active CAIt API keys are available.'}</div>`;
    return;
  }
  els.table.innerHTML = `<div class="table-header runs-grid"><div>KEY</div><div>LAST USED</div><div>STATUS</div></div>${keys.map((key) => {
    const active = Boolean(key.active);
    const scopes = Array.isArray(key.scopes) ? key.scopes.join(', ') : '';
    return `
      <div class="table-row runs-grid">
        <div>${escapeHtml(key.label)}<div class="row-muted">${escapeHtml(`${String(key.mode || 'live').toUpperCase()} · ${key.prefix || ''}... · ${scopes}`)}</div></div>
        <div>${escapeHtml(formatTime(key.lastUsedAt))}<div class="row-muted">${escapeHtml(`${key.lastUsedMethod || '-'} ${key.lastUsedPath || ''}`.trim())}</div></div>
        <div><span class="status-pill ${active ? 'ok' : 'warn'}">${active ? 'ACTIVE' : 'REVOKED'}</span><div class="row-muted">${active && enabled ? `<button type="button" class="mini-btn" data-api-key-id="${escapeHtml(key.id)}">REVOKE</button>` : escapeHtml(key.revokedAt ? formatTime(key.revokedAt) : 'Inactive')}</div></div>
      </div>`;
  }).join('')}`;
}

async function refresh() {
  try {
    state.auth = await requestJson('/auth/status', {}, { timeoutMs: 2500 });
    renderKeys();
    if (state.auth?.loggedIn && developerApiEnabled(state.auth)) {
      const result = await requestJson('/api/settings/api-keys', {}, { timeoutMs: 2500 });
      state.account = result.account || null;
      state.apiKeys = apiKeysFromResponse(result);
    } else {
      state.account = null;
      state.apiKeys = [];
    }
  } catch (error) {
    setText(els.status, error.message || 'Could not load developer access status.');
  }
  renderKeys();
}

async function createKey(event) {
  event.preventDefault();
  const label = text(els.label?.value);
  const mode = text(els.mode?.value || 'live').toLowerCase() || 'live';
  if (!label) {
    setText(els.result, 'Label is required.');
    els.label?.focus();
    return;
  }
  if (els.createButton) els.createButton.disabled = true;
  setText(els.result, 'Creating CAIt API key...');
  try {
    const result = await requestJson('/api/settings/api-keys', {
      method: 'POST',
      headers: {
        ...csrfHeaders(),
        'content-type': 'application/json'
      },
      body: JSON.stringify({ label, mode })
    });
    state.account = result.account || state.account;
    state.apiKeys = apiKeysFromResponse(result);
    if (els.label) els.label.value = '';
    renderKeys({ setResultMessage: false });
    renderReveal(result.api_key || result.apiKey || null);
    setText(els.result, 'CAIt API key created. Copy the one-time token now.');
  } catch (error) {
    setText(els.result, error.message || 'API key creation failed.');
  } finally {
    renderKeys({ setResultMessage: false });
  }
}

async function revokeKey(keyId = '') {
  const safeKeyId = text(keyId);
  if (!safeKeyId) return;
  setText(els.result, 'Revoking CAIt API key...');
  try {
    const result = await requestJson(`/api/settings/api-keys/${encodeURIComponent(safeKeyId)}`, {
      method: 'DELETE',
      headers: csrfHeaders()
    });
    state.account = result.account || state.account;
    state.apiKeys = apiKeysFromResponse(result);
    renderKeys({ setResultMessage: false });
    setText(els.result, 'CAIt API key revoked.');
  } catch (error) {
    setText(els.result, error.message || 'API key revoke failed.');
  }
}

function bindEvents() {
  els.form?.addEventListener('submit', createKey);
  els.table?.addEventListener('click', (event) => {
    const button = event.target?.closest?.('[data-api-key-id]');
    if (!button) return;
    void revokeKey(button.dataset.apiKeyId);
  });
  els.revealCopyButton?.addEventListener('click', async () => {
    const token = text(els.revealToken?.value);
    if (!token) return;
    await navigator.clipboard?.writeText(token);
    setText(els.result, 'Copied. Store the key before closing this one-time reveal.');
  });
  els.revealCloseButton?.addEventListener('click', () => {
    renderReveal(null);
  });
}

bindEvents();
void refresh();
