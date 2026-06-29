import {
  chatAnswerBody,
  chatAnswerKind
} from './client-answer-utils.js?v=20260522a';

const noopBoolean = () => false;
const noopLabels = () => ({
  sendChat: 'SEND CHAT',
  sendOrder: 'SEND ORDER',
  prepareOrder: 'PREPARE ORDER'
});

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function defaultFormatWorkUiText(value = '') {
  return String(value || '').trim();
}

function defaultSafeCssToken(value = '', fallback = 'info') {
  const token = String(value || '').trim().toLowerCase();
  return /^[a-z0-9_-]+$/.test(token) ? token : fallback;
}

export function createChatRenderUtils(options = {}) {
  const hooks = {
    looksJapanese: options.looksJapanese || noopBoolean,
    workOrderUiLabels: options.workOrderUiLabels || noopLabels,
    formatWorkUiText: options.formatWorkUiText || defaultFormatWorkUiText,
    safeCssToken: options.safeCssToken || defaultSafeCssToken
  };

  function openChatStepItems(prompt = '', answer = null) {
    const kind = chatAnswerKind(answer);
    const body = chatAnswerBody(answer);
    const ja = hooks.looksJapanese(prompt) || hooks.looksJapanese(body);
    const labels = hooks.workOrderUiLabels();
    if (kind === 'command') {
      return ja
        ? ['操作を受信', `${labels.sendChat}で実行`, 'チャットで完了']
        : ['Command received', `${labels.sendChat} runs it`, 'Handled in chat'];
    }
    if (kind === 'assist') {
      return ja
        ? ['依頼を受信', 'オーダー内容を整理', `確認後に ${labels.sendOrder}`]
        : ['Request received', 'Prepared the order summary', `Review then ${labels.sendOrder}`];
    }
    if (kind === 'clarify') {
      return ja
        ? ['意図を確認中', '候補を提示', '番号で選択']
        : ['Intent unclear', 'Options shown', 'Reply with a number'];
    }
    return ja
      ? ['質問を受信', 'チャット内で回答', '必要なら次に発注準備']
      : ['Question received', 'Answered in chat', 'Prepare order only when needed'];
  }

  function openChatPreviewSteps(mode = 'quick', prompt = '') {
    const ja = hooks.looksJapanese(prompt);
    const labels = hooks.workOrderUiLabels();
    const catalog = {
      skill: {
        ja: ['Agent Skillを検出', 'manifest draftへ変換', 'AGENTSで確認して登録'],
        en: ['Agent Skill detected', 'Converted to manifest draft', 'Review and import in AGENTS']
      },
      command: {
        ja: ['操作候補', `${labels.sendChat}で実行`, 'チャットで完了'],
        en: ['Command candidate', `${labels.sendChat} runs it`, 'Handled in chat']
      },
      assist: {
        ja: ['整理候補', `${labels.sendChat}で具体化`, '内容確認後に発注'],
        en: ['Prep candidate', `${labels.sendChat} refines it`, 'Dispatch only after confirmation']
      },
      source: {
        ja: ['長文sourceを検出', `${labels.sendChat}で分離`, '安全ブリーフを確認'],
        en: ['Long source detected', `${labels.sendChat} separates it`, 'Review safe brief']
      },
      quick: {
        ja: ['質問候補', `${labels.sendChat}で回答`, '必要なら次に発注準備'],
        en: ['Question candidate', `${labels.sendChat} answers it`, 'Prepare order only if needed']
      },
      clarify: {
        ja: ['曖昧な依頼', `${labels.sendChat}で候補提示`, '方向確定後に発注準備'],
        en: ['Ambiguous request', `${labels.sendChat} asks one question`, 'Prepare order after direction is fixed']
      },
      intake: {
        ja: ['不足情報あり', '回答を統合', '注文前に確認'],
        en: ['Missing inputs', 'Merge answers', 'Review before ordering']
      },
      prepare: {
        ja: ['作業依頼を検出', `${labels.prepareOrder}で整理`, `次は${labels.sendOrder}`],
        en: ['Work request detected', `${labels.prepareOrder} structures it`, `Next: ${labels.sendOrder}`]
      },
      order: {
        ja: ['発注ブリーフ準備済み', '支払い/ルーティング確認', `${labels.sendOrder}で実行`],
        en: ['Prepared brief ready', 'Payment and routing check', `${labels.sendOrder} dispatches`]
      }
    };
    const item = catalog[mode] || catalog.quick;
    return ja ? item.ja : item.en;
  }

  function renderChatSteps(steps = []) {
    const safeSteps = (Array.isArray(steps) ? steps : [])
      .map((step) => ({
        label: hooks.formatWorkUiText(String(typeof step === 'string' ? step : step?.label || '').trim()),
        tone: hooks.safeCssToken(typeof step === 'string' ? 'info' : step?.tone || 'info', 'info')
      }))
      .filter((step) => step.label)
      .slice(0, 4);
    if (!safeSteps.length) return '';
    return `
      <div class="chat-steps" aria-label="CAIt Chat status">
        ${safeSteps.map((step, index) => `
          <div class="chat-step ${escapeHtml(step.tone)} ${index === safeSteps.length - 1 ? 'active' : ''}">
            <span class="chat-step-dot" aria-hidden="true"></span>
            <span>${escapeHtml(step.label)}</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  function renderChatActions(actions = []) {
    const safeActions = (Array.isArray(actions) ? actions : [])
      .map((action) => ({
        action: String(action?.action || '').trim(),
        label: String(action?.label || '').trim(),
        agentId: String(action?.agentId || '').trim(),
        connector: String(action?.connector || '').trim(),
        orderId: String(action?.orderId || '').trim()
      }))
      .filter((action) => action.action && action.label)
      .slice(0, 4);
    if (!safeActions.length) return '';
    return `
      <div class="chat-actions" aria-label="CAIt actions">
        ${safeActions.map((action) => `
          <button class="mini-btn" type="button"
            data-chat-action="${escapeHtml(action.action)}"
            data-chat-agent-id="${escapeHtml(action.agentId)}"
            data-chat-connector="${escapeHtml(action.connector)}"
            data-chat-order-id="${escapeHtml(action.orderId)}">${escapeHtml(action.label)}</button>
        `).join('')}
      </div>
    `;
  }

  return {
    openChatStepItems,
    openChatPreviewSteps,
    renderChatSteps,
    renderChatActions
  };
}
