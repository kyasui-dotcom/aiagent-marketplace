import { buildCookie, clearCookie, parseCookies } from './http-core.js';

export const SESSION_COOKIE = 'aiagent2_session';
export const OAUTH_STATE_COOKIE = 'aiagent2_oauth_state';

const encoder = new TextEncoder();
const SESSION_MAX_AGE_SEC = 30 * 24 * 60 * 60;
const SESSION_REFRESH_WINDOW_SEC = 7 * 24 * 60 * 60;
const SESSION_REFRESH_MIN_INTERVAL_SEC = 6 * 60 * 60;
const OAUTH_STATE_MAX_AGE_SEC = 10 * 60;
const MAX_PENDING_OAUTH_STATES = 8;
const SESSION_VERSION = 2;
const cryptoKeyCache = new Map();
let generatedSessionSecret = '';

export function base64urlEncode(value) {
  return Buffer.from(value).toString('base64url');
}

export function base64urlDecode(value) {
  return new Uint8Array(Buffer.from(String(value || ''), 'base64url'));
}

export function sessionSecretMaterial(env) {
  if (!generatedSessionSecret) {
    generatedSessionSecret = `${crypto.randomUUID()}-${crypto.randomUUID()}-${Date.now()}`;
  }
  return String(env?.SESSION_SECRET || generatedSessionSecret);
}

export async function hmacSha256Base64Url(secret, value) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(String(secret || '')),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(String(value || '')));
  return base64urlEncode(new Uint8Array(signature));
}

export async function internalCronToken(env, cron = '', scheduledTime = Date.now()) {
  const bucket = Math.floor(Number(scheduledTime || Date.now()) / 60_000);
  return hmacSha256Base64Url(sessionSecretMaterial(env), `cron-workflow-completions:${String(cron || '')}:${bucket}`);
}

async function sessionCryptoKey(env) {
  const secret = sessionSecretMaterial(env);
  if (cryptoKeyCache.has(secret)) return cryptoKeyCache.get(secret);
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(secret));
  const key = await crypto.subtle.importKey('raw', digest, 'AES-GCM', false, ['encrypt', 'decrypt']);
  cryptoKeyCache.set(secret, key);
  return key;
}

export async function sealPayload(payload, env) {
  const key = await sessionCryptoKey(env);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(JSON.stringify(payload))
  );
  return `${base64urlEncode(iv)}.${base64urlEncode(new Uint8Array(ciphertext))}`;
}

export async function openPayload(raw, env) {
  if (!raw || !String(raw).includes('.')) return null;
  const [ivPart, dataPart] = String(raw).split('.');
  if (!ivPart || !dataPart) return null;
  try {
    const key = await sessionCryptoKey(env);
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: base64urlDecode(ivPart) },
      key,
      base64urlDecode(dataPart)
    );
    return JSON.parse(Buffer.from(decrypted).toString('utf8'));
  } catch {
    return null;
  }
}

export async function makeSessionCookie(session, env) {
  const now = Date.now();
  const payload = {
    ...session,
    sessionVersion: SESSION_VERSION,
    csrfToken: session.csrfToken || crypto.randomUUID(),
    refreshedAt: Number(session?.refreshedAt || 0) || now,
    exp: now + SESSION_MAX_AGE_SEC * 1000
  };
  return buildCookie(SESSION_COOKIE, await sealPayload(payload, env), { maxAge: SESSION_MAX_AGE_SEC });
}

export async function getSession(request, env) {
  const cookies = parseCookies(request);
  const payload = await openPayload(cookies[SESSION_COOKIE], env);
  if (!payload || Number(payload.sessionVersion || 0) !== SESSION_VERSION) return null;
  if (!payload || Number(payload.exp || 0) < Date.now()) return null;
  return payload;
}

export function sessionNeedsRefresh(session) {
  if (!session) return false;
  const now = Date.now();
  const remainingMs = Number(session.exp || 0) - now;
  const lastRefreshMs = Number(session.refreshedAt || 0);
  if (remainingMs <= SESSION_REFRESH_WINDOW_SEC * 1000) return true;
  if (!lastRefreshMs) return true;
  return now - lastRefreshMs >= SESSION_REFRESH_MIN_INTERVAL_SEC * 1000;
}

export async function maybeRefreshSessionCookie(session, env) {
  if (!sessionNeedsRefresh(session)) return null;
  return makeSessionCookie({ ...session, refreshedAt: Date.now() }, env);
}

export async function makeOAuthStateCookie(state, env, meta = {}) {
  const now = Date.now();
  return buildCookie(
    OAUTH_STATE_COOKIE,
    await sealPayload({ pending: [{ state, createdAt: now, exp: now + OAUTH_STATE_MAX_AGE_SEC * 1000, ...meta }], exp: now + OAUTH_STATE_MAX_AGE_SEC * 1000 }, env),
    { maxAge: OAUTH_STATE_MAX_AGE_SEC }
  );
}

export async function readOAuthStates(request, env) {
  const cookies = parseCookies(request);
  const payload = await openPayload(cookies[OAUTH_STATE_COOKIE], env);
  if (!payload) return [];
  const now = Date.now();
  const pending = Array.isArray(payload.pending)
    ? payload.pending
    : payload?.state
      ? [payload]
      : [];
  return pending.filter((entry) => entry && entry.state && Number(entry.exp || 0) >= now);
}

export async function pushOAuthStateCookie(request, env, state, meta = {}) {
  const now = Date.now();
  const nextEntry = { state, createdAt: now, exp: now + OAUTH_STATE_MAX_AGE_SEC * 1000, ...meta };
  const pending = [nextEntry, ...(await readOAuthStates(request, env)).filter((entry) => entry.state !== state)]
    .slice(0, MAX_PENDING_OAUTH_STATES);
  const maxExp = pending.reduce((best, entry) => Math.max(best, Number(entry.exp || 0)), nextEntry.exp);
  return buildCookie(
    OAUTH_STATE_COOKIE,
    await sealPayload({ pending, exp: maxExp }, env),
    { maxAge: OAUTH_STATE_MAX_AGE_SEC }
  );
}

export async function consumeOAuthState(request, env, state) {
  const pending = await readOAuthStates(request, env);
  const entry = pending.find((item) => item.state === state) || null;
  const remaining = pending.filter((item) => item.state !== state);
  if (!remaining.length) {
    return { entry, cookie: clearCookie(OAUTH_STATE_COOKIE) };
  }
  const maxExp = remaining.reduce((best, item) => Math.max(best, Number(item.exp || 0)), Date.now() + OAUTH_STATE_MAX_AGE_SEC * 1000);
  return {
    entry,
    cookie: buildCookie(
      OAUTH_STATE_COOKIE,
      await sealPayload({ pending: remaining, exp: maxExp }, env),
      { maxAge: OAUTH_STATE_MAX_AGE_SEC }
    )
  };
}
