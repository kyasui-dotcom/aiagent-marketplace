export const SUBSCRIPTION_PLAN_DEFAULTS = {
  none: 0,
  starter: 3150,
  pro: 22400
};

export const SUBSCRIPTION_PLAN_BASE_AMOUNTS = {
  none: 0,
  starter: 3000,
  pro: 20000
};

export const BILLING_DISPLAY_CURRENCY = 'USD';
export const LEGACY_LEDGER_UNITS_PER_USD = 150;
export const DEFAULT_MINIMUM_PAYOUT_AMOUNT = 1500;
export const LIST_CREATOR_BATCH_SIZE = 20;
export const LIST_CREATOR_MAX_REQUESTED_COMPANIES = 500;
export const LIST_CREATOR_BASE_COST_BASIS = Object.freeze({
  total_cost_basis: 64,
  compute_cost: 16,
  tool_cost: 14,
  labor_cost: 34,
  api_cost: 0
});

const usdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: BILLING_DISPLAY_CURRENCY,
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

export function formatDisplayCurrency(value) {
  const n = Number(value || 0);
  return usdFormatter.format(Number.isFinite(n) ? n : 0);
}

export function ledgerAmountToDisplayCurrency(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return 0;
  return +(n / LEGACY_LEDGER_UNITS_PER_USD).toFixed(2);
}

export function displayCurrencyToLedgerAmount(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return 0;
  return +(n * LEGACY_LEDGER_UNITS_PER_USD).toFixed(1);
}

export function moneyInputValueFromLedger(value) {
  const amount = ledgerAmountToDisplayCurrency(value);
  return amount.toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
}

export function yen(value) {
  return usdFormatter.format(ledgerAmountToDisplayCurrency(value));
}

export function pointsLabel(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n) || n <= 0) return '0 pts';
  const display = n.toFixed(1).replace(/\.0$/, '');
  return `${display} pts`;
}

function flattenEstimateText(value, parts = [], depth = 0) {
  if (value == null || depth > 4) return parts;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    const text = String(value).trim();
    if (text) parts.push(text);
    return parts;
  }
  if (Array.isArray(value)) {
    value.slice(0, 40).forEach((item) => flattenEstimateText(item, parts, depth + 1));
    return parts;
  }
  if (typeof value === 'object') {
    Object.values(value).slice(0, 80).forEach((item) => flattenEstimateText(item, parts, depth + 1));
  }
  return parts;
}

export function inferListCreatorRequestedCount(value = '', fallback = LIST_CREATOR_BATCH_SIZE) {
  const text = flattenEstimateText(value).join(' ').normalize('NFKC');
  const fallbackCount = Math.max(1, Math.min(LIST_CREATOR_MAX_REQUESTED_COMPANIES, Math.round(Number(fallback || LIST_CREATOR_BATCH_SIZE) || LIST_CREATOR_BATCH_SIZE)));
  const patterns = [
    /(?:top|first|initial|shortlist|list|lead list|prospect list|候補|上位|まず|初回|リスト)\D{0,24}(\d{1,4})\s*(?:companies|company|leads|prospects|rows|社|件)/i,
    /(\d{1,4})\s*(?:companies|company|leads|prospects|lead rows|prospect rows|rows|社|件)\b/i,
    /(\d{1,4})\s*(?:件|社)(?:分|くらい|ほど|程度)?/i
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    const count = Number(match?.[1] || 0);
    if (Number.isFinite(count) && count > 0) {
      return Math.max(1, Math.min(LIST_CREATOR_MAX_REQUESTED_COMPANIES, Math.round(count)));
    }
  }
  return fallbackCount;
}

export function listCreatorUsageEstimateForCount(count = LIST_CREATOR_BATCH_SIZE) {
  const requestedCount = inferListCreatorRequestedCount(String(count), count);
  const batchCount = Math.max(1, Math.ceil(requestedCount / LIST_CREATOR_BATCH_SIZE));
  const scale = (value) => +(Number(value || 0) * batchCount).toFixed(2);
  return {
    requestedCount,
    batchSize: LIST_CREATOR_BATCH_SIZE,
    batchCount,
    usage: {
      total_cost_basis: scale(LIST_CREATOR_BASE_COST_BASIS.total_cost_basis),
      compute_cost: scale(LIST_CREATOR_BASE_COST_BASIS.compute_cost),
      tool_cost: scale(LIST_CREATOR_BASE_COST_BASIS.tool_cost),
      labor_cost: scale(LIST_CREATOR_BASE_COST_BASIS.labor_cost),
      api_cost: scale(LIST_CREATOR_BASE_COST_BASIS.api_cost)
    },
    contactCaptureMode: 'public_contact_only'
  };
}

export function normalizeTaskTypeToken(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_\s-]/g, '')
    .replace(/[\s-]+/g, '_')
    .slice(0, 80) || 'research';
}

export function subscriptionIncludedCreditsForPlan(plan = '') {
  const safePlan = String(plan || '').trim().toLowerCase();
  return Number(SUBSCRIPTION_PLAN_DEFAULTS[safePlan] || 0);
}

export function subscriptionBasePriceForPlan(plan = '') {
  const safePlan = String(plan || '').trim().toLowerCase();
  return Number(SUBSCRIPTION_PLAN_BASE_AMOUNTS[safePlan] || 0);
}

export function subscriptionBonusRateForPlan(plan = '') {
  const safePlan = String(plan || '').trim().toLowerCase();
  if (safePlan === 'starter') return 0.05;
  if (safePlan === 'pro') return 0.12;
  return 0;
}

export function subscriptionPlanLabel(plan = '') {
  const safePlan = String(plan || '').trim().toLowerCase();
  const refill = subscriptionIncludedCreditsForPlan(safePlan);
  const base = subscriptionBasePriceForPlan(safePlan);
  const bonusRate = subscriptionBonusRateForPlan(safePlan);
  if (!safePlan || safePlan === 'none') return 'none';
  const bonusPercent = Math.round(bonusRate * 100);
  if (refill > 0 && base > 0 && bonusPercent > 0) {
    return `${safePlan} (${yen(refill)} refill = ${yen(base)} + ${bonusPercent}% bonus)`;
  }
  if (refill > 0) return `${safePlan} (${yen(refill)} refill)`;
  return safePlan;
}

export function fundingBreakdown(value) {
  if (!value || typeof value !== 'object') return null;
  return value.actualBilling?.funding || value.billingSettlement || value.funding || null;
}

export function fundingBreakdownLines(value) {
  const funding = fundingBreakdown(value);
  if (!funding) return [];
  const lines = [];
  if (Number(funding.depositApplied || 0) > 0) lines.push(`Legacy balance used: ${yen(funding.depositApplied)}`);
  if (Number(funding.welcomeCreditsApplied || 0) > 0) lines.push(`Welcome credits used: ${pointsLabel(funding.welcomeCreditsApplied)}`);
  if (Number(funding.creditsApplied || 0) > 0) lines.push(`Plan credits used: ${yen(funding.creditsApplied)}`);
  if (Number(funding.invoiceApplied || 0) > 0) lines.push(`Invoice / arrears: ${yen(funding.invoiceApplied)}`);
  if (Number(funding.autoTopupAdded || 0) > 0) lines.push(`Legacy auto billing added: ${yen(funding.autoTopupAdded)}`);
  return lines;
}

export function fundingBreakdownCompact(value) {
  const funding = fundingBreakdown(value);
  if (!funding) return '';
  const parts = [];
  if (Number(funding.depositApplied || 0) > 0) parts.push(`legacy balance ${yen(funding.depositApplied)}`);
  if (Number(funding.welcomeCreditsApplied || 0) > 0) parts.push(`welcome ${pointsLabel(funding.welcomeCreditsApplied)}`);
  if (Number(funding.creditsApplied || 0) > 0) parts.push(`plan ${yen(funding.creditsApplied)}`);
  if (Number(funding.invoiceApplied || 0) > 0) parts.push(`invoice ${yen(funding.invoiceApplied)}`);
  if (Number(funding.autoTopupAdded || 0) > 0) parts.push(`legacy auto ${yen(funding.autoTopupAdded)}`);
  return parts.join(' · ');
}
