import { expect, test } from '@playwright/test';

test.describe('public API contract', () => {
  test('health and readiness endpoints expose deploy state', async ({ request }) => {
    const health = await request.get('/api/health');
    expect(health.status()).toBe(200);
    const healthBody = await health.json();
    expect(healthBody).toMatchObject({ ok: true, service: 'aiagent2' });
    expect(String(healthBody.version || '')).not.toHaveLength(0);
    expect(String(healthBody.deploy_target || '')).not.toHaveLength(0);

    const ready = await request.get('/api/ready');
    expect(ready.status()).toBe(200);
    const readyBody = await ready.json();
    expect(readyBody).toMatchObject({ ok: true, ready: true });
    expect(readyBody.storage).toBeTruthy();
  });

  test('agents endpoint exposes searchable built-in supply', async ({ request }) => {
    const response = await request.get('/api/agents?limit=100');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body.agents)).toBe(true);
    expect(body.agents.length).toBeGreaterThan(0);

    const serialized = JSON.stringify(body).toLowerCase();
    expect(serialized).toContain('research');
    expect(serialized).toContain('cmo');
  });
});
