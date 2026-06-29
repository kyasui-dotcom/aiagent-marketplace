import assert from 'node:assert/strict';
import {
  authenticateOrderApiKey,
  createOrderApiKeyInState,
  revokeOrderApiKeyInState,
  sanitizeAccountSettingsForClient,
  touchOrderApiKeyUsageInState
} from '../lib/shared.js';
import { createD1LikeStorage } from '../lib/storage.js';
import { createAuthStatusRouteHandlers } from '../lib/routes/auth-status.js';
import { createApiKeyRouteHandlers } from '../lib/routes/api-keys.js';
import { parseApiKeyArgs, runApiKeyCli } from './api-key.mjs';

const state = { agents: [], jobs: [], events: [], accounts: [] };

assert.throws(
  () => createOrderApiKeyInState(
    state,
    'missing-title',
    { login: 'missing-title', name: 'Missing Title' },
    'email',
    { label: '   ' }
  ),
  /API key title is required/
);
assert.equal(state.accounts.length, 0, 'blank API key titles should not create or mutate accounts');

const created = createOrderApiKeyInState(
  state,
  'alice',
  { login: 'alice', name: 'Alice Example', email: 'alice@example.com' },
  'github-app',
  { label: 'codex-desktop' }
);

const createdTest = createOrderApiKeyInState(
  state,
  'alice',
  { login: 'alice', name: 'Alice Example', email: 'alice@example.com' },
  'github-app',
  { label: 'codex-test', mode: 'test' }
);

assert.equal(created.account.login, 'alice');
assert.equal(created.apiKey.label, 'codex-desktop');
assert.ok(created.apiKey.token.startsWith('ai2k_'));
assert.equal(created.apiKey.mode, 'live');
assert.deepEqual(created.apiKey.scopes, ['order:create', 'order:read', 'agent:create', 'agent:write', 'agent:read']);
assert.equal(createdTest.apiKey.mode, 'test');
assert.ok(createdTest.apiKey.token.startsWith('ai2kt_'));

const auth = authenticateOrderApiKey(state, created.apiKey.token);
assert.ok(auth);
assert.equal(auth.account.login, 'alice');
assert.equal(auth.apiKey.label, 'codex-desktop');
assert.equal(auth.apiKey.active, true);
assert.equal(auth.apiKey.mode, 'live');
assert.ok(auth.apiKey.scopes.includes('agent:write'));

const authTest = authenticateOrderApiKey(state, createdTest.apiKey.token);
assert.ok(authTest);
assert.equal(authTest.apiKey.mode, 'test');

state.accounts[0].deletedAt = new Date().toISOString();
assert.equal(
  authenticateOrderApiKey(state, created.apiKey.token),
  null,
  'deleted accounts must not authenticate via retained API keys'
);
delete state.accounts[0].deletedAt;

const touched = touchOrderApiKeyUsageInState(state, 'alice', auth.apiKey.id, {
  lastUsedPath: '/api/agents/import-manifest',
  lastUsedMethod: 'POST'
});
assert.ok(touched);
assert.equal(touched.apiKey.lastUsedPath, '/api/agents/import-manifest');
assert.equal(touched.apiKey.lastUsedMethod, 'POST');
assert.ok(touched.apiKey.lastUsedAt);
assert.ok(
  authenticateOrderApiKey(state, created.apiKey.token),
  'touching API key usage must preserve the key hash'
);

const sanitized = sanitizeAccountSettingsForClient(state.accounts[0]);
assert.ok(Array.isArray(sanitized.apiAccess.orderKeys));
assert.equal('agentKeys' in sanitized.apiAccess, false);
assert.equal('keyHash' in sanitized.apiAccess.orderKeys[0], false);
assert.equal(sanitized.apiAccess.orderKeys[0].label, 'codex-test');
assert.equal(sanitized.apiAccess.orderKeys[0].mode, 'test');
assert.ok(sanitized.apiAccess.orderKeys[0].scopes.includes('agent:write'));

const revoked = revokeOrderApiKeyInState(state, 'alice', auth.apiKey.id, { login: 'alice', name: 'Alice Example' }, 'github-app');
assert.ok(revoked);
assert.equal(revoked.apiKey.active, false);
assert.ok(revoked.apiKey.revokedAt);
assert.equal(authenticateOrderApiKey(state, created.apiKey.token), null);

const storage = createD1LikeStorage(null, { allowInMemory: true, stateCacheTtlMs: 0 });
await storage.replaceState({ agents: [], jobs: [], events: [], accounts: [] });
let persistedToken = '';
await storage.mutate(async (draft) => {
  const issued = createOrderApiKeyInState(
    draft,
    'bob',
    { login: 'bob', name: 'Bob Example', email: 'bob@example.com' },
    'email',
    { label: 'stale-merge-guard' }
  );
  persistedToken = issued.apiKey.token;
});
const persistedState = await storage.getState();
assert.ok(authenticateOrderApiKey(persistedState, persistedToken), 'persisted key should authenticate before stale merge');
const staleSanitizedAccount = sanitizeAccountSettingsForClient(persistedState.accounts[0]);
staleSanitizedAccount.updatedAt = new Date(Date.now() + 60_000).toISOString();
await storage.mutate(async (draft) => {
  draft.accounts = [staleSanitizedAccount];
});
const afterStaleMerge = await storage.getState();
assert.ok(
  authenticateOrderApiKey(afterStaleMerge, persistedToken),
  'stale sanitized account writes must not erase API key hashes'
);
await storage.mutate(async (draft) => {
  draft.accounts[0].deletedAt = new Date().toISOString();
});
assert.equal(
  await storage.authenticateOrderApiKey(persistedToken),
  null,
  'deleted persisted accounts must not authenticate through indexed API keys'
);

const routeStorage = createD1LikeStorage(null, { allowInMemory: true, stateCacheTtlMs: 0 });
await routeStorage.replaceState({ agents: [], jobs: [], events: [], accounts: [] });
const apiKeyRoutes = createApiKeyRouteHandlers({
  currentUserContext: async () => ({
    user: { login: 'event-failure-user', name: 'Event Failure User', email: 'event-failure-user@example.com' },
    login: 'event-failure-user',
    authProvider: 'email'
  }),
  parseBody: async () => ({ label: 'event-write-failure', mode: 'live' }),
  runtimePolicy: () => ({ developerApiEnabled: true, releaseStage: 'development' }),
  logError: () => {},
  touchEvent: async () => {
    throw new Error('event write failed');
  }
});
const routeCreateResult = await apiKeyRoutes.createOrderApiKey(routeStorage, new Request('https://example.test/api/settings/api-keys', {
  method: 'POST',
  body: JSON.stringify({ label: 'event-write-failure' })
}), {});
assert.equal(routeCreateResult.ok, true, 'API key creation should not fail when event logging fails');
assert.ok(routeCreateResult.apiKey?.token?.startsWith('ai2k_'));

let heavyCurrentUserContextCalls = 0;
const lightweightRouteStorage = createD1LikeStorage(null, { allowInMemory: true, stateCacheTtlMs: 0 });
await lightweightRouteStorage.replaceState({ agents: [], jobs: [], events: [], accounts: [] });
const lightweightRoutes = createApiKeyRouteHandlers({
  accountSettingsForLogin: (stateArg, login, user, authProvider) => sanitizeAccountSettingsForClient(
    createOrderApiKeyInState({ accounts: [] }, login, user, authProvider, { label: 'unused-default' }).account
  ),
  currentUserContext: async () => {
    heavyCurrentUserContextCalls += 1;
    throw new Error('heavy currentUserContext should not run');
  },
  getSession: async () => ({
    user: { login: 'light-api-key-user', name: 'Light API Key User' },
    accountLogin: 'light-api-key-user',
    authProvider: 'email'
  }),
  lightweightCurrentFromSession: (session) => ({
    session,
    user: session.user,
    login: session.accountLogin,
    authProvider: session.authProvider
  }),
  parseBody: async () => ({ label: 'lightweight-route-key', mode: 'live' }),
  runtimePolicy: () => ({ developerApiEnabled: true, releaseStage: 'development' }),
  touchEvent: async () => {}
});
const lightweightCreateResult = await lightweightRoutes.createOrderApiKey(lightweightRouteStorage, new Request('https://example.test/api/settings/api-keys', {
  method: 'POST',
  body: JSON.stringify({ label: 'lightweight-route-key' })
}), {});
assert.equal(lightweightCreateResult.ok, true, 'API key creation should use lightweight session context');
assert.equal(heavyCurrentUserContextCalls, 0, 'API key user routes should not call heavy currentUserContext');

const authStatusRoutes = createAuthStatusRouteHandlers({
  accountHasGithubConnector: () => false,
  accountHasGoogleConnector: () => false,
  accountHasXConnector: () => false,
  accountIdentityForProvider: () => null,
  baseUrl: () => 'https://example.test',
  canReviewAgents: () => false,
  canReviewFeedbackReports: () => false,
  canViewAdminDashboard: () => false,
  csrfTokenForRequest: async () => 'csrf-lightweight',
  getSession: async () => ({
    user: { login: 'slow-account-user', name: 'Slow Account User' },
    accountLogin: 'slow-account-user',
    authProvider: 'email'
  }),
  githubAppConfigured: () => false,
  githubAppInstallationsFromSession: () => [],
  githubAppReposFromSession: () => [],
  githubClientId: () => '',
  githubClientSecret: () => '',
  githubGrantedScopes: () => [],
  githubOAuthScope: () => 'read:user',
  githubPrivateRepoImportEnabled: () => false,
  googleConfigured: () => false,
  googleConnectorForAccount: () => null,
  googleConnectorScopeSet: () => new Set(),
  googleOAuthCapabilitiesFromGroups: (groups) => groups,
  identityLoginsForCurrent: (current) => [current.login].filter(Boolean),
  lightweightCurrentFromSession: (session) => ({
    session,
    user: session.user,
    login: session.accountLogin,
    authProvider: session.authProvider
  }),
  missingGoogleScopeGroups: () => [],
  requestOrigin: () => 'https://example.test',
  resendConfigured: () => false,
  runtimePolicy: () => ({
    releaseStage: 'development',
    openWriteApiEnabled: false,
    guestRunReadEnabled: true,
    devApiEnabled: true,
    developerApiEnabled: true,
    cliEnabled: true,
    mcpEnabled: true,
    developerSurfacesPaused: false,
    exposeJobSecrets: true,
    billingPaused: true,
    billingActivationEnabled: false
  }),
  runtimeStorage: () => ({
    getAccountByLogin: () => new Promise(() => {})
  }),
  sessionHasGithubApp: () => false,
  sessionHasGithubOauth: () => false,
  xOAuthConfigured: () => false,
  xOAuthScopeLabel: () => 'tweet.read users.read',
  xTokenEncryptionConfigured: () => false
});
const slowAccountStartedAt = Date.now();
const slowAccountStatus = await authStatusRoutes.authStatus(new Request('https://example.test/auth/status'), {});
assert.equal(slowAccountStatus.loggedIn, true, 'auth status should return logged-in state without waiting indefinitely for account lookup');
assert.equal(slowAccountStatus.csrfToken, 'csrf-lightweight');
assert.ok(Date.now() - slowAccountStartedAt < 2000, 'auth status account lookup should time out quickly');

const parsedUserCli = parseApiKeyArgs(['create', '--label', 'codex-desktop', '--cookie', 'aiagent2_session=abc', '--export']);
assert.equal(parsedUserCli.command, 'create');
assert.equal(parsedUserCli.label, 'codex-desktop');
assert.equal(parsedUserCli.sessionCookie, 'aiagent2_session=abc');
assert.equal(parsedUserCli.printExport, true);

const parsedOperatorCli = parseApiKeyArgs(['create', '--login', 'user@example.com', '--admin-token', 'operator-secret', '--label', 'operator-cli', '--mode', 'live']);
assert.equal(parsedOperatorCli.login, 'user@example.com');
assert.equal(parsedOperatorCli.adminToken, 'operator-secret');
assert.equal(parsedOperatorCli.label, 'operator-cli');
assert.equal(parsedOperatorCli.mode, 'live');

const originalCaitKeyLabel = process.env.CAIT_KEY_LABEL;
delete process.env.CAIT_KEY_LABEL;
try {
  const parsedNoLabelCli = parseApiKeyArgs(['create', '--cookie', 'aiagent2_session=abc']);
  assert.equal(parsedNoLabelCli.label, '');
  await assert.rejects(
    () => runApiKeyCli(['create', '--cookie', 'aiagent2_session=abc']),
    /--label is required/
  );
} finally {
  if (originalCaitKeyLabel === undefined) delete process.env.CAIT_KEY_LABEL;
  else process.env.CAIT_KEY_LABEL = originalCaitKeyLabel;
}

console.log('api keys qa passed');
