import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';

const PORT = Number(process.env.PORT || 4324);
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
    try {
      body = JSON.parse(text);
    } catch {
      body = { raw: text };
    }
  }
  return { status: res.status, body };
}

function jobPayload(response) {
  return response?.body?.job || response?.body || {};
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
    if (url.pathname.endsWith('/health')) {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: true, service: 'retry_timeout_provider' }));
      return;
    }
    if (url.pathname === '/accepted/jobs') {
      let body = '';
      for await (const chunk of req) body += chunk;
      const payload = body ? JSON.parse(body) : {};
      res.writeHead(202, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ accepted: true, status: 'accepted', external_job_id: `retry-${String(payload.job_id || '').slice(0, 8)}` }));
      return;
    }
    res.writeHead(404, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'not found' }));
  });
  return new Promise((resolve) => server.listen(PROVIDER_PORT, '127.0.0.1', () => resolve(server)));
}

async function main() {
  const badTaskType = 'retry_bad_endpoint_qa';
  const acceptedTaskType = 'retry_timeout_qa';
  const provider = await startProviderServer();

  const child = spawn('node', ['server.js'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: 'test',
      ALLOW_IN_MEMORY_STORAGE: '1',
      PORT: String(PORT)
    },
    stdio: 'ignore'
  });

  try {
    await waitForServer();

    const badManifest = {
      name: 'retry_bad_agent',
      task_types: [badTaskType],
      pricing: { premium_rate: 0.15, basic_rate: 0.1 },
      healthcheck_url: `${PROVIDER_BASE}/research/health`,
      job_endpoint: `${BASE}/missing/jobs`
    };
    const importBad = await request('/api/agents/import-manifest', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ confirm_routing: true, manifest: badManifest })
    });
    const badAgentId = importBad.body.agent.id;
    await request(`/api/agents/${badAgentId}/verify`, { method: 'POST' });

    const badJob = await request('/api/jobs', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ parent_agent_id: 'qa-runner', task_type: badTaskType, prompt: 'bad endpoint retry test', budget_cap: 9999 })
    });
    assert.equal(badJob.status, 201);
    assert.equal(badJob.body.status, 'failed');

    const badJobState = await request(`/api/jobs/${badJob.body.job_id}`);
    const badJobPayload = jobPayload(badJobState);
    assert.equal(badJobPayload.failureCategory, 'dispatch_http_4xx');
    assert.equal(badJobPayload.dispatch.retryable, false);

    const badRetry = await request('/api/dev/dispatch-retry', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ job_id: badJob.body.job_id })
    });
    assert.equal(badRetry.status, 409);

    const acceptedManifest = {
      name: 'retry_timeout_agent',
      task_types: [acceptedTaskType],
      pricing: { premium_rate: 0.15, basic_rate: 0.1 },
      healthcheck_url: `${PROVIDER_BASE}/accepted/health`,
      job_endpoint: `${PROVIDER_BASE}/accepted/jobs`
    };
    const importAccepted = await request('/api/agents/import-manifest', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ confirm_routing: true, manifest: acceptedManifest })
    });
    const acceptedAgentId = importAccepted.body.agent.id;
    await request(`/api/agents/${acceptedAgentId}/verify`, { method: 'POST' });

    const acceptedJob = await request('/api/jobs', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ parent_agent_id: 'qa-runner', task_type: acceptedTaskType, prompt: 'timeout test', budget_cap: 9999 })
    });
    assert.equal(acceptedJob.status, 201);
    assert.equal(acceptedJob.body.status, 'dispatched');

    await sleep(1100);
    const sweep = await request('/api/dev/timeout-sweep', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ stale_ms: 1 })
    });
    assert.equal(sweep.status, 200);
    assert.equal(sweep.body.ok, true);
    assert.equal(sweep.body.count, 1);
    const sweptJobs = sweep.body.timedOut || sweep.body.swept || [];
    assert.ok(Array.isArray(sweptJobs));
    const swept = sweptJobs.find(item => item.id === acceptedJob.body.job_id);
    assert.ok(swept, 'accepted job should be timed out');
    assert.equal(swept.retryable, true);
    assert.equal(typeof swept.maxRetries, 'number');
    assert.ok(swept.maxRetries >= 1);
    assert.ok(swept.nextRetryAt);

    const snapshotAfterTimeout = await request('/api/snapshot');
    assert.equal(snapshotAfterTimeout.status, 200);
    const timeoutEvent = snapshotAfterTimeout.body.events.find(event => event.type === 'TIMEOUT' && event.meta?.jobId === acceptedJob.body.job_id);
    assert.ok(timeoutEvent, 'timeout event should be emitted');
    assert.equal(timeoutEvent.meta.retryable, true);
    assert.equal(timeoutEvent.meta.attempts, swept.attempts);
    assert.equal(timeoutEvent.meta.maxRetries, swept.maxRetries);
    assert.match(timeoutEvent.message, new RegExp(`retry ${swept.attempts + 1}/${swept.maxRetries} available`));

    const timedOutState = await request(`/api/jobs/${acceptedJob.body.job_id}`);
    const timedOutPayload = jobPayload(timedOutState);
    assert.equal(timedOutPayload.status, 'timed_out');
    assert.equal(timedOutPayload.failureCategory, 'dispatch_queue_timeout');
    assert.equal(timedOutPayload.dispatch.retryable, true);
    assert.equal(timedOutPayload.dispatch.maxRetries, swept.maxRetries);

    const retryTimedOut = await request('/api/dev/dispatch-retry', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ job_id: acceptedJob.body.job_id })
    });
    assert.equal(retryTimedOut.status, 200);
    assert.equal(retryTimedOut.body.mode, 'dispatched');

    const retriedState = await request(`/api/jobs/${acceptedJob.body.job_id}`);
    const retriedPayload = jobPayload(retriedState);
    assert.equal(retriedPayload.status, 'dispatched');
    assert.equal(retriedPayload.dispatch.retryable, false);
    assert.equal(retriedPayload.dispatch.nextRetryAt, null);

    console.log('retry timeout qa passed');
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
