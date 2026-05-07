import { expect, test } from '@playwright/test';
import { authSkipReason, canUseAuth, openAuthenticatedChat } from './helpers/auth.js';

const completedJob = {
  id: 'e2e-completed-schedule-source',
  status: 'completed',
  taskType: 'research',
  prompt: 'Task: research\nGoal: Production E2E completed order source\nDeliver: Return a concise delivery in chat.',
  completedAt: new Date().toISOString(),
  budgetCap: 100,
  deadlineSec: 120,
  orderStrategy: 'single',
  input: {
    source: 'playwright_production_e2e',
    original_prompt: 'Production E2E completed order source',
    _broker: {
      conversationOwner: { type: 'router', label: 'CAIt specialist router' },
      intake: { confirmed: true }
    }
  },
  output: {
    summary: 'Completed source order for schedule UI E2E.'
  }
};

test.describe('production-ready chat E2E harness', () => {
  test('authenticates, opens schedules, creates only from completed orders, and supports Ctrl+Enter', async ({ page }) => {
    test.skip(!canUseAuth, authSkipReason);

    let prepareOrderSeen = false;
    let recurringCreatePayload = null;

    await page.route('**/api/jobs?**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ jobs: [completedJob] })
      });
    });
    await page.route('**/api/recurring-orders', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ recurring_orders: [] })
        });
        return;
      }
      if (route.request().method() === 'POST') {
        recurringCreatePayload = JSON.parse(route.request().postData() || '{}');
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            ok: true,
            recurring_order: {
              id: 'e2e-recurring-created',
              status: 'active',
              taskType: recurringCreatePayload.task_type,
              prompt: recurringCreatePayload.prompt,
              schedule: recurringCreatePayload.schedule,
              nextRunAt: new Date(Date.now() + 86_400_000).toISOString()
            }
          })
        });
        return;
      }
      await route.continue();
    });
    await page.route('**/api/work/prepare-order', async (route) => {
      prepareOrderSeen = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          taskType: 'research',
          resolvedOrderStrategy: 'single',
          conversationOwner: { type: 'router', label: 'CAIt specialist router' },
          routingReason: 'Playwright verified Ctrl+Enter submit without creating an order.'
        })
      });
    });
    await page.route('**/api/open-chat/intent', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          action: 'prepare_order',
          intent: 'e2e_smoke',
          order_brief: 'Task: research\nGoal: Ctrl Enter production E2E smoke\nDeliver: Verify Ctrl+Enter can prepare an order without dispatching.'
        })
      });
    });

    await openAuthenticatedChat(page, {
      returnTo: '/chat?e2e=production-harness',
      loginSource: 'playwright_production_harness'
    });

    await expect(page.locator('#openScheduleBtn')).toBeVisible();
    await expect(page.locator('#openScheduleComposerBtn')).toBeVisible();
    await page.locator('#openScheduleComposerBtn').click();
    await expect(page.locator('#utilityModalTitle')).toHaveText('Schedules');
    await expect(page.locator('[name="source_job_id"]')).toBeEnabled();
    await expect(page.locator('[name="source_job_id"]')).toHaveValue(completedJob.id);
    await expect(page.locator('.utilityModal, #utilityModal')).not.toContainText('Order to run');

    await page.locator('[data-schedule-create]').evaluate((form) => form.requestSubmit());
    await expect(page.locator('#chatThread')).toContainText('Scheduled completed order.');
    expect(recurringCreatePayload?.input?._broker?.recurring?.sourceJobId).toBe(completedJob.id);
    expect(recurringCreatePayload?.input?._broker?.recurring?.chat_required).toBe(false);
    expect(recurringCreatePayload?.input?._broker?.intake?.reused_completed_order).toBe(true);

    await page.locator('#promptInput').fill('Ctrl Enter production E2E smoke');
    await page.locator('#promptInput').press(process.platform === 'darwin' ? 'Meta+Enter' : 'Control+Enter');
    await expect.poll(() => prepareOrderSeen).toBe(true);
    await expect(page.getByRole('button', { name: 'Send order' })).toBeVisible();
  });
});
