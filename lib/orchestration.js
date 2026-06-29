// Shared orchestration contracts for built-in and externally registered agents.
import { SAMPLE_AGENT_DEFINITIONS } from './builtin-agents/agents/index.js';

function connectorPoliciesFromBuiltIns() {
  const policies = {};
  for (const defaults of Object.values(SAMPLE_AGENT_DEFINITIONS)) {
    const policySet = defaults?.connectorExecutionPolicies || defaults?.leaderBehavior?.connectorExecutionPolicies || null;
    if (!policySet || typeof policySet !== 'object') continue;
    Object.assign(policies, policySet);
  }
  return policies;
}

export const CONNECTOR_EXECUTION_POLICIES = Object.freeze(connectorPoliciesFromBuiltIns());

export const LEADER_CONTROL_CONTRACT_VERSION = 'leader-control/v1';
export const DOWNSTREAM_HANDOFF_SUMMARY_CONTRACT_VERSION = 'downstream-handoff-summary/v1';

export const DOWNSTREAM_HANDOFF_SUMMARY_FIELDS = Object.freeze([
  'decision',
  'inputs_used',
  'verified_facts',
  'assumptions_or_gaps',
  'artifact_for_next_agent',
  'blockers',
  'next_inputs',
  'recommended_next_owner'
]);

export const DOWNSTREAM_HANDOFF_SUMMARY_RULES = Object.freeze([
  'Keep it short: one compact section, normally 5-8 bullets or a small table.',
  'Summarize only information that helps the next agent, leader, or SaaS surface continue the order.',
  'Separate verified facts from assumptions and gaps.',
  'Name exact artifact(s), copy, rows, pages, files, source URLs, connector needs, approval needs, and stop rules when present.',
  'Do not duplicate the full report, worker log, internal reasoning, or raw source dump.'
]);

export const LEADER_CONTROL_STAGES = Object.freeze([
  Object.freeze({
    name: 'select',
    responsibility: 'Choose the smallest set of specialist agents that materially improves the outcome.',
    requiredOutput: Object.freeze(['selected_specialists', 'selection_reason', 'deferred_specialists'])
  }),
  Object.freeze({
    name: 'handoff',
    responsibility: 'The leader passes objective, constraints, source inputs, required outputs, acceptance checks, and prior findings to each specialist.',
    requiredOutput: Object.freeze(['objective', 'constraints', 'source_inputs', 'required_outputs', 'acceptance_checks'])
  }),
  Object.freeze({
    name: 'review',
    responsibility: 'The leader verifies that each specialist used the handed-off information and returned specific, evidence-backed, actionable output.',
    requiredOutput: Object.freeze(['input_used', 'specificity', 'evidence_status', 'actionability', 'missing_items'])
  }),
  Object.freeze({
    name: 'synthesize',
    responsibility: 'The leader resolves conflicts, picks the next lane, produces the final summary, and prepares approval-gated execution packets.',
    requiredOutput: Object.freeze(['integrated_decision', 'conflicts_resolved', 'next_lane', 'approval_or_execution_packet'])
  })
]);

export const LEADER_CONTROL_QUALITY_CHECKS = Object.freeze([
  Object.freeze({
    id: 'handoff_input_used',
    description: 'Specialist and leader checkpoint outputs must reference the handed-off objective, constraints, prior findings, or source evidence.'
  }),
  Object.freeze({
    id: 'specific_not_generic',
    description: 'Outputs must name concrete pages, channels, files, claims, owners, metrics, or blockers rather than generic advice.'
  }),
  Object.freeze({
    id: 'evidence_before_action',
    description: 'Research or analysis findings must be reviewed before choosing action, implementation, publishing, or sending lanes.'
  }),
  Object.freeze({
    id: 'approval_before_external_write',
    description: 'Posting, sending, scheduling, repository writes, and connector actions require explicit approval or an authority_request blocker.'
  }),
  Object.freeze({
    id: 'synthesis_resolves_conflict',
    description: 'The final leader output must reconcile duplicated, conflicting, or weak specialist outputs before giving a final recommendation.'
  })
]);

const BASE_LEADER_CONTROL_CONTRACT = Object.freeze({
  owner: 'leader',
  handoffOwner: 'leader',
  orchestrationRole: 'sequence_and_quality_gate_only',
  role: 'agent_selection_handoff_review_synthesis',
  goal: 'Make the team better by selecting the right specialists, preserving context, checking their use of inputs, and integrating their outputs.',
  notResponsibleFor: Object.freeze([
    'doing every specialist task alone',
    'executing OAuth/API writes directly',
    'burying weak specialist output inside a generic summary',
    'reopening research after evidence is already sufficient for the next safe action'
  ]),
  controlLoop: Object.freeze(['select', 'handoff', 'review', 'synthesize']),
  handoffFields: Object.freeze([
    'objective',
    'constraints',
    'source_inputs',
    'prior_findings',
    'required_outputs',
    'acceptance_checks',
    'approval_or_authority_rules'
  ]),
  qualityChecks: LEADER_CONTROL_QUALITY_CHECKS
});

export function downstreamHandoffSummaryContractForTask(primaryTask = '', taskType = '', options = {}) {
  const primary = normalizedTask(primaryTask);
  const task = normalizedTask(taskType);
  const phase = String(options.phase || '').trim().toLowerCase();
  const layer = Number(options.layer || 0) || null;
  return {
    version: DOWNSTREAM_HANDOFF_SUMMARY_CONTRACT_VERSION,
    owner: 'orchestration',
    primaryTask: primary,
    taskType: task,
    ...(phase ? { phase } : {}),
    ...(layer ? { layer } : {}),
    sectionTitle: 'Downstream handoff summary',
    required: Boolean(task && !isLeaderTaskType(task)),
    fields: [...DOWNSTREAM_HANDOFF_SUMMARY_FIELDS],
    rules: [...DOWNSTREAM_HANDOFF_SUMMARY_RULES]
  };
}

export function downstreamHandoffSummaryInstruction(primaryTask = '', taskType = '', options = {}) {
  const contract = downstreamHandoffSummaryContractForTask(primaryTask, taskType, options);
  if (!contract.required) return '';
  if (options.isJapanese) {
    return [
      '下流パス用まとめ: 最終出力の末尾に短い「Downstream handoff summary」欄を必ず置く。',
      `含める項目: ${contract.fields.join(', ')}.`,
      '次のagent/leader/SaaS画面が続行するための事実、使った入力、成果物、未確認点、blocker、next_inputsだけを書く。',
      '全文要約、worker log、内部推論、raw source dumpは入れない。'
    ].join(' ');
  }
  return [
    'Downstream handoff summary: include one short section named "Downstream handoff summary" at the end of the delivery.',
    `Fields to cover: ${contract.fields.join(', ')}.`,
    'Write only what the next agent, leader, or SaaS surface needs to continue: inputs used, verified facts, produced artifact, gaps, blockers, next_inputs, and recommended next owner.',
    'Do not repeat the full report, worker log, internal reasoning, or raw source dump.'
  ].join(' ');
}

const DEFAULT_LEADER_CONTROL_SPECIALIZATION = Object.freeze({
  selectionRubric: Object.freeze(['specialist fit', 'dependency order', 'evidence need', 'execution risk']),
  synthesisOutputs: Object.freeze(['specialist roster', 'review findings', 'integrated recommendation', 'next action'])
});

function freezeLeaderLayer(layer = {}) {
  return Object.freeze({
    name: String(layer.name || '').trim(),
    ...(String(layer.phase || '').trim() ? { phase: String(layer.phase || '').trim() } : {}),
    number: Math.max(1, Number(layer.number || 1) || 1),
    tasks: Object.freeze((Array.isArray(layer.tasks) ? layer.tasks : [])
      .map((task) => String(task || '').trim().toLowerCase())
      .filter(Boolean))
  });
}

function freezeLeaderProfile(profile = {}) {
  const taskDispatchAllowlist = profile.taskDispatchAllowlist && typeof profile.taskDispatchAllowlist === 'object'
    ? Object.freeze(Object.fromEntries(Object.entries(profile.taskDispatchAllowlist)
      .map(([task, allowed]) => [
        normalizedTask(task),
        Object.freeze((Array.isArray(allowed) ? allowed : [])
          .map(normalizedTask)
          .filter(Boolean))
      ])
      .filter(([task, allowed]) => task && allowed.length)))
    : Object.freeze({});
  return Object.freeze({
    ...(Array.isArray(profile.aliases) && profile.aliases.length
      ? { aliases: Object.freeze(profile.aliases.map((item) => String(item || '').trim().toLowerCase()).filter(Boolean)) }
      : {}),
    defaultLayer: Math.max(1, Number(profile.defaultLayer || 1) || 1),
    actionLayerStart: Math.max(1, Number(profile.actionLayerStart || 2) || 2),
    ...(String(profile.externalActionMode || profile.external_action_mode || '').trim()
      ? { externalActionMode: String(profile.externalActionMode || profile.external_action_mode).trim().toLowerCase() }
      : {}),
    ...(String(profile.publishSurface || profile.publish_surface || '').trim()
      ? { publishSurface: String(profile.publishSurface || profile.publish_surface).trim().toLowerCase() }
      : {}),
    ...(String(profile.publishApprovalSurface || profile.publish_approval_surface || '').trim()
      ? { publishApprovalSurface: String(profile.publishApprovalSurface || profile.publish_approval_surface).trim().toLowerCase() }
      : {}),
    actionLayerInternalTasks: Object.freeze((Array.isArray(profile.actionLayerInternalTasks) ? profile.actionLayerInternalTasks : [])
      .map(normalizedTask)
      .filter(Boolean)),
    blockedDispatchTaskTypes: Object.freeze((Array.isArray(profile.blockedDispatchTaskTypes) ? profile.blockedDispatchTaskTypes : [])
      .map(normalizedTask)
      .filter(Boolean)),
    taskDispatchAllowlist,
    layers: Object.freeze((Array.isArray(profile.layers) ? profile.layers : [])
      .map((layer) => freezeLeaderLayer(layer))
      .sort((left, right) => left.number - right.number)),
    protocolExtras: Object.freeze((Array.isArray(profile.protocolExtras) ? profile.protocolExtras : [])
      .map((item) => String(item || '').trim())
      .filter(Boolean))
  });
}

function leaderProfilesFromBuiltIns() {
  const profiles = {};
  for (const [kind, defaults] of Object.entries(SAMPLE_AGENT_DEFINITIONS)) {
    if (!String(kind || '').endsWith('_leader')) continue;
    const workflowProfile = defaults?.workflowProfile;
    if (!workflowProfile || typeof workflowProfile !== 'object') continue;
    profiles[kind] = freezeLeaderProfile(workflowProfile);
  }
  return Object.freeze(profiles);
}

export const LEADER_ORCHESTRATION_PROFILES = leaderProfilesFromBuiltIns();

function normalizedTask(value = '') {
  return String(value || '').trim().toLowerCase();
}

export function isLeaderTaskType(taskType = '') {
  return normalizedTask(taskType).endsWith('_leader');
}

export function leaderOrchestrationProfile(primaryTask = '') {
  const primary = normalizedTask(primaryTask);
  const direct = LEADER_ORCHESTRATION_PROFILES[primary] || null;
  if (direct?.inherits) return leaderOrchestrationProfile(direct.inherits);
  if (direct) return direct;
  for (const profile of Object.values(LEADER_ORCHESTRATION_PROFILES)) {
    if ((profile.aliases || []).includes(primary)) return profile;
  }
  return null;
}

export function leaderProtocolExtras(primaryTask = '') {
  return [...(leaderOrchestrationProfile(primaryTask)?.protocolExtras || [])];
}

export function leaderTaskLayer(primaryTask = '', taskType = '') {
  const task = normalizedTask(taskType);
  if (!task) return null;
  if (isLeaderTaskType(task)) return 0;
  const profile = leaderOrchestrationProfile(primaryTask);
  if (!profile) return null;
  if (task === 'summary') {
    const summaryLayer = (profile.layers || []).find((layer) => normalizedTask(layer?.phase || layer?.name || '') === 'summary');
    return summaryLayer?.number ?? null;
  }
  for (const layer of profile.layers || []) {
    if ((layer.tasks || []).includes(task)) return layer.number;
  }
  return profile.defaultLayer;
}

export function leaderTaskPhase(primaryTask = '', taskType = '') {
  const task = normalizedTask(taskType);
  if (!task) return '';
  if (isLeaderTaskType(task)) return 'leader';
  const profile = leaderOrchestrationProfile(primaryTask);
  if (!profile) return '';
  if (task === 'summary') {
    const summaryLayer = (profile.layers || []).find((layer) => normalizedTask(layer?.phase || layer?.name || '') === 'summary');
    return summaryLayer?.phase || summaryLayer?.name || '';
  }
  for (const layer of profile.layers || []) {
    if ((layer.tasks || []).includes(task)) return layer.phase || layer.name || '';
  }
  return '';
}

export function leaderActionLayerStart(primaryTask = '') {
  return leaderOrchestrationProfile(primaryTask)?.actionLayerStart || 2;
}

export function leaderUsesSaasPublishHandoff(primaryTask = '') {
  const profile = leaderOrchestrationProfile(primaryTask);
  if (!profile) return false;
  return Boolean(
    String(profile.externalActionMode || '').trim().toLowerCase() === 'saas_handoff_only'
    || String(profile.publishSurface || '').trim().toLowerCase() === 'saas'
    || String(profile.publishApprovalSurface || '').trim().toLowerCase() === 'saas'
  );
}

export function leaderActionLayerInternalTasks(primaryTask = '') {
  return [...(leaderOrchestrationProfile(primaryTask)?.actionLayerInternalTasks || [])];
}

export function leaderBlockedDispatchTaskTypes(primaryTask = '') {
  return [...(leaderOrchestrationProfile(primaryTask)?.blockedDispatchTaskTypes || [])];
}

export function leaderTaskDispatchAllowlist(primaryTask = '', taskType = '') {
  const task = normalizedTask(taskType);
  if (!task) return [];
  const allowlist = leaderOrchestrationProfile(primaryTask)?.taskDispatchAllowlist || {};
  return [...(allowlist[task] || [])];
}

export function leaderTaskUsesWebSearch(primaryTask = '', taskType = '') {
  const task = normalizedTask(taskType);
  if (!task || isLeaderTaskType(task)) return false;
  if (!leaderTaskRequiresSourceCollection(primaryTask, task)) return false;
  const phase = leaderTaskPhase(primaryTask, task);
  if (phase === 'data') return false;
  if (phase === 'analysis') return false;
  if (phase !== 'research') return false;
  return ['research', 'teardown', 'competitor_teardown', 'validation', 'diligence'].includes(task);
}

export function leaderSourceCollectionLayerTasks(primaryTask = '') {
  const profile = leaderOrchestrationProfile(primaryTask);
  if (!profile) return [];
  const sourceLayers = (profile.layers || [])
    .filter((layer) => Number(layer?.number || 0) === 1 || ['data', 'research'].includes(normalizedTask(layer?.phase || layer?.name || '')))
    .flatMap((layer) => Array.isArray(layer.tasks) ? layer.tasks : []);
  return [...new Set(sourceLayers.map(normalizedTask).filter((task) => task && task !== 'summary'))];
}

export function leaderTaskRequiresSourceCollection(primaryTask = '', taskType = '') {
  const task = normalizedTask(taskType);
  if (!task || isLeaderTaskType(task)) return false;
  return leaderSourceCollectionLayerTasks(primaryTask).includes(task);
}

function leaderProfileTaskTypes(primaryTask = '') {
  const profile = leaderOrchestrationProfile(primaryTask);
  if (!profile) return [];
  return [...new Set((profile.layers || [])
    .flatMap((layer) => Array.isArray(layer.tasks) ? layer.tasks : [])
    .map(normalizedTask)
    .filter((task) => task && task !== 'summary'))];
}

function leaderControlSpecializationForTask(primaryTask = '') {
  const primary = normalizedTask(primaryTask);
  const direct = SAMPLE_AGENT_DEFINITIONS[primary]?.leaderControlSpecialization;
  if (direct && typeof direct === 'object') return direct;
  for (const defaults of Object.values(SAMPLE_AGENT_DEFINITIONS)) {
    const aliases = Array.isArray(defaults?.workflowProfile?.aliases)
      ? defaults.workflowProfile.aliases.map(normalizedTask)
      : [];
    if (aliases.includes(primary) && defaults?.leaderControlSpecialization) return defaults.leaderControlSpecialization;
  }
  return DEFAULT_LEADER_CONTROL_SPECIALIZATION;
}

export function leaderControlContractForTask(primaryTask = '') {
  const primary = normalizedTask(primaryTask);
  if (!isLeaderTaskType(primary)) return null;
  const specialization = leaderControlSpecializationForTask(primary);
  return {
    version: LEADER_CONTROL_CONTRACT_VERSION,
    primaryTask: primary,
    owner: BASE_LEADER_CONTROL_CONTRACT.owner,
    handoffOwner: BASE_LEADER_CONTROL_CONTRACT.handoffOwner,
    orchestrationRole: BASE_LEADER_CONTROL_CONTRACT.orchestrationRole,
    role: BASE_LEADER_CONTROL_CONTRACT.role,
    goal: BASE_LEADER_CONTROL_CONTRACT.goal,
    controlLoop: [...BASE_LEADER_CONTROL_CONTRACT.controlLoop],
    stages: LEADER_CONTROL_STAGES.map((stage) => ({
      name: stage.name,
      responsibility: stage.responsibility,
      requiredOutput: [...stage.requiredOutput]
    })),
    handoffFields: [...BASE_LEADER_CONTROL_CONTRACT.handoffFields],
    qualityChecks: BASE_LEADER_CONTROL_CONTRACT.qualityChecks.map((check) => ({
      id: check.id,
      description: check.description
    })),
    notResponsibleFor: [...BASE_LEADER_CONTROL_CONTRACT.notResponsibleFor],
    downstreamTaskTypes: leaderProfileTaskTypes(primary),
    selectionRubric: [...specialization.selectionRubric],
    synthesisOutputs: [...specialization.synthesisOutputs]
  };
}

export function leaderControlContractMarkdown(primaryTask = '', isJapanese = false) {
  const contract = leaderControlContractForTask(primaryTask);
  if (!contract) return '';
  if (isJapanese) {
    return [
      '## Leader control contract',
      `- version: ${contract.version}`,
      `- owner: ${contract.owner}`,
      `- handoff owner: ${contract.handoffOwner}`,
      `- orchestration role: ${contract.orchestrationRole}`,
      `- role: ${contract.role}`,
      `- control loop: ${contract.controlLoop.join(' -> ')}`,
      `- handoff fields: ${contract.handoffFields.join(', ')}`,
      `- selection rubric: ${contract.selectionRubric.join(' / ')}`,
      `- synthesis outputs: ${contract.synthesisOutputs.join(' / ')}`,
      '- Leader は情報の受け取り、下流agentへの受け渡し、利用確認、最終統合の主体。orchestration は順序と品質ゲートを担保するだけ。'
    ].join('\n');
  }
  return [
    '## Leader control contract',
    `- version: ${contract.version}`,
    `- owner: ${contract.owner}`,
    `- handoff owner: ${contract.handoffOwner}`,
    `- orchestration role: ${contract.orchestrationRole}`,
    `- role: ${contract.role}`,
    `- control loop: ${contract.controlLoop.join(' -> ')}`,
    `- handoff fields: ${contract.handoffFields.join(', ')}`,
    `- selection rubric: ${contract.selectionRubric.join(' / ')}`,
    `- synthesis outputs: ${contract.synthesisOutputs.join(' / ')}`,
    '- The leader owns receiving information, handing it to downstream agents, checking usage, and final synthesis. Orchestration only preserves sequence and quality gates.'
  ].join('\n');
}

export function connectorExecutionPolicyForTask(taskType = '') {
  return CONNECTOR_EXECUTION_POLICIES[normalizedTask(taskType)] || null;
}

export function taskRequiresConnectorApproval(taskType = '') {
  return Boolean(connectorExecutionPolicyForTask(taskType)?.approvalMode);
}

