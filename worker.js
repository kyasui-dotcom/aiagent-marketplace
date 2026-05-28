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

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const storage = runtimeStorage(env);
    const version = env.APP_VERSION || '0.2.0';
    const deployTarget = 'cloudflare-worker';

    const canonicalRedirect = canonicalBrowserRedirect(request, env);
    if (canonicalRedirect) return canonicalRedirect;
    const legalNoticeRedirect = legacyLegalNoticeRedirect(request);
    if (legalNoticeRedirect) return legalNoticeRedirect;

    const rateLimited = rateLimitResponseForRequest(request);
    if (rateLimited) return rateLimited;
    const browserWriteBlocked = await enforceBrowserWriteProtection(request, env);
    if (browserWriteBlocked) return browserWriteBlocked;

    const sampleProviderRoute = sampleAgentManifestRoute(url.pathname);
    if (sampleProviderRoute) {
      return handleSampleAgentManifestRequest(request, env, sampleProviderRoute);
    }

    if (url.pathname === '/auth/status' && request.method === 'GET') {
      const status = await authStatus(request, env);
      const session = await getSession(request, env);
      const refreshedCookie = await maybeRefreshSessionCookie(session, env);
      return refreshedCookie ? jsonWithCookies(status, 200, [refreshedCookie]) : json(status);
    }
    if (url.pathname === '/api/internal/cron/workflow-completions' && request.method === 'POST') {
      return handleInternalWorkflowCompletionSweep(request, env);
    }
    if (request.method === 'GET' && isLoginPagePath(url.pathname)) {
      const loginRedirect = await handleLoginPageRequest(request, env);
      if (loginRedirect) return loginRedirect;
    }
    if (request.method === 'GET' && isChatPagePath(url.pathname)) {
      const chatRedirect = await handleChatPageRequest(request, env);
      if (chatRedirect) return chatRedirect;
    }
    if (request.method === 'GET' && isAdminPagePath(url.pathname)) {
      const adminResponse = await handleAdminPageRequest(request, env);
      if (adminResponse) return adminResponse;
    }
    if (url.pathname === '/auth/debug' && request.method === 'GET') {
      const current = await currentUserContext(request, env);
      if (!canUseProductionDebugRoute(current, env)) return json({ error: 'Not found' }, 404);
      const callback = `${baseUrl(request, env)}/auth/github/callback`;
      const googleCallback = `${baseUrl(request, env)}/auth/google/callback`;
      const xCallback = xCallbackUrl(request, env);
      const githubAppSetup = githubAppRecommendedSettings(request, env);
      const policy = runtimePolicy(env);
      return json({
        githubConfigured: Boolean(githubClientId(env) && githubClientSecret(env)),
        googleConfigured: googleConfigured(env),
        authBaseUrl: baseUrl(request, env),
        currentOrigin: requestOrigin(request),
        xConfigured: xOAuthConfigured(env),
        xTokenEncryptionConfigured: xTokenEncryptionConfigured(env),
        githubAppConfigured: githubAppConfigured(env),
        clientIdPresent: Boolean(githubClientId(env)),
        clientSecretPresent: Boolean(githubClientSecret(env)),
        googleClientIdPresent: Boolean(googleClientId(env)),
        googleClientSecretPresent: Boolean(googleClientSecret(env)),
        requestedScope: githubOAuthScope(env),
        googleRequestedScope: googleScopeForOAuthAction(env, 'analytics_connect'),
        googleScopeProfiles: {
          login: googleLoginScope(env),
          analytics: googleScopeForOAuthAction(env, 'analytics_connect'),
          drive: googleScopedOAuthScope(env, ['drive']),
          calendarRead: googleScopedOAuthScope(env, ['calendar_read']),
          gmailRead: googleScopedOAuthScope(env, ['gmail_read']),
          gmailSend: googleScopedOAuthScope(env, ['gmail_send'])
        },
        xRequestedScope: xOAuthScopeLabel(),
        privateRepoImportEnabled: githubPrivateRepoImportEnabled(env),
        releaseStage: policy.releaseStage,
        openWriteApiEnabled: policy.openWriteApiEnabled,
        guestRunReadEnabled: policy.guestRunReadEnabled,
        devApiEnabled: policy.devApiEnabled,
        developerApiEnabled: policy.developerApiEnabled,
        cliEnabled: policy.cliEnabled,
        mcpEnabled: policy.mcpEnabled,
        developerSurfacesPaused: policy.developerSurfacesPaused,
        exposeJobSecrets: policy.exposeJobSecrets,
        callback,
        googleCallback,
        xCallback,
        githubApp: {
          appIdPresent: Boolean(githubAppId(env)),
          clientIdPresent: Boolean(githubAppClientId(env)),
          clientSecretPresent: Boolean(githubAppClientSecret(env)),
          privateKeyPresent: Boolean(githubAppPrivateKey(env)),
          slug: githubAppSlug(env) || null,
          recommendedSettings: githubAppSetup
        }
      });
    }
    if (url.pathname === '/auth/github-app/install' && request.method === 'GET') {
      return handleGithubAppInstallStart(request, env);
    }
    if (url.pathname === '/auth/github-app/connect' && request.method === 'GET') {
      return handleGithubAppConnectStart(request, env);
    }
    if (url.pathname === '/auth/github-app/callback' && request.method === 'GET') {
      return handleGithubAppCallback(request, env);
    }
    if (url.pathname === '/auth/github-app/setup' && request.method === 'GET') {
      return handleGithubAppSetup(request, env);
    }
    if (url.pathname === '/auth/github' && request.method === 'GET') {
      return handleAuthStart(request, env);
    }
    if (url.pathname === '/auth/github/callback' && request.method === 'GET') {
      return handleAuthCallback(request, env);
    }
    if (url.pathname === '/auth/google' && request.method === 'GET') {
      return handleGoogleAuthStart(request, env);
    }
    if (url.pathname === '/auth/google/callback' && request.method === 'GET') {
      return handleGoogleAuthCallback(request, env);
    }
    if (url.pathname === '/auth/email/request' && request.method === 'POST') {
      return handleEmailAuthRequest(request, env);
    }
    if (url.pathname === '/auth/email/verify' && request.method === 'GET') {
      return handleEmailAuthVerify(request, env);
    }
    if (url.pathname === '/auth/e2e/verify' && request.method === 'GET') {
      return handleE2eAuthVerify(request, env);
    }
    if (url.pathname === '/auth/x' && request.method === 'GET') {
      return connectorRoutes.handleXAuthStart(request, env);
    }
    if (url.pathname === '/auth/x/callback' && request.method === 'GET') {
      return connectorRoutes.handleXAuthCallback(request, env);
    }
    if (url.pathname === '/auth/logout' && request.method === 'POST') {
      return integrationRoutes.handleLogout(env);
    }
    if (apiRouteMatches(url.pathname, request.method, 'CONNECTORS_X_STATUS', 'GET')) {
      return connectorRoutes.handleXConnectorStatus(request, env);
    }
    if (apiRouteMatches(url.pathname, request.method, 'CONNECTORS_WORDPRESS_STATUS', 'GET')) {
      return connectorRoutes.handleWordPressConnectorStatus(request, env);
    }
    if (url.pathname === '/api/connectors/google/assets' && request.method === 'GET') {
      return integrationRoutes.handleGoogleConnectorAssets(request, env);
    }
    if (url.pathname === '/api/connectors/google/analytics-report' && request.method === 'GET') {
      return integrationRoutes.handleGoogleAnalyticsReport(request, env);
    }
    if (apiRouteMatches(url.pathname, request.method, 'CONNECTORS_INSTAGRAM_POST', 'POST')) {
      return integrationRoutes.handleInstagramConnectorPost(request, env);
    }
    if (apiRouteMatches(url.pathname, request.method, 'CONNECTORS_GOOGLE_SEND_GMAIL', 'POST')) {
      return integrationRoutes.handleGoogleSendGmail(request, env);
    }
    if (apiRouteMatches(url.pathname, request.method, 'CONNECTORS_RESEND_SEND_EMAIL', 'POST')) {
      return integrationRoutes.handleResendSendEmail(request, env);
    }
    if (url.pathname === '/api/internal/test-welcome-email' && request.method === 'POST') {
      return handleTestWelcomeEmail(request, env);
    }
    if (apiRouteMatches(url.pathname, request.method, 'CONNECTORS_X_POST', 'POST')) {
      return connectorRoutes.handleXConnectorPost(request, env);
    }
    if (apiRouteMatches(url.pathname, request.method, 'CONNECTORS_WORDPRESS_CONNECT', 'POST')) {
      return connectorRoutes.handleWordPressConnectorConnect(request, env);
    }
    if (apiRouteMatches(url.pathname, request.method, 'CONNECTORS_WORDPRESS_CREATE_DRAFT', 'POST')) {
      return connectorRoutes.handleWordPressConnectorCreateDraft(request, env);
    }
    if (url.pathname === '/api/github/repos' && request.method === 'GET') {
      return integrationRoutes.handleGithubRepos(request, env);
    }
    if (url.pathname === '/api/github/app-setup' && request.method === 'GET') {
      return json({
        githubAppConfigured: githubAppConfigured(env),
        recommended: githubAppRecommendedSettings(request, env)
      });
    }
    if (url.pathname === '/api/github/load-manifest' && request.method === 'POST') {
      return integrationRoutes.handleGithubLoadManifest(storage, request, env);
    }
    if (url.pathname === '/api/github/generate-manifest' && request.method === 'POST') {
      return integrationRoutes.handleGithubGenerateManifest(request, env);
    }
    if (apiRouteMatches(url.pathname, request.method, 'GITHUB_CREATE_ADAPTER_PR', 'POST')) {
      return integrationRoutes.handleGithubCreateAdapterPr(storage, request, env);
    }
    if (apiRouteMatches(url.pathname, request.method, 'GITHUB_CREATE_EXECUTOR_PR', 'POST')) {
      return integrationRoutes.handleGithubCreateExecutorPr(storage, request, env);
    }
    if (url.pathname === '/api/github/import-repo' && request.method === 'POST') {
      return json({
        error: 'Deprecated endpoint. Repository analysis import is disabled.',
        use: '/api/github/load-manifest'
      }, 410);
    }
    if (url.pathname === '/api/health') {
      return json({ ok: true, service: 'aiagent2', version, deploy_target: deployTarget, time: nowIso() });
    }
    if (url.pathname === '/api/ready') {
      return json({ ok: true, ready: true, storage: { kind: storage.kind, supportsPersistence: storage.supportsPersistence }, version, deploy_target: deployTarget, time: nowIso() });
    }
    if (url.pathname === '/api/version') {
      return json({ ok: true, version, deploy_target: deployTarget, runtime: 'workerd', time: nowIso() });
    }
    if (url.pathname === '/api/metrics') {
      const snap = await snapshot(storage, request, env);
      return json({
        ok: true,
        version,
        deploy_target: deployTarget,
        stats: snap.stats,
        storage: snap.storage,
        billing_audit_count: (snap.billingAudits || []).length,
        event_count: (snap.events || []).length,
        time: nowIso()
      });
    }
    if (apiRouteMatches(url.pathname, request.method, 'PRICING_CATALOG', 'GET')) {
      return json({
        ok: true,
        catalogVersion: API_COST_CATALOG_VERSION,
        currency: 'USD',
        displayCurrency: BILLING_DISPLAY_CURRENCY,
        ledgerUnitsPerUsd: displayCurrencyToLedgerAmount(1),
        providerMarkup: {
          defaultRate: 0.1,
          maxRate: MAX_PROVIDER_MARKUP_RATE,
          configurableByProvider: true
        },
        platformMargin: {
          rate: 0.1,
          basis: 'final_order_total'
        },
        llmHighWatermark: LLM_HIGH_WATERMARK_PRICE_PER_MTOK_USD,
        externalApiUnitCosts: EXTERNAL_API_COST_CATALOG_USD,
        formula: {
          usageBasedOrder: 'billable_cost_basis * (1 + provider_markup_rate) / (1 - platform_margin_rate)',
          fixedRunOrder: 'fixed_run_price_usd',
          providerMonthlyPlan: 'provider_monthly_price_usd, with CAIt retaining 10% of the monthly fee',
          notes: [
            'LLM estimates use the high-watermark catalog unless the completed run reports a positive actual cost.',
            'Non-LLM API calls use catalog per-call units unless the completed run reports explicit tool cost.',
            'Provider markup can be set from 0% to 100%; CAIt platform margin remains fixed at 10%.'
          ]
        },
        monthlyPlans: {
          status: 'not_finalized',
          note: 'Monthly plans will be considered after more real usage is measured; usage-based billing remains the first model.'
        }
      });
    }
    if (url.pathname === '/api/schema') {
      return json({ schema: storage.schemaSql });
    }
    if (url.pathname === '/api/admin/dashboard' && request.method === 'GET') {
      return handleAdminDashboardApi(request, env);
    }
    if (apiRouteMatches(url.pathname, request.method, 'ADMIN_PROVIDER_IDENTITY', 'GET')) {
      const result = await getAdminProviderIdentityVerification(storage, request, env, url.pathname.split('/')[4] || '');
      if (result.error) return json({ error: result.error }, result.statusCode || 400);
      return json(result);
    }
    if (apiRouteMatches(url.pathname, request.method, 'ADMIN_PROVIDER_IDENTITY', 'POST')) {
      const result = await reviewAdminProviderIdentityVerification(storage, request, env, url.pathname.split('/')[4] || '');
      if (result.error) return json({ error: result.error }, result.statusCode || 400);
      return json(result);
    }
    if (url.pathname === '/api/snapshot') {
      const payload = await snapshot(storage, request, env);
      const session = await getSession(request, env);
      const refreshedCookie = await maybeRefreshSessionCookie(session, env);
      return refreshedCookie ? jsonWithCookies(payload, 200, [refreshedCookie]) : json(payload);
    }
    if (url.pathname === '/api/chat-memory' && request.method === 'GET') {
      const session = await getSession(request, env);
      const payload = await chatMemoryPayload(storage, request, env, { session });
      const refreshedCookie = await maybeRefreshSessionCookie(session, env);
      return refreshedCookie ? jsonWithCookies(payload, 200, [refreshedCookie]) : json(payload);
    }
    if (url.pathname === '/api/guest-trial/claim' && request.method === 'POST') {
      const result = await handleGuestTrialClaim(storage, request, env);
      if (result.error) return json({ error: result.error, code: result.code }, result.statusCode || 400);
      return json(result);
    }
    if (url.pathname === '/api/analytics/events' && request.method === 'POST') {
      const result = await recordAnalyticsEvent(storage, request, env);
      if (result.error) return json({ error: result.error }, result.statusCode || 400);
      return json(result, 201);
    }
    if (url.pathname === '/api/analytics/chat-transcripts' && request.method === 'POST') {
      const result = await recordChatTranscript(storage, request, env);
      if (result.error) return json({ error: result.error }, result.statusCode || 400);
      return json(result, 201);
    }
    if (url.pathname === '/api/chat-sessions' && request.method === 'POST') {
      const result = await recordChatSessionSnapshot(storage, request, env);
      if (result.error) return json({ error: result.error, code: result.code || result.error }, result.statusCode || 400);
      return json(result, result.saved === false ? 200 : 201);
    }
    if (url.pathname === '/api/open-chat/intent' && request.method === 'POST') {
      const result = await handleOpenChatIntent(storage, request, env);
      return json(result.payload, result.statusCode || 200);
    }
    if (url.pathname === '/api/work/resolve-action' && request.method === 'POST') {
      const result = await resolveWorkActionRequest(storage, request);
      if (result.error) return json({ error: result.error }, result.statusCode || 400);
      return json(result);
    }
    if (url.pathname === '/api/work/resolve-intent' && request.method === 'POST') {
      const result = await resolveWorkIntentRequest(storage, request);
      if (result.error) return json(result, result.statusCode || 400);
      return json(result);
    }
    if (url.pathname === '/api/work/prepare-order' && request.method === 'POST') {
      const result = await prepareWorkOrderRequest(storage, request, env);
      if (result.error) return json(result, result.statusCode || 400);
      return json(result);
    }
    if (url.pathname === '/api/work/preflight-order' && request.method === 'POST') {
      const result = await preflightWorkOrderRequest(storage, request, env);
      if (result.error) return json({ error: result.error }, result.statusCode || 400);
      return json(result, result.ok ? 200 : (result.statusCode || 400));
    }
    if (/^\/api\/jobs\/[^/]+\/executor-state$/.test(url.pathname) && request.method === 'PATCH') {
      const jobId = url.pathname.split('/')[3] || '';
      const result = await updateJobExecutorState(storage, request, env, jobId);
      if (result.error) return json({ error: result.error }, result.statusCode || 400);
      return json(result);
    }
    if (url.pathname === '/api/deliveries/classify' && request.method === 'POST') {
      const body = await parseBody(request).catch((error) => ({ __error: error.message }));
      if (body.__error) return json({ error: body.__error }, 400);
      const authorization = await authorizeOpenChatIntentLlm(storage, request, env);
      if (!authorization.ok) {
        return json({
          ok: false,
          available: false,
          source: authorization.source || 'none',
          error: authorization.error
        }, authorization.statusCode || 403);
      }
      const result = await classifyDeliveryArtifactWithOpenAi(body, env, {
        allowOpenAiApiKeyFallback: authorization.allowOpenAiApiKeyFallback,
        allowPlatformOpenAiApiKeyFallback: authorization.allowPlatformOpenAiApiKeyFallback
      });
      return json(result, result.ok ? 200 : 503);
    }
    if (url.pathname === '/api/deliveries/prepare-publish' && request.method === 'POST') {
      const result = await prepareDeliveryPublishRequest(storage, request, env);
      if (result.error) return json({ error: result.error }, result.statusCode || 400);
      return json(result);
    }
    if (url.pathname === '/api/deliveries/prepare-publish-order' && request.method === 'POST') {
      const result = await prepareDeliveryPublishOrderRequest(storage, request, env);
      if (result.error) return json({ error: result.error }, result.statusCode || 400);
      return json(result);
    }
    if (url.pathname === API_ROUTES.DELIVERIES_PREPARE_FOLLOWUP_ORDER && request.method === 'POST') {
      const result = await prepareDeliveryFollowupOrderRequest(storage, request, env);
      if (result.error) return json({ error: result.error }, result.statusCode || 400);
      return json(result);
    }
    if (url.pathname === '/api/deliveries/prepare-execution' && request.method === 'POST') {
      const result = await prepareDeliveryExecutionRequest(storage, request, env);
      if (result.error) return json({ error: result.error }, result.statusCode || 400);
      return json(result);
    }
    if (apiRouteMatches(url.pathname, request.method, 'DELIVERIES_EXECUTE', 'POST')) {
      const result = await executeDeliveryActionRequest(storage, request, env);
      if (result.error) return json(normalizeDeliveryExecuteFailureResponse(result), result.statusCode || 400);
      return json(result, result.statusCode || 200);
    }
    if (apiRouteMatches(url.pathname, request.method, 'DELIVERIES_SCHEDULE', 'POST')) {
      const result = await scheduleDeliveryActionRequest(storage, request, env);
      if (result.error) return json(normalizeDeliveryScheduleFailureResponse(result), result.statusCode || 400);
      return json(result, result.statusCode || 200);
    }
    if (url.pathname === '/api/stats') {
      return json((await snapshot(storage, request, env)).stats);
    }
    if (url.pathname === '/.well-known/mcp.json' && request.method === 'GET') {
      const payload = getMcpDiscoveryPayload(request, env);
      return json(payload, payload?.disabled ? 503 : 200);
    }
    if (url.pathname === '/mcp' && request.method === 'POST') {
      const result = await handleMcpRequest(storage, request, env);
      if (result.error) return json(result.payload || { error: result.error, code: result.code }, result.statusCode || 400);
      return json(result.payload);
    }
    if (url.pathname === '/api/agents') {
      if (request.method === 'POST') return handleRegisterAgent(storage, request, env);
      if (request.method === 'GET') return json(await agentsCatalogPayload(storage, request));
    }
    if (
      apiRouteMatches(url.pathname, request.method, 'AGENT_CATALOG_INDEX', 'GET')
      || apiRouteMatches(url.pathname, request.method, 'AGENT_SELECTION_INDEX', 'GET')
    ) {
      return json(await agentCatalogIndexPayload(storage, request));
    }
    if (apiRouteMatches(url.pathname, request.method, 'CAMPAIGNS', 'GET')) {
      const result = await campaignsPayload(storage, request, env);
      return json(result, result.statusCode || 200);
    }
    if (apiRouteMatches(url.pathname, request.method, 'CAMPAIGNS', 'POST')) {
      const result = await createCampaignPayload(storage, request, env);
      return json(result, result.statusCode || 200);
    }
    if (apiRouteMatches(url.pathname, request.method, 'CAMPAIGN_METRICS')) {
      const campaignId = decodeURIComponent(url.pathname.split('/')[3] || '');
      const result = request.method === 'POST'
        ? await appendCampaignMetricsPayload(storage, request, env, campaignId)
        : await campaignMetricsPayload(storage, request, env, campaignId);
      return json(result, result.statusCode || 200);
    }
    if (apiRouteMatches(url.pathname, request.method, 'CAMPAIGN_INTEGRATIONS')) {
      const campaignId = decodeURIComponent(url.pathname.split('/')[3] || '');
      const result = request.method === 'POST'
        ? await updateCampaignIntegrationsPayload(storage, request, env, campaignId)
        : await campaignIntegrationsPayload(storage, request, env, campaignId);
      return json(result, result.statusCode || 200);
    }
    if (apiRouteMatches(url.pathname, request.method, 'CAMPAIGN_LEAD_SOURCE')) {
      const campaignId = decodeURIComponent(url.pathname.split('/')[3] || '');
      const result = request.method === 'POST'
        ? await updateCampaignLeadSourcePayload(storage, request, env, campaignId)
        : await campaignLeadSourcePayload(storage, request, env, campaignId);
      return json(result, result.statusCode || 200);
    }
    if (apiRouteMatches(url.pathname, request.method, 'CAMPAIGN_ADS')) {
      const campaignId = decodeURIComponent(url.pathname.split('/')[3] || '');
      const result = request.method === 'POST'
        ? await updateCampaignAdsPayload(storage, request, env, campaignId)
        : await campaignAdsPayload(storage, request, env, campaignId);
      return json(result, result.statusCode || 200);
    }
    if (apiRouteMatches(url.pathname, request.method, 'CAMPAIGN_DETAIL')) {
      const campaignId = decodeURIComponent(url.pathname.split('/')[3] || '');
      const result = request.method === 'POST'
        ? await updateCampaignPayload(storage, request, env, campaignId)
        : await campaignDetailPayload(storage, request, env, campaignId);
      return json(result, result.statusCode || 200);
    }
    if (url.pathname === '/api/apps') {
      if (request.method === 'POST') return handleRegisterApp(storage, request, env);
      if (request.method === 'GET') return json(await appsCatalogPayload(storage, request));
    }
    if (url.pathname === '/api/apps/import-manifest' && request.method === 'POST') {
      return handleImportAppManifest(storage, request, env);
    }
    if (url.pathname === '/api/apps/import-url' && request.method === 'POST') {
      return handleImportAppUrl(storage, request, env);
    }
    if (/^\/api\/apps\/[^/]+\/handoff$/.test(url.pathname) && request.method === 'POST') {
      return handleAppHandoff(storage, request, env, decodeURIComponent(url.pathname.split('/')[3] || ''));
    }
    if (apiRouteMatches(url.pathname, request.method, 'APP_CONTEXTS', 'GET')) {
      return handleListAppContexts(storage, request, env);
    }
    if (apiRouteMatches(url.pathname, request.method, 'APP_CONTEXTS', 'POST')) {
      return handleCreateAppContext(storage, request, env);
    }
    if (apiRouteMatches(url.pathname, request.method, 'PUBLISHER_CAMPAIGN_INGEST', 'POST')) {
      const result = await publisherCampaignIngestPayload(storage, request, env);
      return json(result, result.statusCode || 200);
    }
    if (apiRouteMatches(url.pathname, request.method, 'PUBLISHER_CONTEXT_INGEST', 'POST')) {
      return handlePublisherContextIngest(storage, request, env);
    }
    if (apiRouteMatches(url.pathname, request.method, 'PUBLISHER_ITEMS', 'GET')) {
      return handleListPublisherItems(storage, request, env);
    }
    if (apiRouteMatches(url.pathname, request.method, 'APP_CONTEXT_DETAIL', 'GET')) {
      return handleGetAppContext(storage, request, env, decodeURIComponent(url.pathname.split('/')[3] || ''));
    }
    if (apiRouteMatches(url.pathname, request.method, 'DELIVERY_ITEMS', 'GET')) {
      const current = await currentOrderRequesterContext(storage, request, env, { lightweight: true });
      if (!current.user && current.apiKeyStatus === 'invalid') return json({ error: 'Invalid API key' }, 401);
      if (!current.user && current.apiKeyStatus === 'disabled') return json({ error: 'CAIt developer API and API key access are temporarily disabled.', code: 'developer_api_disabled' }, 403);
      const result = await visibleDeliveryItemsForRequestFast(storage, current, env, request);
      if (current.apiKey?.id) await recordOrderApiKeyUsage(storage, current, request);
      return json({ ok: true, items: result.items, pagination: result.pagination });
    }
    if (/^\/api\/apps\/[^/]+\/verify$/.test(url.pathname) && request.method === 'POST') {
      return handleVerifyApp(storage, request, env, url.pathname.split('/')[3] || '');
    }
    if (/^\/api\/apps\/[^/]+$/.test(url.pathname) && request.method === 'DELETE') {
      return handleDeleteApp(storage, request, env, url.pathname.split('/')[3] || '');
    }
    if (url.pathname === '/api/agent-callbacks/jobs' && request.method === 'POST') {
      return handleAgentCallback(storage, request, env);
    }
    if (url.pathname === '/api/agents/import-manifest' && request.method === 'POST') {
      return handleImportManifest(storage, request, env);
    }
    if (url.pathname === '/api/agents/draft-skill-manifest' && request.method === 'POST') {
      let body;
      try {
        body = await parseBody(request);
      } catch (error) {
        return json({ error: error.message }, 400);
      }
      const skillMd = body.skill_md || body.skillMd || body.skill || body.text || '';
      if (!String(skillMd || '').trim()) return json({ error: 'skill_md required' }, 400);
      try {
        const session = await getSession(request, env);
        const draft = buildDraftManifestFromAgentSkill({
          skillMd,
          sourceUrl: body.source_url || body.sourceUrl || '',
          filePath: body.file_path || body.filePath || 'SKILL.md',
          ownerLogin: session?.user?.login || ''
        });
        if (!draft.safety.ok) return agentSafetyErrorResponse(draft.safety);
        return json({
          ok: true,
          standard: 'agent-skills',
          draft_manifest: draft.draftManifest,
          safety: draft.safety,
          skill: {
            name: draft.skill.name,
            description: draft.skill.description,
            file_path: draft.skill.filePath,
            source_url: draft.skill.sourceUrl || null,
            frontmatter: draft.skill.frontmatter || {}
          },
          source_files: draft.analysis.loadedFiles,
          runtime_hints: draft.analysis.runtimeHints,
          task_type_scores: draft.analysis.scoredTaskTypes,
          warnings: draft.analysis.warnings,
          next_step: 'Review the generated JSON, add deployed endpoint URLs if needed, then import the JSON manifest.'
        });
      } catch (error) {
        return json({ error: error.message }, 400);
      }
    }
    if (url.pathname === '/api/agents/import-url' && request.method === 'POST') {
      return handleImportUrl(storage, request, env);
    }
    if (/^\/api\/agents\/[^/]+\/onboarding-check$/.test(url.pathname) && request.method === 'GET') {
      return handleAgentOnboardingCheck(storage, request, env, url.pathname.split('/')[3] || '');
    }
    if (/^\/api\/agents\/[^/]+$/.test(url.pathname) && request.method === 'DELETE') {
      return handleDeleteAgent(storage, request, env, url.pathname.split('/')[3] || '');
    }
    if (/^\/api\/agents\/[^/]+\/pricing$/.test(url.pathname) && request.method === 'PATCH') {
      return handleUpdateAgentPricing(storage, request, env, url.pathname.split('/')[3] || '');
    }
    if (/^\/api\/agents\/[^/]+\/review$/.test(url.pathname) && request.method === 'POST') {
      return handleReviewAgent(storage, request, env, url.pathname.split('/')[3] || '');
    }
    if (/^\/api\/agents\/[^/]+\/verify$/.test(url.pathname) && request.method === 'POST') {
      return handleVerifyAgent(storage, request, env, url.pathname.split('/')[3] || '');
    }
    if (url.pathname === '/api/jobs') {
      if (request.method === 'GET') {
        const current = await currentOrderRequesterContext(storage, request, env, { lightweight: true });
        if (!current.user && current.apiKeyStatus === 'invalid') return json({ error: 'Invalid API key' }, 401);
        if (!current.user && current.apiKeyStatus === 'disabled') return json({ error: 'CAIt developer API and API key access are temporarily disabled.', code: 'developer_api_disabled' }, 403);
        const result = await visibleJobsForRequestFast(storage, current, env, request);
        if (current.apiKey?.id) await recordOrderApiKeyUsage(storage, current, request);
        return json({ jobs: result.jobs, pagination: result.pagination });
      }
      if (request.method === 'POST') return handleCreateJob(storage, request, env, ctx);
    }
    if (url.pathname === '/api/recurring-orders') {
      if (request.method === 'GET') return handleListRecurringOrders(storage, request, env);
      if (request.method === 'POST') return handleCreateRecurringOrder(storage, request, env);
    }
    if (/^\/api\/recurring-orders\/[^/]+$/.test(url.pathname)) {
      const recurringOrderId = url.pathname.split('/')[3] || '';
      if (request.method === 'PATCH') return handleUpdateRecurringOrder(storage, request, env, recurringOrderId);
      if (request.method === 'DELETE') return handleDeleteRecurringOrder(storage, request, env, recurringOrderId);
    }
    if (url.pathname.startsWith('/api/jobs/')) {
      const [, , , jobId = '', action = ''] = url.pathname.split('/');
      if (request.method === 'GET' && jobId) return handleGetJob(storage, request, env, jobId, ctx);
      if (request.method === 'POST' && action === 'approve' && jobId) {
        const result = await handleApproveJobAuthority(storage, request, env, jobId, ctx);
        if (result.error) return json(result, result.statusCode || 400);
        return json(result);
      }
      if (request.method === 'POST' && action === 'claim' && jobId) return handleClaimJob(storage, request, env, jobId);
      if (request.method === 'POST' && action === 'result' && jobId) return handleSubmitResult(storage, request, env, jobId);
    }
    if (url.pathname === '/api/billing-audits') {
      return json({ billing_audits: (await snapshot(storage, request, env)).billingAudits });
    }
    if (url.pathname === '/api/feedback' && request.method === 'POST') {
      const result = await submitFeedbackReport(storage, request, env);
      if (result.error) return json({ error: result.error }, result.statusCode || 400);
      return json(result, 201);
    }
    if (url.pathname === '/api/settings' && request.method === 'GET') {
      const result = await getSettingsPayload(storage, request, env);
      if (result.error) return json({ error: result.error }, result.statusCode || 400);
      return json({ account: result.account, monthly_summary: result.monthlySummary });
    }
    if (apiRouteMatches(url.pathname, request.method, 'SETTINGS_ACCOUNT', 'DELETE')) {
      const result = await deleteCurrentAccount(storage, request, env);
      if (result.error) return json({ error: result.error }, result.statusCode || 400);
      return jsonWithCookies({
        ok: true,
        deleted: result.deleted,
        redirect_to: result.redirect_to || '/'
      }, 200, [clearCookie(SESSION_COOKIE), clearCookie(OAUTH_STATE_COOKIE)]);
    }
    if (url.pathname === '/api/settings/feedback-reports' && request.method === 'GET') {
      const result = await listFeedbackReports(storage, request, env);
      if (result.error) return json({ error: result.error }, result.statusCode || 400);
      return json({ feedback_reports: result.feedbackReports });
    }
    if (/^\/api\/settings\/feedback-reports\/[^/]+$/.test(url.pathname) && request.method === 'POST') {
      const result = await updateFeedbackReport(storage, request, env, url.pathname.split('/')[4] || '');
      if (result.error) return json({ error: result.error }, result.statusCode || 400);
      return json(result);
    }
    if (/^\/api\/settings\/chat-transcripts\/[^/]+$/.test(url.pathname) && request.method === 'POST') {
      const result = await updateChatTranscriptReview(storage, request, env, url.pathname.split('/')[4] || '');
      if (result.error) return json({ error: result.error }, result.statusCode || 400);
      return json(result);
    }
    if (/^\/api\/settings\/chat-memory\/[^/]+$/.test(url.pathname) && request.method === 'DELETE') {
      const result = await hideOwnChatMemory(storage, request, env, url.pathname.split('/')[4] || '');
      if (result.error) return json({ error: result.error }, result.statusCode || 400);
      return json(result);
    }
    if (url.pathname === '/api/settings/chat-training-data' && request.method === 'GET') {
      const result = await listChatTrainingData(storage, request, env);
      if (result.error) return json({ error: result.error }, result.statusCode || 400);
      return json(result);
    }
    if (url.pathname === '/api/settings/api-keys' && request.method === 'GET') {
      const result = await listOrderApiKeys(storage, request, env);
      if (result.error) return json({ error: result.error, code: result.code }, result.statusCode || 400);
      return json({ api_keys: result.apiKeys });
    }
    if (url.pathname === '/api/settings/api-keys' && request.method === 'POST') {
      const result = await createOrderApiKey(storage, request, env);
      if (result.error) return json({ error: result.error, code: result.code }, result.statusCode || 400);
      return json({ ok: true, api_key: result.apiKey, account: result.account }, 201);
    }
    if (apiRouteMatches(url.pathname, request.method, 'ADMIN_API_KEYS', 'POST')) {
      const result = await createAdminOrderApiKey(storage, request, env);
      if (result.error) return json({ error: result.error, code: result.code }, result.statusCode || 400);
      return json({ ok: true, api_key: result.apiKey, account: result.account, issued_by: result.issuedBy, auth_mode: result.authMode }, 201);
    }
    if (/^\/api\/settings\/api-keys\/[^/]+$/.test(url.pathname) && request.method === 'DELETE') {
      const result = await revokeOrderApiKey(storage, request, env, url.pathname.split('/')[4] || '');
      if (result.error) return json({ error: result.error, code: result.code }, result.statusCode || 400);
      return json({ ok: true, api_key: result.apiKey, account: result.account });
    }
    if (apiRouteMatches(url.pathname, request.method, 'SETTINGS_PROVIDER_IDENTITY', 'POST')) {
      const result = await submitProviderIdentityVerification(storage, request, env);
      if (result.error) return json({ error: result.error }, result.statusCode || 400);
      return json(result, 201);
    }
    if (url.pathname === '/api/settings/executor-preferences' && request.method === 'POST') {
      const result = await saveSettingsSection(storage, request, env, 'executorPreferences');
      if (result.error) return json({ error: result.error }, result.statusCode || 400);
      return json({ ok: true, account: result.account, monthly_summary: result.monthlySummary, section: 'executorPreferences' });
    }
    if (apiRouteMatches(url.pathname, request.method, 'SETTINGS_COST_LIMITS', 'POST')) {
      const result = await saveSettingsSection(storage, request, env, 'costLimits');
      if (result.error) return json({ error: result.error }, result.statusCode || 400);
      return json({ ok: true, account: result.account, monthly_summary: result.monthlySummary, section: 'costLimits' });
    }
    if (apiRouteMatches(url.pathname, request.method, 'SETTINGS_PROFILE', 'POST')) {
      const result = await saveSettingsSection(storage, request, env, 'profile');
      if (result.error) return json({ error: result.error }, result.statusCode || 400);
      return json({ ok: true, account: result.account, monthly_summary: result.monthlySummary, section: 'profile' });
    }
    if (apiRouteMatches(url.pathname, request.method, 'SETTINGS_EXACT_ACTIONS', 'GET')) {
      const result = await getExactMatchActions(storage, request, env);
      if (result.error) return json({ error: result.error }, result.statusCode || 400);
      return json(result);
    }
    if (apiRouteMatches(url.pathname, request.method, 'SETTINGS_EXACT_ACTIONS', 'POST')) {
      const result = await saveExactMatchAction(storage, request, env);
      if (result.error) return json({ error: result.error }, result.statusCode || 400);
      return json(result);
    }
    if (/^\/api\/settings\/exact-actions\/[^/]+$/.test(url.pathname) && request.method === 'DELETE') {
      const result = await deleteExactMatchAction(storage, request, env, decodeURIComponent(url.pathname.split('/')[4] || ''));
      if (result.error) return json({ error: result.error }, result.statusCode || 400);
      return json(result);
    }
    if (url.pathname === '/api/settings/app-settings' && request.method === 'GET') {
      const result = await getAppSettings(storage, request, env);
      if (result.error) return json({ error: result.error }, result.statusCode || 400);
      return json(result);
    }
    if (url.pathname === '/api/settings/app-settings' && request.method === 'POST') {
      const result = await saveAppSetting(storage, request, env);
      if (result.error) return json({ error: result.error }, result.statusCode || 400);
      return json(result);
    }
    if (/^\/api\/settings\/app-settings\/[^/]+$/.test(url.pathname) && request.method === 'DELETE') {
      const result = await deleteAppSetting(storage, request, env, decodeURIComponent(url.pathname.split('/')[4] || ''));
      if (result.error) return json({ error: result.error }, result.statusCode || 400);
      return json(result);
    }
    if (url.pathname === '/api/dev/resolve-job' && request.method === 'POST') {
      return handleResolveJob(storage, request, env);
    }
    if (url.pathname === '/api/dev/dispatch-retry' && request.method === 'POST') {
      return handleRetryDispatch(storage, request, env);
    }
    if (url.pathname === '/api/dev/timeout-sweep' && request.method === 'POST') {
      return handleTimeoutSweep(storage, request, env);
    }
    if (url.pathname === '/api/dev/recurring-sweep' && request.method === 'POST') {
      return handleRecurringSweep(storage, request, env);
    }
    if (url.pathname === '/api/seed' && request.method === 'POST') {
      return handleSeed(storage, request, env);
    }

    const assetResponse = await fetchWorkerAsset(request, env, { responseWithCookies });
    if (assetResponse) return assetResponse;

    return json({ error: 'Not found' }, 404);
  },
  async queue(batch, env, ctx) {
    return workerLifecycleHandlers.queue(batch, env, ctx);
  },
  async scheduled(controller, env, ctx) {
    return workerLifecycleHandlers.scheduled(controller, env, ctx);
  }
};
