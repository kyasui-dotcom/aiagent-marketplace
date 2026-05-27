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
  isNonOrderConversationIntentText,
  isRepoBackedCodeIntentText
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
  DEFAULT_MINIMUM_PAYOUT_AMOUNT,
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
  subscriptionPlanLabel,
  yen
} from './client-billing-utils.js?v=20260521a';
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
  inferPrimaryTaskSequence,
  isExplicitClientLeaderTask,
  normalizeOpenChatIntentText,
  openChatIntentMatchText
} from './client-intent-routing-utils.js?v=20260522a';
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
} from './client-order-progress-utils.js?v=20260522a';
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
import { createClientOpenChatOrderPrepUtils } from './client-open-chat-order-prep-utils.js?v=20260527a';
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
  updateScheduledWorkControls,
  updateOpenChatModeControls
} from './client-composer-ui.js?v=20260522a';
import { renderOpenChatSessionControlsElement } from './client-session-controls-ui.js?v=20260522a';
import { renderWorkChatEntryCardElement } from './client-work-chat-entry-ui.js?v=20260522a';
import { renderScheduledWorkListElement } from './client-scheduled-work-ui.js?v=20260522a';
import { renderOrderStrategyControlsElement } from './client-order-strategy-ui.js?v=20260522a';

const $ = (id) => document.getElementById(id);
const PRODUCT_NAME = 'CAIt';
const PRODUCT_SHORT_NAME = 'CAIt';
const DEVELOPER_SURFACES_STATUS = 'Coming soon';
const DEVELOPER_SURFACES_NOTICE = 'CLI, external API-key access, and MCP are temporarily paused while the contract is stabilized. Browser-owned CAIt chat, app, delivery, and Publisher flows remain available.';
const PAYMENT_PROVIDER_UI_VISIBLE = true;
const WORK_CHAT_INTERNAL_STATUS_VISIBLE = false;
const TEMPORARY_INVOICE_BILLING_ENABLED = false;
const STRIPE_CARD_SETUP_DURING_TEMPORARY_BILLING_ENABLED = true;
const TEMPORARY_INVOICE_SUPPORT_EMAIL = 'support@aiagent-marketplace.net';
const ORDER_HISTORY_PAGE_SIZE = 50;

function appSettingValue(key = '', fallback = '') {
  const safeKey = String(key || '').trim();
  if (!safeKey) return String(fallback || '');
  const source = state?.snapshot?.appSettings && typeof state.snapshot.appSettings === 'object'
    ? state.snapshot.appSettings
    : {};
  const value = source[safeKey];
  if (value === undefined || value === null || value === '') return String(fallback || '');
  return String(value);
}

function sanitizeWorkUiLabel(value = '', fallback = '') {
  const raw = String(value || '').replace(/[\r\n\t]/g, ' ').trim();
  if (!raw) return String(fallback || '').trim();
  return raw;
}

function workOrderUiLabels() {
  return {
    sendOrder: sanitizeWorkUiLabel(
      appSettingValue('work_order_send_label', APP_SETTING_DEFAULTS.work_order_send_label),
      APP_SETTING_DEFAULTS.work_order_send_label
    ),
    addConstraints: sanitizeWorkUiLabel(
      appSettingValue('work_order_add_constraints_label', APP_SETTING_DEFAULTS.work_order_add_constraints_label),
      APP_SETTING_DEFAULTS.work_order_add_constraints_label
    ),
    prepareOrder: sanitizeWorkUiLabel(
      appSettingValue('work_order_prepare_label', APP_SETTING_DEFAULTS.work_order_prepare_label),
      APP_SETTING_DEFAULTS.work_order_prepare_label
    ),
    sendChat: sanitizeWorkUiLabel(
      appSettingValue('work_chat_send_label', APP_SETTING_DEFAULTS.work_chat_send_label),
      APP_SETTING_DEFAULTS.work_chat_send_label
    ),
    answerFirst: sanitizeWorkUiLabel(
      appSettingValue('work_order_answer_first_label', APP_SETTING_DEFAULTS.work_order_answer_first_label),
      APP_SETTING_DEFAULTS.work_order_answer_first_label
    ),
    revise: sanitizeWorkUiLabel(
      appSettingValue('work_order_revise_label', APP_SETTING_DEFAULTS.work_order_revise_label),
      APP_SETTING_DEFAULTS.work_order_revise_label
    ),
    cancel: sanitizeWorkUiLabel(
      appSettingValue('work_order_cancel_label', APP_SETTING_DEFAULTS.work_order_cancel_label),
      APP_SETTING_DEFAULTS.work_order_cancel_label
    )
  };
}

function escapeRegex(value = '') {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function replaceCanonicalUiLabel(text = '', canonical = '', nextLabel = '') {
  const source = String(text || '');
  const canonicalText = String(canonical || '');
  const replacement = String(nextLabel || '').trim();
  if (!source || !canonicalText || !replacement || canonicalText === replacement) return source;
  return source.replace(new RegExp(escapeRegex(canonicalText), 'g'), replacement);
}

function formatWorkUiText(text = '') {
  const source = String(text || '');
  if (!source) return '';
  const labels = workOrderUiLabels();
  let output = source;
  output = replaceCanonicalUiLabel(output, APP_SETTING_DEFAULTS.work_order_send_label, labels.sendOrder);
  output = replaceCanonicalUiLabel(output, APP_SETTING_DEFAULTS.work_order_add_constraints_label, labels.addConstraints);
  output = replaceCanonicalUiLabel(output, APP_SETTING_DEFAULTS.work_order_prepare_label, labels.prepareOrder);
  output = replaceCanonicalUiLabel(output, APP_SETTING_DEFAULTS.work_chat_send_label, labels.sendChat);
  output = replaceCanonicalUiLabel(output, APP_SETTING_DEFAULTS.work_order_answer_first_label, labels.answerFirst);
  output = replaceCanonicalUiLabel(output, APP_SETTING_DEFAULTS.work_order_revise_label, labels.revise);
  output = replaceCanonicalUiLabel(output, APP_SETTING_DEFAULTS.work_order_cancel_label, labels.cancel);
  return output;
}

function formatWorkUiTextSafe(text = '') {
  const source = String(text || '');
  if (!source) return '';
  const fencedParts = source.split(/(```[\s\S]*?```)/g);
  return fencedParts
    .map((part) => {
      if (part.startsWith('```')) return part;
      return part
        .split('\n')
        .map((line) => (/^\s*>/.test(line) ? line : formatWorkUiText(line)))
        .join('\n');
    })
    .join('');
}
const els = {
  stream: $('stream'),
  eventFilter: $('eventFilter'),
  activeJobs: $('activeJobs'),
  onlineAgents: $('onlineAgents'),
  grossVolume: $('grossVolume'),
  platformRevenue: $('platformRevenue'),
  todayCost: $('todayCost'),
  failedJobs: $('failedJobs'),
  topOpenChatBtn: $('topOpenChatBtn'),
  mainNavMenu: $('mainNavMenu'),
  startSignupBtn: $('startSignupBtn'),
  startCreateOrderBtn: $('startCreateOrderBtn'),
  startAgentTeamWorkBtn: $('startAgentTeamWorkBtn'),
  startViewAgentsBtn: $('startViewAgentsBtn'),
  startListAgentBtn: $('startListAgentBtn'),
  startGuideCard: $('startGuideCard'),
  verifiedAgents: $('verifiedAgents'),
  readyAgents: $('readyAgents'),
  verifyFailedAgents: $('verifyFailedAgents'),
  missingEndpointAgents: $('missingEndpointAgents'),
  offlineAgents: $('offlineAgents'),
  agentCoverage: $('agentCoverage'),
  agentSetupControls: $('agentSetupControls'),
  agentSetupStatus: $('agentSetupStatus'),
  agentSetupPanels: $('agentSetupPanels'),
  agentListPanels: $('agentListPanels'),
  agentManualPanel: $('agentManualPanel'),
  agentGithubPanel: $('agentGithubPanel'),
  workGuideCard: $('workGuideCard'),
  workCreatePanels: $('workCreatePanels'),
  workListPanels: $('workListPanels'),
  workChatThread: $('workChatThread'),
  workChatStatusCard: $('workChatStatusCard'),
  workChatStatusText: $('workChatStatusText'),
  flexToolPanel: $('flexToolPanel'),
  flexToolCard: $('flexToolCard'),
  flexToolTitle: $('flexToolTitle'),
  flexToolBody: $('flexToolBody'),
  flexToolRequirements: $('flexToolRequirements'),
  flexToolActions: $('flexToolActions'),
  flexToolHelpfulBtn: $('flexToolHelpfulBtn'),
  flexToolWrongBtn: $('flexToolWrongBtn'),
  dismissFlexToolPanelBtn: $('dismissFlexToolPanelBtn'),
  storageDetail: $('storageDetail'),
  agentsTable: $('agentsTable'),
  agentOpsBoard: $('agentOpsBoard'),
  jobsTable: $('jobsTable'),
  jobsPager: $('jobsPager'),
  runSearch: $('runSearch'),
  runRequesterFilter: $('runRequesterFilter'),
  runStatusFilter: $('runStatusFilter'),
  runActionFilter: $('runActionFilter'),
  billingTable: $('billingTable'),
  billingAuditTable: $('billingAuditTable'),
  jobDetail: $('jobDetail'),
  runDeliveryCard: $('runDeliveryCard'),
  runDeliveryFiles: $('runDeliveryFiles'),
  marketingTimelineModal: $('marketingTimelineModal'),
  closeMarketingTimelineModalBtn: $('closeMarketingTimelineModalBtn'),
  marketingTimelineSummary: $('marketingTimelineSummary'),
  marketingTimelineList: $('marketingTimelineList'),
  followupPanel: $('followupPanel'),
  followupPromptCard: $('followupPromptCard'),
  followupAnswer: $('followupAnswer'),
  createFollowupOrderBtn: $('createFollowupOrderBtn'),
  clearFollowupContextBtn: $('clearFollowupContextBtn'),
  runActionCard: $('runActionCard'),
  runEstimateCard: $('runEstimateCard'),
  runCreateStatus: $('runCreateStatus'),
  orderInputGuide: $('orderInputGuide'),
  agentDetail: $('agentDetail'),
  agentOnboarding: $('agentOnboarding'),
  agentRunDraft: $('agentRunDraft'),
  runHealthSummary: $('runHealthSummary'),
  flash: $('flash'),
  authStatus: $('authStatus'),
  googleLoginBtn: $('googleLoginBtn'),
  githubLoginBtn: $('githubLoginBtn'),
  logoutBtn: $('logoutBtn'),
  loadReposBtn: $('loadReposBtn'),
  clearRepoSelectionBtn: $('clearRepoSelectionBtn'),
  generateRepoManifestBtn: $('generateRepoManifestBtn'),
  importSelectedRepoBtn: $('importSelectedRepoBtn'),
  createAdapterPrBtn: $('createAdapterPrBtn'),
  importDeployedAdapterBtn: $('importDeployedAdapterBtn'),
  openAdapterPrBtn: $('openAdapterPrBtn'),
  repoPicker: $('repoPicker'),
  repoPreview: $('repoPreview'),
  repoSearch: $('repoSearch'),
  repoPrevBtn: $('repoPrevBtn'),
  repoNextBtn: $('repoNextBtn'),
  repoPagerStatus: $('repoPagerStatus'),
  githubInstallHelp: $('githubInstallHelp'),
  seedBtn: $('seedBtn'),
  startAgentOnboardingBtn: $('startAgentOnboardingBtn'),
  useGithubOnboardingBtn: $('useGithubOnboardingBtn'),
  useManualOnboardingBtn: $('useManualOnboardingBtn'),
  agentFlowGithubLoginBtn: $('agentFlowGithubLoginBtn'),
  installGithubAppBtn: $('installGithubAppBtn'),
  resetAgentOnboardingBtn: $('resetAgentOnboardingBtn'),
  addAnotherAgentBtn: $('addAnotherAgentBtn'),
  checkAgentListBtn: $('checkAgentListBtn'),
  heroTryBtn: $('heroTryBtn'),
  heroSeedBtn: $('heroSeedBtn'),
  heroCliBtn: $('heroCliBtn'),
  agentSearch: $('agentSearch'),
  agentStatusFilter: $('agentStatusFilter'),
  agentAvailabilityFilter: $('agentAvailabilityFilter'),
  agentActionFilter: $('agentActionFilter'),
  agentTaskFilter: $('agentTaskFilter'),
  agentSort: $('agentSort'),
  registerAgentBtn: $('registerAgentBtn'),
  importManifestBtn: $('importManifestBtn'),
  importUrlBtn: $('importUrlBtn'),
  createJobBtn: $('createJobBtn'),
  addParallelJobBtn: $('addParallelJobBtn'),
  createParallelJobsBtn: $('createParallelJobsBtn'),
  clearParallelJobsBtn: $('clearParallelJobsBtn'),
  toggleParallelToolsBtn: $('toggleParallelToolsBtn'),
  toggleOrderSettingsBtn: $('toggleOrderSettingsBtn'),
  closeOrderSettingsBtn: $('closeOrderSettingsBtn'),
  orderSettingsDrawer: $('orderSettingsDrawer'),
  openChatClarifyModeBtn: $('openChatClarifyModeBtn'),
  openChatOrderModeBtn: $('openChatOrderModeBtn'),
  openChatModeMenu: $('openChatModeMenu'),
  openChatModeCurrent: $('openChatModeCurrent'),
  openChatModeStatus: $('openChatModeStatus'),
  executionChoiceMenu: $('executionChoiceMenu'),
  executionChoiceCurrent: $('executionChoiceCurrent'),
  executionChoiceSummary: $('executionChoiceSummary'),
  executionAutoBtn: $('executionAutoBtn'),
  executionSingleBtn: $('executionSingleBtn'),
  executionTeamBtn: $('executionTeamBtn'),
  openChatSessionSidebar: $('openChatSessionSidebar'),
  openChatSessionStatus: $('openChatSessionStatus'),
  openChatSessionList: $('openChatSessionList'),
  workChatEntryCard: $('workChatEntryCard'),
  workChatEntryText: $('workChatEntryText'),
  entryGoogleLoginBtn: $('entryGoogleLoginBtn'),
  entryGithubLoginBtn: $('entryGithubLoginBtn'),
  entryGuestContinueBtn: $('entryGuestContinueBtn'),
  openChatChoiceBar: $('openChatChoiceBar'),
  newOpenChatSessionBtn: $('newOpenChatSessionBtn'),
  mobileNewOpenChatSessionBtn: $('mobileNewOpenChatSessionBtn'),
  toggleOpenChatHistoryBtn: $('toggleOpenChatHistoryBtn'),
  clearOpenChatHistoryBtn: $('clearOpenChatHistoryBtn'),
  scheduledWorkStatus: $('scheduledWorkStatus'),
  scheduleCurrentOrderBtn: $('scheduleCurrentOrderBtn'),
  scheduledWorkInterval: $('scheduledWorkInterval'),
  scheduledWorkTime: $('scheduledWorkTime'),
  scheduledWorkWeekday: $('scheduledWorkWeekday'),
  scheduledWorkEvery: $('scheduledWorkEvery'),
  scheduledWorkMaxRuns: $('scheduledWorkMaxRuns'),
  scheduledWorkList: $('scheduledWorkList'),
  intakePanel: $('intakePanel'),
  intakeQuestionCard: $('intakeQuestionCard'),
  intakeAnswer: $('intakeAnswer'),
  applyIntakeAnswerBtn: $('applyIntakeAnswerBtn'),
  clearIntakeBtn: $('clearIntakeBtn'),
  parallelToolsPanel: $('parallelToolsPanel'),
  parallelOrderSummary: $('parallelOrderSummary'),
  parallelOrderQueue: $('parallelOrderQueue'),
  startWorkFlowBtn: $('startWorkFlowBtn'),
  checkWorkListBtn: $('checkWorkListBtn'),
  backWorkFlowBtn: $('backWorkFlowBtn'),
  agentName: $('agentName'),
  agentDesc: $('agentDesc'),
  agentTasks: $('agentTasks'),
  agentPremium: $('agentPremium'),
  agentBasic: $('agentBasic'),
  agentSkillMd: $('agentSkillMd'),
  draftAgentSkillBtn: $('draftAgentSkillBtn'),
  manifestJson: $('manifestJson'),
  manifestUrl: $('manifestUrl'),
  cliStatus: $('cliStatus'),
  cliFlow: $('cliFlow'),
  cliQuickstart: $('cliQuickstart'),
  apiExamples: $('apiExamples'),
  connectGuideCard: $('connectGuideCard'),
  connectQuickstartPanels: $('connectQuickstartPanels'),
  connectDocsPanels: $('connectDocsPanels'),
  connectGithubStatus: $('connectGithubStatus'),
  connectOrderApiStatus: $('connectOrderApiStatus'),
  connectAgentApiStatus: $('connectAgentApiStatus'),
  connectHubGithubBtn: $('connectHubGithubBtn'),
  connectHubInstallBtn: $('connectHubInstallBtn'),
  connectHubLoadReposBtn: $('connectHubLoadReposBtn'),
  connectHubOpenAgentsBtn: $('connectHubOpenAgentsBtn'),
  connectHubOpenSettingsOrderBtn: $('connectHubOpenSettingsOrderBtn'),
  connectHubCopyOrderBtn: $('connectHubCopyOrderBtn'),
  connectHubOpenAgentsPublishBtn: $('connectHubOpenAgentsPublishBtn'),
  connectHubOpenSettingsAgentBtn: $('connectHubOpenSettingsAgentBtn'),
  connectHubCopyAgentBtn: $('connectHubCopyAgentBtn'),
  openConnectQuickstartBtn: $('openConnectQuickstartBtn'),
  openConnectDocsBtn: $('openConnectDocsBtn'),
  backConnectFlowBtn: $('backConnectFlowBtn'),
  settingsAccessCard: $('settingsAccessCard'),
  settingsStatus: $('settingsStatus'),
  settingsPeriod: $('settingsPeriod'),
  refreshSettingsBtn: $('refreshSettingsBtn'),
  monthlySummaryCard: $('monthlySummaryCard'),
  settingsPaymentsTabBtn: $('settingsPaymentsTabBtn'),
  settingsProviderTabBtn: $('settingsProviderTabBtn'),
  settingsKeysTabBtn: $('settingsKeysTabBtn'),
  settingsFunnelTabBtn: $('settingsFunnelTabBtn'),
  settingsReportsTabBtn: $('settingsReportsTabBtn'),
  settingsPaymentsSection: $('settingsPaymentsSection'),
  settingsProviderSection: $('settingsProviderSection'),
  settingsKeysSection: $('settingsKeysSection'),
  settingsFunnelSection: $('settingsFunnelSection'),
  settingsReportsSection: $('settingsReportsSection'),
  apiKeyRevealModal: $('apiKeyRevealModal'),
  apiKeyRevealToken: $('apiKeyRevealToken'),
  apiKeyRevealResult: $('apiKeyRevealResult'),
  copyApiKeyTokenBtn: $('copyApiKeyTokenBtn'),
  copyApiKeyHeaderBtn: $('copyApiKeyHeaderBtn'),
  copyApiKeyCurlBtn: $('copyApiKeyCurlBtn'),
  closeApiKeyRevealBtn: $('closeApiKeyRevealBtn'),
  apiKeyMode: $('apiKeyMode'),
  apiKeyLabel: $('apiKeyLabel'),
  createApiKeyBtn: $('createApiKeyBtn'),
  apiKeyCreateResult: $('apiKeyCreateResult'),
  apiKeyTable: $('apiKeyTable'),
  stripeCustomerStatus: $('stripeCustomerStatus'),
  stripeProviderStatus: $('stripeProviderStatus'),
  billingSummaryCard: $('billingSummaryCard'),
  createStripeSetupSessionBtn: $('createStripeSetupSessionBtn'),
  createStripeSubscriptionSessionBtn: $('createStripeSubscriptionSessionBtn'),
  createStripeConnectOnboardingBtn: $('createStripeConnectOnboardingBtn'),
  runStripeProviderMonthlyChargeBtn: $('runStripeProviderMonthlyChargeBtn'),
  runStripeProviderPayoutBtn: $('runStripeProviderPayoutBtn'),
  payoutWithdrawAmount: $('payoutWithdrawAmount'),
  stripeCustomerActionResult: $('stripeCustomerActionResult'),
  stripeProviderActionResult: $('stripeProviderActionResult'),
  billingSnapshotCard: $('billingSnapshotCard'),
  toggleBillingProfileBtn: $('toggleBillingProfileBtn'),
  billingProfilePanel: $('billingProfilePanel'),
  billingSettingsPanel: $('billingSettingsPanel'),
  payoutSettingsPanel: $('payoutSettingsPanel'),
  providerBillingLanesCard: $('providerBillingLanesCard'),
  billingLegalName: $('billingLegalName'),
  billingCompanyName: $('billingCompanyName'),
  billingEmail: $('billingEmail'),
  billingPhone: $('billingPhone'),
  billingPostalCode: $('billingPostalCode'),
  billingRegion: $('billingRegion'),
  billingCity: $('billingCity'),
  billingAddressLine1: $('billingAddressLine1'),
  billingAddressLine2: $('billingAddressLine2'),
  billingCountry: $('billingCountry'),
  billingCurrency: $('billingCurrency'),
  billingMode: $('billingMode'),
  billingTaxId: $('billingTaxId'),
  billingSubscriptionPlan: $('billingSubscriptionPlan'),
  billingSubscriptionOverageMode: $('billingSubscriptionOverageMode'),
  billingPurchaseOrderRef: $('billingPurchaseOrderRef'),
  billingInvoiceMemo: $('billingInvoiceMemo'),
  billingDueDays: $('billingDueDays'),
  saveBillingSettingsBtn: $('saveBillingSettingsBtn'),
  payoutProviderEnabled: $('payoutProviderEnabled'),
  payoutEntityType: $('payoutEntityType'),
  payoutLegalName: $('payoutLegalName'),
  payoutDisplayName: $('payoutDisplayName'),
  payoutEmail: $('payoutEmail'),
  payoutCountry: $('payoutCountry'),
  payoutCurrency: $('payoutCurrency'),
  payoutSupportEmail: $('payoutSupportEmail'),
  payoutMinimumAmount: $('payoutMinimumAmount'),
  payoutWebsite: $('payoutWebsite'),
  payoutStatementDescriptor: $('payoutStatementDescriptor'),
  payoutNotes: $('payoutNotes'),
  toggleProviderProfileBtn: $('toggleProviderProfileBtn'),
  providerProfilePanel: $('providerProfilePanel'),
  savePayoutSettingsBtn: $('savePayoutSettingsBtn'),
  feedbackSummaryCard: $('feedbackSummaryCard'),
  feedbackTable: $('feedbackTable'),
  feedbackDetail: $('feedbackDetail'),
  conversionSummaryCard: $('conversionSummaryCard'),
  conversionFunnelTable: $('conversionFunnelTable'),
  conversionRecentEvents: $('conversionRecentEvents'),
  chatTranscriptSummaryCard: $('chatTranscriptSummaryCard'),
  chatTranscriptTable: $('chatTranscriptTable'),
  chatTranscriptDetail: $('chatTranscriptDetail'),
  chatTranscriptExpectedHandling: $('chatTranscriptExpectedHandling'),
  chatTranscriptImprovementNote: $('chatTranscriptImprovementNote'),
  chatTranscriptReviewingBtn: $('chatTranscriptReviewingBtn'),
  chatTranscriptFixedBtn: $('chatTranscriptFixedBtn'),
  chatTranscriptIgnoreBtn: $('chatTranscriptIgnoreBtn'),
  chatTranscriptRecent: $('chatTranscriptRecent'),
  chatTrainingExportBtn: $('chatTrainingExportBtn'),
  chatTrainingExportResult: $('chatTrainingExportResult'),
  feedbackReviewingBtn: $('feedbackReviewingBtn'),
  feedbackResolvedBtn: $('feedbackResolvedBtn'),
  feedbackReopenBtn: $('feedbackReopenBtn'),
  feedbackType: $('feedbackType'),
  feedbackEmail: $('feedbackEmail'),
  feedbackTitle: $('feedbackTitle'),
  feedbackMessage: $('feedbackMessage'),
  submitFeedbackBtn: $('submitFeedbackBtn'),
  feedbackSubmitResult: $('feedbackSubmitResult'),
  adminAccessCard: $('adminAccessCard'),
  adminAccountsMetric: $('adminAccountsMetric'),
  adminChatsMetric: $('adminChatsMetric'),
  adminOrdersMetric: $('adminOrdersMetric'),
  adminAgentsMetric: $('adminAgentsMetric'),
  adminIssuesMetric: $('adminIssuesMetric'),
  adminActiveMetric: $('adminActiveMetric'),
  adminDetail: $('adminDetail'),
  adminChatSessionDetail: $('adminChatSessionDetail'),
  adminChatSegmentationCard: $('adminChatSegmentationCard'),
  adminChatFilterNeedsReviewBtn: $('adminChatFilterNeedsReviewBtn'),
  adminChatFilterHandledBtn: $('adminChatFilterHandledBtn'),
  adminChatFilterNonMineBtn: $('adminChatFilterNonMineBtn'),
  adminChatFilterGuestBtn: $('adminChatFilterGuestBtn'),
  adminChatFilterOtherBtn: $('adminChatFilterOtherBtn'),
  adminChatFilterMineBtn: $('adminChatFilterMineBtn'),
  adminChatFilterAllBtn: $('adminChatFilterAllBtn'),
  adminAccountsTable: $('adminAccountsTable'),
  adminOrdersTable: $('adminOrdersTable'),
  adminChatTable: $('adminChatTable'),
  adminAgentsTable: $('adminAgentsTable'),
  adminFeedbackTable: $('adminFeedbackTable'),
  adminEventsTable: $('adminEventsTable'),
  adminAccountsPager: $('adminAccountsPager'),
  adminOrdersPager: $('adminOrdersPager'),
  adminChatPager: $('adminChatPager'),
  adminAgentsPager: $('adminAgentsPager'),
  adminFeedbackPager: $('adminFeedbackPager'),
  adminEventsPager: $('adminEventsPager'),
  planModal: $('planModal'),
  planModalPlan: $('planModalPlan'),
  planModalSummary: $('planModalSummary'),
  confirmPlanModalBtn: $('confirmPlanModalBtn'),
  cancelPlanModalBtn: $('cancelPlanModalBtn'),
  monthlyCustomerTable: $('monthlyCustomerTable'),
  monthlyProviderTable: $('monthlyProviderTable'),
  jobParent: $('jobParent'),
  orderAdvancedPanel: $('orderAdvancedPanel'),
  jobStrategy: $('jobStrategy'),
  jobType: $('jobType'),
  jobAgentSearch: $('jobAgentSearch'),
  jobAgentPicker: $('jobAgentPicker'),
  orderAgentSearchSummary: $('orderAgentSearchSummary'),
  jobPrompt: $('jobPrompt'),
  jobUrls: $('jobUrls'),
  jobFiles: $('jobFiles'),
  jobFilesSummary: $('jobFilesSummary'),
  followupContextCard: $('followupContextCard'),
  jobAgentId: $('jobAgentId'),
  jobBudget: $('jobBudget'),
  jobDeadline: $('jobDeadline'),
  jobMode: $('jobMode'),
  agentRunContext: $('agentRunContext'),
  clearRunAgentBtn: $('clearRunAgentBtn'),
  agentFilterSummary: $('agentFilterSummary'),
  showReadyAgentsBtn: $('showReadyAgentsBtn'),
  showVerifyFailuresBtn: $('showVerifyFailuresBtn'),
  showStaleVerifyBtn: $('showStaleVerifyBtn'),
  showMissingEndpointBtn: $('showMissingEndpointBtn'),
  showTaskMismatchBtn: $('showTaskMismatchBtn'),
  claimAgentId: $('claimAgentId'),
  claimJobId: $('claimJobId'),
  submitOutput: $('submitOutput'),
  claimJobBtn: $('claimJobBtn'),
  submitResultBtn: $('submitResultBtn'),
  retryDispatchBtn: $('retryDispatchBtn'),
  agentActionCard: $('agentActionCard'),
  recheckAgentBtn: $('recheckAgentBtn'),
  useAgentForRunBtn: $('useAgentForRunBtn'),
  copyAgentLinkBtn: $('copyAgentLinkBtn'),
  copyAgentPostBtn: $('copyAgentPostBtn'),
  shareAgentXBtn: $('shareAgentXBtn'),
  deleteAgentBtn: $('deleteAgentBtn'),
  agentPricingMarkup: $('agentPricingMarkup'),
  agentPricingModel: $('agentPricingModel'),
  agentPricingFixedRunUsd: $('agentPricingFixedRunUsd'),
  agentPricingMonthlyUsd: $('agentPricingMonthlyUsd'),
  agentPricingOverageMode: $('agentPricingOverageMode'),
  agentPricingOverageFixedUsd: $('agentPricingOverageFixedUsd'),
  saveAgentPricingBtn: $('saveAgentPricingBtn'),
  agentPricingGuide: $('agentPricingGuide'),
  copyAgentCurlBtn: $('copyAgentCurlBtn'),
  agentRoutingCoverage: $('agentRoutingCoverage')
};

const OPEN_CHAT_ORDER_PROGRESS_POLL_MS = 4000;
const OPEN_CHAT_ORDER_PROGRESS_MAX_POLLS = 300;
const OPEN_CHAT_ACCEPTANCE_PROGRESS_TICK_MS = 1200;
const OPEN_CHAT_DISPATCH_IN_FLIGHT_TTL_MS = 45000;
const LIVE_SNAPSHOT_REFRESH_MS = 5000;
const ORDER_HISTORY_OPTIMISTIC_TTL_MS = 10 * 60 * 1000;

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

let openChatTypingTimer = null;
let liveSnapshotRefreshTimer = null;
let openChatMessageSequence = 0;
let orderComposerInputTimer = null;
const deliveryExecutorPersistTimers = new Map();
const ORDER_COMPOSER_INPUT_DEBOUNCE_MS = 260;

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

function normalizeServerResolvedIntentPrompt(prompt = '') {
  return String(prompt || '').trim();
}

function currentServerResolvedIntentForPrompt(prompt = '') {
  const currentPrompt = normalizeServerResolvedIntentPrompt(prompt);
  const resolved = state.serverResolvedIntent || null;
  if (!resolved || !currentPrompt) return null;
  if (normalizeServerResolvedIntentPrompt(resolved.prompt) !== currentPrompt) return null;
  return resolved;
}

function applyServerResolvedIntent(result = null, prompt = '') {
  const currentPrompt = normalizeServerResolvedIntentPrompt(prompt);
  if (!result || result.kind !== 'order' || !currentPrompt) {
    state.serverResolvedIntent = null;
    return null;
  }
  state.serverResolvedIntent = {
    prompt: currentPrompt,
    taskType: String(result.taskType || '').trim().toLowerCase(),
    strategyHint: String(result.strategyHint || '').trim().toLowerCase(),
    routeHint: String(result.routeHint || '').trim().toLowerCase(),
    reason: String(result.reason || '').trim()
  };
  return state.serverResolvedIntent;
}

function currentServerPreparedOrderForPrompt(prompt = '') {
  const currentPrompt = normalizeServerResolvedIntentPrompt(prompt);
  const prepared = state.serverPreparedOrder || null;
  if (!prepared || !currentPrompt) return null;
  if (normalizeServerResolvedIntentPrompt(prepared.prompt) !== currentPrompt) return null;
  return prepared;
}

function applyServerPreparedOrder(result = null, prompt = '') {
  const currentPrompt = normalizeServerResolvedIntentPrompt(prompt);
  if (!result || !currentPrompt) {
    state.serverPreparedOrder = null;
    return null;
  }
  state.serverPreparedOrder = {
    prompt: currentPrompt,
    taskType: String(result.taskType || '').trim().toLowerCase(),
    requestedOrderStrategy: String(result.requestedOrderStrategy || '').trim().toLowerCase(),
    resolvedOrderStrategy: String(result.resolvedOrderStrategy || '').trim().toLowerCase(),
    routeHint: String(result.routeHint || '').trim().toLowerCase(),
    reason: String(result.reason || '').trim()
  };
  return state.serverPreparedOrder;
}

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

let runtimeRememberedTab = '';
let runtimeRememberedAuth = false;
function loadPersistedDeliveryActionDrafts(force = false) {
  const auth = state.snapshot?.auth || {};
  const scope = String(auth?.login || auth?.user?.login || visitorId()).trim().toLowerCase();
  if (!force && state.deliveryActionDraftsScope === scope && state.deliveryPublishDraftsScope === scope) return;
  state.deliveryPublishDrafts = {};
  state.deliveryActionDrafts = {};
  state.deliveryPublishDraftsScope = scope;
  state.deliveryActionDraftsScope = scope;
}

function persistDeliveryActionDrafts() {
  const auth = state.snapshot?.auth || {};
  const scope = String(auth?.login || auth?.user?.login || visitorId()).trim().toLowerCase();
  state.deliveryPublishDraftsScope = scope;
  state.deliveryActionDraftsScope = scope;
}

async function persistGenericDeliverableDraft(jobId = '', immediate = false) {
  const key = String(jobId || '').trim();
  if (!key) return;
  const draft = state.deliveryActionDrafts?.[key];
  if (!draft || typeof draft !== 'object') return;
  const save = async () => {
    deliveryExecutorPersistTimers.delete(key);
    try {
      const result = await api(`/api/jobs/${encodeURIComponent(key)}/executor-state`, {
        method: 'PATCH',
        body: JSON.stringify(draft)
      });
      if (result?.job) mergeProgressJobIntoSnapshot(result.job);
    } catch {
      // keep local draft; server sync can be retried by later edits or refresh
    }
  };
  if (immediate) {
    const pending = deliveryExecutorPersistTimers.get(key);
    if (pending) window.clearTimeout(pending);
    deliveryExecutorPersistTimers.delete(key);
    await save();
    return;
  }
  const existing = deliveryExecutorPersistTimers.get(key);
  if (existing) window.clearTimeout(existing);
  const timer = window.setTimeout(() => { void save(); }, 350);
  deliveryExecutorPersistTimers.set(key, timer);
}

async function persistDeliveryPublishDraft(jobId = '', immediate = false) {
  const key = String(jobId || '').trim();
  if (!key) return;
  const draft = state.deliveryPublishDrafts?.[key];
  if (!draft || typeof draft !== 'object') return;
  const timerKey = `publish:${key}`;
  const save = async () => {
    deliveryExecutorPersistTimers.delete(timerKey);
    try {
      const result = await api(`/api/jobs/${encodeURIComponent(key)}/executor-state`, {
        method: 'PATCH',
        body: JSON.stringify({
          publishTarget: String(draft.target || '').trim(),
          publishPathPrefix: String(draft.pathPrefix || '').trim(),
          publishSlug: String(draft.slug || '').trim(),
          publishMode: String(draft.publishMode || '').trim()
        })
      });
      if (result?.job) mergeProgressJobIntoSnapshot(result.job);
    } catch {
      // keep local draft; server sync can be retried by later edits or refresh
    }
  };
  const existingTimer = deliveryExecutorPersistTimers.get(timerKey);
  if (existingTimer) window.clearTimeout(existingTimer);
  if (immediate) {
    await save();
    return;
  }
  const timer = window.setTimeout(save, 260);
  deliveryExecutorPersistTimers.set(timerKey, timer);
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
      '初回ログインで10ドル分の無料枠が付与されるので、その範囲で最初のトライアル実行ができます。'
    ].join('\n');
  }
  return [
    'Dispatch requires sign-in.',
    'First-time sign-in grants $10 in credits, so you can use those credits for the first trial run.'
  ].join('\n');
}

async function maybeClaimGuestTrialCredits(auth = state.snapshot?.auth || {}) {
  return null;
}

async function resolveWorkIntentViaApi(prompt = '') {
  const text = String(prompt || '').trim();
  if (!text || isStructuredOrderBrief(text)) return null;
  try {
    const result = await api('/api/work/resolve-intent', {
      method: 'POST',
      body: JSON.stringify({ prompt: text })
    });
    return result?.kind ? result : null;
  } catch {
    return null;
  }
}

async function prepareWorkOrderViaApi(prompt = '', requestedStrategy = 'auto', options = {}) {
  const text = String(prompt || '').trim();
  if (!text || isStructuredOrderBrief(text)) return null;
  const inputCounts = options.inputCounts || options.input_counts || {};
  try {
    const result = await api('/api/work/prepare-order', {
      method: 'POST',
      body: JSON.stringify({
        prompt: text,
        requestedStrategy: String(requestedStrategy || 'auto').trim().toLowerCase(),
        ...(options.taskType || options.task_type ? { task_type: String(options.taskType || options.task_type || '').trim() } : {}),
        ...(options.intakeAnswered === true || options.intake_answered === true ? { intake_answered: true } : {}),
        input_counts: {
          url_count: Number(inputCounts.urlCount || inputCounts.url_count || 0),
          file_count: Number(inputCounts.fileCount || inputCounts.file_count || 0),
          file_chars: Number(inputCounts.fileChars || inputCounts.file_chars || 0)
        },
        ...(Array.isArray(options.conversationContext || options.conversation_context)
          ? { conversation_context: options.conversationContext || options.conversation_context }
          : {})
      })
    });
    return result?.taskType ? result : null;
  } catch (error) {
    const data = error?.data && typeof error.data === 'object' ? error.data : {};
    if (/openai_intent|intent/i.test(String(data.code || data.error || error?.message || ''))) {
      return {
        ok: false,
        status: 'intent_failed',
        code: String(data.code || 'openai_intent_failed'),
        error: String(data.error || error?.message || 'OpenAI intent classification failed.'),
        source: String(data.source || 'openai')
      };
    }
    return null;
  }
}

function preparedOrderBriefFromServer(result = {}, fallbackPrompt = '') {
  return String(result?.orderBrief || result?.order_brief || result?.preparedBrief || result?.prepared_brief || fallbackPrompt || '').trim();
}

function serverIntakeAnswerFromPreparedOrder(result = {}, prompt = '') {
  const questions = normalizeOpenChatDynamicLeaderIntakeQuestions(result.questions || result.intake?.questions || []);
  if (!questions.length) return null;
  const taskType = openChatNormalizeLeaderIntakeTask(result.inferred_task_type || result.taskType || result.task_type || '') || result.taskType || 'research';
  const ja = looksJapanese(prompt);
  return {
    kind: 'clarify',
    tone: 'warn',
    patternId: 'pattern_server_leader_intake_contract',
    responseSource: result.source || 'server_contract',
    suppressTrio: true,
    leaderIntakePrompt: String(prompt || result.prompt || '').trim(),
    leaderIntakeTask: String(taskType || '').trim(),
    body: [
      result.message || (ja
        ? 'チームリーダーが動く前に、agent側のintake契約から確認が返りました。'
        : 'The agent-side intake contract needs a few details before dispatch.'),
      '',
      ...questions.map((question, index) => `${index + 1}. ${question}`),
      '',
      ja
        ? 'まだ実行も課金もしていません。回答後、サーバー側の契約で注文内容を整えます。'
        : 'Nothing has run or been billed. After you answer, the server-side contract will prepare the order.'
    ].filter(Boolean).join('\n'),
    status: 'Need agent-owned intake before SEND ORDER.\n\nNo order was created and no billing occurred.'
  };
}

function serverPreparedOrderAnswerFromResult(result = {}, sourcePrompt = '', options = {}) {
  const nextPrompt = preparedOrderBriefFromServer(result, sourcePrompt);
  if (!nextPrompt) return null;
  const ja = looksJapanese(sourcePrompt);
  return {
    kind: 'assist',
    tone: 'ok',
    patternId: 'pattern_server_prepared_order_contract',
    responseSource: result.source || 'server_contract',
    nextPrompt,
    exposeNextPrompt: false,
    clearLeaderIntake: true,
    clearClarifyOptions: true,
    skipOpenAiPolish: true,
    body: ja
      ? [
          options.followup ? '回答を反映しました。同じ質問は繰り返しません。' : 'agent/server側の契約で注文内容を準備しました。',
          '',
          '内容が合っていれば、このまま SEND ORDER できます。',
          '',
          `ルート: ${result.resolvedOrderStrategy === 'multi' ? 'Leader Agent' : 'Specialist Agent'}`,
          result.reason ? `理由: ${result.reason}` : '',
          '',
          'まだ実行も課金もしていません。'
        ].filter(Boolean).join('\n')
      : [
          options.followup ? 'I merged your answer and will not repeat the same questions.' : 'The agent/server-side contract prepared this order.',
          '',
          'If this looks right, you can SEND ORDER now.',
          '',
          `Route: ${result.resolvedOrderStrategy === 'multi' ? 'Leader Agent' : 'Specialist Agent'}`,
          result.reason ? `Reason: ${result.reason}` : '',
          '',
          'Nothing has run or been billed yet.'
        ].filter(Boolean).join('\n'),
    status: 'Draft prepared by server contract. Ready for SEND ORDER.'
  };
}

async function buildOpenChatServerLeaderIntakeAnswer(prompt = '', inputCounts = {}, draft = {}) {
  const text = String(prompt || '').trim();
  if (!text || isStructuredOrderBrief(text)) return null;
  const pending = openChatPendingLeaderIntakeContext();
  const taskType = pending?.taskType
    || openChatImplicitLeaderIntakeTask(text)
    || openChatNormalizeLeaderIntakeTask(currentRoutingTask())
    || '';
  if (!taskType) return null;
  const sourcePrompt = pending ? combinedLeaderIntakePrompt(pending.prompt, text) : text;
  const prepared = await prepareWorkOrderViaApi(sourcePrompt, requestedOrderStrategy(), {
    taskType,
    intakeAnswered: Boolean(pending),
    inputCounts,
    conversationContext: openChatConversationContextForLlm()
  });
  if (!prepared) return null;
  if (chatEngineIsNeedsInputResponse(prepared)) {
    handleNeedsInputResponse(prepared, {
      ...draft,
      prompt: text,
      task_type: prepared.inferred_task_type || prepared.taskType || taskType
    });
    return serverIntakeAnswerFromPreparedOrder(prepared, text);
  }
  if (pending || openChatIsLeaderIntakeTask(prepared.taskType || taskType)) {
    applyServerPreparedOrder(prepared, sourcePrompt);
    return serverPreparedOrderAnswerFromResult(prepared, sourcePrompt, { followup: Boolean(pending) });
  }
  return null;
}

async function preflightWorkOrderViaApi(draft = {}) {
  const prompt = String(draft?.prompt || '').trim();
  if (!prompt) return null;
  try {
    return await api('/api/work/preflight-order', {
      method: 'POST',
      body: JSON.stringify({
        ...apiPayloadFromOrderDraft(draft),
        prompt,
        task_type: draft.task_type || '',
        order_strategy: draft.order_strategy || 'auto',
        resolved_order_strategy: draft.resolved_order_strategy || ''
      })
    });
  } catch (error) {
    return error?.data && typeof error.data === 'object'
      ? { ...error.data, ok: false }
      : null;
  }
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

function safeText(el, value) {
  if (!el) return;
  el.textContent = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
}

function renderSummaryRows(el, rows = []) {
  if (!el) return;
  el.innerHTML = rows.map((row) => `
    <div class="summary-row">
      <span class="summary-label">${escapeHtml(row.label)}</span>
      <strong class="summary-value">${escapeHtml(row.value)}</strong>
    </div>
  `).join('');
}

function formatTime(value) {
  return value ? new Date(value).toLocaleString('ja-JP') : '-';
}

function orderApiBaseUrl() {
  return `${window.location.origin}/api/jobs`;
}

const AUTO_WORKFLOW_SUPPORT_TASKS = new Set(['research', 'summary', 'debug', 'automation']);

function isAutoWorkflowSpecialtyTask(taskType = '') {
  const task = String(taskType || '').trim().toLowerCase();
  return Boolean(task && !AUTO_WORKFLOW_SUPPORT_TASKS.has(task));
}

function currentOrderStrategy() {
  const configured = requestedOrderStrategy();
  if (configured === 'single' || configured === 'multi') return configured;
  return orderRoutingDecision().strategy;
}

function requestedOrderStrategy() {
  const configured = String(els.jobStrategy?.value || 'auto').trim().toLowerCase();
  return configured === 'single' || configured === 'multi' ? configured : 'auto';
}

function orderStrategyLabel() {
  const requested = requestedOrderStrategy();
  const resolved = currentOrderStrategy();
  const label = resolved === 'multi' ? 'LEADER' : 'SPECIALIST';
  if (requested === 'auto') return `AUTO (${label})`;
  return label;
}

function setOrderStrategyChoice(value = 'auto') {
  const normalized = ['single', 'multi'].includes(String(value || '').trim().toLowerCase())
    ? String(value || '').trim().toLowerCase()
    : 'auto';
  if (els.jobStrategy) els.jobStrategy.value = normalized;
  if (normalized === 'multi' && els.jobAgentId?.value) {
    els.jobAgentId.value = '';
    flash('Pinned agent cleared. Leader Agent routing needs room to choose or coordinate specialists.', 'info');
  }
  if (els.executionChoiceMenu) els.executionChoiceMenu.open = false;
  void trackConversionEvent('draft_order_created', {
    source: 'execution_choice',
    orderStrategy: normalized,
    resolvedStrategy: orderRoutingDecision(currentRoutingTask() || 'research', String(els.jobPrompt?.value || ''), normalized).strategy,
    taskType: currentRoutingTask() || 'research'
  });
  renderOrderComposer();
}

function estimateForRoutingDecision(decision, taskType = currentRoutingTask() || 'research') {
  if (!decision || decision.strategy !== 'multi') {
    const agent = currentRunTargetAgent()
      || (state.snapshot?.agents || []).find((item) => agentHealth(item).ready && agentTaskFit(item, taskType).matches)
      || null;
    const estimate = estimateWindowOfAgent(agent, taskType);
    return estimate ? { min: estimate.estimateMinTotal, max: estimate.estimateMaxTotal, agents: agent ? [agent] : [] } : null;
  }
  const picks = decision.plan?.picks || [];
  if (picks.length < 2) return null;
  const total = picks.reduce((acc, item) => {
    const estimate = estimateWindowOfAgent(item.agent, item.taskType);
    acc.min += Number(estimate?.estimateMinTotal || 0);
    acc.max += Number(estimate?.estimateMaxTotal || 0);
    acc.agents.push(item.agent);
    return acc;
  }, { min: 0, max: 0, agents: [] });
  return total.max > 0 ? total : null;
}

function formatEstimateBrief(estimate) {
  return estimate?.max > 0 ? `${yen(estimate.min)} - ${yen(estimate.max)}` : 'not enough ready agents';
}

function renderOrderStrategyControls() {
  const requested = requestedOrderStrategy();
  const taskType = currentRoutingTask() || 'research';
  const prompt = String(els.jobPrompt?.value || '').trim();
  const autoDecision = orderRoutingDecision(taskType, prompt, 'auto');
  const singleDecision = orderRoutingDecision(taskType, prompt, 'single');
  const teamDecision = orderRoutingDecision(taskType, prompt, 'multi');
  const activeDecision = orderRoutingDecision(taskType, prompt, requested);
  const singleEstimate = estimateForRoutingDecision(singleDecision, taskType);
  const teamEstimate = estimateForRoutingDecision(teamDecision, taskType);
  const activeLabel = requested === 'multi'
    ? 'Leader Agent'
    : requested === 'single'
    ? 'Specialist Agent'
    : `Auto -> ${autoDecision.strategy === 'multi' ? 'Leader Agent' : 'Specialist Agent'}`;
  renderOrderStrategyControlsElement(els, {
    requested,
    prompt,
    activeLabel,
    activeReason: activeDecision.reason,
    singleEstimateLabel: formatEstimateBrief(singleEstimate),
    teamEstimateLabel: formatEstimateBrief(teamEstimate),
    teamCount: teamDecision.plan?.picks?.length || 0
  });
}

function plannedMultiAgents(taskType = currentRoutingTask(), prompt = String(els.jobPrompt?.value || ''), options = {}) {
  const agents = (state.snapshot?.agents || []).filter((agent) => agentHealth(agent).ready);
  const plannedTasks = options.strategyProbe
    ? inferPrimaryTaskSequence(taskType, prompt)
    : inferClientTaskSequence(taskType, prompt);
  const picks = [];
  const used = new Set();
  for (const plannedTask of plannedTasks) {
    const picked = agents
      .map((agent) => ({ agent, match: clientTaskMatch(agent, plannedTask) }))
      .filter((item) => !used.has(item.agent.id) && item.match.matches)
      .sort((left, right) => (
        agentRoutingScore(right.agent, plannedTask) - agentRoutingScore(left.agent, plannedTask)
        || Number(right.match.exact) - Number(left.match.exact)
        || Number(right.match.compatibility || 0) - Number(left.match.compatibility || 0)
        || String(left.agent.name || left.agent.id || '').localeCompare(String(right.agent.name || right.agent.id || ''))
      ))[0] || null;
    if (!picked) continue;
    used.add(picked.agent.id);
    picks.push({
      taskType: plannedTask,
      dispatchTaskType: picked.match.taskType || plannedTask,
      agent: picked.agent,
      matchKind: picked.match.matchKind || 'exact'
    });
  }
  return { plannedTasks, picks };
}

function isRepoBackedCodeOrderIntent(taskType = '', prompt = '') {
  const task = String(taskType || '').trim().toLowerCase();
  const text = openChatIntentMatchText(prompt);
  const codeTask = ['code', 'debug', 'ops', 'automation'].includes(task);
  const repoIntent = /(\b(?:github|git hub|repo|repository|pull request|pr|branch|commit|diff|issue|bug|debug|fix)\b|修正|直して|デバッグ|リポジトリ|プルリク|ブランチ|コミット|差分)/i.test(text);
  return codeTask && repoIntent;
}

function orderRoutingDecision(taskType = currentRoutingTask(), prompt = String(els.jobPrompt?.value || ''), requested = requestedOrderStrategy()) {
  const strategy = requested === 'single' || requested === 'multi' ? requested : 'auto';
  const plan = plannedMultiAgents(taskType, prompt, { strategyProbe: strategy !== 'multi' });
  const resolvedIntent = currentServerResolvedIntentForPrompt(prompt);
  if (strategy === 'single') {
    return { strategy: 'single', requested, plan, reason: 'Single-agent routing was selected.' };
  }
  if (strategy === 'multi') {
    return { strategy: 'multi', requested, plan, reason: 'Multi-agent routing was explicitly selected.' };
  }
  if ((resolvedIntent?.strategyHint === 'single' && resolvedIntent?.routeHint) || isRepoBackedCodeOrderIntent(taskType, prompt) || isRepoBackedCodeIntentText(prompt, taskType)) {
    return {
      strategy: 'single',
      requested,
      plan,
      routeHint: resolvedIntent?.routeHint || 'single_agent_code',
      reason: resolvedIntent?.reason || `${PRODUCT_SHORT_NAME} keeps repo-backed coding as a single-agent order unless multi-agent routing is explicitly selected.`
    };
  }
  if (resolvedIntent?.strategyHint === 'multi' && resolvedIntent?.routeHint) {
    return {
      strategy: 'multi',
      requested,
      plan,
      routeHint: resolvedIntent.routeHint,
      reason: resolvedIntent.reason || `${PRODUCT_SHORT_NAME} will use leader/team routing for this request.`
    };
  }
  const plannedSpecialties = new Set(plan.plannedTasks.filter(isAutoWorkflowSpecialtyTask));
  const assignedSpecialties = new Set(plan.picks
    .filter((item) => isAutoWorkflowSpecialtyTask(item.taskType))
    .map((item) => item.taskType));
  const shouldUseMulti = plannedSpecialties.size >= 2 && assignedSpecialties.size >= 2 && plan.picks.length >= 2;
  return {
    strategy: shouldUseMulti ? 'multi' : 'single',
    requested,
    plan,
    plannedSpecialties: [...plannedSpecialties],
    assignedSpecialties: [...assignedSpecialties],
    reason: shouldUseMulti
      ? `${PRODUCT_SHORT_NAME} detected multiple specialties: ${[...assignedSpecialties].join(', ')}.`
      : `${PRODUCT_SHORT_NAME} will keep this as a single-agent order unless the request clearly needs multiple specialties.`
  };
}

function formatOrderApiCommand(token = '<CAIT_API_KEY>') {
  return [
    `curl.exe -X POST ${orderApiBaseUrl()} ^`,
    '  -H "content-type: application/json" ^',
    `  -H "authorization: Bearer ${token}" ^`,
    '  -d "{\\"parent_agent_id\\":\\"cloudcode-main\\",\\"task_type\\":\\"research\\",\\"prompt\\":\\"Compare support options for used iPhone repairs\\"}"',
    '',
    '# Follow up on a delivery with followup_to_job_id',
    `curl.exe -X POST ${orderApiBaseUrl()} ^`,
    '  -H "content-type: application/json" ^',
    `  -H "authorization: Bearer ${token}" ^`,
    '  -d "{\\"parent_agent_id\\":\\"cloudcode-main\\",\\"task_type\\":\\"research\\",\\"followup_to_job_id\\":\\"<PREVIOUS_JOB_ID>\\",\\"prompt\\":\\"Answers: deliver as Markdown and focus on Japan.\\"}"',
    '',
    '# Vague requests return status=needs_input before billing. Resubmit with answers before billing or dispatch.'
  ].join('\n');
}

function formatAgentApiCommand(token = '<CAIT_API_KEY>') {
  return [
    `curl.exe -X POST ${window.location.origin}/api/agents/import-manifest ^`,
    '  -H "content-type: application/json" ^',
    `  -H "authorization: Bearer ${token}" ^`,
    '  -d "{\\"manifest\\":{\\"schema_version\\":\\"agent-manifest/v1\\",\\"name\\":\\"my_agent\\",\\"task_types\\":[\\"research\\"],\\"pricing\\":{\\"provider_markup_rate\\":0.1,\\"token_markup_rate\\":0.1,\\"platform_margin_rate\\":0.1},\\"usage_contract\\":{\\"report_input_tokens\\":true,\\"report_output_tokens\\":true,\\"report_model\\":true,\\"report_external_api_cost\\":true},\\"healthcheck_url\\":\\"https://example.com/api/health\\",\\"job_endpoint\\":\\"https://example.com/api/jobs\\"}}"'
  ].join('\n');
}

function clipText(value, max = 96) {
  const text = String(value || '').trim();
  if (!text) return '-';
  return text.length > max ? `${text.slice(0, Math.max(0, max - 1)).trimEnd()}…` : text;
}

function currentMonthPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function hasLinkedProvider(auth, providerPrefix) {
  const providers = Array.isArray(auth?.linkedProviders) ? auth.linkedProviders : [];
  return providers.some((value) => String(value || '').toLowerCase().startsWith(String(providerPrefix || '').toLowerCase()));
}

function canOrderFromBrowser(auth) {
  return Boolean(auth?.openWriteApiEnabled || auth?.canOrder || auth?.loggedIn);
}

function canManagePaymentsFromBrowser(auth) {
  return Boolean(auth?.openWriteApiEnabled || auth?.canManagePayments || auth?.loggedIn);
}

function canManageAgentsFromBrowser(auth) {
  return Boolean(auth?.openWriteApiEnabled || auth?.canRegisterAgents);
}

function canUseGithubAgentFlow(auth) {
  return Boolean(auth?.openWriteApiEnabled || auth?.canUseGithubAgentFlow || auth?.githubLinked || hasLinkedProvider(auth, 'github'));
}

function canManagePayoutsFromBrowser(auth) {
  return Boolean(auth?.openWriteApiEnabled || auth?.canManagePayouts);
}

function isGithubLinked(auth) {
  return Boolean(auth?.githubLinked || hasLinkedProvider(auth, 'github'));
}

function isGoogleLinked(auth) {
  return Boolean(auth?.googleLinked || hasLinkedProvider(auth, 'google'));
}

function isGithubAuthorized(auth) {
  return Boolean(auth?.githubAuthorized || auth?.canUseGithubAgentFlow || auth?.authProvider === 'github-app' || auth?.authProvider === 'github-oauth');
}

function isGoogleAuthorized(auth) {
  return Boolean(auth?.googleAuthorized || auth?.authProvider === 'google-oauth');
}

function primarySignInUrl(auth = state.snapshot?.auth || {}) {
  if (auth?.googleConfigured) return '/auth/google';
  if (auth?.githubConfigured || auth?.githubAppConfigured) return '/auth/github';
  return '/auth/github';
}

function googleAuthActionUrl(auth = state.snapshot?.auth || {}, options = {}) {
  if (!auth?.loggedIn) return '/auth/google';
  const capabilities = Array.isArray(options.capabilities)
    ? options.capabilities
    : String(options.capabilities || '').split(/[,\s]+/).filter(Boolean);
  const url = new URL('/auth/google', window.location.origin);
  url.searchParams.set('action', 'analytics_connect');
  url.searchParams.set('return_to', '/chat');
  url.searchParams.set('login_source', 'connect_google');
  const requested = capabilities.length ? capabilities : [];
  if (requested.length) url.searchParams.set('capabilities', requested.join(','));
  return `${url.pathname}${url.search}`;
}

function githubAuthActionUrl(auth = state.snapshot?.auth || {}) {
  return auth?.loggedIn ? '/auth/github?mode=link' : '/auth/github';
}

function linkedProvidersLabel(auth = {}) {
  const providers = [];
  if (hasLinkedProvider(auth, 'google')) providers.push('google');
  if (hasLinkedProvider(auth, 'github-app')) providers.push('github-app');
  else if (hasLinkedProvider(auth, 'github')) providers.push('github');
  return providers.length ? providers.join(', ') : '-';
}

function isLikelyRestrictedGoogleOAuthBrowser() {
  const ua = String(window.navigator.userAgent || '').toLowerCase();
  if (!ua) return false;
  return [
    ' fban/',
    ' fbav/',
    'instagram',
    'line/',
    'micromessenger',
    '; wv',
    'electron',
    'producthunt',
    'twitter',
    'x-webview'
  ].some((token) => ua.includes(token.trim()));
}

function googleOAuthBrowserWarning() {
  return 'Google sign-in may be blocked in this in-app browser. If Google shows a security warning, open aiagent-marketplace.net in Chrome, Edge, or Safari and sign in there.';
}

function canUseDevApi(auth) {
  return Boolean(auth?.devApiEnabled);
}

function activeApiKeys(list = []) {
  return (Array.isArray(list) ? list : []).filter((item) => !item?.revokedAt);
}

function setButtonAccess(el, enabled) {
  if (!el) return;
  el.disabled = !enabled;
}

function setElementVisible(el, visible) {
  if (!el) return;
  el.hidden = !visible;
}

function temporaryInvoiceNoticeLines(kind = 'payment') {
  const target = String(kind || 'payment').trim().toLowerCase();
  const label = target === 'plan' ? 'plan invoice' : (target === 'payout' ? 'manual payout' : 'billing invoice');
  return [
    `Temporary ${label} notice: hosted payment checkout is paused.`,
    `For now, request ${label === 'manual payout' ? 'manual payout handling' : 'an invoice/manual payment'}.`,
    label === 'manual payout'
      ? `Support will confirm provider payout details at ${TEMPORARY_INVOICE_SUPPORT_EMAIL}.`
      : `CAIt will confirm billing manually after payment confirmation.`,
    `Support: ${TEMPORARY_INVOICE_SUPPORT_EMAIL}`
  ];
}

function temporaryInvoiceRequestEmail() {
  return String(
    els.billingEmail?.value
    || state.snapshot?.auth?.user?.email
    || state.snapshot?.accountSettings?.billing?.billingEmail
    || ''
  ).trim();
}

function temporaryInvoiceAccountLabel() {
  const auth = state.snapshot?.auth || {};
  return String(
    auth.accountLogin
    || auth.user?.login
    || auth.user?.email
    || 'unknown account'
  ).trim();
}

async function submitTemporaryInvoiceRequest(options = {}) {
  const kind = String(options.kind || 'payment').trim().toLowerCase();
  const plan = String(options.plan || '').trim().toLowerCase();
  const context = String(options.context || state.currentTab || 'settings').trim().toLowerCase();
  const amount = Number(options.amount || 0);
  const amountLine = amount > 0 ? formatDisplayCurrency(amount) : '-';
  const email = temporaryInvoiceRequestEmail();
  const title = `${PRODUCT_NAME} temporary ${kind === 'payout' ? 'manual payout' : (kind === 'plan' ? 'plan invoice' : 'invoice')} request`;
  const message = [
    title,
    '',
    `Account: ${temporaryInvoiceAccountLabel()}`,
    email ? `Billing email: ${email}` : 'Billing email: not provided',
    `Kind: ${kind || 'payment'}`,
    plan ? `Plan: ${plan}` : '',
    `Amount: ${amountLine}`,
    `Context: ${context || '-'}`,
    `Page: ${window.location.pathname || '/'}`,
    '',
    kind === 'payout'
      ? 'Automated provider payouts are temporarily paused. Please review provider earnings and arrange manual payout follow-up.'
      : 'Hosted checkout is temporarily paused. Please issue/manual-confirm the invoice and add credits after payment confirmation.'
  ].filter(Boolean).join('\n');
  const result = await api('/api/feedback', {
    method: 'POST',
    body: JSON.stringify({
      type: 'question',
      email,
      title,
      message,
      page_path: window.location.pathname || '/',
      current_tab: state.currentTab || '',
      source: 'temporary_invoice_billing',
      context: {
        extra: {
          kind,
          plan,
          amount_usd: amount > 0 ? amount : 0,
          billing_context: context
        }
      }
    })
  });
  const lines = [
    kind === 'payout' ? 'Manual payout request saved.' : 'Invoice request saved.',
    `Kind: ${kind || 'payment'}`,
    plan ? `Plan: ${plan}` : '',
    amount > 0 ? `Amount: ${amountLine}` : '',
    `Email: ${result.email_forwarded ? `forwarded to ${TEMPORARY_INVOICE_SUPPORT_EMAIL}` : `not forwarded (${result.email_status || 'not_configured'})`}`,
    kind === 'payout'
      ? 'This is a temporary manual payout flow while automated payouts are paused.'
      : 'This is a temporary manual billing flow while hosted checkout is paused.',
    kind === 'payout'
      ? 'Support will follow up about payout handling.'
      : 'Billing is confirmed manually after payment confirmation.'
  ].filter(Boolean);
  safeText(kind === 'payout' ? els.stripeProviderActionResult : els.stripeCustomerActionResult, lines.join('\n'));
  flash(kind === 'payout' ? 'Manual payout request saved. Support will follow up.' : 'Invoice request saved. Support will follow up manually.', 'ok');
  void trackConversionEvent('invoice_request_submitted', {
    source: context || 'settings',
    status: result.report?.status || 'open',
    mode: kind || 'payment',
    promptChars: message.length
  });
  return result;
}

function openPlanModal() {
  if (!els.planModal) return;
  state.planIntentArmed = true;
  const selectedPlan = String(els.billingSubscriptionPlan?.value || '').trim().toLowerCase();
  const nextPlan = selectedPlan && selectedPlan !== 'none' ? selectedPlan : 'starter';
  if (els.planModalPlan) {
    els.planModalPlan.value = nextPlan;
  }
  renderPlanModalSummary();
  setElementVisible(els.planModal, true);
  window.requestAnimationFrame(() => els.planModalPlan?.focus());
}

function closePlanModal() {
  state.planIntentArmed = false;
  setElementVisible(els.planModal, false);
}

function currentApiKeyRevealToken() {
  return String(els.apiKeyRevealToken?.value || state.lastIssuedOrderApiKey?.token || '').trim();
}

function selectApiKeyRevealToken() {
  if (!els.apiKeyRevealToken) return;
  els.apiKeyRevealToken.focus();
  els.apiKeyRevealToken.select();
}

function showApiKeyRevealResult(message = '') {
  safeText(els.apiKeyRevealResult, message || 'Copy the key, then paste it into Codex, CLI, or your server secret store.');
}

function openApiKeyRevealModal(issued = null) {
  const token = String(issued?.token || '').trim();
  if (!token || !els.apiKeyRevealModal || !els.apiKeyRevealToken) return;
  els.apiKeyRevealToken.value = token;
  showApiKeyRevealResult([
    'Copy this key now.',
    `Label: ${issued.label || '-'}`,
    `Prefix: ${issued.prefix || token.slice(0, 16)}...`,
    '',
    'Close this popup only after the key is saved. CAIt cannot show the raw secret again.'
  ].join('\n'));
  setElementVisible(els.apiKeyRevealModal, true);
  window.requestAnimationFrame(() => selectApiKeyRevealToken());
}

function forgetLastIssuedApiKeySecret() {
  if (!state.lastIssuedOrderApiKey?.token) return;
  state.lastIssuedOrderApiKey = {
    ...state.lastIssuedOrderApiKey,
    token: ''
  };
}

function closeApiKeyRevealModal() {
  if (els.apiKeyRevealToken) els.apiKeyRevealToken.value = '';
  setElementVisible(els.apiKeyRevealModal, false);
  forgetLastIssuedApiKeySecret();
  renderOrderApiKeys(state.snapshot?.accountSettings, state.snapshot?.auth);
  renderConnectFlow();
}

async function copyApiKeyRevealValue(kind = 'token') {
  const token = currentApiKeyRevealToken();
  if (!token) {
    showApiKeyRevealResult('No raw key is available in this popup. Issue a new key if you closed the one-time reveal.');
    flash('No raw key available. Issue a new CAIt API key.', 'error');
    return;
  }
  const text = kind === 'header'
    ? `Authorization: Bearer ${token}`
    : kind === 'curl'
      ? formatOrderApiCommand(token)
      : token;
  const label = kind === 'header'
    ? 'Authorization header copied.'
    : kind === 'curl'
      ? 'CAIt API curl command copied.'
      : 'CAIt API key copied.';
  await copyTextToClipboard(text, label);
  showApiKeyRevealResult([
    label,
    '',
    'Paste it into Codex, CLI, or your server secret store now.',
    'After closing this popup, CAIt will only show the key prefix.'
  ].join('\n'));
  selectApiKeyRevealToken();
}

function renderPlanModalSummary() {
  if (!els.planModalSummary) return;
  const plan = String(els.planModalPlan?.value || '').trim().toLowerCase();
  const label = subscriptionPlanLabel(plan);
  if (TEMPORARY_INVOICE_BILLING_ENABLED) {
    safeText(els.planModalSummary, [
      `Selected plan: ${label}`,
      ...temporaryInvoiceNoticeLines('plan'),
      'The plan activation will be handled manually after invoice payment confirmation.'
    ].join('\n'));
    return;
  }
  safeText(els.planModalSummary, [
    `Selected plan: ${label}`,
    'Stripe Checkout opens in a new tab.',
    'When payment is confirmed, the recurring plan becomes active for each billing cycle.',
    'The plan can cover managed sample agent work without separate buyer-side model API contracts.'
  ].join('\n'));
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

function scheduledWorkTimeLabel(value = '') {
  if (!Number.isFinite(Date.parse(value))) return 'not scheduled';
  return new Date(value).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function scheduledWorkScheduleLabel(schedule = {}) {
  const interval = String(schedule?.interval || 'daily').toLowerCase();
  if (interval === 'hourly') {
    const every = Math.max(1, Number(schedule?.every || 1));
    return every === 1 ? 'Hourly' : `Every ${every} hours`;
  }
  if (interval === 'weekly') {
    const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][Number(schedule?.weekday || 1)] || 'Mon';
    return `Weekly ${weekday} ${schedule?.time || '09:00'}`;
  }
  return `Daily ${schedule?.time || '09:00'}`;
}

function selectedScheduledWorkOptions() {
  const interval = String(els.scheduledWorkInterval?.value || 'daily').trim() || 'daily';
  return {
    interval,
    time: String(els.scheduledWorkTime?.value || '09:00').trim() || '09:00',
    weekday: Number(els.scheduledWorkWeekday?.value || 1),
    every: Math.max(1, Math.min(168, Number(els.scheduledWorkEvery?.value || 1) || 1)),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Tokyo'
  };
}

function renderScheduledWorkControls() {
  updateScheduledWorkControls(els, els.scheduledWorkInterval?.value || 'daily');
}

function renderScheduledWorkList(recurringOrders = []) {
  renderScheduledWorkControls();
  const auth = state.snapshot?.auth || {};
  renderScheduledWorkListElement(els, recurringOrders, {
    canOrder: canOrderFromBrowser(auth),
    scheduleLabel: (schedule) => scheduledWorkScheduleLabel(schedule),
    timeLabel: (value) => scheduledWorkTimeLabel(value),
    onToggle: (button, id) => runAction(button, async () => {
      await toggleScheduledWork(id);
    }),
    onDelete: (button, id) => runAction(button, async () => {
      await deleteScheduledWork(id);
    })
  });
}

function scheduledWorkById(id = '') {
  return (state.snapshot?.recurringOrders || []).find((order) => String(order.id || '') === String(id || '')) || null;
}

async function scheduleCurrentOrderDraft() {
  const draft = currentOrderDraft();
  const inputCounts = orderInputCounts(draft.input || null);
  if (shouldPrepareOrderBeforeDispatch(draft)) {
    const prepPrompt = draft.prompt || fallbackPromptFromOrderInput(draft.input || null);
    const prepAnswer = buildOpenChatImplicitOrderPrepAnswer(prepPrompt, inputCounts, {
      sourceOnly: !String(draft.prompt || '').trim()
    });
    appendOrderChatExchange(prepPrompt, {
      ...prepAnswer,
      status: 'Draft prepared for scheduling.\n\nReview the brief, then press SCHEDULE DRAFT. No order was created and no billing occurred.'
    });
    flash('Draft prepared. Review it, then schedule it from the left panel.', 'info');
    return;
  }
  try {
    validateOrderDraft(draft, { checkAccess: true, checkFunding: false, allowGuestTrial: false });
  } catch (error) {
    if (handleOrderPreflightPrompt(error, draft, { analytics: summarizeOrderDraftForAnalytics(draft, 'scheduled_work_validation') })) return;
    throw error;
  }
  const maxRuns = Math.max(0, Number(els.scheduledWorkMaxRuns?.value || 0) || 0);
  const payload = {
    ...apiPayloadFromOrderDraft(draft),
    agent_id: draft.agent_id || undefined,
    prompt: draft.prompt || fallbackPromptFromOrderInput(draft.input),
    schedule: selectedScheduledWorkOptions(),
    max_runs: maxRuns
  };
  let result;
  try {
    result = await api('/api/recurring-orders', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  } catch (error) {
    if (handleOrderPreflightPrompt(error, draft, { analytics: summarizeOrderDraftForAnalytics(draft, 'scheduled_work_api') })) return;
    throw error;
  }
  void trackConversionEvent('recurring_order_created', {
    ...summarizeOrderDraftForAnalytics(draft, 'scheduled_work'),
    status: result.recurring_order?.status || 'active'
  });
  flash(`Scheduled work created. Next run: ${scheduledWorkTimeLabel(result.recurring_order?.nextRunAt)}`, 'ok');
  await refresh();
}

async function toggleScheduledWork(id = '') {
  const order = scheduledWorkById(id);
  if (!order) throw new Error('Scheduled work not found.');
  const status = String(order.status || '').toLowerCase();
  const paused = status === 'paused' || status === 'needs_action';
  const body = paused
    ? { status: 'active', schedule: order.schedule || {} }
    : { status: 'paused' };
  await api(`/api/recurring-orders/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(body)
  });
  flash(paused ? 'Scheduled work resumed. It will retry on the next scheduled run.' : 'Scheduled work paused.', 'ok');
  await refresh();
}

async function deleteScheduledWork(id = '') {
  if (!id) throw new Error('Scheduled work not found.');
  await api(`/api/recurring-orders/${encodeURIComponent(id)}`, { method: 'DELETE' });
  flash('Scheduled work deleted.', 'ok');
  await refresh();
}

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

function focusSettingsSection(section = state.settingsSection) {
  const target =
    (section === 'payments' && els.settingsPaymentsSection) ||
    (section === 'provider' && els.settingsProviderSection) ||
    (section === 'keys' && els.settingsKeysSection) ||
    (section === 'funnel' && els.settingsFunnelSection) ||
    (section === 'reports' && els.settingsReportsSection) ||
    els.settingsAccessCard;
  if (!target?.scrollIntoView) return;
  window.requestAnimationFrame(() => {
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

function hasManifestDraft() {
  return Boolean(String(els.manifestJson?.value || '').trim() || String(els.manifestUrl?.value || '').trim());
}

function resetAgentSetupFlow(options = {}) {
  state.agentSetupStarted = false;
  state.agentSetupMode = '';
  state.agentSetupCompletedId = null;
  state.showAgentList = false;
  if (options.clearManifest) {
    if (els.agentSkillMd) els.agentSkillMd.value = '';
    if (els.manifestJson) els.manifestJson.value = '';
    if (els.manifestUrl) els.manifestUrl.value = '';
  }
  if (options.clearSelection) {
    state.selectedAgentId = null;
  }
}

function completeAgentSetup(agentId) {
  state.agentSetupStarted = true;
  state.agentSetupMode = '';
  state.agentSetupCompletedId = agentId || null;
  state.showAgentList = true;
}

function renderAgentSetupFlow(auth = state.snapshot?.auth || {}) {
  const hasAgents = Array.isArray(state.snapshot?.agents) && state.snapshot.agents.length > 0;
  const completedAgent = state.agentSetupCompletedId
    ? state.snapshot?.agents?.find((agent) => agent.id === state.agentSetupCompletedId) || null
    : null;
  const setupStarted = Boolean(state.agentSetupStarted || state.agentSetupMode || state.agentSetupCompletedId);
  const setupMode = String(state.agentSetupMode || '');
  const setupCompleted = Boolean(state.agentSetupCompletedId);
  const showAgentList = Boolean(state.showAgentList || hasAgents);
  const loggedIn = Boolean(auth?.loggedIn);
  const githubLinked = isGithubLinked(auth);
  const githubAuthorized = isGithubAuthorized(auth);
  const githubReady = Boolean(auth?.githubAppConfigured);
  const reposLoaded = Array.isArray(state.repos) && state.repos.length > 0;
  const repoSelected = Boolean(selectedRepoFromPicker());
  let statusTitle = 'Browse ready agents or list your own.';
  let statusBody = 'Start by trying a managed sample agent. Developers can click LIST YOUR AGENT to publish from GitHub or a manifest.';
  let tone = 'info';
  const showSetupControls = Boolean(setupStarted || setupCompleted);

  setElementVisible(els.agentSetupControls, showSetupControls);
  setElementVisible(els.startAgentOnboardingBtn, !showSetupControls);
  setElementVisible(els.useGithubOnboardingBtn, setupStarted && !setupMode && !setupCompleted);
  setElementVisible(els.useManualOnboardingBtn, setupStarted && !setupMode && !setupCompleted);
  setElementVisible(els.resetAgentOnboardingBtn, setupStarted && !setupCompleted);
  setElementVisible(els.addAnotherAgentBtn, setupCompleted);
  setElementVisible(els.checkAgentListBtn, false);
  setElementVisible(els.agentSetupPanels, setupStarted && !setupCompleted && Boolean(setupMode));
  setElementVisible(els.agentManualPanel, setupMode === 'manual' && !setupCompleted);
  setElementVisible(els.agentGithubPanel, setupMode === 'github' && !setupCompleted);
  setElementVisible(els.agentListPanels, showAgentList);
  setElementVisible(els.agentFlowGithubLoginBtn, setupMode === 'github' && (!loggedIn || !githubAuthorized));
  setElementVisible(els.installGithubAppBtn, setupMode === 'github' && loggedIn && githubAuthorized && githubReady && !reposLoaded);
  setElementVisible(els.loadReposBtn, setupMode === 'github' && loggedIn && githubAuthorized);
  setElementVisible(els.repoSearch, setupMode === 'github' && loggedIn && githubAuthorized);
  setElementVisible(els.repoPrevBtn, setupMode === 'github' && loggedIn && githubAuthorized && reposLoaded);
  setElementVisible(els.repoNextBtn, setupMode === 'github' && loggedIn && githubAuthorized && reposLoaded);
  setElementVisible(els.repoPagerStatus, setupMode === 'github');
  setElementVisible(els.repoPicker, setupMode === 'github' && loggedIn && githubAuthorized);
  setElementVisible(els.repoPreview, setupMode === 'github');
  setElementVisible(els.clearRepoSelectionBtn, setupMode === 'github' && loggedIn && githubAuthorized && repoSelected);
  setElementVisible(els.generateRepoManifestBtn, setupMode === 'github' && loggedIn && githubAuthorized && repoSelected);
  setElementVisible(els.importSelectedRepoBtn, setupMode === 'github' && loggedIn && githubAuthorized && repoSelected);
  setElementVisible(els.createAdapterPrBtn, setupMode === 'github' && loggedIn && githubAuthorized && repoSelected);
  setElementVisible(els.importDeployedAdapterBtn, setupMode === 'github' && loggedIn && githubAuthorized && repoSelected);
  setElementVisible(els.githubInstallHelp, setupMode === 'github' && loggedIn && githubAuthorized && githubReady && !reposLoaded);
  if (els.agentFlowGithubLoginBtn) {
    els.agentFlowGithubLoginBtn.textContent = !loggedIn
      ? 'GITHUB SIGN IN'
      : githubLinked
        ? 'REFRESH GITHUB ACCESS'
        : connectorActionLabel('connect_github');
  }

  if (setupCompleted) {
    statusTitle = completedAgent ? `${completedAgent.name} registered.` : 'Agent registered.';
    statusBody = 'The agent list below is updated. Verify the new agent there, or LIST ANOTHER AGENT to register another one.';
    tone = 'ok';
  } else if (!setupStarted) {
    statusTitle = hasAgents ? 'Agent catalog is ready.' : 'Start agent registration.';
    statusBody = hasAgents
      ? 'Pick USE IN CAIt Chat on a sample agent to prefill Chat, or click LIST YOUR AGENT to publish your own.'
      : 'Click LIST YOUR AGENT. Then choose GitHub repo or direct manifest import.';
  } else if (!setupMode) {
    statusTitle = 'Choose registration method.';
    statusBody = 'Use GITHUB REPO if the app already lives in GitHub. Use PASTE MANIFEST if you already have the manifest details.';
  } else if (setupMode === 'manual') {
    statusTitle = 'Paste or import a manifest.';
    statusBody = 'Fill the fields directly, paste JSON, or import a manifest URL. After import, verify the agent from AGENTS.';
  } else if (!loggedIn || !githubLinked) {
    statusTitle = 'Step 1. Connect GitHub.';
    statusBody = loggedIn ? 'This account is signed in, but GitHub is not linked yet. Connect GitHub, then continue with one repo.' : 'Sign in and connect GitHub, then load repos and register an agent.';
  } else if (!githubAuthorized) {
    statusTitle = 'Step 1. Refresh GitHub access.';
    statusBody = `GitHub is already linked to this ${PRODUCT_NAME} account, but this browser session does not have active GitHub access. Refresh GitHub access, then load repos.`;
  } else if (!reposLoaded) {
    statusTitle = 'Step 2. Load repos.';
    statusBody = githubReady
      ? `Use INSTALL OR CONFIGURE APP only if the repo is not listed yet. If you are not the repo admin, ask the owner to install ${PRODUCT_NAME}. Then return here and click LOAD MY REPOS.`
      : 'Use LOAD MY REPOS to fetch the repositories available in this session.';
  } else if (!repoSelected) {
    statusTitle = 'Step 3. Choose one repo.';
    statusBody = `Pick the app repo you want to turn into an agent. If the repo is already listed, skip install and continue. If it is missing and you are not the repo admin, ask the owner to install ${PRODUCT_NAME}.`;
  } else {
    const repo = selectedRepoFromPicker();
    statusTitle = `Step 4. Set up ${repo?.name || 'this repo'}.`;
    statusBody = 'Use GENERATE DRAFT JSON, IMPORT SELECTED MANIFEST, CREATE ADAPTER PR, or IMPORT + VERIFY. Use CHANGE REPO if you want to switch to another repo.';
    tone = 'ok';
  }

  if (els.agentSetupStatus) {
    els.agentSetupStatus.textContent = `${statusTitle}\n\n${statusBody}`;
    els.agentSetupStatus.className = `detail-box action-card ${tone} compact-card`;
  }
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
  const auth = snapshot?.auth || {};
  const account = snapshot?.accountSettings || {};
  const orderKeys = activeApiKeys(account?.apiAccess?.orderKeys || []);
  const liveOrderKeys = orderKeys.filter((key) => String(key?.mode || 'live').toLowerCase() !== 'test');
  const testOrderKeys = orderKeys.filter((key) => String(key?.mode || 'live').toLowerCase() === 'test');
  const provider = auth?.authProvider || (auth?.githubAppConfigured ? 'github-app' : auth?.githubConfigured ? 'github-oauth' : 'not configured');
  const repoCount = state.repos.length;
  const filteredRepoCount = state.filteredRepos.length;
  const canLogin = Boolean(auth?.githubConfigured || auth?.githubAppConfigured);
  const githubLinked = isGithubLinked(auth);
  const githubAuthorized = isGithubAuthorized(auth);
  const githubFlowReady = canUseGithubAgentFlow(auth);

  if (els.connectGithubStatus) {
    const lines = [];
    if (!auth?.loggedIn || !githubLinked) {
      lines.push(
        'GitHub connection: not linked',
        `Auth mode available: ${canLogin ? provider : 'not configured'}`,
        `GitHub App configured: ${auth?.githubAppConfigured ? 'yes' : 'no'}`,
        `Repos loaded in this browser: ${repoCount}`,
        auth?.loggedIn
          ? 'Next: connect GitHub, then install the app if the repo list is still empty.'
          : 'Next: sign in or connect GitHub, then install the app if the repo list is still empty.'
      );
    } else if (!githubAuthorized) {
      lines.push(
        'GitHub connection: linked',
        `Auth mode available: ${canLogin ? provider : 'not configured'}`,
        `GitHub App configured: ${auth?.githubAppConfigured ? 'yes' : 'no'}`,
        `Repos loaded in this browser: ${repoCount}`,
        'Next: refresh GitHub access in this browser, then load repos.'
      );
    } else {
      lines.push(
        `GitHub connection: linked`,
        `Auth mode: ${provider}`,
        `GitHub App configured: ${auth?.githubAppConfigured ? 'yes' : 'no'}`,
        `Repos loaded: ${repoCount}${repoCount ? ` (${filteredRepoCount} in current filter)` : ''}`,
        repoCount
          ? 'Next: open AGENTS to import a manifest or create an adapter PR.'
          : 'Next: install the app or load repos again to fetch installation-authorized repos.'
      );
    }
    els.connectGithubStatus.textContent = lines.join('\n');
  }

  if (els.connectOrderApiStatus) {
    const lines = [
      `Public order endpoint: ${DEVELOPER_SURFACES_STATUS}`,
      DEVELOPER_SURFACES_NOTICE,
      `Previous CAIt API keys on this account: ${orderKeys.length} (${liveOrderKeys.length} live / ${testOrderKeys.length} test)`,
      'Next: use Chat, Apps, Deliveries, or Publisher in the browser. External API ordering will return after the contract is stable.'
    ];
    els.connectOrderApiStatus.textContent = lines.join('\n');
  }

  if (els.connectAgentApiStatus) {
    const lines = [
      `Agent import endpoint: ${DEVELOPER_SURFACES_STATUS}`,
      DEVELOPER_SURFACES_NOTICE,
      `Previous CAIt API keys on this account: ${orderKeys.length}`,
      'Next: manage provider setup from the browser. External agent API registration will return after the contract is stable.'
    ];
    els.connectAgentApiStatus.textContent = lines.join('\n');
  }

  if (els.connectHubGithubBtn) {
    els.connectHubGithubBtn.textContent = !auth?.loggedIn
      ? 'GITHUB SIGN IN'
      : githubLinked
        ? 'REFRESH GITHUB ACCESS'
        : connectorActionLabel('connect_github');
  }
  setButtonAccess(els.connectHubGithubBtn, canLogin && (!auth?.loggedIn || !githubAuthorized));
  setButtonAccess(els.connectHubInstallBtn, Boolean(auth?.githubAppConfigured) && githubFlowReady);
  setButtonAccess(els.connectHubLoadReposBtn, githubFlowReady);
  setButtonAccess(els.connectHubOpenAgentsBtn, true);
  setButtonAccess(els.connectHubOpenSettingsOrderBtn, true);
  setButtonAccess(els.connectHubCopyOrderBtn, true);
  setButtonAccess(els.connectHubOpenAgentsPublishBtn, true);
  setButtonAccess(els.connectHubOpenSettingsAgentBtn, true);
  setButtonAccess(els.connectHubCopyAgentBtn, true);
}

function renderSettingsFlow(account, monthlySummary, auth = state.snapshot?.auth || {}) {
  const loggedIn = Boolean(auth?.loggedIn && auth?.user?.login);
  const canReviewReports = Boolean(auth?.canReviewFeedbackReports);
  const allowedSections = ['payments', 'provider', 'keys', ...(canReviewReports ? ['funnel', 'reports'] : [])];
  const activeSection = allowedSections.includes(state.settingsSection)
    ? state.settingsSection
    : 'payments';
  const tabs = [
    ['payments', els.settingsPaymentsTabBtn, els.settingsPaymentsSection],
    ['provider', els.settingsProviderTabBtn, els.settingsProviderSection],
    ['keys', els.settingsKeysTabBtn, els.settingsKeysSection],
    ['funnel', els.settingsFunnelTabBtn, els.settingsFunnelSection],
    ['reports', els.settingsReportsTabBtn, els.settingsReportsSection]
  ];
  tabs.forEach(([section, button, panel]) => {
    const allowed = !['funnel', 'reports'].includes(section) || canReviewReports;
    const active = allowed && section === activeSection;
    if (button) {
      setElementVisible(button, allowed);
      button.classList.toggle('active', active);
      button.disabled = !allowed;
    }
    setElementVisible(panel, allowed && active);
  });
  setElementVisible(els.billingProfilePanel, loggedIn && state.billingProfileExpanded && activeSection === 'payments');
  setElementVisible(els.providerProfilePanel, loggedIn && state.providerProfileExpanded && activeSection === 'provider');
  if (els.toggleBillingProfileBtn) {
    els.toggleBillingProfileBtn.textContent = state.billingProfileExpanded ? 'HIDE BILLING PROFILE' : 'SHOW BILLING PROFILE';
    els.toggleBillingProfileBtn.disabled = !loggedIn;
  }
  if (els.toggleProviderProfileBtn) {
    els.toggleProviderProfileBtn.textContent = state.providerProfileExpanded ? 'HIDE PROVIDER PROFILE' : 'SHOW PROVIDER PROFILE';
    els.toggleProviderProfileBtn.disabled = !loggedIn;
  }
}

function openSettingsSection(section) {
  const auth = state.snapshot?.auth || {};
  const canReviewReports = Boolean(auth?.canReviewFeedbackReports);
  const allowedSections = ['payments', 'provider', 'keys', ...(canReviewReports ? ['funnel', 'reports'] : [])];
  state.settingsSection = allowedSections.includes(section)
    ? section
    : 'payments';
  if (!auth?.loggedIn) {
    requireStartLoginGate('settings', 'Login required. SETTINGS actions are private.');
    return;
  }
  switchTab('settings');
  renderSettingsFlow(state.snapshot?.accountSettings, state.snapshot?.monthlySummary, auth);
  focusSettingsSection(state.settingsSection);
  syncRouteState();
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

function setInputValue(el, value) {
  if (!el) return;
  if (document.activeElement === el) return;
  el.value = value == null ? '' : String(value);
}

function readRememberedTab() {
  return runtimeRememberedTab;
}

function clearRememberedTab() {
  runtimeRememberedTab = '';
}

function rememberTab(tab) {
  const safeTab = String(tab || '').trim();
  if (!safeTab || safeTab === 'start' || safeTab === 'ops') return;
  runtimeRememberedTab = safeTab;
}

function loginReturnPathForTab(tab = 'work') {
  const safeTab = normalizeTab(tab);
  if (!safeTab || safeTab === 'start') return '/';
  if (safeTab === 'work') return '/chat';
  if (safeTab === 'settings' && state.settingsSection) {
    return `/?tab=settings&section=${encodeURIComponent(state.settingsSection)}`;
  }
  return `/?tab=${encodeURIComponent(safeTab)}`;
}

function buildLoginPageUrl({ source = 'direct', nextTab = 'work', nextPath = '' } = {}) {
  const url = new URL('/login.html', window.location.origin);
  const safeSource = safeAnalyticsString(source, 40).toLowerCase() || 'direct';
  const targetPath = String(nextPath || loginReturnPathForTab(nextTab)).trim() || '/chat';
  url.searchParams.set('source', safeSource);
  url.searchParams.set('next', targetPath);
  url.searchParams.set('visitor_id', visitorId());
  return `${url.pathname}${url.search}`;
}

function openDedicatedLoginPage(options = {}) {
  window.location.href = buildLoginPageUrl(options);
}

function currentPrivateReturnTab(fallback = 'work') {
  const tab = normalizeTab(state.currentTab);
  if (tab && tab !== 'start') return tab;
  return normalizeTab(fallback) || 'work';
}

function openLoginForProtectedAction(source = 'protected_action', fallbackTab = 'work') {
  openDedicatedLoginPage({
    source,
    nextTab: currentPrivateReturnTab(fallbackTab)
  });
}

function openGithubSignIn() {
  trackLoginStarted('github');
  window.location.href = githubAuthActionUrl(state.snapshot?.auth || {});
}

async function fetchFastAuthStatus(timeoutMs = 60 * 60 * 1000) {
  const inlineResolved = window.__CAIT_FAST_AUTH_RESOLVED__;
  if (inlineResolved && typeof inlineResolved === 'object') return inlineResolved;
  const inlinePromise = window.__CAIT_FAST_AUTH_STATUS__;
  if (inlinePromise && typeof inlinePromise.then === 'function') {
    const timeoutValue = Symbol('fast-auth-timeout');
    const timeoutPromise = new Promise((resolve) => {
      window.setTimeout(() => resolve(timeoutValue), Math.max(500, Number(timeoutMs) || 60 * 60 * 1000));
    });
    const result = await Promise.race([inlinePromise, timeoutPromise]);
    if (result && result !== timeoutValue) return result;
  }
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), Math.max(500, Number(timeoutMs) || 60 * 60 * 1000));
  try {
    const response = await fetch('/auth/status', {
      credentials: 'same-origin',
      signal: controller.signal
    });
    if (!response.ok) return null;
    return await response.json().catch(() => null);
  } catch {
    return null;
  } finally {
    window.clearTimeout(timeout);
  }
}

function applyFastAuthStatusForAuthCheck(authStatus = null) {
  if (!authStatus || state.currentTab !== 'auth-check') return false;
  const targetTab = state.pendingAuthTab || 'work';
  const auth = {
    ...(state.snapshot?.auth || {}),
    ...authStatus
  };
  state.snapshot = {
    ...(state.snapshot || {}),
    auth
  };
  rememberAuthState(Boolean(auth.loggedIn));
  renderReleaseAccess(auth);
  if (auth.loggedIn) {
    state.pendingAuthTab = '';
    switchTab(targetTab);
  } else {
    state.pendingAuthTab = '';
    requireStartLoginGate(targetTab, 'Sign in from START first. The product experience is private after login.');
  }
  return true;
}

async function primeAuthCheckFromStatus() {
  if (state.currentTab !== 'auth-check') return;
  const status = await fetchFastAuthStatus();
  return applyFastAuthStatusForAuthCheck(status);
}

function readRememberedAuthState() {
  return runtimeRememberedAuth;
}

function rememberAuthState(loggedIn) {
  runtimeRememberedAuth = Boolean(loggedIn);
}

function normalizeTab(tab) {
  const safe = String(tab || '').trim().toLowerCase();
  return ['start', 'work', 'agents', 'connect', 'settings', 'admin', 'ops'].includes(safe) ? safe : '';
}

function normalizeSettingsSection(section) {
  const safe = String(section || '').trim().toLowerCase();
  return ['payments', 'provider', 'keys', 'funnel', 'reports'].includes(safe) ? safe : '';
}

function readInitialRouteState() {
  const url = new URL(window.location.href);
  const agentId = String(url.searchParams.get('agent') || '').trim();
  const requestedTab = normalizeTab(url.searchParams.get('tab'));
  return {
    authError: String(url.searchParams.get('auth_error') || '').trim(),
    stripeState: String(url.searchParams.get('stripe') || '').trim(),
    settingsSection: normalizeSettingsSection(url.searchParams.get('section')),
    tab: requestedTab || (agentId ? 'agents' : ''),
    agentId
  };
}

function syncRouteState() {
  const url = new URL(window.location.href);
  if (state.currentTab && state.currentTab !== 'start') url.searchParams.set('tab', state.currentTab);
  else url.searchParams.delete('tab');
  if (state.currentTab === 'agents' && state.selectedAgentId) url.searchParams.set('agent', state.selectedAgentId);
  else url.searchParams.delete('agent');
  if (state.currentTab === 'settings' && state.settingsSection) url.searchParams.set('section', state.settingsSection);
  else url.searchParams.delete('section');
  history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
}

function openStartFromLogo(event) {
  if (event?.button || event?.metaKey || event?.ctrlKey || event?.shiftKey || event?.altKey) return;
  event?.preventDefault();
  if (state.snapshot?.auth?.loggedIn) {
    const nextTab = defaultLoggedInTab(state.snapshot);
    switchTab(nextTab);
    history.pushState({}, '', nextTab === 'work' ? '/chat' : `/?tab=${encodeURIComponent(nextTab)}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  clearRememberedTab();
  state.currentTab = 'start';
  state.routeAgentId = '';
  state.selectedAgentId = '';
  document.querySelectorAll('[data-screen]').forEach((node) => {
    node.hidden = node.dataset.screen !== 'start';
  });
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tab === 'start');
  });
  history.pushState({}, '', '/');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function defaultLoggedInTab(snapshot = state.snapshot || {}) {
  const remembered = readRememberedTab();
  if (remembered === 'admin' && snapshot?.auth?.isPlatformAdmin) return remembered;
  if (['work', 'agents', 'connect', 'settings'].includes(remembered)) return remembered;
  const agents = snapshot?.agents || [];
  return agents.length ? 'work' : 'agents';
}

function openAgentsGithubFlow() {
  switchTab('agents');
  state.agentSetupStarted = true;
  state.agentSetupMode = 'github';
  state.agentSetupCompletedId = null;
  state.showAgentList = false;
  renderAgentSetupFlow(state.snapshot?.auth);
  if (els.agentGithubPanel?.scrollIntoView) {
    window.requestAnimationFrame(() => {
      els.agentGithubPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
  if (state.snapshot) render(state.snapshot);
}

function formatPercent(value) {
  return `${Math.round(Number(value || 0) * 100)}%`;
}

function formatDurationMs(ms) {
  const safeMs = Number(ms || 0);
  if (!Number.isFinite(safeMs) || safeMs <= 0) return '0s';
  const totalSec = Math.round(safeMs / 1000);
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function formatRelativeDurationMs(ms) {
  const safeMs = Number(ms || 0);
  if (!Number.isFinite(safeMs) || safeMs <= 0) return '0s';
  const totalSec = Math.round(safeMs / 1000);
  if (totalSec < 60) return `${totalSec}s`;
  const totalMin = Math.floor(totalSec / 60);
  if (totalMin < 60) return `${totalMin}m`;
  const totalHours = Math.floor(totalMin / 60);
  if (totalHours < 24) return `${totalHours}h`;
  const totalDays = Math.floor(totalHours / 24);
  if (totalDays < 30) return `${totalDays}d`;
  const totalMonths = Math.floor(totalDays / 30);
  if (totalMonths < 12) return `${totalMonths}mo`;
  const totalYears = Math.floor(totalMonths / 12);
  return `${totalYears}y`;
}

function formatSecRange(minSec, maxSec) {
  return `${formatDurationMs((minSec || 0) * 1000)} – ${formatDurationMs((maxSec || 0) * 1000)}`;
}

function sinceLabel(value) {
  if (!value) return '-';
  const ts = new Date(value).getTime();
  if (!Number.isFinite(ts)) return '-';
  const diff = Date.now() - ts;
  if (diff <= 0) return 'now';
  return `${formatRelativeDurationMs(diff)} ago`;
}

function untilLabel(value) {
  if (!value) return '-';
  const ts = new Date(value).getTime();
  if (!Number.isFinite(ts)) return '-';
  const diff = ts - Date.now();
  if (diff <= 0) return 'now';
  return `in ${formatRelativeDurationMs(diff)}`;
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

function looksJapanese(value = '') {
  return /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(String(value || ''));
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

function openChatFollowupMode(prompt = '') {
  const text = String(prompt || '').trim();
  if (!text || !lastOpenChatPreparedBrief()) return '';
  if (isOpenChatClarificationAnswer(text)) return 'answers';
  if (/(短く|もっと短|圧縮|省トークン|compact|shorter|compress)/i.test(text)) return 'compact';
  if (/(安く|低コスト|費用抑え|浅め|軽め|最小|cheap|low cost|lower cost|budget|shallow|minimal|max \$|under \$)/i.test(text)) return 'cheap';
  if (/(要点|一言|一行|1行|ざっくり説明|今の内容|どんな発注|summary|summari[sz]e|one line|tl;dr|briefly explain)/i.test(text)) return 'explain';
  if (/(英語|英訳|english|英語寄り)/i.test(text)) return 'english';
  if (/(日本語|和訳|japanese|日本語に)/i.test(text)) return 'japanese';
  if (/(納品プレビュー|納品イメージ|納品形式|何が返る|何が納品|どう受け取|受け取り方|delivery preview|what will i get|deliverable preview|output preview|sample delivery)/i.test(text)) return 'delivery';
  if (/(分解|分けて|分ける|切って|タスク化|マルチ|分担|並列|split|break down|decompose|parallel|multi[- ]agent)/i.test(text)) return 'split';
  if (/(足りない|不足|抜け漏れ|確認|質問|ヒアリング|これで発注|発注していい|ready|missing|clarifying|question|dispatch)/i.test(text)) return 'review';
  if (isOpenChatBriefEditInstruction(text)) return 'edit';
  return '';
}

function isOpenChatRunConfirmation(prompt = '') {
  const text = String(prompt || '').replace(/\s+/g, ' ').trim();
  if (!text || !lastOpenChatPreparedBrief()) return false;
  if (/(copy|restore|コピー|戻|入力欄|発注文|ブリーフ)/i.test(text)) return false;
  return /^(はい|はいお願いします|お願いします|お願い|進めて|進めてください|実行|実行して|走らせて|走らせる|これで|これでお願いします|これで実行|go|yes|yep|ok|okay|proceed|run it|run this|send it|send order|dispatch)$/i.test(text)
    || /(run|send|dispatch|proceed|実行|走らせ|送って|発注).{0,20}(please|now|して|お願いします|ください)?$/i.test(text);
}

function isOpenChatExplicitDispatchRequest(prompt = '') {
  const text = String(prompt || '').replace(/\s+/g, ' ').trim();
  if (!text) return false;
  if (/(copy|restore|コピー|戻|入力欄|発注文を戻|ブリーフを戻)/i.test(text)) return false;
  const workImperative = /(調査して|調べて|比較して|分析して|要約して|レビューして|改善して|修正して|直して|作って|書いて|投稿して|集客して|探して|まとめて|実装して|デバッグして|確認して|対応して|やって|お願いします|お願い|頼む|research|compare|analy[sz]e|summari[sz]e|review|improve|fix|debug|build|create|write|post|find|check|handle|do this|please do)/i.test(text);
  const questionOnly = /[?？]|\b(can|could|would|should|what|how|why|where|when)\b|ですか|ますか|でしょうか|どう思う|相談/i.test(text)
    && !/(発注|注文|実行|走らせ|送って|dispatch|order|run|execute)/i.test(text);
  return isOpenChatRunConfirmation(text)
    || /(発注したい|発注して|注文したい|注文して|オーダーしたい|オーダーして|実行したい|実行して|走らせて|この内容で発注|さっきの内容で発注|前の内容で発注|send order|dispatch|place order|order this|run this|proceed with order)/i.test(text)
    || (workImperative && !questionOnly);
}

function isOpenChatGenericProceed(prompt = '') {
  const text = String(prompt || '').replace(/\s+/g, ' ').trim();
  return /^(はい|はいお願いします|お願いします|お願い|進めて|進めてください|やって|やってください|頼む|go|yes|yep|ok|okay|please|proceed)$/i.test(text);
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

function openChatLooksStandaloneQuestionText(prompt = '') {
  const raw = String(prompt || '').trim();
  const text = openChatIntentMatchText(raw);
  if (!raw) return false;
  return /[?？]/.test(raw)
    || /^(?:what|how|why|can|do|does|is|are|where|when)\b/i.test(raw)
    || /(ですか|ますか|何|どう|なに|できますか|できる[?？か]|教えて|とは|使い方)/.test(raw)
    || /(?:料金|課金|支払|ログイン|登録).{0,18}(?:ですか|ますか|でき|教えて|方法|やり方|どう|何|なに|\?|\？)/i.test(raw)
    || /\b(?:help|start|confused|what|how)\b/i.test(text);
}

function openChatProductQuestionContext(prompt = '') {
  const raw = String(prompt || '').trim();
  const text = openChatIntentMatchText(raw);
  if (!text) return false;
  const productContext = /\b(cait|ca\s*it|aiagent2|ai agent2|ai agent marketplace|aim|agent marketplace|work chat|order|delivery|deposit|billing|payment|stripe|github|google|cli|api|payout|provider|manifest|verify|verification)\b/i.test(text)
    || /(CAIt|aiagent2|ai agent marketplace|エージェントマーケット|ワークチャット|オーダー|注文|納品|デポジット|残高|料金|課金|支払|ログイン|登録|使い方|github|google|stripe|api|cli|入金|出金|受け取り|マニフェスト|ベリファイ|検証)/i.test(text);
  const questionShape = openChatLooksStandaloneQuestionText(raw);
  return productContext && questionShape;
}

function openChatDecisionBriefKey(brief = '') {
  const normalized = String(brief || '').replace(/\s+/g, ' ').trim();
  if (!isStructuredOrderBrief(normalized)) return '';
  let hash = 2166136261;
  for (let index = 0; index < normalized.length; index += 1) {
    hash ^= normalized.charCodeAt(index);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return `${normalized.length}:${hash.toString(16)}`;
}

function isOpenChatDecisionSuppressedForBrief(brief = '') {
  const key = openChatDecisionBriefKey(brief);
  return Boolean(key && state.openChatDecisionSuppressedBriefKey === key);
}

function markOpenChatDecisionSuppressedForBrief(brief = '') {
  const key = openChatDecisionBriefKey(brief);
  if (key) state.openChatDecisionSuppressedBriefKey = key;
  state.openChatDecisionSuppressed = true;
}

function clearOpenChatDecisionSuppressionForNewBrief(brief = '') {
  const key = openChatDecisionBriefKey(brief);
  if (!key || key !== state.openChatDecisionSuppressedBriefKey) {
    state.openChatDecisionSuppressed = false;
    state.openChatDecisionSuppressedBriefKey = '';
  }
}

function openChatLocalUserConversationText(extra = '') {
  const rows = openChatConversationContextForLlm()
    .filter((row) => row.role === 'user')
    .map((row) => row.content)
    .filter(Boolean);
  const appended = String(extra || '').trim();
  if (appended) rows.push(appended);
  return [...new Set(rows)].join('\n').trim();
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

function openChatHasUncertaintyMarker(prompt = '') {
  const raw = String(prompt || '').replace(/\s+/g, ' ').trim();
  const text = openChatIntentMatchText(raw);
  return /(よくわから|わから|分から|不明|迷|どうすれば|どうしたら|何から|何をすれば|なんか|とりあえず|help|stuck|confused|not sure|do not know|don't know|where.*start|what should i)/i.test(raw)
    || /(unknown|confused|not sure|stuck|help|what should i|where start)/i.test(text);
}

function openChatMustUseLlmFallback(prompt = '', fallbackAnswer = null) {
  if (!fallbackAnswer) return false;
  const patternId = String(fallbackAnswer?.patternId || '').trim();
  const kind = chatAnswerKind(fallbackAnswer);
  if (!openChatHasUncertaintyMarker(prompt)) return false;
  if (patternId === 'pattern_leader_required_intake') return true;
  if (kind === 'clarify' && !['pattern_low_info_test', 'pattern_greeting', 'pattern_general_help'].includes(patternId)) return true;
  return false;
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

function withOpenChatResponseSource(answer = null, responseSource = 'local', detail = '') {
  if (!answer || typeof answer !== 'object') return answer;
  return {
    ...answer,
    responseSource,
    llmProvider: responseSource,
    fallbackDetail: String(detail || '').slice(0, 120)
  };
}

function openChatLlmLeaderIntakeGuardCandidate(prompt = '', result = {}, fallbackAnswer = null) {
  const action = String(result?.action || '').trim();
  const rawBrief = String(result?.order_brief || result?.orderBrief || '').trim();
  const userContext = openChatUserOnlyContextForIntake(prompt);
  const briefParts = structuredOrderBriefParts(rawBrief);
  const resultIntent = String(result?.intent || '').trim();
  const candidates = [
    briefParts.taskType,
    fallbackAnswer?.leaderIntakeTask,
    openChatImplicitLeaderIntakeTask(userContext),
    openChatImplicitLeaderIntakeTask(rawBrief),
    inferClientTaskSequence('', userContext)[0],
    inferClientTaskSequence('', rawBrief)[0]
  ];
  const taskType = candidates.map(openChatNormalizeLeaderIntakeTask).find(Boolean) || '';
  if (!taskType) return null;
  const isOrderLike = ['prepare_order', 'use_previous_brief'].includes(action) || rawBrief || fallbackAnswer?.leaderIntakeTask;
  const isLeaderIntent = Boolean(openChatImplicitLeaderIntakeTask(userContext))
    || openChatIsLeaderIntakeTask(taskType);
  if (!isOrderLike && !isLeaderIntent) return null;
  const missing = openChatMissingLeaderIntakeFields(taskType, userContext, orderInputCounts(orderInputFromComposer()));
  if (!missing.length) return null;
  return { taskType, userContext, missing };
}

async function openChatServerLeaderIntakeGuardAnswer(prompt = '', result = {}, fallbackAnswer = null, inputCounts = {}) {
  const candidate = openChatLlmLeaderIntakeGuardCandidate(prompt, result, fallbackAnswer);
  if (!candidate) return null;
  const prepared = await prepareWorkOrderViaApi(candidate.userContext || prompt, requestedOrderStrategy(), {
    taskType: candidate.taskType,
    inputCounts,
    conversationContext: openChatConversationContextForLlm()
  });
  if (!prepared) return null;
  if (chatEngineIsNeedsInputResponse(prepared)) {
    return serverIntakeAnswerFromPreparedOrder(prepared, prompt);
  }
  if (openChatIsLeaderIntakeTask(prepared.taskType || candidate.taskType)) {
    applyServerPreparedOrder(prepared, candidate.userContext || prompt);
    return serverPreparedOrderAnswerFromResult(prepared, candidate.userContext || prompt, { followup: false });
  }
  return null;
}

function openChatPreparedOrderActions(answerKind = '', nextPrompt = '') {
  const brief = String(nextPrompt || '').trim();
  if (answerKind !== 'assist' || !isStructuredOrderBrief(brief)) return [];
  // Keep the final decision in one place: the composer choice bar.
  // Duplicating SEND ORDER / REVISE / CANCEL inside the chat bubble makes
  // users unsure which control is canonical.
  return [];
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

function optimizedWorkOrderBrief(prompt = '', taskType = 'research', sourceCounts = {}) {
  const legacyOrderCompactionCopy = 'The cat will compact this into a runnable work order before dispatch:';
  void legacyOrderCompactionCopy;
  const task = String(taskType || 'research').toLowerCase();
  const goal = compactChatText(String(prompt || '').replace(/\s+/g, ' '), 260)
    || 'Use the attached sources and infer the strongest deliverable.';
  const outputLanguage = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(String(prompt || ''))
    ? 'Japanese'
    : 'English';
  const deliverables = {
    code: 'Find the likely root cause, smallest safe fix path, PR/diff handoff when repo access exists, and tests to run.',
    debug: 'Identify failure conditions, reproduction steps, likely cause, fix path, and verification checks.',
    seo: 'Return search intent, content gaps, priority keywords, article briefs, and internal-link actions.',
    writing: 'Return a polished draft with target audience, structure, tone, constraints, and acceptance criteria.',
    listing: 'Return listing copy, pricing/positioning notes, SEO terms, risk flags, and publishing checklist.',
    pricing: 'Return tier recommendations, value metric, competitor assumptions, risks, and launch recommendation.',
    research: 'Return answer-first summary, comparison table, assumptions, sources when current information is needed, and recommendation.'
  };
  const sourceLine = Number(sourceCounts.urlCount || 0) || Number(sourceCounts.fileCount || 0)
    ? `Use ${Number(sourceCounts.urlCount || 0)} URL(s) and ${Number(sourceCounts.fileCount || 0)} file(s) as source material.`
    : 'Ask for sources only if they materially change the answer.';
  return [
    `${PRODUCT_SHORT_NAME} will compact this into a runnable work order before dispatch:`,
    `Goal: ${goal}`,
    `Deliverable: ${deliverables[task] || deliverables.research}`,
    `Inputs: ${sourceLine}`,
    `Output language: ${outputLanguage}`,
    'Dispatch prep: split vague work when needed and use a compact English execution brief to reduce wasted tokens.',
    'Quality bar: answer first, state assumptions, separate facts from inference, and make the delivery reusable.'
  ].join('\n');
}

function openChatConfirmationPauseBlock(brief = '', taskType = 'research', sourceCounts = {}, options = {}) {
  const ja = options.ja ?? looksJapanese(brief);
  const parts = structuredOrderBriefParts(brief);
  const readiness = openChatReadiness(taskType, brief, sourceCounts);
  const estimate = compactChatText(options.estimate || '', 360);
  const status = compactChatText(options.status || '', 300);
  const routing = orderRoutingDecision(taskType, brief);
  const routeLine = routing.strategy === 'multi'
    ? `Agent Team (${routing.plan?.picks?.length || 0} agent runs)`
    : 'single-agent';
  const goal = parts.goal || compactChatText(brief.replace(/\s+/g, ' '), 220);
  const deliver = parts.deliver || openChatDeliverableForTask(taskType);
  const inputs = parts.inputs || (
    Number(sourceCounts.urlCount || 0) || Number(sourceCounts.fileCount || 0)
      ? `${Number(sourceCounts.urlCount || 0)} URL(s), ${Number(sourceCounts.fileCount || 0)} file(s), plus the written request.`
      : 'Written request only.'
  );
  if (ja) {
    return [
      '確認の一時停止です。まだ実行も課金もしていません。',
      '',
      `理解した目的: ${goal}`,
      `タスク: ${taskType}`,
      `実行形: ${routeLine}`,
      `入力: ${inputs}`,
      `納品: ${deliver}`,
      `準備度: ${readiness.label} (${readiness.score}/100)`,
      ...(estimate ? ['', estimate] : []),
      ...(status ? ['', status] : []),
      '',
      '次の操作は下のボタンから選んでください。'
    ].join('\n');
  }
  return [
    'Confirmation pause. Nothing has run and nothing has been billed yet.',
    '',
    `Understood outcome: ${goal}`,
    `Task: ${taskType}`,
    `Execution shape: ${routeLine}`,
    `Inputs: ${inputs}`,
    `Delivery: ${deliver}`,
    `Readiness: ${readiness.label} (${readiness.score}/100)`,
    ...(estimate ? ['', estimate] : []),
    ...(status ? ['', status] : []),
    '',
    'Choose the next action from the buttons below.'
  ].join('\n');
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
      if (!ensureSettingsLogin()) return;
      if (TEMPORARY_INVOICE_BILLING_ENABLED && !STRIPE_CARD_SETUP_DURING_TEMPORARY_BILLING_ENABLED) {
        flash('Saved payment-method setup is paused during temporary invoice billing.', 'warn');
        return;
      }
      await launchStripeHostedAction('/api/stripe/setup-session', {}, {
        title: TEMPORARY_INVOICE_BILLING_ENABLED
          ? 'Payment method registration is ready.'
          : 'Payment method setup is ready.',
        successMessage: TEMPORARY_INVOICE_BILLING_ENABLED
          ? 'Opened payment method registration. Orders still use monthly invoice/manual confirmation until automated charging is enabled.'
          : 'Opened payment method setup.',
        output: 'customer'
      });
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

function agentShareUrl(agent = selectedAgent()) {
  if (!agent?.id) return '';
  const url = new URL('/', window.location.origin);
  url.searchParams.set('tab', 'agents');
  url.searchParams.set('agent', agent.id);
  return url.toString();
}

function agentSharePost(agent = selectedAgent()) {
  if (!agent) return '';
  const tasks = (agent.taskTypes || []).slice(0, 3).join(' / ') || 'general';
  const status = agentHealth(agent).ready ? 'ready to order' : agentVerification(agent).label.toLowerCase();
  const description = clipText(agent.description || '', 110);
  return [
    `I published ${agent.name} on ${PRODUCT_NAME} beta.`,
    description !== '-' ? description : '',
    `Tasks: ${tasks}.`,
    `Status: ${status}.`,
    `Try it: ${agentShareUrl(agent)}`
  ].filter(Boolean).join(' ');
}

function shareAgentOnX(agent = selectedAgent()) {
  if (!agent) {
    flash('Select an agent first.', 'error');
    return;
  }
  const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(agentSharePost(agent))}`;
  window.open(url, '_blank', 'noopener,noreferrer');
  flash('Opened X share composer.', 'ok');
}

function currentRunTargetAgent() {
  const agentId = String(els.jobAgentId?.value || '').trim();
  if (!agentId) return null;
  return state.snapshot?.agents?.find((agent) => agent.id === agentId) || null;
}

function readyAgentsForTask(taskType = currentRoutingTask()) {
  const requestedTask = String(taskType || '').trim().toLowerCase();
  return (state.snapshot?.agents || []).filter((agent) => {
    const health = agentHealth(agent);
    if (!health.ready) return false;
    if (!requestedTask) return true;
    return agentTaskFit(agent, requestedTask).matches;
  });
}

function bestReadyAgentForTask(taskType = currentRoutingTask()) {
  const candidates = readyAgentsForTask(taskType).slice();
  candidates.sort((a, b) => agentRoutingScore(b, taskType) - agentRoutingScore(a, taskType));
  return candidates[0] || null;
}

function agentMatchesOrderSearch(agent, query = '', taskType = currentRoutingTask()) {
  const { tokens, free } = parseSearchTokens(query);
  const health = agentHealth(agent);
  const verification = agentVerification(agent);
  const fit = agentTaskFit(agent, taskType);
  const composition = agentComposition(agent);
  const requirements = agentRequirements(agent);
  const tags = agentTags(agent);
  const endpointText = health.endpoints.map((entry) => `${entry.label} ${entry.value}`).join(' ');
  const hay = [
    agent.id,
    agent.name,
    agent.owner,
    agent.description,
    (agent.taskTypes || []).join(' '),
    tags.join(' '),
    agent.manifestUrl,
    agent.manifestSource,
    agent.verificationStatus,
    agent.agentReviewStatus,
    health.label,
    health.verifyLabel,
    health.reviewLabel,
    health.reviewReason,
    health.availability,
    health.endpointLabel,
    health.healthLabel,
    health.reason,
    health.endpoint,
    health.healthcheck,
    verification.code,
    verification.reason,
    fit.label,
    fit.reason,
    agentProductKind(agent),
    agentCompositionSummary(agent),
    agentRequirementSummary(agent),
    requirements.map((item) => [item.type, item.label, item.purpose, item.fulfillment, item.instructions].filter(Boolean).join(' ')).join(' '),
    composition.mode,
    composition.components.map((component) => [component.name, component.agentId, component.role, component.taskText, component.description].filter(Boolean).join(' ')).join(' '),
    endpointText
  ].filter(Boolean).join(' ').toLowerCase();
  const matchesSearch = !free.length || free.every((part) => hay.includes(part));
  const matchesToken = tokens.every(({ key, value }) => {
    if (!value) return true;
    if (['status', 'state'].includes(key)) return [health.label, health.availability, health.verifyLabel, health.reviewLabel, agent.verificationStatus, agent.agentReviewStatus].join(' ').toLowerCase().includes(value);
    if (['task', 'cap', 'capability'].includes(key)) return (agent.taskTypes || []).some((task) => String(task).toLowerCase().includes(value));
    if (['tag', 'tags', 'team'].includes(key)) return tags.some((tag) => String(tag).toLowerCase().includes(value));
    if (['kind', 'type', 'product'].includes(key)) return [agentProductKind(agent), agentCompositionSummary(agent)].join(' ').toLowerCase().includes(value);
    if (key === 'owner') return String(agent.owner || '').toLowerCase().includes(value);
    if (['verify', 'verification'].includes(key)) return [agent.verificationStatus, health.verifyLabel, verification.code, verification.reason].join(' ').toLowerCase().includes(value);
    if (['review', 'safety'].includes(key)) return [agent.agentReviewStatus, health.reviewLabel, health.reviewReason].join(' ').toLowerCase().includes(value);
    if (key === 'endpoint') {
      if (value === 'missing') return !health.endpoint;
      if (value === 'present') return Boolean(health.endpoint);
      return [health.endpoint, health.healthcheck, endpointText].join(' ').toLowerCase().includes(value);
    }
    if (['fit', 'route'].includes(key)) {
      if (value === 'match') return fit.matches;
      if (value === 'mismatch') return !fit.matches;
      return [fit.label, fit.reason].join(' ').toLowerCase().includes(value);
    }
    if (['id', 'agent'].includes(key)) return [agent.id, agent.name].join(' ').toLowerCase().includes(value);
    return hay.includes(value);
  });
  return matchesSearch && matchesToken;
}

function renderOrderAgentSearchSummary(agents = [], filtered = [], taskType = currentRoutingTask(), query = '', selected = null) {
  if (!els.orderAgentSearchSummary) return;
  const readyMatches = readyAgentsForTask(taskType).length;
  const readyVisible = filtered.filter((agent) => agentHealth(agent).ready).length;
  const activeParts = [];
  if (query) activeParts.push(`search="${query}"`);
  if (taskType) activeParts.push(`task=${taskType}`);
  const lines = [
    `${filtered.length}/${agents.length} agents shown · ${readyVisible} ready in results · ${readyMatches} ready match ${taskType || 'the current task'}`,
    `Selected target: ${selected ? `${selected.name} (${agentHealth(selected).label})` : 'AUTO ROUTE'}`,
    `Active filters: ${activeParts.length ? activeParts.join(' · ') : 'none. Leave order settings closed to keep auto route broad.'}`,
    'Search fields: name, owner, description, task, tag, product type, readiness, verify state, endpoint.',
    'Examples: seo · tag:marketing · owner:kyasui · task:research · status:ready · verify:failed · endpoint:missing · fit:match'
  ];
  if (selected && query && !filtered.some((agent) => agent.id === selected.id)) {
    lines.splice(2, 0, 'Pinned agent note: the selected agent stays pinned even if it does not match the current search.');
  }
  els.orderAgentSearchSummary.textContent = lines.join('\n');
}

function renderOrderAgentPicker() {
  if (!els.jobAgentPicker) return;
  const taskType = currentRoutingTask() || 'research';
  const query = String(els.jobAgentSearch?.value || state.jobAgentSearch || '').trim();
  state.jobAgentSearch = query;
  const selectedId = String(els.jobAgentId?.value || '').trim();
  const selected = (state.snapshot?.agents || []).find((agent) => agent.id === selectedId) || null;
  const agents = [...(state.snapshot?.agents || [])];
  const ranked = agents
    .filter((agent) => agentMatchesOrderSearch(agent, query, taskType))
    .sort((left, right) => {
      const leftFit = agentTaskFit(left, taskType).matches ? 1 : 0;
      const rightFit = agentTaskFit(right, taskType).matches ? 1 : 0;
      const leftReady = agentHealth(left).ready ? 1 : 0;
      const rightReady = agentHealth(right).ready ? 1 : 0;
      if (leftFit !== rightFit) return rightFit - leftFit;
      if (leftReady !== rightReady) return rightReady - leftReady;
      return compareAgents(left, right);
    });
  const visible = selected && !ranked.some((agent) => agent.id === selected.id)
    ? [selected, ...ranked]
    : ranked;
  const readyMatches = readyAgentsForTask(taskType).length;
  renderOrderAgentSearchSummary(agents, ranked, taskType, query, selected);

  els.jobAgentPicker.innerHTML = '';
  const autoOption = document.createElement('option');
  autoOption.value = '';
  autoOption.textContent = `AUTO ROUTE (${readyMatches} ready match${readyMatches === 1 ? '' : 'es'})`;
  els.jobAgentPicker.appendChild(autoOption);

  for (const agent of visible) {
    const option = document.createElement('option');
    const health = agentHealth(agent);
    const fit = agentTaskFit(agent, taskType);
    const status = health.ready ? 'READY' : (health.verified ? 'VERIFIED' : health.verifyLabel);
    option.value = agent.id;
    option.textContent = `[${status}] ${agent.name} · ${agent.owner || '-'} · ${(agent.taskTypes || []).join('/') || '-'}${isAgentSuiteProduct(agent) ? ' · group' : (isCompositeAgentProduct(agent) ? ' · composite' : '')}${fit.matches ? '' : ' · task mismatch'}`;
    els.jobAgentPicker.appendChild(option);
  }

  if (!visible.length) {
    const emptyOption = document.createElement('option');
    emptyOption.value = '__no_match__';
    emptyOption.textContent = 'No agent matches the current search';
    emptyOption.disabled = true;
    els.jobAgentPicker.appendChild(emptyOption);
  }

  els.jobAgentPicker.value = selectedId && [...els.jobAgentPicker.options].some((option) => option.value === selectedId)
    ? selectedId
    : '';
}

function currentAgentOnboarding(agentId) {
  return agentId ? state.agentOnboarding?.[agentId] || null : null;
}

function onboardingFreshEnough(record, ttlMs = 2 * 60 * 1000) {
  const checkedAt = record?.onboarding?.checkedAt || record?.checkedAt || null;
  if (!checkedAt) return false;
  const ts = new Date(checkedAt).getTime();
  return Number.isFinite(ts) && (Date.now() - ts) < ttlMs;
}

function canCheckAgentOnboarding(agent) {
  const auth = state.snapshot?.auth || {};
  return Boolean(agent && (auth.openWriteApiEnabled || authOwnsAgent(agent, auth)));
}

function canDeleteAgent(agent) {
  return canCheckAgentOnboarding(agent);
}

function canEditAgentPricing(agent) {
  return canCheckAgentOnboarding(agent);
}

function authIdentityLogins(auth = {}) {
  const values = [
    auth?.accountLogin,
    auth?.login,
    auth?.user?.login,
    auth?.githubIdentity?.login,
    auth?.googleIdentity?.login,
    ...(Array.isArray(auth?.identityLogins) ? auth.identityLogins : [])
  ];
  return [...new Set(values.map((value) => String(value || '').trim().toLowerCase()).filter(Boolean))];
}

function authOwnsAgent(agent, auth = {}) {
  const owner = String(agent?.owner || '').trim().toLowerCase();
  if (!owner) return false;
  return authIdentityLogins(auth).includes(owner);
}

function onboardingAction(onboarding) {
  if (!onboarding) return null;
  if (onboarding.status === 'ready') {
    return {
      title: 'READY FOR DISPATCH',
      body: onboarding.summary || 'The onboarding check passed.',
      tone: 'ok'
    };
  }
  const title = String(onboarding.nextAction?.title || 'REVIEW ONBOARDING').trim();
  return {
    title: `ACTION: ${title.toUpperCase()}`,
    body: onboarding.nextAction?.body || onboarding.summary || 'Review the onboarding checks for the next required step.',
    tone: onboarding.nextAction?.tone || onboarding.tone || 'warn'
  };
}

function renderAgentOnboarding(agent) {
  if (!els.agentOnboarding) return;
  if (!agent) {
    els.agentOnboarding.textContent = 'Select an agent row.';
    return;
  }
  if (state.onboardingLoading?.[agent.id]) {
    els.agentOnboarding.textContent = 'Running onboarding check...';
    return;
  }
  if (!canCheckAgentOnboarding(agent)) {
    els.agentOnboarding.textContent = 'Onboarding check is available to the agent owner after login.';
    return;
  }
  const record = currentAgentOnboarding(agent.id);
  if (!record) {
    els.agentOnboarding.textContent = 'No onboarding result loaded yet. Use CHECK.';
    return;
  }
  if (record.error) {
    els.agentOnboarding.textContent = `Onboarding check failed.\n\nerror: ${record.error}`;
    return;
  }
  const onboarding = record.onboarding || {};
  const repoInfo = agentGithubRepo(agent);
  const automationReady = canAutomateAgentSetup(agent, record);
  const automationPrepared = adapterAutomationAlreadyPrepared(repoInfo);
  const failedChecks = (onboarding.checks || []).filter((item) => String(item?.status || '').toLowerCase() !== 'pass');
  const lines = [
    `Status: ${onboarding.status || '-'}`,
    `Checked: ${formatTime(onboarding.checkedAt)}`,
    `Summary: ${onboarding.summary || '-'}`,
    `Next step: ${onboarding.nextAction?.title || '-'}`,
    ''
  ];
  if (failedChecks.length) {
    lines.push('Blocking checks:');
    failedChecks.slice(0, 4).forEach((item) => {
      lines.push(`- ${item.title}: ${item.detail}`);
      if (item.fix) lines.push(`  Fix: ${item.fix}`);
    });
  } else {
    lines.push('Blocking checks: none');
  }
  if (automationReady) {
    lines.push(
      '',
      'Automation:',
      `GitHub automation is available for ${repoInfo.fullName}.`,
      `Run CHECK and confirm the adapter PR prompt if you want ${PRODUCT_SHORT_NAME} to prepare the hosted routes.`
    );
  } else if (automationPrepared) {
    lines.push(
      '',
      'Automation:',
      `Adapter PR already prepared for ${repoInfo.fullName}.`,
      'Merge the PR, deploy the app, then import the hosted manifest and rerun CHECK.'
    );
  } else if (repoInfo.fullName && !repoInfo.installationId) {
    lines.push(
      '',
      'Automation:',
      `Repo detected (${repoInfo.fullName}) but GitHub App install access is not available in this session.`,
      'Use INSTALL APP for that repo, then rerun CHECK to allow automatic adapter PR creation.'
    );
  }
  els.agentOnboarding.textContent = lines.join('\n');
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

function makeParallelDraftId() {
  return `draft_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function orderInputFromComposer() {
  const parsedUrls = normalizeOrderInputUrls(els.jobUrls?.value || '');
  const files = Array.isArray(state.orderInputFiles)
    ? state.orderInputFiles.map((file) => normalizeOrderInputFile(file)).filter((file) => file.content)
    : [];
  let totalChars = 0;
  const clippedFiles = [];
  for (const file of files) {
    if (totalChars >= ORDER_INPUT_TOTAL_FILE_CHARS) break;
    let content = String(file.content || '');
    let truncated = Boolean(file.truncated);
    if (totalChars + content.length > ORDER_INPUT_TOTAL_FILE_CHARS) {
      const available = Math.max(0, ORDER_INPUT_TOTAL_FILE_CHARS - totalChars);
      if (!available) break;
      content = `${content.slice(0, available)}\n\n[truncated]`;
      truncated = true;
    }
    totalChars += content.length;
    clippedFiles.push({
      name: file.name,
      type: file.type,
      size: file.size,
      content,
      truncated
    });
  }
  const input = {};
  if (parsedUrls.urls.length) input.urls = parsedUrls.urls;
  if (clippedFiles.length) input.files = clippedFiles;
  return Object.keys(input).length ? input : null;
}

function renderOrderInputFilesSummary() {
  if (!els.jobFilesSummary) return;
  const parsedUrls = normalizeOrderInputUrls(els.jobUrls?.value || '');
  const files = Array.isArray(state.orderInputFiles)
    ? state.orderInputFiles.map((file) => normalizeOrderInputFile(file)).filter((file) => file.content)
    : [];
  const warnings = Array.isArray(state.orderInputFileWarnings) ? state.orderInputFileWarnings : [];
  const lines = [
    `URLs: ${parsedUrls.urls.length}${parsedUrls.omitted ? ` (${parsedUrls.omitted} ignored)` : ''}`,
    `Files: ${files.length}`
  ];
  if (files.length) {
    const listed = files.slice(0, 3).map((file) => `- ${file.name} (${formatBytes(file.size)}${file.truncated ? ', truncated' : ''})`);
    lines.push('', ...listed);
    if (files.length > 3) lines.push(`...and ${files.length - 3} more file(s)`);
  }
  if (warnings.length) {
    lines.push('', `Notes: ${warnings.slice(0, 2).join(' | ')}`);
  }
  els.jobFilesSummary.textContent = lines.join('\n');
  const tone = warnings.length || parsedUrls.omitted ? 'warn' : (files.length || parsedUrls.urls.length ? 'ok' : 'info');
  els.jobFilesSummary.className = `detail-box action-card ${tone} compact-card`;
}

async function handleOrderFilesChanged() {
  if (!els.jobFiles) return;
  const selected = Array.from(els.jobFiles.files || []);
  const warnings = [];
  const files = [];
  if (selected.length > ORDER_INPUT_MAX_FILES) {
    warnings.push(`Only the first ${ORDER_INPUT_MAX_FILES} files were used.`);
  }
  let totalChars = 0;
  for (const file of selected.slice(0, ORDER_INPUT_MAX_FILES)) {
    if (!isOrderInputFileSupported(file)) {
      warnings.push(`Skipped unsupported file type: ${file.name}`);
      continue;
    }
    if (Number(file.size || 0) > ORDER_INPUT_MAX_FILE_BYTES) {
      warnings.push(`Skipped ${file.name}: larger than ${formatBytes(ORDER_INPUT_MAX_FILE_BYTES)}.`);
      continue;
    }
    let content = String(await file.text()).replace(/\u0000/g, '').trim();
    if (!content) {
      warnings.push(`Skipped ${file.name}: empty file.`);
      continue;
    }
    let truncated = false;
    if (content.length > ORDER_INPUT_MAX_FILE_CHARS) {
      content = `${content.slice(0, ORDER_INPUT_MAX_FILE_CHARS)}\n\n[truncated]`;
      truncated = true;
    }
    if (totalChars >= ORDER_INPUT_TOTAL_FILE_CHARS) {
      warnings.push(`Total file text limit reached (${ORDER_INPUT_TOTAL_FILE_CHARS} chars).`);
      break;
    }
    if (totalChars + content.length > ORDER_INPUT_TOTAL_FILE_CHARS) {
      const available = ORDER_INPUT_TOTAL_FILE_CHARS - totalChars;
      if (available <= 0) {
        warnings.push(`Total file text limit reached (${ORDER_INPUT_TOTAL_FILE_CHARS} chars).`);
        break;
      }
      content = `${content.slice(0, available)}\n\n[truncated]`;
      truncated = true;
      warnings.push(`Trimmed ${file.name} to stay within total file text limit.`);
    }
    totalChars += content.length;
    files.push({
      name: String(file.name || 'source.txt'),
      type: String(file.type || inferTextMimeFromName(file.name)),
      size: Number(file.size || 0),
      content,
      truncated
    });
  }
  state.orderInputFiles = files;
  state.orderInputFileWarnings = warnings;
  renderOrderComposer();
}

function currentOrderDraft() {
  let input = orderInputFromComposer();
  const requestedStrategy = requestedOrderStrategy();
  const effectivePrompt = currentEffectiveOrderPrompt();
  const preparedSeed = currentServerPreparedOrderForPrompt(effectivePrompt);
  const taskType = openChatCanonicalOrderTaskType(preparedSeed?.taskType || currentRoutingTask(), effectivePrompt) || preparedSeed?.taskType || currentRoutingTask() || 'research';
  const safePrompt = isStructuredOrderBrief(effectivePrompt)
    ? rewriteStructuredBriefTaskType(effectivePrompt, taskType)
    : effectivePrompt;
  const selectedAgentId = String(els.jobAgentId?.value || '').trim();
  const selectedAgent = selectedAgentId
    ? (state.snapshot?.agents || []).find((agent) => agent.id === selectedAgentId) || null
    : null;
  const safeAgentId = selectedAgent && agentTaskFit(selectedAgent, taskType).matches ? selectedAgentId : '';
  const routingDecision = preparedSeed
    ? {
      strategy: preparedSeed.resolvedOrderStrategy || orderRoutingDecision(taskType, safePrompt, requestedStrategy).strategy,
      requested: preparedSeed.requestedOrderStrategy || requestedStrategy,
      plan: orderRoutingDecision(taskType, safePrompt, requestedStrategy).plan,
      routeHint: preparedSeed.routeHint || '',
      reason: preparedSeed.reason || ''
    }
    : orderRoutingDecision(taskType, safePrompt, requestedStrategy);
  const intakeAnswer = String(els.intakeAnswer?.value || state.intakeAnswer || '').trim();
  if (state.intakeConfirmed && state.pendingIntake) {
    input = {
      ...(input || {}),
      _broker: {
        ...((input && input._broker) || {}),
        intake: {
          ...state.pendingIntake,
          answer: intakeAnswer,
          answered: true
        }
      }
    };
  }
  return {
    id: makeParallelDraftId(),
    parent_agent_id: els.jobParent?.value || 'cloudcode-main',
    order_strategy: requestedStrategy,
    resolved_order_strategy: routingDecision.strategy,
    route_plan: routingDecision.plan,
    task_type: taskType,
    agent_id: safeAgentId,
    prompt: safePrompt,
    budget_cap: Number(els.jobBudget?.value || 300),
    deadline_sec: Number(els.jobDeadline?.value || 120),
    followup_to_job_id: state.followupToJobId || undefined,
    confirmation: state.pendingOrderConfirmation?.accepted ? {
      accepted: true,
      agent_id: state.pendingOrderConfirmation.agentId || undefined,
      accepted_at: state.pendingOrderConfirmation.acceptedAt || new Date().toISOString()
    } : undefined,
    input: input || undefined
  };
}

function clearFollowupContext(options = {}) {
  state.followupToJobId = '';
  state.followupSourceTaskType = '';
  state.followupSourceAgentId = '';
  if (!options.keepAnswer && els.followupAnswer) els.followupAnswer.value = '';
  renderOrderComposer();
}

function clearIntakeContext(options = {}) {
  state.pendingIntake = null;
  state.intakeConfirmed = false;
  state.intakeAnswer = '';
  if (!options.keepAnswer && els.intakeAnswer) els.intakeAnswer.value = '';
  renderOrderComposer();
}

function renderIntakePanel() {
  if (!els.intakePanel || !els.intakeQuestionCard) return;
  const intake = state.pendingIntake;
  if (!intake) {
    setElementVisible(els.intakePanel, false);
    return;
  }
  const questions = Array.isArray(intake.questions) ? intake.questions : [];
  const lines = [
    state.intakeConfirmed ? 'Clarification answers are applied.' : `${PRODUCT_SHORT_NAME} needs a few details before billing or dispatch.`,
    '',
    `Original request: ${intake.originalPrompt || '-'}`,
    '',
    ...questions.map((question, index) => `${index + 1}. ${question}`),
    '',
    state.intakeConfirmed
      ? 'Clarification context is attached. SEND ORDER will use the answered details.'
      : 'Answer these, then APPLY ANSWERS. CAIt will not dispatch until the missing details are supplied.'
  ];
  els.intakeQuestionCard.textContent = lines.join('\n');
  els.intakePanel.className = `detail-box action-card ${state.intakeConfirmed ? 'ok' : 'warn'} compact-card`;
  setElementVisible(els.intakePanel, true);
}

function handleNeedsInputResponse(response = {}, draft = {}) {
  state.pendingIntake = chatEngineBuildIntakeState(response, draft.prompt || response.prompt || '', {
    taskType: response.inferred_task_type || draft.task_type || 'research'
  });
  state.intakeConfirmed = false;
  state.intakeAnswer = '';
  if (els.intakeAnswer) els.intakeAnswer.value = '';
  if (els.runCreateStatus) {
    els.runCreateStatus.textContent = [
      'More information needed.',
      '',
      response.message || 'Answer the clarification questions before this order is billed or dispatched.'
    ].join('\n');
    els.runCreateStatus.className = 'detail-box action-card warn compact-card';
  }
  renderOrderComposer();
  window.requestAnimationFrame(() => els.intakeAnswer?.focus());
  flash('Clarification questions returned. No order was billed or dispatched.', 'info');
}

function applyIntakeAnswers() {
  if (!state.pendingIntake) throw new Error('No clarification questions are active.');
  const answer = String(els.intakeAnswer?.value || '').trim();
  if (!answer) throw new Error('Answer the clarification questions first.');
  state.intakeAnswer = answer;
  state.intakeConfirmed = true;
  const original = String(state.pendingIntake.originalPrompt || els.jobPrompt?.value || '').trim();
  if (els.jobPrompt) {
    els.jobPrompt.value = chatEngineBuildIntakeCombinedPrompt(
      { ...state.pendingIntake, originalPrompt: original },
      answer
    );
  }
  renderOrderComposer();
  flash('Answers applied. SEND ORDER will run the clarified order.', 'ok');
}

function followupSourceJob() {
  if (!state.followupToJobId) return null;
  return state.snapshot?.jobs?.find((job) => job.id === state.followupToJobId) || null;
}

function renderFollowupContextCard() {
  if (!els.followupContextCard) return;
  const job = followupSourceJob();
  if (!state.followupToJobId) {
    setElementVisible(els.followupContextCard, false);
    return;
  }
  const taskType = state.followupSourceTaskType || job?.taskType || 'auto';
  const agentId = state.followupSourceAgentId || job?.assignedAgentId || 'auto-route';
  els.followupContextCard.textContent = [
    `Following up on order: ${state.followupToJobId.slice(0, 8)}`,
    `Previous task: ${taskType}`,
    `Target agent: ${agentId}`,
    'The next order will include the previous prompt, delivery summary, and clarifying questions.'
  ].join('\n');
  els.followupContextCard.className = 'detail-box action-card info compact-card';
  setElementVisible(els.followupContextCard, true);
}

function queuedDraftAgent(draft) {
  if (!draft?.agent_id) return null;
  return (state.snapshot?.agents || []).find((agent) => agent.id === draft.agent_id) || null;
}

function resolvedOrderStrategyOfDraft(draft = {}) {
  if (draft.resolved_order_strategy === 'single' || draft.resolved_order_strategy === 'multi') return draft.resolved_order_strategy;
  if (draft.order_strategy === 'single' || draft.order_strategy === 'multi') return draft.order_strategy;
  return orderRoutingDecision(draft.task_type, draft.prompt, draft.order_strategy || 'auto').strategy;
}

function routePlanOfDraft(draft = {}) {
  if (draft.route_plan) return draft.route_plan;
  return orderRoutingDecision(draft.task_type, draft.prompt, draft.order_strategy || 'auto').plan;
}

function estimateWindowOfDraft(draft) {
  if (!draft) return null;
  if (resolvedOrderStrategyOfDraft(draft) === 'multi') {
    const planned = routePlanOfDraft(draft);
    if (planned.picks.length < 2) return null;
    return planned.picks.reduce((acc, item) => {
      const estimate = estimateWindowOfAgent(item.agent, item.taskType, { prompt: draft.prompt, input: draft.input });
      acc.min += Number(estimate?.estimateMinTotal || 0);
      acc.max += Number(estimate?.estimateMaxTotal || 0);
      return acc;
    }, { min: 0, max: 0 });
  }
  const agent = queuedDraftAgent(draft) || readyAgentsForTask(draft.task_type)[0] || null;
  const estimate = estimateWindowOfAgent(agent, draft.task_type, { prompt: draft.prompt, input: draft.input });
  if (!estimate) return null;
  return { min: Number(estimate.estimateMinTotal || 0), max: Number(estimate.estimateMaxTotal || 0) };
}

function clearOrderComposerPrompt() {
  if (els.jobPrompt) els.jobPrompt.value = '';
  if (els.jobUrls) els.jobUrls.value = '';
  if (els.jobFiles) els.jobFiles.value = '';
  state.orderInputFiles = [];
  state.orderInputFileWarnings = [];
  state.followupToJobId = '';
  state.followupSourceTaskType = '';
  state.followupSourceAgentId = '';
  state.pendingIntake = null;
  state.intakeConfirmed = false;
  state.intakeAnswer = '';
  state.pendingOrderConfirmation = null;
  state.openChatPreparedBrief = '';
  state.openChatParallelPlan = [];
  state.openChatClarifyOptions = [];
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
  state.serverResolvedIntent = null;
  state.serverPreparedOrder = null;
  if (els.intakeAnswer) els.intakeAnswer.value = '';
  if (els.jobType) els.jobType.value = '';
  renderOrderComposer();
}

function ensureOrderFunding() {
  if (state.snapshot?.auth?.isPlatformAdmin) return;
  const billingProfile = state.stripeStatus?.billingProfile || state.snapshot?.monthlySummary?.customer || {};
  const accountStripe = state.stripeStatus?.stripe?.accountStripe || state.snapshot?.accountSettings?.stripe || {};
  const monthlyBillingReady = String(billingProfile.mode || '').toLowerCase() === 'monthly_invoice'
    && (Boolean(accountStripe.defaultPaymentMethodId) || String(accountStripe.defaultPaymentMethodStatus || '') === 'ready');
  const hasFunding = Number(billingProfile.fundingAvailable || 0) > 0
    || Number(billingProfile.welcomeCreditsAvailable || 0) > 0
    || Number(billingProfile.subscriptionCreditsAvailable || 0) > 0
    || monthlyBillingReady;
  if (!hasFunding) {
    openSettingsSection('payments');
    throw new Error(TEMPORARY_INVOICE_BILLING_ENABLED
      ? 'Payment required. Open PAYMENTS and use REQUEST INVOICE before ordering.'
      : 'Payment required. Open PAYMENTS and register a card before ordering.');
  }
}

function orderFundingErrorInfo(error) {
  const data = error?.data || {};
  const code = String(data?.code || '').trim().toLowerCase();
  const message = String(error?.message || '').trim();
  const billingProfile = state.stripeStatus?.billingProfile || state.snapshot?.monthlySummary?.customer || {};
  const account = state.snapshot?.accountSettings || {};
  const accountStripe = state.stripeStatus?.stripe?.accountStripe || account?.stripe || {};
  const configuredMode = String(account?.billing?.mode || billingProfile?.configuredMode || '').trim().toLowerCase();
  const savedCard = Boolean(accountStripe.defaultPaymentMethodId) || String(accountStripe.defaultPaymentMethodStatus || '') === 'ready';
  const paymentLike = Number(error?.status || 0) === 402
    || ['payment_required', 'payment_method_missing'].includes(code)
    || /payment|required|deposit|funding|balance/i.test(message);
  if (!paymentLike) return null;
  const registerCardRequired = true;
  const missingLedger = Number(data?.missing_amount ?? data?.missingAmount ?? 0);
  const estimatedLedger = Number(data?.estimated_cost?.total ?? data?.estimatedCost?.total ?? 0);
  const requiredLedger = missingLedger > 0 ? missingLedger : estimatedLedger;
  const missingUsd = Math.max(0, ledgerAmountToDisplayCurrency(requiredLedger));
  return {
    code,
    message,
    action: registerCardRequired ? 'register_card' : 'funding',
    missingUsd,
    suggestedUsd: 0,
    estimatedBilling: data?.estimated_cost || null
  };
}

function handleOrderFundingPrompt(error, draft = {}, options = {}) {
  const info = orderFundingErrorInfo(error);
  if (!info) return false;
  const prompt = draft.prompt || fallbackPromptFromOrderInput(draft.input || null) || 'Order request';
  if (info.action === 'register_card') {
    appendOrderChatExchange(prompt, {
      kind: 'clarify',
      tone: 'warn',
      body: [
        'Card registration is required before I can send this order.',
        '',
        'The correct next step is REGISTER CARD for month-end billing.',
        info.missingUsd > 0 ? `Order estimate: ${formatDisplayCurrency(info.missingUsd)}` : '',
        '',
        'Register a card in SETTINGS > PAYMENTS, then return to CAIt Chat and press SEND ORDER again.'
      ].filter(Boolean).join('\n'),
      actions: [
        { action: 'register_card', label: 'REGISTER CARD' },
        { action: 'open_payments', label: 'OPEN PAYMENTS' }
      ],
      status: 'Card registration required before dispatch.'
    }, { tone: 'warn', nextPrompt: prompt });
    openSettingsSection('payments');
    flash('Register a card before dispatch.', 'warn');
    void trackConversionEvent('payment_required_shown', {
      ...(options.analytics || summarizeOrderDraftForAnalytics(draft, options.source || 'work_chat')),
      status: 'register_card_required',
      missingUsd: info.missingUsd
    });
    return true;
  }
}

function preflightFromError(error = null) {
  if (error?.preflight) return error.preflight;
  const data = error?.data && typeof error.data === 'object' ? error.data : {};
  if (data.code === 'agent_unavailable') {
    return {
      ok: false,
      code: 'agent_unavailable',
      error: data.error || 'No ready agent is available for this task.'
    };
  }
  if (data.needs_confirmation || data.code === 'confirmation_required') {
    return {
      ok: false,
      code: 'confirmation_required',
      agent: data.agent_id ? { id: data.agent_id, name: data.agent_name || data.agent_id } : null,
      riskLevel: data.risk_level || 'confirm_required',
      confirmationRequiredFor: Array.isArray(data.confirmation_required_for) ? data.confirmation_required_for : [],
      error: data.error || 'Explicit confirmation is required before this agent can run.'
    };
  }
  if (data.needs_connector || data.code === 'connector_required') {
    return {
      ok: false,
      code: 'connector_required',
      agent: data.agent_id ? { id: data.agent_id, name: data.agent_name || data.agent_id } : null,
      missingConnectors: Array.isArray(data.missing_connectors) ? data.missing_connectors : [],
      missingConnectorCapabilities: Array.isArray(data.missing_connector_capabilities) ? data.missing_connector_capabilities : [],
      connectorStatus: data.connector_status || {},
      error: data.error || 'Connector setup is required before this agent can run.'
    };
  }
  return null;
}

function connectorActionForChat(connector = '') {
  const normalized = normalizeClientConnector(connector);
  if (normalized === 'github') return { action: 'connect_github', label: connectorActionLabel('connect_github'), connector: normalized };
  if (normalized === 'google') return { action: 'connect_google', label: connectorActionLabel('connect_google'), connector: normalized };
  if (normalized === 'x') return { action: 'connect_x', label: connectorActionLabel('connect_x'), connector: normalized };
  if (normalized === 'stripe') return { action: 'open_payments', label: 'OPEN PAYMENTS', connector: normalized };
  return { action: 'open_settings', label: 'OPEN SETTINGS', connector: normalized };
}

function handleOrderPreflightPrompt(error, draft = {}, options = {}) {
  const preflight = preflightFromError(error);
  if (!preflight || preflight.ok) return false;
  const prompt = draft.prompt || fallbackPromptFromOrderInput(draft.input) || 'order preflight';
  if (preflight.code === 'confirmation_required') {
    const agentName = preflight.agent?.name || 'the selected agent';
    const required = Array.isArray(preflight.confirmationRequiredFor) && preflight.confirmationRequiredFor.length
      ? preflight.confirmationRequiredFor.join(', ')
      : (preflight.riskLevel || 'confirm_required');
    appendOrderChatExchange(prompt, {
      kind: 'clarify',
      tone: 'warn',
      body: [
        `${agentName} needs explicit confirmation before dispatch.`,
        '',
        `Reason: ${required}`,
        '',
        'No order was created and no billing occurred.',
        '',
        'If this is intentional, press Send order. Otherwise edit the request or choose another agent.'
      ].join('\n'),
      actions: [
        { action: 'confirm_order', label: 'Send order', agentId: preflight.agent?.id || draft.agent_id || '' }
      ],
      status: 'Confirmation required before dispatch.\n\nNo order was created and no billing occurred.'
    }, { tone: 'warn', nextPrompt: prompt });
    void trackConversionEvent('order_confirmation_required', {
      ...(options.analytics || summarizeOrderDraftForAnalytics(draft, 'order_preflight')),
      agentId: preflight.agent?.id || draft.agent_id || '',
      status: 'confirmation_required'
    });
    return true;
  }
  if (preflight.code === 'connector_required') {
    const missing = Array.isArray(preflight.missingConnectors) ? preflight.missingConnectors : [];
    const capabilities = Array.isArray(preflight.missingConnectorCapabilities) ? preflight.missingConnectorCapabilities : [];
    appendOrderChatExchange(prompt, {
      kind: 'clarify',
      tone: 'warn',
      body: [
        `${preflight.agent?.name || 'The selected agent'} needs connector setup before it can run.`,
        '',
        `Missing: ${missing.length ? missing.join(', ') : 'connector access'}`,
        ...(capabilities.length ? ['', `Required authority: ${capabilities.join(', ')}`] : []),
        '',
        'No order was created and no billing occurred.',
        '',
        'Connect the required account, then SEND again.'
      ].join('\n'),
      actions: missing.slice(0, 3).map(connectorActionForChat),
      status: 'Connector setup required before dispatch.\n\nNo order was created and no billing occurred.'
    }, { tone: 'warn', nextPrompt: prompt });
    void trackConversionEvent('order_connector_required', {
      ...(options.analytics || summarizeOrderDraftForAnalytics(draft, 'order_preflight')),
      agentId: preflight.agent?.id || draft.agent_id || '',
      status: 'connector_required'
    });
    return true;
  }
  if (preflight.code === 'agent_unavailable') {
    appendOrderChatExchange(prompt, {
      kind: 'clarify',
      tone: 'warn',
      body: [
        'No ready agent is available for this order yet.',
        '',
        preflight.error || 'Finish onboarding a compatible agent or adjust the request.',
        '',
        'No order was created and no billing occurred.'
      ].join('\n'),
      status: 'No ready agent available before dispatch.\n\nNo order was created and no billing occurred.'
    }, { tone: 'warn', nextPrompt: prompt });
    void trackConversionEvent('order_agent_unavailable', {
      ...(options.analytics || summarizeOrderDraftForAnalytics(draft, 'order_preflight')),
      status: 'agent_unavailable'
    });
    return true;
  }
  return false;
}

function validateOrderDraft(draft, options = {}) {
  const { checkAccess = false, checkFunding = checkAccess } = options;
  const auth = state.snapshot?.auth || {};
  if (checkAccess && !canOrderFromBrowser(auth)) {
    flash('Sign-in required. Redirecting...', 'info');
    void trackConversionEvent('sign_in_required_shown', summarizeOrderDraftForAnalytics(draft, 'order_validation'));
    const signInUrl = primarySignInUrl(auth);
    trackLoginStarted(signInUrl.includes('/auth/google') ? 'google' : 'github');
    window.location.href = signInUrl;
    throw new Error('Sign-in required.');
  }
  const inputCounts = orderInputCounts(draft?.input || null);
  if (!String(draft?.prompt || '').trim() && !inputCounts.urlCount && !inputCounts.fileCount) {
    throw new Error('Write a request or add source URLs/files first.');
  }
  if (state.pendingIntake && !state.intakeConfirmed) {
    throw new Error('Answer the clarification questions first.');
  }
  if (checkFunding) ensureOrderFunding();
  const resolvedStrategy = resolvedOrderStrategyOfDraft(draft);
  const plan = routePlanOfDraft(draft);
  if (resolvedStrategy === 'multi' && draft.agent_id) {
    throw new Error('Clear the pinned agent before sending an Agent Team objective.');
  }
  if (resolvedStrategy === 'multi' && plan.picks.length < 2) {
    throw new Error('Need at least 2 ready agents before sending an Agent Team objective.');
  }
  const pinnedAgent = queuedDraftAgent(draft);
  if (resolvedStrategy !== 'multi' && pinnedAgent && !agentHealth(pinnedAgent).ready) {
    throw new Error('Pinned agent is not ready. Clear the pin or finish onboarding first.');
  }
  if (resolvedStrategy !== 'multi' && !draft.agent_id && !readyAgentsForTask(draft.task_type).length) {
    throw new Error('No ready agent for this task. Open AGENTS and finish onboarding or register a ready agent first.');
  }
  const preflight = clientOrderPreflight(draft);
  if (!preflight.ok) {
    const error = new Error(preflight.error || 'Order preflight blocked dispatch.');
    error.preflight = preflight;
    throw error;
  }
}

function renderParallelOrderQueue() {
  if (!els.parallelOrderSummary || !els.parallelOrderQueue) return;
  const drafts = Array.isArray(state.parallelOrderDrafts) ? state.parallelOrderDrafts : [];
  if (!drafts.length) {
    els.parallelOrderSummary.textContent = 'No parallel orders queued. Use ADD TO PARALLEL to prepare several independent orders, then CREATE ALL to send them together.';
    els.parallelOrderSummary.className = 'detail-box action-card info compact-card';
    els.parallelOrderQueue.innerHTML = '';
    if (els.createParallelJobsBtn) els.createParallelJobsBtn.textContent = 'CREATE ALL';
    if (els.clearParallelJobsBtn) els.clearParallelJobsBtn.disabled = true;
    return;
  }
  const totals = drafts.reduce((acc, draft) => {
    const estimate = estimateWindowOfDraft(draft);
    acc.min += Number(estimate?.min || 0);
    acc.max += Number(estimate?.max || 0);
    return acc;
  }, { min: 0, max: 0 });
  els.parallelOrderSummary.textContent = [
    `${drafts.length} order${drafts.length === 1 ? '' : 's'} queued for parallel dispatch.`,
    totals.max > 0 ? `Estimated total: ${yen(totals.min)} – ${yen(totals.max)}` : 'Estimate appears when ready agents are available.',
    'Each order is funded independently. If balance runs out, any failed drafts stay in this queue.'
  ].join('\n');
  els.parallelOrderSummary.className = 'detail-box action-card ok compact-card';
  els.parallelOrderQueue.innerHTML = drafts.map((draft, index) => {
    const agent = queuedDraftAgent(draft);
    const resolvedStrategy = resolvedOrderStrategyOfDraft(draft);
    const route = resolvedStrategy === 'multi'
      ? 'auto Agent Team'
      : (agent ? `agent:${agent.name}` : 'agent:auto');
    const input = draft?.input && typeof draft.input === 'object' ? draft.input : null;
    const counts = orderInputCounts(input);
    const sources = `urls:${counts.urlCount} · files:${counts.fileCount}`;
    const title = clipText(draft.prompt || fallbackPromptFromOrderInput(input), 112);
    const estimate = estimateWindowOfDraft(draft);
    const estimateLabel = estimate?.max > 0 ? `${yen(estimate.min)} – ${yen(estimate.max)}` : 'estimating...';
    return `
      <div class="parallel-order-row" data-draft-id="${escapeHtml(draft.id)}">
        <div>
          <strong>${escapeHtml(`${index + 1}. ${title}`)}</strong>
          <div class="row-muted">${escapeHtml(`task:${draft.task_type} · ${route} · ${sources} · estimate:${estimateLabel}`)}</div>
        </div>
        <div class="helper-row">
          <button type="button" class="mini-btn" data-draft-action="load" data-draft-id="${escapeHtml(draft.id)}">LOAD</button>
          <button type="button" class="mini-btn" data-draft-action="remove" data-draft-id="${escapeHtml(draft.id)}">REMOVE</button>
        </div>
      </div>
    `;
  }).join('');
  if (els.createParallelJobsBtn) els.createParallelJobsBtn.textContent = `CREATE ALL (${drafts.length})`;
  if (els.clearParallelJobsBtn) els.clearParallelJobsBtn.disabled = false;
  els.parallelOrderQueue.querySelectorAll('[data-draft-action="remove"]').forEach((button) => {
    button.onclick = () => {
      state.parallelOrderDrafts = state.parallelOrderDrafts.filter((draft) => draft.id !== button.dataset.draftId);
      renderParallelOrderQueue();
    };
  });
  els.parallelOrderQueue.querySelectorAll('[data-draft-action="load"]').forEach((button) => {
    button.onclick = () => {
      const draft = state.parallelOrderDrafts.find((item) => item.id === button.dataset.draftId);
      if (!draft) return;
      if (els.jobParent) els.jobParent.value = draft.parent_agent_id || 'cloudcode-main';
      loadOrderDraftIntoComposer({
        taskType: draft.task_type || '',
        agentId: draft.agent_id || '',
        prompt: draft.prompt || '',
        budgetCap: draft.budget_cap ?? 300,
        deadlineSec: draft.deadline_sec ?? 120,
        orderStrategy: draft.order_strategy || 'auto'
      });
      if (els.jobUrls) els.jobUrls.value = Array.isArray(draft?.input?.urls) ? draft.input.urls.join('\n') : '';
      state.orderInputFiles = Array.isArray(draft?.input?.files)
        ? draft.input.files.map((file) => normalizeOrderInputFile(file)).filter((file) => file.content)
        : [];
      state.orderInputFileWarnings = [];
      if (els.jobFiles) els.jobFiles.value = '';
      renderOrderComposer();
      flash('Loaded queued order back into the composer.', 'ok');
    };
  });
}

function renderOrderInputGuide() {
  if (!els.orderInputGuide) return;
  const prompt = String(els.jobPrompt?.value || '').trim();
  const inputCounts = orderInputCounts(orderInputFromComposer());
  const inferredTask = currentRoutingTask() || 'research';
  const pinnedAgent = currentRunTargetAgent();
  if (!prompt && !inputCounts.urlCount && !inputCounts.fileCount) {
    els.orderInputGuide.textContent = [
      `${PRODUCT_SHORT_NAME} will infer the task and route it.`,
      'Write the outcome you want, choose a template, or open settings to attach source URLs/files.',
      'Built-in orders do not require your own model-provider API key.'
    ].join('\n');
    els.orderInputGuide.className = 'detail-box action-card info compact-card';
    return;
  }
  const routingDecision = orderRoutingDecision(inferredTask, prompt);
  const routeText = routingDecision.strategy === 'multi'
    ? `${orderStrategyLabel()} · ${routingDecision.reason}`
    : (pinnedAgent ? `pinned agent: ${pinnedAgent.name}` : 'auto route');
  els.orderInputGuide.textContent = [
    `Task: ${inferredTask}`,
    `Route: ${routeText}`,
    `Sources: urls=${inputCounts.urlCount} files=${inputCounts.fileCount}`,
    'Use settings only if source material or routing looks wrong.'
  ].join('\n');
  els.orderInputGuide.className = 'detail-box action-card ok compact-card';
}

function providerMarkupRateOf(agent) {
  return Number(agent?.providerMarkupRate ?? agent?.tokenMarkupRate ?? agent?.creatorFeeRate ?? agent?.premiumRate ?? 0.1);
}

function platformMarginRateOf(_agent) {
  return 0.1;
}

function normalizeClientPricingModel(value = '') {
  const raw = String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (!raw) return 'usage_based';
  if (['usage', 'usage_pricing', 'metered'].includes(raw)) return 'usage_based';
  if (['fixed', 'fixed_run', 'per_run', 'fixed_price'].includes(raw)) return 'fixed_per_run';
  if (['subscription', 'monthly', 'monthly_subscription'].includes(raw)) return 'subscription_required';
  if (['subscription_plus_usage', 'subscription_plus_overage', 'hybrid_subscription'].includes(raw)) return 'hybrid';
  return ['usage_based', 'fixed_per_run', 'subscription_required', 'hybrid'].includes(raw) ? raw : 'usage_based';
}

function normalizeClientOverageMode(value = '', fallback = 'usage_based') {
  const raw = String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (!raw) return fallback;
  if (['included', 'none', 'plan_included'].includes(raw)) return 'included';
  if (['usage', 'usage_pricing', 'metered'].includes(raw)) return 'usage_based';
  if (['fixed', 'fixed_run', 'per_run', 'fixed_price'].includes(raw)) return 'fixed_per_run';
  return ['included', 'usage_based', 'fixed_per_run'].includes(raw) ? raw : fallback;
}

function agentPricingManifest(agent) {
  const manifest = agentManifest(agent);
  return manifest?.pricing && typeof manifest.pricing === 'object' ? manifest.pricing : {};
}

function agentPricingConfig(agent) {
  const pricing = agentPricingManifest(agent);
  const pricingModel = normalizeClientPricingModel(agent?.pricingModel ?? agent?.pricing_model ?? pricing.pricing_model ?? pricing.pricingModel);
  const fixedRunPriceUsd = Number(agent?.fixedRunPriceUsd ?? agent?.fixed_run_price_usd ?? pricing.fixed_run_price_usd ?? pricing.fixedRunPriceUsd ?? pricing.run_price_usd ?? pricing.runPriceUsd ?? 0) || 0;
  const subscriptionMonthlyPriceUsd = Number(agent?.subscriptionMonthlyPriceUsd ?? agent?.subscription_monthly_price_usd ?? pricing.subscription_monthly_price_usd ?? pricing.subscriptionMonthlyPriceUsd ?? pricing.monthly_price_usd ?? pricing.monthlyPriceUsd ?? 0) || 0;
  const overageMode = normalizeClientOverageMode(agent?.overageMode ?? agent?.overage_mode ?? pricing.overage_mode ?? pricing.overageMode, pricingModel === 'hybrid' ? 'usage_based' : 'included');
  const overageFixedRunPriceUsd = Number(agent?.overageFixedRunPriceUsd ?? agent?.overage_fixed_run_price_usd ?? pricing.overage_fixed_run_price_usd ?? pricing.overageFixedRunPriceUsd ?? 0) || 0;
  return {
    pricingModel,
    fixedRunPriceUsd,
    subscriptionMonthlyPriceUsd,
    overageMode,
    overageFixedRunPriceUsd
  };
}

function pricingModelLabel(agent) {
  const pricing = agentPricingConfig(agent);
  if (pricing.pricingModel === 'fixed_per_run') return `${formatDisplayCurrency(pricing.fixedRunPriceUsd)}/run`;
  if (pricing.pricingModel === 'subscription_required') return `${formatDisplayCurrency(pricing.subscriptionMonthlyPriceUsd)}/mo provider plan`;
  if (pricing.pricingModel === 'hybrid') {
    const overage = pricing.overageMode === 'fixed_per_run'
      ? `${formatDisplayCurrency(pricing.overageFixedRunPriceUsd)}/run`
      : (pricing.overageMode === 'included' ? 'included usage' : 'usage overage');
    return `${formatDisplayCurrency(pricing.subscriptionMonthlyPriceUsd)}/mo provider plan + ${overage}`;
  }
  return `${(providerMarkupRateOf(agent) * 100).toFixed(1)}% provider markup`;
}

function syncAgentPricingEditorVisibility() {
  const model = normalizeClientPricingModel(els.agentPricingModel?.value || 'usage_based');
  if (els.agentPricingMarkup) els.agentPricingMarkup.disabled = model === 'fixed_per_run' || model === 'subscription_required';
  if (els.agentPricingFixedRunUsd) els.agentPricingFixedRunUsd.disabled = model !== 'fixed_per_run';
  if (els.agentPricingMonthlyUsd) els.agentPricingMonthlyUsd.disabled = !(model === 'subscription_required' || model === 'hybrid');
  if (els.agentPricingOverageMode) els.agentPricingOverageMode.disabled = model !== 'hybrid';
  if (els.agentPricingOverageFixedUsd) {
    const overageMode = normalizeClientOverageMode(els.agentPricingOverageMode?.value || '', model === 'hybrid' ? 'usage_based' : 'included');
    els.agentPricingOverageFixedUsd.disabled = !(model === 'hybrid' && overageMode === 'fixed_per_run');
  }
}

function agentPricingGuideText(agent = null) {
  const model = normalizeClientPricingModel(els.agentPricingModel?.value || agentPricingConfig(agent || {}).pricingModel || 'usage_based');
  if (model === 'fixed_per_run') {
    return 'Fixed per run: the end user pays one fixed USD amount for each run. CAIt keeps 10% of that run price.';
  }
  if (model === 'subscription_required') {
    return 'Provider monthly subscription: the SaaS provider pays the monthly fee lane. CAIt keeps 10% of that monthly fee. End-user order estimate stays at zero unless a separate overage exists.';
  }
  if (model === 'hybrid') {
    return 'Hybrid: the SaaS provider pays the monthly fee lane, and the end user pays only the declared overage lane. CAIt keeps 10% of provider monthly fees separately from end-user order billing.';
  }
  return 'Usage-based: the end user pays measured usage plus provider markup. Provider markup can be 0-100%. CAIt platform margin stays fixed at 10% of the end-user order total.';
}

function estimateWindowOfAgent(agent, taskType = currentRoutingTask(), options = {}) {
  if (!agent) return null;
  const map = {
    research: { minSec: 35, maxSec: 240, minApi: 2, maxApi: 10 },
    summary: { minSec: 25, maxSec: 120, minApi: 1, maxApi: 4 },
    writing: { minSec: 45, maxSec: 220, minApi: 2, maxApi: 10 },
    seo: { minSec: 40, maxSec: 180, minApi: 3, maxApi: 12 },
    pricing: { minSec: 45, maxSec: 240, minApi: 3, maxApi: 12 },
    prompt_brushup: { minSec: 20, maxSec: 90, minApi: 1, maxApi: 4 },
    listing: { minSec: 30, maxSec: 160, minApi: 2, maxApi: 8 },
    code: { minSec: 90, maxSec: 720, minApi: 6, maxApi: 30 },
    debug: { minSec: 120, maxSec: 620, minApi: 6, maxApi: 28 },
    automation: { minSec: 110, maxSec: 560, minApi: 5, maxApi: 24 },
    ops: { minSec: 55, maxSec: 300, minApi: 3, maxApi: 14 }
  };
  const normalizedTaskType = String(taskType || '').toLowerCase();
  const picked = normalizedTaskType === 'list_creator'
    ? { minSec: 70, maxSec: 260, minApi: 2, maxApi: 10 }
    : (map[normalizedTaskType] || map.research);
  const providerMarkupRate = providerMarkupRateOf(agent);
  const platformMarginRate = platformMarginRateOf(agent);
  const pricing = agentPricingConfig(agent);
  const calcTotal = (apiCost) => {
    const providerMarkup = apiCost * providerMarkupRate;
    const subtotal = apiCost + providerMarkup;
    return subtotal / (1 - platformMarginRate);
  };
  const fixedRunTotal = (usd) => displayCurrencyToLedgerAmount(Number(usd || 0));
  let estimateMinTotal = calcTotal(picked.minApi);
  let estimateMaxTotal = calcTotal(picked.maxApi);
  let typicalTotal = calcTotal(Math.round((picked.minApi + picked.maxApi) / 2));
  let pricingNote = 'End-user billing = usage + provider markup + marketplace margin.';
  if (pricing.pricingModel === 'fixed_per_run') {
    estimateMinTotal = fixedRunTotal(pricing.fixedRunPriceUsd);
    estimateMaxTotal = estimateMinTotal;
    typicalTotal = estimateMinTotal;
    pricingNote = 'End-user billing = fixed run price. Marketplace keeps 10% from that run price.';
  } else if (pricing.pricingModel === 'subscription_required') {
    estimateMinTotal = 0;
    estimateMaxTotal = 0;
    typicalTotal = 0;
    pricingNote = `Provider pricing = ${formatDisplayCurrency(pricing.subscriptionMonthlyPriceUsd)}/month. CAIt bills the provider 10% of that monthly fee, not the end user.`;
  } else if (pricing.pricingModel === 'hybrid') {
    if (pricing.overageMode === 'fixed_per_run') {
      estimateMinTotal = fixedRunTotal(pricing.overageFixedRunPriceUsd);
      estimateMaxTotal = estimateMinTotal;
      typicalTotal = estimateMinTotal;
      pricingNote = `Provider pricing = ${formatDisplayCurrency(pricing.subscriptionMonthlyPriceUsd)}/month with fixed end-user overage ${formatDisplayCurrency(pricing.overageFixedRunPriceUsd)}/run.`;
    } else if (pricing.overageMode === 'included') {
      estimateMinTotal = 0;
      estimateMaxTotal = 0;
      typicalTotal = 0;
      pricingNote = `Provider pricing = ${formatDisplayCurrency(pricing.subscriptionMonthlyPriceUsd)}/month with end-user usage included. CAIt bills the provider 10% of the monthly fee.`;
    } else {
      pricingNote = `Provider pricing = ${formatDisplayCurrency(pricing.subscriptionMonthlyPriceUsd)}/month, with end-user usage overage on top. CAIt bills the provider 10% of the monthly fee.`;
    }
  }
  let listCreatorPlan = null;
  if (normalizedTaskType === 'list_creator' && pricing.pricingModel === 'usage_based') {
    const promptForEstimate = options.prompt !== undefined
      ? options.prompt
      : currentEffectiveOrderPrompt();
    listCreatorPlan = listCreatorUsageEstimateForCount(inferListCreatorRequestedCount([
      promptForEstimate,
      options.input
    ]));
    estimateMinTotal = calcTotal(listCreatorPlan.usage.total_cost_basis);
    estimateMaxTotal = estimateMinTotal;
    typicalTotal = estimateMinTotal;
    picked.minSec = Math.max(picked.minSec, 70 * listCreatorPlan.batchCount);
    picked.maxSec = Math.max(picked.maxSec, 260 * listCreatorPlan.batchCount);
    pricingNote = `List Creator estimate = ${listCreatorPlan.requestedCount} companies, ${listCreatorPlan.batchCount} batch${listCreatorPlan.batchCount === 1 ? '' : 'es'} of ${LIST_CREATOR_BATCH_SIZE}. Public email/contact capture is included only when visibly public and source-traced.`;
  }
  return {
    durationMinSec: picked.minSec,
    durationMaxSec: picked.maxSec,
    estimateMinTotal,
    estimateMaxTotal,
    typicalTotal,
    confidence: agent.verificationStatus === 'verified' ? 'high' : 'medium',
    pricingModel: pricing.pricingModel,
    providerMonthlyUsd: pricing.subscriptionMonthlyPriceUsd,
    pricingNote,
    listCreatorPlan
  };
}

function agentVerification(agent) {
  return agent?.verificationDetails && typeof agent.verificationDetails === 'object'
    ? agent.verificationDetails
    : {};
}

function agentManifest(agent) {
  return agent?.metadata?.manifest && typeof agent.metadata.manifest === 'object'
    ? agent.metadata.manifest
    : {};
}

function agentTrustList(value, fallback = []) {
  const source = Array.isArray(value) ? value : (typeof value === 'string' ? value.split(/[,\n]/) : fallback);
  return [...new Set(source
    .map((item) => String(item || '').trim())
    .filter(Boolean))];
}

function agentTrustProfile(agent = {}) {
  const manifest = agentManifest(agent);
  const metadata = agent?.metadata && typeof agent.metadata === 'object' ? agent.metadata : {};
  const manifestMetadata = manifest.metadata && typeof manifest.metadata === 'object' ? manifest.metadata : {};
  const verification = agentVerification(agent);
  const verificationDetails = verification.details && typeof verification.details === 'object' ? verification.details : {};
  const source = agent?.trust && typeof agent.trust === 'object'
    ? agent.trust
    : (metadata.trust && typeof metadata.trust === 'object'
        ? metadata.trust
        : (manifest.trust && typeof manifest.trust === 'object'
            ? manifest.trust
            : (manifestMetadata.trust && typeof manifestMetadata.trust === 'object'
                ? manifestMetadata.trust
                : (verificationDetails.trust && typeof verificationDetails.trust === 'object' ? verificationDetails.trust : {}))));
  const verified = agent.verificationStatus === 'verified' || isManagedSampleAgent(agent);
  const score = Number(source.score);
  const level = String(source.level || (verified ? 'verified' : 'unverified')).trim().toLowerCase().replace(/[\s-]+/g, '_');
  const label = String(source.label || (verified ? 'Verified agent' : 'Unverified agent')).trim();
  const summary = String(source.summary || (verified
    ? 'Verified endpoint with delivery review; inspect evidence and acceptance checks before acting.'
    : 'Trust profile is not declared yet. Verify endpoint, owner, manifest, evidence policy, and delivery history before routing work.')).trim();
  const qualityChecks = agentTrustList(source.quality_checks || source.qualityChecks, verified
    ? ['Endpoint verification', 'Delivery review', 'Evidence/assumption separation']
    : ['Endpoint verification required', 'Manifest review required', 'Delivery history required']);
  const evidenceRequirements = agentTrustList(source.evidence_requirements || source.evidenceRequirements, ['Prompt, files, URLs, sources, connector proof, and approval where applicable']);
  const limitations = agentTrustList(source.limitations, ['Trust score is workflow assurance, not a guarantee of business correctness']);
  const tone = ['approval_gated', 'source_bound', 'orchestration_reviewed', 'verified', 'sample_verified'].includes(level)
    ? (level === 'approval_gated' ? 'warn' : 'ok')
    : 'info';
  return {
    version: String(source.version || 'agent-trust/client-derived'),
    level,
    label,
    score: Number.isFinite(score) ? score : (verified ? 82 : 45),
    summary,
    executionLayer: String(source.execution_layer || source.executionLayer || '').trim(),
    sourcePolicy: String(source.source_policy || source.sourcePolicy || '').trim(),
    actionPolicy: String(source.action_policy || source.actionPolicy || '').trim(),
    qualityChecks,
    evidenceRequirements,
    limitations,
    tone
  };
}

function agentRole(agent) {
  const manifest = agentManifest(agent);
  const metadata = agent?.metadata && typeof agent.metadata === 'object' ? agent.metadata : {};
  const raw = String(manifest.agent_role || manifest.agentRole || metadata.agentRole || metadata.agent_role || metadata.role || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (['leader', 'leader_agent', 'team_leader', 'manager', 'orchestrator', 'director', 'executive'].includes(raw)) return 'leader';
  if ((agent.taskTypes || []).some((task) => /(^|_)(leader|orchestration|planning)(_|$)/i.test(String(task || '')))) return 'leader';
  return 'worker';
}

function normalizeClientCompositionMode(value = '') {
  const raw = String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (!raw || ['provider', 'provider_orchestrated', 'provider_managed', 'external', 'external_orchestrated', 'self_orchestrated'].includes(raw)) {
    return 'provider_orchestrated';
  }
  if (['platform', 'platform_orchestrated', 'cait_orchestrated', 'broker_orchestrated'].includes(raw)) return 'platform_orchestrated';
  return raw;
}

function agentComposition(agent) {
  const manifest = agentManifest(agent);
  const rootMetadata = agent?.metadata && typeof agent.metadata === 'object' ? agent.metadata : {};
  const manifestMetadata = manifest.metadata && typeof manifest.metadata === 'object' ? manifest.metadata : {};
  const source = manifest.composition && typeof manifest.composition === 'object'
    ? manifest.composition
    : (rootMetadata.composition && typeof rootMetadata.composition === 'object'
        ? rootMetadata.composition
        : (manifestMetadata.composition && typeof manifestMetadata.composition === 'object' ? manifestMetadata.composition : {}));
  const rawComponents = Array.isArray(source.components)
    ? source.components
    : (Array.isArray(source.agents)
        ? source.agents
        : (Array.isArray(manifest.components) ? manifest.components : []));
  const components = rawComponents.map((component, index) => {
    const value = typeof component === 'string' ? { name: component } : (component && typeof component === 'object' ? component : {});
    const agentId = String(value.agent_id || value.agentId || '').trim();
    const name = String(value.name || value.id || agentId || `component_${index + 1}`).trim();
    const role = String(value.role || value.purpose || '').trim();
    const tasks = Array.isArray(value.task_types) ? value.task_types : (Array.isArray(value.taskTypes) ? value.taskTypes : []);
    const taskText = tasks.map((task) => String(task || '').trim()).filter(Boolean).join('/');
    const description = String(value.description || value.summary || '').trim();
    if (!name && !agentId && !role && !taskText && !description) return null;
    return { name, agentId, role, taskText, description };
  }).filter(Boolean);
  const mode = normalizeClientCompositionMode(source.mode || source.orchestration_mode || source.orchestrationMode || manifest.composition_mode || manifest.compositionMode || '');
  return {
    mode,
    components,
    workflowType: String(source.workflow_type || source.workflowType || source.type || '').trim().toLowerCase().replace(/[\s-]+/g, '_'),
    summary: String(source.summary || source.description || rootMetadata.composition_summary || manifestMetadata.composition_summary || '').trim(),
    deliveryModel: String(source.delivery_model || source.deliveryModel || source.delivery || '').trim() || (components.length ? 'single_delivery' : '')
  };
}

function agentProductKind(agent) {
  const manifest = agentManifest(agent);
  const rootMetadata = agent?.metadata && typeof agent.metadata === 'object' ? agent.metadata : {};
  const composition = agentComposition(agent);
  const raw = String(manifest.kind || manifest.agent_kind || manifest.agentKind || rootMetadata.kind || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (['group', 'agent_group', 'suite', 'agent_suite', 'agent_bundle', 'agent_pack', 'multi_work_product', 'multi_workstream_product'].includes(raw)) return 'agent_group';
  if (['composite', 'composite_agent', 'composite_agent_product', 'multi_agent', 'multi_agent_product', 'agent_system'].includes(raw)) return 'composite_agent';
  if (agentRole(agent) === 'leader') return 'agent';
  if (['group', 'suite'].includes(String(composition.workflowType || '').trim().toLowerCase())) return 'agent_group';
  if (composition.components.length >= 2) return 'composite_agent';
  return 'agent';
}

function isCompositeAgentProduct(agent) {
  return agentProductKind(agent) === 'composite_agent';
}

function isAgentSuiteProduct(agent) {
  return agentProductKind(agent) === 'agent_group';
}

function agentCompositionSummary(agent) {
  const composition = agentComposition(agent);
  if (isAgentSuiteProduct(agent)) {
    const count = composition.components.length;
    return `Agent group: ${count || 'multiple'} related agents · register each agent separately; CAIt can ask whether to run them as one flow or separate orders`;
  }
  if (!isCompositeAgentProduct(agent)) return '';
  const count = composition.components.length;
  const modeLabel = composition.mode === 'provider_orchestrated' ? 'provider orchestrated' : composition.mode.replace(/_/g, ' ');
  return `Composite product: ${modeLabel} · ${count || 'multiple'} internal agents · one CAIt order and one delivery`;
}

function normalizeClientRequirement(input = {}, index = 0) {
  const source = typeof input === 'string' ? { type: input } : (input && typeof input === 'object' ? input : {});
  const type = String(source.type || source.kind || source.service || source.name || `requirement_${index + 1}`)
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
  const label = String(source.label || source.title || source.name || type.replace(/_/g, ' ')).trim();
  const purpose = String(source.purpose || source.reason || source.description || '').trim();
  const fulfillment = normalizeClientRequirementFulfillment(source.fulfillment || source.fulfillment_mode || source.fulfillmentMode || source.via || 'cait_hub');
  const instructions = String(source.instructions || source.note || source.notes || '').trim();
  if (!type && !label && !purpose && !instructions) return null;
  return {
    type,
    label: label || type.replace(/_/g, ' '),
    required: source.required === undefined ? true : Boolean(source.required),
    purpose,
    fulfillment,
    instructions,
    launchLabel: String(source.launch_label || source.launchLabel || source.cta_label || source.ctaLabel || '').trim(),
    nativeUiUrl: String(source.native_ui_url || source.nativeUiUrl || source.launch_url || source.launchUrl || source.external_url || source.externalUrl || '').trim(),
    callbackPath: String(source.callback_path || source.callbackPath || source.return_path || source.returnPath || source.return_url_path || source.returnUrlPath || '').trim(),
    completionSignal: normalizeClientRequirementCompletionSignal(source.completion_signal || source.completionSignal || '')
  };
}

function normalizeClientRequirementFulfillment(value = 'cait_hub') {
  const raw = String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (!raw) return 'cait_hub';
  if (['native', 'native_ui_required', 'native_saas_ui', 'provider_ui', 'provider_console', 'external_ui', 'external_console', 'external_redirect', 'user_ui'].includes(raw)) return 'native_ui';
  if (['guided', 'cait_guided', 'guided_handoff', 'assisted'].includes(raw)) return 'cait_guided';
  if (['callback_supported', 'return_to_cait', 'resume_after_callback'].includes(raw)) return 'callback';
  if (['hub', 'collect', 'collect_or_confirm'].includes(raw)) return 'cait_hub';
  return raw;
}

function normalizeClientRequirementCompletionSignal(value = '') {
  const raw = String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (!raw) return '';
  if (['manual', 'manual_confirmation', 'confirm', 'manual_confirm'].includes(raw)) return 'manual_confirm';
  if (['callback_supported', 'oauth_callback', 'return_callback'].includes(raw)) return 'callback';
  if (['web_hook', 'webhooks'].includes(raw)) return 'webhook';
  return raw;
}

function requirementFulfillmentLabel(requirement = {}) {
  const fulfillment = String(requirement.fulfillment || '').trim().toLowerCase();
  if (fulfillment === 'native_ui') return 'native SaaS UI';
  if (fulfillment === 'cait_guided') return 'CAIt guided handoff';
  if (fulfillment === 'callback') return 'callback return';
  if (fulfillment === 'cait_hub') return 'CAIt hub';
  return fulfillment ? fulfillment.replace(/_/g, ' ') : '';
}

function requirementFlowSummary(requirement = {}) {
  const steps = [];
  if (requirement.fulfillment === 'native_ui') {
    steps.push(requirement.launchLabel || 'open provider UI');
    if (requirement.callbackPath) steps.push(`return to CAIt via ${requirement.callbackPath}`);
    if (requirement.completionSignal === 'manual_confirm') steps.push('confirm completion in CAIt');
    if (requirement.completionSignal === 'callback') steps.push('resume after callback');
    if (requirement.completionSignal === 'webhook') steps.push('resume after webhook');
    return steps.join(' -> ');
  }
  if (requirement.fulfillment === 'callback') {
    steps.push('finish in provider flow');
    if (requirement.callbackPath) steps.push(`return via ${requirement.callbackPath}`);
    return steps.join(' -> ');
  }
  if (requirement.fulfillment === 'cait_guided') {
    steps.push('CAIt guides the handoff');
    if (requirement.nativeUiUrl) steps.push('launch provider UI');
    return steps.join(' -> ');
  }
  return '';
}

function requirementHubSummary(requirements = []) {
  if (!requirements.length) return '';
  const nativeCount = requirements.filter((item) => item.fulfillment === 'native_ui').length;
  const callbackCount = requirements.filter((item) => item.fulfillment === 'callback').length;
  if (nativeCount) return `Requirements: ${nativeCount} step${nativeCount === 1 ? '' : 's'} continue in the provider's native UI; CAIt guides the handoff and resumes after return or confirmation`;
  if (callbackCount) return `Requirements: provider flow may return to CAIt after callback or confirmation`;
  return 'Requirements: CAIt should collect or confirm these before dispatch';
}

function agentRequirements(agent) {
  const manifest = agentManifest(agent);
  const rootMetadata = agent?.metadata && typeof agent.metadata === 'object' ? agent.metadata : {};
  const manifestMetadata = manifest.metadata && typeof manifest.metadata === 'object' ? manifest.metadata : {};
  const rawRequirements = Array.isArray(manifest.requirements)
    ? manifest.requirements
    : (Array.isArray(rootMetadata.requirements)
        ? rootMetadata.requirements
        : (Array.isArray(manifestMetadata.requirements) ? manifestMetadata.requirements : []));
  return rawRequirements
    .map((item, index) => normalizeClientRequirement(item, index))
    .filter(Boolean)
    .slice(0, 12);
}

function agentRequirementSummary(agent) {
  const requirements = agentRequirements(agent);
  if (!requirements.length) return '';
  const required = requirements.filter((item) => item.required !== false);
  const labels = (required.length ? required : requirements)
    .slice(0, 3)
    .map((item) => item.label || item.type)
    .filter(Boolean);
  return `Requirements: ${labels.join(' / ')}${requirements.length > labels.length ? ` +${requirements.length - labels.length}` : ''} · ${requirementHubSummary(requirements).replace(/^Requirements:\s*/, '')}`;
}

function normalizeClientList(value, fallback = []) {
  const rawValues = Array.isArray(value)
    ? value
    : (typeof value === 'string' ? value.split(/[,\n]/) : fallback);
  return [...new Set(rawValues
    .map((item) => String(item || '').trim().toLowerCase().replace(/[\s-]+/g, '_'))
    .filter(Boolean))];
}

function agentTags(agent) {
  const manifest = agentManifest(agent);
  const metadata = agent?.metadata && typeof agent.metadata === 'object' ? agent.metadata : {};
  const manifestMetadata = manifest.metadata && typeof manifest.metadata === 'object' ? manifest.metadata : {};
  const values = [];
  for (const source of [
    agent?.tags,
    agent?.agentTags,
    agent?.agent_tags,
    metadata.tags,
    metadata.teamTags,
    metadata.team_tags,
    metadata.agent_tags,
    manifest.tags,
    manifest.teamTags,
    manifest.team_tags,
    manifestMetadata.tags,
    manifestMetadata.teamTags,
    manifestMetadata.team_tags
  ]) {
    if (Array.isArray(source)) values.push(...source);
    else if (typeof source === 'string') values.push(...source.split(/[,\n]/));
  }
  return normalizeClientList(values, []).slice(0, 18);
}

function agentExecutionProfile(agent) {
  const manifest = agentManifest(agent);
  const metadata = agent?.metadata && typeof agent.metadata === 'object' ? agent.metadata : {};
  const requiredConnectorCapabilities = normalizeClientConnectorCapabilityList(
    manifest.required_connector_capabilities
    || manifest.requiredConnectorCapabilities
    || metadata.required_connector_capabilities
    || metadata.requiredConnectorCapabilities,
    []
  );
  return {
    executionPattern: String(manifest.execution_pattern || manifest.executionPattern || metadata.execution_pattern || metadata.executionPattern || 'async').trim().toLowerCase().replace(/[\s-]+/g, '_'),
    inputTypes: normalizeClientList(manifest.input_types || manifest.inputTypes || metadata.input_types || metadata.inputTypes, ['text']),
    outputTypes: normalizeClientList(manifest.output_types || manifest.outputTypes || metadata.output_types || metadata.outputTypes, ['report', 'file']),
    clarification: String(manifest.clarification || manifest.clarification_mode || manifest.clarificationMode || metadata.clarification || 'optional_clarification').trim().toLowerCase().replace(/[\s-]+/g, '_'),
    scheduleSupport: Boolean(manifest.schedule_support ?? manifest.scheduleSupport ?? metadata.schedule_support ?? metadata.scheduleSupport),
    requiredConnectors: normalizeClientList(manifest.required_connectors || manifest.requiredConnectors || manifest.connectors || metadata.required_connectors || metadata.requiredConnectors || metadata.connectors, []),
    requiredConnectorCapabilities,
    requiredGoogleSources: normalizeClientList(
      manifest.required_google_sources
      || manifest.requiredGoogleSources
      || metadata.required_google_sources
      || metadata.requiredGoogleSources,
      defaultGoogleSourceGroupsForCapabilitiesClient(requiredConnectorCapabilities)
    ),
    riskLevel: String(manifest.risk_level || manifest.riskLevel || metadata.risk_level || metadata.riskLevel || 'safe').trim().toLowerCase().replace(/[\s-]+/g, '_'),
    confirmationRequiredFor: normalizeClientList(manifest.confirmation_required_for || manifest.confirmationRequiredFor || metadata.confirmation_required_for || metadata.confirmationRequiredFor, []),
    capabilities: normalizeClientList(manifest.capabilities || metadata.capabilities, agent?.taskTypes || [])
  };
}

function normalizeClientConnector(value = '') {
  const text = String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (!text) return '';
  if (['github', 'github_app', 'github_oauth', 'repo', 'repository', 'pull_request', 'pr'].includes(text)) return 'github';
  if (['google', 'google_oauth', 'google_drive', 'drive', 'gmail', 'docs', 'sheets', 'calendar', 'google_calendar', 'google_meet', 'meet'].includes(text)) return 'google';
  if (['zoom', 'zoom_oauth', 'zoom_meeting'].includes(text)) return 'zoom';
  if (['microsoft', 'microsoft_oauth', 'microsoft_teams', 'teams', 'teams_meeting', 'office365', 'office_365'].includes(text)) return 'microsoft';
  if (['x', 'x_oauth', 'twitter', 'twitter_oauth', 'tweet', 'tweets', 'x_post', 'social_x'].includes(text)) return 'x';
  if (['stripe', 'payment', 'payments', 'billing', 'checkout', 'card'].includes(text)) return 'stripe';
  return text;
}

const CLIENT_CONNECTOR_CAPABILITY_ALIASES = new Map([
  ['github.read_repo', 'github.read_repo'],
  ['read_repo', 'github.read_repo'],
  ['github.read_private_repo', 'github.read_private_repo'],
  ['read_private_repo', 'github.read_private_repo'],
  ['github.write_pr', 'github.write_pr'],
  ['write_pr', 'github.write_pr'],
  ['create_pull_request', 'github.write_pr'],
  ['github.create_pull_request', 'github.write_pr'],
  ['github.write_repo', 'github.write_repo'],
  ['write_repo', 'github.write_repo'],
  ['google.read_drive', 'google.read_drive'],
  ['read_drive', 'google.read_drive'],
  ['google.read_docs', 'google.read_docs'],
  ['read_docs', 'google.read_docs'],
  ['google.read_sheets', 'google.read_sheets'],
  ['read_sheets', 'google.read_sheets'],
  ['google.read_presentations', 'google.read_presentations'],
  ['read_presentations', 'google.read_presentations'],
  ['google.read_gmail', 'google.read_gmail'],
  ['read_gmail', 'google.read_gmail'],
  ['google.send_gmail', 'google.send_gmail'],
  ['send_gmail', 'google.send_gmail'],
  ['gmail.send', 'google.send_gmail'],
  ['email.send', 'google.send_gmail'],
  ['email_delivery.send', 'google.send_gmail'],
  ['google.read_calendar', 'google.read_calendar'],
  ['read_calendar', 'google.read_calendar'],
  ['google.write_calendar', 'google.write_calendar'],
  ['write_calendar', 'google.write_calendar'],
  ['calendar.write', 'google.write_calendar'],
  ['google.create_meet', 'google.create_meet'],
  ['create_meet', 'google.create_meet'],
  ['google_meet.create', 'google.create_meet'],
  ['zoom.schedule_meeting', 'zoom.schedule_meeting'],
  ['schedule_zoom', 'zoom.schedule_meeting'],
  ['zoom.create_meeting', 'zoom.schedule_meeting'],
  ['microsoft.create_teams_meeting', 'microsoft.create_teams_meeting'],
  ['teams.create_meeting', 'microsoft.create_teams_meeting'],
  ['microsoft_teams.create_meeting', 'microsoft.create_teams_meeting'],
  ['google.read_gsc', 'google.read_gsc'],
  ['read_gsc', 'google.read_gsc'],
  ['google.read_ga4', 'google.read_ga4'],
  ['read_ga4', 'google.read_ga4'],
  ['x.post', 'x.post'],
  ['post_tweet', 'x.post'],
  ['x.schedule_post', 'x.schedule_post'],
  ['schedule_post', 'x.schedule_post'],
  ['x.read_profile', 'x.read_profile'],
  ['read_profile', 'x.read_profile'],
  ['stripe.manage_billing', 'stripe.manage_billing'],
  ['manage_billing', 'stripe.manage_billing'],
  ['stripe.read_customer', 'stripe.read_customer'],
  ['read_customer', 'stripe.read_customer']
]);

function normalizeClientConnectorCapability(value = '') {
  const key = String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (!key) return '';
  return CLIENT_CONNECTOR_CAPABILITY_ALIASES.get(key) || key;
}

function normalizeClientConnectorCapabilityList(value, fallback = []) {
  return normalizeClientList(value, fallback).map(normalizeClientConnectorCapability).filter(Boolean);
}

function connectorForRequiredCapability(value = '') {
  const [provider] = normalizeClientConnectorCapability(value).split('.');
  return normalizeClientConnector(provider);
}

function defaultGoogleSourceGroupsForCapabilitiesClient(capabilities = []) {
  const output = new Set();
  for (const capability of normalizeClientList(capabilities, [])) {
    const normalized = normalizeClientConnectorCapability(capability);
    if (normalized === 'google.read_gsc') output.add('gsc');
    if (normalized === 'google.read_ga4') output.add('ga4');
    if (['google.read_drive', 'google.read_docs', 'google.read_sheets', 'google.read_presentations'].includes(normalized)) output.add('drive');
    if (normalized === 'google.read_calendar') output.add('calendar');
    if (normalized === 'google.write_calendar') output.add('calendar');
    if (normalized === 'google.create_meet') output.add('calendar');
    if (normalized === 'google.read_gmail') output.add('gmail');
    if (normalized === 'google.send_gmail') output.add('gmail');
  }
  return [...output];
}

function connectorStatusForClient(auth = state.snapshot?.auth || {}, account = state.snapshot?.accountSettings || null) {
  const stripe = account?.stripe && typeof account.stripe === 'object' ? account.stripe : {};
  const github = account?.connectors?.github && typeof account.connectors.github === 'object' ? account.connectors.github : {};
  const google = account?.connectors?.google && typeof account.connectors.google === 'object' ? account.connectors.google : {};
  const x = account?.connectors?.x && typeof account.connectors.x === 'object' ? account.connectors.x : {};
  return {
    github: Boolean(isGithubAuthorized(auth) || isGithubLinked(auth) || (github.connected && (github.login || github.providerUserId))),
    google: Boolean(isGoogleAuthorized(auth) || isGoogleLinked(auth) || (google.connected && (google.email || google.providerUserId))),
    x: Boolean(auth?.xAuthorized || auth?.xLinked || (x.connected && x.username)),
    stripe: Boolean(stripe.customerId || stripe.customerStatus === 'ready' || stripe.defaultPaymentMethodId),
    slack: false,
    discord: false,
    notion: false,
    linear: false,
    jira: false,
    zoom: false,
    microsoft: false,
    vercel: false,
    cloudflare: false
  };
}

function xConnectorIdentityForClient(account = state.snapshot?.accountSettings || null) {
  const x = account?.connectors?.x && typeof account.connectors.x === 'object' ? account.connectors.x : {};
  const username = String(x.username || '').trim().replace(/^@+/, '');
  const userId = String(x.xUserId || x.providerUserId || '').trim();
  const displayName = String(x.displayName || '').trim();
  return {
    connected: Boolean(x.connected && username),
    username,
    handle: username ? `@${username}` : '',
    userId,
    displayName,
    label: username ? `@${username}` : (displayName || userId || 'connected X account')
  };
}

function xApprovalPayloadForClient(postText = '') {
  const identity = xConnectorIdentityForClient();
  return {
    approved_x_username: identity.handle || identity.username || '',
    approved_x_user_id: identity.userId || '',
    approved_text: String(postText || '').trim()
  };
}

function connectorScopeSetForClient(value = '') {
  return new Set(String(value || '').split(/\s+/).map((part) => String(part || '').trim().toLowerCase()).filter(Boolean));
}

function googleCapabilityStatusForClient(auth = state.snapshot?.auth || {}, account = state.snapshot?.accountSettings || null) {
  const google = account?.connectors?.google && typeof account.connectors.google === 'object' ? account.connectors.google : {};
  const scopes = connectorScopeSetForClient(google.scopes);
  const providerReady = Boolean(isGoogleAuthorized(auth) || isGoogleLinked(auth) || (google.connected && (google.email || google.providerUserId)));
  const hasAny = (...required) => required.some((scope) => scopes.has(String(scope || '').toLowerCase()));
  return {
    providerReady,
    'google.read_drive': providerReady && hasAny(
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/drive.metadata.readonly'
    ),
    'google.read_docs': providerReady && hasAny(
      'https://www.googleapis.com/auth/documents.readonly',
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/drive'
    ),
    'google.read_sheets': providerReady && hasAny(
      'https://www.googleapis.com/auth/spreadsheets.readonly',
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/drive'
    ),
    'google.read_presentations': providerReady && hasAny(
      'https://www.googleapis.com/auth/presentations.readonly',
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/drive'
    ),
    'google.read_gmail': providerReady && hasAny(
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.modify',
      'https://mail.google.com/'
    ),
    'google.send_gmail': providerReady && hasAny(
      'https://www.googleapis.com/auth/gmail.send',
      'https://mail.google.com/'
    ),
    'google.read_calendar': providerReady && hasAny(
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar'
    ),
    'google.write_calendar': providerReady && hasAny(
      'https://www.googleapis.com/auth/calendar'
    ),
    'google.create_meet': providerReady && hasAny(
      'https://www.googleapis.com/auth/calendar'
    ),
    'google.read_gsc': providerReady && hasAny(
      'https://www.googleapis.com/auth/webmasters.readonly',
      'https://www.googleapis.com/auth/webmasters'
    ),
    'google.read_ga4': providerReady && hasAny(
      'https://www.googleapis.com/auth/analytics.readonly',
      'https://www.googleapis.com/auth/analytics'
    )
  };
}

function preflightAgentsForDraft(draft = {}) {
  if (resolvedOrderStrategyOfDraft(draft) === 'multi') {
    return (routePlanOfDraft(draft).picks || []).map((item) => item.agent).filter(Boolean);
  }
  const pinned = queuedDraftAgent(draft);
  if (pinned) return [pinned];
  return readyAgentsForTask(draft.task_type)
    .sort((left, right) => agentRoutingScore(right, draft.task_type) - agentRoutingScore(left, draft.task_type))
    .slice(0, 1);
}

function clientOrderPreflight(draft = {}) {
  const auth = state.snapshot?.auth || {};
  const account = state.snapshot?.accountSettings || null;
  const connectorStatus = connectorStatusForClient(auth, account);
  const googleCapabilities = googleCapabilityStatusForClient(auth, account);
  if (isRepoBackedCodeOrderIntent(draft.task_type, draft.prompt) && !connectorStatus.github) {
    return {
      ok: false,
      code: 'connector_required',
      missingConnectors: ['github'],
      missingConnectorCapabilities: ['github.write_pr'],
      connectorStatus,
      error: 'GitHub connection is required before repo-backed coding can run.'
    };
  }
  const agents = preflightAgentsForDraft(draft);
  for (const agent of agents) {
    const profile = agentExecutionProfile(agent);
    if (profile.riskLevel === 'restricted') {
      return {
        ok: false,
        code: 'agent_restricted',
        agent,
        error: `${agent.name} is restricted and cannot receive orders.`
      };
    }
    const missing = profile.requiredConnectors
      .map(normalizeClientConnector)
      .filter((connector) => connector && Object.prototype.hasOwnProperty.call(connectorStatus, connector) && !connectorStatus[connector]);
    const missingCapabilities = (profile.requiredConnectorCapabilities || []).map(normalizeClientConnectorCapability).filter((capability) => {
      const normalized = String(capability || '').trim().toLowerCase();
      if (!normalized) return false;
      if (Object.prototype.hasOwnProperty.call(googleCapabilities, normalized)) return !googleCapabilities[normalized];
      const connector = connectorForRequiredCapability(normalized);
      return connector && Object.prototype.hasOwnProperty.call(connectorStatus, connector) && !connectorStatus[connector];
    });
    const missingFromCapabilities = missingCapabilities
      .map(connectorForRequiredCapability)
      .filter((connector) => connector && Object.prototype.hasOwnProperty.call(connectorStatus, connector) && !connectorStatus[connector]);
    const allMissing = [...new Set([...missing, ...missingFromCapabilities])];
    if (allMissing.length || missingCapabilities.length) {
      return {
        ok: false,
        code: 'connector_required',
        agent,
        missingConnectors: allMissing,
        missingConnectorCapabilities: missingCapabilities,
        connectorStatus,
        error: `Connector setup is required before ${agent.name} can run.`
      };
    }
    const confirmationRequired = profile.riskLevel === 'confirm_required' || profile.confirmationRequiredFor.length > 0;
    const accepted = Boolean(state.pendingOrderConfirmation?.accepted)
      && (!state.pendingOrderConfirmation.agentId || state.pendingOrderConfirmation.agentId === agent.id);
    if (confirmationRequired && !accepted) {
      return {
        ok: false,
        code: 'confirmation_required',
        agent,
        riskLevel: profile.riskLevel,
        confirmationRequiredFor: profile.confirmationRequiredFor,
        error: `Explicit confirmation is required before ${agent.name} can run.`
      };
    }
  }
  return { ok: true };
}

function normalizeRepoFullName(value = '') {
  return String(value || '')
    .trim()
    .replace(/^https?:\/\/github\.com\//i, '')
    .replace(/\.git$/i, '')
    .replace(/^\/+|\/+$/g, '');
}

function repoIdentityParts(value = '') {
  const fullName = normalizeRepoFullName(value);
  const [owner = '', name = ''] = fullName.split('/');
  return { fullName, owner, name };
}

function repoFullNameFromManifestSource(value = '') {
  const match = String(value || '').match(/^(?:github-app|github):([^:]+):/i);
  return normalizeRepoFullName(match?.[1] || '');
}

function findLoadedGithubRepo(fullName = '') {
  const safe = normalizeRepoFullName(fullName).toLowerCase();
  if (!safe) return null;
  return (state.repos || []).find((repo) => normalizeRepoFullName(repo.fullName).toLowerCase() === safe) || null;
}

function agentGithubRepo(agent) {
  const manifest = agentManifest(agent);
  const manifestRepo = manifest?.metadata?.repository && typeof manifest.metadata.repository === 'object'
    ? manifest.metadata.repository
    : {};
  const rootRepo = agent?.metadata?.repository && typeof agent.metadata.repository === 'object'
    ? agent.metadata.repository
    : {};
  const fullName = normalizeRepoFullName(
    manifestRepo.full_name
    || manifestRepo.fullName
    || rootRepo.full_name
    || rootRepo.fullName
    || repoFullNameFromManifestSource(agent?.manifestSource)
  );
  const loadedRepo = findLoadedGithubRepo(fullName);
  const identity = repoIdentityParts(fullName);
  return {
    fullName,
    owner: String(loadedRepo?.owner || identity.owner || '').trim(),
    name: String(loadedRepo?.name || identity.name || '').trim(),
    installationId: String(loadedRepo?.installationId || '').trim(),
    homepage: String(loadedRepo?.homepage || manifestRepo.homepage || manifestRepo.html_url || rootRepo.homepage || '').trim(),
    private: typeof loadedRepo?.private === 'boolean' ? loadedRepo.private : Boolean(manifestRepo.private || rootRepo.private),
    repo: loadedRepo || null
  };
}

function adapterAutomationAlreadyPrepared(repoInfo = {}) {
  if (!repoInfo?.fullName) return false;
  const cacheKey = `${repoInfo.installationId || 'none'}:${repoInfo.fullName}`;
  const cached = state.repoAdapterHints[cacheKey] || null;
  return Boolean(cached?.pullRequestUrl);
}

function onboardingNeedsHostedAutomation(onboarding = null) {
  if (!onboarding || onboarding.status === 'ready') return false;
  const checks = Array.isArray(onboarding.checks) ? onboarding.checks : [];
  return checks.some((item) => {
    const key = String(item?.key || '').trim().toLowerCase();
    if (!['healthcheck', 'job_endpoint', 'dispatch_readiness'].includes(key)) return false;
    const status = String(item?.status || '').trim().toLowerCase();
    if (status === 'pass') return false;
    const hay = [item?.title, item?.detail, item?.fix].filter(Boolean).join(' ').toLowerCase();
    return /missing|local-only|localhost|404|410|deploy|public|endpoint|api\/health|api\/jobs|runtime cannot/.test(hay);
  });
}

function canAutomateAgentSetup(agent, record = currentAgentOnboarding(agent?.id)) {
  if (!agent || !canCheckAgentOnboarding(agent)) return false;
  const onboarding = record?.onboarding || null;
  if (!onboardingNeedsHostedAutomation(onboarding)) return false;
  const repoInfo = agentGithubRepo(agent);
  if (!repoInfo.fullName || !repoInfo.installationId || !repoInfo.owner || !repoInfo.name) return false;
  if (adapterAutomationAlreadyPrepared(repoInfo)) return false;
  return true;
}

function selectGithubRepoInPicker(repoInfo = {}) {
  if (!repoInfo?.fullName || !els.repoPicker) return;
  const target = normalizeRepoFullName(repoInfo.fullName).toLowerCase();
  if (!target) return;
  let index = state.filteredRepos.findIndex((repo) => normalizeRepoFullName(repo.fullName).toLowerCase() === target);
  if (index < 0) {
    state.repoSearch = '';
    if (els.repoSearch) els.repoSearch.value = '';
    state.filteredRepos = [...state.repos];
    index = state.filteredRepos.findIndex((repo) => normalizeRepoFullName(repo.fullName).toLowerCase() === target);
  }
  if (index < 0) return;
  state.repoPage = Math.floor(index / state.repoPageSize);
  state.selectedRepoFullName = state.filteredRepos[index]?.fullName || '';
  renderRepoPicker();
  els.repoPicker.value = state.selectedRepoFullName;
  showSelectedRepo();
}

function sampleKindFromUrl(value, type = 'any') {
  const raw = String(value || '').trim();
  const directMatch = raw.match(/^\/mock\/([^/]+)\/(health|jobs)$/i);
  if (directMatch) {
    const kind = String(directMatch[1] || '').trim().toLowerCase();
    const endpointType = String(directMatch[2] || '').trim().toLowerCase();
    if (type !== 'any' && endpointType !== type) return '';
    return kind;
  }
  try {
    const parsed = new URL(raw);
    const match = parsed.pathname.match(/^\/mock\/([^/]+)\/(health|jobs)$/i);
    if (!match) return '';
    const kind = String(match[1] || '').trim().toLowerCase();
    const endpointType = String(match[2] || '').trim().toLowerCase();
    if (type !== 'any' && endpointType !== type) return '';
    return kind;
  } catch {
    return '';
  }
}

function sampleKindFromAgent(agent) {
  const manifest = agentManifest(agent);
  const rootMetadata = agent?.metadata && typeof agent.metadata === 'object' ? agent.metadata : {};
  const manifestMetadata = manifest.metadata && typeof manifest.metadata === 'object' ? manifest.metadata : {};
  const fallbackName = String(agent?.name || '').trim().toLowerCase();
  const taggedSample = Boolean(rootMetadata.sample === true || manifestMetadata.sample === true || manifest.sample === true);
  const nameTaggedSample = fallbackName.includes('sample_research') || fallbackName.includes('sample_writer') || fallbackName.includes('sample_code');
  if (!taggedSample && !nameTaggedSample) return '';
  const explicitKind = String(
    rootMetadata.sampleKind
    || rootMetadata.sample_kind
    || rootMetadata.category
    || manifestMetadata.sampleKind
    || manifestMetadata.sample_kind
    || manifestMetadata.category
    || manifest.category
    || ''
  ).trim().toLowerCase();
  if (taggedSample && explicitKind) return explicitKind;
  const healthKind = sampleKindFromUrl(manifest.healthcheckUrl || manifest.healthcheck_url || manifest.healthUrl || '', 'health');
  if (healthKind) return healthKind;
  const jobKind = sampleKindFromUrl(
    manifest.jobEndpoint || manifest.job_endpoint || manifest.jobsUrl || manifest.jobs_url || manifestMetadata.job_endpoint || manifestMetadata.jobEndpoint || '',
    'jobs'
  );
  if (jobKind) return jobKind;
  return '';
}

function isManagedSampleAgent(agent) {
  return Boolean(sampleKindFromAgent(agent));
}

function collectAgentEndpoints(agent) {
  const manifest = agentManifest(agent);
  const rootMetadata = agent?.metadata && typeof agent.metadata === 'object' ? agent.metadata : {};
  const rawEndpoints = manifest.endpoints && typeof manifest.endpoints === 'object' ? manifest.endpoints : {};
  const metadataEndpoints = rootMetadata.endpoints && typeof rootMetadata.endpoints === 'object' ? rootMetadata.endpoints : {};
  const endpointMap = new Map();
  const add = (label, value) => {
    const normalized = String(value || '').trim();
    if (!normalized) return;
    endpointMap.set(label, normalized);
  };
  add('jobs', manifest.jobEndpoint || manifest.job_endpoint || manifest.jobsUrl || manifest.jobs_url || rawEndpoints.jobs || rawEndpoints.job || rawEndpoints.dispatch || rawEndpoints.submit || rootMetadata.job_endpoint || rootMetadata.jobEndpoint || metadataEndpoints.jobs || metadataEndpoints.job || metadataEndpoints.dispatch || metadataEndpoints.submit);
  add('health', manifest.healthcheckUrl || manifest.health_url || manifest.healthUrl || rawEndpoints.health);
  add('health', metadataEndpoints.health);
  Object.entries(rawEndpoints).forEach(([key, value]) => add(String(key), value));
  Object.entries(metadataEndpoints).forEach(([key, value]) => add(String(key), value));
  return {
    primaryJob: endpointMap.get('jobs') || '',
    healthcheck: endpointMap.get('health') || '',
    entries: [...endpointMap.entries()].map(([label, value]) => ({ label, value }))
  };
}

function shortUrl(value) {
  const text = String(value || '').trim();
  if (!text) return '-';
  try {
    const parsed = new URL(text);
    return `${parsed.host}${parsed.pathname}`;
  } catch {
    return text;
  }
}

function agentVerifyAction(agent) {
  const verification = agentVerification(agent);
  const code = String(verification.code || '').trim();
  if (!code || agent?.verificationStatus === 'verified') {
    return {
      title: 'Verification healthy',
      body: 'Healthcheck passed. Use endpoint and capability fit to decide whether to route orders here.'
    };
  }
  if (code === 'missing_healthcheck_url') {
    return {
      title: 'Add a health endpoint',
      body: 'Set `healthcheck_url` or `endpoints.health` in the manifest, then verify again.'
    };
  }
  if (code === 'healthcheck_http_error') {
    return {
      title: 'Fix the healthcheck response',
      body: `The broker reached the health URL but did not get HTTP 200. Check ${verification.healthcheckUrl || 'the configured health URL'} and return 200.`
    };
  }
  if (code === 'healthcheck_unhealthy_body') {
    return {
      title: 'Return ok=true from healthcheck',
      body: 'The endpoint responded, but the body did not prove health. Return JSON with `ok: true` and retry verification.'
    };
  }
  if (code === 'ownership_challenge_failed') {
    return {
      title: 'Fix ownership challenge hosting',
      body: `Publish the expected challenge token at ${verification.challengeUrl || 'the configured challenge URL'}, then verify again.`
    };
  }
  if (code === 'healthcheck_fetch_error') {
    return {
      title: 'Restore network reachability',
      body: 'The broker could not fetch the health URL. Check DNS/TLS/public reachability and retry verification.'
    };
  }
  return {
    title: 'Inspect verify configuration',
    body: verification.reason || 'Review manifest fields, healthcheck reachability, and ownership challenge configuration.'
  };
}

function agentVerifyFailureSummary(agent) {
  const verification = agentVerification(agent);
  const action = agentVerifyAction(agent);
  const code = String(verification.code || '').trim();
  const statusCode = verification.details?.statusCode;
  let cause = agent?.verificationError || verification.reason || 'Verification is incomplete.';
  if (code === 'missing_healthcheck_url') cause = 'Manifest is missing a healthcheck URL.';
  else if (code === 'healthcheck_http_error') cause = `Healthcheck returned HTTP ${statusCode ?? 'non-200'}.`;
  else if (code === 'healthcheck_unhealthy_body') cause = 'Healthcheck body did not prove ok=true.';
  else if (code === 'ownership_challenge_failed') cause = `Ownership challenge could not be proved at ${verification.challengeUrl || 'the configured challenge URL'}.`;
  else if (code === 'healthcheck_fetch_error') cause = `Broker could not reach ${verification.healthcheckUrl || 'the configured health URL'}.`;
  else if (agent?.verificationStatus === 'verified') cause = 'Verification succeeded.';
  return {
    cause,
    next: `${action.title}: ${action.body}`
  };
}

function agentReview(agent) {
  return agent?.agentReview && typeof agent.agentReview === 'object'
    ? agent.agentReview
    : {};
}

function agentReviewStatus(agent) {
  if (isManagedSampleAgent(agent)) return 'not_required';
  const status = String(agent?.agentReviewStatus || agent?.agent_review_status || '').trim().toLowerCase();
  if (['approved', 'rejected', 'needs_human_review', 'not_required'].includes(status)) return status;
  if (agent?.verificationStatus === 'verified') return 'approved_legacy';
  return 'pending';
}

function agentReviewLabel(agent) {
  const status = agentReviewStatus(agent);
  if (status === 'approved') return 'REVIEW APPROVED';
  if (status === 'approved_legacy') return 'REVIEW LEGACY';
  if (status === 'rejected') return 'REVIEW REJECTED';
  if (status === 'needs_human_review') return 'HUMAN REVIEW';
  if (status === 'not_required') return 'REVIEW N/A';
  return 'REVIEW PENDING';
}

function agentReviewApproved(agent) {
  return ['approved', 'approved_legacy', 'not_required'].includes(agentReviewStatus(agent));
}

function agentReviewReason(agent) {
  const review = agentReview(agent);
  const reasons = Array.isArray(review.reasons) ? review.reasons.filter(Boolean) : [];
  if (reasons[0]) return reasons[0];
  const status = agentReviewStatus(agent);
  if (status === 'rejected') return 'Agent review rejected this registration.';
  if (status === 'needs_human_review') return 'Agent requires human review before routing.';
  if (status === 'pending') return 'Agent review is pending before routing.';
  if (status === 'approved_legacy') return 'Legacy verified agent. Re-run verify to refresh the review record.';
  return 'Agent review approved.';
}

function agentHealth(agent) {
  const verification = agentVerification(agent);
  const verified = agent?.verificationStatus === 'verified' || isManagedSampleAgent(agent);
  const reviewApproved = agentReviewApproved(agent);
  const reviewLabel = agentReviewLabel(agent);
  const endpoints = collectAgentEndpoints(agent);
  const endpoint = endpoints.primaryJob;
  const healthcheck = endpoints.healthcheck;
  const capabilityCount = (agent?.taskTypes || []).length;
  const groupedCatalogAgent = isAgentSuiteProduct(agent);
  const ready = Boolean(agent?.online && verified && reviewApproved && endpoint && capabilityCount && !groupedCatalogAgent);
  let label = 'DEGRADED';
  let tone = 'warn';
  let reason = agent?.verificationError || verification.reason || 'Agent needs verification and endpoint review.';
  let verifyLabel = verified ? 'VERIFIED' : 'UNVERIFIED';
  if (!agent?.online) {
    label = 'OFFLINE';
    tone = 'error';
    reason = 'Agent is marked offline.';
  } else if (verified && !reviewApproved) {
    label = agentReviewStatus(agent) === 'rejected' ? 'REVIEW REJECTED' : 'REVIEW PENDING';
    tone = agentReviewStatus(agent) === 'rejected' ? 'error' : 'warn';
    reason = agentReviewReason(agent);
    verifyLabel = reviewLabel;
  } else if (ready) {
    label = 'READY';
    tone = 'ok';
    reason = 'Verified, review-approved, online, and exposes a job endpoint.';
  } else if (verified && !endpoint) {
    label = 'NO ENDPOINT';
    tone = 'warn';
    reason = 'Verified, but no dispatch job endpoint is configured.';
  } else if (groupedCatalogAgent) {
    label = 'GROUP SETUP';
    tone = 'warn';
    reason = 'This is a grouped set of related agents. Register each component as its own orderable agent; CAIt can then ask whether to run them together or separately.';
  } else if (verified) {
    label = 'VERIFIED';
    tone = 'info';
    reason = 'Healthcheck passed. Review endpoint/capability fit before dispatch.';
  } else if (String(agent?.verificationStatus || '').includes('failed')) {
    label = 'VERIFY FAIL';
    tone = 'error';
    verifyLabel = 'VERIFY FAIL';
    reason = agent?.verificationError || verification.reason || 'Verification failed.';
  } else if (agent?.verificationStatus === 'manifest_loaded') {
    verifyLabel = 'MANIFEST LOADED';
  } else if (agent?.verificationStatus === 'legacy_unverified') {
    verifyLabel = 'LEGACY';
  }
  return {
    verified,
    endpoint,
    healthcheck,
    endpoints: endpoints.entries,
    ready,
    label,
    tone,
    reason,
    verifyLabel,
    reviewApproved,
    reviewLabel,
    reviewStatus: agentReviewStatus(agent),
    reviewReason: agentReviewReason(agent),
    capabilityCount,
    availability: agent?.online ? 'ONLINE' : 'OFFLINE',
    endpointLabel: endpoint ? 'JOB ENDPOINT' : 'NO ENDPOINT',
    healthLabel: healthcheck ? 'HEALTHCHECK' : 'NO HEALTHCHECK'
  };
}

function runTiming(job) {
  if (!job) return null;
  const createdAt = job.createdAt ? new Date(job.createdAt).getTime() : null;
  const claimedAt = job.claimedAt ? new Date(job.claimedAt).getTime() : null;
  const startedAt = job.startedAt ? new Date(job.startedAt).getTime() : null;
  const terminalAtValue = job.completedAt || job.failedAt || job.timedOutAt || null;
  const terminalAt = terminalAtValue ? new Date(terminalAtValue).getTime() : null;
  const now = Date.now();
  return {
    age: createdAt ? formatDurationMs(now - createdAt) : '-',
    queuedFor: createdAt ? formatDurationMs((claimedAt || startedAt || terminalAt || now) - createdAt) : '-',
    activeFor: startedAt ? formatDurationMs((terminalAt || now) - startedAt) : '-',
    endToEnd: createdAt ? formatDurationMs((terminalAt || now) - createdAt) : '-',
    lastUpdatedAt: terminalAtValue || job.lastCallbackAt || job.dispatchedAt || job.startedAt || job.claimedAt || job.createdAt || null
  };
}

function traceTimeline(job) {
  if (!job) return [];
  return [
    ['created', job.createdAt],
    ['claimed', job.claimedAt],
    ['dispatched', job.dispatchedAt],
    ['started', job.startedAt],
    ['last_callback', job.lastCallbackAt],
    ['completed', job.completedAt],
    ['failed', job.failedAt],
    ['timed_out', job.timedOutAt]
  ]
    .filter(([, value]) => Boolean(value))
    .map(([label, value]) => `${label}: ${formatTime(value)} (${sinceLabel(value)})`);
}

function agentReadinessScore(agent) {
  const health = agentHealth(agent);
  return (health.ready ? 1000 : 0)
    + (health.verified ? 300 : 0)
    + (agent.online ? 120 : 0)
    + (isManagedSampleAgent(agent) ? 0 : 180)
    + Math.round(Number(agent.successRate || 0) * 100)
    - Math.round(Number(agent.avgLatencySec || 0));
}

function agentTaskSpecificityScore(agent = {}, taskType = '') {
  const requestedTask = String(taskType || '').trim().toLowerCase();
  const tasks = Array.isArray(agent?.taskTypes) ? agent.taskTypes.map((item) => String(item || '').toLowerCase()) : [];
  const index = tasks.indexOf(requestedTask);
  if (index < 0) return 0;
  const primaryFit = index === 0 ? 100 : 85;
  const breadthFit = Math.max(65, 100 - Math.max(0, tasks.length - 1) * 8);
  return Math.round(primaryFit * breadthFit / 100);
}

function currentOrderInputTypeHints(prompt = String(els.jobPrompt?.value || ''), input = orderInputFromComposer()) {
  const hints = new Set();
  const text = String(prompt || '');
  if (text.trim()) hints.add('text');
  const counts = orderInputCounts(input || null);
  if (counts.urlCount || /https?:\/\//i.test(text)) hints.add('url');
  if (counts.fileCount) hints.add('file');
  if (/\b(github|repo|repository|pull request|pr)\b|リポジトリ|プルリク/i.test(text)) hints.add('repo');
  if (/\b(api|webhook|json payload)\b/i.test(text)) hints.add('api_payload');
  if (/\b(oauth|gmail|google drive|google calendar|google meet|zoom|teams|microsoft teams|slack|discord|notion|linear|jira)\b/i.test(text)) hints.add('oauth_resource');
  if (!hints.size) hints.add('text');
  return [...hints];
}

function clientTaskRoutingObject(agent = {}) {
  const metadata = agent?.metadata || {};
  const manifest = metadata?.manifest || agent?.manifest || {};
  const manifestMetadata = manifest?.metadata || {};
  const routing = metadata.taskRouting
    || metadata.task_routing
    || manifest.taskRouting
    || manifest.task_routing
    || manifestMetadata.taskRouting
    || manifestMetadata.task_routing
    || {};
  return routing && typeof routing === 'object' && !Array.isArray(routing) ? routing : {};
}

function clientRoutingByTaskValues(routing = {}, taskType = '', field = '') {
  const task = String(taskType || '').trim().toLowerCase();
  if (!task) return [];
  const source = routing[field] && typeof routing[field] === 'object' && !Array.isArray(routing[field])
    ? routing[field]
    : {};
  return normalizeClientList(source[task] || [], []);
}

function clientTaskRoutingTokens(taskType = '', options = {}) {
  const task = String(taskType || '').trim().toLowerCase();
  if (!task) return [];
  const field = options.field || 'soft';
  const directField = field === 'tag' ? 'tag_hints' : 'soft_match_tokens';
  const byTaskField = field === 'tag' ? 'tag_hints_by_task' : 'soft_match_tokens_by_task';
  const tokens = [];
  const push = (items = []) => {
    normalizeClientList(items, []).forEach((item) => {
      if (!tokens.includes(item)) tokens.push(item);
    });
  };
  (state.snapshot?.agents || []).forEach((agent) => {
    const routing = clientTaskRoutingObject(agent);
    const taskTypes = normalizeClientList(agent?.taskTypes || agent?.task_types || [], []);
    const aliases = normalizeClientList(routing.aliases || [], []);
    const ownsTask = taskTypes.includes(task) || aliases.includes(task);
    push(clientRoutingByTaskValues(routing, task, byTaskField));
    if (ownsTask) push(routing[directField] || []);
  });
  return tokens;
}

function clientTaskSignalTokens(value = '') {
  return normalizeClientList(String(value || '').split(/[^a-z0-9_]+/i), []);
}

function clientTaskTagHints(taskType = '') {
  const task = String(taskType || '').trim().toLowerCase();
  return normalizeClientList([
    task,
    ...clientTaskRoutingTokens(task, { field: 'tag' }),
    ...clientTaskSignalTokens(task)
  ], []);
}

function clientTaskMetadataScores(agent = {}) {
  const sources = [
    agent?.metadata?.task_type_scores,
    agent?.metadata?.taskTypeScores,
    agent?.metadata?.manifest?.task_type_scores,
    agent?.metadata?.manifest?.taskTypeScores,
    agent?.metadata?.manifest?.metadata?.task_type_scores,
    agent?.metadata?.manifest?.metadata?.taskTypeScores
  ];
  const scored = new Map();
  const record = (taskType, score) => {
    const safeTask = String(taskType || '').trim().toLowerCase();
    const safeScore = Math.max(0, Math.min(1, Number(score || 0)));
    if (!safeTask || !Number.isFinite(safeScore)) return;
    scored.set(safeTask, Math.max(safeScore, scored.get(safeTask) || 0));
  };
  sources.forEach((source) => {
    if (!source) return;
    if (Array.isArray(source)) {
      source.forEach((item) => {
        if (typeof item === 'string') {
          record(item, 1);
          return;
        }
        if (!item || typeof item !== 'object') return;
        record(item.task_type || item.taskType || item.name || item.id, item.score ?? item.confidence ?? item.weight ?? item.value ?? item.fit ?? 0);
      });
      return;
    }
    if (typeof source !== 'object') return;
    Object.entries(source).forEach(([taskType, score]) => record(taskType, score));
  });
  return scored;
}

function clientWorkflowTaskTokens(taskType = '') {
  const task = String(taskType || '').trim().toLowerCase();
  if (!task) return [];
  return normalizeClientList([
    task,
    ...clientTaskRoutingTokens(task, { field: 'soft' })
  ], []);
}

function clientTaskMatch(agent = {}, taskType = '') {
  const normalizedTask = String(taskType || '').trim().toLowerCase();
  const tasks = (agent?.taskTypes || []).map((task) => String(task).trim().toLowerCase()).filter(Boolean);
  if (!normalizedTask) return { matches: true, exact: false, taskType: '', compatibility: 1, matchKind: 'none' };
  if (tasks.includes(normalizedTask)) {
    return { matches: true, exact: true, taskType: normalizedTask, compatibility: 1, matchKind: 'exact' };
  }
  const desiredTokens = clientWorkflowTaskTokens(normalizedTask);
  if (!desiredTokens.length) return { matches: false, exact: false, taskType: normalizedTask, compatibility: 0, matchKind: 'none' };
  const desiredSet = new Set(desiredTokens);
  const tagList = agentTags(agent);
  const agentOverlap = desiredTokens.filter((token) => tagList.includes(token)).length;
  const metadataScores = clientTaskMetadataScores(agent);
  const metadataBoost = Math.max(...desiredTokens.map((token) => Number(metadataScores.get(token) || 0)), 0);
  let best = null;
  tasks.forEach((candidateTask) => {
    const candidateTokens = clientWorkflowTaskTokens(candidateTask);
    const overlap = candidateTokens.filter((token) => desiredSet.has(token)).length;
    const directAlias = desiredSet.has(candidateTask) ? 1 : 0;
    const overlapScore = desiredTokens.length ? overlap / desiredTokens.length : 0;
    const agentScore = desiredTokens.length ? agentOverlap / desiredTokens.length : 0;
    const compatibility = Math.max(
      directAlias ? 0.82 : 0,
      Math.min(0.92, overlapScore * 0.65 + agentScore * 0.25 + metadataBoost * 0.3)
    );
    const acceptable = directAlias || overlap >= 2 || ((directAlias || overlap >= 1) && metadataBoost >= 0.55) || (overlap >= 1 && agentOverlap >= 2);
    if (!acceptable || compatibility < 0.32) return;
    if (!best || compatibility > best.compatibility || (compatibility === best.compatibility && candidateTask.localeCompare(best.taskType) < 0)) {
      best = { matches: true, exact: false, taskType: candidateTask, compatibility, matchKind: 'soft' };
    }
  });
  return best || { matches: false, exact: false, taskType: normalizedTask, compatibility: 0, matchKind: 'none' };
}

function agentRoutingScore(agent = {}, taskType = '') {
  const health = agentHealth(agent);
  const quality = Math.round(Number(agent.successRate || 0) * 220);
  const speed = Math.max(0, 50 - Math.round(Number(agent.avgLatencySec || 20) * 0.4));
  const profile = agentExecutionProfile(agent);
  const tags = agentTags(agent);
  const taskMatch = clientTaskMatch(agent, taskType);
  const tagFit = clientTaskTagHints(taskType)
    .reduce((total, tag) => total + (tags.includes(tag) ? 18 : 0), 0);
  const inputFit = currentOrderInputTypeHints()
    .reduce((total, inputType) => total + (profile.inputTypes.includes(inputType) ? 14 : 0), 0);
  const scheduleFit = /scheduled|recurring|daily|weekly|hourly|定期|毎日|毎週/i.test(String(els.jobPrompt?.value || ''))
    ? (profile.scheduleSupport || ['scheduled', 'monitoring'].includes(profile.executionPattern) ? 24 : -16)
    : 0;
  const riskPenalty = profile.riskLevel === 'restricted' ? -1000 : (profile.riskLevel === 'confirm_required' ? -12 : 0);
  return (health.ready ? 280 : 0)
    + (taskMatch.matches ? 280 : 0)
    + Math.round(agentTaskSpecificityScore(agent, taskMatch.taskType || taskType) * 1.6)
    + (taskMatch.exact ? 28 : Math.round(Number(taskMatch.compatibility || 0) * 20))
    + quality
    + tagFit
    + (isManagedSampleAgent(agent) ? 0 : 160)
    + speed
    + inputFit
    + scheduleFit
    + riskPenalty
    + (agent.online ? 30 : 0);
}

function compareAgents(a, b) {
  const mode = state.agentSort || 'readiness';
  const verifyRank = (agent) => {
    const status = String(agent?.verificationStatus || '');
    if (status === 'verified') return 3;
    if (status === 'manifest_loaded') return 2;
    if (status === 'legacy_unverified') return 1;
    if (status.includes('failed')) return 0;
    return 1;
  };
  if (mode === 'verify') return verifyRank(b) - verifyRank(a);
  if (mode === 'success') return Number(b.successRate || 0) - Number(a.successRate || 0);
  if (mode === 'latency') return Number(a.avgLatencySec || 0) - Number(b.avgLatencySec || 0);
  if (mode === 'earnings') return Number(b.earnings || 0) - Number(a.earnings || 0);
  if (mode === 'name') return String(a.name || '').localeCompare(String(b.name || ''));
  return agentReadinessScore(b) - agentReadinessScore(a);
}

function parseSearchTokens(raw = '') {
  const tokens = [];
  const free = [];
  String(raw || '').split(/\s+/).filter(Boolean).forEach((token) => {
    const idx = token.indexOf(':');
    if (idx > 0) {
      tokens.push({ key: token.slice(0, idx).toLowerCase(), value: token.slice(idx + 1).toLowerCase() });
      return;
    }
    free.push(token.toLowerCase());
  });
  return { tokens, free };
}

function agentTaskFit(agent, taskType = currentRoutingTask()) {
  const normalizedTask = String(taskType || '').trim().toLowerCase();
  const match = clientTaskMatch(agent, normalizedTask);
  if (!normalizedTask) {
    return {
      taskType: '',
      matches: true,
      label: 'GENERAL FIT',
      tone: 'info',
      reason: 'No specific task is selected. Judge this agent by readiness, endpoint, and verification state.'
    };
  }
  if (match.matches && match.exact) {
    return {
      taskType: normalizedTask,
      matches: true,
      label: 'TASK MATCH',
      tone: 'ok',
      reason: `Supports ${normalizedTask}.`
    };
  }
  if (match.matches) {
    return {
      taskType: match.taskType || normalizedTask,
      matches: true,
      label: 'WORKFLOW MATCH',
      tone: 'ok',
      reason: `Maps ${normalizedTask} to ${match.taskType || normalizedTask} for team routing.`
    };
  }
  return {
    taskType: normalizedTask,
    matches: false,
    label: 'TASK MISMATCH',
    tone: 'warn',
    reason: `Does not advertise ${normalizedTask}.`
  };
}

function agentNextAction(agent) {
  if (!agent) return { title: 'NO AGENT SELECTED', body: 'Select an agent to inspect readiness, dispatch path, and recommended next step.', tone: 'info' };
  const onboarding = currentAgentOnboarding(agent.id);
  if (onboarding?.onboarding) {
    const action = onboardingAction(onboarding.onboarding);
    if (action) return action;
  }
  const health = agentHealth(agent);
  const fit = agentTaskFit(agent);
  const verifyAction = agentVerifyAction(agent);
  const requestedTask = fit.taskType || currentRoutingTask();
  if (!agent.online) return { title: 'ACTION: RESTORE AVAILABILITY', body: 'This agent is offline. Fix service availability before sending orders to it.', tone: 'error' };
  if (!health.verified) return { title: 'ACTION: VERIFY AGENT', body: `${health.reason} Next: ${verifyAction.title}. ${verifyAction.body}${requestedTask ? ` Requested task: ${requestedTask}.` : ''}`, tone: health.tone === 'error' ? 'error' : 'info' };
  if (!health.reviewApproved) return { title: 'ACTION: COMPLETE AGENT REVIEW', body: `${health.reviewReason} Agent routing stays disabled until review is approved.`, tone: health.tone };
  if (isAgentSuiteProduct(agent)) return { title: 'ACTION: REGISTER GROUP COMPONENTS', body: 'This is an agent group, not the default dispatch target. Register the SaaS, marketing, or other component agents separately so CAIt can ask whether to run them as one flow or separate orders.', tone: 'warn' };
  if (!health.endpoint) return { title: 'ACTION: ADD JOB ENDPOINT', body: 'Verification passed, but the manifest does not expose a dispatch endpoint. Add `job_endpoint` or `endpoints.jobs` before routing orders here.', tone: 'error' };
  if (!fit.matches) return { title: 'ACTION: CHOOSE A BETTER TASK MATCH', body: `Current routing task is ${requestedTask}. This agent is healthy, but it does not advertise that capability. Use auto-routing or pick an agent that explicitly supports the task.`, tone: 'warn' };
  return { title: requestedTask ? `READY FOR DISPATCH (${requestedTask})` : 'READY FOR DISPATCH', body: `Best used for ${(agent.taskTypes || []).join(', ') || 'general work'}. Pin this agent only when you need deterministic routing.`, tone: 'ok' };
}

function runNextAction(job) {
  if (!job) return { title: 'NO ORDER SELECTED', body: 'Select an order to inspect current state and recommended next action.', tone: 'info' };
  if (job.jobKind === 'workflow') {
    const counts = job.workflow?.statusCounts || {};
    const authority = authorityRequestFromReport(job.output?.report || {});
    if (authorityRequestRequiresClientApproval(authority)) {
      return {
        title: 'ACTION APPROVAL REQUIRED',
        body: `${counts.completed || 0}/${counts.total || 0} internal work items finished, but external execution is waiting for approval/connector setup. Required: ${describeAuthorityNeed(authority.missingConnectorCapabilities, authority.missingConnectors)}.`,
        tone: 'warn'
      };
    }
    if (job.status === 'blocked') return { title: 'AGENT TEAM WAITING', body: `${counts.completed || 0}/${counts.total || 0} agent runs completed. Resolve the waiting specialist or connector gate before treating this as final.`, tone: 'warn' };
    if (job.status === 'completed') return { title: 'AGENT TEAM COMPLETED', body: `${counts.completed || 0}/${counts.total || 0} internal work items completed. Review the combined integrated delivery.`, tone: 'ok' };
    if (job.status === 'failed') return { title: 'ACTION: INSPECT AGENT RUN FAILURES', body: `${counts.failed || 0} agent runs failed. Review run statuses and retry the failed path only.`, tone: 'error' };
    return { title: 'AGENT TEAM RUNNING', body: `${counts.completed || 0}/${counts.total || 0} agent runs completed. Wait for remaining agent runs or inspect the workflow detail.`, tone: 'info' };
  }
  if (job.status === 'completed') return { title: 'ORDER COMPLETED', body: 'Delivery and billing are recorded. Review output or send another order.', tone: 'ok' };
  if (job.status === 'failed' || job.status === 'timed_out') {
    if (String(job.failureReason || '').toLowerCase().includes('no verified agent')) {
      return { title: 'ACTION: VERIFY OR REGISTER AN AGENT', body: 'No verified agent could accept this order. Verify an agent or choose one manually, then retry.', tone: 'error' };
    }
    if (job.dispatch?.retryable) {
      const nextRetryAt = job.dispatch?.nextRetryAt;
      const overdue = nextRetryAt && new Date(nextRetryAt).getTime() <= Date.now();
      return {
        title: overdue ? 'ACTION: RETRY DISPATCH NOW' : 'ACTION: RETRY DISPATCH',
        body: `Dispatch can be retried.${nextRetryAt ? ` Recommended ${overdue ? 'now' : `after ${nextRetryAt}`}.` : ''} Review trace/logs first if the same endpoint keeps failing.`,
        tone: overdue ? 'ok' : 'info'
      };
    }
    return { title: 'ACTION: INSPECT FAILURE', body: `${job.failureReason || 'Order failed.'} ${job.failureCategory ? `Category: ${job.failureCategory}.` : ''} Fix the root cause before retrying.`, tone: 'error' };
  }
  if (job.status === 'dispatched') return { title: 'ORDER IN FLIGHT', body: 'The order was accepted by an agent. Watch telemetry/logs or wait for callback/result.', tone: 'info' };
  if (job.status === 'queued') return { title: 'ORDER QUEUED', body: 'The order is waiting for claim/dispatch. Confirm agent assignment and status.', tone: 'info' };
  if (job.status === 'claimed' || job.status === 'running') return { title: 'ORDER EXECUTING', body: 'An agent is currently working. Check telemetry/logs before taking action.', tone: 'ok' };
  return { title: 'CHECK ORDER STATE', body: 'Inspect the trace and order detail for the latest execution state.', tone: 'info' };
}

function runActionKey(job) {
  const action = runNextAction(job);
  if (action.title.includes('RETRY DISPATCH')) return 'retry';
  if (action.title.includes('VERIFY AGENT')) return 'verify-agent';
  if (action.title.includes('INSPECT FAILURE')) return 'inspect';
  if (action.title.includes('ORDER IN FLIGHT') || action.title.includes('ORDER EXECUTING') || action.title.includes('ORDER QUEUED')) return 'watch';
  if (action.title.includes('WAITING')) return 'watch';
  if (action.title.includes('ORDER COMPLETED')) return 'done';
  return 'inspect';
}

function inputSourcesFromJob(job) {
  const input = job?.input && typeof job.input === 'object' ? job.input : {};
  const urls = Array.isArray(input.urls)
    ? input.urls.map((url) => String(url || '').trim()).filter(Boolean).slice(0, ORDER_INPUT_MAX_URLS)
    : [];
  const files = Array.isArray(input.files)
    ? input.files.map((file) => normalizeOrderInputFile(file)).filter((file) => file.content)
    : [];
  return { urls, files };
}

function summarizeRun(job) {
  if (!job) return 'No run selected.';
  const timing = runTiming(job);
  const sources = inputSourcesFromJob(job);
  const logs = (job.logs || []).length ? job.logs.map((line, index) => `${index + 1}. ${line}`) : ['-'];
  const actualBilling = job.actualBilling && typeof job.actualBilling === 'object' ? job.actualBilling : null;
  const fundingLines = fundingBreakdownLines(job);
  const lines = [
    `Run: ${job.id}`,
    `Kind: ${job.jobKind || 'job'}`,
    `Status: ${orderProgressStatusLabel(job.status)}`,
    `Task: ${job.taskType}`,
    `Agent: ${job.assignedAgentId || 'auto-routing'}`,
    `Created: ${new Date(job.createdAt).toLocaleString('ja-JP')} (${sinceLabel(job.createdAt)})`,
    `Failure: ${job.failureReason || '-'}`,
    `Next retry: ${job.dispatch?.nextRetryAt || '-'}`,
    `Endpoint: ${job.dispatch?.endpoint || '-'}`,
    '',
    job.originalPrompt ? 'Original prompt:' : 'Prompt:',
    job.originalPrompt || job.prompt || '-',
    ...(job.originalPrompt ? ['', 'Execution prompt:', job.prompt || '-'] : []),
    ...(job.promptOptimization ? [
      '',
      'Prompt optimization:',
      JSON.stringify(job.promptOptimization, null, 2)
    ] : []),
    '',
    `Input URLs: ${sources.urls.length}`,
    `Input files: ${sources.files.length}`,
    '',
    'Timeline:',
    ...(traceTimeline(job).length ? traceTimeline(job) : ['-']),
    '',
    'Timing:',
    `age=${timing?.age || '-'}`,
    `queue=${timing?.queuedFor || '-'}`,
    `active=${timing?.activeFor || '-'}`,
    '',
    'Dispatch:',
    JSON.stringify(job.dispatch || null, null, 2),
    '',
    'Logs:',
    ...logs
  ];
  if (actualBilling) {
    lines.push(
      '',
      'Billing:',
      `total=${yen(actualBilling.total)}`,
      `basis=${yen(actualBilling.totalCostBasis ?? actualBilling.apiCost)}`,
      `agent_payout=${yen(actualBilling.agentPayout)}`,
      `platform_revenue=${yen(actualBilling.platformRevenue)}`
    );
    if (fundingLines.length) lines.push(...fundingLines);
  }
  if (job.workflow) {
    lines.push(
      '',
      'Workflow:',
      `strategy=${job.workflow.strategy || '-'}`,
      `planned_tasks=${(job.workflow.plannedTasks || []).join(', ') || '-'}`,
      `children=${(job.workflow.childJobIds || []).length}`,
      JSON.stringify(job.workflow.childRuns || [], null, 2)
    );
  }
  if (sources.urls.length) {
    lines.push('', 'Source URLs:');
    sources.urls.slice(0, 8).forEach((url, index) => lines.push(`${index + 1}. ${url}`));
  }
  if (sources.files.length) {
    lines.push('', 'Source files:');
    sources.files.slice(0, 8).forEach((file, index) => {
      lines.push(`${index + 1}. ${file.name} (${formatBytes(file.size)}, ${file.content.length} chars${file.truncated ? ', truncated' : ''})`);
    });
  }
  if (job.output) lines.push('', 'Output:', JSON.stringify(job.output, null, 2));
  return lines.join('\n');
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeCssToken(value, fallback = 'info') {
  const token = String(value || '').toLowerCase().replace(/[^a-z0-9_-]/g, '');
  return token || fallback;
}

function selectedFeedbackReport() {
  return state.snapshot?.feedbackReports?.find((report) => report.id === state.selectedFeedbackId) || null;
}

function selectedChatTranscript() {
  return state.snapshot?.chatTranscripts?.find((item) => item.id === state.selectedChatTranscriptId) || null;
}

function setChatTranscriptDetail(transcript) {
  if (!els.chatTranscriptDetail) return;
  if (!transcript) {
    safeText(els.chatTranscriptDetail, 'Select a chat transcript.');
    if (els.chatTranscriptExpectedHandling) els.chatTranscriptExpectedHandling.value = '';
    if (els.chatTranscriptImprovementNote) els.chatTranscriptImprovementNote.value = '';
    return;
  }
  safeText(els.chatTranscriptDetail, [
    `Status: ${String(transcript.reviewStatus || 'new').toUpperCase()}`,
    `Created: ${formatTime(transcript.createdAt)}`,
    `Task: ${transcript.taskType || '-'}`,
    `Answer kind: ${transcript.answerKind || '-'}`,
    `Visitor: ${transcript.visitorId || transcript.accountHash || '-'}`,
    `Login: ${transcript.loggedIn ? 'yes' : 'no'} (${transcript.authProvider || 'guest'})`,
    `Redacted: ${transcript.redacted ? 'yes' : 'no'}`,
    `Reviewed by: ${transcript.reviewedBy || '-'}`,
    `Reviewed at: ${formatTime(transcript.reviewedAt)}`,
    '',
    'User input:',
    transcript.prompt || '-',
    '',
    'Current CAIt answer:',
    transcript.answer || '-',
    '',
    'Expected next handling:',
    transcript.expectedHandling || '-',
    '',
    'Improvement note:',
    transcript.improvementNote || '-'
  ].join('\n'));
  if (els.chatTranscriptExpectedHandling) els.chatTranscriptExpectedHandling.value = transcript.expectedHandling || '';
  if (els.chatTranscriptImprovementNote) els.chatTranscriptImprovementNote.value = transcript.improvementNote || '';
}

function setFeedbackDetail(report) {
  if (!els.feedbackDetail) return;
  if (!report) {
    safeText(els.feedbackDetail, 'Select a feedback report.');
    return;
  }
  safeText(els.feedbackDetail, [
    `Title: ${report.title || '-'}`,
    `Type: ${String(report.type || '-').toUpperCase()}`,
    `Status: ${String(report.status || '-').toUpperCase()}`,
    `Created: ${formatTime(report.createdAt)}`,
    `Reporter: ${report.reporterLogin || report.email || 'anonymous'}`,
    `Page: ${report.context?.pagePath || '-'}`,
    `Tab: ${report.context?.currentTab || '-'}`,
    `Source: ${report.context?.source || '-'}`,
    `Reviewed by: ${report.reviewedBy || '-'}`,
    `Reviewed at: ${formatTime(report.reviewedAt)}`,
    `Resolution note: ${report.resolutionNote || '-'}`,
    '',
    'Message:',
    report.message || '-'
  ].join('\n'));
}

function renderFeedbackForm(auth = state.snapshot?.auth || {}) {
  if (!els.submitFeedbackBtn) return;
  setButtonAccess(els.submitFeedbackBtn, true);
  if (auth?.user?.email && !String(els.feedbackEmail?.value || '').trim()) {
    setInputValue(els.feedbackEmail, auth.user.email);
  }
  if (!String(els.feedbackSubmitResult?.textContent || '').trim()) {
    safeText(els.feedbackSubmitResult, 'Send a bug report or product request here. It will be stored in DB and forwarded to support@aiagent-marketplace.net.');
  }
}

function renderFeedbackReports(reports = [], auth = state.snapshot?.auth || {}) {
  const canReview = Boolean(auth?.loggedIn && auth?.user?.login && auth?.canReviewFeedbackReports);
  if (!els.feedbackSummaryCard || !els.feedbackTable || !els.feedbackDetail) return;
  if (!canReview) {
    state.selectedFeedbackId = null;
    safeText(els.feedbackSummaryCard, auth?.loggedIn ? 'Reports are only visible to operators.' : 'Login required to review feedback reports.');
    els.feedbackSummaryCard.className = 'detail-box action-card warn compact-card';
    els.feedbackTable.innerHTML = `<div class="empty">${auth?.loggedIn ? 'Reports are only visible to operators.' : 'Login to review reports.'}</div>`;
    safeText(els.feedbackDetail, auth?.loggedIn ? 'Reports are only visible to operators.' : 'Select a feedback report.');
    setButtonAccess(els.feedbackReviewingBtn, false);
    setButtonAccess(els.feedbackResolvedBtn, false);
    setButtonAccess(els.feedbackReopenBtn, false);
    return;
  }
  const safeReports = Array.isArray(reports) ? [...reports] : [];
  const openCount = safeReports.filter((report) => report.status === 'open').length;
  const reviewingCount = safeReports.filter((report) => report.status === 'reviewing').length;
  const resolvedCount = safeReports.filter((report) => report.status === 'resolved').length;
  const latest = safeReports[0] || null;
  safeText(els.feedbackSummaryCard, [
    `Open: ${openCount}`,
    `Reviewing: ${reviewingCount}`,
    `Resolved: ${resolvedCount}`,
    `Latest: ${latest ? `${latest.title} (${sinceLabel(latest.createdAt)})` : 'none'}`
  ].join('\n'));
  els.feedbackSummaryCard.className = openCount ? 'detail-box action-card warn compact-card' : 'detail-box action-card ok compact-card';
  if (!safeReports.length) {
    state.selectedFeedbackId = null;
    els.feedbackTable.innerHTML = '<div class="empty">No feedback reports yet.</div>';
    safeText(els.feedbackDetail, 'No feedback reports yet.');
    setButtonAccess(els.feedbackReviewingBtn, false);
    setButtonAccess(els.feedbackResolvedBtn, false);
    setButtonAccess(els.feedbackReopenBtn, false);
    return;
  }
  if (!safeReports.some((report) => report.id === state.selectedFeedbackId)) {
    state.selectedFeedbackId = safeReports[0]?.id || null;
  }
  els.feedbackTable.innerHTML = `<div class="table-header feedback-grid"><div>TITLE</div><div>REPORTER</div><div>STATUS</div><div>TIME</div></div>${safeReports.map((report) => `
    <div class="table-row feedback-grid ${state.selectedFeedbackId === report.id ? 'selected-row' : ''}" data-feedback-id="${report.id}">
      <div>${escapeHtml(report.title || '-')}<div class="row-muted">${String(report.type || 'bug').toUpperCase()} · ${escapeHtml((report.context?.pagePath || '/').slice(0, 48))}</div></div>
      <div>${escapeHtml(report.reporterLogin || report.email || 'anonymous')}<div class="row-muted">${escapeHtml(report.context?.currentTab || report.context?.source || '-')}</div></div>
      <div><span class="status-pill ${report.status === 'resolved' ? 'ok' : report.status === 'reviewing' ? 'info' : 'warn'}">${String(report.status || 'open').toUpperCase()}</span><div class="row-muted">${escapeHtml((report.message || '').slice(0, 64) || '-')}</div></div>
      <div>${sinceLabel(report.createdAt)}<div class="row-muted">${formatTime(report.createdAt)}</div></div>
    </div>
  `).join('')}`;
  [...els.feedbackTable.querySelectorAll('[data-feedback-id]')].forEach((row) => {
    row.onclick = () => {
      state.selectedFeedbackId = row.dataset.feedbackId || null;
      renderFeedbackReports(state.snapshot?.feedbackReports || [], auth);
    };
  });
  const selected = selectedFeedbackReport();
  setFeedbackDetail(selected);
  const canAct = Boolean(selected);
  setButtonAccess(els.feedbackReviewingBtn, canAct);
  setButtonAccess(els.feedbackResolvedBtn, canAct);
  setButtonAccess(els.feedbackReopenBtn, canAct);
}

function renderConversionAnalytics(analytics = null, auth = state.snapshot?.auth || {}) {
  const canReview = Boolean(auth?.loggedIn && auth?.user?.login && auth?.canReviewFeedbackReports);
  if (!els.conversionSummaryCard || !els.conversionFunnelTable || !els.conversionRecentEvents) return;
  if (!canReview) {
    safeText(els.conversionSummaryCard, auth?.loggedIn ? 'Funnel analytics are only visible to operators.' : 'Login required to review funnel analytics.');
    els.conversionSummaryCard.className = 'detail-box action-card warn compact-card';
    els.conversionFunnelTable.innerHTML = `<div class="empty">${auth?.loggedIn ? 'Operator access required.' : 'Login to review conversion analytics.'}</div>`;
    safeText(els.conversionRecentEvents, 'No conversion analytics visible.');
    return;
  }
  const actuals = analytics?.actuals || {};
  const pageViews = (analytics?.funnel || []).find((row) => row.event === 'page_view') || {};
  const chatMessages = (analytics?.funnel || []).find((row) => row.event === 'chat_message_sent') || {};
  const orders = (analytics?.funnel || []).find((row) => row.event === 'order_created') || {};
  const agentStarts = (analytics?.funnel || []).find((row) => row.event === 'agent_publish_started') || {};
  renderSummaryRows(els.conversionSummaryCard, [
    { label: 'Tracked visitors', value: `${pageViews.uniqueVisitors || 0}` },
    { label: 'Chat messages 24h / 7d', value: `${chatMessages.last24h || 0} / ${chatMessages.last7d || 0}` },
    { label: 'Orders 24h / 7d', value: `${orders.last24h || 0} / ${orders.last7d || 0}` },
    { label: 'Agent publish starts 24h / 7d', value: `${agentStarts.last24h || 0} / ${agentStarts.last7d || 0}` },
    { label: 'Actual accounts 24h / 7d / total', value: `${actuals.accounts?.last24h || 0} / ${actuals.accounts?.last7d || 0} / ${actuals.accounts?.total || 0}` },
    { label: 'Actual orders 24h / 7d / total', value: `${actuals.orders?.last24h || 0} / ${actuals.orders?.last7d || 0} / ${actuals.orders?.total || 0}` },
    { label: 'User agents current', value: `${actuals.userAgents?.total || 0}` }
  ]);
  els.conversionSummaryCard.className = 'detail-box action-card info compact-card';
  const rows = Array.isArray(analytics?.funnel) ? analytics.funnel : [];
  els.conversionFunnelTable.innerHTML = `<div class="table-header conversion-grid"><div>EVENT</div><div>24H</div><div>7D</div><div>TOTAL</div><div>VISITORS</div><div>LAST SEEN</div></div>${rows.map((row) => `
    <div class="table-row conversion-grid">
      <div>${escapeHtml(row.label || row.event || '-')}<div class="row-muted">${escapeHtml(row.event || '-')}</div></div>
      <div>${Number(row.last24h || 0)}</div>
      <div>${Number(row.last7d || 0)}</div>
      <div>${Number(row.total || 0)}</div>
      <div>${Number(row.uniqueVisitors || 0)}</div>
      <div>${row.lastSeenAt ? sinceLabel(row.lastSeenAt) : '-'}<div class="row-muted">${escapeHtml(formatTime(row.lastSeenAt))}</div></div>
    </div>
  `).join('')}`;
  const recent = Array.isArray(analytics?.recent) ? analytics.recent : [];
  safeText(els.conversionRecentEvents, recent.length
    ? recent.map((event) => [
        `${formatTime(event.ts)} · ${event.label || event.event}`,
        `visitor=${event.visitor || '-'} login=${event.loggedIn ? 'yes' : 'no'} auth=${event.authProvider || 'guest'} tab=${event.tab || '-'}`,
        `source=${event.source || '-'} page=${event.pagePath || '/'}${event.promptChars ? ` promptChars=${event.promptChars}` : ''}${event.status ? ` status=${event.status}` : ''}`
      ].join('\n')).join('\n\n')
    : 'No conversion events recorded yet.');
}

function renderChatTranscripts(transcripts = [], auth = state.snapshot?.auth || {}) {
  const canReview = Boolean(auth?.loggedIn && auth?.user?.login && auth?.canReviewFeedbackReports);
  if (!els.chatTranscriptSummaryCard || !els.chatTranscriptRecent || !els.chatTranscriptTable || !els.chatTranscriptDetail) return;
  if (!canReview) {
    state.selectedChatTranscriptId = null;
    safeText(els.chatTranscriptSummaryCard, auth?.loggedIn ? 'Chat transcripts are only visible to operators.' : 'Login required to review chat transcripts.');
    els.chatTranscriptSummaryCard.className = 'detail-box action-card warn compact-card';
    els.chatTranscriptTable.innerHTML = `<div class="empty">${auth?.loggedIn ? 'Operator access required.' : 'Login to review chat transcripts.'}</div>`;
    setChatTranscriptDetail(null);
    safeText(els.chatTranscriptRecent, 'No chat transcripts visible.');
    setButtonAccess(els.chatTranscriptReviewingBtn, false);
    setButtonAccess(els.chatTranscriptFixedBtn, false);
    setButtonAccess(els.chatTranscriptIgnoreBtn, false);
    setButtonAccess(els.chatTrainingExportBtn, false);
    safeText(els.chatTrainingExportResult, 'Operator access required to export reviewed training data.');
    return;
  }
  const safeTranscripts = Array.isArray(transcripts) ? transcripts : [];
  const last24h = safeTranscripts.filter((item) => {
    const ms = Date.parse(item.createdAt || '');
    return Number.isFinite(ms) && Date.now() - ms <= 24 * 60 * 60 * 1000;
  }).length;
  const redactedCount = safeTranscripts.filter((item) => item.redacted).length;
  const newCount = safeTranscripts.filter((item) => (item.reviewStatus || 'new') === 'new').length;
  const reviewingCount = safeTranscripts.filter((item) => item.reviewStatus === 'reviewing').length;
  const fixedCount = safeTranscripts.filter((item) => item.reviewStatus === 'fixed').length;
  const latest = safeTranscripts[0] || null;
  renderSummaryRows(els.chatTranscriptSummaryCard, [
    { label: 'Saved chats 24h / total', value: `${last24h} / ${safeTranscripts.length}` },
    { label: 'New / reviewing / fixed', value: `${newCount} / ${reviewingCount} / ${fixedCount}` },
    { label: 'Redacted or truncated', value: `${redactedCount}` },
    { label: 'Latest', value: latest ? `${sinceLabel(latest.createdAt)} · ${latest.answerKind || latest.status || 'chat'}` : 'none' }
  ]);
  els.chatTranscriptSummaryCard.className = 'detail-box action-card info compact-card';
  if (!safeTranscripts.length) {
    state.selectedChatTranscriptId = null;
    els.chatTranscriptTable.innerHTML = '<div class="empty">No chat transcripts recorded yet.</div>';
    setChatTranscriptDetail(null);
    safeText(els.chatTranscriptRecent, 'No chat transcripts recorded yet.');
    setButtonAccess(els.chatTranscriptReviewingBtn, false);
    setButtonAccess(els.chatTranscriptFixedBtn, false);
    setButtonAccess(els.chatTranscriptIgnoreBtn, false);
    setButtonAccess(els.chatTrainingExportBtn, true);
    return;
  }
  if (!safeTranscripts.some((item) => item.id === state.selectedChatTranscriptId)) {
    state.selectedChatTranscriptId = safeTranscripts.find((item) => (item.reviewStatus || 'new') === 'new')?.id || safeTranscripts[0]?.id || null;
  }
  els.chatTranscriptTable.innerHTML = `<div class="table-header chat-transcript-grid"><div>STATUS</div><div>TASK</div><div>USER INPUT</div><div>TIME</div></div>${safeTranscripts.slice(0, 80).map((item) => {
    const status = String(item.reviewStatus || 'new');
    const tone = status === 'fixed' ? 'ok' : status === 'reviewing' ? 'info' : status === 'ignored' ? 'muted' : 'warn';
    return `
      <div class="table-row chat-transcript-grid ${state.selectedChatTranscriptId === item.id ? 'selected-row' : ''}" data-chat-transcript-id="${escapeHtml(item.id)}">
        <div><span class="status-pill ${tone}">${status.toUpperCase()}</span><div class="row-muted">${escapeHtml(item.answerKind || item.status || 'chat')}</div></div>
        <div>${escapeHtml(item.taskType || '-')}<div class="row-muted">${escapeHtml(item.source || 'work_chat')}</div></div>
        <div>${escapeHtml((item.prompt || '-').slice(0, 110))}<div class="row-muted">${escapeHtml((item.improvementNote || item.expectedHandling || '').slice(0, 90) || 'No improvement note yet')}</div></div>
        <div>${sinceLabel(item.createdAt)}<div class="row-muted">${escapeHtml(formatTime(item.createdAt))}</div></div>
      </div>
    `;
  }).join('')}`;
  [...els.chatTranscriptTable.querySelectorAll('[data-chat-transcript-id]')].forEach((row) => {
    row.onclick = () => {
      state.selectedChatTranscriptId = row.dataset.chatTranscriptId || null;
      renderChatTranscripts(state.snapshot?.chatTranscripts || [], auth);
    };
  });
  const selected = selectedChatTranscript();
  setChatTranscriptDetail(selected);
  const canAct = Boolean(selected);
  setButtonAccess(els.chatTranscriptReviewingBtn, canAct);
  setButtonAccess(els.chatTranscriptFixedBtn, canAct);
  setButtonAccess(els.chatTranscriptIgnoreBtn, canAct);
  setButtonAccess(els.chatTrainingExportBtn, true);
  safeText(els.chatTranscriptRecent, safeTranscripts.length
    ? safeTranscripts.slice(0, 12).map((item) => [
        `${formatTime(item.createdAt)} · ${String(item.reviewStatus || 'new').toUpperCase()} · ${item.answerKind || item.status || 'chat'} · visitor=${item.visitorId || item.accountHash || '-'}`,
        `login=${item.loggedIn ? 'yes' : 'no'} auth=${item.authProvider || 'guest'} tab=${item.tab || '-'} task=${item.taskType || '-'}`,
        `chars prompt=${item.promptChars || 0} answer=${item.answerChars || 0}${item.redacted ? ' redacted=yes' : ''}`,
        `expected=${item.expectedHandling || '-'}`,
        `note=${item.improvementNote || '-'}`,
        'USER:',
        item.prompt || '-',
        'CAIt:',
        item.answer || '-'
      ].join('\n')).join('\n\n---\n\n')
    : 'No chat transcripts recorded yet.');
}

function setAdminDetail(title, value) {
  if (!els.adminDetail) return;
  safeText(els.adminDetail, `${title}\n\n${JSON.stringify(value || {}, null, 2)}`);
}

function adminChatSessionDetailText(chat = {}) {
  const turns = Array.isArray(chat.turns) && chat.turns.length ? chat.turns : [chat];
  const lines = [
    'CHAT SESSION DETAIL',
    '',
    `Session: ${chat.sessionId || chat.id || '-'}`,
    `Segment: ${chat.adminSegmentLabel || chat.adminSegment || chat.authProvider || '-'}`,
    `Handling: ${chat.handlingLabel || chat.handlingStatus || '-'}`,
    `Started: ${formatTime(chat.startedAt || chat.createdAt)}`,
    `Updated: ${formatTime(chat.updatedAt || chat.createdAt)}`,
    `Turns: ${chat.turnCount || turns.length}`,
    `Active order: ${chat.linkedOrderId || (Array.isArray(chat.activeJobIds) && chat.activeJobIds.length ? chat.activeJobIds.join(', ') : '-')}`,
    ''
  ];
  turns.forEach((turn, index) => {
    lines.push(
      `#${index + 1} ${formatTime(turn.createdAt || chat.createdAt)} · ${String(turn.answerKind || turn.status || 'chat').toUpperCase()} · task=${turn.taskType || chat.latestTaskType || '-'}`,
      `Review: ${turn.reviewStatus || chat.latestReviewStatus || 'new'}${turn.redacted ? ' · redacted' : ''}`,
      'USER:',
      turn.prompt || '-',
      'CAIt:',
      turn.answer || '-'
    );
    if (turn.expectedHandling) lines.push('Expected handling:', turn.expectedHandling);
    if (turn.improvementNote) lines.push('Improvement note:', turn.improvementNote);
    lines.push('');
  });
  return lines.join('\n').trim();
}

function setAdminChatSessionDetail(chat = {}) {
  const detailText = adminChatSessionDetailText(chat);
  safeText(els.adminDetail, detailText);
  safeText(els.adminChatSessionDetail, detailText);
}

function renderAdminRows(container, gridClass, headers = [], rows = [], emptyText = 'No records yet.') {
  if (!container) return;
  if (!rows.length) {
    container.innerHTML = `<div class="empty">${escapeHtml(emptyText)}</div>`;
    return;
  }
  container.innerHTML = [
    `<div class="table-header ${gridClass}">${headers.map((header) => `<div>${escapeHtml(header)}</div>`).join('')}</div>`,
    ...rows.map((row) => `<div class="table-row ${gridClass}" data-admin-kind="${escapeHtml(row.kind)}" data-admin-index="${row.index}" data-admin-key="${escapeHtml(row.key || '')}">${row.cells.map((cell) => `<div>${cell}</div>`).join('')}</div>`)
  ].join('');
  [...container.querySelectorAll('[data-admin-kind]')].forEach((node) => {
    node.onclick = () => {
      const kind = node.dataset.adminKind || '';
      const index = Number(node.dataset.adminIndex || 0);
      const key = String(node.dataset.adminKey || '').trim();
      const source = state.snapshot?.adminDashboard?.[kind] || [];
      const item = key
        ? (source.find((entry) => [entry?.id, entry?.sessionId].map((value) => String(value || '')).includes(key)) || source[index] || {})
        : (source[index] || {});
      [...container.querySelectorAll('.selected-row')].forEach((row) => row.classList.remove('selected-row'));
      node.classList.add('selected-row');
      if (kind === 'chats') {
        setAdminChatSessionDetail(item);
        return;
      }
      setAdminDetail(`${kind.toUpperCase()} DETAIL`, item);
    };
  });
}

const ADMIN_PAGE_SIZES = {
  accounts: 80,
  orders: 80,
  chats: 80,
  agents: 80,
  reports: 80,
  events: 100
};

function adminPageSize(kind = '') {
  return Number(ADMIN_PAGE_SIZES[kind] || 80);
}

function adminPageIndex(kind = '') {
  const raw = Number(state.adminPages?.[kind] || 0);
  return Number.isFinite(raw) && raw >= 0 ? Math.floor(raw) : 0;
}

function paginateAdminItems(kind = '', items = []) {
  const source = Array.isArray(items) ? items : [];
  const pageSize = adminPageSize(kind);
  const totalItems = source.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(adminPageIndex(kind), Math.max(0, totalPages - 1));
  if (!state.adminPages || typeof state.adminPages !== 'object') state.adminPages = {};
  state.adminPages[kind] = currentPage;
  const start = currentPage * pageSize;
  const visibleItems = source.slice(start, start + pageSize);
  return {
    items: visibleItems,
    start,
    end: start + visibleItems.length,
    pageSize,
    currentPage,
    totalItems,
    totalPages
  };
}

function renderAdminPager(container, kind = '', page = null) {
  if (!container) return;
  const data = page && typeof page === 'object' ? page : paginateAdminItems(kind, []);
  if (!data.totalItems) {
    container.hidden = true;
    container.innerHTML = '';
    return;
  }
  container.hidden = false;
  container.innerHTML = [
    `<span class="admin-pager-summary">${escapeHtml(`${data.start + 1}-${data.end} of ${data.totalItems} · page ${data.currentPage + 1}/${data.totalPages}`)}</span>`,
    '<div class="helper-row">',
    `<button type="button" class="mini-btn" data-admin-page-kind="${escapeHtml(kind)}" data-admin-page-direction="prev"${data.currentPage <= 0 ? ' disabled' : ''}>PREV</button>`,
    `<button type="button" class="mini-btn" data-admin-page-kind="${escapeHtml(kind)}" data-admin-page-direction="next"${data.currentPage >= data.totalPages - 1 ? ' disabled' : ''}>NEXT</button>`,
    '</div>'
  ].join('');
  [...container.querySelectorAll('[data-admin-page-kind]')].forEach((button) => {
    button.onclick = () => {
      const direction = button.dataset.adminPageDirection || 'next';
      const delta = direction === 'prev' ? -1 : 1;
      state.adminPages[kind] = Math.max(0, adminPageIndex(kind) + delta);
      renderAdminDashboard(state.snapshot?.adminDashboard || null, state.snapshot?.auth || {});
    };
  });
}

const ADMIN_CHAT_FILTERS = {
  needsReview: (chat) => chat?.adminSegment !== 'mine' && chat?.handlingStatus === 'needs_review',
  handled: (chat) => chat?.adminSegment !== 'mine' && chat?.handlingStatus !== 'needs_review',
  nonMine: (chat) => chat?.adminSegment !== 'mine',
  guest: (chat) => chat?.adminSegment === 'guest_unknown',
  other: (chat) => chat?.adminSegment === 'other_account',
  mine: (chat) => chat?.adminSegment === 'mine',
  all: () => true
};

function activeAdminChatFilter() {
  return ADMIN_CHAT_FILTERS[state.adminChatFilter] ? state.adminChatFilter : 'all';
}

function adminChatFilterCounts(dashboard = state.snapshot?.adminDashboard || null) {
  const summary = dashboard?.summary?.chats || {};
  return {
    needsReview: Number(summary.needsReviewNonMine || 0),
    handled: Number(summary.handledNonMine || 0),
    nonMine: Number(summary.nonMine || 0),
    guest: Number(summary.guestUnknown || 0),
    other: Number(summary.otherLoggedIn || 0),
    mine: Number(summary.mine || 0),
    all: Number(summary.total || 0)
  };
}

function renderAdminChatFilterButtons(dashboard = state.snapshot?.adminDashboard || null) {
  const active = activeAdminChatFilter();
  const counts = adminChatFilterCounts(dashboard);
  [
    [els.adminChatFilterNeedsReviewBtn, 'needsReview', 'NEEDS REVIEW'],
    [els.adminChatFilterHandledBtn, 'handled', 'HANDLED'],
    [els.adminChatFilterNonMineBtn, 'nonMine', 'NON-ME'],
    [els.adminChatFilterGuestBtn, 'guest', 'GUEST / UNKNOWN'],
    [els.adminChatFilterOtherBtn, 'other', 'OTHER LOGIN'],
    [els.adminChatFilterMineBtn, 'mine', 'MY LOGIN'],
    [els.adminChatFilterAllBtn, 'all', 'ALL']
  ].forEach(([button, filter, label]) => {
    if (!button) return;
    button.classList.toggle('active', active === filter);
    button.textContent = `${label} ${counts[filter] ?? 0}`;
  });
}

function adminChatHandlingClass(chat = {}) {
  if (chat.handlingNeedsReview || chat.handlingStatus === 'needs_review') return 'error';
  if (chat.handlingStatus === 'clarified') return 'warn';
  if (chat.handlingStatus === 'order_brief_prepared') return 'ok';
  return 'info';
}

function setAdminChatFilter(filter = 'all') {
  state.adminChatFilter = ADMIN_CHAT_FILTERS[filter] ? filter : 'all';
  state.adminPages.chats = 0;
  renderAdminDashboard(state.snapshot?.adminDashboard || null, state.snapshot?.auth || {});
}

function renderAdminDashboard(dashboard = null, auth = state.snapshot?.auth || {}) {
  const isAdmin = Boolean(auth?.isPlatformAdmin && dashboard);
  if (!els.adminAccessCard) return;
  if (!isAdmin) {
    safeText(els.adminAccessCard, auth?.loggedIn ? 'Admin dashboard is only visible to the platform admin login.' : 'Login as platform admin to view this dashboard.');
    els.adminAccessCard.className = 'detail-box action-card warn compact-card';
    safeText(els.adminChatSegmentationCard, 'Admin access required.');
    [els.adminAccountsTable, els.adminOrdersTable, els.adminChatTable, els.adminAgentsTable, els.adminFeedbackTable, els.adminEventsTable].forEach((node) => {
      if (node) node.innerHTML = '<div class="empty">Admin access required.</div>';
    });
    [els.adminAccountsPager, els.adminOrdersPager, els.adminChatPager, els.adminAgentsPager, els.adminFeedbackPager, els.adminEventsPager].forEach((node) => {
      if (!node) return;
      node.hidden = true;
      node.innerHTML = '';
    });
    safeText(els.adminAccountsMetric, '-');
    safeText(els.adminChatsMetric, '-');
    safeText(els.adminOrdersMetric, '-');
    safeText(els.adminAgentsMetric, '-');
    safeText(els.adminIssuesMetric, '-');
    safeText(els.adminActiveMetric, '-');
    safeText(els.adminDetail, 'Admin access required.');
    safeText(els.adminChatSessionDetail, 'Admin access required.');
    renderAdminChatFilterButtons();
    return;
  }
  const summary = dashboard.summary || {};
  safeText(els.adminAccountsMetric, summary.accounts?.total || 0);
  safeText(els.adminChatsMetric, summary.chats?.total || 0);
  safeText(els.adminOrdersMetric, summary.orders?.total || 0);
  safeText(els.adminAgentsMetric, summary.agents?.total ?? 0);
  safeText(els.adminIssuesMetric, summary.reports?.open || 0);
  safeText(els.adminActiveMetric, summary.orders?.active || 0);
  renderSummaryRows(els.adminAccessCard, [
    { label: 'Generated', value: formatTime(dashboard.generatedAt) },
    { label: 'Operator', value: dashboard.operator || auth.login || '-' },
    { label: 'Accounts 24h / 7d / total', value: `${summary.accounts?.last24h || 0} / ${summary.accounts?.last7d || 0} / ${summary.accounts?.total || 0}` },
    { label: 'Chat sessions 24h / 7d / total', value: `${summary.chats?.last24h || 0} / ${summary.chats?.last7d || 0} / ${summary.chats?.total || 0}` },
    { label: 'Chat turns total', value: `${summary.chats?.turnsTotal || 0}` },
    { label: 'Agents total / user / ready', value: `${summary.agents?.total || 0} / ${summary.agents?.userAgents || 0} / ${summary.agents?.ready || 0}` },
    { label: 'Orders active / completed / failed', value: `${summary.orders?.active || 0} / ${summary.orders?.completed || 0} / ${summary.orders?.failed || 0}` },
    { label: 'Issues open / reviewing / resolved', value: `${summary.reports?.open || 0} / ${summary.reports?.reviewing || 0} / ${summary.reports?.resolved || 0}` },
    { label: 'Provider billing accounts / retrying / notified', value: `${summary.providerBilling?.accounts || 0} / ${summary.providerBilling?.retrying || 0} / ${summary.providerBilling?.notified || 0}` }
  ]);
  els.adminAccessCard.className = 'detail-box action-card info compact-card';

  const chatHandling = dashboard.chatHandling || {};
  const chatStatusCounts = chatHandling.byStatus || {};
  renderSummaryRows(els.adminChatSegmentationCard, [
    { label: 'My logged-in sessions', value: summary.chats?.mine || 0 },
    { label: 'Other logged-in sessions', value: summary.chats?.otherLoggedIn || 0 },
    { label: 'Guest / unknown sessions', value: summary.chats?.guestUnknown || 0 },
    { label: 'Non-me handled / total', value: `${summary.chats?.handledNonMine || 0} / ${summary.chats?.nonMine || 0}` },
    { label: 'Needs review sessions', value: summary.chats?.needsReviewNonMine || 0 },
    { label: 'Handling breakdown', value: Object.entries(chatStatusCounts).map(([key, value]) => `${key}:${value}`).join(' · ') || '-' }
  ]);
  els.adminChatSegmentationCard.className = `detail-box action-card ${summary.chats?.needsReviewNonMine ? 'warn' : 'info'} compact-card`;
  renderAdminChatFilterButtons(dashboard);

  const accounts = dashboard.accounts || [];
  const pagedAccounts = paginateAdminItems('accounts', accounts.map((account, index) => ({ account, index })));
  renderAdminRows(els.adminAccountsTable, 'admin-accounts-grid', ['LOGIN', 'AUTH', 'BILLING', 'UPDATED'], pagedAccounts.items.map(({ account, index }) => ({
    kind: 'accounts',
    index,
    cells: [
      `${escapeHtml(account.login || '-')}<div class="row-muted">${escapeHtml(account.email || account.displayName || '-')}</div>`,
      `${escapeHtml((account.linkedProviders || []).join(', ') || account.authProvider || '-')}<div class="row-muted">keys ${account.apiKeys?.active || 0}/${account.apiKeys?.total || 0} · repos ${account.githubRepos || 0}</div>`,
      `${yen(account.arrearsTotal || 0)} due<div class="row-muted">welcome ${yen(account.welcomeCreditsBalance || 0)}</div>`,
      `${sinceLabel(account.updatedAt || account.createdAt)}<div class="row-muted">${escapeHtml(formatTime(account.createdAt))} · provider retry ${escapeHtml(String(account.providerMonthlyRetryCount || 0))}${account.providerMonthlyLastNotificationPeriod ? ` · notified ${escapeHtml(account.providerMonthlyLastNotificationPeriod)}` : ''}</div>`
    ]
  })), 'No member registrations yet.');
  renderAdminPager(els.adminAccountsPager, 'accounts', pagedAccounts);

  const orders = dashboard.orders || [];
  const pagedOrders = paginateAdminItems('orders', orders.map((job, index) => ({ job, index })));
  renderAdminRows(els.adminOrdersTable, 'admin-orders-grid', ['ORDER', 'REQUESTER', 'STATUS', 'COST'], pagedOrders.items.map(({ job, index }) => ({
    kind: 'orders',
    index,
    cells: [
      `${escapeHtml(job.taskType || '-')}<div class="row-muted">${escapeHtml((job.prompt || '-').slice(0, 70))}</div>`,
      `${escapeHtml(job.requesterLogin || '-')}<div class="row-muted">${escapeHtml(job.assignedAgentId || job.parentAgentId || '-')}</div>`,
      `<span class="status-pill ${job.status === 'completed' ? 'ok' : ['failed', 'timed_out'].includes(job.status) ? 'error' : 'info'}">${escapeHtml(orderProgressStatusLabel(job.status).toUpperCase())}</span><div class="row-muted">${sinceLabel(job.createdAt)}</div>`,
      `${job.actualBilling ? yen(job.actualBilling.total || 0) : '-'}<div class="row-muted">platform ${job.actualBilling ? yen(job.actualBilling.platformRevenue || 0) : '-'}</div>`
    ]
  })), 'No orders yet.');
  renderAdminPager(els.adminOrdersPager, 'orders', pagedOrders);

  const chats = dashboard.chats || [];
  const chatFilter = activeAdminChatFilter();
  const allChatRows = chats
    .map((chat, index) => ({ chat, index }))
    .filter(({ chat }) => ADMIN_CHAT_FILTERS[chatFilter](chat));
  const pagedChats = paginateAdminItems('chats', allChatRows);
  renderAdminRows(els.adminChatTable, 'admin-chat-grid', ['TIME', 'USER INPUT', 'ANSWER', 'HANDLING'], pagedChats.items.map(({ chat, index }) => ({
    kind: 'chats',
    index,
    key: chat.id || chat.sessionId || '',
    cells: [
      `${sinceLabel(chat.createdAt)}<div class="row-muted">${escapeHtml(chat.adminSegmentLabel || chat.authProvider || 'guest')} · ${escapeHtml(chat.sessionId || chat.id || '-')}</div>`,
      `${escapeHtml((chat.prompt || '-').slice(0, 90))}<div class="row-muted">${escapeHtml(`${chat.turnCount || 1} turns`)} · task ${escapeHtml(chat.latestTaskType || chat.taskType || '-')}</div>`,
      `${escapeHtml((chat.answer || '-').slice(0, 90))}<div class="row-muted">started ${escapeHtml(formatTime(chat.startedAt || chat.createdAt))}${chat.recentPromptPreview ? ` · ${escapeHtml(chat.recentPromptPreview.slice(0, 110))}` : ''}</div>`,
      `<span class="status-pill ${adminChatHandlingClass(chat)}">${escapeHtml(String(chat.handlingLabel || chat.handlingStatus || 'needs_review').toUpperCase())}</span><div class="row-muted">review ${escapeHtml(chat.latestReviewStatus || chat.reviewStatus || 'new')} · ${chat.redacted ? 'redacted' : 'plain'}</div>`
    ]
  })), chatFilter === 'needsReview' ? 'No chats currently need review.' : `No chat history for ${chatFilter}.`);
  renderAdminPager(els.adminChatPager, 'chats', pagedChats);

  const agents = dashboard.agents || [];
  const pagedAgents = paginateAdminItems('agents', agents.map((agent, index) => ({ agent, index })));
  renderAdminRows(els.adminAgentsTable, 'admin-agents-grid', ['AGENT', 'OWNER', 'STATUS', 'PRICING'], pagedAgents.items.map(({ agent, index }) => ({
    kind: 'agents',
    index,
    cells: [
      `${escapeHtml(agent.name || '-')}<div class="row-muted">${escapeHtml((agent.taskTypes || []).join(', ') || '-')}</div>`,
      `${escapeHtml(agent.owner || '-')}<div class="row-muted">${escapeHtml(agent.productKind || 'agent')}</div>`,
      `<span class="status-pill ${agent.ready ? 'ok' : agent.online ? 'info' : 'warn'}">${agent.ready ? 'READY' : agent.online ? 'ONLINE' : 'OFFLINE'}</span><div class="row-muted">${escapeHtml(agent.verificationStatus || '-')} · ${escapeHtml(agent.agentReviewStatus || '-')}</div>`,
      `${formatPercent(agent.providerMarkupRate || 0)}<div class="row-muted">margin ${formatPercent(agent.platformMarginRate || 0)}</div>`
    ]
  })), 'No agents yet.');
  renderAdminPager(els.adminAgentsPager, 'agents', pagedAgents);

  const reports = dashboard.reports || [];
  const pagedReports = paginateAdminItems('reports', reports.map((report, index) => ({ report, index })));
  renderAdminRows(els.adminFeedbackTable, 'admin-feedback-grid', ['REPORT', 'REPORTER', 'STATUS', 'TIME'], pagedReports.items.map(({ report, index }) => ({
    kind: 'reports',
    index,
    cells: [
      `${escapeHtml(report.title || '-')}<div class="row-muted">${escapeHtml((report.message || '-').slice(0, 70))}</div>`,
      `${escapeHtml(report.reporterLogin || report.email || 'anonymous')}<div class="row-muted">${escapeHtml(report.context?.pagePath || '-')}</div>`,
      `<span class="status-pill ${report.status === 'resolved' ? 'ok' : report.status === 'reviewing' ? 'info' : 'warn'}">${escapeHtml(String(report.status || 'open').toUpperCase())}</span><div class="row-muted">${escapeHtml(report.type || 'bug')}</div>`,
      `${sinceLabel(report.createdAt)}<div class="row-muted">${escapeHtml(formatTime(report.createdAt))}</div>`
    ]
  })), 'No report issues yet.');
  renderAdminPager(els.adminFeedbackPager, 'reports', pagedReports);

  const events = dashboard.events || [];
  const pagedEvents = paginateAdminItems('events', events.map((event, index) => ({ event, index })));
  renderAdminRows(els.adminEventsTable, 'admin-events-grid', ['TIME', 'TYPE', 'MESSAGE'], pagedEvents.items.map(({ event, index }) => ({
    kind: 'events',
    index,
    cells: [
      `${sinceLabel(event.createdAt)}<div class="row-muted">${escapeHtml(formatTime(event.createdAt))}</div>`,
      `<span class="status-pill info">${escapeHtml(event.type || '-')}</span>`,
      `${escapeHtml(event.message || '-')}<div class="row-muted">${escapeHtml(JSON.stringify(event.meta || {}).slice(0, 90))}</div>`
    ]
  })), 'No system events yet.');
  renderAdminPager(els.adminEventsPager, 'events', pagedEvents);

  if (!String(els.adminDetail?.textContent || '').trim() || els.adminDetail.textContent === 'Admin access required.') {
    setAdminDetail('ADMIN SUMMARY', {
      summary: dashboard.summary,
      generatedAt: dashboard.generatedAt
    });
  }
}

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

const MARKETING_EMAIL_TASKS = new Set([
  'email_ops',
  'cold_email'
]);

const MARKETING_SOCIAL_TASKS = new Set([
  'x_post',
  'reddit',
  'indie_hackers',
  'instagram'
]);

function requesterIdentityKeys(auth = {}) {
  return [...new Set([
    auth?.user?.login,
    auth?.user?.email,
    auth?.user?.name,
    auth?.login,
    ...(Array.isArray(auth?.account?.aliases) ? auth.account.aliases : []),
    ...((Array.isArray(auth?.account?.linkedIdentities) ? auth.account.linkedIdentities : []).flatMap((identity) => [identity?.login, identity?.email]))
  ].map((value) => String(value || '').trim().toLowerCase()).filter(Boolean))];
}

function requesterLoginOf(job = {}) {
  return String(job?.input?._broker?.requester?.login || '').trim().toLowerCase();
}

function requesterAccountIdOf(job = {}) {
  return String(job?.input?._broker?.requester?.accountId || '').trim().toLowerCase();
}

function requesterScopeForClient(auth = state.snapshot?.auth || {}) {
  const identityKeys = requesterIdentityKeys(auth);
  const mineAccountIds = [...new Set([
    auth?.account?.id,
    ...identityKeys.map((login) => `acct:${login}`)
  ].map((value) => String(value || '').trim().toLowerCase()).filter(Boolean))];
  return {
    auth,
    identityKeys,
    mineAccountIds,
    filter: String(state.runRequesterFilter || (auth?.isPlatformAdmin ? 'all' : 'mine')).trim().toLowerCase() || (auth?.isPlatformAdmin ? 'all' : 'mine')
  };
}

function requesterMatchesScope(login = '', accountId = '', scope = requesterScopeForClient()) {
  const filter = String(scope?.filter || 'all').trim().toLowerCase();
  const safeLogin = String(login || '').trim().toLowerCase();
  const safeAccountId = String(accountId || '').trim().toLowerCase();
  if (filter === 'all') return true;
  if (filter === 'mine') {
    return Boolean(
      (safeLogin && Array.isArray(scope?.identityKeys) && scope.identityKeys.includes(safeLogin))
      || (safeAccountId && Array.isArray(scope?.mineAccountIds) && scope.mineAccountIds.includes(safeAccountId))
    );
  }
  return safeLogin === filter;
}

function runMatchesRequesterScope(job = {}, scope = requesterScopeForClient()) {
  return requesterMatchesScope(requesterLoginOf(job), requesterAccountIdOf(job), scope);
}

function recurringOrderMatchesRequesterScope(order = {}, scope = requesterScopeForClient()) {
  return requesterMatchesScope(String(order?.ownerLogin || '').trim().toLowerCase(), '', scope);
}

function isMarketingTimelineTask(taskType = '') {
  const task = String(taskType || '').trim().toLowerCase();
  return Boolean(task);
}

function marketingTimelineIntentText(value = '') {
  return /(?:timeline|history|scheduled|schedule|future action|future actions|what will|what is going to|delivery history|run history|show.*(?:run|history|schedule)|履歴|実行履歴|予約|今後|次に何が|何が送られる|何が投稿|何が実行|配信予定|投稿予定|実行予定|timeline|agent work)/i.test(String(value || ''));
}

function openChatLooksExplicitTimelineView(value = '') {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text) return false;
  if (/^(?:work timeline|timeline|run history|history|schedule|実行履歴|履歴|予約|今後|配信予定|投稿予定|実行予定)$/.test(text.toLowerCase())) return true;
  return /(?:(?:show|open|view|see|display|look at|見せ|見たい|見る|開い|表示|呼び出|確認).{0,16}(?:work timeline|timeline|history|schedule|実行履歴|履歴|予約|今後|配信予定|投稿予定|実行予定)|(?:work timeline|timeline|history|schedule|実行履歴|履歴|予約|今後|配信予定|投稿予定|実行予定).{0,16}(?:show|open|view|see|display|見せ|見たい|見る|開い|表示|呼び出|確認))/i.test(text);
}

function openChatLooksExplicitTimelinePlan(value = '') {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text) return false;
  return /(?:(?:plan|create|make|build|draft|prepare|organize|roadmap|day-by-day|week-by-week|作っ|作成|計画|設計|立て|組ん|引い|策定).{0,18}(?:timeline|schedule|roadmap|タイムライン|日程|計画)|(?:timeline|schedule|roadmap|タイムライン|日程|計画).{0,18}(?:plan|create|make|build|draft|prepare|organize|day-by-day|week-by-week|作っ|作成|計画|設計|立て|組ん|引い|策定))/i.test(text);
}

function openChatLooksTimelineReference(value = '') {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text) return false;
  return /(?:work timeline|timeline|roadmap|schedule|execution plan|launch plan|go to market plan|タイムライン|ロードマップ|スケジュール|予定|実行計画|今後の計画|今後の予定|配信予定|投稿予定|実行予定)/i.test(text);
}

function openChatLooksConcreteTimelinePlanContext(value = '') {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text) return false;
  if (openChatLooksExplicitTimelinePlan(text)) return true;
  const hasTarget = /(?:for|to|toward|until|before|after|launch|release|campaign|project|feature|migration|rollout|plan for|向け|までの|について|対象|案件|仕事|プロジェクト|機能|施策|キャンペーン|ローンチ|リリース|移行)/i.test(text);
  const hasTimeFrame = /(?:today|tomorrow|this week|next week|this month|next month|next quarter|q[1-4]|by [a-z0-9]|due|deadline|yyyy|day-by-day|week-by-week|日次|週次|月次|四半期|今日|明日|今週|来週|今月|来月|期限|締切|まで|日ごと|週ごと)/i.test(text)
    || /\b20\d{2}\b/.test(text)
    || /\b\d{1,2}\/\d{1,2}\b/.test(text);
  return hasTarget && hasTimeFrame;
}

function openChatLooksAmbiguousTimelineIntent(value = '') {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text) return false;
  if (!openChatLooksTimelineReference(text)) return false;
  if (/^(?:work timeline|timeline|run history|history|schedule|実行履歴|履歴|予約|今後|配信予定|投稿予定|実行予定)$/.test(text.toLowerCase())) return false;
  if (openChatLooksExplicitTimelineView(text) || openChatLooksExplicitTimelinePlan(text)) return false;
  if (openChatLooksConcreteTimelinePlanContext(text)) return false;
  return text.length <= 72;
}

function buildOpenChatTimelineIntentChoiceAnswer(prompt = '') {
  if (!openChatLooksAmbiguousTimelineIntent(prompt)) return null;
  const ja = looksJapanese(prompt);
  return {
    kind: 'clarify',
    tone: 'info',
    patternId: 'pattern_timeline_intent_choice',
    skipOpenAiPolish: true,
    clearClarifyOptions: false,
    options: [
      {
        command: 'open_marketing_timeline',
        labelJa: '保存済みのスケジュール履歴を見る',
        labelEn: 'Open saved schedule timeline',
        terms: ['1', 'timelineを見る', 'work timeline', 'timeline', '履歴', '実行履歴', '予約', '今後', 'open timeline', 'show timeline', 'history', 'schedule']
      },
      {
        command: 'clarify_timeline_plan',
        labelJa: '新しいタイムラインを計画する',
        labelEn: 'Plan a new timeline',
        terms: ['2', '計画', 'タイムラインを作る', 'タイムライン作成', 'timeline plan', 'plan timeline', 'create timeline', 'roadmap', 'day-by-day', 'week-by-week']
      }
    ],
    body: ja
      ? [
          '「timeline」は2通りに受け取れます。どちらですか？',
          '',
          '1. 保存済みのスケジュール履歴を見る',
          '2. 新しいタイムラインを計画する',
          '',
          '番号で返してください。まだ注文も課金も発生しません。'
        ].join('\n')
      : [
          '"Timeline" could mean two different things here. Which one do you want?',
          '',
          '1. Open the saved schedule timeline',
          '2. Plan a new timeline',
          '',
          'Reply with a number. No order or billing happens yet.'
        ].join('\n'),
    status: 'Timeline intent needs one choice.\n\nNo order was created and no billing occurred.'
  };
}

function buildOpenChatTimelinePlanClarifyAnswer(prompt = '') {
  const ja = looksJapanese(`${prompt}\n${openChatPreviousUserMessageBody()}`);
  return {
    kind: 'clarify',
    tone: 'info',
    patternId: 'pattern_timeline_plan_details',
    skipOpenAiPolish: true,
    clearClarifyOptions: true,
    pendingQuestionPrompt: String(prompt || openChatPreviousUserMessageBody() || 'timeline').trim(),
    pendingQuestionTask: 'research',
    body: ja
      ? [
          '新しいタイムラインを計画したい理解です。次の3点をください。',
          '',
          '1. 対象の仕事 / プロジェクト',
          '2. 目標の期限',
          '3. 粒度: week-by-week か day-by-day',
          '',
          'これがあれば、計画用の発注ブリーフに整理できます。まだ注文も課金も発生しません。'
        ].join('\n')
      : [
          'Understood as planning a new timeline. Send these three details:',
          '',
          '1. The work item or project',
          '2. The target deadline',
          '3. Granularity: week-by-week or day-by-day',
          '',
          'Then I can turn it into a timeline-planning brief. No order or billing happens yet.'
        ].join('\n'),
    status: 'Timeline planning details needed.\n\nNo order was created and no billing occurred.'
  };
}

function humanTaskLabel(taskType = '') {
  const safe = String(taskType || '').trim().toLowerCase();
  if (!safe) return 'Work';
  return safe
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function marketingTaskFamily(taskType = '', deliverable = null) {
  const task = String(taskType || '').trim().toLowerCase();
  const deliverableType = String(deliverable?.type || '').trim().toLowerCase();
  if (deliverableType === 'email_pack' || MARKETING_EMAIL_TASKS.has(task) || /email/.test(task)) return 'email';
  if (deliverableType === 'social_post_pack' || MARKETING_SOCIAL_TASKS.has(task) || /x_post|social|reddit|indie|instagram/.test(task)) return 'social';
  if (task.endsWith('_leader')) return 'leader';
  if (task === 'landing') return 'landing';
  if (task === 'seo_specialist' || task === 'seo_specialist') return 'seo';
  if (task === 'pricing') return 'pricing';
  if (task === 'teardown') return 'teardown';
  if (task === 'validation') return 'validation';
  if (task === 'data_analysis') return 'analysis';
  if (task === 'acquisition_automation') return 'automation';
  return 'generic';
}

function marketingTaskLabel(taskType = '', deliverable = null) {
  const family = marketingTaskFamily(taskType, deliverable);
  if (family === 'email') return 'Email';
  if (family === 'social') return 'Social';
  if (family === 'leader') return 'Team leader';
  if (family === 'landing') return 'Landing';
  if (family === 'seo') return 'SEO';
  if (family === 'pricing') return 'Pricing';
  if (family === 'teardown') return 'Teardown';
  if (family === 'validation') return 'Validation';
  if (family === 'analysis') return 'Analytics';
  if (family === 'automation') return 'Automation';
  return humanTaskLabel(taskType);
}

function marketingRunTimeValue(job = {}) {
  return Date.parse(job?.completedAt || job?.lastCallbackAt || job?.startedAt || job?.createdAt || '') || 0;
}

function marketingRunTimeLabel(job = {}) {
  return formatTime(job?.completedAt || job?.lastCallbackAt || job?.startedAt || job?.createdAt || '');
}

function marketingFocusJobIds(contextJob = null) {
  const jobs = Array.isArray(state.snapshot?.jobs) ? state.snapshot.jobs : [];
  const current = contextJob?.id ? contextJob : selectedJob();
  const parent = current?.workflowParentId ? jobById(current.workflowParentId) : null;
  const focusRoot = current?.jobKind === 'workflow' && isMarketingTimelineTask(current.taskType)
    ? current
    : (parent?.jobKind === 'workflow' && isMarketingTimelineTask(parent.taskType)
        ? parent
        : (current && isMarketingTimelineTask(current.taskType) ? current : null));
  const ids = new Set();
  if (!focusRoot?.id) return ids;
  ids.add(String(focusRoot.id));
  if (focusRoot.jobKind === 'workflow') {
    workflowChildRunsFromDelivery(focusRoot, focusRoot.output?.report || {}).forEach((child) => {
      const childId = String(child?.id || '').trim();
      if (childId) ids.add(childId);
    });
    jobs.filter((job) => String(job?.workflowParentId || '') === String(focusRoot.id)).forEach((job) => ids.add(String(job.id)));
  } else if (focusRoot.workflowParentId) {
    ids.add(String(focusRoot.workflowParentId));
    jobs.filter((job) => String(job?.workflowParentId || '') === String(focusRoot.workflowParentId)).forEach((job) => ids.add(String(job.id)));
  }
  return ids;
}

function marketingDeliverableForJob(job = null) {
  if (!job?.id) return { genericDeliverable: null, article: null, summaryText: '', previewText: '', previewLabel: '', report: null, files: [] };
  const report = job.output?.report || null;
  const files = visibleDeliveryFiles(job.output?.files);
  const genericDeliverable = null;
  const article = articleCandidateFromDelivery(job, report || {}, files);
  const summaryText = deliverySummaryText(report || {});
  const previewText = String(genericDeliverable?.content || article?.content || summaryText || files[0]?.content || '').trim();
  const previewLabel = genericDeliverable?.title || article?.title || files[0]?.name || '';
  return {
    genericDeliverable,
    article,
    summaryText,
    previewText,
    previewLabel,
    report,
    files
  };
}

function marketingTimelineSnapshot(contextJob = null, options = {}) {
  const jobs = Array.isArray(state.snapshot?.jobs) ? state.snapshot.jobs : [];
  const recurringOrders = Array.isArray(state.snapshot?.recurringOrders) ? state.snapshot.recurringOrders : [];
  const scope = requesterScopeForClient();
  const focusedIds = marketingFocusJobIds(contextJob);
  const focusedRootId = [...focusedIds][0] || '';
  const marketingRuns = jobs
    .filter((job) => isMarketingTimelineTask(job?.taskType) && runMatchesRequesterScope(job, scope))
    .sort((a, b) => marketingRunTimeValue(b) - marketingRunTimeValue(a));
  const focusedRuns = marketingRuns
    .filter((job) => focusedIds.has(String(job.id || '')))
    .sort((a, b) => {
      if (String(a.id || '') === focusedRootId) return -1;
      if (String(b.id || '') === focusedRootId) return 1;
      return marketingRunTimeValue(b) - marketingRunTimeValue(a);
    });
  const remainingRuns = marketingRuns.filter((job) => !focusedIds.has(String(job.id || '')));
  const maxRecentRuns = Math.max(0, Number(options.maxRecentRuns ?? 6));
  const marketingSchedules = recurringOrders
    .filter((order) => isMarketingTimelineTask(order?.taskType) && recurringOrderMatchesRequesterScope(order, scope))
    .sort((a, b) => {
      const left = Date.parse(a?.nextRunAt || '') || Number.MAX_SAFE_INTEGER;
      const right = Date.parse(b?.nextRunAt || '') || Number.MAX_SAFE_INTEGER;
      return left - right;
    })
    .slice(0, Math.max(0, Number(options.maxScheduleItems ?? 4)));

  const runItems = [...focusedRuns, ...remainingRuns.slice(0, maxRecentRuns)].map((job) => {
    const deliverable = marketingDeliverableForJob(job);
    const report = deliverable.report || {};
    const nextAction = String(report?.nextAction || report?.next_action || runNextAction(job).title.replace(/^ACTION:\s*/, '')).trim();
    const requester = requesterLoginOf(job) || '-';
    const executor = String(job?.assignedAgentId || job?.workflowAgentName || '').trim() || 'auto-routing';
    const parentAgentId = String(job?.parentAgentId || '').trim() || 'cloudcode-main';
    const previewText = compactChatText(deliverable.previewText || job.prompt || '', 320);
    const summary = compactChatText(deliverable.summaryText || report?.summary || runNextAction(job).body || job.prompt || '', 220);
    const taskLabel = marketingTaskLabel(job.taskType, deliverable.genericDeliverable || deliverable.article);
    return {
      kind: 'run',
      id: String(job.id || ''),
      focused: focusedIds.has(String(job.id || '')),
      status: orderProgressStatusLabel(job.status || 'unknown'),
      tone: safeCssToken(String(job.status || 'info').toLowerCase(), 'info'),
      taskType: String(job.taskType || ''),
      taskLabel,
      title: compactChatText(deliverable.previewLabel || report?.headline || report?.title || `${taskLabel} ${orderProgressStatusLabel(job.status || 'run')}`, 90),
      summary,
      previewText,
      previewLabel: deliverable.previewLabel || '',
      nextAction,
      requester,
      parentAgentId,
      executor,
      createdAt: job.createdAt || '',
      timeLabel: marketingRunTimeLabel(job),
      job,
      genericDeliverable: deliverable.genericDeliverable || null,
      article: deliverable.article || null
    };
  });
  const scheduleItems = marketingSchedules.map((order) => {
    const lastRunId = String(order?.lastWorkflowJobId || order?.lastJobId || '').trim();
    return {
      kind: 'schedule',
      id: String(order.id || ''),
      focused: false,
      status: String(order.status || 'active').toLowerCase(),
      tone: String(order.status || '').toLowerCase() === 'paused' ? 'warn' : (String(order.status || '').toLowerCase() === 'needs_action' ? 'warn' : 'info'),
      taskType: String(order.taskType || ''),
      taskLabel: marketingTaskLabel(order.taskType),
      title: compactChatText(order.inputSummary?.label || order.prompt || 'Scheduled work', 90),
      summary: compactChatText(order.prompt || order.inputSummary?.label || '', 220),
      previewText: compactChatText(order.prompt || '', 320),
      previewLabel: order.inputSummary?.label || '',
      nextAction: `${scheduledWorkScheduleLabel(order.schedule || {})} · next ${scheduledWorkTimeLabel(order.nextRunAt)}`,
      requester: String(order.ownerLogin || '-').trim() || '-',
      parentAgentId: String(order.parentAgentId || 'cloudcode-main').trim() || 'cloudcode-main',
      executor: String(order.agentId || '').trim() || 'auto-routing',
      createdAt: order.createdAt || '',
      timeLabel: scheduledWorkTimeLabel(order.nextRunAt),
      recurringOrder: order,
      lastRunId
    };
  });

  const items = focusedRuns.length
    ? [...runItems.slice(0, focusedRuns.length), ...scheduleItems, ...runItems.slice(focusedRuns.length)]
    : [...scheduleItems, ...runItems];
  const requesterLabel = scope.filter === 'all' ? 'all visible requesters' : (scope.filter === 'mine' ? 'your requester scope' : scope.filter);
  const recentRunSummary = runItems
    .slice(0, 3)
    .map((item) => `${item.taskLabel} ${String(item.status || '').toLowerCase()} · ${item.timeLabel || '-'} · ${item.summary || item.title}`)
    .join('\n');
  const upcomingSummary = scheduleItems
    .slice(0, 3)
    .map((item) => `${item.taskLabel} · ${item.timeLabel || '-'} · ${item.summary || item.title}`)
    .join('\n');
  const summary = [
    `Stored source: jobs + recurring orders in DB.`,
    `Scope: ${requesterLabel}. ${marketingRuns.length} stored run(s), ${marketingSchedules.length} scheduled action(s).`,
    focusedRuns.length ? `Focused flow: ${focusedRuns[0]?.taskLabel || 'work'} ${focusedRuns[0]?.id?.slice(0, 8) || ''}.` : 'No flow pinned. Open any run if you want one family pinned at the top.',
    recentRunSummary ? `Latest runs:\n${recentRunSummary}` : 'Latest runs:\nNo completed or visible runs yet.',
    upcomingSummary ? `Next scheduled:\n${upcomingSummary}` : 'Next scheduled:\nNo scheduled actions are stored right now.'
  ].join('\n\n');
  return {
    items,
    marketingRuns,
    marketingSchedules,
    summary
  };
}

function hideMarketingTimelineModal() {
  state.marketingTimelineItems = [];
  if (els.marketingTimelineList) {
    els.marketingTimelineList.innerHTML = '';
  }
  if (els.marketingTimelineSummary) els.marketingTimelineSummary.textContent = '';
  setElementVisible(els.marketingTimelineList, false);
  setElementVisible(els.marketingTimelineModal, false);
}

function openMarketingTimelineModal(contextJob = null) {
  renderMarketingTimelineModal(contextJob, { reveal: true });
  if (!state.marketingTimelineItems.length) {
    flash('No stored work timeline is available yet.', 'info');
    return;
  }
  setElementVisible(els.marketingTimelineModal, true);
  window.requestAnimationFrame(() => els.closeMarketingTimelineModalBtn?.focus());
}

function loadScheduledWorkIntoComposer(recurringOrderId = '') {
  const order = scheduledWorkById(recurringOrderId);
  if (!order) throw new Error('Scheduled work record not found.');
  loadOrderDraftIntoComposer({
    followupToJobId: '',
    taskType: String(order.taskType || 'research'),
    agentId: String(order.agentId || ''),
    prompt: String(order.prompt || ''),
    budgetCap: Number(order.budgetCap ?? 300),
    deadlineSec: Number(order.deadlineSec ?? 120),
    orderStrategy: String(order.orderStrategy || 'auto')
  });
  if (els.jobUrls) els.jobUrls.value = '';
  state.orderInputFiles = [];
  state.orderInputFileWarnings = [];
  if (els.jobFiles) els.jobFiles.value = '';
  flash('Scheduled brief loaded into CAIt Chat. Review and re-save if you want to change future runs.', 'info');
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

function renderMarketingTimelineModal(contextJob = null, options = {}) {
  if (!els.marketingTimelineModal || !els.marketingTimelineSummary || !els.marketingTimelineList) return;
  const reveal = options.reveal === true || !els.marketingTimelineModal.hidden;
  const snapshot = marketingTimelineSnapshot(contextJob);
  state.marketingTimelineItems = snapshot.items;
  if (!snapshot.items.length) {
    hideMarketingTimelineModal();
    renderFlexibleToolPanel();
    return;
  }
  els.marketingTimelineSummary.textContent = snapshot.summary;
  els.marketingTimelineList.innerHTML = snapshot.items.map((item, index) => {
    const safeTone = safeCssToken(item.tone, 'info');
    const title = item.kind === 'schedule' ? `${item.taskLabel} scheduled` : item.title;
    const factRows = [
      ['USER', item.requester],
      ['PARENT', item.parentAgentId],
      ['EXEC', item.executor],
      ['TASK', item.taskType || '-'],
      ['TIME', item.timeLabel || '-'],
      ['NEXT', item.nextAction || '-']
    ];
    const buttons = [];
    if (item.kind === 'run') {
      buttons.push(`<button class="mini-btn" type="button" data-marketing-open-run="${escapeHtml(item.id)}">OPEN DELIVERY</button>`);
      if (item.status === 'completed') buttons.push(`<button class="mini-btn" type="button" data-marketing-revise-run="${escapeHtml(item.id)}">REVISE IN CAIT CHAT</button>`);
      if (item.previewText) buttons.push(`<button class="mini-btn" type="button" data-marketing-copy-index="${index}">COPY DRAFT</button>`);
      if (item.genericDeliverable) buttons.push(`<button class="mini-btn" type="button" data-marketing-prepare-generic="${index}">PREPARE ORDER</button>`);
      if (item.article) buttons.push(`<button class="mini-btn" type="button" data-marketing-prepare-publish="${index}">PREPARE PUBLISH</button>`);
    } else {
      buttons.push(`<button class="mini-btn" type="button" data-marketing-open-schedule="${escapeHtml(item.id)}">OPEN SCHEDULE</button>`);
      buttons.push(`<button class="mini-btn" type="button" data-marketing-load-schedule="${escapeHtml(item.id)}">LOAD BRIEF TO CHAT</button>`);
      if (item.previewText) buttons.push(`<button class="mini-btn" type="button" data-marketing-copy-index="${index}">COPY BRIEF</button>`);
      if (item.lastRunId) buttons.push(`<button class="mini-btn" type="button" data-marketing-open-run="${escapeHtml(item.lastRunId)}">OPEN LAST RUN</button>`);
    }
    return `
      <div class="marketing-timeline-card ${item.focused ? 'focus' : ''} ${item.kind === 'schedule' ? 'schedule' : 'run'}">
        <div class="marketing-timeline-head">
          <div>
            <div class="marketing-timeline-title">${escapeHtml(title)}</div>
            <div class="marketing-timeline-meta">${escapeHtml(item.taskLabel)} · ${escapeHtml(item.kind === 'schedule' ? 'scheduled action' : `run ${item.id.slice(0, 8)}`)}</div>
          </div>
          <span class="status-pill ${safeTone}">${escapeHtml(String(item.status || 'unknown').toUpperCase())}</span>
        </div>
        <div class="marketing-timeline-summary-box">${escapeHtml(item.summary || item.previewLabel || '-')}</div>
        <div class="marketing-timeline-facts">
          ${factRows.map(([label, value]) => `
            <div class="marketing-timeline-fact">
              <strong>${escapeHtml(label)}</strong>
              <span>${escapeHtml(value || '-')}</span>
            </div>
          `).join('')}
        </div>
        ${item.previewText ? `<div class="marketing-timeline-preview">${escapeHtml(item.previewText)}</div>` : ''}
        <div class="helper-row">${buttons.join('')}</div>
      </div>
    `;
  }).join('');
  setElementVisible(els.marketingTimelineList, true);
  if (reveal) setElementVisible(els.marketingTimelineModal, true);
  els.marketingTimelineList.querySelectorAll('[data-marketing-open-run]').forEach((button) => {
    button.onclick = () => {
      hideMarketingTimelineModal();
      openJobDetail(button.dataset.marketingOpenRun || '');
    };
  });
  els.marketingTimelineList.querySelectorAll('[data-marketing-revise-run]').forEach((button) => {
    button.onclick = () => {
      const job = jobById(button.dataset.marketingReviseRun || '');
      if (!job?.id) return;
      hideMarketingTimelineModal();
      state.selectedJobId = job.id;
      setDetail(job);
      void prepareFollowupOrderFromDelivery();
    };
  });
  els.marketingTimelineList.querySelectorAll('[data-marketing-copy-index]').forEach((button) => {
    button.onclick = () => {
      const item = state.marketingTimelineItems[Number(button.dataset.marketingCopyIndex)];
      if (!item?.previewText) return;
      void copyTextToClipboard(String(item.previewText || ''), item.kind === 'schedule' ? 'Scheduled brief copied.' : 'Draft copied.');
    };
  });
  els.marketingTimelineList.querySelectorAll('[data-marketing-prepare-generic]').forEach((button) => {
    button.onclick = () => {
      const item = state.marketingTimelineItems[Number(button.dataset.marketingPrepareGeneric)];
      const job = jobById(item?.id || '');
      if (!job || !item?.genericDeliverable) return;
      hideMarketingTimelineModal();
      void prepareGenericDeliverableOrderFromDelivery(job, item.genericDeliverable);
    };
  });
  els.marketingTimelineList.querySelectorAll('[data-marketing-prepare-publish]').forEach((button) => {
    button.onclick = () => {
      const item = state.marketingTimelineItems[Number(button.dataset.marketingPreparePublish)];
      const job = jobById(item?.id || '');
      if (!job || !item?.article) return;
      hideMarketingTimelineModal();
      preparePublishOrderFromDelivery(job, item.article);
    };
  });
  els.marketingTimelineList.querySelectorAll('[data-marketing-open-schedule]').forEach((button) => {
    button.onclick = () => {
      hideMarketingTimelineModal();
      state.openChatHistoryOpen = true;
      switchTab('work');
      renderOrderComposer();
      window.requestAnimationFrame(() => els.scheduledWorkStatus?.scrollIntoView?.({ behavior: 'smooth', block: 'center' }));
    };
  });
  els.marketingTimelineList.querySelectorAll('[data-marketing-load-schedule]').forEach((button) => {
    button.onclick = () => {
      hideMarketingTimelineModal();
      loadScheduledWorkIntoComposer(button.dataset.marketingLoadSchedule || '');
    };
  });
  renderFlexibleToolPanel();
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

async function copyTextToClipboard(text, label = 'Copied.') {
  if (!text) {
    flash('Nothing to copy.', 'error');
    return;
  }
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      if (label) flash(label, 'ok');
      return;
    }
  } catch {}
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.position = 'absolute';
  area.style.left = '-9999px';
  document.body.appendChild(area);
  area.select();
  document.execCommand('copy');
  document.body.removeChild(area);
  if (label) flash(label, 'ok');
}

function downloadDeliveryFile(file = {}) {
  const content = String(file.content || '');
  if (!content) {
    flash('No file content to download.', 'error');
    return;
  }
  const blob = new Blob([content], { type: file.type || 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name || 'delivery.txt';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  flash(`Downloaded ${file.name || 'delivery file'}.`, 'ok');
}

function downloadDeliverySummaryFile(run = null, summaryText = '') {
  const content = String(summaryText || '').trim();
  if (!content) {
    flash('No summary to download.', 'error');
    return;
  }
  const orderId = String(run?.id || '').trim().slice(0, 8);
  const fileName = `delivery-summary-${orderId || new Date().toISOString().slice(0, 10)}.md`;
  const blob = new Blob([`${content}\n`], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  flash(`Downloaded ${fileName}.`, 'ok');
}

function downloadDeliveryZip(files = [], run = null) {
  const zipBlob = buildDeliveryZipBlob(files);
  if (!zipBlob) {
    flash('No delivery files to zip.', 'error');
    return;
  }
  const orderId = String(run?.id || '').trim().slice(0, 8);
  const fileName = `delivery-${orderId || new Date().toISOString().slice(0, 10)}.zip`;
  const url = URL.createObjectURL(zipBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  flash(`Downloaded ${fileName}.`, 'ok');
}

function deliveryActionMeta(deliverable = null) {
  const provided = resolveDeliveryActionContract(deliverable?.type, deliverable?.actionContract);
  if (provided) return provided;
  const type = String(deliverable?.type || '').trim();
  return deliveryActionContractForType(type);
}

function mergePreparedDeliveryPublishSeed(jobId = '', seed = null) {
  const key = String(jobId || '').trim();
  if (!key || !seed || typeof seed !== 'object') return;
  const current = state.deliveryPublishDrafts?.[key] && typeof state.deliveryPublishDrafts[key] === 'object'
    ? state.deliveryPublishDrafts[key]
    : {};
  const defaults = seed.draftDefaults && typeof seed.draftDefaults === 'object' ? seed.draftDefaults : {};
  const merged = { ...current };
  for (const [field, value] of Object.entries(defaults)) {
    const currentValue = merged[field];
    if (currentValue === undefined || currentValue === null || currentValue === '') {
      merged[field] = value;
    }
  }
  state.deliveryPublishDrafts[key] = merged;
  persistDeliveryActionDrafts();
}

async function prepareDeliveryPublishSeed(run = null, article = null) {
  const key = String(run?.id || '').trim();
  if (!key || !article?.content) return null;
  const existing = state.deliveryPublishSeeds?.[key];
  if (existing?.status === 'done') return existing;
  if (existing?.status === 'pending') return null;
  state.deliveryPublishSeeds[key] = { status: 'pending' };
  try {
    const payload = await api('/api/deliveries/prepare-publish', {
      method: 'POST',
      body: JSON.stringify({
        job_id: key,
        title: String(article.title || ''),
        content: String(article.content || ''),
        file_name: String(article.fileName || ''),
        suggested_slug: String(article.suggestedSlug || '')
      })
    });
    const seed = {
      status: 'done',
      draftDefaults: payload?.draft_defaults && typeof payload.draft_defaults === 'object' ? payload.draft_defaults : {},
      fieldDescriptors: Array.isArray(payload?.field_descriptors) ? payload.field_descriptors : [],
      actionDescriptors: Array.isArray(payload?.action_descriptors) ? payload.action_descriptors : [],
      suggestedPrimaryAction: String(payload?.suggested_primary_action || '').trim(),
      githubReady: Boolean(payload?.github_ready)
    };
    state.deliveryPublishSeeds[key] = seed;
    mergePreparedDeliveryPublishSeed(key, seed);
    if (state.selectedJobId === key) renderRunDelivery(selectedJob());
    return seed;
  } catch (error) {
    state.deliveryPublishSeeds[key] = { status: 'error', error: String(error?.message || error) };
    return null;
  }
}

function genericDeliverableDraftForJob(job = {}, deliverable = null) {
  const key = String(job?.id || '').trim();
  if (!key) return null;
  loadPersistedDeliveryActionDrafts();
  const existing = state.deliveryActionDrafts?.[key];
  if (existing) return existing;
  const persisted = job?.executorState && typeof job.executorState === 'object' ? job.executorState : null;
  const report = job?.output?.report && typeof job.output.report === 'object' ? job.output.report : {};
  const type = String(deliverable?.type || '').trim();
  const xPrefs = xExecutorPreferences();
  let draft = deliveryDraftDefaultsForType(type, {
    preferredChannel: xPrefs.channel,
    preferredActionMode: xPrefs.actionMode,
    xConnected: isXConnectorReady(state.snapshot?.auth || {}),
    suggestedPostText: suggestedSocialPostText(deliverable?.content || ''),
    defaultScheduledAt: localDatetimeInputValue(''),
    isPlatformAdmin: Boolean(state.snapshot?.auth?.isPlatformAdmin),
    defaultEmailTarget: state.snapshot?.auth?.isPlatformAdmin ? 'cait_resend' : 'gmail',
    defaultEmailSubject: String(deliverable?.title || 'Email draft').trim(),
    defaultEmailBody: normalizeArticleText(String(deliverable?.content || '')).trim(),
    githubConnected: isGithubLinked(state.snapshot?.auth || {}),
    defaultCodeTarget: isGithubLinked(state.snapshot?.auth || {}) ? 'github_repo' : 'local_terminal',
    preferredRepoFullName: preferredGithubRepoFullName()
  });
  if (deliverable?.draftDefaults && typeof deliverable.draftDefaults === 'object') {
    draft = { ...draft, ...deliverable.draftDefaults };
  }
  const googlePrefs = googleExecutorPreferences();
  draft.googleSearchConsoleSite = String(googlePrefs.searchConsoleSite || '').trim();
  draft.googleGa4Property = String(googlePrefs.ga4Property || '').trim();
  draft.googleDriveFileId = String(googlePrefs.driveFileId || '').trim();
  draft.googleCalendarId = String(googlePrefs.calendarId || '').trim();
  draft.googleGmailLabelId = String(googlePrefs.gmailLabelId || '').trim();
  const authoritySeed = authorityRequestFromReport(report);
  if (authoritySeed) {
    draft.authorityRequired = {
      reason: authoritySeed.reason,
      missingConnectors: authoritySeed.missingConnectors,
      missingConnectorCapabilities: authoritySeed.missingConnectorCapabilities,
      source: authoritySeed.source,
      requestedAt: authoritySeed.requestedAt,
      ownerLabel: authoritySeed.ownerLabel,
      requiredRepositorySelection: authoritySeed.requiredRepositorySelection,
      repoCandidates: authoritySeed.repoCandidates,
      requiredChannelSelection: authoritySeed.requiredChannelSelection,
      channelCandidates: authoritySeed.channelCandidates
    };
    if (authoritySeed.googleIncludeGroups.length) {
      draft.googleIncludeGroups = authoritySeed.googleIncludeGroups.slice();
    }
    if (authoritySeed.requiredRepositorySelection) {
      draft.repoFullName = '';
    }
    if (authoritySeed.requiredChannelSelection) {
      draft.channel = '';
    }
    if (!authoritySeed.requiredRepositorySelection && !String(draft.repoFullName || '').trim() && Array.isArray(authoritySeed.repoCandidates) && authoritySeed.repoCandidates.length) {
      draft.repoFullName = normalizeRepoFullName(String(authoritySeed.repoCandidates[0] || ''));
    }
    if (!authoritySeed.requiredChannelSelection && !String(draft.channel || '').trim() && Array.isArray(authoritySeed.channelCandidates) && authoritySeed.channelCandidates.length) {
      draft.channel = String(authoritySeed.channelCandidates[0] || '').trim();
    }
  }
  if (persisted) draft = { ...draft, ...persisted };
  state.deliveryActionDrafts[key] = draft;
  persistDeliveryActionDrafts();
  return draft;
}

function mergePreparedDeliveryExecutionSeed(jobId = '', seed = null) {
  const key = String(jobId || '').trim();
  if (!key || !seed || typeof seed !== 'object') return;
  const current = state.deliveryActionDrafts?.[key] && typeof state.deliveryActionDrafts[key] === 'object'
    ? state.deliveryActionDrafts[key]
    : {};
  const defaults = seed.draftDefaults && typeof seed.draftDefaults === 'object' ? seed.draftDefaults : {};
  const merged = { ...current };
  for (const [field, value] of Object.entries(defaults)) {
    const currentValue = merged[field];
    if (currentValue === undefined || currentValue === null || currentValue === '') {
      merged[field] = value;
    }
  }
  state.deliveryActionDrafts[key] = merged;
  persistDeliveryActionDrafts();
}

async function prepareGenericDeliverableExecutionSeed(run = null, deliverable = null) {
  const key = String(run?.id || '').trim();
  if (!key || !deliverable?.type) return null;
  const existing = state.deliveryExecutionSeeds?.[key];
  if (existing?.status === 'done') return existing;
  if (existing?.status === 'pending') return null;
  state.deliveryExecutionSeeds[key] = { status: 'pending' };
  try {
    const payload = await api('/api/deliveries/prepare-execution', {
      method: 'POST',
      body: JSON.stringify({
        job_id: key,
        content_type: String(deliverable.type || ''),
        title: String(deliverable.title || ''),
        content: String(deliverable.content || ''),
        file_name: String(deliverable.fileName || ''),
        format: String(deliverable.format || '')
      })
    });
    const seed = {
      status: 'done',
      actionContract: resolveDeliveryActionContract(deliverable.type, payload?.action_contract),
      draftDefaults: payload?.draft_defaults && typeof payload.draft_defaults === 'object' ? payload.draft_defaults : {},
      controlOptions: payload?.control_options && typeof payload.control_options === 'object' ? payload.control_options : {},
      executionAction: payload?.execution_action && typeof payload.execution_action === 'object' ? payload.execution_action : null,
      scheduleAction: payload?.schedule_action && typeof payload.schedule_action === 'object' ? payload.schedule_action : null,
      primaryActions: Array.isArray(payload?.primary_actions) ? payload.primary_actions : [],
      suggestedPrimaryAction: payload?.suggested_primary_action && typeof payload.suggested_primary_action === 'object' ? payload.suggested_primary_action : null,
      authorityHints: payload?.authority_hints && typeof payload.authority_hints === 'object' ? payload.authority_hints : {}
    };
    state.deliveryExecutionSeeds[key] = seed;
    mergePreparedDeliveryExecutionSeed(key, seed);
    if (state.selectedJobId === key) renderRunDelivery(selectedJob());
    return seed;
  } catch (error) {
    state.deliveryExecutionSeeds[key] = { status: 'error', error: String(error?.message || error) };
    return null;
  }
}

function preferredGithubRepoFullName() {
  const saved = normalizeRepoFullName(state.snapshot?.accountSettings?.executorPreferences?.github?.repoFullName || '');
  if (saved) return saved;
  const selected = normalizeRepoFullName(state.selectedRepoFullName || '');
  if (selected) return selected;
  const picked = selectedRepoFromPicker?.();
  if (picked?.fullName) return normalizeRepoFullName(picked.fullName);
  const first = Array.isArray(state.repos) && state.repos.length ? state.repos[0] : null;
  return normalizeRepoFullName(first?.fullName || '');
}

function repoOptionsDatalist(id = '') {
  const repos = Array.isArray(state.repos) ? state.repos : [];
  if (!repos.length) return '';
  const safeId = `delivery-repo-options-${String(id || '').replace(/[^a-z0-9_-]/gi, '-')}`;
  const options = repos
    .slice(0, 200)
    .map((repo) => `<option value="${escapeHtml(String(repo.fullName || ''))}"></option>`)
    .join('');
  return `<datalist id="${safeId}">${options}</datalist>`;
}

function suggestedSocialPostText(content = '') {
  const normalized = normalizeArticleText(content);
  if (!normalized) return '';
  const extracted = extractSocialPostTextFromDeliveryContent(normalized, { maxLength: 280 });
  if (extracted) return extracted;
  const blocks = normalized
    .split(/\n\s*\n/)
    .map((part) => part.replace(/^[-*]\s+/gm, '').trim())
    .filter(Boolean);
  const exact = blocks.find((part) => part.length > 0 && part.length <= 280);
  if (exact) return exact;
  const firstLine = normalized.split('\n').map((line) => line.trim()).find(Boolean) || '';
  return compactChatText(firstLine, 280);
}

function updateGenericDeliverableDraft(jobId = '', patch = {}) {
  const key = String(jobId || '').trim();
  if (!key) return;
  loadPersistedDeliveryActionDrafts();
  const current = state.deliveryActionDrafts?.[key] && typeof state.deliveryActionDrafts[key] === 'object'
    ? state.deliveryActionDrafts[key]
    : {};
  state.deliveryActionDrafts[key] = { ...current, ...patch };
  persistDeliveryActionDrafts();
  void persistGenericDeliverableDraft(key, false);
}

function setGenericDeliverableExecutionStopped(jobId = '', stopped = true, reason = 'user_cancelled') {
  const key = String(jobId || '').trim();
  if (!key) return;
  updateGenericDeliverableDraft(key, {
    executionStopped: Boolean(stopped),
    executionStopReason: stopped ? String(reason || 'user_cancelled') : ''
  });
  void persistGenericDeliverableDraft(key, true);
}

function setGenericDeliverableAuthorityRequired(jobId = '', authority = null) {
  const key = String(jobId || '').trim();
  if (!key) return;
  if (!authority || typeof authority !== 'object') {
    updateGenericDeliverableDraft(key, { authorityRequired: null });
    void persistGenericDeliverableDraft(key, true);
    return;
  }
  updateGenericDeliverableDraft(key, {
    authorityRequired: {
      reason: String(authority.reason || authority.error || 'Additional connector access is required before execution can continue.'),
      missingConnectors: normalizeClientList(authority.missingConnectors || authority.missing_connectors, []),
      missingConnectorCapabilities: normalizeClientConnectorCapabilityList(authority.missingConnectorCapabilities || authority.missing_connector_capabilities, []),
      source: String(authority.source || '').trim(),
      requestedAt: new Date().toISOString(),
      ownerLabel: String(authority.ownerLabel || authority.owner_label || '').trim(),
      requiredRepositorySelection: Boolean(authority.requiredRepositorySelection || authority.required_repository_selection),
      repoCandidates: normalizeClientList(authority.repoCandidates || authority.repo_candidates || authority.repositories, []),
      requiredChannelSelection: Boolean(authority.requiredChannelSelection || authority.required_channel_selection),
      channelCandidates: normalizeClientList(authority.channelCandidates || authority.channel_candidates || authority.channels, [])
    }
  });
  if (Array.isArray(authority.googleIncludeGroups) && authority.googleIncludeGroups.length) {
    updateGenericDeliverableDraft(key, {
      googleIncludeGroups: authority.googleIncludeGroups.map(normalizeGoogleIncludeGroup).filter(Boolean)
    });
  }
  void persistGenericDeliverableDraft(key, true);
}

function genericDeliverableAuthorityState(run = null, draft = null) {
  const authority = draft?.authorityRequired && typeof draft.authorityRequired === 'object'
    ? draft.authorityRequired
    : null;
  if (!authority) return null;
  const connectorStatus = connectorStatusForClient(state.snapshot?.auth || {}, state.snapshot?.accountSettings || null);
  const missingConnectors = normalizeClientList(authority.missingConnectors, [])
    .map(normalizeClientConnector)
    .filter((connector) => connector && Object.prototype.hasOwnProperty.call(connectorStatus, connector) && !connectorStatus[connector]);
  const missingConnectorCapabilities = normalizeClientConnectorCapabilityList(authority.missingConnectorCapabilities, []);
  const requiredRepositorySelection = Boolean(authority.requiredRepositorySelection || authority.required_repository_selection);
  const missingRepositorySelection = requiredRepositorySelection && !normalizeRepoFullName(draft?.repoFullName || '');
  const requiredChannelSelection = Boolean(authority.requiredChannelSelection || authority.required_channel_selection);
  const missingChannelSelection = requiredChannelSelection && !String(draft?.channel || '').trim();
  return {
    reason: String(authority.reason || 'Additional connector access is required before execution can continue.'),
    missingConnectors,
    missingConnectorCapabilities,
    resolved: missingConnectors.length === 0 && !missingRepositorySelection && !missingChannelSelection,
    source: String(authority.source || ''),
    requestedAt: String(authority.requestedAt || ''),
    ownerLabel: String(authority.ownerLabel || authority.owner_label || ''),
    requiredRepositorySelection,
    missingRepositorySelection,
    repoCandidates: normalizeClientList(authority.repoCandidates || authority.repo_candidates || authority.repositories, []),
    requiredChannelSelection,
    missingChannelSelection,
    channelCandidates: normalizeClientList(authority.channelCandidates || authority.channel_candidates || authority.channels, [])
  };
}

function normalizeGoogleIncludeGroup(value = '') {
  const raw = String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (!raw) return '';
  if (['gsc', 'search_console', 'google_search_console', 'webmasters'].includes(raw)) return 'gsc';
  if (['ga4', 'analytics', 'google_analytics', 'google_analytics_4'].includes(raw)) return 'ga4';
  if (['drive', 'docs', 'sheets', 'slides', 'presentations'].includes(raw)) return 'drive';
  if (['calendar', 'google_calendar'].includes(raw)) return 'calendar';
  if (['gmail', 'mail', 'email'].includes(raw)) return 'gmail';
  return '';
}

function googleIncludeGroupsFromAuthorityRequest(request = null) {
  if (!request || typeof request !== 'object') return [];
  const explicit = normalizeClientList(
    request.requiredGoogleSources
      || request.required_google_sources
      || request.googleSourceTypes
      || request.google_source_types,
    []
  ).map(normalizeGoogleIncludeGroup).filter(Boolean);
  if (explicit.length) return Array.from(new Set(explicit));
  return googleIncludeGroupsForCapabilities(
    normalizeClientConnectorCapabilityList(request.missingConnectorCapabilities
      || request.missing_connector_capabilities
      || request.requiredConnectorCapabilities
      || request.required_connector_capabilities
      || request.capabilities
      || [])
  );
}

function authorityRequestFromReport(report = {}) {
  const candidate = report?.authority_request
    || report?.authorityRequest
    || report?.action_required
    || report?.actionRequired
    || report?.executor_request
    || report?.executorRequest
    || (Array.isArray(report?.authority_requests) ? report.authority_requests[0] : null)
    || (Array.isArray(report?.authorityRequests) ? report.authorityRequests[0] : null)
    || null;
  if (!candidate || typeof candidate !== 'object') return null;
  const missingConnectors = normalizeClientList(
    candidate.missingConnectors
      || candidate.missing_connectors
      || candidate.connectors
      || candidate.required_connectors,
    []
  );
  const missingConnectorCapabilities = normalizeClientConnectorCapabilityList(
    candidate.missingConnectorCapabilities
      || candidate.missing_connector_capabilities
      || candidate.requiredConnectorCapabilities
      || candidate.required_connector_capabilities
      || candidate.capabilities,
    []
  );
  const googleIncludeGroups = googleIncludeGroupsFromAuthorityRequest(candidate);
  const requiredRepositorySelection = Boolean(candidate.requiredRepositorySelection || candidate.required_repository_selection || candidate.requireRepositorySelection || candidate.require_repository_selection);
  const requiredChannelSelection = Boolean(candidate.requiredChannelSelection || candidate.required_channel_selection || candidate.requireChannelSelection || candidate.require_channel_selection);
  const reason = String(
    candidate.reason
      || candidate.message
      || candidate.summary
      || report?.nextAction
      || report?.next_action
      || 'Additional connector access is required before execution can continue.'
  ).trim();
  if (!reason && !missingConnectors.length && !missingConnectorCapabilities.length && !googleIncludeGroups.length && !requiredRepositorySelection && !requiredChannelSelection) return null;
  return {
    reason,
    missingConnectors,
    missingConnectorCapabilities,
    googleIncludeGroups,
    source: String(candidate.source || candidate.kind || 'leader_request').trim(),
    ownerLabel: String(candidate.ownerLabel || candidate.owner_label || candidate.requestedBy || candidate.requested_by || candidate.agentName || candidate.agent_name || '').trim(),
    requestedAt: new Date().toISOString(),
    requiredRepositorySelection,
    repoCandidates: normalizeClientList(candidate.repoCandidates || candidate.repo_candidates || candidate.repositories, []),
    requiredChannelSelection,
    channelCandidates: normalizeClientList(candidate.channelCandidates || candidate.channel_candidates || candidate.channels, [])
  };
}

function authorityRequestRequiresClientApproval(authority = null) {
  if (!authority || typeof authority !== 'object') return false;
  const missingConnectors = normalizeClientList(authority.missingConnectors || authority.missing_connectors || authority.connectors, []);
  const missingConnectorCapabilities = normalizeClientConnectorCapabilityList(authority.missingConnectorCapabilities || authority.missing_connector_capabilities || authority.capabilities, []);
  const googleIncludeGroups = normalizeClientList(authority.googleIncludeGroups || authority.requiredGoogleSources || authority.required_google_sources, []);
  const selectionRequired = Boolean(
    authority.requiredRepositorySelection
    || authority.required_repository_selection
    || authority.requiredChannelSelection
    || authority.required_channel_selection
    || authority.requiredAccountSelection
    || authority.required_account_selection
  );
  const reason = String(authority.reason || authority.message || authority.summary || '').trim();
  return Boolean(
    missingConnectors.length
    || missingConnectorCapabilities.length
    || googleIncludeGroups.length
    || selectionRequired
    || /(oauth|approval|approve|authority|connector|required|missing|connect|confirm|publish|send|post|承認|接続|未接続|確認|権限|投稿|送信|必要)/i.test(reason)
  );
}

function agentForRun(run = null) {
  const id = String(run?.assignedAgentId || run?.jobAgentId || '').trim();
  if (!id || !Array.isArray(state.snapshot?.agents)) return null;
  return state.snapshot.agents.find((agent) => String(agent?.id || '').trim() === id) || null;
}

function authorityOwnerLabelForRun(run = null, deliverable = null, authority = null) {
  const agent = agentForRun(run);
  return deliveryAuthorityOwnerLabel(authority, {
    agentName: String(agent?.name || '').trim(),
    deliverableType: String(deliverable?.type || '').trim()
  });
}

function describeAuthorityNeed(capabilities = [], connectors = []) {
  const normalizedCapabilities = normalizeClientConnectorCapabilityList(capabilities, []);
  const normalizedConnectors = normalizeClientList(connectors, []).map(normalizeClientConnector);
  const parts = [];
  if (normalizedCapabilities.includes('github.write_pr')) parts.push('GitHub pull request authority');
  if (normalizedCapabilities.includes('x.post')) parts.push('X posting authority');
  if (normalizedCapabilities.includes('google.read_gsc')) parts.push('a Search Console source');
  if (normalizedCapabilities.includes('google.read_ga4')) parts.push('a GA4 property');
  if (normalizedCapabilities.includes('google.read_drive') || normalizedCapabilities.includes('google.read_docs') || normalizedCapabilities.includes('google.read_sheets') || normalizedCapabilities.includes('google.read_presentations')) parts.push('a Google Drive source');
  if (normalizedCapabilities.includes('google.read_calendar')) parts.push('a Google Calendar source');
  if (normalizedCapabilities.includes('google.write_calendar')) parts.push('Google Calendar write authority');
  if (normalizedCapabilities.includes('google.create_meet')) parts.push('Google Meet creation authority');
  if (normalizedCapabilities.includes('google.read_gmail')) parts.push('a Gmail source');
  if (normalizedCapabilities.includes('google.send_gmail')) parts.push('Gmail send authority');
  if (normalizedCapabilities.includes('zoom.schedule_meeting')) parts.push('Zoom scheduling authority');
  if (normalizedCapabilities.includes('microsoft.create_teams_meeting')) parts.push('Microsoft Teams scheduling authority');
  if (!parts.length && normalizedConnectors.includes('github')) parts.push('a GitHub connection');
  if (!parts.length && normalizedConnectors.includes('google')) parts.push('a Google connection');
  if (!parts.length && normalizedConnectors.includes('zoom')) parts.push('a Zoom connection');
  if (!parts.length && normalizedConnectors.includes('microsoft')) parts.push('a Microsoft Teams connection');
  if (!parts.length && normalizedConnectors.includes('x')) parts.push('an X connection');
  return parts.length ? parts.join(', ') : 'additional authority';
}

function genericDeliverableAuthoritySummary(run = null, deliverable = null, authority = null) {
  return deliveryAuthoritySummary(authority, {
    agentName: String(agentForRun(run)?.name || '').trim(),
    deliverableType: String(deliverable?.type || '').trim()
  });
}

function googleExecutorPreferences() {
  return state.snapshot?.accountSettings?.executorPreferences?.google || {};
}

function githubExecutorPreferences() {
  return state.snapshot?.accountSettings?.executorPreferences?.github || {};
}

function xExecutorPreferences() {
  return state.snapshot?.accountSettings?.executorPreferences?.x || {};
}

async function saveGoogleExecutorPreferences(patch = {}) {
  const current = googleExecutorPreferences();
  const payload = {
    google: {
      searchConsoleSite: String(patch.searchConsoleSite ?? current.searchConsoleSite ?? '').trim(),
      ga4Property: String(patch.ga4Property ?? current.ga4Property ?? '').trim(),
      driveFileId: String(patch.driveFileId ?? current.driveFileId ?? '').trim(),
      calendarId: String(patch.calendarId ?? current.calendarId ?? '').trim(),
      gmailLabelId: String(patch.gmailLabelId ?? current.gmailLabelId ?? '').trim()
    }
  };
  const result = await api('/api/settings/executor-preferences', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  if (state.snapshot) {
    if (result.account) state.snapshot.accountSettings = result.account;
    if (result.monthly_summary) state.snapshot.monthlySummary = result.monthly_summary;
  }
  return result;
}

async function saveGithubExecutorPreferences(patch = {}) {
  const current = githubExecutorPreferences();
  const payload = {
    github: {
      repoFullName: normalizeRepoFullName(String(patch.repoFullName ?? current.repoFullName ?? ''))
    }
  };
  const result = await api('/api/settings/executor-preferences', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  if (state.snapshot) {
    if (result.account) state.snapshot.accountSettings = result.account;
    if (result.monthly_summary) state.snapshot.monthlySummary = result.monthly_summary;
  }
  return result;
}

async function saveXExecutorPreferences(patch = {}) {
  const current = xExecutorPreferences();
  const payload = {
    x: {
      channel: String(patch.channel ?? current.channel ?? '').trim(),
      actionMode: String(patch.actionMode ?? current.actionMode ?? '').trim()
    }
  };
  const result = await api('/api/settings/executor-preferences', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  if (state.snapshot) {
    if (result.account) state.snapshot.accountSettings = result.account;
    if (result.monthly_summary) state.snapshot.monthlySummary = result.monthly_summary;
  }
  return result;
}

function localDatetimeInputValue(value = '') {
  const parsed = Number.isFinite(Date.parse(value)) ? new Date(value) : new Date(Date.now() + 60 * 60 * 1000);
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  const hours = String(parsed.getHours()).padStart(2, '0');
  const minutes = String(parsed.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function localDatetimeInputToIso(value = '') {
  const text = String(value || '').trim();
  if (!text) return '';
  const ms = Date.parse(text);
  return Number.isFinite(ms) ? new Date(ms).toISOString() : '';
}

function genericDeliverableScheduleLabel(value = '') {
  const iso = localDatetimeInputToIso(value);
  return iso ? scheduledWorkTimeLabel(iso) : 'Select a future time';
}

async function scheduleExactConnectorAction(run = null, deliverable = null, action = {}, options = {}) {
  const scheduledFor = localDatetimeInputToIso(options.scheduleAt || '');
  if (!scheduledFor) {
    flash('Choose a valid future schedule time first.', 'warn');
    return null;
  }
  if (Date.parse(scheduledFor) <= Date.now() + 60_000) {
    flash('Choose a schedule time at least one minute in the future.', 'warn');
    return null;
  }
  const result = await api('/api/recurring-orders', {
    method: 'POST',
    body: JSON.stringify({
      parent_agent_id: run?.parentAgentId || 'cloudcode-main',
      task_type: String(options.taskType || run?.taskType || 'automation'),
      order_strategy: 'single',
      prompt: String(options.prompt || `${deliverable?.title || 'Scheduled action'}\nScheduled for ${scheduledFor}`),
      next_run_at: scheduledFor,
      max_runs: 1,
      schedule: {
        interval: 'daily',
        time: '09:00',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Tokyo'
      },
      input: {
        _broker: {
          exactConnectorAction: {
            ...action,
            scheduledFor,
            previewText: String(options.previewText || '')
          }
        }
      }
    })
  });
  flash(`Scheduled action created. Next run: ${scheduledWorkTimeLabel(result.recurring_order?.nextRunAt || scheduledFor)}`, 'ok');
  await refresh();
  return result;
}

function flattenGa4PropertyOptions(accountSummaries = []) {
  const options = [];
  for (const summary of Array.isArray(accountSummaries) ? accountSummaries : []) {
    const accountLabel = String(summary?.displayName || summary?.name || '').trim();
    for (const property of Array.isArray(summary?.propertySummaries) ? summary.propertySummaries : []) {
      const id = String(property?.property || '').trim();
      if (!id) continue;
      options.push({
        value: id,
        label: [String(property?.displayName || id), accountLabel].filter(Boolean).join(' · ')
      });
    }
  }
  return options;
}

function flattenGoogleDriveOptions(files = []) {
  return (Array.isArray(files) ? files : [])
    .map((file) => {
      const id = String(file?.id || '').trim();
      if (!id) return null;
      const name = String(file?.name || id).trim();
      const mimeType = String(file?.mimeType || '').trim();
      return {
        value: id,
        label: mimeType ? `${name} · ${mimeType}` : name
      };
    })
    .filter(Boolean);
}

function flattenGoogleCalendarOptions(calendars = []) {
  return (Array.isArray(calendars) ? calendars : [])
    .map((calendar) => {
      const id = String(calendar?.id || '').trim();
      if (!id) return null;
      const summary = String(calendar?.summary || id).trim();
      const accessRole = String(calendar?.accessRole || '').trim();
      return {
        value: id,
        label: accessRole ? `${summary} · ${accessRole}` : summary
      };
    })
    .filter(Boolean);
}

function flattenGoogleGmailLabelOptions(labels = []) {
  const all = (Array.isArray(labels) ? labels : [])
    .map((label) => {
      const id = String(label?.id || '').trim();
      if (!id) return null;
      const name = String(label?.name || id).trim();
      const type = String(label?.type || '').trim();
      return {
        value: id,
        label: type ? `${name} · ${type}` : name
      };
    })
    .filter(Boolean);
  const inbox = all.find((label) => label.value === 'INBOX' || /^inbox$/i.test(label.label));
  if (!inbox) return all;
  return [inbox, ...all.filter((label) => label !== inbox)];
}

async function loadGoogleSourcesForGenericDeliverable(job = null, draft = null, authority = null) {
  const jobId = String(job?.id || '').trim();
  if (!jobId) return;
  const googleSourcePlan = deliveryGoogleSourceFlowPlan(draft, authority);
  const includeGroups = googleSourcePlan.requestedGroups;
  if (!includeGroups.length) return;
  updateGenericDeliverableDraft(jobId, {
    googleIncludeGroups: includeGroups,
    googleAssetsLoading: true,
    googleAssetsError: '',
    googleAssetsRequestedAt: new Date().toISOString()
  });
  if (state.selectedJobId === jobId) renderRunDelivery(selectedJob());
  try {
    const params = new URLSearchParams();
    params.set('include', includeGroups.join(','));
    const payload = await api(`/api/connectors/google/assets?${params.toString()}`);
    const sites = Array.isArray(payload?.search_console?.sites) ? payload.search_console.sites : [];
    const accountSummaries = Array.isArray(payload?.ga4?.account_summaries) ? payload.ga4.account_summaries : [];
    const ga4Options = flattenGa4PropertyOptions(accountSummaries);
    const driveOptions = flattenGoogleDriveOptions(payload?.drive?.files || []);
    const calendarOptions = flattenGoogleCalendarOptions(payload?.calendar?.calendars || []);
    const gmailLabelOptions = flattenGoogleGmailLabelOptions(payload?.gmail?.labels || []);
    const nextPatch = {
      googleIncludeGroups: includeGroups,
      googleAssetsLoading: false,
      googleAssetsError: '',
      googleAssets: payload
    };
    if (includeGroups.includes('gsc') && !String(draft?.googleSearchConsoleSite || '').trim() && sites.length) {
      nextPatch.googleSearchConsoleSite = String(sites[0]?.siteUrl || '');
    }
    if (includeGroups.includes('ga4') && !String(draft?.googleGa4Property || '').trim() && ga4Options.length) {
      nextPatch.googleGa4Property = String(ga4Options[0]?.value || '');
    }
    if (includeGroups.includes('drive') && !String(draft?.googleDriveFileId || '').trim() && driveOptions.length) {
      nextPatch.googleDriveFileId = String(driveOptions[0]?.value || '');
    }
    if (includeGroups.includes('calendar') && !String(draft?.googleCalendarId || '').trim() && calendarOptions.length) {
      nextPatch.googleCalendarId = String(calendarOptions[0]?.value || '');
    }
    if (includeGroups.includes('gmail') && !String(draft?.googleGmailLabelId || '').trim() && gmailLabelOptions.length) {
      nextPatch.googleGmailLabelId = String(gmailLabelOptions[0]?.value || '');
    }
    updateGenericDeliverableDraft(jobId, nextPatch);
    if (state.selectedJobId === jobId) renderRunDelivery(selectedJob());
    flash('Google sources loaded for this delivery.', 'ok');
  } catch (error) {
    updateGenericDeliverableDraft(jobId, {
      googleIncludeGroups: includeGroups,
      googleAssetsLoading: false,
      googleAssetsError: String(error?.message || 'Google sources could not be loaded.')
    });
    if (state.selectedJobId === jobId) renderRunDelivery(selectedJob());
    throw error;
  }
}

async function prepareGenericDeliverableOrderFromDelivery(job = null, deliverable = null) {
  try {
    if (!job?.id) throw new Error('Select a completed delivery first.');
    if (!deliverable?.content) throw new Error('No deliverable content detected in this delivery.');
    const draft = genericDeliverableDraftForJob(job, deliverable) || {};
    const prepared = await api('/api/deliveries/prepare-followup-order', {
      method: 'POST',
      body: JSON.stringify({
        job_id: String(job.id || ''),
        content_type: String(deliverable.type || ''),
        deliverable: {
          type: String(deliverable.type || ''),
          title: String(deliverable.title || ''),
          fileName: String(deliverable.fileName || ''),
          content: String(deliverable.content || '')
        },
        draft
      })
    });
    loadOrderDraftIntoComposer({
      followupToJobId: String(prepared?.followup_to_job_id || job.id || ''),
      taskType: String(prepared?.task_type || job.taskType || 'research'),
      agentId: String(prepared?.agent_id || ''),
      prompt: String(prepared?.prompt || '').trim(),
      budgetCap: Number(job?.budgetCap ?? 300),
      deadlineSec: Number(job?.deadlineSec ?? 120),
      orderStrategy: String(prepared?.order_strategy || 'auto')
    });
    flash(`${deliverable.title || 'Deliverable'} drafted as the next order. No execution has started. Review it, then SEND ORDER when ready.`, 'ok');
    return prepared;
  } catch (error) {
    flash(String(error?.message || 'Could not prepare next order.'), 'warn');
    return null;
  }
}

function genericDeliverableExecutorCommand(job = null, deliverable = null, draft = {}) {
  if (!job?.id || !deliverable?.content) return '';
  if (deliverable.type !== 'code_handoff') return '';
  const target = String(draft.target || 'local_terminal');
  if (target !== 'local_terminal') return '';
  const base = `npm run cait -- follow-up ${job.id} --watch`;
  const prompt = '"Implement the technical handoff from the previous delivery and continue in local executor mode."';
  return `${base} ${prompt}`;
}

function communitySubmissionUrl(channel = '', text = '') {
  const value = String(channel || '').trim().toLowerCase();
  const body = String(text || '').trim();
  const encoded = encodeURIComponent(body);
  if (value === 'reddit') return `https://www.reddit.com/submit?selftext=true&text=${encoded}`;
  if (value === 'indie_hackers') return `https://www.indiehackers.com/post/new?body=${encoded}`;
  return '';
}

async function openCommunityPostTarget(channel = '', text = '', options = {}) {
  const normalizedChannel = String(channel || '').trim().toLowerCase();
  const exactText = String(text || '').trim();
  if (!exactText) {
    flash('Write the exact community post text first.', 'warn');
    return;
  }
  const url = communitySubmissionUrl(normalizedChannel, exactText);
  if (!url) {
    flash('No community handoff target is configured for this channel yet.', 'warn');
    return;
  }
  const popup = window.open(url, '_blank', 'noopener,noreferrer');
  await copyTextToClipboard(exactText, 'Post text copied.');
  if (!popup) {
    flash('The community page was blocked by the browser. Allow popups and try again.', 'warn');
    return;
  }
  appendOrderChatExchange(exactText, {
    kind: 'assist',
    tone: 'ok',
    body: [
      `Opened ${normalizedChannel === 'reddit' ? 'Reddit' : 'Indie Hackers'} in a new tab with the prepared post text copied.`,
      '',
      'Finish the native community posting flow there. CAIt kept the exact text in this chat.'
    ].join('\n'),
    status: `${normalizedChannel === 'reddit' ? 'Reddit' : 'Indie Hackers'} native handoff opened.`
  }, { nextPrompt: '' });
  void trackConversionEvent('community_native_handoff_opened', {
    source: options.source || 'delivery_card',
    channel: normalizedChannel
  });
}

async function executeCodeHandoffInGithub(job = null, deliverable = null, draft = {}) {
  const auth = state.snapshot?.auth || {};
  const connectorStatus = connectorStatusForClient(auth, state.snapshot?.accountSettings || null);
  const requirement = deliveryAuthorityRequirementForAction('github_pr');
  if (!auth.loggedIn) {
    setGenericDeliverableAuthorityRequired(job?.id, {
      ...requirement,
      reason: 'Sign in and connect GitHub before CAIt can create a PR handoff.'
    });
    if (job?.id && state.selectedJobId === String(job.id)) renderRunDelivery(selectedJob());
    flash('GitHub executor paused. Sign in and connect GitHub, then resume this delivery.', 'warn');
    openGithubSignIn();
    return;
  }
  if (!connectorStatus.github) {
    setGenericDeliverableAuthorityRequired(job?.id, {
      ...requirement
    });
    if (job?.id && state.selectedJobId === String(job.id)) renderRunDelivery(selectedJob());
    flash('GitHub executor paused until GitHub is connected.', 'warn');
    return;
  }
  const repoFullName = normalizeRepoFullName(draft.repoFullName || preferredGithubRepoFullName());
  if (!repoFullName || !repoFullName.includes('/')) {
    flash('Choose the target repository first.', 'warn');
    return;
  }
  const matchedRepo = findLoadedGithubRepo(repoFullName);
  const [owner, repo] = repoFullName.split('/');
  const confirmed = window.confirm(`Create a GitHub PR handoff in ${repoFullName}?\n\nCAIt will create a sandbox branch, add a technical handoff file, and open a pull request.`);
  if (!confirmed) {
    setGenericDeliverableExecutionStopped(job?.id, true, 'user_cancelled');
    if (job?.id && state.selectedJobId === String(job.id)) renderRunDelivery(selectedJob());
    flash('GitHub executor stopped for this delivery. Clear the stop state to retry.', 'info');
    return;
  }
  const payload = await api('/api/github/create-executor-pr', {
    method: 'POST',
    body: JSON.stringify({
      owner,
      repo,
      installation_id: matchedRepo?.installationId || undefined,
      confirm_repo_write: true,
      kind: 'code_handoff',
      source_job_id: job?.id || '',
      source_delivery_title: String(deliverable?.title || ''),
      source_file_name: String(deliverable?.fileName || ''),
      title: String(deliverable?.title || 'Code handoff'),
      content: String(deliverable?.content || ''),
      execution_mode: String(draft.executionMode || 'draft_pr')
    })
  });
  setGenericDeliverableAuthorityRequired(job?.id, null);
  flash(`GitHub PR handoff created: ${payload.pull_request?.html_url || payload.pull_request?.htmlUrl || payload.pull_request?.number || ''}`, 'ok');
  appendOrderChatExchange(String(deliverable?.title || 'Code handoff'), {
    kind: 'assist',
    tone: 'ok',
    body: [
      `Created a GitHub PR handoff for ${repoFullName}.`,
      '',
      payload.pull_request?.html_url || payload.pull_request?.htmlUrl || '',
      payload.branch ? `Branch: ${payload.branch}` : '',
      Array.isArray(payload.files) && payload.files.length
        ? `Files: ${payload.files.map((file) => file.path).join(', ')}`
        : ''
    ].filter(Boolean).join('\n'),
    status: 'GitHub PR handoff created.'
  }, { nextPrompt: '' });
}

async function executeGenericDeliverableViaApi(run = null, deliverable = null, draft = {}, actionKind = '') {
  const normalizedActionKind = String(actionKind || '').trim();
  if (!isDeliveryExecutionActionSupported(normalizedActionKind)) {
    throw new Error(`Unsupported delivery execution action: ${normalizedActionKind || 'unknown'}`);
  }
  const approvalPayload = normalizedActionKind === 'x_post'
    ? xApprovalPayloadForClient(String(draft.postText || ''))
    : {};
  try {
    return await api('/api/deliveries/execute', {
      method: 'POST',
      body: JSON.stringify({
        job_id: String(run?.id || ''),
        action_kind: normalizedActionKind,
        confirm_execute: true,
        ...approvalPayload,
        draft: { ...draft, ...approvalPayload },
        deliverable: {
          title: String(deliverable?.title || ''),
          fileName: String(deliverable?.fileName || ''),
          content: String(deliverable?.content || '')
        }
      })
    });
  } catch (error) {
    const preflight = preflightFromError(error);
    if (preflight?.code === 'connector_required') {
      setGenericDeliverableAuthorityRequired(run?.id, {
        reason: preflight.error || 'Additional connector access is required before this executor can continue.',
        missingConnectors: preflight.missingConnectors || [],
        missingConnectorCapabilities: preflight.missingConnectorCapabilities || [],
        source: 'delivery_execute'
      });
      if (run?.id && state.selectedJobId === String(run.id)) renderRunDelivery(selectedJob());
    }
    throw error;
  }
}

async function scheduleGenericDeliverableViaApi(run = null, deliverable = null, draft = {}, actionKind = '') {
  const normalizedActionKind = String(actionKind || '').trim();
  if (!isDeliveryScheduleActionSupported(normalizedActionKind)) {
    throw new Error(`Unsupported delivery schedule action: ${normalizedActionKind || 'unknown'}`);
  }
  const approvalPayload = normalizedActionKind === 'x_post'
    ? xApprovalPayloadForClient(String(draft.postText || ''))
    : {};
  return api('/api/deliveries/schedule', {
    method: 'POST',
    body: JSON.stringify({
      job_id: String(run?.id || ''),
      action_kind: normalizedActionKind,
      confirm_schedule: true,
      ...approvalPayload,
      draft: { ...draft, ...approvalPayload },
      deliverable: {
        title: String(deliverable?.title || '')
      },
      scheduled_for: localDatetimeInputToIso(draft.scheduledAt || ''),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Tokyo',
      task_type: normalizedActionKind === 'x_post' ? 'x_post' : normalizedActionKind === 'instagram_post' ? 'instagram' : 'email_ops',
      prompt: `${deliverable?.title || 'Scheduled action'}\nScheduled for ${localDatetimeInputToIso(draft.scheduledAt || '')}`,
      preview_text: normalizedActionKind === 'x_post' || normalizedActionKind === 'instagram_post'
        ? String(draft.postText || '')
        : `${String(draft.emailSubject || '')}\n\n${String(draft.emailBody || '')}`
    })
  });
}

function deliveryExecutionEntity(payload = {}) {
  return payload?.entity && typeof payload.entity === 'object' ? payload.entity : {};
}

function deliveryActionTargetLabel(draft = {}, action = {}) {
  const normalizedTarget = String(draft?.target || '').trim();
  if (action?.kind === 'resend_send' || normalizedTarget === 'cait_resend') return 'CAIt Resend';
  if (action?.kind === 'gmail_send' || normalizedTarget === 'gmail') return 'Gmail';
  return '';
}

function applyDeliveryExecutionSuccess(run = null, deliverable = null, draft = {}, action = {}, payload = {}, options = {}) {
  const presentation = deliveryOutcomePresentation(action.kind, payload, {
    repoFullName: normalizeRepoFullName(draft.repoFullName || preferredGithubRepoFullName()),
    targetLabel: deliveryActionTargetLabel(draft, action)
  });
  if (presentation.flash) flash(String(presentation.flash), 'ok');
  if (presentation.body || presentation.status) {
    appendOrderChatExchange(String(options.chatTitle || deliverable?.title || 'Delivery'), {
      kind: 'assist',
      tone: 'ok',
      body: String(presentation.body || '').trim(),
      status: String(presentation.status || '').trim()
    }, { nextPrompt: '' });
  }
}

async function applyDeliveryExecutionOutcomeEffects(run = null, action = {}, payload = {}) {
  const plan = deliveryExecutionSideEffectPlan(action.kind, payload);
  if (plan.clearAuthority) setGenericDeliverableAuthorityRequired(run?.id, null);
  if (plan.refresh) {
    await refresh();
  }
  if (plan.selectReturnedJob && plan.returnedJobId) {
    state.selectedJobId = String(plan.returnedJobId);
    const fresh = selectedJob();
    if (fresh) setDetail(fresh);
  }
}

async function applyDeliveryScheduleOutcomeEffects(action = {}, payload = {}) {
  const plan = deliveryScheduleSideEffectPlan(action.kind, payload);
  if (plan.refresh) await refresh();
}

async function performLocalDeliveryExecutionAction(run = null, deliverable = null, draft = {}, action = {}) {
  const plan = deliveryLocalExecutionPlan(action.kind, deliveryActionPresentationOptions(draft, action));
  if (!plan) return false;
  if (plan.kind === 'open_community') {
    await openCommunityPostTarget(plan.channel, String(draft.postText || ''), { source: plan.source || 'delivery_social_execute' });
    applyDeliveryExecutionSuccess(run, deliverable, draft, action, {
      ok: true,
      action_kind: action.kind,
      outcome_kind: 'handoff',
      message: `Opened ${plan.channel === 'reddit' ? 'Reddit' : 'Indie Hackers'} for posting.`,
      entity: { channel: plan.channel }
    }, { chatTitle: String(draft.postText || '') });
    return true;
  }
  if (plan.kind === 'copy_command') {
    const command = genericDeliverableExecutorCommand(run, deliverable, draft);
    if (command) {
      await copyTextToClipboard(command, plan.copyLabel || 'Copied.');
      applyDeliveryExecutionSuccess(run, deliverable, draft, action, {
        ok: true,
        action_kind: action.kind,
        outcome_kind: 'local_copy',
        message: plan.copyLabel || 'Executor command copied.',
        entity: { command }
      });
    }
    return true;
  }
  return false;
}

function deliveryActionPresentationOptions(draft = {}, action = {}) {
  const channel = String(draft.channel || '').trim();
  const xIdentity = xConnectorIdentityForClient();
  return {
    repoFullName: normalizeRepoFullName(draft.repoFullName || preferredGithubRepoFullName()),
    targetLabel: deliveryActionTargetLabel(draft, action),
    scheduleLabel: genericDeliverableScheduleLabel(draft.scheduledAt || ''),
    postText: String(draft.postText || '').trim(),
    xAccountLabel: xIdentity.label,
    xUsername: xIdentity.username,
    xUserId: xIdentity.userId,
    recipientEmail: String(draft.recipientEmail || '').trim(),
    emailSubject: String(draft.emailSubject || '').trim(),
    nextStep: String(draft.nextStep || '').trim(),
    channelLabel: channel === 'instagram' ? 'Instagram post' : channel === 'x' ? 'X post' : 'social handoff'
  };
}

function applyGenericDeliverableAuthorityRequirement(run = null, payload = {}, fallbackSource = 'delivery_execute') {
  const entity = payload?.entity && typeof payload.entity === 'object' ? payload.entity : {};
  const missingConnectors = Array.isArray(entity.missing_connectors) ? entity.missing_connectors : [];
  const missingConnectorCapabilities = Array.isArray(entity.missing_connector_capabilities) ? entity.missing_connector_capabilities : [];
  setGenericDeliverableAuthorityRequired(run?.id, {
    reason: String(payload?.message || payload?.error || 'Additional connector access is required before this executor can continue.'),
    missingConnectors,
    missingConnectorCapabilities,
    source: String(entity.source || fallbackSource || 'delivery_execute')
  });
  if (run?.id && state.selectedJobId === String(run.id)) renderRunDelivery(selectedJob());
}

function handleGenericDeliverableApiError(run = null, draft = {}, action = {}, error = null, options = {}) {
  const payload = error?.data && typeof error.data === 'object' ? error.data : null;
  const message = String(error?.message || '').trim();
  if (!payload && /^Unsupported delivery (execution|schedule) action:/i.test(message)) {
    flash(message, 'warn');
    return true;
  }
  const preflight = payload?.error_kind === 'authority_required'
    ? {
        code: 'connector_required',
        error: payload.message || payload.error || 'Additional connector access is required before this executor can continue.',
        missingConnectors: Array.isArray(payload?.entity?.missing_connectors) ? payload.entity.missing_connectors : [],
        missingConnectorCapabilities: Array.isArray(payload?.entity?.missing_connector_capabilities) ? payload.entity.missing_connector_capabilities : []
      }
    : preflightFromError(error);
  if (preflight?.code === 'connector_required') {
    applyGenericDeliverableAuthorityRequirement(run, payload || {
      message: preflight.error,
      entity: {
        missing_connectors: preflight.missingConnectors || [],
        missing_connector_capabilities: preflight.missingConnectorCapabilities || [],
        source: options.authoritySource || 'delivery_execute'
      }
    }, options.authoritySource || 'delivery_execute');
  }
  if (payload) {
    const presentation = deliveryErrorPresentation(action.kind, payload, {
      targetLabel: deliveryActionTargetLabel(draft, action)
    });
    if (presentation.flash) flash(String(presentation.flash), presentation.tone || 'warn');
    return true;
  }
  if (preflight?.code === 'connector_required') {
    flash('Execution paused until the required connector is connected. Resume this delivery after connecting it.', 'warn');
    return true;
  }
  return false;
}

async function executePreparedGenericDeliverable(run = null, deliverable = null) {
  let draft = genericDeliverableDraftForJob(run || {}, deliverable) || {};
  if (draft.executionStopped) {
    const stoppedPresentation = deliveryExecutorStatePresentation('', { state: 'stopped' });
    if (stoppedPresentation.flash) flash(String(stoppedPresentation.flash), stoppedPresentation.tone || 'warn');
    return;
  }
  const authority = genericDeliverableAuthorityState(run, draft);
  if (authority && !authority.resolved) {
    const pausedPresentation = deliveryExecutorStatePresentation('', { state: 'paused' });
    if (pausedPresentation.flash) flash(String(pausedPresentation.flash), pausedPresentation.tone || 'warn');
    return;
  }
  const googleRequested = deliveryGoogleSourceFlowPlan(draft, authority).requestedGroups;
  const draftValidation = validateDeliveryExecutionDraft(deliverable?.type, draft, { googleRequested });
  if (!draftValidation.ok) {
    flash(String(draftValidation.error || 'Fill in the required executor fields first.'), 'warn');
    return;
  }
  const action = resolveDeliveryExecutionAction(deliverable?.type, draft);
  flash(`Execution requested: ${String(action.kind || 'delivery')}. Waiting for response...`, 'info');
  try {
    if (action.kind === 'x_post') {
      const prompt = deliveryExecutionPromptPresentation(action.kind, deliveryActionPresentationOptions(draft, action));
      const confirmed = window.confirm(prompt.confirm);
      if (!confirmed) {
        setGenericDeliverableExecutionStopped(run?.id, true, 'user_cancelled');
        if (run?.id && state.selectedJobId === String(run.id)) renderRunDelivery(selectedJob());
        if (prompt.stopped) flash(prompt.stopped, 'info');
        return;
      }
      const result = await executeGenericDeliverableViaApi(run, deliverable, draft, action.kind);
      applyDeliveryExecutionSuccess(run, deliverable, draft, action, result, { chatTitle: String(draft.postText || '') });
      await applyDeliveryExecutionOutcomeEffects(run, action, result);
      return;
    }
    if (action.kind === 'instagram_post') {
      const prompt = deliveryExecutionPromptPresentation(action.kind, deliveryActionPresentationOptions(draft, action));
      const confirmed = window.confirm(prompt.confirm);
      if (!confirmed) {
        setGenericDeliverableExecutionStopped(run?.id, true, 'user_cancelled');
        if (run?.id && state.selectedJobId === String(run.id)) renderRunDelivery(selectedJob());
        if (prompt.stopped) flash(prompt.stopped, 'info');
        return;
      }
      const result = await executeGenericDeliverableViaApi(run, deliverable, draft, action.kind);
      applyDeliveryExecutionSuccess(run, deliverable, draft, action, result, { chatTitle: String(draft.postText || '') });
      await applyDeliveryExecutionOutcomeEffects(run, action, result);
      return;
    }
    if (await performLocalDeliveryExecutionAction(run, deliverable, draft, action)) {
      return;
    }
    if (action.kind === 'resend_send' || action.kind === 'gmail_send') {
      const prompt = deliveryExecutionPromptPresentation(action.kind, deliveryActionPresentationOptions(draft, action));
      const confirmed = window.confirm(prompt.confirm);
      if (!confirmed) {
        setGenericDeliverableExecutionStopped(run?.id, true, 'user_cancelled');
        if (run?.id && state.selectedJobId === String(run.id)) renderRunDelivery(selectedJob());
        if (prompt.stopped) flash(prompt.stopped, 'info');
        return;
      }
      const payload = await executeGenericDeliverableViaApi(run, deliverable, draft, action.kind);
      applyDeliveryExecutionSuccess(run, deliverable, draft, action, payload);
      await applyDeliveryExecutionOutcomeEffects(run, action, payload);
      return;
    }
    if (action.kind === 'github_pr') {
      const prompt = deliveryExecutionPromptPresentation(action.kind, deliveryActionPresentationOptions(draft, action));
      const confirmed = window.confirm(prompt.confirm);
      if (!confirmed) {
        setGenericDeliverableExecutionStopped(run?.id, true, 'user_cancelled');
        if (run?.id && state.selectedJobId === String(run.id)) renderRunDelivery(selectedJob());
        if (prompt.stopped) flash(prompt.stopped, 'info');
        return;
      }
      const payload = await executeGenericDeliverableViaApi(run, deliverable, draft, action.kind);
      applyDeliveryExecutionSuccess(run, deliverable, draft, action, payload);
      await applyDeliveryExecutionOutcomeEffects(run, action, payload);
      return;
    }
    if (action.kind === 'report_next') {
      const nextStep = String(draft.nextStep || 'action_plan');
      if (googleRequested.length && !draft.googleAssets && !draft.googleAssetsLoading) {
        try {
          await loadGoogleSourcesForGenericDeliverable(run, draft, authority);
          draft = genericDeliverableDraftForJob(run || {}, deliverable) || {};
        } catch (error) {
          flash(String(error?.message || 'Google sources could not be loaded.'), 'warn');
          return;
        }
      }
      const reportValidation = validateDeliveryExecutionDraft(deliverable?.type, draft, { googleRequested });
      if (!reportValidation.ok) {
        flash(String(reportValidation.error || 'Fill in the required executor fields first.'), 'warn');
        return;
      }
      const prompt = deliveryExecutionPromptPresentation(action.kind, deliveryActionPresentationOptions(draft, action));
      const confirmed = window.confirm(prompt.confirm);
      if (!confirmed) {
        setGenericDeliverableExecutionStopped(run?.id, true, 'user_cancelled');
        if (run?.id && state.selectedJobId === String(run.id)) renderRunDelivery(selectedJob());
        if (prompt.stopped) flash(prompt.stopped, 'info');
        return;
      }
      const result = await executeGenericDeliverableViaApi(run, deliverable, draft, action.kind);
      const entity = deliveryExecutionEntity(result);
      applyDeliveryExecutionSuccess(run, deliverable, draft, action, {
        ...result,
        message: nextStep === 'publish_followup'
          ? `Publish follow-up order started: ${String(entity.job_id || '').slice(0, 8)}`
          : `Next execution order started: ${String(entity.job_id || '').slice(0, 8)}`
      });
      await applyDeliveryExecutionOutcomeEffects(run, action, result);
      return;
    }
    if (action.kind === 'export_only' || action.kind === 'none') {
      const exportPresentation = deliveryExecutorStatePresentation(action.kind, { state: 'export_only' });
      if (exportPresentation.flash) flash(String(exportPresentation.flash), exportPresentation.tone || 'info');
      return;
    }
    flash(`Unsupported execution action: ${String(action.kind || 'unknown')}`, 'warn');
    return;
  } catch (error) {
    if (handleGenericDeliverableApiError(run, draft, action, error, {
      authoritySource: action.kind === 'report_next' ? 'report_executor' : 'delivery_execute'
    })) return;
    throw error;
  }
}

async function schedulePreparedGenericDeliverable(run = null, deliverable = null) {
  const draft = genericDeliverableDraftForJob(run || {}, deliverable) || {};
  const draftValidation = validateDeliveryExecutionDraft(deliverable?.type, draft);
  if (!draftValidation.ok) {
    flash(String(draftValidation.error || 'Fill in the required executor fields first.'), 'warn');
    return;
  }
  const action = resolveDeliveryScheduleAction(deliverable?.type, draft);
  try {
    if (action.kind === 'x_post' || action.kind === 'instagram_post') {
      const prompt = deliverySchedulePromptPresentation(action.kind, deliveryActionPresentationOptions(draft, action));
      const confirmed = window.confirm(prompt.confirm);
      if (!confirmed) return;
      const result = await scheduleGenericDeliverableViaApi(run, deliverable, draft, action.kind);
      const entity = deliveryExecutionEntity(result);
      const presentation = deliveryOutcomePresentation(action.kind, {
        ...result,
        message: `Scheduled action created. Next run: ${scheduledWorkTimeLabel(entity.next_run_at || localDatetimeInputToIso(draft.scheduledAt || ''))}`
      });
      if (presentation.flash) flash(String(presentation.flash), 'ok');
      await applyDeliveryScheduleOutcomeEffects(action, result);
      return;
    }
    if (action.kind === 'gmail_send' || action.kind === 'resend_send') {
      const target = String(draft.target || 'gmail');
      const prompt = deliverySchedulePromptPresentation(action.kind, deliveryActionPresentationOptions(draft, action));
      const confirmed = window.confirm(prompt.confirm);
      if (!confirmed) return;
      const result = await scheduleGenericDeliverableViaApi(run, deliverable, draft, action.kind);
      const entity = deliveryExecutionEntity(result);
      const presentation = deliveryOutcomePresentation(action.kind, {
        ...result,
        message: `Scheduled action created. Next run: ${scheduledWorkTimeLabel(entity.next_run_at || localDatetimeInputToIso(draft.scheduledAt || ''))}`
      }, { targetLabel: target === 'cait_resend' ? 'CAIt Resend' : 'Gmail' });
      if (presentation.flash) flash(String(presentation.flash), 'ok');
      await applyDeliveryScheduleOutcomeEffects(action, result);
      return;
    }
    flash(`Unsupported schedule action: ${String(action.kind || 'unknown')}`, 'warn');
    return;
  } catch (error) {
    if (handleGenericDeliverableApiError(run, draft, action, error, { authoritySource: 'delivery_schedule' })) return;
    throw error;
  }
}

async function postExactToInstagram(draft = {}, options = {}) {
  const auth = state.snapshot?.auth || {};
  if (!auth.loggedIn) {
    flash('Sign in before CAIt can publish to Instagram.', 'warn');
    openLoginForProtectedAction('instagram_publish', 'work');
    return;
  }
  const accessToken = String(draft.instagramAccessToken || '').trim();
  const instagramUserId = String(draft.instagramUserId || '').trim();
  const mediaUrl = String(draft.instagramMediaUrl || '').trim();
  const caption = String(draft.postText || '').trim();
  if (!accessToken || !instagramUserId || !mediaUrl) {
    flash('Instagram publish requires access token, Instagram user ID, and a public media URL.', 'warn');
    return;
  }
  if (!caption) {
    flash('Write the Instagram caption first.', 'warn');
    return;
  }
  const prompt = deliveryExecutionPromptPresentation('instagram_post', { postText: caption });
  const confirmed = window.confirm(prompt.confirm);
  if (!confirmed) {
    if (options.jobId) {
      setGenericDeliverableExecutionStopped(options.jobId, true, 'user_cancelled');
      if (state.selectedJobId === String(options.jobId)) renderRunDelivery(selectedJob());
    }
    if (prompt.stopped) flash(prompt.stopped, 'info');
    return;
  }
  const result = await api('/api/connectors/instagram/post', {
    method: 'POST',
    body: JSON.stringify({
      accessToken,
      instagramUserId,
      mediaUrl,
      caption,
      confirm_post: true,
      source: options.source || 'delivery_card'
    })
  });
  flash(`Published to Instagram: ${result.media_id || result.creation_id}`, 'ok');
  appendOrderChatExchange(caption, {
    kind: 'assist',
    tone: 'ok',
    body: [
      'Published to Instagram after explicit confirmation.',
      '',
      result.media_id ? `Media ID: ${result.media_id}` : '',
      result.creation_id ? `Creation ID: ${result.creation_id}` : ''
    ].filter(Boolean).join('\n'),
    status: 'Instagram publish completed.'
  }, { nextPrompt: '' });
}

  function renderGenericDeliverableCard(run = null, deliverable = null) {
    if (!run?.id || !deliverable?.content) return '';
    const seed = state.deliveryExecutionSeeds?.[String(run.id || '').trim()] || null;
    if (!seed || seed.status === 'error') {
      void prepareGenericDeliverableExecutionSeed(run, deliverable);
    }
    const context = genericDeliverableRenderContext(run, deliverable);
    if (!context.meta) return '';
    const sections = genericDeliverableSectionDescriptors()
      .map((section) => renderGenericDeliverableSection(section, context))
      .filter(Boolean)
      .join('');
    return `
      <div class="detail-box action-card info compact-card delivery-publish-card">
        ${sections}
      </div>
    `;
  }

function renderGenericDeliverableControlField(run = null, draft = {}, field = {}, options = {}) {
  if (!field || typeof field !== 'object') return '';
  if (field.kind === 'group' && Array.isArray(field.fields)) {
    const inner = field.fields.map((item) => renderGenericDeliverableControlField(run, draft, item, options)).join('');
    return inner ? `<div class="${escapeHtml(String(field.layout || 'publish-grid'))}">${inner}</div>` : '';
  }
  const label = String(field.label || '').trim();
  const dataAttr = String(field.dataAttr || '').trim();
  const key = String(field.key || '').trim();
  if (!label || !dataAttr || !key) return '';
  const value = draft?.[key];
  const helperText = String(field.helperText || '').trim();
  const placeholder = String(field.placeholder || '').trim();
  const extraHtml = String(field.extraHtml || '');
  if (field.type === 'select') {
    const overrideOptions = options?.optionOverrides && typeof options.optionOverrides === 'object'
      ? options.optionOverrides[key]
      : null;
    const selectOptions = Array.isArray(overrideOptions) && overrideOptions.length
      ? overrideOptions
      : (Array.isArray(field.options) ? field.options : []);
    return `
      <label class="form-field">
        <span class="field-label">${escapeHtml(label)}</span>
        <select ${escapeHtml(dataAttr)}="${escapeHtml(run?.id || '')}">
          ${selectOptions.map((option) => `<option value="${escapeHtml(String(option?.value || ''))}"${String(value || '') === String(option?.value || '') ? ' selected' : ''}>${escapeHtml(String(option?.label || option?.value || ''))}</option>`).join('')}
        </select>
        ${helperText ? `<span class="row-muted">${escapeHtml(helperText)}</span>` : ''}
      </label>
    `;
  }
  if (field.type === 'textarea') {
    return `
      <label class="form-field">
        <span class="field-label">${escapeHtml(label)}</span>
        <textarea rows="${Number(field.rows || 4)}" ${escapeHtml(dataAttr)}="${escapeHtml(run?.id || '')}" placeholder="${escapeHtml(placeholder)}">${escapeHtml(String(value || ''))}</textarea>
        ${helperText ? `<span class="row-muted">${escapeHtml(helperText)}</span>` : ''}
      </label>
    `;
  }
  const inputType = field.type === 'datetime-local' ? 'datetime-local' : 'text';
  const listAttr = field.listId ? ` list="${escapeHtml(String(field.listId || ''))}"` : '';
  return `
    <label class="form-field">
      <span class="field-label">${escapeHtml(label)}</span>
      <input type="${escapeHtml(inputType)}" ${escapeHtml(dataAttr)}="${escapeHtml(run?.id || '')}" value="${escapeHtml(String(value || ''))}" placeholder="${escapeHtml(placeholder)}"${listAttr} />
      ${helperText ? `<span class="row-muted">${escapeHtml(helperText)}</span>` : ''}
      ${extraHtml}
    </label>
  `;
}

function renderDeliveryAuthorityCard(run = null, deliverable = null, authority = null) {
  if (!authority) return '';
  const ownerLabel = authorityOwnerLabelForRun(run, deliverable, authority);
  const authorityText = genericDeliverableAuthoritySummary(run, deliverable, authority);
  return `<div class="detail-box compact-card ${authority.resolved ? 'ok' : 'warn'}"><strong>${escapeHtml(`${ownerLabel.toUpperCase()} REQUEST`)}</strong>\n\n${escapeHtml(authorityText)}</div>`;
}

function renderGoogleSourceControls(run = null, draft = {}, authority = null, googleSourcePlan = null, googleOptionsByGroup = {}) {
  const authorityReadyToResume = Boolean(authority && authority.resolved);
  const requestedGroups = Array.isArray(googleSourcePlan?.requestedGroups) ? googleSourcePlan.requestedGroups : [];
  if (!requestedGroups.length || !authorityReadyToResume) return '';
  const authorityOwnerLabel = authorityOwnerLabelForRun(run, { type: 'report_bundle' }, authority);
  const fieldDescriptors = deliveryGoogleSourceFieldDescriptors(requestedGroups);
  return `
      <div class="detail-box compact-card info">
        <div class="field-label">${escapeHtml(deliveryUiText('googleSourcesTitle'))}</div>
        <div class="muted">${escapeHtml(`${authorityOwnerLabel} asked for Google data before continuing.`)}</div>
        <div class="muted">${escapeHtml(String(googleSourcePlan?.summary || deliveryUiText('googleSourcesSummaryFallback')))}</div>
        ${draft.googleAssetsError ? `<div class="detail-box compact-card warn">${escapeHtml(String(draft.googleAssetsError || ''))}</div>` : ''}
        ${fieldDescriptors.map((field) => `
          <label class="form-field">
            <span class="field-label">${escapeHtml(field.label)}</span>
            <select data-generic-delivery-${escapeHtml(field.attr)}="${escapeHtml(run.id)}">
              <option value="">${escapeHtml(field.emptyLabel)}</option>
              ${(googleOptionsByGroup[field.group] || []).map((option) => `<option value="${escapeHtml(String(option.value || ''))}"${String(draft?.[field.key] || '') === String(option.value || '') ? ' selected' : ''}>${escapeHtml(String(option.label || option.value || ''))}</option>`).join('')}
            </select>
          </label>
        `).join('')}
        <div class="helper-row">
          <button class="mini-btn" data-load-generic-google-sources="1">${deliveryGoogleSourceLoadLabel({ loading: draft.googleAssetsLoading })}</button>
        </div>
      </div>
    `;
}

function renderGenericDeliverablePrimaryActionButtons(run = null, descriptors = [], options = {}) {
  if (options.executionStopped || options.authorityBlocked) return '';
  return (Array.isArray(descriptors) ? descriptors : [])
    .filter((descriptor) => !descriptor.requiresConnectReady || options.connectReady)
    .map((descriptor) => descriptor.mode === 'schedule'
      ? `<button class="mini-btn" data-schedule-generic-deliverable="${escapeHtml(String(descriptor.dataAction || ''))}">${escapeHtml(String(descriptor.label || 'RUN'))}</button>`
      : `<button class="mini-btn" data-execute-generic-deliverable="${escapeHtml(String(descriptor.dataAction || ''))}">${escapeHtml(String(descriptor.label || 'RUN'))}</button>`)
    .join('');
}

function renderGenericDeliverableApprovalPreview(context = {}) {
  const draft = context.draft && typeof context.draft === 'object' ? context.draft : {};
  const isXPost = context.deliverable?.type === 'social_post_pack'
    && String(draft.channel || '').trim() === 'x'
    && ['post_ready', 'schedule_ready'].includes(String(draft.actionMode || '').trim());
  if (!isXPost) return '';
  const identity = xConnectorIdentityForClient();
  const postText = String(draft.postText || '').trim();
  const accountLine = context.connectReady && identity.handle
    ? `OAuth account: ${identity.handle}${identity.displayName ? ` (${identity.displayName})` : ''}`
    : 'OAuth account: not connected yet';
  return `
    <div class="detail-box compact-card ${context.connectReady ? 'info' : 'warn'}">
      <strong>X POST APPROVAL PREVIEW</strong>
      <div class="row-muted">${escapeHtml(accountLine)}</div>
      <div class="row-muted">${escapeHtml('CAIt posts only after this account and the exact text are approved.')}</div>
      ${postText ? `<pre class="delivery-preview-text">${escapeHtml(postText)}</pre>` : `<div class="row-muted">${escapeHtml('No exact post text yet.')}</div>`}
    </div>
  `;
}

function renderGenericDeliverableAuxiliaryButtons(run = null, deliverable = null, authority = null, options = {}) {
  const authorityButtons = Boolean(options.authorityBlocked)
    ? (Array.isArray(authority?.missingConnectors) ? authority.missingConnectors : [])
      .slice(0, 3)
      .map((connector) => {
        const action = connectorActionForChat(connector);
        const capabilities = (Array.isArray(authority?.missingConnectorCapabilities) ? authority.missingConnectorCapabilities : [])
          .filter((capability) => String(capability || '').trim().toLowerCase().startsWith(`${String(connector || '').trim().toLowerCase()}.`));
        const capabilityAttr = capabilities.length ? ` data-connector-capabilities="${escapeHtml(capabilities.join(','))}"` : '';
        return `<button class="mini-btn" data-chat-action="${escapeHtml(action.action)}"${capabilityAttr}>${escapeHtml(action.label)}</button>`;
      })
      .join('')
    : '';
  const stopButton = authority && !options.executionStopped
    ? '<button class="mini-btn" data-stop-generic-execution="1">CANCEL EXECUTION</button>'
    : '';
  const retryButton = options.executionStopped
    ? '<button class="mini-btn" data-clear-generic-execution-stop="1">ALLOW EXECUTION AGAIN</button>'
    : '';
  const executorCommandButton = deliverable?.type === 'code_handoff' && options.executorCommand
    ? '<button class="mini-btn" data-copy-executor-command="1">COPY EXECUTOR COMMAND</button>'
    : '';
  let connectCapabilities = '';
  if (options.connectAction === 'connect_google' && deliverable?.type === 'email_pack' && String(options.target || '') === 'gmail') connectCapabilities = 'google.send_gmail';
  if (options.connectAction === 'connect_x') connectCapabilities = 'x.post';
  const connectCapabilityAttr = connectCapabilities ? ` data-connector-capabilities="${escapeHtml(connectCapabilities)}"` : '';
  const connectButton = options.connectAction && !options.connectReady && !authority
    ? `<button class="mini-btn" data-chat-action="${escapeHtml(String(options.connectAction || ''))}"${connectCapabilityAttr}>${escapeHtml(String(options.connectLabel || ''))}</button>`
    : '';
  const cliButton = deliverable?.type === 'code_handoff' && String(options.target || '') === 'local_terminal'
    ? '<button class="mini-btn" data-open-cli-help="1">OPEN CLI HELP</button>'
    : '';
  return [authorityButtons, stopButton, retryButton, executorCommandButton, connectButton, cliButton].filter(Boolean).join('');
}

function renderGenericDeliverableControls(run = null, deliverable = null, draft = {}, options = {}) {
  const fields = deliveryControlFieldsForType(deliverable?.type, draft, options);
  return fields.map((field) => renderGenericDeliverableControlField(run, draft, field, options)).join('');
}

function flattenDeliveryControlFields(fields = []) {
  const flattened = [];
  for (const field of Array.isArray(fields) ? fields : []) {
    if (!field || typeof field !== 'object') continue;
    if (field.kind === 'group' && Array.isArray(field.fields)) {
      flattened.push(...flattenDeliveryControlFields(field.fields));
      continue;
    }
    flattened.push(field);
  }
  return flattened;
}

function bindDataAttrEvent(root = null, dataAttr = '', eventName = 'change', handler = null) {
  const attr = String(dataAttr || '').trim();
  if (!root || !attr || typeof handler !== 'function') return;
  root.querySelectorAll(`[${attr}]`).forEach((input) => {
    input[`on${eventName}`] = () => handler(input);
  });
}

function bindClickAction(root = null, dataAttr = '', handler = null) {
  bindDataAttrEvent(root, dataAttr, 'click', handler);
}

function bindDescriptorFields(root = null, descriptors = [], resolveBinding = null) {
  if (!root || typeof resolveBinding !== 'function') return;
  for (const descriptor of Array.isArray(descriptors) ? descriptors : []) {
    const key = String(descriptor?.key || '').trim();
    const dataAttr = String(descriptor?.dataAttr || '').trim();
    const binding = resolveBinding(key, descriptor);
    if (!dataAttr || !binding || typeof binding.handler !== 'function') continue;
    bindDataAttrEvent(root, dataAttr, binding.event || 'change', binding.handler);
  }
}

function bindDescriptorActions(root = null, descriptors = [], resolveHandler = null) {
  if (!root || typeof resolveHandler !== 'function') return;
  for (const descriptor of Array.isArray(descriptors) ? descriptors : []) {
    const dataAttr = String(descriptor?.dataAttr || '').trim();
    const kind = String(descriptor?.kind || '').trim();
    const handler = resolveHandler(kind, descriptor);
    if (!dataAttr || typeof handler !== 'function') continue;
    bindClickAction(root, dataAttr, handler);
  }
}

function bindGenericDeliverableControlFields(root = null, run = null, deliverable = null, value = null) {
  if (!root || !run?.id || !deliverable?.type) return;
  const getDraft = () => genericDeliverableDraftForJob(run || {}, deliverable) || {};
  const controlFields = flattenDeliveryControlFields(deliveryControlFieldsForType(deliverable.type, getDraft(), {
    isPlatformAdmin: Boolean(state.snapshot?.auth?.isPlatformAdmin),
    scheduleLabel: genericDeliverableScheduleLabel(getDraft().scheduledAt)
  }));
  const fieldBindings = {
    channel: {
      event: 'change',
      handler: (input) => {
        const channel = String(input.value || 'x');
        updateGenericDeliverableDraft(run.id, { channel });
        void saveXExecutorPreferences({ channel });
        renderRunDelivery(value);
      }
    },
    actionMode: {
      event: 'change',
      handler: (input) => {
        const actionMode = String(input.value || 'draft_only');
        const currentDraft = getDraft();
        const patch = { actionMode };
        if (actionMode === 'schedule_ready' && !String(currentDraft.scheduledAt || '').trim()) {
          patch.scheduledAt = localDatetimeInputValue('');
        }
        updateGenericDeliverableDraft(run.id, patch);
        if (deliverable.type === 'social_post_pack') void saveXExecutorPreferences({ actionMode });
        renderRunDelivery(value);
      }
    },
    target: {
      event: 'change',
      handler: (input) => {
        updateGenericDeliverableDraft(run.id, { target: String(input.value || '') });
        renderRunDelivery(value);
      }
    },
    recipientEmail: {
      event: 'input',
      handler: (input) => updateGenericDeliverableDraft(run.id, { recipientEmail: String(input.value || '') })
    },
    senderEmail: {
      event: 'input',
      handler: (input) => updateGenericDeliverableDraft(run.id, { senderEmail: String(input.value || '') })
    },
    replyToEmail: {
      event: 'input',
      handler: (input) => updateGenericDeliverableDraft(run.id, { replyToEmail: String(input.value || '') })
    },
    emailSubject: {
      event: 'input',
      handler: (input) => updateGenericDeliverableDraft(run.id, { emailSubject: String(input.value || '') })
    },
    emailBody: {
      event: 'input',
      handler: (input) => updateGenericDeliverableDraft(run.id, { emailBody: String(input.value || '') })
    },
    executionMode: {
      event: 'change',
      handler: (input) => {
        updateGenericDeliverableDraft(run.id, { executionMode: String(input.value || 'draft_pr') });
        renderRunDelivery(value);
      }
    },
    repoFullName: {
      event: 'change',
      handler: (input) => {
        const repoFullName = normalizeRepoFullName(String(input.value || ''));
        updateGenericDeliverableDraft(run.id, { repoFullName });
        void saveGithubExecutorPreferences({ repoFullName });
        renderRunDelivery(value);
      }
    },
    nextStep: {
      event: 'change',
      handler: (input) => {
        updateGenericDeliverableDraft(run.id, { nextStep: String(input.value || 'action_plan') });
        renderRunDelivery(value);
      }
    },
    postText: {
      event: 'input',
      handler: (input) => {
        const postText = String(input.value || '');
        updateGenericDeliverableDraft(run.id, { postText });
        const note = input.parentElement?.querySelector('.row-muted');
        if (note) {
          const currentDraft = getDraft();
          note.textContent = String(currentDraft.channel || '') === 'x'
            ? `${postText.length}/280 chars for X direct execution`
            : `${postText.length} chars`;
        }
      }
    },
    scheduledAt: {
      event: 'change',
      handler: (input) => {
        updateGenericDeliverableDraft(run.id, { scheduledAt: String(input.value || '') });
        renderRunDelivery(value);
      }
    },
    instagramAccessToken: {
      event: 'input',
      handler: (input) => updateGenericDeliverableDraft(run.id, { instagramAccessToken: String(input.value || '') })
    },
    instagramUserId: {
      event: 'input',
      handler: (input) => updateGenericDeliverableDraft(run.id, { instagramUserId: String(input.value || '') })
    },
    instagramMediaUrl: {
      event: 'input',
      handler: (input) => updateGenericDeliverableDraft(run.id, { instagramMediaUrl: String(input.value || '') })
    }
  };
  for (const field of controlFields) {
    const key = String(field?.key || '').trim();
    const dataAttr = String(field?.dataAttr || '').trim();
    const binding = fieldBindings[key];
    if (!binding || !dataAttr) continue;
    bindDataAttrEvent(root, dataAttr, binding.event, binding.handler);
  }
  const currentDraft = getDraft();
  const authority = genericDeliverableAuthorityState(run, currentDraft);
  const googleSourcePlan = deliveryGoogleSourceFlowPlan(currentDraft, authority);
  const googlePreferenceMap = {
    googleSearchConsoleSite: 'searchConsoleSite',
    googleGa4Property: 'ga4Property',
    googleDriveFileId: 'driveFileId',
    googleCalendarId: 'calendarId',
    googleGmailLabelId: 'gmailLabelId'
  };
  for (const field of deliveryGoogleSourceFieldDescriptors(googleSourcePlan.requestedGroups || [])) {
    bindDataAttrEvent(root, `data-generic-delivery-${field.attr}`, 'change', (input) => {
      const selectedValue = String(input.value || '');
      updateGenericDeliverableDraft(run.id, { [field.key]: selectedValue });
      const preferenceKey = googlePreferenceMap[field.key];
      if (preferenceKey) void saveGoogleExecutorPreferences({ [preferenceKey]: selectedValue });
      renderRunDelivery(value);
    });
  }
}

function bindGenericDeliverableActionButtons(root = null, run = null, deliverable = null, value = null) {
  if (!root || !run?.id || !deliverable) return;
  bindClickAction(root, 'data-copy-generic-deliverable', () => {
    void copyTextToClipboard(String(deliverable?.content || ''), `${deliverable?.title || 'Deliverable'} copied.`);
  });
  bindClickAction(root, 'data-prepare-generic-deliverable', () => {
    void prepareGenericDeliverableOrderFromDelivery(run, deliverable);
  });
  bindClickAction(root, 'data-execute-generic-deliverable', () => {
    void executePreparedGenericDeliverable(run, deliverable);
  });
  bindClickAction(root, 'data-schedule-generic-deliverable', () => {
    void schedulePreparedGenericDeliverable(run, deliverable);
  });
  bindClickAction(root, 'data-clear-generic-execution-stop', () => {
    setGenericDeliverableExecutionStopped(run.id, false, '');
    renderRunDelivery(value);
    flash('Execution stop cleared. You can run this delivery again.', 'ok');
  });
  bindClickAction(root, 'data-stop-generic-execution', () => {
    setGenericDeliverableExecutionStopped(run.id, true, 'user_cancelled');
    setGenericDeliverableAuthorityRequired(run.id, null);
    renderRunDelivery(value);
    flash('Execution stopped for this delivery. Clear the stop state to allow it again.', 'info');
  });
  bindClickAction(root, 'data-copy-executor-command', () => {
    const draft = genericDeliverableDraftForJob(run || {}, deliverable) || {};
    const command = genericDeliverableExecutorCommand(run, deliverable, draft);
    if (command) void copyTextToClipboard(command, 'Executor command copied.');
  });
  bindClickAction(root, 'data-open-cli-help', () => {
    switchTab('connect');
    updateCliPanels(state.snapshot);
    flash('Open CLI help for local terminal handoff details.', 'info');
  });
  bindClickAction(root, 'data-load-generic-google-sources', async () => {
    const draft = genericDeliverableDraftForJob(run || {}, deliverable) || {};
    const authority = genericDeliverableAuthorityState(run, draft);
    try {
      await loadGoogleSourcesForGenericDeliverable(run, draft, authority);
    } catch (error) {
      flash(String(error?.message || 'Google sources could not be loaded.'), 'warn');
    }
  });
}

function bindDeliveryCommonActionButtons(root = null, options = {}) {
  if (!root) return;
  bindClickAction(root, 'data-copy-delivery-summary', () => {
    copyTextToClipboard(String(options.summaryText || ''), 'Summary copied.');
  });
  bindClickAction(root, 'data-download-delivery-summary', () => {
    downloadDeliverySummaryFile(options.run || null, String(options.summaryText || ''));
  });
  bindClickAction(root, 'data-chat-action', (button) => {
    void handleChatActionButton(button.dataset.chatAction || '', {
      capabilities: button.dataset.connectorCapabilities || '',
      googleCapabilities: button.dataset.connectorCapabilities || '',
      xCapabilities: button.dataset.connectorCapabilities || ''
    });
  });
  bindClickAction(root, 'data-open-workflow-parent', () => {
    if (options.workflowParent?.id) openJobDetail(options.workflowParent.id);
  });
  bindClickAction(root, 'data-open-child-run', (button) => {
    openJobDetail(button.dataset.openChildRun || '');
  });
  bindClickAction(root, 'data-copy-delivery-file', (button) => {
    const file = (options.renderedFiles || [])[Number(button.dataset.copyDeliveryFile)];
    copyTextToClipboard(String(file?.content || ''), `${file?.name || 'File'} copied.`);
  });
  bindClickAction(root, 'data-download-delivery-file', (button) => {
    const file = (options.renderedFiles || [])[Number(button.dataset.downloadDeliveryFile)];
    downloadDeliveryFile(file);
  });
  bindClickAction(root, 'data-download-delivery-zip', () => {
    downloadDeliveryZip(options.renderedFiles || [], options.run || null);
  });
}

function updateDeliveryPublishPreview(root = null, run = null, article = null) {
  const preview = root?.querySelector('.delivery-publish-card .publish-preview-box');
  if (!preview) return;
  preview.textContent = `Planned URL path: ${deliveryPublishContext(run, article).pathPreview}`;
}

function deliveryPublishFieldBinding(run = null, article = null, value = null, root = null, fieldKey = '') {
  const key = String(fieldKey || '').trim();
  if (key === 'target') {
    return {
      event: 'change',
      handler: (input) => {
        updateDeliveryPublishDraft(run.id, { target: String(input.value || 'github_repo') });
        renderRunDelivery(value);
      }
    };
  }
  if (key === 'pathPrefix') {
    return {
      event: 'input',
      handler: (input) => {
        updateDeliveryPublishDraft(run.id, { pathPrefix: String(input.value || '/blog') });
        updateDeliveryPublishPreview(root, run, article);
      }
    };
  }
  if (key === 'slug') {
    return {
      event: 'input',
      handler: (input) => {
        updateDeliveryPublishDraft(run.id, { slug: String(input.value || '') });
        updateDeliveryPublishPreview(root, run, article);
      }
    };
  }
  if (key === 'publishMode') {
    return {
      event: 'change',
      handler: (input) => {
        updateDeliveryPublishDraft(run.id, { publishMode: String(input.value || 'draft_pr') });
      }
    };
  }
  return null;
}

function deliveryPublishActionHandler(run = null, article = null, actionKind = '') {
  const normalizedActionKind = String(actionKind || '').trim();
  if (normalizedActionKind === 'copy_article') {
    return async () => {
      const publishContext = deliveryPublishContext(run, article);
      await copyArticleCandidate(article, { silent: true });
      applyPublishActionSuccess(run, article, publishContext.draft, normalizedActionKind, {
        ok: true,
        action_kind: normalizedActionKind,
        outcome_kind: 'local_copy',
        message: 'Article copied.'
      });
    };
  }
  if (normalizedActionKind === 'prepare_publish_order') {
    return async () => {
      const publishContext = deliveryPublishContext(run, article);
      const prepared = await preparePublishOrderFromDelivery(run, article);
      applyPublishActionSuccess(run, article, publishContext.draft, normalizedActionKind, {
        ok: true,
        action_kind: normalizedActionKind,
        outcome_kind: 'prepared_order',
        message: `Publish draft prepared for ${String(prepared?.path_preview || '').trim()}. Review it, then SEND ORDER when ready.`,
        entity: {
          path_preview: String(prepared?.path_preview || '').trim()
        }
      });
    };
  }
  if (normalizedActionKind === 'open_cli_help') {
    return () => {
      const publishContext = deliveryPublishContext(run, article);
      switchTab('connect');
      updateCliPanels(state.snapshot);
      applyPublishActionSuccess(run, article, publishContext.draft, normalizedActionKind, {
        ok: true,
        action_kind: normalizedActionKind,
        outcome_kind: 'local_open',
        message: 'Open CLI help for local terminal handoff details.'
      });
    };
  }
  return null;
}

function bindDeliveryPublishControls(root = null, run = null, article = null, value = null) {
  if (!root || !run?.id || !article?.content) return;
  const publishContext = deliveryPublishContext(run, article);
  bindDescriptorFields(root, publishContext.fieldDescriptors, (key) => deliveryPublishFieldBinding(run, article, value, root, key));
  bindDescriptorActions(root, publishContext.actionDescriptors, (kind) => deliveryPublishActionHandler(run, article, kind));
}

function renderRunDeliverySections(run = null, options = {}) {
  return [
    renderWorkflowChildNote(options.workflowParent),
    run?.jobKind === 'workflow' ? renderWorkflowTeamSummary(options.workflowChildren || []) : '',
    renderDeliveryPublishCard(run, options.article),
    renderGenericDeliverableCard(run, options.genericDeliverable),
    renderDeliveryFilesPanel(options.files || [], { run })
  ].filter(Boolean).join('');
}

function bindRunDeliveryInteractions(root = null, value = null, options = {}) {
  if (!root) return;
  bindDeliveryPublishControls(root, options.run, options.article, value);
  bindGenericDeliverableControlFields(root, options.run, options.genericDeliverable, value);
  bindGenericDeliverableActionButtons(root, options.run, options.genericDeliverable, value);
  bindDeliveryCommonActionButtons(root, {
    run: options.run,
    workflowParent: options.workflowParent,
    renderedFiles: options.files || [],
    summaryText: options.summaryText
  });
}

function defaultDeliveryPublishDraft(article = null) {
  return {
    target: state.snapshot?.auth && isGithubLinked(state.snapshot.auth) ? 'github_repo' : 'local_terminal',
    pathPrefix: '/blog',
    slug: article?.suggestedSlug || '',
    publishMode: 'draft_pr'
  };
}

function deliveryPublishContext(job = null, article = null) {
  const seed = state.deliveryPublishSeeds?.[String(job?.id || '').trim()] || null;
  const draft = deliveryPublishDraftForJob(job || {}, article);
  const githubReady = seed?.status === 'done' ? Boolean(seed.githubReady) : isGithubLinked(state.snapshot?.auth || {});
  const fieldDescriptors = Array.isArray(seed?.fieldDescriptors) && seed.fieldDescriptors.length
    ? seed.fieldDescriptors
    : deliveryPublishFieldDescriptors(draft, article);
  const actionDescriptors = Array.isArray(seed?.actionDescriptors) && seed.actionDescriptors.length
    ? seed.actionDescriptors
    : deliveryPublishActionDescriptors(draft, { githubReady });
  return {
    draft,
    seed,
    githubReady,
    fieldDescriptors,
    actionDescriptors,
    pathPreview: deliveryPublishUrlPath(draft)
  };
}

function deliveryPublishDraftForJob(job = {}, article = null) {
  const key = String(job?.id || '');
  loadPersistedDeliveryActionDrafts();
  const existing = state.deliveryPublishDrafts?.[key];
  if (existing) return existing;
  const persisted = job?.executorState && typeof job.executorState === 'object' ? job.executorState : null;
  const draft = {
    ...defaultDeliveryPublishDraft(article),
    ...(persisted ? {
      target: String(persisted.publishTarget || '').trim() || undefined,
      pathPrefix: String(persisted.publishPathPrefix || '').trim() || undefined,
      slug: String(persisted.publishSlug || '').trim() || undefined,
      publishMode: String(persisted.publishMode || '').trim() || undefined
    } : {})
  };
  state.deliveryPublishDrafts[key] = draft;
  persistDeliveryActionDrafts();
  return draft;
}

function updateDeliveryPublishDraft(jobId = '', patch = {}) {
  const key = String(jobId || '').trim();
  if (!key) return;
  loadPersistedDeliveryActionDrafts();
  const current = state.deliveryPublishDrafts?.[key] && typeof state.deliveryPublishDrafts[key] === 'object'
    ? state.deliveryPublishDrafts[key]
    : defaultDeliveryPublishDraft(null);
  state.deliveryPublishDrafts[key] = { ...current, ...patch };
  persistDeliveryActionDrafts();
  void persistDeliveryPublishDraft(key, false);
}

function deliveryPublishUrlPath(draft = {}) {
  const prefix = `/${String(draft?.pathPrefix || '/blog').trim().replace(/^\/+|\/+$/g, '')}`.replace(/\/{2,}/g, '/');
  const slug = String(draft?.slug || '').trim().replace(/^\/+|\/+$/g, '');
  return slug ? `${prefix}/${slug}`.replace(/\/{2,}/g, '/') : prefix;
}

function copyArticleCandidate(article = null, options = {}) {
  if (!article?.content) throw new Error('No article content to copy.');
  return copyTextToClipboard(String(article.content || ''), options.silent ? '' : 'Article copied.');
}

function applyPublishActionSuccess(run = null, article = null, draft = {}, actionKind = '', payload = {}) {
  applyDeliveryExecutionSuccess(run, article, draft, { kind: String(actionKind || '').trim() }, payload, {
    chatTitle: String(article?.title || 'Article draft')
  });
}

function renderDeliveryPublishField(run = null, draft = {}, field = {}) {
  const dataAttr = String(field?.dataAttr || '').trim();
  const label = String(field?.label || field?.key || '').trim();
  const key = String(field?.key || '').trim();
  const value = String(draft?.[key] || field?.fallbackValue || '');
  if (field.type === 'select') {
    const options = (Array.isArray(field.options) ? field.options : []).map((option) => {
      const optionValue = String(option?.value || '').trim();
      const optionLabel = String(option?.label || optionValue).trim();
      return `<option value="${escapeHtml(optionValue)}"${value === optionValue ? ' selected' : ''}>${escapeHtml(optionLabel)}</option>`;
    }).join('');
    return `
      <label class="form-field">
        <span class="field-label">${escapeHtml(label)}</span>
        <select ${escapeHtml(dataAttr)}="${escapeHtml(run.id)}">
          ${options}
        </select>
      </label>
    `;
  }
  return `
    <label class="form-field">
      <span class="field-label">${escapeHtml(label)}</span>
      <input ${escapeHtml(dataAttr)}="${escapeHtml(run.id)}" value="${escapeHtml(value)}" placeholder="${escapeHtml(String(field?.placeholder || ''))}" />
    </label>
  `;
}

function renderDeliveryPublishFields(run = null, draft = {}, article = null) {
  const { fieldDescriptors } = deliveryPublishContext(run, article);
  return fieldDescriptors
    .map((field) => renderDeliveryPublishField(run, draft, field))
    .join('');
}

function renderPublishMetaLine(title = '', secondary = '') {
  return `<div class="publish-meta-line"><strong>${escapeHtml(title || 'Article draft')}</strong><span>${escapeHtml(secondary || '-')}</span></div>`;
}

function renderPublishPreviewBox(pathPreview = '') {
  return `<div class="detail-box compact-card publish-preview-box">Planned URL path: ${escapeHtml(String(pathPreview || '').trim())}</div>`;
}

function renderActionDescriptorButtons(descriptors = [], fallbackValue = '') {
  const actions = Array.isArray(descriptors) ? descriptors : [];
  if (!actions.length) return '';
  return actions.map((action) => {
    const dataAttr = String(action?.dataAttr || '').trim();
    const dataValue = String(action?.dataValue || fallbackValue || '').trim();
    return `<button class="mini-btn" ${escapeHtml(dataAttr)}="${escapeHtml(dataValue)}">${escapeHtml(String(action?.label || 'ACTION'))}</button>`;
  }).join('');
}

function renderDeliveryPublishSection(section = {}, context = {}) {
  const kind = String(section?.kind || '').trim();
  if (!kind) return '';
  if (kind === 'intro') {
    return [
      `<div class="field-label">${escapeHtml(deliveryUiText('articleDetectedLabel'))}</div>`,
      `<div class="muted">${escapeHtml(deliveryUiText('articleDetectedDescription'))}</div>`
    ].join('');
  }
  if (kind === 'meta') {
    return renderPublishMetaLine(context.article?.title || 'Article draft', context.article?.fileName || '-');
  }
  if (kind === 'fields') {
    return `<div class="publish-grid">${renderDeliveryPublishFields(context.run, context.draft, context.article)}</div>`;
  }
  if (kind === 'preview') {
    return renderPublishPreviewBox(context.pathPreview);
  }
  if (kind === 'actions') {
    return `<div class="helper-row">${renderActionDescriptorButtons(context.actionDescriptors, context.run?.id || '')}</div>`;
  }
  return '';
}

async function preparePublishOrderFromDelivery(job = null, article = null) {
  if (!job?.id) throw new Error('Select a completed delivery first.');
  if (!article?.content) throw new Error('No article draft detected in this delivery.');
  const { draft } = deliveryPublishContext(job, article);
  const prepared = await api('/api/deliveries/prepare-publish-order', {
    method: 'POST',
    body: JSON.stringify({
      job_id: String(job.id || ''),
      title: String(article.title || ''),
      content: String(article.content || ''),
      file_name: String(article.fileName || ''),
      draft
    })
  });
  loadOrderDraftIntoComposer({
    followupToJobId: String(prepared?.followup_to_job_id || job.id || ''),
    taskType: String(prepared?.task_type || job.taskType || 'writing'),
    agentId: String(prepared?.agent_id || ''),
    prompt: String(prepared?.prompt || '').trim(),
    budgetCap: Number(job?.budgetCap ?? 300),
    deadlineSec: Number(job?.deadlineSec ?? 120),
    orderStrategy: String(prepared?.order_strategy || 'auto')
  });
  return prepared;
}

function renderDeliveryPublishCard(run = null, article = null) {
  if (!run?.id || !article?.content) return '';
  const seed = state.deliveryPublishSeeds?.[String(run.id || '').trim()] || null;
  if (!seed || seed.status === 'error') {
    void prepareDeliveryPublishSeed(run, article);
  }
  const context = { run, article, ...deliveryPublishContext(run, article) };
  const sections = deliveryPublishSectionDescriptors(context)
    .map((section) => renderDeliveryPublishSection(section, context))
    .filter(Boolean)
    .join('');
  return `
    <div class="detail-box action-card info compact-card delivery-publish-card">
      ${sections}
    </div>
  `;
}

function genericDeliverableConnectorContext(deliverable = null, draft = {}) {
  const auth = state.snapshot?.auth || {};
  const connectorStatus = connectorStatusForClient(auth, state.snapshot?.accountSettings || null);
  const connectAction = deliverable?.type === 'social_post_pack' && String(draft.channel || '') === 'x'
    ? 'connect_x'
    : deliverable?.type === 'email_pack' && String(draft.target || '') === 'gmail'
      ? 'connect_google'
    : deliverable?.type === 'code_handoff' && String(draft.target || '') === 'github_repo'
      ? 'connect_github'
      : '';
  const connectLabel = connectorActionLabel(connectAction, '');
  const connectReady = connectAction === 'connect_github'
    ? connectorStatus.github
    : connectAction === 'connect_google'
      ? connectorStatus.google
      : connectAction === 'connect_x'
        ? connectorStatus.x
        : true;
  return {
    connectAction,
    connectLabel,
    connectReady,
    isPlatformAdmin: Boolean(auth.isPlatformAdmin)
  };
}

function genericDeliverableGoogleSourceContext(draft = {}, authority = null, authorityReadyToResume = false) {
  const googleAssets = draft.googleAssets && typeof draft.googleAssets === 'object' ? draft.googleAssets : null;
  const googleSites = Array.isArray(googleAssets?.search_console?.sites) ? googleAssets.search_console.sites : [];
  const googleGa4Options = flattenGa4PropertyOptions(googleAssets?.ga4?.account_summaries || []);
  const googleDriveOptions = flattenGoogleDriveOptions(googleAssets?.drive?.files || []);
  const googleCalendarOptions = flattenGoogleCalendarOptions(googleAssets?.calendar?.calendars || []);
  const googleGmailLabelOptions = flattenGoogleGmailLabelOptions(googleAssets?.gmail?.labels || []);
  const googleSourcePlan = deliveryGoogleSourceFlowPlan(draft, authority, {
    authorityReadyToResume,
    assetCounts: {
      gsc: googleSites.length,
      ga4: googleGa4Options.length,
      drive: googleDriveOptions.length,
      calendar: googleCalendarOptions.length,
      gmail: googleGmailLabelOptions.length
    }
  });
  return {
    googleSourcePlan,
    googleOptionsByGroup: {
      gsc: googleSites.map((site) => ({ value: String(site.siteUrl || ''), label: String(site.siteUrl || '') })),
      ga4: googleGa4Options,
      drive: googleDriveOptions,
      calendar: googleCalendarOptions,
      gmail: googleGmailLabelOptions
    }
  };
}

function genericDeliverableExecutionContext(run = null, deliverable = null, draft = {}, seed = null, authority = null, connectReady = true) {
  const executionStopped = Boolean(draft.executionStopped);
  const authorityBlocked = Boolean(authority && !authority.resolved);
  const authorityReadyToResume = Boolean(authority && authority.resolved);
  const googleSourceState = genericDeliverableGoogleSourceContext(draft, authority, authorityReadyToResume);
  const showReportExecutor = deliverable?.type === 'report_bundle'
    && ['execution_order', 'publish_followup'].includes(String(draft.nextStep || ''));
  const reportNeedsGoogleLoad = Boolean(showReportExecutor && googleSourceState.googleSourcePlan.needsLoad);
  const primaryActionDescriptors = Array.isArray(seed?.primaryActions) && seed.primaryActions.length
    ? seed.primaryActions
    : deliveryPrimaryActionDescriptors(deliverable?.type, draft, {
        authorityReadyToResume,
        reportNeedsGoogleLoad
      });
  return {
    repoDatalistId: `delivery-repo-options-${String(run?.id || '').replace(/[^a-z0-9_-]/gi, '-')}`,
    executorCommand: genericDeliverableExecutorCommand(run, deliverable, draft),
    executionStopped,
    authorityBlocked,
    authorityReadyToResume,
    reportNeedsGoogleLoad,
    primaryActionDescriptors,
    ...googleSourceState
  };
}

  function genericDeliverableRenderContext(run = null, deliverable = null) {
    const seed = state.deliveryExecutionSeeds?.[String(run?.id || '').trim()] || null;
    const meta = deliveryActionMeta(deliverable);
    const draft = genericDeliverableDraftForJob(run, deliverable) || {};
    const authority = genericDeliverableAuthorityState(run, draft);
    const connectorContext = genericDeliverableConnectorContext(deliverable, draft);
    const executionContext = genericDeliverableExecutionContext(
      run,
      deliverable,
      draft,
      seed,
      authority,
      connectorContext.connectReady
    );
    const fileInfo = deliverable?.fileName ? `<span>${escapeHtml(deliverable.fileName)}</span>` : '';
    const confidence = Number.isFinite(deliverable?.confidence) ? `Confidence ${Math.round(deliverable.confidence * 100)}%` : '';
    return {
      run,
      deliverable,
      seed,
      meta,
      draft,
      authority,
      ...connectorContext,
      fileInfo,
      confidence,
      ...executionContext
    };
  }

function renderGenericDeliverableActionRow(context = {}) {
  const approvalPreview = renderGenericDeliverableApprovalPreview(context);
  const primaryActionButtons = renderGenericDeliverablePrimaryActionButtons(context.run, context.primaryActionDescriptors, {
    executionStopped: context.executionStopped,
    authorityBlocked: context.authorityBlocked,
    connectReady: context.connectReady
  });
  const auxiliaryButtons = renderGenericDeliverableAuxiliaryButtons(context.run, context.deliverable, context.authority, {
    authorityBlocked: context.authorityBlocked,
    executionStopped: context.executionStopped,
    executorCommand: context.executorCommand,
    connectAction: context.connectAction,
    connectLabel: context.connectLabel,
    connectReady: context.connectReady,
    target: String(context.draft?.target || '')
  });
  return [
    approvalPreview,
    `<div class="helper-row"><button class="mini-btn" data-copy-generic-deliverable="${escapeHtml(context.run?.id)}">${escapeHtml(context.meta?.copyLabel || 'COPY')}</button><button class="mini-btn" data-prepare-generic-deliverable="${escapeHtml(context.run?.id)}">${escapeHtml(context.meta?.prepareLabel || 'DRAFT NEXT ORDER')}</button>${primaryActionButtons}${auxiliaryButtons}</div>`,
    '<div class="row-muted">Draft buttons only load the next order into CAIt Chat. Execution starts only after Send order.</div>'
  ].join('');
}

  function renderGenericDeliverableSection(section = {}, context = {}) {
    const kind = String(section?.kind || '').trim();
    if (!kind) return '';
    if (kind === 'intro') {
      return [
        `<div class="field-label">${escapeHtml(context.meta?.title || '')}</div>`,
        `<div class="muted">${escapeHtml(context.meta?.description || '')}</div>`,
        `<div class="publish-meta-line"><strong>${escapeHtml(context.deliverable?.title || 'Detected deliverable')}</strong><span>${escapeHtml(context.confidence)}</span>${context.fileInfo}</div>`
      ].join('');
    }
    if (kind === 'controls') {
      return renderGenericDeliverableControls(context.run, context.deliverable, context.draft, {
        isPlatformAdmin: context.isPlatformAdmin,
        scheduleLabel: genericDeliverableScheduleLabel(context.draft?.scheduledAt || ''),
        repoDatalistId: context.repoDatalistId,
        repoDatalistHtml: repoOptionsDatalist(context.run?.id),
        optionOverrides: context.seed?.controlOptions || {}
      });
    }
    if (kind === 'reason') {
      return `<div class="detail-box compact-card publish-preview-box">${escapeHtml(context.deliverable?.reason || deliveryUiText('genericReasonFallback'))}</div>`;
    }
    if (kind === 'authority') {
      return renderDeliveryAuthorityCard(context.run, context.deliverable, context.authority);
    }
    if (kind === 'google_sources') {
      return renderGoogleSourceControls(context.run, context.draft, context.authority, context.googleSourcePlan, context.googleOptionsByGroup);
    }
    if (kind === 'stopped') {
      return context.executionStopped
        ? `<div class="detail-box compact-card warn">${escapeHtml(deliveryUiText('executionStoppedNotice'))}</div>`
        : '';
    }
    if (kind === 'actions') {
      return renderGenericDeliverableActionRow(context);
    }
    return '';
  }

function deliveryCardBodyLines(run = null, report = {}, options = {}) {
  const summaryText = String(options.summaryText || '').trim();
  const workflowChildren = Array.isArray(options.workflowChildren) ? options.workflowChildren : [];
  const fileCount = Number(options.fileCount || 0);
  const authority = authorityRequestFromReport(report || {});
  const status = normalizeOrderProgressStatus(run?.status || '');
  const workflowApprovalBlocked = status === 'blocked' || (run?.jobKind === 'workflow' && authorityRequestRequiresClientApproval(authority));
  const heading = workflowApprovalBlocked
    ? 'TEAM ACTION WAITING FOR APPROVAL'
    : (run?.jobKind === 'workflow' ? 'TEAM DELIVERY SUMMARY' : 'DELIVERY SUMMARY');
  const lines = [
    heading,
    '',
    summaryText || (run?.jobKind === 'workflow'
      ? 'The integrated report merged the supporting work products into one delivery.'
      : 'Structured delivery received.')
  ];
  if (workflowApprovalBlocked) {
    lines.push('');
    lines.push(`Action status: approval or connector setup required before external posting/sending.`);
    if (authority?.reason) lines.push(`Reason: ${authority.reason}`);
    lines.push(`Required: ${describeAuthorityNeed(authority?.missingConnectorCapabilities || [], authority?.missingConnectors || [])}.`);
  }
  lines.push('');
  lines.push(`Status: ${String(orderProgressStatusLabel(status || 'unknown') || 'unknown').toUpperCase()}`);
  if (run?.id) lines.push(`Order ID: ${run.id}`);
  if (run?.jobKind === 'workflow' && workflowChildren.length) lines.push(`Supporting work items: ${workflowChildren.length}`);
  lines.push(`Delivery files: ${fileCount}`);
  lines.push('Re-ordering or adding context: continue in CAIt Chat.');
  return [
    ...lines
  ];
}

function renderDeliveryActionToolbar(run = null, options = {}) {
  const actions = [];
  if (options.summaryText) {
    actions.push('<button class="mini-btn" data-copy-delivery-summary="1">COPY SUMMARY</button>');
    actions.push('<button class="mini-btn" data-download-delivery-summary="1">DOWNLOAD SUMMARY</button>');
  }
  const downloadableFiles = Array.isArray(options.files)
    ? options.files.filter((file) => String(file?.content || '').trim())
    : [];
  if (downloadableFiles.length) {
    actions.push('<button class="mini-btn" data-download-delivery-zip="1">DOWNLOAD ZIP</button>');
  }
  if (Number(options.fileCount || 0) === 1 && options.files?.[0]?.content) {
    actions.push('<button class="mini-btn" data-copy-delivery-file="0">COPY FILE</button>');
    actions.push('<button class="mini-btn" data-download-delivery-file="0">DOWNLOAD FILE</button>');
  }
  if (options.workflowParent?.id) {
    actions.push('<button class="mini-btn" data-open-workflow-parent="1">OPEN TEAM SUMMARY</button>');
  }
  return actions.length ? `<div class="helper-row">${actions.join('')}</div>` : '';
}

function deliverySummaryTone(run = null, report = {}) {
  const status = normalizeOrderProgressStatus(run?.status || '');
  if (status === 'failed' || status === 'timed_out') return 'error';
  if (status === 'blocked' || authorityRequestRequiresClientApproval(authorityRequestFromReport(report || {}))) return 'warn';
  if (status === 'completed') return 'ok';
  return 'info';
}

function renderDeliverySummaryCard(run = null, report = {}, options = {}) {
  const summaryText = String(options.summaryText || '').trim();
  const actions = [];
  if (summaryText) {
    actions.push('<button class="mini-btn" data-copy-delivery-summary="1">COPY SUMMARY</button>');
    actions.push('<button class="mini-btn" data-download-delivery-summary="1">DOWNLOAD SUMMARY</button>');
  }
  actions.push('<button class="mini-btn" data-chat-action="open_work_tab">ADD CONTEXT IN CHAT</button>');
  return [
    `<div class="delivery-summary-text">${escapeHtml(summaryText || 'No summary returned yet.')}</div>`,
    `<div class="helper-row delivery-summary-actions">${actions.join('')}</div>`
  ].join('');
}

function renderWorkflowTeamSummary(workflowChildren = []) {
  if (!Array.isArray(workflowChildren) || !workflowChildren.length) return '';
  const leaderItems = workflowChildren
    .filter((child) => /(^|_)(leader)$/.test(String(child.taskType || '').trim().toLowerCase()))
    .sort((left, right) => {
      const phaseRank = (value) => {
        const phase = String(value?.sequencePhase || '').trim().toLowerCase();
        if (phase === 'final_summary') return 3;
        if (phase === 'checkpoint') return 2;
        if (phase === 'initial') return 1;
        return 0;
      };
      const leftRank = phaseRank(left);
      const rightRank = phaseRank(right);
      if (leftRank !== rightRank) return rightRank - leftRank;
      const leftCompleted = String(left?.completedAt || '').trim();
      const rightCompleted = String(right?.completedAt || '').trim();
      const completedCompare = rightCompleted.localeCompare(leftCompleted);
      if (completedCompare) return completedCompare;
      return String(right?.id || '').localeCompare(String(left?.id || ''));
    });
  const visibleLeader = leaderItems[0] || null;
  const visibleChildren = workflowChildren.filter((child) => {
    const isLeader = /(^|_)(leader)$/.test(String(child.taskType || '').trim().toLowerCase());
    if (!isLeader) return true;
    if (!visibleLeader) return true;
    return child === visibleLeader;
  });
  const summaryTextForChild = (child = {}) => {
    const summary = String(child.summary || child.failureReason || '').trim();
    if (summary) return summary;
    const status = String(child.status || '').trim().toLowerCase();
    if (status === 'blocked') return 'Waiting for the earlier research or action phase to finish.';
    if (['queued', 'created'].includes(status)) return 'Queued. Specialist summary will appear after the run starts.';
    if (['claimed', 'running', 'dispatched'].includes(status)) return 'In progress. Summary will update after the run returns.';
    return 'No specialist summary returned yet.';
  };
  return `
      <details class="delivery-team-group" open>
        <summary>INTEGRATED REPORT</summary>
        <div class="delivery-team-note">Start here. This merged delivery is the default report. Open individual research, writing, or execution items only when you want supporting detail.</div>
        <div class="delivery-team-list">
          ${visibleChildren.map((child, index) => `
            <div class="delivery-team-item">
              <div>
                <strong>${escapeHtml(`${index + 1}. ${workflowChildDisplayName(child)}`)}</strong>
                ${child.sequencePhase ? `<div class="row-muted">${escapeHtml(`PHASE ${String(child.sequencePhase || '').toUpperCase()}`)}</div>` : ''}
                <div class="row-muted">${escapeHtml(String(orderProgressStatusLabel(child.status || 'unknown') || 'unknown').toUpperCase())}</div>
                <div>${escapeHtml(summaryTextForChild(child))}</div>
              </div>
              <div class="helper-row">
                ${child.id ? `<button class="mini-btn" data-open-child-run="${escapeHtml(child.id)}">OPEN DETAIL</button>` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </details>
    `;
}

function renderWorkflowChildNote(workflowParent = null) {
  if (!workflowParent?.id) return '';
  return `
      <div class="detail-box action-card info compact-card delivery-team-note">
        This run is one supporting work item inside an Agent Team. Open the integrated report first, then return here if you want the underlying research, writing, or execution detail.
      </div>
    `;
}

function renderDeliveryFileList(files = []) {
  if (!Array.isArray(files) || !files.length) return '';
  return files.map((file, index) => {
    const displayTitle = deliveryFileDisplayTitle(file, `file-${index + 1}`);
    const meta = deliveryFileProvenanceParts(file).join(' · ');
    return `
      <div class="delivery-file">
        <div>
          <strong>${escapeHtml(displayTitle)}</strong>
          <div class="row-muted">${escapeHtml(file.name || `file-${index + 1}`)} · ${escapeHtml(file.type || 'text/plain')} · ${String(file.content || '').length} chars</div>
          ${meta ? `<div class="row-muted">${escapeHtml(meta)}</div>` : ''}
        </div>
        <div class="helper-row">
          <button class="mini-btn" data-copy-delivery-file="${index}">COPY</button>
          <button class="mini-btn" data-download-delivery-file="${index}">DOWNLOAD</button>
        </div>
      </div>
    `;
  }).join('');
}

function renderDeliveryFilesPanel(files = [], options = {}) {
  const safeFiles = visibleDeliveryFiles(files);
  const downloadableFiles = safeFiles.filter((file) => String(file?.content || '').trim());
  if (!safeFiles.length) {
    return `
      <div class="detail-box action-card info compact-card delivery-files-panel">
        <div class="delivery-files-head">
          <div>
            <strong>DELIVERY FILES</strong>
            <div class="row-muted">No delivery files were returned for this order.</div>
          </div>
        </div>
      </div>
    `;
  }
  return `
      <div class="detail-box action-card info compact-card delivery-files-panel">
        <div class="delivery-files-head">
          <div>
            <strong>DELIVERY FILES</strong>
            <div class="row-muted">${safeFiles.length} file${safeFiles.length === 1 ? '' : 's'} · summary and full artifacts stay separate</div>
          </div>
          <div class="helper-row">
            ${downloadableFiles.length ? '<button class="mini-btn" data-download-delivery-zip="1">DOWNLOAD ZIP</button>' : ''}
          </div>
        </div>
        ${renderDeliveryFileList(safeFiles)}
      </div>
    `;
}

function deliveryEmptyStatePresentation(run = null, delivery = null, report = null, files = []) {
  const normalizedFiles = Array.isArray(files) ? files : [];
  if (!run && !delivery) {
    return {
      tone: 'info',
      text: 'No delivery yet. Completed orders will show copy and download actions here.'
    };
  }
  if (run && run.status !== 'completed' && !report && !normalizedFiles.length) {
    return {
      tone: 'warn',
      text: `No delivery yet.\n\nCurrent status: ${String(run.status || 'unknown').toUpperCase()}. Delivery actions appear after completion.`
    };
  }
  if (run && ['failed', 'timed_out'].includes(run.status) && !report && !normalizedFiles.length) {
    return {
      tone: 'error',
      text: `No delivery.\n\nThe order ended as ${String(run.status).toUpperCase()}. Inspect failure details before retrying.`
    };
  }
  return null;
}

function deliveryRenderContextFromValue(value) {
  const { run, delivery } = deliveryStateFromValue(value);
  const report = delivery?.report || null;
  const files = visibleDeliveryFiles(delivery?.files);
  const workflowChildren = workflowChildRunsFromDelivery(run, report || {});
  const workflowParent = run?.workflowParentId ? jobById(run.workflowParentId) : null;
  const summaryText = deliverySummaryText(report || {});
  const cachedPublishClassification = run?.id ? state.deliveryPublishClassifications?.[run.id] : null;
  const candidates = resolveDeliveryCandidates(run, report || {}, files, cachedPublishClassification);
  const actualBilling = run?.actualBilling && typeof run.actualBilling === 'object' ? run.actualBilling : null;
  const costTelemetry = actualBilling?.costTelemetry && typeof actualBilling.costTelemetry === 'object' ? actualBilling.costTelemetry : null;
  const deliveryCompletionGate = run?.deliveryCompletionGate && typeof run.deliveryCompletionGate === 'object' ? run.deliveryCompletionGate : null;
  const fundingLines = fundingBreakdownLines(run);
  const inputSources = inputSourcesFromJob(run || {});
  const fileCount = files.length;
  const targets = Array.isArray(delivery?.returnTargets) && delivery.returnTargets.length
    ? delivery.returnTargets.join(', ')
    : 'chat, api';
  return {
    run,
    delivery,
    report,
    files,
    workflowChildren,
    workflowParent,
    summaryText,
    cachedPublishClassification,
    genericDeliverable: candidates.genericDeliverable,
    article: candidates.article,
    actualBilling,
    costTelemetry,
    deliveryCompletionGate,
    fundingLines,
    inputSources,
    fileCount,
    targets
  };
}

function resolveDeliveryCandidates(run = null, report = {}, files = [], cachedPublishClassification = null) {
  const explicitDeliverable = genericDeliverableFromExplicitFiles(report, files);
  return {
    genericDeliverable: explicitDeliverable || genericDeliverableFromClassification(run, cachedPublishClassification),
    article: articleCandidateFromDelivery(run, report || {}, files)
  };
}

function maybeClassifyDeliveryCandidates(run = null, report = {}, files = [], candidates = {}, cachedPublishClassification = null) {
  return;
}

function hideDeliveryFollowupPanel() {
  setElementVisible(els.followupPanel, false);
}

function renderDeliveryFollowupPanel(run = null, report = {}) {
  if (!els.followupPanel || !els.followupPromptCard) return;
  const questions = clarifyingQuestionsFromReport(report || {});
  const nextAction = String(report?.nextAction || report?.next_action || '').trim();
  const canFollowUp = Boolean(run?.id && run.status === 'completed' && run.jobKind !== 'workflow');
  if (!canFollowUp) {
    hideDeliveryFollowupPanel();
    return;
  }
  const lines = [
    `Continue from order: ${run.id.slice(0, 8)}`,
    run.assignedAgentId ? `Same agent: ${run.assignedAgentId}` : 'Same agent: unavailable for this delivery',
    questions.length ? 'The agent asked:' : 'No explicit questions were returned, but you can request a revision or add missing details.',
    ...questions.map((question, index) => `${index + 1}. ${question}`),
    ...(nextAction ? ['', `Next action: ${nextAction}`] : []),
    '',
    'Answer below to send a direct follow-up to the same agent. The previous prompt, delivery summary, files, and questions are carried into the next order.'
  ];
  els.followupPromptCard.textContent = lines.join('\n');
  els.followupPanel.className = 'detail-box action-card info compact-card';
  setElementVisible(els.followupPanel, true);
}

async function directFollowupDraftFromDelivery() {
  const job = selectedJob();
  if (!job?.id) throw new Error('Select a completed order first.');
  if (job.status !== 'completed') throw new Error('Follow-up orders can be sent after a delivery is completed.');
  const agentId = String(job.assignedAgentId || '').trim();
  if (!agentId) {
    throw new Error('This delivery has no direct assigned agent. Open it in CAIt Chat and route the follow-up manually.');
  }
  const answer = String(els.followupAnswer?.value || '').trim();
  const prepared = await api('/api/deliveries/prepare-followup-order', {
    method: 'POST',
    body: JSON.stringify({
      job_id: String(job.id || ''),
      answer,
      direct: true
    })
  });
  return {
    parent_agent_id: String(prepared?.parent_agent_id || job.parentAgentId || 'cloudcode-main'),
    order_strategy: String(prepared?.order_strategy || 'single'),
    task_type: String(prepared?.task_type || job.taskType || 'research'),
    agent_id: String(prepared?.agent_id || agentId),
    prompt: String(prepared?.prompt || '').trim(),
    budget_cap: Number(els.jobBudget?.value || 300),
    deadline_sec: Number(els.jobDeadline?.value || 120),
    followup_to_job_id: String(prepared?.followup_to_job_id || job.id),
    skip_intake: prepared?.skip_intake !== false,
    input: prepared?.input && typeof prepared.input === 'object' ? prepared.input : {}
  };
}

async function sendFollowupToAgentFromDelivery() {
  const draft = await directFollowupDraftFromDelivery();
  const analyticsDraft = summarizeOrderDraftForAnalytics(draft, 'delivery_followup_direct');
  let created;
  try {
    validateOrderDraft(draft, { checkAccess: true, checkFunding: false });
  } catch (error) {
    if (handleOrderPreflightPrompt(error, draft, { analytics: analyticsDraft, source: 'delivery_followup_validation' })) return;
    throw error;
  }
  const followupSessionId = ensureCurrentOpenChatSessionId({ force: true });
  const payload = {
    ...apiPayloadFromOrderDraftWithChatSession(draft, followupSessionId),
    visitor_id: visitorId(),
    async_dispatch: true
  };
  try {
    created = await api('/api/jobs', { method: 'POST', body: JSON.stringify(payload) });
  } catch (error) {
    if (handleOrderPreflightPrompt(error, draft, { analytics: analyticsDraft, source: 'delivery_followup_api' })) return;
    if (/payment|required|deposit|funding/i.test(String(error?.message || ''))) {
      void trackConversionEvent('payment_required_shown', { ...analyticsDraft, status: 'blocked' });
      if (handleOrderFundingPrompt(error, draft, { analytics: analyticsDraft, source: 'delivery_followup' })) return;
      openSettingsSection('payments');
    }
    throw error;
  }
  if (chatEngineIsNeedsInputResponse(created)) {
    handleNeedsInputResponse(created, draft);
    return;
  }
  const createdOrderId = createdOrderPrimaryId(created);
  const createdOrderStatus = normalizeOrderProgressStatus(created?.status || 'created');
  const createdOrderJa = looksJapanese(payload.prompt);
  const agentLabel = draft.agent_id || created?.matched_agent_id || 'same agent';
  revealCreatedOrderInHistory(created, payload);
  const createdOrderBody = [
    createdOrderJa ? '前回納品へのフォローアップを同じAgentに送りました。' : 'Follow-up sent directly to the same agent.',
    '',
    `Order ID: ${createdOrderId || 'unknown'}`,
    createdOrderJa ? `接続先: ${agentLabel}` : `Agent: ${agentLabel}`,
    createdOrderJa ? `前回納品: ${String(draft.followup_to_job_id || '').slice(0, 8)}` : `Previous delivery: ${String(draft.followup_to_job_id || '').slice(0, 8)}`,
    createdOrderJa ? `状態: ${createdOrderStatus}` : `Status: ${createdOrderStatus}`,
    '',
    createdOrderJa ? '完了したらDeliveryに追加納品が表示されます。' : 'When it finishes, the refined delivery appears in Delivery.'
  ].filter(Boolean).join('\n');
  void trackConversionEvent('order_created', {
    ...analyticsDraft,
    mode: created.mode || 'run',
    status: createdOrderStatus,
    source: 'delivery_followup_direct'
  });
  if (createdOrderId) {
    markCurrentOpenChatSessionLinkedOrder(createdOrderId, { status: createdOrderStatus });
    upsertOpenChatOrderProgressMessage(createdOrderId, createdOrderBody, {
      status: createdOrderStatus,
      tone: orderProgressTone(createdOrderStatus),
      ja: createdOrderJa,
      progressMeta: orderProgressMeta(created, { status: createdOrderStatus })
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
    source: 'delivery_followup_direct'
  });
  state.selectedJobId = createdOrderId || state.selectedJobId;
  if (created.matched_agent_id) state.selectedAgentId = created.matched_agent_id;
  state.workFlowMode = '';
  state.workFlowShowList = true;
  state.workFlowLastCreatedJobId = createdOrderId || null;
  clearFollowupContext({ keepAnswer: false });
  if (createdOrderId) {
    startOpenChatOrderProgressPolling(createdOrderId, {
      status: createdOrderStatus,
      ja: createdOrderJa,
      immediate: true
    });
    window.requestAnimationFrame(() => focusWorkResults());
  }
  flash(createdOrderId
    ? `Follow-up ${createdOrderId.slice(0, 8)} sent to ${agentLabel}.`
    : `Follow-up sent to ${agentLabel}.`, orderProgressTone(createdOrderStatus));
  await refresh();
  if (created.async_dispatch || created.dispatch_status === 'scheduled') {
    window.setTimeout(() => { void refresh(); }, 5000);
  }
}

async function prepareFollowupOrderFromDelivery() {
  try {
    const job = selectedJob();
    if (!job?.id) throw new Error('Select a completed order first.');
    if (job.status !== 'completed') throw new Error('Follow-up orders can be prepared after a delivery is completed.');
    const answer = String(els.followupAnswer?.value || '').trim();
    const prepared = await api('/api/deliveries/prepare-followup-order', {
      method: 'POST',
      body: JSON.stringify({
        job_id: String(job.id || ''),
        answer
      })
    });
    loadOrderDraftIntoComposer({
      followupToJobId: String(prepared?.followup_to_job_id || job.id || ''),
      taskType: String(prepared?.task_type || job.taskType || 'research'),
      agentId: String(prepared?.agent_id || ''),
      prompt: String(prepared?.prompt || '').trim(),
      budgetCap: Number(job?.budgetCap ?? 300),
      deadlineSec: Number(job?.deadlineSec ?? 120),
      orderStrategy: String(prepared?.order_strategy || 'single')
    });
    flash('Follow-up opened in CAIt Chat. Review it, then SEND ORDER when ready.', 'info');
    return prepared;
  } catch (error) {
    flash(String(error?.message || 'Could not prepare follow-up order.'), 'warn');
    return null;
  }
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

function renderRunHealth(stats = {}) {
  if (!els.runHealthSummary) return;
  const nextRetry = stats.nextRetryAt ? new Date(stats.nextRetryAt).toLocaleString('ja-JP') : '-';
  els.runHealthSummary.textContent = [
    `activeRuns: ${stats.activeJobs ?? 0}`,
    `retryableRuns: ${stats.retryableRuns ?? 0}`,
    `timedOutRuns: ${stats.timedOutRuns ?? 0}`,
    `terminalRuns: ${stats.terminalRuns ?? 0}`,
    `nextRetryAt: ${nextRetry}`,
    `failedRuns: ${stats.failedJobs ?? 0}`
  ].join('\n');
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

function renderStream(events = []) {
  if (!els.stream) return;
  const q = (state.eventFilter || '').trim().toLowerCase();
  const loggedIn = Boolean(state.snapshot?.auth?.loggedIn);
  const publicEvents = loggedIn
    ? events
    : events.filter((event) => !['FAILED', 'FAIL', 'ERROR', 'TIMEOUT', 'TIMED_OUT'].includes(String(event.type || '').toUpperCase()));
  const filtered = !q ? publicEvents : publicEvents.filter((event) => `${event.type} ${event.message}`.toLowerCase().includes(q));
  els.stream.innerHTML = '';
  if (!filtered.length) {
    els.stream.innerHTML = '<div class="empty">No public activity yet.</div>';
    return;
  }
  filtered.slice(-8).reverse().forEach((event) => {
    const row = document.createElement('div');
    row.className = 'log-line';
    const costText = event.meta?.settlement?.total ? ` · ${yen(event.meta.settlement.total)}` : event.meta?.billable?.totalCostBasis ? ` · basis ${yen(event.meta.billable.totalCostBasis)}` : '';
    const safeType = safeCssToken(event.type, 'info');
    row.innerHTML = `<span class="ts">${escapeHtml(new Date(event.ts).toLocaleTimeString('ja-JP'))}</span><span class="type-${safeType}">[${escapeHtml(event.type)}]</span> ${escapeHtml(event.message)}${escapeHtml(costText)}`;
    row.onclick = () => setDetail(event);
    els.stream.appendChild(row);
  });
}

function renderAgentTaskFilter(agents = []) {
  if (!els.agentTaskFilter) return;
  const previous = state.agentTaskFilter || '';
  const taskTypes = [...new Set(agents.flatMap((agent) => agent.taskTypes || []))].sort();
  els.agentTaskFilter.innerHTML = '';
  const allOption = document.createElement('option');
  allOption.value = '';
  allOption.textContent = 'all capabilities';
  els.agentTaskFilter.appendChild(allOption);
  taskTypes.forEach((taskType) => {
    const option = document.createElement('option');
    option.value = String(taskType || '');
    option.textContent = String(taskType || '');
    els.agentTaskFilter.appendChild(option);
  });
  els.agentTaskFilter.value = taskTypes.includes(previous) ? previous : '';
  state.agentTaskFilter = els.agentTaskFilter.value || '';
}

function applyAgentQuickFilter(mode) {
  if (!els.agentSearch || !els.agentStatusFilter || !els.agentAvailabilityFilter || !els.agentActionFilter || !els.agentTaskFilter) return;
  const routingTask = currentRoutingTask();
  if (mode === 'ready') {
    els.agentSearch.value = routingTask ? `fit:match task:${routingTask}` : '';
    els.agentStatusFilter.value = 'ready';
    els.agentAvailabilityFilter.value = 'online';
    els.agentActionFilter.value = 'dispatch';
    els.agentTaskFilter.value = routingTask || '';
  } else if (mode === 'verify-failures') {
    els.agentSearch.value = 'verify:failed';
    els.agentStatusFilter.value = 'unverified';
    els.agentAvailabilityFilter.value = '';
    els.agentActionFilter.value = 'verify';
    els.agentTaskFilter.value = '';
  } else if (mode === 'missing-endpoint') {
    els.agentSearch.value = 'endpoint:missing';
    els.agentStatusFilter.value = 'verified';
    els.agentAvailabilityFilter.value = '';
    els.agentActionFilter.value = 'endpoint';
    els.agentTaskFilter.value = '';
  } else if (mode === 'task-mismatch') {
    els.agentSearch.value = routingTask ? `fit:mismatch task:${routingTask}` : 'fit:mismatch';
    els.agentStatusFilter.value = 'ready';
    els.agentAvailabilityFilter.value = 'online';
    els.agentActionFilter.value = '';
    els.agentTaskFilter.value = '';
  }
  state.agentSearch = els.agentSearch.value || '';
  if (state.snapshot) renderAgents(state.snapshot.agents || []);
}

function renderAgentOps(agents = []) {
  const verified = agents.filter((agent) => agentHealth(agent).verified);
  const ready = agents.filter((agent) => agentHealth(agent).ready);
  const verifyFailed = agents.filter((agent) => agentHealth(agent).label === 'VERIFY FAIL');
  const degraded = agents.filter((agent) => agentHealth(agent).tone !== 'ok');
  const offline = agents.filter((agent) => !agent.online);
  const noEndpoint = agents.filter((agent) => agentHealth(agent).verified && !agentHealth(agent).endpoint);
  const capabilityCoverage = new Set(agents.flatMap((agent) => agent.taskTypes || [])).size;
  const routingTask = currentRoutingTask();
  const taskReady = ready.filter((agent) => agentTaskFit(agent, routingTask).matches);
  safeText(els.verifiedAgents, verified.length);
  safeText(els.readyAgents, ready.length);
  safeText(els.verifyFailedAgents, verifyFailed.length);
  safeText(els.missingEndpointAgents, noEndpoint.length);
  safeText(els.offlineAgents, offline.length);
  safeText(els.agentCoverage, capabilityCoverage);
  if (els.agentRoutingCoverage) {
    els.agentRoutingCoverage.textContent = `${agents.length} agents total · ${ready.length} ready · ${taskReady.length} match the current task`;
  }
  if (!els.agentOpsBoard) return;
  const list = taskReady.slice(0, 4).map((agent) => `${agent.name} · ${(agent.taskTypes || []).join('/')} · ${yen(estimateWindowOfAgent(agent, routingTask || agent.taskTypes?.[0])?.typicalTotal || 0)}`).join('\n') || '-';
  const mismatchList = ready.filter((agent) => !agentTaskFit(agent, routingTask).matches).slice(0, 4).map((agent) => `${agent.name}: ${(agent.taskTypes || []).join('/') || 'no declared capability'}`).join('\n') || '-';
  els.agentOpsBoard.textContent = [
    `connected_agents: ${agents.length}`,
    `verified: ${verified.length}`,
    `ready_now: ${ready.length}`,
    `needs_attention: ${degraded.length}`,
    `offline: ${offline.length}`,
    `routing_task: ${routingTask || '-'}`,
    '',
    'best current dispatch candidates:',
    list,
    '',
    'task_mismatch_examples:',
    mismatchList
  ].join('\n');
}

function flexibleToolPromptText(prompt = '', input = orderInputFromComposer()) {
  const urls = Array.isArray(input?.urls) ? input.urls.join('\n') : '';
  const fileNames = Array.isArray(input?.files) ? input.files.map((file) => file?.name || '').join('\n') : '';
  return [prompt, urls, fileNames].filter(Boolean).join('\n');
}

function flexibleToolCandidates(prompt = String(els.jobPrompt?.value || ''), input = orderInputFromComposer()) {
  const rawPrompt = String(prompt || '').trim();
  const text = flexibleToolPromptText(rawPrompt, input);
  const compact = text.replace(/\s+/g, ' ').trim();
  const counts = orderInputCounts(input);
  if (!compact && !counts.urlCount && !counts.fileCount) return [];
  if (openChatLooksGreetingPrompt(rawPrompt) || openChatLooksLowInfoTestPrompt(rawPrompt)) return [];

  const candidates = [];
  const add = (tool) => {
    if (!tool?.id || candidates.some((item) => item.id === tool.id)) return;
    candidates.push({
      tone: 'info',
      priority: 10,
      requirements: '',
      actions: [],
      ...tool
    });
  };

  if (/(?:ignore previous|system prompt|developer message|hidden instruction|prompt injection|jailbreak|leak|exfiltrate|dump).{0,90}(?:secret|api key|token|prompt|instruction|tool)|(?:api key|apiキー|apikey|secret|client secret|token|oauth|credential|シークレット|トークン|認証情報|資格情報|プロンプトインジェクション)/i.test(compact)) {
    add({
      id: 'secure_access',
      title: 'Secure access handoff',
      tone: 'warn',
      priority: 95,
      body: 'This looks like it may need credentials, OAuth, or secret-handling rules. Do not paste production secrets into chat. CAIt should turn access into a prerequisite before any agent runs.',
      requirements: 'Preferred: OAuth connector or provider-owned secret. If a raw API key is unavoidable, keep it out of delivery text and store it as setup data.',
      actions: [
        { action: 'open_api_keys', label: 'OPEN API KEYS' },
        { action: 'open_connect', label: 'CLI / API' },
        { action: 'add_secure_requirement', label: 'ADD SAFE REQUIREMENT' }
      ]
    });
  }

  if (/(?:\b(?:github|git hub|repo|repository|pull request|pr|branch|commit|diff|sandbox|code review)\b|コードレビュー|リポジトリ|プルリク|ブランチ|コミット|差分|サンドボックス)/i.test(compact)) {
    add({
      id: 'github_work',
      title: 'GitHub work mode',
      tone: 'ok',
      priority: 80,
      body: 'Repo-changing work should be handled through GitHub connection, a sandbox branch, and a pull request handoff instead of free-form chat.',
      requirements: 'Need: GitHub login/link, target repo, intended branch, allowed change scope, and tests or acceptance criteria.',
      actions: [
        { action: 'connect_github', label: connectorActionLabel('connect_github') },
        { action: 'open_agents_github', label: 'LIST AGENT FLOW' },
        { action: 'add_pr_handoff', label: 'ADD PR HANDOFF' }
      ]
    });
  }

  if (/(?:x\.com|\btwitter\b|\btweet(?:s|ing)?\b|\bx post\b|\bx thread\b|social post|ツイート|X投稿|ポスト|スレッド|返信投稿|sns投稿|ＳＮＳ投稿)/i.test(compact)
    || /(?:^|[\s　])x(?:[\s　]|で|に|へ|投稿|返信|dm|DM)/i.test(compact)) {
    add({
      id: 'x_social',
      title: 'Social publishing handoff',
      tone: 'info',
      priority: 76,
      body: 'This looks like social publishing work. CAIt should collect the goal and source material, then route the order to an agent/provider contract that can return a SaaS-ready handoff packet.',
      requirements: 'Need: target channel, audience, tone, source material, approval owner, and whether the final delivery should be a draft, schedule packet, or app handoff.',
      actions: [
        { action: 'use_agent_team', label: 'AGENT TEAM' },
        { action: 'browse_agents', label: 'BROWSE AGENTS' },
        { action: 'add_social_handoff_rule', label: 'ADD HANDOFF RULE' }
      ]
    });
  }

  if (isExplicitClientLeaderTask(currentRoutingTask(), compact)
    || /(agent team|leader agent|team leader|複数エージェント|チームリーダー|まとめて.*(?:告知|投稿|分析)|一括.*(?:告知|投稿|分析)|責任者|部長|リーダー)/i.test(compact)) {
    add({
      id: 'agent_team',
      title: 'Agent Team planner',
      tone: 'ok',
      priority: 74,
      body: 'This may be better as one input coordinated by a Team Leader, then split across specialist agents.',
      requirements: 'Need: final outcome, departments or channels, priority order, budget sensitivity, and whether outputs should be merged into one delivery.',
      actions: [
        { action: 'use_agent_team', label: 'USE AGENT TEAM' },
        { action: 'browse_agents', label: 'BROWSE LEADERS' },
        { action: WORK_ACTION_IDS.OPEN_ORDER_SETTINGS, label: 'ORDER SETTINGS' }
      ]
    });
  }

  const marketingTimeline = marketingTimelineSnapshot(null, { maxRecentRuns: 4, maxScheduleItems: 2 });
  if (marketingTimeline.items.length && (marketingTimelineIntentText(compact) || marketingTimeline.items.some((item) => item.focused))) {
    add({
      id: 'marketing_timeline',
      title: 'Saved schedule timeline',
      tone: 'info',
      priority: 73,
      body: 'Stored agent history is available. You can inspect completed deliveries, see upcoming scheduled actions, and continue them from Chat history, Deliveries, or Campaign Operations.',
      requirements: `${marketingTimeline.marketingRuns.length} stored run(s) · ${marketingTimeline.marketingSchedules.length} scheduled action(s) from jobs and recurring orders in DB.`,
      actions: [
        { action: WORK_ACTION_IDS.OPEN_MARKETING_TIMELINE, label: 'OPEN TIMELINE' },
        ...(marketingTimeline.marketingSchedules.length ? [{ action: 'open_scheduled_work', label: 'OPEN SCHEDULE' }] : []),
        { action: WORK_ACTION_IDS.OPEN_ORDER_SETTINGS, label: 'ORDER SETTINGS' }
      ]
    });
  }

  if (/(?:schedule|scheduled|recurring|cron|daily|weekly|hourly|monitor|watch|定期|毎日|毎週|毎時|監視|巡回|くろん|クロン)/i.test(compact)) {
    add({
      id: 'scheduled_work',
      title: 'Scheduled Work',
      tone: 'info',
      priority: 70,
      body: 'This looks like work that may need to run repeatedly. Keep the chat brief as the task definition, then manage timing from Scheduled Work.',
      requirements: 'Need: repeat interval, time zone, stop condition, failure notification rule, and what should change between runs.',
      actions: [
        { action: 'open_scheduled_work', label: 'OPEN SCHEDULE' },
        { action: 'add_schedule_rule', label: 'ADD SCHEDULE RULE' }
      ]
    });
  }

  if (counts.urlCount || counts.fileCount || /(?:https?:\/\/|source url|source file|attach|attachment|csv|pdf|markdown|添付|ファイル|URL|ソース|資料|データ)/i.test(compact)) {
    add({
      id: 'sources',
      title: 'Source material',
      tone: 'info',
      priority: 62,
      body: 'This work depends on source material. Keep large files and URLs in Order Settings so the chat stays readable and the order records the input cleanly.',
      requirements: `Current sources: ${counts.urlCount} URL(s), ${counts.fileCount} file(s). Add only source material that the agent should rely on.`,
      actions: [
        { action: 'open_sources', label: 'ADD SOURCES' },
        { action: 'add_source_rule', label: 'ADD SOURCE RULE' }
      ]
    });
  }

  if (/(?:payment|billing|deposit|balance|stripe|checkout|plan|refund|payout|withdraw|課金|支払い|決済|デポジット|残高|返金|出金|受け取り|請求)/i.test(compact)) {
    add({
      id: 'payments',
      title: 'Payment / payout setup',
      tone: 'warn',
      priority: 58,
      body: TEMPORARY_INVOICE_BILLING_ENABLED
        ? 'This looks related to buyer balance, billing, provider payouts, or payment setup. CAIt should route you to the right settings section. Hosted checkout is temporarily hidden, so invoices/manual handling are used for now.'
        : 'This looks related to buyer balance, billing, provider payouts, or payment setup. CAIt should route you to the right settings section instead of burying payment state in chat.',
      requirements: TEMPORARY_INVOICE_BILLING_ENABLED
        ? 'Buyer side: request invoice/manual payment. Provider side: earnings stay tracked; manual payout follow-up is temporary.'
        : 'Buyer side: month-end billing and card registration. Provider side: provider profile before withdrawal handling.',
      actions: [
        { action: 'open_payments', label: 'PAYMENTS' },
        { action: 'open_provider', label: 'PROVIDER' },
        { action: 'register_card', label: 'REGISTER CARD' }
      ]
    });
  }

  if (/(?:list my agent|publish agent|register agent|agent manifest|skill\.md|verify agent|adapter pr|エージェント登録|agent登録|マニフェスト|ベリファイ|公開したい|稼ぎたい)/i.test(compact)) {
    add({
      id: 'agent_listing',
      title: 'Agent listing flow',
      tone: 'ok',
      priority: 84,
      body: 'This is provider-side work. CAIt should move this into the guided agent listing flow instead of treating it as a buyer order.',
      requirements: 'Need: capability summary, manifest or repo, endpoint/adapter path, pricing markup, and verification readiness.',
      actions: [
        { action: 'list_agent', label: 'LIST YOUR AGENT' },
        { action: 'connect_github', label: connectorActionLabel('connect_github') },
        { action: 'add_agent_listing_rule', label: 'ADD LISTING RULE' }
      ]
    });
  }

  if (/(?:bug|broken|issue|feedback|report|改善要望|不具合|バグ|問い合わせ|報告|動かない|壊れて)/i.test(compact)) {
    add({
      id: 'feedback',
      title: 'Feedback / bug report',
      tone: 'info',
      priority: 50,
      body: 'This looks like a product issue or feedback item. Use the report form when you want it saved for review; keep chat for quick clarification.',
      requirements: 'Best report: what happened, expected behavior, page name, account state, and reproduction steps.',
      actions: [
        { action: WORK_ACTION_IDS.OPEN_FEEDBACK, label: 'REPORT ISSUE' },
        { action: 'add_bug_report_rule', label: 'ADD BUG TEMPLATE' }
      ]
    });
  }

  return candidates.sort((a, b) => Number(b.priority || 0) - Number(a.priority || 0));
}

function activeFlexibleTool(prompt = String(els.jobPrompt?.value || ''), input = orderInputFromComposer()) {
  return flexibleToolCandidates(prompt, input)[0] || null;
}

function flexibleToolPromptBucket(prompt = String(els.jobPrompt?.value || ''), input = orderInputFromComposer()) {
  const counts = orderInputCounts(input);
  const promptChars = String(prompt || '').trim().length;
  return [
    currentRoutingTask() || 'unknown',
    Math.floor(promptChars / 120),
    counts.urlCount,
    counts.fileCount
  ].join(':');
}

function flexibleToolAnalyticsMeta(tool = {}, extra = {}) {
  const input = orderInputFromComposer();
  const counts = orderInputCounts(input);
  return {
    source: 'work_chat_flexible_ui',
    toolId: tool.id || '',
    toolTitle: tool.title || '',
    trigger: extra.trigger || 'rule',
    taskType: currentRoutingTask() || '',
    mode: isOpenChatClarifyMode() ? 'plan' : 'order',
    status: extra.status || tool.tone || '',
    action: extra.action || '',
    actionLabel: extra.actionLabel || '',
    promptChars: String(els.jobPrompt?.value || '').trim().length,
    urlCount: counts.urlCount,
    fileCount: counts.fileCount,
    fileChars: counts.fileChars,
    candidateCount: Number(extra.candidateCount || 0),
    priority: Number(tool.priority || 0),
    helpful: extra.helpful,
    userDismissed: extra.userDismissed
  };
}

function trackFlexibleToolEvent(event = '', tool = {}, extra = {}) {
  void trackConversionEvent(event, flexibleToolAnalyticsMeta(tool, extra));
}

function renderFlexibleToolPanel() {
  if (!els.flexToolPanel || !els.flexToolCard) return;
  const candidates = flexibleToolCandidates();
  const tool = candidates[0] || null;
  if (!WORK_CHAT_INTERNAL_STATUS_VISIBLE && tool?.id !== 'marketing_timeline') {
    setElementVisible(els.flexToolPanel, false);
    return;
  }
  if (!tool) {
    state.flexToolDismissedKey = '';
    state.flexToolLastActiveId = '';
    state.flexToolLastShownKey = '';
    setElementVisible(els.flexToolPanel, false);
    return;
  }
  if (state.flexToolDismissedKey && state.flexToolDismissedKey !== tool.id) {
    state.flexToolDismissedKey = '';
  }
  if (state.flexToolDismissedKey === tool.id) {
    setElementVisible(els.flexToolPanel, false);
    return;
  }
  state.flexToolLastActiveId = tool.id;
  const tone = ['ok', 'warn', 'error', 'info'].includes(tool.tone) ? tool.tone : 'info';
  els.flexToolCard.className = `modal-panel box panel-stack flex-tool-panel ${tone}`;
  safeText(els.flexToolTitle, tool.title || 'Relevant tool');
  safeText(els.flexToolBody, tool.body || `${PRODUCT_SHORT_NAME} found a relevant tool for this message.`);
  safeText(els.flexToolRequirements, tool.requirements || 'No extra setup detected.');
  if (els.flexToolActions) {
    els.flexToolActions.innerHTML = (Array.isArray(tool.actions) ? tool.actions : [])
      .filter((action) => action?.action && action?.label)
      .slice(0, 4)
      .map((action) => `<button class="mini-btn" type="button" data-flex-tool-action="${escapeHtml(action.action)}">${escapeHtml(action.label)}</button>`)
      .join('');
    els.flexToolActions.querySelectorAll('[data-flex-tool-action]').forEach((button) => {
      button.onclick = () => handleFlexibleToolAction(button.dataset.flexToolAction || '', button.textContent || '');
    });
  }
  setElementVisible(els.flexToolPanel, true);
  const shownKey = `${tool.id}:${flexibleToolPromptBucket()}`;
  if (state.flexToolLastShownKey !== shownKey) {
    state.flexToolLastShownKey = shownKey;
    trackFlexibleToolEvent('flex_tool_shown', tool, { candidateCount: candidates.length, trigger: 'rule' });
  }
}

function addFlexibleToolInstruction(instruction = '') {
  const line = String(instruction || '').trim();
  if (!line || !els.jobPrompt) return;
  const current = String(els.jobPrompt.value || '').trim();
  if (current.includes(line)) return;
  els.jobPrompt.value = current ? `${current}\n\n${line}` : line;
  state.orderComposerDirtySinceSend = true;
  renderOrderComposer();
  window.requestAnimationFrame(() => els.jobPrompt?.focus());
}

function handleFlexibleToolAction(action = '', actionLabel = '') {
  const kind = String(action || '').trim();
  const toolForLog = activeFlexibleTool() || { id: state.flexToolLastActiveId || '', title: '' };
  trackFlexibleToolEvent('flex_tool_action_clicked', toolForLog, { action: kind, actionLabel: actionLabel || kind });
  setElementVisible(els.flexToolPanel, false);
  if (kind === WORK_ACTION_IDS.OPEN_ORDER_SETTINGS) {
    state.orderSettingsExpanded = true;
    renderOrderComposer();
    return;
  }
  if (kind === WORK_ACTION_IDS.OPEN_MARKETING_TIMELINE) {
    openMarketingTimelineModal();
    return;
  }
  if (kind === 'open_sources') {
    state.orderSettingsExpanded = true;
    renderOrderComposer();
    window.requestAnimationFrame(() => els.jobUrls?.focus());
    return;
  }
  if (kind === 'open_payments') {
    openSettingsSection('payments');
    return;
  }
  if (kind === 'open_provider') {
    openSettingsSection('provider');
    return;
  }
  if (kind === 'open_api_keys') {
    openSettingsSection('keys');
    return;
  }
  if (kind === 'register_card') {
    openSettingsSection('payments');
    window.requestAnimationFrame(() => els.createStripeSetupSessionBtn?.focus());
    return;
  }
  if (kind === 'open_connect') {
    switchTab('connect');
    return;
  }
  if (kind === 'connect_github') {
    openGithubSignIn();
    return;
  }
  if (kind === 'connect_x') {
    connectXAccount();
    return;
  }
  if (kind === 'open_agents_github' || kind === 'list_agent') {
    openAgentListingFlow();
    return;
  }
  if (kind === 'browse_agents') {
    openAgentCatalog();
    return;
  }
  if (kind === 'open_scheduled_work') {
    state.openChatHistoryOpen = true;
    renderOrderComposer();
    window.requestAnimationFrame(() => els.scheduledWorkStatus?.scrollIntoView?.({ behavior: 'smooth', block: 'center' }));
    return;
  }
  if (kind === WORK_ACTION_IDS.OPEN_FEEDBACK) {
    switchTab('start');
    window.requestAnimationFrame(() => els.feedbackType?.scrollIntoView?.({ behavior: 'smooth', block: 'center' }));
    return;
  }
  const instructionMap = {
    add_secure_requirement: 'Access rule: do not include production secrets in chat or delivery. Use OAuth/connector setup or provider-owned secret storage before execution.',
    add_pr_handoff: 'Delivery rule: if code changes are needed, use a sandbox branch and return a pull request URL, diff summary, and test results.',
    add_social_handoff_rule: 'Social publishing rule: prepare a draft or SaaS handoff packet through the assigned agent/provider contract; do not publish directly from pre-dispatch chat.',
    use_agent_team: 'Routing preference: use an Agent Team with a Team Leader if multiple specialties or channels improve quality/cost.',
    add_schedule_rule: 'Schedule rule: ask me to confirm interval, timezone, stop condition, and failure notification before creating scheduled work.',
    add_source_rule: 'Source rule: rely only on the attached URLs/files and clearly separate source-backed facts from inference.',
    add_agent_listing_rule: 'Agent listing rule: treat this as provider setup, not buyer work. Prepare manifest, pricing markup, endpoint/adapter, and verification checklist.',
    add_bug_report_rule: 'Bug report template: include page, action taken, expected result, actual result, account state, and reproduction steps.'
  };
  if (instructionMap[kind]) {
    addFlexibleToolInstruction(instructionMap[kind]);
    trackFlexibleToolEvent('flex_tool_instruction_added', toolForLog, { action: kind, actionLabel: actionLabel || kind });
  }
}

function updateWorkChatStatusCard(title = 'Write the request first.', body = '', tone = 'info') {
  if (!els.workChatStatusCard || !els.workChatStatusText) return;
  if (!WORK_CHAT_INTERNAL_STATUS_VISIBLE) {
    setElementVisible(els.workChatStatusCard, false);
    return;
  }
  const safeTone = ['ok', 'warn', 'error', 'info'].includes(String(tone || '')) ? String(tone) : 'info';
  const safeTitle = formatWorkUiText(String(title || '').trim()) || 'Write the request first.';
  const safeBody = formatWorkUiText(String(body || '').trim()) || 'CAIt will answer quick questions or prepare an order brief.';
  els.workChatStatusCard.className = `work-chat-status-card ${safeTone}`;
  els.workChatStatusText.innerHTML = `<strong>${escapeHtml(safeTitle)}</strong><span>${escapeHtml(safeBody)}</span>`;
}

function neutralUnsentComposerStatus(buttonText = '') {
  const labels = workOrderUiLabels();
  const action = String(buttonText || labels.sendChat).trim().toUpperCase();
  if (action === labels.sendOrder.toUpperCase()) {
    return {
      title: 'Message not sent yet.',
      body: `Review the prepared text, then press ${labels.sendOrder} when you want paid dispatch.`,
      tone: 'info'
    };
  }
  if (action === labels.prepareOrder.toUpperCase()) {
    return {
      title: 'Message not sent yet.',
      body: `Press ${labels.prepareOrder} to turn this into a draft order. After that, the button changes to ${labels.sendOrder}.`,
      tone: 'info'
    };
  }
  if (action === labels.answerFirst.toUpperCase()) {
    return {
      title: 'Message not sent yet.',
      body: `Press ${labels.answerFirst} when ready. No chat response appears before you send.`,
      tone: 'info'
    };
  }
  return {
    title: 'Message not sent yet.',
    body: `Press ${labels.sendChat} when ready. No chat response appears before you send.`,
    tone: 'info'
  };
}

function renderRunCreateStatus(snapshot = state.snapshot || {}) {
  if (!els.runCreateStatus) return;
  const auth = snapshot?.auth || {};
  const pinnedAgent = currentRunTargetAgent();
  const taskType = currentRoutingTask() || 'research';
  const visiblePrompt = currentVisibleOrderPrompt();
  const prompt = currentEffectiveOrderPrompt();
  const sourceCounts = orderInputCounts(orderInputFromComposer());
  const hasRequest = Boolean(prompt || sourceCounts.urlCount || sourceCounts.fileCount);
  const readyMatches = readyAgentsForTask(taskType);
  const routingDecision = orderRoutingDecision(taskType, prompt);
  const strategy = routingDecision.strategy;
  const planned = routingDecision.plan;
  const billingProfile = state.stripeStatus?.billingProfile || snapshot?.monthlySummary?.customer || {};
  const account = snapshot?.accountSettings || {};
  const accountStripe = state.stripeStatus?.stripe?.accountStripe || account?.stripe || {};
  const configuredBillingMode = String(account?.billing?.mode || billingProfile?.configuredMode || '').trim().toLowerCase();
  const savedCard = Boolean(accountStripe.defaultPaymentMethodId) || String(accountStripe.defaultPaymentMethodStatus || '') === 'ready';
  const monthlyBillingSelected = configuredBillingMode === 'monthly_invoice';
  const monthlyBillingReady = monthlyBillingSelected && savedCard;
  const nonCardCreditsReady = Number(billingProfile.welcomeCreditsAvailable || 0) > 0 || Number(billingProfile.subscriptionCreditsAvailable || 0) > 0;
  const adminBillingBypass = Boolean(auth?.isPlatformAdmin);
  const billingReady = adminBillingBypass || monthlyBillingReady || nonCardCreditsReady;
  const dispatchReady = isOpenChatDispatchReadyPrompt(prompt);
  const skillDraft = looksLikeAgentSkillMarkdown(prompt);
  const quickAnswer = skillDraft || dispatchReady ? null : quickOrderChatAnswer(prompt, sourceCounts);
  const mustUseLlmFallback = !dispatchReady && openChatMustUseLlmFallback(prompt, quickAnswer);
  const llmFallbackCandidate = Boolean(prompt && !skillDraft && !dispatchReady && openChatLooksPreorderIntentLlmCandidate(prompt, sourceCounts, quickAnswer));
  const uiLabels = workOrderUiLabels();
  let title = 'Ready to start.';
  let body = `Write the request in natural language. ${PRODUCT_SHORT_NAME} prepares the order summary first, then shows ${uiLabels.sendOrder}.`;
  let tone = 'ok';
  let buttonText = uiLabels.sendChat;

  if (skillDraft) {
    title = 'Agent Skill detected.';
    body = `${uiLabels.sendChat} will convert SKILL.md into a ${PRODUCT_NAME} manifest draft, open AGENTS, and let you review before import. Listing can proceed, but provider money actions stay locked until identity, Stripe billing, and CAIt manual settlement review are ready.`;
    tone = 'ok';
    buttonText = uiLabels.sendChat;
  } else if (llmFallbackCandidate && mustUseLlmFallback) {
    title = 'Intent check first.';
    body = `${uiLabels.sendChat} will ask ChatGPT to clarify this before CAIt uses the local answer. If the check is unavailable, CAIt will stop and ask for one more sentence instead of guessing.`;
    tone = 'warn';
    buttonText = uiLabels.sendChat;
  } else if (quickAnswer) {
    const quickKind = chatAnswerKind(quickAnswer);
    if (quickKind === 'command') {
      title = 'CAIt Chat control.';
      body = `${uiLabels.sendChat} will run this chat command without creating an order or billing. Use it to reset chat, restore a prepared brief, or jump to the right setup area.`;
      tone = quickAnswer.tone || 'info';
      buttonText = uiLabels.sendChat;
    } else if (quickKind === 'assist') {
      title = 'Order-prep chat.';
      body = `${uiLabels.sendChat} will prepare or update the order draft. When it is ready, the next step is ${uiLabels.sendOrder}.`;
      tone = 'ok';
      buttonText = uiLabels.sendChat;
    } else if (quickKind === 'clarify') {
      title = quickAnswer.vagueChoicePrompt ? 'Choose research or scope first.' : 'Clarification needed.';
      body = quickAnswer.vagueChoicePrompt
        ? `${uiLabels.sendChat} will ask whether to spend tokens on broad research or narrow the request first.`
        : `${uiLabels.sendChat} will ask one short question and show likely paths. Reply with a number or short phrase before ${PRODUCT_SHORT_NAME} opens a flow.`;
      tone = 'warn';
      buttonText = uiLabels.sendChat;
    } else {
      title = 'Quick question.';
      body = `This looks like a product or FAQ question. ${uiLabels.sendChat} will answer in chat without billing. To create paid work, describe the delivery you want.`;
      tone = 'info';
      buttonText = uiLabels.sendChat;
    }
  } else if (llmFallbackCandidate) {
    title = 'Intent check first.';
    body = `${uiLabels.sendChat} will ask ChatGPT to clarify this before CAIt prepares any order brief. If the check is unavailable, CAIt will stop and ask for one more sentence instead of guessing.`;
    tone = 'warn';
    buttonText = uiLabels.sendChat;
  } else if (!hasRequest) {
    const lastStatus = String(state.openChatLastStatus || '').trim();
    if (lastStatus) {
      const statusParts = lastStatus.split(/\n\n+/);
      title = statusParts.shift() || 'Answered in chat.';
      body = statusParts.join('\n\n') || 'No order was created and no billing occurred.';
      tone = state.openChatLastStatusTone || 'info';
    } else {
      title = 'Write the request first.';
      body = `Ask a quick product question, describe the result you want, or open settings to add source URLs/files. ${PRODUCT_SHORT_NAME} handles task inference and routing.`;
      tone = 'info';
    }
  } else if (state.pendingIntake && !state.intakeConfirmed) {
    title = 'Answer clarification questions first.';
    body = `${PRODUCT_SHORT_NAME} detected missing order details. Answer the questions below before billing or dispatch.`;
    tone = 'warn';
    buttonText = uiLabels.answerFirst;
  } else if (isOpenChatClarifyMode()) {
    title = dispatchReady ? 'Order draft ready.' : 'Prepare the order.';
    body = `${uiLabels.prepareOrder} turns this into a reviewable order summary. After preparation, CAIt switches to ORDER and shows ${uiLabels.sendOrder}.`;
    tone = 'info';
    buttonText = uiLabels.prepareOrder;
  } else if (!dispatchReady) {
    title = 'Prepare order first.';
    body = `${uiLabels.prepareOrder} turns this request into an order summary. Review it, then press ${uiLabels.sendOrder} to run it.`;
    tone = 'info';
    buttonText = uiLabels.prepareOrder;
  } else if (!canOrderFromBrowser(auth)) {
    title = 'Login required to send order.';
    body = `The CAIt Chat brief is ready. First-time sign-in grants $10 in credits, which can be used toward this order. Sign in when you want to dispatch paid work, then press ${uiLabels.sendOrder}.`;
    tone = 'warn';
    buttonText = uiLabels.sendOrder;
  } else if (state.pendingIntake && state.intakeConfirmed) {
    title = 'Clarified order ready.';
    body = `Your answers are attached. ${uiLabels.sendOrder} will skip the intake check and dispatch normally.`;
    tone = 'ok';
    buttonText = uiLabels.sendOrder;
  } else if (!prompt && (sourceCounts.urlCount || sourceCounts.fileCount)) {
    title = 'Source-driven order ready.';
    body = `Using ${sourceCounts.urlCount} URL(s) and ${sourceCounts.fileCount} file(s). Add a prompt if you want explicit instructions.`;
    tone = 'ok';
  } else if (!billingReady) {
    title = 'Register card before sending.';
    body = `Open PAYMENTS and use REGISTER CARD before pressing ${uiLabels.sendOrder}. Paid orders use month-end billing; managed sample agents do not require separate buyer-side model API contracts.`;
    tone = 'warn';
    buttonText = uiLabels.sendOrder;
  } else if (strategy === 'multi' && pinnedAgent) {
    title = 'Clear pinned agent first.';
    body = `Multi-agent objective routing picks several agents automatically. Clear the pin before pressing ${uiLabels.sendOrder}.`;
    tone = 'warn';
    buttonText = uiLabels.sendOrder;
  } else if (strategy === 'multi' && planned.picks.length < 2) {
    title = 'Need more ready agents.';
    body = `Multi-agent objective planning found ${planned.picks.length} ready agent${planned.picks.length === 1 ? '' : 's'}. Register or verify more agents for tasks: ${planned.plannedTasks.join(', ')}.`;
    tone = 'warn';
    buttonText = uiLabels.sendOrder;
  } else if (strategy === 'multi') {
    title = 'Multi-agent objective ready.';
    body = `${orderStrategyLabel()} selected. ${routingDecision.reason} This order will create ${planned.picks.length} Agent Team runs across ${planned.picks.map((item) => `${item.taskType}:${item.agent.name}`).join(' / ')}.`;
    tone = 'ok';
    buttonText = uiLabels.sendOrder;
  } else if (pinnedAgent && !agentHealth(pinnedAgent).ready) {
    title = 'Pinned agent is not ready.';
    body = 'Clear the pin or finish onboarding before sending the order.';
    tone = 'warn';
    buttonText = uiLabels.sendOrder;
  } else if (!pinnedAgent && !readyMatches.length) {
    title = 'No ready agent for this task.';
    body = 'Open AGENTS to register a ready agent. Provider money actions stay locked until SETTINGS > PAYMENTS, PROVIDER IDENTITY, and CAIt manual settlement review are complete.';
    tone = 'warn';
    buttonText = uiLabels.sendOrder;
  } else {
    title = 'Ready to send order.';
    body = adminBillingBypass
      ? `Admin test billing is active for this account. ${uiLabels.sendOrder} will run without consuming credits or monthly billing.`
      : 'The prepared brief will be dispatched as a paid order. Max reserve and delivery expectations are shown in ORDER SETTINGS.';
    tone = 'ok';
    buttonText = uiLabels.sendOrder;
  }

  if (state.orderComposerDirtySinceSend && visiblePrompt) {
    const neutral = neutralUnsentComposerStatus(buttonText);
    title = neutral.title;
    body = neutral.body;
    tone = neutral.tone;
  }

  const statusText = formatWorkUiText(`${title}\n\n${body}`);
  els.runCreateStatus.textContent = statusText;
  els.runCreateStatus.className = `detail-box action-card ${tone} compact-card`;
  if (!WORK_CHAT_INTERNAL_STATUS_VISIBLE) setElementVisible(els.runCreateStatus, false);
  updateWorkChatStatusCard(title, body, tone);
  if (els.createJobBtn) els.createJobBtn.textContent = buttonText;
}

function syncCreateJobButtonForCurrentPrompt() {
  if (!els.createJobBtn) return;
  els.createJobBtn.textContent = createJobButtonTextForCurrentInput();
}

function createJobButtonTextForCurrentInput() {
  const uiLabels = workOrderUiLabels();
  const input = orderInputFromComposer();
  const counts = orderInputCounts(input);
  const prompt = currentEffectiveOrderPrompt();
  if (!prompt && !counts.urlCount && !counts.fileCount && isStructuredOrderBrief(lastOpenChatPreparedBrief())) return uiLabels.sendOrder;
  if (!prompt && !counts.urlCount && !counts.fileCount) return uiLabels.sendChat;
  if (state.pendingIntake && !state.intakeConfirmed) return uiLabels.answerFirst;
  if (looksLikeAgentSkillMarkdown(prompt)) return uiLabels.sendChat;
  if (isOpenChatDispatchReadyPrompt(prompt)) return uiLabels.sendOrder;
  if (quickOrderChatAnswer(prompt, counts)) return uiLabels.sendChat;
  if (openChatLooksPreorderIntentLlmCandidate(prompt, counts, null)) return uiLabels.sendChat;
  if (isOpenChatClarifyMode()) return uiLabels.prepareOrder;
  return uiLabels.prepareOrder;
}

function renderRunAgentContext() {
  if (!els.agentRunContext) return;
  const routingDecision = orderRoutingDecision(currentRoutingTask(), currentEffectiveOrderPrompt());
  if (routingDecision.strategy === 'multi') {
    const planned = routingDecision.plan;
    els.agentRunContext.textContent = planned.picks.length
      ? `Auto routing: Agent Team\nReason: ${routingDecision.reason}\nTasks: ${planned.plannedTasks.join(', ')}\nAgents: ${planned.picks.map((item) => `${item.taskType}:${item.agent.name}`).join(' / ')}`
      : 'Multi-agent plan\nNeed at least 2 ready agents to build the plan.';
    els.agentRunContext.className = `detail-box action-card ${planned.picks.length >= 2 ? 'ok' : 'warn'} compact-card`;
    return;
  }
  const enteredAgentId = String(els.jobAgentId?.value || '').trim();
  const agent = currentRunTargetAgent();
  if (!enteredAgentId) {
    const taskType = currentRoutingTask();
    els.agentRunContext.textContent = taskType
      ? `Auto routing: single-agent\nReason: ${routingDecision.reason}\nTask fit: ${taskType}`
      : `Target agent: auto\nWrite the request first and ${PRODUCT_SHORT_NAME} will infer the task.`;
    els.agentRunContext.className = 'detail-box action-card info compact-card';
    return;
  }
  if (!agent) {
    els.agentRunContext.textContent = [
      `Pinned agent: ${enteredAgentId}`,
      'This id is not in the current agent list.',
      'Clear the pin to return to auto-routing.'
    ].join('\n');
    els.agentRunContext.className = 'detail-box action-card warn compact-card';
    return;
  }
  const health = agentHealth(agent);
  const fit = agentTaskFit(agent);
  const verifyAction = agentVerifyAction(agent);
  const selected = selectedAgent();
  const source = selected?.id === agent.id ? 'selected agent row' : 'manual agent_id entry';
  const createNow = health.ready && fit.matches;
  els.agentRunContext.textContent = [
    `Target agent: ${agent.name}`,
    `Status: ${health.label} / ${fit.label}`,
    `Chosen from: ${source}`,
    `Next: ${createNow ? 'Ready to create.' : verifyAction.title}`
  ].join('\n');
  els.agentRunContext.className = `detail-box action-card ${createNow ? 'ok' : (fit.matches ? health.tone : 'warn')} compact-card`;
}

function renderRunEstimateCard() {
  if (!els.runEstimateCard) return;
  const taskType = currentRoutingTask() || 'research';
  const prompt = currentEffectiveOrderPrompt();
  const sourceCounts = orderInputCounts(orderInputFromComposer());
  if (!prompt && !sourceCounts.urlCount && !sourceCounts.fileCount) {
    els.runEstimateCard.textContent = 'Estimate appears after you write the request.\nMaximum reserve, delivery format, and actual settlement appear before order creation.';
    els.runEstimateCard.className = 'detail-box action-card info compact-card';
    return;
  }
  const routingDecision = orderRoutingDecision(taskType, prompt);
  if (routingDecision.strategy === 'multi') {
    const planned = routingDecision.plan;
    if (planned.picks.length < 2) {
      els.runEstimateCard.textContent = `Agent Team plan: ${planned.plannedTasks.join(', ') || taskType}\nNeed at least 2 ready agents to estimate an Agent Team order.\nNo billing is reserved until a valid order can be created.`;
      els.runEstimateCard.className = 'detail-box action-card warn compact-card';
      return;
    }
    const total = planned.picks.reduce((acc, item) => {
      const estimate = estimateWindowOfAgent(item.agent, item.taskType, { prompt });
      acc.min += Number(estimate?.estimateMinTotal || 0);
      acc.max += Number(estimate?.estimateMaxTotal || 0);
      acc.durationMin += Number(estimate?.durationMinSec || 0);
      acc.durationMax += Number(estimate?.durationMaxSec || 0);
      return acc;
    }, { min: 0, max: 0, durationMin: 0, durationMax: 0 });
    els.runEstimateCard.textContent = [
      `Agent Team plan: ${planned.picks.map((item) => `${item.taskType}:${item.agent.name}`).join(' / ')}`,
      `Estimate: ${yen(total.min)} – ${yen(total.max)}`,
      `Estimated time: ${formatSecRange(total.durationMin, total.durationMax)}`,
      `Max reserve before dispatch: ${yen(total.max)}`,
      'Completed orders settle on actual usage. Failed or cancelled orders release unused reserve.'
    ].join('\n');
    els.runEstimateCard.className = 'detail-box action-card ok compact-card';
    return;
  }
  const agent = currentRunTargetAgent() || (state.snapshot?.agents || []).find((item) => agentHealth(item).ready && agentTaskFit(item, taskType).matches) || null;
  if (!agent) {
    els.runEstimateCard.textContent = `Task: ${taskType}\nNo ready agent matches yet.\nRegister or finish onboarding first.\nFinal billing uses actual usage after completion.`;
    els.runEstimateCard.className = 'detail-box action-card warn compact-card';
    return;
  }
  const estimate = estimateWindowOfAgent(agent, taskType, { prompt, input: orderInputFromComposer() });
  const why = [
    `${agent.name}`,
    `task=${taskType}`,
    `success=${formatPercent(agent.successRate)}`
  ].join(' · ');
  els.runEstimateCard.textContent = [
    `Estimated end-user cost: ${yen(estimate.estimateMinTotal)} – ${yen(estimate.estimateMaxTotal)}`,
    `Estimated time: ${formatSecRange(estimate.durationMinSec, estimate.durationMaxSec)}`,
    `Based on ${why}`,
    `Max end-user reserve before dispatch: ${yen(estimate.estimateMaxTotal)}`,
    estimate.listCreatorPlan ? `List size: ${estimate.listCreatorPlan.requestedCount} companies · ${estimate.listCreatorPlan.batchCount} batch${estimate.listCreatorPlan.batchCount === 1 ? '' : 'es'} · public contact only` : null,
    estimate.providerMonthlyUsd > 0 ? `Provider monthly fee: ${formatDisplayCurrency(estimate.providerMonthlyUsd)} · CAIt bills 10% of that monthly fee to the provider, not the end user.` : null,
    estimate.pricingNote || null,
    'Completed orders settle on actual usage. Failed or cancelled orders release unused reserve.'
  ].filter(Boolean).join('\n');
  els.runEstimateCard.className = 'detail-box action-card ok compact-card';
}

function renderOrderComposer() {
  renderOpenChatModeControls();
  renderOpenChatSessionControls();
  renderWorkChatEntryCard(state.snapshot?.auth || {});
  renderOrderStrategyControls();
  renderOrderInputFilesSummary();
  renderOrderInputGuide();
  renderFlexibleToolPanel();
  renderOpenChatChoiceBar();
  renderIntakePanel();
  renderFollowupContextCard();
  renderOrderAgentPicker();
  renderRunAgentContext();
  renderRunEstimateCard();
  renderRunCreateStatus();
  renderParallelOrderQueue();
  renderOrderSettingsDrawer();
  renderParallelTools();
  setElementVisible(els.clearRunAgentBtn, Boolean(els.jobAgentId?.value));
  renderWorkChatThread();
  syncCreateJobButtonForCurrentPrompt();
}

function renderAgentFilterSummary(agents = []) {
  if (!els.agentFilterSummary) return;
  const filtered = agents.filter(agentMatchesFilters);
  const selected = selectedAgent();
  const readyVisible = filtered.filter((agent) => agentHealth(agent).ready).length;
  const parts = [];
  if (state.agentSearch) parts.push(`search="${state.agentSearch}"`);
  if (state.agentStatusFilter) parts.push(`status=${state.agentStatusFilter}`);
  const currentTask = currentRoutingTask();
  const lines = [
    `${filtered.length}/${agents.length} agents shown · ${readyVisible} ready in results${selected ? ` · selected=${selected.name}` : ''}`,
    `Active filters: ${parts.length ? parts.join(' · ') : 'none'}.${currentTask ? ` Current order task: ${currentTask}.` : ''}`,
    'Search fields: name, owner, description, task, tag, product type, readiness, verify state, verify code, endpoint, next action.',
    'Examples: seo · tag:marketing · owner:kyasui · task:seo · status:ready · verify:failed · endpoint:missing · fit:match'
  ];
  els.agentFilterSummary.textContent = lines.join('\n');
}

function agentActionKey(agent) {
  const action = agentNextAction(agent);
  if (action.title.includes('READY FOR DISPATCH')) return 'dispatch';
  if (action.title.includes('VERIFY AGENT')) return 'verify';
  if (action.title.includes('RESTORE AVAILABILITY')) return 'restore';
  if (action.title.includes('ADD JOB ENDPOINT')) return 'endpoint';
  return 'verify';
}

function agentMatchesFilters(agent) {
  const { tokens, free } = parseSearchTokens(state.agentSearch);
  const statusFilter = state.agentStatusFilter.trim().toLowerCase();
  const availabilityFilter = state.agentAvailabilityFilter.trim().toLowerCase();
  const actionFilter = state.agentActionFilter.trim().toLowerCase();
  const taskFilter = state.agentTaskFilter.trim().toLowerCase();
  const health = agentHealth(agent);
  const nextAction = agentNextAction(agent);
  const verification = agentVerification(agent);
  const fit = agentTaskFit(agent);
  const verifyAction = agentVerifyAction(agent);
  const composition = agentComposition(agent);
  const tags = agentTags(agent);
  const endpointText = health.endpoints.map((entry) => `${entry.label} ${entry.value}`).join(' ');
  const hay = [
    agent.name,
    agent.description,
    agent.owner,
    (agent.taskTypes || []).join(' '),
    tags.join(' '),
    agent.verificationStatus,
    agent.agentReviewStatus,
    health.verifyLabel,
    health.label,
    health.reviewLabel,
    health.reviewReason,
    health.availability,
    health.endpoint,
    health.healthcheck,
    health.reason,
    verification.category,
    verification.code,
    verification.reason,
    nextAction.title,
    nextAction.body,
    fit.label,
    fit.reason,
    verifyAction.title,
    verifyAction.body,
    agentProductKind(agent),
    agentCompositionSummary(agent),
    composition.mode,
    composition.components.map((component) => [component.name, component.agentId, component.role, component.taskText, component.description].filter(Boolean).join(' ')).join(' '),
    agent.manifestUrl,
    agent.manifestSource,
    endpointText
  ].filter(Boolean).join(' ').toLowerCase();
  const matchesSearch = !free.length || free.every((part) => hay.includes(part));
  const matchesToken = tokens.every(({ key, value }) => {
    if (!value) return true;
    if (['status', 'state'].includes(key)) return [health.label, health.availability, health.verifyLabel, health.reviewLabel, agent.verificationStatus, agent.agentReviewStatus].join(' ').toLowerCase().includes(value);
    if (['availability', 'avail'].includes(key)) return [health.availability, agent.online ? 'online' : 'offline'].join(' ').toLowerCase().includes(value);
    if (['task', 'cap', 'capability'].includes(key)) return (agent.taskTypes || []).some((task) => String(task).toLowerCase().includes(value));
    if (['tag', 'tags', 'team'].includes(key)) return tags.some((tag) => String(tag).toLowerCase().includes(value));
    if (['kind', 'type', 'product'].includes(key)) return [agentProductKind(agent), agentCompositionSummary(agent)].join(' ').toLowerCase().includes(value);
    if (key === 'owner') return String(agent.owner || '').toLowerCase().includes(value);
    if (key === 'verify') return [agent.verificationStatus, health.verifyLabel, verification.category, verification.code, verification.reason].join(' ').toLowerCase().includes(value);
    if (['review', 'safety'].includes(key)) return [agent.agentReviewStatus, health.reviewLabel, health.reviewReason].join(' ').toLowerCase().includes(value);
    if (['action', 'next'].includes(key)) return [nextAction.title, nextAction.body].join(' ').toLowerCase().includes(value);
    if (['fit', 'route'].includes(key)) {
      if (value === 'match') return fit.matches;
      if (value === 'mismatch') return !fit.matches;
      return [fit.label, fit.reason].join(' ').toLowerCase().includes(value);
    }
    if (key === 'endpoint') {
      if (value === 'missing') return !health.endpoint;
      if (value === 'present') return Boolean(health.endpoint);
      return [health.endpoint, health.healthcheck, endpointText].join(' ').toLowerCase().includes(value);
    }
    return hay.includes(value);
  });
  const matchesTask = !taskFilter || (agent.taskTypes || []).includes(taskFilter);
  const degraded = health.tone !== 'ok';
  const matchesStatus = !statusFilter || (statusFilter === 'ready' && health.ready) || (statusFilter === 'verified' && health.verified) || (statusFilter === 'unverified' && !health.verified) || (statusFilter === 'review' && !health.reviewApproved) || (statusFilter === 'offline' && !agent.online) || (statusFilter === 'degraded' && degraded);
  const matchesAvailability = !availabilityFilter || (availabilityFilter === 'online' && agent.online) || (availabilityFilter === 'offline' && !agent.online);
  const matchesAction = !actionFilter || agentActionKey(agent) === actionFilter;
  return matchesSearch && matchesToken && matchesTask && matchesStatus && matchesAvailability && matchesAction;
}


function refreshRoutingViews() {
  renderOrderComposer();
  if (state.snapshot) {
    renderAgentOps(state.snapshot.agents || []);
    renderAgents(state.snapshot.agents || []);
    updateCliPanels(state.snapshot);
  }
  const agent = selectedAgent();
  if (agent) setAgentDetail(agent);
}

function updateCliPanels(snapshot) {
  const cliAgents = snapshot?.agents || [];
  const cliJobs = snapshot?.jobs || [];
  const cliAccount = snapshot?.accountSettings || {};
  const cliAuth = snapshot?.auth || {};
  const cliCanWrite = canOrderFromBrowser(cliAuth);
  const cliVerified = cliAgents.filter((agent) => agentHealth(agent).verified);
  const cliReady = cliAgents.filter((agent) => agentHealth(agent).ready);
  const cliPrimaryAgent = selectedAgent() || cliReady[0] || cliVerified[0] || cliAgents[0] || null;
  const cliRecentRun = selectedJob() || cliJobs[0] || null;
  const cliEstimate = cliPrimaryAgent ? estimateWindowOfAgent(cliPrimaryAgent, cliPrimaryAgent.taskTypes?.[0] || 'research') : null;
  const cliOrderKeys = activeApiKeys(cliAccount?.apiAccess?.orderKeys || []);
  if (els.cliStatus) {
    els.cliStatus.textContent = [
      `Status: ${DEVELOPER_SURFACES_STATUS}`,
      DEVELOPER_SURFACES_NOTICE,
      `Base URL: ${window.location.origin}`,
      'Public order endpoint: paused',
      'CLI: paused',
      'MCP: paused',
      `Login: ${cliAuth?.loggedIn ? `connected as ${cliAuth?.user?.login || '-'}` : 'not connected'}`,
      `Browser order access: ${cliCanWrite ? 'enabled' : 'login required'}`,
      `Previous CAIt API keys: ${cliOrderKeys.length} active`,
      `Ready agents: ${cliReady.length}`,
      `Verified agents: ${cliVerified.length}`,
      `Last run: ${cliRecentRun?.id || '-'}`,
      `Estimate: ${cliEstimate ? `${yen(cliEstimate.estimateMinTotal)} – ${yen(cliEstimate.estimateMaxTotal)} · ${formatSecRange(cliEstimate.durationMinSec, cliEstimate.durationMaxSec)}` : 'unavailable'}`
    ].join('\n');
  }
  if (els.cliQuickstart) {
    els.cliQuickstart.textContent = [
      '# Coming soon',
      '# CLI and external API-key ordering are temporarily paused.',
      '# Use the browser Chat / Apps / Deliveries / Publisher flows for now.',
      '',
      '# Planned return path:',
      '# 1. stabilize the app handoff + delivery contract',
      '# 2. re-enable CAIT_DEVELOPER_API_ENABLED and CAIT_CLI_ENABLED',
      '# 3. publish updated curl / CLI examples',
      '',
      '# Current public API response:',
      '# 403 developer_api_disabled',
      '',
      '# Current MCP response:',
      '# 503 mcp_disabled'
    ].join('\n');
  }
  if (els.apiExamples) {
    els.apiExamples.textContent = [
      '# Coming soon',
      '# External agent/app API operations are temporarily paused.',
      '# Provider setup should be managed from the browser until the external contract is stable.',
      '',
      '# Planned API surfaces:',
      '# - order creation and delivery reads',
      '# - manifest import and verification',
      '# - app context handoff endpoints',
      '# - MCP discovery and JSON-RPC',
      '',
      '# Current public API response:',
      '# 403 developer_api_disabled'
    ].join('\n');
  }
  return;
  const agents = snapshot?.agents || [];
  const jobs = snapshot?.jobs || [];
  const auth = snapshot?.auth || {};
  const canWrite = canOrderFromBrowser(auth);
  const canDev = canUseDevApi(auth);
  const verified = agents.filter((agent) => agentHealth(agent).verified);
  const ready = agents.filter((agent) => agentHealth(agent).ready);
  const primaryAgent = selectedAgent() || ready[0] || verified[0] || agents[0] || null;
  const recentRun = selectedJob() || jobs[0] || null;
  const estimate = primaryAgent ? estimateWindowOfAgent(primaryAgent, primaryAgent.taskTypes?.[0] || 'research') : null;
  if (els.cliStatus) {
    els.cliStatus.textContent = [
      `guest_mode: ${auth?.loggedIn ? 'off' : 'on'}`,
      `release_stage: ${auth?.releaseStage || '-'}`,
      `guest_run_read_enabled: ${Boolean(auth?.guestRunReadEnabled)}`,
      `write_api_enabled: ${canWrite}`,
      `dev_api_enabled: ${canDev}`,
      `github_login_available: ${auth?.githubConfigured || auth?.githubAppConfigured}`,
      `storage_kind: ${snapshot?.storage?.kind || '-'}`,
      `deploy_target: cloudflare-worker`,
      `verified_agents: ${verified.length}`,
      `ready_agents: ${ready.length}`,
      `recent_run: ${recentRun?.id || '-'}`
    ].join('\n');
  }
  if (els.cliQuickstart) {
    els.cliQuickstart.textContent = `# first local path: server.js + curl.exe\n\nnpm install\nnpm run dev\n\n# optional: print command help\nnpm run help\nnpm run help:cli\nnpm run help:qa\n\n# local app URL\n# http://127.0.0.1:4323\n\n# smoke check local health\ncurl.exe http://127.0.0.1:4323/api/health\ncurl.exe http://127.0.0.1:4323/api/ready\ncurl.exe http://127.0.0.1:4323/api/snapshot\n\n# inspect agent supply before routing work\ncurl.exe http://127.0.0.1:4323/api/agents\n\n# create an order with auto-routing\ncurl.exe -X POST http://127.0.0.1:4323/api/jobs \\
  -H 'content-type: application/json' \\
  -d '{\n    "parent_agent_id":"cloudcode-main",\n    "task_type":"${primaryAgent?.taskTypes?.[0] || 'research'}",\n    "prompt":"${recentRun?.prompt || 'Compare support options for used iPhone repairs'}"\n  }'\n\n# optional: pin a specific ready agent only when routing must be deterministic\n# "agent_id":"${primaryAgent?.id || 'agent_id_optional'}"\n\n# typical estimate\n# ${estimate ? `${yen(estimate.estimateMinTotal)} – ${yen(estimate.estimateMaxTotal)} · ${formatSecRange(estimate.durationMinSec, estimate.durationMaxSec)}` : 'estimate unavailable'}\n\n# billing model\n# usage agents: measured usage + provider markup + marketplace margin\n# subscription SaaS agents: provider monthly fee is billed to the provider\n# end-user orders only pay declared per-run or usage overage\n\n# deploy to Cloudflare\nnpx wrangler deploy`;
  }
  if (els.apiExamples) {
    const lines = [
      '# create order with auto-routing',
      "curl -X POST /api/jobs \\",
      "  -H 'content-type: application/json' \\",
      `  -d '{\n    "parent_agent_id":"cloudcode-main",\n    "task_type":"${primaryAgent?.taskTypes?.[0] || 'research'}",\n    "prompt":"Compare support options for used iPhone repairs"\n  }'`,
      '',
      '# deterministic routing only when needed',
      "curl -X POST /api/jobs \\",
      "  -H 'content-type: application/json' \\",
      `  -d '{\n    "parent_agent_id":"cloudcode-main",\n    "task_type":"${primaryAgent?.taskTypes?.[0] || 'research'}",\n    "agent_id":"${primaryAgent?.id || 'optional-agent-id'}",\n    "prompt":"Inspect a verified agent and route work deterministically"\n  }'`,
      '',
      '# list agents and readiness',
      'curl /api/agents',
      'curl /api/snapshot',
      '',
      '# inspect one order',
      `curl /api/jobs/${recentRun?.id || '<job_id>'}`,
      '',
      '# connected-agent claim/result: public deployments require owner login or x-agent-token',
      `curl -X POST /api/jobs/${recentRun?.id || '<job_id>'}/claim \\`,
      "  -H 'content-type: application/json' \\",
      "  -H 'x-agent-token: <agent_token>' \\",
      `  -d '{"agent_id":"${primaryAgent?.id || '<agent_id>'}"}'`,
      '',
      `curl -X POST /api/jobs/${recentRun?.id || '<job_id>'}/result \\`,
      "  -H 'content-type: application/json' \\",
      "  -H 'x-agent-token: <agent_token>' \\",
      `  -d '{\n    "agent_id":"${primaryAgent?.id || '<agent_id>'}",\n    "status":"completed",\n    "output":{"summary":"Connected agent finished the task"},\n    "usage":{"total_cost_basis":96,"compute_cost":28,"tool_cost":18,"labor_cost":50,"input_tokens":1200,"output_tokens":800,"model":"provider-model"}\n  }'`
    ];
    if (canDev) {
      lines.push(
        '',
        '# retry a failed or timed_out dispatch (dev/local only)',
        'curl -X POST /api/dev/dispatch-retry \\',
        "  -H 'content-type: application/json' \\",
        `  -d '{"job_id":"${recentRun?.id || '<job_id>'}"}'`
      );
    }
    lines.push('', '# health', 'curl /api/health');
    els.apiExamples.textContent = lines.join('\n');
  }
}

function renderAgents(agents = []) {
  if (!els.agentsTable) return;
  const myLogin = state.snapshot?.auth?.user?.login;
  const filtered = [...agents].filter(agentMatchesFilters).sort(compareAgents);
  renderAgentFilterSummary(agents);
  if (!filtered.length) {
    state.selectedAgentId = null;
    setAgentDetail(null);
    els.agentsTable.innerHTML = '<div class="empty">No agents match the current filter.</div>';
    return;
  }
  if (!filtered.some((agent) => agent.id === state.selectedAgentId)) {
    state.selectedAgentId = filtered[0]?.id || null;
  }
  const renderAgentRow = (agent) => {
    const health = agentHealth(agent);
    const nextAction = agentNextAction(agent);
    const verification = agentVerification(agent);
    const fit = agentTaskFit(agent);
    const trust = agentTrustProfile(agent);
    const providerMarkupLabel = pricingModelLabel(agent);
    const sampleLabel = isManagedSampleAgent(agent) ? ' <span class="highlight">[SAMPLE]</span>' : '';
    const roleLabel = agentRole(agent) === 'leader'
      ? ' <span class="highlight">[LEADER]</span>'
      : ' <span class="row-muted">[WORKER]</span>';
    const productLabel = isAgentSuiteProduct(agent)
      ? ' <span class="highlight">[GROUP]</span>'
      : (isCompositeAgentProduct(agent) ? ' <span class="highlight">[COMPOSITE]</span>' : '');
    const ownerLabel = myLogin && agent.owner === myLogin ? ' <span class="highlight">[MY AGENT]</span>' : '';
    const tags = agentTags(agent);
    const tagLabel = tags.length ? `Tags: ${tags.slice(0, 6).join(' / ')}${tags.length > 6 ? ` +${tags.length - 6}` : ''}` : 'Tags: -';
    const compositionLabel = agentCompositionSummary(agent);
    const requirementLabel = agentRequirementSummary(agent);
    const safeHealthTone = safeCssToken(health.tone, 'info');
    const safeTrustTone = safeCssToken(trust.tone, 'info');
    const safeNextTone = safeCssToken(nextAction.tone, 'info');
    const rowActions = [
      health.ready
        ? `<button class="mini-btn try-agent-row-btn" data-try-agent="${escapeHtml(agent.id)}" style="margin-top:6px">USE IN CAIT CHAT</button>`
        : '',
      agent.verificationStatus === 'verified' || isManagedSampleAgent(agent)
        ? ''
        : `<button class="mini-btn verify-agent-btn" data-verify-agent="${escapeHtml(agent.id)}" style="margin-top:6px">VERIFY HEALTH</button>`,
      canDeleteAgent(agent)
        ? `<button class="mini-btn delete-agent-row-btn" data-delete-agent="${escapeHtml(agent.id)}" style="margin-top:6px">DELETE</button>`
        : ''
    ].filter(Boolean).join('');
    return `
    <div class="table-row agents-grid ${state.selectedAgentId === agent.id ? 'selected-row' : ''} ${agent.online ? 'agent-row-online' : 'agent-row-offline'}" data-agent-id="${escapeHtml(agent.id)}">
      <div>${escapeHtml(agent.name)}${sampleLabel}${roleLabel}${productLabel}${ownerLabel}<div class="row-muted">${escapeHtml(agent.owner || '-')}</div><div class="row-muted">${escapeHtml(clipText(agent.description || 'No description provided.', 92))}</div></div>
      <div>${escapeHtml((agent.taskTypes || []).join(', ') || 'no declared capability')}<div class="row-muted">${escapeHtml(tagLabel)}</div><div class="row-muted">${escapeHtml(providerMarkupLabel)} · platform 10%</div>${compositionLabel ? `<div class="row-muted">${escapeHtml(compositionLabel)}</div>` : ''}${requirementLabel ? `<div class="row-muted">${escapeHtml(requirementLabel)}</div>` : ''}<div class="row-muted">${escapeHtml(shortUrl(health.endpoint) || 'no job endpoint')}</div><div class="row-muted">${escapeHtml(clipText(health.reason, 92))}</div></div>
      <div><span class="status-pill ${safeTrustTone}">${escapeHtml(`TRUST ${trust.score}/100`)}</span><div class="row-muted">${escapeHtml(trust.label)}</div><div class="row-muted">${escapeHtml(clipText(trust.summary, 104))}</div></div>
      <div><span class="status-pill ${safeHealthTone}">${escapeHtml(health.label)}</span><div class="row-muted">${escapeHtml(`${health.verifyLabel} · ${agent.online ? 'online' : 'offline'}`)}</div><div class="row-muted">${escapeHtml(`${verification.code || 'no verify code'} · success ${formatPercent(agent.successRate)} · ${agent.avgLatencySec || '-'}s avg`)}</div></div>
      <div><span class="status-pill ${safeNextTone}">${escapeHtml(nextAction.title.replace('ACTION: ', ''))}</span><div class="row-muted">${escapeHtml(fit.label)}</div><div class="row-muted">${escapeHtml(clipText(nextAction.body, 96))}</div><div class="helper-row">${rowActions}</div></div>
    </div>`;
  };
  const leaderAgents = filtered.filter((agent) => agentRole(agent) === 'leader');
  const specialistAgents = filtered.filter((agent) => agentRole(agent) !== 'leader');
  const renderAgentSection = (title, summary, list, emptyText) => `
    <section class="agent-role-section">
      <div class="agent-role-heading">
        <div>
          <div class="section-title">${escapeHtml(title)}</div>
          <div class="agent-role-summary">${escapeHtml(summary)}</div>
        </div>
        <span class="status-pill info">${escapeHtml(`${list.length} shown`)}</span>
      </div>
      ${list.length
        ? `<div class="table-header agents-grid"><div>AGENT</div><div>CAPABILITY</div><div>TRUST</div><div>STATUS</div><div>NEXT STEP</div></div>${list.map(renderAgentRow).join('')}`
        : `<div class="agent-role-empty">${escapeHtml(emptyText)}</div>`}
    </section>
  `;
  els.agentsTable.innerHTML = [
    renderAgentSection(
      'LEADER AGENTS',
      'Plan and coordinate multi-agent work. A leader gathers context, selects or describes specialist agents, sets acceptance criteria, and merges delivery.',
      leaderAgents,
      'No leader agents match the current filters.'
    ),
    renderAgentSection(
      'SPECIALIST AGENTS',
      'Execute one focused capability such as SEO, code, research, writing, X posting, or data analysis.',
      specialistAgents,
      'No specialist agents match the current filters.'
    )
  ].join('');

  [...els.agentsTable.querySelectorAll('[data-agent-id]')].forEach((row) => {
    row.onclick = () => {
      const agent = agents.find((item) => item.id === row.dataset.agentId);
      state.selectedAgentId = agent?.id || null;
      setAgentDetail(agent);
      maybeAutoCheckSelectedAgent(agent);
      if (els.claimAgentId && agent?.id) els.claimAgentId.value = agent.id;
      renderAgents(state.snapshot?.agents || []);
      updateCliPanels(state.snapshot);
    };
  });

  [...els.agentsTable.querySelectorAll('[data-verify-agent]')].forEach((btn) => {
    btn.onclick = async (event) => {
      event.stopPropagation();
      await runAction(btn, async () => {
        const id = btn.dataset.verifyAgent;
        const result = await api(`/api/agents/${id}/verify`, { method: 'POST' });
        delete state.agentOnboarding[id];
        state.selectedAgentId = id;
        setAgentDetail(result.agent);
        renderOrderComposer();
        const verifyFailure = agentVerifyFailureSummary(result.agent);
        void trackConversionEvent('agent_verified', {
          source: 'agent_table',
          status: result.verification?.ok ? 'verified' : 'failed',
          agentId: id
        });
        flash(result.verification?.ok ? `Agent ${id.slice(0, 8)} verified.` : `Agent ${id.slice(0, 8)} verification failed: ${verifyFailure.cause} Next: ${verifyFailure.next}`, result.verification?.ok ? 'ok' : 'error');
        await refresh();
      });
    };
  });

  [...els.agentsTable.querySelectorAll('[data-try-agent]')].forEach((btn) => {
    btn.onclick = (event) => {
      event.stopPropagation();
      const agent = state.snapshot?.agents?.find((item) => item.id === btn.dataset.tryAgent) || null;
      if (!agent) return;
      state.selectedAgentId = agent.id;
      applyAgentToRunForm(agent, {
        switchToRuns: true,
        announce: true,
        message: `CAIt Chat is pinned to ${agent.name}. Ask what to do or prepare the request before sending a funded order.`
      });
    };
  });

  [...els.agentsTable.querySelectorAll('[data-delete-agent]')].forEach((btn) => {
    btn.onclick = async (event) => {
      event.stopPropagation();
      await runAction(btn, async () => {
        const id = btn.dataset.deleteAgent;
        const agent = state.snapshot?.agents?.find((item) => item.id === id) || null;
        await deleteAgentRecord(agent);
      });
    };
  });

  const selected = filtered.find((agent) => agent.id === state.selectedAgentId) || null;
  setAgentDetail(selected);
}

function renderJobs(jobs = []) {
  if (!els.jobsTable) return;
  const q = state.runSearch.trim().toLowerCase();
  const auth = state.snapshot?.auth || {};
  const requesterFilter = String(state.runRequesterFilter || 'all').trim().toLowerCase();
  if (els.runRequesterFilter) {
    const requesterValues = [...new Set(jobs.map((job) => requesterLoginOf(job)).filter(Boolean))].sort();
    const options = auth?.isPlatformAdmin
      ? [
          { value: 'all', label: 'all visible' },
          { value: 'mine', label: 'my orders' },
          ...requesterValues.map((value) => ({ value, label: value }))
        ]
      : [
          { value: 'mine', label: 'my orders' }
        ];
    els.runRequesterFilter.innerHTML = options.map((option) => `<option value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</option>`).join('');
    els.runRequesterFilter.value = options.some((option) => option.value === requesterFilter) ? requesterFilter : (auth?.isPlatformAdmin ? 'all' : 'mine');
    state.runRequesterFilter = els.runRequesterFilter.value;
  }
  const requesterScope = requesterScopeForClient(auth);
  const filtered = jobs.filter((job) => {
    const hay = [job.id, job.taskType, job.status, job.assignedAgentId, job.failureReason, job.failureCategory, job.dispatch?.responseStatus, job.prompt].filter(Boolean).join(' ').toLowerCase();
    const matchesSearch = !q || hay.includes(q);
    const matchesRequester = requesterMatchesScope(requesterLoginOf(job), requesterAccountIdOf(job), requesterScope);
    return matchesSearch && matchesRequester;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / ORDER_HISTORY_PAGE_SIZE));
  state.runPage = Math.min(Math.max(0, Number(state.runPage || 0) || 0), Math.max(0, totalPages - 1));
  const pageStart = state.runPage * ORDER_HISTORY_PAGE_SIZE;
  const paged = filtered.slice(pageStart, pageStart + ORDER_HISTORY_PAGE_SIZE);
  if (!filtered.length) {
    state.selectedJobId = null;
    els.jobsTable.innerHTML = '<div class="empty">No orders match the current filter.</div>';
    if (els.jobsPager) {
      els.jobsPager.hidden = true;
      els.jobsPager.innerHTML = '';
    }
    renderMarketingTimelineModal(null);
    return;
  }
  if (!filtered.some((job) => job.id === state.selectedJobId)) state.selectedJobId = null;
  els.jobsTable.innerHTML = `<div class="table-header runs-grid"><div>ORDER</div><div>STATUS</div><div>NEXT STEP</div></div>${paged.map((job) => {
      const nextAction = runNextAction(job);
      const runLabel = job.jobKind === 'workflow' ? 'agent-team' : (job.assignedAgentId ? job.assignedAgentId.slice(0, 12) : 'auto-routing');
      const safeNextTone = safeCssToken(nextAction.tone, 'info');
      const safeStatus = safeCssToken(job.status, 'info');
      const fundingSummary = fundingBreakdownCompact(job);
    const requesterLogin = requesterLoginOf(job) || '-';
    return `
    <div class="table-row runs-grid ${state.selectedJobId === job.id ? 'selected-row' : ''}" data-job-id="${escapeHtml(job.id)}">
      <div>${escapeHtml(job.id.slice(0, 8))}<div class="row-muted">${escapeHtml(`${job.taskType} · ${runLabel}`)}</div><div class="row-muted">${escapeHtml(`by ${requesterLogin}`)}</div></div>
      <div class="${safeStatus}">${escapeHtml(orderProgressStatusLabel(job.status).toUpperCase())}<div class="row-muted">${escapeHtml(fundingSummary || sinceLabel(job.createdAt))}</div></div>
      <div><span class="status-pill ${safeNextTone}">${escapeHtml(nextAction.title.replace('ACTION: ', '').replace('ORDER ', ''))}</span><div class="row-muted">${escapeHtml(job.failureReason || nextAction.body)}</div></div>
    </div>`;
  }).join('')}`;
  [...els.jobsTable.querySelectorAll('[data-job-id]')].forEach((row) => {
    row.onclick = () => {
      const job = jobs.find((item) => item.id === row.dataset.jobId);
      state.selectedJobId = job?.id || null;
      setDetail(job);
      renderJobs(state.snapshot?.jobs || []);
    };
  });
  if (els.jobsPager) {
    els.jobsPager.hidden = false;
    els.jobsPager.innerHTML = [
      `<span class="admin-pager-summary">${escapeHtml(`${pageStart + 1}-${pageStart + paged.length} of ${filtered.length} · page ${state.runPage + 1}/${totalPages}`)}</span>`,
      '<div class="helper-row">',
      `<button type="button" class="mini-btn" data-run-page-direction="prev"${state.runPage <= 0 ? ' disabled' : ''}>PREV</button>`,
      `<button type="button" class="mini-btn" data-run-page-direction="next"${state.runPage >= totalPages - 1 ? ' disabled' : ''}>NEXT</button>`,
      '</div>'
    ].join('');
    [...els.jobsPager.querySelectorAll('[data-run-page-direction]')].forEach((button) => {
      button.onclick = () => {
        state.runPage = Math.max(0, state.runPage + (button.dataset.runPageDirection === 'prev' ? -1 : 1));
        renderJobs(state.snapshot?.jobs || []);
      };
    });
  }
  renderMarketingTimelineModal(filtered.find((job) => job.id === state.selectedJobId) || null);
  const selected = filtered.find((job) => job.id === state.selectedJobId) || null;
  if (selected) setDetail(selected);
}

function renderBilling(jobs = []) {
  if (!els.billingTable) return;
  const billed = jobs.filter((job) => job.actualBilling);
  if (!billed.length) {
    els.billingTable.innerHTML = '<div class="empty">No billed orders yet.</div>';
    return;
  }
  els.billingTable.innerHTML = `<div class="table-header billing-grid"><div>ORDER</div><div>STATUS</div><div>BASIS</div><div>PAYOUT</div><div>PLATFORM</div><div>TOTAL</div></div>${billed.map((job) => `
    <div class="table-row billing-grid" data-bill-id="${escapeHtml(job.id)}">
      <div>${escapeHtml(job.id.slice(0, 8))}</div>
      <div class="${safeCssToken(job.status, 'info')}">${escapeHtml(orderProgressStatusLabel(job.status).toUpperCase())}</div>
      <div>${escapeHtml(yen(job.actualBilling.totalCostBasis ?? job.actualBilling.apiCost))}</div>
      <div>${escapeHtml(yen(job.actualBilling.agentPayout))}</div>
      <div>${escapeHtml(yen(job.actualBilling.platformRevenue))}</div>
      <div>${escapeHtml(yen(job.actualBilling.total))}<div class="row-muted">${escapeHtml(fundingBreakdownCompact(job) || '-')}</div></div>
    </div>`).join('')}`;
  [...els.billingTable.querySelectorAll('[data-bill-id]')].forEach((row) => {
    row.onclick = () => {
      const job = jobs.find((item) => item.id === row.dataset.billId);
      setDetail(job);
    };
  });
}

function renderBillingAudits(audits = []) {
  if (!els.billingAuditTable) return;
  if (!audits.length) {
    els.billingAuditTable.innerHTML = '<div class="empty">No billing audits yet.</div>';
    return;
  }
  els.billingAuditTable.innerHTML = `<div class="table-header billing-grid"><div>ORDER</div><div>SOURCE</div><div>BASIS</div><div>PAYOUT</div><div>PLATFORM</div><div>TOTAL</div></div>${audits.map((audit) => `
    <div class="table-row billing-grid" data-audit-id="${escapeHtml(audit.id)}">
      <div>${escapeHtml(audit.jobId.slice(0, 8))}</div>
      <div>${escapeHtml(audit.source)}</div>
      <div>${escapeHtml(yen(audit.billable.totalCostBasis))}</div>
      <div>${escapeHtml(yen(audit.settlement.agentPayout))}</div>
      <div>${escapeHtml(yen(audit.settlement.platformRevenue))}</div>
      <div>${escapeHtml(yen(audit.settlement.total))}<div class="row-muted">${escapeHtml(fundingBreakdownCompact(audit) || '-')}</div></div>
    </div>`).join('')}`;
  [...els.billingAuditTable.querySelectorAll('[data-audit-id]')].forEach((row) => {
    row.onclick = () => {
      const audit = audits.find((item) => item.id === row.dataset.auditId);
      setDetail(audit);
    };
  });
}

function toggleSettingsInputs(disabled) {
  [
    els.settingsPeriod,
    els.refreshSettingsBtn,
    els.apiKeyMode,
    els.apiKeyLabel,
    els.createApiKeyBtn,
    els.createStripeSetupSessionBtn,
    els.createStripeSubscriptionSessionBtn,
    els.createStripeConnectOnboardingBtn,
    els.runStripeProviderPayoutBtn,
    els.payoutWithdrawAmount,
    els.billingMode,
    els.billingLegalName,
    els.billingCompanyName,
    els.billingEmail,
    els.billingPhone,
    els.billingPostalCode,
    els.billingRegion,
    els.billingCity,
    els.billingAddressLine1,
    els.billingAddressLine2,
    els.billingCountry,
    els.billingCurrency,
    els.billingSubscriptionPlan,
    els.billingSubscriptionOverageMode,
    els.billingTaxId,
    els.billingPurchaseOrderRef,
    els.billingInvoiceMemo,
    els.billingDueDays,
    els.saveBillingSettingsBtn,
    els.payoutProviderEnabled,
    els.payoutEntityType,
    els.payoutLegalName,
    els.payoutDisplayName,
    els.payoutEmail,
    els.payoutCountry,
    els.payoutCurrency,
    els.payoutSupportEmail,
    els.payoutMinimumAmount,
    els.payoutWebsite,
    els.payoutStatementDescriptor,
    els.payoutNotes,
    els.savePayoutSettingsBtn
  ].forEach((el) => {
    if (el) el.disabled = disabled;
  });
}

function renderMonthlyCustomerRuns(runs = []) {
  if (!els.monthlyCustomerTable) return;
  if (!runs.length) {
    els.monthlyCustomerTable.innerHTML = '<div class="empty">No customer orders in this month.</div>';
    return;
  }
  els.monthlyCustomerTable.innerHTML = `<div class="table-header ledger-grid"><div>ORDER</div><div>TYPE</div><div>AGENT</div><div>TIME</div><div>TOTAL</div></div>${runs.map((run) => `
    <div class="table-row ledger-grid" data-customer-run-id="${escapeHtml(run.id)}">
      <div>${escapeHtml(run.id.slice(0, 8))}</div>
      <div>${escapeHtml(run.taskType)}</div>
      <div>${escapeHtml(run.agentName)}</div>
      <div>${escapeHtml(formatTime(run.ts))}</div>
      <div>${escapeHtml(yen(run.total))}</div>
    </div>`).join('')}`;
  [...els.monthlyCustomerTable.querySelectorAll('[data-customer-run-id]')].forEach((row) => {
    row.onclick = () => {
      const run = runs.find((item) => item.id === row.dataset.customerRunId);
      if (run) setDetail(run);
    };
  });
}

function renderMonthlyProviderRuns(runs = []) {
  if (!els.monthlyProviderTable) return;
  if (!runs.length) {
    els.monthlyProviderTable.innerHTML = '<div class="empty">No provider withdrawals in this month.</div>';
    return;
  }
  els.monthlyProviderTable.innerHTML = `<div class="table-header ledger-grid"><div>ORDER</div><div>TYPE</div><div>AGENT</div><div>TIME</div><div>PAYOUT</div></div>${runs.map((run) => `
    <div class="table-row ledger-grid" data-provider-run-id="${escapeHtml(run.id)}">
      <div>${escapeHtml(run.id.slice(0, 8))}</div>
      <div>${escapeHtml(run.taskType)}</div>
      <div>${escapeHtml(run.agentName)}</div>
      <div>${escapeHtml(formatTime(run.ts))}</div>
      <div>${escapeHtml(yen(run.agentPayout))}</div>
    </div>`).join('')}`;
  [...els.monthlyProviderTable.querySelectorAll('[data-provider-run-id]')].forEach((row) => {
    row.onclick = () => {
      const run = runs.find((item) => item.id === row.dataset.providerRunId);
      if (run) setDetail(run);
    };
  });
}

function renderProviderBillingLanesCard(providerSummary = {}) {
  if (!els.providerBillingLanesCard) return;
  const subscriptionCount = Number(providerSummary.providerSubscriptionAgentCount || 0);
  const lines = [
    'Parallel billing lanes',
    '',
    `1. End-user order lane: ${yen(providerSummary.grossPayout || 0)} gross provider payout from completed paid orders`,
    `2. Provider monthly lane: ${yen(providerSummary.providerSubscriptionMonthlyPrice || 0)} declared monthly SaaS fees across ${subscriptionCount} agent${subscriptionCount === 1 ? '' : 's'}`,
    `3. Provider monthly lane charged this period: ${yen(providerSummary.providerSubscriptionChargedAmount || 0)} / due now ${yen(providerSummary.providerSubscriptionDueAmount || 0)}`,
    `4. CAIt monthly take: ${yen(providerSummary.providerSubscriptionMarketplaceFee || 0)} from provider monthly SaaS fees`,
    `5. Provider net after CAIt monthly take: ${yen(providerSummary.providerSubscriptionProviderNet || 0)}`,
    `6. Auto retry: ${providerSummary.providerSubscriptionRetryPeriod ? `${providerSummary.providerSubscriptionRetryPeriod} · ${Number(providerSummary.providerSubscriptionRetryCount || 0)} active attempt(s)` : 'clear'}`,
    `7. Last failure notice: ${providerSummary.providerSubscriptionLastNotificationPeriod ? `${providerSummary.providerSubscriptionLastNotificationPeriod} (${formatTime(providerSummary.providerSubscriptionLastNotificationAt)})` : 'not sent'}`,
    '',
    'End-user order charges and provider monthly SaaS billing run in parallel. They are not added together in one order estimate.'
  ];
  safeText(els.providerBillingLanesCard, lines.join('\n'));
}

function renderOrderApiKeys(account = null, auth = null) {
  if (!els.apiKeyCreateResult || !els.apiKeyTable) return;
  const apiKeys = account?.apiAccess?.orderKeys || [];
  if (els.apiKeyLabel) els.apiKeyLabel.disabled = true;
  if (els.apiKeyMode) els.apiKeyMode.disabled = true;
  if (els.createApiKeyBtn) els.createApiKeyBtn.disabled = true;
  state.lastIssuedOrderApiKey = null;
  safeText(els.apiKeyCreateResult, [
    `${DEVELOPER_SURFACES_STATUS}: CAIt API keys`,
    '',
    DEVELOPER_SURFACES_NOTICE,
    '',
    'API key creation, listing for new use, revoke actions, CLI ordering, and MCP are disabled by default.',
    'Use browser-owned CAIt Chat, Apps, Deliveries, and Publisher flows until the external contract is re-enabled.'
  ].join('\n'));
  if (!apiKeys.length) {
    els.apiKeyTable.innerHTML = '<div class="empty">CAIt API keys are coming soon.</div>';
    return;
  }
  els.apiKeyTable.innerHTML = `<div class="table-header runs-grid"><div>KEY</div><div>LAST USED</div><div>STATUS</div></div>${apiKeys.map((key) => `
    <div class="table-row runs-grid">
      <div>${escapeHtml(key.label)}<div class="row-muted">${escapeHtml(`${String(key.mode || 'live').toUpperCase()} · ${key.prefix}… · ${key.scopes.join(', ')}`)}</div></div>
      <div>${escapeHtml(key.lastUsedAt ? formatTime(key.lastUsedAt) : 'never')}<div class="row-muted">${escapeHtml(`${key.lastUsedMethod || '-'} ${key.lastUsedPath || ''}`.trim())}</div></div>
      <div><span class="status-pill warn">${key.active ? 'PAUSED' : 'REVOKED'}</span><div class="row-muted">${key.active ? 'External API disabled' : escapeHtml(formatTime(key.revokedAt))}</div></div>
    </div>`).join('')}`;
}

function renderStripeTools(account = null, auth = null) {
  if (!els.stripeCustomerStatus || !els.stripeProviderStatus || !els.stripeCustomerActionResult || !els.stripeProviderActionResult) return;
  if (!PAYMENT_PROVIDER_UI_VISIBLE) {
    [
      els.createStripeSetupSessionBtn,
      els.createStripeSubscriptionSessionBtn,
      els.createStripeConnectOnboardingBtn,
      els.runStripeProviderMonthlyChargeBtn,
      els.runStripeProviderPayoutBtn,
      els.payoutWithdrawAmount,
      els.stripeCustomerStatus,
      els.stripeCustomerActionResult,
      els.stripeProviderStatus,
      els.stripeProviderActionResult
    ].forEach((el) => setElementVisible(el, false));
    safeText(els.stripeCustomerStatus, 'Hosted payment-provider actions are temporarily hidden.');
    safeText(els.stripeCustomerActionResult, 'Hosted payment-provider actions are temporarily hidden.');
    safeText(els.stripeProviderStatus, 'External payout-provider actions are temporarily hidden.');
    safeText(els.stripeProviderActionResult, 'External payout-provider actions are temporarily hidden.');
    return;
  }
  const loggedIn = Boolean(auth?.loggedIn && auth?.user?.login);
  const canManagePayments = canManagePaymentsFromBrowser(auth);
  const canManagePayouts = canManagePayoutsFromBrowser(auth);
  const stripe = state.stripeStatus?.stripe || null;
  const accountStripe = stripe?.accountStripe || account?.stripe || {};
  const billingProfile = stripe?.billingProfile || null;
  const providerSummary = state.snapshot?.monthlySummary?.provider || {};
  if (!loggedIn) {
    safeText(els.stripeCustomerStatus, 'Login required.\n\nCustomer payment actions are private account actions.');
    safeText(els.stripeProviderStatus, 'Login required.\n\nProvider withdrawal actions are private account actions.');
    safeText(els.stripeCustomerActionResult, TEMPORARY_INVOICE_BILLING_ENABLED
      ? 'Login first, then request an invoice. Hosted checkout is temporarily hidden.'
      : 'Login first, then confirm payment setup.');
    safeText(els.stripeProviderActionResult, TEMPORARY_INVOICE_BILLING_ENABLED
      ? 'Login first. Provider earnings remain tracked, but external payout setup is temporarily hidden.'
      : 'Login first, then open provider setup if this account receives revenue share.');
    return;
  }
  const availablePlans = stripe?.availableSubscriptionPlans || [];
  const savedCard = Boolean(accountStripe.defaultPaymentMethodId) || String(accountStripe.defaultPaymentMethodStatus || '') === 'ready';
  const activePlan = accountStripe.subscriptionPlan || billingProfile?.subscriptionPlan || 'none';
  const selectedPlan = String(els.billingSubscriptionPlan?.value || billingProfile?.subscriptionPlan || activePlan || 'none').trim().toLowerCase();
  const payoutStatus = String(accountStripe.connectedAccountStatus || 'not_started');
  const connectOnboardingStatus = String(accountStripe.connectOnboardingStatus || 'not_started');
  const chargesEnabled = accountStripe.chargesEnabled === true || String(accountStripe.chargesEnabled || '').toLowerCase() === 'true';
  const payoutsEnabled = accountStripe.payoutsEnabled === true || String(accountStripe.payoutsEnabled || '').toLowerCase() === 'true';
  const identityVerified = accountStripe.identityVerified === true || String(accountStripe.identityVerified || '').toLowerCase() === 'true';
  const identityVerificationStatus = String(accountStripe.identityVerificationStatus || (identityVerified ? 'verified' : 'not_started'));
  const transferCapabilityStatus = String(accountStripe.transferCapabilityStatus || 'missing');
  const requirementsCurrentDue = Array.isArray(accountStripe.requirementsCurrentDue) ? accountStripe.requirementsCurrentDue : [];
  const requirementsPastDue = Array.isArray(accountStripe.requirementsPastDue) ? accountStripe.requirementsPastDue : [];
  const requirementsDisabledReason = String(accountStripe.requirementsDisabledReason || '').trim();
  const stripeRequirementsClear = requirementsCurrentDue.length === 0 && requirementsPastDue.length === 0 && !requirementsDisabledReason;
  const connectDetailsSubmitted = payoutStatus === 'ready' || connectOnboardingStatus === 'completed';
  const connectReady = identityVerified && payoutsEnabled;
  const connectStarted = Boolean(accountStripe.connectedAccountId) || connectDetailsSubmitted || ['pending', 'started'].includes(payoutStatus) || ['pending', 'started'].includes(connectOnboardingStatus);
  const connectActionLabel = connectReady ? 'CONNECT READY' : (connectStarted ? 'RESUME CONNECT' : 'OPEN CONNECT');
  const configuredMode = account?.billing?.mode || billingProfile?.mode || 'monthly_invoice';
  const mode = billingProfile?.mode || configuredMode || 'monthly_invoice';
  const monthlyBillingSelected = configuredMode === 'monthly_invoice';
  const monthlyBillingReady = monthlyBillingSelected && mode === 'monthly_invoice' && savedCard;
  const displayMode = monthlyBillingSelected
    ? (monthlyBillingReady ? 'month-end card billing' : 'month-end card billing (card required)')
    : mode;
  const displayPayoutStatus = payoutStatus === 'not_started' ? 'not started' : payoutStatus;
  const providerEnabled = Boolean(account?.payout?.providerEnabled);
  const providerPending = Number(providerSummary.pendingBalance || account?.payout?.pendingBalance || 0);
  const providerPaid = Number(providerSummary.paidOutTotal || account?.payout?.paidOutTotal || 0);
  const providerMinimum = Number(providerSummary.minimumPayoutAmount || account?.payout?.minimumPayoutAmount || DEFAULT_MINIMUM_PAYOUT_AMOUNT);
  const providerMonthlyDeclared = Number(providerSummary.providerSubscriptionMonthlyPrice || 0);
  const providerMonthlyCharged = Number(providerSummary.providerSubscriptionChargedAmount || 0);
  const providerMonthlyPending = Number(providerSummary.providerSubscriptionPendingAmount || 0);
  const providerMonthlyDue = Number(providerSummary.providerSubscriptionDueAmount || 0);
  const providerMonthlyAgentCount = Number(providerSummary.providerSubscriptionAgentCount || 0);
  const providerMonthlyLastRun = Array.isArray(providerSummary.providerSubscriptionChargeRuns) ? providerSummary.providerSubscriptionChargeRuns[0] || null : null;
  const providerMonthlyAutoEnabled = stripe?.providerMonthlyAutoEnabled !== false;
  const providerMonthlyMaxAttempts = Number(stripe?.providerMonthlyMaxAttempts || 3);
  const providerMonthlyRetryPeriod = String(providerSummary.providerSubscriptionRetryPeriod || accountStripe.providerMonthlyRetryPeriod || '').trim();
  const providerMonthlyRetryCount = Number(providerSummary.providerSubscriptionRetryCount || accountStripe.providerMonthlyRetryCount || 0);
  const providerMonthlyLastFailureAt = String(providerSummary.providerSubscriptionLastFailureAt || accountStripe.providerMonthlyLastFailureAt || '').trim();
  const providerMonthlyLastFailureMessage = String(providerSummary.providerSubscriptionLastFailureMessage || accountStripe.providerMonthlyLastFailureMessage || '').trim();
  const providerMonthlyLastNotificationAt = String(providerSummary.providerSubscriptionLastNotificationAt || accountStripe.providerMonthlyLastNotificationAt || '').trim();
  const providerMonthlyLastNotificationPeriod = String(providerSummary.providerSubscriptionLastNotificationPeriod || accountStripe.providerMonthlyLastNotificationPeriod || '').trim();
  const stripeReady = Boolean(stripe?.configured);
  const betaBillingPaused = Boolean(stripe?.billingPaused || auth?.billingPaused);
  if (betaBillingPaused) {
    safeText(els.stripeCustomerStatus, [
      'Platform: beta mode',
      'Live billing: paused',
      `Charge model shown for activation readiness: ${displayMode}`,
      `Saved payment method: ${savedCard ? 'yes' : 'no'}`,
      'Orders and account registration remain available within the $10 per-account beta credit allowance.',
      'Activation: set BILLING_ACTIVATION_ENABLED=1 or BETA_BILLING_PAUSED=0 on the platform.'
    ].join('\n'));
    safeText(els.stripeProviderStatus, [
      'Platform: beta mode',
      'Provider earnings and payout movement: paused',
      `Provider enabled: ${providerEnabled ? 'yes' : 'no'}`,
      `Identity verification: ${identityVerificationStatus}`,
      `Withdrawable ledger balance: ${yen(providerPending)}`,
      'Provider identity/admin approval can be prepared now; payout movement stays locked until billing activation.'
    ].join('\n'));
    safeText(els.stripeCustomerActionResult, 'Beta mode is active. Each account can use up to $10 in credits. Hosted checkout, card setup, monthly charges, and subscription checkout are disabled, but the Stripe billing contracts remain ready for activation.');
    safeText(els.stripeProviderActionResult, connectReady
      ? 'Provider setup is ready. Payout movement remains paused during beta.'
      : 'Provider setup can be prepared, but payouts and provider monthly charges remain paused during beta.');
    if (els.createStripeSetupSessionBtn) {
      els.createStripeSetupSessionBtn.textContent = 'BILLING PAUSED';
      els.createStripeSetupSessionBtn.title = 'Live customer billing is disabled during beta.';
    }
    if (els.createStripeSubscriptionSessionBtn) {
      els.createStripeSubscriptionSessionBtn.textContent = 'CHECKOUT PAUSED';
      els.createStripeSubscriptionSessionBtn.title = 'Subscription checkout is disabled during beta.';
    }
    if (els.createStripeConnectOnboardingBtn) {
      els.createStripeConnectOnboardingBtn.textContent = connectActionLabel;
      els.createStripeConnectOnboardingBtn.title = canManagePayouts && stripeReady && !connectReady
        ? 'Prepare provider payout identity now; payout movement stays paused until activation.'
        : (connectReady ? 'Provider setup is ready; payout movement is paused during beta.' : 'Connect GitHub first to manage provider onboarding.');
    }
    if (els.runStripeProviderMonthlyChargeBtn) {
      els.runStripeProviderMonthlyChargeBtn.textContent = 'MONTHLY BILLING PAUSED';
      els.runStripeProviderMonthlyChargeBtn.title = 'Provider monthly charging is disabled during beta.';
    }
    if (els.runStripeProviderPayoutBtn) {
      els.runStripeProviderPayoutBtn.textContent = 'PAYOUT PAUSED';
      els.runStripeProviderPayoutBtn.title = 'Provider payout movement is disabled during beta.';
    }
    setButtonAccess(els.createStripeSetupSessionBtn, false);
    setButtonAccess(els.createStripeSubscriptionSessionBtn, false);
    setButtonAccess(els.createStripeConnectOnboardingBtn, canManagePayouts && stripeReady && !connectReady);
    setButtonAccess(els.runStripeProviderMonthlyChargeBtn, false);
    setButtonAccess(els.runStripeProviderPayoutBtn, false);
    return;
  }
  if (TEMPORARY_INVOICE_BILLING_ENABLED) {
    const cardSetupReady = STRIPE_CARD_SETUP_DURING_TEMPORARY_BILLING_ENABLED && canManagePayments && stripeReady;
    const customerLines = [
      'Platform: temporary invoice/manual billing',
      `Charge model: ${displayMode}`,
      `Saved payment method: ${savedCard ? 'yes' : 'no'}${STRIPE_CARD_SETUP_DURING_TEMPORARY_BILLING_ENABLED ? ' (payment-method setup is available for future month-end billing)' : ''}`,
      `Plan: ${subscriptionPlanLabel(activePlan)} (${accountStripe.subscriptionStatus || 'manual_or_not_started'})`,
      `Payment-method setup: ${cardSetupReady ? 'available' : (stripeReady ? 'sign in required' : 'platform incomplete')}`,
      'Order billing: invoice/manual confirmation for now',
      `Next step: ${savedCard ? 'card is registered; continue using monthly invoice/manual billing until automated charging is re-enabled.' : 'register a card if available, or request an invoice for manual credits.'}`
    ];
    const providerLines = [
      'Platform: temporary manual payout handling',
      `Provider enabled: ${providerEnabled ? 'yes' : 'no'}`,
      `GitHub linked: ${canManagePayouts ? 'yes' : 'no'}`,
      `Provider monthly due now: ${yen(providerMonthlyDue)}`,
      `Withdrawable now: ${yen(providerPending)}`,
      `Paid out total: ${yen(providerPaid)}`,
      `Minimum withdrawal: ${yen(providerMinimum)}`,
      'External payout setup: paused',
      `Next step: contact ${TEMPORARY_INVOICE_SUPPORT_EMAIL} for manual payout follow-up during this temporary period.`
    ];
    safeText(els.stripeCustomerStatus, customerLines.join('\n'));
    safeText(els.stripeProviderStatus, providerLines.join('\n'));
    safeText(els.stripeCustomerActionResult, [
      ...temporaryInvoiceNoticeLines('payment'),
      '',
      'REQUEST INVOICE saves a support request and forwards it by email.',
      'REQUEST PLAN INVOICE does the same for STARTER or PRO.',
      STRIPE_CARD_SETUP_DURING_TEMPORARY_BILLING_ENABLED
        ? 'Payment-method setup opens a hosted setup page only. Orders still use monthly invoice/manual confirmation until automated billing is explicitly re-enabled.'
        : 'Card setup is paused in this temporary mode.'
    ].join('\n'));
    safeText(els.stripeProviderActionResult, [
      ...temporaryInvoiceNoticeLines('payout'),
      '',
      'Provider earnings remain tracked in the ledger.',
      'CONNECT and automated withdrawals are disabled until the payment processor path is restored or replaced.'
    ].join('\n'));
    if (els.createStripeSubscriptionSessionBtn) {
      els.createStripeSubscriptionSessionBtn.textContent = 'REQUEST PLAN INVOICE';
      els.createStripeSubscriptionSessionBtn.title = canManagePayments ? '' : 'Sign in first to request a plan invoice.';
    }
    if (els.createStripeSetupSessionBtn) {
      els.createStripeSetupSessionBtn.textContent = savedCard ? 'CARD REGISTERED' : 'REGISTER CARD';
      els.createStripeSetupSessionBtn.title = cardSetupReady
        ? 'Open hosted payment-method setup for future month-end billing.'
        : (stripeReady ? 'Sign in first to register a payment method.' : 'Payment provider is not ready on the platform.');
    }
    if (els.createStripeConnectOnboardingBtn) {
      els.createStripeConnectOnboardingBtn.textContent = 'CONNECT PAUSED';
      els.createStripeConnectOnboardingBtn.title = 'External payout onboarding is paused during temporary manual payout handling.';
    }
    if (els.runStripeProviderMonthlyChargeBtn) {
      els.runStripeProviderMonthlyChargeBtn.textContent = 'MONTHLY BILLING PAUSED';
      els.runStripeProviderMonthlyChargeBtn.title = 'Provider monthly SaaS charging is paused during temporary billing mode.';
    }
    if (els.runStripeProviderPayoutBtn) {
      els.runStripeProviderPayoutBtn.textContent = 'REQUEST MANUAL PAYOUT';
      els.runStripeProviderPayoutBtn.title = 'Automated provider withdrawal is paused. Contact support for manual payout handling.';
    }
    const manualPayoutReady = canManagePayouts && providerEnabled && identityVerified && providerPending >= providerMinimum && providerPending > 0;
    setButtonAccess(els.createStripeSubscriptionSessionBtn, canManagePayments);
    setButtonAccess(els.createStripeSetupSessionBtn, cardSetupReady && !savedCard);
    setButtonAccess(els.createStripeConnectOnboardingBtn, false);
    setButtonAccess(els.runStripeProviderMonthlyChargeBtn, false);
    setButtonAccess(els.runStripeProviderPayoutBtn, manualPayoutReady);
    if (els.runStripeProviderPayoutBtn && !manualPayoutReady) {
      els.runStripeProviderPayoutBtn.title = providerPending < providerMinimum
        ? `Minimum manual payout request is ${yen(providerMinimum)}.`
        : (!identityVerified
          ? 'Complete payout-provider identity verification before requesting manual settlement handling.'
          : 'Enable the provider profile and link GitHub before requesting manual payout.');
    }
    return;
  }
  const subscriptionCheckoutReady = canManagePayments && stripeReady;
  const cardSetupReady = canManagePayments && stripeReady && !savedCard;
  if (els.payoutWithdrawAmount) {
    const nextSuggestedWithdrawal = providerPending > 0 ? moneyInputValueFromLedger(providerPending) : '';
    if (document.activeElement !== els.payoutWithdrawAmount && !String(els.payoutWithdrawAmount.value || '').trim()) {
      els.payoutWithdrawAmount.value = nextSuggestedWithdrawal;
    }
  }
  let nextStep = 'Payments look ready.';
  if (!stripe?.configured) nextStep = 'Platform payment-provider setup is incomplete. Hosted pages may not open.';
  else if (monthlyBillingSelected && !savedCard) nextStep = 'Use REGISTER CARD to enable month-end billing. No order is charged until it is dispatched and settled.';
  else if (monthlyBillingSelected && !monthlyBillingReady) nextStep = 'Card registration is needed before month-end billing can dispatch paid work.';
  else if (monthlyBillingReady) nextStep = 'Month-end billing is ready. Orders accrue through the month and are charged after closing.';
  else if (activePlan !== 'none' && String(accountStripe.subscriptionStatus || 'not_started') === 'not_started') nextStep = `Use OPEN PLAN CHECKOUT to activate ${activePlan}.`;
  else if (providerEnabled && !connectReady) nextStep = `Use ${connectActionLabel} to finish provider onboarding.`;
  let providerNextStep = 'Enable provider profile only if this account receives revenue share.';
  if (!canManagePayouts) {
    providerNextStep = 'Connect GitHub first. Provider onboarding and withdrawals require a GitHub-linked account.';
  } else if (!stripeReady) {
    providerNextStep = 'Platform payout-provider setup is incomplete.';
  } else if (providerEnabled && !identityVerified) {
    providerNextStep = `Use ${connectActionLabel} to complete identity verification before withdrawals.`;
  } else if (providerEnabled && !(providerPending > 0)) {
    providerNextStep = 'No provider earnings are available to withdraw yet.';
  } else if (providerEnabled && providerPending < providerMinimum) {
    providerNextStep = `Accrue at least ${yen(providerMinimum)} before withdrawal.`;
  } else if (providerEnabled) {
    providerNextStep = 'Provider withdrawal is available.';
  }
  let providerMonthlyChargeDisabledReason = '';
  if (!canManagePayments) providerMonthlyChargeDisabledReason = 'Sign in first to manage payment methods for provider monthly billing.';
  else if (!stripeReady) providerMonthlyChargeDisabledReason = 'Payment provider is not ready on the platform.';
  else if (!(providerMonthlyAgentCount > 0)) providerMonthlyChargeDisabledReason = 'No provider monthly SaaS agents are declared for this account.';
  else if (!savedCard) providerMonthlyChargeDisabledReason = 'Register a card first so provider monthly SaaS fees can be charged off-session.';
  else if (!(providerMonthlyDue > 0)) providerMonthlyChargeDisabledReason = 'No provider monthly SaaS amount is due for this period.';
  const providerMonthlyChargeReady = !providerMonthlyChargeDisabledReason;
  let withdrawDisabledReason = '';
  if (!canManagePayouts) withdrawDisabledReason = 'Connect GitHub first to manage provider withdrawals.';
  else if (!stripeReady) withdrawDisabledReason = 'Payout provider is not ready on the platform.';
  else if (!providerEnabled) withdrawDisabledReason = 'Enable and save the provider profile before withdrawing.';
  else if (!identityVerified) withdrawDisabledReason = `${connectActionLabel} first to complete payout-provider identity verification.`;
  else if (!(providerPending > 0)) withdrawDisabledReason = 'No provider earnings are available to withdraw yet.';
  else if (providerPending < providerMinimum) withdrawDisabledReason = `Minimum withdrawal is ${yen(providerMinimum)}.`;
  const withdrawReady = !withdrawDisabledReason;
  const customerLines = [
    `Platform: ${stripe?.configured ? 'ready' : 'incomplete'}`,
    `Charge model: ${displayMode}`,
    `Active settlement mode: ${mode}`,
    `Month-end amount due: ${yen(billingProfile?.arrearsTotal || 0)}`,
    `Saved payment method: ${savedCard ? 'yes' : 'no'} (payment-method setup enables month-end billing)`,
    `Plan: ${subscriptionPlanLabel(activePlan)} (${accountStripe.subscriptionStatus || 'not_started'})`,
    `Next renewal: ${accountStripe.subscriptionCurrentPeriodEnd ? formatTime(accountStripe.subscriptionCurrentPeriodEnd) : '-'}`,
    `Next step: ${nextStep}`
  ];
  const providerLines = [
    `Platform: ${stripe?.configured ? 'ready' : 'incomplete'}`,
    `Provider enabled: ${providerEnabled ? 'yes' : 'no'}`,
    `GitHub linked: ${canManagePayouts ? 'yes' : 'no'}`,
    `Connect status: ${displayPayoutStatus}`,
    `Connect details submitted: ${connectDetailsSubmitted ? 'yes' : 'no'}`,
    `Identity verified for payout: ${identityVerified ? 'yes' : 'no'} (${identityVerificationStatus})`,
    `Transfers capability: ${transferCapabilityStatus}`,
    `Stripe requirements clear: ${stripeRequirementsClear ? 'yes' : 'no'}`,
    requirementsCurrentDue.length ? `Requirements currently due: ${requirementsCurrentDue.join(', ')}` : null,
    requirementsPastDue.length ? `Requirements past due: ${requirementsPastDue.join(', ')}` : null,
    requirementsDisabledReason ? `Requirements disabled reason: ${requirementsDisabledReason}` : null,
    `Charges enabled: ${chargesEnabled ? 'yes' : 'no'}`,
    `Payouts enabled: ${payoutsEnabled ? 'yes' : 'no'}`,
    `Connected account: ${accountStripe.connectedAccountId || 'not created'}`,
    `Order payout lane withdrawable now: ${yen(providerPending)}`,
    `Provider monthly SaaS lane declared: ${yen(providerMonthlyDeclared)}`,
    `Provider monthly SaaS lane charged this period: ${yen(providerMonthlyCharged)}`,
    `Provider monthly SaaS lane pending/non-final: ${yen(providerMonthlyPending)}`,
    `Provider monthly SaaS lane due now: ${yen(providerMonthlyDue)}`,
    `Provider monthly auto-run: ${providerMonthlyAutoEnabled ? 'enabled every 15 minutes when due' : 'disabled'}`,
    `Provider monthly max attempts: ${providerMonthlyMaxAttempts}`,
    `Provider monthly retry state: ${providerMonthlyRetryPeriod ? `${providerMonthlyRetryPeriod} · ${providerMonthlyRetryCount}/${providerMonthlyMaxAttempts}` : 'clear'}`,
    `Provider monthly latest failure: ${providerMonthlyLastFailureAt ? `${formatTime(providerMonthlyLastFailureAt)} · ${providerMonthlyLastFailureMessage || '-'}` : 'none'}`,
    `Provider monthly failure notice: ${providerMonthlyLastNotificationPeriod ? `${providerMonthlyLastNotificationPeriod} (${formatTime(providerMonthlyLastNotificationAt)})` : 'not sent'}`,
    `CAIt take from provider monthly SaaS lane: ${yen(providerSummary.providerSubscriptionMarketplaceFee || 0)}`,
    `Provider monthly SaaS net after CAIt fee: ${yen(providerSummary.providerSubscriptionProviderNet || 0)}`,
    `Last provider monthly charge: ${providerMonthlyLastRun?.createdAt ? `${formatTime(providerMonthlyLastRun.createdAt)} (${yen(providerMonthlyLastRun.amount || 0)} · ${providerMonthlyLastRun.status || 'unknown'})` : '-'}`,
    `Paid out total: ${yen(providerPaid)}`,
    `Minimum withdrawal: ${yen(providerMinimum)}`,
    `Last withdrawal: ${account?.payout?.lastPayoutAt ? `${formatTime(account.payout.lastPayoutAt)} (${yen(account?.payout?.lastPayoutAmount || 0)})` : '-'}`,
    `Next step: ${providerNextStep}`
  ];
  safeText(els.stripeCustomerStatus, customerLines.join('\n'));
  safeText(els.stripeProviderStatus, providerLines.filter(Boolean).join('\n'));
  safeText(els.stripeCustomerActionResult, [
    'Payment-method setup opens a hosted setup page and enables month-end billing after confirmation.',
    'Month-end billing accrues settled order costs through the month, then charges the saved card after closing.',
    'OPEN PLAN CHECKOUT opens a popup where you choose STARTER or PRO first.'
  ].join('\n'));
  safeText(els.stripeProviderActionResult, [
    connectReady
      ? 'External payouts are enabled after payout-provider identity verification.'
      : canManagePayouts
        ? `${connectActionLabel} ${connectStarted ? 'continues' : 'starts'} payout-provider identity verification and payout setup before earnings can be withdrawn.`
      : 'Connect GitHub first. Provider setup and withdrawals are restricted to GitHub-linked accounts.',
    providerMonthlyChargeReady
      ? `RUN PROVIDER MONTHLY BILLING will charge ${yen(providerMonthlyDue)} for ${state.settingsPeriod || currentMonthPeriod()} using the saved card on this account.`
      : `Provider monthly SaaS billing is locked: ${providerMonthlyChargeDisabledReason}`,
    providerMonthlyLastFailureMessage
      ? `Latest provider monthly failure: ${providerMonthlyLastFailureMessage}${providerMonthlyRetryPeriod ? ` · retry ${providerMonthlyRetryCount}/${providerMonthlyMaxAttempts} for ${providerMonthlyRetryPeriod}` : ''}`
      : `Auto-run policy: ${providerMonthlyAutoEnabled ? `enabled with up to ${providerMonthlyMaxAttempts} attempts per period.` : 'disabled.'}`,
    withdrawReady
      ? `Provider withdrawal moves earnings from ${PRODUCT_NAME} only after payout-provider identity verification is complete.`
      : `Provider withdrawal is locked: ${withdrawDisabledReason}`,
    'Leave the amount blank to withdraw the full available balance.',
    'Use these only if this account receives revenue share.'
  ].join('\n'));
  setButtonAccess(els.createStripeSetupSessionBtn, cardSetupReady);
  setButtonAccess(els.createStripeSubscriptionSessionBtn, subscriptionCheckoutReady);
  setButtonAccess(els.createStripeConnectOnboardingBtn, canManagePayouts && stripeReady && !connectReady);
  setButtonAccess(els.runStripeProviderMonthlyChargeBtn, providerMonthlyChargeReady);
  setButtonAccess(els.runStripeProviderPayoutBtn, withdrawReady);
  if (els.createStripeSetupSessionBtn) {
    els.createStripeSetupSessionBtn.textContent = savedCard ? 'CARD REGISTERED' : 'REGISTER CARD';
    els.createStripeSetupSessionBtn.title = cardSetupReady
      ? 'Open hosted payment-method setup for month-end billing.'
      : (savedCard ? 'A saved card is already on file.' : 'Sign in first to manage payments.');
  }
  if (els.createStripeSubscriptionSessionBtn) {
    els.createStripeSubscriptionSessionBtn.textContent = 'OPEN PLAN CHECKOUT';
    els.createStripeSubscriptionSessionBtn.title = subscriptionCheckoutReady ? '' : (canManagePayments ? 'Payment provider is not ready on the platform.' : 'Sign in first to manage payments.');
  }
  if (els.createStripeConnectOnboardingBtn) {
    els.createStripeConnectOnboardingBtn.textContent = connectActionLabel;
    els.createStripeConnectOnboardingBtn.title = connectReady
      ? 'External payouts are enabled.'
      : canManagePayouts && stripeReady
        ? ''
        : 'Connect GitHub first to manage provider onboarding.';
  }
  if (els.runStripeProviderMonthlyChargeBtn) {
    els.runStripeProviderMonthlyChargeBtn.textContent = 'RUN PROVIDER MONTHLY BILLING';
    els.runStripeProviderMonthlyChargeBtn.title = providerMonthlyChargeReady ? '' : providerMonthlyChargeDisabledReason;
  }
  if (els.runStripeProviderPayoutBtn) {
    els.runStripeProviderPayoutBtn.title = withdrawReady ? '' : withdrawDisabledReason;
  }
}

function stripeActionOutputElement(target = 'customer') {
  return target === 'provider' ? els.stripeProviderActionResult : els.stripeCustomerActionResult;
}

function stripeFriendlyErrorInfo(error = {}) {
  const data = error?.data && typeof error.data === 'object' ? error.data : {};
  const rawMessage = String(data.error || error?.message || error || 'Hosted payment action failed.').trim();
  const code = String(data.code || data.stripe_code || '').trim();
  const status = Number(error?.status || data.statusCode || data.stripe_status || 0);
  const lower = `${rawMessage} ${code}`.toLowerCase();
  let title = 'Hosted payment action failed';
  let action = String(data.action || '').trim();
  if (/beta_billing_paused|billing.*paused|checkout.*paused|charges?.*paused|payout.*paused/.test(lower)) {
    title = 'Billing is paused during beta';
    action = action || 'Account and agent workflows remain available. Platform billing can be reactivated later by enabling BILLING_ACTIVATION_ENABLED.';
  } else if (/not configured|stripe_not_configured/.test(lower)) {
    title = 'Payment provider is not configured';
    action = action || 'Check payment-provider settings on the platform, then retry.';
  } else if (/invalid email|email address/.test(lower)) {
    title = 'Payment provider rejected the email address';
    action = action || 'Open SETTINGS, update the billing/provider email, save, then retry.';
  } else if (/connect.*not enabled|signed up for connect|connect_not_enabled/.test(lower)) {
    title = 'External payout onboarding is not enabled';
    action = action || 'Complete payment-provider platform activation, then retry payout onboarding.';
  } else if (/restricted|prohibited|not allowed|unsupported business|risk/.test(lower)) {
    title = 'Payment provider blocked this business or account state';
    action = action || 'Remove prohibited categories, confirm the platform account status, then retry.';
  } else if (/authentication|api key|invalid api key/.test(lower)) {
    title = 'Payment provider API authentication failed';
    action = action || 'Check the payment provider secret key and make sure test/live mode matches the account.';
  } else if (/popup|blocked/.test(lower)) {
    title = 'Payment popup was blocked';
    action = action || 'Allow popups for this site or use the hosted URL shown in SETTINGS.';
  }
  return {
    title,
    message: rawMessage,
    action,
    code,
    status
  };
}

async function launchStripeHostedAction(path, payload = {}, options = {}) {
  let popup = null;
  const outputEl = stripeActionOutputElement(options.output);
  try {
    popup = window.open('', '_blank');
    if (popup && !popup.closed) {
      try {
        popup.document.title = 'Opening payment page...';
        popup.document.body.innerHTML = '<pre style="font:16px monospace;padding:24px;background:#0a1020;color:#dff7ff">Opening payment page...</pre>';
      } catch {}
    }
  } catch {
    popup = null;
  }
  try {
    const response = await api(path, {
      method: 'POST',
      body: JSON.stringify(payload || {})
    });
    const hostedUrl = response.checkout_url || response.onboarding_url || '';
    if (String(path || '').includes('/subscription-session')) {
      void trackConversionEvent('begin_checkout', {
        source: 'stripe',
        status: 'checkout_opened',
        plan: response.plan || payload?.plan || '',
        sessionId: response.session_id || ''
      });
    }
    const lines = [];
    if (options.title) lines.push(options.title);
    if (response.plan) lines.push(`Plan: ${response.plan}`);
    if (Number.isFinite(Number(response.amount))) lines.push(`Amount: ${yen(response.amount)}`);
    if (response.session_id) lines.push(`Session: ${response.session_id}`);
    if (response.payment_intent_id) lines.push(`Payment intent: ${response.payment_intent_id}`);
    if (response.account_id) lines.push(`Connected account: ${response.account_id}`);
    if (hostedUrl) lines.push(hostedUrl);
    safeText(outputEl, lines.length ? lines.join('\n') : JSON.stringify(response, null, 2));
    if (hostedUrl) {
      if (popup && !popup.closed) {
        try { popup.opener = null; } catch {}
        popup.location.replace(hostedUrl);
        flash(options.successMessage || 'Opened hosted payment page in a new tab.', 'ok');
      } else {
        const opened = window.open(hostedUrl, '_blank', 'noopener');
        flash(
          opened
            ? (options.successMessage || 'Opened hosted payment page in a new tab.')
            : 'Hosted payment URL is ready. Popup was blocked, so open the URL shown in SETTINGS.',
          'ok'
        );
      }
    } else {
      if (popup && !popup.closed) popup.close();
      flash(options.successMessage || 'Hosted payment action completed.', 'ok');
    }
    await refresh();
    return response;
  } catch (error) {
    const friendly = stripeFriendlyErrorInfo(error);
    const message = [
      friendly.title,
      '',
      friendly.message,
      friendly.action ? `Next step: ${friendly.action}` : '',
      friendly.code ? `Code: ${friendly.code}` : '',
      friendly.status ? `HTTP: ${friendly.status}` : ''
    ].filter(Boolean).join('\n');
    if (popup && !popup.closed) {
      try {
        popup.document.title = friendly.title;
        popup.document.body.innerHTML = `<pre style="font:16px monospace;padding:24px;background:#0a1020;color:#ffd7d7;white-space:pre-wrap">${escapeHtml(message)}\n\nReturn to ${escapeHtml(PRODUCT_NAME)} and retry.</pre>`;
      } catch {}
    }
    safeText(outputEl, message);
    throw error;
  }
}

function renderSettings(account, monthlySummary, auth) {
  if (!els.settingsAccessCard) return;
  const loggedIn = Boolean(auth?.loggedIn && auth?.user?.login);
  const canReviewReports = Boolean(auth?.canReviewFeedbackReports);
  state.settingsPeriod = state.settingsPeriod || currentMonthPeriod();
  setInputValue(els.settingsPeriod, state.settingsPeriod);
  if (!loggedIn) {
    state.lastIssuedOrderApiKey = null;
    toggleSettingsInputs(true);
    if (els.settingsAccessCard) {
      els.settingsAccessCard.textContent = [
        'Sign in to manage account actions.',
        '',
        'Google login: order work and account settings. External API keys are coming soon.',
        'GitHub login: publish agents, receive provider payouts, and authorize repo PR actions.',
        '',
        'Use the tabs below to see each setup area. Sign in before changing settings.'
      ].join('\n');
    }
    renderSummaryRows(els.settingsStatus, [
      { label: 'Status', value: 'Login required' },
      { label: 'What this page does', value: 'Payments, provider setup, and coming-soon developer surfaces' }
    ]);
    renderSummaryRows(els.monthlySummaryCard, [
      { label: 'Monthly summary', value: 'Unavailable while logged out' }
    ]);
    renderSummaryRows(els.billingSnapshotCard, []);
    renderSummaryRows(els.billingSummaryCard, []);
    safeText(els.providerBillingLanesCard, 'Login required.\n\nProvider monthly SaaS billing and payout lanes are visible after login.');
    renderOrderApiKeys(null, auth);
    renderStripeTools(null, auth);
    renderMonthlyCustomerRuns([]);
    renderMonthlyProviderRuns([]);
    return;
  }
  toggleSettingsInputs(false);
  const billing = account?.billing || {};
  const payout = account?.payout || {};
  const readiness = monthlySummary?.readiness || {};
  const customerSummary = monthlySummary?.customer || {};
  const providerSummary = monthlySummary?.provider || {};
  setInputValue(els.billingLegalName, billing.legalName);
  setInputValue(els.billingCompanyName, billing.companyName);
  setInputValue(els.billingEmail, billing.billingEmail);
  setInputValue(els.billingPhone, billing.billingPhone);
  setInputValue(els.billingPostalCode, billing.billingPostalCode);
  setInputValue(els.billingRegion, billing.billingRegion);
  setInputValue(els.billingCity, billing.billingCity);
  setInputValue(els.billingAddressLine1, billing.billingAddressLine1);
  setInputValue(els.billingAddressLine2, billing.billingAddressLine2);
  setInputValue(els.billingCountry, billing.country || 'JP');
  setInputValue(els.billingCurrency, billing.currency || 'USD');
  setInputValue(els.billingMode, billing.mode || 'monthly_invoice');
  setInputValue(els.billingSubscriptionPlan, billing.subscriptionPlan || 'none');
  setInputValue(els.billingSubscriptionOverageMode, billing.subscriptionOverageMode || 'monthly_invoice');
  setInputValue(els.billingTaxId, billing.taxId);
  setInputValue(els.billingPurchaseOrderRef, billing.purchaseOrderRef);
  setInputValue(els.billingInvoiceMemo, billing.invoiceMemo);
  setInputValue(els.billingDueDays, billing.dueDays || 14);
  setInputValue(els.payoutProviderEnabled, String(Boolean(payout.providerEnabled)));
  setInputValue(els.payoutEntityType, payout.entityType || 'individual');
  setInputValue(els.payoutLegalName, payout.legalName);
  setInputValue(els.payoutDisplayName, payout.displayName);
  setInputValue(els.payoutEmail, payout.payoutEmail);
  setInputValue(els.payoutCountry, payout.country || 'JP');
  setInputValue(els.payoutCurrency, payout.currency || 'USD');
  setInputValue(els.payoutSupportEmail, payout.supportEmail);
  setInputValue(els.payoutMinimumAmount, moneyInputValueFromLedger(payout.minimumPayoutAmount || DEFAULT_MINIMUM_PAYOUT_AMOUNT));
  setInputValue(els.payoutWebsite, payout.website);
  setInputValue(els.payoutStatementDescriptor, payout.statementDescriptor);
  setInputValue(els.payoutNotes, payout.notes);

  if (els.settingsAccessCard) {
    const reviewText = canReviewReports ? ', FUNNEL to check conversion, or REPORTS to review feedback.' : '.';
    els.settingsAccessCard.textContent = `Signed in as ${account?.login || auth.user.login}. Google or GitHub login can register billing in PAYMENTS. GitHub link is required for adapter PRs and PROVIDER actions${reviewText}`;
  }
  const orderKeys = account?.apiAccess?.orderKeys || [];
  const activeOrderKeys = orderKeys.filter((key) => key.active);
  const liveOrderKeys = activeOrderKeys.filter((key) => String(key.mode || 'live').toLowerCase() === 'live');
  const testOrderKeys = activeOrderKeys.filter((key) => String(key.mode || 'live').toLowerCase() === 'test');
  renderSummaryRows(els.billingSnapshotCard, [
    { label: 'Welcome credits', value: pointsLabel(customerSummary.welcomeCreditsAvailable ?? billing.welcomeCreditsBalance ?? 0) },
    { label: 'Saved card billing', value: account?.stripe?.defaultPaymentMethodId || account?.stripe?.defaultPaymentMethodStatus === 'ready' ? 'ready' : 'card required' },
    { label: 'Month-end amount due', value: yen(customerSummary.arrearsTotal ?? billing.arrearsTotal ?? 0) },
    { label: 'Reserved credits', value: yen(customerSummary.welcomeCreditsReserved ?? billing.welcomeCreditsReserved ?? 0) },
    { label: 'Subscription plan', value: subscriptionPlanLabel(account?.stripe?.subscriptionPlan || customerSummary.subscriptionPlan || billing.subscriptionPlan || 'none') },
    { label: 'Plan included usage', value: yen(customerSummary.subscriptionIncludedCredits ?? billing.subscriptionIncludedCredits ?? 0) },
    { label: 'Next renewal', value: account?.stripe?.subscriptionCurrentPeriodEnd ? formatTime(account.stripe.subscriptionCurrentPeriodEnd) : '-' },
    { label: 'Arrears', value: yen(customerSummary.arrearsTotal ?? billing.arrearsTotal ?? 0) }
  ]);
  renderSummaryRows(els.billingSummaryCard, [
    { label: 'Welcome credits', value: pointsLabel(customerSummary.welcomeCreditsAvailable ?? billing.welcomeCreditsBalance ?? 0) },
    { label: 'Saved card', value: account?.stripe?.defaultPaymentMethodId || account?.stripe?.defaultPaymentMethodStatus === 'ready' ? 'ready' : 'not registered' },
    { label: 'Month-end amount due', value: yen(customerSummary.arrearsTotal ?? billing.arrearsTotal ?? 0) },
    { label: 'Reserved credits', value: yen(customerSummary.welcomeCreditsReserved ?? billing.welcomeCreditsReserved ?? 0) },
    { label: 'Plan included usage remaining', value: yen(customerSummary.subscriptionCreditsAvailable ?? 0) }
  ]);
  renderSummaryRows(els.settingsStatus, [
    { label: 'Account', value: account?.login || auth.user.login },
    { label: 'Orders pay from', value: billing.mode || 'monthly_invoice' },
    { label: 'Provider profile', value: Boolean(payout.providerEnabled) ? 'enabled' : 'disabled' },
    { label: 'CAIt API keys', value: DEVELOPER_SURFACES_STATUS },
    { label: 'Live/test keys', value: 'Paused until external contract stabilizes' }
  ]);
  renderSummaryRows(els.monthlySummaryCard, [
    { label: 'Period', value: monthlySummary?.period || state.settingsPeriod },
    { label: 'End-user spend this month', value: yen(customerSummary.totalSpent || customerSummary.totalDue || 0) },
    { label: 'Welcome credits', value: pointsLabel(customerSummary.welcomeCreditsAvailable || 0) },
    { label: 'Month-end amount due', value: yen(customerSummary.arrearsTotal || 0) },
    { label: 'Plan included usage', value: yen(customerSummary.subscriptionIncludedCredits || 0) },
    { label: 'Provider order payouts', value: yen(providerSummary.grossPayout || 0) },
    { label: 'Provider monthly SaaS fees', value: yen(providerSummary.providerSubscriptionMonthlyPrice || 0) },
    { label: 'CAIt take from provider monthly SaaS fees', value: yen(providerSummary.providerSubscriptionMarketplaceFee || 0) },
    { label: 'Billing ready', value: Boolean(readiness.billingReady) ? 'yes' : 'no' },
    { label: 'Payout ready', value: Boolean(readiness.payoutReady) ? 'yes' : 'no' }
  ]);
  renderProviderBillingLanesCard(providerSummary);
  renderOrderApiKeys(account, auth);
  renderStripeTools(account, auth);
}

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

function applyRepoFilter() {
  const q = (els.repoSearch?.value || '').trim().toLowerCase();
  state.filteredRepos = !q ? [...state.repos] : state.repos.filter((repo) => `${repo.fullName} ${repo.description || ''}`.toLowerCase().includes(q));
  state.repoPage = 0;
  renderRepoPicker();
}

function renderRepoPicker() {
  if (!els.repoPicker) return;
  const start = state.repoPage * state.repoPageSize;
  const items = state.filteredRepos.slice(start, start + state.repoPageSize);
  els.repoPicker.innerHTML = '';
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = items.length ? 'Select GitHub repo...' : 'No repos found';
  els.repoPicker.appendChild(placeholder);
  if (items.length) {
    items.forEach((repo) => {
      const option = document.createElement('option');
      option.value = String(repo.fullName || '');
      option.textContent = `${repo.fullName}${repo.private ? ' 🔒' : ''}`;
      els.repoPicker.appendChild(option);
    });
  }
  els.repoPicker.value = items.some((repo) => String(repo.fullName || '') === state.selectedRepoFullName)
    ? state.selectedRepoFullName
    : '';
  const totalPages = Math.max(1, Math.ceil(state.filteredRepos.length / state.repoPageSize));
  if (els.repoPagerStatus) els.repoPagerStatus.textContent = `${state.filteredRepos.length} repos / page ${state.repoPage + 1} of ${totalPages}`;
  if (els.repoPrevBtn) els.repoPrevBtn.disabled = state.repoPage <= 0;
  if (els.repoNextBtn) els.repoNextBtn.disabled = state.repoPage >= totalPages - 1;
}

function resetRepoPicker(message = 'Login first, then load repos.') {
  state.repos = [];
  state.filteredRepos = [];
  state.repoPage = 0;
  state.selectedRepoFullName = '';
  renderRepoPicker();
  if (els.repoPreview) els.repoPreview.textContent = message;
}

async function loadGithubRepos(options = {}) {
  const { silent = false, previewMessage = '' } = options;
  const res = await api('/api/github/repos');
  state.repos = res.repos || [];
  state.filteredRepos = [...state.repos];
  state.repoPage = 0;
  renderRepoPicker();
  renderAgentSetupFlow(state.snapshot?.auth);
  if (els.repoPreview) {
    const defaultMessage = state.repos.length
      ? `Repos loaded via ${res.auth_provider || 'github-oauth'} (${res.access_mode || 'public-only'}). Select one.`
      : 'No repos found. Open INSTALL OR CONFIGURE APP, add the repo in GitHub, save, then return and click LOAD MY REPOS.';
    els.repoPreview.textContent = previewMessage || defaultMessage;
  }
  if (!silent) flash(
    state.repos.length
      ? `Loaded ${state.repos.length} repos via ${res.auth_provider || 'github-oauth'} (${res.access_mode || 'public-only'}).`
      : 'GitHub connected, but no installation repos are available yet. Open INSTALL OR CONFIGURE APP, add the repo, save, then load repos again.',
    state.repos.length ? 'ok' : 'info'
  );
  void trackConversionEvent('github_repos_loaded', {
    source: silent ? 'auto' : 'button',
    status: state.repos.length ? 'loaded' : 'empty',
    successCount: state.repos.length,
    silent
  });
  return state.repos;
}

async function maybeAutoLoadRepos(auth) {
  const login = auth?.user?.login || '';
  if (!auth?.loggedIn || !login) {
    state.repoAutoLoadedFor = '';
    if (!state.repoAutoLoading) resetRepoPicker();
    return;
  }
  if (!isGithubAuthorized(auth)) {
    state.repoAutoLoadedFor = '';
    if (!state.repoAutoLoading) resetRepoPicker(isGithubLinked(auth)
      ? 'GitHub is linked, but this browser session needs REFRESH GITHUB ACCESS before repo loading.'
      : 'Connect GitHub to load repos.');
    return;
  }
  if (state.repoAutoLoadedFor === login || state.repoAutoLoading) return;
  state.repoAutoLoading = true;
  try {
    const providerLabel = auth?.authProvider === 'github-app' ? 'GitHub App' : 'GitHub OAuth';
    await loadGithubRepos({
      silent: true,
      previewMessage: `${providerLabel} connected. Repos loaded automatically. If none appear, use INSTALL APP and reload.`
    });
    state.repoAutoLoadedFor = login;
    flash(`${providerLabel} active for ${login}. Repos are ready to import.`, 'ok');
  } catch (error) {
    state.repoAutoLoadedFor = '';
    if (els.repoPreview) els.repoPreview.textContent = 'GitHub login succeeded, but repo loading failed. Use LOAD MY REPOS to retry.';
    flash(error.message, 'error');
  } finally {
    state.repoAutoLoading = false;
  }
}

async function loadAgentOnboarding(agentId, options = {}) {
  const agent = state.snapshot?.agents?.find((item) => item.id === agentId) || null;
  if (!agent || !canCheckAgentOnboarding(agent)) return null;
  const cached = currentAgentOnboarding(agentId);
  if (!options.force && cached && onboardingFreshEnough(cached)) return cached;
  if (state.onboardingLoading?.[agentId]) return cached || null;
  state.onboardingLoading[agentId] = true;
  if (state.selectedAgentId === agentId) {
    setAgentDetail(agent);
    renderAgentOnboarding(agent);
  }
  try {
    const result = await api(`/api/agents/${agentId}/onboarding-check`);
    state.agentOnboarding[agentId] = result;
    return result;
  } catch (error) {
    const failed = { error: error.message, checkedAt: new Date().toISOString() };
    state.agentOnboarding[agentId] = failed;
    if (!options.silent) flash(error.message, 'error');
    return failed;
  } finally {
    delete state.onboardingLoading[agentId];
    if (state.snapshot) renderAgents(state.snapshot.agents || []);
    const selected = state.snapshot?.agents?.find((item) => item.id === state.selectedAgentId) || null;
    if (selected) {
      setAgentDetail(selected);
      renderAgentOnboarding(selected);
    }
  }
}

function maybeAutoCheckSelectedAgent(agent) {
  if (!agent || !canCheckAgentOnboarding(agent)) return;
  const cached = currentAgentOnboarding(agent.id);
  if (state.onboardingLoading?.[agent.id]) return;
  if (cached && onboardingFreshEnough(cached)) return;
  void loadAgentOnboarding(agent.id, { force: true, silent: true });
}

async function refresh() {
  const period = encodeURIComponent(state.settingsPeriod || currentMonthPeriod());
  const snapshot = mergeOptimisticOrderJobsIntoSnapshot(await api(`/api/snapshot?period=${period}`));
  state.snapshot = snapshot;
  state.stripeStatus = null;
  render(snapshot);
  syncOpenChatTrackedJobsFromSnapshot(snapshot);
  scheduleLiveSnapshotRefresh(snapshot);
  if (snapshot?.auth?.loggedIn) {
    void api('/api/stripe/status', { preserveAuthOn401: true })
      .then((stripeStatus) => {
        if (state.snapshot !== snapshot) return;
        state.stripeStatus = stripeStatus;
        render(state.snapshot);
      })
      .catch(() => {
        if (state.snapshot === snapshot) state.stripeStatus = null;
      });
  }
  void backfillTrackedJobsIntoSnapshot(snapshot).catch(() => {});
  void maybeAutoLoadRepos(snapshot.auth).catch(() => {});
}

function showSelectedRepo() {
  if (!els.repoPicker || !els.repoPreview) return;
  const repo = selectedRepoFromPicker();
  if (!repo) {
    state.selectedRepoFullName = '';
    els.repoPreview.textContent = 'Select a repo to preview manifest load target.';
    renderAgentSetupFlow(state.snapshot?.auth);
    return;
  }
  state.selectedRepoFullName = String(repo.fullName || '');
  const hint = repoAdapterHint(repo);
  const lines = [
    `Repo: ${repo.fullName}`,
    `Default branch: ${repo.defaultBranch || '-'}`,
    `Visibility: ${repo.private ? 'private' : 'public'}`,
    `Homepage: ${repo.homepage || '-'}`,
    hint.manifestUrl ? `Hosted manifest URL: ${hint.manifestUrl}` : 'Hosted manifest URL: set the repo homepage to your deployed app URL, then create the adapter PR.',
    hint.healthUrl ? `Hosted health URL: ${hint.healthUrl}` : '',
    hint.jobUrl ? `Hosted job URL: ${hint.jobUrl}` : ''
  ].filter(Boolean);
  els.repoPreview.textContent = lines.join('\n');
  renderAgentSetupFlow(state.snapshot?.auth);
}

function selectedRepoFromPicker() {
  const fullName = String(els.repoPicker?.value || '').trim();
  if (!fullName) return null;
  return state.repos.find((repo) => String(repo.fullName || '') === fullName) || null;
}

function normalizePublicBaseUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  try {
    const parsed = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    if (!/^https?:$/i.test(parsed.protocol)) return '';
    return parsed.toString().replace(/\/$/, '');
  } catch {
    return '';
  }
}

function repoAdapterHint(repo = null) {
  if (!repo) return { baseUrl: '', manifestUrl: '', healthUrl: '', jobUrl: '' };
  const cacheKey = `${repo.installationId || 'none'}:${repo.fullName || ''}`;
  const cached = state.repoAdapterHints[cacheKey] || {};
  const baseUrl = normalizePublicBaseUrl(cached.baseUrl || repo.homepage || '');
  return {
    baseUrl,
    manifestUrl: cached.manifestUrl || (baseUrl ? `${baseUrl}/api/aiagent2/manifest` : ''),
    healthUrl: cached.healthUrl || (baseUrl ? `${baseUrl}/api/aiagent2/health` : ''),
    jobUrl: cached.jobUrl || (baseUrl ? `${baseUrl}/api/aiagent2/jobs` : '')
  };
}

function adapterPrPreview(res = {}) {
  const lines = [
    `PR: ${res.pull_request?.htmlUrl || res.pull_request?.html_url || ''}`.trim(),
    `Branch: ${res.branch || ''}`.trim(),
    `Framework: ${res.framework || ''}`.trim(),
    res.deployment_base_url ? `Deploy base URL: ${res.deployment_base_url}` : 'Deploy base URL: set the GitHub repo homepage to your deployed app URL for auto-import.',
    '',
    'Hosted routes after deploy:',
    `${res.manifest_route || '/api/aiagent2/manifest'}`,
    `${res.health_route || '/api/aiagent2/health'}`,
    `${res.job_route || '/api/aiagent2/jobs'}`,
    '',
    res.suggested_manifest_url ? `Suggested manifest URL: ${res.suggested_manifest_url}` : 'Suggested manifest URL: unavailable until the repo homepage points at the deployed app.',
    '',
    `Required env: ${(res.required_env || []).join(', ') || 'OPENAI_API_KEY'}`,
    (res.optional_env || []).length ? `Optional env: ${(res.optional_env || []).join(', ')}` : '',
    '',
    res.next_step || ''
  ].filter(Boolean);
  return lines.join('\n');
}

function setRepoActionPreview(message = '') {
  if (!els.repoPreview) return;
  els.repoPreview.textContent = String(message || '').trim();
}

function setOpenAdapterPr(url = '') {
  const safe = String(url || '').trim();
  if (!els.openAdapterPrBtn) return;
  els.openAdapterPrBtn.hidden = !safe;
  if (safe) els.openAdapterPrBtn.dataset.url = safe;
  else delete els.openAdapterPrBtn.dataset.url;
}

function writeAdapterPrPopup(popup, title, lines = []) {
  if (!popup || popup.closed) return;
  const safeTitle = escapeHtml(String(title || ''));
  const safeBody = lines.map((line) => escapeHtml(String(line || ''))).join('\n');
  popup.document.open();
  popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${safeTitle}</title></head><body style="margin:0;background:#09111f;color:#edf3ff;font:16px 'IBM Plex Sans','IBM Plex Mono','Courier New',monospace;"><pre style="margin:0;padding:24px;white-space:pre-wrap">${safeTitle}\n\n${safeBody}</pre></body></html>`);
  popup.document.close();
}

async function createAdapterPrForRepo(repo, options = {}) {
  if (!repo) throw new Error('Select a repo first.');
  const popupWindow = options.popupWindow || null;
  let res;
  try {
    res = await api('/api/github/create-adapter-pr', {
      method: 'POST',
      body: JSON.stringify({
        owner: repo.owner,
        repo: repo.name,
        installation_id: repo.installationId || undefined,
        confirm_adapter_pr: true
      })
    });
  } catch (error) {
    setOpenAdapterPr('');
    writeAdapterPrPopup(popupWindow, 'Adapter PR creation failed', [
      `Repo: ${repo.fullName}`,
      '',
      String(error.message || error || 'Unknown error'),
      '',
      `Return to ${PRODUCT_NAME} and retry.`
    ]);
    setRepoActionPreview([
      `Adapter PR creation failed for ${repo.fullName}.`,
      '',
      String(error.message || error || 'Unknown error'),
      '',
      'Checks:',
      '- GitHub App permissions must be Contents=read/write and Pull requests=read/write.',
      '- Accept the updated permissions on the installation after changing them.',
      '- CREATE ADAPTER PR supports direct Next.js routes and standalone Worker adapters for other repos.',
      `- ${PRODUCT_SHORT_NAME} refuses to overwrite existing non-marketplace adapter files.`
    ].join('\n'));
    throw error;
  }
  const cacheKey = `${repo.installationId || 'none'}:${repo.fullName || ''}`;
  state.repoAdapterHints[cacheKey] = {
    baseUrl: res.deployment_base_url || repo.homepage || '',
    manifestUrl: res.suggested_manifest_url || '',
    healthUrl: res.suggested_healthcheck_url || '',
    jobUrl: res.suggested_job_url || '',
    pullRequestUrl: res.pull_request?.htmlUrl || res.pull_request?.html_url || ''
  };
  if (els.manifestUrl && res.suggested_manifest_url) els.manifestUrl.value = res.suggested_manifest_url;
  setDetail(res);
  if (options.updateRepoSelection !== false) selectGithubRepoInPicker(repo);
  const pullRequestUrl = res.pull_request?.htmlUrl || res.pull_request?.html_url || '';
  setOpenAdapterPr(pullRequestUrl);
  setRepoActionPreview(adapterPrPreview(res));
  if (pullRequestUrl && popupWindow && !popupWindow.closed) {
    popupWindow.location.replace(pullRequestUrl);
  }
  flash(`Adapter PR created for ${repo.fullName}. The PR was opened in a new tab. Review and merge it before verify.`, 'ok');
  void trackConversionEvent('adapter_pr_created', {
    source: 'github_adapter',
    status: 'created',
    agentSource: repo.private ? 'private_repo' : 'public_repo'
  });
  return res;
}

async function maybeOfferAutomatedAgentSetup(agent, record) {
  if (!canAutomateAgentSetup(agent, record)) return false;
  const repoInfo = agentGithubRepo(agent);
  const confirmed = window.confirm([
    `${agent.name} still needs hosted setup before public dispatch is ready.`,
    '',
    `${PRODUCT_SHORT_NAME} can automate this by creating a GitHub PR for ${repoInfo.fullName}.`,
    'The PR adds hosted /api/aiagent2/health, /api/aiagent2/jobs, and /api/aiagent2/manifest routes.',
    '',
    'Create the adapter PR now?'
  ].join('\n'));
  if (!confirmed) return false;
  await createAdapterPrForRepo({
    owner: repoInfo.owner,
    name: repoInfo.name,
    fullName: repoInfo.fullName,
    installationId: repoInfo.installationId,
    homepage: repoInfo.homepage,
    private: repoInfo.private
  });
  return true;
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
    : await buildOpenChatServerLeaderIntakeAnswer(draft.prompt, inputCounts, draft);
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

function addCurrentOrderToParallelQueue() {
  const draft = currentOrderDraft();
  validateOrderDraft(draft, { checkAccess: false });
  state.parallelOrderDrafts = [...state.parallelOrderDrafts, draft];
  void trackConversionEvent('draft_order_created', summarizeOrderDraftForAnalytics(draft, 'parallel_queue'));
  clearOrderComposerPrompt();
  renderParallelOrderQueue();
  flash(`Queued parallel order ${state.parallelOrderDrafts.length}.`, 'ok');
}

async function createParallelOrders() {
  const drafts = Array.isArray(state.parallelOrderDrafts) ? [...state.parallelOrderDrafts] : [];
  if (!drafts.length) throw new Error('Add at least one order to the parallel queue first.');
  try {
    validateOrderDraft(drafts[0], { checkAccess: true, checkFunding: false, allowGuestTrial: false });
  } catch (error) {
    if (/login|sign in|sign-in|required/i.test(String(error?.message || ''))) {
      void trackConversionEvent('sign_in_required_shown', summarizeOrderDraftForAnalytics(drafts[0], 'parallel_order'));
    }
    if (/payment|deposit|funding/i.test(String(error?.message || ''))) {
      void trackConversionEvent('payment_required_shown', summarizeOrderDraftForAnalytics(drafts[0], 'parallel_order'));
    }
    throw error;
  }
  const succeeded = [];
  const failed = [];
  for (const draft of drafts) {
    try {
      validateOrderDraft(draft, { checkAccess: false });
      const payload = {
        ...apiPayloadFromOrderDraft(draft),
        agent_id: draft.agent_id || undefined,
        prompt: draft.prompt || fallbackPromptFromOrderInput(draft.input)
      };
      const created = await api('/api/jobs', { method: 'POST', body: JSON.stringify(payload) });
      succeeded.push({ draft, created });
      void trackConversionEvent('order_created', {
        ...summarizeOrderDraftForAnalytics(draft, 'parallel_order'),
        mode: created.mode || 'run',
        status: created.status || 'created'
      });
    } catch (error) {
      failed.push({ draft, error });
    }
  }
  if (succeeded.length) {
    const last = succeeded[succeeded.length - 1].created;
    state.selectedJobId = last.workflow_job_id || last.job_id || state.selectedJobId;
    state.workFlowLastCreatedJobId = last.workflow_job_id || last.job_id || null;
    state.runSearch = '';
    if (els.runSearch) els.runSearch.value = '';
  }
  state.parallelOrderDrafts = failed.map((item) => item.draft);
  await refresh();
  renderParallelOrderQueue();
  if (failed.length) {
    const firstError = String(failed[0].error?.message || failed[0].error || 'Request failed');
    if (handleOrderFundingPrompt(failed[0].error, failed[0].draft, {
      source: 'parallel_order',
      analytics: summarizeOrderDraftForAnalytics(failed[0].draft, 'parallel_order')
    })) return;
    flash(`Created ${succeeded.length}/${drafts.length} parallel orders. Failed drafts stayed queued.\n\nFirst failure: ${firstError}`, succeeded.length ? 'info' : 'error');
    return;
  }
  flash(`Created ${succeeded.length} parallel orders.`, 'ok');
}

function clearParallelOrders() {
  state.parallelOrderDrafts = [];
  renderParallelOrderQueue();
  flash('Parallel order queue cleared.', 'ok');
}

async function submitFeedback() {
  const title = String(els.feedbackTitle?.value || '').trim();
  const message = String(els.feedbackMessage?.value || '').trim();
  if (!title && !message) throw new Error('Write a title or message first.');
  const payload = {
    type: els.feedbackType?.value || 'bug',
    email: els.feedbackEmail?.value || '',
    title,
    message,
    page_path: window.location.pathname,
    current_tab: state.currentTab,
    source: 'footer_form'
  };
  const result = await api('/api/feedback', { method: 'POST', body: JSON.stringify(payload) });
  safeText(els.feedbackSubmitResult, [
    `Saved: ${result.report?.title || 'feedback report'}`,
    `Email: ${result.email_forwarded ? 'forwarded to support@aiagent-marketplace.net' : `not forwarded (${result.email_status || 'not_configured'})`}`,
    `Type: ${String(result.report?.type || 'bug').toUpperCase()}`,
    `Status: ${String(result.report?.status || 'open').toUpperCase()}`,
    `Created: ${formatTime(result.report?.createdAt)}`
  ].join('\n'));
  if (els.feedbackTitle) els.feedbackTitle.value = '';
  if (els.feedbackMessage) els.feedbackMessage.value = '';
  if (els.feedbackType) els.feedbackType.value = 'bug';
  flash('Feedback report saved.', 'ok');
  void trackConversionEvent('feedback_submitted', { source: 'footer_form', status: result.report?.status || 'open' });
  if (state.snapshot?.auth?.loggedIn) await refresh();
}

async function updateSelectedFeedbackStatus(status) {
  const report = selectedFeedbackReport();
  if (!report) throw new Error('Select a feedback report first.');
  const result = await api(`/api/settings/feedback-reports/${encodeURIComponent(report.id)}`, {
    method: 'POST',
    body: JSON.stringify({ status })
  });
  flash(`Feedback ${String(result.report?.title || report.title || '').slice(0, 48)} marked ${String(status).toUpperCase()}.`, 'ok');
  await refresh();
}

async function updateSelectedChatTranscriptReview(reviewStatus) {
  const transcript = selectedChatTranscript();
  if (!transcript) throw new Error('Select a chat transcript first.');
  const expectedHandling = String(els.chatTranscriptExpectedHandling?.value || '').trim();
  const improvementNote = String(els.chatTranscriptImprovementNote?.value || '').trim();
  const result = await api(`/api/settings/chat-transcripts/${encodeURIComponent(transcript.id)}`, {
    method: 'POST',
    body: JSON.stringify({
      reviewStatus,
      expectedHandling,
      improvementNote
    })
  });
  flash(`Chat transcript marked ${String(result.transcript?.reviewStatus || reviewStatus).toUpperCase()}.`, 'ok');
  await refresh();
}

async function exportChatTrainingData() {
  const result = await api('/api/settings/chat-training-data');
  const examples = Array.isArray(result.examples) ? result.examples : [];
  const exportedAt = new Date().toISOString();
  const exportPayload = {
    ...result,
    exportedAt
  };
  const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json;charset=utf-8' });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = `cait-chat-training-${exportedAt.slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
  safeText(els.chatTrainingExportResult, [
    `Exported ${examples.length} reviewed training examples.`,
    `Schema: ${result.schema || 'cait-chat-training-export/v1'}`,
    `Policy: ${result.policy?.source || 'Reviewed CAIt Chat transcripts only.'}`,
    'Download started as JSON.'
  ].join('\n'));
  flash(`Exported ${examples.length} reviewed chat examples.`, 'ok');
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

if (els.loadReposBtn) els.loadReposBtn.onclick = () => runAction(els.loadReposBtn, async () => {
  if (!ensureGithubLinkedAccess({ section: 'agents', requireGithubFlow: true, message: 'Connect GitHub before loading repos.', reconnectMessage: 'GitHub is already linked. Refresh GitHub access before loading repos.' })) return;
  await loadGithubRepos();
});
if (els.repoPicker) els.repoPicker.onchange = showSelectedRepo;
if (els.repoSearch) els.repoSearch.oninput = applyRepoFilter;
if (els.repoPrevBtn) els.repoPrevBtn.onclick = () => { if (state.repoPage > 0) { state.repoPage -= 1; renderRepoPicker(); } };
if (els.repoNextBtn) els.repoNextBtn.onclick = () => { const totalPages = Math.max(1, Math.ceil(state.filteredRepos.length / state.repoPageSize)); if (state.repoPage < totalPages - 1) { state.repoPage += 1; renderRepoPicker(); } };
if (els.openAdapterPrBtn) els.openAdapterPrBtn.onclick = () => {
  const url = String(els.openAdapterPrBtn.dataset.url || '').trim();
  if (!url) return flash('No PR URL is available yet.', 'error');
  window.open(url, '_blank', 'noopener,noreferrer');
};
if (els.generateRepoManifestBtn) els.generateRepoManifestBtn.onclick = () => runAction(els.generateRepoManifestBtn, async () => {
  if (!ensureGithubLinkedAccess({ section: 'agents', requireGithubFlow: true, message: 'Connect GitHub before generating a repo draft.', reconnectMessage: 'GitHub is already linked. Refresh GitHub access before generating a repo draft.' })) return;
  const repo = selectedRepoFromPicker();
  if (!repo) throw new Error('Select a repo first.');
  state.agentSetupStarted = true;
  state.agentSetupMode = 'github';
  state.agentSetupCompletedId = null;
  const res = await api('/api/github/generate-manifest', {
    method: 'POST',
    body: JSON.stringify({
      owner: repo.owner,
      repo: repo.name,
      installation_id: repo.installationId || undefined
    })
  });
  if (els.manifestJson) els.manifestJson.value = JSON.stringify(res.draft_manifest, null, 2);
  switchTab('agents');
  renderAgentSetupFlow(state.snapshot?.auth);
  setDetail(res);
  const warning = Array.isArray(res.warnings) && res.warnings.length ? ` ${res.warnings[0]}` : '';
  void trackConversionEvent('manifest_generated', {
    source: 'github_repo',
    status: 'generated',
    agentSource: repo.private ? 'private_repo' : 'public_repo'
  });
  flash(`Draft manifest loaded from ${repo.fullName}. Review before import.${warning}`, 'ok');
});
if (els.importSelectedRepoBtn) els.importSelectedRepoBtn.onclick = () => runAction(els.importSelectedRepoBtn, async () => {
  if (!ensureGithubLinkedAccess({ section: 'agents', requireGithubFlow: true, message: 'Connect GitHub before importing a repo manifest.', reconnectMessage: 'GitHub is already linked. Refresh GitHub access before importing a repo manifest.' })) return;
  const repo = selectedRepoFromPicker();
  if (!repo) throw new Error('Select a repo first.');
  const res = await api('/api/github/load-manifest', {
    method: 'POST',
    body: JSON.stringify({
      owner: repo.owner,
      repo: repo.name,
      installation_id: repo.installationId || undefined
    })
  });
  setDetail(res);
  state.selectedAgentId = res.agent?.id || null;
  delete state.agentOnboarding[state.selectedAgentId];
  void trackConversionEvent('agent_imported', {
    source: 'github_repo',
    status: 'imported',
    agentId: state.selectedAgentId || ''
  });
  flash(`Loaded manifest-backed agent from ${repo.fullName} via ${res.auth_provider || 'github'}. Verify before dispatch.`, 'ok');
  await refresh();
  if (state.selectedAgentId) await loadAgentOnboarding(state.selectedAgentId, { force: true, silent: true });
  completeAgentSetup(state.selectedAgentId);
  renderAgentSetupFlow(state.snapshot?.auth);
});
if (els.createAdapterPrBtn) els.createAdapterPrBtn.onclick = () => runAction(els.createAdapterPrBtn, async () => {
  if (!ensureGithubLinkedAccess({ section: 'agents', requireGithubFlow: true, message: 'Connect GitHub before creating an adapter PR.', reconnectMessage: 'GitHub is already linked. Refresh GitHub access before creating an adapter PR.' })) return;
  const repo = selectedRepoFromPicker();
  if (!repo) throw new Error('Select a repo first.');
  const popup = window.open('', '_blank');
  writeAdapterPrPopup(popup, 'Creating adapter PR', [
    `Repo: ${repo.fullName}`,
    '',
    `${PRODUCT_SHORT_NAME} is creating the pull request now.`
  ]);
  await createAdapterPrForRepo(repo, { popupWindow: popup });
});
if (els.importDeployedAdapterBtn) els.importDeployedAdapterBtn.onclick = () => runAction(els.importDeployedAdapterBtn, async () => {
  if (!ensureGithubLinkedAccess({ section: 'agents', requireGithubFlow: true, message: 'Connect GitHub before importing a deployed manifest.', reconnectMessage: 'GitHub is already linked. Refresh GitHub access before importing a deployed manifest.' })) return;
  const repo = selectedRepoFromPicker();
  if (!repo) throw new Error('Select a repo first.');
  const hint = repoAdapterHint(repo);
  const manifestUrl = hint.manifestUrl || (els.manifestUrl?.value || '').trim();
  if (!manifestUrl) {
    throw new Error('No deployed manifest URL is known yet. Set the repo homepage to the deployed app URL or paste the manifest URL manually.');
  }
  await importManifestUrlAndVerify(manifestUrl, 'Hosted manifest');
});
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
  flash('CAIt API keys are coming soon in SETTINGS.', 'info');
};
if (els.connectHubCopyOrderBtn) els.connectHubCopyOrderBtn.onclick = () => {
  const token = state.lastIssuedOrderApiKey?.token || '<CAIT_API_KEY>';
  void copyTextToClipboard(formatOrderApiCommand(token), 'Order API example copied.');
};
if (els.connectHubOpenAgentsPublishBtn) els.connectHubOpenAgentsPublishBtn.onclick = () => openAgentsGithubFlow();
if (els.connectHubOpenSettingsAgentBtn) els.connectHubOpenSettingsAgentBtn.onclick = () => {
  openSettingsSection('keys');
  flash('CAIt API keys are coming soon in SETTINGS.', 'info');
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
if (els.apiKeyMode) els.apiKeyMode.onchange = () => renderOrderApiKeys(state.snapshot?.accountSettings, state.snapshot?.auth);
if (els.createApiKeyBtn) els.createApiKeyBtn.onclick = () => {
  safeText(els.apiKeyCreateResult, [
    `${DEVELOPER_SURFACES_STATUS}: CAIt API keys`,
    '',
    DEVELOPER_SURFACES_NOTICE
  ].join('\n'));
  flash('CAIt API keys are coming soon.', 'warn');
};
if (els.apiKeyTable) els.apiKeyTable.onclick = (event) => {
  const button = event.target?.closest?.('[data-api-key-id]');
  if (!button) return;
  safeText(els.apiKeyCreateResult, [
    `${DEVELOPER_SURFACES_STATUS}: CAIt API keys`,
    '',
    DEVELOPER_SURFACES_NOTICE
  ].join('\n'));
  flash('CAIt API keys are coming soon.', 'warn');
};
if (els.createStripeSetupSessionBtn) els.createStripeSetupSessionBtn.onclick = () => {
  if (!ensureSettingsLogin()) return;
  runAction(els.createStripeSetupSessionBtn, async () => {
    if (TEMPORARY_INVOICE_BILLING_ENABLED && !STRIPE_CARD_SETUP_DURING_TEMPORARY_BILLING_ENABLED) {
      safeText(els.stripeCustomerActionResult, [
        ...temporaryInvoiceNoticeLines('payment'),
        '',
        'Saved payment-method setup is unavailable in temporary invoice/manual billing mode.'
      ].join('\n'));
      flash('Saved payment-method setup is paused during temporary invoice billing.', 'warn');
      return;
    }
    await launchStripeHostedAction('/api/stripe/setup-session', {}, {
      title: TEMPORARY_INVOICE_BILLING_ENABLED
        ? 'Payment method registration is ready.'
        : 'Payment method setup is ready.',
      successMessage: TEMPORARY_INVOICE_BILLING_ENABLED
        ? 'Opened payment method registration. Orders still use monthly invoice/manual confirmation until automated charging is enabled.'
        : 'Opened payment method setup.',
      output: 'customer'
    });
  });
};
if (els.createStripeSubscriptionSessionBtn) els.createStripeSubscriptionSessionBtn.onclick = () => {
  if (!ensureSettingsLogin()) return;
  openPlanModal();
};
if (els.confirmPlanModalBtn) els.confirmPlanModalBtn.onclick = () => {
  if (!ensureSettingsLogin()) return;
  runAction(els.confirmPlanModalBtn, async () => {
    if (!state.planIntentArmed || !els.planModal || els.planModal.hidden) {
      throw new Error(TEMPORARY_INVOICE_BILLING_ENABLED ? 'Use REQUEST PLAN INVOICE first.' : 'Use OPEN PLAN CHECKOUT first.');
    }
    const plan = String(els.planModalPlan?.value || '').trim().toLowerCase();
    if (!plan || plan === 'none') {
      safeText(els.stripeCustomerActionResult, 'Choose STARTER or PRO in the popup first.');
      throw new Error('Choose a subscription plan first.');
    }
    if (els.billingSubscriptionPlan) {
      els.billingSubscriptionPlan.value = plan;
    }
    closePlanModal();
    if (TEMPORARY_INVOICE_BILLING_ENABLED) {
      await submitTemporaryInvoiceRequest({
        kind: 'plan',
        plan,
        amount: ledgerAmountToDisplayCurrency(subscriptionBasePriceForPlan(plan)),
        context: 'settings'
      });
      return;
    }
    await launchStripeHostedAction('/api/stripe/subscription-session', { plan }, {
      title: 'Subscription checkout is ready.',
      successMessage: `Opened subscription checkout for ${plan}.`,
      output: 'customer'
    });
  });
};
if (els.cancelPlanModalBtn) els.cancelPlanModalBtn.onclick = () => closePlanModal();
if (els.planModal) {
  els.planModal.onclick = (event) => {
    if (event.target === els.planModal) closePlanModal();
  };
}
if (els.apiKeyRevealModal) {
  els.apiKeyRevealModal.onclick = (event) => {
    if (event.target !== els.apiKeyRevealModal) return;
    showApiKeyRevealResult('Copy and save the key before closing this one-time popup.');
    selectApiKeyRevealToken();
  };
}
if (els.copyApiKeyTokenBtn) els.copyApiKeyTokenBtn.onclick = () => { void copyApiKeyRevealValue('token'); };
if (els.copyApiKeyHeaderBtn) els.copyApiKeyHeaderBtn.onclick = () => { void copyApiKeyRevealValue('header'); };
if (els.copyApiKeyCurlBtn) els.copyApiKeyCurlBtn.onclick = () => { void copyApiKeyRevealValue('curl'); };
if (els.closeApiKeyRevealBtn) els.closeApiKeyRevealBtn.onclick = () => closeApiKeyRevealModal();
if (els.closeMarketingTimelineModalBtn) els.closeMarketingTimelineModalBtn.onclick = () => hideMarketingTimelineModal();
if (els.marketingTimelineModal) {
  els.marketingTimelineModal.onclick = (event) => {
    if (event.target === els.marketingTimelineModal) hideMarketingTimelineModal();
  };
}
if (els.planModalPlan) {
  els.planModalPlan.oninput = () => renderPlanModalSummary();
  els.planModalPlan.onchange = () => renderPlanModalSummary();
  els.planModalPlan.onkeydown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      els.confirmPlanModalBtn?.click();
    }
  };
}
if (els.createStripeConnectOnboardingBtn) els.createStripeConnectOnboardingBtn.onclick = () => {
  if (!ensureSettingsLogin()) return;
  if (!ensureGithubLinkedAccess({ section: 'provider', message: 'Connect GitHub before provider onboarding.' })) return;
  runAction(els.createStripeConnectOnboardingBtn, async () => {
    if (TEMPORARY_INVOICE_BILLING_ENABLED) {
      safeText(els.stripeProviderActionResult, [
        ...temporaryInvoiceNoticeLines('payout'),
        '',
        'External payout onboarding is disabled during this temporary period. Earnings remain tracked in CAIt.'
      ].join('\n'));
      flash('External payout onboarding is temporarily paused.', 'warn');
      return;
    }
    await launchStripeHostedAction('/api/stripe/connect/onboarding', {}, {
      title: 'External payout onboarding is ready.',
      successMessage: 'Opened external payout onboarding.',
      output: 'provider'
    });
  });
};
if (els.runStripeProviderMonthlyChargeBtn) els.runStripeProviderMonthlyChargeBtn.onclick = () => {
  if (!ensureSettingsLogin()) return;
  runAction(els.runStripeProviderMonthlyChargeBtn, async () => {
    const period = (els.settingsPeriod?.value || state.settingsPeriod || currentMonthPeriod()).trim() || currentMonthPeriod();
    const result = await api('/api/stripe/provider-monthly-charge/run', {
      method: 'POST',
      body: JSON.stringify({ period })
    });
    const providerMonthly = result.provider_monthly || {};
    safeText(els.stripeProviderActionResult, [
      'Provider monthly SaaS billing attempted.',
      `Period: ${result.period || period}`,
      `Amount charged: ${yen(result.amount || 0)}`,
      result.payment_intent_id ? `Payment intent: ${result.payment_intent_id}` : 'Payment intent: -',
      `Remaining due: ${yen(providerMonthly.dueAmount || 0)}`,
      `Charged this period: ${yen(providerMonthly.chargedAmount || 0)}`
    ].join('\n'));
    flash(result.skipped ? 'No provider monthly SaaS amount was due.' : 'Provider monthly SaaS billing completed.', 'ok');
    await refresh();
  });
};
if (els.runStripeProviderPayoutBtn) els.runStripeProviderPayoutBtn.onclick = () => {
  if (!ensureSettingsLogin()) return;
  if (!ensureGithubLinkedAccess({ section: 'provider', message: 'Connect GitHub before withdrawing provider earnings.' })) return;
  runAction(els.runStripeProviderPayoutBtn, async () => {
    const rawAmount = String(els.payoutWithdrawAmount?.value || '').trim();
    const amount = rawAmount ? Number(rawAmount) : 0;
    if (TEMPORARY_INVOICE_BILLING_ENABLED) {
      if (rawAmount && !(amount > 0)) throw new Error('Enter a positive withdrawal amount, or leave it blank to request the full available balance.');
      const providerSummary = state.snapshot?.monthlySummary?.provider || {};
      const providerPending = Number(providerSummary.pendingBalance || state.snapshot?.accountSettings?.payout?.pendingBalance || 0);
      const requestAmount = amount > 0 ? amount : ledgerAmountToDisplayCurrency(providerPending);
      await submitTemporaryInvoiceRequest({
        kind: 'payout',
        amount: requestAmount,
        context: 'provider'
      });
      return;
    }
    if (rawAmount && !(amount > 0)) throw new Error('Enter a positive withdrawal amount, or leave it blank to withdraw the full available balance.');
    const result = await api('/api/stripe/payout/run', {
      method: 'POST',
      body: JSON.stringify(amount > 0 ? { amount } : {})
    });
    safeText(els.stripeProviderActionResult, [
      'Withdrawal submitted.',
      `Amount: ${yen(result.amount || 0)}`,
      `Transfer: ${result.transfer_id || '-'}`,
      `Pending before: ${yen(result.pending_before || 0)}`,
      `Pending after: ${yen(result.pending_after || 0)}`,
      'The payment provider will pay out from the connected account to the configured bank account.'
    ].join('\n'));
    flash('Withdrawal submitted.', 'ok');
    if (els.payoutWithdrawAmount) els.payoutWithdrawAmount.value = '';
    await refresh();
  });
};
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
if (els.saveBillingSettingsBtn) els.saveBillingSettingsBtn.onclick = () => {
  if (!ensureSettingsLogin()) return;
  runAction(els.saveBillingSettingsBtn, async () => {
  const period = encodeURIComponent((els.settingsPeriod?.value || state.settingsPeriod || currentMonthPeriod()).trim() || currentMonthPeriod());
  await api(`/api/settings/billing?period=${period}`, {
    method: 'POST',
    body: JSON.stringify({
      mode: els.billingMode?.value || 'monthly_invoice',
      legalName: els.billingLegalName?.value || '',
      companyName: els.billingCompanyName?.value || '',
      billingEmail: els.billingEmail?.value || '',
      billingPhone: els.billingPhone?.value || '',
      billingPostalCode: els.billingPostalCode?.value || '',
      billingRegion: els.billingRegion?.value || '',
      billingCity: els.billingCity?.value || '',
      billingAddressLine1: els.billingAddressLine1?.value || '',
      billingAddressLine2: els.billingAddressLine2?.value || '',
      country: els.billingCountry?.value || 'JP',
      currency: els.billingCurrency?.value || 'USD',
      subscriptionPlan: els.billingSubscriptionPlan?.value || 'none',
      subscriptionOverageMode: els.billingSubscriptionOverageMode?.value || 'monthly_invoice',
      taxId: els.billingTaxId?.value || '',
      purchaseOrderRef: els.billingPurchaseOrderRef?.value || '',
      invoiceMemo: els.billingInvoiceMemo?.value || '',
      dueDays: Number(els.billingDueDays?.value || 14),
      invoiceEnabled: true
    })
  });
  state.settingsPeriod = decodeURIComponent(period);
  switchTab('settings');
  flash('Billing settings saved. Month-end billing logic updated.', 'ok');
  await refresh();
  });
};
if (els.savePayoutSettingsBtn) els.savePayoutSettingsBtn.onclick = () => {
  if (!ensureSettingsLogin()) return;
  if (!ensureGithubLinkedAccess({ section: 'provider', message: 'Connect GitHub before saving provider settings.' })) return;
  runAction(els.savePayoutSettingsBtn, async () => {
  const period = encodeURIComponent((els.settingsPeriod?.value || state.settingsPeriod || currentMonthPeriod()).trim() || currentMonthPeriod());
  await api(`/api/settings/payout?period=${period}`, {
    method: 'POST',
    body: JSON.stringify({
      providerEnabled: els.payoutProviderEnabled?.value === 'true',
      entityType: els.payoutEntityType?.value || 'individual',
      legalName: els.payoutLegalName?.value || '',
      displayName: els.payoutDisplayName?.value || '',
      payoutEmail: els.payoutEmail?.value || '',
      country: els.payoutCountry?.value || 'JP',
      currency: els.payoutCurrency?.value || 'USD',
      supportEmail: els.payoutSupportEmail?.value || '',
      minimumPayoutAmount: displayCurrencyToLedgerAmount(Number(els.payoutMinimumAmount?.value || 0)),
      website: els.payoutWebsite?.value || '',
      statementDescriptor: els.payoutStatementDescriptor?.value || '',
      notes: els.payoutNotes?.value || ''
    })
  });
  state.settingsPeriod = decodeURIComponent(period);
  switchTab('settings');
  flash('Payout settings saved. Bank account collection is deferred to external payout onboarding.', 'ok');
  await refresh();
  });
};

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
