export function createBillingRouteHandlers(deps = {}) {
  const {
    accountSettingsForLogin,
    baseUrl,
    betaBillingPausedResult,
    BILLING_DISPLAY_CURRENCY,
    billingPeriodId,
    billingPausedForBeta,
    createConnectedAccount,
    createConnectedAccountTransfer,
    createConnectOnboardingLink,
    createOffSessionMonthlyInvoicePaymentIntent,
    createOffSessionProviderMonthlyPaymentIntent,
    createSetupCheckoutSession,
    createSubscriptionCheckoutSession,
    currentStripeConfig,
    currentUserContext,
    displayCurrencyToLedgerAmount,
    ensureStripeCustomer,
    ledgerAmountToDisplayCurrency,
    nowIso,
    parseBody,
    runtimePolicy,
    sanitizeAccountSettingsForClient,
    providerIdentityStatus,
    providerMonthlyBillingLedgerForLogin,
    providerPayoutLedgerForLogin,
    recordProviderMonthlyChargeInAccount,
    retrieveConnectedAccount,
    stripeConfigured,
    stripeConnectedAccountIdentityStatus,
    stripeConnectedAccountPatch,
    stripeStateForClient,
    touchEvent,
    upsertAccountSettingsInState
  } = deps;

  async function getStripeStatus(storage, request, env) {
    const current = await currentUserContext(request, env);
    if (!current.user) return { error: 'Login required', statusCode: 401 };
    const account = typeof storage.getAccountByLogin === 'function'
      ? await storage.getAccountByLogin(current.login)
      : accountSettingsForLogin({ accounts: [] }, current.login, current.user, current.authProvider);
    const effectiveAccount = account || accountSettingsForLogin({ accounts: [] }, current.login, current.user, current.authProvider);
    return {
      stripe: {
        ...stripeStateForClient(request, env, effectiveAccount),
        billingPaused: billingPausedForBeta(env),
        billingActivationEnabled: runtimePolicy(env).billingActivationEnabled
      }
    };
  }

  async function ensureStripeCustomerForCurrent(storage, request, env, current) {
    const config = currentStripeConfig(request, env);
    if (!stripeConfigured(config)) return { error: 'Stripe is not configured', statusCode: 503, config };
    const state = await storage.getState();
    const account = accountSettingsForLogin(state, current.login, current.user, current.authProvider);
    if (account?.stripe?.customerId) return { config, account, customerId: account.stripe.customerId };
    const created = await ensureStripeCustomer(config, account);
    let updated = null;
    await storage.mutate(async (draft) => {
      updated = upsertAccountSettingsInState(draft, current.login, current.user, current.authProvider, {
        stripe: {
          ...(account.stripe || {}),
          customerId: created.customerId,
          customerStatus: 'ready',
          lastSyncAt: nowIso(),
          mode: 'configured'
        }
      });
    });
    return { config, account: updated, customerId: created.customerId };
  }

  async function createStripeSetupSessionForCurrent(storage, request, env) {
    const current = await currentUserContext(request, env);
    if (!current.user) return { error: 'Login required', statusCode: 401 };
    if (billingPausedForBeta(env)) return betaBillingPausedResult('Stripe payment-method setup is paused during beta.');
    const ensured = await ensureStripeCustomerForCurrent(storage, request, env, current);
    if (ensured.error) return ensured;
    const session = await createSetupCheckoutSession(ensured.config, {
      account: ensured.account,
      customerId: ensured.customerId,
      baseUrl: baseUrl(request, env)
    });
    await storage.mutate(async (draft) => {
      const account = accountSettingsForLogin(draft, current.login, current.user, current.authProvider);
      upsertAccountSettingsInState(draft, current.login, current.user, current.authProvider, {
        stripe: {
          ...(account.stripe || {}),
          customerId: ensured.customerId,
          customerStatus: 'ready',
          setupCheckoutStatus: 'started',
          setupCheckoutSessionId: session.id,
          lastSyncAt: nowIso(),
          mode: 'configured'
        }
      });
    });
    await touchEvent(storage, 'STRIPE', `${current.login} opened payment method setup`);
    return { ok: true, checkout_url: session.url, session_id: session.id };
  }

  async function createStripeSubscriptionSessionForCurrent(storage, request, env) {
    const current = await currentUserContext(request, env);
    if (!current.user) return { error: 'Login required', statusCode: 401 };
    if (billingPausedForBeta(env)) return betaBillingPausedResult('Stripe subscription checkout is paused during beta.');
    let body;
    try {
      body = await parseBody(request);
    } catch (error) {
      return { error: error.message, statusCode: 400 };
    }
    const ensured = await ensureStripeCustomerForCurrent(storage, request, env, current);
    if (ensured.error) return ensured;
    const plan = String(body?.plan || ensured.account?.billing?.subscriptionPlan || 'none').trim().toLowerCase();
    const session = await createSubscriptionCheckoutSession(ensured.config, {
      account: ensured.account,
      customerId: ensured.customerId,
      baseUrl: baseUrl(request, env),
      plan,
      priceId: body?.priceId || ''
    });
    await storage.mutate(async (draft) => {
      const account = accountSettingsForLogin(draft, current.login, current.user, current.authProvider);
      upsertAccountSettingsInState(draft, current.login, current.user, current.authProvider, {
        stripe: {
          ...(account.stripe || {}),
          customerId: ensured.customerId,
          customerStatus: 'ready',
          subscriptionStatus: 'started',
          subscriptionPlan: plan || account.stripe?.subscriptionPlan || 'none',
          lastSyncAt: nowIso(),
          mode: 'configured'
        }
      });
    });
    await touchEvent(storage, 'STRIPE', `${current.login} opened subscription checkout ${plan}`);
    return { ok: true, checkout_url: session.url, session_id: session.id, plan };
  }

  async function createStripeConnectOnboardingForCurrent(storage, request, env) {
    const current = await currentUserContext(request, env);
    if (!current.user) return { error: 'Login required', statusCode: 401 };
    if (!current.githubLinked) return { error: 'GitHub connection required for provider actions.', statusCode: 403 };
    const config = currentStripeConfig(request, env);
    if (!stripeConfigured(config)) return { error: 'Stripe is not configured', statusCode: 503 };
    const state = await storage.getState();
    const account = accountSettingsForLogin(state, current.login, current.user, current.authProvider);
    const existingConnectedAccountId = String(account?.stripe?.connectedAccountId || '').trim();
    if (existingConnectedAccountId) {
      const remoteAccount = await retrieveConnectedAccount(config, existingConnectedAccountId);
      const identity = stripeConnectedAccountIdentityStatus(remoteAccount);
      await storage.mutate(async (draft) => {
        const latest = accountSettingsForLogin(draft, current.login, current.user, current.authProvider);
        upsertAccountSettingsInState(draft, current.login, current.user, current.authProvider, {
          payout: {
            ...(latest.payout || {}),
            providerEnabled: true,
            minimumPayoutAmount: Number(latest.payout?.minimumPayoutAmount || 0) === 5000 ? displayCurrencyToLedgerAmount(10) : (latest.payout?.minimumPayoutAmount || displayCurrencyToLedgerAmount(10))
          },
          stripe: {
            ...(latest.stripe || {}),
            ...stripeConnectedAccountPatch(existingConnectedAccountId, remoteAccount)
          }
        });
      });
      if (identity.verified) {
        await touchEvent(storage, 'STRIPE', `${current.login} connect onboarding already complete`);
        return { ok: true, already_connected: true, account_id: existingConnectedAccountId, status: 'ready', identity_verification: identity };
      }
    }
    let connected;
    try {
      connected = await createConnectedAccount(config, { account, payout: account.payout || {} });
    } catch (error) {
      const message = String(error?.message || '');
      if (/signed up for Connect/i.test(message)) {
        return {
          error: 'Stripe Connect is not enabled on the CAIt platform account. Open https://dashboard.stripe.com/connect, complete Connect setup, then retry OPEN CONNECT.',
          code: 'connect_not_enabled',
          statusCode: 409
        };
      }
      throw error;
    }
    const link = await createConnectOnboardingLink(config, {
      connectedAccountId: connected.connectedAccountId,
      baseUrl: baseUrl(request, env)
    });
    await storage.mutate(async (draft) => {
      const latest = accountSettingsForLogin(draft, current.login, current.user, current.authProvider);
      upsertAccountSettingsInState(draft, current.login, current.user, current.authProvider, {
        payout: {
          ...(latest.payout || {}),
          providerEnabled: true,
          minimumPayoutAmount: Number(latest.payout?.minimumPayoutAmount || 0) === 5000 ? displayCurrencyToLedgerAmount(10) : (latest.payout?.minimumPayoutAmount || displayCurrencyToLedgerAmount(10))
        },
        stripe: {
          ...(latest.stripe || {}),
          ...(connected.account
            ? stripeConnectedAccountPatch(connected.connectedAccountId, connected.account)
            : {
                connectedAccountId: connected.connectedAccountId,
                connectedAccountStatus: connected.created ? 'pending' : (latest.stripe?.identityVerified ? 'ready' : 'pending'),
                identityVerified: false,
                identityVerificationStatus: 'verification_required',
                lastSyncAt: nowIso(),
                mode: 'configured'
              }),
          connectOnboardingStatus: 'started',
          identityVerified: false,
          identityVerificationStatus: 'verification_required'
        }
      });
    });
    await touchEvent(storage, 'STRIPE', `${current.login} opened connect onboarding`);
    return { ok: true, onboarding_url: link.url, account_id: connected.connectedAccountId };
  }

  async function createStripeProviderPayoutForCurrent(storage, request, env) {
    const current = await currentUserContext(request, env);
    if (!current.user) return { error: 'Login required', statusCode: 401 };
    if (!current.githubLinked) return { error: 'GitHub connection required for provider actions.', statusCode: 403 };
    if (billingPausedForBeta(env)) return betaBillingPausedResult('Provider payout movement is paused during beta.');
    const config = currentStripeConfig(request, env);
    if (!stripeConfigured(config)) return { error: 'Stripe is not configured', statusCode: 503 };
    let body;
    try {
      body = await parseBody(request);
    } catch (error) {
      return { error: error.message, statusCode: 400 };
    }
    const state = await storage.getState();
    const account = accountSettingsForLogin(state, current.login, current.user, current.authProvider);
    if (!account?.payout?.providerEnabled) {
      return { error: 'Enable provider profile before requesting payout.', statusCode: 400 };
    }
    const manualIdentityStatus = providerIdentityStatus(account);
    if (manualIdentityStatus !== 'approved') {
      return {
        error: manualIdentityStatus === 'rejected'
          ? 'CAIt provider identity verification was rejected. Resubmit identity information and photo before withdrawing earnings.'
          : 'CAIt provider identity verification and admin approval are required before provider earnings can be withdrawn.',
        code: 'provider_identity_admin_approval_required',
        identity_verification: {
          status: manualIdentityStatus,
          submitted_at: account?.payout?.identityVerification?.submittedAt || null,
          reviewed_at: account?.payout?.identityVerification?.reviewedAt || null,
          rejection_reason: account?.payout?.identityVerification?.rejectionReason || ''
        },
        statusCode: 409
      };
    }
    const connectedAccountId = String(account?.stripe?.connectedAccountId || '').trim();
    if (!connectedAccountId) {
      return { error: 'Open Connect first to create a connected payout account.', statusCode: 400 };
    }
    const remoteAccount = await retrieveConnectedAccount(config, connectedAccountId);
    const identity = stripeConnectedAccountIdentityStatus(remoteAccount);
    await storage.mutate(async (draft) => {
      const latest = accountSettingsForLogin(draft, current.login, current.user, current.authProvider);
      upsertAccountSettingsInState(draft, current.login, current.user, current.authProvider, {
        stripe: {
          ...(latest.stripe || {}),
          ...stripeConnectedAccountPatch(connectedAccountId, remoteAccount)
        }
      });
    });
    if (!identity.verified) {
      return {
        error: 'Payout-provider identity verification is required before provider earnings can be withdrawn. Finish OPEN CONNECT or RESUME CONNECT and resolve all payout account requirements.',
        code: 'identity_verification_required',
        onboarding_required: true,
        identity_verification: identity,
        statusCode: 409
      };
    }
    const latestState = await storage.getState();
    const latestAccount = accountSettingsForLogin(latestState, current.login, current.user, current.authProvider);
    const ledger = providerPayoutLedgerForLogin(latestState, current.login, latestAccount);
    const pendingBalance = Number(ledger.pendingBalance || 0);
    if (!(pendingBalance > 0)) {
      return { error: 'No provider payout balance is available yet.', statusCode: 400 };
    }
    const minimumPayoutAmount = Number(latestAccount?.payout?.minimumPayoutAmount || displayCurrencyToLedgerAmount(10));
    const requestedAmount = displayCurrencyToLedgerAmount(Number(body?.amount || 0));
    const payoutAmount = requestedAmount > 0 ? Math.min(requestedAmount, pendingBalance) : pendingBalance;
    if (!(payoutAmount > 0)) {
      return { error: 'Payout amount must be greater than zero.', statusCode: 400 };
    }
    if (payoutAmount < minimumPayoutAmount && !body?.force) {
      return {
        error: `Pending payout is below the minimum threshold (${minimumPayoutAmount}).`,
        code: 'minimum_payout_not_reached',
        pending_balance: pendingBalance,
        minimum_payout_amount: minimumPayoutAmount,
        statusCode: 409
      };
    }
    const period = billingPeriodId();
    const transfer = await createConnectedAccountTransfer(config, {
      account: latestAccount,
      connectedAccountId,
      amount: ledgerAmountToDisplayCurrency(payoutAmount),
      currency: BILLING_DISPLAY_CURRENCY,
      description: `CAIt provider payout ${period}`,
      metadata: {
        aiagent2_payout_period: period,
        aiagent2_payout_login: current.login,
        aiagent2_ledger_amount: String(payoutAmount)
      }
    });
    const payoutRun = {
      id: crypto.randomUUID(),
      transferId: transfer.id,
      amount: +payoutAmount.toFixed(1),
      currency: latestAccount?.payout?.currency || config.defaultCurrency || BILLING_DISPLAY_CURRENCY,
      period,
      status: 'paid',
      createdAt: nowIso()
    };
    let updated = null;
    await storage.mutate(async (draft) => {
      const draftAccount = accountSettingsForLogin(draft, current.login, current.user, current.authProvider);
      const priorRuns = Array.isArray(draftAccount?.payout?.payoutRuns) ? draftAccount.payout.payoutRuns : [];
      updated = upsertAccountSettingsInState(draft, current.login, current.user, current.authProvider, {
        payout: {
          ...(draftAccount.payout || {}),
          pendingBalance: Math.max(0, pendingBalance - payoutAmount),
          paidOutTotal: Number(draftAccount?.payout?.paidOutTotal || 0) + payoutAmount,
          lastPayoutAt: payoutRun.createdAt,
          lastPayoutAmount: payoutRun.amount,
          lastPayoutTransferId: payoutRun.transferId,
          payoutRuns: [payoutRun, ...priorRuns].slice(0, 100)
        },
        stripe: {
          ...(draftAccount.stripe || {}),
          ...stripeConnectedAccountPatch(connectedAccountId, remoteAccount)
        }
      });
    });
    await touchEvent(storage, 'PAYOUT', `${current.login} provider payout ${payoutAmount} -> ${transfer.id}`);
    return {
      ok: true,
      transfer_id: transfer.id,
      amount: payoutAmount,
      payout: payoutRun,
      pending_before: pendingBalance,
      pending_after: Math.max(0, pendingBalance - payoutAmount),
      account: sanitizeAccountSettingsForClient(updated)
    };
  }

  async function triggerStripeMonthlyInvoiceChargeForCurrent(storage, request, env) {
    const current = await currentUserContext(request, env);
    if (!current.user) return { error: 'Login required', statusCode: 401 };
    if (billingPausedForBeta(env)) return betaBillingPausedResult('Month-end Stripe charges are paused during beta.');
    let body;
    try {
      body = await parseBody(request);
    } catch (error) {
      return { error: error.message, statusCode: 400 };
    }
    const config = currentStripeConfig(request, env);
    if (!stripeConfigured(config)) return { error: 'Stripe is not configured', code: 'stripe_not_configured', statusCode: 503 };
    const state = await storage.getState();
    const account = accountSettingsForLogin(state, current.login, current.user, current.authProvider);
    if (String(account?.billing?.mode || '').toLowerCase() !== 'monthly_invoice') {
      return { error: 'Monthly billing is not selected for this account.', code: 'monthly_billing_not_selected', statusCode: 400 };
    }
    if (!account?.billing?.invoiceApproved) {
      return { error: 'Register a Stripe card before running month-end billing.', code: 'payment_method_missing', statusCode: 402 };
    }
    const customerId = account?.stripe?.customerId;
    const paymentMethodId = account?.stripe?.defaultPaymentMethodId;
    if (!customerId || !paymentMethodId) {
      return { error: 'Saved Stripe card is missing. Use REGISTER CARD first.', code: 'payment_method_missing', statusCode: 402 };
    }
    const arrearsTotal = Number(account?.billing?.arrearsTotal || 0);
    const requestedAmount = Number(body?.amount || 0) > 0 ? displayCurrencyToLedgerAmount(Number(body.amount || 0)) : arrearsTotal;
    const chargeAmount = Math.min(arrearsTotal, requestedAmount);
    if (!(chargeAmount > 0)) return { ok: true, amount: 0, skipped: true, reason: 'no_month_end_amount_due' };
    const period = String(body?.period || billingPeriodId()).trim() || billingPeriodId();
    const intent = await createOffSessionMonthlyInvoicePaymentIntent(config, {
      account,
      customerId,
      paymentMethodId,
      amount: ledgerAmountToDisplayCurrency(chargeAmount),
      currency: BILLING_DISPLAY_CURRENCY,
      ledgerAmount: chargeAmount,
      period
    });
    if (intent.status !== 'succeeded') {
      return { error: `Month-end charge did not complete (${intent.status})`, code: 'monthly_invoice_not_captured', statusCode: 402, intent_status: intent.status };
    }
    let updated = null;
    await storage.mutate(async (draft) => {
      const draftAccount = accountSettingsForLogin(draft, current.login, current.user, current.authProvider);
      const priorCharges = Array.isArray(draftAccount?.stripe?.monthlyInvoiceCharges) ? draftAccount.stripe.monthlyInvoiceCharges : [];
      const charge = {
        paymentIntentId: intent.id,
        amount: chargeAmount,
        currency: BILLING_DISPLAY_CURRENCY,
        period,
        status: intent.status,
        createdAt: nowIso()
      };
      updated = upsertAccountSettingsInState(draft, current.login, current.user, current.authProvider, {
        billing: {
          ...(draftAccount.billing || {}),
          arrearsTotal: Math.max(0, Number(draftAccount.billing?.arrearsTotal || 0) - chargeAmount)
        },
        stripe: {
          ...(draftAccount.stripe || {}),
          customerId,
          customerStatus: 'ready',
          defaultPaymentMethodId: paymentMethodId,
          defaultPaymentMethodStatus: 'ready',
          lastMonthlyInvoiceChargeAt: charge.createdAt,
          lastMonthlyInvoiceChargeAmount: chargeAmount,
          lastMonthlyInvoiceChargePeriod: period,
          monthlyInvoiceCharges: [charge, ...priorCharges].slice(0, 100),
          lastSyncAt: nowIso(),
          mode: 'configured'
        }
      });
    });
    await touchEvent(storage, 'STRIPE', `${current.login} month-end charge succeeded ${chargeAmount}`);
    return { ok: true, amount: chargeAmount, payment_intent_id: intent.id, account: sanitizeAccountSettingsForClient(updated) };
  }

  async function triggerStripeProviderMonthlyChargeForCurrent(storage, request, env) {
    const current = await currentUserContext(request, env);
    if (!current.user) return { error: 'Login required', statusCode: 401 };
    if (billingPausedForBeta(env)) return betaBillingPausedResult('Provider monthly Stripe charges are paused during beta.');
    let body;
    try {
      body = await parseBody(request);
    } catch (error) {
      return { error: error.message, statusCode: 400 };
    }
    const config = currentStripeConfig(request, env);
    if (!stripeConfigured(config)) return { error: 'Stripe is not configured', code: 'stripe_not_configured', statusCode: 503 };
    const state = await storage.getState();
    const account = accountSettingsForLogin(state, current.login, current.user, current.authProvider);
    const customerId = account?.stripe?.customerId;
    const paymentMethodId = account?.stripe?.defaultPaymentMethodId;
    if (!customerId || !paymentMethodId) {
      return { error: 'Saved Stripe card is missing. Use REGISTER CARD first.', code: 'payment_method_missing', statusCode: 402 };
    }
    const period = String(body?.period || billingPeriodId()).trim() || billingPeriodId();
    const providerLedger = providerMonthlyBillingLedgerForLogin(state, current.login, period, account);
    const dueAmount = Number(providerLedger.dueAmount || 0);
    const requestedAmount = Number(body?.amount || 0) > 0 ? displayCurrencyToLedgerAmount(Number(body.amount || 0)) : dueAmount;
    const chargeAmount = Math.min(dueAmount, requestedAmount);
    if (!(providerLedger.agentCount > 0)) {
      return { ok: true, amount: 0, skipped: true, reason: 'no_provider_subscription_agents', provider_monthly: providerLedger };
    }
    if (!(chargeAmount > 0)) {
      return { ok: true, amount: 0, skipped: true, reason: 'no_provider_monthly_amount_due', provider_monthly: providerLedger };
    }
    const intent = await createOffSessionProviderMonthlyPaymentIntent(config, {
      account,
      customerId,
      paymentMethodId,
      amount: ledgerAmountToDisplayCurrency(chargeAmount),
      currency: BILLING_DISPLAY_CURRENCY,
      ledgerAmount: chargeAmount,
      period
    });
    if (intent.status !== 'succeeded') {
      return {
        error: `Provider monthly charge did not complete (${intent.status})`,
        code: 'provider_monthly_not_captured',
        statusCode: 402,
        intent_status: intent.status
      };
    }
    const charge = {
      id: `provider_monthly_${intent.id}`,
      paymentIntentId: intent.id,
      amount: chargeAmount,
      currency: BILLING_DISPLAY_CURRENCY,
      period,
      status: 'succeeded',
      lineItems: providerLedger.agents,
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    let updated = null;
    await storage.mutate(async (draft) => {
      const draftAccount = accountSettingsForLogin(draft, current.login, current.user, current.authProvider);
      const history = recordProviderMonthlyChargeInAccount(draftAccount, charge);
      updated = upsertAccountSettingsInState(draft, current.login, current.user, current.authProvider, {
        stripe: {
          ...(draftAccount.stripe || {}),
          customerId,
          customerStatus: 'ready',
          defaultPaymentMethodId: paymentMethodId,
          defaultPaymentMethodStatus: 'ready',
          providerMonthlyCharges: history,
          lastProviderMonthlyChargeAt: charge.createdAt,
          lastProviderMonthlyChargeAmount: chargeAmount,
          lastProviderMonthlyChargePeriod: period,
          lastProviderMonthlyChargeStatus: 'succeeded',
          providerMonthlyRetryPeriod: null,
          providerMonthlyRetryCount: 0,
          providerMonthlyLastAttemptAt: charge.createdAt,
          providerMonthlyLastFailureAt: null,
          providerMonthlyLastFailureMessage: '',
          providerMonthlyLastNotificationAt: null,
          providerMonthlyLastNotificationPeriod: null,
          lastSyncAt: nowIso(),
          mode: 'configured'
        }
      });
    });
    const afterState = await storage.getState();
    const afterAccount = accountSettingsForLogin(afterState, current.login, current.user, current.authProvider);
    const afterLedger = providerMonthlyBillingLedgerForLogin(afterState, current.login, period, afterAccount);
    await touchEvent(storage, 'STRIPE', `${current.login} provider monthly charge succeeded ${chargeAmount} period=${period}`);
    return {
      ok: true,
      amount: chargeAmount,
      payment_intent_id: intent.id,
      period,
      provider_monthly: afterLedger,
      account: sanitizeAccountSettingsForClient(updated)
    };
  }

  return {
    createStripeConnectOnboardingForCurrent,
    createStripeProviderPayoutForCurrent,
    createStripeSetupSessionForCurrent,
    createStripeSubscriptionSessionForCurrent,
    getStripeStatus,
    triggerStripeMonthlyInvoiceChargeForCurrent,
    triggerStripeProviderMonthlyChargeForCurrent
  };
}
