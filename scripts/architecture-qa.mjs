import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { API_ROUTE_MANIFEST, API_ROUTE_METHODS, API_ROUTES, apiRouteManifestForRuntime, apiRouteMatches } from '../lib/api-routes.js';
import { csrfExemptPath, rateLimitSpecForPath } from '../lib/http-policy.js';
import { STORAGE_SCHEMA_SQL } from '../lib/storage.js';
import {
  buildReportNextOrderBody,
  buildDeliveryPublishOrderBody,
  deliveryExecutorActionPayload,
  hasDeliveryExecutionConfirmation,
  hasDeliveryScheduleConfirmation,
  normalizeDeliveryExecuteFailureResponse,
  normalizeDeliveryExecuteResponse,
  prepareDeliveryExecutionResponsePayload,
  prepareDeliveryPublishResponsePayload
} from '../public/delivery-action-contract.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => readFileSync(path.join(root, file), 'utf8');

const workerSource = read('worker.js');
const serverSource = read('server.js');
const storageSource = read('lib/storage.js');
const sharedSource = read('lib/shared.js');
const xConnectorSource = read('lib/x-connector.js');
const exactActionsSource = read('lib/exact-actions.js');
const externalWriteConfirmationSource = read('lib/external-write-confirmation.js');
const httpPolicySource = read('lib/http-policy.js');
const chatSource = read('public/chat.js');
const deliveryActionContractSource = read('public/delivery-action-contract.js');
const appContextSource = read('lib/app-context.js');
const migrationSource = read('migrations/0001_init.sql');

function apiRoutesFromSource(source = '') {
  const routes = new Set();
  for (const pattern of [
    /url\.pathname\s*===\s*['"]([^'"]+)['"]/g,
    /url\.pathname\.startsWith\(\s*['"]([^'"]+)['"]\s*\)/g
  ]) {
    let match;
    while ((match = pattern.exec(source))) {
      const route = String(match[1] || '').trim();
      if (!route.startsWith('/api/')) continue;
      if (route === '/api/') continue;
      routes.add(route);
    }
  }
  for (const route of API_ROUTE_MANIFEST) {
    if (source.includes(`API_ROUTES.${route.key}`)) routes.add(route.path);
  }
  const matcherPattern = /apiRouteMatches\(([^)]*)\)/g;
  let matcher;
  while ((matcher = matcherPattern.exec(source))) {
    const routeKeyMatch = String(matcher[1] || '').match(/['"]([A-Z0-9_]+)['"]/);
    const route = API_ROUTES[String(routeKeyMatch?.[1] || '').trim()];
    if (route) routes.add(route);
  }
  return routes;
}

function escapeRegExp(value = '') {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hasMethodAwareRouteMatcher(source = '', routeKey = '', method = '') {
  const pattern = new RegExp(
    `apiRouteMatches\\([^)]*['"]${escapeRegExp(routeKey)}['"]\\s*,\\s*['"]${escapeRegExp(method)}['"][^)]*\\)`
  );
  return pattern.test(source);
}

function hasApiRouteRateLimit(source = '', routeKey = '', method = '') {
  const pattern = new RegExp(
    `pathname\\s*===\\s*API_ROUTES\\.${escapeRegExp(routeKey)}\\s*&&\\s*verb\\s*===\\s*['"]${escapeRegExp(method)}['"]`
  );
  return pattern.test(source);
}

function sorted(values) {
  return [...values].sort((a, b) => a.localeCompare(b));
}

function difference(left, right) {
  return sorted([...left].filter((item) => !right.has(item)));
}

function parseCreateTables(sql = '') {
  const tables = new Map();
  const pattern = /CREATE TABLE IF NOT EXISTS\s+([A-Za-z0-9_]+)\s*\(([\s\S]*?)\);/g;
  let match;
  while ((match = pattern.exec(sql))) {
    const tableName = String(match[1] || '').trim();
    const body = String(match[2] || '');
    const columns = body
      .split('\n')
      .map((line) => line.trim().replace(/,$/, ''))
      .filter(Boolean)
      .filter((line) => !/^(?:PRIMARY|FOREIGN|UNIQUE|CHECK|CONSTRAINT)\b/i.test(line))
      .map((line) => line.split(/\s+/)[0].replace(/^["'`]|["'`]$/g, ''))
      .filter(Boolean);
    tables.set(tableName, new Set(columns));
  }
  return tables;
}

function parseIndexNames(sql = '') {
  const indexes = new Set();
  const pattern = /CREATE INDEX IF NOT EXISTS\s+([A-Za-z0-9_]+)/g;
  let match;
  while ((match = pattern.exec(sql))) indexes.add(String(match[1] || '').trim());
  return indexes;
}

assert.equal(new Set(Object.values(API_ROUTES)).size, Object.values(API_ROUTES).length, 'API route constants should be unique');
assert.equal(new Set(API_ROUTE_MANIFEST.map((route) => route.key)).size, API_ROUTE_MANIFEST.length, 'API route manifest keys should be unique');
assert.deepEqual(
  sorted(Object.keys(API_ROUTES)),
  sorted(API_ROUTE_MANIFEST.map((route) => route.key)),
  'Every API route constant should be present in the route manifest'
);
assert.equal(
  apiRouteMatches('/api/app-contexts/context-1', 'GET', 'APP_CONTEXT_DETAIL', 'GET'),
  true,
  'API route matcher should support app context detail path templates'
);
assert.equal(
  apiRouteMatches('/api/app-contexts', 'GET', 'APP_CONTEXT_DETAIL', 'GET'),
  false,
  'API route matcher should not match detail templates against collection paths'
);
assert.equal(
  apiRouteMatches('/api/app-contexts/context-1/extra', 'GET', 'APP_CONTEXT_DETAIL', 'GET'),
  false,
  'API route matcher should not match extra path segments'
);
assert.deepEqual(
  rateLimitSpecForPath(API_ROUTES.CONNECTORS_X_POST, 'POST'),
  { name: 'x-post', limit: 20, windowMs: 10 * 60_000 },
  'HTTP policy should rate-limit exact X posting through shared route constants'
);
assert.deepEqual(
  rateLimitSpecForPath(API_ROUTES.GITHUB_CREATE_ADAPTER_PR, 'POST'),
  { name: 'github-adapter-pr', limit: 20, windowMs: 10 * 60_000 },
  'HTTP policy should rate-limit adapter PR writes'
);
assert.deepEqual(
  rateLimitSpecForPath('/auth/status', 'GET'),
  { name: 'auth-status', limit: 600, windowMs: 60_000 },
  'HTTP policy should keep lightweight session checks out of the lower OAuth action bucket'
);
assert.equal(csrfExemptPath(API_ROUTES.STRIPE_WEBHOOK), true, 'HTTP policy should own Stripe webhook CSRF exemption');
assert.equal(hasDeliveryExecutionConfirmation({ confirm_execute: true }), true, 'Delivery action contract should accept snake_case execution confirmation');
assert.equal(hasDeliveryScheduleConfirmation({ confirmSchedule: true }), true, 'Delivery action contract should accept camelCase schedule confirmation');
assert.deepEqual(
  deliveryExecutorActionPayload({
    action_kind: 'x_post',
    draft: { postText: 'Approved post', approvedXUsername: '@cait' },
    approved_text: 'Approved post'
  }),
  {
    kind: 'x_post',
    text: 'Approved post',
    approvedXUsername: '@cait',
    approvedXUserId: '',
    approvedText: 'Approved post'
  },
  'Delivery executor action payload should preserve exact X approval context'
);
assert.match(
  buildReportNextOrderBody(
    { id: 'job_1', taskType: 'research', budgetCap: 250, deadlineSec: 90 },
    { title: 'Analytics report' },
    { nextStep: 'execution_order', googleGa4Property: 'properties/1234' }
  ).prompt,
  /Use GA4 property: properties\/1234/,
  'Delivery report follow-up body should preserve source context in the shared contract'
);
assert.equal(
  normalizeDeliveryExecuteResponse({ connector_action: 'x_post', account_handle: '@cait', account_id: 'x-1' }, 'x_post').entity.account_handle,
  '@cait',
  'Delivery execute response should preserve connector account handle in both runtimes'
);
assert.equal(
  normalizeDeliveryExecuteFailureResponse({ code: 'confirmation_required', needs_confirmation: true, required: 'confirm_execute=true' }).error_kind,
  'confirmation_required',
  'Delivery execute failure response should preserve confirmation-required errors'
);
assert.equal(
  prepareDeliveryExecutionResponsePayload('email_pack', { title: 'Hello', content: 'Body' }, { current: { isPlatformAdmin: true } }).draft_defaults.target,
  'cait_resend',
  'Delivery execution prepare payload should centralize platform admin email defaults'
);
assert.equal(
  prepareDeliveryPublishResponsePayload({ suggested_slug: 'launch-post' }, { githubReady: true }).draft_defaults.target,
  'github_repo',
  'Delivery publish prepare payload should centralize GitHub-ready defaults'
);
assert.equal(
  buildDeliveryPublishOrderBody({ id: 'job_1', taskType: 'writing' }, { title: 'Launch', draft: { pathPrefix: '/blog', slug: 'launch' } }).path_preview,
  '/blog/launch',
  'Delivery publish order body should centralize publish path normalization'
);

const workerRoutes = apiRoutesFromSource(workerSource);
const serverRoutes = apiRoutesFromSource(serverSource);
const workerManifestRoutes = new Set(apiRouteManifestForRuntime('worker').map((route) => route.path));
const serverDelegatesToWorker = serverSource.includes("import worker from './worker.js'")
  && serverSource.includes('worker.fetch(');
assert.deepEqual(difference(workerManifestRoutes, workerRoutes), [], 'Worker is missing routes declared in API_ROUTE_MANIFEST');
assert.deepEqual(difference(workerRoutes, workerManifestRoutes), [], 'Worker has routes not declared in API_ROUTE_MANIFEST');
assert.ok(serverDelegatesToWorker, 'Node server should delegate HTTP handling to worker.fetch instead of duplicating API routes');
assert.deepEqual([...serverRoutes], [], 'Node server should not keep a second API route implementation');

const workerOnlyAllowed = new Set(apiRouteManifestForRuntime('worker')
  .filter((route) => !route.runtimes.includes('server'))
  .map((route) => route.path));
assert.equal(workerOnlyAllowed.size, 2, 'Only documented worker-only internal routes should remain outside the public Node adapter path');

for (const route of [
  API_ROUTES.ADMIN_API_KEYS,
  API_ROUTES.SETTINGS_EXACT_ACTIONS,
  API_ROUTES.CONNECTORS_X_POST,
  API_ROUTES.DELIVERIES_EXECUTE,
  API_ROUTES.DELIVERIES_SCHEDULE,
  API_ROUTES.DELIVERY_ITEMS,
  API_ROUTES.APP_CONTEXTS
]) {
  assert.ok(workerRoutes.has(route), `Worker should expose ${route}`);
}

const methodAwareRouteKeys = [
  'ADMIN_API_KEYS',
  'SETTINGS_EXACT_ACTIONS',
  'CONNECTORS_X_STATUS',
  'CONNECTORS_X_POST',
  'CONNECTORS_INSTAGRAM_POST',
  'CONNECTORS_GOOGLE_SEND_GMAIL',
  'CONNECTORS_RESEND_SEND_EMAIL',
  'GITHUB_CREATE_ADAPTER_PR',
  'GITHUB_CREATE_EXECUTOR_PR',
  'DELIVERIES_EXECUTE',
  'DELIVERIES_SCHEDULE',
  'DELIVERY_ITEMS',
  'APP_CONTEXTS',
  'APP_CONTEXT_DETAIL'
];

for (const routeKey of methodAwareRouteKeys) {
  for (const method of API_ROUTE_METHODS[routeKey] || []) {
    assert.ok(
      hasMethodAwareRouteMatcher(workerSource, routeKey, method),
      `Worker should route ${routeKey} ${method} through apiRouteMatches`
    );
  }
}

for (const routeKey of [
  'CONNECTORS_X_POST',
  'CONNECTORS_INSTAGRAM_POST',
  'CONNECTORS_GOOGLE_SEND_GMAIL',
  'CONNECTORS_RESEND_SEND_EMAIL',
  'GITHUB_CREATE_ADAPTER_PR',
  'GITHUB_CREATE_EXECUTOR_PR',
  'DELIVERIES_EXECUTE',
  'DELIVERIES_SCHEDULE'
]) {
  assert.ok(hasApiRouteRateLimit(httpPolicySource, routeKey, 'POST'), `Shared HTTP policy should rate-limit external write route ${routeKey} through API_ROUTES`);
}

for (const [name, source] of [
  ['worker', workerSource]
]) {
  assert.ok(source.includes("from './lib/http-policy.js'"), `${name} runtime should use shared HTTP policy helpers`);
  assert.ok(!source.includes('function rateLimitSpecForPath'), `${name} runtime should not duplicate rate-limit policy locally`);
  assert.ok(!source.includes('function csrfExemptPath'), `${name} runtime should not duplicate CSRF exempt policy locally`);
  assert.ok(source.includes("from './lib/external-write-confirmation.js'"), `${name} runtime should use shared external write confirmation helpers`);
  assert.ok(!/body\.confirm(?:_post|Post|_send|Send|_repo_write|RepoWrite|_adapter_pr|AdapterPr)\b/.test(source), `${name} runtime should not parse external write confirmation booleans inline`);
  assert.ok(source.includes("from './lib/x-connector.js'"), `${name} runtime should use shared X connector helpers`);
  assert.ok(source.includes('validateXPostExecutionApproval'), `${name} runtime should validate exact X posting approval`);
  assert.ok(!source.includes('function validateXPostExecutionApproval'), `${name} runtime should not duplicate X approval logic locally`);
  assert.ok(source.includes('hasDeliveryExecutionConfirmation'), `${name} runtime should keep delivery execution confirmations`);
  assert.ok(source.includes('hasDeliveryScheduleConfirmation'), `${name} runtime should keep delivery schedule confirmations`);
  assert.ok(!source.includes('function hasDeliveryExecutionConfirmation'), `${name} runtime should not duplicate delivery execution confirmation logic locally`);
  assert.ok(!source.includes('function hasDeliveryScheduleConfirmation'), `${name} runtime should not duplicate delivery schedule confirmation logic locally`);
  assert.ok(source.includes('deliveryExecutorActionPayload'), `${name} runtime should use shared delivery executor action payloads`);
  assert.ok(!source.includes('function deliveryExecutorActionPayload'), `${name} runtime should not duplicate delivery executor action payload mapping locally`);
  assert.ok(source.includes('buildReportNextOrderBody'), `${name} runtime should use the shared report follow-up order body builder`);
  assert.ok(!source.includes('function buildReportNextOrderBody'), `${name} runtime should not duplicate report follow-up order body building locally`);
  assert.ok(source.includes('normalizeDeliveryExecuteResponse'), `${name} runtime should use shared delivery execute response normalization`);
  assert.ok(!source.includes('function normalizeDeliveryExecuteResponse'), `${name} runtime should not duplicate delivery execute response normalization locally`);
  assert.ok(!source.includes('function normalizeDeliveryScheduleResponse'), `${name} runtime should not duplicate delivery schedule response normalization locally`);
  assert.ok(!source.includes('function normalizeDeliveryExecuteFailureResponse'), `${name} runtime should not duplicate delivery execute failure normalization locally`);
  assert.ok(!source.includes('function normalizeDeliveryScheduleFailureResponse'), `${name} runtime should not duplicate delivery schedule failure normalization locally`);
  assert.ok(source.includes('prepareDeliveryExecutionResponsePayload'), `${name} runtime should use shared delivery execution prepare payloads`);
  assert.ok(source.includes('prepareDeliveryPublishResponsePayload'), `${name} runtime should use shared delivery publish prepare payloads`);
  assert.ok(source.includes('buildDeliveryPublishOrderBody'), `${name} runtime should use shared delivery publish order body building`);
  assert.ok(!source.includes('deliveryDraftDefaultsForType'), `${name} runtime should not build delivery draft defaults locally`);
  assert.ok(!source.includes('prepareDeliveryExecutionContractPayload'), `${name} runtime should not assemble delivery execution contract payloads locally`);
  assert.ok(!source.includes('prepareDeliveryPublishContractPayload'), `${name} runtime should not assemble delivery publish contract payloads locally`);
  assert.ok(!source.includes('deliveryPublishTargetInstruction'), `${name} runtime should not build delivery publish prompts locally`);
  assert.ok(source.includes('confirm_post'), `${name} runtime should require explicit X post confirmation`);
  assert.ok(source.includes('confirm_send'), `${name} runtime should require explicit email send confirmation`);
  assert.ok(source.includes('confirm_repo_write'), `${name} runtime should require explicit repository write confirmation`);
}
assert.ok(!serverSource.includes('apiRouteMatches('), 'Node server should not keep method-aware route matching locally');
assert.ok(!serverSource.includes("from './lib/http-policy.js'"), 'Node server should not import shared HTTP policy because worker.fetch owns it');
assert.ok(!serverSource.includes("from './lib/external-write-confirmation.js'"), 'Node server should not import external write confirmation helpers because worker.fetch owns them');
assert.ok(!serverSource.includes("from './lib/x-connector.js'"), 'Node server should not import connector handlers because worker.fetch owns them');
assert.ok(!serverSource.includes('handleXConnectorPost'), 'Node server should not keep connector route handlers locally');
assert.ok(!serverSource.includes('handleCreateWorkflowJob'), 'Node server should not keep job flow handlers locally');
assert.ok(deliveryActionContractSource.includes('export function hasDeliveryExecutionConfirmation'), 'Delivery action contract should own execution confirmation parsing');
assert.ok(deliveryActionContractSource.includes('export function hasDeliveryScheduleConfirmation'), 'Delivery action contract should own schedule confirmation parsing');
assert.ok(deliveryActionContractSource.includes('export function deliveryExecutorActionPayload'), 'Delivery action contract should own executor action payload mapping');
assert.ok(deliveryActionContractSource.includes('export function buildReportNextOrderBody'), 'Delivery action contract should own report follow-up body building');
assert.ok(deliveryActionContractSource.includes('export function normalizeDeliveryExecuteResponse'), 'Delivery action contract should own execute response normalization');
assert.ok(deliveryActionContractSource.includes('export function normalizeDeliveryScheduleResponse'), 'Delivery action contract should own schedule response normalization');
assert.ok(deliveryActionContractSource.includes('export function normalizeDeliveryExecuteFailureResponse'), 'Delivery action contract should own execute failure response normalization');
assert.ok(deliveryActionContractSource.includes('export function normalizeDeliveryScheduleFailureResponse'), 'Delivery action contract should own schedule failure response normalization');
assert.ok(deliveryActionContractSource.includes('export function prepareDeliveryExecutionResponsePayload'), 'Delivery action contract should own delivery execution prepare payloads');
assert.ok(deliveryActionContractSource.includes('export function prepareDeliveryPublishResponsePayload'), 'Delivery action contract should own delivery publish prepare payloads');
assert.ok(deliveryActionContractSource.includes('export function buildDeliveryPublishOrderBody'), 'Delivery action contract should own delivery publish order body building');
assert.ok(deliveryActionContractSource.includes('approved_x_username'), 'Delivery action contract should preserve approved X account identity for delivery execution');
assert.ok(deliveryActionContractSource.includes('approved_text'), 'Delivery action contract should preserve exact approved X post text for delivery execution');
assert.ok(externalWriteConfirmationSource.includes('export function hasPostConfirmation'), 'Shared external write helper should own post confirmation parsing');
assert.ok(externalWriteConfirmationSource.includes('export function hasSendConfirmation'), 'Shared external write helper should own send confirmation parsing');
assert.ok(externalWriteConfirmationSource.includes('export function hasRepoWriteConfirmation'), 'Shared external write helper should own repository write confirmation parsing');
assert.ok(externalWriteConfirmationSource.includes('export function hasAdapterPrConfirmation'), 'Shared external write helper should own adapter PR confirmation parsing');
assert.ok(xConnectorSource.includes('export function validateXPostExecutionApproval'), 'Shared X connector should own exact X posting approval validation');
assert.ok(xConnectorSource.includes('approved_x_username'), 'Shared X approval helper should require approved X account identity');
assert.ok(xConnectorSource.includes('approved_text'), 'Shared X approval helper should require exact approved X post text');

for (const [name, source] of [
  ['worker', workerSource]
]) {
  assert.ok(source.includes("from './lib/exact-actions.js'"), `${name} runtime should use shared exact action helpers`);
  assert.ok(!source.includes('function sanitizeExactMatchActionPatch'), `${name} runtime should not duplicate exact action patch sanitization`);
  assert.ok(!source.includes('function sanitizeExactMatchActionsForClient'), `${name} runtime should not duplicate exact action client sanitization`);
}
assert.ok(exactActionsSource.includes('export function sanitizeExactMatchActionPatch'), 'Shared exact action helper should own patch sanitization');
assert.ok(exactActionsSource.includes('EXACT_MATCH_ALLOWED_WORK_ACTIONS'), 'Shared exact action helper should enforce allowed work actions');

assert.ok(appContextSource.includes('CAIT_APP_CONTEXT_SCHEMA'), 'App context should keep an explicit schema marker');
assert.ok(appContextSource.includes('APP_CONTEXT_TTL_MS'), 'App context should remain server-side and expiring');
assert.ok(chatSource.includes('consumeCaitAppContextForChat'), 'Chat should consume server-side app context handoff');
assert.ok(chatSource.includes('caitAppContextChatPrompt'), 'Chat should render app context into order prompt context');

for (const token of [
  'reserveBillingEstimateInState',
  'settleBillingForJobInState',
  'releaseBillingReservationInState',
  'billing_reservation',
  'billingReservation'
]) {
  assert.ok(
    workerSource.includes(token) || serverSource.includes(token) || sharedSource.includes(token) || storageSource.includes(token),
    `Billing/job state guard missing ${token}`
  );
}

assert.ok(storageSource.includes('ensureStorageSchema'), 'Storage should keep runtime schema initialization');
assert.ok(storageSource.includes('ensureColumns'), 'Storage should keep additive D1 column migration guard');

const storageTables = parseCreateTables(STORAGE_SCHEMA_SQL);
const migrationTables = parseCreateTables(migrationSource);
assert.deepEqual(sorted(migrationTables.keys()), sorted(storageTables.keys()), 'D1 migration tables should match STORAGE_SCHEMA_SQL tables');
for (const [tableName, columns] of storageTables) {
  const migrationColumns = migrationTables.get(tableName) || new Set();
  const missingColumns = difference(columns, migrationColumns);
  assert.deepEqual(missingColumns, [], `D1 migration table ${tableName} is missing columns from STORAGE_SCHEMA_SQL: ${missingColumns.join(', ')}`);
}

const storageIndexes = parseIndexNames(STORAGE_SCHEMA_SQL);
const migrationIndexes = parseIndexNames(migrationSource);
const missingIndexes = difference(storageIndexes, migrationIndexes);
assert.deepEqual(missingIndexes, [], `D1 migration is missing indexes from STORAGE_SCHEMA_SQL: ${missingIndexes.join(', ')}`);

console.log('architecture qa passed');
