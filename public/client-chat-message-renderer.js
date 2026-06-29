import { compactClientText as compactChatText } from './client-text-utils.js?v=20260521a';

const noopString = () => '';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function catAvatarMarkup() {
  return `
    <div class="chat-avatar cat-avatar b2-cat-avatar" aria-hidden="true">
      <svg class="cat-pixel-svg" viewBox="0 0 272 224" focusable="false">
        <rect class="cat-pixel cat-fur" x="24" y="56" width="32" height="32" />
        <rect class="cat-pixel cat-fur" x="56" y="24" width="32" height="32" />
        <rect class="cat-pixel cat-fur" x="88" y="56" width="96" height="32" />
        <rect class="cat-pixel cat-fur" x="184" y="24" width="32" height="32" />
        <rect class="cat-pixel cat-fur" x="216" y="56" width="32" height="32" />
        <rect class="cat-pixel cat-fur" x="48" y="88" width="176" height="88" />
        <rect class="cat-pixel cat-fur" x="64" y="176" width="144" height="16" />
        <rect class="cat-pixel cat-muzzle" x="80" y="116" width="40" height="32" />
        <rect class="cat-pixel cat-muzzle" x="152" y="116" width="40" height="32" />
        <rect class="cat-pixel cat-ink" x="92" y="124" width="16" height="16" />
        <rect class="cat-pixel cat-ink" x="164" y="124" width="16" height="16" />
        <rect class="cat-pixel cat-ink" x="128" y="152" width="16" height="16" />
        <rect class="cat-pixel cat-cheek" x="72" y="152" width="24" height="24" />
        <rect class="cat-pixel cat-cheek" x="176" y="152" width="24" height="24" />
        <rect class="cat-pixel cat-muzzle" x="104" y="176" width="64" height="16" />
        <rect class="cat-pixel cat-ink" x="28" y="132" width="48" height="8" />
        <rect class="cat-pixel cat-ink" x="196" y="132" width="48" height="8" />
        <rect class="cat-pixel cat-ink" x="32" y="156" width="44" height="8" />
        <rect class="cat-pixel cat-ink" x="196" y="156" width="44" height="8" />
      </svg>
    </div>
  `;
}

function acceptanceCatMarkup() {
  return `
    <span class="acceptance-cait-icon b2-cat-avatar" aria-hidden="true">
      <svg class="cat-pixel-svg acceptance-cait-svg" viewBox="0 0 272 224" focusable="false">
        <rect class="cat-pixel cat-fur" x="24" y="56" width="32" height="32" />
        <rect class="cat-pixel cat-fur" x="56" y="24" width="32" height="32" />
        <rect class="cat-pixel cat-fur" x="88" y="56" width="96" height="32" />
        <rect class="cat-pixel cat-fur" x="184" y="24" width="32" height="32" />
        <rect class="cat-pixel cat-fur" x="216" y="56" width="32" height="32" />
        <rect class="cat-pixel cat-fur" x="48" y="88" width="176" height="88" />
        <rect class="cat-pixel cat-fur" x="64" y="176" width="144" height="16" />
        <rect class="cat-pixel cat-muzzle" x="80" y="116" width="40" height="32" />
        <rect class="cat-pixel cat-muzzle" x="152" y="116" width="40" height="32" />
        <rect class="cat-pixel cat-ink" x="92" y="124" width="16" height="16" />
        <rect class="cat-pixel cat-ink" x="164" y="124" width="16" height="16" />
        <rect class="cat-pixel cat-ink" x="128" y="152" width="16" height="16" />
        <rect class="cat-pixel cat-cheek" x="72" y="152" width="24" height="24" />
        <rect class="cat-pixel cat-cheek" x="176" y="152" width="24" height="24" />
        <rect class="cat-pixel cat-muzzle" x="104" y="176" width="64" height="16" />
        <rect class="cat-pixel cat-ink" x="28" y="132" width="48" height="8" />
        <rect class="cat-pixel cat-ink" x="196" y="132" width="48" height="8" />
        <rect class="cat-pixel cat-ink" x="32" y="156" width="44" height="8" />
        <rect class="cat-pixel cat-ink" x="196" y="156" width="44" height="8" />
      </svg>
    </span>
  `;
}

function renderOrderProgressVisual(meta = {}, options = {}) {
  const ja = Boolean(options.ja);
  const states = Array.isArray(meta.states) ? meta.states : [];
  if (!states.length) return '';
  const isAcceptance = String(meta.kind || '').toLowerCase() === 'acceptance';
  const summaryLabel = ja
    ? `${meta.completed || 0}/${meta.total || states.length || 1} ${isAcceptance ? '受付ステップ完了' : '完了'}`
    : `${meta.completed || 0}/${meta.total || states.length || 1} ${isAcceptance ? 'acceptance steps done' : 'completed'}`;
  const sideLabel = meta.sideLabel
    ? String(meta.sideLabel)
    : meta.failed
    ? `${meta.failed} failed`
    : (meta.blocked
      ? `${meta.blocked} waiting`
      : (meta.running
      ? `${meta.running} running`
      : (meta.queued ? `${meta.queued} queued` : (ja ? 'dispatching' : 'dispatching'))));
  if (isAcceptance) {
    return `
    <div class="order-progress-visual acceptance-progress" aria-label="${escapeHtml(ja ? '受付進捗' : 'Order acceptance progress')}">
      <div class="order-progress-head">
        <span class="order-progress-title">ORDER ACCEPTANCE</span>
        <span class="order-progress-route">${escapeHtml(meta.route || (ja ? '受付処理' : 'Order acceptance'))}</span>
      </div>
      <div class="order-acceptance-scene" aria-hidden="true">
        <div class="acceptance-cait">
          ${acceptanceCatMarkup()}
          <span class="acceptance-cait-arm"></span>
        </div>
        <div class="acceptance-envelope">
          <span class="acceptance-envelope-letter"></span>
          <span class="acceptance-envelope-flap"></span>
          <span class="acceptance-envelope-stamp"></span>
        </div>
        <div class="acceptance-bot">
          <span class="acceptance-bot-head"></span>
          <span class="acceptance-bot-eye left"></span>
          <span class="acceptance-bot-eye right"></span>
          <span class="acceptance-bot-body"></span>
          <span class="acceptance-bot-arm"></span>
        </div>
      </div>
      <div class="order-progress-meter" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${escapeHtml(String(meta.percent || 0))}">
        <div class="order-progress-fill" style="width:${escapeHtml(String(meta.percent || 0))}%"></div>
      </div>
      <div class="order-progress-legend">
        <span>${escapeHtml(summaryLabel)}</span>
        <span>${escapeHtml(sideLabel)}</span>
      </div>
      ${meta.note ? `<div class="order-progress-note">${escapeHtml(String(meta.note))}</div>` : ''}
    </div>
  `;
  }
  return `
    <div class="order-progress-visual" aria-label="${escapeHtml(ja ? 'エージェント進捗' : 'Agent progress')}">
      <div class="order-progress-head">
        <span class="order-progress-title">${escapeHtml(ja ? 'AGENT TEAM ACTIVITY' : 'AGENT TEAM ACTIVITY')}</span>
        <span class="order-progress-route">${escapeHtml(meta.route || 'auto-routing')}</span>
      </div>
      <div class="order-progress-robots" data-count="${states.length}">
        ${states.map((state, index) => `
          <div class="order-bot ${escapeHtml(state)}" style="--bot-delay:${index * 140}ms">
            <span class="order-bot-head"></span>
            <span class="order-bot-eye left"></span>
            <span class="order-bot-eye right"></span>
            <span class="order-bot-body"></span>
            <span class="order-bot-arm left"></span>
            <span class="order-bot-arm right"></span>
            <span class="order-bot-shadow"></span>
          </div>
        `).join('')}
        ${meta.overflow ? `<div class="order-bot-more">+${escapeHtml(String(meta.overflow))}</div>` : ''}
      </div>
      <div class="order-progress-meter" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${escapeHtml(String(meta.percent || 0))}">
        <div class="order-progress-fill" style="width:${escapeHtml(String(meta.percent || 0))}%"></div>
      </div>
      <div class="order-progress-legend">
        <span>${escapeHtml(summaryLabel)}</span>
        <span>${escapeHtml(sideLabel)}</span>
      </div>
    </div>
  `;
}

function renderChatDeliveryCard(card = {}, options = {}) {
  const ja = Boolean(options.ja);
  const files = Array.isArray(card.files) ? card.files.filter(Boolean).slice(0, 8) : [];
  if (!card || (!card.summary && !files.length && !card.title)) return '';
  return `
    <div class="chat-delivery-card ${escapeHtml(card.kind || 'delivery')}" aria-label="${escapeHtml(ja ? '納品カード' : 'Delivery card')}">
      <div class="chat-delivery-card-head">
        <span class="chat-delivery-card-title">${escapeHtml(card.title || (ja ? '納品' : 'Delivery'))}</span>
        ${card.responsibility ? `<span class="chat-delivery-card-badge">${escapeHtml(card.responsibility)}</span>` : ''}
      </div>
      ${card.taskType ? `<div class="chat-delivery-card-task">${escapeHtml(card.taskType)}</div>` : ''}
      ${card.summary ? `<div class="chat-delivery-card-summary">${escapeHtml(card.summary)}</div>` : ''}
      ${files.length ? `<div class="chat-delivery-card-files">${files.map((file) => `<span class="chat-delivery-file-chip">${escapeHtml(file)}</span>`).join('')}</div>` : ''}
    </div>
  `;
}

export function createChatMessageRenderer(options = {}) {
  const productShortName = String(options.productShortName || 'CAIt');
  const internalStatusVisible = Boolean(options.internalStatusVisible);
  const renderChatSteps = options.renderChatSteps || noopString;
  const renderOpenChatTrioTurns = options.renderOpenChatTrioTurns || noopString;
  const renderChatActions = options.renderChatActions || noopString;
  const stripStandaloneInternalBriefsFromChatBody = options.stripStandaloneInternalBriefsFromChatBody || ((body) => String(body || ''));
  const formatWorkUiTextSafe = options.formatWorkUiTextSafe || ((body) => String(body || ''));

  function renderChatMessage(role, label, body, tone = '', steps = [], renderOptions = {}) {
    const safeRole = role === 'user' ? 'user' : (role === 'system' ? 'system' : 'agent');
    const typing = Boolean(renderOptions.typing);
    const thinking = Boolean(renderOptions.thinking);
    const avatar = safeRole === 'user'
      ? '<div class="chat-avatar user-avatar" aria-hidden="true">YOU</div>'
      : catAvatarMarkup();
    const stepMarkup = safeRole === 'user' || typing || !internalStatusVisible ? '' : renderChatSteps(steps);
    const trioMarkup = safeRole === 'user' || typing || !internalStatusVisible ? '' : renderOpenChatTrioTurns(renderOptions.discussionTurns || []);
    const actionMarkup = safeRole === 'user' || typing ? '' : renderChatActions(renderOptions.actions || []);
    const progressMarkup = safeRole === 'user' || typing || !renderOptions.progressMeta ? '' : renderOrderProgressVisual(renderOptions.progressMeta, renderOptions);
    const deliveryCardMarkup = safeRole === 'user' || typing || !renderOptions.deliveryCard ? '' : renderChatDeliveryCard(renderOptions.deliveryCard, renderOptions);
    const rawBody = safeRole === 'agent' ? stripStandaloneInternalBriefsFromChatBody(body) : body;
    const normalizedBody = safeRole === 'agent' ? formatWorkUiTextSafe(rawBody) : String(rawBody || '');
    const bodyText = compactChatText(normalizedBody);
    const bubbleMarkup = typing
      ? (thinking
        ? `<span class="thinking-label">${escapeHtml(bodyText || 'CAIt is thinking')}</span><span class="typing-dots" aria-label="CAIt is thinking"><span></span><span></span><span></span></span>`
        : (bodyText
        ? `${escapeHtml(bodyText)}<span class="typing-cursor" aria-hidden="true"></span>`
        : '<span class="typing-dots" aria-label="CAIt is writing"><span></span><span></span><span></span></span>'))
      : `${progressMarkup}${deliveryCardMarkup}<div class="chat-bubble-text">${escapeHtml(bodyText)}</div>`;
    return `
      <div class="chat-message ${safeRole} ${escapeHtml(tone)}${typing ? ' typing' : ''}">
        ${avatar}
        <div class="chat-copy">
          <div class="chat-role">${escapeHtml(label || (safeRole === 'user' ? 'YOU' : productShortName))}</div>
          ${stepMarkup}
          ${trioMarkup}
          <div class="chat-bubble">${bubbleMarkup}</div>
          ${actionMarkup}
        </div>
      </div>
    `;
  }

  return {
    renderChatMessage
  };
}
