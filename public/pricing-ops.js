import { buildCaitAppContext, copyContextJson, fetchCaitAppContextFromUrl, sendContextToCait } from './cait-app-bridge.js?v=20260526d';

const els = {
  returnToChatLink: document.getElementById('pricingReturnToChatLink'),
  sendPricingContextBtn: document.getElementById('sendPricingContextBtn'),
  copyPricingContextBtn: document.getElementById('copyPricingContextBtn'),
  pricingHandoffNotice: document.getElementById('pricingHandoffNotice'),
  pricingReadinessPill: document.getElementById('pricingReadinessPill'),
  pricingReadinessList: document.getElementById('pricingReadinessList'),
  pricingHandoffAuditPill: document.getElementById('pricingHandoffAuditPill'),
  pricingHandoffAuditSummary: document.getElementById('pricingHandoffAuditSummary'),
  pricingHandoffAuditList: document.getElementById('pricingHandoffAuditList'),
  pricingStepModel: document.getElementById('pricingStepModel'),
  pricingStepApproval: document.getElementById('pricingStepApproval'),
  pricingStepProof: document.getElementById('pricingStepProof'),
  pricingQuestionMetric: document.getElementById('pricingQuestionMetric'),
  pricingScenarioMetric: document.getElementById('pricingScenarioMetric'),
  pricingApprovalMetric: document.getElementById('pricingApprovalMetric'),
  pricingProofMetric: document.getElementById('pricingProofMetric'),
  pricingRecordTitle: document.getElementById('pricingRecordTitle'),
  pricingRecordMeta: document.getElementById('pricingRecordMeta'),
  pricingDecisionTable: document.getElementById('pricingDecisionTable'),
  pricingScenarioTable: document.getElementById('pricingScenarioTable'),
  pricingRiskTable: document.getElementById('pricingRiskTable'),
  pricingContextPreview: document.getElementById('pricingContextPreview')
};

let importedContext = null;
let pricingRecord = emptyPricingRecord();

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

const PRICING_CONTRACT_ALIASES = Object.freeze({
  pricing_decision_packet: Object.freeze(['pricingDecisionPacket', 'pricing_packet', 'pricingPacket', 'pricing_model_packet', 'pricingModelPacket', 'price_change_packet', 'priceChangePacket']),
  cfo_decision_packet: Object.freeze(['cfoDecisionPacket', 'cfo_packet', 'cfoPacket', 'finance_decision_packet', 'financeDecisionPacket']),
  pricing_question: Object.freeze(['pricingQuestion', 'decision_question', 'decisionQuestion', 'price_question', 'priceQuestion']),
  value_metric: Object.freeze(['valueMetric', 'billing_metric', 'billingMetric', 'pricing_metric', 'pricingMetric']),
  assumptions: Object.freeze(['assumption_table', 'assumptionTable', 'pricing_assumptions', 'pricingAssumptions']),
  source_to_model_ledger: Object.freeze(['sourceToModelLedger', 'source_model_ledger', 'sourceModelLedger', 'evidence_ledger', 'evidenceLedger']),
  formula: Object.freeze(['formula_model', 'formulaModel', 'pricing_formula', 'pricingFormula']),
  scenario_table: Object.freeze(['scenarioTable', 'scenarios', 'pricing_scenarios', 'pricingScenarios']),
  sensitivity_table: Object.freeze(['sensitivityTable', 'sensitivity', 'sensitivity_analysis', 'sensitivityAnalysis']),
  recommendation: Object.freeze(['recommended_price', 'recommendedPrice', 'pricing_recommendation', 'pricingRecommendation']),
  approval_owner: Object.freeze(['approvalOwner', 'decision_owner', 'decisionOwner']),
  price_change_handoff: Object.freeze(['priceChangeHandoff', 'price_change_packet', 'priceChangePacket', 'pricing_handoff', 'pricingHandoff']),
  execution_proof_tracker: Object.freeze(['executionProofTracker', 'proof_tracker', 'proofTracker']),
  execution_status_labels: Object.freeze(['executionStatusLabels', 'execution_status', 'executionStatus', 'status_labels', 'statusLabels']),
  decision_trigger: Object.freeze(['decisionTrigger', 'trigger', 'decision_rule', 'decisionRule']),
  rollback_or_continue_rule: Object.freeze(['rollbackOrContinueRule', 'rollback_rule', 'rollbackRule', 'continue_rule', 'continueRule'])
});

const PRICING_MARKDOWN_ARTIFACT_TYPES = Object.freeze([
  'pricing_decision_packet',
  'cfo_decision_packet',
  'pricing_packet',
  'pricing_model_packet',
  'price_change_packet',
  'pricing_question',
  'value_metric',
  'assumptions',
  'assumption_table',
  'source_to_model_ledger',
  'formula',
  'scenario_table',
  'sensitivity_table',
  'recommendation',
  'approval_owner',
  'price_change_handoff',
  'execution_proof_tracker',
  'execution_status_labels',
  'decision_trigger',
  'rollback_or_continue_rule'
]);

function contractKeys(type = '') {
  const normalized = normalizeKey(type);
  return [...new Set([normalized, camelKey(normalized), ...(PRICING_CONTRACT_ALIASES[normalized] || [])].filter(Boolean))];
}

function firstValue(source = {}, keys = []) {
  const object = objectValue(source);
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(object, key) && object[key] != null && object[key] !== '') return object[key];
  }
  return undefined;
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
  if (Array.isArray(object.scenarios)) return rowsFromValue(object.scenarios, fallbackLabel || 'Scenario');
  const label = firstValue(object, ['label', 'name', 'title', 'metric', 'scenario', 'case', 'owner', 'trigger', 'rule', 'question']) || fallbackLabel || object.type || object.artifact_type || 'Item';
  const detail = firstValue(object, ['detail', 'description', 'value', 'content', 'text', 'note', 'assumption', 'formula', 'impact', 'condition', 'recommendation']) || JSON.stringify(object);
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
  const sourceList = [context, raw, received, contractFields];
  return sourceList.flatMap((source) => {
    const value = firstValue(source, contractKeys(type));
    return rowsFromValue(value, type);
  });
}

function artifactRowsFor(context = {}, types = []) {
  return (Array.isArray(context.artifacts) ? context.artifacts : [])
    .filter((artifact) => artifactMatches(artifact, types))
    .flatMap((artifact) => rowsFromValue(artifact.rows || artifact.items || artifact.content || artifact, artifact.type || artifact.artifact_type));
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
  const tableRows = lines
    .filter((line) => /^\|.+\|$/.test(line) && !/^\|\s*-/.test(line))
    .map((line) => line.split('|').map((cell) => cell.trim()).filter(Boolean))
    .filter((cells) => cells.length > 1)
    .map((cells) => row(cells[0], cells.slice(1).join(' / ')));
  if (tableRows.length > 1) return tableRows.slice(1);
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
  const aliases = normalizedTypes.flatMap((type) => [type, ...(PRICING_CONTRACT_ALIASES[type] || []).map(normalizeKey)]);
  const wanted = new Set([...normalizedTypes, ...aliases]);
  return deliveryFiles(context)
    .filter((file) => artifactMatches(file, PRICING_MARKDOWN_ARTIFACT_TYPES))
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

function emptyPricingRecord() {
  return {
    title: 'No Pricing/CFO packet loaded',
    summary: 'Open from CAIt or send a Pricing/CFO app context to populate this console.',
    decisionRows: [],
    scenarioRows: [],
    riskRows: [],
    audit: []
  };
}

function collectPricingRecord(context = null) {
  if (!context) return emptyPricingRecord();
  const title = text(context.title, 'Pricing decision packet');
  const summary = text(context.summary, 'Pricing/CFO AIAGENT context was restored as a retained app packet.');
  const decisionRows = uniqueRows([
    ...rowsFor(context, ['pricing_decision_packet', 'cfo_decision_packet', 'pricing_question', 'value_metric', 'assumptions', 'source_to_model_ledger', 'formula', 'recommendation']),
    ...markdownRowsFor(context, ['pricing_decision_packet', 'cfo_decision_packet', 'pricing_question', 'value_metric', 'assumptions', 'source_to_model_ledger', 'formula', 'recommendation'])
  ]);
  const scenarioRows = uniqueRows([
    ...rowsFor(context, ['scenario_table', 'sensitivity_table']),
    ...markdownRowsFor(context, ['scenario_table', 'sensitivity_table'])
  ]);
  const riskRows = uniqueRows([
    ...rowsFor(context, ['approval_owner', 'price_change_handoff', 'execution_proof_tracker', 'execution_status_labels', 'decision_trigger', 'rollback_or_continue_rule']),
    ...markdownRowsFor(context, ['approval_owner', 'price_change_handoff', 'execution_proof_tracker', 'execution_status_labels', 'decision_trigger', 'rollback_or_continue_rule'])
  ]);
  const audit = auditPricingRecord({ decisionRows, scenarioRows, riskRows }, context);
  return { title, summary, decisionRows, scenarioRows, riskRows, audit };
}

function auditPricingRecord(record = {}, context = {}) {
  const json = JSON.stringify(context || {}).toLowerCase();
  const hasDecisionPacket = /pricing_decision_packet|cfo_decision_packet|pricing_packet|price_change_packet/.test(json);
  return [
    { key: 'decision_packet', label: 'Decision packet', ok: hasDecisionPacket, detail: hasDecisionPacket ? 'Pricing/CFO source packet is retained.' : 'Missing pricing_decision_packet or cfo_decision_packet contract.' },
    { key: 'model_inputs', label: 'Model inputs', ok: record.decisionRows.length >= 3, detail: record.decisionRows.length >= 3 ? `${record.decisionRows.length} decision/model row(s) retained.` : 'Need question, value metric, assumptions, ledger, formula, or recommendation.' },
    { key: 'scenarios', label: 'Scenarios', ok: record.scenarioRows.length > 0, detail: record.scenarioRows.length ? `${record.scenarioRows.length} scenario/sensitivity row(s) retained.` : 'Missing scenario_table or sensitivity_table.' },
    { key: 'approval_owner', label: 'Approval owner', ok: /approval_owner|approvalowner|decision_owner/.test(json), detail: /approval_owner|approvalowner|decision_owner/.test(json) ? 'Decision owner is attached.' : 'Missing approval owner before price change.' },
    { key: 'decision_trigger', label: 'Decision trigger', ok: /decision_trigger|decisiontrigger/.test(json), detail: /decision_trigger|decisiontrigger/.test(json) ? 'Decision trigger is attached.' : 'Missing trigger for when the price change can proceed.' },
    { key: 'proof_tracker', label: 'Proof tracker', ok: /execution_proof_tracker|executionprooftracker|proof_tracker/.test(json), detail: /execution_proof_tracker|executionprooftracker|proof_tracker/.test(json) ? 'Execution proof tracker is retained.' : 'Missing proof tracker for follow-up operations.' },
    { key: 'rollback_rule', label: 'Rollback rule', ok: /rollback_or_continue_rule|rollbackorcontinuerule|rollback_rule/.test(json), detail: /rollback_or_continue_rule|rollbackorcontinuerule|rollback_rule/.test(json) ? 'Rollback/continue rule is retained.' : 'Missing rollback_or_continue_rule.' }
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

function readinessRows(record = pricingRecord) {
  const ok = (flag) => flag ? 'ready' : 'pending';
  return [
    { label: 'Server context', ready: Boolean(importedContext), detail: importedContext ? 'Server-side pricing packet is loaded.' : 'Send to CAIt will create the server-side pricing packet reference.' },
    { label: 'Model inputs', ready: record.decisionRows.length >= 3, detail: record.decisionRows.length >= 3 ? `${record.decisionRows.length} model row(s) retained.` : 'Add pricing question, value metric, assumptions, ledger, formula, or recommendation.' },
    { label: 'Scenario review', ready: record.scenarioRows.length > 0, detail: record.scenarioRows.length ? `${record.scenarioRows.length} scenario/sensitivity row(s) retained.` : 'Add scenario_table or sensitivity_table.' },
    { label: 'Approval boundary', ready: record.riskRows.some((item) => /approval|owner/i.test(`${item.label} ${item.detail}`)), detail: record.riskRows.some((item) => /approval|owner/i.test(`${item.label} ${item.detail}`)) ? 'Approval owner or boundary is visible.' : 'Add approval_owner before changing price.' },
    { label: 'Decision trigger', ready: record.riskRows.some((item) => /trigger/i.test(`${item.label} ${item.detail}`)), detail: record.riskRows.some((item) => /trigger/i.test(`${item.label} ${item.detail}`)) ? 'Decision trigger is retained.' : 'Add decision_trigger.' },
    { label: 'Proof and rollback', ready: record.riskRows.some((item) => /proof|rollback|continue/i.test(`${item.label} ${item.detail}`)), detail: record.riskRows.some((item) => /proof|rollback|continue/i.test(`${item.label} ${item.detail}`)) ? 'Proof or rollback/continue state is retained.' : 'Add execution_proof_tracker and rollback_or_continue_rule.' }
  ].map((item) => ({ ...item, state: ok(item.ready) }));
}

function contextPacket() {
  const ready = pricingRecord.audit.filter((item) => item.ok);
  return buildCaitAppContext({
    source_app: 'pricing_decision_console',
    source_app_label: 'Pricing Decision Console',
    title: pricingRecord.title,
    summary: pricingRecord.summary,
    facts: [
      `${ready.length}/${pricingRecord.audit.length || 7} pricing anchors retained`,
      importedContext ? 'Server-side app context loaded before returning to CAIt.' : 'No imported server-side context loaded yet.'
    ],
    artifacts: [
      { type: 'pricing_decision_packet', title: pricingRecord.title, rows: pricingRecord.decisionRows },
      { type: 'scenario_table', title: 'Scenario table', rows: pricingRecord.scenarioRows },
      { type: 'sensitivity_table', title: 'Sensitivity and risk table', rows: pricingRecord.scenarioRows },
      { type: 'price_change_handoff', title: 'Approval and price-change handoff', rows: pricingRecord.riskRows },
      { type: 'execution_proof_tracker', title: 'Execution proof tracker', rows: pricingRecord.riskRows },
      { type: 'handoff_audit', title: 'Pricing handoff audit', rows: pricingRecord.audit }
    ],
    metrics: [
      { label: 'decision_rows', value: pricingRecord.decisionRows.length },
      { label: 'scenario_rows', value: pricingRecord.scenarioRows.length },
      { label: 'risk_rows', value: pricingRecord.riskRows.length },
      { label: 'anchors_ready', value: ready.length }
    ],
    approval_requests: pricingRecord.riskRows.some((item) => /approval|owner|price change|billing/i.test(`${item.label} ${item.detail}`))
      ? [{ id: 'pricing-change-approval', action_type: 'price_change', status: 'needs approval', title: 'Approve pricing change before execution' }]
      : [],
    recommended_next_actions: [
      'Review retained assumptions, scenarios, approval owner, trigger, proof tracker, and rollback rule before asking CAIt to continue.',
      'Do not change pricing or billing externally until the approval owner confirms the retained price-change handoff.'
    ],
    handoff_targets: ['pricing-decision-console', 'cfo_leader', 'pricing'],
    raw_context: {
      chat_handoff_id: chatHandoffId(),
      chat_return_to: chatReturnTo(),
      received_context: importedContext,
      pricing_handoff_audit: {
        ready: ready.map((item) => item.key),
        missing: pricingRecord.audit.filter((item) => !item.ok).map((item) => item.key)
      },
      pricing_decision_rows: pricingRecord.decisionRows,
      pricing_scenario_rows: pricingRecord.scenarioRows,
      pricing_risk_rows: pricingRecord.riskRows
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

function renderNotice() {
  const returnTo = chatReturnTo();
  if (els.returnToChatLink && returnTo) {
    els.returnToChatLink.href = returnTo;
    els.returnToChatLink.hidden = false;
  }
  if (!els.pricingHandoffNotice) return;
  const handoff = chatHandoffId();
  if (importedContext) {
    els.pricingHandoffNotice.hidden = false;
    els.pricingHandoffNotice.textContent = `CAIt pricing handoff session is attached${handoff ? ` (${handoff})` : ''}. This console is using a server-side app context packet.`;
  } else if (returnTo || handoff) {
    els.pricingHandoffNotice.hidden = false;
    els.pricingHandoffNotice.textContent = 'CAIt pricing handoff session is attached, but no server packet is loaded yet. Send to CAIt will create the retained pricing decision packet.';
  } else {
    els.pricingHandoffNotice.hidden = true;
  }
}

function renderAudit() {
  const ready = pricingRecord.audit.filter((item) => item.ok).length;
  if (els.pricingHandoffAuditPill) {
    els.pricingHandoffAuditPill.textContent = pricingRecord.audit.length ? `${ready} / ${pricingRecord.audit.length} anchors` : 'No packet audited';
    els.pricingHandoffAuditPill.className = `status-pill ${ready === pricingRecord.audit.length ? 'ready' : 'pending'}`;
  }
  if (els.pricingHandoffAuditSummary) {
    els.pricingHandoffAuditSummary.textContent = pricingRecord.audit.length
      ? (ready === pricingRecord.audit.length ? 'All pricing decision anchors are present for stable CAIt follow-up.' : `${pricingRecord.audit.length - ready} pricing anchor(s) need attention before this can become stable pricing operations.`)
      : 'Open this app from a Pricing or CFO handoff to audit assumptions, scenarios, approval, proof, and rollback continuity.';
  }
  if (els.pricingHandoffAuditList) {
    els.pricingHandoffAuditList.innerHTML = pricingRecord.audit.map((item) => [
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
  if (els.pricingReadinessPill) {
    els.pricingReadinessPill.textContent = `${ready}/${items.length} ops checks ready`;
    els.pricingReadinessPill.className = `status-pill ${ready === items.length ? 'ready' : 'pending'}`;
  }
  if (els.pricingReadinessList) {
    els.pricingReadinessList.innerHTML = items.map((item) => [
      `<div class="ops-readiness-item ${item.ready ? 'ready' : 'pending'}">`,
      `<span>${escapeHtml(item.label)}</span>`,
      `<strong>${escapeHtml(item.ready ? 'Ready' : 'Needed')}</strong>`,
      `<p>${escapeHtml(item.detail)}</p>`,
      '</div>'
    ].join('')).join('');
  }
  if (els.pricingStepModel) els.pricingStepModel.classList.toggle('current', pricingRecord.decisionRows.length > 0);
  if (els.pricingStepApproval) els.pricingStepApproval.classList.toggle('current', pricingRecord.riskRows.some((item) => /approval|owner|trigger/i.test(`${item.label} ${item.detail}`)));
  if (els.pricingStepProof) els.pricingStepProof.classList.toggle('current', pricingRecord.riskRows.some((item) => /proof|rollback|continue/i.test(`${item.label} ${item.detail}`)));
}

function render() {
  if (els.pricingRecordTitle) els.pricingRecordTitle.textContent = pricingRecord.title;
  if (els.pricingRecordMeta) els.pricingRecordMeta.textContent = pricingRecord.summary;
  if (els.pricingQuestionMetric) els.pricingQuestionMetric.textContent = String(pricingRecord.decisionRows.length);
  if (els.pricingScenarioMetric) els.pricingScenarioMetric.textContent = String(pricingRecord.scenarioRows.length);
  if (els.pricingApprovalMetric) els.pricingApprovalMetric.textContent = String(pricingRecord.riskRows.filter((item) => /approval|owner|trigger/i.test(`${item.label} ${item.detail}`)).length);
  if (els.pricingProofMetric) els.pricingProofMetric.textContent = String(pricingRecord.riskRows.filter((item) => /proof|rollback|continue/i.test(`${item.label} ${item.detail}`)).length);
  renderTable(els.pricingDecisionTable, ['Anchor', 'Detail', 'Status'], pricingRecord.decisionRows);
  renderTable(els.pricingScenarioTable, ['Scenario', 'Detail', 'Status'], pricingRecord.scenarioRows);
  renderTable(els.pricingRiskTable, ['Gate', 'Detail', 'Status'], pricingRecord.riskRows);
  renderNotice();
  renderAudit();
  renderReadiness();
  if (els.pricingContextPreview) els.pricingContextPreview.textContent = JSON.stringify(contextPacket(), null, 2);
}

async function init() {
  importedContext = await fetchCaitAppContextFromUrl();
  pricingRecord = collectPricingRecord(importedContext);
  render();
}

if (els.copyPricingContextBtn) {
  els.copyPricingContextBtn.onclick = async () => {
    await copyContextJson(contextPacket());
    els.copyPricingContextBtn.textContent = 'Copied';
    window.setTimeout(() => { els.copyPricingContextBtn.textContent = 'Copy packet'; }, 1200);
  };
}

if (els.sendPricingContextBtn) {
  els.sendPricingContextBtn.onclick = async () => {
    els.sendPricingContextBtn.disabled = true;
    els.sendPricingContextBtn.textContent = 'Sending...';
    try {
      await sendContextToCait(contextPacket(), { returnTo: chatReturnTo() || '/chat' });
      els.sendPricingContextBtn.textContent = 'Sent';
    } catch (error) {
      els.sendPricingContextBtn.disabled = false;
      els.sendPricingContextBtn.textContent = 'Send to CAIt';
      if (els.pricingHandoffNotice) {
        els.pricingHandoffNotice.hidden = false;
        els.pricingHandoffNotice.textContent = `Could not send pricing context: ${text(error?.message, 'unknown error')}`;
      }
    }
  };
}

init();
