export const CAIT_APP_CONTEXT_SCHEMA = 'cait-app-context/v1';
export const APP_CONTEXT_TTL_MS = 24 * 60 * 60 * 1000;
const APP_CONTEXT_RAW_CONTRACT_KEYS = Object.freeze([
  'lead_rows',
  'evidence_urls',
  'email_drafts',
  'next_actions',
  'campaign_state',
  'publisher_queue',
  'approval_backlog',
  'connector_readiness',
  'planned_action_queue',
  'now_week_0_1',
  'next_week_1_3',
  'waiting_conditions',
  'measurement_loop',
  'next_action_owner',
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
const APP_CONTEXT_RAW_CONTRACT_ALIASES = Object.freeze({
  lead_rows: ['leadRows'],
  evidence_urls: ['evidenceUrls'],
  email_drafts: ['emailDrafts'],
  next_actions: ['nextActions'],
  campaign_state: ['campaignState'],
  publisher_queue: ['publisherQueue'],
  approval_backlog: ['approvalBacklog', 'approvalRequests', 'approval_requests'],
  connector_readiness: ['connectorReadiness'],
  planned_action_queue: ['plannedActionQueue', 'action_queue', 'actionQueue', 'plannedActions'],
  now_week_0_1: ['nowWeek01', 'nowWeekZeroOne', 'week_0_1', 'weekZeroOne', 'week0_1', 'week0One'],
  next_week_1_3: ['nextWeek13', 'nextWeekOneThree', 'week_1_3', 'weekOneThree', 'week1_3', 'week1Three'],
  waiting_conditions: ['waitingConditions', 'waiting_on', 'waitingOn', 'blockers'],
  measurement_loop: ['measurementLoop', 'measurementChecks'],
  next_action_owner: ['nextActionOwner', 'nextActionOwners', 'next_owner', 'nextOwner', 'owner_map', 'ownerMap'],
  article_draft: ['articleDraft'],
  seo_article: ['seoArticle'],
  seo_page_artifact: ['seoPageArtifact', 'seoPage'],
  landing_page: ['landingPage'],
  landing_page_change: ['landingPageChange'],
  site_publish_packet: ['sitePublishPacket', 'ownedSitePacket', 'publisherPacket'],
  wordpress_draft: ['wordpressDraft'],
  wordpress_draft_packet: ['wordpressDraftPacket', 'wpDraftPacket'],
  directory_submission: ['directorySubmission'],
  directory_packet: ['directoryPacket'],
  community_post_packet: ['communityPostPacket'],
  social_copy_packet: ['socialCopyPacket', 'socialPostPack'],
  social_post: ['socialPost'],
  x_post: ['xPost', 'tweet'],
  x_post_packet: ['xPostPacket', 'twitterPostPacket'],
  reddit_post: ['redditPost'],
  reddit_post_packet: ['redditPostPacket'],
  indie_hackers_post: ['indieHackersPost', 'indieHackers'],
  indie_hackers_packet: ['indieHackersPacket'],
  instagram_post: ['instagramPost'],
  instagram_post_packet: ['instagramPostPacket'],
  approval_request: ['approvalRequest']
});

function nowIso() {
  return new Date().toISOString();
}

function safeText(value = '', max = 2000) {
  return String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function safeId(value = '') {
  return safeText(value, 120).toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
}

function safeList(value = [], max = 24) {
  const source = Array.isArray(value) ? value : String(value || '').split(/[,\n]/);
  return [...new Set(source.map((item) => safeText(item, 500)).filter(Boolean))].slice(0, max);
}

function compactObject(value, options = {}, depth = 0) {
  if (value == null || depth > Number(options.depth ?? 5)) return value == null ? value : safeText(value, Number(options.maxText || 1000));
  if (Array.isArray(value)) return value.slice(0, Number(options.maxArray || 16)).map((item) => compactObject(item, options, depth + 1));
  if (typeof value !== 'object') return typeof value === 'string' ? safeText(value, Number(options.maxText || 1000)) : value;
  const output = {};
  for (const [key, item] of Object.entries(value)) {
    if (/token|secret|password|private[_-]?key|api[_-]?key|bearer/i.test(key)) {
      output[safeText(key, 80)] = item ? '[redacted]' : item;
      continue;
    }
    output[safeText(key, 80)] = compactObject(item, options, depth + 1);
  }
  return output;
}

function objectList(value = [], max = 24) {
  return (Array.isArray(value) ? value : [])
    .filter((item) => item && typeof item === 'object')
    .map((item) => compactObject(item, { depth: 5, maxText: 1800, maxArray: 24 }))
    .slice(0, max);
}

function camelKey(value = '') {
  return String(value || '').replace(/_([a-z0-9])/g, (_, char) => char.toUpperCase());
}

function hasContractValue(value) {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'string' || typeof value === 'number') return safeText(value, 1000).length > 0;
  return value && typeof value === 'object' && Object.keys(value).length > 0;
}

function rawContextWithContractFields(source = {}) {
  const raw = compactObject(source.raw_context || source.rawContext || {}, { depth: 5, maxText: 1400, maxArray: 16 });
  const output = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  for (const key of APP_CONTEXT_RAW_CONTRACT_KEYS) {
    if (Object.prototype.hasOwnProperty.call(output, key)) continue;
    const aliases = [key, camelKey(key), ...(APP_CONTEXT_RAW_CONTRACT_ALIASES[key] || [])];
    const value = aliases.map((alias) => source[alias]).find(hasContractValue);
    if (!hasContractValue(value)) continue;
    output[key] = compactObject(value, { depth: 5, maxText: 1400, maxArray: 16 });
  }
  return output;
}

export function normalizeCaitAppContext(raw = {}) {
  const source = raw?.context && typeof raw.context === 'object' ? raw.context : raw;
  const createdAt = safeText(source.created_at || source.createdAt || nowIso(), 80) || nowIso();
  const sourceApp = safeId(source.source_app || source.sourceApp || source.app_id || source.appId || source.app || 'app');
  const title = safeText(source.title || 'App context', 180);
  const id = safeText(source.id || `${sourceApp || 'app'}-${Date.now().toString(36)}`, 160);
  return {
    schema: CAIT_APP_CONTEXT_SCHEMA,
    id,
    source_app: sourceApp,
    source_app_label: safeText(source.source_app_label || source.sourceAppLabel || source.app_label || source.appLabel || sourceApp || 'App', 120),
    title,
    summary: safeText(source.summary || '', 1600),
    facts: safeList(source.facts || [], 40),
    assumptions: safeList(source.assumptions || [], 24),
    artifacts: objectList(source.artifacts || [], 40),
    metrics: objectList(source.metrics || [], 60),
    recommended_next_actions: safeList(source.recommended_next_actions || source.recommendedNextActions || [], 30),
    approval_requests: objectList(source.approval_requests || source.approvalRequests || [], 40),
    delivery_files: objectList(source.delivery_files || source.deliveryFiles || [], 30),
    handoff_targets: safeList(source.handoff_targets || source.handoffTargets || [], 20),
    raw_context: rawContextWithContractFields(source),
    created_at: createdAt
  };
}

export function createAppContextRecord(raw = {}, ownerInfo = {}, options = {}) {
  const payload = normalizeCaitAppContext(raw);
  const now = nowIso();
  const id = safeText(options.id || payload.id || `ctx-${Date.now().toString(36)}`, 160);
  const expiresAt = safeText(options.expiresAt || new Date(Date.now() + APP_CONTEXT_TTL_MS).toISOString(), 80);
  return {
    id,
    ownerLogin: safeText(ownerInfo.login || ownerInfo.owner || ownerInfo.email || '', 200).toLowerCase(),
    sourceApp: safeId(payload.source_app),
    sourceAppLabel: safeText(payload.source_app_label || payload.source_app, 120),
    title: safeText(payload.title || 'App context', 180),
    summary: safeText(payload.summary || '', 1600),
    payload: { ...payload, id },
    accessToken: safeText(options.accessToken || '', 200),
    status: safeText(options.status || 'ready', 40) || 'ready',
    expiresAt,
    createdAt: safeText(options.createdAt || now, 80),
    updatedAt: safeText(options.updatedAt || now, 80)
  };
}

export function publicAppContext(record = {}, options = {}) {
  if (!record?.id) return null;
  const payload = normalizeCaitAppContext(record.payload || {});
  const base = {
    id: record.id,
    source_app: safeId(record.sourceApp || payload.source_app),
    source_app_label: safeText(record.sourceAppLabel || payload.source_app_label, 120),
    title: safeText(record.title || payload.title, 180),
    summary: safeText(record.summary || payload.summary, 1600),
    status: safeText(record.status || 'ready', 40),
    expires_at: safeText(record.expiresAt || '', 80),
    created_at: safeText(record.createdAt || '', 80),
    updated_at: safeText(record.updatedAt || '', 80)
  };
  if (options.includePayload !== false) base.context = { ...payload, id: record.id };
  return base;
}

export function appContextIsExpired(record = {}, at = Date.now()) {
  const expires = Date.parse(String(record?.expiresAt || record?.expires_at || ''));
  return Number.isFinite(expires) && expires <= at;
}
