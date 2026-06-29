import { assessAgentRegistrationSafety, normalizeManifest } from './manifest.js';
import { DEFAULT_APP_SEEDS, appIsVisible, mergeSystemApp } from './apps.js';
import { appContextIsExpired, createAppContextRecord } from './app-context.js';
import { deliveryItemsFromJob, sanitizeDeliveryItemForSurface } from './delivery-items.js';
import { DEFAULT_AGENT_SEEDS, DEPRECATED_AGENT_SEED_IDS, nowIso } from './shared.js';
import { APP_SETTING_DEFAULTS, WORK_ACTION_IDS } from '../public/work-action-registry.js';

const CHAT_TRANSCRIPT_RETENTION_LIMIT = 2000;
const APP_CONTEXT_RETENTION_LIMIT = 500;
const DEPRECATED_AGENT_SEED_ID_SET = new Set(DEPRECATED_AGENT_SEED_IDS);
const DEPRECATED_AGENT_SEED_REASON = 'stripe_prohibited_or_restricted_sample_agent';
const UNSAFE_SAMPLE_AGENT_SEED_REASON = 'sample_agent_seed_failed_policy_review';

const DEFAULT_EXACT_MATCH_ACTIONS = Object.freeze([
  {
    id: 'exact_open_work_timeline_en',
    phrase: 'work timeline',
    normalizedPhrase: 'work timeline',
    action: WORK_ACTION_IDS.OPEN_MARKETING_TIMELINE,
    enabled: true,
    source: 'built_in',
    notes: '',
    createdAt: nowIso(),
    updatedAt: nowIso()
  },
  {
    id: 'exact_open_work_timeline_ja',
    phrase: '実行履歴',
    normalizedPhrase: '実行履歴',
    action: WORK_ACTION_IDS.OPEN_MARKETING_TIMELINE,
    enabled: true,
    source: 'built_in',
    notes: '',
    createdAt: nowIso(),
    updatedAt: nowIso()
  }
]);

const DEFAULT_APP_SETTINGS = Object.freeze(
  Object.entries(APP_SETTING_DEFAULTS).map(([key, value]) => ({
    key: String(key || '').trim(),
    value: String(value || ''),
    source: 'default',
    createdAt: nowIso(),
    updatedAt: nowIso()
  }))
);

export const inMemoryState = {
  agents: safeDefaultAgentSeeds(),
  apps: safeDefaultAppSeeds(),
  jobs: [],
  events: [],
  accounts: [],
  feedbackReports: [],
  chatTranscripts: [],
  chatSessions: [],
  appContexts: [],
  deliveryItems: [],
  publisherItems: [],
  publisherItemVersions: [],
  campaigns: [],
  recurringOrders: [],
  emailDeliveries: [],
  exactMatchActions: structuredClone(DEFAULT_EXACT_MATCH_ACTIONS),
  appSettings: structuredClone(DEFAULT_APP_SETTINGS)
};

function sampleAgentSeedManifest(seed = {}) {
  const manifest = seed?.metadata?.manifest && typeof seed.metadata.manifest === 'object'
    ? seed.metadata.manifest
    : {};
  return normalizeManifest({
    schema_version: 'agent-manifest/v1',
    agent_role: seed?.metadata?.agentRole || manifest.agent_role || 'worker',
    name: seed.name,
    description: seed.description,
    task_types: seed.taskTypes,
    ...manifest,
    metadata: {
      ...(manifest.metadata && typeof manifest.metadata === 'object' ? manifest.metadata : {}),
      sample: true,
      seedId: seed.id,
      seedCategory: seed?.metadata?.category || seed?.kind || ''
    }
  });
}

function sampleAgentSeedSafety(seed = {}) {
  return assessAgentRegistrationSafety(sampleAgentSeedManifest(seed));
}

export function isDefaultAgentSeedAllowed(seed = {}) {
  if (!seed?.id || DEPRECATED_AGENT_SEED_ID_SET.has(seed.id)) return false;
  return sampleAgentSeedSafety(seed).ok;
}

function normalizeEndpointBaseUrl(value = '') {
  return String(value || '').trim().replace(/\/+$/, '');
}

function endpointFromManifestBase(baseUrl = '', endpoint = '') {
  const value = String(endpoint || '').trim();
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  if (!baseUrl) return value;
  try {
    const parsedBase = new URL(baseUrl);
    const basePath = parsedBase.pathname.replace(/\/+$/, '');
    if (basePath && value.startsWith(`${basePath}/`)) {
      return `${parsedBase.origin}${value}`;
    }
  } catch {}
  return `${baseUrl}${value.startsWith('/') ? value : `/${value}`}`;
}

export function sampleAgentSeedWithManifestEndpoint(seed = {}, options = {}) {
  const baseUrl = normalizeEndpointBaseUrl(options.sampleAgentEndpointBaseUrl || options.sample_agent_endpoint_base_url || '');
  if (!baseUrl) return seed;
  const seedManifest = seed?.metadata?.manifest && typeof seed.metadata.manifest === 'object'
    ? seed.metadata.manifest
    : {};
  const manifestMetadata = seedManifest.metadata && typeof seedManifest.metadata === 'object' ? seedManifest.metadata : {};
  const endpoints = seedManifest.endpoints && typeof seedManifest.endpoints === 'object' ? seedManifest.endpoints : {};
  const kind = String(seedManifest.kind || manifestMetadata.category || seed?.metadata?.category || seed?.metadata?.sampleKind || seed?.metadata?.sample_kind || '').trim().toLowerCase();
  if (!kind) return seed;
  const healthcheckUrl = endpointFromManifestBase(baseUrl, seedManifest.healthcheckUrl || seedManifest.healthcheck_url || endpoints.health || `/sample-agents/${kind}/health`);
  const jobEndpoint = endpointFromManifestBase(baseUrl, seedManifest.jobEndpoint || seedManifest.job_endpoint || endpoints.jobs || `/sample-agents/${kind}/jobs`);
  const clone = structuredClone(seed);
  clone.online = true;
  clone.manifestSource = 'agent-file-manifest';
  clone.verificationStatus = 'verified';
  clone.agentReviewStatus = 'not_required';
  clone.agentReview = {
    status: 'not_required',
    source: 'agent-file-manifest',
    reviewedAt: nowIso(),
    reasons: []
  };
  clone.verificationError = null;
  clone.verificationDetails = {
    category: 'verified',
    code: 'provider_endpoint_configured',
    reason: 'Sample agent is backed by its agent-file manifest endpoint.',
    details: {
      verificationMode: 'provider_endpoint_configured',
      service: `sample_${kind}_manifest_provider`,
      statusCode: 200,
      trust: clone.trust || clone.metadata?.trust || null
    }
  };
  clone.metadata = {
    ...(clone.metadata && typeof clone.metadata === 'object' ? clone.metadata : {}),
    externalProviderRequired: false,
    external_provider_required: false,
    manifest: {
      ...seedManifest,
      healthcheckUrl,
      healthcheck_url: healthcheckUrl,
      jobEndpoint,
      job_endpoint: jobEndpoint,
      endpoints: {
        ...endpoints,
        health: healthcheckUrl,
        jobs: jobEndpoint
      },
      metadata: {
        ...manifestMetadata,
        externalProviderRequired: false,
        external_provider_required: false,
        execution_scope: 'agent_file_manifest',
        source: 'agent_file_manifest'
      }
    }
  };
  return clone;
}

function safeDefaultAgentSeeds(options = {}) {
  return structuredClone(DEFAULT_AGENT_SEEDS
    .filter(isDefaultAgentSeedAllowed)
    .map((seed) => sampleAgentSeedWithManifestEndpoint(seed, options)));
}

function safeDefaultAppSeeds() {
  return structuredClone(DEFAULT_APP_SEEDS);
}

function localSampleEndpointLike(value = '') {
  return /^\/(?:mock|sample-agents)\/[^/]+\/(?:health|jobs)$/i.test(String(value || '').trim());
}

function providerEndpointValue(value = '') {
  const raw = String(value || '').trim();
  if (!raw || localSampleEndpointLike(raw)) return '';
  return raw;
}

function manifestDispatchEndpointValues(manifest = {}) {
  const endpoints = manifest?.endpoints && typeof manifest.endpoints === 'object' ? manifest.endpoints : {};
  const metadata = manifest?.metadata && typeof manifest.metadata === 'object' ? manifest.metadata : {};
  return {
    healthcheckUrl: providerEndpointValue(manifest.healthcheckUrl || manifest.healthcheck_url || manifest.healthUrl || manifest.health_url || endpoints.health),
    jobEndpoint: providerEndpointValue(manifest.jobEndpoint || manifest.job_endpoint || manifest.jobsUrl || manifest.jobs_url || endpoints.jobs || metadata.jobEndpoint || metadata.job_endpoint)
  };
}

function mergeSampleSeedManifest(existingManifest = {}, seedManifest = {}) {
  const existingEndpoints = manifestDispatchEndpointValues(existingManifest);
  const mergedEndpoints = {
    ...(seedManifest?.endpoints && typeof seedManifest.endpoints === 'object' ? seedManifest.endpoints : {})
  };
  if (existingEndpoints.healthcheckUrl) mergedEndpoints.health = existingEndpoints.healthcheckUrl;
  if (existingEndpoints.jobEndpoint) mergedEndpoints.jobs = existingEndpoints.jobEndpoint;
  const mergedMetadata = {
    ...(seedManifest?.metadata && typeof seedManifest.metadata === 'object' ? seedManifest.metadata : {})
  };
  if (existingEndpoints.healthcheckUrl || existingEndpoints.jobEndpoint) {
    mergedMetadata.externalProviderRequired = false;
    mergedMetadata.external_provider_required = false;
    mergedMetadata.execution_scope = 'provider_endpoint';
  }
  return {
    ...structuredClone(seedManifest || {}),
    ...(existingEndpoints.healthcheckUrl ? {
      healthcheckUrl: existingEndpoints.healthcheckUrl,
      healthcheck_url: existingEndpoints.healthcheckUrl
    } : {}),
    ...(existingEndpoints.jobEndpoint ? {
      jobEndpoint: existingEndpoints.jobEndpoint,
      job_endpoint: existingEndpoints.jobEndpoint
    } : {}),
    ...(existingManifest?.auth && typeof existingManifest.auth === 'object' ? { auth: structuredClone(existingManifest.auth) } : {}),
    ...(Object.keys(mergedEndpoints).length ? { endpoints: mergedEndpoints } : {}),
    metadata: mergedMetadata
  };
}

export function isRuntimeHiddenAgent(agent = {}) {
  const metadata = agent?.metadata && typeof agent.metadata === 'object' ? agent.metadata : {};
  return Boolean(
    DEPRECATED_AGENT_SEED_ID_SET.has(agent?.id)
    || metadata.hidden_from_catalog
    || metadata.not_routable
    || metadata.deleted_at
    || metadata.deletedAt
    || String(agent?.verificationStatus || '').toLowerCase() === 'deprecated'
  );
}

export function mergeSystemAgent(existing = {}, seed = {}) {
  const existingMetadata = existing?.metadata && typeof existing.metadata === 'object'
    ? { ...existing.metadata }
    : {};
  const existingManifest = existingMetadata.manifest && typeof existingMetadata.manifest === 'object'
    ? existingMetadata.manifest
    : {};
  const seedManifest = seed?.metadata?.manifest && typeof seed.metadata.manifest === 'object'
    ? seed.metadata.manifest
    : {};
  const existingEndpoints = manifestDispatchEndpointValues(existingManifest);
  const seedEndpoints = manifestDispatchEndpointValues(seedManifest);
  const hasExistingProviderEndpoint = Boolean(existingEndpoints.healthcheckUrl || existingEndpoints.jobEndpoint);
  const hasSeedProviderEndpoint = Boolean(seedEndpoints.healthcheckUrl || seedEndpoints.jobEndpoint);
  const hasProviderEndpoint = hasExistingProviderEndpoint || hasSeedProviderEndpoint;
  const mergedManifest = hasExistingProviderEndpoint
    ? mergeSampleSeedManifest(existingManifest, seedManifest)
    : structuredClone(seedManifest || existingManifest || {});
  delete existingMetadata.hidden_from_catalog;
  delete existingMetadata.not_routable;
  delete existingMetadata.deleted_at;
  delete existingMetadata.deletedAt;
  delete existingMetadata.deleted_reason;
  delete existingMetadata.deletedReason;
  delete existingMetadata.deprecated_seed;
  return {
    ...existing,
    ...structuredClone(seed),
    earnings: Number(existing?.earnings ?? seed.earnings ?? 0),
    createdAt: existing?.createdAt || seed.createdAt || nowIso(),
    updatedAt: nowIso(),
    token: existing?.token || seed.token,
    owner: hasProviderEndpoint ? (existing?.owner || seed.owner) : seed.owner,
    online: hasSeedProviderEndpoint ? Boolean(seed.online) : (hasExistingProviderEndpoint ? Boolean(existing?.online) : seed.online),
    metadata: {
      ...existingMetadata,
      ...(seed?.metadata && typeof seed.metadata === 'object' ? seed.metadata : {}),
      ...(hasProviderEndpoint ? {
        externalProviderRequired: false,
        external_provider_required: false
      } : {}),
      manifest: mergedManifest
    },
    verificationStatus: hasSeedProviderEndpoint
      ? seed.verificationStatus
      : (hasExistingProviderEndpoint ? (existing?.verificationStatus || seed.verificationStatus) : seed.verificationStatus),
    verificationCheckedAt: hasProviderEndpoint
      ? (seed.verificationCheckedAt || existing?.verificationCheckedAt || nowIso())
      : (seed.verificationCheckedAt || existing?.verificationCheckedAt || nowIso()),
    verificationError: hasSeedProviderEndpoint
      ? seed.verificationError
      : (hasExistingProviderEndpoint ? (existing?.verificationError || null) : seed.verificationError),
    verificationDetails: structuredClone(hasSeedProviderEndpoint
      ? (seed.verificationDetails || existing?.verificationDetails || null)
      : hasExistingProviderEndpoint
      ? (existing?.verificationDetails || seed.verificationDetails || null)
      : (seed.verificationDetails || existing?.verificationDetails || null))
  };
}

export function softDeleteDeprecatedAgent(agent = {}, reason = DEPRECATED_AGENT_SEED_REASON) {
  const deletedAt = agent?.metadata?.deleted_at || agent?.metadata?.deletedAt || nowIso();
  return {
    ...agent,
    id: agent.id,
    name: agent.name || `DEPRECATED SAMPLE AGENT ${agent.id || ''}`.trim(),
    description: agent.description || 'Deprecated sample agent retained for audit only.',
    taskTypes: Array.isArray(agent.taskTypes) ? agent.taskTypes : [],
    online: false,
    owner: agent.owner || 'cait-samples',
    metadata: {
      ...(agent.metadata && typeof agent.metadata === 'object' ? agent.metadata : {}),
      deleted_at: deletedAt,
      deletedAt,
      deleted_reason: reason,
      deletedReason: reason,
      deprecated_seed: true,
      hidden_from_catalog: true,
      not_routable: true
    },
    verificationStatus: 'deprecated',
    verificationCheckedAt: agent.verificationCheckedAt || deletedAt,
    verificationError: agent.verificationError || 'Deprecated sample agent retained for audit; not routable.',
    updatedAt: nowIso()
  };
}

export function softDeleteUnsafeSampleAgentSeed(existing = {}, seed = {}) {
  const safety = sampleAgentSeedSafety(seed);
  const deletedAt = existing?.metadata?.deleted_at || existing?.metadata?.deletedAt || nowIso();
  return softDeleteDeprecatedAgent({
    ...existing,
    ...seed,
    online: false,
    metadata: {
      ...(existing?.metadata && typeof existing.metadata === 'object' ? existing.metadata : {}),
      ...(seed?.metadata && typeof seed.metadata === 'object' ? seed.metadata : {}),
      deleted_at: deletedAt,
      deletedAt,
      deleted_reason: UNSAFE_SAMPLE_AGENT_SEED_REASON,
      deletedReason: UNSAFE_SAMPLE_AGENT_SEED_REASON,
      policy_findings: safety.blocked || []
    },
    verificationError: safety.summary || 'Sample agent seed failed policy review.'
  }, UNSAFE_SAMPLE_AGENT_SEED_REASON);
}

export function ensureDefaultAgentsState(inputState = {}, options = {}) {
  const agents = Array.isArray(inputState.agents)
    ? inputState.agents.filter((agent) => agent && !isRuntimeHiddenAgent(agent))
    : [];
  const byId = new Map(agents.map((agent) => [agent.id, agent]));
  for (const rawSeed of DEFAULT_AGENT_SEEDS) {
    const seed = sampleAgentSeedWithManifestEndpoint(rawSeed, options);
    if (!isDefaultAgentSeedAllowed(rawSeed)) {
      if (byId.has(rawSeed.id)) byId.set(rawSeed.id, softDeleteUnsafeSampleAgentSeed(byId.get(rawSeed.id), rawSeed));
      continue;
    }
    byId.set(seed.id, mergeSystemAgent(byId.get(seed.id), seed));
  }
  return {
    ...inputState,
    agents: [...byId.values()].filter((agent) => !isRuntimeHiddenAgent(agent))
  };
}

export function ensureDefaultAppsState(inputState = {}) {
  const apps = Array.isArray(inputState.apps)
    ? inputState.apps.filter((app) => app && appIsVisible(app))
    : [];
  const byId = new Map(apps.map((app) => [app.id, app]));
  for (const seed of DEFAULT_APP_SEEDS) {
    byId.set(seed.id, mergeSystemApp(byId.get(seed.id), seed));
  }
  return {
    ...inputState,
    apps: [...byId.values()].filter((app) => appIsVisible(app))
  };
}

function chatTranscriptTimestamp(transcript = {}) {
  return String(transcript?.createdAt || transcript?.created_at || transcript?.updatedAt || transcript?.updated_at || '').trim();
}

function jobTimestamp(job = {}) {
  return String(
    job?.completedAt
    || job?.completed_at
    || job?.failedAt
    || job?.failed_at
    || job?.timedOutAt
    || job?.timed_out_at
    || job?.lastCallbackAt
    || job?.last_callback_at
    || job?.startedAt
    || job?.started_at
    || job?.dispatchedAt
    || job?.dispatched_at
    || job?.claimedAt
    || job?.claimed_at
    || job?.createdAt
    || job?.created_at
    || ''
  ).trim();
}

function accountTimestamp(account = {}) {
  return String(account?.updatedAt || account?.updated_at || account?.createdAt || account?.created_at || '').trim();
}

function accountMergeKey(account = {}) {
  const login = String(account?.login || '').trim().toLowerCase();
  if (login) return `login:${login}`;
  const id = String(account?.id || '').trim().toLowerCase();
  return id ? `id:${id}` : '';
}

function apiKeyMergeKey(key = {}) {
  const id = String(key?.id || '').trim();
  if (id) return `id:${id}`;
  const keyHash = String(key?.keyHash || key?.key_hash || '').trim();
  if (keyHash) return `hash:${keyHash}`;
  const prefix = String(key?.prefix || '').trim();
  const createdAt = String(key?.createdAt || key?.created_at || '').trim();
  return prefix || createdAt ? `prefix:${prefix}:${createdAt}` : '';
}

function mergeOrderApiKeyRecord(existing = null, incoming = null) {
  if (!existing) return structuredClone(incoming);
  if (!incoming) return structuredClone(existing);
  const existingTs = String(existing.lastUsedAt || existing.updatedAt || existing.createdAt || existing.created_at || '').trim();
  const incomingTs = String(incoming.lastUsedAt || incoming.updatedAt || incoming.createdAt || incoming.created_at || '').trim();
  const preferred = incomingTs >= existingTs ? incoming : existing;
  const secondary = preferred === incoming ? existing : incoming;
  return {
    ...structuredClone(secondary),
    ...structuredClone(preferred),
    keyHash: preferred.keyHash || secondary.keyHash || preferred.key_hash || secondary.key_hash || '',
    revokedAt: preferred.revokedAt || secondary.revokedAt || preferred.revoked_at || secondary.revoked_at || ''
  };
}

function mergeOrderApiKeySets(existing = [], incoming = []) {
  const merged = new Map();
  for (const item of Array.isArray(existing) ? existing : []) {
    const key = apiKeyMergeKey(item);
    if (!key) continue;
    merged.set(key, structuredClone(item));
  }
  for (const item of Array.isArray(incoming) ? incoming : []) {
    const key = apiKeyMergeKey(item);
    if (!key) continue;
    merged.set(key, mergeOrderApiKeyRecord(merged.get(key), item));
  }
  return [...merged.values()];
}

function mergeUniqueStrings(...groups) {
  const seen = new Set();
  const values = [];
  for (const group of groups) {
    for (const value of Array.isArray(group) ? group : []) {
      const normalized = String(value || '').trim().toLowerCase();
      if (!normalized || seen.has(normalized)) continue;
      seen.add(normalized);
      values.push(normalized);
    }
  }
  return values;
}

function mergeUniqueObjects(existing = [], incoming = [], keyFn = (item) => JSON.stringify(item)) {
  const merged = new Map();
  for (const item of [...(Array.isArray(existing) ? existing : []), ...(Array.isArray(incoming) ? incoming : [])]) {
    const key = String(keyFn(item) || '').trim();
    if (!key) continue;
    merged.set(key, structuredClone(item));
  }
  return [...merged.values()];
}

function mergeAccountRecord(existing = null, incoming = null) {
  if (!existing) return structuredClone(incoming);
  if (!incoming) return structuredClone(existing);
  const existingTs = accountTimestamp(existing);
  const incomingTs = accountTimestamp(incoming);
  const preferred = incomingTs >= existingTs ? incoming : existing;
  const secondary = preferred === incoming ? existing : incoming;
  const preferredApiAccess = preferred.apiAccess && typeof preferred.apiAccess === 'object' ? preferred.apiAccess : {};
  const secondaryApiAccess = secondary.apiAccess && typeof secondary.apiAccess === 'object' ? secondary.apiAccess : {};
  return {
    ...structuredClone(secondary),
    ...structuredClone(preferred),
    aliases: mergeUniqueStrings(secondary.aliases, preferred.aliases, [secondary.login, preferred.login]),
    linkedIdentities: mergeUniqueObjects(secondary.linkedIdentities, preferred.linkedIdentities, (identity) => [
      identity?.provider,
      identity?.providerUserId || identity?.provider_user_id,
      identity?.login,
      identity?.email
    ].map((part) => String(part || '').trim().toLowerCase()).join(':')),
    apiAccess: {
      ...structuredClone(secondaryApiAccess),
      ...structuredClone(preferredApiAccess),
      orderKeys: mergeOrderApiKeySets(secondaryApiAccess.orderKeys, preferredApiAccess.orderKeys)
    }
  };
}

export function mergeAccountSets(existing = [], incoming = []) {
  const merged = new Map();
  for (const item of Array.isArray(existing) ? existing : []) {
    const key = accountMergeKey(item);
    if (!key) continue;
    merged.set(key, structuredClone(item));
  }
  for (const item of Array.isArray(incoming) ? incoming : []) {
    const key = accountMergeKey(item);
    if (!key) continue;
    merged.set(key, mergeAccountRecord(merged.get(key), item));
  }
  return [...merged.values()]
    .sort((a, b) => accountTimestamp(b).localeCompare(accountTimestamp(a)));
}

export function mergeJobSets(existing = [], incoming = []) {
  const merged = new Map();
  for (const item of Array.isArray(existing) ? existing : []) {
    if (!item?.id) continue;
    merged.set(item.id, structuredClone(item));
  }
  for (const item of Array.isArray(incoming) ? incoming : []) {
    if (!item?.id) continue;
    const prior = merged.get(item.id);
    merged.set(item.id, mergeJobRecord(prior, item));
  }
  return [...merged.values()]
    .sort((a, b) => jobTimestamp(b).localeCompare(jobTimestamp(a)));
}

function jobStatusRank(status = '') {
  switch (String(status || '').trim().toLowerCase()) {
    case 'completed':
      return 5;
    case 'failed':
    case 'timed_out':
      return 4;
    case 'dispatched':
    case 'running':
      return 3;
    case 'claimed':
      return 2;
    case 'queued':
    case 'blocked':
      return 1;
    default:
      return 0;
  }
}

function jobStatusIsTerminalForMerge(status = '') {
  return ['completed', 'failed', 'timed_out'].includes(String(status || '').trim().toLowerCase());
}

function jobStatusIsRecoverableTerminalForMerge(status = '') {
  return ['failed', 'timed_out'].includes(String(status || '').trim().toLowerCase());
}

export function jobIsApprovalBlockedForStorage(job = {}) {
  return String(job?.failureCategory || job?.failure_category || '').trim().toLowerCase() === 'blocked_waiting_for_approval'
    || String(job?.dispatch?.completionStatus || job?.dispatch?.completion_status || '').trim().toLowerCase() === 'blocked_waiting_for_approval';
}

function dispatchCompletionStatusRank(status = '') {
  const safe = String(status || '').trim().toLowerCase();
  if (['completed'].includes(safe)) return 9;
  if (['blocked_waiting_for_approval', 'failed', 'timed_out', 'completion_sweep_timed_out', 'completion_queue_exhausted', 'completion_sweep_exhausted'].includes(safe)) return 8;
  if (['completion_sweep_running', 'dispatch_in_progress'].includes(safe)) return 5;
  if (['accepted'].includes(safe)) return 4;
  if (['completion_queued'].includes(safe)) return 4;
  if (['dispatch_scheduled'].includes(safe)) return 3;
  if (['leader_auto_retry_queued', 'retry_queued', 'leader_checkpoint_queued', 'leader_final_summary_queued', 'leader_adaptive_queued'].includes(safe)) return 2;
  if (['leader_checkpoint_blocked', 'leader_final_summary_blocked', 'leader_adaptive_pending'].includes(safe)) return 2;
  return safe ? 1 : 0;
}

function mergeJobLogs(existingLogs = [], incomingLogs = []) {
  const seen = new Set();
  const merged = [];
  for (const entry of [...(Array.isArray(existingLogs) ? existingLogs : []), ...(Array.isArray(incomingLogs) ? incomingLogs : [])]) {
    const line = String(entry || '').trim();
    if (!line || seen.has(line)) continue;
    seen.add(line);
    merged.push(line);
  }
  return merged;
}

export function mergeJobRecord(existing = null, incoming = null) {
  if (!existing?.id) return structuredClone(incoming);
  if (!incoming?.id) return structuredClone(existing);
  const existingStatus = String(existing.status || '').trim().toLowerCase();
  const incomingStatus = String(incoming.status || '').trim().toLowerCase();
  const existingRank = jobStatusRank(existing.status);
  const incomingRank = jobStatusRank(incoming.status);
  const existingTs = jobTimestamp(existing);
  const incomingTs = jobTimestamp(incoming);
  let preferred = incoming;
  let secondary = existing;
  const existingTerminal = jobStatusIsTerminalForMerge(existingStatus);
  const incomingTerminal = jobStatusIsTerminalForMerge(incomingStatus);
  const incomingActive = ['queued', 'claimed', 'running', 'dispatched'].includes(incomingStatus);
  const incomingClearedTerminalTimestamps = !incoming.completedAt && !incoming.completed_at
    && !incoming.failedAt && !incoming.failed_at
    && !incoming.timedOutAt && !incoming.timed_out_at;
  const existingActive = ['queued', 'claimed', 'running', 'dispatched'].includes(existingStatus);
  const existingClearedTerminalTimestamps = !existing.completedAt && !existing.completed_at
    && !existing.failedAt && !existing.failed_at
    && !existing.timedOutAt && !existing.timed_out_at;
  const existingBlocked = existingStatus === 'blocked';
  const incomingBlocked = incomingStatus === 'blocked';
  const existingCompleted = existingTerminal && existingStatus === 'completed';
  const incomingCompleted = incomingTerminal && incomingStatus === 'completed';
  const existingRecoverableTerminal = jobStatusIsRecoverableTerminalForMerge(existingStatus);
  const incomingRecoverableTerminal = jobStatusIsRecoverableTerminalForMerge(incomingStatus);
  const existingLogsLength = Array.isArray(existing.logs) ? existing.logs.length : 0;
  const incomingLogsLength = Array.isArray(incoming.logs) ? incoming.logs.length : 0;
  const incomingRetryMutation = existingRecoverableTerminal
    && incomingActive
    && incomingClearedTerminalTimestamps
    && (
      Number(incoming.dispatch?.attempts || 0) > Number(existing.dispatch?.attempts || 0)
      || String(incoming.dispatch?.completionStatus || '') !== String(existing.dispatch?.completionStatus || '')
      || String(incoming.dispatchedAt || incoming.dispatched_at || '') !== String(existing.dispatchedAt || existing.dispatched_at || '')
      || incomingLogsLength > existingLogsLength
    );
  const existingRetryMutation = incomingRecoverableTerminal
    && existingActive
    && existingClearedTerminalTimestamps
    && existingLogsLength > incomingLogsLength;
  const incomingCompletesActive = incomingCompleted
    && existingActive;
  const existingCompletedBlocksStaleActive = existingCompleted
    && incomingActive
    && incomingClearedTerminalTimestamps;
  const incomingBlocksActive = incomingBlocked
    && existingActive
    && incomingClearedTerminalTimestamps
    && (
      String(incoming.failureReason || incoming.failure_reason || '') !== String(existing.failureReason || existing.failure_reason || '')
      || String(incoming.dispatch?.completionStatus || '') !== String(existing.dispatch?.completionStatus || '')
      || incomingLogsLength >= existingLogsLength
    );
  const incomingUnblocksExisting = existingBlocked
    && incomingActive
    && incomingClearedTerminalTimestamps
    && (
      Number(incoming.dispatch?.attempts || 0) > Number(existing.dispatch?.attempts || 0)
      || String(incoming.dispatch?.completionStatus || '') !== String(existing.dispatch?.completionStatus || '')
      || incomingLogsLength > existingLogsLength
    );
  const incomingLeaderControlUnblocksExisting = existingBlocked
    && incomingActive
    && incomingClearedTerminalTimestamps
    && ['leader_checkpoint_queued', 'leader_final_summary_queued'].includes(String(incoming.dispatch?.completionStatus || '').trim().toLowerCase());
  const incomingActiveDispatchMutation = existingActive
    && incomingActive
    && incomingClearedTerminalTimestamps
    && dispatchCompletionStatusRank(incoming.dispatch?.completionStatus) >= dispatchCompletionStatusRank(existing.dispatch?.completionStatus)
    && (
      String(incoming.dispatch?.completionStatus || '') !== String(existing.dispatch?.completionStatus || '')
      || String(incoming.dispatch?.completionSweepRequestedAt || '') !== String(existing.dispatch?.completionSweepRequestedAt || '')
      || String(incoming.dispatch?.completionQueueRequestedAt || '') !== String(existing.dispatch?.completionQueueRequestedAt || '')
      || Number(incoming.dispatch?.completionSweepAttempts || 0) > Number(existing.dispatch?.completionSweepAttempts || 0)
      || Number(incoming.dispatch?.completionQueueAttempts || 0) > Number(existing.dispatch?.completionQueueAttempts || 0)
      || incomingLogsLength > existingLogsLength
    );
  const incomingSoftRetryFromSweep = existingActive
    && incomingActive
    && incomingClearedTerminalTimestamps
    && String(existing.dispatch?.completionStatus || '').trim().toLowerCase() === 'completion_sweep_running'
    && ['leader_auto_retry_queued', 'retry_queued'].includes(String(incoming.dispatch?.completionStatus || '').trim().toLowerCase())
    && (
      String(incoming.dispatch?.completionSweepSoftTimedOutAt || '') !== String(existing.dispatch?.completionSweepSoftTimedOutAt || '')
      || incomingLogsLength > existingLogsLength
    );
  const incomingEndpointDispatchRecovery = existingActive
    && incomingActive
    && incomingClearedTerminalTimestamps
    && Boolean(incoming.dispatch?.endpointDispatchRecoveredAt)
    && ['dispatch_scheduled', 'retry_queued', 'leader_auto_retry_queued'].includes(String(incoming.dispatch?.completionStatus || '').trim().toLowerCase())
    && incomingLogsLength >= existingLogsLength;
  const incomingActiveDispatchRegression = existingActive
    && incomingActive
    && incomingClearedTerminalTimestamps
    && dispatchCompletionStatusRank(incoming.dispatch?.completionStatus) < dispatchCompletionStatusRank(existing.dispatch?.completionStatus)
    && String(incoming.dispatch?.completionStatus || '') !== String(existing.dispatch?.completionStatus || '');
  if (incomingCompletesActive) {
    preferred = incoming;
    secondary = existing;
  } else if (existingCompletedBlocksStaleActive) {
    preferred = existing;
    secondary = incoming;
  } else if (incomingLeaderControlUnblocksExisting) {
    preferred = incoming;
    secondary = existing;
  } else if (incomingUnblocksExisting) {
    preferred = incoming;
    secondary = existing;
  } else if (incomingBlocksActive) {
    preferred = incoming;
    secondary = existing;
  } else if (incomingSoftRetryFromSweep) {
    preferred = incoming;
    secondary = existing;
  } else if (incomingEndpointDispatchRecovery) {
    preferred = incoming;
    secondary = existing;
  } else if (incomingActiveDispatchMutation) {
    preferred = incoming;
    secondary = existing;
  } else if (incomingActiveDispatchRegression) {
    preferred = existing;
    secondary = incoming;
  } else if (existingRetryMutation) {
    preferred = existing;
    secondary = incoming;
  } else if (incomingRetryMutation) {
    preferred = incoming;
    secondary = existing;
  } else if (existingRank > incomingRank) {
    preferred = existing;
    secondary = incoming;
  } else if (incomingRank > existingRank) {
    preferred = incoming;
    secondary = existing;
  } else if (existingTs > incomingTs) {
    preferred = existing;
    secondary = incoming;
  }
  return {
    ...structuredClone(secondary),
    ...structuredClone(preferred),
    logs: mergeJobLogs(secondary.logs, preferred.logs)
  };
}

export function mergeChatTranscriptSets(existing = [], incoming = [], limit = CHAT_TRANSCRIPT_RETENTION_LIMIT) {
  const merged = new Map();
  for (const item of Array.isArray(existing) ? existing : []) {
    if (!item?.id) continue;
    merged.set(item.id, structuredClone(item));
  }
  for (const item of Array.isArray(incoming) ? incoming : []) {
    if (!item?.id) continue;
    merged.set(item.id, structuredClone(item));
  }
  return [...merged.values()]
    .sort((a, b) => chatTranscriptTimestamp(b).localeCompare(chatTranscriptTimestamp(a)))
    .slice(0, limit);
}

function appContextTimestamp(context = {}) {
  return String(context?.updatedAt || context?.updated_at || context?.createdAt || context?.created_at || '').trim();
}

export function normalizeAppContextRecord(context = {}) {
  const id = String(context?.id || context?.payload?.id || '').trim();
  if (!id) return null;
  return createAppContextRecord(context.payload || context.context || context, {
    login: context.ownerLogin || context.owner_login || context.owner || ''
  }, {
    id,
    accessToken: context.accessToken || context.access_token || '',
    status: context.status || 'ready',
    expiresAt: context.expiresAt || context.expires_at || '',
    createdAt: context.createdAt || context.created_at || '',
    updatedAt: context.updatedAt || context.updated_at || ''
  });
}

export function deliveryItemTimestamp(item = {}) {
  return String(item?.updatedAt || item?.updated_at || item?.createdAt || item?.created_at || '').trim();
}

function deliveryItemMergeKey(item = {}) {
  const source = item?.source && typeof item.source === 'object' ? item.source : {};
  const metadata = item?.metadata && typeof item.metadata === 'object' ? item.metadata : {};
  const sourceFile = String(source.file_name || source.fileName || metadata.file_name || '').trim().toLowerCase();
  const sourceIndex = String(metadata.source_index ?? source.source_index ?? '').trim();
  const sourceKind = String(source.source_kind || metadata.source_kind || '').trim().toLowerCase();
  if (sourceFile || sourceIndex || sourceKind) {
    return [
      'delivery-source',
      String(item.ownerLogin || item.owner_login || '').trim().toLowerCase(),
      String(item.surface || '').trim().toLowerCase(),
      String(item.itemType || item.item_type || '').trim().toLowerCase(),
      String(item.jobId || item.job_id || '').trim(),
      String(item.workflowParentId || item.workflow_parent_id || '').trim(),
      String(item.workflowTask || item.workflow_task || '').trim().toLowerCase(),
      sourceKind,
      sourceFile,
      sourceIndex
    ].join('|');
  }
  return `delivery-id|${String(item.id || '').trim()}`;
}

export function normalizeDeliveryItemRecord(item = {}) {
  const id = String(item?.id || '').trim();
  if (!id) return null;
  return sanitizeDeliveryItemForSurface({
    id,
    ownerLogin: String(item.ownerLogin || item.owner_login || '').trim().toLowerCase(),
    surface: String(item.surface || 'general').trim().toLowerCase(),
    itemType: String(item.itemType || item.item_type || 'delivery_asset').trim().toLowerCase(),
    status: String(item.status || 'needs_review').trim().toLowerCase(),
    title: String(item.title || 'Delivery item').trim(),
    summary: String(item.summary || '').trim(),
    body: String(item.body || item.content || '').trim(),
    metadata: item.metadata && typeof item.metadata === 'object' ? structuredClone(item.metadata) : {},
    source: item.source && typeof item.source === 'object' ? structuredClone(item.source) : {},
    jobId: String(item.jobId || item.job_id || '').trim(),
    workflowParentId: String(item.workflowParentId || item.workflow_parent_id || '').trim(),
    workflowTask: String(item.workflowTask || item.workflow_task || '').trim(),
    workflowAgentName: String(item.workflowAgentName || item.workflow_agent_name || '').trim(),
    createdAt: String(item.createdAt || item.created_at || nowIso()).trim(),
    updatedAt: String(item.updatedAt || item.updated_at || item.createdAt || item.created_at || nowIso()).trim()
  });
}

export function mergeDeliveryItemSets(existing = [], incoming = [], limit = 5000) {
  const merged = new Map();
  for (const item of [...(Array.isArray(existing) ? existing : []), ...(Array.isArray(incoming) ? incoming : [])]) {
    const normalized = normalizeDeliveryItemRecord(item);
    if (!normalized?.id) continue;
    const key = deliveryItemMergeKey(normalized);
    const prior = merged.get(key);
    if (!prior || deliveryItemTimestamp(normalized) >= deliveryItemTimestamp(prior)) merged.set(key, normalized);
  }
  return [...merged.values()]
    .sort((a, b) => deliveryItemTimestamp(b).localeCompare(deliveryItemTimestamp(a)))
    .slice(0, limit);
}

export function deliveryItemsForJobs(jobs = []) {
  return (Array.isArray(jobs) ? jobs : [])
    .flatMap((job) => deliveryItemsFromJob(job))
    .map(normalizeDeliveryItemRecord)
    .filter(Boolean);
}

export function mergeAppContextSets(existing = [], incoming = [], limit = APP_CONTEXT_RETENTION_LIMIT) {
  const merged = new Map();
  for (const item of [...(Array.isArray(existing) ? existing : []), ...(Array.isArray(incoming) ? incoming : [])]) {
    const normalized = normalizeAppContextRecord(item);
    if (!normalized || appContextIsExpired(normalized)) continue;
    const prior = merged.get(normalized.id);
    if (!prior || appContextTimestamp(normalized) >= appContextTimestamp(prior)) merged.set(normalized.id, normalized);
  }
  return [...merged.values()]
    .sort((a, b) => appContextTimestamp(b).localeCompare(appContextTimestamp(a)))
    .slice(0, limit);
}

export function normalizeExactMatchActionRecord(action = {}) {
  const phrase = String(action.phrase || '').trim();
  const normalizedPhrase = String(action.normalizedPhrase || phrase).trim().replace(/\s+/g, ' ').toLowerCase();
  return {
    id: String(action.id || '').trim() || `exact_${normalizedPhrase.replace(/[^a-z0-9\u3040-\u30ff\u3400-\u9fff]+/gi, '_') || 'rule'}`,
    phrase,
    normalizedPhrase,
    action: String(action.action || '').trim(),
    enabled: action.enabled !== false,
    source: String(action.source || 'manual').trim() || 'manual',
    notes: String(action.notes || '').trim(),
    createdAt: action.createdAt || nowIso(),
    updatedAt: action.updatedAt || action.createdAt || nowIso()
  };
}

export function mergeExactMatchActions(existing = [], incoming = []) {
  const merged = new Map();
  for (const item of [...DEFAULT_EXACT_MATCH_ACTIONS, ...(Array.isArray(existing) ? existing : []), ...(Array.isArray(incoming) ? incoming : [])]) {
    const normalized = normalizeExactMatchActionRecord(item);
    if (!normalized.phrase || !normalized.action) continue;
    merged.set(normalized.id, structuredClone(normalized));
  }
  return [...merged.values()].sort((a, b) => String(a.phrase || '').localeCompare(String(b.phrase || '')));
}

export function normalizeAppSettingRecord(setting = {}) {
  const key = String(setting?.key || '').trim();
  if (!key) return null;
  const value = String(setting?.value ?? '');
  return {
    key,
    value,
    source: String(setting?.source || 'manual').trim().slice(0, 40) || 'manual',
    createdAt: setting?.createdAt || setting?.created_at || nowIso(),
    updatedAt: setting?.updatedAt || setting?.updated_at || setting?.createdAt || setting?.created_at || nowIso()
  };
}

export function mergeAppSettings(existing = [], incoming = []) {
  const merged = new Map();
  for (const item of DEFAULT_APP_SETTINGS) {
    const normalized = normalizeAppSettingRecord(item);
    if (!normalized) continue;
    merged.set(normalized.key, normalized);
  }
  for (const item of Array.isArray(existing) ? existing : []) {
    const normalized = normalizeAppSettingRecord(item);
    if (!normalized) continue;
    merged.set(normalized.key, normalized);
  }
  for (const item of Array.isArray(incoming) ? incoming : []) {
    const normalized = normalizeAppSettingRecord(item);
    if (!normalized) continue;
    merged.set(normalized.key, normalized);
  }
  return [...merged.values()].sort((a, b) => String(a.key || '').localeCompare(String(b.key || '')));
}
