const ANALYTICS_HANDOFF_TARGETS = Object.freeze([
  Object.freeze({
    value: 'cmo_leader',
    label: 'CMO Leader',
    role: 'strategy_leader'
  }),
  Object.freeze({
    value: 'seo_specialist',
    label: 'SEO Specialist',
    role: 'search_review'
  }),
  Object.freeze({
    value: 'growth',
    label: 'Growth Operator',
    role: 'growth_execution'
  })
]);

const TARGET_BY_VALUE = new Map(ANALYTICS_HANDOFF_TARGETS.map((target) => [target.value, target]));
const DEFAULT_TARGET = ANALYTICS_HANDOFF_TARGETS[0].value;

function uniqueTargets(values = []) {
  const seen = new Set();
  const targets = [];
  for (const value of values) {
    const target = normalizeAnalyticsHandoffTarget(value);
    if (!target || seen.has(target)) continue;
    seen.add(target);
    targets.push(target);
  }
  return targets;
}

export function analyticsHandoffTargetOptions() {
  return ANALYTICS_HANDOFF_TARGETS.map((target) => ({ ...target }));
}

export function normalizeAnalyticsHandoffTarget(value = '') {
  const key = String(value || '').trim();
  return TARGET_BY_VALUE.has(key) ? key : '';
}

export function defaultAnalyticsHandoffTarget() {
  return DEFAULT_TARGET;
}

export function analyticsHandoffTargetsForContext(primary = '') {
  const preferred = normalizeAnalyticsHandoffTarget(primary) || DEFAULT_TARGET;
  return uniqueTargets([preferred, ...ANALYTICS_HANDOFF_TARGETS.map((target) => target.value)]);
}

export function analyticsHandoffTargetFromContext(context = null) {
  const targets = Array.isArray(context?.handoff_targets) ? context.handoff_targets : [];
  return targets.map(normalizeAnalyticsHandoffTarget).find(Boolean) || '';
}
