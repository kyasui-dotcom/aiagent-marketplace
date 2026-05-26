import { compactClientText as compactChatText } from './client-text-utils.js?v=20260521a';

export function createClientOpenChatHistoryUtils(options = {}) {
  const config = options;
  const getState = typeof options.getState === 'function' ? options.getState : () => ({});
  const getEls = typeof options.getEls === 'function' ? options.getEls : () => ({});
  const makeOpenChatSessionId = typeof options.makeOpenChatSessionId === 'function'
    ? options.makeOpenChatSessionId
    : () => `chat_${Date.now().toString(36)}`;
  const currentOpenChatHasMeaningfulContent = typeof options.currentOpenChatHasMeaningfulContent === 'function'
    ? options.currentOpenChatHasMeaningfulContent
    : () => false;
  const openChatMode = typeof options.openChatMode === 'function'
    ? options.openChatMode
    : () => 'clarify';
  const normalizeOpenChatMode = typeof options.normalizeOpenChatMode === 'function'
    ? options.normalizeOpenChatMode
    : (value) => value;
  const serializeOpenChatMessageForSession = typeof options.serializeOpenChatMessageForSession === 'function'
    ? options.serializeOpenChatMessageForSession
    : (message) => message;
  const openChatSessionHasLinkedWork = typeof options.openChatSessionHasLinkedWork === 'function'
    ? options.openChatSessionHasLinkedWork
    : () => false;
  const normalizeOpenChatSession = typeof options.normalizeOpenChatSession === 'function'
    ? options.normalizeOpenChatSession
    : (session) => session;
  const hasOpenChatSessionPayloadContent = typeof options.hasOpenChatSessionPayloadContent === 'function'
    ? options.hasOpenChatSessionPayloadContent
    : () => false;
  const upsertOpenChatSessionCollection = typeof options.upsertOpenChatSessionCollection === 'function'
    ? options.upsertOpenChatSessionCollection
    : (sessions) => sessions;
  const clearOpenChatDispatchDraftState = typeof options.clearOpenChatDispatchDraftState === 'function'
    ? options.clearOpenChatDispatchDraftState
    : () => {};
  const finishOpenChatTyping = typeof options.finishOpenChatTyping === 'function'
    ? options.finishOpenChatTyping
    : () => {};
  const clearOpenChatOrderProgressTimer = typeof options.clearOpenChatOrderProgressTimer === 'function'
    ? options.clearOpenChatOrderProgressTimer
    : () => {};
  const clearOpenChatAcceptanceProgressTimer = typeof options.clearOpenChatAcceptanceProgressTimer === 'function'
    ? options.clearOpenChatAcceptanceProgressTimer
    : () => {};
  const clearLiveSnapshotRefreshTimer = typeof options.clearLiveSnapshotRefreshTimer === 'function'
    ? options.clearLiveSnapshotRefreshTimer
    : () => {};
  const renderOrderComposer = typeof options.renderOrderComposer === 'function'
    ? options.renderOrderComposer
    : () => {};
  const renderOpenChatSessionControls = typeof options.renderOpenChatSessionControls === 'function'
    ? options.renderOpenChatSessionControls
    : () => {};
  const renderOpenChatChoiceBar = typeof options.renderOpenChatChoiceBar === 'function'
    ? options.renderOpenChatChoiceBar
    : () => {};
  const syncCreateJobButtonForCurrentPrompt = typeof options.syncCreateJobButtonForCurrentPrompt === 'function'
    ? options.syncCreateJobButtonForCurrentPrompt
    : () => {};
  const updateWorkChatStatusCard = typeof options.updateWorkChatStatusCard === 'function'
    ? options.updateWorkChatStatusCard
    : () => {};
  const backfillTrackedJobsIntoSnapshot = typeof options.backfillTrackedJobsIntoSnapshot === 'function'
    ? options.backfillTrackedJobsIntoSnapshot
    : () => {};
  const scheduleLiveSnapshotRefresh = typeof options.scheduleLiveSnapshotRefresh === 'function'
    ? options.scheduleLiveSnapshotRefresh
    : () => {};
  const isTerminalOrderStatus = typeof options.isTerminalOrderStatus === 'function'
    ? options.isTerminalOrderStatus
    : () => false;
  const api = typeof options.api === 'function' ? options.api : async () => ({});
  const flash = typeof options.flash === 'function' ? options.flash : () => {};

  function ensureCurrentOpenChatSessionId(options = {}) {
    const state = getState();
    const els = getEls();
    if (state.currentOpenChatSessionId) return state.currentOpenChatSessionId;
    const force = options.force === true;
    const hasContent = force
      || currentOpenChatHasMeaningfulContent()
      || Boolean(String(state.openChatPreparedBrief || '').trim())
      || Boolean(String(els.jobPrompt?.value || '').trim());
    if (!hasContent) return '';
    state.currentOpenChatSessionId = makeOpenChatSessionId();
    return state.currentOpenChatSessionId;
  }

  function writeOpenChatSessions(sessions = []) {
    const state = getState();
    let merged = [];
    for (const session of Array.isArray(sessions) ? sessions : []) {
      merged = upsertOpenChatSessionCollection(merged, session);
    }
    state.openChatRuntimeSessions = merged;
    return true;
  }

  function openChatServerSessionIdFromTranscriptId(id = '') {
    const safeId = compactChatText(String(id || '').trim().replace(/^server_/, ''), 140);
    return safeId ? `server_${safeId}` : '';
  }

  function openChatTranscriptIdFromServerSessionId(sessionId = '') {
    const id = compactChatText(String(sessionId || '').trim(), 160);
    if (!id) return '';
    return id.startsWith('server_') ? id.slice('server_'.length) : id;
  }

  function normalizeOpenChatMemoryDeleteId(id = '') {
    return compactChatText(String(id || '').trim().replace(/^server_/, ''), 160);
  }

  function collectOpenChatMemoryDeleteIds(source = {}) {
    const ids = new Set();
    const remember = (value = '') => {
      const normalized = normalizeOpenChatMemoryDeleteId(value);
      if (normalized) ids.add(normalized);
    };
    const rememberJob = (value = '') => {
      const normalized = normalizeOpenChatMemoryDeleteId(value);
      if (!normalized) return;
      ids.add(normalized);
      ids.add(normalized.startsWith('job_') ? normalized : `job_${normalized}`);
    };
    remember(source?.id);
    remember(source?.sessionId || source?.session_id);
    remember(openChatTranscriptIdFromServerSessionId(source?.id || ''));
    remember(source?.linkedOrderId || source?.linked_order_id || source?.orderId || source?.order_id);
    const activeJobIds = Array.isArray(source?.activeJobIds || source?.active_job_ids)
      ? (source.activeJobIds || source.active_job_ids)
      : [];
    activeJobIds.forEach((jobId) => rememberJob(jobId));
    return [...ids];
  }

  function removeSnapshotChatMemoryItems(transcriptIds = []) {
    const state = getState();
    const hidden = new Set((Array.isArray(transcriptIds) ? transcriptIds : [transcriptIds])
      .map((id) => normalizeOpenChatMemoryDeleteId(id))
      .filter(Boolean));
    if (!hidden.size || !Array.isArray(state.snapshot?.chatMemory)) return;
    state.snapshot.chatMemory = state.snapshot.chatMemory.filter((item) => {
      const itemIds = collectOpenChatMemoryDeleteIds(item);
      return !itemIds.some((id) => hidden.has(id));
    });
  }

  function clearOrderComposerPromptState() {
    const state = getState();
    const els = getEls();
    if (els.jobPrompt) els.jobPrompt.value = '';
    if (els.jobUrls) els.jobUrls.value = '';
    if (els.jobFiles) els.jobFiles.value = '';
    state.orderInputFiles = [];
    state.orderInputFileWarnings = [];
    state.followupToJobId = '';
    state.followupSourceTaskType = '';
    state.followupSourceAgentId = '';
    state.pendingIntake = null;
    state.intakeConfirmed = false;
    state.intakeAnswer = '';
    state.pendingOrderConfirmation = null;
    state.openChatPreparedBrief = '';
    state.openChatParallelPlan = [];
    state.openChatClarifyOptions = [];
    state.openChatVagueChoicePrompt = '';
    state.openChatNaturalChoiceIntent = '';
    state.openChatIntentShiftPrompt = '';
    state.openChatIdeaBacklogPrompt = '';
    state.openChatLeaderIntakePrompt = '';
    state.openChatLeaderIntakeTask = '';
    state.openChatPendingQuestionPrompt = '';
    state.openChatPendingQuestionTask = '';
    state.openChatPendingQuestionPattern = '';
    state.serverResolvedIntent = null;
    state.serverPreparedOrder = null;
    if (els.intakeAnswer) els.intakeAnswer.value = '';
    if (els.jobType) els.jobType.value = '';
  }

  function sessionFromServerChatMemory(item = {}) {
    const transcriptId = compactChatText(item.id || '', 120);
    const sessionId = compactChatText(item.sessionId || item.session_id || '', 120);
    const id = sessionId || (transcriptId ? `server_${transcriptId}` : '');
    const prompt = compactChatText(item.prompt || '', 9000);
    const answer = compactChatText(item.answer || '', 9000);
    if (!id || !prompt) return null;
    const createdAt = Number.isFinite(Date.parse(item.createdAt || '')) ? new Date(item.createdAt).toISOString() : new Date().toISOString();
    const updatedAt = Number.isFinite(Date.parse(item.updatedAt || '')) ? new Date(item.updatedAt).toISOString() : createdAt;
    return normalizeOpenChatSession({
      id,
      sessionId,
      serverManaged: true,
      activeWork: Boolean(item.activeWork),
      activeJobIds: Array.isArray(item.activeJobIds) ? item.activeJobIds.slice(0, 24) : [],
      linkedOrderId: compactChatText(item.linkedOrderId || '', 120),
      title: prompt,
      createdAt,
      updatedAt,
      openChatMode: 'order',
      openChatLastStatus: 'Loaded from account chat memory.',
      openChatLastStatusTone: 'info',
      messages: [
        { role: 'user', body: prompt, ts: createdAt },
        ...(answer ? [{ role: 'assistant', body: answer, tone: item.status === 'blocked' ? 'warn' : 'info', ts: createdAt }] : [])
      ]
    });
  }

  function openChatSessionsFromSnapshot(snapshot = getState().snapshot) {
    const memory = Array.isArray(snapshot?.chatMemory) ? snapshot.chatMemory : [];
    const limit = Math.max(1, Number(config.openChatSessionMaxSessions || 30) || 30);
    return memory
      .map(sessionFromServerChatMemory)
      .filter(Boolean)
      .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))
      .slice(0, limit);
  }

  function currentOpenChatSessionPayload(existingSessions = null, payloadOptions = {}) {
    const state = getState();
    const els = getEls();
    const messageLimit = Math.max(1, Number(config.openChatSessionMaxMessages || 16) || 16);
    const messages = (Array.isArray(state.orderChatMessages) ? state.orderChatMessages : [])
      .slice(-messageLimit)
      .map(serializeOpenChatMessageForSession)
      .filter((message) => String(message.body || '').trim());
    const createId = payloadOptions.createId !== false;
    const currentId = state.currentOpenChatSessionId
      || (createId ? ensureCurrentOpenChatSessionId({ force: messages.length > 0 }) : '');
    if (!currentId) return null;
    const pool = Array.isArray(existingSessions) ? existingSessions : [];
    const existing = pool.find((session) => session.id === currentId) || {};
    const now = new Date().toISOString();
    return normalizeOpenChatSession({
      ...existing,
      id: currentId,
      createdAt: existing.createdAt || now,
      updatedAt: now,
      openChatMode: openChatMode(),
      openChatPreparedBrief: compactChatText(state.openChatPreparedBrief || '', 9000),
      openChatParallelPlan: Array.isArray(state.openChatParallelPlan) ? state.openChatParallelPlan.slice(0, 8) : [],
      openChatClarifyOptions: Array.isArray(state.openChatClarifyOptions) ? state.openChatClarifyOptions.slice(0, 8) : [],
      openChatVagueChoicePrompt: compactChatText(state.openChatVagueChoicePrompt || '', 2000),
      openChatNaturalChoiceIntent: compactChatText(state.openChatNaturalChoiceIntent || '', 160),
      openChatIntentShiftPrompt: compactChatText(state.openChatIntentShiftPrompt || '', 2000),
      openChatIdeaBacklogPrompt: compactChatText(state.openChatIdeaBacklogPrompt || '', 2000),
      openChatLeaderIntakePrompt: compactChatText(state.openChatLeaderIntakePrompt || '', 2000),
      openChatLeaderIntakeTask: compactChatText(state.openChatLeaderIntakeTask || '', 120),
      openChatPendingQuestionPrompt: compactChatText(state.openChatPendingQuestionPrompt || '', 4000),
      openChatPendingQuestionTask: compactChatText(state.openChatPendingQuestionTask || '', 120),
      openChatPendingQuestionPattern: compactChatText(state.openChatPendingQuestionPattern || '', 120),
      openChatLastStatus: compactChatText(state.openChatLastStatus || '', 1000),
      openChatLastStatusTone: ['ok', 'warn', 'error', 'info'].includes(String(state.openChatLastStatusTone || '')) ? state.openChatLastStatusTone : 'info',
      openChatDecisionSuppressedBriefKey: compactChatText(state.openChatDecisionSuppressedBriefKey || '', 80),
      jobPrompt: compactChatText(els.jobPrompt?.value || '', 9000),
      jobUrls: compactChatText(els.jobUrls?.value || '', 5000),
      jobType: compactChatText(els.jobType?.value || '', 80),
      selectedAgentId: compactChatText(state.selectedAgentId || els.jobAgentId?.value || '', 120),
      messages
    });
  }

  function readOpenChatSessions() {
    const state = getState();
    const serverSessions = openChatSessionsFromSnapshot(state.snapshot);
    const runtimeSessions = Array.isArray(state.openChatRuntimeSessions) ? state.openChatRuntimeSessions : [];
    let merged = upsertOpenChatSessionCollection(serverSessions);
    for (const runtimeSession of runtimeSessions) {
      merged = upsertOpenChatSessionCollection(merged, runtimeSession);
    }
    const currentPayload = currentOpenChatSessionPayload(merged, { createId: false });
    if (currentPayload && hasOpenChatSessionPayloadContent(currentPayload)) {
      merged = upsertOpenChatSessionCollection(merged, currentPayload);
    }
    return merged;
  }

  function mergeServerChatMemorySessions(snapshot = {}) {
    const state = getState();
    const serverSessions = openChatSessionsFromSnapshot(snapshot);
    const runtimeSessions = Array.isArray(state.openChatRuntimeSessions) ? state.openChatRuntimeSessions : [];
    let merged = upsertOpenChatSessionCollection(runtimeSessions);
    for (const serverSession of serverSessions) {
      merged = upsertOpenChatSessionCollection(merged, serverSession);
    }
    const before = JSON.stringify(runtimeSessions.map((item) => `${item.id}:${item.updatedAt}`));
    const after = JSON.stringify(merged.map((item) => `${item.id}:${item.updatedAt}`));
    if (before === after) return false;
    writeOpenChatSessions(merged);
    return true;
  }

  function persistCurrentOpenChatSession() {
    const state = getState();
    const session = currentOpenChatSessionPayload(Array.isArray(state.openChatRuntimeSessions) ? state.openChatRuntimeSessions : [], { createId: true });
    if (!session || !hasOpenChatSessionPayloadContent(session)) return null;
    state.currentOpenChatSessionId = session.id;
    const runtimeSessions = Array.isArray(state.openChatRuntimeSessions) ? state.openChatRuntimeSessions : [];
    writeOpenChatSessions(upsertOpenChatSessionCollection(runtimeSessions, session));
    renderOpenChatSessionControls();
    return session;
  }

  function markCurrentOpenChatSessionLinkedOrder(orderId = '', options = {}) {
    const state = getState();
    const safeOrderId = compactChatText(orderId || '', 120);
    if (!safeOrderId) return null;
    ensureCurrentOpenChatSessionId({ force: true });
    const runtimeSessions = Array.isArray(state.openChatRuntimeSessions) ? state.openChatRuntimeSessions : [];
    const current = currentOpenChatSessionPayload(runtimeSessions, { createId: true }) || {
      id: state.currentOpenChatSessionId,
      messages: []
    };
    const active = !isTerminalOrderStatus(options.status || '');
    const nextActiveJobIds = [...new Set([
      ...(Array.isArray(current.activeJobIds) ? current.activeJobIds : []),
      safeOrderId
    ].map((item) => compactChatText(item, 120)).filter(Boolean))]
      .filter((item) => active || item !== safeOrderId);
    const session = normalizeOpenChatSession({
      ...current,
      activeWork: active ? true : nextActiveJobIds.length > 0,
      linkedOrderId: current.linkedOrderId || safeOrderId,
      activeJobIds: nextActiveJobIds,
      openChatPreparedBrief: '',
      openChatParallelPlan: [],
      openChatClarifyOptions: [],
      jobPrompt: ''
    });
    clearOpenChatDispatchDraftState();
    writeOpenChatSessions(upsertOpenChatSessionCollection(runtimeSessions, session));
    renderOpenChatSessionControls();
    renderOpenChatChoiceBar();
    syncCreateJobButtonForCurrentPrompt();
    return session;
  }

  function loadOpenChatSession(sessionId = '') {
    const state = getState();
    const els = getEls();
    const session = readOpenChatSessions().find((item) => item.id === sessionId);
    if (!session) {
      flash('Chat session not found.', 'warn');
      renderOpenChatSessionControls();
      return;
    }
    finishOpenChatTyping({ render: false });
    clearOpenChatOrderProgressTimer();
    clearOpenChatAcceptanceProgressTimer();
    clearLiveSnapshotRefreshTimer();
    state.openChatProgressOrderId = '';
    state.openChatProgressLastKey = '';
    state.openChatProgressPollCount = 0;
    state.openChatPendingDispatchMessageId = '';
    state.currentOpenChatSessionId = session.id;
    state.orderChatMessages = session.messages.map(serializeOpenChatMessageForSession);
    state.openChatMode = normalizeOpenChatMode(session.openChatMode || 'clarify');
    const sessionHasLinkedWork = openChatSessionHasLinkedWork(session, state.orderChatMessages);
    state.openChatPreparedBrief = sessionHasLinkedWork ? '' : compactChatText(session.openChatPreparedBrief || '', 9000);
    state.openChatParallelPlan = sessionHasLinkedWork ? [] : (Array.isArray(session.openChatParallelPlan) ? session.openChatParallelPlan.slice(0, 8) : []);
    state.openChatClarifyOptions = sessionHasLinkedWork ? [] : (Array.isArray(session.openChatClarifyOptions) ? session.openChatClarifyOptions.slice(0, 8) : []);
    state.openChatVagueChoicePrompt = sessionHasLinkedWork ? '' : compactChatText(session.openChatVagueChoicePrompt || '', 2000);
    state.openChatNaturalChoiceIntent = sessionHasLinkedWork ? '' : compactChatText(session.openChatNaturalChoiceIntent || '', 160);
    state.openChatIntentShiftPrompt = sessionHasLinkedWork ? '' : compactChatText(session.openChatIntentShiftPrompt || '', 2000);
    state.openChatIdeaBacklogPrompt = sessionHasLinkedWork ? '' : compactChatText(session.openChatIdeaBacklogPrompt || '', 2000);
    state.openChatLeaderIntakePrompt = sessionHasLinkedWork ? '' : compactChatText(session.openChatLeaderIntakePrompt || '', 2000);
    state.openChatLeaderIntakeTask = sessionHasLinkedWork ? '' : compactChatText(session.openChatLeaderIntakeTask || '', 120);
    state.openChatPendingQuestionPrompt = sessionHasLinkedWork ? '' : compactChatText(session.openChatPendingQuestionPrompt || '', 4000);
    state.openChatPendingQuestionTask = sessionHasLinkedWork ? '' : compactChatText(session.openChatPendingQuestionTask || '', 120);
    state.openChatPendingQuestionPattern = sessionHasLinkedWork ? '' : compactChatText(session.openChatPendingQuestionPattern || '', 120);
    state.openChatLastStatus = compactChatText(session.openChatLastStatus || 'Chat session loaded.\n\nContinue from the restored context.', 1000);
    state.openChatLastStatusTone = ['ok', 'warn', 'error', 'info'].includes(String(session.openChatLastStatusTone || '')) ? session.openChatLastStatusTone : 'info';
    state.openChatDecisionSuppressedBriefKey = compactChatText(session.openChatDecisionSuppressedBriefKey || '', 80);
    state.openChatDecisionSuppressed = sessionHasLinkedWork;
    state.selectedAgentId = compactChatText(session.selectedAgentId || '', 120);
    if (els.jobAgentId) els.jobAgentId.value = state.selectedAgentId;
    state.pendingIntake = null;
    state.intakeConfirmed = false;
    state.intakeAnswer = '';
    state.orderComposerDirtySinceSend = false;
    state.openChatPausedByTabLeave = false;
    state.openChatHistoryOpen = false;
    state.openChatEntryDismissed = Boolean(
      state.snapshot?.auth?.loggedIn
        || (Array.isArray(state.orderChatMessages) ? state.orderChatMessages.length : 0)
        || String(session.jobPrompt || '').trim()
    );
    if (els.jobPrompt) els.jobPrompt.value = sessionHasLinkedWork ? '' : session.jobPrompt || '';
    if (els.jobUrls) els.jobUrls.value = session.jobUrls || '';
    if (els.jobType) els.jobType.value = sessionHasLinkedWork ? '' : session.jobType || '';
    renderOrderComposer();
    const statusParts = String(state.openChatLastStatus || '').split(/\n\n+/);
    updateWorkChatStatusCard(
      statusParts.shift() || 'Chat session loaded.',
      statusParts.join('\n\n') || 'Continue from the restored context.',
      state.openChatLastStatusTone
    );
    void backfillTrackedJobsIntoSnapshot(state.snapshot || {});
    scheduleLiveSnapshotRefresh(state.snapshot || {});
    flash('Chat session loaded.', 'ok');
  }

  function startNewOpenChatSession(options = {}) {
    const state = getState();
    finishOpenChatTyping({ render: false });
    clearOpenChatOrderProgressTimer();
    clearOpenChatAcceptanceProgressTimer();
    clearLiveSnapshotRefreshTimer();
    state.currentOpenChatSessionId = '';
    state.orderChatMessages = [];
    state.openChatProgressOrderId = '';
    state.openChatProgressLastKey = '';
    state.openChatProgressPollCount = 0;
    state.openChatPendingDispatchMessageId = '';
    state.openChatHistoryOpen = false;
    state.openChatEntryDismissed = Boolean(state.snapshot?.auth?.loggedIn);
    state.openChatPausedByTabLeave = false;
    state.openChatMode = 'clarify';
    state.openChatDecisionSuppressedBriefKey = '';
    state.openChatDecisionSuppressed = false;
    clearOrderComposerPromptState();
    clearOpenChatDispatchDraftState({ clearComposer: false });
    state.openChatLastStatus = '';
    state.openChatLastStatusTone = 'info';
    renderOrderComposer();
    scheduleLiveSnapshotRefresh(state.snapshot || {});
    if (!options.silent) flash('New chat started.', 'info');
  }

  async function deleteOpenChatSession(sessionId = '') {
    const state = getState();
    const targetId = compactChatText(sessionId || '', 160);
    if (!targetId) return;
    const targetSession = readOpenChatSessions().find((session) => session.id === targetId) || null;
    const serverMemoryIds = targetSession?.serverManaged
      ? collectOpenChatMemoryDeleteIds(targetSession)
      : [];
    writeOpenChatSessions((Array.isArray(state.openChatRuntimeSessions) ? state.openChatRuntimeSessions : [])
      .filter((session) => String(session?.id || '').trim() !== targetId));
    if (state.currentOpenChatSessionId === targetId) startNewOpenChatSession({ silent: true });
    removeSnapshotChatMemoryItems(serverMemoryIds);
    renderOpenChatSessionControls();
    if (!serverMemoryIds.length || !state.snapshot?.auth?.loggedIn) {
      flash('Saved chat removed from this browser session.', 'info');
      return;
    }
    const results = await Promise.allSettled(serverMemoryIds.map((memoryId) => (
      api(`/api/settings/chat-memory/${encodeURIComponent(memoryId)}`, { method: 'DELETE' })
    )));
    const fulfilled = results
      .filter((result) => result.status === 'fulfilled')
      .map((result) => result.value);
    const latestChatMemory = fulfilled.findLast?.((result) => Array.isArray(result?.chatMemory))
      || [...fulfilled].reverse().find((result) => Array.isArray(result?.chatMemory));
    if (Array.isArray(latestChatMemory?.chatMemory) && state.snapshot) state.snapshot.chatMemory = latestChatMemory.chatMemory;
    const cancelled = fulfilled.reduce((count, result) => count + (Array.isArray(result?.cancelled_job_ids) ? result.cancelled_job_ids.length : 0), 0);
    if (fulfilled.length) {
      flash(cancelled ? 'Chat deleted and linked work stopped.' : 'Chat deleted from account history.', 'info');
    } else {
      const error = results.find((result) => result.status === 'rejected')?.reason || new Error('Account history update failed.');
      flash(`Chat hidden locally. Account history update failed: ${error.message}`, 'warn');
    }
  }

  async function clearOpenChatHistory() {
    const state = getState();
    const serverTranscriptIds = new Set();
    const remember = (ids = []) => {
      for (const id of Array.isArray(ids) ? ids : [ids]) {
        const normalized = normalizeOpenChatMemoryDeleteId(id);
        if (normalized) serverTranscriptIds.add(normalized);
      }
    };
    for (const item of Array.isArray(state.snapshot?.chatMemory) ? state.snapshot.chatMemory : []) {
      remember(collectOpenChatMemoryDeleteIds(item));
    }
    for (const session of readOpenChatSessions()) {
      if (session?.serverManaged) remember(collectOpenChatMemoryDeleteIds(session));
    }
    startNewOpenChatSession({ silent: true });
    writeOpenChatSessions([]);
    removeSnapshotChatMemoryItems(Array.from(serverTranscriptIds));
    renderOpenChatSessionControls();
    const transcriptIds = Array.from(serverTranscriptIds);
    if (state.snapshot?.auth?.loggedIn && transcriptIds.length) {
      const results = await Promise.allSettled(transcriptIds.map((transcriptId) => {
        return transcriptId
          ? api(`/api/settings/chat-memory/${encodeURIComponent(transcriptId)}`, { method: 'DELETE' })
          : Promise.resolve();
      }));
      const fulfilled = results
        .filter((result) => result.status === 'fulfilled')
        .map((result) => result.value);
      const latestChatMemory = fulfilled.findLast?.((result) => Array.isArray(result?.chatMemory))
        || [...fulfilled].reverse().find((result) => Array.isArray(result?.chatMemory));
      if (Array.isArray(latestChatMemory?.chatMemory) && state.snapshot) state.snapshot.chatMemory = latestChatMemory.chatMemory;
      if (!fulfilled.length) {
        flash('Chat hidden locally. Account history update failed.', 'warn');
        return;
      }
    }
    flash(transcriptIds.length ? 'Account chat history deleted.' : 'No saved account chat history to delete.', 'info');
  }

  function toggleOpenChatHistory() {
    const state = getState();
    state.openChatHistoryOpen = !state.openChatHistoryOpen;
    renderOpenChatSessionControls();
  }

  return {
    ensureCurrentOpenChatSessionId,
    writeOpenChatSessions,
    readOpenChatSessions,
    collectOpenChatMemoryDeleteIds,
    openChatSessionsFromSnapshot,
    mergeServerChatMemorySessions,
    currentOpenChatSessionPayload,
    persistCurrentOpenChatSession,
    markCurrentOpenChatSessionLinkedOrder,
    loadOpenChatSession,
    startNewOpenChatSession,
    deleteOpenChatSession,
    clearOpenChatHistory,
    toggleOpenChatHistory
  };
}
