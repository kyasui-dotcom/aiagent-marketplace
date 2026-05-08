import { createHmac } from 'node:crypto';
import { expect } from '@playwright/test';

export const externalBaseUrl = String(process.env.E2E_BASE_URL || '').trim();
export const liveMode = Boolean(externalBaseUrl) && !/^https?:\/\/(?:127\.0\.0\.1|localhost)(?::|\/|$)/i.test(externalBaseUrl);
export const e2eAuthEmail = String(process.env.E2E_AUTH_EMAIL || 'e2e@aiagent-marketplace.net').trim().toLowerCase();
const localE2eAuthSecret = 'playwright-e2e-auth-secret';
const e2eAuthSecret = String(process.env.E2E_AUTH_SECRET || (liveMode ? '' : localE2eAuthSecret)).trim();
const emailAuthSecret = process.env.E2E_EMAIL_AUTH_SECRET || process.env.SESSION_SECRET || 'playwright-e2e-session-secret';
const canUseE2eAuth = Boolean(e2eAuthSecret);
const canUseEmailAuth = !liveMode || Boolean(process.env.E2E_EMAIL_AUTH_SECRET);

export const canUseAuth = canUseE2eAuth || canUseEmailAuth;
export const authSkipReason = liveMode
  ? 'Authenticated production E2E requires E2E_AUTH_SECRET or E2E_EMAIL_AUTH_SECRET.'
  : 'Authenticated local E2E is unavailable.';
export const chatResponseTimeout = liveMode ? 45_000 : 10_000;
const navigationTimeout = liveMode ? 30_000 : 15_000;
const authRequestTimeout = liveMode ? 30_000 : 15_000;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function gotoWithRetry(page, url, options = {}, attempts = liveMode ? 3 : 1) {
  let lastError = null;
  const gotoOptions = {
    ...options,
    timeout: options.timeout ?? navigationTimeout
  };
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await page.goto(url, gotoOptions);
    } catch (error) {
      lastError = error;
      const message = String(error?.message || error);
      const retryable = /ERR_ABORTED|ERR_NETWORK|ERR_CONNECTION|Timeout|frame was detached|navigation/i.test(message);
      if (!retryable || attempt >= attempts) throw error;
      await delay(500 * attempt);
    }
  }
  throw lastError;
}

async function verifyAuthWithRequest(page, url, attempts = liveMode ? 3 : 1) {
  let lastError = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await page.request.get(url, {
        failOnStatusCode: false,
        maxRedirects: 0,
        timeout: authRequestTimeout
      });
      const status = response.status();
      const location = response.headers().location || '';
      if (![301, 302, 303, 307, 308].includes(status)) {
        throw new Error(`Auth verification returned ${status}`);
      }
      if (/auth_error=/i.test(location)) {
        throw new Error(`Auth verification redirected to an error: ${location}`);
      }
      await applyAuthCookiesFromResponse(page, response).catch(() => {});
      return response;
    } catch (error) {
      lastError = error;
      const message = String(error?.message || error);
      const retryable = /ERR_ABORTED|ERR_NETWORK|ERR_CONNECTION|Timeout|frame was detached|navigation|ECONNRESET|ETIMEDOUT/i.test(message);
      if (!retryable || attempt >= attempts) throw error;
      await delay(500 * attempt);
    }
  }
  throw lastError;
}

async function applyAuthCookiesFromResponse(page, response) {
  const headers = typeof response.headersArray === 'function'
    ? response.headersArray()
    : Object.entries(response.headers()).map(([name, value]) => ({ name, value }));
  const setCookies = headers
    .filter((header) => String(header.name || '').toLowerCase() === 'set-cookie')
    .map((header) => String(header.value || '').trim())
    .filter(Boolean);
  if (!setCookies.length) return;
  const origin = new URL(response.url()).origin;
  const cookies = setCookies
    .map((header) => {
      const [pair = ''] = header.split(';');
      const separator = pair.indexOf('=');
      if (separator <= 0) return null;
      return {
        name: pair.slice(0, separator).trim(),
        value: pair.slice(separator + 1).trim(),
        url: origin,
        path: '/',
        httpOnly: /;\s*HttpOnly\b/i.test(header),
        secure: /;\s*Secure\b/i.test(header) || origin.startsWith('https:'),
        sameSite: /;\s*SameSite=None\b/i.test(header) ? 'None' : (/;\s*SameSite=Strict\b/i.test(header) ? 'Strict' : 'Lax')
      };
    })
    .filter(Boolean);
  if (cookies.length) await page.context().addCookies(cookies);
}

function signedToken(payload = {}, secret = '') {
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const signature = createHmac('sha256', secret).update(encoded).digest('base64url');
  return `${encoded}.${signature}`;
}

export function authVerificationPath(options = {}) {
  const returnTo = String(options.returnTo || '/chat').trim() || '/chat';
  const loginSource = String(options.loginSource || 'playwright_e2e').trim().toLowerCase() || 'playwright_e2e';
  const visitorId = String(options.visitorId || `${loginSource}_${Date.now().toString(36)}`).trim();
  if (canUseE2eAuth) {
    const token = signedToken({
      kind: 'e2e-auth',
      email: e2eAuthEmail,
      returnTo,
      loginSource,
      visitorId,
      exp: Date.now() + 10 * 60 * 1000
    }, e2eAuthSecret);
    return `/auth/e2e/verify?token=${encodeURIComponent(token)}`;
  }
  const email = options.email || `${loginSource}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.test`;
  const token = signedToken({
    kind: 'email-auth',
    email,
    returnTo,
    loginSource,
    visitorId,
    exp: Date.now() + 20 * 60 * 1000
  }, emailAuthSecret);
  return `/auth/email/verify?token=${encodeURIComponent(token)}`;
}

export async function openAuthenticatedChat(page, options = {}) {
  const target = String(options.returnTo || '/chat').trim() || '/chat';
  const verificationPath = authVerificationPath({
    ...options,
    returnTo: target
  });
  try {
    await verifyAuthWithRequest(page, verificationPath);
  } catch (error) {
    if (liveMode) throw error;
    await gotoWithRetry(page, verificationPath, { waitUntil: 'domcontentloaded' });
  }
  await gotoWithRetry(page, target, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#chatThread')).toBeVisible();
  await expect(page.locator('#promptInput')).toBeVisible();
  await expect(page.locator('#sendMessageBtn')).toBeVisible();
  await expect(page.locator('#authStatus')).toContainText(/Signed in as|ログイン|サインイン/, { timeout: liveMode ? 45_000 : 15_000 });
}
