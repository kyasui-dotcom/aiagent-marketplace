export function createBillingHelpers(deps = {}) {
  const {
    baseUrl,
    billingPeriodId,
    billingProfileForAccount,
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

  function providerRegistrationBillingStatus(current = {}, account = null) {
    const authProvider = String(current?.authProvider || sessionAuthProvider(current?.session) || '').trim().toLowerCase();
    if (authProvider === 'e2e') {
      return {
        ok: true,
        missing: [],
        paymentMethodReady: true,
        providerIdentityApproved: true,
        manualProviderSettlement: true,
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
    const paymentMethodReady = stripeReady;
    if (!paymentMethodReady) missing.push('billingPaymentMethod');
    const providerIdentityApproved = providerIdentityStatus(account) === 'approved';
    if (!providerIdentityApproved) missing.push('providerIdentityApproved');
    return {
      ok: missing.length === 0,
      missing,
      paymentMethodReady,
      providerIdentityApproved,
      manualProviderSettlement: true,
      identityReady: missing.every((field) => field === 'billingPaymentMethod' || field === 'providerIdentityApproved'),
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
      manual_provider_settlement: Boolean(status.manualProviderSettlement),
      next_step: status.ok
        ? 'Provider earnings can be reviewed for CAIt manual settlement while automated marketplace payouts remain disabled.'
        : 'Agent registration is allowed, but provider money actions stay locked until SETTINGS -> PAYMENTS has billing details and a saved Stripe card and PROVIDER IDENTITY is admin-approved.'
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

  return {
    betaBillingPausedResult,
    billingPausedForBeta,
    cleanRegistrationIdentityField,
    currentStripeConfig,
    providerMoneyReadinessForCurrent,
    providerRegistrationBillingStatus,
    stripeActionErrorPayload,
    stripeStateForClient
  };
}
