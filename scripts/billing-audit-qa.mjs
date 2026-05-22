import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';

const PORT = Number(process.env.PORT || 4326);
const BASE = `http://127.0.0.1:${PORT}`;
const PROVIDER_PORT = Number(process.env.PROVIDER_PORT || (PORT + 100));
const PROVIDER_BASE = `http://127.0.0.1:${PROVIDER_PORT}`;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, options);
  const text = await res.text();
  let body = {};
  if (text) {
    try { body = JSON.parse(text); } catch { body = { raw: text }; }
  }
  return { status: res.status, body };
}

async function waitForServer(timeoutMs = 8000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${BASE}/api/health`);
      if (res.ok) return;
    } catch {}
    await sleep(200);
  }
  throw new Error('Server did not become ready in time');
}

function startProviderServer() {
  const server = createServer(async (req, res) => {
    const url = new URL(req.url || '/', PROVIDER_BASE);
    if (url.pathname === '/research/health') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: true, service: 'billing_research_provider' }));
      return;
    }
    if (url.pathname === '/research/jobs') {
      let body = '';
      for await (const chunk of req) body += chunk;
      const payload = body ? JSON.parse(body) : {};
      const taskType = String(payload.task_type || 'research').trim().toLowerCase();
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({
        status: 'completed',
        summary: `Billing ${taskType} provider completed.`,
        report: { summary: `Billing ${taskType} delivery.`, bullets: [], nextAction: 'Review billing audit.' },
        files: [{ name: `${taskType}-delivery.md`, content: `# Billing ${taskType} delivery` }],
        usage: { input_tokens: 100, output_tokens: 100, total_tokens: 200, api_cost: 2 }
      }));
      return;
    }
    res.writeHead(404, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'not found' }));
  });
  return new Promise((resolve) => server.listen(PROVIDER_PORT, '127.0.0.1', () => resolve(server)));
}

async function main() {
  const provider = await startProviderServer();
  const child = spawn('node', ['server.js'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: 'test',
      ALLOW_IN_MEMORY_STORAGE: '1',
      ALLOW_OPEN_WRITE_API: '1',
      BUILTIN_AGENT_SAMPLE_FALLBACK: '1',
      PORT: String(PORT)
    },
    stdio: 'ignore'
  });

  try {
    await waitForServer();

    const imported = await request('/api/agents/import-manifest', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        confirm_routing: true,
        manifest: {
          schema_version: 'agent-manifest/v1',
          name: 'billing_agent',
          task_types: ['research'],
          pricing: { premium_rate: 0.2, basic_rate: 0.1 },
          healthcheck_url: `${PROVIDER_BASE}/research/health`,
          job_endpoint: `${PROVIDER_BASE}/research/jobs`
        }
      })
    });
    const agentId = imported.body.agent.id;
    await request(`/api/agents/${agentId}/verify`, { method: 'POST' });

    const job = await request('/api/jobs', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ parent_agent_id: 'qa-runner', task_type: 'research', prompt: 'billing audit test', budget_cap: 9999 })
    });
    assert.equal(job.status, 201);
    assert.equal(job.body.status, 'completed');

    const audits = await request('/api/billing-audits');
    assert.equal(audits.status, 200);
    assert.ok(Array.isArray(audits.body.billing_audits));
    const audit = audits.body.billing_audits.find(a => a.jobId === job.body.job_id);
    if (audit) {
      assert.equal(audit.policyVersion, 'billing-policy/v4-multi-model-pricing');
      assert.equal(audit.source, 'external-dispatch');
      assert.ok(audit.billable.totalCostBasis > 0);
      assert.ok(audit.settlement.creatorFee > 0);
      assert.ok(audit.settlement.marketplaceFee > 0);
      assert.ok(audit.settlement.total > 0);
    } else {
      const snapshot = await request('/api/snapshot');
      assert.equal(snapshot.status, 200);
      const auditEvent = (snapshot.body.events || []).find((event) => event.type === 'BILLING_AUDIT' && event.meta?.jobId === job.body.job_id);
      assert.ok(auditEvent, 'billing audit event should be recorded');
      assert.equal(auditEvent.meta.policyVersion, 'billing-policy/v4-multi-model-pricing');
      assert.equal(auditEvent.meta.source, 'external-dispatch');
      assert.ok(auditEvent.meta.billable.totalCostBasis > 0);
      assert.ok(auditEvent.meta.settlement.creatorFee > 0);
      assert.ok(auditEvent.meta.settlement.marketplaceFee > 0);
      assert.ok(auditEvent.meta.settlement.total > 0);
    }

    console.log('billing audit qa passed');
  } finally {
    child.kill('SIGTERM');
    provider.close();
    await sleep(300);
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
