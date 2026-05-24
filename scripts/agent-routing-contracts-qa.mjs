import assert from 'node:assert/strict';
import {
  DEFAULT_AGENT_SEEDS,
  agentLinksFromRecord,
  applyConfirmedAgentRoutingToAgent,
  buildAgentRoutingConfirmation,
  inferTaskSequence
} from '../lib/shared.js';

function indexOf(sequence, task) {
  return sequence.indexOf(task);
}

function assertBefore(sequence, left, right, message) {
  assert.ok(sequence.includes(left), `${message}: missing ${left}`);
  assert.ok(sequence.includes(right), `${message}: missing ${right}`);
  assert.ok(indexOf(sequence, left) < indexOf(sequence, right), message);
}

for (const agent of DEFAULT_AGENT_SEEDS) {
  const links = agentLinksFromRecord(agent, { catalog: DEFAULT_AGENT_SEEDS });
  assert.ok(links.layer, `${agent.id} should infer a routing layer`);
  assert.ok(links.role, `${agent.id} should infer a routing role`);
  if (links.layer === 'execution') {
    assert.ok(links.approval_mode, `${agent.id} execution adapter should declare an approval mode`);
    assert.ok(
      links.upstream.task_types.includes('writing') || links.upstream.task_types.includes('research'),
      `${agent.id} execution adapter should link to writing or research upstream`
    );
    assert.ok(links.input_contract.length, `${agent.id} should expose an input contract`);
    assert.ok(links.output_contract.length, `${agent.id} should expose an output contract`);
  }
  if (links.layer === 'leader') {
    assert.ok(
      links.downstream.task_types.length || links.downstream.tags.length,
      `${agent.id} leader should declare downstream routing`
    );
  }
}

const expectedOutputContracts = new Map([
  ['agent_ads_planner_01', ['objective', 'audience', 'provider', 'campaign_structure', 'budget_cap_and_cpa_assumption', 'stop_rules', 'ads_saas_handoff', 'measurement_plan']],
  ['agent_campaign_operations_01', ['campaign_state', 'publisher_queue', 'approval_backlog', 'connector_readiness', 'measurement_loop', 'next_action_owner']],
  ['agent_cfo_leader_01', ['decision_question', 'assumption_table', 'formula_model', 'scenarios', 'sensitivity', 'decision_trigger', 'confidence_labels', 'risk_notes']],
  ['agent_research_01', ['answer_first', 'source_status', 'source_ledger', 'current_vs_inferred_facts', 'options', 'recommendation', 'verification_queue', 'verification_gaps']],
  ['agent_teardown_01', ['competitor_classification', 'observed_facts', 'inferences', 'comparison_table', 'wedge', 'first_test', 'verification_queue', 'evidence_gaps']],
  ['agent_validation_01', ['target_user', 'current_workaround', 'riskiest_assumption', 'test_design', 'test_script_or_asset', 'success_threshold', 'kill_criteria', 'false_positives_to_ignore', 'next_decision']],
  ['agent_pricing_01', ['pricing_question', 'value_metric', 'assumptions', 'formula', 'scenario_table', 'sensitivity_table', 'recommendation', 'decision_trigger', 'rollback_or_continue_rule']],
  ['agent_prompt_brushup_01', ['intent_ledger', 'original_prompt', 'rewritten_prompt', 'preserved_constraints', 'change_rationale', 'test_cases', 'failure_modes']],
  ['agent_hiring_01', ['role_outcomes', 'scorecard', 'job_description', 'must_have_and_nice_to_have', 'screening_questions', 'evaluation_rubric', 'exclusion_risks']],
  ['agent_data_analysis_01', ['question', 'dataset_status', 'metric_definitions', 'findings', 'caveats', 'analysis_notes', 'next_decision']],
  ['agent_diligence_01', ['decision_context', 'evidence_map', 'red_flag_matrix', 'fact_vs_inference', 'verification_queue', 'blocker_severity', 'conditional_recommendation']],
  ['agent_follow_up_01', ['open_loop_id', 'waiting_on_party', 'owner', 'deadline_or_timing_status', 'relationship_context', 'business_impact', 'follow_up_copy', 'approval_condition', 'send_or_reminder_handoff', 'next_check']],
  ['agent_meeting_prep_01', ['agenda', 'briefing_notes', 'questions', 'decision_points', 'participant_visible_context_scope', 'calendar_send_boundary', 'execution_status_labels']],
  ['agent_inbox_triage_01', ['inbox_scope', 'message_or_thread_source', 'priority', 'priority_reason', 'reply_needed_status', 'owner', 'deadline_or_timing_status', 'risk_flag', 'recommended_next_action', 'specialist_handoff', 'connector_state']],
  ['agent_reply_draft_01', ['message_or_thread_source', 'sender', 'recipient', 'relationship_context', 'desired_outcome', 'unresolved_facts', 'reply_draft', 'tone_rationale', 'approval_condition', 'send_handoff', 'follow_up_timing']],
  ['agent_schedule_coordination_01', ['schedule_request_source', 'participants', 'timezone', 'duration', 'meeting_purpose', 'availability_source', 'candidate_times', 'conflicts_or_constraints', 'invite_draft', 'participant_response_handoff', 'time_option_expiry', 'confirmation_owner', 'calendar_event_handoff', 'meeting_link_handoff', 'execution_status_labels', 'connector_state', 'next_check', 'draft_then_schedule']]
]);

for (const [agentId, expected] of expectedOutputContracts) {
  const agent = DEFAULT_AGENT_SEEDS.find((item) => item.id === agentId);
  assert.ok(agent, `${agentId} should exist in default seeds`);
  const links = agentLinksFromRecord(agent, { catalog: DEFAULT_AGENT_SEEDS });
  assert.deepEqual(links.output_contract, expected, `${agentId} should expose its current delivery contract via routing metadata`);
}

const xPostSequence = inferTaskSequence('x_post', 'X postまで作って承認後に投稿準備したい', { maxTasks: 5 });
assertBefore(xPostSequence, 'research', 'writing', 'x_post should research before writing');
assertBefore(xPostSequence, 'writing', 'x_post', 'x_post should draft before execution');

const multiChannelSequence = inferTaskSequence('cmo_leader', '1告知でX Reddit Indie Hackers Instagramまでまとめて作って投稿準備したい', { maxTasks: 14 });
assertBefore(multiChannelSequence, 'writing', 'reddit', 'multi-channel launch should draft before Reddit handoff copy');
assertBefore(multiChannelSequence, 'writing', 'indie_hackers', 'multi-channel launch should draft before Indie Hackers handoff copy');
assert.equal(multiChannelSequence.includes('x_post'), false, 'multi-channel leader route should not require an X connector execution agent');
assert.equal(multiChannelSequence.includes('instagram'), false, 'multi-channel leader route should not require an Instagram connector execution agent');

const userTwitterAgent = {
  id: 'agent_user_twitter_adapter_qa',
  name: 'User Twitter Adapter QA',
  description: 'Publishes approved social posts to Twitter and X after user approval.',
  taskTypes: ['twitter'],
  tags: ['social', 'x', 'marketing'],
  online: true,
  verificationStatus: 'verified',
  metadata: {
    manifest: {
      schema_version: 'agent-manifest/v1',
      name: 'user_twitter_adapter_qa',
      task_types: ['twitter'],
      metadata: {
        task_type_scores: {
          x_post: 0.95
        }
      }
    }
  }
};
const twitterConfirmation = buildAgentRoutingConfirmation(userTwitterAgent, { catalog: DEFAULT_AGENT_SEEDS });
assert.equal(twitterConfirmation.inferred.layer, 'execution');
assert.ok(twitterConfirmation.inferred.upstream.task_types.includes('writing'));
assert.ok(twitterConfirmation.inferred.upstream.resolved.some((agent) => agent.id === 'agent_writer_01'));
const confirmedTwitter = structuredClone(userTwitterAgent);
applyConfirmedAgentRoutingToAgent(confirmedTwitter, { catalog: DEFAULT_AGENT_SEEDS, confirmedBy: 'qa' });
assert.equal(confirmedTwitter.metadata.routing_confirmation.confirmed, true);
assert.equal(confirmedTwitter.metadata.agent_layer, 'execution');
assert.ok(confirmedTwitter.metadata.upstream_task_types.includes('writing'));

const userResearchAgent = {
  id: 'agent_user_research_qa',
  name: 'User Research QA',
  description: 'Researches sources, compares options, and returns evidence with confidence.',
  taskTypes: ['research'],
  tags: ['research', 'analysis', 'evidence'],
  online: true,
  verificationStatus: 'verified',
  metadata: {}
};
const researchConfirmation = buildAgentRoutingConfirmation(userResearchAgent, { catalog: DEFAULT_AGENT_SEEDS });
assert.equal(researchConfirmation.inferred.layer, 'research');
assert.ok(researchConfirmation.inferred.downstream.task_types.includes('writing'));

console.log('agent routing contracts qa passed');
