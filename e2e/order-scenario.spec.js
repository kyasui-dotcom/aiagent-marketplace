import { expect, test } from '@playwright/test';
import {
  assertOrderScenarioQuality,
  buildOrderScenarioPayload,
  collectOrderDeliveryText,
  loadOrderScenarioAppContextsFromEnv,
  loadOrderScenarioPromptFromEnv,
  orderHasExplicitApprovalWait,
  summarizeOrderStatus
} from '../scripts/e2e-order-scenario.mjs';
import { authSkipReason, canUseAuth, liveMode, openAuthenticatedChat } from './helpers/auth.js';

const shouldRunOrderScenario = process.env.E2E_ORDER_SCENARIO === '1' || Boolean(process.env.E2E_ORDER_ID);
const allowCreate = process.env.E2E_WRITE === '1' && process.env.E2E_ORDER_SCENARIO === '1';
const managedLocalNodeServer = !process.env.E2E_BASE_URL;
const acceptWaiting = process.env.E2E_ORDER_ACCEPT_WAITING === '1';
const pollIntervalMs = Math.max(500, Number(process.env.E2E_ORDER_POLL_INTERVAL_MS || (liveMode ? 15_000 : 1_000)) || 1_000);
const timeoutMs = Math.max(30_000, Number(process.env.E2E_ORDER_TIMEOUT_MS || (liveMode ? 12 * 60_000 : 120_000)) || 120_000);

async function authHeaders(page) {
  const response = await page.request.get('/auth/status', { failOnStatusCode: false });
  expect(response.status()).toBe(200);
  const status = await response.json();
  const csrfToken = String(status?.csrfToken || '').trim();
  const origin = new URL(page.url()).origin;
  return {
    origin,
    ...(csrfToken ? { 'x-aiagent2-csrf': csrfToken } : {})
  };
}

async function readOrder(page, orderId) {
  let lastStatus = 0;
  let lastBody = {};
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const response = await page.request.get(`/api/jobs/${encodeURIComponent(orderId)}`, { failOnStatusCode: false });
    const body = await response.json().catch(() => ({}));
    lastStatus = response.status();
    lastBody = body;
    if (lastStatus === 200) return body.job || body;
    if (![500, 502, 503, 504].includes(lastStatus) || attempt >= 4) break;
    await page.waitForTimeout(Math.min(5_000, 500 * attempt));
  }
  expect(lastStatus, `read order ${orderId}: ${JSON.stringify(lastBody).slice(0, 500)}`).toBe(200);
  return lastBody.job || lastBody;
}

function terminalStatus(job = {}) {
  const status = String(job.status || '').toLowerCase();
  if (['completed', 'failed', 'timed_out'].includes(status)) return true;
  if (acceptWaiting && status === 'blocked' && orderHasExplicitApprovalWait(job)) return true;
  return false;
}

async function waitForScenarioOrder(page, orderId, prompt) {
  const started = Date.now();
  let latest = null;
  let pollCount = 0;
  while (Date.now() - started < timeoutMs) {
    latest = await readOrder(page, orderId);
    pollCount += 1;
    console.log(`[order-scenario] ${orderId.slice(0, 8)} poll=${pollCount} ${summarizeOrderStatus(latest)}`);
    const status = String(latest.status || '').toLowerCase();
    if (['failed', 'timed_out'].includes(status)) {
      assertOrderScenarioQuality(latest, { prompt, requireCompleted: false });
    }
    if (terminalStatus(latest)) return latest;
    await page.waitForTimeout(pollIntervalMs);
  }
  throw new Error(`Order ${orderId} did not reach a terminal or explicit waiting state within ${timeoutMs}ms. Last: ${summarizeOrderStatus(latest || {})}`);
}

test.describe('parameterized production-like order scenario', () => {
  test('creates or observes a real order and validates workflow plus delivery quality', async ({ page }) => {
    test.skip(!shouldRunOrderScenario, 'Set E2E_ORDER_SCENARIO=1 to create a scenario order or E2E_ORDER_ID to observe an existing order.');
    test.skip(!canUseAuth, authSkipReason);
    test.skip(
      managedLocalNodeServer && process.env.E2E_ORDER_ALLOW_NODE_SERVER !== '1',
      'Order scenario E2E is Worker/production-oriented; managed local Playwright uses node server and is covered by worker-api QA instead.'
    );
    test.setTimeout(timeoutMs + 60_000);

    const prompt = loadOrderScenarioPromptFromEnv();
    await openAuthenticatedChat(page, {
      returnTo: '/chat?e2e=order-scenario',
      loginSource: 'playwright_order_scenario'
    });

    let orderId = String(process.env.E2E_ORDER_ID || '').trim();
    if (!orderId) {
      test.skip(!allowCreate, 'Creating production-like order scenarios requires E2E_WRITE=1.');
      const payload = buildOrderScenarioPayload({
        prompt,
        taskType: process.env.E2E_ORDER_TASK_TYPE || 'cmo_leader',
        clientOrderId: process.env.E2E_ORDER_CLIENT_ID || `e2e_order_${Date.now().toString(36)}`,
        appContexts: process.env.E2E_ORDER_CONTEXTS_DISABLED === '1' ? false : loadOrderScenarioAppContextsFromEnv()
      });
      const createResponse = await page.request.post('/api/jobs', {
        headers: await authHeaders(page),
        data: payload,
        failOnStatusCode: false,
        timeout: liveMode ? 60_000 : 30_000
      });
      const created = await createResponse.json().catch(() => ({}));
      if (createResponse.status() === 402 && String(created?.code || '').toLowerCase() === 'payment_method_missing') {
        throw new Error([
          'Order scenario E2E reached the production billing gate before creating the order.',
          'Use a funded E2E account, for example `npm run qa:e2e:order -- --email <funded-email>`,',
          'or validate a user-created order with `npm run qa:e2e:order -- --order-id <order-id>`.',
          `Billing response: ${JSON.stringify(created).slice(0, 1000)}`
        ].join(' '));
      }
      expect(createResponse.status(), `create scenario order failed: ${JSON.stringify(created).slice(0, 1000)}`).toBe(201);
      orderId = String(created.workflow_job_id || created.job_id || created.job?.id || '').trim();
      expect(orderId, `create scenario response must expose order id: ${JSON.stringify(created).slice(0, 1000)}`).not.toHaveLength(0);
      console.log(`[order-scenario] created ${orderId}`);
    }

    const job = await waitForScenarioOrder(page, orderId, prompt);
    assertOrderScenarioQuality(job, {
      prompt,
      requireCompleted: !acceptWaiting,
      allowWaiting: acceptWaiting,
      minDeliveryChars: Number(process.env.E2E_ORDER_MIN_DELIVERY_CHARS || 900) || 900
    });
    if (String(job.status || '').toLowerCase() === 'completed') {
      console.log(`[order-scenario] delivery chars=${collectOrderDeliveryText(job).length}`);
    }
  });
});
