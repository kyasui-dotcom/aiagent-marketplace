import http from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, normalize, resolve } from 'node:path';
import { Readable } from 'node:stream';
import worker from './worker.js';
import { createD1LikeStorage } from './lib/storage.js';

const PUBLIC_DIR = resolve(process.cwd(), 'public');
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8'
};

function runtimeAllowsInMemoryStorage(env = process.env) {
  const version = String(env.APP_VERSION || '').trim().toLowerCase();
  const nodeEnv = String(env.NODE_ENV || '').trim().toLowerCase();
  return (version.includes('test') || nodeEnv === 'test')
    && String(env.ALLOW_IN_MEMORY_STORAGE || '').trim() === '1';
}

function createStaticAssetsBinding() {
  return {
    async fetch(request) {
      const url = new URL(request.url);
      const file = resolveAssetPath(url.pathname);
      if (!file) return new Response('Not found', { status: 404 });
      const headers = {
        'content-type': MIME_TYPES[extname(file).toLowerCase()] || 'application/octet-stream'
      };
      return new Response(createReadStream(file), { status: 200, headers });
    }
  };
}

function resolveAssetPath(pathname = '/') {
  const decoded = safeDecodePath(pathname);
  const candidates = assetPathCandidates(decoded);
  for (const candidate of candidates) {
    const fullPath = normalize(resolve(PUBLIC_DIR, `.${candidate}`));
    if (!fullPath.startsWith(PUBLIC_DIR)) continue;
    if (!existsSync(fullPath)) continue;
    const stat = statSync(fullPath);
    if (stat.isFile()) return fullPath;
  }
  return '';
}

function safeDecodePath(pathname = '/') {
  try {
    return decodeURIComponent(String(pathname || '/'));
  } catch {
    return String(pathname || '/');
  }
}

function assetPathCandidates(pathname = '/') {
  const normalizedPath = String(pathname || '/').startsWith('/') ? String(pathname || '/') : `/${pathname}`;
  const withoutSlash = normalizedPath.replace(/\/+$/, '') || '/';
  if (withoutSlash === '/') return ['/index.html'];
  const ext = extname(withoutSlash);
  return ext
    ? [withoutSlash]
    : [`${withoutSlash}.html`, `${withoutSlash}/index.html`, withoutSlash];
}

function createLocalQueueBinding(envProvider) {
  return {
    async send(body) {
      const env = envProvider();
      const waitUntilTasks = [];
      const ctx = { waitUntil: (promise) => waitUntilTasks.push(Promise.resolve(promise)) };
      const message = {
        body,
        ack() {},
        retry() {}
      };
      await worker.queue({ messages: [message] }, env, ctx);
      await Promise.allSettled(waitUntilTasks);
    }
  };
}

function installLocalTestFetchMocks() {
  if (process.env.MOCK_BRAVE_SEARCH !== '1' || globalThis.__aiagent2LocalTestFetchMocksInstalled) return;
  globalThis.__aiagent2LocalTestFetchMocksInstalled = true;
  const originalFetch = globalThis.fetch.bind(globalThis);
  globalThis.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input?.url;
    if (String(url || '').startsWith('https://api.search.brave.com/')) {
      return new Response(JSON.stringify({
        web: {
          results: [
            {
              title: 'CAIt AI agent marketplace',
              url: 'https://aiagent-marketplace.net/chat',
              description: 'Local E2E source fixture for CAIt growth, SEO, social, and developer signup analysis.',
              extra_snippets: [
                'Developer and technical users evaluate AI agent workflows, connector approval, and delivery quality before signup.',
                'Organic search, social proof posts, and approval-gated outbound actions are the priority test lanes.'
              ]
            }
          ]
        }
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    return originalFetch(input, init);
  };
}

async function bootstrapInMemoryState() {
  if (!process.env.BOOTSTRAP_STATE_JSON) return;
  const storage = createD1LikeStorage(null, { allowInMemory: runtimeAllowsInMemoryStorage() });
  try {
    await storage.replaceState(JSON.parse(process.env.BOOTSTRAP_STATE_JSON));
  } catch (error) {
    throw new Error(`Invalid BOOTSTRAP_STATE_JSON: ${error.message}`);
  }
}

function buildWorkerEnv() {
  const baseUrl = process.env.BASE_URL || `http://${process.env.HOST || '127.0.0.1'}:${process.env.PORT || 4323}`;
  const env = {
    ...process.env,
    APP_VERSION: process.env.APP_VERSION || '0.2.0',
    ALLOW_OPEN_WRITE_API: defaultTestFlag('ALLOW_OPEN_WRITE_API', '0'),
    ALLOW_GUEST_RUN_READ_API: defaultTestFlag('ALLOW_GUEST_RUN_READ_API', '1'),
    ALLOW_DEV_API: defaultTestFlag('ALLOW_DEV_API', '1'),
    CAIT_DEVELOPER_API_ENABLED: defaultTestFlag('CAIT_DEVELOPER_API_ENABLED', process.env.ALLOW_DEV_API || '1'),
    BASE_URL: baseUrl,
    SAMPLE_AGENT_ENDPOINT_BASE_URL: process.env.SAMPLE_AGENT_ENDPOINT_BASE_URL
      || process.env.SAMPLE_AGENT_PROVIDER_BASE_URL
      || `${baseUrl.replace(/\/+$/, '')}/sample-agents`,
    MY_BINDING: null,
    DB: null,
    ASSETS: createStaticAssetsBinding()
  };
  env.WORKFLOW_DISPATCH_QUEUE = createLocalQueueBinding(() => env);
  return env;
}

function defaultTestFlag(name, value) {
  if (Object.prototype.hasOwnProperty.call(process.env, name)) return process.env[name];
  return runtimeAllowsInMemoryStorage() ? value : undefined;
}

function nodeRequestUrl(req) {
  const proto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim()
    || (req.socket.encrypted ? 'https' : 'http');
  const host = req.headers.host || `${process.env.HOST || '127.0.0.1'}:${process.env.PORT || 4323}`;
  return `${proto}://${host}${req.url || '/'}`;
}

function nodeRequestHeaders(req) {
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers || {})) {
    if (Array.isArray(value)) {
      for (const item of value) headers.append(key, item);
    } else if (value !== undefined) {
      headers.set(key, String(value));
    }
  }
  return headers;
}

function toFetchRequest(req) {
  const method = String(req.method || 'GET').toUpperCase();
  const init = { method, headers: nodeRequestHeaders(req) };
  if (!['GET', 'HEAD'].includes(method)) {
    init.body = req;
    init.duplex = 'half';
  }
  return new Request(nodeRequestUrl(req), init);
}

async function sendFetchResponse(res, response) {
  const headers = {};
  for (const [key, value] of response.headers) {
    if (key.toLowerCase() !== 'set-cookie') headers[key] = value;
  }
  const setCookies = typeof response.headers.getSetCookie === 'function'
    ? response.headers.getSetCookie()
    : [];
  if (setCookies.length) headers['set-cookie'] = setCookies;
  else if (response.headers.has('set-cookie')) headers['set-cookie'] = response.headers.get('set-cookie');

  res.writeHead(response.status, response.statusText || undefined, headers);
  if (!response.body || response.status === 204 || response.status === 304) {
    res.end();
    return;
  }
  await new Promise((resolvePromise, rejectPromise) => {
    Readable.fromWeb(response.body)
      .on('error', rejectPromise)
      .pipe(res)
      .on('finish', resolvePromise)
      .on('error', rejectPromise);
  });
}

function handleLocalEvents(req, res) {
  if (req.method !== 'GET') return false;
  const url = new URL(nodeRequestUrl(req));
  if (url.pathname !== '/events') return false;
  res.writeHead(200, {
    'content-type': 'text/event-stream',
    'cache-control': 'no-cache',
    connection: 'keep-alive'
  });
  res.write(': connected\n\n');
  const heartbeat = setInterval(() => res.write(': heartbeat\n\n'), 30_000);
  req.on('close', () => clearInterval(heartbeat));
  return true;
}

installLocalTestFetchMocks();
await bootstrapInMemoryState();

const env = buildWorkerEnv();
const server = http.createServer(async (req, res) => {
  if (handleLocalEvents(req, res)) return;
  const waitUntilTasks = [];
  const ctx = {
    waitUntil(promise) {
      const tracked = Promise.resolve(promise).catch((error) => {
        console.error('worker waitUntil failed', error);
      });
      waitUntilTasks.push(tracked);
    }
  };
  try {
    const response = await worker.fetch(toFetchRequest(req), env, ctx);
    void Promise.allSettled(waitUntilTasks);
    await sendFetchResponse(res, response);
  } catch (error) {
    console.error(error);
    res.writeHead(500, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: error.message || 'Internal server error' }));
  }
});

server.on('clientError', (_error, socket) => {
  socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
});

const port = Number(process.env.PORT || 4323);
const host = process.env.HOST || '127.0.0.1';
server.listen(port, host, () => {
  console.log(`agent-market-app running at http://${host}:${port} via worker.fetch`);
});
