function defaultCompactTransferText(value = '', max = 1200) {
  const text = String(value || '').replace(/\r\n/g, '\n').trim();
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1)).trim()}...`;
}

function defaultCompactTransferObject(value = null) {
  if (value == null || typeof value !== 'object') return value;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return {};
  }
}

function defaultNormalizeUsageId(value = '') {
  return String(value || '').trim().toLowerCase().replace(/[\s./:]+/g, '_').replace(/[^a-z0-9_-]+/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
}

function defaultListValues(value) {
  if (Array.isArray(value)) return value;
  if (value == null) return [];
  return String(value).split(',').map((item) => item.trim()).filter(Boolean);
}

function appHandoffSlugFromTitle(value = '') {
  const slug = String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug ? `/${slug}` : '';
}

function explicitMetadataText(file = {}, keys = []) {
  const metadata = file?.metadata && typeof file.metadata === 'object' ? file.metadata : {};
  const source = { ...metadata, ...file };
  for (const key of keys) {
    const value = source?.[key];
    if (typeof value === 'string' || typeof value === 'number') {
      const text = String(value || '').trim();
      if (text) return text;
    }
  }
  return '';
}

export function appHandoffFileMetadata(file = {}) {
  const title = explicitMetadataText(file, ['meta_title', 'metaTitle', 'page_title', 'pageTitle', 'title', 'headline']);
  const meta = explicitMetadataText(file, ['meta_description', 'metaDescription', 'description']);
  const h1 = explicitMetadataText(file, ['h1', 'headline']);
  const keywords = explicitMetadataText(file, ['keywords', 'meta_keywords', 'metaKeywords', 'target_keyword', 'targetKeyword', 'target_query', 'targetQuery', 'primary_keyword', 'primaryKeyword']);
  const primaryCta = explicitMetadataText(file, ['primary_cta', 'primaryCta', 'cta']);
  const secondaryCta = explicitMetadataText(file, ['secondary_cta', 'secondaryCta']);
  const internalLinks = explicitMetadataText(file, ['internal_links', 'internalLinks']);
  const ogTitle = explicitMetadataText(file, ['og_title', 'ogTitle']);
  const ogDescription = explicitMetadataText(file, ['og_description', 'ogDescription']);
  return {
    ...(title ? { title, slug: appHandoffSlugFromTitle(title) } : {}),
    ...(meta ? { meta, description: meta } : {}),
    ...(h1 ? { h1 } : {}),
    ...(keywords ? { keywords, target_keyword: keywords } : {}),
    ...(primaryCta ? { primary_cta: primaryCta } : {}),
    ...(secondaryCta ? { secondary_cta: secondaryCta } : {}),
    ...(internalLinks ? { internal_links: internalLinks } : {}),
    ...(ogTitle ? { og_title: ogTitle } : {}),
    ...(ogDescription ? { og_description: ogDescription } : {})
  };
}

export function appHandoffDeliveryArtifactsFromJob(job = {}, options = {}) {
  const deliveryFiles = options.deliveryFiles || (() => []);
  const explicitHandoffArtifactTypesFromFile = options.explicitHandoffArtifactTypesFromFile || (() => new Set());
  const fileMimeType = options.fileMimeType || (() => 'text/plain;charset=utf-8');
  const compactTransferText = options.compactTransferText || defaultCompactTransferText;
  return deliveryFiles(job).map((file) => {
    const artifactTypes = Array.from(explicitHandoffArtifactTypesFromFile(file));
    return {
      name: String(file?.name || 'delivery.md').trim(),
      contentType: String(artifactTypes[0] || file?.content_type || file?.contentType || file?.type || fileMimeType(file?.name || '', file?.content || '')).trim(),
      artifactType: artifactTypes[0] || '',
      artifactTypes,
      summary: compactTransferText(file?.summary || file?.description || '', 280),
      contentPreview: compactTransferText(file?.content || '', 900)
    };
  }).slice(0, 8);
}

export function appHandoffSocialPostDraftFromFile(file = {}, options = {}) {
  const maxLength = Number(options.maxLength || 0);
  const explicit = explicitMetadataText(file, [
    'post_text',
    'postText',
    'approved_text',
    'approvedText',
    'exact_copy',
    'exactCopy',
    'caption',
    'draft_text',
    'draftText'
  ]);
  if (explicit && (!maxLength || explicit.length <= maxLength)) {
    return {
      text: explicit,
      source: String(file?.name || 'delivery file metadata').trim() || 'delivery file metadata'
    };
  }
  return null;
}

export function appHandoffSocialPostDraftFromDeliveryFiles(files = [], options = {}) {
  for (const file of Array.isArray(files) ? files : []) {
    const draft = appHandoffSocialPostDraftFromFile(file, options);
    if (draft?.text) return draft;
  }
  return null;
}

export function appHandoffActionKind(manifest = {}, options = {}) {
  const explicit = String(
    options.actionKind
    || options.action?.kind
    || manifest.handoff?.actionKind
    || manifest.handoff?.action_kind
    || manifest.inputContract?.actionKind
    || manifest.inputContract?.action_kind
    || ''
  ).trim();
  return explicit || 'app_handoff';
}

export function appHandoffRequiresApproval(manifest = {}, options = {}) {
  const listValues = options.listValues || defaultListValues;
  if (options.requiresApproval != null) return Boolean(options.requiresApproval);
  return listValues(manifest.requiresApprovalFor || []).length > 0;
}

export function appHandoffBaseTransferPacket(appId = '', job = {}, options = {}) {
  const manifestById = options.manifestById || (() => ({}));
  const manifest = manifestById(appId) || {};
  const strategy = options.strategy && typeof options.strategy === 'object' ? options.strategy : {};
  const draft = options.draft && typeof options.draft === 'object' ? options.draft : {};
  const suppliedAction = options.action && typeof options.action === 'object' ? options.action : {};
  const compactTransferText = options.compactTransferText || defaultCompactTransferText;
  const compactTransferObject = options.compactTransferObject || defaultCompactTransferObject;
  const chatLanguage = options.chatLanguage || (() => '');
  const isoNow = options.isoNow || (() => new Date().toISOString());
  const statusLabel = options.statusLabel || ((item) => String(item?.status || '').trim());
  const appAgentSourceAgentsFromJob = options.appAgentSourceAgentsFromJob || (() => []);
  const deliveryText = options.deliveryText || (() => '');
  const returnPath = options.returnPath || '/chat';
  const objective = String(job.workflow?.objective || job.originalPrompt || job.input?.original_prompt || job.prompt || '').trim();
  const primaryTask = String((Array.isArray(job.workflow?.plannedTasks) ? job.workflow.plannedTasks[0] : '') || job.taskType || '').trim().toLowerCase();
  const agents = appAgentSourceAgentsFromJob(job);
  const settings = {
    brandName: strategy.product || '',
    serviceLine: strategy.product || '',
    targetClient: strategy.audience || '',
    defaultCta: strategy.goal || '',
    destinationLink: strategy.url || '',
    serviceUrl: strategy.url || '',
    channel: strategy.channel || '',
    outputLanguage: chatLanguage(objective),
    workspaceNotes: compactTransferText([
      strategy.strategy,
      objective ? `Original objective:\n${objective}` : '',
      agents.length ? `Agent chain:\n${agents.map((agent) => `- ${agent.name} (${agent.taskType}, ${agent.status || 'unknown'})`).join('\n')}` : ''
    ].filter(Boolean).join('\n\n'), 2200)
  };
  return {
    schema_version: 'cait-app-agent-transfer/v1',
    transfer_id: `transfer-${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 10)}`,
    created_at: isoNow(),
    platform: {
      name: 'CAIt',
      source: 'chatux',
      return_path: returnPath
    },
    app: {
      id: manifest.id || appId,
      name: manifest.name || appId,
      kind: manifest.kind || 'application_agent',
      capabilities: manifest.capabilities || [],
      input_contract: manifest.inputContract || null
    },
    order: {
      id: String(job.id || '').trim(),
      status: String(job.status || '').trim(),
      taskType: primaryTask,
      objective: compactTransferText(objective, 1200),
      workflow: Boolean(job.workflow || job.jobKind === 'workflow'),
      statusLabel: statusLabel(job)
    },
    agents,
    delivery: {
      summary: compactTransferText(deliveryText(job), 1800),
      artifacts: appHandoffDeliveryArtifactsFromJob(job, options)
    },
    settings,
    action: {
      kind: appHandoffActionKind(manifest, { ...options, action: suppliedAction }),
      text: compactTransferText(suppliedAction.text || draft.text || '', 1200),
      source: compactTransferText(suppliedAction.source || draft.source || 'CAIt delivery', 160),
      requiresApproval: appHandoffRequiresApproval(manifest, { ...options, action: suppliedAction }),
      ...compactTransferObject(suppliedAction, { depth: 3, maxText: 700, maxArray: 8 })
    }
  };
}

export function appTransferPayloadWithEditedText(payload = {}, trigger = null, options = {}) {
  const compactTransferText = options.compactTransferText || defaultCompactTransferText;
  const editable = trigger?.closest?.('[data-app-transfer-edit-root]')?.querySelector?.('[data-app-transfer-editable]')
    || trigger?.closest?.('.app-handoff-card, .app-dedicated-handoff-card')?.querySelector?.('[data-app-transfer-editable]')
    || null;
  if (!editable) return payload;
  const text = String('value' in editable ? editable.value : editable.textContent || '').trim();
  const source = String(editable.dataset.appTransferSource || payload.source || payload.action?.source || 'CAIt chat action').trim();
  const title = String(editable.dataset.appTransferTitle || payload.title || payload.action?.title || 'CAIt app handoff').trim();
  const settings = payload.settings && typeof payload.settings === 'object' ? payload.settings : {};
  return {
    ...payload,
    text,
    source,
    title,
    action: {
      ...(payload.action && typeof payload.action === 'object' ? payload.action : {}),
      text,
      source,
      title
    },
    settings: {
      ...settings,
      workspaceNotes: compactTransferText([
        settings.workspaceNotes || '',
        `Current edited handoff text:\n${text || '[empty]'}`
      ].filter(Boolean).join('\n\n'), 2200)
    }
  };
}

export function appHandoffContractTextMinimum(manifest = {}) {
  const inputContract = manifest?.inputContract && typeof manifest.inputContract === 'object' ? manifest.inputContract : {};
  const constraints = inputContract.constraints && typeof inputContract.constraints === 'object' ? inputContract.constraints : {};
  const text = constraints.text && typeof constraints.text === 'object' ? constraints.text : {};
  const candidates = [
    inputContract.minTextLength,
    inputContract.textMinLength,
    inputContract.min_text_length,
    inputContract.text_min_length,
    text.minLength,
    text.min_length
  ];
  for (const candidate of candidates) {
    const value = Number(candidate);
    if (Number.isFinite(value) && value > 0) return Math.floor(value);
  }
  return text.required === true || inputContract.textRequired === true || inputContract.text_required === true ? 1 : 0;
}

export function appHandoffContractTextLimit(manifest = {}) {
  const inputContract = manifest?.inputContract && typeof manifest.inputContract === 'object' ? manifest.inputContract : {};
  const constraints = inputContract.constraints && typeof inputContract.constraints === 'object' ? inputContract.constraints : {};
  const text = constraints.text && typeof constraints.text === 'object' ? constraints.text : {};
  const candidates = [
    inputContract.maxTextLength,
    inputContract.textMaxLength,
    inputContract.max_text_length,
    inputContract.text_max_length,
    text.maxLength,
    text.max_length
  ];
  for (const candidate of candidates) {
    const value = Number(candidate);
    if (Number.isFinite(value) && value > 0) return Math.floor(value);
  }
  return 0;
}

export function appHandoffPayloadText(payload = {}) {
  return String(payload.text || payload.action?.text || '').trim();
}

export function appHandoffPayloadContractError(manifest = {}, payload = {}) {
  const textMinimum = appHandoffContractTextMinimum(manifest);
  const textLimit = appHandoffContractTextLimit(manifest);
  const text = appHandoffPayloadText(payload);
  if (textMinimum && text.length < textMinimum) {
    return textMinimum === 1
      ? `${manifest.name || 'App'} requires handoff text before opening the app. Add the exact text first.`
      : `${manifest.name || 'App'} requires at least ${textMinimum} characters for this handoff text before opening the app.`;
  }
  if (textLimit && text && text.length > textLimit) {
    return `${manifest.name || 'App'} accepts at most ${textLimit} characters for this handoff text. Shorten it before opening the app.`;
  }
  return '';
}

function appHandoffTransferArtifactTypes(artifact = {}) {
  const candidates = [
    artifact.artifactType,
    artifact.artifact_type,
    artifact.contentType,
    artifact.content_type,
    artifact.type,
    ...(Array.isArray(artifact.artifactTypes) ? artifact.artifactTypes : []),
    ...(Array.isArray(artifact.artifact_types) ? artifact.artifact_types : [])
  ];
  return [...new Set(candidates.map((item) => String(item || '').trim()).filter(Boolean))];
}

function appHandoffTransferDeliveryFiles(delivery = {}) {
  return (Array.isArray(delivery.artifacts) ? delivery.artifacts : [])
    .filter((artifact) => artifact && typeof artifact === 'object')
    .map((artifact, index) => {
      const artifactTypes = appHandoffTransferArtifactTypes(artifact);
      const content = String(artifact.content || artifact.contentPreview || artifact.content_preview || artifact.body || artifact.text || '').trim();
      const name = String(artifact.name || artifact.title || `delivery-artifact-${index + 1}.md`).trim();
      return {
        type: artifact.type || 'file',
        artifact_type: artifactTypes[0] || '',
        artifact_types: artifactTypes,
        name,
        content_type: artifactTypes[0] || artifact.content_type || artifact.contentType || artifact.type || '',
        content,
        summary: defaultCompactTransferText(artifact.summary || artifact.description || '', 280)
      };
    })
    .filter((file) => file.name || file.content);
}

function appHandoffTransferArtifactContent(value = null, max = 2200) {
  if (value == null) return '';
  if (typeof value === 'string') return defaultCompactTransferText(value, max);
  try {
    return defaultCompactTransferText(JSON.stringify(value, null, 2), max);
  } catch {
    return '';
  }
}

function appHandoffTransferContractArtifact(type = '', title = '', value = null, options = {}) {
  const artifactType = String(type || '').trim();
  const content = appHandoffTransferArtifactContent(value, Number(options.max || 2200) || 2200);
  if (!artifactType || !content) return null;
  return {
    type: artifactType,
    artifact_type: artifactType,
    artifact_types: [artifactType],
    content_type: artifactType,
    title: title || artifactType.replace(/_/g, ' '),
    content
  };
}

function appHandoffTransferFirstText(candidates = [], max = 2200) {
  for (const candidate of candidates) {
    const text = appHandoffTransferArtifactContent(candidate, max);
    if (text) return text;
  }
  return '';
}

function appHandoffTransferPacketText(packet = null, max = 1200) {
  if (!packet) return '';
  if (typeof packet === 'string') return defaultCompactTransferText(packet, max);
  if (typeof packet !== 'object') return '';
  return appHandoffTransferFirstText([
    packet.post_text,
    packet.postText,
    packet.approved_text,
    packet.approvedText,
    packet.exact_copy,
    packet.exactCopy,
    packet.text,
    packet.copy,
    packet.caption,
    packet.tweet,
    packet.x_post,
    packet.xPost,
    packet.social_post,
    packet.socialPost,
    packet.content,
    packet.contentPreview,
    packet.content_preview,
    packet.body,
    packet.draft?.post_text,
    packet.draft?.postText,
    packet.draft?.text
  ], max);
}

function appHandoffTransferPostText(payload = {}, delivery = {}) {
  const direct = appHandoffTransferFirstText([
    payload.post_text,
    payload.postText,
    payload.text,
    payload.action?.post_text,
    payload.action?.postText,
    payload.action?.text
  ], 1200);
  if (direct) return direct;
  const packet = appHandoffTransferPacketText(
    payload.x_post_packet
      || payload.xPostPacket
      || payload.social_copy_packet
      || payload.socialCopyPacket
      || payload.social_post
      || payload.socialPost,
    1200
  );
  if (packet) return packet;
  const artifacts = Array.isArray(delivery.artifacts) ? delivery.artifacts : [];
  for (const artifact of artifacts) {
    const types = appHandoffTransferArtifactTypes(artifact).join(' ').toLowerCase();
    if (!/(?:post_text|x_post|social_copy|social_post|tweet)/.test(types)) continue;
    const text = appHandoffTransferPacketText(artifact, 1200);
    if (text) return text;
  }
  return '';
}

function appHandoffTransferManifestAccepts(manifest = {}, artifactType = '') {
  const normalized = defaultNormalizeUsageId(artifactType);
  if (!normalized) return false;
  return defaultListValues(manifest?.inputContract?.accepts || manifest?.input_contract?.accepts)
    .map(defaultNormalizeUsageId)
    .includes(normalized);
}

function appHandoffTransferStrategyText(payload = {}, settings = {}) {
  return appHandoffTransferFirstText([
    payload.strategy,
    payload.strategy_context,
    payload.strategyContext,
    payload.x_post_packet?.strategy,
    payload.xPostPacket?.strategy,
    payload.social_copy_packet?.strategy,
    payload.socialCopyPacket?.strategy,
    settings.workspaceNotes
  ], 1800);
}

const APP_HANDOFF_ADS_CONTRACT_FIELDS = Object.freeze([
  'ads_plan',
  'ads_plan_packet',
  'paid_ads_plan',
  'campaign_structure',
  'budget_cap_and_cpa_assumption',
  'budget_guardrails',
  'pre_launch_measurement_blocker',
  'stop_rules',
  'creative_asset_packet',
  'ads_saas_handoff',
  'ads_saas_handoff_packet',
  'approval_and_launch_boundary',
  'launch_approval_handoff',
  'execution_status_labels',
  'measurement_plan'
]);

const APP_HANDOFF_ADS_CONTRACT_ALIASES = Object.freeze({
  ads_plan: Object.freeze(['adsPlan', 'ads_plan_packet', 'adsPlanPacket', 'paid_ads_plan', 'paidAdsPlan', 'ad_plan', 'adPlan', 'ad_campaign_plan', 'adCampaignPlan', 'paid_acquisition_plan', 'paidAcquisitionPlan']),
  ads_plan_packet: Object.freeze(['adsPlanPacket', 'ads_plan', 'adsPlan', 'paid_ads_plan', 'paidAdsPlan', 'ad_plan', 'adPlan', 'ad_campaign_plan', 'adCampaignPlan', 'paid_acquisition_plan', 'paidAcquisitionPlan']),
  paid_ads_plan: Object.freeze(['paidAdsPlan', 'ads_plan', 'adsPlan', 'ads_plan_packet', 'adsPlanPacket', 'ad_plan', 'adPlan', 'ad_campaign_plan', 'adCampaignPlan', 'paid_acquisition_plan', 'paidAcquisitionPlan']),
  campaign_structure: Object.freeze(['campaignStructure', 'ad_groups', 'adGroups', 'campaign_sections', 'campaignSections']),
  budget_cap_and_cpa_assumption: Object.freeze(['budgetCapAndCpaAssumption', 'budget_guardrails', 'budgetGuardrails', 'budget_cap', 'budgetCap', 'target_cpa', 'targetCpa', 'target_cpa_assumptions', 'targetCpaAssumptions', 'cpa_assumption', 'cpaAssumption']),
  budget_guardrails: Object.freeze(['budgetGuardrails', 'budget_cap_and_cpa_assumption', 'budgetCapAndCpaAssumption', 'budget_cap', 'budgetCap', 'target_cpa_assumptions', 'targetCpaAssumptions']),
  pre_launch_measurement_blocker: Object.freeze(['preLaunchMeasurementBlocker', 'measurement_blocker', 'measurementBlocker', 'measurement_blocker_packet', 'measurementBlockerPacket', 'tracking_blocker', 'trackingBlocker', 'pre_launch_tracking_blocker', 'preLaunchTrackingBlocker']),
  stop_rules: Object.freeze(['stopRules']),
  creative_asset_packet: Object.freeze(['creativeAssetPacket', 'approval_ready_ad_asset_packet', 'approvalReadyAdAssetPacket', 'ad_asset_packet', 'adAssetPacket', 'creative_assets', 'creativeAssets', 'ad_creatives', 'adCreatives']),
  ads_saas_handoff: Object.freeze(['adsSaasHandoff', 'ads_saas_handoff_packet', 'adsSaasHandoffPacket', 'ads_saas_fields', 'adsSaasFields', 'ads_handoff', 'adsHandoff']),
  ads_saas_handoff_packet: Object.freeze(['adsSaasHandoffPacket', 'ads_saas_handoff', 'adsSaasHandoff', 'ads_saas_fields', 'adsSaasFields', 'ads_handoff', 'adsHandoff']),
  approval_and_launch_boundary: Object.freeze(['approvalAndLaunchBoundary', 'approval_boundary', 'approvalBoundary', 'launch_boundary', 'launchBoundary', 'approval_checklist', 'approvalChecklist', 'launch_approval_checklist', 'launchApprovalChecklist', 'missing_execution_inputs', 'missingExecutionInputs']),
  launch_approval_handoff: Object.freeze(['launchApprovalHandoff', 'launch_approval_handoff_packet', 'launchApprovalHandoffPacket', 'launch_handoff_packet', 'launchHandoffPacket']),
  execution_status_labels: Object.freeze(['executionStatusLabels', 'execution_status', 'executionStatus', 'status_labels', 'statusLabels']),
  measurement_plan: Object.freeze(['measurementPlan', 'measurement_checks', 'measurementChecks', 'conversion_tracking_plan', 'conversionTrackingPlan', 'tracking_plan', 'trackingPlan', 'post_launch_measurement', 'postLaunchMeasurement'])
});

function appHandoffTransferCamelKey(value = '') {
  return String(value || '').replace(/_([a-z0-9])/g, (_, char) => char.toUpperCase());
}

function appHandoffTransferContractValue(payload = {}, key = '') {
  const raw = payload.raw_context && typeof payload.raw_context === 'object' ? payload.raw_context : {};
  const keys = [...new Set([key, appHandoffTransferCamelKey(key), ...(APP_HANDOFF_ADS_CONTRACT_ALIASES[key] || [])].filter(Boolean))];
  const candidates = keys.flatMap((candidateKey) => [
    payload[candidateKey],
    raw[candidateKey],
    payload.delivery?.[candidateKey],
    payload.context?.[candidateKey]
  ]);
  return candidates.find((item) => item != null && item !== '');
}

function appHandoffTransferContractFields(manifest = {}, payload = {}) {
  const seenValues = new Set();
  return Object.fromEntries(APP_HANDOFF_ADS_CONTRACT_FIELDS
    .filter((key) => appHandoffTransferManifestAccepts(manifest, key))
    .map((key) => [key, appHandoffTransferContractValue(payload, key)])
    .filter(([, value]) => {
      if (value == null || value === '') return false;
      const valueKey = (() => {
        try {
          return JSON.stringify(value);
        } catch {
          return String(value);
        }
      })();
      if (seenValues.has(valueKey)) return false;
      seenValues.add(valueKey);
      return true;
    }));
}

export function appContextFromTransferPayload(appId = '', payload = {}, options = {}) {
  const manifestById = options.manifestById || (() => ({}));
  const normalizeUsageId = options.normalizeUsageId || defaultNormalizeUsageId;
  const compactTransferObject = options.compactTransferObject || defaultCompactTransferObject;
  const explicitHandoffArtifactTypesFromFile = options.explicitHandoffArtifactTypesFromFile || (() => new Set());
  const manifest = manifestById(appId) || {};
  const order = payload.order && typeof payload.order === 'object' ? payload.order : {};
  const settings = payload.settings && typeof payload.settings === 'object' ? payload.settings : {};
  const delivery = payload.delivery && typeof payload.delivery === 'object' ? payload.delivery : {};
  const fileArtifacts = (Array.isArray(payload.files) ? payload.files : []).map((file) => {
    const artifactTypes = Array.from(explicitHandoffArtifactTypesFromFile(file));
    return {
      type: 'file',
      artifact_type: artifactTypes[0] || '',
      artifact_types: artifactTypes,
      name: file?.name || '',
      content_type: artifactTypes[0] || file?.content_type || file?.contentType || file?.artifact_type || file?.artifactType || file?.type || '',
      content: file?.content || '',
      ...appHandoffFileMetadata(file)
    };
  });
  const transferDeliveryFiles = appHandoffTransferDeliveryFiles(delivery);
  const deliveryArtifacts = transferDeliveryFiles.map((file) => ({
    type: file.artifact_type || file.content_type || 'file',
    artifact_type: file.artifact_type || '',
    artifact_types: file.artifact_types || [],
    name: file.name || '',
    content_type: file.content_type || '',
    content: file.content || '',
    summary: file.summary || ''
  }));
  const postText = appHandoffTransferManifestAccepts(manifest, 'post_text')
    ? appHandoffTransferPostText(payload, delivery)
    : '';
  const strategyText = appHandoffTransferStrategyText(payload, settings);
  const agentContext = payload.context || payload.transfer?.context || null;
  const settingsContext = settings && Object.keys(settings).length ? settings : null;
  const acceptedContractFields = appHandoffTransferContractFields(manifest, payload);
  const transferContractArtifacts = [
    appHandoffTransferContractArtifact('post_text', 'Prepared post text', postText, { max: 1200 }),
    appHandoffTransferContractArtifact('strategy', 'Strategy context', strategyText, { max: 1800 }),
    appHandoffTransferContractArtifact('agent_context', 'Agent context', agentContext, { max: 2200 }),
    appHandoffTransferContractArtifact('settings', 'App settings', settingsContext, { max: 1800 }),
    ...Object.entries(acceptedContractFields).map(([key, value]) => appHandoffTransferContractArtifact(key, key.replace(/_/g, ' '), value, { max: 2200 }))
  ].filter(Boolean);
  const artifacts = [
    ...fileArtifacts,
    ...deliveryArtifacts,
    ...transferContractArtifacts,
    delivery.summary ? {
      type: 'delivery_summary',
      artifact_type: 'delivery_summary',
      artifact_types: ['delivery_summary'],
      content_type: 'delivery_summary',
      title: payload.title || 'Delivery summary',
      content: delivery.summary
    } : null,
    payload.action ? { type: 'action', title: payload.action.title || payload.title || 'Action packet', content: payload.action.text || payload.summary || '' } : null
  ].filter(Boolean);
  return {
    source_app: normalizeUsageId(manifest.id || appId || 'app'),
    source_app_label: manifest.name || appId || 'App',
    title: payload.title || payload.action?.title || `CAIt handoff for ${manifest.name || 'app'}`,
    summary: payload.summary || delivery.summary || payload.action?.text || '',
    facts: [
      order.id ? `Order ID: ${order.id}` : '',
      order.status ? `Order status: ${order.status}` : '',
      payload.source ? `Source: ${payload.source}` : ''
    ].filter(Boolean),
    artifacts,
    recommended_next_actions: [
      manifest.requiresApprovalFor?.length ? `Review approval requirements: ${manifest.requiresApprovalFor.join(', ')}` : '',
      'Use this server-side CAIt context to continue the app action without URL-embedded payloads.'
    ].filter(Boolean),
    approval_requests: Array.isArray(payload.approval_requests) ? payload.approval_requests : [],
    delivery_files: [...transferDeliveryFiles, ...fileArtifacts],
    handoff_targets: [manifest.id || appId].filter(Boolean),
    raw_context: compactTransferObject({
      transfer_id: payload.transfer_id || '',
      app_id: appId,
      post_text: postText,
      strategy: strategyText,
      agent_context: agentContext,
      source_agent: payload.source_agent || null,
      agents: payload.agents || [],
      order,
      settings,
      contract_fields: acceptedContractFields,
      ...acceptedContractFields,
      x_post_packet: payload.x_post_packet || payload.xPostPacket || null,
      social_copy_packet: payload.social_copy_packet || payload.socialCopyPacket || null,
      delivery,
      action: payload.action || null,
      context: payload.context || null,
      transfer: payload.transfer || null
    }, { depth: 5, maxText: 900, maxArray: 12 })
  };
}
