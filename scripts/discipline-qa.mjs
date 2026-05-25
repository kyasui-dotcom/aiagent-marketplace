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
const deliveryItemsSource = read('lib/delivery-items.js');
const deliveryRoutesSource = read('lib/routes/deliveries.js');
const openChatIntentSource = read('lib/open-chat-intent.js');
const chatHtmlSource = read('public/chat.html');
const appHandoffGateSource = read('public/app-handoff-gate.js');
const appHandoffTransferSource = read('public/app-handoff-transfer.js');
const appContextGateSource = read('public/app-context-gate.js');
const measurementEvidenceGateSource = read('public/measurement-evidence-gate.js');
const agentProgressViewSource = read('public/agent-progress-view.js');
const clientSource = read('public/client.js');
const workActionRegistrySource = read('public/work-action-registry.js');
const workIntentResolverSource = read('public/work-intent-resolver.js');
const campaignOperationsSource = read('lib/builtin-agents/agents/campaign-operations.js');
const campaignRoutesSource = read('lib/routes/campaigns.js');
const adsPlannerSource = read('lib/builtin-agents/agents/ads-planner.js');
const operatorAccessSource = read('lib/operator-access.js');
const apiKeyRoutesSource = read('lib/routes/api-keys.js');
const mcpRoutesSource = read('lib/routes/mcp.js');
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
  disciplineDoc.includes('When a leader produces a final integrated delivery, the user-facing delivery bundle should prioritize that final leader artifact and explicit app-review packets.'),
  'development discipline must prevent final leader bundles from duplicating generic supporting specialist memos'
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
  disciplineDoc.includes('Chat may preserve an explicitly selected or locked leader/agent, or pass through a server-returned `task_type`/`conversationOwner` contract'),
  'development discipline must forbid chat from inventing leader routing from user or LLM prose'
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
  disciplineDoc.includes('public CLI/API-key access and MCP must stay disabled by default'),
  'development discipline must keep unstable external developer surfaces disabled by default'
);
assert.ok(
  operatorAccessSource.includes('CAIT_DEVELOPER_API_ENABLED') && operatorAccessSource.includes('CAIT_MCP_ENABLED'),
  'runtime policy must own explicit external developer surface flags'
);
assert.ok(
  apiKeyRoutesSource.includes('developerApiDisabled') && mcpRoutesSource.includes('mcpDisabledPayload'),
  'API key and MCP routes must have explicit disabled gates while external contracts stabilize'
);
assert.ok(
  disciplineDoc.includes('App handoff completion has a visible action flow'),
  'development discipline must define visible app handoff completion, not just normalized rows'
);
assert.ok(
  disciplineDoc.includes('A normalized row alone is not enough to claim app handoff completion.'),
  'development discipline must forbid claiming app handoff completion from delivery item normalization alone'
);
assert.ok(
  disciplineDoc.includes('the responsible agent/provider must return explicit `content_type`/`artifact_type` or `artifact_types`'),
  'development discipline must require agent/provider-owned explicit app artifact metadata'
);
assert.ok(
  disciplineDoc.includes('must not recover missing app intent from the delivery body'),
  'development discipline must forbid body-text recovery of missing app intent'
);
assert.ok(
  disciplineDoc.includes('App handoff transfer code may preserve delivery file content as content, but must not parse Markdown/body text to recover app-specific metadata'),
  'development discipline must forbid app handoff transfer code from parsing body text into app metadata'
);
assert.ok(
  disciplineDoc.includes('When a leader can determine at dispatch time that a selected specialist should produce an app-review artifact'),
  'development discipline must require leader dispatch packets to include known app-review metadata contracts upfront'
);
assert.ok(
  disciplineDoc.includes('The UI must distinguish "prepared for app review" from "ingested into the app" and from "externally executed".'),
  'development discipline must distinguish prepared, ingested, and executed app states'
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
  appContextGateSource.includes('appContextMatchesManifest'),
  'app context gate must own manifest-based app context matching'
);
assert.ok(
  chatSource.includes("from './app-context-gate.js"),
  'chat app context surface routing must consume manifest matching through app-context-gate'
);
assert.ok(
  chatSource.includes('contextContract: app.contextContract || app.context_contract || manifest.contextContract || manifest.context_contract || null')
    && chatSource.includes('contextContract: { ...(existing.contextContract || {}), ...(normalized.contextContract || {}) }'),
  'chat app manifest normalization must preserve app context contracts instead of silently downgrading to token matching'
);
assert.equal(
  chatSource.includes("new URL('/analytics-console.html'"),
  false,
  'chat must not hard-code a privileged Analytics Console fallback URL; use the app manifest launch URL'
);
assert.equal(
  chatSource.includes("appManifestById('analytics-console')"),
  false,
  'chat measurement-evidence routing must not fall back to a privileged app id'
);
assert.ok(
  chatSource.includes("from './measurement-evidence-gate.js")
    && measurementEvidenceGateSource.includes('export function measurementEvidenceContractRequired')
    && measurementEvidenceGateSource.includes('export function measurementEvidenceTextExplicitlyRequests'),
  'chat measurement-evidence app routing must use the dedicated explicit request/contract gate'
);
assertNotIncludes(measurementEvidenceGateSource, [
  'function orderNeedsMeasurementEvidence',
  'function intakeShouldOfferMeasurementEvidenceChoice',
  "inferWorkIntentTaskType(prompt)",
  "seo|cvr|conversion",
  "taskType\\n${text}",
  "growth|go[-\\s]?to[-\\s]?market"
], 'public/measurement-evidence-gate.js');
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
const authorityArtifactExtractionSource = appHandoffGateSource.slice(
  appHandoffGateSource.indexOf('export function explicitHandoffArtifactTypesFromAuthorityRequest'),
  appHandoffGateSource.indexOf('export function appHandoffArtifactLabel')
);
assertNotIncludes(authorityArtifactExtractionSource, [
  'missing_connectors',
  'missingConnectors',
  'missing_connector_capabilities',
  'missingConnectorCapabilities',
  'channel_candidates',
  'channelCandidates',
  "addExplicitHandoffArtifactType(types, 'x_post_approval'"
], 'public/app-handoff-gate.js authority_request artifact extraction');
assert.equal(
  chatSource.includes('function fileLooksLikeSocialPostPack'),
  false,
  'chat app handoff routing must not infer social app handoff from file names or MIME-like type tokens'
);
assert.equal(
  chatSource.includes("add('post_text', 'strategy', 'delivery_summary', 'social_copy_packet', 'social_post_pack', 'x_post_packet')"),
  false,
  'chat app handoff routing must not synthesize broad social artifact types from extracted body text'
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
assertNotIncludes(chatSource, [
  "taskType: 'growth'",
  "taskType: readiness.taskType || 'growth'",
  "if (intent === 'natural_business_growth' || intent === 'natural_marketing_launch') return 'growth';",
  'const taskType = bestCatalogLeaderTaskTypeForSpecialistTask(agents, specialistTaskType) || specialistTaskType;',
  'function bestCatalogLeaderTaskTypeForSpecialistTask',
  'function refreshWorkerAgentsForRouting',
  'function obviousStepIntakeSpecialistTaskType',
  'function prepareObviousStepIntakeIfNeeded',
  'function accumulatedWorkOrderReadiness',
  'function prepareAccumulatedOrderIfReady',
  'function matchingRecentUserLines',
  'function leaderTaskTypeFromIntentResult',
  'automaticLeaderTaskType',
  'Conversation-derived work request:',
  'hasAcquisitionGoal',
  'latestIsClarificationAnswer',
  'Do not ask another pre-order intake question just because the CTA is weak.',
  'acquisitionOrGrowth',
  'socialDraftOrApproval',
  'inferWorkIntentTaskType'
], 'public/chat.js accumulated/order-intent routing');
assertNotIncludes(chatSource, [
  'function deliveryInstructionForFormat',
  'delivery_instruction:',
  'Return Publisher-ready app packets',
  'Return a landing page packet plus social post packets',
  'publisher_packets',
  'lp_and_posts'
], 'public/chat.js delivery preference boundary');
assertNotIncludes(chatHtmlSource, [
  'publisher_packets',
  'lp_and_posts',
  'Publisher packets',
  'LP + posts'
], 'public/chat.html delivery preference options');
assertNotIncludes(openChatIntentSource, [
  'LEADER_INTAKE_LLM_OVERRIDE_AGENT_QUESTIONS'
], 'lib/open-chat-intent.js');
assertNotIncludes(workIntentResolverSource, [
  'export function inferWorkIntentTaskType',
  'export function inferWorkIntentRoute',
  'export function prepareWorkOrderSeed',
  'function explicitLeaderTaskTypeFromText',
  'const LEADER_TASK_TYPES',
  'const AGENT_TASK_LABELS',
  'routeOwnerForLeader',
  'routeOwnerForAgent'
], 'public/work-intent-resolver.js');
assert.equal(
  clientSource.includes('inferWorkIntentRoute'),
  false,
  'client must not import browser-side agent routing; order intent routing belongs to server/agent definitions'
);
assert.ok(
  openChatIntentSource.includes("if (preliminary?.intake?.questionSource === 'rules') return preliminary;"),
  'generic Open Chat LLM intake must not replace agent-owned leaderBehavior.intakeQuestions'
);
const clientPreorderIntentSource = clientSource.slice(clientSource.indexOf('function preorderIntentLlmAnswerFromResult'), clientSource.indexOf('function openChatPreparedOrderActions'));
assert.ok(
  clientPreorderIntentSource.includes('openChatServerLeaderIntakeGuardAnswer') && clientPreorderIntentSource.includes('prepareWorkOrderViaApi'),
  'legacy Open Chat LLM intake must preserve agent-owned leaderBehavior.intakeQuestions through prepare-order'
);
assert.ok(
  !clientPreorderIntentSource.includes('dynamicIntakeQuestions: dynamicQuestions'),
  'legacy Open Chat must not render generic LLM leader intake questions'
);
const deliveryFilePrioritySource = chatSource.slice(
  chatSource.indexOf('function deliveryFilePriority'),
  chatSource.indexOf('function cleanReadableBundleContent')
);
assertNotIncludes(deliveryFilePrioritySource, [
  'source_task_type',
  'sourceTaskType',
  'seo|landing',
  'x_post|x-post',
  'media_planner',
  'data_analysis',
  'list_creator',
  'cold_email'
], 'public/chat.js delivery file ordering');
const appHandoffStrategySource = chatSource.slice(
  chatSource.indexOf('function actionStrategyContextFromJob'),
  chatSource.indexOf('function appAgentContextOpenUrl')
);
assertNotIncludes(chatSource, [
  'function strategySnippetFromContent',
  'function strategyFieldFromText'
], 'public/chat.js app handoff strategy extraction');
assertNotIncludes(appHandoffStrategySource, [
  'deliveryText(job)',
  'file?.content',
  'Delivery summary:',
  'strategy|growth|channel|audience|conversion|goal|cta|seo',
  'Product\', \'Service',
  'Candidate channels'
], 'public/chat.js app handoff strategy extraction');
assertNotIncludes(appHandoffTransferSource, [
  'function appHandoffMarkdownFieldValue',
  'const content = String(file?.content || \'\');',
  'Meta title',
  'Primary CTA',
  'Target keyword',
  'Internal links'
], 'public/app-handoff-transfer.js metadata extraction');
assert.ok(
  appHandoffTransferSource.includes('export function appHandoffSocialPostDraftFromDeliveryFiles'),
  'app handoff transfer should own dedicated social handoff draft extraction'
);
assert.ok(
  appHandoffTransferSource.includes('explicitMetadataText(file, [')
    && appHandoffTransferSource.includes("'post_text'")
    && appHandoffTransferSource.indexOf('explicitMetadataText(file, [') < appHandoffTransferSource.indexOf('const text = extractSocialPostTextFromDeliveryContent'),
  'dedicated social handoff text must prefer explicit artifact metadata before legacy content extraction'
);
assert.equal(
  chatSource.includes("from './delivery-action-contract.js"),
  false,
  'chat must not import delivery action parsing helpers directly for app handoff extraction'
);
assert.ok(
  appHandoffTransferSource.includes('function explicitMetadataText')
    && appHandoffTransferSource.includes('const metadata = file?.metadata && typeof file.metadata === \'object\' ? file.metadata : {};'),
  'app handoff transfer metadata must be copied only from explicit file metadata fields'
);
assert.ok(
  appHandoffTransferSource.includes("appHandoffTransferManifestAccepts(manifest, 'post_text')")
    && appHandoffTransferSource.includes('? appHandoffTransferPostText(payload, delivery)')
    && appHandoffTransferSource.includes(': \'\';'),
  'app handoff transfer must create post_text artifacts only for apps whose manifest explicitly accepts post_text'
);
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
  'delivery_text_approval',
  'createXClientOpsHandoffUrl',
  'function appHandoffQueryFallbackUrl',
  'generic_app_query_fallback',
  'cait_x_post',
  'data-x-client-ops-link',
  'Called X Client Ops directly'
], 'public/chat.js');
const appAgentActionKindSource = chatSource.slice(
  chatSource.indexOf('function appAgentActionKind'),
  chatSource.indexOf('function appAgentRequiresApproval')
);
assertNotIncludes(appAgentActionKindSource, [
  "const caps = listValues(manifest.capabilities || []).join(' ').toLowerCase();",
  "const accepts = listValues(manifest.inputContract?.accepts || []).join(' ').toLowerCase();",
  "if (/x[_\\s-]?post|twitter|tweet/.test(combined)) return 'x_post_handoff';",
  "if (/social|post|community/.test(combined)) return 'social_handoff';",
  "if (/email|gmail|newsletter/.test(combined)) return 'email_handoff';",
  "if (/github|pull[_\\s-]?request|repo|code/.test(combined)) return 'code_handoff';",
  "if (/crm|lead|sales|acquisition/.test(combined)) return 'acquisition_handoff';"
], 'public/chat.js app-agent action contract');
const appAgentRequiresApprovalSource = chatSource.slice(
  chatSource.indexOf('function appAgentRequiresApproval'),
  chatSource.indexOf('function appAgentBaseTransferPacket')
);
assertNotIncludes(appAgentRequiresApprovalSource, [
  "const caps = listValues(manifest.capabilities || []).join(' ').toLowerCase();",
  "|| /(post|send|publish|submit|schedule|external|crm|email|x_|twitter)/i.test(approval.join(' '))",
  "|| /(post|send|publish|submit|schedule|external|crm|email|x[_\\s-]?post|twitter)/i.test(caps)"
], 'public/chat.js app-agent approval contract');

assert.equal(
  existsSync(join(root, 'public', 'client-basic-chat-answers.js')),
  false,
  'client basic answer builder module must not exist; true answer builders belong in agent/provider definitions'
);
assertNotIncludes(deliveryItemsSource, [
  'function publisherFallback',
  'Hero promise: turn the visitor',
  'Example delivery packet showing the finished output',
  'prepared.body || rawContent',
  'prepared.body || item.body',
  'prepared.body || item.content'
], 'lib/delivery-items.js');
const inferDeliverySurfaceSource = deliveryItemsSource.slice(
  deliveryItemsSource.indexOf('function inferSurface'),
  deliveryItemsSource.indexOf('function publisherChannelProfile')
);
assertNotIncludes(inferDeliverySurfaceSource, [
  'content.slice',
  'content ='
], 'lib/delivery-items.js inferSurface');
const publisherChannelProfileSource = deliveryItemsSource.slice(
  deliveryItemsSource.indexOf('function publisherChannelProfile'),
  deliveryItemsSource.indexOf('function inferItemType')
);
assertNotIncludes(publisherChannelProfileSource, [
  'content.slice',
  'content ='
], 'lib/delivery-items.js publisherChannelProfile');
const inferDeliveryItemTypeSource = deliveryItemsSource.slice(
  deliveryItemsSource.indexOf('function inferItemType'),
  deliveryItemsSource.indexOf('function surfaceForTask')
);
assertNotIncludes(inferDeliveryItemTypeSource, [
  'content.slice',
  'content ='
], 'lib/delivery-items.js inferItemType');
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
assert.ok(
  disciplineDoc.includes('Delivery follow-up preparation may carry the previous order context and explicit UI selections'),
  'development discipline must forbid delivery follow-up preparation from inventing specialist routing from delivery type/channel'
);
assert.ok(
  deliveryRoutesSource.includes('function explicitFollowupTaskTypeFromRequest')
    && deliveryRoutesSource.includes('Follow the assigned agent or leader contract for task-specific output, routing, approvals, and next steps.'),
  'delivery follow-up route must preserve explicit contracts and delegate task-specific instructions to agents/leaders'
);
assertNotIncludes(deliveryRoutesSource, [
  'function deliveryFollowupTaskForChannel',
  "if (normalized === 'x') return 'x_post';",
  "if (normalized === 'email') return 'email_ops';",
  "taskType = 'email_ops';",
  "taskType = 'code';",
  'Turn this into an execution-ready social publishing order.',
  'Use the social post pack from previous order',
  'Turn this into an execution-ready email order.',
  'Implement the technical handoff from previous order',
  'Convert the report into a publishable follow-up order',
  'Convert the report into the next executable work order directly.'
], 'lib/routes/deliveries.js follow-up preparation');
assertNotIncludes(chatSource, [
  'function clientPrepareOrderIntakeFallback',
  'client_prepare_order_intake_fallback',
  "source: 'client_fallback'",
  "questionSource: 'client_fallback'",
  'What outcome and target should this work focus on?',
  '今回達成したい成果と対象を教えてください。'
], 'public/chat.js prepare-order intake');
assertNotIncludes(chatSource, [
  'Follow-up/change request for running order ${job.id}:',
  'Use the previous order context, completed specialist outputs, active blockers, and current workflow state.',
  "String(prepared?.prompt || text || '').trim()",
  'prepared?.reason || `Prepared as an add-on request for running order'
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
const clientMarketingAgentListAnswer = clientSource.slice(
  clientSource.indexOf('function buildOpenChatMarketingAgentListAnswer'),
  clientSource.indexOf('function buildOpenChatLeaderCatalogAnswer')
);
assert.ok(
  clientMarketingAgentListAnswer.includes('registered agent manifests'),
  'client marketing agent list answer should route users to registered manifests instead of hardcoding sample agent definitions'
);
assertNotIncludes(clientMarketingAgentListAnswer, [
  'Launch Team Leader',
  'GROWTH OPERATOR AGENT',
  'DIRECTORY SUBMISSION AGENT',
  'ACQUISITION AUTOMATION AGENT',
  'INSTAGRAM LAUNCH AGENT',
  'X OPS CONNECTOR AGENT',
  'can post after X OAuth plus explicit confirmation',
  'OAuth連携後は確認付きで投稿する'
], 'public/client.js marketing agent list answer');
const clientReusableToolsAnswer = clientSource.slice(
  clientSource.indexOf('function buildOpenChatReusableToolsAnswer'),
  clientSource.indexOf('function openChatLooksShortPromptSource')
);
assertNotIncludes(clientReusableToolsAnswer, [
  "action: 'connect_x'",
  'CONNECT X',
  'X連携'
], 'public/client.js reusable tools answer');
const clientFlexibleToolCandidates = clientSource.slice(
  clientSource.indexOf('function flexibleToolCandidates'),
  clientSource.indexOf('function activeFlexibleTool')
);
assert.ok(
  clientFlexibleToolCandidates.includes('Social publishing handoff'),
  'client social publishing hints should be framed as SaaS/app handoff, not direct chat execution'
);
assertNotIncludes(clientFlexibleToolCandidates, [
  "title: 'X Ops Connector'",
  "action: 'connect_x'",
  "action: 'post_current_to_x'",
  'POST EXACT TEXT',
  'DRAFT ONLY',
  'can publish only the confirmed text through your connected X account',
  'Connect your X account with OAuth first'
], 'public/client.js flexible social publishing tool');
assertNotIncludes(clientSource, [
  'function postCurrentComposerToX',
  "'/api/connectors/x/post'",
  'Posted to X after explicit confirmation.'
], 'public/client.js');
assertNotIncludes(workActionRegistrySource, [
  "post_current_to_x: { kind: 'executor' }"
], 'public/work-action-registry.js');
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
