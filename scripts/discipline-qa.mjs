import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

function read(relativePath) {
  return readFileSync(join(root, relativePath), 'utf8');
}

function assertNotIncludes(source, needles, label) {
  for (const needle of needles) {
    assert.equal(
      source.includes(needle),
      false,
      `${label} must not include ${needle}`
    );
  }
}

const workerSource = read('worker.js');
const orchestrationSource = read('lib/orchestration.js');
const sharedSource = read('lib/shared.js');
const chatSource = read('public/chat.js');
const connectorGateSource = read('public/connector-gate.js');
const chatSessionStateSource = read('public/chat-session-state.js');
const orderRuntimeSource = read('public/order-runtime.js');
const deliveryRendererSource = read('public/delivery-renderer.js');
const appHandoffGateSource = read('public/app-handoff-gate.js');
const agentProgressViewSource = read('public/agent-progress-view.js');
const clientSource = read('public/client.js');
const campaignOperationsSource = read('lib/builtin-agents/agents/campaign-operations.js');
const campaignRoutesSource = read('lib/routes/campaigns.js');
const adsPlannerSource = read('lib/builtin-agents/agents/ads-planner.js');
const disciplineDoc = read('docs/AGENT_ORCHESTRATION_DISCIPLINE.md');
const agentOutputCases = JSON.parse(read('scripts/fixtures/agent-output-cases.json'));

function assertUnique(items = [], label = 'items') {
  const seen = new Set();
  for (const item of items) {
    assert.ok(item, `${label} must not contain empty values`);
    assert.equal(seen.has(item), false, `${label} must not contain duplicates: ${item}`);
    seen.add(item);
  }
}

function assertNoAgentContractKeys(value, label = 'fixture') {
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    assert.equal(
      [
        'agentPurpose',
        'agentActionBoundaries',
        'deliveryContract',
        'action_boundaries',
        'delivery_contract',
        'requiredDeliverySections',
        'forbiddenClaims',
        'authorityBoundary'
      ].includes(key),
      false,
      `${label} must not define agent contracts; keep purpose/action/delivery policy in the agent JS file`
    );
    assertNoAgentContractKeys(child, `${label}.${key}`);
  }
}

// Regression target:
// AGENT_ORCHESTRATION_DISCIPLINE.md is a shared, agent-agnostic discipline file.
// Do not add named single-agent boundary sections or agent module paths here.
// Agent-specific rules belong in that agent's JS module.
assert.ok(
  disciplineDoc.includes('This discipline applies to all languages, locales, UI copy, and operator workflows.'),
  'development discipline must be documented as language-agnostic'
);
assert.ok(
  disciplineDoc.includes('Do not put leader-specific or agent-specific work definitions in `worker`, `orchestration`, or `client` code.'),
  'development discipline must document file responsibility boundaries'
);
assert.ok(
  disciplineDoc.includes('Sample agents must be treated as HTTP provider endpoints like external agents.'),
  'development discipline must document that internal/sample agents are not special-cased'
);
assert.ok(
  disciplineDoc.includes('Only values returned by the agent/provider contract may be treated as delivery artifacts.'),
  'development discipline must document that delivery artifacts come only from agent/provider returns'
);
assert.ok(
  disciplineDoc.includes('Agent/provider answer builders that define user-facing delivery content, task-specific output structure, work definitions, or approval wording belong in the relevant agent/provider definition.'),
  'development discipline must document that true answer builders are agent/provider-owned'
);
assert.ok(
  disciplineDoc.includes('Delivery follow-up order drafts must be prepared by server or agent/provider contracts.'),
  'development discipline must document that delivery follow-up drafts are not client-owned'
);
assert.ok(
  disciplineDoc.includes('`authority_request` / approval waits must be requested explicitly by the agent/provider result.'),
  'development discipline must document that approval requests are agent/provider-owned'
);
assert.ok(
  disciplineDoc.includes('Template guidance may only say to deliver in the user requested language in a clear, user-readable format.'),
  'development discipline must keep template guidance minimal and non-prescriptive'
);
assert.ok(
  disciplineDoc.includes('Built-in, sample, and external agents share the same completion policy'),
  'development discipline must require the same no-fallback retry/fail policy for every agent source'
);
assert.ok(
  disciplineDoc.includes('Workflow child assignment must resolve against the current agent list and manifest/task contract'),
  'development discipline must forbid workflow child assignment from trusting historical concrete agent ids'
);
assert.ok(
  disciplineDoc.includes('Agent-side failures and missing-deliverable failures are free to the requester.'),
  'development discipline must document that failed agent deliveries are not billed'
);
assert.ok(
  disciplineDoc.includes('During beta, account registration, provider identity, agent registration, and work execution may remain available, but live checkout, card setup, charges, and payout movement must stay paused.'),
  'development discipline must document beta billing pause behavior'
);
assert.ok(
  disciplineDoc.includes('Each account may use the beta free allowance up to $10 in welcome credits'),
  'development discipline must document the per-account beta free allowance'
);
assert.ok(
  disciplineDoc.includes('do not create unlimited free test-mode order execution for normal users'),
  'development discipline must prevent unlimited beta test-mode execution'
);
assert.ok(
  disciplineDoc.includes('Agent-specific boundaries must be documented in the relevant agent definition file'),
  'development discipline must keep agent-specific boundary details in agent files'
);
const sharedDisciplineSpecificAgentBoundaryPattern =
  /##\s+(?!Agent Definition Boundaries\b)[^\n]*(?:Leader|Agent)\s+Boundary\b|single-agent boundary|specific definitions belong in `?(?:lib[\\/])builtin-agents[\\/]agents[\\/][^`\s]+\.js`?|(?:lib[\\/])builtin-agents[\\/]agents[\\/][^`\s]+\.js/i;
assert.equal(
  sharedDisciplineSpecificAgentBoundaryPattern.test(disciplineDoc),
  false,
  'shared discipline doc must stay agent-agnostic; single-agent boundaries belong in that agent JS module'
);

assertUnique((agentOutputCases.cases || []).map((item) => item.id), 'agent output fixture ids');
assertUnique((agentOutputCases.groups?.marketing || []), 'marketing fixture group ids');
for (const [groupName, ids] of Object.entries(agentOutputCases.groups || {})) {
  for (const caseId of ids || []) {
    assert.ok(
      (agentOutputCases.cases || []).some((item) => item.id === caseId),
      `agent output fixture group ${groupName} references missing case ${caseId}`
    );
  }
}
for (const agentCase of agentOutputCases.cases || []) {
  assertNoAgentContractKeys(agentCase, `agent output fixture ${agentCase.id || agentCase.file || 'unknown'}`);
}

for (const caseId of agentOutputCases.groups.marketing || []) {
  const agentCase = agentOutputCases.cases.find((item) => item.id === caseId);
  assert.ok(agentCase, `marketing agent output fixture ${caseId} must exist`);
  const source = read(`lib/builtin-agents/agents/${agentCase.file}`);
  assert.ok(
    source.includes('agentPurpose:'),
    `${agentCase.file} must own its agent purpose in the agent definition`
  );
  assert.ok(
    source.includes('agentActionBoundaries:'),
    `${agentCase.file} must own its action boundaries in the agent definition`
  );
  assert.ok(
    source.includes('deliveryContract:'),
    `${agentCase.file} must own its delivery contract in the agent definition`
  );
  assert.ok(
    source.includes('action_boundaries: Array.isArray(definition.agentActionBoundaries) ? definition.agentActionBoundaries : []'),
    `${agentCase.file} must pass structured action boundaries through provider health/run packets`
  );
  assert.ok(
    source.includes('delivery_contract:'),
    `${agentCase.file} must pass the delivery contract through provider health/run packets`
  );
}

const agentSpecificBoundaryPattern = /\b(?:cmo|cmo_leader|cait_cmo|marketing_leader|free_web_growth|agent_team_launch)\b|CMO|マーケ責任者|マーケティング責任者/;
for (const [fileName, source] of [
  ['worker.js', workerSource],
  ['lib/orchestration.js', orchestrationSource],
  ['public/chat.js', chatSource],
  ['lib/shared.js', sharedSource]
]) {
  assert.equal(
    agentSpecificBoundaryPattern.test(source),
    false,
    `${fileName} must not contain leader/agent-specific business routing; put it in the relevant agent file`
  );
}

assertNotIncludes(workerSource, [
  "from './lib/local-agent-endpoints.js'",
  "from './lib/builtin-agents.js'",
  "sample-agent-catalog.js",
  "sample-agent-provider.js",
  'function runBuiltInAgent',
  'runBuiltInAgent(',
  'builtInAgentHealthPayload',
  'function invokeSameWorkerAgentEndpoint',
  'invokeLocalAgentJobEndpoint',
  'acceptBuiltInEndpointDispatchForProviderQueue',
  'enqueueBuiltInAgentProviderRun',
  'compactWorkflowInputForBuiltInDispatch',
  "kind: 'built_in_agent_run'",
  'app-context-data-analysis-shortcut',
  'app-context-research-shortcut',
  'function workflowSourceCollectionSourcesForDispatch',
  'sourceCollectionAttachedBy',
  'raw_context: workflowSourceRawContextForDispatch(context)',
  'const searchConsoleDomain = text.match',
  'function synthesizeAuthorityRequestFromDelivery',
  'function deliveryAuthorityScanText',
  'function inferredAuthorityChannelsFromText',
  'function agentManifestConnectorAuthorityRequest',
  'function mergeAuthorityRequests',
  'delivery_text_inference',
  'agent_manifest_connector_contract',
  'function campaignNextActionFromMetrics',
  "from './lib/builtin-agents/agents/campaign-operations.js'",
  'campaignOperationsNextActionFromMetrics(',
  "approvalOwner: 'ads_agent_and_campaign_operations'"
], 'worker.js');
assert.ok(
  campaignRoutesSource.includes('Send this metric summary to Campaign Operations; channel, Publisher, or Ads SaaS actions must be requested by the responsible owner.'),
  'campaign metrics API must hand off next-action decisions instead of owning them'
);
for (const [fileName, source] of [
  ['lib/builtin-agents/agents/campaign-operations.js', campaignOperationsSource],
  ['lib/builtin-agents/agents/ads-planner.js', adsPlannerSource]
]) {
  assertNotIncludes(source, [
    'and approval_requests',
    'approvalRequests: Array.isArray(generated.approval_requests)',
    'approval_requests: generated.approvalRequests'
  ], fileName);
}
assert.equal(
  adsPlannerSource.includes('approval packets'),
  false,
  'ads planner must describe approval boundaries, not create approval packets for the execution owner'
);
assert.ok(
  chatSource.includes("from './connector-gate.js"),
  'chat connector display must be delegated to the connector gate module'
);
assert.ok(
  connectorGateSource.includes('connectorGateAuthorityRequestFromJob'),
  'connector gate must own structured authority_request extraction for connector UI'
);
assert.ok(
  connectorGateSource.includes('explicitSaasHandoffSignals'),
  'connector gate SaaS handoff detection must use structured connector/capability/channel/action fields'
);
assertNotIncludes(connectorGateSource, [
  'request.reason, request.summary, request.message',
  'request.reason, request.message, request.summary',
  '/(approval|approve|connector|required|missing|connect|confirm|publish|send|post|承認|接続|未接続|確認|投稿|送信|必要)/i.test(reason)'
], 'public/connector-gate.js');
assert.ok(
  appHandoffGateSource.includes('explicitHandoffArtifactTypesFromFile'),
  'app handoff gate must own explicit artifact metadata extraction for app handoff routing'
);
assert.ok(
  appHandoffGateSource.includes('explicitHandoffArtifactTypesFromAuthorityRequest'),
  'app handoff gate must own structured authority_request artifact metadata extraction'
);
assert.ok(
  appHandoffGateSource.includes('appHandoffRankEntries'),
  'app handoff gate must own generic app handoff candidate ranking'
);
assert.ok(
  chatSource.includes('appHandoffGateExplicitArtifactTypesFromFile'),
  'chat app handoff routing must consume artifact metadata through app-handoff-gate'
);
assert.ok(
  chatSource.includes('appHandoffGateExplicitArtifactTypesFromAuthorityRequest'),
  'chat app handoff routing must consume authority_request artifact metadata through app-handoff-gate'
);
assert.ok(
  chatSource.includes('appHandoffGateRankEntries'),
  'chat app handoff routing must delegate candidate scoring through app-handoff-gate'
);
assertNotIncludes(chatSource, [
  'function addExplicitHandoffArtifactType',
  'function appHandoffRelevanceScore',
  'function appHandoffSpecificityScore',
  'const EXPLICIT_HANDOFF_TYPE_ALIASES',
  'const HANDOFF_ARTIFACT_CAPABILITY_ALIASES',
  'const HANDOFF_ARTIFACT_LABELS',
  'const HANDOFF_ARTIFACT_DESTINATION_HINTS'
], 'public/chat.js');
for (const [moduleName, symbol] of [
  ['public/chat-session-state.js', 'compactChatRuntimeSnapshot'],
  ['public/order-runtime.js', 'visibleJobApiPath'],
  ['public/delivery-renderer.js', 'renderDeliveryBody'],
  ['public/app-handoff-gate.js', 'renderAppHandoffTree'],
  ['public/agent-progress-view.js', 'renderAgentRunDetailHtml']
]) {
  assert.ok(
    chatSource.includes(`from './${moduleName.replace('public/', '')}`),
    `chat must delegate ${moduleName} responsibilities to the split module`
  );
  const source = {
    'public/chat-session-state.js': chatSessionStateSource,
    'public/order-runtime.js': orderRuntimeSource,
    'public/delivery-renderer.js': deliveryRendererSource,
    'public/app-handoff-gate.js': appHandoffGateSource,
    'public/agent-progress-view.js': agentProgressViewSource
  }[moduleName];
  assert.ok(source.includes(symbol), `${moduleName} must expose ${symbol}`);
}
assertNotIncludes(chatSource, [
  'function authorityRequestFromText',
  'function authorityScanTextFromJob',
  'delivery_text_approval'
], 'public/chat.js');

assert.equal(
  existsSync(join(root, 'public', 'client-basic-chat-answers.js')),
  false,
  'client basic answer builder module must not exist; true answer builders belong in agent/provider definitions'
);
assert.ok(
  clientSource.includes('function buildOpenChatPreLlmGuardAnswer'),
  'client pre-dispatch UI answers must remain visible in the client controller until renamed/scoped deliberately'
);
assert.ok(
  clientSource.includes('pattern_server_leader_intake_contract'),
  'client leader intake must render server/agent-owned intake contracts'
);
assert.ok(
  clientSource.includes('/api/deliveries/prepare-followup-order'),
  'client delivery follow-up order drafts must be prepared by the server route'
);
assert.ok(
  chatSource.includes('/api/deliveries/prepare-followup-order'),
  'chat running-order follow-up drafts must be prepared by the server route'
);
assertNotIncludes(chatSource, [
  'Follow-up/change request for running order ${job.id}:',
  'Use the previous order context, completed specialist outputs, active blockers, and current workflow state.'
], 'public/chat.js');
assertNotIncludes(clientSource, [
  'function buildOpenChatLeaderOrderBrief',
  'What should this leader help decide or accomplish?',
  'このリーダーに最終的に何を判断・達成してほしいですか？',
  'leader summary, specialist task split, assumptions, execution plan, concrete deliverables, risks, and acceptance criteria',
  'Turn the user intake into an executable Team Leader order',
  'pattern_leader_intake_followup',
  'Turn this into an execution-ready social publishing order.',
  'Use the social post pack from previous order',
  'Turn this into an execution-ready email order.',
  'Follow-up for previous order ${job.id}:',
  'Use the previous order context, fold in this new answer, and produce the next best delivery.',
  'Direct follow-up for previous order ${job.id}:',
  'Use input._broker.conversation.previousJob as the prior delivery context.'
], 'public/client.js');
const publicFiles = readdirSync(join(root, 'public'))
  .filter((name) => name.startsWith('client-') && name.endsWith('.js'))
  .sort();
for (const fileName of publicFiles) {
  const source = readFileSync(join(root, 'public', fileName), 'utf8');
  assert.equal(
    /\bfunction\s+buildOpenChat[A-Za-z0-9_]*Answer\b/.test(source),
    false,
    `${fileName} must not extract buildOpenChat*Answer builders from client.js; keep true answer builders agent/provider-owned and client answers pre-dispatch only`
  );
}

assertNotIncludes(orchestrationSource, [
  "from './lib/builtin-agents.js'",
  'runBuiltInAgent',
  'builtInAgentHealthPayload',
  'compactWorkflowInputForBuiltInDispatch',
  "kind: 'built_in_agent_run'"
], 'lib/orchestration.js');

assert.ok(
  workerSource.includes('resolveDispatchEndpointUrl(endpoint, env)'),
  'worker dispatch must use provider endpoint URLs instead of local built-in execution'
);
assert.ok(
  workerSource.includes('leaderTaskLayer(primary, task)'),
  'worker must ask orchestration/leader contracts for layers instead of hardcoding role logic'
);
assert.ok(
  orchestrationSource.includes('DOWNSTREAM_HANDOFF_SUMMARY_CONTRACT_VERSION'),
  'orchestration should own generic handoff contracts, not agent-specific business logic'
);

const forbiddenCentralFiles = [
  'lib/builtin-agents.js',
  'lib/sample-agent-provider.js',
  'lib/sample-agent-catalog.js',
  'lib/agent-provider-runtime.js'
];
for (const filePath of forbiddenCentralFiles) {
  assert.equal(
    existsSync(join(root, filePath)),
    false,
    `${filePath} must not exist; internal/sample agent behavior belongs in each agent file`
  );
}

const agentsDir = join(root, 'lib', 'builtin-agents', 'agents');
const agentFiles = readdirSync(agentsDir)
  .filter((name) => name.endsWith('.js') && name !== 'index.js')
  .sort();

const stripeProhibitedGamblingAgentPattern =
  /\b(?:gambl(?:e|ing)|casino|sports betting|betting tips?|wager(?:ing)?|bookmaker|odds[-\s]?making|sportsbook|lotter(?:y|ies)|sweepstakes|poker|roulette|blackjack|staking plan|bankroll)\b|(?:ギャンブル|賭博|ベッティング|カジノ|ブックメーカー|競馬予想|スポーツ予想|宝くじ|オンラインカジノ)/i;

assert.ok(agentFiles.length > 0, 'agent files must exist');
for (const fileName of agentFiles) {
  const source = readFileSync(join(agentsDir, fileName), 'utf8');
  assert.equal(
    stripeProhibitedGamblingAgentPattern.test(source),
    false,
    `${fileName} must not define gambling, casino, betting, wagering, lottery, or odds-making agent behavior`
  );
  assert.ok(source.includes('const AGENT_PROVIDER = Object.freeze({'), `${fileName} must own its provider behavior`);
  assert.ok(source.includes('AGENT_DEFINITION.manifest = Object.freeze({'), `${fileName} must own its manifest`);
  assert.ok(source.includes('health({'), `${fileName} must expose health behavior`);
  assert.ok(source.includes('async runJob({'), `${fileName} must expose jobs behavior`);
  assert.ok(source.includes('provider: AGENT_PROVIDER'), `${fileName} must export the provider`);
  assert.ok(source.includes('missing_required_deliverable'), `${fileName} must fail when it cannot return an agent-owned delivery`);
  assert.ok(source.includes('Deliver in the user requested language in a clear, user-readable format.'), `${fileName} must keep delivery formatting guidance minimal`);
  assert.equal(source.includes('The agent could not produce a safe user-facing delivery'), false, `${fileName} must not convert failed generation into a shared template delivery`);
  assert.equal(source.includes('Supplied request and available context.'), false, `${fileName} must not use generic fallback request text as delivery input`);
  assertNotIncludes(source, [
    'agent-provider-runtime',
    'sample-agent-provider',
    'sample-agent-catalog',
    "from '../builtin-agents.js'",
    "from './builtin-agents.js'"
  ], fileName);
}

console.log('discipline qa passed');
