const GROWTH_HANDOFF_TARGETS = Object.freeze({
  blocker: Object.freeze(['growth-experiment-console']),
  publisherLaunch: Object.freeze(['publisher-approval-studio', 'cmo_leader', 'seo_specialist']),
  contextReturn: Object.freeze(['growth-experiment-console', 'growth', 'campaign_operations', 'analytics_console'])
});

function copyTargets(values = []) {
  return [...values];
}

export function growthBlockerHandoffTargets() {
  return copyTargets(GROWTH_HANDOFF_TARGETS.blocker);
}

export function growthPublisherLaunchHandoffTargets() {
  return copyTargets(GROWTH_HANDOFF_TARGETS.publisherLaunch);
}

export function growthContextReturnHandoffTargets() {
  return copyTargets(GROWTH_HANDOFF_TARGETS.contextReturn);
}
