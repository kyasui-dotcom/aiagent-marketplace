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
  await page.goto(authVerificationPath({
    ...options,
    returnTo: target
  }), { waitUntil: 'domcontentloaded' });
  await page.goto(target, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#chatThread')).toBeVisible();
  await expect(page.locator('#promptInput')).toBeVisible();
  await expect(page.locator('#sendMessageBtn')).toBeVisible();
  await expect(page.locator('#authStatus')).toContainText(/Signed in as|ログイン|サインイン/, { timeout: 15_000 });
}
