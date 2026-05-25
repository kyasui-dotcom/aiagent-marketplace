import { buildCaitAppContext, copyContextJson, fetchCaitAppContextFromUrl, sendContextToCait } from './cait-app-bridge.js?v=20260526d';

const els = {
  returnToChatLink: document.getElementById('adsReturnToChatLink'),
  sendAdsContextBtn: document.getElementById('sendAdsContextBtn'),
  copyAdsContextBtn: document.getElementById('copyAdsContextBtn'),
  adsHandoffNotice: document.getElementById('adsHandoffNotice'),
  adsReadinessPill: document.getElementById('adsReadinessPill'),
  adsReadinessList: document.getElementById('adsReadinessList'),
  adsHandoffAuditPill: document.getElementById('adsHandoffAuditPill'),
  adsHandoffAuditSummary: document.getElementById('adsHandoffAuditSummary'),
  adsHandoffAuditList: document.getElementById('adsHandoffAuditList'),
  adsStepPlan: document.getElementById('adsStepPlan'),
  adsStepApproval: document.getElementById('adsStepApproval'),
  adsStepMeasurement: document.getElementById('adsStepMeasurement'),
  adsPlanMetric: document.getElementById('adsPlanMetric'),
  adsStopRulesMetric: document.getElementById('adsStopRulesMetric'),
  adsApprovalMetric: document.getElementById('adsApprovalMetric'),
  adsMeasurementMetric: document.getElementById('adsMeasurementMetric'),
  adsRecordTitle: document.getElementById('adsRecordTitle'),
  adsRecordMeta: document.getElementById('adsRecordMeta'),
  adsPlanTable: document.getElementById('adsPlanTable'),
  adsLaunchTable: document.getElementById('adsLaunchTable'),
  adsMeasurementTable: document.getElementById('adsMeasurementTable'),
  adsContextPreview: document.getElementById('adsContextPreview')
};

let importedContext = null;
let adsRecord = emptyAdsRecord();

function escapeHtml(value = '') {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

function text(value = '', fallback = '') {
  const safe = String(value ?? '').trim();
  return safe || fallback;
}

function objectValue(value = {}) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function listValue(value = []) {
  if (Array.isArray(value)) return value.map((item) => text(item)).filter(Boolean);
  return String(value || '').split(/[\n,]/).map((item) => item.trim()).filter(Boolean);
}

function normalizeKey(value = '') {
  return text(value).replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function camelKey(value = '') {
  return String(value || '').replace(/_([a-z0-9])/g, (_, char) => char.toUpperCase());
}

const ADS_CONTRACT_ALIASES = Object.freeze({
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

const ADS_MARKDOWN_ARTIFACT_TYPES = Object.freeze([
  'ads_plan',
  'ads_plan_packet',
  'paid_ads_plan',
  'ad_plan',
  'ad_campaign_plan',
  'paid_acquisition_plan',
  'campaign_structure',
  'budget_cap_and_cpa_assumption',
  'budget_guardrails',
  'target_cpa_assumptions',
  'pre_launch_measurement_blocker',
  'measurement_blocker',
  'measurement_blocker_packet',
  'tracking_blocker',
  'pre_launch_tracking_blocker',
  'stop_rules',
  'creative_asset_packet',
  'approval_ready_ad_asset_packet',
  'ad_asset_packet',
  'creative_assets',
  'ads_saas_handoff',
  'ads_saas_handoff_packet',
  'ads_saas_fields',
  'approval_and_launch_boundary',
  'approval_checklist',
  'missing_execution_inputs',
  'launch_approval_handoff',
  'launch_approval_handoff_packet',
  'execution_status_labels',
  'measurement_plan',
  'measurement_checks',
  'conversion_tracking_plan'
]);

function firstValue(source = {}, keys = []) {
  const object = objectValue(source);
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(object, key) && object[key] != null && object[key] !== '') return object[key];
  }
  return undefined;
}

function chatUrlParams() {
  return new URL(window.location.href).searchParams;
}

function chatReturnTo() {
  const value = text(chatUrlParams().get('chat_return_to'));
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
  return text(chatUrlParams().get('chat_handoff_id')).replace(/[^a-z0-9_-]/gi, '').slice(0, 120);
}

function compact(value = '', max = 220) {
  const safe = text(value).replace(/\s+/g, ' ');
  return safe.length <= max ? safe : `${safe.slice(0, max - 1).trim()}...`;
}

function row(label = '', detail = '', status = '') {
  return { label: text(label), detail: text(detail), status: text(status) };
}

function parseJsonRowsValue(value = '') {
  const safe = text(value);
  if (!/^[\[{]/.test(safe)) return null;
  try {
    const parsed = JSON.parse(safe);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function rowsFromValue(value, fallbackLabel = '') {
  if (value == null || value === '') return [];
  if (Array.isArray(value)) return value.flatMap((item) => rowsFromValue(item, fallbackLabel));
  if (typeof value !== 'object') {
    const parsed = parseJsonRowsValue(value);
    return parsed ? rowsFromValue(parsed, fallbackLabel) : [row(fallbackLabel || 'Item', String(value))];
  }
  const object = objectValue(value);
  if (!Object.keys(object).length) return [];
  if (Array.isArray(object.rows)) return rowsFromValue(object.rows, fallbackLabel);
  if (Array.isArray(object.items)) return rowsFromValue(object.items, fallbackLabel);
  if (Array.isArray(object.queue)) return rowsFromValue(object.queue, fallbackLabel);
  const label = firstValue(object, ['label', 'name', 'title', 'action', 'field', 'provider', 'metric', 'owner', 'check']) || fallbackLabel || object.type || object.artifact_type || 'Item';
  const detail = firstValue(object, ['detail', 'description', 'value', 'content', 'text', 'note', 'rule', 'status', 'window', 'assumption']) || JSON.stringify(object);
  const status = firstValue(object, ['status', 'state', 'ready', 'approved']) || '';
  return [row(label, detail, status)];
}

function artifactTypes(artifact = {}) {
  return [
    artifact.type,
    artifact.artifact_type,
    artifact.artifactType,
    artifact.content_type,
    artifact.contentType,
    ...(Array.isArray(artifact.artifact_types) ? artifact.artifact_types : []),
    ...(Array.isArray(artifact.artifactTypes) ? artifact.artifactTypes : [])
  ].map(normalizeKey).filter(Boolean);
}

function artifactMatches(artifact = {}, types = []) {
  const wanted = new Set(types.map(normalizeKey));
  return artifactTypes(artifact).some((type) => wanted.has(type));
}

function contractKeys(type = '') {
  const normalized = normalizeKey(type);
  return [...new Set([normalized, camelKey(normalized), ...(ADS_CONTRACT_ALIASES[normalized] || [])].filter(Boolean))];
}

function rawRowsFor(context = {}, type = '') {
  const raw = objectValue(context.raw_context);
  const contractFields = objectValue(raw.contract_fields);
  return [context, raw, contractFields].flatMap((source) => {
    const value = firstValue(source, contractKeys(type));
    return rowsFromValue(value, type);
  });
}

function artifactRowsFor(context = {}, types = []) {
  return (Array.isArray(context.artifacts) ? context.artifacts : [])
    .filter((artifact) => artifactMatches(artifact, types))
    .flatMap((artifact) => rowsFromValue(artifact.rows || artifact.items || artifact.queue || artifact.content || artifact, artifact.type || artifact.artifact_type));
}

function rowsFor(context = {}, types = []) {
  return [
    ...artifactRowsFor(context, types),
    ...types.flatMap((type) => rawRowsFor(context, type))
  ].filter((item) => item.label || item.detail);
}

function fileContent(file = {}) {
  return text(file.content || file.markdown || file.body || file.contentPreview || file.content_preview || file.text);
}

function fileName(file = {}) {
  return text(file.name || file.filename || file.title || file.source || '');
}

function deliveryFiles(context = {}) {
  const raw = objectValue(context.raw_context);
  const rawReceived = objectValue(raw.received_context);
  const rawDelivery = objectValue(raw.delivery);
  return [
    ...(Array.isArray(context.delivery_files) ? context.delivery_files : []),
    ...(Array.isArray(context.files) ? context.files : []),
    ...(Array.isArray(raw.delivery_files) ? raw.delivery_files : []),
    ...(Array.isArray(raw.files) ? raw.files : []),
    ...(Array.isArray(rawReceived.delivery_files) ? rawReceived.delivery_files : []),
    ...(Array.isArray(rawReceived.files) ? rawReceived.files : []),
    ...(Array.isArray(rawDelivery.artifacts) ? rawDelivery.artifacts : []),
    ...(Array.isArray(context.artifacts) ? context.artifacts : [])
  ].filter((file) => file && typeof file === 'object' && fileContent(file));
}

function markdownSections(markdown = '') {
  const sections = new Map();
  let current = 'summary';
  for (const line of String(markdown || '').split(/\r?\n/)) {
    const heading = line.match(/^#{1,3}\s+(.+?)\s*$/);
    if (heading) {
      current = normalizeKey(heading[1]);
      if (!sections.has(current)) sections.set(current, []);
      continue;
    }
    if (!sections.has(current)) sections.set(current, []);
    sections.get(current).push(line);
  }
  return sections;
}

function sectionText(sections, names = []) {
  for (const name of names.map(normalizeKey)) {
    const value = (sections.get(name) || []).join('\n').trim();
    if (value) return value;
  }
  return '';
}

function bulletRows(value = '', fallbackLabel = '') {
  return String(value || '').split(/\r?\n/)
    .map((line) => line.replace(/^\s*[-*]\s+/, '').trim())
    .filter(Boolean)
    .map((line, index) => {
      const split = line.match(/^([^:：]+)[:：]\s*(.+)$/);
      return split ? row(split[1], split[2]) : row(fallbackLabel || `Item ${index + 1}`, line);
    });
}

function parseAdsMarkdown(markdown = '') {
  const sections = markdownSections(markdown);
  const objective = sectionText(sections, ['objective', 'purpose', '目的']);
  const audience = sectionText(sections, ['audience', 'target', '対象']);
  const provider = sectionText(sections, ['provider', '媒体']);
  const campaignStructure = bulletRows(sectionText(sections, ['campaign structure', 'キャンペーン構成']), 'Structure');
  const budgetRows = bulletRows(sectionText(sections, ['budget cap and cpa assumption', '予算上限と cpa 仮説']), 'Budget');
  const blockerRows = bulletRows(sectionText(sections, ['pre-launch measurement blocker', '配信前の計測ブロッカー', 'measurement blocker', 'tracking blocker']), 'Measurement blocker');
  const stopRules = bulletRows(sectionText(sections, ['stop rules', '停止ルール']), 'Stop rule');
  const creativeRows = bulletRows(sectionText(sections, ['creative asset packet', 'クリエイティブアセット案']), 'Creative');
  const handoffRows = bulletRows(sectionText(sections, ['ads saas handoff', 'ads saas 引き継ぎ']), 'Ads SaaS handoff');
  const approvalRows = bulletRows(sectionText(sections, ['approval and launch boundary', '承認と配信境界', 'boundaries', 'boundary']), 'Approval');
  const executionRows = bulletRows(sectionText(sections, ['execution status labels', '実行ステータスラベル']), 'Execution');
  const measurementRows = bulletRows(sectionText(sections, ['measurement plan', '計測計画']), 'Measurement');
  return {
    objective: compact(objective, 500),
    audience: compact(audience, 500),
    provider: compact(provider, 300),
    campaignStructure,
    budgetRows,
    blockerRows,
    stopRules,
    creativeRows,
    handoffRows,
    approvalRows,
    executionRows,
    measurementRows
  };
}

function emptyAdsRecord() {
  return {
    title: 'No Ads Planner packet loaded',
    source: '',
    objective: '',
    audience: '',
    provider: '',
    campaignStructure: [],
    budgetRows: [],
    blockerRows: [],
    stopRules: [],
    creativeRows: [],
    handoffRows: [],
    approvalRows: [],
    executionRows: [],
    measurementRows: [],
    sourceFiles: []
  };
}

function mergeRows(...groups) {
  const seen = new Set();
  return groups.flat().filter((item) => {
    const key = `${normalizeKey(item.label)}:${normalizeKey(item.detail)}`;
    if (seen.has(key) || (!item.label && !item.detail)) return false;
    seen.add(key);
    return true;
  });
}

function adsRecordFromContext(context = {}) {
  if (!context) return emptyAdsRecord();
  const files = deliveryFiles(context);
  const adsFiles = files.filter((file) => artifactMatches(file, ADS_MARKDOWN_ARTIFACT_TYPES));
  const markdown = adsFiles.map(fileContent).find(Boolean) || '';
  const parsed = parseAdsMarkdown(markdown);
  const raw = objectValue(context.raw_context);
  const contractFields = objectValue(raw.contract_fields);
  const adsPlan = objectValue(firstValue(context, ['ads_plan', 'adsPlan', 'ads_plan_packet', 'adsPlanPacket']) || firstValue(raw, ['ads_plan', 'adsPlan', 'ads_plan_packet', 'adsPlanPacket']) || contractFields.ads_plan || {});
  const handoff = objectValue(firstValue(context, ['ads_saas_handoff', 'adsSaasHandoff', 'ads_saas_handoff_packet', 'adsSaasHandoffPacket']) || firstValue(raw, ['ads_saas_handoff', 'adsSaasHandoff', 'ads_saas_handoff_packet', 'adsSaasHandoffPacket']) || contractFields.ads_saas_handoff || {});
  return {
    title: text(context.title || adsPlan.title || handoff.title, markdown ? 'Imported Ads Planner handoff' : 'No Ads Planner packet loaded'),
    source: text(context.source_app_label || context.source_app || raw.source_agent?.name || files.map(fileName).filter(Boolean)[0]),
    objective: text(adsPlan.objective || handoff.objective || parsed.objective || context.summary),
    audience: text(adsPlan.audience || handoff.audience || parsed.audience),
    provider: text(adsPlan.provider || handoff.provider || parsed.provider, 'Provider not verified'),
    campaignStructure: mergeRows(rowsFor(context, ['campaign_structure']), rowsFromValue(adsPlan.campaign_structure || adsPlan.campaignStructure, 'Structure'), parsed.campaignStructure),
    budgetRows: mergeRows(rowsFor(context, ['budget_cap_and_cpa_assumption', 'budget_guardrails']), rowsFromValue(firstValue(handoff, ['budget_cap', 'budgetCap', 'target_cpa', 'targetCpa']), 'Budget'), parsed.budgetRows),
    blockerRows: mergeRows(rowsFor(context, ['pre_launch_measurement_blocker']), rowsFromValue(adsPlan.pre_launch_measurement_blocker || adsPlan.preLaunchMeasurementBlocker || handoff.pre_launch_measurement_blocker || handoff.preLaunchMeasurementBlocker, 'Measurement blocker'), parsed.blockerRows),
    stopRules: mergeRows(rowsFor(context, ['stop_rules']), rowsFromValue(adsPlan.stop_rules || adsPlan.stopRules || handoff.stop_rules || handoff.stopRules, 'Stop rule'), parsed.stopRules),
    creativeRows: mergeRows(rowsFor(context, ['creative_asset_packet']), rowsFromValue(adsPlan.creative_asset_packet || adsPlan.creativeAssetPacket, 'Creative'), parsed.creativeRows),
    handoffRows: mergeRows(rowsFor(context, ['ads_saas_handoff', 'ads_saas_handoff_packet']), rowsFromValue(handoff, 'Ads SaaS handoff'), parsed.handoffRows),
    approvalRows: mergeRows(rowsFor(context, ['approval_and_launch_boundary', 'launch_approval_handoff']), parsed.approvalRows),
    executionRows: mergeRows(rowsFor(context, ['execution_status_labels']), parsed.executionRows),
    measurementRows: mergeRows(rowsFor(context, ['measurement_plan', 'measurement_loop']), parsed.measurementRows),
    sourceFiles: adsFiles.map(fileName).filter(Boolean)
  };
}

function hasPlan(record = adsRecord) {
  return Boolean(record.objective || record.audience || record.provider || record.campaignStructure.length);
}

function readinessItems() {
  const budgetReady = adsRecord.budgetRows.length > 0;
  const blockerReady = adsRecord.blockerRows.length > 0;
  const stopReady = adsRecord.stopRules.length > 0;
  const creativeReady = adsRecord.creativeRows.length > 0;
  const handoffReady = adsRecord.handoffRows.length > 0;
  const approvalReady = adsRecord.approvalRows.length > 0 || adsRecord.executionRows.length > 0;
  const measurementReady = adsRecord.measurementRows.length > 0;
  return [
    {
      title: 'Plan is recoverable',
      detail: hasPlan() ? 'Objective, audience, provider, or structure is visible.' : 'Ads Planner context is missing or not parsed yet.',
      status: hasPlan() ? 'ready' : 'blocked'
    },
    {
      title: 'Budget and CPA are explicit',
      detail: budgetReady ? `${adsRecord.budgetRows.length} budget row(s) are retained.` : 'Budget cap or CPA assumption is missing.',
      status: budgetReady ? 'ready' : 'pending'
    },
    {
      title: 'Measurement blocker is explicit',
      detail: blockerReady ? `${adsRecord.blockerRows.length} pre-launch blocker row(s) are retained before spend.` : 'Conversion tracking blocker is missing or not separated.',
      status: blockerReady ? 'ready' : 'pending'
    },
    {
      title: 'Stop rules travel with the packet',
      detail: stopReady ? `${adsRecord.stopRules.length} stop rule(s) are visible.` : 'Spend and risk stop rules are missing.',
      status: stopReady ? 'ready' : 'pending'
    },
    {
      title: 'Creative remains draft-only',
      detail: creativeReady ? `${adsRecord.creativeRows.length} creative asset row(s) are separated from launch state.` : 'Creative asset packet is missing.',
      status: creativeReady ? 'ready' : 'pending'
    },
    {
      title: 'Ads SaaS handoff is separated',
      detail: handoffReady ? `${adsRecord.handoffRows.length} Ads SaaS handoff row(s) are retained.` : 'Ads SaaS account, connector, or handoff fields are missing.',
      status: handoffReady ? 'ready' : 'pending'
    },
    {
      title: 'Approval and measurement can continue',
      detail: approvalReady && measurementReady ? 'Launch authority and measurement checks are both attached.' : 'Approval boundary or measurement plan still needs attention.',
      status: approvalReady && measurementReady ? 'ready' : 'pending'
    },
    {
      title: 'CAIt can reopen this context',
      detail: importedContext ? 'Server-side app context was restored for this ads handoff.' : (chatReturnTo() ? 'The chat return route is pinned; Send to CAIt will create the server-side ads packet.' : 'Open from a CAIt handoff to preserve chat return routing.'),
      status: importedContext ? 'ready' : (chatReturnTo() ? 'pending' : 'blocked')
    }
  ];
}

function auditItems() {
  return [
    { key: 'ads_plan', title: 'Ads plan', detail: hasPlan() ? `${adsRecord.title} is loaded.` : 'Missing ads_plan or Ads Planner delivery file.', status: hasPlan() ? 'ready' : 'blocked' },
    { key: 'budget_cap_and_cpa_assumption', title: 'Budget and CPA', detail: adsRecord.budgetRows.length ? `${adsRecord.budgetRows.length} budget row(s).` : 'Missing budget cap or CPA assumption.', status: adsRecord.budgetRows.length ? 'ready' : 'pending' },
    { key: 'pre_launch_measurement_blocker', title: 'Pre-launch measurement blocker', detail: adsRecord.blockerRows.length ? `${adsRecord.blockerRows.length} blocker row(s).` : 'Missing conversion tracking blocker before spend.', status: adsRecord.blockerRows.length ? 'ready' : 'pending' },
    { key: 'stop_rules', title: 'Stop rules', detail: adsRecord.stopRules.length ? `${adsRecord.stopRules.length} stop rule(s).` : 'Missing stop_rules.', status: adsRecord.stopRules.length ? 'ready' : 'pending' },
    { key: 'creative_asset_packet', title: 'Creative asset packet', detail: adsRecord.creativeRows.length ? `${adsRecord.creativeRows.length} creative draft row(s).` : 'Missing creative_asset_packet.', status: adsRecord.creativeRows.length ? 'ready' : 'pending' },
    { key: 'ads_saas_handoff', title: 'Ads SaaS handoff', detail: adsRecord.handoffRows.length ? `${adsRecord.handoffRows.length} handoff row(s).` : 'Missing ads_saas_handoff.', status: adsRecord.handoffRows.length ? 'ready' : 'pending' },
    { key: 'approval_and_launch_boundary', title: 'Approval boundary', detail: adsRecord.approvalRows.length ? `${adsRecord.approvalRows.length} approval row(s).` : 'Missing approval_and_launch_boundary.', status: adsRecord.approvalRows.length ? 'ready' : 'pending' },
    { key: 'execution_status_labels', title: 'Execution labels', detail: adsRecord.executionRows.length ? `${adsRecord.executionRows.length} execution label row(s).` : 'Missing execution_status_labels.', status: adsRecord.executionRows.length ? 'ready' : 'pending' },
    { key: 'measurement_plan', title: 'Measurement plan', detail: adsRecord.measurementRows.length ? `${adsRecord.measurementRows.length} measurement row(s).` : 'Missing measurement_plan.', status: adsRecord.measurementRows.length ? 'ready' : 'pending' },
    { key: 'server_context', title: 'Server-side packet', detail: importedContext?.id ? `Context ${importedContext.id} is loaded from server storage.` : 'No server-side ads packet is loaded yet. Send to CAIt will create one.', status: importedContext?.id ? 'ready' : 'pending' }
  ];
}

function setWorkflowStep(el, state = '', detail = '') {
  if (!el) return;
  el.className = `workflow-step ${state}`.trim();
  const detailEl = el.querySelector('span:last-child span');
  if (detailEl && detail) detailEl.textContent = detail;
}

function tableHtml(headers = [], rows = []) {
  if (!rows.length) return '<tbody><tr><td>No retained rows yet.</td></tr></tbody>';
  return [
    `<thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}</tr></thead>`,
    `<tbody>${rows.map((cells) => `<tr>${cells.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('')}</tbody>`
  ].join('');
}

function renderHandoffNotice() {
  const returnTo = chatReturnTo();
  if (els.returnToChatLink) {
    els.returnToChatLink.hidden = !returnTo;
    els.returnToChatLink.href = returnTo || '/chat';
  }
  const fragments = [];
  if (returnTo) fragments.push('Return path to the same CAIt chat is pinned.');
  if (importedContext?.id) fragments.push('Server-side ads context is loaded.');
  if (chatHandoffId()) fragments.push(`Handoff ID: ${chatHandoffId()}.`);
  if (!fragments.length) {
    els.adsHandoffNotice.hidden = true;
    els.adsHandoffNotice.textContent = '';
    return;
  }
  const warning = returnTo && !importedContext?.id;
  els.adsHandoffNotice.hidden = false;
  els.adsHandoffNotice.className = `notice${warning ? ' notice-warning' : ''}`;
  els.adsHandoffNotice.innerHTML = [
    `<strong>${escapeHtml(warning ? 'Chat handoff is open but no server ads packet is loaded yet.' : 'CAIt ads handoff session is attached.')}</strong>`,
    `<span>${escapeHtml(fragments.join(' '))}</span>`
  ].join('');
}

function renderReadiness() {
  const items = readinessItems();
  const readyCount = items.filter((item) => item.status === 'ready').length;
  const blocked = items.some((item) => item.status === 'blocked');
  els.adsReadinessPill.textContent = hasPlan() ? `${readyCount}/${items.length} ops checks ready` : 'No ads plan loaded';
  els.adsReadinessPill.className = `status-pill ${readyCount === items.length ? 'approved' : blocked ? 'blocked' : 'pending'}`;
  els.adsReadinessList.innerHTML = items.map((item) => `
    <article class="ops-readiness-item ${item.status}">
      <strong>${escapeHtml(item.title)}</strong>
      <span>${escapeHtml(item.detail)}</span>
    </article>
  `).join('');
}

function renderAudit() {
  const items = auditItems();
  const readyCount = items.filter((item) => item.status === 'ready').length;
  const blocked = items.some((item) => item.status === 'blocked');
  const missing = items.filter((item) => item.status !== 'ready');
  els.adsHandoffAuditPill.textContent = hasPlan() ? `${readyCount}/${items.length} anchors present` : 'No packet audited';
  els.adsHandoffAuditPill.className = `status-pill ${readyCount === items.length ? 'approved' : blocked ? 'blocked' : 'pending'}`;
  els.adsHandoffAuditSummary.textContent = !hasPlan()
    ? 'No Ads Planner packet is loaded. Open this app from CAIt or send a retained app context.'
    : (missing.length ? `${missing.length} launch anchor(s) need attention before this can become stable paid acquisition operations: ${missing.map((item) => item.key).join(', ')}.` : 'All ads launch anchors are present for stable CAIt follow-up.');
  els.adsHandoffAuditList.innerHTML = items.map((item) => `
    <article class="handoff-audit-item ${item.status}">
      <strong>${escapeHtml(item.title)}</strong>
      <span>${escapeHtml(item.detail)}</span>
    </article>
  `).join('');
}

function renderTables() {
  els.adsRecordTitle.textContent = adsRecord.title;
  els.adsRecordMeta.textContent = [
    adsRecord.source ? `Source: ${adsRecord.source}` : '',
    adsRecord.provider ? `Provider: ${adsRecord.provider}` : '',
    adsRecord.sourceFiles.length ? `Files: ${adsRecord.sourceFiles.join(', ')}` : ''
  ].filter(Boolean).join(' / ') || 'No server-side Ads Planner context is loaded yet.';
  els.adsPlanTable.innerHTML = tableHtml(['Field', 'Value'], [
    ['Objective', adsRecord.objective || 'Missing'],
    ['Audience', adsRecord.audience || 'Missing'],
    ['Provider', adsRecord.provider || 'Missing'],
    ['Campaign structure', adsRecord.campaignStructure.map((item) => `${item.label}: ${item.detail}`).join('\n') || 'Missing']
  ]);
  els.adsLaunchTable.innerHTML = tableHtml(['Gate', 'Retained detail', 'Status'], [
    ...adsRecord.budgetRows.map((item) => ['Budget / CPA', `${item.label}: ${item.detail}`, item.status || 'review']),
    ...adsRecord.blockerRows.map((item) => ['Pre-launch measurement blocker', `${item.label}: ${item.detail}`, item.status || 'blocks launch']),
    ...adsRecord.stopRules.map((item) => ['Stop rule', `${item.label}: ${item.detail}`, item.status || 'review']),
    ...adsRecord.creativeRows.map((item) => ['Creative draft', `${item.label}: ${item.detail}`, item.status || 'draft']),
    ...adsRecord.handoffRows.map((item) => ['Ads SaaS handoff', `${item.label}: ${item.detail}`, item.status || 'pending']),
    ...adsRecord.approvalRows.map((item) => ['Approval boundary', `${item.label}: ${item.detail}`, item.status || 'required']),
    ...adsRecord.executionRows.map((item) => ['Execution label', `${item.label}: ${item.detail}`, item.status || 'not launched'])
  ]);
  els.adsMeasurementTable.innerHTML = tableHtml(['Measurement', 'Detail', 'Status'], adsRecord.measurementRows.map((item) => [item.label, item.detail, item.status || 'scheduled']));
}

function renderMetrics() {
  const planCount = [adsRecord.objective, adsRecord.audience, adsRecord.provider].filter(Boolean).length + adsRecord.campaignStructure.length;
  els.adsPlanMetric.textContent = String(planCount);
  els.adsStopRulesMetric.textContent = String(adsRecord.stopRules.length);
  els.adsApprovalMetric.textContent = String(adsRecord.approvalRows.length + adsRecord.executionRows.length);
  els.adsMeasurementMetric.textContent = String(adsRecord.measurementRows.length);
}

function renderWorkflow() {
  setWorkflowStep(els.adsStepPlan, hasPlan() ? 'done' : 'current', hasPlan() ? `${adsRecord.title} is loaded.` : 'Load an Ads Planner packet.');
  setWorkflowStep(els.adsStepApproval, adsRecord.approvalRows.length && adsRecord.executionRows.length ? 'done' : (hasPlan() ? 'current' : ''), adsRecord.approvalRows.length ? 'Approval boundary is visible.' : 'Separate budget, creative, and launch approval.');
  setWorkflowStep(els.adsStepMeasurement, adsRecord.measurementRows.length ? 'done' : (hasPlan() ? 'current' : ''), adsRecord.measurementRows.length ? 'Measurement checks are attached.' : 'Attach post-launch checks.');
}

function buildAdsContext() {
  const audit = auditItems();
  const missing = audit.filter((item) => item.status !== 'ready');
  return buildCaitAppContext({
    source_app: 'ads_launch_console',
    source_app_label: 'Ads Launch Console',
    title: hasPlan() ? `Ads launch gate - ${adsRecord.title}` : 'Ads launch gate',
    summary: hasPlan()
      ? `${adsRecord.title} is retained with ${adsRecord.stopRules.length} stop rule(s), ${adsRecord.creativeRows.length} creative row(s), ${adsRecord.handoffRows.length} Ads SaaS handoff row(s), and ${adsRecord.measurementRows.length} measurement check(s).`
      : 'No Ads Planner packet is loaded yet. Use Ads Planner output before asking CAIt to continue paid acquisition operations.',
    facts: [
      adsRecord.objective ? `Objective: ${adsRecord.objective}` : '',
      adsRecord.audience ? `Audience: ${adsRecord.audience}` : '',
      adsRecord.provider ? `Provider: ${adsRecord.provider}` : '',
      `Pre-launch measurement blockers: ${adsRecord.blockerRows.length}`,
      `Stop rules: ${adsRecord.stopRules.length}`,
      `Creative rows: ${adsRecord.creativeRows.length}`,
      `Ads SaaS handoff rows: ${adsRecord.handoffRows.length}`,
      `Measurement checks: ${adsRecord.measurementRows.length}`,
      missing.length ? `Handoff audit gaps: ${missing.map((item) => item.key).join(', ')}` : 'Handoff audit: all ads launch anchors present'
    ].filter(Boolean),
    assumptions: [
      importedContext ? 'This console restored a server-side CAIt ads app context.' : 'Ads launch state is shown from the current imported packet or empty state.',
      'Ads Planner can prepare launch inputs but cannot create, submit, launch, bid, or spend.',
      'Any spend or external Ads SaaS write still needs explicit approval and connector proof.'
    ],
    artifacts: [
      { type: 'ads_plan', rows: [{ title: adsRecord.title, objective: adsRecord.objective, audience: adsRecord.audience, provider: adsRecord.provider }] },
      { type: 'campaign_structure', rows: adsRecord.campaignStructure },
      { type: 'budget_cap_and_cpa_assumption', rows: adsRecord.budgetRows },
      { type: 'pre_launch_measurement_blocker', rows: adsRecord.blockerRows },
      { type: 'stop_rules', rows: adsRecord.stopRules },
      { type: 'creative_asset_packet', rows: adsRecord.creativeRows },
      { type: 'ads_saas_handoff', rows: adsRecord.handoffRows },
      { type: 'approval_and_launch_boundary', rows: adsRecord.approvalRows },
      { type: 'execution_status_labels', rows: adsRecord.executionRows },
      { type: 'measurement_plan', rows: adsRecord.measurementRows },
      { type: 'handoff_audit', rows: audit }
    ],
    metrics: [
      { label: 'stop_rules', value: adsRecord.stopRules.length },
      { label: 'pre_launch_measurement_blockers', value: adsRecord.blockerRows.length },
      { label: 'creative_asset_rows', value: adsRecord.creativeRows.length },
      { label: 'ads_saas_handoff_rows', value: adsRecord.handoffRows.length },
      { label: 'approval_rows', value: adsRecord.approvalRows.length },
      { label: 'execution_status_rows', value: adsRecord.executionRows.length },
      { label: 'measurement_checks', value: adsRecord.measurementRows.length },
      { label: 'handoff_audit_gaps', value: missing.length }
    ],
    approval_requests: [
      { action: 'ads_launch', status: 'requires approval', detail: 'Launch, bid changes, submit, and spend remain blocked until budget, creative, tracking, and owner approval are explicit.' }
    ],
    recommended_next_actions: [
      ...missing.slice(0, 4).map((item) => `Fix ads handoff gap: ${item.key}. ${item.detail}`),
      adsRecord.handoffRows.length ? 'Open the destination Ads SaaS only after approval and connector readiness are confirmed.' : 'Attach Ads SaaS account and connector readiness before requesting launch work.',
      adsRecord.measurementRows.length ? 'Route the next CAIt follow-up after the first spend and conversion-quality checkpoints.' : 'Attach 24h and 7d measurement checks before closing this ads plan.'
    ],
    handoff_targets: ['ads_planner', 'ads_launch_console', 'campaign_operations', 'analytics_console'],
    raw_context: {
      ...(importedContext ? { received_context: importedContext } : {}),
      ads_handoff_audit: {
        ready_count: audit.length - missing.length,
        total_count: audit.length,
        missing: missing.map((item) => item.key),
        checks: audit
      },
      chat_handoff_id: chatHandoffId(),
      chat_return_to: chatReturnTo()
    }
  });
}

function renderContextPreview() {
  els.adsContextPreview.textContent = JSON.stringify(buildAdsContext(), null, 2);
}

function render() {
  renderHandoffNotice();
  renderReadiness();
  renderAudit();
  renderTables();
  renderMetrics();
  renderWorkflow();
  renderContextPreview();
}

function selectContextPreview() {
  if (!els.adsContextPreview || typeof window.getSelection !== 'function') return false;
  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(els.adsContextPreview);
  selection.removeAllRanges();
  selection.addRange(range);
  return true;
}

els.copyAdsContextBtn?.addEventListener('click', async () => {
  try {
    await copyContextJson(buildAdsContext());
    els.copyAdsContextBtn.textContent = 'Copied';
  } catch {
    els.copyAdsContextBtn.textContent = selectContextPreview() ? 'Packet selected' : 'Copy failed';
  }
  window.setTimeout(() => { els.copyAdsContextBtn.textContent = 'Copy packet'; }, 1200);
});

els.sendAdsContextBtn?.addEventListener('click', () => {
  void sendContextToCait(buildAdsContext(), { returnTo: chatReturnTo() }).catch((error) => {
    window.alert(`CAIt ads context handoff failed: ${error.message}`);
  });
});

async function bootstrap() {
  importedContext = await fetchCaitAppContextFromUrl();
  if (importedContext) adsRecord = adsRecordFromContext(importedContext);
  render();
}

void bootstrap();
