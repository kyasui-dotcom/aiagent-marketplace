import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createBrokerAgentAssignmentHelpers } from '../lib/broker-agent-assignment.js';
import { estimateRunWindow, orderPreflightForAgent, reserveBillingEstimateInState, upsertAccountSettingsInState } from '../lib/shared.js';
import { createWorkflowPlanAssemblyHelpers } from '../lib/workflow-plan-assembly.js';

export function runWorkerApiSourceOwnershipQa() {
  const workerSource = readFileSync(new URL('../worker.js', import.meta.url), 'utf8');
  const workerHandlersSource = readFileSync(new URL('../lib/worker-handlers.js', import.meta.url), 'utf8');
  const workerRoutingSource = `${workerSource}\n${workerHandlersSource}`;
  const apiRoutesSource = readFileSync(new URL('../lib/api-routes.js', import.meta.url), 'utf8');
  const httpCoreSource = readFileSync(new URL('../lib/http-core.js', import.meta.url), 'utf8');
  const guestTrialSource = readFileSync(new URL('../lib/guest-trial.js', import.meta.url), 'utf8');
  const authSessionSource = readFileSync(new URL('../lib/auth-session.js', import.meta.url), 'utf8');
  const accountSessionSource = readFileSync(new URL('../lib/account-session.js', import.meta.url), 'utf8');
  const accountEventsSource = readFileSync(new URL('../lib/account-events.js', import.meta.url), 'utf8');
  const authContextSource = readFileSync(new URL('../lib/auth-context.js', import.meta.url), 'utf8');
  const authHelpersSource = readFileSync(new URL('../lib/auth-helpers.js', import.meta.url), 'utf8');
  const adminDashboardRoutesSource = readFileSync(new URL('../lib/routes/admin-dashboard.js', import.meta.url), 'utf8');
  const analyticsRoutesSource = readFileSync(new URL('../lib/routes/analytics.js', import.meta.url), 'utf8');
  const agentExecutionRoutesSource = readFileSync(new URL('../lib/routes/agent-execution.js', import.meta.url), 'utf8');
  const agentManagementRoutesSource = readFileSync(new URL('../lib/routes/agent-management.js', import.meta.url), 'utf8');
  const agentRegistrationRoutesSource = readFileSync(new URL('../lib/routes/agent-registration.js', import.meta.url), 'utf8');
  const appRoutesSource = readFileSync(new URL('../lib/routes/apps.js', import.meta.url), 'utf8');
  const appSettingsRoutesSource = readFileSync(new URL('../lib/routes/app-settings.js', import.meta.url), 'utf8');
  const authRoutesSource = readFileSync(new URL('../lib/routes/auth.js', import.meta.url), 'utf8');
  const authStatusRoutesSource = readFileSync(new URL('../lib/routes/auth-status.js', import.meta.url), 'utf8');
  const apiKeyRoutesSource = readFileSync(new URL('../lib/routes/api-keys.js', import.meta.url), 'utf8');
  const billingOutcomeSource = readFileSync(new URL('../lib/billing-outcome.js', import.meta.url), 'utf8');
  const campaignRoutesSource = readFileSync(new URL('../lib/routes/campaigns.js', import.meta.url), 'utf8');
  const catalogRoutesSource = readFileSync(new URL('../lib/routes/catalog.js', import.meta.url), 'utf8');
  const chatMemoryRoutesSource = readFileSync(new URL('../lib/routes/chat-memory.js', import.meta.url), 'utf8');
  const devJobRoutesSource = readFileSync(new URL('../lib/routes/dev-jobs.js', import.meta.url), 'utf8');
  const deliveryRoutesSource = readFileSync(new URL('../lib/routes/deliveries.js', import.meta.url), 'utf8');
  const emailNotificationsSource = readFileSync(new URL('../lib/email-notifications.js', import.meta.url), 'utf8');
  const feedbackEmailSource = readFileSync(new URL('../lib/feedback-email.js', import.meta.url), 'utf8');
  const jobRoutesSource = readFileSync(new URL('../lib/routes/jobs.js', import.meta.url), 'utf8');
  const jobAuthorityRoutesSource = readFileSync(new URL('../lib/routes/job-authority.js', import.meta.url), 'utf8');
  const mcpRoutesSource = readFileSync(new URL('../lib/routes/mcp.js', import.meta.url), 'utf8');
  const openChatIntentSource = readFileSync(new URL('../lib/open-chat-intent.js', import.meta.url), 'utf8');
  const openChatRoutesSource = readFileSync(new URL('../lib/routes/open-chat.js', import.meta.url), 'utf8');
  const orderCreateRequestHelpersSource = readFileSync(new URL('../lib/order-create-request-helpers.js', import.meta.url), 'utf8');
  const orderCreateRoutesSource = readFileSync(new URL('../lib/routes/order-create.js', import.meta.url), 'utf8');
  const orderCreateSingleRoutesSource = readFileSync(new URL('../lib/routes/order-create-single.js', import.meta.url), 'utf8');
  const orderCreateWorkflowRoutesSource = readFileSync(new URL('../lib/routes/order-create-workflow.js', import.meta.url), 'utf8');
  const pricingInputSource = readFileSync(new URL('../lib/pricing-input.js', import.meta.url), 'utf8');
  const publicReadModelSource = readFileSync(new URL('../lib/public-read-model.js', import.meta.url), 'utf8');
  const rateLimitSource = readFileSync(new URL('../lib/rate-limit.js', import.meta.url), 'utf8');
  const requestAccessSource = readFileSync(new URL('../lib/request-access.js', import.meta.url), 'utf8');
  const runtimeEnvSource = readFileSync(new URL('../lib/runtime-env.js', import.meta.url), 'utf8');
  const sampleAgentManifestRoutesSource = readFileSync(new URL('../lib/routes/sample-agent-manifest.js', import.meta.url), 'utf8');
  const snapshotSource = readFileSync(new URL('../lib/snapshot.js', import.meta.url), 'utf8');
  const workOrderRoutesSource = readFileSync(new URL('../lib/routes/work-order.js', import.meta.url), 'utf8');
  const providerIdentityRoutesSource = readFileSync(new URL('../lib/routes/provider-identity.js', import.meta.url), 'utf8');
  const recurringOrderRoutesSource = readFileSync(new URL('../lib/routes/recurring-orders.js', import.meta.url), 'utf8');
  const feedbackChatRoutesSource = readFileSync(new URL('../lib/routes/feedback-chat.js', import.meta.url), 'utf8');
  const exactActionRoutesSource = readFileSync(new URL('../lib/routes/exact-actions.js', import.meta.url), 'utf8');
  const settingsRoutesSource = readFileSync(new URL('../lib/routes/settings.js', import.meta.url), 'utf8');
  const brokerAgentAssignmentSource = readFileSync(new URL('../lib/broker-agent-assignment.js', import.meta.url), 'utf8');
  const authorityRequestsSource = readFileSync(new URL('../lib/authority-requests.js', import.meta.url), 'utf8');
  const githubAppAccessSource = readFileSync(new URL('../lib/github-app-access.js', import.meta.url), 'utf8');
  const githubAppConfigSource = readFileSync(new URL('../lib/github-app-config.js', import.meta.url), 'utf8');
  const githubIntegrationSource = readFileSync(new URL('../lib/github-integration.js', import.meta.url), 'utf8');
  const githubIntegrationRoutesSource = readFileSync(new URL('../lib/routes/integrations-github.js', import.meta.url), 'utf8');
  const googleIntegrationSource = readFileSync(new URL('../lib/google-integration.js', import.meta.url), 'utf8');
  const marketplaceRegistrationSource = readFileSync(new URL('../lib/marketplace-registration.js', import.meta.url), 'utf8');
  const operatorAccessSource = readFileSync(new URL('../lib/operator-access.js', import.meta.url), 'utf8');
  const orderStrategySource = readFileSync(new URL('../lib/order-strategy.js', import.meta.url), 'utf8');
  const dispatchPolicySource = readFileSync(new URL('../lib/dispatch-policy.js', import.meta.url), 'utf8');
  const endpointDispatchContractSource = readFileSync(new URL('../lib/endpoint-dispatch-contract.js', import.meta.url), 'utf8');
  const dispatchResponseNormalizerSource = readFileSync(new URL('../lib/dispatch-response-normalizer.js', import.meta.url), 'utf8');
  const deliveryActionContractSource = readFileSync(new URL('../public/delivery-action-contract.js', import.meta.url), 'utf8');
  const sampleAgentDefinitionsSource = readFileSync(new URL('../lib/builtin-agents/agents/index.js', import.meta.url), 'utf8');
  const orchestrationSource = readFileSync(new URL('../lib/orchestration.js', import.meta.url), 'utf8');
  const cmoLeaderSource = readFileSync(new URL('../lib/builtin-agents/agents/cmo-leader.js', import.meta.url), 'utf8');
  const dataAnalysisSource = readFileSync(new URL('../lib/builtin-agents/agents/data-analysis.js', import.meta.url), 'utf8');
  const agentOrchestrationDisciplineSource = readFileSync(new URL('../docs/AGENT_ORCHESTRATION_DISCIPLINE.md', import.meta.url), 'utf8');
  const storageSource = readFileSync(new URL('../lib/storage.js', import.meta.url), 'utf8');
  const storageStateHelpersSource = readFileSync(new URL('../lib/storage-state-helpers.js', import.meta.url), 'utf8');
  const storageRowCodecsSource = readFileSync(new URL('../lib/storage-row-codecs.js', import.meta.url), 'utf8');
  const integrationRoutesSource = readFileSync(new URL('../lib/routes/integrations.js', import.meta.url), 'utf8');
  const leaderWorkerPlanningSource = readFileSync(new URL('../lib/leader-worker-planning.js', import.meta.url), 'utf8');
  const workflowAdaptiveActivationSource = readFileSync(new URL('../lib/workflow-adaptive-activation.js', import.meta.url), 'utf8');
  const workflowHandoffContextSource = readFileSync(new URL('../lib/workflow-handoff-context.js', import.meta.url), 'utf8');
  const workflowLeaderHandoffSource = readFileSync(new URL('../lib/workflow-leader-handoff.js', import.meta.url), 'utf8');
  const workflowLeaderHandoffRefreshSource = readFileSync(new URL('../lib/workflow-leader-handoff-refresh.js', import.meta.url), 'utf8');
  const workflowLeaderSequenceRepairSource = readFileSync(new URL('../lib/workflow-leader-sequence-repair.js', import.meta.url), 'utf8');
  const workflowParentReconcileSource = readFileSync(new URL('../lib/workflow-parent-reconcile.js', import.meta.url), 'utf8');
  const workflowPlanAssemblySource = readFileSync(new URL('../lib/workflow-plan-assembly.js', import.meta.url), 'utf8');
  const workflowReconcileActionsSource = readFileSync(new URL('../lib/workflow-reconcile-actions.js', import.meta.url), 'utf8');
  const workflowReconcileStateSource = readFileSync(new URL('../lib/workflow-reconcile-state.js', import.meta.url), 'utf8');
  const workflowWatchdogSource = readFileSync(new URL('../lib/workflow-watchdog.js', import.meta.url), 'utf8');
  const workflowRetrySweepSource = readFileSync(new URL('../lib/workflow-retry-sweep.js', import.meta.url), 'utf8');
  const workflowDispatchQueueSource = readFileSync(new URL('../lib/workflow-dispatch-queue.js', import.meta.url), 'utf8');
  const workflowDispatchRuntimeSource = readFileSync(new URL('../lib/workflow-dispatch-runtime.js', import.meta.url), 'utf8');
  const workflowTimeoutsSource = readFileSync(new URL('../lib/workflow-timeouts.js', import.meta.url), 'utf8');
  const workflowFailureRetrySource = readFileSync(new URL('../lib/workflow-failure-retry.js', import.meta.url), 'utf8');
  const workflowLayeringSource = readFileSync(new URL('../lib/workflow-layering.js', import.meta.url), 'utf8');
  const workflowQualitySource = readFileSync(new URL('../lib/workflow-quality.js', import.meta.url), 'utf8');
  const workflowQualityHandoffSource = readFileSync(new URL('../lib/workflow-quality-handoff.js', import.meta.url), 'utf8');
  const workflowSourceRequirementsSource = readFileSync(new URL('../lib/workflow-source-requirements.js', import.meta.url), 'utf8');
  const workflowEndpointDispatchSource = readFileSync(new URL('../lib/workflow-endpoint-dispatch.js', import.meta.url), 'utf8');
  const workflowChildProgressSource = readFileSync(new URL('../lib/workflow-child-progress.js', import.meta.url), 'utf8');
  const workflowPriorRunsSource = readFileSync(new URL('../lib/workflow-prior-runs.js', import.meta.url), 'utf8');
  const workflowLeaderSequenceSource = readFileSync(new URL('../lib/workflow-leader-sequence.js', import.meta.url), 'utf8');
  const jsonPostSource = readFileSync(new URL('../lib/json-post.js', import.meta.url), 'utf8');
  const deliveryCompletionGateSource = readFileSync(new URL('../lib/delivery-completion-gate.js', import.meta.url), 'utf8');
  assert.ok(!workerSource.includes('async fetch(request, env, ctx)'), 'worker.js should delegate request handling to lib/worker-handlers.js');
  assert.ok(workerHandlersSource.includes('export function createWorkerHandlers'), 'worker default runtime methods should be owned by lib/worker-handlers.js');
  assert.ok(workerHandlersSource.includes('async function handleAuthRoutes'), 'worker request routing should be split into route-group methods');
  assert.ok(!workerSource.includes("from './lib/local-agent-endpoints.js'"), 'sample agents must use the normal external provider endpoint path.');
  assert.ok(!workerSource.includes('function invokeSameWorkerAgentEndpoint'), 'worker dispatch must not reroute sample agents into local same-worker execution.');
  assert.ok(!workerSource.includes('BUILT_IN_DISPATCH_SCHEDULE_STALE_MS'), 'dispatch_scheduled freshness must be endpoint-contract based, not built-in specific.');
  assert.ok(!workerSource.includes('BUILT_IN_JOB_TIMEOUT_FLOOR_MS'), 'standalone timeout floors must not depend on built-in agent identity.');
  assert.ok(httpCoreSource.includes('function json'), 'HTTP response primitives should be owned outside worker.js');
  assert.ok(httpCoreSource.includes('function legacyLegalNoticeRedirect'), 'legacy browser redirects should be owned outside worker.js');
  assert.ok(authSessionSource.includes('async function makeSessionCookie'), 'session cookie creation should be owned outside worker.js');
  assert.ok(authSessionSource.includes('async function consumeOAuthState'), 'OAuth state cookie consumption should be owned outside worker.js');
  assert.ok(accountEventsSource.includes('async function touchEvent'), 'event persistence helper should be owned by lib/account-events.js');
  assert.ok(accountEventsSource.includes('async function mutateAccountByLogin'), 'targeted account mutation helper should be owned by lib/account-events.js');
  assert.ok(accountEventsSource.includes('function ga4AuthEventCookieForAccount'), 'GA4 auth event cookie should be owned by lib/account-events.js');
  assert.ok(accountEventsSource.includes('async function claimSignupWelcomeEmailAttempt'), 'signup welcome email claim should be owned by lib/account-events.js');
  assert.ok(billingOutcomeSource.includes('async function recordBillingOutcome'), 'billing outcome persistence should be owned by lib/billing-outcome.js');
  assert.ok(billingOutcomeSource.includes('async function appendBillingAudit'), 'billing audit append should be owned by lib/billing-outcome.js');
  assert.ok(billingOutcomeSource.includes('function settleAgentEarnings'), 'agent earning settlement should be owned by lib/billing-outcome.js');
  assert.ok(billingOutcomeSource.includes('if (!isBillableJob(job))'), 'test-mode billing outcomes should not force a full-state billing settlement.');
  assert.ok(snapshotSource.includes('async function lazySnapshot'), 'lazy D1 snapshot assembly should be owned by lib/snapshot.js');
  assert.ok(snapshotSource.includes('async function snapshot'), 'full snapshot assembly should be owned by lib/snapshot.js');
  assert.ok(snapshotSource.includes('export function requestedBillingPeriod'), 'billing period query parsing should be owned by lib/snapshot.js');
  assert.ok(snapshotSource.includes('sanitizeExactMatchActionsForClient'), 'snapshot assembly should preserve exact action sanitization.');
  assert.ok(accountSessionSource.includes('function lightweightCurrentFromSession'), 'lightweight current session shaping should be owned by lib/account-session.js');
  assert.ok(accountSessionSource.includes('function mergeLinkedSession'), 'linked OAuth session merging should be owned by lib/account-session.js');
  assert.ok(accountSessionSource.includes('function linkedProvidersFromAccount'), 'linked provider resolution should be owned by lib/account-session.js');
  assert.ok(accountSessionSource.includes('function githubOAuthScope'), 'GitHub OAuth scope selection should be owned by lib/account-session.js');
  assert.ok(googleIntegrationSource.includes('function googleOAuthScopeGroupsFromUrl'), 'Google OAuth scope group parsing should be owned by lib/google-integration.js');
  assert.ok(googleIntegrationSource.includes('function googleScopedOAuthScope'), 'Google OAuth scoped consent construction should be owned by lib/google-integration.js');
  assert.ok(googleIntegrationSource.includes('function googleApiRecoveryHint'), 'Google API recovery hints should be owned by lib/google-integration.js');
  assert.ok(googleIntegrationSource.includes('async function googleAccessTokenForConnector'), 'Google connector token refresh should be owned by lib/google-integration.js');
  assert.ok(publicReadModelSource.includes('function publicAgent'), 'public agent shaping should be owned by lib/public-read-model.js');
  assert.ok(publicReadModelSource.includes('function publicApp'), 'public app shaping should be owned by lib/public-read-model.js');
  assert.ok(publicReadModelSource.includes('function statsOf'), 'public stats shaping should be owned by lib/public-read-model.js');
  assert.ok(publicReadModelSource.includes('function cloneJob'), 'job cloning helper should be owned by lib/public-read-model.js');
  assert.ok(rateLimitSource.includes('function rateLimitClientKey'), 'rate-limit client keying should be owned by lib/rate-limit.js');
  assert.ok(rateLimitSource.includes('function rateLimitResponseForRequest'), 'rate-limit response generation should be owned by lib/rate-limit.js');
  assert.ok(leaderWorkerPlanningSource.includes('function workflowHumanActionIntentText'), 'leader human-action intent extraction should be owned by lib/leader-worker-planning.js');
  assert.ok(leaderWorkerPlanningSource.includes('function normalizeLeaderWorkflowPlannedTasks'), 'leader worker task normalization should be owned by lib/leader-worker-planning.js');
  assert.ok(leaderWorkerPlanningSource.includes('function ensureLeaderWorkflowActionTasks'), 'leader worker action-task requirements should be owned by lib/leader-worker-planning.js');
  assert.ok(leaderWorkerPlanningSource.includes('function filterLeaderWorkflowPlannedTasks'), 'leader worker allowed-task filtering should be owned by lib/leader-worker-planning.js');
  assert.ok(brokerAgentAssignmentSource.includes('function taskMatchForAgent'), 'broker agent task matching should be owned by lib/broker-agent-assignment.js');
  assert.ok(brokerAgentAssignmentSource.includes('function assignAgentForTask'), 'broker verified-agent assignment should be owned by lib/broker-agent-assignment.js');
  assert.ok(brokerAgentAssignmentSource.includes('function selectedAgentIdFromOrderBody'), 'broker manual agent id normalization should be owned by lib/broker-agent-assignment.js');
  assert.ok(brokerAgentAssignmentSource.includes('function selectedAgentTaskTypeFromOrderBody'), 'broker manual agent task normalization should be owned by lib/broker-agent-assignment.js');
  assert.ok(brokerAgentAssignmentSource.includes('function resolveWorkflowAssignmentFromAgentList'), 'broker workflow child re-resolution should be owned by lib/broker-agent-assignment.js');
  assert.ok(brokerAgentAssignmentSource.includes('function leaderPlannerCandidateAgents'), 'leader planner candidate shaping should be owned by lib/broker-agent-assignment.js');
  assert.ok(brokerAgentAssignmentSource.includes('function leaderPlannerManifestCatalog'), 'leader planner marketplace candidate catalog shaping should be owned by lib/broker-agent-assignment.js');
  const qaNormalizeTaskTypes = (items = []) => [...new Set((Array.isArray(items) ? items : [items])
    .map((item) => String(item || '').trim().toLowerCase().replace(/[\s-]+/g, '_'))
    .filter(Boolean))];
  const qaBrokerAssignment = createBrokerAgentAssignmentHelpers({
    agentLinksFromRecord: () => ({}),
    agentPatternFitScore: () => 0,
    agentTagsFromRecord: (agent = {}) => Array.isArray(agent.tags) ? agent.tags : [],
    computeScore: (agent = {}) => Number(agent.score || 0),
    isAgentVerified: (agent = {}) => agent.verified !== false,
    isManagedSampleAgent: () => false,
    isWorkflowLeaderTask: (task = '') => String(task || '').endsWith('_leader'),
    leaderReadableAgentCatalogIndex: () => [],
    leaderTaskLayer: () => null,
    leaderTaskPhase: () => '',
    normalizeAgentTags: qaNormalizeTaskTypes,
    normalizeTaskTypes: qaNormalizeTaskTypes,
    resolveAgentJobEndpoint: (agent = {}) => agent.endpoint || '',
    workflowTagHintsForTask: () => [],
    workflowTaskCandidateTokens: (value = '') => qaNormalizeTaskTypes(String(value || '').split(/[_\s-]+/)),
    workflowTaskSoftMatchTokens: (value = '') => {
      const tokens = qaNormalizeTaskTypes(String(value || '').split(/[_\s-]+/));
      if (tokens.includes('growth')) tokens.push('marketing');
      if (tokens.includes('seo_specialist')) tokens.push('seo');
      return qaNormalizeTaskTypes(tokens);
    }
  });
  const exactGrowthAssignment = qaBrokerAssignment.assignAgentForTask([
    { id: 'agent_x', name: 'X Broad Marketing', taskTypes: ['marketing'], score: 99, endpoint: '/x/jobs', tags: ['marketing'], online: true },
    { id: 'agent_growth', name: 'Growth Exact', taskTypes: ['growth'], score: 1, endpoint: '/growth/jobs', tags: ['growth'], online: true }
  ], 'growth', 0, '', { allowSoftTaskMatch: true, requireEndpoint: true });
  assert.equal(exactGrowthAssignment.agent.id, 'agent_growth', 'broker assignment should prefer an exact current manifest task over a broader soft match');
  const exactSeoAssignment = qaBrokerAssignment.assignAgentForTask([
    { id: 'agent_writer', name: 'Writer SEO Alias', taskTypes: ['seo'], score: 99, endpoint: '/writer/jobs', tags: ['seo'], online: true },
    { id: 'agent_seo', name: 'SEO Specialist Exact', taskTypes: ['seo_specialist'], score: 1, endpoint: '/seo/jobs', tags: ['seo'], online: true }
  ], 'seo_specialist', 0, '', { allowSoftTaskMatch: true, requireEndpoint: true });
  assert.equal(exactSeoAssignment.agent.id, 'agent_seo', 'broker assignment should not route seo_specialist workflow work to a generic SEO alias when an exact specialist exists');
  assert.ok(workflowPlanAssemblySource.includes('function planWorkflowAssignments'), 'workflow assignment planning should be owned by lib/workflow-plan-assembly.js');
  assert.ok(workflowPlanAssemblySource.includes('async function maybeRefineWorkflowPlanWithLeaderLlm'), 'leader LLM plan refinement should be owned by lib/workflow-plan-assembly.js');
  assert.ok(workflowPlanAssemblySource.includes('function workflowPlannedTasksFromOrderBody'), 'retry planned-task extraction should be owned by lib/workflow-plan-assembly.js');
  assert.ok(workflowPlanAssemblySource.includes('function buildWorkflowEstimate'), 'workflow estimate assembly should be owned by lib/workflow-plan-assembly.js');
  assert.ok(orderCreateRoutesSource.includes('openAiCostEstimate: workflowEstimate.openAiCostMax') || orderCreateWorkflowRoutesSource.includes('openAiCostEstimate: workflowEstimate.openAiCostMax'), 'workflow preflight should guard against the OpenAI/API cost estimate, not the marked-up customer total.');
  assert.ok(workflowPlanAssemblySource.includes('function buildWorkflowParentJob'), 'workflow parent job assembly should be owned by lib/workflow-plan-assembly.js');
  assert.ok(workflowPlanAssemblySource.includes('function compactRetryReuseArtifactsForJobStorage'), 'retry reuse artifact storage compaction should be owned by lib/workflow-plan-assembly.js');
  const qaWorkflowPlanHelpers = createWorkflowPlanAssemblyHelpers({ estimateRunWindow });
  const qaWorkflowEstimate = qaWorkflowPlanHelpers.buildWorkflowEstimate([
    { taskType: 'ops', agent: { avgLatencySec: 30, verificationStatus: 'verified', online: true } },
    { taskType: 'ops', agent: { avgLatencySec: 30, verificationStatus: 'verified', online: true } }
  ]);
  assert.equal(qaWorkflowEstimate.openAiCostMax, 28, 'workflow estimate should sum max OpenAI/API cost across child runs.');
  assert.equal(qaWorkflowEstimate.totalMax, 34.2, 'workflow estimate should preserve the customer-facing marked-up total.');
  const qaWorkflowBillingState = { accounts: [] };
  upsertAccountSettingsInState(qaWorkflowBillingState, 'workflow-limit-user', { login: 'workflow-limit-user', name: 'Workflow Limit User' }, 'github-app', {
    billing: { openAiMonthlyCostLimit: 30 }
  });
  const qaOpenAiGuardPass = reserveBillingEstimateInState(
    qaWorkflowBillingState,
    'workflow-limit-user',
    { login: 'workflow-limit-user', name: 'Workflow Limit User' },
    'github-app',
    qaWorkflowEstimate.totalMax,
    {
      openAiCostEstimate: qaWorkflowEstimate.openAiCostMax,
      paymentProcessingRemoved: true,
      period: '2026-05'
    }
  );
  assert.equal(qaOpenAiGuardPass.ok, true, 'workflow OpenAI/API guard should allow a plan when the raw API cost stays within the monthly limit.');
  const qaOpenAiGuardFail = reserveBillingEstimateInState(
    qaWorkflowBillingState,
    'workflow-limit-user',
    { login: 'workflow-limit-user', name: 'Workflow Limit User' },
    'github-app',
    qaWorkflowEstimate.totalMax,
    {
      openAiCostEstimate: qaWorkflowEstimate.totalMax,
      paymentProcessingRemoved: true,
      period: '2026-05'
    }
  );
  assert.equal(qaOpenAiGuardFail.ok, false, 'marked-up workflow totals should not be reused as the OpenAI/API guard input.');
  assert.equal(qaOpenAiGuardFail.code, 'openai_cost_limit_reached');
  assert.ok(orderStrategySource.includes('function normalizeOrderStrategy'), 'order strategy normalization should be owned by lib/order-strategy.js');
  assert.ok(orderStrategySource.includes('function resolveOrderStrategy'), 'single/multi/auto routing policy should be owned by lib/order-strategy.js');
  assert.ok(orderStrategySource.includes('function orderStrategyWithFollowupContext'), 'follow-up order strategy context should be owned by lib/order-strategy.js');
  assert.ok(orderStrategySource.includes('function orderBodyWithLeaderFollowupSpecialistRouting'), 'leader follow-up specialist routing should be owned by lib/order-strategy.js');
  assert.ok(orderStrategySource.includes('function requestedFollowupJobIdFromCreateBody'), 'follow-up job id parsing should be owned by lib/order-strategy.js');
  assert.ok(dispatchPolicySource.includes('function isTerminalJobStatus'), 'job terminal status policy should be owned by lib/dispatch-policy.js');
  assert.ok(dispatchPolicySource.includes('function canTransitionJob'), 'job transition policy should be owned by lib/dispatch-policy.js');
  assert.ok(dispatchPolicySource.includes('function maxDispatchRetriesForJob'), 'dispatch retry policy should be owned by lib/dispatch-policy.js');
  assert.ok(dispatchPolicySource.includes('function dispatchExecutionIsFresh'), 'dispatch in-progress freshness policy should be owned by lib/dispatch-policy.js');
  assert.ok(dispatchPolicySource.includes('function workflowDispatchMaxAgeMs'), 'workflow dispatch age policy should be owned by lib/dispatch-policy.js');
  assert.ok(dispatchPolicySource.includes('function workflowLeaderControlTask'), 'workflow leader control retry classification should be owned by lib/dispatch-policy.js');
  assert.ok(dispatchPolicySource.includes('function workflowChildDispatchFailureRequiresRestart'), 'workflow child restart policy should be owned by lib/dispatch-policy.js');
  assert.ok(dispatchPolicySource.includes('function workflowRestartRequiredReason'), 'workflow restart reason policy should be owned by lib/dispatch-policy.js');
  assert.ok(endpointDispatchContractSource.includes('function buildDispatchPayload'), 'endpoint dispatch payload contract should be owned by lib/endpoint-dispatch-contract.js');
  assert.ok(endpointDispatchContractSource.includes('function compactWorkflowInputForEndpointDispatch'), 'endpoint workflow input compaction should be owned by lib/endpoint-dispatch-contract.js');
  assert.ok(endpointDispatchContractSource.includes('function compactWorkflowAppContextsForDispatch'), 'endpoint app context compaction should be owned by lib/endpoint-dispatch-contract.js');
  assert.ok(endpointDispatchContractSource.includes('function buildDispatchHeaders'), 'endpoint manifest auth headers should be owned by lib/endpoint-dispatch-contract.js');
  assert.ok(requestAccessSource.includes('function identityLoginsForCurrent'), 'request identity login shaping should be owned by lib/request-access.js');
  assert.ok(requestAccessSource.includes('function secretEquals'), 'timing-safe secret comparison should be owned by lib/request-access.js');
  assert.ok(requestAccessSource.includes('function authorizeAgentOwnerAction'), 'agent owner authorization should be owned by lib/request-access.js');
  assert.ok(requestAccessSource.includes('function authorizeConnectedAgentAction'), 'connected agent authorization should be owned by lib/request-access.js');
  assert.ok(requestAccessSource.includes('function visibleJobsForRequest'), 'job visibility shaping should be owned by lib/request-access.js');
  assert.ok(requestAccessSource.includes('function visibleDeliveryItemsForRequestFast'), 'delivery item visibility shaping should be owned by lib/request-access.js');
  assert.ok(requestAccessSource.includes('function canViewJobFromRequest'), 'job read authorization should be owned by lib/request-access.js');
  assert.ok(runtimeEnvSource.includes('export function runtimeStorage'), 'runtime storage creation should be owned by lib/runtime-env.js');
  assert.ok(runtimeEnvSource.includes('export function shouldInjectQaOrderCreateFault'), 'QA order-create fault policy should be owned by lib/runtime-env.js');
  assert.ok(runtimeEnvSource.includes('export async function fetchJson'), 'shared JSON fetch helper should be owned by lib/runtime-env.js');
  assert.ok(runtimeEnvSource.includes('export function githubClientId'), 'GitHub OAuth client id env parsing should be owned by lib/runtime-env.js');
  assert.equal(existsSync(new URL('../lib/stripe-connected-account.js', import.meta.url)), false, 'Stripe connected account helpers should be removed with in-app payouts.');
  assert.equal(existsSync(new URL('../lib/in-app-payments-removed.js', import.meta.url)), false, 'Removed payment compatibility routes should be deleted, not kept as 410 shims.');
  assert.ok(!workerSource.includes('function json(body'), 'worker.js must not keep HTTP JSON primitive implementation');
  assert.ok(!workerSource.includes('function legacyLegalNoticeRedirect'), 'worker.js must not keep legacy browser redirect implementation');
  assert.ok(!workerSource.includes('async function touchEvent'), 'worker.js must not keep event persistence helper implementation');
  assert.ok(!workerSource.includes('async function mutateAccountByLogin'), 'worker.js must not keep targeted account mutation helper implementation');
  assert.ok(!workerSource.includes('function ga4AuthEventCookieForAccount'), 'worker.js must not keep GA4 auth event cookie implementation');
  assert.ok(!workerSource.includes('async function claimSignupWelcomeEmailAttempt'), 'worker.js must not keep signup welcome email claim implementation');
  assert.ok(!workerSource.includes('async function recordBillingOutcome'), 'worker.js must not keep billing outcome persistence implementation');
  assert.ok(!workerSource.includes('async function appendBillingAudit'), 'worker.js must not keep billing audit append implementation');
  assert.ok(!workerSource.includes('function settleAgentEarnings'), 'worker.js must not keep agent earning settlement implementation');
  assert.ok(!workerSource.includes('async function lazySnapshot'), 'worker.js must not keep lazy snapshot assembly implementation');
  assert.ok(!workerSource.includes('async function snapshot'), 'worker.js must not keep full snapshot assembly implementation');
  assert.ok(!workerSource.includes('function requestedBillingPeriod'), 'worker.js must not keep billing period query parser implementation');
  assert.ok(!workerSource.includes('function lightweightCurrentFromSession'), 'worker.js must not keep lightweight current session shaping implementation');
  assert.ok(!workerSource.includes('function mergeLinkedSession'), 'worker.js must not keep linked OAuth session merge implementation');
  assert.ok(!workerSource.includes('function linkedProvidersFromAccount'), 'worker.js must not keep linked provider resolution implementation');
  assert.ok(!workerSource.includes('function githubOAuthScope'), 'worker.js must not keep GitHub OAuth scope selection implementation');
  assert.ok(!workerSource.includes('function googleOAuthScopeGroupsFromUrl'), 'worker.js must not keep Google OAuth scope group parsing implementation');
  assert.ok(!workerSource.includes('function googleScopedOAuthScope'), 'worker.js must not keep Google OAuth scoped consent implementation');
  assert.ok(!workerSource.includes('function googleApiRecoveryHint'), 'worker.js must not keep Google API recovery hint implementation');
  assert.ok(!workerSource.includes('async function googleAccessTokenForConnector'), 'worker.js must not keep Google connector token refresh implementation');
  assert.ok(!workerSource.includes('function publicAgent'), 'worker.js must not keep public agent shaping implementation');
  assert.ok(!workerSource.includes('function publicApp'), 'worker.js must not keep public app shaping implementation');
  assert.ok(!workerSource.includes('function statsOf'), 'worker.js must not keep public stats shaping implementation');
  assert.ok(!workerSource.includes('function cloneJob'), 'worker.js must not keep job cloning helper implementation');
  assert.ok(!workerSource.includes('function rateLimitClientKey'), 'worker.js must not keep rate-limit client keying implementation');
  assert.ok(!workerSource.includes('function rateLimitResponseForRequest'), 'worker.js must not keep rate-limit response generation implementation');
  assert.ok(!workerSource.includes('function workflowHumanActionIntentText'), 'worker.js must not keep leader human-action intent extraction implementation');
  assert.ok(!workerSource.includes('function normalizeLeaderWorkflowPlannedTasks'), 'worker.js must not keep leader worker task normalization implementation');
  assert.ok(!workerSource.includes('function ensureLeaderWorkflowActionTasks'), 'worker.js must not keep leader worker action-task requirements implementation');
  assert.ok(!workerSource.includes('function filterLeaderWorkflowPlannedTasks'), 'worker.js must not keep leader worker allowed-task filtering implementation');
  assert.ok(!workerSource.includes('function taskMatchForAgent'), 'worker.js must not keep broker agent task matching implementation');
  assert.ok(!workerSource.includes('function assignAgentForTask'), 'worker.js must not keep broker verified-agent assignment implementation');
  assert.ok(!workerSource.includes('function selectedAgentIdFromOrderBody'), 'worker.js must not keep broker manual agent id normalization implementation');
  assert.ok(!workerSource.includes('function selectedAgentTaskTypeFromOrderBody'), 'worker.js must not keep broker manual agent task normalization implementation');
  assert.ok(!workerSource.includes('function resolveWorkflowAssignmentFromAgentList'), 'worker.js must not keep broker workflow child re-resolution implementation');
  assert.ok(!workerSource.includes('function leaderPlannerCandidateAgents'), 'worker.js must not keep leader planner candidate shaping implementation');
  assert.ok(!workerSource.includes('function leaderPlannerManifestCatalog'), 'worker.js must not keep leader planner marketplace candidate catalog shaping implementation');
  assert.ok(!workerSource.includes('function planWorkflowAssignments'), 'worker.js must not keep workflow assignment planning implementation');
  assert.ok(!workerSource.includes('async function maybeRefineWorkflowPlanWithLeaderLlm'), 'worker.js must not keep leader LLM plan refinement implementation');
  assert.ok(!workerSource.includes('function workflowPlannedTasksFromOrderBody'), 'worker.js must not keep retry planned-task extraction implementation');
  assert.ok(!workerSource.includes('function buildWorkflowEstimate'), 'worker.js must not keep workflow estimate assembly implementation');
  assert.ok(!workerSource.includes('function buildWorkflowParentJob'), 'worker.js must not keep workflow parent job assembly implementation');
  assert.ok(!workerSource.includes('function compactRetryReuseArtifactsForJobStorage'), 'worker.js must not keep retry reuse artifact storage compaction implementation');
  assert.ok(!workerSource.includes('function normalizeOrderStrategy'), 'worker.js must not keep order strategy normalization implementation');
  assert.ok(!workerSource.includes('function resolveOrderStrategy'), 'worker.js must not keep single/multi/auto routing policy implementation');
  assert.ok(!workerSource.includes('function orderStrategyWithFollowupContext'), 'worker.js must not keep follow-up order strategy context implementation');
  assert.ok(!workerSource.includes('function orderBodyWithLeaderFollowupSpecialistRouting'), 'worker.js must not keep leader follow-up specialist routing implementation');
  assert.ok(!workerSource.includes('function requestedFollowupJobIdFromCreateBody'), 'worker.js must not keep follow-up job id parsing implementation');
  assert.ok(!workerSource.includes('function isTerminalJobStatus'), 'worker.js must not keep job terminal status policy implementation');
  assert.ok(!workerSource.includes('function canTransitionJob'), 'worker.js must not keep job transition policy implementation');
  assert.ok(!workerSource.includes('function maxDispatchRetriesForJob'), 'worker.js must not keep dispatch retry policy implementation');
  assert.ok(!workerSource.includes('function dispatchExecutionIsFresh'), 'worker.js must not keep dispatch in-progress freshness policy implementation');
  assert.ok(!workerSource.includes('function workflowDispatchMaxAgeMs'), 'worker.js must not keep workflow dispatch age policy implementation');
  assert.ok(!workerSource.includes('function workflowLeaderControlTask'), 'worker.js must not keep workflow leader control retry classification implementation');
  assert.ok(!workerSource.includes('function workflowChildDispatchFailureRequiresRestart'), 'worker.js must not keep workflow child restart policy implementation');
  assert.ok(!workerSource.includes('function workflowRestartRequiredReason'), 'worker.js must not keep workflow restart reason policy implementation');
  assert.ok(!workerSource.includes('function buildDispatchPayload'), 'worker.js must not keep endpoint dispatch payload contract implementation');
  assert.ok(!workerSource.includes('function compactWorkflowInputForEndpointDispatch'), 'worker.js must not keep endpoint workflow input compaction implementation');
  assert.ok(!workerSource.includes('function compactWorkflowAppContextsForDispatch'), 'worker.js must not keep endpoint app context compaction implementation');
  assert.ok(!workerSource.includes('function buildDispatchHeaders'), 'worker.js must not keep endpoint manifest auth header implementation');
  assert.ok(!workerSource.includes('function identityLoginsForCurrent'), 'worker.js must not keep request identity login shaping implementation');
  assert.ok(!workerSource.includes('function secretEquals'), 'worker.js must not keep timing-safe secret comparison implementation');
  assert.ok(!workerSource.includes('function authorizeAgentOwnerAction'), 'worker.js must not keep agent owner authorization implementation');
  assert.ok(!workerSource.includes('function authorizeConnectedAgentAction'), 'worker.js must not keep connected agent authorization implementation');
  assert.ok(!workerSource.includes('function visibleJobsForRequest'), 'worker.js must not keep job visibility shaping implementation');
  assert.ok(!workerSource.includes('function visibleDeliveryItemsForRequestFast'), 'worker.js must not keep delivery item visibility shaping implementation');
  assert.ok(!workerSource.includes('function canViewJobFromRequest'), 'worker.js must not keep job read authorization implementation');
  assert.ok(!workerSource.includes('function runtimeStorage'), 'worker.js must not keep runtime storage creation implementation');
  assert.ok(!workerSource.includes('function shouldInjectQaOrderCreateFault'), 'worker.js must not keep QA order-create fault policy implementation');
  assert.ok(!workerSource.includes('async function fetchJson'), 'worker.js must not keep shared JSON fetch implementation');
  assert.ok(!workerSource.includes('function githubClientId'), 'worker.js must not keep GitHub OAuth client id env parser implementation');
  assert.ok(!workerSource.includes('function stripeConnectedAccountIdentityStatus'), 'worker.js must not keep Stripe connected account identity status implementation');
  assert.ok(!workerSource.includes('function stripeConnectedAccountPatch'), 'worker.js must not keep Stripe connected account state patch implementation');
  assert.ok(guestTrialSource.includes('export async function prepareGuestTrialOrderContext'), 'guest trial order preparation should be owned by lib/guest-trial.js');
  assert.ok(guestTrialSource.includes('export async function handleGuestTrialClaim'), 'guest trial claim route should be owned by lib/guest-trial.js');
  assert.ok(guestTrialSource.includes('guest_trial_disabled'), 'guest trial disabled policy should stay with guest trial helper.');
  assert.ok(guestTrialSource.includes('Login required. Guest trial ordering is disabled.'), 'guest trial order disabled policy should stay with guest trial helper.');
  assert.ok(!workerSource.includes('function guestTrialCurrentContext'), 'worker.js must not keep guest trial current context implementation');
  assert.ok(!workerSource.includes('function guestTrialVisitorIdFromRequest'), 'worker.js must not keep guest trial visitor id parser implementation');
  assert.ok(!workerSource.includes('function annotateGuestTrialOrderBody'), 'worker.js must not keep guest trial order body annotation implementation');
  assert.ok(!workerSource.includes('async function prepareGuestTrialOrderContext'), 'worker.js must not keep guest trial order preparation implementation');
  assert.ok(!workerSource.includes('async function handleGuestTrialClaim'), 'worker.js must not keep guest trial claim route implementation');
  assert.ok(!workerSource.includes('async function makeSessionCookie'), 'worker.js must not keep session cookie implementation');
  assert.ok(!workerSource.includes('async function consumeOAuthState'), 'worker.js must not keep OAuth state cookie implementation');
  assert.ok(authContextSource.includes('async function currentUserContext'), 'current requester session context should be owned outside worker.js');
  assert.ok(authContextSource.includes('async function currentOrderRequesterContext'), 'order requester context should be owned outside worker.js');
  assert.ok(authContextSource.includes('async function enforceBrowserWriteProtection'), 'browser CSRF/write protection should be owned outside worker.js');
  assert.ok(!workerSource.includes('async function currentUserContext'), 'worker.js must not keep current user context implementation');
  assert.ok(!workerSource.includes('async function currentOrderRequesterContext'), 'worker.js must not keep order requester context implementation');
  assert.ok(!workerSource.includes('async function enforceBrowserWriteProtection'), 'worker.js must not keep browser write protection implementation');
  assert.ok(analyticsRoutesSource.includes('async function recordAnalyticsEvent'), 'analytics event route should be owned by lib/routes/analytics.js');
  assert.ok(analyticsRoutesSource.includes('createConversionEventPayload'), 'analytics route should preserve conversion event payload validation.');
  assert.ok(analyticsRoutesSource.includes("touchEvent(storage, 'TRACK'"), 'analytics route should preserve TRACK event persistence.');
  assert.ok(!workerSource.includes('async function recordAnalyticsEvent'), 'worker.js must not keep analytics event route implementation');
  assert.ok(agentRegistrationRoutesSource.includes('async function handleRegisterAgent'), 'agent register route should be owned by lib/routes/agent-registration.js');
  assert.ok(agentRegistrationRoutesSource.includes('async function handleImportManifest'), 'agent manifest import route should be owned by lib/routes/agent-registration.js');
  assert.ok(agentRegistrationRoutesSource.includes('async function handleImportUrl'), 'agent URL import route should be owned by lib/routes/agent-registration.js');
  assert.ok(agentRegistrationRoutesSource.includes('agentRoutingConfirmationAccepted'), 'agent registration routes should preserve routing confirmation before catalog insertion.');
  assert.ok(agentRegistrationRoutesSource.includes('assessAgentRegistrationSafety'), 'agent registration routes should preserve safety assessment.');
  assert.ok(agentRegistrationRoutesSource.includes('runAgentReviewForRequest'), 'agent registration routes should preserve agent review before catalog insertion.');
  assert.ok(marketplaceRegistrationSource.includes('function createAgentFromInput'), 'agent record creation should be owned by lib/marketplace-registration.js');
  assert.ok(marketplaceRegistrationSource.includes('function createAgentFromManifest'), 'manifest-to-agent creation should be owned by lib/marketplace-registration.js');
  assert.ok(marketplaceRegistrationSource.includes('function agentSafetyOptionsForRequest'), 'agent registration safety options should be owned by lib/marketplace-registration.js');
  assert.ok(marketplaceRegistrationSource.includes('async function runAgentReviewForRequest'), 'agent auto-review helper should be owned by lib/marketplace-registration.js');
  assert.ok(marketplaceRegistrationSource.includes('async function recordOrderApiKeyUsage'), 'order API key usage helper should be owned by lib/marketplace-registration.js');
  assert.ok(pricingInputSource.includes('export function providerMarkupRateFromInput'), 'provider markup input normalization should be owned by lib/pricing-input.js');
  assert.ok(pricingInputSource.includes('export function pricingModelFromInput'), 'pricing model input normalization should be owned by lib/pricing-input.js');
  assert.ok(pricingInputSource.includes('export function nonNegativeUsdFromInput'), 'USD amount input normalization should be owned by lib/pricing-input.js');
  assert.ok(pricingInputSource.includes('export function overageModeFromInput'), 'overage mode input normalization should be owned by lib/pricing-input.js');
  assert.ok(pricingInputSource.includes('export const MAX_PROVIDER_MARKUP_RATE'), 'provider markup bound should be owned by lib/pricing-input.js');
  assert.ok(!workerSource.includes('async function handleRegisterAgent'), 'worker.js must not keep agent register route implementation');
  assert.ok(!workerSource.includes('async function handleImportManifest'), 'worker.js must not keep agent manifest import route implementation');
  assert.ok(!workerSource.includes('async function handleImportUrl'), 'worker.js must not keep agent URL import route implementation');
  assert.ok(!workerSource.includes('function createAgentFromInput'), 'worker.js must not keep agent record creation implementation');
  assert.ok(!workerSource.includes('function createAgentFromManifest'), 'worker.js must not keep manifest-to-agent creation implementation');
  assert.ok(!workerSource.includes('function agentSafetyOptionsForRequest'), 'worker.js must not keep agent registration safety options implementation');
  assert.ok(!workerSource.includes('async function runAgentReviewForRequest'), 'worker.js must not keep agent auto-review helper implementation');
  assert.ok(!workerSource.includes('async function recordOrderApiKeyUsage'), 'worker.js must not keep order API key usage helper implementation');
  assert.ok(!workerSource.includes('function providerMarkupRateFromInput'), 'worker.js must not keep provider markup input normalization implementation');
  assert.ok(!workerSource.includes('function pricingModelFromInput'), 'worker.js must not keep pricing model input normalization implementation');
  assert.ok(!workerSource.includes('function nonNegativeUsdFromInput'), 'worker.js must not keep USD amount input normalization implementation');
  assert.ok(!workerSource.includes('function overageModeFromInput'), 'worker.js must not keep overage mode input normalization implementation');
  assert.ok(agentManagementRoutesSource.includes('async function handleDeleteAgent'), 'agent delete route should be owned by lib/routes/agent-management.js');
  assert.ok(agentManagementRoutesSource.includes('async function handleUpdateAgentPricing'), 'agent pricing route should be owned by lib/routes/agent-management.js');
  assert.ok(agentManagementRoutesSource.includes('async function handleReviewAgent'), 'agent review route should be owned by lib/routes/agent-management.js');
  assert.ok(agentManagementRoutesSource.includes('async function handleVerifyAgent'), 'agent verify route should be owned by lib/routes/agent-management.js');
  assert.ok(agentManagementRoutesSource.includes('async function handleAgentOnboardingCheck'), 'agent onboarding route should be owned by lib/routes/agent-management.js');
  assert.ok(agentManagementRoutesSource.includes('maybeGrantWelcomeCreditsForVerifiedAgentInState'), 'agent management verify route should preserve welcome-credit grant behavior.');
  assert.ok(agentManagementRoutesSource.includes('provider_markup_rate must be a number between 0 and 1'), 'agent management pricing route should preserve provider markup bounds.');
  assert.ok(!workerSource.includes('async function handleDeleteAgent'), 'worker.js must not keep agent delete route implementation');
  assert.ok(!workerSource.includes('async function handleUpdateAgentPricing'), 'worker.js must not keep agent pricing route implementation');
  assert.ok(!workerSource.includes('async function handleReviewAgent'), 'worker.js must not keep agent review route implementation');
  assert.ok(!workerSource.includes('async function handleVerifyAgent'), 'worker.js must not keep agent verify route implementation');
  assert.ok(!workerSource.includes('async function handleAgentOnboardingCheck'), 'worker.js must not keep agent onboarding route implementation');
  assert.ok(agentExecutionRoutesSource.includes('async function handleClaimJob'), 'agent claim route should be owned by lib/routes/agent-execution.js');
  assert.ok(agentExecutionRoutesSource.includes('async function handleSubmitResult'), 'agent result route should be owned by lib/routes/agent-execution.js');
  assert.ok(agentExecutionRoutesSource.includes('async function handleAgentCallback'), 'agent callback route should be owned by lib/routes/agent-execution.js');
  assert.ok(agentExecutionRoutesSource.includes('completeJobFromAgentResult'), 'agent execution routes should preserve agent-provided result completion.');
  assert.ok(agentExecutionRoutesSource.includes('recordBillingOutcome'), 'agent execution routes should preserve billing outcome recording after successful results.');
  assert.ok(agentExecutionRoutesSource.includes('secretEquals'), 'agent callback route should preserve callback token verification.');
  assert.ok(!workerSource.includes('async function handleClaimJob'), 'worker.js must not keep agent claim route implementation');
  assert.ok(!workerSource.includes('async function handleSubmitResult'), 'worker.js must not keep agent result route implementation');
  assert.ok(!workerSource.includes('async function handleAgentCallback'), 'worker.js must not keep agent callback route implementation');
  assert.ok(appRoutesSource.includes('async function handleRegisterApp'), 'app register route should be owned by lib/routes/apps.js');
  assert.ok(appRoutesSource.includes('async function handleImportAppManifest'), 'app manifest import route should be owned by lib/routes/apps.js');
  assert.ok(appRoutesSource.includes('async function handleImportAppUrl'), 'app URL import route should be owned by lib/routes/apps.js');
  assert.ok(appRoutesSource.includes('async function handleAppHandoff'), 'app handoff route should be owned by lib/routes/apps.js');
  assert.ok(appRoutesSource.includes('async function handleCreateAppContext'), 'app context create route should be owned by lib/routes/apps.js');
  assert.ok(appRoutesSource.includes('async function handlePublisherContextIngest'), 'Publisher context ingest route should be owned by lib/routes/apps.js');
  assert.ok(appRoutesSource.includes('async function handleVerifyApp'), 'app verification route should be owned by lib/routes/apps.js');
  assert.ok(appRoutesSource.includes('async function handleDeleteApp'), 'app delete route should be owned by lib/routes/apps.js');
  assert.ok(appRoutesSource.includes('shapePublisherContextWithOpenAi'), 'Publisher context route should preserve OpenAI context shaping dependency.');
  assert.ok(!workerSource.includes('async function handleRegisterApp'), 'worker.js must not keep app register route implementation');
  assert.ok(!workerSource.includes('async function handleImportAppManifest'), 'worker.js must not keep app manifest import route implementation');
  assert.ok(!workerSource.includes('async function handleImportAppUrl'), 'worker.js must not keep app URL import route implementation');
  assert.ok(!workerSource.includes('async function handleAppHandoff'), 'worker.js must not keep app handoff route implementation');
  assert.ok(!workerSource.includes('async function handleCreateAppContext'), 'worker.js must not keep app context create route implementation');
  assert.ok(!workerSource.includes('async function handlePublisherContextIngest'), 'worker.js must not keep Publisher context ingest route implementation');
  assert.ok(!workerSource.includes('async function handleVerifyApp'), 'worker.js must not keep app verification route implementation');
  assert.ok(!workerSource.includes('async function handleDeleteApp'), 'worker.js must not keep app delete route implementation');
  assert.ok(githubAppAccessSource.includes('async function githubAppRepoTokenForRequester'), 'GitHub App repo access helpers should be owned outside worker.js');
  assert.ok(githubAppAccessSource.includes('async function persistGithubAppAccess'), 'GitHub App access persistence should be owned outside worker.js');
  assert.ok(!workerSource.includes('async function githubAppRepoTokenForRequester'), 'worker.js must not keep GitHub App repo token helper implementation');
  assert.ok(!workerSource.includes('async function persistGithubAppAccess'), 'worker.js must not keep GitHub App access persistence implementation');
  assert.ok(githubAppConfigSource.includes('export function githubAppRecommendedSettings'), 'GitHub App setup recommendation should be owned by lib/github-app-config.js');
  assert.ok(githubAppConfigSource.includes('export async function githubAppInstallationToken'), 'GitHub App installation token helper should be owned by lib/github-app-config.js');
  assert.ok(githubAppConfigSource.includes('export async function githubAppUserTokenFromCode'), 'GitHub App user token exchange should be owned by lib/github-app-config.js');
  assert.ok(!workerSource.includes('function githubAppRecommendedSettings'), 'worker.js must not keep GitHub App setup recommendation implementation');
  assert.ok(!workerSource.includes('async function githubAppInstallationToken'), 'worker.js must not keep GitHub App installation token implementation');
  assert.ok(!workerSource.includes('async function githubAppUserTokenFromCode'), 'worker.js must not keep GitHub App user token exchange implementation');
  assert.ok(authorityRequestsSource.includes('export function normalizeAuthorityRequest'), 'authority request normalization should be owned by lib/authority-requests.js');
  assert.ok(authorityRequestsSource.includes('export function sanitizeExecutorStatePatch'), 'executor state patch sanitization should be owned by lib/authority-requests.js');
  assert.ok(authorityRequestsSource.includes('export function clearJobAuthorityRequest'), 'authority request cleanup should be owned by lib/authority-requests.js');
  assert.ok(!workerSource.includes('function normalizeAuthorityRequest'), 'worker.js must not keep authority request normalization implementation');
  assert.ok(!workerSource.includes('function sanitizeExecutorStatePatch'), 'worker.js must not keep executor state patch sanitization implementation');
  assert.ok(!workerSource.includes('function clearJobAuthorityRequest'), 'worker.js must not keep authority request cleanup implementation');
  assert.ok(githubIntegrationSource.includes('export async function fetchGithubManifestCandidate'), 'GitHub manifest candidate fetch should be owned by lib/github-integration.js');
  assert.ok(githubIntegrationSource.includes('export async function loadManifestFromUrl'), 'agent manifest URL loading should be owned by lib/github-integration.js');
  assert.ok(githubIntegrationSource.includes('export function githubPermissionError'), 'GitHub permission error shaping should be owned by lib/github-integration.js');
  assert.ok(!workerSource.includes('async function fetchGithubManifestCandidate'), 'worker.js must not keep GitHub manifest candidate fetch implementation');
  assert.ok(!workerSource.includes('async function loadManifestFromUrl'), 'worker.js must not keep agent manifest URL loading implementation');
  assert.ok(!workerSource.includes('function githubPermissionError'), 'worker.js must not keep GitHub permission error shaping implementation');
  assert.ok(operatorAccessSource.includes('function canViewAdminDashboard'), 'admin dashboard access should be owned by lib/operator-access.js');
  assert.ok(operatorAccessSource.includes('function orderUiLabelsFromAppSettings'), 'work UI label mapping should be owned by lib/operator-access.js');
  assert.ok(operatorAccessSource.includes('function canUseProductionDebugRoute'), 'production debug route access should be owned by lib/operator-access.js');
  assert.ok(operatorAccessSource.includes('export function runtimePolicy'), 'runtime release/write policy should be owned by lib/operator-access.js');
  assert.ok(operatorAccessSource.includes('export function platformAdminLogins'), 'platform admin login resolution should be owned by lib/operator-access.js');
  assert.ok(!workerSource.includes('function canViewAdminDashboard'), 'worker.js must not keep admin dashboard access helper implementation');
  assert.ok(!workerSource.includes('function orderUiLabelsFromAppSettings'), 'worker.js must not keep work UI label mapping implementation');
  assert.ok(!workerSource.includes('function canUseProductionDebugRoute'), 'worker.js must not keep production debug route access helper implementation');
  assert.ok(!workerSource.includes('function runtimePolicy'), 'worker.js must not keep runtime release/write policy implementation');
  assert.ok(!workerSource.includes('function platformAdminLogins'), 'worker.js must not keep platform admin login resolution implementation');
  assert.ok(authHelpersSource.includes('function normalizeLocalRedirectPath'), 'login redirect normalization should be owned outside worker.js');
  assert.ok(authHelpersSource.includes('async function handleLoginPageRequest'), 'login page gate should be owned outside worker.js');
  assert.ok(!workerSource.includes('function normalizeLocalRedirectPath'), 'worker.js must not keep login redirect normalization implementation');
  assert.ok(!workerSource.includes('async function handleLoginPageRequest'), 'worker.js must not keep login page gate implementation');
  assert.ok(authRoutesSource.includes('async function handleGoogleAuthStart'), 'OAuth route handlers should be owned by lib/routes/auth.js');
  assert.ok(authRoutesSource.includes('async function handleAuthCallback'), 'GitHub OAuth callbacks should be owned by lib/routes/auth.js');
  assert.ok(authRoutesSource.includes('async function handleE2eAuthVerify'), 'E2E auth verification should be owned by lib/routes/auth.js');
  assert.ok(authRoutesSource.includes('function e2eAuthSecret'), 'E2E auth secret helper should be owned by lib/routes/auth.js');
  assert.ok(authStatusRoutesSource.includes('async function authStatus'), 'auth status payload should be owned by lib/routes/auth-status.js');
  assert.ok(authStatusRoutesSource.includes('async function chatMemoryAuthStatus'), 'chat memory auth payload should be owned by lib/routes/auth-status.js');
  assert.ok(!workerSource.includes('async function handleGoogleAuthStart'), 'worker.js must not keep Google OAuth route implementation');
  assert.ok(!workerSource.includes('async function handleAuthCallback'), 'worker.js must not keep GitHub OAuth callback implementation');
  assert.ok(!workerSource.includes('async function handleE2eAuthVerify'), 'worker.js must not keep E2E auth route implementation');
  assert.ok(!workerSource.includes('function e2eAuthSecret'), 'worker.js must not keep E2E auth secret helper implementation');
  assert.ok(!workerSource.includes('async function authStatus'), 'worker.js must not keep auth status payload implementation');
  assert.ok(!workerSource.includes('async function chatMemoryAuthStatus'), 'worker.js must not keep chat memory auth payload implementation');
  assert.ok(adminDashboardRoutesSource.includes('async function handleAdminDashboardApi'), 'admin dashboard API should be owned by lib/routes/admin-dashboard.js');
  assert.ok(adminDashboardRoutesSource.includes('function adminDashboardAuthPayload'), 'admin dashboard auth payload should be owned by admin dashboard routes.');
  assert.ok(adminDashboardRoutesSource.includes('SELECT COUNT(*) AS count FROM accounts'), 'admin dashboard route should preserve D1 account summary query.');
  assert.ok(adminDashboardRoutesSource.includes('SELECT id,parent_agent_id,task_type,status'), 'admin dashboard route should preserve recent order query.');
  assert.ok(!workerSource.includes('async function handleAdminDashboardApi'), 'worker.js must not keep admin dashboard API implementation');
  assert.ok(!workerSource.includes('function adminDashboardAuthPayload'), 'worker.js must not keep admin dashboard auth payload implementation');
  assert.ok(!workerSource.includes('function safeParseAdminJson'), 'worker.js must not keep admin dashboard JSON parsing helper');
  assert.ok(appSettingsRoutesSource.includes('export function appSettingsMap'), 'app setting map helper should be owned by lib/routes/app-settings.js');
  assert.ok(appSettingsRoutesSource.includes('export async function lazyAppSettingsMap'), 'lazy app setting loader should be owned by lib/routes/app-settings.js');
  assert.ok(appSettingsRoutesSource.includes('async function getAppSettings'), 'app settings read route should be owned by lib/routes/app-settings.js');
  assert.ok(appSettingsRoutesSource.includes('async function saveAppSetting'), 'app settings save route should be owned by lib/routes/app-settings.js');
  assert.ok(appSettingsRoutesSource.includes('async function deleteAppSetting'), 'app settings delete route should be owned by lib/routes/app-settings.js');
  assert.ok(appSettingsRoutesSource.includes('function sanitizeAppSettingPatch'), 'app setting patch sanitization should be owned by app settings routes.');
  assert.ok(!workerSource.includes('function appSettingsMap'), 'worker.js must not keep app setting map helper implementation');
  assert.ok(!workerSource.includes('async function lazyAppSettingsMap'), 'worker.js must not keep lazy app setting loader implementation');
  assert.ok(!workerSource.includes('async function getAppSettings'), 'worker.js must not keep app settings read route implementation');
  assert.ok(!workerSource.includes('async function saveAppSetting'), 'worker.js must not keep app settings save route implementation');
  assert.ok(!workerSource.includes('async function deleteAppSetting'), 'worker.js must not keep app settings delete route implementation');
  assert.ok(!workerSource.includes('function sanitizeAppSettingPatch'), 'worker.js must not keep app setting patch sanitizer implementation');
  assert.ok(apiKeyRoutesSource.includes('async function listOrderApiKeys'), 'CAIt API key listing route should be owned by lib/routes/api-keys.js');
  assert.ok(apiKeyRoutesSource.includes('async function createOrderApiKey'), 'CAIt API key creation route should be owned by lib/routes/api-keys.js');
  assert.ok(apiKeyRoutesSource.includes('async function createAdminOrderApiKey'), 'admin CAIt API key creation route should be owned by lib/routes/api-keys.js');
  assert.ok(apiKeyRoutesSource.includes('async function revokeOrderApiKey'), 'CAIt API key revoke route should be owned by lib/routes/api-keys.js');
  assert.ok(apiKeyRoutesSource.includes('developerApiDisabled'), 'CAIt API key routes should share a developer API disable gate.');
  assert.ok(apiKeyRoutesSource.includes('function configuredCaitAdminApiTokens'), 'admin API token configuration should be owned by API key routes.');
  assert.ok(apiKeyRoutesSource.includes('function sanitizeAdminApiKeyLogin'), 'admin API key target login sanitization should be owned by API key routes.');
  assert.ok(!workerSource.includes('async function listOrderApiKeys'), 'worker.js must not keep CAIt API key listing route implementation');
  assert.ok(!workerSource.includes('async function createOrderApiKey'), 'worker.js must not keep CAIt API key creation route implementation');
  assert.ok(!workerSource.includes('async function createAdminOrderApiKey'), 'worker.js must not keep admin CAIt API key creation route implementation');
  assert.ok(!workerSource.includes('async function revokeOrderApiKey'), 'worker.js must not keep CAIt API key revoke route implementation');
  assert.ok(!workerSource.includes('function configuredCaitAdminApiTokens'), 'worker.js must not keep admin API token configuration implementation');
  assert.ok(!workerSource.includes('function sanitizeAdminApiKeyLogin'), 'worker.js must not keep admin API key login sanitizer implementation');
  assert.ok(campaignRoutesSource.includes('async function campaignsPayload'), 'campaign list route should be owned by lib/routes/campaigns.js');
  assert.ok(campaignRoutesSource.includes('async function createCampaignPayload'), 'campaign create route should be owned by lib/routes/campaigns.js');
  assert.ok(campaignRoutesSource.includes('async function publisherCampaignIngestPayload'), 'Publisher campaign ingest route should be owned by lib/routes/campaigns.js');
  assert.ok(campaignRoutesSource.includes('async function appendCampaignMetricsPayload'), 'campaign metrics append route should be owned by lib/routes/campaigns.js');
  assert.ok(campaignRoutesSource.includes('APPROVED_LEAD_SAAS'), 'approved lead SaaS policy should stay with campaign routes.');
  assert.ok(campaignRoutesSource.includes('APPROVED_ADS_SAAS'), 'approved ads SaaS policy should stay with campaign routes.');
  assert.ok(!workerSource.includes('async function campaignsPayload'), 'worker.js must not keep campaign list route implementation');
  assert.ok(!workerSource.includes('async function createCampaignPayload'), 'worker.js must not keep campaign create route implementation');
  assert.ok(!workerSource.includes('async function publisherCampaignIngestPayload'), 'worker.js must not keep Publisher campaign ingest route implementation');
  assert.ok(!workerSource.includes('function campaignMetricSummary'), 'worker.js must not keep campaign metric summary implementation');
  assert.ok(!workerSource.includes('APPROVED_LEAD_SAAS'), 'worker.js must not keep approved lead SaaS campaign policy');
  assert.ok(!workerSource.includes('APPROVED_ADS_SAAS'), 'worker.js must not keep approved ads SaaS campaign policy');
  assert.ok(jobRoutesSource.includes('async function handleGetJob'), 'job read/progress route should be owned by lib/routes/jobs.js');
  assert.ok(jobRoutesSource.includes('scheduleProgressDispatchesForJobId'), 'job route should preserve progress dispatch scheduling.');
  assert.ok(jobRoutesSource.includes('runWorkflowOrchestrationWatchdog'), 'job route should preserve workflow watchdog recovery during progress polling.');
  assert.ok(!workerSource.includes('async function handleGetJob'), 'worker.js must not keep job read/progress route implementation');
  assert.ok(jobRoutesSource.includes('async function handleRetryDispatch'), 'retry dispatch route should be owned by lib/routes/jobs.js');
  assert.ok(jobRoutesSource.includes('worker-dispatch-retry'), 'retry dispatch route should preserve retry billing settlement source.');
  assert.ok(jobRoutesSource.includes('provider_retry_blocked_saas_handoff'), 'retry dispatch route should preserve SaaS handoff-only completion behavior.');
  assert.ok(!workerSource.includes('async function handleRetryDispatch'), 'worker.js must not keep retry dispatch route implementation');
  assert.ok(devJobRoutesSource.includes('async function handleResolveJob'), 'dev resolve route should be owned by lib/routes/dev-jobs.js');
  assert.ok(devJobRoutesSource.includes('async function handleTimeoutSweep'), 'dev timeout sweep route should be owned by lib/routes/dev-jobs.js');
  assert.ok(devJobRoutesSource.includes('async function handleRecurringSweep'), 'dev recurring sweep route should be owned by lib/routes/dev-jobs.js');
  assert.ok(devJobRoutesSource.includes('async function handleSeed'), 'dev seed route should be owned by lib/routes/dev-jobs.js');
  assert.ok(devJobRoutesSource.includes('worker-dev-resolve-job'), 'dev resolve route should preserve billing settlement source.');
  assert.ok(devJobRoutesSource.includes('runWorkflowTimeoutRetrySweep'), 'dev timeout route should preserve workflow retry sweep.');
  assert.ok(devJobRoutesSource.includes('runRecurringOrderSweep'), 'dev recurring route should preserve recurring sweep handoff.');
  assert.ok(!workerSource.includes('async function handleResolveJob'), 'worker.js must not keep dev resolve route implementation');
  assert.ok(!workerSource.includes('async function handleTimeoutSweep'), 'worker.js must not keep dev timeout sweep route implementation');
  assert.ok(!workerSource.includes('async function handleSeed'), 'worker.js must not keep dev seed route implementation');
  assert.ok(!workerSource.includes("eventSource: 'dev_api'"), 'worker.js must not keep dev timeout sweep implementation details');
  assert.ok(mcpRoutesSource.includes('async function mcpCatalogForPublicRequest'), 'MCP public catalog loader should be owned by lib/routes/mcp.js');
  assert.ok(mcpRoutesSource.includes('function getMcpDiscoveryPayload'), 'MCP discovery route should be owned by lib/routes/mcp.js');
  assert.ok(mcpRoutesSource.includes('async function handleMcpRequest'), 'MCP JSON-RPC route should be owned by lib/routes/mcp.js');
  assert.ok(mcpRoutesSource.includes('mcpDisabledPayload'), 'MCP route should expose a disabled response while the external contract is paused.');
  assert.ok(mcpRoutesSource.includes('runtimePolicy(env).mcpEnabled'), 'MCP route should be gated by runtime policy.');
  assert.ok(mcpRoutesSource.includes('handleMcpJsonRpc'), 'MCP route should preserve JSON-RPC dispatch through lib/mcp.js');
  assert.ok(mcpRoutesSource.includes('storage.listAgents({ limit: 500 })'), 'MCP route should preserve targeted catalog reads.');
  assert.ok(!workerSource.includes('async function mcpCatalogForPublicRequest'), 'worker.js must not keep MCP public catalog loader implementation');
  assert.ok(!workerSource.includes('async function handleMcpRequest'), 'worker.js must not keep MCP JSON-RPC route implementation');
  assert.ok(!workerSource.includes("from './lib/mcp.js'"), 'worker.js must not import MCP protocol internals directly');
  assert.ok(openChatRoutesSource.includes('async function handleOpenChatIntent'), 'open chat intent route should be owned by lib/routes/open-chat.js');
  assert.ok(openChatRoutesSource.includes('promptInjectionGuardForPrompt'), 'open chat intent route should preserve prompt injection guard.');
  assert.ok(openChatRoutesSource.includes('authorizeOpenChatIntentLlm'), 'open chat intent route should preserve LLM authorization.');
  assert.ok(openChatRoutesSource.includes('buildOpenChatRuntimeContextMarkdown'), 'open chat intent route should preserve runtime context assembly.');
  assert.ok(openChatRoutesSource.includes('classifyOpenChatIntent'), 'open chat intent route should preserve LLM classification call.');
  assert.ok(openChatIntentSource.includes('export function createOpenChatIntentSupport'), 'Open Chat intent support should be owned by lib/open-chat-intent.js');
  assert.ok(openChatIntentSource.includes('function openChatIntentLlmConfig'), 'Open Chat LLM configuration should stay with the Open Chat intent support module.');
  assert.ok(openChatIntentSource.includes('async function classifyDeliveryArtifactWithOpenAi'), 'delivery classifier should stay with Open Chat intent support.');
  assert.ok(openChatIntentSource.includes('async function buildIntakeClarificationWithAi'), 'AI leader intake bridge should stay with Open Chat intent support.');
  assert.ok(deliveryRoutesSource.includes('async function prepareDeliveryExecutionRequest'), 'delivery execution preparation should be owned by lib/routes/deliveries.js');
  assert.ok(deliveryRoutesSource.includes('async function prepareDeliveryPublishRequest'), 'delivery publish preparation should be owned by lib/routes/deliveries.js');
  assert.ok(deliveryRoutesSource.includes('async function prepareDeliveryPublishOrderRequest'), 'delivery publish order preparation should be owned by lib/routes/deliveries.js');
  assert.ok(deliveryRoutesSource.includes('async function executeDeliveryActionRequest'), 'delivery execution route should be owned by lib/routes/deliveries.js');
  assert.ok(deliveryRoutesSource.includes('async function scheduleDeliveryActionRequest'), 'delivery scheduling route should be owned by lib/routes/deliveries.js');
  assert.ok(deliveryRoutesSource.includes('async function executeGithubExecutorPullRequest'), 'delivery GitHub executor PR flow should be owned by lib/routes/deliveries.js');
  assert.ok(deliveryRoutesSource.includes('buildReportNextOrderBody'), 'delivery report-next route should preserve shared follow-up order body building.');
  assert.ok(deliveryRoutesSource.includes('confirm_repo_write: true'), 'delivery GitHub PR execution should preserve explicit write confirmation.');
  assert.ok(!workerSource.includes('async function prepareDeliveryExecutionRequest'), 'worker.js must not keep delivery execution preparation implementation');
  assert.ok(!workerSource.includes('async function prepareDeliveryPublishRequest'), 'worker.js must not keep delivery publish preparation implementation');
  assert.ok(!workerSource.includes('async function prepareDeliveryPublishOrderRequest'), 'worker.js must not keep delivery publish order preparation implementation');
  assert.ok(!workerSource.includes('async function executeDeliveryActionRequest'), 'worker.js must not keep delivery execution route implementation');
  assert.ok(!workerSource.includes('async function scheduleDeliveryActionRequest'), 'worker.js must not keep delivery scheduling route implementation');
  assert.ok(!workerSource.includes('async function executeGithubExecutorPullRequest'), 'worker.js must not keep delivery GitHub executor PR implementation');
  assert.ok(!workerSource.includes('function githubExecutorPlanFromRequest'), 'worker.js must not keep GitHub executor PR plan helper');
  assert.ok(workOrderRoutesSource.includes('async function resolveWorkActionRequest'), 'work action resolution route should be owned by lib/routes/work-order.js');
  assert.ok(workOrderRoutesSource.includes('async function resolveWorkIntentRequest'), 'work intent resolution route should be owned by lib/routes/work-order.js');
  assert.ok(workOrderRoutesSource.includes('async function prepareWorkOrderRequest'), 'work order preparation route should be owned by lib/routes/work-order.js');
  assert.ok(workOrderRoutesSource.includes('async function preflightWorkOrderRequest'), 'work order preflight route should be owned by lib/routes/work-order.js');
  assert.ok(workOrderRoutesSource.includes('function applyActiveConversationOwnerLockToOrderBody'), 'active conversation owner lock should stay with work order route handling.');
  assert.ok(workOrderRoutesSource.includes('completedの納品物を見せてください'), 'work order preparation should preserve delivery display as chat guidance.');
  assert.ok(!workerSource.includes('async function resolveWorkActionRequest'), 'worker.js must not keep work action resolution route implementation');
  assert.ok(!workerSource.includes('async function resolveWorkIntentRequest'), 'worker.js must not keep work intent resolution route implementation');
  assert.ok(!workerSource.includes('async function prepareWorkOrderRequest'), 'worker.js must not keep work order preparation route implementation');
  assert.ok(!workerSource.includes('async function preflightWorkOrderRequest'), 'worker.js must not keep work order preflight route implementation');
  assert.ok(!workerSource.includes('function workIntentRouteForAgent'), 'worker.js must not keep work intent agent routing helpers');
  assert.ok(!workerSource.includes('function applyActiveConversationOwnerLockToOrderBody'), 'worker.js must not keep active conversation owner lock implementation');
  assert.ok(!workerSource.includes('async function handleOpenChatIntent'), 'worker.js must not keep open chat intent route implementation');
  assert.ok(!workerSource.includes("source: 'guardrail',\n          ...promptPolicyBlockPayload(promptInjection)"), 'worker.js must not keep open chat prompt-injection response body');
  assert.ok(!workerSource.includes('const OPEN_CHAT_INTENT_SCHEMA'), 'worker.js must not keep Open Chat intent schema implementation');
  assert.ok(!workerSource.includes('function buildOpenChatRuntimeContextMarkdown'), 'worker.js must not keep Open Chat runtime context implementation');
  assert.ok(!workerSource.includes('async function classifyDeliveryArtifactWithOpenAi'), 'worker.js must not keep delivery classifier implementation');
  assert.ok(!workerSource.includes('async function buildIntakeClarificationWithAi'), 'worker.js must not keep AI leader intake bridge implementation');
  assert.ok(recurringOrderRoutesSource.includes('async function handleListRecurringOrders'), 'recurring order list route should be owned by lib/routes/recurring-orders.js');
  assert.ok(recurringOrderRoutesSource.includes('async function handleCreateRecurringOrder'), 'recurring order create route should be owned by lib/routes/recurring-orders.js');
  assert.ok(recurringOrderRoutesSource.includes('async function handleUpdateRecurringOrder'), 'recurring order update route should be owned by lib/routes/recurring-orders.js');
  assert.ok(recurringOrderRoutesSource.includes('async function handleDeleteRecurringOrder'), 'recurring order delete route should be owned by lib/routes/recurring-orders.js');
  assert.ok(recurringOrderRoutesSource.includes('promptInjectionGuardForPrompt'), 'recurring order routes should preserve prompt injection guard.');
  assert.ok(recurringOrderRoutesSource.includes('createRecurringOrderInState'), 'recurring order routes should preserve shared state mutation helpers.');
  assert.ok(!workerSource.includes('async function handleListRecurringOrders'), 'worker.js must not keep recurring order list route implementation');
  assert.ok(!workerSource.includes('async function handleCreateRecurringOrder'), 'worker.js must not keep recurring order create route implementation');
  assert.ok(!workerSource.includes('async function handleUpdateRecurringOrder'), 'worker.js must not keep recurring order update route implementation');
  assert.ok(!workerSource.includes('async function handleDeleteRecurringOrder'), 'worker.js must not keep recurring order delete route implementation');
  assert.ok(providerIdentityRoutesSource.includes('async function submitProviderIdentityVerification'), 'provider identity submission should be owned by lib/routes/provider-identity.js');
  assert.ok(providerIdentityRoutesSource.includes('async function reviewAdminProviderIdentityVerification'), 'provider identity review should be owned by lib/routes/provider-identity.js');
  assert.ok(providerIdentityRoutesSource.includes('export function providerIdentityStatus'), 'provider identity readiness helper should be owned outside worker.js');
  assert.ok(!workerSource.includes('async function submitProviderIdentityVerification'), 'worker.js must not keep provider identity submission implementation');
  assert.ok(!workerSource.includes('async function reviewAdminProviderIdentityVerification'), 'worker.js must not keep provider identity review implementation');
  assert.ok(!workerSource.includes('function sanitizeProviderIdentitySubmission'), 'worker.js must not keep provider identity sanitization implementation');
  assert.ok(chatMemoryRoutesSource.includes('async function chatMemoryPayload'), 'chat memory route should be owned by lib/routes/chat-memory.js');
  assert.ok(chatMemoryRoutesSource.includes('async function d1ChatMemoryTranscriptsForCurrent'), 'D1 chat transcript loading should be owned by chat memory routes.');
  assert.ok(chatMemoryRoutesSource.includes('function chatSessionSnapshotHideIds'), 'chat session hide-id helpers should be owned by chat memory routes.');
  assert.ok(chatMemoryRoutesSource.includes('function mergeChatMemoryWithSessionSnapshots'), 'chat session/memory merging should be owned by chat memory routes.');
  assert.ok(!workerSource.includes('async function chatMemoryPayload'), 'worker.js must not keep chat memory route implementation');
  assert.ok(!workerSource.includes('async function d1ChatMemoryForCurrent'), 'worker.js must not keep D1 chat memory merger implementation');
  assert.ok(!workerSource.includes('async function d1ChatMemoryTranscriptsForCurrent'), 'worker.js must not keep D1 chat transcript loader implementation');
  assert.ok(!workerSource.includes('function chatSessionSnapshotHideIds'), 'worker.js must not keep chat session hide-id helper implementation');
  assert.ok(!workerSource.includes('function mergeChatMemoryWithSessionSnapshots'), 'worker.js must not keep chat memory merge implementation');
  assert.ok(exactActionRoutesSource.includes('async function getExactMatchActions'), 'exact action read route should be owned by lib/routes/exact-actions.js');
  assert.ok(exactActionRoutesSource.includes('async function saveExactMatchAction'), 'exact action save route should be owned by lib/routes/exact-actions.js');
  assert.ok(exactActionRoutesSource.includes('async function deleteExactMatchAction'), 'exact action delete route should be owned by lib/routes/exact-actions.js');
  assert.ok(exactActionRoutesSource.includes('sanitizeExactMatchActionPatch'), 'exact action patch sanitizer should be applied in exact action routes.');
  assert.ok(exactActionRoutesSource.includes('sanitizeExactMatchActionsForClient'), 'exact action client sanitizer should be applied in exact action routes.');
  assert.ok(!workerSource.includes('async function getExactMatchActions'), 'worker.js must not keep exact action read route implementation');
  assert.ok(!workerSource.includes('async function saveExactMatchAction'), 'worker.js must not keep exact action save route implementation');
  assert.ok(!workerSource.includes('async function deleteExactMatchAction'), 'worker.js must not keep exact action delete route implementation');
  assert.ok(!workerSource.includes('sanitizeExactMatchActionPatch(body'), 'worker.js must not keep exact action patch sanitizer call site');
  assert.ok(settingsRoutesSource.includes('async function getSettingsPayload'), 'settings payload route should be owned by lib/routes/settings.js');
  assert.ok(settingsRoutesSource.includes('async function saveSettingsSection'), 'settings section save route should be owned by lib/routes/settings.js');
  assert.ok(settingsRoutesSource.includes('async function deleteCurrentAccount'), 'account deletion route should be owned by lib/routes/settings.js');
  assert.ok(settingsRoutesSource.includes('sanitizeBillingSettingsPatch'), 'billing settings sanitization should be applied in settings routes.');
  assert.ok(settingsRoutesSource.includes('sanitizePayoutSettingsPatch'), 'payout settings sanitization should be applied in settings routes.');
  assert.ok(settingsRoutesSource.includes('sanitizeExecutorPreferencesPatch'), 'executor preference sanitization should be applied in settings routes.');
  assert.ok(settingsRoutesSource.includes("confirmation !== 'DELETE'"), 'account deletion should require explicit typed confirmation.');
  assert.ok(apiRoutesSource.includes("SETTINGS_ACCOUNT: '/api/settings/account'"), 'account deletion API route should be registered centrally.');
  assert.ok(storageSource.includes('async deleteAccountByLogin'), 'account deletion storage mutation should be owned by lib/storage.js');
  assert.ok(storageSource.includes('UPDATE api_keys SET revoked_at'), 'account deletion should revoke order API keys.');
  assert.ok(storageSource.includes("UPDATE chat_sessions SET deleted_at"), 'account deletion should hide account-linked chat sessions.');
  assert.ok(!workerSource.includes('async function getSettingsPayload'), 'worker.js must not keep settings payload route implementation');
  assert.ok(!workerSource.includes('async function saveSettingsSection'), 'worker.js must not keep settings section save route implementation');
  assert.ok(!workerSource.includes('async function deleteCurrentAccount'), 'worker.js must not keep account deletion route implementation');
  assert.ok(!workerSource.includes('sanitizeBillingSettingsPatch(body'), 'worker.js must not keep billing settings patch sanitization implementation');
  assert.ok(!workerSource.includes('sanitizePayoutSettingsPatch(body'), 'worker.js must not keep payout settings patch sanitization implementation');
  assert.ok(!workerSource.includes('sanitizeExecutorPreferencesPatch(body'), 'worker.js must not keep executor preference patch sanitization implementation');
  assert.ok(feedbackChatRoutesSource.includes('async function submitFeedbackReport'), 'feedback submission route should be owned by lib/routes/feedback-chat.js');
  assert.ok(feedbackChatRoutesSource.includes('async function recordChatTranscript'), 'chat transcript capture route should be owned by lib/routes/feedback-chat.js');
  assert.ok(feedbackChatRoutesSource.includes('async function recordChatSessionSnapshot'), 'chat session snapshot route should be owned by lib/routes/feedback-chat.js');
  assert.ok(feedbackChatRoutesSource.includes('async function hideOwnChatMemory'), 'chat memory hide route should be owned by lib/routes/feedback-chat.js');
  assert.ok(feedbackChatRoutesSource.includes('async function listChatTrainingData'), 'chat training export route should be owned by lib/routes/feedback-chat.js');
  assert.ok(feedbackChatRoutesSource.includes('Reviewed Work Chat transcripts only.'), 'chat training export policy should stay with feedback/chat routes.');
  assert.ok(feedbackEmailSource.includes('export async function forwardFeedbackReportEmail'), 'feedback report email delivery should be owned by lib/feedback-email.js');
  assert.ok(feedbackEmailSource.includes('function feedbackEmailAddress'), 'feedback email address normalization should be owned by lib/feedback-email.js');
  assert.ok(feedbackEmailSource.includes("import('cloudflare:email')"), 'Cloudflare email binding import should stay inside feedback email helper.');
  assert.ok(!workerSource.includes('async function submitFeedbackReport'), 'worker.js must not keep feedback submission route implementation');
  assert.ok(!workerSource.includes('async function recordChatTranscript'), 'worker.js must not keep chat transcript capture route implementation');
  assert.ok(!workerSource.includes('async function recordChatSessionSnapshot'), 'worker.js must not keep chat session snapshot route implementation');
  assert.ok(!workerSource.includes('async function hideOwnChatMemory'), 'worker.js must not keep chat memory hide route implementation');
  assert.ok(!workerSource.includes('async function listChatTrainingData'), 'worker.js must not keep chat training export route implementation');
  assert.ok(!workerSource.includes('function sanitizeChatSessionSnapshot'), 'worker.js must not keep chat session snapshot sanitizer implementation');
  assert.ok(!workerSource.includes('function feedbackEmailAddress'), 'worker.js must not keep feedback email address helper implementation');
  assert.ok(!workerSource.includes('async function forwardFeedbackReportEmail'), 'worker.js must not keep feedback report email delivery implementation');
  assert.ok(!workerSource.includes("import('cloudflare:email')"), 'worker.js must not import Cloudflare email directly for feedback delivery');
  assert.equal(existsSync(new URL('../lib/routes/billing.js', import.meta.url)), false, 'Stripe billing routes should be removed after in-app payment removal.');
  assert.equal(existsSync(new URL('../lib/billing-helpers.js', import.meta.url)), false, 'Stripe billing helpers should be removed after in-app payment removal.');
  assert.equal(existsSync(new URL('../lib/billing-sweeps.js', import.meta.url)), false, 'provider monthly billing sweeps should be removed after payout removal.');
  assert.equal(existsSync(new URL('../lib/billing-webhooks.js', import.meta.url)), false, 'Stripe webhook handlers should be removed after in-app payment removal.');
  assert.equal(existsSync(new URL('../lib/stripe.js', import.meta.url)), false, 'Stripe API client should be removed after in-app payment removal.');
  assert.equal(existsSync(new URL('../lib/stripe-connected-account.js', import.meta.url)), false, 'Stripe connected-account helpers should be removed after payout removal.');
  assert.equal(apiRoutesSource.includes('/api/stripe/'), false, 'API route manifest should not expose Stripe routes.');
  assert.equal(apiRoutesSource.includes('/api/settings/billing'), false, 'API route manifest should not expose billing settings routes.');
  assert.equal(apiRoutesSource.includes('/api/settings/payout'), false, 'API route manifest should not expose payout settings routes.');
  assert.equal(workerSource.includes('/api/stripe/'), false, 'worker should not keep Stripe route wiring.');
  assert.ok(!workerSource.includes('async function getStripeStatus'), 'worker.js must not keep Stripe status route implementation');
  assert.equal(new RegExp('pay' + 'jp', 'i').test(workerSource), false, 'worker.js should not retain removed payment-provider route wiring.');
  assert.ok(!workerSource.includes('async function ensureStripeCustomerForCurrent'), 'worker.js must not keep Stripe customer ensure helper implementation');
  assert.ok(!workerSource.includes('async function createStripeSetupSessionForCurrent'), 'worker.js must not keep Stripe setup checkout route implementation');
  assert.ok(!workerSource.includes('async function createStripeSubscriptionSessionForCurrent'), 'worker.js must not keep Stripe subscription checkout route implementation');
  assert.ok(!workerSource.includes('async function createStripeConnectOnboardingForCurrent'), 'worker.js must not keep Stripe Connect onboarding route implementation');
  assert.ok(!workerSource.includes('async function createStripeProviderPayoutForCurrent'), 'worker.js must not keep Stripe provider payout route implementation');
  assert.ok(!workerSource.includes('async function triggerStripeMonthlyInvoiceChargeForCurrent'), 'worker.js must not keep Stripe monthly invoice charge route implementation');
  assert.ok(!workerSource.includes('async function triggerStripeProviderMonthlyChargeForCurrent'), 'worker.js must not keep Stripe provider monthly charge route implementation');
  assert.ok(!workerSource.includes('function stripeStateForClient'), 'worker.js must not keep billing client state helper implementation');
  assert.ok(!workerSource.includes('async function runProviderMonthlyBillingSweep'), 'worker.js must not keep provider monthly billing sweep implementation');
  assert.ok(!workerSource.includes('function providerMonthlyBillingAutoConfig'), 'worker.js must not keep provider monthly billing auto config implementation');
  assert.ok(!workerSource.includes('function buildProviderMonthlyFailureReport'), 'worker.js must not keep provider monthly failure report implementation');
  assert.ok(!workerSource.includes('async function applyStripeWebhookEvent'), 'worker.js must not keep Stripe webhook event application implementation');
  assert.ok(!workerSource.includes('async function handleStripeWebhook'), 'worker.js must not keep Stripe webhook route handler implementation');
  assert.ok(emailNotificationsSource.includes('export function createEmailNotificationHelpers'), 'email notification send flows should be owned by lib/email-notifications.js');
  assert.ok(emailNotificationsSource.includes('async function sendEmailAuthLink'), 'email auth link sender should be owned by lib/email-notifications.js');
  assert.ok(emailNotificationsSource.includes('async function maybeSendSignupWelcomeEmail'), 'signup welcome email sender should be owned by lib/email-notifications.js');
  assert.ok(emailNotificationsSource.includes('export async function sendResendEmail'), 'Resend API helper should be owned by lib/email-notifications.js');
  assert.ok(!workerSource.includes('async function sendEmailAuthLink'), 'worker.js must not keep email auth link sender implementation');
  assert.ok(!workerSource.includes('async function maybeSendSignupWelcomeEmail'), 'worker.js must not keep signup welcome email sender implementation');
  assert.ok(!workerSource.includes('async function sendResendEmail'), 'worker.js must not keep Resend API helper implementation');
  assert.ok(workflowEndpointDispatchSource.includes('function dispatchJobToAssignedAgent'), 'workflow jobs should dispatch through the generic provider endpoint path');
  assert.ok(workflowSourceRequirementsSource.includes('function braveSearchConfiguredForWorkflow'), 'Brave search configuration should stay available for search-required workflow jobs');
  assert.ok(workflowSourceRequirementsSource.includes('workflowJobRequiresSearch(job)'), 'search-required workflow jobs should preserve source-quality gates');
  assert.ok(!workerSource.includes('function workflowSourceCollectionSourcesForDispatch'), 'worker must not synthesize research web_sources; source extraction belongs to the assigned agent.');
  assert.ok(!workerSource.includes('sourceCollectionAttachedBy'), 'worker must not mark agent-specific source collection in dispatch payloads.');
  assert.ok(!workerSource.includes('web_sources: sourceCollectionSources'), 'worker must not inject research web_sources into dispatch payloads.');
  assert.ok(!workerSource.includes('raw_context: workflowSourceRawContextForDispatch(context)'), 'worker dispatch compaction must not carry agent-specific raw source extraction helpers.');
  assert.ok(!workerSource.includes('const searchConsoleDomain = text.match'), 'worker must not normalize Search Console sc-domain values into source URLs.');
  assert.ok(!workerSource.includes('|| braveSearchConfiguredForWorkflow(env)'), 'Brave configuration alone must not force every workflow child through search');
  assert.ok(workflowSourceRequirementsSource.includes('workflow.forceWebSearch === true'), 'search-required workflow jobs must not be completed by deterministic templates');
  assert.ok(workflowEndpointDispatchSource.includes('resolveDispatchEndpointUrl(endpoint, env)'), 'relative sample endpoints should be resolved before generic dispatch');
  assert.ok(runtimeEnvSource.includes('SAMPLE_AGENT_ENDPOINT_BASE_URL'), 'sample agents should become routable through manifest-defined endpoints and the configured endpoint base URL');
  assert.ok(sampleAgentManifestRoutesSource.includes('function sampleAgentManifestRoute'), 'sample agent manifests should expose a normal HTTP endpoint contract');
  assert.ok(sampleAgentManifestRoutesSource.includes('async function handleSampleAgentManifestRequest'), 'sample agent manifest proxy should be owned by lib/routes/sample-agent-manifest.js');
  assert.ok(!workerSource.includes('function sampleAgentManifestRoute'), 'worker.js must not keep sample agent manifest route matcher implementation');
  assert.ok(!workerSource.includes('async function handleSampleAgentManifestRequest'), 'worker.js must not keep sample agent manifest proxy implementation');
  assert.ok(deliveryCompletionGateSource.includes('deliveryCompletionEvidenceScoreForJob'), 'completion evidence scoring should be owned by delivery-completion-gate.js, not shared leader evaluation state');
  assert.ok(!workerSource.includes('deliveryQualityScoreForJob'), 'worker must not use leader-like delivery quality scoring names for orchestration completion gates');
  assert.ok(!workerSource.includes('deliveryQuality ='), 'worker must not persist deliveryQuality evaluation metadata from orchestration paths');
  assert.ok(catalogRoutesSource.includes('async function agentCatalogIndexPayload'), 'agent catalog index endpoint should be owned by lib/routes/catalog.js');
  assert.ok(catalogRoutesSource.includes('leaderReadableAgentCatalogIndex'), 'catalog route should preserve leader-readable candidate catalog generation.');
  assert.ok(catalogRoutesSource.includes('export function catalogPagePayload'), 'shared catalog pagination helper should be owned by lib/routes/catalog.js');
  assert.ok(!workerSource.includes('function catalogPagePayload'), 'worker.js must not keep catalog pagination helper implementation');
  assert.ok(!workerSource.includes('async function agentsCatalogPayload'), 'worker.js must not keep agent catalog route implementation');
  assert.ok(!workerSource.includes('async function agentCatalogIndexPayload'), 'worker.js must not keep agent catalog index route implementation');
  assert.ok(!workerSource.includes('async function appsCatalogPayload'), 'worker.js must not keep app catalog route implementation');
  assert.ok(workflowPlanAssemblySource.includes('agent_manifest_catalog'), 'leader planner should receive the combined internal/external manifest candidate catalog');
  assert.ok(sampleAgentManifestRoutesSource.includes('sample-agents'), 'sample provider endpoint path should be outside internal API route handling');
  assert.ok(workerSource.includes("from './lib/orchestration.js'"), 'workflow routing should use the shared orchestration module');
  assert.ok(workflowLayeringSource.includes('leaderTaskLayer(primary, task)'), 'leader layer routing should not be hardcoded inside worker.js');
  assert.ok(workflowHandoffContextSource.includes('WORKFLOW HANDOFF CONTEXT'), 'workflow handoff must remain available as prompt context');
  assert.ok(workflowHandoffContextSource.includes('WORKFLOW ADDITIONAL PROMPT'), 'workflow handoff should be separated into additional_prompt context');
  assert.ok(workerSource.includes('validateXPostExecutionApproval'), 'X posting must validate OAuth account and exact text approval server-side');
  assert.ok(jobAuthorityRoutesSource.includes('async function handleApproveJobAuthority'), 'approval cards must call a server endpoint that records approval and resumes workflow jobs.');
  assert.ok(jobAuthorityRoutesSource.includes('async function updateJobExecutorState'), 'executor-state patch route should be owned by lib/routes/job-authority.js.');
  assert.ok(!workerSource.includes('async function handleApproveJobAuthority'), 'worker.js must not keep approval resume route implementation');
  assert.ok(!workerSource.includes('async function updateJobExecutorState'), 'worker.js must not keep executor-state patch route implementation');
  assert.ok(workerRoutingSource.includes("action === 'approve'"), 'job approval resume endpoint must be routed separately from status checks.');
  assert.ok(jobAuthorityRoutesSource.includes("code: 'leader_quality_gate_failed'"), 'approval endpoint must reject leader quality-gate blockers instead of pretending approval can resume them.');
  assert.ok(!workerSource.includes('function synthesizeAuthorityRequestFromDelivery'), 'worker must not infer approval requests from agent delivery text.');
  assert.ok(!workerSource.includes('delivery_text_inference'), 'worker must not create authority_request records from text inference.');
  assert.ok(!workerSource.includes('agent_manifest_connector_contract'), 'worker must not convert manifest connector declarations into approval requests.');
  assert.ok(deliveryActionContractSource.includes('approved_x_username'), 'Delivery execution requests must carry the approved OAuth account handle');
  assert.ok(deliveryActionContractSource.includes('approved_text'), 'Delivery execution requests must carry the exact approved post text');
  assert.ok(endpointDispatchContractSource.includes('additional_prompt: additionalPrompt'), 'dispatch payload should send workflow context as additional_prompt');
  assert.ok(endpointDispatchContractSource.includes('full_prompt: fullPrompt'), 'dispatch payload should include a compatibility full_prompt for agent runners');
  assert.ok(orderCreateRoutesSource.includes('orderBodyWithCommonQualityRules(body)') || (orderCreateSingleRoutesSource.includes('orderBodyWithCommonQualityRules(body)') && orderCreateWorkflowRoutesSource.includes('orderBodyWithCommonQualityRules(body)')), 'all order creation paths should attach common quality rules before persistence');
  assert.ok(endpointDispatchContractSource.includes('quality_rules:'), 'dispatch payload should expose common quality rules as structured data');
  assert.ok(orchestrationSource.includes('DOWNSTREAM_HANDOFF_SUMMARY_CONTRACT_VERSION'), 'downstream handoff summary contract should be owned by orchestration.js');
  assert.ok(endpointDispatchContractSource.includes('downstream_handoff_summary_contract'), 'external dispatch payload should expose the downstream handoff summary contract');
  assert.ok(endpointDispatchContractSource.includes('downstream_handoff_summary'), 'external dispatch quality rules should request a compact downstream handoff summary');
  assert.ok(!workerSource.includes('commonOrderQualityRulesText(),'), 'dispatch prompt should not inject generic common quality rule prose into downstream agents');
  assert.ok(
    workflowHandoffContextSource.includes('content_available:'),
    'handoff prompt context should reference prior delivery files without injecting raw markdown'
  );
  assert.ok(workflowLeaderHandoffSource.includes('workflow-handoff/v2'), 'workflow handoff should carry an explicit versioned handoff contract');
  assert.ok(workflowLeaderHandoffSource.includes("handoffOwner: 'leader'"), 'workflow handoff should be explicitly owned by the leader, not orchestration.');
  assert.ok(workflowHandoffContextSource.includes('leader remains handoff owner'), 'downstream handoff prompt should state that orchestration only preserves durable state while the leader owns handoff.');
  assert.ok(workerSource.includes('workflow-execution-program/v1') || workflowLeaderHandoffSource.includes('workflow-execution-program/v1') || workflowQualitySource.includes('workflow-execution-program/v1') || workflowQualityHandoffSource.includes('workflow-execution-program/v1'), 'workflow handoff should carry explicit programmatic process state');
  assert.ok(workflowHandoffContextSource.includes('USER-FACING PRIOR DELIVERABLES (primary reference material)'), 'downstream prompts should mark prior user-facing deliverables as the primary reference material');
  assert.ok(workerSource.includes('prior_layer_unavailable') || workflowLeaderSequenceSource.includes('prior_layer_unavailable') || workflowQualitySource.includes('prior_layer_unavailable'), 'workflow dispatch should block downstream layers when a prior data/research layer fails or times out.');
  assert.ok(workflowHandoffContextSource.includes('Treat this as a blocker for quality'), 'workflow handoff prompt should not tell downstream agents to proceed from unavailable prior work.');
  assert.ok(workflowReconcileActionsSource.includes('function completeWorkflowSaasHandoffOnlyChild'), 'workflow SaaS handoff-only completion actions should be owned outside worker.js');
  assert.ok(workflowReconcileActionsSource.includes('function blockWorkflowPendingChildren'), 'workflow child blocking actions should be owned outside worker.js');
  assert.ok(!workerSource.includes('function completeWorkflowSaasHandoffOnlyChild'), 'worker.js must not keep low-level SaaS handoff-only action implementation');
  assert.ok(!workerSource.includes('function blockWorkflowPendingChildren'), 'worker.js must not keep low-level workflow blocking implementation');
  assert.ok(workflowLeaderSequenceRepairSource.includes('function rebuildMissingLeaderSequenceChildJobs'), 'leader sequence repair should be owned outside worker.js');
  assert.ok(!workerSource.includes('function rebuildMissingLeaderSequenceChildJobs'), 'worker.js must not keep leader sequence repair implementation');
  assert.ok(workflowParentReconcileSource.includes('async function reconcileWorkflowParent'), 'workflow parent reconciliation should be owned outside worker.js');
  assert.ok(workflowParentReconcileSource.includes('async function refreshWorkflowLeaderHandoffForJobId') || workflowLeaderHandoffRefreshSource.includes('async function refreshWorkflowLeaderHandoffForJobId'), 'workflow leader handoff refresh should be owned outside worker.js');
  assert.ok(workflowParentReconcileSource.includes('completeWorkflowSaasHandoffOnlyChildren'), 'workflow parent reconciliation should preserve SaaS handoff-only child completion.');
  assert.ok(!workerSource.includes('async function reconcileWorkflowParent'), 'worker.js must not keep workflow parent reconciliation implementation');
  assert.ok(!workerSource.includes('async function refreshWorkflowLeaderHandoffForJobId'), 'worker.js must not keep workflow leader handoff refresh implementation');
  assert.ok(workflowAdaptiveActivationSource.includes('function activateWorkflowAdaptivePendingChildren'), 'adaptive child activation should be owned outside worker.js');
  assert.ok(!workerSource.includes('function activateWorkflowAdaptivePendingChildren'), 'worker.js must not keep adaptive child activation implementation');
  assert.ok(workflowTimeoutsSource.includes('async function sweepTimedOutJobs'), 'workflow timeout sweep should be owned outside worker.js');
  assert.ok(workflowTimeoutsSource.includes('function effectiveTimeoutDeadlineMs'), 'workflow timeout deadline calculation should be owned outside worker.js');
  assert.ok(!workerSource.includes('async function sweepTimedOutJobs'), 'worker.js must not keep workflow timeout sweep implementation');
  assert.ok(!workerSource.includes('function effectiveTimeoutDeadlineMs'), 'worker.js must not keep workflow timeout deadline implementation');
  assert.ok(workflowQualitySource.includes('function workflowAppContextOriginalSignals') || workflowQualityHandoffSource.includes('function workflowAppContextOriginalSignals'), 'leader quality gates should accept attached app context evidence when a data child has no prior run output.');
  assert.ok(endpointDispatchContractSource.includes('compactWorkflowAppContextsForDispatch'), 'attached app contexts should be passed into endpoint dispatch instead of shortcut-completing data/research.');
  assert.ok(endpointDispatchContractSource.includes('compactWorkflowInputForEndpointDispatch'), 'workflow endpoint dispatch should compact duplicated app/connector context before handing work to an agent endpoint.');
  assert.ok(!workerSource.includes('compactWorkflowInputForBuiltInDispatch'), 'workflow dispatch compaction must be endpoint-contract based, not sample-agent special casing.');
  assert.ok(!workerSource.includes('invokeLocalAgentJobEndpoint'), 'same-worker local sample endpoint invocation must not exist in worker dispatch.');
  assert.ok(workflowEndpointDispatchSource.includes("const canUseTargetedDispatchResult = typeof storage.mutateJobAndAgent === 'function'"), 'completed and failed endpoint dispatch results should persist through targeted job/agent mutation instead of loading full production state.');
  assert.ok(billingOutcomeSource.includes('if (!isBillableJob(job))'), 'test-mode billing outcomes should not force a full-state billing settlement during queue completion.');
  assert.ok(!workerSource.includes('app-context-data-analysis-shortcut'), 'data_analysis must not complete through simulated attached-context shortcut fallback.');
  assert.ok(!workerSource.includes('app-context-research-shortcut'), 'research must not complete through simulated attached-context shortcut fallback.');
  assert.ok(workflowPlanAssemblySource.includes('Leader planner failed before order creation, so CAIt kept the deterministic team plan'), 'leader planner failures should not turn order creation into a 503 when a deterministic team plan exists.');
  assert.ok(workerSource.includes('oauthCallbackCurrentContext'), 'OAuth callbacks should use account-scoped session context instead of full-state reads.');
  assert.ok(workerSource.includes('workflowBlockingQualityGateBeforeLayer') || workflowLeaderSequenceSource.includes('workflowBlockingQualityGateBeforeLayer'), 'workflow dispatch should not release downstream layers after prior handoff/search quality gates fail');
  assert.ok(workflowLeaderSequenceSource.includes('function workflowFailedPriorLayerShouldWarnNotBlock'), 'leader-released later layers should not get stuck only because one optional prior preparation artifact failed after another artifact completed.');
  assert.ok(workflowLeaderSequenceSource.includes('workflowLayerWasLeaderActivated(parent'), 'non-blocking prior-layer failure handling must be tied to explicit leader activation, not generic auto-progression.');
  assert.ok(workflowLeaderSequenceSource.includes('function workflowLeaderReplanDecisionForLayer'), 'leader checkpoints should reconsider next-layer CMO specialist assignment decision from prior media/planning outputs.');
  assert.ok(
    workflowChildProgressSource.includes('leader_replan_deferred') || workflowAdaptiveActivationSource.includes('leader_replan_deferred'),
    'leader checkpoint replans should explicitly defer non-chosen adaptive candidates instead of silently releasing every preplanned child.'
  );
  assert.ok(cmoLeaderSource.includes('cmoWorkflowReplanDecisionText'), 'CMO replanning should read the media/planning lane decision before releasing downstream specialists.');
  assert.ok(cmoLeaderSource.includes('function cmoParallelSameLayerIntentFromText'), 'CMO planning should preserve same-layer fan-out when the prompt asks for depth, quality, or multiple lanes.');
  assert.ok(cmoLeaderSource.includes('normalizeWorkflowPlannedTasks: cmoNormalizeWorkflowPlannedTasks'), 'CMO-specific workflow task normalization must live in the CMO leader agent definition.');
  assert.ok(cmoLeaderSource.includes('plannerAllowsCandidateAgentTasks: false'), 'CMO leader should define whether planner candidate task types can enter its workflow.');
  assert.ok(leaderWorkerPlanningSource.includes('normalizeLeaderWorkflowPlannedTasksFromDefinition'), 'leader worker planning should call the generic leader task-normalization hook instead of defining CMO task mappings.');
  assert.ok(!workerSource.includes('canonicalizeLeaderWorkflowPlannedTasks'), 'worker must not contain CMO-specific canonicalization logic.');
  assert.ok(!workerSource.includes('CMO-led growth team plan'), 'worker routing reasons must not contain CMO-specific workflow copy.');
  assert.ok(workflowChildProgressSource.includes('function workflowHasActiveSequentialUserActionWait'), 'workflow dispatch should serialize approval/OAuth user-action waits while allowing normal same-layer fan-out.');
  assert.ok(workflowDispatchRuntimeSource.includes('consideredRootJobIds'), 'cron dispatch sweep must dedupe workflow children by parent and avoid direct child execution');
  assert.ok(workflowWatchdogSource.includes('ORCHESTRATION_WATCHDOG_POLICY'), 'workflow orchestration watchdog policy should be owned outside worker.js');
  assert.ok(workflowWatchdogSource.includes('function runWorkflowOrchestrationWatchdog'), 'cron should have a workflow watchdog that reconciles and safely advances stale parents');
  assert.ok(workflowWatchdogSource.includes('workflow_orchestration_stalled'), 'watchdog should surface stale no-target workflows as visible blockers');
  assert.ok(!workerSource.includes("skipped: 'openai_workflow_enabled'"), 'scheduled completion sweep must recover OpenAI-backed workflow jobs instead of skipping them.');
  assert.ok(requestAccessSource.includes('clearJobAuthorityRequest(cloned)'), 'public job views must suppress stale authority requests on failed or timed-out jobs.');
  assert.ok(dispatchPolicySource.includes('const COMPLETION_SWEEP_STALE_MS = 15 * 60 * 1000'), 'workflow completion sweep should not time out research/data generation after only a few minutes.');
  assert.ok(workflowFailureRetrySource.includes('function workflowBuiltInFailureRetryMeta'), 'workflow failures should preserve retry metadata for quality-critical research/data layers.');
  assert.ok(dispatchPolicySource.includes('function workflowLeaderControlTask'), 'leader checkpoint/final-summary control jobs should have explicit retry handling.');
  assert.ok(dispatchPolicySource.includes('function workflowCompletionRecoveryMinAgeMs'), 'leader control jobs should not be recovered as stale before their generation budget expires.');
  assert.ok(dispatchPolicySource.includes('function workflowGenerationProviderTimeoutMs'), 'workflow generation should use a long provider wait budget instead of a short OpenAI timeout.');
  assert.ok(workerSource.includes('const ONE_DAY_MS = 24 * 60 * 60 * 1000'), 'workflow generation/provider response waits should default to roughly one day.');
  assert.ok(workerSource.includes('const DEFAULT_GENERATION_PROVIDER_TIMEOUT_MS = ONE_DAY_MS'), 'default provider wait budget should be one day.');
  assert.ok(jsonPostSource.includes('const useAbort = Number.isFinite(Number(timeoutMs)) && Number(timeoutMs) > 0'), 'endpoint dispatch should only abort through the explicit long-term provider wait budget.');
  assert.ok(workflowEndpointDispatchSource.includes('dispatchTimeoutMs'), 'endpoint dispatch locks should persist the provider wait budget so recovery does not double-dispatch active generation.');
  assert.ok(!/async function dispatchJobToAssignedAgent[\s\S]{0,1500}runBuiltInAgent/.test(workflowEndpointDispatchSource), 'generic dispatch must not call the local sample runner directly.');
  assert.ok(dataAnalysisSource.includes('return what the data layer implies for downstream research, planning, preparation, and app reflection'), 'data analysis agent should instruct downstream agents to use upstream data.');
  assert.ok(!workerSource.includes('function workflowShouldCompleteDataUnavailable'), 'worker must not keep a data-unavailable shortcut completion path.');
  assert.ok(/dispatchExistingJobToAssignedAgent\(storage,\s*env,\s*jobId,\s*agentId/.test(workflowDispatchRuntimeSource), 'endpoint queue consumer should use the normal endpoint dispatcher.');
  assert.ok(workflowDispatchQueueSource.includes("kind: 'endpoint_dispatch'"), 'workflow progress should queue normal endpoint dispatch work instead of draining every layer in one Worker request.');
  assert.ok(workflowDispatchRuntimeSource.includes("if (kind === 'endpoint_dispatch')"), 'queue consumer should process provider endpoint dispatch messages one job at a time.');
  assert.ok(workflowEndpointDispatchSource.includes('isTerminalJobStatus(job.status) && !workflowChildIsAdaptivePending(job)'), 'endpoint dispatch should not treat adaptive-pending blocked children as terminal because queue reads can race with leader release.');
  assert.ok(workflowEndpointDispatchSource.includes('isTerminalJobStatus(draftJob.status) && !workflowChildIsAdaptivePending(draftJob)'), 'endpoint dispatch lock should re-check adaptive-pending blocked children against fresh storage before skipping.');
  const forbiddenAgentRunKind = ['built', 'in', 'agent', 'run'].join('_');
  assert.ok(!workerSource.includes(`kind: '${forbiddenAgentRunKind}'`), 'sample agents must not use a second internal queue message; they must follow the same endpoint dispatch contract as registered external agents.');
  assert.ok(!workerSource.includes('function acceptBuiltInEndpointDispatchForProviderQueue'), 'Worker dispatch must not branch into a built-in-specific provider queue path.');
  assert.ok(!workerSource.includes('enqueueBuiltInAgentProviderRun'), 'Worker dispatch must not enqueue built-in-specific provider runs.');
  assert.ok(workflowDispatchRuntimeSource.includes('accepted_endpoint_recovered_count'), 'cron dispatch sweep should report recovery for stale accepted endpoint dispatches.');
  assert.ok(storageStateHelpersSource.includes("['accepted'].includes(safe)"), 'D1 job merge must preserve accepted endpoint dispatch state.');
  assert.ok(workflowDispatchRuntimeSource.includes("options.dispatchMode !== 'direct' && Boolean(workflowDispatchQueue(env))"), 'production progress dispatch should prefer the queue when a queue binding is configured.');
  assert.ok(orderCreateRoutesSource.includes('async function handleCreateJob'), 'order create route should be owned by lib/routes/order-create.js.');
  assert.ok(orderCreateRoutesSource.includes('async function handleCreateWorkflowJob') || orderCreateWorkflowRoutesSource.includes('async function handleCreateWorkflowJob'), 'workflow order create route should be owned outside worker.js.');
  assert.ok(orderCreateRoutesSource.includes('async function performSingleJobCreate') || orderCreateSingleRoutesSource.includes('async function performSingleJobCreate'), 'single-agent order create implementation should be owned outside worker.js.');
  assert.ok(!workerSource.includes('async function handleCreateJob'), 'worker.js must not keep the order create route implementation.');
  assert.ok(!workerSource.includes('async function handleCreateWorkflowJob'), 'worker.js must not keep the workflow order create route implementation.');
  assert.ok(!workerSource.includes('async function performSingleJobCreate'), 'worker.js must not keep the single-agent order create implementation.');
  assert.ok(orderCreateRequestHelpersSource.includes('function clientOrderIdFromCreateBody'), 'order create should accept a client order id for idempotent retries.');
  assert.ok(orderCreateRequestHelpersSource.includes('order_create_idempotent'), 'order create should return an idempotent response for duplicate client order ids.');
  assert.ok(workerSource.includes('persistedJobForClientOrderId'), 'order create should check for an existing client order before creating a new job.');
  assert.ok(orderCreateRequestHelpersSource.includes('function orderCreateBodyIsSameContentNewOrderRetry'), 'same-content retry orders should be explicitly distinguished from follow-up continuations.');
  assert.ok(orderCreateRoutesSource.includes('sameContentRetryAsNewOrder && !clientOrderMatches') || orderCreateSingleRoutesSource.includes('sameContentRetryAsNewOrder && !clientOrderMatches'), 'same-content retry recovery must not attach to an older order by prompt or session match.');
  assert.ok(orderCreateRoutesSource.includes('async function loadSingleOrderCreateState') || orderCreateSingleRoutesSource.includes('async function loadSingleOrderCreateState'), 'single-agent order creation should have a targeted state loader for production-sized D1 databases.');
  assert.ok(orderCreateRoutesSource.includes('currentOrderRequesterContext(storage, request, env, { lightweight: true })'), 'order creation should authenticate browser sessions without loading the full production snapshot.');
  assert.ok(orderCreateRoutesSource.includes('options.initialState || await loadSingleOrderCreateState(storage, current, body)') || orderCreateSingleRoutesSource.includes('options.initialState || await loadSingleOrderCreateState(storage, current, body)'), 'single-agent order creation should avoid full-state reads when targeted list/get methods are available.');
  assert.ok(/async function handleGetJob[\s\S]{0,250}currentOrderRequesterContext\(storage, request, env, \{ lightweight: true \}\)/.test(jobRoutesSource), 'live progress polling should authenticate without loading the full production snapshot.');
  assert.ok(jobRoutesSource.includes('inspect_only') && jobRoutesSource.includes('const shouldRunProgress = !inspectOnly'), 'job inspection for retry preparation should skip progress side effects.');
  assert.ok(jobRoutesSource.includes("refresh: job.jobKind === 'workflow'"), 'single-job progress polling should not run workflow handoff refresh work.');
  assert.ok(orderCreateRequestHelpersSource.includes('function orderCreateSkipIntake'), 'confirmed chat orders should skip pre-persistence intake checks on create.');
  assert.ok(orderStrategySource.includes('orderStrategyWithFollowupContext'), 'follow-up orders should keep the previous order shape instead of rerouting AUTO before persistence.');
  assert.ok(orderStrategySource.includes('leaderFollowupSpecialistRouted'), 'leader follow-up artifact requests should route to specialist agents instead of single leader runs.');
  assert.ok(workflowDispatchRuntimeSource.includes('external_agent_dispatch_contract'), 'completion sweeps should recover via endpoint dispatch instead of Worker-side generation.');
  assert.ok(!workerSource.includes('Built-in workflow dispatch queue was requested repeatedly but did not start execution.'), 'workflow queue non-starts must no longer fail the order before recovery.');
  assert.ok(authStatusRoutesSource.includes('googleGrantedCapabilities'), 'auth status should expose granted Google capabilities so chat does not repeat OAuth prompts.');
  assert.ok(integrationRoutesSource.includes('currentAgentRequesterContextWithAccount'), 'Google connector source reads should authenticate with targeted account loading.');
  assert.ok(integrationRoutesSource.includes('const current = await currentAgentRequesterContextWithAccount(storage, request, env);'), 'Google connector source reads should not load the full state snapshot before auth.');
  assert.ok(integrationRoutesSource.includes('createGithubIntegrationRouteHandlers(deps)'), 'GitHub route extraction should keep sharing the parent dependency bag.');
  for (const injectedName of ['agentSafetyErrorResponse', 'agentSafetyOptionsForRequest', 'fetchAllGithubRepos', 'ownerInfoFromRequest', 'providerMoneyReadinessForCurrent']) {
    assert.ok(integrationRoutesSource.includes(injectedName), `integration route factory must accept ${injectedName}`);
    assert.ok(githubIntegrationRoutesSource.includes(`${injectedName},`), `GitHub integration extraction must destructure ${injectedName}`);
  }
  assert.ok(jobRoutesSource.includes('const sanitizedJob = sanitizeJobForViewer(job, env);'), 'job reads should build a single sanitized public view before returning it.');
  assert.ok(jobRoutesSource.includes('return json({ ...sanitizedJob, job: sanitizedJob });'), 'job reads should expose sanitized job fields at the top level and nested job for API compatibility.');
  assert.ok(/async function scheduleProgressDispatchesForJobId[\s\S]{0,500}getFreshState/.test(workflowDispatchRuntimeSource), 'workflow progress dispatch target selection should read fresh storage after leader completion.');
  assert.ok(!workerSource.includes('function sampleAgentIdCandidatesForKind'), 'same-worker sample endpoint auth is removed with the local runner.');
  assert.ok(!workerSource.includes('canUseSampleAgentJobRoute'), 'same-worker sample job route must not remain in worker.js.');
  assert.ok(/async function runQueuedEndpointDispatchSweep[\s\S]{0,900}listStaleDispatchInProgressJobs/.test(workflowDispatchRuntimeSource), 'cron queued dispatch sweep should recover stale D1 dispatch locks with targeted queries.');
  assert.ok(workflowDispatchRuntimeSource.includes('listQueuedWorkflowDispatchRoots'), 'cron queued dispatch sweep must target plain queued workflow roots without a full-state scan.');
  assert.ok(workflowDispatchRuntimeSource.includes('listAcceptedEndpointDispatchJobs'), 'cron queued dispatch sweep must recover stale accepted endpoint dispatches.');
  assert.ok(workflowRetrySweepSource.includes('listRetryableWorkflowChildren'), 'cron retry sweep must target active retryable workflow children instead of being starved by old failed jobs.');
  assert.ok(workflowRetrySweepSource.includes('mutateJobAndAgent'), 'cron retry sweep must requeue retryable children with targeted D1 job updates instead of full-state mutation.');
  assert.ok(jobRoutesSource.includes("source: 'progress-poll'"), 'job progress polling should trigger retry sweeps so live orders do not wait only for cron.');
  assert.ok(workflowReconcileStateSource.includes('function workflowChildRetryPending'), 'workflow reconciliation should recognize retryable failed children before failing the parent order.');
  assert.ok(workflowParentReconcileSource.includes('leader_retry_pending'), 'retryable leader failures should keep the parent workflow alive until retries are exhausted.');
  assert.ok(/async function handleGetJob[\s\S]{0,5000}runQueuedEndpointDispatchSweep\(storage, env/.test(jobRoutesSource), 'live progress polling should also run the endpoint dispatch sweep so queued/running workflow children do not wait only for cron.');
  assert.ok(/async function handleGetJob[\s\S]{0,2500}awaitDispatch: false/.test(jobRoutesSource), 'D1 progress polling should persist safe dispatch scheduling synchronously without waiting for long provider generation.');
  assert.ok(workflowRetrySweepSource.includes('pauseTerminalWorkflowChildRetryForParentAuthority'), 'retry sweeps must pause terminal child retries while the parent workflow is waiting for approval.');
  assert.ok(workflowDispatchRuntimeSource.includes('legacy accepted endpoint dispatch recovered'), 'accepted endpoint recovery should leave an auditable job log.');
  assert.ok(workflowDispatchRuntimeSource.includes('loadWorkflowDispatchState(jobId)'), 'workflow progress dispatch should load only the parent workflow and assigned agents when available.');
  assert.ok(workflowParentReconcileSource.includes("['queued', 'pending'].includes(String(leaderSequence?.status") || workflowLeaderHandoffRefreshSource.includes("['queued', 'pending'].includes(String(leaderSequence?.status"), 'completed checkpoint rows must release adaptive children even if leader sequence status stayed pending.');
  assert.ok(dispatchPolicySource.includes('const DISPATCH_IN_PROGRESS_STALE_MS = 3 * 60 * 1000'), 'endpoint dispatch in-progress locks should be recoverable quickly when waitUntil loses the response.');
  assert.ok(workflowDispatchRuntimeSource.includes("previousCompletionStatus === 'dispatch_in_progress'"), 'stale dispatch_in_progress jobs should be eligible for endpoint redispatch.');
  assert.ok(workflowEndpointDispatchSource.includes("'dispatch_scheduled', 'dispatch_in_progress', 'timed_out'"), 'dispatch locks should allow stale dispatch_in_progress jobs to be relocked for endpoint retry.');
  assert.ok(workflowDispatchRuntimeSource.includes('stale endpoint dispatch lock recovered for retry'), 'stale dispatch_in_progress recovery must be marked so D1 merge accepts dispatch_scheduled.');
  assert.ok(!workerSource.includes('stale provider dispatch lock reached the scheduler'), 'stale provider dispatch locks should recover through redispatch instead of failing workflow children.');
  assert.ok(!workerSource.includes('stale provider dispatch failed; full order retry required'), 'direct stale provider redispatch should not force a full workflow retry before retry limits are reached.');
  assert.ok(storageStateHelpersSource.includes('function jobStatusIsTerminalForMerge'), 'D1 job merge must treat completed jobs as terminal, not only failed/timed_out jobs.');
  assert.ok(storageStateHelpersSource.includes('const existingCompletedBlocksStaleActive = existingCompleted'), 'D1 job merge must preserve completed endpoint results against stale active dispatch writes.');
  assert.ok(storageSource.includes('async function loadJobsByIds'), 'D1 job upserts should load existing records in one targeted query batch.');
  assert.ok(storageSource.includes('async function upsertJobBatch'), 'D1 job upserts should write workflow parent/children through a single batch path.');
  assert.ok(storageSource.includes('await db.batch(prepared)'), 'D1 job upserts should use batch writes to avoid partial workflow creation.');
  assert.ok(storageStateHelpersSource.includes('const incomingRetryMutation = existingRecoverableTerminal'), 'D1 job merge retry handling must not allow active writes to reopen completed jobs.');
  assert.ok(storageSource.includes('ON CONFLICT(id) DO UPDATE SET'), 'D1 job upsert must use guarded UPSERT instead of unconditional INSERT OR REPLACE.');
  assert.ok(storageSource.includes("lower(jobs.status) = 'completed'"), 'D1 job upsert must guard completed rows at SQL write time against cross-isolate stale writes.');
  assert.ok(storageSource.includes("lower(excluded.status) IN ('queued','claimed','running','dispatched')"), 'D1 job upsert guard must specifically reject stale active-status rewrites over completed rows.');
  assert.ok(storageStateHelpersSource.includes('function jobIsApprovalBlockedForStorage'), 'D1 job serialization must normalize approval-blocked jobs to blocked status.');
  assert.ok(storageRowCodecsSource.includes("jobIsApprovalBlockedForStorage(job) ? 'blocked'"), 'D1 must not persist running rows with blocked_waiting_for_approval metadata.');
  assert.ok(workflowQualitySource.includes('function workflowConcreteDeliverableContractForJob'), 'concrete deliverable checks should be contract-driven instead of task-name driven.');
  assert.ok(!/function workflowTaskRequiresConcreteSpecialistArtifact[\s\S]*'seo_specialist'/.test(workerSource), 'worker must not hardcode specialist deliverable requirements by task name.');
  assert.ok(!workerSource.includes('function workflowPriorHandoffCompletionPayload'), 'worker must not keep a prior-handoff fallback completion path.');
  assert.ok(!workerSource.includes('completionBlocking: false'), 'incomplete specialist artifacts must block completion and retry/fail instead of surfacing as non-blocking warnings.');
  assert.ok(dispatchResponseNormalizerSource.includes('function agentCompletionFailureReason') && workerSource.includes('agentCompletionFailureReason'), 'worker must reject completed agent responses that do not include returned delivery artifacts.');
  assert.ok(workerSource.includes('markAgentCompletionFailedFreeInState'), 'missing-deliverable completions must fail without billing instead of becoming warnings.');
  assert.ok(workflowFailureRetrySource.includes('billing released: agent did not complete a user-facing delivery'), 'agent-side missing-deliverable failures must release billing.');
  assert.ok(workflowRetrySweepSource.includes('listRetryableDispatchJobs'), 'cron retry sweep must include retryable non-workflow agent jobs, not only workflow children.');
  assert.equal(existsSync(new URL('../lib/in-app-payments-removed.js', import.meta.url)), false, 'payment removal must delete the retired 410 compatibility route module.');
  assert.ok(sampleAgentDefinitionsSource.includes('SAMPLE_AGENT_MANIFESTS'), 'agent index should derive manifests from individual agent files.');
  assert.ok(sampleAgentDefinitionsSource.includes('sampleAgentDefinitionForKind'), 'agent index should resolve a definition by its own manifest kind.');
  assert.ok(!sampleAgentDefinitionsSource.includes('sampleAgentPayload'), 'agent index must not own cross-agent payload generation.');
  assert.ok(!sampleAgentDefinitionsSource.includes('callOpenAi'), 'agent index must not own agent-specific model actions.');
  assert.ok(
    agentOrchestrationDisciplineSource.includes('Workflow child assignment must resolve against the current agent list and manifest/task contract'),
    'discipline must forbid replaying concrete historical agent ids for workflow child assignment'
  );
  assert.ok(
    brokerAgentAssignmentSource.includes('function resolveWorkflowAssignmentFromAgentList'),
    'broker assignment module must re-resolve workflow assignments from the current agent list before child creation'
  );
  assert.ok(
    (orderCreateRoutesSource.includes('assignments: plan.assignments') && orderCreateRoutesSource.includes('resolveWorkflowAssignmentFromAgentList(state.agents, assignment'))
      || (orderCreateWorkflowRoutesSource.includes('assignments: plan.assignments') && orderCreateWorkflowRoutesSource.includes('resolveWorkflowAssignmentFromAgentList(state.agents, assignment')),
    'workflow child creation must use list-resolved assignments instead of trusting prior concrete agent ids'
  );
  
  const ga4SessionPreflight = orderPreflightForAgent(
    {
      id: 'qa-ga4-session-agent',
      taskTypes: ['data_analysis'],
      metadata: { requiredConnectorCapabilities: ['google.read_ga4'] }
    },
    {
      googleAuthorized: true,
      session: { googleScopes: 'openid email profile https://www.googleapis.com/auth/analytics.readonly' }
    },
    null,
    { prompt: 'Use GA4 data for growth analysis.' }
  );
  assert.equal(ga4SessionPreflight.ok, true, 'session-only Google OAuth scopes should satisfy GA4 preflight without asking for OAuth again');
  
  const gscSessionPreflight = orderPreflightForAgent(
    {
      id: 'qa-gsc-session-agent',
      taskTypes: ['data_analysis'],
      metadata: { requiredConnectorCapabilities: ['google.read_gsc'] }
    },
    {
      googleAuthorized: true,
      session: { googleScopes: 'openid email profile https://www.googleapis.com/auth/analytics.readonly' }
    },
    null,
    { prompt: 'Use Search Console data for growth analysis.' }
  );
  assert.equal(gscSessionPreflight.ok, false, 'GA4-only OAuth should not be mistaken for Search Console access');
  assert.deepEqual(gscSessionPreflight.missing_connector_capabilities, ['google.read_gsc'], 'preflight should ask only for the missing Search Console capability');
}
