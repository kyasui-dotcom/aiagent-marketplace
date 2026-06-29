const LEAD_OPS_HANDOFF_TARGETS = Object.freeze([
  Object.freeze({
    value: 'cmo_leader',
    label: 'Send to Sales Leader',
    role: 'relationship_strategy'
  }),
  Object.freeze({
    value: 'growth',
    label: 'Send to Growth Operator',
    role: 'growth_execution'
  }),
  Object.freeze({
    value: 'list_creator',
    label: 'Send to List Creator',
    role: 'lead_sourcing'
  }),
  Object.freeze({
    value: 'email_ops',
    label: 'Email Ops',
    role: 'email_execution'
  }),
  Object.freeze({
    value: 'sms_ops',
    label: 'SMS Ops',
    role: 'sms_execution'
  })
]);

const TARGET_BY_VALUE = new Map(LEAD_OPS_HANDOFF_TARGETS.map((target) => [target.value, target]));
const DEFAULT_TARGET = 'cmo_leader';
const SOURCING_TARGET = 'list_creator';

function uniqueTargets(values = []) {
  const seen = new Set();
  const targets = [];
  for (const value of values) {
    const target = normalizeLeadOpsHandoffTarget(value);
    if (!target || seen.has(target)) continue;
    seen.add(target);
    targets.push(target);
  }
  return targets;
}

export function leadOpsHandoffTargetOptions(options = {}) {
  const includeExecutionTargets = options.includeExecutionTargets === true;
  return LEAD_OPS_HANDOFF_TARGETS
    .filter((target) => includeExecutionTargets || !/_execution$/.test(target.role))
    .map((target) => ({ ...target }));
}

export function normalizeLeadOpsHandoffTarget(value = '') {
  const key = String(value || '').trim();
  return TARGET_BY_VALUE.has(key) ? key : '';
}

export function defaultLeadOpsHandoffTarget() {
  return DEFAULT_TARGET;
}

export function leadOpsHandoffTargetFromContext(context = null) {
  const targets = Array.isArray(context?.handoff_targets) ? context.handoff_targets : [];
  return targets.map(normalizeLeadOpsHandoffTarget).find(Boolean) || '';
}

export function leadOpsContextHandoffTargets(primary = '') {
  const preferred = normalizeLeadOpsHandoffTarget(primary) || DEFAULT_TARGET;
  return uniqueTargets([preferred, SOURCING_TARGET, 'email_ops', 'sms_ops']);
}

export function leadOpsSourcingHandoffTargets() {
  return uniqueTargets([SOURCING_TARGET, DEFAULT_TARGET, 'email_ops']);
}
