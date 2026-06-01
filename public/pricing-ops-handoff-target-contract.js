const PRICING_OPS_HANDOFF_TARGETS = Object.freeze([
  'pricing-decision-console',
  'cfo_leader',
  'pricing'
]);

export function pricingOpsHandoffTargets() {
  return [...PRICING_OPS_HANDOFF_TARGETS];
}
