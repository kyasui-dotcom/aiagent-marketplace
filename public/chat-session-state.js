export function safeSessionStorageSet(key = '', value = '') {
  try {
    window.sessionStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function safeSessionStorageGet(key = '') {
  try {
    return window.sessionStorage.getItem(key) || '';
  } catch {
    return '';
  }
}

export function safeSessionStorageRemove(key = '') {
  try {
    window.sessionStorage.removeItem(key);
  } catch {}
}

export function safeLocalStorageSet(key = '', value = '') {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function safeLocalStorageGet(key = '') {
  try {
    return window.localStorage.getItem(key) || '';
  } catch {
    return '';
  }
}

export function safeLocalStorageRemove(key = '') {
  try {
    window.localStorage.removeItem(key);
  } catch {}
}

export function normalizeChatAccountKey(value = '') {
  return String(value || '').trim().toLowerCase();
}

export function authAccountKey(auth = {}) {
  const user = auth?.user && typeof auth.user === 'object' ? auth.user : {};
  return normalizeChatAccountKey(
    auth?.login
      || auth?.accountLogin
      || auth?.account_login
      || user.login
      || user.email
      || auth?.email
      || ''
  );
}

export function chatSnapshotAccountKey(snapshot = {}) {
  const session = snapshot?.session && typeof snapshot.session === 'object' ? snapshot.session : {};
  return normalizeChatAccountKey(
    snapshot?.accountKey
      || snapshot?.account_key
      || session.accountKey
      || session.account_key
      || ''
  );
}

export function chatSessionSnapshotExpired(snapshot = {}, maxAgeMs = 0) {
  const savedMs = Date.parse(snapshot?.savedAt || '');
  return !Number.isFinite(savedMs) || Date.now() - savedMs > Number(maxAgeMs || 0);
}

export function compactChatRuntimeSnapshot(snapshot = {}, options = {}) {
  const normalizeChatSession = options.normalizeChatSession || ((session) => session || null);
  const session = normalizeChatSession(snapshot.session || {});
  return {
    version: 1,
    accountKey: normalizeChatAccountKey(snapshot.accountKey || session?.accountKey || options.currentAccountKey || ''),
    savedAt: snapshot.savedAt || options.nowIso?.() || new Date().toISOString(),
    reason: String(snapshot.reason || 'runtime_compact').slice(0, 80),
    returnPath: snapshot.returnPath || options.returnPath || '/chat',
    currentChatSessionId: String(snapshot.currentChatSessionId || session?.id || '').trim(),
    session: session ? normalizeChatSession({
      id: session.id,
      sessionId: session.sessionId,
      title: session.title,
      messages: (Array.isArray(session.messages) ? session.messages : []).slice(-50),
      linkedOrderId: session.linkedOrderId || snapshot.orderId || '',
      activeJobIds: [],
      relatedOrderIds: Array.isArray(session.relatedOrderIds) ? session.relatedOrderIds : [],
      activeWork: false,
      activeOwner: session.activeOwner || session.activeLeader || null,
      activeOwnerLocked: session.activeOwnerLocked || session.activeLeaderLocked,
      activeLeader: session.activeLeader || null,
      activeLeaderLocked: session.activeLeaderLocked,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt || options.nowIso?.() || new Date().toISOString()
    }) : null,
    orderId: String(snapshot.orderId || session?.linkedOrderId || '').trim(),
    trackedOrderIds: Array.isArray(snapshot.trackedOrderIds) ? snapshot.trackedOrderIds.slice(-20) : [],
    activeOwner: snapshot.activeOwner || session?.activeOwner || session?.activeLeader || null,
    activeOwnerLocked: Boolean(snapshot.activeOwnerLocked || session?.activeOwnerLocked || snapshot.activeLeaderLocked || session?.activeLeaderLocked),
    activeLeader: snapshot.activeLeader || session?.activeLeader || null,
    activeLeaderLocked: Boolean(snapshot.activeLeaderLocked || session?.activeLeaderLocked),
    conversationLanguage: String(snapshot.conversationLanguage || '').trim(),
    promptValue: String(snapshot.promptValue || '').slice(0, 4000)
  };
}
