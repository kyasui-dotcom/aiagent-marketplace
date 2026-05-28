import { createWorkerHandlers } from './lib/worker-handlers.js';
import { API_ROUTES, apiRouteMatches } from './lib/api-routes.js';
import { createBillingOutcomeHelpers } from './lib/billing-outcome.js';
import { SAMPLE_AGENT_KINDS, sampleAgentDefinitionForKind } from './lib/builtin-agents/agents/index.js';
import { leaderReadableAgentCatalogIndex } from './lib/agent-catalog-index.js';
import { createSnapshotHelpers, requestedBillingPeriod } from './lib/snapshot.js';
import {
  downstreamHandoffSummaryContractForTask,
  downstreamHandoffSummaryInstruction,
  leaderControlContractForTask,
  leaderActionLayerStart,
  leaderActionLayerInternalTasks,
  leaderBlockedDispatchTaskTypes,
  leaderOrchestrationProfile,
  leaderSourceCollectionLayerTasks,
  leaderProtocolExtras,
  leaderTaskDispatchAllowlist,
  leaderTaskLayer,
  leaderTaskPhase,
  leaderTaskRequiresSourceCollection,
  leaderTaskUsesWebSearch,
  leaderUsesSaasPublishHandoff,
  taskRequiresConnectorApproval
} from './lib/orchestration.js';
import { GITHUB_ADAPTER_MARKER, adapterNextStepText, buildGithubAdapterPlan, createGithubBranch, createGithubPullRequest, fetchGithubBranchSha, fetchGithubRepoTree, fetchGithubTextFile, findKnownBrokerPath, upsertGithubTextFile } from './lib/github-adapter.js';
import { MANIFEST_CANDIDATE_PATHS, assessAgentRegistrationSafety, buildDraftManifestFromAgentSkill, buildDraftManifestFromRepoAnalysis, buildDraftManifestFromRepoAnalysisWithAi, normalizeManifest, parseAndValidateManifest, sanitizeManifestForPublic, validateManifest } from './lib/manifest.js';
import { createAppFromInput, createAppFromManifest, isCoreFeatureAppId, normalizeAppManifest, sanitizeAppForPublic, validateAppManifest } from './lib/apps.js';
import { appContextIsExpired, createAppContextRecord, publicAppContext } from './lib/app-context.js';
import { publicPublisherItem, publisherRecordsFromContext } from './lib/publisher-items.js';
import { shapePublisherContextWithOpenAi } from './lib/publisher-context.js';
import { authorityBlockReasonFromRequest, authorityBool, authorityRequestFromReport, authorityRequestIsExternalWriteOrPublish, authorityRequestRequiresApproval, authorityStringList, clearJobAuthorityRequest, executorStatePatchFromAuthorityRequest, normalizeAuthorityRequest, providerAuthorityRequestFromPayload, sanitizeExecutorStatePatch } from './lib/authority-requests.js';
import { createAuthContextHelpers } from './lib/auth-context.js';
import { createAccountEventHelpers } from './lib/account-events.js';
import { createGithubAppAccessHelpers } from './lib/github-app-access.js';
import { githubAppClientId, githubAppClientSecret, githubAppConfigured, githubAppId, githubAppInstallSlug, githubAppInstallationToken, githubAppPrivateKey, githubAppRecommendedSettings, githubAppSlug, githubAppUserInstallationRepos, githubAppUserInstallations, githubAppUserTokenFromCode } from './lib/github-app-config.js';
import { fetchAllGithubRepos, fetchGithubManifestCandidate, fetchGithubPublicRepos, fetchGithubRepoMeta, fetchGithubUserProfile, githubGrantedScopes, githubHeaders, githubPermissionError, githubPrivateRepoImportEnabled, githubSessionCanReadPrivateRepos, loadGithubManifestDraftSignals, loadManifestFromUrl, validateManifestUrlInput } from './lib/github-integration.js';
import { createGoogleIntegrationHelpers } from './lib/google-integration.js';
import { createBrokerAgentAssignmentHelpers } from './lib/broker-agent-assignment.js';
import { createLeaderWorkerPlanningHelpers } from './lib/leader-worker-planning.js';
import { createMarketplaceRegistrationHelpers } from './lib/marketplace-registration.js';
import { createOrderStrategyHelpers } from './lib/order-strategy.js';
import { MAX_PROVIDER_MARKUP_RATE, creatorFeeRateFromInput, marketplaceFeeRateFromInput, nonNegativeUsdFromInput, overageModeFromInput, platformMarginRateFromInput, pricingModelFromInput, providerMarkupRateFromInput } from './lib/pricing-input.js';
import { createPublicReadModelHelpers } from './lib/public-read-model.js';
import { createRateLimitHelpers } from './lib/rate-limit.js';
import { createRequestIdentityHelpers, createRequestVisibilityHelpers } from './lib/request-access.js';
import { fetchJson, githubClientId, githubClientSecret, runtimeStorage, shouldInjectQaOrderCreateFault } from './lib/runtime-env.js';
import { fetchWorkerAsset } from './lib/worker-assets.js';
import { createWorkerLifecycleHandlers } from './lib/worker-lifecycle-events.js';
import { createRecurringOrderSweep } from './lib/recurring-order-sweep.js';
import { appendEmailDelivery, createEmailNotificationHelpers, resendConfigured, sendResendEmail, validateEmailAddress } from './lib/email-notifications.js';
import { agentReviewerLogins, boolFlag, createOperatorAccessHelpers, feedbackReviewerLogins, platformAdminLogins, runtimePolicy } from './lib/operator-access.js';
import {
  baseUrl,
  baseUrlFromEnv,
  buildReadableCookie,
  canonicalBrowserRedirect,
  clearCookie,
  configuredBaseUrls,
  json,
  jsonWithCookies,
  legacyLegalNoticeRedirect,
  normalizeBaseUrl,
  parseCookies,
  redirect,
  redirectWithCookies,
  requestOrigin,
  responseWithCookies,
  securityHeaders
} from './lib/http-core.js';
import {
  OAUTH_STATE_COOKIE,
  SESSION_COOKIE,
  consumeOAuthState,
  getSession,
  hmacSha256Base64Url,
  internalCronToken,
  makeSessionCookie,
  maybeRefreshSessionCookie,
  openPayload,
  pushOAuthStateCookie,
  sealPayload,
  sessionSecretMaterial
} from './lib/auth-session.js';
import { createAuthHelpers } from './lib/auth-helpers.js';
import { appSettingsMap, createAppSettingsRouteHandlers, lazyAppSettingsMap } from './lib/routes/app-settings.js';
import { createAdminDashboardRouteHandlers } from './lib/routes/admin-dashboard.js';
import { createAnalyticsRouteHandlers } from './lib/routes/analytics.js';
import { createAppRouteHandlers } from './lib/routes/apps.js';
import { createAgentRegistrationRouteHandlers } from './lib/routes/agent-registration.js';
import { createAgentManagementRouteHandlers } from './lib/routes/agent-management.js';
import { createAgentExecutionRouteHandlers } from './lib/routes/agent-execution.js';
import { createAuthRouteHandlers } from './lib/routes/auth.js';
import { createAuthStatusRouteHandlers } from './lib/routes/auth-status.js';
import { createApiKeyRouteHandlers } from './lib/routes/api-keys.js';
import { createCampaignRouteHandlers } from './lib/routes/campaigns.js';
import { createCatalogRouteHandlers, catalogPagePayload } from './lib/routes/catalog.js';
import { clearDeliveryCompletionGate, deliveryCompletionEvidenceScoreForJob, setDeliveryCompletionGate } from './lib/delivery-completion-gate.js';
import { createChatMemoryRouteHandlers } from './lib/routes/chat-memory.js';
import { createConnectorRouteHandlers } from './lib/routes/connectors.js';
import { createDevJobRouteHandlers } from './lib/routes/dev-jobs.js';
import { createDeliveryRouteHandlers } from './lib/routes/deliveries.js';
import { createExactActionRouteHandlers } from './lib/routes/exact-actions.js';
import { createFeedbackChatRouteHandlers } from './lib/routes/feedback-chat.js';
import { createIntegrationRouteHandlers } from './lib/routes/integrations.js';
import { createJobAuthorityRouteHandlers } from './lib/routes/job-authority.js';
import { createJobRouteHandlers } from './lib/routes/jobs.js';
import { createMcpRouteHandlers } from './lib/routes/mcp.js';
import { createOpenChatRouteHandlers } from './lib/routes/open-chat.js';
import { createOrderCreateHandlers } from './lib/routes/order-create.js';
import { createSampleAgentManifestRouteHandlers } from './lib/routes/sample-agent-manifest.js';
import { createProviderIdentityRouteHandlers } from './lib/routes/provider-identity.js';
import { providerMoneyReadinessForCurrent } from './lib/provider-money-readiness.js';
import { createRecurringOrderRouteHandlers } from './lib/routes/recurring-orders.js';
import { createSettingsRouteHandlers } from './lib/routes/settings.js';
import { createWorkOrderRouteHandlers } from './lib/routes/work-order.js';
import { createWorkflowAdaptiveActivation } from './lib/workflow-adaptive-activation.js';
import { createDispatchPolicyHelpers } from './lib/dispatch-policy.js';
import { createEndpointDispatchContractHelpers } from './lib/endpoint-dispatch-contract.js';
import { WORKFLOW_HANDOFF_CONTEXT_START, createWorkflowHandoffContext } from './lib/workflow-handoff-context.js';
import { createWorkflowDispatchQueueHelpers } from './lib/workflow-dispatch-queue.js';
import { createWorkflowDispatchRuntime } from './lib/workflow-dispatch-runtime.js';
import { createWorkflowLeaderHandoff } from './lib/workflow-leader-handoff.js';
import { createWorkflowLeaderSequenceRepair } from './lib/workflow-leader-sequence-repair.js';
import { createWorkflowJobProfileHelpers } from './lib/workflow-job-profile.js';
import { createWorkflowParentReconcile } from './lib/workflow-parent-reconcile.js';
import { createWorkflowPlanAssemblyHelpers } from './lib/workflow-plan-assembly.js';
import { createWorkflowReconcileActions } from './lib/workflow-reconcile-actions.js';
import { createWorkflowReconcileState } from './lib/workflow-reconcile-state.js';
import { createWorkflowRetrySweep } from './lib/workflow-retry-sweep.js';
import { createWorkflowTimeouts } from './lib/workflow-timeouts.js';
import { ORCHESTRATION_WATCHDOG_POLICY, createWorkflowWatchdog } from './lib/workflow-watchdog.js';
import { createWorkflowFailureRetryHelpers, workflowQualitySourceTask } from './lib/workflow-failure-retry.js';
import { createWorkflowLayeringHelpers } from './lib/workflow-layering.js';
import { createDispatchResponseNormalizer } from './lib/dispatch-response-normalizer.js';
import { createWorkflowAuthorityGate } from './lib/workflow-authority-gate.js';
import { createWorkflowJobResultHandlers } from './lib/workflow-job-results.js';
import { createWorkflowQualityHelpers } from './lib/workflow-quality.js';
import { createWorkflowSourceRequirementHelpers } from './lib/workflow-source-requirements.js';
import { createWorkflowChildProgressHelpers } from './lib/workflow-child-progress.js';
import { createWorkflowPriorRunHelpers } from './lib/workflow-prior-runs.js';
import { createWorkflowLeaderSequenceHelpers } from './lib/workflow-leader-sequence.js';
import { createWorkflowParentBlockingHelpers } from './lib/workflow-parent-blocking.js';
import { createWorkflowEndpointDispatchHelpers } from './lib/workflow-endpoint-dispatch.js';
import { postJsonWithTimeout } from './lib/json-post.js';
import { sanitizeExactMatchActionsForClient } from './lib/exact-actions.js';
import { hasAdapterPrConfirmation, hasPostConfirmation, hasRepoWriteConfirmation, hasSendConfirmation } from './lib/external-write-confirmation.js';
import { csrfExemptPath, isUnsafeMethod, rateLimitSpecForPath } from './lib/http-policy.js';
import { forwardFeedbackReportEmail } from './lib/feedback-email.js';
import { prepareGuestTrialOrderContext, handleGuestTrialClaim } from './lib/guest-trial.js';
import { createAccountSessionHelpers } from './lib/account-session.js';
import { createOpenChatIntentSupport, openChatIntentEnvValue, openChatIntentLanguage } from './lib/open-chat-intent.js';
import { agentReviewRouteBlockReason, applyAgentReviewToAgentRecord, isAgentReviewApproved, manualAgentReviewFromBody, runAgentAutoReview } from './lib/agent-review.js';
import { runAgentOnboardingCheck } from './lib/onboarding.js';
import { isManagedSampleAgent, sampleKindFromAgent, verifyAgentByHealthcheck } from './lib/verify.js';
import { accountHash } from './lib/account-identity.js';
import { createAgentEndpointHelpers } from './lib/agent-endpoints.js';
import { createAgentResultPayloadHelpers } from './lib/agent-result-payload.js';
import { buildConversionAnalytics, createConversionEventPayload } from './lib/conversion-analytics.js';
import { parseBody } from './lib/http-body.js';
import { buildAdminDashboard } from './lib/admin-dashboard-model.js';
import { clientOrderIdFromCreateBody, createOrderCreateRequestHelpers } from './lib/order-create-request-helpers.js';
import { normalizeUsageForBilling, usageWithObservedJobTokens } from './lib/usage-accounting.js';
import { API_COST_CATALOG_VERSION, BILLING_DISPLAY_CURRENCY, EXTERNAL_API_COST_CATALOG_USD, LLM_HIGH_WATERMARK_PRICE_PER_MTOK_USD, WELCOME_CREDITS_GRANT_AMOUNT, accountIdForLogin, accountIdentityForProvider, accountSettingsForIdentity, accountSettingsForLogin, agentLinksFromRecord, agentTagsFromRecord, aliasLoginsForAccount, authenticateOrderApiKey, billingAuditsForJobIds, billingModeFromJob, billingPeriodId, billingProfileForAccount, buildAgentId, buildFollowupConversationContext, buildIntakeClarification, buildMonthlyAccountSummary, chatSessionIdForJob, chatTrainingExamplesForClient, chatTranscriptsForClient, computeScore, connectorActionLabel, connectorOAuthActionInstruction, createChatTranscript, createFeedbackReport, defaultLoginForAuthUser, displayCurrencyToLedgerAmount, estimateBilling, estimateRunWindow, feedbackReportsForClient, hideChatMemoryTranscriptForLoginInState, inferAgentTagsFromSignals, inferTaskSequence, inferTaskType, isAgentOwnedByLogin, isBillableJob, isJobVisibleToLogin, isPrivateNetworkHostname, jobsVisibleToLogin, ledgerAmountToDisplayCurrency, linkIdentityToAccountInState, makeEvent, maybeGrantWelcomeCreditsForSignupInState, maybeGrantWelcomeCreditsForVerifiedAgentInState, mergeAccountsInState, mergeProtectedPromptSourceIntoInput, normalizeAgentTags, normalizeTaskTypes, nowIso, optimizeOrderPromptForBroker, promptInjectionGuardForPrompt, publicEventView, recoverMissingAccountsInState, releaseBillingReservationInState, requesterContextFromUser, reserveBillingEstimateInState, sanitizeAccountSettingsForClient, sanitizeFeedbackReportForClient, settleBillingForJobInState, settleOpenAiCostForJobInState, touchOrderApiKeyUsageInState, updateChatTranscriptReviewInState, updateFeedbackReportInState, upsertAccountSettingsForIdentityInState, upsertAccountSettingsInState, workflowTagHintsForTask, workflowTaskCandidateTokens, workflowTaskSoftMatchTokens } from './lib/shared.js';
import { createRecurringOrderInState, deleteRecurringOrderInState, dueRecurringOrders, markRecurringOrderRunInState, recurringOrderToJobPayload, recurringOrdersVisibleToLogin, updateRecurringOrderInState } from './lib/recurring-orders-state.js';
import { agentRoutingConfirmationAccepted, applyConfirmedAgentRoutingToAgent, buildAgentRoutingConfirmation } from './lib/shared.js';
import { agentPatternFitScore, buildAgentTeamDeliveryOutput, ensureLeaderWorkflowActionTasksFromDefinition, isLargeAgentTeamIntent, leaderExternalActionRequestedFromDefinition, leaderPlannerAllowsCandidateAgentTasksFromDefinition, leaderSequentialUserActionPriorityFromDefinition, leaderSpecialistTaskForFollowupFromDefinition, leaderTaskTypeForInitialWork, leaderWorkflowReplanDecisionFromDefinition, normalizeLeaderWorkflowPlannedTasksFromDefinition, orderPreflightForAgent, ownChatMemoryForClient } from './lib/shared.js';
import { listCreatorUsageEstimateForOrder } from './lib/shared.js';
import { orderBodyWithCommonQualityRules } from './lib/shared.js';
import { buildXAuthorizeUrl, buildXPkcePair, exchangeXOAuthCode, fetchXProfile, postXTweet, publicXConnectorStatus, validateXPostExecutionApproval, validateXPostText, xConnectorFromOAuthToken, xOAuthConfigured, xTokenEncryptionConfigured } from './lib/x-connector.js';
import { createWordPressDraft, normalizeWordPressSiteUrl, publicWordPressConnectorStatus, testWordPressApplicationPassword, wordpressConnectorFromApplicationPassword } from './lib/wordpress-connector.js';
import { connectorTokenEncryptionConfigured, decryptConnectorSecret, encryptConnectorSecret, githubConnectorFromOAuthToken, googleConnectorFromOAuthToken } from './lib/connector-secrets.js';
import {
  normalizeDeliveryExecuteFailureResponse,
  normalizeDeliveryScheduleFailureResponse,
  deliveryActionContractForType
} from './public/delivery-action-contract.js';
import {
  WORK_ORDER_UI_LABELS,
  isDeveloperExecutionIntentText,
  resolveStaticWorkAction
} from './public/work-action-registry.js';

const GA4_AUTH_EVENT_COOKIE = 'cait_ga4_auth_event';
const APP_SHELL_ASSET_VERSION = '20260424c';
const WORKFLOW_CHILD_TIMEOUT_FLOOR_MS = 15 * 60 * 1000;
const WORKFLOW_ACTION_CHILD_TIMEOUT_FLOOR_MS = 30 * 60 * 1000;
const WORKFLOW_PARENT_TIMEOUT_FLOOR_MS = 45 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_GENERATION_PROVIDER_TIMEOUT_MS = ONE_DAY_MS;
const DEFAULT_LONG_GENERATION_PROVIDER_TIMEOUT_MS = ONE_DAY_MS;
const MAX_ENDPOINT_DISPATCH_WAIT_MS = ONE_DAY_MS;
const rateLimitBuckets = new Map();
let orderCreateRuntime = null;
const handleCreateJob = (...args) => orderCreateHandlers().handleCreateJob(...args);
const handleCreateWorkflowJob = (...args) => orderCreateHandlers().handleCreateWorkflowJob(...args);
const performSingleJobCreate = (...args) => orderCreateHandlers().performSingleJobCreate(...args);
let workflowDispatchRuntime = null;
let workflowParentReconcileRuntime = null;
let workflowSourceRequirementHelpers = null;
let workflowChildProgressHelpers = null;
let workflowPriorRunHelpers = null;
let workflowLeaderSequenceHelpers = null;
let workflowParentBlockingHelpers = null;
let workflowEndpointDispatchHelpers = null;
const reconcileWorkflowParent = (...args) => workflowParentReconcileRuntime.reconcileWorkflowParent(...args);
const refreshWorkflowLeaderHandoffForJobId = (...args) => workflowParentReconcileRuntime.refreshWorkflowLeaderHandoffForJobId(...args);
const workflowJobProfileHelpers = createWorkflowJobProfileHelpers({
  leaderUsesSaasPublishHandoff
});
const {
  isWorkflowLeaderTask,
  workflowBrokerForJob,
  workflowBrokerWorkflowForJob,
  workflowBrokerWorkflowForJobOrEmpty,
  workflowPrimaryTaskFromJobOrProfile,
  workflowSequencePhaseForJob,
  workflowTaskName,
  workflowUsesSaasPublishHandoff
} = workflowJobProfileHelpers;
const workflowLayeringHelpers = createWorkflowLayeringHelpers({
  isWorkflowLeaderTask,
  leaderOrchestrationProfile,
  leaderTaskLayer,
  leaderTaskPhase,
  workflowTaskName
});
const {
  workflowDispatchLayer,
  workflowLayerLabel,
  workflowLayerRequiresUserApprovalBeforeRelease,
  workflowPrimaryTask,
  workflowSequencePhaseForTask
} = workflowLayeringHelpers;

workflowSourceRequirementHelpers = createWorkflowSourceRequirementHelpers({
  leaderTaskUsesWebSearch,
  workflowTaskName
});

const {
  workflowSearchSourcesFromReport,
  workflowSearchSourceHasExecutionProof,
  workflowSearchSourcesHaveExecutionProof,
  workflowSearchCompletionFailureReason,
  workflowConcreteDeliverableContractForJob,
  workflowTaskRequiresConcreteSpecialistArtifact,
  workflowConcreteArtifactText,
  workflowConcreteArtifactFailureReason,
  workflowDeliveryLooksInternalFacing,
  recordWorkflowConcreteArtifactWarning,
  workflowSourceSignalStrings,
  workflowMinimumPriorUseForPhase,
  workflowHandoffPriorDeliverables,
  workflowSlimPriorRunForHandoff,
  workflowExecutionProgram,
  workflowOutputText,
  workflowOutputTextForQuality,
  workflowHandoffClip,
  workflowHandoffBlockClip,
  workflowFlattenTextParts,
  workflowNormalizeCandidateUrl,
  workflowExtractSourceUrls,
  workflowCanonicalBriefFromJob,
  workflowCanonicalBriefPromptLines,
  workflowDigestPushUnique,
  workflowDigestLinesFromText,
  workflowDigestClassifyLines,
  workflowResearchHandoffFromReport,
  workflowStructuredHandoffDigestFromRun,
  workflowStructuredDigestPromptLines,
  workflowStructuredDigestPromptBlock,
  workflowHandoffPromptDataFromRun,
  workflowHandoffOriginalSignals,
  workflowAppContextOriginalSignals,
  workflowTextUsesSignals,
  workflowResearchHandoffRuns,
  workflowExecutionNeedsMultipleInputs,
  workflowCreativeOrActionArtifactPresent,
  workflowOriginalInfoQualityReview,
  workflowLeaderOutputQualityReview,
  workflowApplyQualityReviewToChild,
  workflowApplyQualityReviewToLeader,
  workflowLeaderQualityGateFailed,
  workflowLayerQualityGate,
  appendWorkflowOriginalInfoUsage
} = createWorkflowQualityHelpers({
  deliveryCompletionEvidenceScoreForJob,
  isWorkflowLeaderTask,
  leaderActionLayerStart,
  leaderTaskUsesWebSearch,
  nowIso,
  setDeliveryCompletionGate,
  sortWorkflowChildren,
  workflowChildIsLeaderReplanDeferred,
  workflowDispatchLayer,
  workflowJobRequiresSearch,
  workflowLayerLabel,
  workflowLeaderPriorLayerOptionalOnly,
  workflowLeaderPriorLayerUnavailable,
  workflowPrimaryTask,
  workflowSequencePhaseForJob,
  workflowTaskName,
  workflowUnavailablePriorRunIsOptional
});

workflowPriorRunHelpers = createWorkflowPriorRunHelpers({
  WORKFLOW_HANDOFF_CONTEXT_START,
  isWorkflowLeaderTask,
  sortWorkflowChildren,
  workflowChildIsLeaderReplanDeferred,
  workflowDispatchLayer,
  workflowFlattenTextParts,
  workflowHandoffOriginalSignals,
  workflowOutputText,
  workflowResearchHandoffFromReport,
  workflowSearchSourcesFromReport,
  workflowSequencePhaseForJob,
  workflowSourceSignalStrings,
  workflowStoredAdditionalPrompt: (...args) => workflowStoredAdditionalPrompt(...args),
  workflowStructuredHandoffDigestFromRun,
  workflowTaskName
});

workflowLeaderSequenceHelpers = createWorkflowLeaderSequenceHelpers({
  authorityRequestFromReport,
  isWorkflowLeaderTask,
  leaderActionLayerStart,
  leaderTaskPhase,
  leaderWorkflowReplanDecisionFromDefinition,
  sortWorkflowChildren,
  workflowApplyQualityReviewToChild,
  workflowChildIsAdaptivePending,
  workflowChildIsLeaderReplanDeferred,
  workflowDispatchLayer,
  workflowOriginalInfoQualityReview,
  workflowOptionalUnavailablePriorRun,
  workflowPrimaryTask,
  workflowSequencePhaseForJob,
  workflowTaskName,
  workflowUnavailablePriorRunIsOptional
});

const agentEndpointHelpers = createAgentEndpointHelpers({
  baseUrlFromEnv,
  isAgentReviewApproved
});
const {
  callbackTokenForJob,
  extractCallbackToken,
  isAgentVerified,
  resolveAgentJobEndpoint,
  resolveDispatchEndpointUrl
} = agentEndpointHelpers;
const workflowDispatchQueueHelpers = createWorkflowDispatchQueueHelpers({ nowIso });
const {
  enqueueEndpointDispatch,
  workflowDispatchQueue,
  workflowQueueGenerationTimeoutMs,
  workflowQueueSourceCollectionTimeoutMs
} = workflowDispatchQueueHelpers;
const agentResultPayloadHelpers = createAgentResultPayloadHelpers({
  isBlockedAgentResultStatus: (...args) => isBlockedAgentResultStatus(...args),
  providerAuthorityRequestFromPayload
});
const {
  normalizeAgentReportPayload,
  normalizeCallbackPayload,
  topLevelAgentReportCandidate
} = agentResultPayloadHelpers;

const dispatchPolicyHelpers = createDispatchPolicyHelpers({
  DEFAULT_GENERATION_PROVIDER_TIMEOUT_MS,
  MAX_ENDPOINT_DISPATCH_WAIT_MS,
  ONE_DAY_MS,
  effectiveTimeoutDeadlineMs: (...args) => effectiveTimeoutDeadlineMs(...args),
  isWorkflowLeaderTask,
  workflowQualitySourceTask,
  workflowSequencePhaseForJob,
  workflowTaskName
});
const {
  DISPATCH_IN_PROGRESS_STALE_MS,
  DISPATCH_SCHEDULE_STALE_MS,
  DISPATCH_SCHEDULE_TIMEOUT_MS,
  WORKFLOW_PROGRESS_DISPATCH_MAX_TARGETS,
  acceptedEndpointRecoveryAttempts,
  acceptedEndpointRecoveryLimitReached,
  canRetryJob,
  canTransitionJob,
  completionQueueRecoveryStaleMs,
  completionQueueStaleMs,
  completionSweepStaleMs,
  computeNextRetryAt,
  dispatchExecutionIsFresh,
  dispatchScheduleIsFreshForAgent,
  endpointDispatchTimeoutMs,
  isBlockedAgentResultStatus,
  isTerminalJobStatus,
  jobWithinDispatchAge,
  maxDispatchRetriesForJob,
  normalizeJobStatus,
  providerRunAttempts,
  providerRunLimitReached,
  shouldAutoRetryTimedOutWorkflowChild,
  shouldAutoRetryWorkflowChild,
  transitionErrorCode,
  workflowChildDispatchFailureRequiresRestart,
  workflowChildShouldRestartFromBeginning,
  workflowCompletionRecoveryMinAgeMs,
  workflowCompletionRetryLimitForJob,
  workflowDispatchMaxAgeMs,
  workflowGenerationProviderTimeoutMs,
  workflowLeaderControlMaxRetries,
  workflowLeaderControlTask,
  workflowProviderRunMaxAttempts,
  workflowRestartRequiredReason,
  workflowSourceCollectionMaxRetries
} = dispatchPolicyHelpers;
const workflowFailureRetryHelpers = createWorkflowFailureRetryHelpers({
  clearDeliveryCompletionGate,
  computeNextRetryAt,
  maxDispatchRetriesForJob,
  nowIso,
  providerRunAttempts,
  releaseBillingReservationInState,
  workflowChildDispatchFailureRequiresRestart,
  workflowCompletionRetryLimitForJob,
  workflowLeaderControlMaxRetries,
  workflowLeaderControlTask,
  workflowProviderRunMaxAttempts,
  workflowRestartRequiredReason,
  workflowSourceCollectionMaxRetries,
  workflowTaskRequiresConcreteSpecialistArtifact
});
const {
  agentCompletionFailureRetryMeta,
  markAgentCompletionFailedFreeInState,
  sourceCollectionFailureRetryMeta,
  workflowBuiltInFailureRetryMeta
} = workflowFailureRetryHelpers;
const dispatchResponseNormalizer = createDispatchResponseNormalizer({
  computeNextRetryAt,
  isBlockedAgentResultStatus,
  maxDispatchRetriesForJob,
  normalizeAgentReportPayload,
  topLevelAgentReportCandidate,
  workflowConcreteArtifactFailureReason,
  workflowTaskName
});
const {
  agentCompletionFailureReason,
  buildDispatchFailureMeta,
  deliveryPayloadValueToText,
  normalizeDeliveryPayloadFiles,
  normalizeDispatchResponse,
  workflowClipText
} = dispatchResponseNormalizer;

const endpointDispatchContractHelpers = createEndpointDispatchContractHelpers({
  downstreamHandoffSummaryContractForTask,
  downstreamHandoffSummaryInstruction,
  workflowAdditionalPromptForDispatch: (...args) => workflowAdditionalPromptForDispatch(...args),
  workflowBasePrompt: (...args) => workflowBasePrompt(...args),
  workflowClipText: (...args) => workflowClipText(...args),
  workflowSequencePhaseForJob: (...args) => workflowSequencePhaseForJob(...args),
  workflowSourceCollectionContractForJob: (...args) => workflowSourceCollectionContractForJob(...args),
  workflowSourceCollectionQualityRule: (...args) => workflowSourceCollectionQualityRule(...args),
  workflowTaskName: (...args) => workflowTaskName(...args)
});
const {
  buildCompactWorkflowDispatchPayload,
  buildDispatchHeaders,
  buildDispatchPayload,
  compactWorkflowAppContextsForDispatch,
  compactWorkflowInputForEndpointDispatch
} = endpointDispatchContractHelpers;

const {
  accountHasGithubConnector,
  accountHasGoogleConnector,
  accountHasXConnector,
  githubAppInstallationsFromSession,
  githubAppReposFromSession,
  githubAuthProvider,
  githubConnectorForAccount,
  githubOAuthScope,
  githubUserRecord,
  googleConnectorForAccount,
  googleUserRecord,
  lightweightCurrentFromSession,
  linkedProvidersFromAccount,
  mergeLinkedSession,
  oauthCapabilitiesFromUrl,
  sessionAuthProvider,
  sessionHasGithubApp,
  sessionHasGithubOauth,
  sessionHasGoogleOauth,
  xConnectorForAccount,
  xOAuthScopeLabel
} = createAccountSessionHelpers({
  accountIdentityForProvider,
  defaultLoginForAuthUser
});

const publicReadModelHelpers = createPublicReadModelHelpers({
  agentLinksFromRecord,
  agentTagsFromRecord,
  isCoreFeatureAppId,
  sanitizeAppForPublic,
  sanitizeManifestForPublic
});
const {
  billingAuditEvents,
  statsOf,
  publicAgent,
  publicApp,
  cloneJob
} = publicReadModelHelpers;

const sampleAgentManifestRoutes = createSampleAgentManifestRouteHandlers({
  json,
  normalizeTaskTypes,
  parseBody,
  sampleAgentDefinitionForKind
});
const {
  handleSampleAgentManifestRequest,
  sampleAgentManifestRoute
} = sampleAgentManifestRoutes;

const leaderWorkerPlanningHelpers = createLeaderWorkerPlanningHelpers({
  ensureLeaderWorkflowActionTasksFromDefinition,
  isWorkflowLeaderTask,
  leaderActionLayerInternalTasks,
  leaderActionLayerStart,
  leaderControlContractForTask,
  leaderSourceCollectionLayerTasks,
  leaderTaskLayer,
  leaderTaskRequiresSourceCollection,
  normalizeLeaderWorkflowPlannedTasksFromDefinition,
  normalizeTaskTypes
});
const {
  ensureLeaderWorkflowActionTasks,
  filterLeaderWorkflowPlannedTasks,
  normalizeLeaderWorkflowPlannedTasks,
  workflowHumanActionIntentText
} = leaderWorkerPlanningHelpers;

const brokerAgentAssignmentHelpers = createBrokerAgentAssignmentHelpers({
  agentLinksFromRecord,
  agentPatternFitScore,
  agentTagsFromRecord,
  computeScore,
  isAgentVerified,
  isManagedSampleAgent,
  isWorkflowLeaderTask,
  leaderReadableAgentCatalogIndex,
  leaderTaskLayer,
  leaderTaskPhase,
  normalizeAgentTags,
  normalizeTaskTypes,
  resolveAgentJobEndpoint,
  workflowTagHintsForTask,
  workflowTaskCandidateTokens,
  workflowTaskSoftMatchTokens
});
const {
  agentWorkflowLayer,
  isAgentGroupRecord,
  leaderPlannerCandidateAgents,
  leaderPlannerManifestCatalog,
  assignAgentForTask,
  resolveWorkflowAssignmentFromAgentList,
  selectedAgentIdFromOrderBody,
  selectedAgentIsLeader,
  selectedAgentNameFromOrderBody,
  selectedAgentTaskTypeFromOrderBody
} = brokerAgentAssignmentHelpers;

const workflowPlanAssemblyHelpers = createWorkflowPlanAssemblyHelpers({
  agentWorkflowLayer,
  clientOrderIdFromCreateBody: (...args) => clientOrderIdFromCreateBody(...args),
  ensureLeaderWorkflowActionTasks,
  estimateRunWindow,
  filterLeaderWorkflowPlannedTasks,
  inferTaskSequence,
  inferTaskType,
  isLargeAgentTeamIntent,
  isManagedSampleAgent,
  isWorkflowLeaderTask,
  leaderBlockedDispatchTaskTypes,
  leaderControlContractForTask,
  leaderPlannerAllowsCandidateAgentTasksFromDefinition,
  leaderPlannerCandidateAgents,
  leaderPlannerManifestCatalog,
  leaderSourceCollectionLayerTasks,
  leaderTaskDispatchAllowlist,
  normalizeAgentTags,
  normalizeLeaderWorkflowPlannedTasks,
  normalizeTaskTypes,
  nowIso,
  openChatIntentEnvValue,
  assignAgentForTask,
  selectedAgentIdFromOrderBody,
  selectedAgentTaskTypeFromOrderBody,
  workflowDispatchLayer,
  workflowLeaderActionProtocol: (...args) => workflowLeaderActionProtocol(...args),
  workflowTagHintsForTask
});
const {
  buildWorkflowEstimate,
  buildWorkflowParentJob,
  compactRetryReuseArtifactsForJobStorage,
  maybeRefineWorkflowPlanWithLeaderLlm,
  planWorkflowAssignments,
  workflowPlannedTasksFromOrderBody,
  workflowReuseArtifactsByTaskFromOrderBody,
  workflowReuseArtifactStorageMeta
} = workflowPlanAssemblyHelpers;

const orderStrategyHelpers = createOrderStrategyHelpers({
  inferTaskType,
  isWorkflowLeaderTask,
  leaderSpecialistTaskForFollowupFromDefinition,
  normalizeTaskTypes,
  planWorkflowAssignments,
  selectedAgentIdFromOrderBody,
  selectedAgentIsLeader,
  selectedAgentTaskTypeFromOrderBody,
  workflowPlannedTasksFromOrderBody
});
const {
  isAutoWorkflowSpecialtyTask,
  normalizeOrderStrategy,
  orderBodyWithLeaderFollowupSpecialistRouting,
  orderStrategyWithFollowupContext,
  requestedFollowupJobIdFromCreateBody,
  resolveOrderStrategy
} = orderStrategyHelpers;

const requestIdentityHelpers = createRequestIdentityHelpers({
  aliasLoginsForAccount,
  isAgentOwnedByLogin,
  runtimePolicy
});
const {
  authorizeAgentOwnerAction,
  authorizeConnectedAgentAction,
  extractAgentToken,
  identityLoginsForCurrent,
  isAgentOwnedByCurrent,
  loginsForCurrentAccount,
  requesterOwnsJobForCurrent,
  requireWriteAccess,
  secretEquals
} = requestIdentityHelpers;
const {
  canReviewAgents,
  canReviewFeedbackReports,
  canUsePlatformResend,
  canUseProductionDebugRoute,
  canViewAdminDashboard,
  orderUiLabelsFromAppSettings
} = createOperatorAccessHelpers({
  agentReviewerLogins,
  feedbackReviewerLogins,
  identityLoginsForCurrent,
  platformAdminLogins,
  runtimePolicy,
  WORK_ORDER_UI_LABELS
});
const {
  rateLimitResponseForRequest
} = createRateLimitHelpers({
  buckets: rateLimitBuckets,
  json,
  rateLimitSpecForPath
});
const requestVisibilityHelpers = createRequestVisibilityHelpers({
  billingAuditsForJobIds,
  canReviewFeedbackReports,
  canViewAdminDashboard,
  clearJobAuthorityRequest,
  cloneJob,
  identityLoginsForCurrent,
  normalizeJobStatus,
  publicEventView,
  requesterOwnsJobForCurrent,
  runtimePolicy
});
const {
  canViewJobFromRequest,
  jobListPaginationFromRequest,
  sanitizeDeliveryItemForViewer,
  sanitizeJobForViewer,
  visibleBillingAuditsForRequest,
  visibleDeliveryItemsForRequestFast,
  visibleEventsForRequest,
  visibleJobsForRequest,
  visibleJobsForRequestFast
} = requestVisibilityHelpers;

const workflowAuthorityGate = createWorkflowAuthorityGate({
  authorityBlockReasonFromRequest,
  authorityBool,
  authorityRequestFromReport,
  authorityRequestIsExternalWriteOrPublish,
  authorityRequestRequiresApproval,
  authorityStringList,
  buildAgentTeamDeliveryOutput,
  clearDeliveryCompletionGate,
  clearJobAuthorityRequest,
  cloneJob,
  executorStatePatchFromAuthorityRequest,
  isTerminalJobStatus,
  isWorkflowLeaderTask,
  normalizeAuthorityRequest,
  normalizeJobStatus,
  nowIso,
  sortWorkflowChildren,
  workflowChildIsSaasHandoffOnly: (...args) => workflowChildIsSaasHandoffOnly(...args),
  workflowTaskName,
  workflowUsesSaasPublishHandoff
});
const {
  authorityRequestHandledBySaasHandoff,
  markJobBlockedForAuthority,
  pauseTerminalWorkflowChildRetryForParentAuthority,
  pauseWorkflowChildDispatchForParentAuthority,
  shouldBlockCompletedJobForAuthorityRequest,
  syncJobAuthorityRequest,
  workflowParentAuthorityRequest
} = workflowAuthorityGate;

workflowChildProgressHelpers = createWorkflowChildProgressHelpers({
  authorityRequestFromReport,
  authorityRequestHandledBySaasHandoff,
  authorityRequestRequiresApproval,
  authorityStringList,
  isWorkflowLeaderTask,
  workflowBrokerWorkflowForJob,
  workflowChildIsSaasHandoffOnly: (...args) => workflowChildIsSaasHandoffOnly(...args),
  workflowDispatchLayer,
  workflowSequencePhaseForJob,
  workflowTaskName
});

const accountEventHelpers = createAccountEventHelpers({
  accountSettingsForLogin,
  buildReadableCookie,
  conversionEventPayload: createConversionEventPayload,
  eventCookieName: GA4_AUTH_EVENT_COOKIE,
  makeEvent,
  nowIso,
  upsertAccountSettingsInState
});
const {
  claimSignupWelcomeEmailAttempt,
  ga4AuthEventCookieForAccount,
  mutateAccountByLogin,
  touchEvent,
  trackAuthConversionEvent,
  trackAuthLoginCompletion,
  trackAuthLoginFailure
} = accountEventHelpers;

const googleIntegrationHelpers = createGoogleIntegrationHelpers({
  accountSettingsForLogin,
  decryptConnectorSecret,
  fetchJson,
  googleConnectorFromOAuthToken,
  mutateAccountByLogin,
  sessionHasGoogleOauth,
  upsertAccountSettingsInState
});
const {
  fetchGoogleUserProfile,
  googleConnectorTokenExpired,
  googleAccessTokenForConnector,
  googleAccessTokenForCurrent,
  fetchGoogleAuthorizedJson,
  googleApiErrorReason,
  googleApiRecoveryHint,
  googleApiWarning,
  googleApiErrorPayload,
  encodeBase64UrlUtf8,
  buildPlainTextEmailRaw,
  sendGoogleGmailMessage,
  googleClientId,
  googleClientSecret,
  googleConfigured,
  googleOAuthScope,
  googleLoginScope,
  googleAnalyticsScope,
  googleScopeGroupsForCapability,
  googleScopeGroupLabel,
  googleOAuthScopeGroupsFromUrl,
  googleOAuthCapabilitiesFromGroups,
  googleScopedOAuthScope,
  googleScopeString,
  googleConnectorScopeSet,
  googleConnectorHasScopeGroup,
  missingGoogleScopeGroups,
  googleScopeGroupForAssetInclude,
  googleScopeForOAuthAction,
  googleRequestedScopeForOAuthState,
  googlePromptForOAuthAction,
  googleScopeList
} = googleIntegrationHelpers;

const emailNotificationHelpers = createEmailNotificationHelpers({
  claimSignupWelcomeEmailAttempt,
  touchEvent
});
const {
  maybeSendMonthlyUpdateEmail,
  maybeSendSignupWelcomeEmail,
  sendEmailAuthLink
} = emailNotificationHelpers;

const billingOutcomeHelpers = createBillingOutcomeHelpers({
  billingModeFromJob,
  billingPeriodId,
  billingProfileForAccount,
  canViewAdminDashboard,
  isBillableJob,
  nowIso,
  settleBillingForJobInState,
  settleOpenAiCostForJobInState,
  touchEvent
});
const {
  appendBillingAudit,
  billingApiKeyModeForRequester,
  billingLogLine,
  billingModeForRequester,
  recordBillingOutcome,
  settleAgentEarnings
} = billingOutcomeHelpers;

const workflowJobResultHandlers = createWorkflowJobResultHandlers({
  agentCompletionFailureReason,
  appendWorkflowOriginalInfoUsage,
  authorityBlockReasonFromRequest,
  authorityRequestFromReport,
  billingLogLine,
  canTransitionJob,
  clearDeliveryCompletionGate,
  cloneJob,
  deliveryPayloadValueToText,
  estimateBilling,
  isAgentVerified,
  isBlockedAgentResultStatus,
  isTerminalJobStatus,
  markAgentCompletionFailedFreeInState,
  normalizeAgentReportPayload,
  normalizeDeliveryPayloadFiles,
  nowIso,
  providerRunAttempts,
  reconcileWorkflowParent,
  releaseBillingReservationInState,
  setDeliveryCompletionGate,
  settleAgentEarnings,
  shouldBlockCompletedJobForAuthorityRequest,
  sourceCollectionFailureRetryMeta,
  syncJobAuthorityRequest,
  topLevelAgentReportCandidate,
  transitionErrorCode,
  usageWithObservedJobTokens,
  workflowChildDispatchFailureRequiresRestart,
  workflowRestartRequiredReason,
  workflowSearchCompletionFailureReason,
  workflowTaskName
});
const {
  completeJobFromAgentResult,
  failJob
} = workflowJobResultHandlers;

const authContextHelpers = createAuthContextHelpers({
  accountHasGithubConnector,
  accountHasGoogleConnector,
  accountHasXConnector,
  accountIdentityForProvider,
  accountSettingsForIdentity,
  accountSettingsForLogin,
  aliasLoginsForAccount,
  authenticateOrderApiKey,
  claimSignupWelcomeEmailAttempt,
  configuredBaseUrls,
  csrfExemptPath,
  defaultLoginForAuthUser,
  getSession,
  hmacSha256Base64Url,
  isUnsafeMethod,
  json,
  lightweightCurrentFromSession,
  linkIdentityToAccountInState,
  maybeGrantWelcomeCreditsForSignupInState,
  maybeSendSignupWelcomeEmail,
  mergeAccountsInState,
  mutateAccountByLogin,
  parseCookies,
  runtimePolicy,
  runtimeStorage,
  secretEquals,
  sessionAuthProvider,
  sessionCookieName: SESSION_COOKIE,
  sessionHasGithubApp,
  sessionHasGithubOauth,
  sessionHasGoogleOauth,
  sessionSecretMaterial,
  touchEvent,
  trackAuthConversionEvent,
  trackAuthLoginCompletion,
  upsertAccountSettingsForIdentityInState,
  upsertAccountSettingsInState
});
const {
  accountUserFromSettings,
  csrfTokenForRequest,
  currentAgentRequesterContext,
  currentAgentRequesterContextWithAccount,
  currentOrderRequesterContext,
  currentUserContext,
  enforceBrowserWriteProtection,
  extractOrderApiKey,
  linkSessionIdentityToAccount,
  oauthCallbackCurrentContext,
  persistAccountForIdentity,
  requestSourceOrigin,
  requireAgentWriteAccess,
  requireOrderWriteAccess,
  trustedOrigins
} = authContextHelpers;

const orderCreateRequestHelpers = createOrderCreateRequestHelpers({
  accountIdForLogin,
  accountSettingsForLogin,
  accountUserFromSettings
});
const {
  createJobResponseFromPersistedJob,
  currentFromRecurringOrder,
  jobPromptMatchesCreateBody,
  jobRequesterMatchesCurrent,
  jobSessionMatchesCreateBody,
  orderCreateBodyIsSameContentNewOrderRetry,
  orderCreateSkipIntake,
  orderCreateSkipPrePersistencePlanning,
  persistedJobForClientOrderId,
  promptPolicyBlockPayload
} = orderCreateRequestHelpers;

const marketplaceRegistrationHelpers = createMarketplaceRegistrationHelpers({
  agentReviewRouteBlockReason,
  boolFlag,
  buildAgentId,
  buildAgentRoutingConfirmation,
  currentUserContext,
  inferAgentTagsFromSignals,
  isAgentReviewApproved,
  isCoreFeatureAppId,
  json,
  loginsForCurrentAccount,
  maybeGrantWelcomeCreditsForVerifiedAgentInState,
  normalizeAppManifest,
  normalizeTaskTypes,
  nowIso,
  pricingHelpers: {
    creatorFeeRateFromInput,
    marketplaceFeeRateFromInput,
    nonNegativeUsdFromInput,
    overageModeFromInput,
    platformMarginRateFromInput,
    pricingModelFromInput,
    providerMarkupRateFromInput
  },
  publicAgent,
  publicApp,
  runtimePolicy,
  runAgentAutoReview,
  touchEvent,
  validateAppManifest,
  validateManifestUrlInput,
  verifyAgentByHealthcheck,
  WELCOME_CREDITS_GRANT_AMOUNT
});
const {
  createAgentFromInput,
  createAgentFromManifest,
  agentRoutingConfirmationResponse,
  applyVerificationToAgentRecord,
  maybeAutoVerifyImportedAgent,
  appManifestOptionsForRequest,
  loadAppManifestFromUrl,
  appOwnerMatches,
  authorizeAppOwnerAction,
  applyVerificationToAppRecord,
  verifyAppHealth,
  ownerInfoFromRequest,
  recordOrderApiKeyUsage,
  requestHostLooksLocal,
  agentSafetyOptionsForRequest,
  agentSafetyErrorResponse,
  runAgentReviewForRequest
} = marketplaceRegistrationHelpers;

const authStatusRoutes = createAuthStatusRouteHandlers({
  accountHasGithubConnector,
  accountHasGoogleConnector,
  accountHasXConnector,
  accountIdentityForProvider,
  baseUrl,
  canReviewAgents,
  canReviewFeedbackReports,
  canViewAdminDashboard,
  csrfTokenForRequest,
  getSession,
  githubAppConfigured,
  githubAppInstallationsFromSession,
  githubAppReposFromSession,
  githubClientId,
  githubClientSecret,
  githubGrantedScopes,
  githubOAuthScope,
  githubPrivateRepoImportEnabled,
  googleConfigured,
  googleConnectorForAccount,
  googleConnectorScopeSet,
  googleOAuthCapabilitiesFromGroups,
  identityLoginsForCurrent,
  lightweightCurrentFromSession,
  missingGoogleScopeGroups,
  requestOrigin,
  resendConfigured,
  runtimePolicy,
  runtimeStorage,
  sessionHasGithubApp,
  sessionHasGithubOauth,
  xOAuthConfigured,
  xOAuthScopeLabel,
  xTokenEncryptionConfigured
});
const {
  authStatus,
  chatMemoryAuthStatus
} = authStatusRoutes;

const authHelpers = createAuthHelpers({
  baseUrl,
  fetchStaticAsset: (assetRequest, env) => env.ASSETS.fetch(assetRequest),
  getSession,
  maybeRefreshSessionCookie,
  redirect,
  redirectWithCookies,
  responseWithCookies
});
const {
  authFailureRedirectPath,
  authSuccessRedirectPath,
  handleAdminPageRequest,
  handleChatPageRequest,
  handleLoginPageRequest,
  hasOAuthBaseSession,
  isAdminPagePath,
  isChatPagePath,
  isLoginPagePath,
  normalizeLocalRedirectPath,
  normalizeOAuthLoginSource,
  normalizeOAuthVisitorId,
  shouldLinkOAuthCallback
} = authHelpers;

const githubAppAccessHelpers = createGithubAppAccessHelpers({
  baseUrl,
  fetchGithubUserProfile,
  githubAppInstallationToken,
  githubAppUserInstallationRepos,
  githubAppUserInstallations,
  githubAppUserTokenFromCode,
  githubUserRecord,
  mutateAccountByLogin,
  nowIso,
  sessionHasGithubApp,
  upsertAccountSettingsInState
});
const {
  buildGithubAppSession,
  githubAppRepoTokenForRequester,
  githubAppReposForSession,
  persistGithubAppAccess
} = githubAppAccessHelpers;

const authRoutes = createAuthRouteHandlers({
  accountIdentityForProvider,
  accountSettingsForLogin,
  authFailureRedirectPath,
  authSuccessRedirectPath,
  baseUrl,
  buildGithubAppSession,
  connectorTokenEncryptionConfigured,
  consumeOAuthState,
  fetchGithubUserProfile,
  fetchGoogleUserProfile,
  fetchJson,
  ga4AuthEventCookieForAccount,
  getSession,
  githubAppClientId,
  githubAppConfigured,
  githubAppInstallSlug,
  githubAppRecommendedSettings,
  githubAppReposForSession,
  githubClientId,
  githubClientSecret,
  githubConnectorFromOAuthToken,
  githubOAuthScope,
  githubUserRecord,
  googleClientId,
  googleClientSecret,
  googleConfigured,
  googleConnectorFromOAuthToken,
  googleOAuthScopeGroupsFromUrl,
  googlePromptForOAuthAction,
  googleRequestedScopeForOAuthState,
  googleScopeForOAuthAction,
  googleScopeString,
  googleUserRecord,
  hmacSha256Base64Url,
  json,
  linkedProvidersFromAccount,
  linkSessionIdentityToAccount,
  makeSessionCookie,
  mergeLinkedSession,
  mutateAccountByLogin,
  normalizeLocalRedirectPath,
  normalizeOAuthLoginSource,
  normalizeOAuthVisitorId,
  oauthCallbackCurrentContext,
  oauthCapabilitiesFromUrl,
  openPayload,
  parseBody,
  persistAccountForIdentity,
  persistGithubAppAccess,
  pushOAuthStateCookie,
  redirect,
  redirectWithCookies,
  resendConfigured,
  runtimeStorage,
  sealPayload,
  secretEquals,
  securityHeaders,
  sendEmailAuthLink,
  sessionHasGithubApp,
  sessionHasGithubOauth,
  shouldLinkOAuthCallback,
  trackAuthLoginFailure,
  upsertAccountSettingsInState,
  validateEmailAddress
});
const {
  e2eAuthSecret,
  handleAuthCallback,
  handleAuthStart,
  handleE2eAuthVerify,
  handleEmailAuthRequest,
  handleEmailAuthVerify,
  handleGithubAppCallback,
  handleGithubAppConnectStart,
  handleGithubAppInstallStart,
  handleGithubAppSetup,
  handleGoogleAuthCallback,
  handleGoogleAuthStart
} = authRoutes;

const adminDashboardRoutes = createAdminDashboardRouteHandlers({
  getSession,
  json,
  nowIso,
  platformAdminLogins,
  sessionAuthProvider
});
const {
  handleAdminDashboardApi
} = adminDashboardRoutes;

const connectorRoutes = createConnectorRouteHandlers({
  accountSettingsForLogin,
  baseUrl,
  buildXAuthorizeUrl,
  buildXPkcePair,
  connectorOAuthActionInstruction,
  connectorTokenEncryptionConfigured,
  createWordPressDraft,
  currentAgentRequesterContext,
  currentAgentRequesterContextWithAccount,
  currentUserContext,
  encryptConnectorSecret,
  exchangeXOAuthCode,
  fetchXProfile,
  hasPostConfirmation,
  isPrivateNetworkHostname,
  json,
  normalizeLocalRedirectPath,
  normalizeOAuthLoginSource,
  normalizeOAuthVisitorId,
  normalizeWordPressSiteUrl,
  nowIso,
  parseBody,
  postXTweet,
  publicWordPressConnectorStatus,
  publicXConnectorStatus,
  pushOAuthStateCookie,
  recordOrderApiKeyUsage,
  redirect,
  redirectWithCookies,
  runtimeStorage,
  testWordPressApplicationPassword,
  touchEvent,
  upsertAccountSettingsInState,
  validateXPostExecutionApproval,
  validateXPostText,
  wordpressConnectorFromApplicationPassword,
  xConnectorFromOAuthToken,
  xOAuthConfigured,
  xTokenEncryptionConfigured
});

const providerIdentityRoutes = createProviderIdentityRouteHandlers({
  accountSettingsForLogin,
  canViewAdminDashboard,
  currentUserContext,
  nowIso,
  parseBody,
  sanitizeAccountSettingsForClient,
  touchEvent,
  upsertAccountSettingsInState
});
const {
  getAdminProviderIdentityVerification,
  reviewAdminProviderIdentityVerification,
  submitProviderIdentityVerification
} = providerIdentityRoutes;

const apiKeyRoutes = createApiKeyRouteHandlers({
  accountUserFromSettings,
  canViewAdminDashboard,
  currentUserContext,
  parseBody,
  runtimePolicy,
  secretEquals,
  touchEvent
});
const {
  createAdminOrderApiKey,
  createOrderApiKey,
  listOrderApiKeys,
  revokeOrderApiKey
} = apiKeyRoutes;

const settingsRoutes = createSettingsRouteHandlers({
  accountSettingsForLogin,
  accountHash,
  buildMonthlyAccountSummary,
  currentUserContext,
  getSession,
  lightweightCurrentFromSession,
  nowIso,
  parseBody,
  requestedBillingPeriod,
  touchEvent
});
const {
  deleteCurrentAccount,
  getSettingsPayload,
  saveSettingsSection
} = settingsRoutes;

const appSettingsRoutes = createAppSettingsRouteHandlers({
  canViewAdminDashboard,
  currentUserContext,
  getSession,
  lightweightCurrentFromSession,
  nowIso,
  parseBody
});
const {
  deleteAppSetting,
  getAppSettings,
  saveAppSetting
} = appSettingsRoutes;

const exactActionRoutes = createExactActionRouteHandlers({
  canViewAdminDashboard,
  currentUserContext,
  nowIso,
  parseBody
});
const {
  deleteExactMatchAction,
  getExactMatchActions,
  saveExactMatchAction
} = exactActionRoutes;

const analyticsRoutes = createAnalyticsRouteHandlers({
  currentUserContext,
  parseBody,
  touchEvent
});
const {
  recordAnalyticsEvent
} = analyticsRoutes;

const campaignRoutes = createCampaignRouteHandlers({
  canViewAdminDashboard,
  catalogPagePayload,
  currentOrderRequesterContext,
  identityLoginsForCurrent,
  nowIso,
  parseBody,
  touchEvent
});
const {
  campaignsPayload,
  createCampaignPayload,
  campaignDetailPayload,
  updateCampaignPayload,
  publisherCampaignIngestPayload,
  campaignMetricsPayload,
  appendCampaignMetricsPayload,
  campaignIntegrationsPayload,
  updateCampaignIntegrationsPayload,
  campaignLeadSourcePayload,
  updateCampaignLeadSourcePayload,
  campaignAdsPayload,
  updateCampaignAdsPayload
} = campaignRoutes;

const catalogRoutes = createCatalogRouteHandlers({
  leaderReadableAgentCatalogIndex,
  nowIso,
  publicAgent,
  publicApp
});
const {
  agentCatalogIndexPayload,
  agentsCatalogPayload,
  appsCatalogPayload
} = catalogRoutes;

const chatMemoryRoutes = createChatMemoryRouteHandlers({
  accountHash,
  canViewAdminDashboard,
  chatMemoryAuthStatus,
  currentUserContext,
  getSession,
  identityLoginsForCurrent,
  lightweightCurrentFromSession,
  ownChatMemoryForClient
});
const {
  chatMemoryPayload,
  chatSessionSnapshotHideIds,
  d1ChatMemoryForCurrent,
  d1ChatMemoryTranscriptsForCurrent,
  normalizeChatMemoryHiddenIdForWorker,
  relatedChatMemoryHideIds
} = chatMemoryRoutes;

const snapshotHelpers = createSnapshotHelpers({
  accountSettingsForLogin,
  appSettingsMap,
  authStatus,
  buildAdminDashboard,
  buildConversionAnalytics,
  buildMonthlyAccountSummary,
  canReviewFeedbackReports,
  canViewAdminDashboard,
  chatTranscriptsForClient,
  currentUserContext,
  d1ChatMemoryForCurrent,
  feedbackReportsForClient,
  getSession,
  identityLoginsForCurrent,
  jobListPaginationFromRequest,
  lazyAppSettingsMap,
  lightweightCurrentFromSession,
  ownChatMemoryForClient,
  publicAgent,
  publicApp,
  recoverMissingAccountsInState,
  recurringOrdersVisibleToLogin,
  sanitizeAccountSettingsForClient,
  sanitizeExactMatchActionsForClient,
  statsOf,
  visibleBillingAuditsForRequest,
  visibleEventsForRequest,
  visibleJobsForRequest,
  visibleJobsForRequestFast
});
const {
  snapshot
} = snapshotHelpers;

const appRoutes = createAppRouteHandlers({
  appContextIsExpired,
  appManifestOptionsForRequest,
  applyVerificationToAppRecord,
  authorizeAppOwnerAction,
  canViewAdminDashboard,
  createAppContextRecord,
  createAppFromInput,
  createAppFromManifest,
  currentAgentRequesterContext,
  isCoreFeatureAppId,
  json,
  loadAppManifestFromUrl,
  loginsForCurrentAccount,
  normalizeAppManifest,
  nowIso,
  ownerInfoFromRequest,
  parseBody,
  publicApp,
  publicAppContext,
  publicPublisherItem,
  publisherRecordsFromContext,
  recordOrderApiKeyUsage,
  requireAgentWriteAccess,
  runtimePolicy,
  shapePublisherContextWithOpenAi,
  touchEvent,
  validateAppManifest,
  validateManifestUrlInput,
  verifyAppHealth
});
const {
  handleRegisterApp,
  handleImportAppManifest,
  handleImportAppUrl,
  handleAppHandoff,
  handleCreateAppContext,
  handlePublisherContextIngest,
  handleListPublisherItems,
  handleGetAppContext,
  handleListAppContexts,
  handleVerifyApp,
  handleDeleteApp
} = appRoutes;

const agentRegistrationRoutes = createAgentRegistrationRouteHandlers({
  agentRoutingConfirmationAccepted,
  agentRoutingConfirmationResponse,
  agentSafetyErrorResponse,
  agentSafetyOptionsForRequest,
  applyAgentReviewToAgentRecord,
  applyConfirmedAgentRoutingToAgent,
  assessAgentRegistrationSafety,
  createAgentFromInput,
  createAgentFromManifest,
  currentAgentRequesterContext,
  json,
  loadManifestFromUrl,
  maybeAutoVerifyImportedAgent,
  normalizeManifest,
  ownerInfoFromRequest,
  parseBody,
  providerMoneyReadinessForCurrent,
  recordOrderApiKeyUsage,
  requireAgentWriteAccess,
  runAgentReviewForRequest,
  touchEvent,
  validateManifest
});
const {
  handleRegisterAgent,
  handleImportManifest,
  handleImportUrl
} = agentRegistrationRoutes;

const agentManagementRoutes = createAgentManagementRouteHandlers({
  MAX_PROVIDER_MARKUP_RATE,
  WELCOME_CREDITS_GRANT_AMOUNT,
  agentReviewRouteBlockReason,
  agentSafetyOptionsForRequest,
  applyAgentReviewToAgentRecord,
  assessAgentRegistrationSafety,
  authorizeAgentOwnerAction,
  baseUrl,
  canReviewAgents,
  currentAgentRequesterContext,
  currentUserContext,
  isAgentReviewApproved,
  json,
  manualAgentReviewFromBody,
  maybeGrantWelcomeCreditsForVerifiedAgentInState,
  nonNegativeUsdFromInput,
  normalizeManifest,
  nowIso,
  overageModeFromInput,
  parseBody,
  pricingModelFromInput,
  providerMarkupRateFromInput,
  publicAgent,
  recordOrderApiKeyUsage,
  runAgentOnboardingCheck,
  runAgentReviewForRequest,
  touchEvent,
  verifyAgentByHealthcheck
});
const {
  handleDeleteAgent,
  handleUpdateAgentPricing,
  handleReviewAgent,
  handleVerifyAgent,
  handleAgentOnboardingCheck
} = agentManagementRoutes;

const agentExecutionRoutes = createAgentExecutionRouteHandlers({
  authorizeConnectedAgentAction,
  canTransitionJob,
  cloneJob,
  completeJobFromAgentResult,
  currentUserContext,
  extractCallbackToken,
  failJob,
  isAgentVerified,
  isTerminalJobStatus,
  json,
  normalizeCallbackPayload,
  nowIso,
  parseBody,
  publicAgent,
  reconcileWorkflowParent,
  recordBillingOutcome,
  secretEquals,
  touchEvent,
  transitionErrorCode
});
const {
  handleClaimJob,
  handleSubmitResult,
  handleAgentCallback
} = agentExecutionRoutes;

const mcpRoutes = createMcpRouteHandlers({
  parseBody,
  publicAgent,
  publicApp,
  runtimePolicy
});
const {
  getMcpDiscoveryPayload,
  handleMcpRequest
} = mcpRoutes;

const openChatIntentSupport = createOpenChatIntentSupport({
  WORK_ORDER_UI_LABELS,
  agentPatternFitScore,
  agentTagsFromRecord,
  buildIntakeClarification,
  chatTrainingExamplesForClient,
  d1ChatMemoryTranscriptsForCurrent,
  deliveryActionContractForType,
  getSession,
  inferTaskType,
  isAgentGroupRecord,
  isAgentVerified,
  lightweightCurrentFromSession,
  ownChatMemoryForClient,
  publicAgent,
  requestSourceOrigin,
  resolveAgentJobEndpoint,
  sampleKindFromAgent,
  trustedOrigins
});
const {
  authorizeOpenChatIntentLlm,
  buildIntakeClarificationWithAi,
  buildOpenChatRuntimeContextMarkdown,
  classifyDeliveryArtifactWithOpenAi,
  classifyOpenChatIntent,
  lazyOpenChatRuntimeState
} = openChatIntentSupport;

const openChatRoutes = createOpenChatRouteHandlers({
  authorizeOpenChatIntentLlm,
  buildOpenChatRuntimeContextMarkdown,
  classifyOpenChatIntent,
  lazyAppSettingsMap,
  lazyOpenChatRuntimeState,
  orderUiLabelsFromAppSettings,
  parseBody,
  promptInjectionGuardForPrompt,
  promptPolicyBlockPayload
});
const {
  handleOpenChatIntent
} = openChatRoutes;

const workOrderRoutes = createWorkOrderRouteHandlers({
  accountSettingsForLogin,
  authorizeOpenChatIntentLlm,
  buildIntakeClarification,
  buildIntakeClarificationWithAi,
  buildOpenChatRuntimeContextMarkdown,
  classifyOpenChatIntent,
  currentUserContext,
  inferTaskType,
  isAutoWorkflowSpecialtyTask,
  isDeveloperExecutionIntentText,
  lazyAppSettingsMap,
  lazyOpenChatRuntimeState,
  leaderTaskTypeForInitialWork,
  normalizeOrderStrategy,
  openChatIntentEnvValue,
  openChatIntentLanguage,
  optimizeOrderPromptForBroker,
  orderBodyWithLeaderFollowupSpecialistRouting,
  orderPreflightForAgent,
  orderStrategyWithFollowupContext,
  orderUiLabelsFromAppSettings,
  parseBody,
  assignAgentForTask,
  promptInjectionGuardForPrompt,
  promptPolicyBlockPayload,
  resolveOrderStrategy,
  resolveStaticWorkAction,
  sampleAgentDefinitionForKind,
  selectedAgentIdFromOrderBody,
  selectedAgentNameFromOrderBody,
  selectedAgentTaskTypeFromOrderBody
});
const {
  applyActiveConversationOwnerLockToOrderBody,
  prepareWorkOrderRequest,
  preflightWorkOrderRequest,
  resolveWorkActionRequest,
  resolveWorkIntentRequest
} = workOrderRoutes;

const recurringOrderRoutes = createRecurringOrderRouteHandlers({
  canViewAdminDashboard,
  createRecurringOrderInState,
  currentOrderRequesterContext,
  deleteRecurringOrderInState,
  identityLoginsForCurrent,
  json,
  parseBody,
  promptInjectionGuardForPrompt,
  promptPolicyBlockPayload,
  recordOrderApiKeyUsage,
  recurringOrdersVisibleToLogin,
  requireOrderWriteAccess,
  touchEvent,
  updateRecurringOrderInState
});
const {
  handleListRecurringOrders,
  handleCreateRecurringOrder,
  handleUpdateRecurringOrder,
  handleDeleteRecurringOrder
} = recurringOrderRoutes;

const feedbackChatRoutes = createFeedbackChatRouteHandlers({
  accountHash,
  accountSettingsForLogin,
  canReviewFeedbackReports,
  chatSessionIdForJob,
  chatSessionSnapshotHideIds,
  chatTrainingExamplesForClient,
  createChatTranscript,
  createFeedbackReport,
  currentUserContext,
  feedbackReportsForClient,
  forwardFeedbackReportEmail,
  getSession,
  hideChatMemoryTranscriptForLoginInState,
  jobsVisibleToLogin,
  lightweightCurrentFromSession,
  normalizeChatMemoryHiddenIdForWorker,
  nowIso,
  ownChatMemoryForClient,
  parseBody,
  relatedChatMemoryHideIds,
  sanitizeAccountSettingsForClient,
  sanitizeFeedbackReportForClient,
  touchEvent,
  updateChatTranscriptReviewInState,
  updateFeedbackReportInState
});
const {
  hideOwnChatMemory,
  listChatTrainingData,
  listFeedbackReports,
  recordChatSessionSnapshot,
  recordChatTranscript,
  submitFeedbackReport,
  updateChatTranscriptReview,
  updateFeedbackReport
} = feedbackChatRoutes;

const integrationRoutes = createIntegrationRouteHandlers({
  accountSettingsForLogin,
  agentSafetyErrorResponse,
  agentSafetyOptionsForRequest,
  appendEmailDelivery,
  applyAgentReviewToAgentRecord,
  assessAgentRegistrationSafety,
  buildDraftManifestFromRepoAnalysisWithAi,
  buildGithubAdapterPlan,
  canUsePlatformResend,
  clearCookie,
  connectorActionLabel,
  connectorScopeSet: googleConnectorScopeSet,
  createAgentFromManifest,
  createGithubBranch,
  createGithubPullRequest,
  currentAgentRequesterContext,
  currentAgentRequesterContextWithAccount,
  fetchGithubBranchSha,
  fetchAllGithubRepos,
  fetchGithubManifestCandidate,
  fetchGithubPublicRepos,
  fetchGithubRepoMeta,
  fetchGithubRepoTree,
  fetchGithubTextFile,
  fetchGoogleAuthorizedJson,
  findKnownBrokerPath,
  GITHUB_ADAPTER_MARKER,
  githubAppRepoTokenForRequester,
  githubAppReposForSession,
  githubPermissionError,
  githubSessionCanReadPrivateRepos,
  googleAccessTokenForConnector,
  googleAccessTokenForCurrent,
  googleApiErrorPayload,
  googleApiWarning,
  googleConnectorForAccount,
  googleConnectorHasScopeGroup,
  googleOAuthCapabilitiesFromGroups,
  googleScopeGroupForAssetInclude,
  googleScopeGroupLabel,
  hasAdapterPrConfirmation,
  hasRepoWriteConfirmation,
  hasSendConfirmation,
  json,
  jsonWithCookies,
  loadGithubManifestDraftSignals,
  MANIFEST_CANDIDATE_PATHS,
  missingGoogleScopeGroups,
  nowIso,
  ownerInfoFromRequest,
  parseAndValidateManifest,
  parseBody,
  persistGithubAppAccess,
  postXTweet,
  providerMoneyReadinessForCurrent,
  recordOrderApiKeyUsage,
  resendConfigured,
  runAgentReviewForRequest,
  runtimeStorage,
  sendGoogleGmailMessage,
  sendResendEmail,
  sessionHasGithubApp,
  sessionHasGithubOauth,
  sessionHasGoogleOauth,
  sessionCookieName: SESSION_COOKIE,
  oauthStateCookieName: OAUTH_STATE_COOKIE,
  touchEvent,
  upsertGithubTextFile,
  upsertAccountSettingsInState,
  validateEmailAddress,
  validateXPostExecutionApproval,
  validateXPostText,
  adapterNextStepText
});

const recurringOrderSweep = createRecurringOrderSweep({
  currentFromRecurringOrder,
  dueRecurringOrders,
  executeScheduledExactConnectorAction: integrationRoutes.executeScheduledExactConnectorAction,
  handleCreateWorkflowJob,
  markRecurringOrderRunInState,
  maybeRefineWorkflowPlanWithLeaderLlm,
  normalizeBaseUrl,
  normalizeOrderStrategy,
  nowIso,
  performSingleJobCreate,
  promptInjectionGuardForPrompt,
  promptPolicyBlockPayload,
  recurringOrderToJobPayload,
  resolveOrderStrategy,
  touchEvent
});
const { runRecurringOrderSweep } = recurringOrderSweep;

const deliveryRoutes = createDeliveryRouteHandlers({
  accountSettingsForLogin,
  canViewJobFromRequest,
  createGithubBranch,
  createGithubPullRequest,
  createRecurringOrderInState,
  currentAgentRequesterContext,
  currentOrderRequesterContext,
  executeScheduledExactConnectorAction: integrationRoutes.executeScheduledExactConnectorAction,
  fetchGithubBranchSha,
  fetchGithubRepoMeta,
  fetchGithubTextFile,
  GITHUB_ADAPTER_MARKER,
  githubAppRepoTokenForRequester,
  githubPermissionError,
  handleCreateWorkflowJob,
  hasRepoWriteConfirmation,
  normalizeOrderStrategy,
  parseBody,
  performSingleJobCreate,
  prepareGuestTrialOrderContext,
  promptInjectionGuardForPrompt,
  promptPolicyBlockPayload,
  recordOrderApiKeyUsage,
  requireOrderWriteAccess,
  resolveOrderStrategy,
  sessionHasGithubApp,
  touchEvent,
  upsertGithubTextFile
});
const {
  executeDeliveryActionRequest,
  prepareDeliveryExecutionRequest,
  prepareDeliveryFollowupOrderRequest,
  prepareDeliveryPublishOrderRequest,
  prepareDeliveryPublishRequest,
  scheduleDeliveryActionRequest
} = deliveryRoutes;

const workflowWatchdog = createWorkflowWatchdog({
  buildAgentTeamDeliveryOutput,
  cloneJob,
  nowIso,
  reconcileWorkflowParent,
  refreshWorkflowLeaderHandoffForJobId,
  scheduleProgressDispatchesForJobId,
  sortWorkflowChildren,
  syncJobAuthorityRequest,
  touchEvent,
  workflowChildIsApprovalBlockedTerminal,
  workflowParentAuthorityRequest
});
const { runWorkflowOrchestrationWatchdog } = workflowWatchdog;

const workflowRetrySweep = createWorkflowRetrySweep({
  cloneJob,
  clearDeliveryCompletionGate,
  failJob,
  maxDispatchRetriesForJob,
  nowIso,
  pauseTerminalWorkflowChildRetryForParentAuthority,
  providerRunAttempts,
  reconcileWorkflowParent,
  touchEvent,
  workflowChildDispatchFailureRequiresRestart,
  workflowCompletionRetryLimitForJob,
  workflowDispatchMaxAgeMs,
  workflowProviderRunMaxAttempts,
  workflowRestartRequiredReason
});
const { runWorkflowTimeoutRetrySweep } = workflowRetrySweep;

const workflowLeaderHandoffRuntime = createWorkflowLeaderHandoff({
  isWorkflowLeaderTask,
  leaderControlContractForTask,
  leaderProtocolExtras,
  sortWorkflowChildren,
  workflowCanonicalBriefFromJob,
  workflowExecutionProgram,
  workflowHandoffPriorDeliverables,
  workflowLayerLabel,
  workflowMinimumPriorUseForPhase,
  workflowPrimaryTask,
  workflowPriorCompletedRuns,
  workflowPriorUnavailableRuns,
  workflowSlimPriorRunForHandoff,
  workflowStructuredHandoffDigestFromRun,
  workflowTaskName
});
const {
  completedWorkflowLeader,
  workflowLeaderActionProtocol,
  workflowLeaderHandoff
} = workflowLeaderHandoffRuntime;

const workflowHandoffContextRuntime = createWorkflowHandoffContext({
  downstreamHandoffSummaryInstruction,
  isWorkflowLeaderTask,
  nowIso,
  workflowAdditionalPromptBrokerWorkflow: workflowBrokerWorkflowForJob,
  workflowCanonicalBriefPromptLines,
  workflowExecutionProgram,
  workflowHandoffBlockClip,
  workflowHandoffClip,
  workflowHandoffPromptDataFromRun,
  workflowMinimumPriorUseForPhase,
  workflowSequencePhaseForJob,
  workflowStructuredDigestPromptBlock,
  workflowTaskName
});
const {
  applyWorkflowHandoffPromptContextToJob,
  extractWorkflowHandoffPromptContext,
  stripWorkflowHandoffPromptContext,
  workflowAdditionalPromptForDispatch,
  workflowBasePrompt,
  workflowHandoffPromptContext,
  workflowStoredAdditionalPrompt
} = workflowHandoffContextRuntime;

const workflowLeaderSequenceRepair = createWorkflowLeaderSequenceRepair({
  applyWorkflowHandoffPromptContextToJob,
  callbackTokenForJob,
  isWorkflowLeaderTask,
  nowIso,
  workflowLayerLabel,
  workflowPrimaryTask,
  workflowTaskName
});
const {
  rebuildMissingLeaderSequenceChildJobs
} = workflowLeaderSequenceRepair;

const workflowReconcileState = createWorkflowReconcileState({
  cloneJob,
  isWorkflowLeaderTask,
  maxDispatchRetriesForJob,
  nowIso,
  providerRunAttempts,
  syncJobAuthorityRequest,
  workflowChildAdaptiveLayer,
  workflowChildIsAdaptivePending,
  workflowSequencePhaseForJob,
  workflowTaskName
});
const {
  markWorkflowParentWaitingForChildRetry,
  workflowAgentRunChildren,
  workflowChildIsInternalLeaderSequenceRun,
  workflowChildRetryPending,
  workflowChildSnapshot,
  workflowStatusCounts,
  workflowVisibleAgentRunChildren
} = workflowReconcileState;

const workflowReconcileActions = createWorkflowReconcileActions({
  authorityRequestFromReport,
  authorityRequestHandledBySaasHandoff,
  authorityRequestRequiresApproval,
  clearJobAuthorityRequest,
  isWorkflowLeaderTask,
  leaderActionLayerStart,
  leaderExternalActionRequestedFromDefinition,
  nowIso,
  taskRequiresConnectorApproval,
  workflowChildIsApprovalBlockedTerminal,
  workflowChildIsSequentialUserActionDeferred,
  workflowChildIsTerminalForProgress,
  workflowDispatchLayer,
  workflowHumanActionIntentText,
  workflowPrimaryTask,
  workflowSequencePhaseForJob,
  workflowTaskName,
  workflowUsesSaasPublishHandoff
});
const {
  blockWorkflowPendingChildren,
  completeWorkflowSaasHandoffOnlyChild,
  completeWorkflowSaasHandoffOnlyChildren,
  markWorkflowChildAsSaasHandoffOnly,
  markWorkflowParentBlockedByLeaderQuality,
  workflowBlockedParentStatus,
  workflowChildIsActionPhase,
  workflowChildIsSaasHandoffOnly,
  workflowParentRequestedExternalExecution
} = workflowReconcileActions;

workflowParentBlockingHelpers = createWorkflowParentBlockingHelpers({
  buildAgentTeamDeliveryOutput,
  syncJobAuthorityRequest,
  sortWorkflowChildren,
  workflowAgentRunChildren,
  workflowBlockedParentStatus,
  workflowChildIsBlockingProgress,
  workflowChildIsInternalLeaderSequenceRun,
  workflowChildSnapshot,
  workflowStatusCounts,
  workflowVisibleAgentRunChildren
});

workflowEndpointDispatchHelpers = createWorkflowEndpointDispatchHelpers({
  WORKFLOW_PROGRESS_DISPATCH_MAX_TARGETS,
  agentCompletionFailureReason,
  appendWorkflowOriginalInfoUsage,
  authorityRequestFromReport,
  authorityRequestHandledBySaasHandoff,
  billingLogLine,
  buildDispatchFailureMeta,
  buildDispatchHeaders,
  buildDispatchPayload,
  clearDeliveryCompletionGate,
  cloneJob,
  completeWorkflowSaasHandoffOnlyChild,
  computeNextRetryAt,
  dispatchExecutionIsFresh,
  dispatchScheduleIsFreshForAgent,
  endpointDispatchTimeoutMs,
  estimateBilling,
  failJob,
  isTerminalJobStatus,
  markAgentCompletionFailedFreeInState,
  markJobBlockedForAuthority,
  markWorkflowParentBlockedIfNeeded,
  maxDispatchRetriesForJob,
  normalizeDispatchResponse,
  nowIso,
  postJsonWithTimeout,
  providerRunAttempts,
  providerRunLimitReached,
  recordBillingOutcome,
  reconcileWorkflowParent,
  refreshWorkflowLeaderHandoffForJobId,
  releaseBillingReservationInState,
  resolveAgentJobEndpoint,
  resolveDispatchEndpointUrl,
  scheduleProgressDispatchesForJobId,
  setDeliveryCompletionGate,
  settleAgentEarnings,
  shouldBlockCompletedJobForAuthorityRequest,
  sourceCollectionFailureRetryMeta,
  syncJobAuthorityRequest,
  touchEvent,
  usageWithObservedJobTokens,
  workflowChildDispatchFailureRequiresRestart,
  workflowChildIsAdaptivePending,
  workflowChildIsSaasHandoffOnly,
  workflowChildShouldRestartFromBeginning,
  workflowCompletionRetryLimitForJob,
  workflowDispatchQueue,
  workflowPrimaryTaskFromJobOrProfile,
  workflowProviderRunMaxAttempts,
  workflowRestartRequiredReason,
  workflowSearchCompletionFailureReason,
  workflowTaskName
});

workflowParentReconcileRuntime = createWorkflowParentReconcile({
  activateWorkflowAdaptivePendingChildren: (...args) => activateWorkflowAdaptivePendingChildren(...args),
  applyWorkflowHandoffPromptContextToJob,
  authorityRequestFromReport,
  authorityRequestRequiresApproval,
  blockWorkflowPendingChildren,
  buildAgentTeamDeliveryOutput,
  canRetryJob,
  clearJobAuthorityRequest,
  cloneJob,
  completeWorkflowSaasHandoffOnlyChildren,
  completedWorkflowLeader,
  isWorkflowLeaderTask,
  markAgentCompletionFailedFreeInState,
  markJobBlockedForAuthority,
  markWorkflowParentBlockedByLeaderQuality,
  markWorkflowParentWaitingForChildRetry,
  maxDispatchRetriesForJob,
  nowIso,
  rebuildMissingLeaderSequenceChildJobs,
  sortWorkflowChildren,
  syncJobAuthorityRequest,
  workflowAgentRunChildren,
  workflowApplyQualityReviewToLeader,
  workflowBlockedParentStatus,
  workflowCheckpointStatus,
  workflowChildIsAdaptivePending,
  workflowChildIsApprovalBlockedTerminal,
  workflowChildIsBlockingProgress,
  workflowChildIsInternalLeaderSequenceRun,
  workflowChildIsSaasHandoffOnly,
  workflowChildIsSequentialUserActionDeferred,
  workflowChildIsTerminal,
  workflowChildIsTerminalForProgress,
  workflowChildRetryPending,
  workflowChildSnapshot,
  workflowConcreteArtifactFailureReason,
  workflowDispatchLayer,
  workflowLayerLabel,
  workflowLayerQualityGate,
  workflowLeaderChildIsApprovalBlockedTerminal,
  workflowLeaderHandoff,
  workflowLeaderOutputQualityReview,
  workflowLeaderQualityGateFailed,
  workflowLeaderSequence,
  workflowParentAuthorityRequest,
  workflowParentRequestedExternalExecution,
  workflowPrimaryTask,
  workflowRestartRequiredReason,
  workflowSequencePhaseForJob,
  workflowStatusCounts,
  workflowTaskName,
  workflowVisibleAgentRunChildren
});

const jobRoutes = createJobRouteHandlers({
  ORCHESTRATION_WATCHDOG_POLICY,
  WORKFLOW_PROGRESS_DISPATCH_MAX_TARGETS,
  agentCompletionFailureReason,
  appendWorkflowOriginalInfoUsage,
  authorityRequestFromReport,
  authorityRequestHandledBySaasHandoff,
  billingLogLine,
  buildDispatchFailureMeta,
  canViewJobFromRequest,
  canRetryJob,
  clearDeliveryCompletionGate,
  cloneJob,
  completeWorkflowSaasHandoffOnlyChild,
  currentOrderRequesterContext,
  dispatchJobToAssignedAgent,
  estimateBilling,
  json,
  markAgentCompletionFailedFreeInState,
  markJobBlockedForAuthority,
  markWorkflowParentBlockedIfNeeded,
  maxDispatchRetriesForJob,
  nowIso,
  parseBody,
  providerRunAttempts,
  reconcileWorkflowParent,
  recordBillingOutcome,
  recordOrderApiKeyUsage,
  releaseBillingReservationInState,
  refreshWorkflowLeaderHandoffForJobId,
  resolveAgentJobEndpoint,
  runQueuedEndpointDispatchSweep,
  runWorkflowOrchestrationWatchdog,
  runWorkflowTimeoutRetrySweep,
  runtimePolicy,
  sanitizeJobForViewer,
  scheduleProgressDispatchesForJobId,
  settleAgentEarnings,
  setDeliveryCompletionGate,
  shouldBlockCompletedJobForAuthorityRequest,
  sourceCollectionFailureRetryMeta,
  syncJobAuthorityRequest,
  touchEvent,
  workflowChildDispatchFailureRequiresRestart,
  workflowChildIsSaasHandoffOnly,
  workflowChildShouldRestartFromBeginning,
  workflowLeaderSequenceNeedsProgress,
  workflowPrimaryTaskFromJobOrProfile,
  workflowProviderRunMaxAttempts,
  workflowRestartRequiredReason,
  workflowSearchCompletionFailureReason,
  workflowTaskName
});
const {
  handleGetJob,
  handleRetryDispatch
} = jobRoutes;

const jobAuthorityRoutes = createJobAuthorityRouteHandlers({
  WORKFLOW_PROGRESS_DISPATCH_MAX_TARGETS,
  authorityRequestFromReport,
  authorityRequestRequiresApproval,
  canViewJobFromRequest,
  clearJobAuthorityRequest,
  cloneJob,
  currentOrderRequesterContext,
  currentUserContext,
  maxDispatchRetriesForJob,
  nowIso,
  parseBody,
  reconcileWorkflowParent,
  sanitizeExecutorStatePatch,
  sanitizeJobForViewer,
  scheduleProgressDispatchesForJobId,
  touchEvent,
  workflowChildIsSequentialUserActionDeferred
});
const {
  handleApproveJobAuthority,
  updateJobExecutorState
} = jobAuthorityRoutes;

const workflowAdaptiveActivation = createWorkflowAdaptiveActivation({
  applyWorkflowHandoffPromptContextToJob,
  authorityStringList,
  completedWorkflowLeader,
  leaderSequentialUserActionPriorityFromDefinition,
  markWorkflowChildAsSaasHandoffOnly,
  maxDispatchRetriesForJob,
  nowIso,
  sortWorkflowChildren,
  taskRequiresConnectorApproval,
  workflowChildIsActionPhase,
  workflowChildIsAdaptivePending,
  workflowChildRequiresSequentialUserAction,
  workflowDispatchLayer,
  workflowHasActiveSequentialUserActionWait,
  workflowHumanActionIntentText,
  workflowLeaderHandoff,
  workflowLeaderReplanDecisionForLayer,
  workflowPrimaryTask,
  workflowTaskName
});
const {
  activateWorkflowAdaptivePendingChildren,
  recordWorkflowAdaptiveActivation,
  workflowSequentialUserActionPriority,
  workflowSequentialUserActionReleaseChildId
} = workflowAdaptiveActivation;

const workflowTimeouts = createWorkflowTimeouts({
  WORKFLOW_ACTION_CHILD_TIMEOUT_FLOOR_MS,
  WORKFLOW_CHILD_TIMEOUT_FLOOR_MS,
  WORKFLOW_PARENT_TIMEOUT_FLOOR_MS,
  DISPATCH_SCHEDULE_STALE_MS,
  DISPATCH_SCHEDULE_TIMEOUT_MS,
  computeNextRetryAt,
  isWorkflowLeaderTask,
  leaderTaskLayer,
  leaderTaskPhase,
  nowIso,
  providerRunAttempts,
  reconcileWorkflowParent,
  touchEvent,
  workflowChildDispatchFailureRequiresRestart,
  workflowChildShouldRestartFromBeginning,
  workflowCompletionRetryLimitForJob,
  workflowPrimaryTaskForJob,
  workflowProviderRunMaxAttempts,
  workflowRestartRequiredReason
});
const {
  effectiveTimeoutDeadlineMs,
  sweepTimedOutJobs
} = workflowTimeouts;

const devJobRoutes = createDevJobRouteHandlers({
  accountIdForLogin,
  appendBillingAudit,
  billingLogLine,
  currentUserContext,
  clearDeliveryCompletionGate,
  estimateBilling,
  json,
  nowIso,
  parseBody,
  assignAgentForTask,
  reconcileWorkflowParent,
  recordBillingOutcome,
  requesterContextFromUser,
  runRecurringOrderSweep,
  runWorkflowTimeoutRetrySweep,
  runtimePolicy,
  settleAgentEarnings,
  setDeliveryCompletionGate,
  sweepTimedOutJobs,
  touchEvent
});
const {
  handleRecurringSweep,
  handleResolveJob,
  handleSeed,
  handleTimeoutSweep
} = devJobRoutes;

function braveSearchConfiguredForWorkflow(...args) {
  return workflowSourceRequirementHelpers.braveSearchConfiguredForWorkflow(...args);
}

function workflowJobRequiresSearch(job = {}) {
  return workflowSourceRequirementHelpers.workflowJobRequiresSearch(job);
}

function workflowSourceCollectionContractForJob(...args) {
  return workflowSourceRequirementHelpers.workflowSourceCollectionContractForJob(...args);
}

function workflowSourceCollectionQualityRule(...args) {
  return workflowSourceRequirementHelpers.workflowSourceCollectionQualityRule(...args);
}

function workflowPrimaryTaskForJob(...args) {
  return workflowSourceRequirementHelpers.workflowPrimaryTaskForJob(...args);
}

function workflowMetaWithoutGlobalSearchFlags(...args) {
  return workflowSourceRequirementHelpers.workflowMetaWithoutGlobalSearchFlags(...args);
}

async function dispatchJobToAssignedAgent(...args) {
  return workflowEndpointDispatchHelpers.dispatchJobToAssignedAgent(...args);
}

async function loadDispatchJobAndAgent(...args) {
  return workflowEndpointDispatchHelpers.loadDispatchJobAndAgent(...args);
}

async function dispatchExistingJobToAssignedAgent(...args) {
  return workflowEndpointDispatchHelpers.dispatchExistingJobToAssignedAgent(...args);
}

function canAutoScheduleAsyncDispatch(...args) {
  return workflowEndpointDispatchHelpers.canAutoScheduleAsyncDispatch(...args);
}

function workflowChildPlanIndex(...args) {
  return workflowChildProgressHelpers.workflowChildPlanIndex(...args);
}

function workflowChildSortKey(...args) {
  return workflowChildProgressHelpers.workflowChildSortKey(...args);
}

function sortWorkflowChildren(...args) {
  return workflowChildProgressHelpers.sortWorkflowChildren(...args);
}

function workflowChildIsTerminal(...args) {
  return workflowChildProgressHelpers.workflowChildIsTerminal(...args);
}

function workflowChildIsAdaptivePending(...args) {
  return workflowChildProgressHelpers.workflowChildIsAdaptivePending(...args);
}

function workflowChildIsSequentialUserActionDeferred(...args) {
  return workflowChildProgressHelpers.workflowChildIsSequentialUserActionDeferred(...args);
}

function workflowChildIsLeaderReplanDeferred(...args) {
  return workflowChildProgressHelpers.workflowChildIsLeaderReplanDeferred(...args);
}

function workflowChildAdaptiveLayer(...args) {
  return workflowChildProgressHelpers.workflowChildAdaptiveLayer(...args);
}

function workflowChildIsBlockingProgress(...args) {
  return workflowChildProgressHelpers.workflowChildIsBlockingProgress(...args);
}

function workflowChildIsApprovalBlockedTerminal(...args) {
  return workflowChildProgressHelpers.workflowChildIsApprovalBlockedTerminal(...args);
}

function authorityRequestRequiresSequentialUserAction(...args) {
  return workflowChildProgressHelpers.authorityRequestRequiresSequentialUserAction(...args);
}

function workflowChildRequiresSequentialUserAction(...args) {
  return workflowChildProgressHelpers.workflowChildRequiresSequentialUserAction(...args);
}

function workflowHasActiveSequentialUserActionWait(...args) {
  return workflowChildProgressHelpers.workflowHasActiveSequentialUserActionWait(...args);
}

function workflowLeaderChildIsApprovalBlockedTerminal(...args) {
  return workflowChildProgressHelpers.workflowLeaderChildIsApprovalBlockedTerminal(...args);
}

function workflowChildIsTerminalForProgress(...args) {
  return workflowChildProgressHelpers.workflowChildIsTerminalForProgress(...args);
}

function markWorkflowParentBlockedIfNeeded(...args) {
  return workflowParentBlockingHelpers.markWorkflowParentBlockedIfNeeded(...args);
}

function workflowCompletedRunHandoff(...args) {
  return workflowPriorRunHelpers.workflowCompletedRunHandoff(...args);
}

function workflowPriorCompletedRuns(...args) {
  return workflowPriorRunHelpers.workflowPriorCompletedRuns(...args);
}

function workflowDataUnavailableOutput(...args) {
  return workflowPriorRunHelpers.workflowDataUnavailableOutput(...args);
}

function workflowUnavailablePriorRunIsOptional(...args) {
  return workflowPriorRunHelpers.workflowUnavailablePriorRunIsOptional(...args);
}

function workflowJobHasAttachedDataContext(...args) {
  return workflowPriorRunHelpers.workflowJobHasAttachedDataContext(...args);
}

function workflowOptionalUnavailablePriorRun(...args) {
  return workflowPriorRunHelpers.workflowOptionalUnavailablePriorRun(...args);
}

function workflowPriorUnavailableRuns(...args) {
  return workflowPriorRunHelpers.workflowPriorUnavailableRuns(...args);
}

function workflowLeaderPriorLayerUnavailable(...args) {
  return workflowPriorRunHelpers.workflowLeaderPriorLayerUnavailable(...args);
}

function workflowLeaderPriorLayerOptionalOnly(...args) {
  return workflowPriorRunHelpers.workflowLeaderPriorLayerOptionalOnly(...args);
}

function workflowReplanTextValue(...args) {
  return workflowLeaderSequenceHelpers.workflowReplanTextValue(...args);
}

function workflowLeaderReplanDecisionForLayer(...args) {
  return workflowLeaderSequenceHelpers.workflowLeaderReplanDecisionForLayer(...args);
}

function workflowLeaderSequence(...args) {
  return workflowLeaderSequenceHelpers.workflowLeaderSequence(...args);
}

function workflowLeaderCheckpoints(...args) {
  return workflowLeaderSequenceHelpers.workflowLeaderCheckpoints(...args);
}

function workflowCheckpointStatus(...args) {
  return workflowLeaderSequenceHelpers.workflowCheckpointStatus(...args);
}

function workflowCheckpointBlocksLayer(...args) {
  return workflowLeaderSequenceHelpers.workflowCheckpointBlocksLayer(...args);
}

function workflowLayerWasLeaderActivated(parent = {}, layer = 1) {
  return workflowLeaderSequenceHelpers.workflowLayerWasLeaderActivated(parent, layer);
}

function workflowFailedPriorLayerShouldWarnNotBlock(...args) {
  return workflowLeaderSequenceHelpers.workflowFailedPriorLayerShouldWarnNotBlock(...args);
}

function workflowBlockingQualityGateBeforeLayer(...args) {
  return workflowLeaderSequenceHelpers.workflowBlockingQualityGateBeforeLayer(...args);
}

function workflowLeaderSequenceNeedsProgress(...args) {
  return workflowLeaderSequenceHelpers.workflowLeaderSequenceNeedsProgress(...args);
}

function workflowChildrenForLayer(...args) {
  return workflowLeaderSequenceHelpers.workflowChildrenForLayer(...args);
}

function workflowShouldEnableLeaderSequence(...args) {
  return workflowLeaderSequenceHelpers.workflowShouldEnableLeaderSequence(...args);
}

function workflowDispatchHandlers() {
  if (!workflowDispatchRuntime) throw new Error('Workflow dispatch runtime is not initialized.');
  return workflowDispatchRuntime;
}

function pickProgressDispatchTargets(...args) {
  return workflowDispatchHandlers().pickProgressDispatchTargets(...args);
}

function pickProgressDispatchTarget(...args) {
  return workflowDispatchHandlers().pickProgressDispatchTarget(...args);
}

async function markDispatchScheduled(...args) {
  return workflowDispatchHandlers().markDispatchScheduled(...args);
}

async function scheduleProgressDispatchesForJobId(...args) {
  return workflowDispatchHandlers().scheduleProgressDispatchesForJobId(...args);
}

async function scheduleProgressDispatchForJobId(...args) {
  return workflowDispatchHandlers().scheduleProgressDispatchForJobId(...args);
}

async function scheduleInitialWorkflowDispatchFromChildren(...args) {
  return workflowDispatchHandlers().scheduleInitialWorkflowDispatchFromChildren(...args);
}

async function scheduleNextWorkflowDispatchLightweight(...args) {
  return workflowDispatchHandlers().scheduleNextWorkflowDispatchLightweight(...args);
}

async function recoverWorkflowEndpointDispatchJobs(...args) {
  return workflowDispatchHandlers().recoverWorkflowEndpointDispatchJobs(...args);
}

async function verifyInternalCronRequest(...args) {
  return workflowDispatchHandlers().verifyInternalCronRequest(...args);
}

async function handleInternalWorkflowCompletionSweep(...args) {
  return workflowDispatchHandlers().handleInternalWorkflowCompletionSweep(...args);
}

async function runMinuteWorkflowCompletionSweep(...args) {
  return workflowDispatchHandlers().runMinuteWorkflowCompletionSweep(...args);
}

async function processWorkflowDispatchQueueMessage(...args) {
  return workflowDispatchHandlers().processWorkflowDispatchQueueMessage(...args);
}

async function runQueuedEndpointDispatchSweep(...args) {
  return workflowDispatchHandlers().runQueuedEndpointDispatchSweep(...args);
}

workflowDispatchRuntime = createWorkflowDispatchRuntime({
  DISPATCH_IN_PROGRESS_STALE_MS,
  DISPATCH_SCHEDULE_STALE_MS,
  WORKFLOW_PROGRESS_DISPATCH_MAX_TARGETS,
  acceptedEndpointRecoveryAttempts,
  applyWorkflowHandoffPromptContextToJob,
  canAutoScheduleAsyncDispatch,
  cloneJob,
  completedWorkflowLeader,
  completionQueueRecoveryStaleMs,
  dispatchExistingJobToAssignedAgent,
  dispatchScheduleIsFreshForAgent,
  e2eAuthSecret,
  enqueueEndpointDispatch,
  failJob,
  internalCronToken,
  isTerminalJobStatus,
  isWorkflowLeaderTask,
  jobWithinDispatchAge,
  json,
  nowIso,
  parseBody,
  pauseWorkflowChildDispatchForParentAuthority,
  providerRunAttempts,
  providerRunLimitReached,
  publicAgent,
  reconcileWorkflowParent,
  refreshWorkflowLeaderHandoffForJobId,
  releaseBillingReservationInState,
  runtimeStorage,
  secretEquals,
  sortWorkflowChildren,
  touchEvent,
  workflowBlockingQualityGateBeforeLayer,
  workflowCheckpointBlocksLayer,
  workflowChildIsInternalLeaderSequenceRun,
  workflowChildIsSaasHandoffOnly,
  workflowChildIsTerminal,
  workflowChildIsTerminalForProgress,
  workflowHasActiveSequentialUserActionWait,
  workflowChildRequiresSequentialUserAction,
  workflowChildShouldRestartFromBeginning,
  workflowCompletionRetryLimitForJob,
  workflowDispatchLayer,
  workflowDispatchMaxAgeMs,
  workflowDispatchQueue,
  workflowLeaderCheckpoints,
  workflowLeaderHandoff,
  workflowLeaderSequence,
  workflowParentAuthorityRequest,
  workflowProviderRunMaxAttempts,
  workflowRestartRequiredReason,
  workflowSequentialUserActionPriority,
  workflowTaskName
});
function orderCreateHandlers() {
  if (!orderCreateRuntime) {
    orderCreateRuntime = createOrderCreateHandlers({
      accountIdForLogin,
      accountSettingsForLogin,
      applyActiveConversationOwnerLockToOrderBody,
      authorityBlockReasonFromRequest,
      WORKFLOW_PROGRESS_DISPATCH_MAX_TARGETS,
      billingApiKeyModeForRequester,
      billingPeriodId,
      billingModeForRequester,
      buildAgentTeamDeliveryOutput,
      buildFollowupConversationContext,
      buildIntakeClarificationWithAi,
      buildWorkflowEstimate,
      buildWorkflowParentJob,
      callbackTokenForJob,
      clientOrderIdFromCreateBody,
      compactRetryReuseArtifactsForJobStorage,
      createJobResponseFromPersistedJob,
      currentOrderRequesterContext,
      dispatchExistingJobToAssignedAgent,
      downstreamHandoffSummaryContractForTask,
      estimateBilling,
      estimateRunWindow,
      executorStatePatchFromAuthorityRequest,
      inferTaskType,
      inAppPaymentsRemoved: () => true,
      isManagedSampleAgent,
      isWorkflowLeaderTask,
      jobPromptMatchesCreateBody,
      jobRequesterMatchesCurrent,
      jobSessionMatchesCreateBody,
      json,
      leaderActionLayerStart,
      leaderPlannerCandidateAgents,
      leaderPlannerManifestCatalog,
      leaderTaskRequiresSourceCollection,
      leaderTaskUsesWebSearch,
      listCreatorUsageEstimateForOrder,
      ledgerAmountToDisplayCurrency,
      maybeRefineWorkflowPlanWithLeaderLlm,
      mergeProtectedPromptSourceIntoInput,
      normalizeAgentTags,
      normalizeAuthorityRequest,
      normalizeOrderStrategy,
      normalizeTaskTypes,
      nowIso,
      optimizeOrderPromptForBroker,
      orderBodyWithCommonQualityRules,
      orderBodyWithLeaderFollowupSpecialistRouting,
      orderCreateBodyIsSameContentNewOrderRetry,
      orderCreateSkipIntake,
      orderCreateSkipPrePersistencePlanning,
      orderPreflightForAgent,
      orderStrategyWithFollowupContext,
      parseBody,
      persistedJobForClientOrderId,
      assignAgentForTask,
      planWorkflowAssignments,
      prepareGuestTrialOrderContext,
      promptInjectionGuardForPrompt,
      promptPolicyBlockPayload,
      reconcileWorkflowParent,
      recordOrderApiKeyUsage,
      requesterContextFromUser,
      requestedFollowupJobIdFromCreateBody,
      requireOrderWriteAccess,
      reserveBillingEstimateInState,
      resolveAgentJobEndpoint,
      resolveOrderStrategy,
      resolveWorkflowAssignmentFromAgentList,
      scheduleInitialWorkflowDispatchFromChildren,
      scheduleProgressDispatchesForJobId,
      selectedAgentIdFromOrderBody,
      selectedAgentTaskTypeFromOrderBody,
      shouldInjectQaOrderCreateFault,
      taskRequiresConnectorApproval,
      touchEvent,
      workflowAgentRunChildren,
      workflowChildIsAdaptivePending,
      workflowChildIsInternalLeaderSequenceRun,
      workflowDispatchLayer,
      workflowLeaderActionProtocol,
      workflowLeaderSequenceNeedsProgress,
      workflowLayerLabel,
      workflowLayerRequiresUserApprovalBeforeRelease,
      workflowMetaWithoutGlobalSearchFlags,
      workflowPrimaryTask,
      workflowReuseArtifactsByTaskFromOrderBody,
      workflowReuseArtifactStorageMeta,
      workflowSequencePhaseForJob,
      workflowSequencePhaseForTask,
      workflowTagHintsForTask,
      workflowShouldEnableLeaderSequence,
      workflowStatusCounts,
      workflowVisibleAgentRunChildren,
      WELCOME_CREDITS_GRANT_AMOUNT
    });
  }
  return orderCreateRuntime;
}


const workerLifecycleHandlers = createWorkerLifecycleHandlers({
  ORCHESTRATION_WATCHDOG_POLICY,
  failJob,
  processWorkflowDispatchQueueMessage,
  recoverWorkflowEndpointDispatchJobs,
  runMinuteWorkflowCompletionSweep,
  runQueuedEndpointDispatchSweep,
  runRecurringOrderSweep,
  runWorkflowOrchestrationWatchdog,
  runWorkflowTimeoutRetrySweep,
  runtimeStorage,
  sweepTimedOutJobs,
  touchEvent
});

const workerHandlers = createWorkerHandlers({
  agentCatalogIndexPayload,
  agentSafetyErrorResponse,
  agentsCatalogPayload,
  API_COST_CATALOG_VERSION,
  API_ROUTES,
  apiRouteMatches,
  appendCampaignMetricsPayload,
  appsCatalogPayload,
  authorizeOpenChatIntentLlm,
  authStatus,
  baseUrl,
  BILLING_DISPLAY_CURRENCY,
  buildDraftManifestFromAgentSkill,
  campaignAdsPayload,
  campaignDetailPayload,
  campaignIntegrationsPayload,
  campaignLeadSourcePayload,
  campaignMetricsPayload,
  campaignsPayload,
  canonicalBrowserRedirect,
  canUseProductionDebugRoute,
  chatMemoryPayload,
  classifyDeliveryArtifactWithOpenAi,
  clearCookie,
  connectorRoutes,
  createAdminOrderApiKey,
  createCampaignPayload,
  createOrderApiKey,
  currentOrderRequesterContext,
  currentUserContext,
  deleteAppSetting,
  deleteCurrentAccount,
  deleteExactMatchAction,
  displayCurrencyToLedgerAmount,
  enforceBrowserWriteProtection,
  executeDeliveryActionRequest,
  EXTERNAL_API_COST_CATALOG_USD,
  fetchWorkerAsset,
  getAdminProviderIdentityVerification,
  getAppSettings,
  getExactMatchActions,
  getMcpDiscoveryPayload,
  getSession,
  getSettingsPayload,
  githubAppClientId,
  githubAppClientSecret,
  githubAppConfigured,
  githubAppId,
  githubAppPrivateKey,
  githubAppRecommendedSettings,
  githubAppSlug,
  githubClientId,
  githubClientSecret,
  githubOAuthScope,
  githubPrivateRepoImportEnabled,
  googleClientId,
  googleClientSecret,
  googleConfigured,
  googleLoginScope,
  googleScopedOAuthScope,
  googleScopeForOAuthAction,
  handleAdminDashboardApi,
  handleAdminPageRequest,
  handleAgentCallback,
  handleAgentOnboardingCheck,
  handleAppHandoff,
  handleApproveJobAuthority,
  handleAuthCallback,
  handleAuthStart,
  handleChatPageRequest,
  handleClaimJob,
  handleCreateAppContext,
  handleCreateJob,
  handleCreateRecurringOrder,
  handleDeleteAgent,
  handleDeleteApp,
  handleDeleteRecurringOrder,
  handleE2eAuthVerify,
  handleEmailAuthRequest,
  handleEmailAuthVerify,
  handleGetAppContext,
  handleGetJob,
  handleGithubAppCallback,
  handleGithubAppConnectStart,
  handleGithubAppInstallStart,
  handleGithubAppSetup,
  handleGoogleAuthCallback,
  handleGoogleAuthStart,
  handleGuestTrialClaim,
  handleImportAppManifest,
  handleImportAppUrl,
  handleImportManifest,
  handleImportUrl,
  handleInternalWorkflowCompletionSweep,
  handleListAppContexts,
  handleListPublisherItems,
  handleListRecurringOrders,
  handleLoginPageRequest,
  handleMcpRequest,
  handleOpenChatIntent,
  handlePublisherContextIngest,
  handleRecurringSweep,
  handleRegisterAgent,
  handleRegisterApp,
  handleResolveJob,
  handleRetryDispatch,
  handleReviewAgent,
  handleSampleAgentManifestRequest,
  handleSeed,
  handleSubmitResult,
  handleTimeoutSweep,
  handleUpdateAgentPricing,
  handleUpdateRecurringOrder,
  handleVerifyAgent,
  handleVerifyApp,
  hideOwnChatMemory,
  integrationRoutes,
  isAdminPagePath,
  isChatPagePath,
  isLoginPagePath,
  json,
  jsonWithCookies,
  legacyLegalNoticeRedirect,
  listChatTrainingData,
  listFeedbackReports,
  listOrderApiKeys,
  LLM_HIGH_WATERMARK_PRICE_PER_MTOK_USD,
  MAX_PROVIDER_MARKUP_RATE,
  maybeRefreshSessionCookie,
  maybeSendSignupWelcomeEmail,
  normalizeDeliveryExecuteFailureResponse,
  normalizeDeliveryScheduleFailureResponse,
  nowIso,
  OAUTH_STATE_COOKIE,
  parseBody,
  preflightWorkOrderRequest,
  prepareDeliveryExecutionRequest,
  prepareDeliveryFollowupOrderRequest,
  prepareDeliveryPublishOrderRequest,
  prepareDeliveryPublishRequest,
  prepareWorkOrderRequest,
  publisherCampaignIngestPayload,
  rateLimitResponseForRequest,
  recordAnalyticsEvent,
  recordChatSessionSnapshot,
  recordChatTranscript,
  recordOrderApiKeyUsage,
  requestOrigin,
  resolveWorkActionRequest,
  resolveWorkIntentRequest,
  responseWithCookies,
  reviewAdminProviderIdentityVerification,
  revokeOrderApiKey,
  runtimePolicy,
  runtimeStorage,
  sampleAgentManifestRoute,
  saveAppSetting,
  saveExactMatchAction,
  saveSettingsSection,
  scheduleDeliveryActionRequest,
  SESSION_COOKIE,
  snapshot,
  submitFeedbackReport,
  submitProviderIdentityVerification,
  updateCampaignAdsPayload,
  updateCampaignIntegrationsPayload,
  updateCampaignLeadSourcePayload,
  updateCampaignPayload,
  updateChatTranscriptReview,
  updateFeedbackReport,
  updateJobExecutorState,
  visibleDeliveryItemsForRequestFast,
  visibleJobsForRequestFast,
  workerLifecycleHandlers,
  xOAuthConfigured,
  xOAuthScopeLabel,
  xTokenEncryptionConfigured
});

export default workerHandlers;
