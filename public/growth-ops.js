import { buildCaitAppContext, copyContextJson, fetchCaitAppContextFromUrl, sendContextToCait } from './cait-app-bridge.js?v=20260526f';

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
  growth_experiment_packet: Object.freeze(['growthExperimentPacket', 'growth_packet', 'growthPacket', 'experiment_packet', 'experimentPacket', 'growth_plan_packet', 'growthPlanPacket']),
  growth_asset_handoff_packet: Object.freeze(['growthAssetHandoffPacket', 'growth_asset_packet', 'growthAssetPacket', 'asset_handoff_packet', 'assetHandoffPacket']),
  growth_activation_handoff_packet: Object.freeze(['growthActivationHandoffPacket', 'growth_activation_packet', 'growthActivationPacket', 'activation_handoff_packet', 'activationHandoffPacket']),
  bottleneck: Object.freeze(['growth_bottleneck', 'growthBottleneck']),
  icp_and_offer: Object.freeze(['icpAndOffer', 'icp_offer', 'icpOffer', 'target_segment_offer', 'targetSegmentOffer']),
  experiment_hypothesis: Object.freeze(['experimentHypothesis', 'hypothesis', 'growth_hypothesis', 'growthHypothesis']),
  exact_artifact_packet: Object.freeze(['exactArtifactPacket', 'artifact_packet', 'artifactPacket', 'exact_copy_or_page_or_channel_artifact', 'exactCopyOrPageOrChannelArtifact']),
  execution_packet: Object.freeze(['executionPacket', 'activation_packet', 'activationPacket']),
  tracking_specification: Object.freeze(['trackingSpecification', 'tracking_spec', 'trackingSpec', 'measurement_spec', 'measurementSpec']),
  metric_threshold: Object.freeze(['metricThreshold', 'success_metric', 'successMetric', 'threshold']),
  kill_rule: Object.freeze(['killRule', 'stop_rule', 'stopRule']),
  activation_owner: Object.freeze(['activationOwner', 'implementation_owner', 'implementationOwner']),
  approval_owner: Object.freeze(['approvalOwner']),
  measurement_owner: Object.freeze(['measurementOwner']),
  review_date: Object.freeze(['reviewDate', 'next_review_date', 'nextReviewDate']),
  execution_proof_tracker: Object.freeze(['executionProofTracker', 'proof_tracker', 'proofTracker']),
  execution_status_labels: Object.freeze(['executionStatusLabels', 'execution_status', 'executionStatus', 'status_labels', 'statusLabels']),
  measurement_plan: Object.freeze(['measurementPlan', 'measurement_checks', 'measurementChecks', 'conversion_tracking_plan', 'conversionTrackingPlan', 'tracking_plan', 'trackingPlan'])
});

const GROWTH_MARKDOWN_ARTIFACT_TYPES = Object.freeze([
  'growth_experiment_packet',
  'growth_asset_handoff_packet',
  'growth_activation_handoff_packet',
  'growth_packet',
  'experiment_packet',
  'bottleneck',
  'icp_and_offer',
  'experiment_hypothesis',
  'exact_artifact_packet',
  'execution_packet',
  'tracking_specification',
  'metric_threshold',
  'kill_rule',
  'activation_owner',
  'approval_owner',
  'measurement_owner',
  'review_date',
  'execution_proof_tracker',
  'execution_status_labels',
  'measurement_plan'
]);

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

function uniqueRows(rows = []) {
  const seen = new Set();
  return rows.filter((item) => {
    const key = `${item.label}|${item.detail}|${item.status}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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
    ...rowsFor(context, ['growth_experiment_packet', 'bottleneck', 'icp_and_offer', 'experiment_hypothesis']),
    ...markdownRowsFor(context, ['growth_experiment_packet', 'bottleneck', 'icp_and_offer', 'experiment_hypothesis'])
  ]);
  const artifactRows = uniqueRows([
    ...rowsFor(context, ['growth_asset_handoff_packet', 'exact_artifact_packet', 'execution_packet']),
    ...markdownRowsFor(context, ['growth_asset_handoff_packet', 'exact_artifact_packet', 'execution_packet'])
  ]);
  const activationRows = uniqueRows([
    ...rowsFor(context, ['growth_activation_handoff_packet', 'activation_owner', 'approval_owner', 'measurement_owner', 'review_date']),
    ...markdownRowsFor(context, ['growth_activation_handoff_packet', 'activation_owner', 'approval_owner', 'measurement_owner', 'review_date'])
  ]);
  const measurementRows = uniqueRows([
    ...rowsFor(context, ['tracking_specification', 'metric_threshold', 'kill_rule', 'execution_proof_tracker', 'execution_status_labels', 'measurement_plan']),
    ...markdownRowsFor(context, ['tracking_specification', 'metric_threshold', 'kill_rule', 'execution_proof_tracker', 'execution_status_labels', 'measurement_plan'])
  ]);
  const audit = auditGrowthRecord({ experimentRows, artifactRows, activationRows, measurementRows }, context);
  return { title, summary, experimentRows, artifactRows, activationRows, measurementRows, audit };
}

function auditGrowthRecord(record = {}, context = {}) {
  const json = JSON.stringify(context || {}).toLowerCase();
  const hasExperimentPacket = /growth_experiment_packet|growthexperimentpacket|growth_packet|experiment_packet/.test(json);
  return [
    { key: 'growth_experiment_packet', label: 'Experiment packet', ok: hasExperimentPacket, detail: hasExperimentPacket ? 'Growth experiment source packet is retained.' : 'Missing growth_experiment_packet or experiment_packet contract.' },
    { key: 'experiment_inputs', label: 'Experiment inputs', ok: record.experimentRows.length >= 3, detail: record.experimentRows.length >= 3 ? `${record.experimentRows.length} experiment row(s) retained.` : 'Need bottleneck, ICP/offer, hypothesis, or experiment packet rows.' },
    { key: 'exact_artifact_packet', label: 'Exact artifact', ok: record.artifactRows.length > 0, detail: record.artifactRows.length ? `${record.artifactRows.length} artifact/execution row(s) retained.` : 'Missing exact_artifact_packet or execution_packet.' },
    { key: 'activation_owner', label: 'Activation owner', ok: /activation_owner|activationowner|implementation_owner/.test(json), detail: /activation_owner|activationowner|implementation_owner/.test(json) ? 'Activation owner is attached.' : 'Missing activation owner before launch.' },
    { key: 'measurement_owner', label: 'Measurement owner', ok: /measurement_owner|measurementowner/.test(json), detail: /measurement_owner|measurementowner/.test(json) ? 'Measurement owner is attached.' : 'Missing measurement owner before launch.' },
    { key: 'review_date', label: 'Review date', ok: /review_date|reviewdate|next_review_date/.test(json), detail: /review_date|reviewdate|next_review_date/.test(json) ? 'Review date is retained.' : 'Missing review_date for the experiment decision.' },
    { key: 'metric_threshold', label: 'Metric threshold', ok: /metric_threshold|metricthreshold|success_metric|threshold/.test(json), detail: /metric_threshold|metricthreshold|success_metric|threshold/.test(json) ? 'Metric threshold is retained.' : 'Missing metric_threshold.' },
    { key: 'kill_rule', label: 'Kill rule', ok: /kill_rule|killrule|stop_rule/.test(json), detail: /kill_rule|killrule|stop_rule/.test(json) ? 'Kill rule is retained.' : 'Missing kill_rule.' },
    { key: 'proof_tracker', label: 'Proof tracker', ok: /execution_proof_tracker|executionprooftracker|proof_tracker/.test(json), detail: /execution_proof_tracker|executionprooftracker|proof_tracker/.test(json) ? 'Execution proof tracker is retained.' : 'Missing proof tracker for follow-up operations.' }
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
  return [
    { label: 'Server context', ready: Boolean(importedContext), detail: importedContext ? 'Server-side growth packet is loaded.' : 'Send to CAIt will create the server-side growth packet reference.' },
    { label: 'Experiment packet', ready: record.experimentRows.length >= 3, detail: record.experimentRows.length >= 3 ? `${record.experimentRows.length} experiment row(s) retained.` : 'Add bottleneck, ICP/offer, hypothesis, or experiment packet.' },
    { label: 'Exact artifact', ready: record.artifactRows.length > 0, detail: record.artifactRows.length ? `${record.artifactRows.length} artifact row(s) retained.` : 'Add exact_artifact_packet or execution_packet.' },
    { label: 'Activation boundary', ready: record.activationRows.some((item) => /owner|approval|review/i.test(`${item.label} ${item.detail}`)), detail: record.activationRows.length ? 'Owner, approval, or review state is visible.' : 'Add activation owner, approval owner, measurement owner, and review date.' },
    { label: 'Metric and kill rule', ready: record.measurementRows.some((item) => /threshold|metric|kill|stop/i.test(`${item.label} ${item.detail}`)), detail: record.measurementRows.length ? 'Tracking, threshold, or stop rule is retained.' : 'Add tracking_specification, metric_threshold, and kill_rule.' },
    { label: 'Proof tracker', ready: record.measurementRows.some((item) => /proof|status|launch|measured/i.test(`${item.label} ${item.detail}`)), detail: record.measurementRows.some((item) => /proof|status|launch|measured/i.test(`${item.label} ${item.detail}`)) ? 'Proof or execution status rows are retained.' : 'Add execution_proof_tracker and execution_status_labels.' }
  ];
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
      growth_handoff_audit: {
        ready: ready.map((item) => item.key),
        missing: growthRecord.audit.filter((item) => !item.ok).map((item) => item.key)
      },
      growth_experiment_rows: growthRecord.experimentRows,
      growth_artifact_rows: growthRecord.artifactRows,
      growth_activation_rows: growthRecord.activationRows,
      growth_measurement_rows: growthRecord.measurementRows
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
  if (els.growthContextPreview) els.growthContextPreview.textContent = JSON.stringify(contextPacket(), null, 2);
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

init();
