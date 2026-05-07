import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { API_ROUTE_MANIFEST, API_ROUTE_METHODS, API_ROUTES, apiRouteManifestForRuntime } from '../lib/api-routes.js';
import { STORAGE_SCHEMA_SQL } from '../lib/storage.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => readFileSync(path.join(root, file), 'utf8');

const workerSource = read('worker.js');
const serverSource = read('server.js');
const storageSource = read('lib/storage.js');
const sharedSource = read('lib/shared.js');
const xConnectorSource = read('lib/x-connector.js');
const exactActionsSource = read('lib/exact-actions.js');
const chatSource = read('public/chat.js');
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

const workerRoutes = apiRoutesFromSource(workerSource);
const serverRoutes = apiRoutesFromSource(serverSource);
const workerManifestRoutes = new Set(apiRouteManifestForRuntime('worker').map((route) => route.path));
const serverManifestRoutes = new Set(apiRouteManifestForRuntime('server').map((route) => route.path));
assert.deepEqual(difference(workerManifestRoutes, workerRoutes), [], 'Worker is missing routes declared in API_ROUTE_MANIFEST');
assert.deepEqual(difference(workerRoutes, workerManifestRoutes), [], 'Worker has routes not declared in API_ROUTE_MANIFEST');
assert.deepEqual(difference(serverManifestRoutes, serverRoutes), [], 'Node server is missing routes declared in API_ROUTE_MANIFEST');
assert.deepEqual(difference(serverRoutes, serverManifestRoutes), [], 'Node server has routes not declared in API_ROUTE_MANIFEST');

const workerOnlyAllowed = new Set(apiRouteManifestForRuntime('worker')
  .filter((route) => !route.runtimes.includes('server'))
  .map((route) => route.path));
const unexpectedWorkerOnly = difference(workerRoutes, serverRoutes).filter((route) => !workerOnlyAllowed.has(route));
const unexpectedServerOnly = difference(serverRoutes, workerRoutes);
assert.deepEqual(unexpectedWorkerOnly, [], `Worker API routes missing in Node server: ${unexpectedWorkerOnly.join(', ')}`);
assert.deepEqual(unexpectedServerOnly, [], `Node server API routes missing in Worker: ${unexpectedServerOnly.join(', ')}`);

for (const route of [
  API_ROUTES.ADMIN_API_KEYS,
  API_ROUTES.SETTINGS_EXACT_ACTIONS,
  API_ROUTES.CONNECTORS_X_POST,
  API_ROUTES.DELIVERIES_EXECUTE,
  API_ROUTES.DELIVERIES_SCHEDULE,
  API_ROUTES.APP_CONTEXTS
]) {
  assert.ok(workerRoutes.has(route), `Worker should expose ${route}`);
  assert.ok(serverRoutes.has(route), `Node server should expose ${route}`);
}

for (const routeKey of [
  'ADMIN_API_KEYS',
  'SETTINGS_EXACT_ACTIONS',
  'CONNECTORS_X_STATUS',
  'CONNECTORS_X_POST',
  'DELIVERIES_EXECUTE',
  'DELIVERIES_SCHEDULE',
  'APP_CONTEXTS'
]) {
  for (const method of API_ROUTE_METHODS[routeKey] || []) {
    assert.ok(
      hasMethodAwareRouteMatcher(workerSource, routeKey, method),
      `Worker should route ${routeKey} ${method} through apiRouteMatches`
    );
    assert.ok(
      hasMethodAwareRouteMatcher(serverSource, routeKey, method),
      `Node server should route ${routeKey} ${method} through apiRouteMatches`
    );
  }
}

for (const [name, source] of [
  ['worker', workerSource],
  ['server', serverSource]
]) {
  assert.ok(source.includes("from './lib/x-connector.js'"), `${name} runtime should use shared X connector helpers`);
  assert.ok(source.includes('validateXPostExecutionApproval'), `${name} runtime should validate exact X posting approval`);
  assert.ok(!source.includes('function validateXPostExecutionApproval'), `${name} runtime should not duplicate X approval logic locally`);
  assert.ok(source.includes('hasDeliveryExecutionConfirmation'), `${name} runtime should keep delivery execution confirmations`);
  assert.ok(source.includes('hasDeliveryScheduleConfirmation'), `${name} runtime should keep delivery schedule confirmations`);
  assert.ok(source.includes('confirm_post'), `${name} runtime should require explicit X post confirmation`);
}
assert.ok(xConnectorSource.includes('export function validateXPostExecutionApproval'), 'Shared X connector should own exact X posting approval validation');
assert.ok(xConnectorSource.includes('approved_x_username'), 'Shared X approval helper should require approved X account identity');
assert.ok(xConnectorSource.includes('approved_text'), 'Shared X approval helper should require exact approved X post text');

for (const [name, source] of [
  ['worker', workerSource],
  ['server', serverSource]
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
