import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createD1LikeStorage } from '../lib/storage.js';
import { recoverMissingAccountsInState } from '../lib/shared.js';

const storageSource = await readFile(new URL('../lib/storage.js', import.meta.url), 'utf8');
assert.equal(storageSource.includes('DELETE FROM'), false, 'D1 storage must not hard-delete existing rows');

function buildAccount(login, updatedAt) {
  return {
    id: `acct:${login}`,
    login,
    profile: { displayName: login },
    billing: {},
    payout: {},
    stripe: {},
    apiAccess: { orderKeys: [] },
    githubAppAccess: { repos: [] },
    linkedIdentities: [],
    aliases: [login],
    authProvider: 'email',
    createdAt: updatedAt,
    updatedAt
  };
}

const storage = createD1LikeStorage(null, { allowInMemory: true });
const emptyState = await storage.getState();

const sampleProviderStorage = createD1LikeStorage(null, {
  allowInMemory: true,
  sampleAgentEndpointBaseUrl: 'https://example.test/sample-agents'
});
const sampleProviderState = await sampleProviderStorage.getState();
const readySampleAgents = sampleProviderState.agents.filter((agent) => (
  agent?.online === true
  && agent?.verificationStatus === 'verified'
  && agent?.agentReviewStatus === 'not_required'
  && String(agent?.metadata?.manifest?.jobEndpoint || agent?.metadata?.manifest?.job_endpoint || '').startsWith('https://example.test/sample-agents/')
));
assert.ok(readySampleAgents.length >= 2, 'configured sample provider must expose at least two ready agents for team workflows');
const staleSampleAgent = {
  ...readySampleAgents[0],
  online: false,
  verificationStatus: 'manifest_loaded',
  verificationError: 'stale persisted seed row',
  verificationDetails: null,
  agentReviewStatus: 'pending',
  agentReview: { status: 'pending', reasons: ['stale persisted seed row'] },
  metadata: {
    ...(readySampleAgents[0].metadata || {}),
    externalProviderRequired: true,
    external_provider_required: true
  }
};
await sampleProviderStorage.replaceState({
  ...sampleProviderState,
  agents: [staleSampleAgent]
});
const recoveredSampleAgent = (await sampleProviderStorage.getState()).agents.find((agent) => agent.id === staleSampleAgent.id);
assert.equal(recoveredSampleAgent?.online, true, 'sample provider merge must recover stale offline seed rows');
assert.equal(recoveredSampleAgent?.verificationStatus, 'verified', 'sample provider merge must not preserve stale unverified seed status');
assert.equal(recoveredSampleAgent?.agentReviewStatus, 'not_required', 'sample provider seed review state must stay routable');

const alpha = buildAccount('alpha@example.com', '2026-04-25T08:00:00.000Z');
await storage.replaceState({
  ...emptyState,
  accounts: [alpha]
});

const beta = buildAccount('beta@example.com', '2026-04-25T09:00:00.000Z');
await storage.replaceState({
  ...emptyState,
  accounts: [beta]
});

const afterMerge = await storage.getState();
assert.equal(afterMerge.accounts.length, 2);
assert.deepEqual(afterMerge.accounts.map((account) => account.login), ['beta@example.com', 'alpha@example.com']);

const betaUpdated = {
  ...beta,
  profile: { displayName: 'Beta Updated' },
  updatedAt: '2026-04-25T10:00:00.000Z'
};
await storage.replaceState({
  ...emptyState,
  accounts: [betaUpdated]
});

const afterUpdate = await storage.getState();
assert.equal(afterUpdate.accounts.length, 2);
assert.equal(afterUpdate.accounts[0].login, 'beta@example.com');
assert.equal(afterUpdate.accounts[0].profile.displayName, 'Beta Updated');
assert.equal(afterUpdate.accounts[1].login, 'alpha@example.com');

const completedJob = {
  id: 'terminal-completed-job',
  parentAgentId: 'qa',
  taskType: 'research',
  prompt: 'completed job should not regress',
  input: {},
  priority: 'normal',
  status: 'completed',
  createdAt: '2026-04-25T10:00:00.000Z',
  completedAt: '2026-04-25T10:01:00.000Z',
  logs: ['completed']
};
await storage.replaceState({
  ...(await storage.getState()),
  jobs: [completedJob]
});
await storage.replaceState({
  ...(await storage.getState()),
  jobs: [{
    ...completedJob,
    status: 'timed_out',
    completedAt: null,
    timedOutAt: '2026-04-25T10:02:00.000Z',
    failureReason: 'stale timeout mutation',
    logs: ['stale timeout mutation']
  }]
});
const afterTerminalMerge = await storage.getState();
const terminalJob = afterTerminalMerge.jobs.find((job) => job.id === 'terminal-completed-job');
assert.equal(terminalJob.status, 'completed', 'completed job must not be overwritten by a later stale timeout mutation');
assert.ok(terminalJob.logs.includes('stale timeout mutation'), 'diagnostic logs can merge without changing terminal success');

const sweepLockedJob = {
  id: 'active-dispatch-job',
  parentAgentId: 'qa',
  taskType: 'research',
  prompt: 'active dispatch should not regress',
  input: {},
  priority: 'normal',
  status: 'running',
  createdAt: '2026-04-25T10:00:00.000Z',
  startedAt: '2026-04-25T10:01:00.000Z',
  dispatch: {
    completionStatus: 'completion_sweep_running',
    completionSweepRequestedAt: '2026-04-25T10:02:00.000Z'
  },
  logs: ['queue consumer locked this job']
};
await storage.replaceState({
  ...(await storage.getState()),
  jobs: [sweepLockedJob]
});
await storage.replaceState({
  ...(await storage.getState()),
  jobs: [{
    ...sweepLockedJob,
    dispatch: {
      completionStatus: 'completion_queued',
      completionQueueRequestedAt: '2026-04-25T10:03:00.000Z'
    },
    logs: ['late queue write']
  }]
});
const afterDispatchRegressionMerge = await storage.getState();
const activeDispatchJob = afterDispatchRegressionMerge.jobs.find((job) => job.id === 'active-dispatch-job');
assert.equal(activeDispatchJob.dispatch.completionStatus, 'completion_sweep_running', 'late completion_queued writes must not regress an active sweep lock');
assert.ok(activeDispatchJob.logs.includes('late queue write'), 'late queue diagnostics should merge without reverting dispatch progress');

await storage.replaceState({
  ...(await storage.getState()),
  jobs: [sweepLockedJob]
});
await storage.replaceState({
  ...(await storage.getState()),
  jobs: [{
    ...sweepLockedJob,
    status: 'queued',
    startedAt: null,
    dispatch: {
      ...sweepLockedJob.dispatch,
      completionStatus: 'leader_auto_retry_queued',
      completionSweepSoftTimedOutAt: '2026-04-25T10:04:00.000Z',
      attempts: 1,
      retryable: true,
      nextRetryAt: null
    },
    logs: ['soft timeout retry queued']
  }]
});
const afterSoftRetryMerge = await storage.getState();
const softRetryJob = afterSoftRetryMerge.jobs.find((job) => job.id === 'active-dispatch-job');
assert.equal(softRetryJob.status, 'queued', 'stale completion_sweep_running jobs should be able to move back to queued for safe retry');
assert.equal(softRetryJob.dispatch.completionStatus, 'leader_auto_retry_queued', 'soft timeout retry must not be treated as an invalid dispatch regression');
assert.ok(softRetryJob.logs.includes('soft timeout retry queued'), 'soft timeout retry diagnostics should merge');

const retryQueuedJob = {
  id: 'retry-queued-job',
  parentAgentId: 'qa',
  taskType: 'cmo_leader',
  prompt: 'retry queued job should advance to scheduled dispatch',
  input: {},
  priority: 'normal',
  status: 'queued',
  createdAt: '2026-04-25T10:00:00.000Z',
  dispatch: {
    completionStatus: 'leader_auto_retry_queued',
    attempts: 1,
    maxRetries: 2
  },
  logs: ['retry queued']
};
await storage.replaceState({
  ...(await storage.getState()),
  jobs: [retryQueuedJob]
});
await storage.replaceState({
  ...(await storage.getState()),
  jobs: [{
    ...retryQueuedJob,
    status: 'running',
    startedAt: '2026-04-25T10:04:00.000Z',
    dispatch: {
      ...retryQueuedJob.dispatch,
      completionStatus: 'dispatch_scheduled',
      dispatchRequestedAt: '2026-04-25T10:04:00.000Z',
      scheduleAttempts: 1
    },
    logs: ['retry dispatch scheduled']
  }]
});
const afterRetryScheduleMerge = await storage.getState();
const retryScheduledJob = afterRetryScheduleMerge.jobs.find((job) => job.id === 'retry-queued-job');
assert.equal(retryScheduledJob.status, 'running', 'retry-queued workflow jobs should advance to running when dispatch is scheduled');
assert.equal(retryScheduledJob.dispatch.completionStatus, 'dispatch_scheduled', 'leader_auto_retry_queued must not block a fresh dispatch_scheduled transition');
assert.ok(retryScheduledJob.logs.includes('retry dispatch scheduled'), 'retry schedule diagnostics should merge');

const recoverState = {
  accounts: [],
  jobs: [{
    id: 'job_1',
    input: {
      _broker: {
        requester: {
          login: 'job-owner@example.com',
          authProvider: 'google-oauth'
        }
      }
    }
  }],
  events: [{
    id: 'evt_1',
    type: 'TRACK',
    meta: {
      kind: 'conversion',
      login: 'event-owner@example.com',
      authProvider: 'email'
    }
  }],
  agents: [{ id: 'agent_1', owner: 'agent-owner' }],
  recurringOrders: [{ id: 'rec_1', ownerLogin: 'recurring-owner@example.com' }],
  emailDeliveries: [{ id: 'mail_1', accountLogin: 'mail-owner@example.com' }],
  feedbackReports: [{ id: 'report_1', reporterLogin: 'report-owner@example.com' }]
};
const recovered = recoverMissingAccountsInState(recoverState);
assert.equal(recovered.recovered, 6);
assert.deepEqual(
  recoverState.accounts.map((account) => account.login).sort(),
  ['agent-owner', 'event-owner@example.com', 'job-owner@example.com', 'mail-owner@example.com', 'recurring-owner@example.com', 'report-owner@example.com']
);

function createCountingDb() {
  const selectCounts = new Map();
  const columnsByTable = {
    chat_transcripts: [{ name: 'session_id' }],
    jobs: [{ name: 'workflow_parent_id' }, { name: 'workflow_task' }, { name: 'workflow_agent_name' }, { name: 'workflow_json' }, { name: 'executor_state_json' }, { name: 'original_prompt' }, { name: 'prompt_optimization_json' }, { name: 'selection_mode' }, { name: 'estimate_window_json' }, { name: 'billing_reservation_json' }, { name: 'logs_json' }, { name: 'timed_out_at' }, { name: 'last_callback_at' }]
  };
  const emptyResults = { results: [] };
  const recordSelect = (sql) => {
    selectCounts.set(sql, (selectCounts.get(sql) || 0) + 1);
    return emptyResults;
  };
  return {
    selectCounts,
    prepare(sql) {
      return {
        bind() { return this; },
        async all() {
          if (sql.startsWith('PRAGMA table_info(')) {
            const table = sql.match(/PRAGMA table_info\((.+)\)/)?.[1] || '';
            return { results: columnsByTable[table] || [] };
          }
          if (sql.startsWith('SELECT * FROM agents WHERE id IN')) return emptyResults;
          if (sql.startsWith('SELECT * FROM agents ORDER BY')) return recordSelect('agents');
          if (sql.startsWith('SELECT * FROM jobs ORDER BY')) return recordSelect('jobs');
          if (sql.startsWith('SELECT * FROM delivery_items ORDER BY')) return recordSelect('delivery_items');
          if (sql.startsWith('SELECT * FROM events ORDER BY')) return recordSelect('events');
          if (sql.startsWith('SELECT * FROM accounts ORDER BY')) return recordSelect('accounts');
          if (sql.startsWith('SELECT * FROM feedback_reports ORDER BY')) return recordSelect('feedback_reports');
          if (sql.startsWith('SELECT * FROM chat_transcripts ORDER BY')) return recordSelect('chat_transcripts');
          if (sql.startsWith('SELECT * FROM recurring_orders ORDER BY')) return recordSelect('recurring_orders');
          if (sql.startsWith('SELECT * FROM email_deliveries ORDER BY')) return recordSelect('email_deliveries');
          if (sql.startsWith('SELECT * FROM exact_match_actions ORDER BY')) return recordSelect('exact_match_actions');
          if (sql.startsWith('SELECT * FROM app_settings ORDER BY')) return recordSelect('app_settings');
          return emptyResults;
        },
        async first() {
          if (sql.startsWith('SELECT COUNT(*) as count FROM events')) return { count: 1 };
          return null;
        },
        async run() {
          return { success: true };
        }
      };
    }
  };
}

const countingDb = createCountingDb();
const cachedStorage = createD1LikeStorage(countingDb, { stateCacheTtlMs: 5000 });
await cachedStorage.getState();
await cachedStorage.getState();
assert.equal(countingDb.selectCounts.get('agents') || 0, 1);
assert.equal(countingDb.selectCounts.get('jobs') || 0, 2);
assert.equal(countingDb.selectCounts.get('chat_transcripts') || 0, 1);

const storageInitVersion = storageSource.match(/const STORAGE_INIT_VERSION = '([^']+)'/)?.[1] || '';
assert.ok(storageInitVersion, 'storage init version should be declared');

function createVersionMatchedLegacyDb() {
  const alterStatements = [];
  const emptyResults = { results: [] };
  return {
    alterStatements,
    prepare(sql) {
      return {
        bind() { return this; },
        async all() {
          if (sql.startsWith('PRAGMA table_info(')) {
            const table = sql.match(/PRAGMA table_info\((.+)\)/)?.[1] || '';
            if (table === 'jobs') return { results: [{ name: 'id' }] };
            if (table === 'chat_transcripts') return { results: [{ name: 'id' }] };
            return emptyResults;
          }
          if (/SELECT \* FROM (agents|jobs|delivery_items|events|accounts|feedback_reports|chat_transcripts|app_contexts|recurring_orders|email_deliveries|exact_match_actions|app_settings) ORDER BY/.test(sql)) {
            return emptyResults;
          }
          return emptyResults;
        },
        async first() {
          if (sql.startsWith('SELECT value FROM app_settings WHERE key=')) return { value: storageInitVersion };
          if (sql.startsWith('SELECT COUNT(*) as count FROM events')) return { count: 1 };
          return null;
        },
        async run() {
          if (sql.startsWith('ALTER TABLE')) alterStatements.push(sql);
          return { success: true };
        }
      };
    }
  };
}

const versionMatchedLegacyDb = createVersionMatchedLegacyDb();
await createD1LikeStorage(versionMatchedLegacyDb, { stateCacheTtlMs: 0 }).getState();
assert.ok(
  versionMatchedLegacyDb.alterStatements.some((sql) => sql.includes('ALTER TABLE jobs ADD COLUMN executor_state_json')),
  'D1 schema migration must run even when storage init version already matches'
);
assert.ok(
  versionMatchedLegacyDb.alterStatements.some((sql) => sql.includes('ALTER TABLE chat_transcripts ADD COLUMN session_id')),
  'chat transcript session_id migration must run even when storage init version already matches'
);

function createSeedRepairDb() {
  const agentsRows = [{
    id: 'agent_cmo_leader_01',
    name: 'CMO TEAM LEADER',
    description: 'old hidden leader',
    task_types: '["cmo_leader"]',
    premium_rate: 0.1,
    basic_rate: 0.1,
    success_rate: 0.9,
    avg_latency_sec: 20,
    online: 1,
    owner: 'aiagent2',
    manifest_url: 'built-in://cmo',
    manifest_source: 'built-in',
    token: 'seed',
    earnings: 0,
    metadata_json: JSON.stringify({ hidden_from_catalog: true, deleted_at: '2026-04-01T00:00:00.000Z' }),
    created_at: '2026-04-01T00:00:00.000Z',
    updated_at: '2026-04-01T00:00:00.000Z'
  }];
  return {
    prepare(sql) {
      let bound = [];
      return {
        bind(...args) {
          bound = args;
          return this;
        },
        async all() {
          if (sql.startsWith('PRAGMA table_info(')) {
            const table = sql.match(/PRAGMA table_info\((.+)\)/)?.[1] || '';
            if (table === 'chat_transcripts') return { results: [{ name: 'session_id' }] };
            if (table === 'jobs') return { results: [{ name: 'workflow_parent_id' }, { name: 'workflow_task' }, { name: 'workflow_agent_name' }, { name: 'workflow_json' }, { name: 'executor_state_json' }, { name: 'original_prompt' }, { name: 'prompt_optimization_json' }, { name: 'selection_mode' }, { name: 'estimate_window_json' }, { name: 'billing_reservation_json' }, { name: 'logs_json' }, { name: 'timed_out_at' }, { name: 'last_callback_at' }] };
            return { results: [] };
          }
          if (sql.startsWith('SELECT * FROM agents WHERE id IN')) {
            return { results: agentsRows.filter((row) => bound.includes(row.id)) };
          }
          if (sql.startsWith('SELECT * FROM agents ORDER BY')) {
            return { results: [...agentsRows] };
          }
          if (/SELECT \* FROM (jobs|delivery_items|events|accounts|feedback_reports|chat_transcripts|app_contexts|recurring_orders|email_deliveries|exact_match_actions|app_settings) ORDER BY/.test(sql)) {
            return { results: [] };
          }
          return { results: [] };
        },
        async first() {
          if (sql.startsWith('SELECT COUNT(*) as count FROM events')) return { count: 1 };
          return null;
        },
        async run() {
          if (sql.startsWith('INSERT OR REPLACE INTO agents')) {
            const row = {
              id: bound[0],
              name: bound[1],
              description: bound[2],
              task_types: bound[3],
              premium_rate: bound[4],
              basic_rate: bound[5],
              success_rate: bound[6],
              avg_latency_sec: bound[7],
              online: bound[8],
              owner: bound[9],
              manifest_url: bound[10],
              manifest_source: bound[11],
              token: bound[12],
              earnings: bound[13],
              metadata_json: bound[14],
              created_at: bound[15],
              updated_at: bound[16]
            };
            const index = agentsRows.findIndex((item) => item.id === row.id);
            if (index >= 0) agentsRows[index] = row;
            else agentsRows.push(row);
          }
          return { success: true };
        }
      };
    }
  };
}

const repairedSeedStorage = createD1LikeStorage(createSeedRepairDb(), { stateCacheTtlMs: 0 });
const repairedSeedState = await repairedSeedStorage.getState();
const repairedCmo = repairedSeedState.agents.find((agent) => agent.id === 'agent_cmo_leader_01');
assert.ok(repairedCmo);
assert.equal(Boolean(repairedCmo.metadata?.hidden_from_catalog), false);
assert.equal(Boolean(repairedCmo.metadata?.deleted_at || repairedCmo.metadata?.deletedAt), false);

const repairedProviderStorage = createD1LikeStorage(createSeedRepairDb(), {
  stateCacheTtlMs: 0,
  sampleAgentEndpointBaseUrl: 'https://example.test/sample-agents'
});
const repairedProviderState = await repairedProviderStorage.getState();
const d1ReadySampleAgents = repairedProviderState.agents.filter((agent) => (
  agent?.online === true
  && agent?.verificationStatus === 'verified'
  && agent?.agentReviewStatus === 'not_required'
  && String(agent?.metadata?.manifest?.jobEndpoint || agent?.metadata?.manifest?.job_endpoint || '').startsWith('https://example.test/sample-agents/')
));
assert.ok(d1ReadySampleAgents.length >= 2, 'D1 seed repair must expose at least two ready sample agents for team workflows');
const repairedProviderCmo = repairedProviderState.agents.find((agent) => agent.id === 'agent_cmo_leader_01');
assert.equal(repairedProviderCmo?.verificationStatus, 'verified', 'D1 seed repair must overwrite stale leader verification when sample provider is configured');
assert.equal(repairedProviderCmo?.agentReviewStatus, 'not_required', 'D1 seed repair must keep provider-backed sample leaders routable');

const jobStorage = createD1LikeStorage(null, { allowInMemory: true });
const jobState = await jobStorage.getState();
await jobStorage.replaceState({
  ...jobState,
  jobs: [{
    id: 'job-parent',
    parentAgentId: 'qa',
    taskType: 'cmo_leader',
    prompt: 'parent',
    input: {},
    priority: 'normal',
    status: 'running',
    workflow: { childRuns: [{ id: 'job-child', status: 'running' }] },
    createdAt: '2026-04-26T08:00:00.000Z',
    startedAt: '2026-04-26T08:05:00.000Z',
    logs: ['parent started']
  }]
});
await jobStorage.replaceState({
  ...jobState,
  jobs: [{
    id: 'job-parent',
    parentAgentId: 'qa',
    taskType: 'cmo_leader',
    prompt: 'parent',
    input: {},
    priority: 'normal',
    status: 'queued',
    createdAt: '2026-04-26T08:00:00.000Z',
    logs: ['stale queued snapshot']
  }]
});
const mergedJobState = await jobStorage.getState();
const mergedParent = mergedJobState.jobs.find((job) => job.id === 'job-parent');
assert.ok(mergedParent);
assert.equal(mergedParent.status, 'running');
assert.ok(Array.isArray(mergedParent.logs) && mergedParent.logs.includes('parent started'));
assert.ok(Array.isArray(mergedParent.logs) && mergedParent.logs.includes('stale queued snapshot'));

const deliveryItemStorage = createD1LikeStorage(null, { allowInMemory: true });
await deliveryItemStorage.upsertJobs([{
  id: 'job-seo-delivery',
  parentAgentId: 'qa',
  taskType: 'seo_gap',
  prompt: 'seo article',
  input: { _broker: { requester: { login: 'owner@example.com', accountId: 'acct:owner@example.com' } } },
  priority: 'normal',
  status: 'completed',
  workflowTask: 'seo_gap',
  workflowAgentName: 'SEO AGENT',
  output: {
    report: { summary: 'SEO article ready' },
    files: [{ name: 'seo-agent-delivery.md', type: 'text/markdown', content: '# SEO article\n\nTitle: AI agent marketplace guide\n\nMeta description: Source-backed guide.\n\nLeader checkpointで確認する本文。' }]
  },
  createdAt: '2026-04-26T08:20:00.000Z',
  completedAt: '2026-04-26T08:21:00.000Z'
}]);
await deliveryItemStorage.upsertJobs([{
  id: 'job-landing-delivery',
  parentAgentId: 'qa',
  taskType: 'landing',
  prompt: 'landing page critique',
  input: { _broker: { requester: { login: 'owner@example.com', accountId: 'acct:owner@example.com' } } },
  priority: 'normal',
  status: 'completed',
  workflowTask: 'landing',
  workflowAgentName: 'LANDING PAGE CRITIQUE AGENT',
  output: {
    report: { summary: 'Landing page ready' },
    files: [{
      name: 'landing-page-critique-delivery.md',
      type: 'text/markdown',
      content: [
        '# landing page critique delivery',
        '',
        '## Request',
        'Task: writing',
        '=== WORKFLOW HANDOFF CONTEXT ===',
        'CANONICAL USER BRIEF',
        '- Product/service: - Product/service: https://example.com',
        '- Main goal: - Main goal: Increase signups/trials',
        '- Target audience: - Target audience: Developers/technical users',
        '- Priority channel: - Priority channel: Organic search / SEO',
        '=== END WORKFLOW HANDOFF CONTEXT ===',
        '## Agent-owned behavior',
        '- role: landing page build',
        '## Expected output sections',
        '- Replacement copy',
        '## Review notes',
        'internal prompt text'
      ].join('\n')
    }]
  },
  createdAt: '2026-04-26T08:21:10.000Z',
  completedAt: '2026-04-26T08:21:30.000Z'
}]);
await deliveryItemStorage.upsertJobs([{
  id: 'job-leader-package',
  parentAgentId: 'qa',
  taskType: 'cmo_leader',
  prompt: 'leader package',
  input: { _broker: { requester: { login: 'owner@example.com', accountId: 'acct:owner@example.com' } } },
  priority: 'normal',
  status: 'completed',
  workflowTask: 'cmo_leader',
  workflowAgentName: 'CMO TEAM LEADER',
  output: {
    report: { summary: 'Integrated delivery' },
    files: [{ name: 'leader-package.md', type: 'text/markdown', content: '# Integrated delivery\n\nSEO article and social post summary.' }]
  },
  createdAt: '2026-04-26T08:22:00.000Z',
  completedAt: '2026-04-26T08:23:00.000Z'
}]);
await deliveryItemStorage.upsertJobs([{
  id: 'job-data-packet',
  parentAgentId: 'qa',
  taskType: 'data_analysis',
  prompt: 'analytics packet',
  input: { _broker: { requester: { login: 'owner@example.com', accountId: 'acct:owner@example.com' } } },
  priority: 'normal',
  status: 'completed',
  workflowTask: 'data_analysis',
  workflowAgentName: 'DATA ANALYSIS AGENT',
  output: {
    report: { summary: 'GA4 packet' },
    files: [{ name: 'analytics.md', type: 'text/markdown', content: '# GA4 packet\n\nリード and signup context.' }]
  },
  createdAt: '2026-04-26T08:24:00.000Z',
  completedAt: '2026-04-26T08:25:00.000Z'
}]);
await deliveryItemStorage.upsertJobs([{
  id: 'job-research-memo',
  parentAgentId: 'qa',
  taskType: 'research',
  prompt: 'research memo',
  input: { _broker: { requester: { login: 'owner@example.com', accountId: 'acct:owner@example.com' } } },
  priority: 'normal',
  status: 'completed',
  workflowTask: 'research',
  workflowAgentName: 'RESEARCH AGENT',
  output: {
    report: { summary: 'Research memo' },
    files: [{ name: 'research.md', type: 'text/markdown', content: '# Research memo\n\nSEO and リード context for downstream agents.' }]
  },
  createdAt: '2026-04-26T08:26:00.000Z',
  completedAt: '2026-04-26T08:27:00.000Z'
}]);
const publisherItems = await deliveryItemStorage.listDeliveryItems({ surface: 'publisher', ownerLogins: ['owner@example.com'] });
assert.equal(publisherItems.length, 2);
const seoPublisherItem = publisherItems.find((item) => item.itemType === 'seo_article');
const landingPublisherItem = publisherItems.find((item) => item.itemType === 'landing_page');
assert.ok(seoPublisherItem);
assert.equal(seoPublisherItem.surface, 'publisher');
assert.equal(seoPublisherItem.metadata.meta_description, 'Source-backed guide.');
assert.ok(landingPublisherItem);
assert.equal(landingPublisherItem.surface, 'publisher');
assert.equal(landingPublisherItem.title, 'example.com - signup landing page');
assert.equal(landingPublisherItem.metadata.meta_description, 'Use example.com to show the offer, proof, and next step for Developers/technical users, then continue to signup or trial start.');
assert.equal(landingPublisherItem.body.includes('WORKFLOW HANDOFF CONTEXT'), false);
assert.equal(landingPublisherItem.body.includes('## Request'), false);
assert.equal(landingPublisherItem.body.includes('Agent-owned behavior'), false);
const analyticsItems = await deliveryItemStorage.listDeliveryItems({ surface: 'analytics', ownerLogins: ['owner@example.com'] });
assert.equal(analyticsItems.length, 1);
assert.equal(analyticsItems[0].surface, 'analytics');
const leadItems = await deliveryItemStorage.listDeliveryItems({ surface: 'lead', ownerLogins: ['owner@example.com'] });
assert.equal(leadItems.length, 0);

function createConcurrentJobsDb() {
  const jobsRows = [];
  return {
    prepare(sql) {
      let bound = [];
      return {
        bind(...args) {
          bound = args;
          return this;
        },
        async all() {
          if (sql.startsWith('PRAGMA table_info(')) {
            const table = sql.match(/PRAGMA table_info\((.+)\)/)?.[1] || '';
            if (table === 'chat_transcripts') return { results: [{ name: 'session_id' }] };
            if (table === 'jobs') return { results: [{ name: 'workflow_parent_id' }, { name: 'workflow_task' }, { name: 'workflow_agent_name' }, { name: 'workflow_json' }, { name: 'executor_state_json' }, { name: 'original_prompt' }, { name: 'prompt_optimization_json' }, { name: 'selection_mode' }, { name: 'estimate_window_json' }, { name: 'billing_reservation_json' }, { name: 'logs_json' }, { name: 'timed_out_at' }, { name: 'last_callback_at' }] };
            return { results: [] };
          }
          if (sql.startsWith('SELECT * FROM jobs ORDER BY')) {
            return { results: [...jobsRows] };
          }
          if (/SELECT \* FROM (agents|delivery_items|events|accounts|feedback_reports|chat_transcripts|app_contexts|recurring_orders|email_deliveries|exact_match_actions|app_settings) ORDER BY/.test(sql)) {
            return { results: [] };
          }
          if (sql.startsWith('SELECT * FROM agents WHERE id IN')) return { results: [] };
          return { results: [] };
        },
        async first() {
          if (sql.startsWith('SELECT COUNT(*) as count FROM events')) return { count: 1 };
          return null;
        },
        async run() {
          if (sql.startsWith('INSERT OR REPLACE INTO jobs') || sql.startsWith('INSERT INTO jobs')) {
            const row = {
              id: bound[0],
              parent_agent_id: bound[1],
              task_type: bound[2],
              prompt: bound[3],
              input_json: bound[4],
              budget_cap: bound[5],
              deadline_sec: bound[6],
              priority: bound[7],
              status: bound[8],
              job_kind: bound[9],
              assigned_agent_id: bound[10],
              score: bound[11],
              usage_json: bound[12],
              billing_estimate_json: bound[13],
              actual_billing_json: bound[14],
              output_json: bound[15],
              failure_reason: bound[16],
              failure_category: bound[17],
              callback_token: bound[18],
              dispatch_json: bound[19],
              workflow_parent_id: bound[20],
              workflow_task: bound[21],
              workflow_agent_name: bound[22],
              workflow_json: bound[23],
              executor_state_json: bound[24],
              original_prompt: bound[25],
              prompt_optimization_json: bound[26],
              selection_mode: bound[27],
              estimate_window_json: bound[28],
              billing_reservation_json: bound[29],
              logs_json: bound[30],
              created_at: bound[31],
              claimed_at: bound[32],
              dispatched_at: bound[33],
              started_at: bound[34],
              last_callback_at: bound[35],
              completed_at: bound[36],
              failed_at: bound[37],
              timed_out_at: bound[38]
            };
            const index = jobsRows.findIndex((item) => item.id === row.id);
            if (index >= 0) jobsRows[index] = row;
            else jobsRows.push(row);
          }
          return { success: true };
        }
      };
    }
  };
}

const concurrentJobsStorage = createD1LikeStorage(createConcurrentJobsDb(), { stateCacheTtlMs: 0 });
const concurrentBase = await concurrentJobsStorage.getState();
await Promise.all([
  concurrentJobsStorage.replaceState({
    ...concurrentBase,
    jobs: [{
      id: 'workflow-root',
      parentAgentId: 'qa',
      taskType: 'cmo_leader',
      prompt: 'parent',
      input: {},
      priority: 'normal',
      status: 'queued',
      jobKind: 'workflow',
      createdAt: '2026-04-26T08:10:00.000Z'
    }]
  }),
  concurrentJobsStorage.replaceState({
    ...concurrentBase,
    jobs: [{
      id: 'workflow-child',
      parentAgentId: 'qa',
      taskType: 'research',
      prompt: 'child',
      input: {},
      priority: 'normal',
      status: 'queued',
      jobKind: 'workflow_child',
      workflowParentId: 'workflow-root',
      workflowTask: 'research',
      createdAt: '2026-04-26T08:10:01.000Z'
    }]
  })
]);
const concurrentJobsState = await concurrentJobsStorage.getState();
assert.equal(concurrentJobsState.jobs.some((job) => job.id === 'workflow-root'), true);
assert.equal(concurrentJobsState.jobs.some((job) => job.id === 'workflow-child'), true);

console.log('storage qa passed');
