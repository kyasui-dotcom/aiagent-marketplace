export function createAccountEventHelpers(deps = {}) {
  const {
    accountSettingsForLogin,
    buildReadableCookie,
    conversionEventPayload,
    eventCookieName,
    makeEvent,
    nowIso,
    upsertAccountSettingsInState
  } = deps;

  async function touchEvent(storage, type, message, meta = {}) {
    const event = makeEvent(type, message, meta);
    if (typeof storage.appendEvent === 'function') {
      await storage.appendEvent(event);
      return event;
    }
    await storage.mutate(async (draft) => {
      if (!Array.isArray(draft.events)) draft.events = [];
      draft.events.push(event);
    });
    return event;
  }

  async function mutateAccountByLogin(storage, login, mutator) {
    const safeLogin = String(login || '').trim().toLowerCase();
    if (safeLogin && typeof storage.mutateAccount === 'function') {
      return storage.mutateAccount(safeLogin, mutator);
    }
    return storage.mutate(mutator);
  }

  function authAnalyticsProviderName(authProvider = 'guest') {
    const value = String(authProvider || '').trim().toLowerCase();
    if (value.includes('email')) return 'email';
    if (value.includes('google')) return 'google';
    if (value.includes('github')) return 'github';
    return '';
  }

  function ga4AuthEventCookieForAccount(request, authProvider = 'guest', account = null, meta = {}) {
    const provider = authAnalyticsProviderName(authProvider);
    if (!provider || !account) return '';
    const accountCreated = account?.__authAccountCreated === true;
    const payload = JSON.stringify({
      event: accountCreated ? 'sign_up' : 'login',
      provider,
      status: accountCreated ? 'created' : 'existing',
      source: String(meta?.source || 'auth_callback').slice(0, 60),
      ts: Date.now()
    });
    let secure = true;
    try {
      secure = new URL(request.url).protocol === 'https:';
    } catch {}
    return buildReadableCookie(eventCookieName, payload, { maxAge: 600, secure });
  }

  async function trackAuthConversionEvent(storage, eventName, context = {}, meta = {}) {
    const payload = conversionEventPayload({
      event: eventName,
      meta
    }, {
      loggedIn: Boolean(context?.loggedIn),
      authProvider: context?.authProvider || 'guest',
      login: context?.login || ''
    });
    if (payload?.error) return null;
    return touchEvent(storage, 'TRACK', payload.message, payload.meta);
  }

  async function trackAuthLoginCompletion(storage, authProvider, account = null, meta = {}) {
    const provider = authAnalyticsProviderName(authProvider);
    if (!provider) return null;
    return trackAuthConversionEvent(storage, `${provider}_login_completed`, {
      loggedIn: true,
      authProvider,
      login: account?.login || ''
    }, meta);
  }

  async function trackAuthLoginFailure(storage, authProvider, meta = {}) {
    const provider = authAnalyticsProviderName(authProvider);
    if (!provider) return null;
    return trackAuthConversionEvent(storage, `${provider}_login_failed`, {
      loggedIn: false,
      authProvider,
      login: meta?.login || ''
    }, meta);
  }

  async function claimSignupWelcomeEmailAttempt(storage, account, user = null, authProvider = 'guest') {
    const safeLogin = String(account?.login || '').trim().toLowerCase();
    if (!safeLogin) return { claimed: false, account };
    let claimed = false;
    let nextAccount = account || null;
    const attemptedAt = nowIso();
    const seedUser = user ? { ...user, login: safeLogin } : { login: safeLogin };
    await mutateAccountByLogin(storage, safeLogin, async (draft) => {
      const latest = accountSettingsForLogin(draft, safeLogin, seedUser, authProvider);
      if (String(latest?.billing?.signupWelcomeEmailAttemptedAt || '').trim()) {
        nextAccount = latest;
        return;
      }
      nextAccount = upsertAccountSettingsInState(draft, safeLogin, seedUser, authProvider, {
        billing: {
          ...(latest?.billing || {}),
          signupWelcomeEmailAttemptedAt: attemptedAt
        }
      });
      claimed = true;
    });
    return { claimed, account: nextAccount };
  }

  return {
    authAnalyticsProviderName,
    claimSignupWelcomeEmailAttempt,
    ga4AuthEventCookieForAccount,
    mutateAccountByLogin,
    touchEvent,
    trackAuthConversionEvent,
    trackAuthLoginCompletion,
    trackAuthLoginFailure
  };
}
