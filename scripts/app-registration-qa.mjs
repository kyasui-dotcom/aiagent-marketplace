import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createD1LikeStorage } from '../lib/storage.js';
import {
  createAppFromManifest,
  isCoreFeatureAppId,
  normalizeAppManifest,
  sanitizeAppForPublic,
  validateAppManifest
} from '../lib/apps.js';
import { createAppContextRecord, publicAppContext } from '../lib/app-context.js';
import { API_ROUTES } from '../lib/api-routes.js';

const filesToCheck = [
  '../lib/apps.js',
  '../lib/app-context.js',
  '../lib/storage.js',
  '../server.js',
  '../worker.js',
  '../public/chat.js',
  '../scripts/external-chat.mjs'
];

for (const relative of filesToCheck) {
  execFileSync(process.execPath, ['--check', fileURLToPath(new URL(relative, import.meta.url))], { stdio: 'pipe' });
}

const sampleManifest = {
  schema_version: 'app-manifest/v1',
  kind: 'application',
  name: 'My Action App',
  description: 'Receives approved CAIt action packets.',
  entry_url: 'https://example.com/',
  healthcheck_url: 'https://example.com/api/health',
  capabilities: ['x_post_queue', 'approval_packet'],
  required_connectors: ['x'],
  requires_approval_for: ['post_now'],
  input_contract: {
    schemaVersion: 'cait-app-agent-transfer/v1',
    accepts: ['post_text', 'strategy']
  },
  handoff: {
    create_url: 'https://example.com/api/cait/handoff',
    method: 'POST',
    open_url_param: 'cait_handoff'
  },
  mcp: {
    server_url: 'https://example.com/mcp',
    transport: 'streamable_http',
    auth: 'oauth',
    tools: ['example.prepare_packet'],
    resources: ['example://packets']
  },
  auth: {
    token: 'secret'
  }
};

const normalized = normalizeAppManifest(sampleManifest);
assert.equal(normalized.schemaVersion, 'app-manifest/v1');
assert.equal(normalized.kind, 'application');
assert.equal(normalized.entryUrl, 'https://example.com/');
assert.equal(normalized.handoff.createUrl, 'https://example.com/api/cait/handoff');
assert.equal(normalized.mcp.serverUrl, 'https://example.com/mcp');
assert.deepEqual(normalized.mcp.tools, ['example.prepare_packet']);
assert.deepEqual(normalized.capabilities, ['x_post_queue', 'approval_packet']);
assert.deepEqual(normalized.requiredConnectors, ['x']);
assert.deepEqual(validateAppManifest(normalized), { ok: true, errors: [] });
assert.equal(isCoreFeatureAppId('delivery-manager'), true, 'Deliveries should be reserved as a core CAIt feature id');
assert.equal(validateAppManifest({ ...normalized, id: 'delivery-manager' }).ok, false, 'Core CAIt feature ids should not be app-registerable');

const app = createAppFromManifest(normalized, { owner: 'publisher', metadata: { githubLogin: 'publisher' } });
assert.equal(app.owner, 'publisher');
assert.equal(app.name, 'My Action App');
assert.equal(app.entryUrl, 'https://example.com/');
assert.equal(app.handoff.createUrl, 'https://example.com/api/cait/handoff');
assert.equal(app.mcp.serverUrl, 'https://example.com/mcp');

const publicApp = sanitizeAppForPublic({
  ...app,
  auth: { token: 'secret' },
  metadata: {
    ...app.metadata,
    manifest: {
      ...app.metadata.manifest,
      auth: { type: 'bearer', token: 'secret' }
    }
  }
});
assert.equal(publicApp.auth, undefined);
assert.equal(publicApp.metadata.manifest.auth.redacted, true);
assert.equal(publicApp.metadata.manifest.auth.token, undefined);

const storage = createD1LikeStorage(null, { allowInMemory: true });
const initial = await storage.getState();
assert.ok(Array.isArray(initial.apps), 'storage state should include apps');
assert.ok(Array.isArray(initial.appContexts), 'storage state should include app contexts');
assert.ok(initial.apps.some((item) => item.id === 'x-client-ops'), 'default X Client Ops app should be seeded');
const seededXClientOps = initial.apps.find((item) => item.id === 'x-client-ops');
assert.equal(seededXClientOps?.handoff?.dedicatedDelivery?.preparedTextSource, 'social_post_text', 'default X Client Ops app seed should preserve dedicated handoff display contract');
assert.equal(seededXClientOps?.inputContract?.constraints?.text?.maxLength, 280, 'default X Client Ops app seed should preserve text limits for chat handoff validation');
assert.ok(seededXClientOps?.directCommandAliases?.includes('x ops'), 'default X Client Ops app seed should expose direct command aliases outside chat code');
const seededPublisher = initial.apps.find((item) => item.id === 'publisher-approval-studio');
assert.equal(seededPublisher?.contextIngestUrl, '/api/publisher/context-ingest', 'default Publisher app seed should expose its context ingest route');
assert.ok(seededPublisher?.directCommandAliases?.includes('approval studio'), 'default Publisher app seed should expose direct command aliases outside chat code');
const seededAnalytics = initial.apps.find((item) => item.id === 'analytics-console');
assert.ok(seededAnalytics?.directCommandAliases?.includes('ga4'), 'default Analytics app seed should expose direct command aliases outside chat code');
const seededAdsLaunch = initial.apps.find((item) => item.id === 'ads-launch-console');
assert.ok(seededAdsLaunch, 'default Ads Launch Console app should be seeded');
assert.ok(seededAdsLaunch?.inputContract?.accepts?.includes('ads_saas_handoff'), 'default Ads Launch Console app seed should accept Ads SaaS handoff packets');
assert.ok(seededAdsLaunch?.requiresApprovalFor?.includes('budget_spend'), 'default Ads Launch Console app seed should keep budget spend approval-gated');
assert.ok(seededAdsLaunch?.directCommandAliases?.includes('ads launch'), 'default Ads Launch Console app seed should expose direct command aliases outside chat code');
const seededGrowthExperiment = initial.apps.find((item) => item.id === 'growth-experiment-console');
assert.ok(seededGrowthExperiment, 'default Growth Experiment Console app should be seeded');
assert.ok(seededGrowthExperiment?.inputContract?.accepts?.includes('growth_experiment_packet'), 'default Growth Experiment Console app seed should accept growth experiment packets');
assert.ok(seededGrowthExperiment?.inputContract?.accepts?.includes('no_paid_growth_plan_packet'), 'default Growth Experiment Console app seed should accept no-paid growth plan packets');
assert.ok(seededGrowthExperiment?.inputContract?.accepts?.includes('organic_specialist_handoff_packet'), 'default Growth Experiment Console app seed should accept organic specialist handoff packets');
assert.ok(seededGrowthExperiment?.inputContract?.accepts?.includes('growth_activation_handoff_packet'), 'default Growth Experiment Console app seed should accept growth activation handoff packets');
assert.ok(seededGrowthExperiment?.requiresApprovalFor?.includes('growth_activation'), 'default Growth Experiment Console app seed should keep activation approval-gated');
assert.ok(seededGrowthExperiment?.directCommandAliases?.includes('growth experiment'), 'default Growth Experiment Console app seed should expose direct command aliases outside chat code');
const seededPricingDecision = initial.apps.find((item) => item.id === 'pricing-decision-console');
assert.ok(seededPricingDecision, 'default Pricing Decision Console app should be seeded');
assert.ok(seededPricingDecision?.inputContract?.accepts?.includes('pricing_decision_packet'), 'default Pricing Decision Console app seed should accept pricing decision packets');
assert.ok(seededPricingDecision?.inputContract?.accepts?.includes('price_change_handoff'), 'default Pricing Decision Console app seed should accept price-change handoff packets');
assert.ok(seededPricingDecision?.requiresApprovalFor?.includes('price_change'), 'default Pricing Decision Console app seed should keep price changes approval-gated');
assert.ok(seededPricingDecision?.directCommandAliases?.includes('pricing decision'), 'default Pricing Decision Console app seed should expose direct command aliases outside chat code');
assert.ok(!initial.apps.some((item) => item.id === 'delivery-manager'), 'Deliveries should not be seeded as an app');
const contextRecord = createAppContextRecord({
  source_app: 'x-client-ops',
  title: 'X action packet',
  summary: 'Approved post draft and strategy context.',
  facts: ['draft ready'],
  artifacts: [{ type: 'post_text', content: 'Approved draft.' }],
  approval_requests: [{ action: 'post_now', status: 'needs approval' }],
  recommended_next_actions: ['Review retained X action packet in chat.']
}, { login: 'publisher' }, { id: 'ctx-test', accessToken: 'ctx_secret' });
await storage.mutate(async (draft) => {
  draft.apps.unshift(app);
  draft.appContexts.unshift(contextRecord);
});
const after = await storage.getState();
assert.ok(after.apps.some((item) => item.id === app.id), 'custom app should persist in storage state');
assert.ok(after.appContexts.some((item) => item.id === 'ctx-test'), 'app context should persist in storage state');
assert.equal(publicAppContext(contextRecord).app_context_token, undefined, 'public app context must not expose token');
const publicContextWithoutPayload = publicAppContext(contextRecord, { includePayload: false });
assert.equal(publicContextWithoutPayload.context, undefined, 'public app context list rows should not expose packet bodies');
assert.equal(publicContextWithoutPayload.operational_summary.artifacts, 1, 'public app context list rows should expose safe artifact counts');
assert.equal(publicContextWithoutPayload.operational_summary.approval_requests, 1, 'public app context list rows should expose safe approval counts');
assert.equal(publicContextWithoutPayload.operational_summary.recommended_next_actions, 1, 'public app context list rows should expose safe next-action counts');
assert.equal(publicContextWithoutPayload.operational_summary.anchors_total >= 4, true, 'public app context list rows should show retained operational anchors');

const server = readFileSync(new URL('../server.js', import.meta.url), 'utf8');
const worker = readFileSync(new URL('../worker.js', import.meta.url), 'utf8');
const snapshotSource = readFileSync(new URL('../lib/snapshot.js', import.meta.url), 'utf8');
const chat = readFileSync(new URL('../public/chat.js', import.meta.url), 'utf8');
const cli = readFileSync(new URL('../scripts/external-chat.mjs', import.meta.url), 'utf8');
const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');
const cliHelp = readFileSync(new URL('../public/cli-help.html', import.meta.url), 'utf8');

const sourceExposesApiRoute = (source, routeKey) => {
  const route = API_ROUTES[routeKey];
  return Boolean(
    route
    && (
      source.includes(route)
      || source.includes(`API_ROUTES.${routeKey}`)
      || source.includes(`'${routeKey}'`)
      || source.includes(`"${routeKey}"`)
    )
  );
};

assert.ok(server.includes("import worker from './worker.js'"), 'Node server should delegate app APIs to the Worker implementation');
assert.ok(server.includes('worker.fetch('), 'Node server should route app API requests through worker.fetch');
assert.ok(!server.includes('handleRegisterApp'), 'Node server should not duplicate app registration handlers');
assert.ok(!server.includes('handleAppHandoff'), 'Node server should not duplicate app handoff handlers');
assert.ok(!server.includes('handleCreateAppContext'), 'Node server should not duplicate app context handlers');

for (const source of [worker]) {
  assert.ok(source.includes('/api/apps'), 'Worker should expose /api/apps');
  assert.ok(source.includes('/api/apps/import-manifest'), 'Worker should expose app manifest import');
  assert.ok(source.includes('/api/apps/import-url'), 'Worker should expose app URL import');
  assert.ok(sourceExposesApiRoute(source, 'APP_CONTEXTS'), 'Worker should expose generic app context API');
  assert.ok(source.includes('/.well-known/mcp.json'), 'Worker should expose MCP discovery metadata');
  assert.ok(source.includes('/mcp'), 'Worker should expose an MCP JSON-RPC endpoint');
  assert.ok(source.includes('handleMcpRequest'), 'Worker should handle MCP JSON-RPC requests');
  assert.ok(source.includes('/api/apps\\/[^/]+\\/handoff') || source.includes('/api\\/apps\\/[^/]+\\/handoff'), 'Worker should expose app handoff proxy');
  assert.ok(source.includes('handleRegisterApp'), 'Worker should register apps');
  assert.ok(source.includes('handleAppHandoff'), 'Worker should proxy app handoff payloads');
  assert.ok(source.includes('handleCreateAppContext'), 'Worker should accept app context payloads');
  assert.ok(source.includes('handleVerifyApp'), 'Worker should verify apps');
  assert.ok(snapshotSource.includes('apps:') && snapshotSource.includes('publicApp(app)'), 'Snapshots should include public app catalog rows.');
}

assert.ok(chat.includes('registeredApps: []'), 'chat state should include registered apps');
assert.ok(chat.includes("api(catalogApiPath('/api/apps', options)"), 'chat should refresh registered apps with paged catalog API');
assert.ok(chat.includes('appManifestSources'), 'chat should merge CAIt-managed and registered apps');
assert.ok(chat.includes('/api/apps/${encodeURIComponent(manifest.id || appId)}/handoff'), 'chat should call the same-origin app handoff proxy');

assert.ok(cli.includes('runAppCli'), 'CLI should expose app commands');
assert.ok(cli.includes('/api/apps/import-manifest'), 'CLI should import app manifests');
assert.ok(cli.includes('app register'), 'CLI usage should mention app register');
assert.ok(cli.includes('/api/app-contexts'), 'CLI should create and read server-side app contexts');
assert.ok(cli.includes('context-create'), 'CLI usage should mention app context creation');

assert.ok(readme.includes('/api/apps/import-manifest'), 'README should document app manifest import');
assert.ok(readme.includes('App registration with CAIt API key'), 'README should document app registration');
assert.ok(readme.includes('App context handoff'), 'README should document server-side app context handoff');
assert.ok(readme.includes('/api/app-contexts'), 'README should document the app context API');
assert.ok(cliHelp.includes('/api/apps/import-manifest'), 'CLI help page should document app manifest import');
assert.ok(cliHelp.includes('/api/app-contexts'), 'CLI help page should document app context API');
assert.ok(cliHelp.includes('APP CONTEXT HANDOFF'), 'CLI help page should document app context handoff');

console.log('app registration qa passed');
