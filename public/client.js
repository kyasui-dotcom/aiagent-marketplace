import {
  APP_SETTING_DEFAULTS,
  WORK_ACTION_IDS,
  isKnownWorkUiAction
} from './work-action-registry.js?v=20260430b';
import {
  connectorActionLabel,
  deliveryAuthorityRequirementForAction,
  deliveryAuthorityOwnerLabel,
  deliveryAuthoritySummary,
  deliveryErrorPresentation,
  deliveryGoogleSourceFlowPlan,
  deliveryGoogleSourceFieldDescriptors,
  deliveryGoogleSourceLoadLabel,
  deliveryLocalExecutionPlan,
  deliveryOutcomePresentation,
  deliveryPublishActionDescriptors,
  deliveryPublishSectionDescriptors,
  deliveryPublishFieldDescriptors,
  deliveryExecutionPromptPresentation,
  deliveryExecutionSideEffectPlan,
  deliveryExecutorStatePresentation,
  deliverySchedulePromptPresentation,
  deliveryScheduleSideEffectPlan,
  deliveryDraftDefaultsForType,
  deliveryControlFieldsForType,
  extractSocialPostTextFromDeliveryContent,
  genericDeliverableSectionDescriptors,
  googleIncludeGroupsForCapabilities,
  deliveryPrimaryActionDescriptors,
  deliveryUiText,
  resolveDeliveryExecutionAction,
  resolveDeliveryScheduleAction,
  resolveDeliveryActionContract,
  deliveryActionContractForType,
  isDeliveryExecutionActionSupported,
  isDeliveryScheduleActionSupported,
  validateDeliveryExecutionDraft
} from './delivery-action-contract.js';
import {
  isLeaderCatalogQuestionIntentText,
  isNonOrderConversationIntentText
} from './work-intent-resolver.js?v=20260526a';
import {
  chatEngineBuildIntakeCombinedPrompt,
  chatEngineBuildIntakeState,
  chatEngineIsNeedsInputResponse
} from './chat-engine.js?v=20260501a';
import {
  articleCandidateFromDelivery,
  buildDeliveryZipBlob,
  genericDeliverableFromClassification,
  genericDeliverableFromExplicitFiles,
  normalizeArticleText
} from './client-delivery-files.js?v=20260526b';
import { compactClientText as compactChatText } from './client-text-utils.js?v=20260521a';
import {
  deliveryFileDisplayTitle,
  deliveryFileProvenanceParts
} from './delivery-provenance-utils.js?v=20260521a';
import {
  LIST_CREATOR_BATCH_SIZE,
  displayCurrencyToLedgerAmount,
  formatDisplayCurrency,
  fundingBreakdownLines,
  fundingBreakdownCompact,
  inferListCreatorRequestedCount,
  ledgerAmountToDisplayCurrency,
  listCreatorUsageEstimateForCount,
  moneyInputValueFromLedger,
  normalizeTaskTypeToken,
  pointsLabel,
  subscriptionBasePriceForPlan,
  subscriptionIncludedCreditsForPlan,
  yen
} from './client-billing-utils.js?v=20260521a';
import {
  DONATION_ONLY_NOTICE,
  IN_APP_PAYMENTS_REMOVED,
  attachRemovedPaymentActionHandlers
} from './client-payment-removal-ui.js?v=20260527a';
import {
  TEMPORARY_INVOICE_BILLING_ENABLED
} from './client-temporary-invoice-controller.js?v=20260527a';
import {
  LONG_PROMPT_GUARD_CHARS,
  LONG_PROMPT_SOURCE_CHUNK_CHARS,
  ORDER_INPUT_MAX_FILES,
  ORDER_INPUT_MAX_FILE_BYTES,
  ORDER_INPUT_MAX_FILE_CHARS,
  ORDER_INPUT_MAX_URLS,
  ORDER_INPUT_TOTAL_FILE_CHARS,
  PROMPT_LIKE_GUARD_CHARS,
  fallbackPromptFromOrderInput,
  formatBytes,
  inferTextMimeFromName,
  isOrderInputFileSupported,
  normalizeOrderInputFile,
  normalizeOrderInputUrls,
  orderInputCounts
} from './client-order-input-utils.js?v=20260521a';
import {
  inferClientTaskSequence,
  isExplicitClientLeaderTask,
  normalizeOpenChatIntentText,
  openChatIntentMatchText
} from './client-intent-routing-utils.js?v=20260522a';
import {
  activeApiKeys,
  canManageAgentsFromBrowser,
  canManagePaymentsFromBrowser,
  canManagePayoutsFromBrowser,
  canOrderFromBrowser,
  canUseDevApi,
  canUseGithubAgentFlow,
  githubAuthActionUrl,
  googleAuthActionUrl,
  googleOAuthBrowserWarning,
  isGithubAuthorized,
  isGithubLinked,
  isGoogleAuthorized,
  isGoogleLinked,
  isLikelyRestrictedGoogleOAuthBrowser,
  linkedProvidersLabel,
  primarySignInUrl
} from './client-auth-access-utils.js?v=20260527a';
import {
  buildWorkflowChildDeliveryCard,
  deliveryFileNames,
  downloadableDeliveryFilesForJob,
  jobDeliveryFileLines,
  normalizeOrderProgressStatus,
  orderProgressChildBlockerType,
  orderProgressChildDeliveryLines,
  orderProgressCounts,
  orderProgressStatusLabel,
  orderProgressSteps,
  orderProgressTone,
  visibleDeliveryFiles,
  visibleWorkflowChildRuns,
  workflowChildDeliveryBody,
  workflowChildDeliveryLabel,
  workflowProgressDetails
} from './client-order-progress-utils.js?v=20260529a';
import {
  createClientApiClient,
  isRetriableFetchError,
  waitForNetworkRetry
} from './client-api.js?v=20260522a';
import {
  createOpenChatSessionUtils,
  OPEN_CHAT_SESSION_MAX_MESSAGES,
  OPEN_CHAT_SESSION_MAX_SESSIONS
} from './client-open-chat-session-utils.js?v=20260522a';
import { createClientOpenChatHistoryUtils } from './client-open-chat-history-utils.js?v=20260527a';
import { createClientOpenChatComposerUtils } from './client-open-chat-composer-utils.js?v=20260527a';
import { createOrderDraftUtils } from './client-order-draft-utils.js?v=20260522a';
import {
  createClientAnalyticsUtils,
  safeAnalyticsString
} from './client-analytics-utils.js?v=20260526a';
import { createClientOpenChatOrderProgressUtils } from './client-open-chat-order-progress-utils.js?v=20260526a';
import { createClientOpenChatPreorderUtils } from './client-open-chat-preorder-utils.js?v=20260527a';
import { createClientOpenChatPreorderIntentUtils } from './client-open-chat-preorder-intent-utils.js?v=20260527a';
import { createClientOpenChatPreLlmGuardUtils } from './client-open-chat-pre-llm-guard-utils.js?v=20260527a';
import { createClientOpenChatNaturalFlowUtils } from './client-open-chat-natural-flow-utils.js?v=20260527a';
import { createClientOpenChatOrderPrepUtils } from './client-open-chat-order-prep-utils.js?v=20260529a';
import { createClientOpenChatServerOrderUtils } from './client-open-chat-server-order-utils.js?v=20260529a';
import { createClientOpenChatResponseUtils } from './client-open-chat-response-utils.js?v=20260529a';
import { createClientOpenChatQuickAnswerUtils } from './client-open-chat-quick-answer-utils.js?v=20260527a';
import { createClientOpenChatLocalAnswerUtils } from './client-open-chat-local-answer-utils.js?v=20260527a';
import { createClientOpenChatCommandUtils } from './client-open-chat-command-utils.js?v=20260527a';
import { createOpenChatIntakeUtils } from './open-chat-intake-utils.js?v=20260527a';
import { createOpenChatPatternGuardUtils } from './open-chat-pattern-guard-utils.js?v=20260527a';
import {
  createBriefPresentationUtils,
  openChatReadiness,
  openChatReadinessBlock,
  openChatStatusDisplayText,
  reviseStructuredBriefWithInstruction,
  stripInternalBriefFromChatBody,
  stripStandaloneInternalBriefsFromChatBody
} from './client-brief-presentation-utils.js?v=20260522a';
import { createBriefConstructionUtils } from './client-brief-construction-utils.js?v=20260522a';
import {
  chatAnswerBody,
  chatAnswerKind,
  createClientAnswerUtils
} from './client-answer-utils.js?v=20260522a';
import { createChatRenderUtils } from './client-chat-render-utils.js?v=20260522a';
import { createChatMessageRenderer } from './client-chat-message-renderer.js?v=20260522a';
import {
  renderOpenChatChoiceBarElement,
  runOpenChatChoiceButtonAction,
  updateOrderSettingsDrawerControls,
  updateParallelToolsControls,
  updateOpenChatModeControls
} from './client-composer-ui.js?v=20260522a';
import { renderOpenChatSessionControlsElement } from './client-session-controls-ui.js?v=20260522a';
import { renderWorkChatEntryCardElement } from './client-work-chat-entry-ui.js?v=20260522a';
import { createClientOrderRoutingController } from './client-order-routing-controller.js?v=20260528c';
import { createClientFlexibleToolUtils } from './client-flexible-tool-utils.js?v=20260527a';
import { createClientScheduledWorkController } from './client-scheduled-work-controller.js?v=20260527a';
import { createClientMarketingTimelineUtils } from './client-marketing-timeline-utils.js?v=20260527a';
import { createClientOperatorDashboardUtils } from './client-operator-dashboard-utils.js?v=20260527a';
import { createClientAgentProfileUtils } from './client-agent-profile-utils.js?v=20260527a';
import { createClientBrowserTransferUtils } from './client-browser-transfer-utils.js?v=20260529a';
import { createClientDeliveryRenderUtils } from './client-delivery-render-utils.js?v=20260527a';
import { createClientDeliveryActionController } from './client-delivery-action-controller.js?v=20260527a';
import { createClientRouteAuthController } from './client-route-auth-controller.js?v=20260528a';
import { createClientGithubAgentSetupController } from './client-github-agent-setup-controller.js?v=20260528a';
import { createClientDeveloperSurfaceController } from './client-developer-surface-controller.js?v=20260528a';
import { createClientSettingsBillingController } from './client-settings-billing-controller.js?v=20260528a';
import { createClientWorkUiTextUtils } from './client-work-ui-text-utils.js?v=20260528a';
import { createClientDomElements } from './client-dom-elements.js?v=20260528a';
import { createClientRunComposerController } from './client-run-composer-controller.js?v=20260528d';
import { createClientAgentCatalogController } from './client-agent-catalog-controller.js?v=20260528a';
import { createClientOrderAgentPickerController } from './client-order-agent-picker-controller.js?v=20260529a';
import { createClientRunHistoryController } from './client-run-history-controller.js?v=20260529a';
import { createClientRequesterScopeUtils } from './client-requester-scope-utils.js?v=20260529a';
import { createClientAgentSetupFlowController } from './client-agent-setup-flow-controller.js?v=20260529a';
import { createClientConnectHubController } from './client-connect-hub-controller.js?v=20260529a';
import { createClientAgentAccessController } from './client-agent-access-controller.js?v=20260529a';
import { createClientViewUtils } from './client-view-utils.js?v=20260529a';
import { createClientParallelOrderController } from './client-parallel-order-controller.js?v=20260529a';
import { createClientOrderDraftController } from './client-order-draft-controller.js?v=20260529a';

const $ = (id) => document.getElementById(id);
const PRODUCT_NAME = 'CAIt';
const PRODUCT_SHORT_NAME = 'CAIt';
const DEVELOPER_SURFACES_STATUS = 'Runtime gated';
const DEVELOPER_SURFACES_NOTICE = 'API-key access, CLI, and MCP are controlled by deployment runtime flags. Browser-owned CAIt chat, app, delivery, and Publisher flows remain available.';
const WORK_CHAT_INTERNAL_STATUS_VISIBLE = false;
const ORDER_HISTORY_PAGE_SIZE = 50;
const els = createClientDomElements($);

const OPEN_CHAT_ORDER_PROGRESS_POLL_MS = 4000;
const OPEN_CHAT_ORDER_PROGRESS_MAX_POLLS = 300;
const OPEN_CHAT_ACCEPTANCE_PROGRESS_TICK_MS = 1200;
const OPEN_CHAT_DISPATCH_IN_FLIGHT_TTL_MS = 45000;
const LIVE_SNAPSHOT_REFRESH_MS = 5000;
const ORDER_HISTORY_OPTIMISTIC_TTL_MS = 10 * 60 * 1000;

const clientViewUtils = createClientViewUtils({
  document
});
const {
  clipText,
  currentMonthPeriod,
  escapeHtml,
  formatDurationMs,
  formatPercent,
  formatSecRange,
  formatTime,
  renderSummaryRows,
  safeCssToken,
  safeText,
  setButtonAccess,
  setElementVisible,
  setInputValue,
  sinceLabel
} = clientViewUtils;

function initialOpenChatMode() {
  return 'clarify';
}

const state = {
  snapshot: null,
  repos: [],
  filteredRepos: [],
  repoPage: 0,
  repoPageSize: 50,
  repoAutoLoadedFor: '',
  repoAutoLoading: false,
  repoAdapterHints: {},
  selectedRepoFullName: '',
  workFlowMode: '',
  workFlowShowList: false,
  workFlowLastCreatedJobId: null,
  connectFlowMode: '',
  stripeStatus: null,
  lastIssuedOrderApiKey: null,
  settingsSection: 'payments',
  billingProfileExpanded: false,
  providerProfileExpanded: false,
  agentSetupStarted: false,
  agentSetupMode: '',
  agentSetupCompletedId: null,
  showAgentList: false,
  settingsPeriod: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
  planIntentArmed: false,
  eventFilter: '',
  currentTab: 'start',
  pendingAuthTab: '',
  initialSnapshotLoading: false,
  runSearch: '',
  runRequesterFilter: 'all',
  jobAgentSearch: '',
  runStatusFilter: '',
  runActionFilter: '',
  runPage: 0,
  parallelOrderDrafts: [],
  parallelToolsExpanded: false,
  orderSettingsExpanded: false,
  followupToJobId: '',
  followupSourceTaskType: '',
  followupSourceAgentId: '',
  pendingIntake: null,
  intakeConfirmed: false,
  intakeAnswer: '',
  orderChatMessages: [],
  orderComposerDirtySinceSend: false,
  flexToolDismissedKey: '',
  flexToolLastShownKey: '',
  flexToolLastActiveId: '',
  openChatMode: initialOpenChatMode(),
  currentOpenChatSessionId: '',
  openChatRuntimeSessions: [],
  openChatRuntimeOwnerLogin: '',
  openChatHistoryOpen: false,
  openChatPreparedBrief: '',
  openChatParallelPlan: [],
  openChatClarifyOptions: [],
  openChatVagueChoicePrompt: '',
  openChatNaturalChoiceIntent: '',
  openChatIntentShiftPrompt: '',
  openChatIdeaBacklogPrompt: '',
  openChatLeaderChoicePrompt: '',
  openChatLeaderChoiceCandidates: [],
  openChatLeaderIntakePrompt: '',
  openChatLeaderIntakeTask: '',
  openChatPendingQuestionPrompt: '',
  openChatPendingQuestionTask: '',
  openChatPendingQuestionPattern: '',
  serverResolvedIntent: null,
  serverPreparedOrder: null,
  openChatEntryDismissed: false,
  openChatDecisionSuppressed: false,
  openChatDecisionSuppressedBriefKey: '',
  openChatPausedByTabLeave: false,
  openChatLastStatus: '',
  openChatLastStatusTone: 'info',
  openChatProgressOrderId: '',
  openChatProgressLastKey: '',
  openChatProgressPollCount: 0,
  openChatPendingDispatchMessageId: '',
  openChatDispatchInFlightKey: '',
  openChatDispatchInFlightAt: 0,
  optimisticOrderJobs: {},
  pendingOrderConfirmation: null,
  orderInputFiles: [],
  orderInputFileWarnings: [],
  pageViewTracked: false,
  loginCompletionTrackedFor: '',
  agentSearch: '',
  agentStatusFilter: '',
  agentAvailabilityFilter: '',
  agentActionFilter: '',
  agentTaskFilter: '',
  agentSort: 'readiness',
  adminChatFilter: 'all',
  adminPages: {
    accounts: 0,
    orders: 0,
    chats: 0,
    agents: 0,
    reports: 0,
    events: 0
  },
  agentOnboarding: {},
  onboardingLoading: {},
  routeAgentId: '',
  selectedJobId: null,
  selectedAgentId: null,
  selectedFeedbackId: null,
  selectedChatTranscriptId: null,
  deliveryPublishDrafts: {},
  deliveryPublishClassifications: {},
  deliveryPublishSeeds: {},
  deliveryExecutionSeeds: {},
  deliveryActionDrafts: {},
  deliveryPublishDraftsScope: '',
  deliveryActionDraftsScope: '',
  marketingTimelineItems: []
};

const clientOpenChatResponseUtils = createClientOpenChatResponseUtils({
  state,
  productShortName: PRODUCT_SHORT_NAME,
  compactChatText: (value, max) => compactChatText(value, max),
  getLastOpenChatPreparedBrief: () => lastOpenChatPreparedBrief(),
  isOpenChatClarificationAnswer: (prompt) => isOpenChatClarificationAnswer(prompt),
  isOpenChatBriefEditInstruction: (prompt) => isOpenChatBriefEditInstruction(prompt),
  openChatIntentMatchText: (value) => openChatIntentMatchText(value),
  isStructuredOrderBrief: (brief) => isStructuredOrderBrief(brief),
  structuredOrderBriefParts: (brief) => structuredOrderBriefParts(brief),
  openChatConversationContextForLlm: () => openChatConversationContextForLlm(),
  chatAnswerKind: (answer) => chatAnswerKind(answer),
  openChatReadiness: (taskType, brief, sourceCounts) => openChatReadiness(taskType, brief, sourceCounts),
  orderRoutingDecision: (taskType, brief, requested) => orderRoutingDecision(taskType, brief, requested),
  openChatDeliverableForTask: (taskType) => openChatDeliverableForTask(taskType)
});
const {
  looksJapanese,
  openChatFollowupMode,
  isOpenChatRunConfirmation,
  isOpenChatExplicitDispatchRequest,
  isOpenChatGenericProceed,
  openChatLooksStandaloneQuestionText,
  openChatProductQuestionContext,
  isOpenChatDecisionSuppressedForBrief,
  markOpenChatDecisionSuppressedForBrief,
  clearOpenChatDecisionSuppressionForNewBrief,
  openChatLocalUserConversationText,
  openChatMustUseLlmFallback,
  withOpenChatResponseSource,
  openChatPreparedOrderActions,
  optimizedWorkOrderBrief,
  openChatConfirmationPauseBlock
} = clientOpenChatResponseUtils;

const clientAgentSetupFlowController = createClientAgentSetupFlowController({
  state,
  els,
  productName: PRODUCT_NAME,
  productShortName: PRODUCT_SHORT_NAME,
  connectorActionLabel: (...args) => connectorActionLabel(...args),
  isGithubAuthorized: (...args) => isGithubAuthorized(...args),
  isGithubLinked: (...args) => isGithubLinked(...args),
  selectedRepoFromPicker: (...args) => selectedRepoFromPicker(...args),
  setElementVisible: (...args) => setElementVisible(...args)
});

const clientConnectHubController = createClientConnectHubController({
  state,
  els,
  developerSurfacesNotice: DEVELOPER_SURFACES_NOTICE,
  developerSurfacesStatus: DEVELOPER_SURFACES_STATUS,
  activeApiKeys: (...args) => activeApiKeys(...args),
  canUseGithubAgentFlow: (...args) => canUseGithubAgentFlow(...args),
  connectorActionLabel: (...args) => connectorActionLabel(...args),
  isGithubAuthorized: (...args) => isGithubAuthorized(...args),
  isGithubLinked: (...args) => isGithubLinked(...args),
  setButtonAccess: (...args) => setButtonAccess(...args)
});

const clientRequesterScopeUtils = createClientRequesterScopeUtils({
  getState: () => state
});

const {
  recurringOrderMatchesRequesterScope,
  requesterAccountIdOf,
  requesterIdentityKeys,
  requesterLoginOf,
  requesterMatchesScope,
  requesterScopeForClient,
  runMatchesRequesterScope
} = clientRequesterScopeUtils;

const clientWorkUiTextUtils = createClientWorkUiTextUtils({
  appSettingDefaults: APP_SETTING_DEFAULTS,
  getAppSettings: () => (state?.snapshot?.appSettings && typeof state.snapshot.appSettings === 'object'
    ? state.snapshot.appSettings
    : {})
});
const {
  appSettingValue,
  workOrderUiLabels,
  formatWorkUiText,
  formatWorkUiTextSafe
} = clientWorkUiTextUtils;

const clientBrowserTransferUtils = createClientBrowserTransferUtils({
  Blob,
  URL,
  buildDeliveryZipBlob,
  document,
  flash: (message, kind) => flash(message, kind),
  navigator
});
const {
  copyTextToClipboard,
  downloadDeliveryFile,
  downloadDeliverySummaryFile,
  downloadDeliveryZip
} = clientBrowserTransferUtils;

const clientDeveloperSurfaceController = createClientDeveloperSurfaceController({
  els,
  state,
  developerSurfacesStatus: DEVELOPER_SURFACES_STATUS,
  developerSurfacesNotice: DEVELOPER_SURFACES_NOTICE,
  copyTextToClipboard: (text, label) => copyTextToClipboard(text, label),
  escapeHtml: (value) => escapeHtml(value),
  flash: (message, kind) => flash(message, kind),
  formatTime: (value) => formatTime(value),
  renderConnectFlow: () => renderConnectFlow(),
  requestJson: (url, options) => api(url, options),
  safeText: (el, value) => safeText(el, value),
  setElementVisible: (element, visible) => setElementVisible(element, visible)
});
const {
  bindDeveloperSurfaceInteractions,
  closePlanModal,
  formatAgentApiCommand,
  formatOrderApiCommand,
  renderOrderApiKeys,
  selectApiKeyRevealToken,
  showApiKeyRevealResult
} = clientDeveloperSurfaceController;

const api = createClientApiClient({
  getCsrfToken: () => state.snapshot?.auth?.csrfToken || '',
  isLoggedIn: () => Boolean(state.snapshot?.auth?.loggedIn),
  onSessionExpired: () => {
    if (!state.snapshot?.auth) return;
    state.snapshot.auth = {
      loggedIn: false,
      user: null,
      authProvider: 'guest'
    };
  },
  onUnauthorized: () => {
    state.stripeStatus = null;
    if (state.snapshot) render(state.snapshot);
  },
  githubConnectionLabel: () => connectorActionLabel('connect_github')
});

const clientAgentProfileUtils = createClientAgentProfileUtils({
  state,
  els,
  LIST_CREATOR_BATCH_SIZE,
  displayCurrencyToLedgerAmount,
  formatDisplayCurrency,
  inferListCreatorRequestedCount,
  isGithubAuthorized,
  isGithubLinked,
  isGoogleAuthorized,
  isGoogleLinked,
  listCreatorUsageEstimateForCount,
  currentEffectiveOrderPrompt: () => currentEffectiveOrderPrompt(),
  currentRoutingTask: () => currentRoutingTask(),
  currentAgentOnboarding: (agentId) => currentAgentOnboarding(agentId),
  onboardingAction: (onboarding) => onboardingAction(onboarding),
  renderRepoPicker: () => renderRepoPicker(),
  showSelectedRepo: () => showSelectedRepo(),
  orderInputFromComposer: () => orderInputFromComposer(),
  orderInputCounts: (input) => orderInputCounts(input),
  ORDER_INPUT_MAX_URLS,
  normalizeOrderInputFile: (file) => normalizeOrderInputFile(file),
  formatDurationMs: (ms) => formatDurationMs(ms),
  formatTime: (value) => formatTime(value),
  sinceLabel: (value) => sinceLabel(value),
  authorityRequestFromReport: (report) => authorityRequestFromReport(report),
  authorityRequestRequiresClientApproval: (authority) => authorityRequestRequiresClientApproval(authority),
  describeAuthorityNeed: (capabilities, connectors) => describeAuthorityNeed(capabilities, connectors),
  resolvedOrderStrategyOfDraft: (draft) => resolvedOrderStrategyOfDraft(draft),
  routePlanOfDraft: (draft) => routePlanOfDraft(draft),
  queuedDraftAgent: (draft) => queuedDraftAgent(draft),
  readyAgentsForTask: (taskType) => readyAgentsForTask(taskType),
  isRepoBackedCodeOrderIntent: (taskType, prompt) => isRepoBackedCodeOrderIntent(taskType, prompt)
});
const {
  providerMarkupRateOf,
  platformMarginRateOf,
  normalizeClientPricingModel,
  normalizeClientOverageMode,
  agentPricingManifest,
  agentPricingConfig,
  pricingModelLabel,
  syncAgentPricingEditorVisibility,
  agentPricingGuideText,
  estimateWindowOfAgent,
  agentVerification,
  agentManifest,
  agentTrustList,
  agentTrustProfile,
  agentRole,
  normalizeClientCompositionMode,
  agentComposition,
  agentProductKind,
  isCompositeAgentProduct,
  isAgentSuiteProduct,
  agentCompositionSummary,
  normalizeClientRequirement,
  normalizeClientRequirementFulfillment,
  normalizeClientRequirementCompletionSignal,
  requirementFulfillmentLabel,
  requirementFlowSummary,
  requirementHubSummary,
  agentRequirements,
  agentRequirementSummary,
  normalizeClientList,
  agentTags,
  agentExecutionProfile,
  normalizeClientConnector,
  normalizeClientConnectorCapability,
  normalizeClientConnectorCapabilityList,
  connectorForRequiredCapability,
  defaultGoogleSourceGroupsForCapabilitiesClient,
  connectorStatusForClient,
  xConnectorIdentityForClient,
  xApprovalPayloadForClient,
  connectorScopeSetForClient,
  googleCapabilityStatusForClient,
  normalizeRepoFullName,
  repoIdentityParts,
  repoFullNameFromManifestSource,
  findLoadedGithubRepo,
  agentGithubRepo,
  adapterAutomationAlreadyPrepared,
  onboardingNeedsHostedAutomation,
  canAutomateAgentSetup,
  selectGithubRepoInPicker,
  sampleKindFromUrl,
  sampleKindFromAgent,
  isManagedSampleAgent,
  collectAgentEndpoints,
  shortUrl,
  agentVerifyAction,
  agentVerifyFailureSummary,
  agentReview,
  agentReviewStatus,
  agentReviewLabel,
  agentReviewApproved,
  agentReviewReason,
  agentHealth,
  runTiming,
  traceTimeline,
  agentReadinessScore,
  agentTaskSpecificityScore,
  currentOrderInputTypeHints,
  clientTaskRoutingObject,
  clientRoutingByTaskValues,
  clientTaskRoutingTokens,
  clientTaskSignalTokens,
  clientTaskTagHints,
  clientTaskMetadataScores,
  clientWorkflowTaskTokens,
  clientTaskMatch,
  agentRoutingScore,
  compareAgents,
  parseSearchTokens,
  agentTaskFit,
  agentNextAction,
  runNextAction,
  runActionKey,
  inputSourcesFromJob,
  summarizeRun,
  preflightAgentsForDraft,
  clientOrderPreflight
} = clientAgentProfileUtils;

const clientAgentAccessController = createClientAgentAccessController({
  state,
  els,
  window,
  productName: PRODUCT_NAME,
  productShortName: PRODUCT_SHORT_NAME,
  selectedAgent: () => selectedAgent(),
  agentHealth,
  agentVerification,
  agentGithubRepo,
  canAutomateAgentSetup,
  adapterAutomationAlreadyPrepared,
  clipText,
  formatTime,
  flash
});
const {
  agentShareUrl,
  agentSharePost,
  shareAgentOnX,
  currentRunTargetAgent,
  currentAgentOnboarding,
  onboardingFreshEnough,
  canCheckAgentOnboarding,
  canDeleteAgent,
  canEditAgentPricing,
  authIdentityLogins,
  authOwnsAgent,
  onboardingAction,
  renderAgentOnboarding
} = clientAgentAccessController;

const clientOrderAgentPickerController = createClientOrderAgentPickerController({
  state,
  els,
  document,
  agentComposition,
  agentCompositionSummary,
  agentHealth,
  agentProductKind,
  agentRequirements,
  agentRequirementSummary,
  agentRoutingScore,
  agentTags,
  agentTaskFit,
  compareAgents,
  currentRoutingTask: () => currentRoutingTask(),
  isAgentSuiteProduct,
  isCompositeAgentProduct,
  parseSearchTokens
});
const {
  readyAgentsForTask,
  bestReadyAgentForTask,
  agentMatchesOrderSearch,
  renderOrderAgentSearchSummary,
  renderOrderAgentPicker
} = clientOrderAgentPickerController;

const clientGithubAgentSetupController = createClientGithubAgentSetupController({
  state,
  els,
  productName: PRODUCT_NAME,
  productShortName: PRODUCT_SHORT_NAME,
  api: (...args) => api(...args),
  isGithubAuthorized: (...args) => isGithubAuthorized(...args),
  isGithubLinked: (...args) => isGithubLinked(...args),
  renderAgentSetupFlow: (...args) => renderAgentSetupFlow(...args),
  flash: (...args) => flash(...args),
  trackConversionEvent: (...args) => trackConversionEvent(...args),
  canCheckAgentOnboarding: (...args) => canCheckAgentOnboarding(...args),
  currentAgentOnboarding: (...args) => currentAgentOnboarding(...args),
  onboardingFreshEnough: (...args) => onboardingFreshEnough(...args),
  setAgentDetail: (...args) => setAgentDetail(...args),
  renderAgentOnboarding: (...args) => renderAgentOnboarding(...args),
  renderAgents: (...args) => renderAgents(...args),
  setDetail: (...args) => setDetail(...args),
  selectGithubRepoInPicker: (...args) => selectGithubRepoInPicker(...args),
  canAutomateAgentSetup: (...args) => canAutomateAgentSetup(...args),
  agentGithubRepo: (...args) => agentGithubRepo(...args),
  escapeHtml: (...args) => escapeHtml(...args),
  refresh: (...args) => refresh(...args),
  completeAgentSetup: (...args) => completeAgentSetup(...args),
  switchTab: (...args) => switchTab(...args),
  ensureGithubLinkedAccess: (...args) => ensureGithubLinkedAccess(...args),
  importManifestUrlAndVerify: (...args) => importManifestUrlAndVerify(...args),
  runAction: (...args) => runAction(...args)
});
const {
  applyRepoFilter,
  renderRepoPicker,
  resetRepoPicker,
  loadGithubRepos,
  maybeAutoLoadRepos,
  loadAgentOnboarding,
  maybeAutoCheckSelectedAgent,
  showSelectedRepo,
  selectedRepoFromPicker,
  repoAdapterHint,
  writeAdapterPrPopup,
  maybeOfferAutomatedAgentSetup,
  bindGithubAgentSetupInteractions
} = clientGithubAgentSetupController;

const orderDraftUtils = createOrderDraftUtils({
  canonicalOrderTaskType: (taskType, context) => openChatCanonicalOrderTaskType(taskType, context),
  listCreatorEstimateForDraft: (draft) => listCreatorEstimateForDraft(draft),
  getCurrentOpenChatSessionId: () => state.currentOpenChatSessionId || ''
});
const {
  isStructuredOrderBrief,
  structuredOrderBriefParts,
  extractPreparedBriefFromChatText,
  rewriteStructuredBriefTaskType,
  apiPayloadFromOrderDraft,
  apiPayloadFromOrderDraftWithChatSession
} = orderDraftUtils;

const briefConstructionUtils = createBriefConstructionUtils({
  looksJapanese: (value) => looksJapanese(value),
  isStructuredOrderBrief: (brief) => isStructuredOrderBrief(brief),
  structuredOrderBriefParts: (brief) => structuredOrderBriefParts(brief),
  canonicalOrderTaskType: (taskType, context) => openChatCanonicalOrderTaskType(taskType, context),
  requirementHubBriefLine: (prompt, taskType, inputCounts) => openChatRequirementHubBriefLine(prompt, taskType, inputCounts),
  routePreview: (taskType, prompt) => openChatRoutePreview(taskType, prompt),
  readinessBlock: (taskType, prompt, inputCounts, options) => openChatReadinessBlock(taskType, prompt, inputCounts, options),
  promptLikeSourceSignalCount: (prompt) => openChatPromptLikeSourceSignalCount(prompt),
  currentRoutingTask: () => currentRoutingTask(),
  longPromptSourceSummary: (prompt) => openChatLongPromptSourceSummary(prompt)
});
const {
  openChatParallelPlanFromBrief,
  openChatParallelPlanBlock,
  openChatDeliverableForTask,
  openChatDeliveryPreviewBlock,
  openChatReadyToRunBlock,
  catCompactDispatchBrief,
  buildOpenChatVagueResearchBrief,
  buildOpenChatNaturalChoiceBrief,
  buildOpenChatProtectedSourceBrief
} = briefConstructionUtils;

const briefPresentationUtils = createBriefPresentationUtils({
  structuredOrderBriefParts: (brief) => structuredOrderBriefParts(brief),
  canonicalOrderTaskType: (taskType, context) => openChatCanonicalOrderTaskType(taskType, context),
  deliverableForTask: (taskType) => openChatDeliverableForTask(taskType),
  looksJapanese: (value) => looksJapanese(value)
});
const {
  openChatHumanDispatchPreview
} = briefPresentationUtils;

const clientOpenChatOrderPrepUtils = createClientOpenChatOrderPrepUtils({
  getState: () => state,
  looksJapanese: (value) => looksJapanese(value),
  openChatFollowupMode: (prompt) => openChatFollowupMode(prompt),
  lastOpenChatPreparedBrief: () => lastOpenChatPreparedBrief(),
  structuredOrderBriefParts: (brief) => structuredOrderBriefParts(brief),
  inferClientTaskSequence: (taskType, prompt) => inferClientTaskSequence(taskType, prompt),
  orderRoutingDecision: (taskType, prompt, requested) => orderRoutingDecision(taskType, prompt, requested),
  openChatClarifyingQuestions: (taskType, prompt) => openChatClarifyingQuestions(taskType, prompt),
  openChatReadinessBlock: (taskType, prompt, inputCounts, config) => openChatReadinessBlock(taskType, prompt, inputCounts, config),
  isStructuredOrderBrief: (brief) => isStructuredOrderBrief(brief),
  openChatDeliverableForTask: (taskType) => openChatDeliverableForTask(taskType),
  openChatDeliveryPreviewBlock: (taskType, prompt, inputCounts, config) => openChatDeliveryPreviewBlock(taskType, prompt, inputCounts, config),
  mergeClarificationAnswersIntoBrief: (brief, answer) => mergeClarificationAnswersIntoBrief(brief, answer),
  cleanOpenChatClarificationAnswer: (answer) => cleanOpenChatClarificationAnswer(answer),
  reviseStructuredBriefWithInstruction: (brief, instruction) => reviseStructuredBriefWithInstruction(brief, instruction),
  openChatParallelPlanBlock: (brief, inputCounts, config) => openChatParallelPlanBlock(brief, inputCounts, config),
  catCompactDispatchBrief: (source, taskType, inputCounts, config) => catCompactDispatchBrief(source, taskType, inputCounts, config),
  openChatHumanDispatchPreview: (brief, taskType, prompt, inputCounts) => openChatHumanDispatchPreview(brief, taskType, prompt, inputCounts),
  openChatReadyToRunBlock: (ja) => openChatReadyToRunBlock(ja),
  currentRoutingTask: () => currentRoutingTask(),
  currentOrderDraft: () => currentOrderDraft(),
  currentComposerPrompt: () => String(els.jobPrompt?.value || '').trim(),
  preflightAgentsForDraft: (draft) => preflightAgentsForDraft(draft),
  agentExecutionProfile: (agent) => agentExecutionProfile(agent),
  clientOrderPreflight: (draft) => clientOrderPreflight(draft),
  openChatSourceText: (prompt) => openChatSourceText(prompt),
  explicitOpenChatAssistMode: (prompt) => explicitOpenChatAssistMode(prompt),
  openChatRequirementHubSpec: (prompt, inputCounts) => openChatRequirementHubSpec(prompt, inputCounts),
  isOpenChatLongPromptSource: (prompt) => isOpenChatLongPromptSource(prompt),
  openChatLongPromptSourceSummary: (prompt) => openChatLongPromptSourceSummary(prompt),
  buildOpenChatProtectedSourceBrief: (prompt, inputCounts) => buildOpenChatProtectedSourceBrief(prompt, inputCounts),
  orderInputCounts: (input) => orderInputCounts(input)
});
const {
  isOpenChatDispatchReadyPrompt: resolveOpenChatDispatchReadyPrompt,
  shouldPrepareOrderBeforeDispatch: resolveOpenChatShouldPrepareOrderBeforeDispatch,
  buildOpenChatFollowupAnswer: resolveOpenChatFollowupAnswer,
  buildOpenChatImplicitOrderPrepAnswer: resolveOpenChatImplicitOrderPrepAnswer,
  buildOpenChatRequirementHubAnswer: resolveOpenChatRequirementHubAnswer,
  buildOpenChatLongPromptGuardAnswer: resolveOpenChatLongPromptGuardAnswer,
  buildOpenChatAssistAnswer: resolveOpenChatAssistAnswer
} = clientOpenChatOrderPrepUtils;

const openChatPatternGuardUtils = createOpenChatPatternGuardUtils({
  getState: () => state,
  looksJapanese: (value) => looksJapanese(value),
  isStructuredOrderBrief: (brief) => isStructuredOrderBrief(brief),
  inferClientTaskSequence: (taskType, prompt) => inferClientTaskSequence(taskType, prompt),
  currentRoutingTask: () => currentRoutingTask(),
  isGithubLinked: (auth) => isGithubLinked(auth),
  isGithubAuthorized: (auth) => isGithubAuthorized(auth),
  lastOpenChatPreparedBrief: () => lastOpenChatPreparedBrief(),
  buildOpenChatProtectedSourceBrief: (prompt, inputCounts) => buildOpenChatProtectedSourceBrief(prompt, inputCounts),
  buildOpenChatRequirementHubAnswer: (prompt, inputCounts) => resolveOpenChatRequirementHubAnswer(prompt, inputCounts)
});
const {
  buildOpenChatPatternGuardAnswer,
  buildOpenChatPromptInjectionAnswer,
  buildOpenChatReusableToolsAnswer,
  isOpenChatLongPromptSource,
  openChatHasSpecificExecutionContext,
  openChatLongPromptSourceSummary,
  openChatLooksHighStakesAdvice,
  openChatLooksSensitiveSecret,
  openChatLooksUnsafeRequest,
  openChatPromptInjectionGuard,
  openChatPromptLikeSourceSignalCount,
  openChatRequirementHubBriefLine,
  openChatRequirementHubSpec
} = openChatPatternGuardUtils;

const clientOpenChatLocalAnswerUtils = createClientOpenChatLocalAnswerUtils({
  getState: () => state,
  looksJapanese: (value) => looksJapanese(value),
  normalizeOpenChatIntentText: (value) => normalizeOpenChatIntentText(value),
  isStructuredOrderBrief: (brief) => isStructuredOrderBrief(brief),
  openChatProductQuestionContext: (prompt) => openChatProductQuestionContext(prompt),
  explicitOpenChatAssistMode: (prompt) => explicitOpenChatAssistMode(prompt),
  openChatLooksSensitiveSecret: (prompt) => openChatLooksSensitiveSecret(prompt),
  openChatLooksUnsafeRequest: (prompt) => openChatLooksUnsafeRequest(prompt),
  openChatLooksHighStakesAdvice: (prompt) => openChatLooksHighStakesAdvice(prompt),
  lastOpenChatPreparedBrief: () => lastOpenChatPreparedBrief(),
  structuredOrderBriefParts: (brief) => structuredOrderBriefParts(brief),
  reviseStructuredBriefWithInstruction: (brief, instruction) => reviseStructuredBriefWithInstruction(brief, instruction),
  openChatReadyToRunBlock: (ja) => openChatReadyToRunBlock(ja),
  isOpenChatGenericProceed: (prompt) => isOpenChatGenericProceed(prompt),
  productName: PRODUCT_NAME,
  productShortName: PRODUCT_SHORT_NAME
});
const {
  openChatIdeaSeeds,
  isOpenChatCeoIdeaDump,
  openChatIdeaOperatorMode,
  openChatIdeaOperatorSummary,
  buildOpenChatCeoIdeaAnswer,
  buildOpenChatIdeaOperatorFollowup,
  isOpenChatBenignNegativeReply,
  isOpenChatPausePrompt,
  isOpenChatNoLoginPrompt,
  isOpenChatRepairPrompt,
  openChatCorrectionText,
  buildOpenChatRepairAnswer,
  buildOpenChatPauseAnswer,
  buildOpenChatStatusAnswer,
  openChatLooksLowInfoTestPrompt,
  buildOpenChatLowInfoTestAnswer,
  openChatLooksGreetingPrompt,
  buildOpenChatGreetingAnswer
} = clientOpenChatLocalAnswerUtils;

const clientOpenChatCommandUtils = createClientOpenChatCommandUtils({
  getState: () => state,
  getEls: () => els,
  looksJapanese: (value) => looksJapanese(value),
  normalizeOpenChatIntentText: (value) => normalizeOpenChatIntentText(value),
  isStructuredOrderBrief: (brief) => isStructuredOrderBrief(brief),
  lastOpenChatPreparedBrief: () => lastOpenChatPreparedBrief(),
  isOpenChatClarificationAnswer: (prompt) => isOpenChatClarificationAnswer(prompt),
  openChatLooksCancelOrderChoice: (prompt) => openChatLooksCancelOrderChoice(prompt),
  openChatHasActiveLocalFollowupState: (prompt) => openChatHasActiveLocalFollowupState(prompt),
  isOpenChatBriefEditInstruction: (prompt) => isOpenChatBriefEditInstruction(prompt),
  openChatFollowupMode: (prompt) => openChatFollowupMode(prompt),
  openChatLooksLikeNaturalChoiceDetails: (prompt) => openChatLooksLikeNaturalChoiceDetails(prompt),
  openChatChoiceReplyToken: (prompt) => openChatChoiceReplyToken(prompt),
  orderInputCounts: (input) => orderInputCounts(input),
  orderInputFromComposer: () => orderInputFromComposer(),
  openChatParallelPlanFromBrief: (brief, inputCounts) => openChatParallelPlanFromBrief(brief, inputCounts),
  chatAnswerKind: (answer) => chatAnswerKind(answer),
  flash: (message, tone) => flash(message, tone),
  openPrimaryGoogleSignIn: () => openPrimaryGoogleSignIn(),
  openGithubSignIn: () => openGithubSignIn(),
  setOpenChatMode: (mode, options) => setOpenChatMode(mode, options),
  setOrderStrategyChoice: (strategy) => setOrderStrategyChoice(strategy),
  parallelDraftFromOpenChatPlanItem: (item, input) => parallelDraftFromOpenChatPlanItem(item, input)
});
const {
  resolveOpenChatClarifyReply,
  openChatCommandMode,
  shouldDeferOpenChatCommandForAnswer,
  buildOpenChatCommandAnswer,
  applyOpenChatCommand
} = clientOpenChatCommandUtils;

const clientOpenChatPreorderUtils = createClientOpenChatPreorderUtils({
  getState: () => state,
  getEls: () => els,
  normalizeOpenChatIntentText: (value) => normalizeOpenChatIntentText(value),
  openChatIntentMatchText: (value) => openChatIntentMatchText(value),
  workOrderUiLabels: () => workOrderUiLabels(),
  resolveOpenChatClarifyReply: (prompt) => resolveOpenChatClarifyReply(prompt),
  isStructuredOrderBrief: (brief) => isStructuredOrderBrief(brief),
  lastOpenChatPreparedBrief: () => lastOpenChatPreparedBrief(),
  openChatLastPromptWasOrderDecision: () => openChatLastPromptWasOrderDecision(),
  looksJapanese: (value) => looksJapanese(value),
  openChatDecisionSeedContext: (original) => openChatDecisionSeedContext(original),
  openChatCanonicalOrderTaskType: (taskType, context) => openChatCanonicalOrderTaskType(taskType, context),
  inferClientTaskSequence: (taskType, prompt) => inferClientTaskSequence(taskType, prompt),
  currentRoutingTask: () => currentRoutingTask(),
  rewriteStructuredBriefTaskType: (brief, taskType) => rewriteStructuredBriefTaskType(brief, taskType),
  buildOpenChatDispatchBriefFromPendingAnswer: (original, prompt, taskType, inputCounts) => buildOpenChatDispatchBriefFromPendingAnswer(original, prompt, taskType, inputCounts),
  structuredOrderBriefParts: (brief) => structuredOrderBriefParts(brief),
  openChatHumanDispatchPreview: (brief, taskType, prompt, inputCounts) => openChatHumanDispatchPreview(brief, taskType, prompt, inputCounts),
  latestOpenChatAgentConfirmationBody: () => latestOpenChatAgentConfirmationBody(),
  openChatPreserveSeedTaskType: (brief, taskType) => openChatPreserveSeedTaskType(brief, taskType),
  openChatPreviousUserMessageBody: () => openChatPreviousUserMessageBody(),
  openChatLocalUserConversationText: (extra) => openChatLocalUserConversationText(extra),
  openChatPreviousAgentMessageBody: () => openChatPreviousAgentMessageBody(),
  acceptPreparedOpenChatOrderForDispatch: (prepared) => acceptPreparedOpenChatOrderForDispatch(prepared),
  orderInputCounts: (input) => orderInputCounts(input),
  orderInputFromComposer: () => orderInputFromComposer(),
  createAndOptionallyRunJob: async () => createAndOptionallyRunJob(),
  renderOpenChatChoiceBar: () => renderOpenChatChoiceBar(),
  appendOrderChatExchange: (prompt, answer, config) => appendOrderChatExchange(prompt, answer, config),
  flash: (message, tone) => flash(message, tone),
  markOpenChatDecisionSuppressedForBrief: (brief) => markOpenChatDecisionSuppressedForBrief(brief)
});
const {
  openChatLooksConfirmOrderChoice,
  openChatLooksReviseOrderChoice,
  openChatLooksCancelOrderChoice,
  openChatOrderDecisionBlock,
  openChatPreorderDecisionCommand,
  openChatPreorderClarifyOptions,
  composeOpenChatPreorderConfirmResponse,
  buildOpenChatConfirmedDispatchDraft,
  composeOpenChatPreorderCancelResponse,
  composeOpenChatPreorderReviseResponse,
  openChatDecisionOriginalPrompt,
  dispatchOpenChatConfirmedChoice,
  enterOpenChatRevisionChoice
} = clientOpenChatPreorderUtils;

const clientOpenChatServerOrderUtils = createClientOpenChatServerOrderUtils({
  getState: () => state,
  requestJson: (url, options) => api(url, options),
  isStructuredOrderBrief: (brief) => isStructuredOrderBrief(brief),
  chatEngineIsNeedsInputResponse: (value) => chatEngineIsNeedsInputResponse(value),
  looksJapanese: (value) => looksJapanese(value),
  normalizeLeaderIntakeQuestions: (value) => normalizeOpenChatDynamicLeaderIntakeQuestions(value),
  normalizeLeaderIntakeTask: (taskType) => openChatNormalizeLeaderIntakeTask(taskType),
  currentRoutingTask: () => currentRoutingTask(),
  pendingLeaderIntakeContext: () => openChatPendingLeaderIntakeContext(),
  implicitLeaderIntakeTask: (prompt) => openChatImplicitLeaderIntakeTask(prompt),
  combineLeaderIntakePrompt: (previous, next) => combinedLeaderIntakePrompt(previous, next),
  requestedOrderStrategy: () => requestedOrderStrategy(),
  conversationContextForLlm: () => openChatConversationContextForLlm(),
  handleNeedsInputResponse: (response, draft) => handleNeedsInputResponse(response, draft),
  isLeaderIntakeTask: (taskType) => openChatIsLeaderIntakeTask(taskType),
  apiPayloadFromOrderDraft: (draft) => apiPayloadFromOrderDraft(draft),
  userOnlyContextForIntake: (prompt) => openChatUserOnlyContextForIntake(prompt),
  structuredOrderBriefParts: (brief) => structuredOrderBriefParts(brief),
  inferClientTaskSequence: (taskType, prompt) => inferClientTaskSequence(taskType, prompt),
  missingLeaderIntakeFields: (taskType, prompt, inputCounts) => openChatMissingLeaderIntakeFields(taskType, prompt, inputCounts),
  orderInputCounts: (input) => orderInputCounts(input),
  orderInputFromComposer: () => orderInputFromComposer()
});
const {
  currentServerResolvedIntentForPrompt,
  applyServerResolvedIntent,
  currentServerPreparedOrderForPrompt,
  applyServerPreparedOrder,
  resolveWorkIntentViaApi,
  prepareWorkOrderViaApi,
  resolveOpenChatServerLeaderIntake,
  preflightWorkOrderViaApi,
  openChatServerLeaderIntakeGuardAnswer
} = clientOpenChatServerOrderUtils;

const clientOpenChatPreorderIntentUtils = createClientOpenChatPreorderIntentUtils({
  looksJapanese: (value) => looksJapanese(value),
  openChatLocalUserConversationText: (extra) => openChatLocalUserConversationText(extra),
  openChatPreviousAgentMessageBody: () => openChatPreviousAgentMessageBody(),
  lastOpenChatPreparedBrief: () => lastOpenChatPreparedBrief(),
  isStructuredOrderBrief: (brief) => isStructuredOrderBrief(brief),
  structuredOrderBriefParts: (brief) => structuredOrderBriefParts(brief),
  openChatCanonicalOrderTaskType: (taskType, context) => openChatCanonicalOrderTaskType(taskType, context),
  inferClientTaskSequence: (taskType, prompt) => inferClientTaskSequence(taskType, prompt),
  currentRoutingTask: () => currentRoutingTask(),
  catCompactDispatchBrief: (source, taskType, inputCounts, config) => catCompactDispatchBrief(source, taskType, inputCounts, config),
  rewriteStructuredBriefTaskType: (brief, taskType) => rewriteStructuredBriefTaskType(brief, taskType),
  openChatHumanDispatchPreview: (brief, taskType, prompt, inputCounts) => openChatHumanDispatchPreview(brief, taskType, prompt, inputCounts),
  openChatNaturalIntentLabel: (intent, prompt, ja) => openChatNaturalIntentLabel(intent, prompt, ja),
  openChatPreorderClarifyOptions: (optionsList, ja) => openChatPreorderClarifyOptions(optionsList, ja),
  openChatLooksPreorderIntentLlmCandidate: (prompt, inputCounts, fallbackAnswer) => openChatLooksPreorderIntentLlmCandidate(prompt, inputCounts, fallbackAnswer),
  startOpenChatThinking: (prompt) => startOpenChatThinking(prompt),
  stopOpenChatThinking: (messageId) => stopOpenChatThinking(messageId),
  getSnapshot: () => state.snapshot || {},
  openChatConversationContextForLlm: () => openChatConversationContextForLlm(),
  trackConversionEvent: (eventName, payload) => trackConversionEvent(eventName, payload),
  openChatServerLeaderIntakeGuardAnswer: async (prompt, result, fallbackAnswer, inputCounts) => openChatServerLeaderIntakeGuardAnswer(prompt, result, fallbackAnswer, inputCounts)
});
const {
  requestOpenChatPreorderIntentResolution
} = clientOpenChatPreorderIntentUtils;

const clientOpenChatNaturalFlowUtils = createClientOpenChatNaturalFlowUtils({
  getState: () => state,
  openChatIntentMatchText: (value) => openChatIntentMatchText(value),
  isStructuredOrderBrief: (brief) => isStructuredOrderBrief(brief),
  explicitOpenChatAssistMode: (prompt) => explicitOpenChatAssistMode(prompt),
  openChatProductQuestionContext: (prompt) => openChatProductQuestionContext(prompt),
  openChatHasSpecificExecutionContext: (prompt, inputCounts) => openChatHasSpecificExecutionContext(prompt, inputCounts),
  looksJapanese: (value) => looksJapanese(value),
  openChatPreorderDecisionCommand: (prompt) => openChatPreorderDecisionCommand(prompt),
  composeOpenChatPreorderConfirmResponse: (original, prompt, inputCounts) => composeOpenChatPreorderConfirmResponse(original, prompt, inputCounts),
  composeOpenChatPreorderReviseResponse: (original, intent, ja) => composeOpenChatPreorderReviseResponse(original, intent, ja),
  composeOpenChatPreorderCancelResponse: (ja) => composeOpenChatPreorderCancelResponse(ja),
  openChatCanonicalOrderTaskType: (taskType, context) => openChatCanonicalOrderTaskType(taskType, context),
  currentRoutingTask: () => currentRoutingTask(),
  inferClientTaskSequence: (taskType, prompt) => inferClientTaskSequence(taskType, prompt),
  buildOpenChatDispatchBriefFromPendingAnswer: (original, prompt, taskType, inputCounts) => buildOpenChatDispatchBriefFromPendingAnswer(original, prompt, taskType, inputCounts),
  openChatHumanDispatchPreview: (brief, taskType, prompt, inputCounts) => openChatHumanDispatchPreview(brief, taskType, prompt, inputCounts),
  buildOpenChatNaturalChoiceBrief: (original, intent, mode, inputCounts) => buildOpenChatNaturalChoiceBrief(original, intent, mode, inputCounts),
  openChatReadyToRunBlock: (ja) => openChatReadyToRunBlock(ja),
  buildOpenChatVagueResearchBrief: (original, inputCounts) => buildOpenChatVagueResearchBrief(original, inputCounts),
  openChatLooksGreetingPrompt: (prompt) => openChatLooksGreetingPrompt(prompt),
  openChatLooksLowInfoTestPrompt: (prompt) => openChatLooksLowInfoTestPrompt(prompt),
  openChatCommandMode: (prompt) => openChatCommandMode(prompt),
  shouldDeferOpenChatCommandForAnswer: (prompt) => shouldDeferOpenChatCommandForAnswer(prompt),
  lastOpenChatPreparedBrief: () => lastOpenChatPreparedBrief(),
  structuredOrderBriefParts: (brief) => structuredOrderBriefParts(brief),
  isOpenChatClarificationAnswer: (prompt) => isOpenChatClarificationAnswer(prompt),
  isOpenChatBriefEditInstruction: (prompt) => isOpenChatBriefEditInstruction(prompt),
  openChatFollowupMode: (prompt) => openChatFollowupMode(prompt),
  reviseStructuredBriefWithInstruction: (brief, instruction) => reviseStructuredBriefWithInstruction(brief, instruction),
  catCompactDispatchBrief: (source, taskType, inputCounts, config) => catCompactDispatchBrief(source, taskType, inputCounts, config),
  openChatLooksSensitiveSecret: (prompt) => openChatLooksSensitiveSecret(prompt),
  openChatLooksUnsafeRequest: (prompt) => openChatLooksUnsafeRequest(prompt),
  openChatLooksHighStakesAdvice: (prompt) => openChatLooksHighStakesAdvice(prompt),
  openChatLastPromptWasOrderDecision: () => openChatLastPromptWasOrderDecision(),
  openChatPreviousUserMessageBody: () => openChatPreviousUserMessageBody()
});
const {
  isOpenChatVagueHighValueRequest,
  openChatNaturalIntentLabel,
  buildOpenChatIntentShiftFollowup,
  buildOpenChatNaturalChoiceFollowup,
  buildOpenChatVagueChoiceFollowup,
  buildOpenChatIntentShiftQuestion,
  buildOpenChatResearchOrNarrowChoice,
  openChatNaturalConversationIntent,
  buildOpenChatNaturalConversationAnswer
} = clientOpenChatNaturalFlowUtils;

const clientOpenChatPreLlmGuardUtils = createClientOpenChatPreLlmGuardUtils({
  getState: () => state,
  chatAnswerBody: (answer) => chatAnswerBody(answer),
  chatAnswerKind: (answer) => chatAnswerKind(answer),
  openChatLooksGreetingPrompt: (prompt) => openChatLooksGreetingPrompt(prompt),
  openChatLooksLowInfoTestPrompt: (prompt) => openChatLooksLowInfoTestPrompt(prompt),
  isStructuredOrderBrief: (brief) => isStructuredOrderBrief(brief),
  structuredOrderBriefParts: (brief) => structuredOrderBriefParts(brief),
  inferClientTaskSequence: (taskType, prompt) => inferClientTaskSequence(taskType, prompt),
  currentRoutingTask: () => currentRoutingTask(),
  openChatLooksStandaloneQuestionText: (prompt) => openChatLooksStandaloneQuestionText(prompt),
  openChatProductQuestionContext: (prompt) => openChatProductQuestionContext(prompt),
  openChatPromptInjectionGuard: (prompt) => openChatPromptInjectionGuard(prompt),
  openChatLooksSensitiveSecret: (prompt) => openChatLooksSensitiveSecret(prompt),
  openChatLooksUnsafeRequest: (prompt) => openChatLooksUnsafeRequest(prompt),
  looksJapanese: (value) => looksJapanese(value),
  openChatNormalizeDispatchTask: (taskType, originalPrompt, answer) => openChatNormalizeDispatchTask(taskType, originalPrompt, answer),
  openChatLooksOrderIntentOnly: (prompt) => openChatLooksOrderIntentOnly(prompt),
  lastOpenChatPreparedBrief: () => lastOpenChatPreparedBrief(),
  mergeClarificationAnswersIntoBrief: (brief, answer) => mergeClarificationAnswersIntoBrief(brief, answer),
  buildOpenChatDispatchBriefFromPendingAnswer: (original, prompt, taskType, inputCounts) => buildOpenChatDispatchBriefFromPendingAnswer(original, prompt, taskType, inputCounts),
  openChatReadinessBlock: (taskType, prompt, inputCounts, config) => openChatReadinessBlock(taskType, prompt, inputCounts, config),
  openChatHumanDispatchPreview: (brief, taskType, prompt, inputCounts) => openChatHumanDispatchPreview(brief, taskType, prompt, inputCounts),
  cleanOpenChatClarificationAnswer: (answer) => cleanOpenChatClarificationAnswer(answer),
  openChatReadyToRunBlock: (ja) => openChatReadyToRunBlock(ja),
  openChatPendingLeaderIntakeContext: () => openChatPendingLeaderIntakeContext(),
  openChatChoiceReplyToken: (prompt) => openChatChoiceReplyToken(prompt),
  isOpenChatRunConfirmation: (prompt) => isOpenChatRunConfirmation(prompt),
  openChatFollowupMode: (prompt) => openChatFollowupMode(prompt),
  isOpenChatGenericProceed: (prompt) => isOpenChatGenericProceed(prompt),
  buildOpenChatLeaderChoiceAnswer: (prompt, inputCounts) => buildOpenChatLeaderChoiceAnswer(prompt, inputCounts),
  buildOpenChatLeaderChoiceFollowupAnswer: (prompt, inputCounts) => buildOpenChatLeaderChoiceFollowupAnswer(prompt, inputCounts),
  buildOpenChatPromptInjectionAnswer: (prompt) => buildOpenChatPromptInjectionAnswer(prompt),
  buildOpenChatLongPromptGuardAnswer: (prompt, inputCounts) => buildOpenChatLongPromptGuardAnswer(prompt, inputCounts),
  buildOpenChatRecoveredLeaderIntakeAnswer: (prompt, inputCounts) => buildOpenChatRecoveredLeaderIntakeAnswer(prompt, inputCounts),
  buildOpenChatLeaderIntakeFollowupAnswer: (prompt, inputCounts) => buildOpenChatLeaderIntakeFollowupAnswer(prompt, inputCounts),
  buildOpenChatPatternGuardAnswer: (prompt, inputCounts, config) => buildOpenChatPatternGuardAnswer(prompt, inputCounts, config),
  buildOpenChatPauseAnswer: (prompt) => buildOpenChatPauseAnswer(prompt),
  buildOpenChatStatusAnswer: (prompt) => buildOpenChatStatusAnswer(prompt),
  buildOpenChatLowInfoTestAnswer: (prompt) => buildOpenChatLowInfoTestAnswer(prompt),
  buildOpenChatGreetingAnswer: (prompt) => buildOpenChatGreetingAnswer(prompt),
  buildOpenChatIntentShiftFollowup: (prompt, inputCounts) => buildOpenChatIntentShiftFollowup(prompt, inputCounts),
  buildOpenChatIdeaOperatorFollowup: (prompt, inputCounts) => buildOpenChatIdeaOperatorFollowup(prompt, inputCounts),
  buildOpenChatNaturalChoiceFollowup: (prompt, inputCounts) => buildOpenChatNaturalChoiceFollowup(prompt, inputCounts),
  buildOpenChatVagueChoiceFollowup: (prompt, inputCounts) => buildOpenChatVagueChoiceFollowup(prompt, inputCounts),
  buildOpenChatPendingChoiceReminder: (prompt) => buildOpenChatPendingChoiceReminder(prompt),
  buildOpenChatLeaderCatalogAnswer: (prompt) => buildOpenChatLeaderCatalogAnswer(prompt),
  buildOpenChatRunConfirmationAnswer: (prompt) => buildOpenChatRunConfirmationAnswer(prompt),
  buildOpenChatCommandAnswer: (prompt) => buildOpenChatCommandAnswer(prompt),
  buildOpenChatFollowupAnswer: (prompt, inputCounts) => buildOpenChatFollowupAnswer(prompt, inputCounts),
  buildOpenChatLeaderIntakeAnswer: (prompt, inputCounts) => buildOpenChatLeaderIntakeAnswer(prompt, inputCounts),
  openChatIntentMatchText: (prompt) => openChatIntentMatchText(prompt),
  openChatLooksGeneralHelpPrompt: (prompt) => openChatLooksGeneralHelpPrompt(prompt),
  openChatMustUseLlmFallback: (prompt, fallbackAnswer) => openChatMustUseLlmFallback(prompt, fallbackAnswer),
  shouldDeferOpenChatCommandForAnswer: (prompt) => shouldDeferOpenChatCommandForAnswer(prompt),
  openChatCommandMode: (prompt) => openChatCommandMode(prompt),
  openChatLooksHighStakesAdvice: (prompt) => openChatLooksHighStakesAdvice(prompt)
});
const {
  shouldStoreOpenChatPendingQuestion,
  openChatPendingQuestionTaskType,
  buildOpenChatPendingQuestionFollowupAnswer,
  openChatHasActiveLocalFollowupState,
  buildOpenChatLocalPriorityAnswer,
  buildOpenChatPreLlmGuardAnswer,
  openChatLooksBareTopicPrompt,
  openChatShouldPreferOpenAiReasoning,
  openChatLlmFallbackReason,
  openChatLooksPreorderIntentLlmCandidate
} = clientOpenChatPreLlmGuardUtils;

const clientMarketingTimelineUtils = createClientMarketingTimelineUtils({
  state,
  els,
  articleCandidateFromDelivery: (job, report, files) => articleCandidateFromDelivery(job, report, files),
  compactChatText: (value, max) => compactChatText(value, max),
  copyTextToClipboard: (text, label) => copyTextToClipboard(text, label),
  deliverySummaryText: (report) => deliverySummaryText(report),
  escapeHtml: (value) => escapeHtml(value),
  flash: (message, kind) => flash(message, kind),
  formatTime: (value) => formatTime(value),
  getRenderFlexibleToolPanel: () => renderFlexibleToolPanel,
  jobById: (id) => jobById(id),
  loadOrderDraftIntoComposer: (order) => loadOrderDraftIntoComposer(order),
  looksJapanese: (value) => looksJapanese(value),
  openChatPreviousUserMessageBody: () => openChatPreviousUserMessageBody(),
  openJobDetail: (jobId) => openJobDetail(jobId),
  orderProgressStatusLabel: (status) => orderProgressStatusLabel(status),
  prepareFollowupOrderFromDelivery: () => prepareFollowupOrderFromDelivery(),
  prepareGenericDeliverableOrderFromDelivery: (job, deliverable) => prepareGenericDeliverableOrderFromDelivery(job, deliverable),
  preparePublishOrderFromDelivery: (job, article) => preparePublishOrderFromDelivery(job, article),
  recurringOrderMatchesRequesterScope: (order, scope) => recurringOrderMatchesRequesterScope(order, scope),
  requesterLoginOf: (job) => requesterLoginOf(job),
  requesterScopeForClient: () => requesterScopeForClient(),
  runMatchesRequesterScope: (job, scope) => runMatchesRequesterScope(job, scope),
  runNextAction: (job) => runNextAction(job),
  safeCssToken: (value, fallback) => safeCssToken(value, fallback),
  scheduledWorkById: (id) => scheduledWorkById(id),
  scheduledWorkScheduleLabel: (schedule) => scheduledWorkScheduleLabel(schedule),
  scheduledWorkTimeLabel: (value) => scheduledWorkTimeLabel(value),
  selectedJob: () => selectedJob(),
  setDetail: (job) => setDetail(job),
  setElementVisible: (el, visible) => setElementVisible(el, visible),
  switchTab: (tab) => switchTab(tab),
  renderOrderComposer: () => renderOrderComposer(),
  visibleDeliveryFiles: (files) => visibleDeliveryFiles(files),
  workflowChildRunsFromDelivery: (run, report) => workflowChildRunsFromDelivery(run, report)
});
const {
  buildOpenChatTimelineIntentChoiceAnswer,
  buildOpenChatTimelinePlanClarifyAnswer,
  hideMarketingTimelineModal,
  isMarketingTimelineTask,
  marketingTimelineIntentText,
  marketingTimelineSnapshot,
  openMarketingTimelineModal,
  renderMarketingTimelineModal
} = clientMarketingTimelineUtils;

let clientOpenChatQuickAnswerUtils = null;

clientOpenChatQuickAnswerUtils = createClientOpenChatQuickAnswerUtils({
  getState: () => state,
  looksJapanese: (value) => looksJapanese(value),
  isStructuredOrderBrief: (brief) => isStructuredOrderBrief(brief),
  isOpenChatNoLoginPrompt: (prompt) => isOpenChatNoLoginPrompt(prompt),
  isOpenChatBenignNegativeReply: (prompt) => isOpenChatBenignNegativeReply(prompt),
  isOpenChatRunConfirmation: (prompt) => isOpenChatRunConfirmation(prompt),
  isOpenChatGenericProceed: (prompt) => isOpenChatGenericProceed(prompt),
  isLeaderCatalogQuestionIntentText: (prompt) => isLeaderCatalogQuestionIntentText(prompt),
  lastOpenChatPreparedBrief: () => lastOpenChatPreparedBrief(),
  openChatIntentMatchText: (value) => openChatIntentMatchText(value),
  openChatProductQuestionContext: (prompt) => openChatProductQuestionContext(prompt),
  openChatCommandMode: (prompt) => openChatCommandMode(prompt),
  openChatLooksGreetingPrompt: (prompt) => openChatLooksGreetingPrompt(prompt),
  openChatLooksLowInfoTestPrompt: (prompt) => openChatLooksLowInfoTestPrompt(prompt),
  openChatPromptInjectionGuard: (prompt) => openChatPromptInjectionGuard(prompt),
  openChatLooksSensitiveSecret: (prompt) => openChatLooksSensitiveSecret(prompt),
  openChatLooksUnsafeRequest: (prompt) => openChatLooksUnsafeRequest(prompt),
  openChatLooksHighStakesAdvice: (prompt) => openChatLooksHighStakesAdvice(prompt),
  openChatLooksStandaloneQuestionText: (prompt) => openChatLooksStandaloneQuestionText(prompt),
  openChatHasActiveLocalFollowupState: (prompt) => openChatHasActiveLocalFollowupState(prompt),
  openChatNaturalConversationIntent: (prompt, inputCounts) => openChatNaturalConversationIntent(prompt, inputCounts),
  openChatAiBeginnerNaturalIntent: (prompt, inputCounts) => openChatAiBeginnerNaturalIntent(prompt, inputCounts),
  openChatEngineerNaturalIntent: (prompt, inputCounts) => openChatEngineerNaturalIntent(prompt, inputCounts),
  openChatLooksBareTopicPrompt: (prompt) => openChatLooksBareTopicPrompt(prompt),
  catCompactDispatchBrief: (source, taskType, inputCounts, config) => catCompactDispatchBrief(source, taskType, inputCounts, config),
  inferClientTaskSequence: (taskType, prompt) => inferClientTaskSequence(taskType, prompt),
  buildOpenChatPromptInjectionAnswer: (prompt) => buildOpenChatPromptInjectionAnswer(prompt),
  buildOpenChatLongPromptGuardAnswer: (prompt, inputCounts) => buildOpenChatLongPromptGuardAnswer(prompt, inputCounts),
  buildOpenChatReusableToolsAnswer: (prompt) => buildOpenChatReusableToolsAnswer(prompt),
  buildOpenChatRecoveredLeaderIntakeAnswer: (prompt, inputCounts) => buildOpenChatRecoveredLeaderIntakeAnswer(prompt, inputCounts),
  buildOpenChatLeaderIntakeFollowupAnswer: (prompt, inputCounts) => buildOpenChatLeaderIntakeFollowupAnswer(prompt, inputCounts),
  buildOpenChatPendingQuestionFollowupAnswer: (prompt, inputCounts) => buildOpenChatPendingQuestionFollowupAnswer(prompt, inputCounts),
  buildOpenChatPatternGuardAnswer: (prompt, inputCounts, config) => buildOpenChatPatternGuardAnswer(prompt, inputCounts, config),
  buildOpenChatLowInfoTestAnswer: (prompt) => buildOpenChatLowInfoTestAnswer(prompt),
  buildOpenChatGreetingAnswer: (prompt) => buildOpenChatGreetingAnswer(prompt),
  buildOpenChatIntentShiftFollowup: (prompt, inputCounts) => buildOpenChatIntentShiftFollowup(prompt, inputCounts),
  buildOpenChatIdeaOperatorFollowup: (prompt, inputCounts) => buildOpenChatIdeaOperatorFollowup(prompt, inputCounts),
  buildOpenChatNaturalChoiceFollowup: (prompt, inputCounts) => buildOpenChatNaturalChoiceFollowup(prompt, inputCounts),
  buildOpenChatVagueChoiceFollowup: (prompt, inputCounts) => buildOpenChatVagueChoiceFollowup(prompt, inputCounts),
  buildOpenChatPendingChoiceReminder: (prompt) => buildOpenChatPendingChoiceReminder(prompt),
  buildOpenChatLeaderIntakeAnswer: (prompt, inputCounts) => buildOpenChatLeaderIntakeAnswer(prompt, inputCounts),
  buildOpenChatRepairAnswer: (prompt) => buildOpenChatRepairAnswer(prompt),
  buildOpenChatPauseAnswer: (prompt) => buildOpenChatPauseAnswer(prompt),
  buildOpenChatStatusAnswer: (prompt) => buildOpenChatStatusAnswer(prompt),
  buildOpenChatTimelineIntentChoiceAnswer: (prompt) => buildOpenChatTimelineIntentChoiceAnswer(prompt),
  buildOpenChatCeoIdeaAnswer: (prompt, inputCounts) => buildOpenChatCeoIdeaAnswer(prompt, inputCounts),
  buildOpenChatCommandAnswer: (prompt) => buildOpenChatCommandAnswer(prompt),
  buildOpenChatFollowupAnswer: (prompt, inputCounts) => buildOpenChatFollowupAnswer(prompt, inputCounts),
  buildOpenChatAssistAnswer: (prompt, inputCounts) => buildOpenChatAssistAnswer(prompt, inputCounts),
  buildOpenChatIntentShiftQuestion: (prompt, inputCounts) => buildOpenChatIntentShiftQuestion(prompt, inputCounts),
  buildOpenChatResearchOrNarrowChoice: (prompt, inputCounts) => buildOpenChatResearchOrNarrowChoice(prompt, inputCounts),
  buildOpenChatNaturalConversationAnswer: (prompt, inputCounts) => buildOpenChatNaturalConversationAnswer(prompt, inputCounts),
  productName: PRODUCT_NAME,
  temporaryInvoiceBillingEnabled: TEMPORARY_INVOICE_BILLING_ENABLED
});

const clientOpenChatIntakeUtils = createOpenChatIntakeUtils({
  getState: () => state,
  getEls: () => els,
  normalizeOpenChatIntentText: (value) => normalizeOpenChatIntentText(value),
  openChatIntentMatchText: (value) => openChatIntentMatchText(value),
  currentRoutingTask: () => currentRoutingTask(),
  inferClientTaskSequence: (taskType, prompt) => inferClientTaskSequence(taskType, prompt),
  looksJapanese: (value) => looksJapanese(value),
  openChatConversationContextForLlm: () => openChatConversationContextForLlm(),
  currentRunTargetAgent: () => currentRunTargetAgent(),
  agentTaskFit: (agent, taskType) => agentTaskFit(agent, taskType),
  structuredOrderBriefParts: (brief) => structuredOrderBriefParts(brief),
  isStructuredOrderBrief: (brief) => isStructuredOrderBrief(brief),
  catCompactDispatchBrief: (source, taskType, inputCounts, config) => catCompactDispatchBrief(source, taskType, inputCounts, config),
  openChatPreviousUserMessageBody: () => openChatPreviousUserMessageBody(),
  openChatPreviousAgentMessageBody: () => openChatPreviousAgentMessageBody()
});
const {
  openChatSourceText,
  openChatClarifyingQuestions,
  openChatIsLeaderIntakeTask,
  openChatLeaderIntakeProfile,
  openChatImplicitLeaderIntakeTask,
  openChatLeaderIntakeSignals,
  openChatMissingLeaderIntakeFields,
  openChatNormalizeLeaderIntakeTask,
  openChatCanonicalOrderTaskType,
  clearPinnedAgentIfMismatchedTask,
  clearPinnedAgentIfMismatchedBrief,
  openChatUserOnlyContextForIntake,
  normalizeOpenChatDynamicLeaderIntakeQuestions,
  buildOpenChatLeaderIntakeClarifyAnswer,
  openChatPendingLeaderIntakeContext,
  combinedLeaderIntakePrompt,
  buildOpenChatLeaderChoiceAnswer,
  buildOpenChatLeaderChoiceFollowupAnswer,
  buildOpenChatRecoveredLeaderIntakeAnswer,
  openChatNormalizeDispatchTask,
  openChatLooksOrderIntentOnly,
  openChatLooksNumberedLeaderIntakeAnswer,
  openChatLeaderHasMinimumRouteContext,
  buildOpenChatDispatchBriefFromPendingAnswer,
  buildOpenChatLeaderIntakeFollowupAnswer,
  buildOpenChatLeaderIntakeAnswer
} = clientOpenChatIntakeUtils;

const clientAnswerUtils = createClientAnswerUtils({
  looksJapanese: (value) => looksJapanese(value),
  isStructuredOrderBrief: (brief) => isStructuredOrderBrief(brief),
  structuredOrderBriefParts: (brief) => structuredOrderBriefParts(brief),
  inferClientTaskSequence: (taskType, prompt) => inferClientTaskSequence(taskType, prompt),
  currentRoutingTask: () => currentRoutingTask(),
  openChatHumanDispatchPreview: (brief, taskType, prompt, inputCounts) => openChatHumanDispatchPreview(brief, taskType, prompt, inputCounts),
  stripStandaloneInternalBriefsFromChatBody: (body) => stripStandaloneInternalBriefsFromChatBody(body),
  stripInternalBriefFromChatBody: (body, brief, preview) => stripInternalBriefFromChatBody(body, brief, preview),
  guestTrialPromoTextForDraft: (draft, prompt) => guestTrialPromoTextForDraft(draft, prompt),
  currentOrderDraft: () => currentOrderDraft(),
  openChatLooksNumberedLeaderIntakeAnswer: (prompt) => openChatLooksNumberedLeaderIntakeAnswer(prompt),
  hasOpenChatPendingLeaderIntake: () => Boolean(openChatPendingLeaderIntakeContext()),
  hasOpenChatPendingQuestionPrompt: () => Boolean(state.openChatPendingQuestionPrompt),
  isOpenChatExplicitDispatchRequest: (prompt) => isOpenChatExplicitDispatchRequest(prompt),
  lastOpenChatPreparedBrief: () => lastOpenChatPreparedBrief(),
  isOpenChatRunConfirmation: (prompt) => isOpenChatRunConfirmation(prompt),
  openChatLooksConfirmOrderChoice: (prompt) => openChatLooksConfirmOrderChoice(prompt),
  isOpenChatGenericProceed: (prompt) => isOpenChatGenericProceed(prompt),
  openChatVagueChoicePrompt: () => state.openChatVagueChoicePrompt,
  openChatNaturalChoiceIntent: () => state.openChatNaturalChoiceIntent,
  openChatProductQuestionContext: (prompt) => openChatProductQuestionContext(prompt),
  openChatReadiness: (taskType, prompt, inputCounts) => openChatReadiness(taskType, prompt, inputCounts)
});
const {
  chatAnswerDisplayBody,
  isOpenChatClarificationAnswer,
  cleanOpenChatClarificationAnswer,
  mergeClarificationAnswersIntoBrief,
  openChatAnswerMustPauseForSendOrder,
  openChatCanDirectDispatchAssistAnswer,
  buildOpenChatPendingChoiceReminder,
  buildOpenChatTrioDiscussion,
  renderOpenChatTrioTurns
} = clientAnswerUtils;

const chatRenderUtils = createChatRenderUtils({
  looksJapanese: (value) => looksJapanese(value),
  workOrderUiLabels: () => workOrderUiLabels(),
  formatWorkUiText: (value) => formatWorkUiText(value),
  safeCssToken: (value, fallback) => safeCssToken(value, fallback)
});
const {
  openChatStepItems,
  openChatPreviewSteps,
  renderChatSteps,
  renderChatActions
} = chatRenderUtils;

const chatMessageRenderer = createChatMessageRenderer({
  productShortName: PRODUCT_SHORT_NAME,
  internalStatusVisible: WORK_CHAT_INTERNAL_STATUS_VISIBLE,
  renderChatSteps: (steps) => renderChatSteps(steps),
  renderOpenChatTrioTurns: (turns) => renderOpenChatTrioTurns(turns),
  renderChatActions: (actions) => renderChatActions(actions),
  stripStandaloneInternalBriefsFromChatBody: (body) => stripStandaloneInternalBriefsFromChatBody(body),
  formatWorkUiTextSafe: (body) => formatWorkUiTextSafe(body)
});
const {
  renderChatMessage
} = chatMessageRenderer;

const openChatSessionUtils = createOpenChatSessionUtils({
  productShortName: PRODUCT_SHORT_NAME,
  getCurrentSessionId: () => state.currentOpenChatSessionId || '',
  isStructuredOrderBrief: (value) => isStructuredOrderBrief(value),
  extractPreparedBriefFromChatText: (value) => extractPreparedBriefFromChatText(value),
  openChatDecisionBriefKey: (brief) => openChatDecisionBriefKey(brief)
});
const {
  normalizeOpenChatMode,
  serializeOpenChatMessageForSession,
  makeOpenChatSessionId,
  openChatSessionHasLinkedWork,
  normalizeOpenChatSession,
  hasOpenChatSessionPayloadContent,
  openChatSessionsShareIdentity,
  dedupeOpenChatSessionsForDisplay,
  upsertOpenChatSessionCollection,
  openChatSessionTimeLabel
} = openChatSessionUtils;

const clientAnalyticsUtils = createClientAnalyticsUtils({
  getState: () => state,
  getCsrfToken: () => state.snapshot?.auth?.csrfToken || '',
  getCurrentTab: () => state.currentTab || '',
  getCurrentRoutingTask: () => currentRoutingTask(),
  getRequestedOrderStrategy: () => requestedOrderStrategy(),
  getCurrentOrderStrategy: () => currentOrderStrategy(),
  ensureCurrentOpenChatSessionId: (options) => ensureCurrentOpenChatSessionId(options)
});
const {
  initAnalytics,
  trackAuthCompletion,
  trackChatTranscript,
  trackConversionEvent,
  trackConversionOnce,
  trackLoginStarted,
  trackOpenChatSubmitTranscript,
  trackPageViewOnce,
  summarizeOrderDraftForAnalytics,
  visitorId
} = clientAnalyticsUtils;

const clientOrderRoutingController = createClientOrderRoutingController({
  state,
  els,
  productShortName: PRODUCT_SHORT_NAME,
  agentHealth: (...args) => agentHealth(...args),
  agentRoutingScore: (...args) => agentRoutingScore(...args),
  agentTaskFit: (...args) => agentTaskFit(...args),
  clientTaskMatch: (...args) => clientTaskMatch(...args),
  currentRoutingTask: () => currentRoutingTask(),
  currentRunTargetAgent: () => currentRunTargetAgent(),
  currentServerResolvedIntentForPrompt: (prompt) => currentServerResolvedIntentForPrompt(prompt),
  estimateWindowOfAgent: (...args) => estimateWindowOfAgent(...args),
  flash: (...args) => flash(...args),
  renderOrderComposer: () => renderOrderComposer(),
  trackConversionEvent: (...args) => trackConversionEvent(...args),
  yen: (...args) => yen(...args)
});
const {
  currentOrderStrategy,
  estimateForRoutingDecision,
  formatEstimateBrief,
  isAutoWorkflowSpecialtyTask,
  isRepoBackedCodeOrderIntent,
  orderRoutingDecision,
  orderStrategyLabel,
  plannedMultiAgents,
  renderOrderStrategyControls,
  requestedOrderStrategy,
  setOrderStrategyChoice
} = clientOrderRoutingController;

const clientRouteAuthController = createClientRouteAuthController({
  state,
  els,
  safeAnalyticsString,
  visitorId: () => visitorId(),
  githubAuthActionUrl: (auth) => githubAuthActionUrl(auth),
  trackLoginStarted: (...args) => trackLoginStarted(...args),
  renderReleaseAccess: (...args) => renderReleaseAccess(...args),
  renderAgentSetupFlow: (...args) => renderAgentSetupFlow(...args),
  render: (...args) => render(...args),
  switchTab: (...args) => switchTab(...args),
  requireStartLoginGate: (...args) => requireStartLoginGate(...args)
});
const {
  readRememberedTab,
  clearRememberedTab,
  rememberTab,
  loginReturnPathForTab,
  buildLoginPageUrl,
  openDedicatedLoginPage,
  currentPrivateReturnTab,
  openLoginForProtectedAction,
  openGithubSignIn,
  fetchFastAuthStatus,
  applyFastAuthStatusForAuthCheck,
  primeAuthCheckFromStatus,
  readRememberedAuthState,
  rememberAuthState,
  normalizeTab,
  normalizeSettingsSection,
  readInitialRouteState,
  syncRouteState,
  openStartFromLogo,
  defaultLoggedInTab,
  openAgentsGithubFlow
} = clientRouteAuthController;

const clientSettingsBillingController = createClientSettingsBillingController({
  els,
  state,
  currentMonthPeriod: () => currentMonthPeriod(),
  developerSurfacesStatus: DEVELOPER_SURFACES_STATUS,
  escapeHtml: (value) => escapeHtml(value),
  formatTime: (value) => formatTime(value),
  fundingBreakdownCompact: (job) => fundingBreakdownCompact(job),
  orderProgressStatusLabel: (status) => orderProgressStatusLabel(status),
  renderOrderApiKeys: (account, auth) => renderOrderApiKeys(account, auth),
  requireStartLoginGate: (targetTab, reason) => requireStartLoginGate(targetTab, reason),
  safeCssToken: (value, fallback) => safeCssToken(value, fallback),
  safeText: (el, value) => safeText(el, value),
  setDetail: (value) => setDetail(value),
  setElementVisible: (element, visible) => setElementVisible(element, visible),
  setInputValue: (el, value) => setInputValue(el, value),
  switchTab: (tab, options) => switchTab(tab, options),
  syncRouteState: () => syncRouteState()
});
const {
  renderBilling,
  renderBillingAudits,
  renderSettings,
  renderSettingsFlow,
  openSettingsSection
} = clientSettingsBillingController;

const clientFlexibleToolUtils = createClientFlexibleToolUtils({
  state,
  els,
  workActionIds: WORK_ACTION_IDS,
  productShortName: PRODUCT_SHORT_NAME,
  workChatInternalStatusVisible: WORK_CHAT_INTERNAL_STATUS_VISIBLE,
  orderInputFromComposer: () => orderInputFromComposer(),
  orderInputCounts: (input) => orderInputCounts(input),
  openChatLooksGreetingPrompt: (prompt) => openChatLooksGreetingPrompt(prompt),
  openChatLooksLowInfoTestPrompt: (prompt) => openChatLooksLowInfoTestPrompt(prompt),
  connectorActionLabel: (action) => connectorActionLabel(action),
  isExplicitClientLeaderTask: (task, text) => isExplicitClientLeaderTask(task, text),
  currentRoutingTask: () => currentRoutingTask(),
  marketingTimelineSnapshot: (selected, options) => marketingTimelineSnapshot(selected, options),
  marketingTimelineIntentText: (text) => marketingTimelineIntentText(text),
  isOpenChatClarifyMode: () => isOpenChatClarifyMode(),
  trackConversionEvent: (event, meta) => trackConversionEvent(event, meta),
  setElementVisible: (el, visible) => setElementVisible(el, visible),
  safeText: (el, value) => safeText(el, value),
  escapeHtml: (value) => escapeHtml(value),
  renderOrderComposer: () => renderOrderComposer(),
  openMarketingTimelineModal: () => openMarketingTimelineModal(),
  openSettingsSection: (section) => openSettingsSection(section),
  switchTab: (tab) => switchTab(tab),
  openGithubSignIn: () => openGithubSignIn(),
  connectXAccount: () => connectXAccount(),
  openAgentListingFlow: () => openAgentListingFlow(),
  openAgentCatalog: () => openAgentCatalog()
});
const {
  flexibleToolCandidates,
  activeFlexibleTool,
  trackFlexibleToolEvent,
  renderFlexibleToolPanel,
  addFlexibleToolInstruction
} = clientFlexibleToolUtils;

const clientRunComposerController = createClientRunComposerController({
  state,
  els,
  productName: PRODUCT_NAME,
  productShortName: PRODUCT_SHORT_NAME,
  workChatInternalStatusVisible: WORK_CHAT_INTERNAL_STATUS_VISIBLE,
  inAppPaymentsRemoved: IN_APP_PAYMENTS_REMOVED,
  agentHealth: (...args) => agentHealth(...args),
  agentTaskFit: (...args) => agentTaskFit(...args),
  agentVerifyAction: (...args) => agentVerifyAction(...args),
  canOrderFromBrowser: (...args) => canOrderFromBrowser(...args),
  chatAnswerKind: (...args) => chatAnswerKind(...args),
  currentEffectiveOrderPrompt: () => currentEffectiveOrderPrompt(),
  currentRoutingTask: () => currentRoutingTask(),
  currentRunTargetAgent: () => currentRunTargetAgent(),
  currentVisibleOrderPrompt: () => currentVisibleOrderPrompt(),
  escapeHtml: (...args) => escapeHtml(...args),
  estimateWindowOfAgent: (...args) => estimateWindowOfAgent(...args),
  formatDisplayCurrency: (...args) => formatDisplayCurrency(...args),
  formatPercent: (...args) => formatPercent(...args),
  formatSecRange: (...args) => formatSecRange(...args),
  formatWorkUiText: (...args) => formatWorkUiText(...args),
  isOpenChatClarifyMode: () => isOpenChatClarifyMode(),
  isOpenChatDispatchReadyPrompt: (...args) => isOpenChatDispatchReadyPrompt(...args),
  isStructuredOrderBrief: (...args) => isStructuredOrderBrief(...args),
  lastOpenChatPreparedBrief: () => lastOpenChatPreparedBrief(),
  looksLikeAgentSkillMarkdown: (...args) => looksLikeAgentSkillMarkdown(...args),
  openChatLooksPreorderIntentLlmCandidate: (...args) => openChatLooksPreorderIntentLlmCandidate(...args),
  openChatMustUseLlmFallback: (...args) => openChatMustUseLlmFallback(...args),
  orderInputCounts: (...args) => orderInputCounts(...args),
  orderInputFromComposer: () => orderInputFromComposer(),
  orderRoutingDecision: (...args) => orderRoutingDecision(...args),
  orderStrategyLabel: () => orderStrategyLabel(),
  quickOrderChatAnswer: (...args) => quickOrderChatAnswer(...args),
  readyAgentsForTask: (...args) => readyAgentsForTask(...args),
  renderFlexibleToolPanel: () => renderFlexibleToolPanel(),
  renderFollowupContextCard: () => renderFollowupContextCard(),
  renderIntakePanel: () => renderIntakePanel(),
  renderOpenChatChoiceBar: () => renderOpenChatChoiceBar(),
  renderOpenChatModeControls: () => renderOpenChatModeControls(),
  renderOpenChatSessionControls: () => renderOpenChatSessionControls(),
  renderOrderAgentPicker: () => renderOrderAgentPicker(),
  renderOrderInputFilesSummary: () => renderOrderInputFilesSummary(),
  renderOrderInputGuide: () => renderOrderInputGuide(),
  renderOrderSettingsDrawer: () => renderOrderSettingsDrawer(),
  renderOrderStrategyControls: () => renderOrderStrategyControls(),
  renderParallelOrderQueue: () => renderParallelOrderQueue(),
  renderParallelTools: () => renderParallelTools(),
  renderWorkChatEntryCard: (...args) => renderWorkChatEntryCard(...args),
  renderWorkChatThread: () => renderWorkChatThread(),
  selectedAgent: () => selectedAgent(),
  setElementVisible: (...args) => setElementVisible(...args),
  workOrderUiLabels: () => workOrderUiLabels(),
  yen: (...args) => yen(...args)
});
const {
  createJobButtonTextForCurrentInput,
  renderOrderComposer,
  renderRunAgentContext,
  renderRunCreateStatus,
  renderRunEstimateCard,
  syncCreateJobButtonForCurrentPrompt,
  updateWorkChatStatusCard
} = clientRunComposerController;

let openChatTypingTimer = null;
let liveSnapshotRefreshTimer = null;
let openChatMessageSequence = 0;
let orderComposerInputTimer = null;
const ORDER_COMPOSER_INPUT_DEBOUNCE_MS = 260;

const clientRunHistoryController = createClientRunHistoryController({
  state,
  els,
  orderHistoryPageSize: ORDER_HISTORY_PAGE_SIZE,
  escapeHtml,
  fundingBreakdownCompact,
  orderProgressStatusLabel,
  renderMarketingTimelineModal,
  requesterAccountIdOf,
  requesterLoginOf,
  requesterMatchesScope,
  requesterScopeForClient,
  runNextAction,
  safeCssToken,
  setDetail,
  sinceLabel,
  yen
});

const {
  renderJobs,
  renderRunHealth,
  renderStream
} = clientRunHistoryController;

const clientOpenChatOrderProgressUtils = createClientOpenChatOrderProgressUtils({
  productShortName: PRODUCT_SHORT_NAME,
  openChatSessionMaxMessages: OPEN_CHAT_SESSION_MAX_MESSAGES,
  orderHistoryOptimisticTtlMs: ORDER_HISTORY_OPTIMISTIC_TTL_MS,
  openChatOrderProgressMaxPolls: OPEN_CHAT_ORDER_PROGRESS_MAX_POLLS,
  openChatOrderProgressPollMs: OPEN_CHAT_ORDER_PROGRESS_POLL_MS,
  state,
  els,
  api: (...args) => api(...args),
  getVisitorId: () => visitorId(),
  trackChatTranscript: (...args) => trackChatTranscript(...args),
  looksJapanese: (value) => looksJapanese(value),
  requesterIdentityKeys: (auth) => requesterIdentityKeys(auth),
  authorityRequestFromReport: (report) => authorityRequestFromReport(report),
  authorityRequestRequiresClientApproval: (authority) => authorityRequestRequiresClientApproval(authority),
  normalizeClientList: (value, fallback) => normalizeClientList(value, fallback),
  normalizeClientConnector: (value) => normalizeClientConnector(value),
  normalizeClientConnectorCapabilityList: (value, fallback) => normalizeClientConnectorCapabilityList(value, fallback),
  connectorActionForChat: (connector) => connectorActionForChat(connector),
  updateWorkChatStatusCard: (title, body, tone) => updateWorkChatStatusCard(title, body, tone),
  renderWorkChatThread: () => renderWorkChatThread(),
  persistCurrentOpenChatSession: () => persistCurrentOpenChatSession(),
  markCurrentOpenChatSessionLinkedOrder: (orderId, options) => markCurrentOpenChatSessionLinkedOrder(orderId, options),
  readOpenChatSessions: () => readOpenChatSessions(),
  renderJobs: (jobs) => renderJobs(jobs),
  setDetail: (job) => setDetail(job),
  finishOpenChatTyping: (options) => finishOpenChatTyping(options),
  makeOpenChatMessageId: () => makeOpenChatMessageId()
});
const {
  appendOpenChatOrderProgressMessage,
  backfillTrackedJobsIntoSnapshot,
  clearOpenChatAcceptanceProgressTimer,
  clearOpenChatOrderProgressTimer,
  clearOpenChatPendingDispatchMessage,
  clientOrderIdFromOrderCreate,
  createdOrderPrimaryId,
  makeClientOrderId,
  mergeOptimisticOrderJobsIntoSnapshot,
  orderAcceptanceProgressBody,
  orderProgressMessageFromCreated,
  recoverAcceptedOrderAfterCreateError,
  revealCreatedOrderInHistory,
  startOpenChatAcceptanceProgress,
  startOpenChatOrderProgressPolling,
  syncOpenChatTrackedJobsFromSnapshot,
  upsertOpenChatOrderProgressMessage,
  upsertOpenChatPendingDispatchMessage
} = clientOpenChatOrderProgressUtils;

const clientDeliveryActionController = createClientDeliveryActionController({
  state,
  els,
  api: (...args) => api(...args),
  appendOrderChatExchange: (...args) => appendOrderChatExchange(...args),
  apiPayloadFromOrderDraftWithChatSession: (...args) => apiPayloadFromOrderDraftWithChatSession(...args),
  chatEngineIsNeedsInputResponse: (...args) => chatEngineIsNeedsInputResponse(...args),
  clearFollowupContext: (...args) => clearFollowupContext(...args),
  connectorActionForChat: (...args) => connectorActionForChat(...args),
  connectorStatusForClient: (...args) => connectorStatusForClient(...args),
  copyTextToClipboard: (...args) => copyTextToClipboard(...args),
  createdOrderPrimaryId: (...args) => createdOrderPrimaryId(...args),
  downloadDeliveryFile: (...args) => downloadDeliveryFile(...args),
  downloadDeliverySummaryFile: (...args) => downloadDeliverySummaryFile(...args),
  downloadDeliveryZip: (...args) => downloadDeliveryZip(...args),
  ensureCurrentOpenChatSessionId: (...args) => ensureCurrentOpenChatSessionId(...args),
  escapeHtml: (...args) => escapeHtml(...args),
  flash: (...args) => flash(...args),
  focusWorkResults: (...args) => focusWorkResults(...args),
  handleNeedsInputResponse: (...args) => handleNeedsInputResponse(...args),
  handleOrderFundingPrompt: (...args) => handleOrderFundingPrompt(...args),
  handleOrderPreflightPrompt: (...args) => handleOrderPreflightPrompt(...args),
  findLoadedGithubRepo: (...args) => findLoadedGithubRepo(...args),
  isGithubLinked: (...args) => isGithubLinked(...args),
  loadOrderDraftIntoComposer: (...args) => loadOrderDraftIntoComposer(...args),
  looksJapanese: (...args) => looksJapanese(...args),
  markCurrentOpenChatSessionLinkedOrder: (...args) => markCurrentOpenChatSessionLinkedOrder(...args),
  mergeProgressJobIntoSnapshot: (...args) => mergeProgressJobIntoSnapshot(...args),
  normalizeClientConnector: (...args) => normalizeClientConnector(...args),
  normalizeClientConnectorCapabilityList: (...args) => normalizeClientConnectorCapabilityList(...args),
  normalizeClientList: (...args) => normalizeClientList(...args),
  normalizeOrderProgressStatus: (...args) => normalizeOrderProgressStatus(...args),
  normalizeRepoFullName: (...args) => normalizeRepoFullName(...args),
  openJobDetail: (...args) => openJobDetail(...args),
  openGithubSignIn: (...args) => openGithubSignIn(...args),
  openLoginForProtectedAction: (...args) => openLoginForProtectedAction(...args),
  openSettingsSection: (...args) => openSettingsSection(...args),
  orderProgressMeta: (...args) => orderProgressMeta(...args),
  orderProgressTone: (...args) => orderProgressTone(...args),
  preflightFromError: (...args) => preflightFromError(...args),
  refresh: (...args) => refresh(...args),
  renderDeliveryFilesPanel: (...args) => renderDeliveryFilesPanel(...args),
  renderRunDelivery: (...args) => renderRunDelivery(...args),
  renderWorkflowChildNote: (...args) => renderWorkflowChildNote(...args),
  renderWorkflowTeamSummary: (...args) => renderWorkflowTeamSummary(...args),
  revealCreatedOrderInHistory: (...args) => revealCreatedOrderInHistory(...args),
  scheduledWorkTimeLabel: (...args) => scheduledWorkTimeLabel(...args),
  selectedJob: (...args) => selectedJob(...args),
  selectedRepoFromPicker: (...args) => selectedRepoFromPicker(...args),
  setDetail: (...args) => setDetail(...args),
  summarizeOrderDraftForAnalytics: (...args) => summarizeOrderDraftForAnalytics(...args),
  switchTab: (...args) => switchTab(...args),
  trackChatTranscript: (...args) => trackChatTranscript(...args),
  trackConversionEvent: (...args) => trackConversionEvent(...args),
  updateCliPanels: (...args) => updateCliPanels(...args),
  upsertOpenChatOrderProgressMessage: (...args) => upsertOpenChatOrderProgressMessage(...args),
  validateOrderDraft: (...args) => validateOrderDraft(...args),
  visitorId: (...args) => visitorId(...args),
  xApprovalPayloadForClient: (...args) => xApprovalPayloadForClient(...args),
  xConnectorIdentityForClient: (...args) => xConnectorIdentityForClient(...args)
});
const {
  authorityOwnerLabelForRun,
  authorityRequestFromReport,
  authorityRequestRequiresClientApproval,
  describeAuthorityNeed,
  executePreparedGenericDeliverable,
  genericDeliverableAuthoritySummary,
  googleExecutorPreferences,
  googleIncludeGroupsFromAuthorityRequest,
  loadGoogleSourcesForGenericDeliverable,
  normalizeGoogleIncludeGroup,
  prepareFollowupOrderFromDelivery,
  prepareGenericDeliverableExecutionSeed,
  prepareGenericDeliverableOrderFromDelivery,
  preparePublishOrderFromDelivery,
  bindRunDeliveryInteractions,
  renderDeliveryPublishCard,
  renderGenericDeliverableCard,
  renderRunDeliverySections,
  saveGithubExecutorPreferences,
  saveGoogleExecutorPreferences,
  saveXExecutorPreferences,
  schedulePreparedGenericDeliverable,
  sendFollowupToAgentFromDelivery,
  setGenericDeliverableAuthorityRequired,
  setGenericDeliverableExecutionStopped,
  suggestedSocialPostText,
  updateGenericDeliverableDraft
} = clientDeliveryActionController;

function scheduleOrderComposerRender() {
  if (orderComposerInputTimer) window.clearTimeout(orderComposerInputTimer);
  orderComposerInputTimer = window.setTimeout(() => {
    orderComposerInputTimer = null;
    renderOrderComposer();
  }, ORDER_COMPOSER_INPUT_DEBOUNCE_MS);
}

function cancelOrderComposerRender() {
  if (!orderComposerInputTimer) return;
  window.clearTimeout(orderComposerInputTimer);
  orderComposerInputTimer = null;
}

function makeOpenChatMessageId() {
  openChatMessageSequence += 1;
  return `open-chat-${Date.now()}-${openChatMessageSequence}`;
}

function clearOpenChatTypingTimer() {
  if (!openChatTypingTimer) return;
  window.clearInterval(openChatTypingTimer);
  openChatTypingTimer = null;
}

function finishOpenChatTyping(options = {}) {
  clearOpenChatTypingTimer();
  let changed = false;
  state.orderChatMessages = (Array.isArray(state.orderChatMessages) ? state.orderChatMessages : []).map((message) => {
    if (!message?.typing) return message;
    const { fullBody, ...rest } = message;
    changed = true;
    return { ...rest, body: String(fullBody || message.body || ''), typing: false };
  });
  if (changed && options.render !== false) renderWorkChatThread();
}

function shouldAnimateOpenChatAnswer(answer, answerBody = '') {
  if (!String(answerBody || '').trim()) return false;
  return chatAnswerKind(answer) !== 'command';
}

function startOpenChatTyping(messageId) {
  clearOpenChatTypingTimer();
  const findTypingMessage = () => (Array.isArray(state.orderChatMessages) ? state.orderChatMessages : [])
    .find((message) => message?.id === messageId && message.typing);
  const message = findTypingMessage();
  const fullBody = String(message?.fullBody || '');
  const chars = Array.from(fullBody);
  if (!message || !chars.length) {
    finishOpenChatTyping();
    return;
  }

  const intervalMs = 28;
  const targetMs = Math.max(850, Math.min(3800, chars.length * 10));
  const charsPerTick = Math.max(2, Math.ceil(chars.length / (targetMs / intervalMs)));
  let visibleChars = 0;

  openChatTypingTimer = window.setInterval(() => {
    const current = findTypingMessage();
    if (!current) {
      clearOpenChatTypingTimer();
      return;
    }
    visibleChars = Math.min(chars.length, visibleChars + charsPerTick);
    current.body = chars.slice(0, visibleChars).join('');
    if (visibleChars >= chars.length) {
      current.body = fullBody;
      current.typing = false;
      delete current.fullBody;
      clearOpenChatTypingTimer();
    }
    renderWorkChatThread();
  }, intervalMs);
}

function startOpenChatThinking(prompt = '') {
  finishOpenChatTyping({ render: false });
  const ja = looksJapanese(prompt);
  const messageId = makeOpenChatMessageId();
  const body = ja
    ? 'CAItが意図を整理しています'
    : 'CAIt is thinking through the request';
  state.orderChatMessages = [
    ...(Array.isArray(state.orderChatMessages) ? state.orderChatMessages : []),
    {
      id: messageId,
      role: 'agent',
      label: PRODUCT_SHORT_NAME,
      body,
      tone: 'info',
      typing: true,
      thinking: true
    }
  ];
  updateWorkChatStatusCard(
    ja ? 'CAItが考えています。' : 'CAIt is thinking.',
    ja ? '意図を確認して、チャット回答か発注準備かを判断しています。' : 'Checking intent before choosing chat answer or order prep.',
    'info'
  );
  renderWorkChatThread();
  return messageId;
}

function stopOpenChatThinking(messageId = '', options = {}) {
  if (!messageId) return;
  const before = Array.isArray(state.orderChatMessages) ? state.orderChatMessages.length : 0;
  state.orderChatMessages = (Array.isArray(state.orderChatMessages) ? state.orderChatMessages : [])
    .filter((message) => !(message?.id === messageId && message.thinking));
  if (state.orderChatMessages.length !== before && options.render !== false) renderWorkChatThread();
}

function clearLiveSnapshotRefreshTimer() {
  if (!liveSnapshotRefreshTimer) return;
  window.clearTimeout(liveSnapshotRefreshTimer);
  liveSnapshotRefreshTimer = null;
}

function hasActiveLiveJobs(snapshot = state.snapshot || {}) {
  const jobs = Array.isArray(snapshot?.jobs) ? snapshot.jobs : [];
  return jobs.some((job) => isActiveLiveOrderStatus(job?.status || ''));
}

function isActiveLiveOrderStatus(status = '') {
  return ['queued', 'claimed', 'running', 'dispatched', 'created'].includes(normalizeOrderProgressStatus(status));
}

function hasActiveOpenChatOrderProgress() {
  const messages = Array.isArray(state.orderChatMessages) ? state.orderChatMessages : [];
  return messages.some((message) => {
    if (message?.pendingDispatch === true) return true;
    if (!message?.orderProgressId && !message?.workflowParentId) return false;
    return isActiveLiveOrderStatus(message?.orderProgressStatus || '');
  });
}

function scheduleLiveSnapshotRefresh(snapshot = state.snapshot || {}) {
  clearLiveSnapshotRefreshTimer();
  if (!hasActiveLiveJobs(snapshot)) return;
  liveSnapshotRefreshTimer = window.setTimeout(() => {
    liveSnapshotRefreshTimer = null;
    void refresh().catch(() => {});
  }, LIVE_SNAPSHOT_REFRESH_MS);
}

function guestTrialAlreadyUsedLocally(auth = state.snapshot?.auth || {}) {
  return false;
}

function markGuestTrialUsedLocally(result = null) {
  return null;
}

function shouldOfferGuestTrialForDraft(draft = currentOrderDraft()) {
  return false;
}

function guestTrialPromoTextForDraft(draft = currentOrderDraft(), prompt = draft?.prompt || '') {
  const auth = state.snapshot?.auth || {};
  if (canOrderFromBrowser(auth)) return '';
  if (looksJapanese(prompt || draft?.prompt || '')) {
    return [
      '実行はログイン後のみです。',
      'CAItはオープンソースなので利用はフリーです。ただしOpenAI/APIコストがかかるため、1アカウント月10ドルまでで止まります。'
    ].join('\n');
  }
  return [
    'Dispatch requires sign-in.',
    'CAIt is free to use because it is open source. OpenAI/API calls still cost money, so each account stops at $10 per month.'
  ].join('\n');
}

async function maybeClaimGuestTrialCredits(auth = state.snapshot?.auth || {}) {
  return null;
}

function listCreatorEstimateForDraft(draft = {}) {
  const taskType = normalizeTaskTypeToken(draft.task_type || draft.taskType || currentRoutingTask());
  if (taskType !== 'list_creator') return null;
  const requestedCount = inferListCreatorRequestedCount([
    draft.prompt,
    draft.goal,
    draft.input,
    currentEffectiveOrderPrompt()
  ]);
  return listCreatorUsageEstimateForCount(requestedCount);
}

function renderParallelTools() {
  updateParallelToolsControls(els, state.parallelToolsExpanded, (element, visible) => setElementVisible(element, visible));
}

function renderOrderSettingsDrawer() {
  updateOrderSettingsDrawerControls(els, state.orderSettingsExpanded, {
    body: document.body,
    setElementVisible: (element, visible) => setElementVisible(element, visible)
  });
}

function openChatMode() {
  return normalizeOpenChatMode(state.openChatMode);
}

function isOpenChatClarifyMode() {
  return openChatMode() === 'clarify';
}

function persistOpenChatModeValue(mode = 'clarify') {
  state.openChatMode = normalizeOpenChatMode(mode);
}

function promotePreparedBriefToOrderMode() {
  // Keep explicit mode control user-driven to avoid surprise mode switches.
}

function setOpenChatMode(mode = 'clarify', options = {}) {
  const next = normalizeOpenChatMode(mode);
  state.openChatMode = next;
  persistOpenChatModeValue(next);
  if (els.openChatModeMenu) els.openChatModeMenu.open = false;
  renderOrderComposer();
  if (!options.silent) {
    flash(next === 'clarify'
      ? 'PLAN mode enabled. Chat prepares and revises order drafts.'
      : 'ORDER mode enabled. Chat keeps dispatch-ready structure before SEND ORDER.', 'info');
  }
}

const clientOpenChatComposerUtils = createClientOpenChatComposerUtils({
  getState: () => state,
  getEls: () => els,
  openChatMode: () => openChatMode(),
  updateOpenChatModeControls: (composerEls, mode) => updateOpenChatModeControls(composerEls, mode),
  readOpenChatSessions: () => readOpenChatSessions(),
  dedupeOpenChatSessionsForDisplay: (sessions) => dedupeOpenChatSessionsForDisplay(sessions),
  isStructuredOrderBrief: (value) => isStructuredOrderBrief(value),
  openChatSessionTimeLabel: (value) => openChatSessionTimeLabel(value),
  openChatSessionsShareIdentity: (left, right) => openChatSessionsShareIdentity(left, right),
  loadOpenChatSession: (sessionId) => loadOpenChatSession(sessionId),
  runAction: (button, action) => runAction(button, action),
  deleteOpenChatSession: (sessionId) => deleteOpenChatSession(sessionId),
  renderOpenChatSessionControlsElement: (composerEls, config) => renderOpenChatSessionControlsElement(composerEls, config),
  renderWorkChatEntryCardElement: (composerEls, auth, config) => renderWorkChatEntryCardElement(composerEls, auth, config),
  setElementVisible: (element, visible) => setElementVisible(element, visible),
  hasActiveOpenChatOrderProgress: () => hasActiveOpenChatOrderProgress(),
  openChatSessionHasLinkedWork: (session, messages) => openChatSessionHasLinkedWork(session, messages),
  lastOpenChatPreparedBrief: () => lastOpenChatPreparedBrief(),
  isOpenChatDecisionSuppressedForBrief: (brief) => isOpenChatDecisionSuppressedForBrief(brief),
  looksJapanese: (value) => looksJapanese(value),
  workOrderUiLabels: () => workOrderUiLabels(),
  normalizeOpenChatIntentText: (value) => normalizeOpenChatIntentText(value),
  openChatIntentMatchText: (value) => openChatIntentMatchText(value)
});
const {
  renderOpenChatModeControls,
  currentOpenChatSessionHasLinkedWork,
  clearOpenChatDispatchDraftState,
  renderOpenChatSessionControls,
  currentOpenChatHasMeaningfulContent,
  renderWorkChatEntryCard,
  openChatPreviousAgentMessageBody,
  openChatPreviousUserMessageBody,
  openChatLastPromptWasOrderDecision,
  openChatComposerDecisionOptions
} = clientOpenChatComposerUtils;

const clientOpenChatHistoryUtils = createClientOpenChatHistoryUtils({
  openChatSessionMaxMessages: OPEN_CHAT_SESSION_MAX_MESSAGES,
  openChatSessionMaxSessions: OPEN_CHAT_SESSION_MAX_SESSIONS,
  getState: () => state,
  getEls: () => els,
  makeOpenChatSessionId: () => makeOpenChatSessionId(),
  currentOpenChatHasMeaningfulContent: () => currentOpenChatHasMeaningfulContent(),
  openChatMode: () => openChatMode(),
  normalizeOpenChatMode: (value) => normalizeOpenChatMode(value),
  serializeOpenChatMessageForSession: (message) => serializeOpenChatMessageForSession(message),
  openChatSessionHasLinkedWork: (session, messages) => openChatSessionHasLinkedWork(session, messages),
  normalizeOpenChatSession: (session) => normalizeOpenChatSession(session),
  hasOpenChatSessionPayloadContent: (payload) => hasOpenChatSessionPayloadContent(payload),
  upsertOpenChatSessionCollection: (sessions, session) => upsertOpenChatSessionCollection(sessions, session),
  clearOpenChatDispatchDraftState: (options) => clearOpenChatDispatchDraftState(options),
  finishOpenChatTyping: (options) => finishOpenChatTyping(options),
  clearOpenChatOrderProgressTimer: () => clearOpenChatOrderProgressTimer(),
  clearOpenChatAcceptanceProgressTimer: () => clearOpenChatAcceptanceProgressTimer(),
  clearLiveSnapshotRefreshTimer: () => clearLiveSnapshotRefreshTimer(),
  renderOrderComposer: () => renderOrderComposer(),
  renderOpenChatSessionControls: () => renderOpenChatSessionControls(),
  renderOpenChatChoiceBar: () => renderOpenChatChoiceBar(),
  syncCreateJobButtonForCurrentPrompt: () => syncCreateJobButtonForCurrentPrompt(),
  updateWorkChatStatusCard: (title, body, tone) => updateWorkChatStatusCard(title, body, tone),
  backfillTrackedJobsIntoSnapshot: (snapshot) => backfillTrackedJobsIntoSnapshot(snapshot),
  scheduleLiveSnapshotRefresh: (snapshot) => scheduleLiveSnapshotRefresh(snapshot),
  isTerminalOrderStatus: (status) => isTerminalOrderStatus(status),
  api: (path, init) => api(path, init),
  flash: (message, tone) => flash(message, tone)
});
const {
  ensureCurrentOpenChatSessionId,
  writeOpenChatSessions,
  readOpenChatSessions,
  mergeServerChatMemorySessions,
  currentOpenChatSessionPayload,
  persistCurrentOpenChatSession,
  markCurrentOpenChatSessionLinkedOrder,
  loadOpenChatSession,
  startNewOpenChatSession,
  deleteOpenChatSession,
  clearOpenChatHistory,
  toggleOpenChatHistory
} = clientOpenChatHistoryUtils;

const clientScheduledWorkController = createClientScheduledWorkController({
  els,
  state,
  api: (path, init) => api(path, init),
  apiPayloadFromOrderDraft: (draft) => apiPayloadFromOrderDraft(draft),
  appendOrderChatExchange: (prompt, answer, options) => appendOrderChatExchange(prompt, answer, options),
  buildOpenChatImplicitOrderPrepAnswer: (prompt, inputCounts, options) => buildOpenChatImplicitOrderPrepAnswer(prompt, inputCounts, options),
  canOrderFromBrowser: (auth) => canOrderFromBrowser(auth),
  currentOrderDraft: () => currentOrderDraft(),
  fallbackPromptFromOrderInput: (input) => fallbackPromptFromOrderInput(input),
  flash: (message, tone) => flash(message, tone),
  handleOrderPreflightPrompt: (error, draft, options) => handleOrderPreflightPrompt(error, draft, options),
  orderInputCounts: (input) => orderInputCounts(input),
  refresh: () => refresh(),
  runAction: (button, fn) => runAction(button, fn),
  shouldPrepareOrderBeforeDispatch: (draft) => shouldPrepareOrderBeforeDispatch(draft),
  summarizeOrderDraftForAnalytics: (draft, source) => summarizeOrderDraftForAnalytics(draft, source),
  trackConversionEvent: (eventName, payload) => trackConversionEvent(eventName, payload),
  validateOrderDraft: (draft, options) => validateOrderDraft(draft, options)
});
const {
  renderScheduledWorkControls,
  renderScheduledWorkList,
  scheduleCurrentOrderDraft,
  scheduledWorkById,
  scheduledWorkScheduleLabel,
  scheduledWorkTimeLabel
} = clientScheduledWorkController;

function closeOrderSettings() {
  state.orderSettingsExpanded = false;
  renderOrderSettingsDrawer();
}

function renderOrderAdvancedPanel() {
  setElementVisible(els.orderAdvancedPanel, true);
}

function focusWorkResults() {
  if (els.workListPanels && !els.workListPanels.hidden) {
    els.workListPanels.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }
  if (els.jobsTable) els.jobsTable.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function hasManifestDraft() {
  return clientAgentSetupFlowController.hasManifestDraft();
}

function resetAgentSetupFlow(options = {}) {
  return clientAgentSetupFlowController.resetAgentSetupFlow(options);
}

function completeAgentSetup(agentId) {
  return clientAgentSetupFlowController.completeAgentSetup(agentId);
}

function renderAgentSetupFlow(auth = state.snapshot?.auth || {}) {
  return clientAgentSetupFlowController.renderAgentSetupFlow(auth);
}

function renderWorkFlow(snapshot = state.snapshot || {}) {
  setElementVisible(els.workCreatePanels, true);
  setElementVisible(els.workListPanels, true);
  setElementVisible(els.clearRunAgentBtn, Boolean(els.jobAgentId?.value));
  renderOrderSettingsDrawer();
  renderParallelTools();
  renderOrderAdvancedPanel();
}

function renderConnectHub(snapshot = state.snapshot || {}) {
  return clientConnectHubController.renderConnectHub(snapshot);
}

function openFeedbackForm() {
  if (els.feedbackTitle?.scrollIntoView) {
    window.requestAnimationFrame(() => {
      els.feedbackTitle.scrollIntoView({ behavior: 'smooth', block: 'center' });
      els.feedbackTitle.focus();
    });
  }
}

function renderStartGuide(snapshot = state.snapshot || {}) {
  if (!els.startGuideCard) return;
  const auth = snapshot?.auth || {};
  const agents = snapshot?.agents || [];
  const jobs = snapshot?.jobs || [];
  const readyAgents = agents.filter((agent) => agentHealth(agent).ready);
  const lastJob = jobs[0] || null;
  let tone = 'info';
  let title = 'Start with CAIt Chat.';
  let body = 'Ask a product question or describe rough work. CAIt Chat can prepare the order brief first; billing starts only after you confirm SEND ORDER.';

  if (!auth?.loggedIn) {
    tone = 'ok';
  } else if (auth?.loggedIn && !agents.length) {
    title = 'CAIt Chat is ready.';
    body = 'Use Chat to prepare or send an order. Use AGENTS when you want to publish your own agent from GitHub or a manifest.';
  } else if (auth?.loggedIn && agents.length && !readyAgents.length) {
    title = 'CAIt Chat can still prepare work.';
    body = 'Your agent list needs verification before routing to your agents. Built-in and verified agents can still be used from Chat.';
    tone = 'warn';
  } else if (readyAgents.length) {
    title = `CAIt Chat can route to ${readyAgents.length} ready agent${readyAgents.length === 1 ? '' : 's'}.`;
    body = `Start in Chat, let ${PRODUCT_SHORT_NAME} prepare the brief, then SEND ORDER only when the task and cost are clear.`;
    tone = 'ok';
  }
  if (auth?.loggedIn && lastJob && ['failed', 'timed_out'].includes(lastJob.status)) {
    title = 'Inspect the last failed run.';
    body = 'Open Chat, inspect the selected run, then retry only after the cause is clear.';
    tone = 'warn';
  }
  els.startGuideCard.textContent = `${title}\n\n${body}`;
  els.startGuideCard.className = `detail-box action-card ${tone} compact-card`;
}

function setTabVisible(tab, visible) {
  const btn = document.querySelector(`.tab-btn[data-tab="${tab}"]`);
  if (!btn) return;
  btn.hidden = !visible;
}

function renderJobModeOptions(auth) {
  if (!els.jobMode) return;
  const options = canUseDevApi(auth)
    ? [
        { value: 'complete', label: 'simulate complete' },
        { value: 'fail', label: 'simulate fail' },
        { value: 'create-only', label: 'create only' },
        { value: 'external-demo', label: 'dispatch to connected agent' }
      ]
    : [
        { value: 'create-only', label: 'broker default' }
      ];
  const signature = JSON.stringify(options);
  if (els.jobMode.dataset.signature !== signature) {
    els.jobMode.innerHTML = options.map((option) => `<option value="${option.value}">${option.label}</option>`).join('');
    els.jobMode.dataset.signature = signature;
  }
  if (!options.some((option) => option.value === els.jobMode.value)) {
    els.jobMode.value = options[0]?.value || 'create-only';
  }
}

function renderReleaseAccess(auth) {
  const canOrder = canOrderFromBrowser(auth);
  const canManagePayments = canManagePaymentsFromBrowser(auth);
  const canManageAgents = canManageAgentsFromBrowser(auth);
  const canGithubFlow = canUseGithubAgentFlow(auth);
  const canManagePayouts = canManagePayoutsFromBrowser(auth);
  const canDev = canUseDevApi(auth);
  const showDemoTools = Boolean(canDev);
  const canUseOps = Boolean(canDev);
  const loggedIn = Boolean(auth?.loggedIn);
  setTabVisible('start', !loggedIn);
  setTabVisible('work', loggedIn);
  setTabVisible('agents', loggedIn);
  setTabVisible('connect', loggedIn);
  setTabVisible('settings', loggedIn);
  setButtonAccess(els.registerAgentBtn, canManageAgents);
  setButtonAccess(els.draftAgentSkillBtn, true);
  setButtonAccess(els.importManifestBtn, canManageAgents);
  setButtonAccess(els.importUrlBtn, canManageAgents);
  setButtonAccess(els.createJobBtn, true);
  setButtonAccess(els.loadReposBtn, canGithubFlow);
  setButtonAccess(els.generateRepoManifestBtn, canGithubFlow);
  setButtonAccess(els.importSelectedRepoBtn, canGithubFlow);
  setButtonAccess(els.createAdapterPrBtn, canGithubFlow);
  setButtonAccess(els.importDeployedAdapterBtn, canGithubFlow);
  setButtonAccess(els.saveBillingSettingsBtn, canManagePayments);
  setButtonAccess(els.savePayoutSettingsBtn, canManagePayouts);
  setButtonAccess(els.retryDispatchBtn, canDev);
  setButtonAccess(els.claimJobBtn, canUseOps);
  setButtonAccess(els.submitResultBtn, canUseOps);
  setElementVisible(els.retryDispatchBtn, canDev);
  setElementVisible(els.seedBtn, showDemoTools);
  setTabVisible('ops', canUseOps);
  if (els.topOpenChatBtn) els.topOpenChatBtn.textContent = loggedIn ? 'CHAT' : 'SIGN IN';
  if (!canUseOps && state.currentTab === 'ops') {
    switchTab(loggedIn ? defaultLoggedInTab(state.snapshot) : 'start');
  }
  renderJobModeOptions(auth);
}

function selectedJob() {
  return state.snapshot?.jobs?.find((job) => job.id === state.selectedJobId) || null;
}

function jobById(id = '') {
  const safeId = String(id || '').trim();
  if (!safeId) return null;
  return state.snapshot?.jobs?.find((job) => job.id === safeId) || null;
}

function openJobDetail(jobId = '') {
  const job = jobById(jobId);
  if (!job) return;
  state.selectedJobId = job.id;
  setDetail(job);
  renderJobs(state.snapshot?.jobs || []);
}

async function loadJobForChatAction(orderId = '') {
  const safeOrderId = String(orderId || '').trim();
  if (!safeOrderId) return null;
  const existing = jobById(safeOrderId);
  if (downloadableDeliveryFilesForJob(existing).length) return existing;
  const response = await api(`/api/jobs/${encodeURIComponent(safeOrderId)}?visitor_id=${encodeURIComponent(visitorId())}`, {
    preserveAuthOn401: true
  });
  const job = response?.job && typeof response.job === 'object'
    ? { ...response.job, id: response.job.id || safeOrderId }
    : { ...(response || {}), id: response?.id || safeOrderId };
  if (job?.id) {
    mergeProgressJobIntoSnapshot(job);
    return jobById(job.id) || job;
  }
  return existing;
}

function latestOpenChatAgentConfirmationBody() {
  const messages = Array.isArray(state.orderChatMessages) ? state.orderChatMessages : [];
  const labels = workOrderUiLabels();
  const sendLabel = normalizeOpenChatIntentText(labels.sendOrder).replace(/\s+/g, '');
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message?.role === 'user') continue;
    const body = String(message?.fullBody || message?.body || '').trim();
    if (!body) continue;
    const text = openChatIntentMatchText(body);
    const looksConfirmation = /(?:接続先:|Route:|Work:|Delivery:|対応するオーダーに繋げます|I will connect this to the matching order|内容が合っていれば\s*SEND ORDER|press SEND ORDER|SEND ORDERできます)/i.test(text);
    if (looksConfirmation || (sendLabel && text.includes(sendLabel))) return body;
  }
  return '';
}

function openChatPreserveSeedTaskType(prompt = '', preferredTaskType = '') {
  const source = String(prompt || '').trim();
  const preferred = String(preferredTaskType || '').trim();
  if (isStructuredOrderBrief(source)) {
    const structuredTask = String(structuredOrderBriefParts(source).taskType || '').trim();
    if (structuredTask) return structuredTask;
  }
  if (preferred) return preferred;
  return openChatCanonicalOrderTaskType('', source)
    || openChatCanonicalOrderTaskType(inferClientTaskSequence('', source)[0], source)
    || currentRoutingTask()
    || 'research';
}

function openChatDecisionSeedContext(original = '') {
  const prepared = String(state.openChatPreparedBrief || '').trim();
  if (isStructuredOrderBrief(prepared)) {
    const taskType = openChatPreserveSeedTaskType(prepared, structuredOrderBriefParts(prepared).taskType);
    return { prompt: prepared, taskType };
  }
  const pending = openChatPendingQuestionContext();
  if (pending?.prompt) {
    const taskType = openChatPreserveSeedTaskType(pending.prompt, pending.taskType);
    return { prompt: pending.prompt, taskType };
  }
  const leaderPrompt = String(state.openChatLeaderIntakePrompt || '').trim();
  if (leaderPrompt) {
    const leaderTask = String(state.openChatLeaderIntakeTask || '').trim();
    const taskType = openChatPreserveSeedTaskType(leaderPrompt, leaderTask);
    return { prompt: leaderPrompt, taskType };
  }
  const seedPrompt = String(original || openChatPreviousUserMessageBody() || '').trim();
  const confirmationBody = latestOpenChatAgentConfirmationBody();
  const taskType = openChatPreserveSeedTaskType([seedPrompt, confirmationBody].filter(Boolean).join('\n'), '');
  return { prompt: seedPrompt, taskType };
}

function fallbackStructuredBriefFromOpenChatConfirmation() {
  const confirmationBody = latestOpenChatAgentConfirmationBody();
  const labels = workOrderUiLabels();
  const sendLabel = normalizeOpenChatIntentText(labels.sendOrder).replace(/\s+/g, '');
  const reviseLabel = normalizeOpenChatIntentText(labels.revise).replace(/\s+/g, '');
  const cancelLabel = normalizeOpenChatIntentText(labels.cancel).replace(/\s+/g, '');
  const addConstraintsLabel = normalizeOpenChatIntentText(labels.addConstraints).replace(/\s+/g, '');
  const confirmationText = openChatIntentMatchText(confirmationBody);
  const hasDecision = openChatLastPromptWasOrderDecision()
    || /(?:SEND ORDER|発注する|条件を修正|キャンセル|Revise conditions|Cancel)/i.test(confirmationText)
    || (Boolean(sendLabel) && confirmationText.includes(sendLabel))
    || (Boolean(reviseLabel) && confirmationText.includes(reviseLabel))
    || (Boolean(addConstraintsLabel) && confirmationText.includes(addConstraintsLabel))
    || (Boolean(cancelLabel) && confirmationText.includes(cancelLabel));
  if (!confirmationBody || !hasDecision) return '';
  const inputCounts = orderInputCounts(orderInputFromComposer());
  const seed = openChatDecisionSeedContext('');
  const original = compactChatText(seed.prompt, 3200);
  const context = [
    seed.prompt,
    confirmationBody,
    seed.taskType
  ].filter(Boolean).join('\n');
  const taskType = openChatPreserveSeedTaskType(seed.prompt, seed.taskType);
  const confirmation = looksJapanese(context)
    ? 'ユーザーはこの内容で発注すると確認しました。会話で提供された情報を使い、同じヒアリングを繰り返さず、不足分は仮定として明記してください。'
    : 'The user confirmed this should be sent as an order. Use the conversation context, do not repeat the same intake, and state missing details as assumptions.';
  const clarificationContext = [confirmation, confirmationBody].filter(Boolean).join('\n\n');
  const brief = isStructuredOrderBrief(seed.prompt)
    ? seed.prompt
    : buildOpenChatDispatchBriefFromPendingAnswer(
      original || openChatPreviousUserMessageBody() || confirmationBody,
      clarificationContext,
      taskType,
      inputCounts
    );
  return isStructuredOrderBrief(brief) ? rewriteStructuredBriefTaskType(brief, structuredOrderBriefParts(brief).taskType || taskType) : '';
}

function lastServerOpenChatPreparedBrief() {
  const memory = Array.isArray(state.snapshot?.chatMemory) ? state.snapshot.chatMemory : [];
  for (const item of memory) {
    const promptBrief = String(item?.prompt || '').trim();
    if (isStructuredOrderBrief(promptBrief)) return promptBrief;
    const answerBrief = extractPreparedBriefFromChatText(item?.answer || '');
    if (answerBrief) return answerBrief;
  }
  return '';
}

function lastOpenChatPreparedBrief() {
  const current = String(els.jobPrompt?.value || '').trim();
  if (isStructuredOrderBrief(current)) return current;
  if (isStructuredOrderBrief(state.openChatPreparedBrief)) return state.openChatPreparedBrief;
  const messages = Array.isArray(state.orderChatMessages) ? state.orderChatMessages : [];
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const brief = extractPreparedBriefFromChatText(messages[index]?.fullBody || messages[index]?.body || '');
    if (brief) return brief;
  }
  const fallback = fallbackStructuredBriefFromOpenChatConfirmation();
  if (isStructuredOrderBrief(fallback)) {
    state.openChatPreparedBrief = fallback;
    return fallback;
  }
  return '';
}

function currentVisibleOrderPrompt() {
  return String(els.jobPrompt?.value || '').trim();
}

function currentEffectiveOrderPrompt() {
  const visible = currentVisibleOrderPrompt();
  if (visible) return visible;
  const prepared = String(state.openChatPreparedBrief || '').trim();
  return isStructuredOrderBrief(prepared) ? prepared : '';
}

function openChatConversationContextForLlm() {
  const rows = [];
  const pushRow = (role, body, createdAt = '') => {
    const safeBody = compactChatText(String(body || '').replace(/\s+/g, ' '), 900);
    if (!safeBody) return;
    rows.push({
      role: role === 'assistant' ? 'assistant' : 'user',
      content: safeBody,
      created_at: compactChatText(createdAt || '', 80)
    });
  };
  // New Chat is a hard context boundary. Account chatMemory is restored only
  // when the user explicitly opens a saved session, which populates local messages.
  const local = Array.isArray(state.orderChatMessages) ? state.orderChatMessages.slice(-8) : [];
  for (const message of local) {
    pushRow(message?.role || 'assistant', message?.body || message?.fullBody || '', message?.ts || '');
  }
  return rows.slice(-12);
}

function parallelDraftFromOpenChatPlanItem(item = {}, input = null) {
  const prompt = String(item.prompt || '').trim();
  const taskType = String(item.taskType || inferClientTaskSequence('', prompt)[0] || 'research').trim().toLowerCase();
  if (!prompt || !taskType) return null;
  const routingDecision = orderRoutingDecision(taskType, prompt, 'auto');
  return {
    id: makeParallelDraftId(),
    parent_agent_id: els.jobParent?.value || 'cloudcode-main',
    order_strategy: 'auto',
    resolved_order_strategy: routingDecision.strategy === 'multi' ? 'single' : routingDecision.strategy,
    route_plan: routingDecision.plan,
    task_type: taskType,
    agent_id: '',
    prompt,
    budget_cap: Number(els.jobBudget?.value || 300),
    deadline_sec: Number(els.jobDeadline?.value || 120),
    input: input || undefined
  };
}

function buildOpenChatNoLoginAnswer(prompt = '') {
  return clientOpenChatQuickAnswerUtils.buildOpenChatNoLoginAnswer(prompt);
}

function buildOpenChatExamplesAnswer(prompt = '') {
  return clientOpenChatQuickAnswerUtils.buildOpenChatExamplesAnswer(prompt);
}

function buildOpenChatAcknowledgementAnswer(prompt = '') {
  return clientOpenChatQuickAnswerUtils.buildOpenChatAcknowledgementAnswer(prompt);
}

function buildOpenChatDirectResearchQuestionAnswer(prompt = '', inputCounts = {}) {
  return clientOpenChatQuickAnswerUtils.buildOpenChatDirectResearchQuestionAnswer(prompt, inputCounts);
}

function buildOpenChatRunConfirmationAnswer(prompt = '') {
  return clientOpenChatQuickAnswerUtils.buildOpenChatRunConfirmationAnswer(prompt);
}

function isOpenChatBriefEditInstruction(prompt = '') {
  return clientOpenChatQuickAnswerUtils.isOpenChatBriefEditInstruction(prompt);
}

function isOpenChatAdditionalRequirementFollowup(prompt = '') {
  return clientOpenChatQuickAnswerUtils.isOpenChatAdditionalRequirementFollowup(prompt);
}

function explicitOpenChatAssistMode(prompt = '') {
  return clientOpenChatQuickAnswerUtils?.explicitOpenChatAssistMode(prompt) || '';
}

function buildOpenChatFollowupAnswer(prompt = '', inputCounts = {}) {
  return resolveOpenChatFollowupAnswer(prompt, inputCounts);
}

function openChatRoutePreview(taskType = 'research', prompt = '') {
  const decision = orderRoutingDecision(taskType, prompt, 'auto');
  const plan = decision.plan || {};
  if (decision.strategy === 'multi' && Array.isArray(plan.picks) && plan.picks.length) {
    return `Route: Agent Team candidate\nAgents: ${plan.picks.map((item) => `${item.taskType}:${item.agent?.name || item.agent?.id || 'agent'}`).join(' / ')}\nReason: ${decision.reason}`;
  }
  const candidates = readyAgentsForTask(taskType)
    .slice()
    .sort((left, right) => agentRoutingScore(right, taskType) - agentRoutingScore(left, taskType))
    .slice(0, 3);
  if (!candidates.length) {
    return `Route: single-agent candidate\nAgents: no ready ${taskType} agent visible yet\nReason: ${decision.reason}`;
  }
  return [
    'Route: single-agent candidate',
    `Likely agent: ${candidates[0].name || candidates[0].id}`,
    candidates.length > 1 ? `Other matches: ${candidates.slice(1).map((agent) => agent.name || agent.id).join(' / ')}` : '',
    `Reason: ${decision.reason}`
  ].filter(Boolean).join('\n');
}

function buildOpenChatOrderPreview(prompt = '', inputCounts = {}) {
  const text = String(prompt || '').trim();
  if (!text) return '';
  const ja = looksJapanese(text);
  const taskType = inferClientTaskSequence('', text)[0] || currentRoutingTask() || 'research';
  const brief = catCompactDispatchBrief(text, taskType, inputCounts);
  const questions = openChatClarifyingQuestions(taskType, text);
  const routePreview = openChatRoutePreview(taskType, text);
  const readinessBlock = openChatReadinessBlock(taskType, text, inputCounts, { ja });
  if (ja) {
    return [
      'この内容は注文候補に見えます。まず発注ブリーフに整えてから、正式オーダーとして送ります。',
      '',
      '発注前プレビューです。次に PREPARE ORDER で内容を整えます。',
      '',
      `推定タスク: ${taskType}`,
      routePreview,
      readinessBlock,
      '',
      '発注前に足すと良い情報:',
      ...questions.map((question, index) => `${index + 1}. ${question}`),
      '',
      '実行ブリーフ案:',
      brief,
      '',
      '次の動き: PREPARE ORDER で発注ブリーフを作ります。内容を確認し、実行する場合は SEND ORDER してください。'
    ].join('\n');
  }
  return [
    `This looks like work to prepare as an order. ${PRODUCT_SHORT_NAME} prepares a structured brief before paid dispatch.`,
    '',
    'Pre-dispatch preview. Next, PREPARE ORDER turns this into a reviewable draft.',
    '',
    `Inferred task: ${taskType}`,
    routePreview,
    readinessBlock,
    '',
    'Useful details to add before dispatch:',
    ...questions.map((question, index) => `${index + 1}. ${question}`),
    '',
    'Execution brief draft:',
    brief,
    '',
    'Next: press PREPARE ORDER to create the structured brief. Review it, then press SEND ORDER to run it.'
  ].join('\n');
}

function isOpenChatDispatchReadyPrompt(prompt = '') {
  return resolveOpenChatDispatchReadyPrompt(prompt);
}

function shouldPrepareOrderBeforeDispatch(draft = {}) {
  return resolveOpenChatShouldPrepareOrderBeforeDispatch(draft);
}

function buildOpenChatImplicitOrderPrepAnswer(prompt = '', inputCounts = {}, options = {}) {
  return resolveOpenChatImplicitOrderPrepAnswer(prompt, inputCounts, options);
}

function buildOpenChatClarifyModeAnswer(prompt = '', inputCounts = {}, options = {}) {
  const source = String(prompt || '').trim() || 'Use the attached source material and infer the most useful delivery.';
  const ja = looksJapanese(source);
  const parts = isStructuredOrderBrief(source) ? structuredOrderBriefParts(source) : {};
  const taskType = parts.taskType || inferClientTaskSequence('', source)[0] || currentRoutingTask() || 'research';
  const sequence = inferClientTaskSequence(taskType, source);
  const routingDecision = orderRoutingDecision(taskType, source, 'auto');
  const questions = openChatClarifyingQuestions(taskType, source);
  const brief = isStructuredOrderBrief(source) ? source : catCompactDispatchBrief(source, taskType, inputCounts);
  const readinessBlock = openChatReadinessBlock(taskType, brief, inputCounts, { ja });
  const preflightLines = openChatPreflightPreviewLines(taskType, brief, ja);
  const routeText = routingDecision.strategy === 'multi'
    ? `Agent Team candidate (${routingDecision.reason})`
    : `single-agent candidate (${routingDecision.reason})`;
  const sourceNote = options.sourceOnly
    ? (ja ? '入力ソースをもとに計画用draftを作りました。' : 'I prepared a planning draft from the attached source material.')
    : (ja ? 'PLAN mode で発注前draftを確認します。' : 'PLAN mode is reviewing this pre-order draft.');
  const body = ja
    ? [
      `${sourceNote} 内容がまとまったので ORDER に切り替えました。`,
      '',
      openChatHumanDispatchPreview(brief, taskType, source, inputCounts),
      ...preflightLines,
      '',
      '確認質問:',
      ...questions.map((question, index) => `${index + 1}. ${question}`),
      '',
      '次の動き: 足りない条件はこのまま返信してください。内容が合っていれば SEND ORDER してください。'
    ].join('\n')
    : [
      `${sourceNote} The draft is ready, so I switched this chat to ORDER.`,
      '',
      openChatHumanDispatchPreview(brief, taskType, source, inputCounts),
      ...preflightLines,
      '',
      'Clarifying questions:',
      ...questions.map((question, index) => `${index + 1}. ${question}`),
      '',
      'Next: reply with missing constraints here, or press SEND ORDER if this is ready.'
    ].join('\n');
  return {
    kind: 'assist',
    tone: 'info',
    body,
    nextPrompt: brief,
    status: 'Order draft ready.\n\nReview the order summary, then press SEND ORDER to run it.'
  };
}

function buildOpenChatLongPromptGuardAnswer(prompt = '', inputCounts = {}) {
  return resolveOpenChatLongPromptGuardAnswer(prompt, inputCounts);
}
function openChatLooksGeneralHelpPrompt(prompt = '') {
  return clientOpenChatQuickAnswerUtils.openChatLooksGeneralHelpPrompt(prompt);
}

function buildOpenChatGeneralHelpAnswer(prompt = '') {
  return clientOpenChatQuickAnswerUtils.buildOpenChatGeneralHelpAnswer(prompt);
}

function buildOpenChatMarketingAgentListAnswer(prompt = '') {
  return clientOpenChatQuickAnswerUtils.buildOpenChatMarketingAgentListAnswer(prompt);
}

function buildOpenChatLeaderCatalogAnswer(prompt = '') {
  return clientOpenChatQuickAnswerUtils.buildOpenChatLeaderCatalogAnswer(prompt);
}

function buildOpenChatRecurringWorkAnswer(prompt = '', inputCounts = {}) {
  return clientOpenChatQuickAnswerUtils.buildOpenChatRecurringWorkAnswer(prompt, inputCounts);
}

function buildOpenChatPaymentQuestionAnswer(prompt = '') {
  return clientOpenChatQuickAnswerUtils.buildOpenChatPaymentQuestionAnswer(prompt);
}

function openChatLooksLowInfoAmbiguousPrompt(prompt = '', inputCounts = {}) {
  return clientOpenChatQuickAnswerUtils.buildOpenChatLowInfoAmbiguousAnswer(prompt, inputCounts) !== null;
}

function buildOpenChatLowInfoAmbiguousAnswer(prompt = '', inputCounts = {}) {
  return clientOpenChatQuickAnswerUtils.buildOpenChatLowInfoAmbiguousAnswer(prompt, inputCounts);
}

function quickOrderChatAnswer(prompt = '', inputCounts = {}) {
  return clientOpenChatQuickAnswerUtils.quickOrderChatAnswer(prompt, inputCounts);
}

function buildOpenChatLlmFallbackUnavailableAnswer(prompt = '', reason = '') {
  const ja = looksJapanese(prompt);
  return {
    kind: 'clarify',
    tone: 'warn',
    patternId: 'pattern_llm_fallback_unavailable',
    responseSource: 'openai_unavailable',
    llmProvider: 'openai_unavailable',
    body: ja
      ? [
          '今の内容だと解釈が割れます。まだ実行も課金もしていません。',
          '',
          '質問に答えてほしいのか、実際に作業を発注したいのかを一言で教えてください。',
          '発注なら、対象URL/商材、対象ユーザー、欲しい成果、制約を分かる範囲で足してください。',
          '',
          'まだ注文も課金も発生しません。'
        ].join('\n')
      : [
          'The intent is still ambiguous. Nothing has run or been billed yet.',
          '',
          'Tell me in one short line whether you want an answer here or you want to order actual work.',
          'If you want to order work, add the target URL/product, audience, desired outcome, and any constraint you know.',
          '',
          'No order or billing happens yet.'
        ].join('\n'),
    status: `Need one more clarification before SEND ORDER.\n\nReason: ${String(reason || 'uncertain').slice(0, 80)}`
  };
}

function appendOrderChatExchange(prompt, answer, options = {}) {
  finishOpenChatTyping({ render: false });
  const inputCounts = orderInputCounts(orderInputFromComposer());
  let nextPrompt = options.nextPrompt || answer?.nextPrompt || '';
  if (isStructuredOrderBrief(nextPrompt)) {
    const existingTask = String(structuredOrderBriefParts(nextPrompt).taskType || '').trim();
    if (!existingTask) {
      const canonicalTask = openChatCanonicalOrderTaskType('', nextPrompt)
        || openChatCanonicalOrderTaskType(inferClientTaskSequence('', nextPrompt)[0], nextPrompt)
        || 'research';
      nextPrompt = rewriteStructuredBriefTaskType(nextPrompt, canonicalTask);
    }
    if (answer && typeof answer === 'object') answer = { ...answer, nextPrompt };
  }
  const answerBody = chatAnswerDisplayBody(answer, prompt, inputCounts);
  const displayAnswer = typeof answer === 'object' && answer ? { ...answer, body: answerBody } : answer;
  const answerKind = chatAnswerKind(answer);
  const answerCommand = answerKind === 'command' ? String(answer.command || '') : '';
  const explicitActions = Array.isArray(answer?.actions) ? answer.actions : [];
  const chatActions = explicitActions.length ? explicitActions : openChatPreparedOrderActions(answerKind, nextPrompt);
  const messageBase = answerCommand === 'reset_chat' ? [] : state.orderChatMessages;
  const tone = options.tone || answer?.tone || (answerKind === 'assist' ? 'ok' : (answerKind === 'command' ? 'info' : 'info'));
  const steps = options.steps || openChatStepItems(prompt, displayAnswer);
  const shouldAnimate = shouldAnimateOpenChatAnswer(answer, answerBody);
  const discussionTurns = nextPrompt ? [] : buildOpenChatTrioDiscussion(prompt, answer, { inputCounts, nextPrompt });
  const agentMessage = shouldAnimate
    ? {
      id: makeOpenChatMessageId(),
      role: 'agent',
      label: PRODUCT_SHORT_NAME,
      body: '',
      fullBody: compactChatText(answerBody),
      tone,
      steps,
      actions: chatActions,
      discussionTurns,
      typing: true
    }
    : { role: 'agent', label: PRODUCT_SHORT_NAME, body: answerBody, tone, steps, actions: chatActions, discussionTurns };
  const nextMessages = [
    ...messageBase,
    { role: 'user', label: 'YOU', body: prompt },
    agentMessage
  ];
  state.orderChatMessages = nextMessages.slice(-16);
  const exposeNextPrompt = Boolean(options.exposeNextPrompt || answer?.exposeNextPrompt);
  if (els.jobPrompt) els.jobPrompt.value = exposeNextPrompt ? nextPrompt : '';
  if (answerKind === 'assist' && nextPrompt) {
    state.openChatPreparedBrief = nextPrompt;
    if (answer?.clearPinnedAgent || isStructuredOrderBrief(nextPrompt)) clearPinnedAgentIfMismatchedBrief(nextPrompt);
  } else if (answerKind === 'command' && answerCommand === 'restore_brief' && nextPrompt) {
    state.openChatPreparedBrief = nextPrompt;
  }
  const sourceFiles = Array.isArray(answer?.sourceFiles) && answer.sourceFiles.length
    ? answer.sourceFiles
    : (answer?.sourceFile ? [answer.sourceFile] : []);
  if (sourceFiles.length) {
    const normalizedSourceFiles = sourceFiles
      .map((file) => normalizeOrderInputFile(file))
      .filter((file) => file.content);
    if (normalizedSourceFiles.length) {
      const sourceNames = new Set(normalizedSourceFiles.map((file) => String(file.name || '')));
      const existing = Array.isArray(state.orderInputFiles)
        ? state.orderInputFiles.filter((file) => !sourceNames.has(String(file?.name || '')))
        : [];
      state.orderInputFiles = [...normalizedSourceFiles, ...existing].slice(0, ORDER_INPUT_MAX_FILES);
      state.orderInputFileWarnings = [
        ...(Array.isArray(state.orderInputFileWarnings) ? state.orderInputFileWarnings : []),
        `Long prompt was separated into ${normalizedSourceFiles.length} protected source file(s) before dispatch.`
      ].slice(-4);
    }
  }
  if (Array.isArray(answer?.parallelPlan)) {
    state.openChatParallelPlan = answer.parallelPlan;
  }
  if (answer?.vagueChoicePrompt) {
    state.openChatVagueChoicePrompt = String(answer.vagueChoicePrompt || '').trim();
  } else if (answer?.clearVagueChoice || answerKind !== 'clarify') {
    state.openChatVagueChoicePrompt = '';
  }
  if (answer?.naturalChoiceIntent) {
    state.openChatNaturalChoiceIntent = String(answer.naturalChoiceIntent || '').trim();
  } else if (answer?.clearNaturalChoice || answer?.clearVagueChoice || answerKind !== 'clarify') {
    state.openChatNaturalChoiceIntent = '';
  }
  if (answer?.intentShiftPrompt) {
    state.openChatIntentShiftPrompt = String(answer.intentShiftPrompt || '').trim();
  } else if (answer?.clearIntentShift || answerKind !== 'clarify') {
    state.openChatIntentShiftPrompt = '';
  }
  if (answer?.ideaBacklogPrompt) {
    state.openChatIdeaBacklogPrompt = String(answer.ideaBacklogPrompt || '').trim();
  } else if (answer?.clearIdeaBacklog || answerCommand === 'reset_chat' || answerKind !== 'clarify') {
    state.openChatIdeaBacklogPrompt = '';
  }
  if (answer?.leaderChoicePrompt) {
    state.openChatLeaderChoicePrompt = String(answer.leaderChoicePrompt || prompt || '').trim();
    state.openChatLeaderChoiceCandidates = Array.isArray(answer.leaderChoiceCandidates) ? answer.leaderChoiceCandidates : [];
  } else if (answer?.clearLeaderChoice || answer?.leaderIntakePrompt || answerCommand === 'reset_chat' || answerKind !== 'clarify') {
    state.openChatLeaderChoicePrompt = '';
    state.openChatLeaderChoiceCandidates = [];
  }
  if (answer?.leaderIntakePrompt || answer?.leaderIntakeTask) {
    state.openChatLeaderIntakePrompt = String(answer.leaderIntakePrompt || prompt || '').trim();
    state.openChatLeaderIntakeTask = String(answer.leaderIntakeTask || '').trim();
  } else if (answer?.clearLeaderIntake || answerCommand === 'reset_chat' || answerKind !== 'clarify') {
    state.openChatLeaderIntakePrompt = '';
    state.openChatLeaderIntakeTask = '';
  }
  const storePendingQuestion = shouldStoreOpenChatPendingQuestion(prompt, answer);
  if (answer?.pendingQuestionPrompt || answer?.pendingQuestionTask || storePendingQuestion) {
    const pendingSource = String(answer?.pendingQuestionPrompt || answer?.nextPrompt || prompt || '').trim();
    state.openChatPendingQuestionPrompt = compactChatText(pendingSource, 4000);
    state.openChatPendingQuestionTask = compactChatText(openChatPendingQuestionTaskType(pendingSource, answer), 120);
    state.openChatPendingQuestionPattern = compactChatText(answer?.pendingQuestionPattern || answer?.patternId || '', 120);
  } else if (
    answer?.clearPendingQuestion
    || answerCommand === 'reset_chat'
    || answer?.leaderIntakePrompt
    || answer?.vagueChoicePrompt
    || answer?.naturalChoiceIntent
    || answer?.intentShiftPrompt
    || answer?.ideaBacklogPrompt
    || answer?.leaderChoicePrompt
    || (Array.isArray(answer?.options) && answer.options.length)
    || answerKind !== 'clarify'
  ) {
    state.openChatPendingQuestionPrompt = '';
    state.openChatPendingQuestionTask = '';
    state.openChatPendingQuestionPattern = '';
  }
  if (answerKind === 'clarify' && Array.isArray(answer?.options)) {
    state.openChatClarifyOptions = answer.options;
    state.openChatDecisionSuppressed = false;
  } else if (answer?.clearClarifyOptions) {
    state.openChatClarifyOptions = [];
  } else if (answerKind === 'command') {
    state.openChatClarifyOptions = [];
  }
  if (answerKind === 'assist' && nextPrompt) clearOpenChatDecisionSuppressionForNewBrief(nextPrompt);
  if (answerCommand === 'reset_chat') state.openChatDecisionSuppressed = false;
  state.pendingIntake = null;
  state.intakeConfirmed = false;
  state.intakeAnswer = '';
  if (els.intakeAnswer) els.intakeAnswer.value = '';
  applyOpenChatCommand(answer);
  state.openChatLastStatus = openChatStatusDisplayText(options.status || answer?.status || 'Answered in chat.\n\nNo order was created and no billing occurred.');
  state.openChatLastStatusTone = tone;
  void trackChatTranscript(prompt, displayAnswer, {
    ...inputCounts,
    taskType: inferClientTaskSequence('', nextPrompt || prompt)[0] || currentRoutingTask() || '',
    status: answerKind || 'quick',
    transcriptId: options.transcriptId || ''
  });
  renderOrderComposer();
  if (els.runCreateStatus) {
    els.runCreateStatus.textContent = state.openChatLastStatus;
    els.runCreateStatus.className = `detail-box action-card ${tone} compact-card`;
  }
  const statusParts = String(state.openChatLastStatus || '').split(/\n\n+/);
  updateWorkChatStatusCard(statusParts.shift() || 'Answered in chat.', statusParts.join('\n\n') || 'No order was created and no billing occurred.', tone);
  syncCreateJobButtonForCurrentPrompt();
  if (answerCommand === 'reset_chat') {
    state.currentOpenChatSessionId = '';
    renderOpenChatSessionControls();
  } else {
    persistCurrentOpenChatSession();
  }
  if (shouldAnimate) startOpenChatTyping(agentMessage.id);
}

function renderOpenChatChoiceBar() {
  renderOpenChatChoiceBarElement(
    els.openChatChoiceBar,
    openChatComposerDecisionOptions(),
    (button, command) => {
      void runOpenChatChoiceButtonAction(button, () => handleOpenChatChoiceCommand(command), {
        flash: (message, tone) => flash(message, tone),
        setDetail: (detail) => setDetail(detail)
      });
    },
    (element, visible) => setElementVisible(element, visible)
  );
}

function shouldStickWorkChatScrollToBottom(el = els.workChatThread) {
  if (!el) return true;
  const distanceFromBottom = Number(el.scrollHeight || 0) - Number(el.scrollTop || 0) - Number(el.clientHeight || 0);
  return distanceFromBottom <= 96;
}

function renderWorkChatThread(options = {}) {
  if (!els.workChatThread) return;
  const previousBottomOffset = Math.max(0, Number(els.workChatThread.scrollHeight || 0) - Number(els.workChatThread.scrollTop || 0));
  const stickToBottom = options.forceScroll === true || shouldStickWorkChatScrollToBottom(els.workChatThread);
  const messages = [];
  const introTitle = formatWorkUiText(appSettingValue('work_chat_intro_title', APP_SETTING_DEFAULTS.work_chat_intro_title));
  const introBody = formatWorkUiText(appSettingValue('work_chat_intro_body', APP_SETTING_DEFAULTS.work_chat_intro_body));

  messages.push(renderChatMessage(
    'agent',
    PRODUCT_SHORT_NAME,
    [
      introTitle,
      '',
      introBody
    ].join('\n'),
    'intro'
  ));

  (state.orderChatMessages || []).forEach((message) => {
    messages.push(renderChatMessage(message.role, message.label, message.body, message.tone || '', message.steps || [], {
      typing: Boolean(message.typing),
      thinking: Boolean(message.thinking),
      discussionTurns: message.discussionTurns || [],
      actions: message.actions || [],
      progressMeta: message.progressMeta || null,
      deliveryCard: message.deliveryCard || null,
      ja: looksJapanese(message.body || '')
    }));
  });

  els.workChatThread.innerHTML = messages.join('');
  els.workChatThread.querySelectorAll('[data-chat-action]').forEach((button) => {
    button.onclick = () => runAction(button, async () => {
      await handleChatActionButton(button.dataset.chatAction || '', {
        agentId: button.dataset.chatAgentId || '',
        connector: button.dataset.chatConnector || '',
        orderId: button.dataset.chatOrderId || '',
        capabilities: button.dataset.connectorCapabilities || '',
        googleCapabilities: button.dataset.connectorCapabilities || '',
        xCapabilities: button.dataset.connectorCapabilities || ''
      });
    });
  });
  if (stickToBottom) {
    els.workChatThread.scrollTop = els.workChatThread.scrollHeight;
  } else {
    els.workChatThread.scrollTop = Math.max(0, Number(els.workChatThread.scrollHeight || 0) - previousBottomOffset);
  }
}

async function handleOpenChatChoiceCommand(command = '') {
  const normalized = String(command || '').trim();
  if (normalized === WORK_ACTION_IDS.OPEN_MARKETING_TIMELINE) {
    const ja = looksJapanese(openChatPreviousUserMessageBody());
    state.openChatClarifyOptions = [];
    renderOpenChatChoiceBar();
    openMarketingTimelineModal();
    appendOrderChatExchange(ja ? '履歴を見る' : 'open saved schedule timeline', {
      kind: 'command',
      tone: 'info',
      patternId: 'pattern_timeline_opened',
      clearClarifyOptions: true,
      body: ja
        ? 'CHAT TIMELINE ポップアップを開きました。保存済みの run、draft、今後の scheduled action をここで確認できます。'
        : 'Opened the CHAT TIMELINE popup. You can inspect stored runs, drafts, and upcoming scheduled actions here.',
      status: 'Saved schedule timeline opened.\n\nNo order was created and no billing occurred.'
    });
    return;
  }
  if (normalized === 'clarify_timeline_plan') {
    const prompt = String(openChatPreviousUserMessageBody() || 'timeline').trim();
    state.openChatClarifyOptions = [];
    renderOpenChatChoiceBar();
    appendOrderChatExchange(looksJapanese(prompt) ? 'タイムラインを計画したい' : 'plan a new timeline', buildOpenChatTimelinePlanClarifyAnswer(prompt));
    return;
  }
  if (/^select_leader:/i.test(normalized)) {
    const answer = buildOpenChatLeaderChoiceFollowupAnswer(normalized, orderInputCounts(orderInputFromComposer()));
    if (!answer) {
      flash('Leader choice is no longer active.', 'warn');
      state.openChatClarifyOptions = [];
      renderOpenChatChoiceBar();
      return;
    }
    const taskType = String(normalized.split(':')[1] || '').trim();
    const candidates = Array.isArray(state.openChatLeaderChoiceCandidates) ? state.openChatLeaderChoiceCandidates : [];
    const selected = candidates.find((candidate) => String(candidate?.taskType || '').trim() === taskType) || null;
    const ja = looksJapanese(openChatPreviousUserMessageBody()) || looksJapanese(answer?.body || '');
    const label = (ja ? selected?.labelJa : selected?.labelEn) || selected?.labelEn || selected?.labelJa || taskType || 'leader';
    appendOrderChatExchange(label, answer);
    return;
  }
  if (normalized === 'confirm_preorder_order') {
    await dispatchOpenChatConfirmedChoice();
    return;
  }
  if (normalized === 'revise_preorder_order') {
    enterOpenChatRevisionChoice();
    return;
  }
  if (normalized === 'cancel_preorder_order') {
    state.openChatDecisionSuppressed = true;
    state.openChatClarifyOptions = [];
    renderOpenChatChoiceBar();
    handleChatActionButton('cancel_order');
  }
}

async function handleChatActionButton(action = '', detail = {}) {
  const kind = String(action || '').trim();
  if (!isKnownWorkUiAction(kind)) return;
  const handlers = {
    confirm_order: async () => {
      const accepted = acceptPreparedOpenChatOrderForDispatch();
      const inputCounts = orderInputCounts(orderInputFromComposer());
      if (accepted && detail.agentId) {
        state.pendingOrderConfirmation.agentId = String(detail.agentId || '').trim();
      } else if (!accepted && !currentVisibleOrderPrompt() && !inputCounts.urlCount && !inputCounts.fileCount) {
        await dispatchOpenChatConfirmedChoice();
        return;
      } else {
        state.pendingOrderConfirmation = {
          accepted: true,
          agentId: String(detail.agentId || '').trim(),
          acceptedAt: new Date().toISOString()
        };
      }
      flash('Confirmation accepted. Sending the order now.', 'ok');
      await createAndOptionallyRunJob();
    },
    revise_order: async () => { enterOpenChatRevisionChoice(); },
    cancel_order: async () => {
      const ja = looksJapanese(openChatPreviousAgentMessageBody());
      appendOrderChatExchange(ja ? 'キャンセル' : 'cancel', composeOpenChatPreorderCancelResponse(ja));
    },
    connect_github: async () => { openGithubSignIn(); },
    connect_google: async () => { openPrimaryGoogleSignIn({ capabilities: detail.googleCapabilities || detail.capabilities || '' }); },
    connect_x: async () => { connectXAccount({ capabilities: detail.xCapabilities || detail.capabilities || '' }); },
    download_delivery_zip: async () => {
      const orderId = String(detail.orderId || state.selectedJobId || '').trim();
      const job = await loadJobForChatAction(orderId);
      const files = downloadableDeliveryFilesForJob(job || {});
      if (!job?.id || !files.length) {
        flash('No downloadable delivery ZIP is available for this order yet.', 'warn');
        return;
      }
      downloadDeliveryZip(files, job);
    },
    register_card: async () => {
      openSettingsSection('payments');
      safeText(els.stripeCustomerActionResult, DONATION_ONLY_NOTICE);
      flash('In-app payment setup has been removed. External donation support requires review first.', 'warn');
    },
    open_payments: async () => { openSettingsSection('payments'); },
    open_provider: async () => { openSettingsSection('provider'); },
    open_api_keys: async () => { openSettingsSection('keys'); },
    open_cli_tab: async () => { switchTab('connect'); updateCliPanels(state.snapshot); },
    open_settings: async () => { switchTab('settings'); },
    open_feedback_tab: async () => { openFeedbackForm(); },
    open_work_tab: async () => {
      switchTab('work');
      const orderId = String(detail.orderId || '').trim();
      if (orderId) {
        const job = jobById(orderId) || await loadJobForChatAction(orderId);
        if (job?.id) openJobDetail(job.id);
      }
      focusWorkResults();
    },
    browse_agents: async () => { openAgentCatalog(); },
    list_agent: async () => { openAgentListingFlow(); },
    use_agent_team: async () => {
      addFlexibleToolInstruction('Routing preference: use an Agent Team with a Team Leader if multiple specialties or channels improve quality/cost.');
      flash('Added Agent Team routing preference to the composer.', 'ok');
    }
  };
  const handler = handlers[kind];
  if (handler) await handler();
}

function selectedAgent() {
  return state.snapshot?.agents?.find((agent) => agent.id === state.selectedAgentId) || null;
}

function openPrimaryGoogleSignIn(options = {}) {
  if (isLikelyRestrictedGoogleOAuthBrowser()) {
    flash(googleOAuthBrowserWarning(), 'warn');
  }
  if (!state.snapshot?.auth?.loggedIn && !state.snapshot?.auth?.googleConfigured) {
    openLoginForProtectedAction('google_login_unavailable', 'work');
    return;
  }
  trackLoginStarted('google');
  window.location.href = googleAuthActionUrl(state.snapshot?.auth || {}, options);
}

function continueOpenChatAsGuest() {
  state.openChatEntryDismissed = true;
  renderOrderComposer();
  els.jobPrompt?.focus();
}

function connectXAccount(options = {}) {
  const auth = state.snapshot?.auth || {};
  if (!auth.loggedIn) {
    flash('Sign in first, then connect X. The X connector is saved to your CAIt account.', 'warn');
    openLoginForProtectedAction('connect_x', 'work');
    return;
  }
  if (auth.xConfigured === false || auth.xTokenEncryptionConfigured === false) {
    flash('X OAuth is not configured on this deployment yet.', 'error');
    return;
  }
  const capabilities = Array.isArray(options.capabilities)
    ? options.capabilities
    : String(options.capabilities || '').split(/[,\s]+/).filter(Boolean);
  const url = new URL('/auth/x', window.location.origin);
  if (capabilities.length) url.searchParams.set('capabilities', capabilities.join(','));
  else url.searchParams.set('capabilities', 'x.post');
  window.location.href = `${url.pathname}${url.search}`;
}

function openOrderTab() {
  if (!state.snapshot?.auth?.loggedIn) {
    requireStartLoginGate('work', 'Sign in from START first to use CAIt Chat.');
    return;
  }
  if (els.mainNavMenu) els.mainNavMenu.open = false;
  switchTab('work');
  window.requestAnimationFrame(() => els.jobPrompt?.focus());
}

function openAgentCatalog() {
  if (!state.snapshot?.auth?.loggedIn) {
    requireStartLoginGate('agents', 'Sign in from START first to open the agent catalog.');
    return;
  }
  state.showAgentList = true;
  switchTab('agents');
  renderAgentSetupFlow(state.snapshot?.auth || {});
  renderAgents(state.snapshot?.agents || []);
}

function openAgentListingFlow() {
  if (!state.snapshot?.auth?.loggedIn) {
    requireStartLoginGate('agents', 'Sign in from START first to publish an agent.');
    return;
  }
  state.agentSetupStarted = true;
  state.agentSetupMode = '';
  state.agentSetupCompletedId = null;
  state.showAgentList = true;
  void trackConversionEvent('agent_publish_started', { source: 'listing_flow' });
  switchTab('agents');
  renderAgentSetupFlow(state.snapshot?.auth || {});
  renderAgents(state.snapshot?.agents || []);
}

function looksLikeAgentSkillMarkdown(text = '') {
  const source = String(text || '').trim();
  if (!source || source.length < 40) return false;
  const hasFrontmatter = /^---\s*[\s\S]*?\b(name|description)\s*:\s*.+?[\s\S]*?---/i.test(source);
  const hasHeading = /^#{1,2}\s+\S.+$/m.test(source);
  const hasSkillCue = /\b(SKILL\.md|agent skill|use this skill|when to use|skills? compatibility)\b/i.test(source);
  const hasInstructionCue = /\b(use this skill when|instructions?|workflow|steps?|scripts?|tools?)\b/i.test(source);
  return (hasFrontmatter && (hasHeading || hasInstructionCue)) || (hasSkillCue && hasHeading && hasInstructionCue);
}

async function draftAgentSkillManifestFromText(skillMd = '') {
  const source = String(skillMd || '').trim();
  if (!source) throw new Error('Paste SKILL.md first.');
  const res = await api('/api/agents/draft-skill-manifest', {
    method: 'POST',
    body: JSON.stringify({ skill_md: source })
  });
  if (els.agentSkillMd) els.agentSkillMd.value = source;
  if (els.manifestJson) els.manifestJson.value = JSON.stringify(res.draft_manifest, null, 2);
  setDetail(res);
  return res;
}

function openManualAgentSkillFlow() {
  state.agentSetupStarted = true;
  state.agentSetupMode = 'manual';
  state.agentSetupCompletedId = null;
  state.showAgentList = true;
  switchTab('agents');
  renderAgentSetupFlow(state.snapshot?.auth || {});
  renderAgents(state.snapshot?.agents || []);
  if (els.agentManualPanel?.scrollIntoView) {
    window.requestAnimationFrame(() => {
      els.agentManualPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
}

async function handleAgentSkillMarkdownFromChat(skillMd = '', options = {}) {
  const res = await draftAgentSkillManifestFromText(skillMd);
  const skillName = res.skill?.name || res.draft_manifest?.name || 'Agent Skill';
  const warning = Array.isArray(res.warnings) && res.warnings.length ? `\n\nWarning: ${res.warnings[0]}` : '';
  const ja = looksJapanese(skillMd);
  const body = ja
    ? [
      `${skillName} を${PRODUCT_NAME}のmanifest draftに変換しました。これは注文ではなく、課金も発生しません。`,
      '',
      'AGENTS -> PASTE MANIFEST を開きました。',
      '',
      '次の動き:',
      '1. MANIFEST JSONを確認',
      '2. GitHub連携済みなら IMPORT JSON',
      '3. endpointまたはadapterを用意してverify',
      '',
      '注意: SKILL.md由来のagentは、そのまま任意スクリプト実行しません。公開ルーティングにはhosted endpointまたはadapterの検証が必要です。',
      warning
    ].filter(Boolean).join('\n')
    : [
      `${skillName} was converted into a ${PRODUCT_NAME} manifest draft. This is not an order and no billing occurred.`,
      '',
      'I opened AGENTS -> PASTE MANIFEST.',
      '',
      'Next:',
      '1. Review MANIFEST JSON',
      '2. Press IMPORT JSON after GitHub is linked',
      '3. Add a hosted endpoint or adapter, then verify',
      '',
      `${PRODUCT_SHORT_NAME} does not execute arbitrary SKILL.md scripts directly. Public routing still requires a verified hosted endpoint or adapter.`,
      warning
    ].filter(Boolean).join('\n');
  appendOrderChatExchange(skillMd, {
    kind: 'assist',
    body,
    status: 'Agent Skill manifest draft created.\n\nNo order was created and no billing occurred. Review the JSON in AGENTS before importing.'
  }, {
    tone: 'ok',
    steps: openChatPreviewSteps('skill', skillMd),
    nextPrompt: '',
    transcriptId: options.transcriptId || ''
  });
  openManualAgentSkillFlow();
  flash(`Agent Skill draft JSON created from ${skillName}. Review MANIFEST JSON, then import when ready.`, 'ok');
  return res;
}

function currentRoutingTask() {
  const prompt = currentEffectiveOrderPrompt();
  const requested = String(els.jobType?.value || '').trim();
  if (state.followupToJobId && requested) return openChatCanonicalOrderTaskType(requested, prompt) || requested;
  const resolvedIntent = currentServerResolvedIntentForPrompt(prompt);
  if (resolvedIntent?.taskType) return openChatCanonicalOrderTaskType(resolvedIntent.taskType, prompt) || resolvedIntent.taskType;
  if (prompt) {
    const parts = isStructuredOrderBrief(prompt) ? structuredOrderBriefParts(prompt) : {};
    const inferred = parts.taskType || inferClientTaskSequence('', prompt)[0] || 'research';
    return openChatCanonicalOrderTaskType(inferred, prompt) || inferred || 'research';
  }
  if (requested) return openChatCanonicalOrderTaskType(requested) || requested;
  const selected = selectedJob();
  const selectedTask = String(selected?.taskType || '').trim();
  return openChatCanonicalOrderTaskType(selectedTask) || selectedTask;
}

const clientOrderDraftController = createClientOrderDraftController({
  state,
  els,
  window,
  productShortName: PRODUCT_SHORT_NAME,
  orderInputTotalFileChars: ORDER_INPUT_TOTAL_FILE_CHARS,
  orderInputMaxFiles: ORDER_INPUT_MAX_FILES,
  orderInputMaxFileBytes: ORDER_INPUT_MAX_FILE_BYTES,
  orderInputMaxFileChars: ORDER_INPUT_MAX_FILE_CHARS,
  inAppPaymentsRemoved: IN_APP_PAYMENTS_REMOVED,
  temporaryInvoiceBillingEnabled: TEMPORARY_INVOICE_BILLING_ENABLED,
  agentHealth: (...args) => agentHealth(...args),
  agentTaskFit: (...args) => agentTaskFit(...args),
  appendOrderChatExchange: (...args) => appendOrderChatExchange(...args),
  canOrderFromBrowser: (...args) => canOrderFromBrowser(...args),
  chatEngineBuildIntakeCombinedPrompt: (...args) => chatEngineBuildIntakeCombinedPrompt(...args),
  chatEngineBuildIntakeState: (...args) => chatEngineBuildIntakeState(...args),
  clientOrderPreflight: (...args) => clientOrderPreflight(...args),
  connectorActionLabel: (...args) => connectorActionLabel(...args),
  currentEffectiveOrderPrompt: () => currentEffectiveOrderPrompt(),
  currentRunTargetAgent: () => currentRunTargetAgent(),
  currentRoutingTask: () => currentRoutingTask(),
  currentServerPreparedOrderForPrompt: (...args) => currentServerPreparedOrderForPrompt(...args),
  estimateWindowOfAgent: (...args) => estimateWindowOfAgent(...args),
  fallbackPromptFromOrderInput: (...args) => fallbackPromptFromOrderInput(...args),
  flash: (...args) => flash(...args),
  formatBytes: (...args) => formatBytes(...args),
  formatDisplayCurrency: (...args) => formatDisplayCurrency(...args),
  inferTextMimeFromName: (...args) => inferTextMimeFromName(...args),
  isOrderInputFileSupported: (...args) => isOrderInputFileSupported(...args),
  isStructuredOrderBrief: (...args) => isStructuredOrderBrief(...args),
  ledgerAmountToDisplayCurrency: (...args) => ledgerAmountToDisplayCurrency(...args),
  normalizeClientConnector: (...args) => normalizeClientConnector(...args),
  normalizeOrderInputFile: (...args) => normalizeOrderInputFile(...args),
  normalizeOrderInputUrls: (...args) => normalizeOrderInputUrls(...args),
  openChatCanonicalOrderTaskType: (...args) => openChatCanonicalOrderTaskType(...args),
  openSettingsSection: (...args) => openSettingsSection(...args),
  orderInputCounts: (...args) => orderInputCounts(...args),
  orderRoutingDecision: (...args) => orderRoutingDecision(...args),
  orderStrategyLabel: () => orderStrategyLabel(),
  primarySignInUrl: (...args) => primarySignInUrl(...args),
  readyAgentsForTask: (...args) => readyAgentsForTask(...args),
  renderOrderComposer: () => renderOrderComposer(),
  requestedOrderStrategy: () => requestedOrderStrategy(),
  rewriteStructuredBriefTaskType: (...args) => rewriteStructuredBriefTaskType(...args),
  setElementVisible: (...args) => setElementVisible(...args),
  summarizeOrderDraftForAnalytics: (...args) => summarizeOrderDraftForAnalytics(...args),
  trackConversionEvent: (...args) => trackConversionEvent(...args),
  trackLoginStarted: (...args) => trackLoginStarted(...args)
});
const {
  applyIntakeAnswers,
  clearFollowupContext,
  clearIntakeContext,
  clearOrderComposerPrompt,
  connectorActionForChat,
  currentOrderDraft,
  estimateWindowOfDraft,
  handleNeedsInputResponse,
  handleOrderFilesChanged,
  handleOrderFundingPrompt,
  handleOrderPreflightPrompt,
  makeParallelDraftId,
  orderInputFromComposer,
  preflightFromError,
  queuedDraftAgent,
  renderFollowupContextCard,
  renderIntakePanel,
  renderOrderInputFilesSummary,
  renderOrderInputGuide,
  resolvedOrderStrategyOfDraft,
  routePlanOfDraft,
  validateOrderDraft
} = clientOrderDraftController;

const clientParallelOrderController = createClientParallelOrderController({
  state,
  els,
  api,
  apiPayloadFromOrderDraft,
  clearOrderComposerPrompt,
  clipText,
  currentOrderDraft,
  escapeHtml,
  estimateWindowOfDraft,
  fallbackPromptFromOrderInput,
  flash,
  handleOrderFundingPrompt,
  loadOrderDraftIntoComposer,
  normalizeOrderInputFile,
  orderInputCounts,
  queuedDraftAgent,
  refresh: () => refresh(),
  renderOrderComposer: () => renderOrderComposer(),
  resolvedOrderStrategyOfDraft,
  summarizeOrderDraftForAnalytics,
  trackConversionEvent: (event, details) => trackConversionEvent(event, details),
  validateOrderDraft,
  yen
});
const {
  addCurrentOrderToParallelQueue,
  clearParallelOrders,
  createParallelOrders,
  renderParallelOrderQueue
} = clientParallelOrderController;

const clientOperatorDashboardUtils = createClientOperatorDashboardUtils({
  state,
  els,
  api,
  document,
  Blob,
  URL,
  escapeHtml,
  flash,
  formatPercent,
  formatTime,
  orderProgressStatusLabel,
  refresh: () => refresh(),
  renderSummaryRows,
  safeText,
  setButtonAccess,
  setInputValue,
  sinceLabel,
  trackConversionEvent: (event, details) => trackConversionEvent(event, details),
  yen
});
const {
  exportChatTrainingData,
  renderAdminDashboard,
  renderChatTranscripts,
  renderConversionAnalytics,
  renderFeedbackForm,
  renderFeedbackReports,
  selectedChatTranscript,
  selectedFeedbackReport,
  setAdminChatFilter,
  submitFeedback,
  updateSelectedChatTranscriptReview,
  updateSelectedFeedbackStatus
} = clientOperatorDashboardUtils;

const clientDeliveryRenderUtils = createClientDeliveryRenderUtils({
  articleCandidateFromDelivery,
  authorityRequestFromReport,
  authorityRequestRequiresClientApproval,
  clarifyingQuestionsFromReport,
  deliveryFileDisplayTitle,
  deliveryFileProvenanceParts,
  deliveryStateFromValue,
  deliverySummaryText,
  describeAuthorityNeed,
  els,
  escapeHtml,
  fundingBreakdownLines,
  genericDeliverableFromClassification,
  genericDeliverableFromExplicitFiles,
  inputSourcesFromJob,
  jobById,
  normalizeOrderProgressStatus,
  orderProgressStatusLabel,
  setElementVisible,
  state,
  visibleDeliveryFiles,
  workflowChildDisplayName,
  workflowChildRunsFromDelivery
});
const {
  deliveryCardBodyLines,
  deliveryEmptyStatePresentation,
  deliveryRenderContextFromValue,
  deliverySummaryTone,
  hideDeliveryFollowupPanel,
  maybeClassifyDeliveryCandidates,
  renderDeliveryActionToolbar,
  renderDeliveryFilesPanel,
  renderDeliveryFollowupPanel,
  renderDeliverySummaryCard,
  renderWorkflowChildNote,
  renderWorkflowTeamSummary
} = clientDeliveryRenderUtils;

function deliveryStateFromValue(value) {
  const run = value && typeof value === 'object' && !Array.isArray(value) && ('taskType' in value || 'assignedAgentId' in value || 'jobKind' in value || 'createdAt' in value)
    ? value
    : (value?.job && typeof value.job === 'object' ? value.job : null);
  const directDelivery = value?.delivery && typeof value.delivery === 'object' ? value.delivery : null;
  const derivedDelivery = run
    ? {
        report: run.output?.report || null,
        files: visibleDeliveryFiles(run.output?.files),
        returnTargets: run.output?.returnTargets || ['chat', 'api']
      }
    : null;
  return {
    run,
    delivery: directDelivery || derivedDelivery || null
  };
}

function deliverySummaryText(report = {}) {
  const lines = [];
  if (report.summary) lines.push(`Summary: ${report.summary}`);
  if (Array.isArray(report.bullets) && report.bullets.length) {
    lines.push('', 'Bullets:');
    report.bullets.forEach((bullet) => lines.push(`- ${bullet}`));
  }
  if (report.nextAction) lines.push('', `Next action: ${report.nextAction}`);
  const questions = clarifyingQuestionsFromReport(report);
  if (questions.length) {
    lines.push('', 'Clarifying questions:');
    questions.forEach((question, index) => lines.push(`${index + 1}. ${question}`));
  }
  return lines.join('\n').trim();
}

function workflowChildRunsFromDelivery(run = null, report = {}) {
  const reportChildren = Array.isArray(report?.childRuns) ? report.childRuns : [];
  if (reportChildren.length) return reportChildren;
  const workflowChildren = Array.isArray(run?.workflow?.childRuns) ? run.workflow.childRuns : [];
  return workflowChildren;
}

function loadOrderDraftIntoComposer(order = {}) {
  state.followupToJobId = '';
  state.followupSourceTaskType = '';
  state.followupSourceAgentId = '';
  state.pendingIntake = null;
  state.intakeConfirmed = false;
  state.intakeAnswer = '';
  if (els.followupAnswer) els.followupAnswer.value = '';
  if (els.intakeAnswer) els.intakeAnswer.value = '';
  state.followupToJobId = String(order.followupToJobId || '').trim();
  state.followupSourceTaskType = String(order.taskType || '').trim();
  state.followupSourceAgentId = String(order.agentId || '').trim();
  if (els.jobPrompt) els.jobPrompt.value = String(order.prompt || '');
  if (els.jobType) els.jobType.value = String(order.taskType || 'research');
  if (els.jobAgentId) els.jobAgentId.value = String(order.agentId || '');
  if (els.jobBudget) els.jobBudget.value = String(order.budgetCap ?? 300);
  if (els.jobDeadline) els.jobDeadline.value = String(order.deadlineSec ?? 120);
  if (els.jobStrategy) els.jobStrategy.value = String(order.orderStrategy || 'auto');
  state.orderSettingsExpanded = true;
  switchTab('work');
  renderOrderComposer();
  window.requestAnimationFrame(() => els.jobPrompt?.focus());
}

function clarifyingQuestionsFromReport(report = {}) {
  const raw = report?.clarifyingQuestions
    ?? report?.clarifying_questions
    ?? report?.followupQuestions
    ?? report?.follow_up_questions
    ?? report?.questions
    ?? [];
  const values = Array.isArray(raw)
    ? raw
    : String(raw || '').split(/\r?\n|(?:^|\s)\d+\.\s+/);
  return values
    .map((item) => String(item || '').trim().replace(/^[-*]\s+/, ''))
    .filter(Boolean);
}

function renderRunDelivery(value) {
  if (!els.runDeliveryCard || !els.runDeliveryFiles) return;
  const context = deliveryRenderContextFromValue(value);
  const {
    run,
    delivery,
    report,
    files,
    workflowChildren,
    workflowParent,
    summaryText,
    genericDeliverable,
    fileCount
  } = context;
  els.runDeliveryFiles.innerHTML = '';
  hideDeliveryFollowupPanel();
  renderMarketingTimelineModal(run);
  const emptyState = deliveryEmptyStatePresentation(run, delivery, report, files);
  if (emptyState) {
    els.runDeliveryCard.textContent = emptyState.text;
    els.runDeliveryCard.className = `detail-box action-card ${emptyState.tone} compact-card`;
    return;
  }

  const candidates = { article: context.article, genericDeliverable };
  maybeClassifyDeliveryCandidates(run, report || {}, files, candidates, context.cachedPublishClassification || null);
  const article = candidates.article;
  const summaryDownloadText = deliveryCardBodyLines(run, report || {}, {
    summaryText,
    workflowChildren,
    fileCount
  }).join('\n');
  els.runDeliveryCard.innerHTML = renderDeliverySummaryCard(run, report || {}, {
    summaryText: summaryDownloadText
  });
  els.runDeliveryCard.className = `detail-box action-card ${deliverySummaryTone(run, report || {})} compact-card`;
  els.runDeliveryFiles.innerHTML = renderRunDeliverySections(run, {
    summaryText: summaryDownloadText,
    fileCount,
    files,
    workflowParent,
    article,
    genericDeliverable,
    workflowChildren
  });
  bindDeliveryCommonActionButtons(els.runDeliveryCard, {
    run,
    workflowParent,
    renderedFiles: files,
    summaryText: summaryDownloadText
  });
  bindRunDeliveryInteractions(els.runDeliveryFiles, value, {
    run,
    article,
    genericDeliverable,
    workflowParent,
    files,
    summaryText: summaryDownloadText
  });
}

function setDetail(value) {
  if (value && typeof value === 'object' && !Array.isArray(value) && ('taskType' in value || 'assignedAgentId' in value) && els.runActionCard) {
    const action = runNextAction(value);
    els.runActionCard.textContent = `${action.title}\n\n${action.body}`;
    els.runActionCard.className = `detail-box action-card ${action.tone}`;
  }
  renderRunDelivery(value);
  safeText(els.jobDetail, typeof value === 'string' ? value : summarizeRun(value));
  renderWorkChatThread();
}

function setAgentRunDraft(agent) {
  if (!els.agentRunDraft) return;
  if (!agent) {
    els.agentRunDraft.textContent = 'Select an agent row.';
    return;
  }
  const fit = agentTaskFit(agent);
  const health = agentHealth(agent);
  const estimate = estimateWindowOfAgent(agent, fit.matches && fit.taskType ? fit.taskType : agent.taskTypes?.[0] || 'research');
  const taskType = fit.matches && fit.taskType ? fit.taskType : agent.taskTypes?.[0] || 'research';
  const prompt = `Inspect ${agent.name} and execute ${taskType} work with deterministic routing.`;
  const nextAction = agentNextAction(agent).title.replace('ACTION: ', '');
  const productKind = agentProductKind(agent);
  els.agentRunDraft.textContent = `# exact run draft for ${agent.name}
curl -X POST http://127.0.0.1:8787/api/jobs \\
  -H 'content-type: application/json' \\
  -d '{
    "parent_agent_id":"cloudcode-main",
    "task_type":"${taskType}",
    "agent_id":"${agent.id}",
    "prompt":"${prompt}"
  }'

# operator notes
readiness: ${health.label}
product_type: ${productKind}
availability: ${health.availability}
verify: ${health.verifyLabel}
review: ${health.reviewLabel}
endpoint: ${health.endpoint || 'missing'}
estimated_total: ${estimate ? `${yen(estimate.estimateMinTotal)} – ${yen(estimate.estimateMaxTotal)}` : '-'}
estimated_time: ${estimate ? formatSecRange(estimate.durationMinSec, estimate.durationMaxSec) : '-'}
handoff: explicit agent_id will be used
create_run_now: ${health.ready && fit.matches ? 'yes' : 'no'}
next_action: ${nextAction}`;
}

function setAgentDetail(agent) {
  const action = agentNextAction(agent);
  const onboardingRecord = currentAgentOnboarding(agent?.id);
  const automationReady = canAutomateAgentSetup(agent, onboardingRecord);
  const automationRepo = agentGithubRepo(agent);
  const automationPrepared = adapterAutomationAlreadyPrepared(automationRepo);
  const actionBody = automationReady
    ? `${action.body}\n\nThis setup can be automated on GitHub. Run CHECK and confirm the adapter PR prompt.`
    : (automationPrepared
        ? `${action.body}\n\nA hosted adapter PR was already prepared for this repo. Merge it, deploy, then rerun CHECK.`
        : action.body);
  if (els.agentActionCard) {
    els.agentActionCard.textContent = `${action.title}\n\n${actionBody}`;
    els.agentActionCard.className = `detail-box action-card ${action.tone}`;
  }
  setButtonAccess(els.recheckAgentBtn, Boolean(agent && canCheckAgentOnboarding(agent) && !state.onboardingLoading?.[agent.id]));
  setButtonAccess(els.copyAgentLinkBtn, Boolean(agent));
  setButtonAccess(els.copyAgentPostBtn, Boolean(agent));
  setButtonAccess(els.shareAgentXBtn, Boolean(agent));
  setButtonAccess(els.deleteAgentBtn, Boolean(agent && canDeleteAgent(agent)));
  setButtonAccess(els.saveAgentPricingBtn, Boolean(agent && canEditAgentPricing(agent)));
  if (!agent) {
    safeText(els.agentDetail, 'Select an agent row.');
    if (els.agentPricingMarkup) els.agentPricingMarkup.value = '';
    if (els.agentPricingModel) els.agentPricingModel.value = 'usage_based';
    if (els.agentPricingFixedRunUsd) els.agentPricingFixedRunUsd.value = '';
    if (els.agentPricingMonthlyUsd) els.agentPricingMonthlyUsd.value = '';
    if (els.agentPricingOverageMode) els.agentPricingOverageMode.value = 'included';
    if (els.agentPricingOverageFixedUsd) els.agentPricingOverageFixedUsd.value = '';
    if (els.agentPricingGuide) {
      els.agentPricingGuide.textContent = 'Select your agent to edit pricing.';
      els.agentPricingGuide.className = 'detail-box action-card info compact-card';
    }
    syncAgentPricingEditorVisibility();
    renderAgentOnboarding(null);
    setAgentRunDraft(null);
    return;
  }
  if (!els.agentDetail) {
    renderAgentOnboarding(agent);
    setAgentRunDraft(agent);
    return;
  }
  const health = agentHealth(agent);
  const verification = agentVerification(agent);
  const trust = agentTrustProfile(agent);
  const onboarding = currentAgentOnboarding(agent.id)?.onboarding || null;
  const fit = agentTaskFit(agent);
  const verifyAction = agentVerifyAction(agent);
  const verifyFailure = agentVerifyFailureSummary(agent);
  const relatedJobs = (state.snapshot?.jobs || []).filter((job) => job.assignedAgentId === agent.id);
  const activeJobs = relatedJobs.filter((job) => ['queued', 'claimed', 'running', 'dispatched'].includes(job.status));
  const failedJobs = relatedJobs.filter((job) => ['failed', 'timed_out'].includes(job.status));
  const completedJobs = relatedJobs.filter((job) => job.status === 'completed');
  const providerMarkupRate = providerMarkupRateOf(agent);
  const pricing = agentPricingConfig(agent);
  const productKind = agentProductKind(agent);
  const composition = agentComposition(agent);
  const requirements = agentRequirements(agent);
  const executionProfile = agentExecutionProfile(agent);
  const tags = agentTags(agent);
  const componentLines = composition.components.slice(0, 6).map((component) => {
    const id = component.agentId ? ` [${component.agentId}]` : '';
    const role = component.role ? `: ${component.role}` : '';
    const tasks = component.taskText ? ` (${component.taskText})` : '';
    return `- ${component.name || 'component'}${id}${role}${tasks}`;
  });
  const requirementLines = requirements.slice(0, 6).map((requirement) => {
    const purpose = requirement.purpose ? `: ${requirement.purpose}` : '';
    const fulfillmentLabel = requirementFulfillmentLabel(requirement);
    const fulfillment = fulfillmentLabel ? ` [${fulfillmentLabel}]` : '';
    const flow = requirementFlowSummary(requirement);
    const flowText = flow ? ` · ${flow}` : '';
    return `- ${requirement.label || requirement.type}${requirement.required === false ? ' (optional)' : ''}${fulfillment}${flowText}${purpose}`;
  });
  const lines = [
    `Agent: ${agent.name}`,
    `Product type: ${productKind === 'composite_agent' ? 'Composite Agent Product' : (productKind === 'agent_group' ? 'Agent Group' : 'Single Agent')}`,
    `Status: ${health.label} / ${health.verifyLabel} / ${agent.online ? 'online' : 'offline'}`,
    `Trust: ${trust.label} (${trust.score}/100) · ${trust.level}${trust.executionLayer ? ` · layer ${trust.executionLayer}` : ''}`,
    `Trust basis: ${trust.summary}`,
    ...(trust.sourcePolicy ? [`Trust source gate: ${trust.sourcePolicy}`] : []),
    ...(trust.actionPolicy ? [`Trust action gate: ${trust.actionPolicy}`] : []),
    `Trust QA checks: ${trust.qualityChecks.slice(0, 4).join(' / ') || '-'}`,
    `Trust evidence needs: ${trust.evidenceRequirements.slice(0, 4).join(' / ') || '-'}`,
    `Review: ${health.reviewLabel}`,
    `Tasks: ${(agent.taskTypes || []).join(', ') || '-'}`,
    `Tags: ${tags.length ? tags.join(', ') : '-'}`,
    `Pattern: ${executionProfile.executionPattern || 'async'} · input ${executionProfile.inputTypes.join('/')} · output ${executionProfile.outputTypes.join('/')}`,
    `Clarification: ${executionProfile.clarification} · Scheduled work: ${executionProfile.scheduleSupport ? 'supported' : 'not declared'} · Risk: ${executionProfile.riskLevel}`,
    `Connectors: ${executionProfile.requiredConnectors.length ? executionProfile.requiredConnectors.join(', ') : '-'}`,
    `Confirm before: ${executionProfile.confirmationRequiredFor.length ? executionProfile.confirmationRequiredFor.join(', ') : '-'}`,
    `Pricing model: ${pricing.pricingModel.replace(/_/g, ' ')}`,
    `Provider markup: ${(providerMarkupRate * 100).toFixed(1)}%`,
    ...(pricing.fixedRunPriceUsd > 0 ? [`Fixed run price: ${formatDisplayCurrency(pricing.fixedRunPriceUsd)}`] : []),
    ...(pricing.subscriptionMonthlyPriceUsd > 0 ? [`Provider monthly fee: ${formatDisplayCurrency(pricing.subscriptionMonthlyPriceUsd)} · CAIt keeps ${formatDisplayCurrency(pricing.subscriptionMonthlyPriceUsd * 0.1)}/month from provider billing`] : []),
    ...(pricing.pricingModel === 'hybrid' ? [`Hybrid overage: ${pricing.overageMode === 'fixed_per_run' ? `${formatDisplayCurrency(pricing.overageFixedRunPriceUsd)}/run` : pricing.overageMode.replace(/_/g, ' ')}`] : []),
    'Platform margin: 10.0% of end-user order total',
    `Fit: ${fit.label}`,
    `Endpoint: ${health.endpoint || '-'}`,
    ...(productKind === 'agent'
      ? []
      : [
          `Composition: ${composition.mode || '-'}`,
          `Grouping rule: ${productKind === 'composite_agent'
            ? 'CAIt sends one order to this endpoint; the provider orchestrates internal agents and returns one delivery.'
            : 'Register grouped agents separately; CAIt should ask whether to use them as one flow or separate orders.'}`,
          ...(componentLines.length ? ['Components:', ...componentLines] : ['Components: -'])
        ]),
    ...(requirementLines.length
      ? [
          'Requirements:',
          ...requirementLines,
          `Requirement hub: ${requirementHubSummary(requirements)} and should not ask users to paste secrets in chat.`
        ]
      : []),
    '',
    `Next action: ${action.title.replace('ACTION: ', '')}`,
    `Verify next: ${verifyAction.title}`,
    `Reason: ${verifyFailure.cause}`,
    '',
    `Verify code: ${verification.code || '-'}`,
    `Review reason: ${health.reviewReason}`,
    `Last verify: ${formatTime(agent.verificationCheckedAt)}`,
    `Onboarding: ${onboarding?.status || '-'}`,
    `Onboarding next: ${onboarding?.nextAction?.title || '-'}`,
    '',
    `Runs: active ${activeJobs.length} / failed ${failedJobs.length} / completed ${completedJobs.length}`
  ];
  safeText(els.agentDetail, lines.join('\n'));
  if (els.agentPricingMarkup) els.agentPricingMarkup.value = Number.isFinite(providerMarkupRate) ? String(+providerMarkupRate.toFixed(4)) : '0.1';
  if (els.agentPricingModel) els.agentPricingModel.value = pricing.pricingModel;
  if (els.agentPricingFixedRunUsd) els.agentPricingFixedRunUsd.value = pricing.fixedRunPriceUsd > 0 ? moneyInputValueFromLedger(displayCurrencyToLedgerAmount(pricing.fixedRunPriceUsd)) : '';
  if (els.agentPricingMonthlyUsd) els.agentPricingMonthlyUsd.value = pricing.subscriptionMonthlyPriceUsd > 0 ? moneyInputValueFromLedger(displayCurrencyToLedgerAmount(pricing.subscriptionMonthlyPriceUsd)) : '';
  if (els.agentPricingOverageMode) els.agentPricingOverageMode.value = pricing.overageMode;
  if (els.agentPricingOverageFixedUsd) els.agentPricingOverageFixedUsd.value = pricing.overageFixedRunPriceUsd > 0 ? moneyInputValueFromLedger(displayCurrencyToLedgerAmount(pricing.overageFixedRunPriceUsd)) : '';
  if (els.agentPricingGuide) {
    const editable = canEditAgentPricing(agent);
    els.agentPricingGuide.textContent = editable
      ? agentPricingGuideText(agent)
      : 'Only the agent owner can edit provider pricing.';
    els.agentPricingGuide.className = `detail-box action-card ${editable ? 'info' : 'warn'} compact-card`;
  }
  syncAgentPricingEditorVisibility();
  renderAgentOnboarding(agent);
  setAgentRunDraft(agent);
}

async function deleteAgentRecord(agent) {
  if (!agent) throw new Error('Select an agent first.');
  if (!canDeleteAgent(agent)) throw new Error('Only the agent owner can delete this agent.');
  const confirmed = window.confirm(`Delete ${agent.name}? Historical runs stay, but this agent will be removed from the registry.`);
  if (!confirmed) return { cancelled: true };
  const deletedId = agent.id;
  const res = await api(`/api/agents/${deletedId}`, { method: 'DELETE' });
  if (els.jobAgentId?.value === deletedId) els.jobAgentId.value = '';
  if (els.claimAgentId?.value === deletedId) els.claimAgentId.value = '';
  delete state.agentOnboarding[deletedId];
  if (state.selectedAgentId === deletedId) state.selectedAgentId = null;
  if (state.agentSetupCompletedId === deletedId) state.agentSetupCompletedId = null;
  state.showAgentList = true;
  renderOrderComposer();
  flash(`Deleted ${res.agent?.name || agent.name}. Historical runs were kept.`, 'ok');
  await refresh();
  return res;
}

async function saveAgentPricing(agent) {
  if (!agent) throw new Error('Select an agent first.');
  if (!canEditAgentPricing(agent)) throw new Error('Only the agent owner can edit pricing.');
  const providerMarkupRate = Number(els.agentPricingMarkup?.value || 0.1);
  const pricingModel = normalizeClientPricingModel(els.agentPricingModel?.value || 'usage_based');
  const fixedRunPriceUsd = Number(els.agentPricingFixedRunUsd?.value || 0);
  const subscriptionMonthlyPriceUsd = Number(els.agentPricingMonthlyUsd?.value || 0);
  const overageMode = normalizeClientOverageMode(els.agentPricingOverageMode?.value || '', pricingModel === 'hybrid' ? 'usage_based' : 'included');
  const overageFixedRunPriceUsd = Number(els.agentPricingOverageFixedUsd?.value || 0);
  if (!Number.isFinite(providerMarkupRate) || providerMarkupRate < 0 || providerMarkupRate > 1) {
    throw new Error('Provider markup must be a number between 0 and 1, for example 0.10 for 10%.');
  }
  if (pricingModel === 'fixed_per_run' && (!Number.isFinite(fixedRunPriceUsd) || fixedRunPriceUsd <= 0)) {
    throw new Error('Fixed per run needs a positive USD run price.');
  }
  if ((pricingModel === 'subscription_required' || pricingModel === 'hybrid') && (!Number.isFinite(subscriptionMonthlyPriceUsd) || subscriptionMonthlyPriceUsd <= 0)) {
    throw new Error('Subscription pricing needs a positive monthly USD price.');
  }
  if (pricingModel === 'hybrid' && overageMode === 'fixed_per_run' && (!Number.isFinite(overageFixedRunPriceUsd) || overageFixedRunPriceUsd <= 0)) {
    throw new Error('Hybrid fixed overage needs a positive USD run price.');
  }
  const res = await api(`/api/agents/${agent.id}/pricing`, {
    method: 'PATCH',
    body: JSON.stringify({
      provider_markup_rate: providerMarkupRate,
      token_markup_rate: providerMarkupRate,
      pricing_model: pricingModel,
      fixed_run_price_usd: fixedRunPriceUsd,
      subscription_monthly_price_usd: subscriptionMonthlyPriceUsd,
      overage_mode: overageMode,
      overage_fixed_run_price_usd: overageFixedRunPriceUsd
    })
  });
  flash(`Saved pricing for ${res.agent?.name || agent.name}.`, 'ok');
  await refresh();
  state.selectedAgentId = res.agent?.id || agent.id;
  renderAgents(state.snapshot?.agents || []);
  return res;
}

function syncTopWorkChatCta() {
  setElementVisible(els.topOpenChatBtn, state.currentTab !== 'work');
}

function requireStartLoginGate(targetTab = 'start', reason = 'Sign in from START first.') {
  if (els.mainNavMenu) els.mainNavMenu.open = false;
  const safeTargetTab = normalizeTab(targetTab) || 'work';
  void trackConversionEvent('start_login_gate_hit', {
    source: safeTargetTab,
    current_tab: state.currentTab || 'start'
  });
  openDedicatedLoginPage({
    source: `gate_${safeTargetTab}`,
    nextTab: safeTargetTab
  });
}

function showAuthCheckingScreen(targetTab = 'work') {
  state.pendingAuthTab = normalizeTab(targetTab) || 'work';
  state.currentTab = 'auth-check';
  document.querySelectorAll('[data-screen]').forEach((node) => {
    node.hidden = node.dataset.screen !== 'auth-check';
  });
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.classList.toggle('active', false);
  });
  syncTopWorkChatCta();
}

function pauseWorkChatOnTabLeave() {
  const hasBoundaryState = Boolean(
    state.pendingOrderConfirmation
    || state.pendingIntake
    || state.intakeConfirmed
    || (Array.isArray(state.openChatClarifyOptions) && state.openChatClarifyOptions.length)
    || openChatLastPromptWasOrderDecision()
    || String(state.openChatPreparedBrief || '').trim()
  );
  if (!hasBoundaryState) return;
  finishOpenChatTyping({ render: false });
  clearOpenChatOrderProgressTimer();
  clearOpenChatAcceptanceProgressTimer();
  state.openChatProgressOrderId = '';
  state.openChatProgressLastKey = '';
  state.openChatProgressPollCount = 0;
  state.openChatPendingDispatchMessageId = '';
  state.pendingOrderConfirmation = null;
  state.pendingIntake = null;
  state.intakeConfirmed = false;
  state.intakeAnswer = '';
  state.openChatClarifyOptions = [];
  state.openChatDecisionSuppressed = true;
  state.openChatVagueChoicePrompt = '';
  state.openChatNaturalChoiceIntent = '';
  state.openChatIntentShiftPrompt = '';
  state.openChatIdeaBacklogPrompt = '';
  state.openChatLeaderChoicePrompt = '';
  state.openChatLeaderChoiceCandidates = [];
  state.openChatLeaderIntakePrompt = '';
  state.openChatLeaderIntakeTask = '';
  state.openChatPendingQuestionPrompt = '';
  state.openChatPendingQuestionTask = '';
  state.openChatPendingQuestionPattern = '';
  state.openChatPausedByTabLeave = true;
  if (els.intakeAnswer) els.intakeAnswer.value = '';
  state.openChatLastStatus = 'CAIt Chat paused after leaving the chat view.\n\nType "continue" to resume this draft, or send a new request.';
  state.openChatLastStatusTone = 'info';
  persistCurrentOpenChatSession();
}

function switchTab(tab, options = {}) {
  if (els.mainNavMenu) els.mainNavMenu.open = false;
  const auth = state.snapshot?.auth || null;
  const authKnown = Boolean(state.snapshot?.auth);
  const loggedIn = Boolean(auth?.loggedIn);
  const previousTab = state.currentTab;
  let nextTab = String(tab || '').trim() || 'start';
  if (previousTab === 'work' && nextTab !== 'work') {
    pauseWorkChatOnTabLeave();
  }
  if (!loggedIn && nextTab !== 'start') {
    if (!authKnown && options.allowBootstrapAccess === true) {
      // During the first snapshot load, preserve the requested post-login route
      // behind a neutral checking screen instead of showing private UI or login.
      showAuthCheckingScreen(nextTab);
      return;
    } else {
      requireStartLoginGate(nextTab, 'Sign in from START first. The product experience is private after login.');
      return;
    }
  }
  if (loggedIn && nextTab === 'start') {
    nextTab = defaultLoggedInTab(state.snapshot);
  }
  if (nextTab === 'admin' && !auth?.isPlatformAdmin) {
    nextTab = loggedIn ? defaultLoggedInTab(state.snapshot) : 'start';
  }
  state.currentTab = nextTab;
  rememberTab(nextTab);
  document.querySelectorAll('[data-screen]').forEach((node) => {
    node.hidden = node.dataset.screen !== nextTab;
  });
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tab === nextTab);
  });
  syncTopWorkChatCta();
  syncRouteState();
  if (nextTab === 'work') trackConversionOnce('work_chat_opened', { source: 'tab' }, 'work_chat_opened');
  if (nextTab === 'agents') trackConversionOnce('agent_catalog_opened', { source: 'tab' }, 'agent_catalog_opened');
  if (nextTab === 'settings' && state.snapshot && !state.initialSnapshotLoading) {
    void refresh().catch((error) => {
      flash(error.message, 'error');
    });
  }
}

function syncLanding(snapshot = state.snapshot || {}) {
  const auth = snapshot?.auth || {};
  const loggedIn = Boolean(auth?.loggedIn);
  if (state.currentTab === 'auth-check') {
    const targetTab = state.pendingAuthTab || 'work';
    state.pendingAuthTab = '';
    if (loggedIn) {
      switchTab(targetTab);
    } else {
      requireStartLoginGate(targetTab, 'Sign in from START first. The product experience is private after login.');
    }
    return;
  }
  setTabVisible('start', !loggedIn);
  if (!loggedIn && state.currentTab !== 'start') {
    switchTab('start');
    return;
  }
  if (loggedIn && state.currentTab === 'start') {
    switchTab(defaultLoggedInTab(snapshot));
  }
}

function flash(message, kind = 'ok') {
  if (!els.flash) return;
  els.flash.hidden = false;
  els.flash.textContent = formatWorkUiText(String(message || ''));
  els.flash.className = `box flash ${kind}`;
}

function clearFlash() {
  if (!els.flash) return;
  els.flash.hidden = true;
  els.flash.textContent = '';
  els.flash.className = 'box flash';
}

const clientAgentCatalogController = createClientAgentCatalogController({
  state,
  els,
  DEVELOPER_SURFACES_STATUS,
  DEVELOPER_SURFACES_NOTICE,
  activeApiKeys,
  agentComposition,
  agentCompositionSummary,
  agentHealth,
  agentNextAction,
  agentProductKind,
  agentRequirementSummary,
  agentRole,
  agentTags,
  agentTaskFit,
  agentTrustProfile,
  agentVerification,
  agentVerifyAction,
  agentVerifyFailureSummary,
  api,
  applyAgentToRunForm,
  canDeleteAgent,
  canOrderFromBrowser,
  canUseDevApi,
  clipText,
  compareAgents,
  currentRoutingTask,
  deleteAgentRecord,
  escapeHtml,
  estimateWindowOfAgent,
  flash,
  formatPercent,
  formatSecRange,
  isAgentSuiteProduct,
  isCompositeAgentProduct,
  isManagedSampleAgent,
  maybeAutoCheckSelectedAgent,
  parseSearchTokens,
  pricingModelLabel,
  refresh,
  renderOrderComposer,
  runAction,
  safeCssToken,
  safeText,
  selectedAgent,
  selectedJob,
  setAgentDetail,
  shortUrl,
  trackConversionEvent,
  yen
});

const {
  renderAgentTaskFilter,
  applyAgentQuickFilter,
  renderAgentOps,
  renderAgentFilterSummary,
  agentActionKey,
  agentMatchesFilters,
  refreshRoutingViews,
  updateCliPanels,
  renderAgents
} = clientAgentCatalogController;
function renderAuth(auth) {
  if (!auth) return;
  setTabVisible('admin', Boolean(auth.isPlatformAdmin));
  if (!auth.isPlatformAdmin && state.currentTab === 'admin') switchTab(auth.loggedIn ? defaultLoggedInTab(state.snapshot) : 'start');
  if (els.authStatus) {
    const lines = [
      `Login: ${auth.loggedIn ? 'connected' : 'not connected'}`,
      `User: ${auth.user ? `${auth.user.login}` : '-'}`,
      `Mode: ${auth.authProvider || 'guest'}`,
      `Linked: ${linkedProvidersLabel(auth)}`,
      `Google access in this browser: ${isGoogleAuthorized(auth) ? 'yes' : 'no'}`,
      `GitHub access in this browser: ${isGithubAuthorized(auth) ? 'yes' : 'no'}`,
      `Can order/pay: ${canOrderFromBrowser(auth) ? 'yes' : 'no'}`,
      `Can register agents: ${canManageAgentsFromBrowser(auth) ? 'yes' : 'no'}`,
      `Can receive payouts: ${canManagePayoutsFromBrowser(auth) ? 'yes' : 'no'}`,
      `Admin dashboard: ${auth.isPlatformAdmin ? 'yes' : 'no'}`
    ];
    if (Boolean(auth.googleConfigured) && isLikelyRestrictedGoogleOAuthBrowser()) {
      lines.push('Google sign-in note: use Chrome, Edge, or Safari if Google blocks this browser.');
    }
    els.authStatus.textContent = lines.join('\n');
  }
  const googleAvailable = Boolean(auth.googleConfigured);
  const githubAvailable = Boolean(auth.githubConfigured || auth.githubAppConfigured);
  const googleLinked = isGoogleLinked(auth);
  const githubLinked = isGithubLinked(auth);
  const googleAuthorized = isGoogleAuthorized(auth);
  const githubAuthorized = isGithubAuthorized(auth);
  const showGoogleButton = !auth.loggedIn || !googleAuthorized;
  const showGithubButton = !auth.loggedIn || !githubAuthorized;
  setElementVisible(els.googleLoginBtn, showGoogleButton && googleAvailable);
  setElementVisible(els.githubLoginBtn, showGithubButton && githubAvailable);
  setElementVisible(els.logoutBtn, true);
  if (els.googleLoginBtn) {
    els.googleLoginBtn.disabled = !googleAvailable;
    els.googleLoginBtn.textContent = !auth.loggedIn
      ? 'GOOGLE SIGN IN'
      : googleLinked
        ? 'REFRESH GOOGLE ACCESS'
        : connectorActionLabel('connect_google');
  }
  if (els.githubLoginBtn) {
    els.githubLoginBtn.disabled = !githubAvailable;
    els.githubLoginBtn.textContent = !auth.loggedIn
      ? 'GITHUB SIGN IN'
      : githubLinked
        ? 'REFRESH GITHUB ACCESS'
        : connectorActionLabel('connect_github');
  }
  if (els.logoutBtn) {
    els.logoutBtn.disabled = false;
    els.logoutBtn.textContent = auth.loggedIn ? 'LOGOUT' : 'RESET SESSION';
  }
  trackAuthCompletion(auth);
  renderReleaseAccess(auth);
}

function render(snapshot) {
  state.snapshot = snapshot;
  const { stats, agents, jobs, events, storage, auth, billingAudits, accountSettings, monthlySummary } = snapshot;
  const runtimeOwner = String(state.openChatRuntimeOwnerLogin || '').toLowerCase();
  const activeOwner = String(auth?.user?.login || 'guest').toLowerCase();
  if (runtimeOwner && runtimeOwner !== activeOwner) {
    writeOpenChatSessions([]);
    state.currentOpenChatSessionId = '';
  }
  state.openChatRuntimeOwnerLogin = activeOwner;
  rememberAuthState(Boolean(auth?.loggedIn));
  if (state.routeAgentId && agents.some((agent) => agent.id === state.routeAgentId)) {
    state.selectedAgentId = state.routeAgentId;
    state.routeAgentId = '';
    if (state.currentTab !== 'agents') switchTab('agents');
  }
  syncLanding(snapshot);
  mergeServerChatMemorySessions(snapshot);
  renderAgentTaskFilter(agents);
  renderStartGuide(snapshot);
  safeText(els.activeJobs, stats.activeJobs);
  safeText(els.onlineAgents, stats.onlineAgents);
  safeText(els.grossVolume, yen(stats.grossVolume));
  safeText(els.platformRevenue, yen(stats.platformRevenue));
  safeText(els.todayCost, yen(stats.todayCost));
  safeText(els.failedJobs, stats.failedJobs);
  safeText(els.storageDetail, [
    `Storage: ${storage.kind}`,
    `Persistent: ${storage.supportsPersistence ? 'yes' : 'no'}`,
    `Deploy target: cloudflare-worker`,
    `Path: ${storage.path || '-'}`,
    `Note: ${storage.note || '-'}`
  ].join('\n'));
  renderAuth(auth);
  renderAgentSetupFlow(auth);
  renderWorkFlow(snapshot);
  renderScheduledWorkList(snapshot.recurringOrders || []);
  renderConnectHub(snapshot);
  renderStream(events);
  renderRunHealth(stats);
  renderAgentOps(agents);
  renderAgents(agents);
  renderOrderComposer();
  renderJobs(jobs);
  renderBilling(jobs);
  renderBillingAudits(billingAudits || []);
  renderSettings(accountSettings, monthlySummary, auth);
  renderSettingsFlow(accountSettings, monthlySummary, auth);
  renderFeedbackForm(auth);
  renderFeedbackReports(snapshot.feedbackReports || [], auth);
  renderConversionAnalytics(snapshot.conversionAnalytics || null, auth);
  renderChatTranscripts(snapshot.chatTranscripts || [], auth);
  renderAdminDashboard(snapshot.adminDashboard || null, auth);
  updateCliPanels(snapshot);
  if (state.selectedJobId) {
    const job = snapshot.jobs.find((item) => item.id === state.selectedJobId);
    if (job) {
      setDetail(job);
    }
  }
  if (state.selectedAgentId) {
    const agent = snapshot.agents.find((item) => item.id === state.selectedAgentId);
    if (agent) {
      setAgentDetail(agent);
      maybeAutoCheckSelectedAgent(agent);
    }
  }
}

async function refresh() {
  const period = encodeURIComponent(state.settingsPeriod || currentMonthPeriod());
  const snapshot = mergeOptimisticOrderJobsIntoSnapshot(await api(`/api/snapshot?period=${period}`));
  state.snapshot = snapshot;
  state.stripeStatus = null;
  render(snapshot);
  syncOpenChatTrackedJobsFromSnapshot(snapshot);
  scheduleLiveSnapshotRefresh(snapshot);
  void backfillTrackedJobsIntoSnapshot(snapshot).catch(() => {});
  void maybeAutoLoadRepos(snapshot.auth).catch(() => {});
}

function loadManifestExample() {
  if (!els.manifestJson) return;
  els.manifestJson.value = JSON.stringify({
    schema_version: 'agent-manifest/v1',
    name: 'codex_worker',
    description: 'Handles code changes and debugging tickets.',
    task_types: ['code', 'debug'],
    pricing: { provider_markup_rate: 0.1, token_markup_rate: 0.1, platform_margin_rate: 0.1 },
    requirements: [
      {
        type: 'github_repo',
        label: 'GitHub repository access',
        fulfillment: 'native_ui',
        launch_label: 'Open GitHub app or repository settings',
        completion_signal: 'manual_confirm',
        purpose: 'Code changes should run in a sandbox branch and be delivered as a pull request.'
      }
    ],
    usage_contract: {
      report_input_tokens: true,
      report_output_tokens: true,
      report_model: true,
      report_external_api_cost: true
    },
    success_rate: 0.92,
    avg_latency_sec: 45,
    owner: 'Kuni',
    healthcheck_url: 'https://example.com/api/health',
    verification: {
      challenge_path: '/.well-known/agent-challenge.txt',
      challenge_token: 'replace-me'
    }
  }, null, 2);
}

async function importManifestUrlAndVerify(manifestUrl, label = 'Manifest') {
  const imported = await api('/api/agents/import-url', {
    method: 'POST',
    body: JSON.stringify({ manifest_url: manifestUrl })
  });
  const importedAgentId = imported.agent?.id || '';
  if (!importedAgentId) throw new Error(`${label} import did not return an agent id.`);
  const verification = await api(`/api/agents/${importedAgentId}/verify`, { method: 'POST' });
  const selectedId = verification.agent?.id || importedAgentId;
  state.selectedAgentId = selectedId;
  delete state.agentOnboarding[selectedId];
  setDetail({ input: manifestUrl, import: imported, verification });
  await refresh();
  if (selectedId) await loadAgentOnboarding(selectedId, { force: true, silent: true });
  completeAgentSetup(selectedId);
  renderAgentSetupFlow(state.snapshot?.auth);
  const verifiedAgent = verification.agent || imported.agent || null;
  const verifyFailure = agentVerifyFailureSummary(verifiedAgent);
  void trackConversionEvent('agent_imported', {
    source: 'manifest_url',
    status: imported.agent?.id ? 'imported' : 'unknown',
    agentId: selectedId
  });
  void trackConversionEvent('agent_verified', {
    source: 'manifest_url',
    status: verification.verification?.ok ? 'verified' : 'failed',
    agentId: selectedId
  });
  flash(
    verification.verification?.ok
      ? `${label} imported and verified for ${verifiedAgent?.name || selectedId}.`
      : `${label} imported, but verify failed: ${verifyFailure.cause} Next: ${verifyFailure.next}`,
    verification.verification?.ok ? 'ok' : 'error'
  );
  return { imported, verification };
}

function applyAgentToRunForm(agent, options = {}) {
  if (!agent) return;
  const fit = agentTaskFit(agent);
  if (els.jobAgentId) els.jobAgentId.value = agent.id;
  if (els.jobType) {
    const preferredTask = fit.matches && fit.taskType ? fit.taskType : agent.taskTypes?.[0] || els.jobType.value || 'research';
    els.jobType.value = preferredTask;
  }
  if (els.jobPrompt && !els.jobPrompt.value.trim()) {
    els.jobPrompt.value = `I want to use ${agent.name} for ${(els.jobType?.value || agent.taskTypes?.[0] || 'research')} work. Help me shape the request before ordering.`;
  }
  renderOrderComposer();
  if (options.switchToRuns) {
    state.workFlowMode = 'create';
    state.workFlowShowList = false;
    switchTab('work');
  }
  if (options.announce) flash(options.message || `CAIt Chat pinned to ${agent.name}.`, 'ok');
}

async function runOpenChatHubCommand(command = '') {
  const prompt = String(command || '').trim();
  if (!prompt || !els.jobPrompt) return;
  els.jobPrompt.value = prompt;
  renderOrderComposer();
  await createAndOptionallyRunJob();
}

function acceptPreparedOpenChatOrderForDispatch(preparedBrief = '') {
  const prepared = String(preparedBrief || lastOpenChatPreparedBrief() || '').trim();
  if (!isStructuredOrderBrief(prepared)) return null;
  const structuredTask = String(structuredOrderBriefParts(prepared).taskType || '').trim();
  const taskType = openChatPreserveSeedTaskType(prepared, structuredTask);
  const prompt = structuredTask ? prepared : rewriteStructuredBriefTaskType(prepared, taskType);
  state.openChatPreparedBrief = prompt;
  markOpenChatDecisionSuppressedForBrief(prompt);
  clearPinnedAgentIfMismatchedBrief(prompt);
  state.pendingOrderConfirmation = {
    accepted: true,
    agentId: '',
    acceptedAt: new Date().toISOString()
  };
  if (els.jobPrompt) els.jobPrompt.value = '';
  return { prompt, taskType };
}

async function handleCreateJobButtonClick() {
  const inputCounts = orderInputCounts(orderInputFromComposer());
  const visiblePrompt = currentVisibleOrderPrompt();
  const prepared = lastOpenChatPreparedBrief();
  if (!visiblePrompt && !inputCounts.urlCount && !inputCounts.fileCount && isStructuredOrderBrief(prepared)) {
    await dispatchOpenChatConfirmedChoice();
    return;
  }
  await createAndOptionallyRunJob();
}

async function createAndOptionallyRunJob() {
  cancelOrderComposerRender();
  state.orderComposerDirtySinceSend = false;
  const resumePrompt = String(els.jobPrompt?.value || '').trim();
  if (state.openChatPausedByTabLeave && !resumePrompt) {
    const pausedBody = 'CAIt Chat is paused after leaving the chat view.\n\nType "continue" to resume this draft, or send a new request.';
    state.openChatLastStatus = pausedBody;
    state.openChatLastStatusTone = 'info';
    updateWorkChatStatusCard('CAIt Chat paused.', 'Type "continue" to resume this draft, or send a new request.', 'info');
    flash('CAIt Chat is paused. Type "continue" or send a new request.', 'info');
    persistCurrentOpenChatSession();
    syncCreateJobButtonForCurrentPrompt();
    return;
  }
  if (state.openChatPausedByTabLeave && resumePrompt) {
    state.openChatPausedByTabLeave = false;
  }
  let draft = currentOrderDraft();
  const inputCounts = orderInputCounts(draft.input || null);
  const preparedBriefForChoice = lastOpenChatPreparedBrief();
  if (!String(draft.prompt || '').trim() && !inputCounts.urlCount && !inputCounts.fileCount) {
    const accepted = acceptPreparedOpenChatOrderForDispatch(preparedBriefForChoice);
    if (accepted) {
      draft = {
        ...draft,
        prompt: accepted.prompt,
        task_type: accepted.taskType,
        agent_id: ''
      };
    } else {
      flash('Write a request first.', 'info');
      updateWorkChatStatusCard(
        'Write the request first.',
        `${PRODUCT_SHORT_NAME} can chat, prepare an order, or dispatch work after a draft is ready.`,
        'info'
      );
      syncCreateJobButtonForCurrentPrompt();
      return;
    }
  }
  const analyticsDraft = summarizeOrderDraftForAnalytics(draft, 'work_chat');
  const originalChatPrompt = String(draft.prompt || '').trim();
  const explicitDispatchRequested = isOpenChatExplicitDispatchRequest(originalChatPrompt);
  void trackConversionEvent('chat_message_sent', analyticsDraft);
  const submittedTranscriptId = trackOpenChatSubmitTranscript(draft, analyticsDraft);
  if (looksLikeAgentSkillMarkdown(draft.prompt)) {
    await handleAgentSkillMarkdownFromChat(draft.prompt, { transcriptId: submittedTranscriptId });
    return;
  }
  let structuredDispatchPrompt = isOpenChatDispatchReadyPrompt(draft.prompt);
  const preorderDecisionCommand = structuredDispatchPrompt ? '' : openChatPreorderDecisionCommand(originalChatPrompt);
  if (!structuredDispatchPrompt && preorderDecisionCommand === 'confirm_preorder_order') {
    const confirmed = buildOpenChatConfirmedDispatchDraft(openChatDecisionOriginalPrompt() || originalChatPrompt, inputCounts);
    draft = {
      ...draft,
      prompt: confirmed.prompt,
      task_type: confirmed.taskType,
      agent_id: ''
    };
    state.openChatPreparedBrief = confirmed.prompt;
    markOpenChatDecisionSuppressedForBrief(confirmed.prompt);
    state.pendingOrderConfirmation = {
      accepted: true,
      agentId: '',
      acceptedAt: new Date().toISOString()
    };
    if (els.jobPrompt) els.jobPrompt.value = '';
    structuredDispatchPrompt = true;
  }
  if (!structuredDispatchPrompt && !isNonOrderConversationIntentText(originalChatPrompt) && !openChatHasActiveLocalFollowupState(originalChatPrompt)) {
    const resolvedIntent = await resolveWorkIntentViaApi(originalChatPrompt);
    if (resolvedIntent?.kind === 'order') {
      applyServerResolvedIntent(resolvedIntent, originalChatPrompt);
      const preparedOrder = await prepareWorkOrderViaApi(originalChatPrompt, requestedOrderStrategy());
      if (preparedOrder?.ok === false && preparedOrder.status === 'intent_failed') {
        appendOrderChatExchange(originalChatPrompt, {
          kind: 'clarify',
          tone: 'warn',
          body: [
            'I could not classify this request with OpenAI, so I did not create an order draft.',
            '',
            `Reason: ${preparedOrder.error || 'OpenAI intent classification failed.'}`,
            '',
            'Please try again in a moment, or add the target URL/product, desired outcome, and constraints.'
          ].join('\n'),
          status: 'OpenAI intent classification failed. No order was created.'
        }, { transcriptId: submittedTranscriptId, tone: 'warn' });
        void trackConversionEvent('open_chat_intent_failed', { ...analyticsDraft, status: preparedOrder.code || 'openai_intent_failed', source: preparedOrder.source || 'openai' });
        return;
      }
      if (chatEngineIsNeedsInputResponse(preparedOrder)) {
        handleNeedsInputResponse(preparedOrder, {
          ...draft,
          prompt: originalChatPrompt,
          task_type: preparedOrder.inferred_task_type || preparedOrder.taskType || draft.task_type
        });
        appendOrderChatExchange(originalChatPrompt, {
          kind: 'clarify',
          tone: 'warn',
          body: [
            preparedOrder.message || 'I need a few more details before preparing or dispatching this order.',
            '',
            ...(Array.isArray(preparedOrder.questions) ? preparedOrder.questions.map((question, index) => `${index + 1}. ${question}`) : []),
            '',
            'Nothing has run and nothing has been billed yet.'
          ].filter(Boolean).join('\n'),
          status: 'More information is required before SEND ORDER.'
        }, { transcriptId: submittedTranscriptId, tone: 'warn' });
        void trackConversionEvent('intake_questions_shown', { ...analyticsDraft, status: 'prepare_needs_input' });
        return;
      }
      applyServerPreparedOrder(preparedOrder, originalChatPrompt);
      draft = currentOrderDraft();
    } else if (resolvedIntent?.kind === 'command' || resolvedIntent?.kind === 'chat') {
      applyServerResolvedIntent(null);
      applyServerPreparedOrder(null);
    }
    if (resolvedIntent?.kind === 'command' && resolvedIntent.action) {
      const resolvedCommandAnswer = buildOpenChatCommandAnswer(originalChatPrompt);
      if (resolvedCommandAnswer) {
        appendOrderChatExchange(draft.prompt, resolvedCommandAnswer, { transcriptId: submittedTranscriptId });
        const resolvedKind = chatAnswerKind(resolvedCommandAnswer);
        flash(
          resolvedKind === 'command'
            ? 'CAIt Chat command ran. No order was created.'
            : 'Answered in chat. No order was created.',
          resolvedKind === 'command' ? 'ok' : 'info'
        );
        void trackConversionEvent('chat_answered', { ...analyticsDraft, status: resolvedKind || 'command', source: 'server_intent_resolution' });
        return;
      }
    }
  }
  let quickAnswer = structuredDispatchPrompt
    ? null
    : await resolveOpenChatServerLeaderIntake(draft.prompt, inputCounts, draft);
  if (!quickAnswer && !structuredDispatchPrompt) {
    quickAnswer = buildOpenChatPreLlmGuardAnswer(draft.prompt, inputCounts);
  }
  const skipOpenAiPolish = quickAnswer?.skipOpenAiPolish === true;
  const openAiBriefPolishCandidate = !structuredDispatchPrompt
    && !skipOpenAiPolish
    && quickAnswer
    && chatAnswerKind(quickAnswer) === 'assist'
    && isStructuredOrderBrief(quickAnswer.nextPrompt || lastOpenChatPreparedBrief());
  const openAiReasoningCandidate = !structuredDispatchPrompt
    && !skipOpenAiPolish
    && !quickAnswer
    && openChatShouldPreferOpenAiReasoning(draft.prompt, inputCounts);
  const preferOpenAiReasoning = !structuredDispatchPrompt
    && !skipOpenAiPolish
    && (openAiBriefPolishCandidate || openAiReasoningCandidate);
  let llmFallbackReason = preferOpenAiReasoning
    ? (openAiBriefPolishCandidate ? 'openai_order_brief_polish' : 'default_openai_reasoning')
    : (structuredDispatchPrompt ? '' : openChatLlmFallbackReason(draft.prompt, inputCounts, quickAnswer));
  let mustUseLlmFallback = !structuredDispatchPrompt && openChatMustUseLlmFallback(draft.prompt, quickAnswer);
  if (llmFallbackReason) {
    void trackConversionEvent('open_chat_llm_fallback_recommended', {
      ...analyticsDraft,
      status: String(llmFallbackReason).slice(0, 60),
      patternId: String(quickAnswer?.patternId || '').slice(0, 80),
      answerKind: chatAnswerKind(quickAnswer) || ''
    });
  }
  const llmTelemetry = {};
  const preorderIntentLlmAnswer = structuredDispatchPrompt
    ? null
    : await requestOpenChatPreorderIntentResolution(draft.prompt, inputCounts, quickAnswer, {
      force: preferOpenAiReasoning,
      telemetry: llmTelemetry,
      preparedBrief: quickAnswer?.nextPrompt || lastOpenChatPreparedBrief() || ''
    });
  if (preorderIntentLlmAnswer) quickAnswer = preorderIntentLlmAnswer;
  if (!quickAnswer && preferOpenAiReasoning) {
    quickAnswer = quickOrderChatAnswer(draft.prompt, inputCounts);
    if (quickAnswer) {
      quickAnswer = withOpenChatResponseSource(
        quickAnswer,
        'openai_unavailable_local',
        llmTelemetry.error || llmFallbackReason || 'default_openai_reasoning'
      );
    } else {
      quickAnswer = buildOpenChatLlmFallbackUnavailableAnswer(draft.prompt, llmTelemetry.error || llmFallbackReason || 'default_openai_reasoning');
    }
  }
  if (!quickAnswer && !structuredDispatchPrompt) {
    quickAnswer = quickOrderChatAnswer(draft.prompt, inputCounts);
    llmFallbackReason = openChatLlmFallbackReason(draft.prompt, inputCounts, quickAnswer);
    mustUseLlmFallback = openChatMustUseLlmFallback(draft.prompt, quickAnswer);
  }
  if (!structuredDispatchPrompt && (!quickAnswer || mustUseLlmFallback) && llmFallbackReason && !preorderIntentLlmAnswer) {
    if (quickAnswer && llmTelemetry.attempted && llmTelemetry.error) {
      quickAnswer = withOpenChatResponseSource(quickAnswer, 'openai_unavailable_local', llmTelemetry.error || llmFallbackReason);
      mustUseLlmFallback = false;
    } else {
      quickAnswer = buildOpenChatLlmFallbackUnavailableAnswer(draft.prompt, llmFallbackReason);
    }
  }
  const directDispatchBrief = explicitDispatchRequested && openChatCanDirectDispatchAssistAnswer(originalChatPrompt, quickAnswer)
    ? String(quickAnswer.nextPrompt || lastOpenChatPreparedBrief() || '').trim()
    : '';
  if (directDispatchBrief && isStructuredOrderBrief(directDispatchBrief)) {
    const directParts = structuredOrderBriefParts(directDispatchBrief);
    const directTaskType = openChatCanonicalOrderTaskType(directParts.taskType, directDispatchBrief) || directParts.taskType || draft.task_type || currentRoutingTask() || 'research';
    const finalDirectDispatchBrief = rewriteStructuredBriefTaskType(directDispatchBrief, directTaskType);
    state.openChatPreparedBrief = finalDirectDispatchBrief;
    markOpenChatDecisionSuppressedForBrief(finalDirectDispatchBrief);
    clearPinnedAgentIfMismatchedTask(directTaskType);
    if (els.jobPrompt) els.jobPrompt.value = '';
    draft = {
      ...draft,
      prompt: finalDirectDispatchBrief,
      task_type: directTaskType,
      agent_id: ''
    };
    structuredDispatchPrompt = true;
    quickAnswer = null;
    void trackConversionEvent('chat_direct_order_requested', {
      ...analyticsDraft,
      status: quickAnswer?.patternId || 'explicit_dispatch',
      taskType: draft.task_type
    });
  }
  if (quickAnswer) {
    appendOrderChatExchange(draft.prompt, quickAnswer, { transcriptId: submittedTranscriptId });
    const quickKind = chatAnswerKind(quickAnswer);
    flash(
      quickKind === 'assist'
        ? 'Order draft ready. Review it, then press SEND ORDER.'
        : (quickKind === 'command' ? 'CAIt Chat command ran. No order was created.' : (quickKind === 'clarify' ? 'Need one more detail before SEND ORDER.' : 'Answered in chat. No order was created.')),
      quickKind === 'assist' || quickKind === 'command' ? 'ok' : (quickKind === 'clarify' ? 'warn' : 'info')
    );
    void trackConversionEvent('chat_answered', { ...analyticsDraft, status: quickKind });
    return;
  }
  if (isOpenChatClarifyMode() && !structuredDispatchPrompt) {
    const prepPrompt = draft.prompt || fallbackPromptFromOrderInput(draft.input || null);
    const prepAnswer = buildOpenChatClarifyModeAnswer(prepPrompt, inputCounts, {
      sourceOnly: !String(draft.prompt || '').trim()
    });
    appendOrderChatExchange(prepPrompt, prepAnswer, { transcriptId: submittedTranscriptId });
    flash('Order draft ready. Review it, then press SEND ORDER.', 'ok');
    void trackConversionEvent('draft_order_clarified', { ...analyticsDraft, source: 'clarify_mode' });
    return;
  }
  if (shouldPrepareOrderBeforeDispatch(draft)) {
    const prepPrompt = draft.prompt || fallbackPromptFromOrderInput(draft.input || null);
    const prepAnswer = buildOpenChatImplicitOrderPrepAnswer(prepPrompt, inputCounts, {
      sourceOnly: !String(draft.prompt || '').trim()
    });
    appendOrderChatExchange(prepPrompt, prepAnswer, { transcriptId: submittedTranscriptId });
    flash('Order prepared. Review the structured brief, then press SEND ORDER when ready.', 'ok');
    void trackConversionEvent('draft_order_created', { ...analyticsDraft, source: 'implicit_order_prep' });
    return;
  }
  const dispatchCheckJa = looksJapanese(draft.prompt || originalChatPrompt);
  const dispatchCheckTitle = dispatchCheckJa ? 'SEND ORDERを受け付けました。' : 'SEND ORDER received.';
  const dispatchCheckBody = dispatchCheckJa
    ? '実行前チェック中です。ログイン、支払い、接続先を確認してからOrder IDと進捗を表示します。'
    : 'Running pre-dispatch checks now. CAIt is checking sign-in, billing, and routing before posting the Order ID and progress.';
  state.openChatLastStatus = `${dispatchCheckTitle}\n\n${dispatchCheckBody}`;
  state.openChatLastStatusTone = 'info';
  updateWorkChatStatusCard(dispatchCheckTitle, dispatchCheckBody, 'info');
  upsertOpenChatPendingDispatchMessage(`${dispatchCheckTitle}\n\n${dispatchCheckBody}`, {
    tone: 'info',
    ja: dispatchCheckJa,
    progressMeta: orderAcceptanceProgressMeta(0, { ja: dispatchCheckJa })
  });
  flash(dispatchCheckJa ? 'SEND ORDERを受け付けました。実行前チェック中です。' : 'SEND ORDER received. Running checks...', 'info');
  try {
    validateOrderDraft(draft, { checkAccess: true, checkFunding: false });
  } catch (error) {
    clearOpenChatPendingDispatchMessage();
    const blockedStatus = String(error?.message || 'Order is waiting before dispatch.').slice(0, 240);
    void trackChatTranscript(draft.prompt, {
      kind: 'error',
      body: blockedStatus,
      status: blockedStatus
    }, { ...analyticsDraft, status: 'blocked', transcriptId: submittedTranscriptId });
    if (/login|sign in|sign-in|required/i.test(String(error?.message || ''))) {
      void trackConversionEvent('sign_in_required_shown', { ...analyticsDraft, status: 'blocked' });
    }
    if (/payment|deposit|funding/i.test(String(error?.message || ''))) {
      void trackConversionEvent('payment_required_shown', { ...analyticsDraft, status: 'blocked' });
    }
    if (handleOrderPreflightPrompt(error, draft, { analytics: analyticsDraft, source: 'work_chat_validation' })) return;
    throw error;
  }
  let stopAcceptanceProgress = () => {};
  let payload;
  let dispatchInFlightKey = '';
  try {
    const dispatchSessionId = ensureCurrentOpenChatSessionId({ force: true });
    payload = {
      ...apiPayloadFromOrderDraftWithChatSession(draft, dispatchSessionId),
      agent_id: draft.agent_id || undefined,
      prompt: draft.prompt || fallbackPromptFromOrderInput(draft.input),
      visitor_id: visitorId(),
      async_dispatch: true
    };
    const clientOrderId = clientOrderIdFromOrderCreate(payload) || makeClientOrderId();
    const payloadInput = payload.input && typeof payload.input === 'object' && !Array.isArray(payload.input)
      ? payload.input
      : {};
    const payloadBroker = payloadInput._broker && typeof payloadInput._broker === 'object' && !Array.isArray(payloadInput._broker)
      ? payloadInput._broker
      : {};
    payload.client_order_id = clientOrderId;
    payload.clientOrderId = clientOrderId;
    payload.input = {
      ...payloadInput,
      client_order_id: clientOrderId,
      _broker: {
        ...payloadBroker,
        clientOrderId,
        clientOrderPreparedAt: new Date().toISOString()
      }
    };
    dispatchInFlightKey = compactChatText([
      payload.session_id || payload.sessionId || '',
      payload.parent_agent_id || '',
      payload.task_type || '',
      payload.order_strategy || '',
      payload.prompt || ''
    ].join('|'), 1200);
  } catch (error) {
    clearOpenChatPendingDispatchMessage();
    const failedStatus = String(error?.message || 'Order request could not be prepared.').slice(0, 240);
    void trackChatTranscript(draft.prompt, {
      kind: 'error',
      body: failedStatus,
      status: failedStatus
    }, { ...analyticsDraft, status: 'client_prepare_error', transcriptId: submittedTranscriptId });
    updateWorkChatStatusCard('Order request could not be prepared.', failedStatus, 'error');
    flash(failedStatus, 'error');
    throw error;
  }
  const existingInFlightAgeMs = Date.now() - Number(state.openChatDispatchInFlightAt || 0);
  if (
    state.openChatDispatchInFlightKey
    && state.openChatDispatchInFlightKey === dispatchInFlightKey
    && existingInFlightAgeMs >= 0
    && existingInFlightAgeMs < OPEN_CHAT_DISPATCH_IN_FLIGHT_TTL_MS
  ) {
    upsertOpenChatPendingDispatchMessage(orderAcceptanceProgressBody(payload.prompt, Date.now(), { ja: looksJapanese(payload.prompt) }), {
      tone: 'info',
      ja: looksJapanese(payload.prompt),
      progressMeta: orderAcceptanceProgressMeta(0, { ja: looksJapanese(payload.prompt) })
    });
    flash(looksJapanese(payload.prompt) ? '同じ発注を送信中です。再送せず進捗表示を待っています。' : 'This order is already being sent. Waiting for the progress message instead of resubmitting.', 'info');
    return;
  }
  if (state.openChatDispatchInFlightKey === dispatchInFlightKey) {
    state.openChatDispatchInFlightKey = '';
    state.openChatDispatchInFlightAt = 0;
  }
  state.openChatDispatchInFlightKey = dispatchInFlightKey;
  state.openChatDispatchInFlightAt = Date.now();
  const sendingJa = looksJapanese(payload.prompt);
  let created;
  try {
    const sendingTitle = sendingJa ? '発注を送信しています。' : 'Sending order...';
    const sendingBody = sendingJa
      ? '受付が完了したら、Order ID と進捗をこのチャットに表示します。'
      : 'When accepted, CAIt will post the Order ID and progress in this chat.';
    state.openChatLastStatus = `${sendingTitle}\n\n${sendingBody}`;
    state.openChatLastStatusTone = 'info';
    updateWorkChatStatusCard(sendingTitle, sendingBody, 'info');
    if (els.runCreateStatus) {
      els.runCreateStatus.textContent = `${sendingTitle}\n\n${sendingBody}`;
      els.runCreateStatus.className = 'detail-box action-card info compact-card';
    }
    upsertOpenChatPendingDispatchMessage(`${sendingTitle}\n\n${sendingBody}`, {
      tone: 'info',
      ja: sendingJa,
      progressMeta: orderAcceptanceProgressMeta(0, { ja: sendingJa })
    });
    stopAcceptanceProgress = startOpenChatAcceptanceProgress(payload.prompt, { ja: sendingJa });
    flash(sendingJa ? '発注を送信中です。' : 'Sending order request...', 'info');
    created = await api('/api/jobs', { method: 'POST', body: orderCreateRequestBody(payload) });
  } catch (error) {
    stopAcceptanceProgress();
    const recovered = await recoverAcceptedOrderAfterCreateError(payload, { error, ja: sendingJa });
    if (recovered) {
      created = recovered;
      flash(
        sendingJa
          ? 'レスポンス失敗後に保存済みオーダーを確認しました。進捗表示へ切り替えます。'
          : 'Recovered a saved order after the create response failed. Switching to progress tracking.',
        'ok'
      );
    } else {
      clearOpenChatPendingDispatchMessage();
      if (state.openChatDispatchInFlightKey === dispatchInFlightKey) {
        state.openChatDispatchInFlightKey = '';
        state.openChatDispatchInFlightAt = 0;
      }
      const failedStatus = String(error?.message || 'Order request failed before dispatch.').slice(0, 240);
      void trackChatTranscript(payload.prompt, {
        kind: 'error',
        body: failedStatus,
        status: failedStatus
      }, { ...analyticsDraft, status: 'api_error', transcriptId: submittedTranscriptId });
      if (handleOrderPreflightPrompt(error, draft, { analytics: analyticsDraft, source: 'work_chat_api' })) return;
      if (/payment|required|deposit|funding/i.test(String(error?.message || ''))) {
        void trackConversionEvent('payment_required_shown', { ...analyticsDraft, status: 'blocked' });
        if (handleOrderFundingPrompt(error, draft, { analytics: analyticsDraft, source: 'work_chat' })) return;
        openSettingsSection('payments');
      }
      throw error;
    }
  } finally {
    if (state.openChatDispatchInFlightKey === dispatchInFlightKey) {
      state.openChatDispatchInFlightKey = '';
      state.openChatDispatchInFlightAt = 0;
    }
  }
  if (!created) {
    stopAcceptanceProgress();
    clearOpenChatPendingDispatchMessage();
    throw new Error('Order request ended without an Order ID. Reload Chat and check order history before retrying.');
  }
  stopAcceptanceProgress();
  clearOpenChatPendingDispatchMessage();
  if (chatEngineIsNeedsInputResponse(created)) {
    void trackConversionEvent('intake_questions_shown', { ...analyticsDraft, status: 'needs_input' });
    void trackChatTranscript(payload.prompt, {
      kind: 'clarify',
      body: [
        String(created?.message || 'More information needed before dispatch.').slice(0, 500),
        ...(Array.isArray(created?.questions) ? created.questions.map((question, index) => `${index + 1}. ${question}`) : [])
      ].filter(Boolean).join('\n'),
      status: 'needs_input'
    }, { ...analyticsDraft, status: 'needs_input', transcriptId: submittedTranscriptId });
    handleNeedsInputResponse(created, draft);
    return;
  }
  const createdOrderId = createdOrderPrimaryId(created);
  const createdOrderStatus = normalizeOrderProgressStatus(created?.status || 'created');
  const createdOrderBody = orderProgressMessageFromCreated(created, payload.prompt);
  const createdOrderTone = orderProgressTone(createdOrderStatus);
  const createdOrderJa = looksJapanese(payload.prompt);
  revealCreatedOrderInHistory(created, payload);
  void trackConversionEvent('order_created', {
    ...analyticsDraft,
    mode: created.mode || 'run',
    status: createdOrderStatus
  });
  state.pendingOrderConfirmation = null;
  if (createdOrderId) {
    markCurrentOpenChatSessionLinkedOrder(createdOrderId, { status: createdOrderStatus });
  }
  if (createdOrderId) {
    upsertOpenChatOrderProgressMessage(createdOrderId, createdOrderBody, {
      status: createdOrderStatus,
      tone: createdOrderTone,
      ja: createdOrderJa,
      progressMeta: orderProgressMeta(created, { status: createdOrderStatus }),
      label: orderProgressMessageLabel(created)
    });
  } else {
    appendOpenChatOrderProgressMessage(createdOrderBody, {
      status: createdOrderStatus,
      tone: createdOrderTone,
      ja: createdOrderJa,
      label: orderProgressMessageLabel(created)
    });
  }
  void trackChatTranscript(payload.prompt, {
    kind: 'order',
    body: createdOrderBody,
    status: createdOrderStatus
  }, {
    ...analyticsDraft,
    status: createdOrderStatus,
    mode: created.mode || 'run',
    transcriptId: submittedTranscriptId
  });
  state.selectedJobId = createdOrderId || state.selectedJobId;
  if (created.matched_agent_id) state.selectedAgentId = created.matched_agent_id;
  state.runSearch = '';
  if (els.runSearch) els.runSearch.value = '';
  state.workFlowMode = '';
  state.workFlowShowList = true;
  state.workFlowLastCreatedJobId = createdOrderId || null;
  state.followupToJobId = '';
  state.followupSourceTaskType = '';
  state.followupSourceAgentId = '';
  state.pendingIntake = null;
  state.intakeConfirmed = false;
  state.intakeAnswer = '';
  if (els.intakeAnswer) els.intakeAnswer.value = '';
  switchTab('work');
  if (createdOrderStatus === 'failed' || createdOrderStatus === 'timed_out') {
    flash(`Order ${createdOrderId.slice(0, 8) || ''} stopped: ${created.failure_reason || created.error || createdOrderStatus}.`, 'error');
    await refresh();
    return;
  }
  startOpenChatOrderProgressPolling(createdOrderId, {
    status: createdOrderStatus,
    ja: createdOrderJa,
    immediate: true
  });
  if (createdOrderId) {
    window.requestAnimationFrame(() => focusWorkResults());
  }
  if (created.mode === 'workflow') {
    flash(`Agent Team ${created.workflow_job_id?.slice(0, 8) || ''} accepted ${created.child_runs?.length || 0} agent runs.`, createdOrderTone);
  } else {
    flash(
      createdOrderJa
        ? `発注を受け付けました。${createdOrderId ? ` Order ${createdOrderId.slice(0, 8)}.` : ''}`
        : `Order ${created.job_id?.slice(0, 8) || ''} ${createdOrderStatus}.`,
      createdOrderTone
    );
  }
  if (created.async_dispatch || created.dispatch_status === 'scheduled') {
    flash(
      createdOrderJa
        ? `発注を受け付けました。進捗はこのチャットで更新します。${createdOrderId ? ` Order ${createdOrderId.slice(0, 8)}.` : ''}`
        : `Order ${createdOrderId.slice(0, 8)} sent. CAIt will update chat progress until delivery is ready.`,
      'ok'
    );
    await refresh();
    clearOrderComposerPrompt();
    window.setTimeout(() => { void refresh(); }, 5000);
    return;
  }
  if (created.mode === 'workflow') {
    await refresh();
    clearOrderComposerPrompt();
    return;
  }
  if ((els.jobMode?.value || 'complete') === 'create-only' || created.status === 'completed' || created.status === 'dispatched' || created.status === 'failed') {
    await refresh();
    clearOrderComposerPrompt();
    return;
  }
  if (els.jobMode?.value === 'external-demo') {
    const claim = await api(`/api/jobs/${created.job_id}/claim`, { method: 'POST', body: JSON.stringify({ agent_id: created.matched_agent_id }) });
    const submit = await api(`/api/jobs/${created.job_id}/result`, { method: 'POST', body: JSON.stringify({ agent_id: created.matched_agent_id, status: 'completed', output: { summary: `Connected aiagent handled: ${draft.prompt || fallbackPromptFromOrderInput(draft.input)}` }, usage: { api_cost: Math.max(60, Math.round(Number(draft.budget_cap || 300) * 0.3)) } }) });
    setDetail({ created, claim, submit });
    flash(`Order ${created.job_id.slice(0, 8)} dispatched to connected agent demo.`, 'ok');
    await refresh();
    clearOrderComposerPrompt();
    return;
  }
  const dev = await api('/api/dev/resolve-job', { method: 'POST', body: JSON.stringify({ job_id: created.job_id, mode: els.jobMode?.value || 'complete' }) });
  setDetail({ created, resolved: dev });
  flash(`Order ${created.job_id.slice(0, 8)} ${dev.status}.`, dev.status === 'failed' ? 'error' : 'ok');
  await refresh();
  clearOrderComposerPrompt();
}

async function runAction(action, fn) {
  clearFlash();
  const original = action.textContent;
  action.disabled = true;
  action.textContent = 'WORKING...';
  try {
    await fn();
  } catch (error) {
    flash(error.message, 'error');
    setDetail({ error: error.message });
  } finally {
    action.disabled = false;
    if (action === els.createJobBtn) syncCreateJobButtonForCurrentPrompt();
    else action.textContent = original;
  }
}

bindGithubAgentSetupInteractions();
if (els.googleLoginBtn) els.googleLoginBtn.onclick = openPrimaryGoogleSignIn;
if (els.githubLoginBtn) els.githubLoginBtn.onclick = () => {
  openGithubSignIn();
};
if (els.installGithubAppBtn) els.installGithubAppBtn.onclick = () => {
  const popup = window.open('/auth/github-app/install', '_blank', 'noopener');
  if (!popup) {
    flash(`Open GitHub App install, choose Configure if ${PRODUCT_NAME} is already installed, add the repo, save, then return and click LOAD MY REPOS.`, 'info');
    window.location.href = '/auth/github-app/install';
    return;
  }
  if (els.repoPreview) {
    els.repoPreview.textContent = [
      'GitHub App setup opened in a new tab.',
      `If ${PRODUCT_NAME} is already installed, choose Configure.`,
      `Add the repo you want ${PRODUCT_SHORT_NAME} to access, save, then return here and click LOAD MY REPOS.`
    ].join('\n');
  }
  flash('In GitHub, choose Configure if needed, add the repo, save, then return and click LOAD MY REPOS.', 'info');
};
if (els.clearRepoSelectionBtn) els.clearRepoSelectionBtn.onclick = () => {
  state.selectedRepoFullName = '';
  if (els.repoPicker) els.repoPicker.value = '';
  if (els.repoPreview) {
    els.repoPreview.textContent = 'Repo selection cleared. Pick another repo from the list below.';
  }
  renderAgentSetupFlow(state.snapshot?.auth);
  if (els.repoPicker?.scrollIntoView) {
    setTimeout(() => els.repoPicker.scrollIntoView({ behavior: 'smooth', block: 'center' }), 0);
  }
};
if (els.connectHubGithubBtn) els.connectHubGithubBtn.onclick = () => {
  openGithubSignIn();
};
if (els.connectHubInstallBtn) els.connectHubInstallBtn.onclick = () => { window.location.href = '/auth/github-app/install'; };
if (els.connectHubLoadReposBtn) els.connectHubLoadReposBtn.onclick = () => runAction(els.connectHubLoadReposBtn, async () => {
  if (!ensureGithubLinkedAccess({ section: 'agents', requireGithubFlow: true, message: 'Connect GitHub before loading repos.', reconnectMessage: 'GitHub is already linked. Refresh GitHub access before loading repos.' })) return;
  await loadGithubRepos();
});
if (els.connectHubOpenAgentsBtn) els.connectHubOpenAgentsBtn.onclick = () => openAgentsGithubFlow();
if (els.connectHubOpenSettingsOrderBtn) els.connectHubOpenSettingsOrderBtn.onclick = () => {
  openSettingsSection('keys');
  flash(state.snapshot?.auth?.developerApiEnabled ? 'Create or manage CAIt API keys in SETTINGS.' : 'CAIt API keys are disabled by the current runtime policy.', 'info');
};
if (els.connectHubCopyOrderBtn) els.connectHubCopyOrderBtn.onclick = () => {
  const token = state.lastIssuedOrderApiKey?.token || '<CAIT_API_KEY>';
  void copyTextToClipboard(formatOrderApiCommand(token), 'Order API example copied.');
};
if (els.connectHubOpenAgentsPublishBtn) els.connectHubOpenAgentsPublishBtn.onclick = () => openAgentsGithubFlow();
if (els.connectHubOpenSettingsAgentBtn) els.connectHubOpenSettingsAgentBtn.onclick = () => {
  openSettingsSection('keys');
  flash(state.snapshot?.auth?.developerApiEnabled ? 'Create or manage CAIt API keys in SETTINGS.' : 'CAIt API keys are disabled by the current runtime policy.', 'info');
};
if (els.settingsPaymentsTabBtn) els.settingsPaymentsTabBtn.onclick = () => openSettingsSection('payments');
if (els.settingsProviderTabBtn) els.settingsProviderTabBtn.onclick = () => openSettingsSection('provider');
if (els.settingsKeysTabBtn) els.settingsKeysTabBtn.onclick = () => openSettingsSection('keys');
if (els.settingsFunnelTabBtn) els.settingsFunnelTabBtn.onclick = () => openSettingsSection('funnel');
if (els.settingsReportsTabBtn) els.settingsReportsTabBtn.onclick = () => openSettingsSection('reports');
if (els.toggleBillingProfileBtn) els.toggleBillingProfileBtn.onclick = () => {
  if (!ensureSettingsLogin()) return;
  state.billingProfileExpanded = !state.billingProfileExpanded;
  renderSettingsFlow(state.snapshot?.accountSettings, state.snapshot?.monthlySummary, state.snapshot?.auth);
};
if (els.toggleProviderProfileBtn) els.toggleProviderProfileBtn.onclick = () => {
  if (!ensureSettingsLogin()) return;
  state.providerProfileExpanded = !state.providerProfileExpanded;
  renderSettingsFlow(state.snapshot?.accountSettings, state.snapshot?.monthlySummary, state.snapshot?.auth);
};
if (els.connectHubCopyAgentBtn) els.connectHubCopyAgentBtn.onclick = () => {
  const token = state.lastIssuedOrderApiKey?.token || '<CAIT_API_KEY>';
  void copyTextToClipboard(formatAgentApiCommand(token), 'CAIt agent API example copied.');
};
if (els.draftAgentSkillBtn) els.draftAgentSkillBtn.onclick = () => runAction(els.draftAgentSkillBtn, async () => {
  const skillMd = String(els.agentSkillMd?.value || '').trim();
  const res = await draftAgentSkillManifestFromText(skillMd);
  const warning = Array.isArray(res.warnings) && res.warnings.length ? ` ${res.warnings[0]}` : '';
  flash(`Agent Skill draft JSON created from ${res.skill?.name || 'SKILL.md'}. Review before import.${warning}`, 'ok');
});
if (els.logoutBtn) els.logoutBtn.onclick = () => runAction(els.logoutBtn, async () => {
  const result = await api('/auth/logout', { method: 'POST' });
  const redirectTo = String(result?.redirect_to || '/').trim() || '/';
  window.location.href = redirectTo;
});
if (els.seedBtn) els.seedBtn.onclick = () => runAction(els.seedBtn, async () => {
  const seeded = await api('/api/seed', { method: 'POST' });
  setDetail(seeded);
  flash(`Seeded ${seeded.job_ids.length} demo runs.`, 'ok');
  await refresh();
});
if (els.heroTryBtn) els.heroTryBtn.onclick = openOrderTab;
if (els.heroSeedBtn) els.heroSeedBtn.onclick = () => els.seedBtn?.click();
if (els.heroCliBtn) els.heroCliBtn.onclick = () => switchTab('connect');
if (els.topOpenChatBtn) els.topOpenChatBtn.onclick = openOrderTab;
if (els.startSignupBtn) els.startSignupBtn.onclick = () => {
  if (state.snapshot?.auth?.loggedIn) {
    openOrderTab();
    return;
  }
  openDedicatedLoginPage({
    source: 'start_cta',
    nextTab: 'work'
  });
};
if (els.entryGoogleLoginBtn) els.entryGoogleLoginBtn.onclick = openPrimaryGoogleSignIn;
if (els.entryGithubLoginBtn) els.entryGithubLoginBtn.onclick = () => {
  openGithubSignIn();
};
if (els.entryGuestContinueBtn) els.entryGuestContinueBtn.onclick = continueOpenChatAsGuest;
if (els.toggleOrderSettingsBtn) els.toggleOrderSettingsBtn.onclick = () => {
  state.orderSettingsExpanded = !state.orderSettingsExpanded;
  renderOrderSettingsDrawer();
};
if (els.closeOrderSettingsBtn) els.closeOrderSettingsBtn.onclick = closeOrderSettings;
if (els.orderSettingsDrawer) els.orderSettingsDrawer.onclick = (event) => {
  if (event.target === els.orderSettingsDrawer) closeOrderSettings();
};
if (els.toggleParallelToolsBtn) els.toggleParallelToolsBtn.onclick = () => {
  state.parallelToolsExpanded = !state.parallelToolsExpanded;
  if (state.parallelToolsExpanded) state.orderSettingsExpanded = true;
  renderOrderSettingsDrawer();
  renderParallelTools();
};
if (els.startWorkFlowBtn) els.startWorkFlowBtn.onclick = () => {
  state.workFlowMode = 'create';
  state.workFlowShowList = false;
  state.workFlowLastCreatedJobId = null;
  renderWorkFlow(state.snapshot);
};
if (els.checkWorkListBtn) els.checkWorkListBtn.onclick = () => {
  state.workFlowMode = '';
  state.workFlowShowList = true;
  if (state.workFlowLastCreatedJobId) state.selectedJobId = state.workFlowLastCreatedJobId;
  render(state.snapshot);
};
if (els.backWorkFlowBtn) els.backWorkFlowBtn.onclick = () => {
  if (state.workFlowShowList) state.workFlowShowList = false;
  else if (state.workFlowMode === 'create') state.workFlowMode = '';
  else state.workFlowLastCreatedJobId = null;
  renderWorkFlow(state.snapshot);
};
if (els.openConnectQuickstartBtn) els.openConnectQuickstartBtn.onclick = () => {
  state.connectFlowMode = 'quickstart';
  renderConnectFlow();
};
if (els.openConnectDocsBtn) els.openConnectDocsBtn.onclick = () => {
  state.connectFlowMode = 'docs';
  renderConnectFlow();
};
if (els.backConnectFlowBtn) els.backConnectFlowBtn.onclick = () => {
  state.connectFlowMode = '';
  renderConnectFlow();
};
if (els.startAgentOnboardingBtn) els.startAgentOnboardingBtn.onclick = () => {
  state.agentSetupStarted = true;
  state.agentSetupMode = '';
  state.agentSetupCompletedId = null;
  state.showAgentList = true;
  void trackConversionEvent('agent_publish_started', { source: 'agents_button' });
  renderAgentSetupFlow(state.snapshot?.auth);
};
if (els.useGithubOnboardingBtn) els.useGithubOnboardingBtn.onclick = () => {
  state.agentSetupMode = 'github';
  void trackConversionEvent('agent_publish_started', { source: 'github_flow' });
  renderAgentSetupFlow(state.snapshot?.auth);
};
if (els.useManualOnboardingBtn) els.useManualOnboardingBtn.onclick = () => {
  state.agentSetupMode = 'manual';
  void trackConversionEvent('agent_publish_started', { source: 'manual_flow' });
  renderAgentSetupFlow(state.snapshot?.auth);
};
if (els.resetAgentOnboardingBtn) els.resetAgentOnboardingBtn.onclick = () => {
  if (state.agentSetupMode) {
    state.agentSetupMode = '';
  } else {
    resetAgentSetupFlow();
  }
  renderAgentSetupFlow(state.snapshot?.auth);
};
if (els.addAnotherAgentBtn) els.addAnotherAgentBtn.onclick = () => {
  resetAgentSetupFlow({ clearManifest: true, clearSelection: true });
  state.agentSetupStarted = true;
  state.showAgentList = true;
  renderAgentSetupFlow(state.snapshot?.auth);
};
if (els.checkAgentListBtn) els.checkAgentListBtn.onclick = () => {
  state.showAgentList = true;
  if (state.agentSetupCompletedId) state.selectedAgentId = state.agentSetupCompletedId;
  renderAgentSetupFlow(state.snapshot?.auth);
  if (state.snapshot) render(state.snapshot);
};
if (els.agentFlowGithubLoginBtn) els.agentFlowGithubLoginBtn.onclick = () => {
  openGithubSignIn();
};
if (els.refreshSettingsBtn) els.refreshSettingsBtn.onclick = () => {
  if (!ensureSettingsLogin()) return;
  runAction(els.refreshSettingsBtn, async () => {
    state.settingsPeriod = (els.settingsPeriod?.value || currentMonthPeriod()).trim() || currentMonthPeriod();
    switchTab('settings');
    await refresh();
  });
};
if (els.submitFeedbackBtn) els.submitFeedbackBtn.onclick = () => runAction(els.submitFeedbackBtn, submitFeedback);
if (els.feedbackReviewingBtn) els.feedbackReviewingBtn.onclick = () => {
  if (!ensureSettingsLogin()) return;
  runAction(els.feedbackReviewingBtn, async () => {
    await updateSelectedFeedbackStatus('reviewing');
  });
};
if (els.feedbackResolvedBtn) els.feedbackResolvedBtn.onclick = () => {
  if (!ensureSettingsLogin()) return;
  runAction(els.feedbackResolvedBtn, async () => {
    await updateSelectedFeedbackStatus('resolved');
  });
};
if (els.feedbackReopenBtn) els.feedbackReopenBtn.onclick = () => {
  if (!ensureSettingsLogin()) return;
  runAction(els.feedbackReopenBtn, async () => {
    await updateSelectedFeedbackStatus('open');
  });
};
if (els.chatTranscriptReviewingBtn) els.chatTranscriptReviewingBtn.onclick = () => {
  if (!ensureSettingsLogin()) return;
  runAction(els.chatTranscriptReviewingBtn, async () => {
    await updateSelectedChatTranscriptReview('reviewing');
  });
};
if (els.chatTranscriptFixedBtn) els.chatTranscriptFixedBtn.onclick = () => {
  if (!ensureSettingsLogin()) return;
  runAction(els.chatTranscriptFixedBtn, async () => {
    await updateSelectedChatTranscriptReview('fixed');
  });
};
if (els.chatTranscriptIgnoreBtn) els.chatTranscriptIgnoreBtn.onclick = () => {
  if (!ensureSettingsLogin()) return;
  runAction(els.chatTranscriptIgnoreBtn, async () => {
    await updateSelectedChatTranscriptReview('ignored');
  });
};
if (els.chatTrainingExportBtn) els.chatTrainingExportBtn.onclick = () => {
  if (!ensureSettingsLogin()) return;
  runAction(els.chatTrainingExportBtn, async () => {
    await exportChatTrainingData();
  });
};
[
  [els.adminChatFilterNeedsReviewBtn, 'needsReview'],
  [els.adminChatFilterHandledBtn, 'handled'],
  [els.adminChatFilterNonMineBtn, 'nonMine'],
  [els.adminChatFilterGuestBtn, 'guest'],
  [els.adminChatFilterOtherBtn, 'other'],
  [els.adminChatFilterMineBtn, 'mine'],
  [els.adminChatFilterAllBtn, 'all']
].forEach(([button, filter]) => {
  if (button) button.onclick = () => setAdminChatFilter(filter);
});
if (IN_APP_PAYMENTS_REMOVED) {
  attachRemovedPaymentActionHandlers(els, { closePlanModal, flash, runAction, safeText });
}
bindDeveloperSurfaceInteractions();
if (els.closeMarketingTimelineModalBtn) els.closeMarketingTimelineModalBtn.onclick = () => hideMarketingTimelineModal();
if (els.marketingTimelineModal) {
  els.marketingTimelineModal.onclick = (event) => {
    if (event.target === els.marketingTimelineModal) hideMarketingTimelineModal();
  };
}
window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && els.apiKeyRevealModal && !els.apiKeyRevealModal.hidden) {
    showApiKeyRevealResult('Use COPY KEY, then press I SAVED IT when the key is stored. Escape does not close this one-time reveal.');
    selectApiKeyRevealToken();
    return;
  }
  if (event.key === 'Escape' && els.planModal && !els.planModal.hidden) {
    closePlanModal();
  }
  if (event.key === 'Escape' && els.marketingTimelineModal && !els.marketingTimelineModal.hidden) {
    hideMarketingTimelineModal();
  }
  if (event.key === 'Escape' && els.flexToolPanel && !els.flexToolPanel.hidden) {
    const tool = activeFlexibleTool();
    state.flexToolDismissedKey = tool?.id || '';
    renderFlexibleToolPanel();
  }
});
function agentRoutingConfirmationPrompt(payload = {}) {
  const routing = payload.routing_confirmation || {};
  const inferred = routing.inferred || {};
  const upstream = inferred.upstream || {};
  const downstream = inferred.downstream || {};
  const lines = [
    'Confirm inferred agent routing before registration.',
    '',
    `Layer: ${inferred.layer || '-'}`,
    `Role: ${inferred.role || '-'}`,
    `Approval: ${inferred.approval_mode || '-'}`,
    `Task types: ${(inferred.task_types || []).join(', ') || '-'}`,
    `Upstream: ${(upstream.task_types || []).join(', ') || '-'}`,
    `Downstream: ${(downstream.task_types || []).join(', ') || '-'}`,
    '',
    'Register with these settings?'
  ];
  const warnings = Array.isArray(routing.warnings) ? routing.warnings.filter(Boolean) : [];
  if (warnings.length) lines.splice(lines.length - 2, 0, `Warnings: ${warnings.join(' / ')}`);
  return lines.join('\n');
}

async function submitAgentRegistrationWithRoutingConfirmation(url, payload) {
  try {
    return await api(url, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  } catch (error) {
    const data = error?.data || {};
    if (error?.status !== 428 || data.code !== 'routing_confirmation_required') throw error;
    setDetail(data);
    const confirmed = window.confirm(agentRoutingConfirmationPrompt(data));
    if (!confirmed) throw new Error('Agent routing confirmation canceled.');
    return api(url, {
      method: 'POST',
      body: JSON.stringify({ ...payload, confirm_routing: true })
    });
  }
}

if (els.registerAgentBtn) els.registerAgentBtn.onclick = () => runAction(els.registerAgentBtn, async () => {
  if (!ensureGithubLinkedAccess({ section: 'agents', message: 'Connect GitHub before registering an agent.' })) return;
  const res = await submitAgentRegistrationWithRoutingConfirmation('/api/agents', {
    name: els.agentName?.value,
    description: els.agentDesc?.value,
    task_types: els.agentTasks?.value,
    provider_markup_rate: Number(els.agentPremium?.value || 0.1),
    token_markup_rate: Number(els.agentPremium?.value || 0.1),
    platform_margin_rate: 0.1
  });
  setDetail(res);
  state.selectedAgentId = res.agent?.id || null;
  delete state.agentOnboarding[state.selectedAgentId];
  void trackConversionEvent('agent_imported', {
    source: 'manual_form',
    status: 'registered',
    agentId: state.selectedAgentId || ''
  });
  flash(`Registered ${res.agent.name}. Token shown in detail panel only once.`, 'ok');
  await refresh();
  if (state.selectedAgentId) await loadAgentOnboarding(state.selectedAgentId, { force: true, silent: true });
  completeAgentSetup(state.selectedAgentId);
  renderAgentSetupFlow(state.snapshot?.auth);
});
if (els.importManifestBtn) els.importManifestBtn.onclick = () => runAction(els.importManifestBtn, async () => {
  if (!ensureGithubLinkedAccess({ section: 'agents', message: 'Connect GitHub before importing an agent manifest.' })) return;
  const res = await submitAgentRegistrationWithRoutingConfirmation('/api/agents/import-manifest', { manifest: JSON.parse(els.manifestJson?.value || '{}') });
  setDetail(res);
  state.selectedAgentId = res.agent?.id || null;
  delete state.agentOnboarding[state.selectedAgentId];
  void trackConversionEvent('agent_imported', {
    source: 'manifest_json',
    status: 'imported',
    agentId: state.selectedAgentId || ''
  });
  flash(`Imported manifest for ${res.agent.name}.`, 'ok');
  await refresh();
  if (state.selectedAgentId) await loadAgentOnboarding(state.selectedAgentId, { force: true, silent: true });
  completeAgentSetup(state.selectedAgentId);
  renderAgentSetupFlow(state.snapshot?.auth);
});
if (els.importUrlBtn) els.importUrlBtn.onclick = () => runAction(els.importUrlBtn, async () => {
  if (!ensureGithubLinkedAccess({ section: 'agents', message: 'Connect GitHub before importing an agent manifest URL.' })) return;
  const value = (els.manifestUrl?.value || '').trim();
  const res = await submitAgentRegistrationWithRoutingConfirmation('/api/agents/import-url', { manifest_url: value });
  setDetail({ input: value, response: res });
  state.selectedAgentId = res.agent?.id || null;
  delete state.agentOnboarding[state.selectedAgentId];
  void trackConversionEvent('agent_imported', {
    source: 'manifest_url',
    status: 'imported',
    agentId: state.selectedAgentId || ''
  });
  flash(`Manifest URL imported for ${res.agent.name}. Verify before dispatch.`, 'ok');
  await refresh();
  if (state.selectedAgentId) await loadAgentOnboarding(state.selectedAgentId, { force: true, silent: true });
  completeAgentSetup(state.selectedAgentId);
  renderAgentSetupFlow(state.snapshot?.auth);
});
if (els.openChatClarifyModeBtn) els.openChatClarifyModeBtn.onclick = () => setOpenChatMode('clarify');
if (els.openChatOrderModeBtn) els.openChatOrderModeBtn.onclick = () => setOpenChatMode('order');
if (els.executionAutoBtn) els.executionAutoBtn.onclick = () => setOrderStrategyChoice('auto');
if (els.executionSingleBtn) els.executionSingleBtn.onclick = () => setOrderStrategyChoice('single');
if (els.executionTeamBtn) els.executionTeamBtn.onclick = () => setOrderStrategyChoice('multi');
if (els.openChatModeMenu) els.openChatModeMenu.ontoggle = () => {
  if (els.openChatModeMenu.open && els.executionChoiceMenu) els.executionChoiceMenu.open = false;
};
if (els.executionChoiceMenu) els.executionChoiceMenu.ontoggle = () => {
  if (els.executionChoiceMenu.open && els.openChatModeMenu) els.openChatModeMenu.open = false;
};
if (els.newOpenChatSessionBtn) els.newOpenChatSessionBtn.onclick = () => startNewOpenChatSession();
if (els.mobileNewOpenChatSessionBtn) els.mobileNewOpenChatSessionBtn.onclick = () => startNewOpenChatSession();
if (els.toggleOpenChatHistoryBtn) els.toggleOpenChatHistoryBtn.onclick = toggleOpenChatHistory;
if (els.clearOpenChatHistoryBtn) els.clearOpenChatHistoryBtn.onclick = clearOpenChatHistory;
if (els.scheduleCurrentOrderBtn) els.scheduleCurrentOrderBtn.onclick = () => runAction(els.scheduleCurrentOrderBtn, scheduleCurrentOrderDraft);
if (els.scheduledWorkInterval) els.scheduledWorkInterval.onchange = renderScheduledWorkControls;
if (els.createJobBtn) els.createJobBtn.onclick = () => runAction(els.createJobBtn, handleCreateJobButtonClick);
document.querySelectorAll('[data-open-chat-hub-command]').forEach((btn) => {
  btn.addEventListener('click', () => runAction(btn, async () => {
    await runOpenChatHubCommand(btn.dataset.openChatHubCommand || '');
  }));
});
if (els.applyIntakeAnswerBtn) els.applyIntakeAnswerBtn.onclick = () => runAction(els.applyIntakeAnswerBtn, async () => {
  applyIntakeAnswers();
});
if (els.clearIntakeBtn) els.clearIntakeBtn.onclick = () => {
  clearIntakeContext();
  flash('Clarification questions cleared.', 'ok');
};
if (els.createFollowupOrderBtn) els.createFollowupOrderBtn.onclick = () => runAction(els.createFollowupOrderBtn, async () => {
  try {
    await sendFollowupToAgentFromDelivery();
  } catch (error) {
    if (/no direct assigned agent/i.test(String(error?.message || ''))) {
      await prepareFollowupOrderFromDelivery();
      return;
    }
    throw error;
  }
});
if (els.clearFollowupContextBtn) els.clearFollowupContextBtn.onclick = () => {
  clearFollowupContext();
  hideDeliveryFollowupPanel();
  flash('Follow-up context cleared.', 'ok');
};
if (els.addParallelJobBtn) els.addParallelJobBtn.onclick = () => runAction(els.addParallelJobBtn, async () => {
  addCurrentOrderToParallelQueue();
});
if (els.createParallelJobsBtn) els.createParallelJobsBtn.onclick = () => runAction(els.createParallelJobsBtn, createParallelOrders);
if (els.clearParallelJobsBtn) els.clearParallelJobsBtn.onclick = () => runAction(els.clearParallelJobsBtn, async () => {
  clearParallelOrders();
});
if (els.claimJobBtn) els.claimJobBtn.onclick = () => runAction(els.claimJobBtn, async () => {
  const id = els.claimJobId?.value || '';
  const res = await api(`/api/jobs/${id}/claim`, { method: 'POST', body: JSON.stringify({ agent_id: els.claimAgentId?.value }) });
  setDetail(res);
  flash(`Run ${id.slice(0, 8)} claimed.`, 'ok');
  await refresh();
});
if (els.submitResultBtn) els.submitResultBtn.onclick = () => runAction(els.submitResultBtn, async () => {
  const id = els.claimJobId?.value || '';
  const res = await api(`/api/jobs/${id}/result`, { method: 'POST', body: JSON.stringify({ agent_id: els.claimAgentId?.value, status: 'completed', output: { summary: els.submitOutput?.value || 'Connected aiagent result' }, usage: { api_cost: 90 } }) });
  setDetail(res.job || res);
  flash(`Run ${id.slice(0, 8)} submitted.`, 'ok');
  await refresh();
});
if (els.retryDispatchBtn) els.retryDispatchBtn.onclick = () => runAction(els.retryDispatchBtn, async () => {
  const job = selectedJob();
  if (!job) throw new Error('Select a run first.');
  const res = await api('/api/dev/dispatch-retry', { method: 'POST', body: JSON.stringify({ job_id: job.id }) });
  setDetail(res.job || res);
  flash(`Retry triggered for ${job.id.slice(0, 8)}.`, 'ok');
  await refresh();
});
if (els.eventFilter) els.eventFilter.oninput = () => { state.eventFilter = els.eventFilter.value || ''; if (state.snapshot) renderStream(state.snapshot.events || []); };
if (els.runSearch) els.runSearch.oninput = () => { state.runSearch = els.runSearch.value || ''; state.runPage = 0; if (state.snapshot) renderJobs(state.snapshot.jobs || []); };
if (els.runRequesterFilter) els.runRequesterFilter.onchange = () => { state.runRequesterFilter = els.runRequesterFilter.value || 'all'; state.runPage = 0; if (state.snapshot) renderJobs(state.snapshot.jobs || []); };
if (els.runStatusFilter) els.runStatusFilter.onchange = () => { state.runStatusFilter = els.runStatusFilter.value || ''; state.runPage = 0; if (state.snapshot) renderJobs(state.snapshot.jobs || []); };
if (els.runActionFilter) els.runActionFilter.onchange = () => { state.runActionFilter = els.runActionFilter.value || ''; state.runPage = 0; if (state.snapshot) renderJobs(state.snapshot.jobs || []); };
if (els.agentSearch) els.agentSearch.oninput = () => { state.agentSearch = els.agentSearch.value || ''; if (state.snapshot) renderAgents(state.snapshot.agents || []); };
if (els.agentStatusFilter) els.agentStatusFilter.onchange = () => { state.agentStatusFilter = els.agentStatusFilter.value || ''; if (state.snapshot) renderAgents(state.snapshot.agents || []); };
if (els.agentAvailabilityFilter) els.agentAvailabilityFilter.onchange = () => { state.agentAvailabilityFilter = els.agentAvailabilityFilter.value || ''; if (state.snapshot) renderAgents(state.snapshot.agents || []); };
if (els.agentActionFilter) els.agentActionFilter.onchange = () => { state.agentActionFilter = els.agentActionFilter.value || ''; if (state.snapshot) renderAgents(state.snapshot.agents || []); };
if (els.agentTaskFilter) els.agentTaskFilter.onchange = () => { state.agentTaskFilter = els.agentTaskFilter.value || ''; if (state.snapshot) renderAgents(state.snapshot.agents || []); };
if (els.agentSort) els.agentSort.onchange = () => { state.agentSort = els.agentSort.value || 'readiness'; if (state.snapshot) renderAgents(state.snapshot.agents || []); };
if (els.showReadyAgentsBtn) els.showReadyAgentsBtn.onclick = () => applyAgentQuickFilter('ready');
if (els.showVerifyFailuresBtn) els.showVerifyFailuresBtn.onclick = () => applyAgentQuickFilter('verify-failures');
if (els.showMissingEndpointBtn) els.showMissingEndpointBtn.onclick = () => applyAgentQuickFilter('missing-endpoint');
if (els.showTaskMismatchBtn) els.showTaskMismatchBtn.onclick = () => applyAgentQuickFilter('task-mismatch');
if (els.recheckAgentBtn) els.recheckAgentBtn.onclick = () => runAction(els.recheckAgentBtn, async () => {
  const agent = selectedAgent();
  if (!agent) throw new Error('Select an agent first.');
  const result = await loadAgentOnboarding(agent.id, { force: true, silent: true });
  const onboarding = result?.onboarding || null;
  if (!onboarding) throw new Error(result?.error || 'Onboarding check did not return a result.');
  flash(
    onboarding.status === 'ready'
      ? `${agent.name} is dispatch-ready.`
      : `${agent.name}: ${onboarding.nextAction?.title || 'Review onboarding checks.'}`,
    onboarding.status === 'ready' ? 'ok' : 'info'
  );
  await maybeOfferAutomatedAgentSetup(agent, result);
});
if (els.useAgentForRunBtn) els.useAgentForRunBtn.onclick = () => {
  const agent = selectedAgent();
  if (!agent) return flash('Select an agent first.', 'error');
  applyAgentToRunForm(agent, { announce: true, message: `CAIt Chat pinned to ${agent.name}. Open Chat to shape the request before sending an order.` });
};
if (els.copyAgentLinkBtn) els.copyAgentLinkBtn.onclick = () => {
  const agent = selectedAgent();
  if (!agent) return flash('Select an agent first.', 'error');
  void copyTextToClipboard(agentShareUrl(agent), 'Agent link copied.');
};
if (els.copyAgentPostBtn) els.copyAgentPostBtn.onclick = () => {
  const agent = selectedAgent();
  if (!agent) return flash('Select an agent first.', 'error');
  void copyTextToClipboard(agentSharePost(agent), 'Share post copied.');
};
if (els.shareAgentXBtn) els.shareAgentXBtn.onclick = () => {
  shareAgentOnX(selectedAgent());
};
if (els.deleteAgentBtn) els.deleteAgentBtn.onclick = () => runAction(els.deleteAgentBtn, async () => {
  const agent = selectedAgent();
  await deleteAgentRecord(agent);
});
if (els.saveAgentPricingBtn) els.saveAgentPricingBtn.onclick = () => runAction(els.saveAgentPricingBtn, async () => {
  const agent = selectedAgent();
  await saveAgentPricing(agent);
});
if (els.agentPricingModel) els.agentPricingModel.onchange = () => {
  syncAgentPricingEditorVisibility();
  if (els.agentPricingGuide && selectedAgent() && canEditAgentPricing(selectedAgent())) els.agentPricingGuide.textContent = agentPricingGuideText(selectedAgent());
};
if (els.agentPricingOverageMode) els.agentPricingOverageMode.onchange = () => {
  syncAgentPricingEditorVisibility();
  if (els.agentPricingGuide && selectedAgent() && canEditAgentPricing(selectedAgent())) els.agentPricingGuide.textContent = agentPricingGuideText(selectedAgent());
};
if (els.clearRunAgentBtn) els.clearRunAgentBtn.onclick = () => {
  if (els.jobAgentId) els.jobAgentId.value = '';
  if (els.jobAgentPicker) els.jobAgentPicker.value = '';
  renderOrderComposer();
  flash('Pinned agent cleared. Auto-routing restored.', 'ok');
};
if (els.jobAgentSearch) els.jobAgentSearch.oninput = () => {
  state.jobAgentSearch = els.jobAgentSearch.value || '';
  renderOrderAgentPicker();
};
if (els.jobAgentPicker) els.jobAgentPicker.onchange = () => {
  const pickedId = String(els.jobAgentPicker.value || '').trim();
  if (els.jobAgentId) els.jobAgentId.value = pickedId;
  const agent = currentRunTargetAgent();
  if (agent) {
    state.selectedAgentId = agent.id;
    setAgentDetail(agent);
    maybeAutoCheckSelectedAgent(agent);
  }
  renderOrderComposer();
};
if (els.jobAgentId) els.jobAgentId.oninput = () => { renderOrderComposer(); };
if (els.jobAgentId) els.jobAgentId.onchange = () => {
  const agent = currentRunTargetAgent();
  if (agent) {
    state.selectedAgentId = agent.id;
    setAgentDetail(agent);
    maybeAutoCheckSelectedAgent(agent);
  }
  renderOrderComposer();
};
if (els.copyAgentCurlBtn) els.copyAgentCurlBtn.onclick = () => {
  const agent = selectedAgent();
  if (!agent) return flash('Select an agent first.', 'error');
  switchTab('connect');
  updateCliPanels(state.snapshot);
  setDetail({ hint: 'CONNECT tab updated with agent_id example.', agent_id: agent.id, task_types: agent.taskTypes });
  flash(`CLI examples updated for ${agent.name}.`, 'ok');
};
if (els.jobType) {
  els.jobType.oninput = () => { renderOrderComposer(); };
  els.jobType.onchange = () => { renderOrderComposer(); };
}
if (els.jobStrategy) {
  els.jobStrategy.oninput = () => { renderOrderComposer(); };
  els.jobStrategy.onchange = () => { renderOrderComposer(); };
}
if (els.flexToolHelpfulBtn) els.flexToolHelpfulBtn.onclick = () => {
  const tool = activeFlexibleTool() || { id: state.flexToolLastActiveId || '', title: '' };
  trackFlexibleToolEvent('flex_tool_reaction', tool, { helpful: true, status: 'helpful' });
  flash('Context tool feedback saved.', 'ok');
};
if (els.flexToolWrongBtn) els.flexToolWrongBtn.onclick = () => {
  const tool = activeFlexibleTool() || { id: state.flexToolLastActiveId || '', title: '' };
  trackFlexibleToolEvent('flex_tool_reaction', tool, { helpful: false, status: 'not_right' });
  state.flexToolDismissedKey = tool?.id || '';
  renderFlexibleToolPanel();
  flash('Context tool mismatch saved for review.', 'ok');
};
if (els.dismissFlexToolPanelBtn) els.dismissFlexToolPanelBtn.onclick = () => {
  const tool = activeFlexibleTool();
  state.flexToolDismissedKey = tool?.id || '';
  trackFlexibleToolEvent('flex_tool_hidden', tool || { id: state.flexToolLastActiveId || '', title: '' }, { userDismissed: true, status: 'dismissed' });
  renderFlexibleToolPanel();
};
if (els.flexToolPanel) els.flexToolPanel.onclick = (event) => {
  if (event.target !== els.flexToolPanel) return;
  const tool = activeFlexibleTool();
  state.flexToolDismissedKey = tool?.id || '';
  trackFlexibleToolEvent('flex_tool_hidden', tool || { id: state.flexToolLastActiveId || '', title: '' }, { userDismissed: true, status: 'dismissed' });
  renderFlexibleToolPanel();
};
if (els.jobPrompt) els.jobPrompt.oninput = () => {
  if (state.intakeConfirmed) state.intakeConfirmed = false;
  state.pendingOrderConfirmation = null;
  if (!state.snapshot?.auth?.loggedIn && String(els.jobPrompt.value || '').trim()) {
    state.openChatEntryDismissed = true;
  }
  state.orderComposerDirtySinceSend = Boolean(String(els.jobPrompt.value || '').trim());
  renderWorkChatEntryCard(state.snapshot?.auth || {});
  syncCreateJobButtonForCurrentPrompt();
};
if (els.jobPrompt) els.jobPrompt.onkeydown = (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault();
    els.createJobBtn?.click();
  }
};
if (els.intakeAnswer) els.intakeAnswer.oninput = () => {
  state.intakeAnswer = els.intakeAnswer.value || '';
  renderWorkChatThread();
};
if (els.jobUrls) els.jobUrls.oninput = () => { renderOrderComposer(); };
if (els.jobFiles) els.jobFiles.onchange = () => { void handleOrderFilesChanged(); };
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && state.orderSettingsExpanded) closeOrderSettings();
});
if (els.billingSubscriptionPlan) {
  const applySubscriptionPlanDefaults = () => {
    const plan = String(els.billingSubscriptionPlan?.value || '').trim().toLowerCase();
    const credits = subscriptionIncludedCreditsForPlan(plan);
    if (els.billingSubscriptionIncludedCredits) {
      els.billingSubscriptionIncludedCredits.value = String(credits);
    }
  };
  els.billingSubscriptionPlan.oninput = applySubscriptionPlanDefaults;
  els.billingSubscriptionPlan.onchange = applySubscriptionPlanDefaults;
}

document.querySelectorAll('.tab-btn').forEach((btn) => { btn.onclick = () => switchTab(btn.dataset.tab); });
document.querySelectorAll('.logo-link[href="/"]').forEach((link) => { link.onclick = openStartFromLogo; });

const liveEventHosts = new Set(['localhost', '127.0.0.1']);
if (window.EventSource && liveEventHosts.has(window.location.hostname)) {
  const events = new EventSource('/events');
  events.onmessage = (message) => {
    try {
      const event = JSON.parse(message.data);
      if (state.snapshot) {
        if (String(event?.type || '').toUpperCase() === 'TRACK') return;
        state.snapshot.events.push(event);
        renderStream(state.snapshot.events);
      }
    } catch {}
  };
}

initAnalytics();
loadManifestExample();
{
  const initialRoute = readInitialRouteState();
  closePlanModal();
  state.routeAgentId = initialRoute.agentId;
  if (initialRoute.settingsSection) state.settingsSection = initialRoute.settingsSection;
  switchTab(initialRoute.tab || readRememberedTab() || 'start', { allowBootstrapAccess: true });
  if (initialRoute.stripeState) {
    if (initialRoute.stripeState === 'subscription_success') {
      void trackConversionEvent('purchase', {
        source: 'stripe_return',
        status: initialRoute.stripeState
      });
    }
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.delete('stripe');
    history.replaceState({}, '', `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`);
  }
  if (initialRoute.authError) {
    const currentUrl = new URL(window.location.href);
    flash(`Sign-in failed: ${initialRoute.authError}`, 'error');
    currentUrl.searchParams.delete('auth_error');
    history.replaceState({}, '', `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`);
  }
}

window.addEventListener('pageshow', () => {
  closePlanModal();
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && state.currentTab === 'work') pauseWorkChatOnTabLeave();
});
window.addEventListener('pagehide', () => {
  if (state.currentTab === 'work') pauseWorkChatOnTabLeave();
});

function ensureSettingsLogin() {
  const loggedIn = Boolean(state.snapshot?.auth?.loggedIn && state.snapshot?.auth?.user?.login);
  if (loggedIn) return true;
  requireStartLoginGate('settings', 'Login required. SETTINGS actions are private.');
  return false;
}

function ensureGithubLinkedAccess(options = {}) {
  const auth = state.snapshot?.auth || {};
  const githubLinked = isGithubLinked(auth);
  const githubAuthorized = isGithubAuthorized(auth);
  const requiresGithubFlow = Boolean(options.requireGithubFlow);
  if (requiresGithubFlow ? githubAuthorized : (githubLinked || canManageAgentsFromBrowser(auth) || canManagePayoutsFromBrowser(auth))) return true;
  if (!auth?.loggedIn) {
    flash('Sign in first, then connect GitHub.', 'error');
    openGithubSignIn();
    return false;
  }
  if (githubLinked && requiresGithubFlow && !githubAuthorized) {
    if (options.section === 'provider') openSettingsSection('provider');
    else if (options.section === 'keys') openSettingsSection('keys');
    else switchTab('agents');
    flash(options.reconnectMessage || 'GitHub is already linked. Refresh GitHub access in this browser, then retry.', 'error');
    return false;
  }
  if (options.section === 'provider') openSettingsSection('provider');
  else if (options.section === 'keys') openSettingsSection('keys');
  else switchTab('agents');
  flash(options.message || 'GitHub connection required for this action.', 'error');
  return false;
}

async function bootstrapInitialSnapshot() {
  const startedOnAuthCheck = state.currentTab === 'auth-check';
  if (startedOnAuthCheck) {
    const resolved = await primeAuthCheckFromStatus();
    if (resolved && !state.snapshot?.auth?.loggedIn && state.currentTab === 'auth-check') return;
  }
  state.initialSnapshotLoading = true;
  try {
    await refresh();
  } catch (error) {
    flash(error.message || 'Initial data load failed. Refresh the page or sign in again.', 'error');
    if (startedOnAuthCheck && state.currentTab === 'auth-check') {
      requireStartLoginGate(state.pendingAuthTab || 'work', 'Session check timed out. Sign in to continue.');
    }
  } finally {
    state.initialSnapshotLoading = false;
    trackPageViewOnce();
  }
}

void bootstrapInitialSnapshot();
