export function createStripeWebhookHandlers(deps = {}) {
  const {
    accountSettingsForLogin,
    amountFromMinorUnits,
    applyStripeRefundToAccount,
    applySubscriptionRefillToAccount,
    BILLING_DISPLAY_CURRENCY,
    currentStripeConfig,
    nowIso,
    recordStripeTopupInAccount,
    resolveSubscriptionPlanFromPriceId,
    retrievePaymentIntent,
    retrieveSetupIntent,
    retrieveSubscription,
    stripeConfigured,
    stripeConnectedAccountPatch,
    touchEvent,
    updateCustomerDefaultPaymentMethod,
    upsertAccountSettingsInState,
    verifyStripeWebhookSignature
  } = deps;

  async function applyStripeWebhookEvent(storage, request, env, event) {
    const object = event?.data?.object || {};
    let metadata = object?.metadata || {};
    let login = String(metadata.aiagent2_account_login || '').trim().toLowerCase();
    let inferredKind = String(metadata.aiagent2_kind || '').trim().toLowerCase();
    let paymentIntent = null;
    if (event.type === 'charge.refunded' && object.payment_intent) {
      try {
        paymentIntent = await retrievePaymentIntent(currentStripeConfig(request, env), object.payment_intent);
        const paymentIntentMetadata = paymentIntent?.metadata || {};
        metadata = { ...paymentIntentMetadata, ...metadata };
        if (!login) login = String(paymentIntentMetadata.aiagent2_account_login || '').trim().toLowerCase();
        if (!inferredKind) inferredKind = String(paymentIntentMetadata.aiagent2_kind || '').trim().toLowerCase();
      } catch {}
    }
    if (!login && object.customer) {
      const state = await storage.getState();
      const matched = (state.accounts || []).find((item) => String(item?.stripe?.customerId || '').trim() === String(object.customer || '').trim());
      if (matched?.login) login = String(matched.login || '').trim().toLowerCase();
    }
    if (!login) return { ok: true, ignored: true };
    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      if (metadata.aiagent2_kind === 'deposit_topup') {
        if (event.type === 'checkout.session.completed' && String(object.payment_status || '').toLowerCase() !== 'paid') {
          return { ok: true, ignored: true, pending: true };
        }
        const amount = Number(metadata.aiagent2_ledger_amount || 0) > 0
          ? Number(metadata.aiagent2_ledger_amount || 0)
          : amountFromMinorUnits(object.amount_total || 0, metadata.aiagent2_currency || BILLING_DISPLAY_CURRENCY);
        let updated = null;
        let duplicate = false;
        await storage.mutate(async (draft) => {
          const account = accountSettingsForLogin(draft, login);
          const processed = Array.isArray(account.stripe?.processedTopupCheckoutSessionIds)
            ? account.stripe.processedTopupCheckoutSessionIds.map((item) => String(item || ''))
            : [];
          if (processed.includes(String(object.id || ''))) {
            duplicate = true;
            updated = account;
            return;
          }
          const topupHistory = recordStripeTopupInAccount(account, {
            kind: 'deposit_topup',
            checkoutSessionId: object.id,
            paymentIntentId: String(object.payment_intent || ''),
            amount,
            currency: metadata.aiagent2_currency || account.billing?.currency || BILLING_DISPLAY_CURRENCY,
            createdAt: nowIso(),
            updatedAt: nowIso()
          });
          updated = upsertAccountSettingsInState(draft, login, null, 'github-app', {
            billing: {
              ...(account.billing || {}),
              depositBalance: Number(account.billing?.depositBalance || 0) + amount
            },
            stripe: {
              ...(account.stripe || {}),
              customerId: object.customer || account.stripe?.customerId || null,
              customerStatus: object.customer ? 'ready' : account.stripe?.customerStatus || 'not_started',
              lastTopupCheckoutSessionId: object.id,
              pendingTopupCheckoutSessionId: String(account.stripe?.pendingTopupCheckoutSessionId || '') === String(object.id || '') ? null : account.stripe?.pendingTopupCheckoutSessionId || null,
              processedTopupCheckoutSessionIds: [...processed.filter(Boolean), String(object.id || '')].slice(-20),
              lastTopupAmount: amount,
              lastTopupCurrency: metadata.aiagent2_currency || account.billing?.currency || BILLING_DISPLAY_CURRENCY,
              lastTopupAt: nowIso(),
              topupHistory,
              lastSyncAt: nowIso(),
              mode: 'configured'
            }
          });
        });
        if (duplicate) return { ok: true, ignored: true, duplicate: true };
        if (object.payment_intent && updated?.stripe?.customerId) {
          try {
            const config = currentStripeConfig(request, env);
            const paymentIntent = await retrievePaymentIntent(config, object.payment_intent);
            if (paymentIntent?.payment_method) {
              await updateCustomerDefaultPaymentMethod(config, updated.stripe.customerId, paymentIntent.payment_method);
              await storage.mutate(async (draft) => {
                const account = accountSettingsForLogin(draft, login);
                upsertAccountSettingsInState(draft, login, null, 'github-app', {
                  billing: {
                    ...(account.billing || {}),
                    invoiceEnabled: true,
                    invoiceApproved: true
                  },
                  stripe: {
                    ...(account.stripe || {}),
                    defaultPaymentMethodId: paymentIntent.payment_method,
                    defaultPaymentMethodStatus: 'ready',
                    customerId: updated.stripe.customerId,
                    customerStatus: 'ready',
                    lastSyncAt: nowIso()
                  }
                });
              });
            }
          } catch {}
        }
        await touchEvent(storage, 'STRIPE', `${login} legacy prepaid balance completed ${amount}`);
        return { ok: true };
      }
      if (metadata.aiagent2_kind === 'payment_method_setup' && object.setup_intent) {
        const config = currentStripeConfig(request, env);
        const setupIntent = await retrieveSetupIntent(config, object.setup_intent);
        const paymentMethodId = setupIntent?.payment_method || '';
        if (object.customer && paymentMethodId) {
          await updateCustomerDefaultPaymentMethod(config, object.customer, paymentMethodId);
          await storage.mutate(async (draft) => {
            const account = accountSettingsForLogin(draft, login);
            upsertAccountSettingsInState(draft, login, null, 'github-app', {
              billing: {
                ...(account.billing || {}),
                mode: 'monthly_invoice',
                invoiceEnabled: true,
                invoiceApproved: true
              },
              stripe: {
                ...(account.stripe || {}),
                customerId: object.customer,
                customerStatus: 'ready',
                defaultPaymentMethodId: paymentMethodId,
                defaultPaymentMethodStatus: 'ready',
                setupCheckoutStatus: 'completed',
                setupCheckoutSessionId: object.id,
                lastSyncAt: nowIso(),
                mode: 'configured'
              }
            });
          });
          await touchEvent(storage, 'STRIPE', `${login} saved payment method`);
        }
        return { ok: true };
      }
      if (metadata.aiagent2_kind === 'subscription_checkout') {
        const config = currentStripeConfig(request, env);
        const subscription = object.subscription ? await retrieveSubscription(config, object.subscription) : null;
        const priceId = subscription?.items?.data?.[0]?.price?.id || '';
        const plan = resolveSubscriptionPlanFromPriceId(config, priceId) || metadata.aiagent2_plan || 'none';
        const currentPeriodEnd = subscription?.current_period_end ? new Date(Number(subscription.current_period_end) * 1000).toISOString() : null;
        let refill = { granted: false, amount: 0, billingPatch: null, stripePatch: null };
        await storage.mutate(async (draft) => {
          const account = accountSettingsForLogin(draft, login);
          if ((subscription?.status === 'active' || subscription?.status === 'trialing') && currentPeriodEnd) {
            refill = applySubscriptionRefillToAccount(account, {
              plan,
              periodEnd: currentPeriodEnd,
              at: nowIso()
            });
          }
          upsertAccountSettingsInState(draft, login, null, 'github-app', {
            billing: refill.granted ? {
              ...(account.billing || {}),
              ...(refill.billingPatch || {}),
              subscriptionPlan: plan || account.billing?.subscriptionPlan || 'none',
              subscriptionIncludedCredits: refill.amount > 0 ? refill.amount : account.billing?.subscriptionIncludedCredits || 0
            } : undefined,
            stripe: {
              ...(account.stripe || {}),
              ...(refill.stripePatch || {}),
              customerId: object.customer || account.stripe?.customerId || null,
              customerStatus: object.customer ? 'ready' : account.stripe?.customerStatus || 'not_started',
              subscriptionId: object.subscription || account.stripe?.subscriptionId || null,
              subscriptionStatus: subscription?.status || (object.subscription ? 'active' : 'pending'),
              subscriptionPriceId: priceId || account.stripe?.subscriptionPriceId || null,
              subscriptionPlan: plan || account.stripe?.subscriptionPlan || 'none',
              subscriptionCurrentPeriodEnd: currentPeriodEnd || account.stripe?.subscriptionCurrentPeriodEnd || null,
              lastSyncAt: nowIso(),
              mode: 'configured'
            }
          });
        });
        await touchEvent(storage, 'STRIPE', refill.granted ? `${login} subscription checkout completed + refill ${refill.amount}` : `${login} subscription checkout completed`);
        return { ok: true };
      }
    }
    if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.created' || event.type === 'customer.subscription.deleted') {
      const config = currentStripeConfig(request, env);
      const priceId = object.items?.data?.[0]?.price?.id || '';
      const inferredPlan = resolveSubscriptionPlanFromPriceId(config, priceId);
      const activePlan = inferredPlan !== 'none'
        ? inferredPlan
        : String(object.metadata?.aiagent2_plan || '').trim().toLowerCase() || String(object.plan?.nickname || '').trim().toLowerCase() || 'none';
      const currentPeriodEnd = object.current_period_end ? new Date(Number(object.current_period_end) * 1000).toISOString() : null;
      let refill = { granted: false, amount: 0, billingPatch: null, stripePatch: null, plan: activePlan, periodEnd: currentPeriodEnd };
      await storage.mutate(async (draft) => {
        const account = accountSettingsForLogin(draft, login);
        if ((object.status === 'active' || object.status === 'trialing') && currentPeriodEnd) {
          refill = applySubscriptionRefillToAccount(account, {
            plan: activePlan,
            periodEnd: currentPeriodEnd,
            at: nowIso()
          });
        }
        upsertAccountSettingsInState(draft, login, null, 'github-app', {
          billing: refill.granted ? {
            ...(account.billing || {}),
            ...(refill.billingPatch || {}),
            subscriptionPlan: activePlan !== 'none' ? activePlan : account.billing?.subscriptionPlan || 'none',
            subscriptionIncludedCredits: refill.amount > 0 ? refill.amount : account.billing?.subscriptionIncludedCredits || 0
          } : {
            ...(account.billing || {}),
            subscriptionPlan: activePlan !== 'none' ? activePlan : account.billing?.subscriptionPlan || 'none'
          },
          stripe: {
            ...(account.stripe || {}),
            ...(refill.stripePatch || {}),
            customerId: object.customer || account.stripe?.customerId || null,
            subscriptionId: object.id || account.stripe?.subscriptionId || null,
            subscriptionStatus: object.status || (event.type.endsWith('deleted') ? 'canceled' : account.stripe?.subscriptionStatus || 'not_started'),
            subscriptionPriceId: priceId || account.stripe?.subscriptionPriceId || null,
            subscriptionPlan: activePlan !== 'none' ? activePlan : account.stripe?.subscriptionPlan || 'none',
            subscriptionCurrentPeriodEnd: currentPeriodEnd || account.stripe?.subscriptionCurrentPeriodEnd || null,
            lastSyncAt: nowIso(),
            mode: 'configured'
          }
        });
      });
      if (refill.granted) await touchEvent(storage, 'STRIPE', `${login} subscription refill added ${refill.amount}`);
      return { ok: true };
    }
    if (event.type === 'account.updated') {
      const connectedAccountId = object.id;
      const state = await storage.getState();
      const matched = (state.accounts || []).find((item) => item?.stripe?.connectedAccountId === connectedAccountId);
      if (matched?.login) {
        await storage.mutate(async (draft) => {
          const account = accountSettingsForLogin(draft, matched.login);
          upsertAccountSettingsInState(draft, matched.login, null, 'github-app', {
            stripe: {
              ...(account.stripe || {}),
              ...stripeConnectedAccountPatch(connectedAccountId, object)
            }
          });
        });
        return { ok: true };
      }
    }
    if (event.type === 'charge.refunded') {
      const refundKind = inferredKind || String(metadata.aiagent2_kind || '').trim().toLowerCase();
      if (!['deposit_topup', 'auto_topup_charge'].includes(refundKind)) return { ok: true, ignored: true };
      const originalLedgerAmount = Number(metadata.aiagent2_ledger_amount || 0) > 0
        ? Number(metadata.aiagent2_ledger_amount || 0)
        : amountFromMinorUnits(object.amount || 0, metadata.aiagent2_currency || paymentIntent?.currency || BILLING_DISPLAY_CURRENCY);
      const refundedAmount = Number(object.amount || 0) > 0
        ? +(originalLedgerAmount * (Number(object.amount_refunded || 0) / Number(object.amount || 1))).toFixed(1)
        : amountFromMinorUnits(object.amount_refunded || 0, metadata.aiagent2_currency || paymentIntent?.currency || BILLING_DISPLAY_CURRENCY);
      if (!(refundedAmount > 0)) return { ok: true, ignored: true };
      let outcome = { delta: 0, deficit: 0, blocked: false, availableDeposit: 0, requiredDeposit: 0 };
      await storage.mutate(async (draft) => {
        const account = accountSettingsForLogin(draft, login);
        const applied = applyStripeRefundToAccount(account, {
          kind: refundKind,
          paymentIntentId: String(object.payment_intent || paymentIntent?.id || ''),
          chargeId: String(object.id || ''),
          amount: originalLedgerAmount,
          amountRefunded: refundedAmount,
          currency: metadata.aiagent2_currency || paymentIntent?.currency || BILLING_DISPLAY_CURRENCY,
          updatedAt: nowIso()
        });
        outcome = applied;
        if (applied.blocked || !(applied.delta > 0)) return;
        upsertAccountSettingsInState(draft, login, null, 'github-app', {
          billing: applied.billingPatch,
          stripe: {
            ...applied.stripePatch,
            customerId: String(object.customer || account.stripe?.customerId || ''),
            customerStatus: object.customer ? 'ready' : account.stripe?.customerStatus || 'not_started',
            lastSyncAt: nowIso(),
            mode: 'configured'
          }
        });
      });
      if (outcome.blocked) {
        await touchEvent(
          storage,
          'STRIPE',
          `${login} refund blocked insufficient deposit ${outcome.availableDeposit}/${outcome.requiredDeposit}`
        );
        return { ok: true, blocked: true };
      }
      if (outcome.delta > 0) {
        await touchEvent(
          storage,
          'STRIPE',
          `${login} refund recorded ${outcome.delta}`
        );
      }
      return { ok: true };
    }
    return { ok: true, ignored: true };
  }

  async function handleStripeWebhook(storage, request, env) {
    const config = currentStripeConfig(request, env);
    if (!stripeConfigured(config)) return { error: 'Stripe is not configured', statusCode: 503 };
    const payload = await request.text();
    await verifyStripeWebhookSignature(payload, request.headers.get('stripe-signature') || '', config.webhookSecret);
    const event = JSON.parse(payload || '{}');
    const result = await applyStripeWebhookEvent(storage, request, env, event);
    return { ok: true, received: true, result };
  }

  return {
    applyStripeWebhookEvent,
    handleStripeWebhook
  };
}
