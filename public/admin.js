const $ = (id) => document.getElementById(id);

const els = {
  authStatus: $('adminAuthStatus'),
  gate: $('adminGate'),
  dashboard: $('adminDashboard'),
  generatedAt: $('adminGeneratedAt'),
  refreshBtn: $('refreshAdminBtn'),
  downloadAccountsBtn: $('downloadAccountsBtn'),
  registrationsMetric: $('adminRegistrationsMetric'),
  registrationsDetail: $('adminRegistrationsDetail'),
  chatsMetric: $('adminChatsMetric'),
  chatsDetail: $('adminChatsDetail'),
  ordersMetric: $('adminOrdersMetric'),
  ordersDetail: $('adminOrdersDetail'),
  agentsMetric: $('adminAgentsMetric'),
  agentsDetail: $('adminAgentsDetail'),
  issuesMetric: $('adminIssuesMetric'),
  issuesDetail: $('adminIssuesDetail'),
  accountsCountLabel: $('accountsCountLabel'),
  ordersCountLabel: $('ordersCountLabel'),
  chatsCountLabel: $('chatsCountLabel'),
  agentsCountLabel: $('agentsCountLabel'),
  appsCountLabel: $('appsCountLabel'),
  accountsTable: $('accountsTable'),
  ordersTable: $('ordersTable'),
  chatsTable: $('chatsTable'),
  agentsTable: $('agentsTable'),
  appsTable: $('appsTable')
};

const state = {
  auth: null,
  snapshot: null,
  dashboard: null
};
const ADMIN_LOCALE = 'en-US';

function escapeHtml(value = '') {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function number(value = 0) {
  return new Intl.NumberFormat(ADMIN_LOCALE, { maximumFractionDigits: 0 }).format(Number(value || 0));
}

function compact(value = '', max = 140) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text.length <= max ? text : `${text.slice(0, Math.max(0, max - 1)).trim()}...`;
}

function formatDate(value = '') {
  const time = Date.parse(value || '');
  if (!Number.isFinite(time)) return '-';
  try {
    return new Intl.DateTimeFormat(ADMIN_LOCALE, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(time));
  } catch {
    return new Date(time).toLocaleString(ADMIN_LOCALE);
  }
}

function relativeDate(value = '') {
  const time = Date.parse(value || '');
  if (!Number.isFinite(time)) return '-';
  const diffMs = Date.now() - time;
  const abs = Math.abs(diffMs);
  const units = [
    ['day', 24 * 60 * 60 * 1000],
    ['hour', 60 * 60 * 1000],
    ['minute', 60 * 1000]
  ];
  for (const [unit, size] of units) {
    if (abs >= size) {
      const amount = Math.round(diffMs / size) * -1;
      try {
        return new Intl.RelativeTimeFormat(ADMIN_LOCALE, { numeric: 'auto' }).format(amount, unit);
      } catch {
        return formatDate(value);
      }
    }
  }
  return 'just now';
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: 'same-origin',
    headers: { accept: 'application/json', ...(options.headers || {}) },
    ...options
  });
  const text = await response.text();
  let body = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { error: text || response.statusText };
  }
  if (!response.ok) {
    throw new Error(body?.error || response.statusText || `Request failed (${response.status})`);
  }
  return body;
}

function adminLoginHref() {
  const url = new URL('/login', window.location.origin);
  url.searchParams.set('next', '/admin');
  url.searchParams.set('source', 'gate_admin');
  return `${url.pathname}${url.search}`;
}

function showGate(title = '', message = '', options = {}) {
  if (!els.gate) return;
  els.gate.classList.toggle('error', options.error === true);
  els.gate.hidden = false;
  els.gate.innerHTML = [
    `<strong>${escapeHtml(title)}</strong>`,
    `<span>${escapeHtml(message)}</span>`
  ].join('\n');
  if (els.dashboard) els.dashboard.hidden = true;
}

function showDashboard() {
  if (els.gate) els.gate.hidden = true;
  if (els.dashboard) els.dashboard.hidden = false;
}

function setText(node, value) {
  if (node) node.textContent = String(value ?? '');
}

function statusClass(status = '') {
  const value = String(status || '').toLowerCase();
  if (['completed', 'ready', 'verified', 'resolved', 'live', 'active'].includes(value)) return 'ok';
  if (['failed', 'timed_out', 'blocked', 'rejected', 'error'].includes(value)) return 'error';
  if (['queued', 'claimed', 'running', 'dispatched', 'reviewing', 'pending', 'waiting'].includes(value)) return 'warn';
  return '';
}

function isWaitingOrderStatus(status = '') {
  return /queued|claimed|running|dispatched|blocked|failed|timed_out|waiting/i.test(String(status || ''));
}

function orderTimestamp(order = {}) {
  const timestamp = Date.parse(order.updatedAt || order.completedAt || order.failedAt || order.timedOutAt || order.createdAt || '');
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function isLeaderOrder(order = {}) {
  return /_leader$/i.test(String(order.workflowTask || order.taskType || order.workflowAgentName || ''));
}

function orderSortRank(order = {}) {
  if (order.jobKind === 'workflow') return 0;
  if (isLeaderOrder(order)) return 1;
  if (isWaitingOrderStatus(order.status) && order.status !== 'completed') return 2;
  if (order.status === 'completed') return 3;
  return 4;
}

function compareOrders(left = {}, right = {}) {
  const timeDiff = orderTimestamp(right) - orderTimestamp(left);
  if (timeDiff) return timeDiff;
  const rankDiff = orderSortRank(left) - orderSortRank(right);
  if (rankDiff) return rankDiff;
  return String(right.id || '').localeCompare(String(left.id || ''));
}

function orderGroupStatus(group = {}) {
  const statuses = (group.items || []).map((item) => String(item.status || '').toLowerCase());
  if (statuses.some((status) => /running|claimed|dispatched/.test(status))) return 'running';
  if (statuses.some((status) => /queued/.test(status))) return 'queued';
  if (statuses.some((status) => /blocked|failed|timed_out|waiting/.test(status))) return 'waiting';
  if (statuses.length && statuses.every((status) => status === 'completed')) return 'completed';
  return statuses[0] || 'unknown';
}

function orderGroupSummary(group = {}) {
  const completed = (group.items || []).filter((item) => item.status === 'completed').length;
  const waiting = (group.items || []).filter((item) => isWaitingOrderStatus(item.status) && item.status !== 'completed').length;
  const leader = (group.items || []).find(isLeaderOrder);
  const requester = group.requesterLogin || '-';
  const leaderLabel = leader ? `Leader: ${leader.workflowAgentName || leader.taskType}` : 'Leader not in page';
  return `${leaderLabel} / requester ${requester} / ${completed} completed / ${waiting} waiting`;
}

function groupedOrders(orders = []) {
  const byWork = new Map();
  for (const order of Array.isArray(orders) ? orders : []) {
    const workId = String(order.workId || order.workflowParentId || order.id || '').trim();
    if (!workId) continue;
    if (!byWork.has(workId)) {
      byWork.set(workId, {
        id: workId,
        title: order.workTitle || order.originalPrompt || order.prompt || `Order ${workId.slice(0, 8)}`,
        requesterLogin: order.requesterLogin || '',
        updatedAt: order.updatedAt || order.createdAt || '',
        items: []
      });
    }
    const group = byWork.get(workId);
    group.items.push(order);
    if (!group.requesterLogin && order.requesterLogin) group.requesterLogin = order.requesterLogin;
    if (String(order.updatedAt || order.createdAt || '').localeCompare(String(group.updatedAt || '')) > 0) group.updatedAt = order.updatedAt || order.createdAt || group.updatedAt;
    if (order.jobKind === 'workflow') group.title = order.workTitle || order.originalPrompt || order.prompt || group.title;
  }
  return [...byWork.values()]
    .map((group) => ({ ...group, items: group.items.sort(compareOrders) }))
    .sort((left, right) => {
      const timeDiff = Math.max(...left.items.map(orderTimestamp)) - Math.max(...right.items.map(orderTimestamp));
      if (timeDiff) return -timeDiff;
      return String(right.id || '').localeCompare(String(left.id || ''));
    });
}

function tableHtml(headers = [], rows = [], emptyText = 'No records yet.') {
  if (!rows.length) return `<div class="admin-empty">${escapeHtml(emptyText)}</div>`;
  const header = `<div class="admin-row header">${headers.map((item) => `<div class="admin-cell">${escapeHtml(item)}</div>`).join('')}</div>`;
  const body = rows.map((row) => `<div class="admin-row">${row.map((cell) => `<div class="admin-cell">${cell}</div>`).join('')}</div>`).join('');
  return `${header}${body}`;
}

function renderMetrics(dashboard = {}, apps = []) {
  const summary = dashboard.summary || {};
  const accounts = summary.accounts || {};
  const chats = summary.chats || {};
  const orders = summary.orders || {};
  const agents = summary.agents || {};
  const reports = summary.reports || {};

  setText(els.generatedAt, formatDate(dashboard.generatedAt));
  setText(els.registrationsMetric, number(accounts.total));
  setText(els.registrationsDetail, `24h ${number(accounts.last24h)} / 7d ${number(accounts.last7d)}`);
  setText(els.chatsMetric, number(chats.total));
  setText(els.chatsDetail, `24h ${number(chats.last24h)} / 7d ${number(chats.last7d)} / turns ${number(chats.turnsTotal)}`);
  setText(els.ordersMetric, number(orders.total));
  setText(els.ordersDetail, `active ${number(orders.active)} / completed ${number(orders.completed)} / failed ${number(orders.failed)}`);
  setText(els.agentsMetric, number(agents.total));
  setText(els.agentsDetail, `apps ${number(apps.length)} / user agents ${number(agents.userAgents)} / ready ${number(agents.ready)}`);
  setText(els.issuesMetric, number(reports.open));
  setText(els.issuesDetail, `reviewing ${number(reports.reviewing)} / resolved ${number(reports.resolved)}`);
}

function renderAccounts(accounts = []) {
  const rows = accounts.slice(0, 80).map((account) => {
    const providers = Array.isArray(account.linkedProviders) && account.linkedProviders.length
      ? account.linkedProviders.join(', ')
      : (account.authProvider || '-');
    const billing = [
      account.subscriptionPlan && account.subscriptionPlan !== 'none' ? account.subscriptionPlan : '',
      Number(account.welcomeCreditsBalance || 0) ? `welcome ${number(account.welcomeCreditsBalance)}` : '',
      Number(account.depositBalance || 0) ? `deposit ${number(account.depositBalance)}` : ''
    ].filter(Boolean).join(' / ') || '-';
    return [
      `<strong>${escapeHtml(account.login || account.displayName || '-')}</strong><small>${escapeHtml(account.email || account.id || '-')}</small>`,
      `<strong>${escapeHtml(providers)}</strong><small>API keys ${number(account.apiKeys?.active)} / ${number(account.apiKeys?.total)} / repos ${number(account.githubRepos)}</small>`,
      `<strong>${escapeHtml(billing)}</strong><small>Stripe ${escapeHtml(account.stripeCustomerStatus || 'not_started')}</small>`,
      `<strong>${escapeHtml(relativeDate(account.createdAt))}</strong><small>${escapeHtml(formatDate(account.createdAt))}</small>`,
      `<strong>${escapeHtml(relativeDate(account.updatedAt || account.createdAt))}</strong><small>${escapeHtml(formatDate(account.updatedAt || account.createdAt))}</small>`
    ];
  });
  setText(els.accountsCountLabel, `${number(accounts.length)} accounts`);
  if (els.accountsTable) {
    els.accountsTable.innerHTML = tableHtml(['Account', 'Auth', 'Billing', 'Created', 'Updated'], rows, 'No member registrations yet.');
  }
}

function renderOrders(orders = []) {
  const groups = groupedOrders(orders).slice(0, 30);
  const rows = groups.map((group) => {
    const status = orderGroupStatus(group);
    const totalCost = group.items.reduce((sum, item) => sum + Number(item.actualBilling?.total || 0), 0);
    const runs = group.items.map((order) => [
      '<div class="admin-order-run">',
      '<span>',
      `<strong>${escapeHtml(order.workflowTask || order.taskType || 'work')}</strong>`,
      `<small>${escapeHtml(order.workflowAgentName || order.parentAgentId || order.id || '-')}</small>`,
      '</span>',
      `<span class="status-pill ${statusClass(order.status)}">${escapeHtml(order.status || '-')}</span>`,
      `<span>${escapeHtml(relativeDate(order.updatedAt || order.createdAt))}</span>`,
      `<span>${escapeHtml(order.actualBilling ? number(order.actualBilling.total) : '-')}</span>`,
      '</div>'
    ].join('')).join('');
    return [
      `<details class="admin-order-group"><summary><span><strong>${escapeHtml(compact(group.title, 96))}</strong><small>${escapeHtml(group.id)}</small></span><span class="status-pill ${statusClass(status)}">${escapeHtml(status)}</span></summary><div class="admin-order-runs">${runs}</div></details>`,
      `<strong>${escapeHtml(group.requesterLogin || '-')}</strong><small>${escapeHtml(orderGroupSummary(group))}</small>`,
      `<span class="status-pill ${statusClass(status)}">${escapeHtml(status)}</span><small>${number(group.items.length)} runs / ${escapeHtml(relativeDate(group.updatedAt))}</small>`,
      `<strong>${escapeHtml(totalCost ? number(totalCost) : '-')}</strong><small>${escapeHtml(group.items[0]?.billingMode || '-')}</small>`
    ];
  });
  setText(els.ordersCountLabel, `${number(groups.length)} orders / ${number(orders.length)} runs`);
  if (els.ordersTable) {
    els.ordersTable.innerHTML = tableHtml(['Order', 'Requester', 'Status', 'Cost'], rows, 'No orders yet.');
  }
}

function renderChats(chats = []) {
  const rows = chats.slice(0, 30).map((chat) => [
    `<strong>${escapeHtml(relativeDate(chat.updatedAt || chat.createdAt))}</strong><small>${escapeHtml(chat.adminSegmentLabel || chat.authProvider || 'guest')}</small>`,
    `<strong>${escapeHtml(compact(chat.prompt || chat.recentPromptPreview || '-', 120))}</strong><small>${number(chat.turnCount || 1)} turns / ${escapeHtml(chat.latestTaskType || chat.taskType || '-')}</small>`,
    `<span class="status-pill ${chat.handlingNeedsReview ? 'warn' : 'ok'}">${escapeHtml(chat.handlingLabel || chat.handlingStatus || '-')}</span><small>${escapeHtml(chat.latestReviewStatus || 'new')}</small>`
  ]);
  setText(els.chatsCountLabel, `${number(chats.length)} sessions`);
  if (els.chatsTable) {
    els.chatsTable.innerHTML = tableHtml(['Time', 'Latest request', 'Handling'], rows, 'No chat sessions yet.');
  }
}

function renderAgents(agents = []) {
  const rows = agents.slice(0, 30).map((agent) => [
    `<strong>${escapeHtml(agent.name || agent.id || '-')}</strong><small>${escapeHtml((agent.taskTypes || []).slice(0, 4).join(', ') || agent.id || '-')}</small>`,
    `<strong>${escapeHtml(agent.owner || '-')}</strong><small>${escapeHtml(agent.productKind || 'agent')}</small>`,
    `<span class="status-pill ${agent.ready ? 'ok' : agent.online ? 'warn' : ''}">${escapeHtml(agent.ready ? 'ready' : agent.online ? 'online' : 'offline')}</span><small>${escapeHtml(agent.verificationStatus || '-')}</small>`
  ]);
  setText(els.agentsCountLabel, `${number(agents.length)} agents`);
  if (els.agentsTable) {
    els.agentsTable.innerHTML = tableHtml(['Agent', 'Owner', 'Status'], rows, 'No agents yet.');
  }
}

function renderApps(apps = []) {
  const rows = apps.slice(0, 30).map((app) => [
    `<strong>${escapeHtml(app.name || app.id || '-')}</strong><small>${escapeHtml(app.id || '-')}</small>`,
    `<strong>${escapeHtml(compact(app.description || '-', 90))}</strong><small>${escapeHtml((app.capabilities || app.taskTypes || []).slice(0, 3).join(', ') || '-')}</small>`,
    `<span class="status-pill ${statusClass(app.status || app.verificationStatus || '')}">${escapeHtml(app.status || app.verificationStatus || 'registered')}</span><small>${escapeHtml(app.owner || app.baseUrl || '-')}</small>`
  ]);
  setText(els.appsCountLabel, `${number(apps.length)} apps`);
  if (els.appsTable) {
    els.appsTable.innerHTML = tableHtml(['App', 'Capability', 'Status'], rows, 'No registered apps yet.');
  }
}

function render(snapshot = {}) {
  const dashboard = snapshot.adminDashboard || null;
  const apps = Array.isArray(snapshot.apps) ? snapshot.apps : [];
  if (!dashboard) {
    showGate('Admin dashboard unavailable.', 'The session is valid, but this account does not have platform admin access or the dashboard payload was not returned.', { error: true });
    return;
  }
  state.snapshot = snapshot;
  state.dashboard = dashboard;
  renderMetrics(dashboard, apps);
  renderAccounts(Array.isArray(dashboard.accounts) ? dashboard.accounts : []);
  renderOrders(Array.isArray(dashboard.orders) ? dashboard.orders : []);
  renderChats(Array.isArray(dashboard.chats) ? dashboard.chats : []);
  renderAgents(Array.isArray(dashboard.agents) ? dashboard.agents : []);
  renderApps(apps);
  if (els.downloadAccountsBtn) els.downloadAccountsBtn.disabled = false;
  showDashboard();
}

function accountsCsv() {
  const accounts = Array.isArray(state.dashboard?.accounts) ? state.dashboard.accounts : [];
  const headers = ['login', 'display_name', 'email', 'auth_provider', 'linked_providers', 'created_at', 'updated_at', 'subscription_plan', 'active_api_keys', 'github_repos'];
  const quote = (value = '') => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const lines = accounts.map((account) => [
    account.login,
    account.displayName,
    account.email,
    account.authProvider,
    Array.isArray(account.linkedProviders) ? account.linkedProviders.join('|') : '',
    account.createdAt,
    account.updatedAt,
    account.subscriptionPlan,
    account.apiKeys?.active || 0,
    account.githubRepos || 0
  ].map(quote).join(','));
  return [headers.join(','), ...lines].join('\n');
}

function downloadAccountsCsv() {
  const csv = accountsCsv();
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.download = `cait-admin-accounts-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(href), 1000);
}

async function loadAdminDashboard() {
  if (els.refreshBtn) els.refreshBtn.disabled = true;
  showGate('Loading admin dashboard.', 'Checking your session and platform admin permissions.');
  try {
    const snapshot = await api('/api/admin/dashboard');
    const auth = snapshot.auth || {};
    state.auth = auth;
    const login = auth.login || auth.user?.login || auth.user?.email || '';
    setText(els.authStatus, auth.loggedIn ? `Signed in as ${login || 'account'}` : 'Not signed in');
    if (!auth.loggedIn) {
      showGate('Sign in required.', `Open the sign-in page to continue to admin: ${adminLoginHref()}`, { error: true });
      els.gate.innerHTML = `<strong>Sign in required.</strong><span><a href="${escapeHtml(adminLoginHref())}">Sign in or sign up</a> to continue to admin.</span>`;
      return;
    }
    if (!auth.isPlatformAdmin && !auth.admin) {
      showGate('Admin access required.', 'This account is signed in, but it is not listed in ADMIN_DASHBOARD_LOGINS.', { error: true });
      return;
    }
    render(snapshot);
  } catch (error) {
    showGate('Admin dashboard failed to load.', error?.message || 'Unknown error', { error: true });
  } finally {
    if (els.refreshBtn) els.refreshBtn.disabled = false;
  }
}

els.refreshBtn?.addEventListener('click', () => {
  void loadAdminDashboard();
});

els.downloadAccountsBtn?.addEventListener('click', downloadAccountsCsv);

void loadAdminDashboard();
