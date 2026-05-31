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
  connectorGateHandleOAuthLinkClick,
  connectorGateHandleOAuthPopupReturn,
  connectorGateHandleOAuthPopupReturnMessage,
  connectorGateOpenOAuthPopup,
  connectorGateRenderAuthorityRequest,
  connectorGateStartOAuthPopupMonitor
} from './connector-gate.js?v=20260519a';
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
  deliveryFileDisplayTitle,
  deliveryFileProvenanceParts
} from './delivery-provenance-utils.js?v=20260521a';
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
  caitAppContextThreadHtml,
  consumeCaitAppContextForChat
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
  agentOwner,
  conversationOwnerFromPrepared,
  explicitLeaderChangeTaskTypeFromText,
  leaderOwner,
  normalizeLeaderTaskType,
  sameConversationOwner,
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
  CAIT_APP_CONTEXT_CHANNEL,
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
import { createChatIntakeController } from './chat-intake-controller.js?v=20260601a';

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
const processedAppContextIds = new Set();
let appContextBroadcastChannel = null;
let chatRuntimeStateController = null;
let chatUtilityModalController = null;
let chatIntakeController = null;
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

function lockedLeaderOwnerForPrompt(prompt = '', options = {}) {
  if (!state.activeLeaderLocked || !state.activeLeader?.taskType) return null;
  const explicitTaskType = explicitLeaderChangeTaskTypeFromText(prompt);
  if (options.allowLeaderChange === true || options.leaderChangeRequested === true || explicitTaskType) return null;
  return leaderOwner(state.activeLeader.taskType, state.activeLeader.reason || 'Leader already confirmed in this chat.');
}

function currentLockedLeaderOwner() {
  if (!state.activeLeaderLocked || !state.activeLeader?.taskType) return null;
  return leaderOwner(state.activeLeader.taskType, state.activeLeader.reason || 'Leader already confirmed in this chat.');
}

function lockedAgentOwnerForPrompt(prompt = '', options = {}) {
  if (!state.activeOwnerLocked || state.activeOwner?.type !== 'agent' || !state.activeOwner?.taskType) return null;
  if (options.allowLeaderChange === true || options.leaderChangeRequested === true || explicitLeaderChangeTaskTypeFromText(prompt)) return null;
  return agentOwner(state.activeOwner.taskType, state.activeOwner.label, state.activeOwner.reason || 'Agent already confirmed in this chat.');
}

function currentLockedConversationOwner() {
  return currentLockedLeaderOwner() || lockedAgentOwnerForPrompt('', {});
}

function leaderChangeProposalHtml(currentOwner = {}, suggestedOwner = {}, sample = '') {
  const ja = chatLanguage(sample) === 'ja';
  const currentLabel = currentOwner.label || taskLabel(currentOwner.taskType);
  const suggestedLabel = suggestedOwner.label || taskLabel(suggestedOwner.taskType);
  return [
    `<strong>${ja ? 'リーダー変更の確認' : 'Leader change check'}</strong>`,
    '',
    ja
      ? `現在のリーダー: ${escapeHtml(currentLabel)} (${escapeHtml(currentOwner.taskType || '')})`
      : `Current lead: ${escapeHtml(currentLabel)} (${escapeHtml(currentOwner.taskType || '')})`,
    ja
      ? `候補: ${escapeHtml(suggestedLabel)} (${escapeHtml(suggestedOwner.taskType || '')})`
      : `Suggested lead: ${escapeHtml(suggestedLabel)} (${escapeHtml(suggestedOwner.taskType || '')})`,
    ja
      ? 'このチャットでは現在のリーダーを維持します。変更する場合だけ選択してください。'
      : 'I will keep the current leader for this chat unless you choose to switch.',
    '<div class="inline-actions">',
    `<button class="primary-btn inline-btn" type="button" data-chat-action="keep-leader">${escapeHtml(ja ? `${currentLabel}のまま進める` : `Keep ${currentLabel}`)}</button>`,
    `<button class="ghost-btn inline-btn" type="button" data-chat-action="switch-leader" data-leader-task="${escapeHtml(suggestedOwner.taskType || '')}">${escapeHtml(ja ? `${suggestedLabel}に変更` : `Switch to ${suggestedLabel}`)}</button>`,
    '</div>'
  ].join('\n');
}

function suggestLeaderChangeIfNeeded(candidateTaskType = '', sample = '', source = '', options = {}) {
  if (options.skipLeaderChangeProposal === true) return false;
  const currentOwner = currentLockedLeaderOwner();
  const suggestedOwner = leaderOwner(candidateTaskType, 'Suggested by the latest request wording.');
  if (!currentOwner || !suggestedOwner || currentOwner.taskType === suggestedOwner.taskType) return false;
  const previous = state.pendingLeaderChange;
  state.pendingLeaderChange = {
    fromTaskType: currentOwner.taskType,
    fromLabel: currentOwner.label || taskLabel(currentOwner.taskType),
    toTaskType: suggestedOwner.taskType,
    toLabel: suggestedOwner.label || taskLabel(suggestedOwner.taskType),
    sample: String(sample || '').slice(0, 4000),
    preparedPrompt: String(options.preparedPrompt || sample || '').slice(0, 8000),
    source: String(source || '').slice(0, 80),
    createdAt: isoNow()
  };
  if (previous
    && previous.fromTaskType === state.pendingLeaderChange.fromTaskType
    && previous.toTaskType === state.pendingLeaderChange.toTaskType
    && previous.preparedPrompt === state.pendingLeaderChange.preparedPrompt) {
    updateComposerMode();
    setBusy(state.busy);
    return true;
  }
  appendMessage('assistant', leaderChangeProposalHtml(currentOwner, suggestedOwner, sample), {
    tone: 'info',
    label: chatText('Leader choice', 'リーダー確認', sample)
  });
  updateComposerMode();
  setBusy(state.busy);
  return true;
}

async function resolvePendingLeaderChange(accept = false, taskType = '') {
  const pending = state.pendingLeaderChange && typeof state.pendingLeaderChange === 'object' ? state.pendingLeaderChange : null;
  if (!pending) {
    appendTextMessage('assistant', chatText(
      'There is no pending leader change to resolve.',
      '確認中のリーダー変更はありません。',
      state.conversationLanguage
    ), { tone: 'error', label: 'Leader choice' });
    return;
  }
  const currentOwner = leaderOwner(pending.fromTaskType, 'Leader kept by user choice.');
  const suggestedOwner = leaderOwner(taskType || pending.toTaskType, 'User accepted the leader change.');
  const owner = accept ? suggestedOwner : currentOwner;
  if (!owner?.taskType) {
    state.pendingLeaderChange = null;
    appendTextMessage('assistant', chatText(
      'I could not resolve that leader choice. Please name the leader directly if you want to switch.',
      'リーダー選択を解決できませんでした。変更する場合はリーダー名を直接指定してください。',
      pending.sample
    ), { tone: 'error', label: 'Leader choice' });
    return;
  }
  state.pendingLeaderChange = null;
  state.activeOwner = {
    type: 'leader',
    taskType: owner.taskType,
    label: owner.label || taskLabel(owner.taskType),
    reason: owner.reason || ''
  };
  state.activeOwnerLocked = true;
  state.activeLeader = {
    taskType: owner.taskType,
    label: owner.label || taskLabel(owner.taskType),
    reason: owner.reason || ''
  };
  state.activeLeaderLocked = true;
  renderActiveLeaderStatus();
  if (state.pendingIntake) {
    state.pendingIntake.taskType = owner.taskType;
    state.pendingIntake.activeLeaderTaskType = owner.taskType;
    state.pendingIntake.activeLeaderName = owner.label || taskLabel(owner.taskType);
    state.pendingIntake.conversationOwner = owner;
  }
  if (state.draft) {
    state.draft = withConversationOwner(state.draft, owner, {
      leaderChangeRequested: accept,
      leader_change_requested: accept
    });
    appendOrderConfirmation({ updated: true });
    return;
  }
  appendTextMessage('assistant', chatText(
    accept
      ? `${owner.label || taskLabel(owner.taskType)} will lead this chat. I will prepare the order from the same request.`
      : `${owner.label || taskLabel(owner.taskType)} stays as the lead. I will prepare the order from the same request.`,
    accept
      ? `${owner.label || taskLabel(owner.taskType)} に切り替えます。同じ依頼内容で発注準備を続けます。`
      : `${owner.label || taskLabel(owner.taskType)} のまま進めます。同じ依頼内容で発注準備を続けます。`,
    pending.sample
  ), { tone: 'ok', label: chatText('Leader choice', 'リーダー確認', pending.sample) });
  const prompt = String(pending.preparedPrompt || pending.sample || '').trim();
  if (prompt) {
    await prepareOrder(prompt, {
      originalPrompt: pending.sample || prompt,
      taskType: owner.taskType,
      activeLeaderTaskType: owner.taskType,
      activeLeaderName: owner.label || taskLabel(owner.taskType),
      activeLeaderLocked: true,
      leaderChangeRequested: accept,
      skipLeaderChangeProposal: true
    });
  }
}

function renderActiveLeaderStatus() {
  if (!els.activeLeaderStatus) return;
  const owner = state.activeOwner || (state.activeLeader ? { type: 'leader', ...state.activeLeader } : null);
  if (owner?.type === 'agent' && owner.taskType) {
    els.activeLeaderStatus.textContent = `Agent: ${owner.label || taskLabel(owner.taskType)}`;
    els.activeLeaderStatus.dataset.owner = 'agent';
    els.activeLeaderStatus.title = owner.reason || 'This agent is gathering details, drafting, and revising in this chat.';
    return;
  }
  const leader = owner?.type === 'leader' ? owner : state.activeLeader;
  if (leader?.taskType) {
    els.activeLeaderStatus.textContent = `Lead: ${leader.label || taskLabel(leader.taskType)}`;
    els.activeLeaderStatus.dataset.owner = 'leader';
    els.activeLeaderStatus.title = leader.reason || 'This leader is gathering details and coordinating the order.';
    return;
  }
  els.activeLeaderStatus.textContent = 'CAIt routing';
  els.activeLeaderStatus.dataset.owner = 'cait';
  els.activeLeaderStatus.title = 'CAIt will route to a specialist directly or hand broad work to a leader.';
}

function setConversationOwnerFromPrepared(prepared = {}, options = {}) {
  const previous = state.activeOwner
    ? { ...state.activeOwner }
    : (state.activeLeader ? { type: 'leader', ...state.activeLeader } : { type: 'cait', label: 'CAIt', taskType: '' });
  const lockedStateLeader = state.activeLeaderLocked && state.activeLeader?.taskType
    ? state.activeLeader
    : null;
  const lockedStateOwner = state.activeOwnerLocked && state.activeOwner?.taskType
    ? state.activeOwner
    : null;
  const lockedOwner = lockedLeaderOwnerForPrompt(options.sample || prepared.prompt || '', options)
    || lockedAgentOwnerForPrompt(options.sample || prepared.prompt || '', options);
  const owner = lockedOwner || conversationOwnerFromPrepared(prepared, {
    activeLeaderTaskType: options.activeLeaderTaskType || lockedStateLeader?.taskType || '',
    activeLeaderName: options.activeLeaderName || lockedStateLeader?.label || '',
    activeLeaderLocked: options.activeLeaderLocked === true || Boolean(lockedStateLeader),
    activeOwnerType: options.activeOwnerType || lockedStateOwner?.type || '',
    activeOwnerTaskType: options.activeOwnerTaskType || lockedStateOwner?.taskType || '',
    activeOwnerName: options.activeOwnerName || lockedStateOwner?.label || '',
    activeOwnerLocked: options.activeOwnerLocked === true || Boolean(lockedStateOwner),
    conversationOwner: options.conversationOwner || null
  });
  state.activeOwner = owner.type !== 'cait'
    ? {
        type: owner.type,
        taskType: owner.taskType,
        label: owner.label || taskLabel(owner.taskType),
        reason: owner.reason || ''
      }
    : null;
  state.activeOwnerLocked = Boolean(state.activeOwner?.taskType && (state.activeOwnerLocked || owner.type !== 'cait'));
  state.activeLeader = owner.type === 'leader'
    ? {
        taskType: owner.taskType,
        label: owner.label || taskLabel(owner.taskType),
        reason: owner.reason || ''
      }
    : null;
  state.activeLeaderLocked = Boolean(state.activeLeader?.taskType && (state.activeLeaderLocked || owner.type === 'leader'));
  renderActiveLeaderStatus();
  const current = state.activeOwner || (state.activeLeader ? { type: 'leader', ...state.activeLeader } : { type: 'cait', label: 'CAIt', taskType: '' });
  const changed = !sameConversationOwner(previous, current);
  if (options.announce === true && changed) {
    if (state.activeLeader) {
      const label = state.activeLeader.label || taskLabel(state.activeLeader.taskType);
      appendTextMessage('assistant', chatText(
        `${label} is now leading this order. CAIt will stay as the router, and ${label} will gather missing details, request approvals, and coordinate specialists/apps.`,
        `${label} にチャット主体を切り替えます。CAIt はルーターとして残り、${label} が不足情報の確認、承認ポイント、専門エージェント/アプリ連携を進めます。`,
        options.sample || prepared.prompt || ''
      ), { tone: 'ok', label: 'CAIt' });
    } else if (state.activeOwner?.type === 'agent') {
      const label = state.activeOwner.label || taskLabel(state.activeOwner.taskType);
      appendTextMessage('assistant', chatText(
        `${label} is now handling this chat. CAIt will stay as the router, and ${label} will gather details, draft, revise, and prepare the order.`,
        `${label} がこのチャットを担当します。CAIt はルーターとして残り、${label} が不足情報の確認、作成、修正、発注準備を進めます。`,
        options.sample || prepared.prompt || ''
      ), { tone: 'ok', label: 'CAIt' });
    } else {
      appendTextMessage('assistant', chatText(
        'CAIt will keep this chat and route directly to the best specialist unless the scope becomes leader-level.',
        'この内容は CAIt が会話主体のまま、必要な専門エージェントへ直接ルーティングします。スコープが広がった場合はリーダーへ切り替えます。',
        options.sample || prepared.prompt || ''
      ), { tone: 'ok', label: 'CAIt' });
    }
  }
  return state.activeOwner || state.activeLeader;
}

function activeActorLabel(fallback = 'CAIt') {
  return state.activeOwner?.label || state.activeLeader?.label || fallback;
}

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
  return isTerminalStatus(job?.status) || jobBlockedByLeaderQualityGate(job) || jobBlockedForSaasHandoff(job);
}


function deliveryFiles(job = {}) {
  const output = job.output && typeof job.output === 'object' ? job.output : {};
  const delivery = output.delivery && typeof output.delivery === 'object' ? output.delivery : {};
  const report = output.report && typeof output.report === 'object' ? output.report : {};
  const deliveryReport = delivery.report && typeof delivery.report === 'object' ? delivery.report : {};
  const candidates = [
    ...(Array.isArray(output.files) ? output.files : []),
    ...(Array.isArray(report.files) ? report.files : []),
    ...(Array.isArray(delivery.files) ? delivery.files : []),
    ...(Array.isArray(deliveryReport.files) ? deliveryReport.files : [])
  ];
  const seen = new Set();
  const files = visibleDeliveryFiles(candidates)
    .filter((file) => file && (file.content || file.name))
    .map((file, index) => sanitizeDeliveryFileForUser(file, `delivery-${index + 1}.md`))
    .filter((file) => file && String(file.content || '').trim())
    .sort((left, right) => deliveryFilePriority(left) - deliveryFilePriority(right))
    .filter((file) => {
      const key = `${file.name || ''}:${String(file.content || '').slice(0, 120)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 8);
  return files;
}

function deliveryText(job = {}) {
  const output = job.output && typeof job.output === 'object' ? job.output : {};
  const report = output.report && typeof output.report === 'object' ? output.report : {};
  const delivery = output.delivery && typeof output.delivery === 'object' ? output.delivery : {};
  const deliveryReport = delivery.report && typeof delivery.report === 'object' ? delivery.report : {};
  const bullets = [
    ...(Array.isArray(report.bullets) ? report.bullets : []),
    ...(Array.isArray(deliveryReport.bullets) ? deliveryReport.bullets : [])
  ].filter(Boolean).slice(0, 8);
  const failed = ['failed', 'timed_out'].includes(String(job.status || '').trim().toLowerCase());
  const failureReason = String(job.failureReason || job.failure_reason || report.failure_reason || report.error || output.error || '').trim();
  const text = [
    failed && failureReason ? `Failure reason: ${failureReason}` : '',
    output.summary || report.summary || delivery.summary || deliveryReport.summary || job.failureReason || '',
    bullets.length ? bullets.map((item) => `- ${item}`).join('\n') : '',
    report.nextAction || report.next_action || deliveryReport.nextAction || deliveryReport.next_action || ''
  ].filter(Boolean).join('\n\n').trim();
  return sanitizeDeliveryMarkdownForUser(text);
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
  const text = String(value || '');
  const ids = [];
  const patterns = [
    /Order ID:\s*([0-9a-f]{8}-[0-9a-f-]{27,})/ig,
    /Order accepted\.[\s\S]{0,140}?([0-9a-f]{8}-[0-9a-f-]{27,})/ig
  ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text))) {
      const id = String(match[1] || '').trim();
      if (id) ids.push(id);
    }
  }
  return ids;
}

function chatSessionOrderIds(session = {}, options = {}) {
  const relatedIds = Array.isArray(session.relatedOrderIds) ? session.relatedOrderIds : [];
  const activeIds = restoredSessionHasActiveWork(session)
    ? (Array.isArray(session.activeJobIds) ? session.activeJobIds : [])
    : [];
  const directIds = [
    ...activeIds,
    session.linkedOrderId,
    ...(options.includeRelatedHistory === true ? relatedIds : [])
  ].map((item) => String(item || '').trim()).filter(Boolean);
  if (!directIds.length && relatedIds.length) {
    directIds.push(String(relatedIds[0] || '').trim());
  }
  const max = options.includeRelatedHistory === true ? 8 : 1;
  return [...new Set(directIds)].filter(Boolean).slice(0, max);
}

function restoredSessionOrderCardHtml(job = {}) {
  const orderId = String(job.id || '').trim();
  const status = String(job.status || '').trim().toLowerCase();
  const qualityBlocked = jobBlockedByLeaderQualityGate(job);
  const terminal = isTerminalStatus(status) || qualityBlocked;
  const failed = ['failed', 'timed_out'].includes(status) || qualityBlocked;
  const completed = status === 'completed';
  const waiting = status === 'blocked' && !qualityBlocked;
  const active = !terminal && !waiting;
  const title = [
    taskLabel(job.taskType || job.workflowTask || 'work'),
    orderId ? `#${orderId.slice(0, 8)}` : ''
  ].filter(Boolean).join(' ');
  const summary = completed
    ? 'The delivery is rendered below. Use Show result only if you need to reload it.'
    : failed
      ? (job.failureReason || job.failure_reason || 'This order ended without a successful delivery.')
      : (waiting ? 'Waiting for approval or connector action.' : (job.prompt || 'Order details are available.'));
  const meta = [
    `Status: ${qualityBlocked ? 'blocked by quality gate' : statusDisplayLabel(status || 'created')}`,
    job.createdAt ? `Started: ${shortDateTime(job.createdAt)}` : '',
    job.completedAt ? `Completed: ${shortDateTime(job.completedAt)}` : '',
    job.failedAt ? `Failed: ${shortDateTime(job.failedAt)}` : '',
    job.timedOutAt ? `Timed out: ${shortDateTime(job.timedOutAt)}` : ''
  ].filter(Boolean).join(' / ');
  const hint = qualityBlocked
    ? 'This order is blocked by a leader quality gate. Review the failed specialist output before preparing a retry or repair.'
    : waiting
    ? 'This order is waiting for an approval or connector action. Review the requested action before continuing.'
    : active
      ? 'This order is still in progress. CAIt will resume polling from this chat.'
      : completed
        ? 'This order has a result. Review it here before scheduling or retrying.'
        : 'This order ended without a successful delivery. Review the reason before preparing a retry.';
  const actions = [
    orderId ? `<button class="ghost-btn inline-btn file-action" type="button" data-chat-order-open="${escapeHtml(orderId)}">${escapeHtml(terminal ? 'Show result' : 'Check status')}</button>` : '',
    orderId && terminal ? `<button class="ghost-btn inline-btn file-action" type="button" data-chat-order-retry="${escapeHtml(orderId)}">${escapeHtml(failed ? 'Retry as new order' : 'Run again as new order')}</button>` : '',
    orderId && completed ? `<button class="ghost-btn inline-btn file-action" type="button" data-chat-order-schedule="${escapeHtml(orderId)}">Schedule</button>` : ''
  ].filter(Boolean).join('');
  return [
    '<div class="restored-order-card">',
    `<strong>${escapeHtml(title || 'Related order')}</strong>`,
    meta ? `<div class="utility-meta">${escapeHtml(meta)}</div>` : '',
    summary ? `<div>${escapeHtml(compact(summary, 520))}</div>` : '<div>Order details are available. Open the result to inspect the delivery.</div>',
    actions ? `<div class="inline-actions">${actions}</div>` : '',
    `<span class="chat-hint">${escapeHtml(hint)}</span>`,
    '</div>'
  ].join('\n');
}

function restoredSessionOrderContextIsCurrent(sessionId = '', viewRevision = 0) {
  const safeSessionId = String(sessionId || '').trim();
  const safeRevision = Number(viewRevision || 0) || 0;
  if (safeRevision && Number(state.chatViewRevision || 0) !== safeRevision) return false;
  if (safeSessionId && String(state.currentChatSessionId || '').trim() !== safeSessionId) return false;
  return true;
}

function restoredSessionHasActiveWork(session = {}, snapshot = {}) {
  return Boolean(
    session?.activeWork
    || snapshot?.activeWork
    || (Array.isArray(session?.activeJobIds) && session.activeJobIds.length)
    || (Array.isArray(snapshot?.activeJobIds) && snapshot.activeJobIds.length)
  );
}

async function renderRestoredSessionOrderContext(session = {}, options = {}) {
  const sessionId = String(options.sessionId || session.id || session.sessionId || '').trim();
  const viewRevision = Number(options.viewRevision || state.chatViewRevision || 0) || 0;
  if (!restoredSessionOrderContextIsCurrent(sessionId, viewRevision)) return;
  const ids = chatSessionOrderIds(session);
  if (!ids.length) return;
  for (const id of ids) rememberTrackedOrder(id);
  const settled = await Promise.allSettled(ids.map((id) => fetchVisibleJob(id)));
  if (!restoredSessionOrderContextIsCurrent(sessionId, viewRevision)) return;
  const jobs = settled
    .map((item) => item.status === 'fulfilled' ? item.value : null)
    .filter((job) => job?.id);
  const failures = settled
    .map((item, index) => item.status === 'rejected' ? `${ids[index].slice(0, 8)}: ${orderErrorMessage(item.reason)}` : '')
    .filter(Boolean);
  if (!jobs.length && !failures.length) return;
  const body = [
    '<strong>Restored order context</strong>',
    '<span class="chat-hint">This chat session has related order history. No new order was created.</span>',
    ...jobs.map(restoredSessionOrderCardHtml),
    failures.length ? `<div class="chat-hint">${escapeHtml(`Could not load: ${failures.join(' / ')}`)}</div>` : ''
  ].filter(Boolean).join('\n\n');
  appendMessage('system', body, { label: 'Order history', tone: jobs.some((job) => !jobHasDeliveryResult(job)) ? 'warn' : 'info', record: false });
  for (const job of jobs) {
    if (jobHasDeliveryResult(job)) renderDeliveryOnce(job);
  }
  const activeJob = jobs.find((job) => !jobHasDeliveryResult(job));
  const primary = activeJob || jobs[0] || null;
  if (primary?.id) {
    if (!restoredSessionOrderContextIsCurrent(sessionId, viewRevision)) return;
    state.orderId = primary.id;
    if (options.resumeActiveWork === true && restoredSessionHasActiveWork(session) && !isTerminalStatus(primary.status)) startPolling(primary.id);
  }
}

async function showChatListPanel() {
  openUtilityModal('Chats', utilityEmptyHtml('Loading chat sessions...'));
  try {
    const sessions = await refreshChatSessionHistory({ force: true });
    openUtilityModal('Chats', [
      '<div class="chat-hint">Chats show conversation and related orders. Live status is loaded from Order state.</div>',
      chatSessionUtilityRows(sessions)
    ].join('\n'));
  } catch (error) {
    openUtilityModal('Chats', utilityEmptyHtml(orderErrorMessage(error)));
  }
}

async function showDeliveryHistoryForPrompt(prompt = '') {
  if (!isDeliveryHistoryQuestionIntentText(prompt)) return false;
  const ja = chatLanguage(prompt) === 'ja';
  openUtilityModal('Deliveries', utilityEmptyHtml(ja ? '完了済みの納品を読み込み中です...' : 'Loading completed deliveries...'));
  try {
    const directJob = state.orderId ? await fetchVisibleJob(state.orderId, { force: true }).catch(() => null) : null;
    const jobs = await refreshRecentJobs({ force: true, limit: 50 });
    const merged = [
      ...(directJob?.id ? [directJob] : []),
      ...(Array.isArray(jobs) ? jobs : [])
    ].filter((job, index, all) => job?.id && all.findIndex((item) => String(item?.id || '') === String(job.id || '')) === index);
    const completed = merged.filter((job) => String(job.status || '').trim().toLowerCase() === 'completed' && jobHasDeliveryResult(job));
    const terminal = completed.length ? completed : merged.filter((job) => jobHasDeliveryResult(job));
    const primary = (state.orderId ? terminal.find((job) => String(job.id || '') === String(state.orderId)) : null) || terminal[0] || null;
    openUtilityModal('Deliveries', [
      `<div class="chat-hint">${escapeHtml(ja
        ? '完了済みまたは納品結果のあるオーダーだけを表示しています。Open でチャットに再表示できます。'
        : 'Showing completed orders or orders with delivery results. Use Open to restore one into the chat.')}</div>`,
      jobUtilityRows(terminal)
    ].join('\n'));
    if (!primary?.id) {
      appendTextMessage('assistant', chatText(
        'I could not find a completed delivery visible to this chat. No order was created.',
        'このチャットから見える完了済み納品物は見つかりませんでした。新しいオーダーは作成していません。',
        prompt
      ), { tone: 'warn', label: 'Delivery history' });
      return true;
    }
    rememberTrackedOrder(primary.id);
    state.orderId = primary.id;
    appendTextMessage('system', chatText(
      `Showing the latest completed delivery I can access: Order #${primary.id.slice(0, 8)} (${statusDisplayLabel(primary.status || 'completed')}). No new order was created.`,
      `表示できる最新の完了済み納品物を開きます: Order #${primary.id.slice(0, 8)} (${statusDisplayLabel(primary.status || 'completed')})。新しいオーダーは作成していません。`,
      prompt
    ), { label: 'Delivery history', record: false });
    renderDeliveryOnce(primary, { force: true });
    return true;
  } catch (error) {
    openUtilityModal('Deliveries', utilityEmptyHtml(orderErrorMessage(error)));
    appendTextMessage('assistant', orderErrorMessage(error), { tone: 'error', label: 'Delivery history' });
    return true;
  }
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
  return connectorGateRenderAuthorityRequest(job, {
    auth: state.auth || {},
    orderId: state.orderId,
    visitorId: state.visitorId,
    origin: window.location.origin,
    returnPathForProvider: (provider) => currentChatReturnPath({ oauthPopup: true, oauthProvider: provider }),
    loginHref,
    saveOAuthState: saveChatOAuthReturnState
  });
}

function maybeRenderAuthorityNotice(job = {}, options = {}) {
  const key = authorityNoticeKey(job);
  if (!key) return false;
  const body = renderAuthorityRequest(job);
  if (!body) return false;
  const existing = document.getElementById(approvalAnchorForJob(job));
  if (existing) {
    existing.outerHTML = body;
    state.authorityNoticeKeys.add(key);
    return true;
  }
  if (state.authorityNoticeKeys.has(key)) return false;
  state.authorityNoticeKeys.add(key);
  appendMessage('assistant', body, {
    tone: 'warn',
    label: options.label || 'Approval required'
  });
  return true;
}

function renderFileCards(files = []) {
  const bundle = files.length > 1 ? registerDeliveryFile(combinedMarkdownFile(files), 'delivery-bundle.md') : null;
  const bundleActions = bundle
    ? [
      '<div class="file-actions bundle-actions">',
      `<button class="primary-btn inline-btn file-action" type="button" data-file-action="download" data-file-id="${escapeHtml(bundle.id)}">Download all MD</button>`,
      `<button class="ghost-btn inline-btn file-action" type="button" data-file-action="copy" data-file-id="${escapeHtml(bundle.id)}">Copy all</button>`,
      '</div>'
    ].join('')
    : '';
  const cards = files.map((file, index) => {
    const registered = registerDeliveryFile(file, `delivery-${index + 1}.md`);
    const name = registered.name;
    const content = registered.content.trim();
    const displayTitle = deliveryFileDisplayTitle(file, name);
    const metaParts = deliveryFileProvenanceParts(file, { taskLabel });
    const isHtml = /\.html?$/i.test(name) || /<!doctype html|<html[\s>]/i.test(content);
    const downloadLabel = isHtml ? 'Download HTML' : 'Download MD';
    const preview = isHtml
      ? `<iframe class="html-preview" sandbox="allow-scripts allow-forms allow-popups" referrerpolicy="no-referrer" srcdoc="${escapeHtml(content)}" title="${escapeHtml(name)} preview"></iframe>`
      : '';
    return [
      '<details class="file-card">',
      `<summary>${escapeHtml(displayTitle || name)}</summary>`,
      metaParts.length ? `<div class="row-muted">${escapeHtml(metaParts.join(' · '))}</div>` : '',
      '<div class="file-actions">',
      `<button class="primary-btn inline-btn file-action" type="button" data-file-action="download" data-file-id="${escapeHtml(registered.id)}">${escapeHtml(downloadLabel)}</button>`,
      `<button class="ghost-btn inline-btn file-action" type="button" data-file-action="copy" data-file-id="${escapeHtml(registered.id)}">Copy</button>`,
      '</div>',
      `<pre>${escapeHtml(content || '(empty file)')}</pre>`,
      preview,
      '</details>'
    ].join('');
  }).join('');
  return [bundleActions, cards].filter(Boolean).join('');
}

function retryReusableArtifactEntries(job = {}) {
  const status = String(job.status || '').trim().toLowerCase();
  if (!['failed', 'timed_out'].includes(status) && !jobBlockedByLeaderQualityGate(job)) return [];
  const sourceOrderId = String(job.id || '').trim();
  const seenTasks = new Set();
  return deliveryFiles(job)
    .map((file) => {
      const taskType = String(file.source_task_type || file.sourceTaskType || '').trim().toLowerCase();
      const sourceRunId = String(file.source_run_id || file.sourceRunId || '').trim();
      const content = String(file.content || '').trim();
      if (!taskType || taskType.endsWith('_leader') || !sourceRunId || !content) return null;
      if (seenTasks.has(taskType)) return null;
      seenTasks.add(taskType);
      return {
        file,
        taskType,
        sourceRunId,
        sourceOrderId,
        agentName: String(file.source_agent_name || file.sourceAgentName || taskLabel(taskType)).trim(),
        fileName: String(file.name || `${taskType}-delivery.md`).trim() || `${taskType}-delivery.md`,
        summary: String(file.summary || file.reason || '').trim()
      };
    })
    .filter(Boolean)
    .slice(0, 8);
}

function selectedRetryReuseArtifactsForOrder(orderId = '') {
  const safeOrderId = String(orderId || '').trim();
  if (!safeOrderId) return [];
  return [...document.querySelectorAll(`[data-retry-reuse-order="${CSS.escape(safeOrderId)}"][data-retry-reuse-artifact]:checked`)]
    .map((input) => {
      const file = getDeliveryFile(input.dataset.fileId || '');
      const taskType = String(input.dataset.taskType || '').trim().toLowerCase();
      const sourceRunId = String(input.dataset.sourceRunId || '').trim();
      if (!file || !taskType || !sourceRunId || !String(file.content || '').trim()) return null;
      return {
        task_type: taskType,
        taskType,
        source_order_id: safeOrderId,
        sourceOrderId: safeOrderId,
        source_run_id: sourceRunId,
        sourceRunId,
        file_name: file.name || `${taskType}-delivery.md`,
        fileName: file.name || `${taskType}-delivery.md`,
        content: String(file.content || '').slice(0, 60000),
        type: file.type || 'text/markdown',
        content_type: file.content_type || file.contentType || 'reused_agent_delivery',
        source_agent_name: String(input.dataset.agentName || file.source_agent_name || file.sourceAgentName || '').trim(),
        user_selected: true,
        userSelected: true,
        selected_at: new Date().toISOString()
      };
    })
    .filter(Boolean);
}

function cachedVisibleJobForRetry(orderId = '') {
  const safeId = String(orderId || '').trim();
  if (!safeId) return null;
  return (Array.isArray(state.recentJobs) ? state.recentJobs : [])
    .find((job) => String(job?.id || '').trim() === safeId) || null;
}

function retryReuseArtifactMeta(item = {}) {
  const taskType = String(item.task_type || item.taskType || '').trim().toLowerCase();
  const fileName = String(item.file_name || item.fileName || `${taskType || 'artifact'}-delivery.md`).trim();
  return {
    task_type: taskType,
    taskType,
    source_order_id: String(item.source_order_id || item.sourceOrderId || '').trim(),
    sourceOrderId: String(item.sourceOrderId || item.source_order_id || '').trim(),
    source_run_id: String(item.source_run_id || item.sourceRunId || '').trim(),
    sourceRunId: String(item.sourceRunId || item.source_run_id || '').trim(),
    file_name: fileName || `${taskType || 'artifact'}-delivery.md`,
    fileName: fileName || `${taskType || 'artifact'}-delivery.md`,
    type: String(item.type || 'text/markdown').trim() || 'text/markdown',
    content_type: String(item.content_type || item.contentType || 'reused_agent_delivery').trim() || 'reused_agent_delivery',
    content_chars: String(item.content || '').length,
    source_agent_name: String(item.source_agent_name || item.sourceAgentName || '').trim(),
    user_selected: true,
    userSelected: true,
    selected_at: String(item.selected_at || item.selectedAt || '').trim()
  };
}

function workflowRetryMetaForDraft(workflow = {}, reuseArtifacts = []) {
  const next = workflow && typeof workflow === 'object' ? { ...workflow } : {};
  delete next.reusedArtifacts;
  delete next.reuseArtifacts;
  delete next.retryReuseArtifacts;
  delete next.retry_reuse_artifacts;
  const metas = reuseArtifacts.map(retryReuseArtifactMeta).filter((item) => item.task_type && item.source_run_id);
  return metas.length
    ? { ...next, reusedArtifacts: metas, retryReuseArtifacts: metas }
    : next;
}

function renderRetryReuseControls(job = {}) {
  const orderId = String(job.id || '').trim();
  const artifacts = retryReusableArtifactEntries(job);
  if (!orderId || !artifacts.length) return '';
  const rows = artifacts.map((entry) => {
    const registered = registerDeliveryFile(entry.file, entry.fileName);
    const label = `${taskLabel(entry.taskType)}: ${entry.fileName}`;
    const meta = entry.agentName && entry.agentName !== taskLabel(entry.taskType)
      ? ` (${entry.agentName})`
      : '';
    return [
      '<label class="retry-reuse-row">',
      `<input type="checkbox" data-retry-reuse-artifact="1" data-retry-reuse-order="${escapeHtml(orderId)}" data-file-id="${escapeHtml(registered.id)}" data-task-type="${escapeHtml(entry.taskType)}" data-source-run-id="${escapeHtml(entry.sourceRunId)}" data-agent-name="${escapeHtml(entry.agentName)}">`,
      `<span>${escapeHtml(label)}${escapeHtml(meta)}</span>`,
      '</label>'
    ].join('');
  }).join('');
  return [
    '<div class="approval-card retry-reuse-card">',
    '<strong>Reuse completed artifacts on retry / 完了済み成果物をリトライで再利用</strong>',
    '<div>Select only outputs you inspected and trust. Selected agent steps will be marked reused and will not run again in the new order.</div>',
    `<div class="retry-reuse-list">${rows}</div>`,
    '<span class="chat-hint">Nothing is reused automatically. Press Retry as new order after selecting the artifacts to carry forward.</span>',
    '</div>'
  ].join('\n');
}

function deliveryOrderActionsHtml(job = {}) {
  return deliveryRendererOrderActionsHtml(job, {
    escapeHtml,
    jobHasDeliveryResult,
    jobBlockedByLeaderQualityGate
  });
}

function renderDelivery(job = {}) {
  rememberAiAgentsFromJob(job);
  const files = deliveryFiles(job);
  const text = deliveryText(job) || `Order ${job.id || ''} is ${statusDisplayLabel(job.status || 'updated')}.`;
  const meta = deliveryRendererMeta(job, {
    jobBlockedByLeaderQualityGate,
    jobHasDeliveryResult
  });
  const body = renderDeliveryBody(job, {
    escapeHtml,
    files,
    text,
    statusDisplayLabel,
    jobBlockedByLeaderQualityGate,
    jobHasDeliveryResult,
    renderAuthorityRequest,
    renderRetryReuseControls,
    deliveryOrderActionsHtml,
    renderDedicatedAppDeliveryTools,
    renderAppHandoffTools,
    renderFileCards
  });
  appendMessage(jobHasDeliveryResult(job) ? 'assistant' : 'system', body, {
    tone: meta.tone,
    label: meta.label
  });
}

function renderDeliveryOnce(job = {}, options = {}) {
  const safeId = String(job?.id || '').trim();
  if (!safeId || !jobHasDeliveryResult(job)) return false;
  if (state.deliveredOrderIds.has(safeId) && !options.force) return false;
  rememberTrackedOrder(safeId);
  notifyOrderMilestone(job);
  showWorkflowProgressMap(job, { footer: jobHasDeliveryResult(job) ? 'Workflow finished.' : '' });
  renderDelivery(job);
  markOrderDelivered(safeId);
  return true;
}

function orderMilestoneState(job = {}, options = {}) {
  const explicit = String(options.state || options.orderState || '').trim().toLowerCase();
  if (explicit) return explicit;
  const status = String(job?.status || '').trim().toLowerCase();
  const reviewStatus = String(job?.reviewStatus || job?.review_status || job?.output?.reviewStatus || job?.output?.review_status || job?.output?.delivery?.reviewStatus || '').trim().toLowerCase();
  if (['approved', 'accepted', 'done'].includes(reviewStatus)) return 'done';
  if (['failed', 'timed_out'].includes(status)) return 'failed';
  if (['cancelled', 'canceled'].includes(status)) return 'cancelled';
  if (status === 'blocked') return 'blocked';
  if (status === 'completed') return 'review';
  if (['revision', 'revising'].includes(status)) return 'revision';
  if (status === 'submitted') return 'submitted';
  if (status === 'planning') return 'planning';
  if (status === 'assigned' || status === 'claimed') return 'assigned';
  if (['running', 'dispatched'].includes(status) || job.startedAt || job.started_at || job.dispatchedAt || job.dispatched_at) return 'running';
  if (['queued', 'created', 'pending'].includes(status)) {
    if (job.assignedAgentId || job.assigned_agent_id || job.workflow || job.jobKind === 'workflow') return 'assigned';
    return 'planning';
  }
  return status || 'submitted';
}

function orderMilestoneMessage(job = {}, options = {}) {
  const orderState = orderMilestoneState(job, options);
  const orderId = String(job?.id || options.orderId || state.orderId || '').trim();
  const shortId = orderId ? `#${orderId.slice(0, 8)}` : 'order';
  const prompt = String(job?.originalPrompt || job?.original_prompt || job?.prompt || options.prompt || '').trim();
  const title = prompt ? ` "${compact(prompt, 72)}"` : '';
  const prefix = `Order ${shortId}: `;
  const messages = {
    submitted: `${prefix}Order submitted.${title}`,
    planning: `${prefix}Creating execution plan.`,
    assigned: `${prefix}Worker assigned.`,
    running: `${prefix}Work started.`,
    blocked: `${prefix}Input required. Please review the requested approval or connector action.`,
    review: `${prefix}Deliverable submitted. Please review.`,
    revision: `${prefix}Revision request received. Reworking.`,
    done: `${prefix}Completed.`,
    failed: `${prefix}Failed. Please check the cause.`,
    cancelled: `${prefix}Cancelled.`
  };
  return messages[orderState] || `${prefix}${statusDisplayLabel(orderState)}.`;
}

function orderMilestoneChatExists(orderId = '', orderState = '', message = '') {
  const shortId = String(orderId || '').trim().slice(0, 8);
  const needle = String(message || '').trim();
  if (!needle) return false;
  const statePhrase = {
    submitted: 'Order submitted',
    planning: 'Creating execution plan',
    assigned: 'Worker assigned',
    running: 'Work started',
    blocked: 'Input required',
    review: 'Deliverable submitted',
    revision: 'Revision request received',
    done: 'Completed',
    failed: 'Failed',
    cancelled: 'Cancelled'
  }[String(orderState || '').trim().toLowerCase()] || '';
  return state.chatMessages.some((entry) => {
    const body = String(entry?.body || '').trim();
    if (!body) return false;
    if (body === needle) return true;
    return Boolean(shortId && statePhrase && body.includes(`#${shortId}`) && body.includes(statePhrase));
  });
}

function notifyOrderMilestone(job = {}, options = {}) {
  const orderId = String(job?.id || options.orderId || state.orderId || '').trim();
  const orderState = orderMilestoneState(job, options);
  if (!orderId || !orderState) return false;
  const key = `${orderId}|${orderState}`;
  const message = orderMilestoneMessage(job, { ...options, state: orderState });
  if (state.orderMilestoneNoticeKeys.has(key) || orderMilestoneChatExists(orderId, orderState, message)) {
    state.orderMilestoneNoticeKeys.add(key);
    return false;
  }
  state.orderMilestoneNoticeKeys.add(key);
  appendTextMessage('system', message, {
    tone: ['done', 'review'].includes(orderState) ? 'ok' : (['failed', 'cancelled'].includes(orderState) ? 'error' : (orderState === 'blocked' ? 'warn' : 'info')),
    label: 'Order'
  });
  return true;
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
  const jobs = await refreshRecentJobs({ force: true, limit: 30 });
  let delivered = 0;
  const activeOrderId = String(options.orderId || state.orderId || '').trim();
  const notifyMilestones = options.notifyMilestones !== false;
  for (const job of jobs) {
    const safeId = String(job?.id || '').trim();
    if (!safeId) continue;
    if (activeOrderId && safeId !== activeOrderId && options.includeHistoricalTracked !== true) continue;
    const matchesTracked = state.trackedOrderIds.has(safeId);
    const matchesRecovery = state.pendingRecoveryPayloads.some((payload) => recoveryCandidate(job, payload));
    if (!matchesTracked && !matchesRecovery) continue;
    rememberTrackedOrder(safeId);
    if (!state.orderId && matchesRecovery) state.orderId = safeId;
    if (notifyMilestones) notifyOrderMilestone(job);
    if (jobHasDeliveryResult(job)) {
      if (options.renderTerminalDeliveries === false && !matchesRecovery) continue;
      if (renderDeliveryOnce(job, { force: options.force === true })) delivered += 1;
    } else if (!state.polling && safeId === state.orderId && !state.liveProgressStoppedOrderIds.has(safeId)) {
      showWorkflowProgressMap(job);
      maybeRenderAuthorityNotice(job, { label: 'Approval required' });
      startPolling(safeId);
    } else {
      showWorkflowProgressMap(job);
      maybeRenderAuthorityNotice(job, { label: 'Approval required' });
    }
  }
  return delivered;
}

function startDeliveryBackfillLoop(options = {}) {
  if (state.deliveryBackfill) return;
  let runs = 0;
  const viewRevision = Number(options.viewRevision || state.chatViewRevision || 0) || 0;
  let intervalId = null;
  const stopLoop = () => {
    if (intervalId) window.clearInterval(intervalId);
    if (state.deliveryBackfill === intervalId) state.deliveryBackfill = null;
  };
  const tick = async () => {
    if (viewRevision && Number(state.chatViewRevision || 0) !== viewRevision) {
      stopLoop();
      return;
    }
    runs += 1;
    try {
      await backfillChatDeliveries(options);
    } catch {}
    if (runs >= Number(options.maxRuns || 36)) {
      stopLoop();
    }
  };
  intervalId = window.setInterval(tick, CHATUX_BACKFILL_INTERVAL_MS);
  state.deliveryBackfill = intervalId;
  void tick();
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

function retryDraftFromJob(job = {}, options = {}) {
  const workflow = job.workflow && typeof job.workflow === 'object'
    ? job.workflow
    : (job.input?._broker?.workflow && typeof job.input._broker.workflow === 'object' ? job.input._broker.workflow : {});
  const plannedTasks = Array.isArray(workflow.plannedTasks)
    ? workflow.plannedTasks.map((item) => String(item || '').trim().toLowerCase()).filter(Boolean)
    : [];
  const taskType = String(plannedTasks[0] || job.taskType || job.workflowTask || 'research').trim().toLowerCase() || 'research';
  const route = String(
    job.orderStrategy
    || job.order_strategy
    || job.input?.order_strategy
    || job.input?.orderStrategy
    || (job.jobKind === 'workflow' || job.workflow ? 'multi' : 'single')
  ).trim().toLowerCase() || 'auto';
  const broker = job.input?._broker && typeof job.input._broker === 'object' ? job.input._broker : {};
  const previousInput = job.input && typeof job.input === 'object' ? job.input : {};
  const previousPrompt = String(job.originalPrompt || workflow.objective || job.prompt || '').trim();
  const promptCandidates = [
    previousInput.original_prompt,
    previousInput.originalPrompt,
    broker?.workflow?.originalPrompt,
    broker?.workflow?.objective,
    job.originalPrompt,
    workflow.originalPrompt,
    workflow.objective,
    job.prompt,
  ].map((item) => String(item || '').trim()).filter(Boolean);
  const originalPrompt = promptCandidates.find((item) => !/^(?:retry|redo|rerun|再実行|リトライ|やり直し)$/i.test(item))
    || promptCandidates[0]
    || '';
  const prompt = previousPrompt
    ? previousPrompt
    : isStructuredOrderBriefText(job.prompt)
    ? String(job.prompt || '').trim()
    : draftBrief(originalPrompt || job.prompt || '', {
        taskType,
        resolvedOrderStrategy: route,
        reason: `Retry prepared from order ${String(job.id || '').slice(0, 8)}.`
      }, { ja: looksJapanese(originalPrompt || job.prompt || '') });
  const owner = broker.conversationOwner || broker.activeLeader || {};
  const ownerTaskType = String(owner.taskType || owner.task_type || (taskType.endsWith('_leader') ? taskType : '')).trim().toLowerCase();
  const ownerLabel = String(owner.label || owner.name || '').trim();
  const previousConnectorContexts = Array.isArray(broker.connectorContexts)
    ? broker.connectorContexts.slice(0, 8)
    : Array.isArray(previousInput.connectorContexts)
      ? previousInput.connectorContexts.slice(0, 8)
      : [];
  const previousAppContexts = Array.isArray(broker.appContexts)
    ? broker.appContexts.slice(0, 8)
    : Array.isArray(previousInput.appContexts)
      ? previousInput.appContexts.slice(0, 8)
      : [];
  const reuseArtifacts = Array.isArray(options.reuseArtifacts)
    ? options.reuseArtifacts
      .filter((item) => item && item.user_selected !== false && item.userSelected !== false)
      .map((item) => ({
        ...item,
        task_type: String(item.task_type || item.taskType || '').trim().toLowerCase(),
        taskType: String(item.taskType || item.task_type || '').trim().toLowerCase(),
        source_order_id: String(item.source_order_id || item.sourceOrderId || job.id || '').trim(),
        sourceOrderId: String(item.sourceOrderId || item.source_order_id || job.id || '').trim(),
        source_run_id: String(item.source_run_id || item.sourceRunId || '').trim(),
        sourceRunId: String(item.sourceRunId || item.source_run_id || '').trim(),
        user_selected: true,
        userSelected: true
      }))
      .filter((item) => item.task_type && item.source_run_id && String(item.content || '').trim())
      .slice(0, 8)
    : [];
  const retryWorkflowMeta = workflowRetryMetaForDraft(
    broker.workflow && typeof broker.workflow === 'object' ? broker.workflow : {},
    reuseArtifacts
  );
  return {
    taskType,
    task_type: taskType,
    resolvedOrderStrategy: route,
    resolved_order_strategy: route,
    retryMode: CHATUX_RETRY_MODE_NEW_ORDER,
    retry_mode: CHATUX_RETRY_MODE_NEW_ORDER,
    retryOfOrderId: String(job.id || '').trim(),
    continuesOrder: false,
    continues_order: false,
    reason: `Prepared as the same content in a new order from previous order ${String(job.id || '').slice(0, 8)}. It will not continue the previous order.`,
    prompt,
    originalPrompt: originalPrompt || prompt,
    intakeChecked: true,
    intakeAnswered: true,
    activeLeaderTaskType: ownerTaskType,
    activeLeaderName: ownerLabel,
    activeLeaderLocked: Boolean(ownerTaskType),
    active_leader_locked: Boolean(ownerTaskType),
    conversationOwner: ownerTaskType ? { type: 'leader', taskType: ownerTaskType, label: ownerLabel || taskLabel(ownerTaskType) } : undefined,
    workflowPlannedTasks: plannedTasks,
    workflow_planned_tasks: plannedTasks,
    ...(reuseArtifacts.length ? { retryReuseArtifacts: reuseArtifacts, retry_reuse_artifacts: reuseArtifacts } : {}),
    input: {
      ...(previousConnectorContexts.length ? { connectorContexts: previousConnectorContexts } : {}),
      ...(previousAppContexts.length ? { appContexts: previousAppContexts } : {}),
      _broker: {
        ...(previousConnectorContexts.length ? { connectorContexts: previousConnectorContexts } : {}),
        ...(previousAppContexts.length ? { appContexts: previousAppContexts } : {}),
        retryOfOrderId: String(job.id || '').trim(),
        retryOfStatus: String(job.status || '').trim(),
        retryPreparedAt: new Date().toISOString(),
        retry: {
          mode: CHATUX_RETRY_MODE_NEW_ORDER,
          intent: CHATUX_RETRY_MODE_NEW_ORDER,
          sourceOrderId: String(job.id || '').trim(),
          sourceStatus: String(job.status || '').trim(),
          continuesOrder: false,
          preservePrompt: true,
          preservePlan: plannedTasks.length > 0,
          plannedTasks,
          ...(reuseArtifacts.length ? { reuseArtifacts, reuse_artifacts: reuseArtifacts } : {}),
          preparedAt: new Date().toISOString()
        },
        ...(Object.keys(retryWorkflowMeta).length ? { workflow: retryWorkflowMeta } : {}),
        ...(ownerTaskType ? {
          conversationOwner: { type: 'leader', taskType: ownerTaskType, label: ownerLabel || taskLabel(ownerTaskType) },
          activeLeader: { taskType: ownerTaskType, label: ownerLabel || taskLabel(ownerTaskType) },
          activeLeaderLocked: true
        } : {})
      }
    },
    updatedAt: new Date().toISOString()
  };
}

async function prepareRetryFromOrder(orderId = '', options = {}) {
  const safeId = String(orderId || '').trim();
  if (!safeId) return;
  setBusy(true);
  try {
    let job = null;
    try {
      job = await fetchVisibleJob(safeId, { force: true, progress: false, inspectOnly: true });
    } catch (error) {
      const cached = cachedVisibleJobForRetry(safeId);
      if (cached?.id && jobHasDeliveryResult(cached)) {
        job = cached;
      } else {
        throw error;
      }
    }
    if (!job?.id) throw new Error('Order was not found.');
    renderDeliveryOnce(job, { force: true });
    const reuseArtifacts = Array.isArray(options.reuseArtifacts) ? options.reuseArtifacts : selectedRetryReuseArtifactsForOrder(safeId);
    state.draft = retryDraftFromJob(job, { reuseArtifacts });
    const sourceOrderId = String(job.id || safeId || '').trim();
    state.followupTargetOrderId = '';
    markLiveProgressStopped(sourceOrderId);
    if (String(state.orderId || '').trim() === sourceOrderId) {
      state.orderId = '';
      if (state.polling) window.clearInterval(state.polling);
      state.polling = null;
    }
    const retryOwner = state.draft.conversationOwner?.type === 'leader'
      ? leaderOwner(state.draft.conversationOwner.taskType, `Preserved from retry source order ${String(job.id || '').slice(0, 8)}.`)
      : null;
    if (retryOwner) {
      state.activeOwner = {
        type: 'leader',
        taskType: retryOwner.taskType,
        label: retryOwner.label,
        reason: retryOwner.reason
      };
      state.activeOwnerLocked = true;
      state.activeLeader = {
        taskType: retryOwner.taskType,
        label: retryOwner.label,
        reason: retryOwner.reason
      };
      state.activeLeaderLocked = true;
      state.draft = withConversationOwner(state.draft, retryOwner);
      renderActiveLeaderStatus();
    } else {
      const lockedOwner = currentLockedConversationOwner();
      if (lockedOwner) state.draft = withConversationOwner(state.draft, lockedOwner);
    }
    setConversationOwnerFromPrepared(state.draft, { sample: state.draft.originalPrompt || state.draft.prompt });
    state.draftRevision += 1;
    const reuseNote = reuseArtifacts.length
      ? chatText(
          ` Selected completed artifacts to reuse: ${reuseArtifacts.map((item) => item.task_type || item.taskType).filter(Boolean).join(', ')}. Those steps will be skipped in the new order.`,
          ` 再利用する完了済み成果物: ${reuseArtifacts.map((item) => item.task_type || item.taskType).filter(Boolean).join(', ')}。新しいオーダーでは該当ステップをスキップします。`,
          state.draft.originalPrompt || state.draft.prompt
        )
      : '';
    appendTextMessage('assistant', chatText(
      `I prepared a same-content retry as a NEW order. It will not continue order #${sourceOrderId.slice(0, 8)}. Use Check status or approval controls when you want to continue an existing order instead.${reuseNote}`,
      `同じ内容を新しいオーダーとして再実行するドラフトを作りました。既存オーダー #${sourceOrderId.slice(0, 8)} の続きではありません。既存オーダーを続ける場合は Check status や承認コントロールを使ってください。${reuseNote}`,
      state.draft.originalPrompt || state.draft.prompt
    ), { tone: 'warn', label: 'Retry as new order' });
    appendOrderConfirmation({ updated: true });
  } catch (error) {
    appendTextMessage('assistant', orderErrorMessage(error), { tone: 'error', label: 'Retry' });
  } finally {
    setBusy(false);
  }
}

function retryCommandText(prompt = '') {
  const compact = String(prompt || '').replace(/[?？!！。.,、\s]+$/g, '').trim();
  return /^(retry|redo|rerun|run again|try again|リトライ|再実行|やり直し|もう一回|もう一度)$/i.test(compact);
}

async function retryTargetJobForCommand() {
  const ids = [...new Set([
    state.orderId,
    state.followupTargetOrderId,
    ...Array.from(state.trackedOrderIds || []).reverse()
  ].map((item) => String(item || '').trim()).filter(Boolean))];
  let firstKnown = null;
  for (const id of ids) {
    try {
      const job = await fetchVisibleJob(id);
      if (!job?.id) continue;
      if (!firstKnown) firstKnown = job;
      if (jobHasDeliveryResult(job)) return job;
    } catch {}
  }
  try {
    const jobs = await refreshRecentJobs({ force: true });
    const terminal = (Array.isArray(jobs) ? jobs : []).find((job) => job?.id && jobHasDeliveryResult(job));
    if (terminal) return terminal;
    return firstKnown || (Array.isArray(jobs) ? jobs.find((job) => job?.id) : null) || null;
  } catch {
    return firstKnown;
  }
}

async function handleRetryCommand(prompt = '') {
  if (!retryCommandText(prompt)) return false;
  const job = await retryTargetJobForCommand();
  if (!job?.id) {
    appendTextMessage('assistant', chatText(
      'I could not find an order to retry. Open an order from history first, then press Retry as new order.',
      'リトライ対象のオーダーが見つかりません。先に履歴から対象オーダーを開いてから Retry as new order を押してください。',
      prompt
    ), { tone: 'warn', label: 'Retry' });
    return true;
  }
  if (!jobHasDeliveryResult(job)) {
    const visibleStatus = statusDisplayLabel(job.status || 'created');
    appendTextMessage('assistant', chatText(
      `Order ${job.id.slice(0, 8)} is still ${visibleStatus}. I did not create a retry draft while the order is active.`,
      `オーダー ${job.id.slice(0, 8)} はまだ ${visibleStatus} です。進行中のためリトライドラフトは作成していません。`,
      prompt
    ), { tone: 'warn', label: 'Retry' });
    maybeRenderAuthorityNotice(job, { label: 'Approval required' });
    resumeLiveProgress(job.id);
    startPolling(job.id);
    return true;
  }
  await prepareRetryFromOrder(job.id);
  return true;
}

function activeOrderFollowupAllowedText(prompt = '') {
  const text = String(prompt || '').trim();
  if (!text || !state.orderId || state.draft || state.pendingIntake) return false;
  const compact = text.replace(/[?？!！。.,、\s]+$/g, '').trim();
  if (/^(send|send order|発注|注文|実行)$/i.test(compact)) return false;
  if (retryCommandText(compact)) return false;
  if (/^(status|help|状況|現状|今どこ|何待ち|ヘルプ)$/i.test(compact)) return false;
  if (/^(pause|hold|stop|later|not now|cancel|一旦保留|いったん保留|保留|あとで|後で|ストップ|止めて|中断|キャンセル|やめる)$/i.test(compact)) return false;
  return explicitActiveOrderFollowupRequestText(compact);
}

function explicitActiveOrderFollowupRequestText(text = '') {
  const compact = String(text || '').trim();
  if (!compact) return false;
  return /(?:continue|resume|follow[-\s]?up|add|attach|append).{0,48}(?:this|current|existing|same).{0,16}(?:order|workflow|run)/i.test(compact)
    || /(?:this|current|existing|same).{0,16}(?:order|workflow|run).{0,48}(?:continue|resume|follow[-\s]?up|add|attach|append)/i.test(compact)
    || /(?:この|今の|現在の|既存の|同じ).{0,12}(?:オーダー|注文|ワークフロー|依頼).{0,32}(?:続き|追加|紐づけ|引き継ぎ|再開)/i.test(compact)
    || /(?:続き|追加|紐づけ|引き継ぎ|再開).{0,32}(?:この|今の|現在の|既存の|同じ).{0,12}(?:オーダー|注文|ワークフロー|依頼)/i.test(compact);
}

async function prepareFollowupForRunningOrder(prompt = '') {
  const text = String(prompt || '').trim();
  const orderId = String(state.orderId || '').trim();
  if (!text || !orderId) return false;
  const job = await fetchVisibleJob(orderId);
  if (!job?.id || jobHasDeliveryResult(job)) return false;
  let prepared;
  try {
    prepared = await api('/api/deliveries/prepare-followup-order', {
      method: 'POST',
      body: JSON.stringify({
        job_id: job.id,
        answer: text,
        mode: 'running',
        allow_running: true
      })
    });
  } catch (error) {
    appendTextMessage('assistant', `${chatText('Could not prepare that as a follow-up for the running order.', '進行中オーダーへの追加要望として準備できませんでした。', text)} ${orderErrorMessage(error)}`, { tone: 'error', label: 'Follow-up' });
    return true;
  }
  const preparedPrompt = String(prepared?.prompt || '').trim();
  const preparedTaskType = String(prepared?.task_type || prepared?.taskType || '').trim();
  if (!preparedPrompt || !preparedTaskType) {
    appendTextMessage('assistant', chatText(
      'The server did not return a complete follow-up draft, so I did not create one in chat.',
      'サーバーが完全なフォローアップドラフトを返さなかったため、チャット側では作成しませんでした。',
      text
    ), { tone: 'error', label: 'Follow-up' });
    return true;
  }
  const conversationOwner = prepared?.conversation_owner && typeof prepared.conversation_owner === 'object'
    ? prepared.conversation_owner
    : prepared?.conversationOwner;
  const draftSeed = {
    ...(prepared || {}),
    taskType: preparedTaskType,
    task_type: preparedTaskType,
    resolvedOrderStrategy: prepared?.order_strategy || prepared?.resolvedOrderStrategy || 'auto',
    resolved_order_strategy: prepared?.order_strategy || prepared?.resolved_order_strategy || 'auto',
    reason: String(prepared?.reason || '').trim(),
    conversationOwner
  };
  state.draft = chatEngineBuildOrderDraft(preparedPrompt, draftSeed, {
    originalPrompt: text,
    intakeChecked: true,
    intakeAnswered: true,
    conversationOwner
  });
  const broker = state.draft.input?._broker && typeof state.draft.input._broker === 'object' ? state.draft.input._broker : {};
  const preparedBroker = prepared?.input?._broker && typeof prepared.input._broker === 'object' ? prepared.input._broker : {};
  state.draft.input = {
    ...(state.draft.input || {}),
    ...(prepared?.input && typeof prepared.input === 'object' ? prepared.input : {}),
    _broker: {
      ...preparedBroker,
      ...broker,
      conversation: {
        ...(preparedBroker.conversation && typeof preparedBroker.conversation === 'object' ? preparedBroker.conversation : {}),
        ...(broker.conversation && typeof broker.conversation === 'object' ? broker.conversation : {}),
        mode: 'followup',
        userExplicitContinuation: true,
        explicitContinuation: true,
        followupToJobId: String(prepared?.followup_to_job_id || job.id),
        followup_to_job_id: String(prepared?.followup_to_job_id || job.id)
      },
    }
  };
  state.draft.followupToJobId = String(prepared?.followup_to_job_id || job.id);
  state.followupTargetOrderId = String(prepared?.followup_to_job_id || job.id);
  state.draftRevision += 1;
  setConversationOwnerFromPrepared(state.draft, { sample: text });
  appendTextMessage('assistant', chatText(
    `I prepared this as an add-on request for running order ${job.id.slice(0, 8)}. Review it, then press Send order to attach the new request.`,
    `進行中オーダー ${job.id.slice(0, 8)} への追加要望としてドラフト化しました。内容を確認し、Send order でこの要望を紐づけて実行します。`,
    text
  ), { tone: 'ok', label: 'Follow-up' });
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

async function sendOrder() {
  if (!state.draft) return;
  setBusy(true);
  try {
    const chatSessionId = ensureChatSessionId({ force: true });
    const draftBroker = state.draft?.input?._broker && typeof state.draft.input._broker === 'object' ? state.draft.input._broker : {};
    const suppressLeaderLock = draftBroker.leaderFollowupSpecialistRouted === true;
    const lockedOwner = suppressLeaderLock ? null : currentLockedConversationOwner();
    const acceptedDraft = lockedOwner ? withConversationOwner(state.draft, lockedOwner) : state.draft;
    state.draft = acceptedDraft;
    const measurementEvidenceStatus = measurementEvidenceContextStatus(acceptedDraft);
    if (draftExplicitlyRequestsMeasurementEvidence(acceptedDraft) && !measurementEvidenceStatus.loaded && !measurementEvidenceStatus.skipped) {
      await openMeasurementEvidenceAppForDraft(acceptedDraft);
      appendTextMessage('assistant', chatText(
        'This order explicitly asks to use GA4/Search Console, so I stopped dispatch until the loaded analytics context is attached. After Send to CAIt returns here, press Send order again.',
        'この注文は GA4/Search Console の利用を明示しているため、読み込み済みアナリティクスコンテキストが添付されるまで発注送信を止めました。Send to CAIt で戻った後、もう一度 Send order を押してください。',
        acceptedDraft.originalPrompt || acceptedDraft.prompt || ''
      ), { tone: 'warn', label: 'Analytics required' });
      return;
    }
    const actorLabel = activeActorLabel('CAIt');
    const acceptedDeliveryFormat = acceptedDraft.deliveryFormat || acceptedDraft.delivery_format || selectedDeliveryFormat();
    const payload = chatEngineBuildJobPayload(acceptedDraft, {
      parentAgentId: 'chatux',
      source: 'chatux',
      visitorId: state.visitorId,
      budgetCap: 500,
      deadlineSec: 300,
      broker: {
        chatux: {
          delivery_channel: 'chat',
          return_path: CHATUX_RETURN_PATH,
          visitor_id: state.visitorId
        },
        deliveryFormat: acceptedDeliveryFormat,
        delivery_format: acceptedDeliveryFormat,
        delivery_format_label: selectedDeliveryFormatLabel(acceptedDeliveryFormat),
        chatSessionId,
        intake: {
          prepared_in_chat: true,
          answered: acceptedDraft.intakeAnswered === true,
          checked_at: acceptedDraft.updatedAt || new Date().toISOString()
        }
      }
    });
    const sameContentRetryAsNewOrder = draftIsSameContentNewOrderRetry(acceptedDraft);
    const explicitFollowupContinuation = draftIsExplicitFollowupContinuation(acceptedDraft);
    const followupToJobId = sameContentRetryAsNewOrder || !explicitFollowupContinuation
      ? ''
      : String(acceptedDraft.followupToJobId || acceptedDraft.followup_to_job_id || acceptedDraft.input?._broker?.conversation?.followupToJobId || '').trim();
    if (followupToJobId) payload.followup_to_job_id = followupToJobId;
    payload.session_id = chatSessionId;
    const clientOrderId = clientOrderIdFromOrderCreate(payload) || makeClientOrderId();
    payload.client_order_id = clientOrderId;
    payload.clientOrderId = clientOrderId;
    payload.input = {
      ...(payload.input || {}),
      session_id: chatSessionId,
      client_order_id: clientOrderId,
      _broker: {
        ...((payload.input && typeof payload.input === 'object' && payload.input._broker && typeof payload.input._broker === 'object') ? payload.input._broker : {}),
        clientOrderId,
        clientOrderPreparedAt: new Date().toISOString()
      }
    };
    if (sameContentRetryAsNewOrder) {
      delete payload.followup_to_job_id;
      delete payload.followupToJobId;
      const broker = payload.input?._broker && typeof payload.input._broker === 'object' ? payload.input._broker : null;
      const conversation = broker?.conversation && typeof broker.conversation === 'object' ? broker.conversation : null;
      if (conversation) {
        delete conversation.followupToJobId;
        delete conversation.followup_to_job_id;
      }
      if (broker) {
        broker.retry = {
          ...(broker.retry && typeof broker.retry === 'object' ? broker.retry : {}),
          mode: CHATUX_RETRY_MODE_NEW_ORDER,
          intent: CHATUX_RETRY_MODE_NEW_ORDER,
          continuesOrder: false
        };
      }
    } else if (!explicitFollowupContinuation) {
      delete payload.followup_to_job_id;
      delete payload.followupToJobId;
      const broker = payload.input?._broker && typeof payload.input._broker === 'object' ? payload.input._broker : null;
      const conversation = broker?.conversation && typeof broker.conversation === 'object' ? broker.conversation : null;
      if (conversation) {
        delete conversation.followupToJobId;
        delete conversation.followup_to_job_id;
        if (conversation.mode === 'followup') delete conversation.mode;
      }
      delete payload.input?._broker?.followupToJobId;
      delete payload.input?._broker?.followup_to_job_id;
      delete acceptedDraft.followupToJobId;
      delete acceptedDraft.followup_to_job_id;
    }
    rememberPendingRecoveryPayload(payload);
    let created;
    try {
      created = await api('/api/jobs', {
        method: 'POST',
        body: orderCreateRequestBody(payload)
      });
    } catch (error) {
      const recovered = await recoverAcceptedOrderAfterCreateError(payload, error);
      if (!recovered) throw error;
      created = recovered;
    }
    if (isNeedsInputResponse(created)) {
      startIntake(created, state.draft?.originalPrompt || payload.prompt);
      return;
    }
    state.orderId = extractOrderId(created);
    if (state.orderId) {
      trackChatGa4Once(`order_submitted:${state.orderId}`, 'order_submitted', {
        order_id: state.orderId,
        task_type: acceptedDraft.taskType || acceptedDraft.task_type || payload.task_type || '',
        strategy: acceptedDraft.requestedStrategy || acceptedDraft.requested_strategy || payload.strategy || '',
        retry_mode: sameContentRetryAsNewOrder ? CHATUX_RETRY_MODE_NEW_ORDER : (followupToJobId ? 'followup_continuation' : 'new_order')
      });
      resumeLiveProgress(state.orderId);
      rememberTrackedOrder(state.orderId);
      clearPendingRecoveryPayload(payload);
      const session = currentChatSessionPayload();
      if (session) {
        upsertChatSession({
          ...session,
          linkedOrderId: state.orderId,
          activeJobIds: [],
          relatedOrderIds: [...new Set([...(Array.isArray(session.relatedOrderIds) ? session.relatedOrderIds : []), state.orderId])],
          activeWork: false,
          updatedAt: isoNow()
        });
        renderChatSessionSidebar();
      }
    }
    rememberAiAgentsFromDraft(acceptedDraft, created, payload);
    state.draft = null;
    state.followupTargetOrderId = '';
    state.draftRevision += 1;
    updateComposerMode();
    if (state.orderId) {
      notifyOrderMilestone({
        id: state.orderId,
        status: 'submitted',
        prompt: acceptedDraft.originalPrompt || payload.prompt || '',
        originalPrompt: acceptedDraft.originalPrompt || payload.prompt || ''
      }, {
        state: 'submitted'
      });
      renderInitialAgentMap(created, acceptedDraft.originalPrompt || payload.prompt || '');
    }
    if (state.orderId) startPolling(state.orderId);
    else {
      startDeliveryBackfillLoop({ maxRuns: 60 });
    }
    state.pendingAppContext = null;
  } catch (error) {
    appendTextMessage('assistant', orderErrorMessage(error), { tone: 'error', label: 'Waiting' });
  } finally {
    setBusy(false);
  }
}

function orderErrorMessage(error) {
  const message = String(error?.message || 'Order failed.');
  if (error?.status === 401) {
    return `${message}\n\nSign in first, then return to this chat screen.\nGoogle: ${loginHref('google')}\nGitHub: ${loginHref('github')}`;
  }
  if (/payment|funding|deposit/i.test(message)) {
    return `${message}\n\nOpen the main app settings to add billing, then retry from this chat.`;
  }
  return message;
}

function startPolling(orderId) {
  if (state.polling) window.clearInterval(state.polling);
  const safeOrderId = String(orderId || '').trim();
  const viewRevision = Number(state.chatViewRevision || 0) || 0;
  let pollCount = 0;
  let consecutiveProgressErrors = 0;
  let nextProgressPollAt = 0;
  if (safeOrderId) {
    showProgressNarrator('Checking order progress.', {
      key: safeOrderId,
      phase: 'Dispatch',
      status: 'running',
      detail: `Order #${safeOrderId.slice(0, 8)}`,
      progressPercent: 8,
      progressLabel: 'Starting'
    });
  }
  const pollingContextIsCurrent = () => orderRuntimePollingContextIsCurrent({
    state,
    viewRevision,
    orderId: safeOrderId
  });
  const tick = async () => {
    if (!pollingContextIsCurrent()) return;
    pollCount += 1;
    const now = Date.now();
    if (nextProgressPollAt && now < nextProgressPollAt) return;
    try {
      const result = await api(`/api/jobs/${encodeURIComponent(safeOrderId)}?visitor_id=${encodeURIComponent(state.visitorId)}`);
      if (!pollingContextIsCurrent()) return;
      consecutiveProgressErrors = 0;
      nextProgressPollAt = 0;
      const job = result.job && typeof result.job === 'object' ? { ...result.job, id: result.job.id || safeOrderId } : { id: safeOrderId };
      const authorityRequest = authorityRequestFromJob(job);
      const approvalWaiting = authorityRequestIsActionableForJob(job, authorityRequest);
      rememberTrackedOrder(job.id || safeOrderId);
      notifyOrderMilestone(job);
      showProgressNarrator(progressNarratorTextForJob(job), progressNarratorOptionsForJob(job));
      showWorkflowProgressMap(job);
      maybeRenderAuthorityNotice(job, { label: 'Approval required' });
      if (orderRuntimeShouldPauseForApproval(job, approvalWaiting)) {
        showProgressNarrator('Waiting for approval or connector access.', {
          ...progressNarratorOptionsForJob(job),
          status: 'waiting',
          detail: 'Review the requested action in this chat.'
        });
        window.clearInterval(state.polling);
        state.polling = null;
        markLiveProgressStopped(safeOrderId);
        updateComposerMode();
        startDeliveryBackfillLoop({ maxRuns: 12, renderTerminalDeliveries: false });
        return;
      }
      if (jobHasDeliveryResult(job)) {
        showProgressNarrator(progressNarratorTextForJob(job), {
          ...progressNarratorOptionsForJob(job),
          done: true,
          progressPercent: 100,
          progressLabel: 'Complete'
        });
        window.clearInterval(state.polling);
        state.polling = null;
        updateComposerMode();
        renderDeliveryOnce(job);
        return;
      }
      if (pollCount >= CHATUX_PROGRESS_MAX_POLLS) {
        showProgressNarrator('Progress is continuing in the background.', {
          key: safeOrderId,
          phase: 'Background',
          status: 'watching',
          progressPercent: 96,
          progressLabel: 'Background'
        });
        window.clearInterval(state.polling);
        state.polling = null;
        markLiveProgressStopped(safeOrderId);
        updateComposerMode();
        startDeliveryBackfillLoop({ maxRuns: 60 });
      }
    } catch (error) {
      if (!pollingContextIsCurrent()) return;
      consecutiveProgressErrors += 1;
      const status = Number(error?.status || error?.statusCode || error?.data?.status || 0);
      const message = String(error?.message || '').toLowerCase();
      const transient = [408, 429, 500, 502, 503, 504].includes(status)
        || /failed to fetch|network|timeout|temporar|unavailable|gateway|rate limit|service/i.test(message);
      if (transient && consecutiveProgressErrors < 30) {
        const retryDelayMs = Math.min(45000, Math.max(5000, 3500 * consecutiveProgressErrors));
        nextProgressPollAt = Date.now() + retryDelayMs;
        showProgressNarrator('Progress check is retrying.', {
          key: safeOrderId,
          phase: 'Progress',
          status: 'retrying',
          detail: `Next check in ${Math.ceil(retryDelayMs / 1000)}s`,
          progressPercent: 18,
          progressLabel: 'Retrying'
        });
        if (consecutiveProgressErrors === 1) startDeliveryBackfillLoop({ maxRuns: 8 });
        return;
      }
      window.clearInterval(state.polling);
      state.polling = null;
      updateComposerMode();
      if (transient) {
        markLiveProgressStopped(safeOrderId);
        startDeliveryBackfillLoop({ maxRuns: 60 });
        return;
      }
      markLiveProgressStopped(safeOrderId);
      appendTextMessage('assistant', orderErrorMessage(error), { tone: 'error', label: 'Order status' });
      startDeliveryBackfillLoop({ maxRuns: 60 });
    }
  };
  void tick();
  state.polling = window.setInterval(tick, 3500);
  updateComposerMode();
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

async function handleInboundAppContext(context = {}, options = {}) {
  if (!context) return false;
  const contextId = String(context.id || '').trim();
  const dedupeKey = contextId || `${context.source_app || 'app'}:${context.created_at || Date.now()}`;
  if (dedupeKey && processedAppContextIds.has(dedupeKey)) return true;
  if (dedupeKey) processedAppContextIds.add(dedupeKey);
  appendMessage('assistant', caitAppContextThreadHtml(context), { label: 'App context', tone: 'ok' });
  if (attachInboundAppContextToIntakeOrDraft(context, options)) return true;
  state.pendingAppContext = context;
  els.promptInput.value = caitAppContextChatPrompt(context);
  els.promptInput.focus();
  return true;
}

function handleInboundAppContextServerRecord(data = {}) {
  const id = String(data.app_context_id || data.context_id || '').trim();
  if (!id) return false;
  const token = String(data.app_context_token || '').trim();
  const chatUrl = String(data.chat_url || '').trim();
  const record = { id, token, chatUrl };
  if (state.pendingIntake) {
    state.pendingIntake.appContextServerRecord = record;
  }
  if (state.pendingAppContext && typeof state.pendingAppContext === 'object') {
    state.pendingAppContext.server_record = record;
  }
  return true;
}

function handleCaitAppContextMessage(data = {}, options = {}) {
  if (!data || typeof data !== 'object') return false;
  const origin = String(options.origin || data.origin || '').trim();
  if (origin && origin !== window.location.origin) return false;
  if (data.type === 'cait-app-context-server-record') {
    return handleInboundAppContextServerRecord(data);
  }
  if (data.type !== 'cait-app-context') return false;
  void handleInboundAppContext(data.context || {}, {
    label: 'App context',
    appContextId: data.app_context_id || '',
    appContextToken: data.app_context_token || ''
  });
  return true;
}

function startAppContextBroadcastListener() {
  if (appContextBroadcastChannel || typeof BroadcastChannel !== 'function') return;
  try {
    appContextBroadcastChannel = new BroadcastChannel(CAIT_APP_CONTEXT_CHANNEL);
    appContextBroadcastChannel.addEventListener('message', (event) => {
      handleCaitAppContextMessage(event.data || {});
    });
  } catch {
    appContextBroadcastChannel = null;
  }
}

async function hydrateAppContextFromUrl() {
  const context = await consumeCaitAppContextForChat();
  if (!context) return false;
  return handleInboundAppContext(context, { label: 'App context' });
}

function startOAuthPopupMonitor(popup = null) {
  if (!popup) return;
  if (state.oauthPopupMonitor) window.clearInterval(state.oauthPopupMonitor);
  state.oauthPopupMonitor = connectorGateStartOAuthPopupMonitor(popup, {
    waitMs: CHATUX_CONNECT_WAIT_MS,
    intervalMs: CHATUX_CONNECT_CHECK_INTERVAL_MS,
    onClosedOrTimedOut: () => {
      window.clearInterval(state.oauthPopupMonitor);
      state.oauthPopupMonitor = null;
      void refreshAuth();
      if (state.orderId) {
        state.authorityNoticeKeys.clear();
        void fetchVisibleJob(state.orderId)
          .then((job) => {
            maybeRenderAuthorityNotice(job, { label: 'Approval required' });
            if (jobHasDeliveryResult(job)) renderDeliveryOnce(job, { force: true });
            else {
              resumeLiveProgress(job.id || state.orderId);
              startPolling(job.id || state.orderId);
            }
          })
          .catch(() => startDeliveryBackfillLoop({ maxRuns: 6, renderTerminalDeliveries: false }));
      }
    }
  });
}

function openChatOAuthPopup(href = '', label = 'Google connection') {
  const target = String(href || '').trim();
  if (!target) return false;
  saveChatOAuthReturnState('oauth_popup_open');
  const popup = connectorGateOpenOAuthPopup(target);
  if (!popup) return false;
  appendTextMessage('system', chatText(
    `${label} opened in a separate window. Keep this chat open; I will wait up to 60 minutes and continue from here when the connection finishes.`,
    `${label} を別ウィンドウで開きました。このチャットは開いたままにしてください。最大60分待機し、接続が終わったらここから続けます。`,
    state.chatMessages[0]?.body || state.conversationLanguage
  ), { label: 'Connector' });
  startOAuthPopupMonitor(popup);
  return true;
}

async function handleOAuthPopupReturnMessage(data = {}) {
  return connectorGateHandleOAuthPopupReturnMessage(data, {
    onError: ({ connectorLabel, error }) => {
      appendTextMessage('assistant', chatText(
        `${connectorLabel} connection did not complete: ${error}`,
        `${connectorLabel}接続が完了しませんでした: ${error}`,
        state.chatMessages[0]?.body || state.conversationLanguage
      ), { tone: 'error', label: 'Connector' });
    },
    onSuccess: ({ connectorLabel }) => {
      appendTextMessage('system', chatText(
        `${connectorLabel} connection finished. Checking this order again from the original chat.`,
        `${connectorLabel}接続が完了しました。元のチャットでこのオーダーを再確認します。`,
        state.chatMessages[0]?.body || state.conversationLanguage
      ), { label: 'Connector' });
      state.authorityNoticeKeys.clear();
    },
    refreshAuth,
    afterRefresh: async () => {
      if (state.orderId) {
        try {
          const job = await fetchVisibleJob(state.orderId);
          maybeRenderAuthorityNotice(job, { label: 'Approval required' });
          if (jobHasDeliveryResult(job)) renderDeliveryOnce(job, { force: true });
          else {
            resumeLiveProgress(job.id || state.orderId);
            startPolling(job.id || state.orderId);
          }
        } catch {
          startDeliveryBackfillLoop({ maxRuns: 6, renderTerminalDeliveries: false });
        }
      } else {
        startDeliveryBackfillLoop({ maxRuns: 6, renderTerminalDeliveries: false });
      }
    }
  });
}

function handleChatOAuthPopupReturn() {
  return connectorGateHandleOAuthPopupReturn();
}

els.composer.addEventListener('submit', async (event) => {
  event.preventDefault();
  const prompt = String(els.promptInput.value || '').trim();
  if (!prompt) return;
  rememberConversationLanguage(prompt);
  els.promptInput.value = '';
  appendTextMessage('user', prompt);
  setBusy(true);
  try {
    const libraryScope = libraryCommandScope(prompt);
    const appCommandId = directAppCommandId(prompt);
    if (libraryScope) {
      await appendUsageLibrary(libraryScope);
    } else if (appCommandId) {
      openAppAgent(appCommandId, { source: 'chat_command' });
    } else if (/^(send|send order|発注|注文|実行)$/i.test(prompt) && state.draft) {
      await sendOrder();
    } else if (handlePromptInjectionInput(prompt)) {
      // blocked before intent classification, draft adjustment, or dispatch prep
    } else if (await handleRetryCommand(prompt)) {
      // prepared an exact retry draft from the latest terminal order
    } else if (await showDeliveryHistoryForPrompt(prompt)) {
      // displayed existing delivery/history instead of preparing a new order
    } else if (handleNonOrderConversation(prompt)) {
      // handled as chat, not a work order
    } else if (state.pendingIntake) {
      await answerPendingIntake(prompt);
    } else if (activeOrderFollowupAllowedText(prompt) && await prepareFollowupForRunningOrder(prompt)) {
      // prepared as an add-on request attached to the running order
    } else if (state.draft) {
      addChatAdjustmentToDraft(prompt);
    } else if (await handleChatIntentWithLlm(prompt)) {
      // OpenAI classified this as chat, clarification, or an order-ready brief.
    } else {
      await prepareOrder(prompt, { skipOpenAiIntent: true });
    }
  } catch (error) {
    appendTextMessage('assistant', orderErrorMessage(error), { tone: 'error' });
  } finally {
    setBusy(false);
  }
});

window.addEventListener('message', (event) => {
  if (event.origin !== window.location.origin) return;
  const data = event.data && typeof event.data === 'object' ? event.data : {};
  if (data.type === 'cait-oauth-return') {
    void handleOAuthPopupReturnMessage(data);
    return;
  }
  handleCaitAppContextMessage(data, { origin: event.origin });
});

document.addEventListener('click', (event) => {
  connectorGateHandleOAuthLinkClick(event, {
    saveOAuthState: saveChatOAuthReturnState,
    openOAuthPopup: openChatOAuthPopup,
    fallbackReturnPath: CHATUX_RETURN_PATH
  });
}, { capture: true });

els.authStatus?.addEventListener('click', (event) => {
  if (event.target.closest('[data-chat-logout]')) void signOut();
});

els.chatThread.addEventListener('click', async (event) => {
  const agentRunButton = event.target.closest('[data-agent-run-open]');
  if (agentRunButton) {
    event.preventDefault();
    await openAgentRunDetail(agentRunButton);
    return;
  }
  const appOpenButton = event.target.closest('[data-app-agent-open]');
  if (appOpenButton) {
    openAppAgent(appOpenButton.dataset.appAgentOpen || '', { source: 'chat_library_button' });
    return;
  }
  const appReuseButton = event.target.closest('[data-app-agent-reuse]');
  if (appReuseButton) {
    setBusy(true);
    try {
      await reuseAppAgent(appReuseButton.dataset.appAgentReuse || '');
    } catch (error) {
      appendTextMessage('assistant', orderErrorMessage(error), { tone: 'error', label: 'Library' });
    } finally {
      setBusy(false);
    }
    return;
  }
  const aiAgentReuseButton = event.target.closest('[data-ai-agent-reuse]');
  if (aiAgentReuseButton) {
    setBusy(true);
    try {
      await reuseAiAgent(aiAgentReuseButton.dataset.aiAgentReuse || '');
    } catch (error) {
      appendTextMessage('assistant', orderErrorMessage(error), { tone: 'error', label: 'Library' });
    } finally {
      setBusy(false);
    }
    return;
  }
  const appHandoffButton = event.target.closest('[data-app-agent-handoff]');
  if (appHandoffButton) {
    event.preventDefault();
    const appId = String(appHandoffButton.dataset.appAgentHandoff || '').trim();
    const transferId = String(appHandoffButton.dataset.appTransferId || '').trim();
    const { manifest, payload, contractError, missing } = chatAppHandoffController.prepareAppHandoffPayload(appId, transferId, appHandoffButton);
    if (missing) {
      appendTextMessage('assistant', 'The app handoff context is no longer available. Reload the delivery or run the order again.', { tone: 'error', label: 'App handoff' });
      return;
    }
    if (contractError) {
      appendTextMessage('assistant', contractError, { tone: 'error', label: 'App handoff' });
      return;
    }
    setBusy(true);
    try {
      const handoffUrl = await createAppAgentHandoffUrl(appId, payload);
      if (!handoffUrl) throw new Error(`${manifest.name || 'App'} does not have an entry URL or handoff URL.`);
      appHandoffRememberDetails(appId, payload, handoffUrl, 'generic_app_handoff');
      window.open(handoffUrl, '_blank', 'noopener,noreferrer');
      appendTextMessage('system', `Sent CAIt transfer context to ${manifest.name || 'the registered app'} and opened the handoff URL.`, { label: 'App handoff' });
    } catch (error) {
      try {
        const contextUrl = await createAppAgentContextOpenUrl(appId, payload);
        appHandoffRememberDetails(appId, payload, contextUrl, 'generic_app_context_fallback');
        window.open(contextUrl, '_blank', 'noopener,noreferrer');
        appendTextMessage('assistant', `${manifest.name || 'App'} handoff API failed, so I created a server-side CAIt app context and opened the app with only the context id/token in the URL.\n\n${String(error?.message || error || '')}`, { tone: 'warn', label: 'App handoff' });
      } catch (fallbackError) {
        appendTextMessage('assistant', `${String(error?.message || error || 'App handoff failed.')}\n\nFallback also failed: ${String(fallbackError?.message || fallbackError || 'unknown error')}`, { tone: 'error', label: 'App handoff' });
      }
    } finally {
      setBusy(false);
    }
    return;
  }
  const appTransferCopyButton = event.target.closest('[data-app-transfer-copy]');
  if (appTransferCopyButton) {
    const card = appTransferCopyButton.closest('[data-app-transfer-edit-root]');
    const textarea = card?.querySelector('[data-app-transfer-editable="text"]');
    const text = String(textarea?.value || '').trim();
    void copyTextToClipboard(text)
      .then(() => appendTextMessage('system', 'Copied handoff text.'))
      .catch(() => appendTextMessage('assistant', 'Could not copy the handoff text.', { tone: 'error', label: 'App handoff' }));
    return;
  }
  const fileButton = event.target.closest('[data-file-action]');
  if (fileButton) {
    const file = getDeliveryFile(fileButton.dataset.fileId || '');
    if (!file) {
      appendTextMessage('system', 'This file is no longer available in the chat buffer.');
      return;
    }
    const action = String(fileButton.dataset.fileAction || '').trim();
    if (action === 'download') {
      downloadTextFile(file);
      appendTextMessage('system', `Downloaded ${file.name}.`);
    } else if (action === 'copy') {
      void copyTextToClipboard(file.content)
        .then(() => appendTextMessage('system', `Copied ${file.name}.`))
        .catch(() => appendTextMessage('assistant', `Could not copy ${file.name}. Use Download instead.`, { tone: 'error' }));
    }
    return;
  }
  const orderApproveButton = event.target.closest('[data-chat-order-approve]');
  if (orderApproveButton) {
    const orderId = String(orderApproveButton.dataset.chatOrderApprove || '').trim();
    if (!orderId) return;
    await approveAndResumeOrder(orderId);
    return;
  }
  const orderOpenButton = event.target.closest('[data-chat-order-open]');
  if (orderOpenButton) {
    const orderId = String(orderOpenButton.dataset.chatOrderOpen || '').trim();
    if (!orderId) return;
    setBusy(true);
    try {
      const job = await fetchVisibleJob(orderId, { force: true });
      if (!job?.id) throw new Error('Order was not found.');
      rememberTrackedOrder(job.id);
      maybeRenderAuthorityNotice(job, { label: 'Approval required' });
      appendOrderStatusCheck(job);
      if (jobHasDeliveryResult(job)) {
        renderDeliveryOnce(job, { force: true });
      } else {
        notifyOrderMilestone(job);
        resumeLiveProgress(job.id);
        startPolling(job.id);
      }
    } catch (error) {
      appendTextMessage('assistant', orderErrorMessage(error), { tone: 'error', label: 'Order history' });
    } finally {
      setBusy(false);
    }
    return;
  }
  const orderRetryButton = event.target.closest('[data-chat-order-retry]');
  if (orderRetryButton) {
    const orderId = String(orderRetryButton.dataset.chatOrderRetry || '').trim();
    await prepareRetryFromOrder(orderId, { reuseArtifacts: selectedRetryReuseArtifactsForOrder(orderId) });
    return;
  }
  const orderScheduleButton = event.target.closest('[data-chat-order-schedule]');
  if (orderScheduleButton) {
    const orderId = String(orderScheduleButton.dataset.chatOrderSchedule || '').trim();
    if (orderId) {
      try {
        await fetchVisibleJob(orderId);
      } catch {}
    }
    await showSchedulePanel();
    return;
  }
  if (await handleIntakeThreadClick(event)) return;
  const button = event.target.closest('[data-chat-action]');
  if (!button) return;
  const action = String(button.dataset.chatAction || '').trim();
  if (action === 'send-order') {
    void sendOrder();
  } else if (action === 'reset-chat') {
    resetChat();
  } else if (action === 'keep-leader') {
    setBusy(true);
    void resolvePendingLeaderChange(false)
      .catch((error) => appendTextMessage('assistant', orderErrorMessage(error), { tone: 'error', label: 'Leader choice' }))
      .finally(() => setBusy(false));
  } else if (action === 'switch-leader') {
    setBusy(true);
    void resolvePendingLeaderChange(true, button.dataset.leaderTask || '')
      .catch((error) => appendTextMessage('assistant', orderErrorMessage(error), { tone: 'error', label: 'Leader choice' }))
      .finally(() => setBusy(false));
  }
});

els.chatThread.addEventListener('keydown', (event) => {
  handleIntakeOtherInputKeydown(event);
});

els.utilityModalBody?.addEventListener('change', async (event) => {
  const select = event.target.closest('[data-chat-ui-language]');
  if (!select) return;
  const next = normalizeUiLanguage(select.value, 'en');
  const status = els.utilityModalBody?.querySelector('[data-ui-language-status]');
  if (status) status.textContent = chatUiText('Saving language...', '言語を保存しています...');
  try {
    const savedLanguage = await saveChatUiLanguagePreference(next);
    if (utilityModalIsOpen('Info')) {
      showInfoPanel(savedLanguage === 'ja' ? '言語を保存しました。' : 'Language saved.');
    }
  } catch (error) {
    if (status) status.textContent = orderErrorMessage(error);
  }
});

els.utilityModalBody?.addEventListener('click', async (event) => {
  const logoutButton = event.target.closest('[data-chat-logout]');
  if (logoutButton) {
    await signOut();
    return;
  }
  const openJobButton = event.target.closest('[data-utility-open-job]');
  if (openJobButton) {
    const jobId = String(openJobButton.dataset.utilityOpenJob || '').trim();
    if (jobId) {
      rememberTrackedOrder(jobId);
      closeUtilityModal();
      appendTextMessage('system', `Reopened order ${jobId.slice(0, 8)} from history.`);
      setBusy(true);
      try {
        const job = await fetchVisibleJob(jobId, { force: true });
        state.orderId = job?.id || jobId;
        if (jobHasDeliveryResult(job)) renderDeliveryOnce(job, { force: true });
        else startPolling(jobId);
      } catch {
        startPolling(jobId);
      } finally {
        setBusy(false);
      }
    }
    return;
  }
  const openChatSessionButton = event.target.closest('[data-utility-chat-session-open]');
  if (openChatSessionButton) {
    const sessionId = String(openChatSessionButton.dataset.utilityChatSessionOpen || '').trim();
    if (sessionId) {
      closeUtilityModal();
      loadChatSession(sessionId);
    }
    return;
  }
  const loadMoreButton = event.target.closest('[data-utility-load-more]');
  if (loadMoreButton) {
    await loadMoreUtilityCatalog(String(loadMoreButton.dataset.utilityLoadMore || '').trim());
    return;
  }
  const recurringStatusButton = event.target.closest('[data-recurring-status]');
  if (recurringStatusButton) {
    setBusy(true);
    try {
      await updateRecurringOrderStatus(recurringStatusButton.dataset.recurringStatus || '', recurringStatusButton.dataset.status || 'paused');
    } catch (error) {
      appendTextMessage('assistant', orderErrorMessage(error), { tone: 'error', label: 'Schedules' });
    } finally {
      setBusy(false);
    }
    return;
  }
  const recurringCancelButton = event.target.closest('[data-recurring-cancel]');
  if (recurringCancelButton) {
    setBusy(true);
    try {
      await cancelRecurringOrder(recurringCancelButton.dataset.recurringCancel || '');
    } catch (error) {
      appendTextMessage('assistant', orderErrorMessage(error), { tone: 'error', label: 'Schedules' });
    } finally {
      setBusy(false);
    }
    return;
  }
  const appContextLoadButton = event.target.closest('[data-app-context-load]');
  if (appContextLoadButton) {
    setBusy(true);
    try {
      await loadAppContextIntoChat(appContextLoadButton.dataset.appContextLoad || '');
    } catch (error) {
      appendTextMessage('assistant', orderErrorMessage(error), { tone: 'error', label: 'App context' });
    } finally {
      setBusy(false);
    }
    return;
  }
  const agentTaskButton = event.target.closest('[data-utility-agent-task]');
  if (agentTaskButton) {
    const task = String(agentTaskButton.dataset.utilityAgentTask || '').trim();
    const agentId = String(agentTaskButton.dataset.utilityAgentId || '').trim();
    const agentName = String(agentTaskButton.dataset.utilityAgentName || '').trim();
    if (task) {
      closeUtilityModal();
      const label = agentName || taskLabel(task);
      const prompt = `Use the selected worker "${label}" (${agentId || task}) for the next order.`;
      appendTextMessage('assistant', chatText(
        `I will prepare an order in chat using ${label}.`,
        `I will prepare an order in chat using ${label}.`,
        prompt
      ), { label: 'Workers' });
      setBusy(true);
      try {
        await prepareOrder(prompt, {
          originalPrompt: prompt,
          taskType: task,
          selectedAgentId: agentId,
          selectedAgentName: label
        });
      } catch (error) {
        appendTextMessage('assistant', orderErrorMessage(error), { tone: 'error', label: 'Workers' });
      } finally {
        setBusy(false);
      }
    }
    return;
  }
  const appOpenButton = event.target.closest('[data-app-agent-open]');
  if (appOpenButton) {
    openAppAgent(appOpenButton.dataset.appAgentOpen || '', { source: 'utility_apps_panel' });
    return;
  }
  const appReuseButton = event.target.closest('[data-app-agent-reuse]');
  if (appReuseButton) {
    setBusy(true);
    try {
      await reuseAppAgent(appReuseButton.dataset.appAgentReuse || '');
      closeUtilityModal();
    } catch (error) {
      appendTextMessage('assistant', orderErrorMessage(error), { tone: 'error', label: 'Library' });
    } finally {
      setBusy(false);
    }
    return;
  }
  const aiAgentReuseButton = event.target.closest('[data-ai-agent-reuse]');
  if (aiAgentReuseButton) {
    setBusy(true);
    try {
      await reuseAiAgent(aiAgentReuseButton.dataset.aiAgentReuse || '');
      closeUtilityModal();
    } catch (error) {
      appendTextMessage('assistant', orderErrorMessage(error), { tone: 'error', label: 'Library' });
    } finally {
      setBusy(false);
    }
  }
});

els.utilityModalBody?.addEventListener('submit', async (event) => {
  const form = event.target.closest('[data-schedule-create]');
  if (!form) return;
  event.preventDefault();
  setBusy(true);
  try {
    await createScheduleFromForm(form);
  } catch (error) {
    const message = orderErrorMessage(error);
    appendTextMessage('assistant', message, { tone: 'error', label: 'Schedules' });
    if (utilityModalIsOpen('Schedules')) openUtilityModal('Schedules', schedulePanelHtml(message));
  } finally {
    setBusy(false);
  }
});

els.openChatListBtn?.addEventListener('click', () => {
  closeChatHeaderMenu();
  state.chatSidebarOpen = !state.chatSidebarOpen;
  renderChatSessionSidebar();
  void refreshChatSessionHistory({ force: true });
  if (els.chatSessionSidebar && window.matchMedia('(min-width: 721px)').matches) {
    els.chatSessionSidebar.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
});

els.newChatBtn?.addEventListener('click', () => {
  if (state.polling) window.clearInterval(state.polling);
  if (state.deliveryBackfill) window.clearInterval(state.deliveryBackfill);
  if (state.oauthPopupMonitor) window.clearInterval(state.oauthPopupMonitor);
  state.polling = null;
  state.deliveryBackfill = null;
  state.oauthPopupMonitor = null;
  startNewChatSession();
  setBusy(false);
});

els.chatSessionList?.addEventListener('click', (event) => {
  const deleteButton = event.target.closest('[data-chat-session-delete]');
  if (deleteButton) {
    deleteChatSession(deleteButton.dataset.chatSessionDelete || '');
    return;
  }
  const sessionButton = event.target.closest('[data-chat-session-id]');
  if (sessionButton) loadChatSession(sessionButton.dataset.chatSessionId || '');
});

els.openScheduleBtn?.addEventListener('click', () => {
  closeChatHeaderMenu();
  void showSchedulePanel();
});

els.openScheduleComposerBtn?.addEventListener('click', () => {
  void showSchedulePanel();
});

els.openWorkerListBtn?.addEventListener('click', () => {
  closeChatHeaderMenu();
  void showWorkerListPanel();
});

els.openAppListBtn?.addEventListener('click', () => {
  closeChatHeaderMenu();
  void showAppListPanel();
});
els.openInfoBtn?.addEventListener('click', () => {
  closeChatHeaderMenu();
  showInfoPanel();
});
els.utilityModalCloseBtn?.addEventListener('click', closeUtilityModal);
els.utilityModal?.addEventListener('click', (event) => {
  if (event.target?.closest?.('[data-utility-close]')) closeUtilityModal();
});
document.addEventListener('click', (event) => {
  if (!els.chatHeaderMenu?.open) return;
  if (event.target?.closest?.('#chatHeaderMenu')) return;
  closeChatHeaderMenu();
});
document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  if (els.utilityModal && !els.utilityModal.hidden) closeUtilityModal();
  closeChatHeaderMenu();
});

els.promptInput?.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter' || (!event.ctrlKey && !event.metaKey) || event.isComposing) return;
  event.preventDefault();
  if (!state.busy) els.composer.requestSubmit();
});

els.resetBtn.addEventListener('click', resetChat);
window.addEventListener('beforeunload', () => {
  saveChatRuntimeState('runtime_beforeunload');
});

setChatUiLanguage(state.uiLanguage, { persist: false });
renderActiveLeaderStatus();
updateComposerMode();
renderChatSessionSidebar();
startAppContextBroadcastListener();
if (!handleChatOAuthPopupReturn()) {
  const restoredFromOAuth = restoreChatOAuthReturnStateFromUrl();
  if (shouldStartFreshChatFromUrl()) {
    startNewChatSession();
  } else if (!restoredFromOAuth && !chatRestoreRequestFromUrl().requested) {
    restoreChatRuntimeState();
  }
  void hydrateAppContextFromUrl();
  void refreshChatSessionHistory({ force: true }).then(() => {
    restoreRequestedChatSessionFromHistory();
  });
  void refreshAuth();
  window.setTimeout(ensureAuthRefreshProgress, 8000);
}
