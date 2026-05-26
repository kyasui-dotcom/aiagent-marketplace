import { buildCaitAppContext, copyContextJson, fetchCaitAppContextFromUrl, sendContextToCait } from './cait-app-bridge.js?v=20260526h';

const els = {
  returnToChatLink: document.getElementById('growthReturnToChatLink'),
  sendGrowthContextBtn: document.getElementById('sendGrowthContextBtn'),
  copyGrowthContextBtn: document.getElementById('copyGrowthContextBtn'),
  growthHandoffNotice: document.getElementById('growthHandoffNotice'),
  growthReadinessPill: document.getElementById('growthReadinessPill'),
  growthReadinessList: document.getElementById('growthReadinessList'),
  growthHandoffAuditPill: document.getElementById('growthHandoffAuditPill'),
  growthHandoffAuditSummary: document.getElementById('growthHandoffAuditSummary'),
  growthHandoffAuditList: document.getElementById('growthHandoffAuditList'),
  growthStepExperiment: document.getElementById('growthStepExperiment'),
  growthStepActivation: document.getElementById('growthStepActivation'),
  growthStepMeasurement: document.getElementById('growthStepMeasurement'),
  growthStepPublisher: document.getElementById('growthStepPublisher'),
  growthPublisherPill: document.getElementById('growthPublisherPill'),
  growthPublisherSummary: document.getElementById('growthPublisherSummary'),
  growthPublisherList: document.getElementById('growthPublisherList'),
  openGrowthPublisherBtn: document.getElementById('openGrowthPublisherBtn'),
  copyGrowthPublisherBtn: document.getElementById('copyGrowthPublisherBtn'),
  growthPublisherPreview: document.getElementById('growthPublisherPreview'),
  growthExperimentMetric: document.getElementById('growthExperimentMetric'),
  growthArtifactMetric: document.getElementById('growthArtifactMetric'),
  growthActivationMetric: document.getElementById('growthActivationMetric'),
  growthMeasurementMetric: document.getElementById('growthMeasurementMetric'),
  growthRecordTitle: document.getElementById('growthRecordTitle'),
  growthRecordMeta: document.getElementById('growthRecordMeta'),
  growthExperimentTable: document.getElementById('growthExperimentTable'),
  growthActivationTable: document.getElementById('growthActivationTable'),
  growthMeasurementTable: document.getElementById('growthMeasurementTable'),
  growthContextPreview: document.getElementById('growthContextPreview')
};

let importedContext = null;
let growthRecord = emptyGrowthRecord();

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

function normalizeKey(value = '') {
  return text(value).replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function camelKey(value = '') {
  return String(value || '').replace(/_([a-z0-9])/g, (_, char) => char.toUpperCase());
}

const GROWTH_CONTRACT_ALIASES = Object.freeze({
  growth_experiment_packet: Object.freeze(['growthExperimentPacket', 'growth_packet', 'growthPacket', 'experiment_packet', 'experimentPacket', 'growth_plan_packet', 'growthPlanPacket', 'no_paid_growth_plan_packet', 'noPaidGrowthPlanPacket', 'organic_growth_plan_packet', 'organicGrowthPlanPacket']),
  no_paid_growth_plan_packet: Object.freeze(['noPaidGrowthPlanPacket', 'organic_growth_plan_packet', 'organicGrowthPlanPacket', 'growth_experiment_packet', 'growthExperimentPacket']),
  organic_specialist_handoff_packet: Object.freeze(['organicSpecialistHandoffPacket', 'specialist_handoff_packet', 'specialistHandoffPacket', 'growth_asset_handoff_packet', 'growthAssetHandoffPacket', 'growth_activation_handoff_packet', 'growthActivationHandoffPacket']),
  growth_asset_handoff_packet: Object.freeze(['growthAssetHandoffPacket', 'growth_asset_packet', 'growthAssetPacket', 'asset_handoff_packet', 'assetHandoffPacket', 'organic_specialist_handoff_packet', 'organicSpecialistHandoffPacket']),
  growth_activation_handoff_packet: Object.freeze(['growthActivationHandoffPacket', 'growth_activation_packet', 'growthActivationPacket', 'activation_handoff_packet', 'activationHandoffPacket', 'organic_specialist_handoff_packet', 'organicSpecialistHandoffPacket']),
  bottleneck: Object.freeze(['growth_bottleneck', 'growthBottleneck']),
  icp_and_offer: Object.freeze(['icpAndOffer', 'icp_offer', 'icpOffer', 'target_segment_offer', 'targetSegmentOffer']),
  experiment_hypothesis: Object.freeze(['experimentHypothesis', 'hypothesis', 'growth_hypothesis', 'growthHypothesis']),
  exact_artifact_packet: Object.freeze(['exactArtifactPacket', 'artifact_packet', 'artifactPacket', 'exact_copy_or_page_or_channel_artifact', 'exactCopyOrPageOrChannelArtifact']),
  page_or_channel_artifact: Object.freeze(['pageOrChannelArtifact', 'page_channel_artifact', 'pageChannelArtifact', 'artifact_surface', 'artifactSurface']),
  execution_packet: Object.freeze(['executionPacket', 'activation_packet', 'activationPacket', '7_day_experiment', '7DayExperiment', 'seven_day_experiment', 'sevenDayExperiment', 'experiment_plan', 'experimentPlan']),
  tracking_specification: Object.freeze(['trackingSpecification', 'tracking_spec', 'trackingSpec', 'measurement_spec', 'measurementSpec', 'measurement_surface', 'measurementSurface', 'tracking_plan', 'trackingPlan']),
  metric_threshold: Object.freeze(['metricThreshold', 'success_metric', 'successMetric', 'threshold', 'metrics', 'success_criteria', 'successCriteria']),
  kill_rule: Object.freeze(['killRule', 'stop_rule', 'stopRule', 'stop_rules', 'stopRules']),
  activation_owner: Object.freeze(['activationOwner', 'implementation_owner', 'implementationOwner']),
  approval_owner: Object.freeze(['approvalOwner']),
  owner_responsibility_map: Object.freeze(['ownerResponsibilityMap', 'owner_map', 'ownerMap', 'responsibility_map', 'responsibilityMap']),
  measurement_owner: Object.freeze(['measurementOwner']),
  measurement_surface: Object.freeze(['measurementSurface', 'analytics_surface', 'analyticsSurface', 'proof_surface', 'proofSurface']),
  proof_source: Object.freeze(['proofSource', 'execution_proof_source', 'executionProofSource', 'launch_proof', 'launchProof', 'conversion_proof', 'conversionProof']),
  review_date: Object.freeze(['reviewDate', 'next_review_date', 'nextReviewDate']),
  execution_proof_tracker: Object.freeze(['executionProofTracker', 'proof_tracker', 'proofTracker']),
  execution_status_labels: Object.freeze(['executionStatusLabels', 'execution_status', 'executionStatus', 'status_labels', 'statusLabels', 'approval_state', 'approvalState', 'launch_status', 'launchStatus', 'measurement_status', 'measurementStatus']),
  measurement_plan: Object.freeze(['measurementPlan', 'measurement_checks', 'measurementChecks', 'conversion_tracking_plan', 'conversionTrackingPlan', 'tracking_plan', 'trackingPlan']),
  next_decision: Object.freeze(['nextDecision', 'decision_rule', 'decisionRule', 'continue_or_stop_rule', 'continueOrStopRule'])
});

const GROWTH_MARKDOWN_ARTIFACT_TYPES = Object.freeze([
  'growth_experiment_packet',
  'no_paid_growth_plan_packet',
  'organic_specialist_handoff_packet',
  'growth_asset_handoff_packet',
  'growth_activation_handoff_packet',
  'growth_packet',
  'experiment_packet',
  'bottleneck',
  'icp_and_offer',
  'experiment_hypothesis',
  'exact_artifact_packet',
  'page_or_channel_artifact',
  'execution_packet',
  '7_day_experiment',
  'seven_day_experiment',
  'experiment_plan',
  'tracking_specification',
  'metric_threshold',
  'metrics',
  'success_criteria',
  'kill_rule',
  'stop_rules',
  'activation_owner',
  'approval_owner',
  'owner_responsibility_map',
  'measurement_owner',
  'measurement_surface',
  'proof_source',
  'review_date',
  'execution_proof_tracker',
  'execution_status_labels',
  'measurement_plan',
  'next_decision'
]);

const GROWTH_EXPERIMENT_CONTRACT_TYPES = Object.freeze(['growth_experiment_packet', 'no_paid_growth_plan_packet', 'bottleneck', 'icp_and_offer', 'experiment_hypothesis', 'execution_packet']);
const GROWTH_ARTIFACT_CONTRACT_TYPES = Object.freeze(['growth_asset_handoff_packet', 'organic_specialist_handoff_packet', 'exact_artifact_packet', 'page_or_channel_artifact', 'execution_packet']);
const GROWTH_ACTIVATION_CONTRACT_TYPES = Object.freeze(['growth_activation_handoff_packet', 'organic_specialist_handoff_packet', 'activation_owner', 'approval_owner', 'owner_responsibility_map', 'measurement_owner', 'measurement_surface', 'review_date']);
const GROWTH_MEASUREMENT_CONTRACT_TYPES = Object.freeze(['tracking_specification', 'metric_threshold', 'kill_rule', 'proof_source', 'execution_proof_tracker', 'execution_status_labels', 'measurement_plan', 'next_decision']);
const GROWTH_PUBLISHER_REQUIRED_CONTRACT_GROUPS = Object.freeze({
  experiment: GROWTH_EXPERIMENT_CONTRACT_TYPES,
  artifact: Object.freeze(['growth_asset_handoff_packet', 'exact_artifact_packet', 'page_or_channel_artifact']),
  activation: Object.freeze(['growth_activation_handoff_packet', 'activation_owner', 'approval_owner', 'owner_responsibility_map']),
  measurement: GROWTH_MEASUREMENT_CONTRACT_TYPES
});

function firstValue(source = {}, keys = []) {
  const object = objectValue(source);
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(object, key) && object[key] != null && object[key] !== '') return object[key];
  }
  return undefined;
}

function contractKeys(type = '') {
  const normalized = normalizeKey(type);
  return [...new Set([normalized, camelKey(normalized), ...(GROWTH_CONTRACT_ALIASES[normalized] || [])].filter(Boolean))];
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
  if (Array.isArray(object.checks)) return rowsFromValue(object.checks, fallbackLabel);
  const label = firstValue(object, ['label', 'name', 'title', 'metric', 'owner', 'rule', 'date', 'field', 'artifact', 'surface']) || fallbackLabel || object.type || object.artifact_type || 'Item';
  const detail = firstValue(object, ['detail', 'description', 'value', 'content', 'text', 'note', 'hypothesis', 'copy', 'threshold', 'condition', 'proof', 'status']) || JSON.stringify(object);
  const status = firstValue(object, ['status', 'state', 'ready', 'approved', 'risk']) || '';
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

function rawRowsFor(context = {}, type = '') {
  const raw = objectValue(context.raw_context);
  const received = objectValue(raw.received_context);
  const contractFields = objectValue(raw.contract_fields);
  return [context, raw, received, contractFields].flatMap((source) => {
    const value = firstValue(source, contractKeys(type));
    return rowsFromValue(value, type);
  });
}

function artifactRowsFor(context = {}, types = []) {
  return (Array.isArray(context.artifacts) ? context.artifacts : [])
    .filter((artifact) => artifactMatches(artifact, types))
    .flatMap((artifact) => rowsFromValue(artifact.rows || artifact.items || artifact.checks || artifact.content || artifact, artifact.type || artifact.artifact_type));
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

function deliveryFiles(context = {}) {
  const raw = objectValue(context.raw_context);
  const received = objectValue(raw.received_context);
  const delivery = objectValue(raw.delivery);
  return [
    ...(Array.isArray(context.delivery_files) ? context.delivery_files : []),
    ...(Array.isArray(raw.delivery_files) ? raw.delivery_files : []),
    ...(Array.isArray(received.delivery_files) ? received.delivery_files : []),
    ...(Array.isArray(delivery.artifacts) ? delivery.artifacts : []),
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

function rowsFromMarkdownBlock(markdown = '', fallbackLabel = '') {
  const lines = String(markdown || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const bullets = lines
    .filter((line) => /^[-*]\s+/.test(line))
    .map((line) => line.replace(/^[-*]\s+/, '').trim())
    .map((line) => {
      const parts = line.split(/:\s+/);
      return parts.length > 1 ? row(parts[0], parts.slice(1).join(': ')) : row(fallbackLabel || 'Item', line);
    });
  if (bullets.length) return bullets;
  const plain = lines.filter((line) => !/^#{1,6}\s+/.test(line)).join(' ');
  return plain ? [row(fallbackLabel || 'Item', plain)] : [];
}

function markdownRowsFor(context = {}, types = []) {
  const normalizedTypes = types.map(normalizeKey);
  const aliases = normalizedTypes.flatMap((type) => [type, ...(GROWTH_CONTRACT_ALIASES[type] || []).map(normalizeKey)]);
  const wanted = new Set([...normalizedTypes, ...aliases]);
  const growthFiles = deliveryFiles(context).filter((file) => artifactMatches(file, GROWTH_MARKDOWN_ARTIFACT_TYPES));
  return growthFiles
    .flatMap((file) => {
      const sections = markdownSections(fileContent(file));
      return [...sections.entries()]
        .filter(([heading]) => wanted.has(heading))
        .flatMap(([heading, lines]) => rowsFromMarkdownBlock(lines.join('\n'), heading));
    });
}

function firstAvailableRows(context = {}, types = []) {
  for (const type of types) {
    const rows = uniqueRows([
      ...rowsFor(context, [type]),
      ...markdownRowsFor(context, [type])
    ]);
    if (rows.length) return rows;
  }
  return [];
}

function retainedRowsFor(types = []) {
  if (!importedContext) return [];
  return uniqueRows([
    ...types.flatMap((type) => rowsFor(importedContext, [type])),
    ...types.flatMap((type) => markdownRowsFor(importedContext, [type]))
  ]);
}

function uniqueRows(rows = []) {
  const seen = new Set();
  return rows.filter((item) => {
    const key = `${item.label}|${item.detail}|${item.status}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function rowsText(rows = [], max = 900) {
  return uniqueRows(rows)
    .map((item) => [item.label, item.detail, item.status].filter(Boolean).join(': '))
    .filter(Boolean)
    .join('\n')
    .slice(0, max);
}

function firstMatchingRow(rows = [], pattern = /./) {
  return rows.find((item) => pattern.test(`${item.label} ${item.detail}`)) || null;
}

function slugFromTitle(value = '') {
  const slug = text(value, 'growth-experiment')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return `/${slug || 'growth-experiment'}`;
}

function emptyGrowthRecord() {
  return {
    title: 'No Growth packet loaded',
    summary: 'Open from CAIt or send a Growth app context to populate this console.',
    experimentRows: [],
    artifactRows: [],
    activationRows: [],
    measurementRows: [],
    audit: []
  };
}

function collectGrowthRecord(context = null) {
  if (!context) return emptyGrowthRecord();
  const title = text(context.title, 'Growth experiment packet');
  const summary = text(context.summary, 'Growth AIAGENT context was restored as a retained app packet.');
  const experimentRows = uniqueRows([
    ...rowsFor(context, GROWTH_EXPERIMENT_CONTRACT_TYPES),
    ...markdownRowsFor(context, GROWTH_EXPERIMENT_CONTRACT_TYPES)
  ]);
  const artifactRows = uniqueRows([
    ...rowsFor(context, GROWTH_ARTIFACT_CONTRACT_TYPES),
    ...markdownRowsFor(context, GROWTH_ARTIFACT_CONTRACT_TYPES)
  ]);
  const activationRows = uniqueRows([
    ...rowsFor(context, GROWTH_ACTIVATION_CONTRACT_TYPES),
    ...markdownRowsFor(context, GROWTH_ACTIVATION_CONTRACT_TYPES)
  ]);
  const measurementRows = uniqueRows([
    ...rowsFor(context, GROWTH_MEASUREMENT_CONTRACT_TYPES),
    ...markdownRowsFor(context, GROWTH_MEASUREMENT_CONTRACT_TYPES)
  ]);
  if (!experimentRows.length) experimentRows.push(...firstAvailableRows(context, ['seven_day_experiment', 'experiment_plan']));
  if (!measurementRows.some((item) => /metric|threshold|success|criteria/i.test(`${item.label} ${item.detail}`))) {
    measurementRows.push(...firstAvailableRows(context, ['metrics', 'success_criteria']));
  }
  if (!measurementRows.some((item) => /kill|stop/i.test(`${item.label} ${item.detail}`))) {
    measurementRows.push(...firstAvailableRows(context, ['stop_rules']));
  }
  const audit = auditGrowthRecord({ experimentRows, artifactRows, activationRows, measurementRows }, context);
  return { title, summary, experimentRows, artifactRows, activationRows, measurementRows, audit };
}

function auditGrowthRecord(record = {}, context = {}) {
  const json = JSON.stringify(context || {}).toLowerCase();
  const hasExperimentPacket = /growth_experiment_packet|growthexperimentpacket|growth_packet|experiment_packet|no_paid_growth_plan_packet|nopaidgrowthplanpacket/.test(json);
  const activationText = JSON.stringify(record.activationRows || []).toLowerCase();
  const measurementText = JSON.stringify(record.measurementRows || []).toLowerCase();
  const activationOwnerReady = /activation_owner|activationowner|implementation_owner|growth_activation_handoff_packet|growthactivationhandoffpacket|organic_specialist_handoff_packet|organicspecialisthandoffpacket|owner_responsibility_map|ownerresponsibilitymap|activation owner|approval owner/.test(`${json} ${activationText}`);
  const measurementOwnerReady = /measurement_owner|measurementowner|measurement_surface|measurementsurface|owner_responsibility_map|ownerresponsibilitymap|measurement owner|measurement surface|proof_source|proofsource/.test(`${json} ${activationText} ${measurementText}`);
  return [
    { key: 'growth_experiment_packet', label: 'Experiment packet', ok: hasExperimentPacket, detail: hasExperimentPacket ? 'Growth experiment or no-paid growth plan source packet is retained.' : 'Missing growth_experiment_packet, no_paid_growth_plan_packet, or experiment_packet contract.' },
    { key: 'experiment_inputs', label: 'Experiment inputs', ok: record.experimentRows.length >= 3, detail: record.experimentRows.length >= 3 ? `${record.experimentRows.length} experiment row(s) retained.` : 'Need bottleneck, ICP/offer, hypothesis, or experiment packet rows.' },
    { key: 'exact_artifact_packet', label: 'Exact artifact', ok: record.artifactRows.length > 0, detail: record.artifactRows.length ? `${record.artifactRows.length} artifact/execution row(s) retained.` : 'Missing exact_artifact_packet or execution_packet.' },
    { key: 'activation_owner', label: 'Activation owner', ok: activationOwnerReady, detail: activationOwnerReady ? 'Activation owner or specialist handoff is attached.' : 'Missing activation owner or specialist handoff before launch.' },
    { key: 'measurement_owner', label: 'Measurement owner', ok: measurementOwnerReady, detail: measurementOwnerReady ? 'Measurement owner, surface, or proof owner is attached.' : 'Missing measurement owner or surface before launch.' },
    { key: 'review_date', label: 'Review date', ok: /review_date|reviewdate|next_review_date/.test(json), detail: /review_date|reviewdate|next_review_date/.test(json) ? 'Review date is retained.' : 'Missing review_date for the experiment decision.' },
    { key: 'metric_threshold', label: 'Metric threshold', ok: /metric_threshold|metricthreshold|success_metric|threshold|success_criteria/.test(json), detail: /metric_threshold|metricthreshold|success_metric|threshold|success_criteria/.test(json) ? 'Metric threshold is retained.' : 'Missing metric_threshold or success criteria.' },
    { key: 'kill_rule', label: 'Kill rule', ok: /kill_rule|killrule|stop_rule|stop_rules/.test(json), detail: /kill_rule|killrule|stop_rule|stop_rules/.test(json) ? 'Kill rule is retained.' : 'Missing kill_rule or stop_rules.' },
    { key: 'proof_tracker', label: 'Proof tracker', ok: /execution_proof_tracker|executionprooftracker|proof_tracker|proof_source|proofsource/.test(json), detail: /execution_proof_tracker|executionprooftracker|proof_tracker|proof_source|proofsource/.test(json) ? 'Execution proof tracker or proof source is retained.' : 'Missing proof tracker or proof source for follow-up operations.' }
  ];
}

function renderTable(el, headers = [], rows = []) {
  if (!el) return;
  if (!rows.length) {
    el.innerHTML = '<tbody><tr><td class="empty">No rows loaded yet.</td></tr></tbody>';
    return;
  }
  el.innerHTML = [
    `<thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}</tr></thead>`,
    `<tbody>${rows.map((item) => `<tr><td>${escapeHtml(item.label)}</td><td>${escapeHtml(item.detail)}</td><td>${escapeHtml(item.status || 'retained')}</td></tr>`).join('')}</tbody>`
  ].join('');
}

function readinessRows(record = growthRecord) {
  const packetRetained = record.audit.some((item) => item.key === 'growth_experiment_packet' && item.ok);
  const activationContractRows = retainedRowsFor(GROWTH_ACTIVATION_CONTRACT_TYPES);
  const metricRows = retainedRowsFor(['metric_threshold', 'tracking_specification', 'measurement_plan']);
  const killRows = retainedRowsFor(['kill_rule']);
  const proofRows = retainedRowsFor(['proof_source', 'execution_proof_tracker', 'execution_status_labels']);
  return [
    { label: 'Server context', ready: Boolean(importedContext), detail: importedContext ? 'Server-side growth packet is loaded.' : 'Send to CAIt will create the server-side growth packet reference.' },
    { label: 'Experiment packet', ready: packetRetained && record.experimentRows.length > 0, detail: packetRetained ? `${record.experimentRows.length} experiment row(s) retained from a Growth or no-paid plan packet.` : 'Add growth_experiment_packet, no_paid_growth_plan_packet, bottleneck, ICP/offer, or hypothesis.' },
    { label: 'Exact artifact', ready: record.artifactRows.length > 0, detail: record.artifactRows.length ? `${record.artifactRows.length} artifact row(s) retained.` : 'Add exact_artifact_packet or execution_packet.' },
    { label: 'Activation boundary', ready: activationContractRows.length > 0, detail: activationContractRows.length ? 'Activation, owner, approval, or review contract is visible.' : 'Add activation owner, approval owner, measurement owner, and review date.' },
    { label: 'Metric and kill rule', ready: metricRows.length > 0 && killRows.length > 0, detail: metricRows.length && killRows.length ? 'Tracking/metric and kill-rule contracts are retained.' : 'Add tracking_specification, metric_threshold, and kill_rule.' },
    { label: 'Proof tracker', ready: proofRows.length > 0, detail: proofRows.length ? 'Proof or execution status contract rows are retained.' : 'Add execution_proof_tracker and execution_status_labels.' }
  ];
}

function publisherLaunchRows(record = growthRecord) {
  const experimentRows = retainedRowsFor(GROWTH_PUBLISHER_REQUIRED_CONTRACT_GROUPS.experiment);
  const artifactRows = retainedRowsFor(GROWTH_PUBLISHER_REQUIRED_CONTRACT_GROUPS.artifact);
  const activationRows = retainedRowsFor(GROWTH_PUBLISHER_REQUIRED_CONTRACT_GROUPS.activation);
  const metricRows = retainedRowsFor(['metric_threshold', 'tracking_specification', 'measurement_plan']);
  const killRows = retainedRowsFor(['kill_rule']);
  const proofRows = retainedRowsFor(['proof_source', 'execution_proof_tracker', 'execution_status_labels']);
  const reviewRows = retainedRowsFor(['review_date', 'next_decision']);
  const experimentReady = Boolean(importedContext) && experimentRows.length > 0 && record.experimentRows.length > 0;
  const artifactReady = artifactRows.length > 0 && record.artifactRows.length > 0;
  const activationReady = activationRows.length > 0;
  const measurementReady = metricRows.length > 0 && killRows.length > 0 && proofRows.length > 0 && reviewRows.length > 0;
  return [
    { label: 'Experiment source', ready: experimentReady, detail: experimentReady ? `${experimentRows.length} explicit Growth experiment contract row(s) retained.` : 'Load a server-side growth_experiment_packet or no_paid_growth_plan_packet first.' },
    { label: 'Draftable artifact', ready: artifactReady, detail: artifactReady ? `${artifactRows.length} explicit artifact contract row(s) retained.` : 'Add explicit exact_artifact_packet, page_or_channel_artifact, or growth_asset_handoff_packet before Publisher review.' },
    { label: 'Approval owner', ready: activationReady, detail: activationReady ? `${activationRows.length} explicit activation/owner contract row(s) retained.` : 'Add explicit activation owner, approval owner, owner map, or growth activation handoff before opening Publisher.' },
    { label: 'Measurement guardrail', ready: measurementReady, detail: measurementReady ? `${metricRows.length + killRows.length + proofRows.length + reviewRows.length} explicit measurement contract row(s) retained.` : 'Add explicit metric threshold, proof source, review date or next decision, and kill rule.' }
  ];
}

function publisherLaunchReady() {
  return publisherLaunchRows().every((item) => item.ready);
}

function buildPublisherLaunchBlockerPacket(rows = publisherLaunchRows()) {
  return buildCaitAppContext({
    source_app: 'growth_experiment_console',
    source_app_label: 'Growth Experiment Console',
    title: 'Publisher launch packet not ready',
    summary: 'Growth Experiment Console will not synthesize Publisher delivery artifacts until the required Growth contracts are explicit.',
    facts: rows.map((item) => `${item.label}: ${item.ready ? 'ready' : 'missing'}`),
    artifacts: [{
      type: 'growth_publisher_handoff_audit',
      artifact_type: 'growth_publisher_handoff_audit',
      title: 'Growth to Publisher readiness audit',
      rows
    }],
    recommended_next_actions: [
      'Return to CAIt or the responsible Growth leader and request explicit Growth experiment, artifact, activation, and measurement contracts.',
      'Open Publisher only after those contracts are retained in a server-side app context.'
    ],
    handoff_targets: ['growth-experiment-console'],
    raw_context: {
      chat_handoff_id: chatHandoffId(),
      chat_return_to: chatReturnTo(),
      received_context: importedContext,
      growth_to_publisher_lane: {
        ready: rows.filter((item) => item.ready).map((item) => item.label),
        missing: rows.filter((item) => !item.ready).map((item) => item.label)
      }
    }
  });
}

function buildPublisherLaunchPacket() {
  const launchRows = publisherLaunchRows();
  if (!launchRows.every((item) => item.ready)) return buildPublisherLaunchBlockerPacket(launchRows);
  const experimentSummary = rowsText(growthRecord.experimentRows, 1400);
  const artifactSummary = rowsText(growthRecord.artifactRows, 1400);
  const activationSummary = rowsText(growthRecord.activationRows, 1000);
  const measurementSummary = rowsText(growthRecord.measurementRows, 1200);
  const hypothesis = firstMatchingRow(growthRecord.experimentRows, /hypothesis|仮説/i);
  const offer = firstMatchingRow(growthRecord.experimentRows, /icp|offer|audience|target/i);
  const threshold = firstMatchingRow(growthRecord.measurementRows, /threshold|metric|success|criteria/i);
  const killRule = firstMatchingRow(growthRecord.measurementRows, /kill|stop/i);
  const proof = firstMatchingRow(growthRecord.measurementRows, /proof|source|evidence/i);
  const review = firstMatchingRow(growthRecord.measurementRows, /review|date|next decision|continue/i);
  const owner = firstMatchingRow(growthRecord.activationRows, /owner|approval/i);
  const title = text(growthRecord.title, 'Growth experiment activation');
  const pageTitle = `${title} activation page`;
  const risk = [
    killRule ? `Kill rule: ${killRule.detail}` : '',
    threshold ? `Threshold: ${threshold.detail}` : '',
    proof ? `Proof source: ${proof.detail}` : ''
  ].filter(Boolean).join(' ');
  const body = [
    `Experiment source:\n${experimentSummary || growthRecord.summary}`,
    artifactSummary ? `\nActivation artifact:\n${artifactSummary}` : '',
    activationSummary ? `\nApproval and owner:\n${activationSummary}` : '',
    measurementSummary ? `\nMeasurement and stop rule:\n${measurementSummary}` : ''
  ].filter(Boolean).join('\n\n');
  return buildCaitAppContext({
    source_app: 'growth_experiment_console',
    source_app_label: 'Growth Experiment Console',
    title: `Publisher launch packet: ${title}`,
    summary: 'Growth Experiment Console is handing the retained experiment into Publisher so planning becomes approval-ready publishing work.',
    facts: [
      `Growth experiment: ${title}`,
      hypothesis ? `Hypothesis: ${hypothesis.detail}` : '',
      offer ? `ICP / offer: ${offer.detail}` : '',
      owner ? `Approval owner: ${owner.detail}` : '',
      threshold ? `Metric threshold: ${threshold.detail}` : '',
      killRule ? `Kill rule: ${killRule.detail}` : '',
      proof ? `Proof source: ${proof.detail}` : '',
      review ? `Review / next decision: ${review.detail}` : '',
      'Publisher lane: LP/page packet, social copy packet, and approval request are generated from retained Growth context.'
    ].filter(Boolean),
    artifacts: [
      {
        type: 'site_publish_packet',
        artifact_type: 'site_publish_packet',
        contract_type: 'site_publish_packet',
        item_type: 'page',
        channel_key: 'owned_site',
        destination: 'Owned site / Publisher',
        connector: 'publisher',
        connector_capability: 'site_publish_packet',
        publish_method: 'publisher_review_or_selected_connector',
        action_type: 'publish_change',
        market: 'Global',
        locale: 'en',
        owner: owner?.detail || 'Growth owner',
        title: pageTitle,
        slug: slugFromTitle(title),
        meta: hypothesis ? hypothesis.detail : growthRecord.summary,
        h1: title,
        primary_cta: 'Start retained growth experiment',
        body,
        status: 'needs approval',
        risk: risk || 'Review growth hypothesis, artifact, measurement threshold, proof source, and kill rule before publishing.'
      },
      {
        type: 'social_copy_packet',
        artifact_type: 'social_copy_packet',
        contract_type: 'social_copy_packet',
        item_type: 'post',
        channel_key: 'social',
        destination: 'Social copy packet',
        connector: 'manual',
        connector_capability: 'manual.copy',
        publish_method: 'manual_social_copy',
        action_type: 'social_post',
        title: `${title} social post`,
        body: [
          hypothesis ? hypothesis.detail : growthRecord.summary,
          threshold ? `Success check: ${threshold.detail}` : '',
          proof ? `Proof: ${proof.detail}` : ''
        ].filter(Boolean).join('\n'),
        status: 'needs approval',
        risk: 'Social copy must match the approved Growth experiment and Publisher review state.'
      },
      {
        type: 'growth_experiment_packet',
        title,
        rows: growthRecord.experimentRows
      },
      {
        type: 'growth_measurement_guardrail',
        rows: growthRecord.measurementRows
      }
    ],
    approval_requests: [{
      id: `growth-publisher-${Date.now().toString(36)}`,
      title: `Approve Publisher activation for ${title}`,
      artifact_type: 'site_publish_packet',
      action_type: 'publish_change',
      status: 'needs approval',
      channel: 'owned_site',
      connector: 'publisher',
      connector_capability: 'site_publish_packet',
      destination: 'Owned site / Publisher',
      market: 'Global',
      locale: 'en',
      blocker: risk || 'Growth activation requires Publisher approval before publication.'
    }],
    recommended_next_actions: [
      'Open Publisher, review the generated LP/page packet, and approve or request changes.',
      'Ask CAIt from Publisher to draft final LP and social variants only after the Growth hypothesis and measurement guardrails are accepted.',
      'Return Publisher approval and execution proof back to Growth before deciding continue or stop.'
    ],
    handoff_targets: ['publisher-approval-studio', 'cmo_leader', 'seo_specialist'],
    raw_context: {
      chat_handoff_id: chatHandoffId(),
      chat_return_to: chatReturnTo(),
      received_context: importedContext,
      source_growth_packet: contextPacket(),
      growth_to_publisher_lane: {
        ready: publisherLaunchRows().filter((item) => item.ready).map((item) => item.label),
        missing: publisherLaunchRows().filter((item) => !item.ready).map((item) => item.label)
      }
    }
  });
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

function contextPacket() {
  const ready = growthRecord.audit.filter((item) => item.ok);
  const noPaidGrowthRows = retainedRowsFor(['no_paid_growth_plan_packet']);
  const organicSpecialistRows = retainedRowsFor(['organic_specialist_handoff_packet']);
  const exactArtifactRows = retainedRowsFor(['exact_artifact_packet', 'page_or_channel_artifact']);
  const nextDecisionRows = retainedRowsFor(['next_decision']);
  return buildCaitAppContext({
    source_app: 'growth_experiment_console',
    source_app_label: 'Growth Experiment Console',
    title: growthRecord.title,
    summary: growthRecord.summary,
    facts: [
      `${ready.length}/${growthRecord.audit.length || 9} growth anchors retained`,
      importedContext ? 'Server-side app context loaded before returning to CAIt.' : 'No imported server-side context loaded yet.'
    ],
    artifacts: [
      { type: 'growth_experiment_packet', title: growthRecord.title, rows: growthRecord.experimentRows },
      { type: 'no_paid_growth_plan_packet', title: 'No-paid growth plan packet', rows: noPaidGrowthRows },
      { type: 'organic_specialist_handoff_packet', title: 'Organic specialist handoff packet', rows: organicSpecialistRows },
      { type: 'exact_artifact_packet', title: 'Exact artifact packet', rows: exactArtifactRows.length ? exactArtifactRows : growthRecord.artifactRows },
      { type: 'growth_asset_handoff_packet', title: 'Exact artifact handoff', rows: growthRecord.artifactRows },
      { type: 'growth_activation_handoff_packet', title: 'Activation handoff', rows: growthRecord.activationRows },
      { type: 'tracking_specification', title: 'Measurement and tracking', rows: growthRecord.measurementRows },
      { type: 'execution_proof_tracker', title: 'Execution proof tracker', rows: growthRecord.measurementRows },
      { type: 'handoff_audit', title: 'Growth handoff audit', rows: growthRecord.audit }
    ],
    metrics: [
      { label: 'experiment_rows', value: growthRecord.experimentRows.length },
      { label: 'artifact_rows', value: growthRecord.artifactRows.length },
      { label: 'activation_rows', value: growthRecord.activationRows.length },
      { label: 'measurement_rows', value: growthRecord.measurementRows.length },
      { label: 'anchors_ready', value: ready.length }
    ],
    approval_requests: growthRecord.activationRows.some((item) => /approval|owner|launch|activate/i.test(`${item.label} ${item.detail}`))
      ? [{ id: 'growth-activation-approval', action_type: 'growth_activation', status: 'needs approval', title: 'Approve growth activation before execution' }]
      : [],
    recommended_next_actions: [
      'Review retained experiment, artifact, owner, threshold, kill rule, proof tracker, and review date before asking CAIt to continue.',
      'Do not launch traffic, publish assets, change product surfaces, or claim results until owner approval and proof are attached.'
    ],
    handoff_targets: ['growth-experiment-console', 'growth', 'campaign_operations', 'analytics_console'],
    raw_context: {
      chat_handoff_id: chatHandoffId(),
      chat_return_to: chatReturnTo(),
      received_context: importedContext,
      no_paid_growth_plan_packet: noPaidGrowthRows,
      organic_specialist_handoff_packet: organicSpecialistRows,
      exact_artifact_packet: exactArtifactRows,
      growth_handoff_audit: {
        ready: ready.map((item) => item.key),
        missing: growthRecord.audit.filter((item) => !item.ok).map((item) => item.key)
      },
      growth_experiment_rows: growthRecord.experimentRows,
      growth_artifact_rows: growthRecord.artifactRows,
      growth_activation_rows: growthRecord.activationRows,
      growth_measurement_rows: growthRecord.measurementRows,
      next_decision: nextDecisionRows.length ? nextDecisionRows : (growthRecord.measurementRows.find((item) => /next decision|decision rule|continue|stop/i.test(`${item.label} ${item.detail}`)) || null)
    }
  });
}

function renderNotice() {
  const returnTo = chatReturnTo();
  if (els.returnToChatLink && returnTo) {
    els.returnToChatLink.href = returnTo;
    els.returnToChatLink.hidden = false;
  }
  if (!els.growthHandoffNotice) return;
  const handoff = chatHandoffId();
  if (importedContext) {
    els.growthHandoffNotice.hidden = false;
    els.growthHandoffNotice.textContent = `CAIt growth handoff session is attached${handoff ? ` (${handoff})` : ''}. This console is using a server-side app context packet.`;
  } else if (returnTo || handoff) {
    els.growthHandoffNotice.hidden = false;
    els.growthHandoffNotice.textContent = 'CAIt growth handoff session is attached, but no server packet is loaded yet. Send to CAIt will create the retained growth experiment packet.';
  } else {
    els.growthHandoffNotice.hidden = true;
  }
}

function renderAudit() {
  const ready = growthRecord.audit.filter((item) => item.ok).length;
  if (els.growthHandoffAuditPill) {
    els.growthHandoffAuditPill.textContent = growthRecord.audit.length ? `${ready} / ${growthRecord.audit.length} anchors` : 'No packet audited';
    els.growthHandoffAuditPill.className = `status-pill ${ready === growthRecord.audit.length ? 'ready' : 'pending'}`;
  }
  if (els.growthHandoffAuditSummary) {
    els.growthHandoffAuditSummary.textContent = growthRecord.audit.length
      ? (ready === growthRecord.audit.length ? 'All growth experiment anchors are present for stable CAIt follow-up.' : `${growthRecord.audit.length - ready} growth anchor(s) need attention before this can become stable experiment operations.`)
      : 'Open this app from a Growth handoff to audit experiment, artifact, activation, measurement, proof, and review continuity.';
  }
  if (els.growthHandoffAuditList) {
    els.growthHandoffAuditList.innerHTML = growthRecord.audit.map((item) => [
      `<article class="handoff-audit-item ${item.ok ? 'ready' : 'missing'}">`,
      `<strong>${escapeHtml(item.label)}</strong>`,
      `<span>${escapeHtml(item.ok ? 'ready' : 'missing')}</span>`,
      `<p>${escapeHtml(item.detail)}</p>`,
      '</article>'
    ].join('')).join('');
  }
}

function renderReadiness() {
  const items = readinessRows();
  const ready = items.filter((item) => item.ready).length;
  if (els.growthReadinessPill) {
    els.growthReadinessPill.textContent = `${ready}/${items.length} ops checks ready`;
    els.growthReadinessPill.className = `status-pill ${ready === items.length ? 'ready' : 'pending'}`;
  }
  if (els.growthReadinessList) {
    els.growthReadinessList.innerHTML = items.map((item) => [
      `<div class="ops-readiness-item ${item.ready ? 'ready' : 'pending'}">`,
      `<span>${escapeHtml(item.label)}</span>`,
      `<strong>${escapeHtml(item.ready ? 'Ready' : 'Needed')}</strong>`,
      `<p>${escapeHtml(item.detail)}</p>`,
      '</div>'
    ].join('')).join('');
  }
  if (els.growthStepExperiment) els.growthStepExperiment.classList.toggle('current', growthRecord.experimentRows.length > 0);
  if (els.growthStepActivation) els.growthStepActivation.classList.toggle('current', growthRecord.artifactRows.length > 0 || growthRecord.activationRows.length > 0);
  if (els.growthStepMeasurement) els.growthStepMeasurement.classList.toggle('current', growthRecord.measurementRows.length > 0);
  if (els.growthStepPublisher) els.growthStepPublisher.classList.toggle('current', publisherLaunchReady());
}

function renderPublisherLane() {
  const items = publisherLaunchRows();
  const ready = items.filter((item) => item.ready).length;
  const allReady = ready === items.length;
  if (els.growthPublisherPill) {
    els.growthPublisherPill.textContent = allReady ? 'Publisher packet ready' : `${ready}/${items.length} publisher checks ready`;
    els.growthPublisherPill.className = `status-pill ${allReady ? 'ready' : 'pending'}`;
  }
  if (els.growthPublisherSummary) {
    els.growthPublisherSummary.textContent = allReady
      ? 'This Growth experiment can open Publisher with LP/page, social copy, approval request, and measurement guardrails attached.'
      : 'Complete missing Growth anchors before Publisher can open; no publish packet is synthesized from partial context.';
  }
  if (els.growthPublisherList) {
    els.growthPublisherList.innerHTML = items.map((item) => [
      `<div class="ops-readiness-item ${item.ready ? 'ready' : 'pending'}">`,
      `<span>${escapeHtml(item.label)}</span>`,
      `<strong>${escapeHtml(item.ready ? 'Ready' : 'Needed')}</strong>`,
      `<p>${escapeHtml(item.detail)}</p>`,
      '</div>'
    ].join('')).join('');
  }
  if (els.openGrowthPublisherBtn) els.openGrowthPublisherBtn.disabled = !allReady;
  if (els.copyGrowthPublisherBtn) els.copyGrowthPublisherBtn.disabled = !allReady;
}

function render() {
  if (els.growthRecordTitle) els.growthRecordTitle.textContent = growthRecord.title;
  if (els.growthRecordMeta) els.growthRecordMeta.textContent = growthRecord.summary;
  if (els.growthExperimentMetric) els.growthExperimentMetric.textContent = String(growthRecord.experimentRows.length);
  if (els.growthArtifactMetric) els.growthArtifactMetric.textContent = String(growthRecord.artifactRows.length);
  if (els.growthActivationMetric) els.growthActivationMetric.textContent = String(growthRecord.activationRows.length);
  if (els.growthMeasurementMetric) els.growthMeasurementMetric.textContent = String(growthRecord.measurementRows.length);
  renderTable(els.growthExperimentTable, ['Anchor', 'Detail', 'Status'], growthRecord.experimentRows);
  renderTable(els.growthActivationTable, ['Gate', 'Detail', 'Status'], [...growthRecord.artifactRows, ...growthRecord.activationRows]);
  renderTable(els.growthMeasurementTable, ['Check', 'Detail', 'Status'], growthRecord.measurementRows);
  renderNotice();
  renderAudit();
  renderReadiness();
  renderPublisherLane();
  if (els.growthContextPreview) els.growthContextPreview.textContent = JSON.stringify(contextPacket(), null, 2);
  if (els.growthPublisherPreview) els.growthPublisherPreview.textContent = JSON.stringify(buildPublisherLaunchPacket(), null, 2);
}

async function sameOriginCsrfToken() {
  try {
    const response = await fetch('/auth/status', { headers: { accept: 'application/json' }, credentials: 'same-origin' });
    if (!response.ok) return '';
    const data = await response.json().catch(() => ({}));
    return text(data?.csrfToken);
  } catch {
    return '';
  }
}

async function createPublisherServerContext(context = {}) {
  const headers = { 'content-type': 'application/json', accept: 'application/json' };
  const csrfToken = await sameOriginCsrfToken();
  if (csrfToken) headers['x-aiagent2-csrf'] = csrfToken;
  const response = await fetch('/api/app-contexts', {
    method: 'POST',
    headers,
    credentials: 'same-origin',
    body: JSON.stringify({
      app_id: 'publisher-approval-studio',
      context
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.app_context_id) throw new Error(text(data?.error, `Publisher context create failed (${response.status})`));
  return data;
}

async function openPublisherWithGrowthPacket() {
  if (!els.openGrowthPublisherBtn) return;
  if (!publisherLaunchReady()) {
    if (els.growthHandoffNotice) {
      els.growthHandoffNotice.hidden = false;
      els.growthHandoffNotice.textContent = 'Publisher packet is not ready. Complete the explicit Growth experiment, artifact, activation, and measurement contracts first.';
    }
    return;
  }
  const previous = els.openGrowthPublisherBtn.textContent;
  els.openGrowthPublisherBtn.disabled = true;
  els.openGrowthPublisherBtn.textContent = 'Opening Publisher...';
  try {
    const record = await createPublisherServerContext(buildPublisherLaunchPacket());
    const url = new URL('/publisher-approval.html', window.location.origin);
    url.searchParams.set('cait_app_context_id', record.app_context_id);
    if (record.app_context_token) url.searchParams.set('cait_app_context_token', record.app_context_token);
    const returnTo = chatReturnTo();
    if (returnTo) url.searchParams.set('chat_return_to', returnTo);
    const handoff = chatHandoffId();
    if (handoff) url.searchParams.set('chat_handoff_id', handoff);
    window.location.href = `${url.pathname}${url.search}`;
  } catch (error) {
    els.openGrowthPublisherBtn.disabled = false;
    els.openGrowthPublisherBtn.textContent = previous;
    if (els.growthHandoffNotice) {
      els.growthHandoffNotice.hidden = false;
      els.growthHandoffNotice.textContent = `Could not open Publisher packet: ${text(error?.message, 'unknown error')}`;
    }
  }
}

async function init() {
  importedContext = await fetchCaitAppContextFromUrl();
  growthRecord = collectGrowthRecord(importedContext);
  render();
}

if (els.copyGrowthContextBtn) {
  els.copyGrowthContextBtn.onclick = async () => {
    try {
      await copyContextJson(contextPacket());
      els.copyGrowthContextBtn.textContent = 'Copied';
      window.setTimeout(() => { els.copyGrowthContextBtn.textContent = 'Copy packet'; }, 1200);
    } catch (error) {
      els.copyGrowthContextBtn.textContent = 'Copy packet';
      if (els.growthHandoffNotice) {
        els.growthHandoffNotice.hidden = false;
        els.growthHandoffNotice.textContent = `Could not copy growth context: ${text(error?.message, 'clipboard unavailable')}`;
      }
    }
  };
}

if (els.sendGrowthContextBtn) {
  els.sendGrowthContextBtn.onclick = async () => {
    els.sendGrowthContextBtn.disabled = true;
    els.sendGrowthContextBtn.textContent = 'Sending...';
    try {
      await sendContextToCait(contextPacket(), { returnTo: chatReturnTo() || '/chat' });
      els.sendGrowthContextBtn.textContent = 'Sent';
    } catch (error) {
      els.sendGrowthContextBtn.disabled = false;
      els.sendGrowthContextBtn.textContent = 'Send to CAIt';
      if (els.growthHandoffNotice) {
        els.growthHandoffNotice.hidden = false;
        els.growthHandoffNotice.textContent = `Could not send growth context: ${text(error?.message, 'unknown error')}`;
      }
    }
  };
}

if (els.copyGrowthPublisherBtn) {
  els.copyGrowthPublisherBtn.onclick = async () => {
    try {
      if (!publisherLaunchReady()) throw new Error('Publisher packet is not ready; complete the explicit Growth contracts first.');
      await copyContextJson(buildPublisherLaunchPacket());
      els.copyGrowthPublisherBtn.textContent = 'Copied';
      window.setTimeout(() => { els.copyGrowthPublisherBtn.textContent = 'Copy Publisher packet'; }, 1200);
    } catch (error) {
      els.copyGrowthPublisherBtn.textContent = 'Copy Publisher packet';
      if (els.growthHandoffNotice) {
        els.growthHandoffNotice.hidden = false;
        els.growthHandoffNotice.textContent = `Could not copy Publisher packet: ${text(error?.message, 'clipboard unavailable')}`;
      }
    }
  };
}

if (els.openGrowthPublisherBtn) {
  els.openGrowthPublisherBtn.onclick = () => {
    void openPublisherWithGrowthPacket();
  };
}

init();
