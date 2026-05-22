export function createFeedbackChatRouteHandlers(deps = {}) {
  const {
    accountHash,
    accountSettingsForLogin,
    canReviewFeedbackReports,
    chatSessionIdForJob,
    chatSessionSnapshotHideIds,
    chatTrainingExamplesForClient,
    createChatTranscript,
    createFeedbackReport,
    currentUserContext,
    feedbackReportsForClient,
    forwardFeedbackReportEmail,
    getSession,
    hideChatMemoryTranscriptForLoginInState,
    jobsVisibleToLogin,
    lightweightCurrentFromSession,
    normalizeChatMemoryHiddenIdForWorker,
    nowIso,
    ownChatMemoryForClient,
    parseBody,
    relatedChatMemoryHideIds,
    sanitizeAccountSettingsForClient,
    sanitizeFeedbackReportForClient,
    touchEvent,
    updateChatTranscriptReviewInState,
    updateFeedbackReportInState
  } = deps;

  async function hideOwnChatMemory(storage, request, env, memoryId) {
    const current = await currentUserContext(request, env);
    if (!current.user) return { error: 'Login required', statusCode: 401 };
    const safeMemoryId = String(memoryId || '').trim().replace(/^server_/, '').slice(0, 140);
    if (!safeMemoryId) return { error: 'Chat memory id is required', statusCode: 400 };
    let deletedSession = false;
    const hash = accountHash(current.login || '');
    const extraHiddenIdSet = new Set(relatedChatMemoryHideIds([safeMemoryId]));
    const snapshotDeleteIds = new Set();
    if (typeof storage.listChatSessionSnapshots === 'function') {
      try {
        const snapshots = await storage.listChatSessionSnapshots({ accountHash: hash, limit: 500 });
        for (const snapshot of Array.isArray(snapshots) ? snapshots : []) {
          const ids = chatSessionSnapshotHideIds(snapshot);
          if (!ids.some((id) => extraHiddenIdSet.has(id))) continue;
          ids.forEach((id) => extraHiddenIdSet.add(id));
          const session = snapshot?.session && typeof snapshot.session === 'object' ? snapshot.session : {};
          const snapshotId = normalizeChatMemoryHiddenIdForWorker(snapshot.id || session.id || session.sessionId);
          if (snapshotId) snapshotDeleteIds.add(snapshotId);
        }
      } catch (error) {
        console.warn('chat session snapshot lookup failed before hide', error);
      }
    }
    if (typeof storage.deleteChatSessionSnapshot === 'function') {
      const idsToDelete = snapshotDeleteIds.size ? [...snapshotDeleteIds] : [safeMemoryId];
      for (const id of idsToDelete) {
        deletedSession = (await storage.deleteChatSessionSnapshot(id, { accountHash: hash })) || deletedSession;
      }
    }
    let result = null;
    await storage.mutate(async (draft) => {
      if (Array.isArray(draft.chatSessions)) {
        const before = draft.chatSessions.length;
        draft.chatSessions = draft.chatSessions.filter((item) => {
          const ids = chatSessionSnapshotHideIds(item);
          return !ids.some((id) => extraHiddenIdSet.has(id));
        });
        if (draft.chatSessions.length !== before) deletedSession = true;
      }
      const visibleJobs = jobsVisibleToLogin(draft, current.login);
      for (const job of visibleJobs) {
        const jobId = normalizeChatMemoryHiddenIdForWorker(job?.id);
        const explicitSessionId = normalizeChatMemoryHiddenIdForWorker(chatSessionIdForJob(job));
        const jobIds = relatedChatMemoryHideIds([jobId, explicitSessionId]);
        if (!jobIds.some((id) => extraHiddenIdSet.has(id))) continue;
        jobIds.forEach((id) => extraHiddenIdSet.add(id));
      }
      result = hideChatMemoryTranscriptForLoginInState(draft, current.login, safeMemoryId, current.user, current.authProvider, {
        extraHiddenIds: [...extraHiddenIdSet]
      });
    });
    if (!result && !deletedSession) return { error: 'Chat memory could not be hidden', statusCode: 400 };
    const refreshedState = await storage.getState();
    const refreshedAccount = result?.account || accountSettingsForLogin(refreshedState, current.login, current.user, current.authProvider);
    const state = await storage.getState();
    return {
      ok: true,
      hidden_chat_memory_id: result?.transcriptId || safeMemoryId,
      deleted_chat_session_id: deletedSession ? safeMemoryId : '',
      cancelled_job_ids: [],
      account: sanitizeAccountSettingsForClient(refreshedAccount),
      chatMemory: ownChatMemoryForClient(state, current.login, 20)
    };
  }

  async function submitFeedbackReport(storage, request, env) {
    let body;
    try {
      body = await parseBody(request);
    } catch (error) {
      return { error: error.message, statusCode: 400 };
    }
    const title = String(body?.title || '').trim();
    const message = String(body?.message || '').trim();
    if (!title && !message) return { error: 'Title or message is required', statusCode: 400 };
    const current = await currentUserContext(request, env);
    const url = new URL(request.url);
    const report = createFeedbackReport(body || {}, {
      reporterLogin: current?.login || '',
      pagePath: body?.page_path || url.pathname,
      currentTab: body?.current_tab || '',
      source: body?.source || 'contact_form'
    });
    await storage.mutate(async (draft) => {
      if (!Array.isArray(draft.feedbackReports)) draft.feedbackReports = [];
      draft.feedbackReports.unshift(report);
      if (draft.feedbackReports.length > 1000) draft.feedbackReports = draft.feedbackReports.slice(0, 1000);
    });
    const emailForward = await forwardFeedbackReportEmail(report, env);
    await touchEvent(storage, 'FEEDBACK', `feedback ${report.type} ${report.id.slice(0, 8)} submitted`, {
      reportId: report.id,
      type: report.type,
      source: report.context?.source || 'contact_form',
      pagePath: report.context?.pagePath || '/',
      reporterLogin: report.reporterLogin || '',
      emailForwarded: Boolean(emailForward.ok),
      emailStatus: emailForward.status,
      emailError: emailForward.ok ? '' : emailForward.error || emailForward.status || ''
    });
    return {
      ok: true,
      report: sanitizeFeedbackReportForClient(report),
      email_forwarded: Boolean(emailForward.ok),
      email_status: emailForward.status
    };
  }

  async function recordChatTranscript(storage, request, env) {
    let body;
    try {
      body = await parseBody(request);
    } catch (error) {
      return { error: error.message, statusCode: 400 };
    }
    const current = await currentUserContext(request, env);
    const transcript = createChatTranscript(body || {}, {
      loggedIn: Boolean(current?.user),
      authProvider: current?.authProvider || 'guest',
      login: current?.login || ''
    });
    if (transcript.error) return transcript;
    if (typeof storage.appendChatTranscript === 'function') {
      await storage.appendChatTranscript(transcript);
    } else {
      await storage.mutate(async (draft) => {
        if (!Array.isArray(draft.chatTranscripts)) draft.chatTranscripts = [];
        const existingIndex = draft.chatTranscripts.findIndex((item) => String(item?.id || '') === String(transcript.id || ''));
        if (existingIndex !== -1) draft.chatTranscripts[existingIndex] = transcript;
        else draft.chatTranscripts.unshift(transcript);
      });
    }
    return {
      ok: true,
      transcript: {
        id: transcript.id,
        createdAt: transcript.createdAt,
        redacted: transcript.redacted
      }
    };
  }

  function sanitizeChatSessionMessage(message = {}, fallbackTs = '') {
    const role = ['user', 'assistant', 'system'].includes(String(message?.role || '').trim()) ? String(message.role).trim() : 'assistant';
    const body = String(message?.body || '').trim().slice(0, 5000);
    if (!body) return null;
    return {
      role,
      body,
      tone: String(message?.tone || '').trim().slice(0, 80),
      label: String(message?.label || '').trim().slice(0, 120),
      ts: String(message?.ts || fallbackTs || nowIso()).trim()
    };
  }

  function normalizeChatSessionAccountKey(value = '') {
    return String(value || '').trim().toLowerCase();
  }

  function chatSessionSnapshotAccountKey(body = {}, source = {}) {
    return normalizeChatSessionAccountKey(
      body.accountKey
        || body.account_key
        || body.accountLogin
        || body.account_login
        || source.accountKey
        || source.account_key
        || source.accountLogin
        || source.account_login
        || ''
    );
  }

  function sanitizeChatSessionSnapshot(body = {}, current = null) {
    const source = body?.session && typeof body.session === 'object' ? body.session : body;
    const currentAccountKey = normalizeChatSessionAccountKey(current?.login || '');
    const clientAccountKey = chatSessionSnapshotAccountKey(body, source);
    if (!clientAccountKey) {
      return {
        error: 'Chat session account key is required',
        code: 'chat_session_account_required',
        statusCode: 409
      };
    }
    if (currentAccountKey && clientAccountKey !== currentAccountKey) {
      return {
        error: 'Chat session belongs to a different account',
        code: 'stale_chat_session_account',
        statusCode: 409
      };
    }
    const id = String(source.id || source.sessionId || body.session_id || body.sessionId || '').trim().slice(0, 180);
    if (!id) return { error: 'Chat session id is required', statusCode: 400 };
    const updatedAt = String(source.updatedAt || body.updatedAt || nowIso()).trim();
    const messages = (Array.isArray(source.messages) ? source.messages : [])
      .map((message) => sanitizeChatSessionMessage(message, updatedAt))
      .filter(Boolean)
      .slice(-120);
    const linkedOrderId = String(source.linkedOrderId || body.linkedOrderId || '').trim().slice(0, 180);
    const activeJobIds = [];
    const relatedOrderIds = [...new Set([
      ...(Array.isArray(source.relatedOrderIds) ? source.relatedOrderIds : []),
      linkedOrderId,
      ...activeJobIds
    ].map((item) => String(item || '').trim()).filter(Boolean))].slice(0, 80);
    const session = {
      id,
      sessionId: String(source.sessionId || id).trim().slice(0, 180),
      title: String(source.title || messages.find((message) => message.role === 'user')?.body || 'Chat').trim().slice(0, 240),
      messages,
      activeLeader: source.activeLeader && typeof source.activeLeader === 'object' ? source.activeLeader : null,
      activeLeaderLocked: Boolean(source.activeLeaderLocked),
      activeWork: false,
      linkedOrderId,
      activeJobIds,
      relatedOrderIds,
      createdAt: String(source.createdAt || body.createdAt || messages[0]?.ts || updatedAt).trim(),
      updatedAt
    };
    return {
      id,
      accountHash: accountHash(current?.login || ''),
      title: session.title,
      session,
      linkedOrderId,
      activeJobIds,
      relatedOrderIds,
      createdAt: session.createdAt,
      updatedAt
    };
  }

  async function recordChatSessionSnapshot(storage, request, env) {
    let body;
    try {
      body = await parseBody(request);
    } catch (error) {
      return { error: error.message, statusCode: 400 };
    }
    const current = await currentUserContext(request, env);
    if (!current?.login || !current?.user) return { ok: true, saved: false, reason: 'login_required' };
    const record = sanitizeChatSessionSnapshot(body || {}, current);
    if (record.error) return record;
    if (!record.accountHash) return { ok: true, saved: false, reason: 'account_hash_missing' };
    if (typeof storage.upsertChatSessionSnapshot === 'function') {
      await storage.upsertChatSessionSnapshot(record);
    } else {
      await storage.mutate(async (draft) => {
        if (!Array.isArray(draft.chatSessions)) draft.chatSessions = [];
        draft.chatSessions = [record, ...draft.chatSessions.filter((item) => String(item?.id || '') !== record.id)].slice(0, 1000);
      });
    }
    return { ok: true, saved: true, session: { id: record.id, updatedAt: record.updatedAt } };
  }

  async function listFeedbackReports(storage, request, env) {
    const current = lightweightCurrentFromSession(await getSession(request, env));
    if (!current.user) return { error: 'Login required', statusCode: 401 };
    if (!canReviewFeedbackReports(current, env)) return { error: 'Reports are restricted to operators', statusCode: 403 };
    if (typeof storage.listFeedbackReports === 'function') {
      const feedbackReports = await storage.listFeedbackReports({ limit: 200 });
      return { feedbackReports: feedbackReportsForClient({ feedbackReports }, 200) };
    }
    const state = await storage.getState();
    return { feedbackReports: feedbackReportsForClient(state, 200) };
  }

  async function updateFeedbackReport(storage, request, env, reportId) {
    const current = await currentUserContext(request, env);
    if (!current.user) return { error: 'Login required', statusCode: 401 };
    if (!canReviewFeedbackReports(current, env)) return { error: 'Reports are restricted to operators', statusCode: 403 };
    let body;
    try {
      body = await parseBody(request);
    } catch (error) {
      return { error: error.message, statusCode: 400 };
    }
    let updated = null;
    await storage.mutate(async (draft) => {
      updated = updateFeedbackReportInState(draft, reportId, body || {}, { login: current.login });
    });
    if (!updated) return { error: 'Feedback report not found', statusCode: 404 };
    await touchEvent(storage, 'FEEDBACK', `feedback ${updated.id.slice(0, 8)} marked ${updated.status}`, {
      reportId: updated.id,
      status: updated.status,
      reviewedBy: current.login
    });
    return { ok: true, report: sanitizeFeedbackReportForClient(updated) };
  }

  async function updateChatTranscriptReview(storage, request, env, transcriptId) {
    const current = await currentUserContext(request, env);
    if (!current.user) return { error: 'Login required', statusCode: 401 };
    if (!canReviewFeedbackReports(current, env)) return { error: 'Chat transcripts are restricted to operators', statusCode: 403 };
    let body;
    try {
      body = await parseBody(request);
    } catch (error) {
      return { error: error.message, statusCode: 400 };
    }
    let updated = null;
    await storage.mutate(async (draft) => {
      updated = updateChatTranscriptReviewInState(draft, transcriptId, body || {}, { login: current.login });
    });
    if (!updated) return { error: 'Chat transcript not found', statusCode: 404 };
    await touchEvent(storage, 'TRACK', `chat transcript ${updated.id.slice(0, 8)} marked ${updated.reviewStatus}`, {
      kind: 'chat_transcript_review',
      transcriptId: updated.id,
      reviewStatus: updated.reviewStatus,
      reviewedBy: current.login
    });
    return { ok: true, transcript: updated };
  }

  async function listChatTrainingData(storage, request, env) {
    const current = lightweightCurrentFromSession(await getSession(request, env));
    if (!current.user) return { error: 'Login required', statusCode: 401 };
    if (!canReviewFeedbackReports(current, env)) return { error: 'Training data export is restricted to operators', statusCode: 403 };
    const state = typeof storage.listChatTranscripts === 'function'
      ? { chatTranscripts: await storage.listChatTranscripts({ reviewStatus: 'fixed', limit: 200 }) }
      : await storage.getState();
    const examples = chatTrainingExamplesForClient(state, 200);
    return {
      ok: true,
      schema: 'cait-chat-training-export/v1',
      policy: {
        source: 'Reviewed Work Chat transcripts only.',
        includedStatuses: ['fixed'],
        redaction: 'Secrets, emails, auth headers, long text, and payment-like numbers are redacted or truncated before export.',
        usage: 'Use for CAIt prompt/rule/evaluation improvement. Do not use as external model training data without updated user notice and consent.'
      },
      examples
    };
  }

  return {
    hideOwnChatMemory,
    listChatTrainingData,
    listFeedbackReports,
    recordChatSessionSnapshot,
    recordChatTranscript,
    submitFeedbackReport,
    updateChatTranscriptReview,
    updateFeedbackReport
  };
}
