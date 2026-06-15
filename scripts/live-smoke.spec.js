import { test, expect } from '@playwright/test';

const BASE_URL = process.env.LIVE_BASE_URL || 'https://aiagent-marketplace.net';

test.setTimeout(60_000);

function liveUrl(path = '/') {
  return new URL(path, BASE_URL).toString();
}

test('live anonymous smoke', async ({ page, request }) => {
  const health = await request.get(liveUrl('/api/health'));
  expect(health.ok()).toBeTruthy();
  await expect(health).toBeOK();
  expect(await health.json()).toMatchObject({
    ok: true,
    service: 'aiagent2',
    deploy_target: 'cloudflare-worker'
  });

  const ready = await request.get(liveUrl('/api/ready'));
  await expect(ready).toBeOK();
  expect(await ready.json()).toMatchObject({ ok: true, ready: true });

  const smokeUrl = new URL(BASE_URL);
  smokeUrl.searchParams.set('smoke', String(Date.now()));
  await page.goto(smokeUrl.toString(), { waitUntil: 'domcontentloaded' });

  await expect(page.locator('#depositModal')).toHaveCount(0);
  await expect(page.locator('main[aria-label="CAIt landing page"]')).toBeVisible();
  const homeNav = page.getByRole('navigation', { name: 'CAIt pages' });
  await expect(homeNav).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Anyone can create high-quality AI agent output.' })).toBeVisible();
  await expect(page.getByLabel('Open-source free access')).toContainText('Open-source access is free');
  await expect(page.getByRole('link', { name: 'START', exact: true })).toHaveAttribute('href', /\/login\?next=%2Fchat&source=start/);
  await expect(homeNav.getByRole('link', { name: 'Agents', exact: true })).toHaveAttribute('href', '/agents.html');

  await page.goto(liveUrl('/agents.html'), { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Browse built-in AI agents you can order from CAIt.' })).toBeVisible();
  await expect(page.locator('body')).toContainText('This public catalog exposes 40 orderable built-in agents');
  await expect(page.locator('body')).toContainText('Before/after output snapshots');
  await expect(page.locator('body')).toContainText('Research Team Leader for Multi-Agent Decision Memos');
  await expect(page.locator('body')).toContainText('Due Diligence AI Agent');

  const agents = await request.get(liveUrl('/api/agents?limit=80'));
  await expect(agents).toBeOK();
  const agentsBody = await agents.json();
  expect(Array.isArray(agentsBody?.agents)).toBeTruthy();
  expect(agentsBody.agents.length).toBeGreaterThanOrEqual(40);

  const researchHealth = await request.get(liveUrl('/sample-agents/research/health'));
  await expect(researchHealth).toBeOK();
  expect(await researchHealth.json()).toMatchObject({
    ok: true,
    kind: 'research',
    provider: 'agent_file'
  });
});
