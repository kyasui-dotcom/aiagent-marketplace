import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  SAMPLE_AGENT_DEFINITIONS,
  SAMPLE_AGENT_KINDS,
  sampleAgentDefinitionForKind
} from '../lib/builtin-agents/agents/index.js';
import { leaderReadableAgentCatalogIndex } from '../lib/agent-catalog-index.js';
import { deliveryItemsFromJob, sanitizeDeliveryItemForSurface } from '../lib/delivery-items.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const agentsDir = join(root, 'lib', 'builtin-agents', 'agents');

assert.equal(existsSync(join(root, 'lib', 'builtin-agents.js')), false, 'central builtin-agents.js must not exist');
assert.equal(existsSync(join(root, 'lib', 'sample-agent-provider.js')), false, 'sample agents must not use a central provider runner');
assert.equal(existsSync(join(root, 'lib', 'sample-agent-catalog.js')), false, 'sample agents must not use a central catalog file');
assert.equal(existsSync(join(root, 'lib', 'agent-provider-runtime.js')), false, 'agent provider behavior must not be hidden in a shared runtime');

const agentFiles = readdirSync(agentsDir)
  .filter((name) => name.endsWith('.js') && name !== 'index.js')
  .sort();

assert.ok(agentFiles.length >= SAMPLE_AGENT_KINDS.length, 'agent definition files should cover sample agent kinds');

const outputRegressionFixtures = JSON.parse(readFileSync(join(__dirname, 'fixtures', 'agent-output-cases.json'), 'utf8'));
const outputRegressionCases = Array.isArray(outputRegressionFixtures.cases) ? outputRegressionFixtures.cases : [];
const outputRegressionFiles = new Set(outputRegressionCases.map((item) => item.file).filter(Boolean));
const missingOutputRegressionFiles = agentFiles.filter((fileName) => !outputRegressionFiles.has(fileName));
assert.deepEqual(missingOutputRegressionFiles, [], 'agent output regression fixtures should cover every sample agent file');
assert.equal(outputRegressionFiles.size, outputRegressionCases.length, 'agent output regression fixtures should use one canonical case per sample agent file');
for (const item of outputRegressionCases) {
  assert.ok(agentFiles.includes(item.file), `agent output regression fixture references an unknown sample agent file: ${item.file}`);
}

for (const [kind, definition] of Object.entries(SAMPLE_AGENT_DEFINITIONS)) {
  const manifest = definition.manifest || {};
  const metadata = manifest.metadata || {};
  if (kind !== manifest.kind) continue;
  assert.equal(metadata.agent_purpose, definition.agentPurpose, `${kind} manifest metadata must expose its agent-owned purpose`);
  assert.deepEqual(metadata.action_boundaries, definition.agentActionBoundaries, `${kind} manifest metadata must expose its agent-owned action boundaries`);
  assert.deepEqual(metadata.delivery_contract, definition.deliveryContract, `${kind} manifest metadata must expose its agent-owned delivery contract`);
  assert.ok(Array.isArray(metadata.action_boundaries) && metadata.action_boundaries.length > 0, `${kind} manifest metadata must include action boundaries`);
  assert.ok(Array.isArray(metadata.delivery_contract?.requiredDeliverySections) && metadata.delivery_contract.requiredDeliverySections.length > 0, `${kind} manifest metadata must include required delivery sections`);
  assert.ok(Array.isArray(metadata.delivery_contract?.requiredEvidence) && metadata.delivery_contract.requiredEvidence.length > 0, `${kind} manifest metadata must include required evidence`);
  assert.ok(Array.isArray(metadata.delivery_contract?.mustLabel) && metadata.delivery_contract.mustLabel.length > 0, `${kind} manifest metadata must include required assumption/status labels`);
  assert.ok(Array.isArray(metadata.delivery_contract?.forbiddenClaims) && metadata.delivery_contract.forbiddenClaims.length > 0, `${kind} manifest metadata must include forbidden claims`);
  assert.ok(String(metadata.delivery_contract?.validDeliveryCheck || '').trim(), `${kind} manifest metadata must include a valid delivery check`);
  for (const action of metadata.action_boundaries) {
    assert.ok(String(action?.id || '').trim(), `${kind} action boundaries must include an id`);
    assert.ok(String(action?.mode || '').trim(), `${kind} action boundaries must include a mode`);
    assert.ok(Array.isArray(action?.requires) && action.requires.length > 0, `${kind} action ${action?.id || '<missing>'} must include required inputs`);
    assert.ok(Array.isArray(action?.prepares) && action.prepares.length > 0, `${kind} action ${action?.id || '<missing>'} must include prepared work`);
    assert.ok(Array.isArray(action?.produces) && action.produces.length > 0, `${kind} action ${action?.id || '<missing>'} must include produced artifacts`);
    assert.ok(Array.isArray(action?.cannotClaim) && action.cannotClaim.length > 0, `${kind} action ${action?.id || '<missing>'} must include forbidden execution claims`);
    assert.ok(String(action?.authorityBoundary || '').trim(), `${kind} action ${action?.id || '<missing>'} must include an authority boundary`);
  }
}

const engineeringContractExpectations = [
  {
    kind: 'code',
    actions: ['prepare_patch_plan', 'implement_local_change', 'prepare_pr_handoff', 'verify_validation_evidence'],
    requiredSections: ['Affected files', 'Validation evidence', 'Release risk label', 'Rollback path', 'PR handoff'],
    guidedSections: ['Validation evidence', 'Release risk label', 'PR handoff'],
    forbiddenClaims: ['validation completed without command/result']
  },
  {
    kind: 'build_team_leader',
    actions: ['plan_implementation_team', 'resolve_parallel_work_boundaries', 'gate_validation_and_pr_handoff'],
    requiredSections: ['File ownership', 'Shared files and sequencing', 'Integration gate', 'Risk and rollback path'],
    guidedSections: ['File ownership', 'Shared files and sequencing', 'Execution slices', 'Integration gate', 'Validation commands', 'Risk and rollback path', 'PR handoff criteria'],
    forbiddenClaims: ['safe parallel execution without shared-file review']
  },
  {
    kind: 'cto_leader',
    actions: ['prepare_architecture_decision', 'prepare_rollout_packet', 'gate_migration_readiness'],
    requiredSections: ['Current state evidence', 'Readiness gate', 'Validation gate', 'Fallback owner', 'Risk tradeoff'],
    guidedSections: ['Readiness gate', 'Validation gate', 'Fallback owner', 'Risk tradeoff'],
    forbiddenClaims: ['production ready without readiness gate']
  }
];

const operationsContractExpectations = [
  {
    kind: 'follow_up',
    actions: ['prepare_open_loop_tracker', 'prepare_followup_draft', 'prepare_followup_send_handoff'],
    requiredSections: ['Open-loop table', 'Follow-up copy', 'Approval/send handoff', 'Next check'],
    forbiddenClaims: ['queued reminder without connector proof']
  },
  {
    kind: 'meeting_notes',
    actions: ['prepare_meeting_minutes', 'extract_action_items', 'prepare_minutes_distribution_handoff'],
    requiredSections: ['Decision log', 'Action items', 'Follow-up draft', 'Distribution approval gate'],
    forbiddenClaims: ['minutes distributed without proof']
  },
  {
    kind: 'schedule_coordination',
    actions: ['prepare_candidate_time_packet', 'prepare_invite_handoff', 'prepare_meeting_tool_handoff'],
    requiredSections: ['Availability source', 'Candidate times', 'Invite draft', 'Meeting-link handoff'],
    forbiddenClaims: ['meeting link created without proof']
  }
];

const productResearchContractExpectations = [
  {
    kind: 'pricing',
    actions: ['prepare_price_model', 'prepare_package_decision', 'prepare_sensitivity_decision'],
    requiredSections: ['Value metric', 'Formula', 'Scenario table', 'Sensitivity table', 'Decision trigger', 'Rollback or continue rule'],
    guidedSections: ['Sensitivity table', 'Rollback or continue rule'],
    forbiddenClaims: ['price test won without results']
  },
  {
    kind: 'validation',
    actions: ['prepare_falsification_plan', 'prepare_validation_next_step', 'prepare_interview_or_smoke_packet'],
    requiredSections: ['Target user', 'Current workaround', 'Riskiest assumption', 'Test script or asset', 'False positives to ignore', 'Kill criteria'],
    guidedSections: ['Test script or asset', 'False positives to ignore'],
    forbiddenClaims: ['respondents committed without evidence']
  },
  {
    kind: 'teardown',
    actions: ['prepare_competitor_comparison', 'prepare_differentiated_move', 'prepare_verification_queue'],
    requiredSections: ['Competitor classification', 'Observed facts', 'Inferences', 'Verification queue', 'Evidence gaps'],
    guidedSections: ['Verification queue'],
    forbiddenClaims: ['unverified competitor claim resolved']
  },
  {
    kind: 'research',
    actions: ['prepare_source_backed_memo', 'prepare_decision_recommendation', 'prepare_verification_queue'],
    requiredSections: ['Answer first', 'Source status', 'Source ledger', 'Current vs inferred facts', 'Verification queue', 'Verification gaps'],
    guidedSections: ['Verification queue'],
    forbiddenClaims: ['verification completed without source']
  }
];

const workSupportContractExpectations = [
  {
    kind: 'prompt_brushup',
    actions: ['prepare_prompt_rewrite', 'prepare_prompt_test_cases'],
    requiredSections: ['Intent ledger', 'Original prompt', 'Rewritten prompt', 'Preserved constraints', 'Change rationale', 'Test cases', 'Failure modes'],
    guidedSections: ['Intent ledger', 'Original prompt', 'Rewritten prompt', 'Preserved constraints', 'Change rationale', 'Test cases', 'Failure modes'],
    forbiddenClaims: ['intent changed without label', 'tested claim without results']
  },
  {
    kind: 'hiring',
    actions: ['prepare_jd_packet', 'prepare_screening_rubric'],
    requiredSections: ['Role outcomes', 'Scorecard', 'Job description', 'Must-have and nice-to-have', 'Screening questions', 'Evaluation rubric', 'Exclusion risks'],
    guidedSections: ['Role outcomes', 'Scorecard', 'Job description', 'Must-have and nice-to-have', 'Screening questions', 'Evaluation rubric', 'Exclusion risks'],
    forbiddenClaims: ['generic JD without scorecard', 'candidate decision without evidence']
  },
  {
    kind: 'data_analysis',
    actions: ['prepare_metric_audit', 'prepare_analysis_memo'],
    requiredSections: ['Question', 'Dataset status', 'Metric definitions', 'Findings', 'Caveats', 'Analysis notes', 'Next decision'],
    guidedSections: ['Question', 'Dataset status', 'Metric definitions', 'Findings', 'Caveats', 'Analysis notes', 'Next decision'],
    forbiddenClaims: ['data-backed conclusion without dataset evidence', 'causal claim without test design']
  },
  {
    kind: 'diligence',
    actions: ['prepare_red_flag_review', 'prepare_verification_queue'],
    requiredSections: ['Decision context', 'Evidence map', 'Red flag matrix', 'Fact vs inference', 'Verification queue', 'Blocker severity', 'Conditional recommendation'],
    guidedSections: ['Decision context', 'Evidence map', 'Red flag matrix', 'Fact vs inference', 'Verification queue', 'Blocker severity', 'Conditional recommendation'],
    forbiddenClaims: ['risk cleared without evidence', 'generic risk list without severity']
  }
];

const externalCommunicationContractExpectations = [
  {
    kind: 'x_post',
    actions: ['prepare_x_post_packet', 'prepare_x_schedule_packet', 'prepare_x_connector_handoff'],
    requiredSections: ['Exact post text', 'Approval checklist', 'Connector handoff boundary', 'Execution status labels'],
    guidedSections: ['Exact post text', 'Connector handoff boundary', 'Execution status labels'],
    forbiddenClaims: ['posted', 'scheduled', 'queued']
  },
  {
    kind: 'email_ops',
    actions: ['prepare_lifecycle_email_packet', 'prepare_email_schedule_packet', 'prepare_email_send_handoff'],
    requiredSections: ['Segment', 'Sender', 'Approval checklist', 'Send boundary', 'Execution status labels'],
    guidedSections: ['Send boundary', 'Measurement plan', 'Execution status labels'],
    forbiddenClaims: ['sent', 'scheduled', 'queued']
  },
  {
    kind: 'cold_email',
    actions: ['qualify_cold_lead_queue', 'draft_company_specific_sequence', 'prepare_cold_email_send_handoff'],
    requiredSections: ['Lead source status', 'Qualification queue', 'Exact recipient approval', 'Approval/send boundary', 'Connector handoff packet', 'Execution status labels'],
    guidedSections: ['Lead source status and qualification queue', 'Exact recipient approval', 'Approval/send boundary', 'Connector handoff packet', 'Execution status labels'],
    forbiddenClaims: ['sent', 'queued', 'CRM imported']
  },
  {
    kind: 'instagram',
    actions: ['prepare_instagram_caption_packet', 'prepare_instagram_creative_brief', 'prepare_instagram_schedule_handoff'],
    requiredSections: ['Format decision', 'Visual brief', 'Exact caption', 'Schedule handoff', 'Approval checklist', 'Connector boundary', 'Execution status labels'],
    guidedSections: ['Exact caption', 'Schedule handoff', 'Approval checklist', 'Connector handoff boundary', 'Execution status labels'],
    forbiddenClaims: ['posted', 'scheduled', 'queued']
  },
  {
    kind: 'reddit',
    actions: ['prepare_subreddit_fit_packet', 'draft_reddit_discussion_packet', 'prepare_reddit_manual_posting_handoff'],
    requiredSections: ['Subreddit assumptions', 'Community fit', 'Rule risk', 'Non-promotional angle', 'Manual posting boundary', 'Execution status labels'],
    guidedSections: ['Subreddit assumptions', 'Manual posting boundary', 'Execution status labels'],
    forbiddenClaims: ['posted', 'submitted', 'queued']
  },
  {
    kind: 'indie_hackers',
    actions: ['prepare_indie_hackers_post_packet', 'prepare_indie_hackers_reply_plan', 'prepare_indie_hackers_publish_handoff'],
    requiredSections: ['Founder story angle', 'Community fit', 'CTA softness', 'Manual publish boundary', 'Execution status labels'],
    guidedSections: ['CTA softness', 'Manual publish boundary', 'Execution status labels'],
    forbiddenClaims: ['published', 'posted', 'commented']
  }
];

for (const expectation of [...engineeringContractExpectations, ...operationsContractExpectations, ...productResearchContractExpectations, ...workSupportContractExpectations, ...externalCommunicationContractExpectations]) {
  const definition = sampleAgentDefinitionForKind(expectation.kind);
  assert.ok(definition, `${expectation.kind} should resolve from sample agent definitions`);
  const actionIds = new Set((definition.agentActionBoundaries || []).map((action) => action.id));
  for (const actionId of expectation.actions) {
    assert.ok(actionIds.has(actionId), `${expectation.kind} must expose ${actionId} as an agent-owned action boundary`);
  }
  const requiredSections = new Set(definition.deliveryContract?.requiredDeliverySections || []);
  for (const section of expectation.requiredSections) {
    assert.ok(requiredSections.has(section), `${expectation.kind} delivery contract must require ${section}`);
  }
  const forbiddenClaims = new Set(definition.deliveryContract?.forbiddenClaims || []);
  for (const claim of expectation.forbiddenClaims) {
    assert.ok(forbiddenClaims.has(claim), `${expectation.kind} delivery contract must forbid "${claim}"`);
  }
  const outputSections = new Set(definition.outputSections || []);
  for (const section of expectation.guidedSections || []) {
    assert.ok(outputSections.has(section), `${expectation.kind} output sections must guide the model to emit ${section}`);
  }
}

for (const fileName of agentFiles) {
  const source = readFileSync(join(agentsDir, fileName), 'utf8');
  assert.ok(source.includes('const AGENT_PROVIDER = Object.freeze({'), `${fileName} must define its own provider`);
  assert.ok(source.includes('AGENT_DEFINITION.manifest = Object.freeze({'), `${fileName} must define its own manifest`);
  assert.ok(source.includes('health({'), `${fileName} provider must own health response behavior`);
  assert.ok(source.includes('async runJob({'), `${fileName} provider must own job execution behavior`);
  assert.ok(source.includes('provider: AGENT_PROVIDER'), `${fileName} default export must expose its provider`);
  assert.ok(source.includes('agent_purpose: AGENT_DEFINITION.agentPurpose'), `${fileName} manifest metadata must expose the agent-owned purpose inside the agent file`);
  assert.ok(source.includes('action_boundaries: AGENT_DEFINITION.agentActionBoundaries'), `${fileName} manifest metadata must expose action boundaries inside the agent file`);
  assert.ok(source.includes('delivery_contract: AGENT_DEFINITION.deliveryContract'), `${fileName} manifest metadata must expose the delivery contract inside the agent file`);
  assert.ok(!source.includes('agent-provider-runtime'), `${fileName} must not import a shared provider runtime`);
  assert.ok(!source.includes('sample-agent-provider'), `${fileName} must not call a central sample provider`);
  assert.ok(!source.includes('sample-agent-catalog'), `${fileName} must not call a central sample catalog`);
  assert.ok(!source.includes('additionalProperties: true'), `${fileName} OpenAI strict schemas must not allow additionalProperties: true`);
  assert.ok(!source.includes("name: 'cait_agent_delivery'"), `${fileName} must not require OpenAI to emit CAIt's internal delivery schema`);
  assert.ok(!source.includes('Return valid JSON matching the schema'), `${fileName} must accept raw OpenAI delivery text instead of requiring JSON`);
  assert.ok(!source.includes('agentProviderFallbackDelivery'), `${fileName} must not recover failed model output with an agent-definition fallback`);
  assert.ok(!source.includes('agent_definition_packet'), `${fileName} must not mark fallback definition packets as completed deliveries`);
  assert.ok(
    !source.includes("required: ['summary', 'report_summary', 'bullets', 'next_action', 'file_markdown']"),
    `${fileName} delivery generation schema must require every declared strict-schema property`
  );
}

const workerSource = readFileSync(join(root, 'worker.js'), 'utf8');
assert.ok(workerSource.includes("from './lib/builtin-agents/agents/index.js'"), 'worker must read agent-file manifests through the agent index');
assert.ok(workerSource.includes('sampleAgentDefinitionForKind'), 'worker must resolve routes from agent-file manifests');
assert.ok(!workerSource.includes("sample-agent-catalog.js"), 'worker must not import a central sample catalog');
assert.ok(!workerSource.includes('runBuiltInAgent'), 'worker must not call a built-in special runner');
assert.ok(!workerSource.includes('builtInAgentHealthPayload'), 'worker must not call built-in special health logic');

assert.ok(SAMPLE_AGENT_KINDS.includes('research'), 'research sample agent should remain routable');
assert.equal(SAMPLE_AGENT_KINDS.includes('free_web_growth_leader'), false, 'unroutable agent manifests must stay unroutable');

const research = sampleAgentDefinitionForKind('research');
assert.equal(research.manifest.kind, 'research');
assert.equal(research.manifest.jobEndpoint, '/sample-agents/research/jobs');
assert.equal(research.manifest.metadata.provider, 'agent_file');

const seoSpecialist = sampleAgentDefinitionForKind('seo_specialist');
const removedSeoKind = ['seo', 'gap'].join('_');
assert.equal(seoSpecialist.manifest.kind, 'seo_specialist');
assert.equal(seoSpecialist.manifest.agent_role, 'worker');
assert.equal(seoSpecialist.manifest.jobEndpoint, '/sample-agents/seo_specialist/jobs');
assert.equal(seoSpecialist.manifest.healthcheckUrl, '/sample-agents/seo_specialist/health');
assert.equal(seoSpecialist.manifest.metadata.provider, 'agent_file');
assert.equal(seoSpecialist.manifest.metadata.workflow_layer || seoSpecialist.seedProfile.metadata.workflow_layer, 'preparation');
assert.ok(SAMPLE_AGENT_KINDS.includes('seo_specialist'), 'seo_specialist should be routable through its agent-file manifest');
assert.equal(SAMPLE_AGENT_KINDS.includes(removedSeoKind), false, 'removed old SEO kind must not remain as a routable agent kind');
assert.equal(sampleAgentDefinitionForKind(removedSeoKind)?.manifest.kind, 'seo_specialist', 'old seo_gap workflow endpoints should remain as non-catalog compatibility aliases');
assert.equal(sampleAgentDefinitionForKind('seo')?.manifest.kind, 'seo_specialist', 'seo should route to the SEO specialist');
assert.equal(sampleAgentDefinitionForKind('seo_leader_agent'), null, 'SEO must not be registered as a separate leader agent');
assert.match(seoSpecialist.systemPrompt, /not a leader/i, 'seo_specialist should not be a leader');
assert.match(seoSpecialist.systemPrompt, /do not delegate SEO work to other agents/i, 'seo_specialist should own SEO work inside its file');
assert.match(seoSpecialist.systemPrompt, /URLs/i, 'seo_specialist should request user evidence URLs');
assert.match(seoSpecialist.systemPrompt, /PDFs/i, 'seo_specialist should request user evidence PDFs');
assert.match(seoSpecialist.systemPrompt, /X posts/i, 'seo_specialist should request user evidence X proof');
assert.match(seoSpecialist.systemPrompt, /owned blog/i, 'seo_specialist should request user evidence blog proof');
assert.match(seoSpecialist.systemPrompt, /estimate cost[\s\S]*explicit user approval/i, 'seo_specialist should require cost estimate and explicit approval before full-batch writing');
assert.match(seoSpecialist.systemPrompt, /Publisher & Approval Studio batch handoff/i, 'seo_specialist should create Publisher batch handoff after approval');

const health = research.provider.health({ kind: 'research', definition: research, source: {} });
assert.equal(health.provider, 'agent_file');
assert.equal(health.kind, 'research');

const originalFetch = globalThis.fetch;
let openAiDeliveryCalls = 0;
let braveSearchCalls = 0;
globalThis.fetch = async (url, options = {}) => {
  const target = String(url || '');
  if (/api\.search\.brave\.com|\/res\/v1\/web\/search/i.test(target)) {
    braveSearchCalls += 1;
    const requestUrl = new URL(target);
    const query = requestUrl.searchParams.get('q') || 'research query';
    assert.ok(options.headers?.['x-subscription-token'], 'Brave source collection must send its API token');
    return new Response(JSON.stringify({
      web: {
        results: [
          {
            title: `Brave result for ${query}`,
            url: 'https://example.com/market-report',
            description: 'Current market evidence from Brave Search.'
          },
          {
            title: 'Competitor acquisition example',
            url: 'https://competitor.example/case-study',
            description: 'Competitor channel and positioning evidence.'
          }
        ]
      }
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  }
  if (target.includes('/responses')) {
    openAiDeliveryCalls += 1;
    const request = JSON.parse(String(options.body || '{}'));
    assert.equal(request.text?.format, undefined, 'OpenAI delivery generation must not require a structured internal schema');
    const userContent = request.input?.find((item) => item.role === 'user')?.content?.[0]?.text || '{}';
    const packet = JSON.parse(userContent);
    const kind = packet.agent?.kind || 'agent';
    const packetDefinition = sampleAgentDefinitionForKind(kind);
    if (packetDefinition?.deliveryContract) {
      assert.deepEqual(
        packet.delivery_quality_gate?.required_sections,
        Array.from(packetDefinition.deliveryContract.requiredDeliverySections || []),
        `${kind} provider request must carry its agent-owned required delivery sections`
      );
      assert.deepEqual(
        packet.delivery_quality_gate?.required_evidence,
        Array.from(packetDefinition.deliveryContract.requiredEvidence || []),
        `${kind} provider request must carry its agent-owned evidence requirements`
      );
      assert.deepEqual(
        packet.delivery_quality_gate?.must_label,
        Array.from(packetDefinition.deliveryContract.mustLabel || []),
        `${kind} provider request must carry its agent-owned status labels`
      );
      assert.deepEqual(
        packet.delivery_quality_gate?.forbidden_claims,
        Array.from(packetDefinition.deliveryContract.forbiddenClaims || []),
        `${kind} provider request must carry its agent-owned forbidden claims`
      );
      assert.equal(
        packet.delivery_quality_gate?.valid_delivery_check,
        packetDefinition.deliveryContract.validDeliveryCheck,
        `${kind} provider request must carry its agent-owned valid delivery check`
      );
    }
    const targetUrl = packet.target_url || 'la demande';
    const cmoReportExtras = packet.leader_synthesis?.reportExtras || {};
    const leaderEvaluationRequired = packet.leader_synthesis?.mode === 'llm_leader_evaluation_required'
      || cmoReportExtras.leader_evaluation_required === true;
    const specialistOutputs = Array.isArray(packet.leader_synthesis?.specialist_outputs)
      ? packet.leader_synthesis.specialist_outputs
      : [];
    const selectedLane = cmoReportExtras.selected_lane || '';
    const selectedNextOwner = cmoReportExtras.selected_next_owner || '';
    const cmoMarkdown = leaderEvaluationRequired ? [
      '# CMO leader final synthesis',
      '',
      '## Direct answer',
      'The CMO leader evaluated all specialist outputs and integrated the usable work into one final recommendation.',
      '',
      '## Adoption matrix',
      '| Agent | Decision | Reason |',
      '| --- | --- | --- |',
      ...specialistOutputs.slice(0, 5).map((item) => `| ${item.task_type || 'specialist'} | ${item.blocked ? 'held' : 'adopted'} | judged from the supplied content excerpt |`),
      '',
      '## Integrated final recommendation',
      'Use the landing/SEO copy where substantiated, keep analytics tracking validation as the first required action, and hold blocked lead/list work.',
      '',
      '## Publisher draft status',
      '- Publisher handoff draft prepared in chat',
      '- External app ingest status: not verified',
      '- Publish status: not published',
      '',
      '## Publisher handoff draft',
      'Title: AI agent marketplace conversion page update',
      'Primary CTA: Start signup',
      '',
      '## Blocked or not selected',
      '- list_creator: blocked source gap'
    ].join('\n') : (selectedLane ? [
      '# Livraison CMO',
      '',
      '## Final selected lane',
      `Final selected lane: **${selectedLane}**`,
      '',
      '## Publisher/SaaS handoff',
      '- Connector: publisher',
      '- Action type: site_publish_packet',
      '',
      '## Publisher body',
      'Use the SEO page packet and exact generated copy.',
      '',
      '## Blocked or not selected',
      '- list_creator: blocked source gap'
    ].join('\n') : (selectedNextOwner ? [
      '# Livraison CMO checkpoint',
      '',
      '## Checkpoint reviewed',
      `Next owner: **${selectedNextOwner}**`,
      '',
      '## Planning',
      'media_planner should receive the evidence-backed handoff.'
    ].join('\n') : [
      '# Livraison CMO',
      '',
      '## Publisher/SaaS handoff',
      '- Connector: publisher',
      '- Action type: site_publish_packet',
      '',
      '## Publisher body',
      'Use the SEO page packet and exact generated copy.'
    ].join('\n')));
    const writerMarkdown = [
      '# Livraison Publisher handoff',
      '',
      '## Publisher handoff',
      '- Destination: X',
      '- URL: https://aiagent-marketplace.net',
      '',
      '## Draft variants',
      '1. Source-backed variant one for developers.',
      '2. Source-backed variant two for trials.',
      '3. Source-backed variant three for proof.',
      '',
      '## E-E-A-T source ledger',
      '- Founder note: provided file evidence.',
      '- X account/source: provided URL.'
    ].join('\n');
    const writerArtifacts = kind === 'writer' ? [
      {
        id: 'writer-publisher-handoff',
        surface: 'publisher',
        type: 'x_post',
        item_type: 'x_post',
        channel_key: 'x',
        destination: 'X',
        connector: 'x',
        action_type: 'x_post_packet',
        body: writerMarkdown,
        publish_variants: ['variant one', 'variant two', 'variant three'],
        source_evidence: [
          { source_type: 'x_post_or_account', url: 'https://x.com/cait' },
          { source_type: 'uploaded_file', name: 'founder-note.md' }
        ],
        eeat_notes: { trust: 'source evidence preserved' },
        metadata: { source_evidence: [{ source_type: 'x_post_or_account' }], publish_variants: ['variant one', 'variant two', 'variant three'], eeat_notes: { trust: 'source evidence preserved' } }
      },
      {
        id: 'writer-publisher-handoff-owned-site-article',
        surface: 'publisher',
        type: 'article',
        item_type: 'article',
        channel_key: 'owned_site',
        destination: 'Owned site',
        connector: 'publisher',
        action_type: 'site_publish_packet',
        body: writerMarkdown,
        publish_variants: ['variant one', 'variant two', 'variant three'],
        source_evidence: [{ source_type: 'uploaded_file', name: 'founder-note.md' }],
        eeat_notes: { trust: 'source evidence preserved' },
        metadata: { source_evidence: [{ source_type: 'uploaded_file' }], publish_variants: ['variant one', 'variant two', 'variant three'], eeat_notes: { trust: 'source evidence preserved' } }
      }
    ] : [];
    const cmoArtifacts = kind === 'cmo_leader' && leaderEvaluationRequired ? [
      {
        id: 'cmo-leader-publisher-handoff-draft',
        surface: 'publisher',
        destination: 'Publisher & Approval Studio',
        connector: 'publisher',
        action_type: 'site_publish_packet',
        content_type: 'site_publish_packet',
        item_type: 'landing_page_change',
        body: 'Title: AI agent marketplace conversion page update\nPrimary CTA: Start signup',
        metadata: {
          prepared_in_chat: true,
          ingest_status: 'not_ingested',
          publish_status: 'not_published'
        }
      }
    ] : [];
    const researchMarkdown = [
      `# Livraison ${kind}`,
      '',
      '## Evidence status',
      `Contenu généré en français pour ${targetUrl}.`,
      '',
      '## Décision',
      'Utiliser ce brouillon comme sortie agent.'
    ].join('\n');
    const payload = {
      summary: kind === 'cmo_leader' && leaderEvaluationRequired
        ? { headline: `Livraison générée pour ${kind}` }
        : `Livraison générée pour ${kind}`,
      report_summary: kind === 'cmo_leader' && leaderEvaluationRequired
        ? { headline: `Synthèse générée pour ${kind}` }
        : `Synthèse générée pour ${kind}`,
      bullets: [
        'Le modèle a rédigé le contenu utilisateur.',
        'La langue demandée est respectée sans limite à deux langues.'
      ],
      next_action: kind === 'cmo_leader' && leaderEvaluationRequired
        ? { action: 'Vérifier le contenu généré puis poursuivre le flux.' }
        : 'Vérifier le contenu généré puis poursuivre le flux.',
      file_markdown: kind === 'cmo_leader' ? cmoMarkdown : (kind === 'writer' ? writerMarkdown : (kind === 'research' ? researchMarkdown : [
        `# Livraison ${kind}`,
        '',
        '## Décision',
        `Contenu généré en français pour ${targetUrl}.`,
        '',
        '## Action',
        'Utiliser ce brouillon comme sortie agent.'
      ].join('\n'))),
      content_type: kind === 'cmo_leader' && leaderEvaluationRequired ? 'cmo_leader_delivery' : (kind === 'cmo_leader' && selectedLane ? 'site_publish_packet' : 'agent_delivery'),
      artifacts: [...writerArtifacts, ...cmoArtifacts],
      approval_requests: []
    };
    return new Response(JSON.stringify({ output_text: JSON.stringify(payload) }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  }
  if (originalFetch) return originalFetch(url, options);
  throw new Error(`Unexpected fetch call: ${target}`);
};

for (const kind of SAMPLE_AGENT_KINDS) {
  const definition = sampleAgentDefinitionForKind(kind);
  const delivery = await definition.provider.runJob({
    kind,
    definition,
    body: {
      prompt: `Créer une livraison concrète pour ${kind} et https://example.com.`,
      output_language: 'fr-FR'
    },
    source: { OPENAI_API_KEY: 'sk-test-openai-delivery' },
    manifest: definition.manifest
  });
  const content = delivery.files?.[0]?.content || '';
  assert.equal(delivery.status, 'completed', `${kind} should complete with OpenAI-generated delivery`);
  assert.equal(delivery.runtime?.generation_provider, 'openai_responses', `${kind} should mark OpenAI generation`);
  assert.match(content, /Livraison|Décision|français/i, `${kind} should use the OpenAI-generated non-English content`);
  assert.doesNotMatch(content, /Answer first|先に結論|prepared a concrete work product/i, `${kind} should not fall back to hardcoded bilingual delivery text when OpenAI is configured`);
}
assert.ok(openAiDeliveryCalls >= SAMPLE_AGENT_KINDS.length, 'each sample agent should use OpenAI delivery generation when configured');

const configuredOpenAiFetch = globalThis.fetch;
globalThis.fetch = async (url, options = {}) => {
  const target = String(url || '');
  if (target.includes('/responses')) {
    const request = JSON.parse(String(options.body || '{}'));
    assert.equal(request.text?.format, undefined, 'raw OpenAI delivery path must not request a structured format');
    return new Response(JSON.stringify({
      output_text: '# Raw CMO delivery\n\n- This is direct model output.\n- It should become the user-facing delivery file.'
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  }
  return configuredOpenAiFetch(url, options);
};
const cmoRawDefinition = sampleAgentDefinitionForKind('cmo_leader');
const cmoRawDelivery = await cmoRawDefinition.provider.runJob({
  kind: 'cmo_leader',
  definition: cmoRawDefinition,
  body: {
    prompt: 'Task: cmo_leader\nGoal: return a raw model-authored delivery for https://aiagent-marketplace.net',
    output_language: 'en'
  },
  source: { OPENAI_API_KEY: 'sk-test-openai-raw-delivery' },
  manifest: cmoRawDefinition.manifest
});
assert.equal(cmoRawDelivery.status, 'completed', 'raw OpenAI text should complete as the delivery');
assert.equal(cmoRawDelivery.runtime?.generation_provider, 'openai_responses', 'raw OpenAI text should not fall back to an agent definition packet');
assert.match(cmoRawDelivery.files?.[0]?.content || '', /Raw CMO delivery[\s\S]*direct model output/i, 'raw OpenAI text should be returned as the user-facing delivery file');

globalThis.fetch = async (url, options = {}) => {
  const target = String(url || '');
  if (target.includes('/responses')) {
    const request = JSON.parse(String(options.body || '{}'));
    assert.equal(request.text?.format, undefined, 'Responses metadata extraction path must not request a structured format');
    return new Response(JSON.stringify({
      text: { format: { type: 'text' }, verbosity: 'medium' },
      output: [{
        content: [{
          type: 'output_text',
          text: '# Responses content delivery\n\n- This output came from output[].content[].text.\n- Top-level text.verbosity must not become the delivery file.'
        }]
      }]
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  }
  return configuredOpenAiFetch(url, options);
};
const cmoResponsesContentDelivery = await cmoRawDefinition.provider.runJob({
  kind: 'cmo_leader',
  definition: cmoRawDefinition,
  body: {
    prompt: 'Task: cmo_leader\nGoal: verify Responses content extraction for https://aiagent-marketplace.net',
    output_language: 'en'
  },
  source: { OPENAI_API_KEY: 'sk-test-openai-responses-content' },
  manifest: cmoRawDefinition.manifest
});
assert.equal(cmoResponsesContentDelivery.status, 'completed', 'Responses content array output should complete as the delivery');
assert.match(cmoResponsesContentDelivery.files?.[0]?.content || '', /Responses content delivery[\s\S]*output\[\]\.content\[\]\.text/i, 'Responses content array text should become the user-facing delivery file');
assert.doesNotMatch(cmoResponsesContentDelivery.files?.[0]?.content || '', /verbosity\s+medium/i, 'Responses top-level text metadata must not become the delivery file');

globalThis.fetch = async (url, options = {}) => {
  const target = String(url || '');
  if (target.includes('/responses')) {
    return new Response(JSON.stringify({ output_text: '{}' }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  }
  return configuredOpenAiFetch(url, options);
};
const cmoFailureDefinition = sampleAgentDefinitionForKind('cmo_leader');
const cmoConfiguredFailure = await cmoFailureDefinition.provider.runJob({
  kind: 'cmo_leader',
  definition: cmoFailureDefinition,
  body: {
    prompt: 'Task: cmo_leader\nGoal: increase signups for https://aiagent-marketplace.net\nPriority channel: Organic search / SEO',
    output_language: 'en'
  },
  source: { OPENAI_API_KEY: 'sk-test-openai-delivery' },
  manifest: cmoFailureDefinition.manifest
});
assert.equal(cmoConfiguredFailure.status, 'failed', 'configured CMO leader must fail malformed empty OpenAI output instead of using fallback delivery');
assert.match(cmoConfiguredFailure.failure_reason || '', /openai_delivery_generation_failed|missing_required_deliverable/i, 'CMO malformed output should surface a delivery failure');
assert.equal((cmoConfiguredFailure.files || []).length, 0, 'CMO malformed output must not attach fallback files');
const dataFailureDefinition = sampleAgentDefinitionForKind('data_analysis');
const dataConfiguredFailure = await dataFailureDefinition.provider.runJob({
  kind: 'data_analysis',
  definition: dataFailureDefinition,
  body: {
    prompt: 'GA4 property: properties/1\nSessions: 554\nConversions: 0\nConversion rate: 0%\nPriority channel: Organic search / SEO',
    output_language: 'en'
  },
  source: { OPENAI_API_KEY: 'sk-test-openai-delivery' },
  manifest: dataFailureDefinition.manifest
});
assert.equal(dataConfiguredFailure.status, 'failed', 'configured data analysis must fail malformed empty OpenAI output instead of using fallback delivery');
assert.match(dataConfiguredFailure.failure_reason || '', /openai_delivery_generation_failed/i, 'data analysis malformed output should surface generation failure');
assert.equal((dataConfiguredFailure.files || []).length, 0, 'data analysis malformed output must not attach fallback files');
globalThis.fetch = configuredOpenAiFetch;

const leakedOutputContractPattern = /##\s*Delivery packet|Write sections for|Write a two-part Markdown delivery|Agent-owned behavior|provider\.runJob|agent-file provider implementation|WORKFLOW HANDOFF CONTEXT|STRUCTURED HANDOFF DIGEST/i;

function assertUserFacingDelivery(result, label, requiredPatterns = []) {
  const content = result.files?.[0]?.content || '';
  assert.equal(result.status, 'completed', `${label} should complete`);
  assert.ok(!leakedOutputContractPattern.test(content), `${label} must not expose output contracts or workflow prompt internals`);
  assert.ok(!/provider delivery|agent-file provider implementation/i.test(result.summary || ''), `${label} summary must not expose provider implementation details`);
  for (const pattern of requiredPatterns) {
    assert.match(content, pattern, `${label} should include ${pattern}`);
  }
}

function assertMissingConcreteDelivery(result, label) {
  assert.equal(result.status, 'failed', `${label} should fail instead of returning a shared template delivery`);
  assert.match(result.failure_reason || result.error || '', /missing_required_deliverable|openai_delivery_generation_unavailable/, `${label} should name the missing delivery generation contract`);
  assert.equal((result.files || []).length, 0, `${label} should not attach fallback files`);
}

const adsPlanner = sampleAgentDefinitionForKind('ads_planner');
const fallbackAdsPlan = await adsPlanner.provider.runJob({
  kind: 'ads_planner',
  definition: adsPlanner,
  body: {
    prompt: [
      'Plan a small Google Ads test for https://aiagent-marketplace.net.',
      'Audience: developers and technical founders',
      'Budget cap: 300',
      'Target CPA: 20'
    ].join('\n'),
    output_language: 'en',
    provider: 'google_ads',
    budgetCap: 300,
    targetCpa: 20,
    input: { target_url: 'https://aiagent-marketplace.net' }
  },
  source: {},
  manifest: adsPlanner.manifest
});
assertUserFacingDelivery(fallbackAdsPlan, 'ads_planner fallback delivery', [
  /## Objective/i,
  /## Audience/i,
  /## Provider/i,
  /## Campaign structure/i,
  /## Budget cap and CPA assumption/i,
  /## Stop rules/i,
  /## Ads SaaS handoff/i,
  /## Measurement plan/i
]);
const fallbackAdsContent = fallbackAdsPlan.files?.[0]?.content || '';
assert.match(fallbackAdsContent, /not created, not submitted, not launched, not spent/i, 'ads_planner fallback must label execution status as not executed');
assert.doesNotMatch(fallbackAdsContent, /created ads|launched ads|spent budget|changed bids/i, 'ads_planner fallback must not overclaim ad execution');
const fallbackAdsPlanJa = await adsPlanner.provider.runJob({
  kind: 'ads_planner',
  definition: adsPlanner,
  body: {
    prompt: [
      'https://aiagent-marketplace.net の Google 広告テストを計画してください。',
      '対象: 開発者と技術系ファウンダー',
      '予算上限: 300',
      '目標CPA: 20'
    ].join('\n'),
    output_language: 'ja',
    provider: 'google_ads',
    budgetCap: 300,
    targetCpa: 20,
    input: { target_url: 'https://aiagent-marketplace.net' }
  },
  source: {},
  manifest: adsPlanner.manifest
});
const fallbackAdsContentJa = fallbackAdsPlanJa.files?.[0]?.content || '';
assert.match(fallbackAdsContentJa, /## 目的/i, 'ads_planner Japanese fallback should keep localized section headings');
assert.match(fallbackAdsContentJa, /## Ads SaaS 引き継ぎ/i, 'ads_planner Japanese fallback should localize handoff section');
assert.doesNotMatch(fallbackAdsContentJa, /## Objective|## Audience|## Campaign structure/i, 'ads_planner Japanese fallback must not fall back to English section headings');

const campaignOperations = sampleAgentDefinitionForKind('campaign_operations');
const fallbackCampaignOps = await campaignOperations.provider.runJob({
  kind: 'campaign_operations',
  definition: campaignOperations,
  body: {
    prompt: 'Prepare campaign operations for the CMO plan.',
    output_language: 'en',
    campaign: {
      title: 'Developer signup campaign',
      objective: 'Increase qualified developer signups',
      audience: 'developers and technical founders',
      targetUrl: 'https://aiagent-marketplace.net',
      channels: ['publisher', 'ads', 'analytics'],
      kpis: ['qualified signups', 'trial starts']
    }
  },
  source: {},
  manifest: campaignOperations.manifest
});
assertUserFacingDelivery(fallbackCampaignOps, 'campaign_operations fallback delivery', [
  /## Campaign state/i,
  /## Publisher queue/i,
  /## Approval backlog/i,
  /## Connector readiness/i,
  /## Measurement loop/i,
  /## Next action owner/i
]);
const fallbackCampaignContent = fallbackCampaignOps.files?.[0]?.content || '';
assert.match(fallbackCampaignContent, /Publisher ingest: not verified/i, 'campaign_operations fallback must label Publisher ingest as unverified');
assert.doesNotMatch(fallbackCampaignContent, /\bpublished\b|\bsent\b|\blaunched\b/i, 'campaign_operations fallback must not claim external execution');
const fallbackCampaignOpsJa = await campaignOperations.provider.runJob({
  kind: 'campaign_operations',
  definition: campaignOperations,
  body: {
    prompt: 'CMO 設計をもとにキャンペーン運用計画を作成してください。',
    output_language: 'ja',
    campaign: {
      title: '開発者向け登録キャンペーン',
      objective: '有望な開発者登録を増やす',
      audience: '開発者と技術系ファウンダー',
      targetUrl: 'https://aiagent-marketplace.net',
      channels: ['publisher', 'ads', 'analytics'],
      kpis: ['qualified signups', 'trial starts']
    }
  },
  source: {},
  manifest: campaignOperations.manifest
});
const fallbackCampaignContentJa = fallbackCampaignOpsJa.files?.[0]?.content || '';
assert.match(fallbackCampaignContentJa, /## キャンペーン状態/i, 'campaign_operations Japanese fallback should keep localized section headings');
assert.match(fallbackCampaignContentJa, /## コネクタ準備状況/i, 'campaign_operations Japanese fallback should localize connector readiness');
assert.doesNotMatch(fallbackCampaignContentJa, /## Campaign state|## Publisher queue|## Approval backlog/i, 'campaign_operations Japanese fallback must not fall back to English section headings');

const result = await research.provider.runJob({
  kind: 'research',
  definition: research,
  body: {
    prompt: 'QA sample. Answer in English.',
    output_language: 'en'
  },
  source: {},
  manifest: research.manifest
});
assertMissingConcreteDelivery(result, 'research generic delivery');
assert.equal(result.runtime?.provider, 'agent_file');

const deliveryBody = {
  prompt: [
    'Task: cmo_leader',
    'Goal: increase signups for https://aiagent-marketplace.net',
    'Product/service: https://aiagent-marketplace.net',
    'Analytics data: GA4 + Search Console connector context attached.',
    'GA4 property: properties/531290961',
    'Search Console site: sc-domain:aiagent-marketplace.net',
    'Date range: 2026-04-15 to 2026-05-12',
    'Sessions: 554',
    'Conversions: 0',
    'Conversion rate: 0%',
    'Target audience: Developers/technical users',
    'Constraints: No paid ads / organic only',
    'Priority channel: Organic search / SEO'
  ].join('\n'),
  output_language: 'en'
};

for (const kind of [
  'data_analysis',
  'media_planner',
  'seo_specialist',
  'landing',
  'cmo_leader'
]) {
  const definition = sampleAgentDefinitionForKind(kind);
  const delivery = await definition.provider.runJob({
    kind,
    definition,
    body: deliveryBody,
    source: {},
    manifest: definition.manifest
  });
  assertMissingConcreteDelivery(delivery, `${kind} delivery`);
}

const travelEsimBody = {
  prompt: [
    'Task: cmo_leader',
    'Goal: Original request:',
    'acquire leads for https://autowifi-travel.com',
    'User clarification:',
    '- Product/service: - Product/service: https://autowifi-travel.com',
    '- Analytics data: - Analytics data: GA4 + Search Console connector context attached.',
    '- Main goal: - Main goal: 問い合わせ・リード獲得を増やす',
    '- Target audience: - Target audience: 一般消費者',
    '- Constraints: - Constraints: Depth and quality first',
    '- Priority channel: - Priority channel: Organic search / SEO',
    'Attached connector context:',
    'GA4 property: properties/528967599',
    'Search Console site: https://autowifi-travel.com/',
    'Date range: 2026-04-18 to 2026-05-15',
    'Sessions: 74',
    'Conversions: 0',
    'Conversion rate: 0%',
    'Search Console query: add esim to iphone | https://autowifi-travel.com/en/guide/esim-iphone-setup | Landing page: https://autowifi-travel.com/en/guide/esim-iphone-setup',
    'Search Console query: airalo vs holafly | https://autowifi-travel.com/en/guide/airalo-vs-holafly | Landing page: https://autowifi-travel.com/en/guide/airalo-vs-holafly'
  ].join('\n'),
  output_language: 'en'
};

const wrongProductContextPattern = /AI agent workflows|AI-agent request|agent requests|turns agent requests/i;
const malformedAudiencePattern = /対象ユーザー:.*制約|Target audience:.*Constraints/i;

for (const kind of [
  'data_analysis',
  'media_planner',
  'seo_specialist',
  'landing',
  'cmo_leader'
]) {
  const definition = sampleAgentDefinitionForKind(kind);
  const delivery = await definition.provider.runJob({
    kind,
    definition,
    body: travelEsimBody,
    source: {},
    manifest: definition.manifest
  });
  const content = delivery.files?.[0]?.content || '';
  assertMissingConcreteDelivery(delivery, `${kind} travel/eSIM delivery`);
  assert.ok(!wrongProductContextPattern.test(content), `${kind} travel/eSIM delivery must not use AI-agent-specific copy`);
  assert.ok(!malformedAudiencePattern.test(content), `${kind} travel/eSIM delivery must not leak adjacent intake labels into the audience`);
  assert.ok(!/signup or trial start/i.test(content), `${kind} travel/eSIM delivery should preserve lead/inquiry conversion intent`);
}

const travelEsimPurchaseBody = {
  ...travelEsimBody,
  prompt: travelEsimBody.prompt
    .replace('acquire leads for https://autowifi-travel.com', 'increase purchases for https://autowifi-travel.com')
    .replace('問い合わせ・リード獲得を増やす', '売上・購入を増やす')
};

for (const kind of [
  'data_analysis',
  'media_planner',
  'seo_specialist',
  'landing',
  'cmo_leader'
]) {
  const definition = sampleAgentDefinitionForKind(kind);
  const delivery = await definition.provider.runJob({
    kind,
    definition,
    body: travelEsimPurchaseBody,
    source: {},
    manifest: definition.manifest
  });
  const content = delivery.files?.[0]?.content || '';
  assertMissingConcreteDelivery(delivery, `${kind} travel/eSIM purchase delivery`);
  assert.ok(!wrongProductContextPattern.test(content), `${kind} travel/eSIM purchase delivery must not use AI-agent-specific copy`);
  assert.ok(!malformedAudiencePattern.test(content), `${kind} travel/eSIM purchase delivery must not leak adjacent intake labels into the audience`);
  assert.ok(!/lead or inquiry|signup or trial start|inquiry_submit|signup_or_trial_start/i.test(content), `${kind} travel/eSIM purchase delivery should preserve purchase conversion intent`);
}

const cmoLeaderFinal = sampleAgentDefinitionForKind('cmo_leader');
const cmoLeaderFinalSynthesis = await cmoLeaderFinal.provider.runJob({
  kind: 'cmo_leader',
  definition: cmoLeaderFinal,
  body: {
    prompt: [
      'Task: cmo_leader',
      'Goal: increase signups for https://aiagent-marketplace.net',
      'Product/service: https://aiagent-marketplace.net',
      'Target audience: Developers/technical users',
      'Main goal: Increase signups/trials',
      'Priority channel: Organic search / SEO'
    ].join('\n'),
    output_language: 'en',
    input: {
      _broker: {
        workflow: {
          sequencePhase: 'final_summary',
          leaderHandoff: {
            priorRuns: [
              {
                taskType: 'data_analysis',
                sequencePhase: 'data',
                status: 'completed',
                summary: 'GA4 sessions 554 and conversions 0.'
              },
              {
                taskType: 'research',
                sequencePhase: 'research',
                status: 'completed',
                summary: 'Research found signup visitors need proof before choosing an AI agent marketplace.',
                webSources: [{ title: 'Target service', url: 'https://aiagent-marketplace.net/', snippet: 'AI agent marketplace target URL.' }]
              },
              {
                taskType: 'media_planner',
                sequencePhase: 'planning',
                status: 'completed',
                summary: 'Prioritize SEO first, then referral and social copy.'
              },
              {
                taskType: 'seo_specialist',
                sequencePhase: 'preparation',
                status: 'completed',
                summary: 'SEO page packet ready for Publisher.',
                files: [{
                  name: 'seo-agent-delivery.md',
                  content: [
                    '# SEO page packet',
                    '## SEO page recommendation',
                    '- H1: AI agent marketplace for developers',
                    '- Meta title: AI agent marketplace for developer workflows',
                    '- Meta description: Compare AI agents, review proof, and start signup.',
                    '## Replacement copy',
                    'Headline: AI agent marketplace for developers.',
                    'Primary CTA: Start signup'
                  ].join('\n')
                }]
              },
              {
                taskType: 'list_creator',
                sequencePhase: 'preparation',
                status: 'blocked',
                summary: 'No public lead source was supplied.'
              }
            ]
          }
        }
      }
    }
  },
  source: { OPENAI_API_KEY: 'sk-test-openai-delivery' },
  manifest: cmoLeaderFinal.manifest
});
assertUserFacingDelivery(cmoLeaderFinalSynthesis, 'cmo_leader final synthesis', [
  /evaluated all specialist outputs|Adoption matrix/i,
  /Publisher draft status/i,
  /External app ingest status: not verified/i
]);
const cmoLeaderFinalContent = cmoLeaderFinalSynthesis.files?.[0]?.content || '';
assert.match(cmoLeaderFinalContent, /Adoption matrix[\s\S]*seo_specialist/i, 'CMO final synthesis should require LLM judgment over the preparation artifact content');
assert.match(cmoLeaderFinalContent, /Adoption matrix[\s\S]*data_analysis/i, 'CMO final synthesis should carry data_analysis as evidence for leader judgment');
assert.match(cmoLeaderFinalContent, /Blocked or not selected[\s\S]*list_creator/i, 'CMO final synthesis should separate blocked lead/list work from adopted work');
assert.match(cmoLeaderFinalContent, /Publisher handoff draft prepared in chat/i, 'CMO final synthesis should label Publisher material as a chat draft');
assert.doesNotMatch(cmoLeaderFinalContent, /Landing page change packet prepared|Publish status:\s*prepared\s*\/\s*not/i, 'CMO final synthesis must not overclaim Publisher packet preparation');
assert.doesNotMatch(JSON.stringify(cmoLeaderFinalSynthesis), /\[object Object\]/, 'CMO final synthesis must flatten object-shaped summary and next action fields');
assert.equal(cmoLeaderFinalSynthesis.report?.leader_evaluation_required, true, 'CMO final report should mark LLM leader evaluation as required');
assert.equal(cmoLeaderFinalSynthesis.report?.publisher_ingest_verified, false, 'CMO final report should not claim Publisher ingest without proof');
assert.equal(cmoLeaderFinalSynthesis.files?.[0]?.content_type, 'cmo_leader_delivery', 'CMO final file should be typed as leader delivery, not an already-created publish packet');
const cmoLeaderPublisherArtifact = cmoLeaderFinalSynthesis.report?.artifacts?.[0];
assert.equal(cmoLeaderPublisherArtifact?.surface, 'publisher', 'CMO final synthesis should emit a Publisher artifact');
assert.equal(cmoLeaderPublisherArtifact?.action_type, 'site_publish_packet', 'CMO final Publisher artifact should use site_publish_packet');
assert.equal(cmoLeaderPublisherArtifact?.metadata?.ingest_status, 'not_ingested', 'CMO final Publisher artifact must say it is not ingested');
assert.equal(cmoLeaderPublisherArtifact?.metadata?.publish_status, 'not_published', 'CMO final Publisher artifact must say it is not published');

const cmoLeaderCheckpointSynthesis = await cmoLeaderFinal.provider.runJob({
  kind: 'cmo_leader',
  definition: cmoLeaderFinal,
  body: {
    prompt: 'CMO checkpoint for https://aiagent-marketplace.net after research. Answer in English.',
    output_language: 'en',
    input: {
      _broker: {
        workflow: {
          sequencePhase: 'checkpoint',
          leaderHandoff: {
            priorRuns: [
              { taskType: 'data_analysis', sequencePhase: 'data', status: 'completed', summary: 'Analytics context loaded.' },
              { taskType: 'research', sequencePhase: 'research', status: 'completed', summary: 'Research found proof and comparison intent.', webSources: [{ title: 'Target service', url: 'https://aiagent-marketplace.net/' }] }
            ]
          }
        }
      }
    }
  },
  source: { OPENAI_API_KEY: 'sk-test-openai-delivery' },
  manifest: cmoLeaderFinal.manifest
});
assertUserFacingDelivery(cmoLeaderCheckpointSynthesis, 'cmo_leader checkpoint synthesis', [
  /Checkpoint reviewed/i,
  /Next owner/i
]);
const cmoLeaderCheckpointContent = cmoLeaderCheckpointSynthesis.files?.[0]?.content || '';
assert.doesNotMatch(cmoLeaderCheckpointContent, /Publisher\/SaaS handoff|site_publish_packet/i, 'CMO checkpoint before preparation must not pretend Publisher handoff is ready');
assert.match(cmoLeaderCheckpointContent, /media_planner|planning/i, 'CMO checkpoint after research should choose planning as the next owner');
assert.match(cmoLeaderCheckpointContent, /specialist|prior|synthesis|evidence|統合|専門成果物/i, 'CMO checkpoint should explicitly mention specialist synthesis so adaptive release gates can verify handoff use');

const teardown = sampleAgentDefinitionForKind('teardown');
const sourceRequiredTeardown = await teardown.provider.runJob({
  kind: 'teardown',
  definition: teardown,
  body: {
    prompt: 'Teardown https://autowifi-travel.com/en/guide/airalo-vs-holafly using the attached source context. Answer in English.',
    output_language: 'en',
    input: {
      _broker: {
        workflow: {
          forceWebSearch: true,
          sequencePhase: 'research'
        }
      }
    }
  },
  source: {},
  manifest: teardown.manifest
});
assertMissingConcreteDelivery(sourceRequiredTeardown, 'source-required non-research teardown');

const writer = sampleAgentDefinitionForKind('writer');
const sourceBackedWriter = await writer.provider.runJob({
  kind: 'writer',
  definition: writer,
  body: {
    prompt: [
      'Write a source-backed X post and blog draft for https://aiagent-marketplace.net.',
      'Target audience: developers and technical users',
      'Main goal: signup or trial start',
      'X account: https://x.com/cait',
      'Blog: https://aiagent-marketplace.net/news/demo-video-provider-flow.html'
    ].join('\n'),
    output_language: 'en',
    input: {
      files: [{
        name: 'founder-note.md',
        content: 'Founder note: CAIt preserves source evidence, specialist handoffs, and approval boundaries before publishing.'
      }]
    }
  },
  source: { OPENAI_API_KEY: 'sk-test-openai-delivery' },
  manifest: writer.manifest
});
assert.equal(sourceBackedWriter.status, 'completed');
const writerArtifact = sourceBackedWriter.report.artifacts.find((item) => item.id === 'writer-publisher-handoff');
assert.ok(writerArtifact, 'writer should emit a Publisher handoff artifact');
assert.equal(writerArtifact.destination, 'X');
assert.ok(writerArtifact.body.includes('## Publisher handoff'), 'writer Publisher artifact should include a handoff section');
assert.ok(writerArtifact.body.includes('## Draft variants'), 'writer Publisher artifact should include per-medium draft variants');
assert.equal(writerArtifact.publish_variants.length, 3, 'writer should emit three variants for the selected X medium');
assert.ok(writerArtifact.body.includes('## E-E-A-T source ledger'), 'writer Publisher artifact should include an E-E-A-T source ledger');
assert.ok(writerArtifact.source_evidence.some((source) => source.source_type === 'x_post_or_account'), 'writer source evidence should preserve X source/account material');
assert.ok(writerArtifact.source_evidence.some((source) => source.source_type === 'uploaded_file'), 'writer source evidence should preserve uploaded original notes');
const ownedSiteWriterArtifact = sourceBackedWriter.report.artifacts.find((item) => item.channel_key === 'owned_site');
assert.ok(ownedSiteWriterArtifact, 'writer should emit a separate Publisher artifact when a blog/article medium is requested too');
assert.equal(ownedSiteWriterArtifact.publish_variants.length, 3, 'writer should emit three variants for the owned site/blog medium');
const writerDeliveryItems = deliveryItemsFromJob({
  id: 'qa-writer-publisher',
  status: 'completed',
  taskType: 'writer',
  workflowTask: 'writer',
  workflowAgentName: 'WRITING AGENT',
  input: { _broker: { requester: { login: 'qa-writer' } } },
  output: sourceBackedWriter
});
const publisherItem = writerDeliveryItems.find((item) => item.surface === 'publisher' && item.itemType === 'x_post');
assert.ok(publisherItem, 'writer Publisher handoff artifact should become a publisher delivery item');
assert.ok(Array.isArray(publisherItem.metadata.source_evidence), 'publisher delivery item should preserve writer source evidence');
assert.equal(publisherItem.metadata.publish_variants.length, 3, 'publisher delivery item should preserve three publish variants');
assert.ok(publisherItem.metadata.eeat_notes?.trust, 'publisher delivery item should preserve E-E-A-T notes');
const seoPublisherItem = sanitizeDeliveryItemForSurface({
  surface: 'publisher',
  itemType: 'publish_asset',
  title: 'SEO SPECIALIST',
  workflowTask: 'seo_specialist',
  body: [
    '# SEO SPECIALIST',
    'Canonical user brief: Product/service: https://example.com Main goal: signup trial start. Target audience: developers and technical buyers.',
    '',
    'Answer first: Build an SEO article around the proof-backed product workflow and keep the page grounded in the cited source URL.',
    'Evidence used: https://example.com/pricing and customer proof notes.',
    'Next action: Publish the reviewed article after confirmation.'
  ].join('\n')
});
assert.notEqual(seoPublisherItem.title, 'SEO SPECIALIST', 'SEO specialist delivery items should not keep the generic specialist heading as the publisher title');
assert.equal(seoPublisherItem.itemType, 'seo_article', 'SEO specialist delivery items should remain typed as SEO articles');
assert.match(seoPublisherItem.title, /example\.com/i, 'SEO specialist delivery items should derive a publisher-facing title from the target URL');

const sourceBackedResearch = await research.provider.runJob({
  kind: 'research',
  definition: research,
  body: {
    prompt: 'Research https://aiagent-marketplace.net for customer acquisition. Answer in English.',
    output_language: 'en',
    input: {
      _broker: {
        workflow: {
          forceWebSearch: true,
          sequencePhase: 'research'
        }
      }
    }
  },
  source: { OPENAI_API_KEY: 'sk-test-openai-delivery' },
  manifest: research.manifest
});
assert.equal(sourceBackedResearch.status, 'completed');
assert.ok(Array.isArray(sourceBackedResearch.report?.web_sources), 'search-required research must attach report.web_sources when sources are supplied');
assert.ok(sourceBackedResearch.report.web_sources.some((item) => item.url === 'https://aiagent-marketplace.net'), 'research should carry supplied source URLs into web_sources');
assert.ok(sourceBackedResearch.report.web_sources.some((item) => /source_collection/i.test(item.action || '')), 'research web_sources must include source collection proof');
assert.ok(sourceBackedResearch.files?.[0]?.content?.includes('Evidence status'), 'source-backed research should expose evidence status in the artifact');

const sourceContractResearch = await research.provider.runJob({
  kind: 'research',
  definition: research,
  body: {
    prompt: 'Research the attached acquisition source context. Answer in English.',
    output_language: 'en',
    source_collection_contract: {
      required: true,
      required_output_field: 'report.web_sources'
    },
    input: {
      _broker: {
        workflow: {
          sequencePhase: 'research'
        },
        appContexts: [
          {
            source_app: 'analytics-console',
            title: 'GA4 + Search Console',
            summary: 'Attached Search Console context for example.com.',
            raw_context: {
              googleSearchConsoleSite: 'sc-domain:example.com'
            }
          }
        ]
      }
    }
  },
  source: { OPENAI_API_KEY: 'sk-test-openai-delivery' },
  manifest: research.manifest
});
assert.equal(sourceContractResearch.status, 'completed', 'research should treat source_collection_contract as search-required and use attached connector context');
assert.ok(sourceContractResearch.report.web_sources.some((item) => item.url === 'https://example.com/'), 'research should normalize Search Console sc-domain context into web_sources');
const sourceContractQueryResearch = await research.provider.runJob({
  kind: 'research',
  definition: research,
  body: {
    prompt: 'Research the attached Search Console query evidence. Answer in English.',
    output_language: 'en',
    source_collection_contract: {
      required: true,
      required_output_field: 'report.web_sources'
    },
    input: {
      _broker: {
        workflow: {
          sequencePhase: 'research'
        },
        appContexts: [
          {
            source_app: 'analytics-console',
            title: 'GA4 + Search Console',
            summary: 'Attached Search Console query context for example.com.',
            artifacts: [
              {
                rows: [
                  { query: 'ai agent marketplace', note: 'Search Console query row without a URL.' }
                ]
              }
            ]
          }
        ]
      }
    }
  },
  source: { OPENAI_API_KEY: 'sk-test-openai-delivery' },
  manifest: research.manifest
});
assert.equal(sourceContractQueryResearch.status, 'completed', 'research should keep Search Console query-only context usable when source collection is required');
assert.ok(
  sourceContractQueryResearch.report.web_sources.some((item) => item.query === 'ai agent marketplace' && item.action === 'google_search_console'),
  'research should preserve Search Console provenance for query-only analytics-console context rows'
);

const braveSearchBefore = braveSearchCalls;
const braveBackedResearch = await research.provider.runJob({
  kind: 'research',
  definition: research,
  body: {
    prompt: 'Research AI agent marketplace demand for founders. Answer in English.',
    output_language: 'en',
    input: {
      _broker: {
        workflow: {
          forceWebSearch: true,
          searchQueries: ['AI agent marketplace founder demand competitors'],
          sequencePhase: 'research'
        }
      }
    }
  },
  source: {
    OPENAI_API_KEY: 'sk-test-openai-delivery',
    BRAVE_API_KEY: 'brave-test-token'
  },
  manifest: research.manifest
});
assert.equal(braveBackedResearch.status, 'completed', 'research should collect Brave sources when search is required and Brave is configured');
assert.ok(braveSearchCalls > braveSearchBefore, 'research should call Brave Search before OpenAI synthesis');
assert.ok(braveBackedResearch.report.web_sources.some((item) => item.provider === 'brave_search'), 'research should expose Brave search results in report.web_sources');
assert.ok(braveBackedResearch.report.web_sources.some((item) => item.action === 'brave_web_search'), 'research should label Brave source collection action');

const missingSourceResearch = await research.provider.runJob({
  kind: 'research',
  definition: research,
  body: {
    prompt: 'Research the market. Answer in English.',
    output_language: 'en',
    input: {
      _broker: {
        workflow: {
          forceWebSearch: true,
          sequencePhase: 'research'
        }
      }
    }
  },
  source: {},
  manifest: research.manifest
});
assert.equal(missingSourceResearch.status, 'failed', 'search-required research must fail instead of returning a generic completed delivery without sources');
assert.match(missingSourceResearch.failure_reason, /missing_required_search_sources/);

const catalogIndex = leaderReadableAgentCatalogIndex({
  agents: [
    {
      id: 'external_qa_agent',
      name: 'External QA Agent',
      description: 'External manifest agent for QA catalog.',
      online: true,
      verificationStatus: 'verified',
      manifestSource: 'manifest-json',
      taskTypes: ['qa_external'],
      metadata: {
        manifest: {
          kind: 'external_qa',
          name: 'External QA Agent',
          description: 'External manifest agent for QA catalog.',
          agent_role: 'worker',
          task_types: ['qa_external'],
          capabilities: ['external_check'],
          jobEndpoint: 'https://example.test/jobs',
          healthcheckUrl: 'https://example.test/health',
          metadata: { tags: ['external', 'qa'] }
        }
      }
    },
    {
      id: 'deleted_qa_agent',
      name: 'Deleted QA Agent',
      online: true,
      verificationStatus: 'verified',
      manifestSource: 'manifest-json',
      taskTypes: ['deleted_qa'],
      metadata: {
        hidden_from_catalog: true,
        deleted_at: '2026-05-14T00:00:00.000Z',
        manifest: {
          kind: 'deleted_qa',
          name: 'Deleted QA Agent',
          task_types: ['deleted_qa'],
          jobEndpoint: 'https://example.test/deleted/jobs',
          healthcheckUrl: 'https://example.test/deleted/health'
        }
      }
    }
  ],
  includeInternal: true
});
assert.ok(catalogIndex.some((item) => item.kind === 'research' && ['internal_agent_file', 'internal_sample'].includes(item.source)), 'agent catalog should include internal agent-file manifests');
assert.ok(catalogIndex.some((item) => item.kind === 'seo_specialist' && item.role === 'worker' && item.workflow_layer === 'preparation' && item.source === 'internal_agent_file'), 'agent catalog should include seo_specialist as a preparation specialist from its internal agent-file manifest');
assert.equal(catalogIndex.some((item) => item.kind === 'seo_leader_agent'), false, 'agent catalog must not expose SEO as a leader agent');
assert.ok(catalogIndex.some((item) => item.kind === 'external_qa' && item.source === 'external_manifest'), 'agent catalog should include external registered manifests');
assert.equal(catalogIndex.some((item) => item.kind === 'deleted_qa'), false, 'agent catalog should automatically drop deleted or hidden agents');
assert.ok(catalogIndex.every((item) => item.provider === undefined && item.manifest === undefined), 'agent catalog must stay a readable summary, not an execution surface');

console.log('builtin-agents-qa passed');
