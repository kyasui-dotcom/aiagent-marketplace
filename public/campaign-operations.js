import { buildCaitAppContext, copyContextJson, fetchCaitAppContextFromUrl, sendContextToCait } from './cait-app-bridge.js?v=20260526b';

const listEl = document.getElementById('campaignList');
const detailEl = document.getElementById('campaignDetail');
const formEl = document.getElementById('campaignForm');
const refreshEl = document.getElementById('refreshCampaigns');

const els = {
  returnToChatLink: document.getElementById('returnToChatLink'),
  sendCampaignContextBtn: document.getElementById('sendCampaignContextBtn'),
  copyCampaignContextBtn: document.getElementById('copyCampaignContextBtn'),
  campaignHandoffNotice: document.getElementById('campaignHandoffNotice'),
  campaignReadinessPill: document.getElementById('campaignReadinessPill'),
  campaignReadinessList: document.getElementById('campaignReadinessList'),
  campaignHandoffAuditPill: document.getElementById('campaignHandoffAuditPill'),
  campaignHandoffAuditSummary: document.getElementById('campaignHandoffAuditSummary'),
  campaignHandoffAuditList: document.getElementById('campaignHandoffAuditList'),
  campaignStepState: document.getElementById('campaignStepState'),
  campaignStepReadiness: document.getElementById('campaignStepReadiness'),
  campaignStepMeasurement: document.getElementById('campaignStepMeasurement'),
  campaignCountMetric: document.getElementById('campaignCountMetric'),
  publisherQueueMetric: document.getElementById('publisherQueueMetric'),
  connectorReadinessMetric: document.getElementById('connectorReadinessMetric'),
  measurementLoopMetric: document.getElementById('measurementLoopMetric'),
  actionQueueTable: document.getElementById('actionQueueTable'),
  campaignContextPreview: document.getElementById('campaignContextPreview')
};

let campaigns = [];
let selectedId = '';
let importedContext = null;
let loadError = '';

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

function listValue(value = []) {
  if (Array.isArray(value)) return value.map((item) => String(item ?? '').trim()).filter(Boolean);
  return String(value || '').split(/[,\n]/).map((item) => item.trim()).filter(Boolean);
}

function objectValue(value = {}) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function camelKey(value = '') {
  return String(value || '').replace(/_([a-z0-9])/g, (_, char) => char.toUpperCase());
}

const CONTRACT_KEY_ALIASES = Object.freeze({
  campaign_state: ['campaignState'],
  campaign_record: ['campaignRecord'],
  publisher_queue: ['publisherQueue'],
  publisher_items: ['publisherItems'],
  approval_backlog: ['approvalBacklog', 'approvalRequests', 'approval_requests'],
  connector_readiness: ['connectorReadiness'],
  saas_readiness: ['saasReadiness'],
  planned_action_queue: ['plannedActionQueue', 'action_queue', 'actionQueue', 'plannedActions'],
  now_week_0_1: ['nowWeek01', 'nowWeekZeroOne', 'week_0_1', 'weekZeroOne', 'week0_1', 'week0One'],
  next_week_1_3: ['nextWeek13', 'nextWeekOneThree', 'week_1_3', 'weekOneThree', 'week1_3', 'week1Three'],
  waiting_conditions: ['waitingConditions', 'waiting_on', 'waitingOn', 'blockers'],
  measurement_loop: ['measurementLoop', 'measurementChecks'],
  measurement_queue: ['measurementQueue'],
  campaign_metrics: ['campaignMetrics'],
  next_action_owner: ['nextActionOwner', 'nextActionOwners', 'next_owner', 'nextOwner', 'owner_map', 'ownerMap'],
  campaign_operations_plan: ['campaignOperationsPlan', 'campaignOpsPlan', 'campaignPlan', 'campaign_markdown', 'campaignMarkdown']
});

function contractKeys(type = '') {
  const key = String(type || '').trim();
  const normalized = normalizeArtifactType(key);
  return [...new Set([
    key,
    normalized,
    camelKey(normalized),
    ...(CONTRACT_KEY_ALIASES[normalized] || [])
  ].filter(Boolean))];
}

function contractRows(value = []) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' || typeof value === 'number') return [{ value: String(value) }];
  if (!value || typeof value !== 'object') return [];
  if (Array.isArray(value.rows)) return value.rows;
  if (Array.isArray(value.items)) return value.items;
  if (Array.isArray(value.queue)) return value.queue;
  return [value];
}

function contractRowsFromObject(source = {}, type = '') {
  const object = objectValue(source);
  return contractKeys(type).flatMap((key) => contractRows(object[key]));
}

function rawContractRows(context = {}, types = []) {
  const raw = objectValue(context.raw_context);
  return types
    .flatMap((type) => [
      ...contractRowsFromObject(context, type),
      ...contractRowsFromObject(raw, type)
    ])
    .filter((item) => item && typeof item === 'object');
}

function artifactMatchesTypes(artifact = {}, types = []) {
  const artifactTypes = artifactTypeValues(artifact);
  const targets = new Set(types.flatMap((type) => contractKeys(type).map(normalizeArtifactType)));
  return artifactTypes.some((type) => targets.has(type));
}

function rowsForTypes(context = {}, types = []) {
  const artifactRows = (Array.isArray(context.artifacts) ? context.artifacts : [])
    .filter((artifact) => artifactMatchesTypes(artifact, types))
    .flatMap((artifact) => {
      if (Array.isArray(artifact.rows)) return artifact.rows;
      if (Array.isArray(artifact.items)) return artifact.items;
      if (Array.isArray(artifact.queue)) return artifact.queue;
      if (artifact && typeof artifact === 'object') return [artifact];
      return [];
    })
    .filter((item) => item && typeof item === 'object');
  return [...artifactRows, ...rawContractRows(context, types)];
}

function rowsByType(context = {}, type = '') {
  const target = normalizeArtifactType(type);
  const artifactRows = (Array.isArray(context.artifacts) ? context.artifacts : [])
    .filter((artifact) => artifactMatchesTypes(artifact, [type]))
    .flatMap((artifact) => {
      const rows = Array.isArray(artifact.rows)
        ? artifact.rows
        : (Array.isArray(artifact.items) ? artifact.items : (Array.isArray(artifact.queue) ? artifact.queue : []));
      const sourceRows = rows.length ? rows : [artifact];
      return sourceRows
        .filter((item) => item && typeof item === 'object')
        .map((item) => ({ ...item, artifactType: target }));
    });
  const rawRows = rawContractRows(context, [type]).map((item) => ({ ...item, artifactType: target }));
  return [...artifactRows, ...rawRows];
}

function campaignUrlParams() {
  return new URL(window.location.href).searchParams;
}

function chatReturnTo() {
  const value = text(campaignUrlParams().get('chat_return_to'));
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
  return text(campaignUrlParams().get('chat_handoff_id')).replace(/[^a-z0-9_-]/gi, '').slice(0, 120);
}

function normalizeStatus(value = '') {
  const safe = text(value, 'draft').toLowerCase().replace(/[\s-]+/g, '_');
  return safe || 'draft';
}

function statusClass(value = '') {
  const safe = normalizeStatus(value);
  if (/ready|approved|scheduled|running|measuring|completed/.test(safe)) return 'approved';
  if (/block|failed|missing|paused/.test(safe)) return 'blocked';
  return 'pending';
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: 'include',
    headers: { 'content-type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.error) {
    throw new Error(payload.error || `Request failed: ${response.status}`);
  }
  return payload;
}

async function authStatus() {
  try {
    const response = await fetch('/auth/status', {
      credentials: 'include',
      headers: { accept: 'application/json' }
    });
    const payload = await response.json().catch(() => ({}));
    return response.ok && payload && typeof payload === 'object' ? payload : {};
  } catch {
    return {};
  }
}

function selectedCampaign() {
  return campaigns.find((item) => item.id === selectedId) || null;
}

function campaignPublisherQueue(campaign = {}) {
  return Array.isArray(campaign.publisher?.queue) ? campaign.publisher.queue : [];
}

function campaignApprovalBacklog(campaign = {}) {
  return Array.isArray(campaign.metadata?.approvalBacklog) ? campaign.metadata.approvalBacklog : [];
}

function campaignConnectorRows(campaign = {}) {
  const crm = Array.isArray(campaign.integrations?.crm_ma) ? campaign.integrations.crm_ma : [];
  const lead = campaign.leadSource?.provider ? [{ kind: 'Lead SaaS', ...campaign.leadSource }] : [];
  const ads = campaign.ads?.provider ? [{ kind: 'Ads SaaS', ...campaign.ads }] : [];
  const analytics = campaign.metadata?.analyticsProvider ? [{ kind: 'Analytics', provider: campaign.metadata.analyticsProvider, status: campaign.metadata.analyticsStatus || 'ready' }] : [];
  return [...crm.map((item) => ({ kind: item.kind || 'CRM/MA', ...item })), ...lead, ...ads, ...analytics];
}

function campaignMeasurementRows(campaign = {}) {
  const metrics = Array.isArray(campaign.metrics) ? campaign.metrics : [];
  const loop = Array.isArray(campaign.metadata?.measurementLoop) ? campaign.metadata.measurementLoop : [];
  return metrics.length ? metrics : loop;
}

function campaignActionRows(campaign = {}) {
  const tasks = Array.isArray(campaign.tasks) ? campaign.tasks : [];
  const queue = [
    ...(Array.isArray(campaign.metadata?.plannedActionQueue) ? campaign.metadata.plannedActionQueue : []),
    ...(Array.isArray(campaign.metadata?.weekZeroOne) ? campaign.metadata.weekZeroOne : []),
    ...(Array.isArray(campaign.metadata?.weekOneThree) ? campaign.metadata.weekOneThree : [])
  ];
  return tasks.length ? tasks : queue;
}

function campaignWeekZeroOneRows(campaign = {}) {
  const explicit = Array.isArray(campaign.metadata?.weekZeroOne) ? campaign.metadata.weekZeroOne : [];
  if (explicit.length) return explicit;
  return campaignActionRows(campaign).filter((item) => item.artifactType === 'now_week_0_1' || /week\s*0\s*-\s*1/i.test(`${item.phase || ''} ${item.dueAt || ''} ${item.window || ''}`));
}

function campaignWeekOneThreeRows(campaign = {}) {
  const explicit = Array.isArray(campaign.metadata?.weekOneThree) ? campaign.metadata.weekOneThree : [];
  if (explicit.length) return explicit;
  return campaignActionRows(campaign).filter((item) => item.artifactType === 'next_week_1_3' || /week\s*1\s*-\s*3/i.test(`${item.phase || ''} ${item.dueAt || ''} ${item.window || ''}`));
}

function campaignWaitingRows(campaign = {}) {
  return Array.isArray(campaign.metadata?.waitingConditions) ? campaign.metadata.waitingConditions : [];
}

function campaignNextActionOwnerRows(campaign = {}) {
  return Array.isArray(campaign.metadata?.nextActionOwners) ? campaign.metadata.nextActionOwners : [];
}

function contextCampaignId(context = {}, state = {}) {
  return text(state.id || state.campaign_id || state.campaignId || context.campaign_id || context.campaignId || context.raw_context?.campaign_id || context.raw_context?.campaignId || context.id || `campaign-context-${Date.now().toString(36)}`)
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

function normalizeActionRow(item = {}, index = 0, artifactType = 'planned_action_queue') {
  const phase = artifactType === 'now_week_0_1'
    ? 'Week 0-1'
    : (artifactType === 'next_week_1_3' ? 'Week 1-3' : text(item.phase || item.window || item.when));
  return {
    id: text(item.id, `${artifactType}_${index + 1}`),
    channel: text(item.channel || item.destination || item.platform || item.owner, 'general'),
    title: text(item.title || item.action || item.task || item.summary, `Action ${index + 1}`),
    brief: text(item.brief || item.description || item.note),
    status: normalizeStatus(item.status || item.readiness || 'planned'),
    dueAt: text(item.dueAt || item.due_at || item.window || item.when || phase),
    phase,
    artifactType,
    metadata: objectValue(item.metadata)
  };
}

function normalizeWaitingCondition(item = {}, index = 0) {
  return {
    id: text(item.id, `waiting_condition_${index + 1}`),
    owner: text(item.owner || item.waiting_on || item.waitingOn || item.channel || item.destination, 'campaign_owner'),
    condition: text(item.condition || item.waiting_condition || item.blocker || item.summary || item.title || item.action, `Waiting condition ${index + 1}`),
    status: normalizeStatus(item.status || item.readiness || 'waiting'),
    dueAt: text(item.dueAt || item.due_at || item.window || item.when),
    metadata: objectValue(item.metadata)
  };
}

function normalizeNextActionOwner(item = {}, index = 0) {
  const row = item && typeof item === 'object' ? item : { value: item };
  return {
    id: text(row.id || row.ownerId || row.owner_id, `next_owner_${index + 1}`),
    owner: text(row.owner || row.next_action_owner || row.nextActionOwner || row.assignee || row.name || row.role || row.value, 'campaign_owner'),
    responsibility: text(row.responsibility || row.action || row.next_action || row.nextAction || row.task || row.summary || row.title, 'Own the next CAIt campaign follow-up.'),
    status: normalizeStatus(row.status || row.readiness || 'pending'),
    dueAt: text(row.dueAt || row.due_at || row.window || row.when),
    channel: text(row.channel || row.destination || row.platform || row.scope),
    metadata: objectValue(row.metadata)
  };
}

function normalizeArtifactType(value = '') {
  return String(value || '').trim().toLowerCase().replace(/[\s./-]+/g, '_').replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '');
}

function artifactTypeValues(artifact = {}) {
  return [
    artifact.type,
    artifact.artifact_type,
    artifact.artifactType,
    artifact.delivery_artifact_type,
    artifact.deliveryArtifactType,
    artifact.source_task_type,
    artifact.sourceTaskType,
    artifact.content_type,
    artifact.contentType,
    ...(Array.isArray(artifact.artifact_types) ? artifact.artifact_types : []),
    ...(Array.isArray(artifact.artifactTypes) ? artifact.artifactTypes : [])
  ].map(normalizeArtifactType).filter(Boolean);
}

function campaignPlanArtifactText(artifact = {}) {
  return text(artifact.content || artifact.contentPreview || artifact.content_preview || artifact.markdown || artifact.body || artifact.text || artifact.file_markdown || artifact.fileMarkdown || artifact.output_text || artifact.raw_markdown || artifact.rawMarkdown);
}

function campaignPlanArtifactFromValue(value = null, name = 'campaign_operations_plan') {
  if (!value) return null;
  if (typeof value === 'string') {
    return { type: 'campaign_operations_plan', name, content_type: 'campaign_operations_plan', content: value };
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const content = campaignPlanArtifactText(value) || text(value.plan || value.value || value.markdown_content || value.markdownContent);
    return content
      ? { type: 'campaign_operations_plan', content_type: 'campaign_operations_plan', name: text(value.name || value.title || name), ...value, content }
      : null;
  }
  return null;
}

function campaignPlanArtifactsFromContractFields(source = {}) {
  const object = objectValue(source);
  return contractKeys('campaign_operations_plan')
    .map((key) => campaignPlanArtifactFromValue(object[key], key))
    .filter(Boolean);
}

function campaignPlanArtifactsFromTransferDelivery(raw = {}) {
  const delivery = objectValue(raw.delivery);
  return (Array.isArray(delivery.artifacts) ? delivery.artifacts : [])
    .filter((artifact) => artifact && typeof artifact === 'object')
    .map((artifact, index) => {
      const content = campaignPlanArtifactText(artifact);
      return {
        ...artifact,
        type: artifact.type || artifact.artifactType || artifact.artifact_type || 'file',
        artifact_type: artifact.artifact_type || artifact.artifactType || artifact.content_type || artifact.contentType || '',
        artifact_types: Array.isArray(artifact.artifact_types) ? artifact.artifact_types : (Array.isArray(artifact.artifactTypes) ? artifact.artifactTypes : []),
        content_type: artifact.content_type || artifact.contentType || artifact.artifact_type || artifact.artifactType || '',
        name: artifact.name || artifact.title || `transfer-delivery-artifact-${index + 1}.md`,
        content
      };
    })
    .filter((artifact) => campaignPlanArtifactText(artifact));
}

function looksLikeCampaignPlanArtifact(artifact = {}) {
  const types = artifactTypeValues(artifact);
  if (types.some((type) => ['campaign_operations_plan', 'campaign_operations', 'campaign_ops', 'campaign_plan'].includes(type))) return true;

  const label = normalizeArtifactType([
    artifact.name,
    artifact.file_name,
    artifact.filename,
    artifact.title,
    artifact.slug
  ].filter(Boolean).join(' '));
  if (/campaign_(?:operations|ops|plan)|campaign_operations_delivery|campaign_ops_delivery/.test(label)) return true;

  const markdown = campaignPlanArtifactText(artifact);
  if (!markdown) return false;
  const hasCampaignState = /^\s{0,3}#{1,6}\s+campaign\s+(?:state|record)\b/im.test(markdown);
  const hasOperationsAnchor = /^\s{0,3}#{1,6}\s+(?:publisher\s+queue|approval\s+backlog|connector\s+readiness|saas\s+readiness|planned\s+action\s+queue|waiting\s+conditions|measurement\s+loop)\b/im.test(markdown);
  return hasCampaignState && hasOperationsAnchor;
}

function campaignPlanArtifacts(context = {}) {
  const raw = objectValue(context.raw_context);
  const directArtifacts = Array.isArray(context.artifacts) ? context.artifacts : [];
  const deliveryFiles = [
    ...(Array.isArray(context.delivery_files) ? context.delivery_files : []),
    ...(Array.isArray(context.deliveryFiles) ? context.deliveryFiles : []),
    ...(Array.isArray(context.files) ? context.files : []),
    ...(Array.isArray(raw.delivery_files) ? raw.delivery_files : []),
    ...(Array.isArray(raw.deliveryFiles) ? raw.deliveryFiles : []),
    ...(Array.isArray(raw.files) ? raw.files : []),
    ...campaignPlanArtifactsFromTransferDelivery(raw)
  ];
  const contractPlans = [
    ...campaignPlanArtifactsFromContractFields(context),
    ...campaignPlanArtifactsFromContractFields(raw)
  ];
  return [...directArtifacts, ...deliveryFiles, ...contractPlans]
    .filter((artifact) => artifact && typeof artifact === 'object' && looksLikeCampaignPlanArtifact(artifact));
}

function markdownSections(markdown = '') {
  const sections = {};
  let current = 'root';
  const normalized = String(markdown || '')
    .replace(/\r\n/g, '\n')
    .replace(/(\S)\s+(#{1,6}\s+)/g, '$1\n$2')
    .replace(/(\S)\s+([-*]\s+(?=[A-Za-z0-9\u3040-\u30ff\u3400-\u9fff]))/g, '$1\n$2');
  for (const line of normalized.split('\n')) {
    const heading = line.match(/^\s{0,3}#{1,6}\s+(.+?)\s*#*\s*$/);
    if (heading) {
      current = heading[1].trim();
      if (!sections[current]) sections[current] = [];
      continue;
    }
    if (!sections[current]) sections[current] = [];
    sections[current].push(line);
  }
  return sections;
}

function sectionLines(sections = {}, patterns = []) {
  return Object.entries(sections)
    .filter(([heading]) => patterns.some((pattern) => pattern.test(heading)))
    .flatMap(([, lines]) => lines);
}

function bulletLines(lines = []) {
  return lines.map((line) => String(line || '').trim())
    .map((line) => line.replace(/^\s*(?:[-*]|\d+[.)])\s+/, '').trim())
    .filter(Boolean)
    .filter((line) => !/^[:|\- ]+$/.test(line));
}

function markdownFieldValue(lines = [], labels = []) {
  const bullets = bulletLines(lines);
  for (const label of labels) {
    const escaped = String(label || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`^(?:\\*\\*)?${escaped}(?:\\*\\*)?\\s*[:：]\\s*(.+)$`, 'i');
    const row = bullets.find((line) => pattern.test(line));
    const match = row?.match(pattern);
    if (match?.[1]) return text(match[1]);
  }
  return '';
}

function statusFromMarkdownLine(line = '', fallback = 'planned') {
  const source = String(line || '').toLowerCase();
  if (/ready|confirmed|approved|scheduled|確認済み|承認済み|予定/.test(source)) return 'ready';
  if (/block|missing|unverified|not verified|unconfirmed|未確認|未設定|未確定|不足|ブロック/.test(source)) return 'blocked';
  if (/wait|approval|review|draft|承認|待|草案|レビュー/.test(source)) return 'waiting_approval';
  return fallback;
}

function rowFromMarkdownBullet(line = '', index = 0, artifactType = 'planned_action_queue') {
  const parts = String(line || '').split(/[:：]/);
  const label = text(parts.length > 1 ? parts.shift() : '');
  const body = text(parts.join(':') || line);
  return normalizeActionRow({
    id: `${artifactType}_markdown_${index + 1}`,
    channel: label || 'campaign',
    title: body,
    status: statusFromMarkdownLine(line, artifactType === 'next_week_1_3' ? 'scheduled' : 'planned'),
    window: artifactType === 'now_week_0_1' ? 'Week 0-1' : (artifactType === 'next_week_1_3' ? 'Week 1-3' : ''),
    metadata: { source: 'campaign_operations_markdown' }
  }, index, artifactType);
}

function campaignPlanFromMarkdown(context = {}) {
  const artifacts = campaignPlanArtifacts(context);
  if (!artifacts.length) return {};
  const markdown = artifacts.map(campaignPlanArtifactText).filter(Boolean).join('\n\n');
  if (!markdown) return {};
  const sections = markdownSections(markdown);
  const headings = Object.keys(sections).filter((heading) => heading && heading !== 'root');
  const title = text(headings[0] || context.title);
  const campaignStateLines = sectionLines(sections, [/campaign state/i, /campaign record/i, /キャンペーン状態/, /キャンペーンレコード/]);
  const publisherLines = bulletLines(sectionLines(sections, [/publisher queue/i, /publisher intake/i, /入稿キュー/]));
  const approvalLines = bulletLines(sectionLines(sections, [/approval backlog/i, /approval/i, /承認待ち/]));
  const connectorLines = bulletLines(sectionLines(sections, [/connector readiness/i, /saas readiness/i, /コネクタ準備/]));
  const plannedLines = bulletLines(sectionLines(sections, [/planned action queue/i, /実行予定キュー/]));
  const weekZeroOneLines = bulletLines(sectionLines(sections, [/now\s*\(week\s*0\s*-\s*1\)/i, /week\s*0\s*-\s*1/i]));
  const weekOneThreeLines = bulletLines(sectionLines(sections, [/next\s*\(week\s*1\s*-\s*3\)/i, /week\s*1\s*-\s*3/i]));
  const waitingLines = bulletLines(sectionLines(sections, [/waiting conditions/i, /待機条件/]));
  const measurementLines = bulletLines(sectionLines(sections, [/measurement loop/i, /計測ループ/]));
  const nextOwnerLines = bulletLines(sectionLines(sections, [/next action owner/i, /next owner/i, /次アクション担当/, /次の担当/]));
  const objective = markdownFieldValue(campaignStateLines, ['Objective', 'Goal', '目的']);
  const audience = markdownFieldValue(campaignStateLines, ['Audience', 'Target', '対象']);
  const targetUrl = markdownFieldValue(campaignStateLines, ['Target URL', 'URL', '対象URL']);
  const status = markdownFieldValue(campaignStateLines, ['Status', '状態']);
  const channels = publisherLines
    .map((line) => text(line.split(/[:：]/)[0]))
    .filter((item) => item && !/publisher|candidate|queue|候補|入稿/i.test(item));
  return {
    campaignState: {
      title,
      objective,
      audience,
      targetUrl,
      status: status || 'waiting_approval',
      channels
    },
    publisherQueue: publisherLines.map((line, index) => ({
      id: `publisher_markdown_${index + 1}`,
      channel: text(line.split(/[:：]/)[0], 'publisher'),
      title: text(line.split(/[:：]/).slice(1).join(':') || line, `Publisher item ${index + 1}`),
      status: statusFromMarkdownLine(line, 'waiting_approval'),
      metadata: { source: 'campaign_operations_markdown' }
    })),
    approvalBacklog: approvalLines.map((line, index) => ({
      id: `approval_markdown_${index + 1}`,
      channel: 'campaign',
      title: line,
      status: statusFromMarkdownLine(line, 'waiting_approval'),
      metadata: { source: 'campaign_operations_markdown' }
    })),
    connectorRows: connectorLines.map((line, index) => {
      const [kind, ...rest] = line.split(/[:：]/);
      return {
        id: `connector_markdown_${index + 1}`,
        kind: text(kind, 'SaaS'),
        provider: text(kind, 'SaaS'),
        status: statusFromMarkdownLine(rest.join(':') || line, 'pending'),
        metadata: { source: 'campaign_operations_markdown' }
      };
    }),
    plannedActionQueue: plannedLines.map((line, index) => rowFromMarkdownBullet(line, index, 'planned_action_queue')),
    weekZeroOne: weekZeroOneLines.map((line, index) => rowFromMarkdownBullet(line, index, 'now_week_0_1')),
    weekOneThree: weekOneThreeLines.map((line, index) => rowFromMarkdownBullet(line, index, 'next_week_1_3')),
    waitingConditions: waitingLines.map((line, index) => normalizeWaitingCondition({
      id: `waiting_markdown_${index + 1}`,
      owner: text(line.split(/[:：]/)[0], 'campaign_owner'),
      condition: text(line.split(/[:：]/).slice(1).join(':') || line),
      status: statusFromMarkdownLine(line, 'waiting'),
      metadata: { source: 'campaign_operations_markdown' }
    }, index)),
    measurementRows: measurementLines.map((line, index) => ({
      id: `measurement_markdown_${index + 1}`,
      source: 'campaign_operations_markdown',
      name: line,
      value: 0,
      unit: statusFromMarkdownLine(line, 'planned'),
      metadata: { source: 'campaign_operations_markdown' }
    })),
    nextActionOwners: nextOwnerLines.map((line, index) => normalizeNextActionOwner({
      id: `next_owner_markdown_${index + 1}`,
      owner: text(line.split(/[:：]/)[0], 'campaign_owner'),
      responsibility: text(line.split(/[:：]/).slice(1).join(':') || line),
      status: statusFromMarkdownLine(line, 'pending'),
      metadata: { source: 'campaign_operations_markdown' }
    }, index)),
    sourceNames: artifacts.map((artifact) => text(artifact.name || artifact.title || artifact.content_type || artifact.type)).filter(Boolean)
  };
}

function rowsWithMarkdown(structuredRows = [], markdownRows = []) {
  return [...(Array.isArray(structuredRows) ? structuredRows : []), ...(Array.isArray(markdownRows) ? markdownRows : [])]
    .filter((item) => item && typeof item === 'object');
}

function campaignFromContext(context = {}) {
  if (!context) return null;
  const raw = objectValue(context.raw_context);
  const markdownPlan = campaignPlanFromMarkdown(context);
  const state = objectValue(rowsForTypes(context, ['campaign_state', 'campaign', 'campaign_record'])[0] || raw.campaign_state || raw.campaign || markdownPlan.campaignState || {});
  const publisherRows = rowsWithMarkdown(rowsForTypes(context, ['publisher_queue', 'publisher_items']), markdownPlan.publisherQueue);
  const approvalRows = rowsWithMarkdown(rowsForTypes(context, ['approval_backlog']), markdownPlan.approvalBacklog);
  const connectorRows = rowsWithMarkdown(rowsForTypes(context, ['connector_readiness', 'saas_readiness']), markdownPlan.connectorRows);
  const plannedRows = rowsWithMarkdown(rowsByType(context, 'planned_action_queue'), markdownPlan.plannedActionQueue);
  const weekZeroOneRows = rowsWithMarkdown(rowsByType(context, 'now_week_0_1'), markdownPlan.weekZeroOne);
  const weekOneThreeRows = rowsWithMarkdown(rowsByType(context, 'next_week_1_3'), markdownPlan.weekOneThree);
  const waitingRows = rowsWithMarkdown(rowsByType(context, 'waiting_conditions'), markdownPlan.waitingConditions);
  const measurementRows = rowsWithMarkdown(rowsForTypes(context, ['measurement_loop', 'measurement_queue', 'campaign_metrics']), markdownPlan.measurementRows);
  const nextOwnerRows = rowsWithMarkdown(rowsForTypes(context, ['next_action_owner', 'next_action_owners', 'next_owner']), markdownPlan.nextActionOwners);
  const actionSourceRows = [...plannedRows, ...weekZeroOneRows, ...weekOneThreeRows];
  const channels = listValue(state.channels || raw.channels || actionSourceRows.map((item) => item.channel || item.destination || item.platform));
  const publisherQueue = publisherRows.map((item, index) => ({
    id: text(item.id || item.publisherItemId || item.publisher_item_id, `publisher_${index + 1}`),
    channel: text(item.channel || item.destination || item.platform || item.connector, 'publisher'),
    title: text(item.title || item.summary || item.action || item.task, `Publisher item ${index + 1}`),
    status: normalizeStatus(item.status || item.approval_status || 'waiting_approval'),
    dueAt: text(item.dueAt || item.due_at || item.window),
    sourceJobId: text(item.sourceJobId || item.source_job_id || item.job_id)
  }));
  const approvalBacklog = approvalRows.map((item, index) => ({
    id: text(item.id || item.approvalId || item.approval_id, `approval_${index + 1}`),
    channel: text(item.channel || item.destination || item.platform || item.owner, 'campaign'),
    title: text(item.title || item.summary || item.action || item.task, `Approval item ${index + 1}`),
    status: normalizeStatus(item.status || item.approval_status || item.readiness || 'waiting_approval'),
    dueAt: text(item.dueAt || item.due_at || item.window || item.when),
    owner: text(item.owner || item.approver || item.approval_owner || item.approvalOwner),
    sourceJobId: text(item.sourceJobId || item.source_job_id || item.job_id),
    metadata: objectValue(item.metadata)
  }));
  const crmRows = connectorRows
    .filter((item) => !/lead|ads|ad|analytics/i.test(`${item.kind || ''} ${item.type || ''} ${item.provider || ''}`))
    .map((item) => ({
      provider: text(item.provider || item.name || item.connector, 'CRM/MA'),
      status: normalizeStatus(item.status || item.readiness || 'pending'),
      kind: text(item.kind || item.type, 'CRM/MA')
    }));
  const leadRow = connectorRows.find((item) => /lead/i.test(`${item.kind || ''} ${item.type || ''} ${item.provider || ''}`)) || null;
  const adsRow = connectorRows.find((item) => /ads|ad/i.test(`${item.kind || ''} ${item.type || ''} ${item.provider || ''}`)) || null;
  const analyticsRow = connectorRows.find((item) => /analytics|ga4|search/i.test(`${item.kind || ''} ${item.type || ''} ${item.provider || ''}`)) || null;
  const plannedActionQueue = plannedRows.map((item, index) => normalizeActionRow(item, index, 'planned_action_queue'));
  const weekZeroOne = weekZeroOneRows.map((item, index) => normalizeActionRow(item, index, 'now_week_0_1'));
  const weekOneThree = weekOneThreeRows.map((item, index) => normalizeActionRow(item, index, 'next_week_1_3'));
  const waitingConditions = waitingRows.map(normalizeWaitingCondition);
  const nextActionOwners = nextOwnerRows.map(normalizeNextActionOwner);
  const combinedActionQueue = [...plannedActionQueue, ...weekZeroOne, ...weekOneThree];
  return {
    id: contextCampaignId(context, state),
    title: text(state.title || state.name || raw.title || context.title, 'Imported campaign operations packet'),
    objective: text(state.objective || state.goal || raw.objective || context.summary),
    status: normalizeStatus(state.status || raw.status || 'waiting_approval'),
    source: 'cait_app_context',
    cmoPlanJobId: text(state.cmoPlanJobId || state.cmo_plan_job_id || raw.cmo_plan_job_id),
    operationsAgentJobId: text(state.operationsAgentJobId || state.operations_agent_job_id || raw.operations_agent_job_id),
    targetUrl: text(state.targetUrl || state.target_url || raw.target_url),
    audience: text(state.audience || raw.audience),
    channels,
    kpis: listValue(state.kpis || raw.kpis),
    tasks: combinedActionQueue,
    metrics: measurementRows.map((item, index) => ({
      id: text(item.id, `metric_${index + 1}`),
      source: text(item.source || item.provider || 'campaign_operations'),
      name: text(item.name || item.metric || item.action || item.check, `Measurement ${index + 1}`),
      value: Number(item.value ?? item.count ?? 0),
      unit: text(item.unit || item.window || item.period),
      metadata: objectValue(item.metadata)
    })),
    publisher: {
      queue: publisherQueue,
      complianceOwner: 'publisher'
    },
    integrations: { crm_ma: crmRows },
    leadSource: leadRow ? { provider: text(leadRow.provider || leadRow.name || 'Lead SaaS'), status: normalizeStatus(leadRow.status || leadRow.readiness) } : {},
    ads: adsRow ? { provider: text(adsRow.provider || adsRow.name || 'Ads SaaS'), status: normalizeStatus(adsRow.status || adsRow.readiness) } : {},
    metadata: {
      importedFromContextId: context.id,
      importedSourceApp: context.source_app,
      plannedActionQueue,
      weekZeroOne,
      weekOneThree,
      waitingConditions,
      approvalBacklog,
      measurementLoop: measurementRows,
      nextActionOwners,
      importedMarkdownPlan: Boolean(markdownPlan.sourceNames?.length),
      importedMarkdownPlanSources: markdownPlan.sourceNames || [],
      analyticsProvider: analyticsRow ? text(analyticsRow.provider || analyticsRow.name || 'Analytics') : '',
      analyticsStatus: analyticsRow ? normalizeStatus(analyticsRow.status || analyticsRow.readiness) : '',
      measurementNextAction: text(raw.next_action || raw.nextAction || context.recommended_next_actions?.[0] || 'Review readiness, then ask CAIt for the next campaign action.')
    },
    updatedAt: text(context.created_at, new Date().toISOString())
  };
}

function mergeImportedCampaign(campaign = null) {
  if (!campaign?.id) return;
  const index = campaigns.findIndex((item) => item.id === campaign.id);
  if (index >= 0) campaigns[index] = { ...campaigns[index], ...campaign };
  else campaigns.unshift(campaign);
  selectedId = campaign.id;
}

function applyInboundContext(context = null) {
  importedContext = context;
  if (!context) return;
  mergeImportedCampaign(campaignFromContext(context));
}

function metricSummaryHtml(campaign = {}) {
  const summary = campaign.metadata?.measurementSummary || {};
  const totals = summary.totals || {};
  const totalRows = Object.entries(totals).slice(0, 8).map(([name, value]) => `
    <tr><td>${escapeHtml(name)}</td><td>${escapeHtml(value)}</td></tr>
  `);
  const metricRows = campaignMeasurementRows(campaign).slice(0, 8).map((item) => `
    <tr><td>${escapeHtml(item.name || item.action || item.check || 'Metric')}</td><td>${escapeHtml(item.value ?? item.status ?? item.window ?? '')}</td></tr>
  `);
  return [...totalRows, ...metricRows].join('') || '<tr><td colspan="2">No metrics yet.</td></tr>';
}

function queueHtml(campaign = {}) {
  const queue = campaignPublisherQueue(campaign);
  return queue.slice(-12).reverse().map((item) => `
    <tr>
      <td>${escapeHtml(item.channel || '')}</td>
      <td>${escapeHtml(item.title || '')}</td>
      <td><span class="status-pill ${statusClass(item.status)}">${escapeHtml(item.status || '')}</span></td>
    </tr>
  `).join('') || '<tr><td colspan="3">No Publisher queue items.</td></tr>';
}

function approvalBacklogHtml(campaign = {}) {
  const rows = campaignApprovalBacklog(campaign);
  return rows.map((item) => `
    <tr>
      <td>${escapeHtml(item.channel || item.owner || 'campaign')}</td>
      <td>${escapeHtml(item.title || item.action || item.task || '')}</td>
      <td><span class="status-pill ${statusClass(item.status)}">${escapeHtml(item.status || 'waiting_approval')}</span></td>
      <td>${escapeHtml(item.dueAt || '')}</td>
    </tr>
  `).join('') || '<tr><td colspan="4">No approval backlog recorded.</td></tr>';
}

function readinessHtml(campaign = {}) {
  const rows = campaignConnectorRows(campaign);
  return rows.map((item) => `
    <tr><td>${escapeHtml(item.kind || 'SaaS')}</td><td>${escapeHtml(item.provider || '')}</td><td><span class="status-pill ${statusClass(item.status)}">${escapeHtml(item.status || '')}</span></td></tr>
  `).join('') || '<tr><td colspan="3">No SaaS readiness recorded.</td></tr>';
}

function waitingConditionsHtml(campaign = {}) {
  const rows = campaignWaitingRows(campaign);
  return rows.map((item) => `
    <tr>
      <td>${escapeHtml(item.owner || 'campaign_owner')}</td>
      <td>${escapeHtml(item.condition || '')}</td>
      <td><span class="status-pill ${statusClass(item.status)}">${escapeHtml(item.status || 'waiting')}</span></td>
      <td>${escapeHtml(item.dueAt || '')}</td>
    </tr>
  `).join('') || '<tr><td colspan="4">No waiting conditions recorded.</td></tr>';
}

function nextActionOwnersHtml(campaign = {}) {
  const rows = campaignNextActionOwnerRows(campaign);
  return rows.map((item) => `
    <tr>
      <td>${escapeHtml(item.owner || 'campaign_owner')}</td>
      <td>${escapeHtml(item.responsibility || '')}</td>
      <td><span class="status-pill ${statusClass(item.status)}">${escapeHtml(item.status || 'pending')}</span></td>
      <td>${escapeHtml(item.dueAt || item.channel || '')}</td>
    </tr>
  `).join('') || '<tr><td colspan="4">No next action owner recorded.</td></tr>';
}

function actionQueueHtml(campaign = {}) {
  const rows = campaignActionRows(campaign);
  els.actionQueueTable.innerHTML = [
    '<thead><tr><th>Owner / channel</th><th>Action</th><th>Status</th><th>Window</th></tr></thead><tbody>',
    rows.length ? rows.slice(0, 16).map((item) => `
      <tr>
        <td>${escapeHtml(item.channel || item.owner || 'general')}</td>
        <td><strong>${escapeHtml(item.title || item.action || item.task || 'Action')}</strong><br>${escapeHtml(item.brief || item.description || '')}</td>
        <td><span class="status-pill ${statusClass(item.status)}">${escapeHtml(item.status || 'planned')}</span></td>
        <td>${escapeHtml(item.phase || item.dueAt || item.window || item.when || '')}</td>
      </tr>
    `).join('') : '<tr><td colspan="4">No planned actions yet.</td></tr>',
    '</tbody>'
  ].join('');
}

function renderList() {
  listEl.innerHTML = campaigns.map((campaign) => `
    <button class="campaign-item" type="button" data-id="${escapeHtml(campaign.id)}" aria-selected="${campaign.id === selectedId ? 'true' : 'false'}">
      <strong>${escapeHtml(campaign.title)}</strong>
      <span class="campaign-meta">${escapeHtml(campaign.status)} · ${escapeHtml((campaign.channels || []).join(', ') || 'no channels')}</span>
    </button>
  `).join('') || `<div class="campaign-status">${escapeHtml(loadError || 'No campaigns yet.')}</div>`;
}

function renderDetail() {
  const campaign = selectedCampaign();
  if (!campaign) {
    detailEl.innerHTML = `<div class="campaign-status">${escapeHtml(loadError || 'Select a campaign.')}</div>`;
    actionQueueHtml({});
    return;
  }
  detailEl.innerHTML = `
    <section>
      <div class="status-row">
        <h2>${escapeHtml(campaign.title)}</h2>
        <span class="status-pill ${statusClass(campaign.status)}">${escapeHtml(campaign.status)}</span>
      </div>
      <p>${escapeHtml(campaign.objective || '')}</p>
      <div class="campaign-meta">Source: ${escapeHtml(campaign.source || '')} · Updated: ${escapeHtml(campaign.updatedAt || '')}</div>
    </section>
    <section class="campaign-band">
      <h3>Publisher Queue</h3>
      <table class="campaign-table"><thead><tr><th>Channel</th><th>Title</th><th>Status</th></tr></thead><tbody>${queueHtml(campaign)}</tbody></table>
    </section>
    <section class="campaign-band">
      <h3>Approval Backlog</h3>
      <table class="campaign-table"><thead><tr><th>Owner / channel</th><th>Approval item</th><th>Status</th><th>Window</th></tr></thead><tbody>${approvalBacklogHtml(campaign)}</tbody></table>
    </section>
    <section class="campaign-band">
      <h3>Measurement</h3>
      <table class="campaign-table"><thead><tr><th>Metric / check</th><th>Total / state</th></tr></thead><tbody>${metricSummaryHtml(campaign)}</tbody></table>
      <p class="campaign-meta">${escapeHtml(campaign.metadata?.measurementNextAction || 'No next action yet.')}</p>
    </section>
    <section class="campaign-band">
      <h3>SaaS Readiness</h3>
      <table class="campaign-table"><thead><tr><th>Type</th><th>Provider</th><th>Status</th></tr></thead><tbody>${readinessHtml(campaign)}</tbody></table>
    </section>
    <section class="campaign-band">
      <h3>Waiting Conditions</h3>
      <table class="campaign-table"><thead><tr><th>Waiting on</th><th>Condition</th><th>Status</th><th>Window</th></tr></thead><tbody>${waitingConditionsHtml(campaign)}</tbody></table>
    </section>
    <section class="campaign-band">
      <h3>Next Action Owner</h3>
      <table class="campaign-table"><thead><tr><th>Owner</th><th>Responsibility</th><th>Status</th><th>Window / scope</th></tr></thead><tbody>${nextActionOwnersHtml(campaign)}</tbody></table>
    </section>
  `;
  actionQueueHtml(campaign);
}

function setWorkflowStep(element, status = '', detail = '') {
  if (!element) return;
  element.className = `workflow-step ${status}`.trim();
  const detailNode = element.querySelector('span:last-child span:last-child');
  if (detailNode && detail) detailNode.textContent = detail;
}

function readinessItems() {
  const campaign = selectedCampaign();
  const queueCount = campaign ? campaignPublisherQueue(campaign).length : 0;
  const approvalCount = campaign ? campaignApprovalBacklog(campaign).length : 0;
  const connectorCount = campaign ? campaignConnectorRows(campaign).length : 0;
  const measurementCount = campaign ? campaignMeasurementRows(campaign).length : 0;
  const waitingCount = campaign ? campaignWaitingRows(campaign).length : 0;
  const nextOwnerCount = campaign ? campaignNextActionOwnerRows(campaign).length : 0;
  const hasChatReturn = Boolean(chatReturnTo() || chatHandoffId());
  return [
    {
      title: 'Campaign record is retained',
      detail: campaign ? `${campaign.title} is loaded with ${campaign.status || 'draft'} status.` : 'Create or import a campaign record before asking CAIt for operational follow-up.',
      status: campaign ? 'ready' : 'pending'
    },
    {
      title: 'Publisher and action queues are visible',
      detail: queueCount || approvalCount || waitingCount
        ? `${queueCount} Publisher queue item(s), ${approvalCount} approval backlog item(s), and ${waitingCount} waiting condition(s) remain attached to this campaign.`
        : 'No Publisher queue or waiting condition is attached yet; import or create channel actions before external execution.',
      status: queueCount || approvalCount ? 'ready' : 'pending'
    },
    {
      title: 'SaaS readiness is separated',
      detail: connectorCount ? `${connectorCount} connector readiness row(s) are visible.` : 'Lead, CRM/MA, Ads, Analytics, or Publisher readiness has not been recorded yet.',
      status: connectorCount ? 'ready' : 'pending'
    },
    {
      title: 'Measurement loop can continue',
      detail: measurementCount ? `${measurementCount} metric or follow-up check(s) are attached.` : 'Add measurement checks so the next CAIt run can compare results.',
      status: measurementCount ? 'ready' : 'pending'
    },
    {
      title: 'Next owner is explicit',
      detail: nextOwnerCount ? `${nextOwnerCount} next action owner row(s) will travel with the campaign packet.` : 'Add next_action_owner so CAIt can route the next stable operation without guessing.',
      status: nextOwnerCount ? 'ready' : 'pending'
    },
    {
      title: 'CAIt can reopen this context',
      detail: importedContext ? 'Server-side app context was restored for this campaign handoff.' : (hasChatReturn ? 'The chat return route is pinned; Send to CAIt will create the server-side campaign packet.' : 'Open this app from a CAIt handoff to preserve chat return routing.'),
      status: importedContext ? 'ready' : (hasChatReturn ? 'pending' : 'blocked')
    }
  ];
}

function renderReadiness() {
  const items = readinessItems();
  const readyCount = items.filter((item) => item.status === 'ready').length;
  const blocked = items.some((item) => item.status === 'blocked');
  if (els.campaignReadinessPill) {
    els.campaignReadinessPill.textContent = selectedCampaign() ? `${readyCount}/${items.length} ops checks ready` : 'No campaign loaded';
    els.campaignReadinessPill.className = `status-pill ${readyCount === items.length ? 'approved' : blocked ? 'blocked' : 'pending'}`;
  }
  if (els.campaignReadinessList) {
    els.campaignReadinessList.innerHTML = items.map((item) => `
      <article class="ops-readiness-item ${item.status}">
        <strong>${escapeHtml(item.title)}</strong>
        <span>${escapeHtml(item.detail)}</span>
      </article>
    `).join('');
  }
}

function renderWorkflowState() {
  const campaign = selectedCampaign();
  const connectorCount = campaign ? campaignConnectorRows(campaign).length : 0;
  const measurementCount = campaign ? campaignMeasurementRows(campaign).length : 0;
  setWorkflowStep(
    els.campaignStepState,
    campaign ? 'done' : 'current',
    campaign ? `${campaign.title} is the active campaign record.` : 'Load or create a campaign record.'
  );
  setWorkflowStep(
    els.campaignStepReadiness,
    connectorCount ? 'done' : (campaign ? 'current' : ''),
    connectorCount ? 'Connector readiness has been recorded.' : 'Record SaaS readiness and waiting conditions.'
  );
  setWorkflowStep(
    els.campaignStepMeasurement,
    measurementCount ? 'done' : (campaign ? 'current' : ''),
    measurementCount ? 'Measurement loop is attached.' : 'Add metrics or follow-up checks before the next run.'
  );
}

function handoffAuditItems(campaign = selectedCampaign()) {
  const queueCount = campaign ? campaignPublisherQueue(campaign).length : 0;
  const approvalCount = campaign ? campaignApprovalBacklog(campaign).length : 0;
  const connectorCount = campaign ? campaignConnectorRows(campaign).length : 0;
  const actionCount = campaign ? campaignActionRows(campaign).length : 0;
  const measurementCount = campaign ? campaignMeasurementRows(campaign).length : 0;
  const nextOwnerCount = campaign ? campaignNextActionOwnerRows(campaign).length : 0;
  const serverContextLoaded = Boolean(importedContext?.id);
  return [
    {
      key: 'campaign_state',
      title: 'Campaign state',
      detail: campaign ? `${campaign.title} is retained with ${campaign.status || 'draft'} status.` : 'Missing campaign_state. CAIt cannot continue the run against a retained campaign record.',
      status: campaign ? 'ready' : 'blocked'
    },
    {
      key: 'publisher_queue',
      title: 'Publisher and approvals',
      detail: queueCount || approvalCount
        ? `${queueCount} Publisher item(s) and ${approvalCount} approval item(s) are available.`
        : 'Missing publisher_queue or approval_backlog. External actions should stay blocked until review items are attached.',
      status: queueCount || approvalCount ? 'ready' : 'pending'
    },
    {
      key: 'connector_readiness',
      title: 'Connector readiness',
      detail: connectorCount ? `${connectorCount} SaaS readiness row(s) are separated from the agent plan.` : 'Missing connector_readiness. CRM/MA, Ads, Analytics, Lead, or Publisher readiness is not proven.',
      status: connectorCount ? 'ready' : 'pending'
    },
    {
      key: 'planned_action_queue',
      title: 'Planned actions',
      detail: actionCount ? `${actionCount} action row(s) are retained for follow-up.` : 'Missing planned_action_queue. The next operator cannot see what should happen next.',
      status: actionCount ? 'ready' : 'pending'
    },
    {
      key: 'measurement_loop',
      title: 'Measurement loop',
      detail: measurementCount ? `${measurementCount} metric or follow-up check(s) can continue after execution.` : 'Missing measurement_loop. The campaign has no retained check for whether actions worked.',
      status: measurementCount ? 'ready' : 'pending'
    },
    {
      key: 'next_action_owner',
      title: 'Next action owner',
      detail: nextOwnerCount ? `${nextOwnerCount} owner row(s) define who takes the next campaign action.` : 'Missing next_action_owner. CAIt would have to infer responsibility from chat text.',
      status: nextOwnerCount ? 'ready' : 'pending'
    },
    {
      key: 'server_context',
      title: 'Server-side packet',
      detail: serverContextLoaded ? `Context ${importedContext.id} is loaded from server storage.` : 'No server-side campaign packet is loaded yet. Send to CAIt will create one from the current state.',
      status: serverContextLoaded ? 'ready' : 'pending'
    }
  ];
}

function handoffAuditSummary(items = handoffAuditItems()) {
  const missing = items.filter((item) => item.status !== 'ready');
  if (!selectedCampaign()) return 'No retained campaign is selected. Create or import campaign_state before relying on this run.';
  if (!missing.length) return 'All campaign operations anchors are present for stable CAIt follow-up.';
  return `${missing.length} campaign operations anchor(s) still need attention before this becomes a stable run: ${missing.map((item) => item.key).join(', ')}.`;
}

function renderHandoffAudit() {
  const items = handoffAuditItems();
  const readyCount = items.filter((item) => item.status === 'ready').length;
  const blocked = items.some((item) => item.status === 'blocked');
  const summary = handoffAuditSummary(items);
  if (els.campaignHandoffAuditPill) {
    els.campaignHandoffAuditPill.textContent = selectedCampaign() ? `${readyCount}/${items.length} anchors present` : 'No packet audited';
    els.campaignHandoffAuditPill.className = `status-pill ${readyCount === items.length ? 'approved' : blocked ? 'blocked' : 'pending'}`;
  }
  if (els.campaignHandoffAuditSummary) els.campaignHandoffAuditSummary.textContent = summary;
  if (els.campaignHandoffAuditList) {
    els.campaignHandoffAuditList.innerHTML = items.map((item) => `
      <article class="handoff-audit-item ${item.status}">
        <strong>${escapeHtml(item.title)}</strong>
        <span>${escapeHtml(item.detail)}</span>
      </article>
    `).join('');
  }
}

function renderHandoffNotice() {
  const returnTo = chatReturnTo();
  const handoffId = chatHandoffId();
  if (els.returnToChatLink) {
    if (returnTo) {
      els.returnToChatLink.hidden = false;
      els.returnToChatLink.href = returnTo;
    } else {
      els.returnToChatLink.hidden = true;
      els.returnToChatLink.href = '/chat';
    }
  }
  if (!els.campaignHandoffNotice) return;
  const fragments = [];
  if (returnTo) fragments.push('Return path to the same CAIt chat is pinned.');
  if (importedContext?.id) fragments.push('Server-side campaign context is loaded.');
  if (handoffId) fragments.push(`Handoff ID: ${handoffId}.`);
  if (!fragments.length) {
    els.campaignHandoffNotice.hidden = true;
    els.campaignHandoffNotice.textContent = '';
    els.campaignHandoffNotice.className = 'notice';
    return;
  }
  const warning = returnTo && !importedContext?.id;
  els.campaignHandoffNotice.hidden = false;
  els.campaignHandoffNotice.className = `notice${warning ? ' notice-warning' : ''}`;
  els.campaignHandoffNotice.innerHTML = [
    `<strong>${escapeHtml(warning ? 'Chat handoff is open but no server campaign packet is loaded yet.' : 'CAIt campaign handoff session is attached.')}</strong>`,
    `<span>${escapeHtml(fragments.join(' '))}</span>`
  ].join('');
}

function renderMetrics() {
  const campaign = selectedCampaign();
  els.campaignCountMetric.textContent = String(campaigns.length);
  els.publisherQueueMetric.textContent = String(campaign ? campaignPublisherQueue(campaign).length : 0);
  els.connectorReadinessMetric.textContent = String(campaign ? campaignConnectorRows(campaign).length : 0);
  els.measurementLoopMetric.textContent = String(campaign ? campaignMeasurementRows(campaign).length : 0);
}

function buildCampaignContext() {
  const campaign = selectedCampaign();
  const queue = campaign ? campaignPublisherQueue(campaign) : [];
  const approvalBacklog = campaign ? campaignApprovalBacklog(campaign) : [];
  const connectors = campaign ? campaignConnectorRows(campaign) : [];
  const actions = campaign ? campaignActionRows(campaign) : [];
  const weekZeroOne = campaign ? campaignWeekZeroOneRows(campaign) : [];
  const weekOneThree = campaign ? campaignWeekOneThreeRows(campaign) : [];
  const waitingConditions = campaign ? campaignWaitingRows(campaign) : [];
  const measurements = campaign ? campaignMeasurementRows(campaign) : [];
  const nextActionOwners = campaign ? campaignNextActionOwnerRows(campaign) : [];
  const auditItems = handoffAuditItems(campaign);
  const missingAuditItems = auditItems.filter((item) => item.status !== 'ready');
  return buildCaitAppContext({
    source_app: 'campaign_operations',
    source_app_label: 'Campaign Operations',
    title: campaign ? `Campaign operations state - ${campaign.title}` : 'Campaign operations state',
    summary: campaign
      ? `${campaign.title} is retained with ${queue.length} Publisher queue item(s), ${approvalBacklog.length} approval backlog item(s), ${connectors.length} connector readiness row(s), and ${measurements.length} measurement check(s).`
      : 'No campaign is selected yet. Create or import a campaign before asking CAIt for operational follow-up.',
    facts: [
      campaign ? `Campaign status: ${campaign.status}` : 'No campaign selected',
      campaign?.objective ? `Objective: ${campaign.objective}` : '',
      campaign?.channels?.length ? `Channels: ${campaign.channels.join(', ')}` : '',
      queue.length ? `Publisher queue items: ${queue.length}` : '',
      approvalBacklog.length ? `Approval backlog items: ${approvalBacklog.length}` : '',
      connectors.length ? `Connector readiness rows: ${connectors.length}` : '',
      actions.length ? `Planned actions: ${actions.length}` : '',
      weekZeroOne.length ? `Week 0-1 actions: ${weekZeroOne.length}` : '',
      weekOneThree.length ? `Week 1-3 actions: ${weekOneThree.length}` : '',
      waitingConditions.length ? `Waiting conditions: ${waitingConditions.length}` : '',
      measurements.length ? `Measurement checks: ${measurements.length}` : '',
      nextActionOwners.length ? `Next action owners: ${nextActionOwners.length}` : '',
      missingAuditItems.length ? `Handoff audit gaps: ${missingAuditItems.map((item) => item.key).join(', ')}` : 'Handoff audit: all campaign operations anchors present'
    ].filter(Boolean),
    assumptions: [
      importedContext ? 'This console restored a server-side CAIt campaign app context.' : 'Campaign state is shown from the Campaign Operations SaaS API or the current imported packet.',
      'External publishing, lead sending, and ads launch remain gated by their destination SaaS or approval app.',
      'Campaign Operations owns state, queues, readiness, waiting conditions, and measurement continuity.'
    ],
    artifacts: [
      { type: 'campaign_state', rows: campaign ? [{ id: campaign.id, title: campaign.title, objective: campaign.objective, status: campaign.status, channels: campaign.channels, target_url: campaign.targetUrl, audience: campaign.audience }] : [] },
      { type: 'publisher_queue', rows: queue },
      { type: 'approval_backlog', rows: approvalBacklog },
      { type: 'connector_readiness', rows: connectors },
      { type: 'planned_action_queue', rows: actions },
      { type: 'now_week_0_1', rows: weekZeroOne },
      { type: 'next_week_1_3', rows: weekOneThree },
      { type: 'waiting_conditions', rows: waitingConditions },
      { type: 'measurement_loop', rows: measurements },
      { type: 'next_action_owner', rows: nextActionOwners },
      { type: 'handoff_audit', rows: auditItems }
    ],
    metrics: [
      { label: 'campaigns', value: campaigns.length },
      { label: 'publisher_queue_items', value: queue.length },
      { label: 'approval_backlog_items', value: approvalBacklog.length },
      { label: 'connector_readiness_rows', value: connectors.length },
      { label: 'waiting_conditions', value: waitingConditions.length },
      { label: 'measurement_checks', value: measurements.length },
      { label: 'next_action_owners', value: nextActionOwners.length },
      { label: 'handoff_audit_gaps', value: missingAuditItems.length }
    ],
    recommended_next_actions: [
      ...missingAuditItems.slice(0, 3).map((item) => `Fix campaign handoff gap: ${item.key}. ${item.detail}`),
      queue.length ? 'Open Publisher & Approval Studio for queued publish or content actions.' : 'Add Publisher queue items before any external publishing work.',
      connectors.length ? 'Ask CAIt to plan the next action using the visible connector readiness rows.' : 'Record Lead, CRM/MA, Ads, Analytics, or Publisher readiness before assigning execution.',
      waitingConditions.length ? 'Resolve or explicitly defer the waiting conditions before releasing the next execution layer.' : 'Record owner or connector waiting conditions when a campaign action cannot proceed yet.',
      measurements.length ? 'Use the measurement loop after approved channel actions run.' : 'Attach a 24h and 7d measurement check before closing the campaign run.',
      nextActionOwners.length ? 'Route the next CAIt follow-up to the recorded next action owner.' : 'Add next_action_owner before relying on chat memory for campaign responsibility.'
    ],
    handoff_targets: ['cmo_leader', 'campaign_operations', 'analytics_console', 'publisher_approval_studio'],
    raw_context: {
      ...(importedContext ? { received_context: importedContext } : {}),
      campaign_id: campaign?.id || '',
      chat_handoff_id: chatHandoffId(),
      chat_return_to: chatReturnTo(),
      campaign_counts: {
        campaigns: campaigns.length,
        publisher_queue_items: queue.length,
        approval_backlog_items: approvalBacklog.length,
        connector_readiness_rows: connectors.length,
        planned_actions: actions.length,
        week_0_1_actions: weekZeroOne.length,
        week_1_3_actions: weekOneThree.length,
        waiting_conditions: waitingConditions.length,
        measurement_checks: measurements.length,
        next_action_owners: nextActionOwners.length,
        handoff_audit_gaps: missingAuditItems.length
      },
      campaign_handoff_audit: {
        summary: handoffAuditSummary(auditItems),
        ready_count: auditItems.length - missingAuditItems.length,
        total_count: auditItems.length,
        missing: missingAuditItems.map((item) => item.key),
        checks: auditItems
      }
    }
  });
}

function renderContextPreview() {
  if (els.campaignContextPreview) els.campaignContextPreview.textContent = JSON.stringify(buildCampaignContext(), null, 2);
}

function selectCampaignContextPreview() {
  if (!els.campaignContextPreview || typeof window.getSelection !== 'function') return false;
  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(els.campaignContextPreview);
  selection.removeAllRanges();
  selection.addRange(range);
  return true;
}

function render() {
  renderList();
  renderDetail();
  renderHandoffNotice();
  renderReadiness();
  renderWorkflowState();
  renderHandoffAudit();
  renderMetrics();
  renderContextPreview();
}

async function loadCampaigns() {
  loadError = '';
  detailEl.innerHTML = '<div class="campaign-status">Loading campaigns...</div>';
  try {
    const auth = await authStatus();
    if (!auth.loggedIn && !auth.login) {
      loadError = 'Login required. Sign in to load retained campaign records, or open this app from a CAIt campaign handoff.';
      if (importedContext) mergeImportedCampaign(campaignFromContext(importedContext));
      render();
      return;
    }
    const payload = await api('/api/campaigns?limit=100');
    campaigns = Array.isArray(payload.campaigns) ? payload.campaigns : [];
    if (importedContext) mergeImportedCampaign(campaignFromContext(importedContext));
    if (!selectedId && campaigns[0]) selectedId = campaigns[0].id;
  } catch (error) {
    loadError = `${error.message}. Sign in to load retained campaign records, or open this app from a CAIt campaign handoff.`;
    if (importedContext) mergeImportedCampaign(campaignFromContext(importedContext));
  }
  render();
}

formEl?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(formEl);
  const channels = String(formData.get('channels') || '').split(',').map((item) => item.trim()).filter(Boolean);
  try {
    const payload = await api('/api/campaigns', {
      method: 'POST',
      body: JSON.stringify({
        title: formData.get('title'),
        objective: formData.get('objective'),
        channels,
        source: 'operations_dashboard'
      })
    });
    selectedId = payload.campaign?.id || '';
    formEl.reset();
    await loadCampaigns();
  } catch (error) {
    loadError = error.message;
    render();
  }
});

listEl?.addEventListener('click', (event) => {
  const button = event.target.closest('[data-id]');
  if (!button) return;
  selectedId = button.getAttribute('data-id') || '';
  render();
});

refreshEl?.addEventListener('click', loadCampaigns);

els.copyCampaignContextBtn?.addEventListener('click', async () => {
  try {
    await copyContextJson(buildCampaignContext());
    els.copyCampaignContextBtn.textContent = 'Copied';
  } catch {
    els.copyCampaignContextBtn.textContent = selectCampaignContextPreview() ? 'Packet selected' : 'Copy failed';
  }
  window.setTimeout(() => { els.copyCampaignContextBtn.textContent = 'Copy packet'; }, 1200);
});

els.sendCampaignContextBtn?.addEventListener('click', () => {
  const returnTo = chatReturnTo();
  void sendContextToCait(buildCampaignContext(), { returnTo }).catch((error) => {
    window.alert(`CAIt campaign context handoff failed: ${error.message}`);
  });
});

async function bootstrap() {
  applyInboundContext(await fetchCaitAppContextFromUrl());
  await loadCampaigns();
}

void bootstrap();
