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
  connectorGateApprovalAnchor,
  connectorGateAuthorityHandledBySaasHandoff,
  connectorGateAuthorityIsActionable,
  connectorGateAuthorityNoticeKey,
  connectorGateAuthorityRequestFromJob,
  connectorGateHandleOAuthLinkClick,
  connectorGateHandleOAuthPopupReturn,
  connectorGateHandleOAuthPopupReturnMessage,
  connectorGateOpenOAuthPopup,
  connectorGateRenderAuthorityRequest,
  connectorGateStartOAuthPopupMonitor
} from './connector-gate.js?v=20260519a';
import {
  authAccountKey as chatSessionAuthAccountKey,
  chatSessionSnapshotExpired,
  chatSnapshotAccountKey as chatSessionSnapshotAccountKey,
  compactChatRuntimeSnapshot as compactChatRuntimeSnapshotForSession,
  normalizeChatAccountKey as normalizeChatSessionAccountKey,
  safeLocalStorageGet as chatSessionSafeLocalStorageGet,
  safeLocalStorageRemove as chatSessionSafeLocalStorageRemove,
  safeLocalStorageSet as chatSessionSafeLocalStorageSet,
  safeSessionStorageGet as chatSessionSafeSessionStorageGet,
  safeSessionStorageRemove as chatSessionSafeSessionStorageRemove,
  safeSessionStorageSet as chatSessionSafeSessionStorageSet
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
  appHandoffArtifactLabel as appHandoffGateArtifactLabel,
  appHandoffConnectorNotes as appHandoffGateConnectorNotes,
  appHandoffDedicatedDeliveryArtifactTypes as appHandoffGateDedicatedDeliveryArtifactTypes,
  appHandoffDedicatedTextSourceKind as appHandoffGateDedicatedTextSourceKind,
  appHandoffEntryMatchesArtifact as appHandoffGateEntryMatchesArtifact,
  appHandoffHasDedicatedDelivery as appHandoffGateHasDedicatedDelivery,
  appHandoffRankEntries as appHandoffGateRankEntries,
  genericSuppressedAppHandoffIds as appHandoffGateGenericSuppressedAppHandoffIds,
  explicitHandoffArtifactTypesFromAuthorityRequest as appHandoffGateExplicitArtifactTypesFromAuthorityRequest,
  explicitHandoffArtifactTypesFromFile as appHandoffGateExplicitArtifactTypesFromFile,
  renderAppHandoffTree as appHandoffGateRenderTree
} from './app-handoff-gate.js?v=20260526c';
import {
  appContextFromTransferPayload,
  appHandoffBaseTransferPacket,
  appHandoffContractTextLimit,
  appHandoffPayloadContractError,
  appHandoffSocialPostDraftFromDeliveryFiles,
  appTransferPayloadWithEditedText
} from './app-handoff-transfer.js?v=20260526h';
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
import {
  progressNarratorHtml as agentProgressNarratorHtml,
  progressNarratorProgress as agentProgressNarratorProgress,
  progressNarratorProgressLabel as agentProgressNarratorProgressLabel,
  progressNarratorStreamSegments as agentProgressNarratorStreamSegments,
  progressNarratorStreamText as agentProgressNarratorStreamText,
  renderAgentRunDetailHtml as agentProgressRenderAgentRunDetailHtml
} from './agent-progress-view.js?v=20260519a';
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

const CHATUX_RETURN_PATH = '/chat';
const CHATUX_BACKFILL_INTERVAL_MS = 10000;
const CHATUX_CATALOG_PAGE_SIZE = 10;
const CHATUX_CATALOG_CACHE_TTL_MS = 60000;
const CHATUX_PROGRESS_MAX_POLLS = 300;
const CHATUX_OAUTH_RETURN_STATE_KEY = 'cait.chat.oauthReturnState.v1';
const CHATUX_CONNECT_WAIT_MS = 60 * 60 * 1000;
const CHATUX_AUTH_STATUS_TIMEOUT_MS = 8000;
const CHATUX_CONNECT_CHECK_INTERVAL_MS = 1500;
const CHATUX_OAUTH_RETURN_MAX_AGE_MS = CHATUX_CONNECT_WAIT_MS;
const CHATUX_RUNTIME_STATE_KEY = 'cait.chat.runtimeState.v1';
const CHATUX_RUNTIME_STATE_MAX_AGE_MS = 12 * 60 * 60 * 1000;
const CHATUX_RETRY_MODE_NEW_ORDER = 'same_content_new_order';
const CAIT_APP_CONTEXT_CHANNEL = 'cait-app-context';
const CHATUX_WELCOME_TEXT = 'What do you want done?';
function leaderCatalogChatAnswer(prompt = '') {
  const ja = chatLanguage(prompt) === 'ja';
  return ja
    ? [
        '利用できる主なリーダー',
        '',
        '利用できるリーダーは登録済みエージェントのカタログに基づいて選ばれます。これは案内回答なので、まだ注文も課金も発生していません。',
        '',
        '- Leader Agent: 目的を分解し、必要な専門エージェント、順序、承認点、最終統合を管理します。',
        '- Specialist Agent: 調査、設計、文章、分析、実装などの個別成果物を作ります。',
        '',
        '迷う場合は、やりたい成果をそのまま書けば CAIt がリーダーか専門エージェントかを判断します。実行する場合だけ Send order を押してください。'
      ].join('\n')
    : [
        'Main available leaders',
        '',
        'Available leaders are selected from the registered agent catalog. This is a chat answer, so no order or billing happened.',
        '',
        '- Leader Agent: decomposes the goal, chooses specialists, manages sequence, approval points, and final synthesis.',
        '- Specialist Agent: produces focused research, design, writing, analysis, implementation, or other artifacts.',
        '',
        'If you are unsure, describe the outcome you want and CAIt will choose a leader or specialist. Paid work only starts when you press Send order.'
      ].join('\n');
}

function makeVisitorId() {
  try {
    const bytes = new Uint8Array(8);
    window.crypto.getRandomValues(bytes);
    return `chatux-${Array.from(bytes).map((item) => item.toString(16).padStart(2, '0')).join('')}`;
  } catch {
    return `chatux-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
  }
}

const state = {
  auth: null,
  authAccountKey: '',
  accountBoundaryRevision: 0,
  restoredRuntimeAccountKey: '',
  pendingChatRestoreSnapshot: null,
  draft: null,
  pendingIntake: null,
  activeOwner: null,
  activeOwnerLocked: false,
  activeLeader: null,
  activeLeaderLocked: false,
  pendingLeaderChange: null,
  draftRevision: 0,
  orderId: '',
  polling: null,
  progressNarratorArticle: null,
  progressNarratorKey: '',
  progressMapArticle: null,
  progressMapKey: '',
  progressNarratorTimer: null,
  progressNarratorTimerArticle: null,
  liveProgressStoppedOrderIds: new Set(),
  followupTargetOrderId: '',
  deliveryBackfill: null,
  oauthPopupMonitor: null,
  trackedOrderIds: new Set(),
  deliveredOrderIds: new Set(),
  authorityNoticeKeys: new Set(),
  orderMilestoneNoticeKeys: new Set(),
  appAgentHistory: [],
  aiAgentHistory: [],
  recentJobs: [],
  recentJobsFetchedAt: 0,
  recentJobsRequest: null,
  recurringOrders: [],
  recurringOrdersFetchedAt: 0,
  recurringOrdersRequest: null,
  registeredApps: [],
  registeredAppsFetchedAt: 0,
  registeredAppsRequest: null,
  registeredAppsTotal: 0,
  registeredAppsHasMore: false,
  appContexts: [],
  appContextsFetchedAt: 0,
  appContextsRequest: null,
  pendingAppContext: null,
  workerAgents: [],
  workerAgentsFetchedAt: 0,
  workerAgentsRequest: null,
  workerAgentsTotal: 0,
  workerAgentsHasMore: false,
  pendingRecoveryPayloads: [],
  busy: false,
  conversationLanguage: '',
  chatSessions: [],
  chatMessages: [],
  currentChatSessionId: '',
  chatViewRevision: 0,
  chatSidebarOpen: false,
  lastTranscriptPrompt: '',
  lastTranscriptId: '',
  chatSessionHistoryFetchedAt: 0,
  chatSessionHistoryRequest: null,
  authRefreshRetryTimer: null,
  visitorId: makeVisitorId()
};

const deliveryFileStore = new Map();
const appTransferStore = new Map();
const agentMapRunStore = new Map();
let agentMapRunKeyCounter = 0;
const processedAppContextIds = new Set();
const chatGa4EventKeys = new Set();
let appContextBroadcastChannel = null;
let pendingServerChatSessionSnapshot = null;
let chatSessionSnapshotTimer = null;

const $ = (id) => document.getElementById(id);

function ga4SafeString(value = '', max = 120) {
  return String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function trackChatGa4Event(eventName = '', params = {}) {
  try {
    if (typeof window.caitTrackGa4Event !== 'function') return false;
    return window.caitTrackGa4Event(eventName, {
      source: 'chat',
      chat_session_id: ga4SafeString(state.currentChatSessionId || '', 80),
      ...params
    });
  } catch {
    return false;
  }
}

function trackChatGa4Once(key = '', eventName = '', params = {}) {
  const safeKey = ga4SafeString(key, 160);
  if (!safeKey || chatGa4EventKeys.has(safeKey)) return false;
  chatGa4EventKeys.add(safeKey);
  return trackChatGa4Event(eventName, params);
}

function trackChatIntakeStarted(prompt = '', source = 'chat_submit') {
  const sessionKey = state.currentChatSessionId || state.visitorId || 'anonymous';
  return trackChatGa4Once(`chat_intake_started:${sessionKey}`, 'chat_intake_started', {
    source,
    prompt_length: String(prompt || '').length,
    language: chatLanguage(prompt),
    active_leader: state.activeLeader?.taskType || ''
  });
}
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

const DELIVERY_FORMAT_LABELS = Object.freeze({
  chat_summary: 'Chat summary',
  files: 'Files',
  review_packets: 'Review packets',
  planning_options: 'Planning options',
  approval_queue: 'Approval queue'
});

function selectedDeliveryFormat() {
  return String(els.deliveryFormatSelect?.value || 'chat_summary').trim() || 'chat_summary';
}

function selectedDeliveryFormatLabel(format = selectedDeliveryFormat()) {
  return DELIVERY_FORMAT_LABELS[String(format || '').trim()] || DELIVERY_FORMAT_LABELS.chat_summary;
}

function escapeHtml(value = '') {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function compact(value = '', max = 280) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text.length <= max ? text : `${text.slice(0, max - 1).trim()}...`;
}

function compactChatTitle(value = '') {
  return compact(value || 'New chat', 72) || 'New chat';
}

function htmlToPlainText(html = '') {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = String(html || '');
  return String(wrapper.textContent || '').replace(/\s+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

function makeChatSessionId() {
  return `chatux_session_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function ensureChatSessionId(options = {}) {
  if (!state.currentChatSessionId && options.force) state.currentChatSessionId = makeChatSessionId();
  return state.currentChatSessionId || '';
}

function makeChatTranscriptId(sessionId = '') {
  const safeSessionId = String(sessionId || ensureChatSessionId({ force: true }) || makeChatSessionId())
    .replace(/[^a-zA-Z0-9:_-]+/g, '_')
    .slice(0, 120);
  return `${safeSessionId}_turn_${Date.now().toString(36)}_${Math.max(1, state.chatMessages.length)}`;
}

function chatSessionTitle(messages = []) {
  const userMessage = (Array.isArray(messages) ? messages : []).find((message) => message.role === 'user' && message.body);
  const firstMessage = userMessage || (Array.isArray(messages) ? messages : []).find((message) => message.body);
  return compactChatTitle(firstMessage?.body || 'New chat');
}

function normalizeChatSession(session = {}) {
  const id = String(session.id || session.sessionId || '').trim();
  if (!id) return null;
  const messages = (Array.isArray(session.messages) ? session.messages : [])
    .map((message) => ({
      role: ['user', 'assistant', 'system'].includes(String(message?.role || '').trim()) ? String(message.role).trim() : 'assistant',
      body: compact(String(message?.body || '').trim(), 4000),
      tone: String(message?.tone || '').trim(),
      label: String(message?.label || '').trim(),
      ts: String(message?.ts || session.updatedAt || session.createdAt || isoNow()).trim()
    }))
    .filter((message) => message.body)
    .slice(-80);
  const updatedAt = String(session.updatedAt || session.createdAt || isoNow()).trim();
  const activeJobIds = [...new Set((Array.isArray(session.activeJobIds) ? session.activeJobIds : [])
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .slice(0, 20))];
  const linkedOrderId = String(session.linkedOrderId || '').trim();
  const relatedOrderIds = [...new Set([
    ...(Array.isArray(session.relatedOrderIds) ? session.relatedOrderIds : []),
    linkedOrderId,
    ...activeJobIds
  ].map((item) => String(item || '').trim()).filter(Boolean))].slice(0, 40);
  return {
    ...session,
    id,
    sessionId: String(session.sessionId || id).trim(),
    title: compactChatTitle(session.title || chatSessionTitle(messages)),
    messages,
    activeLeader: session.activeLeader && typeof session.activeLeader === 'object'
      ? {
          type: 'leader',
          taskType: String(session.activeLeader.taskType || session.activeLeader.task_type || '').trim(),
          label: String(session.activeLeader.label || session.activeLeader.name || '').trim(),
          reason: String(session.activeLeader.reason || '').trim()
        }
      : null,
    activeLeaderLocked: Boolean(session.activeLeaderLocked || session.active_leader_locked),
    activeOwner: session.activeOwner && typeof session.activeOwner === 'object'
      ? {
          type: String(session.activeOwner.type || '').trim().toLowerCase() || 'agent',
          taskType: String(session.activeOwner.taskType || session.activeOwner.task_type || '').trim(),
          label: String(session.activeOwner.label || session.activeOwner.name || '').trim(),
          reason: String(session.activeOwner.reason || '').trim()
        }
      : (session.activeLeader && typeof session.activeLeader === 'object'
          ? {
              type: 'leader',
              taskType: String(session.activeLeader.taskType || session.activeLeader.task_type || '').trim(),
              label: String(session.activeLeader.label || session.activeLeader.name || '').trim(),
              reason: String(session.activeLeader.reason || '').trim()
            }
          : null),
    activeOwnerLocked: Boolean(session.activeOwnerLocked || session.active_owner_locked || session.activeLeaderLocked || session.active_leader_locked),
    activeWork: Boolean(session.activeWork),
    linkedOrderId,
    activeJobIds,
    relatedOrderIds,
    createdAt: String(session.createdAt || updatedAt).trim(),
    updatedAt
  };
}

function upsertChatSession(session = {}) {
  const normalized = normalizeChatSession(session);
  if (!normalized) return null;
  const others = state.chatSessions.filter((item) => item.id !== normalized.id && item.sessionId !== normalized.sessionId);
  state.chatSessions = [normalized, ...others]
    .sort((left, right) => String(right.updatedAt || '').localeCompare(String(left.updatedAt || '')))
    .slice(0, 200);
  return normalized;
}

function currentChatSessionPayload() {
  const sessionId = ensureChatSessionId({ force: state.chatMessages.length > 0 });
  if (!sessionId || !state.chatMessages.length) return null;
  const existing = state.chatSessions.find((session) => session.id === sessionId || session.sessionId === sessionId) || {};
  const now = isoNow();
  const linkedOrderId = String(existing.linkedOrderId || state.orderId || '').trim();
  const activeJobIds = [];
  const relatedOrderIds = [...new Set([
    ...(Array.isArray(existing.relatedOrderIds) ? existing.relatedOrderIds : []),
    linkedOrderId
  ].map((item) => String(item || '').trim()).filter(Boolean))].slice(0, 40);
  return normalizeChatSession({
    ...existing,
    id: sessionId,
    sessionId,
    title: chatSessionTitle(state.chatMessages),
    messages: state.chatMessages.slice(-80),
    activeOwner: state.activeOwner ? safeJsonClone(state.activeOwner, { depth: 3, maxText: 600, maxArray: 4 }) : null,
    activeOwnerLocked: Boolean(state.activeOwnerLocked && state.activeOwner?.taskType),
    activeLeader: state.activeLeader ? safeJsonClone(state.activeLeader, { depth: 3, maxText: 600, maxArray: 4 }) : null,
    activeLeaderLocked: Boolean(state.activeLeaderLocked && state.activeLeader?.taskType),
    linkedOrderId,
    activeJobIds,
    relatedOrderIds,
    activeWork: false,
    createdAt: existing.createdAt || state.chatMessages[0]?.ts || now,
    updatedAt: now
  });
}

function persistRuntimeChatSession() {
  const session = currentChatSessionPayload();
  if (!session) return null;
  upsertChatSession(session);
  saveChatRuntimeState('runtime_session');
  renderChatSessionSidebar();
  return session;
}

function safeSessionStorageSet(key = '', value = '') {
  return chatSessionSafeSessionStorageSet(key, value);
}

function safeSessionStorageGet(key = '') {
  return chatSessionSafeSessionStorageGet(key);
}

function safeSessionStorageRemove(key = '') {
  return chatSessionSafeSessionStorageRemove(key);
}

function safeLocalStorageSet(key = '', value = '') {
  return chatSessionSafeLocalStorageSet(key, value);
}

function safeLocalStorageGet(key = '') {
  return chatSessionSafeLocalStorageGet(key);
}

function safeLocalStorageRemove(key = '') {
  return chatSessionSafeLocalStorageRemove(key);
}

function normalizeChatAccountKey(value = '') {
  return normalizeChatSessionAccountKey(value);
}

function authAccountKey(auth = {}) {
  return chatSessionAuthAccountKey(auth);
}

function currentChatAccountKey() {
  return normalizeChatAccountKey(state.authAccountKey || authAccountKey(state.auth || {}));
}

function chatSnapshotAccountKey(snapshot = {}) {
  return chatSessionSnapshotAccountKey(snapshot);
}

function safeJsonClone(value = null, fallbackOptions = {}) {
  if (value == null) return null;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return compactTransferObject(value, fallbackOptions);
  }
}

function chatRestoreRequestFromUrl() {
  try {
    const url = new URL(window.location.href);
    return {
      requested: url.searchParams.get('cait_restore_chat') === '1'
        || url.searchParams.has('cait_chat_session_id')
        || url.searchParams.has('cait_order_id'),
      sessionId: String(url.searchParams.get('cait_chat_session_id') || '').trim(),
      orderId: String(url.searchParams.get('cait_order_id') || '').trim()
    };
  } catch {
    return { requested: false, sessionId: '', orderId: '' };
  }
}

function clearChatRestoreParamsFromUrl() {
  try {
    const url = new URL(window.location.href);
    for (const key of ['cait_restore_chat', 'cait_chat_session_id', 'cait_order_id']) {
      url.searchParams.delete(key);
    }
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
  } catch {}
}

function chatRuntimeStateSnapshot(reason = '') {
  const hasRuntimeState = Boolean(state.chatMessages.length || state.orderId || state.pendingIntake || state.draft);
  const sessionId = ensureChatSessionId({ force: hasRuntimeState });
  let session = currentChatSessionPayload();
  if (!session && sessionId && state.chatMessages.length) {
    session = normalizeChatSession({
      id: sessionId,
      sessionId,
      title: chatSessionTitle(state.chatMessages),
      messages: state.chatMessages.slice(-80),
      linkedOrderId: state.orderId,
      activeJobIds: [],
      activeWork: false,
      createdAt: state.chatMessages[0]?.ts || isoNow(),
      updatedAt: isoNow()
    });
  }
  if (session && state.orderId) {
    session = normalizeChatSession({
      ...session,
      linkedOrderId: session.linkedOrderId || state.orderId,
      activeJobIds: [],
      relatedOrderIds: [...new Set([
        ...(Array.isArray(session.relatedOrderIds) ? session.relatedOrderIds : []),
        state.orderId
      ].filter(Boolean))],
      activeWork: false,
      updatedAt: isoNow()
    });
  }
  return {
    version: 1,
    accountKey: currentChatAccountKey(),
    savedAt: isoNow(),
    reason: String(reason || '').slice(0, 80),
    returnPath: currentChatReturnPath({ includeRestoreParams: false }),
    currentChatSessionId: sessionId,
    session,
    orderId: String(state.orderId || session?.linkedOrderId || '').trim(),
    trackedOrderIds: [...state.trackedOrderIds].slice(-20),
    pendingIntake: safeJsonClone(state.pendingIntake, { depth: 6, maxText: 2000, maxArray: 24 }),
    draft: safeJsonClone(state.draft, { depth: 7, maxText: 2600, maxArray: 24 }),
    pendingAppContext: safeJsonClone(state.pendingAppContext, { depth: 5, maxText: 1600, maxArray: 16 }),
    activeOwner: safeJsonClone(state.activeOwner, { depth: 4, maxText: 900, maxArray: 12 }),
    activeOwnerLocked: Boolean(state.activeOwnerLocked && state.activeOwner?.taskType),
    activeLeader: safeJsonClone(state.activeLeader, { depth: 4, maxText: 900, maxArray: 12 }),
    activeLeaderLocked: Boolean(state.activeLeaderLocked && state.activeLeader?.taskType),
    pendingLeaderChange: safeJsonClone(state.pendingLeaderChange, { depth: 3, maxText: 1000, maxArray: 4 }),
    conversationLanguage: String(state.conversationLanguage || '').trim(),
    promptValue: String(els.promptInput?.value || '').slice(0, 8000)
  };
}

function saveChatOAuthReturnState(reason = 'oauth') {
  return saveChatRuntimeSnapshot(CHATUX_OAUTH_RETURN_STATE_KEY, reason);
}

function saveChatRuntimeSnapshot(key = CHATUX_RUNTIME_STATE_KEY, reason = 'runtime') {
  const snapshot = chatRuntimeStateSnapshot(reason);
  return saveChatRuntimeSnapshotObject(key, snapshot);
}

function compactChatRuntimeSnapshot(snapshot = {}) {
  return compactChatRuntimeSnapshotForSession(snapshot, {
    normalizeChatSession,
    currentAccountKey: currentChatAccountKey(),
    returnPath: CHATUX_RETURN_PATH,
    nowIso
  });
}

function saveChatRuntimeSnapshotObject(key = CHATUX_RUNTIME_STATE_KEY, snapshot = {}) {
  let serialized = '';
  try {
    serialized = JSON.stringify(snapshot);
  } catch {
    return false;
  }
  if (serialized.length > 700_000) {
    try {
      serialized = JSON.stringify({
        ...snapshot,
        pendingIntake: compactTransferObject(snapshot.pendingIntake, { depth: 5, maxText: 1400, maxArray: 16 }),
        draft: compactTransferObject(snapshot.draft, { depth: 5, maxText: 1400, maxArray: 16 }),
        pendingAppContext: compactTransferObject(snapshot.pendingAppContext, { depth: 4, maxText: 900, maxArray: 12 })
      });
    } catch {
      return false;
    }
  }
  const savedSession = safeSessionStorageSet(key, serialized);
  if (key !== CHATUX_RUNTIME_STATE_KEY) return savedSession;
  const savedLocal = safeLocalStorageSet(key, serialized);
  if (savedSession || savedLocal) return true;
  try {
    const compactSerialized = JSON.stringify(compactChatRuntimeSnapshot(snapshot));
    return safeSessionStorageSet(key, compactSerialized) || safeLocalStorageSet(key, compactSerialized);
  } catch {
    return false;
  }
}

function saveChatRuntimeState(reason = 'runtime') {
  const snapshot = chatRuntimeStateSnapshot(reason);
  const hasSession = Boolean(snapshot?.session?.messages?.length);
  const hasActiveState = Boolean(snapshot?.orderId || snapshot?.pendingIntake || snapshot?.draft || snapshot?.promptValue);
  if (!hasSession && !hasActiveState) return false;
  queueServerChatSessionSnapshot(snapshot, {
    immediate: /beforeunload|order|restore/i.test(String(reason || '')),
    delayMs: 1000
  });
  return saveChatRuntimeSnapshotObject(CHATUX_RUNTIME_STATE_KEY, snapshot);
}

function clearChatRuntimeState() {
  safeSessionStorageRemove(CHATUX_RUNTIME_STATE_KEY);
  safeLocalStorageRemove(CHATUX_RUNTIME_STATE_KEY);
}

function bumpChatViewRevision() {
  state.chatViewRevision = (Number(state.chatViewRevision) || 0) + 1;
  return state.chatViewRevision;
}

function clearQueuedChatSessionSnapshot() {
  pendingServerChatSessionSnapshot = null;
  if (chatSessionSnapshotTimer) window.clearTimeout(chatSessionSnapshotTimer);
  chatSessionSnapshotTimer = null;
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
  deliveryFileStore.clear();
  appTransferStore.clear();
  agentMapRunStore.clear();
}

function stopChatRuntimeTimers() {
  if (state.polling) window.clearInterval(state.polling);
  if (state.deliveryBackfill) window.clearInterval(state.deliveryBackfill);
  if (state.oauthPopupMonitor) window.clearInterval(state.oauthPopupMonitor);
  if (state.authRefreshRetryTimer) window.clearTimeout(state.authRefreshRetryTimer);
  state.polling = null;
  state.deliveryBackfill = null;
  state.oauthPopupMonitor = null;
  state.authRefreshRetryTimer = null;
}

function purgeChatStateForAccountBoundary(reason = 'account_boundary') {
  state.accountBoundaryRevision = (Number(state.accountBoundaryRevision) || 0) + 1;
  stopChatRuntimeTimers();
  stopProgressNarratorAnimation();
  state.pendingChatRestoreSnapshot = null;
  state.restoredRuntimeAccountKey = '';
  state.currentChatSessionId = '';
  state.chatMessages = [];
  state.chatSessions = [];
  state.lastTranscriptPrompt = '';
  state.lastTranscriptId = '';
  state.pendingIntake = null;
  state.draft = null;
  state.pendingAppContext = null;
  state.activeOwner = null;
  state.activeOwnerLocked = false;
  state.activeLeader = null;
  state.activeLeaderLocked = false;
  state.pendingLeaderChange = null;
  state.conversationLanguage = '';
  state.chatSessionHistoryFetchedAt = 0;
  state.chatSessionHistoryRequest = null;
  state.draftRevision += 1;
  clearActiveOrderMemory();
  clearQueuedChatSessionSnapshot();
  clearChatRuntimeState();
  safeSessionStorageRemove(CHATUX_OAUTH_RETURN_STATE_KEY);
  clearChatRestoreParamsFromUrl();
  if (els.promptInput) els.promptInput.value = '';
  if (els.chatThread) {
    els.chatThread.innerHTML = '';
    appendTextMessage('assistant', CHATUX_WELCOME_TEXT, { record: false });
  }
  renderActiveLeaderStatus();
  updateComposerMode();
  renderChatSessionSidebar();
  return reason;
}

function serverChatSessionPayload(snapshot = {}) {
  const session = normalizeChatSession(snapshot.session || {});
  if (!session) return null;
  return {
    accountKey: normalizeChatAccountKey(snapshot.accountKey || currentChatAccountKey()),
    session,
    orderId: String(snapshot.orderId || session.linkedOrderId || '').trim(),
    trackedOrderIds: Array.isArray(snapshot.trackedOrderIds) ? snapshot.trackedOrderIds.slice(-40) : []
  };
}

async function flushServerChatSessionSnapshot() {
  const payload = pendingServerChatSessionSnapshot;
  pendingServerChatSessionSnapshot = null;
  if (!payload) return false;
  try {
    await api('/api/chat-sessions', {
      method: 'POST',
      body: JSON.stringify(payload),
      timeoutMs: 8000
    });
    state.chatSessionHistoryFetchedAt = 0;
    return true;
  } catch {
    return false;
  }
}

function queueServerChatSessionSnapshot(snapshot = {}, options = {}) {
  const payload = serverChatSessionPayload(snapshot);
  if (!payload?.session?.id) return false;
  pendingServerChatSessionSnapshot = payload;
  if (chatSessionSnapshotTimer) window.clearTimeout(chatSessionSnapshotTimer);
  if (options.immediate === true) {
    chatSessionSnapshotTimer = null;
    void flushServerChatSessionSnapshot();
    return true;
  }
  chatSessionSnapshotTimer = window.setTimeout(() => {
    chatSessionSnapshotTimer = null;
    void flushServerChatSessionSnapshot();
  }, Math.max(400, Number(options.delayMs || 1200) || 1200));
  return true;
}

function restoreChatMessagesFromSession(session = null) {
  const messages = Array.isArray(session?.messages) ? session.messages : [];
  els.chatThread.innerHTML = '';
  if (messages.length) {
    for (const message of messages) {
      appendTextMessage(message.role || 'assistant', message.body || '', {
        tone: message.tone || '',
        label: message.label || '',
        record: false
      });
    }
  } else {
    appendTextMessage('assistant', CHATUX_WELCOME_TEXT, { record: false });
  }
}

function applyRestoredChatSnapshot(snapshot = {}, request = {}) {
  const session = normalizeChatSession(snapshot.session || {});
  if (!session && !snapshot.orderId && !snapshot.pendingIntake && !snapshot.draft) return false;
  state.restoredRuntimeAccountKey = chatSnapshotAccountKey(snapshot);
  const viewRevision = bumpChatViewRevision();
  if (state.polling) window.clearInterval(state.polling);
  stopProgressNarratorAnimation();
  state.polling = null;
  state.progressNarratorArticle = null;
  state.progressNarratorKey = '';
  state.progressMapArticle = null;
  state.progressMapKey = '';
  state.liveProgressStoppedOrderIds.clear();
  state.currentChatSessionId = session?.id || String(snapshot.currentChatSessionId || request.sessionId || '').trim();
  state.chatMessages = (Array.isArray(session?.messages) ? session.messages : []).slice(-80);
  state.lastTranscriptPrompt = '';
  state.lastTranscriptId = '';
  state.pendingIntake = snapshot.pendingIntake && typeof snapshot.pendingIntake === 'object' ? snapshot.pendingIntake : null;
  state.draft = snapshot.draft && typeof snapshot.draft === 'object' ? snapshot.draft : null;
  state.pendingAppContext = snapshot.pendingAppContext && typeof snapshot.pendingAppContext === 'object' ? snapshot.pendingAppContext : null;
  state.activeOwner = snapshot.activeOwner && typeof snapshot.activeOwner === 'object'
    ? snapshot.activeOwner
    : (session?.activeOwner && typeof session.activeOwner === 'object' ? session.activeOwner : null);
  state.activeOwnerLocked = Boolean((snapshot.activeOwnerLocked || session?.activeOwnerLocked) && state.activeOwner?.taskType);
  state.activeLeader = snapshot.activeLeader && typeof snapshot.activeLeader === 'object' ? snapshot.activeLeader : (state.activeOwner?.type === 'leader' ? state.activeOwner : null);
  state.activeLeaderLocked = Boolean((snapshot.activeLeaderLocked || session?.activeLeaderLocked) && state.activeLeader?.taskType);
  state.pendingLeaderChange = snapshot.pendingLeaderChange && typeof snapshot.pendingLeaderChange === 'object' ? snapshot.pendingLeaderChange : null;
  state.conversationLanguage = String(snapshot.conversationLanguage || '').trim();
  state.draftRevision += 1;
  clearActiveOrderMemory();
  state.orderId = String(snapshot.orderId || session?.linkedOrderId || request.orderId || '').trim();
  if (Array.isArray(snapshot.trackedOrderIds)) {
    for (const id of snapshot.trackedOrderIds) rememberTrackedOrder(id);
  }
  if (state.orderId) rememberTrackedOrder(state.orderId);
  if (session) upsertChatSession(session);
  restoreChatMessagesFromSession(session);
  if (state.draft && !els.chatThread.querySelector('[data-chat-action="send-order"]')) {
    appendMessage('assistant', orderConfirmationHtml(), { tone: 'ok', label: activeActorLabel('Order check'), record: false });
  }
  if (els.promptInput && snapshot.promptValue) els.promptInput.value = String(snapshot.promptValue || '');
  renderActiveLeaderStatus();
  updateComposerMode();
  renderChatSessionSidebar();
  const restoredFromReload = /^runtime/i.test(String(snapshot.reason || ''));
  appendTextMessage('system', chatText(
    restoredFromReload
      ? 'Chat restored. Loading current Order state.'
      : 'Returned from Google connection. Chat restored and current Order state is loading.',
    restoredFromReload
      ? 'チャットを復元しました。現在のOrder状態を読み込みます。'
      : 'Google接続から戻りました。チャットを復元し、現在のOrder状態を読み込みます。',
    state.chatMessages[0]?.body || state.conversationLanguage
  ), { label: 'Chat restored', record: false });
  if (session) void renderRestoredSessionOrderContext(session, {
    viewRevision,
    sessionId: session.id || session.sessionId,
    resumeActiveWork: true
  });
  if (!session && state.orderId && restoredSessionHasActiveWork({}, snapshot)) startPolling(state.orderId);
  startDeliveryBackfillLoop({ maxRuns: 6, renderTerminalDeliveries: false, notifyMilestones: false });
  return true;
}

function restoreChatSnapshotForCurrentAccount(snapshot = {}, request = {}, options = {}) {
  const snapshotKey = chatSnapshotAccountKey(snapshot);
  const currentKey = currentChatAccountKey();
  const storageKey = String(options.storageKey || CHATUX_RUNTIME_STATE_KEY);
  if (!snapshotKey) {
    if (storageKey === CHATUX_OAUTH_RETURN_STATE_KEY) safeSessionStorageRemove(CHATUX_OAUTH_RETURN_STATE_KEY);
    else clearChatRuntimeState();
    return false;
  }
  if (!currentKey) {
    state.restoredRuntimeAccountKey = snapshotKey;
    state.pendingChatRestoreSnapshot = {
      snapshot,
      request: request && typeof request === 'object' ? request : {},
      storageKey
    };
    return false;
  }
  if (snapshotKey !== currentKey) {
    if (storageKey === CHATUX_OAUTH_RETURN_STATE_KEY) safeSessionStorageRemove(CHATUX_OAUTH_RETURN_STATE_KEY);
    else clearChatRuntimeState();
    state.pendingChatRestoreSnapshot = null;
    state.restoredRuntimeAccountKey = '';
    return false;
  }
  const restored = applyRestoredChatSnapshot(snapshot, request);
  if (restored) {
    if (storageKey === CHATUX_OAUTH_RETURN_STATE_KEY) safeSessionStorageRemove(CHATUX_OAUTH_RETURN_STATE_KEY);
    state.pendingChatRestoreSnapshot = null;
    state.restoredRuntimeAccountKey = '';
  }
  return restored;
}

function restorePendingChatSnapshotForCurrentAccount() {
  const pending = state.pendingChatRestoreSnapshot;
  if (!pending?.snapshot) return false;
  return restoreChatSnapshotForCurrentAccount(pending.snapshot, pending.request || {}, {
    storageKey: pending.storageKey || CHATUX_RUNTIME_STATE_KEY
  });
}

function restoreChatOAuthReturnStateFromUrl() {
  const request = chatRestoreRequestFromUrl();
  if (!request.requested) return false;
  const raw = safeSessionStorageGet(CHATUX_OAUTH_RETURN_STATE_KEY);
  if (!raw) return false;
  let snapshot = null;
  try {
    snapshot = JSON.parse(raw);
  } catch {
    safeSessionStorageRemove(CHATUX_OAUTH_RETURN_STATE_KEY);
    return false;
  }
  if (chatSessionSnapshotExpired(snapshot, CHATUX_OAUTH_RETURN_MAX_AGE_MS)) {
    safeSessionStorageRemove(CHATUX_OAUTH_RETURN_STATE_KEY);
    return false;
  }
  const savedSessionId = String(snapshot?.session?.id || snapshot?.session?.sessionId || snapshot?.currentChatSessionId || '').trim();
  if (request.sessionId && savedSessionId && request.sessionId !== savedSessionId) return false;
  const restored = restoreChatSnapshotForCurrentAccount(snapshot, request, {
    storageKey: CHATUX_OAUTH_RETURN_STATE_KEY
  });
  if (restored) {
    safeSessionStorageRemove(CHATUX_OAUTH_RETURN_STATE_KEY);
    clearChatRestoreParamsFromUrl();
  }
  return restored;
}

function restoreChatRuntimeState() {
  const raw = safeSessionStorageGet(CHATUX_RUNTIME_STATE_KEY) || safeLocalStorageGet(CHATUX_RUNTIME_STATE_KEY);
  if (!raw) return false;
  let snapshot = null;
  try {
    snapshot = JSON.parse(raw);
  } catch {
    clearChatRuntimeState();
    return false;
  }
  if (chatSessionSnapshotExpired(snapshot, CHATUX_RUNTIME_STATE_MAX_AGE_MS)) {
    clearChatRuntimeState();
    return false;
  }
  return restoreChatSnapshotForCurrentAccount({ ...snapshot, reason: snapshot.reason || 'runtime_reload' }, {}, {
    storageKey: CHATUX_RUNTIME_STATE_KEY
  });
}

function restoreRequestedChatSessionFromHistory() {
  const request = chatRestoreRequestFromUrl();
  if (!request.requested || (!request.sessionId && !request.orderId)) return false;
  const session = state.chatSessions.find((item) => {
    if (request.sessionId && (item.id === request.sessionId || item.sessionId === request.sessionId)) return true;
    if (!request.orderId) return false;
    return item.linkedOrderId === request.orderId || (Array.isArray(item.relatedOrderIds) && item.relatedOrderIds.includes(request.orderId));
  });
  if (!session) {
    if (!request.orderId) return false;
    state.orderId = request.orderId;
    rememberTrackedOrder(request.orderId);
    appendTextMessage('system', chatText(
      'Order link restored. Loading current Order state.',
      'Orderリンクを復元しました。現在のOrder状態を読み込みます。',
      state.conversationLanguage
    ), { label: 'Order restored', record: false });
    startPolling(request.orderId);
    clearChatRestoreParamsFromUrl();
    saveChatRuntimeState('runtime_order_restore');
    return true;
  }
  loadChatSession(session.id || session.sessionId, { resumeActiveWork: true });
  if (request.orderId && !state.orderId) {
    state.orderId = request.orderId;
    rememberTrackedOrder(request.orderId);
    startPolling(request.orderId);
  }
  appendTextMessage('system', chatText(
    'Returned from Google connection. I restored this chat from saved history.',
    'Google接続から戻りました。保存済み履歴からこのチャットを復元しました。',
    session.messages?.[0]?.body || ''
  ), { label: 'Chat restored', record: false });
  clearChatRestoreParamsFromUrl();
  return true;
}

function chatSessionTimeLabel(value = '') {
  if (!Number.isFinite(Date.parse(value))) return 'saved';
  return new Date(value).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function chatSessionFromMemory(item = {}) {
  const prompt = String(item.prompt || '').trim();
  const answer = String(item.answer || '').trim();
  const sessionId = String(item.sessionId || item.id || '').trim();
  const messages = Array.isArray(item.messages) ? item.messages : [];
  if (!sessionId || (!prompt && !answer && !messages.length)) return null;
  const createdAt = String(item.createdAt || item.updatedAt || isoNow()).trim();
  return normalizeChatSession({
    id: sessionId,
    sessionId,
    title: String(item.title || '').trim() || prompt || answer || 'Saved chat',
    activeWork: Boolean(item.activeWork),
    linkedOrderId: String(item.linkedOrderId || '').trim(),
    activeJobIds: Array.isArray(item.activeJobIds) ? item.activeJobIds : [],
    relatedOrderIds: Array.isArray(item.relatedOrderIds) ? item.relatedOrderIds : [],
    createdAt,
    updatedAt: String(item.updatedAt || createdAt).trim(),
    messages: messages.length ? messages : [
      ...(prompt ? [{ role: 'user', body: prompt, ts: createdAt }] : []),
      ...(answer ? [{ role: 'assistant', body: answer, tone: item.status === 'blocked' ? 'warn' : 'info', ts: item.updatedAt || createdAt }] : [])
    ]
  });
}

function renderChatSessionSidebar() {
  if (!els.chatSessionList) return;
  const current = currentChatSessionPayload();
  const sessions = [
    ...(current ? [current] : []),
    ...state.chatSessions.filter((session) => !current || (session.id !== current.id && session.sessionId !== current.sessionId))
  ]
    .map(normalizeChatSession)
    .filter(Boolean)
    .sort((left, right) => {
      if (left.id === state.currentChatSessionId) return -1;
      if (right.id === state.currentChatSessionId) return 1;
      return String(right.updatedAt || '').localeCompare(String(left.updatedAt || ''));
    })
    .slice(0, 200);
  if (els.chatSessionSidebar) {
    els.chatSessionSidebar.classList.toggle('mobile-open', Boolean(state.chatSidebarOpen));
  }
  if (els.chatSessionStatus) {
    if (sessions.length) {
      const savedCount = Math.max(0, sessions.length - (current ? 1 : 0));
      els.chatSessionStatus.textContent = savedCount ? `${savedCount} saved chat${savedCount === 1 ? '' : 's'}` : 'Current chat';
    } else if (state.auth?.loggedIn || state.auth?.user || state.auth?.login) {
      els.chatSessionStatus.textContent = 'No saved chats yet';
    } else {
      els.chatSessionStatus.textContent = 'Sign in to restore chats';
    }
  }
  if (!sessions.length) {
    els.chatSessionList.innerHTML = '<div class="empty-session-list">Start a chat and it will appear here. Signed-in chat memory is restored from your account.</div>';
    return;
  }
  els.chatSessionList.innerHTML = sessions.map((session) => {
    const active = session.id === state.currentChatSessionId || session.sessionId === state.currentChatSessionId;
    const messageCount = Array.isArray(session.messages) ? session.messages.length : 0;
    const activeWork = session.activeWork ? ' / live order' : '';
    return [
      `<div class="chat-session-row ${active ? 'active' : ''}">`,
      `<button type="button" class="chat-session-item" data-chat-session-id="${escapeHtml(session.id)}" aria-current="${active ? 'true' : 'false'}">`,
      `<span class="chat-session-title">${escapeHtml(session.title || 'New chat')}</span>`,
      `<span class="chat-session-meta">${escapeHtml(`${chatSessionTimeLabel(session.updatedAt)} / ${messageCount} msg${activeWork}`)}</span>`,
      '</button>',
      `<button type="button" class="chat-session-delete" data-chat-session-delete="${escapeHtml(session.id)}" aria-label="Delete chat">x</button>`,
      '</div>'
    ].join('');
  }).join('\n');
}

function startNewChatSession() {
  bumpChatViewRevision();
  stopProgressNarratorAnimation();
  state.currentChatSessionId = '';
  state.chatMessages = [];
  state.lastTranscriptPrompt = '';
  state.lastTranscriptId = '';
  state.draft = null;
  state.pendingIntake = null;
  state.activeOwner = null;
  state.activeOwnerLocked = false;
  state.activeLeader = null;
  state.activeLeaderLocked = false;
  state.pendingLeaderChange = null;
  state.pendingAppContext = null;
  state.conversationLanguage = '';
  state.draftRevision += 1;
  clearActiveOrderMemory();
  clearChatRuntimeState();
  clearQueuedChatSessionSnapshot();
  clearChatRestoreParamsFromUrl();
  if (els.promptInput) els.promptInput.value = '';
  els.chatThread.innerHTML = '';
  renderActiveLeaderStatus();
  appendTextMessage('assistant', CHATUX_WELCOME_TEXT, { record: false });
  updateComposerMode();
  renderChatSessionSidebar();
}

function loadChatSession(sessionId = '', options = {}) {
  const session = state.chatSessions.find((item) => item.id === sessionId || item.sessionId === sessionId);
  if (!session) return;
  const viewRevision = bumpChatViewRevision();
  if (state.polling) window.clearInterval(state.polling);
  stopProgressNarratorAnimation();
  state.polling = null;
  state.progressNarratorArticle = null;
  state.progressNarratorKey = '';
  state.liveProgressStoppedOrderIds.clear();
  state.currentChatSessionId = session.id;
  state.chatMessages = (Array.isArray(session.messages) ? session.messages : []).slice(-80);
  state.lastTranscriptPrompt = '';
  state.lastTranscriptId = '';
  state.draft = null;
  state.pendingIntake = null;
  state.activeOwner = session.activeOwner && typeof session.activeOwner === 'object'
    ? session.activeOwner
    : (session.activeLeader && typeof session.activeLeader === 'object' ? { type: 'leader', ...session.activeLeader } : null);
  state.activeOwnerLocked = Boolean(session.activeOwnerLocked && state.activeOwner?.taskType);
  state.activeLeader = session.activeLeader && typeof session.activeLeader === 'object' ? session.activeLeader : (state.activeOwner?.type === 'leader' ? state.activeOwner : null);
  state.activeLeaderLocked = Boolean(session.activeLeaderLocked && state.activeLeader?.taskType);
  state.pendingLeaderChange = null;
  state.draftRevision += 1;
  clearActiveOrderMemory();
  state.orderId = session.linkedOrderId || '';
  for (const id of chatSessionOrderIds(session)) {
    const safeId = String(id || '').trim();
    if (safeId) state.trackedOrderIds.add(safeId);
  }
  els.chatThread.innerHTML = '';
  if (state.chatMessages.length) {
    for (const message of state.chatMessages) {
      appendTextMessage(message.role || 'assistant', message.body || '', {
        tone: message.tone || '',
        label: message.label || '',
        record: false
      });
    }
  } else {
    appendTextMessage('assistant', CHATUX_WELCOME_TEXT, { record: false });
  }
  renderActiveLeaderStatus();
  updateComposerMode();
  renderChatSessionSidebar();
  state.chatSidebarOpen = false;
  renderChatSessionSidebar();
  void renderRestoredSessionOrderContext(session, {
    viewRevision,
    sessionId: session.id || session.sessionId,
    resumeActiveWork: options.resumeActiveWork === true
  });
}

function deleteChatSession(sessionId = '') {
  const safeId = String(sessionId || '').trim();
  if (!safeId) return;
  state.chatSessions = state.chatSessions.filter((session) => session.id !== safeId && session.sessionId !== safeId);
  void api(`/api/settings/chat-memory/${encodeURIComponent(safeId)}`, { method: 'DELETE' })
    .then(() => { state.chatSessionHistoryFetchedAt = 0; })
    .catch(() => {});
  if (state.currentChatSessionId === safeId) startNewChatSession();
  renderChatSessionSidebar();
}

function chatSessionHistoryApiPath() {
  return '/api/chat-memory?limit=200';
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
  renderChatSessionSidebar();
  return true;
}

async function refreshChatSessionHistory(options = {}) {
  const force = options.force === true;
  if (!force && state.chatSessionHistoryFetchedAt && Date.now() - state.chatSessionHistoryFetchedAt < 60_000) return state.chatSessions;
  if (state.chatSessionHistoryRequest) return state.chatSessionHistoryRequest;
  const requestBoundaryRevision = Number(state.accountBoundaryRevision) || 0;
  state.chatSessionHistoryRequest = api(chatSessionHistoryApiPath(), { method: 'GET' })
    .then((result) => {
      if (requestBoundaryRevision !== (Number(state.accountBoundaryRevision) || 0)) return state.chatSessions;
      if (result?.auth && typeof result.auth === 'object') applyAuthState(result.auth);
      const serverSessions = (Array.isArray(result?.chatMemory) ? result.chatMemory : [])
        .map(chatSessionFromMemory)
        .filter(Boolean);
      const currentSession = currentChatSessionPayload();
      state.chatSessions = currentSession ? [currentSession] : [];
      for (const session of serverSessions) upsertChatSession(session);
      state.chatSessionHistoryFetchedAt = Date.now();
      renderChatSessionSidebar();
      return state.chatSessions;
    })
    .catch((error) => {
      if (els.chatSessionStatus) els.chatSessionStatus.textContent = orderErrorMessage(error);
      return state.chatSessions;
    })
    .finally(() => {
      state.chatSessionHistoryRequest = null;
    });
  return state.chatSessionHistoryRequest;
}

function recordChatSessionMessage(role, body = '', options = {}) {
  if (options.record === false) return;
  const text = compact(String(options.plainText || body || '').trim(), 4000);
  if (!text) return;
  ensureChatSessionId({ force: true });
  const message = {
    role: ['user', 'assistant', 'system'].includes(role) ? role : 'assistant',
    body: text,
    tone: String(options.tone || '').trim(),
    label: String(options.label || '').trim(),
    ts: isoNow()
  };
  state.chatMessages.push(message);
  state.chatMessages = state.chatMessages.slice(-80);
  if (message.role === 'user') {
    state.lastTranscriptPrompt = text;
    state.lastTranscriptId = makeChatTranscriptId(state.currentChatSessionId);
  } else if (state.lastTranscriptPrompt) {
    const transcriptAnswerKind = message.tone || message.role;
    const transcriptStatus = message.tone || (message.role === 'system' ? 'system' : 'ok');
    void trackChatTranscript(state.lastTranscriptPrompt, text, {
      transcriptId: makeChatTranscriptId(state.currentChatSessionId),
      answerKind: transcriptAnswerKind,
      status: transcriptStatus
    });
  }
  persistRuntimeChatSession();
}

async function trackChatTranscript(prompt = '', answer = '', meta = {}) {
  const cleanPrompt = String(prompt || '').trim();
  const cleanAnswer = String(answer || '').trim();
  if (!cleanPrompt && !cleanAnswer) return;
  try {
    const sessionId = ensureChatSessionId({ force: true });
    const headers = new Headers({ 'content-type': 'application/json' });
    if (state.auth?.csrfToken) headers.set('x-aiagent2-csrf', state.auth.csrfToken);
    if (state.visitorId) headers.set('x-aiagent2-visitor-id', state.visitorId);
    await fetch('/api/analytics/chat-transcripts', {
      method: 'POST',
      headers,
      credentials: 'same-origin',
      keepalive: true,
      body: JSON.stringify({
        id: String(meta.transcriptId || '').trim() || makeChatTranscriptId(sessionId),
        prompt: cleanPrompt.slice(0, 8000),
        answer: cleanAnswer.slice(0, 8000),
        answer_kind: String(meta.answerKind || 'chat').slice(0, 40),
        status: String(meta.status || '').slice(0, 80),
        session_id: sessionId,
        visitor_id: state.visitorId,
        page_path: window.location.pathname || '/chat',
        current_tab: 'chat',
        source: 'chatux',
        meta: {
          source: 'chatux_session_sidebar',
          visitorId: state.visitorId
        }
      })
    });
    state.chatSessionHistoryFetchedAt = 0;
  } catch {
    // Chat transcript persistence must not block chat, intake, or order dispatch.
  }
}

function listValues(value) {
  if (Array.isArray(value)) return value.map((item) => String(item || '').trim()).filter(Boolean);
  if (typeof value === 'string') return value.split(/[,\n]/).map((item) => item.trim()).filter(Boolean);
  return [];
}

function isoNow() {
  return new Date().toISOString();
}

function normalizeUsageId(value = '') {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9_.:-]+/g, '-').replace(/^-+|-+$/g, '');
}

function isCoreFeatureAppId(value = '') {
  return CORE_FEATURE_APP_IDS.has(normalizeUsageId(value));
}

function compactUsageText(value = '', max = 420) {
  return compact(String(value || '').replace(/\r\n/g, '\n'), max);
}

function compactTransferText(value = '', max = 1200) {
  const text = String(value || '')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1)).trim()}…`;
}

function compactTransferObject(value = null, options = {}) {
  const maxText = Math.max(120, Number(options.maxText || 900));
  const maxArray = Math.max(1, Number(options.maxArray || 12));
  const depth = Math.max(0, Number(options.depth || 0));
  if (value == null) return value;
  if (typeof value === 'string') return compactTransferText(value, maxText);
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) {
    return value.slice(0, maxArray).map((item) => compactTransferObject(item, { maxText, maxArray, depth: depth - 1 }));
  }
  if (typeof value === 'object') {
    if (depth <= 0) return {};
    const result = {};
    for (const [key, item] of Object.entries(value).slice(0, 28)) {
      if (/token|secret|password|cookie|authorization|csrf/i.test(key)) continue;
      result[key] = compactTransferObject(item, { maxText, maxArray, depth: depth - 1 });
    }
    return result;
  }
  return String(value || '');
}

function usageDisplayDate(value = '') {
  const time = Date.parse(value || '');
  if (!Number.isFinite(time)) return '';
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(time));
  } catch {
    return new Date(time).toLocaleString();
  }
}

function mergeUsageEntry(list = [], entry = {}, options = {}) {
  const id = normalizeUsageId(entry.id || entry.key || entry.name);
  if (!id) return Array.isArray(list) ? list : [];
  const now = isoNow();
  const limit = Math.max(1, Number(options.limit || 40));
  const existing = (Array.isArray(list) ? list : []).find((item) => normalizeUsageId(item.id || item.key || item.name) === id) || {};
  const merged = {
    ...existing,
    ...entry,
    id,
    firstUsedAt: existing.firstUsedAt || entry.firstUsedAt || now,
    lastUsedAt: entry.lastUsedAt || now,
    useCount: Number(existing.useCount || 0) + (options.increment === false ? 0 : 1)
  };
  return [
    merged,
    ...(Array.isArray(list) ? list : []).filter((item) => normalizeUsageId(item.id || item.key || item.name) !== id)
  ].slice(0, limit);
}

function normalizeAppAgentManifest(app = {}) {
  const manifest = app?.metadata?.manifest && typeof app.metadata.manifest === 'object' ? app.metadata.manifest : {};
  const id = normalizeUsageId(app.id || app.name || manifest.id || manifest.name);
  if (!id || isCoreFeatureAppId(id)) return null;
  const baseUrl = String(app.baseUrl || app.base_url || manifest.baseUrl || manifest.base_url || app.url || manifest.url || '').trim();
  const entryUrl = String(app.entryUrl || app.entry_url || app.launchUrl || app.launch_url || manifest.entryUrl || manifest.entry_url || manifest.launchUrl || manifest.launch_url || baseUrl).trim();
  return {
    id,
    name: String(app.name || manifest.name || 'Application').trim(),
    kind: String(app.kind || manifest.kind || 'application').trim(),
    description: String(app.description || manifest.description || '').trim(),
    baseUrl,
    entryUrl,
    capabilities: listValues(app.capabilities || app.actions || manifest.capabilities || manifest.actions || []),
    requiredConnectors: listValues(app.requiredConnectors || app.required_connectors || app.connectors || manifest.requiredConnectors || manifest.required_connectors || manifest.connectors || []),
    requiresApprovalFor: listValues(app.requiresApprovalFor || app.requires_approval_for || manifest.requiresApprovalFor || manifest.requires_approval_for || []),
    inputContract: app.inputContract || app.input_contract || manifest.inputContract || manifest.input_contract || null,
    contextContract: app.contextContract || app.context_contract || manifest.contextContract || manifest.context_contract || null,
    contextIngestUrl: String(app.contextIngestUrl || app.context_ingest_url || manifest.contextIngestUrl || manifest.context_ingest_url || '').trim(),
    handoff: app.handoff || manifest.handoff || null,
    dedicatedDelivery: app.dedicatedDelivery || app.dedicated_delivery || manifest.dedicatedDelivery || manifest.dedicated_delivery || null,
    tags: listValues(app.tags || manifest.tags || []),
    directCommandAliases: listValues(app.directCommandAliases || app.direct_command_aliases || app.commandAliases || app.command_aliases || manifest.directCommandAliases || manifest.direct_command_aliases || manifest.commandAliases || manifest.command_aliases || []),
    owner: String(app.owner || manifest.owner || '').trim(),
    status: String(app.status || manifest.status || '').trim(),
    verificationStatus: String(app.verificationStatus || app.verification_status || manifest.verificationStatus || manifest.verification_status || '').trim(),
    reusePrompt: String(app.reusePrompt || app.reuse_prompt || manifest.reusePrompt || manifest.reuse_prompt || `Use ${app.name || manifest.name || 'this app'} as the final action app when it fits the order.`).trim()
  };
}

function appManifestSources() {
  const byId = new Map();
  for (const item of [...APP_AGENT_MANIFESTS, ...(Array.isArray(state.registeredApps) ? state.registeredApps : [])]) {
    const normalized = normalizeAppAgentManifest(item);
    if (!normalized) continue;
    const existing = byId.get(normalized.id) || {};
    byId.set(normalized.id, {
      ...existing,
      ...normalized,
      inputContract: { ...(existing.inputContract || {}), ...(normalized.inputContract || {}) },
      contextContract: { ...(existing.contextContract || {}), ...(normalized.contextContract || {}) },
      handoff: { ...(existing.handoff || {}), ...(normalized.handoff || {}) },
      dedicatedDelivery: normalized.dedicatedDelivery || existing.dedicatedDelivery || null
    });
  }
  return [...byId.values()];
}

function appManifestById(id = '') {
  const safeId = normalizeUsageId(id);
  return appManifestSources().find((manifest) => normalizeUsageId(manifest.id) === safeId) || null;
}

function appAgentLaunchUrl(manifestOrEntry = {}, hrefOverride = '') {
  const href = String(hrefOverride || manifestOrEntry.entryUrl || manifestOrEntry.baseUrl || '').trim();
  if (!href) return '';
  try {
    const url = new URL(href, window.location.origin);
    const id = normalizeUsageId(manifestOrEntry.id || '');
    const sameOriginManifest = APP_AGENT_MANIFESTS.some((item) => normalizeUsageId(item.id) === id);
    if (sameOriginManifest && /^(?:www\.)?aiagent-marketplace\.net$/i.test(url.hostname)) {
      return new URL(`${url.pathname}${url.search}${url.hash}`, window.location.origin).toString();
    }
    return url.toString();
  } catch {
    return href;
  }
}

function rememberAppAgentUsage(id = '', details = {}, options = {}) {
  const manifest = appManifestById(id);
  if (!manifest) return null;
  const entry = {
    id: manifest.id,
    name: manifest.name,
    kind: manifest.kind,
    description: manifest.description,
    baseUrl: manifest.baseUrl,
    entryUrl: manifest.entryUrl || manifest.baseUrl,
    capabilities: manifest.capabilities || [],
    requiresApprovalFor: manifest.requiresApprovalFor || [],
    inputContract: manifest.inputContract || null,
    contextIngestUrl: manifest.contextIngestUrl || '',
    handoff: manifest.handoff || null,
    dedicatedDelivery: manifest.dedicatedDelivery || null,
    reusePrompt: manifest.reusePrompt || '',
    ...details,
    lastContext: {
      ...(details.lastContext && typeof details.lastContext === 'object' ? details.lastContext : {}),
      title: compactUsageText(details.lastContext?.title || details.title || '', 140),
      product: compactUsageText(details.lastContext?.product || details.product || '', 140),
      audience: compactUsageText(details.lastContext?.audience || details.audience || '', 180),
      goal: compactUsageText(details.lastContext?.goal || details.goal || '', 140),
      channel: compactUsageText(details.lastContext?.channel || details.channel || '', 140),
      source: compactUsageText(details.lastContext?.source || details.source || '', 140)
    }
  };
  state.appAgentHistory = mergeUsageEntry(state.appAgentHistory, entry, { limit: 24, increment: options.increment !== false });
  return state.appAgentHistory[0] || null;
}

function taskLabel(taskType = '') {
  const safeTask = String(taskType || '').trim().toLowerCase();
  const labels = {
    research_team_leader: 'Research Team Leader',
    build_team_leader: 'Build Team Leader',
    cto_leader: 'CTO Leader',
    cpo_leader: 'CPO Leader',
    cfo_leader: 'CFO Leader',
    legal_leader: 'Legal Leader',
    secretary_leader: 'Secretary Leader',
    research: 'Research Agent',
    teardown: 'Competitor Teardown Agent',
    data_analysis: 'Data Analysis Agent',
    growth: 'Growth Operator Agent',
    media_planner: 'Media Planner Agent',
    writing: 'Writing Agent',
    list_creator: 'List Creator Agent',
    landing: 'Landing Agent',
    seo_specialist: 'SEO Specialist',
    acquisition_automation: 'Acquisition Automation Agent',
    directory_submission: 'Directory Submission Agent',
    x_post: 'X Ops Connector Agent'
  };
  if (labels[safeTask]) return labels[safeTask];
  return safeTask
    ? safeTask.split(/[_\s-]+/).filter(Boolean).map((part) => {
        const segment = String(part || '').trim();
        return segment.length > 0 && segment.length <= 3
          ? segment.toUpperCase()
          : `${segment.slice(0, 1).toUpperCase()}${segment.slice(1)}`;
      }).join(' ')
    : 'AI Agent';
}

function conversationOwnerFromPrepared(value = {}, fallback = {}) {
  const source = value && typeof value === 'object' ? value : {};
  const intake = source.intake && typeof source.intake === 'object' ? source.intake : {};
  const owner = source.conversationOwner
    || source.conversation_owner
    || intake.conversationOwner
    || intake.conversation_owner
    || fallback.conversationOwner
    || {};
  const ownerType = String(owner.type || source.ownerType || source.owner_type || fallback.ownerType || '').trim().toLowerCase();
  const sourceOwnerType = String(
    source.activeOwnerType
    || source.active_owner_type
    || intake.activeOwnerType
    || intake.active_owner_type
    || fallback.activeOwnerType
    || fallback.active_owner_type
    || ''
  ).trim().toLowerCase();
  const effectiveOwnerType = ownerType || sourceOwnerType;
  const sourceOwnerLocked = source.activeOwnerLocked === true
    || source.active_owner_locked === true
    || intake.activeOwnerLocked === true
    || intake.active_owner_locked === true;
  const fallbackOwnerLocked = fallback.activeOwnerLocked === true || fallback.active_owner_locked === true;
  const sourceOwnerTaskType = String(
    source.activeOwnerTaskType
    || source.active_owner_task_type
    || intake.activeOwnerTaskType
    || intake.active_owner_task_type
    || ''
  ).trim().toLowerCase();
  const sourceOwnerName = String(
    source.activeOwnerName
    || source.active_owner_name
    || intake.activeOwnerName
    || intake.active_owner_name
    || ''
  ).trim();
  const sourceLeaderLocked = source.activeLeaderLocked === true
    || source.active_leader_locked === true
    || intake.activeLeaderLocked === true
    || intake.active_leader_locked === true;
  const fallbackLeaderLocked = fallback.activeLeaderLocked === true || fallback.active_leader_locked === true;
  const sourceLeaderTaskType = String(
    source.activeLeaderTaskType
    || source.active_leader_task_type
    || intake.activeLeaderTaskType
    || intake.active_leader_task_type
    || ''
  ).trim().toLowerCase();
  const sourceLeaderName = String(
    source.activeLeaderName
    || source.active_leader_name
    || intake.activeLeaderName
    || intake.active_leader_name
    || ''
  ).trim();
  const fallbackLeaderTaskType = ownerType ? '' : (fallbackLeaderLocked ? fallback.activeLeaderTaskType || '' : '');
  const fallbackLeaderName = ownerType ? '' : (fallbackLeaderLocked ? fallback.activeLeaderName || '' : '');
  const fallbackOwnerTaskType = effectiveOwnerType ? String(fallback.activeOwnerTaskType || fallback.active_owner_task_type || '').trim().toLowerCase() : '';
  const fallbackOwnerName = effectiveOwnerType ? String(fallback.activeOwnerName || fallback.active_owner_name || '').trim() : '';
  const taskType = String(
    owner.taskType
    || owner.task_type
    || (effectiveOwnerType && effectiveOwnerType !== 'leader' ? sourceOwnerTaskType : '')
    || (effectiveOwnerType === 'leader' || sourceLeaderLocked ? sourceLeaderTaskType : '')
    || fallbackOwnerTaskType
    || fallbackLeaderTaskType
    || ''
  ).trim().toLowerCase();
  const label = String(
    owner.label
    || (effectiveOwnerType && effectiveOwnerType !== 'leader' ? sourceOwnerName : '')
    || (effectiveOwnerType === 'leader' || sourceLeaderLocked ? sourceLeaderName : '')
    || fallbackOwnerName
    || fallbackLeaderName
    || (taskType ? taskLabel(taskType) : 'CAIt')
  ).trim();
  const reason = String(owner.reason || source.reason || fallback.reason || '').trim();
  if ((effectiveOwnerType === 'leader' || sourceLeaderLocked || fallbackLeaderLocked) && taskType) {
    return {
      type: 'leader',
      taskType,
      label: label || taskLabel(taskType),
      reason
    };
  }
  if ((effectiveOwnerType === 'agent' || effectiveOwnerType === 'specialist' || sourceOwnerLocked || fallbackOwnerLocked) && taskType) {
    return {
      type: 'agent',
      taskType,
      label: label || taskLabel(taskType),
      reason
    };
  }
  return {
    type: 'cait',
    taskType: '',
    label: 'CAIt',
    reason
  };
}

function normalizeLeaderTaskType(value = '') {
  const token = String(value || '').trim().toLowerCase().replace(/[-]+/g, '_');
  return /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*_leader$/.test(token) ? token : '';
}

function isLeaderTaskType(value = '') {
  return Boolean(normalizeLeaderTaskType(value));
}

function explicitLeaderChangeTaskTypeFromText(value = '') {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  const requested = normalizeLeaderTaskType(text)
    || normalizeLeaderTaskType(text.match(/\b[a-z][a-z0-9]*(?:[_-][a-z0-9]+)*[_-]leader\b/i)?.[0] || '');
  if (!requested) return '';
  const explicitChange = /(?:leader|リーダー|担当|主体|lead|owner|route|routing|use|switch|change|変更|切替|切り替|変え|にして|で進め|でお願い|に戻|に固定|固定|指名|選択)/i.test(text)
    || normalizeLeaderTaskType(text) === requested;
  if (!explicitChange) return '';
  return requested;
}

function leaderOwner(taskType = '', reason = '') {
  const safeTaskType = normalizeLeaderTaskType(taskType);
  if (!safeTaskType) return null;
  return {
    type: 'leader',
    taskType: safeTaskType,
    label: taskLabel(safeTaskType),
    reason: String(reason || '').trim()
  };
}

function rewriteStructuredBriefLeader(value = '', owner = null) {
  const text = String(value || '');
  if (!owner?.taskType || !text || !isStructuredOrderBriefText(text)) return text;
  let next = text.replace(/^Task:\s*.*$/im, `Task: ${owner.taskType}`);
  if (/^Conversation lead:\s*.*$/im.test(next)) {
    next = next.replace(/^Conversation lead:\s*.*$/im, `Conversation lead: ${owner.label || taskLabel(owner.taskType)} (${owner.taskType})`);
  } else {
    next = next.replace(/^Goal:\s*.*$/im, (line) => `${line}\nConversation lead: ${owner.label || taskLabel(owner.taskType)} (${owner.taskType})`);
  }
  return next;
}

function withLeaderOwner(value = {}, owner = null, extras = {}) {
  if (!owner?.taskType) return value;
  const source = value && typeof value === 'object' ? value : {};
  return {
    ...source,
    ...extras,
    taskType: owner.taskType,
    task_type: owner.taskType,
    ...(source.prompt ? { prompt: rewriteStructuredBriefLeader(source.prompt, owner) } : {}),
    conversationOwner: owner,
    activeOwnerType: 'leader',
    active_owner_type: 'leader',
    activeOwnerTaskType: owner.taskType,
    active_owner_task_type: owner.taskType,
    activeOwnerName: owner.label || taskLabel(owner.taskType),
    active_owner_name: owner.label || taskLabel(owner.taskType),
    activeOwnerLocked: true,
    active_owner_locked: true,
    activeLeaderTaskType: owner.taskType,
    active_leader_task_type: owner.taskType,
    activeLeaderName: owner.label || taskLabel(owner.taskType),
    active_leader_name: owner.label || taskLabel(owner.taskType),
    activeLeaderLocked: true,
    active_leader_locked: true
  };
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

function agentOwner(taskType = '', label = '', reason = '') {
  const safeTaskType = String(taskType || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (!safeTaskType || isLeaderTaskType(safeTaskType)) return null;
  return {
    type: 'agent',
    taskType: safeTaskType,
    label: String(label || taskLabel(safeTaskType)).trim() || taskLabel(safeTaskType),
    reason: String(reason || '').trim()
  };
}

function lockedAgentOwnerForPrompt(prompt = '', options = {}) {
  if (!state.activeOwnerLocked || state.activeOwner?.type !== 'agent' || !state.activeOwner?.taskType) return null;
  if (options.allowLeaderChange === true || options.leaderChangeRequested === true || explicitLeaderChangeTaskTypeFromText(prompt)) return null;
  return agentOwner(state.activeOwner.taskType, state.activeOwner.label, state.activeOwner.reason || 'Agent already confirmed in this chat.');
}

function currentLockedConversationOwner() {
  return currentLockedLeaderOwner() || lockedAgentOwnerForPrompt('', {});
}

function withConversationOwner(value = {}, owner = null, extras = {}) {
  if (!owner?.taskType) return value;
  if (owner.type === 'leader') return withLeaderOwner(value, owner, extras);
  const source = value && typeof value === 'object' ? value : {};
  const label = owner.label || taskLabel(owner.taskType);
  return {
    ...source,
    ...extras,
    taskType: owner.taskType,
    task_type: owner.taskType,
    conversationOwner: owner,
    activeOwnerType: 'agent',
    active_owner_type: 'agent',
    activeOwnerTaskType: owner.taskType,
    active_owner_task_type: owner.taskType,
    activeOwnerName: label,
    active_owner_name: label,
    activeOwnerLocked: true,
    active_owner_locked: true,
    activeLeaderTaskType: '',
    active_leader_task_type: '',
    activeLeaderName: '',
    active_leader_name: '',
    activeLeaderLocked: false,
    active_leader_locked: false
  };
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

function sameConversationOwner(left = {}, right = {}) {
  return String(left?.type || '') === String(right?.type || '')
    && String(left?.taskType || '') === String(right?.taskType || '')
    && String(left?.label || '') === String(right?.label || '');
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

function agentUsageKey(entry = {}) {
  return normalizeUsageId(entry.agentId || `${entry.taskType || 'agent'}-${entry.name || ''}`);
}

function rememberAiAgentUsage(entry = {}, options = {}) {
  const taskType = String(entry.taskType || entry.task_type || '').trim().toLowerCase();
  const name = String(entry.name || entry.agentName || taskLabel(taskType)).trim() || 'AI Agent';
  const id = agentUsageKey({ ...entry, taskType, name });
  if (!id) return null;
  const safeEntry = {
    id,
    name,
    agentId: String(entry.agentId || '').trim(),
    taskType,
    route: String(entry.route || '').trim(),
    status: String(entry.status || '').trim(),
    source: String(entry.source || '').trim() || 'chatux',
    originalPrompt: compactUsageText(entry.originalPrompt || entry.prompt || '', 900),
    reusePrompt: compactUsageText(entry.reusePrompt || entry.originalPrompt || entry.prompt || '', 900),
    lastOrderId: String(entry.lastOrderId || entry.orderId || '').trim(),
    summary: compactUsageText(entry.summary || '', 260)
  };
  state.aiAgentHistory = mergeUsageEntry(state.aiAgentHistory, safeEntry, { limit: 48, increment: options.increment !== false });
  return state.aiAgentHistory[0] || null;
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

function safeFileName(value = '', fallback = 'delivery.md') {
  const raw = String(value || fallback || 'delivery.md').trim() || 'delivery.md';
  const cleaned = raw
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-')
    .replace(/\s+/g, ' ')
    .slice(0, 140)
    .trim();
  return cleaned || fallback || 'delivery.md';
}

function fileMimeType(name = '', content = '') {
  if (/\.html?$/i.test(name) || /<!doctype html|<html[\s>]/i.test(content)) return 'text/html;charset=utf-8';
  if (/\.(md|markdown|mdx)$/i.test(name)) return 'text/markdown;charset=utf-8';
  if (/\.json$/i.test(name)) return 'application/json;charset=utf-8';
  return 'text/plain;charset=utf-8';
}

const USER_DELIVERY_INTERNAL_MARKERS = [
  '=== workflow handoff context ===',
  '=== workflow additional prompt ===',
  '=== end workflow handoff context ===',
  'canonical user brief',
  'process program',
  'structured handoff digest',
  'prior specialist deliverables',
  'prior specialist deliverable:',
  'required output behavior:'
];

const USER_DELIVERY_INTERNAL_SECTION_TITLES = new Set([
  'request',
  'workflow handoff context',
  'workflow additional prompt',
  'agent-owned behavior',
  'expected output sections',
  'input needs',
  'acceptance checks',
  'scope boundaries',
  'specialist method',
  'delivery packet',
  'review notes',
  'original information used',
  'upstream work used',
  '受け渡し情報の利用',
  'braveソース由来の補助分析',
  'agent handoff',
  '下流エージェント用handoff packet',
  '後続エージェントへの制約',
  '信頼性と品質保証',
  '補助成果物',
  'specialist成果物プレビュー',
  '実行ステータス',
  'supporting work products',
  'delivered content summaries'
]);

function cleanDeliverySectionTitle(line = '') {
  return String(line || '')
    .replace(/^#{1,6}\s+/, '')
    .replace(/\*\*/g, '')
    .replace(/[:：]\s*$/, '')
    .trim()
    .toLowerCase();
}

function deliveryLineLooksInternal(line = '') {
  const text = String(line || '').toLowerCase();
  return /provider\.runjob|agent-file provider implementation|agent_file_provider_delivery|central built-in runner|future behavior changes should be made|共通\s*builtin\s*runner|agent ファイル内の provider|agent ファイルの provider 実装|handoff evidence attached|leader-owned prior work|external posting, sending, ad launch|leader checkpoint|deliveryで表示される要約|trust profile|根拠ゲート|実行ゲート|品質ゲート|受け入れ条件|レビュー条件|未保証|source run\s*:|_file content is available/.test(text);
}

function deliveryContentLooksTemplateOnly(content = '') {
  const text = String(content || '').trim();
  if (!text) return true;
  const nonHeadingLines = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !/^#{1,6}\s+/.test(line));
  if (!nonHeadingLines.length) return true;
  return /(^|\n)##\s+Delivery packet\s*\n\s*Write sections for/i.test(text)
    && !/(answer first|evidence used|evidence status|decision first|seo page recommendation|replacement copy|hero copy|body draft|final delivery first|target and inputs|data quality check|measurement plan|next action)/i.test(text);
}

function sanitizeDeliveryMarkdownForUser(content = '') {
  const raw = String(content || '').replace(/\r\n/g, '\n');
  if (!raw.trim()) return '';
  let text = raw
    .replace(/=== WORKFLOW HANDOFF CONTEXT ===[\s\S]*?=== END WORKFLOW HANDOFF CONTEXT ===/gi, '')
    .replace(/=== WORKFLOW ADDITIONAL PROMPT ===[\s\S]*?(?=\n#{1,6}\s|\n\*\*|$)/gi, '');
  const lines = text.split('\n');
  const kept = [];
  let skipping = false;
  let skipFence = false;
  for (const line of lines) {
    const trimmed = line.trim();
    const lower = trimmed.toLowerCase();
    if (lower === '```markdown' && skipping) {
      skipFence = true;
      continue;
    }
    if (skipFence) {
      if (lower === '```') skipFence = false;
      continue;
    }
    if (USER_DELIVERY_INTERNAL_MARKERS.some((marker) => lower.includes(marker))) {
      skipping = true;
      continue;
    }
    const heading = trimmed.match(/^#{1,6}\s+(.+)$/);
    if (heading) {
      const title = cleanDeliverySectionTitle(trimmed);
      if (USER_DELIVERY_INTERNAL_SECTION_TITLES.has(title) || title.startsWith('prior specialist deliverable')) {
        skipping = true;
        continue;
      }
      skipping = false;
    }
    if (skipping || deliveryLineLooksInternal(line)) continue;
    kept.push(line);
  }
  const cleaned = kept.join('\n')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  if (!deliveryContentLooksTemplateOnly(cleaned)) return cleaned;
  return '';
}

function sanitizeDeliveryFileForUser(file = {}, fallbackName = 'delivery.md') {
  const rawContent = String(file?.content || file?.body || '');
  const content = sanitizeDeliveryMarkdownForUser(rawContent);
  const name = safeFileName(file?.name || file?.filename || fallbackName, fallbackName);
  return {
    ...(file && typeof file === 'object' ? file : {}),
    name,
    content,
    type: String(file?.type || fileMimeType(name, content)).trim() || fileMimeType(name, content)
  };
}

function isInternalDeliveryFile(file = {}) {
  const name = String(file?.name || file?.filename || '').trim().toLowerCase();
  const content = String(file?.content || file?.body || '').trim();
  const contentType = String(file?.content_type || file?.contentType || '').trim().toLowerCase();
  const visibility = String(file?.visibility || file?.delivery_visibility || file?.deliveryVisibility || '').trim().toLowerCase();
  if (file?.internal === true || file?.user_visible === false || file?.userVisible === false || file?.delivery_visible === false || file?.deliveryVisible === false) return true;
  if (['internal', 'hidden', 'system'].includes(visibility)) return true;
  if ([
    'supporting_specialist_deliverables',
    'workflow_integrated_delivery',
    'partial_workflow_delivery',
    'all_deliverables_bundle',
    'review_ready_delivery'
  ].includes(contentType)) return true;
  if (name === 'supporting-specialist-deliverables.md') return true;
  if (name === 'integrated-delivery.md' && /#\s+Integrated delivery|##\s+Supporting work products|##\s+Integrated next actions/i.test(content)) return true;
  if (name === 'workflow-partial-delivery.md') return true;
  if (name === 'all-deliverables.md' || /^all-deliverables-[^.]+\.md$/i.test(name)) return true;
  if (name === 'review-ready-delivery.md' || /^review-ready-delivery-[^.]+\.md$/i.test(name)) return true;
  return false;
}

function visibleDeliveryFiles(files = []) {
  return (Array.isArray(files) ? files : []).filter((file) => file && !isInternalDeliveryFile(file));
}

function explicitDeliveryFilePriority(file = {}) {
  const values = [
    file?.delivery_priority,
    file?.deliveryPriority,
    file?.display_priority,
    file?.displayPriority,
    file?.sort_order,
    file?.sortOrder
  ];
  for (const value of values) {
    if (value == null || value === '') continue;
    const number = Number(value);
    if (Number.isFinite(number)) return number;
  }
  return null;
}

function deliveryFilePriority(file = {}) {
  const explicit = explicitDeliveryFilePriority(file);
  if (explicit != null) return explicit;
  if (file?.execution_candidate === true || file?.executionCandidate === true) return 0;
  const roleText = [
    file?.delivery_role,
    file?.deliveryRole,
    file?.source_role,
    file?.sourceRole,
    file?.role,
    file?.phase,
    file?.source_phase,
    file?.sourcePhase
  ].map((item) => String(item || '').trim().toLowerCase()).filter(Boolean).join('\n');
  if (/(^|\b)(final|primary|selected|recommended|summary|user[-_\s]?facing)(\b|$)/.test(roleText)) return 10;
  if (/(^|\b)(supporting|appendix|evidence|source|raw|diagnostic|internal)(\b|$)/.test(roleText)) return 80;
  return 60;
}

function cleanReadableBundleContent(value = '') {
  const lines = String(value || '').replace(/\r\n/g, '\n').split('\n');
  const result = [];
  let skip = false;
  for (const line of lines) {
    if (/^\s*-?\s*Source run\s*:/i.test(line)) continue;
    if (/^\s*This bundle is copied into the parent delivery/i.test(line)) continue;
    if (/^\s*This file contains the completed Markdown deliverables/i.test(line)) continue;
    const heading = line.match(/^(#{1,6})\s+(.+?)\s*$/);
    if (heading) {
      const level = heading[1].length;
      const title = heading[2].trim();
      const noisy = (
        /^Original information used$/i.test(title)
        || /^Upstream work used$/i.test(title)
        || /^受け渡し情報の利用$/i.test(title)
        || /^Braveソース由来の補助分析$/i.test(title)
        || /^Agent handoff$/i.test(title)
        || /^下流エージェント用handoff packet$/i.test(title)
        || /^Downstream handoff$/i.test(title)
        || /^後続エージェントへの制約$/i.test(title)
      );
      if (noisy) {
        skip = true;
        continue;
      }
      if (skip && level <= 2) skip = false;
    }
    if (skip) continue;
    result.push(line);
  }
  return result.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function registerDeliveryFile(file = {}, fallbackName = 'delivery.md') {
  const sanitized = sanitizeDeliveryFileForUser(file, fallbackName);
  const name = safeFileName(sanitized.name || fallbackName, fallbackName);
  const content = String(sanitized.content || '');
  const id = `file-${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 10)}`;
  deliveryFileStore.set(id, {
    ...(sanitized && typeof sanitized === 'object' ? sanitized : {}),
    name,
    content,
    type: String(sanitized.type || fileMimeType(name, content)).trim() || fileMimeType(name, content)
  });
  while (deliveryFileStore.size > 80) {
    const first = deliveryFileStore.keys().next().value;
    if (!first) break;
    deliveryFileStore.delete(first);
  }
  return { ...(sanitized && typeof sanitized === 'object' ? sanitized : {}), id, name, content };
}

async function copyTextToClipboard(text = '') {
  const value = String(text || '');
  if (navigator.clipboard?.writeText && window.isSecureContext) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  textarea.remove();
}

function downloadTextFile(file = {}) {
  const content = String(file.content || '');
  const name = safeFileName(file.name || 'delivery.md', 'delivery.md');
  const blob = new Blob([content], { type: String(file.type || fileMimeType(name, content)) });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function combinedMarkdownFile(files = []) {
  const sections = (Array.isArray(files) ? files : [])
    .map((file, index) => {
      const sanitized = sanitizeDeliveryFileForUser(file, `delivery-${index + 1}.md`);
      const name = safeFileName(sanitized.name || `delivery-${index + 1}.md`, `delivery-${index + 1}.md`);
      const content = String(sanitized.content || '').trim();
      if (!content) return '';
      const fence = /\.html?$/i.test(name) ? 'html' : (/\.json$/i.test(name) ? 'json' : 'markdown');
      return [`## ${name}`, '', `\`\`\`${fence}`, content, '```'].join('\n');
    })
    .filter(Boolean);
  return {
    name: `delivery-bundle-${new Date().toISOString().slice(0, 10)}.md`,
    type: 'text/markdown;charset=utf-8',
    content: ['# Delivery bundle', '', ...sections].join('\n')
  };
}

function looksJapanese(value = '') {
  return /[\u3040-\u30ff\u3400-\u9fff]/.test(String(value || ''));
}

function chatLanguage(sample = '') {
  if (state.conversationLanguage) return state.conversationLanguage;
  const pageLanguage = String(document.documentElement?.lang || '').toLowerCase();
  if (pageLanguage.startsWith('ja')) return 'ja';
  return 'en';
}

function chatText(en, ja, sample = '') {
  return chatLanguage(sample) === 'ja' ? ja : en;
}

function chatUiLanguage() {
  const pageLanguage = String(document.documentElement?.lang || '').toLowerCase();
  return pageLanguage.startsWith('ja') ? 'ja' : 'en';
}

function chatUiText(en, ja) {
  return chatUiLanguage() === 'ja' ? ja : en;
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

function appendThinkingMessage(sample = '') {
  const article = appendTextMessage('assistant', chatText('Thinking...', '考え中...', sample), {
    tone: 'thinking',
    label: 'CAIt',
    record: false
  });
  article.dataset.transient = 'thinking';
  article.setAttribute('aria-live', 'polite');
  return article;
}

function progressNarratorHtml(text = '', options = {}) {
  return agentProgressNarratorHtml(text, {
    ...options,
    language: state.conversationLanguage,
    isJapanese: (sample) => chatLanguage(sample) === 'ja',
    escapeHtml
  });
}

function progressNarratorProgress(options = {}) {
  return agentProgressNarratorProgress(options);
}

function progressNarratorProgressLabel(options = {}, progress = progressNarratorProgress(options)) {
  return agentProgressNarratorProgressLabel(options, progress);
}

function progressNarratorStreamSegments(text = '', options = {}) {
  return agentProgressNarratorStreamSegments(text, {
    ...options,
    language: state.conversationLanguage,
    isJapanese: (sample) => chatLanguage(sample) === 'ja'
  });
}

function progressNarratorStreamText(text = '', options = {}, frame = 0) {
  return agentProgressNarratorStreamText(text, {
    ...options,
    language: state.conversationLanguage,
    isJapanese: (sample) => chatLanguage(sample) === 'ja'
  }, frame);
}

function durationLabel(ms = 0, sample = '') {
  const safeMs = Math.max(0, Number(ms || 0) || 0);
  const totalSec = Math.round(safeMs / 1000);
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  const ja = chatLanguage([sample, state.conversationLanguage].join(' ')) === 'ja';
  if (minutes <= 0) return ja ? `${seconds}秒` : `${seconds}s`;
  if (minutes < 60) return ja ? `${minutes}分${seconds ? `${seconds}秒` : ''}` : `${minutes}m${seconds ? ` ${seconds}s` : ''}`;
  const hours = Math.floor(minutes / 60);
  const restMinutes = minutes % 60;
  return ja ? `${hours}時間${restMinutes ? `${restMinutes}分` : ''}` : `${hours}h${restMinutes ? ` ${restMinutes}m` : ''}`;
}

function timestampMs(value = '') {
  const ms = Date.parse(String(value || ''));
  return Number.isFinite(ms) ? ms : 0;
}

function workflowRunWaitStatus(run = {}, job = {}) {
  if (!run || typeof run !== 'object') return null;
  const sample = [
    state.conversationLanguage,
    job.prompt,
    run.taskType,
    run.agentName,
    run.latestLog,
    run.dispatchCompletionStatus
  ].join(' ');
  const ja = chatLanguage(sample) === 'ja';
  const status = String(run.status || '').trim().toLowerCase();
  const dispatchStatus = String(run.dispatchCompletionStatus || run.dispatch_completion_status || run.dispatch?.completionStatus || '').trim().toLowerCase();
  const activeStatuses = new Set(['queued', 'running', 'claimed', 'dispatched']);
  if (!activeStatuses.has(status) && !['dispatch_scheduled', 'dispatch_in_progress', 'accepted'].includes(dispatchStatus)) return null;
  const at = timestampMs(
    dispatchStatus === 'dispatch_in_progress'
      ? (run.dispatchInProgressAt || run.dispatch_in_progress_at || run.startedAt)
      : dispatchStatus === 'dispatch_scheduled'
        ? (run.dispatchRequestedAt || run.dispatch_requested_at || run.startedAt || run.createdAt)
        : dispatchStatus === 'accepted'
          ? (run.providerQueueAcceptedAt || run.provider_queue_accepted_at || run.dispatchedAt || run.startedAt)
          : (run.startedAt || run.dispatchedAt || run.createdAt)
  );
  const elapsedMs = at ? Math.max(0, Date.now() - at) : 0;
  const elapsed = elapsedMs ? durationLabel(elapsedMs, sample) : '';
  const timeoutMs = Math.max(0, Number(run.dispatchTimeoutMs || run.dispatch_timeout_ms || run.dispatch?.dispatchTimeoutMs || 0) || 0);
  const windowLabel = timeoutMs ? durationLabel(timeoutMs, sample) : '';
  if (dispatchStatus === 'dispatch_in_progress') {
    return {
      text: ja ? 'が納品物を生成中です' : 'is generating the deliverable',
      detail: ja
        ? `経過 ${elapsed || '確認中'}${windowLabel ? `。待機目安 ${windowLabel} 内です` : '。生成完了を待っています'}。`
        : `Elapsed ${elapsed || 'checking'}${windowLabel ? `; still inside the ${windowLabel} wait window` : '; waiting for generation to finish'}.`,
      step: ja ? '生成 provider の応答待ち' : 'Waiting for the generation provider response',
      progressLabelSuffix: elapsed || ''
    };
  }
  if (dispatchStatus === 'dispatch_scheduled') {
    return {
      text: ja ? 'を実行キューへ渡しています' : 'is being handed to the agent runtime',
      detail: ja
        ? `${elapsed ? `${elapsed}前に` : ''}dispatch を予約しました。拾われない場合は進捗チェックが再投入します。`
        : `Dispatch was scheduled${elapsed ? ` ${elapsed} ago` : ''}. Progress checks will requeue it if the runtime misses it.`,
      step: ja ? 'dispatch 予約済み' : 'Dispatch scheduled',
      progressLabelSuffix: elapsed || ''
    };
  }
  if (dispatchStatus === 'accepted' || status === 'dispatched') {
    return {
      text: ja ? 'の実行結果を待っています' : 'is waiting for the run result',
      detail: ja
        ? `実行側が受理済みです${elapsed ? `。経過 ${elapsed}` : ''}。`
        : `The agent runtime accepted the job${elapsed ? `; elapsed ${elapsed}` : ''}.`,
      step: ja ? '実行側の結果待ち' : 'Waiting for agent result',
      progressLabelSuffix: elapsed || ''
    };
  }
  if (status === 'running' || status === 'claimed') {
    return {
      text: ja ? 'が処理中です' : 'is working',
      detail: elapsed ? (ja ? `処理開始から ${elapsed} 経過しています。` : `Running for ${elapsed}.`) : '',
      step: ja ? '処理中' : 'Agent running',
      progressLabelSuffix: elapsed || ''
    };
  }
  return null;
}

function stopProgressNarratorAnimation(article = null) {
  if (article && state.progressNarratorTimerArticle && state.progressNarratorTimerArticle !== article) return;
  if (state.progressNarratorTimer) window.clearInterval(state.progressNarratorTimer);
  state.progressNarratorTimer = null;
  state.progressNarratorTimerArticle = null;
}

function syncProgressNarratorAnimation(article, text = '', options = {}) {
  if (!article) return;
  const streamNode = article.querySelector('[data-progress-narrator-stream]');
  if (!streamNode) return;
  article.dataset.progressNarratorText = String(text || '');
  article.dataset.progressNarratorOptions = JSON.stringify({
    detail: String(options.detail || ''),
    phase: String(options.phase || ''),
    status: String(options.status || ''),
    steps: Array.isArray(options.steps) ? options.steps.slice(0, 4) : []
  });
  if (options.done === true) {
    streamNode.textContent = progressNarratorStreamText(text, options, 0);
    streamNode.classList.add('done');
    stopProgressNarratorAnimation(article);
    return;
  }
  streamNode.classList.remove('done');
  const renderFrame = () => {
    if (!article.isConnected) {
      stopProgressNarratorAnimation(article);
      return;
    }
    const frame = Number(article.dataset.progressNarratorFrame || 0) + 1;
    article.dataset.progressNarratorFrame = String(frame);
    let parsed = {};
    try {
      parsed = JSON.parse(article.dataset.progressNarratorOptions || '{}');
    } catch {
      parsed = {};
    }
    streamNode.textContent = progressNarratorStreamText(article.dataset.progressNarratorText || text, parsed, frame);
  };
  renderFrame();
  if (state.progressNarratorTimerArticle !== article) {
    stopProgressNarratorAnimation();
    state.progressNarratorTimerArticle = article;
    state.progressNarratorTimer = window.setInterval(renderFrame, 820);
  }
}

function updateProgressNarratorArticle(article, text = '', options = {}) {
  if (!article) return;
  const textNode = article.querySelector('[data-progress-narrator-text]');
  const detailNode = article.querySelector('[data-progress-narrator-detail]');
  const metaNode = article.querySelector('[data-progress-narrator-meta]');
  const stepsNode = article.querySelector('[data-progress-narrator-steps]');
  const barNode = article.querySelector('.progress-narrator-bar');
  const barLabelNode = article.querySelector('[data-progress-narrator-bar-label]');
  if (textNode) textNode.textContent = String(text || 'Working through the order...');
  const progress = progressNarratorProgress(options);
  if (barNode) {
    barNode.style.setProperty('--progress-value', `${progress.percent}%`);
    barNode.setAttribute('aria-valuenow', String(progress.percent));
    barNode.classList.toggle('complete', progress.percent >= 100 || options.done === true);
  }
  if (barLabelNode) barLabelNode.textContent = progressNarratorProgressLabel(options, progress);
  if (detailNode) {
    const detail = String(options.detail || '').trim();
    detailNode.textContent = detail;
    detailNode.hidden = !detail;
  }
  if (metaNode) {
    const meta = [options.phase, options.status].map((item) => String(item || '').trim()).filter(Boolean).join(' / ');
    metaNode.textContent = meta;
    metaNode.hidden = !meta;
  }
  if (stepsNode) {
    const steps = Array.isArray(options.steps) ? options.steps.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 4) : [];
    stepsNode.innerHTML = steps.map((step) => `<span>${escapeHtml(step)}</span>`).join('');
    stepsNode.hidden = !steps.length;
  }
  article.classList.toggle('ok', options.done === true);
  syncProgressNarratorAnimation(article, text, options);
}

function showProgressNarrator(text = '', options = {}) {
  const key = String(options.key || state.orderId || 'progress').trim();
  const shouldScroll = options.forceScroll === true || threadIsNearBottom();
  if (!state.progressNarratorArticle || !state.progressNarratorArticle.isConnected || (key && state.progressNarratorKey !== key)) {
    state.progressNarratorArticle = appendMessage('assistant', progressNarratorHtml(text, options), {
      tone: options.done ? 'ok' : 'thinking',
      label: options.label || 'CAIt',
      record: false,
      forceScroll: shouldScroll
    });
    state.progressNarratorKey = key;
    syncProgressNarratorAnimation(state.progressNarratorArticle, text, options);
    return state.progressNarratorArticle;
  }
  updateProgressNarratorArticle(state.progressNarratorArticle, text, options);
  if (shouldScroll) scrollThread({ force: true });
  return state.progressNarratorArticle;
}

function stopLiveProgressNarrator(text = '', options = {}) {
  const article = state.progressNarratorArticle && state.progressNarratorArticle.isConnected
    ? state.progressNarratorArticle
    : null;
  const key = String(options.key || '').trim();
  if (key) state.progressNarratorKey = key;
  if (!article) {
    stopProgressNarratorAnimation();
    state.progressNarratorArticle = null;
    state.progressNarratorKey = '';
    return null;
  }
  const textNode = article.querySelector('[data-progress-narrator-text]');
  const finalText = String(text || textNode?.textContent || 'Progress stopped.').trim();
  updateProgressNarratorArticle(article, finalText, { ...options, done: true });
  return article;
}

function markLiveProgressStopped(orderId = '') {
  const safeId = String(orderId || state.orderId || '').trim();
  if (safeId) state.liveProgressStoppedOrderIds.add(safeId);
}

function resumeLiveProgress(orderId = '') {
  const safeId = String(orderId || state.orderId || '').trim();
  if (safeId) state.liveProgressStoppedOrderIds.delete(safeId);
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

function progressNarratorTextForJob(job = {}) {
  const current = workflowCurrentChildRun(job);
  const phase = String(current?.sequencePhase || current?.sequence_phase || '').trim().toLowerCase();
  const agent = workflowChildDisplayLabel(current || {});
  const status = String(current?.status || job.status || '').trim().toLowerCase();
  const phaseLabel = workflowPhaseLabel(phase);
  const wait = workflowRunWaitStatus(current, job);
  if (current && wait?.text) {
    const sentenceEnd = chatLanguage([state.conversationLanguage, wait.text].join(' ')) === 'ja' ? '。' : '.';
    return `${phaseLabel}: ${agent || 'Agent'} ${wait.text}${sentenceEnd}`;
  }
  if (current) return `${phaseLabel}: ${agent || 'Agent'} is ${statusDisplayLabel(status || 'queued').toLowerCase()}.`;
  if (status === 'completed') return 'The order is complete. Preparing the delivery for this chat.';
  if (status === 'failed' || status === 'timed_out') return 'The order stopped. Collecting the failure reason and next step.';
  return 'CAIt is updating the agent map.';
}

function progressNarratorOptionsForJob(job = {}) {
  const current = workflowCurrentChildRun(job);
  const counts = workflowAgentProgressCounts(job);
  const total = counts.total;
  const completed = counts.completed;
  const phase = workflowPhaseLabel(current?.sequencePhase || current?.sequence_phase || '');
  const status = statusDisplayLabel(job.status || 'running');
  const wait = workflowRunWaitStatus(current, job);
  const progressLabel = total ? `${completed}/${total} agents${wait?.progressLabelSuffix ? ` · ${wait.progressLabelSuffix}` : ''}` : status;
  return {
    key: String(job.id || state.orderId || 'progress'),
    phase,
    status,
    detail: wait?.detail || (current ? `Current: ${workflowChildDisplayLabel(current)} / ${statusDisplayLabel(current.status || 'queued')}` : ''),
    total,
    completed,
    progressPercent: isTerminalStatus(job.status)
      ? 100
      : (total ? Math.max(8, Math.min(96, Math.round((completed / total) * 100))) : 12),
    progressLabel,
    steps: [
      total ? `${completed}/${total} agent runs complete` : '',
      wait?.step || '',
      job.failureReason || job.failure_reason || ''
    ].filter(Boolean),
    done: isTerminalStatus(job.status)
  };
}

function statusLabel(job = {}) {
  const status = String(job.status || '').trim() || 'created';
  if (jobBlockedByLeaderQualityGate(job)) {
    const location = workflowCurrentLocationLabel(job);
    return `blocked by quality gate${location ? `, now: ${location}` : ''}`;
  }
  const visibleStatus = statusDisplayLabel(status);
  if (job.jobKind === 'workflow' || job.workflow) {
    const counts = workflowAgentProgressCounts(job);
    const total = counts.total;
    const completed = counts.completed;
    const blocked = counts.blocked;
    const failed = counts.failed;
    const location = workflowCurrentLocationLabel(job);
    const suffix = total ? `, ${completed}/${total} agent runs complete${blocked ? `, ${blocked} waiting` : ''}${failed ? `, ${failed} failed` : ''}` : '';
    return `${visibleStatus}${suffix}${location ? `, now: ${location}` : ''}`;
  }
  return visibleStatus;
}

function workflowAgentProgressCounts(job = {}) {
  const workflow = job?.workflow && typeof job.workflow === 'object' ? job.workflow : {};
  const sourceCounts = workflow.agentStatusCounts && typeof workflow.agentStatusCounts === 'object'
    ? workflow.agentStatusCounts
    : (workflow.statusCounts && typeof workflow.statusCounts === 'object' ? workflow.statusCounts : {});
  const agentRuns = createdOrderChildRuns(job, { includeAdaptivePending: true });
  const runCount = agentRuns.length;
  const total = Math.max(
    Number(sourceCounts.total || 0) || 0,
    Number(workflow.plannedAgentRunCount || 0) || 0,
    Number(workflow.plannedCandidateAgentRunCount || 0) || 0,
    runCount
  );
  const countRuns = (predicate) => agentRuns.filter(predicate).length;
  const completed = Math.max(
    Number(sourceCounts.completed || 0) || 0,
    countRuns((child) => String(child.status || '').trim().toLowerCase() === 'completed')
  );
  const blocked = Math.max(
    Number(sourceCounts.blocked || 0) || 0,
    countRuns((child) => !child.adaptivePending && String(child.status || '').trim().toLowerCase() === 'blocked')
  );
  const failed = Math.max(
    Number(sourceCounts.failed || 0) || 0,
    countRuns((child) => ['failed', 'timed_out'].includes(String(child.status || '').trim().toLowerCase()))
  );
  return {
    total,
    completed: total ? Math.min(completed, total) : completed,
    blocked: total ? Math.min(blocked, total) : blocked,
    failed: total ? Math.min(failed, total) : failed
  };
}

function workflowChildIsInternalLeaderSequenceRun(child = {}) {
  const phase = String(child.sequencePhase || child.sequence_phase || '').trim().toLowerCase();
  const task = String(child.taskType || child.workflowTask || child.dispatchTaskType || '').trim().toLowerCase();
  return ['checkpoint', 'final_summary'].includes(phase) && task.endsWith('_leader');
}

function workflowChildIsAdaptivePending(child = {}) {
  return child?.adaptivePending === true
    || child?.adaptive_pending === true
    || String(child?.dispatchCompletionStatus || child?.dispatch_completion_status || '').trim().toLowerCase() === 'leader_adaptive_pending';
}

function visibleWorkflowChildRuns(childRuns = [], options = {}) {
  return (Array.isArray(childRuns) ? childRuns : [])
    .filter((child) => options.includeInternalLeaderSequence === true || !workflowChildIsInternalLeaderSequenceRun(child))
    .filter((child) => options.includeAdaptivePending === true || !workflowChildIsAdaptivePending(child));
}

function workflowPhaseLabel(phase = '') {
  const safe = String(phase || '').trim().toLowerCase();
  const labels = {
    initial: 'Leader review',
    data: 'Data',
    research: 'Research',
    checkpoint: 'Leader checkpoint',
    planning: 'Planning',
    product_design: 'Product design',
    preparation: 'Preparation',
    action: 'Action',
    prompt_handoff: 'Action handoff',
    final_summary: 'Final summary',
    leader: 'Leader',
    summary: 'Summary'
  };
  return labels[safe] || (safe ? safe.replace(/_/g, ' ') : 'Workflow');
}

function workflowPhaseRank(phase = '') {
  const safe = String(phase || '').trim().toLowerCase();
  return { initial: 1, data: 2, research: 3, checkpoint: 3.5, product_design: 4, planning: 4, preparation: 5, prompt_handoff: 6, action: 6, final_summary: 7, summary: 7 }[safe] || 9;
}

function workflowChildStatusRank(status = '') {
  const safe = String(status || '').trim().toLowerCase();
  return { running: 1, claimed: 1, dispatched: 1, queued: 2, blocked: 3, completed: 8, failed: 9, timed_out: 9 }[safe] || 5;
}

function workflowChildDisplayLabel(child = {}) {
  return String(child.agentName || child.agent_name || taskLabel(child.taskType || child.task_type || child.dispatchTaskType || child.dispatch_task_type || 'work')).trim();
}

function workflowCurrentChildRun(job = {}) {
  const childRuns = createdOrderChildRuns(job);
  if (!childRuns.length) return '';
  const internalLeaderActive = createdOrderChildRuns(job, { includeInternalLeaderSequence: true })
    .filter((child) => workflowChildIsInternalLeaderSequenceRun(child))
    .filter((child) => ['running', 'claimed', 'dispatched', 'queued'].includes(String(child.status || '').trim().toLowerCase()))
    .sort((left, right) => (
      workflowChildStatusRank(left.status) - workflowChildStatusRank(right.status)
      || workflowPhaseRank(left.sequencePhase || left.sequence_phase) - workflowPhaseRank(right.sequencePhase || right.sequence_phase)
    ));
  if (internalLeaderActive[0]) return internalLeaderActive[0];
  const active = childRuns
    .filter((child) => ['running', 'claimed', 'dispatched'].includes(String(child.status || '').trim().toLowerCase()))
    .sort((left, right) => (
      workflowChildStatusRank(left.status) - workflowChildStatusRank(right.status)
      || workflowPhaseRank(left.sequencePhase || left.sequence_phase) - workflowPhaseRank(right.sequencePhase || right.sequence_phase)
    ));
  const queued = childRuns
    .filter((child) => String(child.status || '').trim().toLowerCase() === 'queued')
    .sort((left, right) => workflowPhaseRank(left.sequencePhase || left.sequence_phase) - workflowPhaseRank(right.sequencePhase || right.sequence_phase));
  const blockedOrFailed = childRuns
    .filter((child) => ['blocked', 'failed', 'timed_out'].includes(String(child.status || '').trim().toLowerCase()))
    .sort((left, right) => workflowPhaseRank(left.sequencePhase || left.sequence_phase) - workflowPhaseRank(right.sequencePhase || right.sequence_phase));
  const completed = childRuns
    .filter((child) => String(child.status || '').trim().toLowerCase() === 'completed')
    .sort((left, right) => workflowPhaseRank(right.sequencePhase || right.sequence_phase) - workflowPhaseRank(left.sequencePhase || left.sequence_phase));
  return active[0] || queued[0] || blockedOrFailed[0] || completed[0] || null;
}

function workflowCurrentLocationLabel(job = {}) {
  const current = workflowCurrentChildRun(job);
  if (!current) return '';
  const phase = workflowPhaseLabel(current.sequencePhase || current.sequence_phase);
  const agent = workflowChildDisplayLabel(current);
  const status = statusDisplayLabel(current.status || 'queued');
  return `${phase} / ${agent} / ${status}`;
}

function workflowCurrentPhaseKey(job = {}) {
  const current = workflowCurrentChildRun(job);
  return String(current?.sequencePhase || current?.sequence_phase || '').trim().toLowerCase();
}

function createdOrderChildRuns(created = {}, options = {}) {
  const raw = Array.isArray(created?.child_runs)
    ? created.child_runs
    : (Array.isArray(created?.childRuns)
      ? created.childRuns
      : (Array.isArray(created?.workflow?.childRuns) ? created.workflow.childRuns : []));
  return visibleWorkflowChildRuns(raw, options).map((child) => ({
    id: String(child.id || child.job_id || child.jobId || '').trim(),
    taskType: String(child.taskType || child.task_type || child.dispatchTaskType || child.dispatch_task_type || '').trim(),
    dispatchTaskType: String(child.dispatchTaskType || child.dispatch_task_type || child.taskType || child.task_type || '').trim(),
    agentId: String(child.agentId || child.agent_id || '').trim(),
    agentName: String(child.agentName || child.agent_name || '').trim(),
    sequencePhase: String(child.sequencePhase || child.sequence_phase || '').trim().toLowerCase(),
    status: String(child.status || 'queued').trim().toLowerCase(),
    adaptivePending: workflowChildIsAdaptivePending(child),
    createdAt: String(child.createdAt || child.created_at || '').trim(),
    startedAt: String(child.startedAt || child.started_at || '').trim(),
    dispatchedAt: String(child.dispatchedAt || child.dispatched_at || '').trim(),
    updatedAt: String(child.updatedAt || child.updated_at || '').trim(),
    completedAt: String(child.completedAt || child.completed_at || '').trim(),
    failedAt: String(child.failedAt || child.failed_at || '').trim(),
    failureReason: String(child.failureReason || child.failure_reason || '').trim(),
    dispatchCompletionStatus: String(child.dispatchCompletionStatus || child.dispatch_completion_status || child.dispatch?.completionStatus || '').trim(),
    dispatchRequestedAt: String(child.dispatchRequestedAt || child.dispatch_requested_at || child.dispatch?.dispatchRequestedAt || '').trim(),
    dispatchInProgressAt: String(child.dispatchInProgressAt || child.dispatch_in_progress_at || child.dispatch?.dispatchInProgressAt || '').trim(),
    dispatchTimeoutMs: Number(child.dispatchTimeoutMs || child.dispatch_timeout_ms || child.dispatch?.dispatchTimeoutMs || 0) || 0,
    providerQueueAcceptedAt: String(child.providerQueueAcceptedAt || child.provider_queue_accepted_at || child.dispatch?.providerQueueAcceptedAt || '').trim(),
    latestLog: String(child.latestLog || child.latest_log || '').trim()
  })).filter((child) => child.taskType || child.agentName || child.agentId);
}

function workflowAgentRunJobId(child = {}) {
  return String(child.id || child.job_id || child.jobId || child.jobID || '').trim();
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

function agentRunDetailRows(run = {}, job = null) {
  const phase = String(job?.input?._broker?.workflow?.sequencePhase || run.sequencePhase || run.sequence_phase || '').trim();
  const task = String(job?.workflowTask || run.taskType || run.task_type || run.dispatchTaskType || run.dispatch_task_type || '').trim();
  const agent = String(job?.workflowAgentName || run.agentName || run.agent_name || '').trim();
  const jobId = workflowAgentRunJobId(job || run);
  const timestamps = [
    ['Created', job?.createdAt || run.createdAt],
    ['Started', job?.startedAt || run.startedAt],
    ['Updated', job?.updatedAt || run.updatedAt],
    ['Completed', job?.completedAt || run.completedAt],
    ['Failed', job?.failedAt || run.failedAt]
  ].map(([label, value]) => [label, shortDateTime(value)]).filter(([, value]) => value);
  return [
    ['Status', statusDisplayLabel(job?.status || run.status || 'planned')],
    phase ? ['Phase', workflowPhaseLabel(phase)] : null,
    task ? ['Task', taskLabel(task)] : null,
    agent ? ['Agent', agent] : null,
    jobId ? ['Job ID', jobId.slice(0, 8)] : null,
    (job?.dispatch?.completionStatus || run.dispatchCompletionStatus || run.dispatch_completion_status) ? ['Runtime', String(job?.dispatch?.completionStatus || run.dispatchCompletionStatus || run.dispatch_completion_status)] : null,
    workflowRunWaitStatus(job || run, job || run)?.detail ? ['Wait', workflowRunWaitStatus(job || run, job || run).detail] : null,
    ...timestamps
  ].filter(Boolean);
}

function renderAgentRunDetailHtml(run = {}, job = null, options = {}) {
  return agentProgressRenderAgentRunDetailHtml(run, job, {
    ...options,
    escapeHtml,
    workflowChildDisplayLabel,
    agentRunDetailRows,
    deliveryText,
    deliveryFiles,
    renderFileCards,
    statusDisplayLabel
  });
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

function workflowAgentMapHtml(childRuns = [], options = {}) {
  const visibleRuns = Array.isArray(childRuns) ? childRuns : [];
  if (!visibleRuns.length) return '';
  const currentPhase = String(options.currentPhase || '').trim().toLowerCase();
  const currentChildId = String(options.currentChildId || '').trim();
  const groups = [];
  for (const child of visibleRuns) {
    const phase = child.sequencePhase || 'workflow';
    let group = groups.find((item) => item.phase === phase);
    if (!group) {
      group = { phase, items: [] };
      groups.push(group);
    }
    group.items.push(child);
  }
  groups.sort((left, right) => workflowPhaseRank(left.phase) - workflowPhaseRank(right.phase));
  const diagram = groups.map((group, index) => {
    const phaseIsCurrent = currentPhase && group.phase === currentPhase;
    return [
      index ? '<div class="agent-map-arrow" aria-hidden="true">→</div>' : '',
      `<div class="agent-map-phase${phaseIsCurrent ? ' current' : ''}">`,
      `<div class="agent-map-phase-title">${escapeHtml(workflowPhaseLabel(group.phase))}${phaseIsCurrent ? '<span>Now</span>' : ''}</div>`,
      ...group.items.slice(0, 4).map((child) => {
        const status = String(child.status || 'queued').trim().toLowerCase();
        const shownStatus = child.adaptivePending ? 'planned' : status;
        const statusClass = shownStatus.replace(/[^a-z0-9_-]+/g, '');
        const isCurrent = currentChildId
          ? currentChildId === String(child.id || '').trim()
          : phaseIsCurrent && ['running', 'claimed', 'dispatched', 'queued', 'blocked'].includes(status);
        const runKey = rememberAgentMapRun(child);
        const jobId = workflowAgentRunJobId(child);
        return [
          `<button class="agent-map-node ${escapeHtml(statusClass)}${isCurrent ? ' current' : ''}" type="button" data-agent-run-open data-agent-run-key="${escapeHtml(runKey)}" data-agent-job-id="${escapeHtml(jobId)}" data-agent-name="${escapeHtml(workflowChildDisplayLabel(child))}" data-agent-task="${escapeHtml(child.taskType || child.dispatchTaskType || '')}" data-agent-phase="${escapeHtml(child.sequencePhase || '')}" data-agent-status="${escapeHtml(shownStatus || 'queued')}" aria-expanded="false" title="Show status and intermediate deliverables">`,
          `<strong>${escapeHtml(workflowChildDisplayLabel(child))}</strong>`,
          `<span>${escapeHtml(taskLabel(child.taskType || child.dispatchTaskType || 'work'))} · ${escapeHtml(statusDisplayLabel(shownStatus || 'queued'))}</span>`,
          '</button>'
        ].join('');
      }),
      group.items.length > 4 ? `<span class="agent-map-more">+${group.items.length - 4} more</span>` : '',
      '</div>'
    ].filter(Boolean).join('\n');
  }).join('\n');
  const footer = String(options.footer || '').trim();
  return [
    `<div class="agent-map-card${options.progress ? ' progress' : ''}" data-agent-progress-map data-agent-parent-job-id="${escapeHtml(options.parentJobId || '')}">`,
    '<div class="agent-map-head">',
    `<strong>${escapeHtml(options.title || 'Agent map')}</strong>`,
    `<span>${escapeHtml(options.subtitle || `${visibleRuns.length} visible agent runs`)}</span>`,
    '</div>',
    `<div class="agent-map-diagram">${diagram}</div>`,
    options.handoffHtml ? options.handoffHtml : '',
    footer ? `<div class="chat-hint">${escapeHtml(footer)}</div>` : '',
    '</div>'
  ].join('\n');
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

function initialAgentMapHtml(created = {}, prompt = '') {
  const childRuns = createdOrderChildRuns(created, { includeAdaptivePending: true });
  const isWorkflow = String(created?.mode || '').toLowerCase() === 'workflow' || Boolean(created?.workflow_job_id || created?.workflowJobId);
  if (!isWorkflow && !childRuns.length && !created?.matched_agent_id) return '';
  if (!isWorkflow) {
    const jobId = extractOrderId(created);
    const run = {
      id: jobId,
      agentId: String(created?.matched_agent_id || '').trim(),
      agentName: String(created?.matched_agent_name || created?.matched_agent_id || 'Selected agent').trim(),
      taskType: String(created?.task_type || created?.taskType || '').trim(),
      sequencePhase: 'initial',
      status: String(created?.status || 'created').trim().toLowerCase()
    };
    const runKey = rememberAgentMapRun(run);
    const statusClass = run.status.replace(/[^a-z0-9_-]+/g, '') || 'created';
    return [
      `<div class="agent-map-card" data-agent-progress-map data-agent-parent-job-id="${escapeHtml(jobId)}">`,
      '<div class="agent-map-head">',
      '<strong>Agent map</strong>',
      '<span>Initial route</span>',
      '</div>',
      `<button class="agent-map-single agent-map-node ${escapeHtml(statusClass)}" type="button" data-agent-run-open data-agent-run-key="${escapeHtml(runKey)}" data-agent-job-id="${escapeHtml(jobId)}" data-agent-name="${escapeHtml(run.agentName)}" data-agent-task="${escapeHtml(run.taskType)}" data-agent-phase="initial" data-agent-status="${escapeHtml(run.status)}" aria-expanded="false" title="Show status and intermediate deliverables">`,
      `<strong>${escapeHtml(run.agentName)}</strong>`,
      `<span>${escapeHtml(statusDisplayLabel(created?.status || 'created'))}</span>`,
      '</button>',
      '</div>'
    ].join('\n');
  }
  return workflowAgentMapHtml(childRuns, {
    title: 'Agent map',
    subtitle: `${childRuns.length} visible agent runs · adaptive first layer`,
    footer: 'Progress updates below will show the current phase and active agent. Later layers appear after leader checkpoints.',
    parentJobId: extractOrderId(created)
  });
}

function workflowPhaseProgressMapHtml(job = {}, options = {}) {
  const current = workflowCurrentChildRun(job);
  const childRuns = createdOrderChildRuns(job, {
    includeAdaptivePending: true,
    includeInternalLeaderSequence: workflowChildIsInternalLeaderSequenceRun(current || {})
  });
  if (!childRuns.length || !current) return '';
  const phase = String(current.sequencePhase || '').trim().toLowerCase();
  const counts = workflowAgentProgressCounts(job);
  return workflowAgentMapHtml(childRuns, {
    title: 'Agent map',
    subtitle: [
      `${counts.completed}/${counts.total || childRuns.length} complete`,
      `Current: ${workflowPhaseLabel(phase)} / ${workflowChildDisplayLabel(current)} / ${statusDisplayLabel(current.status || 'queued')}`,
      options.retrying ? 'status check retrying' : ''
    ].filter(Boolean).join(' · '),
    footer: options.footer || '',
    currentPhase: phase,
    currentChildId: current.id,
    progress: true,
    parentJobId: job.id || state.orderId || '',
    handoffHtml: renderAppHandoffRoutingPreview(job)
  });
}

function statusDisplayLabel(status = '') {
  const safe = String(status || '').trim().toLowerCase();
  if (safe === 'blocked') return 'waiting';
  if (safe === 'timed_out') return 'timed out';
  return String(status || '').trim() || 'created';
}

function isTerminalStatus(status = '') {
  return ['completed', 'failed', 'timed_out'].includes(String(status || '').toLowerCase());
}

function jobBlockedByLeaderQualityGate(job = {}) {
  const failureCategory = String(job?.failureCategory || job?.failure_category || '').trim().toLowerCase();
  const completionStatus = String(job?.dispatch?.completionStatus || job?.dispatch?.completion_status || '').trim().toLowerCase();
  return Boolean(
    failureCategory === 'leader_quality_gate_failed'
    || completionStatus === 'leader_quality_gate_failed'
    || /leader quality gate/i.test(String(job?.failureReason || job?.failure_reason || ''))
  );
}

function jobHasDeliveryResult(job = {}) {
  return isTerminalStatus(job?.status) || jobBlockedByLeaderQualityGate(job) || jobBlockedForSaasHandoff(job);
}

function extractOrderId(created = {}) {
  return String(created.workflow_job_id || created.workflowJobId || created.job_id || created.jobId || '').trim();
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

function appAgentSourceAgentsFromJob(job = {}) {
  const agents = [];
  const primaryTask = String((Array.isArray(job.workflow?.plannedTasks) ? job.workflow.plannedTasks[0] : '') || job.taskType || '').trim().toLowerCase();
  if (primaryTask) {
    agents.push({
      role: 'primary',
      name: taskLabel(primaryTask),
      taskType: primaryTask,
      status: String(job.status || '').trim(),
      orderId: String(job.id || '').trim()
    });
  }
  const childRuns = visibleWorkflowChildRuns(job.workflow?.childRuns);
  for (const child of childRuns) {
    const taskType = String(child.taskType || child.dispatchTaskType || '').trim().toLowerCase();
    if (!taskType) continue;
    agents.push({
      role: child.sequencePhase || 'workflow_child',
      name: String(child.agentName || taskLabel(taskType)).trim(),
      agentId: String(child.agentId || '').trim(),
      taskType,
      dispatchTaskType: String(child.dispatchTaskType || '').trim(),
      status: String(child.status || '').trim(),
      orderId: String(child.id || '').trim()
    });
  }
  return agents.slice(0, 18);
}

function appHandoffTransferOptions(options = {}) {
  return {
    manifestById: appManifestById,
    normalizeUsageId,
    listValues,
    compactTransferText,
    compactTransferObject,
    chatLanguage,
    isoNow,
    statusLabel,
    appAgentSourceAgentsFromJob,
    deliveryText,
    deliveryFiles,
    explicitHandoffArtifactTypesFromFile,
    fileMimeType,
    returnPath: CHATUX_RETURN_PATH,
    ...options
  };
}

function registerAppTransferPayload(payload = {}) {
  const id = String(payload.transfer_id || payload.transferId || `transfer-${Date.now().toString(36)}`).trim();
  if (!id) return '';
  appTransferStore.set(id, payload);
  while (appTransferStore.size > 40) {
    const first = appTransferStore.keys().next().value;
    appTransferStore.delete(first);
  }
  return id;
}

function authorityRequestFromJob(job = {}) {
  return connectorGateAuthorityRequestFromJob(job);
}

function authorityRequestHandledBySaasHandoffInChat(request = null) {
  return connectorGateAuthorityHandledBySaasHandoff(request);
}

function jobBlockedForSaasHandoff(job = {}) {
  const status = String(job?.status || '').trim().toLowerCase();
  if (!['blocked', 'waiting'].includes(status)) return false;
  return authorityRequestHandledBySaasHandoffInChat(authorityRequestFromJob(job));
}

function authorityRequestIsActionableForJob(job = {}, request = null) {
  return connectorGateAuthorityIsActionable(job, request);
}

function approvalAnchorForJob(job = {}) {
  return connectorGateApprovalAnchor(job, state.orderId);
}

function authorityNoticeKey(job = {}) {
  return connectorGateAuthorityNoticeKey(job);
}

function socialPostDraftFromJob(job = {}) {
  const files = deliveryFiles(job);
  const orderedFiles = files.filter((file) => {
    const explicitTypes = explicitHandoffArtifactTypesFromFile(file);
    return ['post_text', 'social_post_pack', 'social_copy_packet', 'social_post', 'x_post', 'x_post_packet'].some((type) => explicitTypes.has(type));
  });
  return appHandoffSocialPostDraftFromDeliveryFiles(orderedFiles, { maxLength: 1200 });
}

function compactStrategyText(value = '', max = 1500) {
  const text = String(value || '')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1)).trim()}…`;
}

function firstStructuredText(...values) {
  for (const value of values) {
    const text = compactStrategyText(value || '', 1200);
    if (text) return text;
  }
  return '';
}

function firstStructuredUrl(...values) {
  for (const value of values) {
    const text = String(value || '').trim();
    if (/^https?:\/\/[^\s"'<>`]+$/i.test(text)) return text;
  }
  return '';
}

function structuredHandoffContextsFromJob(job = {}) {
  const input = job.input && typeof job.input === 'object' ? job.input : {};
  const broker = input._broker && typeof input._broker === 'object' ? input._broker : {};
  const workflow = job.workflow && typeof job.workflow === 'object' ? job.workflow : {};
  const output = job.output && typeof job.output === 'object' ? job.output : {};
  const result = job.result && typeof job.result === 'object' ? job.result : {};
  const candidates = [
    job.appHandoffContext,
    job.app_handoff_context,
    job.handoffContext,
    job.handoff_context,
    job.strategyContext,
    job.strategy_context,
    workflow.appHandoffContext,
    workflow.app_handoff_context,
    workflow.handoffContext,
    workflow.handoff_context,
    workflow.strategyContext,
    workflow.strategy_context,
    broker.appHandoffContext,
    broker.app_handoff_context,
    broker.handoffContext,
    broker.handoff_context,
    broker.strategyContext,
    broker.strategy_context,
    output.appHandoffContext,
    output.app_handoff_context,
    output.handoffContext,
    output.handoff_context,
    output.strategyContext,
    output.strategy_context,
    result.appHandoffContext,
    result.app_handoff_context,
    result.handoffContext,
    result.handoff_context,
    result.strategyContext,
    result.strategy_context,
    ...deliveryFiles(job).flatMap((file) => [
      file?.appHandoffContext,
      file?.app_handoff_context,
      file?.handoffContext,
      file?.handoff_context,
      file?.strategyContext,
      file?.strategy_context
    ])
  ];
  return candidates.filter((item) => item && typeof item === 'object');
}

function actionStrategyContextFromJob(job = {}) {
  const contexts = structuredHandoffContextsFromJob(job);
  const pick = (...keys) => {
    for (const context of contexts) {
      const value = firstStructuredText(...keys.map((key) => context?.[key]));
      if (value) return value;
    }
    return '';
  };
  const pickUrl = (...keys) => {
    for (const context of contexts) {
      const value = firstStructuredUrl(...keys.map((key) => context?.[key]));
      if (value) return value;
    }
    return '';
  };
  return {
    strategy: pick('strategy', 'strategyText', 'strategy_text', 'brief', 'notes', 'summary'),
    product: pick('product', 'brandName', 'brand_name', 'serviceLine', 'service_line'),
    audience: pick('audience', 'targetClient', 'target_client', 'primaryAudience', 'primary_audience', 'icp'),
    goal: pick('goal', 'defaultCta', 'default_cta', 'objective', 'conversion'),
    channel: pick('channel', 'primaryChannel', 'primary_channel', 'medium'),
    url: pickUrl('url', 'destinationLink', 'destination_link', 'serviceUrl', 'service_url', 'targetUrl', 'target_url')
  };
}

function appAgentContextOpenUrl(appId = '', appContextResult = {}, payload = {}) {
  const manifest = appManifestById(appId) || {};
  const href = appAgentLaunchUrl(manifest);
  if (!href) return '';
  const url = new URL(href, window.location.origin);
  url.searchParams.set('cait_source', 'CAIt');
  url.searchParams.set('cait_context_schema', 'cait-app-context/v1');
  if (appContextResult?.app_context_id) url.searchParams.set('cait_app_context_id', String(appContextResult.app_context_id));
  if (appContextResult?.app_context_token) url.searchParams.set('cait_app_context_token', String(appContextResult.app_context_token));
  if (payload?.order?.id) url.searchParams.set('cait_job', String(payload.order.id).trim());
  return url.toString();
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

async function createAppAgentContextOpenUrl(appId = '', payload = {}, options = {}) {
  const safeAppId = normalizeUsageId(appId || '');
  const manifest = appManifestById(safeAppId) || {};
  const contextPath = options.contextPath || manifest.contextIngestUrl || manifest.context_ingest_url || '/api/app-contexts';
  const result = await apiWithRetry(contextPath, {
    method: 'POST',
    body: JSON.stringify({
      app_id: appId,
      context: appContextFromTransferPayload(appId, payload, appHandoffTransferOptions())
    })
  }, {
    maxAttempts: 3,
    statuses: [408, 425, 429, 500, 502, 503, 504],
    baseDelayMs: 700,
    maxDelayMs: 4000
  });
  const openUrl = appAgentContextOpenUrl(appId, result, payload);
  if (!openUrl) throw new Error(`${appManifestById(appId)?.name || 'App'} does not have an entry URL for context handoff.`);
  return openUrl;
}

async function createAppAgentHandoffUrl(appId = '', payload = {}) {
  const manifest = appManifestById(appId);
  const createUrl = manifest?.handoff?.createUrl ? `/api/apps/${encodeURIComponent(manifest.id || appId)}/handoff` : '';
  if (!createUrl) return createAppAgentContextOpenUrl(appId, payload);
  const data = await api(createUrl, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  const handoffUrl = data?.handoff_url || data?.handoffUrl || data?.open_url || data?.openUrl || data?.url || '';
  if (!handoffUrl) throw new Error(String(data?.error || `${manifest?.name || 'App agent'} handoff response did not include a URL.`));
  return String(handoffUrl || manifest?.entryUrl || manifest?.baseUrl || '');
}

function preparedTextForDedicatedDelivery(entry = {}, job = {}) {
  const sourceKind = appHandoffGateDedicatedTextSourceKind(entry, { normalizeUsageId, listValues });
  if (sourceKind === 'social_post_text') return socialPostDraftFromJob(job)?.text || '';
  return deliveryText(job);
}

function appHandoffDedicatedTextSource(entry = {}, job = {}) {
  const sourceKind = appHandoffGateDedicatedTextSourceKind(entry, { normalizeUsageId, listValues });
  if (sourceKind === 'social_post_text') {
    const draft = socialPostDraftFromJob(job);
    if (draft?.text) return draft;
  }
  const text = deliveryText(job);
  return text ? { text, source: 'CAIt delivery' } : null;
}

function dedicatedAppHandoffTitle(entry = {}) {
  return `CAIt final ${entry?.name || 'app'} handoff`;
}

function dedicatedAppTransferPayload(entry = {}, job = {}, draft = {}, strategy = {}) {
  const appId = normalizeUsageId(entry.id || '');
  const transfer = appHandoffBaseTransferPacket(appId, job, appHandoffTransferOptions({ draft, strategy, actionKind: 'dedicated_app_handoff' }));
  const sourceKind = appHandoffGateDedicatedTextSourceKind(entry, { normalizeUsageId, listValues });
  const postText = sourceKind === 'social_post_text' ? String(draft?.text || '').trim() : '';
  return {
    schema_version: entry?.inputContract?.schemaVersion || 'cait-app-agent-transfer/v1',
    transfer_id: transfer.transfer_id,
    text: String(draft?.text || '').trim(),
    ...(postText ? { post_text: postText } : {}),
    source: String(draft?.source || 'CAIt delivery').trim(),
    title: dedicatedAppHandoffTitle(entry),
    jobId: String(job?.id || '').trim(),
    strategy: strategy.strategy || '',
    product: strategy.product || '',
    audience: strategy.audience || '',
    goal: strategy.goal || '',
    channel: strategy.channel || '',
    url: strategy.url || '',
    source_agent: transfer.agents[0] || null,
    agents: transfer.agents,
    context: {
      platform: transfer.platform,
      app: transfer.app,
      order: transfer.order,
      delivery: transfer.delivery
    },
    settings: transfer.settings,
    transfer
  };
}

function renderDedicatedAppDeliveryTools(job = {}) {
  const jobId = String(job?.id || '').trim();
  const cards = [];
  for (const entry of appAgentHandoffCandidates(job)) {
    if (!appHandoffGateHasDedicatedDelivery(entry, job, {
      normalizeUsageId,
      listValues,
      deliveryHandoffArtifactTypes,
      preparedTextForDedicatedDelivery
    })) continue;
    const draft = appHandoffDedicatedTextSource(entry, job);
    if (!draft?.text) continue;
    const strategy = actionStrategyContextFromJob(job);
    const transferPayload = dedicatedAppTransferPayload(entry, job, draft, strategy);
    const transferId = registerAppTransferPayload(transferPayload);
    const appUrl = appAgentLaunchUrl(entry) || '/apps.html';
    const title = dedicatedAppHandoffTitle(entry);
    const textLimit = appHandoffContractTextLimit(entry);
    const countLabel = textLimit ? `${String(draft.text).length}/${textLimit}` : `${String(draft.text).length} chars`;
    rememberAppAgentUsage(entry.id, {
      title,
      lastHandoffUrl: appUrl,
      lastOrderId: jobId,
      source: draft.source,
      product: strategy.product,
      audience: strategy.audience,
      goal: strategy.goal,
      channel: strategy.channel,
      lastContext: {
        title,
        source: draft.source,
        product: strategy.product,
        audience: strategy.audience,
        goal: strategy.goal,
        channel: strategy.channel
      },
      lastTransfer: compactTransferObject(transferPayload, { depth: 4, maxText: 700, maxArray: 8 })
    }, { increment: false });
    cards.push([
      '<div class="app-dedicated-handoff-card" data-app-transfer-edit-root="1">',
      `<strong>Final action: ${escapeHtml(entry.name || 'App handoff')}</strong>`,
      `<div class="chat-hint">CAIt has attached the prepared handoff text and strategy context declared by the app manifest. Open ${escapeHtml(entry.name || 'the app')} to continue the final action outside chat.</div>`,
      `<label class="app-dedicated-handoff-label" for="app-handoff-${escapeHtml(normalizeUsageId(entry.id || 'app'))}-${escapeHtml(jobId || 'draft')}">Handoff text (${escapeHtml(countLabel)})</label>`,
      `<textarea class="app-dedicated-handoff-editor" id="app-handoff-${escapeHtml(normalizeUsageId(entry.id || 'app'))}-${escapeHtml(jobId || 'draft')}" data-app-transfer-editable="text" data-app-transfer-source="${escapeHtml(draft.source)}" data-app-transfer-title="${escapeHtml(title)}" data-app-transfer-id="${escapeHtml(transferId)}" rows="5">${escapeHtml(draft.text)}</textarea>`,
      `<div class="chat-hint">Source: ${escapeHtml(draft.source)}${strategy.strategy ? ' / Strategy attached' : ''} / Agent-app transfer attached</div>`,
      '<div class="inline-actions">',
      `<button class="primary-btn inline-btn file-action" type="button" data-app-agent-handoff="${escapeHtml(entry.id)}" data-app-transfer-id="${escapeHtml(transferId)}">Open ${escapeHtml(entry.name || 'app')}</button>`,
      `<button class="ghost-btn inline-btn file-action" type="button" data-app-transfer-copy="${escapeHtml(transferId)}">Copy handoff text</button>`,
      `<span class="chat-hint">${escapeHtml(entry.name || 'The app')} handles account connection and final external action outside chat.</span>`,
      '</div>',
      '<span class="chat-hint">CAIt will not post, publish, or send automatically from a summary alone. Use the SaaS surface or copy the prepared text into the target service for the final user action.</span>',
      '</div>'
    ].filter(Boolean).join('\n'));
  }
  return cards.join('\n');
}

function appAgentHandoffTitle(job = {}) {
  const text = deliveryText(job);
  const first = String(text || '').split('\n').map((line) => line.trim()).find(Boolean) || '';
  return compact(first.replace(/^#+\s*/, ''), 140) || `CAIt delivery ${String(job?.id || '').slice(0, 8)}`;
}

function appAgentGenericTransferPayload(appId = '', job = {}) {
  const text = deliveryText(job);
  return {
    ...appHandoffBaseTransferPacket(appId, job, appHandoffTransferOptions({
      actionKind: 'app_handoff',
      action: {
        source: 'CAIt delivery',
        text,
        title: appAgentHandoffTitle(job)
      }
    })),
    title: appAgentHandoffTitle(job),
    source: 'CAIt delivery',
    summary: compactTransferText(text, 1800),
    files: deliveryFiles(job)
  };
}

function appHandoffRememberDetails(appId = '', payload = {}, handoffUrl = '', source = 'generic_app_handoff') {
  const settings = payload.settings && typeof payload.settings === 'object' ? payload.settings : {};
  const order = payload.order && typeof payload.order === 'object' ? payload.order : {};
  return rememberAppAgentUsage(appId, {
    title: payload.title || payload.action?.title || 'CAIt app handoff',
    lastHandoffUrl: handoffUrl,
    lastOrderId: order.id || '',
    source,
    product: settings.serviceLine || settings.brandName || '',
    audience: settings.targetClient || '',
    goal: settings.defaultCta || '',
    channel: settings.channel || '',
    lastContext: payload,
    lastTransfer: compactTransferObject(payload, { depth: 4, maxText: 700, maxArray: 8 })
  });
}

const explicitHandoffArtifactTypesFromFile = (file = {}) => appHandoffGateExplicitArtifactTypesFromFile(file, { normalizeUsageId, listValues });
const explicitHandoffArtifactTypesFromAuthorityRequest = (request = null) => appHandoffGateExplicitArtifactTypesFromAuthorityRequest(request, { normalizeUsageId, listValues });

function deliveryHandoffArtifactTypes(job = {}) {
  const types = new Set();
  const add = (...items) => {
    items.map(normalizeUsageId).filter(Boolean).forEach((item) => types.add(item));
  };
  const files = deliveryFiles(job);

  const authorityRequest = authorityRequestFromJob(job);
  if (authorityRequestHandledBySaasHandoffInChat(authorityRequest)) {
    for (const artifactType of explicitHandoffArtifactTypesFromAuthorityRequest(authorityRequest)) add(artifactType);
  }

  for (const file of files) {
    for (const artifactType of explicitHandoffArtifactTypesFromFile(file)) add(artifactType);
  }

  return types;
}

function appHandoffArtifactLabel(artifactType = '') {
  return appHandoffGateArtifactLabel(artifactType, {
    normalizeUsageId
  });
}

function appHandoffEntryMatchesArtifact(entry = {}, artifactType = '') {
  return appHandoffGateEntryMatchesArtifact(entry, artifactType, {
    normalizeUsageId,
    listValues
  });
}

function appHandoffConnectorNotes(entry = {}, artifactType = '') {
  return appHandoffGateConnectorNotes(entry, artifactType, {
    normalizeUsageId,
    listValues
  });
}

function renderAppHandoffTree(job = {}, entries = []) {
  return appHandoffGateRenderTree(job, entries, {
    escapeHtml,
    normalizeUsageId,
    listValues,
    deliveryHandoffArtifactTypes
  });
}

function renderAppHandoffRoutingPreview(job = {}) {
  const entries = appAgentHandoffCandidates(job);
  if (!entries.length) return '';
  const tree = renderAppHandoffTree(job, entries);
  if (!tree) return '';
  const appLinks = entries
    .map((entry) => {
      const directUrl = String(entry.entryUrl || entry.baseUrl || '').trim();
      if (!directUrl) return '';
      return `<a class="ghost-btn inline-btn file-action" href="${escapeHtml(directUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(entry.name || 'Open app')}</a>`;
    })
    .filter(Boolean)
    .join('');
  return [
    '<div class="app-handoff-preview">',
    tree,
    appLinks ? `<div class="inline-actions">${appLinks}</div>` : '',
    '</div>'
  ].filter(Boolean).join('\n');
}

function genericSuppressedAppHandoffIds(job = {}) {
  return appHandoffGateGenericSuppressedAppHandoffIds(appAgentHandoffCandidates(job), job, {
    normalizeUsageId,
    listValues,
    deliveryHandoffArtifactTypes,
    preparedTextForDedicatedDelivery
  });
}

function appAgentHandoffCandidates(job = {}) {
  return appHandoffGateRankEntries(appManifestSources(), job, {
    normalizeUsageId,
    listValues,
    deliveryHandoffArtifactTypes,
    caitManagedAppIds: APP_AGENT_MANIFESTS.map((item) => item.id)
  });
}

function renderAppHandoffTools(job = {}) {
  const status = String(job.status || '').trim().toLowerCase();
  const hasPreparationData = deliveryFiles(job).length > 0
    || visibleWorkflowChildRuns(job.workflow?.childRuns).some((child) => ['completed', 'failed', 'blocked', 'waiting'].includes(String(child.status || '').trim().toLowerCase()));
  if (!['completed', 'failed', 'blocked', 'waiting'].includes(status) || !hasPreparationData) return '';
  const suppressedIds = genericSuppressedAppHandoffIds(job);
  const entries = appAgentHandoffCandidates(job)
    .filter((entry) => !suppressedIds.has(normalizeUsageId(entry.id || '')));
  if (!entries.length) return '';
  const rows = entries.map((entry) => {
    const payload = appAgentGenericTransferPayload(entry.id, job);
    const transferId = registerAppTransferPayload(payload);
    const hasPostHandoff = Boolean(entry.handoff?.createUrl);
    const directUrl = String(entry.entryUrl || entry.baseUrl || '').trim();
    const capabilities = Array.isArray(entry.capabilities) ? entry.capabilities.slice(0, 3).map(usageBadge).join('') : '';
    return [
      '<div class="app-handoff-row">',
      '<div class="app-handoff-main">',
      `<strong>${escapeHtml(entry.name || 'Registered app')}</strong>`,
      `<span>${escapeHtml(entry.description || 'Receive this CAIt delivery as structured app context.')}</span>`,
      entry.handoffReason ? `<span class="chat-hint">Matched: ${escapeHtml(entry.handoffReason)}</span>` : '',
      capabilities ? `<div class="usage-badges">${capabilities}</div>` : '',
      '</div>',
      '<div class="app-handoff-actions">',
      `<button class="primary-btn inline-btn file-action" type="button" data-app-agent-handoff="${escapeHtml(entry.id)}" data-app-transfer-id="${escapeHtml(transferId)}">${hasPostHandoff ? 'Send context' : 'Open with context'}</button>`,
      directUrl ? `<a class="ghost-btn inline-btn file-action" href="${escapeHtml(directUrl)}" target="_blank" rel="noopener noreferrer">Open app</a>` : '',
      '</div>',
      '</div>'
    ].filter(Boolean).join('\n');
  }).join('\n');
  return [
    '<div class="app-handoff-card">',
    '<strong>App handoff</strong>',
    '<div class="chat-hint">Preparation-layer delivery data is already available to matching SaaS apps. Open the relevant app to publish, create an approval packet, or copy the prepared text into the target service.</div>',
    renderAppHandoffTree(job, entries),
    rows,
    '</div>'
  ].join('\n');
}

function recentAppAgentEntries() {
  const historyById = new Map(state.appAgentHistory.map((entry) => [normalizeUsageId(entry.id || entry.name), entry]));
  const entries = appManifestSources().map((manifest) => {
    const history = historyById.get(normalizeUsageId(manifest.id)) || {};
    return {
      ...manifest,
      ...history,
      id: manifest.id,
      name: manifest.name,
      description: history.description || manifest.description,
      baseUrl: history.baseUrl || manifest.baseUrl,
      entryUrl: history.entryUrl || manifest.entryUrl || manifest.baseUrl,
      capabilities: history.capabilities || manifest.capabilities || [],
      requiredConnectors: history.requiredConnectors || manifest.requiredConnectors || [],
      requiresApprovalFor: history.requiresApprovalFor || manifest.requiresApprovalFor || [],
      handoff: history.handoff || manifest.handoff || null,
      reusePrompt: history.reusePrompt || manifest.reusePrompt || ''
    };
  });
  return entries.sort((left, right) => {
    const leftUsed = Date.parse(left.lastUsedAt || '') || 0;
    const rightUsed = Date.parse(right.lastUsedAt || '') || 0;
    return rightUsed - leftUsed;
  });
}

function groupedAppPanelEntries(entries = []) {
  const byId = new Map(entries.map((entry) => [normalizeUsageId(entry.id), entry]));
  const groupedIds = new Set();
  const groups = APP_WORKSPACE_GROUPS.map((group) => {
    const members = group.memberIds.map((id) => byId.get(normalizeUsageId(id))).filter(Boolean);
    if (!members.length) return null;
    members.forEach((member) => groupedIds.add(normalizeUsageId(member.id)));
    const primary = byId.get(normalizeUsageId(group.primaryId)) || members[0];
    const latestUsedAt = members
      .map((member) => Date.parse(member.lastUsedAt || '') || 0)
      .sort((left, right) => right - left)[0] || 0;
    return {
      ...primary,
      id: primary.id,
      name: group.name,
      description: group.description,
      capabilities: [...new Set(members.flatMap((member) => Array.isArray(member.capabilities) ? member.capabilities : []))],
      requiredConnectors: [...new Set(members.flatMap((member) => Array.isArray(member.requiredConnectors) ? member.requiredConnectors : []))],
      requiresApprovalFor: [...new Set(members.flatMap((member) => Array.isArray(member.requiresApprovalFor) ? member.requiresApprovalFor : []))],
      lastUsedAt: latestUsedAt ? new Date(latestUsedAt).toISOString() : primary.lastUsedAt,
      lastContext: members.find((member) => member.lastContext)?.lastContext || primary.lastContext,
      lastHandoffUrl: primary.lastHandoffUrl,
      reusePrompt: group.reusePrompt || primary.reusePrompt,
      workspaceMembers: members.map((member) => member.name || member.id)
    };
  }).filter(Boolean);
  const singletons = entries.filter((entry) => {
    const id = normalizeUsageId(entry.id);
    return !groupedIds.has(id) && !APP_STANDALONE_HIDDEN_APP_IDS.has(id);
  });
  return [...groups, ...singletons];
}

function usageBadge(text = '') {
  const safe = String(text || '').trim();
  return safe ? `<span class="usage-badge">${escapeHtml(safe)}</span>` : '';
}

function appAgentRowsHtml(entries = []) {
  if (!entries.length) {
    return '<div class="chat-hint">No app usage yet. Open a workspace from a delivery or the Apps panel to add it here.</div>';
  }
  return entries.map((entry) => {
    const used = entry.lastUsedAt ? `Last used ${usageDisplayDate(entry.lastUsedAt)}` : 'Available';
    const context = entry.lastContext && typeof entry.lastContext === 'object' ? entry.lastContext : {};
    const meta = [
      used,
      Array.isArray(entry.workspaceMembers) && entry.workspaceMembers.length ? `${entry.workspaceMembers.length} lanes` : '',
      context.product ? `Product: ${context.product}` : '',
      context.goal ? `Goal: ${context.goal}` : '',
      context.channel ? `Channel: ${context.channel}` : ''
    ].filter(Boolean).join(' / ');
    const capabilities = Array.isArray(entry.capabilities) ? entry.capabilities.slice(0, 4).map(usageBadge).join('') : '';
    return [
      '<div class="usage-row">',
      '<div class="usage-main">',
      `<strong>${escapeHtml(entry.name || 'Application')}</strong>`,
      `<span>${escapeHtml(entry.description || '')}</span>`,
      `<span class="usage-meta">${escapeHtml(meta)}</span>`,
      capabilities ? `<div class="usage-badges">${capabilities}</div>` : '',
      '</div>',
      '<div class="usage-actions">',
      `<button class="ghost-btn inline-btn file-action" type="button" data-app-agent-open="${escapeHtml(entry.id)}">Open</button>`,
      `<button class="primary-btn inline-btn file-action" type="button" data-app-agent-reuse="${escapeHtml(entry.id)}">Use again</button>`,
      '</div>',
      '</div>'
    ].filter(Boolean).join('\n');
  }).join('\n');
}

function normalizeAppContextRecord(record = {}) {
  const context = record.context && typeof record.context === 'object' ? record.context : {};
  const id = String(record.id || context.id || '').trim();
  if (!id) return null;
  return {
    id,
    sourceApp: String(record.source_app || context.source_app || '').trim(),
    sourceAppLabel: String(record.source_app_label || context.source_app_label || record.source_app || context.source_app || 'App').trim(),
    title: String(record.title || context.title || 'App context').trim(),
    summary: String(record.summary || context.summary || '').trim(),
    status: String(record.status || 'ready').trim(),
    createdAt: String(record.created_at || context.created_at || '').trim(),
    updatedAt: String(record.updated_at || '').trim(),
    expiresAt: String(record.expires_at || '').trim(),
    context: Object.keys(context).length ? context : null
  };
}

function appContextRowsHtml(entries = []) {
  const contexts = (Array.isArray(entries) ? entries : []).map(normalizeAppContextRecord).filter(Boolean);
  if (!contexts.length) {
    return '<div class="chat-hint">No server-side app contexts yet. Use Send to CAIt inside an app to save a reusable context packet here.</div>';
  }
  return contexts.slice(0, 12).map((entry) => {
    const meta = [
      entry.sourceAppLabel,
      entry.status ? `Status: ${entry.status}` : '',
      entry.createdAt ? `Created ${usageDisplayDate(entry.createdAt)}` : ''
    ].filter(Boolean).join(' / ');
    return [
      '<div class="usage-row app-context-history-row">',
      '<div class="usage-main">',
      `<strong>${escapeHtml(entry.title || 'App context')}</strong>`,
      `<span class="usage-meta">${escapeHtml(meta)}</span>`,
      entry.summary ? `<span>${escapeHtml(compactUsageText(entry.summary, 220))}</span>` : '',
      '</div>',
      '<div class="usage-actions">',
      `<button class="primary-btn inline-btn file-action" type="button" data-app-context-load="${escapeHtml(entry.id)}">Load into chat</button>`,
      `<a class="ghost-btn inline-btn file-action" href="/chat?app_context_id=${encodeURIComponent(entry.id)}">Open</a>`,
      '</div>',
      '</div>'
    ].filter(Boolean).join('\n');
  }).join('\n');
}

function aiAgentRowsHtml(entries = []) {
  if (!entries.length) {
    return `<div class="chat-hint">${escapeHtml(chatText(
      'No AI agent usage yet. Leaders and child agents used in orders or deliveries will appear here.',
      'まだAIエージェント利用履歴はありません。発注または納品取得後に、使ったリーダー・子エージェントがここに追加されます。'
    ))}</div>`;
  }
  return entries.slice(0, 12).map((entry) => {
    const used = entry.lastUsedAt ? `Last used ${usageDisplayDate(entry.lastUsedAt)}` : 'Available';
    const task = entry.taskType ? `Task: ${entry.taskType}` : '';
    const route = entry.route ? `Route: ${entry.route}` : '';
    const meta = [used, task, route, entry.status ? `Status: ${entry.status}` : ''].filter(Boolean).join(' / ');
    return [
      '<div class="usage-row">',
      '<div class="usage-main">',
      `<strong>${escapeHtml(entry.name || taskLabel(entry.taskType))}</strong>`,
      `<span class="usage-meta">${escapeHtml(meta)}</span>`,
      entry.summary ? `<span>${escapeHtml(entry.summary)}</span>` : '',
      entry.originalPrompt ? `<span class="usage-preview">${escapeHtml(compactUsageText(entry.originalPrompt, 180))}</span>` : '',
      '</div>',
      '<div class="usage-actions">',
      `<button class="primary-btn inline-btn file-action" type="button" data-ai-agent-reuse="${escapeHtml(entry.id)}">Use again</button>`,
      '</div>',
      '</div>'
    ].filter(Boolean).join('\n');
  }).join('\n');
}

function usageLibraryHtml(scope = 'all') {
  const showApps = scope === 'all' || scope === 'apps';
  const showAgents = scope === 'all' || scope === 'agents';
  const showContexts = scope === 'all' || scope === 'apps' || scope === 'contexts';
  return [
    '<div class="usage-panel">',
    `<strong>${escapeHtml(chatText('Usage History', '利用履歴'))}</strong>`,
    `<div class="chat-hint">${escapeHtml(chatText(
      'Reuse past apps and AI agents from chat. Apps are for final actions; AI agents can restart similar orders from previous conditions.',
      'チャットから過去に使ったアプリとAIエージェントを呼び出せます。アプリは最終アクション、AIエージェントは前回条件の再発注に使います。'
    ))}</div>`,
    showContexts ? '<h3>Server App Contexts</h3>' : '',
    showContexts ? appContextRowsHtml(state.appContexts) : '',
    showApps ? '<h3>Workspaces</h3>' : '',
    showApps ? appAgentRowsHtml(groupedAppPanelEntries(recentAppAgentEntries())) : '',
    showAgents ? '<h3>AI Agents</h3>' : '',
    showAgents ? aiAgentRowsHtml(state.aiAgentHistory) : '',
    '<div class="chat-hint">Commands: /apps, /agents, /history</div>',
    '</div>'
  ].filter(Boolean).join('\n');
}

function libraryCommandScope(prompt = '') {
  const text = String(prompt || '').trim();
  const lower = text.toLowerCase();
  if (/^\/(?:history|tools|library)\b/.test(lower)) return 'all';
  if (/^\/(?:contexts|app-contexts|context)\b/.test(lower)) return 'contexts';
  if (/(最近|過去|使った|利用した).*(アプリ).*(ai\s*agent|aiagent|エージェント).*(一覧|履歴|呼び出|見せて|表示)/i.test(text)) return 'all';
  if (/(最近|過去|使った|利用した).*(ai\s*agent|aiagent|エージェント).*(アプリ).*(一覧|履歴|呼び出|見せて|表示)/i.test(text)) return 'all';
  if (/^\/apps\b/.test(lower) || /^(最近|過去|使った|利用した)?.*(アプリ).*(一覧|履歴|呼び出|見せて|表示)/.test(text)) return 'apps';
  if (/^\/agents\b/.test(lower) || /^\/aiagents\b/.test(lower) || /^(最近|過去|使った|利用した)?.*(ai\s*agent|aiagent|エージェント).*(一覧|履歴|呼び出|見せて|表示)/i.test(text)) return 'agents';
  if (/(最近|過去|使った|利用した).*(アプリ|ai\s*agent|aiagent|エージェント).*(一覧|履歴|呼び出|見せて|表示)/i.test(text)) return 'all';
  return '';
}

function directAppCommandTextTokens(value = '') {
  const raw = String(value || '').trim().toLowerCase();
  const normalized = normalizeUsageId(raw);
  return [
    raw,
    raw.replace(/[\s　_-]+/g, ''),
    normalized,
    normalized.replace(/[_-]+/g, '')
  ].filter((item, index, array) => item && array.indexOf(item) === index);
}

function directAppCommandId(prompt = '') {
  const text = String(prompt || '').trim();
  if (!/(open|launch|use|show|開|起動|呼び出|使|表示)/i.test(text)) return '';
  const promptTokens = directAppCommandTextTokens(text);
  for (const app of appManifestSources()) {
    const aliases = [
      app.id,
      app.name,
      ...(Array.isArray(app.directCommandAliases) ? app.directCommandAliases : [])
    ]
      .flatMap(directAppCommandTextTokens)
      .filter((item) => item && item.length >= 2)
      .filter((item, index, array) => array.indexOf(item) === index);
    const matched = aliases.some((alias) => promptTokens.some((token) => token.includes(alias)));
    if (matched) return app.id;
  }
  return '';
}

function catalogCacheFresh(fetchedAt = 0) {
  const timestamp = Number(fetchedAt || 0);
  return timestamp > 0 && Date.now() - timestamp < CHATUX_CATALOG_CACHE_TTL_MS;
}

function catalogApiPath(path = '', options = {}) {
  const url = new URL(path, window.location.origin);
  const requestedLimit = Number(options.limit || CHATUX_CATALOG_PAGE_SIZE);
  const requestedOffset = Number(options.offset || 0);
  const limit = Number.isFinite(requestedLimit) ? Math.max(1, requestedLimit) : CHATUX_CATALOG_PAGE_SIZE;
  const offset = Number.isFinite(requestedOffset) ? Math.max(0, requestedOffset) : 0;
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('offset', String(offset));
  return `${url.pathname}${url.search}`;
}

function mergeCatalogById(existing = [], incoming = []) {
  const byId = new Map();
  for (const item of [...(Array.isArray(existing) ? existing : []), ...(Array.isArray(incoming) ? incoming : [])]) {
    const id = normalizeUsageId(item?.id || item?.name);
    if (!id) continue;
    byId.set(id, { ...(byId.get(id) || {}), ...item });
  }
  return [...byId.values()];
}

async function refreshRegisteredApps(options = {}) {
  const force = options.force === true;
  const offset = Math.max(0, Number(options.offset || 0));
  const append = options.append === true || offset > 0;
  if (!force && !append && catalogCacheFresh(state.registeredAppsFetchedAt)) return state.registeredApps;
  if (state.registeredAppsRequest) return state.registeredAppsRequest;
  state.registeredAppsRequest = api(catalogApiPath('/api/apps', options), { method: 'GET' })
    .then((result) => {
      const apps = (Array.isArray(result?.apps) ? result.apps : []).filter((app) => !isCoreFeatureAppId(app?.id));
      state.registeredApps = append ? mergeCatalogById(state.registeredApps, apps) : apps;
      state.registeredAppsTotal = Math.max(state.registeredApps.length, Number(result?.total || 0));
      const nextOffset = Number(result?.offset ?? offset) + apps.length;
      state.registeredAppsHasMore = Boolean(result?.hasMore ?? (state.registeredAppsTotal > nextOffset));
      state.registeredAppsFetchedAt = Date.now();
      return state.registeredApps;
    })
    .finally(() => {
      state.registeredAppsRequest = null;
    });
  return state.registeredAppsRequest;
}

async function refreshAppContexts(options = {}) {
  const force = options.force === true;
  const limit = Math.max(1, Math.min(50, Number(options.limit || 10) || 10));
  if (!force && catalogCacheFresh(state.appContextsFetchedAt)) return state.appContexts;
  if (state.appContextsRequest) return state.appContextsRequest;
  const url = new URL('/api/app-contexts', window.location.origin);
  url.searchParams.set('limit', String(limit));
  state.appContextsRequest = api(`${url.pathname}${url.search}`, { method: 'GET' })
    .then((result) => {
      const contexts = Array.isArray(result?.app_contexts) ? result.app_contexts : [];
      state.appContexts = contexts;
      state.appContextsFetchedAt = Date.now();
      return state.appContexts;
    })
    .finally(() => {
      state.appContextsRequest = null;
    });
  return state.appContextsRequest;
}

async function fetchAppContext(contextId = '') {
  const id = String(contextId || '').trim();
  if (!id) throw new Error('App context id is required.');
  const result = await api(`/api/app-contexts/${encodeURIComponent(id)}`, { method: 'GET' });
  const context = result?.app_context?.context;
  if (!context || typeof context !== 'object') throw new Error('App context response did not include a context payload.');
  return context;
}

function recentJobsApiPath(options = {}) {
  return orderRuntimeRecentJobsApiPath({
    ...options,
    origin: window.location.origin,
    visitorId: state.visitorId
  });
}

async function refreshRecentJobs(options = {}) {
  const force = options.force === true;
  if (!force && catalogCacheFresh(state.recentJobsFetchedAt)) return state.recentJobs;
  if (state.recentJobsRequest) return state.recentJobsRequest;
  state.recentJobsRequest = api(recentJobsApiPath(options), { method: 'GET' })
    .then((result) => {
      const jobs = Array.isArray(result?.jobs) ? result.jobs : [];
      state.recentJobs = jobs;
      state.recentJobsFetchedAt = Date.now();
      for (const job of jobs) rememberAiAgentsFromJob(job);
      return state.recentJobs;
    })
    .finally(() => {
      state.recentJobsRequest = null;
    });
  return state.recentJobsRequest;
}

async function fetchVisibleJob(jobId = '', options = {}) {
  const safeId = String(jobId || '').trim();
  if (!safeId) return null;
  if (options.force !== true) {
    const cached = orderRuntimeCachedJob(state.recentJobs, safeId);
    if (cached) return cached;
  }
  const result = await api(visibleJobApiPath(safeId, {
    ...options,
    visitorId: state.visitorId
  }), { method: 'GET' });
  const job = result?.job && typeof result.job === 'object' ? { ...result.job, id: result.job.id || safeId } : null;
  if (job?.id) {
    state.recentJobs = orderRuntimeUpsertRecentJob(state.recentJobs, job, 50);
    state.recentJobsFetchedAt = Date.now();
    rememberAiAgentsFromJob(job);
  }
  return job;
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

async function refreshRecurringOrders(options = {}) {
  const force = options.force === true;
  if (!force && catalogCacheFresh(state.recurringOrdersFetchedAt)) return state.recurringOrders;
  if (state.recurringOrdersRequest) return state.recurringOrdersRequest;
  state.recurringOrdersRequest = api('/api/recurring-orders', { method: 'GET' })
    .then((result) => {
      state.recurringOrders = Array.isArray(result?.recurring_orders) ? result.recurring_orders : [];
      state.recurringOrdersFetchedAt = Date.now();
      return state.recurringOrders;
    })
    .finally(() => {
      state.recurringOrdersRequest = null;
    });
  return state.recurringOrdersRequest;
}

async function refreshWorkerAgents(options = {}) {
  const force = options.force === true;
  const offset = Math.max(0, Number(options.offset || 0));
  const append = options.append === true || offset > 0;
  if (!force && !append && catalogCacheFresh(state.workerAgentsFetchedAt)) return state.workerAgents;
  if (state.workerAgentsRequest) return state.workerAgentsRequest;
  state.workerAgentsRequest = api(catalogApiPath('/api/agents', options), { method: 'GET' })
    .then((result) => {
      const agents = Array.isArray(result?.agents) ? result.agents : [];
      state.workerAgents = append ? mergeCatalogById(state.workerAgents, agents) : agents;
      state.workerAgentsTotal = Math.max(state.workerAgents.length, Number(result?.total || 0));
      const nextOffset = Number(result?.offset ?? offset) + agents.length;
      state.workerAgentsHasMore = Boolean(result?.hasMore ?? (state.workerAgentsTotal > nextOffset));
      state.workerAgentsFetchedAt = Date.now();
      return state.workerAgents;
    })
    .finally(() => {
      state.workerAgentsRequest = null;
    });
  return state.workerAgentsRequest;
}

function warmUtilityCatalogs() {
  void refreshWorkerAgents().catch(() => {});
  void refreshRegisteredApps().catch(() => {});
  void refreshAppContexts().catch(() => {});
  void refreshRecentJobs().catch(() => {});
  void refreshRecurringOrders().catch(() => {});
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

function localTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Tokyo';
  } catch {
    return 'Asia/Tokyo';
  }
}

function scheduleableCompletedOrders() {
  return (Array.isArray(state.recentJobs) ? state.recentJobs : [])
    .filter((job) => job?.id && String(job.status || '').trim().toLowerCase() === 'completed' && String(job.prompt || '').trim())
    .slice(0, 20);
}

function completedOrderById(id = '') {
  const safeId = String(id || '').trim();
  if (!safeId) return null;
  return scheduleableCompletedOrders().find((job) => String(job.id || '') === safeId) || null;
}

function scheduleFormHtml() {
  const completedOrders = scheduleableCompletedOrders();
  const hasCompletedOrders = completedOrders.length > 0;
  const orderOptions = completedOrders.map((job) => {
    const label = [
      taskLabel(job.taskType || job.workflowTask || 'work'),
      shortDateTime(job.completedAt || job.updatedAt || job.createdAt),
      compact(job.prompt || '', 88)
    ].filter(Boolean).join(' / ');
    return `<option value="${escapeHtml(job.id)}">${escapeHtml(label)}</option>`;
  }).join('');
  return [
    '<form class="utility-form schedule-form" data-schedule-create>',
    '<label class="utility-field"><span>Completed order to rerun</span>',
    hasCompletedOrders
      ? `<select name="source_job_id">${orderOptions}</select>`
      : '<select name="source_job_id" disabled><option>Run an order to completion first</option></select>',
    '</label>',
    '<div class="utility-grid">',
    '<label class="utility-field"><span>Repeat</span><select name="interval"><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="hourly">Hourly</option></select></label>',
    '<label class="utility-field"><span>Time</span><input name="time" type="time" value="09:00" /></label>',
    '<label class="utility-field"><span>Weekday</span><select name="weekday"><option value="1">Mon</option><option value="2">Tue</option><option value="3">Wed</option><option value="4">Thu</option><option value="5">Fri</option><option value="6">Sat</option><option value="0">Sun</option></select></label>',
    `<label class="utility-field"><span>Timezone</span><input name="timezone" value="${escapeHtml(localTimezone())}" /></label>`,
    '<label class="utility-field"><span>Max runs</span><input name="max_runs" type="number" min="0" max="365" value="0" /></label>',
    '</div>',
    '<div class="utility-actions schedule-submit-row">',
    `<button class="primary-btn file-action" type="submit"${hasCompletedOrders ? '' : ' disabled'}>Schedule completed order</button>`,
    '</div>',
    '<span class="chat-hint">Schedules rerun a completed order. This avoids turning an unclear request into recurring work before CAIt has asked questions, routed it, and delivered it once. The chat does not need to stay open.</span>',
    '</form>'
  ].join('\n');
}

function scheduleIntervalLabel(schedule = {}) {
  const interval = String(schedule.interval || 'daily');
  if (interval === 'hourly') return `Every ${Math.max(1, Number(schedule.every || 1))} hour(s)`;
  if (interval === 'weekly') return `Weekly ${schedule.time || '09:00'} ${weekdayLabel(schedule.weekday)}`;
  return `Daily ${schedule.time || '09:00'}`;
}

function weekdayLabel(value = 1) {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][Math.max(0, Math.min(6, Number(value || 0)))] || 'Mon';
}

function recurringOrderRows(orders = []) {
  const rows = (Array.isArray(orders) ? orders : []).filter((order) => order?.id).slice(0, 40).map((order) => {
    const status = String(order.status || 'active');
    const schedule = order.schedule || {};
    const meta = [
      status,
      scheduleIntervalLabel(schedule),
      schedule.timezone || '',
      order.nextRunAt ? `next ${shortDateTime(order.nextRunAt)}` : '',
      order.lastStatus ? `last ${order.lastStatus}` : ''
    ].filter(Boolean).join(' / ');
    const canPause = status === 'active';
    const canResume = status === 'paused' || status === 'needs_action';
    return [
      '<div class="utility-row">',
      '<div class="utility-main">',
      `<strong>${escapeHtml(taskLabel(order.taskType || 'work'))}</strong>`,
      `<span class="utility-meta">${escapeHtml(meta)}</span>`,
      `<span>${escapeHtml(compact(order.prompt || order.lastError || '', 190))}</span>`,
      '</div>',
      '<div class="utility-actions">',
      order.lastJobId ? `<button class="ghost-btn file-action" type="button" data-utility-open-job="${escapeHtml(order.lastJobId)}">Last run</button>` : '',
      canPause ? `<button class="ghost-btn file-action" type="button" data-recurring-status="${escapeHtml(order.id)}" data-status="paused">Pause</button>` : '',
      canResume ? `<button class="ghost-btn file-action" type="button" data-recurring-status="${escapeHtml(order.id)}" data-status="active">Resume</button>` : '',
      status !== 'cancelled' && status !== 'completed' ? `<button class="ghost-btn file-action" type="button" data-recurring-cancel="${escapeHtml(order.id)}">Cancel</button>` : '',
      '</div>',
      '</div>'
    ].filter(Boolean).join('\n');
  });
  return rows.length ? `<div class="utility-list">${rows.join('\n')}</div>` : utilityEmptyHtml('No scheduled work is active yet.');
}

function schedulePanelHtml(status = '') {
  return [
    status ? `<div class="chat-hint">${escapeHtml(status)}</div>` : '',
    scheduleFormHtml(),
    '<h3 class="utility-section-title">Scheduled work</h3>',
    recurringOrderRows(state.recurringOrders)
  ].filter(Boolean).join('\n');
}

async function showSchedulePanel() {
  openUtilityModal('Schedules', schedulePanelHtml('Loading scheduled work...'));
  try {
    await Promise.all([
      refreshRecurringOrders({ force: true }),
      refreshRecentJobs({ force: true, limit: 40 })
    ]);
    if (utilityModalIsOpen('Schedules')) openUtilityModal('Schedules', schedulePanelHtml());
  } catch (error) {
    if (utilityModalIsOpen('Schedules')) openUtilityModal('Schedules', schedulePanelHtml(orderErrorMessage(error)));
  }
}

function scheduleFromForm(form) {
  const data = new FormData(form);
  const interval = String(data.get('interval') || 'daily').trim();
  return {
    schedule: {
      interval,
      time: String(data.get('time') || '09:00').trim() || '09:00',
      weekday: Number(data.get('weekday') || 1),
      timezone: String(data.get('timezone') || localTimezone()).trim() || 'Asia/Tokyo'
    },
    maxRuns: Math.max(0, Math.min(365, Number(data.get('max_runs') || 0) || 0)),
    sourceJobId: String(data.get('source_job_id') || '').trim()
  };
}

function buildScheduledJobPayloadFromCompletedOrder(job = {}) {
  if (!job?.id || String(job.status || '').trim().toLowerCase() !== 'completed') {
    throw new Error('Choose a completed order before scheduling recurring work.');
  }
  const taskType = String(job.taskType || job.task_type || job.workflowTask || 'research').trim() || 'research';
  const previousInput = job.input && typeof job.input === 'object' ? job.input : {};
  const previousBroker = previousInput._broker && typeof previousInput._broker === 'object' ? previousInput._broker : {};
  const orderStrategy = String(job.orderStrategy || job.order_strategy || (job.workflow ? 'multi' : 'single') || 'single').trim() || 'single';
  return {
    parent_agent_id: 'chatux',
    task_type: taskType,
    selected_agent_id: String(job.selectedAgentId || job.selected_agent_id || job.assignedAgentId || '').trim(),
    selected_agent_name: String(job.selectedAgentName || job.selected_agent_name || '').trim(),
    prompt: String(job.prompt || '').trim(),
    order_strategy: orderStrategy,
    async_dispatch: true,
    skip_intake: true,
    visitor_id: state.visitorId,
    budget_cap: Number(job.budgetCap ?? job.budget_cap ?? 500),
    deadline_sec: Number(job.deadlineSec ?? job.deadline_sec ?? 300),
    confirmation: {
      accepted: true,
      source: 'chat_schedule_completed_order',
      accepted_at: new Date().toISOString(),
      source_job_id: String(job.id || '')
    },
    input: {
      ...previousInput,
      source: 'chatux_completed_order_schedule',
      original_prompt: previousInput.original_prompt || previousInput.originalPrompt || String(job.prompt || '').trim(),
      _broker: {
        ...previousBroker,
        recurring: {
          ...(previousBroker.recurring && typeof previousBroker.recurring === 'object' ? previousBroker.recurring : {}),
          created_from: 'completed_order_schedule_panel',
          sourceJobId: String(job.id || ''),
          sourceJobStatus: 'completed',
          chat_required: false
        },
        intake: {
          ...(previousBroker.intake && typeof previousBroker.intake === 'object' ? previousBroker.intake : {}),
          reused_completed_order: true,
          source_job_id: String(job.id || ''),
          checked_at: new Date().toISOString()
        }
      }
    }
  };
}

async function createScheduleFromForm(form) {
  const config = scheduleFromForm(form);
  const sourceJob = completedOrderById(config.sourceJobId);
  if (!sourceJob) throw new Error('Run an order to completion first, then choose it here for scheduling.');
  const payload = buildScheduledJobPayloadFromCompletedOrder(sourceJob);
  const body = {
    ...payload,
    schedule: config.schedule,
    max_runs: config.maxRuns,
    status: 'active',
    input: {
      ...(payload.input || {}),
      _broker: {
        ...(payload.input?._broker || {}),
        recurring: {
          ...(payload.input?._broker?.recurring || {}),
          schedule: config.schedule,
          maxRuns: config.maxRuns,
          sourceJobId: sourceJob.id
        }
      }
    }
  };
  const result = await api('/api/recurring-orders', {
    method: 'POST',
    body: JSON.stringify(body)
  });
  state.recurringOrdersFetchedAt = 0;
  await refreshRecurringOrders({ force: true });
  openUtilityModal('Schedules', schedulePanelHtml('Scheduled from a completed order. CAIt will rerun it in the background even if this chat is closed.'));
  appendTextMessage('system', [
    'Scheduled completed order.',
    `Schedule ID: ${result.recurring_order?.id || '-'}`,
    `Source order: ${sourceJob.id.slice(0, 8)}`,
    result.recurring_order?.nextRunAt ? `Next run: ${shortDateTime(result.recurring_order.nextRunAt)}` : ''
  ].filter(Boolean).join('\n'), { label: 'Schedules' });
}

async function updateRecurringOrderStatus(id = '', status = 'paused') {
  if (!id) return;
  await api(`/api/recurring-orders/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ status })
  });
  state.recurringOrdersFetchedAt = 0;
  await refreshRecurringOrders({ force: true });
  if (utilityModalIsOpen('Schedules')) openUtilityModal('Schedules', schedulePanelHtml(status === 'active' ? 'Schedule resumed.' : 'Schedule paused.'));
}

async function cancelRecurringOrder(id = '') {
  if (!id) return;
  await api(`/api/recurring-orders/${encodeURIComponent(id)}`, { method: 'DELETE' });
  state.recurringOrdersFetchedAt = 0;
  await refreshRecurringOrders({ force: true });
  if (utilityModalIsOpen('Schedules')) openUtilityModal('Schedules', schedulePanelHtml('Schedule cancelled.'));
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

function showInfoPanel() {
  const auth = state.auth || {};
  const login = auth.login || auth.user?.login || auth.user?.email || '';
  const adminAction = auth.isPlatformAdmin || auth.admin ? '<a class="ghost-btn file-action" href="/admin">Admin</a>' : '';
  openUtilityModal('Info', [
    '<div class="utility-list">',
    '<div class="utility-row"><div class="utility-main">',
    '<strong>Account</strong>',
    `<span class="utility-meta">${escapeHtml(login || 'Not signed in')}</span>`,
    '</div><div class="utility-actions">',
    auth.loggedIn || login ? `${adminAction}<a class="ghost-btn file-action" href="/account-settings.html">Account settings</a><button class="ghost-btn file-action" type="button" data-chat-logout>Sign out</button>` : `<a class="ghost-btn file-action" href="${escapeHtml(loginHref('google'))}">Sign in</a>`,
    '</div></div>',
    '<div class="utility-row"><div class="utility-main"><strong>Resources</strong><span class="utility-meta">Docs, terms, privacy, and help.</span></div><div class="utility-actions"><a class="ghost-btn file-action" href="/help.html">Help</a><a class="ghost-btn file-action" href="/resources.html">Resources</a></div></div>',
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
      const file = deliveryFileStore.get(String(input.dataset.fileId || ''));
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

function isStructuredOrderBriefText(value = '') {
  const text = String(value || '').trim();
  return /^Task:\s.+/mi.test(text) && /^Goal:\s.+/mi.test(text) && /^Deliver:\s.+/mi.test(text);
}

function promptInjectionSafeAnalysisContext(prompt = '') {
  const text = String(prompt || '').replace(/\s+/g, ' ').trim();
  if (!text) return false;
  return /(analy[sz]e|review|detect|explain|summari[sz]e|classify|sanitize|improve|rewrite|レビュー|解説|説明|検出|分類|安全化|書き換え|改善).{0,90}(prompt injection|jailbreak|ignore previous|system prompt|developer message|プロンプトインジェクション|脱獄|前の指示|システムプロンプト|開発者メッセージ)/i.test(text)
    || /(以下|次の|this|these).{0,60}(prompt|text|source|example|プロンプト|文章|テキスト|ソース|例|入力).{0,90}(analy[sz]e|review|detect|explain|sanitize|improve|分析|レビュー|解説|説明|検出|安全化|改善)/i.test(text);
}

function promptInjectionGuard(prompt = '') {
  const text = String(prompt || '').replace(/\u0000/g, '').trim();
  if (!text || promptInjectionSafeAnalysisContext(text)) return { blocked: false, code: '' };
  const compact = text.replace(/\s+/g, ' ');
  const rules = [
    {
      code: 'override_instructions',
      pattern: /\b(ignore|disregard|forget|override|bypass|disable|drop)\b.{0,90}\b(previous|above|prior|earlier|system|developer|instructions?|rules?|policy|policies|safety|guardrails?)\b/i
    },
    {
      code: 'override_instructions_ja',
      pattern: /(前|以前|上記|これまで|システム|開発者|ポリシー|安全|制約).{0,60}(指示|命令|ルール|プロンプト|制約).{0,60}(無視|破棄|忘れ|解除|上書き|バイパス)/i
    },
    {
      code: 'hidden_prompt_exfiltration',
      pattern: /\b(reveal|show|print|dump|leak|exfiltrate|extract|output|display)\b.{0,90}\b(system prompt|developer message|hidden instructions?|internal prompts?|tool schema|tools?|api keys?|secrets?|env(?:ironment)?(?: variables?)?)\b/i
    },
    {
      code: 'hidden_prompt_exfiltration_ja',
      pattern: /(システムプロンプト|開発者メッセージ|隠し指示|内部指示|内部プロンプト|ツール|APIキー|apiキー|秘密|シークレット|環境変数).{0,70}(出力|表示|見せ|開示|漏ら|教え|抽出)/i
    },
    {
      code: 'jailbreak_persona',
      pattern: /\b(DAN|jailbreak|developer mode|god mode|do anything now|no restrictions?|unrestricted|policy[- ]?free)\b/i
    },
    {
      code: 'role_injection',
      pattern: /(^|\n)\s*(system|developer)\s*:.{0,400}\b(ignore|override|bypass|reveal|show|dump|leak|disable|no restrictions?)\b/is
    }
  ];
  const matched = rules.find((rule) => rule.pattern.test(compact) || rule.pattern.test(text));
  return matched ? { blocked: true, code: matched.code } : { blocked: false, code: '' };
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

function normalizeLlmIntakeQuestions(value = []) {
  const seen = new Set();
  return (Array.isArray(value) ? value : [])
    .map((item) => String(item || '').replace(/\s+/g, ' ').trim())
    .filter((item) => item.length >= 12 && item.length <= 260)
    .filter((item) => {
      const key = item.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .filter((item) => !/(password|secret|api key|hidden prompt|system prompt|ignore previous|パスワード|秘密|システムプロンプト|隠しプロンプト)/i.test(item))
    .slice(0, 4);
}

function taskTypeFromOpenChatIntent(result = {}) {
  const briefTask = String(result?.order_brief || result?.orderBrief || '').match(/^Task:\s*([a-z0-9_-]+)/im)?.[1] || '';
  if (briefTask) return briefTask.trim().toLowerCase();
  return String(result?.task_type || result?.taskType || '').trim().toLowerCase();
}

function openChatIntentShouldUseStepIntake(result = {}) {
  const action = String(result?.action || '').trim();
  if (action !== 'ask_clarifying_question') return false;
  const intent = String(result?.intent || '').trim();
  return ['natural_business_growth', 'natural_marketing_launch', 'natural_idea_discovery'].includes(intent);
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
    if (!skipOpenAiIntent || options.intakeAnswered === true) throw error;
    throw new Error(chatText(
      'Server-owned order intake questions could not be loaded. No order or billing happened; retry so CAIt can fetch the selected agent contract from the server.',
      'server-owned の注文ヒアリング質問を読み込めませんでした。注文も課金も発生していません。選択エージェントの契約をサーバーから取得するため、もう一度試してください。',
      prompt
    ));
  }
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
    const manifest = appManifestById(appId);
    let payload = appTransferStore.get(transferId) || null;
    if (!manifest || !payload) {
      appendTextMessage('assistant', 'The app handoff context is no longer available. Reload the delivery or run the order again.', { tone: 'error', label: 'App handoff' });
      return;
    }
    payload = appTransferPayloadWithEditedText(payload, appHandoffButton, { compactTransferText });
    const contractError = appHandoffPayloadContractError(manifest, payload);
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
    const file = deliveryFileStore.get(String(fileButton.dataset.fileId || ''));
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
