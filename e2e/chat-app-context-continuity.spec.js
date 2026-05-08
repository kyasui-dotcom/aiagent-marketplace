import { expect, test } from '@playwright/test';
import { authSkipReason, canUseAuth, chatResponseTimeout, openAuthenticatedChat } from './helpers/auth.js';

test.describe('CAIt app context continuity', () => {
  test('returns Analytics Console context to the active intake instead of opening a separate chat', async ({ page, context }) => {
    test.skip(!canUseAuth, authSkipReason);
    test.setTimeout(90_000);

    await page.route('**/api/open-chat/intent', async (route) => {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Open chat LLM disabled for deterministic app continuity E2E.' })
      });
    });
    let prepareOrderFailures = 0;
    await page.route('**/api/work/prepare-order', async (route) => {
      if (route.request().method() !== 'POST' || prepareOrderFailures > 0) {
        await route.continue();
        return;
      }
      prepareOrderFailures += 1;
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Prepare-order temporarily unavailable.' })
      });
    });
    let appContextOpenFailures = 0;
    await page.route('**/api/app-contexts', async (route) => {
      if (route.request().method() !== 'POST' || appContextOpenFailures > 0) {
        await route.continue();
        return;
      }
      appContextOpenFailures += 1;
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Initial app context persistence temporarily unavailable.' })
      });
    });
    await openAuthenticatedChat(page, {
      returnTo: '/chat?e2e=app-context-continuity',
      loginSource: 'playwright_app_context_continuity'
    });

    await page.locator('#promptInput').fill('集客したいです');
    await page.locator('#sendMessageBtn').click();
    await expect(page.locator('#activeLeaderStatus')).toContainText('Lead: CMO Leader', { timeout: chatResponseTimeout });
    await expect(page.locator('#chatThread')).toContainText(/GA4|Search Console|サーチコンソール/, { timeout: chatResponseTimeout });

    const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: /GA4|Search Console|サーチコンソール/ }).first().click();
    const analyticsPage = await popupPromise;
    await analyticsPage.waitForLoadState('domcontentloaded');
    await expect(analyticsPage).toHaveURL(/\/analytics-console(?:\.html)?/);
    const analyticsUrl = new URL(analyticsPage.url());
    expect(analyticsUrl.origin).toBe(new URL(page.url()).origin);
    expect(analyticsUrl.searchParams.get('chat_return_to')).toContain('/chat');
    await analyticsPage.route('**/api/app-contexts', async (route) => {
      if (route.request().method() !== 'POST') {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'App context persistence temporarily unavailable.' })
      });
    });

    await analyticsPage.locator('#sendContextBtn').click();
    await expect(page.locator('#chatThread')).toContainText(/アプリの情報を進行中のヒアリングに戻しました|App context returned to the active intake/, { timeout: chatResponseTimeout });
    await expect(page.locator('#chatThread')).toContainText('Context received from Analytics Console');
    await expect(page.locator('#promptInput')).toHaveValue(/connector context attached|アナリティクス/);
    await expect(page.locator('#promptInput')).not.toHaveValue(/Recommended next actions|Use this Analytics Console context/);
    await expect(page.getByRole('button', { name: 'Send order' })).toHaveCount(0);
    const disabledIntakeChoices = await page.locator('[data-intake-choice]').evaluateAll((buttons) => buttons
      .filter((button) => !['analytics-use'].includes(button.dataset.chatAction || '') && button.disabled)
      .map((button) => button.textContent?.trim() || button.getAttribute('data-intake-choice') || 'unknown'));
    expect(disabledIntakeChoices).toEqual([]);
    await expect(page.getByRole('button', { name: /売上|購入|sales|revenue/i }).first()).toBeEnabled();
    await page.getByRole('button', { name: /売上|購入|sales|revenue/i }).first().click();
    await expect(page.locator('#chatThread')).not.toContainText('There is no active intake to answer.');
    await expect(page.locator('#promptInput')).toHaveValue(/主な目的|Main goal/);
    await page.locator('#sendMessageBtn').click();
    await expect(page.locator('#chatThread')).toContainText('Task: cmo_leader', { timeout: chatResponseTimeout });
    await expect(page.locator('#chatThread')).toContainText('Attached connector context');
    await expect(page.locator('#chatThread')).not.toContainText('Recommended next actions');
    await expect(page.getByRole('button', { name: 'Send order' })).toBeVisible();

    expect(page.url()).toContain('/chat');
    const chatPages = context.pages().filter((item) => /\/chat(?:\.html)?(?:\?|$)/.test(item.url()));
    expect(chatPages).toHaveLength(1);
  });
});
