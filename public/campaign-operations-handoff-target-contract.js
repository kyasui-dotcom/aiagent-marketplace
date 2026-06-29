const CAMPAIGN_OPERATIONS_HANDOFF_TARGETS = Object.freeze([
  'cmo_leader',
  'campaign_operations',
  'analytics_console',
  'publisher_approval_studio'
]);

export function campaignOperationsHandoffTargets() {
  return [...CAMPAIGN_OPERATIONS_HANDOFF_TARGETS];
}
