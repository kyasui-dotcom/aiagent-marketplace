import { buildCaitAppContext, copyContextJson, fetchCaitAppContextFromUrl, sendContextToCait } from './cait-app-bridge.js?v=20260508d';

let items = [];
let selectedId = '';
let destinationFilter = 'all';
let marketFilter = 'all';
let localeFilter = 'all';
let statusFilter = 'all';
let workFilter = 'current';
let importedContext = null;
let csrfToken = '';
let repos = [];
let repoStatus = {
  checked: false,
  connected: false,
  message: 'GitHub not checked',
  result: null
};

const els = {
  destinationNav: document.getElementById('destinationNav'),
  listTitle: document.getElementById('listTitle'),
  contentList: document.getElementById('contentList'),
  statusPill: document.getElementById('statusPill'),
  destinationInput: document.getElementById('destinationInput'),
  marketInput: document.getElementById('marketInput'),
  localeInput: document.getElementById('localeInput'),
  ownerInput: document.getElementById('ownerInput'),
  titleInput: document.getElementById('titleInput'),
  slugInput: document.getElementById('slugInput'),
  metaInput: document.getElementById('metaInput'),
  bodyInput: document.getElementById('bodyInput'),
  approvalTable: document.getElementById('approvalTable'),
  packetPreview: document.getElementById('packetPreview'),
  sendPacketBtn: document.getElementById('sendPacketBtn'),
  copyPacketBtn: document.getElementById('copyPacketBtn'),
  connectGithubBtn: document.getElementById('connectGithubBtn'),
  refreshReposBtn: document.getElementById('refreshReposBtn'),
  createPrBtn: document.getElementById('createPrBtn'),
  repoSelect: document.getElementById('repoSelect'),
  repoPathInput: document.getElementById('repoPathInput'),
  githubStatusPill: document.getElementById('githubStatusPill'),
  githubStatusNote: document.getElementById('githubStatusNote'),
  publishResultPreview: document.getElementById('publishResultPreview'),
  approveSelectedBtn: document.getElementById('approveSelectedBtn'),
  saveDraftBtn: document.getElementById('saveDraftBtn'),
  requestChangesBtn: document.getElementById('requestChangesBtn'),
  blockBtn: document.getElementById('blockBtn'),
  workSelect: document.getElementById('workSelect'),
  handoffTargetSelect: document.getElementById('handoffTargetSelect'),
  marketFilterSelect: document.getElementById('marketFilterSelect'),
  localeFilterSelect: document.getElementById('localeFilterSelect'),
  statusFilterSelect: document.getElementById('statusFilterSelect'),
  publisherDestinationCount: document.getElementById('publisherDestinationCount'),
  publisherDestinationMetric: document.getElementById('publisherDestinationMetric'),
  publisherMarketMetric: document.getElementById('publisherMarketMetric'),
  publisherReviewMetric: document.getElementById('publisherReviewMetric'),
  publisherApprovedMetric: document.getElementById('publisherApprovedMetric'),
  publisherStepLoad: document.getElementById('publisherStepLoad'),
  publisherStepApproval: document.getElementById('publisherStepApproval'),
  publisherStepHandoff: document.getElementById('publisherStepHandoff')
};

function selectedItem() {
  return items.find((item) => item.id === selectedId) || null;
}

function selectedRepo() {
  const fullName = String(els.repoSelect?.value || '').trim();
  return repos.find((repo) => String(repo.fullName || repo.full_name || '') === fullName) || null;
}

function destinationKey(value = '') {
  return String(value || 'Unassigned destination').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'unassigned';
}

function itemDestination(item = null) {
  return String(item?.destination || item?.target || 'Unassigned destination').trim() || 'Unassigned destination';
}

function itemMarket(item = null) {
  return String(item?.market || 'Global').trim() || 'Global';
}

function itemLocale(item = null) {
  return String(item?.locale || 'en').trim() || 'en';
}

function destinationGroups() {
  const groups = new Map();
  items.forEach((item) => {
    const name = itemDestination(item);
    const key = destinationKey(name);
    const existing = groups.get(key) || {
      key,
      name,
      count: 0,
      needsReview: 0,
      approved: 0,
      markets: new Set(),
      locales: new Set()
    };
    existing.count += 1;
    existing.markets.add(itemMarket(item));
    existing.locales.add(itemLocale(item));
    if (String(item.status || '').toLowerCase() === 'approved') existing.approved += 1;
    if (statusClass(item.status) !== 'approved') existing.needsReview += 1;
    groups.set(key, existing);
  });
  return [...groups.values()].sort((a, b) => {
    if (a.needsReview !== b.needsReview) return b.needsReview - a.needsReview;
    return a.name.localeCompare(b.name);
  });
}

function visibleItems() {
  return items.filter((item) => {
    if (destinationFilter !== 'all' && destinationKey(itemDestination(item)) !== destinationFilter) return false;
    if (marketFilter !== 'all' && itemMarket(item) !== marketFilter) return false;
    if (localeFilter !== 'all' && itemLocale(item) !== localeFilter) return false;
    const status = String(item.status || '').toLowerCase();
    if (statusFilter === 'approved' && status !== 'approved') return false;
    if (statusFilter === 'needs_review' && status === 'approved') return false;
    if (!['all', 'approved', 'needs_review'].includes(statusFilter) && status !== statusFilter) return false;
    if (workFilter === 'approved' && status !== 'approved') return false;
    if (workFilter === 'needs_review' && status === 'approved') return false;
    return true;
  });
}

function statusClass(value = '') {
  const safe = String(value || '').toLowerCase();
  if (/approved/.test(safe)) return 'approved';
  if (/blocked/.test(safe)) return 'blocked';
  return 'pending';
}

function itemType(value = '') {
  const safe = String(value || '').toLowerCase();
  if (/directory|listing|submission/.test(safe)) return 'directory';
  if (/page|landing|seo|html|meta|article/.test(safe)) return 'page';
  return 'post';
}

function firstText(...values) {
  return values.find((value) => String(value || '').trim()) || '';
}

function marketFromValue(value = '') {
  const safe = String(value || '').trim();
  if (!safe) return 'Global';
  try {
    const url = new URL(safe);
    const host = url.hostname.toLowerCase();
    if (host.endsWith('.co.uk') || host.endsWith('.uk')) return 'UK';
    if (host.endsWith('.com.au') || host.endsWith('.au')) return 'Australia';
    if (host.endsWith('.ca')) return 'Canada';
    if (host.endsWith('.de')) return 'Germany';
    if (host.endsWith('.fr')) return 'France';
    if (host.endsWith('.jp')) return 'Japan';
    return 'Global';
  } catch {
    return 'Global';
  }
}

function destinationFromArtifact(artifact = {}, type = '') {
  return String(firstText(
    artifact.destination,
    artifact.publication,
    artifact.publisher,
    artifact.channel,
    artifact.site,
    artifact.media,
    artifact.partner,
    artifact.platform,
    artifact.target_domain,
    artifact.domain,
    artifact.target,
    type === 'directory' ? 'Directory network' : ''
  ) || 'Owned site').trim();
}

function githubConnectHref() {
  const url = new URL('/auth/github', window.location.origin);
  url.searchParams.set('mode', 'link');
  url.searchParams.set('return_to', '/publisher-approval.html');
  url.searchParams.set('login_source', 'publisher_approval');
  return url.toString();
}

function repoOptionHtml(repo = null) {
  if (!repo) return '<option value="">Connect GitHub and refresh repositories</option>';
  const fullName = String(repo.fullName || repo.full_name || '').trim();
  const label = [
    fullName,
    repo.private ? 'private' : 'public',
    repo.installationAccountLogin ? `install: ${repo.installationAccountLogin}` : ''
  ].filter(Boolean).join(' · ');
  return `<option value="${escapeHtml(fullName)}">${escapeHtml(label)}</option>`;
}

function itemMarkdown(item = null) {
  if (!item) return '';
  return [
    `# ${item.title || 'Approved CAIt packet'}`,
    '',
    `Status: ${item.status || 'needs approval'}`,
    `Type: ${item.type || 'content'}`,
    `Target path: ${item.slug || ''}`,
    item.meta ? `Meta description: ${item.meta}` : null,
    item.risk ? `Risk / blocker: ${item.risk}` : '',
    '',
    '## Approved body',
    '',
    item.body || '',
    '',
    '## Approval notes',
    '',
    'This file was generated by CAIt Publisher & Approval Studio as an approval-gated handoff. Review repository-specific implementation details before merging or publishing.'
  ].filter((line) => line !== null).join('\n');
}

async function refreshAuthSnapshot() {
  try {
    const response = await fetch('/api/snapshot', {
      headers: { accept: 'application/json' },
      credentials: 'same-origin'
    });
    const payload = await response.json().catch(() => ({}));
    csrfToken = String(payload?.auth?.csrfToken || payload?.snapshot?.auth?.csrfToken || '').trim();
  } catch {
    csrfToken = '';
  }
}

async function apiJson(path = '', options = {}) {
  const method = String(options.method || 'GET').toUpperCase();
  const headers = new Headers(options.headers || {});
  headers.set('accept', 'application/json');
  if (options.body && !headers.has('content-type')) headers.set('content-type', 'application/json');
  if (csrfToken && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) headers.set('x-aiagent2-csrf', csrfToken);
  const response = await fetch(path, {
    ...options,
    method,
    headers,
    credentials: 'same-origin'
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(String(payload?.error || `Request failed (${response.status})`));
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  return payload;
}

async function refreshGithubRepos(options = {}) {
  if (!options.silent) els.refreshReposBtn.textContent = 'Refreshing';
  try {
    const payload = await apiJson('/api/github/repos');
    repos = Array.isArray(payload?.repos) ? payload.repos : [];
    repoStatus = {
      checked: true,
      connected: true,
      message: repos.length ? `Loaded ${repos.length} GitHub repos` : 'GitHub connected, no repositories returned',
      result: payload
    };
  } catch (error) {
    repos = [];
    repoStatus = {
      checked: true,
      connected: false,
      message: String(error?.message || error || 'GitHub connection required'),
      result: error?.payload || null
    };
  } finally {
    renderGithubControls();
    if (!options.silent) els.refreshReposBtn.textContent = 'Refresh repos';
  }
}

async function createGithubPrHandoff() {
  persistSelectedFromFields();
  const item = selectedItem();
  const repo = selectedRepo();
  if (!item) {
    window.alert('Load a publisher packet first.');
    return;
  }
  if (String(item.status || '').toLowerCase() !== 'approved') {
    window.alert('Approve the selected packet before creating a GitHub PR handoff.');
    return;
  }
  if (!repo) {
    window.alert('Select a GitHub repository first.');
    return;
  }
  const fullName = String(repo.fullName || repo.full_name || '').trim();
  const [owner, repoName] = fullName.split('/');
  if (!owner || !repoName) {
    window.alert('Selected repository is invalid.');
    return;
  }
  els.createPrBtn.textContent = 'Creating PR';
  try {
    const payload = await apiJson('/api/deliveries/execute', {
      method: 'POST',
      body: JSON.stringify({
        action_kind: 'github_pr',
        confirm_execute: true,
        installation_id: repo.installationId || repo.installation_id || '',
        draft: {
          repoFullName: fullName,
          executionMode: 'draft_pr',
          kind: item.type === 'directory' ? 'directory_submission' : 'article_publish',
          repoPath: String(els.repoPathInput.value || '').trim()
        },
        deliverable: {
          kind: item.type === 'directory' ? 'directory_submission' : 'article_publish',
          title: item.title || 'Publisher approval handoff',
          fileName: item.slug || '',
          content: itemMarkdown(item)
        },
        source: 'publisher_approval_studio',
        kind: item.type === 'directory' ? 'directory_submission' : 'article_publish',
        repo_path: String(els.repoPathInput.value || '').trim()
      })
    });
    repoStatus = {
      checked: true,
      connected: true,
      message: payload?.pull_request?.htmlUrl ? 'GitHub PR created' : 'GitHub PR handoff created',
      result: payload
    };
  } catch (error) {
    repoStatus = {
      checked: true,
      connected: false,
      message: String(error?.message || error || 'PR handoff failed'),
      result: error?.payload || null
    };
  } finally {
    els.createPrBtn.textContent = 'Create PR handoff';
    renderGithubControls();
    render();
  }
}

function contextItemFromArtifact(artifact = {}, index = 0) {
  const type = itemType(artifact.type || artifact.action_type || artifact.content_type || artifact.name || '');
  const title = String(artifact.title || artifact.name || artifact.slug || `Imported item ${index + 1}`).trim();
  const destination = destinationFromArtifact(artifact, type);
  const market = String(firstText(artifact.market, artifact.region, artifact.country, artifact.geo, marketFromValue(artifact.url || artifact.slug || artifact.target || '')) || 'Global').trim();
  const locale = String(firstText(artifact.locale, artifact.language, artifact.lang, artifact.content_locale, market === 'Japan' ? 'ja-JP' : 'en') || 'en').trim();
  return {
    id: String(artifact.id || `imported-${index + 1}`).trim(),
    type,
    destination,
    market,
    locale,
    owner: String(firstText(artifact.owner, artifact.assignee, artifact.agent, artifact.source_agent, artifact.lead, 'CAIt') || 'CAIt').trim(),
    title,
    slug: String(artifact.slug || artifact.path || artifact.url || artifact.target || `/${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}`).trim(),
    meta: String(artifact.meta || artifact.description || artifact.summary || '').trim(),
    body: String(artifact.body || artifact.content || artifact.text || artifact.markdown || '').trim(),
    status: String(artifact.status || 'needs approval').trim(),
    target: String(artifact.target || destination || (type === 'directory' ? 'Directory submission' : 'Publisher handoff')).trim(),
    risk: String(artifact.risk || artifact.blocker || 'Final external publish/submit action still requires approval.').trim()
  };
}

function applyInboundContext(context = null) {
  if (!context) return;
  importedContext = context;
  const artifacts = Array.isArray(context.artifacts) ? context.artifacts : [];
  const approvals = Array.isArray(context.approval_requests) ? context.approval_requests : [];
  const files = Array.isArray(context.delivery_files) ? context.delivery_files : [];
  const importedItems = [
    ...artifacts.filter((artifact) => artifact && typeof artifact === 'object').map(contextItemFromArtifact),
    ...approvals.filter((approval) => approval && typeof approval === 'object').map((approval, index) => contextItemFromArtifact({
      ...approval,
      type: approval.action_type || 'approval',
      body: approval.body || approval.description || context.summary,
      risk: approval.blocker || approval.risk || ''
    }, artifacts.length + index)),
    ...files.filter((file) => file && typeof file === 'object').map((file, index) => contextItemFromArtifact({
      ...file,
      type: file.type || 'file',
      title: file.name || `Delivery file ${index + 1}`,
      body: file.content || '',
      status: 'needs approval',
      target: 'Delivery file'
    }, artifacts.length + approvals.length + index))
  ].filter((item) => item.title || item.body);
  if (!importedItems.length) {
    importedItems.push(contextItemFromArtifact({
      id: context.id || 'imported-context',
      type: 'approval',
      title: context.title || 'Imported CAIt context',
      body: context.summary || '',
      status: 'needs approval',
      risk: 'Imported server-side context needs review before external execution.'
    }, 0));
  }
  items = importedItems;
  selectedId = items[0]?.id || '';
  const target = (Array.isArray(context.handoff_targets) ? context.handoff_targets : []).find(Boolean);
  if (target && [...els.handoffTargetSelect.options].some((option) => option.value === target)) els.handoffTargetSelect.value = target;
}

function persistSelectedFromFields() {
  const item = selectedItem();
  if (!item) return;
  item.destination = els.destinationInput.value.trim();
  item.market = els.marketInput.value.trim();
  item.locale = els.localeInput.value.trim();
  item.owner = els.ownerInput.value.trim();
  item.title = els.titleInput.value.trim();
  item.slug = els.slugInput.value.trim();
  item.meta = els.metaInput.value.trim();
  item.body = els.bodyInput.value.trim();
}

function buildPacket() {
  const item = selectedItem();
  const target = String(els.handoffTargetSelect.value || 'seo_gap');
  const repo = selectedRepo();
  const prUrl = String(repoStatus?.result?.pull_request?.htmlUrl || repoStatus?.result?.entity?.pull_request?.htmlUrl || '').trim();
  if (!item) {
    return buildCaitAppContext({
      source_app: 'publisher_approval_studio',
      source_app_label: 'Publisher & Approval Studio',
      title: 'Publisher approval context',
      summary: 'No publisher packet is loaded yet. Open this app from a CAIt context handoff or send a draft from a leader workflow before approving external execution.',
      facts: ['No content, page, directory, or approval packet is loaded.'],
      assumptions: ['No built-in demo content is used.', 'Publishing, PR creation, directory submission, or connector execution still requires explicit approval.'],
      recommended_next_actions: ['Load a CAIt app context that contains artifacts or approval requests.'],
      handoff_targets: [target, 'build_team_leader', 'cmo_leader']
    });
  }
  return buildCaitAppContext({
    source_app: 'publisher_approval_studio',
    source_app_label: 'Publisher & Approval Studio',
    title: `${itemDestination(item)}: ${item.title}`,
    summary: `Global publishing packet for ${itemDestination(item)} (${itemMarket(item)}, ${itemLocale(item)}). Current status: ${item.status}. The selected item is ready for CAIt to route to ${target} after destination, market, locale, and execution waiting items are checked.`,
    facts: [
      importedContext ? `Imported context: ${importedContext.title || importedContext.id || 'CAIt app context'}` : '',
      `Destination: ${itemDestination(item)}`,
      `Market: ${itemMarket(item)}`,
      `Locale: ${itemLocale(item)}`,
      `Owner: ${item.owner || 'CAIt'}`,
      `Content type: ${item.type}`,
      `Target path: ${item.slug}`,
      `Approval status: ${item.status}`,
      `Risk: ${item.risk}`,
      repo ? `Selected GitHub repository: ${repo.fullName || repo.full_name}` : '',
      prUrl ? `Created PR: ${prUrl}` : ''
    ].filter(Boolean),
    assumptions: [
      'Publishing, PR creation, external directory submission, or connector execution still requires explicit approval.',
      'This first studio version prepares editable packets and does not publish directly.'
    ],
    artifacts: [
      { type: item.type, destination: itemDestination(item), market: itemMarket(item), locale: itemLocale(item), owner: item.owner || 'CAIt', title: item.title, slug: item.slug, meta: item.meta, body: item.body, status: item.status, risk: item.risk },
      { type: 'github_pr_handoff', repo: repo?.fullName || repo?.full_name || '', repo_path: String(els.repoPathInput?.value || '').trim(), pr_url: prUrl, status: repoStatus.message },
      { type: 'destination_profile', destination: itemDestination(item), market: itemMarket(item), locale: itemLocale(item), note: 'Destination profile should hold publication rules, owner, CTA policy, compliance notes, and execution method.' }
    ],
    approval_requests: items.map((entry) => ({
      id: entry.id,
      title: entry.title,
      action_type: entry.type === 'directory' ? 'directory_submission' : 'publish_change',
      status: entry.status,
      destination: itemDestination(entry),
      market: itemMarket(entry),
      locale: itemLocale(entry),
      target: entry.target,
      blocker: entry.status === 'blocked' ? entry.risk : ''
    })),
    recommended_next_actions: [
      'Ask CAIt to validate destination rules, market fit, locale, proof, URL, CTA, and connector state before execution.',
      prUrl ? 'Review the created GitHub PR before merging or publishing.' : 'Approve the selected packet, choose a GitHub repository, then create a PR handoff when repository execution is needed.',
      'Use this packet as the approval source before sending to owned sites, partner publications, social channels, directories, email, or publishing tools.'
    ],
    handoff_targets: [target, 'build_team_leader', 'cmo_leader'],
    raw_context: {
      ...(importedContext ? { received_context: importedContext } : {}),
      github_repo: repo?.fullName || repo?.full_name || '',
      github_pr_url: prUrl,
      github_status: repoStatus
    }
  });
}

function optionHtml(value = '', label = '') {
  return `<option value="${escapeHtml(value)}">${escapeHtml(label || value)}</option>`;
}

function renderDestinationNav() {
  const groups = destinationGroups();
  if (!groups.some((group) => group.key === destinationFilter)) destinationFilter = 'all';
  els.destinationNav.innerHTML = [
    `<button class="${destinationFilter === 'all' ? 'active' : ''}" type="button" data-destination="all"><span>All destinations</span><strong>${items.length}</strong></button>`,
    ...groups.map((group) => [
      `<button class="${group.key === destinationFilter ? 'active' : ''}" type="button" data-destination="${escapeHtml(group.key)}">`,
      `<span>${escapeHtml(group.name)}</span>`,
      `<small>${escapeHtml([...group.markets].join(', ') || 'Global')} · ${escapeHtml([...group.locales].join(', ') || 'en')}</small>`,
      `<strong>${group.count}</strong>`,
      '</button>'
    ].join(''))
  ].join('');
}

function renderFilters() {
  const markets = [...new Set(items.map(itemMarket))].sort((a, b) => a.localeCompare(b));
  const locales = [...new Set(items.map(itemLocale))].sort((a, b) => a.localeCompare(b));
  if (marketFilter !== 'all' && !markets.includes(marketFilter)) marketFilter = 'all';
  if (localeFilter !== 'all' && !locales.includes(localeFilter)) localeFilter = 'all';
  els.marketFilterSelect.innerHTML = [optionHtml('all', 'All markets'), ...markets.map((value) => optionHtml(value))].join('');
  els.localeFilterSelect.innerHTML = [optionHtml('all', 'All locales'), ...locales.map((value) => optionHtml(value))].join('');
  els.marketFilterSelect.value = marketFilter;
  els.localeFilterSelect.value = localeFilter;
  els.statusFilterSelect.value = statusFilter;
  els.workSelect.value = workFilter;
}

function renderList() {
  const list = visibleItems();
  const destination = destinationFilter === 'all'
    ? 'All destinations'
    : (destinationGroups().find((group) => group.key === destinationFilter)?.name || 'Destination');
  els.listTitle.textContent = `${destination} queue`;
  if (!list.some((item) => item.id === selectedId) && list[0]) selectedId = list[0].id;
  if (!list.length) selectedId = '';
  els.contentList.innerHTML = list.length ? list.map((item) => [
    `<button class="item-row ${item.id === selectedId ? 'active' : ''}" type="button" data-item="${escapeHtml(item.id)}">`,
    `<strong>${escapeHtml(item.title)}</strong>`,
    `<span>${escapeHtml(itemDestination(item))} · ${escapeHtml(itemMarket(item))} · ${escapeHtml(itemLocale(item))}</span>`,
    `<span>${escapeHtml(item.slug)} · ${escapeHtml(item.owner || 'CAIt')}</span>`,
    `<span class="status-pill ${statusClass(item.status)}">${escapeHtml(item.status)}</span>`,
    '</button>'
  ].join('')).join('') : '<div class="empty-state"><strong>No items match this destination view</strong><span>Clear the market, locale, or status filter, or open this app from a CAIt publishing handoff.</span></div>';
}

function setWorkflowStep(element, status = '', detail = '') {
  if (!element) return;
  element.className = `workflow-step ${status}`.trim();
  const detailNode = element.querySelector('span:last-child span:last-child');
  if (detailNode && detail) detailNode.textContent = detail;
}

function renderWorkflowState() {
  const item = selectedItem();
  const status = String(item?.status || '').toLowerCase();
  const approved = status === 'approved';
  const blocked = /blocked|changes requested/.test(status);
  const prUrl = String(repoStatus?.result?.pull_request?.htmlUrl || repoStatus?.result?.entity?.pull_request?.htmlUrl || '').trim();
  setWorkflowStep(
    els.publisherStepLoad,
    item ? 'done' : 'current',
    item ? `${itemDestination(item)} selected for ${itemMarket(item)} / ${itemLocale(item)}.` : 'No destination packet is loaded yet.'
  );
  setWorkflowStep(
    els.publisherStepApproval,
    approved ? 'done' : (blocked ? 'blocked' : (item ? 'current' : '')),
    approved ? 'Destination item is approved.' : (blocked ? 'This destination item is not ready to hand off.' : 'Review copy, destination rules, market, and locale.')
  );
  setWorkflowStep(
    els.publisherStepHandoff,
    prUrl ? 'done' : (approved ? 'current' : ''),
    prUrl ? 'GitHub PR handoff is created.' : (approved ? 'Send this approved packet to CAIt or create a PR handoff.' : 'Handoff waits for approval.')
  );
  if (els.sendPacketBtn) els.sendPacketBtn.textContent = approved ? 'Send approved packet' : 'Send to CAIt';
}

function renderCounts() {
  const groups = destinationGroups();
  const approved = items.filter((item) => String(item.status || '').toLowerCase() === 'approved').length;
  const needsReview = items.length - approved;
  const markets = new Set(items.map(itemMarket));
  els.publisherDestinationCount.textContent = String(groups.length);
  els.publisherDestinationMetric.textContent = String(groups.length);
  els.publisherMarketMetric.textContent = String(markets.size);
  els.publisherReviewMetric.textContent = String(needsReview);
  els.publisherApprovedMetric.textContent = String(approved);
}

function renderEditor() {
  const item = selectedItem();
  els.destinationInput.value = item ? itemDestination(item) : '';
  els.marketInput.value = item ? itemMarket(item) : '';
  els.localeInput.value = item ? itemLocale(item) : '';
  els.ownerInput.value = item?.owner || '';
  els.titleInput.value = item?.title || '';
  els.slugInput.value = item?.slug || '';
  els.metaInput.value = item?.meta || '';
  els.bodyInput.value = item?.body || '';
  els.statusPill.textContent = item?.status || 'no packet';
  els.statusPill.className = `status-pill ${statusClass(item?.status || '')}`;
}

function renderApprovalTable() {
  els.approvalTable.innerHTML = items.length ? [
    '<thead><tr><th>Destination</th><th>Item</th><th>Market</th><th>Status</th><th>Risk</th></tr></thead><tbody>',
    ...items.map((item) => `<tr class="${item.id === selectedId ? 'active-row' : ''}"><td><strong>${escapeHtml(itemDestination(item))}</strong><br>${escapeHtml(item.owner || 'CAIt')}</td><td><strong>${escapeHtml(item.title)}</strong><br>${escapeHtml(item.slug)}</td><td>${escapeHtml(itemMarket(item))}<br>${escapeHtml(itemLocale(item))}</td><td><span class="status-pill ${statusClass(item.status)}">${escapeHtml(item.status)}</span></td><td>${escapeHtml(item.risk)}</td></tr>`),
    '</tbody>'
  ].join('') : '<tbody><tr><td>No approval items loaded.</td><td>-</td><td>-</td><td>-</td><td>-</td></tr></tbody>';
}

function renderGithubControls() {
  const currentValue = String(els.repoSelect.value || '').trim();
  els.repoSelect.innerHTML = repos.length
    ? ['<option value="">Select repository</option>', ...repos.map(repoOptionHtml)].join('')
    : repoOptionHtml(null);
  if (repos.some((repo) => String(repo.fullName || repo.full_name || '') === currentValue)) els.repoSelect.value = currentValue;
  const connected = Boolean(repoStatus.connected);
  const prUrl = String(repoStatus?.result?.pull_request?.htmlUrl || repoStatus?.result?.entity?.pull_request?.htmlUrl || '').trim();
  els.githubStatusPill.textContent = prUrl ? 'PR created' : (connected ? 'GitHub connected' : (repoStatus.checked ? 'GitHub blocked' : 'GitHub not checked'));
  els.githubStatusPill.className = `status-pill ${prUrl || connected ? 'approved' : (repoStatus.checked ? 'blocked' : 'pending')}`;
  els.githubStatusNote.innerHTML = prUrl
    ? `PR handoff created: <a href="${escapeHtml(prUrl)}" target="_blank" rel="noopener">open pull request</a>`
    : escapeHtml(repoStatus.message || 'Connect GitHub, choose a repository, approve the selected packet, then create a PR handoff.');
  els.publishResultPreview.textContent = JSON.stringify(repoStatus.result || {
    next: 'Approve an item and create a GitHub PR handoff when repository execution is needed.'
  }, null, 2);
}

function render() {
  renderCounts();
  renderDestinationNav();
  renderFilters();
  renderList();
  renderEditor();
  renderApprovalTable();
  renderGithubControls();
  renderWorkflowState();
  els.packetPreview.textContent = JSON.stringify(buildPacket(), null, 2);
}

function setSelectedStatus(status) {
  if (!selectedItem()) return;
  persistSelectedFromFields();
  selectedItem().status = status;
  render();
}

els.destinationNav.addEventListener('click', (event) => {
  const button = event.target.closest('[data-destination]');
  if (!button) return;
  persistSelectedFromFields();
  destinationFilter = String(button.dataset.destination || 'all');
  render();
});

els.contentList.addEventListener('click', (event) => {
  const button = event.target.closest('[data-item]');
  if (!button) return;
  persistSelectedFromFields();
  selectedId = String(button.dataset.item || selectedId);
  render();
});

[els.destinationInput, els.marketInput, els.localeInput, els.ownerInput, els.titleInput, els.slugInput, els.metaInput, els.bodyInput, els.handoffTargetSelect].forEach((input) => {
  input.addEventListener('input', () => {
    persistSelectedFromFields();
    render();
  });
});

els.workSelect.addEventListener('change', () => {
  persistSelectedFromFields();
  workFilter = String(els.workSelect.value || 'current');
  render();
});

els.marketFilterSelect.addEventListener('change', () => {
  persistSelectedFromFields();
  marketFilter = String(els.marketFilterSelect.value || 'all');
  render();
});

els.localeFilterSelect.addEventListener('change', () => {
  persistSelectedFromFields();
  localeFilter = String(els.localeFilterSelect.value || 'all');
  render();
});

els.statusFilterSelect.addEventListener('change', () => {
  persistSelectedFromFields();
  statusFilter = String(els.statusFilterSelect.value || 'all');
  render();
});

els.saveDraftBtn.addEventListener('click', () => setSelectedStatus('draft'));
els.requestChangesBtn.addEventListener('click', () => setSelectedStatus('changes requested'));
els.blockBtn.addEventListener('click', () => setSelectedStatus('blocked'));
els.approveSelectedBtn.addEventListener('click', () => setSelectedStatus('approved'));
els.connectGithubBtn.addEventListener('click', () => {
  window.location.href = githubConnectHref();
});
els.refreshReposBtn.addEventListener('click', () => {
  void refreshGithubRepos();
});
els.createPrBtn.addEventListener('click', () => {
  void createGithubPrHandoff();
});
els.repoSelect.addEventListener('change', () => render());
els.repoPathInput.addEventListener('input', () => {
  els.packetPreview.textContent = JSON.stringify(buildPacket(), null, 2);
});
els.sendPacketBtn.addEventListener('click', () => {
  persistSelectedFromFields();
  void sendContextToCait(buildPacket()).catch((error) => {
    window.alert(`CAIt context handoff failed: ${error.message}`);
  });
});
els.copyPacketBtn.addEventListener('click', async () => {
  persistSelectedFromFields();
  await copyContextJson(buildPacket());
  els.copyPacketBtn.textContent = 'Copied';
  window.setTimeout(() => { els.copyPacketBtn.textContent = 'Copy packet'; }, 1200);
});

async function bootstrap() {
  await refreshAuthSnapshot();
  applyInboundContext(await fetchCaitAppContextFromUrl());
  render();
  void refreshGithubRepos({ silent: true });
}

void bootstrap();

function escapeHtml(value = '') {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
