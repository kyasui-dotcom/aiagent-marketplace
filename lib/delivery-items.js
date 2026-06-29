const MAX_BODY_CHARS = 120000;
const MAX_SUMMARY_CHARS = 2000;

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
  return safeText(value, 180).toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'item';
}

function stableHash(value = '') {
  let hash = 2166136261;
  const text = String(value || '');
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function compactObject(value, depth = 0) {
  if (value == null) return value;
  if (depth > 5) return safeText(JSON.stringify(value), 1200);
  if (Array.isArray(value)) return value.slice(0, 50).map((item) => compactObject(item, depth + 1));
  if (typeof value !== 'object') return typeof value === 'string' ? safeText(value, 6000) : value;
  const output = {};
  for (const [key, item] of Object.entries(value)) {
    if (/token|secret|password|private[_-]?key|api[_-]?key|bearer/i.test(key)) {
      output[key] = item ? '[redacted]' : item;
      continue;
    }
    output[safeText(key, 100)] = compactObject(item, depth + 1);
  }
  return output;
}

function compactSourceRaw(value = {}) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return compactObject(value);
  const output = {};
  for (const [key, item] of Object.entries(value)) {
    if (/^(body|content|text|markdown|prompt|full_prompt|fullPrompt)$/i.test(key)) continue;
    output[key] = item;
  }
  return compactObject(output);
}

function markdownHeading(content = '') {
  const text = String(content || '');
  const heading = text.match(/^\s*#\s+(.+)$/m);
  if (heading?.[1]) return safeText(heading[1], 240);
  const title = text.match(/^\s*(?:title|headline|件名|タイトル|h1候補)\s*[:：]\s*(.+)$/im);
  return title?.[1] ? safeText(title[1], 240) : '';
}

function cleanSectionTitle(line = '') {
  return String(line || '')
    .replace(/^#{1,6}\s+/, '')
    .replace(/\s+#*$/, '')
    .trim()
    .toLowerCase();
}

const INTERNAL_MARKERS = [
  '=== workflow handoff context ===',
  '=== workflow additional prompt ===',
  '=== end workflow handoff context ===',
  'canonical user brief',
  'process program',
  'structured handoff digest',
  'prior specialist deliverables',
  'prior specialist deliverable:',
  'required output behavior:',
  'workflow handoff context'
];

const INTERNAL_SECTION_TITLES = new Set([
  'request',
  'workflow handoff context',
  'workflow additional prompt',
  'agent-owned behavior',
  'expected output sections',
  'input needs',
  'acceptance checks',
  'scope boundaries',
  'specialist method',
  'delivery packet',
  'review notes',
  'prior specialist deliverables (mandatory context): use at least 2 distinct prior work items when available.',
  'original information used',
  'upstream work used',
  '受け渡し情報の利用',
  'braveソース由来の補助分析',
  'agent handoff',
  '下流エージェント用handoff packet',
  '後続エージェントへの制約',
  '信頼性と品質保証',
  '補助成果物',
  'specialist成果物プレビュー',
  '実行ステータス',
  'supporting work products',
  'delivered content summaries',
  'downstream handoff summary'
]);

function deliveryLineLooksInternal(line = '') {
  return /provider\.runjob|agent-file provider implementation|agent_file_provider_delivery|central built-in runner|future behavior changes should be made|共通\s*builtin\s*runner|agent ファイル内の provider|agent ファイルの provider 実装|handoff evidence attached|leader-owned prior work|external posting, sending, ad launch|leader checkpoint|deliveryで表示される要約|trust profile|根拠ゲート|実行ゲート|品質ゲート|受け入れ条件|レビュー条件|未保証|source run\s*:|_file content is available/i.test(String(line || ''));
}

function deliveryContentLooksTemplateOnly(content = '') {
  const text = String(content || '').trim();
  if (!text) return true;
  const nonHeadingLines = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !/^#{1,6}\s+/.test(line));
  if (!nonHeadingLines.length) return true;
  return /(^|\n)##\s+Delivery packet\s*\n\s*Write sections for/i.test(text)
    && !/(answer first|evidence used|evidence status|decision first|seo page recommendation|replacement copy|hero copy|body draft|final delivery first|target and inputs|data quality check|measurement plan|next action)/i.test(text);
}

function hasInternalPromptContent(content = '') {
  const lower = String(content || '').toLowerCase();
  return INTERNAL_MARKERS.some((marker) => lower.includes(marker))
    || /^##\s+(Request|Agent-owned behavior|Expected output sections|Input needs|Acceptance checks|Scope boundaries|Specialist method|Delivery packet|Review notes)\b/im.test(content);
}

function stripInternalMarkdownSections(content = '') {
  const lines = String(content || '').replace(/\r\n/g, '\n').split('\n');
  const kept = [];
  let skipping = false;
  let skipFence = false;
  for (const line of lines) {
    const trimmed = line.trim();
    const lower = trimmed.toLowerCase();
    if (lower === '```markdown' && skipping) {
      skipFence = true;
      continue;
    }
    if (skipFence) {
      if (lower === '```') skipFence = false;
      continue;
    }
    if (lower === '=== end workflow handoff context ===') {
      skipping = false;
      continue;
    }
    if (INTERNAL_MARKERS.some((marker) => lower.includes(marker))) {
      skipping = true;
      continue;
    }
    const heading = trimmed.match(/^#{1,6}\s+(.+)$/);
    if (heading) {
      const title = cleanSectionTitle(trimmed);
      if (INTERNAL_SECTION_TITLES.has(title) || title.startsWith('prior specialist deliverable')) {
        skipping = true;
        continue;
      }
      skipping = false;
    }
    if (skipping || deliveryLineLooksInternal(line)) continue;
    kept.push(line);
  }
  const cleaned = kept.join('\n')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return deliveryContentLooksTemplateOnly(cleaned) ? '' : cleaned;
}

function genericDeliveryHeading(title = '') {
  const text = safeText(title, 240).toLowerCase();
  if (!text) return true;
  return /^(landing page critique|seo specialist|writer|writing|x ops connector|reddit|indie hackers|instagram|directory submission|.* provider delivery|.* delivery)$/.test(text);
}

function publisherTitleCandidate(title = '') {
  const cleaned = safeText(title, 260);
  return cleaned && !genericDeliveryHeading(cleaned) ? cleaned : '';
}

function publisherTitleFromContent(content = '', itemType = '') {
  const match = String(content || '').match(/https?:\/\/[^\s"'<>`)\]]+/i);
  if (!match?.[0]) return '';
  const rawUrl = match[0].replace(/[.,;:!?]+$/, '');
  let host = '';
  try {
    host = new URL(rawUrl).hostname.replace(/^www\./i, '');
  } catch {
    host = '';
  }
  if (!host) return '';
  const type = safeText(itemType, 80).toLowerCase();
  if (/seo_article|wordpress_draft/.test(type)) return `${host} SEO article`;
  if (/landing_page|wordpress_page/.test(type)) return `${host} landing page`;
  return `${host} publisher asset`;
}

function publisherContent(rawContent = '', itemType = '') {
  const raw = String(rawContent || '').slice(0, MAX_BODY_CHARS);
  const stripped = stripInternalMarkdownSections(raw);
  const heading = markdownHeading(stripped);
  const useful = stripped
    .replace(/^#\s+.+$/m, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!hasInternalPromptContent(raw) || (useful.length >= 180 && !genericDeliveryHeading(heading))) {
    return {
      body: stripped || raw,
      title: '',
      metadata: {}
    };
  }
  return {
    body: '',
    title: '',
    metadata: {}
  };
}

function requesterLoginFromJob(job = {}) {
  const requester = job?.input?._broker?.requester && typeof job.input._broker.requester === 'object'
    ? job.input._broker.requester
    : {};
  return safeText(requester.login || requester.email || '', 240).toLowerCase();
}

function workflowParentId(job = {}) {
  return safeText(job.workflowParentId || job.workflow_parent_id || job.id || '', 180);
}

function outputOf(job = {}) {
  return job?.output && typeof job.output === 'object' ? job.output : {};
}

function reportOf(job = {}) {
  const output = outputOf(job);
  return output.report && typeof output.report === 'object' ? output.report : {};
}

function isLeaderJob(job = {}) {
  const text = [job.workflowTask, job.taskType, job.workflowAgentName, job.assignedAgentId].join(' ').toLowerCase();
  return /\b[a-z]+_leader\b|\bteam leader\b/.test(text);
}

function metadataOf(artifact = {}) {
  return artifact?.metadata && typeof artifact.metadata === 'object' ? artifact.metadata : {};
}

function firstExplicitArtifactValue(artifact = {}, keys = []) {
  const metadata = metadataOf(artifact);
  for (const key of keys) {
    const value = artifact?.[key] ?? metadata?.[key];
    if (Array.isArray(value)) {
      const joined = value.map((item) => safeText(item, 120)).filter(Boolean).join(' ');
      if (joined) return joined;
      continue;
    }
    const text = safeText(value, 600);
    if (text) return text;
  }
  return '';
}

function explicitArtifactSignalText(artifact = {}, extraValues = []) {
  const metadata = metadataOf(artifact);
  const keys = [
    'type',
    'kind',
    'surface',
    'artifact_surface',
    'artifactSurface',
    'target_surface',
    'targetSurface',
    'item_type',
    'itemType',
    'content_type',
    'contentType',
    'action_type',
    'actionType',
    'handoff_artifact_type',
    'handoffArtifactType',
    'handoff_artifact_types',
    'handoffArtifactTypes',
    'artifact_type',
    'artifactType',
    'artifact_types',
    'artifactTypes',
    'packet_type',
    'packetType',
    'channel_key',
    'channelKey',
    'channel',
    'medium',
    'destination',
    'target',
    'platform',
    'publication',
    'publisher',
    'connector',
    'required_connector',
    'connector_capability',
    'connectorCapability',
    'capability',
    'capabilities'
  ];
  return [
    ...keys.flatMap((key) => [artifact?.[key], metadata?.[key]]),
    ...extraValues
  ]
    .flatMap((value) => (Array.isArray(value) ? value : [value]))
    .map((value) => safeText(value, 240))
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function normalizeExplicitSurface(value = '') {
  const text = safeText(value, 80).toLowerCase();
  if (!text) return '';
  if (/^(publisher|publish|publishing|content|owned_site|social)$/.test(text)) return 'publisher';
  if (/^(lead|leads|lead_ops|crm|outreach)$/.test(text)) return 'lead';
  if (/^(analytics|measurement|measurement_evidence)$/.test(text)) return 'analytics';
  if (/^(general|delivery|deliveries)$/.test(text)) return 'general';
  return text;
}

function inferSurface({ artifact = {} } = {}) {
  const explicitSurface = normalizeExplicitSurface(firstExplicitArtifactValue(artifact, [
    'surface',
    'artifact_surface',
    'artifactSurface',
    'target_surface',
    'targetSurface'
  ]));
  if (explicitSurface) return explicitSurface;
  const text = explicitArtifactSignalText(artifact);
  if (/\b(leads?|lead_list|lead_rows|list_creator|cold_email|email_draft|outreach|gmail|recipient|prospect)\b|会社別|候補企業|リード/.test(text)) return 'lead';
  if (/seo|article|landing|page|publisher|approval|directory|listing|social|sns|x_post|x ops|post text|tweet|instagram|linkedin|reddit|metadata|meta description|投稿|記事|lp|掲載/.test(text)) return 'publisher';
  if (/analytics|ga4|search console|query|landing_pages|channel_mix|channel_breakdown|conversion_paths|measurement/.test(text)) return 'analytics';
  return 'general';
}

function publisherChannelProfile({ artifact = {}, itemType = '' } = {}) {
  const explicitText = explicitArtifactSignalText(artifact, [itemType]);
  const packet = (profile) => ({
    itemType: profile.itemType,
    metadata: {
      channel_key: profile.channelKey,
      destination: profile.destination,
      connector: profile.connector,
      connector_capability: profile.capability,
      publish_method: profile.method,
      action_type: profile.actionType
    }
  });
  if (/indie[\s_-]?hackers|\bindie_hackers\b|\bih\b/.test(explicitText)) {
    return packet({
      itemType: 'indie_hackers_post',
      channelKey: 'indie_hackers',
      destination: 'Indie Hackers',
      connector: 'indie_hackers',
      capability: 'indie_hackers.post',
      method: 'indie_hackers_connector_or_manual_copy',
      actionType: 'indie_hackers_post'
    });
  }
  if (/\breddit\b|subreddit/.test(explicitText)) {
    return packet({
      itemType: 'reddit_post',
      channelKey: 'reddit',
      destination: 'Reddit',
      connector: 'reddit',
      capability: 'reddit.post',
      method: 'reddit_oauth_or_manual_copy',
      actionType: 'reddit_post'
    });
  }
  if (/\bx[_\s-]?ops\b|\bx[_\s-]?post\b|\btwitter\b|\btweet\b|\bx\.com\b|twitter\.com/.test(explicitText)) {
    return packet({
      itemType: 'x_post',
      channelKey: 'x',
      destination: 'X',
      connector: 'x',
      capability: 'x.post',
      method: 'x_oauth_or_x_saas',
      actionType: 'x_post'
    });
  }
  if (/\binstagram\b|\binsta\b|\big\b|instagram\.com/.test(explicitText)) {
    return packet({
      itemType: 'instagram_post',
      channelKey: 'instagram',
      destination: 'Instagram',
      connector: 'instagram',
      capability: 'instagram.post',
      method: 'instagram_connector_or_manual_copy',
      actionType: 'instagram_post'
    });
  }
  if (/wordpress|\bwp\b|wp-json/.test(explicitText)) {
    return packet({
      itemType: /landing|page/.test(explicitText) ? 'wordpress_page' : 'wordpress_draft',
      channelKey: 'wordpress_site',
      destination: 'WordPress site',
      connector: 'wordpress',
      capability: 'wordpress.create_draft',
      method: 'wordpress_application_password',
      actionType: 'wordpress_draft'
    });
  }
  if (/directory|listing|submission|掲載/.test(explicitText)) {
    return packet({
      itemType: 'directory_submission',
      channelKey: 'directory',
      destination: 'Directory / listing',
      connector: 'directory_app',
      capability: 'directory.submit',
      method: 'saas_or_manual_submit',
      actionType: 'directory_submission'
    });
  }
  if (/landing|lp|page_critique|page critique|landing_page|landing page/.test(explicitText)) {
    return packet({
      itemType: 'landing_page',
      channelKey: 'owned_site',
      destination: 'Owned site / Publisher',
      connector: 'publisher',
      capability: 'site_publish_packet',
      method: 'publisher_review_or_selected_connector',
      actionType: 'site_publish_packet'
    });
  }
  if (/seo_specialist|seo-agent|seo_article|seo article|\bseo\b|article|blog|記事/.test(explicitText)) {
    return packet({
      itemType: 'seo_article',
      channelKey: 'owned_site',
      destination: 'Owned site / Publisher',
      connector: 'publisher',
      capability: 'site_publish_packet',
      method: 'publisher_review_or_selected_connector',
      actionType: 'site_publish_packet'
    });
  }
  if (/social|sns|post text|approval packet|thread|投稿/.test(explicitText)) {
    return packet({
      itemType: /thread|スレッド/.test(explicitText) ? 'social_thread' : 'social_post',
      channelKey: 'social',
      destination: 'Social copy packet',
      connector: 'manual',
      capability: 'manual.copy',
      method: 'manual_social_copy',
      actionType: 'social_post'
    });
  }
  return null;
}

function inferItemType({ surface = '', artifact = {} } = {}) {
  const text = explicitArtifactSignalText(artifact);
  if (surface === 'lead') {
    if (/email|gmail|cold_email|subject|件名/.test(text)) return 'email_draft';
    if (/lead_rows|lead row|リード|候補企業|会社別/.test(text)) return 'lead_list';
    return 'lead_asset';
  }
  if (surface === 'publisher') {
    const profile = publisherChannelProfile({ artifact });
    if (profile?.itemType) return profile.itemType;
    if (/social|sns|x_post|x ops|post text|approval packet|tweet|instagram|linkedin|reddit|thread|投稿/.test(text)) return /thread|スレッド/.test(text) ? 'social_thread' : 'social_post';
    if (/directory|listing|submission|掲載/.test(text)) return 'directory_submission';
    if (/landing|lp|page|hero|h1|meta description/.test(text)) return 'landing_page';
    if (/seo|article|blog|記事/.test(text)) return 'seo_article';
    return 'publish_asset';
  }
  if (surface === 'analytics') return 'analytics_packet';
  return 'delivery_asset';
}

function surfaceForArtifact(inferredSurface = '', raw = {}) {
  const explicitSurface = normalizeExplicitSurface(firstExplicitArtifactValue(raw, [
    'surface',
    'artifact_surface',
    'artifactSurface',
    'target_surface',
    'targetSurface'
  ]));
  if (explicitSurface) return explicitSurface;
  return inferredSurface;
}

function itemStatus(job = {}, source = {}) {
  const explicit = safeText(source.status || source.review_status || '', 80).toLowerCase();
  if (explicit) return explicit;
  const jobStatus = safeText(job.status || '', 80).toLowerCase();
  if (jobStatus === 'blocked') return 'blocked';
  if (jobStatus === 'completed') return 'needs_review';
  return jobStatus || 'needs_review';
}

function explicitDeliveryMetadata(raw = {}, base = {}) {
  const metadata = { ...base };
  const nested = metadataOf(raw);
  const aliases = [
    ['content_type', ['content_type', 'contentType']],
    ['artifact_type', ['artifact_type', 'artifactType', 'handoff_artifact_type', 'handoffArtifactType', 'packet_type', 'packetType']],
    ['artifact_types', ['artifact_types', 'artifactTypes', 'handoff_artifact_types', 'handoffArtifactTypes']],
    ['surface', ['surface', 'artifact_surface', 'artifactSurface', 'target_surface', 'targetSurface']],
    ['item_type', ['item_type', 'itemType']],
    ['action_type', ['action_type', 'actionType']],
    ['channel_key', ['channel_key', 'channelKey']],
    ['channel', ['channel']],
    ['medium', ['medium']],
    ['destination', ['destination']],
    ['target', ['target']],
    ['platform', ['platform']],
    ['publication', ['publication']],
    ['publisher', ['publisher']],
    ['connector', ['connector', 'required_connector', 'requiredConnector']],
    ['connector_capability', ['connector_capability', 'connectorCapability', 'capability']],
    ['publish_method', ['publish_method', 'publishMethod']],
    ['review_status', ['review_status', 'reviewStatus']],
    ['ingest_status', ['ingest_status', 'ingestStatus']],
    ['publish_status', ['publish_status', 'publishStatus']],
    ['title', ['title']],
    ['h1', ['h1']],
    ['meta_description', ['meta_description', 'metaDescription']],
    ['slug', ['slug']],
    ['primary_cta', ['primary_cta', 'primaryCta']],
    ['secondary_cta', ['secondary_cta', 'secondaryCta']],
    ['subject', ['subject']],
    ['contact', ['contact']],
    ['evidence_url', ['evidence_url', 'evidenceUrl']]
  ];
  for (const [targetKey, keys] of aliases) {
    const values = keys
      .map((key) => raw?.[key] ?? nested?.[key])
      .filter((value) => value !== undefined && value !== null && value !== '');
    if (!values.length) continue;
    const value = values[0];
    metadata[targetKey] = Array.isArray(value)
      ? value.map((item) => safeText(item, 240)).filter(Boolean)
      : safeText(value, 2000);
  }
  return metadata;
}

function normalizeDeliveryItem(raw = {}, job = {}, index = 0) {
  const rawContent = String(raw.body || raw.content || raw.text || raw.markdown || '').slice(0, MAX_BODY_CHARS);
  const taskType = safeText(job.workflowTask || job.taskType || '', 100);
  const fileName = safeText(raw.fileName || raw.name || raw.filename || '', 220);
  const inferredSurface = inferSurface({ artifact: raw });
  const surface = safeText(surfaceForArtifact(inferredSurface, raw), 40);
  const explicitItemType = safeText(raw.itemType || raw.item_type || '', 80);
  const inferredItemType = inferItemType({ surface, artifact: raw });
  const channelProfile = surface === 'publisher'
    ? publisherChannelProfile({ artifact: raw, itemType: explicitItemType || inferredItemType })
    : null;
  const itemType = safeText(
    channelProfile?.itemType && (!explicitItemType || /^(?:publish_asset|social_post|social_thread|post|page)$/i.test(explicitItemType))
      ? channelProfile.itemType
      : (explicitItemType || inferredItemType),
    80
  );
  const prepared = surface === 'publisher' ? publisherContent(rawContent, itemType) : { body: rawContent, title: '', metadata: {} };
  const contentSource = surface === 'publisher' ? prepared.body : rawContent;
  const content = String(contentSource).slice(0, MAX_BODY_CHARS);
  const hasUserFacingContent = Boolean(content.trim());
  const legacyTitle = safeText(
    raw.title
      || markdownHeading(rawContent)
      || fileName
      || reportOf(job).summary
      || `Delivery item ${index + 1}`,
    260
  );
  const metadata = {
    ...explicitDeliveryMetadata(raw, {
      file_name: fileName,
      source_kind: raw.source_kind || raw.sourceKind || 'delivery',
      source_index: index,
      source_task_type: taskType,
      source_agent_name: job.workflowAgentName || job.assignedAgentId || ''
    }),
    ...(channelProfile?.metadata && typeof channelProfile.metadata === 'object' ? channelProfile.metadata : {}),
    ...(prepared.metadata && typeof prepared.metadata === 'object' ? prepared.metadata : {}),
    ...(raw.metadata && typeof raw.metadata === 'object' ? raw.metadata : {}),
    ...(Array.isArray(raw.source_evidence) ? { source_evidence: compactObject(raw.source_evidence) } : {}),
    ...(Array.isArray(raw.sourceEvidence) ? { source_evidence: compactObject(raw.sourceEvidence) } : {}),
    ...(Array.isArray(raw.publish_variants) ? { publish_variants: compactObject(raw.publish_variants) } : {}),
    ...(Array.isArray(raw.publishVariants) ? { publish_variants: compactObject(raw.publishVariants) } : {}),
    ...(Array.isArray(raw.claim_use_ledger) ? { claim_use_ledger: compactObject(raw.claim_use_ledger) } : {}),
    ...(Array.isArray(raw.claimUseLedger) ? { claim_use_ledger: compactObject(raw.claimUseLedger) } : {}),
    ...(raw.downstream_handoff && typeof raw.downstream_handoff === 'object' ? { downstream_handoff: compactObject(raw.downstream_handoff) } : {}),
    ...(raw.downstreamHandoff && typeof raw.downstreamHandoff === 'object' ? { downstream_handoff: compactObject(raw.downstreamHandoff) } : {}),
    ...(raw.eeat_notes && typeof raw.eeat_notes === 'object' ? { eeat_notes: compactObject(raw.eeat_notes) } : {}),
    ...(raw.eeatNotes && typeof raw.eeatNotes === 'object' ? { eeat_notes: compactObject(raw.eeatNotes) } : {})
  };
  const title = safeText(
    (surface === 'publisher' ? publisherTitleCandidate(raw.title) : raw.title)
      || (surface === 'publisher' ? publisherTitleCandidate(metadata.title) : metadata.title)
      || (surface === 'publisher' ? publisherTitleCandidate(metadata.h1) : metadata.h1)
      || (surface === 'publisher' ? publisherTitleCandidate(prepared.title) : prepared.title)
      || (surface === 'publisher' ? publisherTitleCandidate(markdownHeading(content)) : markdownHeading(content))
      || (surface === 'publisher' ? publisherTitleFromContent(rawContent || content, itemType) : '')
      || fileName
      || reportOf(job).summary
      || `Delivery item ${index + 1}`,
    260
  );
  return {
    id: safeText(raw.id || `${job.id || 'job'}:${surface}:${itemType}:${index}:${stableHash(`${legacyTitle}\n${rawContent.slice(0, 2000)}`)}`, 240),
    ownerLogin: requesterLoginFromJob(job),
    surface,
    itemType,
    status: itemStatus(job, raw),
    title,
    summary: hasUserFacingContent ? safeText(raw.summary || reportOf(job).summary || content, MAX_SUMMARY_CHARS) : '',
    body: content,
    metadata: compactObject(metadata),
    source: compactObject({
      job_id: job.id || '',
      file_name: fileName,
      source_kind: raw.source_kind || raw.sourceKind || 'delivery',
      raw: compactSourceRaw(raw)
    }),
    jobId: safeText(job.id || '', 180),
    workflowParentId: workflowParentId(job),
    workflowTask: taskType,
    workflowAgentName: safeText(job.workflowAgentName || job.assignedAgentId || '', 180),
    createdAt: safeText(job.createdAt || nowIso(), 80),
    updatedAt: safeText(job.completedAt || job.updatedAt || job.createdAt || nowIso(), 80)
  };
}

export function sanitizeDeliveryItemForSurface(item = {}) {
  if (!item || typeof item !== 'object') return item;
  const surface = safeText(item.surface || '', 40).toLowerCase();
  if (surface !== 'publisher') return item;
  const originalItemType = safeText(item.itemType || item.item_type || '', 80).toLowerCase();
  const channelProfile = publisherChannelProfile({
    artifact: {
      ...(item.metadata && typeof item.metadata === 'object' ? item.metadata : {}),
      type: originalItemType,
      item_type: originalItemType
    },
    itemType: originalItemType
  });
  const itemType = safeText(
    channelProfile?.itemType && (!originalItemType || /^(?:publish_asset|social_post|social_thread|post|page)$/i.test(originalItemType))
      ? channelProfile.itemType
      : originalItemType,
    80
  );
  const prepared = publisherContent(item.body || item.content || '', itemType);
  const body = String(prepared.body || '').slice(0, MAX_BODY_CHARS);
  const hasUserFacingBody = Boolean(body.trim());
  const metadata = compactObject({
    ...(item.metadata && typeof item.metadata === 'object' ? item.metadata : {}),
    ...(channelProfile?.metadata && typeof channelProfile.metadata === 'object' ? channelProfile.metadata : {}),
    ...(prepared.metadata && typeof prepared.metadata === 'object' ? prepared.metadata : {}),
    ...(Array.isArray(item.source_evidence) ? { source_evidence: compactObject(item.source_evidence) } : {}),
    ...(Array.isArray(item.sourceEvidence) ? { source_evidence: compactObject(item.sourceEvidence) } : {}),
    ...(Array.isArray(item.publish_variants) ? { publish_variants: compactObject(item.publish_variants) } : {}),
    ...(Array.isArray(item.publishVariants) ? { publish_variants: compactObject(item.publishVariants) } : {}),
    ...(Array.isArray(item.claim_use_ledger) ? { claim_use_ledger: compactObject(item.claim_use_ledger) } : {}),
    ...(Array.isArray(item.claimUseLedger) ? { claim_use_ledger: compactObject(item.claimUseLedger) } : {}),
    ...(item.downstream_handoff && typeof item.downstream_handoff === 'object' ? { downstream_handoff: compactObject(item.downstream_handoff) } : {}),
    ...(item.downstreamHandoff && typeof item.downstreamHandoff === 'object' ? { downstream_handoff: compactObject(item.downstreamHandoff) } : {}),
    ...(item.eeat_notes && typeof item.eeat_notes === 'object' ? { eeat_notes: compactObject(item.eeat_notes) } : {}),
    ...(item.eeatNotes && typeof item.eeatNotes === 'object' ? { eeat_notes: compactObject(item.eeatNotes) } : {})
  });
  const title = safeText(
    publisherTitleCandidate(metadata.title)
      || publisherTitleCandidate(metadata.h1)
      || publisherTitleCandidate(prepared.title)
      || publisherTitleCandidate(item.title)
      || publisherTitleCandidate(markdownHeading(body))
      || publisherTitleFromContent(item.body || item.content || body, itemType)
      || 'Publish asset',
    260
  );
  return {
    ...item,
    itemType,
    title,
    summary: hasUserFacingBody ? safeText(item.summary && !hasInternalPromptContent(item.summary) ? item.summary : body, MAX_SUMMARY_CHARS) : '',
    body,
    metadata,
    source: item.source && typeof item.source === 'object'
      ? compactObject({ ...item.source, raw: compactSourceRaw(item.source.raw || {}) })
      : {}
  };
}

function artifactItems(job = {}) {
  const output = outputOf(job);
  const artifacts = [
    ...(Array.isArray(output.artifacts) ? output.artifacts : []),
    ...(Array.isArray(output.report?.artifacts) ? output.report.artifacts : []),
    ...(Array.isArray(output.report?.approval_requests) ? output.report.approval_requests : []),
    ...(Array.isArray(output.report?.approvalRequests) ? output.report.approvalRequests : [])
  ];
  return artifacts
    .filter((item) => item && typeof item === 'object')
    .map((item, index) => normalizeDeliveryItem({
      ...item,
      body: item.body || item.content || item.text || item.markdown || item.description || item.summary || '',
      source_kind: 'artifact'
    }, job, index));
}

function fileItems(job = {}) {
  const output = outputOf(job);
  const files = Array.isArray(output.files) ? output.files : [];
  return files
    .filter((file) => file && typeof file === 'object')
    .filter((file) => String(file.content || file.body || '').trim())
    .filter((file) => !String(file.name || '').toLowerCase().includes('supporting-specialist-deliverables'))
    .map((file, index) => normalizeDeliveryItem({
      ...file,
      fileName: file.name || file.filename || `delivery-${index + 1}.md`,
      body: file.content || file.body || '',
      metadata: {
        ...(file.metadata && typeof file.metadata === 'object' ? file.metadata : {}),
        mime_type: file.type || file.mime || 'text/markdown'
      },
      source_kind: 'file'
    }, job, index));
}

function reportCandidateItems(job = {}) {
  const report = reportOf(job);
  const candidate = report.execution_candidate || report.executionCandidate || null;
  if (!candidate || typeof candidate !== 'object') return [];
  const body = candidate.body || candidate.content || candidate.reason || report.summary || '';
  if (!String(body || '').trim()) return [];
  return [normalizeDeliveryItem({
    ...candidate,
    title: candidate.title || report.summary || 'Execution candidate',
    summary: candidate.reason || report.summary || '',
    body,
    source_kind: 'execution_candidate'
  }, job, 0)];
}

export function deliveryItemsFromJob(job = {}) {
  if (!job?.id) return [];
  if (isLeaderJob(job)) return [];
  const output = outputOf(job);
  if (!output || typeof output !== 'object') return [];
  const items = [
    ...artifactItems(job),
    ...fileItems(job),
    ...reportCandidateItems(job)
  ];
  const seen = new Set();
  return items.filter((item) => {
    if (!item?.id || !item.body && !item.summary) return false;
    if (!['publisher', 'lead', 'analytics'].includes(item.surface)) return false;
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}
