import {
  APP_SETTING_DEFAULTS,
  WORK_ACTION_IDS
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
  IN_APP_PAYMENTS_REMOVED
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
import { createClientOpenChatAnswerBuilders } from './client-open-chat-answer-builders.js?v=20260601a';
import { createClientOpenChatLocalAnswerUtils } from './client-open-chat-local-answer-utils.js?v=20260527a';
import { createClientOpenChatContextUtils } from './client-open-chat-context-utils.js?v=20260601a';
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
import { createClientDeliveryRenderUtils } from './client-delivery-render-utils.js?v=20260601b';
import { createClientDeliveryRenderModel } from './client-delivery-render-model.js?v=20260601a';
import { createClientRunDetailController } from './client-run-detail-controller.js?v=20260601a';
import { createClientDeliveryActionController } from './client-delivery-action-controller.js?v=20260601b';
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
import { createClientReleaseAccessController } from './client-release-access-controller.js?v=20260529a';
import { createClientAuthActionsController } from './client-auth-actions-controller.js?v=20260601a';
import { createClientOpenChatRuntimeController } from './client-open-chat-runtime-controller.js?v=20260529a';
import { createClientOpenChatExchangeController } from './client-open-chat-exchange-controller.js?v=20260601a';
import { createClientViewUtils } from './client-view-utils.js?v=20260529a';
import { createClientParallelOrderController } from './client-parallel-order-controller.js?v=20260529a';
import { createClientOrderDraftController } from './client-order-draft-controller.js?v=20260529a';
import { createClientJobCreateController } from './client-job-create-controller.js?v=20260601a';
import { createClientPrimaryEventBindingsController } from './client-primary-event-bindings-controller.js?v=20260601a';
import { createClientSecondaryEventBindingsController } from './client-secondary-event-bindings-controller.js?v=20260601a';
import { createClientWorkChatActionController } from './client-work-chat-action-controller.js?v=20260601a';
import { createClientAgentDetailController } from './client-agent-detail-controller.js?v=20260601a';
import { createClientTabNavigationController } from './client-tab-navigation-controller.js?v=20260601a';
import { createClientWorkChatThreadController } from './client-work-chat-thread-controller.js?v=20260601b';
import { createClientAgentSkillManifestController } from './client-agent-skill-manifest-controller.js?v=20260601b';
import { createClientOrderUiStateController } from './client-order-ui-state-controller.js?v=20260601a';
import { createClientWorkSelectionController } from './client-work-selection-controller.js?v=20260601a';
import { createClientState } from './client-state.js?v=20260602a';
import { createClientBootstrapController } from './client-bootstrap-controller.js?v=20260602a';

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

const state = createClientState();

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

const clientAgentSkillManifestController = createClientAgentSkillManifestController({
  els,
  state,
  productName: PRODUCT_NAME,
  productShortName: PRODUCT_SHORT_NAME,
  api: (path, init) => api(path, init),
  appendOrderChatExchange: (prompt, answer, options) => appendOrderChatExchange(prompt, answer, options),
  agentVerifyFailureSummary: (agent) => agentVerifyFailureSummary(agent),
  completeAgentSetup: (agentId) => completeAgentSetup(agentId),
  flash: (message, tone) => flash(message, tone),
  loadAgentOnboarding: (agentId, options) => loadAgentOnboarding(agentId, options),
  looksJapanese: (value) => looksJapanese(value),
  openChatPreviewSteps: (kind, prompt) => openChatPreviewSteps(kind, prompt),
  refresh: () => refresh(),
  renderAgentSetupFlow: (auth) => renderAgentSetupFlow(auth),
  renderAgents: (agents) => renderAgents(agents),
  setDetail: (value) => setDetail(value),
  switchTab: (tab) => switchTab(tab),
  trackConversionEvent: (eventName, payload) => trackConversionEvent(eventName, payload),
  window
});
const {
  draftAgentSkillManifestFromText,
  handleAgentSkillMarkdownFromChat,
  importManifestUrlAndVerify,
  loadManifestExample,
  looksLikeAgentSkillMarkdown,
  openManualAgentSkillFlow
} = clientAgentSkillManifestController;

const clientJobCreateController = createClientJobCreateController({
  state,
  els,
  productShortName: PRODUCT_SHORT_NAME,
  openChatDispatchInFlightTtlMs: OPEN_CHAT_DISPATCH_IN_FLIGHT_TTL_MS,
  api: (path, init) => api(path, init),
  apiPayloadFromOrderDraftWithChatSession: (draft, sessionId) => apiPayloadFromOrderDraftWithChatSession(draft, sessionId),
  appendOpenChatOrderProgressMessage: (body, options) => appendOpenChatOrderProgressMessage(body, options),
  appendOrderChatExchange: (prompt, answer, options) => appendOrderChatExchange(prompt, answer, options),
  applyServerPreparedOrder: (preparedOrder, originalPrompt) => applyServerPreparedOrder(preparedOrder, originalPrompt),
  applyServerResolvedIntent: (intent, originalPrompt) => applyServerResolvedIntent(intent, originalPrompt),
  buildOpenChatClarifyModeAnswer: (prompt, inputCounts, options) => buildOpenChatClarifyModeAnswer(prompt, inputCounts, options),
  buildOpenChatCommandAnswer: (prompt) => buildOpenChatCommandAnswer(prompt),
  buildOpenChatConfirmedDispatchDraft: (prompt, inputCounts) => buildOpenChatConfirmedDispatchDraft(prompt, inputCounts),
  buildOpenChatImplicitOrderPrepAnswer: (prompt, inputCounts, options) => buildOpenChatImplicitOrderPrepAnswer(prompt, inputCounts, options),
  buildOpenChatLlmFallbackUnavailableAnswer: (prompt, reason) => buildOpenChatLlmFallbackUnavailableAnswer(prompt, reason),
  buildOpenChatPreLlmGuardAnswer: (prompt, inputCounts) => buildOpenChatPreLlmGuardAnswer(prompt, inputCounts),
  cancelOrderComposerRender: () => cancelOrderComposerRender(),
  chatAnswerKind: (answer) => chatAnswerKind(answer),
  chatEngineIsNeedsInputResponse: (response) => chatEngineIsNeedsInputResponse(response),
  clearOpenChatPendingDispatchMessage: () => clearOpenChatPendingDispatchMessage(),
  clearOrderComposerPrompt: () => clearOrderComposerPrompt(),
  clearPinnedAgentIfMismatchedBrief: (prompt) => clearPinnedAgentIfMismatchedBrief(prompt),
  clearPinnedAgentIfMismatchedTask: (taskType) => clearPinnedAgentIfMismatchedTask(taskType),
  clientOrderIdFromOrderCreate: (payload) => clientOrderIdFromOrderCreate(payload),
  compactChatText: (value, maxLength) => compactChatText(value, maxLength),
  createdOrderPrimaryId: (created) => createdOrderPrimaryId(created),
  currentOrderDraft: () => currentOrderDraft(),
  currentRoutingTask: () => currentRoutingTask(),
  currentVisibleOrderPrompt: () => currentVisibleOrderPrompt(),
  dispatchOpenChatConfirmedChoice: () => dispatchOpenChatConfirmedChoice(),
  fallbackPromptFromOrderInput: (input) => fallbackPromptFromOrderInput(input),
  flash: (message, tone) => flash(message, tone),
  focusWorkResults: () => focusWorkResults(),
  handleAgentSkillMarkdownFromChat: (skillMd, options) => handleAgentSkillMarkdownFromChat(skillMd, options),
  handleNeedsInputResponse: (response, draft) => handleNeedsInputResponse(response, draft),
  handleOrderFundingPrompt: (error, draft, options) => handleOrderFundingPrompt(error, draft, options),
  handleOrderPreflightPrompt: (error, draft, options) => handleOrderPreflightPrompt(error, draft, options),
  ensureCurrentOpenChatSessionId: (options) => ensureCurrentOpenChatSessionId(options),
  isNonOrderConversationIntentText: (text) => isNonOrderConversationIntentText(text),
  isOpenChatClarifyMode: () => isOpenChatClarifyMode(),
  isOpenChatDispatchReadyPrompt: (prompt) => isOpenChatDispatchReadyPrompt(prompt),
  isOpenChatExplicitDispatchRequest: (prompt) => isOpenChatExplicitDispatchRequest(prompt),
  isStructuredOrderBrief: (value) => isStructuredOrderBrief(value),
  lastOpenChatPreparedBrief: () => lastOpenChatPreparedBrief(),
  looksJapanese: (value) => looksJapanese(value),
  looksLikeAgentSkillMarkdown: (text) => looksLikeAgentSkillMarkdown(text),
  makeClientOrderId: () => makeClientOrderId(),
  markCurrentOpenChatSessionLinkedOrder: (orderId, options) => markCurrentOpenChatSessionLinkedOrder(orderId, options),
  markOpenChatDecisionSuppressedForBrief: (brief) => markOpenChatDecisionSuppressedForBrief(brief),
  normalizeOrderProgressStatus: (status) => normalizeOrderProgressStatus(status),
  openChatCanDirectDispatchAssistAnswer: (prompt, answer) => openChatCanDirectDispatchAssistAnswer(prompt, answer),
  openChatCanonicalOrderTaskType: (taskType, prompt) => openChatCanonicalOrderTaskType(taskType, prompt),
  openChatDecisionOriginalPrompt: () => openChatDecisionOriginalPrompt(),
  openChatHasActiveLocalFollowupState: (prompt) => openChatHasActiveLocalFollowupState(prompt),
  openChatLlmFallbackReason: (prompt, inputCounts, quickAnswer) => openChatLlmFallbackReason(prompt, inputCounts, quickAnswer),
  openChatMustUseLlmFallback: (prompt, quickAnswer) => openChatMustUseLlmFallback(prompt, quickAnswer),
  openChatPreorderDecisionCommand: (prompt) => openChatPreorderDecisionCommand(prompt),
  openChatPreserveSeedTaskType: (prompt, preferredTaskType) => openChatPreserveSeedTaskType(prompt, preferredTaskType),
  openChatShouldPreferOpenAiReasoning: (prompt, inputCounts) => openChatShouldPreferOpenAiReasoning(prompt, inputCounts),
  openSettingsSection: (section) => openSettingsSection(section),
  orderAcceptanceProgressBody: (prompt, startedAt, options) => orderAcceptanceProgressBody(prompt, startedAt, options),
  orderAcceptanceProgressMeta: (percent, options) => orderAcceptanceProgressMeta(percent, options),
  orderCreateRequestBody: (payload) => orderCreateRequestBody(payload),
  orderInputCounts: (input) => orderInputCounts(input),
  orderInputFromComposer: () => orderInputFromComposer(),
  orderProgressMessageFromCreated: (created, prompt) => orderProgressMessageFromCreated(created, prompt),
  orderProgressMessageLabel: (created) => orderProgressMessageLabel(created),
  orderProgressMeta: (created, options) => orderProgressMeta(created, options),
  orderProgressTone: (status) => orderProgressTone(status),
  prepareWorkOrderViaApi: (prompt, strategy) => prepareWorkOrderViaApi(prompt, strategy),
  persistCurrentOpenChatSession: () => persistCurrentOpenChatSession(),
  quickOrderChatAnswer: (prompt, inputCounts) => quickOrderChatAnswer(prompt, inputCounts),
  recoverAcceptedOrderAfterCreateError: (payload, options) => recoverAcceptedOrderAfterCreateError(payload, options),
  refresh: () => refresh(),
  renderOrderComposer: () => renderOrderComposer(),
  requestOpenChatPreorderIntentResolution: (prompt, inputCounts, quickAnswer, options) => requestOpenChatPreorderIntentResolution(prompt, inputCounts, quickAnswer, options),
  requestedOrderStrategy: () => requestedOrderStrategy(),
  resolveOpenChatServerLeaderIntake: (prompt, inputCounts, draft) => resolveOpenChatServerLeaderIntake(prompt, inputCounts, draft),
  resolveWorkIntentViaApi: (prompt) => resolveWorkIntentViaApi(prompt),
  revealCreatedOrderInHistory: (created, payload) => revealCreatedOrderInHistory(created, payload),
  rewriteStructuredBriefTaskType: (brief, taskType) => rewriteStructuredBriefTaskType(brief, taskType),
  setDetail: (value) => setDetail(value),
  shouldPrepareOrderBeforeDispatch: (draft) => shouldPrepareOrderBeforeDispatch(draft),
  startOpenChatAcceptanceProgress: (prompt, options) => startOpenChatAcceptanceProgress(prompt, options),
  startOpenChatOrderProgressPolling: (orderId, options) => startOpenChatOrderProgressPolling(orderId, options),
  structuredOrderBriefParts: (brief) => structuredOrderBriefParts(brief),
  summarizeOrderDraftForAnalytics: (draft, source) => summarizeOrderDraftForAnalytics(draft, source),
  switchTab: (tab) => switchTab(tab),
  syncCreateJobButtonForCurrentPrompt: () => syncCreateJobButtonForCurrentPrompt(),
  trackChatTranscript: (prompt, answer, payload) => trackChatTranscript(prompt, answer, payload),
  trackConversionEvent: (eventName, payload) => trackConversionEvent(eventName, payload),
  trackOpenChatSubmitTranscript: (draft, analyticsDraft) => trackOpenChatSubmitTranscript(draft, analyticsDraft),
  updateWorkChatStatusCard: (title, body, tone) => updateWorkChatStatusCard(title, body, tone),
  upsertOpenChatOrderProgressMessage: (orderId, body, options) => upsertOpenChatOrderProgressMessage(orderId, body, options),
  upsertOpenChatPendingDispatchMessage: (body, options) => upsertOpenChatPendingDispatchMessage(body, options),
  validateOrderDraft: (draft, options) => validateOrderDraft(draft, options),
  visitorId: () => visitorId(),
  withOpenChatResponseSource: (answer, source, reason) => withOpenChatResponseSource(answer, source, reason),
  window
});
const {
  acceptPreparedOpenChatOrderForDispatch,
  createAndOptionallyRunJob,
  handleCreateJobButtonClick,
  runOpenChatHubCommand
} = clientJobCreateController;

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

const clientDeliveryRenderModel = createClientDeliveryRenderModel({
  visibleDeliveryFiles
});
const {
  clarifyingQuestionsFromReport,
  deliveryStateFromValue,
  deliverySummaryText,
  workflowChildRunsFromDelivery
} = clientDeliveryRenderModel;

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

const clientOpenChatAnswerBuilders = createClientOpenChatAnswerBuilders({
  productShortName: PRODUCT_SHORT_NAME,
  quickAnswerUtils: clientOpenChatQuickAnswerUtils,
  looksJapanese: (value) => looksJapanese(value),
  inferClientTaskSequence: (taskType, prompt) => inferClientTaskSequence(taskType, prompt),
  currentRoutingTask: () => currentRoutingTask(),
  catCompactDispatchBrief: (source, taskType, inputCounts, config) => catCompactDispatchBrief(source, taskType, inputCounts, config),
  openChatClarifyingQuestions: (taskType, prompt) => openChatClarifyingQuestions(taskType, prompt),
  openChatReadinessBlock: (taskType, prompt, inputCounts, config) => openChatReadinessBlock(taskType, prompt, inputCounts, config),
  openChatHumanDispatchPreview: (brief, taskType, prompt, inputCounts) => openChatHumanDispatchPreview(brief, taskType, prompt, inputCounts),
  orderRoutingDecision: (taskType, prompt, requested) => orderRoutingDecision(taskType, prompt, requested),
  readyAgentsForTask: (taskType) => readyAgentsForTask(taskType),
  agentRoutingScore: (agent, taskType) => agentRoutingScore(agent, taskType),
  isStructuredOrderBrief: (brief) => isStructuredOrderBrief(brief),
  structuredOrderBriefParts: (brief) => structuredOrderBriefParts(brief),
  resolveOpenChatFollowupAnswer: (prompt, inputCounts) => resolveOpenChatFollowupAnswer(prompt, inputCounts),
  resolveOpenChatDispatchReadyPrompt: (prompt) => resolveOpenChatDispatchReadyPrompt(prompt),
  resolveOpenChatShouldPrepareOrderBeforeDispatch: (draft) => resolveOpenChatShouldPrepareOrderBeforeDispatch(draft),
  resolveOpenChatImplicitOrderPrepAnswer: (prompt, inputCounts, options) => resolveOpenChatImplicitOrderPrepAnswer(prompt, inputCounts, options),
  resolveOpenChatLongPromptGuardAnswer: (prompt, inputCounts) => resolveOpenChatLongPromptGuardAnswer(prompt, inputCounts)
});
const {
  buildOpenChatNoLoginAnswer,
  buildOpenChatExamplesAnswer,
  buildOpenChatAcknowledgementAnswer,
  buildOpenChatDirectResearchQuestionAnswer,
  buildOpenChatRunConfirmationAnswer,
  isOpenChatBriefEditInstruction,
  isOpenChatAdditionalRequirementFollowup,
  explicitOpenChatAssistMode,
  buildOpenChatFollowupAnswer,
  openChatRoutePreview,
  buildOpenChatOrderPreview,
  isOpenChatDispatchReadyPrompt,
  shouldPrepareOrderBeforeDispatch,
  buildOpenChatImplicitOrderPrepAnswer,
  buildOpenChatClarifyModeAnswer,
  buildOpenChatLongPromptGuardAnswer,
  openChatLooksGeneralHelpPrompt,
  buildOpenChatGeneralHelpAnswer,
  buildOpenChatMarketingAgentListAnswer,
  buildOpenChatLeaderCatalogAnswer,
  buildOpenChatRecurringWorkAnswer,
  buildOpenChatPaymentQuestionAnswer,
  openChatLooksLowInfoAmbiguousPrompt,
  buildOpenChatLowInfoAmbiguousAnswer,
  quickOrderChatAnswer,
  buildOpenChatLlmFallbackUnavailableAnswer
} = clientOpenChatAnswerBuilders;

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

const clientReleaseAccessController = createClientReleaseAccessController({
  document,
  els,
  state,
  productShortName: PRODUCT_SHORT_NAME,
  agentHealth: (agent) => agentHealth(agent),
  canManageAgentsFromBrowser: (auth) => canManageAgentsFromBrowser(auth),
  canManagePaymentsFromBrowser: (auth) => canManagePaymentsFromBrowser(auth),
  canManagePayoutsFromBrowser: (auth) => canManagePayoutsFromBrowser(auth),
  canOrderFromBrowser: (auth) => canOrderFromBrowser(auth),
  canUseDevApi: (auth) => canUseDevApi(auth),
  canUseGithubAgentFlow: (auth) => canUseGithubAgentFlow(auth),
  defaultLoggedInTab: (snapshot) => defaultLoggedInTab(snapshot),
  setButtonAccess: (element, enabled) => setButtonAccess(element, enabled),
  setElementVisible: (element, visible) => setElementVisible(element, visible),
  switchTab: (tab) => switchTab(tab)
});
const {
  renderReleaseAccess,
  renderStartGuide,
  setTabVisible
} = clientReleaseAccessController;

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

const clientAuthActionsController = createClientAuthActionsController({
  state,
  els,
  window,
  canManageAgentsFromBrowser: (auth) => canManageAgentsFromBrowser(auth),
  canManagePaymentsFromBrowser: (auth) => canManagePaymentsFromBrowser(auth),
  canManagePayoutsFromBrowser: (auth) => canManagePayoutsFromBrowser(auth),
  canOrderFromBrowser: (auth) => canOrderFromBrowser(auth),
  connectorActionLabel: (action) => connectorActionLabel(action),
  defaultLoggedInTab: (snapshot) => defaultLoggedInTab(snapshot),
  flash: (message, tone) => flash(message, tone),
  googleAuthActionUrl: (auth, options) => googleAuthActionUrl(auth, options),
  googleOAuthBrowserWarning: () => googleOAuthBrowserWarning(),
  isGithubAuthorized: (auth) => isGithubAuthorized(auth),
  isGithubLinked: (auth) => isGithubLinked(auth),
  isGoogleAuthorized: (auth) => isGoogleAuthorized(auth),
  isGoogleLinked: (auth) => isGoogleLinked(auth),
  isLikelyRestrictedGoogleOAuthBrowser: () => isLikelyRestrictedGoogleOAuthBrowser(),
  linkedProvidersLabel: (auth) => linkedProvidersLabel(auth),
  openGithubSignIn: () => openGithubSignIn(),
  openLoginForProtectedAction: (source, fallbackTab) => openLoginForProtectedAction(source, fallbackTab),
  openSettingsSection: (section) => openSettingsSection(section),
  renderAgentSetupFlow: (auth) => renderAgentSetupFlow(auth),
  renderAgents: (agents) => renderAgents(agents),
  renderOrderComposer: () => renderOrderComposer(),
  renderReleaseAccess: (auth) => renderReleaseAccess(auth),
  requireStartLoginGate: (targetTab, reason) => requireStartLoginGate(targetTab, reason),
  setElementVisible: (element, visible) => setElementVisible(element, visible),
  setTabVisible: (tab, visible) => setTabVisible(tab, visible),
  switchTab: (tab, options) => switchTab(tab, options),
  trackConversionEvent: (eventName, payload) => trackConversionEvent(eventName, payload),
  trackAuthCompletion: (auth) => trackAuthCompletion(auth),
  trackLoginStarted: (provider) => trackLoginStarted(provider)
});

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

const ORDER_COMPOSER_INPUT_DEBOUNCE_MS = 260;

const clientOpenChatRuntimeController = createClientOpenChatRuntimeController({
  state,
  window,
  productShortName: PRODUCT_SHORT_NAME,
  liveSnapshotRefreshMs: LIVE_SNAPSHOT_REFRESH_MS,
  chatAnswerKind: (answer) => chatAnswerKind(answer),
  looksJapanese: (value) => looksJapanese(value),
  normalizeOrderProgressStatus: (status) => normalizeOrderProgressStatus(status),
  refresh: () => refresh(),
  renderWorkChatThread: (...args) => renderWorkChatThread(...args),
  updateWorkChatStatusCard: (title, body, tone) => updateWorkChatStatusCard(title, body, tone)
});
const {
  clearLiveSnapshotRefreshTimer,
  finishOpenChatTyping,
  hasActiveOpenChatOrderProgress,
  makeOpenChatMessageId,
  scheduleLiveSnapshotRefresh,
  shouldAnimateOpenChatAnswer,
  startOpenChatThinking,
  startOpenChatTyping,
  stopOpenChatThinking
} = clientOpenChatRuntimeController;

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
  startOpenChatOrderProgressPolling: (...args) => startOpenChatOrderProgressPolling(...args),
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
  bindDeliveryCommonActionButtons,
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

const clientOrderUiStateController = createClientOrderUiStateController({
  state,
  els,
  document,
  window,
  orderComposerInputDebounceMs: ORDER_COMPOSER_INPUT_DEBOUNCE_MS,
  canOrderFromBrowser,
  currentEffectiveOrderPrompt: () => currentEffectiveOrderPrompt(),
  currentOrderDraft: () => currentOrderDraft(),
  currentRoutingTask: () => currentRoutingTask(),
  flash: (message, tone) => flash(message, tone),
  inferListCreatorRequestedCount,
  listCreatorUsageEstimateForCount,
  looksJapanese,
  normalizeOpenChatMode,
  normalizeTaskTypeToken,
  renderOrderComposer: () => renderOrderComposer(),
  setElementVisible,
  updateOrderSettingsDrawerControls,
  updateParallelToolsControls
});
const {
  cancelOrderComposerRender,
  closeOrderSettings,
  guestTrialAlreadyUsedLocally,
  guestTrialPromoTextForDraft,
  isOpenChatClarifyMode,
  listCreatorEstimateForDraft,
  markGuestTrialUsedLocally,
  maybeClaimGuestTrialCredits,
  openChatMode,
  persistOpenChatModeValue,
  promotePreparedBriefToOrderMode,
  renderOrderAdvancedPanel,
  renderOrderSettingsDrawer,
  renderParallelTools,
  scheduleOrderComposerRender,
  setOpenChatMode,
  shouldOfferGuestTrialForDraft
} = clientOrderUiStateController;

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

const clientTabNavigationController = createClientTabNavigationController({
  document,
  els,
  state,
  window,
  clearOpenChatAcceptanceProgressTimer: () => clearOpenChatAcceptanceProgressTimer(),
  clearOpenChatOrderProgressTimer: () => clearOpenChatOrderProgressTimer(),
  defaultLoggedInTab: (snapshot) => defaultLoggedInTab(snapshot),
  finishOpenChatTyping: (options) => finishOpenChatTyping(options),
  flash: (message, tone) => flash(message, tone),
  normalizeTab: (tab) => normalizeTab(tab),
  openChatLastPromptWasOrderDecision: () => openChatLastPromptWasOrderDecision(),
  openDedicatedLoginPage: (options) => openDedicatedLoginPage(options),
  persistCurrentOpenChatSession: () => persistCurrentOpenChatSession(),
  refresh: () => refresh(),
  rememberTab: (tab) => rememberTab(tab),
  setElementVisible: (element, visible) => setElementVisible(element, visible),
  setTabVisible: (tab, visible) => setTabVisible(tab, visible),
  syncRouteState: () => syncRouteState(),
  trackConversionEvent: (eventName, payload) => trackConversionEvent(eventName, payload),
  trackConversionOnce: (eventName, payload, key) => trackConversionOnce(eventName, payload, key)
});
const {
  pauseWorkChatOnTabLeave,
  requireStartLoginGate,
  switchTab,
  syncLanding,
  syncTopWorkChatCta
} = clientTabNavigationController;

function focusWorkResults() {
  return clientWorkSelectionController.focusWorkResults();
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

function selectedJob() {
  return clientWorkSelectionController.selectedJob();
}

function jobById(id = '') {
  return clientWorkSelectionController.jobById(id);
}

function openJobDetail(jobId = '') {
  return clientWorkSelectionController.openJobDetail(jobId);
}

async function loadJobForChatAction(orderId = '') {
  return clientWorkSelectionController.loadJobForChatAction(orderId);
}

const clientOpenChatContextUtils = createClientOpenChatContextUtils({
  getState: () => state,
  getEls: () => els,
  workOrderUiLabels: () => workOrderUiLabels(),
  normalizeOpenChatIntentText: (value) => normalizeOpenChatIntentText(value),
  openChatIntentMatchText: (value) => openChatIntentMatchText(value),
  isStructuredOrderBrief: (brief) => isStructuredOrderBrief(brief),
  structuredOrderBriefParts: (brief) => structuredOrderBriefParts(brief),
  extractPreparedBriefFromChatText: (value) => extractPreparedBriefFromChatText(value),
  rewriteStructuredBriefTaskType: (brief, taskType) => rewriteStructuredBriefTaskType(brief, taskType),
  openChatCanonicalOrderTaskType: (taskType, context) => openChatCanonicalOrderTaskType(taskType, context),
  inferClientTaskSequence: (taskType, prompt) => inferClientTaskSequence(taskType, prompt),
  currentRoutingTask: () => currentRoutingTask(),
  openChatPendingQuestionContext: () => openChatPendingQuestionContext(),
  openChatPreviousUserMessageBody: () => openChatPreviousUserMessageBody(),
  openChatLastPromptWasOrderDecision: () => openChatLastPromptWasOrderDecision(),
  orderInputCounts: (input) => orderInputCounts(input),
  orderInputFromComposer: () => orderInputFromComposer(),
  buildOpenChatDispatchBriefFromPendingAnswer: (original, prompt, taskType, inputCounts) => buildOpenChatDispatchBriefFromPendingAnswer(original, prompt, taskType, inputCounts),
  looksJapanese: (value) => looksJapanese(value),
  makeParallelDraftId: () => makeParallelDraftId(),
  orderRoutingDecision: (taskType, prompt, requested) => orderRoutingDecision(taskType, prompt, requested)
});
const {
  latestOpenChatAgentConfirmationBody,
  openChatPreserveSeedTaskType,
  openChatDecisionSeedContext,
  fallbackStructuredBriefFromOpenChatConfirmation,
  lastOpenChatPreparedBrief,
  currentVisibleOrderPrompt,
  currentEffectiveOrderPrompt,
  openChatConversationContextForLlm,
  parallelDraftFromOpenChatPlanItem
} = clientOpenChatContextUtils;

const clientOpenChatExchangeController = createClientOpenChatExchangeController({
  state,
  els,
  productShortName: PRODUCT_SHORT_NAME,
  orderInputMaxFiles: ORDER_INPUT_MAX_FILES,
  applyOpenChatCommand,
  buildOpenChatTrioDiscussion,
  chatAnswerDisplayBody,
  chatAnswerKind,
  clearOpenChatDecisionSuppressionForNewBrief,
  clearPinnedAgentIfMismatchedBrief,
  compactChatText,
  currentRoutingTask,
  finishOpenChatTyping,
  inferClientTaskSequence,
  isStructuredOrderBrief,
  makeOpenChatMessageId,
  normalizeOrderInputFile,
  openChatCanonicalOrderTaskType,
  openChatPendingQuestionTaskType,
  openChatPreparedOrderActions,
  openChatStatusDisplayText,
  openChatStepItems,
  orderInputCounts,
  orderInputFromComposer,
  persistCurrentOpenChatSession,
  renderOpenChatSessionControls,
  renderOrderComposer,
  rewriteStructuredBriefTaskType,
  shouldAnimateOpenChatAnswer,
  shouldStoreOpenChatPendingQuestion,
  startOpenChatTyping,
  structuredOrderBriefParts,
  syncCreateJobButtonForCurrentPrompt,
  trackChatTranscript,
  updateWorkChatStatusCard
});

function appendOrderChatExchange(prompt, answer, options = {}) {
  return clientOpenChatExchangeController.appendOrderChatExchange(prompt, answer, options);
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

const clientWorkChatActionController = createClientWorkChatActionController({
  state,
  els,
  acceptPreparedOpenChatOrderForDispatch,
  addFlexibleToolInstruction,
  appendOrderChatExchange,
  buildOpenChatLeaderChoiceFollowupAnswer,
  buildOpenChatTimelinePlanClarifyAnswer,
  composeOpenChatPreorderCancelResponse,
  connectXAccount,
  createAndOptionallyRunJob,
  currentVisibleOrderPrompt,
  dispatchOpenChatConfirmedChoice,
  downloadableDeliveryFilesForJob,
  downloadDeliveryZip,
  donationOnlyNotice: DONATION_ONLY_NOTICE,
  enterOpenChatRevisionChoice,
  flash,
  focusWorkResults,
  jobById,
  loadJobForChatAction,
  looksJapanese,
  openAgentCatalog,
  openAgentListingFlow,
  openChatPreviousAgentMessageBody,
  openChatPreviousUserMessageBody,
  openFeedbackForm,
  openGithubSignIn,
  openJobDetail,
  openMarketingTimelineModal,
  openPrimaryGoogleSignIn,
  openSettingsSection,
  orderInputCounts,
  orderInputFromComposer,
  renderOpenChatChoiceBar,
  safeText,
  switchTab,
  updateCliPanels
});
const {
  handleOpenChatChoiceCommand,
  handleChatActionButton
} = clientWorkChatActionController;

const clientWorkChatThreadController = createClientWorkChatThreadController({
  els,
  state,
  productShortName: PRODUCT_SHORT_NAME,
  appSettingDefaults: APP_SETTING_DEFAULTS,
  appSettingValue: (key, fallback) => appSettingValue(key, fallback),
  formatWorkUiText: (value) => formatWorkUiText(value),
  handleChatActionButton: (action, options) => handleChatActionButton(action, options),
  looksJapanese: (value) => looksJapanese(value),
  renderChatMessage: (role, label, body, tone, steps, options) => renderChatMessage(role, label, body, tone, steps, options),
  runAction: (button, action) => runAction(button, action)
});
const {
  renderWorkChatThread,
  shouldStickWorkChatScrollToBottom
} = clientWorkChatThreadController;

function selectedAgent() {
  return clientAgentDetailController.selectedAgent();
}

function openPrimaryGoogleSignIn(options = {}) {
  return clientAuthActionsController.openPrimaryGoogleSignIn(options);
}

function continueOpenChatAsGuest() {
  return clientAuthActionsController.continueOpenChatAsGuest();
}

function connectXAccount(options = {}) {
  return clientAuthActionsController.connectXAccount(options);
}

function openOrderTab() {
  return clientAuthActionsController.openOrderTab();
}

function openAgentCatalog() {
  return clientAuthActionsController.openAgentCatalog();
}

function openAgentListingFlow() {
  return clientAuthActionsController.openAgentListingFlow();
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

const clientAgentDetailController = createClientAgentDetailController({
  state,
  els,
  window,
  api,
  adapterAutomationAlreadyPrepared,
  agentComposition,
  agentExecutionProfile,
  agentGithubRepo,
  agentHealth,
  agentNextAction,
  agentPricingConfig,
  agentPricingGuideText,
  agentProductKind,
  agentRequirements,
  agentTags,
  agentTaskFit,
  agentTrustProfile,
  agentVerification,
  agentVerifyAction,
  agentVerifyFailureSummary,
  canAutomateAgentSetup,
  canCheckAgentOnboarding,
  canDeleteAgent,
  canEditAgentPricing,
  currentAgentOnboarding,
  displayCurrencyToLedgerAmount,
  estimateWindowOfAgent,
  flash,
  formatDisplayCurrency,
  formatSecRange,
  formatTime,
  moneyInputValueFromLedger,
  normalizeClientOverageMode,
  normalizeClientPricingModel,
  providerMarkupRateOf,
  refresh: (...args) => refresh(...args),
  renderAgentOnboarding,
  renderAgents: (...args) => renderAgents(...args),
  renderOrderComposer: (...args) => renderOrderComposer(...args),
  requirementFlowSummary,
  requirementFulfillmentLabel,
  requirementHubSummary,
  safeText,
  setButtonAccess,
  syncAgentPricingEditorVisibility,
  yen
});
const {
  setAgentDetail,
  deleteAgentRecord,
  saveAgentPricing
} = clientAgentDetailController;

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

const clientRunDetailController = createClientRunDetailController({
  els,
  bindDeliveryCommonActionButtons,
  bindRunDeliveryInteractions,
  deliveryCardBodyLines,
  deliveryEmptyStatePresentation,
  deliveryRenderContextFromValue,
  deliverySummaryTone,
  hideDeliveryFollowupPanel,
  maybeClassifyDeliveryCandidates,
  renderDeliverySummaryCard,
  renderMarketingTimelineModal,
  renderRunDeliverySections,
  renderWorkChatThread,
  runNextAction,
  safeText,
  summarizeRun
});
const {
  renderRunDelivery,
  setDetail
} = clientRunDetailController;

let clientWorkSelectionController = createClientWorkSelectionController({
  state,
  els,
  window,
  api,
  agentTaskFit,
  downloadableDeliveryFilesForJob,
  flash: (message, tone) => flash(message, tone),
  mergeProgressJobIntoSnapshot: (job) => mergeProgressJobIntoSnapshot(job),
  renderJobs: (jobs) => renderJobs(jobs),
  renderOrderComposer: () => renderOrderComposer(),
  setDetail: (job) => setDetail(job),
  switchTab: (tab, options) => switchTab(tab, options),
  visitorId: () => visitorId()
});

function loadOrderDraftIntoComposer(order = {}) {
  return clientWorkSelectionController.loadOrderDraftIntoComposer(order);
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
  return clientAuthActionsController.renderAuth(auth);
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

function applyAgentToRunForm(agent, options = {}) {
  return clientWorkSelectionController.applyAgentToRunForm(agent, options);
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

const clientPrimaryEventBindingsController = createClientPrimaryEventBindingsController({
  state,
  els,
  productName: PRODUCT_NAME,
  productShortName: PRODUCT_SHORT_NAME,
  inAppPaymentsRemoved: IN_APP_PAYMENTS_REMOVED,
  api,
  window,
  setTimeout,
  activeFlexibleTool,
  bindDeveloperSurfaceInteractions,
  bindGithubAgentSetupInteractions,
  closeOrderSettings,
  closePlanModal,
  completeAgentSetup,
  continueOpenChatAsGuest,
  copyTextToClipboard,
  currentMonthPeriod,
  draftAgentSkillManifestFromText,
  ensureGithubLinkedAccess,
  ensureSettingsLogin,
  exportChatTrainingData,
  flash,
  formatAgentApiCommand,
  formatOrderApiCommand,
  hideMarketingTimelineModal,
  loadAgentOnboarding,
  loadGithubRepos,
  openAgentsGithubFlow,
  openDedicatedLoginPage,
  openGithubSignIn,
  openOrderTab,
  openPrimaryGoogleSignIn,
  openSettingsSection,
  refresh,
  render,
  renderAgentSetupFlow,
  renderConnectFlow,
  renderFlexibleToolPanel,
  renderOrderSettingsDrawer,
  renderParallelTools,
  renderSettingsFlow,
  renderWorkFlow,
  resetAgentSetupFlow,
  runAction,
  safeText,
  selectApiKeyRevealToken,
  setAdminChatFilter,
  setDetail,
  showApiKeyRevealResult,
  submitFeedback,
  switchTab,
  trackConversionEvent,
  updateSelectedChatTranscriptReview,
  updateSelectedFeedbackStatus
});
clientPrimaryEventBindingsController.bindPrimaryEventHandlers();
const clientSecondaryEventBindingsController = createClientSecondaryEventBindingsController({
  state,
  els,
  api,
  document,
  window,
  activeFlexibleTool,
  addCurrentOrderToParallelQueue,
  agentPricingGuideText,
  agentSharePost,
  agentShareUrl,
  applyAgentQuickFilter,
  applyAgentToRunForm,
  applyIntakeAnswers,
  canEditAgentPricing,
  clearFollowupContext,
  clearIntakeContext,
  clearOpenChatHistory,
  clearParallelOrders,
  closeOrderSettings,
  copyTextToClipboard,
  createParallelOrders,
  currentRunTargetAgent,
  deleteAgentRecord,
  flash,
  handleCreateJobButtonClick,
  handleOrderFilesChanged,
  hideDeliveryFollowupPanel,
  loadAgentOnboarding,
  maybeAutoCheckSelectedAgent,
  maybeOfferAutomatedAgentSetup,
  openStartFromLogo,
  prepareFollowupOrderFromDelivery,
  refresh,
  renderAgents,
  renderFlexibleToolPanel,
  renderJobs,
  renderOrderAgentPicker,
  renderOrderComposer,
  renderScheduledWorkControls,
  renderStream,
  renderWorkChatEntryCard,
  renderWorkChatThread,
  runAction,
  runOpenChatHubCommand,
  scheduleCurrentOrderDraft,
  saveAgentPricing,
  selectedAgent,
  selectedJob,
  sendFollowupToAgentFromDelivery,
  setAgentDetail,
  setDetail,
  setOpenChatMode,
  setOrderStrategyChoice,
  shareAgentOnX,
  startNewOpenChatSession,
  subscriptionIncludedCreditsForPlan,
  switchTab,
  syncAgentPricingEditorVisibility,
  syncCreateJobButtonForCurrentPrompt,
  toggleOpenChatHistory,
  trackFlexibleToolEvent,
  updateCliPanels
});
clientSecondaryEventBindingsController.bindSecondaryEventHandlers();

function ensureSettingsLogin() {
  return clientAuthActionsController.ensureSettingsLogin();
}

function ensureGithubLinkedAccess(options = {}) {
  return clientAuthActionsController.ensureGithubLinkedAccess(options);
}

const clientBootstrapController = createClientBootstrapController({
  state,
  document,
  window,
  history,
  closePlanModal,
  flash,
  initAnalytics,
  loadManifestExample,
  pauseWorkChatOnTabLeave,
  primeAuthCheckFromStatus,
  readInitialRouteState,
  readRememberedTab,
  refresh,
  requireStartLoginGate,
  switchTab,
  trackConversionEvent,
  trackPageViewOnce
});
clientBootstrapController.start();
