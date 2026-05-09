import {
  chatEngineBuildIntakeCombinedPrompt,
  chatEngineBuildIntakeState,
  chatEngineBuildJobPayload,
  chatEngineBuildOrderDraft,
  chatEngineBuildPrepareOrderPayload,
  chatEngineDraftBrief,
  chatEngineIsNeedsInputResponse
} from './chat-engine.js?v=20260509a';
import {
  deliveryExecutionPromptPresentation,
  extractSocialPostTextFromDeliveryContent
} from './delivery-action-contract.js?v=20260501a';
import {
  caitAppContextChatPrompt,
  caitAppContextThreadHtml,
  consumeCaitAppContextForChat
} from './cait-app-bridge.js?v=20260508e';
import {
  isLeaderCatalogQuestionIntentText,
  isNonOrderConversationIntentText
} from './work-intent-resolver.js?v=20260505c';

const CHATUX_RETURN_PATH = '/chat';
const CHATUX_BACKFILL_INTERVAL_MS = 10000;
const CHATUX_CATALOG_PAGE_SIZE = 10;
const CHATUX_CATALOG_CACHE_TTL_MS = 60000;
const CHATUX_PROGRESS_MAX_POLLS = 300;
const CHATUX_OAUTH_RETURN_STATE_KEY = 'cait.chat.oauthReturnState.v1';
const CHATUX_OAUTH_RETURN_MAX_AGE_MS = 30 * 60 * 1000;
const CAIT_APP_CONTEXT_CHANNEL = 'cait-app-context';
const CHATUX_WELCOME_TEXT = 'What do you want done?';
const X_CLIENT_OPS_URL = 'https://x.niche-s.com/';
const CORE_FEATURE_APP_IDS = new Set(['delivery-manager']);

function leaderCatalogChatAnswer(prompt = '') {
  const ja = chatLanguage(prompt) === 'ja';
  return ja
    ? [
        '利用できる主なリーダーは以下です。これは案内回答なので、まだ注文も課金も発生していません。',
        '',
        '- CMO Leader: 集客、SEO、SNS、ローンチ、計測までを品質重視で組み立てる',
        '- CTO Leader: 技術方針、実装計画、リポジトリ修正、デプロイやロールバックを整理する',
        '- CPO Leader: プロダクト戦略、UX、優先順位、検証計画を整理する',
        '- CFO Leader: 価格、収支、ユニットエコノミクス、資金繰りを整理する',
        '- Legal Leader: 規約、プライバシー、コンプライアンス、リスクを確認する',
        '- Research Team Leader: 複数ソースの調査、比較、意思決定メモをまとめる',
        '- Build Team Leader: 実装タスクを分解し、専門エージェントやアプリへの引き継ぎをまとめる',
        '- Secretary Leader: 日程、返信、会議準備、秘書業務の流れを整理する',
        '',
        '迷う場合は、やりたい成果をそのまま書けば CAIt がリーダーか専門エージェントかを判断します。実行する場合だけ Send order を押してください。'
      ].join('\n')
    : [
        'Available leaders are below. This is a chat answer, so no order or billing happened.',
        '',
        '- CMO Leader: acquisition, SEO, social, launch, and measurement work',
        '- CTO Leader: technical direction, implementation planning, repo changes, deploy and rollback planning',
        '- CPO Leader: product strategy, UX, prioritization, and validation planning',
        '- CFO Leader: pricing, unit economics, cash flow, and finance decisions',
        '- Legal Leader: terms, privacy, compliance, and risk review',
        '- Research Team Leader: multi-source research, comparisons, and decision memos',
        '- Build Team Leader: implementation breakdowns and specialist/app handoffs',
        '- Secretary Leader: scheduling, replies, meeting prep, and assistant workflows',
        '',
        'If you are unsure, describe the outcome you want and CAIt will choose a leader or specialist. Paid work only starts when you press Send order.'
      ].join('\n');
}

const APP_AGENT_MANIFESTS = [
  {
    id: 'analytics-console',
    name: 'Analytics Console',
    kind: 'application_agent',
    description: 'Old-GA-style acquisition, search query, landing page, conversion, country, channel, and post-run measurement console for CAIt leaders.',
    baseUrl: '/analytics-console.html',
    entryUrl: '/analytics-console.html',
    capabilities: ['analytics_context', 'search_console_packet', 'ga4_packet', 'post_run_measurement'],
    requiresApprovalFor: [],
    inputContract: {
      schemaVersion: 'cait-app-context/v1',
      accepts: ['metrics', 'search_queries', 'landing_pages', 'conversion_paths', 'channel_breakdown'],
      returns: ['facts', 'metrics', 'artifacts', 'recommended_next_actions']
    },
    tags: ['analytics', 'seo', 'growth'],
    reusePrompt: 'Open Analytics Console, review acquisition evidence, then send the context to CAIt for the CMO, SEO, or Growth leader.'
  },
  {
    id: 'publisher-approval-studio',
    name: 'Publisher & Approval Studio',
    kind: 'application_agent',
    description: 'Content, page, metadata, directory submission, PR draft, and approval queue studio for external action handoffs.',
    baseUrl: '/publisher-approval.html',
    entryUrl: '/publisher-approval.html',
    capabilities: ['content_management', 'approval_queue', 'directory_submission_packet', 'publisher_change_set'],
    requiresApprovalFor: ['publish_change', 'directory_submit', 'github_pr', 'external_send'],
    inputContract: {
      schemaVersion: 'cait-app-context/v1',
      accepts: ['article_draft', 'landing_page_change', 'directory_packet', 'approval_request'],
      returns: ['approval_requests', 'artifacts', 'delivery_files', 'recommended_next_actions']
    },
    tags: ['publisher', 'approval', 'seo'],
    reusePrompt: 'Open Publisher & Approval Studio to edit, approve, or block the next external content/action packet before execution.'
  },
  {
    id: 'lead-ops-console',
    name: 'Lead Ops Console',
    kind: 'application_agent',
    description: 'Lead rows, public source evidence, statuses, owners, next actions, and email draft management before approval.',
    baseUrl: '/lead-ops.html',
    entryUrl: '/lead-ops.html',
    capabilities: ['lead_management', 'email_draft', 'crm_packet', 'outreach_review'],
    requiresApprovalFor: ['email_send', 'crm_write', 'external_send'],
    inputContract: {
      schemaVersion: 'cait-app-context/v1',
      accepts: ['lead_rows', 'evidence_urls', 'email_drafts', 'next_actions'],
      returns: ['artifacts', 'approval_requests', 'recommended_next_actions']
    },
    tags: ['crm', 'lead', 'email'],
    reusePrompt: 'Open Lead Ops Console to review lead rows and email drafts, then send a lead packet back to CAIt.'
  },
  {
    id: 'x-client-ops',
    name: 'X Client Ops',
    kind: 'application_agent',
    description: 'Action app for X post drafts, strategy context, and pre-approval posting queues.',
    baseUrl: X_CLIENT_OPS_URL,
    entryUrl: X_CLIENT_OPS_URL,
    capabilities: ['x_post_draft', 'x_post_queue', 'social_action'],
    requiresApprovalFor: ['post_now', 'send_external'],
    inputContract: {
      schemaVersion: 'cait-app-agent-transfer/v1',
      accepts: ['post_text', 'strategy', 'agent_context', 'delivery_summary', 'settings'],
      settingsKeys: ['brandName', 'serviceLine', 'targetClient', 'defaultCta', 'destinationLink', 'serviceUrl', 'workspaceNotes', 'outputLanguage'],
      requiredApprovalFor: ['post_now']
    },
    handoff: {
      createUrl: `${X_CLIENT_OPS_URL.replace(/\/+$/, '')}/api/cait/handoff`,
      method: 'POST',
      openUrlParam: 'cait_handoff'
    },
    reusePrompt: 'Create an X post, reflect the strategy, and prepare the final handoff to X Client Ops.'
  }
];

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
  draft: null,
  pendingIntake: null,
  activeLeader: null,
  activeLeaderLocked: false,
  pendingLeaderChange: null,
  draftRevision: 0,
  orderId: '',
  polling: null,
  progressNarratorArticle: null,
  progressNarratorKey: '',
  progressNarratorTimer: null,
  progressNarratorTimerArticle: null,
  followupTargetOrderId: '',
  deliveryBackfill: null,
  oauthPopupMonitor: null,
  trackedOrderIds: new Set(),
  deliveredOrderIds: new Set(),
  authorityNoticeKeys: new Set(),
  progressPollLimitNotifiedOrderIds: new Set(),
  progressErrorNoticeKeys: new Set(),
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
const processedAppContextIds = new Set();
let appContextBroadcastChannel = null;

const $ = (id) => document.getElementById(id);
const els = {
  authStatus: $('authStatus'),
  chatThread: $('chatThread'),
  composer: $('composer'),
  promptInput: $('promptInput'),
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
    en: 'Answer the questions above before CAIt prepares the order...',
    ja: '発注準備の前に、上の質問へ回答してください...'
  },
  active: {
    en: 'Add a request to the running order, or ask for status...',
    ja: '進行中オーダーへの追加要望を書くか、状態を聞いてください...'
  }
};

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
  return {
    ...session,
    id,
    sessionId: String(session.sessionId || id).trim(),
    title: compactChatTitle(session.title || chatSessionTitle(messages)),
    messages,
    activeLeader: session.activeLeader && typeof session.activeLeader === 'object'
      ? {
          taskType: String(session.activeLeader.taskType || session.activeLeader.task_type || '').trim(),
          label: String(session.activeLeader.label || session.activeLeader.name || '').trim(),
          reason: String(session.activeLeader.reason || '').trim()
        }
      : null,
    activeLeaderLocked: Boolean(session.activeLeaderLocked || session.active_leader_locked),
    activeWork: Boolean(session.activeWork || activeJobIds.length),
    linkedOrderId: String(session.linkedOrderId || '').trim(),
    activeJobIds,
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
    .slice(0, 40);
  return normalized;
}

function currentChatSessionPayload() {
  const sessionId = ensureChatSessionId({ force: state.chatMessages.length > 0 });
  if (!sessionId || !state.chatMessages.length) return null;
  const existing = state.chatSessions.find((session) => session.id === sessionId || session.sessionId === sessionId) || {};
  const now = isoNow();
  const linkedOrderId = String(existing.linkedOrderId || state.orderId || '').trim();
  const activeJobIds = [...new Set([
    ...(Array.isArray(existing.activeJobIds) ? existing.activeJobIds : []),
    linkedOrderId
  ].map((item) => String(item || '').trim()).filter(Boolean))].slice(0, 20);
  return normalizeChatSession({
    ...existing,
    id: sessionId,
    sessionId,
    title: chatSessionTitle(state.chatMessages),
    messages: state.chatMessages.slice(-80),
    activeLeader: state.activeLeader ? safeJsonClone(state.activeLeader, { depth: 3, maxText: 600, maxArray: 4 }) : null,
    activeLeaderLocked: Boolean(state.activeLeaderLocked && state.activeLeader?.taskType),
    linkedOrderId,
    activeJobIds,
    activeWork: Boolean(existing.activeWork || linkedOrderId || activeJobIds.length),
    createdAt: existing.createdAt || state.chatMessages[0]?.ts || now,
    updatedAt: now
  });
}

function persistRuntimeChatSession() {
  const session = currentChatSessionPayload();
  if (!session) return null;
  upsertChatSession(session);
  renderChatSessionSidebar();
  return session;
}

function safeSessionStorageSet(key = '', value = '') {
  try {
    window.sessionStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function safeSessionStorageGet(key = '') {
  try {
    return window.sessionStorage.getItem(key) || '';
  } catch {
    return '';
  }
}

function safeSessionStorageRemove(key = '') {
  try {
    window.sessionStorage.removeItem(key);
  } catch {}
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
      activeJobIds: state.orderId ? [state.orderId] : [],
      activeWork: Boolean(state.orderId),
      createdAt: state.chatMessages[0]?.ts || isoNow(),
      updatedAt: isoNow()
    });
  }
  if (session && state.orderId) {
    session = normalizeChatSession({
      ...session,
      linkedOrderId: session.linkedOrderId || state.orderId,
      activeJobIds: [...new Set([
        ...(Array.isArray(session.activeJobIds) ? session.activeJobIds : []),
        state.orderId
      ].filter(Boolean))],
      activeWork: true,
      updatedAt: isoNow()
    });
  }
  return {
    version: 1,
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
    activeLeader: safeJsonClone(state.activeLeader, { depth: 4, maxText: 900, maxArray: 12 }),
    activeLeaderLocked: Boolean(state.activeLeaderLocked && state.activeLeader?.taskType),
    pendingLeaderChange: safeJsonClone(state.pendingLeaderChange, { depth: 3, maxText: 1000, maxArray: 4 }),
    conversationLanguage: String(state.conversationLanguage || '').trim(),
    promptValue: String(els.promptInput?.value || '').slice(0, 8000)
  };
}

function saveChatOAuthReturnState(reason = 'oauth') {
  const snapshot = chatRuntimeStateSnapshot(reason);
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
  return safeSessionStorageSet(CHATUX_OAUTH_RETURN_STATE_KEY, serialized);
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
  if (state.polling) window.clearInterval(state.polling);
  stopProgressNarratorAnimation();
  state.polling = null;
  state.progressNarratorArticle = null;
  state.progressNarratorKey = '';
  state.currentChatSessionId = session?.id || String(snapshot.currentChatSessionId || request.sessionId || '').trim();
  state.chatMessages = (Array.isArray(session?.messages) ? session.messages : []).slice(-80);
  state.lastTranscriptPrompt = '';
  state.lastTranscriptId = '';
  state.orderId = String(snapshot.orderId || session?.linkedOrderId || request.orderId || '').trim();
  state.pendingIntake = snapshot.pendingIntake && typeof snapshot.pendingIntake === 'object' ? snapshot.pendingIntake : null;
  state.draft = snapshot.draft && typeof snapshot.draft === 'object' ? snapshot.draft : null;
  state.pendingAppContext = snapshot.pendingAppContext && typeof snapshot.pendingAppContext === 'object' ? snapshot.pendingAppContext : null;
  state.activeLeader = snapshot.activeLeader && typeof snapshot.activeLeader === 'object' ? snapshot.activeLeader : null;
  state.activeLeaderLocked = Boolean(snapshot.activeLeaderLocked && state.activeLeader?.taskType);
  state.pendingLeaderChange = snapshot.pendingLeaderChange && typeof snapshot.pendingLeaderChange === 'object' ? snapshot.pendingLeaderChange : null;
  state.conversationLanguage = String(snapshot.conversationLanguage || '').trim();
  state.draftRevision += 1;
  state.authorityNoticeKeys.clear();
  deliveryFileStore.clear();
  appTransferStore.clear();
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
  appendTextMessage('system', chatText(
    'Returned from Google connection. This chat and its active order were restored.',
    'Google接続から戻りました。このチャットと進行中のオーダーを復元しました。',
    state.chatMessages[0]?.body || state.conversationLanguage
  ), { label: 'Chat restored', record: false });
  if (session) void renderRestoredSessionOrderContext(session);
  if (state.orderId) startPolling(state.orderId);
  startDeliveryBackfillLoop({ maxRuns: 6, renderTerminalDeliveries: false });
  return true;
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
  const savedMs = Date.parse(snapshot?.savedAt || '');
  if (!Number.isFinite(savedMs) || Date.now() - savedMs > CHATUX_OAUTH_RETURN_MAX_AGE_MS) {
    safeSessionStorageRemove(CHATUX_OAUTH_RETURN_STATE_KEY);
    return false;
  }
  const savedSessionId = String(snapshot?.session?.id || snapshot?.session?.sessionId || snapshot?.currentChatSessionId || '').trim();
  if (request.sessionId && savedSessionId && request.sessionId !== savedSessionId) return false;
  const restored = applyRestoredChatSnapshot(snapshot, request);
  if (restored) {
    safeSessionStorageRemove(CHATUX_OAUTH_RETURN_STATE_KEY);
    clearChatRestoreParamsFromUrl();
  }
  return restored;
}

function restoreRequestedChatSessionFromHistory() {
  const request = chatRestoreRequestFromUrl();
  if (!request.requested || !request.sessionId) return false;
  const session = state.chatSessions.find((item) => item.id === request.sessionId || item.sessionId === request.sessionId);
  if (!session) return false;
  loadChatSession(session.id || session.sessionId);
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
    title: prompt || answer || 'Saved chat',
    activeWork: Boolean(item.activeWork),
    linkedOrderId: String(item.linkedOrderId || '').trim(),
    activeJobIds: Array.isArray(item.activeJobIds) ? item.activeJobIds : [],
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
    .slice(0, 40);
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
    const activeWork = session.activeWork ? ' / active work' : '';
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
  stopProgressNarratorAnimation();
  state.currentChatSessionId = '';
  state.chatMessages = [];
  state.lastTranscriptPrompt = '';
  state.lastTranscriptId = '';
  state.draft = null;
  state.pendingIntake = null;
  state.activeLeader = null;
  state.activeLeaderLocked = false;
  state.pendingLeaderChange = null;
  state.conversationLanguage = '';
  state.draftRevision += 1;
  state.orderId = '';
  state.progressNarratorArticle = null;
  state.progressNarratorKey = '';
  state.authorityNoticeKeys.clear();
  deliveryFileStore.clear();
  appTransferStore.clear();
  els.chatThread.innerHTML = '';
  renderActiveLeaderStatus();
  appendTextMessage('assistant', CHATUX_WELCOME_TEXT, { record: false });
  updateComposerMode();
  renderChatSessionSidebar();
}

function loadChatSession(sessionId = '') {
  const session = state.chatSessions.find((item) => item.id === sessionId || item.sessionId === sessionId);
  if (!session) return;
  if (state.polling) window.clearInterval(state.polling);
  stopProgressNarratorAnimation();
  state.polling = null;
  state.progressNarratorArticle = null;
  state.progressNarratorKey = '';
  state.currentChatSessionId = session.id;
  state.chatMessages = (Array.isArray(session.messages) ? session.messages : []).slice(-80);
  state.lastTranscriptPrompt = '';
  state.lastTranscriptId = '';
  state.draft = null;
  state.pendingIntake = null;
  state.activeLeader = session.activeLeader && typeof session.activeLeader === 'object' ? session.activeLeader : null;
  state.activeLeaderLocked = Boolean(session.activeLeaderLocked && state.activeLeader?.taskType);
  state.pendingLeaderChange = null;
  state.draftRevision += 1;
  state.orderId = session.linkedOrderId || '';
  state.authorityNoticeKeys.clear();
  deliveryFileStore.clear();
  appTransferStore.clear();
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
  void renderRestoredSessionOrderContext(session);
  if (state.orderId) startPolling(state.orderId);
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
  return '/api/chat-memory';
}

function applyAuthState(auth = {}, options = {}) {
  state.auth = auth || {};
  const loggedIn = Boolean(auth?.loggedIn || auth?.login || auth?.user);
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
      ? `<span>Signed in as ${escapeHtml(login)}</span><button class="status-logout-btn" type="button" data-chat-logout>Sign out</button>`
      : `<a href="${escapeHtml(loginHref('google'))}">Google sign in</a> or <a href="${escapeHtml(loginHref('github'))}">GitHub sign in</a> to order`;
  }
  renderChatSessionSidebar();
  return true;
}

async function refreshChatSessionHistory(options = {}) {
  const force = options.force === true;
  if (!force && state.chatSessionHistoryFetchedAt && Date.now() - state.chatSessionHistoryFetchedAt < 60_000) return state.chatSessions;
  if (state.chatSessionHistoryRequest) return state.chatSessionHistoryRequest;
  state.chatSessionHistoryRequest = api(chatSessionHistoryApiPath(), { method: 'GET' })
    .then((result) => {
      if (result?.auth && typeof result.auth === 'object') applyAuthState(result.auth);
      const serverSessions = (Array.isArray(result?.chatMemory) ? result.chatMemory : [])
        .map(chatSessionFromMemory)
        .filter(Boolean);
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
    void trackChatTranscript(state.lastTranscriptPrompt, text, {
      transcriptId: makeChatTranscriptId(state.currentChatSessionId),
      answerKind: message.tone || message.role,
      status: message.tone || ''
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
  const id = normalizeUsageId(app.id || app.name);
  if (!id || isCoreFeatureAppId(id)) return null;
  const baseUrl = String(app.baseUrl || app.base_url || app.url || '').trim();
  const entryUrl = String(app.entryUrl || app.entry_url || app.launchUrl || app.launch_url || baseUrl).trim();
  return {
    id,
    name: String(app.name || 'Application').trim(),
    kind: String(app.kind || 'application').trim(),
    description: String(app.description || '').trim(),
    baseUrl,
    entryUrl,
    capabilities: listValues(app.capabilities || app.actions || []),
    requiredConnectors: listValues(app.requiredConnectors || app.required_connectors || app.connectors || []),
    requiresApprovalFor: listValues(app.requiresApprovalFor || app.requires_approval_for || []),
    inputContract: app.inputContract || app.input_contract || null,
    handoff: app.handoff || null,
    tags: listValues(app.tags || []),
    owner: String(app.owner || '').trim(),
    status: String(app.status || '').trim(),
    verificationStatus: String(app.verificationStatus || app.verification_status || '').trim(),
    reusePrompt: String(app.reusePrompt || app.reuse_prompt || `Use ${app.name || 'this app'} as the final action app when it fits the order.`).trim()
  };
}

function appManifestSources() {
  const byId = new Map();
  for (const item of [...APP_AGENT_MANIFESTS, ...(Array.isArray(state.registeredApps) ? state.registeredApps : [])]) {
    const normalized = normalizeAppAgentManifest(item);
    if (!normalized) continue;
    byId.set(normalized.id, { ...(byId.get(normalized.id) || {}), ...normalized });
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
    const builtInSameOrigin = APP_AGENT_MANIFESTS.some((item) => normalizeUsageId(item.id) === id && id !== 'x-client-ops');
    if (builtInSameOrigin && /^(?:www\.)?aiagent-marketplace\.net$/i.test(url.hostname)) {
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
    handoff: manifest.handoff || null,
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
    cmo_leader: 'CMO Leader',
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
    seo_gap: 'SEO Agent',
    acquisition_automation: 'Acquisition Automation Agent',
    directory_submission: 'Directory Submission Agent',
    x_post: 'X Ops Connector Agent'
  };
  if (labels[safeTask]) return labels[safeTask];
  return safeTask
    ? safeTask.split(/[_\s-]+/).filter(Boolean).map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`).join(' ')
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
  const taskType = String(
    owner.taskType
    || owner.task_type
    || (ownerType === 'leader' || sourceLeaderLocked ? sourceLeaderTaskType : '')
    || fallbackLeaderTaskType
    || ''
  ).trim().toLowerCase();
  const label = String(
    owner.label
    || (ownerType === 'leader' || sourceLeaderLocked ? sourceLeaderName : '')
    || fallbackLeaderName
    || (taskType ? taskLabel(taskType) : 'CAIt')
  ).trim();
  const reason = String(owner.reason || source.reason || fallback.reason || '').trim();
  if ((ownerType === 'leader' || owner.taskType || owner.task_type || sourceLeaderLocked || fallbackLeaderLocked) && taskType) {
    return {
      type: 'leader',
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
  const token = String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  const aliases = {
    cmo: 'cmo_leader',
    cmo_leader: 'cmo_leader',
    marketing_leader: 'cmo_leader',
    growth_leader: 'cmo_leader',
    cait_cmo_leader: 'cmo_leader',
    cto: 'cto_leader',
    cto_leader: 'cto_leader',
    technical_leader: 'cto_leader',
    build_team: 'build_team_leader',
    build_team_leader: 'build_team_leader',
    engineering_leader: 'build_team_leader',
    cpo: 'cpo_leader',
    cpo_leader: 'cpo_leader',
    product_leader: 'cpo_leader',
    cfo: 'cfo_leader',
    cfo_leader: 'cfo_leader',
    finance_leader: 'cfo_leader',
    legal: 'legal_leader',
    legal_leader: 'legal_leader',
    legal_counsel: 'legal_leader',
    research: 'research_team_leader',
    research_team: 'research_team_leader',
    research_team_leader: 'research_team_leader',
    secretary: 'secretary_leader',
    secretary_leader: 'secretary_leader'
  };
  return aliases[token] || (token.endsWith('_leader') ? token : '');
}

function explicitLeaderChangeTaskTypeFromText(value = '') {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  const lower = text.toLowerCase();
  const leaderPattern = /(\b(?:cmo|cto|cpo|cfo|legal)\b|research\s+team|build\s+team|marketing\s+leader|growth\s+leader|technical\s+leader|product\s+leader|finance\s+leader|legal\s+leader|secretary\s+leader|マーケ|cmoリーダー|技術責任者|ctoリーダー|プロダクト責任者|cpoリーダー|財務|cfoリーダー|法務|legalリーダー|調査リーダー|リサーチリーダー|ビルドリーダー|秘書リーダー)/i;
  const leaderMatch = lower.match(leaderPattern);
  if (!leaderMatch) return '';
  const explicitChange = /(?:leader|リーダー|担当|主体|lead|owner|route|routing|use|switch|change|変更|切替|切り替|変え|にして|で進め|でお願い|に戻|に固定|固定|指名|選択)/i.test(text)
    || /^(?:cmo|cto|cpo|cfo|legal|research\s+team|build\s+team)(?:\s+leader)?$/i.test(text);
  if (!explicitChange) return '';
  if (/\b(?:cmo|marketing|growth)\b|マーケ/i.test(text)) return 'cmo_leader';
  if (/\b(?:cto|technical)\b|技術責任者/i.test(text)) return 'cto_leader';
  if (/\b(?:build\s+team|engineering)\b|ビルド/i.test(text)) return 'build_team_leader';
  if (/\b(?:cpo|product)\b|プロダクト責任者/i.test(text)) return 'cpo_leader';
  if (/\b(?:cfo|finance)\b|財務/i.test(text)) return 'cfo_leader';
  if (/\blegal\b|法務/i.test(text)) return 'legal_leader';
  if (/\bresearch\b|調査|リサーチ/i.test(text)) return 'research_team_leader';
  if (/\bsecretary\b|秘書/i.test(text)) return 'secretary_leader';
  return '';
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
    state.draft = withLeaderOwner(state.draft, owner, {
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
  const leader = state.activeLeader;
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
  const previous = state.activeLeader
    ? { type: 'leader', ...state.activeLeader }
    : { type: 'cait', label: 'CAIt', taskType: '' };
  const lockedStateLeader = state.activeLeaderLocked && state.activeLeader?.taskType
    ? state.activeLeader
    : null;
  const lockedOwner = lockedLeaderOwnerForPrompt(options.sample || prepared.prompt || '', options);
  const owner = lockedOwner || conversationOwnerFromPrepared(prepared, {
    activeLeaderTaskType: options.activeLeaderTaskType || lockedStateLeader?.taskType || '',
    activeLeaderName: options.activeLeaderName || lockedStateLeader?.label || '',
    activeLeaderLocked: options.activeLeaderLocked === true || Boolean(lockedStateLeader),
    conversationOwner: options.conversationOwner || null
  });
  state.activeLeader = owner.type === 'leader'
    ? {
        taskType: owner.taskType,
        label: owner.label || taskLabel(owner.taskType),
        reason: owner.reason || ''
      }
    : null;
  state.activeLeaderLocked = Boolean(state.activeLeader?.taskType && (state.activeLeaderLocked || owner.type === 'leader'));
  renderActiveLeaderStatus();
  const changed = !sameConversationOwner(previous, state.activeLeader ? { type: 'leader', ...state.activeLeader } : { type: 'cait', label: 'CAIt', taskType: '' });
  if (options.announce === true && changed) {
    if (state.activeLeader) {
      const label = state.activeLeader.label || taskLabel(state.activeLeader.taskType);
      appendTextMessage('assistant', chatText(
        `${label} is now leading this order. CAIt will stay as the router, and ${label} will gather missing details, request approvals, and coordinate specialists/apps.`,
        `${label} にチャット主体を切り替えます。CAIt はルーターとして残り、${label} が不足情報の確認、承認ポイント、専門エージェント/アプリ連携を進めます。`,
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
  return state.activeLeader;
}

function activeActorLabel(fallback = 'CAIt') {
  return state.activeLeader?.label || fallback;
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

function registerDeliveryFile(file = {}, fallbackName = 'delivery.md') {
  const name = safeFileName(file.name || fallbackName, fallbackName);
  const content = String(file.content || '');
  const id = `file-${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 10)}`;
  deliveryFileStore.set(id, {
    name,
    content,
    type: String(file.type || fileMimeType(name, content)).trim() || fileMimeType(name, content)
  });
  while (deliveryFileStore.size > 80) {
    const first = deliveryFileStore.keys().next().value;
    if (!first) break;
    deliveryFileStore.delete(first);
  }
  return { id, name, content };
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
      const name = safeFileName(file?.name || `delivery-${index + 1}.md`, `delivery-${index + 1}.md`);
      const content = String(file?.content || '').trim();
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

function detectedInputLanguage(sample = '') {
  return looksJapanese(sample) ? 'ja' : 'en';
}

function rememberConversationLanguage(sample = '') {
  if (!state.conversationLanguage && String(sample || '').trim()) {
    state.conversationLanguage = detectedInputLanguage(sample);
  }
  return state.conversationLanguage || chatLanguage(sample);
}

async function api(path, options = {}) {
  const method = String(options.method || 'GET').toUpperCase();
  const headers = new Headers(options.headers || {});
  if (!headers.has('content-type')) headers.set('content-type', 'application/json');
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && state.auth?.csrfToken) {
    headers.set('x-aiagent2-csrf', state.auth.csrfToken);
  }
  if (state.visitorId) headers.set('x-aiagent2-visitor-id', state.visitorId);
  const timeoutMs = Math.max(0, Number(options.timeoutMs || 0) || 0);
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
    throw error;
  } finally {
    if (timeout) window.clearTimeout(timeout);
  }
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
  document.querySelectorAll('[data-chat-action="analytics-use"], [data-chat-action="analytics-skip"], [data-intake-choice], [data-intake-other-add]').forEach((button) => {
    button.disabled = state.busy || !state.pendingIntake;
  });
  document.querySelectorAll('[data-chat-action="keep-leader"], [data-chat-action="switch-leader"]').forEach((button) => {
    button.disabled = state.busy || !state.pendingLeaderChange;
  });
  document.querySelectorAll('[data-x-post-submit]').forEach((button) => {
    button.disabled = state.busy;
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
  const detail = String(options.detail || '').trim();
  const status = String(options.status || '').trim();
  const phase = String(options.phase || '').trim();
  const steps = Array.isArray(options.steps) ? options.steps.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 4) : [];
  const streamText = progressNarratorStreamText(text, options, 0);
  return [
    '<div class="progress-narrator" data-progress-narrator>',
    '<div class="progress-narrator-row">',
    `<span class="progress-narrator-pulse" aria-hidden="true"></span>`,
    `<strong data-progress-narrator-text>${escapeHtml(text || 'Working through the order...')}</strong>`,
    '<span class="progress-narrator-caret" aria-hidden="true"></span>',
    '</div>',
    `<div class="progress-narrator-stream" data-progress-narrator-stream aria-live="off">${escapeHtml(streamText)}</div>`,
    detail ? `<div class="progress-narrator-detail" data-progress-narrator-detail>${escapeHtml(detail)}</div>` : '<div class="progress-narrator-detail" data-progress-narrator-detail hidden></div>',
    (status || phase) ? `<div class="progress-narrator-meta" data-progress-narrator-meta>${escapeHtml([phase, status].filter(Boolean).join(' / '))}</div>` : '<div class="progress-narrator-meta" data-progress-narrator-meta hidden></div>',
    steps.length ? `<div class="progress-narrator-steps" data-progress-narrator-steps>${steps.map((step) => `<span>${escapeHtml(step)}</span>`).join('')}</div>` : '<div class="progress-narrator-steps" data-progress-narrator-steps hidden></div>',
    '</div>'
  ].join('\n');
}

function progressNarratorStreamSegments(text = '', options = {}) {
  const sample = [text, options.detail, options.phase, options.status, state.conversationLanguage].join(' ');
  const ja = chatLanguage(sample) === 'ja';
  const base = ja
    ? ['注文を確認中', '現在フェーズを同期', '担当エージェントを確認', '待機項目を検査', '結果をチャットへ反映準備']
    : ['reading order', 'syncing phase', 'checking active agent', 'watching waits', 'preparing chat update'];
  const specific = [
    options.phase ? `${ja ? 'フェーズ' : 'phase'}: ${options.phase}` : '',
    options.status ? `${ja ? '状態' : 'status'}: ${options.status}` : '',
    ...(Array.isArray(options.steps) ? options.steps : []).slice(0, 3)
  ].map((item) => String(item || '').trim()).filter(Boolean);
  return [...specific, ...base].filter(Boolean).slice(0, 8);
}

function progressNarratorStreamText(text = '', options = {}, frame = 0) {
  const segments = progressNarratorStreamSegments(text, options);
  const cursor = ['|', '/', '-', '\\'][Math.abs(Number(frame || 0)) % 4];
  const start = Math.abs(Number(frame || 0)) % Math.max(1, segments.length);
  const ordered = [...segments.slice(start), ...segments.slice(0, start)];
  const count = Math.min(4, Math.max(2, 2 + (Math.abs(Number(frame || 0)) % 3)));
  const dots = '.'.repeat(1 + (Math.abs(Number(frame || 0)) % 3));
  return `${cursor} ${ordered.slice(0, count).join('  ·  ')}${dots}`;
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
  if (textNode) textNode.textContent = String(text || 'Working through the order...');
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

function progressNarratorTextForJob(job = {}) {
  const current = workflowCurrentChildRun(job);
  const phase = String(current?.sequencePhase || current?.sequence_phase || '').trim().toLowerCase();
  const agent = workflowChildDisplayLabel(current || {});
  const status = String(current?.status || job.status || '').trim().toLowerCase();
  if (phase === 'initial') return `${agent || 'Leader'} is reviewing the order and preparing the next handoff.`;
  if (phase === 'data') return `${agent || 'Data agent'} is checking the available metrics before research moves on.`;
  if (phase === 'research') return `${agent || 'Research agent'} is gathering source-backed context for the plan.`;
  if (phase === 'planning') return `${agent || 'Planner'} is turning the inputs into a channel and execution plan.`;
  if (phase === 'preparation') return `${agent || 'Preparation agent'} is preparing copy, pages, packets, or handoff assets.`;
  if (phase === 'action') return `${agent || 'Action agent'} is waiting for approval or preparing the external action packet.`;
  if (status === 'completed') return 'The order is complete. Preparing the delivery for this chat.';
  if (status === 'failed' || status === 'timed_out') return 'The order stopped. Collecting the failure reason and next step.';
  return 'CAIt is checking the current order state and keeping this chat attached.';
}

function progressNarratorOptionsForJob(job = {}) {
  const current = workflowCurrentChildRun(job);
  const counts = job.workflow?.agentStatusCounts || job.workflow?.statusCounts || {};
  const total = Number(counts.total || job.workflow?.plannedAgentRunCount || job.workflow?.plannedChildRunCount || 0) || 0;
  const completed = Number(counts.completed || 0) || 0;
  const phase = workflowPhaseLabel(current?.sequencePhase || current?.sequence_phase || '');
  const status = statusLabel(job);
  return {
    key: String(job.id || state.orderId || 'progress'),
    phase,
    status,
    detail: current ? `${workflowChildDisplayLabel(current)} is ${statusDisplayLabel(current.status || 'queued')}.` : '',
    steps: [
      total ? `${completed}/${total} runs complete` : '',
      workflowCurrentLocationLabel(job),
      job.failureReason || job.failure_reason || ''
    ].filter(Boolean),
    done: isTerminalStatus(job.status)
  };
}

function statusLabel(job = {}) {
  const status = String(job.status || '').trim() || 'created';
  const visibleStatus = statusDisplayLabel(status);
  if (job.jobKind === 'workflow' || job.workflow) {
    const counts = job.workflow?.agentStatusCounts || job.workflow?.statusCounts || {};
    const total = Number(counts.total || job.workflow?.plannedAgentRunCount || job.workflow?.plannedChildRunCount || 0) || 0;
    const completed = Number(counts.completed || 0) || 0;
    const blocked = Number(counts.blocked || 0) || 0;
    const failed = Number(counts.failed || 0) || 0;
    const location = workflowCurrentLocationLabel(job);
    const suffix = total ? `, ${completed}/${total} agent runs complete${blocked ? `, ${blocked} waiting` : ''}${failed ? `, ${failed} failed` : ''}` : '';
    return `${visibleStatus}${suffix}${location ? `, now: ${location}` : ''}`;
  }
  return visibleStatus;
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
    .filter((child) => !workflowChildIsInternalLeaderSequenceRun(child))
    .filter((child) => options.includeAdaptivePending === true || !workflowChildIsAdaptivePending(child));
}

function workflowPhaseLabel(phase = '') {
  const safe = String(phase || '').trim().toLowerCase();
  const labels = {
    initial: 'Leader review',
    data: 'Data',
    research: 'Research',
    planning: 'Planning',
    product_design: 'Product design',
    preparation: 'Preparation',
    action: 'Action',
    prompt_handoff: 'Action handoff',
    leader: 'Leader',
    summary: 'Summary'
  };
  return labels[safe] || (safe ? safe.replace(/_/g, ' ') : 'Workflow');
}

function workflowPhaseRank(phase = '') {
  const safe = String(phase || '').trim().toLowerCase();
  return { initial: 1, data: 2, research: 3, product_design: 4, planning: 4, preparation: 5, prompt_handoff: 6, action: 6, summary: 7 }[safe] || 9;
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
    adaptivePending: workflowChildIsAdaptivePending(child)
  })).filter((child) => child.taskType || child.agentName || child.agentId);
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
        return [
          `<div class="agent-map-node ${escapeHtml(statusClass)}${isCurrent ? ' current' : ''}">`,
          `<strong>${escapeHtml(workflowChildDisplayLabel(child))}</strong>`,
          `<span>${escapeHtml(taskLabel(child.taskType || child.dispatchTaskType || 'work'))} · ${escapeHtml(statusDisplayLabel(shownStatus || 'queued'))}</span>`,
          '</div>'
        ].join('');
      }),
      group.items.length > 4 ? `<span class="agent-map-more">+${group.items.length - 4} more</span>` : '',
      '</div>'
    ].filter(Boolean).join('\n');
  }).join('\n');
  const footer = String(options.footer || '').trim();
  return [
    `<div class="agent-map-card${options.progress ? ' progress' : ''}">`,
    '<div class="agent-map-head">',
    `<strong>${escapeHtml(options.title || 'Agent map')}</strong>`,
    `<span>${escapeHtml(options.subtitle || `${visibleRuns.length} visible agent runs`)}</span>`,
    '</div>',
    `<div class="agent-map-diagram">${diagram}</div>`,
    footer ? `<div class="chat-hint">${escapeHtml(footer)}</div>` : '',
    '</div>'
  ].join('\n');
}

function initialAgentMapHtml(created = {}, prompt = '') {
  const childRuns = createdOrderChildRuns(created, { includeAdaptivePending: true });
  const isWorkflow = String(created?.mode || '').toLowerCase() === 'workflow' || Boolean(created?.workflow_job_id || created?.workflowJobId);
  if (!isWorkflow && !childRuns.length && !created?.matched_agent_id) return '';
  if (!isWorkflow) {
    return [
      '<div class="agent-map-card">',
      '<div class="agent-map-head">',
      '<strong>Agent map</strong>',
      '<span>Initial route</span>',
      '</div>',
      '<div class="agent-map-single">',
      `<strong>${escapeHtml(String(created?.matched_agent_name || created?.matched_agent_id || 'Selected agent'))}</strong>`,
      `<span>${escapeHtml(statusDisplayLabel(created?.status || 'created'))}</span>`,
      '</div>',
      '</div>'
    ].join('\n');
  }
  return workflowAgentMapHtml(childRuns, {
    title: 'Agent map',
    subtitle: `${childRuns.length} visible agent runs · adaptive first layer`,
    footer: 'Progress updates below will show the current phase and active agent. Later layers appear after leader checkpoints.'
  });
}

function workflowPhaseProgressMapHtml(job = {}) {
  const childRuns = createdOrderChildRuns(job, { includeAdaptivePending: true });
  const current = workflowCurrentChildRun(job);
  if (!childRuns.length || !current) return '';
  const phase = String(current.sequencePhase || '').trim().toLowerCase();
  return workflowAgentMapHtml(childRuns, {
    title: `Now: ${workflowPhaseLabel(phase)}`,
    subtitle: `${workflowChildDisplayLabel(current)} · ${statusDisplayLabel(current.status || 'queued')}`,
    footer: `Order ${String(job.id || '').slice(0, 8)} moved to ${workflowPhaseLabel(phase)}.`,
    currentPhase: phase,
    currentChildId: current.id,
    progress: true
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
  return candidates
    .filter((file) => file && (file.content || file.name))
    .filter((file) => {
      const key = `${file.name || ''}:${String(file.content || '').slice(0, 120)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 8);
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
  return [
    failed && failureReason ? `Failure reason: ${failureReason}` : '',
    output.summary || report.summary || delivery.summary || deliveryReport.summary || job.failureReason || '',
    bullets.length ? bullets.map((item) => `- ${item}`).join('\n') : '',
    report.nextAction || report.next_action || deliveryReport.nextAction || deliveryReport.next_action || ''
  ].filter(Boolean).join('\n\n').trim();
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

function appAgentDeliveryArtifactsFromJob(job = {}) {
  return deliveryFiles(job).map((file) => ({
    name: String(file?.name || 'delivery.md').trim(),
    contentType: String(file?.content_type || file?.contentType || file?.type || fileMimeType(file?.name || '', file?.content || '')).trim(),
    summary: compactTransferText(file?.summary || file?.description || '', 280),
    contentPreview: compactTransferText(file?.content || '', 900)
  })).slice(0, 8);
}

function appAgentActionKind(manifest = {}, options = {}) {
  const explicit = String(options.actionKind || options.action?.kind || '').trim();
  if (explicit) return explicit;
  const caps = listValues(manifest.capabilities || []).join(' ').toLowerCase();
  const accepts = listValues(manifest.inputContract?.accepts || []).join(' ').toLowerCase();
  const combined = `${caps} ${accepts}`;
  if (/x[_\s-]?post|twitter|tweet/.test(combined)) return 'x_post_handoff';
  if (/social|post|community/.test(combined)) return 'social_handoff';
  if (/email|gmail|newsletter/.test(combined)) return 'email_handoff';
  if (/github|pull[_\s-]?request|repo|code/.test(combined)) return 'code_handoff';
  if (/crm|lead|sales|acquisition/.test(combined)) return 'acquisition_handoff';
  return 'app_handoff';
}

function appAgentRequiresApproval(manifest = {}, options = {}) {
  if (options.requiresApproval != null) return Boolean(options.requiresApproval);
  const approval = listValues(manifest.requiresApprovalFor || []);
  const caps = listValues(manifest.capabilities || []).join(' ').toLowerCase();
  return Boolean(
    approval.length
    || /(post|send|publish|submit|schedule|external|crm|email|x_|twitter)/i.test(approval.join(' '))
    || /(post|send|publish|submit|schedule|external|crm|email|x[_\s-]?post|twitter)/i.test(caps)
  );
}

function appAgentBaseTransferPacket(appId = '', job = {}, options = {}) {
  const manifest = appManifestById(appId) || {};
  const strategy = options.strategy && typeof options.strategy === 'object' ? options.strategy : {};
  const draft = options.draft && typeof options.draft === 'object' ? options.draft : {};
  const suppliedAction = options.action && typeof options.action === 'object' ? options.action : {};
  const objective = String(job.workflow?.objective || job.originalPrompt || job.input?.original_prompt || job.prompt || '').trim();
  const primaryTask = String((Array.isArray(job.workflow?.plannedTasks) ? job.workflow.plannedTasks[0] : '') || job.taskType || '').trim().toLowerCase();
  const agents = appAgentSourceAgentsFromJob(job);
  const settings = {
    brandName: strategy.product || '',
    serviceLine: strategy.product || '',
    targetClient: strategy.audience || '',
    defaultCta: strategy.goal || '',
    destinationLink: strategy.url || '',
    serviceUrl: strategy.url || '',
    channel: strategy.channel || '',
    outputLanguage: chatLanguage(objective),
    workspaceNotes: compactTransferText([
      strategy.strategy,
      objective ? `Original objective:\n${objective}` : '',
      agents.length ? `Agent chain:\n${agents.map((agent) => `- ${agent.name} (${agent.taskType}, ${agent.status || 'unknown'})`).join('\n')}` : ''
    ].filter(Boolean).join('\n\n'), 2200)
  };
  return {
    schema_version: 'cait-app-agent-transfer/v1',
    transfer_id: `transfer-${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 10)}`,
    created_at: isoNow(),
    platform: {
      name: 'CAIt',
      source: 'chatux',
      return_path: CHATUX_RETURN_PATH
    },
    app: {
      id: manifest.id || appId,
      name: manifest.name || appId,
      kind: manifest.kind || 'application_agent',
      capabilities: manifest.capabilities || [],
      input_contract: manifest.inputContract || null
    },
    order: {
      id: String(job.id || '').trim(),
      status: String(job.status || '').trim(),
      taskType: primaryTask,
      objective: compactTransferText(objective, 1200),
      workflow: Boolean(job.workflow || job.jobKind === 'workflow'),
      statusLabel: statusLabel(job)
    },
    agents,
    delivery: {
      summary: compactTransferText(deliveryText(job), 1800),
      artifacts: appAgentDeliveryArtifactsFromJob(job)
    },
    settings,
    action: {
      kind: appAgentActionKind(manifest, { ...options, action: suppliedAction }),
      text: compactTransferText(suppliedAction.text || draft.text || '', 1200),
      source: compactTransferText(suppliedAction.source || draft.source || 'CAIt delivery', 160),
      requiresApproval: appAgentRequiresApproval(manifest, { ...options, action: suppliedAction }),
      ...compactTransferObject(suppliedAction, { depth: 3, maxText: 700, maxArray: 8 })
    }
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
  const output = job.output && typeof job.output === 'object' ? job.output : {};
  const report = output.report && typeof output.report === 'object' ? output.report : {};
  const request = report.authority_request
    || report.authorityRequest
    || report.action_required
    || report.actionRequired
    || report.executor_request
    || report.executorRequest
    || null;
  return request && typeof request === 'object' ? request : null;
}

function googleIncludeGroupsFromAuthority(request = null) {
  if (!request || typeof request !== 'object') return [];
  const explicit = listValues(
    request.required_google_sources
      || request.requiredGoogleSources
      || request.google_source_types
      || request.googleSourceTypes
      || request.googleIncludeGroups
  ).map((item) => {
    const normalized = String(item || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
    if (['gsc', 'search_console', 'google_search_console', 'webmasters'].includes(normalized)) return 'gsc';
    if (['ga4', 'analytics', 'google_analytics', 'google_analytics_4'].includes(normalized)) return 'ga4';
    return '';
  }).filter(Boolean);
  if (explicit.length) return [...new Set(explicit)];
  const capabilities = listValues(request.missing_connector_capabilities || request.missingConnectorCapabilities || request.capabilities);
  const groups = [];
  if (capabilities.some((item) => /^google\.read_ga4$/i.test(String(item || '')))) groups.push('ga4');
  if (capabilities.some((item) => /^google\.read_gsc$/i.test(String(item || '')))) groups.push('gsc');
  return [...new Set(groups)];
}

function googleAuthorityConnectGroups(request = null, preferredGroup = '') {
  const groups = [];
  const add = (group) => {
    const normalized = String(group || '').trim().toLowerCase();
    const safe = normalized === 'gsc' ? 'gsc' : (normalized === 'ga4' ? 'ga4' : '');
    if (safe && !groups.includes(safe)) groups.push(safe);
  };
  for (const group of googleIncludeGroupsFromAuthority(request)) add(group);
  const capabilities = listValues(request?.missing_connector_capabilities || request?.missingConnectorCapabilities || request?.capabilities);
  if (capabilities.some((item) => /^google\.read_ga4$/i.test(String(item || '')))) add('ga4');
  if (capabilities.some((item) => /^google\.read_gsc$/i.test(String(item || '')))) add('gsc');
  if (!groups.length) add(preferredGroup);
  if (!groups.length) add('ga4');
  return ['ga4', 'gsc'].filter((group) => groups.includes(group));
}

function googleCapabilitiesForGroups(groups = []) {
  const normalized = Array.isArray(groups) ? groups : [];
  const capabilities = [];
  if (normalized.includes('ga4')) capabilities.push('google.read_ga4');
  if (normalized.includes('gsc')) capabilities.push('google.read_gsc');
  return capabilities;
}

function googleConnectLabelForGroups(groups = []) {
  const normalized = Array.isArray(groups) ? groups : [];
  if (normalized.includes('ga4') && normalized.includes('gsc')) return 'Connect GA4 + Search Console';
  if (normalized.includes('gsc')) return 'Connect Search Console';
  return 'Connect GA4';
}

function authorityNeedsApproval(request = null) {
  if (!request || typeof request !== 'object') return false;
  const missingConnectors = listValues(request.missing_connectors || request.missingConnectors || request.connectors);
  const missingCapabilities = listValues(request.missing_connector_capabilities || request.missingConnectorCapabilities || request.capabilities);
  const googleSources = listValues(request.required_google_sources || request.requiredGoogleSources || request.google_source_types || request.googleSourceTypes);
  const reason = String(request.reason || request.message || request.summary || '').trim();
  const source = String(request.source || request.reason_code || request.reasonCode || '').trim().toLowerCase();
  const requiredChannelSelection = Boolean(request.required_channel_selection || request.requiredChannelSelection);
  const channelCandidates = listValues(request.channel_candidates || request.channelCandidates || request.channels);
  const writeCapabilities = missingCapabilities.filter((item) => (
    /(post|publish|send|write|submit|create|update|delete|calendar|gmail|email|x\.post|github\.write)/i.test(String(item || ''))
    && !/^google\.read_/i.test(String(item || ''))
  ));
  if (
    source === 'leader_execution_approval'
    && requiredChannelSelection
    && !channelCandidates.length
    && !writeCapabilities.length
  ) {
    return false;
  }
  return Boolean(
    missingConnectors.length
    || missingCapabilities.length
    || googleSources.length
    || requiredChannelSelection
    || /(approval|approve|connector|required|missing|connect|confirm|publish|send|post|承認|接続|未接続|確認|投稿|送信|必要)/i.test(reason)
  );
}

function googleAuthHrefForAuthority(request = null, group = '') {
  const groups = googleAuthorityConnectGroups(request, group);
  const groupKey = groups.join('_') || 'ga4';
  const capabilities = googleCapabilitiesForGroups(groups);
  saveChatOAuthReturnState(`google_${groupKey}_approval`);
  const url = new URL('/auth/google', window.location.origin);
  url.searchParams.set('action', 'analytics_connect');
  url.searchParams.set('return_to', currentChatReturnPath({ oauthPopup: true }));
  url.searchParams.set('login_source', `chatux_${groupKey}_approval`);
  url.searchParams.set('visitor_id', state.visitorId);
  url.searchParams.set('scope_group', groups.join(','));
  url.searchParams.set('capabilities', capabilities.join(','));
  return `${url.pathname}${url.search}`;
}

function authorityNoticeKey(job = {}) {
  const request = authorityRequestFromJob(job);
  if (!authorityNeedsApproval(request)) return '';
  const missingConnectors = listValues(request.missing_connectors || request.missingConnectors || request.connectors);
  const missingCapabilities = listValues(request.missing_connector_capabilities || request.missingConnectorCapabilities || request.capabilities);
  const googleSources = googleIncludeGroupsFromAuthority(request);
  return [
    String(job.id || '').trim(),
    String(request.reason || request.message || request.summary || '').trim().slice(0, 180),
    missingConnectors.join(','),
    missingCapabilities.join(','),
    googleSources.join(',')
  ].join('|');
}

function fileLooksLikeSocialPostPack(file = {}) {
  const name = String(file?.name || '').toLowerCase();
  const type = String(file?.content_type || file?.contentType || file?.type || '').toLowerCase();
  const content = String(file?.content || '').toLowerCase();
  return Boolean(
    /social[_-\s]?post|x[_-\s]?post|tweet|twitter|post[-_\s]?pack|sns/.test(name)
    || /social[_-\s]?post|x[_-\s]?post|tweet|twitter/.test(type)
    || /x post draft|tweet text|post text|投稿本文|投稿ドラフト/.test(content)
  );
}

function xPostDraftFromJob(job = {}) {
  const files = deliveryFiles(job);
  const orderedFiles = [
    ...files.filter(fileLooksLikeSocialPostPack),
    ...files.filter((file) => !fileLooksLikeSocialPostPack(file))
  ];
  for (const file of orderedFiles) {
    const text = extractSocialPostTextFromDeliveryContent(file?.content || '', { maxLength: 280 });
    if (text) {
      return {
        text,
        source: String(file?.name || 'delivery file').trim() || 'delivery file'
      };
    }
  }
  const summaryText = deliveryText(job);
  const text = extractSocialPostTextFromDeliveryContent(summaryText, { maxLength: 280 });
  return text ? { text, source: 'delivery summary' } : null;
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

function strategySnippetFromContent(content = '') {
  const text = String(content || '').replace(/\r\n/g, '\n').trim();
  if (!text) return '';
  const headings = [
    'Answer first',
    'Context extracted from the order',
    'Customer and positioning hypothesis',
    'First growth bottleneck',
    '7-day acquisition experiment',
    'Execution packet',
    'Priority media queue',
    'SEO page packet',
    'Distribution templates',
    'Handoff to leader'
  ];
  const snippets = [];
  for (const heading of headings) {
    const pattern = new RegExp(`(?:^|\\n)#{1,4}\\s+${heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?(?=\\n#{1,4}\\s+|$)`, 'i');
    const match = text.match(pattern);
    if (match?.[0]) snippets.push(match[0].trim());
  }
  if (!snippets.length) {
    const lines = text.split('\n')
      .filter((line) => /(strategy|growth|channel|audience|conversion|goal|cta|seo|x\/social|distribution|bottleneck|execution|handoff|戦略|集客|対象|顧客|購入|登録|投稿|配信|導線)/i.test(line))
      .slice(0, 18);
    if (lines.length) snippets.push(lines.join('\n'));
  }
  return compactStrategyText(snippets.join('\n\n'), 900);
}

function strategyFieldFromText(text = '', labels = []) {
  const source = String(text || '');
  for (const label of labels) {
    const table = source.match(new RegExp(`\\|\\s*${label}\\s*\\|\\s*([^|\\n]+?)\\s*\\|`, 'i'));
    if (table?.[1]) return compact(table[1], 180);
    const field = source.match(new RegExp(`(?:^|\\n)\\s*(?:[-*]\\s*)?${label}\\s*[:：]\\s*([^\\n]+)`, 'i'));
    if (field?.[1]) return compact(field[1], 180);
  }
  return '';
}

function xStrategyContextFromJob(job = {}) {
  const files = deliveryFiles(job);
  const summary = deliveryText(job);
  const parts = [];
  if (summary) parts.push(`Delivery summary:\n${summary}`);
  for (const file of files) {
    const snippet = strategySnippetFromContent(file?.content || '');
    if (!snippet) continue;
    parts.push(`From ${String(file?.name || 'delivery file').trim() || 'delivery file'}:\n${snippet}`);
  }
  const allText = parts.join('\n\n');
  const urlMatch = allText.match(/https?:\/\/[^\s)\]|]+/i);
  return {
    strategy: compactStrategyText(allText, 1500),
    product: strategyFieldFromText(allText, ['Product', 'Service', '商材', 'サービス']),
    audience: strategyFieldFromText(allText, ['ICP', 'Primary audience', 'Audience', 'Target customer', '対象顧客', '対象']),
    goal: strategyFieldFromText(allText, ['Conversion', 'Goal', 'Objective', '目的', 'CV']),
    channel: strategyFieldFromText(allText, ['Candidate channels', 'Primary lane', 'Channel', 'チャネル']),
    url: urlMatch?.[0] || ''
  };
}

function xPostConnectHint() {
  if (!state.auth?.loggedIn) {
    return `<a class="primary-btn inline-btn file-action" href="${escapeHtml(loginHref('google'))}">Sign in</a>`;
  }
  if (state.auth?.xConfigured === false || state.auth?.xTokenEncryptionConfigured === false) {
    return '<span class="chat-hint">X OAuth is not configured for this environment.</span>';
  }
  if (state.auth?.xLinked || state.auth?.xAuthorized) {
    return '<span class="chat-hint">Connected X account will be checked before posting.</span>';
  }
  return `<a class="ghost-btn inline-btn file-action" href="${escapeHtml(xAuthHref())}">Connect X</a>`;
}

function xClientOpsHandoffUrl(jobId = '', draft = {}) {
  const url = new URL(X_CLIENT_OPS_URL);
  url.searchParams.set('cait_x_post', String(draft?.text || '').trim());
  url.searchParams.set('cait_source', String(draft?.source || 'CAIt delivery').trim());
  url.searchParams.set('cait_title', 'CAIt final X post draft');
  if (draft?.strategy) url.searchParams.set('cait_strategy', String(draft.strategy).trim());
  if (draft?.product) url.searchParams.set('cait_product', String(draft.product).trim());
  if (draft?.audience) url.searchParams.set('cait_audience', String(draft.audience).trim());
  if (draft?.goal) url.searchParams.set('cait_goal', String(draft.goal).trim());
  if (draft?.channel) url.searchParams.set('cait_channel', String(draft.channel).trim());
  if (draft?.url) url.searchParams.set('cait_url', String(draft.url).trim());
  if (jobId) url.searchParams.set('cait_job', String(jobId).trim());
  return url.toString();
}

function xClientOpsPayloadFromUrl(value = '') {
  const url = new URL(value || X_CLIENT_OPS_URL, window.location.origin);
  return {
    schema_version: 'cait-app-agent-transfer/v1',
    text: url.searchParams.get('cait_x_post') || '',
    source: url.searchParams.get('cait_source') || 'CAIt delivery',
    title: url.searchParams.get('cait_title') || 'CAIt final X post draft',
    jobId: url.searchParams.get('cait_job') || '',
    strategy: url.searchParams.get('cait_strategy') || '',
    product: url.searchParams.get('cait_product') || '',
    audience: url.searchParams.get('cait_audience') || '',
    goal: url.searchParams.get('cait_goal') || '',
    channel: url.searchParams.get('cait_channel') || '',
    url: url.searchParams.get('cait_url') || ''
  };
}

function appContextFromTransferPayload(appId = '', payload = {}) {
  const manifest = appManifestById(appId) || {};
  const order = payload.order && typeof payload.order === 'object' ? payload.order : {};
  const settings = payload.settings && typeof payload.settings === 'object' ? payload.settings : {};
  const delivery = payload.delivery && typeof payload.delivery === 'object' ? payload.delivery : {};
  const artifacts = [
    payload.action ? { type: 'action', title: payload.action.title || payload.title || 'Action packet', content: payload.action.text || payload.summary || '' } : null,
    delivery.summary ? { type: 'delivery_summary', title: payload.title || 'Delivery summary', content: delivery.summary } : null,
    ...(Array.isArray(payload.files) ? payload.files : []).map((file) => ({
      type: 'file',
      name: file?.name || '',
      content_type: file?.type || '',
      content: file?.content || ''
    }))
  ].filter(Boolean);
  return {
    source_app: normalizeUsageId(manifest.id || appId || 'app'),
    source_app_label: manifest.name || appId || 'App',
    title: payload.title || payload.action?.title || `CAIt handoff for ${manifest.name || 'app'}`,
    summary: payload.summary || delivery.summary || payload.action?.text || '',
    facts: [
      order.id ? `Order ID: ${order.id}` : '',
      order.status ? `Order status: ${order.status}` : '',
      payload.source ? `Source: ${payload.source}` : ''
    ].filter(Boolean),
    artifacts,
    recommended_next_actions: [
      manifest.requiresApprovalFor?.length ? `Review approval requirements: ${manifest.requiresApprovalFor.join(', ')}` : '',
      'Use this server-side CAIt context to continue the app action without URL-embedded payloads.'
    ].filter(Boolean),
    approval_requests: Array.isArray(payload.approval_requests) ? payload.approval_requests : [],
    handoff_targets: [manifest.id || appId].filter(Boolean),
    raw_context: compactTransferObject({
      transfer_id: payload.transfer_id || '',
      app_id: appId,
      order,
      settings,
      delivery,
      action: payload.action || null,
      context: payload.context || null
    }, { depth: 5, maxText: 900, maxArray: 12 })
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
      if (['cait_oauth_popup'].includes(key)) continue;
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

async function createAppAgentContextOpenUrl(appId = '', payload = {}) {
  const result = await api('/api/app-contexts', {
    method: 'POST',
    body: JSON.stringify({
      app_id: appId,
      context: appContextFromTransferPayload(appId, payload)
    })
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
  return String(handoffUrl || manifest?.entryUrl || X_CLIENT_OPS_URL);
}

async function createXClientOpsHandoffUrl(payload = {}, fallbackUrl = '') {
  return createAppAgentHandoffUrl('x-client-ops', payload, fallbackUrl);
}

function xClientOpsTransferPayload(job = {}, draft = {}, strategy = {}) {
  const transfer = appAgentBaseTransferPacket('x-client-ops', job, { draft, strategy });
  return {
    schema_version: 'cait-app-agent-transfer/v1',
    transfer_id: transfer.transfer_id,
    text: String(draft?.text || '').trim(),
    source: String(draft?.source || 'CAIt delivery').trim(),
    title: 'CAIt final X post draft',
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

function renderXPostTool(job = {}) {
  const draft = xPostDraftFromJob(job);
  if (!draft?.text) return '';
  const jobId = String(job?.id || '').trim();
  const strategy = xStrategyContextFromJob(job);
  const transferPayload = xClientOpsTransferPayload(job, draft, strategy);
  const transferId = registerAppTransferPayload(transferPayload);
  const xClientOpsUrl = xClientOpsHandoffUrl(jobId, { ...draft, ...strategy });
  rememberAppAgentUsage('x-client-ops', {
    title: 'CAIt final X post draft',
    lastHandoffUrl: xClientOpsUrl,
    lastOrderId: jobId,
    source: draft.source,
    product: strategy.product,
    audience: strategy.audience,
    goal: strategy.goal,
    channel: strategy.channel,
    lastContext: {
      title: 'CAIt final X post draft',
      source: draft.source,
      product: strategy.product,
      audience: strategy.audience,
      goal: strategy.goal,
      channel: strategy.channel
    },
    lastTransfer: compactTransferObject(transferPayload, { depth: 4, maxText: 700, maxArray: 8 })
  }, { increment: false });
  return [
    '<div class="x-post-card">',
    '<strong>Final action: X Client Ops</strong>',
    '<div class="chat-hint">CAIt has attached the X post draft and strategy context prepared during the workflow. Open X Client Ops to load the draft into the posting queue and use the strategy as context for this action.</div>',
    `<label class="x-post-label" for="x-post-${escapeHtml(jobId || 'draft')}">X post draft (${String(draft.text).length}/280)</label>`,
    `<textarea class="x-post-editor" id="x-post-${escapeHtml(jobId || 'draft')}" data-x-post-text="${escapeHtml(jobId)}" data-x-post-source="${escapeHtml(draft.source)}" data-app-transfer-id="${escapeHtml(transferId)}" rows="5">${escapeHtml(draft.text)}</textarea>`,
    `<div class="chat-hint">Source: ${escapeHtml(draft.source)}${strategy.strategy ? ' / Strategy attached' : ''} / Agent-app transfer attached</div>`,
    '<div class="inline-actions">',
    `<a class="primary-btn inline-btn file-action" href="${escapeHtml(xClientOpsUrl)}" target="_blank" rel="noopener noreferrer" data-x-client-ops-link="${escapeHtml(jobId)}" data-app-transfer-id="${escapeHtml(transferId)}">Open X Client Ops</a>`,
    `<button class="ghost-btn inline-btn file-action" type="button" data-x-post-copy="${escapeHtml(jobId)}">Copy X draft</button>`,
    `<button class="ghost-btn inline-btn file-action" type="button" data-x-post-submit="${escapeHtml(jobId)}">Post via CAIt connector</button>`,
    xPostConnectHint(),
    '</div>',
    '<span class="chat-hint">CAIt will not post automatically from a summary alone. X Client Ops or the CAIt connector still requires the final user action.</span>',
    '</div>'
  ].filter(Boolean).join('\n');
}

function appAgentHandoffTitle(job = {}) {
  const text = deliveryText(job);
  const first = String(text || '').split('\n').map((line) => line.trim()).find(Boolean) || '';
  return compact(first.replace(/^#+\s*/, ''), 140) || `CAIt delivery ${String(job?.id || '').slice(0, 8)}`;
}

function appAgentGenericTransferPayload(appId = '', job = {}) {
  const text = deliveryText(job);
  return {
    ...appAgentBaseTransferPacket(appId, job, {
      actionKind: 'app_handoff',
      action: {
        source: 'CAIt delivery',
        text,
        title: appAgentHandoffTitle(job)
      }
    }),
    title: appAgentHandoffTitle(job),
    source: 'CAIt delivery',
    summary: compactTransferText(text, 1800)
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

function appHandoffJobSignalText(job = {}) {
  const files = deliveryFiles(job);
  const authority = authorityRequestFromJob(job) || {};
  const childRuns = visibleWorkflowChildRuns(job.workflow?.childRuns);
  return [
    job.taskType,
    job.workflowTask,
    job.workflow?.objective,
    job.input?.original_prompt,
    job.originalPrompt,
    job.prompt,
    deliveryText(job),
    ...files.flatMap((file) => [file?.name, file?.type, file?.content_type, String(file?.content || '').slice(0, 1800)]),
    ...childRuns.flatMap((child) => [child.taskType, child.dispatchTaskType, child.agentName, child.sequencePhase, child.failureReason]),
    authority.reason,
    authority.source,
    ...listValues(authority.missing_connectors || authority.missingConnectors || authority.connectors),
    ...listValues(authority.missing_connector_capabilities || authority.missingConnectorCapabilities || authority.capabilities),
    ...listValues(authority.channel_candidates || authority.channelCandidates || authority.channels)
  ].map((item) => String(item || '').trim()).filter(Boolean).join('\n').toLowerCase();
}

function appHandoffManifestSignalText(entry = {}) {
  return [
    entry.id,
    entry.name,
    entry.description,
    ...(Array.isArray(entry.capabilities) ? entry.capabilities : []),
    ...(Array.isArray(entry.tags) ? entry.tags : []),
    ...(Array.isArray(entry.requiredConnectors) ? entry.requiredConnectors : []),
    ...(Array.isArray(entry.requiresApprovalFor) ? entry.requiresApprovalFor : []),
    ...(Array.isArray(entry.inputContract?.accepts) ? entry.inputContract.accepts : [])
  ].map((item) => String(item || '').trim()).filter(Boolean).join('\n').toLowerCase();
}

function appHandoffRelevanceScore(entry = {}, job = {}, options = {}) {
  const id = normalizeUsageId(entry.id || '');
  const jobText = options.jobText || appHandoffJobSignalText(job);
  const appText = appHandoffManifestSignalText(entry);
  const authority = authorityRequestFromJob(job) || {};
  const childRuns = visibleWorkflowChildRuns(job.workflow?.childRuns);
  const taskSet = new Set([
    String(job.taskType || '').trim().toLowerCase(),
    String(job.workflowTask || '').trim().toLowerCase(),
    ...(Array.isArray(job.workflow?.plannedTasks) ? job.workflow.plannedTasks : []),
    ...childRuns.flatMap((child) => [child.taskType, child.dispatchTaskType])
  ].map((task) => String(task || '').trim().toLowerCase()).filter(Boolean));
  const missing = [
    ...listValues(authority.missing_connectors || authority.missingConnectors || authority.connectors),
    ...listValues(authority.missing_connector_capabilities || authority.missingConnectorCapabilities || authority.capabilities),
    ...listValues(authority.channel_candidates || authority.channelCandidates || authority.channels)
  ].join(' ').toLowerCase();
  const score = { value: 0, reasons: [] };
  const add = (value, reason) => {
    if (!value) return;
    score.value += value;
    if (reason && !score.reasons.includes(reason)) score.reasons.push(reason);
  };

  if (id === 'analytics-console') {
    if (taskSet.has('data_analysis')) add(44, 'analytics/data lane');
    if (/(ga4|gsc|search console|google analytics|analytics|conversion|traffic|流入|検索クエリ|サーチコンソール)/i.test(jobText)) add(30, 'analytics evidence');
    if (/google\.read_ga4|google\.read_gsc|ga4|gsc|search_console/.test(missing)) add(34, 'Google analytics connector');
  }
  if (id === 'publisher-approval-studio') {
    if ([...taskSet].some((task) => ['seo_gap', 'landing', 'writing', 'directory_submission', 'citation_ops', 'code', 'debug'].includes(task))) add(38, 'content/publishing lane');
    if (/(article|landing|seo|directory|citation|publisher|approval|github|pull request|pr|publish|submit|掲載|承認|記事|lp|ディレクトリ)/i.test(jobText)) add(28, 'publishable artifact');
    if (/(github|directory|publish|submit|write)/i.test(missing)) add(34, 'write approval');
  }
  if (id === 'lead-ops-console') {
    if ([...taskSet].some((task) => ['list_creator', 'email_ops', 'cold_email', 'acquisition_automation'].includes(task))) add(42, 'lead/outreach lane');
    if (/(lead|crm|email|gmail|outreach|cold email|newsletter|prospect|sales|リード|営業メール|メール)/i.test(jobText)) add(30, 'lead or email artifact');
    if (/(email|gmail|crm|lead)/i.test(missing)) add(34, 'lead/email connector');
  }
  if (id === 'x-client-ops') {
    if (xPostDraftFromJob(job)?.text) add(70, 'X post draft');
    if (taskSet.has('x_post')) add(46, 'X action lane');
    if (/(x post|twitter|tweet|x\.post|投稿ドラフト|x投稿)/i.test(jobText) || /(x\.post|twitter|x\b)/i.test(missing)) add(34, 'X/social action');
  }

  const appTokens = new Set(appText.split(/[^a-z0-9_]+/).filter((token) => token.length >= 4));
  const jobTokens = new Set(jobText.split(/[^a-z0-9_]+/).filter((token) => token.length >= 4));
  const overlaps = [...appTokens].filter((token) => jobTokens.has(token)).slice(0, 5);
  if (overlaps.length) add(Math.min(18, overlaps.length * 4), `matched ${overlaps.slice(0, 2).join(', ')}`);

  return score;
}

function appAgentHandoffCandidates(job = {}) {
  const hasXPostTool = Boolean(xPostDraftFromJob(job)?.text);
  const jobText = appHandoffJobSignalText(job);
  return appManifestSources()
    .map((entry) => {
      const relevance = appHandoffRelevanceScore(entry, job, { jobText });
      return {
        ...entry,
        handoffRelevanceScore: relevance.value,
        handoffReason: relevance.reasons.slice(0, 2).join(' / ')
      };
    })
    .filter((entry) => {
      if (!entry?.id || (!entry.entryUrl && !entry.baseUrl && !entry.handoff?.createUrl)) return false;
      if (normalizeUsageId(entry.id) === 'x-client-ops' && hasXPostTool) return false;
      if (String(entry.status || '').toLowerCase() === 'deprecated') return false;
      if (Number(entry.handoffRelevanceScore || 0) <= 0) return false;
      return true;
    })
    .sort((left, right) => Number(right.handoffRelevanceScore || 0) - Number(left.handoffRelevanceScore || 0))
    .slice(0, 3);
}

function renderAppHandoffTools(job = {}) {
  if (String(job.status || '').trim().toLowerCase() !== 'completed') return '';
  const entries = appAgentHandoffCandidates(job);
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
    '<div class="chat-hint">Only apps matched to this delivery, files, agent chain, connector blocker, or action lane are shown here. External execution still requires that app or connector to ask for final approval.</div>',
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

function usageBadge(text = '') {
  const safe = String(text || '').trim();
  return safe ? `<span class="usage-badge">${escapeHtml(safe)}</span>` : '';
}

function appAgentRowsHtml(entries = []) {
  if (!entries.length) {
    return '<div class="chat-hint">No app usage yet. Open an app from a delivery or the Apps panel to add it here.</div>';
  }
  return entries.map((entry) => {
    const used = entry.lastUsedAt ? `Last used ${usageDisplayDate(entry.lastUsedAt)}` : 'Available';
    const context = entry.lastContext && typeof entry.lastContext === 'object' ? entry.lastContext : {};
    const meta = [
      used,
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
    showApps ? '<h3>Apps</h3>' : '',
    showApps ? appAgentRowsHtml(recentAppAgentEntries()) : '',
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

function directAppCommandId(prompt = '') {
  const text = String(prompt || '').trim();
  if (/x\s*client\s*ops/i.test(text) && /(open|launch|use|開|起動|呼び出|使)/i.test(text)) return 'x-client-ops';
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
  const url = new URL('/api/jobs', window.location.origin);
  url.searchParams.set('limit', String(Math.max(1, Math.min(50, Number(options.limit || 30) || 30))));
  if (state.visitorId) url.searchParams.set('visitor_id', state.visitorId);
  return `${url.pathname}${url.search}`;
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

async function fetchVisibleJob(jobId = '') {
  const safeId = String(jobId || '').trim();
  if (!safeId) return null;
  const cached = (Array.isArray(state.recentJobs) ? state.recentJobs : [])
    .find((job) => String(job?.id || '').trim() === safeId);
  if (cached) return cached;
  const result = await api(`/api/jobs/${encodeURIComponent(safeId)}?visitor_id=${encodeURIComponent(state.visitorId)}`, { method: 'GET' });
  const job = result?.job && typeof result.job === 'object' ? { ...result.job, id: result.job.id || safeId } : null;
  if (job?.id) {
    state.recentJobs = [
      job,
      ...(Array.isArray(state.recentJobs) ? state.recentJobs.filter((item) => String(item?.id || '') !== String(job.id)) : [])
    ].slice(0, 50);
    state.recentJobsFetchedAt = Date.now();
    rememberAiAgentsFromJob(job);
  }
  return job;
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

function chatSessionOrderIds(session = {}) {
  const ids = [
    session.linkedOrderId,
    ...(Array.isArray(session.activeJobIds) ? session.activeJobIds : []),
    ...(Array.isArray(session.messages) ? session.messages.flatMap((message) => orderIdsFromText(message.body || '')) : [])
  ].map((item) => String(item || '').trim()).filter(Boolean);
  return [...new Set(ids)].slice(0, 8);
}

function restoredSessionOrderCardHtml(job = {}) {
  const orderId = String(job.id || '').trim();
  const status = String(job.status || '').trim().toLowerCase();
  const terminal = isTerminalStatus(status);
  const failed = ['failed', 'timed_out'].includes(status);
  const completed = status === 'completed';
  const waiting = status === 'blocked';
  const active = !terminal && !waiting;
  const title = [
    taskLabel(job.taskType || job.workflowTask || 'work'),
    orderId ? `#${orderId.slice(0, 8)}` : ''
  ].filter(Boolean).join(' ');
  const summary = deliveryText(job) || job.failureReason || job.prompt || '';
  const childRuns = visibleWorkflowChildRuns(job.workflow?.childRuns);
  const childProgress = childRuns.length
    ? [
        '<details class="restored-order-progress" open>',
        '<summary>Progress</summary>',
        '<div class="utility-list compact">',
        ...childRuns.slice(0, 12).map((child) => {
          const childTask = taskLabel(child.taskType || child.dispatchTaskType || child.workflowTask || 'work');
          const childStatus = statusDisplayLabel(child.status || 'queued');
          const childMeta = [
            child.agentName || '',
            child.sequencePhase ? `phase: ${child.sequencePhase}` : '',
            child.failureReason || child.failure_reason || ''
          ].filter(Boolean).join(' / ');
          return [
            '<div class="utility-row restored-progress-row">',
            '<div class="utility-main">',
            `<strong>${escapeHtml(childTask)}</strong>`,
            `<span class="utility-meta">${escapeHtml(childStatus)}${childMeta ? ` / ${escapeHtml(childMeta)}` : ''}</span>`,
            '</div>',
            '</div>'
          ].join('');
        }),
        childRuns.length > 12 ? `<div class="chat-hint">${escapeHtml(`${childRuns.length - 12} more progress entries are available in the result.`)}</div>` : '',
        '</div>',
        '</details>'
      ].join('\n')
    : '';
  const meta = [
    `Status: ${statusLabel(job)}`,
    job.createdAt ? `Started: ${shortDateTime(job.createdAt)}` : '',
    job.completedAt ? `Completed: ${shortDateTime(job.completedAt)}` : '',
    job.failedAt ? `Failed: ${shortDateTime(job.failedAt)}` : '',
    job.timedOutAt ? `Timed out: ${shortDateTime(job.timedOutAt)}` : ''
  ].filter(Boolean).join(' / ');
  const hint = waiting
    ? 'This order is waiting for an approval or connector action. Review the requested action before continuing.'
    : active
      ? 'This order is still in progress. CAIt will resume polling from this chat.'
      : completed
        ? 'This order has a result. Review it here before scheduling or retrying.'
        : 'This order ended without a successful delivery. Review the reason before preparing a retry.';
  const actions = [
    orderId ? `<button class="ghost-btn inline-btn file-action" type="button" data-chat-order-open="${escapeHtml(orderId)}">${escapeHtml(terminal ? 'Show result' : 'Check status')}</button>` : '',
    orderId && terminal ? `<button class="ghost-btn inline-btn file-action" type="button" data-chat-order-retry="${escapeHtml(orderId)}">${escapeHtml(failed ? 'Prepare retry' : 'Run again')}</button>` : '',
    orderId && completed ? `<button class="ghost-btn inline-btn file-action" type="button" data-chat-order-schedule="${escapeHtml(orderId)}">Schedule</button>` : ''
  ].filter(Boolean).join('');
  return [
    '<div class="restored-order-card">',
    `<strong>${escapeHtml(title || 'Related order')}</strong>`,
    meta ? `<div class="utility-meta">${escapeHtml(meta)}</div>` : '',
    summary ? `<div>${escapeHtml(compact(summary, 520))}</div>` : '<div>Order details are available. Open the result to inspect the delivery.</div>',
    childProgress,
    actions ? `<div class="inline-actions">${actions}</div>` : '',
    `<span class="chat-hint">${escapeHtml(hint)}</span>`,
    '</div>'
  ].join('\n');
}

async function renderRestoredSessionOrderContext(session = {}) {
  const ids = chatSessionOrderIds(session);
  if (!ids.length) return;
  for (const id of ids) rememberTrackedOrder(id);
  const settled = await Promise.allSettled(ids.map((id) => fetchVisibleJob(id)));
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
  appendMessage('system', body, { label: 'Order history', tone: jobs.some((job) => !isTerminalStatus(job.status)) ? 'warn' : 'info', record: false });
  const activeJob = jobs.find((job) => !isTerminalStatus(job.status));
  const primary = activeJob || jobs[0] || null;
  if (primary?.id) {
    state.orderId = primary.id;
    if (!isTerminalStatus(primary.status)) startPolling(primary.id);
  }
}

async function showChatListPanel() {
  openUtilityModal('Chats', utilityEmptyHtml('Loading recent chats and orders...'));
  try {
    const jobs = await refreshRecentJobs({ force: true, limit: 30 });
    openUtilityModal('Chats', [
      '<div class="chat-hint">Recent orders are restored here so completed work can be reopened after reloads.</div>',
      jobUtilityRows(jobs)
    ].join('\n'));
  } catch (error) {
    openUtilityModal('Chats', utilityEmptyHtml(orderErrorMessage(error)));
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
  const appCount = appManifestSources().length;
  const staticCount = APP_AGENT_MANIFESTS.length;
  const total = state.registeredAppsTotal ? state.registeredAppsTotal + staticCount : appCount;
  return [
    status ? `<div class="chat-hint">${escapeHtml(status)}</div>` : '',
    usageLibraryHtml('apps'),
    catalogLoadMoreHtml('apps', appCount, total, state.registeredAppsHasMore)
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
  const xState = auth.xLinked || auth.xAuthorized ? 'connected' : (auth.xConfigured === false ? 'not configured' : 'not connected');
  const adminAction = auth.isPlatformAdmin || auth.admin ? '<a class="ghost-btn file-action" href="/admin">Admin</a>' : '';
  openUtilityModal('Info', [
    '<div class="utility-list">',
    '<div class="utility-row"><div class="utility-main">',
    '<strong>Account</strong>',
    `<span class="utility-meta">${escapeHtml(login || 'Not signed in')}</span>`,
    `<span>X connector: ${escapeHtml(xState)}</span>`,
    '</div><div class="utility-actions">',
    auth.loggedIn || login ? `${adminAction}<a class="ghost-btn file-action" href="${escapeHtml(xAuthHref())}">Connect X</a><button class="ghost-btn file-action" type="button" data-chat-logout>Sign out</button>` : `<a class="ghost-btn file-action" href="${escapeHtml(loginHref('google'))}">Sign in</a>`,
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
  if (['failed', 'timed_out'].includes(String(job.status || '').trim().toLowerCase())) return '';
  const authority = authorityRequestFromJob(job);
  if (!authorityNeedsApproval(authority)) return '';
  const missingConnectors = listValues(authority.missing_connectors || authority.missingConnectors || authority.connectors);
  const missingCapabilities = listValues(authority.missing_connector_capabilities || authority.missingConnectorCapabilities || authority.capabilities);
  const googleSources = googleIncludeGroupsFromAuthority(authority);
  const required = [...missingCapabilities, ...missingConnectors].filter(Boolean);
  const reason = String(authority.reason || authority.message || authority.summary || job.failureReason || 'External action requires approval before execution.').trim();
  const xNeeded = required.some((item) => /(^x$|x\.post|twitter|tweet)/i.test(item));
  const googleNeeded = required.some((item) => /^google\.|^google$/i.test(item)) || googleSources.length > 0;
  const approvalAnchor = job.id ? `approval-${String(job.id).replace(/[^a-z0-9_-]/gi, '')}` : 'chatThread';
  const openWorkHref = `#${approvalAnchor}`;
  const actionLinks = [];
  if (xNeeded && !state.auth?.loggedIn) {
    actionLinks.push(`<a class="primary-btn inline-btn file-action" href="${escapeHtml(loginHref('google'))}">Sign in</a>`);
  } else if (xNeeded && !state.auth?.xLinked && !state.auth?.xAuthorized && state.auth?.xConfigured !== false && state.auth?.xTokenEncryptionConfigured !== false) {
    actionLinks.push(`<a class="primary-btn inline-btn file-action" href="${escapeHtml(xAuthHref())}">Connect X</a>`);
  }
  if (googleNeeded && !state.auth?.loggedIn) {
    actionLinks.push(`<a class="primary-btn inline-btn file-action" href="${escapeHtml(loginHref('google'))}">Sign in with Google</a>`);
  } else if (googleNeeded) {
    const nextGoogleGroup = googleSources.includes('ga4') ? 'ga4' : (googleSources.includes('gsc') ? 'gsc' : (missingCapabilities.includes('google.read_gsc') ? 'gsc' : 'ga4'));
    const googleGroups = googleAuthorityConnectGroups(authority, nextGoogleGroup);
    actionLinks.push(`<a class="primary-btn inline-btn file-action" data-chat-oauth-popup="google" href="${escapeHtml(googleAuthHrefForAuthority(authority, nextGoogleGroup))}">${escapeHtml(googleConnectLabelForGroups(googleGroups))}</a>`);
  }
  actionLinks.push(`<a class="ghost-btn inline-btn file-action" href="${escapeHtml(openWorkHref)}">Open chat approval</a>`);
  return [
    `<div class="approval-card" id="${escapeHtml(approvalAnchor)}">`,
    '<strong>Step 1: 承認が必要です / Action approval required</strong>',
    `<div>Reason: ${escapeHtml(reason)}</div>`,
    required.length ? `<div>Required: ${escapeHtml(required.join(', '))}</div>` : '',
    googleSources.length ? `<div>Google sources: ${escapeHtml(googleSources.join(', '))}</div>` : '',
    '<div>Status: CAIt has not posted, sent, or published externally yet.</div>',
    actionLinks.length ? `<div class="inline-actions">${actionLinks.join('')}</div>` : '',
    '<span class="chat-hint">Connect or approve only the requested source. CAIt will keep the order in this chat and continue from the same order context.</span>',
    '</div>'
  ].filter(Boolean).join('\n');
}

function maybeRenderAuthorityNotice(job = {}, options = {}) {
  const key = authorityNoticeKey(job);
  if (!key || state.authorityNoticeKeys.has(key)) return false;
  state.authorityNoticeKeys.add(key);
  const body = renderAuthorityRequest(job);
  if (!body) return false;
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
    const isHtml = /\.html?$/i.test(name) || /<!doctype html|<html[\s>]/i.test(content);
    const downloadLabel = isHtml ? 'Download HTML' : 'Download MD';
    const preview = isHtml
      ? `<iframe class="html-preview" sandbox="allow-scripts allow-forms allow-popups" referrerpolicy="no-referrer" srcdoc="${escapeHtml(content)}" title="${escapeHtml(name)} preview"></iframe>`
      : '';
    return [
      '<details class="file-card">',
      `<summary>${escapeHtml(name)}</summary>`,
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

function deliveryOrderActionsHtml(job = {}) {
  const orderId = String(job.id || '').trim();
  if (!orderId || !isTerminalStatus(job.status)) return '';
  const status = String(job.status || '').trim().toLowerCase();
  const failed = ['failed', 'timed_out'].includes(status);
  const completed = status === 'completed';
  const actions = [
    `<button class="ghost-btn inline-btn file-action" type="button" data-chat-order-open="${escapeHtml(orderId)}">Check status</button>`,
    failed ? `<button class="primary-btn inline-btn file-action" type="button" data-chat-order-retry="${escapeHtml(orderId)}">Prepare retry</button>` : '',
    completed ? `<button class="ghost-btn inline-btn file-action" type="button" data-chat-order-schedule="${escapeHtml(orderId)}">Schedule</button>` : ''
  ].filter(Boolean).join('');
  return actions ? `<div class="inline-actions">${actions}</div>` : '';
}

function renderDelivery(job = {}) {
  rememberAiAgentsFromJob(job);
  const files = deliveryFiles(job);
  const text = deliveryText(job) || `Order ${job.id || ''} is ${statusDisplayLabel(job.status || 'updated')}.`;
  const body = [
    renderAuthorityRequest(job),
    deliveryOrderActionsHtml(job),
    renderXPostTool(job),
    renderAppHandoffTools(job),
    `<strong>Delivery update</strong>\n${escapeHtml(text)}`,
    files.length ? renderFileCards(files) : ''
  ].filter(Boolean).join('\n\n');
  appendMessage(isTerminalStatus(job.status) ? 'assistant' : 'system', body, {
    tone: job.status === 'completed' ? 'ok' : (job.status === 'failed' || job.status === 'timed_out' ? 'error' : (job.status === 'blocked' ? 'warn' : '')),
    label: isTerminalStatus(job.status) ? 'Delivery' : 'Progress'
  });
}

function renderDeliveryOnce(job = {}, options = {}) {
  const safeId = String(job?.id || '').trim();
  if (!safeId || !isTerminalStatus(job.status)) return false;
  if (state.deliveredOrderIds.has(safeId) && !options.force) return false;
  rememberTrackedOrder(safeId);
  renderDelivery(job);
  markOrderDelivered(safeId);
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
  for (const job of jobs) {
    const safeId = String(job?.id || '').trim();
    if (!safeId) continue;
    if (activeOrderId && safeId !== activeOrderId && options.includeHistoricalTracked !== true) continue;
    const matchesTracked = state.trackedOrderIds.has(safeId);
    const matchesRecovery = state.pendingRecoveryPayloads.some((payload) => recoveryCandidate(job, payload));
    if (!matchesTracked && !matchesRecovery) continue;
    rememberTrackedOrder(safeId);
    if (!state.orderId && matchesRecovery) state.orderId = safeId;
    if (isTerminalStatus(job.status)) {
      if (options.renderTerminalDeliveries === false && !matchesRecovery) continue;
      if (renderDeliveryOnce(job, { force: options.force === true })) delivered += 1;
    } else if (!state.polling && safeId === state.orderId) {
      maybeRenderAuthorityNotice(job, { label: 'Approval required' });
      startPolling(safeId);
    } else {
      maybeRenderAuthorityNotice(job, { label: 'Approval required' });
    }
  }
  return delivered;
}

function startDeliveryBackfillLoop(options = {}) {
  if (state.deliveryBackfill) return;
  let runs = 0;
  const tick = async () => {
    runs += 1;
    try {
      await backfillChatDeliveries(options);
    } catch {}
    if (runs >= Number(options.maxRuns || 36)) {
      window.clearInterval(state.deliveryBackfill);
      state.deliveryBackfill = null;
    }
  };
  void tick();
  state.deliveryBackfill = window.setInterval(tick, CHATUX_BACKFILL_INTERVAL_MS);
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
  els.promptInput.placeholder = chatText(placeholder.en, placeholder.ja);
}

function isNeedsInputResponse(response = {}) {
  return chatEngineIsNeedsInputResponse(response);
}

function sleep(ms = 0) {
  return new Promise((resolve) => window.setTimeout(resolve, Math.max(0, Number(ms || 0))));
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
  return {
    ok: true,
    recovered: true,
    status: job.status || 'queued',
    mode: isWorkflow ? 'workflow' : (job.status || 'queued'),
    ...(isWorkflow ? { workflow_job_id: job.id } : { job_id: job.id }),
    workflow: job.workflow || undefined,
    routing_reason: 'Recovered from order history after the create response failed.'
  };
}

async function recoverAcceptedOrderAfterCreateError(payload = {}, error = null) {
  const status = Number(error?.status || 0);
  const message = String(error?.message || error || '').toLowerCase();
  const shouldTry = status >= 500 || /failed to fetch|networkerror|load failed|network request failed/.test(message);
  if (!shouldTry) return null;
  appendTextMessage('system', 'The create response failed, but the order may already be saved. Checking history before retrying.');
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

function startIntake(response = {}, originalPrompt = '') {
  const explicitLeaderTaskType = explicitLeaderChangeTaskTypeFromText(originalPrompt);
  const requestedLeaderOwner = explicitLeaderTaskType ? leaderOwner(explicitLeaderTaskType, 'User explicitly changed the leader.') : null;
  const lockedOwner = lockedLeaderOwnerForPrompt(originalPrompt, { leaderChangeRequested: Boolean(requestedLeaderOwner) });
  const intakeResponse = requestedLeaderOwner || lockedOwner
    ? withLeaderOwner(response, requestedLeaderOwner || lockedOwner, {
        leaderChangeRequested: Boolean(requestedLeaderOwner),
        leader_change_requested: Boolean(requestedLeaderOwner)
      })
    : response;
  state.pendingLeaderChange = null;
  state.pendingIntake = chatEngineBuildIntakeState(intakeResponse, originalPrompt);
  setConversationOwnerFromPrepared(intakeResponse, {
    sample: originalPrompt,
    leaderChangeRequested: Boolean(requestedLeaderOwner)
  });
  const questions = Array.isArray(state.pendingIntake.questions) ? state.pendingIntake.questions.filter(Boolean).slice(0, 4) : [];
  const owner = state.pendingIntake.conversationOwner || conversationOwnerFromPrepared(response);
  const label = owner.type === 'leader' ? (owner.label || activeActorLabel('Intake')) : 'Intake';
  const leadLine = owner.type === 'leader'
    ? chatText(
        `${owner.label || 'The selected leader'} needs these details before dispatch.`,
        `${owner.label || '選択されたリーダー'} が実行前に確認したい内容です。`,
        originalPrompt
      )
    : '';
  const dataHint = growthLeaderNeedsDataHint(owner.taskType || state.pendingIntake.taskType, originalPrompt);
  state.draft = null;
  state.draftRevision += 1;
  updateComposerMode();
  appendTextMessage('assistant', [
    response.message || 'I need a few more details before preparing or dispatching the order.',
    leadLine,
    state.pendingIntake.selectedAgentName ? `Selected worker: ${state.pendingIntake.selectedAgentName}` : '',
    dataHint,
    '',
    chatText('Answer what you can. CAIt will not keep asking after this round:', '分かる範囲で回答してください。この回答後は追加ヒアリングを繰り返さず発注確認へ進みます:', originalPrompt),
    ...questions.map((question, index) => `${index + 1}. ${question}`),
    '',
    chatText('Nothing has been dispatched yet.', 'まだ実行も課金も発生していません。', originalPrompt)
  ].filter(Boolean).join('\n'), { tone: 'ok', label });
  const choiceHtml = intakeChoiceCardsHtml(state.pendingIntake, originalPrompt);
  if (choiceHtml) {
    appendMessage('assistant', choiceHtml, { tone: 'ok', label: chatText('Choices', '選択肢', originalPrompt) });
    seedIntakeInitialChoices(state.pendingIntake, originalPrompt);
  }
}

function growthLeaderNeedsDataHint(taskType = '', sample = '') {
  const task = String(taskType || '').trim().toLowerCase();
  if (!['cmo_leader', 'growth', 'marketing', 'customer_acquisition', 'seo_strategy', 'acquisition_automation'].includes(task)) return '';
  return chatText(
    'If you have GA4/Search Console, answer "yes, I have GA4" and I will open Analytics Console so you can choose the Google account, property, and site. If not, say "skip analytics" and CAIt will proceed with assumptions. For X/Twitter, paste the account URL.',
    'GA4/Search Console を持っている場合は「GA4あります」と答えてください。Analytics Console を開き、Googleアカウント、プロパティ、サイトを選べるようにします。使わない場合は「アナリティクスをスキップ」と答えれば、仮説で進めます。X/Twitter はアカウントURLを貼ってください。',
    sample
  );
}

function orderNeedsAnalyticsContext(taskType = '', prompt = '') {
  const task = String(taskType || '').trim().toLowerCase();
  const text = String(prompt || '').toLowerCase();
  return ['cmo_leader', 'growth', 'marketing', 'customer_acquisition', 'seo_strategy', 'seo_gap', 'acquisition_automation'].includes(task)
    || /(ga4|google analytics|search console|サーチコンソール|アナリティクス|流入|集客|seo|cvr|conversion|コンバージョン)/i.test(text);
}

function analyticsPreOrderHintHtml(taskType = '', prompt = '') {
  if (!orderNeedsAnalyticsContext(taskType, prompt)) return '';
  return [
    '<div class="preflight-card">',
    `<strong>${escapeHtml(chatText('Analytics data skipped unless attached', 'アナリティクスは添付済みの場合だけ使用', prompt))}</strong>`,
    `<span>${escapeHtml(chatText('No GA4/Search Console report is requested during Send order. If no Analytics Console context is already attached, this order will skip GA4/Search Console and continue with assumptions.', 'Send order の途中では GA4/Search Console レポートを要求しません。Analytics Console のコンテキストがすでに添付されていない場合、この発注では GA4/Search Console をスキップして仮説で進めます。', prompt))}</span>`,
    '</div>'
  ].join('\n');
}

function analyticsIntakeChoiceHtml(sample = '') {
  return intakeChoiceCardsHtml({
    originalPrompt: sample,
    taskType: 'cmo_leader',
    questions: [chatText('Do you want to use GA4/Search Console?', 'GA4/Search Consoleを使いますか？', sample)]
  }, sample);
}

function intakeSourceText(intake = {}, sample = '') {
  return [
    sample,
    intake.originalPrompt,
    ...(Array.isArray(intake.questions) ? intake.questions : [])
  ].join('\n');
}

function compactIntakeText(value = '', maxLength = 140) {
  const text = String(value || '')
    .replace(/\s+/g, ' ')
    .replace(/^[\s:：、。,.]+|[\s、。,.]+$/g, '')
    .trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trim()}…`;
}

function intakeInitialAnswerSuggestions(intake = {}, sample = '') {
  const text = intakeSourceText(intake, sample);
  const pick = (en, ja) => chatText(en, ja, sample || intake.originalPrompt || text);
  const result = {};
  const add = (id, value) => {
    const safeValue = compactIntakeText(value);
    if (!id || !safeValue) return;
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

  if (intakeHasAnalyticsQuestion(intake)) {
    pushGroup(
      'analytics',
      'Analytics data',
      'アナリティクス',
      'Use CAIt Analytics Console first, or skip and proceed with assumptions.',
      '先にCAIt Analytics Consoleを使うか、仮説で進めるかを選んでください。',
      [
        { id: 'use', label: pick('Use GA4/Search Console', 'GA4/Search Consoleを使う'), action: 'analytics-use' },
        { id: 'skip', label: pick('Skip analytics', 'アナリティクスをスキップ'), action: 'analytics-skip' }
      ]
    );
  }

  if (/(goal|objective|outcome|conversion|kpi|目的|成果|ゴール|コンバージョン|登録|問い合わせ|売上|認知|集客)/i.test(text)) {
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
      .slice(0, 3);
    if (group.id === 'analytics') {
      group.options.forEach((option) => {
        if (group.initialChoices.includes(option.label)) {
          option.selected = true;
        }
      });
    }
  });
  return groups.slice(0, 6);
}

function intakeChoiceCardsHtml(intake = {}, sample = '') {
  const groups = intakeChoiceGroups(intake, sample);
  if (!groups.length) return '';
  const initialSourceLabel = chatText('From initial request', '初回文面から', sample);
  const groupHtml = groups.map((group) => [
    '<div class="intake-choice-group">',
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
    `<div class="intake-confirmed-list" data-intake-confirmed-list="${escapeHtml(group.id)}" data-choice-group="${escapeHtml(group.title)}"${group.initialChoices?.length ? '' : ' hidden'}>`,
    ...(group.initialChoices || []).map((choice) => intakeConfirmedChoiceHtml(group.title, choice, initialSourceLabel, sample)),
    '</div>',
    '</div>'
  ].filter(Boolean).join('\n')).join('\n');
  return [
    '<div class="preflight-card intake-choice-card">',
    `<strong>${escapeHtml(chatText('Choose concrete answers', '具体的な選択肢から選んでください', sample))}</strong>`,
    `<span>${escapeHtml(chatText('Click one or more choices to add them to the answer box. You can edit or remove text before sending.', 'ボタンは複数選べます。入力欄に追加されるだけなので、送信前に編集・削除できます。', sample))}</span>`,
    groupHtml,
    `<span class="chat-hint">${escapeHtml(chatText('Selected choices are added to the composer; nothing is dispatched until you send the answer and approve the order.', '選択内容は入力欄に入るだけです。回答送信と発注承認までは実行されません。', sample))}</span>`,
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

function caitAppContextAnswerLine(context = {}) {
  const source = String(context?.source_app || '').toLowerCase();
  const raw = context?.raw_context && typeof context.raw_context === 'object' ? context.raw_context : {};
  const connectorPrompt = caitAppContextChatPrompt(context);
  if (source === 'analytics_console' || raw.googleGa4Property || raw.googleSearchConsoleSite) {
    const services = [
      raw.googleGa4Property ? 'GA4' : '',
      raw.googleSearchConsoleSite ? 'Search Console' : ''
    ].filter(Boolean).join(' + ') || 'Google Analytics/Search Console';
    const range = raw.googleReportDateRange?.start_date && raw.googleReportDateRange?.end_date
      ? ` (${raw.googleReportDateRange.start_date} to ${raw.googleReportDateRange.end_date})`
      : '';
    return `${services} connector context attached${range}.`;
  }
  return connectorPrompt.split('\n').map((line) => line.trim()).filter(Boolean)[0]
    || `Attached context from ${context?.source_app_label || context?.source_app || 'app'}.`;
}

function intakeHasAnalyticsQuestion(intake = {}) {
  const source = [
    intake.originalPrompt,
    intake.taskType,
    intake.activeLeaderTaskType,
    ...(Array.isArray(intake.questions) ? intake.questions : [])
  ].join('\n');
  return orderNeedsAnalyticsContext(intake.taskType || intake.activeLeaderTaskType || '', intake.originalPrompt || source)
    || /(ga4|google analytics|search console|サーチコンソール|アナリティクス|analytics console)/i.test(source);
}

function answerSaysAnalyticsAvailable(answer = '') {
  const text = String(answer || '').trim();
  if (!text) return false;
  const mentionsAnalytics = /(ga4|google analytics|search console|サーチコンソール|アナリティクス|analytics)/i.test(text);
  const affirmative = /(持って(?:い)?る|あります|ある|使えます|使える|接続済み|見れます|見られます|はい|yes|yeah|yep|have|available|connected)/i.test(text);
  const negative = /(持って(?:い)?ない|ありません|ないです|無し|なし|未接続|見れない|見られない|no|not|don't|do not|without|unavailable)/i.test(text);
  return !negative && (mentionsAnalytics ? affirmative || /あり/i.test(text) : affirmative);
}

async function openAnalyticsConsoleForIntake(intake = {}, answer = '') {
  const popup = window.open('about:blank', '_blank');
  const handoffId = makeChatHandoffId('analytics-intake');
  const chatReturnTo = currentChatReturnPath();
  const payload = {
    schema_version: 'cait-app-agent-transfer/v1',
    transfer_id: `analytics-intake-${Date.now().toString(36)}`,
    title: 'Analytics evidence requested from chat intake',
    source: 'CAIt Chat intake',
    summary: 'The user said GA4/Search Console data is available. Connect the right Google account, select the GA4 property and Search Console site, load the report, then send the analytics context back to CAIt before dispatching the order.',
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
    const href = await createAppAgentContextOpenUrl('analytics-console', payload);
    const url = new URL(href, window.location.origin);
    url.searchParams.set('chat_handoff_id', handoffId);
    url.searchParams.set('chat_return_to', chatReturnTo);
    if (popup) popup.location.href = url.toString();
    else window.open(url.toString(), '_blank');
    appendTextMessage('assistant', chatText(
      'I opened Analytics Console. Connect the right Google account, choose the GA4 property and Search Console site, load the report, then press Send to CAIt. I will pause this order until analytics context comes back; if you want to skip analytics, type "skip analytics".',
      'Analytics Console を開きました。正しいGoogleアカウント、GA4プロパティ、Search Consoleサイトを選び、レポートをLoadしてから Send to CAIt を押してください。この発注は分析コンテキストが戻るまで止めます。分析を使わない場合は「アナリティクスをスキップ」と入力してください。',
      answer
    ), { tone: 'ok', label: 'Analytics' });
  } catch (error) {
    const fallback = new URL('/analytics-console.html', window.location.origin);
    fallback.searchParams.set('chat_handoff_id', handoffId);
    fallback.searchParams.set('chat_return_to', chatReturnTo);
    if (popup) popup.location.href = fallback.toString();
    else window.open(fallback.toString(), '_blank');
    appendTextMessage('assistant', `${chatText('I opened Analytics Console, but could not attach the intake context automatically.', 'Analytics Consoleを開きましたが、ヒアリング文脈の自動添付には失敗しました。', answer)} ${orderErrorMessage(error)}`, { tone: 'error', label: 'Analytics' });
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
  if (options.skipAnalyticsRedirect !== true && !pendingIntakeHasAttachedAppContext(intake) && intakeHasAnalyticsQuestion(intake) && answerSaysAnalyticsAvailable(text)) {
    await openAnalyticsConsoleForIntake(intake, text);
    return true;
  }
  const explicitLeaderTaskType = explicitLeaderChangeTaskTypeFromText(text);
  const changedLeaderOwner = explicitLeaderTaskType ? leaderOwner(explicitLeaderTaskType, 'User explicitly changed the leader during intake.') : null;
  if (changedLeaderOwner) {
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
  const combined = chatEngineBuildIntakeCombinedPrompt(intake, text, {
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
  const lead = owner.type === 'leader' ? `${owner.label || taskLabel(owner.taskType)} (${owner.taskType})` : 'CAIt specialist router';
  return [
    `<strong>${updated ? 'Updated order check' : 'Order check'}</strong>`,
    '',
    `Lead: ${escapeHtml(lead)}`,
    `Task: ${escapeHtml(task)}`,
    `Route: ${escapeHtml(route)}`,
    selectedAgent ? `Selected worker: ${escapeHtml(selectedAgent)}` : '',
    `Reason: ${escapeHtml(reason)}`,
    '',
    analyticsPreOrderHintHtml(task, prompt),
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

function leaderTextHasCmoSignal(text = '', intent = '') {
  const source = `${intent}\n${text}`;
  return /natural_business_growth|natural_marketing_launch|growth|marketing|sales|acquisition|launch|signup|signups|trial|trials|customers?|conversion|seo|paid ads?|referral|sns|social|channels?|campaign|go[-\s]?to[-\s]?market|gtm|集客|売上|マーケ|ローンチ|会員登録|登録|トライアル|顧客獲得|広告|自然流入|オーガニック|媒体|チャネル|sns/i.test(source);
}

function leaderTextHasSpecificCpoSignal(text = '') {
  return /(?:\bcpo\b|chief product|product leader|product strategy|product roadmap|roadmap|ux strategy|feature priorit|feature roadmap|mvp roadmap|onboarding friction|activation path|user journey|information architecture|プロダクト責任者|プロダクト戦略|ロードマップ|機能優先|機能ロードマップ|ux戦略|仮説検証計画|アイデア検証計画)/i.test(String(text || ''));
}

function leaderTextHasSpecificCtoSignal(text = '') {
  return /(?:\bcto\b|chief technology|technical leader|engineering leader|architecture|system design|technical architecture|repo-wide|repository-wide|codebase|github repo|repository|pull request|\bpr\b|implementation plan|deploy plan|rollback plan|infra(?:structure)?|database schema|api design|技術責任者|開発責任者|アーキテクチャ|全体設計|技術設計|実装計画|デプロイ計画|ロールバック|リポジトリ|コードベース|プルリク)/i.test(String(text || ''));
}

function leaderTextHasSpecificBuildSignal(text = '') {
  return /(?:build team|coding team|implementation team|engineering team|debug|bug|fix(?:ing)?|code change|code implementation|repo fix|開発チーム|実装チーム|複数.*(?:実装|修正|開発)|デバッグ|バグ|不具合|コード修正)/i.test(String(text || ''));
}

function leaderTaskTypeFromIntentResult(prompt = '', result = {}) {
  const text = `${prompt}\n${result?.summary || ''}\n${result?.narrowing_question || ''}`.toLowerCase();
  const intent = String(result?.intent || '').trim();
  if (/(cfo|pricing|finance|unit economics|cash|価格|財務|収支|粗利)/i.test(text)) return 'cfo_leader';
  if (/(legal|privacy|terms|contract|compliance|規約|法務|契約|プライバシー)/i.test(text)) return 'legal_leader';
  if (leaderTextHasCmoSignal(text, intent)) return 'cmo_leader';
  if (leaderTextHasSpecificCtoSignal(text)) return 'cto_leader';
  if (leaderTextHasSpecificCpoSignal(text)) return 'cpo_leader';
  if (leaderTextHasSpecificBuildSignal(text)) return 'build_team_leader';
  if (/(research team|analysis team|decision team|調査チーム|分析チーム|複数.*(?:調査|分析)|意思決定)/i.test(text)) return 'research_team_leader';
  return '';
}

function clientPrepareOrderIntakeFallback(prompt = '', options = {}) {
  const taskType = String(options.taskType || options.task_type || options.activeLeaderTaskType || options.active_leader_task_type || leaderTaskTypeFromIntentResult(prompt, {}) || 'research').trim();
  const leaderName = options.activeLeaderName || options.active_leader_name || taskLabel(taskType);
  const ja = chatLanguage(prompt) === 'ja';
  const cmo = taskType === 'cmo_leader';
  const questions = cmo
    ? (ja
        ? [
            '売りたい商材・サービス内容とそのURLを教えてください。',
            '増やしたい具体的な行動（購入、問い合わせ、登録など）とターゲット層を教えてください。',
            'GA4、Search Console、LP、価格表、営業資料など参考にしたい資料や実データはありますか？',
            '優先したいチャネル、避けたい施策、予算や期限などの制約を教えてください。'
          ]
        : [
            'What product, service, and URL should this acquisition work focus on?',
            'Which action should increase, such as purchases, inquiries, signups, or trials, and who is the target audience?',
            'Do you have GA4, Search Console, landing pages, pricing, sales material, or other evidence to use?',
            'Which channels, constraints, budget, deadline, or avoided tactics should the leader respect?'
          ])
    : (ja
        ? [
            '今回達成したい成果と対象を教えてください。',
            '参考にしたい資料、URL、データ、制約があれば教えてください。',
            '最終アウトプットの形式と優先順位を教えてください。'
          ]
        : [
            'What outcome and target should this work focus on?',
            'What source material, URLs, data, or constraints should be used?',
            'What final output format and priority should the leader optimize for?'
          ]);
  return {
    ok: true,
    status: 'needs_input',
    needs_input: true,
    reason: 'client_prepare_order_intake_fallback',
    prompt,
    source: 'client_fallback',
    inferred_task_type: taskType,
    taskType,
    activeLeaderTaskType: taskType,
    activeLeaderName: leaderName,
    questions,
    message: ja
      ? `${leaderName} が実行前に確認したい内容です。まだ実行も課金もしていません。`
      : `${leaderName} needs this context before execution. Nothing has run or been billed yet.`,
    conversationOwner: {
      type: 'leader',
      taskType,
      label: leaderName,
      reason: 'Client-side intake fallback after prepare-order was temporarily unavailable.'
    },
    intake: {
      originalPrompt: prompt,
      taskType,
      questions,
      questionSource: 'client_fallback'
    }
  };
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
    const lockedOwner = lockedLeaderOwnerForPrompt(prompt, { leaderChangeRequested: Boolean(explicitLeaderTaskType) });
    const automaticLeaderTaskType = leaderTaskTypeFromIntentResult(prompt, result);
    if (!explicitLeaderTaskType && suggestLeaderChangeIfNeeded(automaticLeaderTaskType, prompt, 'openai_intake', { preparedPrompt: prompt })) return true;
    const leaderTaskType = explicitLeaderTaskType || lockedOwner?.taskType || automaticLeaderTaskType;
    if (leaderTaskType && intakeQuestions.length >= 2) {
      startIntake({
        status: 'needs_input',
        needs_input: true,
        reason: 'leader_context_required',
        inferred_task_type: leaderTaskType,
        prompt,
        questions: intakeQuestions,
        message: chatLanguage(prompt) === 'ja'
          ? 'リーダーが提案前に確認したい内容です。まだ実行も課金もしていません。'
          : 'The leader needs this context before proposing. Nothing has run or been billed yet.',
        conversationOwner: {
          type: 'leader',
          taskType: leaderTaskType,
          label: taskLabel(leaderTaskType),
          reason: result.summary || 'OpenAI-generated leader intake.'
        },
        intake: {
          originalPrompt: prompt,
          taskType: leaderTaskType,
          questions: intakeQuestions,
          questionSource: 'openai'
        }
      }, prompt);
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
    const automaticLeaderTaskType = leaderTaskTypeFromIntentResult(prompt, result);
    if (!explicitLeaderTaskType && suggestLeaderChangeIfNeeded(automaticLeaderTaskType, prompt, 'openai_prepare', { preparedPrompt: brief || prompt })) return true;
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
    state.activeLeader = {
      taskType: changedLeaderOwner.taskType,
      label: changedLeaderOwner.label,
      reason: changedLeaderOwner.reason
    };
    state.activeLeaderLocked = true;
    state.draft = withLeaderOwner(state.draft, changedLeaderOwner, {
      leaderChangeRequested: true,
      leader_change_requested: true
    });
    renderActiveLeaderStatus();
  } else {
    const lockedOwner = lockedLeaderOwnerForPrompt(text);
    if (lockedOwner) state.draft = withLeaderOwner(state.draft, lockedOwner);
  }
  const label = chatLanguage(text) === 'ja' ? '追加調整' : 'User adjustment';
  state.draft.prompt = [state.draft.prompt, `${label}:\n${text}`].filter(Boolean).join('\n\n');
  state.draft.updatedAt = new Date().toISOString();
  state.draftRevision += 1;
  appendOrderConfirmation({ updated: true });
  return true;
}

function retryDraftFromJob(job = {}) {
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
  return {
    taskType,
    task_type: taskType,
    resolvedOrderStrategy: route,
    resolved_order_strategy: route,
    reason: `Prepared after reviewing previous order ${String(job.id || '').slice(0, 8)}. It will not run until Send order is pressed.`,
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
          sourceOrderId: String(job.id || '').trim(),
          sourceStatus: String(job.status || '').trim(),
          preservePrompt: true,
          preservePlan: plannedTasks.length > 0,
          plannedTasks,
          preparedAt: new Date().toISOString()
        },
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

async function prepareRetryFromOrder(orderId = '') {
  const safeId = String(orderId || '').trim();
  if (!safeId) return;
  setBusy(true);
  try {
    const job = await fetchVisibleJob(safeId);
    if (!job?.id) throw new Error('Order was not found.');
    renderDeliveryOnce(job, { force: true });
    state.draft = retryDraftFromJob(job);
    const retryOwner = state.draft.conversationOwner?.type === 'leader'
      ? leaderOwner(state.draft.conversationOwner.taskType, `Preserved from retry source order ${String(job.id || '').slice(0, 8)}.`)
      : null;
    if (retryOwner) {
      state.activeLeader = {
        taskType: retryOwner.taskType,
        label: retryOwner.label,
        reason: retryOwner.reason
      };
      state.activeLeaderLocked = true;
      state.draft = withLeaderOwner(state.draft, retryOwner);
      renderActiveLeaderStatus();
    } else {
      const lockedOwner = lockedLeaderOwnerForPrompt(state.draft.originalPrompt || state.draft.prompt);
      if (lockedOwner) state.draft = withLeaderOwner(state.draft, lockedOwner);
    }
    setConversationOwnerFromPrepared(state.draft, { sample: state.draft.originalPrompt || state.draft.prompt });
    state.draftRevision += 1;
    appendTextMessage('assistant', chatText(
      'I prepared a retry draft from the previous order. Review the result above and press Send order only if you want to run it again.',
      '過去オーダーの内容からリトライ用ドラフトを作りました。上の結果を確認し、再実行する場合だけ Send order を押してください。',
      state.draft.originalPrompt || state.draft.prompt
    ), { tone: 'warn', label: 'Retry confirmation' });
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
      if (isTerminalStatus(job.status)) return job;
    } catch {}
  }
  try {
    const jobs = await refreshRecentJobs({ force: true });
    const terminal = (Array.isArray(jobs) ? jobs : []).find((job) => job?.id && isTerminalStatus(job.status));
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
      'I could not find an order to retry. Open an order from history first, then press Prepare retry.',
      'リトライ対象のオーダーが見つかりません。先に履歴から対象オーダーを開いてから Prepare retry を押してください。',
      prompt
    ), { tone: 'warn', label: 'Retry' });
    return true;
  }
  if (!isTerminalStatus(job.status)) {
    appendTextMessage('assistant', chatText(
      `Order ${job.id.slice(0, 8)} is still ${statusLabel(job)}. I did not create a retry draft while the order is active.`,
      `オーダー ${job.id.slice(0, 8)} はまだ ${statusLabel(job)} です。進行中のためリトライドラフトは作成していません。`,
      prompt
    ), { tone: 'warn', label: 'Retry' });
    maybeRenderAuthorityNotice(job, { label: 'Approval required' });
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
  return true;
}

async function prepareFollowupForRunningOrder(prompt = '') {
  const text = String(prompt || '').trim();
  const orderId = String(state.orderId || '').trim();
  if (!text || !orderId) return false;
  const job = await fetchVisibleJob(orderId);
  if (!job?.id || isTerminalStatus(job.status)) return false;
  const taskType = String(
    (Array.isArray(job.workflow?.plannedTasks) ? job.workflow.plannedTasks[0] : '')
    || job.taskType
    || 'research'
  ).trim().toLowerCase() || 'research';
  const isWorkflow = job.jobKind === 'workflow' || Boolean(job.workflow);
  const followupPrompt = [
    `Follow-up/change request for running order ${job.id}:`,
    text,
    '',
    'Use the previous order context, completed specialist outputs, active blockers, and current workflow state. Treat this as an additive/revised instruction, not a separate unrelated request.'
  ].join('\n');
  const prepared = {
    taskType,
    task_type: taskType,
    resolvedOrderStrategy: isWorkflow ? 'multi' : 'auto',
    resolved_order_strategy: isWorkflow ? 'multi' : 'auto',
    reason: `Prepared as an add-on request for running order ${job.id.slice(0, 8)}. It will not run until Send order is pressed.`,
    conversationOwner: taskType.endsWith('_leader')
      ? { type: 'leader', taskType, label: taskLabel(taskType), reason: 'Follow-up request for active leader workflow.' }
      : { type: 'cait', label: 'CAIt', reason: 'Follow-up request for active order.' }
  };
  state.draft = chatEngineBuildOrderDraft(followupPrompt, prepared, {
    originalPrompt: text,
    intakeChecked: true,
    intakeAnswered: true,
    conversationOwner: prepared.conversationOwner
  });
  const broker = state.draft.input?._broker && typeof state.draft.input._broker === 'object' ? state.draft.input._broker : {};
  state.draft.input = {
    ...(state.draft.input || {}),
    _broker: {
      ...broker,
      conversation: {
        ...(broker.conversation && typeof broker.conversation === 'object' ? broker.conversation : {}),
        mode: 'followup',
        followupToJobId: job.id,
        followup_to_job_id: job.id,
        requestedAt: new Date().toISOString()
      }
    }
  };
  state.draft.followupToJobId = job.id;
  state.followupTargetOrderId = job.id;
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
  const explicitLeaderTaskType = explicitLeaderChangeTaskTypeFromText(prompt);
  const leaderChangeRequested = options.leaderChangeRequested === true || Boolean(explicitLeaderTaskType);
  const requestedLeaderOwner = explicitLeaderTaskType ? leaderOwner(explicitLeaderTaskType, 'User explicitly changed the leader.') : null;
  if (requestedLeaderOwner) {
    state.pendingLeaderChange = null;
    state.activeLeader = {
      taskType: requestedLeaderOwner.taskType,
      label: requestedLeaderOwner.label,
      reason: requestedLeaderOwner.reason
    };
    state.activeLeaderLocked = true;
    renderActiveLeaderStatus();
  }
  const automaticLeaderTaskType = leaderTaskTypeFromIntentResult(prompt, {});
  if (!requestedLeaderOwner && suggestLeaderChangeIfNeeded(automaticLeaderTaskType, options.originalPrompt || prompt, 'prepare_order', {
    preparedPrompt: prompt,
    skipLeaderChangeProposal: options.skipLeaderChangeProposal === true
  })) {
    return;
  }
  state.pendingLeaderChange = null;
  const lockedOwner = lockedLeaderOwnerForPrompt(prompt, { ...options, leaderChangeRequested });
  const effectiveLeaderOwner = requestedLeaderOwner || lockedOwner || null;
  const lockedStateLeader = state.activeLeaderLocked && state.activeLeader?.taskType
    ? state.activeLeader
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
  const skipOpenAiIntent = options.skipOpenAiIntent === true || options.skip_openai_intent === true;
  let prepared;
  try {
    prepared = await apiWithRetry('/api/work/prepare-order', {
      method: 'POST',
      body: JSON.stringify(chatEngineBuildPrepareOrderPayload(prompt, {
      requestedStrategy: 'auto',
      taskType: effectiveLeaderOwner?.taskType || options.taskType || options.task_type || '',
      selectedAgentId: options.selectedAgentId || options.selected_agent_id || '',
      selectedAgentName: options.selectedAgentName || options.selected_agent_name || '',
      activeLeaderTaskType: effectiveActiveLeaderTaskType,
      activeLeaderName: effectiveActiveLeaderName,
      activeLeaderLocked,
      leaderChangeRequested,
      intakeAnswered: options.intakeAnswered === true,
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
    prepared = clientPrepareOrderIntakeFallback(prompt, {
      ...options,
      taskType: effectiveLeaderOwner?.taskType || options.taskType || options.task_type || effectiveActiveLeaderTaskType,
      activeLeaderTaskType: effectiveActiveLeaderTaskType,
      activeLeaderName: effectiveActiveLeaderName
    });
  }
  const finalPrepared = effectiveLeaderOwner
    ? withLeaderOwner(prepared, effectiveLeaderOwner, {
        leaderChangeRequested,
        leader_change_requested: leaderChangeRequested
      })
    : prepared;
  setConversationOwnerFromPrepared(finalPrepared, {
    ...options,
    activeLeaderTaskType: effectiveActiveLeaderTaskType,
    activeLeaderName: effectiveActiveLeaderName,
    activeLeaderLocked,
    leaderChangeRequested,
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
    leaderChangeRequested
  });
  const appContext = options.appContext || state.pendingAppContext || null;
  if (appContext && typeof appContext === 'object') {
    const broker = state.draft.input?._broker && typeof state.draft.input._broker === 'object' ? state.draft.input._broker : {};
    state.draft.input = {
      ...(state.draft.input || {}),
      _broker: {
        ...broker,
        appContexts: [appContext],
        connectorContexts: [
          {
            source_app: appContext.source_app || '',
            source_app_label: appContext.source_app_label || '',
            title: appContext.title || '',
            summary: appContext.summary || '',
            metrics: Array.isArray(appContext.metrics) ? appContext.metrics.slice(0, 12) : [],
            artifacts: Array.isArray(appContext.artifacts) ? appContext.artifacts.slice(0, 12) : [],
            raw_context: appContext.raw_context && typeof appContext.raw_context === 'object' ? appContext.raw_context : {}
          }
        ]
      }
    };
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
    const lockedOwner = lockedLeaderOwnerForPrompt(state.draft?.originalPrompt || state.draft?.prompt || '');
    const acceptedDraft = lockedOwner ? withLeaderOwner(state.draft, lockedOwner) : state.draft;
    state.draft = acceptedDraft;
    const actorLabel = activeActorLabel('CAIt');
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
        chatSessionId,
        intake: {
          prepared_in_chat: true,
          answered: acceptedDraft.intakeAnswered === true,
          checked_at: acceptedDraft.updatedAt || new Date().toISOString()
        }
      }
    });
    const followupToJobId = String(acceptedDraft.followupToJobId || acceptedDraft.followup_to_job_id || acceptedDraft.input?._broker?.conversation?.followupToJobId || '').trim();
    if (followupToJobId) payload.followup_to_job_id = followupToJobId;
    payload.session_id = chatSessionId;
    payload.input = {
      ...(payload.input || {}),
      session_id: chatSessionId
    };
    rememberPendingRecoveryPayload(payload);
    appendTextMessage('system', 'Sending order. I will keep polling and post progress here.');
    showProgressNarrator(chatText(
      'Sending the order and attaching this chat to the live run.',
      'オーダーを送信し、このチャットを進行中の実行に接続しています。',
      acceptedDraft.originalPrompt || payload.prompt
    ), {
      key: `sending:${chatSessionId}`,
      phase: 'Dispatch',
      status: 'sending',
      steps: ['Create order', 'Build first agent layer', 'Start live progress']
    });
    let created;
    try {
      created = await api('/api/jobs', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    } catch (error) {
      const recovered = await recoverAcceptedOrderAfterCreateError(payload, error);
      if (!recovered) throw error;
      created = recovered;
      appendTextMessage('assistant', 'Recovered the saved order after the create response failed. Switching to progress tracking.', { tone: 'ok', label: actorLabel });
    }
    if (isNeedsInputResponse(created)) {
      startIntake(created, state.draft?.originalPrompt || payload.prompt);
      return;
    }
    state.orderId = extractOrderId(created);
    if (state.orderId) {
      rememberTrackedOrder(state.orderId);
      clearPendingRecoveryPayload(payload);
      const session = currentChatSessionPayload();
      if (session) {
        upsertChatSession({
          ...session,
          linkedOrderId: state.orderId,
          activeJobIds: [...new Set([...(Array.isArray(session.activeJobIds) ? session.activeJobIds : []), state.orderId])],
          activeWork: true,
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
    appendTextMessage('assistant', [
      'Order accepted.',
      '',
      `Order ID: ${state.orderId || '-'}`,
      `Status: ${created.status || created.mode || 'created'}`,
      created.routing_reason ? `Route reason: ${created.routing_reason}` : ''
    ].filter(Boolean).join('\n'), { tone: 'ok', label: actorLabel });
    if (state.orderId) {
      showProgressNarrator(chatText(
        'Order accepted. The leader will review the brief and release later agent layers after each checkpoint.',
        'オーダーを受け付けました。leader が依頼内容を確認し、以降のエージェント層は checkpoint ごとに解放します。',
        acceptedDraft.originalPrompt || payload.prompt
      ), {
        key: state.orderId,
        phase: 'Leader review',
        status: created.status || created.mode || 'created',
        steps: ['Initial layer only', 'Checkpoint-driven handoff', 'Approval before external writes']
      });
    }
    const agentMap = initialAgentMapHtml(created, payload.prompt || '');
    if (agentMap) appendMessage('assistant', agentMap, { tone: 'info', label: 'Agent map' });
    if (state.orderId) startPolling(state.orderId);
    else startDeliveryBackfillLoop({ maxRuns: 60 });
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

function xIdentityFromConnectorStatus(status = {}) {
  const x = status?.x && typeof status.x === 'object' ? status.x : {};
  const username = String(x.username || '').trim().replace(/^@+/, '');
  const userId = String(x.xUserId || x.providerUserId || '').trim();
  const displayName = String(x.displayName || '').trim();
  return {
    configured: x.configured !== false && x.encryptionConfigured !== false,
    connected: Boolean(x.connected && username),
    username,
    handle: username ? `@${username}` : '',
    userId,
    label: username ? `@${username}` : (displayName || userId || 'connected X account')
  };
}

async function postXDraftFromChat(jobId = '', postText = '') {
  const exactText = String(postText || '').trim();
  if (!exactText) {
    appendTextMessage('assistant', 'X post text is empty. Add the exact text first.', { tone: 'error', label: 'X action' });
    return;
  }
  if (exactText.length > 280) {
    appendTextMessage('assistant', `X post is ${exactText.length} characters. Shorten it to 280 or less before posting.`, { tone: 'error', label: 'X action' });
    return;
  }
  setBusy(true);
  try {
    const status = await api('/api/connectors/x/status', { method: 'GET' });
    const identity = xIdentityFromConnectorStatus(status);
    if (!identity.configured) {
      appendTextMessage('assistant', 'X OAuth is not configured for this environment, so CAIt cannot post from this chat yet.', { tone: 'error', label: 'X action' });
      return;
    }
    if (!identity.connected) {
      appendMessage('assistant', [
        'X is not connected yet.',
        '',
        `<a class="primary-btn inline-btn file-action" href="${escapeHtml(xAuthHref())}">Connect X</a>`,
        '<span class="chat-hint">After connecting, return here and press Post to X again. The draft will stay in this chat.</span>'
      ].join('\n'), { tone: 'warn', label: 'X action' });
      return;
    }
    const prompt = deliveryExecutionPromptPresentation('x_post', {
      postText: exactText,
      xAccountLabel: identity.label
    });
    if (!window.confirm(prompt.confirm)) {
      appendTextMessage('system', prompt.stopped || 'X execution stopped for this delivery.', { label: 'X action' });
      return;
    }
    const result = await api('/api/connectors/x/post', {
      method: 'POST',
      body: JSON.stringify({
        text: exactText,
        confirm_post: true,
        approved_x_username: identity.handle || identity.username || '',
        approved_x_user_id: identity.userId || '',
        approved_text: exactText,
        source: 'chatux_x_action_tool',
        job_id: String(jobId || '').trim()
      })
    });
    const postedUrl = String(result?.url || '').trim();
    appendTextMessage('assistant', [
      'Posted to X after explicit confirmation.',
      '',
      postedUrl || `Tweet ID: ${String(result?.tweet_id || '').trim() || '(returned without id)'}`,
      '',
      `Account: ${identity.label}`
    ].filter(Boolean).join('\n'), { tone: 'ok', label: 'X action' });
  } catch (error) {
    if (error?.status === 401) {
      appendTextMessage('assistant', [
        'Sign in is required before posting to X.',
        '',
        `Google: ${loginHref('google')}`,
        `GitHub: ${loginHref('github')}`
      ].join('\n'), { tone: 'error', label: 'X action' });
      return;
    }
    const data = error?.data && typeof error.data === 'object' ? error.data : {};
    const action = data?.action && typeof data.action === 'object' ? data.action : {};
    const next = String(data.required || action.message || action.href || '').trim();
    appendTextMessage('assistant', [
      String(error?.message || 'X post failed.'),
      next ? `Next: ${next}` : '',
      data.needs_connector ? 'Connect X, then press Post to X again from this card.' : ''
    ].filter(Boolean).join('\n\n'), { tone: 'error', label: 'X action' });
  } finally {
    setBusy(false);
  }
}

function startPolling(orderId) {
  if (state.polling) window.clearInterval(state.polling);
  let lastKey = '';
  let lastPhaseKey = '';
  let pollCount = 0;
  let consecutiveProgressErrors = 0;
  const tick = async () => {
    pollCount += 1;
    try {
      const result = await api(`/api/jobs/${encodeURIComponent(orderId)}?visitor_id=${encodeURIComponent(state.visitorId)}`);
      consecutiveProgressErrors = 0;
      const job = result.job && typeof result.job === 'object' ? { ...result.job, id: result.job.id || orderId } : { id: orderId };
      const key = `${job.status}|${job.completedAt || ''}|${job.failedAt || ''}|${job.failureReason || ''}|${JSON.stringify(job.workflow?.agentStatusCounts || job.workflow?.statusCounts || {})}|${workflowCurrentLocationLabel(job)}`;
      const phaseKey = workflowCurrentPhaseKey(job);
      const approvalWaiting = authorityNeedsApproval(authorityRequestFromJob(job));
      showProgressNarrator(progressNarratorTextForJob(job), progressNarratorOptionsForJob(job));
      if (key !== lastKey) {
        lastKey = key;
        appendTextMessage('system', `Order ${orderId.slice(0, 8)}: ${statusLabel(job)}`);
      }
      if (phaseKey && phaseKey !== lastPhaseKey) {
        const shouldRenderPhaseMap = Boolean(lastPhaseKey) || phaseKey !== 'initial';
        lastPhaseKey = phaseKey;
        const phaseMap = shouldRenderPhaseMap ? workflowPhaseProgressMapHtml(job) : '';
        if (phaseMap) appendMessage('assistant', phaseMap, { tone: 'info', label: 'Progress map' });
      }
      maybeRenderAuthorityNotice(job, { label: 'Approval required' });
      if (approvalWaiting && String(job.status || '').trim().toLowerCase() === 'blocked') {
        window.clearInterval(state.polling);
        state.polling = null;
        updateComposerMode();
        startDeliveryBackfillLoop({ maxRuns: 12, renderTerminalDeliveries: false });
        return;
      }
      if (isTerminalStatus(job.status)) {
        window.clearInterval(state.polling);
        state.polling = null;
        showProgressNarrator(progressNarratorTextForJob(job), { ...progressNarratorOptionsForJob(job), done: true });
        updateComposerMode();
        renderDeliveryOnce(job);
      }
      if (pollCount >= CHATUX_PROGRESS_MAX_POLLS) {
        window.clearInterval(state.polling);
        state.polling = null;
        updateComposerMode();
        if (!state.progressPollLimitNotifiedOrderIds.has(orderId)) {
          state.progressPollLimitNotifiedOrderIds.add(orderId);
          appendTextMessage('system', 'Live progress polling reached its limit, so I switched to background order-history checks. No new order was created. Reload or ask for status to check again.');
        }
        startDeliveryBackfillLoop({ maxRuns: 60 });
      }
    } catch (error) {
      consecutiveProgressErrors += 1;
      const status = Number(error?.status || error?.statusCode || error?.data?.status || 0);
      const message = String(error?.message || '').toLowerCase();
      const transient = [408, 429, 500, 502, 503, 504].includes(status)
        || /failed to fetch|network|timeout|temporar|unavailable|gateway|rate limit|service/i.test(message);
      if (transient && consecutiveProgressErrors < 10) {
        showProgressNarrator(chatText(
          'Progress check hit a temporary server error. I am retrying without detaching the order.',
          '進捗確認が一時的なサーバーエラーになりました。オーダーはこのチャットに紐づけたまま再試行します。',
          state.chatMessages[0]?.body || state.conversationLanguage
        ), {
          key: String(orderId || state.orderId || 'progress'),
          phase: 'Progress',
          status: status ? `retrying after ${status}` : 'retrying',
          steps: ['Live poll retry', 'History backfill active']
        });
        const noticeKey = `${orderId}|${status || 'network'}|${consecutiveProgressErrors}`;
        if ([1, 4, 8].includes(consecutiveProgressErrors) && !state.progressErrorNoticeKeys.has(noticeKey)) {
          state.progressErrorNoticeKeys.add(noticeKey);
          appendTextMessage('system', `Progress check temporarily failed${status ? ` (${status})` : ''}. Retrying in this chat; the order remains attached.`);
        }
        if (consecutiveProgressErrors === 1) startDeliveryBackfillLoop({ maxRuns: 8 });
        return;
      }
      window.clearInterval(state.polling);
      state.polling = null;
      updateComposerMode();
      if (transient) {
        appendTextMessage('system', `Live progress checks are still failing${status ? ` (${status})` : ''}, so I switched to background order-history checks. The order remains attached.`);
        showProgressNarrator(chatText(
          'Live polling paused, but background history checks are still watching this order.',
          'ライブ進捗確認は一時停止しましたが、履歴チェックでこのオーダーを追跡し続けます。',
          state.chatMessages[0]?.body || state.conversationLanguage
        ), {
          key: String(orderId || state.orderId || 'progress'),
          phase: 'Progress',
          status: 'background checks',
          steps: ['No new order created', 'Delivery will be posted here']
        });
        startDeliveryBackfillLoop({ maxRuns: 60 });
        return;
      }
      appendTextMessage('assistant', orderErrorMessage(error), { tone: 'error', label: 'Progress stopped' });
      appendTextMessage('system', 'I will keep checking order history and post the delivery here if the work completes.');
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

function xAuthHref() {
  const url = new URL('/auth/x', window.location.origin);
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
        const auth = await api('/auth/status', { method: 'GET', timeoutMs: 15000 });
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

function resetChat() {
  if (state.polling) window.clearInterval(state.polling);
  if (state.deliveryBackfill) window.clearInterval(state.deliveryBackfill);
  if (state.oauthPopupMonitor) window.clearInterval(state.oauthPopupMonitor);
  state.polling = null;
  state.deliveryBackfill = null;
  state.oauthPopupMonitor = null;
  state.progressNarratorArticle = null;
  state.progressNarratorKey = '';
  state.followupTargetOrderId = '';
  state.pendingAppContext = null;
  startNewChatSession();
  setBusy(false);
  startDeliveryBackfillLoop({ maxRuns: 6, renderTerminalDeliveries: false });
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
    const sourceLabel = String(context.source_app_label || context.source_app || 'app').trim();
    state.pendingIntake.appContextAttached = true;
    state.pendingIntake.analyticsContextAttached = /analytics/i.test(sourceLabel) || /analytics/i.test(String(context.source_app || ''));
    state.pendingIntake.appContextPrompt = prompt;
    state.pendingIntake.appContext = context;
    appendIntakeChoiceToComposer(
      chatText('Analytics data', 'アナリティクス', state.pendingIntake.originalPrompt || prompt),
      caitAppContextAnswerLine(context)
    );
    updateComposerMode();
    setBusy(false);
    appendTextMessage('system', chatText(
      'App context returned to the active intake. Continue filling any missing choices or send the current answer when ready; nothing has been dispatched yet.',
      'アプリの情報を進行中のヒアリングに戻しました。未入力の選択肢を続けて入力するか、準備できたらこの回答を送信してください。まだ実行も課金も発生していません。',
      state.pendingIntake.originalPrompt || prompt
    ), { label: options.label || 'App context' });
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

function chatOAuthPopupFeatures() {
  const width = 560;
  const height = 760;
  const left = Math.max(0, Math.round((window.screen?.width || width) / 2 - width / 2));
  const top = Math.max(0, Math.round((window.screen?.height || height) / 2 - height / 2));
  return [
    'popup=yes',
    `width=${width}`,
    `height=${height}`,
    `left=${left}`,
    `top=${top}`,
    'resizable=yes',
    'scrollbars=yes'
  ].join(',');
}

function startOAuthPopupMonitor(popup = null) {
  if (!popup) return;
  if (state.oauthPopupMonitor) window.clearInterval(state.oauthPopupMonitor);
  let checks = 0;
  state.oauthPopupMonitor = window.setInterval(() => {
    checks += 1;
    if (popup.closed || checks > 240) {
      window.clearInterval(state.oauthPopupMonitor);
      state.oauthPopupMonitor = null;
      void refreshAuth();
      if (state.orderId) {
        state.authorityNoticeKeys.clear();
        void fetchVisibleJob(state.orderId)
          .then((job) => {
            maybeRenderAuthorityNotice(job, { label: 'Approval required' });
            if (isTerminalStatus(job.status)) renderDeliveryOnce(job, { force: true });
            else startPolling(job.id || state.orderId);
          })
          .catch(() => startDeliveryBackfillLoop({ maxRuns: 6, renderTerminalDeliveries: false }));
      }
    }
  }, 1500);
}

function openChatOAuthPopup(href = '', label = 'Google connection') {
  const target = String(href || '').trim();
  if (!target) return false;
  saveChatOAuthReturnState('oauth_popup_open');
  const popup = window.open(target, 'cait_oauth_connect', chatOAuthPopupFeatures());
  if (!popup) return false;
  try {
    popup.focus();
  } catch {}
  appendTextMessage('system', chatText(
    `${label} opened in a separate window. Keep this chat open; I will continue from here when the connection finishes.`,
    `${label} を別ウィンドウで開きました。このチャットは開いたままにしてください。接続が終わったらここから続けます。`,
    state.chatMessages[0]?.body || state.conversationLanguage
  ), { label: 'Connector' });
  startOAuthPopupMonitor(popup);
  return true;
}

async function handleOAuthPopupReturnMessage(data = {}) {
  const status = String(data.status || '').trim().toLowerCase();
  if (status === 'error') {
    appendTextMessage('assistant', chatText(
      `Google connection did not complete: ${data.error || 'auth_failed'}`,
      `Google接続が完了しませんでした: ${data.error || 'auth_failed'}`,
      state.chatMessages[0]?.body || state.conversationLanguage
    ), { tone: 'error', label: 'Connector' });
    return;
  }
  appendTextMessage('system', chatText(
    'Google connection finished. Checking this order again from the original chat.',
    'Google接続が完了しました。元のチャットでこのオーダーを再確認します。',
    state.chatMessages[0]?.body || state.conversationLanguage
  ), { label: 'Connector' });
  state.authorityNoticeKeys.clear();
  await refreshAuth();
  if (state.orderId) {
    try {
      const job = await fetchVisibleJob(state.orderId);
      maybeRenderAuthorityNotice(job, { label: 'Approval required' });
      if (isTerminalStatus(job.status)) renderDeliveryOnce(job, { force: true });
      else startPolling(job.id || state.orderId);
    } catch {
      startDeliveryBackfillLoop({ maxRuns: 6, renderTerminalDeliveries: false });
    }
  } else {
    startDeliveryBackfillLoop({ maxRuns: 6, renderTerminalDeliveries: false });
  }
}

function handleChatOAuthPopupReturn() {
  let url = null;
  try {
    url = new URL(window.location.href);
  } catch {
    return false;
  }
  if (url.searchParams.get('cait_oauth_popup') !== '1') return false;
  const error = String(url.searchParams.get('auth_error') || '').trim();
  try {
    window.opener?.postMessage({
      type: 'cait-oauth-return',
      provider: 'google',
      status: error ? 'error' : 'ok',
      error,
      sessionId: String(url.searchParams.get('cait_chat_session_id') || '').trim(),
      orderId: String(url.searchParams.get('cait_order_id') || '').trim()
    }, window.location.origin);
  } catch {}
  document.body.innerHTML = [
    '<main class="chatux-shell" aria-label="Google connection complete">',
    '<section class="chatux-panel">',
    '<div class="chatux-thread">',
    '<article class="message system">',
    '<div class="message-meta">Connector</div>',
    `<div class="message-body">${escapeHtml(error ? `Google connection failed: ${error}` : 'Google connection completed. Return to the original chat window.')}</div>`,
    '</article>',
    '</div>',
    '</section>',
    '</main>'
  ].join('');
  window.setTimeout(() => {
    try {
      window.close();
    } catch {}
  }, error ? 1800 : 600);
  return true;
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
    } else if (handleNonOrderConversation(prompt)) {
      // handled as chat, not a work order
    } else if (activeOrderFollowupAllowedText(prompt) && await prepareFollowupForRunningOrder(prompt)) {
      // prepared as an add-on request attached to the running order
    } else if (state.pendingIntake) {
      await answerPendingIntake(prompt);
    } else if (state.draft) {
      addChatAdjustmentToDraft(prompt);
    } else if (await handleChatIntentWithLlm(prompt)) {
      // OpenAI classified this as chat, clarification, or an order-ready brief.
    } else {
      const fallbackLeaderTaskType = leaderTaskTypeFromIntentResult(prompt, {});
      await prepareOrder(prompt, {
        skipOpenAiIntent: true,
        ...(fallbackLeaderTaskType ? {
          taskType: fallbackLeaderTaskType,
          activeLeaderTaskType: fallbackLeaderTaskType,
          activeLeaderName: taskLabel(fallbackLeaderTaskType),
          activeLeaderLocked: true
        } : {})
      });
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
  const oauthLink = event.target?.closest?.('a[href^="/auth/google"], a[href^="/auth/github"], a[href^="/auth/x"]');
  if (!oauthLink) return;
  saveChatOAuthReturnState('oauth_link_click');
  if (oauthLink.dataset.chatOauthPopup) {
    event.preventDefault();
    const label = String(oauthLink.textContent || 'Google connection').trim() || 'Google connection';
    if (!openChatOAuthPopup(oauthLink.href || oauthLink.getAttribute('href') || '', label)) {
      window.location.href = oauthLink.href || oauthLink.getAttribute('href') || CHATUX_RETURN_PATH;
    }
  }
}, { capture: true });

els.authStatus?.addEventListener('click', (event) => {
  if (event.target.closest('[data-chat-logout]')) void signOut();
});

els.chatThread.addEventListener('click', async (event) => {
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
    const payload = appTransferStore.get(transferId) || null;
    if (!manifest || !payload) {
      appendTextMessage('assistant', 'The app handoff context is no longer available. Reload the delivery or run the order again.', { tone: 'error', label: 'App handoff' });
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
        appendTextMessage('assistant', String(error?.message || error || 'App handoff failed.'), { tone: 'error', label: 'App handoff' });
      }
    } finally {
      setBusy(false);
    }
    return;
  }
  const xClientOpsLink = event.target.closest('[data-x-client-ops-link]');
  if (xClientOpsLink) {
    event.preventDefault();
    const card = xClientOpsLink.closest('.x-post-card');
    const textarea = card?.querySelector('[data-x-post-text]');
    const text = String(textarea?.value || '').trim();
    if (!text) {
      appendTextMessage('assistant', 'X post text is empty. Add the exact text first.', { tone: 'error', label: 'X action' });
      return;
    }
    if (text.length > 280) {
      appendTextMessage('assistant', `X post is ${text.length} characters. Shorten it to 280 or less before opening X Client Ops.`, { tone: 'error', label: 'X action' });
      return;
    }
    const fallbackUrl = new URL(xClientOpsLink.href || X_CLIENT_OPS_URL);
    fallbackUrl.searchParams.set('cait_x_post', text);
    fallbackUrl.searchParams.set('cait_source', textarea?.dataset.xPostSource || 'CAIt chat action');
    const transferId = String(xClientOpsLink.dataset.appTransferId || textarea?.dataset.appTransferId || '').trim();
    const transferPayload = transferId ? appTransferStore.get(transferId) || null : null;
    const payload = {
      ...(transferPayload || {}),
      ...xClientOpsPayloadFromUrl(fallbackUrl.toString()),
      text,
      source: textarea?.dataset.xPostSource || 'CAIt chat action',
      transfer_id: transferPayload?.transfer_id || transferId || '',
      settings: {
        ...((transferPayload?.settings && typeof transferPayload.settings === 'object') ? transferPayload.settings : {}),
        workspaceNotes: compactTransferText([
          transferPayload?.settings?.workspaceNotes || '',
          `Approved/current X draft:\n${text}`
        ].filter(Boolean).join('\n\n'), 2200)
      },
      context: transferPayload?.context || transferPayload?.transfer?.context || transferPayload?.transfer || null
    };
    setBusy(true);
    try {
      const handoffUrl = await createXClientOpsHandoffUrl(payload, fallbackUrl.toString());
      rememberAppAgentUsage('x-client-ops', {
        title: payload.title || 'CAIt final X post draft',
        lastHandoffUrl: handoffUrl,
        lastOrderId: payload.jobId || '',
        source: payload.source || 'CAIt chat action',
        product: payload.product || '',
        audience: payload.audience || '',
        goal: payload.goal || '',
        channel: payload.channel || '',
        lastContext: payload,
        lastTransfer: compactTransferObject(payload, { depth: 4, maxText: 700, maxArray: 8 })
      });
      window.open(handoffUrl, '_blank', 'noopener,noreferrer');
      appendTextMessage('system', 'Called X Client Ops directly and opened the generated handoff URL.', { label: 'X action' });
    } catch (error) {
      rememberAppAgentUsage('x-client-ops', {
        title: payload.title || 'CAIt final X post draft',
        lastHandoffUrl: fallbackUrl.toString(),
        lastOrderId: payload.jobId || '',
        source: payload.source || 'CAIt chat action',
        product: payload.product || '',
        audience: payload.audience || '',
        goal: payload.goal || '',
        channel: payload.channel || '',
        lastContext: payload,
        lastTransfer: compactTransferObject(payload, { depth: 4, maxText: 700, maxArray: 8 })
      });
      window.open(fallbackUrl.toString(), '_blank', 'noopener,noreferrer');
      appendTextMessage('assistant', `X Client Ops API call failed, so I opened the fallback URL handoff instead.\n\n${String(error?.message || error || '')}`, { tone: 'warn', label: 'X action' });
    } finally {
      setBusy(false);
    }
    return;
  }
  const xCopyButton = event.target.closest('[data-x-post-copy]');
  if (xCopyButton) {
    const card = xCopyButton.closest('.x-post-card');
    const textarea = card?.querySelector('[data-x-post-text]');
    const text = String(textarea?.value || '').trim();
    void copyTextToClipboard(text)
      .then(() => appendTextMessage('system', 'Copied X post draft.'))
      .catch(() => appendTextMessage('assistant', 'Could not copy the X post draft.', { tone: 'error', label: 'X action' }));
    return;
  }
  const xSubmitButton = event.target.closest('[data-x-post-submit]');
  if (xSubmitButton) {
    const card = xSubmitButton.closest('.x-post-card');
    const textarea = card?.querySelector('[data-x-post-text]');
    void postXDraftFromChat(xSubmitButton.dataset.xPostSubmit || '', textarea?.value || '');
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
  const orderOpenButton = event.target.closest('[data-chat-order-open]');
  if (orderOpenButton) {
    const orderId = String(orderOpenButton.dataset.chatOrderOpen || '').trim();
    if (!orderId) return;
    setBusy(true);
    try {
      const job = await fetchVisibleJob(orderId);
      if (!job?.id) throw new Error('Order was not found.');
      rememberTrackedOrder(job.id);
      maybeRenderAuthorityNotice(job, { label: 'Approval required' });
      if (isTerminalStatus(job.status)) {
        renderDeliveryOnce(job, { force: true });
      } else {
        appendTextMessage('system', `Order ${job.id.slice(0, 8)}: ${statusLabel(job)}\n\nProgress tracking resumed in this chat.`, { label: 'Progress' });
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
    await prepareRetryFromOrder(orderRetryButton.dataset.chatOrderRetry || '');
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
    appendIntakeChoiceToComposer(group, value);
    setIntakeConfirmedChoice(intakeOtherButton.closest('.intake-choice-group'), group, value);
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
    if (action === 'analytics-use') {
      setBusy(true);
      void openAnalyticsConsoleForIntake(state.pendingIntake, chatText('GA4/Search Console is available.', 'GA4/Search Consoleがあります。', state.pendingIntake.originalPrompt))
        .finally(() => setBusy(false));
      return;
    }
    const group = String(intakeChoiceButton.dataset.choiceGroup || '').trim();
    const label = String(intakeChoiceButton.dataset.choiceLabel || intakeChoiceButton.textContent || '').trim();
    intakeChoiceButton.classList.add('selected');
    intakeChoiceButton.setAttribute('aria-pressed', 'true');
    appendIntakeChoiceToComposer(group, label);
    setIntakeConfirmedChoice(intakeChoiceButton.closest('.intake-choice-group'), group, label);
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
  } else if (action === 'analytics-use') {
    if (!state.pendingIntake) {
      appendTextMessage('assistant', 'There is no active intake to attach analytics to.', { tone: 'error', label: 'Analytics' });
      return;
    }
    setBusy(true);
    void openAnalyticsConsoleForIntake(state.pendingIntake, chatText('GA4/Search Console is available.', 'GA4/Search Consoleがあります。', state.pendingIntake.originalPrompt))
      .finally(() => setBusy(false));
  } else if (action === 'analytics-skip') {
    if (!state.pendingIntake) {
      appendTextMessage('assistant', 'There is no active intake to continue.', { tone: 'error', label: 'Analytics' });
      return;
    }
    appendIntakeChoiceToComposer(
      chatText('Analytics data', 'アナリティクス', state.pendingIntake.originalPrompt),
      chatText('Skip analytics', 'アナリティクスをスキップ', state.pendingIntake.originalPrompt)
    );
    const analyticsGroup = [...els.chatThread.querySelectorAll('.intake-choice-group')]
      .find((groupElement) => String(groupElement.querySelector('[data-intake-confirmed-list]')?.dataset.choiceGroup || '') === chatText('Analytics data', 'アナリティクス', state.pendingIntake.originalPrompt));
    setIntakeConfirmedChoice(
      analyticsGroup,
      chatText('Analytics data', 'アナリティクス', state.pendingIntake.originalPrompt),
      chatText('Skip analytics', 'アナリティクスをスキップ', state.pendingIntake.originalPrompt)
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
      startPolling(jobId);
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
  void showSchedulePanel();
});

els.openScheduleComposerBtn?.addEventListener('click', () => {
  void showSchedulePanel();
});

els.openWorkerListBtn?.addEventListener('click', () => {
  void showWorkerListPanel();
});

els.openAppListBtn?.addEventListener('click', () => { void showAppListPanel(); });
els.openInfoBtn?.addEventListener('click', showInfoPanel);
els.utilityModalCloseBtn?.addEventListener('click', closeUtilityModal);
els.utilityModal?.addEventListener('click', (event) => {
  if (event.target?.closest?.('[data-utility-close]')) closeUtilityModal();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && els.utilityModal && !els.utilityModal.hidden) closeUtilityModal();
});

els.promptInput?.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter' || (!event.ctrlKey && !event.metaKey) || event.isComposing) return;
  event.preventDefault();
  if (!state.busy) els.composer.requestSubmit();
});

els.resetBtn.addEventListener('click', resetChat);

renderActiveLeaderStatus();
updateComposerMode();
renderChatSessionSidebar();
startAppContextBroadcastListener();
if (!handleChatOAuthPopupReturn()) {
  restoreChatOAuthReturnStateFromUrl();
  void hydrateAppContextFromUrl();
  void refreshChatSessionHistory({ force: true }).then(() => {
    restoreRequestedChatSessionFromHistory();
  });
  void refreshAuth();
}
