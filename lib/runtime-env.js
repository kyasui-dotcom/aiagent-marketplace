import { createD1LikeStorage } from './storage.js';

export function runtimeStorage(env) {
  const appVersion = String(env?.APP_VERSION || '').trim().toLowerCase();
  const isExplicitTestRuntime = appVersion.includes('test') || String(env?.NODE_ENV || '').trim().toLowerCase() === 'test';
  const allowInMemory = isExplicitTestRuntime && String(env?.ALLOW_IN_MEMORY_STORAGE || '').trim() === '1';
  const configuredCacheTtl = String(env?.D1_STATE_CACHE_TTL_MS ?? '').trim();
  const productionCacheTtlMs = configuredCacheTtl
    ? Math.max(0, Math.min(60_000, Number(configuredCacheTtl) || 0))
    : 10_000;
  return createD1LikeStorage(env.MY_BINDING || env.DB || null, {
    allowInMemory,
    stateCacheTtlMs: isExplicitTestRuntime ? 0 : productionCacheTtlMs,
    sampleAgentEndpointBaseUrl: env?.SAMPLE_AGENT_ENDPOINT_BASE_URL || env?.SAMPLE_AGENT_PROVIDER_BASE_URL || ''
  });
}

export function shouldInjectQaOrderCreateFault(env, faultName = '') {
  const appVersion = String(env?.APP_VERSION || '').trim().toLowerCase();
  if (!appVersion.includes('test')) return false;
  return String(env?.QA_ORDER_CREATE_FAULT || '').trim() === faultName;
}

export async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error_description || data.error || `Request failed (${response.status})`);
  return data;
}

export function githubClientId(env) {
  return String(env?.GITHUB_CLIENT_ID || '').trim();
}

export function githubClientSecret(env) {
  return String(env?.GITHUB_CLIENT_SECRET || '').trim();
}
