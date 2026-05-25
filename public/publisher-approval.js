import { buildCaitAppContext, copyContextJson, fetchCaitAppContextFromUrl, sendContextToCait } from './cait-app-bridge.js?v=20260525b';

let items = [];
let selectedId = '';
let destinationFilter = 'all';
let marketFilter = 'all';
let localeFilter = 'all';
let statusFilter = 'all';
let workFilter = 'current';
let importedContext = null;
let csrfToken = '';
let authSnapshot = null;
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
let xStatus = {
  checked: false,
  connected: false,
  message: 'X not checked',
  result: null
};
let publishResult = null;

function publisherUrlParams() {
  return new URL(window.location.href).searchParams;
}

function chatReturnTo() {
  const value = String(publisherUrlParams().get('chat_return_to') || '').trim();
  if (!value) return '';
  try {
    const url = new URL(value, window.location.origin);
    return url.origin === window.location.origin && /^\/chat(?:\.html)?$/.test(url.pathname)
      ? `${url.pathname}${url.search}${url.hash}`
      : '';
  } catch {
    return '';
  }
}

function chatHandoffId() {
  return String(publisherUrlParams().get('chat_handoff_id') || '').replace(/[^a-z0-9_-]/gi, '').slice(0, 120);
}

function currentPublisherReturnPath() {
  const path = window.location.pathname || '/publisher-approval.html';
  const safePath = path.startsWith('/') && /\/publisher-approval\.html$/.test(path) ? path : '/publisher-approval.html';
  return `${safePath}${window.location.search || ''}${window.location.hash || ''}`;
}

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
    label: 'Owned site / Publisher',
    connector: 'publisher',
    capability: 'site_publish_packet',
    method: 'publisher_review_or_selected_connector',
    actionType: 'site_publish_packet',
    patterns: [/seo[_ -]?gap/i, /seo_article/i, /seo page/i, /\bseo\b/i, /landing_page/i, /landing page/i, /\blanding\b/i, /article_draft/i, /\barticle\b/i, /meta title/i, /h1 and metadata/i, /owned site/i]
  },
  {
    key: 'github_pr',
    label: 'GitHub PR',
    connector: 'github',
    capability: 'github.write_pr',
    method: 'github_pr',
    actionType: 'article_publish',
    patterns: [/github_pr/i, /github\.write_pr/i, /pull request/i, /\bpr\b/i]
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

const PUBLISHER_CONTRACT_TYPES = Object.freeze([
  'article_draft',
  'seo_article',
  'seo_page_artifact',
  'landing_page',
  'landing_page_change',
  'site_publish_packet',
  'wordpress_draft',
  'wordpress_draft_packet',
  'directory_submission',
  'directory_packet',
  'community_post_packet',
  'social_copy_packet',
  'social_post',
  'x_post',
  'x_post_packet',
  'reddit_post',
  'reddit_post_packet',
  'indie_hackers_post',
  'indie_hackers_packet',
  'instagram_post',
  'instagram_post_packet',
  'approval_request'
]);

const PUBLISHER_CONTRACT_TYPE_SET = new Set(PUBLISHER_CONTRACT_TYPES);

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
  profileHandleInput: document.getElementById('profileHandleInput'),
  profileUrlInput: document.getElementById('profileUrlInput'),
  mediaAssetsInput: document.getElementById('mediaAssetsInput'),
  channelRulesInput: document.getElementById('channelRulesInput'),
  approvalChecklistInput: document.getElementById('approvalChecklistInput'),
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
  reshapeSelectedBtn: document.getElementById('reshapeSelectedBtn'),
  requestChangesBtn: document.getElementById('requestChangesBtn'),
  blockBtn: document.getElementById('blockBtn'),
  connectXBtn: document.getElementById('connectXBtn'),
  refreshXBtn: document.getElementById('refreshXBtn'),
  publishNowBtn: document.getElementById('publishNowBtn'),
  schedulePostBtn: document.getElementById('schedulePostBtn'),
  bulkPublishBtn: document.getElementById('bulkPublishBtn'),
  scheduleAtInput: document.getElementById('scheduleAtInput'),
  bulkScopeSelect: document.getElementById('bulkScopeSelect'),
  xStatusPill: document.getElementById('xStatusPill'),
  publishActionNote: document.getElementById('publishActionNote'),
  workSelect: document.getElementById('workSelect'),
  handoffTargetSelect: document.getElementById('handoffTargetSelect'),
  marketFilterSelect: document.getElementById('marketFilterSelect'),
  localeFilterSelect: document.getElementById('localeFilterSelect'),
  statusFilterSelect: document.getElementById('statusFilterSelect'),
  launchOfferInput: document.getElementById('launchOfferInput'),
  launchAudienceInput: document.getElementById('launchAudienceInput'),
  launchGoalInput: document.getElementById('launchGoalInput'),
  launchDestinationMixInput: document.getElementById('launchDestinationMixInput'),
  launchDeliveryFormatSelect: document.getElementById('launchDeliveryFormatSelect'),
  launchProofInput: document.getElementById('launchProofInput'),
  launchAxisInput: document.getElementById('launchAxisInput'),
  askPlanningBtn: document.getElementById('askPlanningBtn'),
  draftFromAxisBtn: document.getElementById('draftFromAxisBtn'),
  seedLpBtn: document.getElementById('seedLpBtn'),
  publisherPlanningPill: document.getElementById('publisherPlanningPill'),
  publisherPlanningNote: document.getElementById('publisherPlanningNote'),
  publisherDestinationCount: document.getElementById('publisherDestinationCount'),
  publisherDestinationMetric: document.getElementById('publisherDestinationMetric'),
  publisherMarketMetric: document.getElementById('publisherMarketMetric'),
  publisherReviewMetric: document.getElementById('publisherReviewMetric'),
  publisherApprovedMetric: document.getElementById('publisherApprovedMetric'),
  publisherStepLoad: document.getElementById('publisherStepLoad'),
  publisherStepApproval: document.getElementById('publisherStepApproval'),
  publisherStepHandoff: document.getElementById('publisherStepHandoff'),
  opsReadinessPill: document.getElementById('opsReadinessPill'),
  opsReadinessList: document.getElementById('opsReadinessList'),
  dataCheckPill: document.getElementById('dataCheckPill'),
  dataCheckList: document.getElementById('dataCheckList'),
  publisherLoginLink: document.getElementById('publisherLoginLink'),
  returnToChatLink: document.getElementById('returnToChatLink'),
  handoffSessionNotice: document.getElementById('handoffSessionNotice')
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

function itemProfileHandle(item = null) {
  return String(item?.profileHandle || item?.profile_handle || item?.accountHandle || item?.account_handle || '').trim();
}

function itemProfileUrl(item = null) {
  return String(item?.profileUrl || item?.profile_url || item?.accountUrl || item?.account_url || '').trim();
}

function itemMediaAssets(item = null) {
  return String(item?.mediaAssets || item?.media_assets || item?.assetRequirements || item?.asset_requirements || '').trim();
}

function itemChannelRules(item = null) {
  return String(item?.channelRules || item?.channel_rules || item?.linkPolicy || item?.link_policy || '').trim();
}

function itemApprovalChecklist(item = null) {
  return String(item?.approvalChecklist || item?.approval_checklist || '').trim();
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

function normalizeContractType(value = '') {
  return String(value || '')
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function camelContractKey(value = '') {
  return String(value || '').replace(/_([a-z0-9])/g, (_, char) => char.toUpperCase());
}

function listObjects(value = []) {
  if (Array.isArray(value)) return value.filter((item) => item && typeof item === 'object');
  if (!value || typeof value !== 'object') return [];
  for (const key of ['items', 'rows', 'packets', 'posts', 'drafts', 'requests']) {
    if (Array.isArray(value[key])) return value[key].filter((item) => item && typeof item === 'object');
  }
  return [value];
}

function contractValueFromContext(context = {}, contractType = '') {
  const raw = context.raw_context && typeof context.raw_context === 'object' ? context.raw_context : {};
  const camel = camelContractKey(contractType);
  return firstText(context[contractType], context[camel], raw[contractType], raw[camel]);
}

function explicitPublisherContractType(artifact = {}) {
  const fields = [
    artifact.contract_type,
    artifact.contractType,
    artifact.artifact_type,
    artifact.artifactType,
    artifact.delivery_artifact_type,
    artifact.deliveryArtifactType,
    artifact.handoff_artifact_type,
    artifact.handoffArtifactType,
    artifact.packet_type,
    artifact.packetType,
    artifact.content_type,
    artifact.contentType,
    artifact.action_type,
    artifact.actionType,
    artifact.type
  ];
  for (const field of fields) {
    const normalized = normalizeContractType(field);
    if (PUBLISHER_CONTRACT_TYPE_SET.has(normalized)) return normalized;
  }
  for (const list of [artifact.artifact_types, artifact.artifactTypes, artifact.accepted_by_apps, artifact.acceptedByApps]) {
    for (const field of Array.isArray(list) ? list : []) {
      const normalized = normalizeContractType(field);
      if (PUBLISHER_CONTRACT_TYPE_SET.has(normalized)) return normalized;
    }
  }
  return '';
}

function publisherContractTypeForProfile(profile = null, type = '') {
  const key = String(profile?.key || '').trim();
  if (key === 'x') return 'x_post_packet';
  if (key === 'reddit') return 'reddit_post_packet';
  if (key === 'indie_hackers') return 'indie_hackers_packet';
  if (key === 'instagram') return 'instagram_post_packet';
  if (key === 'social') return 'social_copy_packet';
  if (key === 'directory') return 'directory_packet';
  if (key === 'wordpress_site') return 'wordpress_draft_packet';
  if (key === 'owned_site' || key === 'github_pr') return 'site_publish_packet';
  if (String(type || '').toLowerCase() === 'directory') return 'directory_packet';
  if (String(type || '').toLowerCase() === 'post') return 'social_copy_packet';
  return 'site_publish_packet';
}

function directPublisherPacketType(explicit = '', profile = null, type = '') {
  const normalized = normalizeContractType(explicit);
  const profileType = publisherContractTypeForProfile(profile, type);
  if (!normalized) return profileType;
  const inputDraftTypes = new Set([
    'article_draft',
    'seo_article',
    'seo_page_artifact',
    'landing_page',
    'landing_page_change',
    'wordpress_draft',
    'directory_submission',
    'community_post_packet',
    'social_post',
    'x_post',
    'reddit_post',
    'indie_hackers_post',
    'instagram_post'
  ]);
  if (inputDraftTypes.has(normalized)) return profileType;
  return normalized;
}

function publisherContractTypeFromArtifact(artifact = {}, type = '', profile = null) {
  return directPublisherPacketType(explicitPublisherContractType(artifact), profile, type);
}

function publisherContractArtifactsFromContext(context = {}) {
  const imported = [];
  for (const contractType of PUBLISHER_CONTRACT_TYPES) {
    const value = contractValueFromContext(context, contractType);
    for (const item of listObjects(value)) {
      imported.push({
        ...item,
        type: item.type || contractType,
        artifact_type: item.artifact_type || contractType,
        contract_type: item.contract_type || contractType
      });
    }
  }
  return imported;
}

function itemContractType(item = null) {
  return String(item?.contractType || publisherContractTypeForProfile(itemProfile(item), item?.type || '')).trim();
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
  return /^(?:delivery file|publisher handoff|unassigned destination|generic publishing packet|unspecified|none|n\/a|\(?not provided\)?|\(?not specified\)?|unknown[-_\s\w]*destination|publisher[-_\s]+approval[-_\s]+studio)$/i.test(String(value || '').trim());
}

function shouldUseProfileDestinationLabel(explicit = '', profile = null) {
  const value = String(explicit || '').trim();
  if (!value || !profile) return false;
  if (/^https?:\/\//i.test(value)) return false;
  if (value.toLowerCase() === String(profile.key || '').toLowerCase()) return true;
  if (value.toLowerCase() === String(profile.label || '').toLowerCase()) return true;
  if (profile.key === 'owned_site') return /(?:publisher|owned\s*site|landing\s*page|seo\s*page|site\s*publish|article\s*draft)/i.test(value);
  if (profile.key === 'directory') return /(?:directory|listing|submission)/i.test(value);
  if (['x', 'reddit', 'indie_hackers', 'instagram', 'social'].includes(profile.key)) return true;
  return false;
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
  if (shouldUseProfileDestinationLabel(explicit, profile)) return String(profile.label || 'Owned site / Publisher').trim();
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

function titleWithSlugTail(title = '', slug = '') {
  const explicit = String(title || '').replace(/\s+/g, ' ').trim();
  if (!explicit) return '';
  const comparableExplicit = explicit.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim();
  let rawSlug = String(slug || '').trim();
  try {
    if (/^https?:\/\//i.test(rawSlug)) rawSlug = new URL(rawSlug).pathname;
  } catch {
    // Keep the original slug-like value when URL parsing fails.
  }
  const pathOnly = rawSlug.split(/[?#]/)[0];
  const leaf = pathOnly.split('/').filter(Boolean).at(-1) || '';
  const slugWords = leaf
    .replace(/\.[a-z0-9]+$/i, '')
    .split(/[^a-z0-9]+/i)
    .map((word) => word.trim())
    .filter(Boolean);
  const titleWords = comparableExplicit
    .split(/\s+/)
    .map((word) => word.replace(/[^a-z0-9]+/gi, '').trim())
    .filter(Boolean);
  if (!slugWords.length || !titleWords.length || slugWords.length <= titleWords.length) return explicit;
  const samePrefix = titleWords.every((word, index) => word.toLowerCase() === slugWords[index].toLowerCase());
  if (!samePrefix) return explicit;
  return `${comparableExplicit} ${slugWords.slice(titleWords.length).join(' ')}`.trim();
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
  url.searchParams.set('return_to', currentPublisherReturnPath());
  url.searchParams.set('login_source', 'publisher_approval');
  return url.toString();
}

function xConnectHref() {
  const url = new URL('/auth/x', window.location.origin);
  url.searchParams.set('return_to', currentPublisherReturnPath());
  url.searchParams.set('login_source', 'publisher_approval');
  url.searchParams.set('capabilities', 'x.post');
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
  const sourceEvidence = Array.isArray(item.sourceEvidence) ? item.sourceEvidence : [];
  const eeatNotes = item.eeatNotes && typeof item.eeatNotes === 'object' ? item.eeatNotes : {};
  const publishVariants = Array.isArray(item.publishVariants) ? item.publishVariants : [];
  const sourceLines = sourceEvidence.length
    ? sourceEvidence.map((source, index) => `${index + 1}. ${source.title || source.url || 'Source'}${source.url ? ` - ${source.url}` : ''}${source.source_type ? ` (${source.source_type})` : ''}`)
    : [];
  const eeatLines = Object.entries(eeatNotes)
    .filter(([, value]) => String(value || '').trim())
    .map(([key, value]) => `- ${key}: ${value}`);
  const variantLines = publishVariants.map((variant, index) => [
    `### Variant ${index + 1}: ${variant.label || variant.id || 'Draft option'}`,
    variant.title ? `Title: ${variant.title}` : '',
    variant.h1 ? `H1: ${variant.h1}` : '',
    variant.body ? `Body: ${variant.body}` : '',
    variant.cta ? `CTA: ${variant.cta}` : ''
  ].filter(Boolean).join('\n'));
  return [
    `# ${item.title || 'Approved CAIt packet'}`,
    '',
    `Status: ${item.status || 'needs approval'}`,
    `Type: ${item.type || 'content'}`,
    `Medium / channel: ${itemProfile(item)?.label || item.channel || 'Generic publishing packet'}`,
    `Publish connector: ${itemConnector(item)}`,
    `Connector capability: ${itemConnectorCapability(item)}`,
    `Publish method: ${itemPublishMethod(item)}`,
    itemProfileHandle(item) ? `Account / profile: ${itemProfileHandle(item)}` : null,
    itemProfileUrl(item) ? `Profile URL: ${itemProfileUrl(item)}` : null,
    itemMediaAssets(item) ? `Media assets: ${itemMediaAssets(item)}` : null,
    itemChannelRules(item) ? `Channel rules: ${itemChannelRules(item)}` : null,
    itemApprovalChecklist(item) ? `Approval checklist: ${itemApprovalChecklist(item)}` : null,
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
    sourceLines.length ? `Original source count: ${sourceLines.length}` : '',
    '',
    '## Approved body',
    '',
    item.body || '',
    variantLines.length ? '\n## Publish variants\n\n' + variantLines.join('\n\n') : '',
    sourceLines.length ? '\n## Original source evidence\n\n' + sourceLines.join('\n') : '',
    eeatLines.length ? '\n## E-E-A-T notes\n\n' + eeatLines.join('\n') : '',
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
    authSnapshot = payload?.auth || payload?.snapshot?.auth || null;
    csrfToken = String(payload?.auth?.csrfToken || payload?.snapshot?.auth?.csrfToken || '').trim();
  } catch {
    authSnapshot = null;
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

async function refreshXStatus(options = {}) {
  if (!els.refreshXBtn) return;
  if (!options.silent) els.refreshXBtn.textContent = 'Checking';
  try {
    const payload = await apiJson('/api/connectors/x/status');
    const status = payload?.x || {};
    xStatus = {
      checked: true,
      connected: Boolean(status.connected),
      message: status.connected ? `X connected: @${status.username}` : 'X is not connected',
      result: payload
    };
  } catch (error) {
    xStatus = {
      checked: true,
      connected: false,
      message: String(error?.message || error || 'X connection required'),
      result: error?.payload || null
    };
  } finally {
    renderXControls();
    if (!options.silent) els.refreshXBtn.textContent = 'Check X';
  }
}

function approvedPublisherItem(item = null) {
  return Boolean(item && String(item.status || '').trim().toLowerCase() === 'approved');
}

function xPostTextForItem(item = null) {
  const text = String(item?.body || '').replace(/\r\n/g, '\n').trim();
  if (text) return text;
  return String(item?.title || '').trim();
}

function scheduleAtIso() {
  const value = String(els.scheduleAtInput?.value || '').trim();
  if (!value) return '';
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : '';
}

function bulkCandidateItems() {
  const scope = String(els.bulkScopeSelect?.value || 'visible');
  const source = scope === 'all'
    ? items
    : scope === 'destination'
      ? items.filter((item) => destinationFilter === 'all' || itemDestination(item) === destinationFilter)
      : visibleItems();
  return source.filter(approvedPublisherItem);
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

async function createGithubPrHandoffForItem(item = null, options = {}) {
  const repo = selectedRepo();
  if (!item) {
    if (!options.silent) window.alert('Load a publisher packet first.');
    return null;
  }
  if (!approvedPublisherItem(item)) {
    if (!options.silent) window.alert('Approve the selected packet before creating a GitHub PR handoff.');
    return null;
  }
  if (!repo) {
    if (!options.silent) window.alert('Select a GitHub repository first.');
    return null;
  }
  const fullName = String(repo.fullName || repo.full_name || '').trim();
  const [owner, repoName] = fullName.split('/');
  if (!owner || !repoName) {
    if (!options.silent) window.alert('Selected repository is invalid.');
    return null;
  }
  if (options.updateButton !== false) els.createPrBtn.textContent = 'Creating PR';
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
    return publishResult;
  } catch (error) {
    repoStatus = {
      checked: true,
      connected: false,
      message: String(error?.message || error || 'PR handoff failed'),
      result: error?.payload || null
    };
    publishResult = { kind: 'github_pr_handoff_failed', error: repoStatus.message, payload: repoStatus.result };
    return publishResult;
  } finally {
    if (options.updateButton !== false) els.createPrBtn.textContent = 'Create PR handoff';
    renderGithubControls();
    if (options.render !== false) render();
  }
}

async function createGithubPrHandoff() {
  persistSelectedFromFields();
  return createGithubPrHandoffForItem(selectedItem());
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

async function createWordpressDraftForItem(item = null, options = {}) {
  if (!item) {
    if (!options.silent) window.alert('Load a publisher packet first.');
    return null;
  }
  if (!approvedPublisherItem(item)) {
    if (!options.silent) window.alert('Approve the selected packet before creating a WordPress draft.');
    return null;
  }
  if (!wordpressStatus.connected) {
    await refreshWordpressStatus({ silent: true });
  }
  if (options.updateButton !== false) els.createWordpressDraftBtn.textContent = 'Creating draft';
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
    return publishResult;
  } catch (error) {
    wordpressStatus = {
      checked: true,
      connected: false,
      message: String(error?.message || error || 'WordPress draft creation failed'),
      result: error?.payload || null
    };
    publishResult = { kind: 'wordpress_draft_failed', error: wordpressStatus.message, payload: wordpressStatus.result };
    return publishResult;
  } finally {
    if (options.updateButton !== false) els.createWordpressDraftBtn.textContent = 'Create WP draft';
    if (options.render !== false) render();
  }
}

async function createWordpressDraftHandoff() {
  persistSelectedFromFields();
  return createWordpressDraftForItem(selectedItem());
}

async function executeXPostForItem(item = null, options = {}) {
  if (!item) return { ok: false, kind: 'x_post_failed', error: 'No item selected.' };
  const text = xPostTextForItem(item);
  if (!text) return { ok: false, kind: 'x_post_failed', error: 'X post text is empty.' };
  if (text.length > 280) return { ok: false, kind: 'x_post_failed', error: `X post text is ${text.length} characters. Keep it within 280 characters.` };
  if (!xStatus.connected) await refreshXStatus({ silent: true });
  const username = String(xStatus?.result?.x?.username || '').trim();
  if (!username) return { ok: false, kind: 'x_post_failed', error: 'Connect X before posting.' };
  const payload = await apiJson('/api/deliveries/execute', {
    method: 'POST',
    body: JSON.stringify({
      action_kind: 'x_post',
      confirm_execute: true,
      approved_x_username: username,
      approved_text: text,
      draft: {
        postText: text,
        approvedXUsername: username,
        approvedText: text
      },
      deliverable: {
        title: item.title || 'Publisher X post',
        content: itemMarkdown(item)
      },
      source: 'publisher_approval_studio',
      channel: item.channel,
      connector: 'x',
      connector_capability: 'x.post'
    })
  });
  if (payload?.entity?.url || payload?.url) item.status = 'published';
  publishResult = { kind: 'x_post', item_id: item.id, payload };
  if (options.render !== false) render();
  return publishResult;
}

async function scheduleXPostForItem(item = null, scheduledFor = '') {
  if (!item) return { ok: false, kind: 'x_schedule_failed', error: 'No item selected.' };
  const text = xPostTextForItem(item);
  if (!text) return { ok: false, kind: 'x_schedule_failed', error: 'X post text is empty.' };
  if (text.length > 280) return { ok: false, kind: 'x_schedule_failed', error: `X post text is ${text.length} characters. Keep it within 280 characters.` };
  if (!scheduledFor) return { ok: false, kind: 'x_schedule_failed', error: 'Choose a schedule time first.' };
  if (!xStatus.connected) await refreshXStatus({ silent: true });
  const username = String(xStatus?.result?.x?.username || '').trim();
  if (!username) return { ok: false, kind: 'x_schedule_failed', error: 'Connect X before scheduling.' };
  const payload = await apiJson('/api/deliveries/schedule', {
    method: 'POST',
    body: JSON.stringify({
      action_kind: 'x_post',
      confirm_schedule: true,
      scheduled_for: scheduledFor,
      approved_x_username: username,
      approved_text: text,
      preview_text: text,
      task_type: 'x_post',
      draft: {
        postText: text,
        approvedXUsername: username,
        approvedText: text
      },
      deliverable: {
        title: item.title || 'Scheduled Publisher X post',
        content: itemMarkdown(item)
      },
      source: 'publisher_approval_studio'
    })
  });
  item.status = 'scheduled';
  publishResult = { kind: 'x_post_scheduled', item_id: item.id, scheduled_for: scheduledFor, payload };
  render();
  return publishResult;
}

async function publishPublisherItemNow(item = null, options = {}) {
  if (!item) return { ok: false, kind: 'publish_failed', error: 'No item selected.' };
  if (!approvedPublisherItem(item)) return { ok: false, kind: 'publish_failed', item_id: item.id, title: item.title, error: 'Item is not approved.' };
  const channel = String(item.channel || '').trim();
  if (channel === 'x') return executeXPostForItem(item, options);
  if (channel === 'wordpress_site') return createWordpressDraftForItem(item, { updateButton: false, render: options.render, silent: options.silent });
  if (channel === 'github_pr' || channel === 'owned_site') return createGithubPrHandoffForItem(item, { updateButton: false, render: options.render, silent: options.silent });
  return {
    ok: true,
    kind: 'manual_publish_packet',
    item_id: item.id,
    title: item.title,
    channel,
    message: 'This destination does not have a connected one-click publisher yet. Use the packet for manual publish/submit after approval.',
    packet: itemMarkdown(item)
  };
}

async function publishSelectedNow() {
  persistSelectedFromFields();
  const item = selectedItem();
  if (!item) {
    window.alert('Load a publisher packet first.');
    return;
  }
  if (!approvedPublisherItem(item)) {
    window.alert('Approve the selected item before publishing.');
    return;
  }
  const text = item.channel === 'x' ? xPostTextForItem(item) : item.title;
  if (!window.confirm(`Publish now?\n\n${itemProfile(item)?.label || item.channel}: ${text}`)) return;
  els.publishNowBtn.textContent = 'Publishing';
  try {
    publishResult = await publishPublisherItemNow(item);
  } catch (error) {
    publishResult = { kind: 'publish_now_failed', item_id: item.id, error: String(error?.message || error), payload: error?.payload || null };
  } finally {
    els.publishNowBtn.textContent = 'Publish now';
    render();
  }
}

async function scheduleSelectedPost() {
  persistSelectedFromFields();
  const item = selectedItem();
  const scheduledFor = scheduleAtIso();
  if (!item) {
    window.alert('Load a publisher packet first.');
    return;
  }
  if (!approvedPublisherItem(item)) {
    window.alert('Approve the selected item before scheduling.');
    return;
  }
  if (item.channel !== 'x') {
    window.alert('Scheduling currently supports connected X posts. Use Publish now for WordPress drafts and GitHub PR handoffs.');
    return;
  }
  if (!scheduledFor) {
    window.alert('Choose a schedule time first.');
    return;
  }
  if (!window.confirm(`Schedule this X post for ${new Date(scheduledFor).toLocaleString()}?\n\n${xPostTextForItem(item)}`)) return;
  els.schedulePostBtn.textContent = 'Scheduling';
  try {
    publishResult = await scheduleXPostForItem(item, scheduledFor);
  } catch (error) {
    publishResult = { kind: 'schedule_post_failed', item_id: item.id, error: String(error?.message || error), payload: error?.payload || null };
    render();
  } finally {
    els.schedulePostBtn.textContent = 'Schedule post';
  }
}

async function bulkPublishApproved() {
  persistSelectedFromFields();
  const candidates = bulkCandidateItems();
  if (!candidates.length) {
    window.alert('No approved items are available in the selected bulk scope.');
    return;
  }
  if (!window.confirm(`Bulk publish ${candidates.length} approved item(s)?\n\nX posts may go live immediately. WordPress items create drafts. GitHub/owned-site items create PR handoffs.`)) return;
  els.bulkPublishBtn.textContent = 'Publishing bulk';
  const previousSelectedId = selectedId;
  const results = [];
  for (const item of candidates) {
    try {
      const result = await publishPublisherItemNow(item, { render: false, silent: true });
      results.push(result ? { item_id: item.id, title: item.title, ...result } : { item_id: item.id, title: item.title, ok: false, kind: 'bulk_item_skipped', error: 'Required connector or destination selection is missing.' });
    } catch (error) {
      results.push({ item_id: item.id, title: item.title, ok: false, kind: 'bulk_item_failed', error: String(error?.message || error), payload: error?.payload || null });
    }
  }
  selectedId = previousSelectedId;
  publishResult = {
    kind: 'bulk_publish',
    total: candidates.length,
    succeeded: results.filter((item) => item.ok !== false).length,
    failed: results.filter((item) => item.ok === false).length,
    results
  };
  els.bulkPublishBtn.textContent = 'Bulk publish approved';
  render();
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
  const extractedProfileHandle = markdownFieldValue(body, ['Account / profile', 'Account profile', 'Account handle', 'Profile', 'Instagram account', 'Instagram profile', 'Handle']);
  const extractedProfileUrl = markdownFieldValue(body, ['Profile URL', 'Account URL', 'Instagram URL', 'Profile link']);
  const extractedMediaAssets = markdownFieldValue(body, ['Media assets', 'Visual assets', 'Assets', 'Screenshots', 'B-roll', 'Asset/proof status']);
  const extractedChannelRules = markdownFieldValue(body, ['Channel rules', 'Link policy', 'Community rules', 'Caption rules', 'Schedule handoff']);
  const extractedApprovalChecklist = markdownFieldValue(body, ['Approval checklist', 'Approval check', 'Approval check before publishing', 'Pre-publish checklist']);
  const artifactSlug = artifact.slug || artifact.path || artifact.url || artifact.target || '';
  const title = String(extractedTitle || titleWithSlugTail(artifact.title, artifactSlug) || artifact.title || artifact.name || artifactSlug || `Imported item ${index + 1}`).trim();
  const destination = destinationFromArtifact(artifact, type, profile);
  const market = String(firstText(artifact.market, artifact.region, artifact.country, artifact.geo, marketFromValue(artifact.url || artifact.slug || artifact.target || '')) || 'Global').trim();
  const locale = String(firstText(artifact.locale, artifact.language, artifact.lang, artifact.content_locale, market === 'Japan' ? 'ja-JP' : 'en') || 'en').trim();
  const channel = String(firstText(artifact.channel_key, artifact.channelKey, artifact.medium_key, artifact.mediumKey, artifact.media_key, artifact.mediaKey, profile.key) || profile.key).trim();
  const selectedProfile = profileByKey(channel);
  const profileOwnsConnector = selectedProfile.key !== 'generic';
  const contractType = publisherContractTypeFromArtifact(artifact, type, selectedProfile);
  return {
    id: String(artifact.id || `imported-${index + 1}`).trim(),
    type,
    contractType,
    channel: selectedProfile.key,
    destination,
    connector: String(profileOwnsConnector ? selectedProfile.connector : (firstText(artifact.connector, artifact.required_connector, artifact.requiredConnector, selectedProfile.connector) || selectedProfile.connector)).trim(),
    connectorCapability: String(profileOwnsConnector ? selectedProfile.capability : (firstText(artifact.connector_capability, artifact.connectorCapability, artifact.capability, selectedProfile.capability) || selectedProfile.capability)).trim(),
    publishMethod: String(profileOwnsConnector ? selectedProfile.method : (firstText(artifact.publish_method, artifact.publishMethod, artifact.execution_method, artifact.executionMethod, selectedProfile.method) || selectedProfile.method)).trim(),
    actionType: String(profileOwnsConnector ? selectedProfile.actionType : (firstText(artifact.action_type, artifact.actionType, selectedProfile.actionType) || selectedProfile.actionType)).trim(),
    profileHandle: String(firstText(artifact.profile_handle, artifact.profileHandle, artifact.account_handle, artifact.accountHandle, artifact.account_username, artifact.accountUsername, artifact.username, artifact.handle, extractedProfileHandle) || '').trim(),
    profileUrl: String(firstText(artifact.profile_url, artifact.profileUrl, artifact.account_url, artifact.accountUrl, artifact.public_profile_url, artifact.publicProfileUrl, extractedProfileUrl) || '').trim(),
    mediaAssets: String(firstText(artifact.media_assets, artifact.mediaAssets, artifact.asset_requirements, artifact.assetRequirements, artifact.visual_assets, artifact.visualAssets, artifact.media_requirements, artifact.mediaRequirements, extractedMediaAssets) || '').trim(),
    channelRules: String(firstText(artifact.channel_rules, artifact.channelRules, artifact.link_policy, artifact.linkPolicy, artifact.community_rules, artifact.communityRules, artifact.caption_rules, artifact.captionRules, extractedChannelRules) || '').trim(),
    approvalChecklist: String(firstText(artifact.approval_checklist, artifact.approvalChecklist, artifact.pre_publish_checklist, artifact.prePublishChecklist, extractedApprovalChecklist) || '').trim(),
    market,
    locale,
    owner: String(firstText(artifact.owner, artifact.assignee, artifact.agent, artifact.source_agent, artifact.lead, 'CAIt') || 'CAIt').trim(),
    title,
    slug: String(artifactSlug || slugFromTitle(title)).trim(),
    meta: String(artifact.meta || artifact.description || extractedMeta || artifact.summary || '').trim(),
    keywords: String(firstText(artifact.keywords, artifact.keyword, artifact.meta_keywords, artifact.target_keyword, artifact.targetQuery, extractedKeywords) || '').trim(),
    h1: String(firstText(artifact.h1, artifact.h_1, artifact.headline, extractedH1) || '').trim(),
    primaryCta: String(firstText(artifact.primary_cta, artifact.primaryCta, artifact.cta, extractedPrimaryCta) || '').trim(),
    secondaryCta: String(firstText(artifact.secondary_cta, artifact.secondaryCta, extractedSecondaryCta) || '').trim(),
    internalLinks: String(firstText(artifact.internal_links, artifact.internalLinks, extractedInternalLinks) || '').trim(),
    ogTitle: String(firstText(artifact.og_title, artifact.ogTitle, extractedOgTitle) || '').trim(),
    ogDescription: String(firstText(artifact.og_description, artifact.ogDescription, extractedOgDescription) || '').trim(),
    sourceEvidence: Array.isArray(artifact.source_evidence) ? artifact.source_evidence : (Array.isArray(artifact.sourceEvidence) ? artifact.sourceEvidence : []),
    publishVariants: Array.isArray(artifact.publish_variants) ? artifact.publish_variants : (Array.isArray(artifact.publishVariants) ? artifact.publishVariants : []),
    eeatNotes: artifact.eeat_notes && typeof artifact.eeat_notes === 'object'
      ? artifact.eeat_notes
      : (artifact.eeatNotes && typeof artifact.eeatNotes === 'object' ? artifact.eeatNotes : {}),
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
    profile_handle: metadata.profile_handle || metadata.profileHandle || metadata.account_handle || metadata.accountHandle || metadata.account_username || '',
    profile_url: metadata.profile_url || metadata.profileUrl || metadata.account_url || metadata.accountUrl || '',
    media_assets: metadata.media_assets || metadata.mediaAssets || metadata.asset_requirements || metadata.visual_assets || '',
    channel_rules: metadata.channel_rules || metadata.channelRules || metadata.link_policy || metadata.community_rules || '',
    approval_checklist: metadata.approval_checklist || metadata.approvalChecklist || '',
    market: metadata.market || metadata.region || '',
    locale: metadata.locale || metadata.language || '',
    risk: metadata.risk || metadata.blocker || 'Review this delivery item before external publishing.',
    source_evidence: Array.isArray(metadata.source_evidence) ? metadata.source_evidence : [],
    publish_variants: Array.isArray(metadata.publish_variants) ? metadata.publish_variants : [],
    eeat_notes: metadata.eeat_notes && typeof metadata.eeat_notes === 'object' ? metadata.eeat_notes : {},
    source_job_id: item.jobId,
    source_delivery_item_id: item.id
  }, index);
}

function contextItemFromPublisherItem(item = {}, index = 0) {
  const payload = item.payload && typeof item.payload === 'object' ? item.payload : {};
  const validation = item.validation && typeof item.validation === 'object' ? item.validation : {};
  const blocker = Array.isArray(validation.checks)
    ? validation.checks.filter((check) => !check.ok).map((check) => check.message).filter(Boolean).join(' ')
    : '';
  return contextItemFromArtifact({
    id: item.id || `publisher-item-${index + 1}`,
    type: item.itemType || item.contractType || payload.type || 'publish_asset',
    contract_type: item.contractType || payload.contract_type || '',
    title: item.title || payload.title || `Publisher item ${index + 1}`,
    slug: payload.slug || payload.path || '',
    meta: payload.meta || payload.meta_description || payload.description || item.summary || '',
    keywords: payload.keywords || payload.keyword || payload.target_query || '',
    h1: payload.h1 || payload.headline || '',
    primary_cta: payload.primary_cta || payload.primaryCta || '',
    secondary_cta: payload.secondary_cta || payload.secondaryCta || '',
    internal_links: payload.internal_links || payload.internalLinks || '',
    og_title: payload.og_title || payload.ogTitle || '',
    og_description: payload.og_description || payload.ogDescription || '',
    body: item.body || payload.body || payload.content || item.summary || '',
    status: item.status || 'needs review',
    owner: item.ownerLogin || payload.owner || 'CAIt',
    destination: item.destination || payload.destination || '',
    channel_key: item.channel || payload.channel || '',
    connector: item.connector || payload.connector || '',
    connector_capability: item.connectorCapability || payload.connector_capability || '',
    publish_method: payload.publish_method || payload.publishMethod || '',
    profile_handle: payload.profile_handle || payload.profileHandle || payload.account_handle || payload.accountHandle || '',
    profile_url: payload.profile_url || payload.profileUrl || payload.account_url || payload.accountUrl || '',
    media_assets: payload.media_assets || payload.mediaAssets || payload.asset_requirements || payload.visual_assets || '',
    channel_rules: payload.channel_rules || payload.channelRules || payload.link_policy || payload.community_rules || '',
    approval_checklist: payload.approval_checklist || payload.approvalChecklist || '',
    market: payload.market || '',
    locale: payload.locale || '',
    risk: blocker || `Publisher DB version ${item.version || 1}; review before external execution.`,
    source_publisher_item_id: item.id,
    source_publisher_version: item.version,
    source_evidence: Array.isArray(payload.source_evidence) ? payload.source_evidence : [],
    publish_variants: Array.isArray(payload.publish_variants) ? payload.publish_variants : [],
    eeat_notes: payload.eeat_notes && typeof payload.eeat_notes === 'object' ? payload.eeat_notes : {}
  }, index);
}

function inboundItemSelectionScore(item = {}) {
  let score = 0;
  if (item.meta) score += 6;
  if (item.h1) score += 5;
  if (item.keywords) score += 4;
  if (item.primaryCta) score += 3;
  if (item.secondaryCta) score += 2;
  if (item.internalLinks || item.ogTitle || item.ogDescription) score += 2;
  if (/meta title|meta description|primary cta|secondary cta|internal links/i.test(String(item.body || ''))) score += 4;
  if (/ready|summary|handoff|approve/i.test(String(item.title || ''))) score -= 5;
  if (item.type === 'approval') score -= 4;
  if (/delivery file/i.test(String(item.target || ''))) score -= 2;
  return score;
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
  const contractArtifacts = publisherContractArtifactsFromContext(context);
  const importedItems = [
    ...contractArtifacts.map(contextItemFromArtifact),
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
  ].filter((item) => item.title || item.body)
    .sort((a, b) => inboundItemSelectionScore(b) - inboundItemSelectionScore(a));
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
  item.contractType = publisherContractTypeForProfile(profile, item.type || '');
  item.connector = profile.connector;
  item.connectorCapability = profile.capability;
  item.publishMethod = profile.method;
  item.actionType = profile.actionType;
  item.profileHandle = els.profileHandleInput.value.trim();
  item.profileUrl = els.profileUrlInput.value.trim();
  item.mediaAssets = els.mediaAssetsInput.value.trim();
  item.channelRules = els.channelRulesInput.value.trim();
  item.approvalChecklist = els.approvalChecklistInput.value.trim();
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
  const target = String(els.handoffTargetSelect.value || 'seo_specialist');
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
      handoff_targets: [target, 'build_team_leader', 'cmo_leader'],
      raw_context: {
        chat_handoff_id: chatHandoffId(),
        chat_return_to: chatReturnTo(),
        publisher_return_to: currentPublisherReturnPath()
      }
    });
  }
  const contractType = itemContractType(item);
  return buildCaitAppContext({
    source_app: 'publisher_approval_studio',
    source_app_label: 'Publisher & Approval Studio',
    title: `${itemDestination(item)}: ${item.title}`,
    summary: `Global publishing packet for ${itemDestination(item)} (${itemMarket(item)}, ${itemLocale(item)}). Current status: ${item.status}. This keeps approval, destination, and execution context visible so CAIt can resume stable publishing operations instead of rerunning a disposable AIAGENT chat.`,
    facts: [
      importedContext ? `Imported context: ${importedContext.title || importedContext.id || 'CAIt app context'}` : '',
      `Destination: ${itemDestination(item)}`,
      `Medium / channel: ${itemProfile(item)?.label || item.channel}`,
      `Publish connector: ${itemConnector(item)}`,
      `Connector capability: ${itemConnectorCapability(item)}`,
      `Publish method: ${itemPublishMethod(item)}`,
      itemProfileHandle(item) ? `Account / profile: ${itemProfileHandle(item)}` : '',
      itemProfileUrl(item) ? `Profile URL: ${itemProfileUrl(item)}` : '',
      itemMediaAssets(item) ? `Media assets: ${itemMediaAssets(item)}` : '',
      itemChannelRules(item) ? `Channel rules: ${itemChannelRules(item)}` : '',
      itemApprovalChecklist(item) ? `Approval checklist: ${itemApprovalChecklist(item)}` : '',
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
      'SaaS entrypoint: Publisher login keeps account, destinations, approvals, and retained packets.',
      'Billing model: planning, drafting, routing, and connector-backed work is billed as CAIt usage.',
      'This packet keeps destination rules, execution readiness, and approval state attached to the next CAIt run.',
      repo ? `Selected GitHub repository: ${repo.fullName || repo.full_name}` : '',
      prUrl ? `Created PR: ${prUrl}` : '',
      wpDraftUrl ? `Created WordPress draft: ${wpDraftUrl}` : '',
      xStatus.connected ? `Connected X account: @${xStatus.result?.x?.username || ''}` : ''
    ].filter(Boolean),
    assumptions: [
      'Publishing, PR creation, external directory submission, or connector execution still requires explicit approval.',
      'Publisher can create repository handoff PRs or WordPress drafts, but final publishing remains outside chat and approval-gated.',
      'Publisher is the SaaS account surface; CAIt is the usage-billed orchestration and generation layer connected to external destinations.'
    ],
    artifacts: [
      { type: contractType, artifact_type: contractType, contract_type: contractType, item_type: item.type, channel: item.channel, destination: itemDestination(item), connector: itemConnector(item), connector_capability: itemConnectorCapability(item), publish_method: itemPublishMethod(item), action_type: itemActionType(item), profile_handle: itemProfileHandle(item), profile_url: itemProfileUrl(item), media_assets: itemMediaAssets(item), channel_rules: itemChannelRules(item), approval_checklist: itemApprovalChecklist(item), market: itemMarket(item), locale: itemLocale(item), owner: item.owner || 'CAIt', title: item.title, slug: item.slug, meta: item.meta, keywords: item.keywords, h1: item.h1, primary_cta: item.primaryCta, secondary_cta: item.secondaryCta, internal_links: item.internalLinks, og_title: item.ogTitle, og_description: item.ogDescription, body: item.body, status: item.status, risk: item.risk, source_evidence: item.sourceEvidence || [], publish_variants: item.publishVariants || [], eeat_notes: item.eeatNotes || {} },
      { type: 'github_pr_handoff', repo: repo?.fullName || repo?.full_name || '', repo_path: String(els.repoPathInput?.value || '').trim(), pr_url: prUrl, status: repoStatus.message },
      { type: 'wordpress_draft_handoff', site_url: wordpressStatus?.result?.wordpress?.siteUrl || '', draft_url: wpDraftUrl, draft_id: wordpressStatus?.result?.draft?.id || '', post_type: String(els.wordpressPostTypeSelect?.value || 'posts'), status: wordpressStatus.message },
      { type: 'x_post_handoff', account_username: xStatus?.result?.x?.username || '', connected: Boolean(xStatus.connected), status: xStatus.message },
      { type: 'publisher_saas_billing_model', ...publisherSaasBillingModel() },
      { type: 'destination_profile', channel: item.channel, destination: itemDestination(item), connector: itemConnector(item), connector_capability: itemConnectorCapability(item), publish_method: itemPublishMethod(item), profile_handle: itemProfileHandle(item), profile_url: itemProfileUrl(item), media_assets: itemMediaAssets(item), channel_rules: itemChannelRules(item), approval_checklist: itemApprovalChecklist(item), market: itemMarket(item), locale: itemLocale(item), note: 'Destination profile holds publication rules, owner, CTA policy, compliance notes, OAuth connector, media requirements, and execution method.' }
    ],
    approval_requests: items.map((entry) => ({
      id: entry.id,
      title: entry.title,
      artifact_type: itemContractType(entry),
      action_type: itemActionType(entry),
      status: entry.status,
      channel: entry.channel,
      connector: itemConnector(entry),
      connector_capability: itemConnectorCapability(entry),
      publish_method: itemPublishMethod(entry),
      profile_handle: itemProfileHandle(entry),
      profile_url: itemProfileUrl(entry),
      media_assets: itemMediaAssets(entry),
      channel_rules: itemChannelRules(entry),
      approval_checklist: itemApprovalChecklist(entry),
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
      chat_handoff_id: chatHandoffId(),
      chat_return_to: chatReturnTo(),
      publisher_return_to: currentPublisherReturnPath(),
      publisher_planning: publisherPlanningState(),
      billing_model: publisherSaasBillingModel(),
      delivery_format: selectedPublisherDeliveryFormat(),
      delivery_format_preference: selectedPublisherDeliveryFormat(),
      selected_publisher_item_id: item.id,
      selected_publisher_contract_type: contractType,
      publisher_counts: {
        items: items.length,
        destinations: destinationGroups().length,
        approved: items.filter((entry) => String(entry.status || '').toLowerCase() === 'approved').length,
        needs_review: items.filter((entry) => String(entry.status || '').toLowerCase() !== 'approved').length
      },
      github_repo: repo?.fullName || repo?.full_name || '',
      github_pr_url: prUrl,
      github_status: repoStatus,
      wordpress_status: wordpressStatus,
      x_status: xStatus,
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

function textLength(value = '') {
  return String(value || '').trim().length;
}

function publisherSaasBillingModel() {
  return {
    saas_entrypoint: 'publisher_approval_studio',
    account_surface: 'Publisher login',
    paid_meter: 'cait_usage',
    paid_meter_label: 'CAIt usage fee',
    value_model: 'Connect CAIt to publishing destinations and bill for planning, drafting, routing, and approval-gated execution support.',
    connector_strategy: ['x', 'github', 'wordpress', 'email', 'directory', 'owned_site', 'future_partner_apps']
  };
}

function renderPublisherLoginState() {
  if (!els.publisherLoginLink) return;
  const login = String(authSnapshot?.login || authSnapshot?.user?.login || authSnapshot?.account?.login || '').trim();
  const loggedIn = Boolean(authSnapshot?.loggedIn || authSnapshot?.user || login);
  if (loggedIn) {
    els.publisherLoginLink.textContent = login ? `Publisher: ${login}` : 'Publisher account';
    els.publisherLoginLink.href = '/settings';
  } else {
    const url = new URL('/login', window.location.origin);
    url.searchParams.set('next', '/publisher-approval.html');
    url.searchParams.set('source', 'publisher_saas');
    els.publisherLoginLink.textContent = 'Publisher login';
    els.publisherLoginLink.href = `${url.pathname}${url.search}`;
  }
}

function planningValue(input = null) {
  return String(input?.value || '').trim();
}

function selectedPublisherDeliveryFormat() {
  return String(els.launchDeliveryFormatSelect?.value || 'publisher_packets').trim() || 'publisher_packets';
}

function publisherPlanningState() {
  return {
    offer: planningValue(els.launchOfferInput),
    audience: planningValue(els.launchAudienceInput),
    goal: planningValue(els.launchGoalInput),
    destinationMix: planningValue(els.launchDestinationMixInput),
    deliveryFormat: selectedPublisherDeliveryFormat(),
    proof: planningValue(els.launchProofInput),
    selectedAxis: planningValue(els.launchAxisInput),
    savedAt: new Date().toISOString()
  };
}

function savePublisherPlanningState() {
  if (els.publisherPlanningPill) {
    els.publisherPlanningPill.textContent = 'Planning ready';
    els.publisherPlanningPill.className = 'status-pill approved';
  }
  if (els.publisherPlanningNote) {
    els.publisherPlanningNote.textContent = 'Planning inputs will be saved into the next server-side CAIt packet when you send a planning or draft request.';
  }
}

function restorePublisherPlanningState() {
  if (els.publisherPlanningNote) {
    els.publisherPlanningNote.textContent = 'Publisher planning is held in the current review state until it is sent as a server-side CAIt packet.';
  }
}

function currentLaunchBrief() {
  const item = selectedItem();
  return {
    offer: planningValue(els.launchOfferInput) || item?.title || '',
    audience: planningValue(els.launchAudienceInput) || item?.target || itemDestination(item),
    goal: planningValue(els.launchGoalInput) || item?.primaryCta || '',
    destinationMix: planningValue(els.launchDestinationMixInput) || (item ? `${itemProfile(item)?.label || item.channel}, ${itemDestination(item)}` : 'LP, X, directory, email'),
    deliveryFormat: selectedPublisherDeliveryFormat(),
    proof: planningValue(els.launchProofInput) || [
      item?.meta ? `Meta: ${item.meta}` : '',
      item?.keywords ? `Keywords: ${item.keywords}` : '',
      item?.body ? `Current draft:\n${item.body}` : ''
    ].filter(Boolean).join('\n\n'),
    selectedAxis: planningValue(els.launchAxisInput)
  };
}

function publisherQueueSummary() {
  return items.slice(0, 12).map((item) => ({
    id: item.id,
    title: item.title,
    destination: itemDestination(item),
    channel: itemProfile(item)?.label || item.channel,
    status: item.status,
    market: itemMarket(item),
    locale: itemLocale(item),
    contract_type: itemContractType(item)
  }));
}

function buildPublisherPlanningContext(mode = 'axes') {
  const brief = currentLaunchBrief();
  const target = mode === 'draft_assets'
    ? String(els.handoffTargetSelect.value || 'cmo_leader')
    : 'cmo_leader';
  const wantsDrafts = mode === 'draft_assets';
  const requestedOutputs = brief.deliveryFormat === 'lp_and_posts'
    ? ['landing_page_change', 'site_publish_packet', 'x_post_packet', 'social_copy_packet', 'approval_request']
    : brief.deliveryFormat === 'approval_queue'
      ? ['approval_request', 'destination_profile', 'execution_checklist']
      : brief.deliveryFormat === 'planning_options'
        ? ['4-6 positioning axes', 'channel fit', 'LP promise', 'post angle', 'risk/blocker', 'recommended selected axis criteria']
        : brief.deliveryFormat === 'files'
          ? ['delivery_files', 'markdown packet files', 'approval checklist file']
          : brief.deliveryFormat === 'chat_summary'
            ? ['chat summary', 'recommended next actions', 'assumptions']
            : ['landing_page_change', 'site_publish_packet', 'x_post_packet', 'directory_packet', 'approval_request'];
  return buildCaitAppContext({
    source_app: 'publisher_approval_studio',
    source_app_label: 'Publisher & Approval Studio',
    title: wantsDrafts ? `Draft Publisher assets: ${brief.offer || 'launch'}` : `Plan Publisher launch axes: ${brief.offer || 'new launch'}`,
    summary: wantsDrafts
      ? 'Publisher is asking CAIt to create LP, post, and approval-ready publishing packets from the selected launch axis.'
      : 'Publisher is asking CAIt to propose multiple launch axes before content is drafted or approved.',
    facts: [
      brief.offer ? `Offer / product: ${brief.offer}` : 'Offer / product is not filled yet.',
      brief.audience ? `Target audience: ${brief.audience}` : '',
      brief.goal ? `Business goal: ${brief.goal}` : '',
      brief.destinationMix ? `Destination mix: ${brief.destinationMix}` : '',
      `Delivery shape: ${brief.deliveryFormat}`,
      'SaaS entrypoint: users sign in through Publisher and keep launch plans, approvals, and packets there.',
      'Billing model: CAIt usage fees cover planning, drafting, routing, and connector-backed execution support.',
      brief.proof ? `Proof / assets: ${brief.proof}` : '',
      brief.selectedAxis ? `Selected axis: ${brief.selectedAxis}` : '',
      `Publisher queue items: ${items.length}`,
      selectedItem() ? `Current selected item: ${selectedItem().title} (${itemDestination(selectedItem())})` : ''
    ].filter(Boolean),
    assumptions: [
      'Publisher is the stable operations board; CAIt should return structured packets that can reopen here.',
      'No external publishing should happen in chat. Create approval-ready drafts and route execution back through Publisher.',
      'This is a Publisher SaaS login flow with CAIt usage billing, not a separate per-connector billing UI inside chat.'
    ],
    artifacts: [
      {
        type: wantsDrafts ? 'publisher_asset_draft_request' : 'publisher_launch_axis_request',
        artifact_type: wantsDrafts ? 'publisher_asset_draft_request' : 'publisher_launch_axis_request',
        mode,
        offer: brief.offer,
        audience: brief.audience,
        goal: brief.goal,
        destination_mix: brief.destinationMix,
        delivery_format_preference: brief.deliveryFormat,
        billing_model: publisherSaasBillingModel(),
        proof_assets: brief.proof,
        selected_axis: brief.selectedAxis,
        requested_outputs: requestedOutputs,
        publisher_queue: publisherQueueSummary()
      }
    ],
    recommended_next_actions: wantsDrafts
      ? [
          'Create Publisher-ready artifacts for the selected axis: landing page packet, social post packet, directory/listing packet if relevant, and approval requests.',
          'Return structured artifacts with destination, channel_key, connector, connector_capability, title, slug, meta, h1, body, CTA, risk, and status.',
          'Do not publish directly; the returned packets must be reviewed in Publisher.'
        ]
      : [
          'Propose 4-6 distinct launch axes with target segment, promise, proof needed, LP angle, post angle, destination fit, and risks.',
          'Recommend which axis to choose first and explain why.',
          'Return the axes as structured Publisher planning artifacts so the chosen axis can be used for the next draft request.'
        ],
    handoff_targets: [target, 'seo_specialist', 'build_team_leader'],
    raw_context: {
      chat_handoff_id: chatHandoffId(),
      chat_return_to: chatReturnTo(),
      publisher_return_to: currentPublisherReturnPath(),
      publisher_request_mode: mode,
      publisher_launch_brief: brief,
      billing_model: publisherSaasBillingModel(),
      delivery_format: brief.deliveryFormat,
      delivery_format_preference: brief.deliveryFormat,
      publisher_queue: publisherQueueSummary()
    }
  });
}

async function sendPublisherPlanningToCait(mode = 'axes') {
  const wantsDrafts = mode === 'draft_assets';
  if (wantsDrafts && !planningValue(els.launchAxisInput)) {
    window.alert('Choose or paste a selected axis before asking CAIt to draft the assets.');
    return;
  }
  const button = wantsDrafts ? els.draftFromAxisBtn : els.askPlanningBtn;
  if (!button) return;
  savePublisherPlanningState();
  persistSelectedFromFields();
  const previousText = button.textContent;
  button.disabled = true;
  button.textContent = wantsDrafts ? 'Sending draft request' : 'Sending planning request';
  if (els.publisherPlanningPill) {
    els.publisherPlanningPill.textContent = wantsDrafts ? 'Draft request sent' : 'Planning request sent';
    els.publisherPlanningPill.className = 'status-pill pending';
  }
  try {
    const returnTo = chatReturnTo();
    const target = await sendContextToCait(buildPublisherPlanningContext(mode), { returnTo });
    publishResult = {
      kind: mode,
      ok: true,
      chat_url: target,
      next: wantsDrafts
        ? 'CAIt is preparing Publisher-ready assets for the selected axis.'
        : 'CAIt is preparing launch axes for selection.'
    };
    if (els.publisherPlanningNote) {
      els.publisherPlanningNote.textContent = wantsDrafts
        ? 'Sent selected-axis draft request to CAIt. Returned artifacts will reopen here as Publisher packets.'
        : 'Sent launch-axis planning request to CAIt. Paste the chosen axis here, then request drafts.';
    }
  } catch (error) {
    publishResult = { kind: mode, ok: false, error: String(error?.message || error) };
    if (els.publisherPlanningPill) {
      els.publisherPlanningPill.textContent = 'Request failed';
      els.publisherPlanningPill.className = 'status-pill blocked';
    }
  } finally {
    button.disabled = false;
    button.textContent = previousText;
    render();
  }
}

function seedLandingPageStarter() {
  savePublisherPlanningState();
  const brief = currentLaunchBrief();
  const id = `publisher-lp-${Date.now().toString(36)}`;
  const title = brief.offer || 'New Publisher launch page';
  const item = contextItemFromArtifact({
    id,
    type: 'landing_page_change',
    title,
    slug: `/${slugFromTitle(title)}`,
    meta: brief.goal || `Landing page for ${title}`,
    h1: brief.selectedAxis || title,
    keywords: brief.audience || '',
    primary_cta: brief.goal || 'Start now',
    body: [
      brief.selectedAxis ? `Selected axis: ${brief.selectedAxis}` : '',
      brief.proof ? `Proof / assets:\n${brief.proof}` : '',
      'Draft body placeholder. Ask CAIt to draft selected axis to replace this with launch-ready copy.'
    ].filter(Boolean).join('\n\n'),
    status: 'needs approval',
    channel_key: 'owned_site',
    destination: 'Owned site / Publisher',
    risk: 'Starter item created in Publisher. Needs CAIt drafting and human approval before publishing.'
  }, items.length);
  items = [item, ...items.filter((entry) => entry.id !== id)];
  selectedId = item.id;
  destinationFilter = 'all';
  if (els.launchAxisInput && !planningValue(els.launchAxisInput)) els.launchAxisInput.value = item.h1 || '';
  render();
}

function itemDataChecks(item = null) {
  if (!item) {
    return [{
      title: 'Packet is loaded',
      detail: 'Load a Publisher packet from CAIt or a saved delivery item before checking media-specific fields.',
      status: 'pending'
    }];
  }
  const channel = String(item.channel || 'generic').trim();
  const checks = [
    {
      title: 'Destination and medium are selected',
      detail: `${itemDestination(item)} uses ${itemProfile(item)?.label || channel} with ${itemConnectorCapability(item)}.`,
      status: itemDestination(item) && channel ? 'ready' : 'blocked'
    },
    {
      title: 'Title is usable',
      detail: item.title ? `Title is ${textLength(item.title)} characters.` : 'Add a clear title before saving or publishing.',
      status: item.title ? 'ready' : 'blocked'
    },
    {
      title: 'Body is present',
      detail: item.body ? `Body is ${textLength(item.body)} characters.` : 'Add the draft, post text, or page change body.',
      status: item.body ? 'ready' : 'blocked'
    }
  ];
  if (['owned_site', 'github_pr', 'wordpress_site'].includes(channel)) {
    checks.push(
      {
        title: 'Path and H1 are ready',
        detail: item.slug && item.h1 ? `Path ${item.slug} and H1 are set.` : 'Set both slug/path and H1 for site publishing.',
        status: item.slug && item.h1 ? 'ready' : 'pending'
      },
      {
        title: 'SEO metadata is ready',
        detail: item.meta && item.keywords ? 'Meta description and target query are set.' : 'Add meta description and target query before owned-site publishing.',
        status: item.meta && item.keywords ? 'ready' : 'pending'
      },
      {
        title: 'CTA and internal links are reviewable',
        detail: item.primaryCta && item.internalLinks ? 'Primary CTA and internal links are attached.' : 'Add CTA and internal links, or leave a blocker if not applicable.',
        status: item.primaryCta && item.internalLinks ? 'ready' : 'pending'
      }
    );
  } else if (channel === 'x') {
    checks.push({
      title: 'X post length is executable',
      detail: textLength(item.body) <= 280 ? `${textLength(item.body)} / 280 characters.` : `${textLength(item.body)} characters; shorten or convert to a thread before posting.`,
      status: textLength(item.body) && textLength(item.body) <= 280 ? 'ready' : 'blocked'
    });
  } else if (channel === 'instagram') {
    checks.push(
      {
        title: 'Instagram profile is identified',
        detail: itemProfileHandle(item) || itemProfileUrl(item) ? `${itemProfileHandle(item) || itemProfileUrl(item)} is attached.` : 'Add the Instagram account/profile before approval.',
        status: itemProfileHandle(item) || itemProfileUrl(item) ? 'ready' : 'pending'
      },
      {
        title: 'Instagram media assets are attached',
        detail: itemMediaAssets(item) ? 'Media asset notes, URLs, or blockers are attached.' : 'Add carousel/reel/story media assets or explicitly mark the asset blocker.',
        status: itemMediaAssets(item) ? 'ready' : 'pending'
      },
      {
        title: 'Instagram approval checklist is visible',
        detail: itemApprovalChecklist(item) ? 'Profile, caption, destination, proof, and schedule checks are captured.' : 'Add the approval checklist before connector or manual posting handoff.',
        status: itemApprovalChecklist(item) ? 'ready' : 'pending'
      }
    );
  } else if (['reddit', 'indie_hackers'].includes(channel)) {
    checks.push({
      title: 'Community post has context',
      detail: item.title && textLength(item.body) >= 120 ? 'Title and discussion body are long enough for review.' : 'Add a discussion title and enough body context for community review.',
      status: item.title && textLength(item.body) >= 120 ? 'ready' : 'pending'
    });
  } else if (channel === 'directory') {
    checks.push({
      title: 'Directory listing fields are present',
      detail: item.title && item.meta && item.slug ? 'Listing name, description, and target URL/path are present.' : 'Add listing title, description, and target URL/path before submission.',
      status: item.title && item.meta && item.slug ? 'ready' : 'pending'
    });
  } else if (channel === 'email') {
    checks.push({
      title: 'Email packet has subject context',
      detail: item.title && item.body ? 'Subject/title and body are ready for mailbox handoff.' : 'Add subject/title and exact email body before send handoff.',
      status: item.title && item.body ? 'ready' : 'blocked'
    });
  }
  checks.push({
    title: 'Approval status is explicit',
    detail: `Current status is ${item.status || 'needs approval'}.`,
    status: item.status ? 'ready' : 'pending'
  });
  return checks;
}

function renderDataCheck() {
  const checks = itemDataChecks(selectedItem());
  const readyCount = checks.filter((entry) => entry.status === 'ready').length;
  const blockedCount = checks.filter((entry) => entry.status === 'blocked').length;
  if (els.dataCheckPill) {
    els.dataCheckPill.textContent = selectedItem()
      ? `${readyCount}/${checks.length} data checks ready`
      : 'Queue not loaded';
    els.dataCheckPill.className = `status-pill ${blockedCount ? 'blocked' : (readyCount === checks.length ? 'approved' : 'pending')}`;
  }
  if (els.dataCheckList) {
    els.dataCheckList.innerHTML = checks.map((entry) => [
      `<article class="ops-readiness-item ${entry.status}">`,
      `<strong>${escapeHtml(entry.title)}</strong>`,
      `<span>${escapeHtml(entry.detail)}</span>`,
      '</article>'
    ].join('')).join('');
  }
}

async function loadPublisherDbItems() {
  try {
    const payload = await apiJson('/api/publisher/items?limit=100');
    const imported = (Array.isArray(payload.items) ? payload.items : [])
      .map(contextItemFromPublisherItem)
      .filter((item) => item.title || item.body);
    if (!imported.length) return;
    const existing = new Set(items.map((item) => String(item.id || '')));
    items = [
      ...items,
      ...imported.filter((item) => !existing.has(String(item.id || '')))
    ];
    if (!selectedId && items[0]) selectedId = items[0].id;
  } catch {
    // Publisher DB history requires login/API access; logged-out users can still edit inbound packets.
  }
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

function renderHandoffSessionNotice() {
  const returnTo = chatReturnTo();
  const handoffId = chatHandoffId();
  const hasImportedServerContext = Boolean(importedContext?.id);
  if (els.returnToChatLink) {
    if (returnTo) {
      els.returnToChatLink.hidden = false;
      els.returnToChatLink.href = returnTo;
    } else {
      els.returnToChatLink.hidden = true;
      els.returnToChatLink.href = '/chat';
    }
  }
  if (!els.handoffSessionNotice) return;
  const fragments = [];
  if (returnTo) fragments.push('Return path to the same CAIt chat is pinned.');
  if (hasImportedServerContext) fragments.push('Server-side context is loaded for this packet.');
  if (handoffId) fragments.push(`Handoff ID: ${handoffId}.`);
  if (!fragments.length) {
    els.handoffSessionNotice.hidden = true;
    els.handoffSessionNotice.className = 'notice';
    els.handoffSessionNotice.textContent = '';
    return;
  }
  const warning = returnTo && !hasImportedServerContext;
  els.handoffSessionNotice.hidden = false;
  els.handoffSessionNotice.className = `notice${warning ? ' notice-warning' : ''}`;
  els.handoffSessionNotice.innerHTML = [
    `<strong>${escapeHtml(warning ? 'Chat handoff is open but no server packet is loaded yet.' : 'CAIt handoff session is attached.')}</strong>`,
    `<span>${escapeHtml(fragments.join(' '))}</span>`
  ].join('');
}

function renderOpsReadiness() {
  const item = selectedItem();
  const approved = approvedPublisherItem(item);
  const blocked = /blocked|changes requested/i.test(String(item?.status || ''));
  const prUrl = String(repoStatus?.result?.pull_request?.htmlUrl || repoStatus?.result?.entity?.pull_request?.htmlUrl || '').trim();
  const wpDraftUrl = String(wordpressStatus?.result?.draft?.editUrl || wordpressStatus?.result?.draft?.link || '').trim();
  const hasServerContext = Boolean(importedContext?.id);
  const hasChatReturn = Boolean(chatReturnTo() || chatHandoffId());
  const readinessItems = [
    {
      title: 'Approval queue stays inspectable',
      detail: item
        ? `${itemDestination(item)} is loaded with ${item.status || 'needs approval'} status, owner, market, and locale.`
        : 'Load a publisher packet to keep the next execution tied to one visible approval item.',
      status: item ? 'ready' : 'pending'
    },
    {
      title: 'Approval gate is explicit',
      detail: approved
        ? 'The selected packet is approved for handoff.'
        : (blocked
          ? 'The selected packet is blocked or needs changes before handoff.'
          : 'Approve, request changes, or block the selected packet before execution.'),
      status: approved ? 'ready' : (blocked ? 'blocked' : 'pending')
    },
    {
      title: 'Execution handoff keeps destination proof',
      detail: prUrl
        ? 'GitHub PR handoff exists and stays attached to this packet.'
        : (wpDraftUrl
          ? 'WordPress draft handoff exists and stays attached to this packet.'
          : (xStatus.connected
            ? 'X connector readiness is visible before execution.'
            : 'No external handoff exists yet. Create a PR, draft, or connector-backed execution path.')),
      status: prUrl || wpDraftUrl || xStatus.connected ? 'ready' : 'pending'
    },
    {
      title: 'CAIt can reopen the same context',
      detail: hasServerContext
        ? 'Server-side context return data is preserved so the next CAIt run can reopen this packet instead of asking again.'
        : (hasChatReturn
          ? 'The chat return route is pinned; Send to CAIt will create the server-side packet reference.'
          : 'Open this app from a CAIt handoff to preserve chat return routing and server-side context references.'),
      status: hasServerContext ? 'ready' : (hasChatReturn ? 'pending' : 'blocked')
    }
  ];
  if (els.opsReadinessPill) {
    const readyCount = readinessItems.filter((entry) => entry.status === 'ready').length;
    const blockedCount = readinessItems.filter((entry) => entry.status === 'blocked').length;
    const pillStatus = readyCount === readinessItems.length ? 'approved' : blockedCount ? 'blocked' : 'pending';
    els.opsReadinessPill.textContent = item
      ? `${readyCount}/${readinessItems.length} ops checks ready`
      : 'Queue not loaded';
    els.opsReadinessPill.className = `status-pill ${item ? pillStatus : 'pending'}`;
  }
  if (els.opsReadinessList) {
    els.opsReadinessList.innerHTML = readinessItems.map((entry) => [
      `<article class="ops-readiness-item ${entry.status}">`,
      `<strong>${escapeHtml(entry.title)}</strong>`,
      `<span>${escapeHtml(entry.detail)}</span>`,
      '</article>'
    ].join('')).join('');
  }
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
  els.profileHandleInput.value = item ? itemProfileHandle(item) : '';
  els.profileUrlInput.value = item ? itemProfileUrl(item) : '';
  els.mediaAssetsInput.value = item ? itemMediaAssets(item) : '';
  els.channelRulesInput.value = item ? itemChannelRules(item) : '';
  els.approvalChecklistInput.value = item ? itemApprovalChecklist(item) : '';
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

function renderXControls() {
  if (!els.xStatusPill) return;
  const connected = Boolean(xStatus.connected);
  const username = String(xStatus?.result?.x?.username || '').trim();
  els.xStatusPill.textContent = connected && username
    ? `X connected @${username}`
    : (xStatus.checked ? 'X blocked' : 'X not checked');
  els.xStatusPill.className = `status-pill ${connected ? 'approved' : (xStatus.checked ? 'blocked' : 'pending')}`;
}

function renderPublishActionControls() {
  const item = selectedItem();
  const approved = approvedPublisherItem(item);
  const channel = String(item?.channel || '').trim();
  const bulkCount = bulkCandidateItems().length;
  if (els.publishNowBtn) {
    els.publishNowBtn.disabled = !approved;
    els.publishNowBtn.textContent = channel === 'wordpress_site'
      ? 'Create draft now'
      : (channel === 'github_pr' || channel === 'owned_site' ? 'Create PR now' : 'Publish now');
  }
  if (els.schedulePostBtn) els.schedulePostBtn.disabled = !approved || channel !== 'x';
  if (els.bulkPublishBtn) {
    els.bulkPublishBtn.disabled = bulkCount < 1;
    els.bulkPublishBtn.textContent = bulkCount ? `Bulk publish approved (${bulkCount})` : 'Bulk publish approved';
  }
  if (els.publishActionNote) {
    const xNote = channel === 'x'
      ? 'X posting requires a connected OAuth account and exact post text approval.'
      : 'Scheduling currently supports X posts. WordPress creates drafts; GitHub and owned-site items create PR handoffs.';
    els.publishActionNote.textContent = approved
      ? xNote
      : 'Approve the selected item before executing. Bulk publish only uses approved items in the selected scope.';
  }
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
  renderHandoffSessionNotice();
  renderOpsReadiness();
  renderDataCheck();
  renderDestinationNav();
  renderFilters();
  renderList();
  renderEditor();
  renderApprovalTable();
  renderGithubControls();
  renderWordpressControls();
  renderXControls();
  renderPublishActionControls();
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

async function reshapeSelectedMediumContext() {
  const item = selectedItem();
  if (!item || !els.reshapeSelectedBtn) return;
  persistSelectedFromFields();
  const packet = buildPacket();
  packet.raw_context = {
    ...(packet.raw_context && typeof packet.raw_context === 'object' ? packet.raw_context : {}),
    publisher_manual_media_override: {
      channel: item.channel,
      destination: itemDestination(item),
      connector: itemConnector(item),
      connector_capability: itemConnectorCapability(item),
      requested_at: new Date().toISOString()
    }
  };
  els.reshapeSelectedBtn.disabled = true;
  els.reshapeSelectedBtn.textContent = 'Saving shape';
  try {
    const payload = await apiJson('/api/publisher/context-ingest', {
      method: 'POST',
      body: JSON.stringify({
        source_app: 'publisher_approval_studio',
        context: packet
      })
    });
    importedContext = payload?.app_context?.context || importedContext;
    publishResult = {
      kind: 'publisher_context_reshape',
      ok: true,
      app_context_id: payload.app_context_id || '',
      shape: payload.app_context_shape || null,
      next: payload?.app_context_shape?.ok
        ? 'LLM-shaped Publisher context was saved and can be reopened from CAIt.'
        : `Publisher context was saved; LLM shaping did not run: ${payload?.app_context_shape?.reason || 'unknown reason'}.`
    };
  } catch (error) {
    publishResult = {
      kind: 'publisher_context_reshape',
      ok: false,
      error: String(error?.message || error),
      payload: error?.payload || null
    };
  } finally {
    els.reshapeSelectedBtn.disabled = false;
    els.reshapeSelectedBtn.textContent = 'Re-shape and save';
    render();
  }
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

[els.destinationInput, els.channelSelect, els.profileHandleInput, els.profileUrlInput, els.mediaAssetsInput, els.channelRulesInput, els.approvalChecklistInput, els.marketInput, els.localeInput, els.ownerInput, els.titleInput, els.slugInput, els.metaInput, els.keywordsInput, els.h1Input, els.primaryCtaInput, els.secondaryCtaInput, els.internalLinksInput, els.ogTitleInput, els.ogDescriptionInput, els.bodyInput, els.handoffTargetSelect].forEach((input) => {
  if (!input) return;
  const update = () => {
    persistSelectedFromFields();
    render();
  };
  input.addEventListener('input', update);
  input.addEventListener('change', update);
});

[els.launchOfferInput, els.launchAudienceInput, els.launchGoalInput, els.launchDestinationMixInput, els.launchDeliveryFormatSelect, els.launchProofInput, els.launchAxisInput].forEach((input) => {
  if (!input) return;
  input.addEventListener('input', savePublisherPlanningState);
  input.addEventListener('change', savePublisherPlanningState);
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
els.reshapeSelectedBtn.addEventListener('click', () => {
  void reshapeSelectedMediumContext();
});
els.askPlanningBtn?.addEventListener('click', () => {
  void sendPublisherPlanningToCait('axes');
});
els.draftFromAxisBtn?.addEventListener('click', () => {
  void sendPublisherPlanningToCait('draft_assets');
});
els.seedLpBtn?.addEventListener('click', () => {
  seedLandingPageStarter();
});
els.requestChangesBtn.addEventListener('click', () => setSelectedStatus('changes requested'));
els.blockBtn.addEventListener('click', () => setSelectedStatus('blocked'));
els.approveSelectedBtn.addEventListener('click', () => setSelectedStatus('approved'));
els.connectXBtn.addEventListener('click', () => {
  window.location.href = xConnectHref();
});
els.refreshXBtn.addEventListener('click', () => {
  void refreshXStatus();
});
els.publishNowBtn.addEventListener('click', () => {
  void publishSelectedNow();
});
els.schedulePostBtn.addEventListener('click', () => {
  void scheduleSelectedPost();
});
els.bulkPublishBtn.addEventListener('click', () => {
  void bulkPublishApproved();
});
els.scheduleAtInput.addEventListener('change', () => renderPublishActionControls());
els.bulkScopeSelect.addEventListener('change', () => renderPublishActionControls());
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
  const returnTo = chatReturnTo();
  void sendContextToCait(buildPacket(), { returnTo }).catch((error) => {
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
  restorePublisherPlanningState();
  await refreshAuthSnapshot();
  renderPublisherLoginState();
  applyInboundContext(await fetchCaitAppContextFromUrl());
  await loadPublisherDbItems();
  await loadPublisherDeliveryItems();
  render();
  void refreshXStatus({ silent: true });
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
