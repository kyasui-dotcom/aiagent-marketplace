export function providerMonthlyBillingAutoConfig(env) {
  const enabledRaw = String(env?.PROVIDER_MONTHLY_BILLING_AUTO_ENABLED ?? '1').trim().toLowerCase();
  const enabled = !['0', 'false', 'off', 'disabled'].includes(enabledRaw);
  const maxAttempts = Math.max(1, Number(env?.PROVIDER_MONTHLY_BILLING_MAX_ATTEMPTS || env?.PROVIDER_MONTHLY_BILLING_MAX_RETRIES || 3) || 3);
  return { enabled, maxAttempts };
}

export function createBillingSweepHandlers(deps = {}) {
  const {
    accountSettingsForLogin,
    billingPausedForBeta,
    billingPeriodId,
    BILLING_DISPLAY_CURRENCY,
    createFeedbackReport,
    createOffSessionProviderMonthlyPaymentIntent,
    forwardFeedbackReportEmail,
    ledgerAmountToDisplayCurrency,
    nowIso,
    platformAdminLogins,
    providerMonthlyBillingLedgerForLogin,
    recordProviderMonthlyChargeInAccount,
    stripeConfigFromEnv,
    stripeConfigured,
    touchEvent,
    upsertAccountSettingsInState
  } = deps;

  function buildProviderMonthlyFailureReport(login, account, period, chargeAmount, failureMessage, attempt, maxAttempts) {
    const billingEmail = String(account?.billing?.billingEmail || account?.payout?.supportEmail || account?.payout?.payoutEmail || '').trim();
    return createFeedbackReport({
      type: 'other',
      title: `Provider monthly billing failed for ${login}`,
      message: [
        `Provider monthly SaaS billing failed after ${attempt}/${maxAttempts} attempts.`,
        `Account: ${login}`,
        `Period: ${period}`,
        `Amount due: $${ledgerAmountToDisplayCurrency(chargeAmount).toFixed(2)}`,
        `Failure: ${String(failureMessage || 'Unknown Stripe error').slice(0, 500)}`,
        'Action: review the saved Stripe card or provider monthly pricing setup, then retry from Settings -> Provider.'
      ].join('\n'),
      email: billingEmail
    }, {
      reporterLogin: login,
      pagePath: '/api/stripe/provider-monthly-charge/run',
      source: 'provider_monthly_billing_auto_retry'
    });
  }

  async function sendProviderMonthlyFailureNotification(env, payload = {}) {
    const report = buildProviderMonthlyFailureReport(
      payload.login,
      payload.account,
      payload.period,
      payload.chargeAmount,
      payload.failureMessage,
      payload.attempt,
      payload.maxAttempts
    );
    return forwardFeedbackReportEmail(report, env);
  }

  async function runProviderMonthlyBillingSweep(storage, env, options = {}) {
    if (billingPausedForBeta(env)) {
      return { ok: true, skipped: true, reason: 'beta_billing_paused', results: [] };
    }
    const config = providerMonthlyBillingAutoConfig(env);
    if (!config.enabled) {
      return { ok: true, skipped: true, reason: 'provider_monthly_auto_disabled', results: [] };
    }
    const admins = new Set(platformAdminLogins(env));
    const results = [];
    const initialState = await storage.getState();
    const accounts = Array.isArray(initialState?.accounts) ? initialState.accounts : [];
    const period = billingPeriodId(options.at || nowIso());
    const stripe = stripeConfigFromEnv(env, { baseUrl: env?.PRIMARY_BASE_URL || env?.BASE_URL });
    if (!stripeConfigured(stripe)) {
      return { ok: true, skipped: true, reason: 'stripe_not_configured', period, results: [] };
    }
    for (const sourceAccount of accounts) {
      const login = String(sourceAccount?.login || '').trim().toLowerCase();
      if (!login || admins.has(login)) continue;
      const state = await storage.getState();
      const account = accountSettingsForLogin(state, login);
      const ledger = providerMonthlyBillingLedgerForLogin(state, login, period, account);
      const customerId = account?.stripe?.customerId;
      const paymentMethodId = account?.stripe?.defaultPaymentMethodId;
      if (!(ledger.agentCount > 0) || !(ledger.dueAmount > 0) || !customerId || !paymentMethodId) continue;
      const retryPeriod = String(account?.stripe?.providerMonthlyRetryPeriod || '').trim();
      const retryCount = Number(account?.stripe?.providerMonthlyRetryCount || 0) || 0;
      const notificationPeriod = String(account?.stripe?.providerMonthlyLastNotificationPeriod || '').trim();
      if (retryPeriod === period && retryCount >= config.maxAttempts && notificationPeriod === period) {
        results.push({ login, status: 'skipped', reason: 'retry_limit_notified', attemptCount: retryCount, dueAmount: ledger.dueAmount });
        continue;
      }
      const attemptAt = nowIso();
      const chargeAmount = Number(ledger.dueAmount || 0);
      try {
        const intent = await createOffSessionProviderMonthlyPaymentIntent(stripe, {
          account,
          customerId,
          paymentMethodId,
          amount: ledgerAmountToDisplayCurrency(chargeAmount),
          currency: BILLING_DISPLAY_CURRENCY,
          ledgerAmount: chargeAmount,
          period
        });
        if (intent.status !== 'succeeded') {
          const error = new Error(`Provider monthly charge did not complete (${intent.status})`);
          error.code = 'provider_monthly_not_captured';
          error.intentStatus = intent.status;
          error.intent = intent;
          throw error;
        }
        const charge = {
          id: `provider_monthly_${intent.id}`,
          paymentIntentId: intent.id,
          amount: chargeAmount,
          currency: BILLING_DISPLAY_CURRENCY,
          period,
          status: 'succeeded',
          lineItems: ledger.agents,
          createdAt: attemptAt,
          updatedAt: attemptAt
        };
        await storage.mutate(async (draft) => {
          const draftAccount = accountSettingsForLogin(draft, login);
          const history = recordProviderMonthlyChargeInAccount(draftAccount, charge);
          upsertAccountSettingsInState(draft, login, null, draftAccount?.authProvider || 'guest', {
            stripe: {
              ...(draftAccount.stripe || {}),
              customerId,
              customerStatus: 'ready',
              defaultPaymentMethodId: paymentMethodId,
              defaultPaymentMethodStatus: 'ready',
              providerMonthlyCharges: history,
              lastProviderMonthlyChargeAt: attemptAt,
              lastProviderMonthlyChargeAmount: chargeAmount,
              lastProviderMonthlyChargePeriod: period,
              lastProviderMonthlyChargeStatus: 'succeeded',
              providerMonthlyRetryPeriod: null,
              providerMonthlyRetryCount: 0,
              providerMonthlyLastAttemptAt: attemptAt,
              providerMonthlyLastFailureAt: null,
              providerMonthlyLastFailureMessage: '',
              providerMonthlyLastNotificationAt: null,
              providerMonthlyLastNotificationPeriod: null,
              lastSyncAt: attemptAt,
              mode: 'configured'
            }
          });
        });
        results.push({ login, status: 'succeeded', attemptCount: retryPeriod === period ? retryCount + 1 : 1, amount: chargeAmount });
        await touchEvent(storage, 'STRIPE', `${login} provider monthly auto charge succeeded ${chargeAmount} period=${period}`);
      } catch (error) {
        const attemptCount = retryPeriod === period ? retryCount + 1 : 1;
        const failureMessage = String(error?.message || error || 'Provider monthly charge failed').slice(0, 240);
        const intentId = String(error?.intent?.id || error?.details?.error?.payment_intent?.id || '').trim();
        const attemptStatus = String(error?.intentStatus || error?.intent?.status || error?.details?.error?.code || 'failed').trim().toLowerCase() || 'failed';
        let notification = { ok: false, skipped: true, status: 'not_needed' };
        const shouldNotify = attemptCount >= config.maxAttempts && notificationPeriod !== period;
        if (shouldNotify) {
          notification = await sendProviderMonthlyFailureNotification(env, {
            login,
            account,
            period,
            chargeAmount,
            failureMessage,
            attempt: attemptCount,
            maxAttempts: config.maxAttempts
          });
        }
        await storage.mutate(async (draft) => {
          const draftAccount = accountSettingsForLogin(draft, login);
          const history = recordProviderMonthlyChargeInAccount(draftAccount, {
            id: intentId ? `provider_monthly_${intentId}` : undefined,
            paymentIntentId: intentId || undefined,
            amount: chargeAmount,
            currency: BILLING_DISPLAY_CURRENCY,
            period,
            status: attemptStatus,
            lineItems: ledger.agents,
            createdAt: attemptAt,
            updatedAt: attemptAt
          });
          upsertAccountSettingsInState(draft, login, null, draftAccount?.authProvider || 'guest', {
            stripe: {
              ...(draftAccount.stripe || {}),
              customerId,
              customerStatus: draftAccount?.stripe?.customerStatus || 'ready',
              defaultPaymentMethodId: paymentMethodId,
              defaultPaymentMethodStatus: draftAccount?.stripe?.defaultPaymentMethodStatus || 'ready',
              providerMonthlyCharges: history,
              lastProviderMonthlyChargeAt: attemptAt,
              lastProviderMonthlyChargeAmount: chargeAmount,
              lastProviderMonthlyChargePeriod: period,
              lastProviderMonthlyChargeStatus: attemptStatus,
              providerMonthlyRetryPeriod: period,
              providerMonthlyRetryCount: attemptCount,
              providerMonthlyLastAttemptAt: attemptAt,
              providerMonthlyLastFailureAt: attemptAt,
              providerMonthlyLastFailureMessage: failureMessage,
              providerMonthlyLastNotificationAt: shouldNotify ? attemptAt : (draftAccount?.stripe?.providerMonthlyLastNotificationAt || null),
              providerMonthlyLastNotificationPeriod: shouldNotify ? period : (draftAccount?.stripe?.providerMonthlyLastNotificationPeriod || null),
              lastSyncAt: attemptAt,
              mode: 'configured'
            }
          });
        });
        results.push({
          login,
          status: 'failed',
          attemptCount,
          dueAmount: chargeAmount,
          notified: Boolean(shouldNotify),
          notificationStatus: notification.status || '',
          error: failureMessage
        });
        await touchEvent(storage, 'FAILED', `${login} provider monthly auto charge failed (${attemptCount}/${config.maxAttempts}) ${failureMessage}`, {
          login,
          period,
          attemptCount,
          maxAttempts: config.maxAttempts,
          notified: Boolean(shouldNotify),
          notificationStatus: notification.status || '',
          error: failureMessage
        });
        if (shouldNotify) {
          await touchEvent(storage, 'STRIPE', `${login} provider monthly auto charge notification ${notification.ok ? 'sent' : notification.status || 'skipped'} period=${period}`, {
            login,
            period,
            attemptCount,
            notificationStatus: notification.status || '',
            notificationError: notification.ok ? '' : (notification.error || '')
          });
        }
      }
    }
    return {
      ok: true,
      period,
      checked: accounts.length,
      processed: results.length,
      succeeded: results.filter((item) => item.status === 'succeeded').length,
      failed: results.filter((item) => item.status === 'failed').length,
      results
    };
  }

  return {
    runProviderMonthlyBillingSweep
  };
}
