export const PUBLISH_DESTINATION_PROFILES = Object.freeze([
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
]);

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
  'visual_asset_readiness_matrix',
  'visual_asset_rights_status',
  'visual_asset_gap',
  'approval_request'
]);

const PUBLISHER_CONTRACT_TYPE_SET = new Set(PUBLISHER_CONTRACT_TYPES);
const PUBLISHER_CONTRACT_ALIASES = Object.freeze({
  site_publish_packet: ['sitePublishPacket', 'owned_site_packet', 'ownedSitePacket', 'publisher_packet', 'publisherPacket', 'publishing_packet', 'publishingPacket', 'publish_packet', 'publishPacket', 'content_package', 'contentPackage', 'publisher_content_package', 'publisherContentPackage'],
  wordpress_draft_packet: ['wordpressDraftPacket', 'wp_draft_packet', 'wpDraftPacket'],
  directory_packet: ['directoryPacket', 'listing_packet', 'listingPacket'],
  social_copy_packet: ['socialCopyPacket', 'social_post_pack', 'socialPostPack', 'social_packet', 'socialPacket'],
  x_post_packet: ['xPostPacket', 'twitter_post_packet', 'twitterPostPacket'],
  reddit_post_packet: ['redditPostPacket'],
  indie_hackers_packet: ['indieHackersPacket'],
  instagram_post_packet: ['instagramPostPacket'],
  visual_asset_readiness_matrix: ['visualAssetReadinessMatrix', 'asset_readiness_matrix', 'assetReadinessMatrix', 'media_readiness_matrix', 'mediaReadinessMatrix'],
  visual_asset_rights_status: ['visualAssetRightsStatus', 'asset_rights_status', 'assetRightsStatus', 'rights_status', 'rightsStatus'],
  visual_asset_gap: ['visualAssetGap', 'asset_gap', 'assetGap', 'media_asset_gap', 'mediaAssetGap'],
  approval_request: ['approvalRequest']
});

export function destinationKey(value = '') {
  return String(value || 'Unassigned destination').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'unassigned';
}

export function itemDestination(item = null) {
  const explicit = String(item?.destination || item?.target || 'Unassigned destination').trim() || 'Unassigned destination';
  const profile = profileByKey(item?.channel || item?.channelKey || item?.medium || '');
  return shouldUseProfileDestinationLabel(explicit, profile) ? profile.label : explicit;
}

export function profileByKey(key = '') {
  const safe = String(key || '').trim().toLowerCase();
  return PUBLISH_DESTINATION_PROFILES.find((profile) => profile.key === safe) || PUBLISH_DESTINATION_PROFILES.at(-1);
}

export function itemProfile(item = null) {
  return profileByKey(item?.channel || item?.channelKey || item?.medium || '');
}

export function itemConnector(item = null) {
  return String(item?.connector || itemProfile(item)?.connector || 'manual').trim() || 'manual';
}

export function itemConnectorCapability(item = null) {
  return String(item?.connectorCapability || item?.connector_capability || itemProfile(item)?.capability || 'manual.copy').trim() || 'manual.copy';
}

export function itemPublishMethod(item = null) {
  return String(item?.publishMethod || item?.publish_method || itemProfile(item)?.method || 'manual_copy').trim() || 'manual_copy';
}

export function itemActionType(item = null) {
  return String(item?.actionType || item?.action_type || itemProfile(item)?.actionType || 'publish_change').trim() || 'publish_change';
}

export function itemMarket(item = null) {
  return String(item?.market || 'Global').trim() || 'Global';
}

export function itemLocale(item = null) {
  return String(item?.locale || 'en').trim() || 'en';
}

export function itemProfileHandle(item = null) {
  return String(item?.profileHandle || item?.profile_handle || item?.accountHandle || item?.account_handle || '').trim();
}

export function itemProfileUrl(item = null) {
  return String(item?.profileUrl || item?.profile_url || item?.accountUrl || item?.account_url || '').trim();
}

export function itemMediaAssets(item = null) {
  return String(item?.mediaAssets || item?.media_assets || item?.assetRequirements || item?.asset_requirements || '').trim();
}

export function itemVisualAssetReadiness(item = null) {
  return textValue(item?.visualAssetReadiness || item?.visual_asset_readiness_matrix || item?.visualAssetReadinessMatrix || item?.assetReadinessMatrix || item?.asset_readiness_matrix || '').trim();
}

export function itemChannelRules(item = null) {
  return String(item?.channelRules || item?.channel_rules || item?.linkPolicy || item?.link_policy || '').trim();
}

export function itemApprovalChecklist(item = null) {
  return String(item?.approvalChecklist || item?.approval_checklist || '').trim();
}

export function statusClass(value = '') {
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

function textValue(value = '') {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return '';
  }
}

function firstText(...values) {
  return values.map(textValue).find((value) => String(value || '').trim()) || '';
}

function firstNonEmptyValue(...values) {
  for (const value of values) {
    if (value == null) continue;
    if (typeof value === 'string' && !value.trim()) continue;
    if (Array.isArray(value) && !value.length) continue;
    if (typeof value === 'object' && !Array.isArray(value) && !Object.keys(value).length) continue;
    return value;
  }
  return undefined;
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
  const aliases = [contractType, camelContractKey(contractType), ...(PUBLISHER_CONTRACT_ALIASES[contractType] || [])];
  return firstNonEmptyValue(...aliases.flatMap((key) => [context[key], raw[key]]));
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

export function publisherContractTypeForProfile(profile = null, type = '') {
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

export function publisherContractArtifactsFromContext(context = {}) {
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

function publisherTopLevelVisualReadiness(context = {}) {
  const raw = context.raw_context && typeof context.raw_context === 'object' ? context.raw_context : {};
  const fields = raw.contract_fields && typeof raw.contract_fields === 'object' ? raw.contract_fields : {};
  return {
    visualAssetReadiness: firstText(
      context.visual_asset_readiness_matrix,
      context.visualAssetReadinessMatrix,
      fields.visual_asset_readiness_matrix,
      fields.visualAssetReadinessMatrix,
      raw.visual_asset_readiness_matrix,
      raw.visualAssetReadinessMatrix,
      raw.asset_readiness_matrix,
      raw.assetReadinessMatrix
    ),
    visualAssetRightsStatus: firstText(
      context.visual_asset_rights_status,
      context.visualAssetRightsStatus,
      fields.visual_asset_rights_status,
      fields.visualAssetRightsStatus,
      raw.visual_asset_rights_status,
      raw.visualAssetRightsStatus,
      raw.asset_rights_status,
      raw.assetRightsStatus
    ),
    visualAssetGap: firstText(
      context.visual_asset_gap,
      context.visualAssetGap,
      fields.visual_asset_gap,
      fields.visualAssetGap,
      raw.visual_asset_gap,
      raw.visualAssetGap,
      raw.asset_gap,
      raw.assetGap
    )
  };
}

export function mergeVisualReadinessIntoItems(importedItems = [], context = {}) {
  const readiness = publisherTopLevelVisualReadiness(context);
  const readinessText = [
    readiness.visualAssetReadiness ? `Readiness matrix: ${readiness.visualAssetReadiness}` : '',
    readiness.visualAssetRightsStatus ? `Rights status: ${readiness.visualAssetRightsStatus}` : '',
    readiness.visualAssetGap ? `Asset gap: ${readiness.visualAssetGap}` : ''
  ].filter(Boolean).join('\n');
  if (!readinessText) return importedItems;
  let applied = false;
  return importedItems.map((item, index) => {
    const isInstagram = item.channel === 'instagram' || item.contractType === 'instagram_post_packet' || /instagram/i.test(`${item.destination || ''} ${item.body || ''}`);
    if (!isInstagram && (applied || index !== 0)) return item;
    applied = true;
    return {
      ...item,
      visualAssetReadiness: itemVisualAssetReadiness(item) || readinessText,
      mediaAssets: itemMediaAssets(item) || readiness.visualAssetReadiness || readiness.visualAssetGap || item.mediaAssets
    };
  });
}

export function itemContractType(item = null) {
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
    artifact.artifact_type,
    artifact.artifactType,
    Array.isArray(artifact.artifact_types) ? artifact.artifact_types.join(' ') : artifact.artifact_types,
    Array.isArray(artifact.artifactTypes) ? artifact.artifactTypes.join(' ') : artifact.artifactTypes,
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
    artifact.artifact_type,
    artifact.artifactType,
    ...(Array.isArray(artifact.artifact_types) ? artifact.artifact_types : [artifact.artifact_types]),
    ...(Array.isArray(artifact.artifactTypes) ? artifact.artifactTypes : [artifact.artifactTypes]),
    artifact.content_type,
    artifact.contentType,
    artifact.type,
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
  return /^(?:delivery file|publisher handoff|unassigned destination|generic publishing packet|(?:publish[_\s-]*)?target[_\s-]*not[_\s-]*specified|unspecified(?:[_\s-].*target)?|tbd(?:[_\s-].*|\s*\([^)]*\))?|to be determined|choose after approval|none|n\/a|\(?not provided\)?|\(?not specified\)?|unknown[-_\s\w]*destination|publisher[-_\s]+approval[-_\s]+studio)$/i.test(String(value || '').trim());
}

function shouldUseProfileDestinationLabel(explicit = '', profile = null) {
  const value = String(explicit || '').trim();
  if (!value || !profile) return false;
  if (/^https?:\/\//i.test(value)) return false;
  if (value.toLowerCase() === String(profile.key || '').toLowerCase()) return true;
  if (value.toLowerCase() === String(profile.label || '').toLowerCase()) return true;
  if (profile.key === 'owned_site') return /(?:publisher|owned[_\s-]*site|primary[_\s-]*site|landing[_\s-]*page|seo[_\s-]*page|site[_\s-]*publish|publish[_\s-]*target|article[_\s-]*draft)/i.test(value);
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

export function slugFromTitle(value = '') {
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

export function itemMarkdown(item = null) {
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
    itemVisualAssetReadiness(item) ? `Visual asset readiness matrix: ${itemVisualAssetReadiness(item)}` : null,
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

export function contextItemFromArtifact(artifact = {}, index = 0) {
  let type = itemType(artifact.type || artifact.action_type || artifact.artifact_type || artifact.artifactType || artifact.content_type || artifact.contentType || artifact.name || '');
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
  const extractedVisualReadiness = markdownFieldValue(body, ['Visual asset readiness matrix', 'Visual asset readiness', 'Asset readiness matrix', 'Media readiness matrix', 'Asset readiness', 'Frame readiness']);
  const extractedChannelRules = markdownFieldValue(body, ['Channel rules', 'Link policy', 'Community rules', 'Caption rules', 'Schedule handoff']);
  const extractedApprovalChecklist = markdownFieldValue(body, ['Approval checklist', 'Approval check', 'Approval check before publishing', 'Pre-publish checklist']);
  const artifactSlug = artifact.slug || artifact.path || artifact.url || artifact.target || '';
  const title = String(extractedTitle || titleWithSlugTail(artifact.title, artifactSlug) || artifact.title || artifact.name || artifactSlug || `Imported item ${index + 1}`).trim();
  const slug = String((extractedTitle ? slugFromTitle(extractedTitle) : '') || artifactSlug || slugFromTitle(title)).trim();
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
    visualAssetReadiness: String(firstText(artifact.visual_asset_readiness_matrix, artifact.visualAssetReadinessMatrix, artifact.visual_asset_readiness, artifact.visualAssetReadiness, artifact.asset_readiness_matrix, artifact.assetReadinessMatrix, artifact.media_readiness_matrix, artifact.mediaReadinessMatrix, artifact.visual_asset_rights_status, artifact.visualAssetRightsStatus, artifact.asset_rights_status, artifact.assetRightsStatus, artifact.visual_asset_gap, artifact.visualAssetGap, artifact.asset_gap, artifact.assetGap, extractedVisualReadiness) || '').trim(),
    channelRules: String(firstText(artifact.channel_rules, artifact.channelRules, artifact.link_policy, artifact.linkPolicy, artifact.community_rules, artifact.communityRules, artifact.caption_rules, artifact.captionRules, extractedChannelRules) || '').trim(),
    approvalChecklist: String(firstText(artifact.approval_checklist, artifact.approvalChecklist, artifact.pre_publish_checklist, artifact.prePublishChecklist, extractedApprovalChecklist) || '').trim(),
    market,
    locale,
    owner: String(firstText(artifact.owner, artifact.assignee, artifact.agent, artifact.source_agent, artifact.lead, 'CAIt') || 'CAIt').trim(),
    title,
    slug,
    meta: String(extractedMeta || artifact.meta || artifact.description || artifact.summary || '').trim(),
    keywords: String(firstText(extractedKeywords, artifact.keywords, artifact.keyword, artifact.meta_keywords, artifact.target_keyword, artifact.targetQuery) || '').trim(),
    h1: String(firstText(extractedH1, artifact.h1, artifact.h_1, artifact.headline) || '').trim(),
    primaryCta: String(firstText(extractedPrimaryCta, artifact.primary_cta, artifact.primaryCta, artifact.cta) || '').trim(),
    secondaryCta: String(firstText(extractedSecondaryCta, artifact.secondary_cta, artifact.secondaryCta) || '').trim(),
    internalLinks: String(firstText(extractedInternalLinks, artifact.internal_links, artifact.internalLinks) || '').trim(),
    ogTitle: String(firstText(extractedOgTitle, artifact.og_title, artifact.ogTitle) || '').trim(),
    ogDescription: String(firstText(extractedOgDescription, artifact.og_description, artifact.ogDescription) || '').trim(),
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

export function contextItemFromDeliveryItem(item = {}, index = 0) {
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
    visual_asset_readiness_matrix: metadata.visual_asset_readiness_matrix || metadata.visualAssetReadinessMatrix || metadata.visual_asset_readiness || metadata.asset_readiness_matrix || metadata.assetReadinessMatrix || metadata.visual_asset_gap || '',
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

export function contextItemFromPublisherItem(item = {}, index = 0) {
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
    visual_asset_readiness_matrix: payload.visual_asset_readiness_matrix || payload.visualAssetReadinessMatrix || payload.visual_asset_readiness || payload.asset_readiness_matrix || payload.assetReadinessMatrix || payload.visual_asset_gap || '',
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

export function inboundItemSelectionScore(item = {}) {
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
