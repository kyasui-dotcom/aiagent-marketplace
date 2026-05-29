function defaultCompact(value = '', max = 280) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text.length <= max ? text : `${text.slice(0, max - 1).trim()}...`;
}

function compactChatTitle(value = '', compact = defaultCompact) {
  return compact(value || 'New chat', 72) || 'New chat';
}

function makeChatSessionId() {
  return `chatux_session_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createChatSessionModel(options = {}) {
  const state = options.state && typeof options.state === 'object' ? options.state : {};
  const compact = typeof options.compact === 'function' ? options.compact : defaultCompact;
  const isoNow = typeof options.isoNow === 'function' ? options.isoNow : (() => new Date().toISOString());
  const cloneForSession = typeof options.cloneForSession === 'function' ? options.cloneForSession : ((value) => value);

  function ensureChatSessionId(sessionOptions = {}) {
    if (!state.currentChatSessionId && sessionOptions.force) state.currentChatSessionId = makeChatSessionId();
    return state.currentChatSessionId || '';
  }

  function makeChatTranscriptId(sessionId = '') {
    const safeSessionId = String(sessionId || ensureChatSessionId({ force: true }) || makeChatSessionId())
      .replace(/[^a-zA-Z0-9:_-]+/g, '_')
      .slice(0, 120);
    return `${safeSessionId}_turn_${Date.now().toString(36)}_${Math.max(1, state.chatMessages?.length || 0)}`;
  }

  function chatSessionTitle(messages = []) {
    const list = Array.isArray(messages) ? messages : [];
    const userMessage = list.find((message) => message.role === 'user' && message.body);
    const firstMessage = userMessage || list.find((message) => message.body);
    return compactChatTitle(firstMessage?.body || 'New chat', compact);
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
    const activeLeader = session.activeLeader && typeof session.activeLeader === 'object'
      ? {
          type: 'leader',
          taskType: String(session.activeLeader.taskType || session.activeLeader.task_type || '').trim(),
          label: String(session.activeLeader.label || session.activeLeader.name || '').trim(),
          reason: String(session.activeLeader.reason || '').trim()
        }
      : null;
    const activeOwner = session.activeOwner && typeof session.activeOwner === 'object'
      ? {
          type: String(session.activeOwner.type || '').trim().toLowerCase() || 'agent',
          taskType: String(session.activeOwner.taskType || session.activeOwner.task_type || '').trim(),
          label: String(session.activeOwner.label || session.activeOwner.name || '').trim(),
          reason: String(session.activeOwner.reason || '').trim()
        }
      : (activeLeader ? { ...activeLeader } : null);
    return {
      ...session,
      id,
      sessionId: String(session.sessionId || id).trim(),
      title: compactChatTitle(session.title || chatSessionTitle(messages), compact),
      messages,
      activeLeader,
      activeLeaderLocked: Boolean(session.activeLeaderLocked || session.active_leader_locked),
      activeOwner,
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
    const others = (Array.isArray(state.chatSessions) ? state.chatSessions : [])
      .filter((item) => item.id !== normalized.id && item.sessionId !== normalized.sessionId);
    state.chatSessions = [normalized, ...others]
      .sort((left, right) => String(right.updatedAt || '').localeCompare(String(left.updatedAt || '')))
      .slice(0, 200);
    return normalized;
  }

  function currentChatSessionPayload() {
    const messages = Array.isArray(state.chatMessages) ? state.chatMessages : [];
    const sessionId = ensureChatSessionId({ force: messages.length > 0 });
    if (!sessionId || !messages.length) return null;
    const existing = (Array.isArray(state.chatSessions) ? state.chatSessions : [])
      .find((session) => session.id === sessionId || session.sessionId === sessionId) || {};
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
      title: chatSessionTitle(messages),
      messages: messages.slice(-80),
      activeOwner: state.activeOwner ? cloneForSession(state.activeOwner, { depth: 3, maxText: 600, maxArray: 4 }) : null,
      activeOwnerLocked: Boolean(state.activeOwnerLocked && state.activeOwner?.taskType),
      activeLeader: state.activeLeader ? cloneForSession(state.activeLeader, { depth: 3, maxText: 600, maxArray: 4 }) : null,
      activeLeaderLocked: Boolean(state.activeLeaderLocked && state.activeLeader?.taskType),
      linkedOrderId,
      activeJobIds,
      relatedOrderIds,
      activeWork: false,
      createdAt: existing.createdAt || messages[0]?.ts || now,
      updatedAt: now
    });
  }

  return {
    ensureChatSessionId,
    makeChatSessionId,
    makeChatTranscriptId,
    chatSessionTitle,
    normalizeChatSession,
    upsertChatSession,
    currentChatSessionPayload
  };
}
