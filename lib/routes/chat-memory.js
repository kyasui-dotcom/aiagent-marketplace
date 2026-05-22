export function createChatMemoryRouteHandlers(deps = {}) {
  const {
    accountHash,
    canViewAdminDashboard,
    chatMemoryAuthStatus,
    currentUserContext,
    getSession,
    identityLoginsForCurrent,
    lightweightCurrentFromSession,
    ownChatMemoryForClient
  } = deps;

  async function d1ChatMemoryForCurrent(env, current = null, limit = 20, storage = null) {
    const chatTranscripts = await d1ChatMemoryTranscriptsForCurrent(env, current, 500);
    if (!chatTranscripts) return null;
    const [activeJobs, sessionSnapshots, account] = await Promise.all([
      d1ActiveChatMemoryJobsForCurrent(storage, env, current),
      d1ChatSessionSnapshotsForCurrent(storage, current, 300),
      currentAccountForChatMemory(storage, current)
    ]);
    const hiddenIds = chatMemoryHiddenIdSetFromAccount(account);
    const visibleSessionSnapshots = (Array.isArray(sessionSnapshots) ? sessionSnapshots : [])
      .filter((snapshot) => !chatSessionSnapshotMatchesHiddenIds(snapshot, hiddenIds));
    const derivedMemory = ownChatMemoryForClient({ chatTranscripts, jobs: activeJobs, accounts: account ? [account] : [] }, current.login, limit);
    return mergeChatMemoryWithSessionSnapshots(visibleSessionSnapshots, derivedMemory, limit);
  }

  async function currentAccountForChatMemory(storage = null, current = null) {
    if (!current?.login || typeof storage?.getAccountByLogin !== 'function') return current?.account || null;
    try {
      return await storage.getAccountByLogin(current.login);
    } catch {
      return current?.account || null;
    }
  }

  async function d1ChatSessionSnapshotsForCurrent(storage = null, current = null, limit = 200) {
    if (!current?.login || typeof storage?.listChatSessionSnapshots !== 'function') return [];
    const hash = accountHash(current.login);
    if (!hash) return [];
    try {
      return await storage.listChatSessionSnapshots({ accountHash: hash, limit });
    } catch (error) {
      console.warn('d1 chat session snapshots failed', error);
      return [];
    }
  }

  async function d1ChatMemoryTranscriptsForCurrent(env, current = null, limit = 500) {
    const db = env?.MY_BINDING;
    if (!db?.prepare || !current?.login) return null;
    const hash = accountHash(current.login);
    if (!hash) return [];
    const rows = await db.prepare('SELECT * FROM chat_transcripts WHERE account_hash = ? ORDER BY created_at DESC LIMIT ?')
      .bind(hash, Math.max(1, Math.min(500, Number(limit || 500) || 500)))
      .all();
    return (Array.isArray(rows?.results) ? rows.results : []).map((row) => ({
      id: row.id,
      kind: row.kind || 'work_chat',
      prompt: row.prompt || '',
      answer: row.answer || '',
      promptChars: Number(row.prompt_chars || 0),
      answerChars: Number(row.answer_chars || 0),
      redacted: Boolean(row.redacted),
      answerKind: row.answer_kind || '',
      status: row.status || '',
      taskType: row.task_type || '',
      source: row.source || '',
      pagePath: row.page_path || '',
      tab: row.tab || '',
      sessionId: row.session_id || '',
      visitorId: row.visitor_id || '',
      loggedIn: Boolean(row.logged_in),
      authProvider: row.auth_provider || '',
      accountHash: row.account_hash || '',
      urlCount: Number(row.url_count || 0),
      fileCount: Number(row.file_count || 0),
      fileChars: Number(row.file_chars || 0),
      reviewStatus: row.review_status || 'new',
      expectedHandling: row.expected_handling || '',
      improvementNote: row.improvement_note || '',
      reviewedBy: row.reviewed_by || '',
      reviewedAt: row.reviewed_at || '',
      updatedAt: row.updated_at || row.created_at,
      createdAt: row.created_at
    }));
  }

  async function d1ActiveChatMemoryJobsForCurrent(storage = null, env = {}, current = null) {
    if (!current?.login || typeof storage?.listJobs !== 'function') return [];
    try {
      const identityLogins = identityLoginsForCurrent(current);
      if (!identityLogins.length) return [];
      const jobs = await storage.listJobs({
        admin: canViewAdminDashboard(current, env),
        identityLogins,
        accountIds: identityLogins.map((login) => `acct:${login}`),
        rootOnly: true,
        limit: 300,
        offset: 0
      });
      return (Array.isArray(jobs) ? jobs : [])
        .filter(Boolean);
    } catch (error) {
      console.warn('d1 active chat memory jobs failed', error);
      return [];
    }
  }

  async function chatMemoryPayload(storage, request, env, options = {}) {
    const url = new URL(request.url);
    const session = Object.prototype.hasOwnProperty.call(options, 'session')
      ? options.session
      : await getSession(request, env);
    const current = lightweightCurrentFromSession(session);
    const requestedLimit = Number(url.searchParams.get('limit') || 120);
    const limit = Number.isFinite(requestedLimit) ? Math.max(1, Math.min(200, requestedLimit)) : 120;
    if (!current?.login) {
      return {
        ok: true,
        chatMemory: [],
        auth: await chatMemoryAuthStatus(request, env, current),
        limit
      };
    }
    const d1ChatMemory = await d1ChatMemoryForCurrent(env, current, limit, storage);
    if (d1ChatMemory) {
      return {
        ok: true,
        chatMemory: d1ChatMemory,
        auth: await chatMemoryAuthStatus(request, env, current),
        limit
      };
    }
    const state = await storage.getState();
    const fullCurrent = await currentUserContext(request, env, { session, state });
    const fullMemory = fullCurrent?.login
      ? mergeChatMemoryWithSessionSnapshots(
          (Array.isArray(state?.chatSessions) ? state.chatSessions : []).filter((item) => String(item?.accountHash || '').trim() === accountHash(fullCurrent.login)),
          ownChatMemoryForClient(state, fullCurrent.login, limit),
          limit
        )
      : [];
    return {
      ok: true,
      chatMemory: fullMemory,
      auth: await chatMemoryAuthStatus(request, env, fullCurrent),
      limit
    };
  }

  return {
    chatMemoryPayload,
    chatSessionSnapshotHideIds,
    d1ChatMemoryForCurrent,
    d1ChatMemoryTranscriptsForCurrent,
    normalizeChatMemoryHiddenIdForWorker,
    relatedChatMemoryHideIds
  };
}

function normalizeChatMemoryHiddenIdForWorker(value = '') {
  return String(value || '').trim().replace(/^server_/, '').slice(0, 140);
}

function chatMemoryHiddenIdSetFromAccount(account = null) {
  const chatMemory = account?.chatMemory && typeof account.chatMemory === 'object' ? account.chatMemory : {};
  const ids = [
    ...(Array.isArray(chatMemory.hiddenTranscriptIds) ? chatMemory.hiddenTranscriptIds : []),
    ...(Array.isArray(chatMemory.hiddenIds) ? chatMemory.hiddenIds : []),
    ...(Array.isArray(chatMemory.hidden_chat_memory_ids) ? chatMemory.hidden_chat_memory_ids : []),
    ...(Array.isArray(chatMemory.hiddenChatMemoryIds) ? chatMemory.hiddenChatMemoryIds : [])
  ].map(normalizeChatMemoryHiddenIdForWorker).filter(Boolean);
  return new Set(ids);
}

function chatMemoryHiddenIdsHasForWorker(hiddenIds = new Set(), value = '') {
  const safeId = normalizeChatMemoryHiddenIdForWorker(value);
  return Boolean(safeId && hiddenIds.has(safeId));
}

function relatedChatMemoryHideIds(ids = []) {
  const result = [];
  for (const raw of Array.isArray(ids) ? ids : []) {
    const safeId = normalizeChatMemoryHiddenIdForWorker(raw);
    if (!safeId) continue;
    result.push(safeId);
    if (safeId.startsWith('job_')) result.push(safeId.slice(4));
    else result.push(`job_${safeId}`);
  }
  return [...new Set(result.map(normalizeChatMemoryHiddenIdForWorker).filter(Boolean))];
}

function chatSessionSnapshotHideIds(snapshot = {}) {
  const session = snapshot?.session && typeof snapshot.session === 'object' ? snapshot.session : {};
  return relatedChatMemoryHideIds([
    snapshot.id,
    snapshot.sessionId,
    session.id,
    session.sessionId,
    snapshot.linkedOrderId,
    session.linkedOrderId,
    ...(Array.isArray(snapshot.activeJobIds) ? snapshot.activeJobIds : []),
    ...(Array.isArray(session.activeJobIds) ? session.activeJobIds : []),
    ...(Array.isArray(snapshot.relatedOrderIds) ? snapshot.relatedOrderIds : []),
    ...(Array.isArray(session.relatedOrderIds) ? session.relatedOrderIds : [])
  ]);
}

function chatSessionSnapshotMatchesHiddenIds(snapshot = {}, hiddenIds = new Set()) {
  if (!hiddenIds?.size) return false;
  return chatSessionSnapshotHideIds(snapshot).some((id) => chatMemoryHiddenIdsHasForWorker(hiddenIds, id));
}

function chatSessionSnapshotMemory(snapshot = {}) {
  const session = snapshot?.session && typeof snapshot.session === 'object' ? snapshot.session : {};
  const id = String(session.id || session.sessionId || snapshot.id || '').trim();
  if (!id) return null;
  const messages = Array.isArray(session.messages) ? session.messages : [];
  const firstUser = messages.find((message) => String(message?.role || '') === 'user' && message?.body);
  const lastAssistant = [...messages].reverse().find((message) => ['assistant', 'system'].includes(String(message?.role || '')) && message?.body);
  const linkedOrderId = String(session.linkedOrderId || snapshot.linkedOrderId || '').trim();
  const activeJobIds = [];
  const relatedOrderIds = Array.isArray(session.relatedOrderIds) ? session.relatedOrderIds : (Array.isArray(snapshot.relatedOrderIds) ? snapshot.relatedOrderIds : []);
  return {
    id,
    sessionId: String(session.sessionId || id).trim(),
    title: String(session.title || snapshot.title || firstUser?.body || 'Chat').trim(),
    prompt: String(firstUser?.body || session.title || snapshot.title || 'Chat').trim(),
    answer: String(lastAssistant?.body || '').trim(),
    answerKind: 'chat_session',
    status: '',
    createdAt: String(session.createdAt || snapshot.createdAt || '').trim(),
    updatedAt: String(session.updatedAt || snapshot.updatedAt || session.createdAt || snapshot.createdAt || '').trim(),
    messages,
    activeWork: false,
    linkedOrderId,
    activeJobIds,
    relatedOrderIds
  };
}

function mergeChatMemoryWithSessionSnapshots(snapshots = [], memory = [], limit = 20) {
  const safeLimit = Math.max(1, Math.min(200, Number(limit || 20) || 20));
  const byId = new Map();
  const put = (item = {}) => {
    const id = String(item.id || item.sessionId || '').trim();
    if (!id) return;
    const existing = byId.get(id) || {};
    byId.set(id, {
      ...item,
      ...existing,
      title: existing.title || item.title,
      prompt: existing.prompt || item.prompt,
      answer: existing.answer || item.answer,
      messages: Array.isArray(existing.messages) && existing.messages.length ? existing.messages : (Array.isArray(item.messages) ? item.messages : []),
      linkedOrderId: existing.linkedOrderId || item.linkedOrderId || '',
      activeWork: Boolean(existing.activeWork || item.activeWork),
      activeJobIds: [...new Set([
        ...(Array.isArray(item.activeJobIds) ? item.activeJobIds : []),
        ...(Array.isArray(existing.activeJobIds) ? existing.activeJobIds : [])
      ].map((value) => String(value || '').trim()).filter(Boolean))],
      relatedOrderIds: [...new Set([
        ...(Array.isArray(item.relatedOrderIds) ? item.relatedOrderIds : []),
        ...(Array.isArray(existing.relatedOrderIds) ? existing.relatedOrderIds : [])
      ].map((value) => String(value || '').trim()).filter(Boolean))]
    });
  };
  for (const snapshot of Array.isArray(snapshots) ? snapshots : []) {
    const item = chatSessionSnapshotMemory(snapshot);
    if (item) put(item);
  }
  for (const item of Array.isArray(memory) ? memory : []) put(item);
  return [...byId.values()]
    .sort((left, right) => String(right.updatedAt || '').localeCompare(String(left.updatedAt || '')))
    .slice(0, safeLimit);
}
