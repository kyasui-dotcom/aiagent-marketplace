import { buildCaitAppContext, copyContextJson, fetchCaitAppContextFromUrl, sendContextToCait } from './cait-app-bridge.js?v=20260516a';

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
let wordpressStatus = {
  checked: false,
  connected: false,
  message: 'WordPress not checked',
  result: null
};
let publishResult = null;

const PUBLISH_DESTINATION_PROFILES = [
  {
    key: 'x',
    label: 'X',
    connector: 'x',
    capability: 'x.post',
    method: 'x_oauth_or_x_saas',
    actionType: 'x_post',
    patterns: [/\bx[_ -]?post\b/i, /\bx-post\b/i, /\btwitter\b/i, /\btweet\b/i, /\bx ops\b/i, /\bx publisher\b/i, /\bx\.com\b/i]
  },
  {
    key: 'reddit',
    label: 'Reddit',
    connector: 'reddit',
    capability: 'reddit.post',
    method: 'reddit_oauth_or_manual_copy',
    actionType: 'reddit_post',
    patterns: [/reddit/i, /subreddit/i]
  },
  {
    key: 'indie_hackers',
    label: 'Indie Hackers',
    connector: 'indie_hackers',
    capability: 'indie_hackers.post',
    method: 'indie_hackers_connector_or_manual_copy',
    actionType: 'indie_hackers_post',
    patterns: [/indie[\s_-]?hackers/i, /\bih\b/i]
  },
  {
    key: 'instagram',
    label: 'Instagram',
    connector: 'instagram',
    capability: 'instagram.post',
    method: 'instagram_connector_or_manual_copy',
    actionType: 'instagram_post',
    patterns: [/instagram/i, /\binsta\b/i, /\big\b/i]
  },
  {
    key: 'social',
    label: 'Social copy packet',
    connector: 'manual',
    capability: 'manual.copy',
    method: 'manual_social_copy',
    actionType: 'social_post',
    patterns: [/social_copy/i, /\bsocial\b/i, /\bsns\b/i, /community_post/i, /post text/i, /投稿/i]
  },
  {
    key: 'directory',
    label: 'Directory / listing',
    connector: 'directory_app',
    capability: 'directory.submit',
    method: 'saas_or_manual_submit',
    actionType: 'directory_submission',
    patterns: [/directory/i, /listing/i, /submission/i, /directory-submission/i]
  },
  {
    key: 'wordpress_site',
    label: 'WordPress site',
    connector: 'wordpress',
    capability: 'wordpress.create_draft',
    method: 'wordpress_application_password',
    actionType: 'wordpress_draft',
    patterns: [/wordpress/i, /\bwp\b/i, /wp-json/i]
  },
  {
    key: 'owned_site',
    label: 'Owned site / GitHub PR',
    connector: 'github',
    capability: 'github.write_pr',
    method: 'github_pr',
    actionType: 'article_publish',
    patterns: [/seo[_ -]?gap/i, /seo_article/i, /seo page/i, /\bseo\b/i, /landing_page/i, /landing page/i, /\blanding\b/i, /article_draft/i, /\barticle\b/i, /meta title/i, /h1 and metadata/i, /owned site/i, /github_pr/i, /github\.write_pr/i]
  },
  {
    key: 'email',
    label: 'Email',
    connector: 'google',
    capability: 'google.send_gmail',
    method: 'gmail_or_resend',
    actionType: 'email_send',
    patterns: [/email/i, /gmail/i, /newsletter/i, /cold-email/i]
  },
  {
    key: 'generic',
    label: 'Generic publishing packet',
    connector: 'manual',
    capability: 'manual.copy',
    method: 'manual_copy',
    actionType: 'publish_change',
    patterns: []
  }
];

const els = {
  destinationNav: document.getElementById('destinationNav'),
  listTitle: document.getElementById('listTitle'),
  contentList: document.getElementById('contentList'),
  statusPill: document.getElementById('statusPill'),
  destinationInput: document.getElementById('destinationInput'),
  channelSelect: document.getElementById('channelSelect'),
  connectorInput: document.getElementById('connectorInput'),
  connectorCapabilityInput: document.getElementById('connectorCapabilityInput'),
  publishMethodInput: document.getElementById('publishMethodInput'),
  marketInput: document.getElementById('marketInput'),
  localeInput: document.getElementById('localeInput'),
  ownerInput: document.getElementById('ownerInput'),
  titleInput: document.getElementById('titleInput'),
  slugInput: document.getElementById('slugInput'),
  metaInput: document.getElementById('metaInput'),
  keywordsInput: document.getElementById('keywordsInput'),
  h1Input: document.getElementById('h1Input'),
  primaryCtaInput: document.getElementById('primaryCtaInput'),
  secondaryCtaInput: document.getElementById('secondaryCtaInput'),
  internalLinksInput: document.getElementById('internalLinksInput'),
  ogTitleInput: document.getElementById('ogTitleInput'),
  ogDescriptionInput: document.getElementById('ogDescriptionInput'),
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
  refreshWordpressBtn: document.getElementById('refreshWordpressBtn'),
  connectWordpressBtn: document.getElementById('connectWordpressBtn'),
  createWordpressDraftBtn: document.getElementById('createWordpressDraftBtn'),
  wordpressSiteInput: document.getElementById('wordpressSiteInput'),
  wordpressUsernameInput: document.getElementById('wordpressUsernameInput'),
  wordpressPasswordInput: document.getElementById('wordpressPasswordInput'),
  wordpressPostTypeSelect: document.getElementById('wordpressPostTypeSelect'),
  wordpressStatusPill: document.getElementById('wordpressStatusPill'),
  wordpressStatusNote: document.getElementById('wordpressStatusNote'),
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

function profileByKey(key = '') {
  const safe = String(key || '').trim().toLowerCase();
  return PUBLISH_DESTINATION_PROFILES.find((profile) => profile.key === safe) || PUBLISH_DESTINATION_PROFILES.at(-1);
}

function itemProfile(item = null) {
  return profileByKey(item?.channel || item?.channelKey || item?.medium || '');
}

function itemConnector(item = null) {
  return String(item?.connector || itemProfile(item)?.connector || 'manual').trim() || 'manual';
}

function itemConnectorCapability(item = null) {
  return String(item?.connectorCapability || item?.connector_capability || itemProfile(item)?.capability || 'manual.copy').trim() || 'manual.copy';
}

function itemPublishMethod(item = null) {
  return String(item?.publishMethod || item?.publish_method || itemProfile(item)?.method || 'manual_copy').trim() || 'manual_copy';
}

function itemActionType(item = null) {
  return String(item?.actionType || item?.action_type || itemProfile(item)?.actionType || 'publish_change').trim() || 'publish_change';
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

function artifactProfileText(artifact = {}, type = '', body = '') {
  return [
    artifact.id,
    artifact.type,
    artifact.action_type,
    artifact.actionType,
    artifact.content_type,
    artifact.contentType,
    artifact.item_type,
    artifact.itemType,
    artifact.channel_key,
    artifact.channelKey,
    artifact.medium_key,
    artifact.mediumKey,
    artifact.media_key,
    artifact.mediaKey,
    artifact.connector,
    artifact.required_connector,
    artifact.requiredConnector,
    artifact.connector_capability,
    artifact.connectorCapability,
    artifact.publish_method,
    artifact.publishMethod,
    artifact.task_type,
    artifact.taskType,
    artifact.workflow_task,
    artifact.workflowTask,
    artifact.source_task_type,
    artifact.sourceTaskType,
    artifact.name,
    artifact.title,
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
    type,
    body
  ].filter(Boolean).join('\n');
}

function explicitProfileFromArtifact(artifact = {}, type = '') {
  const values = [
    artifact.channel_key,
    artifact.channelKey,
    artifact.medium_key,
    artifact.mediumKey,
    artifact.media_key,
    artifact.mediaKey,
    artifact.channel,
    artifact.media,
    artifact.platform,
    artifact.connector,
    artifact.required_connector,
    artifact.requiredConnector,
    artifact.connector_capability,
    artifact.connectorCapability,
    artifact.publish_method,
    artifact.publishMethod,
    artifact.action_type,
    artifact.actionType,
    artifact.item_type,
    artifact.itemType,
    artifact.type,
    type
  ].filter(Boolean).map((value) => String(value || '').trim());
  for (const value of values) {
    const normalized = value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    const exact = PUBLISH_DESTINATION_PROFILES.find((profile) => (
      profile.key === normalized
      || profile.actionType === value
      || profile.connector === value
      || profile.capability === value
      || profile.method === value
    ));
    if (exact && exact.key !== 'generic') return exact;
  }
  const text = values.join('\n');
  return PUBLISH_DESTINATION_PROFILES.find((profile) => profile.key !== 'generic' && profile.patterns.some((pattern) => pattern.test(text))) || null;
}

function destinationProfileFromArtifact(artifact = {}, type = '', body = '') {
  const explicitProfile = explicitProfileFromArtifact(artifact, type);
  if (explicitProfile) return explicitProfile;
  const text = artifactProfileText(artifact, type, body);
  const directProfile = PUBLISH_DESTINATION_PROFILES.find((profile) => profile.key !== 'generic' && profile.patterns.some((pattern) => pattern.test(text)));
  return directProfile
    || PUBLISH_DESTINATION_PROFILES.at(-1);
}

function isGenericDestination(value = '') {
  return /^(?:delivery file|publisher handoff|unassigned destination|generic publishing packet)$/i.test(String(value || '').trim());
}

function destinationFromArtifact(artifact = {}, type = '', profile = null) {
  const explicit = String(firstText(
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
    artifact.target
  ) || '').trim();
  if (explicit && !isGenericDestination(explicit)) return explicit;
  return String(profile?.label || (type === 'directory' ? 'Directory / listing' : 'Generic publishing packet')).trim();
}

function slugFromTitle(value = '') {
  const slug = String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug ? `/${slug}` : '';
}

function markdownFieldValue(markdown = '', labels = []) {
  const source = String(markdown || '').replace(/\r\n/g, '\n');
  for (const label of labels) {
    const safeLabel = String(label || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const table = source.match(new RegExp(`(?:^|\\n)\\|\\s*(?:\\*\\*)?${safeLabel}(?:\\*\\*)?\\s*\\|\\s*([^|\\n]+?)\\s*\\|`, 'i'));
    if (table?.[1]) return table[1].trim();
    const field = source.match(new RegExp(`(?:^|\\n)\\s*(?:[-*]\\s*)?(?:\\*\\*)?${safeLabel}(?:\\*\\*)?\\s*[:：]\\s*([^\\n]+)`, 'i'));
    if (field?.[1]) return field[1].trim();
  }
  return '';
}

function artifactBodyText(artifact = {}) {
  return String(artifact.body || artifact.content || artifact.text || artifact.markdown || '').trim();
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
    `Medium / channel: ${itemProfile(item)?.label || item.channel || 'Generic publishing packet'}`,
    `Publish connector: ${itemConnector(item)}`,
    `Connector capability: ${itemConnectorCapability(item)}`,
    `Publish method: ${itemPublishMethod(item)}`,
    `Target path: ${item.slug || ''}`,
    item.h1 ? `H1: ${item.h1}` : null,
    item.meta ? `Meta description: ${item.meta}` : null,
    item.keywords ? `Keywords: ${item.keywords}` : null,
    item.primaryCta ? `Primary CTA: ${item.primaryCta}` : null,
    item.secondaryCta ? `Secondary CTA: ${item.secondaryCta}` : null,
    item.internalLinks ? `Internal links: ${item.internalLinks}` : null,
    item.ogTitle ? `OG title: ${item.ogTitle}` : null,
    item.ogDescription ? `OG description: ${item.ogDescription}` : null,
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
    publishResult = { kind: 'github_pr_handoff', payload };
  } catch (error) {
    repoStatus = {
      checked: true,
      connected: false,
      message: String(error?.message || error || 'PR handoff failed'),
      result: error?.payload || null
    };
    publishResult = { kind: 'github_pr_handoff_failed', error: repoStatus.message, payload: repoStatus.result };
  } finally {
    els.createPrBtn.textContent = 'Create PR handoff';
    renderGithubControls();
    render();
  }
}

async function refreshWordpressStatus(options = {}) {
  if (!els.refreshWordpressBtn) return;
  if (!options.silent) els.refreshWordpressBtn.textContent = 'Checking';
  try {
    const payload = await apiJson('/api/connectors/wordpress/status');
    const status = payload?.wordpress || {};
    wordpressStatus = {
      checked: true,
      connected: Boolean(status.connected),
      message: status.connected ? `WordPress connected: ${status.siteUrl}` : 'WordPress is not connected',
      result: payload
    };
    if (status.siteUrl && els.wordpressSiteInput && !els.wordpressSiteInput.value) els.wordpressSiteInput.value = status.siteUrl;
    if (status.username && els.wordpressUsernameInput && !els.wordpressUsernameInput.value) els.wordpressUsernameInput.value = status.username;
  } catch (error) {
    wordpressStatus = {
      checked: true,
      connected: false,
      message: String(error?.message || error || 'WordPress connection required'),
      result: error?.payload || null
    };
  } finally {
    renderWordpressControls();
    if (!options.silent) els.refreshWordpressBtn.textContent = 'Check WordPress';
  }
}

async function connectWordpress() {
  const siteUrl = String(els.wordpressSiteInput?.value || '').trim();
  const username = String(els.wordpressUsernameInput?.value || '').trim();
  const applicationPassword = String(els.wordpressPasswordInput?.value || '').trim();
  if (!siteUrl || !username || !applicationPassword) {
    window.alert('Enter the WordPress site URL, username, and Application Password.');
    return;
  }
  els.connectWordpressBtn.textContent = 'Connecting';
  try {
    const payload = await apiJson('/api/connectors/wordpress/connect', {
      method: 'POST',
      body: JSON.stringify({
        site_url: siteUrl,
        username,
        application_password: applicationPassword,
        source: 'publisher_approval_studio'
      })
    });
    wordpressStatus = {
      checked: true,
      connected: Boolean(payload?.wordpress?.connected),
      message: payload?.wordpress?.connected ? `WordPress connected: ${payload.wordpress.siteUrl}` : 'WordPress checked',
      result: payload
    };
    if (els.wordpressPasswordInput) els.wordpressPasswordInput.value = '';
    publishResult = { kind: 'wordpress_connect', payload };
  } catch (error) {
    wordpressStatus = {
      checked: true,
      connected: false,
      message: String(error?.message || error || 'WordPress connection failed'),
      result: error?.payload || null
    };
    publishResult = { kind: 'wordpress_connect_failed', error: wordpressStatus.message, payload: wordpressStatus.result };
  } finally {
    els.connectWordpressBtn.textContent = 'Connect WordPress';
    render();
  }
}

async function createWordpressDraftHandoff() {
  persistSelectedFromFields();
  const item = selectedItem();
  if (!item) {
    window.alert('Load a publisher packet first.');
    return;
  }
  if (String(item.status || '').toLowerCase() !== 'approved') {
    window.alert('Approve the selected packet before creating a WordPress draft.');
    return;
  }
  if (!wordpressStatus.connected) {
    await refreshWordpressStatus({ silent: true });
  }
  els.createWordpressDraftBtn.textContent = 'Creating draft';
  try {
    const payload = await apiJson('/api/connectors/wordpress/create-draft', {
      method: 'POST',
      body: JSON.stringify({
        confirm_create_draft: true,
        post_type: String(els.wordpressPostTypeSelect?.value || 'posts'),
        title: item.title || 'CAIt publisher draft',
        slug: item.slug || '',
        meta: item.meta || '',
        content: itemMarkdown(item),
        source: 'publisher_approval_studio',
        channel: item.channel,
        connector: 'wordpress',
        connector_capability: 'wordpress.create_draft',
        publish_method: 'wordpress_application_password'
      })
    });
    wordpressStatus = {
      checked: true,
      connected: true,
      message: payload?.draft?.editUrl ? 'WordPress draft created' : 'WordPress draft handoff created',
      result: payload
    };
    publishResult = { kind: 'wordpress_draft', payload };
  } catch (error) {
    wordpressStatus = {
      checked: true,
      connected: false,
      message: String(error?.message || error || 'WordPress draft creation failed'),
      result: error?.payload || null
    };
    publishResult = { kind: 'wordpress_draft_failed', error: wordpressStatus.message, payload: wordpressStatus.result };
  } finally {
    els.createWordpressDraftBtn.textContent = 'Create WP draft';
    render();
  }
}

function contextItemFromArtifact(artifact = {}, index = 0) {
  let type = itemType(artifact.type || artifact.action_type || artifact.content_type || artifact.name || '');
  const body = artifactBodyText(artifact);
  const profile = destinationProfileFromArtifact(artifact, type, body);
  if (profile.key === 'directory') type = 'directory';
  if (profile.key === 'owned_site') type = 'page';
  if (['x', 'reddit', 'indie_hackers', 'instagram', 'social'].includes(profile.key)) type = 'post';
  if (profile.key === 'email') type = 'email';
  const extractedTitle = markdownFieldValue(body, ['Meta title', 'Page title', 'Title', 'H1', 'Headline']);
  const extractedMeta = markdownFieldValue(body, ['Meta description', 'Description']);
  const extractedH1 = markdownFieldValue(body, ['H1', 'Headline']);
  const extractedKeywords = markdownFieldValue(body, ['Keywords', 'Meta keywords', 'Target keyword', 'Target query', 'Primary keyword', 'Keyword cluster', 'Keyword and intent']);
  const extractedPrimaryCta = markdownFieldValue(body, ['Primary CTA', 'CTA', '主CTA']);
  const extractedSecondaryCta = markdownFieldValue(body, ['Secondary CTA', '副CTA']);
  const extractedInternalLinks = markdownFieldValue(body, ['Internal links', 'Internal link', '内部リンク']);
  const extractedOgTitle = markdownFieldValue(body, ['OG title', 'Open Graph title']);
  const extractedOgDescription = markdownFieldValue(body, ['OG description', 'Open Graph description']);
  const title = String(artifact.title || extractedTitle || artifact.name || artifact.slug || `Imported item ${index + 1}`).trim();
  const destination = destinationFromArtifact(artifact, type, profile);
  const market = String(firstText(artifact.market, artifact.region, artifact.country, artifact.geo, marketFromValue(artifact.url || artifact.slug || artifact.target || '')) || 'Global').trim();
  const locale = String(firstText(artifact.locale, artifact.language, artifact.lang, artifact.content_locale, market === 'Japan' ? 'ja-JP' : 'en') || 'en').trim();
  const channel = String(firstText(artifact.channel_key, artifact.channelKey, artifact.medium_key, artifact.mediumKey, artifact.media_key, artifact.mediaKey, profile.key) || profile.key).trim();
  const selectedProfile = profileByKey(channel);
  return {
    id: String(artifact.id || `imported-${index + 1}`).trim(),
    type,
    channel: selectedProfile.key,
    destination,
    connector: String(firstText(artifact.connector, artifact.required_connector, artifact.requiredConnector, selectedProfile.connector) || selectedProfile.connector).trim(),
    connectorCapability: String(firstText(artifact.connector_capability, artifact.connectorCapability, artifact.capability, selectedProfile.capability) || selectedProfile.capability).trim(),
    publishMethod: String(firstText(artifact.publish_method, artifact.publishMethod, artifact.execution_method, artifact.executionMethod, selectedProfile.method) || selectedProfile.method).trim(),
    actionType: String(firstText(artifact.action_type, artifact.actionType, selectedProfile.actionType) || selectedProfile.actionType).trim(),
    market,
    locale,
    owner: String(firstText(artifact.owner, artifact.assignee, artifact.agent, artifact.source_agent, artifact.lead, 'CAIt') || 'CAIt').trim(),
    title,
    slug: String(artifact.slug || artifact.path || artifact.url || artifact.target || slugFromTitle(title)).trim(),
    meta: String(artifact.meta || artifact.description || extractedMeta || artifact.summary || '').trim(),
    keywords: String(firstText(artifact.keywords, artifact.keyword, artifact.meta_keywords, artifact.target_keyword, artifact.targetQuery, extractedKeywords) || '').trim(),
    h1: String(firstText(artifact.h1, artifact.h_1, artifact.headline, extractedH1) || '').trim(),
    primaryCta: String(firstText(artifact.primary_cta, artifact.primaryCta, artifact.cta, extractedPrimaryCta) || '').trim(),
    secondaryCta: String(firstText(artifact.secondary_cta, artifact.secondaryCta, extractedSecondaryCta) || '').trim(),
    internalLinks: String(firstText(artifact.internal_links, artifact.internalLinks, extractedInternalLinks) || '').trim(),
    ogTitle: String(firstText(artifact.og_title, artifact.ogTitle, extractedOgTitle) || '').trim(),
    ogDescription: String(firstText(artifact.og_description, artifact.ogDescription, extractedOgDescription) || '').trim(),
    body,
    status: String(artifact.status || 'needs approval').trim(),
    target: String(artifact.target || destination || (type === 'directory' ? 'Directory submission' : 'Publisher handoff')).trim(),
    risk: String(artifact.risk || artifact.blocker || 'Final external publish/submit action still requires approval.').trim()
  };
}

function contextItemFromDeliveryItem(item = {}, index = 0) {
  const metadata = item.metadata && typeof item.metadata === 'object' ? item.metadata : {};
  return contextItemFromArtifact({
    id: item.id || `delivery-item-${index + 1}`,
    type: item.itemType || metadata.item_type || 'publish_asset',
    title: item.title || metadata.title || `Delivery item ${index + 1}`,
    slug: metadata.slug || metadata.path || metadata.target_path || '',
    meta: metadata.meta_description || metadata.description || item.summary || '',
    body: item.body || item.summary || '',
    status: String(item.status || 'needs_review').replace(/_/g, ' '),
    owner: item.workflowAgentName || metadata.owner || 'CAIt',
    destination: metadata.destination || metadata.target || '',
    channel_key: metadata.channel_key || metadata.channel || metadata.medium || '',
    connector: metadata.connector || metadata.required_connector || '',
    connector_capability: metadata.connector_capability || metadata.capability || '',
    publish_method: metadata.publish_method || metadata.execution_method || '',
    market: metadata.market || metadata.region || '',
    locale: metadata.locale || metadata.language || '',
    risk: metadata.risk || metadata.blocker || 'Review this delivery item before external publishing.',
    source_job_id: item.jobId,
    source_delivery_item_id: item.id
  }, index);
}

async function loadPublisherDeliveryItems() {
  try {
    const payload = await apiJson('/api/delivery-items?surface=publisher&limit=100');
    const imported = (Array.isArray(payload.items) ? payload.items : [])
      .map(contextItemFromDeliveryItem)
      .filter((item) => item.title || item.body);
    if (!imported.length) return;
    const existing = new Set(items.map((item) => String(item.id || '')));
    items = [
      ...items,
      ...imported.filter((item) => !existing.has(String(item.id || '')))
    ];
    if (!selectedId && items[0]) selectedId = items[0].id;
  } catch {
    // Logged-out users or empty workspaces simply have no saved publisher items.
  }
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
  const profile = profileByKey(els.channelSelect.value);
  item.channel = profile.key;
  item.connector = profile.connector;
  item.connectorCapability = profile.capability;
  item.publishMethod = profile.method;
  item.actionType = profile.actionType;
  item.market = els.marketInput.value.trim();
  item.locale = els.localeInput.value.trim();
  item.owner = els.ownerInput.value.trim();
  item.title = els.titleInput.value.trim();
  item.slug = els.slugInput.value.trim();
  item.meta = els.metaInput.value.trim();
  item.keywords = els.keywordsInput.value.trim();
  item.h1 = els.h1Input.value.trim();
  item.primaryCta = els.primaryCtaInput.value.trim();
  item.secondaryCta = els.secondaryCtaInput.value.trim();
  item.internalLinks = els.internalLinksInput.value.trim();
  item.ogTitle = els.ogTitleInput.value.trim();
  item.ogDescription = els.ogDescriptionInput.value.trim();
  item.body = els.bodyInput.value.trim();
}

function buildPacket() {
  const item = selectedItem();
  const target = String(els.handoffTargetSelect.value || 'seo_gap');
  const repo = selectedRepo();
  const prUrl = String(repoStatus?.result?.pull_request?.htmlUrl || repoStatus?.result?.entity?.pull_request?.htmlUrl || '').trim();
  const wpDraftUrl = String(wordpressStatus?.result?.draft?.editUrl || wordpressStatus?.result?.draft?.link || '').trim();
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
      `Medium / channel: ${itemProfile(item)?.label || item.channel}`,
      `Publish connector: ${itemConnector(item)}`,
      `Connector capability: ${itemConnectorCapability(item)}`,
      `Publish method: ${itemPublishMethod(item)}`,
      `Market: ${itemMarket(item)}`,
      `Locale: ${itemLocale(item)}`,
      `Owner: ${item.owner || 'CAIt'}`,
      `Content type: ${item.type}`,
      `Target path: ${item.slug}`,
      item.h1 ? `H1: ${item.h1}` : '',
      item.keywords ? `Keywords: ${item.keywords}` : '',
      item.primaryCta ? `Primary CTA: ${item.primaryCta}` : '',
      item.secondaryCta ? `Secondary CTA: ${item.secondaryCta}` : '',
      item.internalLinks ? `Internal links: ${item.internalLinks}` : '',
      item.ogTitle ? `OG title: ${item.ogTitle}` : '',
      item.ogDescription ? `OG description: ${item.ogDescription}` : '',
      `Approval status: ${item.status}`,
      `Risk: ${item.risk}`,
      repo ? `Selected GitHub repository: ${repo.fullName || repo.full_name}` : '',
      prUrl ? `Created PR: ${prUrl}` : '',
      wpDraftUrl ? `Created WordPress draft: ${wpDraftUrl}` : ''
    ].filter(Boolean),
    assumptions: [
      'Publishing, PR creation, external directory submission, or connector execution still requires explicit approval.',
      'Publisher can create repository handoff PRs or WordPress drafts, but final publishing remains outside chat and approval-gated.'
    ],
    artifacts: [
      { type: item.type, channel: item.channel, destination: itemDestination(item), connector: itemConnector(item), connector_capability: itemConnectorCapability(item), publish_method: itemPublishMethod(item), action_type: itemActionType(item), market: itemMarket(item), locale: itemLocale(item), owner: item.owner || 'CAIt', title: item.title, slug: item.slug, meta: item.meta, keywords: item.keywords, h1: item.h1, primary_cta: item.primaryCta, secondary_cta: item.secondaryCta, internal_links: item.internalLinks, og_title: item.ogTitle, og_description: item.ogDescription, body: item.body, status: item.status, risk: item.risk },
      { type: 'github_pr_handoff', repo: repo?.fullName || repo?.full_name || '', repo_path: String(els.repoPathInput?.value || '').trim(), pr_url: prUrl, status: repoStatus.message },
      { type: 'wordpress_draft_handoff', site_url: wordpressStatus?.result?.wordpress?.siteUrl || '', draft_url: wpDraftUrl, draft_id: wordpressStatus?.result?.draft?.id || '', post_type: String(els.wordpressPostTypeSelect?.value || 'posts'), status: wordpressStatus.message },
      { type: 'destination_profile', channel: item.channel, destination: itemDestination(item), connector: itemConnector(item), connector_capability: itemConnectorCapability(item), publish_method: itemPublishMethod(item), market: itemMarket(item), locale: itemLocale(item), note: 'Destination profile holds publication rules, owner, CTA policy, compliance notes, OAuth connector, and execution method.' }
    ],
    approval_requests: items.map((entry) => ({
      id: entry.id,
      title: entry.title,
      action_type: itemActionType(entry),
      status: entry.status,
      channel: entry.channel,
      connector: itemConnector(entry),
      connector_capability: itemConnectorCapability(entry),
      publish_method: itemPublishMethod(entry),
      destination: itemDestination(entry),
      market: itemMarket(entry),
      locale: itemLocale(entry),
      target: entry.target,
      blocker: entry.status === 'blocked' ? entry.risk : ''
    })),
    recommended_next_actions: [
      'Ask CAIt to validate destination rules, market fit, locale, proof, URL, CTA, and connector state before execution.',
      prUrl ? 'Review the created GitHub PR before merging or publishing.' : 'Approve the selected packet, choose a GitHub repository or WordPress connector, then create the handoff needed for that destination.',
      'Use this packet as the approval source before sending to owned sites, partner publications, social channels, directories, email, or publishing tools.'
    ],
    handoff_targets: [target, 'build_team_leader', 'cmo_leader'],
    raw_context: {
      ...(importedContext ? { received_context: importedContext } : {}),
      github_repo: repo?.fullName || repo?.full_name || '',
      github_pr_url: prUrl,
      github_status: repoStatus,
      wordpress_status: wordpressStatus,
      publish_result: publishResult
    }
  });
}

function optionHtml(value = '', label = '') {
  return `<option value="${escapeHtml(value)}">${escapeHtml(label || value)}</option>`;
}

function channelOptionHtml(profile = null) {
  if (!profile) return '';
  return optionHtml(profile.key, profile.label);
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
    `<span>${escapeHtml(itemDestination(item))} · ${escapeHtml(itemProfile(item)?.label || item.channel)} · ${escapeHtml(itemMarket(item))} · ${escapeHtml(itemLocale(item))}</span>`,
    `<span>${escapeHtml(itemConnector(item))} · ${escapeHtml(itemConnectorCapability(item))} · ${escapeHtml(itemPublishMethod(item))}</span>`,
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
  const wpDraftUrl = String(wordpressStatus?.result?.draft?.editUrl || wordpressStatus?.result?.draft?.link || '').trim();
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
    prUrl || wpDraftUrl ? 'done' : (approved ? 'current' : ''),
    prUrl ? 'GitHub PR handoff is created.' : (wpDraftUrl ? 'WordPress draft handoff is created.' : (approved ? 'Send this approved packet to CAIt or create a destination handoff.' : 'Handoff waits for approval.'))
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
  if (els.channelSelect) {
    els.channelSelect.innerHTML = PUBLISH_DESTINATION_PROFILES.map(channelOptionHtml).join('');
  }
  els.destinationInput.value = item ? itemDestination(item) : '';
  if (els.channelSelect) els.channelSelect.value = item?.channel || 'generic';
  els.connectorInput.value = item ? itemConnector(item) : '';
  els.connectorCapabilityInput.value = item ? itemConnectorCapability(item) : '';
  els.publishMethodInput.value = item ? itemPublishMethod(item) : '';
  els.marketInput.value = item ? itemMarket(item) : '';
  els.localeInput.value = item ? itemLocale(item) : '';
  els.ownerInput.value = item?.owner || '';
  els.titleInput.value = item?.title || '';
  els.slugInput.value = item?.slug || '';
  els.metaInput.value = item?.meta || '';
  els.keywordsInput.value = item?.keywords || '';
  els.h1Input.value = item?.h1 || '';
  els.primaryCtaInput.value = item?.primaryCta || '';
  els.secondaryCtaInput.value = item?.secondaryCta || '';
  els.internalLinksInput.value = item?.internalLinks || '';
  els.ogTitleInput.value = item?.ogTitle || '';
  els.ogDescriptionInput.value = item?.ogDescription || '';
  els.bodyInput.value = item?.body || '';
  els.statusPill.textContent = item?.status || 'no packet';
  els.statusPill.className = `status-pill ${statusClass(item?.status || '')}`;
}

function renderApprovalTable() {
  els.approvalTable.innerHTML = items.length ? [
    '<thead><tr><th>Destination</th><th>Channel / connector</th><th>Item</th><th>Market</th><th>Status</th><th>Risk</th></tr></thead><tbody>',
    ...items.map((item) => `<tr class="${item.id === selectedId ? 'active-row' : ''}"><td><strong>${escapeHtml(itemDestination(item))}</strong><br>${escapeHtml(item.owner || 'CAIt')}</td><td><strong>${escapeHtml(itemProfile(item)?.label || item.channel)}</strong><br>${escapeHtml(itemConnector(item))} · ${escapeHtml(itemConnectorCapability(item))}</td><td><strong>${escapeHtml(item.title)}</strong><br>${escapeHtml(item.slug)}</td><td>${escapeHtml(itemMarket(item))}<br>${escapeHtml(itemLocale(item))}</td><td><span class="status-pill ${statusClass(item.status)}">${escapeHtml(item.status)}</span></td><td>${escapeHtml(item.risk)}</td></tr>`),
    '</tbody>'
  ].join('') : '<tbody><tr><td>No approval items loaded.</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td></tr></tbody>';
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
}

function renderWordpressControls() {
  if (!els.wordpressStatusPill) return;
  const connected = Boolean(wordpressStatus.connected);
  const draftUrl = String(wordpressStatus?.result?.draft?.editUrl || wordpressStatus?.result?.draft?.link || '').trim();
  els.wordpressStatusPill.textContent = draftUrl
    ? 'WP draft created'
    : (connected ? 'WordPress connected' : (wordpressStatus.checked ? 'WordPress blocked' : 'WordPress not checked'));
  els.wordpressStatusPill.className = `status-pill ${draftUrl || connected ? 'approved' : (wordpressStatus.checked ? 'blocked' : 'pending')}`;
  els.wordpressStatusNote.innerHTML = draftUrl
    ? `WordPress draft created: <a href="${escapeHtml(draftUrl)}" target="_blank" rel="noopener">open draft</a>`
    : escapeHtml(wordpressStatus.message || 'Use a WordPress Application Password to create a draft only. Publishing happens inside WordPress after review.');
}

function renderExecutionResult() {
  const current = publishResult || {
    next: 'Approve an item, then create a GitHub PR handoff or WordPress draft when the selected destination needs it.',
    github: repoStatus.result || null,
    wordpress: wordpressStatus.result || null
  };
  els.publishResultPreview.textContent = JSON.stringify(current, null, 2);
}

function render() {
  renderCounts();
  renderDestinationNav();
  renderFilters();
  renderList();
  renderEditor();
  renderApprovalTable();
  renderGithubControls();
  renderWordpressControls();
  renderWorkflowState();
  renderExecutionResult();
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

[els.destinationInput, els.channelSelect, els.marketInput, els.localeInput, els.ownerInput, els.titleInput, els.slugInput, els.metaInput, els.keywordsInput, els.h1Input, els.primaryCtaInput, els.secondaryCtaInput, els.internalLinksInput, els.ogTitleInput, els.ogDescriptionInput, els.bodyInput, els.handoffTargetSelect].forEach((input) => {
  if (!input) return;
  const update = () => {
    persistSelectedFromFields();
    render();
  };
  input.addEventListener('input', update);
  input.addEventListener('change', update);
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
els.refreshWordpressBtn.addEventListener('click', () => {
  void refreshWordpressStatus();
});
els.connectWordpressBtn.addEventListener('click', () => {
  void connectWordpress();
});
els.createWordpressDraftBtn.addEventListener('click', () => {
  void createWordpressDraftHandoff();
});
els.repoSelect.addEventListener('change', () => render());
els.repoPathInput.addEventListener('input', () => {
  els.packetPreview.textContent = JSON.stringify(buildPacket(), null, 2);
});
els.wordpressPostTypeSelect.addEventListener('change', () => {
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
  await loadPublisherDeliveryItems();
  render();
  void refreshGithubRepos({ silent: true });
  void refreshWordpressStatus({ silent: true });
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
