import {
  WELCOME_CREDITS_GRANT_AMOUNT,
  guestTrialLoginForVisitorId,
  normalizeGuestTrialRequest
} from './shared.js';

export function guestTrialCurrentContext(guestTrial = {}) {
  const login = guestTrial.login || guestTrialLoginForVisitorId(guestTrial.visitorId);
  return {
    session: null,
    user: {
      login,
      name: 'Guest Trial',
      email: '',
      accountId: login ? `acct:${login}` : ''
    },
    login,
    authProvider: 'guest-trial',
    apiKeyStatus: 'guest-trial',
    apiKey: null,
    guestTrial
  };
}

export function guestTrialVisitorIdFromRequest(request) {
  try {
    const url = new URL(request.url);
    const queryValue = String(url.searchParams.get('visitor_id') || url.searchParams.get('visitorId') || '').trim();
    if (queryValue) return queryValue;
  } catch {}
  return String(request.headers.get('x-aiagent2-visitor-id') || '').trim();
}

export function annotateGuestTrialOrderBody(body = {}, guestTrial = {}) {
  const input = body.input && typeof body.input === 'object' ? body.input : {};
  return {
    ...body,
    budget_cap: Math.min(Number(body.budget_cap || 300), guestTrial.limit || WELCOME_CREDITS_GRANT_AMOUNT),
    guest_trial: {
      enabled: true,
      visitor_id: guestTrial.visitorId,
      visitor_hash: guestTrial.visitorHash,
      credit_limit: guestTrial.limit || WELCOME_CREDITS_GRANT_AMOUNT
    },
    input: {
      ...input,
      _broker: {
        ...((input && input._broker) || {}),
        guestTrial: {
          visitorHash: guestTrial.visitorHash,
          creditLimit: guestTrial.limit || WELCOME_CREDITS_GRANT_AMOUNT,
          signupDebit: true
        }
      }
    }
  };
}

export async function prepareGuestTrialOrderContext(storage, current, body, resolved) {
  const guestTrial = normalizeGuestTrialRequest(body);
  if (current?.user || current?.apiKeyStatus === 'valid' || !guestTrial.requested) {
    return { current, body, guestTrial: null };
  }
  if (current?.apiKeyStatus === 'invalid') {
    return { error: 'Invalid API key', statusCode: 401 };
  }
  return {
    error: 'Login required. Guest trial ordering is disabled. Sign in to receive $10 in welcome credits for the first runs.',
    code: 'login_required',
    statusCode: 401
  };
}

export async function handleGuestTrialClaim(storage, request, env) {
  return {
    error: 'Guest trial claim is disabled. First-time sign-in now grants $10 in welcome credits directly.',
    code: 'guest_trial_disabled',
    statusCode: 410
  };
}
