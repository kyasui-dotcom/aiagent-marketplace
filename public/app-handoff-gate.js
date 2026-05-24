function asSet(values = [], normalize = (value) => String(value || '')) {
  return new Set((Array.isArray(values) ? values : [])
    .map(normalize)
    .filter(Boolean));
}

const GENERIC_NON_HANDOFF_TYPES = new Set([
  '',
  'html',
  'json',
  'plain',
  'text',
  'text-html',
  'text_html',
  'markdown',
  'text-markdown',
  'text_markdown',
  'text-md',
  'text_md',
  'text-plain',
  'text_plain',
  'application-json',
  'application_json',
  'application-octet-stream',
  'application_octet_stream',
  'agent-delivery',
  'agent_delivery',
  'reused-agent-delivery',
  'reused_agent_delivery',
  'other'
]);

function isGenericNonHandoffType(normalized = '') {
  const value = String(normalized || '').trim();
  if (!value || GENERIC_NON_HANDOFF_TYPES.has(value)) return true;
  return /^(?:text_plain|text_markdown|text_md|text_html|application_json|application_octet_stream)(?:_|$)/.test(value);
}

const EXPLICIT_HANDOFF_TYPE_ALIASES = {
  analytics_context: ['metrics'],
  ga4_packet: ['metrics', 'channel_breakdown'],
  search_console_packet: ['search_queries', 'landing_pages'],
  crm_packet: ['lead_rows', 'evidence_urls'],
  lead_row: ['lead_rows'],
  email_draft: ['email_drafts'],
  email_send: ['email_drafts', 'approval_request'],
  google_send_gmail: ['email_drafts', 'approval_request'],
  social_post: ['social_copy_packet', 'social_post_pack'],
  social_post_pack: ['social_copy_packet', 'x_post_packet'],
  x_post: ['post_text', 'x_post_packet'],
  x_post_draft: ['post_text', 'x_post_packet'],
  x_post_approval: ['post_text', 'x_post_packet', 'approval_request'],
  x_connector_handoff: ['post_text', 'x_post_packet', 'approval_request'],
  x_connector_handoff_packet: ['post_text', 'x_post_packet', 'approval_request'],
  twitter_post: ['post_text', 'x_post_packet'],
  twitter_post_approval: ['post_text', 'x_post_packet', 'approval_request'],
  reddit_post: ['reddit_post_packet'],
  indie_hackers_post: ['indie_hackers_packet'],
  instagram_post: ['instagram_post_packet'],
  directory_submission: ['directory_packet'],
  directory_submit: ['directory_packet', 'approval_request'],
  wordpress_draft: ['wordpress_draft_packet'],
  wordpress_create_draft: ['wordpress_draft_packet', 'approval_request'],
  github_write_pr: ['site_publish_packet', 'approval_request'],
  article_publish: ['site_publish_packet', 'approval_request'],
  approval: ['approval_request']
};

const DEFAULT_HANDOFF_ARTIFACT_CAPABILITY_ALIASES = Object.freeze({
  metrics: Object.freeze(['analytics_context', 'ga4_packet']),
  search_queries: Object.freeze(['search_console_packet', 'analytics_context']),
  landing_pages: Object.freeze(['analytics_context']),
  conversion_paths: Object.freeze(['analytics_context']),
  channel_breakdown: Object.freeze(['analytics_context']),
  article_draft: Object.freeze(['content_management']),
  seo_page_artifact: Object.freeze(['content_management', 'publisher_change_set', 'site_publish_packet']),
  landing_page_change: Object.freeze(['content_management', 'publisher_change_set', 'site_publish_packet']),
  site_publish_packet: Object.freeze(['content_management', 'publisher_change_set']),
  wordpress_draft_packet: Object.freeze(['content_management', 'publisher_change_set', 'site_publish_packet']),
  directory_packet: Object.freeze(['directory_submission_packet', 'content_management']),
  community_post_packet: Object.freeze(['community_post_packet', 'social_copy_packet', 'content_management']),
  social_copy_packet: Object.freeze(['social_copy_packet', 'community_post_packet', 'content_management']),
  social_post_pack: Object.freeze(['social_copy_packet', 'community_post_packet', 'x_post_draft', 'x_post_queue', 'social_action']),
  x_post_packet: Object.freeze(['x_post_draft', 'x_post_queue', 'social_action', 'social_copy_packet']),
  approval_request: Object.freeze(['approval_queue']),
  lead_rows: Object.freeze(['lead_management', 'crm_packet']),
  evidence_urls: Object.freeze(['lead_management', 'crm_packet']),
  email_drafts: Object.freeze(['email_draft', 'outreach_review']),
  next_actions: Object.freeze(['lead_management', 'outreach_review']),
  post_text: Object.freeze(['x_post_draft', 'social_action']),
  strategy: Object.freeze(['x_post_queue', 'social_action']),
  delivery_summary: Object.freeze(['x_post_queue', 'social_action'])
});

const DEFAULT_HANDOFF_ARTIFACT_LABELS = Object.freeze({
  metrics: 'Analytics metrics',
  search_queries: 'Search query data',
  landing_pages: 'Landing page data',
  conversion_paths: 'Conversion path data',
  channel_breakdown: 'Channel breakdown',
  article_draft: 'Article draft',
  seo_page_artifact: 'SEO page artifact',
  landing_page_change: 'Landing page change',
  site_publish_packet: 'Site publish packet',
  wordpress_draft_packet: 'WordPress draft packet',
  directory_packet: 'Directory submission packet',
  community_post_packet: 'Community post packet',
  social_copy_packet: 'Social copy packet',
  social_post_pack: 'Social post pack',
  x_post_packet: 'X post packet',
  approval_request: 'Approval request',
  lead_rows: 'Lead rows',
  evidence_urls: 'Evidence URLs',
  email_drafts: 'Email drafts',
  next_actions: 'Next actions',
  post_text: 'Post text',
  strategy: 'Strategy context',
  delivery_summary: 'Delivery summary'
});

const DEFAULT_HANDOFF_ARTIFACT_DESTINATION_HINTS = Object.freeze({
  article_draft: Object.freeze(['owned_site', 'wordpress_site']),
  seo_page_artifact: Object.freeze(['owned_site', 'wordpress_site']),
  landing_page_change: Object.freeze(['owned_site', 'wordpress_site']),
  site_publish_packet: Object.freeze(['owned_site', 'wordpress_site']),
  wordpress_draft_packet: Object.freeze(['wordpress_site']),
  directory_packet: Object.freeze(['directory']),
  community_post_packet: Object.freeze(['x', 'reddit', 'indie_hackers']),
  social_copy_packet: Object.freeze(['x', 'reddit', 'indie_hackers']),
  social_post_pack: Object.freeze(['x']),
  x_post_packet: Object.freeze(['x']),
  approval_request: Object.freeze(['owned_site', 'wordpress_site', 'directory', 'x', 'reddit', 'indie_hackers'])
});

const SOCIAL_POST_TEXT_ARTIFACT_TYPES = Object.freeze([
  'post_text',
  'x_post',
  'x_post_packet',
  'social_post',
  'social_post_pack',
  'social_copy_packet'
]);

function defaultNormalizeUsageId(value = '') {
  return String(value || '').trim().toLowerCase().replace(/[\s./:]+/g, '_').replace(/[^a-z0-9_-]+/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
}

function addExplicitHandoffArtifactType(types, value = '', options = {}) {
  const normalizeUsageId = options.normalizeUsageId || defaultNormalizeUsageId;
  const normalized = normalizeUsageId(value);
  if (isGenericNonHandoffType(normalized)) return;
  types.add(normalized);
  const aliasKey = normalized.replace(/[.-]/g, '_');
  for (const alias of EXPLICIT_HANDOFF_TYPE_ALIASES[aliasKey] || EXPLICIT_HANDOFF_TYPE_ALIASES[normalized] || []) {
    const normalizedAlias = normalizeUsageId(alias);
    if (!isGenericNonHandoffType(normalizedAlias)) types.add(normalizedAlias);
  }
}

export function explicitHandoffArtifactTypesFromFile(file = {}, options = {}) {
  const listValues = options.listValues || ((value) => Array.isArray(value) ? value : []);
  const types = new Set();
  for (const field of [
    file?.artifact_type,
    file?.artifactType,
    file?.delivery_artifact_type,
    file?.deliveryArtifactType,
    file?.handoff_artifact_type,
    file?.handoffArtifactType,
    file?.handoff_type,
    file?.handoffType,
    file?.packet_type,
    file?.packetType,
    file?.content_type,
    file?.contentType,
    file?.type,
    file?.kind,
    file?.action_kind,
    file?.actionKind,
    file?.action_type,
    file?.actionType
  ]) addExplicitHandoffArtifactType(types, field, options);
  for (const list of [
    file?.artifact_types,
    file?.artifactTypes,
    file?.delivery_artifact_types,
    file?.deliveryArtifactTypes,
    file?.handoff_artifact_types,
    file?.handoffArtifactTypes,
    file?.capabilities,
    file?.accepted_by_apps,
    file?.acceptedByApps
  ]) {
    for (const item of listValues(list)) addExplicitHandoffArtifactType(types, item, options);
  }
  return types;
}

export function explicitHandoffArtifactTypesFromAuthorityRequest(request = null, options = {}) {
  const listValues = options.listValues || ((value) => Array.isArray(value) ? value : []);
  const normalizeUsageId = options.normalizeUsageId || defaultNormalizeUsageId;
  const types = new Set();
  if (!request || typeof request !== 'object') return types;

  for (const list of [
    request.action_kinds,
    request.actionKinds,
    request.action_kind,
    request.actionKind,
    request.handoff_artifact_types,
    request.handoffArtifactTypes,
    request.handoff_artifact_type,
    request.handoffArtifactType,
    request.artifact_types,
    request.artifactTypes,
    request.artifact_type,
    request.artifactType,
    request.packet_type,
    request.packetType
  ]) {
    for (const item of listValues(list)) addExplicitHandoffArtifactType(types, item, options);
  }

  const missingConnectors = listValues(request.missing_connectors || request.missingConnectors || request.connectors)
    .map(normalizeUsageId)
    .filter(Boolean);
  const missingCapabilities = listValues(request.missing_connector_capabilities || request.missingConnectorCapabilities || request.capabilities)
    .map(normalizeUsageId)
    .filter(Boolean);
  const channels = listValues(request.channel_candidates || request.channelCandidates || request.channels)
    .map(normalizeUsageId)
    .filter(Boolean);
  const googleSources = listValues(request.required_google_sources || request.requiredGoogleSources || request.google_source_types || request.googleSourceTypes)
    .map(normalizeUsageId)
    .filter(Boolean);
  const signals = [...missingConnectors, ...missingCapabilities, ...channels];
  const hasXSignal = signals.some((item) => /^(x|twitter|tweet|x[._-]post|x[._-]write|twitter[._-]post|social[._-]post)$/.test(item));
  const hasNonXConnector = missingConnectors.some((item) => !/^(x|twitter)$/.test(item));
  const hasNonXCapability = missingCapabilities.some((item) => !/^(x[._-]post|x[._-]write|twitter[._-]post|social[._-]post)$/.test(item));
  const hasNonXChannel = channels.some((item) => !/^(x|twitter|tweet)$/.test(item));
  if (hasXSignal && !googleSources.length && !hasNonXConnector && !hasNonXCapability && !hasNonXChannel) {
    addExplicitHandoffArtifactType(types, 'x_post_approval', options);
  }

  return types;
}

export function appHandoffArtifactLabel(artifactType = '', options = {}) {
  const normalizeUsageId = options.normalizeUsageId || ((value) => String(value || '').trim());
  const normalized = normalizeUsageId(artifactType);
  const labels = options.labels || DEFAULT_HANDOFF_ARTIFACT_LABELS;
  return labels?.[normalized] || normalized.replace(/_/g, ' ');
}

export function appHandoffArtifactAliases(artifactType = '', options = {}) {
  const normalizeUsageId = options.normalizeUsageId || ((value) => String(value || '').trim());
  const normalized = normalizeUsageId(artifactType);
  const aliases = options.aliases || DEFAULT_HANDOFF_ARTIFACT_CAPABILITY_ALIASES;
  return (aliases?.[normalized] || [])
    .map(normalizeUsageId)
    .filter((alias, index, array) => alias && array.indexOf(alias) === index);
}

export function appHandoffEntryMatchesArtifact(entry = {}, artifactType = '', options = {}) {
  const normalizeUsageId = options.normalizeUsageId || ((value) => String(value || '').trim());
  const listValues = options.listValues || ((value) => Array.isArray(value) ? value : []);
  const normalizedType = normalizeUsageId(artifactType);
  if (!normalizedType) return false;
  const accepts = asSet(listValues(entry.inputContract?.accepts), normalizeUsageId);
  const capabilities = asSet(listValues(entry.capabilities), normalizeUsageId);
  if (accepts.has(normalizedType) || capabilities.has(normalizedType)) return true;
  return appHandoffArtifactAliases(normalizedType, options)
    .some((alias) => accepts.has(alias) || capabilities.has(alias));
}

export function appHandoffConnectorNotes(entry = {}, artifactType = '', options = {}) {
  const normalizeUsageId = options.normalizeUsageId || ((value) => String(value || '').trim());
  const listValues = options.listValues || ((value) => Array.isArray(value) ? value : []);
  const normalizedType = normalizeUsageId(artifactType);
  const destinationConnectors = entry.inputContract?.destinationConnectors && typeof entry.inputContract.destinationConnectors === 'object'
    ? entry.inputContract.destinationConnectors
    : null;
  if (destinationConnectors) {
    const destinationHints = options.destinationHints || DEFAULT_HANDOFF_ARTIFACT_DESTINATION_HINTS;
    const keys = (destinationHints?.[normalizedType] || Object.keys(destinationConnectors))
      .filter((key, index, array) => key && array.indexOf(key) === index);
    return keys
      .map((key) => {
        const destination = destinationConnectors[key];
        if (!destination || typeof destination !== 'object') return '';
        const connector = String(destination.connector || '').trim();
        const capability = String(destination.capability || '').trim();
        const method = String(destination.method || '').trim();
        const detail = [connector, capability, method].filter(Boolean).join(' / ');
        return detail ? `${key.replace(/_/g, ' ')}: ${detail}` : '';
      })
      .filter(Boolean)
      .slice(0, 3);
  }

  const accepts = asSet(listValues(entry.inputContract?.accepts), normalizeUsageId);
  const capabilities = asSet(listValues(entry.capabilities), normalizeUsageId);
  const matchedCapabilities = [
    normalizedType,
    ...appHandoffArtifactAliases(normalizedType, options)
  ].filter((item, index, array) => item && array.indexOf(item) === index)
    .filter((item) => capabilities.has(item) || accepts.has(item))
    .slice(0, 3);
  if (matchedCapabilities.length) return [`capability: ${matchedCapabilities.join(' / ')}`];

  const requiredConnectors = listValues(entry.requiredConnectors).map(String).filter(Boolean).slice(0, 3);
  if (requiredConnectors.length) return [`connector: ${requiredConnectors.join(' / ')}`];
  return [];
}

export function renderAppHandoffTree(job = {}, entries = [], options = {}) {
  const escapeHtml = options.escapeHtml || ((value) => String(value || ''));
  const artifactTypes = Array.from(options.deliveryHandoffArtifactTypes?.(job) || []);
  const branches = artifactTypes
    .map((artifactType) => {
      const apps = entries
        .filter((entry) => appHandoffEntryMatchesArtifact(entry, artifactType, options))
        .map((entry) => ({
          name: entry.name || entry.id || 'Registered app',
          notes: appHandoffConnectorNotes(entry, artifactType, options)
        }));
      return apps.length ? { artifactType, apps } : null;
    })
    .filter(Boolean);
  if (!branches.length) return '';

  const branchHtml = branches.map((branch) => {
    const appHtml = branch.apps.map((app) => {
      const notes = app.notes.map((note) => `<span class="app-tree-connector">${escapeHtml(note)}</span>`).join('');
      return `<li><span class="app-tree-app">${escapeHtml(app.name)}</span>${notes}</li>`;
    }).join('');
    return [
      '<li>',
      `<span class="app-tree-artifact">${escapeHtml(appHandoffArtifactLabel(branch.artifactType, options))}</span>`,
      `<ul>${appHtml}</ul>`,
      '</li>'
    ].join('');
  }).join('');

  return [
    '<div class="app-handoff-tree" aria-label="Preparation data app routing tree">',
    '<strong>Preparation data routing</strong>',
    '<div class="chat-hint">This shows which preparation artifact type will be sent to each matching app. Final publish/send actions still happen inside the app or connector.</div>',
    `<ul>${branchHtml}</ul>`,
    '</div>'
  ].join('\n');
}

export function appHandoffRelevanceScore(entry = {}, artifactTypes = [], options = {}) {
  const normalizeUsageId = options.normalizeUsageId || ((value) => String(value || '').trim());
  const listValues = options.listValues || ((value) => Array.isArray(value) ? value : []);
  const accepts = asSet(listValues(entry.inputContract?.accepts), normalizeUsageId);
  const capabilities = asSet(listValues(entry.capabilities), normalizeUsageId);
  const score = { value: 0, reasons: [] };
  const add = (value, reason) => {
    if (!value) return;
    score.value += value;
    if (reason && !score.reasons.includes(reason)) score.reasons.push(reason);
  };

  for (const artifactType of artifactTypes) {
    const normalizedType = normalizeUsageId(artifactType);
    if (!normalizedType) continue;
    if (accepts.has(normalizedType)) add(70, `accepts ${normalizedType}`);
    if (capabilities.has(normalizedType)) add(44, `capability ${normalizedType}`);
    for (const normalizedAlias of appHandoffArtifactAliases(normalizedType, options)) {
      if (accepts.has(normalizedAlias)) add(56, `accepts ${normalizedAlias}`);
      if (capabilities.has(normalizedAlias)) add(32, `capability ${normalizedAlias}`);
    }
  }

  return score;
}

export function appHandoffSpecificityScore(entry = {}, artifactTypes = [], options = {}) {
  const normalizeUsageId = options.normalizeUsageId || ((value) => String(value || '').trim());
  const listValues = options.listValues || ((value) => Array.isArray(value) ? value : []);
  const accepts = asSet(listValues(entry.inputContract?.accepts), normalizeUsageId);
  const capabilities = asSet(listValues(entry.capabilities), normalizeUsageId);
  let directMatches = 0;
  let aliasMatches = 0;

  for (const artifactType of artifactTypes) {
    const normalizedType = normalizeUsageId(artifactType);
    if (!normalizedType) continue;
    if (accepts.has(normalizedType)) directMatches += 1;
    if (capabilities.has(normalizedType)) directMatches += 1;
    for (const normalizedAlias of appHandoffArtifactAliases(normalizedType, options)) {
      if (accepts.has(normalizedAlias)) aliasMatches += 1;
      if (capabilities.has(normalizedAlias)) aliasMatches += 1;
    }
  }

  const contractSize = accepts.size + capabilities.size;
  const narrowContractBonus = Math.max(0, 18 - Math.min(18, contractSize));
  const externalAppBonus = options.isCaitManagedSurface?.(entry) ? 0 : 12;
  const handoffEndpointBonus = entry.handoff?.createUrl ? 4 : 0;
  const broadContractPenalty = Math.max(0, contractSize - 4) * 12;
  return (directMatches * 40) + (aliasMatches * 18) + narrowContractBonus + externalAppBonus + handoffEndpointBonus - broadContractPenalty;
}

export function appHandoffRankEntries(entries = [], job = {}, options = {}) {
  const normalizeUsageId = options.normalizeUsageId || ((value) => String(value || '').trim());
  const artifactTypes = Array.from(options.deliveryHandoffArtifactTypes?.(job) || [])
    .map(normalizeUsageId)
    .filter((item, index, array) => item && array.indexOf(item) === index);
  if (!artifactTypes.length) return [];

  const threshold = Number(options.minimumRelevanceScore ?? 50);
  const maxCandidates = Math.max(1, Math.min(10, Number(options.maxCandidates || 3) || 3));
  return (Array.isArray(entries) ? entries : [])
    .map((entry) => {
      const relevance = appHandoffRelevanceScore(entry, artifactTypes, options);
      return {
        ...entry,
        handoffRelevanceScore: relevance.value,
        handoffSpecificityScore: appHandoffSpecificityScore(entry, artifactTypes, options),
        handoffReason: relevance.reasons.slice(0, 2).join(' / ')
      };
    })
    .filter((entry) => {
      if (!entry?.id || (!entry.entryUrl && !entry.baseUrl && !entry.handoff?.createUrl)) return false;
      if (String(entry.status || '').toLowerCase() === 'deprecated') return false;
      if (Number(entry.handoffRelevanceScore || 0) < threshold) return false;
      return true;
    })
    .sort((left, right) => (
      Number(right.handoffSpecificityScore || 0) - Number(left.handoffSpecificityScore || 0)
      || Number(right.handoffRelevanceScore || 0) - Number(left.handoffRelevanceScore || 0)
      || String(left.name || left.id || '').localeCompare(String(right.name || right.id || ''))
    ))
    .slice(0, maxCandidates);
}

export function appHandoffDedicatedDeliveryConfig(entry = {}) {
  const handoff = entry?.handoff && typeof entry.handoff === 'object' ? entry.handoff : {};
  const config = entry?.dedicatedDelivery
    || entry?.dedicated_delivery
    || handoff.dedicatedDelivery
    || handoff.dedicated_delivery
    || null;
  return config && typeof config === 'object' ? config : {};
}

export function appHandoffDedicatedDeliveryArtifactTypes(entry = {}, options = {}) {
  const normalizeUsageId = options.normalizeUsageId || defaultNormalizeUsageId;
  const listValues = options.listValues || ((value) => Array.isArray(value) ? value : []);
  const config = appHandoffDedicatedDeliveryConfig(entry);
  return listValues(config.artifactTypes || config.artifact_types || config.accepts || [])
    .map(normalizeUsageId)
    .filter((item, index, array) => item && array.indexOf(item) === index);
}

export function appHandoffDedicatedTextSourceKind(entry = {}, options = {}) {
  const normalizeUsageId = options.normalizeUsageId || defaultNormalizeUsageId;
  const config = appHandoffDedicatedDeliveryConfig(entry);
  const declared = normalizeUsageId(config.preparedTextSource || config.prepared_text_source || config.textSource || config.text_source || '');
  if (declared) return declared;
  const artifactTypes = appHandoffDedicatedDeliveryArtifactTypes(entry, options);
  if (artifactTypes.some((type) => SOCIAL_POST_TEXT_ARTIFACT_TYPES.includes(type))) return 'social_post_text';
  return 'delivery_text';
}

export function appHandoffHasDedicatedDelivery(entry = {}, job = {}, options = {}) {
  const normalizeUsageId = options.normalizeUsageId || defaultNormalizeUsageId;
  const config = appHandoffDedicatedDeliveryConfig(entry);
  const artifactTypes = appHandoffDedicatedDeliveryArtifactTypes(entry, options);
  if (!artifactTypes.length) return false;
  if (config.requiresPreparedText === true || config.requires_prepared_text === true) {
    const text = String(options.preparedTextForDedicatedDelivery?.(entry, job, config) || '').trim();
    if (!text) return false;
  }
  const availableTypes = options.deliveryHandoffArtifactTypes?.(job) || new Set();
  return artifactTypes
    .map(normalizeUsageId)
    .filter(Boolean)
    .some((type) => availableTypes.has(type));
}

export function appHandoffSuppressesGenericCard(entry = {}, job = {}, options = {}) {
  if (!appHandoffHasDedicatedDelivery(entry, job, options)) return false;
  const config = appHandoffDedicatedDeliveryConfig(entry);
  return config.suppressGenericCard !== false && config.suppress_generic_card !== false;
}

export function genericSuppressedAppHandoffIds(entries = [], job = {}, options = {}) {
  const normalizeUsageId = options.normalizeUsageId || defaultNormalizeUsageId;
  const ids = new Set();
  for (const entry of Array.isArray(entries) ? entries : []) {
    if (appHandoffSuppressesGenericCard(entry, job, options)) ids.add(normalizeUsageId(entry.id || ''));
  }
  return ids;
}
