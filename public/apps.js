import {
  BUILT_IN_APP_MANIFESTS as FALLBACK_BUILT_IN_APPS,
  CORE_FEATURE_APP_IDS
} from './app-manifest-registry.js?v=20260526i';

const listEl = document.querySelector('[data-context-list]');
const registryListEl = document.querySelector('[data-app-registry-list]');
const featuredListEl = document.querySelector('[data-featured-app-list]');
const APP_WORKSPACE_GROUPS = Object.freeze([
  {
    id: 'growth-publisher-workspace',
    name: 'Growth & Publisher Workspace',
    primaryId: 'growth-experiment-console',
    entryId: 'growth-experiment-console',
    memberIds: ['growth-experiment-console', 'publisher-approval-studio'],
    description: 'Retain Growth experiments, measurement guardrails, Publisher packets, social copy, and approval state in one launch workflow.',
    tags: ['growth', 'publisher', 'approval']
  },
  {
    id: 'campaign-control-workspace',
    name: 'Campaign Control Workspace',
    primaryId: 'campaign-operations',
    entryId: 'campaign-operations',
    memberIds: ['campaign-operations', 'ads-launch-console', 'lead-ops-console'],
    description: 'Manage campaign state, paid launch gates, lead review, waiting conditions, owners, and measurement loops as one operations workspace.',
    tags: ['campaigns', 'ads', 'leads']
  },
  {
    id: 'analytics-measurement-workspace',
    name: 'Analytics & Measurement Workspace',
    primaryId: 'analytics-console',
    entryId: 'analytics-console',
    memberIds: ['analytics-console'],
    description: 'Keep acquisition, search, landing page, conversion, and post-run evidence available before ordering the next agent task.',
    tags: ['analytics', 'seo', 'measurement']
  },
  {
    id: 'pricing-decision-workspace',
    name: 'Pricing Decision Workspace',
    primaryId: 'pricing-decision-console',
    entryId: 'pricing-decision-console',
    memberIds: ['pricing-decision-console'],
    description: 'Review pricing assumptions, scenarios, approval owner, proof tracker, decision trigger, and rollback rule before price changes.',
    tags: ['pricing', 'finance', 'approval']
  }
]);

function escapeHtml(value = '') {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function compact(value = '', max = 220) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text.length <= max ? text : `${text.slice(0, max - 1).trim()}...`;
}

function displayDate(value = '') {
  const time = Date.parse(String(value || ''));
  if (!Number.isFinite(time)) return '';
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(time));
  } catch {
    return new Date(time).toLocaleString();
  }
}

function setText(selector, value) {
  document.querySelectorAll(selector).forEach((el) => {
    el.textContent = String(value);
  });
}

function list(value = []) {
  return Array.isArray(value) ? value.map((item) => String(item || '').trim()).filter(Boolean) : [];
}

function isCoreFeatureAppId(value = '') {
  return CORE_FEATURE_APP_IDS.has(String(value || '').trim().toLowerCase());
}

function normalizeApp(record = {}) {
  const inputContract = record.inputContract && typeof record.inputContract === 'object' ? record.inputContract : {};
  const handoff = record.handoff && typeof record.handoff === 'object' ? record.handoff : {};
  const capabilities = list(record.capabilities);
  const requiredConnectors = list(record.requiredConnectors || record.required_connectors);
  const requiresApprovalFor = list(record.requiresApprovalFor || record.requires_approval_for);
  const mcp = record.mcp && typeof record.mcp === 'object' ? record.mcp : {};
  const returns = list(inputContract.returns);
  const id = String(record.id || '').trim();
  if (!id || isCoreFeatureAppId(id)) return null;
  const isAction = requiresApprovalFor.length > 0
    || Boolean(handoff.createUrl || handoff.create_url)
    || capabilities.some((item) => /(^|_)(publish|submit|send|action|queue|handoff)(_|$)/i.test(item));
  return {
    id,
    name: String(record.name || id).trim(),
    description: String(record.description || '').trim(),
    entryUrl: String(record.entryUrl || record.entry_url || '').trim(),
    status: String(record.status || 'active').trim(),
    verificationStatus: String(record.verificationStatus || record.verification_status || 'unverified').trim(),
    owner: String(record.owner || '').trim(),
    capabilities,
    requiredConnectors,
    requiresApprovalFor,
    mcp: {
      enabled: mcp.enabled === false ? false : Boolean(mcp.enabled || mcp.serverUrl || mcp.server_url),
      serverUrl: String(mcp.serverUrl || mcp.server_url || '').trim(),
      tools: list(mcp.tools),
      resources: list(mcp.resources)
    },
    returns,
    tags: list(record.tags),
    isAction
  };
}

function uniqueList(values = []) {
  return [...new Set(values.map((item) => String(item || '').trim()).filter(Boolean))];
}

function workspaceGroupsFromApps(records = []) {
  const apps = records.map(normalizeApp).filter(Boolean);
  const byId = new Map(apps.map((app) => [app.id, app]));
  const groupedIds = new Set();
  const groups = APP_WORKSPACE_GROUPS.map((group) => {
    const members = group.memberIds.map((id) => byId.get(id)).filter(Boolean);
    if (!members.length) return null;
    members.forEach((member) => groupedIds.add(member.id));
    const primary = byId.get(group.primaryId) || members[0];
    const entry = byId.get(group.entryId) || primary;
    const requiresApprovalFor = uniqueList(members.flatMap((member) => member.requiresApprovalFor));
    return {
      id: group.id,
      primaryId: primary.id,
      name: group.name,
      description: group.description,
      entryUrl: entry.entryUrl || primary.entryUrl,
      status: uniqueList(members.map((member) => member.status)).join(', ') || 'active',
      verificationStatus: uniqueList(members.map((member) => member.verificationStatus)).join(', ') || 'cait_managed',
      owner: uniqueList(members.map((member) => member.owner)).join(', '),
      capabilities: uniqueList(members.flatMap((member) => member.capabilities)),
      requiredConnectors: uniqueList(members.flatMap((member) => member.requiredConnectors)),
      requiresApprovalFor,
      returns: uniqueList(members.flatMap((member) => member.returns)),
      tags: uniqueList([...(group.tags || []), ...members.flatMap((member) => member.tags)]),
      isAction: requiresApprovalFor.length > 0 || members.some((member) => member.isAction),
      isWorkspace: true,
      members
    };
  }).filter(Boolean);
  const singletons = apps
    .filter((app) => !groupedIds.has(app.id) && app.id !== 'x-client-ops')
    .map((app) => ({ ...app, primaryId: app.id, members: [app], isWorkspace: false }));
  return [...groups, ...singletons];
}

function sameOriginAppUrl(value = '') {
  const text = String(value || '').trim();
  if (!text) return '';
  try {
    const parsed = new URL(text, window.location.origin);
    const isBuiltInCaitHost = /^(?:www\.)?(?:aiagent-marketplace\.net|aiagent-market\.net|aiagent2\.net)$/i.test(parsed.hostname);
    const isAppSurfacePath = parsed.pathname === '/apps.html'
      || /-(?:console|ops|operations)\.html$/i.test(parsed.pathname)
      || /approval\.html$/i.test(parsed.pathname);
    if (isBuiltInCaitHost && isAppSurfacePath) {
      return `${window.location.origin}${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
    return parsed.toString();
  } catch {
    return text;
  }
}

function appTypeLabel(app) {
  if (app.isAction) return 'Action app';
  if (app.returns.length || app.capabilities.some((item) => /context|analytics|packet|delivery|measurement|crm/i.test(item))) return 'Context app';
  return 'Registered app';
}

function renderAppChips(items = [], emptyLabel = '') {
  const values = list(items).slice(0, 5);
  if (!values.length && emptyLabel) return `<span class="mini-chip">${escapeHtml(emptyLabel)}</span>`;
  return values.map((item) => `<span class="mini-chip">${escapeHtml(item.replace(/_/g, ' '))}</span>`).join('');
}

function updateAppMetrics(apps = []) {
  const contextCount = apps.filter((app) => !app.isAction).length;
  const actionCount = apps.filter((app) => app.isAction).length;
  const connectorCount = new Set(apps.flatMap((app) => app.requiredConnectors)).size;
  setText('[data-app-count]', apps.length || '0');
  setText('[data-context-app-count]', contextCount || '0');
  setText('[data-action-app-count]', actionCount || '0');
  setText('[data-connector-count]', connectorCount || '0');
}

function renderApps(records = []) {
  if (!registryListEl) return;
  const apps = workspaceGroupsFromApps(records);
  updateAppMetrics(apps);
  if (!apps.length) {
    registryListEl.innerHTML = '<div class="notice">No operational workspaces are visible yet.</div>';
    return;
  }
  registryListEl.innerHTML = apps.map((app) => {
    const meta = [
      app.isWorkspace ? 'Merged workspace' : appTypeLabel(app),
      app.members?.length ? `${app.members.length} lane${app.members.length === 1 ? '' : 's'}` : '',
      app.status ? `Status: ${app.status}` : '',
      app.verificationStatus ? `Verification: ${app.verificationStatus}` : '',
      app.owner ? `Owner: ${app.owner}` : ''
    ].filter(Boolean).join(' / ');
    const openUrl = sameOriginAppUrl(app.entryUrl) || `/chat?app_id=${encodeURIComponent(app.primaryId || app.id)}`;
    const memberLinks = (app.members || []).map((member) => {
      const href = sameOriginAppUrl(member.entryUrl) || `/chat?app_id=${encodeURIComponent(member.id)}`;
      return `<a class="mini-chip" href="${escapeHtml(href)}">${escapeHtml(member.name)}</a>`;
    }).join('');
    return [
      '<article class="app-registry-row">',
      '<div>',
      `<div class="status-row"><h3>${escapeHtml(app.name)}</h3><span class="status-pill">${escapeHtml(app.isWorkspace ? 'Workspace' : appTypeLabel(app))}</span></div>`,
      `<p class="context-meta">${escapeHtml(meta)}</p>`,
      app.description ? `<p>${escapeHtml(compact(app.description, 180))}</p>` : '',
      '<div class="inline-actions">',
      renderAppChips(app.requiredConnectors, 'No connector'),
      renderAppChips(app.requiresApprovalFor, app.isAction ? 'Approval required' : ''),
      app.mcp?.enabled ? '<span class="mini-chip">MCP ready</span>' : '',
      '</div>',
      memberLinks ? `<div class="inline-actions workspace-lanes" aria-label="Included app lanes">${memberLinks}</div>` : '',
      '</div>',
      '<div class="context-actions">',
      `<a class="primary-btn" href="${escapeHtml(openUrl)}">Open</a>`,
      '</div>',
      '</article>'
    ].filter(Boolean).join('');
  }).join('');
}

function renderFeaturedApps(records = []) {
  if (!featuredListEl) return;
  const featured = workspaceGroupsFromApps(records);
  if (!featured.length) {
    featuredListEl.innerHTML = '<div class="notice">No featured workspaces are visible yet.</div>';
    return;
  }
  featuredListEl.innerHTML = featured.map((app) => {
    const href = sameOriginAppUrl(app.entryUrl) || `/chat?app_id=${encodeURIComponent(app.primaryId || app.id)}`;
    const labelSource = app.tags.length ? app.tags : (app.capabilities.length ? app.capabilities : [appTypeLabel(app)]);
    const tag = labelSource.slice(0, 2).map((item) => String(item || '').replace(/[_-]+/g, ' ')).join(' / ');
    return [
      `<a class="detail-card panel" href="${escapeHtml(href)}">`,
      `<span class="kicker">${escapeHtml(tag || appTypeLabel(app))}</span>`,
      `<h2>${escapeHtml(app.name)}</h2>`,
      `<p>${escapeHtml(compact(app.description, 150))}</p>`,
      '<div class="inline-actions">',
      renderAppChips(app.tags.length ? app.tags : app.capabilities, ''),
      app.members?.length ? `<span class="mini-chip">${escapeHtml(`${app.members.length} lanes`)}</span>` : '',
      app.mcp?.enabled ? '<span class="mini-chip">MCP</span>' : '',
      '</div>',
      '</a>'
    ].join('');
  }).join('');
}

async function loadApps() {
  if (!registryListEl) return;
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 6000);
  try {
    const response = await fetch('/api/apps?limit=100', {
      credentials: 'same-origin',
      signal: controller.signal,
      headers: { accept: 'application/json' }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(String(data?.error || `Request failed (${response.status})`));
    const apps = Array.isArray(data.apps) ? data.apps : [];
    renderApps(apps);
    renderFeaturedApps(apps);
  } catch (error) {
    renderApps(FALLBACK_BUILT_IN_APPS);
    renderFeaturedApps(FALLBACK_BUILT_IN_APPS);
  } finally {
    window.clearTimeout(timeout);
  }
}

function normalizeContext(record = {}) {
  const context = record.context && typeof record.context === 'object' ? record.context : {};
  const operationalSummary = record.operational_summary && typeof record.operational_summary === 'object'
    ? record.operational_summary
    : {};
  const id = String(record.id || context.id || '').trim();
  if (!id) return null;
  return {
    id,
    source: String(record.source_app_label || context.source_app_label || record.source_app || context.source_app || 'App').trim(),
    title: String(record.title || context.title || 'App context').trim(),
    summary: String(record.summary || context.summary || '').trim(),
    status: String(record.status || 'ready').trim(),
    createdAt: String(record.created_at || context.created_at || '').trim(),
    expiresAt: String(record.expires_at || context.expires_at || '').trim(),
    operationalSummary
  };
}

function contextAnchorChips(summary = {}) {
  const entries = [
    ['artifacts', 'Artifacts'],
    ['delivery_files', 'Files'],
    ['metrics', 'Metrics'],
    ['approval_requests', 'Approvals'],
    ['recommended_next_actions', 'Next actions'],
    ['handoff_targets', 'Targets'],
    ['facts', 'Facts']
  ];
  const chips = entries
    .map(([key, label]) => {
      const count = Number(summary[key] || 0);
      return count > 0 ? `<span class="mini-chip context-anchor-chip">${escapeHtml(label)} ${count}</span>` : '';
    })
    .filter(Boolean);
  if (!chips.length) return '<span class="mini-chip context-anchor-chip">Retained packet</span>';
  return chips.slice(0, 6).join('');
}

function renderNotice(message = '') {
  if (!listEl) return;
  listEl.innerHTML = `<div class="notice">${escapeHtml(message)}</div>`;
}

function renderContexts(records = []) {
  if (!listEl) return;
  const contexts = records.map(normalizeContext).filter(Boolean);
  if (!contexts.length) {
    renderNotice('No app contexts yet. Open an app, review data or approvals, then press Send to CAIt.');
    return;
  }
  listEl.innerHTML = contexts.map((item) => {
    const meta = [
      item.source,
      item.status ? `Status: ${item.status}` : '',
      item.createdAt ? `Created ${displayDate(item.createdAt)}` : '',
      item.expiresAt ? `Expires ${displayDate(item.expiresAt)}` : ''
    ].filter(Boolean).join(' / ');
    return [
      '<article class="context-row">',
      '<div>',
      `<h3>${escapeHtml(item.title)}</h3>`,
      `<p class="context-meta">${escapeHtml(meta)}</p>`,
      item.summary ? `<p>${escapeHtml(compact(item.summary))}</p>` : '',
      `<div class="context-anchor-strip" aria-label="Retained context anchors">${contextAnchorChips(item.operationalSummary)}</div>`,
      '</div>',
      '<div class="context-actions">',
      `<a class="primary-btn" href="/chat?app_context_id=${encodeURIComponent(item.id)}">Use in chat</a>`,
      '</div>',
      '</article>'
    ].filter(Boolean).join('');
  }).join('');
}

async function loadContexts() {
  if (!listEl) return;
  try {
    const response = await fetch('/api/app-contexts?limit=10', {
      credentials: 'same-origin',
      headers: { accept: 'application/json' }
    });
    const data = await response.json().catch(() => ({}));
    if (response.status === 401) {
      listEl.innerHTML = [
        '<div class="notice">',
        'Sign in to view server-side app contexts for your account. ',
        '<a href="/login?next=%2Fapps.html&amp;source=app_contexts">Sign in</a>',
        '</div>'
      ].join('');
      return;
    }
    if (!response.ok) throw new Error(String(data?.error || `Request failed (${response.status})`));
    renderContexts(Array.isArray(data.app_contexts) ? data.app_contexts : []);
  } catch (error) {
    renderNotice(`Recent contexts could not be loaded. ${String(error?.message || error || '')}`);
  }
}

void loadApps();
void loadContexts();
