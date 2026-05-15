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
assert.ok(!initial.apps.some((item) => item.id === 'delivery-manager'), 'Deliveries should not be seeded as an app');
const contextRecord = createAppContextRecord({
  source_app: 'x-client-ops',
  title: 'X action packet',
  summary: 'Approved post draft and strategy context.',
  facts: ['draft ready']
}, { login: 'publisher' }, { id: 'ctx-test', accessToken: 'ctx_secret' });
await storage.mutate(async (draft) => {
  draft.apps.unshift(app);
  draft.appContexts.unshift(contextRecord);
});
const after = await storage.getState();
assert.ok(after.apps.some((item) => item.id === app.id), 'custom app should persist in storage state');
assert.ok(after.appContexts.some((item) => item.id === 'ctx-test'), 'app context should persist in storage state');
assert.equal(publicAppContext(contextRecord).app_context_token, undefined, 'public app context must not expose token');

const server = readFileSync(new URL('../server.js', import.meta.url), 'utf8');
const worker = readFileSync(new URL('../worker.js', import.meta.url), 'utf8');
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
  assert.ok(source.includes('apps:'), 'Worker should include apps in snapshots');
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
