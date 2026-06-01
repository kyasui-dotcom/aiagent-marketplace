import {
  connectorGateHandleOAuthPopupReturn,
  connectorGateHandleOAuthPopupReturnMessage,
  connectorGateOpenOAuthPopup,
  connectorGateStartOAuthPopupMonitor
} from './connector-gate.js?v=20260519a';
import {
  caitAppContextChatPrompt,
  caitAppContextThreadHtml,
  consumeCaitAppContextForChat
} from './cait-app-bridge.js?v=20260526i';
import {
  CAIT_APP_CONTEXT_CHANNEL
} from './chat-bootstrap-state.js?v=20260529a';

export function createChatAppContextOAuthController({
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
  connectWaitMs,
  connectCheckIntervalMs
}) {
  const processedAppContextIds = new Set();
  let appContextBroadcastChannel = null;

  function postConnectorThreadMessage(role, en, ja, options = {}) {
    appendTextMessage(role, chatText(
      en,
      ja,
      state.chatMessages[0]?.body || state.conversationLanguage
    ), options);
  }

  async function refreshCurrentOrderAfterConnectorReturn() {
    if (!state.orderId) {
      startDeliveryBackfillLoop({ maxRuns: 6, renderTerminalDeliveries: false });
      return;
    }
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
      waitMs: connectWaitMs,
      intervalMs: connectCheckIntervalMs,
      onClosedOrTimedOut: () => {
        window.clearInterval(state.oauthPopupMonitor);
        state.oauthPopupMonitor = null;
        void refreshAuth();
        state.authorityNoticeKeys.clear();
        void refreshCurrentOrderAfterConnectorReturn();
      }
    });
  }

  function openChatOAuthPopup(href = '', label = 'Google connection') {
    const target = String(href || '').trim();
    if (!target) return false;
    saveChatOAuthReturnState('oauth_popup_open');
    const popup = connectorGateOpenOAuthPopup(target);
    if (!popup) return false;
    postConnectorThreadMessage('system',
      `${label} opened in a separate window. Keep this chat open; I will wait up to 60 minutes and continue from here when the connection finishes.`,
      `${label} を別ウィンドウで開きました。このチャットは開いたままにしてください。最大60分待機し、接続が終わったらここから続けます。`,
      { label: 'Connector' }
    );
    startOAuthPopupMonitor(popup);
    return true;
  }

  async function handleOAuthPopupReturnMessage(data = {}) {
    return connectorGateHandleOAuthPopupReturnMessage(data, {
      onError: ({ connectorLabel, error }) => {
        postConnectorThreadMessage('assistant',
          `${connectorLabel} connection did not complete: ${error}`,
          `${connectorLabel}接続が完了しませんでした: ${error}`,
          { tone: 'error', label: 'Connector' }
        );
      },
      onSuccess: ({ connectorLabel }) => {
        postConnectorThreadMessage('system',
          `${connectorLabel} connection finished. Checking this order again from the original chat.`,
          `${connectorLabel}接続が完了しました。元のチャットでこのオーダーを再確認します。`,
          { label: 'Connector' }
        );
        state.authorityNoticeKeys.clear();
      },
      refreshAuth,
      afterRefresh: refreshCurrentOrderAfterConnectorReturn
    });
  }

  function handleChatOAuthPopupReturn() {
    return connectorGateHandleOAuthPopupReturn();
  }

  return {
    handleCaitAppContextMessage,
    handleChatOAuthPopupReturn,
    handleInboundAppContext,
    handleOAuthPopupReturnMessage,
    hydrateAppContextFromUrl,
    openChatOAuthPopup,
    startAppContextBroadcastListener
  };
}
