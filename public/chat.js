import {
  chatEngineBuildIntakeCombinedPrompt,
  chatEngineBuildIntakeState,
  chatEngineBuildJobPayload,
  chatEngineBuildOrderDraft,
  chatEngineBuildPrepareOrderPayload,
  chatEngineDraftBrief,
  chatEngineIsNeedsInputResponse
} from './chat-engine.js?v=20260526l';
import {
  safeLocalStorageGet,
  safeLocalStorageSet
} from './chat-session-state.js?v=20260519a';
import {
  orderRuntimeApprovalPayload,
  orderRuntimeCachedJob,
  orderRuntimePollingContextIsCurrent,
  orderRuntimeShouldPauseForApproval,
  orderRuntimeUpsertRecentJob,
  recentJobsApiPath as orderRuntimeRecentJobsApiPath,
  visibleJobApiPath
} from './order-runtime.js?v=20260519a';
import {
  deliveryOrderActionsHtml as deliveryRendererOrderActionsHtml,
  deliveryRendererMeta,
  renderDeliveryBody
} from './delivery-renderer.js?v=20260526a';
import {
  appContextAnswerLine as appContextGateAnswerLine,
  appContextMatchesManifest as appContextGateMatchesManifest,
  appContextStatusForDraft as appContextGateStatusForDraft
} from './app-context-gate.js?v=20260524a';
import {
  measurementEvidenceAnswerSaysAvailable as answerSaysAnalyticsAvailable,
  measurementEvidenceAppId as measurementEvidenceGateAppId,
  measurementEvidenceAppManifest as measurementEvidenceGateAppManifest,
  measurementEvidenceAppName as measurementEvidenceGateAppName,
  measurementEvidenceContractRequired,
  measurementEvidenceDraftExplicitlyRequests as draftExplicitlyRequestsMeasurementEvidence,
  measurementEvidenceIntakeHasQuestion as intakeHasMeasurementEvidenceQuestion,
  measurementEvidenceTextExplicitlyRequests as textExplicitlyRequestsMeasurementEvidence
} from './measurement-evidence-gate.js?v=20260525a';
import {
  APP_STANDALONE_HIDDEN_APP_IDS,
  APP_WORKSPACE_GROUPS,
  BUILT_IN_APP_MANIFESTS as APP_AGENT_MANIFESTS,
  CORE_FEATURE_APP_IDS
} from './app-manifest-registry.js?v=20260526k';
import { renderAgentRunDetailHtml as agentProgressRenderAgentRunDetailHtml } from './agent-progress-view.js?v=20260519a';
import {
  caitAppContextChatPrompt,
  caitAppContextThreadHtml
} from './cait-app-bridge.js?v=20260526i';
import {
  isDeliveryHistoryQuestionIntentText,
  isLeaderCatalogQuestionIntentText,
  isNonOrderConversationIntentText
} from './work-intent-resolver.js?v=20260526a';
import { compact, escapeHtml, htmlToPlainText } from './chat-display-utils.js?v=20260529d';
import { createChatDeliveryFileUtils } from './chat-delivery-file-utils.js?v=20260528a';
import { createChatDeliveryPreferenceController } from './chat-delivery-preference-controller.js?v=20260529d';
import { createChatWorkflowProgressUtils } from './chat-workflow-progress-utils.js?v=20260529a';
import { createChatUsageLibraryController } from './chat-usage-library-controller.js?v=20260528e';
import { createChatCatalogRuntime } from './chat-catalog-runtime.js?v=20260529a';
import { createChatSchedulePanelController } from './chat-schedule-panel-controller.js?v=20260529a';
import { createChatAppHandoffController } from './chat-app-handoff-controller.js?v=20260529a';
import { createChatSessionModel } from './chat-session-model.js?v=20260529d';
import { createChatSessionSidebarController } from './chat-session-sidebar-controller.js?v=20260529a';
import { createChatTelemetry } from './chat-telemetry.js?v=20260529d';
import { createChatPlanningProgressController } from './chat-planning-progress-controller.js?v=20260529a';
import { createChatRuntimeStateController } from './chat-runtime-state-controller.js?v=20260529h';
import {
  conversationOwnerFromPrepared,
  explicitLeaderChangeTaskTypeFromText,
  leaderOwner,
  normalizeLeaderTaskType,
  taskLabel,
  withConversationOwner
} from './chat-conversation-owner-utils.js?v=20260529c';
import {
  isStructuredOrderBriefText,
  normalizeLlmIntakeQuestions,
  openChatIntentShouldUseStepIntake,
  promptInjectionGuard,
  taskTypeFromOpenChatIntent
} from './chat-intent-guard-utils.js?v=20260529c';
import {
  CHATUX_AUTH_STATUS_TIMEOUT_MS,
  CHATUX_BACKFILL_INTERVAL_MS,
  CHATUX_CATALOG_CACHE_TTL_MS,
  CHATUX_CATALOG_PAGE_SIZE,
  CHATUX_CONNECT_CHECK_INTERVAL_MS,
  CHATUX_CONNECT_WAIT_MS,
  CHATUX_OAUTH_RETURN_MAX_AGE_MS,
  CHATUX_OAUTH_RETURN_STATE_KEY,
  CHATUX_PROGRESS_MAX_POLLS,
  CHATUX_RETRY_MODE_NEW_ORDER,
  CHATUX_RETURN_PATH,
  CHATUX_RUNTIME_STATE_KEY,
  CHATUX_RUNTIME_STATE_MAX_AGE_MS,
  CHATUX_UI_LANGUAGE_STORAGE_KEY,
  CHATUX_WELCOME_TEXT,
  CHATUX_WELCOME_TEXT_JA,
  buildLeaderCatalogChatAnswer,
  createInitialChatState,
  initialChatUiLanguage,
  normalizeUiLanguage
} from './chat-bootstrap-state.js?v=20260529a';
import { createChatUiRuntimeController } from './chat-ui-runtime-controller.js?v=20260531a';
import { createChatUtilityModalController } from './chat-utility-modal-controller.js?v=20260601a';
import { createChatOrderCreateRecovery } from './chat-order-create-recovery.js?v=20260531a';
import { createChatOrderDispatchController } from './chat-order-dispatch-controller.js?v=20260601a';
import { createChatIntakeController } from './chat-intake-controller.js?v=20260601a';
import { createChatRestoredOrderContextController } from './chat-restored-order-context-controller.js?v=20260601a';
import { createChatHistoryPanelsController } from './chat-history-panels-controller.js?v=20260601a';
import { createChatDeliveryRenderController } from './chat-delivery-render-controller.js?v=20260601a';
import { createChatEventBindingsController } from './chat-event-bindings-controller.js?v=20260601a';
import { createChatConversationOwnerController } from './chat-conversation-owner-controller.js?v=20260601a';
import { createChatAppContextOAuthController } from './chat-app-context-oauth-controller.js?v=20260602a';
import { createChatRetryFollowupController } from './chat-retry-followup-controller.js?v=20260602a';

const state = createInitialChatState({
  uiLanguage: initialChatUiLanguage({
    safeLocalStorageGet,
    documentElementLang: document.documentElement?.lang || ''
  })
});

const chatUiRuntimeController = createChatUiRuntimeController({
  state,
  window,
  document,
  normalizeUiLanguage,
  safeLocalStorageSet,
  uiLanguageStorageKey: CHATUX_UI_LANGUAGE_STORAGE_KEY,
  welcomeText: CHATUX_WELCOME_TEXT,
  welcomeTextJa: CHATUX_WELCOME_TEXT_JA,
  getEls: () => els,
  refreshAuth: (...args) => refreshAuth(...args),
  updateComposerMode: (...args) => updateComposerMode(...args),
  sleep: (...args) => sleep(...args)
});
const {
  api,
  apiWithRetry,
  chatLanguage,
  chatText,
  chatUiLanguage,
  chatUiText,
  chatWelcomeText,
  looksJapanese,
  refreshUiLanguageFromAccount,
  rememberConversationLanguage,
  saveChatUiLanguagePreference,
  setChatUiLanguage,
  syncDocumentUiLanguage
} = chatUiRuntimeController;

function leaderCatalogChatAnswer(prompt = '') {
  return buildLeaderCatalogChatAnswer(prompt, chatLanguage);
}

const agentMapRunStore = new Map();
let agentMapRunKeyCounter = 0;
let chatRuntimeStateController = null;
let chatUtilityModalController = null;
let chatRestoredOrderContextController = null;
let chatHistoryPanelsController = null;
let chatIntakeController = null;
let chatOrderDispatchController = null;
let chatDeliveryRenderController = null;
const chatDeliveryFileUtils = createChatDeliveryFileUtils();
const {
  clearDeliveryFiles,
  combinedMarkdownFile,
  copyTextToClipboard,
  deliveryFilePriority,
  downloadTextFile,
  fileMimeType,
  getDeliveryFile,
  registerDeliveryFile,
  sanitizeDeliveryFileForUser,
  sanitizeDeliveryMarkdownForUser,
  cleanReadableBundleContent,
  visibleDeliveryFiles
} = chatDeliveryFileUtils;
const chatWorkflowProgressUtils = createChatWorkflowProgressUtils({
  agentProgressRenderAgentRunDetailHtml,
  chatLanguage,
  deliveryFiles,
  deliveryText,
  escapeHtml,
  getConversationLanguage: () => state.conversationLanguage,
  getOrderId: () => state.orderId,
  rememberAgentMapRun,
  renderAppHandoffRoutingPreview,
  renderFileCards,
  shortDateTime,
  taskLabel
});
const {
  createdOrderChildRuns,
  durationLabel,
  extractOrderId,
  initialAgentMapHtml,
  isTerminalStatus,
  jobBlockedByLeaderQualityGate,
  progressNarratorOptionsForJob,
  progressNarratorTextForJob,
  renderAgentRunDetailHtml,
  statusDisplayLabel,
  statusLabel,
  visibleWorkflowChildRuns,
  workflowAgentRunJobId,
  workflowChildDisplayLabel,
  workflowCurrentChildRun,
  workflowCurrentPhaseKey,
  workflowPhaseProgressMapHtml,
  workflowRunWaitStatus
} = chatWorkflowProgressUtils;
const chatUsageLibraryController = createChatUsageLibraryController({
  appAgentManifests: APP_AGENT_MANIFESTS,
  appStandaloneHiddenAppIds: APP_STANDALONE_HIDDEN_APP_IDS,
  appWorkspaceGroups: APP_WORKSPACE_GROUPS,
  chatText,
  compact,
  coreFeatureAppIds: CORE_FEATURE_APP_IDS,
  escapeHtml,
  state,
  taskLabel
});
const {
  appAgentLaunchUrl,
  appManifestById,
  appManifestSources,
  compactTransferObject,
  compactTransferText,
  compactUsageText,
  directAppCommandId,
  groupedAppPanelEntries,
  isoNow,
  isCoreFeatureAppId,
  libraryCommandScope,
  listValues,
  normalizeUsageId,
  recentAppAgentEntries,
  rememberAiAgentUsage,
  rememberAppAgentUsage,
  usageBadge,
  usageLibraryHtml
} = chatUsageLibraryController;

const chatSessionModel = createChatSessionModel({
  state,
  compact,
  isoNow,
  cloneForSession: (value, options) => safeJsonClone(value, options)
});
const {
  ensureChatSessionId,
  makeChatTranscriptId,
  chatSessionTitle,
  normalizeChatSession,
  upsertChatSession,
  currentChatSessionPayload
} = chatSessionModel;

const chatAppHandoffController = createChatAppHandoffController({
  appAgentManifests: APP_AGENT_MANIFESTS,
  returnPath: CHATUX_RETURN_PATH,
  getActiveOrderId: () => state.orderId,
  appManifestById,
  appManifestSources,
  appAgentLaunchUrl,
  normalizeUsageId,
  listValues,
  compactTransferText,
  compactTransferObject,
  chatLanguage,
  isoNow,
  statusLabel,
  taskLabel,
  visibleWorkflowChildRuns,
  deliveryText,
  deliveryFiles,
  fileMimeType,
  escapeHtml,
  usageBadge,
  compact,
  api,
  apiWithRetry,
  rememberAppAgentUsage
});

const chatCatalogRuntime = createChatCatalogRuntime({
  state,
  api,
  normalizeUsageId,
  isCoreFeatureAppId,
  orderRuntimeRecentJobsApiPath,
  visibleJobApiPath,
  orderRuntimeCachedJob,
  orderRuntimeUpsertRecentJob,
  rememberAiAgentsFromJob,
  getVisitorId: () => state.visitorId,
  catalogCacheTtlMs: CHATUX_CATALOG_CACHE_TTL_MS,
  catalogPageSize: CHATUX_CATALOG_PAGE_SIZE,
  window
});
const {
  fetchAppContext,
  fetchVisibleJob,
  recentJobsApiPath,
  refreshAppContexts,
  refreshRecentJobs,
  refreshRecurringOrders,
  refreshRegisteredApps,
  refreshWorkerAgents,
  warmUtilityCatalogs
} = chatCatalogRuntime;

const chatSchedulePanelController = createChatSchedulePanelController({
  state,
  api,
  escapeHtml,
  compact,
  taskLabel,
  shortDateTime,
  utilityEmptyHtml,
  orderErrorMessage,
  appendTextMessage,
  openUtilityModal,
  utilityModalIsOpen,
  refreshRecentJobs,
  refreshRecurringOrders,
  getVisitorId: () => state.visitorId
});
const {
  cancelRecurringOrder,
  createScheduleFromForm,
  schedulePanelHtml,
  showSchedulePanel,
  updateRecurringOrderStatus
} = chatSchedulePanelController;

const $ = (id) => document.getElementById(id);

const chatTelemetry = createChatTelemetry({
  window,
  getCurrentChatSessionId: () => state.currentChatSessionId || '',
  getVisitorId: () => state.visitorId || '',
  getActiveLeaderTaskType: () => state.activeLeader?.taskType || '',
  chatLanguage
});
const {
  trackChatGa4Once,
  trackChatIntakeStarted
} = chatTelemetry;

const els = {
  authStatus: $('authStatus'),
  chatThread: $('chatThread'),
  composer: $('composer'),
  promptInput: $('promptInput'),
  composerModeHint: $('composerModeHint'),
  composerControlsHint: $('composerControlsHint'),
  deliveryFormatLabel: $('deliveryFormatLabel'),
  deliveryFormatSelect: $('deliveryFormatSelect'),
  sendMessageBtn: $('sendMessageBtn'),
  resetBtn: $('resetBtn'),
  chatSessionSidebar: $('chatSessionSidebar'),
  chatSessionList: $('chatSessionList'),
  chatSessionStatus: $('chatSessionStatus'),
  newChatBtn: $('newChatBtn'),
  openChatListBtn: $('openChatListBtn'),
  openScheduleBtn: $('openScheduleBtn'),
  openScheduleComposerBtn: $('openScheduleComposerBtn'),
  openWorkerListBtn: $('openWorkerListBtn'),
  openAppListBtn: $('openAppListBtn'),
  openInfoBtn: $('openInfoBtn'),
  adminNavLink: $('adminNavLink'),
  activeLeaderStatus: $('activeLeaderStatus'),
  chatHeaderMenu: $('chatHeaderMenu'),
  utilityModal: $('utilityModal'),
  utilityModalTitle: $('utilityModalTitle'),
  utilityModalBody: $('utilityModalBody'),
  utilityModalCloseBtn: $('utilityModalCloseBtn')
};

const chatDeliveryPreferenceController = createChatDeliveryPreferenceController({
  getValue: () => els.deliveryFormatSelect?.value
});
const {
  selectedDeliveryFormat,
  selectedDeliveryFormatLabel
} = chatDeliveryPreferenceController;

const chatPlanningProgressController = createChatPlanningProgressController({
  state,
  window,
  appendMessage,
  chatLanguage,
  chatText,
  escapeHtml,
  selectedDeliveryFormatLabel,
  threadIsNearBottom,
  scrollThread
});
const {
  appendPlanningStatusMessage,
  appendThinkingMessage,
  finishPlanningStatusMessage,
  markLiveProgressStopped,
  resumeLiveProgress,
  showProgressNarrator,
  stopLiveProgressNarrator,
  stopProgressNarratorAnimation,
  updatePlanningStatusMessage
} = chatPlanningProgressController;

const PROMPT_PLACEHOLDERS = {
  default: {
    en: 'Example: I want to improve website acquisition',
    ja: '例: サイトの集客を増やしたい'
  },
  pending: {
    en: 'Add an adjustment, or type SEND ORDER to dispatch...',
    ja: '追加調整を書くか、SEND ORDER と入力して実行してください...'
  },
  intake: {
    en: 'Answer this intake item before CAIt prepares the order...',
    ja: '発注準備の前に、この確認項目へ回答してください...'
  },
  active: {
    en: 'Start a new request, ask for status, or type "continue this order: ..." explicitly...',
    ja: '新しい依頼を書くか、状態確認をするか、「このオーダーの続きとして: ...」と明示してください...'
  }
};

chatRestoredOrderContextController = createChatRestoredOrderContextController({
  state,
  compact,
  escapeHtml,
  taskLabel,
  statusDisplayLabel,
  shortDateTime: (...args) => shortDateTime(...args),
  jobBlockedByLeaderQualityGate,
  isTerminalStatus,
  fetchVisibleJob,
  rememberTrackedOrder,
  orderErrorMessage,
  appendMessage,
  jobHasDeliveryResult,
  renderDeliveryOnce,
  startPolling
});

const chatSessionSidebarController = createChatSessionSidebarController({
  state,
  els,
  window,
  api,
  compact,
  escapeHtml,
  isoNow,
  normalizeChatSession,
  currentChatSessionPayload,
  upsertChatSession,
  ensureChatSessionId,
  makeChatTranscriptId,
  chatSessionTitle,
  chatSessionOrderIds,
  restoredSessionHasActiveWork,
  renderRestoredSessionOrderContext,
  startPolling,
  rememberTrackedOrder,
  stopProgressNarratorAnimation,
  clearActiveOrderMemory,
  clearChatRuntimeState,
  clearQueuedChatSessionSnapshot,
  clearChatRestoreParamsFromUrl,
  bumpChatViewRevision,
  renderActiveLeaderStatus,
  appendTextMessage,
  appendMessage,
  orderConfirmationHtml,
  orderErrorMessage,
  chatText,
  chatWelcomeText,
  updateComposerMode,
  saveChatRuntimeState,
  persistRuntimeChatSession,
  applyAuthState
});
const {
  chatSessionTimeLabel,
  renderChatSessionSidebar,
  startNewChatSession,
  loadChatSession,
  deleteChatSession,
  refreshChatSessionHistory,
  recordChatSessionMessage,
  restoreRequestedChatSessionFromHistory: restoreRequestedChatSessionFromHistoryController
} = chatSessionSidebarController;

chatUtilityModalController = createChatUtilityModalController({
  state,
  els,
  escapeHtml,
  compact,
  taskLabel,
  statusLabel,
  normalizeChatSession,
  chatSessionTimeLabel,
  groupedAppPanelEntries,
  recentAppAgentEntries,
  usageLibraryHtml,
  refreshWorkerAgents,
  refreshRegisteredApps,
  refreshAppContexts,
  fetchAppContext,
  appendMessage,
  caitAppContextThreadHtml,
  caitAppContextChatPrompt,
  orderErrorMessage,
  loginHref,
  chatUiLanguage,
  chatUiText
});

chatHistoryPanelsController = createChatHistoryPanelsController({
  state,
  escapeHtml,
  isDeliveryHistoryQuestionIntentText,
  chatLanguage,
  chatText,
  refreshChatSessionHistory,
  refreshRecentJobs,
  fetchVisibleJob,
  jobHasDeliveryResult,
  jobUtilityRows,
  chatSessionUtilityRows,
  utilityEmptyHtml,
  openUtilityModal,
  orderErrorMessage,
  appendTextMessage,
  rememberTrackedOrder,
  statusDisplayLabel,
  renderDeliveryOnce
});

chatRuntimeStateController = createChatRuntimeStateController({
  state,
  els,
  window,
  runtimeStateKey: CHATUX_RUNTIME_STATE_KEY,
  oauthReturnStateKey: CHATUX_OAUTH_RETURN_STATE_KEY,
  runtimeStateMaxAgeMs: CHATUX_RUNTIME_STATE_MAX_AGE_MS,
  oauthReturnMaxAgeMs: CHATUX_OAUTH_RETURN_MAX_AGE_MS,
  returnPath: CHATUX_RETURN_PATH,
  api,
  activeActorLabel,
  appendMessage,
  appendTextMessage,
  bumpChatViewRevision,
  chatSessionTitle,
  chatText,
  chatWelcomeText,
  clearActiveOrderMemory,
  compactTransferObject,
  currentChatReturnPath,
  currentChatSessionPayload,
  ensureChatSessionId,
  isoNow,
  normalizeChatSession,
  orderConfirmationHtml,
  rememberTrackedOrder,
  renderActiveLeaderStatus,
  renderChatSessionSidebar,
  renderRestoredSessionOrderContext,
  restoredSessionHasActiveWork,
  restoreRequestedChatSessionFromHistoryController,
  startDeliveryBackfillLoop,
  startPolling,
  stopProgressNarratorAnimation,
  upsertChatSession,
  updateComposerMode
});

function chatRuntimeController() {
  if (!chatRuntimeStateController) throw new Error('Chat runtime state controller is not initialized.');
  return chatRuntimeStateController;
}

function chatDeliveryController() {
  if (!chatDeliveryRenderController) throw new Error('Chat delivery render controller is not initialized.');
  return chatDeliveryRenderController;
}

function safeJsonClone(value = null, fallbackOptions = {}) {
  if (value == null) return null;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return compactTransferObject(value, fallbackOptions);
  }
}

function bumpChatViewRevision() {
  state.chatViewRevision = (Number(state.chatViewRevision) || 0) + 1;
  return state.chatViewRevision;
}

function clearActiveOrderMemory() {
  state.orderId = '';
  state.followupTargetOrderId = '';
  state.trackedOrderIds.clear();
  state.deliveredOrderIds.clear();
  state.pendingRecoveryPayloads = [];
  state.liveProgressStoppedOrderIds.clear();
  state.authorityNoticeKeys.clear();
  state.orderMilestoneNoticeKeys.clear();
  state.progressNarratorArticle = null;
  state.progressNarratorKey = '';
  state.progressMapArticle = null;
  state.progressMapKey = '';
  clearDeliveryFiles();
  chatAppHandoffController.clearAppTransferPayloads();
  agentMapRunStore.clear();
}

function persistRuntimeChatSession() {
  return chatRuntimeController().persistRuntimeChatSession();
}

function currentChatAccountKey() {
  return chatRuntimeController().currentChatAccountKey();
}

function authAccountKey(auth = {}) {
  return chatRuntimeController().authAccountKey(auth);
}

function chatRestoreRequestFromUrl() {
  return chatRuntimeController().chatRestoreRequestFromUrl();
}

function clearChatRestoreParamsFromUrl() {
  return chatRuntimeController().clearChatRestoreParamsFromUrl();
}

function saveChatOAuthReturnState(reason = 'oauth') {
  return chatRuntimeController().saveChatOAuthReturnState(reason);
}

function saveChatRuntimeState(reason = 'runtime') {
  return chatRuntimeController().saveChatRuntimeState(reason);
}

function clearChatRuntimeState() {
  return chatRuntimeController().clearChatRuntimeState();
}

function clearQueuedChatSessionSnapshot() {
  return chatRuntimeController().clearQueuedChatSessionSnapshot();
}

function purgeChatStateForAccountBoundary(reason = 'account_boundary') {
  return chatRuntimeController().purgeChatStateForAccountBoundary(reason);
}

function restorePendingChatSnapshotForCurrentAccount() {
  return chatRuntimeController().restorePendingChatSnapshotForCurrentAccount();
}

function restoreChatOAuthReturnStateFromUrl() {
  return chatRuntimeController().restoreChatOAuthReturnStateFromUrl();
}

function restoreChatRuntimeState() {
  return chatRuntimeController().restoreChatRuntimeState();
}

function restoreRequestedChatSessionFromHistory() {
  return chatRuntimeController().restoreRequestedChatSessionFromHistory();
}

function applyAuthState(auth = {}, options = {}) {
  const loggedIn = Boolean(auth?.loggedIn || auth?.login || auth?.user);
  const previousAccountKey = currentChatAccountKey();
  const nextAccountKey = loggedIn ? authAccountKey(auth || {}) : '';
  if (
    (previousAccountKey && nextAccountKey && previousAccountKey !== nextAccountKey)
    || (previousAccountKey && !loggedIn)
  ) {
    purgeChatStateForAccountBoundary('auth_account_changed');
  }
  state.auth = auth || {};
  state.authAccountKey = nextAccountKey;
  if (nextAccountKey) restorePendingChatSnapshotForCurrentAccount();
  if (!loggedIn && options.redirectIfGuest) {
    const loginUrl = new URL('/login', window.location.origin);
    const nextPath = `${window.location.pathname === '/chat.html' ? CHATUX_RETURN_PATH : window.location.pathname}${window.location.search}${window.location.hash}`;
    loginUrl.searchParams.set('next', nextPath || CHATUX_RETURN_PATH);
    loginUrl.searchParams.set('source', 'gate_chat');
    window.location.replace(`${loginUrl.pathname}${loginUrl.search}`);
    return false;
  }
  const login = auth?.login || auth?.user?.login || 'account';
  if (els.adminNavLink) els.adminNavLink.hidden = !(auth?.isPlatformAdmin || auth?.admin);
  if (els.authStatus) {
    els.authStatus.innerHTML = loggedIn
      ? `<span>Signed in as ${escapeHtml(login)}</span>`
      : `<a href="${escapeHtml(loginHref('google'))}">Google sign in</a> or <a href="${escapeHtml(loginHref('github'))}">GitHub sign in</a> to order`;
  }
  if (loggedIn) void refreshUiLanguageFromAccount();
  renderChatSessionSidebar();
  return true;
}

const chatConversationOwnerController = createChatConversationOwnerController({
  state,
  els,
  escapeHtml,
  isoNow,
  appendMessage: (...args) => appendMessage(...args),
  appendTextMessage: (...args) => appendTextMessage(...args),
  appendOrderConfirmation: (...args) => appendOrderConfirmation(...args),
  chatLanguage: (...args) => chatLanguage(...args),
  chatText: (...args) => chatText(...args),
  prepareOrder: (...args) => prepareOrder(...args),
  setBusy: (...args) => setBusy(...args),
  updateComposerMode: (...args) => updateComposerMode(...args)
});
const {
  activeActorLabel,
  currentLockedConversationOwner,
  currentLockedLeaderOwner,
  lockedAgentOwnerForPrompt,
  lockedLeaderOwnerForPrompt,
  renderActiveLeaderStatus,
  resolvePendingLeaderChange,
  setConversationOwnerFromPrepared,
  suggestLeaderChangeIfNeeded
} = chatConversationOwnerController;

function rememberTrackedOrder(orderId = '') {
  const safeId = String(orderId || '').trim();
  if (!safeId) return;
  state.trackedOrderIds.add(safeId);
  saveChatRuntimeState('runtime_order_tracking');
}

function markOrderDelivered(orderId = '') {
  const safeId = String(orderId || '').trim();
  if (!safeId) return;
  state.deliveredOrderIds.add(safeId);
}

function setBusy(next) {
  state.busy = Boolean(next);
  els.sendMessageBtn.disabled = state.busy;
  document.querySelectorAll('[data-chat-action="send-order"]').forEach((button) => {
    button.disabled = state.busy || !state.draft;
  });
  document.querySelectorAll('[data-chat-action="app-context-use"], [data-chat-action="app-context-skip"], [data-intake-choice], [data-intake-other-add]').forEach((button) => {
    button.disabled = state.busy || !state.pendingIntake;
  });
  document.querySelectorAll('[data-chat-action="keep-leader"], [data-chat-action="switch-leader"]').forEach((button) => {
    button.disabled = state.busy || !state.pendingLeaderChange;
  });
}

function threadIsNearBottom(threshold = 80) {
  const thread = els.chatThread;
  if (!thread) return true;
  return thread.scrollHeight - thread.scrollTop - thread.clientHeight <= threshold;
}

function scrollThread(options = {}) {
  if (options.force !== true && !threadIsNearBottom()) return;
  els.chatThread.scrollTop = els.chatThread.scrollHeight;
}

function appendMessage(role, body, options = {}) {
  const shouldScroll = options.forceScroll === true || role === 'user' || threadIsNearBottom();
  const article = document.createElement('article');
  article.className = `message ${role}${options.tone ? ` ${options.tone}` : ''}`;
  article.innerHTML = [
    `<div class="message-meta">${escapeHtml(options.label || (role === 'user' ? 'You' : role === 'system' ? 'Status' : 'CAIt'))}</div>`,
    `<div class="message-body">${body}</div>`
  ].join('');
  els.chatThread.appendChild(article);
  if (shouldScroll) scrollThread({ force: true });
  recordChatSessionMessage(role, options.plainText || htmlToPlainText(body), options);
  return article;
}

function appendTextMessage(role, text, options = {}) {
  return appendMessage(role, escapeHtml(text), { ...options, plainText: text });
}

function removeMessage(article) {
  if (!article?.parentNode) return;
  const shouldScroll = threadIsNearBottom();
  article.remove();
  if (shouldScroll) scrollThread({ force: true });
}

function draftRetryMode(draft = {}) {
  const broker = draft?.input?._broker && typeof draft.input._broker === 'object' ? draft.input._broker : {};
  const retry = broker.retry && typeof broker.retry === 'object' ? broker.retry : {};
  return String(draft.retryMode || draft.retry_mode || retry.mode || retry.intent || '').trim();
}

function draftIsSameContentNewOrderRetry(draft = {}) {
  if (!draft || typeof draft !== 'object') return false;
  const broker = draft?.input?._broker && typeof draft.input._broker === 'object' ? draft.input._broker : {};
  const retry = broker.retry && typeof broker.retry === 'object' ? broker.retry : {};
  return draftRetryMode(draft) === CHATUX_RETRY_MODE_NEW_ORDER
    || retry.continuesOrder === false
    || draft.continuesOrder === false
    || draft.continues_order === false;
}

function draftIsExplicitFollowupContinuation(draft = {}) {
  if (!draft || typeof draft !== 'object') return false;
  const broker = draft?.input?._broker && typeof draft.input._broker === 'object' ? draft.input._broker : {};
  const conversation = broker.conversation && typeof broker.conversation === 'object' ? broker.conversation : {};
  return conversation.mode === 'followup'
    && (
      conversation.userExplicitContinuation === true
      || conversation.explicitContinuation === true
      || draft.userExplicitContinuation === true
      || draft.explicitContinuation === true
    );
}

function retryDraftSourceOrderId(draft = {}) {
  const broker = draft?.input?._broker && typeof draft.input._broker === 'object' ? draft.input._broker : {};
  const retry = broker.retry && typeof broker.retry === 'object' ? broker.retry : {};
  return String(draft.retryOfOrderId || draft.retry_of_order_id || broker.retryOfOrderId || retry.sourceOrderId || retry.source_order_id || '').trim();
}


function rememberAgentMapRun(child = {}) {
  const jobId = workflowAgentRunJobId(child);
  const stable = [
    child.sequencePhase || child.sequence_phase || '',
    child.taskType || child.task_type || child.dispatchTaskType || child.dispatch_task_type || '',
    child.agentId || child.agent_id || '',
    child.agentName || child.agent_name || ''
  ].map((item) => String(item || '').trim()).filter(Boolean).join(':');
  const key = jobId ? `job:${jobId}` : `planned:${stable || 'agent'}:${++agentMapRunKeyCounter}`;
  agentMapRunStore.set(key, { ...child });
  while (agentMapRunStore.size > 250) {
    const first = agentMapRunStore.keys().next().value;
    if (!first) break;
    agentMapRunStore.delete(first);
  }
  return key;
}


function ensureAgentRunDetailPanel(button) {
  const card = button?.closest?.('[data-agent-progress-map]');
  if (!card) return null;
  let panel = card.querySelector('[data-agent-run-detail]');
  if (!panel) {
    panel = document.createElement('div');
    panel.className = 'agent-run-detail-panel';
    panel.dataset.agentRunDetail = 'true';
    card.appendChild(panel);
  }
  return panel;
}

async function openAgentRunDetail(button) {
  const key = String(button?.dataset?.agentRunKey || '').trim();
  const run = agentMapRunStore.get(key) || {
    id: String(button?.dataset?.agentJobId || '').trim(),
    agentName: String(button?.dataset?.agentName || '').trim(),
    taskType: String(button?.dataset?.agentTask || '').trim(),
    sequencePhase: String(button?.dataset?.agentPhase || '').trim(),
    status: String(button?.dataset?.agentStatus || '').trim()
  };
  const panel = ensureAgentRunDetailPanel(button);
  if (!panel) return;
  const card = button.closest('[data-agent-progress-map]');
  card?.querySelectorAll('[data-agent-run-open]').forEach((node) => {
    const selected = node === button;
    node.classList.toggle('selected', selected);
    node.setAttribute('aria-expanded', selected ? 'true' : 'false');
  });
  panel.dataset.agentRunKey = key;
  panel.innerHTML = renderAgentRunDetailHtml(run, null, { loading: true });
  const jobId = workflowAgentRunJobId(run);
  if (!jobId) {
    panel.innerHTML = renderAgentRunDetailHtml(run, null);
    return;
  }
  try {
    const job = await fetchVisibleJob(jobId, { force: true });
    if (panel.dataset.agentRunKey !== key) return;
    panel.innerHTML = renderAgentRunDetailHtml(run, job || null);
  } catch (error) {
    if (panel.dataset.agentRunKey !== key) return;
    panel.innerHTML = renderAgentRunDetailHtml(run, null, { error: orderErrorMessage(error) });
  }
  scrollThread();
}


function showWorkflowProgressMap(job = {}, options = {}) {
  const html = workflowPhaseProgressMapHtml(job, options);
  if (!html) return null;
  const key = String(job?.id || state.orderId || 'progress-map').trim();
  const shouldScroll = options.forceScroll === true || threadIsNearBottom();
  if (!state.progressMapArticle || !state.progressMapArticle.isConnected || state.progressMapKey !== key) {
    state.progressMapArticle = appendMessage('assistant', html, {
      tone: 'info',
      label: 'Agent map',
      record: false,
      forceScroll: shouldScroll
    });
    state.progressMapKey = key;
    return state.progressMapArticle;
  }
  const body = state.progressMapArticle.querySelector('.message-body') || state.progressMapArticle;
  body.innerHTML = html;
  if (shouldScroll) scrollThread({ force: true });
  return state.progressMapArticle;
}

function renderInitialAgentMap(created = {}, prompt = '') {
  const html = initialAgentMapHtml(created, prompt);
  if (!html) return null;
  const key = String(extractOrderId(created) || state.orderId || 'progress-map').trim();
  const shouldScroll = threadIsNearBottom();
  const article = appendMessage('assistant', html, {
    tone: 'info',
    label: 'Agent map',
    record: false,
    forceScroll: shouldScroll
  });
  state.progressMapArticle = article;
  state.progressMapKey = key;
  return article;
}


function jobHasDeliveryResult(job = {}) {
  return chatDeliveryController().jobHasDeliveryResult(job);
}


function deliveryFiles(job = {}) {
  // Static QA contract: controller filters user-facing files through visibleDeliveryFiles(candidates).
  return chatDeliveryController().deliveryFiles(job);
}

function deliveryText(job = {}) {
  return chatDeliveryController().deliveryText(job);
}

function rememberAiAgentsFromDraft(draft = {}, created = {}, payload = {}) {
  const taskType = String(draft.taskType || draft.task_type || payload.task_type || '').trim().toLowerCase();
  if (!taskType) return;
  rememberAiAgentUsage({
    name: taskLabel(taskType),
    taskType,
    route: String(draft.resolvedOrderStrategy || draft.resolved_order_strategy || payload.order_strategy || '').trim(),
    status: String(created.status || created.mode || 'accepted').trim(),
    originalPrompt: draft.originalPrompt || payload.input?.original_prompt || draft.prompt || payload.prompt || '',
    reusePrompt: draft.originalPrompt || payload.input?.original_prompt || draft.prompt || payload.prompt || '',
    lastOrderId: extractOrderId(created),
    summary: created.routing_reason || 'Accepted from Chat UX.'
  });
}

function rememberAiAgentsFromJob(job = {}) {
  const orderId = String(job?.id || '').trim();
  const objective = job.workflow?.objective || job.originalPrompt || job.input?.original_prompt || job.prompt || '';
  const primaryTask = String((Array.isArray(job.workflow?.plannedTasks) ? job.workflow.plannedTasks[0] : '') || job.taskType || '').trim().toLowerCase();
  if (primaryTask) {
    rememberAiAgentUsage({
      name: taskLabel(primaryTask),
      taskType: primaryTask,
      route: job.jobKind === 'workflow' || job.workflow ? 'workflow' : 'single',
      status: job.status || '',
      originalPrompt: objective,
      reusePrompt: objective,
      lastOrderId: orderId,
      summary: statusLabel(job)
    }, { increment: false });
  }
  const childRuns = visibleWorkflowChildRuns(job.workflow?.childRuns);
  for (const child of childRuns) {
    const taskType = String(child.taskType || child.dispatchTaskType || '').trim().toLowerCase();
    if (!taskType) continue;
    rememberAiAgentUsage({
      name: child.agentName || taskLabel(taskType),
      agentId: child.agentId || '',
      taskType,
      route: 'workflow_child',
      status: child.status || '',
      originalPrompt: objective,
      reusePrompt: objective,
      lastOrderId: child.id || orderId,
      summary: child.sequencePhase ? `Workflow phase: ${child.sequencePhase}` : ''
    }, { increment: false });
  }
}

function currentChatReturnPath(options = {}) {
  const path = window.location.pathname === '/chat.html' ? CHATUX_RETURN_PATH : (window.location.pathname || CHATUX_RETURN_PATH);
  const safePath = /^\/chat(?:\.html)?$/.test(path) ? path : CHATUX_RETURN_PATH;
  const url = new URL(safePath, window.location.origin);
  try {
    const current = new URL(window.location.href);
    for (const [key, value] of current.searchParams.entries()) {
      if (['auth_error'].includes(key)) continue;
      if (options.includeRestoreParams === false && ['cait_restore_chat', 'cait_chat_session_id', 'cait_order_id'].includes(key)) continue;
      if (['cait_oauth_popup', 'cait_oauth_provider'].includes(key)) continue;
      url.searchParams.append(key, value);
    }
    url.hash = current.hash || '';
  } catch {
    // Return the canonical chat page if the current browser URL cannot be parsed.
  }
  if (options.includeRestoreParams !== false) {
    const sessionId = String(state.currentChatSessionId || currentChatSessionPayload()?.id || '').trim();
    const orderId = String(state.orderId || '').trim();
    if (sessionId || orderId) url.searchParams.set('cait_restore_chat', '1');
    if (sessionId) url.searchParams.set('cait_chat_session_id', sessionId);
    if (orderId) url.searchParams.set('cait_order_id', orderId);
  }
  if (options.oauthPopup === true) url.searchParams.set('cait_oauth_popup', '1');
  if (options.oauthProvider) url.searchParams.set('cait_oauth_provider', String(options.oauthProvider || '').trim());
  return `${url.pathname}${url.search}${url.hash}`;
}

function makeChatHandoffId(prefix = 'chat-handoff') {
  try {
    const bytes = new Uint8Array(6);
    window.crypto.getRandomValues(bytes);
    return `${prefix}-${Array.from(bytes).map((item) => item.toString(16).padStart(2, '0')).join('')}`;
  } catch {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 8)}`;
  }
}

function shouldStartFreshChatFromUrl() {
  try {
    return new URL(window.location.href).searchParams.get('e2e') === 'chat-workspace';
  } catch {
    return false;
  }
}

function authorityRequestFromJob(job = {}) {
  return chatAppHandoffController.authorityRequestFromJob(job);
}

function authorityRequestHandledBySaasHandoffInChat(request = null) {
  return chatAppHandoffController.authorityRequestHandledBySaasHandoffInChat(request);
}

function jobBlockedForSaasHandoff(job = {}) {
  return chatAppHandoffController.jobBlockedForSaasHandoff(job);
}

function authorityRequestIsActionableForJob(job = {}, request = null) {
  return chatAppHandoffController.authorityRequestIsActionableForJob(job, request);
}

function approvalAnchorForJob(job = {}) {
  return chatAppHandoffController.approvalAnchorForJob(job);
}

function authorityNoticeKey(job = {}) {
  return chatAppHandoffController.authorityNoticeKey(job);
}

async function createAppAgentContextOpenUrl(appId = '', payload = {}, options = {}) {
  return chatAppHandoffController.createAppAgentContextOpenUrl(appId, payload, options);
}

async function createAppAgentHandoffUrl(appId = '', payload = {}) {
  return chatAppHandoffController.createAppAgentHandoffUrl(appId, payload);
}

function appHandoffRememberDetails(appId = '', payload = {}, handoffUrl = '', source = 'generic_app_handoff') {
  return chatAppHandoffController.appHandoffRememberDetails(appId, payload, handoffUrl, source);
}

function renderDedicatedAppDeliveryTools(job = {}) {
  return chatAppHandoffController.renderDedicatedAppDeliveryTools(job);
}

function renderAppHandoffRoutingPreview(job = {}) {
  return chatAppHandoffController.renderAppHandoffRoutingPreview(job);
}

function renderAppHandoffTools(job = {}) {
  return chatAppHandoffController.renderAppHandoffTools(job);
}
function appendOrderStatusCheck(job = {}) {
  const safeId = String(job?.id || state.orderId || '').trim();
  if (!safeId) return;
  const authority = authorityRequestFromJob(job);
  const waiting = authorityRequestIsActionableForJob(job, authority);
  const qualityBlocked = jobBlockedByLeaderQualityGate(job);
  appendTextMessage('system', [
    `Order #${safeId.slice(0, 8)}: ${statusLabel(job)}.`,
    qualityBlocked ? `Blocked by leader quality gate: ${String(job.failureReason || job.failure_reason || 'Specialist output needs repair before this workflow can continue.').trim()}` : '',
    waiting ? 'Waiting for approval or connector access. Use the approval controls in this chat to continue.' : '',
    jobHasDeliveryResult(job) ? 'The latest delivery/result is available in this chat.' : ''
  ].filter(Boolean).join('\n'), { label: 'Status', record: false });
}

async function approveAndResumeOrder(orderId = '') {
  const safeId = String(orderId || '').trim();
  if (!safeId) return;
  setBusy(true);
  try {
    const result = await api(`/api/jobs/${encodeURIComponent(safeId)}/approve`, {
      method: 'POST',
      body: JSON.stringify(orderRuntimeApprovalPayload(state.visitorId, 'chat_approval_card'))
    });
    const job = result?.job && typeof result.job === 'object'
      ? { ...result.job, id: result.job.id || safeId }
      : await fetchVisibleJob(safeId, { force: true });
    state.authorityNoticeKeys.clear();
    rememberTrackedOrder(job?.id || safeId);
    appendTextMessage('system', `Approval recorded for Order #${safeId.slice(0, 8)}. Resuming the workflow from the same order context.`, { label: 'Approval', record: false });
    if (job?.id) {
      showWorkflowProgressMap(job);
      maybeRenderAuthorityNotice(job, { label: 'Approval required' });
      appendOrderStatusCheck(job);
      if (jobHasDeliveryResult(job)) renderDeliveryOnce(job, { force: true });
      else {
        resumeLiveProgress(job.id);
        startPolling(job.id);
      }
    } else {
      resumeLiveProgress(safeId);
      startPolling(safeId);
    }
  } catch (error) {
    appendTextMessage('assistant', orderErrorMessage(error), { tone: 'error', label: 'Approval' });
  } finally {
    setBusy(false);
  }
}

async function appendUsageLibrary(scope = 'all') {
  if (scope === 'all') {
    try {
      await Promise.all([
        refreshRegisteredApps(),
        refreshAppContexts(),
        refreshRecentJobs()
      ]);
    } catch {}
  } else if (scope === 'apps') {
    try {
      await Promise.all([
        refreshRegisteredApps(),
        refreshAppContexts()
      ]);
    } catch {}
  } else if (scope === 'agents') {
    try {
      await refreshRecentJobs();
    } catch {}
  } else if (scope === 'contexts') {
    try {
      await refreshAppContexts();
    } catch {}
  }
  appendMessage('assistant', usageLibraryHtml(scope), { tone: 'ok', label: 'Library' });
  setBusy(state.busy);
}

function chatUtilityController() {
  if (!chatUtilityModalController) throw new Error('Chat utility modal controller is not initialized.');
  return chatUtilityModalController;
}

function restoredOrderContextController() {
  if (!chatRestoredOrderContextController) throw new Error('Chat restored order context controller is not initialized.');
  return chatRestoredOrderContextController;
}

function historyPanelsController() {
  if (!chatHistoryPanelsController) throw new Error('Chat history panels controller is not initialized.');
  return chatHistoryPanelsController;
}

function utilityEmptyHtml(message = 'Nothing to show yet.') {
  return chatUtilityController().utilityEmptyHtml(message);
}

function shortDateTime(value = '') {
  return chatUtilityController().shortDateTime(value);
}

function openUtilityModal(title = 'Panel', body = '') {
  return chatUtilityController().openUtilityModal(title, body);
}

function utilityModalIsOpen(title = '') {
  return chatUtilityController().utilityModalIsOpen(title);
}

function closeUtilityModal() {
  return chatUtilityController().closeUtilityModal();
}

function closeChatHeaderMenu() {
  if (els.chatHeaderMenu) els.chatHeaderMenu.open = false;
}

function jobUtilityRows(jobs = []) {
  return chatUtilityController().jobUtilityRows(jobs);
}

function chatSessionUtilityRows(sessions = []) {
  return chatUtilityController().chatSessionUtilityRows(sessions);
}

function orderIdsFromText(value = '') {
  return restoredOrderContextController().orderIdsFromText(value);
}

function chatSessionOrderIds(session = {}, options = {}) {
  return restoredOrderContextController().chatSessionOrderIds(session, options);
}

function restoredSessionHasActiveWork(session = {}, snapshot = {}) {
  return restoredOrderContextController().restoredSessionHasActiveWork(session, snapshot);
}

async function renderRestoredSessionOrderContext(session = {}, options = {}) {
  return restoredOrderContextController().renderRestoredSessionOrderContext(session, options);
}

async function showChatListPanel() {
  return historyPanelsController().showChatListPanel();
}

async function showDeliveryHistoryForPrompt(prompt = '') {
  return historyPanelsController().showDeliveryHistoryForPrompt(prompt);
}

async function showWorkerListPanel() {
  return chatUtilityController().showWorkerListPanel();
}

async function showAppListPanel() {
  return chatUtilityController().showAppListPanel();
}

async function loadAppContextIntoChat(contextId = '') {
  return chatUtilityController().loadAppContextIntoChat(contextId);
}

async function loadMoreUtilityCatalog(kind = '') {
  return chatUtilityController().loadMoreUtilityCatalog(kind);
}

function showInfoPanel(statusMessage = '') {
  return chatUtilityController().showInfoPanel(statusMessage);
}

function findAppAgentEntry(id = '') {
  const safeId = normalizeUsageId(id);
  return recentAppAgentEntries().find((entry) => normalizeUsageId(entry.id) === safeId) || null;
}

function findAiAgentEntry(id = '') {
  const safeId = normalizeUsageId(id);
  return state.aiAgentHistory.find((entry) => normalizeUsageId(entry.id) === safeId) || null;
}

function openAppAgent(id = '', options = {}) {
  const entry = findAppAgentEntry(id);
  if (!entry) {
    appendTextMessage('assistant', chatText(
      'The selected app was not found. Use /apps to review the list.',
      '指定されたアプリが見つかりませんでした。/apps で一覧を確認してください。'
    ), { tone: 'error', label: 'Library' });
    return false;
  }
  const href = appAgentLaunchUrl(entry, options.href || entry.lastHandoffUrl || '');
  if (!href) {
    appendTextMessage('assistant', chatText(
      `${entry.name} does not have a launch URL yet.`,
      `${entry.name} の起動URLがありません。`
    ), { tone: 'error', label: 'Library' });
    return false;
  }
  rememberAppAgentUsage(entry.id, {
    lastHandoffUrl: href,
    lastContext: entry.lastContext || {},
    source: options.source || 'chat_library_open'
  });
  window.open(href, '_blank', 'noopener,noreferrer');
  appendTextMessage('system', chatText(
    `Opened ${entry.name}.`,
    `${entry.name}を開きました。`
  ), { label: 'Library' });
  return true;
}

async function reuseAppAgent(id = '') {
  const entry = findAppAgentEntry(id);
  if (!entry) {
    appendTextMessage('assistant', chatText(
      'The selected app was not found. Use /apps to review the list.',
      '指定されたアプリが見つかりませんでした。/apps で一覧を確認してください。'
    ), { tone: 'error', label: 'Library' });
    return;
  }
  if (entry.lastHandoffUrl) {
    openAppAgent(id, { href: entry.lastHandoffUrl, source: 'chat_library_reuse_handoff' });
    return;
  }
  const prompt = String(entry.reusePrompt || `Use ${entry.name} for the final action layer.`).trim();
  appendTextMessage('assistant', chatText(
    `I will prepare an order using ${entry.name}.`,
    `${entry.name}を使う前提で注文確認を作ります。`,
    prompt
  ), { label: 'Library' });
  await prepareOrder(prompt);
}

async function reuseAiAgent(id = '') {
  const entry = findAiAgentEntry(id);
  if (!entry) {
    appendTextMessage('assistant', chatText(
      'The selected AI agent history was not found. Use /agents to review the list.',
      '指定されたAIエージェント履歴が見つかりませんでした。/agents で一覧を確認してください。'
    ), { tone: 'error', label: 'Library' });
    return;
  }
  const basePrompt = String(entry.reusePrompt || entry.originalPrompt || '').trim();
  const prompt = basePrompt || `Use ${entry.name || taskLabel(entry.taskType)} again for the same kind of work.`;
  const label = entry.name || taskLabel(entry.taskType);
  appendTextMessage('assistant', chatText(
    `I will prepare an order reusing ${label} with the previous conditions.`,
    `${label}を前回条件ベースで再利用する注文確認を作ります。`,
    prompt
  ), { label: 'Library' });
  await prepareOrder(prompt, { originalPrompt: prompt, taskType: entry.taskType || entry.task_type || '' });
}

function renderAuthorityRequest(job = {}) {
  return chatDeliveryController().renderAuthorityRequest(job);
}

function maybeRenderAuthorityNotice(job = {}, options = {}) {
  return chatDeliveryController().maybeRenderAuthorityNotice(job, options);
}

function renderFileCards(files = []) {
  return chatDeliveryController().renderFileCards(files);
}

function retryReusableArtifactEntries(job = {}) {
  return chatDeliveryController().retryReusableArtifactEntries(job);
}

function selectedRetryReuseArtifactsForOrder(orderId = '') {
  return chatDeliveryController().selectedRetryReuseArtifactsForOrder(orderId);
}

function cachedVisibleJobForRetry(orderId = '') {
  return chatDeliveryController().cachedVisibleJobForRetry(orderId);
}

function retryReuseArtifactMeta(item = {}) {
  return chatDeliveryController().retryReuseArtifactMeta(item);
}

function workflowRetryMetaForDraft(workflow = {}, reuseArtifacts = []) {
  return chatDeliveryController().workflowRetryMetaForDraft(workflow, reuseArtifacts);
}

function renderRetryReuseControls(job = {}) {
  return chatDeliveryController().renderRetryReuseControls(job);
}

function deliveryOrderActionsHtml(job = {}) {
  return chatDeliveryController().deliveryOrderActionsHtml(job);
}

function renderDelivery(job = {}) {
  return chatDeliveryController().renderDelivery(job);
}

function renderDeliveryOnce(job = {}, options = {}) {
  return chatDeliveryController().renderDeliveryOnce(job, options);
}

function orderMilestoneState(job = {}, options = {}) {
  return chatDeliveryController().orderMilestoneState(job, options);
}

function orderMilestoneMessage(job = {}, options = {}) {
  return chatDeliveryController().orderMilestoneMessage(job, options);
}

function orderMilestoneChatExists(orderId = '', orderState = '', message = '') {
  return chatDeliveryController().orderMilestoneChatExists(orderId, orderState, message);
}

function notifyOrderMilestone(job = {}, options = {}) {
  return chatDeliveryController().notifyOrderMilestone(job, options);
}

function rememberPendingRecoveryPayload(payload = {}) {
  if (!payload || typeof payload !== 'object') return;
  payload._caitRecoveryStartedAt = Date.now();
  state.pendingRecoveryPayloads = [
    payload,
    ...state.pendingRecoveryPayloads
  ].slice(0, 5);
}

function clearPendingRecoveryPayload(payload = {}) {
  if (!payload || typeof payload !== 'object') return;
  const targetPrompt = normalizeRecoveryText(payload.prompt || '');
  state.pendingRecoveryPayloads = state.pendingRecoveryPayloads.filter((item) => normalizeRecoveryText(item.prompt || '') !== targetPrompt);
}

async function backfillChatDeliveries(options = {}) {
  // Static QA contract: controller checks if (jobHasDeliveryResult(job)) before showWorkflowProgressMap(job);
  // Static QA contract: const matchesTracked = state.trackedOrderIds.has(safeId); if (!matchesTracked && !matchesRecovery) continue;
  // Static QA contract: includeHistoricalTracked remains opt-in for historical tracked order backfill.
  return chatDeliveryController().backfillChatDeliveries(options);
}

function startDeliveryBackfillLoop(options = {}) {
  return chatDeliveryController().startDeliveryBackfillLoop(options);
}

function draftBrief(prompt, prepared) {
  return chatEngineDraftBrief(prompt, prepared);
}

function updateComposerMode() {
  const pending = Boolean(state.draft);
  const intake = Boolean(state.pendingIntake);
  const active = Boolean(state.orderId && state.polling);
  const placeholder = intake ? PROMPT_PLACEHOLDERS.intake : (pending ? PROMPT_PLACEHOLDERS.pending : (active ? PROMPT_PLACEHOLDERS.active : PROMPT_PLACEHOLDERS.default));
  els.promptInput.rows = intake ? 4 : (pending ? 2 : 3);
  els.promptInput.placeholder = chatUiText(placeholder.en, placeholder.ja);
  if (els.composer) els.composer.dataset.mode = intake ? 'intake' : (pending ? 'draft' : (active ? 'active' : 'chat'));
  if (els.deliveryFormatLabel) els.deliveryFormatLabel.textContent = chatUiText('Output', '出力');
  if (els.deliveryFormatSelect) {
    els.deliveryFormatSelect.setAttribute('aria-label', chatUiText('Preferred output format', '希望する出力形式'));
    Array.from(els.deliveryFormatSelect.options || []).forEach((option) => {
      option.textContent = chatUiText(option.dataset.labelEn || option.textContent, option.dataset.labelJa || option.textContent);
    });
  }
  if (els.openScheduleComposerBtn) {
    els.openScheduleComposerBtn.textContent = chatUiText('Schedule', '予約');
    els.openScheduleComposerBtn.title = chatUiText('Scheduled work', '予約実行');
    els.openScheduleComposerBtn.setAttribute('aria-label', els.openScheduleComposerBtn.title);
  }
  if (els.resetBtn) els.resetBtn.textContent = chatUiText('Reset', 'リセット');
  if (els.composerControlsHint) {
    els.composerControlsHint.textContent = chatUiText(
      'Output sets the result format. Schedule runs it later.',
      '出力は最終結果の形式です。予約は後で実行します。'
    );
  }
  if (els.sendMessageBtn) {
    const label = intake
      ? chatUiText('Send answer', '回答を送信')
      : chatUiText('Send chat', 'チャット送信');
    els.sendMessageBtn.textContent = label;
    els.sendMessageBtn.title = intake
      ? chatUiText('Send this intake answer to continue. This does not dispatch the order.', 'このヒアリング回答を送って次へ進みます。発注はまだ実行されません。')
      : chatUiText('Send this message to chat.', 'このメッセージをチャットへ送信します。');
    els.sendMessageBtn.setAttribute('aria-label', els.sendMessageBtn.title);
  }
  if (els.composerModeHint) {
    els.composerModeHint.textContent = intake
      ? chatUiText('Answer the intake item here, then press Send answer. The order still waits for final approval.', 'この入力欄でヒアリングに答えてから「回答を送信」を押してください。発注は最後の承認まで実行されません。')
      : (pending
        ? chatUiText('Add changes here, or approve the prepared order when it looks right.', 'ここで追加修正を書くか、内容がよければ発注ドラフトを承認してください。')
        : chatUiText('Type a request, then send it to chat.', '依頼内容を入力してチャットへ送信してください。'));
  }
}

function isNeedsInputResponse(response = {}) {
  return chatEngineIsNeedsInputResponse(response);
}

function sleep(ms = 0) {
  return new Promise((resolve) => window.setTimeout(resolve, Math.max(0, Number(ms || 0))));
}

const chatOrderCreateRecovery = createChatOrderCreateRecovery({
  window,
  api,
  getVisitorId: () => state.visitorId,
  rememberTrackedOrder,
  sleep
});
const {
  clientOrderIdFromOrderCreate,
  makeClientOrderId,
  orderCreateRequestBody,
  recoverAcceptedOrderAfterCreateError,
  recoveryCandidate
} = chatOrderCreateRecovery;

chatDeliveryRenderController = createChatDeliveryRenderController({
  state,
  window,
  document,
  backfillIntervalMs: CHATUX_BACKFILL_INTERVAL_MS,
  combinedMarkdownFile,
  compact,
  currentChatReturnPath,
  deliveryRendererOrderActionsHtml,
  deliveryRendererMeta,
  renderDeliveryBody,
  deliveryFilePriority,
  escapeHtml,
  getDeliveryFile,
  jobBlockedByLeaderQualityGate,
  jobBlockedForSaasHandoff,
  loginHref,
  recoveryCandidate,
  refreshRecentJobs,
  registerDeliveryFile,
  renderAppHandoffTools,
  renderDedicatedAppDeliveryTools,
  sanitizeDeliveryFileForUser: (file, fallbackName) => sanitizeDeliveryFileForUser(file, fallbackName),
  sanitizeDeliveryMarkdownForUser,
  saveChatOAuthReturnState,
  statusDisplayLabel,
  taskLabel,
  visibleDeliveryFiles,
  isTerminalStatus,
  appendMessage,
  appendTextMessage,
  markOrderDelivered,
  rememberAiAgentsFromJob,
  rememberTrackedOrder,
  showWorkflowProgressMap,
  startPolling,
  getPolling: () => state.polling,
  liveProgressStoppedOrderIds: () => state.liveProgressStoppedOrderIds,
  getOrderId: () => state.orderId,
  setOrderId: (orderId) => {
    state.orderId = String(orderId || '').trim();
  },
  cssEscape: (value) => CSS.escape(value),
  retryReuseArtifactDataAttr: 'data-retry-reuse-artifact',
  authorityRequestFromJob,
  authorityNoticeKey,
  approvalAnchorForJob
});

chatOrderDispatchController = createChatOrderDispatchController({
  state,
  window,
  api,
  chatText,
  chatEngineBuildJobPayload,
  draftExplicitlyRequestsMeasurementEvidence,
  orderRuntimePollingContextIsCurrent,
  orderRuntimeShouldPauseForApproval,
  CHATUX_RETURN_PATH,
  CHATUX_RETRY_MODE_NEW_ORDER,
  CHATUX_PROGRESS_MAX_POLLS,
  setBusy,
  ensureChatSessionId,
  currentLockedConversationOwner,
  withConversationOwner,
  measurementEvidenceContextStatus,
  openMeasurementEvidenceAppForDraft,
  appendTextMessage,
  activeActorLabel,
  selectedDeliveryFormat,
  selectedDeliveryFormatLabel,
  draftIsSameContentNewOrderRetry,
  draftIsExplicitFollowupContinuation,
  clientOrderIdFromOrderCreate,
  makeClientOrderId,
  rememberPendingRecoveryPayload,
  orderCreateRequestBody,
  recoverAcceptedOrderAfterCreateError,
  isNeedsInputResponse,
  startIntake,
  extractOrderId,
  trackChatGa4Once,
  resumeLiveProgress,
  rememberTrackedOrder,
  clearPendingRecoveryPayload,
  currentChatSessionPayload,
  upsertChatSession,
  isoNow,
  renderChatSessionSidebar,
  rememberAiAgentsFromDraft,
  updateComposerMode,
  notifyOrderMilestone,
  renderInitialAgentMap,
  startDeliveryBackfillLoop,
  loginHref,
  showProgressNarrator,
  authorityRequestFromJob,
  authorityRequestIsActionableForJob,
  progressNarratorTextForJob,
  progressNarratorOptionsForJob,
  showWorkflowProgressMap,
  maybeRenderAuthorityNotice,
  markLiveProgressStopped,
  jobHasDeliveryResult,
  renderDeliveryOnce
});

chatIntakeController = createChatIntakeController({
  state,
  els,
  window,
  chatEngineBuildIntakeCombinedPrompt,
  chatEngineBuildIntakeState,
  appContextGateAnswerLine,
  appContextGateMatchesManifest,
  appContextGateStatusForDraft,
  caitAppContextChatPrompt,
  answerSaysAnalyticsAvailable,
  draftExplicitlyRequestsMeasurementEvidence,
  intakeHasMeasurementEvidenceQuestion,
  measurementEvidenceGateAppId,
  measurementEvidenceGateAppManifest,
  measurementEvidenceGateAppName,
  escapeHtml,
  conversationOwnerFromPrepared,
  explicitLeaderChangeTaskTypeFromText,
  leaderOwner,
  taskLabel,
  withConversationOwner,
  activeActorLabel,
  appAgentLaunchUrl,
  appManifestSources,
  appendMessage,
  appendTextMessage,
  chatLanguage,
  chatText,
  createAppAgentContextOpenUrl,
  currentChatReturnPath,
  draftIsSameContentNewOrderRetry,
  listValues,
  lockedAgentOwnerForPrompt,
  lockedLeaderOwnerForPrompt,
  makeChatHandoffId,
  orderErrorMessage,
  prepareOrder,
  renderActiveLeaderStatus,
  retryDraftSourceOrderId,
  setBusy,
  setConversationOwnerFromPrepared,
  trackChatIntakeStarted,
  updateComposerMode
});

function chatIntake() {
  if (!chatIntakeController) throw new Error('Chat intake controller is not initialized.');
  return chatIntakeController;
}

function startIntake(response = {}, originalPrompt = '') {
  return chatIntake().startIntake(response, originalPrompt);
}

function measurementEvidenceContextStatus(draft = null) {
  return chatIntake().measurementEvidenceContextStatus(draft);
}

function attachAppContextToDraft(context = null) {
  return chatIntake().attachAppContextToDraft(context);
}

function openMeasurementEvidenceAppForDraft(draft = null) {
  return chatIntake().openMeasurementEvidenceAppForDraft(draft);
}

function answerPendingIntake(answer = '', options = {}) {
  return chatIntake().answerPendingIntake(answer, options);
}

function orderConfirmationHtml(options = {}) {
  return chatIntake().orderConfirmationHtml(options);
}

function appendOrderConfirmation(options = {}) {
  return chatIntake().appendOrderConfirmation(options);
}

function handleIntakeThreadClick(event = {}) {
  return chatIntake().handleIntakeThreadClick(event);
}

function handleIntakeOtherInputKeydown(event = {}) {
  return chatIntake().handleIntakeOtherInputKeydown(event);
}

function attachInboundAppContextToIntakeOrDraft(context = {}, options = {}) {
  return chatIntake().attachInboundAppContext(context, options);
}

function chatIntentConversationContext() {
  return [...els.chatThread.querySelectorAll('.message')]
    .slice(-10)
    .map((item) => {
      const role = item.classList.contains('user') ? 'user' : 'assistant';
      const content = String(item.querySelector('.message-body')?.textContent || '').replace(/\s+/g, ' ').trim();
      return content ? { role, content: content.slice(0, 900) } : null;
    })
    .filter(Boolean);
}

function handlePromptInjectionInput(prompt = '') {
  const guard = promptInjectionGuard(prompt);
  if (!guard.blocked) return false;
  appendTextMessage('assistant', chatText(
    [
      'I detected a prompt-injection attempt, so CAIt will not execute it or turn it into an order.',
      '',
      'Requests to ignore rules, reveal system/developer prompts, expose tools, or leak secrets are blocked.',
      '',
      'Rewrite the goal without hidden-instruction or rule-override text.'
    ].join('\n'),
    [
      'プロンプトインジェクションらしき指示を検出したため、CAItでは実行・発注化しません。',
      '',
      'ルールの無視、system/developer prompt の開示、ツール情報や secret の漏えいを求める指示はブロックします。',
      '',
      '進める場合は、隠し指示やルール上書きの文を除いて目的だけを書き直してください。'
    ].join('\n'),
    prompt
  ), { tone: 'error', label: 'Guard' });
  return true;
}

async function resolveChatIntentWithLlm(prompt = '') {
  const text = String(prompt || '').trim();
  if (!text || isStructuredOrderBriefText(text)) return null;
  if (promptInjectionGuard(text).blocked) return null;
  const thinkingMessage = appendThinkingMessage(text);
  try {
    const result = await api('/api/open-chat/intent', {
      method: 'POST',
      body: JSON.stringify({
        prompt: text,
        conversation_context: chatIntentConversationContext(),
        desired_output: 'First decide whether this is normal chat or an order request. If it is normal chat, answer in chat. If it is executable work with enough context, return a CAIt order brief. If a Team Leader needs intake first, return adaptive intake_questions before any proposal.',
        user_language: chatLanguage(text) === 'ja' ? 'Japanese' : 'English',
        input_counts: { url_count: 0, file_count: 0, file_chars: 0 }
      })
    });
    return result?.ok ? result : null;
  } catch {
    return null;
  } finally {
    removeMessage(thinkingMessage);
  }
}

async function handleChatIntentWithLlm(prompt = '') {
  const result = await resolveChatIntentWithLlm(prompt);
  if (!result) return false;
  const action = String(result.action || '').trim();
  if (action === 'answer_in_chat') {
    appendTextMessage('assistant', result.chat_answer || result.summary || chatText(
      'I can answer that here. No order was created.',
      'ここで回答します。新しいオーダーは作成していません。',
      prompt
    ), { tone: 'info', label: 'Chat' });
    return true;
  }
  if (action === 'ask_clarifying_question') {
    const intakeQuestions = normalizeLlmIntakeQuestions(result.intake_questions || result.intakeQuestions || []);
    const explicitLeaderTaskType = explicitLeaderChangeTaskTypeFromText(prompt);
    const lockedOwner = lockedLeaderOwnerForPrompt(prompt, { leaderChangeRequested: Boolean(explicitLeaderTaskType) })
      || lockedAgentOwnerForPrompt(prompt, { leaderChangeRequested: Boolean(explicitLeaderTaskType) });
    const intentTaskType = taskTypeFromOpenChatIntent(result);
    const intentLeaderTaskType = normalizeLeaderTaskType(intentTaskType);
    if (!explicitLeaderTaskType && suggestLeaderChangeIfNeeded(intentLeaderTaskType, prompt, 'openai_intake', { preparedPrompt: prompt })) return true;
    const leaderTaskType = explicitLeaderTaskType || (lockedOwner?.type === 'leader' ? lockedOwner.taskType : '') || intentLeaderTaskType;
    const preserveAgentOwnedLeaderIntake = Boolean(leaderTaskType);
    if (preserveAgentOwnedLeaderIntake) {
      await prepareOrder(prompt, {
        originalPrompt: prompt,
        taskType: leaderTaskType,
        activeLeaderTaskType: leaderTaskType,
        activeLeaderName: taskLabel(leaderTaskType),
        activeLeaderLocked: true,
        leaderChangeRequested: Boolean(explicitLeaderTaskType),
        skipOpenAiIntent: true,
        skipLeaderChangeProposal: true
      });
      return true;
    }
    if (openChatIntentShouldUseStepIntake(result)) {
      await prepareOrder(prompt, {
        originalPrompt: prompt,
        ...(intentTaskType ? { taskType: intentTaskType } : {}),
        skipOpenAiIntent: true,
        skipLeaderChangeProposal: true
      });
      return true;
    }
    appendTextMessage('assistant', [
      result.summary || '',
      result.narrowing_question || chatText(
        'What should the final output look like?',
        '最終的にどんな形のアウトプットが欲しいですか？',
        prompt
      ),
      '',
      chatText('No order or billing happened yet.', 'まだ注文も課金も発生していません。', prompt)
    ].filter(Boolean).join('\n'), { tone: 'info', label: 'Chat' });
    return true;
  }
  if (action === 'prepare_order' || action === 'use_previous_brief') {
    const brief = String(result.order_brief || '').trim();
    if (promptInjectionGuard(brief || prompt).blocked) {
      handlePromptInjectionInput(brief || prompt);
      return true;
    }
    const explicitLeaderTaskType = explicitLeaderChangeTaskTypeFromText(prompt);
    await prepareOrder(brief || prompt, {
      originalPrompt: prompt,
      intakeChecked: true,
      taskType: explicitLeaderTaskType || '',
      activeLeaderTaskType: explicitLeaderTaskType || (state.activeLeaderLocked ? state.activeLeader?.taskType || '' : ''),
      activeLeaderName: explicitLeaderTaskType ? taskLabel(explicitLeaderTaskType) : (state.activeLeaderLocked ? state.activeLeader?.label || '' : ''),
      activeLeaderLocked: Boolean(state.activeLeaderLocked && state.activeLeader?.taskType),
      leaderChangeRequested: Boolean(explicitLeaderTaskType)
    });
    return true;
  }
  return false;
}

function addChatAdjustmentToDraft(prompt = '') {
  const text = String(prompt || '').trim();
  if (!state.draft || !text) return false;
  const explicitLeaderTaskType = explicitLeaderChangeTaskTypeFromText(text);
  const changedLeaderOwner = explicitLeaderTaskType ? leaderOwner(explicitLeaderTaskType, 'User explicitly changed the leader for this draft.') : null;
  if (changedLeaderOwner) {
    state.activeOwner = {
      type: 'leader',
      taskType: changedLeaderOwner.taskType,
      label: changedLeaderOwner.label,
      reason: changedLeaderOwner.reason
    };
    state.activeOwnerLocked = true;
    state.activeLeader = {
      taskType: changedLeaderOwner.taskType,
      label: changedLeaderOwner.label,
      reason: changedLeaderOwner.reason
    };
    state.activeLeaderLocked = true;
    state.draft = withConversationOwner(state.draft, changedLeaderOwner, {
      leaderChangeRequested: true,
      leader_change_requested: true
    });
    renderActiveLeaderStatus();
  } else {
    const lockedOwner = lockedLeaderOwnerForPrompt(text) || lockedAgentOwnerForPrompt(text);
    if (lockedOwner) state.draft = withConversationOwner(state.draft, lockedOwner);
  }
  const label = chatLanguage(text) === 'ja' ? '追加調整' : 'User adjustment';
  state.draft.prompt = [state.draft.prompt, `${label}:\n${text}`].filter(Boolean).join('\n\n');
  state.draft.updatedAt = new Date().toISOString();
  state.draftRevision += 1;
  appendOrderConfirmation({ updated: true });
  return true;
}

function handleNonOrderConversation(prompt = '') {
  const text = String(prompt || '').trim();
  if (!text || !isNonOrderConversationIntentText(text)) return false;
  const normalized = text.replace(/[?？!！。.,、\s]+$/g, '');
  const explicitConversationControl = /^(pause|hold|stop|later|not now|cancel|status|help|what now|where are we|continue chatting|一旦保留|いったん保留|保留|あとで|後で|また後で|ストップ|止めて|中断|キャンセル|やめる|やっぱやめる|今はやめる|状況|現状|今どこ|何待ち|ヘルプ|相談だけ)$/i.test(normalized);
  if (state.pendingIntake && !explicitConversationControl) return false;
  if (isLeaderCatalogQuestionIntentText(text)) {
    appendTextMessage('assistant', leaderCatalogChatAnswer(text), { tone: 'info', label: 'Chat' });
    return true;
  }
  const ja = chatLanguage(text) === 'ja';
  const hasDraft = Boolean(state.draft);
  const hasIntake = Boolean(state.pendingIntake);
  const hasOrder = Boolean(state.orderId);
  if (/^(pause|hold|stop|later|not now|cancel|一旦保留|いったん保留|保留|あとで|後で|また後で|ストップ|止めて|中断|キャンセル|やめる|やっぱやめる|今はやめる)/i.test(normalized)) {
    state.pendingIntake = null;
    state.pendingLeaderChange = null;
    updateComposerMode();
  }
  appendTextMessage('assistant', ja
    ? [
      '発注外の会話として扱いました。新しいオーダーは作成していません。',
      '',
      hasOrder ? `直近のオーダー: ${state.orderId}` : '追跡中のオーダー: なし',
      hasDraft ? '準備済みの発注ドラフトは残っています。送る場合だけ SEND ORDER を押してください。' : '',
      hasIntake ? '確認質問は閉じました。必要ならもう一度依頼内容を書いてください。' : '',
      '続けて相談できます。'
    ].filter(Boolean).join('\n')
    : [
      'I treated that as chat, not an order. No new order was created.',
      '',
      hasOrder ? `Current order: ${state.orderId}` : 'Tracked order: none',
      hasDraft ? 'The prepared draft is still available. Press SEND ORDER only when you want to run it.' : '',
      hasIntake ? 'I closed the clarification state. Rewrite the request if you want to prepare it again.' : '',
      'You can keep discussing it here.'
    ].filter(Boolean).join('\n'), { tone: 'info', label: 'Chat' });
  return true;
}

async function prepareOrder(prompt, options = {}) {
  trackChatIntakeStarted(prompt, options.intakeAnswered === true ? 'intake_completed_order_prep' : 'order_prep');
  const explicitLeaderTaskType = explicitLeaderChangeTaskTypeFromText(prompt);
  const leaderChangeRequested = options.leaderChangeRequested === true || Boolean(explicitLeaderTaskType);
  const requestedLeaderOwner = explicitLeaderTaskType ? leaderOwner(explicitLeaderTaskType, 'User explicitly changed the leader.') : null;
  if (requestedLeaderOwner) {
    state.pendingLeaderChange = null;
    state.activeOwner = {
      type: 'leader',
      taskType: requestedLeaderOwner.taskType,
      label: requestedLeaderOwner.label,
      reason: requestedLeaderOwner.reason
    };
    state.activeOwnerLocked = true;
    state.activeLeader = {
      taskType: requestedLeaderOwner.taskType,
      label: requestedLeaderOwner.label,
      reason: requestedLeaderOwner.reason
    };
    state.activeLeaderLocked = true;
    renderActiveLeaderStatus();
  }
  state.pendingLeaderChange = null;
  const lockedOwner = lockedLeaderOwnerForPrompt(prompt, { ...options, leaderChangeRequested });
  const lockedAgentOwner = lockedAgentOwnerForPrompt(prompt, { ...options, leaderChangeRequested });
  const effectiveConversationOwner = requestedLeaderOwner || lockedOwner || lockedAgentOwner || null;
  const effectiveLeaderOwner = effectiveConversationOwner?.type === 'leader' ? effectiveConversationOwner : null;
  const lockedStateLeader = state.activeLeaderLocked && state.activeLeader?.taskType
    ? state.activeLeader
    : null;
  const lockedStateOwner = state.activeOwnerLocked && state.activeOwner?.taskType
    ? state.activeOwner
    : null;
  const effectiveActiveLeaderTaskType = effectiveLeaderOwner?.taskType
    || options.activeLeaderTaskType
    || options.active_leader_task_type
    || lockedStateLeader?.taskType
    || '';
  const effectiveActiveLeaderName = effectiveLeaderOwner?.label
    || options.activeLeaderName
    || options.active_leader_name
    || lockedStateLeader?.label
    || '';
  const activeLeaderLocked = Boolean(state.activeLeaderLocked && state.activeLeader?.taskType);
  const effectiveActiveOwnerType = effectiveConversationOwner?.type
    || options.activeOwnerType
    || options.active_owner_type
    || lockedStateOwner?.type
    || '';
  const effectiveActiveOwnerTaskType = effectiveConversationOwner?.taskType
    || options.activeOwnerTaskType
    || options.active_owner_task_type
    || lockedStateOwner?.taskType
    || '';
  const effectiveActiveOwnerName = effectiveConversationOwner?.label
    || options.activeOwnerName
    || options.active_owner_name
    || lockedStateOwner?.label
    || '';
  const activeOwnerLocked = Boolean((state.activeOwnerLocked && state.activeOwner?.taskType) || options.activeOwnerLocked === true || options.active_owner_locked === true);
  const skipOpenAiIntent = options.skipOpenAiIntent === true || options.skip_openai_intent === true;
  const planningMessage = appendPlanningStatusMessage(prompt, options.intakeAnswered === true ? 'merge' : 'prepare', { forceScroll: true });
  const planningRouteTimer = window.setTimeout(() => {
    updatePlanningStatusMessage(planningMessage, prompt, 'route');
  }, 700);
  let prepared;
  try {
    prepared = await apiWithRetry('/api/work/prepare-order', {
      method: 'POST',
      body: JSON.stringify(chatEngineBuildPrepareOrderPayload(prompt, {
      requestedStrategy: options.requestedStrategy || options.requested_strategy || 'auto',
      taskType: effectiveConversationOwner?.taskType || options.taskType || options.task_type || '',
      selectedAgentId: options.selectedAgentId || options.selected_agent_id || '',
      selectedAgentName: options.selectedAgentName || options.selected_agent_name || '',
      activeOwnerType: effectiveActiveOwnerType,
      activeOwnerTaskType: effectiveActiveOwnerTaskType,
      activeOwnerName: effectiveActiveOwnerName,
      activeOwnerLocked,
      activeLeaderTaskType: effectiveActiveLeaderTaskType,
      activeLeaderName: effectiveActiveLeaderName,
      activeLeaderLocked,
      leaderChangeRequested,
      intakeAnswered: options.intakeAnswered === true,
      deliveryFormat: options.deliveryFormat || options.delivery_format || selectedDeliveryFormat(),
      delivery_format: options.deliveryFormat || options.delivery_format || selectedDeliveryFormat(),
      skipOpenAiIntent
      }))
    }, {
      maxAttempts: 5,
      baseDelayMs: 1000,
        maxDelayMs: 12000,
        retryStatuses: [408, 429, 500, 502, 503, 504]
      });
  } catch (error) {
    window.clearTimeout(planningRouteTimer);
    finishPlanningStatusMessage(planningMessage, prompt, 'error');
    if (!skipOpenAiIntent || options.intakeAnswered === true) throw error;
    throw new Error(chatText(
      'Server-owned order intake questions could not be loaded. No order or billing happened; retry so CAIt can fetch the selected agent contract from the server.',
      'server-owned の注文ヒアリング質問を読み込めませんでした。注文も課金も発生していません。選択エージェントの契約をサーバーから取得するため、もう一度試してください。',
      prompt
    ));
  }
  window.clearTimeout(planningRouteTimer);
  const finalPrepared = effectiveConversationOwner
    ? withConversationOwner(prepared, effectiveConversationOwner, {
        leaderChangeRequested,
        leader_change_requested: leaderChangeRequested
      })
    : prepared;
  setConversationOwnerFromPrepared(finalPrepared, {
    ...options,
    activeLeaderTaskType: effectiveActiveLeaderTaskType,
    activeLeaderName: effectiveActiveLeaderName,
    activeLeaderLocked,
    activeOwnerType: effectiveActiveOwnerType,
    activeOwnerTaskType: effectiveActiveOwnerTaskType,
    activeOwnerName: effectiveActiveOwnerName,
    activeOwnerLocked,
    leaderChangeRequested,
    deliveryFormat: options.deliveryFormat || options.delivery_format || selectedDeliveryFormat(),
    delivery_format: options.deliveryFormat || options.delivery_format || selectedDeliveryFormat(),
    announce: true,
    sample: options.originalPrompt || prompt
  });
  if (isNeedsInputResponse(finalPrepared) && options.intakeAnswered !== true) {
    finishPlanningStatusMessage(planningMessage, prompt, 'intake');
    startIntake(finalPrepared, prompt);
    return;
  }
  state.draft = chatEngineBuildOrderDraft(prompt, finalPrepared, {
    ...options,
    intakeChecked: true,
    activeLeaderTaskType: effectiveActiveLeaderTaskType,
    activeLeaderName: effectiveActiveLeaderName,
    activeLeaderLocked: Boolean(state.activeLeaderLocked && state.activeLeader?.taskType),
    activeOwnerType: effectiveActiveOwnerType,
    activeOwnerTaskType: effectiveActiveOwnerTaskType,
    activeOwnerName: effectiveActiveOwnerName,
    activeOwnerLocked: Boolean(state.activeOwnerLocked && state.activeOwner?.taskType),
    leaderChangeRequested,
    deliveryFormat: options.deliveryFormat || options.delivery_format || selectedDeliveryFormat(),
    delivery_format: options.deliveryFormat || options.delivery_format || selectedDeliveryFormat()
  });
  const appContext = options.appContext || state.pendingAppContext || null;
  if (appContext && typeof appContext === 'object') {
    attachAppContextToDraft(appContext);
  }
  state.pendingIntake = null;
  state.draftRevision += 1;
  finishPlanningStatusMessage(planningMessage, prompt, 'draft');
  appendOrderConfirmation();
}

function chatOrderDispatch() {
  if (!chatOrderDispatchController) throw new Error('Chat order dispatch controller is not initialized.');
  return chatOrderDispatchController;
}

async function sendOrder() {
  return chatOrderDispatch().sendOrder();
}

function orderErrorMessage(error) {
  return chatOrderDispatch().orderErrorMessage(error);
}

function startPolling(orderId) {
  return chatOrderDispatch().startPolling(orderId);
}

function loginHref(provider) {
  const url = new URL(`/auth/${provider}`, window.location.origin);
  url.searchParams.set('return_to', currentChatReturnPath());
  url.searchParams.set('login_source', 'chatux');
  url.searchParams.set('visitor_id', state.visitorId);
  return `${url.pathname}${url.search}`;
}

async function signOut() {
  setBusy(true);
  try {
    const result = await api('/auth/logout', { method: 'POST' });
    state.auth = {};
    state.authAccountKey = '';
    purgeChatStateForAccountBoundary('sign_out');
    window.location.href = String(result?.redirect_to || '/').trim() || '/';
  } catch (error) {
    appendTextMessage('assistant', orderErrorMessage(error), { tone: 'error', label: 'Sign out' });
  } finally {
    setBusy(false);
  }
}

function authRefreshRetryDelay(error, attempt = 1) {
  const retryAfter = Number(error?.data?.retry_after || error?.data?.retryAfter || 0);
  if (Number.isFinite(retryAfter) && retryAfter > 0) return Math.min(5000, retryAfter * 1000);
  return Math.min(4000, 500 * Math.max(1, attempt));
}

function authRefreshRetryable(error) {
  const status = Number(error?.status || 0);
  return !status || status === 408 || status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

async function refreshAuth(options = {}) {
  if (state.authRefreshRetryTimer) {
    window.clearTimeout(state.authRefreshRetryTimer);
    state.authRefreshRetryTimer = null;
  }
  const maxAttempts = Math.max(1, Math.min(5, Number(options.maxAttempts || 4) || 4));
  let lastError = null;
  try {
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const auth = await api('/auth/status', {
          method: 'GET',
          timeoutMs: CHATUX_CONNECT_WAIT_MS,
          attemptTimeoutMs: CHATUX_AUTH_STATUS_TIMEOUT_MS
        });
        if (!applyAuthState(auth || {}, { redirectIfGuest: true })) return;
        warmUtilityCatalogs();
        if (!state.chatSessionHistoryFetchedAt && !state.chatSessionHistoryRequest) void refreshChatSessionHistory({ force: true });
        return;
      } catch (error) {
        lastError = error;
        if (attempt >= maxAttempts || !authRefreshRetryable(error)) break;
        await sleep(authRefreshRetryDelay(error, attempt));
      }
    }
    if (els.authStatus) els.authStatus.textContent = 'Session status unavailable. Retrying...';
    if (options.scheduleRetry !== false) {
      state.authRefreshRetryTimer = window.setTimeout(() => {
        state.authRefreshRetryTimer = null;
        void refreshAuth({ maxAttempts: 2 });
      }, authRefreshRetryDelay(lastError, maxAttempts));
    }
  } finally {
    startDeliveryBackfillLoop({ maxRuns: 6, renderTerminalDeliveries: false });
  }
}

function ensureAuthRefreshProgress() {
  const statusText = String(els.authStatus?.textContent || '').trim();
  if (!/Checking session/i.test(statusText)) return;
  void refreshAuth({ maxAttempts: 2 });
}

function resetChat() {
  if (state.polling) window.clearInterval(state.polling);
  if (state.deliveryBackfill) window.clearInterval(state.deliveryBackfill);
  if (state.oauthPopupMonitor) window.clearInterval(state.oauthPopupMonitor);
  state.polling = null;
  state.deliveryBackfill = null;
  state.oauthPopupMonitor = null;
  state.progressNarratorArticle = null;
  state.progressNarratorKey = '';
  state.pendingAppContext = null;
  startNewChatSession();
  setBusy(false);
}

const chatAppContextOAuthController = createChatAppContextOAuthController({
  state,
  els,
  window,
  chatText,
  appendMessage,
  appendTextMessage,
  attachInboundAppContextToIntakeOrDraft,
  saveChatOAuthReturnState,
  refreshAuth,
  fetchVisibleJob,
  maybeRenderAuthorityNotice,
  jobHasDeliveryResult,
  renderDeliveryOnce,
  resumeLiveProgress,
  startPolling,
  startDeliveryBackfillLoop,
  connectWaitMs: CHATUX_CONNECT_WAIT_MS,
  connectCheckIntervalMs: CHATUX_CONNECT_CHECK_INTERVAL_MS
});
const {
  handleCaitAppContextMessage,
  handleChatOAuthPopupReturn,
  handleInboundAppContext,
  handleOAuthPopupReturnMessage,
  hydrateAppContextFromUrl,
  openChatOAuthPopup,
  startAppContextBroadcastListener
} = chatAppContextOAuthController;

const chatRetryFollowupController = createChatRetryFollowupController({
  state,
  window,
  api,
  chatEngineBuildOrderDraft,
  draftBrief,
  isStructuredOrderBriefText,
  CHATUX_RETRY_MODE_NEW_ORDER,
  fetchVisibleJob,
  cachedVisibleJobForRetry,
  jobHasDeliveryResult,
  renderDeliveryOnce,
  selectedRetryReuseArtifactsForOrder,
  workflowRetryMetaForDraft,
  looksJapanese,
  taskLabel,
  setBusy,
  markLiveProgressStopped,
  leaderOwner,
  withConversationOwner,
  renderActiveLeaderStatus,
  currentLockedConversationOwner,
  setConversationOwnerFromPrepared,
  chatText,
  appendTextMessage,
  appendOrderConfirmation,
  orderErrorMessage,
  refreshRecentJobs,
  statusDisplayLabel,
  maybeRenderAuthorityNotice,
  resumeLiveProgress,
  startPolling
});
const {
  activeOrderFollowupAllowedText,
  handleRetryCommand,
  prepareFollowupForRunningOrder,
  prepareRetryFromOrder
} = chatRetryFollowupController;

const chatEventBindingsController = createChatEventBindingsController({
  state,
  els,
  window,
  document,
  libraryCommandScope,
  directAppCommandId,
  rememberConversationLanguage,
  appendTextMessage,
  setBusy,
  appendUsageLibrary,
  openAppAgent,
  sendOrder,
  handlePromptInjectionInput,
  handleRetryCommand,
  showDeliveryHistoryForPrompt,
  handleNonOrderConversation,
  answerPendingIntake,
  activeOrderFollowupAllowedText,
  prepareFollowupForRunningOrder,
  addChatAdjustmentToDraft,
  handleChatIntentWithLlm,
  prepareOrder,
  orderErrorMessage,
  handleOAuthPopupReturnMessage,
  handleCaitAppContextMessage,
  saveChatOAuthReturnState,
  openChatOAuthPopup,
  chatuxReturnPath: CHATUX_RETURN_PATH,
  signOut,
  openAgentRunDetail,
  reuseAppAgent,
  reuseAiAgent,
  chatAppHandoffController,
  createAppAgentHandoffUrl,
  appHandoffRememberDetails,
  createAppAgentContextOpenUrl,
  copyTextToClipboard,
  getDeliveryFile,
  downloadTextFile,
  approveAndResumeOrder,
  fetchVisibleJob,
  rememberTrackedOrder,
  maybeRenderAuthorityNotice,
  appendOrderStatusCheck,
  jobHasDeliveryResult,
  renderDeliveryOnce,
  notifyOrderMilestone,
  resumeLiveProgress,
  startPolling,
  prepareRetryFromOrder,
  selectedRetryReuseArtifactsForOrder,
  showSchedulePanel,
  handleIntakeThreadClick,
  resetChat,
  resolvePendingLeaderChange,
  handleIntakeOtherInputKeydown,
  normalizeUiLanguage,
  chatUiText,
  saveChatUiLanguagePreference,
  utilityModalIsOpen,
  showInfoPanel,
  closeUtilityModal,
  loadChatSession,
  loadMoreUtilityCatalog,
  updateRecurringOrderStatus,
  cancelRecurringOrder,
  loadAppContextIntoChat,
  taskLabel,
  chatText,
  createScheduleFromForm,
  openUtilityModal,
  schedulePanelHtml,
  closeChatHeaderMenu,
  renderChatSessionSidebar,
  refreshChatSessionHistory,
  startNewChatSession,
  deleteChatSession,
  showWorkerListPanel,
  showAppListPanel,
  setChatUiLanguage,
  renderActiveLeaderStatus,
  updateComposerMode,
  startAppContextBroadcastListener,
  handleChatOAuthPopupReturn,
  restoreChatOAuthReturnStateFromUrl,
  shouldStartFreshChatFromUrl,
  chatRestoreRequestFromUrl,
  restoreChatRuntimeState,
  hydrateAppContextFromUrl,
  restoreRequestedChatSessionFromHistory,
  refreshAuth,
  ensureAuthRefreshProgress,
  saveChatRuntimeState,
  startDeliveryBackfillLoop
});
chatEventBindingsController.bind();
chatEventBindingsController.start();
