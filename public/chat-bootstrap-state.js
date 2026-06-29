export const CHATUX_RETURN_PATH = '/chat';
export const CHATUX_BACKFILL_INTERVAL_MS = 10000;
export const CHATUX_CATALOG_PAGE_SIZE = 10;
export const CHATUX_CATALOG_CACHE_TTL_MS = 60000;
export const CHATUX_PROGRESS_MAX_POLLS = 300;
export const CHATUX_OAUTH_RETURN_STATE_KEY = 'cait.chat.oauthReturnState.v1';
export const CHATUX_CONNECT_WAIT_MS = 60 * 60 * 1000;
export const CHATUX_AUTH_STATUS_TIMEOUT_MS = 8000;
export const CHATUX_OPEN_CHAT_INTENT_TIMEOUT_MS = 6500;
export const CHATUX_CONNECT_CHECK_INTERVAL_MS = 1500;
export const CHATUX_OAUTH_RETURN_MAX_AGE_MS = CHATUX_CONNECT_WAIT_MS;
export const CHATUX_RUNTIME_STATE_KEY = 'cait.chat.runtimeState.v1';
export const CHATUX_RUNTIME_STATE_MAX_AGE_MS = 12 * 60 * 60 * 1000;
export const CHATUX_RETRY_MODE_NEW_ORDER = 'same_content_new_order';
export const CAIT_APP_CONTEXT_CHANNEL = 'cait-app-context';
export const CHATUX_UI_LANGUAGE_STORAGE_KEY = 'cait.uiLanguage.v1';
export const CHATUX_WELCOME_TEXT = 'What do you want done?';
export const CHATUX_WELCOME_TEXT_JA = '何をしたいですか？';

export function normalizeUiLanguage(value = '', fallback = 'en') {
  const text = String(value || '').trim().toLowerCase().replace(/_/g, '-');
  if (text.startsWith('ja')) return 'ja';
  if (text.startsWith('en')) return 'en';
  return fallback;
}

export function initialChatUiLanguage(options = {}) {
  const {
    safeLocalStorageGet = () => '',
    documentElementLang = ''
  } = options;
  const stored = normalizeUiLanguage(safeLocalStorageGet(CHATUX_UI_LANGUAGE_STORAGE_KEY), '');
  if (stored) return stored;
  return normalizeUiLanguage(documentElementLang, 'en');
}

export function buildLeaderCatalogChatAnswer(prompt = '', languageResolver = () => 'en') {
  const ja = languageResolver(prompt) === 'ja';
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

export function makeVisitorId(cryptoSource = globalThis.crypto) {
  try {
    const bytes = new Uint8Array(8);
    cryptoSource.getRandomValues(bytes);
    return `chatux-${Array.from(bytes).map((item) => item.toString(16).padStart(2, '0')).join('')}`;
  } catch {
    return `chatux-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
  }
}

export function createInitialChatState(options = {}) {
  const {
    uiLanguage = 'en',
    visitorId = makeVisitorId()
  } = options;
  return {
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
    uiLanguage,
    uiLanguageSettingsFetchedAt: 0,
    uiLanguageSettingsRequest: null,
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
    authRefreshRequest: null,
    authRefreshRetryTimer: null,
    visitorId
  };
}
