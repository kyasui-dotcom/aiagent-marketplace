import { API_ROUTES, apiRouteMatches } from './lib/api-routes.js';
import { createBillingHelpers } from './lib/billing-helpers.js';
import { createBillingOutcomeHelpers } from './lib/billing-outcome.js';
import { createBillingSweepHandlers, providerMonthlyBillingAutoConfig } from './lib/billing-sweeps.js';
import { createStripeWebhookHandlers } from './lib/billing-webhooks.js';
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
import { stripeConnectedAccountIdentityStatus, stripeConnectedAccountPatch as baseStripeConnectedAccountPatch } from './lib/stripe-connected-account.js';
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
import { createBillingRouteHandlers } from './lib/routes/billing.js';
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
import { createProviderIdentityRouteHandlers, providerIdentityStatus } from './lib/routes/provider-identity.js';
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
import { createWorkflowParentReconcile } from './lib/workflow-parent-reconcile.js';
import { createWorkflowPlanAssemblyHelpers } from './lib/workflow-plan-assembly.js';
import { createWorkflowReconcileActions } from './lib/workflow-reconcile-actions.js';
import { createWorkflowReconcileState } from './lib/workflow-reconcile-state.js';
import { createWorkflowRetrySweep } from './lib/workflow-retry-sweep.js';
import { createWorkflowTimeouts } from './lib/workflow-timeouts.js';
import { ORCHESTRATION_WATCHDOG_POLICY, createWorkflowWatchdog } from './lib/workflow-watchdog.js';
import { createDispatchResponseNormalizer } from './lib/dispatch-response-normalizer.js';
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
import { normalizeUsageForBilling, usageWithObservedJobTokens } from './lib/usage-accounting.js';
import { API_COST_CATALOG_VERSION, BILLING_DISPLAY_CURRENCY, EXTERNAL_API_COST_CATALOG_USD, LLM_HIGH_WATERMARK_PRICE_PER_MTOK_USD, WELCOME_CREDITS_GRANT_AMOUNT, accountIdForLogin, accountIdentityForProvider, accountSettingsForIdentity, accountSettingsForLogin, agentLinksFromRecord, agentTagsFromRecord, aliasLoginsForAccount, applyStripeRefundToAccount, applySubscriptionRefillToAccount, authenticateOrderApiKey, billingAuditsForJobIds, billingModeFromJob, billingPeriodId, billingProfileForAccount, buildAdminDashboard, buildAgentId, buildFollowupConversationContext, buildIntakeClarification, buildMonthlyAccountSummary, chatSessionIdForJob, chatTrainingExamplesForClient, chatTranscriptsForClient, computeScore, connectorActionLabel, connectorOAuthActionInstruction, createChatTranscript, createFeedbackReport, createRecurringOrderInState, defaultLoginForAuthUser, deleteRecurringOrderInState, displayCurrencyToLedgerAmount, dueRecurringOrders, estimateBilling, estimateRunWindow, feedbackReportsForClient, hideChatMemoryTranscriptForLoginInState, inferAgentTagsFromSignals, inferTaskSequence, inferTaskType, isAgentOwnedByLogin, isBillableJob, isJobVisibleToLogin, isPrivateNetworkHostname, jobsVisibleToLogin, ledgerAmountToDisplayCurrency, linkIdentityToAccountInState, makeEvent, markRecurringOrderRunInState, maybeGrantWelcomeCreditsForSignupInState, maybeGrantWelcomeCreditsForVerifiedAgentInState, mergeAccountsInState, mergeProtectedPromptSourceIntoInput, normalizeAgentTags, normalizeTaskTypes, nowIso, optimizeOrderPromptForBroker, promptInjectionGuardForPrompt, providerMonthlyBillingLedgerForLogin, providerPayoutLedgerForLogin, publicEventView, recordProviderMonthlyChargeInAccount, recurringOrderToJobPayload, recurringOrdersVisibleToLogin, recordStripeTopupInAccount, recoverMissingAccountsInState, releaseBillingReservationInState, requesterContextFromUser, reserveBillingEstimateInState, sanitizeAccountSettingsForClient, sanitizeFeedbackReportForClient, settleBillingForJobInState, touchOrderApiKeyUsageInState, updateChatTranscriptReviewInState, updateFeedbackReportInState, updateRecurringOrderInState, upsertAccountSettingsForIdentityInState, upsertAccountSettingsInState, workflowTagHintsForTask, workflowTaskCandidateTokens, workflowTaskSoftMatchTokens } from './lib/shared.js';
import { agentRoutingConfirmationAccepted, applyConfirmedAgentRoutingToAgent, buildAgentRoutingConfirmation } from './lib/shared.js';
import { agentPatternFitScore, buildAgentTeamDeliveryOutput, ensureLeaderWorkflowActionTasksFromDefinition, isLargeAgentTeamIntent, leaderExternalActionRequestedFromDefinition, leaderPlannerAllowsCandidateAgentTasksFromDefinition, leaderSequentialUserActionPriorityFromDefinition, leaderSpecialistTaskForFollowupFromDefinition, leaderTaskTypeForInitialWork, leaderWorkflowReplanDecisionFromDefinition, normalizeLeaderWorkflowPlannedTasksFromDefinition, orderPreflightForAgent, ownChatMemoryForClient } from './lib/shared.js';
import { listCreatorUsageEstimateForOrder } from './lib/shared.js';
import { orderBodyWithCommonQualityRules } from './lib/shared.js';
import { amountFromMinorUnits, createConnectedAccount, createConnectedAccountTransfer, createConnectOnboardingLink, createOffSessionMonthlyInvoicePaymentIntent, createOffSessionProviderMonthlyPaymentIntent, createSetupCheckoutSession, createSubscriptionCheckoutSession, ensureStripeCustomer, resolveSubscriptionPlanFromPriceId, retrieveConnectedAccount, retrievePaymentIntent, retrieveSetupIntent, retrieveSubscription, stripeConfigFromEnv, stripeConfigured, stripePublicConfig, updateCustomerDefaultPaymentMethod, verifyStripeWebhookSignature } from './lib/stripe.js';
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
  workflowProviderRunMaxAttempts,
  workflowRestartRequiredReason,
  workflowSourceCollectionMaxRetries
} = dispatchPolicyHelpers;
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
  clientOrderIdFromCreateBody,
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

const stripeConnectedAccountPatch = (connectedAccountId, remoteAccount = null) => baseStripeConnectedAccountPatch(connectedAccountId, remoteAccount, { nowIso });

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

function workflowBrokerForJob(job = {}) {
  return job?.input?._broker && typeof job.input._broker === 'object' ? job.input._broker : {};
}

function workflowBrokerWorkflowForJobOrEmpty(job = {}) {
  const broker = workflowBrokerForJob(job);
  return broker.workflow && typeof broker.workflow === 'object' ? broker.workflow : {};
}

function workflowPrimaryTaskFromJobOrProfile(job = {}, parent = null) {
  const workflow = workflowBrokerWorkflowForJobOrEmpty(job);
  const plannedTasks = Array.isArray(job?.workflow?.plannedTasks) ? job.workflow.plannedTasks : [];
  const parentPlannedTasks = Array.isArray(parent?.workflow?.plannedTasks) ? parent.workflow.plannedTasks : [];
  return String(
    workflow.primaryTask
      || workflow.primary_task
      || parentPlannedTasks[0]
      || plannedTasks[0]
      || job.workflowTask
      || job.taskType
      || parent?.taskType
      || ''
  ).trim().toLowerCase();
}

function workflowUsesSaasPublishHandoff(job = {}, parent = null) {
  const workflow = workflowBrokerWorkflowForJobOrEmpty(job);
  const parentWorkflow = parent?.workflow && typeof parent.workflow === 'object' ? parent.workflow : {};
  const profileMode = String(
    workflow.externalActionMode
      || workflow.external_action_mode
      || parentWorkflow.externalActionMode
      || parentWorkflow.external_action_mode
      || ''
  ).trim().toLowerCase();
  const publishSurface = String(
    workflow.publishSurface
      || workflow.publish_surface
      || parentWorkflow.publishSurface
      || parentWorkflow.publish_surface
      || ''
  ).trim().toLowerCase();
  const publishApprovalSurface = String(
    workflow.publishApprovalSurface
      || workflow.publish_approval_surface
      || parentWorkflow.publishApprovalSurface
      || parentWorkflow.publish_approval_surface
      || ''
  ).trim().toLowerCase();
  const primary = workflowPrimaryTaskFromJobOrProfile(job, parent);
  return Boolean(
    profileMode === 'saas_handoff_only'
    || publishSurface === 'saas'
    || publishApprovalSurface === 'saas'
    || leaderUsesSaasPublishHandoff(primary)
  );
}

function authorityRequestHandledBySaasHandoff(job = {}, request = null, parent = null) {
  return Boolean(
    workflowUsesSaasPublishHandoff(job, parent)
    && authorityRequestIsExternalWriteOrPublish(request)
  );
}

function markJobBlockedForAuthority(job = {}, request = null, fallback = 'External execution is blocked waiting for connector approval.') {
  const reason = authorityBlockReasonFromRequest(request, fallback);
  const normalizedRequest = normalizeAuthorityRequest(request, {
    ownerLabel: String(job.workflowAgentName || job.taskType || '').trim() || 'CAIt',
    source: 'agent_delivery'
  });
  const logLine = `blocked waiting for authority approval: ${reason}`;
  job.status = 'blocked';
  job.completedAt = null;
  job.failedAt = null;
  job.timedOutAt = null;
  job.failureReason = reason;
  job.failureCategory = 'blocked_waiting_for_approval';
  job.actualBilling = null;
  clearDeliveryCompletionGate(job);
  job.dispatch = {
    ...(job.dispatch || {}),
    completionStatus: 'blocked_waiting_for_approval',
    retryable: false,
    nextRetryAt: null,
    completedAt: null
  };
  job.logs = (job.logs || []).includes(logLine)
    ? (job.logs || [])
    : [...(job.logs || []), logLine];
  if (job.output?.report && typeof job.output.report === 'object') {
    job.output.report.completion_state = 'blocked_waiting_for_approval';
    if (normalizedRequest && !authorityRequestFromReport(job.output.report)) {
      job.output.report.authority_request = normalizedRequest;
    }
  }
  return job;
}

function workflowParentAuthorityRequest(parent = {}) {
  const request = authorityRequestFromReport(parent?.output?.report);
  if (!authorityRequestRequiresApproval(request)) return null;
  if (authorityRequestHandledBySaasHandoff(parent, request, parent)) return null;
  const source = String(request?.source || request?.reason_code || request?.reasonCode || '').trim().toLowerCase();
  if (source === 'leader_execution_approval') return null;
  const missingConnectors = authorityStringList(
    request?.missing_connectors || request?.missingConnectors || request?.connectors,
    8,
    60
  );
  const missingCapabilities = authorityStringList(
    request?.missing_connector_capabilities || request?.missingConnectorCapabilities || request?.capabilities,
    16,
    120
  );
  const googleSources = authorityStringList(
    request?.required_google_sources || request?.requiredGoogleSources || request?.google_source_types || request?.googleSourceTypes,
    8,
    60
  );
  const explicitSelection = authorityBool(
    request?.required_channel_selection
      || request?.requiredChannelSelection
      || request?.required_repository_selection
      || request?.requiredRepositorySelection
      || request?.required_account_selection
      || request?.requiredAccountSelection
  );
  const writeCapabilities = missingCapabilities.filter((item) => (
    /(post|publish|send|write|submit|create|update|delete|calendar|gmail|email|x\.post|github\.write)/i.test(String(item || ''))
    && !/^google\.read_/i.test(String(item || ''))
  ));
  const sourceReadCapabilities = missingCapabilities.filter((item) => (
    /^(google|github)\.read_/i.test(String(item || ''))
    || /^read_/i.test(String(item || ''))
  ));
  const sourceConnectors = missingConnectors.filter((item) => (
    /^(google|ga4|gsc|search_console|google_analytics|analytics|drive|search|web_search|brave)$/i.test(String(item || ''))
  ));
  return googleSources.length
    || sourceReadCapabilities.length
    || (sourceConnectors.length && sourceConnectors.length === missingConnectors.length && !writeCapabilities.length)
    || (explicitSelection && !writeCapabilities.length)
    ? request
    : null;
}

function shouldBlockCompletedJobForAuthorityRequest(job = {}, request = null) {
  if (!authorityRequestRequiresApproval(request)) return false;
  if (authorityRequestHandledBySaasHandoff(job, request)) return false;
  if (workflowChildIsSaasHandoffOnly(job)) return false;
  const workflowParentId = String(job?.workflowParentId || '').trim();
  if (workflowParentId && isWorkflowLeaderTask(workflowTaskName(job))) return false;
  if (workflowParentId) {
    const task = workflowTaskName(job);
    const actionAuthorityTasks = new Set([
      'x_post',
      'instagram',
      'reddit',
      'indie_hackers',
      'email_ops',
      'cold_email',
      'directory_submission',
      'citation_ops'
    ]);
    if (!actionAuthorityTasks.has(task)) return false;
  }
  return true;
}

function syncJobAuthorityRequest(job = {}, agent = null) {
  if (['failed', 'timed_out'].includes(normalizeJobStatus(job.status))) {
    clearJobAuthorityRequest(job);
    return null;
  }
  if (!job?.output || typeof job.output !== 'object') return null;
  const existingExecutorState = job.executorState && typeof job.executorState === 'object' ? job.executorState : {};
  const completionStatus = String(job?.dispatch?.completionStatus || '').trim().toLowerCase();
  if (existingExecutorState.authorityApprovedAt && completionStatus.startsWith('approval_resolved')) {
    clearJobAuthorityRequest(job);
    return null;
  }
  const report = job.output.report && typeof job.output.report === 'object' ? job.output.report : {};
  const existingRequest = authorityRequestFromReport(report);
  const normalizedExistingRequest = normalizeAuthorityRequest(existingRequest, {
    ownerLabel: String(job.workflowAgentName || agent?.name || '').trim() || 'CAIt',
    source: 'agent_delivery'
  });
  const request = normalizedExistingRequest;
  if (authorityRequestHandledBySaasHandoff(job, request)) {
    clearJobAuthorityRequest(job);
    return null;
  }
  if (!request || !authorityRequestRequiresApproval(request)) {
    if (report.authority_request || report.authorityRequest || report.action_required || report.actionRequired || report.executor_request || report.executorRequest) {
      const cleanReport = { ...report };
      delete cleanReport.authority_request;
      delete cleanReport.authorityRequest;
      delete cleanReport.action_required;
      delete cleanReport.actionRequired;
      delete cleanReport.executor_request;
      delete cleanReport.executorRequest;
      job.output.report = cleanReport;
    }
    return null;
  }
  job.output.report = {
    ...report,
    authority_request: request
  };
  const patch = executorStatePatchFromAuthorityRequest(request, existingExecutorState);
  if (!patch) return request;
  job.executorState = {
    ...existingExecutorState,
    ...patch,
    updatedAt: nowIso()
  };
  return request;
}

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

const billingHelpers = createBillingHelpers({
  baseUrl,
  billingPeriodId,
  billingProfileForAccount,
  providerIdentityStatus,
  providerMonthlyBillingAutoConfig,
  runtimePolicy,
  sessionAuthProvider,
  stripeConfigFromEnv,
  stripePublicConfig,
  validateEmailAddress
});
const {
  betaBillingPausedResult,
  billingPausedForBeta,
  cleanRegistrationIdentityField,
  currentStripeConfig,
  providerMoneyReadinessForCurrent,
  providerRegistrationBillingStatus,
  stripeActionErrorPayload,
  stripeStateForClient
} = billingHelpers;

const billingRoutes = createBillingRouteHandlers({
  accountSettingsForLogin,
  baseUrl,
  betaBillingPausedResult,
  BILLING_DISPLAY_CURRENCY,
  billingPeriodId,
  billingPausedForBeta,
  createConnectedAccount,
  createConnectedAccountTransfer,
  createConnectOnboardingLink,
  createOffSessionMonthlyInvoicePaymentIntent,
  createOffSessionProviderMonthlyPaymentIntent,
  createSetupCheckoutSession,
  createSubscriptionCheckoutSession,
  currentStripeConfig,
  currentUserContext,
  displayCurrencyToLedgerAmount,
  ensureStripeCustomer,
  ledgerAmountToDisplayCurrency,
  nowIso,
  parseBody,
  runtimePolicy,
  sanitizeAccountSettingsForClient,
  providerIdentityStatus,
  providerMonthlyBillingLedgerForLogin,
  providerPayoutLedgerForLogin,
  recordProviderMonthlyChargeInAccount,
  retrieveConnectedAccount,
  stripeConfigured,
  stripeConnectedAccountIdentityStatus,
  stripeConnectedAccountPatch,
  stripeStateForClient,
  touchEvent,
  upsertAccountSettingsInState
});
const {
  createStripeConnectOnboardingForCurrent,
  createStripeProviderPayoutForCurrent,
  createStripeSetupSessionForCurrent,
  createStripeSubscriptionSessionForCurrent,
  getStripeStatus,
  triggerStripeMonthlyInvoiceChargeForCurrent,
  triggerStripeProviderMonthlyChargeForCurrent
} = billingRoutes;

const billingSweeps = createBillingSweepHandlers({
  accountSettingsForLogin,
  billingPausedForBeta,
  billingPeriodId,
  BILLING_DISPLAY_CURRENCY,
  createFeedbackReport,
  createOffSessionProviderMonthlyPaymentIntent,
  forwardFeedbackReportEmail,
  ledgerAmountToDisplayCurrency,
  nowIso,
  platformAdminLogins,
  providerMonthlyBillingLedgerForLogin,
  recordProviderMonthlyChargeInAccount,
  stripeConfigFromEnv,
  stripeConfigured,
  touchEvent,
  upsertAccountSettingsInState
});
const {
  runProviderMonthlyBillingSweep
} = billingSweeps;

const stripeWebhooks = createStripeWebhookHandlers({
  accountSettingsForLogin,
  amountFromMinorUnits,
  applyStripeRefundToAccount,
  applySubscriptionRefillToAccount,
  BILLING_DISPLAY_CURRENCY,
  currentStripeConfig,
  nowIso,
  recordStripeTopupInAccount,
  resolveSubscriptionPlanFromPriceId,
  retrievePaymentIntent,
  retrieveSetupIntent,
  retrieveSubscription,
  stripeConfigured,
  stripeConnectedAccountPatch,
  touchEvent,
  updateCustomerDefaultPaymentMethod,
  upsertAccountSettingsInState,
  verifyStripeWebhookSignature
});
const {
  handleStripeWebhook
} = stripeWebhooks;

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

function agentCompletionFailureRetryMeta(env = {}, job = {}) {
  const attempts = Math.max(providerRunAttempts(job), Number(job?.dispatch?.attempts || 0) || 0, 1);
  const maxRetries = workflowCompletionRetryLimitForJob(env, job);
  const retryable = attempts < maxRetries;
  return {
    category: 'missing_required_deliverable',
    attempts,
    maxRetries,
    retryable,
    nextRetryAt: retryable ? computeNextRetryAt(attempts) : null
  };
}

function markAgentCompletionFailedFreeInState(state, job, reason, env = {}, options = {}) {
  if (!job) return null;
  const failedAt = options.failedAt || nowIso();
  const retryMeta = agentCompletionFailureRetryMeta(env, job);
  job.status = 'failed';
  job.completedAt = null;
  job.failedAt = failedAt;
  job.timedOutAt = null;
  job.failureReason = reason || 'Agent did not return a required delivery artifact.';
  job.failureCategory = 'missing_required_deliverable';
  job.actualBilling = null;
  clearDeliveryCompletionGate(job);
  if (job.billingReservation && !job.billingSettlement?.settledAt && !job.billingReservation?.releasedAt) {
    releaseBillingReservationInState(state, job);
  }
  job.dispatch = {
    ...(job.dispatch || {}),
    completionStatus: 'failed',
    retryable: retryMeta.retryable,
    attempts: retryMeta.attempts,
    nextRetryAt: retryMeta.nextRetryAt,
    maxRetries: retryMeta.maxRetries,
    restartRequired: false
  };
  job.logs = [
    ...(job.logs || []),
    job.failureReason,
    retryMeta.retryable
      ? `failed before completion: missing agent delivery artifact; retry ${retryMeta.attempts + 1}/${retryMeta.maxRetries} scheduled`
      : `failed before completion: missing agent delivery artifact; retries exhausted at ${retryMeta.attempts}/${retryMeta.maxRetries}`,
    'billing released: agent did not complete a user-facing delivery'
  ];
  return retryMeta;
}

function sourceCollectionFailureRetryMeta(env = {}, job = {}, options = {}) {
  const attempts = Number(job?.dispatch?.attempts || 0) + (options.alreadyAttempted ? 0 : 1);
  const maxRetries = workflowSourceCollectionMaxRetries(env);
  const retryable = attempts < maxRetries;
  return {
    attempts,
    maxRetries,
    retryable,
    nextRetryAt: retryable ? computeNextRetryAt(attempts) : null
  };
}

function workflowQualitySourceTask(job = {}) {
  const task = String(job?.workflowTask || job?.taskType || '').trim().toLowerCase();
  return Boolean(job?.workflowParentId) && ['research', 'teardown', 'data_analysis', 'validation', 'diligence'].includes(task);
}

function workflowBuiltInFailureRetryMeta(env = {}, job = {}, failureMeta = {}) {
  const category = String(failureMeta.category || '').trim().toLowerCase();
  const attempts = Number.isFinite(Number(failureMeta.attempts))
    ? Number(failureMeta.attempts)
    : Number(job?.dispatch?.attempts || 0) + 1;
  const qualityRetryCategory = [
    'missing_required_sources',
    'missing_required_deliverable',
    'dispatch_timeout',
    'dispatch_provider_timeout',
    'dispatch_deadline_timeout',
    'dispatch_http_timeout',
    'dispatch_http_gateway_timeout',
    'dispatch_network_timeout',
    'dispatch_queue_timeout',
    'dispatch_http_5xx',
    'dispatch_error',
    'dispatch_malformed_response',
    'agent_quality_gate_failed',
    'leader_quality_gate_failed'
  ].includes(category);
  const qualitySourceRetry = workflowQualitySourceTask(job) && qualityRetryCategory;
  const concreteArtifactRetry = Boolean(job?.workflowParentId)
    && workflowTaskRequiresConcreteSpecialistArtifact(job)
    && category === 'missing_required_deliverable';
  const leaderControlRetry = workflowLeaderControlTask(job) && qualityRetryCategory;
  const maxRetries = qualitySourceRetry
    ? Math.max(maxDispatchRetriesForJob(job), workflowSourceCollectionMaxRetries(env))
    : concreteArtifactRetry
      ? Math.max(maxDispatchRetriesForJob(job), 3)
    : leaderControlRetry
      ? workflowLeaderControlMaxRetries(env, job)
    : (Number.isFinite(Number(failureMeta.maxRetries)) ? Number(failureMeta.maxRetries) : maxDispatchRetriesForJob(job));
  const retryable = Boolean((qualitySourceRetry || concreteArtifactRetry || leaderControlRetry || failureMeta.retryable) && attempts < maxRetries);
  return {
    attempts,
    maxRetries,
    retryable,
    nextRetryAt: retryable ? computeNextRetryAt(attempts) : null
  };
}

async function postJsonWithTimeout(url, payload, timeoutMs = 0, extraHeaders = {}) {
  const useAbort = Number.isFinite(Number(timeoutMs)) && Number(timeoutMs) > 0;
  const controller = useAbort ? new AbortController() : null;
  const timer = useAbort ? setTimeout(() => controller.abort(), Number(timeoutMs)) : null;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json', ...extraHeaders },
      body: JSON.stringify(payload),
      ...(controller ? { signal: controller.signal } : {})
    });
    const text = await response.text();
    let body = {};
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        throw new Error(`Dispatch response was not valid JSON (${response.status})`);
      }
    }
    return { response, body };
  } catch (error) {
    if (error?.name === 'AbortError') throw new Error(`Dispatch timed out after ${timeoutMs}ms`);
    throw error;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

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

function workflowTaskName(job = {}) {
  return String(job.workflowTask || job.taskType || '').trim().toLowerCase();
}

function isWorkflowLeaderTask(taskType = '') {
  const task = String(taskType || '').trim().toLowerCase();
  return Boolean(task && task.endsWith('_leader'));
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

function workflowSequencePhaseForJob(job = {}) {
  return String(job?.input?._broker?.workflow?.sequencePhase || '').trim().toLowerCase();
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

function workflowSearchSourcesFromReport(report = {}) {
  const raw = Array.isArray(report?.web_sources)
    ? report.web_sources
    : (Array.isArray(report?.sources) ? report.sources : []);
  return raw
    .map((item) => {
      if (!item) return null;
      if (typeof item === 'string') return { url: item, title: '', snippet: '' };
      return {
        url: String(item.url || item.link || '').trim(),
        title: String(item.title || item.name || '').trim(),
        snippet: String(item.snippet || item.description || item.summary || '').trim(),
        query: String(item.query || item.search_query || item.searchQuery || '').trim(),
        action: String(item.action || item.source_action || item.sourceAction || '').trim(),
        provider: String(item.provider || item.search_provider || item.searchProvider || item.source || '').trim()
      };
    })
    .filter((item) => item && (item.url || item.title || item.snippet || item.query))
    .slice(0, 8);
}

function workflowSearchSourceHasExecutionProof(source = {}) {
  if (!source || typeof source !== 'object') return false;
  const query = String(source.query || '').trim();
  if (query) return true;
  const action = String(source.action || '').trim().toLowerCase();
  if (/(search|brave|web_search|serp|source_collection)/i.test(action)) return true;
  const provider = String(source.provider || '').trim().toLowerCase();
  return /(brave|openai_web_search|web_search|search|serp)/i.test(provider);
}

function workflowSearchSourcesHaveExecutionProof(sources = []) {
  return (Array.isArray(sources) ? sources : []).some((source) => workflowSearchSourceHasExecutionProof(source));
}

function workflowSearchCompletionFailureReason(job = {}, report = {}) {
  if (!workflowJobRequiresSearch(job)) return '';
  const sources = workflowSearchSourcesFromReport(report);
  if (!sources.length) return 'Search-required workflow run did not attach any web_sources, so it cannot be completed.';
  if (!workflowSearchSourcesHaveExecutionProof(sources)) {
    return 'Search-required workflow run attached source URLs without search execution proof. Include the search query, search action, or search provider from the source collection step.';
  }
  return '';
}

function workflowConcreteDeliverableContractForJob(job = {}) {
  const broker = job?.input?._broker && typeof job.input._broker === 'object' ? job.input._broker : {};
  const workflow = broker.workflow && typeof broker.workflow === 'object' ? broker.workflow : {};
  const candidates = [
    workflow.concreteDeliverableContract,
    workflow.concrete_deliverable_contract,
    workflow.deliverableQualityContract,
    workflow.deliverable_quality_contract,
    broker.concreteDeliverableContract,
    broker.concrete_deliverable_contract,
    broker.deliverableQualityContract,
    broker.deliverable_quality_contract,
    broker.agentContract?.deliverableQuality,
    broker.agentContract?.deliverable_quality,
    broker.agentPreflight?.deliverableQuality,
    broker.agentPreflight?.deliverable_quality
  ];
  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) continue;
    const required = candidate.required === true
      || candidate.requires_concrete_deliverable === true
      || candidate.requiresConcreteDeliverable === true;
    if (required) return candidate;
  }
  return null;
}

function workflowTaskRequiresConcreteSpecialistArtifact(job = {}) {
  if (!job || typeof job !== 'object' || Array.isArray(job)) return false;
  return Boolean(workflowConcreteDeliverableContractForJob(job));
}

function workflowConcreteArtifactText(job = {}) {
  const output = job?.output && typeof job.output === 'object' ? job.output : {};
  const report = output.report && typeof output.report === 'object' ? output.report : {};
  const files = Array.isArray(output.files) ? output.files : [];
  return [
    output.summary,
    output.file_markdown,
    output.deliverableMarkdown,
    output.deliverable_markdown,
    report.summary,
    report.answer,
    report.recommendation,
    report.file_markdown,
    report.markdown,
    report.deliverableMarkdown,
    report.deliverable_markdown,
    ...(Array.isArray(report.bullets) ? report.bullets : []),
    report.nextAction || report.next_action,
    ...files.map((file) => `${file?.name || ''}\n${file?.content || ''}`)
  ].map((value) => typeof value === 'string' ? value : JSON.stringify(value || '')).join('\n');
}

function workflowConcreteArtifactFailureReason(job = {}) {
  const task = workflowTaskName(job);
  const contract = workflowConcreteDeliverableContractForJob(job);
  if (!contract) return '';
  const output = job?.output && typeof job.output === 'object' ? job.output : {};
  const files = Array.isArray(output.files) ? output.files : [];
  const report = output.report && typeof output.report === 'object' ? output.report : {};
  const markdownText = [
    output.file_markdown,
    output.deliverableMarkdown,
    output.deliverable_markdown,
    report.file_markdown,
    report.markdown,
    report.deliverableMarkdown,
    report.deliverable_markdown
  ].filter((value) => typeof value === 'string' && value.trim()).join('\n\n');
  const text = workflowConcreteArtifactText(job);
  const fileText = [
    markdownText,
    ...files.map((file) => String(file?.content || ''))
  ].join('\n\n');
  if (/prior_handoff_specialist_packet|prior handoff packet|handoff packet|durable packet|Generation exceeded the retry budget|生成が長引いた|上流handoffの事実/i.test(text)) {
    return `${task} returned only a generic handoff packet, not the concrete deliverable required for this specialist.`;
  }
  if (workflowDeliveryLooksInternalFacing(fileText || text)) {
    return `${task} returned internal-facing handoff or orchestration markdown instead of a user-facing deliverable.`;
  }
  const minChars = Math.max(0, Math.min(5000, Number(contract.min_chars || contract.minChars || 300) || 300));
  const requiresFile = contract.requires_file !== false && contract.requiresFile !== false;
  if (requiresFile && (!files.length || fileText.trim().length < minChars)) {
    return `${task} did not attach a substantial deliverable file.`;
  }
  const requiredTerms = Array.isArray(contract.required_terms || contract.requiredTerms)
    ? (contract.required_terms || contract.requiredTerms).map((item) => String(item || '').trim()).filter(Boolean).slice(0, 12)
    : [];
  const missingTerms = requiredTerms.filter((term) => !text.toLowerCase().includes(term.toLowerCase()));
  if (missingTerms.length) {
    return `${task} missing required deliverable contract terms: ${missingTerms.slice(0, 4).join(', ')}.`;
  }
  const requiredPatterns = Array.isArray(contract.required_patterns || contract.requiredPatterns)
    ? (contract.required_patterns || contract.requiredPatterns).map((item) => String(item || '').trim()).filter(Boolean).slice(0, 12)
    : [];
  for (const patternText of requiredPatterns) {
    try {
      if (!new RegExp(patternText, 'i').test(text)) {
        return `${task} missing required deliverable contract pattern: ${patternText}.`;
      }
    } catch {
      if (!text.toLowerCase().includes(patternText.toLowerCase())) {
        return `${task} missing required deliverable contract text: ${patternText}.`;
      }
    }
  }
  return '';
}

function workflowDeliveryLooksInternalFacing(text = '') {
  const value = String(text || '');
  if (!value.trim()) return false;
  const headingPattern = /^#{1,6}\s*(?:facts_verified|assumptions_used|evidence_gaps|artifact_for_next_agent|recommended_next_owner|structured handoff digest|supporting fact index|downstream handoff(?: summary| packet)?|採用判断表|publisher下書き状態|external app ingest status)\b/gim;
  if (headingPattern.test(value)) return true;
  const internalLinePattern = /(?:^|\n)\s*(?:[-*]\s*)?(?:source_task_type|source_agent_name|source_run_id|artifact_for_next_agent|recommended_next_owner|Publisher下書き状態|External app ingest status)\s*[:：]/i;
  if (internalLinePattern.test(value)) return true;
  const agentMatrixPattern = /(?:^|\n)\s*\|\s*(?:data_analysis|research|teardown|media_planner|growth|seo_specialist|list_creator)\s*\|/i;
  return agentMatrixPattern.test(value);
}

function recordWorkflowConcreteArtifactWarning(job = {}, reason = '', checkedAt = nowIso()) {
  const text = String(reason || '').trim();
  if (!job || !text) return false;
  const existing = job.deliveryCompletionGate && typeof job.deliveryCompletionGate === 'object'
    ? job.deliveryCompletionGate
    : {};
  const existingIssues = Array.isArray(existing.issues) ? existing.issues.map((item) => String(item || '').trim()).filter(Boolean) : [];
  const issues = existingIssues.includes(text) ? existingIssues : [...existingIssues, text];
  setDeliveryCompletionGate(job, checkedAt, {
    score: Number.isFinite(Number(existing.score)) ? Number(existing.score) : deliveryCompletionEvidenceScoreForJob(job),
    version: existing.version || 'delivery-completion-gate/v1',
    checkedAt: existing.checkedAt || checkedAt,
    issues,
    completionBlocking: true
  });
  const warningLine = `quality failure: missing required concrete deliverable (${checkedAt})`;
  job.logs = Array.isArray(job.logs) && job.logs.includes(warningLine)
    ? job.logs
    : [...(Array.isArray(job.logs) ? job.logs : []), text, warningLine];
  return true;
}

function workflowSourceSignalStrings(sources = []) {
  const signals = [];
  const seen = new Set();
  const push = (value = '') => {
    const text = String(value || '').trim();
    if (!text) return;
    const normalized = text.toLowerCase();
    if (seen.has(normalized)) return;
    seen.add(normalized);
    signals.push(text);
  };
  for (const source of Array.isArray(sources) ? sources : []) {
    if (!source || typeof source !== 'object') continue;
    push(source.url);
    push(source.title);
    push(source.snippet);
    push(source.query);
    push(source.action);
    push(source.provider);
    try {
      const hostname = source.url ? new URL(source.url).hostname.replace(/^www\./i, '') : '';
      push(hostname);
    } catch {}
  }
  return signals.slice(0, 20);
}

function workflowMinimumPriorUseForPhase(phase = '', priorRunCount = 0) {
  const normalizedPhase = String(phase || '').trim().toLowerCase();
  const count = Math.max(0, Number(priorRunCount || 0) || 0);
  if (!count) return 0;
  if (normalizedPhase === 'planning') return 1;
  if (['preparation', 'action', 'implementation'].includes(normalizedPhase)) return Math.min(2, count);
  if (['checkpoint', 'final_summary'].includes(normalizedPhase)) return Math.min(2, count);
  return Math.min(1, count);
}

function workflowHandoffPriorDeliverables(priorRuns = []) {
  return (Array.isArray(priorRuns) ? priorRuns : [])
    .map((run) => {
      const files = Array.isArray(run?.files)
        ? run.files.map((file) => ({
          name: String(file?.name || 'delivery.md').slice(0, 160),
          content: String(file?.content || '').slice(0, 10000)
        })).filter((file) => file.name || file.content).slice(0, 2)
        : [];
      return {
        jobId: run?.jobId || null,
        taskType: run?.taskType || run?.workflowTask || '',
        layer: Number(run?.layer || 0) || null,
        summary: String(run?.summary || run?.reportSummary || '').slice(0, 1600),
        bullets: Array.isArray(run?.bullets) ? run.bullets.slice(0, 6) : [],
        webSources: Array.isArray(run?.webSources) ? run.webSources.slice(0, 8) : [],
        files,
        requiredUsageSignals: workflowHandoffOriginalSignals([run]).slice(0, 8)
      };
    })
    .filter((item) => item.summary || item.bullets.length || item.webSources.length || item.files.length)
    .slice(0, 10);
}

function workflowSlimPriorRunForHandoff(run = {}) {
  const deliverableMarkdown = String(
    run.deliverableMarkdown
    || (Array.isArray(run.files)
      ? run.files
        .map((file) => {
          if (typeof file === 'string') return '';
          return [`# ${file?.name || 'delivery.md'}`, file?.content || ''].filter(Boolean).join('\n');
        })
        .filter(Boolean)
        .join('\n\n')
      : '')
    || ''
  ).trim();
  const files = Array.isArray(run.files)
    ? run.files
      .map((file) => {
        if (typeof file === 'string') return { name: workflowHandoffClip(file, 120), content_available: false };
        return {
          name: workflowHandoffClip(file?.name || 'delivery.md', 120),
          content_available: Boolean(String(file?.content || '').trim())
        };
      })
      .filter((file) => file.name)
      .slice(0, 4)
    : [];
  const structuredDigest = run.structuredDigest && typeof run.structuredDigest === 'object'
    ? run.structuredDigest
    : workflowStructuredHandoffDigestFromRun(run);
  return {
    jobId: run.jobId || null,
    taskType: run.taskType || run.workflowTask || '',
    agentId: run.agentId || null,
    agentName: run.agentName || null,
    sequencePhase: run.sequencePhase || run.phase || null,
    layer: Number(run.layer || 0) || null,
    completedAt: run.completedAt || null,
    summary: String(run.summary || run.reportSummary || '').slice(0, 500),
    nextAction: String(run.nextAction || run.next_action || '').slice(0, 360),
    webSources: Array.isArray(run.webSources) ? run.webSources.slice(0, 8) : [],
    sourceBundle: run.sourceBundle || null,
    qualityGate: run.qualityGate || null,
    files,
    deliverableMarkdownExcerpt: deliverableMarkdown ? workflowHandoffBlockClip(deliverableMarkdown, 1600) : '',
    structuredDigest,
    requiredUsageSignals: Array.isArray(run.requiredUsageSignals) ? run.requiredUsageSignals.slice(0, 8) : [],
    promptContextAttached: run.promptContextAttached === true
  };
}

function workflowExecutionProgram(parent = {}, targetLayer = 1, priorRuns = []) {
  const primaryTask = workflowPrimaryTask(parent);
  const targetPhase = workflowLayerLabel(primaryTask, targetLayer);
  const requiredPriorUse = workflowMinimumPriorUseForPhase(targetPhase, priorRuns.length);
  return {
    version: 'workflow-execution-program/v1',
    primaryTask,
    targetLayer,
    targetPhase,
    steps: [
      'read_structured_handoff_digest',
      'apply_agent_role_contract',
      'produce_phase_specific_artifact',
      'surface_missing_source_or_connector_blockers'
    ],
    gates: {
      sourceBackedResearchBeforePlanning: targetLayer >= 2,
      priorHandoffBeforePreparationOrAction: targetLayer >= 3,
      approvalBeforeExternalWrite: targetLayer >= leaderActionLayerStart(primaryTask),
      noGenericTemplateFallbackWhenPriorRunsExist: priorRuns.length > 0
    },
    requiredPriorUse,
    priorDependencies: priorRuns.map((run) => ({
      taskType: run.taskType || run.workflowTask || '',
      jobId: run.jobId || null,
      layer: Number(run.layer || 0) || null,
      status: run.status || 'completed'
    })).slice(0, 12)
  };
}

function workflowOutputText(job = {}) {
  const output = job?.output && typeof job.output === 'object' ? job.output : {};
  const report = output.report && typeof output.report === 'object' ? output.report : {};
  const bullets = Array.isArray(report.bullets) ? report.bullets : [];
  const files = Array.isArray(output.files) ? output.files : [];
  const webSources = workflowSearchSourcesFromReport(report);
  return [
    output.summary,
    report.summary,
    report.answer,
    report.nextAction,
    report.next_action,
    ...bullets,
    ...webSources.flatMap((source) => [source.title, source.url, source.snippet]),
    ...files.map((file) => file?.content || '')
  ]
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .join('\n');
}

function workflowOutputTextForQuality(job = {}) {
  return workflowOutputText(job)
    .replace(/##\s+Original information used[\s\S]*?(?=\n##\s+|$)/gi, '')
    .replace(/^[-*]?\s*Used original information:\s*.*$/gmi, '')
    .replace(/^[-*]?\s*Handoff evidence attached:\s*.*$/gmi, '');
}

function workflowHandoffClip(value = '', max = 500) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text || text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1)).trim()}...`;
}

function workflowHandoffBlockClip(value = '', max = 5000) {
  const text = String(value || '')
    .replace(/\r\n/g, '\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
  if (!text || text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1)).trim()}...`;
}

function workflowFlattenTextParts(value, parts = []) {
  if (value == null) return parts;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    const text = String(value).trim();
    if (text) parts.push(text);
    return parts;
  }
  if (Array.isArray(value)) {
    for (const entry of value) workflowFlattenTextParts(entry, parts);
    return parts;
  }
  if (typeof value === 'object') {
    for (const entry of Object.values(value)) workflowFlattenTextParts(entry, parts);
  }
  return parts;
}

function workflowNormalizeCandidateUrl(value = '') {
  let text = String(value || '')
    .trim()
    .replace(/^[0-9０-９]+[.)．、]\s*/u, '')
    .replace(/[)\].,;、。]+$/u, '');
  if (!text) return '';
  if (!/^https?:\/\//i.test(text)) text = `https://${text}`;
  try {
    const parsed = new URL(text);
    if (!['http:', 'https:'].includes(parsed.protocol)) return '';
    if (!parsed.hostname.includes('.')) return '';
    parsed.hostname = parsed.hostname.replace(/^www\./i, '').toLowerCase();
    return parsed.toString().replace(/\/$/, '');
  } catch {
    return '';
  }
}

function workflowExtractSourceUrls(text = '', limit = 8) {
  const source = String(text || '')
    .replace(/(^|[\s\n])[0-9０-９]+[.)．、]\s*(?=(?:https?:\/\/)?(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+)/gi, '$1');
  const urls = [];
  const seen = new Set();
  const push = (value = '') => {
    const url = workflowNormalizeCandidateUrl(value);
    const key = url.toLowerCase();
    if (!url || seen.has(key)) return;
    seen.add(key);
    urls.push(url);
  };
  for (const match of source.match(/https?:\/\/[^\s)"'<>]+/ig) || []) push(match);
  const domainPattern = /(?:^|[^@a-z0-9_-])((?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+)(?=[^a-z0-9_-]|$)/gi;
  let match = domainPattern.exec(source);
  while (match) {
    push(match[1]);
    if (urls.length >= limit) break;
    match = domainPattern.exec(source);
  }
  return urls.slice(0, limit);
}

function workflowCanonicalBriefFromJob(job = {}, workflow = {}, handoff = {}) {
  const input = job?.input && typeof job.input === 'object' ? job.input : {};
  const broker = input._broker && typeof input._broker === 'object' ? input._broker : {};
  const promptOptimization = broker.promptOptimization || job.promptOptimization || {};
  const rawText = workflowFlattenTextParts([
    handoff.canonicalBrief?.rawRequest,
    handoff.objective,
    workflow.objective,
    workflow.originalPrompt,
    job.originalPrompt,
    promptOptimization.originalPrompt,
    input.originalPrompt,
    input.orderBrief,
    input.brief,
    input.request,
    input.summary,
    input.description,
    input.product,
    input.productName,
    input.product_name,
    input.url,
    input.urls,
    input.website,
    input.websites,
    input.audience,
    input.icp,
    input.conversion,
    input.constraints,
    input.channels,
    input.answers,
    input.intake,
    input.intakeAnswers,
    job.prompt
  ]).join('\n');
  const urls = workflowExtractSourceUrls(rawText, 8);
  const product = workflowHandoffClip(
    input.product || input.productName || input.product_name || input.service || input.serviceName || urls[0] || '',
    360
  );
  const audience = workflowHandoffClip(input.audience || input.icp || input.targetAudience || '', 360);
  const conversion = workflowHandoffClip(input.conversion || input.goal || input.primaryConversion || '', 300);
  const constraints = workflowHandoffClip(input.constraints || input.budget || input.channels || '', 500);
  return {
    rawRequest: workflowHandoffBlockClip(rawText, 5000),
    sourceUrls: urls,
    product,
    audience,
    conversion,
    constraints
  };
}

function workflowCanonicalBriefPromptLines(job = {}, workflow = {}, handoff = {}) {
  const canonical = (handoff.canonicalBrief && typeof handoff.canonicalBrief === 'object')
    ? handoff.canonicalBrief
    : workflowCanonicalBriefFromJob(job, workflow, handoff);
  const lines = [
    'CANONICAL USER BRIEF (source of truth; preserve these facts over templates or prior examples):',
    canonical.rawRequest ? `Original user request and intake:\n${workflowHandoffBlockClip(canonical.rawRequest, 5000)}` : '',
    Array.isArray(canonical.sourceUrls) && canonical.sourceUrls.length
      ? `Source/target URLs from user input: ${canonical.sourceUrls.join(' | ')}`
      : 'Source/target URLs from user input: none detected; do not invent or truncate URLs.',
    canonical.product ? `Product/service from user input: ${workflowHandoffClip(canonical.product, 360)}` : '',
    canonical.audience ? `Audience/ICP from user input: ${workflowHandoffClip(canonical.audience, 360)}` : '',
    canonical.conversion ? `Conversion goal from user input: ${workflowHandoffClip(canonical.conversion, 300)}` : '',
    canonical.constraints ? `Constraints/channels/budget from user input: ${workflowHandoffClip(canonical.constraints, 500)}` : '',
    'Rules: do not replace the target with CAIt/AIagent2 unless the canonical brief explicitly names it as the product; do not shorten domains into broken URLs; if a URL or target is missing, state the missing context instead of fabricating.'
  ].filter(Boolean);
  return lines;
}

function workflowDigestPushUnique(list = [], value = '', max = 260) {
  const text = workflowHandoffClip(value, max);
  if (!text) return;
  const key = text.toLowerCase();
  if (list.some((item) => String(item || '').toLowerCase() === key)) return;
  list.push(text);
}

function workflowDigestLinesFromText(text = '', options = {}) {
  const maxItems = Math.max(1, Math.min(24, Number(options.maxItems || 8) || 8));
  const maxLen = Math.max(80, Math.min(500, Number(options.maxLen || 240) || 240));
  const source = String(text || '')
    .replace(/```[\s\S]*?```/g, (block) => block.slice(0, 1200))
    .split(/\n+/)
    .map((line) => line
      .replace(/^\s{0,3}#{1,6}\s*/, '')
      .replace(/^\s*[-*]\s+/, '')
      .replace(/^\s*\d+[.)]\s+/, '')
      .replace(/\s+/g, ' ')
      .trim())
    .filter((line) => line && line.length >= 12 && !/^[-|:]+$/.test(line))
    .filter((line) => !/^(field|item|value|source|url|status|summary)$/i.test(line));
  const picked = [];
  for (const line of source) {
    workflowDigestPushUnique(picked, line, maxLen);
    if (picked.length >= maxItems) break;
  }
  return picked;
}

function workflowDigestClassifyLines(text = '') {
  const lines = workflowDigestLinesFromText(text, { maxItems: 36, maxLen: 280 });
  const classified = {
    facts: [],
    decisions: [],
    artifacts: [],
    blockers: []
  };
  for (const line of lines) {
    if (/(blocked|missing|required|approval|approve|connector|authority|source_required|not connected|未接続|承認|必要|不足|ブロック|確認待ち)/i.test(line)) {
      workflowDigestPushUnique(classified.blockers, line, 260);
      continue;
    }
    if (/(exact_copy|post text|subject|body|h1|hero|cta|utm_|url|field map|company_name|contact_source_url|draft|packet|copy|headline|投稿|件名|本文|コピー|見出し|実行パケット|承認packet|掲載文)/i.test(line)) {
      workflowDigestPushUnique(classified.artifacts, line, 260);
      continue;
    }
    if (/(answer first|先に結論|recommend|recommendation|chosen|priority|prioritize|decision|next action|stop rule|metric|推奨|優先|判断|結論|次に|停止条件|指標)/i.test(line)) {
      workflowDigestPushUnique(classified.decisions, line, 260);
      continue;
    }
    workflowDigestPushUnique(classified.facts, line, 240);
  }
  return classified;
}

function workflowResearchHandoffFromReport(report = {}) {
  const findings = report?.research_findings && typeof report.research_findings === 'object'
    ? report.research_findings
    : (report?.researchFindings && typeof report.researchFindings === 'object' ? report.researchFindings : {});
  const downstream = report?.downstream_handoff && typeof report.downstream_handoff === 'object'
    ? report.downstream_handoff
    : (report?.downstreamHandoff && typeof report.downstreamHandoff === 'object'
      ? report.downstreamHandoff
      : (findings.downstream_handoff && typeof findings.downstream_handoff === 'object'
        ? findings.downstream_handoff
        : (findings.downstreamHandoff && typeof findings.downstreamHandoff === 'object' ? findings.downstreamHandoff : {})));
  const channelRequirements = downstream.channel_requirements && typeof downstream.channel_requirements === 'object'
    ? downstream.channel_requirements
    : (downstream.channelRequirements && typeof downstream.channelRequirements === 'object'
      ? downstream.channelRequirements
      : (findings.channel_requirements && typeof findings.channel_requirements === 'object'
        ? findings.channel_requirements
        : (findings.channelRequirements && typeof findings.channelRequirements === 'object' ? findings.channelRequirements : {})));
  const evidenceGaps = Array.isArray(report.evidence_gaps)
    ? report.evidence_gaps
    : (Array.isArray(report.evidenceGaps)
      ? report.evidenceGaps
      : (Array.isArray(findings.evidence_gaps)
        ? findings.evidence_gaps
        : (Array.isArray(findings.evidenceGaps)
          ? findings.evidenceGaps
          : (Array.isArray(downstream.evidence_gaps) ? downstream.evidence_gaps : (Array.isArray(downstream.evidenceGaps) ? downstream.evidenceGaps : [])))));
  const sourceStatus = downstream.source_status && typeof downstream.source_status === 'object'
    ? downstream.source_status
    : (downstream.sourceStatus && typeof downstream.sourceStatus === 'object' ? downstream.sourceStatus : null);
  const approvalBoundary = downstream.approval_boundary && typeof downstream.approval_boundary === 'object'
    ? downstream.approval_boundary
    : (downstream.approvalBoundary && typeof downstream.approvalBoundary === 'object' ? downstream.approvalBoundary : null);
  const requirements = [];
  for (const [channel, raw] of Object.entries(channelRequirements || {})) {
    const item = raw && typeof raw === 'object' ? raw : { use: raw };
    const pieces = [
      item.use,
      item.evidence_rule || item.evidenceRule,
      item.avoid ? `avoid: ${item.avoid}` : '',
      Array.isArray(item.required_artifacts) ? `return: ${item.required_artifacts.join(', ')}` : '',
      Array.isArray(item.requiredArtifacts) ? `return: ${item.requiredArtifacts.join(', ')}` : ''
    ].map((value) => workflowHandoffClip(value, 260)).filter(Boolean);
    if (pieces.length) workflowDigestPushUnique(requirements, `${channel}: ${pieces.join(' / ')}`, 420);
  }
  const gaps = [];
  for (const gap of evidenceGaps) {
    if (!gap || typeof gap !== 'object') continue;
    workflowDigestPushUnique(gaps, [
      gap.id,
      gap.severity ? `(${gap.severity})` : '',
      gap.gap,
      gap.next_check || gap.nextCheck ? `next: ${gap.next_check || gap.nextCheck}` : ''
    ].filter(Boolean).join(' '), 360);
  }
  const sourceStatusText = sourceStatus
    ? [
        sourceStatus.provider ? `provider=${sourceStatus.provider}` : '',
        Number.isFinite(Number(sourceStatus.source_count)) ? `sources=${Number(sourceStatus.source_count)}` : '',
        Number.isFinite(Number(sourceStatus.fetched_page_count)) ? `fetched_pages=${Number(sourceStatus.fetched_page_count)}` : '',
        Array.isArray(sourceStatus.domains) && sourceStatus.domains.length ? `domains=${sourceStatus.domains.slice(0, 6).join(',')}` : '',
        Array.isArray(sourceStatus.limitations) && sourceStatus.limitations.length ? `limitations=${sourceStatus.limitations.slice(0, 3).join(' / ')}` : ''
      ].filter(Boolean).join('; ')
    : '';
  const approvalText = approvalBoundary
    ? [
        approvalBoundary.use,
        approvalBoundary.approval_required === true ? 'approval_required=true' : '',
        approvalBoundary.approvalRequired === true ? 'approval_required=true' : ''
      ].filter(Boolean).join(' / ')
    : '';
  if (!requirements.length && !gaps.length && !sourceStatusText && !approvalText) return null;
  return {
    sourceStatus: workflowHandoffClip(sourceStatusText, 420),
    channelRequirements: requirements.slice(0, 8),
    evidenceGaps: gaps.slice(0, 6),
    approvalBoundary: workflowHandoffClip(approvalText, 360)
  };
}

function workflowStructuredHandoffDigestFromRun(run = {}) {
  const files = Array.isArray(run.files) ? run.files : [];
  const fileText = files
    .map((file) => typeof file === 'string' ? '' : String(file?.content || ''))
    .filter(Boolean)
    .join('\n\n');
  const combinedText = [
    run.summary,
    run.reportSummary,
    Array.isArray(run.bullets) ? run.bullets.join('\n') : '',
    run.nextAction,
    run.next_action,
    run.deliverableMarkdown,
    fileText
  ].map((item) => String(item || '').trim()).filter(Boolean).join('\n\n');
  const classified = workflowDigestClassifyLines(combinedText);
  const sources = [];
  for (const source of Array.isArray(run.webSources) ? run.webSources : []) {
    const url = workflowHandoffClip(source?.url || source?.link || source?.query || '', 220);
    const title = workflowHandoffClip(source?.title || source?.name || '', 140);
    const snippet = workflowHandoffClip(source?.snippet || source?.description || source?.summary || '', 180);
    workflowDigestPushUnique(sources, [title, url, snippet].filter(Boolean).join(' | '), 360);
  }
  for (const file of files) {
    const content = typeof file === 'string' ? '' : String(file?.content || '');
    for (const url of workflowExtractSourceUrls(content, 4)) workflowDigestPushUnique(sources, url, 220);
  }
  const nextInputs = [];
  for (const signal of Array.isArray(run.requiredUsageSignals) ? run.requiredUsageSignals : []) {
    workflowDigestPushUnique(nextInputs, signal, 220);
  }
  workflowDigestPushUnique(nextInputs, run.nextAction || run.next_action || '', 360);
  const researchHandoff = run.structuredResearchHandoff && typeof run.structuredResearchHandoff === 'object'
    ? run.structuredResearchHandoff
    : null;
  return {
    taskType: String(run.taskType || run.workflowTask || '').trim(),
    status: String(run.status || 'completed').trim(),
    phase: String(run.sequencePhase || run.phase || run.workflowPhase || '').trim(),
    summary: workflowHandoffClip(run.summary || run.reportSummary || '', 500),
    facts: classified.facts.slice(0, 5),
    sources: sources.slice(0, 6),
    decisions: classified.decisions.slice(0, 5),
    artifacts: classified.artifacts.slice(0, 6),
    blockers: classified.blockers.slice(0, 5),
    nextInputs: nextInputs.filter(Boolean).slice(0, 5),
    sourceStatus: researchHandoff?.sourceStatus || '',
    channelRequirements: Array.isArray(researchHandoff?.channelRequirements) ? researchHandoff.channelRequirements.slice(0, 8) : [],
    evidenceGaps: Array.isArray(researchHandoff?.evidenceGaps) ? researchHandoff.evidenceGaps.slice(0, 6) : [],
    approvalBoundary: researchHandoff?.approvalBoundary || ''
  };
}

function workflowStructuredDigestPromptLines(run = {}, index = 0) {
  const looksLikeDigest = run && typeof run === 'object' && (
    Array.isArray(run.facts)
    || Array.isArray(run.sources)
    || Array.isArray(run.decisions)
    || Array.isArray(run.artifacts)
    || Array.isArray(run.blockers)
    || Array.isArray(run.nextInputs)
  );
  const digest = (run.structuredDigest && typeof run.structuredDigest === 'object')
    ? run.structuredDigest
    : looksLikeDigest
      ? run
      : workflowStructuredHandoffDigestFromRun(run);
  const task = workflowHandoffClip(digest.taskType || run.taskType || run.workflowTask || `prior_${index + 1}`, 90);
  const phase = workflowHandoffClip(digest.phase || run.sequencePhase || '', 50);
  const status = workflowHandoffClip(digest.status || run.status || 'completed', 40);
  const itemLines = [];
  const pushList = (label, values = []) => {
    const list = Array.isArray(values) ? values.map((item) => workflowHandoffClip(item, 260)).filter(Boolean).slice(0, 5) : [];
    if (list.length) itemLines.push(`   ${label}: ${list.join(' / ')}`);
  };
  itemLines.push(`${index + 1}. ${task}${phase ? ` / ${phase}` : ''} (${status})`);
  if (digest.summary) itemLines.push(`   Summary: ${workflowHandoffClip(digest.summary, 500)}`);
  pushList('Facts', digest.facts);
  pushList('Sources', digest.sources);
  pushList('Decisions', digest.decisions);
  pushList('Artifacts', digest.artifacts);
  pushList('Blockers', digest.blockers);
  pushList('Next inputs', digest.nextInputs);
  pushList('Channel requirements', digest.channelRequirements);
  pushList('Evidence gaps', digest.evidenceGaps);
  if (digest.sourceStatus) itemLines.push(`   Source status: ${workflowHandoffClip(digest.sourceStatus, 360)}`);
  if (digest.approvalBoundary) itemLines.push(`   Approval boundary: ${workflowHandoffClip(digest.approvalBoundary, 320)}`);
  return itemLines.join('\n');
}

function workflowStructuredDigestPromptBlock(priorRuns = []) {
  const runs = Array.isArray(priorRuns)
    ? priorRuns.filter((run) => run && typeof run === 'object').slice(0, 10)
    : [];
  if (!runs.length) return '';
  return [
    'SUPPORTING FACT INDEX (internal aid; do not copy these labels into the user delivery):',
    ...runs.map((run, index) => workflowStructuredDigestPromptLines(run, index))
  ].filter(Boolean).join('\n');
}

function workflowHandoffPromptDataFromRun(run = {}, index = 0, options = {}) {
  const task = workflowHandoffClip(run.taskType || run.workflowTask || `prior_${index + 1}`, 90);
  const status = workflowHandoffClip(run.status || 'completed', 40);
  const lines = [`${index + 1}. USER-FACING PRIOR DELIVERABLE: ${task} (${status})`];
  const structuredDigest = workflowStructuredDigestPromptLines(run, index);
  if (structuredDigest) lines.push(`   Supporting fact index (internal aid; do not copy labels):\n${structuredDigest}`);
  const jobId = workflowHandoffClip(run.jobId || '', 120);
  if (jobId) lines.push(`   Job ID: ${jobId}`);
  const summary = workflowHandoffClip(run.summary || run.reportSummary || '', 360);
  if (summary) lines.push(`   Summary: ${summary}`);
  const sources = Array.isArray(run.webSources)
    ? run.webSources
      .map((source) => ({
        title: workflowHandoffClip(source?.title || source?.name || '', 130),
        url: workflowHandoffClip(source?.url || source?.link || source?.query || '', 220),
        snippet: workflowHandoffClip(source?.snippet || source?.description || source?.summary || '', 260)
      }))
      .filter((source) => source.title || source.url || source.snippet)
      .slice(0, 8)
    : [];
  for (const source of sources) {
    lines.push(`   Source: ${[source.title, source.url, source.snippet].filter(Boolean).join(' | ')}`);
  }
  const requiredSignals = Array.isArray(run.requiredUsageSignals)
    ? run.requiredUsageSignals.map((item) => workflowHandoffClip(item, 180)).filter(Boolean).slice(0, 6)
    : workflowHandoffOriginalSignals([run]).map((item) => workflowHandoffClip(item, 180)).filter(Boolean).slice(0, 6);
  if (requiredSignals.length) {
    lines.push(`   Required usage signals: ${requiredSignals.join(' / ')}`);
  }
  const nextAction = workflowHandoffClip(run.nextAction || run.next_action || '', 420);
  if (nextAction) lines.push(`   Next action: ${nextAction}`);
  const files = Array.isArray(run.files)
    ? run.files
      .map((file) => {
        if (typeof file === 'string') return { name: workflowHandoffClip(file, 120), content_available: false };
        return {
          name: workflowHandoffClip(file?.name || 'delivery.md', 120),
          content_available: file?.content_available === true || Boolean(String(file?.content || '').trim())
        };
      })
      .filter((file) => file.name)
      .slice(0, 2)
    : [];
  for (const file of files) {
    lines.push(`   File reference: ${file.name || 'delivery.md'}${file.content_available ? ' (content kept in parent delivery bundle, not injected into this downstream prompt)' : ''}`);
  }
  const deliverableMarkdownExcerpt = options.includeMarkdownExcerpt === true
    ? workflowHandoffBlockClip(run.deliverableMarkdownExcerpt || run.deliverableMarkdown || '', 1600)
    : '';
  if (deliverableMarkdownExcerpt) {
    lines.push(`   User-facing prior Markdown to reuse as source material:\n\`\`\`markdown\n${deliverableMarkdownExcerpt}\n\`\`\``);
  }
  return lines.join('\n');
}

function workflowBrokerWorkflowForJob(job = {}, options = {}) {
  if (!job || typeof job !== 'object') return null;
  if (!job.input || typeof job.input !== 'object' || Array.isArray(job.input)) {
    if (!options.mutable) return null;
    job.input = {};
  }
  if (!job.input._broker || typeof job.input._broker !== 'object' || Array.isArray(job.input._broker)) {
    if (!options.mutable) return null;
    job.input._broker = {};
  }
  if (!job.input._broker.workflow || typeof job.input._broker.workflow !== 'object' || Array.isArray(job.input._broker.workflow)) {
    if (!options.mutable) return null;
    job.input._broker.workflow = {};
  }
  return job.input._broker.workflow;
}

function workflowHandoffOriginalSignals(priorRuns = []) {
  const signals = [];
  const seen = new Set();
  const push = (value = '') => {
    const text = String(value || '').trim();
    if (!text) return;
    const normalized = text.toLowerCase();
    if (seen.has(normalized)) return;
    seen.add(normalized);
    signals.push(text);
  };
  for (const run of Array.isArray(priorRuns) ? priorRuns : []) {
    const webSources = Array.isArray(run?.webSources) ? run.webSources : [];
    for (const signal of workflowSourceSignalStrings(webSources)) push(signal);
    const structuredDigest = run?.structuredDigest && typeof run.structuredDigest === 'object'
      ? run.structuredDigest
      : workflowStructuredHandoffDigestFromRun(run || {});
    for (const source of Array.isArray(structuredDigest?.sources) ? structuredDigest.sources.slice(0, 4) : []) push(String(source || '').slice(0, 180));
    for (const fact of Array.isArray(structuredDigest?.facts) ? structuredDigest.facts.slice(0, 3) : []) push(String(fact || '').slice(0, 160));
    for (const decision of Array.isArray(structuredDigest?.decisions) ? structuredDigest.decisions.slice(0, 2) : []) push(String(decision || '').slice(0, 160));
    for (const artifact of Array.isArray(structuredDigest?.artifacts) ? structuredDigest.artifacts.slice(0, 2) : []) push(String(artifact || '').slice(0, 160));
    for (const requirement of Array.isArray(structuredDigest?.channelRequirements) ? structuredDigest.channelRequirements.slice(0, 4) : []) push(String(requirement || '').slice(0, 200));
    for (const gap of Array.isArray(structuredDigest?.evidenceGaps) ? structuredDigest.evidenceGaps.slice(0, 3) : []) push(String(gap || '').slice(0, 180));
    push(String(structuredDigest?.approvalBoundary || '').slice(0, 180));
    push(String(run?.summary || '').slice(0, 160));
    for (const bullet of Array.isArray(run?.bullets) ? run.bullets.slice(0, 3) : []) push(String(bullet || '').slice(0, 120));
  }
  return signals.slice(0, 24);
}

function workflowAppContextOriginalSignals(job = {}) {
  const broker = job?.input?._broker && typeof job.input._broker === 'object' ? job.input._broker : {};
  const appContexts = Array.isArray(broker.appContexts) ? broker.appContexts : [];
  const signals = [];
  const seen = new Set();
  const push = (value = '') => {
    const text = String(value || '').trim();
    if (!text) return;
    const normalized = text.toLowerCase();
    if (seen.has(normalized)) return;
    seen.add(normalized);
    signals.push(text);
  };
  for (const context of appContexts.slice(0, 4)) {
    push(context.title);
    push(context.summary);
    for (const fact of Array.isArray(context.facts) ? context.facts.slice(0, 12) : []) push(fact);
    for (const metric of Array.isArray(context.metrics) ? context.metrics.slice(0, 8) : []) {
      if (typeof metric === 'string') push(metric);
      else if (metric && typeof metric === 'object') push([metric.label || metric.name, metric.value].filter(Boolean).join(': '));
    }
  }
  return signals.slice(0, 24);
}

function workflowTextUsesSignals(text = '', signals = []) {
  const normalizedText = String(text || '').toLowerCase();
  const matches = [];
  for (const signal of Array.isArray(signals) ? signals : []) {
    const normalizedSignal = String(signal || '').trim().toLowerCase();
    if (!normalizedSignal || normalizedSignal.length < 6) continue;
    if (normalizedText.includes(normalizedSignal)) matches.push(signal);
  }
  return {
    used: matches.length > 0,
    matches: matches.slice(0, 8)
  };
}

function workflowResearchHandoffRuns(priorRuns = []) {
  return (Array.isArray(priorRuns) ? priorRuns : []).filter((run) => {
    const task = String(run?.taskType || run?.workflowTask || '').toLowerCase();
    const phase = String(run?.sequencePhase || run?.phase || run?.workflowPhase || '').toLowerCase();
    const hasSearchSources = Array.isArray(run?.webSources) && run.webSources.length > 0;
    return phase === 'research'
      || hasSearchSources
      || ['research', 'teardown', 'competitor_teardown', 'data_analysis', 'list_creator', 'validation', 'diligence'].includes(task);
  });
}

function workflowExecutionNeedsMultipleInputs(phase = '') {
  return ['preparation', 'action', 'implementation'].includes(String(phase || '').toLowerCase());
}

function workflowCreativeOrActionArtifactPresent(text = '') {
  return /(post draft|exact post|subject line|email body|headline|hero|cta|copy|page structure|listing copy|message sequence|reply hooks|payload|action packet|approval packet|field map|status tracker|checklist|draft|publish|send|submit|creative|artifact|投稿案|本文|コピー|件名|見出し|実行パケット|承認パケット|送信|投稿|掲載|提出|チェックリスト)/i
    .test(String(text || ''));
}

function workflowOriginalInfoQualityReview(parent = {}, child = {}) {
  const taskType = workflowTaskName(child);
  if (!taskType || isWorkflowLeaderTask(taskType)) {
    return { applicable: false, passed: true, scope: 'not_applicable', issues: [] };
  }
  const primaryTask = workflowPrimaryTask(parent);
  const phase = workflowSequencePhaseForJob(child);
  const report = child?.output?.report && typeof child.output.report === 'object' ? child.output.report : {};
  const outputText = workflowOutputTextForQuality(child);
  const searchSources = workflowSearchSourcesFromReport(report);
  const searchSignals = workflowSourceSignalStrings(searchSources);
  const searchSignalMatch = workflowTextUsesSignals(outputText, searchSignals);
  const priorRuns = Array.isArray(child?.input?._broker?.workflow?.leaderHandoff?.priorRuns)
    ? child.input._broker.workflow.leaderHandoff.priorRuns
    : [];
  const handoffSignals = workflowHandoffOriginalSignals(priorRuns);
  const handoffSignalMatch = workflowTextUsesSignals(outputText, handoffSignals);
  const researchPriorRuns = workflowResearchHandoffRuns(priorRuns);
  const researchHandoffSignals = workflowHandoffOriginalSignals(researchPriorRuns);
  const researchHandoffSignalMatch = workflowTextUsesSignals(outputText, researchHandoffSignals);
  const requiresSearchEvidence = child?.input?._broker?.workflow?.forceWebSearch === true
    || (phase === 'research' && leaderTaskUsesWebSearch(primaryTask, taskType));
  const issues = [];
  if (requiresSearchEvidence) {
    if (!searchSources.length) issues.push('missing_search_execution');
    if (searchSources.length && !workflowSearchSourcesHaveExecutionProof(searchSources)) issues.push('missing_search_execution');
    if (searchSources.length && workflowSearchSourcesHaveExecutionProof(searchSources) && !searchSignalMatch.used) issues.push('missing_search_content_in_output');
    return {
      applicable: true,
      passed: issues.length === 0,
      scope: 'research_original_info',
      taskType,
      phase,
      searched: workflowSearchSourcesHaveExecutionProof(searchSources),
      usedOriginalInfo: searchSignalMatch.used,
      matchedSignals: searchSignalMatch.matches,
      sourceCount: searchSources.length,
      issues
    };
  }
  if (phase === 'planning') {
    if (!researchPriorRuns.length || !researchHandoffSignals.length) issues.push('missing_research_handoff_for_planning');
    if (researchHandoffSignals.length && !researchHandoffSignalMatch.used) {
      issues.push('planning_ignored_research_handoff');
      issues.push('missing_handoff_original_info_usage');
    }
    return {
      applicable: true,
      passed: issues.length === 0,
      scope: 'planning_research_handoff',
      taskType,
      phase,
      searched: null,
      usedOriginalInfo: researchHandoffSignalMatch.used,
      matchedSignals: researchHandoffSignalMatch.matches,
      sourceCount: researchHandoffSignals.length,
      issues
    };
  }
  if (workflowExecutionNeedsMultipleInputs(phase)) {
    const distinctMatches = handoffSignalMatch.matches.length;
    if (priorRuns.length < 2 || handoffSignals.length < 2) issues.push('missing_multiple_handoff_inputs_for_execution');
    if (handoffSignals.length >= 2 && distinctMatches < 2) {
      issues.push('execution_output_not_based_on_multiple_inputs');
      if (distinctMatches === 0) issues.push('missing_handoff_original_info_usage');
    }
    if (!workflowCreativeOrActionArtifactPresent(outputText)) issues.push('missing_execution_artifact');
    return {
      applicable: true,
      passed: issues.length === 0,
      scope: 'execution_multi_source_handoff',
      taskType,
      phase,
      searched: null,
      usedOriginalInfo: distinctMatches >= 2,
      matchedSignals: handoffSignalMatch.matches,
      sourceCount: handoffSignals.length,
      issues
    };
  }
  if (priorRuns.length && handoffSignals.length) {
    if (!handoffSignalMatch.used) issues.push('missing_handoff_original_info_usage');
    return {
      applicable: true,
      passed: issues.length === 0,
      scope: 'handoff_original_info',
      taskType,
      phase,
      searched: null,
      usedOriginalInfo: handoffSignalMatch.used,
      matchedSignals: handoffSignalMatch.matches,
      sourceCount: handoffSignals.length,
      issues
    };
  }
  return {
    applicable: false,
    passed: true,
    scope: 'not_applicable',
    taskType,
    phase,
    issues: []
  };
}

function workflowLeaderOutputQualityReview(parent = {}, leaderJob = {}) {
  const taskType = workflowTaskName(leaderJob);
  const phase = workflowSequencePhaseForJob(leaderJob);
  if (!taskType || !isWorkflowLeaderTask(taskType) || !['checkpoint', 'final_summary'].includes(phase)) {
    return { applicable: false, passed: true, scope: 'not_applicable', issues: [] };
  }
  const workflow = leaderJob?.input?._broker?.workflow && typeof leaderJob.input._broker.workflow === 'object'
    ? leaderJob.input._broker.workflow
    : {};
  const hasLeaderHandoff = Boolean(workflow.leaderHandoff && typeof workflow.leaderHandoff === 'object');
  const priorRuns = Array.isArray(workflow.leaderHandoff?.priorRuns)
    ? workflow.leaderHandoff.priorRuns
    : [];
  const unavailablePriorRuns = Array.isArray(workflow.leaderHandoff?.unavailablePriorRuns)
    ? workflow.leaderHandoff.unavailablePriorRuns
    : [];
  if (!hasLeaderHandoff && !priorRuns.length) {
    return { applicable: false, passed: true, scope: 'not_applicable', issues: [] };
  }
  if (!priorRuns.length && unavailablePriorRuns.length && unavailablePriorRuns.every(workflowUnavailablePriorRunIsOptional)) {
    return {
      applicable: true,
      passed: true,
      scope: 'leader_handoff_usage',
      taskType,
      phase,
      usedOriginalInfo: true,
      matchedSignals: [],
      sourceCount: 0,
      priorRunCount: 0,
      unavailablePriorRunCount: unavailablePriorRuns.length,
      skippedUnavailablePriorLayer: true,
      issues: []
    };
  }
  if (!priorRuns.length && workflowLeaderPriorLayerOptionalOnly(parent, leaderJob)) {
    return {
      applicable: true,
      passed: true,
      scope: 'leader_handoff_usage',
      taskType,
      phase,
      usedOriginalInfo: true,
      matchedSignals: [],
      sourceCount: 0,
      priorRunCount: 0,
      unavailablePriorRunCount: 1,
      skippedUnavailablePriorLayer: true,
      issues: []
    };
  }
  if (!priorRuns.length && (unavailablePriorRuns.length || workflowLeaderPriorLayerUnavailable(parent, leaderJob))) {
    return {
      applicable: true,
      passed: false,
      scope: 'leader_handoff_usage',
      taskType,
      phase,
      usedOriginalInfo: false,
      matchedSignals: [],
      sourceCount: 0,
      priorRunCount: 0,
      unavailablePriorRunCount: unavailablePriorRuns.length || 1,
      skippedUnavailablePriorLayer: false,
      issues: ['prior_layer_unavailable']
    };
  }
  const handoffSignals = workflowHandoffOriginalSignals(priorRuns);
  const outputText = workflowOutputText(leaderJob);
  const appContextSignals = workflowAppContextOriginalSignals(leaderJob);
  const appContextSignalMatch = workflowTextUsesSignals(outputText, appContextSignals);
  const signalMatch = workflowTextUsesSignals(outputText, handoffSignals);
  const issues = [];
  if (!priorRuns.length && appContextSignalMatch.used) {
    return {
      applicable: true,
      passed: true,
      scope: 'leader_handoff_usage',
      taskType,
      phase,
      usedOriginalInfo: true,
      matchedSignals: appContextSignalMatch.matches,
      sourceCount: appContextSignals.length,
      priorRunCount: 0,
      appContextSourceCount: appContextSignals.length,
      unavailablePriorRunCount: unavailablePriorRuns.length,
      issues: []
    };
  }
  if (!priorRuns.length) issues.push('missing_leader_handoff_prior_runs');
  if (handoffSignals.length && !signalMatch.used) issues.push('leader_ignored_handoff_prior_runs');
  if (
    priorRuns.length
    && !/(supporting work products|specialist|completed|prior|handoff|synthesis|evidence|action|approval|補助成果物|specialist成果物|完了済み|統合|実行|承認)/i.test(outputText)
  ) {
    issues.push('missing_leader_synthesis_summary');
  }
  return {
    applicable: true,
    passed: issues.length === 0,
    scope: 'leader_handoff_usage',
    taskType,
    phase,
    usedOriginalInfo: signalMatch.used,
    matchedSignals: signalMatch.matches,
    sourceCount: handoffSignals.length,
    priorRunCount: priorRuns.length,
    issues
  };
}

function workflowApplyQualityReviewToChild(child = {}, review = null) {
  if (!child || !review || typeof review !== 'object') return;
  child.qualityGate = {
    applicable: review.applicable === true,
    passed: review.passed !== false,
    scope: review.scope || 'not_applicable',
    issues: Array.isArray(review.issues) ? review.issues.slice(0, 6) : [],
    matchedSignals: Array.isArray(review.matchedSignals) ? review.matchedSignals.slice(0, 6) : [],
    sourceCount: Number(review.sourceCount || 0) || 0,
    checkedAt: nowIso()
  };
}

function workflowApplyQualityReviewToLeader(leaderJob = {}, review = null) {
  if (!leaderJob || !review || typeof review !== 'object') return;
  const previousGate = leaderJob.qualityGate && typeof leaderJob.qualityGate === 'object'
    ? leaderJob.qualityGate
    : null;
  const layerReview = previousGate
    ? (previousGate.type === 'leader_output'
      ? (previousGate.layerReview && typeof previousGate.layerReview === 'object' ? previousGate.layerReview : null)
      : {
          applicableCount: Number(previousGate.applicableCount || 0) || 0,
          failedCount: Number(previousGate.failedCount || 0) || 0,
          passed: previousGate.passed !== false,
          summary: String(previousGate.summary || '').slice(0, 500),
          reviews: Array.isArray(previousGate.reviews) ? previousGate.reviews.slice(0, 12) : []
        })
    : null;
  leaderJob.qualityGate = {
    applicable: review.applicable === true,
    passed: review.passed !== false,
    scope: review.scope || 'not_applicable',
    type: 'leader_output',
    issues: Array.isArray(review.issues) ? review.issues.slice(0, 6) : [],
    matchedSignals: Array.isArray(review.matchedSignals) ? review.matchedSignals.slice(0, 6) : [],
    sourceCount: Number(review.sourceCount || 0) || 0,
    priorRunCount: Number(review.priorRunCount || 0) || 0,
    checkedAt: nowIso(),
    ...(layerReview ? { layerReview } : {})
  };
}

function workflowLeaderQualityGateFailed(parent = {}, leaderJob = {}, scope = 'leader_checkpoint') {
  const review = workflowLeaderOutputQualityReview(parent, leaderJob);
  if (review?.applicable) workflowApplyQualityReviewToLeader(leaderJob, review);
  return review?.applicable && review.passed === false ? review : null;
}

function workflowLayerQualityGate(parent = {}, children = [], options = {}) {
  const includeAllCompleted = options.includeAllCompleted === true;
  const layer = includeAllCompleted ? null : Math.max(1, Number(options.layer || 1) || 1);
  const candidates = sortWorkflowChildren(parent, children)
    .filter((child) => child.status === 'completed')
    .filter((child) => !isWorkflowLeaderTask(workflowTaskName(child)))
    .filter((child) => !workflowChildIsLeaderReplanDeferred(child))
    .filter((child) => includeAllCompleted || workflowDispatchLayer(parent, child) === layer);
  const reviews = candidates.map((child) => ({
    child,
    review: workflowOriginalInfoQualityReview(parent, child)
  }));
  for (const item of reviews) workflowApplyQualityReviewToChild(item.child, item.review);
  const applicable = reviews.filter((item) => item.review?.applicable);
  const failed = applicable.filter((item) => item.review?.passed === false);
  const summary = failed.length
    ? failed.map((item) => `${workflowTaskName(item.child)}:${(item.review.issues || []).join('+')}`).join(', ')
    : '';
  return {
    applicableCount: applicable.length,
    failedCount: failed.length,
    passed: failed.length === 0,
    summary,
    reviews: applicable.map((item) => ({
      jobId: item.child.id,
      taskType: workflowTaskName(item.child),
      ...item.review
    }))
  };
}

function appendWorkflowOriginalInfoUsage(job = {}) {
  return;
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

function workflowPrimaryTask(parent = {}) {
  const plannedTasks = Array.isArray(parent.workflow?.plannedTasks) ? parent.workflow.plannedTasks : [];
  return String(plannedTasks[0] || parent.taskType || '').trim().toLowerCase();
}

function workflowDispatchLayer(parent = {}, child = {}) {
  const task = workflowTaskName(child);
  if (isWorkflowLeaderTask(task)) return 0;
  const brokerWorkflow = child?.input?._broker?.workflow && typeof child.input._broker.workflow === 'object'
    ? child.input._broker.workflow
    : {};
  const explicitLayer = Number(
    brokerWorkflow.dispatchLayer
    || brokerWorkflow.dispatch_layer
    || child?.dispatchLayer
    || child?.dispatch_layer
    || child?.layer
    || child?.layerNumber
    || child?.layer_number
    || 0
  ) || 0;
  if (explicitLayer > 0) return explicitLayer;
  const primary = workflowPrimaryTask(parent);
  return leaderTaskLayer(primary, task) || 1;
}

function workflowSequencePhaseForTask(primaryTask = '', taskType = '', layer = null) {
  const task = String(taskType || '').trim().toLowerCase();
  if (isWorkflowLeaderTask(task)) return 'initial';
  const phase = leaderTaskPhase(primaryTask, task);
  if (phase) return phase;
  const resolvedLayer = Number(layer || leaderTaskLayer(primaryTask, task) || 1);
  if (resolvedLayer <= 1) return 'research';
  if (resolvedLayer === 2) return 'planning';
  if (resolvedLayer === 3) return 'preparation';
  return 'action';
}

function workflowLayerLabel(primaryTask = '', layer = 1) {
  const primary = String(primaryTask || '').trim().toLowerCase();
  const layerNumber = Number(layer || 1) || 1;
  const profile = leaderOrchestrationProfile(primary);
  const layerProfile = (profile?.layers || []).find((item) => Number(item?.number || 0) === layerNumber);
  if (layerProfile) {
    return String(layerProfile.phase || layerProfile.name || `layer_${layerNumber}`).trim() || `layer_${layerNumber}`;
  }
  const profilePhase = ['research', 'planning', 'preparation', 'action', 'summary'][Math.max(1, layerNumber) - 1] || `layer_${layerNumber}`;
  if (layerNumber <= 1) return 'research';
  if (layerNumber === 2) return 'execution';
  return profilePhase;
}

function workflowLayerRequiresUserApprovalBeforeRelease(primaryTask = '', beforeLayer = 1, assignments = []) {
  return false;
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

async function pauseWorkflowChildDispatchForParentAuthority(storage, childJob = {}, options = {}) {
  const jobId = String(childJob?.id || options.jobId || '').trim();
  const agentId = String(childJob?.assignedAgentId || options.agentId || '').trim();
  const parentId = String(childJob?.workflowParentId || options.parentJobId || '').trim();
  if (!jobId || !parentId) return { paused: false, reason: 'job_or_parent_missing' };
  let parent = null;
  if (typeof storage.getJobById === 'function') parent = await storage.getJobById(parentId);
  if (!parent && typeof storage.getState === 'function') {
    const state = await storage.getState();
    parent = (Array.isArray(state?.jobs) ? state.jobs : []).find((item) => item.id === parentId) || null;
  }
  const authorityRequest = workflowParentAuthorityRequest(parent);
  if (!authorityRequest) return { paused: false, reason: 'parent_not_waiting_for_authority' };
  const pauseReason = authorityBlockReasonFromRequest(authorityRequest, 'Parent workflow is waiting for connector approval.');
  const pauseDispatch = (draft) => {
    const draftJob = Array.isArray(draft?.jobs) ? draft.jobs.find((item) => item.id === jobId) : null;
    if (!draftJob || isTerminalJobStatus(draftJob.status)) return null;
    if (String(draftJob.workflowParentId || '') !== parentId) return null;
    const at = nowIso();
    const logLine = `paused retry while parent waits for authority approval: ${pauseReason}`;
    draftJob.status = 'queued';
    draftJob.claimedAt = null;
    draftJob.dispatchedAt = null;
    draftJob.startedAt = null;
    draftJob.completedAt = null;
    draftJob.failedAt = null;
    draftJob.timedOutAt = null;
    draftJob.failureReason = null;
    draftJob.failureCategory = null;
    draftJob.dispatch = {
      ...(draftJob.dispatch || {}),
      completionStatus: 'approval_waiting_retry_paused',
      retryable: false,
      nextRetryAt: null,
      approvalPausedAt: at,
      approvalPauseReason: pauseReason
    };
    draftJob.logs = (draftJob.logs || []).includes(logLine)
      ? (draftJob.logs || [])
      : [...(draftJob.logs || []), logLine];
    return cloneJob(draftJob);
  };
  const paused = typeof storage.mutateJobAndAgent === 'function' && agentId
    ? await storage.mutateJobAndAgent(jobId, agentId, pauseDispatch)
    : await storage.mutate(pauseDispatch);
  if (!paused) return { paused: false, reason: 'pause_rejected', request: authorityRequest };
  return { paused: true, job: paused, parent, request: authorityRequest };
}

async function pauseTerminalWorkflowChildRetryForParentAuthority(storage, childJob = {}, options = {}) {
  const jobId = String(childJob?.id || options.jobId || '').trim();
  const agentId = String(childJob?.assignedAgentId || options.agentId || '').trim();
  const parentId = String(childJob?.workflowParentId || options.parentJobId || '').trim();
  if (!jobId || !parentId) return { paused: false, reason: 'job_or_parent_missing' };
  let parent = null;
  if (typeof storage.getJobById === 'function') parent = await storage.getJobById(parentId);
  if (!parent && typeof storage.getState === 'function') {
    const state = await storage.getState();
    parent = (Array.isArray(state?.jobs) ? state.jobs : []).find((item) => item.id === parentId) || null;
  }
  const authorityRequest = workflowParentAuthorityRequest(parent);
  if (!authorityRequest) return { paused: false, reason: 'parent_not_waiting_for_authority' };
  const pauseReason = authorityBlockReasonFromRequest(authorityRequest, 'Parent workflow is waiting for connector approval.');
  const pauseRetry = (draft) => {
    const draftJob = Array.isArray(draft?.jobs) ? draft.jobs.find((item) => item.id === jobId) : null;
    if (!draftJob) return null;
    if (String(draftJob.workflowParentId || '') !== parentId) return null;
    const status = String(draftJob.status || '').trim().toLowerCase();
    if (!['failed', 'timed_out'].includes(status)) return null;
    if (draftJob.dispatch?.retryable !== true) return null;
    const at = nowIso();
    const logLine = `paused terminal retry while parent waits for authority approval: ${pauseReason}`;
    draftJob.dispatch = {
      ...(draftJob.dispatch || {}),
      completionStatus: 'approval_waiting_retry_paused',
      retryable: false,
      nextRetryAt: null,
      approvalPausedAt: at,
      approvalPauseReason: pauseReason,
      retryPausedFromStatus: status
    };
    draftJob.logs = (draftJob.logs || []).includes(logLine)
      ? (draftJob.logs || [])
      : [...(draftJob.logs || []), logLine];
    return cloneJob(draftJob);
  };
  const paused = typeof storage.mutateJobAndAgent === 'function' && agentId
    ? await storage.mutateJobAndAgent(jobId, agentId, pauseRetry)
    : await storage.mutate(pauseRetry);
  if (!paused) return { paused: false, reason: 'pause_rejected', request: authorityRequest };
  const mutateParent = typeof storage.mutateWorkflow === 'function'
    ? (mutator) => storage.mutateWorkflow(parentId, mutator)
    : (mutator) => storage.mutate(mutator);
  const blockedParent = await mutateParent(async (draft) => {
    const draftParent = Array.isArray(draft?.jobs)
      ? draft.jobs.find((item) => item.id === parentId && item.jobKind === 'workflow')
      : null;
    if (!draftParent) return null;
    const children = Array.isArray(draft?.jobs)
      ? sortWorkflowChildren(draftParent, draft.jobs.filter((item) => item.workflowParentId === parentId))
      : [];
    draftParent.output = draftParent.output || buildAgentTeamDeliveryOutput(draftParent, children);
    markJobBlockedForAuthority(draftParent, authorityRequest, pauseReason);
    draftParent.logs = [
      ...(draftParent.logs || []),
      `workflow retry paused while waiting for authority approval: ${pauseReason}`
    ];
    return cloneJob(draftParent);
  });
  return { paused: true, job: paused, parent: blockedParent || parent, request: authorityRequest };
}

async function completeJobFromAgentResult(storage, jobId, agentId, payload = {}, meta = {}) {
  const mutateComplete = async (state) => {
    const job = state.jobs.find((item) => item.id === jobId);
    if (!job) return { error: 'Job not found', statusCode: 404 };
    if (isTerminalJobStatus(job.status)) {
      return { error: `Job is already terminal (${job.status})`, statusCode: 409, code: 'job_already_terminal', job };
    }
    if (meta.source === 'callback' && !canTransitionJob(job, 'callback')) {
      return { error: `Job status ${job.status} cannot be changed by callback`, statusCode: 409, code: transitionErrorCode(job, 'callback'), job };
    }
    if (meta.source === 'manual-result' && !canTransitionJob(job, 'manualResult')) {
      return { error: `Job status ${job.status} cannot be changed by manual result`, statusCode: 409, code: transitionErrorCode(job, 'manualResult'), job };
    }
    const agent = state.agents.find((item) => item.id === agentId);
    if (!agent) return { error: 'Agent not found', statusCode: 404 };
    if (!isAgentVerified(agent)) return { error: 'Agent is not verified', statusCode: 403 };
    if (job.assignedAgentId && job.assignedAgentId !== agent.id) return { error: 'Invalid assignment', statusCode: 401 };
    const completionAt = nowIso();
    const outputReport = normalizeAgentReportPayload(
      payload,
      topLevelAgentReportCandidate(payload)
    );
    const explicitAuthorityRequest = authorityRequestFromReport(outputReport);
    const usage = usageWithObservedJobTokens(job, payload?.usage, outputReport);
    const payloadFileMarkdown = deliveryPayloadValueToText(
      payload.file_markdown
      || payload.markdown
      || payload.deliverableMarkdown
      || payload.deliverable_markdown
      || outputReport.file_markdown
      || outputReport.markdown
      || outputReport.deliverableMarkdown
      || outputReport.deliverable_markdown
      || ''
    ).trim();
    const payloadFiles = Array.isArray(payload.files)
      ? normalizeDeliveryPayloadFiles(payload.files, workflowTaskName(job) || job.taskType || 'delivery')
      : (payloadFileMarkdown ? [{ name: `${String(workflowTaskName(job) || job.taskType || 'delivery').slice(0, 80)}.md`, content: payloadFileMarkdown }] : []);
    let targetStatus = isBlockedAgentResultStatus(meta.targetStatus || payload.status) ? 'blocked' : 'completed';
    job.assignedAgentId = agent.id;
    job.startedAt = job.startedAt || completionAt;
    job.lastCallbackAt = meta.source === 'callback' ? completionAt : (job.lastCallbackAt || null);
    job.output = {
      report: outputReport,
      files: payloadFiles,
      returnTargets: payload.return_targets || payload.returnTargets || ['chat', 'api', 'webhook']
    };
    appendWorkflowOriginalInfoUsage(job);
    const sourceProofFailure = targetStatus === 'completed' ? workflowSearchCompletionFailureReason(job, outputReport) : '';
    if (sourceProofFailure) {
      const sourceRetryMeta = sourceCollectionFailureRetryMeta(meta.env || {}, job, { alreadyAttempted: true });
      const restartRequired = workflowChildDispatchFailureRequiresRestart(meta.env || {}, job, {
        category: 'missing_required_sources',
        ...sourceRetryMeta
      });
      targetStatus = 'failed';
      job.status = 'failed';
      job.completedAt = null;
      job.failedAt = completionAt;
      job.timedOutAt = null;
      job.failureReason = restartRequired ? workflowRestartRequiredReason(job, sourceProofFailure) : sourceProofFailure;
      job.failureCategory = restartRequired ? 'workflow_restart_required' : 'missing_required_sources';
      job.usage = usage;
      job.actualBilling = null;
      clearDeliveryCompletionGate(job);
      if (job.billingReservation && !job.billingSettlement?.settledAt && !job.billingReservation?.releasedAt) {
        releaseBillingReservationInState(state, job);
      }
      job.dispatch = {
        ...(job.dispatch || {}),
        externalJobId: meta.externalJobId || job.dispatch?.externalJobId || null,
        completionSource: meta.source || job.dispatch?.completionSource || null,
        completionStatus: restartRequired ? 'workflow_restart_required' : 'failed',
        completedAt: null,
        lastCallbackAt: meta.source === 'callback' ? completionAt : (job.dispatch?.lastCallbackAt || null),
        retryable: restartRequired ? false : sourceRetryMeta.retryable,
        nextRetryAt: restartRequired ? null : sourceRetryMeta.nextRetryAt,
        attempts: restartRequired ? providerRunAttempts(job) : sourceRetryMeta.attempts,
        maxRetries: sourceRetryMeta.maxRetries,
        restartRequired
      };
      job.logs = [...(job.logs || []), sourceProofFailure, restartRequired ? 'full order retry required after missing search execution proof' : 'failed before completion: missing search execution proof'];
      if (meta.source) job.logs.push(`completion source=${meta.source}`);
      return { ok: true, mode: 'failed', job: cloneJob(job), billing: null, workflowParentId: job.workflowParentId || null };
    }
    const completionFailure = targetStatus === 'completed' ? agentCompletionFailureReason(job) : '';
    if (completionFailure) {
      markAgentCompletionFailedFreeInState(state, job, completionFailure, meta.env || {}, { failedAt: completionAt });
      if (meta.source) job.logs.push(`completion source=${meta.source}`);
      return { ok: true, mode: 'failed', job: cloneJob(job), billing: null, workflowParentId: job.workflowParentId || null };
    }
    const authorityRequest = syncJobAuthorityRequest(job, agent);
    if (targetStatus === 'completed' && shouldBlockCompletedJobForAuthorityRequest(job, authorityRequest || explicitAuthorityRequest)) {
      targetStatus = 'blocked';
    }
    const billing = targetStatus === 'completed' ? estimateBilling(agent, usage) : null;
    job.status = targetStatus;
    job.completedAt = targetStatus === 'completed' ? completionAt : null;
    job.failedAt = null;
    job.timedOutAt = null;
    job.failureReason = targetStatus === 'blocked'
      ? authorityBlockReasonFromRequest(authorityRequest || explicitAuthorityRequest, 'Agent is blocked pending approval or connector setup.')
      : null;
    job.failureCategory = targetStatus === 'blocked' ? 'blocked_waiting_for_approval' : null;
    job.usage = usage;
    job.actualBilling = billing;
    if (targetStatus === 'completed') {
      setDeliveryCompletionGate(job, completionAt);
    } else {
      clearDeliveryCompletionGate(job);
    }
    job.dispatch = {
      ...(job.dispatch || {}),
      externalJobId: meta.externalJobId || job.dispatch?.externalJobId || null,
      completionSource: meta.source || job.dispatch?.completionSource || null,
      completionStatus: targetStatus === 'blocked' ? 'blocked_waiting_for_approval' : targetStatus,
      completedAt: targetStatus === 'completed' ? completionAt : null,
      lastCallbackAt: meta.source === 'callback' ? completionAt : (job.dispatch?.lastCallbackAt || null),
      retryable: false,
      nextRetryAt: null
    };
    job.logs = [...(job.logs || []), `${targetStatus} by ${agent.id}`];
    if (targetStatus === 'blocked') job.logs.push(`blocked waiting for authority approval: ${job.failureReason}`);
    if (billing) job.logs.push(billingLogLine(job, billing));
    if (meta.source) job.logs.push(`completion source=${meta.source}`);
    if (meta.externalJobId) job.logs.push(`external_job_id=${meta.externalJobId}`);
    if (billing) settleAgentEarnings(job, agent, billing);
    return { ok: true, mode: targetStatus, job: cloneJob(job), billing, workflowParentId: job.workflowParentId || null };
  };
  const result = typeof storage.mutateJobAndAgent === 'function'
    ? await storage.mutateJobAndAgent(jobId, agentId, mutateComplete)
    : await storage.mutate(mutateComplete);
  if (result?.ok && result.workflowParentId) await reconcileWorkflowParent(storage, result.workflowParentId);
  return result;
}

async function failJob(storage, jobId, reason, extraLogs = [], options = {}) {
  const failureReason = String(reason || options.failureReason || 'Job failed without a detailed reason.').trim();
  const result = await storage.mutate(async (state) => {
    const job = state.jobs.find((item) => item.id === jobId);
    if (!job) return null;
    if (isTerminalJobStatus(job.status) && !options.force) return cloneJob(job);
    const failedAt = nowIso();
    const failureStatus = options.failureStatus || (job.status === 'dispatched' ? 'timed_out' : 'failed');
    job.status = failureStatus;
    job.failedAt = failedAt;
    job.failureReason = failureReason;
    job.failureCategory = options.failureCategory || job.failureCategory || 'agent_failed';
    if (job.billingReservation && !job.billingSettlement?.settledAt && !job.billingReservation?.releasedAt) {
      releaseBillingReservationInState(state, job);
    }
    if (failureStatus === 'timed_out') job.timedOutAt = failedAt;
    job.lastCallbackAt = options.source === 'callback' ? failedAt : (job.lastCallbackAt || null);
    job.dispatch = {
      ...(job.dispatch || {}),
      externalJobId: options.externalJobId || job.dispatch?.externalJobId || null,
      completionSource: options.source || job.dispatch?.completionSource || null,
      completionStatus: options.completionStatus || (options.restartRequired ? 'workflow_restart_required' : failureStatus),
      failedAt,
      lastCallbackAt: options.source === 'callback' ? failedAt : (job.dispatch?.lastCallbackAt || null),
      retryable: options.retryable ?? job.dispatch?.retryable ?? false,
      nextRetryAt: options.nextRetryAt ?? job.dispatch?.nextRetryAt ?? null,
      attempts: options.attempts ?? job.dispatch?.attempts ?? 0,
      maxRetries: options.maxRetries ?? job.dispatch?.maxRetries,
      restartRequired: options.restartRequired ?? job.dispatch?.restartRequired ?? false
    };
    job.logs = [...(job.logs || []), ...extraLogs, failureReason];
    return { ...cloneJob(job), workflowParentId: job.workflowParentId || null };
  });
  if (result?.workflowParentId) await reconcileWorkflowParent(storage, result.workflowParentId);
  if (!result) return null;
  const { workflowParentId, ...job } = result;
  return job;
}



function jobRequesterMatchesCurrent(job = {}, current = {}) {
  const requester = job?.input?._broker?.requester && typeof job.input._broker.requester === 'object'
    ? job.input._broker.requester
    : {};
  const currentLogin = String(current?.login || '').trim().toLowerCase();
  const currentAccountId = String(current?.account?.id || current?.user?.accountId || accountIdForLogin(currentLogin)).trim().toLowerCase();
  const requesterLogin = String(requester.login || '').trim().toLowerCase();
  const requesterAccountId = String(requester.accountId || '').trim().toLowerCase();
  if (currentLogin && requesterLogin) return currentLogin === requesterLogin;
  if (currentAccountId && requesterAccountId) return currentAccountId === requesterAccountId;
  return !currentLogin && !requesterLogin;
}

function jobPromptMatchesCreateBody(job = {}, body = {}) {
  const requestedPrompt = String(body?.prompt || '').trim();
  if (!requestedPrompt) return false;
  const candidates = [
    job.prompt,
    job.originalPrompt,
    job.workflow?.objective
  ].map((value) => String(value || '').trim()).filter(Boolean);
  return candidates.some((candidate) => candidate === requestedPrompt);
}

function jobSessionMatchesCreateBody(job = {}, body = {}) {
  const requestedSessionId = String(body?.session_id || body?.sessionId || body?.input?.session_id || body?.input?.sessionId || body?.input?._broker?.chatSessionId || body?.input?._broker?.workflow?.chatSessionId || '').trim();
  if (!requestedSessionId) return true;
  const broker = job?.input?._broker && typeof job.input._broker === 'object' ? job.input._broker : {};
  const workflow = broker.workflow && typeof broker.workflow === 'object' ? broker.workflow : {};
  const jobSessionId = String(job?.input?.session_id || job?.input?.sessionId || broker.chatSessionId || workflow.chatSessionId || '').trim();
  return jobSessionId === requestedSessionId;
}

function normalizeClientOrderId(value = '') {
  const id = String(value || '').trim();
  if (!id || id.length > 96) return '';
  return /^[A-Za-z0-9][A-Za-z0-9_-]{7,95}$/.test(id) ? id : '';
}

function clientOrderIdFromCreateBody(body = {}) {
  const input = body?.input && typeof body.input === 'object' ? body.input : {};
  const broker = input._broker && typeof input._broker === 'object' ? input._broker : {};
  return normalizeClientOrderId(
    body?.client_order_id
    || body?.clientOrderId
    || input.client_order_id
    || input.clientOrderId
    || broker.clientOrderId
    || broker.client_order_id
    || ''
  );
}

function persistedJobForClientOrderId(state = {}, body = {}) {
  const clientOrderId = clientOrderIdFromCreateBody(body);
  if (!clientOrderId) return null;
  const jobs = Array.isArray(state?.jobs) ? state.jobs : [];
  return jobs.find((job) => String(job?.id || '').trim() === clientOrderId) || null;
}

function orderCreateBodyIsSameContentNewOrderRetry(body = {}) {
  const input = body?.input && typeof body.input === 'object' ? body.input : {};
  const broker = input._broker && typeof input._broker === 'object' ? input._broker : {};
  const retry = broker.retry && typeof broker.retry === 'object' ? broker.retry : {};
  const retryMode = String(body.retryMode || body.retry_mode || broker.retryMode || broker.retry_mode || retry.mode || retry.intent || '').trim();
  return retryMode === 'same_content_new_order'
    || retry.continuesOrder === false
    || body.continuesOrder === false
    || body.continues_order === false;
}

function createJobResponseFromPersistedJob(job = {}, options = {}) {
  const isWorkflow = job.jobKind === 'workflow' || Boolean(job.workflow);
  return {
    ok: true,
    idempotent: options.idempotent === true,
    recovered: options.recovered === true,
    code: options.code || (options.recovered ? 'order_create_recovered' : 'order_create_idempotent'),
    warning: options.warning || undefined,
    status: job.status || 'queued',
    mode: isWorkflow ? 'workflow' : (job.status || 'queued'),
    ...(isWorkflow ? { workflow_job_id: job.id } : { job_id: job.id }),
    child_runs: isWorkflow && Array.isArray(job.workflow?.childRuns) ? job.workflow.childRuns : undefined,
    planned_task_types: isWorkflow && Array.isArray(job.workflow?.plannedTasks) ? job.workflow.plannedTasks : undefined,
    dispatch_status: job.dispatch?.completionStatus || job.status || null,
    order_strategy_resolved: isWorkflow ? 'multi' : 'single',
    selection_mode: job.assignmentMode || (isWorkflow ? 'multi' : undefined)
  };
}

function orderCreateSkipIntake(body = {}) {
  const broker = body?.input?._broker && typeof body.input._broker === 'object' ? body.input._broker : {};
  const intake = broker.intake && typeof broker.intake === 'object' ? broker.intake : {};
  return body.skip_intake === true
    || body.skipIntake === true
    || body.intake_answered === true
    || body.intakeAnswered === true
    || intake.answered === true
    || intake.prepared_in_chat === true
    || intake.preparedInChat === true;
}

function orderCreateSkipPrePersistencePlanning(body = {}) {
  return orderCreateSkipIntake(body);
}

function currentFromRecurringOrder(state, order = {}) {
  const login = String(order.ownerLogin || order.owner_login || '').trim();
  const authProvider = String(order.authProvider || order.auth_provider || 'scheduled').trim() || 'scheduled';
  const account = login ? accountSettingsForLogin(state, login, order.user || { login }, authProvider) : null;
  const user = order.user && typeof order.user === 'object'
    ? { ...order.user, login }
    : (accountUserFromSettings(account) || { login, name: login });
  return {
    session: null,
    user,
    login,
    authProvider,
    account,
    apiKeyStatus: 'scheduled',
    apiKey: null
  };
}

function promptPolicyBlockPayload(promptGuard = {}) {
  const policyBlocked = String(promptGuard.code || '').startsWith('stripe_prohibited_');
  return {
    error: policyBlocked ? 'Request blocked by CAIt policy' : 'Prompt injection blocked by CAIt',
    code: policyBlocked ? 'prohibited_category_blocked' : 'prompt_injection_blocked',
    reason: promptGuard.reason,
    reason_code: promptGuard.code
  };
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


async function runRecurringOrderSweep(storage, env, options = {}) {
  const at = options.at || nowIso();
  const state = await storage.getState();
  const due = dueRecurringOrders(state, at, options.limit || 10);
  const results = [];
  const base = normalizeBaseUrl(env?.PRIMARY_BASE_URL || env?.BASE_URL) || 'https://aiagent-marketplace.net';
  const request = options.request || new Request(`${base}/api/recurring-orders/sweep`, { method: 'POST' });
  for (const order of due) {
    const latestState = await storage.getState();
    const fresh = (latestState.recurringOrders || []).find((item) => item.id === order.id) || order;
    const current = currentFromRecurringOrder(latestState, fresh);
    let result;
    const exactConnectorResult = await integrationRoutes.executeScheduledExactConnectorAction(storage, env, fresh, current);
    if (exactConnectorResult) {
      result = exactConnectorResult;
    } else {
      const body = recurringOrderToJobPayload(fresh);
      const promptInjection = promptInjectionGuardForPrompt(body.prompt || '');
      if (promptInjection.blocked) {
        result = {
          ...promptPolicyBlockPayload(promptInjection),
          statusCode: 400
        };
      } else {
        const requestedStrategy = normalizeOrderStrategy(body.order_strategy || body.orderStrategy || 'auto');
        let resolved = resolveOrderStrategy(latestState.agents || [], body, requestedStrategy);
        resolved = await maybeRefineWorkflowPlanWithLeaderLlm(latestState.agents || [], body, resolved, env, { recurring: true });
        result = resolved.error
          ? {
              error: resolved.error,
              code: resolved.code || 'leader_planner_unavailable',
              planner_error: resolved.planner_error || null,
              statusCode: resolved.statusCode || 503,
              status: 'failed'
            }
          : resolved.strategy === 'multi'
            ? await handleCreateWorkflowJob(storage, request, env, current, body, { workflowPlan: resolved.plan, initialState: latestState })
            : await performSingleJobCreate(storage, env, current, body, { request });
        if (!result.error) {
          result.order_strategy_requested = requestedStrategy;
          result.order_strategy_resolved = resolved.strategy;
          result.routing_reason = resolved.reason;
        }
      }
    }
    let updated = null;
    await storage.mutate(async (draft) => {
      updated = markRecurringOrderRunInState(draft, fresh.id, result, { at: nowIso() });
    });
    const summary = {
      recurring_order_id: fresh.id,
      job_id: result.job_id || null,
      workflow_job_id: result.workflow_job_id || null,
      status: result.status || result.mode || (result.error ? 'failed' : 'created'),
      error: result.error || null,
      next_run_at: updated?.nextRunAt || null
    };
    results.push(summary);
    await touchEvent(storage, 'RECURRING', `scheduled work ${fresh.id.slice(0, 12)} run ${summary.status}`, summary);
  }
  return { ok: true, checked_at: at, due_count: due.length, results };
}

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
    if (url.pathname === '/api/settings/billing' && request.method === 'POST') {
      const result = await saveSettingsSection(storage, request, env, 'billing');
      if (result.error) return json({ error: result.error }, result.statusCode || 400);
      return json({ ok: true, account: result.account, monthly_summary: result.monthlySummary, section: 'billing' });
    }
    if (url.pathname === '/api/settings/payout' && request.method === 'POST') {
      const result = await saveSettingsSection(storage, request, env, 'payout');
      if (result.error) return json({ error: result.error }, result.statusCode || 400);
      return json({ ok: true, account: result.account, monthly_summary: result.monthlySummary, section: 'payout' });
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
    if (url.pathname === '/api/stripe/status' && request.method === 'GET') {
      const result = await getStripeStatus(storage, request, env);
      if (result.error) return json({ error: result.error }, result.statusCode || 400);
      return json(result);
    }
    if (url.pathname === '/api/stripe/setup-session' && request.method === 'POST') {
      try {
        const result = await createStripeSetupSessionForCurrent(storage, request, env);
        if (result.error) return json({ error: result.error, code: result.code || null }, result.statusCode || 400);
        return json(result, 201);
      } catch (error) {
        const payload = stripeActionErrorPayload(error);
        return json(payload, payload.statusCode || 500);
      }
    }
    if (url.pathname === '/api/stripe/subscription-session' && request.method === 'POST') {
      try {
        const result = await createStripeSubscriptionSessionForCurrent(storage, request, env);
        if (result.error) return json({ error: result.error, code: result.code || null }, result.statusCode || 400);
        return json(result, 201);
      } catch (error) {
        const payload = stripeActionErrorPayload(error);
        return json(payload, payload.statusCode || 500);
      }
    }
    if (url.pathname === '/api/stripe/connect/onboarding' && request.method === 'POST') {
      try {
        const result = await createStripeConnectOnboardingForCurrent(storage, request, env);
        if (result.error) return json({ error: result.error, code: result.code || null }, result.statusCode || 400);
        return json(result, 201);
      } catch (error) {
        const payload = stripeActionErrorPayload(error);
        return json(payload, payload.statusCode || 500);
      }
    }
    if (url.pathname === '/api/stripe/payout/run' && request.method === 'POST') {
      try {
        const result = await createStripeProviderPayoutForCurrent(storage, request, env);
        if (result.error) {
          return json({
            error: result.error,
            code: result.code || null,
            pending_balance: result.pending_balance ?? null,
            minimum_payout_amount: result.minimum_payout_amount ?? null,
            onboarding_required: result.onboarding_required ?? null,
            identity_verification: result.identity_verification ?? null
          }, result.statusCode || 400);
        }
        return json(result);
      } catch (error) {
        const payload = stripeActionErrorPayload(error);
        return json(payload, payload.statusCode || 500);
      }
    }
    if (url.pathname === '/api/stripe/provider-monthly-charge/run' && request.method === 'POST') {
      try {
        const result = await triggerStripeProviderMonthlyChargeForCurrent(storage, request, env);
        if (result.error) return json({ error: result.error, code: result.code || null, action: result.action || null }, result.statusCode || 400);
        return json(result);
      } catch (error) {
        const payload = stripeActionErrorPayload(error);
        return json(payload, payload.statusCode || 500);
      }
    }
    if (url.pathname === '/api/stripe/monthly-charge/run' && request.method === 'POST') {
      try {
        const result = await triggerStripeMonthlyInvoiceChargeForCurrent(storage, request, env);
        if (result.error) return json({ error: result.error, code: result.code || null, action: result.action || null }, result.statusCode || 400);
        return json(result);
      } catch (error) {
        const payload = stripeActionErrorPayload(error);
        return json(payload, payload.statusCode || 500);
      }
    }
    if (url.pathname === '/api/stripe/webhook' && request.method === 'POST') {
      try {
        const result = await handleStripeWebhook(storage, request, env);
        if (result.error) return json({ error: result.error }, result.statusCode || 400);
        return json(result);
      } catch (error) {
        return json({ error: error.message }, error.statusCode || 500);
      }
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

    if (env.ASSETS) {
      const assetUrl = new URL(request.url);
      const noCacheAssetPaths = new Set([
        '/',
        '/index.html',
        '/admin',
        '/admin.html',
        '/admin.css',
        '/admin.js',
        '/provider-identity.html',
        '/provider-identity.js',
        '/chat.html',
        '/home.css',
        '/chat.css',
        '/chat.js',
        '/apps.html',
        '/apps.js',
        '/analytics-console.html',
        '/analytics-console.js',
        '/publisher-approval.html',
        '/publisher-approval.js',
        '/lead-ops.html',
        '/lead-ops.js',
        '/campaign-operations.html',
        '/campaign-operations.js',
        '/ads-ops.html',
        '/ads-ops.js',
        '/growth-ops.html',
        '/growth-ops.js',
        '/pricing-ops.html',
        '/pricing-ops.js',
        '/delivery-manager.html',
        '/delivery-manager.js',
        '/app-console.css',
        '/cait-app-bridge.js',
        '/app-manifest-registry.js',
        '/login',
        '/login.html',
        '/styles.css',
        '/client.js',
        '/chat-engine.js',
        '/login.js',
        '/analytics-loader.js',
        '/delivery-action-contract.js',
        '/work-action-registry.js',
        '/work-intent-resolver.js'
      ]);
      const isNoCacheAsset = request.method === 'GET' && noCacheAssetPaths.has(assetUrl.pathname);
      const response = await env.ASSETS.fetch(request);
      if (response.status !== 404) {
        return responseWithCookies(
          response,
          [],
          isNoCacheAsset ? { 'cache-control': 'no-cache, max-age=0, must-revalidate' } : {}
        );
      }
    }

    return json({ error: 'Not found' }, 404);
  },
  async queue(batch, env, ctx) {
    const storage = runtimeStorage(env);
    for (const message of batch?.messages || []) {
      try {
        const result = await processWorkflowDispatchQueueMessage(storage, env, message?.body || {});
        if (['already_running_fresh', 'lock_not_persisted'].includes(String(result?.mode || '')) && typeof message?.retry === 'function') {
          message.retry({ delaySeconds: result.retryDelaySeconds || 180 });
        } else if (typeof message?.ack === 'function') {
          message.ack();
        }
      } catch (error) {
        const jobId = String(message?.body?.jobId || message?.body?.job_id || '').trim();
        await touchEvent(storage, 'FAILED', `workflow dispatch queue message failed${jobId ? ` for ${jobId.slice(0, 6)}` : ''}: ${String(error?.message || error).slice(0, 160)}`);
        if (jobId) {
          await failJob(storage, jobId, `Workflow dispatch queue message failed: ${String(error?.message || error).slice(0, 260)}`, ['queue consumer exception before durable completion'], {
            failureStatus: 'failed',
            failureCategory: 'dispatch_queue_consumer_failed',
            retryable: false,
            source: 'workflow-dispatch-queue'
          }).catch(() => null);
        }
        if (typeof message?.ack === 'function') message.ack();
      }
    }
  },
  async scheduled(controller, env, ctx) {
    const cron = controller?.cron || '';
    const storage = runtimeStorage(env);
    if (cron === '* * * * *') {
      const scheduledTime = Number(controller?.scheduledTime || Date.now()) || Date.now();
      ctx.waitUntil((async () => {
        await runMinuteWorkflowCompletionSweep(storage, env, cron, scheduledTime);
        await sweepTimedOutJobs(storage, {
          eventSource: 'cron',
          env
        });
        await runWorkflowTimeoutRetrySweep(storage, env, {
          source: 'minute-cron',
          cron,
          limit: Math.min(5, Number(env?.WORKFLOW_TIMEOUT_RETRY_SWEEP_LIMIT || 5) || 5),
          waitUntil: (promise) => ctx.waitUntil(promise)
        });
        await runWorkflowOrchestrationWatchdog(storage, env, {
          source: 'minute-cron',
          cron,
          limit: Math.min(10, Number(env?.WORKFLOW_ORCHESTRATION_WATCHDOG_LIMIT || 10) || 10),
          staleAfterMs: Number(env?.WORKFLOW_ORCHESTRATION_STALE_MS || ORCHESTRATION_WATCHDOG_POLICY.staleAfterMs) || ORCHESTRATION_WATCHDOG_POLICY.staleAfterMs,
          blockedAfterMs: Number(env?.WORKFLOW_ORCHESTRATION_BLOCKED_MS || ORCHESTRATION_WATCHDOG_POLICY.blockedAfterMs) || ORCHESTRATION_WATCHDOG_POLICY.blockedAfterMs,
          reason: 'minute cron orchestration watchdog dispatch',
          waitUntil: (promise) => ctx.waitUntil(promise)
        });
        await runQueuedEndpointDispatchSweep(storage, env, {
          source: 'minute-cron',
          cron,
          limit: Math.min(8, Number(env?.QUEUED_DISPATCH_SWEEP_LIMIT || 8) || 8),
          reason: 'minute cron dispatch sweep',
          waitUntil: (promise) => ctx.waitUntil(promise)
        });
      })());
      return;
    }
    ctx.waitUntil((async () => {
      await recoverWorkflowEndpointDispatchJobs(storage, env, {
        source: 'cron',
        cron,
        limit: Number(env?.SCHEDULED_BUILTIN_COMPLETION_SWEEP_LIMIT || 10) || 10
      });
      await sweepTimedOutJobs(storage, {
        eventSource: 'cron',
        env
      });
      await runWorkflowTimeoutRetrySweep(storage, env, {
        source: 'cron',
        cron,
        limit: Number(env?.WORKFLOW_TIMEOUT_RETRY_SWEEP_LIMIT || 10) || 10,
        waitUntil: (promise) => ctx.waitUntil(promise)
      });
      await runWorkflowOrchestrationWatchdog(storage, env, {
        source: 'cron',
        cron,
        limit: Number(env?.WORKFLOW_ORCHESTRATION_WATCHDOG_LIMIT || ORCHESTRATION_WATCHDOG_POLICY.maxParentsPerSweep) || ORCHESTRATION_WATCHDOG_POLICY.maxParentsPerSweep,
        staleAfterMs: Number(env?.WORKFLOW_ORCHESTRATION_STALE_MS || ORCHESTRATION_WATCHDOG_POLICY.staleAfterMs) || ORCHESTRATION_WATCHDOG_POLICY.staleAfterMs,
        blockedAfterMs: Number(env?.WORKFLOW_ORCHESTRATION_BLOCKED_MS || ORCHESTRATION_WATCHDOG_POLICY.blockedAfterMs) || ORCHESTRATION_WATCHDOG_POLICY.blockedAfterMs,
        reason: 'cron orchestration watchdog dispatch',
        waitUntil: (promise) => ctx.waitUntil(promise)
      });
      await runQueuedEndpointDispatchSweep(storage, env, {
        source: 'cron',
        cron,
        limit: Number(env?.QUEUED_DISPATCH_SWEEP_LIMIT || 12) || 12,
        reason: 'cron dispatch sweep',
        waitUntil: (promise) => ctx.waitUntil(promise)
      });
    })());
    if (cron !== '* * * * *') {
      ctx.waitUntil(runRecurringOrderSweep(storage, env, {
        source: 'cron',
        cron,
        limit: Number(env?.RECURRING_SWEEP_LIMIT || 10) || 10
      }));
      ctx.waitUntil(runProviderMonthlyBillingSweep(storage, env, {
        source: 'cron',
        cron,
        at: nowIso()
      }));
    }
  }
};
