const ADS_OPS_HANDOFF_TARGETS = Object.freeze([
  'ads_planner',
  'ads_launch_console',
  'campaign_operations',
  'analytics_console'
]);

export function adsOpsHandoffTargets() {
  return [...ADS_OPS_HANDOFF_TARGETS];
}
