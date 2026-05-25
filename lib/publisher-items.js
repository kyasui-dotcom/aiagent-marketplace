function safeText(value = '', max = 500) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function safeBlock(value = '', max = 120000) {
  return String(value ?? '').trim().slice(0, max);
}

function compactObject(value, depth = 0) {
  if (depth > 5) return null;
  if (value == null) return value;
  if (typeof value !== 'object') {
    if (typeof value === 'string') return value.slice(0, 120000);
    return value;
  }
  if (Array.isArray(value)) return value.slice(0, 50).map((item) => compactObject(item, depth + 1));
  const output = {};
  for (const [key, item] of Object.entries(value).slice(0, 80)) {
    const next = compactObject(item, depth + 1);
    if (next !== undefined && next !== null && next !== '') output[safeText(key, 100)] = next;
  }
  return output;
}

function stableHash(value = '') {
  let hash = 2166136261;
  const text = String(value || '');
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function listObjects(value) {
  return Array.isArray(value) ? value.filter((item) => item && typeof item === 'object') : [];
}

function listValues(value) {
  if (Array.isArray(value)) return value.map((item) => String(item || '').trim()).filter(Boolean);
  if (value == null) return [];
  return String(value).split(/[,\s]+/).map((item) => item.trim()).filter(Boolean);
}

function firstText(...values) {
  for (const value of values) {
    const text = safeText(value, 1000);
    if (text) return text;
  }
  return '';
}

function explicitArtifactTypes(artifact = {}) {
  return [
    artifact.content_type,
    artifact.contentType,
    artifact.artifact_type,
    artifact.artifactType,
    artifact.contract_type,
    artifact.contractType,
    artifact.item_type,
    artifact.itemType,
    artifact.action_type,
    artifact.actionType,
    artifact.type,
    ...listValues(artifact.artifact_types || artifact.artifactTypes)
  ].map((item) => String(item || '').trim().toLowerCase()).filter(Boolean);
}

function isPublisherArtifactType(value = '') {
  const item = String(value || '').trim().toLowerCase();
  if (!item || /^(?:file|delivery_file|delivery_summary|action|approval_request)$/.test(item)) return false;
  return /^(?:site_publish_packet|landing_page_change|landing_page|article_draft|seo_article|seo_page_artifact|wordpress_draft|directory_submission|community_post_packet|social_post|x_post|x_post_packet|reddit_post|indie_hackers_post|instagram_post|instagram_post_packet|email_draft|publish_asset|publisher_handoff)$/.test(item)
    || /^(?:publisher|site_publish|wordpress|directory|x_post|reddit_post|indie_hackers|instagram_post|social_copy|email_draft)(?:[_-].*)?$/.test(item);
}

function hasPublisherDestinationMetadata(artifact = {}) {
  const surface = firstText(artifact.surface, artifact.target_surface, artifact.targetSurface).toLowerCase();
  if (surface === 'publisher' || surface === 'publisher_approval_studio') return true;
  return Boolean(firstText(
    artifact.channel,
    artifact.channel_key,
    artifact.channelKey,
    artifact.destination,
    artifact.connector,
    artifact.connector_capability,
    artifact.connectorCapability,
    artifact.publish_method,
    artifact.publishMethod
  ));
}

function artifactHasPublisherIntent(artifact = {}) {
  const types = explicitArtifactTypes(artifact);
  return types.some(isPublisherArtifactType) && hasPublisherDestinationMetadata(artifact);
}

function sourceArtifacts(context = {}) {
  const artifacts = listObjects(context.artifacts);
  const approvals = listObjects(context.approval_requests).map((item) => ({
    ...item,
    type: item.type || item.action_type || 'approval_request',
    body: item.body || item.description || context.summary || ''
  }));
  const files = listObjects(context.delivery_files).map((item) => ({
    ...item,
    type: item.type || 'delivery_file',
    title: item.title || item.name || 'Delivery file',
    body: item.content || item.body || ''
  }));
  return [...artifacts, ...approvals, ...files]
    .filter((item) => artifactHasPublisherIntent(item))
    .filter((item) => firstText(item.title, item.name, item.body, item.content, item.summary));
}

function inferredChannel(artifact = {}, fallback = '') {
  const text = firstText(
    artifact.channel_key,
    artifact.channelKey,
    artifact.medium_key,
    artifact.mediumKey,
    artifact.media_key,
    artifact.mediaKey,
    artifact.channel,
    artifact.medium,
    artifact.platform,
    artifact.connector,
    fallback
  ).toLowerCase();
  if (/wordpress|\bwp\b/.test(text)) return 'wordpress_site';
  if (/github|pull request|\bpr\b/.test(text)) return 'github_pr';
  if (/\bx\b|twitter|tweet/.test(text)) return 'x';
  if (/reddit/.test(text)) return 'reddit';
  if (/indie/.test(text)) return 'indie_hackers';
  if (/instagram|\binsta\b|\big\b/.test(text)) return 'instagram';
  if (/directory|listing|submission/.test(text)) return 'directory';
  if (/email|gmail|newsletter/.test(text)) return 'email';
  if (/social|sns|post/.test(text)) return 'social';
  if (/seo|article|landing|page|publisher|owned/.test(text)) return 'owned_site';
  return fallback || 'generic';
}

function validationForPublisherItem(item = {}) {
  const checks = [];
  const channel = safeText(item.channel || 'generic', 80);
  const push = (key, ok, severity, message) => checks.push({ key, ok: Boolean(ok), severity, message });
  push('destination', item.destination && item.channel, 'error', item.destination && item.channel ? 'Destination and channel are set.' : 'Destination and channel are required.');
  push('title', item.title, 'error', item.title ? 'Title is set.' : 'Title is required.');
  push('body', item.body, 'error', item.body ? 'Body is set.' : 'Body is required.');
  if (['owned_site', 'github_pr', 'wordpress_site'].includes(channel)) {
    push('slug_h1', item.payload?.slug && item.payload?.h1, 'warn', item.payload?.slug && item.payload?.h1 ? 'Path and H1 are set.' : 'Path and H1 should be set for site publishing.');
    push('seo_meta', item.payload?.meta || item.payload?.meta_description, 'warn', item.payload?.meta || item.payload?.meta_description ? 'SEO metadata is set.' : 'Meta description should be set.');
  }
  if (channel === 'x') {
    push('x_length', safeBlock(item.body).length > 0 && safeBlock(item.body).length <= 280, 'error', safeBlock(item.body).length <= 280 ? 'X post length is executable.' : 'X post is longer than 280 characters.');
  }
  if (channel === 'instagram') {
    push('instagram_profile', item.payload?.profile_handle || item.payload?.profile_url || item.payload?.account_handle || item.payload?.account_url, 'warn', item.payload?.profile_handle || item.payload?.profile_url || item.payload?.account_handle || item.payload?.account_url ? 'Instagram profile/account is attached.' : 'Instagram profile/account should be attached.');
    push('instagram_media', item.payload?.media_assets || item.payload?.asset_requirements || item.payload?.visual_assets, 'warn', item.payload?.media_assets || item.payload?.asset_requirements || item.payload?.visual_assets ? 'Instagram media assets are attached.' : 'Instagram media assets or blockers should be attached.');
    push('instagram_approval', item.payload?.approval_checklist || item.payload?.pre_publish_checklist, 'warn', item.payload?.approval_checklist || item.payload?.pre_publish_checklist ? 'Instagram approval checklist is attached.' : 'Instagram approval checklist should be attached.');
  }
  const failedErrors = checks.filter((check) => !check.ok && check.severity === 'error').length;
  const failedWarnings = checks.filter((check) => !check.ok && check.severity !== 'error').length;
  return {
    status: failedErrors ? 'blocked' : (failedWarnings ? 'needs_review' : 'ready'),
    checks
  };
}

export function publisherRecordsFromContext(context = {}, options = {}) {
  const ownerLogin = safeText(options.ownerLogin || '', 240).toLowerCase();
  const appContextId = safeText(options.appContextId || context.id || '', 180);
  const now = options.nowIso || new Date().toISOString();
  const rawContext = context.raw_context && typeof context.raw_context === 'object' ? context.raw_context : {};
  const override = rawContext.publisher_manual_media_override && typeof rawContext.publisher_manual_media_override === 'object'
    ? rawContext.publisher_manual_media_override
    : {};
  const selectedId = safeText(rawContext.selected_publisher_item_id || override.selected_publisher_item_id || '', 220);
  const artifacts = sourceArtifacts(context);
  const candidates = artifacts;
  const items = candidates.slice(0, 50).map((artifact, index) => {
    const channel = safeText(override.channel || inferredChannel(artifact, 'owned_site'), 80);
    const payload = compactObject({
      ...artifact,
      app_context_id: appContextId,
      selected_medium: compactObject(override)
    }) || {};
    const body = safeBlock(firstText(artifact.body, artifact.content, artifact.text, artifact.markdown, artifact.description, artifact.summary, context.summary), 120000);
    const title = firstText(artifact.title, artifact.name, artifact.h1, context.title, `Publisher item ${index + 1}`);
    const destination = firstText(override.destination, artifact.destination, artifact.publication, artifact.publisher, artifact.target, channel);
    const itemKey = selectedId || safeText(artifact.id || artifact.source_delivery_item_id || artifact.source_job_id || '', 240) || `${channel}:${title}:${index}`;
    const item = {
      id: `pub_${stableHash(`${ownerLogin}:${itemKey}`)}`,
      ownerLogin,
      appContextId,
      sourceApp: safeText(context.source_app || 'publisher_approval_studio', 120),
      sourceItemId: safeText(artifact.id || selectedId || '', 240),
      channel,
      destination,
      connector: safeText(override.connector || artifact.connector || artifact.required_connector || '', 120),
      connectorCapability: safeText(override.connector_capability || artifact.connector_capability || artifact.connectorCapability || '', 160),
      itemType: safeText(artifact.item_type || artifact.itemType || artifact.type || 'publish_asset', 100),
      contractType: safeText(artifact.contract_type || artifact.contractType || artifact.artifact_type || artifact.type || rawContext.selected_publisher_contract_type || 'site_publish_packet', 120),
      status: safeText(artifact.status || 'needs_review', 80).replace(/_/g, ' '),
      title,
      summary: safeText(artifact.summary || context.summary || body, 1000),
      body,
      payload,
      selectedMedium: compactObject(override) || {},
      shape: compactObject(options.shape || rawContext.publisher_context_shape_status || {}) || {},
      createdAt: now,
      updatedAt: now
    };
    const validation = validationForPublisherItem(item);
    return {
      ...item,
      validationStatus: validation.status,
      validation
    };
  });
  return { items };
}

export function publicPublisherItem(item = {}, options = {}) {
  const includePayload = options.includePayload !== false;
  return {
    id: item.id,
    ownerLogin: item.ownerLogin || '',
    appContextId: item.appContextId || '',
    sourceApp: item.sourceApp || '',
    sourceItemId: item.sourceItemId || '',
    channel: item.channel || 'generic',
    destination: item.destination || '',
    connector: item.connector || '',
    connectorCapability: item.connectorCapability || '',
    itemType: item.itemType || 'publish_asset',
    contractType: item.contractType || '',
    status: item.status || 'needs_review',
    title: item.title || 'Publisher item',
    summary: item.summary || '',
    body: item.body || '',
    validationStatus: item.validationStatus || 'needs_review',
    validation: item.validation || { status: item.validationStatus || 'needs_review', checks: [] },
    selectedMedium: item.selectedMedium || {},
    version: Number(item.version || 1),
    createdAt: item.createdAt || '',
    updatedAt: item.updatedAt || '',
    ...(includePayload ? { payload: item.payload || {}, shape: item.shape || {}, versions: Array.isArray(item.versions) ? item.versions : [] } : {})
  };
}
