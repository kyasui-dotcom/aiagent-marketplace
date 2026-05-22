export const MAX_PROVIDER_MARKUP_RATE = 1;

export function providerMarkupRateFromInput(body = {}) {
  return Number(
    body.provider_markup_rate
    ?? body.providerMarkupRate
    ?? body.token_markup_rate
    ?? body.tokenMarkupRate
    ?? body.creator_fee_rate
    ?? body.creatorFeeRate
    ?? body.premium_rate
    ?? body.premiumRate
    ?? 0.1
  );
}

export function pricingModelFromInput(body = {}) {
  const raw = String(body.pricing_model ?? body.pricingModel ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (!raw) return 'usage_based';
  if (['usage', 'usage_pricing', 'metered'].includes(raw)) return 'usage_based';
  if (['fixed', 'fixed_run', 'per_run', 'fixed_price'].includes(raw)) return 'fixed_per_run';
  if (['subscription', 'monthly', 'monthly_subscription'].includes(raw)) return 'subscription_required';
  if (['subscription_plus_usage', 'subscription_plus_overage', 'hybrid_subscription'].includes(raw)) return 'hybrid';
  return ['usage_based', 'fixed_per_run', 'subscription_required', 'hybrid'].includes(raw) ? raw : 'usage_based';
}

export function nonNegativeUsdFromInput(...values) {
  for (const value of values) {
    const amount = Number(value);
    if (Number.isFinite(amount) && amount >= 0) return +amount.toFixed(2);
  }
  return 0;
}

export function overageModeFromInput(body = {}) {
  const raw = String(body.overage_mode ?? body.overageMode ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (!raw) return pricingModelFromInput(body) === 'hybrid' ? 'usage_based' : 'included';
  if (['included', 'none', 'plan_included'].includes(raw)) return 'included';
  if (['usage', 'usage_pricing', 'metered'].includes(raw)) return 'usage_based';
  if (['fixed', 'fixed_run', 'per_run', 'fixed_price'].includes(raw)) return 'fixed_per_run';
  return ['included', 'usage_based', 'fixed_per_run'].includes(raw) ? raw : 'included';
}

export function platformMarginRateFromInput(_body = {}) {
  return 0.1;
}

export function creatorFeeRateFromInput(body = {}) {
  return providerMarkupRateFromInput(body);
}

export function marketplaceFeeRateFromInput(body = {}) {
  return platformMarginRateFromInput(body);
}
