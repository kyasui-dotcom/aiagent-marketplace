const PAYJP_TENANT_READY_STATUSES = new Set(['active', 'approved', 'ready', 'enabled', 'verified', 'live']);
const PAYJP_TENANT_REVIEW_STARTED_STATUSES = new Set(['started', 'submitted', 'pending', 'pending_review', 'under_review', 'reviewing', 'active', 'approved', 'ready', 'enabled', 'verified', 'live']);

export function createBillingHelpers(deps = {}) {
  const {
    baseUrl,
    billingPeriodId,
    billingProfileForAccount,
    normalizePayjpLocale,
    payjpConfigFromEnv,
    payjpPublicConfig,
    providerIdentityStatus,
    providerMonthlyBillingAutoConfig,
    runtimePolicy,
    sessionAuthProvider,
    stripeConfigFromEnv,
    stripePublicConfig,
    validateEmailAddress
  } = deps;

  function currentStripeConfig(request, env) {
    return stripeConfigFromEnv(env || {}, { baseUrl: baseUrl(request, env) });
  }

  function stripeStateForClient(request, env, account = null) {
    const config = currentStripeConfig(request, env);
    const providerAuto = providerMonthlyBillingAutoConfig(env);
    return {
      ...stripePublicConfig(config),
      accountStripe: account?.stripe || null,
      billingProfile: billingProfileForAccount(account, '', billingPeriodId()),
      providerMonthlyAutoEnabled: providerAuto.enabled,
      providerMonthlyMaxAttempts: providerAuto.maxAttempts
    };
  }

  function stripeActionErrorPayload(error = {}, fallback = 'Stripe action failed.') {
    const message = String(error?.message || fallback).trim() || fallback;
    const details = error?.details && typeof error.details === 'object' ? error.details : {};
    const stripeCode = String(details?.error?.code || error?.code || '').trim();
    const lower = `${message} ${stripeCode}`.toLowerCase();
    let code = stripeCode || 'stripe_action_failed';
    let action = '';
    if (/not configured/.test(lower)) {
      code = 'stripe_not_configured';
      action = 'Set Stripe environment variables on the platform, then retry.';
    } else if (/invalid email|email address/.test(lower)) {
      code = 'stripe_invalid_email';
      action = 'Open SETTINGS, update the billing/provider email, save, then retry.';
    } else if (/connect.*not enabled|signed up for connect/.test(lower)) {
      code = 'connect_not_enabled';
      action = 'Complete Stripe Connect activation on the platform account, then retry OPEN CONNECT.';
    } else if (/restricted|prohibited|not allowed|unsupported business|risk/.test(lower)) {
      code = 'stripe_restricted_business';
      action = 'Confirm the platform business category and remove Stripe-prohibited use cases before retrying.';
    } else if (/api key|authentication/.test(lower)) {
      code = 'stripe_authentication_failed';
      action = 'Check that the Stripe secret key exists and matches the Stripe account mode.';
    }
    return {
      error: message,
      code,
      action: action || undefined,
      stripe_status: Number(error?.statusCode || 0) || undefined,
      statusCode: Number(error?.statusCode || 0) || 500
    };
  }

  function cleanRegistrationIdentityField(value = '', max = 240) {
    return String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
  }

  function payjpTenantStatusForAccount(account = null) {
    return cleanRegistrationIdentityField(account?.payjp?.tenantStatus || 'not_started', 80).toLowerCase() || 'not_started';
  }

  function payjpTenantApplicationStatusForAccount(account = null) {
    return cleanRegistrationIdentityField(account?.payjp?.tenantApplicationStatus || 'not_started', 80).toLowerCase() || 'not_started';
  }

  function payjpTenantReviewStarted(account = null) {
    if (cleanRegistrationIdentityField(account?.payjp?.tenantId, 120)) return true;
    if (cleanRegistrationIdentityField(account?.payjp?.tenantApplicationUrl, 800)) return true;
    return PAYJP_TENANT_REVIEW_STARTED_STATUSES.has(payjpTenantApplicationStatusForAccount(account));
  }

  function payjpTenantReady(account = null) {
    return PAYJP_TENANT_READY_STATUSES.has(payjpTenantStatusForAccount(account));
  }

  function providerRegistrationBillingStatus(current = {}, account = null) {
    const authProvider = String(current?.authProvider || sessionAuthProvider(current?.session) || '').trim().toLowerCase();
    if (authProvider === 'e2e') {
      return {
        ok: true,
        missing: [],
        paymentMethodReady: true,
        providerIdentityApproved: true,
        payjpTenantReviewStarted: true,
        payjpTenantReady: true,
        payjpTenantStatus: 'ready',
        payjpTenantApplicationUrl: null,
        authProvider
      };
    }
    const billing = account?.billing && typeof account.billing === 'object' ? account.billing : {};
    const missing = [];
    const legalName = cleanRegistrationIdentityField(billing.legalName || billing.companyName);
    const billingEmail = cleanRegistrationIdentityField(billing.billingEmail).toLowerCase();
    if (!legalName) missing.push('legalNameOrCompanyName');
    if (!billingEmail || !validateEmailAddress(billingEmail)) missing.push('billingEmail');
    if (!cleanRegistrationIdentityField(billing.billingPhone, 80)) missing.push('billingPhone');
    if (!cleanRegistrationIdentityField(billing.billingPostalCode, 40)) missing.push('billingPostalCode');
    if (!cleanRegistrationIdentityField(billing.billingRegion, 120)) missing.push('billingRegion');
    if (!cleanRegistrationIdentityField(billing.billingCity, 120)) missing.push('billingCity');
    if (!cleanRegistrationIdentityField(billing.billingAddressLine1, 240)) missing.push('billingAddressLine1');
    if (!cleanRegistrationIdentityField(billing.country, 8)) missing.push('country');
    const stripeReady = Boolean(account?.stripe?.defaultPaymentMethodId || String(account?.stripe?.defaultPaymentMethodStatus || '').toLowerCase() === 'ready');
    const payjpCardReady = Boolean(account?.payjp?.customerId && String(account?.payjp?.defaultCardStatus || '').toLowerCase() === 'ready');
    const paymentMethodReady = stripeReady || payjpCardReady;
    if (!paymentMethodReady) missing.push('billingPaymentMethod');
    const providerIdentityApproved = providerIdentityStatus(account) === 'approved';
    if (!providerIdentityApproved) missing.push('providerIdentityApproved');
    const payjpReviewStarted = payjpTenantReviewStarted(account);
    const payjpTenantIsReady = payjpTenantReady(account);
    if (!payjpTenantIsReady) missing.push('payjpTenantReady');
    return {
      ok: missing.length === 0,
      missing,
      paymentMethodReady,
      providerIdentityApproved,
      payjpTenantReviewStarted: payjpReviewStarted,
      payjpTenantReady: payjpTenantIsReady,
      payjpTenantStatus: payjpTenantStatusForAccount(account),
      payjpTenantApplicationUrl: account?.payjp?.tenantApplicationUrl || null,
      identityReady: missing.every((field) => field === 'billingPaymentMethod' || field === 'providerIdentityApproved' || field === 'payjpTenantReady'),
      authProvider
    };
  }

  async function providerMoneyReadinessForCurrent(storage, current = {}) {
    if (!current?.user && current?.apiKeyStatus !== 'valid') return null;
    let account = current?.account || null;
    if (current?.apiKeyStatus !== 'valid' && current?.login && typeof storage?.getAccountByLogin === 'function') {
      account = await storage.getAccountByLogin(current.login);
    }
    const status = providerRegistrationBillingStatus(current, account);
    return {
      ready: status.ok,
      money_actions_blocked: !status.ok,
      missing_billing_fields: status.missing,
      payment_method_ready: Boolean(status.paymentMethodReady),
      provider_identity_approved: Boolean(status.providerIdentityApproved),
      payjp_tenant_review_started: Boolean(status.payjpTenantReviewStarted),
      payjp_tenant_ready: Boolean(status.payjpTenantReady),
      payjp_tenant_status: status.payjpTenantStatus || 'not_started',
      payjp_tenant_application_url: status.payjpTenantApplicationUrl || null,
      next_step: status.ok
        ? 'Provider money actions are available when each payment provider also accepts the requested action.'
        : 'Agent registration is allowed, but provider money actions stay locked until SETTINGS -> PAYMENTS has billing details and a saved card, PROVIDER IDENTITY is admin-approved, and PAY.JP tenant onboarding/review is complete.'
    };
  }

  function billingPausedForBeta(env = {}) {
    return runtimePolicy(env).billingPaused === true;
  }

  function betaBillingPausedResult(action = 'billing') {
    return {
      ok: false,
      paused: true,
      code: 'beta_billing_paused',
      error: 'CAIt is currently in beta. Account registration and agent workflows are available, but live billing, charges, checkout, and payout movement are paused.',
      action,
      activation: 'Set BILLING_ACTIVATION_ENABLED=1, or BETA_BILLING_PAUSED=0, to reactivate billing.',
      statusCode: 409
    };
  }

  function currentPayjpConfig(_request, env) {
    return payjpConfigFromEnv(env || {});
  }

  function payjpLocaleFromRequest(request = null, env = {}, body = null) {
    const config = currentPayjpConfig(request, env);
    let queryLocale = '';
    try {
      queryLocale = request ? new URL(request.url).searchParams.get('locale') || '' : '';
    } catch {
      queryLocale = '';
    }
    const headerLocale = request?.headers?.get('x-cait-locale') || request?.headers?.get('accept-language') || '';
    const bodyLocale = body?.locale || body?.language || body?.payjp_locale || body?.payjpLocale || '';
    return normalizePayjpLocale(bodyLocale || queryLocale || headerLocale, config.defaultLocale || 'ja');
  }

  function payjpLocalizedCopy(locale = 'ja') {
    const safeLocale = normalizePayjpLocale(locale, 'ja');
    const copy = {
      ja: {
        locale: 'ja',
        integration_mode: 'api_localized_cait_ui',
        card_setup_title: 'カード登録',
        card_setup_body: 'カード番号はCAItサーバーへ送らず、PAY.JPのトークン化APIで処理します。',
        tenant_onboarding_title: 'PAY.JPテナント審査',
        tenant_onboarding_body: 'CAIt側は日本語/英語で案内できます。PAY.JP側の申請画面は日本語中心の可能性があるため、CAItのガイドに沿って入力してください。',
        three_d_secure_title: '3Dセキュア認証',
        three_d_secure_body: '本人認証画面はPAY.JPまたはカード会社側で表示されます。完了後にCAItへ戻って決済を確定します。',
        money_locked_until_review: 'エージェント登録はできますが、請求情報、保存済みカード、admin承認済み本人確認、PAY.JPテナント審査が揃うまで金銭処理はロックされます。'
      },
      en: {
        locale: 'en',
        integration_mode: 'api_localized_cait_ui',
        card_setup_title: 'Card setup',
        card_setup_body: 'Card numbers are not sent to CAIt servers. CAIt uses PAY.JP tokenization APIs.',
        tenant_onboarding_title: 'PAY.JP tenant review',
        tenant_onboarding_body: 'CAIt can guide this flow in English or Japanese. PAY.JP-hosted application screens may remain Japanese-centric, so follow the CAIt guidance while completing the provider review.',
        three_d_secure_title: '3-D Secure authentication',
        three_d_secure_body: 'The authentication screen is shown by PAY.JP or the card issuer. Return to CAIt after completion to finalize the payment.',
        money_locked_until_review: 'Agent registration is allowed, but money actions stay locked until billing details, saved card, admin-approved identity, and PAY.JP tenant review are complete.'
      }
    };
    return copy[safeLocale] || copy.ja;
  }

  function payjpReturnToUrl(request = null, env = {}, fallbackPath = '/chat?payjp=tenant-return&section=provider') {
    const root = baseUrl(request, env);
    const target = new URL(fallbackPath, root);
    return target.toString();
  }

  function payjpApplicationUrlWithReturnTo(applicationUrl = '', request = null, env = {}, returnTo = '') {
    const raw = String(applicationUrl || '').trim();
    if (!raw) return null;
    try {
      const url = new URL(raw);
      if (!url.searchParams.get('return_to')) {
        url.searchParams.set('return_to', returnTo || payjpReturnToUrl(request, env));
      }
      return url.toString();
    } catch {
      return raw;
    }
  }

  function payjpStateForClient(_request, env, account = null) {
    const config = currentPayjpConfig(_request, env);
    const locale = payjpLocaleFromRequest(_request, env);
    return {
      ...payjpPublicConfig(config),
      locale,
      payjpJsLocale: locale,
      i18n: payjpLocalizedCopy(locale),
      accountPayjp: account?.payjp || null,
      billingProfile: billingProfileForAccount(account, '', billingPeriodId())
    };
  }

  function payjpLocalizedActionText(code = '', locale = 'ja', fallback = '') {
    const safeLocale = normalizePayjpLocale(locale, 'ja');
    const table = {
      payjp_not_configured: {
        ja: {
          error: 'PAY.JPのプラットフォーム設定が未完了です。',
          action: 'PAYJP_SECRET_KEY と PAYJP_PUBLIC_KEY をCloudflareのsecretに設定してから再実行してください。'
        },
        en: {
          error: 'PAY.JP platform configuration is incomplete.',
          action: 'Set PAYJP_SECRET_KEY and PAYJP_PUBLIC_KEY as platform secrets, then retry.'
        }
      },
      payjp_authentication_failed: {
        ja: {
          error: 'PAY.JPの認証に失敗しました。',
          action: 'PAY.JP Platformアカウントのsecret keyかどうか確認してください。'
        },
        en: {
          error: 'PAY.JP authentication failed.',
          action: 'Check that the secret key belongs to the PAY.JP Platform account.'
        }
      },
      payjp_tenant_review_required: {
        ja: {
          error: 'PAY.JPテナント審査が完了していません。',
          action: 'PAY.JPテナント申請URLを開き、審査完了後にマーケットプレイス決済を有効化してください。'
        },
        en: {
          error: 'PAY.JP tenant review is not complete.',
          action: 'Open the PAY.JP tenant application URL and finish tenant review before accepting marketplace payments.'
        }
      },
      payjp_3ds_required: {
        ja: {
          error: '3Dセキュア認証が必要です。',
          action: 'カード会社の本人認証を完了してから決済を確定してください。'
        },
        en: {
          error: '3-D Secure authentication is required.',
          action: 'Complete cardholder authentication before finalizing the payment.'
        }
      },
      payjp_action_failed: {
        ja: {
          error: fallback || 'PAY.JP処理に失敗しました。',
          action: '入力内容とPAY.JP Platform設定を確認してから再実行してください。'
        },
        en: {
          error: fallback || 'PAY.JP action failed.',
          action: 'Check the input and PAY.JP Platform configuration, then retry.'
        }
      }
    };
    return table[code]?.[safeLocale] || table.payjp_action_failed[safeLocale] || table.payjp_action_failed.ja;
  }

  function payjpActionErrorPayload(error = {}, fallback = 'PAY.JP action failed.', locale = 'ja') {
    const message = String(error?.message || fallback).trim() || fallback;
    const details = error?.details && typeof error.details === 'object' ? error.details : {};
    const payjpCode = String(details?.error?.code || error?.code || '').trim();
    const lower = `${message} ${payjpCode}`.toLowerCase();
    let code = payjpCode || 'payjp_action_failed';
    let action = '';
    if (/not configured/.test(lower)) {
      code = 'payjp_not_configured';
      action = 'Set PAYJP_SECRET_KEY and PAYJP_PUBLIC_KEY on the platform, then retry.';
    } else if (/authentication|api key/.test(lower)) {
      code = 'payjp_authentication_failed';
      action = 'Check that the PAY.JP secret key belongs to the Platform account.';
    } else if (/tenant|application|review|審査/.test(lower)) {
      code = 'payjp_tenant_review_required';
      action = 'Open the PAY.JP tenant application URL and finish tenant review before accepting marketplace payments.';
    } else if (/3d|secure|tds|three/.test(lower)) {
      code = 'payjp_3ds_required';
      action = 'Complete EMV 3-D Secure authentication before finalizing the payment.';
    }
    const localized = payjpLocalizedActionText(code, locale, message);
    const safeLocale = normalizePayjpLocale(locale, 'ja');
    return {
      error: message,
      code,
      locale: safeLocale,
      localized_error: localized.error,
      action: action || undefined,
      localized_action: localized.action,
      i18n: {
        [safeLocale]: localized
      },
      payjp_status: Number(error?.statusCode || 0) || undefined,
      statusCode: Number(error?.statusCode || 0) || 500
    };
  }

  return {
    betaBillingPausedResult,
    billingPausedForBeta,
    cleanRegistrationIdentityField,
    currentPayjpConfig,
    currentStripeConfig,
    payjpActionErrorPayload,
    payjpApplicationUrlWithReturnTo,
    payjpLocaleFromRequest,
    payjpLocalizedActionText,
    payjpLocalizedCopy,
    payjpReturnToUrl,
    payjpStateForClient,
    payjpTenantApplicationStatusForAccount,
    payjpTenantReady,
    payjpTenantReviewStarted,
    payjpTenantStatusForAccount,
    providerMoneyReadinessForCurrent,
    providerRegistrationBillingStatus,
    stripeActionErrorPayload,
    stripeStateForClient
  };
}
