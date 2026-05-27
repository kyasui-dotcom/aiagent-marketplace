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
let workflowParentReconcileRuntime = null;
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
  canUsePlatformResend,
  clearCookie,
  connectorActionLabel,
  connectorScopeSet: googleConnectorScopeSet,
  createAgentFromManifest,
  currentAgentRequesterContext,
  currentAgentRequesterContextWithAccount,
  fetchAllGithubRepos,
  fetchGithubManifestCandidate,
  fetchGithubPublicRepos,
  fetchGithubRepoMeta,
  fetchGithubRepoTree,
  fetchGoogleAuthorizedJson,
  githubAppRepoTokenForRequester,
  githubAppReposForSession,
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

function braveSearchConfiguredForWorkflow(env = {}) {
  return Boolean(String(env?.BRAVE_SEARCH_API_KEY || env?.BRAVE_API_KEY || '').trim());
}

function workflowJobRequiresSearch(job = {}) {
  const workflow = job?.input?._broker?.workflow && typeof job.input._broker.workflow === 'object'
    ? job.input._broker.workflow
    : {};
  const explicit = workflow.forceWebSearch === true || workflow.requiresWebSearch === true || workflow.searchRequired === true;
  if (!explicit) return false;
  const task = workflowTaskName(job) || workflowPrimaryTaskForJob(job);
  const primaryTask = workflowPrimaryTaskForJob(job);
  const phase = String(workflow.sequencePhase || '').trim().toLowerCase();
  return workflow.forceWebSearch === true
    || phase === 'research'
    || leaderTaskUsesWebSearch(primaryTask, task);
}

function workflowSourceCollectionContractForJob(job = {}) {
  if (!workflowJobRequiresSearch(job)) return null;
  const workflow = job?.input?._broker?.workflow && typeof job.input._broker.workflow === 'object'
    ? job.input._broker.workflow
    : {};
  const task = workflowTaskName(job) || job.taskType || 'agent';
  return {
    required: true,
    task_type: task,
    reason: workflow.webSearchRequiredReason || workflow.sourceCollectionRequiredReason || 'This workflow task requires source-backed research.',
    required_output_field: 'report.web_sources',
    instruction: 'Run search/source collection or use supplied source context before completing. Return report.web_sources as an array with url, title/snippet, provider, action, and query where available. If no source can be collected, return failed with category missing_required_search_sources instead of a completed generic delivery.'
  };
}

function workflowSourceCollectionQualityRule(job = {}) {
  const contract = workflowSourceCollectionContractForJob(job);
  if (!contract?.required) return null;
  return {
    id: 'source_collection_required',
    instruction: contract.instruction
  };
}

function workflowPrimaryTaskForJob(job = {}) {
  const workflow = job?.input?._broker?.workflow && typeof job.input._broker.workflow === 'object'
    ? job.input._broker.workflow
    : {};
  return String(workflow.primaryTask || job.taskType || '').trim().toLowerCase();
}

function workflowMetaWithoutGlobalSearchFlags(workflow = {}) {
  const clean = workflow && typeof workflow === 'object' ? { ...workflow } : {};
  delete clean.forceWebSearch;
  delete clean.requiresWebSearch;
  delete clean.searchRequired;
  delete clean.webSearchRequiredReason;
  delete clean.requiresSourceCollection;
  delete clean.sourceCollectionRequiredReason;
  return clean;
}

async function dispatchJobToAssignedAgent(job, agent, env) {
  const endpoint = resolveAgentJobEndpoint(agent);
  const dispatchEndpoint = resolveDispatchEndpointUrl(endpoint, env);
  if (!dispatchEndpoint) {
    return { ok: false, failureReason: 'Assigned verified agent does not expose a job endpoint in manifest metadata' };
  }
  const payload = buildDispatchPayload(job, agent);
  const dispatchHeaders = buildDispatchHeaders(agent);
  const timeoutMs = endpointDispatchTimeoutMs(env, job, agent);
  const dispatchResult = await postJsonWithTimeout(dispatchEndpoint, payload, timeoutMs, dispatchHeaders);
  const { response, body } = dispatchResult;
  const observedEndpoint = dispatchEndpoint;
  if (!response.ok) {
    const reason = body?.error || body?.message || `Dispatch failed with status ${response.status}`;
    return { ok: false, endpoint: observedEndpoint, failureReason: reason, statusCode: response.status, responseBody: body };
  }
  const normalized = normalizeDispatchResponse(body);
  if (normalized.failed) {
    return { ok: false, endpoint: observedEndpoint, failureReason: normalized.failureReason || 'Agent reported failure', statusCode: response.status, responseBody: body };
  }
  normalized.usage = usageWithObservedJobTokens(job, normalized.usage, normalized.report);
  if (!normalized.accepted && !normalized.completed && !normalized.blocked) {
    return { ok: false, endpoint: observedEndpoint, failureReason: 'Dispatch response was malformed or did not acknowledge the job', statusCode: response.status, responseBody: body };
  }
  return { ok: true, endpoint: observedEndpoint, normalized, statusCode: response.status, responseBody: body };
}

async function loadDispatchJobAndAgent(storage, jobId, agentId) {
  if (
    typeof storage?.getJobById === 'function'
    && typeof storage?.getAgentById === 'function'
  ) {
    const [job, agent] = await Promise.all([
      storage.getJobById(jobId),
      storage.getAgentById(agentId)
    ]);
    return { job, agent };
  }
  const state = await storage.getState();
  return {
    job: state.jobs.find((item) => item.id === jobId),
    agent: state.agents.find((item) => item.id === agentId)
  };
}

async function dispatchExistingJobToAssignedAgent(storage, env, jobId, agentId, options = {}) {
  const { job, agent } = await loadDispatchJobAndAgent(storage, jobId, agentId);
  if (!job) return { error: 'Job not found', statusCode: 404 };
  if (!agent) return { error: 'Agent not found', statusCode: 404 };
  if (isTerminalJobStatus(job.status) && !workflowChildIsAdaptivePending(job)) {
    return { ok: true, mode: job.status, job: cloneJob(job) };
  }
  if (!resolveAgentJobEndpoint(agent)) {
    return { ok: true, mode: 'queued', job: cloneJob(job) };
  }
  if (dispatchExecutionIsFresh(job, agent)) {
    return { ok: true, mode: 'running', job: cloneJob(job), skippedInProgress: true };
  }
  if (workflowChildShouldRestartFromBeginning(job) && providerRunLimitReached(env, job)) {
    const reason = workflowRestartRequiredReason(job, `provider run limit reached (${providerRunAttempts(job)}/${workflowProviderRunMaxAttempts(env, job)})`);
    const failed = await failJob(storage, job.id, reason, ['provider run limit reached; full order retry required'], {
      failureStatus: 'failed',
      failureCategory: 'workflow_restart_required',
      retryable: false,
      attempts: providerRunAttempts(job),
      maxRetries: workflowProviderRunMaxAttempts(env, job),
      restartRequired: true,
      source: 'provider-run-limit'
    });
    await touchEvent(storage, 'FAILED', `${job.taskType}/${job.id.slice(0, 6)} provider run limit reached; retry from beginning`, {
      kind: 'provider_run_limit_reached',
      jobId: job.id,
      parentJobId: job.workflowParentId || null,
      attempts: providerRunAttempts(job),
      maxAttempts: workflowProviderRunMaxAttempts(env, job)
    });
    return { ok: true, mode: 'failed', job: failed, restartRequired: true, error: reason };
  }
  const lockDispatchJob = async (draft) => {
    const draftJob = draft.jobs.find((item) => item.id === job.id);
    const draftAgent = draft.agents.find((item) => item.id === agent.id);
    if (!draftJob) return { error: 'Job disappeared before dispatch lock', statusCode: 500 };
    if (!draftAgent) return { error: 'Agent disappeared before dispatch lock', statusCode: 500 };
    if (isTerminalJobStatus(draftJob.status) && !workflowChildIsAdaptivePending(draftJob)) {
      return { ok: true, mode: draftJob.status, job: cloneJob(draftJob), skippedTerminal: true };
    }
    if (dispatchExecutionIsFresh(draftJob, draftAgent)) {
      return { ok: true, mode: 'running', job: cloneJob(draftJob), skippedInProgress: true };
    }
    const completionStatus = String(draftJob.dispatch?.completionStatus || '').trim().toLowerCase();
    if (workflowChildShouldRestartFromBeginning(draftJob) && providerRunLimitReached(env, draftJob)) {
      const failedAt = nowIso();
      draftJob.status = 'failed';
      draftJob.failedAt = failedAt;
      draftJob.timedOutAt = null;
      draftJob.completedAt = null;
      draftJob.failureCategory = 'workflow_restart_required';
      draftJob.failureReason = workflowRestartRequiredReason(draftJob, `provider run limit reached (${providerRunAttempts(draftJob)}/${workflowProviderRunMaxAttempts(env, draftJob)})`);
      if (draftJob.billingReservation && !draftJob.billingSettlement?.settledAt && !draftJob.billingReservation?.releasedAt) {
        releaseBillingReservationInState(draft, draftJob);
      }
      draftJob.dispatch = {
        ...(draftJob.dispatch || {}),
        completionStatus: 'workflow_restart_required',
        failedAt,
        retryable: false,
        nextRetryAt: null,
        restartRequired: true,
        attempts: providerRunAttempts(draftJob),
        maxRetries: workflowProviderRunMaxAttempts(env, draftJob)
      };
      draftJob.logs = [...(draftJob.logs || []), 'provider run limit reached before dispatch; full order retry required'];
      return { ok: true, mode: 'failed', job: cloneJob(draftJob), restartRequired: true };
    }
    if (completionStatus && !['dispatch_scheduled', 'dispatch_in_progress', 'timed_out', 'failed', 'retry_queued', 'leader_auto_retry_queued', 'leader_checkpoint_queued', 'leader_final_summary_queued', 'leader_adaptive_queued'].includes(completionStatus)) {
      return { ok: true, mode: draftJob.status || completionStatus, job: cloneJob(draftJob), skippedLocked: true };
    }
    const at = nowIso();
    const providerRunAttempt = providerRunAttempts(draftJob) + 1;
    const dispatchTimeoutMs = endpointDispatchTimeoutMs(env, draftJob, draftAgent);
    draftJob.status = 'running';
    draftJob.startedAt = draftJob.startedAt || at;
    draftJob.dispatch = {
      ...(draftJob.dispatch || {}),
      endpoint: resolveAgentJobEndpoint(draftAgent),
      dispatchInProgressAt: at,
      dispatchTimeoutMs,
      lastAttemptAt: at,
      completionStatus: 'dispatch_in_progress',
      retryable: false,
      nextRetryAt: null,
      maxRetries: maxDispatchRetriesForJob(draftJob),
      providerRunAttempts: providerRunAttempt,
      providerRunMaxAttempts: workflowProviderRunMaxAttempts(env, draftJob)
    };
    draftJob.logs = [...(draftJob.logs || []), `dispatch locked for ${draftAgent.id} provider_run_attempt=${providerRunAttempt}/${workflowProviderRunMaxAttempts(env, draftJob)}`];
    return { ok: true, mode: 'locked', job: cloneJob(draftJob), agent: structuredClone(draftAgent) };
  };
  const locked = typeof storage.mutateJobAndAgent === 'function'
    ? await storage.mutateJobAndAgent(job.id, agent.id, lockDispatchJob)
    : await storage.mutate(lockDispatchJob);
  if (locked?.error) return { error: locked.error, statusCode: locked.statusCode || 500 };
  if (locked?.mode && locked.mode !== 'locked') {
    if (locked.mode === 'failed' && locked.job?.workflowParentId) await reconcileWorkflowParent(storage, locked.job.workflowParentId);
    return locked;
  }
  const dispatchJob = locked?.job || job;
  const dispatchAgent = locked?.agent || agent;
  try {
    const dispatch = await dispatchJobToAssignedAgent(dispatchJob, dispatchAgent, env);
    const mutateDispatchResult = async (draft) => {
      const draftJob = draft.jobs.find((item) => item.id === dispatchJob.id);
      const draftAgent = draft.agents.find((item) => item.id === dispatchAgent.id);
      if (!draftJob) return { error: 'Job disappeared during dispatch', statusCode: 500 };
      if (isTerminalJobStatus(draftJob.status)) {
        return { ok: true, mode: draftJob.status, job: cloneJob(draftJob), skippedTerminal: true };
      }
      if (String(draftJob.status || '').trim().toLowerCase() === 'blocked') {
        return { ok: true, mode: 'blocked', job: cloneJob(draftJob), skippedBlocked: true };
      }
      if (!dispatch.ok) {
        const failureMeta = buildDispatchFailureMeta(draftJob, dispatch.statusCode, dispatch.failureReason);
        const sourceRetryMeta = failureMeta.category === 'missing_required_sources'
          ? sourceCollectionFailureRetryMeta(env, draftJob)
          : null;
        const effectiveFailureMeta = sourceRetryMeta
          ? { ...failureMeta, ...sourceRetryMeta, category: failureMeta.category }
          : failureMeta;
        const restartRequired = workflowChildDispatchFailureRequiresRestart(env, draftJob, effectiveFailureMeta);
        draftJob.status = 'failed';
        draftJob.failedAt = nowIso();
        draftJob.failureReason = restartRequired ? workflowRestartRequiredReason(draftJob, dispatch.failureReason) : dispatch.failureReason;
        draftJob.failureCategory = restartRequired ? 'workflow_restart_required' : failureMeta.category;
        if (draftJob.billingReservation && !draftJob.billingReservation?.releasedAt) {
          releaseBillingReservationInState(draft, draftJob);
        }
        draftJob.dispatch = {
          ...(draftJob.dispatch || {}),
          endpoint: dispatch.endpoint || draftJob.dispatch?.endpoint || null,
          statusCode: dispatch.statusCode || null,
          responseStatus: dispatch.responseBody?.status || null,
          lastAttemptAt: nowIso(),
          attempts: providerRunAttempts(draftJob) || effectiveFailureMeta.attempts,
          retryable: restartRequired ? false : (sourceRetryMeta?.retryable ?? failureMeta.retryable),
          nextRetryAt: restartRequired ? null : (sourceRetryMeta?.nextRetryAt ?? failureMeta.nextRetryAt),
          maxRetries: sourceRetryMeta?.maxRetries ?? workflowCompletionRetryLimitForJob(env, draftJob),
          completionStatus: restartRequired ? 'workflow_restart_required' : 'failed',
          restartRequired
        };
        draftJob.logs = [...(draftJob.logs || []), `dispatch failed for ${dispatchAgent.id}`, dispatch.failureReason, restartRequired ? 'full order retry required' : `retryable=${sourceRetryMeta?.retryable ?? failureMeta.retryable}`];
        return { ok: true, mode: 'failed', job: cloneJob(draftJob) };
      }

      draftJob.dispatchedAt = nowIso();
      draftJob.startedAt = draftJob.startedAt || draftJob.dispatchedAt;
      draftJob.status = 'dispatched';
      draftJob.dispatch = {
        ...(draftJob.dispatch || {}),
        endpoint: dispatch.endpoint,
        statusCode: dispatch.statusCode,
        externalJobId: dispatch.normalized.externalJobId,
        responseStatus: dispatch.normalized.status,
        lastAttemptAt: nowIso(),
        attempts: Number(draftJob.dispatch?.attempts || 0) + 1,
        retryable: false,
        nextRetryAt: null,
        completionStatus: dispatch.normalized.blocked ? 'blocked' : (dispatch.normalized.completed ? 'completed' : 'accepted'),
        ...(dispatch.normalized.accepted && !dispatch.normalized.completed && !dispatch.normalized.blocked ? { providerQueueAcceptedAt: nowIso() } : {})
      };
      draftJob.logs = [...(draftJob.logs || []), `dispatched to ${dispatchAgent.id} endpoint=${dispatch.endpoint}`];

      if (dispatch.normalized.completed) {
        const explicitAuthorityRequest = authorityRequestFromReport(dispatch.normalized.report);
        draftJob.status = 'completed';
        draftJob.completedAt = nowIso();
        draftJob.usage = dispatch.normalized.usage;
        draftJob.output = {
          report: dispatch.normalized.report,
          files: dispatch.normalized.files,
          returnTargets: dispatch.normalized.returnTargets
        };
        appendWorkflowOriginalInfoUsage(draftJob);
        const sourceProofFailure = workflowSearchCompletionFailureReason(draftJob, dispatch.normalized.report);
        if (sourceProofFailure) {
          const sourceRetryMeta = sourceCollectionFailureRetryMeta(env, draftJob, { alreadyAttempted: true });
          const restartRequired = workflowChildDispatchFailureRequiresRestart(env, draftJob, {
            category: 'missing_required_sources',
            ...sourceRetryMeta
          });
          draftJob.status = 'failed';
          draftJob.completedAt = null;
          draftJob.failedAt = nowIso();
          draftJob.failureReason = restartRequired ? workflowRestartRequiredReason(draftJob, sourceProofFailure) : sourceProofFailure;
          draftJob.failureCategory = restartRequired ? 'workflow_restart_required' : 'missing_required_sources';
          draftJob.actualBilling = null;
          clearDeliveryCompletionGate(draftJob);
          if (draftJob.billingReservation && !draftJob.billingReservation?.releasedAt) {
            releaseBillingReservationInState(draft, draftJob);
          }
          draftJob.dispatch = {
            ...(draftJob.dispatch || {}),
            completionStatus: restartRequired ? 'workflow_restart_required' : 'failed',
            retryable: restartRequired ? false : sourceRetryMeta.retryable,
            attempts: restartRequired ? providerRunAttempts(draftJob) : sourceRetryMeta.attempts,
            nextRetryAt: restartRequired ? null : sourceRetryMeta.nextRetryAt,
            maxRetries: sourceRetryMeta.maxRetries,
            restartRequired
          };
          draftJob.logs.push(sourceProofFailure, restartRequired ? 'full order retry required after missing search execution proof' : 'failed before completion: missing search execution proof');
          return { ok: true, mode: 'failed', job: cloneJob(draftJob) };
        }
        const completionFailure = agentCompletionFailureReason(draftJob);
        if (completionFailure) {
          markAgentCompletionFailedFreeInState(draft, draftJob, completionFailure, env, { failedAt: nowIso() });
          return { ok: true, mode: 'failed', job: cloneJob(draftJob), billing: null };
        }
        const authorityRequest = syncJobAuthorityRequest(draftJob, draftAgent);
        if (shouldBlockCompletedJobForAuthorityRequest(draftJob, authorityRequest || explicitAuthorityRequest)) {
          markJobBlockedForAuthority(draftJob, authorityRequest || explicitAuthorityRequest, 'External execution is blocked waiting for connector approval.');
          markWorkflowParentBlockedIfNeeded(draft, draftJob);
          return { ok: true, mode: 'blocked', job: cloneJob(draftJob) };
        }
        const billing = estimateBilling(dispatchAgent, dispatch.normalized.usage);
        draftJob.actualBilling = billing;
        setDeliveryCompletionGate(draftJob, draftJob.completedAt);
        draftJob.logs.push(`completed by dispatch response from ${dispatchAgent.id}`, billingLogLine(draftJob, billing), `delivery completion gate score=${draftJob.deliveryCompletionGate.score}`);
        settleAgentEarnings(draftJob, draftAgent, billing);
        return { ok: true, mode: 'completed', job: cloneJob(draftJob), billing };
      }

      if (dispatch.normalized.blocked) {
        const explicitAuthorityRequest = authorityRequestFromReport(dispatch.normalized.report);
        draftJob.status = 'blocked';
        draftJob.completedAt = null;
        draftJob.failedAt = null;
        draftJob.timedOutAt = null;
        draftJob.failureReason = null;
        draftJob.failureCategory = null;
        draftJob.usage = dispatch.normalized.usage;
        draftJob.output = {
          report: dispatch.normalized.report,
          files: dispatch.normalized.files,
          returnTargets: dispatch.normalized.returnTargets
        };
        appendWorkflowOriginalInfoUsage(draftJob);
        draftJob.actualBilling = null;
        clearDeliveryCompletionGate(draftJob);
        const authorityRequest = syncJobAuthorityRequest(draftJob, draftAgent);
        if (authorityRequestHandledBySaasHandoff(draftJob, authorityRequest || explicitAuthorityRequest) || workflowChildIsSaasHandoffOnly(draftJob)) {
          const primaryTask = workflowPrimaryTaskFromJobOrProfile(draftJob) || workflowTaskName(draftJob);
          completeWorkflowSaasHandoffOnlyChild({ taskType: primaryTask, workflow: { plannedTasks: [primaryTask] } }, draftJob, 'provider_blocked_saas_handoff');
          const billing = estimateBilling(dispatchAgent, dispatch.normalized.usage);
          draftJob.actualBilling = billing;
          setDeliveryCompletionGate(draftJob, draftJob.completedAt);
          settleAgentEarnings(draftJob, draftAgent, billing);
          return { ok: true, mode: 'completed', job: cloneJob(draftJob), billing };
        }
        markJobBlockedForAuthority(draftJob, authorityRequest, 'External execution is blocked waiting for connector approval.');
        draftJob.logs.push(`dispatch blocked by ${dispatchAgent.id} status=${dispatch.normalized.status}`);
        markWorkflowParentBlockedIfNeeded(draft, draftJob);
        return { ok: true, mode: 'blocked', job: cloneJob(draftJob) };
      }

      draftJob.logs.push(`dispatch accepted by ${dispatchAgent.id} status=${dispatch.normalized.status}`);
      return { ok: true, mode: 'dispatched', job: cloneJob(draftJob) };
    };
    const canUseTargetedDispatchResult = typeof storage.mutateJobAndAgent === 'function';
    const final = canUseTargetedDispatchResult
      ? await storage.mutateJobAndAgent(dispatchJob.id, dispatchAgent.id, mutateDispatchResult)
      : await storage.mutate(mutateDispatchResult);

    if (final.error) return { error: final.error, statusCode: final.statusCode || 500 };
    if (final.mode === 'completed') {
      if (!final.skippedTerminal) await touchEvent(storage, 'COMPLETED', `${dispatchJob.taskType}/${dispatchJob.id.slice(0, 6)} completed by dispatch`);
      if (final.billing) await recordBillingOutcome(storage, final.job, final.billing, 'external-dispatch');
    } else if (final.mode === 'blocked') {
      await touchEvent(storage, 'RUNNING', `${dispatchJob.taskType}/${dispatchJob.id.slice(0, 6)} blocked waiting for approval or connector setup`);
    } else if (final.mode === 'dispatched') {
      await touchEvent(storage, 'RUNNING', `${dispatchAgent.name} accepted ${dispatchJob.taskType}/${dispatchJob.id.slice(0, 6)}`);
    } else if (!final.skippedTerminal) {
      await touchEvent(storage, 'FAILED', `${dispatchJob.taskType}/${dispatchJob.id.slice(0, 6)} dispatch failed`);
    }
    if (dispatchJob.workflowParentId) {
      await reconcileWorkflowParent(storage, dispatchJob.workflowParentId);
      if (final.mode === 'completed') {
        await refreshWorkflowLeaderHandoffForJobId(storage, dispatchJob.workflowParentId);
        const queueNextDispatch = Boolean(workflowDispatchQueue(env));
        await scheduleProgressDispatchesForJobId(storage, env, null, dispatchJob.workflowParentId, 'leader workflow handoff', {
          maxTargets: WORKFLOW_PROGRESS_DISPATCH_MAX_TARGETS,
          awaitDispatch: !queueNextDispatch,
          dispatchMode: queueNextDispatch ? 'queue' : (options.nextDispatchMode || 'direct')
        });
        await reconcileWorkflowParent(storage, dispatchJob.workflowParentId);
      }
    }
    return final;
  } catch (error) {
    const restartRequired = workflowChildShouldRestartFromBeginning(dispatchJob);
    const failed = await failJob(storage, dispatchJob.id, restartRequired ? workflowRestartRequiredReason(dispatchJob, error.message) : error.message, [`dispatch exception for ${dispatchAgent.id}`], {
      failureCategory: restartRequired ? 'workflow_restart_required' : 'dispatch_error',
      retryable: restartRequired ? false : true,
      attempts: providerRunAttempts(dispatchJob) || 1,
      nextRetryAt: restartRequired ? null : computeNextRetryAt(1),
      restartRequired
    });
    await touchEvent(storage, 'FAILED', `${dispatchJob.taskType}/${dispatchJob.id.slice(0, 6)} dispatch exception`);
    if (dispatchJob.workflowParentId) await reconcileWorkflowParent(storage, dispatchJob.workflowParentId);
    return { ok: true, mode: failed?.status || 'failed', job: failed, error: error.message };
  }
}

function canAutoScheduleAsyncDispatch(job, agent) {
  if (!job || !agent) return false;
  const status = String(job.status || '').toLowerCase();
  if (status !== 'queued') {
    const completionStatus = String(job.dispatch?.completionStatus || '').toLowerCase();
    const staleScheduledDispatch = status === 'running'
      && completionStatus === 'dispatch_scheduled'
      && !dispatchScheduleIsFreshForAgent(job, agent);
    const staleInProgressDispatch = status === 'running'
      && completionStatus === 'dispatch_in_progress'
      && !dispatchExecutionIsFresh(job, agent);
    if ((staleScheduledDispatch || staleInProgressDispatch) && Number(job.dispatch?.scheduleAttempts || 0) >= maxDispatchRetriesForJob(job)) return false;
    if (!staleScheduledDispatch && !staleInProgressDispatch) return false;
  }
  if (!job.assignedAgentId || job.assignedAgentId !== agent.id) return false;
  if (!resolveAgentJobEndpoint(agent)) return false;
  return true;
}

function workflowChildPlanIndex(parent = {}, child = {}) {
  const task = workflowTaskName(child);
  const sequencePhase = workflowSequencePhaseForJob(child);
  const plannedTasks = Array.isArray(parent.workflow?.plannedTasks)
    ? parent.workflow.plannedTasks.map((item) => String(item || '').trim().toLowerCase())
    : [];
  const taskIndex = plannedTasks.indexOf(task);
  if (taskIndex >= 0) return taskIndex;
  const plannedRuns = Array.isArray(parent.workflow?.childRuns) ? parent.workflow.childRuns : [];
  const runIndex = plannedRuns.findIndex((run) => {
    const runTask = String(run?.taskType || run?.task_type || '').trim().toLowerCase();
    const runAgentId = String(run?.agentId || run?.agent_id || '').trim();
    const runPhase = String(run?.sequencePhase || run?.sequence_phase || '').trim().toLowerCase();
    return runTask === task
      && (!runAgentId || runAgentId === child.assignedAgentId)
      && (!runPhase || runPhase === sequencePhase);
  });
  return runIndex >= 0 ? runIndex : Number.MAX_SAFE_INTEGER;
}

function workflowChildSortKey(parent = {}, child = {}) {
  const task = workflowTaskName(child);
  const phase = workflowSequencePhaseForJob(child);
  const planIndex = workflowChildPlanIndex(parent, child);
  if (isWorkflowLeaderTask(task)) {
    if (phase === 'checkpoint') {
      const beforeLayer = Number(child?.input?._broker?.workflow?.requiredBeforeLayer || 2) || 2;
      return (Math.max(2, beforeLayer) * 10_000) - 100 + planIndex;
    }
    if (phase === 'final_summary') return 90_000 + planIndex;
    return planIndex;
  }
  const layer = workflowDispatchLayer(parent, child);
  return (Math.max(1, layer) * 10_000) + planIndex;
}

function sortWorkflowChildren(parent = {}, children = []) {
  return [...children].sort((a, b) => {
    const leftIndex = workflowChildSortKey(parent, a);
    const rightIndex = workflowChildSortKey(parent, b);
    if (leftIndex !== rightIndex) return leftIndex - rightIndex;
    const created = String(a.createdAt || '').localeCompare(String(b.createdAt || ''));
    if (created) return created;
    return String(a.id || '').localeCompare(String(b.id || ''));
  });
}

function workflowChildIsTerminal(child = {}) {
  return ['completed', 'failed', 'timed_out', 'blocked'].includes(String(child.status || '').toLowerCase());
}

function workflowChildIsAdaptivePending(child = {}) {
  const status = String(child?.status || '').trim().toLowerCase();
  if (['completed', 'failed', 'timed_out'].includes(status)) return false;
  const workflow = workflowBrokerWorkflowForJob(child) || {};
  const completionStatus = String(child?.dispatch?.completionStatus || child?.dispatch_completion_status || '').trim().toLowerCase();
  return Boolean(
    workflow.adaptivePending === true
    || child?.adaptivePending === true
    || child?.adaptive_pending === true
    || completionStatus === 'leader_adaptive_pending'
  );
}

function workflowChildIsSequentialUserActionDeferred(child = {}) {
  const completionStatus = String(child?.dispatch?.completionStatus || child?.dispatch_completion_status || '').trim().toLowerCase();
  const workflow = workflowBrokerWorkflowForJob(child) || {};
  return completionStatus === 'leader_user_action_deferred' || workflow.sequentialUserActionDeferred === true;
}

function workflowChildIsLeaderReplanDeferred(child = {}) {
  const completionStatus = String(child?.dispatch?.completionStatus || child?.dispatch_completion_status || '').trim().toLowerCase();
  const workflow = workflowBrokerWorkflowForJob(child) || {};
  return completionStatus === 'leader_replan_deferred' || workflow.leaderReplanDeferred === true;
}

function workflowChildAdaptiveLayer(child = {}) {
  const workflow = workflowBrokerWorkflowForJob(child) || {};
  const layer = Number(workflow.adaptivePendingLayer || workflow.dispatchLayer || child?.adaptiveLayer || child?.adaptive_layer || 0) || 0;
  return layer > 0 ? layer : null;
}

function workflowChildIsBlockingProgress(child = {}) {
  const status = String(child?.status || '').trim().toLowerCase();
  if (status !== 'blocked') return false;
  if (workflowChildIsAdaptivePending(child)) return false;
  if (workflowChildIsSaasHandoffOnly(child)) return false;
  if (isWorkflowLeaderTask(workflowTaskName(child))) return false;
  return true;
}

function workflowChildIsApprovalBlockedTerminal(child = {}) {
  const status = String(child?.status || '').trim().toLowerCase();
  if (status !== 'blocked') return false;
  if (isWorkflowLeaderTask(workflowTaskName(child))) return workflowLeaderChildIsApprovalBlockedTerminal(child);
  const authorityRequest = authorityRequestFromReport(child.output?.report);
  const authoritySource = String(authorityRequest?.source || '').trim().toLowerCase();
  if (authoritySource === 'search_connector_required') return false;
  const missingConnectors = authorityStringList(
    authorityRequest?.missing_connectors || authorityRequest?.missingConnectors || authorityRequest?.connectors,
    8,
    60
  );
  const missingCapabilities = authorityStringList(
    authorityRequest?.missing_connector_capabilities || authorityRequest?.missingConnectorCapabilities || authorityRequest?.capabilities,
    12,
    80
  );
  if (
    missingConnectors.length
    && missingConnectors.every((item) => ['search', 'web_search', 'brave', 'ga4', 'google_analytics', 'search_console', 'gsc', 'analytics'].includes(String(item || '').trim().toLowerCase()))
    && !missingCapabilities.length
  ) {
    return false;
  }
  const phase = workflowSequencePhaseForJob(child);
  const task = workflowTaskName(child);
  const actionTask = ['x_post', 'instagram', 'reddit', 'indie_hackers', 'directory_submission', 'acquisition_automation', 'email_ops', 'cold_email'].includes(task);
  const approvalBlocked = child.failureCategory === 'blocked_waiting_for_approval'
    || child.dispatch?.completionStatus === 'blocked_waiting_for_approval'
    || authorityRequestRequiresApproval(authorityRequest);
  return Boolean(approvalBlocked && (phase === 'action' || actionTask));
}

function authorityRequestRequiresSequentialUserAction(request = null) {
  if (!request || typeof request !== 'object') return false;
  const source = String(request.source || request.reason_code || request.reasonCode || '').trim().toLowerCase();
  if (source === 'search_connector_required') return false;
  const missingConnectors = authorityStringList(
    request.missing_connectors || request.missingConnectors || request.required_connectors || request.requiredConnectors || request.connectors,
    8,
    60
  ).map((item) => String(item || '').trim().toLowerCase());
  const missingCapabilities = authorityStringList(
    request.missing_connector_capabilities || request.missingConnectorCapabilities || request.required_connector_capabilities || request.requiredConnectorCapabilities || request.capabilities,
    12,
    80
  );
  const requiredGoogleSources = authorityStringList(
    request.required_google_sources || request.requiredGoogleSources || request.google_source_types || request.googleSourceTypes,
    8,
    60
  );
  const humanConnectors = missingConnectors.filter((item) => !['search', 'web_search', 'brave'].includes(item));
  return Boolean(
    humanConnectors.length
    || missingCapabilities.length
    || requiredGoogleSources.length
    || authorityRequestRequiresApproval(request)
  );
}

function workflowChildRequiresSequentialUserAction(parent = {}, child = {}) {
  if (!child || typeof child !== 'object') return false;
  const task = workflowTaskName(child);
  const phase = workflowSequencePhaseForJob(child);
  if (isWorkflowLeaderTask(task)) return ['checkpoint', 'final_summary'].includes(phase);
  if (authorityRequestRequiresSequentialUserAction(authorityRequestFromReport(child.output?.report))) return true;
  const broker = child?.input?._broker && typeof child.input._broker === 'object' ? child.input._broker : {};
  const workflow = broker.workflow && typeof broker.workflow === 'object' ? broker.workflow : {};
  if (workflow.actionHandoffOnly === true || String(workflow.externalActionMode || '').trim().toLowerCase() === 'saas_handoff_only') return false;
  return false;
}

function workflowHasActiveSequentialUserActionWait(parent = {}, children = [], options = {}) {
  const targetLayer = Math.max(0, Number(options.targetLayer || 0) || 0);
  return (Array.isArray(children) ? children : []).some((child) => {
    if (workflowChildIsAdaptivePending(child)) return false;
    if (targetLayer > 0 && workflowDispatchLayer(parent, child) !== targetLayer) return false;
    if (!workflowChildRequiresSequentialUserAction(parent, child)) return false;
    const status = String(child?.status || '').trim().toLowerCase();
    const completionStatus = String(child?.dispatch?.completionStatus || child?.dispatch_completion_status || '').trim().toLowerCase();
    return ['blocked', 'action_required', 'needs_action', 'approval_required', 'connector_required'].includes(status)
      || ['blocked_waiting_for_approval', 'approval_waiting_retry_paused'].includes(completionStatus);
  });
}

function workflowLeaderChildIsApprovalBlockedTerminal(child = {}) {
  const status = String(child?.status || '').trim().toLowerCase();
  if (status !== 'blocked') return false;
  if (!isWorkflowLeaderTask(workflowTaskName(child))) return false;
  const phase = workflowSequencePhaseForJob(child);
  if (!['checkpoint', 'final_summary'].includes(phase)) return false;
  const authorityRequest = authorityRequestFromReport(child.output?.report);
  if (authorityRequestHandledBySaasHandoff(child, authorityRequest)) return false;
  return Boolean(
    child.failureCategory === 'blocked_waiting_for_approval'
    || child.dispatch?.completionStatus === 'blocked_waiting_for_approval'
    || authorityRequestRequiresApproval(authorityRequest)
  );
}

function workflowChildIsTerminalForProgress(child = {}) {
  if (workflowChildIsAdaptivePending(child)) return false;
  if (workflowChildIsApprovalBlockedTerminal(child)) return true;
  if (workflowChildIsBlockingProgress(child)) return false;
  return workflowChildIsTerminal(child);
}

function workflowReplanTextValue(value, options = {}) {
  const maxChars = Math.max(500, Math.min(20000, Number(options.maxChars || 8000) || 8000));
  const seen = options.seen || new Set();
  const collect = (item) => {
    if (item === null || item === undefined) return '';
    if (typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean') return String(item);
    if (typeof item !== 'object') return '';
    if (seen.has(item)) return '';
    seen.add(item);
    if (Array.isArray(item)) return item.map(collect).filter(Boolean).join('\n');
    return Object.entries(item)
      .filter(([key]) => !/token|secret|callback|billing|usage|cost|id$/i.test(String(key || '')))
      .map(([key, nested]) => `${key}: ${collect(nested)}`)
      .filter((line) => line.replace(/^[^:]+:\s*/, '').trim())
      .join('\n');
  };
  return collect(value).replace(/\s+/g, ' ').trim().slice(0, maxChars);
}

function workflowLeaderReplanDecisionForLayer(parent = {}, children = [], targetLayer = 1, options = {}) {
  const primary = workflowPrimaryTask(parent);
  const layer = Math.max(1, Number(targetLayer || 1) || 1);
  const candidateChildren = (Array.isArray(children) ? children : [])
    .filter((child) => workflowChildIsAdaptivePending(child))
    .filter((child) => workflowDispatchLayer(parent, child) === layer);
  const candidateTasks = [...new Set(candidateChildren.map((child) => workflowTaskName(child)).filter(Boolean))];
  if (candidateTasks.length <= 1) return null;
  const sourceLeader = options.sourceLeader || options.checkpointJob || null;
  const priorCompleted = sortWorkflowChildren(parent, children)
    .filter((child) => String(child?.status || '').trim().toLowerCase() === 'completed')
    .filter((child) => workflowDispatchLayer(parent, child) < layer);
  const planningOutputs = priorCompleted.filter((child) => leaderTaskPhase(primary, workflowTaskName(child)) === 'planning');
  const sourceText = [
    workflowReplanTextValue(sourceLeader?.output || {}, { maxChars: 6000 }),
    ...planningOutputs.map((child) => workflowReplanTextValue(child.output || {}, { maxChars: 5000 })),
    ...priorCompleted.map((child) => workflowReplanTextValue({
      task: workflowTaskName(child),
      summary: child.output?.summary || child.output?.report?.summary || child.failureReason || ''
    }, { maxChars: 1000 }))
  ].filter(Boolean).join('\n');
  const replan = leaderWorkflowReplanDecisionFromDefinition(primary, {
    candidateTasks,
    sourceText,
    layer,
    actionLayerStart: leaderActionLayerStart(primary)
  });
  if (!replan) return null;
  return {
    ...replan,
    selectedTaskSet: new Set(replan.selectedTasks || [])
  };
}

function markWorkflowParentBlockedIfNeeded(state = {}, childJob = {}) {
  const parentId = String(childJob?.workflowParentId || '').trim();
  if (!parentId) return false;
  const parent = Array.isArray(state.jobs)
    ? state.jobs.find((item) => item.id === parentId && item.jobKind === 'workflow')
    : null;
  if (!parent) return false;
  const children = sortWorkflowChildren(parent, state.jobs.filter((item) => item.workflowParentId === parentId));
  const blockingChildren = children.filter(workflowChildIsBlockingProgress);
  const blockedStatus = workflowBlockedParentStatus(parent, children, blockingChildren);
  if (blockedStatus !== 'blocked') return false;
  const agentChildren = workflowAgentRunChildren(children);
  const visibleAgentChildren = workflowVisibleAgentRunChildren(children);
  const internalChildren = children.filter((child) => workflowChildIsInternalLeaderSequenceRun(child));
  parent.workflow = {
    ...(parent.workflow || {}),
    childJobIds: children.map((item) => item.id),
    childRuns: workflowChildSnapshot(children),
    plannedAgentRunCount: visibleAgentChildren.length,
    plannedCandidateAgentRunCount: agentChildren.length,
    adaptiveCandidateRunCount: agentChildren.length - visibleAgentChildren.length,
    internalCheckpointRunCount: internalChildren.length,
    agentStatusCounts: workflowStatusCounts(visibleAgentChildren),
    internalStatusCounts: workflowStatusCounts(internalChildren),
    statusCounts: workflowStatusCounts(children, Array.isArray(parent.workflow?.childRuns) ? parent.workflow.childRuns.length : children.length)
  };
  parent.status = blockedStatus;
  parent.completedAt = null;
  parent.failedAt = null;
  parent.failureReason = blockingChildren[0]?.failureReason
    || blockingChildren[0]?.output?.summary
    || 'Workflow is blocked by a required specialist run.';
  parent.failureCategory = 'blocked_waiting_for_approval';
  parent.dispatch = {
    ...(parent.dispatch || {}),
    completionStatus: 'blocked_waiting_for_approval',
    retryable: false,
    nextRetryAt: null,
    completedAt: null
  };
  parent.output = buildAgentTeamDeliveryOutput(parent, children);
  syncJobAuthorityRequest(parent);
  return true;
}

function workflowCompletedRunHandoff(parent = {}, child = {}) {
  const output = child.output && typeof child.output === 'object' ? child.output : {};
  const report = output.report && typeof output.report === 'object' ? output.report : {};
  const files = Array.isArray(output.files)
    ? output.files
      .map((item) => ({
        name: String(item?.name || '').slice(0, 160),
        content: String(item?.content || '').slice(0, 8000)
      }))
      .filter((item) => item.name || item.content)
      .slice(0, 2)
    : [];
  const webSources = workflowSearchSourcesFromReport(report);
  const structuredResearchHandoff = workflowResearchHandoffFromReport(report);
  const deliverableMarkdown = files
    .map((file) => [`# ${file.name || 'delivery.md'}`, file.content].filter(Boolean).join('\n'))
    .filter(Boolean)
    .join('\n\n')
    .slice(0, 18000);
  const handoffRun = {
    jobId: child.id || null,
    taskType: workflowTaskName(child),
    agentId: child.assignedAgentId || null,
    agentName: child.workflowAgentName || null,
    sequencePhase: workflowSequencePhaseForJob(child) || null,
    layer: workflowDispatchLayer(parent, child),
    completedAt: child.completedAt || null,
    summary: String(output.summary || report.summary || '').slice(0, 1600),
    bullets: Array.isArray(report.bullets)
      ? report.bullets.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 6)
      : [],
    nextAction: String(report.nextAction || report.next_action || '').slice(0, 1000),
    webSources,
    sourceBundle: {
      webSources,
      sourceSignals: workflowSourceSignalStrings(webSources),
      sourceCount: webSources.length
    },
    structuredResearchHandoff,
    qualityGate: child.qualityGate || null,
    files,
    deliverableMarkdown,
    requiredUsageSignals: workflowHandoffOriginalSignals([{ summary: output.summary || report.summary || '', bullets: report.bullets || [], webSources, files }]),
    promptContextAttached: Boolean(
      workflowStoredAdditionalPrompt(child)
      || String(child.prompt || '').includes(WORKFLOW_HANDOFF_CONTEXT_START)
    )
  };
  handoffRun.structuredDigest = workflowStructuredHandoffDigestFromRun(handoffRun);
  return handoffRun;
}

function workflowPriorCompletedRuns(parent = {}, children = [], targetLayer = 1) {
  return sortWorkflowChildren(parent, children)
    .filter((child) => child.status === 'completed')
    .filter((child) => !isWorkflowLeaderTask(workflowTaskName(child)))
    .filter((child) => !workflowChildIsLeaderReplanDeferred(child))
    .filter((child) => !workflowOptionalUnavailablePriorRun(parent, child, targetLayer))
    .filter((child) => workflowDispatchLayer(parent, child) < targetLayer)
    .map((child) => workflowCompletedRunHandoff(parent, child))
    .slice(0, 10);
}

function workflowDataUnavailableOutput(child = {}) {
  if (workflowTaskName(child) !== 'data_analysis') return false;
  const output = child.output && typeof child.output === 'object' ? child.output : {};
  const runtime = output.runtime && typeof output.runtime === 'object' ? output.runtime : {};
  const report = output.report && typeof output.report === 'object' ? output.report : {};
  const text = workflowOutputText(child);
  return String(runtime.workflow || '').trim().toLowerCase() === 'workflow_data_unavailable_packet'
    || String(runtime.mode || '').trim().toLowerCase() === 'data_unavailable_packet'
    || /data layer skipped|no analytics\/data context|no ga4|分析コンテキストが未接続|データ層をスキップ/i.test([
      output.summary,
      report.summary,
      report.nextAction,
      text
    ].filter(Boolean).join(' '));
}

function workflowUnavailablePriorRunIsOptional(run = {}) {
  const reason = String(run.reason || run.unavailableReason || run.status || '').trim().toLowerCase();
  return run.optional === true
    || reason === 'no_analytics_context'
    || reason === 'data_unavailable'
    || reason === 'data_timeout_no_analytics_context'
    || reason === 'skipped_no_data_context';
}

function workflowJobHasAttachedDataContext(job = {}) {
  const broker = job?.input?._broker && typeof job.input._broker === 'object' ? job.input._broker : {};
  const contexts = [
    ...(Array.isArray(broker.appContexts) ? broker.appContexts : []),
    ...(Array.isArray(broker.connectorContexts) ? broker.connectorContexts : [])
  ].filter((context) => context && typeof context === 'object');
  if (!contexts.length) return false;
  return contexts.some((context) => {
    if (Array.isArray(context.metrics) && context.metrics.length) return true;
    const raw = context.raw_context && typeof context.raw_context === 'object'
      ? context.raw_context
      : (context.rawContext && typeof context.rawContext === 'object' ? context.rawContext : {});
    const text = workflowFlattenTextParts([
      context.source_app,
      context.sourceApp,
      context.title,
      context.summary,
      raw.connector_provider,
      raw.provider,
      raw.connector_type,
      raw.connectorType,
      raw.connector_services,
      raw.connectorServices,
      raw.googleGa4Property,
      raw.googleSearchConsoleSite,
      raw.googleReportSources,
      raw.googleReportLoaded
    ]).join(' ').toLowerCase();
    return /(analytics|google analytics|ga4|search console|\bgsc\b|conversion|funnel|cohort|acquisition|traffic|query|event|billing|orders?|stripe|dataset|spreadsheet|sheet|csv|metric)/i.test(text);
  });
}

function workflowOptionalUnavailablePriorRun(parent = {}, child = {}, targetLayer = 1) {
  if (!child || isWorkflowLeaderTask(workflowTaskName(child))) return null;
  const taskType = workflowTaskName(child);
  const status = String(child.status || '').trim().toLowerCase();
  const layer = workflowDispatchLayer(parent, child);
  if (layer >= Math.max(1, Number(targetLayer || 1) || 1)) return null;
  const completedDataUnavailable = status === 'completed' && workflowDataUnavailableOutput(child);
  const timedOutDataWithoutContext = taskType === 'data_analysis'
    && ['failed', 'timed_out'].includes(status)
    && !workflowJobHasAttachedDataContext(child);
  if (!completedDataUnavailable && !timedOutDataWithoutContext) return null;
  const output = child.output && typeof child.output === 'object' ? child.output : {};
  const report = output.report && typeof output.report === 'object' ? output.report : {};
  const reason = timedOutDataWithoutContext ? 'data_timeout_no_analytics_context' : 'no_analytics_context';
  return {
    jobId: child.id || null,
    taskType,
    agentId: child.assignedAgentId || null,
    agentName: child.workflowAgentName || null,
    sequencePhase: workflowSequencePhaseForJob(child) || null,
    layer,
    status: 'skipped',
    optional: true,
    reason,
    summary: String(output.summary || report.summary || child.failureReason || 'Data context was not attached; data layer skipped.').slice(0, 1000),
    nextAction: String(report.nextAction || report.next_action || '').slice(0, 1000),
    completedAt: child.completedAt || null,
    failedAt: child.failedAt || child.timedOutAt || null
  };
}

function workflowPriorUnavailableRuns(parent = {}, children = [], targetLayer = 1) {
  return sortWorkflowChildren(parent, children)
    .map((child) => workflowOptionalUnavailablePriorRun(parent, child, targetLayer))
    .filter(Boolean)
    .slice(0, 6);
}

function workflowLeaderPriorLayerUnavailable(parent = {}, leaderJob = {}) {
  if (workflowLeaderPriorLayerOptionalOnly(parent, leaderJob)) return false;
  const phase = workflowSequencePhaseForJob(leaderJob);
  if (phase !== 'checkpoint') return false;
  const workflow = leaderJob?.input?._broker?.workflow && typeof leaderJob.input._broker.workflow === 'object'
    ? leaderJob.input._broker.workflow
    : {};
  const checkpointLayer = Math.max(1, Number(workflow.checkpointLayer || workflow.afterLayer || 1) || 1);
  const childRuns = Array.isArray(parent?.workflow?.childRuns) ? parent.workflow.childRuns : [];
  const priorLayerRuns = childRuns
    .filter((child) => !isWorkflowLeaderTask(workflowTaskName(child)))
    .filter((child) => workflowDispatchLayer(parent, child) <= checkpointLayer);
  if (!priorLayerRuns.length) return false;
  const completedPrior = priorLayerRuns.some((child) => String(child.status || '').trim().toLowerCase() === 'completed');
  if (completedPrior) return false;
  return true;
}

function workflowLeaderPriorLayerOptionalOnly(parent = {}, leaderJob = {}) {
  const phase = workflowSequencePhaseForJob(leaderJob);
  if (phase !== 'checkpoint') return false;
  const workflow = leaderJob?.input?._broker?.workflow && typeof leaderJob.input._broker.workflow === 'object'
    ? leaderJob.input._broker.workflow
    : {};
  const checkpointLayer = Math.max(1, Number(workflow.checkpointLayer || workflow.afterLayer || 1) || 1);
  const childRuns = Array.isArray(parent?.workflow?.childRuns) ? parent.workflow.childRuns : [];
  const priorLayerRuns = childRuns
    .filter((child) => !isWorkflowLeaderTask(workflowTaskName(child)))
    .filter((child) => workflowDispatchLayer(parent, child) <= checkpointLayer);
  if (!priorLayerRuns.length) return false;
  if (priorLayerRuns.some((child) => String(child.status || '').trim().toLowerCase() === 'completed')) return false;
  const optionalUnavailablePrior = priorLayerRuns
    .map((child) => workflowOptionalUnavailablePriorRun(parent, child, checkpointLayer + 1))
    .filter(Boolean);
  return optionalUnavailablePrior.length > 0 && optionalUnavailablePrior.length === priorLayerRuns.length;
}

function workflowLeaderSequence(parent = {}) {
  const sequence = parent?.workflow?.leaderSequence;
  if (!sequence || sequence.enabled !== true) return null;
  return sequence;
}

function workflowLeaderCheckpoints(parent = {}) {
  const sequence = workflowLeaderSequence(parent);
  if (!sequence?.enabled) return [];
  const checkpoints = Array.isArray(sequence.checkpoints)
    ? sequence.checkpoints
    : [];
  const normalized = checkpoints
    .map((checkpoint) => ({
      jobId: String(checkpoint?.jobId || checkpoint?.job_id || '').trim(),
      afterLayer: Math.max(1, Number(checkpoint?.afterLayer || checkpoint?.checkpointLayer || 1) || 1),
      beforeLayer: Math.max(2, Number(checkpoint?.beforeLayer || checkpoint?.requiredBeforeLayer || 2) || 2),
      status: String(checkpoint?.status || 'pending').trim().toLowerCase() || 'pending',
      label: String(checkpoint?.label || '').trim(),
      requiresUserApprovalBeforeAction: checkpoint?.requiresUserApprovalBeforeAction === true
    }))
    .filter((checkpoint) => checkpoint.jobId);
  if (!normalized.length && sequence.checkpointJobId) {
    normalized.push({
      jobId: String(sequence.checkpointJobId || '').trim(),
      afterLayer: Math.max(1, Number(sequence.checkpointLayer || 1) || 1),
      beforeLayer: Math.max(2, Number(sequence.requiredBeforeLayer || 2) || 2),
      status: String(sequence.status || 'pending').trim().toLowerCase() || 'pending',
      label: 'research_to_execution',
      requiresUserApprovalBeforeAction: false
    });
  }
  return normalized.sort((left, right) => left.beforeLayer - right.beforeLayer);
}

function workflowCheckpointStatus(checkpoint = {}, checkpointJob = null) {
  const jobStatus = String(checkpointJob?.status || '').trim().toLowerCase();
  if (jobStatus === 'completed') return 'completed';
  if (['failed', 'timed_out'].includes(jobStatus)) return 'failed';
  if (['queued', 'claimed', 'running', 'dispatched'].includes(jobStatus)) return 'queued';
  return String(checkpoint.status || 'pending').trim().toLowerCase() || 'pending';
}

function workflowCheckpointBlocksLayer(parent = {}, children = [], layer = 1) {
  const checkpoints = workflowLeaderCheckpoints(parent);
  if (!checkpoints.length) return null;
  for (const checkpoint of checkpoints) {
    if (checkpoint.beforeLayer > layer) continue;
    const checkpointJob = children.find((child) => child.id === checkpoint.jobId) || null;
    if (workflowCheckpointStatus(checkpoint, checkpointJob) !== 'completed') return checkpoint;
  }
  return null;
}

function workflowLayerWasLeaderActivated(parent = {}, layer = 1) {
  const targetLayer = Math.max(1, Number(layer || 1) || 1);
  const activations = Array.isArray(parent?.workflow?.adaptivePlan?.activations)
    ? parent.workflow.adaptivePlan.activations
    : [];
  return activations.some((activation) => Number(activation?.layer || 0) === targetLayer);
}

function workflowFailedPriorLayerShouldWarnNotBlock(parent = {}, children = [], child = {}, targetLayer = 1) {
  const safeTargetLayer = Math.max(1, Number(targetLayer || 1) || 1);
  if (safeTargetLayer < leaderActionLayerStart(workflowPrimaryTask(parent))) return false;
  if (!workflowLayerWasLeaderActivated(parent, safeTargetLayer)) return false;
  const childLayer = workflowDispatchLayer(parent, child);
  if (childLayer <= 0 || childLayer >= safeTargetLayer) return false;
  const phase = workflowSequencePhaseForJob(child);
  if (!['preparation', 'planning', 'action', 'implementation'].includes(phase)) return false;
  return sortWorkflowChildren(parent, children).some((candidate) => (
    candidate?.id !== child?.id
    && !isWorkflowLeaderTask(workflowTaskName(candidate))
    && workflowDispatchLayer(parent, candidate) === childLayer
    && String(candidate.status || '').trim().toLowerCase() === 'completed'
  ));
}

function workflowBlockingQualityGateBeforeLayer(parent = {}, children = [], layer = 1) {
  const targetLayer = Math.max(1, Number(layer || 1) || 1);
  if (targetLayer <= 1) return null;
  const sorted = sortWorkflowChildren(parent, children);
  for (const child of sorted) {
    if (!child || isWorkflowLeaderTask(workflowTaskName(child))) continue;
    if (workflowDispatchLayer(parent, child) >= targetLayer) continue;
    const status = String(child.status || '').trim().toLowerCase();
    if (['failed', 'timed_out'].includes(status)) {
      const optionalUnavailable = workflowOptionalUnavailablePriorRun(parent, child, targetLayer);
      if (optionalUnavailable && workflowUnavailablePriorRunIsOptional(optionalUnavailable)) continue;
      if (workflowFailedPriorLayerShouldWarnNotBlock(parent, children, child, targetLayer)) continue;
      return {
        type: 'prior_layer_unavailable',
        childId: child.id,
        taskType: workflowTaskName(child),
        summary: child.failureReason || child.failure_reason || (status === 'timed_out'
          ? 'prior layer timed out before producing usable output'
          : 'prior layer failed before producing usable output')
      };
    }
    if (workflowChildIsLeaderReplanDeferred(child)) continue;
    const currentReview = String(child.status || '').trim().toLowerCase() === 'completed'
      ? workflowOriginalInfoQualityReview(parent, child)
      : null;
    if (currentReview?.applicable) workflowApplyQualityReviewToChild(child, currentReview);
    const gate = currentReview?.applicable
      ? child.qualityGate
      : (child.qualityGate && typeof child.qualityGate === 'object' ? child.qualityGate : null);
    if (gate && gate.applicable !== false && gate.passed === false) {
      return {
        type: 'child_quality_gate',
        childId: child.id,
        taskType: workflowTaskName(child),
        summary: Array.isArray(gate.issues) && gate.issues.length ? gate.issues.join('+') : (gate.summary || 'prior layer quality gate failed')
      };
    }
    const authorityRequest = authorityRequestFromReport(child.output?.report);
    const authoritySource = String(authorityRequest?.source || '').trim().toLowerCase();
    if (authoritySource === 'search_connector_required') {
      return {
        type: 'search_connector_required',
        childId: child.id,
        taskType: workflowTaskName(child),
        summary: authorityRequest?.reason || 'prior research layer search connector is required'
      };
    }
  }
  const lastGate = parent?.workflow?.leaderSequence?.lastQualityGate;
  if (lastGate && typeof lastGate === 'object' && lastGate.passed === false) {
    return {
      type: 'leader_quality_gate',
      summary: lastGate.summary || 'leader quality gate failed before releasing downstream layer'
    };
  }
  return null;
}

function workflowLeaderSequenceNeedsProgress(parent = {}) {
  const sequence = workflowLeaderSequence(parent);
  if (!sequence?.enabled) return false;
  const checkpoints = workflowLeaderCheckpoints(parent);
  if (checkpoints.some((checkpoint) => String(checkpoint.status || '').trim().toLowerCase() !== 'completed')) return true;
  if (!checkpoints.length && String(sequence.status || '').trim().toLowerCase() !== 'completed') return true;
  if (sequence.finalSummaryJobId && String(sequence.finalSummaryStatus || '').trim().toLowerCase() !== 'completed') return true;
  return false;
}

function workflowChildrenForLayer(parent = {}, children = [], layer = 1, options = {}) {
  return sortWorkflowChildren(parent, children)
    .filter((child) => (options.includeLeader ? true : !isWorkflowLeaderTask(workflowTaskName(child))))
    .filter((child) => workflowDispatchLayer(parent, child) === layer);
}

function workflowShouldEnableLeaderSequence(plan = {}, taskType = '') {
  const plannedTasks = Array.isArray(plan?.plannedTasks) ? plan.plannedTasks : [];
  const assignments = Array.isArray(plan?.assignments) ? plan.assignments : [];
  const primary = String(plannedTasks[0] || taskType || '').trim().toLowerCase();
  if (!isWorkflowLeaderTask(primary)) return false;
  const pseudoParent = {
    taskType: primary,
    workflow: {
      plannedTasks: plannedTasks.length ? plannedTasks : [primary]
    }
  };
  const nonLeaderLayers = assignments
    .map((item) => String(item?.taskType || '').trim().toLowerCase())
    .filter((task) => task && !isWorkflowLeaderTask(task))
    .map((task) => workflowDispatchLayer(pseudoParent, { workflowTask: task, taskType: task }));
  const hasResearchLayer = nonLeaderLayers.some((layer) => layer === 1);
  const hasActionLayer = nonLeaderLayers.some((layer) => layer >= 2);
  return hasResearchLayer && hasActionLayer;
}

function pickProgressDispatchTargets(state, jobId, options = {}) {
  const maxTargets = Math.max(1, Math.min(WORKFLOW_PROGRESS_DISPATCH_MAX_TARGETS, Number(options.maxTargets || 1) || 1));
  const parentOrJob = state.jobs.find((item) => item.id === jobId);
  if (!parentOrJob) return [];
  const now = Date.now();
  if (parentOrJob.jobKind === 'workflow') {
    const children = sortWorkflowChildren(
      parentOrJob,
      state.jobs.filter((item) => item.workflowParentId === parentOrJob.id)
    );
    if (workflowParentAuthorityRequest(parentOrJob)) return [];
    const leaderSequence = workflowLeaderSequence(parentOrJob);
    const leaderChildren = children.filter((child) => isWorkflowLeaderTask(workflowTaskName(child)));
    const pendingLeader = leaderChildren.find((child) => !workflowChildIsTerminal(child) && String(child.status || '').toLowerCase() !== 'blocked');
    if (pendingLeader) {
      const agent = state.agents.find((item) => item.id === pendingLeader.assignedAgentId);
      if (canAutoScheduleAsyncDispatch(pendingLeader, agent)) {
        return [{ job: pendingLeader, agent, parentJobId: parentOrJob.id, workflowLeaderHandoff: null }];
      }
      return [];
    }
    const leader = completedWorkflowLeader(parentOrJob, children);
    if (leaderChildren.length && !leader) return [];
    const pendingLayers = children
      .filter((child) => !workflowChildIsTerminalForProgress(child) && !isWorkflowLeaderTask(workflowTaskName(child)))
      .map((child) => workflowDispatchLayer(parentOrJob, child));
    const nextLayer = pendingLayers.length ? Math.min(...pendingLayers) : null;
    if (leaderSequence?.enabled && nextLayer !== null && nextLayer >= 2 && workflowCheckpointBlocksLayer(parentOrJob, children, nextLayer)) {
      return [];
    }
    const leaderCheckpointClearedLayer = Boolean(
      leaderSequence?.enabled
      && nextLayer !== null
      && nextLayer >= 2
      && (
        (
          workflowLeaderCheckpoints(parentOrJob).length
          && !workflowCheckpointBlocksLayer(parentOrJob, children, nextLayer)
        )
        || children.some((child) => {
          if (!workflowChildIsInternalLeaderSequenceRun(child)) return false;
          if (String(child.status || '').trim().toLowerCase() !== 'completed') return false;
          const workflow = child?.input?._broker?.workflow && typeof child.input._broker.workflow === 'object'
            ? child.input._broker.workflow
            : {};
          return String(workflow.sequencePhase || '').trim().toLowerCase() === 'checkpoint'
            && Number(workflow.requiredBeforeLayer || workflow.required_before_layer || 0) <= nextLayer;
        })
      )
    );
    const blockingQualityGate = nextLayer !== null
      && !leaderCheckpointClearedLayer
      ? workflowBlockingQualityGateBeforeLayer(parentOrJob, children, nextLayer)
      : null;
    if (blockingQualityGate) {
      parentOrJob.workflow = {
        ...(parentOrJob.workflow || {}),
        blockedHandoffGate: {
          ...blockingQualityGate,
          blockedBeforeLayer: nextLayer,
          checkedAt: nowIso()
        }
      };
      return [];
    }
    const targets = [];
    const activeSequentialUserActionWait = workflowHasActiveSequentialUserActionWait(parentOrJob, children);
    let sequentialUserActionTargetPicked = false;
    const childOrder = new Map(children.map((child, index) => [child.id, index]));
    const dispatchChildren = nextLayer === null
      ? children
      : [...children].sort((left, right) => {
          const leftInLayer = workflowDispatchLayer(parentOrJob, left) === nextLayer;
          const rightInLayer = workflowDispatchLayer(parentOrJob, right) === nextLayer;
          if (leftInLayer !== rightInLayer) return leftInLayer ? -1 : 1;
          if (!leftInLayer || activeSequentialUserActionWait) return (childOrder.get(left.id) || 0) - (childOrder.get(right.id) || 0);
          const leftSequential = workflowChildRequiresSequentialUserAction(parentOrJob, left);
          const rightSequential = workflowChildRequiresSequentialUserAction(parentOrJob, right);
          if (leftSequential !== rightSequential) return leftSequential ? -1 : 1;
          if (!leftSequential) return (childOrder.get(left.id) || 0) - (childOrder.get(right.id) || 0);
          return workflowSequentialUserActionPriority(parentOrJob, right) - workflowSequentialUserActionPriority(parentOrJob, left)
            || (childOrder.get(left.id) || 0) - (childOrder.get(right.id) || 0);
        });
    for (const child of dispatchChildren) {
      const targetLayer = workflowDispatchLayer(parentOrJob, child);
      if (nextLayer !== null && targetLayer !== nextLayer) continue;
      if (workflowChildIsSaasHandoffOnly(child)) continue;
      const agent = state.agents.find((item) => item.id === child.assignedAgentId);
      if (canAutoScheduleAsyncDispatch(child, agent)) {
        const requiresSequentialUserAction = workflowChildRequiresSequentialUserAction(parentOrJob, child);
        if (requiresSequentialUserAction && (activeSequentialUserActionWait || sequentialUserActionTargetPicked)) continue;
        const handoff = workflowLeaderHandoff(parentOrJob, leader, children, targetLayer);
        targets.push({ job: child, agent, parentJobId: parentOrJob.id, workflowLeaderHandoff: handoff, requiresSequentialUserAction });
        if (requiresSequentialUserAction) sequentialUserActionTargetPicked = true;
        if (targets.length >= maxTargets) break;
      }
    }
    return targets;
  }
  const agent = state.agents.find((item) => item.id === parentOrJob.assignedAgentId);
  if (workflowParentAuthorityRequest(parentOrJob)) return [];
  if (!canAutoScheduleAsyncDispatch(parentOrJob, agent)) return [];
  if (dispatchScheduleIsFreshForAgent(parentOrJob, agent, now)) return [];
  return [{ job: parentOrJob, agent, parentJobId: parentOrJob.workflowParentId || null, workflowLeaderHandoff: null }];
}

function pickProgressDispatchTarget(state, jobId) {
  return pickProgressDispatchTargets(state, jobId, { maxTargets: 1 })[0] || null;
}

async function markDispatchScheduled(storage, jobId, agentId, reason = 'dispatch scheduled', options = {}) {
  const at = nowIso();
  const env = options.env || {};
  const mutateScheduled = async (state) => {
    const job = state.jobs.find((item) => item.id === jobId);
    const agent = state.agents.find((item) => item.id === agentId);
    if (!canAutoScheduleAsyncDispatch(job, agent)) {
      return { scheduled: false, reason: 'not_eligible', job: cloneJob(job), agent: agent ? publicAgent(agent) : null };
    }
    if (dispatchScheduleIsFreshForAgent(job, agent)) {
      return { scheduled: false, reason: 'already_scheduled', job: cloneJob(job), agent: publicAgent(agent) };
    }
    const previousDispatch = job.dispatch && typeof job.dispatch === 'object' ? job.dispatch : {};
    const previousCompletionStatus = String(previousDispatch.completionStatus || '').trim().toLowerCase();
    if (workflowChildShouldRestartFromBeginning(job) && providerRunLimitReached(env, job)) {
      const failedAt = nowIso();
      job.status = 'failed';
      job.failedAt = failedAt;
      job.timedOutAt = null;
      job.completedAt = null;
      job.failureCategory = 'workflow_restart_required';
      job.failureReason = workflowRestartRequiredReason(job, `provider run limit reached (${providerRunAttempts(job)}/${workflowProviderRunMaxAttempts(env, job)})`);
      if (job.billingReservation && !job.billingSettlement?.settledAt && !job.billingReservation?.releasedAt) {
        releaseBillingReservationInState(state, job);
      }
      job.dispatch = {
        ...previousDispatch,
        completionStatus: 'workflow_restart_required',
        failedAt,
        retryable: false,
        nextRetryAt: null,
        restartRequired: true,
        attempts: providerRunAttempts(job),
        maxRetries: workflowProviderRunMaxAttempts(env, job)
      };
      job.logs = [...(job.logs || []), 'provider run limit reached before scheduling; full order retry required'];
      return { scheduled: false, reason: 'provider_run_limit_reached', job: cloneJob(job), agent: publicAgent(agent), restartRequired: true };
    }
    job.status = 'running';
    job.startedAt = job.startedAt || at;
    job.failureReason = null;
    job.failureCategory = null;
    let workflowLeaderHandoffForDispatch = options.workflowLeaderHandoff || null;
    if (job.workflowParentId && !isWorkflowLeaderTask(workflowTaskName(job))) {
      const parent = state.jobs.find((item) => item.id === job.workflowParentId && item.jobKind === 'workflow') || null;
      if (parent) {
        const children = sortWorkflowChildren(
          parent,
          state.jobs.filter((item) => item.workflowParentId === parent.id)
        );
        const leader = completedWorkflowLeader(parent, children);
        const targetLayer = workflowDispatchLayer(parent, job);
        const freshHandoff = workflowLeaderHandoff(parent, leader, children, targetLayer);
        if (freshHandoff) workflowLeaderHandoffForDispatch = freshHandoff;
      }
    }
    const firstDispatchRequestedAt = previousDispatch.firstDispatchRequestedAt || previousDispatch.dispatchRequestedAt || at;
    const scheduleAttempts = Number(previousDispatch.scheduleAttempts || 0) + 1;
    const recoveringStaleInProgressDispatch = previousCompletionStatus === 'dispatch_in_progress';
    job.dispatch = {
      ...previousDispatch,
      firstDispatchRequestedAt,
      dispatchRequestedAt: at,
      completionStatus: 'dispatch_scheduled',
      scheduleAttempts,
      retryable: true,
      nextRetryAt: null,
      maxRetries: workflowCompletionRetryLimitForJob(env, job),
      ...(recoveringStaleInProgressDispatch ? { endpointDispatchRecoveredAt: at } : {})
    };
    if (workflowLeaderHandoffForDispatch && job.workflowParentId && !isWorkflowLeaderTask(workflowTaskName(job))) {
      const input = job.input && typeof job.input === 'object' ? { ...job.input } : {};
      const broker = input._broker && typeof input._broker === 'object' ? { ...input._broker } : {};
      const workflow = broker.workflow && typeof broker.workflow === 'object' ? { ...broker.workflow } : {};
      workflow.leaderHandoff = workflowLeaderHandoffForDispatch;
      if (!workflow.leaderActionProtocol && workflowLeaderHandoffForDispatch?.actionProtocol) {
        workflow.leaderActionProtocol = workflowLeaderHandoffForDispatch.actionProtocol;
      }
      broker.workflow = workflow;
      input._broker = broker;
      job.input = input;
      applyWorkflowHandoffPromptContextToJob(job);
    }
    job.logs = [
      ...(job.logs || []),
      ...(workflowLeaderHandoffForDispatch && job.workflowParentId && !isWorkflowLeaderTask(workflowTaskName(job))
        ? [`leader handoff attached from ${workflowLeaderHandoffForDispatch.leaderTaskType}/${String(workflowLeaderHandoffForDispatch.leaderJobId || '').slice(0, 6)}`]
        : []),
      ...(recoveringStaleInProgressDispatch ? ['stale endpoint dispatch lock recovered for retry'] : []),
      `${reason}; dispatch scheduled for ${agent.id}`
    ];
    return { scheduled: true, job: cloneJob(job), agent: publicAgent(agent) };
  };
  return typeof storage.mutateJobAndAgent === 'function'
    ? storage.mutateJobAndAgent(jobId, agentId, mutateScheduled)
    : storage.mutate(mutateScheduled);
}

async function scheduleProgressDispatchesForJobId(storage, env, waitUntil, jobId, reason = 'progress dispatch', options = {}) {
  if (!jobId) return { scheduled: false, scheduled_count: 0, reason: 'job_id_missing', jobs: [] };
  const awaitDispatch = options.awaitDispatch !== false;
  if (options.refresh !== false) await refreshWorkflowLeaderHandoffForJobId(storage, jobId);
  const state = typeof storage.loadWorkflowDispatchState === 'function'
    ? await storage.loadWorkflowDispatchState(jobId)
    : (typeof storage.getFreshState === 'function' ? await storage.getFreshState() : await storage.getState());
  const targets = pickProgressDispatchTargets(state, jobId, { maxTargets: options.maxTargets || 1 });
  if (!targets.length) return { scheduled: false, scheduled_count: 0, reason: 'no_dispatch_target', jobs: [] };
  const scheduled = [];
  const dispatchPromises = [];
  const queueDispatch = options.dispatchMode !== 'direct' && Boolean(workflowDispatchQueue(env));
  for (const target of targets) {
    const marked = await markDispatchScheduled(storage, target.job.id, target.agent.id, reason, {
      env,
      workflowLeaderHandoff: target.workflowLeaderHandoff || null
    });
    if (!marked.scheduled) {
      if (marked.restartRequired && marked.job?.workflowParentId) await reconcileWorkflowParent(storage, marked.job.workflowParentId);
      continue;
    }
    scheduled.push({ ...marked, parentJobId: target.parentJobId || marked.job.workflowParentId || null });
    await touchEvent(storage, 'RUNNING', `${marked.agent.name} scheduled ${marked.job.taskType}/${marked.job.id.slice(0, 6)}`, {
      kind: 'dispatch_scheduled',
      jobId: marked.job.id,
      parentJobId: marked.job.workflowParentId || target.parentJobId || null
    });
    if (marked.job.workflowParentId) {
      try {
        await reconcileWorkflowParent(storage, marked.job.workflowParentId);
      } catch (error) {
        await touchEvent(storage, 'FAILED', `${marked.job.taskType}/${marked.job.id.slice(0, 6)} pre-dispatch reconcile exception ${String(error?.message || error).slice(0, 120)}`);
      }
    }
    if (queueDispatch) {
      try {
        await enqueueEndpointDispatch(env, marked.job, marked.agent, {
          workflowParentId: marked.job.workflowParentId || target.parentJobId || null,
          source: reason
        });
        await touchEvent(storage, 'RUNNING', `${marked.agent.name} queued ${marked.job.taskType}/${marked.job.id.slice(0, 6)} for endpoint dispatch`, {
          kind: 'endpoint_dispatch_queued',
          jobId: marked.job.id,
          parentJobId: marked.job.workflowParentId || target.parentJobId || null
        });
        continue;
      } catch (error) {
        await touchEvent(storage, 'FAILED', `${marked.job.taskType}/${marked.job.id.slice(0, 6)} endpoint dispatch queue send failed ${String(error?.message || error).slice(0, 120)}`);
      }
    }
    dispatchPromises.push(dispatchExistingJobToAssignedAgent(storage, env, marked.job.id, marked.agent.id)
      .catch((error) => touchEvent(storage, 'FAILED', `${marked.job.taskType}/${marked.job.id.slice(0, 6)} scheduled dispatch exception ${String(error?.message || error).slice(0, 120)}`)));
  }
  if (!scheduled.length) return { scheduled: false, scheduled_count: 0, reason: 'not_eligible', jobs: [] };
  const dispatchBatch = Promise.allSettled(dispatchPromises);
  if (awaitDispatch) {
    await dispatchBatch;
  } else if (typeof waitUntil === 'function') {
    waitUntil(dispatchBatch);
  } else {
    void dispatchBatch;
  }
  return {
    scheduled: true,
    scheduled_count: scheduled.length,
    jobs: scheduled.map((item) => item.job),
    agents: scheduled.map((item) => item.agent)
  };
}

async function scheduleProgressDispatchForJobId(storage, env, waitUntil, jobId, reason = 'progress dispatch') {
  const result = await scheduleProgressDispatchesForJobId(storage, env, waitUntil, jobId, reason, { maxTargets: 1 });
  if (!result.scheduled) return { scheduled: false, reason: result.reason || 'no_dispatch_target' };
  return {
    scheduled: true,
    job: result.jobs[0],
    agent: result.agents[0],
    scheduled_count: result.scheduled_count
  };
}

async function scheduleInitialWorkflowDispatchFromChildren(storage, env, waitUntil, parentJob, childJobs = [], reason = 'async workflow create') {
  const children = sortWorkflowChildren(parentJob, Array.isArray(childJobs) ? childJobs : []);
  const initialLeader = children.find((child) => (
    String(child?.status || '').trim().toLowerCase() === 'queued'
    && isWorkflowLeaderTask(workflowTaskName(child))
    && child.assignedAgentId
  ));
  const firstQueued = initialLeader || children.find((child) => (
    String(child?.status || '').trim().toLowerCase() === 'queued'
    && child.assignedAgentId
  ));
  if (!firstQueued) return { scheduled: false, scheduled_count: 0, reason: 'no_initial_child' };
  const agent = typeof storage.getAgentById === 'function'
    ? await storage.getAgentById(firstQueued.assignedAgentId)
    : null;
  if (!agent || !canAutoScheduleAsyncDispatch(firstQueued, agent)) {
    return { scheduled: false, scheduled_count: 0, reason: agent ? 'initial_child_not_eligible' : 'initial_child_agent_missing' };
  }
  const marked = await markDispatchScheduled(storage, firstQueued.id, agent.id, reason, { env });
  if (!marked?.scheduled) return { scheduled: false, scheduled_count: 0, reason: marked?.reason || 'initial_child_mark_rejected' };
  await touchEvent(storage, 'RUNNING', `${marked.agent.name} scheduled ${marked.job.taskType}/${marked.job.id.slice(0, 6)}`, {
    kind: 'dispatch_scheduled',
    jobId: marked.job.id,
    parentJobId: marked.job.workflowParentId || parentJob.id || null
  });
  if (workflowDispatchQueue(env)) {
    await enqueueEndpointDispatch(env, marked.job, marked.agent, {
      workflowParentId: marked.job.workflowParentId || parentJob.id || null,
      source: reason
    });
    await touchEvent(storage, 'RUNNING', `${marked.agent.name} queued ${marked.job.taskType}/${marked.job.id.slice(0, 6)} for endpoint dispatch`, {
      kind: 'endpoint_dispatch_queued',
      jobId: marked.job.id,
      parentJobId: marked.job.workflowParentId || parentJob.id || null
    });
    return { scheduled: true, scheduled_count: 1, jobs: [marked.job], agents: [marked.agent] };
  }
  const dispatchPromise = dispatchExistingJobToAssignedAgent(storage, env, marked.job.id, marked.agent.id)
    .catch((error) => touchEvent(storage, 'FAILED', `${marked.job.taskType}/${marked.job.id.slice(0, 6)} initial dispatch exception ${String(error?.message || error).slice(0, 120)}`));
  if (typeof waitUntil === 'function') waitUntil(dispatchPromise);
  else void dispatchPromise;
  return { scheduled: true, scheduled_count: 1, jobs: [marked.job], agents: [marked.agent] };
}

async function scheduleNextWorkflowDispatchLightweight(storage, env, waitUntil, parentJobId, reason = 'workflow completion handoff', options = {}) {
  const parentId = String(parentJobId || '').trim();
  if (!parentId) return { scheduled: false, scheduled_count: 0, reason: 'parent_missing' };
  if (options.refresh !== false) await refreshWorkflowLeaderHandoffForJobId(storage, parentId);
  const mutateWorkflow = typeof storage.mutateWorkflow === 'function'
    ? (mutator) => storage.mutateWorkflow(parentId, mutator)
    : (mutator) => storage.mutate(mutator);
  const result = await mutateWorkflow(async (state) => {
    const parent = state.jobs.find((item) => item.id === parentId && item.jobKind === 'workflow') || null;
    if (!parent || workflowParentAuthorityRequest(parent)) return { scheduled: false, reason: parent ? 'parent_authority_wait' : 'parent_missing' };
    const children = sortWorkflowChildren(parent, state.jobs.filter((item) => item.workflowParentId === parent.id));
    const queued = children.filter((child) => String(child?.status || '').trim().toLowerCase() === 'queued' && child.assignedAgentId);
    const target = queued.find((child) => isWorkflowLeaderTask(workflowTaskName(child))) || queued[0] || null;
    if (!target) return { scheduled: false, reason: 'no_queued_child' };
    const at = nowIso();
    const previousDispatch = target.dispatch && typeof target.dispatch === 'object' ? target.dispatch : {};
    const firstDispatchRequestedAt = previousDispatch.firstDispatchRequestedAt || previousDispatch.dispatchRequestedAt || at;
    target.status = 'running';
    target.startedAt = target.startedAt || at;
    target.failureReason = null;
    target.failureCategory = null;
    target.dispatch = {
      ...previousDispatch,
      firstDispatchRequestedAt,
      dispatchRequestedAt: at,
      completionStatus: 'dispatch_scheduled',
      scheduleAttempts: Number(previousDispatch.scheduleAttempts || 0) + 1,
      retryable: true,
      nextRetryAt: null,
      maxRetries: workflowCompletionRetryLimitForJob(env, target)
    };
    target.logs = [...(target.logs || []), `${reason}; lightweight dispatch scheduled`];
    return { scheduled: true, job: cloneJob(target), agentId: target.assignedAgentId };
  });
  if (!result?.scheduled || !result.job?.id || !result.agentId) return { scheduled: false, scheduled_count: 0, reason: result?.reason || 'lightweight_mark_rejected' };
  const agent = typeof storage.getAgentById === 'function' ? await storage.getAgentById(result.agentId) : null;
  if (!agent) return { scheduled: false, scheduled_count: 0, reason: 'agent_missing_after_lightweight_mark', jobs: [result.job] };
  await touchEvent(storage, 'RUNNING', `${agent.name} scheduled ${result.job.taskType}/${result.job.id.slice(0, 6)}`, {
    kind: 'dispatch_scheduled',
    jobId: result.job.id,
    parentJobId: result.job.workflowParentId || parentId
  });
  if (workflowDispatchQueue(env)) {
    await enqueueEndpointDispatch(env, result.job, agent, {
      workflowParentId: result.job.workflowParentId || parentId,
      source: reason
    });
    await touchEvent(storage, 'RUNNING', `${agent.name} queued ${result.job.taskType}/${result.job.id.slice(0, 6)} for endpoint dispatch`, {
      kind: 'endpoint_dispatch_queued',
      jobId: result.job.id,
      parentJobId: result.job.workflowParentId || parentId
    });
    return { scheduled: true, scheduled_count: 1, jobs: [result.job], agents: [agent] };
  }
  const dispatchPromise = dispatchExistingJobToAssignedAgent(storage, env, result.job.id, agent.id)
    .catch((error) => touchEvent(storage, 'FAILED', `${result.job.taskType}/${result.job.id.slice(0, 6)} lightweight dispatch exception ${String(error?.message || error).slice(0, 120)}`));
  if (typeof waitUntil === 'function') waitUntil(dispatchPromise);
  else void dispatchPromise;
  return { scheduled: true, scheduled_count: 1, jobs: [result.job], agents: [agent] };
}

async function recoverWorkflowEndpointDispatchJobs(storage, env, options = {}) {
  const requestedLegacyLimit = Math.max(1, Number(env?.LEGACY_WORKFLOW_DISPATCH_RECOVERY_LIMIT || 500) || 500);
  const legacyLimit = Math.max(50, Math.min(1000, requestedLegacyLimit));
  const legacyRecovered = [];
  const legacyDispatchSortMs = (job = {}) => {
    const ms = Date.parse(String(
      job?.dispatch?.firstDispatchRequestedAt
      || job?.dispatch?.completionQueueRequestedAt
      || job?.dispatch?.completionSweepRequestedAt
      || job?.dispatch?.dispatchRequestedAt
      || job?.startedAt
      || job?.createdAt
      || ''
    ));
    return Number.isFinite(ms) ? ms : Number.MAX_SAFE_INTEGER;
  };
  const legacyCandidates = (
    typeof storage.listStaleCompletionQueuedJobs === 'function'
    && typeof storage.listStaleCompletionSweepJobs === 'function'
  )
    ? [
        ...(await storage.listStaleCompletionQueuedJobs({
          limit: legacyLimit,
          maxAgeMs: workflowDispatchMaxAgeMs(env),
          minAgeMs: completionQueueRecoveryStaleMs(env)
        })),
        ...(await storage.listStaleCompletionSweepJobs({
          limit: legacyLimit,
          maxAgeMs: workflowDispatchMaxAgeMs(env),
          minAgeMs: completionQueueRecoveryStaleMs(env)
        }))
      ]
        .filter((job, index, all) => job?.id && all.findIndex((item) => item?.id === job.id) === index)
        .filter((job) => job?.assignedAgentId)
        .sort((a, b) => legacyDispatchSortMs(a) - legacyDispatchSortMs(b))
        .slice(0, legacyLimit)
    : (Array.isArray((typeof storage.getFreshState === 'function' ? await storage.getFreshState() : await storage.getState())?.jobs)
        ? (typeof storage.getFreshState === 'function' ? await storage.getFreshState() : await storage.getState()).jobs
        : [])
        .filter((job) => ['queued', 'running'].includes(String(job?.status || '').trim().toLowerCase()))
        .filter((job) => job?.assignedAgentId)
        .filter((job) => ['completion_queued', 'completion_sweep_running'].includes(String(job?.dispatch?.completionStatus || '').trim().toLowerCase()))
        .sort((a, b) => legacyDispatchSortMs(a) - legacyDispatchSortMs(b))
        .slice(0, legacyLimit);
  for (const candidate of legacyCandidates) {
    try {
      const approvalPause = await pauseWorkflowChildDispatchForParentAuthority(storage, candidate);
      if (approvalPause.paused) {
        if (candidate.workflowParentId) await reconcileWorkflowParent(storage, candidate.workflowParentId);
        continue;
      }
      const reset = typeof storage.mutateJobAndAgent === 'function'
        ? await storage.mutateJobAndAgent(candidate.id, candidate.assignedAgentId, (draft) => {
            const draftJob = draft.jobs.find((item) => item.id === candidate.id);
            if (!draftJob || isTerminalJobStatus(draftJob.status)) return null;
            draftJob.status = 'queued';
            draftJob.startedAt = null;
            draftJob.dispatch = {
              ...(draftJob.dispatch || {}),
              completionStatus: 'dispatch_scheduled',
              retryable: true,
              nextRetryAt: null,
              endpointDispatchRecoveredAt: nowIso()
            };
            draftJob.logs = [...(draftJob.logs || []), 'legacy completion sweep converted this job to endpoint dispatch'];
            return cloneJob(draftJob);
          })
        : await storage.mutate((draft) => {
            const draftJob = draft.jobs.find((item) => item.id === candidate.id);
            if (!draftJob || isTerminalJobStatus(draftJob.status)) return null;
            draftJob.status = 'queued';
            draftJob.startedAt = null;
            draftJob.dispatch = {
              ...(draftJob.dispatch || {}),
              completionStatus: 'dispatch_scheduled',
              retryable: true,
              nextRetryAt: null,
              endpointDispatchRecoveredAt: nowIso()
            };
            draftJob.logs = [...(draftJob.logs || []), 'legacy completion sweep converted this job to endpoint dispatch'];
            return cloneJob(draftJob);
          });
      if (!reset) continue;
      if (workflowDispatchQueue(env)) {
        await enqueueEndpointDispatch(env, reset, { id: reset.assignedAgentId }, {
          workflowParentId: reset.workflowParentId || null,
          source: options.source || 'legacy-completion-sweep'
        });
        legacyRecovered.push(reset.id);
      } else {
        const dispatch = await dispatchExistingJobToAssignedAgent(storage, env, reset.id, reset.assignedAgentId);
        if (!dispatch?.error) legacyRecovered.push(reset.id);
      }
    } catch (error) {
      await touchEvent(storage, 'FAILED', `${String(candidate?.taskType || 'job')}/${String(candidate?.id || '').slice(0, 6)} endpoint dispatch recovery exception ${String(error?.message || error).slice(0, 120)}`);
    }
  }
  const dispatchSweep = await runQueuedEndpointDispatchSweep(storage, env, {
    source: options.source || 'legacy-completion-sweep',
    cron: options.cron || '',
    limit: options.limit || env?.QUEUED_DISPATCH_SWEEP_LIMIT || 8,
    reason: 'legacy completion sweep converted to endpoint dispatch'
  });
  return {
    ok: true,
    mode: 'external_agent_dispatch_contract',
    completed_count: 0,
    queued_count: 0,
    job_ids: [],
    queued_job_ids: [],
    scanned_count: legacyCandidates.length + (dispatchSweep.scheduled_count || 0),
    skipped: {},
    expired_count: 0,
    expired_job_ids: [],
    recovered_queued_count: 0,
    recovered_queued_job_ids: [],
    retried_recovered_sweep_count: 0,
    retried_recovered_sweep_job_ids: [],
    endpoint_dispatch_count: legacyRecovered.length + (dispatchSweep.scheduled_count || 0),
    endpoint_dispatch_job_ids: [...legacyRecovered, ...(dispatchSweep.job_ids || [])]
  };
}

async function verifyInternalCronRequest(request, env, cron = '') {
  const provided = String(request.headers.get('x-cait-cron-token') || '').trim();
  const scheduledTime = Number(request.headers.get('x-cait-cron-time') || Date.now()) || Date.now();
  if (provided) {
    for (const offset of [0, -60_000, 60_000]) {
      const expected = await internalCronToken(env, cron, scheduledTime + offset);
      if (secretEquals(provided, expected)) return true;
    }
  }
  const e2eSecret = e2eAuthSecret(env);
  const providedE2e = String(request.headers.get('x-e2e-auth-secret') || '').trim();
  return Boolean(e2eSecret && providedE2e && secretEquals(providedE2e, e2eSecret));
}

async function handleInternalWorkflowCompletionSweep(request, env) {
  let body = {};
  try {
    body = await parseBody(request);
  } catch {}
  const cron = String(body.cron || request.headers.get('x-cait-cron') || '').trim();
  if (!(await verifyInternalCronRequest(request, env, cron))) return json({ error: 'Not found' }, 404);
  const storage = runtimeStorage(env);
  const result = await recoverWorkflowEndpointDispatchJobs(storage, env, {
    source: 'internal-cron-fetch',
    cron,
    limit: Number(body.limit || env?.SCHEDULED_BUILTIN_COMPLETION_SWEEP_LIMIT || 2) || 2
  });
  return json({ ok: true, ...result });
}

async function runMinuteWorkflowCompletionSweep(storage, env, cron = '', scheduledTime = Date.now()) {
  const dispatchSweep = await recoverWorkflowEndpointDispatchJobs(storage, env, {
    source: 'minute-cron-endpoint-dispatch',
    cron,
    limit: Math.min(8, Number(env?.QUEUED_DISPATCH_SWEEP_LIMIT || 8) || 8)
  });
  return {
    ok: true,
    mode: 'external_agent_dispatch_contract',
    scheduledTime,
    endpoint_dispatch_count: dispatchSweep.endpoint_dispatch_count || dispatchSweep.scheduled_count || 0,
    endpoint_dispatch_job_ids: dispatchSweep.endpoint_dispatch_job_ids || dispatchSweep.job_ids || []
  };
}

async function processWorkflowDispatchQueueMessage(storage, env, body = {}) {
  const message = body && typeof body === 'object' ? body : {};
  const kind = String(message.kind || message.type || '').trim();
  if (kind === 'endpoint_dispatch') {
    const jobId = String(message.jobId || message.job_id || '').trim();
    const agentId = String(message.agentId || message.agent_id || '').trim();
    if (!jobId || !agentId) return { ok: false, mode: 'invalid', error: 'Missing jobId or agentId' };
    await touchEvent(storage, 'RUNNING', `endpoint dispatch queue received ${jobId.slice(0, 6)}`, {
      kind: 'endpoint_dispatch_received',
      jobId,
      agentId,
      parentJobId: message.workflowParentId || message.workflow_parent_id || null
    });
    const approvalPauseJob = typeof storage.getJobById === 'function' ? await storage.getJobById(jobId) : null;
    if (approvalPauseJob?.workflowParentId) {
      const approvalPause = await pauseWorkflowChildDispatchForParentAuthority(storage, approvalPauseJob, { agentId });
      if (approvalPause.paused) {
        await touchEvent(storage, 'RUNNING', `${approvalPauseJob.taskType}/${approvalPauseJob.id.slice(0, 6)} endpoint dispatch queue paused while parent waits for approval`, {
          kind: 'dispatch_paused_for_parent_authority',
          jobId: approvalPauseJob.id,
          parentJobId: approvalPauseJob.workflowParentId || null
      });
      await reconcileWorkflowParent(storage, approvalPauseJob.workflowParentId);
      return { ok: true, mode: 'parent_authority_wait' };
      }
    }
    const dispatch = await dispatchExistingJobToAssignedAgent(storage, env, jobId, agentId, {
      source: message.source || 'endpoint-dispatch-queue',
      nextDispatchMode: 'queue'
    });
    await touchEvent(storage, dispatch?.error ? 'FAILED' : 'RUNNING', `endpoint dispatch queue processed ${jobId.slice(0, 6)} mode=${dispatch?.mode || 'unknown'}`, {
      kind: 'endpoint_dispatch_processed',
      jobId,
      agentId,
      parentJobId: message.workflowParentId || message.workflow_parent_id || null,
      mode: dispatch?.mode || null
    });
    return {
      ok: !dispatch?.error,
      mode: dispatch?.mode || 'endpoint_dispatch',
      dispatch
    };
  }
  return { ok: true, mode: 'ignored' };
}

async function runQueuedEndpointDispatchSweep(storage, env, options = {}) {
  const limit = Math.max(1, Math.min(20, Number(options.limit || 12) || 12));
  const scheduled = [];
  const acceptedRecovered = [];
  const scheduledJobIds = new Set();
  const scheduledRootJobIds = new Set();
  const skippedRootJobIds = new Set();
  if (
    storage?.kind === 'd1'
    && typeof storage.listScheduledWorkflowJobs === 'function'
    && typeof storage.listStaleDispatchInProgressJobs === 'function'
    && typeof storage.listQueuedWorkflowDispatchRoots === 'function'
    && typeof storage.listAcceptedEndpointDispatchJobs === 'function'
    && typeof storage.getAgentById === 'function'
  ) {
    const scheduledCandidates = await storage.listScheduledWorkflowJobs({
      limit,
      maxAgeMs: workflowDispatchMaxAgeMs(env),
      minAgeMs: DISPATCH_SCHEDULE_STALE_MS
    });
    const inProgressCandidates = await storage.listStaleDispatchInProgressJobs({
      limit,
      maxAgeMs: workflowDispatchMaxAgeMs(env),
      minAgeMs: DISPATCH_IN_PROGRESS_STALE_MS
    });
    const lightCandidates = [...scheduledCandidates, ...inProgressCandidates]
      .filter((job, index, all) => job?.id && all.findIndex((item) => item?.id === job.id) === index)
      .sort((left, right) => String(
        left?.dispatch?.dispatchInProgressAt
        || left?.dispatch?.lastAttemptAt
        || left?.dispatch?.firstDispatchRequestedAt
        || left?.dispatch?.dispatchRequestedAt
        || left?.startedAt
        || left?.createdAt
        || ''
      ).localeCompare(String(
        right?.dispatch?.dispatchInProgressAt
        || right?.dispatch?.lastAttemptAt
        || right?.dispatch?.firstDispatchRequestedAt
        || right?.dispatch?.dispatchRequestedAt
        || right?.startedAt
        || right?.createdAt
        || ''
      )))
      .slice(0, limit);
    for (const candidate of lightCandidates) {
      const rootJobId = String(candidate.workflowParentId || candidate.id || '').trim();
      if (!rootJobId || skippedRootJobIds.has(rootJobId) || scheduledRootJobIds.has(rootJobId) || scheduledJobIds.has(candidate.id)) continue;
      const agent = await storage.getAgentById(candidate.assignedAgentId);
      if (!agent) {
        skippedRootJobIds.add(rootJobId);
        continue;
      }
      const approvalPause = await pauseWorkflowChildDispatchForParentAuthority(storage, candidate);
      if (approvalPause.paused) {
        skippedRootJobIds.add(rootJobId);
        if (candidate.workflowParentId) await reconcileWorkflowParent(storage, candidate.workflowParentId);
        continue;
      }
      if (workflowChildShouldRestartFromBeginning(candidate) && providerRunLimitReached(env, candidate)) {
        const reason = workflowRestartRequiredReason(candidate, `provider run limit reached (${providerRunAttempts(candidate)}/${workflowProviderRunMaxAttempts(env, candidate)})`);
        const failed = await failJob(storage, candidate.id, reason, ['provider run limit reached during sweep; full order retry required'], {
          failureStatus: 'failed',
          failureCategory: 'workflow_restart_required',
          retryable: false,
          attempts: providerRunAttempts(candidate),
          maxRetries: workflowProviderRunMaxAttempts(env, candidate),
          restartRequired: true,
          source: 'queued-dispatch-sweep'
        });
        skippedRootJobIds.add(rootJobId);
        if (failed?.workflowParentId || candidate.workflowParentId) await reconcileWorkflowParent(storage, candidate.workflowParentId || failed.workflowParentId);
        await touchEvent(storage, 'FAILED', `${candidate.taskType}/${candidate.id.slice(0, 6)} provider run limit reached; full order retry required`, {
          kind: 'provider_run_limit_reached',
          jobId: candidate.id,
          parentJobId: candidate.workflowParentId || null
        });
        continue;
      }
      const marked = await markDispatchScheduled(storage, candidate.id, agent.id, options.reason || 'cron dispatch sweep', {
        env,
        workflowLeaderHandoff: null
      });
      if (!marked?.scheduled) {
        skippedRootJobIds.add(rootJobId);
        if (marked?.restartRequired && marked.job?.workflowParentId) await reconcileWorkflowParent(storage, marked.job.workflowParentId);
        continue;
      }
      scheduledJobIds.add(marked.job.id);
      scheduledRootJobIds.add(rootJobId);
      scheduled.push(marked.job.id);
      await touchEvent(storage, 'RUNNING', `${marked.agent.name} scheduled ${marked.job.taskType}/${marked.job.id.slice(0, 6)}`, {
        kind: 'dispatch_scheduled',
        jobId: marked.job.id,
        parentJobId: marked.job.workflowParentId || rootJobId
      });
      if (workflowDispatchQueue(env)) {
        await enqueueEndpointDispatch(env, marked.job, marked.agent, {
          workflowParentId: marked.job.workflowParentId || rootJobId,
          source: options.reason || 'cron dispatch sweep'
        });
        await touchEvent(storage, 'RUNNING', `${marked.agent.name} queued ${marked.job.taskType}/${marked.job.id.slice(0, 6)} for endpoint dispatch`, {
          kind: 'endpoint_dispatch_queued',
          jobId: marked.job.id,
          parentJobId: marked.job.workflowParentId || rootJobId
        });
      } else {
        const dispatch = await dispatchExistingJobToAssignedAgent(storage, env, marked.job.id, marked.agent.id)
          .catch((error) => ({ error: String(error?.message || error) }));
        if (dispatch?.error) await touchEvent(storage, 'FAILED', `${marked.job.taskType}/${marked.job.id.slice(0, 6)} light dispatch sweep failed ${String(dispatch.error).slice(0, 120)}`);
      }
    }
    if (scheduled.length) {
      await touchEvent(storage, 'RUNNING', `queued endpoint dispatch sweep scheduled ${scheduled.length} job(s)`, {
        kind: 'queued_dispatch_sweep',
        jobIds: scheduled
      });
    }
    if (scheduled.length < limit) {
      const queuedRootIds = await storage.listQueuedWorkflowDispatchRoots({
        limit: Math.max(1, limit - scheduled.length),
        maxAgeMs: workflowDispatchMaxAgeMs(env)
      });
      for (const rootJobId of queuedRootIds) {
        if (scheduled.length >= limit) break;
        if (!rootJobId || skippedRootJobIds.has(rootJobId) || scheduledRootJobIds.has(rootJobId)) continue;
        const result = await scheduleProgressDispatchesForJobId(storage, env, options.waitUntil, rootJobId, options.reason || 'cron dispatch sweep', {
          maxTargets: Math.max(1, limit - scheduled.length),
          refresh: true
        });
        if (!result?.scheduled) {
          skippedRootJobIds.add(rootJobId);
          continue;
        }
        const scheduledIds = Array.isArray(result.jobs) && result.jobs.length
          ? result.jobs.map((job) => job?.id).filter(Boolean)
          : [result.job?.id].filter(Boolean);
        for (const scheduledJobId of scheduledIds) {
          if (!scheduledJobId || scheduledJobIds.has(scheduledJobId)) continue;
          scheduledJobIds.add(scheduledJobId);
          scheduled.push(scheduledJobId);
        }
        if (scheduledIds.length) scheduledRootJobIds.add(rootJobId);
      }
    }
    {
      const acceptedRecoveryLimit = Math.max(0, Math.min(4, Number(env?.ACCEPTED_ENDPOINT_RECOVERY_LIMIT || env?.ACCEPTED_ENDPOINT_RECOVERY_MAX_ATTEMPTS || 0) || 0));
      const acceptedTime = (job = {}) => Date.parse(String(
        job?.dispatch?.providerQueueAcceptedAt
        || job?.dispatch?.lastAttemptAt
        || job?.dispatchedAt
        || job?.startedAt
        || job?.createdAt
        || ''
      )) || 0;
      const acceptedCandidates = acceptedRecoveryLimit > 0
        ? await storage.listAcceptedEndpointDispatchJobs({
            limit: Math.max(limit, acceptedRecoveryLimit * 4),
            maxAgeMs: workflowDispatchMaxAgeMs(env),
            minAgeMs: DISPATCH_IN_PROGRESS_STALE_MS
          })
        : [];
      for (const candidate of acceptedCandidates.sort((left, right) => acceptedTime(right) - acceptedTime(left))) {
        if (acceptedRecovered.length >= acceptedRecoveryLimit) break;
        if (!candidate?.id || scheduledJobIds.has(candidate.id)) continue;
        const rootJobId = String(candidate.workflowParentId || candidate.id || '').trim();
        if (!rootJobId || skippedRootJobIds.has(rootJobId)) continue;
        if (workflowChildShouldRestartFromBeginning(candidate)) {
          const reason = workflowRestartRequiredReason(candidate, 'accepted endpoint dispatch became stale before provider completion');
          const failed = await failJob(storage, candidate.id, reason, ['stale accepted endpoint dispatch failed; full order retry required'], {
            failureStatus: 'failed',
            failureCategory: 'workflow_restart_required',
            retryable: false,
            attempts: providerRunAttempts(candidate),
            maxRetries: workflowProviderRunMaxAttempts(env, candidate),
            restartRequired: true,
            source: 'accepted-endpoint-recovery'
          });
          skippedRootJobIds.add(rootJobId);
          if (failed?.workflowParentId || candidate.workflowParentId) await reconcileWorkflowParent(storage, candidate.workflowParentId || failed.workflowParentId);
          await touchEvent(storage, 'FAILED', `${candidate.taskType}/${candidate.id.slice(0, 6)} stale accepted endpoint dispatch requires full order retry`, {
            kind: 'workflow_restart_required',
            jobId: candidate.id,
            parentJobId: candidate.workflowParentId || null
          });
          continue;
        }
        const agent = await storage.getAgentById(candidate.assignedAgentId);
        if (!agent) {
          skippedRootJobIds.add(rootJobId);
          continue;
        }
        const reset = typeof storage.mutateJobAndAgent === 'function'
          ? await storage.mutateJobAndAgent(candidate.id, agent.id, (draft) => {
              const draftJob = draft.jobs.find((item) => item.id === candidate.id);
              const draftAgent = draft.agents.find((item) => item.id === agent.id);
              if (!draftJob || !draftAgent || isTerminalJobStatus(draftJob.status)) return null;
              const recoveryAttempts = acceptedEndpointRecoveryAttempts(draftJob) + 1;
              draftJob.status = 'running';
              draftJob.startedAt = draftJob.startedAt || nowIso();
              draftJob.dispatch = {
                ...(draftJob.dispatch || {}),
                completionStatus: 'dispatch_scheduled',
                retryable: true,
                nextRetryAt: null,
                acceptedEndpointRecoveryAttempts: recoveryAttempts,
                endpointDispatchRecoveredAt: nowIso(),
                acceptedEndpointRecoveredAt: nowIso()
              };
              draftJob.logs = [
                ...(draftJob.logs || []),
                `legacy accepted endpoint dispatch recovered for ${draftAgent.id}`
              ];
              return cloneJob(draftJob);
            })
          : null;
        if (!reset) {
          skippedRootJobIds.add(rootJobId);
          await touchEvent(storage, 'FAILED', `${candidate.taskType}/${candidate.id.slice(0, 6)} accepted endpoint recovery failed`, {
            kind: 'accepted_endpoint_recovery_failed',
            jobId: candidate.id,
            parentJobId: candidate.workflowParentId || null
          });
          continue;
        }
        await enqueueEndpointDispatch(env, reset, agent, {
          workflowParentId: reset.workflowParentId || rootJobId,
          source: options.reason || 'accepted-endpoint-recovery'
        });
        scheduledJobIds.add(candidate.id);
        scheduledRootJobIds.add(rootJobId);
        acceptedRecovered.push(candidate.id);
        scheduled.push(candidate.id);
        await touchEvent(storage, 'RUNNING', `${agent.name || agent.id} recovered accepted ${candidate.taskType}/${candidate.id.slice(0, 6)} as normal endpoint dispatch`, {
          kind: 'accepted_endpoint_recovered',
          jobId: candidate.id,
          parentJobId: candidate.workflowParentId || null
        });
      }
    }
    if (scheduled.length >= limit) {
      return { ok: true, scheduled_count: scheduled.length, job_ids: scheduled, accepted_endpoint_recovered_count: acceptedRecovered.length, accepted_endpoint_recovered_job_ids: acceptedRecovered, mode: 'd1_light_dispatch_sweep' };
    }
    return { ok: true, scheduled_count: scheduled.length, job_ids: scheduled, accepted_endpoint_recovered_count: acceptedRecovered.length, accepted_endpoint_recovered_job_ids: acceptedRecovered, mode: 'd1_light_dispatch_sweep' };
  }
  for (let i = 0; i < limit; i += 1) {
    const state = typeof storage.getFreshState === 'function' ? await storage.getFreshState() : await storage.getState();
    const candidates = state.jobs
      .filter((job) => ['queued', 'running'].includes(String(job.status || '').toLowerCase()))
      .filter((job) => jobWithinDispatchAge(job, env))
      .filter((job) => job.jobKind === 'workflow' || job.workflowParentId || (job.assignedAgentId && !job.workflowParentId))
      .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    let picked = null;
    const consideredRootJobIds = new Set();
    for (const candidate of candidates) {
      const rootJobId = String(candidate.workflowParentId || candidate.id || '').trim();
      if (!rootJobId || consideredRootJobIds.has(rootJobId) || skippedRootJobIds.has(rootJobId)) continue;
      consideredRootJobIds.add(rootJobId);
      const target = pickProgressDispatchTarget(state, rootJobId);
      if (target && !scheduledJobIds.has(target.job.id)) {
        picked = { candidate, rootJobId, targetJobId: target.job.id };
        break;
      }
    }
    if (!picked) break;
    const result = await scheduleProgressDispatchesForJobId(storage, env, options.waitUntil, picked.rootJobId, options.reason || 'cron dispatch sweep', {
      maxTargets: Math.max(1, limit - scheduled.length),
      refresh: false
    });
    if (!result?.scheduled) {
      skippedRootJobIds.add(picked.rootJobId);
      continue;
    }
    const scheduledIds = Array.isArray(result.jobs) && result.jobs.length
      ? result.jobs.map((job) => job?.id).filter(Boolean)
      : [result.job?.id || picked.targetJobId || picked.candidate.id].filter(Boolean);
    for (const scheduledJobId of scheduledIds) {
      if (scheduledJobIds.has(scheduledJobId)) continue;
      scheduledJobIds.add(scheduledJobId);
      scheduled.push(scheduledJobId);
    }
  }
  if (scheduled.length) {
    await touchEvent(storage, 'RUNNING', `queued endpoint dispatch sweep scheduled ${scheduled.length} job(s)`, {
      kind: 'queued_dispatch_sweep',
      jobIds: scheduled
    });
  }
  return { ok: true, scheduled_count: scheduled.length, job_ids: scheduled };
}

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
      maybeRefineWorkflowPlanWithLeaderLlm,
      mergeProtectedPromptSourceIntoInput,
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
      workflowVisibleAgentRunChildren
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
