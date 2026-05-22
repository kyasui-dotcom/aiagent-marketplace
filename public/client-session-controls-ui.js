function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const noopBoolean = () => false;
const noopString = () => '';

export function renderOpenChatSessionControlsElement(elements = {}, options = {}) {
  const sessions = Array.isArray(options.sessions) ? options.sessions : [];
  const currentSessionId = String(options.currentSessionId || '').trim();
  const loggedIn = Boolean(options.loggedIn);
  const historyOpen = Boolean(options.historyOpen);
  const isStructuredOrderBrief = options.isStructuredOrderBrief || noopBoolean;
  const openChatSessionTimeLabel = options.openChatSessionTimeLabel || noopString;
  const openChatSessionsShareIdentity = options.openChatSessionsShareIdentity || noopBoolean;
  const onLoadSession = options.onLoadSession;
  const onDeleteSession = options.onDeleteSession;
  const currentSession = currentSessionId
    ? (sessions.find((session) => session.id === currentSessionId) || null)
    : null;
  const savedSessions = currentSession
    ? sessions.filter((session) => session.id !== currentSession.id && !openChatSessionsShareIdentity(session, currentSession))
    : sessions;

  if (elements.openChatSessionStatus) {
    if (currentSession && savedSessions.length) {
      elements.openChatSessionStatus.textContent = `${savedSessions.length} project${savedSessions.length === 1 ? '' : 's'} · current chat active`;
    } else if (currentSession) {
      elements.openChatSessionStatus.textContent = loggedIn
        ? 'Current chat active. No other saved projects yet.'
        : 'Current chat only. Sign in to save it to your account.';
    } else if (savedSessions.length) {
      elements.openChatSessionStatus.textContent = `${savedSessions.length} project${savedSessions.length === 1 ? '' : 's'} · account history`;
    } else {
      elements.openChatSessionStatus.textContent = loggedIn
        ? 'No saved projects yet. Send a message to create one.'
        : 'Sign in to save chat history. Until then, this chat stays only in the current page.';
    }
  }

  if (elements.clearOpenChatHistoryBtn) elements.clearOpenChatHistoryBtn.disabled = !sessions.length;
  if (elements.openChatSessionSidebar) {
    elements.openChatSessionSidebar.classList.toggle('mobile-open', historyOpen);
  }
  if (elements.toggleOpenChatHistoryBtn) {
    elements.toggleOpenChatHistoryBtn.textContent = historyOpen ? 'HIDE HISTORY' : 'CHAT HISTORY';
    elements.toggleOpenChatHistoryBtn.setAttribute('aria-expanded', historyOpen ? 'true' : 'false');
  }
  if (!elements.openChatSessionList) return;
  if (!sessions.length) {
    elements.openChatSessionList.innerHTML = loggedIn
      ? '<div class="empty-session-list">No saved projects yet. Send a message and it will appear here.</div>'
      : '<div class="empty-session-list">Sign in to save chat history to your account.</div>';
    return;
  }

  const renderSessionRow = (session, rowOptions = {}) => {
    const active = session.id === currentSessionId;
    const messageCount = Array.isArray(session.messages) ? session.messages.length : 0;
    const hasBrief = isStructuredOrderBrief(session.openChatPreparedBrief || session.jobPrompt || '');
    const workFlag = session.activeWork ? ' · active work' : '';
    const currentFlag = rowOptions.current ? ' · current' : '';
    return `
      <div class="chat-session-row ${active ? 'active' : ''}">
        <button type="button" class="chat-session-item" data-open-chat-session-id="${escapeHtml(session.id)}">
          <span class="chat-session-title">${escapeHtml(session.title || 'New chat')}</span>
          <span class="chat-session-meta">${escapeHtml(openChatSessionTimeLabel(session.updatedAt))} · ${messageCount} msg${hasBrief ? ' · draft' : ''}${workFlag}${currentFlag}</span>
        </button>
        <button type="button" class="mini-btn chat-session-delete" aria-label="Delete chat" data-delete-chat-session-id="${escapeHtml(session.id)}">x</button>
      </div>
    `;
  };

  const sections = [];
  if (currentSession) {
    sections.push('<div class="chat-session-group-label">CURRENT SESSION</div>');
    sections.push(renderSessionRow(currentSession, { current: true }));
  }
  if (savedSessions.length) {
    sections.push(`<div class="chat-session-group-label">${currentSession ? 'PROJECTS' : 'PROJECT HISTORY'}</div>`);
    sections.push(savedSessions.map((session) => renderSessionRow(session)).join(''));
  }
  elements.openChatSessionList.innerHTML = sections.join('');
  elements.openChatSessionList.querySelectorAll('[data-open-chat-session-id]').forEach((button) => {
    button.onclick = () => {
      if (typeof onLoadSession === 'function') onLoadSession(button.dataset.openChatSessionId || '');
    };
  });
  elements.openChatSessionList.querySelectorAll('[data-delete-chat-session-id]').forEach((button) => {
    button.onclick = (event) => {
      event.stopPropagation();
      if (typeof onDeleteSession === 'function') onDeleteSession(button, button.dataset.deleteChatSessionId || '', event);
    };
  });
}
