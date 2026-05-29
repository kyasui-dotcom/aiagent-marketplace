import { createHash } from 'node:crypto';
import { nowIso } from './events.js';

export function billingPeriodId(value = nowIso()) {
  const date = new Date(value || nowIso());
  if (Number.isNaN(date.getTime())) return billingPeriodId(nowIso());
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function monthWindow(period = billingPeriodId()) {
  const match = String(period || '').match(/^(\d{4})-(\d{2})$/);
  if (!match) return monthWindow(billingPeriodId());
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const start = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0));
  const endExclusive = new Date(Date.UTC(year, monthIndex + 1, 1, 0, 0, 0, 0));
  const endInclusive = new Date(endExclusive.getTime() - 1);
  return { start, endExclusive, endInclusive };
}

function normalizeString(value, fallback = '') {
  const text = String(value ?? fallback).trim();
  return text;
}

export function normalizeUiLanguage(value, fallback = 'en') {
  const text = normalizeString(value).toLowerCase().replace(/_/g, '-');
  if (text.startsWith('ja')) return 'ja';
  if (text.startsWith('en')) return 'en';
  return fallback;
}

export function normalizeCountry(value, fallback = 'JP') {
  const text = normalizeString(value, fallback).toUpperCase();
  return text || fallback;
}

export function normalizeCurrency(value, fallback = BILLING_DISPLAY_CURRENCY) {
  const text = normalizeString(value, fallback).toUpperCase();
  return text || fallback;
}

export const BILLING_DISPLAY_CURRENCY = 'USD';
export const BILLING_DISPLAY_COUNTRY = 'US';
export const LEGACY_LEDGER_UNITS_PER_USD = 150;
export const DEFAULT_MINIMUM_PAYOUT_AMOUNT = 1500;

export function normalizeMoney(value, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return +Number(fallback || 0).toFixed(2);
  return +n.toFixed(2);
}

export function normalizeMinimumPayoutAmount(value, fallback = DEFAULT_MINIMUM_PAYOUT_AMOUNT) {
  const amount = normalizeMoney(value, fallback);
  return amount === 5000 ? DEFAULT_MINIMUM_PAYOUT_AMOUNT : amount;
}

export function ledgerAmountToDisplayCurrency(value = 0) {
  return +(normalizeMoney(value, 0) / LEGACY_LEDGER_UNITS_PER_USD).toFixed(2);
}

export function displayCurrencyToLedgerAmount(value = 0) {
  return normalizeMoney(Number(value || 0) * LEGACY_LEDGER_UNITS_PER_USD, 0);
}

export function normalizePositiveInt(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.round(n);
}

export function normalizeBoolean(value, fallback = false) {
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === '1' || value === 1) return true;
  if (value === 'false' || value === '0' || value === 0) return false;
  return fallback;
}

export function normalizeEntityType(value, fallback = 'individual') {
  const text = normalizeString(value, fallback).toLowerCase();
  return ['individual', 'company'].includes(text) ? text : fallback;
}

export function normalizeStatus(value, fallback = 'not_started') {
  const text = normalizeString(value, fallback).toLowerCase();
  return text || fallback;
}

export function normalizeBillingMode(value, fallback = 'monthly_invoice') {
  const text = normalizeString(value, fallback).toLowerCase();
  if (text === 'deposit') return 'monthly_invoice';
  return ['monthly_invoice', 'subscription'].includes(text) ? text : fallback;
}

export function normalizeSubscriptionPlan(value, fallback = 'none') {
  const text = normalizeString(value, fallback).toLowerCase();
  return text || fallback;
}

export function subscriptionIncludedCreditsForPlan(plan = 'none') {
  const safePlan = normalizeSubscriptionPlan(plan, 'none');
  if (safePlan === 'starter') return 3150;
  if (safePlan === 'pro') return 22400;
  return 0;
}

export function subscriptionRefillAmountForPlan(plan = 'none') {
  return subscriptionIncludedCreditsForPlan(plan);
}

export function subscriptionBonusRateForPlan(plan = 'none') {
  const safePlan = normalizeSubscriptionPlan(plan, 'none');
  if (safePlan === 'starter') return 0.05;
  if (safePlan === 'pro') return 0.12;
  return 0;
}

export function subscriptionBasePriceForPlan(plan = 'none') {
  const safePlan = normalizeSubscriptionPlan(plan, 'none');
  if (safePlan === 'starter') return 3000;
  if (safePlan === 'pro') return 20000;
  return 0;
}

export const WELCOME_CREDITS_FREE_ALLOWANCE_USD = 10;
export const WELCOME_CREDITS_GRANT_AMOUNT = displayCurrencyToLedgerAmount(WELCOME_CREDITS_FREE_ALLOWANCE_USD);
export const WELCOME_CREDITS_ACCOUNT_LIMIT = WELCOME_CREDITS_GRANT_AMOUNT;
export const GUEST_TRIAL_CREDIT_LIMIT = WELCOME_CREDITS_GRANT_AMOUNT;
export const DEFAULT_OPENAI_MONTHLY_COST_LIMIT_USD = 10;
export const DEFAULT_OPENAI_MONTHLY_COST_LIMIT = displayCurrencyToLedgerAmount(DEFAULT_OPENAI_MONTHLY_COST_LIMIT_USD);

export function normalizeOpenAiCostLimit(value, fallback = DEFAULT_OPENAI_MONTHLY_COST_LIMIT) {
  const amount = normalizeMoney(value, fallback);
  return Math.max(0, Math.min(DEFAULT_OPENAI_MONTHLY_COST_LIMIT, amount));
}

export function guestTrialVisitorHash(visitorId = '') {
  const safe = normalizeString(visitorId).toLowerCase();
  if (!safe) return '';
  return createHash('sha256').update(safe).digest('hex').slice(0, 20);
}

export function guestTrialLoginForVisitorId(visitorId = '') {
  const hash = guestTrialVisitorHash(visitorId);
  return hash ? `guesttrial-${hash}` : '';
}

export function normalizeGuestTrialRequest(body = {}) {
  const raw = body?.guest_trial && typeof body.guest_trial === 'object'
    ? body.guest_trial
    : (body?.guestTrial && typeof body.guestTrial === 'object' ? body.guestTrial : {});
  const visitorId = normalizeString(raw.visitor_id || raw.visitorId || body?.visitor_id || body?.visitorId).slice(0, 120);
  const visitorHash = guestTrialVisitorHash(visitorId);
  const login = guestTrialLoginForVisitorId(visitorId);
  return {
    requested: Boolean(raw.enabled !== false && (visitorId || raw.enabled || body?.guest_trial || body?.guestTrial)),
    visitorId,
    visitorHash,
    login,
    limit: GUEST_TRIAL_CREDIT_LIMIT
  };
}

export function isGuestTrialAccountLogin(login = '') {
  return normalizeString(login).toLowerCase().startsWith('guesttrial-');
}

export function sanitizeBillingSettingsPatch(patch = {}) {
  return {
    mode: 'monthly_invoice',
    legalName: normalizeString(patch.legalName),
    companyName: normalizeString(patch.companyName),
    billingEmail: normalizeString(patch.billingEmail),
    billingPhone: normalizeString(patch.billingPhone),
    billingPostalCode: normalizeString(patch.billingPostalCode),
    billingRegion: normalizeString(patch.billingRegion),
    billingCity: normalizeString(patch.billingCity),
    billingAddressLine1: normalizeString(patch.billingAddressLine1),
    billingAddressLine2: normalizeString(patch.billingAddressLine2),
    country: normalizeCountry(patch.country, 'JP'),
    currency: BILLING_DISPLAY_CURRENCY,
    taxId: normalizeString(patch.taxId),
    purchaseOrderRef: normalizeString(patch.purchaseOrderRef),
    invoiceMemo: normalizeString(patch.invoiceMemo),
    dueDays: normalizePositiveInt(patch.dueDays, 14),
    openAiMonthlyCostLimit: normalizeOpenAiCostLimit(
      patch.openAiMonthlyCostLimit
      ?? patch.openaiMonthlyCostLimit
      ?? patch.open_ai_monthly_cost_limit
      ?? (patch.openAiMonthlyCostLimitUsd !== undefined ? displayCurrencyToLedgerAmount(patch.openAiMonthlyCostLimitUsd) : undefined)
      ?? (patch.openaiMonthlyCostLimitUsd !== undefined ? displayCurrencyToLedgerAmount(patch.openaiMonthlyCostLimitUsd) : undefined),
      DEFAULT_OPENAI_MONTHLY_COST_LIMIT
    ),
    autoTopupEnabled: false,
    autoTopupThreshold: 0,
    autoTopupAmount: 0,
    subscriptionPlan: normalizeSubscriptionPlan(patch.subscriptionPlan, 'none'),
    subscriptionOverageMode: 'monthly_invoice'
  };
}

export function sanitizePayoutSettingsPatch(patch = {}) {
  return {
    providerEnabled: normalizeBoolean(patch.providerEnabled, false),
    entityType: normalizeEntityType(patch.entityType, 'individual'),
    legalName: normalizeString(patch.legalName),
    displayName: normalizeString(patch.displayName),
    payoutEmail: normalizeString(patch.payoutEmail),
    country: normalizeCountry(patch.country, 'JP'),
    currency: BILLING_DISPLAY_CURRENCY,
    supportEmail: normalizeString(patch.supportEmail),
    minimumPayoutAmount: normalizeMinimumPayoutAmount(patch.minimumPayoutAmount),
    website: normalizeString(patch.website),
    statementDescriptor: normalizeString(patch.statementDescriptor),
    notes: normalizeString(patch.notes)
  };
}

export function sanitizeProfileSettingsPatch(patch = {}) {
  const source = patch && typeof patch === 'object' ? patch : {};
  const next = {};
  if (Object.prototype.hasOwnProperty.call(source, 'displayName')) next.displayName = normalizeString(source.displayName);
  if (Object.prototype.hasOwnProperty.call(source, 'legalName')) next.legalName = normalizeString(source.legalName);
  if (Object.prototype.hasOwnProperty.call(source, 'companyName')) next.companyName = normalizeString(source.companyName);
  if (Object.prototype.hasOwnProperty.call(source, 'country')) next.country = normalizeCountry(source.country, 'JP');
  if (
    Object.prototype.hasOwnProperty.call(source, 'uiLanguage')
    || Object.prototype.hasOwnProperty.call(source, 'language')
    || Object.prototype.hasOwnProperty.call(source, 'preferredLanguage')
  ) {
    next.uiLanguage = normalizeUiLanguage(source.uiLanguage ?? source.language ?? source.preferredLanguage, 'en');
  }
  return next;
}

export function normalizeSubscriptionOverageMode(value, fallback = 'monthly_invoice') {
  const text = normalizeString(value, fallback).toLowerCase();
  if (text === 'deposit') return 'monthly_invoice';
  return ['block', 'monthly_invoice'].includes(text) ? text : fallback;
}

export function normalizeActiveSubscriptionOverageMode(value, fallback = 'monthly_invoice') {
  return normalizeSubscriptionOverageMode(value, fallback);
}

export function syncBillingRuntimeFields(billing = {}, period = billingPeriodId()) {
  const next = { ...billing };
  if (normalizeString(next.subscriptionCreditsPeriod) !== period) {
    next.subscriptionCreditsPeriod = period;
    next.subscriptionCreditsUsed = 0;
    next.subscriptionCreditsReserved = 0;
  }
  if (normalizeString(next.autoTopupPeriod) !== period) {
    next.autoTopupPeriod = period;
    next.autoTopupCount = 0;
  }
  next.welcomeCreditsBalance = normalizeMoney(next.welcomeCreditsBalance, 0);
  next.welcomeCreditsReserved = normalizeMoney(next.welcomeCreditsReserved, 0);
  next.welcomeCreditsGrantedTotal = normalizeMoney(next.welcomeCreditsGrantedTotal, 0);
  next.welcomeCreditsSignupGrantedTotal = normalizeMoney(next.welcomeCreditsSignupGrantedTotal, 0);
  next.welcomeCreditsAgentGrantedTotal = normalizeMoney(next.welcomeCreditsAgentGrantedTotal, 0);
  next.welcomeCreditsConsumedTotal = normalizeMoney(next.welcomeCreditsConsumedTotal, 0);
  next.guestTrialCreditLimit = normalizeMoney(next.guestTrialCreditLimit, 0);
  next.guestTrialSignupDebitTotal = normalizeMoney(next.guestTrialSignupDebitTotal, 0);
  next.depositBalance = normalizeMoney(next.depositBalance, 0);
  next.depositReserved = normalizeMoney(next.depositReserved, 0);
  next.subscriptionIncludedCredits = normalizeMoney(next.subscriptionIncludedCredits, 0);
  next.subscriptionCreditsUsed = normalizeMoney(next.subscriptionCreditsUsed, 0);
  next.subscriptionCreditsReserved = normalizeMoney(next.subscriptionCreditsReserved, 0);
  if (normalizeString(next.openAiCostPeriod) !== period) {
    next.openAiCostPeriod = period;
    next.openAiCostUsed = 0;
    next.openAiCostReserved = 0;
  }
  next.openAiMonthlyCostLimit = normalizeOpenAiCostLimit(next.openAiMonthlyCostLimit, DEFAULT_OPENAI_MONTHLY_COST_LIMIT);
  next.openAiCostUsed = normalizeMoney(next.openAiCostUsed, 0);
  next.openAiCostReserved = normalizeMoney(next.openAiCostReserved, 0);
  next.autoTopupThreshold = normalizeMoney(next.autoTopupThreshold, 0);
  next.autoTopupAmount = normalizeMoney(next.autoTopupAmount, 0);
  next.arrearsTotal = normalizeMoney(next.arrearsTotal, 0);
  next.autoTopupCount = normalizePositiveInt(next.autoTopupCount, 0);
  return next;
}
