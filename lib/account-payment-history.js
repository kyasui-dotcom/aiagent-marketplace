import { randomUUID } from 'node:crypto';
import { normalizeString } from './account-identity-state.js';
import { normalizeAgentPricingModel } from './agent-pricing.js';
import {
  BILLING_DISPLAY_CURRENCY,
  billingPeriodId,
  normalizeCurrency,
  normalizeMoney,
  normalizeSubscriptionPlan,
  subscriptionRefillAmountForPlan
} from './billing-policy.js';
import { nowIso } from './events.js';

function normalizeStripeTopupRecord(record = {}) {
  return {
    id: normalizeString(record.id || record.paymentIntentId || record.checkoutSessionId || record.chargeId || `topup_${randomUUID()}`),
    kind: normalizeString(record.kind || 'deposit_topup').toLowerCase(),
    checkoutSessionId: normalizeString(record.checkoutSessionId),
    paymentIntentId: normalizeString(record.paymentIntentId),
    chargeId: normalizeString(record.chargeId),
    amount: normalizeMoney(record.amount, 0),
    refundedAmount: normalizeMoney(record.refundedAmount, 0),
    currency: normalizeCurrency(record.currency, BILLING_DISPLAY_CURRENCY),
    createdAt: normalizeString(record.createdAt, nowIso()),
    updatedAt: normalizeString(record.updatedAt, nowIso())
  };
}

function normalizeProviderMonthlyChargeLineItem(item = {}) {
  return {
    agentId: normalizeString(item.agentId || item.agent_id),
    agentName: normalizeString(item.agentName || item.agent_name),
    pricingModel: normalizeAgentPricingModel(item.pricingModel || item.pricing_model),
    monthlyPrice: normalizeMoney(item.monthlyPrice ?? item.monthly_price ?? 0, 0),
    marketplaceFee: normalizeMoney(item.marketplaceFee ?? item.marketplace_fee ?? 0, 0),
    providerNet: normalizeMoney(item.providerNet ?? item.provider_net ?? 0, 0)
  };
}

function normalizeProviderMonthlyChargeRecord(record = {}) {
  const lineItems = Array.isArray(record.lineItems || record.line_items)
    ? (record.lineItems || record.line_items).map(normalizeProviderMonthlyChargeLineItem).filter((item) => item.agentId)
    : [];
  const status = normalizeString(record.status || 'succeeded').toLowerCase();
  return {
    id: normalizeString(record.id || record.paymentIntentId || record.payment_intent_id || `provider_monthly_${randomUUID()}`),
    paymentIntentId: normalizeString(record.paymentIntentId || record.payment_intent_id),
    amount: normalizeMoney(record.amount, 0),
    currency: normalizeCurrency(record.currency, BILLING_DISPLAY_CURRENCY),
    period: normalizeString(record.period, billingPeriodId()),
    status: status || 'succeeded',
    lineItems,
    createdAt: normalizeString(record.createdAt, nowIso()),
    updatedAt: normalizeString(record.updatedAt, nowIso())
  };
}

export function providerMonthlyChargeHistoryForAccount(account = null) {
  return Array.isArray(account?.stripe?.providerMonthlyCharges)
    ? account.stripe.providerMonthlyCharges.map(normalizeProviderMonthlyChargeRecord).slice(-100)
    : [];
}

function findProviderMonthlyChargeRecordIndex(history = [], ids = {}) {
  const paymentIntentId = normalizeString(ids.paymentIntentId);
  const id = normalizeString(ids.id);
  return history.findIndex((record) => (
    (paymentIntentId && record.paymentIntentId === paymentIntentId) ||
    (id && record.id === id)
  ));
}

export function recordProviderMonthlyChargeInAccount(account = null, entry = {}) {
  const history = providerMonthlyChargeHistoryForAccount(account);
  const nextRecord = normalizeProviderMonthlyChargeRecord({
    ...entry,
    createdAt: entry.createdAt || nowIso(),
    updatedAt: entry.updatedAt || nowIso()
  });
  const index = findProviderMonthlyChargeRecordIndex(history, nextRecord);
  if (index === -1) return [...history, nextRecord].slice(-100);
  history[index] = normalizeProviderMonthlyChargeRecord({
    ...history[index],
    ...nextRecord,
    createdAt: history[index].createdAt || nextRecord.createdAt,
    updatedAt: nextRecord.updatedAt || nowIso()
  });
  return history.slice(-100);
}

function stripeTopupHistoryForAccount(account = null) {
  return Array.isArray(account?.stripe?.topupHistory)
    ? account.stripe.topupHistory.map(normalizeStripeTopupRecord).slice(-50)
    : [];
}

function findStripeTopupRecordIndex(history = [], ids = {}) {
  const checkoutSessionId = normalizeString(ids.checkoutSessionId);
  const paymentIntentId = normalizeString(ids.paymentIntentId);
  const chargeId = normalizeString(ids.chargeId);
  return history.findIndex((record) => (
    (checkoutSessionId && record.checkoutSessionId === checkoutSessionId) ||
    (paymentIntentId && record.paymentIntentId === paymentIntentId) ||
    (chargeId && record.chargeId === chargeId)
  ));
}

export function recordStripeTopupInAccount(account = null, entry = {}) {
  const history = stripeTopupHistoryForAccount(account);
  const nextRecord = normalizeStripeTopupRecord({
    ...entry,
    refundedAmount: entry.refundedAmount ?? 0,
    createdAt: entry.createdAt || nowIso(),
    updatedAt: entry.updatedAt || nowIso()
  });
  const index = findStripeTopupRecordIndex(history, nextRecord);
  if (index === -1) return [...history, nextRecord].slice(-50);
  const current = history[index];
  history[index] = normalizeStripeTopupRecord({
    ...current,
    ...nextRecord,
    refundedAmount: current.refundedAmount,
    createdAt: current.createdAt || nextRecord.createdAt,
    updatedAt: nextRecord.updatedAt || nowIso()
  });
  return history.slice(-50);
}

export function applyStripeRefundToAccount(account = null, refund = {}) {
  const paymentIntentId = normalizeString(refund.paymentIntentId);
  const checkoutSessionId = normalizeString(refund.checkoutSessionId);
  const chargeId = normalizeString(refund.chargeId);
  const amountRefunded = normalizeMoney(refund.amountRefunded, 0);
  if (!(amountRefunded > 0)) {
    return { matched: false, delta: 0, deficit: 0, billingPatch: account?.billing || {}, stripePatch: account?.stripe || {} };
  }
  const history = stripeTopupHistoryForAccount(account);
  const index = findStripeTopupRecordIndex(history, { paymentIntentId, checkoutSessionId, chargeId });
  const fallbackCurrency = normalizeCurrency(refund.currency, account?.billing?.currency || BILLING_DISPLAY_CURRENCY);
  const record = index === -1
    ? normalizeStripeTopupRecord({
      kind: normalizeString(refund.kind || 'deposit_topup').toLowerCase(),
      paymentIntentId,
      checkoutSessionId,
      chargeId,
      amount: normalizeMoney(refund.amount, amountRefunded),
      refundedAmount: 0,
      currency: fallbackCurrency,
      createdAt: refund.createdAt || nowIso(),
      updatedAt: refund.updatedAt || nowIso()
    })
    : history[index];
  const priorRefunded = normalizeMoney(record.refundedAmount, 0);
  const delta = normalizeMoney(amountRefunded - priorRefunded, 0);
  if (!(delta > 0)) {
    return { matched: index !== -1, blocked: false, delta: 0, deficit: 0, availableDeposit: normalizeMoney(account?.billing?.depositBalance, 0), requiredDeposit: 0, billingPatch: account?.billing || {}, stripePatch: account?.stripe || {} };
  }
  const availableDeposit = normalizeMoney(account?.billing?.depositBalance, 0);
  if (availableDeposit < delta) {
    return {
      matched: index !== -1,
      blocked: true,
      delta: 0,
      deficit: 0,
      availableDeposit,
      requiredDeposit: delta,
      billingPatch: account?.billing || {},
      stripePatch: account?.stripe || {}
    };
  }
  if (index === -1) history.push(record);
  const targetIndex = index === -1 ? history.length - 1 : index;
  history[targetIndex] = normalizeStripeTopupRecord({
    ...history[targetIndex],
    kind: normalizeString(refund.kind || history[targetIndex].kind || 'deposit_topup').toLowerCase(),
    paymentIntentId: paymentIntentId || history[targetIndex].paymentIntentId,
    checkoutSessionId: checkoutSessionId || history[targetIndex].checkoutSessionId,
    chargeId: chargeId || history[targetIndex].chargeId,
    amount: normalizeMoney(refund.amount, history[targetIndex].amount),
    refundedAmount: amountRefunded,
    currency: fallbackCurrency || history[targetIndex].currency,
    updatedAt: refund.updatedAt || nowIso()
  });
  const deduction = delta;
  const deficit = 0;
  const billingPatch = {
    ...(account?.billing || {}),
    depositBalance: normalizeMoney(availableDeposit - deduction, 0),
    arrearsTotal: normalizeMoney(account?.billing?.arrearsTotal, 0)
  };
  const stripePatch = {
    ...(account?.stripe || {}),
    topupHistory: history.slice(-50)
  };
  return { matched: true, blocked: false, delta, deficit, availableDeposit, requiredDeposit: delta, billingPatch, stripePatch };
}

export function applySubscriptionRefillToAccount(account = null, refill = {}) {
  const plan = normalizeSubscriptionPlan(refill.plan || account?.stripe?.subscriptionPlan, 'none');
  const amount = normalizeMoney(refill.amount ?? subscriptionRefillAmountForPlan(plan), 0);
  const periodEnd = normalizeString(refill.periodEnd || account?.stripe?.subscriptionCurrentPeriodEnd);
  const previousPeriodEnd = normalizeString(account?.stripe?.lastSubscriptionFundingPeriodEnd);
  if (plan === 'none' || !(amount > 0) || !periodEnd || periodEnd === previousPeriodEnd) {
    return {
      granted: false,
      amount: 0,
      plan,
      periodEnd,
      billingPatch: account?.billing || {},
      stripePatch: account?.stripe || {}
    };
  }
  return {
    granted: true,
    amount,
    plan,
    periodEnd,
    billingPatch: {
      ...(account?.billing || {}),
      depositBalance: normalizeMoney(Number(account?.billing?.depositBalance || 0) + amount, 0)
    },
    stripePatch: {
      ...(account?.stripe || {}),
      subscriptionPlan: plan,
      subscriptionCurrentPeriodEnd: periodEnd,
      lastSubscriptionFundingPeriodEnd: periodEnd,
      lastSubscriptionFundingAmount: amount,
      lastSubscriptionFundingAt: normalizeString(refill.at, nowIso())
    }
  };
}
