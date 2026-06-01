import { BUILT_IN_APP_MANIFESTS } from './app-manifest-registry.js?v=20260602a';

const PUBLISHER_APP_ID = 'publisher-approval-studio';

function publisherManifest() {
  return BUILT_IN_APP_MANIFESTS.find((manifest) => manifest?.id === PUBLISHER_APP_ID) || {};
}

function publisherHandoffTargetsFromManifest() {
  const targets = publisherManifest()?.inputContract?.handoffTargets;
  return Array.isArray(targets)
    ? targets
        .map((target) => ({
          value: String(target?.value || '').trim(),
          label: String(target?.label || target?.value || '').trim(),
          role: String(target?.role || '').trim()
        }))
        .filter((target) => target.value && target.label)
    : [];
}

const PUBLISHER_HANDOFF_TARGETS = Object.freeze(publisherHandoffTargetsFromManifest().map(Object.freeze));
const TARGET_BY_VALUE = new Map(PUBLISHER_HANDOFF_TARGETS.map((target) => [target.value, target]));
const DEFAULT_TARGET = PUBLISHER_HANDOFF_TARGETS.find((target) => target.role === 'primary_review')?.value || PUBLISHER_HANDOFF_TARGETS[0]?.value || '';
const PLANNING_TARGET = PUBLISHER_HANDOFF_TARGETS.find((target) => target.role === 'planning_leader')?.value || DEFAULT_TARGET;

function uniqueTargets(values = []) {
  const seen = new Set();
  const targets = [];
  for (const value of values) {
    const target = normalizePublisherHandoffTarget(value);
    if (!target || seen.has(target)) continue;
    seen.add(target);
    targets.push(target);
  }
  return targets;
}

export function publisherHandoffTargetOptions() {
  return PUBLISHER_HANDOFF_TARGETS.map((target) => ({ ...target }));
}

export function normalizePublisherHandoffTarget(value = '') {
  const key = String(value || '').trim();
  return TARGET_BY_VALUE.has(key) ? key : '';
}

export function defaultPublisherHandoffTarget() {
  return DEFAULT_TARGET;
}

export function publisherPlanningHandoffTarget(options = {}) {
  if (options.useSelected === true) return normalizePublisherHandoffTarget(options.selected) || PLANNING_TARGET;
  return PLANNING_TARGET;
}

export function publisherHandoffTargetsForPacket(primary = '', options = {}) {
  const mode = String(options.mode || 'publisher_packet');
  const preferred = normalizePublisherHandoffTarget(primary) || (mode === 'planning' ? PLANNING_TARGET : DEFAULT_TARGET);
  const secondaryRoles = mode === 'planning'
    ? ['primary_review', 'implementation_leader']
    : ['implementation_leader', 'planning_leader'];
  const secondary = secondaryRoles
    .map((role) => PUBLISHER_HANDOFF_TARGETS.find((target) => target.role === role)?.value)
    .filter(Boolean);
  return uniqueTargets([preferred, ...secondary, ...PUBLISHER_HANDOFF_TARGETS.map((target) => target.value)]);
}

export function publisherHandoffTargetFromContext(context = null) {
  const targets = Array.isArray(context?.handoff_targets) ? context.handoff_targets : [];
  return targets.map(normalizePublisherHandoffTarget).find(Boolean) || '';
}
