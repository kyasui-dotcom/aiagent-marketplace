import { createPrivateKey } from 'node:crypto';
import { baseUrl } from './http-core.js';
import { githubHeaders } from './github-integration.js';

const encoder = new TextEncoder();
const githubAppKeyCache = new Map();

function normalizePem(raw) {
  const pem = String(raw || '').replace(/\\n/g, '\n').trim();
  if (!pem) return '';
  if (pem.includes('BEGIN RSA PRIVATE KEY')) {
    try {
      return createPrivateKey(pem).export({ format: 'pem', type: 'pkcs8' }).toString().trim();
    } catch {
      return pem;
    }
  }
  return pem;
}

export function githubAppId(env) {
  return String(env?.GITHUB_APP_ID || '').trim();
}

export function githubAppClientId(env) {
  return String(env?.GITHUB_APP_CLIENT_ID || '').trim();
}

export function githubAppClientSecret(env) {
  return String(env?.GITHUB_APP_CLIENT_SECRET || '').trim();
}

export function githubAppPrivateKey(env) {
  return normalizePem(env?.GITHUB_APP_PRIVATE_KEY || '');
}

export function githubAppSlug(env) {
  return String(env?.GITHUB_APP_SLUG || '').trim();
}

export function githubAppConfigured(env) {
  return Boolean(githubAppId(env) && githubAppClientId(env) && githubAppClientSecret(env) && githubAppPrivateKey(env));
}

function githubAppSetup(env) {
  return {
    name: String(env?.GITHUB_APP_NAME || 'aiagent2-marketplace').trim() || 'aiagent2-marketplace',
    description: 'Installable GitHub App for CAIt manifest import and adapter PR creation.',
    public: false,
    request_oauth_on_install: true,
    redirect_url: null,
    callback_urls: [],
    setup_url: null,
    permissions: {
      contents: 'write',
      pull_requests: 'write',
      metadata: 'read'
    },
    events: []
  };
}

function githubAppRegistrationBaseUrl(env) {
  const owner = String(env?.GITHUB_APP_OWNER || '').trim();
  return owner
    ? `https://github.com/organizations/${encodeURIComponent(owner)}/settings/apps/new`
    : 'https://github.com/settings/apps/new';
}

function githubAppRegistrationUrl(request, env) {
  const root = baseUrl(request, env);
  const setup = githubAppSetup(env);
  const params = new URLSearchParams();
  params.set('name', setup.name);
  params.set('description', setup.description);
  params.set('url', root);
  params.append('callback_urls[]', `${root}/auth/github-app/callback`);
  params.set('request_oauth_on_install', 'true');
  params.set('public', 'false');
  params.set('webhook_active', 'false');
  params.set('contents', 'write');
  params.set('pull_requests', 'write');
  params.set('metadata', 'read');
  return `${githubAppRegistrationBaseUrl(env)}?${params.toString()}`;
}

async function githubAppSigningKey(env) {
  const pem = githubAppPrivateKey(env);
  if (!pem) return null;
  if (githubAppKeyCache.has(pem)) return githubAppKeyCache.get(pem);
  const base64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s+/g, '');
  const key = await crypto.subtle.importKey(
    'pkcs8',
    Buffer.from(base64, 'base64'),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
  githubAppKeyCache.set(pem, key);
  return key;
}

function base64urlString(value) {
  return Buffer.from(value).toString('base64url');
}

async function githubAppJwt(env) {
  const key = await githubAppSigningKey(env);
  if (!key) throw new Error('GitHub App private key is not configured');
  const now = Math.floor(Date.now() / 1000);
  const header = base64urlString(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = base64urlString(JSON.stringify({
    iat: now - 60,
    exp: now + 9 * 60,
    iss: githubAppId(env)
  }));
  const unsigned = `${header}.${payload}`;
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, encoder.encode(unsigned));
  return `${unsigned}.${Buffer.from(signature).toString('base64url')}`;
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error_description || data.error || `Request failed (${response.status})`);
  return data;
}

async function githubAppFetchJson(url, env, options = {}) {
  const jwt = await githubAppJwt(env);
  return fetchJson(url, {
    ...options,
    headers: {
      ...githubHeaders(),
      authorization: `Bearer ${jwt}`,
      ...(options.headers || {})
    }
  });
}

async function githubAppMetadata(env) {
  return githubAppFetchJson('https://api.github.com/app', env);
}

export async function githubAppInstallSlug(env) {
  const configuredSlug = githubAppSlug(env);
  if (configuredSlug) return configuredSlug;
  const metadata = await githubAppMetadata(env);
  return String(metadata.slug || '').trim();
}

export async function githubAppInstallationToken(env, installationId) {
  const response = await githubAppFetchJson(`https://api.github.com/app/installations/${installationId}/access_tokens`, env, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({})
  });
  return response?.token || '';
}

export async function githubAppUserTokenFromCode(env, code, redirectUri) {
  return fetchJson('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      client_id: githubAppClientId(env),
      client_secret: githubAppClientSecret(env),
      code,
      redirect_uri: redirectUri
    })
  });
}

export async function githubAppUserInstallations(userToken) {
  const response = await fetchJson('https://api.github.com/user/installations', {
    headers: {
      ...githubHeaders(userToken)
    }
  });
  return Array.isArray(response?.installations) ? response.installations : [];
}

export async function githubAppUserInstallationRepos(userToken, installationId) {
  const response = await fetchJson(`https://api.github.com/user/installations/${installationId}/repositories`, {
    headers: {
      ...githubHeaders(userToken)
    }
  });
  return Array.isArray(response?.repositories) ? response.repositories : [];
}

export function githubAppRecommendedSettings(request, env) {
  const root = baseUrl(request, env);
  return {
    name: githubAppSetup(env).name,
    homepage_url: root,
    callback_url: `${root}/auth/github-app/callback`,
    registration_url: githubAppRegistrationUrl(request, env),
    request_oauth_on_install: true,
    webhook_active: false,
    permissions: githubAppSetup(env).permissions,
    events: githubAppSetup(env).events,
    notes: [
      'Install only on the repositories you want CAIt to import from.',
      'Keep the app private unless you intentionally want multi-tenant distribution.',
      'Use GitHub App credentials instead of broad OAuth repo scopes.',
      'Adapter PR creation requires Contents and Pull requests permissions to be set to read and write.',
      'Because request_oauth_on_install is enabled, GitHub will send installs back to the callback URL after authorization.'
    ]
  };
}
