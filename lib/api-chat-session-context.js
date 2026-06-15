import { accountHash } from './account-identity.js';

const MESSAGE_LIMIT = 120;
const CONTEXT_LIMIT = 18;

function nowIso() {
  return new Date().toISOString();
}

function safeString(value = '', max = 5000) {
  return String(value ?? '').trim().slice(0, max);
}

function safeRole(value = '') {
  const role = safeString(value, 20).toLowerCase();
  if (['user', 'assistant', 'system'].includes(role)) return role;
  return 'assistant';
}

function bodyInput(body = {}) {
  return body?.input && typeof body.input === 'object' ? body.input : {};
}

function bodyBroker(body = {}) {
  const input = bodyInput(body);
  return input?._broker && typeof input._broker === 'object' ? input._broker : {};
}

function normalizeMessage(message = {}, fallbackTs = '') {
  const body = safeString(message?.body || message?.content || message?.text || '', 5000);
  if (!body) return null;
  return {
    role: safeRole(message?.role || 'assistant'),
    body,
    tone: safeString(message?.tone || '', 80),
    label: safeString(message?.label || '', 120),
    ts: safeString(message?.ts || message?.created_at || message?.createdAt || fallbackTs || nowIso(), 80)
  };
}

function mergeMessages(...groups) {
  const byKey = new Map();
  for (const group of groups) {
    for (const item of Array.isArray(group) ? group : []) {
      const message = normalizeMessage(item);
      if (!message) continue;
      const key = `${message.role}\n${message.body}`;
      if (byKey.has(key)) byKey.delete(key);
      byKey.set(key, message);
    }
  }
  return [...byKey.values()].slice(-MESSAGE_LIMIT);
}

function conversationMessagesFromBody(body = {}) {
  const raw = Array.isArray(body.conversation_context)
    ? body.conversation_context
    : (Array.isArray(body.conversationContext)
      ? body.conversationContext
      : (Array.isArray(body.messages) ? body.messages : []));
  return raw.map((item) => normalizeMessage(item)).filter(Boolean).slice(-CONTEXT_LIMIT);
}

function conversationContextFromMessages(messages = []) {
  return (Array.isArray(messages) ? messages : [])
    .map((message) => normalizeMessage(message))
    .filter(Boolean)
    .slice(-CONTEXT_LIMIT)
    .map((message) => ({
      role: message.role,
      content: message.body,
      created_at: message.ts
    }));
}

export function apiChatSessionIdFromBody(body = {}) {
  const input = bodyInput(body);
  const broker = bodyBroker(body);
  const workflow = broker.workflow && typeof broker.workflow === 'object' ? broker.workflow : {};
  return safeString(
    body.session_id
      || body.sessionId
      || input.session_id
      || input.sessionId
      || broker.chatSessionId
      || workflow.chatSessionId
      || '',
    180
  );
}

function snapshotMatchesSessionId(snapshot = {}, sessionId = '') {
  const session = snapshot?.session && typeof snapshot.session === 'object' ? snapshot.session : {};
  return [
    snapshot.id,
    snapshot.sessionId,
    session.id,
    session.sessionId
  ].map((value) => safeString(value, 180)).some((value) => value === sessionId);
}

async function loadSessionSnapshot(storage, current = null, sessionId = '') {
  const login = safeString(current?.login || current?.account?.login || '', 200).toLowerCase();
  const hash = accountHash(login);
  if (!hash || !sessionId || typeof storage?.listChatSessionSnapshots !== 'function') {
    return { hash, snapshot: null };
  }
  try {
    const snapshots = await storage.listChatSessionSnapshots({ accountHash: hash, limit: 200 });
    return {
      hash,
      snapshot: (Array.isArray(snapshots) ? snapshots : []).find((item) => snapshotMatchesSessionId(item, sessionId)) || null
    };
  } catch (error) {
    console.warn('api chat session lookup failed', error);
    return { hash, snapshot: null };
  }
}

function pendingIntakeFromSnapshot(snapshot = {}) {
  const session = snapshot?.session && typeof snapshot.session === 'object' ? snapshot.session : {};
  const intake = session.pendingIntake && typeof session.pendingIntake === 'object' ? session.pendingIntake : null;
  if (!intake || intake.consumedAt) return null;
  const originalPrompt = safeString(intake.originalPrompt || intake.original_prompt || '', 5000);
  const taskType = safeString(intake.taskType || intake.task_type || intake.inferred_task_type || '', 120);
  const questions = Array.isArray(intake.questions)
    ? intake.questions.map((question) => safeString(question, 260)).filter(Boolean).slice(0, 6)
    : [];
  if (!originalPrompt || !questions.length) return null;
  return {
    id: safeString(intake.id || '', 120),
    originalPrompt,
    taskType,
    questions,
    reason: safeString(intake.reason || '', 120),
    missingFields: Array.isArray(intake.missingFields || intake.missing_fields)
      ? (intake.missingFields || intake.missing_fields).map((item) => safeString(item, 120)).filter(Boolean).slice(0, 12)
      : [],
    createdAt: safeString(intake.createdAt || intake.created_at || '', 80),
    updatedAt: safeString(intake.updatedAt || intake.updated_at || '', 80)
  };
}

function intakeAlreadyAnswered(body = {}) {
  const broker = bodyBroker(body);
  return body.skip_intake === true
    || body.skipIntake === true
    || body.intake_answered === true
    || body.intakeAnswered === true
    || broker?.intake?.answered === true
    || Boolean(body.followup_to_job_id || body.followupToJobId || bodyInput(body)._broker?.followupToJobId);
}

function shouldApplyPendingIntake(body = {}, pending = null, latestUserPrompt = '') {
  if (!pending || intakeAlreadyAnswered(body)) return false;
  const prompt = safeString(latestUserPrompt || body.prompt || '', 5000);
  if (!prompt) return false;
  if (prompt === pending.originalPrompt) return false;
  return true;
}

function buildAnsweredIntakePrompt(pending = {}, answer = '') {
  const questionBlock = (Array.isArray(pending.questions) ? pending.questions : [])
    .map((question, index) => `${index + 1}. ${question}`)
    .join('\n');
  return [
    'Original request:',
    pending.originalPrompt,
    '',
    questionBlock ? 'Clarification questions asked:' : '',
    questionBlock,
    questionBlock ? '' : '',
    'User clarification:',
    answer,
    '',
    'Use the user clarification as the missing context for this CAIt order. Do not ask the same intake questions again unless the answer is still empty, unsafe, or unrelated.'
  ].filter((line, index, lines) => line || lines[index - 1] !== '').join('\n').trim();
}

function bodyWithSessionContext(body = {}, context = {}) {
  const input = bodyInput(body);
  const broker = bodyBroker(body);
  const sessionMemory = {
    ...(broker.apiSessionMemory && typeof broker.apiSessionMemory === 'object' ? broker.apiSessionMemory : {}),
    sessionId: context.sessionId,
    messageCount: Array.isArray(context.messages) ? context.messages.length : 0,
    appliedPendingIntake: Boolean(context.appliedPendingIntake),
    source: 'server_session_memory'
  };
  if (context.latestUserPrompt) sessionMemory.latestUserPrompt = context.latestUserPrompt;
  return {
    ...body,
    ...(context.conversationContext?.length ? { conversation_context: context.conversationContext } : {}),
    input: {
      ...input,
      _broker: {
        ...broker,
        ...(context.sessionId ? { chatSessionId: context.sessionId } : {}),
        apiSessionMemory: sessionMemory
      }
    }
  };
}

export async function prepareApiChatSessionBody(storage, current = null, body = {}, options = {}) {
  const sessionId = apiChatSessionIdFromBody(body);
  const latestUserPrompt = safeString(body?.prompt || '', 5000);
  if (!sessionId || !current?.login) {
    return { body, context: { sessionId, latestUserPrompt, available: false, reason: 'missing_session_or_account' } };
  }
  const { hash, snapshot } = await loadSessionSnapshot(storage, current, sessionId);
  const session = snapshot?.session && typeof snapshot.session === 'object' ? snapshot.session : {};
  const storedMessages = Array.isArray(session.messages) ? session.messages.map((item) => normalizeMessage(item)).filter(Boolean) : [];
  const incomingMessages = conversationMessagesFromBody(body);
  const messages = mergeMessages(storedMessages, incomingMessages);
  const conversationContext = conversationContextFromMessages(messages);
  const pendingIntake = pendingIntakeFromSnapshot(snapshot || {});
  const appliedPendingIntake = shouldApplyPendingIntake(body, pendingIntake, latestUserPrompt);
  let preparedBody = bodyWithSessionContext(body, {
    sessionId,
    messages,
    conversationContext,
    latestUserPrompt,
    appliedPendingIntake
  });
  if (appliedPendingIntake) {
    const input = bodyInput(preparedBody);
    const broker = bodyBroker(preparedBody);
    const intake = broker.intake && typeof broker.intake === 'object' ? broker.intake : {};
    preparedBody = {
      ...preparedBody,
      prompt: buildAnsweredIntakePrompt(pendingIntake, latestUserPrompt),
      original_prompt: safeString(preparedBody.original_prompt || preparedBody.originalPrompt || pendingIntake.originalPrompt, 5000),
      originalPrompt: safeString(preparedBody.originalPrompt || preparedBody.original_prompt || pendingIntake.originalPrompt, 5000),
      ...(preparedBody.task_type || preparedBody.taskType || !pendingIntake.taskType ? {} : { task_type: pendingIntake.taskType, taskType: pendingIntake.taskType }),
      intake_answered: true,
      intakeAnswered: true,
      input: {
        ...input,
        _broker: {
          ...broker,
          intake: {
            ...intake,
            id: intake.id || pendingIntake.id,
            answered: true,
            source: 'api_session_memory',
            originalPrompt: pendingIntake.originalPrompt,
            taskType: pendingIntake.taskType,
            questions: pendingIntake.questions,
            userAnswer: latestUserPrompt
          },
          apiSessionMemory: {
            ...(broker.apiSessionMemory || {}),
            appliedPendingIntake: true,
            pendingIntakeId: pendingIntake.id || '',
            latestUserPrompt
          }
        }
      }
    };
  }
  return {
    body: preparedBody,
    context: {
      sessionId,
      accountHash: hash,
      snapshot,
      messages,
      incomingMessages,
      pendingIntake,
      appliedPendingIntake,
      latestUserPrompt,
      mode: options.mode || ''
    }
  };
}

function resultNeedsInput(result = {}) {
  return result?.needs_input === true
    || String(result?.status || '').trim() === 'needs_input'
    || String(result?.action || '').trim() === 'ask_clarifying_question';
}

function resultQuestions(result = {}) {
  const questions = Array.isArray(result.questions)
    ? result.questions
    : (Array.isArray(result.intake_questions || result.intakeQuestions) ? (result.intake_questions || result.intakeQuestions) : []);
  return [
    ...questions,
    result.narrowing_question || result.narrowingQuestion || ''
  ].map((question) => safeString(question, 260)).filter(Boolean).slice(0, 6);
}

function assistantBodyForResult(result = {}, mode = '') {
  if (resultNeedsInput(result)) {
    const questions = resultQuestions(result).map((question, index) => `${index + 1}. ${question}`).join('\n');
    return [
      safeString(result.message || 'CAIt needs a few details before creating the order.', 1200),
      questions
    ].filter(Boolean).join('\n\n').trim();
  }
  if (result?.chat_answer || result?.message) return safeString(result.chat_answer || result.message, 1800);
  if (result?.order_brief || result?.orderBrief) return 'Order draft prepared for this session.';
  if (result?.job_id || result?.workflow_job_id) return `Order created: ${safeString(result.job_id || result.workflow_job_id, 180)}`;
  if (result?.error) return safeString(result.error, 1200);
  return mode === 'prepare-order' ? 'Order draft prepared for this session.' : '';
}

function pendingIntakeForResult(result = {}, body = {}, context = {}) {
  if (!resultNeedsInput(result)) return null;
  const intake = result.intake && typeof result.intake === 'object' ? result.intake : {};
  const questions = resultQuestions(result);
  if (!questions.length) return null;
  const originalPrompt = safeString(
    intake.originalPrompt
      || body.original_prompt
      || body.originalPrompt
      || context.latestUserPrompt
      || body.prompt
      || '',
    5000
  );
  if (!originalPrompt) return null;
  const at = nowIso();
  return {
    id: safeString(intake.id || `intake_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`, 120),
    originalPrompt,
    taskType: safeString(intake.taskType || result.inferred_task_type || result.task_type || result.taskType || body.task_type || body.taskType || '', 120),
    questions,
    reason: safeString(result.reason || '', 120),
    missingFields: Array.isArray(result.missing_fields || intake.missingFields)
      ? (result.missing_fields || intake.missingFields).map((item) => safeString(item, 120)).filter(Boolean).slice(0, 12)
      : [],
    source: 'api_session_memory',
    createdAt: safeString(intake.createdAt || at, 80),
    updatedAt: at
  };
}

function chatSessionTitle(existingSession = {}, userPrompt = '') {
  return safeString(existingSession.title || userPrompt || 'CAIt API chat', 240);
}

function activeIdsForResult(result = {}, existingSession = {}) {
  const ids = [
    ...(Array.isArray(existingSession.activeJobIds) ? existingSession.activeJobIds : []),
    result?.job_id,
    result?.workflow_job_id
  ].map((item) => safeString(item, 180)).filter(Boolean);
  return [...new Set(ids)].slice(0, 40);
}

export async function persistApiChatSessionTurn(storage, current = null, body = {}, result = {}, context = {}, options = {}) {
  const sessionId = safeString(context.sessionId || apiChatSessionIdFromBody(body), 180);
  if (!sessionId || !current?.login || typeof storage?.upsertChatSessionSnapshot !== 'function') {
    return { saved: false, reason: 'missing_session_or_storage' };
  }
  const hash = context.accountHash || accountHash(current.login);
  if (!hash) return { saved: false, reason: 'account_hash_missing' };
  let snapshot = context.snapshot || null;
  if (!snapshot) {
    const loaded = await loadSessionSnapshot(storage, current, sessionId);
    snapshot = loaded.snapshot || null;
  }
  const existingSession = snapshot?.session && typeof snapshot.session === 'object' ? snapshot.session : {};
  const existingMessages = Array.isArray(existingSession.messages) ? existingSession.messages : [];
  const incomingMessages = Array.isArray(context.incomingMessages) ? context.incomingMessages : conversationMessagesFromBody(body);
  const latestUserPrompt = safeString(context.latestUserPrompt || bodyBroker(body)?.apiSessionMemory?.latestUserPrompt || body.prompt || '', 5000);
  const now = nowIso();
  const userMessage = latestUserPrompt ? [{ role: 'user', body: latestUserPrompt, tone: 'api', label: 'User', ts: now }] : [];
  const assistantBody = assistantBodyForResult(result, options.mode || context.mode || '');
  const assistantMessage = assistantBody ? [{
    role: 'assistant',
    body: assistantBody,
    tone: resultNeedsInput(result) ? 'needs_input' : (result?.error ? 'error' : 'api'),
    label: 'CAIt',
    ts: now
  }] : [];
  const messages = mergeMessages(existingMessages, incomingMessages, userMessage, assistantMessage);
  const pendingIntake = pendingIntakeForResult(result, body, context);
  const linkedOrderId = safeString(result?.workflow_job_id || result?.job_id || existingSession.linkedOrderId || snapshot?.linkedOrderId || '', 180);
  const activeJobIds = activeIdsForResult(result, existingSession);
  const session = {
    ...existingSession,
    id: safeString(existingSession.id || sessionId, 180),
    sessionId: safeString(existingSession.sessionId || sessionId, 180),
    title: chatSessionTitle(existingSession, latestUserPrompt),
    messages,
    pendingIntake,
    linkedOrderId,
    activeJobIds,
    relatedOrderIds: [...new Set([
      ...(Array.isArray(existingSession.relatedOrderIds) ? existingSession.relatedOrderIds : []),
      linkedOrderId,
      ...activeJobIds
    ].map((item) => safeString(item, 180)).filter(Boolean))].slice(0, 80),
    createdAt: safeString(existingSession.createdAt || snapshot?.createdAt || messages[0]?.ts || now, 80),
    updatedAt: now
  };
  try {
    await storage.upsertChatSessionSnapshot({
      id: sessionId,
      accountHash: hash,
      title: session.title,
      session,
      linkedOrderId,
      activeJobIds,
      relatedOrderIds: session.relatedOrderIds,
      createdAt: session.createdAt,
      updatedAt: now
    });
    return {
      saved: true,
      sessionId,
      pendingIntake: Boolean(pendingIntake),
      appliedPendingIntake: Boolean(context.appliedPendingIntake),
      messageCount: messages.length
    };
  } catch (error) {
    console.warn('api chat session persist failed', error);
    return { saved: false, reason: 'persist_failed' };
  }
}

export function chatSessionMemoryResponseMeta(context = {}, persisted = null) {
  const sessionId = safeString(context.sessionId || persisted?.sessionId || '', 180);
  if (!sessionId) return null;
  return {
    session_id: sessionId,
    remembered: Boolean(context.messages?.length || context.pendingIntake),
    applied_pending_intake: Boolean(context.appliedPendingIntake),
    saved: Boolean(persisted?.saved),
    pending_intake: Boolean(persisted?.pendingIntake || (context.pendingIntake && !context.appliedPendingIntake))
  };
}
