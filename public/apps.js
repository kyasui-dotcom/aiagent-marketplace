import {
  APP_STANDALONE_HIDDEN_APP_IDS,
  APP_WORKSPACE_GROUPS,
  BUILT_IN_APP_MANIFESTS as FALLBACK_BUILT_IN_APPS,
  CORE_FEATURE_APP_IDS
} from './app-manifest-registry.js?v=20260526k';

const listEl = document.querySelector('[data-context-list]');
const registryListEl = document.querySelector('[data-app-registry-list]');
const featuredListEl = document.querySelector('[data-featured-app-list]');

const FRIENDLY_APP_COPY = Object.freeze({
  'analytics-measurement-workspace': {
    title: '集客の数字を確認',
    summary: 'ブログやSNSのアクセス、問い合わせ数などを見やすくまとめます。今の状況確認に使います。',
    status: 'すぐに使えます',
    requirement: 'Google連携があると正確です',
    label: '数字を見る',
    icon: 'chart',
    entryAppId: 'analytics-console'
  },
  'growth-publisher-workspace': {
    title: '公開前に内容を確認',
    summary: '記事やページの内容をチェックして、公開してよいか・直す点を確認します。',
    status: '確認してから進めます',
    requirement: 'ログイン後に使えます',
    label: '公開チェック',
    icon: 'clipboard',
    entryAppId: 'publisher-approval-studio'
  },
  'campaign-control-workspace': {
    title: '見込み客とメールを整理',
    summary: '問い合わせや営業リスト、メール案をまとめて、対応漏れを防ぎます。',
    status: '少し準備が必要です',
    requirement: 'Google連携があると便利です',
    label: '営業整理',
    icon: 'mail',
    entryAppId: 'lead-ops-console'
  },
  'pricing-decision-workspace': {
    title: '料金や見積もりを考える',
    summary: '値上げ、見積もり、料金変更の前に、根拠と戻し方を整理します。',
    status: '確認しながら進めます',
    requirement: '準備なしで開けます',
    label: '料金確認',
    icon: 'yen',
    entryAppId: 'pricing-decision-console'
  },
  'analytics-console': {
    title: '集客の数字を確認',
    summary: 'アクセス、検索、問い合わせの数字を見て、次に何を直すか考えます。',
    status: 'すぐに使えます',
    requirement: 'Google連携があると正確です',
    label: '数字を見る',
    icon: 'chart'
  },
  'publisher-approval-studio': {
    title: '公開前に内容を確認',
    summary: '記事、ページ、SNS文を確認して、公開前の不安を減らします。',
    status: '確認してから進めます',
    requirement: 'ログイン後に使えます',
    label: '公開チェック',
    icon: 'clipboard'
  },
  'lead-ops-console': {
    title: '見込み客とメールを整理',
    summary: '営業リストやメール案を見直して、対応漏れを防ぎます。',
    status: '少し準備が必要です',
    requirement: 'Google連携があると便利です',
    label: '営業整理',
    icon: 'mail'
  },
  'pricing-decision-console': {
    title: '料金や見積もりを考える',
    summary: '価格を変える前に、根拠、確認者、戻し方を整理します。',
    status: '確認しながら進めます',
    requirement: '準備なしで開けます',
    label: '料金確認',
    icon: 'yen'
  }
});

const FRIENDLY_APP_ORDER = [
  'analytics-measurement-workspace',
  'growth-publisher-workspace',
  'campaign-control-workspace',
  'pricing-decision-workspace'
];

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
    .filter((app) => !groupedIds.has(app.id) && !APP_STANDALONE_HIDDEN_APP_IDS.has(app.id))
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

function friendlyCopy(app = {}) {
  return FRIENDLY_APP_COPY[app.id]
    || FRIENDLY_APP_COPY[app.primaryId]
    || {
      title: app.name || 'アプリ',
      summary: app.description ? compact(app.description, 110) : '作業に必要な情報を確認して、CAItに戻します。',
      status: app.isAction ? '確認してから進めます' : '開いて確認できます',
      requirement: app.requiredConnectors?.length ? '連携が必要な場合があります' : '準備なしで開けます',
      label: appTypeLabel(app),
      icon: app.isAction ? 'clipboard' : 'chart'
    };
}

function appMcpReady(app = {}) {
  const members = Array.isArray(app.members) ? app.members : [app];
  return members.some((member) => member?.mcp?.enabled === true);
}

function sortFriendlyApps(apps = []) {
  const rank = new Map(FRIENDLY_APP_ORDER.map((id, index) => [id, index]));
  return [...apps].sort((a, b) => {
    const aRank = rank.has(a.id) ? rank.get(a.id) : 99;
    const bRank = rank.has(b.id) ? rank.get(b.id) : 99;
    if (aRank !== bRank) return aRank - bRank;
    return String(a.name || '').localeCompare(String(b.name || ''));
  });
}

function preferredOpenUrl(app = {}, copy = {}) {
  const preferred = copy.entryAppId
    ? (app.members || []).find((member) => member.id === copy.entryAppId)
    : null;
  const target = preferred || app;
  return sameOriginAppUrl(target.entryUrl) || `/chat?app_id=${encodeURIComponent(target.primaryId || target.id || app.primaryId || app.id)}`;
}

function appChoiceIcon(name = 'chart') {
  const icons = {
    chart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19V9"/><path d="M12 19V5"/><path d="M19 19v-8"/></svg>',
    clipboard: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5h6"/><path d="M9 4h6l1 3h3v13H5V7h3l1-3Z"/><path d="m8 13 3 3 5-6"/></svg>',
    mail: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16v10H4z"/><path d="m4 8 8 6 8-6"/></svg>',
    yen: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 4 5 8 5-8"/><path d="M12 12v8"/><path d="M8 13h8"/><path d="M8 17h8"/></svg>'
  };
  return `<span class="app-choice-icon" aria-hidden="true">${icons[name] || icons.chart}</span>`;
}

function renderApps(records = []) {
  if (!registryListEl) return;
  const apps = sortFriendlyApps(workspaceGroupsFromApps(records));
  updateAppMetrics(apps);
  if (!apps.length) {
    registryListEl.innerHTML = '<div class="notice">表示できるアプリがまだありません。</div>';
    return;
  }
  registryListEl.innerHTML = apps.map((app) => {
    const copy = friendlyCopy(app);
    const openUrl = preferredOpenUrl(app, copy);
    const countText = app.members?.length > 1 ? `${app.members.length}つの機能をまとめています` : '単独で使えます';
    return [
      '<article class="app-registry-row app-choice-row">',
      '<div class="app-choice-main">',
      appChoiceIcon(copy.icon),
      '<div class="app-choice-copy">',
      `<div class="status-row"><h3>${escapeHtml(copy.title)}</h3><span class="status-pill">${escapeHtml(copy.label)}</span></div>`,
      `<p>${escapeHtml(copy.summary)}</p>`,
      '<div class="app-choice-help">',
      `<span>${escapeHtml(copy.status)}</span>`,
      `<span>${escapeHtml(copy.requirement)}</span>`,
      `<span>${escapeHtml(countText)}</span>`,
      appMcpReady(app) ? '<span>MCP ready</span>' : '',
      '</div>',
      '</div>',
      '</div>',
      '<div class="context-actions">',
      `<a class="primary-btn app-open-btn" href="${escapeHtml(openUrl)}">開く</a>`,
      '</div>',
      '</article>'
    ].filter(Boolean).join('');
  }).join('');
}

function renderFeaturedApps(records = []) {
  if (!featuredListEl) return;
  const featured = sortFriendlyApps(workspaceGroupsFromApps(records)).slice(0, 3);
  if (!featured.length) {
    featuredListEl.innerHTML = '<div class="notice">おすすめを表示できませんでした。</div>';
    return;
  }
  featuredListEl.innerHTML = featured.map((app) => {
    const copy = friendlyCopy(app);
    const href = preferredOpenUrl(app, copy);
    return [
      `<a class="detail-card panel" href="${escapeHtml(href)}">`,
      `<span class="kicker">${escapeHtml(copy.label)}</span>`,
      `<h2>${escapeHtml(copy.title)}</h2>`,
      `<p>${escapeHtml(copy.summary)}</p>`,
      `<span class="mini-chip">${escapeHtml(copy.status)}</span>`,
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
    ['artifacts', '成果物'],
    ['delivery_files', 'ファイル'],
    ['metrics', '数字'],
    ['approval_requests', '確認待ち'],
    ['recommended_next_actions', '次にやること'],
    ['handoff_targets', '送り先'],
    ['facts', '事実']
  ];
  const chips = entries
    .map(([key, label]) => {
      const count = Number(summary[key] || 0);
      return count > 0 ? `<span class="mini-chip context-anchor-chip">${escapeHtml(label)} ${count}</span>` : '';
    })
    .filter(Boolean);
  if (!chips.length) return '<span class="mini-chip context-anchor-chip">保存済み</span>';
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
    renderNotice('まだ最近使った内容はありません。アプリを開いて確認したあと、CAItに送るとここに表示されます。');
    return;
  }
  listEl.innerHTML = contexts.map((item) => {
    const meta = [
      item.source,
      item.status ? `状態: ${item.status}` : '',
      item.createdAt ? `作成: ${displayDate(item.createdAt)}` : '',
      item.expiresAt ? `期限: ${displayDate(item.expiresAt)}` : ''
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
      `<a class="primary-btn" href="/chat?app_context_id=${encodeURIComponent(item.id)}">続きから相談</a>`,
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
        '最近使った内容を見るにはログインしてください。 ',
        '<a href="/login?next=%2Fapps.html&amp;source=app_contexts">ログインする</a>',
        '</div>'
      ].join('');
      return;
    }
    if (!response.ok) throw new Error(String(data?.error || `Request failed (${response.status})`));
    renderContexts(Array.isArray(data.app_contexts) ? data.app_contexts : []);
  } catch (error) {
    renderNotice(`最近使った内容を読み込めませんでした。${String(error?.message || error || '')}`);
  }
}

void loadApps();
void loadContexts();
