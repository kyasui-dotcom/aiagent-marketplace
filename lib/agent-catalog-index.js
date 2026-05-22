import { SAMPLE_AGENT_MANIFESTS } from './builtin-agents/agents/index.js';

function text(value = '', fallback = '') {
  const safe = String(value ?? '').trim();
  return safe || fallback;
}

function list(value = [], limit = 20) {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.map((item) => String(item || '').trim()).filter(Boolean))).slice(0, limit);
}

function object(value = {}) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function normalizedKind(value = '') {
  return text(value).toLowerCase().replace(/[\s-]+/g, '_');
}

function endpointSummary(manifest = {}) {
  const endpoints = object(manifest.endpoints);
  return {
    health: text(manifest.healthcheckUrl || manifest.healthcheck_url || manifest.healthUrl || endpoints.health),
    jobs: text(manifest.jobEndpoint || manifest.job_endpoint || manifest.jobsUrl || endpoints.jobs)
  };
}

function manifestTags(manifest = {}, agent = {}) {
  const metadata = object(manifest.metadata);
  return list([
    ...list(manifest.tags || manifest.team_tags || metadata.tags || metadata.team_tags || agent.tags || []),
    ...list(agent.taskTypes || manifest.task_types || []),
    text(manifest.kind || metadata.category || agent.kind)
  ], 24);
}

function workflowLayer(manifest = {}, agent = {}) {
  const metadata = object(manifest.metadata);
  return text(
    manifest.workflow_layer
      || manifest.agent_layer
      || metadata.workflow_layer
      || metadata.agent_layer
      || agent.metadata?.workflow_layer
      || agent.metadata?.agent_layer,
    text(manifest.agent_role || agent.metadata?.agentRole) === 'leader' ? 'leader' : 'worker'
  );
}

function sourceForAgent(agent = {}, manifest = {}) {
  const metadata = object(agent.metadata);
  const manifestMetadata = object(manifest.metadata);
  if (metadata.sample || manifestMetadata.sample) return 'internal_sample';
  if (agent.manifestSource || agent.manifestUrl) return 'external_manifest';
  return 'external_agent';
}

function agentIsVisibleForCatalog(agent = {}) {
  const metadata = object(agent.metadata);
  return Boolean(agent?.id || agent?.name || Object.keys(manifestFromAgent(agent)).length)
    && metadata.hidden_from_catalog !== true
    && metadata.not_routable !== true
    && !metadata.deleted_at
    && !metadata.deletedAt
    && String(agent?.verificationStatus || agent?.verification_status || '').trim().toLowerCase() !== 'deprecated';
}

function catalogRecordFromManifest(kind = '', manifest = {}, agent = null) {
  const metadata = object(manifest.metadata);
  const taskTypes = list(manifest.task_types || agent?.taskTypes || [], 16);
  const capabilities = list(manifest.capabilities || metadata.capabilities || agent?.capabilities || [], 16);
  const tags = manifestTags(manifest, agent || {});
  return {
    id: text(agent?.id, `manifest:${kind}`),
    kind: normalizedKind(manifest.kind || metadata.category || kind),
    name: text(agent?.name || manifest.name, kind),
    source: agent ? sourceForAgent(agent, manifest) : 'internal_agent_file',
    manifest_source: text(agent?.manifestSource || agent?.manifest_source, agent ? 'registered_manifest' : 'agent_file_manifest'),
    role: text(manifest.agent_role || agent?.metadata?.agentRole, tags.includes('leader') ? 'leader' : 'worker'),
    workflow_layer: workflowLayer(manifest, agent || {}),
    task_types: taskTypes,
    tags,
    capabilities,
    endpoints: endpointSummary(manifest),
    online: agent ? Boolean(agent.online) : metadata.routable !== false,
    verification_status: text(agent?.verificationStatus || agent?.verification_status, agent ? 'unknown' : 'agent_file_manifest'),
    routable: metadata.routable !== false && metadata.not_routable !== true,
    catalog_summary: text(manifest.description || agent?.description).slice(0, 260),
    catalog_hints: list([
      text(metadata.selection_hint || metadata.selectionHint),
      text(metadata.execution_scope),
      ...taskTypes.slice(0, 6),
      ...capabilities.slice(0, 6)
    ], 16)
  };
}

function manifestFromAgent(agent = {}) {
  return agent?.metadata?.manifest && typeof agent.metadata.manifest === 'object'
    ? agent.metadata.manifest
    : {};
}

function mergeCatalogRecords(records = []) {
  const byKey = new Map();
  for (const record of records) {
    if (!record?.kind && !record?.id) continue;
    const internal = record.source === 'internal_agent_file' || record.source === 'internal_sample';
    const key = internal ? `internal:${record.kind || record.id}` : `${record.kind || record.id}:${record.id}`;
    if (!byKey.has(key)) {
      byKey.set(key, record);
      continue;
    }
    const existing = byKey.get(key);
    byKey.set(key, {
      ...existing,
      ...record,
      id: record.id && !String(record.id).startsWith('manifest:') ? record.id : existing.id,
      name: text(record.name, existing.name),
      source: record.source === 'internal_sample' ? record.source : existing.source,
      role: text(record.role, existing.role),
      workflow_layer: text(record.workflow_layer, existing.workflow_layer),
      endpoints: {
        health: text(record.endpoints?.health, existing.endpoints?.health),
        jobs: text(record.endpoints?.jobs, existing.endpoints?.jobs)
      },
      online: Boolean(record.online || existing.online),
      verification_status: text(record.verification_status, existing.verification_status),
      routable: record.routable !== false && existing.routable !== false,
      catalog_summary: text(record.catalog_summary, existing.catalog_summary),
      tags: Array.from(new Set([...(existing.tags || []), ...(record.tags || [])])).slice(0, 24),
      task_types: Array.from(new Set([...(existing.task_types || []), ...(record.task_types || [])])).slice(0, 16),
      capabilities: Array.from(new Set([...(existing.capabilities || []), ...(record.capabilities || [])])).slice(0, 16),
      catalog_hints: Array.from(new Set([...(existing.catalog_hints || []), ...(record.catalog_hints || [])])).slice(0, 16)
    });
  }
  return Array.from(byKey.values())
    .sort((left, right) => {
      const sourceRank = { external_manifest: 0, external_agent: 1, internal_sample: 2, internal_agent_file: 3 };
      return (sourceRank[left.source] ?? 9) - (sourceRank[right.source] ?? 9)
        || String(left.workflow_layer || '').localeCompare(String(right.workflow_layer || ''))
        || String(left.name || '').localeCompare(String(right.name || ''));
    });
}

export function buildAgentCatalogIndex({ agents = [], includeInternal = true } = {}) {
  const records = [];
  if (includeInternal) {
    for (const [kind, manifest] of Object.entries(SAMPLE_AGENT_MANIFESTS)) {
      records.push(catalogRecordFromManifest(kind, manifest, null));
    }
  }
  for (const agent of Array.isArray(agents) ? agents : []) {
    if (!agentIsVisibleForCatalog(agent)) continue;
    const manifest = manifestFromAgent(agent);
    records.push(catalogRecordFromManifest(manifest.kind || agent.metadata?.category || agent.id, manifest, agent));
  }
  return mergeCatalogRecords(records);
}

export function leaderReadableAgentCatalogIndex(input = {}) {
  return buildAgentCatalogIndex(input).map((record) => ({
    id: record.id,
    kind: record.kind,
    name: record.name,
    source: record.source,
    role: record.role,
    workflow_layer: record.workflow_layer,
    task_types: record.task_types,
    tags: record.tags,
    capabilities: record.capabilities,
    endpoints: record.endpoints,
    routable: record.routable,
    online: record.online,
    verification_status: record.verification_status,
    catalog_summary: record.catalog_summary,
    catalog_hints: record.catalog_hints
  }));
}
