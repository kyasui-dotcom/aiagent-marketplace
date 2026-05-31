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

const state = createInitialChatState({
  uiLanguage: initialChatUiLanguage({
    safeLocalStorageGet,
    documentElementLang: document.documentElement?.lang || ''
  })
});

function leaderCatalogChatAnswer(prompt = '') {
  return buildLeaderCatalogChatAnswer(prompt, chatLanguage);
}

const agentMapRunStore = new Map();
let agentMapRunKeyCounter = 0;
const processedAppContextIds = new Set();
let appContextBroadcastChannel = null;
let chatRuntimeStateController = null;
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

function looksJapanese(value = '') {
  return /[\u3040-\u30ff\u3400-\u9fff]/.test(String(value || ''));
}

function chatLanguage(sample = '') {
  return chatUiLanguage();
}

function chatText(en, ja, sample = '') {
  return chatLanguage(sample) === 'ja' ? ja : en;
}

function chatUiLanguage() {
  return normalizeUiLanguage(state.uiLanguage || document.documentElement?.lang || '', 'en');
}

function chatUiText(en, ja) {
  return chatUiLanguage() === 'ja' ? ja : en;
}

function chatWelcomeText() {
  return chatUiText(CHATUX_WELCOME_TEXT, CHATUX_WELCOME_TEXT_JA);
}

function syncDocumentUiLanguage() {
  const language = chatUiLanguage();
  if (document.documentElement) document.documentElement.lang = language;
  return language;
}

function refreshDefaultWelcomeMessage() {
  const firstMessage = els.chatThread?.querySelector('.message.assistant .message-body');
  if (!firstMessage) return;
  const current = String(firstMessage.textContent || '').trim();
  if (current === CHATUX_WELCOME_TEXT || current === CHATUX_WELCOME_TEXT_JA) {
    firstMessage.textContent = chatWelcomeText();
  }
}

function setChatUiLanguage(value = '', options = {}) {
  const next = normalizeUiLanguage(value, 'en');
  state.uiLanguage = next;
  syncDocumentUiLanguage();
  if (options.persist !== false) safeLocalStorageSet(CHATUX_UI_LANGUAGE_STORAGE_KEY, next);
  refreshDefaultWelcomeMessage();
  updateComposerMode();
  return next;
}

function detectedInputLanguage(sample = '') {
  return looksJapanese(sample) ? 'ja' : 'en';
}

function rememberConversationLanguage(sample = '') {
  if (!state.conversationLanguage && String(sample || '').trim()) {
    state.conversationLanguage = detectedInputLanguage(sample);
  }
  return state.conversationLanguage || chatLanguage(sample);
}

function unsafeApiMethod(method = 'GET') {
  return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(String(method || 'GET').toUpperCase());
}

function csrfRequiredApiError(error = {}) {
  const status = Number(error?.status || 0);
  const message = String(error?.data?.error || error?.message || '').toLowerCase();
  return status === 403 && message.includes('csrf');
}

async function refreshAuthForUnsafeWrite(options = {}) {
  try {
    await refreshAuth({
      maxAttempts: Math.max(1, Math.min(5, Number(options.maxAttempts || 3) || 3)),
      scheduleRetry: false
    });
  } catch {
    // The write request below will surface the real error if auth refresh is unavailable.
  }
  return Boolean(state.auth?.csrfToken);
}

async function api(path, options = {}) {
  const method = String(options.method || 'GET').toUpperCase();
  const needsCsrf = unsafeApiMethod(method);
  const originalHeaders = new Headers(options.headers || {});
  const explicitCsrfHeader = originalHeaders.has('x-aiagent2-csrf');
  let lastError = null;
  const attempts = needsCsrf && !explicitCsrfHeader ? 2 : 1;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    if (needsCsrf && !explicitCsrfHeader && (!state.auth?.csrfToken || attempt > 1)) {
      await refreshAuthForUnsafeWrite({ maxAttempts: attempt > 1 ? 4 : 2 });
    }
    const headers = new Headers(options.headers || {});
    if (!headers.has('content-type')) headers.set('content-type', 'application/json');
    if (needsCsrf && !explicitCsrfHeader && state.auth?.csrfToken) {
      headers.set('x-aiagent2-csrf', state.auth.csrfToken);
    }
    if (state.visitorId) headers.set('x-aiagent2-visitor-id', state.visitorId);
    const timeoutMs = Math.max(0, Number(options.attemptTimeoutMs || options.timeoutMs || 0) || 0);
    const controller = timeoutMs && !options.signal ? new AbortController() : null;
    const timeout = controller ? window.setTimeout(() => controller.abort(), timeoutMs) : null;
    try {
      const response = await fetch(path, {
        ...options,
        method,
        headers,
        credentials: 'same-origin',
        ...(controller ? { signal: controller.signal } : {})
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const error = new Error(String(data?.error || `Request failed (${response.status})`));
        error.status = response.status;
        error.data = data;
        throw error;
      }
      return data;
    } catch (error) {
      if (error?.name === 'AbortError') {
        const timeoutError = new Error(`Request timed out (${timeoutMs}ms)`);
        timeoutError.status = 0;
        timeoutError.data = { error: 'request_timeout', timeout_ms: timeoutMs };
        throw timeoutError;
      }
      lastError = error;
      if (attempt < attempts && csrfRequiredApiError(error)) continue;
      throw error;
    } finally {
      if (timeout) window.clearTimeout(timeout);
    }
  }
  throw lastError || new Error('Request failed');
}

function apiRetryableError(error = {}, statuses = []) {
  const status = Number(error?.status || 0);
  if (!status) return true;
  return (statuses.length ? statuses : [408, 429, 500, 502, 503, 504]).includes(status);
}

function apiRetryDelay(error = {}, attempt = 1, options = {}) {
  const retryAfter = Number(error?.data?.retry_after || error?.data?.retryAfter || 0);
  const maxDelayMs = Math.max(500, Number(options.maxDelayMs || 8000) || 8000);
  if (Number.isFinite(retryAfter) && retryAfter > 0) return Math.min(maxDelayMs, retryAfter * 1000);
  return Math.min(maxDelayMs, Math.max(500, Number(options.baseDelayMs || 1000) || 1000) * Math.max(1, attempt));
}

async function apiWithRetry(path, options = {}, retryOptions = {}) {
  const maxAttempts = Math.max(1, Math.min(8, Number(retryOptions.maxAttempts || 1) || 1));
  const retryStatuses = Array.isArray(retryOptions.retryStatuses) ? retryOptions.retryStatuses : [];
  let lastError = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await api(path, options);
    } catch (error) {
      lastError = error;
      if (attempt >= maxAttempts || !apiRetryableError(error, retryStatuses)) throw error;
      await sleep(apiRetryDelay(error, attempt, retryOptions));
    }
  }
  throw lastError || new Error('Request failed');
}

function accountSettingsUiLanguage(payload = {}) {
  return normalizeUiLanguage(payload?.account?.profile?.uiLanguage || payload?.profile?.uiLanguage || '', '');
}

async function refreshUiLanguageFromAccount(options = {}) {
  const loggedIn = Boolean(state.auth?.loggedIn || state.auth?.login || state.auth?.user);
  if (!loggedIn) return chatUiLanguage();
  const force = options.force === true;
  if (!force && state.uiLanguageSettingsFetchedAt && Date.now() - state.uiLanguageSettingsFetchedAt < 60_000) {
    return chatUiLanguage();
  }
  if (state.uiLanguageSettingsRequest) return state.uiLanguageSettingsRequest;
  state.uiLanguageSettingsRequest = api('/api/settings', { method: 'GET', timeoutMs: 8000 })
    .then((result) => {
      const savedLanguage = accountSettingsUiLanguage(result);
      state.uiLanguageSettingsFetchedAt = Date.now();
      if (savedLanguage) setChatUiLanguage(savedLanguage);
      return chatUiLanguage();
    })
    .catch(() => chatUiLanguage())
    .finally(() => {
      state.uiLanguageSettingsRequest = null;
    });
  return state.uiLanguageSettingsRequest;
}

async function saveChatUiLanguagePreference(value = '') {
  const next = setChatUiLanguage(value);
  const loggedIn = Boolean(state.auth?.loggedIn || state.auth?.login || state.auth?.user);
  if (!loggedIn) return next;
  const result = await api('/api/settings/profile', {
    method: 'POST',
    body: JSON.stringify({ uiLanguage: next }),
    timeoutMs: 8000
  });
  state.uiLanguageSettingsFetchedAt = Date.now();
  const savedLanguage = accountSettingsUiLanguage(result);
  if (savedLanguage) setChatUiLanguage(savedLanguage);
  return chatUiLanguage();
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

function utilityEmptyHtml(message = 'Nothing to show yet.') {
  return `<div class="utility-empty">${escapeHtml(message)}</div>`;
}

function shortDateTime(value = '') {
  const ms = Date.parse(String(value || ''));
  if (!Number.isFinite(ms)) return '';
  return new Date(ms).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function openUtilityModal(title = 'Panel', body = '') {
  if (!els.utilityModal || !els.utilityModalTitle || !els.utilityModalBody) return;
  els.utilityModalTitle.textContent = title;
  els.utilityModalBody.innerHTML = body || utilityEmptyHtml();
  els.utilityModal.hidden = false;
}

function utilityModalIsOpen(title = '') {
  return Boolean(els.utilityModal && !els.utilityModal.hidden && els.utilityModalTitle?.textContent === title);
}

function closeUtilityModal() {
  if (!els.utilityModal) return;
  els.utilityModal.hidden = true;
}

function closeChatHeaderMenu() {
  if (els.chatHeaderMenu) els.chatHeaderMenu.open = false;
}

function jobUtilityRows(jobs = []) {
  const rows = (Array.isArray(jobs) ? jobs : []).filter((job) => job?.id).slice(0, 30).map((job) => {
    const task = taskLabel(job.taskType || job.workflowTask || 'work');
    const meta = [
      statusLabel(job),
      shortDateTime(job.createdAt || job.updatedAt || job.completedAt),
      job.id ? `#${String(job.id).slice(0, 8)}` : ''
    ].filter(Boolean).join(' / ');
    const summary = compact(job.output?.summary || job.output?.report?.summary || job.failureReason || job.prompt || '', 180);
    return [
      '<div class="utility-row">',
      '<div class="utility-main">',
      `<strong>${escapeHtml(task)}</strong>`,
      `<span class="utility-meta">${escapeHtml(meta)}</span>`,
      summary ? `<span>${escapeHtml(summary)}</span>` : '',
      '</div>',
      '<div class="utility-actions">',
      `<button class="ghost-btn file-action" type="button" data-utility-open-job="${escapeHtml(job.id)}">Open</button>`,
      '</div>',
      '</div>'
    ].filter(Boolean).join('\n');
  });
  return rows.length ? `<div class="utility-list">${rows.join('\n')}</div>` : utilityEmptyHtml('No chat orders are visible yet.');
}

function chatSessionUtilityRows(sessions = []) {
  const rows = (Array.isArray(sessions) ? sessions : [])
    .map(normalizeChatSession)
    .filter(Boolean)
    .sort((left, right) => String(right.updatedAt || '').localeCompare(String(left.updatedAt || '')))
    .slice(0, 80)
    .map((session) => {
      const messageCount = Array.isArray(session.messages) ? session.messages.length : 0;
      const orderCount = new Set([
        session.linkedOrderId,
        ...(Array.isArray(session.relatedOrderIds) ? session.relatedOrderIds : []),
        ...(Array.isArray(session.activeJobIds) ? session.activeJobIds : [])
      ].map((item) => String(item || '').trim()).filter(Boolean)).size;
      const meta = [
        chatSessionTimeLabel(session.updatedAt || session.createdAt),
        messageCount ? `${messageCount} message${messageCount === 1 ? '' : 's'}` : '',
        orderCount ? `${orderCount} related order${orderCount === 1 ? '' : 's'}` : '',
        session.activeWork ? 'live order' : ''
      ].filter(Boolean).join(' / ');
      const preview = compact((Array.isArray(session.messages) ? session.messages.find((message) => message.role === 'assistant')?.body : '') || session.messages?.[0]?.body || '', 180);
      return [
        '<div class="utility-row">',
        '<div class="utility-main">',
        `<strong>${escapeHtml(session.title || 'Chat')}</strong>`,
        meta ? `<span class="utility-meta">${escapeHtml(meta)}</span>` : '',
        preview ? `<span>${escapeHtml(preview)}</span>` : '',
        '</div>',
        '<div class="utility-actions">',
        `<button class="ghost-btn file-action" type="button" data-utility-chat-session-open="${escapeHtml(session.id)}">Open</button>`,
        '</div>',
        '</div>'
      ].filter(Boolean).join('\n');
    });
  return rows.length ? `<div class="utility-list">${rows.join('\n')}</div>` : utilityEmptyHtml('No chat sessions are visible yet.');
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

function agentUtilityRows(agents = []) {
  const rows = (Array.isArray(agents) ? agents : []).filter((agent) => agent?.id).slice(0, 60).map((agent) => {
    const taskTypes = Array.isArray(agent.taskTypes) ? agent.taskTypes : (Array.isArray(agent.task_types) ? agent.task_types : []);
    const primaryTask = String(taskTypes[0] || agent.taskType || '').trim();
    const meta = [
      agent.id,
      taskTypes.slice(0, 4).join(', '),
      agent.status || agent.verificationStatus || ''
    ].filter(Boolean).join(' / ');
    return [
      '<div class="utility-row">',
      '<div class="utility-main">',
      `<strong>${escapeHtml(agent.name || taskLabel(primaryTask) || agent.id)}</strong>`,
      `<span class="utility-meta">${escapeHtml(meta)}</span>`,
      agent.description ? `<span>${escapeHtml(compact(agent.description, 190))}</span>` : '',
      '</div>',
      '<div class="utility-actions">',
      primaryTask ? `<button class="ghost-btn file-action" type="button" data-utility-agent-task="${escapeHtml(primaryTask)}" data-utility-agent-id="${escapeHtml(agent.id)}" data-utility-agent-name="${escapeHtml(agent.name || taskLabel(primaryTask) || agent.id)}">Use</button>` : '',
      '</div>',
      '</div>'
    ].filter(Boolean).join('\n');
  });
  return rows.length ? `<div class="utility-list">${rows.join('\n')}</div>` : utilityEmptyHtml('No workers are visible for this account yet.');
}

function catalogLoadMoreHtml(kind = '', loaded = 0, total = 0, hasMore = false) {
  const safeLoaded = Math.max(0, Number(loaded || 0));
  const safeTotal = Math.max(safeLoaded, Number(total || 0));
  const count = safeTotal > 0 ? `Showing ${safeLoaded} of ${safeTotal}` : `Showing ${safeLoaded}`;
  if (!hasMore) return safeLoaded ? `<div class="utility-more"><span class="utility-meta">${escapeHtml(count)}</span></div>` : '';
  return [
    '<div class="utility-more">',
    `<span class="utility-meta">${escapeHtml(count)}</span>`,
    `<button class="ghost-btn inline-btn file-action" type="button" data-utility-load-more="${escapeHtml(kind)}">Load more</button>`,
    '</div>'
  ].join('\n');
}

function workersPanelHtml(status = '') {
  return [
    '<div class="chat-hint">Use opens a chat order draft with that worker role. Execution still follows normal intake and approval gates.</div>',
    status ? `<div class="chat-hint">${escapeHtml(status)}</div>` : '',
    agentUtilityRows(state.workerAgents),
    catalogLoadMoreHtml('workers', state.workerAgents.length, state.workerAgentsTotal, state.workerAgentsHasMore)
  ].filter(Boolean).join('\n');
}

function appPanelHtml(status = '') {
  const appCount = groupedAppPanelEntries(recentAppAgentEntries()).length;
  const total = appCount;
  return [
    status ? `<div class="chat-hint">${escapeHtml(status)}</div>` : '',
    usageLibraryHtml('apps'),
    catalogLoadMoreHtml('apps', appCount, total, false)
  ].filter(Boolean).join('\n');
}

async function showWorkerListPanel() {
  openUtilityModal('Workers', state.workerAgents.length ? workersPanelHtml('Refreshing worker list...') : utilityEmptyHtml('Loading first 10 workers...'));
  try {
    await refreshWorkerAgents();
    if (utilityModalIsOpen('Workers')) openUtilityModal('Workers', workersPanelHtml());
  } catch (error) {
    if (utilityModalIsOpen('Workers')) {
      openUtilityModal('Workers', state.workerAgents.length ? workersPanelHtml(orderErrorMessage(error)) : utilityEmptyHtml(orderErrorMessage(error)));
    }
  }
}

async function showAppListPanel() {
  openUtilityModal('Apps', appPanelHtml('Loading first 10 registered apps and recent app contexts...'));
  try {
    await Promise.all([
      refreshRegisteredApps(),
      refreshAppContexts()
    ]);
    if (utilityModalIsOpen('Apps')) openUtilityModal('Apps', appPanelHtml());
  } catch (error) {
    if (utilityModalIsOpen('Apps')) {
      openUtilityModal('Apps', appPanelHtml(`Registered apps could not be refreshed. ${orderErrorMessage(error)}`));
    }
  }
}

async function loadAppContextIntoChat(contextId = '') {
  const context = await fetchAppContext(contextId);
  appendMessage('assistant', caitAppContextThreadHtml(context), { label: 'App context', tone: 'ok' });
  els.promptInput.value = caitAppContextChatPrompt(context);
  els.promptInput.focus();
  closeUtilityModal();
}

async function loadMoreUtilityCatalog(kind = '') {
  if (kind === 'workers') {
    openUtilityModal('Workers', workersPanelHtml('Loading more workers...'));
    try {
      await refreshWorkerAgents({ offset: state.workerAgents.length, append: true, force: true });
      if (utilityModalIsOpen('Workers')) openUtilityModal('Workers', workersPanelHtml());
    } catch (error) {
      if (utilityModalIsOpen('Workers')) openUtilityModal('Workers', workersPanelHtml(orderErrorMessage(error)));
    }
  } else if (kind === 'apps') {
    openUtilityModal('Apps', appPanelHtml('Loading more apps...'));
    try {
      await refreshRegisteredApps({ offset: state.registeredApps.length, append: true, force: true });
      if (utilityModalIsOpen('Apps')) openUtilityModal('Apps', appPanelHtml());
    } catch (error) {
      if (utilityModalIsOpen('Apps')) openUtilityModal('Apps', appPanelHtml(orderErrorMessage(error)));
    }
  }
}

function showInfoPanel(statusMessage = '') {
  const auth = state.auth || {};
  const login = auth.login || auth.user?.login || auth.user?.email || '';
  const adminAction = auth.isPlatformAdmin || auth.admin ? '<a class="ghost-btn file-action" href="/admin">Admin</a>' : '';
  const uiLanguage = chatUiLanguage();
  const languageStatus = statusMessage
    ? `<span class="utility-meta" data-ui-language-status>${escapeHtml(statusMessage)}</span>`
    : `<span class="utility-meta" data-ui-language-status>${escapeHtml(chatUiText('English is the default. Change this only when you want CAIt UI text in another language.', '既定は英語です。CAItのUI表示を別の言語にしたい場合だけ変更してください。'))}</span>`;
  openUtilityModal('Info', [
    '<div class="utility-list">',
    '<div class="utility-row"><div class="utility-main">',
    `<strong>${escapeHtml(chatUiText('Account', 'アカウント'))}</strong>`,
    `<span class="utility-meta">${escapeHtml(login || 'Not signed in')}</span>`,
    '</div><div class="utility-actions">',
    auth.loggedIn || login ? `${adminAction}<a class="ghost-btn file-action" href="/account-settings.html">${escapeHtml(chatUiText('Account settings', 'アカウント設定'))}</a><button class="ghost-btn file-action" type="button" data-chat-logout>${escapeHtml(chatUiText('Sign out', 'サインアウト'))}</button>` : `<a class="ghost-btn file-action" href="${escapeHtml(loginHref('google'))}">${escapeHtml(chatUiText('Sign in', 'サインイン'))}</a>`,
    '</div></div>',
    '<div class="utility-row"><div class="utility-main">',
    `<strong>${escapeHtml(chatUiText('Language', '言語'))}</strong>`,
    `<label class="utility-field" for="chatUiLanguageSelect"><span>${escapeHtml(chatUiText('Interface language', '表示言語'))}</span><select id="chatUiLanguageSelect" data-chat-ui-language><option value="en"${uiLanguage === 'en' ? ' selected' : ''}>English</option><option value="ja"${uiLanguage === 'ja' ? ' selected' : ''}>Japanese</option></select></label>`,
    languageStatus,
    '</div><div class="utility-actions">',
    `<a class="ghost-btn file-action" href="/account-settings.html">${escapeHtml(chatUiText('Open settings', '設定を開く'))}</a>`,
    '</div></div>',
    `<div class="utility-row"><div class="utility-main"><strong>${escapeHtml(chatUiText('Resources', 'リソース'))}</strong><span class="utility-meta">${escapeHtml(chatUiText('Docs, terms, privacy, and help.', 'ドキュメント、利用規約、プライバシー、ヘルプです。'))}</span></div><div class="utility-actions"><a class="ghost-btn file-action" href="/help.html">${escapeHtml(chatUiText('Help', 'ヘルプ'))}</a><a class="ghost-btn file-action" href="/resources.html">${escapeHtml(chatUiText('Resources', 'リソース'))}</a></div></div>`,
    '</div>'
  ].join('\n'));
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

function makeClientOrderId() {
  try {
    const generated = window.crypto?.randomUUID?.();
    if (generated) return generated;
  } catch {}
  return `client_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeClientOrderId(value = '') {
  return String(value || '').trim();
}

function clientOrderIdFromOrderCreate(source = {}) {
  const input = source?.input && typeof source.input === 'object' ? source.input : {};
  const broker = input._broker && typeof input._broker === 'object' ? input._broker : {};
  return normalizeClientOrderId(
    source?.client_order_id
    || source?.clientOrderId
    || input.client_order_id
    || input.clientOrderId
    || broker.clientOrderId
    || broker.client_order_id
    || ''
  );
}

function orderCreateRequestBody(payload = {}) {
  const {
    _caitRecoveryStartedAt,
    _cait_recovery_started_at,
    _caitRecoveryNoticeShown,
    _caitRecoveryRetried,
    ...body
  } = payload || {};
  return JSON.stringify(body);
}

function normalizeRecoveryText(value = '') {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function recoverySessionId(source = {}) {
  const input = source?.input && typeof source.input === 'object' ? source.input : {};
  const broker = input._broker && typeof input._broker === 'object' ? input._broker : {};
  return String(
    source?.session_id
    || source?.sessionId
    || input.session_id
    || input.sessionId
    || broker.chatSessionId
    || broker.chatux?.visitor_id
    || ''
  ).trim();
}

function recoveryPromptMatches(job = {}, payload = {}) {
  const requested = normalizeRecoveryText(payload?.prompt || '');
  if (!requested) return false;
  const candidates = [
    job.prompt,
    job.originalPrompt,
    job.workflow?.objective
  ].map(normalizeRecoveryText).filter(Boolean);
  return candidates.some((candidate) => (
    candidate === requested
    || (requested.length > 80 && candidate.includes(requested.slice(0, 80)))
    || (candidate.length > 80 && requested.includes(candidate.slice(0, 80)))
  ));
}

function recoveryCandidate(job = {}, payload = {}) {
  if (!job?.id) return false;
  const parentAgent = String(payload?.parent_agent_id || '').trim();
  if (parentAgent && String(job.parentAgentId || '') !== parentAgent) return false;
  const requestedClientOrderId = clientOrderIdFromOrderCreate(payload);
  if (requestedClientOrderId && String(job.id || '').trim() === requestedClientOrderId) return true;
  const createdMs = Date.parse(job.createdAt || job.created_at || '');
  if (!Number.isFinite(createdMs) || Date.now() - createdMs > 10 * 60 * 1000) return false;
  const recoveryStartedRaw = payload?._caitRecoveryStartedAt || payload?._cait_recovery_started_at || 0;
  const recoveryStartedMs = Number(recoveryStartedRaw) || Date.parse(String(recoveryStartedRaw || '')) || 0;
  if (recoveryStartedMs && createdMs < recoveryStartedMs - 15000) return false;
  const requestedSession = recoverySessionId(payload);
  const jobSession = recoverySessionId(job);
  return Boolean(
    recoveryPromptMatches(job, payload)
    || (recoveryStartedMs && requestedSession && jobSession && requestedSession === jobSession)
  );
}

function createdPayloadFromRecoveredJob(job = {}) {
  const isWorkflow = job?.jobKind === 'workflow' || Boolean(job?.workflow);
  const workflow = job?.workflow && typeof job.workflow === 'object' ? job.workflow : null;
  const childRuns = Array.isArray(workflow?.childRuns) ? workflow.childRuns : [];
  return {
    ok: true,
    recovered: true,
    code: 'client_order_create_recovered',
    status: job.status || 'queued',
    mode: isWorkflow ? 'workflow' : (job.status || 'queued'),
    ...(isWorkflow ? { workflow_job_id: job.id } : { job_id: job.id }),
    child_runs: childRuns,
    workflow: workflow || undefined,
    routing_reason: 'Recovered from order history after the create response failed.'
  };
}

async function findRecoveredOrderCreatePayload(payload = {}) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (attempt) await sleep(900 * attempt);
    try {
      const result = await api(`/api/jobs?limit=20&visitor_id=${encodeURIComponent(state.visitorId)}`);
      const recovered = (Array.isArray(result?.jobs) ? result.jobs : [])
        .filter((job) => recoveryCandidate(job, payload))
        .sort((left, right) => {
          const preferWorkflow = (job) => (job?.jobKind === 'workflow' || job?.workflow ? 1 : 0);
          const workflowDiff = preferWorkflow(right) - preferWorkflow(left);
          if (workflowDiff) return workflowDiff;
          return String(right?.createdAt || '').localeCompare(String(left?.createdAt || ''));
        })[0] || null;
      if (recovered?.id) {
        rememberTrackedOrder(recovered.id);
        return createdPayloadFromRecoveredJob(recovered);
      }
    } catch {}
  }
  return null;
}

async function recoverAcceptedOrderAfterCreateError(payload = {}, error = null) {
  const status = Number(error?.status || 0);
  const message = String(error?.message || error || '').toLowerCase();
  const shouldTry = status >= 500 || /failed to fetch|networkerror|load failed|network request failed/.test(message);
  if (!shouldTry) return null;
  if (!payload._caitRecoveryNoticeShown) {
    payload._caitRecoveryNoticeShown = true;
  }
  payload._caitRecoveryStartedAt = payload._caitRecoveryStartedAt || Date.now();
  const recoveredBeforeRetry = await findRecoveredOrderCreatePayload(payload);
  if (recoveredBeforeRetry) return recoveredBeforeRetry;
  const clientOrderId = clientOrderIdFromOrderCreate(payload);
  if (!payload._caitRecoveryRetried && clientOrderId) {
    payload._caitRecoveryRetried = true;
    try {
      return await api('/api/jobs', {
        method: 'POST',
        body: orderCreateRequestBody(payload)
      });
    } catch (retryError) {
      const recoveredAfterRetry = await findRecoveredOrderCreatePayload(payload);
      if (recoveredAfterRetry) return recoveredAfterRetry;
      throw retryError;
    }
  }
  return null;
}

function intakeStoredAnswers(intake = {}) {
  return Array.isArray(intake.stepAnswers)
    ? intake.stepAnswers.filter((item) => item && typeof item === 'object')
    : [];
}

function intakeQuestionList(intake = {}) {
  return (Array.isArray(intake.questions) ? intake.questions : [])
    .map((question) => String(question || '').replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function intakeStepGroups(intake = {}, sample = '') {
  return intakeChoiceGroups(intake, sample)
    .map((group) => ({
      ...group,
      initialChoices: []
    }))
    .filter((group) => group?.id && group?.title);
}

function intakeSteps(intake = {}) {
  const sample = intake.originalPrompt || intake.original_prompt || '';
  const groups = intakeStepGroups(intake, sample);
  if (groups.length) {
    return groups.map((group) => ({
      type: 'choice_group',
      id: group.id,
      title: group.title,
      prompt: group.hint || group.title,
      group
    }));
  }
  return intakeQuestionList(intake).map((question, index) => ({
    type: 'question',
    id: `question-${index + 1}`,
    title: chatText(`Question ${index + 1}`, `質問 ${index + 1}`, sample),
    prompt: question,
    group: null
  }));
}

function intakeCurrentStepIndex(intake = {}) {
  const steps = intakeSteps(intake);
  if (!steps.length) return 0;
  const raw = Number(intake.currentStepIndex ?? intake.current_step_index ?? intake.currentQuestionIndex ?? intake.current_question_index ?? 0);
  const index = Number.isFinite(raw) ? Math.max(0, Math.floor(raw)) : 0;
  return Math.min(index, steps.length - 1);
}

function setIntakeCurrentStepIndex(intake = {}, index = 0) {
  const steps = intakeSteps(intake);
  const nextIndex = Math.max(0, Math.min(Number(index) || 0, Math.max(steps.length - 1, 0)));
  intake.currentStepIndex = nextIndex;
  intake.currentQuestionIndex = nextIndex;
  return nextIndex;
}

function intakeCurrentStep(intake = {}) {
  const steps = intakeSteps(intake);
  if (!steps.length) return null;
  return steps[intakeCurrentStepIndex(intake)] || steps[0] || null;
}

function intakeProgressLine(intake = {}, sample = '') {
  const steps = intakeSteps(intake);
  if (steps.length <= 1) return chatText('Question', '質問', sample);
  const index = intakeCurrentStepIndex(intake);
  return chatText(`Question ${index + 1} of ${steps.length}`, `質問 ${index + 1}/${steps.length}`, sample);
}

function intakeStepAnswerPrompt(intake = {}) {
  const sample = intake.originalPrompt || intake.original_prompt || '';
  return chatText(
    'Choose one or more options, or type a short answer, then send it to continue.',
    '選択肢は複数選べます。短く入力して送信すると次に進みます。',
    sample
  );
}

function intakeStepCardHtml(intake = {}) {
  const step = intakeCurrentStep(intake);
  if (!step?.group) return '';
  return intakeChoiceCardsHtml(intake, intake.originalPrompt || '', {
    groups: [step.group],
    includeInitialChoices: false,
    title: chatText('Answer this item', 'この項目に回答', intake.originalPrompt || ''),
    detail: intakeStepAnswerPrompt(intake),
    footer: chatText(
      'Choices only fill the composer. Work starts only after the final order approval.',
      '選択肢は入力欄に入るだけです。最後の発注承認まで実行されません。',
      intake.originalPrompt || ''
    )
  });
}

function disableRenderedIntakeControls() {
  els.chatThread?.querySelectorAll('[data-intake-choice], [data-intake-other-add], [data-intake-confirmed-edit], [data-intake-confirmed-remove]').forEach((button) => {
    button.disabled = true;
  });
  els.chatThread?.querySelectorAll('[data-intake-other-input]').forEach((input) => {
    input.disabled = true;
  });
}

function appendPendingIntakeStep(options = {}) {
  const intake = state.pendingIntake;
  if (!intake) return;
  const sample = intake.originalPrompt || '';
  const step = intakeCurrentStep(intake);
  if (!step) return;
  const owner = intake.conversationOwner || { type: 'cait', label: 'Intake' };
  const label = owner.type === 'leader' || owner.type === 'agent' ? (owner.label || activeActorLabel('Intake')) : 'Intake';
  const leadLine = options.includeLead === true && (owner.type === 'leader' || owner.type === 'agent')
    ? chatText(
        `${owner.label || 'The selected agent'} will ask one item at a time before dispatch.`,
        `${owner.label || '選択されたエージェント'} が実行前に1項目ずつ確認します。`,
        sample
      )
    : '';
  const dataHint = step.id === 'analytics' && intakeHasMeasurementEvidenceQuestion(intake)
    ? growthLeaderNeedsDataHint(sample)
    : '';
  appendTextMessage('assistant', [
    options.includeMessage === true ? options.message : '',
    leadLine,
    `${intakeProgressLine(intake, sample)}: ${step.title}`,
    step.prompt,
    dataHint,
    intakeStepAnswerPrompt(intake),
    chatText('Nothing has been dispatched yet.', 'まだ実行も課金も発生していません。', sample)
  ].filter(Boolean).join('\n'), { tone: 'ok', label });
  const cardHtml = intakeStepCardHtml(intake);
  if (cardHtml) {
    appendMessage('assistant', cardHtml, { tone: 'ok', label: chatText('Choices', '選択肢', sample) });
  }
}

function recordIntakeStepAnswer(intake = {}, answer = '') {
  const step = intakeCurrentStep(intake);
  const text = String(answer || '').trim();
  if (!step || !text) return;
  const answers = intakeStoredAnswers(intake);
  answers.push({
    id: step.id,
    title: step.title,
    prompt: step.prompt,
    answer: text
  });
  intake.stepAnswers = answers;
}

function intakeCombinedAnswerText(intake = {}, latestAnswer = '') {
  const answers = intakeStoredAnswers(intake);
  if (!answers.length) return String(latestAnswer || '').trim();
  return answers
    .map((entry) => {
      const title = String(entry.title || entry.prompt || 'Answer').trim();
      const answer = String(entry.answer || '').trim();
      return answer ? `- ${title}: ${answer}` : '';
    })
    .filter(Boolean)
    .join('\n')
    .trim();
}

function intakeAnswerLooksLikeCompleteBrief(answer = '', options = {}) {
  const text = String(answer || '').trim();
  if (!text) return false;
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
  if (options.allowLineCount === true && lines.length >= 3) return true;
  if (options.allowRichParagraph === true
    && text.length >= 80
    && /(納品|成果|制約|対象|目標|優先|資料|データ|コネクタ|検証|レビュー|価格|原価|粗利|タイムゾーン|GitHub|repo|repository|Calendar|Gmail|deliver|output|constraint|target|priority|evidence|data)/i.test(text)
    && (text.match(/[。、,.;；]/g) || []).length >= 3) {
    return true;
  }
  const signals = [
    /(?:https?:\/\/|www\.|[a-z0-9-]+\.[a-z]{2,})/i,
    /(ga4|google analytics|search console|サーチコンソール|アナリティクス|sales deck|pricing|資料|LP)/i,
    /(purchase|sales|revenue|inquir|lead|signup|trial|購入|売上|問い合わせ|リード|登録|トライアル)/i,
    /(audience|target|customer|founder|developer|consumer|対象|ターゲット|顧客|ユーザー)/i,
    /(channel|seo|organic|sns|social|ads|広告|自然検索|チャネル)/i,
    /(budget|deadline|constraint|no paid|deliver|checklist|copy|asset|予算|期限|制約|納品|チェックリスト|原稿)/i
  ];
  return signals.filter((pattern) => pattern.test(text)).length >= 3;
}

function startIntake(response = {}, originalPrompt = '') {
  trackChatIntakeStarted(originalPrompt, 'step_intake');
  const explicitLeaderTaskType = explicitLeaderChangeTaskTypeFromText(originalPrompt);
  const requestedLeaderOwner = explicitLeaderTaskType ? leaderOwner(explicitLeaderTaskType, 'User explicitly changed the leader.') : null;
  const lockedOwner = lockedLeaderOwnerForPrompt(originalPrompt, { leaderChangeRequested: Boolean(requestedLeaderOwner) })
    || lockedAgentOwnerForPrompt(originalPrompt, { leaderChangeRequested: Boolean(requestedLeaderOwner) });
  const intakeResponse = requestedLeaderOwner || lockedOwner
    ? withConversationOwner(response, requestedLeaderOwner || lockedOwner, {
        leaderChangeRequested: Boolean(requestedLeaderOwner),
        leader_change_requested: Boolean(requestedLeaderOwner)
      })
    : response;
  state.pendingLeaderChange = null;
  state.pendingIntake = chatEngineBuildIntakeState(intakeResponse, originalPrompt);
  state.pendingIntake.stepAnswers = [];
  setIntakeCurrentStepIndex(state.pendingIntake, 0);
  setConversationOwnerFromPrepared(intakeResponse, {
    sample: originalPrompt,
    leaderChangeRequested: Boolean(requestedLeaderOwner)
  });
  state.draft = null;
  state.draftRevision += 1;
  updateComposerMode();
  appendPendingIntakeStep({
    includeMessage: true,
    includeLead: true,
    message: [
      response.message || 'I need a few more details before preparing or dispatching the order.',
      state.pendingIntake.selectedAgentName ? `Selected worker: ${state.pendingIntake.selectedAgentName}` : ''
    ].filter(Boolean).join('\n')
  });
}

function measurementEvidenceAppManifest() {
  return measurementEvidenceGateAppManifest(appManifestSources());
}

function measurementEvidenceAppId() {
  return measurementEvidenceGateAppId(appManifestSources());
}

function measurementEvidenceAppName() {
  return measurementEvidenceGateAppName(appManifestSources());
}

function growthLeaderNeedsDataHint(sample = '') {
  const appName = measurementEvidenceAppName();
  return chatText(
    `If you have GA4/Search Console, answer "yes, I have GA4" and I will open ${appName} so you can choose the Google account, property, and site. If not, say "skip analytics" and CAIt will proceed with assumptions.`,
    `GA4/Search Console を持っている場合は「GA4あります」と答えてください。${appName} を開き、Googleアカウント、プロパティ、サイトを選べるようにします。使わない場合は「アナリティクスをスキップ」と答えれば、仮説で進めます。`,
    sample
  );
}

function authGrantedGoogleCapabilities() {
  return new Set(listValues(state.auth?.googleGrantedCapabilities || state.auth?.google_granted_capabilities)
    .map((item) => String(item || '').trim().toLowerCase()));
}

function measurementEvidencePreOrderHintHtml(draft = null) {
  const sourceDraft = draft || state.draft || {};
  if (!draftExplicitlyRequestsMeasurementEvidence(sourceDraft)) return '';
  const prompt = sourceDraft.originalPrompt || sourceDraft.prompt || '';
  const appName = measurementEvidenceAppName();
  const status = measurementEvidenceContextStatus(state.draft);
  const granted = authGrantedGoogleCapabilities();
  const googleConnected = granted.has('google.read_ga4') || granted.has('google.read_gsc') || state.auth?.googleLinked || state.auth?.googleAuthorized;
  const explicit = draftExplicitlyRequestsMeasurementEvidence(state.draft || { prompt });
  const title = status.loaded
    ? chatText('Analytics context attached', 'アナリティクス添付済み', prompt)
    : status.skipped
      ? chatText('Analytics skipped by user choice', 'アナリティクスはスキップ指定', prompt)
      : googleConnected
        ? chatText('Connected Google analytics can be attached', '接続済みGoogle分析を添付できます', prompt)
        : chatText('Analytics data requires attachment', 'アナリティクスは添付が必要', prompt);
  const detail = status.loaded
    ? chatText('Loaded GA4/Search Console evidence is attached to this order draft and will be passed to the data layer.', '読み込み済みのGA4/Search Console根拠をこの発注ドラフトに添付済みです。データ層へ渡します。', prompt)
    : status.skipped
      ? chatText('This order will proceed without GA4/Search Console evidence because analytics was skipped for this draft.', 'このドラフトではアナリティクスをスキップしたため、GA4/Search Console根拠なしで進めます。', prompt)
      : googleConnected
        ? chatText(`Google OAuth is already connected. Open ${appName} to choose the GA4 property/Search Console site and send the loaded report back to this draft. OAuth should not be requested again unless a missing scope is selected.`, `Google OAuth は接続済みです。${appName} でGA4プロパティ/Search Consoleサイトを選び、レポートを読み込んでこのドラフトへ戻してください。不足scopeを選ばない限りOAuthを再要求しません。`, prompt)
        : chatText(`Open ${appName}, connect the needed Google source once, choose the property/site, load the report, then send it back to this draft.`, `${appName} を開き、必要なGoogleソースを1回接続して、プロパティ/サイトを選び、レポートを読み込んでこのドラフトへ戻してください。`, prompt);
  const actions = status.loaded || status.skipped
    ? []
    : [
        `<button class="ghost-btn inline-btn" type="button" data-chat-action="app-context-use">${escapeHtml(googleConnected ? chatText('Use connected GA4/Search Console', '接続済みGA4/Search Consoleを使う', prompt) : chatText(`Open ${appName}`, `${appName}を開く`, prompt))}</button>`,
        explicit ? `<button class="ghost-btn inline-btn" type="button" data-chat-action="app-context-skip">${escapeHtml(chatText('Skip analytics for this order', 'この注文ではスキップ', prompt))}</button>` : ''
      ].filter(Boolean);
  return [
    '<div class="preflight-card">',
    `<strong>${escapeHtml(title)}</strong>`,
    `<span>${escapeHtml(detail)}</span>`,
    actions.length ? `<div class="inline-actions">${actions.join('')}</div>` : '',
    '</div>'
  ].filter(Boolean).join('\n');
}

function intakeSourceText(intake = {}, sample = '') {
  return [...new Set([
    sample,
    intake.originalPrompt
  ].map((item) => String(item || '').trim()).filter(Boolean))]
    .join('\n');
}

function compactIntakeText(value = '', maxLength = 140) {
  const text = String(value || '')
    .replace(/\s+/g, ' ')
    .replace(/^[\s:：、。,.]+|[\s、。,.]+$/g, '')
    .trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trim()}…`;
}

function intakeSuggestionLooksLikeQuestion(value = '') {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text) return false;
  return /[?？]$/.test(text)
    || /(教えて|ください|選んで|選択|どれ|どの|何を|何です|ありますか|使いますか|必要ですか|want to|which|what|do you|please|choose|select|provide|tell us)/i.test(text);
}

function intakeInitialAnswerSuggestions(intake = {}, sample = '') {
  const text = intakeSourceText(intake, sample);
  const pick = (en, ja) => chatText(en, ja, sample || intake.originalPrompt || text);
  const result = {};
  const add = (id, value) => {
    const safeValue = compactIntakeText(value);
    if (!id || !safeValue) return;
    if (intakeSuggestionLooksLikeQuestion(safeValue)) return;
    result[id] ||= [];
    if (!result[id].some((item) => item === safeValue)) result[id].push(safeValue);
  };
  const urls = [...new Set((text.match(/(?:https?:\/\/|www\.)[^\s<>"'）)]+|[a-z0-9-]+\.[a-z]{2,}(?:\/[^\s<>"'）)]*)?/gi) || [])
    .map((url) => url.replace(/[、。,.]+$/g, '')))]
    .filter((url) => !/^(?:ga4|seo)$/i.test(url));
  urls.slice(0, 2).forEach((url) => add('service', url));

  const serviceMatch = text.match(/(?:商材|サービス|商品|対象サービス|対象サイト|URL|LP|landing page|product|service|website|site)\s*(?:は|:|：|-)?\s*([^\n。]{3,140})/i);
  if (!urls.length && serviceMatch?.[1]) add('service', serviceMatch[1]);

  if (/(ga4|google analytics|アナリティクス|サーチコンソール|search console).{0,24}(ある|あります|有|使う|使いたい|use|yes|available|持って)/i.test(text)
    || /(ある|あります|有|使う|use|yes|available|持って).{0,24}(ga4|google analytics|アナリティクス|サーチコンソール|search console)/i.test(text)) {
    add('analytics', pick('Use GA4/Search Console', 'GA4/Search Consoleを使う'));
  }
  if (/(アナリティクス|ga4|search console|サーチコンソール).{0,20}(スキップ|不要|なし|使わない|skip|without|no)/i.test(text)) {
    add('analytics', pick('Skip analytics', 'アナリティクスをスキップ'));
  }

  if (/(問い合わせ|問合せ|リード|lead|inquir|contact)/i.test(text)) add('goal', pick('Increase leads/inquiries', '問い合わせ・リード獲得を増やす'));
  if (/(売上|購入|受注|sales|revenue|purchase|order)/i.test(text)) add('goal', pick('Increase sales/revenue', '売上・購入を増やす'));
  if (/(登録|トライアル|signup|sign up|trial|registration)/i.test(text)) add('goal', pick('Increase signups/trials', '登録・トライアルを増やす'));
  if (/(流入|認知|traffic|awareness|brand)/i.test(text)) add('goal', pick('Increase traffic/awareness', '流入・認知を増やす'));

  if (/(経営者|事業責任者|founder|operator|owner|executive)/i.test(text)) add('audience', pick('Founders/operators', '経営者・事業責任者'));
  if (/(マーケ|グロース|marketing|growth)/i.test(text)) add('audience', pick('Marketing/growth teams', 'マーケ・グロース担当'));
  if (/(開発者|技術|developer|engineer|technical)/i.test(text)) add('audience', pick('Developers/technical users', '開発者・技術ユーザー'));
  if (/(一般消費者|consumer|b2c|individual)/i.test(text)) add('audience', pick('General consumers', '一般消費者'));
  const audienceMatch = text.match(/(?:ターゲット|対象ユーザー|誰向け|audience|target)\s*(?:は|:|：|-)?\s*([^\n。]{3,120})/i);
  if (!result.audience?.length && audienceMatch?.[1]) add('audience', audienceMatch[1]);

  if (/(自然検索|seo|organic)/i.test(text)) add('channel', pick('Organic search / SEO', '自然検索・SEO'));
  if (/(リファラル|参照元|referral|referrer)/i.test(text)) add('channel', pick('Referral sites', 'リファラル・参照元サイト'));
  if (/(sns|social|x\/twitter|twitter|ソーシャル)/i.test(text)) add('channel', pick('SNS / social', 'SNS・ソーシャル'));
  if (/(広告|paid|ads|ppc)/i.test(text)) add('channel', pick('Paid ads', '広告'));

  if (/(広告なし|広告無し|オーガニックのみ|no paid ads|organic only|without ads)/i.test(text)) add('constraints', pick('No paid ads / organic only', '広告なし・オーガニックのみ'));
  if (/(低予算|予算少|low budget|cheap|cost)/i.test(text)) add('constraints', pick('Low budget first', '低予算優先'));
  if (/(早く|最短|急ぎ|fast|quick|asap)/i.test(text)) add('constraints', pick('Fast first draft', 'まず早く叩き台'));
  if (/(品質|深さ|quality|deep|depth)/i.test(text)) add('constraints', pick('Depth and quality first', '深さ・品質優先'));

  if (/(レポート|report|分析資料)/i.test(text)) add('deliverable', pick('Strategy report', '分析レポート'));
  if (/(チェックリスト|checklist|todo)/i.test(text)) add('deliverable', pick('Execution checklist', '実行チェックリスト'));
  if (/(原稿|素材|copy|asset|creative)/i.test(text)) add('deliverable', pick('Copy/assets draft', '原稿・素材案'));
  if (/(引き継ぎ|handoff|実装|運用)/i.test(text)) add('deliverable', pick('Implementation handoff', '実装・運用への引き継ぎ'));

  Object.keys(result).forEach((key) => {
    result[key] = result[key].slice(0, 3);
  });
  return result;
}

function seedIntakeInitialChoices(intake = {}, sample = '') {
  intakeChoiceGroups(intake, sample).forEach((group) => {
    (group.initialChoices || []).forEach((choice) => {
      appendIntakeChoiceToComposer(group.title, choice);
    });
  });
}

function intakeChoiceGroups(intake = {}, sample = '') {
  const text = [
    sample,
    intake.originalPrompt,
    intake.taskType,
    intake.activeLeaderTaskType,
    intake.conversationOwner?.taskType,
    ...(Array.isArray(intake.questions) ? intake.questions : [])
  ].join('\n');
  const groups = [];
  const seen = new Set();
  const pick = (en, ja) => chatText(en, ja, sample || intake.originalPrompt || text);
  const pushGroup = (id, titleEn, titleJa, hintEn, hintJa, options = [], config = {}) => {
    if (seen.has(id)) return;
    const normalizedOptions = options
      .filter((option) => option?.id && option?.label)
      .slice(0, 4);
    if (!normalizedOptions.length && config.freeText !== true) return;
    seen.add(id);
    groups.push({
      id,
      title: pick(titleEn, titleJa),
      hint: hintEn || hintJa ? pick(hintEn, hintJa) : '',
      singleChoice: config.singleChoice === true,
      inputPlaceholder: config.inputPlaceholderEn || config.inputPlaceholderJa
        ? pick(config.inputPlaceholderEn || 'Other: type your own answer', config.inputPlaceholderJa || 'その他: 自由に入力')
        : '',
      options: normalizedOptions,
      initialChoices: []
    });
  };

  if (/(product|service|website|site|url|landing page|lp|pricing|商材|サービス|商品|サイト|URL|ＵＲＬ|LP|ランディング|価格|売りたい)/i.test(text)) {
    pushGroup(
      'service',
      'Product/service',
      '対象サービス',
      'Enter the exact product, service, website, or LP CAIt should analyze.',
      '分析対象の商材・サービス名、URL、LPを入力してください。',
      [],
      {
        freeText: true,
        inputPlaceholderEn: 'Service name, website/LP URL, or product notes',
        inputPlaceholderJa: '商材・サービス名、URL、LP、補足'
      }
    );
  }

  if (intakeHasMeasurementEvidenceQuestion(intake)) {
    const appName = measurementEvidenceAppName();
    pushGroup(
      'analytics',
      'Analytics data',
      'アナリティクス',
      `Use ${appName} first, or skip and proceed with assumptions.`,
      `先に${appName}を使うか、仮説で進めるかを選んでください。`,
      [
        { id: 'use', label: pick('Use GA4/Search Console', 'GA4/Search Consoleを使う'), action: 'app-context-use' },
        { id: 'skip', label: pick('Skip analytics', 'アナリティクスをスキップ'), action: 'app-context-skip' }
      ],
      { singleChoice: true }
    );
  }

  if (/(goal|objective|outcome|final action|action should increase|conversion|kpi|sales|revenue|purchase|inquir|lead|signup|trial|traffic|awareness|increase|目的|成果|ゴール|増やしたい行動|コンバージョン|登録|問い合わせ|売上|購入|リード|認知|集客|流入)/i.test(text)) {
    pushGroup(
      'goal',
      'Main goal',
      '主な目的',
      'Choose the outcome CAIt should optimize for.',
      'CAItが優先すべき成果を選んでください。',
      [
        { id: 'leads', label: pick('Increase leads/inquiries', '問い合わせ・リード獲得を増やす') },
        { id: 'sales', label: pick('Increase sales/revenue', '売上・購入を増やす') },
        { id: 'signup', label: pick('Increase signups/trials', '登録・トライアルを増やす') },
        { id: 'awareness', label: pick('Increase traffic/awareness', '流入・認知を増やす') }
      ]
    );
  }

  if (/(audience|target|customer|persona|segment|ユーザー|顧客|ターゲット|誰|ペルソナ|業種|業界)/i.test(text)) {
    pushGroup(
      'audience',
      'Target audience',
      '対象ユーザー',
      'Pick the closest audience. You can edit the text before sending.',
      '近い対象を選んでください。送信前に入力欄で編集できます。',
      [
        { id: 'founders', label: pick('Founders/operators', '経営者・事業責任者') },
        { id: 'marketers', label: pick('Marketing/growth teams', 'マーケ・グロース担当') },
        { id: 'developers', label: pick('Developers/technical users', '開発者・技術ユーザー') },
        { id: 'consumers', label: pick('General consumers', '一般消費者') }
      ]
    );
  }

  if (/(deliverable|format|output|report|plan|checklist|copy|asset|handoff|納品|形式|アウトプット|レポート|計画|チェックリスト|原稿|引き継ぎ)/i.test(text)) {
    pushGroup(
      'deliverable',
      'Output format',
      '納品形式',
      'Choose what would be easiest to use next.',
      '次に使いやすい納品形式を選んでください。',
      [
        { id: 'report', label: pick('Strategy report', '分析レポート') },
        { id: 'checklist', label: pick('Execution checklist', '実行チェックリスト') },
        { id: 'copy', label: pick('Copy/assets draft', '原稿・素材案') },
        { id: 'handoff', label: pick('Implementation handoff', '実装・運用への引き継ぎ') }
      ]
    );
  }

  if (/(constraint|budget|deadline|scope|must|cannot|ads|制約|予算|期限|範囲|禁止|広告|スコープ)/i.test(text)) {
    pushGroup(
      'constraints',
      'Constraints',
      '制約',
      'Choose the operating constraint that matters most.',
      '最も重要な制約を選んでください。',
      [
        { id: 'organic-only', label: pick('No paid ads / organic only', '広告なし・オーガニックのみ') },
        { id: 'low-budget', label: pick('Low budget first', '低予算優先') },
        { id: 'fast', label: pick('Fast first draft', 'まず早く叩き台') },
        { id: 'quality', label: pick('Depth and quality first', '深さ・品質優先') }
      ]
    );
  }

  if (/(channel|traffic|acquisition|seo|sns|ads|referral|流入|チャネル|広告|自然検索|SNS|リファラル|参照元)/i.test(text)) {
    pushGroup(
      'channel',
      'Priority channel',
      '優先チャネル',
      'Select where the work should start.',
      'どのチャネルから着手するか選んでください。',
      [
        { id: 'organic', label: pick('Organic search / SEO', '自然検索・SEO') },
        { id: 'referral', label: pick('Referral sites', 'リファラル・参照元サイト') },
        { id: 'social', label: pick('SNS / social', 'SNS・ソーシャル') },
        { id: 'paid', label: pick('Paid ads', '広告') }
      ]
    );
  }

  if (!groups.length && Array.isArray(intake.questions) && intake.questions.length) {
    pushGroup(
      'direction',
      'Direction',
      '進め方',
      'Choose a practical default if you do not know the exact answer yet.',
      '正確な答えがまだない場合は、近い進め方を選んでください。',
      [
        { id: 'recommend', label: pick('Recommend the best option', '最適案を提案してほしい') },
        { id: 'compare', label: pick('Compare a few options', '複数案を比較してほしい') },
        { id: 'assume', label: pick('Proceed with assumptions', '仮説で進めてほしい') }
      ]
    );
  }

  const initialChoices = intakeInitialAnswerSuggestions(intake, sample);
  groups.forEach((group) => {
    group.initialChoices = (initialChoices[group.id] || [])
      .filter(Boolean)
      .slice(0, group.singleChoice ? 1 : 3);
    if (group.id === 'analytics') {
      group.options.forEach((option) => {
        if (group.initialChoices.includes(option.label)) {
          option.selected = true;
        }
      });
    }
  });
  const intakeGroupOrder = new Map([
    ['service', 1],
    ['analytics', 2],
    ['goal', 3],
    ['audience', 4],
    ['constraints', 5],
    ['channel', 6],
    ['deliverable', 7],
    ['direction', 8]
  ]);
  groups.sort((left, right) => (intakeGroupOrder.get(left.id) || 50) - (intakeGroupOrder.get(right.id) || 50));
  return groups.slice(0, 6);
}

function intakeChoiceCardsHtml(intake = {}, sample = '', options = {}) {
  const groups = Array.isArray(options.groups)
    ? options.groups.filter((group) => group?.id && group?.title)
    : intakeChoiceGroups(intake, sample);
  if (!groups.length) return '';
  const includeInitialChoices = options.includeInitialChoices !== false;
  const initialSourceLabel = chatText('From initial request', '初回文面から', sample);
  const groupHtml = groups.map((group) => [
    `<div class="intake-choice-group" data-choice-mode="${group.singleChoice ? 'single' : 'multiple'}">`,
    `<div class="intake-choice-title">${escapeHtml(group.title)}</div>`,
    group.hint ? `<span>${escapeHtml(group.hint)}</span>` : '',
    group.options.length ? '<div class="inline-actions intake-choice-actions">' : '',
    ...group.options.map((option) => {
      const action = option.action ? ` data-chat-action="${escapeHtml(option.action)}"` : '';
      const selectedClass = option.selected ? ' selected' : '';
      return `<button class="ghost-btn inline-btn intake-choice-btn${selectedClass}" type="button" aria-pressed="${option.selected ? 'true' : 'false'}" data-intake-choice="${escapeHtml(option.id)}" data-choice-group="${escapeHtml(group.title)}" data-choice-label="${escapeHtml(option.label)}"${action}>${escapeHtml(option.label)}</button>`;
    }),
    group.options.length ? '</div>' : '',
    '<div class="intake-other-row">',
    `<input class="intake-other-input" type="text" data-intake-other-input="${escapeHtml(group.id)}" data-choice-group="${escapeHtml(group.title)}" placeholder="${escapeHtml(group.inputPlaceholder || chatText('Other: type your own answer', 'その他: 自由に入力', sample))}" aria-label="${escapeHtml(chatText(`Other answer for ${group.title}`, `${group.title} のその他回答`, sample))}" />`,
    `<button class="ghost-btn inline-btn intake-other-add" type="button" data-intake-other-add="${escapeHtml(group.id)}" data-choice-group="${escapeHtml(group.title)}">${escapeHtml(chatText('Add', '追加', sample))}</button>`,
    '</div>',
    `<div class="intake-confirmed-list" data-intake-confirmed-list="${escapeHtml(group.id)}" data-choice-group="${escapeHtml(group.title)}"${includeInitialChoices && group.initialChoices?.length ? '' : ' hidden'}>`,
    ...(includeInitialChoices ? (group.initialChoices || []).map((choice) => intakeConfirmedChoiceHtml(group.title, choice, initialSourceLabel, sample)) : []),
    '</div>',
    '</div>'
  ].filter(Boolean).join('\n')).join('\n');
  return [
    '<div class="preflight-card intake-choice-card">',
    `<strong>${escapeHtml(options.title || chatText('Choose concrete answers', '具体的な選択肢から選んでください', sample))}</strong>`,
    `<span>${escapeHtml(options.detail || chatText('Click one or more choices to add them to the answer box. You can edit or remove text before sending.', 'ボタンは複数選べます。入力欄に追加されるだけなので、送信前に編集・削除できます。', sample))}</span>`,
    groupHtml,
    `<span class="chat-hint">${escapeHtml(options.footer || chatText('Selected choices are added to the composer; nothing is dispatched until you send the answer and approve the order.', '選択内容は入力欄に入るだけです。回答送信と発注承認までは実行されません。', sample))}</span>`,
    '</div>'
  ].join('\n');
}

function appendIntakeChoiceToComposer(group = '', choice = '') {
  const safeGroup = String(group || '').trim();
  const safeChoice = String(choice || '').trim();
  if (!safeGroup || !safeChoice || !els.promptInput) return;
  const prefix = `- ${safeGroup}:`;
  const nextLine = `${prefix} ${safeChoice}`;
  const currentLines = String(els.promptInput.value || '')
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line) => line.trim());
  if (currentLines.some((line) => line.trim() === nextLine)) {
    els.promptInput.focus();
    return;
  }
  currentLines.push(nextLine);
  els.promptInput.value = currentLines.join('\n');
  els.promptInput.focus();
  updateComposerMode();
}

function removeIntakeChoiceFromComposer(group = '', choice = '') {
  const safeGroup = String(group || '').trim();
  if (!safeGroup || !els.promptInput) return;
  const prefix = `- ${safeGroup}:`;
  const safeChoice = String(choice || '').trim();
  const exactLine = safeChoice ? `${prefix} ${safeChoice}` : '';
  els.promptInput.value = String(els.promptInput.value || '')
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line) => {
      const trimmed = line.trim();
      if (!trimmed) return false;
      if (exactLine) return trimmed !== exactLine;
      return !trimmed.startsWith(prefix);
    })
    .join('\n');
  updateComposerMode();
}

function resetIntakeChoiceGroup(groupElement = null, group = '') {
  const safeGroup = String(group || '').trim();
  if (!safeGroup || !groupElement) return;
  removeIntakeChoiceFromComposer(safeGroup);
  groupElement.querySelectorAll('[data-intake-choice].selected').forEach((button) => {
    button.classList.remove('selected');
    button.setAttribute('aria-pressed', 'false');
  });
  const list = groupElement.querySelector('[data-intake-confirmed-list]');
  list?.querySelectorAll('[data-confirmed-choice]').forEach((item) => item.remove());
  if (list) list.hidden = true;
}

function findIntakeChoiceGroupElement(group = '') {
  const safeGroup = String(group || '').trim();
  if (!safeGroup || !els.chatThread) return null;
  return [...els.chatThread.querySelectorAll('.intake-choice-group')]
    .find((groupElement) => {
      const confirmedGroup = String(groupElement.querySelector('[data-intake-confirmed-list]')?.dataset.choiceGroup || '').trim();
      const choiceGroup = String(groupElement.querySelector('[data-choice-group]')?.dataset.choiceGroup || '').trim();
      return confirmedGroup === safeGroup || choiceGroup === safeGroup;
    }) || null;
}

function intakeConfirmedChoiceHtml(group = '', choice = '', label = '', sample = '') {
  const safeGroup = String(group || '').trim();
  const safeChoice = String(choice || '').trim();
  const sourceLabel = label || chatText('Added', '追加済み', sample || state.pendingIntake?.originalPrompt || '');
  return [
    `<div class="intake-confirmed-item" data-confirmed-choice="${escapeHtml(safeChoice)}">`,
    `<span class="intake-confirmed-label">${escapeHtml(sourceLabel)}</span>`,
    `<strong>${escapeHtml(safeChoice)}</strong>`,
    '<div class="intake-confirmed-actions">',
    `<button class="ghost-btn inline-btn intake-confirmed-edit" type="button" data-intake-confirmed-edit data-choice-group="${escapeHtml(safeGroup)}">${escapeHtml(chatText('Edit', '編集', sample || state.pendingIntake?.originalPrompt || ''))}</button>`,
    `<button class="ghost-btn inline-btn intake-confirmed-remove" type="button" data-intake-confirmed-remove data-choice-group="${escapeHtml(safeGroup)}">${escapeHtml(chatText('Remove', '削除', sample || state.pendingIntake?.originalPrompt || ''))}</button>`,
    '</div>',
    '</div>'
  ].join('\n');
}

function setIntakeConfirmedChoice(groupElement = null, group = '', choice = '') {
  const safeGroup = String(group || '').trim();
  const safeChoice = String(choice || '').trim();
  const list = groupElement?.querySelector('[data-intake-confirmed-list]');
  if (!safeGroup || !safeChoice || !list) return;
  if ([...list.querySelectorAll('[data-confirmed-choice]')]
    .some((item) => String(item.dataset.confirmedChoice || '').trim() === safeChoice)) {
    list.hidden = false;
    return;
  }
  list.hidden = false;
  list.insertAdjacentHTML('beforeend', intakeConfirmedChoiceHtml(safeGroup, safeChoice, '', state.pendingIntake?.originalPrompt || ''));
}

function pendingIntakeHasAttachedAppContext(intake = {}) {
  return Boolean(
    intake?.appContextAttached
    || intake?.analyticsContextAttached
    || String(intake?.appContextPrompt || '').trim()
  );
}

function appContextMatchesMeasurementEvidenceApp(context = {}) {
  const manifest = measurementEvidenceAppManifest();
  return Boolean(manifest && appContextGateMatchesManifest(context, manifest));
}

function draftBroker(draft = null) {
  return draft?.input?._broker && typeof draft.input._broker === 'object' ? draft.input._broker : {};
}

function measurementEvidenceContextStatus(draft = null) {
  return appContextGateStatusForDraft(draft, measurementEvidenceAppManifest());
}

function mergeUniqueContexts(existing = [], nextContext = null) {
  const list = Array.isArray(existing) ? existing.filter((context) => context && typeof context === 'object') : [];
  if (!nextContext || typeof nextContext !== 'object') return list;
  const nextKey = [
    nextContext.id,
    nextContext.source_app || nextContext.sourceApp,
    nextContext.title
  ].map((item) => String(item || '').trim()).filter(Boolean).join('|').toLowerCase();
  if (nextKey && list.some((context) => [
    context.id,
    context.source_app || context.sourceApp,
    context.title
  ].map((item) => String(item || '').trim()).filter(Boolean).join('|').toLowerCase() === nextKey)) {
    return list.map((context) => {
      const key = [
        context.id,
        context.source_app || context.sourceApp,
        context.title
      ].map((item) => String(item || '').trim()).filter(Boolean).join('|').toLowerCase();
      return key === nextKey ? { ...context, ...nextContext } : context;
    });
  }
  return [nextContext, ...list].slice(0, 8);
}

function attachAppContextToDraft(context = null) {
  if (!state.draft || !context || typeof context !== 'object') return false;
  const input = state.draft.input && typeof state.draft.input === 'object' ? state.draft.input : {};
  const broker = input._broker && typeof input._broker === 'object' ? input._broker : {};
  const appContexts = mergeUniqueContexts(broker.appContexts || input.appContexts || [], context);
  const connectorContexts = appContextMatchesMeasurementEvidenceApp(context)
    ? mergeUniqueContexts(broker.connectorContexts || input.connectorContexts || [], context)
    : (Array.isArray(broker.connectorContexts) ? broker.connectorContexts : []);
  state.draft.input = {
    ...input,
    appContexts,
    ...(connectorContexts.length ? { connectorContexts } : {}),
    _broker: {
      ...broker,
      appContexts,
      ...(connectorContexts.length ? { connectorContexts } : {}),
      measurementEvidenceSkipped: false,
      measurement_evidence_skipped: false,
      analyticsContextSkipped: false,
      analytics_context_skipped: false
    }
  };
  state.draft.updatedAt = new Date().toISOString();
  state.draftRevision += 1;
  return true;
}

function markDraftMeasurementEvidenceSkipped() {
  if (!state.draft) return false;
  const input = state.draft.input && typeof state.draft.input === 'object' ? state.draft.input : {};
  const broker = input._broker && typeof input._broker === 'object' ? input._broker : {};
  state.draft.input = {
    ...input,
    _broker: {
      ...broker,
      measurementEvidenceSkipped: true,
      measurement_evidence_skipped: true,
      analyticsContextSkipped: true,
      analytics_context_skipped: true
    }
  };
  state.draft.updatedAt = new Date().toISOString();
  state.draftRevision += 1;
  return true;
}

function caitAppContextAnswerLine(context = {}) {
  const connectorPrompt = caitAppContextChatPrompt(context);
  if (appContextMatchesMeasurementEvidenceApp(context)) return appContextGateAnswerLine(context, measurementEvidenceAppManifest());
  return connectorPrompt.split('\n').map((line) => line.trim()).filter(Boolean)[0]
    || `Attached context from ${context?.source_app_label || context?.source_app || 'app'}.`;
}

async function openMeasurementEvidenceAppForIntake(intake = {}, answer = '') {
  const app = measurementEvidenceAppManifest();
  const appId = measurementEvidenceAppId();
  const appName = measurementEvidenceAppName();
  if (!app || !appId) {
    appendTextMessage('assistant', chatText(
      'No registered measurement evidence app is available for this order. You can skip analytics or try again after the app manifest is restored.',
      'この発注で使える計測根拠アプリが登録されていません。アナリティクスをスキップするか、アプリマニフェスト復旧後に再試行してください。',
      answer
    ), { tone: 'error', label: 'App context' });
    return;
  }
  const popup = window.open('about:blank', '_blank');
  const handoffId = makeChatHandoffId('measurement-evidence-intake');
  const chatReturnTo = currentChatReturnPath();
  const payload = {
    schema_version: 'cait-app-agent-transfer/v1',
    transfer_id: `measurement-evidence-intake-${Date.now().toString(36)}`,
    title: 'Measurement evidence requested from chat intake',
    source: 'CAIt Chat intake',
    summary: 'The user said GA4/Search Console data is available. Connect the right Google account, select the GA4 property and Search Console site, load the report, then send the app context back to CAIt before dispatching the order.',
    action: {
      kind: 'analytics_report_load',
      title: 'Select the Google account/property/site and load GA4/Search Console before order dispatch',
      text: String(answer || '').trim(),
      source: 'CAIt Chat intake',
      requiresApproval: false
    },
    context: {
      original_prompt: intake.originalPrompt || '',
      intake_answer: answer,
      questions: Array.isArray(intake.questions) ? intake.questions : [],
      task_type: intake.taskType || intake.activeLeaderTaskType || '',
      leader: intake.conversationOwner || null,
      chat_handoff_id: handoffId,
      chat_return_to: chatReturnTo
    },
    settings: {
      outputLanguage: chatLanguage(intake.originalPrompt || answer),
      workspaceNotes: `Original prompt:\n${intake.originalPrompt || ''}\n\nIntake answer:\n${answer}`
    }
  };
  try {
    const href = await createAppAgentContextOpenUrl(appId, payload);
    const url = new URL(href, window.location.origin);
    url.searchParams.set('chat_handoff_id', handoffId);
    url.searchParams.set('chat_return_to', chatReturnTo);
    if (popup) popup.location.href = url.toString();
    else window.open(url.toString(), '_blank');
    appendTextMessage('assistant', chatText(
      `I opened ${appName}. Connect the right Google account, choose the GA4 property and Search Console site, load the report, then press Send to CAIt. I will pause this order until app context comes back; if you want to skip analytics, type "skip analytics".`,
      `${appName} を開きました。正しいGoogleアカウント、GA4プロパティ、Search Consoleサイトを選び、レポートをLoadしてから Send to CAIt を押してください。この発注はアプリコンテキストが戻るまで止めます。分析を使わない場合は「アナリティクスをスキップ」と入力してください。`,
      answer
    ), { tone: 'ok', label: 'Analytics' });
  } catch (error) {
    const fallback = new URL(appAgentLaunchUrl(app) || '/apps.html', window.location.origin);
    fallback.searchParams.set('chat_handoff_id', handoffId);
    fallback.searchParams.set('chat_return_to', chatReturnTo);
    if (popup) popup.location.href = fallback.toString();
    else window.open(fallback.toString(), '_blank');
    appendTextMessage('assistant', `${chatText(`I opened ${appName}, but could not attach the intake context automatically.`, `${appName}を開きましたが、ヒアリング文脈の自動添付には失敗しました。`, answer)} ${orderErrorMessage(error)}`, { tone: 'error', label: 'Analytics' });
  }
}

async function openMeasurementEvidenceAppForDraft(draft = null) {
  const app = measurementEvidenceAppManifest();
  const appId = measurementEvidenceAppId();
  const appName = measurementEvidenceAppName();
  const sourceDraft = draft || state.draft || {};
  const sample = sourceDraft.originalPrompt || sourceDraft.prompt || state.conversationLanguage || '';
  if (!app || !appId) {
    appendTextMessage('assistant', chatText(
      'No registered measurement evidence app is available for this prepared order. Skip analytics or restore the app manifest before sending the order.',
      'この発注ドラフトで使える計測根拠アプリが登録されていません。アナリティクスをスキップするか、アプリマニフェストを復旧してから送信してください。',
      sample
    ), { tone: 'error', label: 'App context' });
    return;
  }
  const popup = window.open('about:blank', '_blank');
  const handoffId = makeChatHandoffId('measurement-evidence-draft');
  const chatReturnTo = currentChatReturnPath();
  const payload = {
    schema_version: 'cait-app-agent-transfer/v1',
    transfer_id: `measurement-evidence-draft-${Date.now().toString(36)}`,
    title: 'Measurement evidence requested before order dispatch',
    source: 'CAIt Chat order check',
    summary: 'The prepared order explicitly requests GA4/Search Console. Use the already connected Google account when possible, choose the exact property/site, load the report, then send the app context back to CAIt before dispatching the order.',
    action: {
      kind: 'analytics_report_load',
      title: 'Load GA4/Search Console evidence into this prepared order',
      text: sourceDraft.prompt || sourceDraft.originalPrompt || '',
      source: 'CAIt Chat order check',
      requiresApproval: false
    },
    context: {
      original_prompt: sourceDraft.originalPrompt || '',
      prepared_prompt: sourceDraft.prompt || '',
      task_type: sourceDraft.taskType || sourceDraft.task_type || '',
      leader: sourceDraft.conversationOwner || null,
      chat_handoff_id: handoffId,
      chat_return_to: chatReturnTo
    },
    settings: {
      outputLanguage: chatLanguage(sample),
      workspaceNotes: `Prepared order:\n${sourceDraft.prompt || ''}\n\nOriginal prompt:\n${sourceDraft.originalPrompt || ''}`
    }
  };
  try {
    const href = await createAppAgentContextOpenUrl(appId, payload);
    const url = new URL(href, window.location.origin);
    url.searchParams.set('chat_handoff_id', handoffId);
    url.searchParams.set('chat_return_to', chatReturnTo);
    if (popup) popup.location.href = url.toString();
    else window.open(url.toString(), '_blank');
    appendTextMessage('assistant', chatText(
      `I opened ${appName} for this prepared order. If Google is already connected, choose the GA4 property/Search Console site, load the report, then press Send to CAIt. I will attach it to this draft; no order will be sent until you press Send order again.`,
      `この発注ドラフト用に ${appName} を開きました。Google接続済みなら、GA4プロパティ/Search Consoleサイトを選び、レポートをLoadしてから Send to CAIt を押してください。戻ったコンテキストはこのドラフトに添付します。もう一度 Send order を押すまで発注は送信しません。`,
      sample
    ), { tone: 'ok', label: 'Analytics' });
  } catch (error) {
    const fallback = new URL(appAgentLaunchUrl(app) || '/apps.html', window.location.origin);
    fallback.searchParams.set('chat_handoff_id', handoffId);
    fallback.searchParams.set('chat_return_to', chatReturnTo);
    if (popup) popup.location.href = fallback.toString();
    else window.open(fallback.toString(), '_blank');
    appendTextMessage('assistant', `${chatText(`I opened ${appName}, but could not attach the prepared order context automatically.`, `${appName}を開きましたが、発注ドラフト文脈の自動添付には失敗しました。`, sample)} ${orderErrorMessage(error)}`, { tone: 'error', label: 'Analytics' });
  }
}

async function answerPendingIntake(answer = '', options = {}) {
  const intake = state.pendingIntake;
  if (!intake) return false;
  const text = String(answer || '').trim();
  if (!text) {
    appendTextMessage('assistant', chatLanguage(intake.originalPrompt) === 'ja'
      ? '分かる範囲で回答してください。まだ発注は開始していません。'
      : 'Answer what you can first. Nothing has been dispatched yet.', { tone: 'error', label: 'Intake' });
    return true;
  }
  if (options.skipAnalyticsRedirect !== true && !pendingIntakeHasAttachedAppContext(intake) && intakeHasMeasurementEvidenceQuestion(intake) && answerSaysAnalyticsAvailable(text)) {
    await openMeasurementEvidenceAppForIntake(intake, text);
    return true;
  }
  const explicitLeaderTaskType = explicitLeaderChangeTaskTypeFromText(text);
  const changedLeaderOwner = explicitLeaderTaskType ? leaderOwner(explicitLeaderTaskType, 'User explicitly changed the leader during intake.') : null;
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
    intake.taskType = changedLeaderOwner.taskType;
    intake.activeLeaderTaskType = changedLeaderOwner.taskType;
    intake.activeLeaderName = changedLeaderOwner.label;
    intake.conversationOwner = changedLeaderOwner;
    renderActiveLeaderStatus();
  }
  recordIntakeStepAnswer(intake, text);
  disableRenderedIntakeControls();
  const steps = intakeSteps(intake);
  const currentIndex = intakeCurrentStepIndex(intake);
  const answeredAllAtOnce = intakeAnswerLooksLikeCompleteBrief(text, {
    allowLineCount: currentIndex === 0,
    allowRichParagraph: currentIndex === 0
  });
  if (!answeredAllAtOnce && currentIndex < steps.length - 1) {
    setIntakeCurrentStepIndex(intake, currentIndex + 1);
    els.promptInput.value = '';
    updateComposerMode();
    appendPendingIntakeStep();
    return true;
  }
  const combinedAnswer = intakeCombinedAnswerText(intake, text);
  const combined = chatEngineBuildIntakeCombinedPrompt(intake, combinedAnswer, {
    connectorContext: intake.appContextPrompt || ''
  });
  state.pendingIntake = null;
  updateComposerMode();
  const lockedStateLeader = state.activeLeaderLocked && state.activeLeader?.taskType
    ? state.activeLeader
    : null;
  await prepareOrder(combined, {
    intakeAnswered: true,
    originalPrompt: intake.originalPrompt || combined,
    taskType: changedLeaderOwner?.taskType || intake.taskType || intake.task_type || '',
    selectedAgentId: intake.selectedAgentId || intake.selected_agent_id || '',
    selectedAgentName: intake.selectedAgentName || intake.selected_agent_name || '',
    activeLeaderTaskType: changedLeaderOwner?.taskType || intake.activeLeaderTaskType || intake.active_leader_task_type || intake.conversationOwner?.taskType || lockedStateLeader?.taskType || '',
    activeLeaderName: changedLeaderOwner?.label || intake.activeLeaderName || intake.active_leader_name || intake.conversationOwner?.label || lockedStateLeader?.label || '',
    activeLeaderLocked: Boolean(state.activeLeaderLocked && state.activeLeader?.taskType),
    leaderChangeRequested: Boolean(changedLeaderOwner),
    conversationOwner: changedLeaderOwner || intake.conversationOwner || null,
    appContext: intake.appContext || null
  });
  return true;
}

function orderConfirmationHtml(options = {}) {
  const draft = state.draft || {};
  const updated = options.updated === true;
  const task = draft.taskType || '-';
  const route = String(draft.resolvedOrderStrategy || 'single').toUpperCase();
  const reason = draft.reason || draft.routeHint || 'Prepared from your chat request.';
  const prompt = draft.prompt || '';
  const selectedAgent = String(draft.selectedAgentName || draft.selected_agent_name || draft.selectedAgentId || draft.selected_agent_id || '').trim();
  const owner = conversationOwnerFromPrepared(draft);
  const lead = owner.type === 'leader'
    ? `${owner.label || taskLabel(owner.taskType)} (${owner.taskType})`
    : owner.type === 'agent'
      ? `${owner.label || taskLabel(owner.taskType)} (${owner.taskType})`
      : 'CAIt specialist router';
  const sameContentRetry = draftIsSameContentNewOrderRetry(draft);
  const retrySourceOrderId = retryDraftSourceOrderId(draft);
  const reuseArtifacts = Array.isArray(draft.retryReuseArtifacts || draft.retry_reuse_artifacts)
    ? (draft.retryReuseArtifacts || draft.retry_reuse_artifacts).filter((item) => item && (item.task_type || item.taskType))
    : [];
  return [
    `<strong>${updated ? 'Updated order check' : 'Order check'}</strong>`,
    '',
    `Lead: ${escapeHtml(lead)}`,
    `Task: ${escapeHtml(task)}`,
    `Route: ${escapeHtml(route)}`,
    selectedAgent ? `Selected worker: ${escapeHtml(selectedAgent)}` : '',
    `Reason: ${escapeHtml(reason)}`,
    sameContentRetry
      ? `Retry mode: ${escapeHtml(`Same content as a NEW order${retrySourceOrderId ? `; not a continuation of #${retrySourceOrderId.slice(0, 8)}` : '; not a continuation'}.`)}`
      : '',
    reuseArtifacts.length
      ? `Reuse selected artifacts: ${escapeHtml(reuseArtifacts.map((item) => item.task_type || item.taskType).join(', '))}`
      : '',
    '',
    measurementEvidencePreOrderHintHtml(draft),
    '<details class="file-card order-brief" open>',
    '<summary>Instruction that will be sent</summary>',
    `<pre>${escapeHtml(prompt)}</pre>`,
    '</details>',
    '<div class="inline-actions">',
    '<button class="primary-btn inline-btn" type="button" data-chat-action="send-order">Send order</button>',
    '<button class="ghost-btn inline-btn" type="button" data-chat-action="reset-chat">Reset</button>',
    '</div>',
    '<span class="chat-hint">Type adjustments here to update this order, or type SEND ORDER to dispatch.</span>'
  ].join('\n');
}

function appendOrderConfirmation(options = {}) {
  appendMessage('assistant', orderConfirmationHtml(options), { tone: 'ok', label: activeActorLabel('Order check') });
  updateComposerMode();
  setBusy(state.busy);
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
  if (state.pendingIntake) {
    const prompt = caitAppContextChatPrompt(context);
    state.pendingIntake.appContextAttached = true;
    state.pendingIntake.analyticsContextAttached = appContextMatchesMeasurementEvidenceApp(context);
    state.pendingIntake.appContextPrompt = prompt;
    state.pendingIntake.appContext = context;
    const contextGroupName = chatText('Analytics data', 'アナリティクス', state.pendingIntake.originalPrompt || prompt);
    const contextChoice = caitAppContextAnswerLine(context);
    const contextGroupElement = findIntakeChoiceGroupElement(contextGroupName);
    if (contextGroupElement?.dataset.choiceMode === 'single') {
      resetIntakeChoiceGroup(contextGroupElement, contextGroupName);
    }
    appendIntakeChoiceToComposer(contextGroupName, contextChoice);
    setIntakeConfirmedChoice(contextGroupElement, contextGroupName, contextChoice);
    updateComposerMode();
    setBusy(false);
    appendTextMessage('system', chatText(
      'App context returned to the active intake. Continue filling any missing choices or send the current answer when ready; nothing has been dispatched yet.',
      'アプリの情報を進行中のヒアリングに戻しました。未入力の選択肢を続けて入力するか、準備できたらこの回答を送信してください。まだ実行も課金も発生していません。',
      state.pendingIntake.originalPrompt || prompt
    ), { label: options.label || 'App context' });
    return true;
  }
  if (state.draft) {
    attachAppContextToDraft(context);
    state.pendingAppContext = context;
    appendTextMessage('system', chatText(
      'Analytics/app context was attached to the prepared order. Review the updated order check, then press Send order when ready.',
      'アナリティクス/アプリコンテキストを発注ドラフトに添付しました。更新された注文確認を見て、問題なければ Send order を押してください。',
      state.draft.originalPrompt || state.draft.prompt || ''
    ), { label: options.label || 'App context' });
    appendOrderConfirmation({ updated: true });
    setBusy(false);
    return true;
  }
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
  const intakeConfirmedEditButton = event.target.closest('[data-intake-confirmed-edit]');
  if (intakeConfirmedEditButton) {
    const groupElement = intakeConfirmedEditButton.closest('.intake-choice-group');
    const item = intakeConfirmedEditButton.closest('.intake-confirmed-item');
    const input = groupElement?.querySelector('[data-intake-other-input]');
    const value = String(item?.dataset.confirmedChoice || item?.querySelector('strong')?.textContent || '').trim();
    if (input && value) {
      input.value = value;
      input.focus();
      input.select?.();
    }
    return;
  }
  const intakeConfirmedRemoveButton = event.target.closest('[data-intake-confirmed-remove]');
  if (intakeConfirmedRemoveButton) {
    const group = String(intakeConfirmedRemoveButton.dataset.choiceGroup || '').trim();
    const groupElement = intakeConfirmedRemoveButton.closest('.intake-choice-group');
    const item = intakeConfirmedRemoveButton.closest('.intake-confirmed-item');
    const value = String(item?.dataset.confirmedChoice || item?.querySelector('strong')?.textContent || '').trim();
    removeIntakeChoiceFromComposer(group, value);
    groupElement?.querySelectorAll('[data-intake-choice].selected').forEach((button) => {
      const label = String(button.dataset.choiceLabel || button.textContent || '').trim();
      if (label !== value) return;
      button.classList.remove('selected');
      button.setAttribute('aria-pressed', 'false');
    });
    const list = groupElement?.querySelector('[data-intake-confirmed-list]');
    item?.remove();
    if (list && !list.querySelector('[data-confirmed-choice]')) {
      list.hidden = true;
    }
    return;
  }
  const intakeOtherButton = event.target.closest('[data-intake-other-add]');
  if (intakeOtherButton) {
    if (!state.pendingIntake) {
      appendTextMessage('assistant', 'There is no active intake to answer.', { tone: 'error', label: 'Intake' });
      return;
    }
    const group = String(intakeOtherButton.dataset.choiceGroup || '').trim();
    const row = intakeOtherButton.closest('.intake-other-row');
    const input = row?.querySelector('[data-intake-other-input]');
    const value = String(input?.value || '').trim();
    if (!value) {
      input?.focus();
      return;
    }
    const groupElement = intakeOtherButton.closest('.intake-choice-group');
    if (groupElement?.dataset.choiceMode === 'single') resetIntakeChoiceGroup(groupElement, group);
    appendIntakeChoiceToComposer(group, value);
    setIntakeConfirmedChoice(groupElement, group, value);
    input.value = '';
    input.focus();
    return;
  }
  const intakeChoiceButton = event.target.closest('[data-intake-choice]');
  if (intakeChoiceButton) {
    if (!state.pendingIntake) {
      appendTextMessage('assistant', 'There is no active intake to answer.', { tone: 'error', label: 'Intake' });
      return;
    }
    const action = String(intakeChoiceButton.dataset.chatAction || '').trim();
    const group = String(intakeChoiceButton.dataset.choiceGroup || '').trim();
    const label = String(intakeChoiceButton.dataset.choiceLabel || intakeChoiceButton.textContent || '').trim();
    const groupElement = intakeChoiceButton.closest('.intake-choice-group');
    if (groupElement?.dataset.choiceMode === 'single') resetIntakeChoiceGroup(groupElement, group);
    intakeChoiceButton.classList.add('selected');
    intakeChoiceButton.setAttribute('aria-pressed', 'true');
    appendIntakeChoiceToComposer(group, label);
    setIntakeConfirmedChoice(groupElement, group, label);
    if (action === 'app-context-use') {
      setBusy(true);
      void openMeasurementEvidenceAppForIntake(state.pendingIntake, chatText('GA4/Search Console is available.', 'GA4/Search Consoleがあります。', state.pendingIntake.originalPrompt))
        .finally(() => setBusy(false));
      return;
    }
    return;
  }
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
  } else if (action === 'app-context-use') {
    setBusy(true);
    const analyticsOpen = state.pendingIntake
      ? openMeasurementEvidenceAppForIntake(state.pendingIntake, chatText('GA4/Search Console is available.', 'GA4/Search Consoleがあります。', state.pendingIntake.originalPrompt))
      : state.draft
        ? openMeasurementEvidenceAppForDraft(state.draft)
        : Promise.reject(new Error('There is no active intake or prepared order to attach analytics to.'));
    void analyticsOpen
      .catch((error) => appendTextMessage('assistant', orderErrorMessage(error), { tone: 'error', label: 'Analytics' }))
      .finally(() => setBusy(false));
  } else if (action === 'app-context-skip') {
    if (state.draft && !state.pendingIntake) {
      markDraftMeasurementEvidenceSkipped();
      appendTextMessage('system', chatText(
        'Analytics was skipped for this prepared order. Press Send order to proceed without GA4/Search Console evidence.',
        'この発注ドラフトではアナリティクスをスキップしました。GA4/Search Console根拠なしで進める場合は Send order を押してください。',
        state.draft.originalPrompt || state.draft.prompt || ''
      ), { label: 'Analytics' });
      appendOrderConfirmation({ updated: true });
      return;
    }
    if (!state.pendingIntake) {
      appendTextMessage('assistant', 'There is no active intake or prepared order to continue.', { tone: 'error', label: 'Analytics' });
      return;
    }
    const analyticsGroupName = chatText('Analytics data', 'アナリティクス', state.pendingIntake.originalPrompt);
    const analyticsSkipChoice = chatText('Skip analytics', 'アナリティクスをスキップ', state.pendingIntake.originalPrompt);
    const analyticsGroup = [...els.chatThread.querySelectorAll('.intake-choice-group')]
      .find((groupElement) => String(groupElement.querySelector('[data-intake-confirmed-list]')?.dataset.choiceGroup || '') === analyticsGroupName);
    if (analyticsGroup?.dataset.choiceMode === 'single') {
      resetIntakeChoiceGroup(analyticsGroup, analyticsGroupName);
    }
    appendIntakeChoiceToComposer(analyticsGroupName, analyticsSkipChoice);
    setIntakeConfirmedChoice(
      analyticsGroup,
      analyticsGroupName,
      analyticsSkipChoice
    );
  }
});

els.chatThread.addEventListener('keydown', (event) => {
  const input = event.target.closest('[data-intake-other-input]');
  if (!input || event.key !== 'Enter' || event.shiftKey || event.isComposing) return;
  event.preventDefault();
  input.closest('.intake-other-row')?.querySelector('[data-intake-other-add]')?.click();
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
