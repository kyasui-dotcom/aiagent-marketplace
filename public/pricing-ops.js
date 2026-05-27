import { buildCaitAppContext, copyContextJson, fetchCaitAppContextFromUrl, sendContextToCait } from './cait-app-bridge.js?v=20260526i';

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

const BUTTON_COPY_LABEL = '控えをコピー';
const BUTTON_SEND_LABEL = 'この内容をチャットへ渡す';

const FRIENDLY_LABELS = Object.freeze({
  pricing_decision_packet: '料金判断メモ',
  cfo_decision_packet: 'お金の判断メモ',
  pricing_packet: '料金メモ',
  price_change_packet: '料金変更メモ',
  pricing_question: '確認したいこと',
  value_metric: '料金の基準',
  assumptions: '前提',
  assumption_table: '前提',
  source_to_model_ledger: '根拠',
  formula: '計算式',
  recommendation: 'おすすめ案',
  scenario_table: '料金案',
  sensitivity_table: '影響の確認',
  approval_owner: '承認する人',
  price_change_handoff: '料金変更の依頼',
  execution_proof_tracker: '実行後の確認',
  execution_status_labels: '進み具合',
  decision_trigger: '実行してよい条件',
  rollback_or_continue_rule: '戻す条件',
  retained: '保存済み',
  ready: 'OK',
  approved: 'OK',
  'true': 'OK',
  pending: '未確認',
  missing: '未確認',
  'false': '未確認'
});

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

function displayLabel(value = '', fallback = '項目') {
  const safe = text(value, fallback);
  return FRIENDLY_LABELS[normalizeKey(safe)] || safe;
}

function displayStatus(value = '') {
  const safe = text(value, 'retained');
  return FRIENDLY_LABELS[normalizeKey(safe)] || safe;
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
    if (!Object.prototype.hasOwnProperty.call(object, key)) continue;
    const value = object[key];
    if (value == null || value === '') continue;
    if (Array.isArray(value) && !value.length) continue;
    if (typeof value === 'object' && !Array.isArray(value) && !Object.keys(value).length) continue;
    return value;
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
  const receivedRaw = objectValue(received.raw_context);
  const receivedContractFields = objectValue(receivedRaw.contract_fields);
  const receivedNested = objectValue(receivedRaw.received_context);
  const sourceList = [context, raw, received, contractFields, receivedRaw, receivedContractFields, receivedNested];
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

function objectList(value = []) {
  return (Array.isArray(value) ? value : []).filter((item) => item && typeof item === 'object' && !Array.isArray(item));
}

function explicitApprovalRequestsFromContext(context = importedContext) {
  const raw = objectValue(context?.raw_context);
  const received = objectValue(raw.received_context);
  const contractFields = objectValue(raw.contract_fields);
  return [
    ...objectList(context?.approval_requests || context?.approvalRequests),
    ...objectList(raw.approval_requests || raw.approvalRequests),
    ...objectList(received.approval_requests || received.approvalRequests),
    ...objectList(contractFields.approval_requests || contractFields.approvalRequests)
  ];
}

function emptyPricingRecord() {
  return {
    title: 'まだ料金相談のデータがありません',
    summary: 'チャットの料金相談からこの画面を開くと、確認する材料が入ります。',
    decisionRows: [],
    scenarioRows: [],
    riskRows: [],
    audit: []
  };
}

function collectPricingRecord(context = null) {
  if (!context) return emptyPricingRecord();
  const title = text(context.title, '料金変更の確認メモ');
  const summary = text(context.summary, 'チャットから受け取った料金相談の内容を、実行前に確認できる形にしました。');
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
    { key: 'decision_packet', label: '料金相談の元データ', ok: hasDecisionPacket, detail: hasDecisionPacket ? '料金相談の元データがあります。' : '料金相談の元データがまだありません。' },
    { key: 'model_inputs', label: '判断材料', ok: record.decisionRows.length >= 3, detail: record.decisionRows.length >= 3 ? `${record.decisionRows.length}件の判断材料があります。` : '理由、料金の基準、前提、根拠、計算式、おすすめ案のどれかが足りません。' },
    { key: 'scenarios', label: '料金案の比較', ok: record.scenarioRows.length > 0, detail: record.scenarioRows.length ? `${record.scenarioRows.length}件の料金案や比較があります。` : '料金案や比較表がまだありません。' },
    { key: 'approval_owner', label: '承認する人', ok: /approval_owner|approvalowner|decision_owner/.test(json), detail: /approval_owner|approvalowner|decision_owner/.test(json) ? '誰がOKするか分かります。' : '誰がOKするか未確認です。' },
    { key: 'decision_trigger', label: '実行してよい条件', ok: /decision_trigger|decisiontrigger/.test(json), detail: /decision_trigger|decisiontrigger/.test(json) ? 'いつ料金を変えるか分かります。' : 'いつ料金を変えてよいか未確認です。' },
    { key: 'proof_tracker', label: '実行後の確認', ok: /execution_proof_tracker|executionprooftracker|proof_tracker/.test(json), detail: /execution_proof_tracker|executionprooftracker|proof_tracker/.test(json) ? '実行後に見る数字があります。' : '実行後に何を見るか未確認です。' },
    { key: 'rollback_rule', label: '戻す条件', ok: /rollback_or_continue_rule|rollbackorcontinuerule|rollback_rule/.test(json), detail: /rollback_or_continue_rule|rollbackorcontinuerule|rollback_rule/.test(json) ? '悪かった時に戻す条件があります。' : '悪かった時に戻す条件がまだありません。' }
  ];
}

function renderTable(el, headers = [], rows = []) {
  if (!el) return;
  if (!rows.length) {
    el.innerHTML = `<tbody><tr><td class="empty" colspan="${Math.max(headers.length, 1)}">まだ情報がありません。チャットから料金相談の結果を開くと、ここに確認内容が入ります。</td></tr></tbody>`;
    return;
  }
  el.innerHTML = [
    `<thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}</tr></thead>`,
    `<tbody>${rows.map((item) => `<tr><td>${escapeHtml(displayLabel(item.label))}</td><td>${escapeHtml(item.detail)}</td><td>${escapeHtml(displayStatus(item.status || 'retained'))}</td></tr>`).join('')}</tbody>`
  ].join('');
}

function readinessRows(record = pricingRecord) {
  const ok = (flag) => flag ? 'ready' : 'pending';
  return [
    { label: '元データ', ready: Boolean(importedContext), detail: importedContext ? 'チャットから受け取った料金相談データがあります。' : 'チャットへ渡す時に、この確認内容を保存します。' },
    { label: '判断材料', ready: record.decisionRows.length >= 3, detail: record.decisionRows.length >= 3 ? `${record.decisionRows.length}件の判断材料があります。` : '理由、根拠、前提、おすすめ案が足りません。' },
    { label: '料金案', ready: record.scenarioRows.length > 0, detail: record.scenarioRows.length ? `${record.scenarioRows.length}件の料金案や比較があります。` : '料金案や比較表がまだありません。' },
    { label: '承認者', ready: record.riskRows.some((item) => /approval|owner|承認|責任者|owner/i.test(`${item.label} ${item.detail}`)), detail: record.riskRows.some((item) => /approval|owner|承認|責任者|owner/i.test(`${item.label} ${item.detail}`)) ? '誰がOKするか見えています。' : '誰がOKするか未確認です。' },
    { label: '実行条件', ready: record.riskRows.some((item) => /trigger|条件|実行/i.test(`${item.label} ${item.detail}`)), detail: record.riskRows.some((item) => /trigger|条件|実行/i.test(`${item.label} ${item.detail}`)) ? 'いつ料金を変えるか見えています。' : 'いつ料金を変えてよいか未確認です。' },
    { label: '戻し方', ready: record.riskRows.some((item) => /proof|rollback|continue|戻|止め|確認/i.test(`${item.label} ${item.detail}`)), detail: record.riskRows.some((item) => /proof|rollback|continue|戻|止め|確認/i.test(`${item.label} ${item.detail}`)) ? '実行後に見る数字や戻す条件があります。' : '実行後に見る数字と戻す条件が未確認です。' }
  ].map((item) => ({ ...item, state: ok(item.ready) }));
}

function contextPacket() {
  const ready = pricingRecord.audit.filter((item) => item.ok);
  return buildCaitAppContext({
    source_app: 'pricing_decision_console',
    source_app_label: '料金変更かんたん確認',
    title: pricingRecord.title,
    summary: pricingRecord.summary,
    facts: [
      `${ready.length}/${pricingRecord.audit.length || 7} 件の料金変更チェックがOKです。`,
      importedContext ? 'チャットから受け取った料金相談データを確認済みです。' : 'この画面で作った料金変更チェックをチャットへ戻します。'
    ],
    artifacts: [
      { type: 'pricing_decision_packet', title: pricingRecord.title, rows: pricingRecord.decisionRows },
      { type: 'scenario_table', title: '料金案の比較', rows: pricingRecord.scenarioRows },
      { type: 'sensitivity_table', title: '影響の確認', rows: pricingRecord.scenarioRows },
      { type: 'price_change_handoff', title: '承認と料金変更の依頼', rows: pricingRecord.riskRows },
      { type: 'execution_proof_tracker', title: '実行後の確認', rows: pricingRecord.riskRows },
      { type: 'handoff_audit', title: '料金変更前の確認結果', rows: pricingRecord.audit }
    ],
    metrics: [
      { label: 'decision_rows', value: pricingRecord.decisionRows.length },
      { label: 'scenario_rows', value: pricingRecord.scenarioRows.length },
      { label: 'risk_rows', value: pricingRecord.riskRows.length },
      { label: 'anchors_ready', value: ready.length }
    ],
    approval_requests: explicitApprovalRequestsFromContext(),
    recommended_next_actions: [
      '承認者、実行条件、実行後に見る数字、戻す条件がそろってから次の作業へ進めてください。',
      '承認する人が確認するまで、外部の料金や請求設定は変更しないでください。'
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
    els.pricingHandoffNotice.textContent = `チャットから料金相談のデータを受け取りました${handoff ? `（${handoff}）` : ''}。確認してからチャットへ戻せます。`;
  } else if (returnTo || handoff) {
    els.pricingHandoffNotice.hidden = false;
    els.pricingHandoffNotice.textContent = 'チャットへ戻る準備はできています。料金相談のデータがない場合は、この画面の確認内容をチャットへ渡します。';
  } else {
    els.pricingHandoffNotice.hidden = true;
  }
}

function renderAudit() {
  const ready = pricingRecord.audit.filter((item) => item.ok).length;
  if (els.pricingHandoffAuditPill) {
    els.pricingHandoffAuditPill.textContent = pricingRecord.audit.length ? `${ready}/${pricingRecord.audit.length} OK` : 'まだ確認していません';
    els.pricingHandoffAuditPill.className = `status-pill ${ready === pricingRecord.audit.length ? 'ready' : 'pending'}`;
  }
  if (els.pricingHandoffAuditSummary) {
    els.pricingHandoffAuditSummary.textContent = pricingRecord.audit.length
      ? (ready === pricingRecord.audit.length ? '必要な確認がそろっています。最後に承認者へ確認してから進めてください。' : `${pricingRecord.audit.length - ready}件が未確認です。未確認が残っている間は料金を変えないでください。`)
      : 'チャットから料金相談の結果を開くと、材料、候補、承認者、戻し方をここで確認できます。';
  }
  if (els.pricingHandoffAuditList) {
    els.pricingHandoffAuditList.innerHTML = pricingRecord.audit.map((item) => [
      `<article class="handoff-audit-item ${item.ok ? 'ready' : 'pending'}">`,
      `<strong>${escapeHtml(item.label)}</strong>`,
      `<span>${escapeHtml(item.ok ? 'OK' : '未確認')}</span>`,
      `<p>${escapeHtml(item.detail)}</p>`,
      '</article>'
    ].join('')).join('');
  }
}

function renderReadiness() {
  const items = readinessRows();
  const ready = items.filter((item) => item.ready).length;
  if (els.pricingReadinessPill) {
    els.pricingReadinessPill.textContent = `${ready}/${items.length} OK`;
    els.pricingReadinessPill.className = `status-pill ${ready === items.length ? 'ready' : 'pending'}`;
  }
  if (els.pricingReadinessList) {
    els.pricingReadinessList.innerHTML = items.map((item) => [
      `<div class="ops-readiness-item ${item.ready ? 'ready' : 'pending'}">`,
      `<span>${escapeHtml(item.label)}</span>`,
      `<strong>${escapeHtml(item.ready ? 'OK' : '未確認')}</strong>`,
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
  renderTable(els.pricingDecisionTable, ['見るところ', '内容', '状態'], pricingRecord.decisionRows);
  renderTable(els.pricingScenarioTable, ['料金案', '内容', '状態'], pricingRecord.scenarioRows);
  renderTable(els.pricingRiskTable, ['確認項目', '内容', '状態'], pricingRecord.riskRows);
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
    els.copyPricingContextBtn.textContent = 'コピーしました';
    window.setTimeout(() => { els.copyPricingContextBtn.textContent = BUTTON_COPY_LABEL; }, 1200);
  };
}

if (els.sendPricingContextBtn) {
  els.sendPricingContextBtn.onclick = async () => {
    els.sendPricingContextBtn.disabled = true;
    els.sendPricingContextBtn.textContent = '送っています...';
    try {
      await sendContextToCait(contextPacket(), { returnTo: chatReturnTo() || '/chat' });
      els.sendPricingContextBtn.textContent = 'チャットへ渡しました';
    } catch (error) {
      els.sendPricingContextBtn.disabled = false;
      els.sendPricingContextBtn.textContent = BUTTON_SEND_LABEL;
      if (els.pricingHandoffNotice) {
        els.pricingHandoffNotice.hidden = false;
        els.pricingHandoffNotice.textContent = `チャットへ渡せませんでした: ${text(error?.message, '原因不明')}`;
      }
    }
  };
}

init();
