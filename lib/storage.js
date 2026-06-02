import { DEFAULT_APP_SEEDS, appIsVisible, mergeSystemApp } from './apps.js';
import { appContextIsExpired } from './app-context.js';
import { deserializeCampaign, mergeCampaignSets, serializeCampaign } from './campaigns.js';
import {
  DEFAULT_AGENT_SEEDS,
  DEPRECATED_AGENT_SEED_IDS,
  authenticateOrderApiKey as authenticateOrderApiKeyInState,
  hashSecret,
  makeEvent,
  nowIso
} from './shared.js';
import { D1_SCHEMA_SQL, STORAGE_SCHEMA_SQL } from './storage-schema.js';
import { ensureD1StorageSchema } from './storage-d1-schema.js';
import {
  deliveryItemTimestamp,
  deliveryItemsForJobs,
  ensureDefaultAgentsState,
  ensureDefaultAppsState,
  inMemoryState,
  isDefaultAgentSeedAllowed,
  isRuntimeHiddenAgent,
  mergeAccountSets,
  mergeAppContextSets,
  mergeAppSettings,
  mergeChatTranscriptSets,
  mergeDeliveryItemSets,
  mergeExactMatchActions,
  mergeJobRecord,
  mergeJobSets,
  mergeSystemAgent,
  sampleAgentSeedWithManifestEndpoint,
  softDeleteDeprecatedAgent,
  softDeleteUnsafeSampleAgentSeed
} from './storage-state-helpers.js';
import {
  accountIsDeleted,
  buildDeletedAccount,
  deserializeAccount,
  deserializeAgent,
  deserializeApiKey,
  deserializeApp,
  deserializeAppContext,
  deserializeAppSetting,
  deserializeChatSessionSnapshot,
  deserializeChatTranscript,
  deserializeDeliveryItem,
  deserializeEmailDelivery,
  deserializeEvent,
  deserializeExactMatchAction,
  deserializeFeedbackReport,
  deserializeJob,
  deserializePublisherItem,
  deserializePublisherItemVersion,
  deserializeRecurringOrder,
  normalizePublisherItemRecord,
  normalizePublisherItemVersionRecord,
  serializeAccount,
  serializeAgent,
  serializeApiKey,
  serializeApp,
  serializeAppContext,
  serializeAppSetting,
  serializeChatSessionSnapshot,
  serializeChatTranscript,
  serializeDeliveryItem,
  serializeEmailDelivery,
  serializeExactMatchAction,
  serializeFeedbackReport,
  serializeJob,
  serializePublisherItem,
  serializePublisherItemVersion,
  serializeRecurringOrder
} from './storage-row-codecs.js';
export { D1_SCHEMA_SQL, STORAGE_SCHEMA_SQL } from './storage-schema.js';

const EVENT_LOG_RETENTION_LIMIT = 2000;
const CHAT_TRANSCRIPT_RETENTION_LIMIT = 2000;
const CHAT_SESSION_RETENTION_LIMIT = 1000;
const FEEDBACK_REPORT_RETENTION_LIMIT = 1000;
const APP_CONTEXT_RETENTION_LIMIT = 500;
const D1_STATE_CACHE = new WeakMap();

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
    await ensureD1StorageSchema(db, STORAGE_SCHEMA_SQL);
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

  async function markStorageInitVersion() {
    await upsertAppSetting({
      key: STORAGE_INIT_VERSION_KEY,
      value: STORAGE_INIT_VERSION,
      source: 'storage-init',
      createdAt: nowIso(),
      updatedAt: nowIso()
    });
  }

  async function softDeleteDeprecatedSeedRows() {
    if (!DEPRECATED_AGENT_SEED_IDS.length) return [];
    const rows = await db.prepare(`SELECT * FROM agents WHERE id IN (${DEPRECATED_AGENT_SEED_IDS.map(() => '?').join(',')})`).bind(...DEPRECATED_AGENT_SEED_IDS).all();
    const softDeleted = (rows.results || []).map((row) => softDeleteDeprecatedAgent(deserializeAgent(row)));
    for (const agent of softDeleted) await upsertAgent(agent);
    return softDeleted;
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
