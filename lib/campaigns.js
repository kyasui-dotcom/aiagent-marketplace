import { nowIso } from './shared.js';

export const CAMPAIGN_STATUSES = Object.freeze([
  'draft',
  'planned',
  'waiting_approval',
  'scheduled',
  'running',
  'measuring',
  'needs_review',
  'completed',
  'paused',
  'failed'
]);

const CAMPAIGN_STATUS_SET = new Set(CAMPAIGN_STATUSES);

function text(value = '', fallback = '') {
  const safe = String(value ?? '').trim();
  return safe || fallback;
}

function obj(value = {}) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function list(value = []) {
  return Array.isArray(value) ? value.filter((item) => item && typeof item === 'object') : [];
}

function stringList(value = []) {
  return Array.isArray(value)
    ? value.map((item) => String(item || '').trim()).filter(Boolean)
    : [];
}

function safeJson(value = '', fallback = {}) {
  if (value && typeof value === 'object') return value;
  try {
    const parsed = JSON.parse(String(value || ''));
    return parsed && typeof parsed === 'object' ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function slugPart(value = '') {
  return text(value)
    .toLowerCase()
    .replace(/[^a-z0-9\u3040-\u30ff\u3400-\u9fff]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

export function campaignTimestamp(campaign = {}) {
  return text(campaign.updatedAt || campaign.updated_at || campaign.createdAt || campaign.created_at);
}

export function normalizeCampaignStatus(value = '') {
  const safe = text(value, 'draft').toLowerCase().replace(/[\s-]+/g, '_');
  return CAMPAIGN_STATUS_SET.has(safe) ? safe : 'draft';
}

export function normalizeCampaignTask(task = {}, index = 0) {
  const createdAt = text(task.createdAt || task.created_at, nowIso());
  return {
    id: text(task.id, `task_${index + 1}`),
    channel: text(task.channel || task.destination || task.platform || 'general').toLowerCase(),
    agentKind: text(task.agentKind || task.agent_kind || task.taskType || task.task_type),
    title: text(task.title || task.summary, `Campaign task ${index + 1}`),
    brief: text(task.brief || task.body || task.description),
    status: text(task.status, 'planned').toLowerCase().replace(/[\s-]+/g, '_'),
    dueAt: text(task.dueAt || task.due_at || task.scheduledAt || task.scheduled_at),
    publisherItemId: text(task.publisherItemId || task.publisher_item_id),
    sourceJobId: text(task.sourceJobId || task.source_job_id || task.jobId || task.job_id),
    metadata: obj(task.metadata),
    createdAt,
    updatedAt: text(task.updatedAt || task.updated_at, createdAt)
  };
}

export function normalizeCampaignMetric(metric = {}, index = 0) {
  const createdAt = text(metric.createdAt || metric.created_at, nowIso());
  return {
    id: text(metric.id, `metric_${index + 1}`),
    source: text(metric.source || metric.provider || 'manual').toLowerCase(),
    name: text(metric.name || metric.metric || 'metric'),
    value: Number(metric.value ?? metric.count ?? 0),
    unit: text(metric.unit),
    periodStart: text(metric.periodStart || metric.period_start),
    periodEnd: text(metric.periodEnd || metric.period_end),
    metadata: obj(metric.metadata),
    createdAt,
    updatedAt: text(metric.updatedAt || metric.updated_at, createdAt)
  };
}

export function normalizeCampaignLog(log = {}, index = 0) {
  const createdAt = text(log.createdAt || log.created_at || log.ts, nowIso());
  return {
    id: text(log.id, `log_${index + 1}`),
    type: text(log.type || log.event || 'note').toLowerCase(),
    message: text(log.message || log.summary || 'Campaign log'),
    actor: text(log.actor || log.by),
    metadata: obj(log.metadata),
    createdAt
  };
}

export function normalizeCampaignRecord(campaign = {}, options = {}) {
  const title = text(campaign.title || campaign.name, 'Untitled campaign');
  const createdAt = text(campaign.createdAt || campaign.created_at, nowIso());
  const id = text(
    campaign.id,
    `camp_${slugPart(title) || 'campaign'}_${createdAt.replace(/[^0-9]/g, '').slice(0, 14) || Date.now()}`
  );
  const ownerLogin = text(campaign.ownerLogin || campaign.owner_login || options.ownerLogin).toLowerCase();
  const plan = obj(campaign.plan);
  const channels = stringList(campaign.channels || plan.channels || campaign.targetChannels || campaign.target_channels);
  return {
    id,
    ownerLogin,
    title,
    objective: text(campaign.objective || plan.objective || campaign.goal),
    status: normalizeCampaignStatus(campaign.status),
    source: text(campaign.source || campaign.createdBySource || campaign.created_by_source, 'manual'),
    cmoPlanJobId: text(campaign.cmoPlanJobId || campaign.cmo_plan_job_id || campaign.planJobId || campaign.plan_job_id),
    operationsAgentJobId: text(campaign.operationsAgentJobId || campaign.operations_agent_job_id),
    targetUrl: text(campaign.targetUrl || campaign.target_url || plan.target_url || plan.targetUrl),
    audience: text(campaign.audience || plan.audience),
    channels,
    kpis: stringList(campaign.kpis || plan.kpis),
    plan,
    tasks: list(campaign.tasks).map(normalizeCampaignTask),
    metrics: list(campaign.metrics).map(normalizeCampaignMetric),
    logs: list(campaign.logs).map(normalizeCampaignLog),
    publisher: obj(campaign.publisher),
    integrations: obj(campaign.integrations),
    leadSource: obj(campaign.leadSource || campaign.lead_source),
    ads: obj(campaign.ads),
    metadata: obj(campaign.metadata),
    createdAt,
    updatedAt: text(campaign.updatedAt || campaign.updated_at, createdAt)
  };
}

export function mergeCampaignSets(existing = [], incoming = [], limit = 2000) {
  const merged = new Map();
  for (const item of [...(Array.isArray(existing) ? existing : []), ...(Array.isArray(incoming) ? incoming : [])]) {
    const normalized = normalizeCampaignRecord(item);
    if (!normalized.id) continue;
    const prior = merged.get(normalized.id);
    if (!prior || campaignTimestamp(normalized) >= campaignTimestamp(prior)) merged.set(normalized.id, normalized);
  }
  return [...merged.values()]
    .sort((left, right) => campaignTimestamp(right).localeCompare(campaignTimestamp(left)))
    .slice(0, limit);
}

export function serializeCampaign(campaign = {}) {
  const normalized = normalizeCampaignRecord(campaign);
  return {
    id: normalized.id,
    owner_login: normalized.ownerLogin || null,
    title: normalized.title,
    objective: normalized.objective || null,
    status: normalized.status,
    source: normalized.source || null,
    cmo_plan_job_id: normalized.cmoPlanJobId || null,
    operations_agent_job_id: normalized.operationsAgentJobId || null,
    target_url: normalized.targetUrl || null,
    audience: normalized.audience || null,
    channels_json: JSON.stringify(normalized.channels || []),
    kpis_json: JSON.stringify(normalized.kpis || []),
    plan_json: JSON.stringify(normalized.plan || {}),
    tasks_json: JSON.stringify(normalized.tasks || []),
    metrics_json: JSON.stringify(normalized.metrics || []),
    logs_json: JSON.stringify(normalized.logs || []),
    publisher_json: JSON.stringify(normalized.publisher || {}),
    integrations_json: JSON.stringify(normalized.integrations || {}),
    lead_source_json: JSON.stringify(normalized.leadSource || {}),
    ads_json: JSON.stringify(normalized.ads || {}),
    metadata_json: JSON.stringify(normalized.metadata || {}),
    created_at: normalized.createdAt || nowIso(),
    updated_at: normalized.updatedAt || normalized.createdAt || nowIso()
  };
}

export function deserializeCampaign(row = {}) {
  return normalizeCampaignRecord({
    id: row.id,
    ownerLogin: row.owner_login || '',
    title: row.title || '',
    objective: row.objective || '',
    status: row.status || '',
    source: row.source || '',
    cmoPlanJobId: row.cmo_plan_job_id || '',
    operationsAgentJobId: row.operations_agent_job_id || '',
    targetUrl: row.target_url || '',
    audience: row.audience || '',
    channels: safeJson(row.channels_json, []),
    kpis: safeJson(row.kpis_json, []),
    plan: safeJson(row.plan_json, {}),
    tasks: safeJson(row.tasks_json, []),
    metrics: safeJson(row.metrics_json, []),
    logs: safeJson(row.logs_json, []),
    publisher: safeJson(row.publisher_json, {}),
    integrations: safeJson(row.integrations_json, {}),
    leadSource: safeJson(row.lead_source_json, {}),
    ads: safeJson(row.ads_json, {}),
    metadata: safeJson(row.metadata_json, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at || row.created_at
  });
}
