import { assessAgentRegistrationSafety, normalizeManifest } from './manifest.js';
import { DEFAULT_APP_SEEDS, appIsVisible, mergeSystemApp } from './apps.js';
import { appContextIsExpired, createAppContextRecord } from './app-context.js';
import { deserializeCampaign, mergeCampaignSets, serializeCampaign } from './campaigns.js';
import { deliveryItemsFromJob, sanitizeDeliveryItemForSurface } from './delivery-items.js';
import {
  DEFAULT_AGENT_SEEDS,
  DEPRECATED_AGENT_SEED_IDS,
  authenticateOrderApiKey as authenticateOrderApiKeyInState,
  hashSecret,
  makeEvent,
  nowIso
} from './shared.js';
import { APP_SETTING_DEFAULTS, WORK_ACTION_IDS } from '../public/work-action-registry.js';

const EVENT_LOG_RETENTION_LIMIT = 2000;
const CHAT_TRANSCRIPT_RETENTION_LIMIT = 2000;
const CHAT_SESSION_RETENTION_LIMIT = 1000;
const FEEDBACK_REPORT_RETENTION_LIMIT = 1000;
const APP_CONTEXT_RETENTION_LIMIT = 500;
const DEPRECATED_AGENT_SEED_ID_SET = new Set(DEPRECATED_AGENT_SEED_IDS);
const DEPRECATED_AGENT_SEED_REASON = 'stripe_prohibited_or_restricted_sample_agent';
const UNSAFE_SAMPLE_AGENT_SEED_REASON = 'sample_agent_seed_failed_policy_review';
const D1_STATE_CACHE = new WeakMap();

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

const inMemoryState = {
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

function isDefaultAgentSeedAllowed(seed = {}) {
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

function sampleAgentSeedWithManifestEndpoint(seed = {}, options = {}) {
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

function isRuntimeHiddenAgent(agent = {}) {
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

function mergeSystemAgent(existing = {}, seed = {}) {
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

function softDeleteDeprecatedAgent(agent = {}, reason = DEPRECATED_AGENT_SEED_REASON) {
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

function softDeleteUnsafeSampleAgentSeed(existing = {}, seed = {}) {
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

function ensureDefaultAgentsState(inputState = {}, options = {}) {
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

function ensureDefaultAppsState(inputState = {}) {
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

function mergeAccountSets(existing = [], incoming = []) {
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

function mergeJobSets(existing = [], incoming = []) {
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

function jobIsApprovalBlockedForStorage(job = {}) {
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

function mergeJobRecord(existing = null, incoming = null) {
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

function mergeChatTranscriptSets(existing = [], incoming = [], limit = CHAT_TRANSCRIPT_RETENTION_LIMIT) {
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

function normalizeAppContextRecord(context = {}) {
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

function deliveryItemTimestamp(item = {}) {
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

function normalizeDeliveryItemRecord(item = {}) {
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

function mergeDeliveryItemSets(existing = [], incoming = [], limit = 5000) {
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

function deliveryItemsForJobs(jobs = []) {
  return (Array.isArray(jobs) ? jobs : [])
    .flatMap((job) => deliveryItemsFromJob(job))
    .map(normalizeDeliveryItemRecord)
    .filter(Boolean);
}

function mergeAppContextSets(existing = [], incoming = [], limit = APP_CONTEXT_RETENTION_LIMIT) {
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

function normalizeExactMatchActionRecord(action = {}) {
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

function mergeExactMatchActions(existing = [], incoming = []) {
  const merged = new Map();
  for (const item of [...DEFAULT_EXACT_MATCH_ACTIONS, ...(Array.isArray(existing) ? existing : []), ...(Array.isArray(incoming) ? incoming : [])]) {
    const normalized = normalizeExactMatchActionRecord(item);
    if (!normalized.phrase || !normalized.action) continue;
    merged.set(normalized.id, structuredClone(normalized));
  }
  return [...merged.values()].sort((a, b) => String(a.phrase || '').localeCompare(String(b.phrase || '')));
}

function normalizeAppSettingRecord(setting = {}) {
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

function mergeAppSettings(existing = [], incoming = []) {
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

export const D1_SCHEMA_SQL = `CREATE TABLE IF NOT EXISTS agents (\n  id TEXT PRIMARY KEY,\n  name TEXT NOT NULL,\n  description TEXT NOT NULL,\n  task_types TEXT NOT NULL,\n  premium_rate REAL NOT NULL,\n  basic_rate REAL NOT NULL DEFAULT 0.1,\n  success_rate REAL NOT NULL,\n  avg_latency_sec INTEGER NOT NULL,\n  online INTEGER NOT NULL DEFAULT 1,\n  owner TEXT,\n  manifest_url TEXT,\n  manifest_source TEXT,\n  token TEXT,\n  earnings REAL NOT NULL DEFAULT 0,\n  metadata_json TEXT,\n  created_at TEXT NOT NULL,\n  updated_at TEXT NOT NULL\n);\n\nCREATE TABLE IF NOT EXISTS jobs (\n  id TEXT PRIMARY KEY,\n  parent_agent_id TEXT NOT NULL,\n  task_type TEXT NOT NULL,\n  prompt TEXT NOT NULL,\n  input_json TEXT,\n  budget_cap REAL,\n  deadline_sec INTEGER,\n  priority TEXT NOT NULL,\n  status TEXT NOT NULL,\n  job_kind TEXT,\n  assigned_agent_id TEXT,\n  score REAL,\n  usage_json TEXT,\n  billing_estimate_json TEXT,\n  actual_billing_json TEXT,\n  output_json TEXT,\n  failure_reason TEXT,\n  failure_category TEXT,\n  callback_token TEXT,\n  dispatch_json TEXT,\n  workflow_parent_id TEXT,\n  workflow_task TEXT,\n  workflow_agent_name TEXT,\n  workflow_json TEXT,\n  executor_state_json TEXT,\n  original_prompt TEXT,\n  prompt_optimization_json TEXT,\n  selection_mode TEXT,\n  estimate_window_json TEXT,\n  billing_reservation_json TEXT,\n  logs_json TEXT,\n  created_at TEXT NOT NULL,\n  claimed_at TEXT,\n  dispatched_at TEXT,\n  started_at TEXT,\n  last_callback_at TEXT,\n  completed_at TEXT,\n  failed_at TEXT,\n  timed_out_at TEXT\n);\n\nCREATE TABLE IF NOT EXISTS events (\n  id TEXT PRIMARY KEY,\n  type TEXT NOT NULL,\n  message TEXT NOT NULL,\n  meta_json TEXT,\n  created_at TEXT NOT NULL\n);\n\nCREATE TABLE IF NOT EXISTS accounts (\n  id TEXT PRIMARY KEY,\n  login TEXT NOT NULL UNIQUE,\n  profile_json TEXT NOT NULL,\n  created_at TEXT NOT NULL,\n  updated_at TEXT NOT NULL\n);\n\nCREATE TABLE IF NOT EXISTS api_keys (\n  id TEXT PRIMARY KEY,\n  account_login TEXT NOT NULL,\n  label TEXT NOT NULL,\n  mode TEXT NOT NULL,\n  prefix TEXT,\n  key_hash TEXT NOT NULL UNIQUE,\n  scopes_json TEXT NOT NULL,\n  created_at TEXT NOT NULL,\n  last_used_at TEXT,\n  last_used_path TEXT,\n  last_used_method TEXT,\n  revoked_at TEXT,\n  updated_at TEXT NOT NULL\n);\n\nCREATE TABLE IF NOT EXISTS feedback_reports (\n  id TEXT PRIMARY KEY,\n  type TEXT NOT NULL,\n  status TEXT NOT NULL,\n  title TEXT NOT NULL,\n  message TEXT NOT NULL,\n  email TEXT,\n  reporter_login TEXT,\n  reviewed_by TEXT,\n  reviewed_at TEXT,\n  resolution_note TEXT,\n  context_json TEXT,\n  created_at TEXT NOT NULL,\n  updated_at TEXT NOT NULL\n);\n\nCREATE TABLE IF NOT EXISTS chat_transcripts (\n  id TEXT PRIMARY KEY,\n  kind TEXT NOT NULL,\n  prompt TEXT NOT NULL,\n  answer TEXT NOT NULL,\n  prompt_chars INTEGER NOT NULL DEFAULT 0,\n  answer_chars INTEGER NOT NULL DEFAULT 0,\n  redacted INTEGER NOT NULL DEFAULT 0,\n  answer_kind TEXT,\n  status TEXT,\n  task_type TEXT,\n  source TEXT,\n  page_path TEXT,\n  tab TEXT,\n  session_id TEXT,\n  visitor_id TEXT,\n  logged_in INTEGER NOT NULL DEFAULT 0,\n  auth_provider TEXT,\n  account_hash TEXT,\n  url_count INTEGER NOT NULL DEFAULT 0,\n  file_count INTEGER NOT NULL DEFAULT 0,\n  file_chars INTEGER NOT NULL DEFAULT 0,\n  review_status TEXT NOT NULL DEFAULT 'new',\n  expected_handling TEXT,\n  improvement_note TEXT,\n  reviewed_by TEXT,\n  reviewed_at TEXT,\n  updated_at TEXT,\n  created_at TEXT NOT NULL\n);\n\nCREATE TABLE IF NOT EXISTS email_deliveries (\n  id TEXT PRIMARY KEY,\n  account_login TEXT,\n  recipient_email TEXT NOT NULL,\n  sender_email TEXT,\n  subject TEXT NOT NULL,\n  template TEXT,\n  provider TEXT NOT NULL,\n  status TEXT NOT NULL,\n  provider_message_id TEXT,\n  payload_json TEXT,\n  response_json TEXT,\n  error_text TEXT,\n  created_at TEXT NOT NULL,\n  updated_at TEXT NOT NULL\n);\n\nCREATE TABLE IF NOT EXISTS exact_match_actions (\n  id TEXT PRIMARY KEY,\n  phrase TEXT NOT NULL,\n  normalized_phrase TEXT NOT NULL,\n  action TEXT NOT NULL,\n  enabled INTEGER NOT NULL DEFAULT 1,\n  source TEXT,\n  notes TEXT,\n  created_at TEXT NOT NULL,\n  updated_at TEXT NOT NULL\n);\n\nCREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);\nCREATE INDEX IF NOT EXISTS idx_jobs_assigned_agent_id ON jobs(assigned_agent_id);\nCREATE INDEX IF NOT EXISTS idx_jobs_workflow_parent_id ON jobs(workflow_parent_id);\nCREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at);\nCREATE INDEX IF NOT EXISTS idx_accounts_login ON accounts(login);\nCREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);\nCREATE INDEX IF NOT EXISTS idx_api_keys_account_login ON api_keys(account_login);\nCREATE INDEX IF NOT EXISTS idx_feedback_reports_created_at ON feedback_reports(created_at);\nCREATE INDEX IF NOT EXISTS idx_feedback_reports_status ON feedback_reports(status);\nCREATE INDEX IF NOT EXISTS idx_chat_transcripts_created_at ON chat_transcripts(created_at);\nCREATE INDEX IF NOT EXISTS idx_chat_transcripts_review_status ON chat_transcripts(review_status);\nCREATE INDEX IF NOT EXISTS idx_email_deliveries_account_login_created_at ON email_deliveries(account_login,created_at);\nCREATE INDEX IF NOT EXISTS idx_email_deliveries_status_created_at ON email_deliveries(status,created_at);\nCREATE INDEX IF NOT EXISTS idx_exact_match_actions_normalized_phrase ON exact_match_actions(normalized_phrase);`;

const RECURRING_D1_SCHEMA_SQL = `CREATE TABLE IF NOT EXISTS recurring_orders (
  id TEXT PRIMARY KEY,
  owner_login TEXT NOT NULL,
  status TEXT NOT NULL,
  schedule_json TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  runs_attempted INTEGER NOT NULL DEFAULT 0,
  max_runs INTEGER NOT NULL DEFAULT 0,
  next_run_at TEXT,
  last_run_at TEXT,
  last_job_id TEXT,
  last_error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_recurring_orders_owner_login ON recurring_orders(owner_login);
CREATE INDEX IF NOT EXISTS idx_recurring_orders_status_next_run ON recurring_orders(status,next_run_at);`;

const CHAT_SESSIONS_D1_SCHEMA_SQL = `CREATE TABLE IF NOT EXISTS chat_sessions (
  id TEXT PRIMARY KEY,
  account_hash TEXT NOT NULL,
  title TEXT,
  session_json TEXT NOT NULL,
  linked_order_id TEXT,
  active_job_ids_json TEXT,
  related_order_ids_json TEXT,
  deleted_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_account_hash_updated_at ON chat_sessions(account_hash,updated_at);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_linked_order_id ON chat_sessions(linked_order_id);`;

const APP_REGISTRY_D1_SCHEMA_SQL = `CREATE TABLE IF NOT EXISTS apps (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'application',
  base_url TEXT,
  entry_url TEXT NOT NULL,
  healthcheck_url TEXT,
  capabilities_json TEXT,
  required_connectors_json TEXT,
  requires_approval_for_json TEXT,
  input_contract_json TEXT,
  handoff_json TEXT,
  tags_json TEXT,
  owner TEXT,
  visibility TEXT NOT NULL DEFAULT 'public',
  status TEXT NOT NULL DEFAULT 'active',
  verification_status TEXT,
  verification_checked_at TEXT,
  verification_error TEXT,
  verification_details_json TEXT,
  manifest_url TEXT,
  manifest_source TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_apps_owner ON apps(owner);
CREATE INDEX IF NOT EXISTS idx_apps_status ON apps(status);
CREATE INDEX IF NOT EXISTS idx_apps_updated_at ON apps(updated_at);`;

const APP_SETTINGS_D1_SCHEMA_SQL = `CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  source TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_app_settings_updated_at ON app_settings(updated_at);`;

const APP_CONTEXTS_D1_SCHEMA_SQL = `CREATE TABLE IF NOT EXISTS app_contexts (
  id TEXT PRIMARY KEY,
  owner_login TEXT,
  source_app TEXT,
  source_app_label TEXT,
  title TEXT NOT NULL,
  summary TEXT,
  payload_json TEXT NOT NULL,
  access_token TEXT,
  status TEXT NOT NULL DEFAULT 'ready',
  expires_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_app_contexts_owner_login ON app_contexts(owner_login);
CREATE INDEX IF NOT EXISTS idx_app_contexts_source_app ON app_contexts(source_app);
CREATE INDEX IF NOT EXISTS idx_app_contexts_expires_at ON app_contexts(expires_at);
CREATE INDEX IF NOT EXISTS idx_app_contexts_updated_at ON app_contexts(updated_at);`;

const DELIVERY_ITEMS_D1_SCHEMA_SQL = `CREATE TABLE IF NOT EXISTS delivery_items (
  id TEXT PRIMARY KEY,
  owner_login TEXT,
  surface TEXT NOT NULL,
  item_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'needs_review',
  title TEXT NOT NULL,
  summary TEXT,
  body TEXT,
  metadata_json TEXT,
  source_json TEXT,
  job_id TEXT NOT NULL,
  workflow_parent_id TEXT,
  workflow_task TEXT,
  workflow_agent_name TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_delivery_items_owner_surface_updated ON delivery_items(owner_login,surface,updated_at);
CREATE INDEX IF NOT EXISTS idx_delivery_items_surface_updated ON delivery_items(surface,updated_at);
CREATE INDEX IF NOT EXISTS idx_delivery_items_job_id ON delivery_items(job_id);
CREATE INDEX IF NOT EXISTS idx_delivery_items_workflow_parent_id ON delivery_items(workflow_parent_id);`;

const PUBLISHER_ITEMS_D1_SCHEMA_SQL = `CREATE TABLE IF NOT EXISTS publisher_items (
  id TEXT PRIMARY KEY,
  owner_login TEXT,
  app_context_id TEXT,
  source_app TEXT,
  source_item_id TEXT,
  channel TEXT NOT NULL,
  destination TEXT,
  connector TEXT,
  connector_capability TEXT,
  item_type TEXT NOT NULL,
  contract_type TEXT,
  status TEXT NOT NULL DEFAULT 'needs_review',
  title TEXT NOT NULL,
  summary TEXT,
  body TEXT,
  validation_status TEXT NOT NULL DEFAULT 'needs_review',
  validation_json TEXT,
  selected_medium_json TEXT,
  shape_json TEXT,
  payload_json TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS publisher_item_versions (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL,
  owner_login TEXT,
  app_context_id TEXT,
  version INTEGER NOT NULL,
  reason TEXT,
  validation_json TEXT,
  selected_medium_json TEXT,
  shape_json TEXT,
  payload_json TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_publisher_items_owner_updated ON publisher_items(owner_login,updated_at);
CREATE INDEX IF NOT EXISTS idx_publisher_items_channel_updated ON publisher_items(channel,updated_at);
CREATE INDEX IF NOT EXISTS idx_publisher_items_validation_updated ON publisher_items(validation_status,updated_at);
CREATE INDEX IF NOT EXISTS idx_publisher_items_app_context_id ON publisher_items(app_context_id);
CREATE INDEX IF NOT EXISTS idx_publisher_item_versions_item_version ON publisher_item_versions(item_id,version);`;

const CAMPAIGNS_D1_SCHEMA_SQL = `CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY,
  owner_login TEXT,
  title TEXT NOT NULL,
  objective TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  source TEXT,
  cmo_plan_job_id TEXT,
  operations_agent_job_id TEXT,
  target_url TEXT,
  audience TEXT,
  channels_json TEXT,
  kpis_json TEXT,
  plan_json TEXT,
  tasks_json TEXT,
  metrics_json TEXT,
  logs_json TEXT,
  publisher_json TEXT,
  integrations_json TEXT,
  lead_source_json TEXT,
  ads_json TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_campaigns_owner_updated ON campaigns(owner_login,updated_at);
CREATE INDEX IF NOT EXISTS idx_campaigns_status_updated ON campaigns(status,updated_at);
CREATE INDEX IF NOT EXISTS idx_campaigns_cmo_plan_job_id ON campaigns(cmo_plan_job_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_operations_agent_job_id ON campaigns(operations_agent_job_id);`;

export const STORAGE_SCHEMA_SQL = `${D1_SCHEMA_SQL}\n\n${RECURRING_D1_SCHEMA_SQL}\n\n${CHAT_SESSIONS_D1_SCHEMA_SQL}\n\n${APP_REGISTRY_D1_SCHEMA_SQL}\n\n${APP_SETTINGS_D1_SCHEMA_SQL}\n\n${APP_CONTEXTS_D1_SCHEMA_SQL}\n\n${DELIVERY_ITEMS_D1_SCHEMA_SQL}\n\n${PUBLISHER_ITEMS_D1_SCHEMA_SQL}\n\n${CAMPAIGNS_D1_SCHEMA_SQL}`;
const STORAGE_INIT_VERSION_KEY = '__storage_init_version';
const STORAGE_INIT_VERSION = '20260526_growth_experiment_console_seed_v1';

export function createD1LikeStorage(db, options = {}) {
  const allowInMemory = options.allowInMemory === true;
  const stateCacheTtlMs = Math.max(0, Number(options.stateCacheTtlMs ?? 1500) || 0);
  const defaultAgentSeedOptions = {
    sampleAgentEndpointBaseUrl: options.sampleAgentEndpointBaseUrl || options.sample_agent_endpoint_base_url || ''
  };
  const stateCache = db
    ? (() => {
        if (!D1_STATE_CACHE.has(db)) {
          D1_STATE_CACHE.set(db, { state: null, at: 0, promise: null, version: 0, initialized: false, initPromise: null });
        }
        return D1_STATE_CACHE.get(db);
      })()
    : { state: null, at: 0, promise: null, version: 0, initialized: false, initPromise: null };

  function cloneCachedState() {
    return stateCache.state ? structuredClone(stateCache.state) : null;
  }

  function cacheState(state = null, version = stateCache.version) {
    if (version !== stateCache.version) return;
    stateCache.state = state ? structuredClone(state) : null;
    stateCache.at = stateCache.state ? Date.now() : 0;
  }

  function invalidateStateCache() {
    stateCache.state = null;
    stateCache.at = 0;
    stateCache.promise = null;
    stateCache.version += 1;
  }

  function hasFreshStateCache() {
    return Boolean(stateCache.state && stateCacheTtlMs > 0 && (Date.now() - stateCache.at) < stateCacheTtlMs);
  }

  let writeChain = Promise.resolve();

  function enqueueWrite(work) {
    const runner = writeChain.then(work, work);
    writeChain = runner.catch(() => {});
    return runner;
  }

  async function persistState(nextState, options = {}) {
    await init();
    invalidateStateCache();
    const replace = options.replace === true;
    if (replace) {
      // Production D1 storage is append/upsert-only for durable business data.
      // "Replace" now means "upsert this snapshot"; it must never hard-delete
      // existing accounts, chats, agents, jobs, keys, settings, or logs.
    }
    const existingJobRows = await db.prepare('SELECT * FROM jobs ORDER BY created_at DESC').all();
    const existingJobs = (existingJobRows.results || []).map(deserializeJob);
    const mergedJobs = mergeJobSets(existingJobs, nextState.jobs || []);
    const existingDeliveryItemRows = await db.prepare('SELECT * FROM delivery_items ORDER BY updated_at DESC LIMIT 5000').all();
    const mergedDeliveryItems = mergeDeliveryItemSets(
      (existingDeliveryItemRows.results || []).map(deserializeDeliveryItem),
      [...(nextState.deliveryItems || []), ...deliveryItemsForJobs(mergedJobs)],
      5000
    );
    const existingAccountRows = await db.prepare('SELECT * FROM accounts ORDER BY updated_at DESC').all();
    const existingAccounts = (existingAccountRows.results || []).map(deserializeAccount);
    const mergedAccounts = mergeAccountSets(existingAccounts, nextState.accounts || []);
    const existingChatRows = await db.prepare(`SELECT * FROM chat_transcripts ORDER BY created_at DESC LIMIT ${CHAT_TRANSCRIPT_RETENTION_LIMIT}`).all();
    const existingChatTranscripts = (existingChatRows.results || []).map(deserializeChatTranscript);
    const mergedChatTranscripts = mergeChatTranscriptSets(existingChatTranscripts, nextState.chatTranscripts || [], CHAT_TRANSCRIPT_RETENTION_LIMIT);
    const existingChatSessionRows = await db.prepare(`SELECT * FROM chat_sessions ORDER BY updated_at DESC LIMIT ${CHAT_SESSION_RETENTION_LIMIT}`).all();
    const mergedChatSessions = [
      ...(Array.isArray(nextState.chatSessions) ? nextState.chatSessions : []),
      ...(existingChatSessionRows.results || []).map(deserializeChatSessionSnapshot)
    ].filter((item) => item?.id);
    const existingAppContextRows = await db.prepare(`SELECT * FROM app_contexts ORDER BY updated_at DESC LIMIT ${APP_CONTEXT_RETENTION_LIMIT}`).all();
    const mergedAppContexts = mergeAppContextSets((existingAppContextRows.results || []).map(deserializeAppContext), nextState.appContexts || [], APP_CONTEXT_RETENTION_LIMIT);
    const existingCampaignRows = await db.prepare('SELECT * FROM campaigns ORDER BY updated_at DESC LIMIT 2000').all();
    const mergedCampaigns = mergeCampaignSets((existingCampaignRows.results || []).map(deserializeCampaign), nextState.campaigns || [], 2000);
    const softDeletedDeprecatedAgents = await softDeleteDeprecatedSeedRows();
    const appsState = ensureDefaultAppsState(nextState);
    for (const a of nextState.agents) await upsertAgent(a);
    for (const a of softDeletedDeprecatedAgents) await upsertAgent(a);
    const appsToPersist = new Map([
      ...(Array.isArray(nextState.apps) ? nextState.apps : []),
      ...(appsState.apps || [])
    ].filter((app) => app?.id).map((app) => [app.id, app]));
    for (const app of appsToPersist.values()) await upsertApp(app);
    for (const j of mergedJobs) await upsertJob(j);
    for (const item of mergedDeliveryItems) await upsertDeliveryItem(item);
    for (const e of nextState.events) await insertEvent(e);
    for (const account of mergedAccounts) {
      await upsertAccount(account);
      await syncAccountApiKeys(account);
    }
    for (const report of (nextState.feedbackReports || [])) await upsertFeedbackReport(report);
    for (const transcript of mergedChatTranscripts) await upsertChatTranscript(transcript);
    for (const session of mergedChatSessions) await upsertChatSessionSnapshot(session);
    for (const context of mergedAppContexts) await upsertAppContext(context);
    for (const campaign of mergedCampaigns) await upsertCampaignRow(campaign);
    for (const order of (nextState.recurringOrders || [])) await upsertRecurringOrder(order);
    for (const delivery of (nextState.emailDeliveries || [])) await upsertEmailDelivery(delivery);
    for (const action of mergeExactMatchActions([], nextState.exactMatchActions || [])) await upsertExactMatchAction(action);
    for (const setting of mergeAppSettings([], nextState.appSettings || [])) await upsertAppSetting(setting);
    const visibleAccounts = mergedAccounts.filter((account) => !accountIsDeleted(account));
    const state = {
      ...nextState,
      apps: appsState.apps || [],
      jobs: mergedJobs,
      deliveryItems: mergedDeliveryItems,
      accounts: visibleAccounts,
      chatTranscripts: mergedChatTranscripts,
      chatSessions: mergedChatSessions,
      appContexts: mergedAppContexts,
      campaigns: mergedCampaigns,
      exactMatchActions: mergeExactMatchActions([], nextState.exactMatchActions || []),
      appSettings: mergeAppSettings([], nextState.appSettings || [])
    };
    cacheState(state);
    return structuredClone(state);
  }

  if (!db) {
    if (!allowInMemory) {
      throw new Error('Cloudflare D1 binding is required. In-memory fallback is disabled for this runtime.');
    }
    return {
      kind: 'd1-ready',
      supportsPersistence: false,
      schemaSql: STORAGE_SCHEMA_SQL,
      async getState() {
        if (!inMemoryState.events.length) inMemoryState.events.push(makeEvent('LIVE', 'broker storage initialized'));
        if (hasFreshStateCache()) return cloneCachedState();
        inMemoryState.agents = ensureDefaultAgentsState(inMemoryState, defaultAgentSeedOptions).agents;
        const state = structuredClone({
          ...inMemoryState,
          accounts: (inMemoryState.accounts || []).filter((account) => !accountIsDeleted(account))
        });
        cacheState(state);
        return structuredClone(state);
      },
      async getFreshState() {
        invalidateStateCache();
        if (!inMemoryState.events.length) inMemoryState.events.push(makeEvent('LIVE', 'broker storage initialized'));
        inMemoryState.agents = ensureDefaultAgentsState(inMemoryState, defaultAgentSeedOptions).agents;
        const state = structuredClone({
          ...inMemoryState,
          accounts: (inMemoryState.accounts || []).filter((account) => !accountIsDeleted(account))
        });
        cacheState(state);
        return structuredClone(state);
      },
      async getJobById(jobId) {
        const id = String(jobId || '').trim();
        const job = (inMemoryState.jobs || []).find((item) => String(item?.id || '') === id) || null;
        return job ? structuredClone(job) : null;
      },
      async getAgentById(agentId) {
        inMemoryState.agents = ensureDefaultAgentsState(inMemoryState, defaultAgentSeedOptions).agents;
        const id = String(agentId || '').trim();
        const agent = (inMemoryState.agents || []).find((item) => String(item?.id || '') === id) || null;
        return agent ? structuredClone(agent) : null;
      },
      async listAgents() {
        inMemoryState.agents = ensureDefaultAgentsState(inMemoryState, defaultAgentSeedOptions).agents;
        return structuredClone((inMemoryState.agents || []).filter((agent) => !isRuntimeHiddenAgent(agent)));
      },
      async listApps() {
        return structuredClone((inMemoryState.apps || []).filter((app) => appIsVisible(app)));
      },
      async listAppSettings() {
        return structuredClone(inMemoryState.appSettings || []);
      },
      async listCampaigns(options = {}) {
        const limit = Math.max(1, Math.min(500, Number(options.limit || 100) || 100));
        const ownerLogins = new Set((Array.isArray(options.ownerLogins) ? options.ownerLogins : [])
          .map((value) => String(value || '').trim().toLowerCase())
          .filter(Boolean));
        const list = (inMemoryState.campaigns || [])
          .filter((campaign) => options.admin || !ownerLogins.size || ownerLogins.has(String(campaign.ownerLogin || campaign.owner_login || '').trim().toLowerCase()))
          .sort((left, right) => String(right?.updatedAt || '').localeCompare(String(left?.updatedAt || '')))
          .slice(0, limit);
        return structuredClone(list);
      },
      async getCampaignById(campaignId) {
        const id = String(campaignId || '').trim();
        const campaign = (inMemoryState.campaigns || []).find((item) => String(item?.id || '') === id) || null;
        return campaign ? structuredClone(campaign) : null;
      },
      async upsertCampaign(campaign) {
        const normalized = mergeCampaignSets([], [campaign], 1)[0] || null;
        if (!normalized) return null;
        invalidateStateCache();
        inMemoryState.campaigns = mergeCampaignSets(inMemoryState.campaigns, [normalized]);
        cacheState(inMemoryState);
        return structuredClone(normalized);
      },
      async listFeedbackReports(options = {}) {
        const limit = Math.max(1, Math.min(500, Number(options.limit || 200) || 200));
        return structuredClone((inMemoryState.feedbackReports || []).slice(0, limit));
      },
      async listChatTranscripts(options = {}) {
        const limit = Math.max(1, Math.min(500, Number(options.limit || 200) || 200));
        const reviewStatus = String(options.reviewStatus || '').trim().toLowerCase();
        const list = reviewStatus
          ? (inMemoryState.chatTranscripts || []).filter((item) => String(item?.reviewStatus || item?.review_status || '').trim().toLowerCase() === reviewStatus)
          : (inMemoryState.chatTranscripts || []);
        return structuredClone(list.slice(0, limit));
      },
      async listChatSessionSnapshots(options = {}) {
        const limit = Math.max(1, Math.min(500, Number(options.limit || 200) || 200));
        const hash = String(options.accountHash || options.account_hash || '').trim();
        const list = hash
          ? (inMemoryState.chatSessions || []).filter((item) => String(item?.accountHash || item?.account_hash || '').trim() === hash)
          : (inMemoryState.chatSessions || []);
        return structuredClone(list
          .sort((left, right) => String(right.updatedAt || '').localeCompare(String(left.updatedAt || '')))
          .slice(0, limit));
      },
      async deleteChatSessionSnapshot(id, options = {}) {
        const safeId = String(id || '').trim();
        const hash = String(options.accountHash || options.account_hash || '').trim();
        if (!safeId) return false;
        const before = (inMemoryState.chatSessions || []).length;
        inMemoryState.chatSessions = (inMemoryState.chatSessions || []).filter((item) => {
          if (String(item?.id || '') !== safeId) return true;
          if (hash && String(item?.accountHash || item?.account_hash || '').trim() !== hash) return true;
          return false;
        });
        if ((inMemoryState.chatSessions || []).length !== before) cacheState(inMemoryState);
        return (inMemoryState.chatSessions || []).length !== before;
      },
      async listRecurringOrders(options = {}) {
        const ownerLogins = [...new Set((Array.isArray(options.ownerLogins) ? options.ownerLogins : [])
          .map((value) => String(value || '').trim().toLowerCase())
          .filter(Boolean))];
        const list = Array.isArray(inMemoryState.recurringOrders) ? inMemoryState.recurringOrders : [];
        const visible = options.admin || !ownerLogins.length
          ? list
          : list.filter((order) => ownerLogins.includes(String(order?.ownerLogin || '').trim().toLowerCase()));
        const limit = Math.max(1, Math.min(500, Number(options.limit || 100) || 100));
        return structuredClone(visible.slice(0, limit));
      },
      async loadWorkflowDispatchState(parentJobId) {
        const safeId = String(parentJobId || '').trim();
        if (!safeId) return { jobs: [], agents: [] };
        const direct = (inMemoryState.jobs || []).find((job) => String(job?.id || '') === safeId) || null;
        const rootId = String(direct?.workflowParentId || direct?.workflow_parent_id || safeId).trim();
        const jobs = (inMemoryState.jobs || []).filter((job) => (
          String(job?.id || '') === rootId
          || String(job?.workflowParentId || job?.workflow_parent_id || '') === rootId
          || String(job?.id || '') === safeId
        ));
        const agentIds = new Set(jobs.map((job) => String(job?.assignedAgentId || job?.assigned_agent_id || '').trim()).filter(Boolean));
        const agents = (inMemoryState.agents || []).filter((agent) => agentIds.has(String(agent?.id || '').trim()));
        return { jobs: structuredClone(jobs), agents: structuredClone(agents) };
      },
      async listQueuedWorkflowDispatchRoots(options = {}) {
        const limit = Math.max(1, Math.min(25, Number(options.limit || 10) || 10));
        const now = Date.now();
        const maxAgeMs = Math.max(1, Number(options.maxAgeMs || 2 * 60 * 60 * 1000) || 2 * 60 * 60 * 1000);
        const activeAfterMs = now - maxAgeMs;
        const seen = new Set();
        const roots = [];
        const jobs = (inMemoryState.jobs || [])
          .filter((job) => String(job?.status || '').trim().toLowerCase() === 'queued')
          .filter((job) => String(job?.assignedAgentId || job?.assigned_agent_id || '').trim())
          .filter((job) => {
            const createdMs = Date.parse(String(job?.createdAt || job?.created_at || '')) || 0;
            return createdMs >= activeAfterMs;
          })
          .sort((left, right) => String(left?.createdAt || left?.created_at || '').localeCompare(String(right?.createdAt || right?.created_at || '')));
        for (const job of jobs) {
          const rootId = String(job?.workflowParentId || job?.workflow_parent_id || job?.id || '').trim();
          if (!rootId || seen.has(rootId)) continue;
          const parent = String(job?.workflowParentId || job?.workflow_parent_id || '').trim()
            ? (inMemoryState.jobs || []).find((item) => String(item?.id || '') === rootId) || null
            : job;
          if (parent && !['queued', 'running'].includes(String(parent?.status || '').trim().toLowerCase())) continue;
          const workflowLike = Boolean(job?.workflowParentId || job?.workflow_parent_id || job?.jobKind === 'workflow' || job?.job_kind === 'workflow' || job?.input?._broker?.workflow);
          if (!workflowLike) continue;
          seen.add(rootId);
          roots.push(rootId);
          if (roots.length >= limit) break;
        }
        return roots;
      },
      async listAcceptedEndpointDispatchJobs(options = {}) {
        const limit = Math.max(1, Math.min(25, Number(options.limit || 10) || 10));
        const now = Date.now();
        const maxAgeMs = Math.max(1, Number(options.maxAgeMs || 2 * 60 * 60 * 1000) || 2 * 60 * 60 * 1000);
        const minAgeMs = Math.max(0, Number(options.minAgeMs || 60_000) || 0);
        const activeAfterMs = now - maxAgeMs;
        const acceptedBeforeMs = now - minAgeMs;
        return structuredClone((inMemoryState.jobs || [])
          .filter((job) => String(job?.status || '').trim().toLowerCase() === 'dispatched')
          .filter((job) => String(job?.dispatch?.completionStatus || '').trim().toLowerCase() === 'accepted')
          .filter((job) => String(job?.assignedAgentId || job?.assigned_agent_id || '').trim())
          .filter((job) => {
            const acceptedMs = Date.parse(String(job?.dispatch?.providerQueueAcceptedAt || job?.dispatchedAt || job?.dispatched_at || job?.startedAt || job?.started_at || job?.createdAt || job?.created_at || '')) || 0;
            const activeMs = Math.max(
              acceptedMs,
              Date.parse(String(job?.dispatch?.firstDispatchRequestedAt || '')) || 0,
              Date.parse(String(job?.dispatch?.dispatchRequestedAt || '')) || 0
            );
            return activeMs >= activeAfterMs && acceptedMs <= acceptedBeforeMs;
          })
          .sort((left, right) => String(left?.dispatch?.providerQueueAcceptedAt || left?.dispatchedAt || left?.createdAt || '').localeCompare(String(right?.dispatch?.providerQueueAcceptedAt || right?.dispatchedAt || right?.createdAt || '')))
          .slice(0, limit));
      },
      async listRetryableWorkflowChildren(options = {}) {
        const limit = Math.max(1, Math.min(50, Number(options.limit || 20) || 20));
        const now = Date.now();
        const maxAgeMs = Math.max(1, Number(options.maxAgeMs || 2 * 60 * 60 * 1000) || 2 * 60 * 60 * 1000);
        const activeAfterMs = now - maxAgeMs;
        return structuredClone((inMemoryState.jobs || [])
          .filter((job) => ['failed', 'timed_out'].includes(String(job?.status || '').trim().toLowerCase()))
          .filter((job) => String(job?.workflowParentId || job?.workflow_parent_id || '').trim())
          .filter((job) => String(job?.assignedAgentId || job?.assigned_agent_id || '').trim())
          .filter((job) => job?.dispatch?.retryable === true)
          .filter((job) => {
            const parentId = String(job?.workflowParentId || job?.workflow_parent_id || '').trim();
            const parent = (inMemoryState.jobs || []).find((item) => String(item?.id || '') === parentId) || null;
            if (!parent || !['queued', 'running'].includes(String(parent?.status || '').trim().toLowerCase())) return false;
            const activeMs = Date.parse(String(job?.failedAt || job?.timedOutAt || job?.failed_at || job?.timed_out_at || job?.createdAt || job?.created_at || '')) || 0;
            if (activeMs < activeAfterMs) return false;
            const nextRetryMs = Date.parse(String(job?.dispatch?.nextRetryAt || ''));
            return !Number.isFinite(nextRetryMs) || nextRetryMs <= now;
          })
          .sort((left, right) => String(left?.dispatch?.nextRetryAt || left?.failedAt || left?.timedOutAt || left?.createdAt || '').localeCompare(String(right?.dispatch?.nextRetryAt || right?.failedAt || right?.timedOutAt || right?.createdAt || '')))
          .slice(0, limit));
      },
      async listRetryableDispatchJobs(options = {}) {
        const limit = Math.max(1, Math.min(50, Number(options.limit || 20) || 20));
        const now = Date.now();
        const maxAgeMs = Math.max(1, Number(options.maxAgeMs || 2 * 60 * 60 * 1000) || 2 * 60 * 60 * 1000);
        const activeAfterMs = now - maxAgeMs;
        return structuredClone((inMemoryState.jobs || [])
          .filter((job) => ['failed', 'timed_out'].includes(String(job?.status || '').trim().toLowerCase()))
          .filter((job) => !String(job?.workflowParentId || job?.workflow_parent_id || '').trim())
          .filter((job) => String(job?.assignedAgentId || job?.assigned_agent_id || '').trim())
          .filter((job) => job?.dispatch?.retryable === true)
          .filter((job) => {
            const activeMs = Date.parse(String(job?.failedAt || job?.timedOutAt || job?.failed_at || job?.timed_out_at || job?.createdAt || job?.created_at || '')) || 0;
            if (activeMs < activeAfterMs) return false;
            const nextRetryMs = Date.parse(String(job?.dispatch?.nextRetryAt || ''));
            return !Number.isFinite(nextRetryMs) || nextRetryMs <= now;
          })
          .sort((left, right) => String(left?.dispatch?.nextRetryAt || left?.failedAt || left?.timedOutAt || left?.createdAt || '').localeCompare(String(right?.dispatch?.nextRetryAt || right?.failedAt || right?.timedOutAt || right?.createdAt || '')))
          .slice(0, limit));
      },
      async listScheduledWorkflowJobs(options = {}) {
        const limit = Math.max(1, Math.min(25, Number(options.limit || 10) || 10));
        const now = Date.now();
        const maxAgeMs = Math.max(1, Number(options.maxAgeMs || 2 * 60 * 60 * 1000) || 2 * 60 * 60 * 1000);
        const minAgeMs = Math.max(0, Number(options.minAgeMs || 0) || 0);
        return structuredClone((inMemoryState.jobs || [])
          .filter((job) => ['running', 'dispatched'].includes(String(job?.status || '').trim().toLowerCase()))
          .filter((job) => job?.workflowParentId || job?.input?._broker?.workflow)
          .filter((job) => String(job?.dispatch?.completionStatus || '').trim().toLowerCase() === 'dispatch_scheduled')
          .filter((job) => {
            const activeAt = Math.max(
              Date.parse(String(job?.dispatch?.firstDispatchRequestedAt || '')) || 0,
              Date.parse(String(job?.dispatch?.dispatchRequestedAt || '')) || 0,
              Date.parse(String(job?.startedAt || '')) || 0,
              Date.parse(String(job?.createdAt || '')) || 0
            );
            const requestedAt = Date.parse(String(job?.dispatch?.firstDispatchRequestedAt || job?.dispatch?.dispatchRequestedAt || job?.startedAt || ''));
            return activeAt > 0
              && Number.isFinite(requestedAt)
              && now - activeAt <= maxAgeMs
              && now - requestedAt >= minAgeMs;
          })
          .sort((left, right) => String(left?.dispatch?.firstDispatchRequestedAt || left?.dispatch?.dispatchRequestedAt || left?.startedAt || left?.createdAt || '').localeCompare(String(right?.dispatch?.firstDispatchRequestedAt || right?.dispatch?.dispatchRequestedAt || right?.startedAt || right?.createdAt || '')))
          .slice(0, limit));
      },
      async listStaleDispatchInProgressJobs(options = {}) {
        const limit = Math.max(1, Math.min(25, Number(options.limit || 10) || 10));
        const now = Date.now();
        const maxAgeMs = Math.max(1, Number(options.maxAgeMs || 2 * 60 * 60 * 1000) || 2 * 60 * 60 * 1000);
        const minAgeMs = Math.max(0, Number(options.minAgeMs || 0) || 0);
        return structuredClone((inMemoryState.jobs || [])
          .filter((job) => ['running', 'dispatched'].includes(String(job?.status || '').trim().toLowerCase()))
          .filter((job) => job?.workflowParentId || job?.input?._broker?.workflow)
          .filter((job) => String(job?.dispatch?.completionStatus || '').trim().toLowerCase() === 'dispatch_in_progress')
          .filter((job) => {
            const activeAt = Math.max(
              Date.parse(String(job?.dispatch?.dispatchInProgressAt || '')) || 0,
              Date.parse(String(job?.dispatch?.lastAttemptAt || '')) || 0,
              Date.parse(String(job?.dispatch?.dispatchRequestedAt || '')) || 0,
              Date.parse(String(job?.startedAt || '')) || 0,
              Date.parse(String(job?.createdAt || '')) || 0
            );
            const requestedAt = Date.parse(String(job?.dispatch?.dispatchInProgressAt || job?.dispatch?.lastAttemptAt || job?.dispatch?.dispatchRequestedAt || job?.startedAt || ''));
            return activeAt > 0
              && Number.isFinite(requestedAt)
              && now - activeAt <= maxAgeMs
              && now - requestedAt >= minAgeMs;
          })
          .sort((left, right) => String(left?.dispatch?.dispatchInProgressAt || left?.dispatch?.lastAttemptAt || left?.dispatch?.dispatchRequestedAt || left?.startedAt || left?.createdAt || '').localeCompare(String(right?.dispatch?.dispatchInProgressAt || right?.dispatch?.lastAttemptAt || right?.dispatch?.dispatchRequestedAt || right?.startedAt || right?.createdAt || '')))
          .slice(0, limit));
      },
      async listStaleCompletionSweepJobs(options = {}) {
        const limit = Math.max(1, Math.min(25, Number(options.limit || 10) || 10));
        const now = Date.now();
        const maxAgeMs = Math.max(1, Number(options.maxAgeMs || 2 * 60 * 60 * 1000) || 2 * 60 * 60 * 1000);
        const minAgeMs = Math.max(0, Number(options.minAgeMs || 0) || 0);
        return structuredClone((inMemoryState.jobs || [])
          .filter((job) => ['running', 'dispatched'].includes(String(job?.status || '').trim().toLowerCase()))
          .filter((job) => job?.workflowParentId || job?.input?._broker?.workflow)
          .filter((job) => String(job?.dispatch?.completionStatus || '').trim().toLowerCase() === 'completion_sweep_running')
          .filter((job) => {
            const activeAt = Math.max(
              Date.parse(String(job?.dispatch?.completionSweepRequestedAt || '')) || 0,
              Date.parse(String(job?.dispatch?.completionQueueRequestedAt || '')) || 0,
              Date.parse(String(job?.dispatch?.firstDispatchRequestedAt || '')) || 0,
              Date.parse(String(job?.dispatch?.dispatchRequestedAt || '')) || 0,
              Date.parse(String(job?.startedAt || '')) || 0,
              Date.parse(String(job?.createdAt || '')) || 0
            );
            const requestedAt = Date.parse(String(job?.dispatch?.completionSweepRequestedAt || job?.dispatch?.firstDispatchRequestedAt || job?.dispatch?.dispatchRequestedAt || job?.startedAt || ''));
            return activeAt > 0
              && Number.isFinite(requestedAt)
              && now - activeAt <= maxAgeMs
              && now - requestedAt >= minAgeMs;
          })
          .sort((left, right) => String(left?.dispatch?.completionSweepRequestedAt || left?.dispatch?.firstDispatchRequestedAt || left?.dispatch?.dispatchRequestedAt || left?.startedAt || left?.createdAt || '').localeCompare(String(right?.dispatch?.completionSweepRequestedAt || right?.dispatch?.firstDispatchRequestedAt || right?.dispatch?.dispatchRequestedAt || right?.startedAt || right?.createdAt || '')))
          .slice(0, limit));
      },
      async listStaleCompletionQueuedJobs(options = {}) {
        const limit = Math.max(1, Math.min(25, Number(options.limit || 10) || 10));
        const now = Date.now();
        const maxAgeMs = Math.max(1, Number(options.maxAgeMs || 2 * 60 * 60 * 1000) || 2 * 60 * 60 * 1000);
        const minAgeMs = Math.max(0, Number(options.minAgeMs || 0) || 0);
        return structuredClone((inMemoryState.jobs || [])
          .filter((job) => ['running', 'dispatched'].includes(String(job?.status || '').trim().toLowerCase()))
          .filter((job) => job?.workflowParentId || job?.input?._broker?.workflow)
          .filter((job) => String(job?.dispatch?.completionStatus || '').trim().toLowerCase() === 'completion_queued')
          .filter((job) => {
            const activeAt = Math.max(
              Date.parse(String(job?.dispatch?.completionQueueRequestedAt || '')) || 0,
              Date.parse(String(job?.dispatch?.firstDispatchRequestedAt || '')) || 0,
              Date.parse(String(job?.dispatch?.dispatchRequestedAt || '')) || 0,
              Date.parse(String(job?.startedAt || '')) || 0,
              Date.parse(String(job?.createdAt || '')) || 0
            );
            const requestedAt = Date.parse(String(job?.dispatch?.completionQueueRequestedAt || job?.dispatch?.firstDispatchRequestedAt || job?.dispatch?.dispatchRequestedAt || job?.startedAt || ''));
            return activeAt > 0
              && Number.isFinite(requestedAt)
              && now - activeAt <= maxAgeMs
              && now - requestedAt >= minAgeMs;
          })
          .sort((left, right) => String(left?.dispatch?.completionQueueRequestedAt || left?.dispatch?.firstDispatchRequestedAt || left?.dispatch?.dispatchRequestedAt || left?.startedAt || left?.createdAt || '').localeCompare(String(right?.dispatch?.completionQueueRequestedAt || right?.dispatch?.firstDispatchRequestedAt || right?.dispatch?.dispatchRequestedAt || right?.startedAt || right?.createdAt || '')))
          .slice(0, limit));
      },
      async listJobs(options = {}) {
        const limit = Math.max(1, Math.min(500, Number(options.limit || 50) || 50));
        const offset = Math.max(0, Number(options.offset || 0) || 0);
        const identityLogins = new Set((Array.isArray(options.identityLogins) ? options.identityLogins : [])
          .map((value) => String(value || '').trim().toLowerCase())
          .filter(Boolean));
        const accountIds = new Set((Array.isArray(options.accountIds) ? options.accountIds : [])
          .map((value) => String(value || '').trim().toLowerCase())
          .filter(Boolean));
        const jobs = (Array.isArray(inMemoryState.jobs) ? inMemoryState.jobs : [])
          .filter((job) => {
            if (options.admin) return true;
            const requester = job?.input?._broker?.requester || {};
            const login = String(requester.login || requester.email || '').trim().toLowerCase();
            const accountId = String(requester.accountId || '').trim().toLowerCase();
            return (login && identityLogins.has(login)) || (accountId && accountIds.has(accountId));
          })
          .filter((job) => {
            if (!options.rootOnly) return true;
            return !String(job?.workflowParentId || '').trim()
              && String(job?.jobKind || 'job').trim().toLowerCase() !== 'workflow_child';
          })
          .sort((left, right) => {
            const diff = String(right?.createdAt || '').localeCompare(String(left?.createdAt || ''));
            return diff || String(right?.id || '').localeCompare(String(left?.id || ''));
          })
          .slice(offset, offset + limit);
        return structuredClone(jobs);
      },
      async getAccountByLogin(login) {
        const safeLogin = String(login || '').trim().toLowerCase();
        const account = (inMemoryState.accounts || []).find((item) => String(item?.login || '').trim().toLowerCase() === safeLogin) || null;
        if (!account || accountIsDeleted(account)) return null;
        return structuredClone(account);
      },
      async authenticateOrderApiKey(rawKey) {
        const matched = authenticateOrderApiKeyInState({ accounts: inMemoryState.accounts || [] }, rawKey);
        return matched ? structuredClone(matched) : null;
      },
      async replaceState(nextState) {
        invalidateStateCache();
        inMemoryState.agents = ensureDefaultAgentsState({ ...nextState, agents: nextState.agents }, defaultAgentSeedOptions).agents;
        inMemoryState.apps = ensureDefaultAppsState(nextState).apps;
        inMemoryState.jobs = mergeJobSets(inMemoryState.jobs, nextState.jobs || []);
        inMemoryState.events = nextState.events;
        inMemoryState.accounts = mergeAccountSets(inMemoryState.accounts, nextState.accounts || []);
        inMemoryState.feedbackReports = nextState.feedbackReports || [];
        inMemoryState.chatTranscripts = nextState.chatTranscripts || [];
        inMemoryState.chatSessions = nextState.chatSessions || inMemoryState.chatSessions || [];
        inMemoryState.appContexts = mergeAppContextSets(inMemoryState.appContexts, nextState.appContexts || []);
        inMemoryState.deliveryItems = mergeDeliveryItemSets(inMemoryState.deliveryItems, [...(nextState.deliveryItems || []), ...deliveryItemsForJobs(nextState.jobs || [])]);
        inMemoryState.campaigns = mergeCampaignSets(inMemoryState.campaigns, nextState.campaigns || []);
        inMemoryState.recurringOrders = nextState.recurringOrders || [];
        inMemoryState.emailDeliveries = nextState.emailDeliveries || [];
        inMemoryState.exactMatchActions = mergeExactMatchActions(inMemoryState.exactMatchActions, nextState.exactMatchActions || []);
        inMemoryState.appSettings = mergeAppSettings(inMemoryState.appSettings, nextState.appSettings || []);
        if (!inMemoryState.events.length) inMemoryState.events.push(makeEvent('LIVE', 'broker storage initialized'));
        const state = structuredClone(inMemoryState);
        cacheState(state);
        return structuredClone(state);
      },
      async mutate(mutator) {
        if (!inMemoryState.events.length) inMemoryState.events.push(makeEvent('LIVE', 'broker storage initialized'));
        const draft = structuredClone(inMemoryState);
        const result = await mutator(draft);
        invalidateStateCache();
        inMemoryState.agents = ensureDefaultAgentsState({ ...draft, agents: draft.agents }, defaultAgentSeedOptions).agents;
        inMemoryState.apps = ensureDefaultAppsState(draft).apps;
        inMemoryState.jobs = mergeJobSets(inMemoryState.jobs, draft.jobs || []);
        inMemoryState.events = draft.events;
        inMemoryState.accounts = mergeAccountSets(inMemoryState.accounts, draft.accounts || []);
        inMemoryState.feedbackReports = draft.feedbackReports || [];
        inMemoryState.chatTranscripts = draft.chatTranscripts || [];
        inMemoryState.chatSessions = draft.chatSessions || inMemoryState.chatSessions || [];
        inMemoryState.appContexts = mergeAppContextSets(inMemoryState.appContexts, draft.appContexts || []);
        inMemoryState.deliveryItems = mergeDeliveryItemSets(inMemoryState.deliveryItems, [...(draft.deliveryItems || []), ...deliveryItemsForJobs(draft.jobs || [])]);
        inMemoryState.campaigns = mergeCampaignSets(inMemoryState.campaigns, draft.campaigns || []);
        inMemoryState.recurringOrders = draft.recurringOrders || [];
        inMemoryState.emailDeliveries = draft.emailDeliveries || [];
        inMemoryState.exactMatchActions = mergeExactMatchActions(inMemoryState.exactMatchActions, draft.exactMatchActions || []);
        inMemoryState.appSettings = mergeAppSettings(inMemoryState.appSettings, draft.appSettings || []);
        if (!inMemoryState.events.length) inMemoryState.events.push(makeEvent('LIVE', 'broker storage initialized'));
        cacheState(inMemoryState);
        return result;
      },
      async upsertJobs(jobs = []) {
        const nextJobs = Array.isArray(jobs) ? structuredClone(jobs) : [];
        invalidateStateCache();
        inMemoryState.jobs = mergeJobSets(inMemoryState.jobs, nextJobs);
        inMemoryState.deliveryItems = mergeDeliveryItemSets(inMemoryState.deliveryItems, deliveryItemsForJobs(nextJobs));
        cacheState(inMemoryState);
        return structuredClone(nextJobs);
      },
      async mutateWorkflow(parentJobId, mutator) {
        const safeParentId = String(parentJobId || '').trim();
        const draft = {
          jobs: structuredClone((inMemoryState.jobs || []).filter((job) => (
            String(job?.id || '') === safeParentId
            || String(job?.workflowParentId || '') === safeParentId
          )))
        };
        const result = await mutator(draft);
        invalidateStateCache();
        inMemoryState.jobs = mergeJobSets(inMemoryState.jobs, draft.jobs || []);
        inMemoryState.deliveryItems = mergeDeliveryItemSets(inMemoryState.deliveryItems, deliveryItemsForJobs(draft.jobs || []));
        cacheState(inMemoryState);
        return result;
      },
      async mutateAccount(login, mutator) {
        const safeLogin = String(login || '').trim().toLowerCase();
        const account = (inMemoryState.accounts || []).find((item) => String(item?.login || '').trim().toLowerCase() === safeLogin) || null;
        const draft = { accounts: account ? [structuredClone(account)] : [] };
        const result = await mutator(draft);
        invalidateStateCache();
        inMemoryState.accounts = mergeAccountSets(inMemoryState.accounts, draft.accounts || []);
        cacheState(inMemoryState);
        return result;
      },
      async deleteAccountByLogin(login, options = {}) {
        const safeLogin = String(login || '').trim().toLowerCase();
        if (!safeLogin) return { deleted: false, reason: 'login_required' };
        const deletedAt = String(options.deletedAt || nowIso());
        const hash = String(options.accountHash || '').trim();
        const account = (inMemoryState.accounts || []).find((item) => String(item?.login || '').trim().toLowerCase() === safeLogin) || null;
        invalidateStateCache();
        if (account) {
          inMemoryState.accounts = mergeAccountSets(inMemoryState.accounts || [], [buildDeletedAccount(account, deletedAt)]);
        }
        for (const session of inMemoryState.chatSessions || []) {
          if (hash && String(session?.accountHash || session?.account_hash || '').trim() === hash) {
            session.deletedAt = deletedAt;
            session.deleted_at = deletedAt;
            session.updatedAt = deletedAt;
            if (session.session && typeof session.session === 'object') session.session.deletedAt = deletedAt;
          }
        }
        for (const transcript of inMemoryState.chatTranscripts || []) {
          if (hash && String(transcript?.accountHash || transcript?.account_hash || '').trim() === hash) {
            transcript.loggedIn = false;
            transcript.authProvider = 'deleted';
            transcript.accountHash = '';
            transcript.updatedAt = deletedAt;
          }
        }
        for (const report of inMemoryState.feedbackReports || []) {
          if (String(report?.reporterLogin || report?.reporter_login || '').trim().toLowerCase() === safeLogin) {
            report.reporterLogin = '';
            report.reporter_login = '';
            report.email = '';
            report.updatedAt = deletedAt;
          }
        }
        for (const delivery of inMemoryState.emailDeliveries || []) {
          if (String(delivery?.accountLogin || delivery?.account_login || '').trim().toLowerCase() === safeLogin) {
            delivery.accountLogin = '';
            delivery.account_login = '';
            delivery.updatedAt = deletedAt;
          }
        }
        cacheState(inMemoryState);
        return { deleted: Boolean(account), account: account ? structuredClone(account) : null };
      },
      async appendEvent(event) {
        inMemoryState.events.push(event);
        cacheState(inMemoryState);
        return event;
      },
      async appendChatTranscript(transcript) {
        inMemoryState.chatTranscripts = mergeChatTranscriptSets(inMemoryState.chatTranscripts, [transcript], CHAT_TRANSCRIPT_RETENTION_LIMIT);
        cacheState(inMemoryState);
        return transcript;
      },
      async upsertChatSessionSnapshot(record) {
        const session = record?.session && typeof record.session === 'object' ? structuredClone(record.session) : {};
        const id = String(record?.id || session.id || session.sessionId || '').trim();
        const accountHash = String(record?.accountHash || record?.account_hash || '').trim();
        if (!id || !accountHash) return null;
        const normalized = {
          id,
          accountHash,
          title: String(record?.title || session.title || '').trim(),
          session: { ...session, id: session.id || id, sessionId: session.sessionId || id },
          linkedOrderId: String(record?.linkedOrderId || session.linkedOrderId || '').trim(),
          activeJobIds: Array.isArray(record?.activeJobIds) ? record.activeJobIds : (Array.isArray(session.activeJobIds) ? session.activeJobIds : []),
          relatedOrderIds: Array.isArray(record?.relatedOrderIds) ? record.relatedOrderIds : (Array.isArray(session.relatedOrderIds) ? session.relatedOrderIds : []),
          createdAt: String(record?.createdAt || session.createdAt || nowIso()),
          updatedAt: String(record?.updatedAt || session.updatedAt || nowIso())
        };
        inMemoryState.chatSessions = [
          normalized,
          ...(inMemoryState.chatSessions || []).filter((item) => String(item?.id || '') !== id)
        ].slice(0, CHAT_SESSION_RETENTION_LIMIT);
        cacheState(inMemoryState);
        return structuredClone(normalized);
      },
      async appendAppContext(context) {
        inMemoryState.appContexts = mergeAppContextSets(inMemoryState.appContexts, [context], APP_CONTEXT_RETENTION_LIMIT);
        cacheState(inMemoryState);
        return structuredClone(context);
      },
      async getAppContextById(contextId) {
        const id = String(contextId || '').trim();
        const context = (inMemoryState.appContexts || []).find((item) => String(item?.id || '') === id) || null;
        return context ? structuredClone(context) : null;
      },
      async listAppContexts(options = {}) {
        const limit = Math.max(1, Math.min(100, Number(options.limit || 50) || 50));
        const ownerLogins = new Set((Array.isArray(options.ownerLogins) ? options.ownerLogins : [])
          .map((value) => String(value || '').trim().toLowerCase())
          .filter(Boolean));
        return structuredClone((inMemoryState.appContexts || [])
          .filter((context) => !appContextIsExpired(context))
          .filter((context) => options.admin || !ownerLogins.size || ownerLogins.has(String(context?.ownerLogin || '').trim().toLowerCase()))
          .slice(0, limit));
      },
      async appendPublisherRecords(records = {}) {
        const savedItems = [];
        const savedVersions = [];
        for (const candidate of (Array.isArray(records.items) ? records.items : []).filter((item) => item?.id)) {
          const existing = (inMemoryState.publisherItems || []).find((item) => String(item?.id || '') === String(candidate.id || '')) || null;
          const version = Math.max(1, Number(existing?.version || 0) + 1);
          const item = {
            ...structuredClone(candidate),
            version,
            createdAt: existing?.createdAt || candidate.createdAt || nowIso(),
            updatedAt: nowIso()
          };
          const versionRow = {
            id: `${item.id}:v${version}:${String(item.appContextId || item.updatedAt || '').replace(/[^a-z0-9_-]/gi, '').slice(-48) || version}`,
            itemId: item.id,
            ownerLogin: item.ownerLogin || '',
            appContextId: item.appContextId || '',
            version,
            reason: item.selectedMedium?.channel ? 'manual_media_reshape_or_ingest' : 'publisher_context_ingest',
            validation: item.validation || {},
            selectedMedium: item.selectedMedium || {},
            shape: item.shape || {},
            payload: item.payload || {},
            createdAt: item.updatedAt
          };
          inMemoryState.publisherItems = [
            item,
            ...(inMemoryState.publisherItems || []).filter((entry) => String(entry?.id || '') !== item.id)
          ].slice(0, 1000);
          inMemoryState.publisherItemVersions = [versionRow, ...(inMemoryState.publisherItemVersions || [])].slice(0, 5000);
          savedItems.push(item);
          savedVersions.push(versionRow);
        }
        cacheState(inMemoryState);
        return structuredClone({ items: savedItems, versions: savedVersions });
      },
      async listPublisherItems(options = {}) {
        const limit = Math.max(1, Math.min(200, Number(options.limit || 100) || 100));
        const ownerLogins = new Set((Array.isArray(options.ownerLogins) ? options.ownerLogins : [])
          .map((value) => String(value || '').trim().toLowerCase())
          .filter(Boolean));
        const channel = String(options.channel || '').trim().toLowerCase();
        const validationStatus = String(options.validationStatus || options.validation_status || '').trim().toLowerCase();
        return structuredClone((inMemoryState.publisherItems || [])
          .filter((item) => !channel || String(item?.channel || '').toLowerCase() === channel)
          .filter((item) => !validationStatus || String(item?.validationStatus || '').toLowerCase() === validationStatus)
          .filter((item) => options.admin || !ownerLogins.size || ownerLogins.has(String(item?.ownerLogin || '').trim().toLowerCase()))
          .map((item) => ({
            ...item,
            versions: options.includeVersions
              ? (inMemoryState.publisherItemVersions || []).filter((version) => String(version?.itemId || '') === String(item.id || '')).slice(0, 10)
              : []
          }))
          .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))
          .slice(0, limit));
      },
      async listDeliveryItems(options = {}) {
        const limit = Math.max(1, Math.min(200, Number(options.limit || 100) || 100));
        const surface = String(options.surface || '').trim().toLowerCase();
        const jobId = String(options.jobId || options.job_id || '').trim();
        const ownerLogins = new Set((Array.isArray(options.ownerLogins) ? options.ownerLogins : [])
          .map((value) => String(value || '').trim().toLowerCase())
          .filter(Boolean));
        return structuredClone((inMemoryState.deliveryItems || [])
          .filter((item) => !surface || String(item?.surface || '').toLowerCase() === surface)
          .filter((item) => !jobId || String(item?.jobId || item?.job_id || '') === jobId || String(item?.workflowParentId || item?.workflow_parent_id || '') === jobId)
          .filter((item) => options.admin || !ownerLogins.size || ownerLogins.has(String(item?.ownerLogin || '').trim().toLowerCase()))
          .sort((a, b) => deliveryItemTimestamp(b).localeCompare(deliveryItemTimestamp(a)))
          .slice(0, limit));
      },
      async appendEmailDelivery(delivery) {
        inMemoryState.emailDeliveries.unshift(structuredClone(delivery));
        cacheState(inMemoryState);
        return delivery;
      },
      note: 'No DB binding available; using in-memory fallback.'
    };
  }

  let initialized = Boolean(stateCache.initialized && stateCache.initVersion === STORAGE_INIT_VERSION);

  async function init() {
    if (initialized) return;
    if (stateCache.initialized && stateCache.initVersion === STORAGE_INIT_VERSION) {
      initialized = true;
      return;
    }
    if (!stateCache.initPromise) {
      stateCache.initPromise = (async () => {
        await ensureStorageSchema();
        const appliedInitVersion = await readStorageInitVersion();
        if (appliedInitVersion === STORAGE_INIT_VERSION) {
          stateCache.initialized = true;
          stateCache.initVersion = STORAGE_INIT_VERSION;
          return;
        }
        await softDeleteDeprecatedSeedRows();
        const existingSeedRows = await db.prepare(`SELECT * FROM agents WHERE id IN (${DEFAULT_AGENT_SEEDS.map(() => '?').join(',')})`).bind(...DEFAULT_AGENT_SEEDS.map((agent) => agent.id)).all();
        const existingSeedMap = new Map((existingSeedRows.results || []).map((row) => [row.id, deserializeAgent(row)]));
        for (const rawSeed of DEFAULT_AGENT_SEEDS) {
          const seed = sampleAgentSeedWithManifestEndpoint(rawSeed, defaultAgentSeedOptions);
          if (!isDefaultAgentSeedAllowed(rawSeed)) {
            const existing = existingSeedMap.get(rawSeed.id);
            if (existing) await upsertAgent(softDeleteUnsafeSampleAgentSeed(existing, rawSeed));
            continue;
          }
          await upsertAgent(mergeSystemAgent(existingSeedMap.get(seed.id), seed));
        }
        const existingAppRows = await db.prepare(`SELECT * FROM apps WHERE id IN (${DEFAULT_APP_SEEDS.map(() => '?').join(',')})`).bind(...DEFAULT_APP_SEEDS.map((app) => app.id)).all();
        const existingAppMap = new Map((existingAppRows.results || []).map((row) => [row.id, deserializeApp(row)]));
        for (const seed of DEFAULT_APP_SEEDS) await upsertApp(mergeSystemApp(existingAppMap.get(seed.id), seed));
        const seedCheck = await db.prepare('SELECT COUNT(*) as count FROM events').first();
        if (!Number(seedCheck?.count || 0)) {
          await insertEvent(makeEvent('LIVE', 'broker storage initialized'));
        }
        await backfillDeliveryItemsFromJobs();
        await markStorageInitVersion();
        stateCache.initialized = true;
        stateCache.initVersion = STORAGE_INIT_VERSION;
      })().finally(() => {
        stateCache.initPromise = null;
      });
    }
    await stateCache.initPromise;
    initialized = true;
  }

  async function ensureStorageSchema() {
    const statements = STORAGE_SCHEMA_SQL.split(';').map(s => s.trim()).filter(Boolean);
    await runSchemaStatements(statements);
    await ensureAgentColumns();
    await ensureJobWorkflowColumns();
    await ensureChatTranscriptColumns();
    await ensureChatSessionColumns();
    await ensureApiKeyColumns();
    await ensureFeedbackReportColumns();
    await ensureRecurringOrderColumns();
    await ensureEmailDeliveryColumns();
    await ensureExactMatchActionColumns();
    await ensureAppRegistryColumns();
    await ensureAppSettingColumns();
    await ensureAppContextColumns();
    await ensureDeliveryItemColumns();
    await ensurePublisherItemColumns();
    await ensureCampaignColumns();
  }

  async function backfillDeliveryItemsFromJobs(limit = 500) {
    const rows = await db.prepare('SELECT * FROM jobs ORDER BY created_at DESC LIMIT ?')
      .bind(Math.max(1, Math.min(2000, Number(limit || 500) || 500)))
      .all();
    const items = deliveryItemsForJobs((rows.results || []).map(deserializeJob));
    for (const item of items) await upsertDeliveryItem(item);
  }

  async function readStorageInitVersion() {
    try {
      const row = await db.prepare('SELECT value FROM app_settings WHERE key=? LIMIT 1')
        .bind(STORAGE_INIT_VERSION_KEY)
        .first();
      return String(row?.value || '').trim();
    } catch {
      return '';
    }
  }

  async function runSchemaStatements(statements = []) {
    if (!Array.isArray(statements) || !statements.length) return;
    if (typeof db.batch === 'function') {
      await db.batch(statements.map((sql) => db.prepare(sql)));
      return;
    }
    for (const sql of statements) await db.prepare(sql).run();
  }

  async function markStorageInitVersion() {
    await upsertAppSetting({
      key: STORAGE_INIT_VERSION_KEY,
      value: STORAGE_INIT_VERSION,
      source: 'storage-init',
      createdAt: nowIso(),
      updatedAt: nowIso()
    });
  }

  async function ensureColumns(tableName, additions = []) {
    const safeTable = String(tableName || '').trim();
    if (!safeTable) return;
    const columns = await db.prepare(`PRAGMA table_info(${safeTable})`).all();
    const existing = new Set((columns.results || []).map((row) => String(row.name || '').trim()).filter(Boolean));
    for (const [name, ddl] of additions) {
      if (!existing.has(name)) await db.prepare(`ALTER TABLE ${safeTable} ADD COLUMN ${ddl}`).run();
    }
  }

  async function ensureAgentColumns() {
    await ensureColumns('agents', [
      ['description', "description TEXT NOT NULL DEFAULT ''"],
      ['task_types', "task_types TEXT NOT NULL DEFAULT '[]'"],
      ['premium_rate', 'premium_rate REAL NOT NULL DEFAULT 0.1'],
      ['basic_rate', 'basic_rate REAL NOT NULL DEFAULT 0.1'],
      ['success_rate', 'success_rate REAL NOT NULL DEFAULT 0.9'],
      ['avg_latency_sec', 'avg_latency_sec INTEGER NOT NULL DEFAULT 20'],
      ['online', 'online INTEGER NOT NULL DEFAULT 1'],
      ['owner', 'owner TEXT'],
      ['manifest_url', 'manifest_url TEXT'],
      ['manifest_source', 'manifest_source TEXT'],
      ['token', 'token TEXT'],
      ['earnings', 'earnings REAL NOT NULL DEFAULT 0'],
      ['metadata_json', 'metadata_json TEXT'],
      ['created_at', "created_at TEXT NOT NULL DEFAULT ''"],
      ['updated_at', "updated_at TEXT NOT NULL DEFAULT ''"]
    ]);
  }

  async function ensureChatTranscriptColumns() {
    await ensureColumns('chat_transcripts', [
      ['kind', "kind TEXT NOT NULL DEFAULT 'work_chat'"],
      ['prompt', "prompt TEXT NOT NULL DEFAULT ''"],
      ['answer', "answer TEXT NOT NULL DEFAULT ''"],
      ['prompt_chars', 'prompt_chars INTEGER NOT NULL DEFAULT 0'],
      ['answer_chars', 'answer_chars INTEGER NOT NULL DEFAULT 0'],
      ['redacted', 'redacted INTEGER NOT NULL DEFAULT 0'],
      ['answer_kind', 'answer_kind TEXT'],
      ['status', 'status TEXT'],
      ['task_type', 'task_type TEXT'],
      ['source', 'source TEXT'],
      ['page_path', 'page_path TEXT'],
      ['tab', 'tab TEXT'],
      ['session_id', 'session_id TEXT'],
      ['visitor_id', 'visitor_id TEXT'],
      ['logged_in', 'logged_in INTEGER NOT NULL DEFAULT 0'],
      ['auth_provider', 'auth_provider TEXT'],
      ['account_hash', 'account_hash TEXT'],
      ['url_count', 'url_count INTEGER NOT NULL DEFAULT 0'],
      ['file_count', 'file_count INTEGER NOT NULL DEFAULT 0'],
      ['file_chars', 'file_chars INTEGER NOT NULL DEFAULT 0'],
      ['review_status', "review_status TEXT NOT NULL DEFAULT 'new'"],
      ['expected_handling', 'expected_handling TEXT'],
      ['improvement_note', 'improvement_note TEXT'],
      ['reviewed_by', 'reviewed_by TEXT'],
      ['reviewed_at', 'reviewed_at TEXT'],
      ['updated_at', 'updated_at TEXT'],
      ['created_at', "created_at TEXT NOT NULL DEFAULT ''"]
    ]);
    await db.prepare('CREATE INDEX IF NOT EXISTS idx_chat_transcripts_session_id ON chat_transcripts(session_id)').run();
    await db.prepare('CREATE INDEX IF NOT EXISTS idx_chat_transcripts_account_hash_created_at ON chat_transcripts(account_hash,created_at)').run();
  }

  async function ensureChatSessionColumns() {
    await ensureColumns('chat_sessions', [
      ['account_hash', "account_hash TEXT NOT NULL DEFAULT ''"],
      ['title', 'title TEXT'],
      ['session_json', "session_json TEXT NOT NULL DEFAULT '{}'"],
      ['linked_order_id', 'linked_order_id TEXT'],
      ['active_job_ids_json', 'active_job_ids_json TEXT'],
      ['related_order_ids_json', 'related_order_ids_json TEXT'],
      ['deleted_at', 'deleted_at TEXT'],
      ['created_at', "created_at TEXT NOT NULL DEFAULT ''"],
      ['updated_at', "updated_at TEXT NOT NULL DEFAULT ''"]
    ]);
    await db.prepare('CREATE INDEX IF NOT EXISTS idx_chat_sessions_account_hash_updated_at ON chat_sessions(account_hash,updated_at)').run();
    await db.prepare('CREATE INDEX IF NOT EXISTS idx_chat_sessions_linked_order_id ON chat_sessions(linked_order_id)').run();
  }

  async function ensureJobWorkflowColumns() {
    await ensureColumns('jobs', [
      ['parent_agent_id', "parent_agent_id TEXT NOT NULL DEFAULT ''"],
      ['task_type', "task_type TEXT NOT NULL DEFAULT 'research'"],
      ['prompt', "prompt TEXT NOT NULL DEFAULT ''"],
      ['input_json', 'input_json TEXT'],
      ['budget_cap', 'budget_cap REAL'],
      ['deadline_sec', 'deadline_sec INTEGER'],
      ['priority', "priority TEXT NOT NULL DEFAULT 'normal'"],
      ['status', "status TEXT NOT NULL DEFAULT 'queued'"],
      ['job_kind', 'job_kind TEXT'],
      ['assigned_agent_id', 'assigned_agent_id TEXT'],
      ['score', 'score REAL'],
      ['usage_json', 'usage_json TEXT'],
      ['billing_estimate_json', 'billing_estimate_json TEXT'],
      ['actual_billing_json', 'actual_billing_json TEXT'],
      ['output_json', 'output_json TEXT'],
      ['failure_reason', 'failure_reason TEXT'],
      ['failure_category', 'failure_category TEXT'],
      ['callback_token', 'callback_token TEXT'],
      ['dispatch_json', 'dispatch_json TEXT'],
      ['workflow_parent_id', 'workflow_parent_id TEXT'],
      ['workflow_task', 'workflow_task TEXT'],
      ['workflow_agent_name', 'workflow_agent_name TEXT'],
      ['workflow_json', 'workflow_json TEXT'],
      ['executor_state_json', 'executor_state_json TEXT'],
      ['original_prompt', 'original_prompt TEXT'],
      ['prompt_optimization_json', 'prompt_optimization_json TEXT'],
      ['selection_mode', 'selection_mode TEXT'],
      ['estimate_window_json', 'estimate_window_json TEXT'],
      ['billing_reservation_json', 'billing_reservation_json TEXT'],
      ['logs_json', 'logs_json TEXT'],
      ['created_at', "created_at TEXT NOT NULL DEFAULT ''"],
      ['claimed_at', 'claimed_at TEXT'],
      ['dispatched_at', 'dispatched_at TEXT'],
      ['started_at', 'started_at TEXT'],
      ['last_callback_at', 'last_callback_at TEXT'],
      ['completed_at', 'completed_at TEXT'],
      ['failed_at', 'failed_at TEXT'],
      ['timed_out_at', 'timed_out_at TEXT']
    ]);
    await db.prepare('CREATE INDEX IF NOT EXISTS idx_jobs_workflow_parent_id ON jobs(workflow_parent_id)').run();
    await db.prepare('CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at)').run();
    await db.prepare('CREATE INDEX IF NOT EXISTS idx_jobs_workflow_parent_created_at ON jobs(workflow_parent_id,created_at)').run();
  }

  async function ensureApiKeyColumns() {
    await ensureColumns('api_keys', [
      ['account_login', "account_login TEXT NOT NULL DEFAULT ''"],
      ['label', "label TEXT NOT NULL DEFAULT 'default'"],
      ['mode', "mode TEXT NOT NULL DEFAULT 'live'"],
      ['prefix', 'prefix TEXT'],
      ['key_hash', "key_hash TEXT NOT NULL DEFAULT ''"],
      ['scopes_json', "scopes_json TEXT NOT NULL DEFAULT '[]'"],
      ['created_at', "created_at TEXT NOT NULL DEFAULT ''"],
      ['last_used_at', 'last_used_at TEXT'],
      ['last_used_path', 'last_used_path TEXT'],
      ['last_used_method', 'last_used_method TEXT'],
      ['revoked_at', 'revoked_at TEXT'],
      ['updated_at', "updated_at TEXT NOT NULL DEFAULT ''"]
    ]);
  }

  async function ensureFeedbackReportColumns() {
    await ensureColumns('feedback_reports', [
      ['type', "type TEXT NOT NULL DEFAULT 'general'"],
      ['status', "status TEXT NOT NULL DEFAULT 'open'"],
      ['title', "title TEXT NOT NULL DEFAULT ''"],
      ['message', "message TEXT NOT NULL DEFAULT ''"],
      ['email', 'email TEXT'],
      ['reporter_login', 'reporter_login TEXT'],
      ['reviewed_by', 'reviewed_by TEXT'],
      ['reviewed_at', 'reviewed_at TEXT'],
      ['resolution_note', 'resolution_note TEXT'],
      ['context_json', 'context_json TEXT'],
      ['created_at', "created_at TEXT NOT NULL DEFAULT ''"],
      ['updated_at', "updated_at TEXT NOT NULL DEFAULT ''"]
    ]);
  }

  async function ensureRecurringOrderColumns() {
    await ensureColumns('recurring_orders', [
      ['owner_login', "owner_login TEXT NOT NULL DEFAULT ''"],
      ['status', "status TEXT NOT NULL DEFAULT 'active'"],
      ['schedule_json', "schedule_json TEXT NOT NULL DEFAULT '{}'"],
      ['payload_json', "payload_json TEXT NOT NULL DEFAULT '{}'"],
      ['runs_attempted', 'runs_attempted INTEGER NOT NULL DEFAULT 0'],
      ['max_runs', 'max_runs INTEGER NOT NULL DEFAULT 0'],
      ['next_run_at', 'next_run_at TEXT'],
      ['last_run_at', 'last_run_at TEXT'],
      ['last_job_id', 'last_job_id TEXT'],
      ['last_error', 'last_error TEXT'],
      ['created_at', "created_at TEXT NOT NULL DEFAULT ''"],
      ['updated_at', "updated_at TEXT NOT NULL DEFAULT ''"]
    ]);
  }

  async function ensureEmailDeliveryColumns() {
    await ensureColumns('email_deliveries', [
      ['account_login', 'account_login TEXT'],
      ['recipient_email', "recipient_email TEXT NOT NULL DEFAULT ''"],
      ['sender_email', 'sender_email TEXT'],
      ['subject', "subject TEXT NOT NULL DEFAULT ''"],
      ['template', 'template TEXT'],
      ['provider', "provider TEXT NOT NULL DEFAULT 'resend'"],
      ['status', "status TEXT NOT NULL DEFAULT 'queued'"],
      ['provider_message_id', 'provider_message_id TEXT'],
      ['payload_json', 'payload_json TEXT'],
      ['response_json', 'response_json TEXT'],
      ['error_text', 'error_text TEXT'],
      ['created_at', "created_at TEXT NOT NULL DEFAULT ''"],
      ['updated_at', "updated_at TEXT NOT NULL DEFAULT ''"]
    ]);
  }

  async function ensureExactMatchActionColumns() {
    await ensureColumns('exact_match_actions', [
      ['phrase', "phrase TEXT NOT NULL DEFAULT ''"],
      ['normalized_phrase', "normalized_phrase TEXT NOT NULL DEFAULT ''"],
      ['action', "action TEXT NOT NULL DEFAULT ''"],
      ['enabled', 'enabled INTEGER NOT NULL DEFAULT 1'],
      ['source', 'source TEXT'],
      ['notes', 'notes TEXT'],
      ['created_at', "created_at TEXT NOT NULL DEFAULT ''"],
      ['updated_at', "updated_at TEXT NOT NULL DEFAULT ''"]
    ]);
  }

  async function ensureAppSettingColumns() {
    await ensureColumns('app_settings', [
      ['value', "value TEXT NOT NULL DEFAULT ''"],
      ['source', 'source TEXT'],
      ['created_at', "created_at TEXT NOT NULL DEFAULT ''"],
      ['updated_at', "updated_at TEXT NOT NULL DEFAULT ''"]
    ]);
  }

  async function ensureAppContextColumns() {
    await ensureColumns('app_contexts', [
      ['owner_login', 'owner_login TEXT'],
      ['source_app', 'source_app TEXT'],
      ['source_app_label', 'source_app_label TEXT'],
      ['title', "title TEXT NOT NULL DEFAULT ''"],
      ['summary', 'summary TEXT'],
      ['payload_json', "payload_json TEXT NOT NULL DEFAULT '{}'"],
      ['access_token', 'access_token TEXT'],
      ['status', "status TEXT NOT NULL DEFAULT 'ready'"],
      ['expires_at', 'expires_at TEXT'],
      ['created_at', "created_at TEXT NOT NULL DEFAULT ''"],
      ['updated_at', "updated_at TEXT NOT NULL DEFAULT ''"]
    ]);
  }

  async function ensureDeliveryItemColumns() {
    await ensureColumns('delivery_items', [
      ['owner_login', 'owner_login TEXT'],
      ['surface', "surface TEXT NOT NULL DEFAULT 'general'"],
      ['item_type', "item_type TEXT NOT NULL DEFAULT 'delivery_asset'"],
      ['status', "status TEXT NOT NULL DEFAULT 'needs_review'"],
      ['title', "title TEXT NOT NULL DEFAULT 'Delivery item'"],
      ['summary', 'summary TEXT'],
      ['body', 'body TEXT'],
      ['metadata_json', 'metadata_json TEXT'],
      ['source_json', 'source_json TEXT'],
      ['job_id', "job_id TEXT NOT NULL DEFAULT ''"],
      ['workflow_parent_id', 'workflow_parent_id TEXT'],
      ['workflow_task', 'workflow_task TEXT'],
      ['workflow_agent_name', 'workflow_agent_name TEXT'],
      ['created_at', "created_at TEXT NOT NULL DEFAULT ''"],
      ['updated_at', "updated_at TEXT NOT NULL DEFAULT ''"]
    ]);
  }

  async function ensurePublisherItemColumns() {
    await ensureColumns('publisher_items', [
      ['owner_login', 'owner_login TEXT'],
      ['app_context_id', 'app_context_id TEXT'],
      ['source_app', 'source_app TEXT'],
      ['source_item_id', 'source_item_id TEXT'],
      ['channel', "channel TEXT NOT NULL DEFAULT 'generic'"],
      ['destination', 'destination TEXT'],
      ['connector', 'connector TEXT'],
      ['connector_capability', 'connector_capability TEXT'],
      ['item_type', "item_type TEXT NOT NULL DEFAULT 'publish_asset'"],
      ['contract_type', 'contract_type TEXT'],
      ['status', "status TEXT NOT NULL DEFAULT 'needs_review'"],
      ['title', "title TEXT NOT NULL DEFAULT 'Publisher item'"],
      ['summary', 'summary TEXT'],
      ['body', 'body TEXT'],
      ['validation_status', "validation_status TEXT NOT NULL DEFAULT 'needs_review'"],
      ['validation_json', 'validation_json TEXT'],
      ['selected_medium_json', 'selected_medium_json TEXT'],
      ['shape_json', 'shape_json TEXT'],
      ['payload_json', 'payload_json TEXT'],
      ['version', 'version INTEGER NOT NULL DEFAULT 1'],
      ['created_at', "created_at TEXT NOT NULL DEFAULT ''"],
      ['updated_at', "updated_at TEXT NOT NULL DEFAULT ''"]
    ]);
    await ensureColumns('publisher_item_versions', [
      ['item_id', "item_id TEXT NOT NULL DEFAULT ''"],
      ['owner_login', 'owner_login TEXT'],
      ['app_context_id', 'app_context_id TEXT'],
      ['version', 'version INTEGER NOT NULL DEFAULT 1'],
      ['reason', 'reason TEXT'],
      ['validation_json', 'validation_json TEXT'],
      ['selected_medium_json', 'selected_medium_json TEXT'],
      ['shape_json', 'shape_json TEXT'],
      ['payload_json', 'payload_json TEXT'],
      ['created_at', "created_at TEXT NOT NULL DEFAULT ''"]
    ]);
  }

  async function ensureCampaignColumns() {
    await ensureColumns('campaigns', [
      ['owner_login', 'owner_login TEXT'],
      ['title', "title TEXT NOT NULL DEFAULT 'Untitled campaign'"],
      ['objective', 'objective TEXT'],
      ['status', "status TEXT NOT NULL DEFAULT 'draft'"],
      ['source', 'source TEXT'],
      ['cmo_plan_job_id', 'cmo_plan_job_id TEXT'],
      ['operations_agent_job_id', 'operations_agent_job_id TEXT'],
      ['target_url', 'target_url TEXT'],
      ['audience', 'audience TEXT'],
      ['channels_json', 'channels_json TEXT'],
      ['kpis_json', 'kpis_json TEXT'],
      ['plan_json', 'plan_json TEXT'],
      ['tasks_json', 'tasks_json TEXT'],
      ['metrics_json', 'metrics_json TEXT'],
      ['logs_json', 'logs_json TEXT'],
      ['publisher_json', 'publisher_json TEXT'],
      ['integrations_json', 'integrations_json TEXT'],
      ['lead_source_json', 'lead_source_json TEXT'],
      ['ads_json', 'ads_json TEXT'],
      ['metadata_json', 'metadata_json TEXT'],
      ['created_at', "created_at TEXT NOT NULL DEFAULT ''"],
      ['updated_at', "updated_at TEXT NOT NULL DEFAULT ''"]
    ]);
    await db.prepare('CREATE INDEX IF NOT EXISTS idx_campaigns_owner_updated ON campaigns(owner_login,updated_at)').run();
    await db.prepare('CREATE INDEX IF NOT EXISTS idx_campaigns_status_updated ON campaigns(status,updated_at)').run();
    await db.prepare('CREATE INDEX IF NOT EXISTS idx_campaigns_cmo_plan_job_id ON campaigns(cmo_plan_job_id)').run();
    await db.prepare('CREATE INDEX IF NOT EXISTS idx_campaigns_operations_agent_job_id ON campaigns(operations_agent_job_id)').run();
  }

  async function ensureAppRegistryColumns() {
    await ensureColumns('apps', [
      ['name', "name TEXT NOT NULL DEFAULT ''"],
      ['description', "description TEXT NOT NULL DEFAULT ''"],
      ['kind', "kind TEXT NOT NULL DEFAULT 'application'"],
      ['base_url', 'base_url TEXT'],
      ['entry_url', "entry_url TEXT NOT NULL DEFAULT ''"],
      ['healthcheck_url', 'healthcheck_url TEXT'],
      ['capabilities_json', 'capabilities_json TEXT'],
      ['required_connectors_json', 'required_connectors_json TEXT'],
      ['requires_approval_for_json', 'requires_approval_for_json TEXT'],
      ['input_contract_json', 'input_contract_json TEXT'],
      ['handoff_json', 'handoff_json TEXT'],
      ['tags_json', 'tags_json TEXT'],
      ['owner', 'owner TEXT'],
      ['visibility', "visibility TEXT NOT NULL DEFAULT 'public'"],
      ['status', "status TEXT NOT NULL DEFAULT 'active'"],
      ['verification_status', 'verification_status TEXT'],
      ['verification_checked_at', 'verification_checked_at TEXT'],
      ['verification_error', 'verification_error TEXT'],
      ['verification_details_json', 'verification_details_json TEXT'],
      ['manifest_url', 'manifest_url TEXT'],
      ['manifest_source', 'manifest_source TEXT'],
      ['metadata_json', 'metadata_json TEXT'],
      ['created_at', "created_at TEXT NOT NULL DEFAULT ''"],
      ['updated_at', "updated_at TEXT NOT NULL DEFAULT ''"]
    ]);
    await db.prepare('CREATE INDEX IF NOT EXISTS idx_apps_owner ON apps(owner)').run();
    await db.prepare('CREATE INDEX IF NOT EXISTS idx_apps_status ON apps(status)').run();
    await db.prepare('CREATE INDEX IF NOT EXISTS idx_apps_updated_at ON apps(updated_at)').run();
  }

  async function softDeleteDeprecatedSeedRows() {
    if (!DEPRECATED_AGENT_SEED_IDS.length) return [];
    const rows = await db.prepare(`SELECT * FROM agents WHERE id IN (${DEPRECATED_AGENT_SEED_IDS.map(() => '?').join(',')})`).bind(...DEPRECATED_AGENT_SEED_IDS).all();
    const softDeleted = (rows.results || []).map((row) => softDeleteDeprecatedAgent(deserializeAgent(row)));
    for (const agent of softDeleted) await upsertAgent(agent);
    return softDeleted;
  }

  function serializeAgent(agent) {
    const metadata = {
      ...(agent.metadata || {}),
      __verification: {
        status: agent.verificationStatus || null,
        checkedAt: agent.verificationCheckedAt || null,
        error: agent.verificationError || null,
        details: agent.verificationDetails || null
      }
    };
    return {
      id: agent.id,
      name: agent.name,
      description: agent.description,
      task_types: JSON.stringify(agent.taskTypes || []),
      premium_rate: Number(agent.providerMarkupRate ?? agent.tokenMarkupRate ?? agent.creatorFeeRate ?? agent.premiumRate ?? 0.1),
      basic_rate: Number(agent.platformMarginRate ?? agent.marketplaceFeeRate ?? agent.basicRate ?? 0.1),
      success_rate: Number(agent.successRate ?? 0.9),
      avg_latency_sec: Number(agent.avgLatencySec ?? 20),
      online: agent.online ? 1 : 0,
      owner: agent.owner || null,
      manifest_url: agent.manifestUrl || null,
      manifest_source: agent.manifestSource || null,
      token: agent.token || null,
      earnings: Number(agent.earnings ?? 0),
      metadata_json: JSON.stringify(metadata),
      created_at: agent.createdAt || nowIso(),
      updated_at: agent.updatedAt || nowIso()
    };
  }
  function deserializeAgent(row) {
    const metadata = safeJson(row.metadata_json, {});
    const verification = metadata?.__verification || {};
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      taskTypes: safeJson(row.task_types, []),
      providerMarkupRate: Number(row.premium_rate ?? 0.1),
      tokenMarkupRate: Number(row.premium_rate ?? 0.1),
      platformMarginRate: Number(row.basic_rate ?? 0.1),
      creatorFeeRate: Number(row.premium_rate ?? 0.1),
      marketplaceFeeRate: Number(row.basic_rate ?? 0.1),
      premiumRate: Number(row.premium_rate ?? 0.1),
      basicRate: Number(row.basic_rate ?? 0.1),
      successRate: Number(row.success_rate ?? 0.9),
      avgLatencySec: Number(row.avg_latency_sec ?? 20),
      online: Boolean(row.online),
      owner: row.owner,
      manifestUrl: row.manifest_url,
      manifestSource: row.manifest_source,
      token: row.token,
      earnings: Number(row.earnings ?? 0),
      metadata,
      verificationStatus: row.verification_status || verification.status || null,
      verificationCheckedAt: row.verification_checked_at || verification.checkedAt || null,
      verificationError: row.verification_error || verification.error || null,
      verificationDetails: verification.details || null,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
  function serializeApp(app) {
    const metadata = {
      ...(app.metadata || {}),
      __verification: {
        status: app.verificationStatus || null,
        checkedAt: app.verificationCheckedAt || null,
        error: app.verificationError || null,
        details: app.verificationDetails || null
      }
    };
    return {
      id: app.id,
      name: app.name,
      description: app.description,
      kind: app.kind || 'application',
      base_url: app.baseUrl || null,
      entry_url: app.entryUrl || app.baseUrl || '',
      healthcheck_url: app.healthcheckUrl || null,
      capabilities_json: JSON.stringify(app.capabilities || []),
      required_connectors_json: JSON.stringify(app.requiredConnectors || []),
      requires_approval_for_json: JSON.stringify(app.requiresApprovalFor || []),
      input_contract_json: JSON.stringify(app.inputContract || {}),
      handoff_json: JSON.stringify(app.handoff || {}),
      tags_json: JSON.stringify(app.tags || []),
      owner: app.owner || null,
      visibility: app.visibility || 'public',
      status: app.status || 'active',
      verification_status: app.verificationStatus || null,
      verification_checked_at: app.verificationCheckedAt || null,
      verification_error: app.verificationError || null,
      verification_details_json: JSON.stringify(app.verificationDetails || null),
      manifest_url: app.manifestUrl || null,
      manifest_source: app.manifestSource || null,
      metadata_json: JSON.stringify(metadata),
      created_at: app.createdAt || nowIso(),
      updated_at: app.updatedAt || nowIso()
    };
  }
  function deserializeApp(row) {
    const metadata = safeJson(row.metadata_json, {});
    const verification = metadata?.__verification || {};
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      kind: row.kind || 'application',
      baseUrl: row.base_url || '',
      entryUrl: row.entry_url || '',
      healthcheckUrl: row.healthcheck_url || '',
      capabilities: safeJson(row.capabilities_json, []),
      requiredConnectors: safeJson(row.required_connectors_json, []),
      requiresApprovalFor: safeJson(row.requires_approval_for_json, []),
      inputContract: safeJson(row.input_contract_json, {}),
      handoff: safeJson(row.handoff_json, {}),
      tags: safeJson(row.tags_json, []),
      owner: row.owner || '',
      visibility: row.visibility || 'public',
      status: row.status || 'active',
      verificationStatus: row.verification_status || verification.status || null,
      verificationCheckedAt: row.verification_checked_at || verification.checkedAt || null,
      verificationError: row.verification_error || verification.error || null,
      verificationDetails: safeJson(row.verification_details_json, verification.details || null),
      manifestUrl: row.manifest_url || '',
      manifestSource: row.manifest_source || '',
      metadata,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
  function serializeJob(job) {
    const status = jobIsApprovalBlockedForStorage(job) ? 'blocked' : job.status;
    return {
      id: job.id,
      parent_agent_id: job.parentAgentId,
      task_type: job.taskType,
      prompt: job.prompt,
      input_json: JSON.stringify(job.input || {}),
      budget_cap: job.budgetCap,
      deadline_sec: job.deadlineSec,
      priority: job.priority || 'normal',
      status,
      job_kind: job.jobKind || null,
      assigned_agent_id: job.assignedAgentId || null,
      score: job.score,
      usage_json: JSON.stringify(job.usage || null),
      billing_estimate_json: JSON.stringify(job.billingEstimate || null),
      actual_billing_json: JSON.stringify(job.actualBilling || null),
      output_json: JSON.stringify(job.output || null),
      failure_reason: job.failureReason || null,
      failure_category: job.failureCategory || null,
      callback_token: job.callbackToken || null,
      dispatch_json: JSON.stringify(job.dispatch || null),
      workflow_parent_id: job.workflowParentId || null,
      workflow_task: job.workflowTask || null,
      workflow_agent_name: job.workflowAgentName || null,
      workflow_json: JSON.stringify(job.workflow || null),
      executor_state_json: JSON.stringify(job.executorState || null),
      original_prompt: job.originalPrompt || null,
      prompt_optimization_json: JSON.stringify(job.promptOptimization || null),
      selection_mode: job.assignmentMode || null,
      estimate_window_json: JSON.stringify(job.estimateWindow || null),
      billing_reservation_json: JSON.stringify(job.billingReservation || null),
      logs_json: JSON.stringify(job.logs || []),
      created_at: job.createdAt || nowIso(),
      claimed_at: job.claimedAt || null,
      dispatched_at: job.dispatchedAt || null,
      started_at: job.startedAt || null,
      last_callback_at: job.lastCallbackAt || null,
      completed_at: job.completedAt || null,
      failed_at: job.failedAt || null,
      timed_out_at: job.timedOutAt || null
    };
  }
  function deserializeJob(row) {
    return {
      id: row.id,
      parentAgentId: row.parent_agent_id,
      taskType: row.task_type,
      prompt: row.prompt,
      input: safeJson(row.input_json, {}),
      budgetCap: row.budget_cap,
      deadlineSec: row.deadline_sec,
      priority: row.priority,
      status: row.status,
      jobKind: row.job_kind || null,
      assignedAgentId: row.assigned_agent_id,
      score: row.score == null ? null : Number(row.score),
      usage: safeJson(row.usage_json, null),
      billingEstimate: safeJson(row.billing_estimate_json, null),
      actualBilling: safeJson(row.actual_billing_json, null),
      output: safeJson(row.output_json, null),
      failureReason: row.failure_reason,
      failureCategory: row.failure_category,
      callbackToken: row.callback_token,
      dispatch: safeJson(row.dispatch_json, null),
      workflowParentId: row.workflow_parent_id || null,
      workflowTask: row.workflow_task || null,
      workflowAgentName: row.workflow_agent_name || null,
      workflow: safeJson(row.workflow_json, null),
      executorState: safeJson(row.executor_state_json, null),
      originalPrompt: row.original_prompt || null,
      promptOptimization: safeJson(row.prompt_optimization_json, null),
      assignmentMode: row.selection_mode || null,
      estimateWindow: safeJson(row.estimate_window_json, null),
      billingReservation: safeJson(row.billing_reservation_json, null),
      logs: safeJson(row.logs_json, []),
      createdAt: row.created_at,
      claimedAt: row.claimed_at,
      dispatchedAt: row.dispatched_at,
      startedAt: row.started_at,
      lastCallbackAt: row.last_callback_at,
      completedAt: row.completed_at,
      failedAt: row.failed_at,
      timedOutAt: row.timed_out_at
    };
  }
  function deserializeEvent(row) {
    return { id: row.id, type: row.type, message: row.message, meta: safeJson(row.meta_json, {}), ts: row.created_at };
  }
  function serializeAccount(account) {
    return {
      id: account.id,
      login: account.login,
      profile_json: JSON.stringify(account),
      created_at: account.createdAt || nowIso(),
      updated_at: account.updatedAt || nowIso()
    };
  }
  function deserializeAccount(row) {
    return safeJson(row.profile_json, {
      id: row.id,
      login: row.login,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    });
  }
  function accountIsDeleted(account) {
    return Boolean(account?.deletedAt || account?.deleted_at);
  }
  function buildDeletedAccount(account, deletedAt) {
    const login = String(account?.login || '').trim().toLowerCase();
    return {
      ...structuredClone(account || {}),
      id: account?.id || `acct:${login}`,
      login,
      profile: { displayName: 'Deleted account' },
      billing: {},
      payout: {},
      stripe: {},
      apiAccess: { orderKeys: [] },
      githubAppAccess: { repos: [] },
      linkedIdentities: [],
      aliases: [],
      deletedAt,
      deleted_at: deletedAt,
      updatedAt: deletedAt
    };
  }
  function serializeApiKey(account = {}, key = {}) {
    const now = nowIso();
    return {
      id: String(key.id || '').trim(),
      account_login: String(account.login || '').trim().toLowerCase(),
      label: String(key.label || 'default').trim().slice(0, 80) || 'default',
      mode: ['live', 'test'].includes(String(key.mode || '').trim().toLowerCase()) ? String(key.mode).trim().toLowerCase() : 'live',
      prefix: String(key.prefix || '').trim(),
      key_hash: String(key.keyHash || key.key_hash || '').trim(),
      scopes_json: JSON.stringify(Array.isArray(key.scopes) ? key.scopes : []),
      created_at: String(key.createdAt || key.created_at || now).trim(),
      last_used_at: String(key.lastUsedAt || key.last_used_at || '').trim() || null,
      last_used_path: String(key.lastUsedPath || key.last_used_path || '').trim() || null,
      last_used_method: String(key.lastUsedMethod || key.last_used_method || '').trim().toUpperCase() || null,
      revoked_at: String(key.revokedAt || key.revoked_at || '').trim() || null,
      updated_at: String(account.updatedAt || account.updated_at || key.updatedAt || key.updated_at || now).trim()
    };
  }
  function deserializeApiKey(row) {
    return {
      id: row.id,
      label: row.label,
      mode: row.mode || 'live',
      prefix: row.prefix || '',
      scopes: safeJson(row.scopes_json, []),
      createdAt: row.created_at,
      lastUsedAt: row.last_used_at || '',
      lastUsedPath: row.last_used_path || '',
      lastUsedMethod: row.last_used_method || '',
      revokedAt: row.revoked_at || '',
      active: !row.revoked_at
    };
  }
  function serializeFeedbackReport(report) {
    return {
      id: report.id,
      type: report.type,
      status: report.status || 'open',
      title: report.title,
      message: report.message,
      email: report.email || null,
      reporter_login: report.reporterLogin || null,
      reviewed_by: report.reviewedBy || null,
      reviewed_at: report.reviewedAt || null,
      resolution_note: report.resolutionNote || null,
      context_json: JSON.stringify(report.context || {}),
      created_at: report.createdAt || nowIso(),
      updated_at: report.updatedAt || nowIso()
    };
  }
  function deserializeFeedbackReport(row) {
    return {
      id: row.id,
      type: row.type,
      status: row.status || 'open',
      title: row.title,
      message: row.message,
      email: row.email || '',
      reporterLogin: row.reporter_login || '',
      reviewedBy: row.reviewed_by || '',
      reviewedAt: row.reviewed_at || '',
      resolutionNote: row.resolution_note || '',
      context: safeJson(row.context_json, {}),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
  function serializeChatTranscript(transcript) {
    return {
      id: transcript.id,
      kind: transcript.kind || 'work_chat',
      prompt: transcript.prompt || '',
      answer: transcript.answer || '',
      prompt_chars: Number(transcript.promptChars || 0),
      answer_chars: Number(transcript.answerChars || 0),
      redacted: transcript.redacted ? 1 : 0,
      answer_kind: transcript.answerKind || null,
      status: transcript.status || null,
      task_type: transcript.taskType || null,
      source: transcript.source || null,
      page_path: transcript.pagePath || null,
      tab: transcript.tab || null,
      session_id: transcript.sessionId || null,
      visitor_id: transcript.visitorId || null,
      logged_in: transcript.loggedIn ? 1 : 0,
      auth_provider: transcript.authProvider || null,
      account_hash: transcript.accountHash || null,
      url_count: Number(transcript.urlCount || 0),
      file_count: Number(transcript.fileCount || 0),
      file_chars: Number(transcript.fileChars || 0),
      review_status: transcript.reviewStatus || 'new',
      expected_handling: transcript.expectedHandling || null,
      improvement_note: transcript.improvementNote || null,
      reviewed_by: transcript.reviewedBy || null,
      reviewed_at: transcript.reviewedAt || null,
      updated_at: transcript.updatedAt || transcript.createdAt || nowIso(),
      created_at: transcript.createdAt || nowIso()
    };
  }
  function deserializeChatTranscript(row) {
    return {
      id: row.id,
      kind: row.kind || 'work_chat',
      prompt: row.prompt || '',
      answer: row.answer || '',
      promptChars: Number(row.prompt_chars || 0),
      answerChars: Number(row.answer_chars || 0),
      redacted: Boolean(row.redacted),
      answerKind: row.answer_kind || '',
      status: row.status || '',
      taskType: row.task_type || '',
      source: row.source || '',
      pagePath: row.page_path || '',
      tab: row.tab || '',
      sessionId: row.session_id || '',
      visitorId: row.visitor_id || '',
      loggedIn: Boolean(row.logged_in),
      authProvider: row.auth_provider || '',
      accountHash: row.account_hash || '',
      urlCount: Number(row.url_count || 0),
      fileCount: Number(row.file_count || 0),
      fileChars: Number(row.file_chars || 0),
      reviewStatus: row.review_status || 'new',
      expectedHandling: row.expected_handling || '',
      improvementNote: row.improvement_note || '',
      reviewedBy: row.reviewed_by || '',
      reviewedAt: row.reviewed_at || '',
      updatedAt: row.updated_at || row.created_at,
      createdAt: row.created_at
    };
  }
  function serializeChatSessionSnapshot(record = {}) {
    const session = record.session && typeof record.session === 'object' ? record.session : {};
    const id = String(record.id || session.id || session.sessionId || '').trim().slice(0, 180);
    const accountHash = String(record.accountHash || record.account_hash || '').trim().slice(0, 80);
    const activeJobIds = Array.isArray(record.activeJobIds) ? record.activeJobIds : (Array.isArray(session.activeJobIds) ? session.activeJobIds : []);
    const relatedOrderIds = Array.isArray(record.relatedOrderIds) ? record.relatedOrderIds : (Array.isArray(session.relatedOrderIds) ? session.relatedOrderIds : []);
    const now = nowIso();
    return {
      id,
      account_hash: accountHash,
      title: String(record.title || session.title || '').trim().slice(0, 240),
      session_json: JSON.stringify(session || {}),
      linked_order_id: String(record.linkedOrderId || session.linkedOrderId || '').trim().slice(0, 180) || null,
      active_job_ids_json: JSON.stringify(activeJobIds.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 40)),
      related_order_ids_json: JSON.stringify(relatedOrderIds.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 80)),
      deleted_at: String(record.deletedAt || record.deleted_at || session.deletedAt || session.deleted_at || '').trim() || null,
      created_at: String(record.createdAt || session.createdAt || now).trim(),
      updated_at: String(record.updatedAt || session.updatedAt || now).trim()
    };
  }
  function deserializeChatSessionSnapshot(row) {
    const session = safeJson(row.session_json, {}) || {};
    const activeJobIds = safeJson(row.active_job_ids_json, []);
    const relatedOrderIds = safeJson(row.related_order_ids_json, []);
    return {
      id: row.id,
      accountHash: row.account_hash || '',
      title: row.title || session.title || '',
      session: {
        ...session,
        id: session.id || row.id,
        sessionId: session.sessionId || row.id,
        title: session.title || row.title || '',
        linkedOrderId: session.linkedOrderId || row.linked_order_id || '',
        activeJobIds: Array.isArray(session.activeJobIds) ? session.activeJobIds : (Array.isArray(activeJobIds) ? activeJobIds : []),
        relatedOrderIds: Array.isArray(session.relatedOrderIds) ? session.relatedOrderIds : (Array.isArray(relatedOrderIds) ? relatedOrderIds : []),
        createdAt: session.createdAt || row.created_at,
        updatedAt: session.updatedAt || row.updated_at
      },
      linkedOrderId: row.linked_order_id || session.linkedOrderId || '',
      activeJobIds: Array.isArray(activeJobIds) ? activeJobIds : [],
      relatedOrderIds: Array.isArray(relatedOrderIds) ? relatedOrderIds : [],
      deletedAt: row.deleted_at || session.deletedAt || session.deleted_at || '',
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
  function serializeEmailDelivery(delivery) {
    return {
      id: delivery.id,
      account_login: delivery.accountLogin || null,
      recipient_email: delivery.recipientEmail || '',
      sender_email: delivery.senderEmail || null,
      subject: delivery.subject || '',
      template: delivery.template || null,
      provider: delivery.provider || 'resend',
      status: delivery.status || 'queued',
      provider_message_id: delivery.providerMessageId || null,
      payload_json: JSON.stringify(delivery.payload || {}),
      response_json: JSON.stringify(delivery.response || {}),
      error_text: delivery.errorText || null,
      created_at: delivery.createdAt || nowIso(),
      updated_at: delivery.updatedAt || delivery.createdAt || nowIso()
    };
  }
  function deserializeEmailDelivery(row) {
    return {
      id: row.id,
      accountLogin: row.account_login || '',
      recipientEmail: row.recipient_email || '',
      senderEmail: row.sender_email || '',
      subject: row.subject || '',
      template: row.template || '',
      provider: row.provider || 'resend',
      status: row.status || 'queued',
      providerMessageId: row.provider_message_id || '',
      payload: safeJson(row.payload_json, {}),
      response: safeJson(row.response_json, {}),
      errorText: row.error_text || '',
      createdAt: row.created_at,
      updatedAt: row.updated_at || row.created_at
    };
  }
  function serializeExactMatchAction(action) {
    const normalized = normalizeExactMatchActionRecord(action);
    return {
      id: normalized.id,
      phrase: normalized.phrase,
      normalized_phrase: normalized.normalizedPhrase,
      action: normalized.action,
      enabled: normalized.enabled ? 1 : 0,
      source: normalized.source || null,
      notes: normalized.notes || null,
      created_at: normalized.createdAt || nowIso(),
      updated_at: normalized.updatedAt || normalized.createdAt || nowIso()
    };
  }
  function deserializeExactMatchAction(row) {
    return normalizeExactMatchActionRecord({
      id: row.id,
      phrase: row.phrase || '',
      normalizedPhrase: row.normalized_phrase || '',
      action: row.action || '',
      enabled: Boolean(row.enabled),
      source: row.source || '',
      notes: row.notes || '',
      createdAt: row.created_at,
      updatedAt: row.updated_at || row.created_at
    });
  }
  function serializeAppSetting(setting) {
    const normalized = normalizeAppSettingRecord(setting);
    return {
      key: normalized.key,
      value: normalized.value,
      source: normalized.source || null,
      created_at: normalized.createdAt || nowIso(),
      updated_at: normalized.updatedAt || normalized.createdAt || nowIso()
    };
  }
  function deserializeAppSetting(row) {
    return normalizeAppSettingRecord({
      key: row.key,
      value: row.value || '',
      source: row.source || '',
      created_at: row.created_at,
      updated_at: row.updated_at || row.created_at
    });
  }
  function serializeAppContext(context) {
    const normalized = normalizeAppContextRecord(context);
    return {
      id: normalized.id,
      owner_login: normalized.ownerLogin || null,
      source_app: normalized.sourceApp || null,
      source_app_label: normalized.sourceAppLabel || null,
      title: normalized.title || 'App context',
      summary: normalized.summary || null,
      payload_json: JSON.stringify(normalized.payload || {}),
      access_token: normalized.accessToken || null,
      status: normalized.status || 'ready',
      expires_at: normalized.expiresAt || null,
      created_at: normalized.createdAt || nowIso(),
      updated_at: normalized.updatedAt || normalized.createdAt || nowIso()
    };
  }
  function deserializeAppContext(row) {
    return normalizeAppContextRecord({
      id: row.id,
      ownerLogin: row.owner_login || '',
      sourceApp: row.source_app || '',
      sourceAppLabel: row.source_app_label || '',
      title: row.title || 'App context',
      summary: row.summary || '',
      payload: safeJson(row.payload_json, {}),
      accessToken: row.access_token || '',
      status: row.status || 'ready',
      expiresAt: row.expires_at || '',
      createdAt: row.created_at,
      updatedAt: row.updated_at || row.created_at
    });
  }
  function serializeDeliveryItem(item) {
    const normalized = normalizeDeliveryItemRecord(item);
    return {
      id: normalized.id,
      owner_login: normalized.ownerLogin || null,
      surface: normalized.surface || 'general',
      item_type: normalized.itemType || 'delivery_asset',
      status: normalized.status || 'needs_review',
      title: normalized.title || 'Delivery item',
      summary: normalized.summary || null,
      body: normalized.body || null,
      metadata_json: JSON.stringify(normalized.metadata || {}),
      source_json: JSON.stringify(normalized.source || {}),
      job_id: normalized.jobId || '',
      workflow_parent_id: normalized.workflowParentId || null,
      workflow_task: normalized.workflowTask || null,
      workflow_agent_name: normalized.workflowAgentName || null,
      created_at: normalized.createdAt || nowIso(),
      updated_at: normalized.updatedAt || normalized.createdAt || nowIso()
    };
  }
  function deserializeDeliveryItem(row) {
    return normalizeDeliveryItemRecord({
      id: row.id,
      ownerLogin: row.owner_login || '',
      surface: row.surface || '',
      itemType: row.item_type || '',
      status: row.status || '',
      title: row.title || '',
      summary: row.summary || '',
      body: row.body || '',
      metadata: safeJson(row.metadata_json, {}),
      source: safeJson(row.source_json, {}),
      jobId: row.job_id || '',
      workflowParentId: row.workflow_parent_id || '',
      workflowTask: row.workflow_task || '',
      workflowAgentName: row.workflow_agent_name || '',
      createdAt: row.created_at,
      updatedAt: row.updated_at || row.created_at
    });
  }
  function normalizePublisherItemRecord(item = {}) {
    const now = nowIso();
    return {
      id: String(item.id || '').trim(),
      ownerLogin: String(item.ownerLogin || item.owner_login || '').trim().toLowerCase(),
      appContextId: String(item.appContextId || item.app_context_id || '').trim(),
      sourceApp: String(item.sourceApp || item.source_app || 'publisher_approval_studio').trim(),
      sourceItemId: String(item.sourceItemId || item.source_item_id || '').trim(),
      channel: String(item.channel || 'generic').trim(),
      destination: String(item.destination || '').trim(),
      connector: String(item.connector || '').trim(),
      connectorCapability: String(item.connectorCapability || item.connector_capability || '').trim(),
      itemType: String(item.itemType || item.item_type || 'publish_asset').trim(),
      contractType: String(item.contractType || item.contract_type || '').trim(),
      status: String(item.status || 'needs_review').trim(),
      title: String(item.title || 'Publisher item').trim(),
      summary: String(item.summary || '').trim(),
      body: String(item.body || '').trim(),
      validationStatus: String(item.validationStatus || item.validation_status || item.validation?.status || 'needs_review').trim(),
      validation: item.validation && typeof item.validation === 'object' ? item.validation : safeJson(item.validation_json, {}),
      selectedMedium: item.selectedMedium && typeof item.selectedMedium === 'object' ? item.selectedMedium : safeJson(item.selected_medium_json, {}),
      shape: item.shape && typeof item.shape === 'object' ? item.shape : safeJson(item.shape_json, {}),
      payload: item.payload && typeof item.payload === 'object' ? item.payload : safeJson(item.payload_json, {}),
      version: Math.max(1, Number(item.version || 1) || 1),
      createdAt: String(item.createdAt || item.created_at || now),
      updatedAt: String(item.updatedAt || item.updated_at || item.createdAt || item.created_at || now),
      versions: Array.isArray(item.versions) ? item.versions : []
    };
  }
  function serializePublisherItem(item = {}) {
    const normalized = normalizePublisherItemRecord(item);
    return {
      id: normalized.id,
      owner_login: normalized.ownerLogin || null,
      app_context_id: normalized.appContextId || null,
      source_app: normalized.sourceApp || null,
      source_item_id: normalized.sourceItemId || null,
      channel: normalized.channel || 'generic',
      destination: normalized.destination || null,
      connector: normalized.connector || null,
      connector_capability: normalized.connectorCapability || null,
      item_type: normalized.itemType || 'publish_asset',
      contract_type: normalized.contractType || null,
      status: normalized.status || 'needs_review',
      title: normalized.title || 'Publisher item',
      summary: normalized.summary || null,
      body: normalized.body || null,
      validation_status: normalized.validationStatus || 'needs_review',
      validation_json: JSON.stringify(normalized.validation || {}),
      selected_medium_json: JSON.stringify(normalized.selectedMedium || {}),
      shape_json: JSON.stringify(normalized.shape || {}),
      payload_json: JSON.stringify(normalized.payload || {}),
      version: normalized.version,
      created_at: normalized.createdAt || nowIso(),
      updated_at: normalized.updatedAt || normalized.createdAt || nowIso()
    };
  }
  function deserializePublisherItem(row) {
    return normalizePublisherItemRecord({
      id: row.id,
      ownerLogin: row.owner_login || '',
      appContextId: row.app_context_id || '',
      sourceApp: row.source_app || '',
      sourceItemId: row.source_item_id || '',
      channel: row.channel || '',
      destination: row.destination || '',
      connector: row.connector || '',
      connectorCapability: row.connector_capability || '',
      itemType: row.item_type || '',
      contractType: row.contract_type || '',
      status: row.status || '',
      title: row.title || '',
      summary: row.summary || '',
      body: row.body || '',
      validationStatus: row.validation_status || '',
      validation: safeJson(row.validation_json, {}),
      selectedMedium: safeJson(row.selected_medium_json, {}),
      shape: safeJson(row.shape_json, {}),
      payload: safeJson(row.payload_json, {}),
      version: row.version || 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at || row.created_at
    });
  }
  function normalizePublisherItemVersionRecord(version = {}) {
    const now = nowIso();
    return {
      id: String(version.id || '').trim(),
      itemId: String(version.itemId || version.item_id || '').trim(),
      ownerLogin: String(version.ownerLogin || version.owner_login || '').trim().toLowerCase(),
      appContextId: String(version.appContextId || version.app_context_id || '').trim(),
      version: Math.max(1, Number(version.version || 1) || 1),
      reason: String(version.reason || '').trim(),
      validation: version.validation && typeof version.validation === 'object' ? version.validation : safeJson(version.validation_json, {}),
      selectedMedium: version.selectedMedium && typeof version.selectedMedium === 'object' ? version.selectedMedium : safeJson(version.selected_medium_json, {}),
      shape: version.shape && typeof version.shape === 'object' ? version.shape : safeJson(version.shape_json, {}),
      payload: version.payload && typeof version.payload === 'object' ? version.payload : safeJson(version.payload_json, {}),
      createdAt: String(version.createdAt || version.created_at || now)
    };
  }
  function serializePublisherItemVersion(version = {}) {
    const normalized = normalizePublisherItemVersionRecord(version);
    return {
      id: normalized.id,
      item_id: normalized.itemId,
      owner_login: normalized.ownerLogin || null,
      app_context_id: normalized.appContextId || null,
      version: normalized.version,
      reason: normalized.reason || null,
      validation_json: JSON.stringify(normalized.validation || {}),
      selected_medium_json: JSON.stringify(normalized.selectedMedium || {}),
      shape_json: JSON.stringify(normalized.shape || {}),
      payload_json: JSON.stringify(normalized.payload || {}),
      created_at: normalized.createdAt || nowIso()
    };
  }
  function deserializePublisherItemVersion(row) {
    return normalizePublisherItemVersionRecord({
      id: row.id,
      itemId: row.item_id || '',
      ownerLogin: row.owner_login || '',
      appContextId: row.app_context_id || '',
      version: row.version || 1,
      reason: row.reason || '',
      validation: safeJson(row.validation_json, {}),
      selectedMedium: safeJson(row.selected_medium_json, {}),
      shape: safeJson(row.shape_json, {}),
      payload: safeJson(row.payload_json, {}),
      createdAt: row.created_at
    });
  }
  function serializeRecurringOrder(order) {
    const schedule = order.schedule && typeof order.schedule === 'object' ? order.schedule : {};
    return {
      id: order.id,
      owner_login: order.ownerLogin || order.owner_login || '',
      status: order.status || 'active',
      schedule_json: JSON.stringify(schedule),
      payload_json: JSON.stringify(order || {}),
      runs_attempted: Number(order.runsAttempted ?? order.runs_attempted ?? 0),
      max_runs: Number(order.maxRuns ?? order.max_runs ?? 0),
      next_run_at: order.nextRunAt || order.next_run_at || null,
      last_run_at: order.lastRunAt || order.last_run_at || null,
      last_job_id: order.lastJobId || order.last_job_id || null,
      last_error: order.lastError || order.last_error || null,
      created_at: order.createdAt || order.created_at || nowIso(),
      updated_at: order.updatedAt || order.updated_at || nowIso()
    };
  }
  function deserializeRecurringOrder(row) {
    const payload = safeJson(row.payload_json, {});
    return {
      ...payload,
      id: row.id,
      ownerLogin: row.owner_login || payload.ownerLogin || '',
      status: row.status || payload.status || 'active',
      schedule: safeJson(row.schedule_json, payload.schedule || {}),
      runsAttempted: Number(row.runs_attempted ?? payload.runsAttempted ?? 0),
      maxRuns: Number(row.max_runs ?? payload.maxRuns ?? 0),
      nextRunAt: row.next_run_at || payload.nextRunAt || null,
      lastRunAt: row.last_run_at || payload.lastRunAt || null,
      lastJobId: row.last_job_id || payload.lastJobId || null,
      lastError: row.last_error || payload.lastError || null,
      createdAt: row.created_at || payload.createdAt || nowIso(),
      updatedAt: row.updated_at || payload.updatedAt || nowIso()
    };
  }

  async function upsertAgent(agent) {
    const v = serializeAgent(agent);
    await db.prepare(`INSERT OR REPLACE INTO agents (id,name,description,task_types,premium_rate,basic_rate,success_rate,avg_latency_sec,online,owner,manifest_url,manifest_source,token,earnings,metadata_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .bind(v.id, v.name, v.description, v.task_types, v.premium_rate, v.basic_rate, v.success_rate, v.avg_latency_sec, v.online, v.owner, v.manifest_url, v.manifest_source, v.token, v.earnings, v.metadata_json, v.created_at, v.updated_at)
      .run();
  }
  async function upsertApp(app) {
    const v = serializeApp(app);
    await db.prepare(`INSERT OR REPLACE INTO apps (id,name,description,kind,base_url,entry_url,healthcheck_url,capabilities_json,required_connectors_json,requires_approval_for_json,input_contract_json,handoff_json,tags_json,owner,visibility,status,verification_status,verification_checked_at,verification_error,verification_details_json,manifest_url,manifest_source,metadata_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .bind(v.id, v.name, v.description, v.kind, v.base_url, v.entry_url, v.healthcheck_url, v.capabilities_json, v.required_connectors_json, v.requires_approval_for_json, v.input_contract_json, v.handoff_json, v.tags_json, v.owner, v.visibility, v.status, v.verification_status, v.verification_checked_at, v.verification_error, v.verification_details_json, v.manifest_url, v.manifest_source, v.metadata_json, v.created_at, v.updated_at)
      .run();
  }
  const JOB_COLUMNS = ['id', 'parent_agent_id', 'task_type', 'prompt', 'input_json', 'budget_cap', 'deadline_sec', 'priority', 'status', 'job_kind', 'assigned_agent_id', 'score', 'usage_json', 'billing_estimate_json', 'actual_billing_json', 'output_json', 'failure_reason', 'failure_category', 'callback_token', 'dispatch_json', 'workflow_parent_id', 'workflow_task', 'workflow_agent_name', 'workflow_json', 'executor_state_json', 'original_prompt', 'prompt_optimization_json', 'selection_mode', 'estimate_window_json', 'billing_reservation_json', 'logs_json', 'created_at', 'claimed_at', 'dispatched_at', 'started_at', 'last_callback_at', 'completed_at', 'failed_at', 'timed_out_at'];

  function prepareJobUpsert(job) {
    const v = serializeJob(job);
    const placeholders = JOB_COLUMNS.map(() => '?').join(',');
    const updateSet = JOB_COLUMNS
      .filter((column) => column !== 'id')
      .map((column) => `${column}=excluded.${column}`)
      .join(',');
    return db.prepare(`INSERT INTO jobs (${JOB_COLUMNS.join(',')}) VALUES (${placeholders})
      ON CONFLICT(id) DO UPDATE SET ${updateSet}
      WHERE NOT (
        lower(jobs.status) = 'completed'
        AND lower(excluded.status) IN ('queued','claimed','running','dispatched')
        AND excluded.completed_at IS NULL
        AND excluded.failed_at IS NULL
        AND excluded.timed_out_at IS NULL
      )`)
      .bind(...JOB_COLUMNS.map((column) => v[column]));
  }

  function prepareDeliveryItemUpsert(item) {
    const v = serializeDeliveryItem(item);
    return db.prepare(`INSERT OR REPLACE INTO delivery_items (id,owner_login,surface,item_type,status,title,summary,body,metadata_json,source_json,job_id,workflow_parent_id,workflow_task,workflow_agent_name,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .bind(v.id, v.owner_login, v.surface, v.item_type, v.status, v.title, v.summary, v.body, v.metadata_json, v.source_json, v.job_id, v.workflow_parent_id, v.workflow_task, v.workflow_agent_name, v.created_at, v.updated_at);
  }

  function preparePublisherItemUpsert(item) {
    const v = serializePublisherItem(item);
    return db.prepare(`INSERT OR REPLACE INTO publisher_items (id,owner_login,app_context_id,source_app,source_item_id,channel,destination,connector,connector_capability,item_type,contract_type,status,title,summary,body,validation_status,validation_json,selected_medium_json,shape_json,payload_json,version,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .bind(v.id, v.owner_login, v.app_context_id, v.source_app, v.source_item_id, v.channel, v.destination, v.connector, v.connector_capability, v.item_type, v.contract_type, v.status, v.title, v.summary, v.body, v.validation_status, v.validation_json, v.selected_medium_json, v.shape_json, v.payload_json, v.version, v.created_at, v.updated_at);
  }

  function preparePublisherItemVersionInsert(version) {
    const v = serializePublisherItemVersion(version);
    return db.prepare(`INSERT OR REPLACE INTO publisher_item_versions (id,item_id,owner_login,app_context_id,version,reason,validation_json,selected_medium_json,shape_json,payload_json,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
      .bind(v.id, v.item_id, v.owner_login, v.app_context_id, v.version, v.reason, v.validation_json, v.selected_medium_json, v.shape_json, v.payload_json, v.created_at);
  }

  async function runPreparedStatements(statements = []) {
    const prepared = Array.isArray(statements) ? statements.filter(Boolean) : [];
    if (!prepared.length) return;
    if (typeof db.batch === 'function' && prepared.length > 1) {
      await db.batch(prepared);
      return;
    }
    for (const statement of prepared) await statement.run();
  }

  async function upsertJobBatch(jobs = []) {
    const nextJobs = Array.isArray(jobs) ? jobs.filter((job) => job?.id) : [];
    if (!nextJobs.length) return;
    const statements = [];
    for (const job of nextJobs) {
      statements.push(prepareJobUpsert(job));
      for (const item of deliveryItemsForJobs([job])) statements.push(prepareDeliveryItemUpsert(item));
    }
    await runPreparedStatements(statements);
  }

  async function upsertJob(job) {
    await upsertJobBatch([job]);
  }
  async function upsertDeliveryItem(item) {
    await runPreparedStatements([prepareDeliveryItemUpsert(item)]);
  }
  async function loadJobById(jobId) {
    const id = String(jobId || '').trim();
    if (!id) return null;
    const row = await db.prepare('SELECT * FROM jobs WHERE id=? LIMIT 1')
      .bind(id)
      .first();
    return row ? deserializeJob(row) : null;
  }
  async function loadJobsByIds(jobIds = []) {
    const ids = [...new Set((Array.isArray(jobIds) ? jobIds : [])
      .map((id) => String(id || '').trim())
      .filter(Boolean))];
    if (!ids.length) return [];
    const jobs = [];
    for (let index = 0; index < ids.length; index += 80) {
      const chunk = ids.slice(index, index + 80);
      const placeholders = chunk.map(() => '?').join(',');
      const rows = await db.prepare(`SELECT * FROM jobs WHERE id IN (${placeholders})`)
        .bind(...chunk)
        .all();
      jobs.push(...((rows.results || []).map(deserializeJob)));
    }
    return jobs;
  }
  async function loadWorkflowJobs(parentJobId) {
    const id = String(parentJobId || '').trim();
    if (!id) return [];
    const rows = await db.prepare('SELECT * FROM jobs WHERE id=? OR workflow_parent_id=? ORDER BY created_at ASC, id ASC')
      .bind(id, id)
      .all();
    return (rows.results || []).map(deserializeJob);
  }
  async function loadAgentById(agentId) {
    const id = String(agentId || '').trim();
    if (!id) return null;
    const row = await db.prepare('SELECT * FROM agents WHERE id=? LIMIT 1')
      .bind(id)
      .first();
    return row ? deserializeAgent(row) : null;
  }
  async function loadAgentsByIds(agentIds = []) {
    const ids = [...new Set((Array.isArray(agentIds) ? agentIds : [])
      .map((id) => String(id || '').trim())
      .filter(Boolean))].slice(0, 25);
    if (!ids.length) return [];
    const placeholders = ids.map(() => '?').join(',');
    const rows = await db.prepare(`SELECT * FROM agents WHERE id IN (${placeholders})`)
      .bind(...ids)
      .all();
    return (rows.results || []).map(deserializeAgent).filter((agent) => !isRuntimeHiddenAgent(agent));
  }
  async function loadAgentsOnly(options = {}) {
    const limit = Math.max(1, Math.min(1000, Number(options.limit || 500) || 500));
    const rows = await db.prepare('SELECT * FROM agents ORDER BY created_at DESC LIMIT ?')
      .bind(limit)
      .all();
    return (rows.results || []).map(deserializeAgent).filter((agent) => !isRuntimeHiddenAgent(agent));
  }
  async function loadAppsOnly(options = {}) {
    const limit = Math.max(1, Math.min(1000, Number(options.limit || 500) || 500));
    const rows = await db.prepare('SELECT * FROM apps ORDER BY updated_at DESC LIMIT ?')
      .bind(limit)
      .all();
    return (rows.results || []).map(deserializeApp).filter((app) => appIsVisible(app));
  }
  async function loadAppSettingsOnly() {
    const rows = await db.prepare('SELECT * FROM app_settings ORDER BY key ASC').all();
    return mergeAppSettings([], (rows.results || []).map(deserializeAppSetting));
  }
  async function loadFeedbackReportsSlice(options = {}) {
    const limit = Math.max(1, Math.min(500, Number(options.limit || 200) || 200));
    const rows = await db.prepare('SELECT * FROM feedback_reports ORDER BY created_at DESC LIMIT ?')
      .bind(limit)
      .all();
    return (rows.results || []).map(deserializeFeedbackReport);
  }
  async function loadChatTranscriptsSlice(options = {}) {
    const limit = Math.max(1, Math.min(500, Number(options.limit || 200) || 200));
    const reviewStatus = String(options.reviewStatus || '').trim().toLowerCase();
    if (reviewStatus) {
      const rows = await db.prepare('SELECT * FROM chat_transcripts WHERE lower(review_status)=? ORDER BY created_at DESC LIMIT ?')
        .bind(reviewStatus, limit)
        .all();
      return (rows.results || []).map(deserializeChatTranscript);
    }
    const rows = await db.prepare('SELECT * FROM chat_transcripts ORDER BY created_at DESC LIMIT ?')
      .bind(limit)
      .all();
    return (rows.results || []).map(deserializeChatTranscript);
  }
  async function loadChatSessionSnapshotsSlice(options = {}) {
    const limit = Math.max(1, Math.min(500, Number(options.limit || 200) || 200));
    const accountHash = String(options.accountHash || options.account_hash || '').trim();
    if (!accountHash) return [];
    const rows = await db.prepare("SELECT * FROM chat_sessions WHERE account_hash=? AND COALESCE(deleted_at, '')='' ORDER BY updated_at DESC LIMIT ?")
      .bind(accountHash, limit)
      .all();
    return (rows.results || []).map(deserializeChatSessionSnapshot);
  }
  async function loadRecurringOrdersSlice(options = {}) {
    const limit = Math.max(1, Math.min(500, Number(options.limit || 100) || 100));
    const ownerLogins = [...new Set((Array.isArray(options.ownerLogins) ? options.ownerLogins : [])
      .map((value) => String(value || '').trim().toLowerCase())
      .filter(Boolean))]
      .slice(0, 20);
    if (options.admin) {
      const rows = await db.prepare('SELECT * FROM recurring_orders ORDER BY updated_at DESC LIMIT ?')
        .bind(limit)
        .all();
      return (rows.results || []).map(deserializeRecurringOrder);
    }
    if (!ownerLogins.length) return [];
    const rows = await db.prepare(`SELECT * FROM recurring_orders WHERE lower(COALESCE(owner_login,'')) IN (${ownerLogins.map(() => '?').join(',')}) ORDER BY updated_at DESC LIMIT ?`)
      .bind(...ownerLogins, limit)
      .all();
    return (rows.results || []).map(deserializeRecurringOrder);
  }
  async function listJobsSlice(options = {}) {
    const limit = Math.max(1, Math.min(500, Number(options.limit || 50) || 50));
    const offset = Math.max(0, Number(options.offset || 0) || 0);
    const rootOnlyClause = "(COALESCE(workflow_parent_id, '') = '' AND lower(COALESCE(job_kind, 'job')) <> 'workflow_child')";
    if (options.admin) {
      const where = options.rootOnly ? `WHERE ${rootOnlyClause}` : '';
      const rows = await db.prepare(`SELECT * FROM jobs ${where} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`)
        .bind(limit, offset)
        .all();
      return (rows.results || []).map(deserializeJob);
    }
    const identityLogins = [...new Set((Array.isArray(options.identityLogins) ? options.identityLogins : [])
      .map((value) => String(value || '').trim().toLowerCase())
      .filter(Boolean))]
      .slice(0, 20);
    const accountIds = [...new Set((Array.isArray(options.accountIds) ? options.accountIds : [])
      .map((value) => String(value || '').trim().toLowerCase())
      .filter(Boolean))]
      .slice(0, 20);
    const clauses = [];
    const params = [];
    if (identityLogins.length) {
      clauses.push(`lower(COALESCE(json_extract(input_json, '$._broker.requester.login'), json_extract(input_json, '$._broker.requester.email'), '')) IN (${identityLogins.map(() => '?').join(',')})`);
      params.push(...identityLogins);
    }
    if (accountIds.length) {
      clauses.push(`lower(COALESCE(json_extract(input_json, '$._broker.requester.accountId'), '')) IN (${accountIds.map(() => '?').join(',')})`);
      params.push(...accountIds);
    }
    if (!clauses.length) return [];
    const accessWhere = clauses.map((clause) => `(${clause})`).join(' OR ');
    const where = options.rootOnly ? `(${accessWhere}) AND ${rootOnlyClause}` : accessWhere;
    const rows = await db.prepare(`SELECT * FROM jobs WHERE ${where} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`)
      .bind(...params, limit, offset)
      .all();
    return (rows.results || []).map(deserializeJob);
  }
  async function listDeliveryItemSlice(options = {}) {
    const limit = Math.max(1, Math.min(200, Number(options.limit || 100) || 100));
    const surface = String(options.surface || '').trim().toLowerCase();
    const jobId = String(options.jobId || options.job_id || '').trim();
    const ownerLogins = [...new Set((Array.isArray(options.ownerLogins) ? options.ownerLogins : [])
      .map((value) => String(value || '').trim().toLowerCase())
      .filter(Boolean))]
      .slice(0, 20);
    const clauses = [];
    const params = [];
    if (surface) {
      clauses.push('lower(surface)=?');
      params.push(surface);
    }
    if (jobId) {
      clauses.push('(job_id=? OR workflow_parent_id=?)');
      params.push(jobId, jobId);
    }
    if (!options.admin) {
      if (!ownerLogins.length) return [];
      clauses.push(`lower(COALESCE(owner_login,'')) IN (${ownerLogins.map(() => '?').join(',')})`);
      params.push(...ownerLogins);
    }
    const where = clauses.length ? `WHERE ${clauses.map((clause) => `(${clause})`).join(' AND ')}` : '';
    const rows = await db.prepare(`SELECT * FROM delivery_items ${where} ORDER BY updated_at DESC, id DESC LIMIT ?`)
      .bind(...params, limit)
      .all();
    const stored = (rows.results || []).map(deserializeDeliveryItem);
    const jobs = await listJobsSlice({
      admin: options.admin,
      identityLogins: ownerLogins,
      accountIds: ownerLogins.map((login) => `acct:${login}`),
      limit: 100,
      offset: 0
    });
    const derived = deliveryItemsForJobs(jobs)
      .filter((item) => !surface || item.surface === surface)
      .filter((item) => !jobId || item.jobId === jobId || item.workflowParentId === jobId)
      .filter((item) => options.admin || !ownerLogins.length || ownerLogins.includes(String(item.ownerLogin || '').trim().toLowerCase()));
    for (const item of derived) await upsertDeliveryItem(item);
    return mergeDeliveryItemSets(stored, derived, limit).slice(0, limit);
  }
  async function listPublisherItemSlice(options = {}) {
    const limit = Math.max(1, Math.min(200, Number(options.limit || 100) || 100));
    const channel = String(options.channel || '').trim().toLowerCase();
    const validationStatus = String(options.validationStatus || options.validation_status || '').trim().toLowerCase();
    const ownerLogins = [...new Set((Array.isArray(options.ownerLogins) ? options.ownerLogins : [])
      .map((value) => String(value || '').trim().toLowerCase())
      .filter(Boolean))]
      .slice(0, 20);
    const clauses = [];
    const params = [];
    if (channel) {
      clauses.push('lower(channel)=?');
      params.push(channel);
    }
    if (validationStatus) {
      clauses.push('lower(validation_status)=?');
      params.push(validationStatus);
    }
    if (!options.admin) {
      if (!ownerLogins.length) return [];
      clauses.push(`lower(COALESCE(owner_login,'')) IN (${ownerLogins.map(() => '?').join(',')})`);
      params.push(...ownerLogins);
    }
    const where = clauses.length ? `WHERE ${clauses.map((clause) => `(${clause})`).join(' AND ')}` : '';
    const rows = await db.prepare(`SELECT * FROM publisher_items ${where} ORDER BY updated_at DESC, id DESC LIMIT ?`)
      .bind(...params, limit)
      .all();
    const items = (rows.results || []).map(deserializePublisherItem);
    if (!options.includeVersions || !items.length) return items;
    const itemIds = items.map((item) => item.id).filter(Boolean);
    const versionRows = await db.prepare(`SELECT * FROM publisher_item_versions WHERE item_id IN (${itemIds.map(() => '?').join(',')}) ORDER BY item_id ASC, version DESC`)
      .bind(...itemIds)
      .all();
    const versionsByItem = new Map();
    for (const version of (versionRows.results || []).map(deserializePublisherItemVersion)) {
      const list = versionsByItem.get(version.itemId) || [];
      if (list.length < 10) list.push(version);
      versionsByItem.set(version.itemId, list);
    }
    return items.map((item) => ({ ...item, versions: versionsByItem.get(item.id) || [] }));
  }
  async function insertEvent(event) {
    await db.prepare(`INSERT OR REPLACE INTO events (id,type,message,meta_json,created_at) VALUES (?,?,?,?,?)`)
      .bind(event.id, event.type, event.message, JSON.stringify(event.meta || {}), event.ts || nowIso())
      .run();
  }
  async function upsertAccount(account) {
    const v = serializeAccount(account);
    await db.prepare(`INSERT OR REPLACE INTO accounts (id,login,profile_json,created_at,updated_at) VALUES (?,?,?,?,?)`)
      .bind(v.id, v.login, v.profile_json, v.created_at, v.updated_at)
      .run();
  }
  async function upsertApiKeyForAccount(account, key) {
    const v = serializeApiKey(account, key);
    if (!v.id || !v.account_login || !v.key_hash) return null;
    await db.prepare(`INSERT OR REPLACE INTO api_keys (id,account_login,label,mode,prefix,key_hash,scopes_json,created_at,last_used_at,last_used_path,last_used_method,revoked_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .bind(v.id, v.account_login, v.label, v.mode, v.prefix, v.key_hash, v.scopes_json, v.created_at, v.last_used_at, v.last_used_path, v.last_used_method, v.revoked_at, v.updated_at)
      .run();
    return v;
  }
  async function syncAccountApiKeys(account) {
    const keys = Array.isArray(account?.apiAccess?.orderKeys) ? account.apiAccess.orderKeys : [];
    for (const key of keys) await upsertApiKeyForAccount(account, key);
  }
  async function loadAccountByLogin(login) {
    const safeLogin = String(login || '').trim().toLowerCase();
    if (!safeLogin) return null;
    const row = await db.prepare('SELECT * FROM accounts WHERE lower(login)=? LIMIT 1')
      .bind(safeLogin)
      .first();
    if (!row) return null;
    const account = deserializeAccount(row);
    return accountIsDeleted(account) ? null : account;
  }
  async function loadAccountsOnly() {
    const rows = await db.prepare('SELECT * FROM accounts ORDER BY updated_at DESC').all();
    return (rows.results || [])
      .map(deserializeAccount)
      .filter((account) => !accountIsDeleted(account));
  }
  async function loadApiKeyByHash(keyHash) {
    const safeHash = String(keyHash || '').trim();
    if (!safeHash) return null;
    const row = await db.prepare("SELECT * FROM api_keys WHERE key_hash=? AND (revoked_at IS NULL OR revoked_at='') LIMIT 1")
      .bind(safeHash)
      .first();
    if (!row) return null;
    const account = await loadAccountByLogin(row.account_login);
    if (!account) return null;
    return {
      account,
      apiKey: deserializeApiKey(row),
      keyKind: 'cait'
    };
  }
  async function upsertFeedbackReport(report) {
    const v = serializeFeedbackReport(report);
    await db.prepare(`INSERT OR REPLACE INTO feedback_reports (id,type,status,title,message,email,reporter_login,reviewed_by,reviewed_at,resolution_note,context_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .bind(v.id, v.type, v.status, v.title, v.message, v.email, v.reporter_login, v.reviewed_by, v.reviewed_at, v.resolution_note, v.context_json, v.created_at, v.updated_at)
      .run();
  }
  async function upsertChatTranscript(transcript) {
    const v = serializeChatTranscript(transcript);
    await db.prepare(`INSERT OR REPLACE INTO chat_transcripts (id,kind,prompt,answer,prompt_chars,answer_chars,redacted,answer_kind,status,task_type,source,page_path,tab,session_id,visitor_id,logged_in,auth_provider,account_hash,url_count,file_count,file_chars,review_status,expected_handling,improvement_note,reviewed_by,reviewed_at,updated_at,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .bind(v.id, v.kind, v.prompt, v.answer, v.prompt_chars, v.answer_chars, v.redacted, v.answer_kind, v.status, v.task_type, v.source, v.page_path, v.tab, v.session_id, v.visitor_id, v.logged_in, v.auth_provider, v.account_hash, v.url_count, v.file_count, v.file_chars, v.review_status, v.expected_handling, v.improvement_note, v.reviewed_by, v.reviewed_at, v.updated_at, v.created_at)
      .run();
  }
  async function upsertChatSessionSnapshot(record) {
    const v = serializeChatSessionSnapshot(record);
    if (!v.id || !v.account_hash) return null;
    await db.prepare(`INSERT OR REPLACE INTO chat_sessions (id,account_hash,title,session_json,linked_order_id,active_job_ids_json,related_order_ids_json,deleted_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)`)
      .bind(v.id, v.account_hash, v.title, v.session_json, v.linked_order_id, v.active_job_ids_json, v.related_order_ids_json, v.deleted_at, v.created_at, v.updated_at)
      .run();
    return deserializeChatSessionSnapshot(v);
  }
  async function upsertRecurringOrder(order) {
    const v = serializeRecurringOrder(order);
    await db.prepare(`INSERT OR REPLACE INTO recurring_orders (id,owner_login,status,schedule_json,payload_json,runs_attempted,max_runs,next_run_at,last_run_at,last_job_id,last_error,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .bind(v.id, v.owner_login, v.status, v.schedule_json, v.payload_json, v.runs_attempted, v.max_runs, v.next_run_at, v.last_run_at, v.last_job_id, v.last_error, v.created_at, v.updated_at)
      .run();
  }
  async function upsertEmailDelivery(delivery) {
    const v = serializeEmailDelivery(delivery);
    await db.prepare(`INSERT OR REPLACE INTO email_deliveries (id,account_login,recipient_email,sender_email,subject,template,provider,status,provider_message_id,payload_json,response_json,error_text,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .bind(v.id, v.account_login, v.recipient_email, v.sender_email, v.subject, v.template, v.provider, v.status, v.provider_message_id, v.payload_json, v.response_json, v.error_text, v.created_at, v.updated_at)
      .run();
  }
  async function upsertExactMatchAction(action) {
    const v = serializeExactMatchAction(action);
    await db.prepare(`INSERT OR REPLACE INTO exact_match_actions (id,phrase,normalized_phrase,action,enabled,source,notes,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)`)
      .bind(v.id, v.phrase, v.normalized_phrase, v.action, v.enabled, v.source, v.notes, v.created_at, v.updated_at)
      .run();
  }
  async function upsertAppSetting(setting) {
    const v = serializeAppSetting(setting);
    await db.prepare(`INSERT OR REPLACE INTO app_settings (key,value,source,created_at,updated_at) VALUES (?,?,?,?,?)`)
      .bind(v.key, v.value, v.source, v.created_at, v.updated_at)
      .run();
  }
  async function upsertAppContext(context) {
    const v = serializeAppContext(context);
    await db.prepare(`INSERT OR REPLACE INTO app_contexts (id,owner_login,source_app,source_app_label,title,summary,payload_json,access_token,status,expires_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`)
      .bind(v.id, v.owner_login, v.source_app, v.source_app_label, v.title, v.summary, v.payload_json, v.access_token, v.status, v.expires_at, v.created_at, v.updated_at)
      .run();
  }
  async function appendPublisherItemRecords(records = {}) {
    const candidates = Array.isArray(records.items) ? records.items.filter((item) => item?.id) : [];
    const savedItems = [];
    const savedVersions = [];
    for (const candidate of candidates) {
      const existing = await db.prepare('SELECT id,version,created_at FROM publisher_items WHERE id=? LIMIT 1')
        .bind(String(candidate.id || ''))
        .first();
      const versionNumber = Math.max(1, Number(existing?.version || 0) + 1);
      const item = normalizePublisherItemRecord({
        ...candidate,
        version: versionNumber,
        createdAt: existing?.created_at || candidate.createdAt || nowIso(),
        updatedAt: nowIso()
      });
      const version = normalizePublisherItemVersionRecord({
        id: `${item.id}:v${versionNumber}:${String(item.appContextId || item.updatedAt || '').replace(/[^a-z0-9_-]/gi, '').slice(-48) || versionNumber}`,
        itemId: item.id,
        ownerLogin: item.ownerLogin,
        appContextId: item.appContextId,
        version: versionNumber,
        reason: item.selectedMedium?.channel ? 'manual_media_reshape_or_ingest' : 'publisher_context_ingest',
        validation: item.validation,
        selectedMedium: item.selectedMedium,
        shape: item.shape,
        payload: item.payload,
        createdAt: item.updatedAt
      });
      await runPreparedStatements([
        preparePublisherItemUpsert(item),
        preparePublisherItemVersionInsert(version)
      ]);
      savedItems.push(item);
      savedVersions.push(version);
    }
    return { items: savedItems, versions: savedVersions };
  }
  async function upsertCampaignRow(campaign) {
    const v = serializeCampaign(campaign);
    await db.prepare(`INSERT OR REPLACE INTO campaigns (id,owner_login,title,objective,status,source,cmo_plan_job_id,operations_agent_job_id,target_url,audience,channels_json,kpis_json,plan_json,tasks_json,metrics_json,logs_json,publisher_json,integrations_json,lead_source_json,ads_json,metadata_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .bind(v.id, v.owner_login, v.title, v.objective, v.status, v.source, v.cmo_plan_job_id, v.operations_agent_job_id, v.target_url, v.audience, v.channels_json, v.kpis_json, v.plan_json, v.tasks_json, v.metrics_json, v.logs_json, v.publisher_json, v.integrations_json, v.lead_source_json, v.ads_json, v.metadata_json, v.created_at, v.updated_at)
      .run();
    return deserializeCampaign(v);
  }
  async function loadAppContextById(contextId) {
    const id = String(contextId || '').trim();
    if (!id) return null;
    const row = await db.prepare('SELECT * FROM app_contexts WHERE id=? LIMIT 1')
      .bind(id)
      .first();
    return row ? deserializeAppContext(row) : null;
  }
  async function listAppContextSlice(options = {}) {
    const limit = Math.max(1, Math.min(100, Number(options.limit || 50) || 50));
    if (options.admin) {
      const rows = await db.prepare('SELECT * FROM app_contexts ORDER BY updated_at DESC LIMIT ?')
        .bind(limit)
        .all();
      return (rows.results || []).map(deserializeAppContext).filter((context) => !appContextIsExpired(context));
    }
    const ownerLogins = [...new Set((Array.isArray(options.ownerLogins) ? options.ownerLogins : [])
      .map((value) => String(value || '').trim().toLowerCase())
      .filter(Boolean))]
      .slice(0, 20);
    if (!ownerLogins.length) return [];
    const rows = await db.prepare(`SELECT * FROM app_contexts WHERE lower(COALESCE(owner_login,'')) IN (${ownerLogins.map(() => '?').join(',')}) ORDER BY updated_at DESC LIMIT ?`)
      .bind(...ownerLogins, limit)
      .all();
    return (rows.results || []).map(deserializeAppContext).filter((context) => !appContextIsExpired(context));
  }

  async function loadPersistedState() {
    const [agentsRes, appsRes, jobsRes, deliveryItemsRes, publisherItemsRes, eventsRes, accountsRes, feedbackReportsRes, chatTranscriptsRes, chatSessionsRes, appContextsRes, campaignsRes, recurringOrdersRes, emailDeliveriesRes, exactMatchActionsRes, appSettingsRes] = await Promise.all([
      db.prepare('SELECT * FROM agents ORDER BY created_at DESC').all(),
      db.prepare('SELECT * FROM apps ORDER BY updated_at DESC').all(),
      db.prepare('SELECT * FROM jobs ORDER BY created_at DESC').all(),
      db.prepare('SELECT * FROM delivery_items ORDER BY updated_at DESC LIMIT 5000').all(),
      db.prepare('SELECT * FROM publisher_items ORDER BY updated_at DESC LIMIT 1000').all(),
      db.prepare(`SELECT * FROM events ORDER BY created_at DESC LIMIT ${EVENT_LOG_RETENTION_LIMIT}`).all(),
      db.prepare('SELECT * FROM accounts ORDER BY updated_at DESC').all(),
      db.prepare(`SELECT * FROM feedback_reports ORDER BY created_at DESC LIMIT ${FEEDBACK_REPORT_RETENTION_LIMIT}`).all(),
      db.prepare(`SELECT * FROM chat_transcripts ORDER BY created_at DESC LIMIT ${CHAT_TRANSCRIPT_RETENTION_LIMIT}`).all(),
      db.prepare(`SELECT * FROM chat_sessions WHERE COALESCE(deleted_at, '')='' ORDER BY updated_at DESC LIMIT ${CHAT_SESSION_RETENTION_LIMIT}`).all(),
      db.prepare(`SELECT * FROM app_contexts ORDER BY updated_at DESC LIMIT ${APP_CONTEXT_RETENTION_LIMIT}`).all(),
      db.prepare('SELECT * FROM campaigns ORDER BY updated_at DESC LIMIT 2000').all(),
      db.prepare('SELECT * FROM recurring_orders ORDER BY updated_at DESC LIMIT 500').all(),
      db.prepare('SELECT * FROM email_deliveries ORDER BY created_at DESC LIMIT 1000').all(),
      db.prepare('SELECT * FROM exact_match_actions ORDER BY phrase ASC').all(),
      db.prepare('SELECT * FROM app_settings ORDER BY key ASC').all()
    ]);
    const stateWithAgents = ensureDefaultAgentsState({
      agents: (agentsRes.results || []).map(deserializeAgent).filter((agent) => !isRuntimeHiddenAgent(agent))
    }, defaultAgentSeedOptions);
    return ensureDefaultAppsState({
      agents: stateWithAgents.agents,
      apps: (appsRes.results || []).map(deserializeApp).filter((app) => appIsVisible(app)),
      jobs: (jobsRes.results || []).map(deserializeJob),
      deliveryItems: mergeDeliveryItemSets([], (deliveryItemsRes.results || []).map(deserializeDeliveryItem), 5000),
      publisherItems: (publisherItemsRes.results || []).map(deserializePublisherItem),
      events: (eventsRes.results || []).map(deserializeEvent),
      accounts: (accountsRes.results || [])
        .map(deserializeAccount)
        .filter((account) => !accountIsDeleted(account)),
      feedbackReports: (feedbackReportsRes.results || []).map(deserializeFeedbackReport),
      chatTranscripts: (chatTranscriptsRes.results || []).map(deserializeChatTranscript),
      chatSessions: (chatSessionsRes.results || []).map(deserializeChatSessionSnapshot),
      appContexts: mergeAppContextSets([], (appContextsRes.results || []).map(deserializeAppContext), APP_CONTEXT_RETENTION_LIMIT),
      campaigns: mergeCampaignSets([], (campaignsRes.results || []).map(deserializeCampaign), 2000),
      recurringOrders: (recurringOrdersRes.results || []).map(deserializeRecurringOrder),
      emailDeliveries: (emailDeliveriesRes.results || []).map(deserializeEmailDelivery),
      exactMatchActions: mergeExactMatchActions([], (exactMatchActionsRes.results || []).map(deserializeExactMatchAction)),
      appSettings: mergeAppSettings([], (appSettingsRes.results || []).map(deserializeAppSetting))
    });
  }

  return {
    kind: 'd1',
    supportsPersistence: true,
    schemaSql: STORAGE_SCHEMA_SQL,
    async getState() {
      await init();
      if (hasFreshStateCache()) return cloneCachedState();
      if (!stateCache.promise) {
        const loadVersion = stateCache.version;
        stateCache.promise = (async () => {
          const state = await loadPersistedState();
          cacheState(state, loadVersion);
          return state;
        })();
      }
      try {
        return structuredClone(await stateCache.promise);
      } finally {
        stateCache.promise = null;
      }
    },
    async getFreshState() {
      await init();
      invalidateStateCache();
      const state = await loadPersistedState();
      cacheState(state);
      return structuredClone(state);
    },
    async getJobById(jobId) {
      await init();
      const job = await loadJobById(jobId);
      return job ? structuredClone(job) : null;
    },
    async getAgentById(agentId) {
      await init();
      const agent = await loadAgentById(agentId);
      return agent ? structuredClone(agent) : null;
    },
    async listAgents(options = {}) {
      await init();
      const agents = await loadAgentsOnly(options);
      return structuredClone(agents);
    },
    async listApps(options = {}) {
      await init();
      const apps = await loadAppsOnly(options);
      return structuredClone(apps);
    },
    async listAppSettings() {
      await init();
      const settings = await loadAppSettingsOnly();
      return structuredClone(settings);
    },
    async listCampaigns(options = {}) {
      await init();
      const limit = Math.max(1, Math.min(500, Number(options.limit || 100) || 100));
      if (options.admin) {
        const rows = await db.prepare('SELECT * FROM campaigns ORDER BY updated_at DESC LIMIT ?')
          .bind(limit)
          .all();
        return structuredClone((rows.results || []).map(deserializeCampaign));
      }
      const ownerLogins = [...new Set((Array.isArray(options.ownerLogins) ? options.ownerLogins : [])
        .map((value) => String(value || '').trim().toLowerCase())
        .filter(Boolean))]
        .slice(0, 20);
      if (!ownerLogins.length) return [];
      const rows = await db.prepare(`SELECT * FROM campaigns WHERE lower(COALESCE(owner_login,'')) IN (${ownerLogins.map(() => '?').join(',')}) ORDER BY updated_at DESC LIMIT ?`)
        .bind(...ownerLogins, limit)
        .all();
      return structuredClone((rows.results || []).map(deserializeCampaign));
    },
    async getCampaignById(campaignId) {
      await init();
      const id = String(campaignId || '').trim();
      if (!id) return null;
      const row = await db.prepare('SELECT * FROM campaigns WHERE id=? LIMIT 1').bind(id).first();
      return row ? structuredClone(deserializeCampaign(row)) : null;
    },
    async upsertCampaign(campaign) {
      return enqueueWrite(async () => {
        await init();
        invalidateStateCache();
        const saved = await upsertCampaignRow(campaign);
        return structuredClone(saved);
      });
    },
    async listFeedbackReports(options = {}) {
      await init();
      const reports = await loadFeedbackReportsSlice(options);
      return structuredClone(reports);
    },
    async listChatTranscripts(options = {}) {
      await init();
      const transcripts = await loadChatTranscriptsSlice(options);
      return structuredClone(transcripts);
    },
    async listChatSessionSnapshots(options = {}) {
      await init();
      const sessions = await loadChatSessionSnapshotsSlice(options);
      return structuredClone(sessions);
    },
    async deleteChatSessionSnapshot(id, options = {}) {
      return enqueueWrite(async () => {
        await init();
        invalidateStateCache();
        const safeId = String(id || '').trim();
        const hash = String(options.accountHash || options.account_hash || '').trim();
        if (!safeId) return false;
        if (hash) {
          await db.prepare("UPDATE chat_sessions SET deleted_at=?, updated_at=? WHERE id=? AND account_hash=?")
            .bind(nowIso(), nowIso(), safeId, hash)
            .run();
        } else {
          await db.prepare("UPDATE chat_sessions SET deleted_at=?, updated_at=? WHERE id=?")
            .bind(nowIso(), nowIso(), safeId)
            .run();
        }
        return true;
      });
    },
    async listRecurringOrders(options = {}) {
      await init();
      const recurringOrders = await loadRecurringOrdersSlice(options);
      return structuredClone(recurringOrders);
    },
    async loadWorkflowDispatchState(parentJobId) {
      await init();
      const safeId = String(parentJobId || '').trim();
      if (!safeId) return { jobs: [], agents: [] };
      const direct = await loadJobById(safeId);
      const rootId = String(direct?.workflowParentId || safeId).trim();
      const jobs = await loadWorkflowJobs(rootId);
      const effectiveJobs = jobs.length ? jobs : (direct ? [direct] : []);
      const agents = await loadAgentsByIds(effectiveJobs.map((job) => job.assignedAgentId));
      return { jobs: structuredClone(effectiveJobs), agents: structuredClone(agents) };
    },
    async listQueuedWorkflowDispatchRoots(options = {}) {
      await init();
      const limit = Math.max(1, Math.min(25, Number(options.limit || 10) || 10));
      const now = Date.now();
      const maxAgeMs = Math.max(1, Number(options.maxAgeMs || 2 * 60 * 60 * 1000) || 2 * 60 * 60 * 1000);
      const activeAfter = new Date(now - maxAgeMs).toISOString();
      const rows = await db.prepare(`
        SELECT COALESCE(NULLIF(j.workflow_parent_id, ''), j.id) AS root_id,
               MIN(j.created_at) AS first_created_at
        FROM jobs j
        LEFT JOIN jobs p ON p.id = j.workflow_parent_id
        WHERE lower(j.status) = 'queued'
          AND j.assigned_agent_id IS NOT NULL
          AND j.assigned_agent_id != ''
          AND (j.workflow_parent_id IS NOT NULL OR j.job_kind = 'workflow' OR json_extract(j.input_json,'$._broker.workflow') IS NOT NULL)
          AND j.created_at >= ?
          AND lower(COALESCE(p.status, j.status)) IN ('queued','running')
        GROUP BY root_id
        ORDER BY first_created_at ASC
        LIMIT ?
      `).bind(activeAfter, limit).all();
      return (rows.results || []).map((row) => String(row?.root_id || '').trim()).filter(Boolean);
    },
    async listAcceptedEndpointDispatchJobs(options = {}) {
      await init();
      const limit = Math.max(1, Math.min(25, Number(options.limit || 10) || 10));
      const now = Date.now();
      const maxAgeMs = Math.max(1, Number(options.maxAgeMs || 2 * 60 * 60 * 1000) || 2 * 60 * 60 * 1000);
      const minAgeMs = Math.max(0, Number(options.minAgeMs || 60_000) || 0);
      const activeAfter = new Date(now - maxAgeMs).toISOString();
      const acceptedBefore = new Date(now - minAgeMs).toISOString();
      const rows = await db.prepare(`
        SELECT *
        FROM jobs
        WHERE lower(status) = 'dispatched'
          AND assigned_agent_id IS NOT NULL
          AND assigned_agent_id != ''
          AND json_extract(dispatch_json,'$.completionStatus') = 'accepted'
          AND max(
            COALESCE(json_extract(dispatch_json,'$.providerQueueAcceptedAt'), ''),
            COALESCE(json_extract(dispatch_json,'$.firstDispatchRequestedAt'), ''),
            COALESCE(json_extract(dispatch_json,'$.dispatchRequestedAt'), ''),
            COALESCE(dispatched_at, ''),
            COALESCE(started_at, ''),
            created_at
          ) >= ?
          AND COALESCE(json_extract(dispatch_json,'$.providerQueueAcceptedAt'), dispatched_at, started_at, created_at) <= ?
        ORDER BY COALESCE(json_extract(dispatch_json,'$.providerQueueAcceptedAt'), dispatched_at, started_at, created_at) ASC
        LIMIT ?
      `).bind(activeAfter, acceptedBefore, limit).all();
      return (rows.results || []).map(deserializeJob);
    },
    async listRetryableWorkflowChildren(options = {}) {
      await init();
      const limit = Math.max(1, Math.min(50, Number(options.limit || 20) || 20));
      const now = Date.now();
      const maxAgeMs = Math.max(1, Number(options.maxAgeMs || 2 * 60 * 60 * 1000) || 2 * 60 * 60 * 1000);
      const activeAfter = new Date(now - maxAgeMs).toISOString();
      const retryBefore = new Date(now).toISOString();
      const rows = await db.prepare(`
        SELECT j.*
        FROM jobs j
        JOIN jobs p ON p.id = j.workflow_parent_id
        WHERE lower(j.status) IN ('failed','timed_out')
          AND j.workflow_parent_id IS NOT NULL
          AND j.assigned_agent_id IS NOT NULL
          AND j.assigned_agent_id != ''
          AND lower(p.status) IN ('queued','running')
          AND COALESCE(j.failed_at, j.timed_out_at, j.created_at) >= ?
          AND (
            json_extract(j.dispatch_json,'$.retryable') = 1
            OR json_extract(j.dispatch_json,'$.retryable') = 'true'
          )
          AND COALESCE(json_extract(j.dispatch_json,'$.nextRetryAt'), j.failed_at, j.timed_out_at, j.created_at) <= ?
        ORDER BY COALESCE(json_extract(j.dispatch_json,'$.nextRetryAt'), j.failed_at, j.timed_out_at, j.created_at) ASC
        LIMIT ?
      `).bind(activeAfter, retryBefore, limit).all();
      return (rows.results || []).map(deserializeJob);
    },
    async listRetryableDispatchJobs(options = {}) {
      await init();
      const limit = Math.max(1, Math.min(50, Number(options.limit || 20) || 20));
      const now = Date.now();
      const maxAgeMs = Math.max(1, Number(options.maxAgeMs || 2 * 60 * 60 * 1000) || 2 * 60 * 60 * 1000);
      const activeAfter = new Date(now - maxAgeMs).toISOString();
      const retryBefore = new Date(now).toISOString();
      const rows = await db.prepare(`
        SELECT *
        FROM jobs
        WHERE lower(status) IN ('failed','timed_out')
          AND workflow_parent_id IS NULL
          AND assigned_agent_id IS NOT NULL
          AND assigned_agent_id != ''
          AND COALESCE(failed_at, timed_out_at, created_at) >= ?
          AND (
            json_extract(dispatch_json,'$.retryable') = 1
            OR json_extract(dispatch_json,'$.retryable') = 'true'
          )
          AND COALESCE(json_extract(dispatch_json,'$.nextRetryAt'), failed_at, timed_out_at, created_at) <= ?
        ORDER BY COALESCE(json_extract(dispatch_json,'$.nextRetryAt'), failed_at, timed_out_at, created_at) ASC
        LIMIT ?
      `).bind(activeAfter, retryBefore, limit).all();
      return (rows.results || []).map(deserializeJob);
    },
    async listScheduledWorkflowJobs(options = {}) {
      await init();
      const limit = Math.max(1, Math.min(25, Number(options.limit || 10) || 10));
      const now = Date.now();
      const maxAgeMs = Math.max(1, Number(options.maxAgeMs || 2 * 60 * 60 * 1000) || 2 * 60 * 60 * 1000);
      const minAgeMs = Math.max(0, Number(options.minAgeMs || 0) || 0);
      const activeAfter = new Date(now - maxAgeMs).toISOString();
      const requestedBefore = new Date(now - minAgeMs).toISOString();
      const rows = await db.prepare(`
        SELECT *
        FROM jobs
        WHERE lower(status) IN ('running','dispatched')
          AND (workflow_parent_id IS NOT NULL OR json_extract(input_json,'$._broker.workflow') IS NOT NULL)
          AND json_extract(dispatch_json,'$.completionStatus') = 'dispatch_scheduled'
          AND max(COALESCE(json_extract(dispatch_json,'$.firstDispatchRequestedAt'), ''), COALESCE(json_extract(dispatch_json,'$.dispatchRequestedAt'), ''), COALESCE(started_at, ''), created_at) >= ?
          AND COALESCE(json_extract(dispatch_json,'$.firstDispatchRequestedAt'), json_extract(dispatch_json,'$.dispatchRequestedAt'), started_at, created_at) <= ?
        ORDER BY COALESCE(json_extract(dispatch_json,'$.firstDispatchRequestedAt'), json_extract(dispatch_json,'$.dispatchRequestedAt'), started_at, created_at) ASC
        LIMIT ?
      `).bind(activeAfter, requestedBefore, limit).all();
      return (rows.results || []).map(deserializeJob);
    },
    async listStaleDispatchInProgressJobs(options = {}) {
      await init();
      const limit = Math.max(1, Math.min(25, Number(options.limit || 10) || 10));
      const now = Date.now();
      const maxAgeMs = Math.max(1, Number(options.maxAgeMs || 2 * 60 * 60 * 1000) || 2 * 60 * 60 * 1000);
      const minAgeMs = Math.max(0, Number(options.minAgeMs || 0) || 0);
      const activeAfter = new Date(now - maxAgeMs).toISOString();
      const requestedBefore = new Date(now - minAgeMs).toISOString();
      const rows = await db.prepare(`
        SELECT *
        FROM jobs
        WHERE lower(status) IN ('running','dispatched')
          AND (workflow_parent_id IS NOT NULL OR json_extract(input_json,'$._broker.workflow') IS NOT NULL)
          AND json_extract(dispatch_json,'$.completionStatus') = 'dispatch_in_progress'
          AND max(COALESCE(json_extract(dispatch_json,'$.dispatchInProgressAt'), ''), COALESCE(json_extract(dispatch_json,'$.lastAttemptAt'), ''), COALESCE(json_extract(dispatch_json,'$.dispatchRequestedAt'), ''), COALESCE(started_at, ''), created_at) >= ?
          AND COALESCE(json_extract(dispatch_json,'$.dispatchInProgressAt'), json_extract(dispatch_json,'$.lastAttemptAt'), json_extract(dispatch_json,'$.dispatchRequestedAt'), started_at, created_at) <= ?
        ORDER BY COALESCE(json_extract(dispatch_json,'$.dispatchInProgressAt'), json_extract(dispatch_json,'$.lastAttemptAt'), json_extract(dispatch_json,'$.dispatchRequestedAt'), started_at, created_at) ASC
        LIMIT ?
      `).bind(activeAfter, requestedBefore, limit).all();
      return (rows.results || []).map(deserializeJob);
    },
    async listStaleCompletionSweepJobs(options = {}) {
      await init();
      const limit = Math.max(1, Math.min(25, Number(options.limit || 10) || 10));
      const now = Date.now();
      const maxAgeMs = Math.max(1, Number(options.maxAgeMs || 2 * 60 * 60 * 1000) || 2 * 60 * 60 * 1000);
      const minAgeMs = Math.max(0, Number(options.minAgeMs || 0) || 0);
      const activeAfter = new Date(now - maxAgeMs).toISOString();
      const requestedBefore = new Date(now - minAgeMs).toISOString();
      const rows = await db.prepare(`
        SELECT *
        FROM jobs
        WHERE lower(status) IN ('running','dispatched')
          AND (workflow_parent_id IS NOT NULL OR json_extract(input_json,'$._broker.workflow') IS NOT NULL)
          AND json_extract(dispatch_json,'$.completionStatus') = 'completion_sweep_running'
          AND max(COALESCE(json_extract(dispatch_json,'$.completionSweepRequestedAt'), ''), COALESCE(json_extract(dispatch_json,'$.completionQueueRequestedAt'), ''), COALESCE(json_extract(dispatch_json,'$.firstDispatchRequestedAt'), ''), COALESCE(json_extract(dispatch_json,'$.dispatchRequestedAt'), ''), COALESCE(started_at, ''), created_at) >= ?
          AND COALESCE(json_extract(dispatch_json,'$.completionSweepRequestedAt'), json_extract(dispatch_json,'$.firstDispatchRequestedAt'), json_extract(dispatch_json,'$.dispatchRequestedAt'), started_at, created_at) <= ?
        ORDER BY COALESCE(json_extract(dispatch_json,'$.completionSweepRequestedAt'), json_extract(dispatch_json,'$.firstDispatchRequestedAt'), json_extract(dispatch_json,'$.dispatchRequestedAt'), started_at, created_at) ASC
        LIMIT ?
      `).bind(activeAfter, requestedBefore, limit).all();
      return (rows.results || []).map(deserializeJob);
    },
    async listStaleCompletionQueuedJobs(options = {}) {
      await init();
      const limit = Math.max(1, Math.min(25, Number(options.limit || 10) || 10));
      const now = Date.now();
      const maxAgeMs = Math.max(1, Number(options.maxAgeMs || 2 * 60 * 60 * 1000) || 2 * 60 * 60 * 1000);
      const minAgeMs = Math.max(0, Number(options.minAgeMs || 0) || 0);
      const activeAfter = new Date(now - maxAgeMs).toISOString();
      const requestedBefore = new Date(now - minAgeMs).toISOString();
      const rows = await db.prepare(`
        SELECT *
        FROM jobs
        WHERE lower(status) IN ('running','dispatched')
          AND (workflow_parent_id IS NOT NULL OR json_extract(input_json,'$._broker.workflow') IS NOT NULL)
          AND json_extract(dispatch_json,'$.completionStatus') = 'completion_queued'
          AND max(COALESCE(json_extract(dispatch_json,'$.completionQueueRequestedAt'), ''), COALESCE(json_extract(dispatch_json,'$.firstDispatchRequestedAt'), ''), COALESCE(json_extract(dispatch_json,'$.dispatchRequestedAt'), ''), COALESCE(started_at, ''), created_at) >= ?
          AND COALESCE(json_extract(dispatch_json,'$.completionQueueRequestedAt'), json_extract(dispatch_json,'$.firstDispatchRequestedAt'), json_extract(dispatch_json,'$.dispatchRequestedAt'), started_at, created_at) <= ?
        ORDER BY COALESCE(json_extract(dispatch_json,'$.completionQueueRequestedAt'), json_extract(dispatch_json,'$.firstDispatchRequestedAt'), json_extract(dispatch_json,'$.dispatchRequestedAt'), started_at, created_at) ASC
        LIMIT ?
      `).bind(activeAfter, requestedBefore, limit).all();
      return (rows.results || []).map(deserializeJob);
    },
    async listJobs(options = {}) {
      await init();
      const jobs = await listJobsSlice(options);
      return structuredClone(jobs);
    },
    async listDeliveryItems(options = {}) {
      await init();
      const items = await listDeliveryItemSlice(options);
      return structuredClone(items);
    },
    async appendPublisherRecords(records = {}) {
      return enqueueWrite(async () => {
        await init();
        invalidateStateCache();
        const saved = await appendPublisherItemRecords(records);
        return structuredClone(saved);
      });
    },
    async listPublisherItems(options = {}) {
      await init();
      const items = await listPublisherItemSlice(options);
      return structuredClone(items);
    },
    async getAccountByLogin(login) {
      await init();
      const account = await loadAccountByLogin(login);
      return account ? structuredClone(account) : null;
    },
    async authenticateOrderApiKey(rawKey) {
      await init();
      const keyHash = hashSecret(rawKey);
      const indexed = await loadApiKeyByHash(keyHash);
      if (indexed) return structuredClone(indexed);
      const accounts = await loadAccountsOnly();
      const matched = authenticateOrderApiKeyInState({ accounts }, rawKey);
      if (matched?.apiKey?.id) {
        await upsertApiKeyForAccount(matched.account, {
          ...matched.apiKey,
          keyHash
        });
      }
      return matched ? structuredClone(matched) : null;
    },
    async replaceState(nextState) {
      return enqueueWrite(() => persistState(nextState, { replace: true }));
    },
    async mutate(mutator) {
      return enqueueWrite(async () => {
        await init();
        const draft = await this.getFreshState();
        const result = await mutator(draft);
        await persistState(draft);
        return result;
      });
    },
    async upsertJobs(jobs = []) {
      return enqueueWrite(async () => {
        await init();
        const nextJobs = Array.isArray(jobs) ? structuredClone(jobs).filter((job) => job?.id) : [];
        if (!nextJobs.length) return [];
        invalidateStateCache();
        const latestJobs = await loadJobsByIds(nextJobs.map((job) => job.id));
        const latestById = new Map(latestJobs.map((job) => [String(job.id || ''), job]));
        const mergedJobs = nextJobs.map((job) => mergeJobRecord(latestById.get(String(job.id || '')) || null, job));
        await upsertJobBatch(mergedJobs);
        return structuredClone(mergedJobs);
      });
    },
    async mutateWorkflow(parentJobId, mutator) {
      return enqueueWrite(async () => {
        await init();
        const draft = { jobs: await loadWorkflowJobs(parentJobId) };
        const result = await mutator(draft);
        invalidateStateCache();
        for (const job of draft.jobs || []) {
          if (!job?.id) continue;
          const latestJob = await loadJobById(job.id);
          await upsertJob(mergeJobRecord(latestJob, job));
        }
        return result;
      });
    },
    async mutateJobAndAgent(jobId, agentId, mutator) {
      return enqueueWrite(async () => {
        await init();
        const job = await loadJobById(jobId);
        const agent = agentId ? await loadAgentById(agentId) : null;
        const draft = {
          jobs: job ? [structuredClone(job)] : [],
          agents: agent ? [structuredClone(agent)] : []
        };
        const result = await mutator(draft);
        invalidateStateCache();
        const nextJob = (draft.jobs || []).find((item) => String(item?.id || '') === String(jobId || '')) || null;
        if (nextJob) {
          const latestJob = await loadJobById(jobId);
          await upsertJob(mergeJobRecord(latestJob, nextJob));
        }
        const nextAgent = (draft.agents || []).find((item) => String(item?.id || '') === String(agentId || '')) || null;
        if (nextAgent) await upsertAgent(nextAgent);
        return result;
      });
    },
    async mutateAccount(login, mutator) {
      return enqueueWrite(async () => {
        await init();
        const account = await loadAccountByLogin(login);
        const draft = { accounts: account ? [structuredClone(account)] : [] };
        const result = await mutator(draft);
        const safeLogin = String(login || '').trim().toLowerCase();
        const nextAccount = (draft.accounts || []).find((item) => String(item?.login || '').trim().toLowerCase() === safeLogin) || (draft.accounts || [])[0] || null;
        if (nextAccount) {
          invalidateStateCache();
          await upsertAccount(nextAccount);
          await syncAccountApiKeys(nextAccount);
        }
        return result;
      });
    },
    async deleteAccountByLogin(login, options = {}) {
      return enqueueWrite(async () => {
        await init();
        const safeLogin = String(login || '').trim().toLowerCase();
        if (!safeLogin) return { deleted: false, reason: 'login_required' };
        const account = await loadAccountByLogin(safeLogin);
        const deletedAt = String(options.deletedAt || nowIso());
        const hash = String(options.accountHash || '').trim();
        invalidateStateCache();
        await db.prepare("UPDATE api_keys SET revoked_at=?, updated_at=? WHERE lower(account_login)=? AND (revoked_at IS NULL OR revoked_at='')")
          .bind(deletedAt, deletedAt, safeLogin)
          .run();
        if (hash) {
          await db.prepare("UPDATE chat_sessions SET deleted_at=?, updated_at=? WHERE account_hash=? AND COALESCE(deleted_at, '')=''")
            .bind(deletedAt, deletedAt, hash)
            .run();
          await db.prepare("UPDATE chat_transcripts SET logged_in=0, auth_provider='deleted', account_hash=NULL, updated_at=? WHERE account_hash=?")
            .bind(deletedAt, hash)
            .run();
        }
        await db.prepare("UPDATE feedback_reports SET reporter_login=NULL, email=NULL, updated_at=? WHERE lower(reporter_login)=?")
          .bind(deletedAt, safeLogin)
          .run();
        await db.prepare("UPDATE email_deliveries SET account_login=NULL, updated_at=? WHERE lower(account_login)=?")
          .bind(deletedAt, safeLogin)
          .run();
        if (account) {
          const deletedAccount = buildDeletedAccount(account, deletedAt);
          await db.prepare('UPDATE accounts SET profile_json=?, updated_at=? WHERE lower(login)=?')
            .bind(JSON.stringify(deletedAccount), deletedAt, safeLogin)
            .run();
        }
        return { deleted: Boolean(account), account: account ? structuredClone(account) : null };
      });
    },
    async appendEvent(event) {
      return enqueueWrite(async () => {
        await init();
        invalidateStateCache();
        await insertEvent(event);
        return event;
      });
    },
    async appendChatTranscript(transcript) {
      return enqueueWrite(async () => {
        await init();
        invalidateStateCache();
        await upsertChatTranscript(transcript);
        return transcript;
      });
    },
    async upsertChatSessionSnapshot(record) {
      return enqueueWrite(async () => {
        await init();
        invalidateStateCache();
        return upsertChatSessionSnapshot(record);
      });
    },
    async appendAppContext(context) {
      return enqueueWrite(async () => {
        await init();
        invalidateStateCache();
        await upsertAppContext(context);
        return structuredClone(context);
      });
    },
    async getAppContextById(contextId) {
      await init();
      const context = await loadAppContextById(contextId);
      return context ? structuredClone(context) : null;
    },
    async listAppContexts(options = {}) {
      await init();
      const contexts = await listAppContextSlice(options);
      return structuredClone(contexts);
    },
    async appendEmailDelivery(delivery) {
      return enqueueWrite(async () => {
        await init();
        invalidateStateCache();
        await upsertEmailDelivery(delivery);
        return delivery;
      });
    }
  };
}

export function touchEvent(state, type, message, meta = {}) {
  state.events.unshift({ ...makeEvent(type, message, meta), createdAt: nowIso() });
  if (state.events.length > EVENT_LOG_RETENTION_LIMIT) state.events.length = EVENT_LOG_RETENTION_LIMIT;
}

function safeJson(value, fallback) { try { return value ? JSON.parse(value) : fallback; } catch { return fallback; } }

