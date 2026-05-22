import { compactClientText as compactChatText } from './client-text-utils.js?v=20260521a';
import { deliveryFileNames } from './client-order-progress-utils.js?v=20260522a';

export const OPEN_CHAT_SESSION_MAX_MESSAGES = 16;
export const OPEN_CHAT_SESSION_MAX_SESSIONS = 30;

export function normalizeOpenChatMode(value = '') {
  return String(value || '').trim().toLowerCase() === 'clarify' ? 'clarify' : 'order';
}

export function makeOpenChatSessionId() {
  return `chat_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function openChatSessionTimeLabel(value = '') {
  if (!Number.isFinite(Date.parse(value))) return 'saved';
  return new Date(value).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function fallbackStructuredOrderBriefCheck(value = '') {
  return /(^|\n)\s*(task|goal|work split|deliver|acceptance)\s*:/i.test(String(value || ''));
}

function serializeOpenChatProgressMeta(meta = null) {
  if (!meta || typeof meta !== 'object') return null;
  const states = Array.isArray(meta.states)
    ? meta.states.map((state) => compactChatText(state || '', 40)).filter(Boolean).slice(0, 24)
    : [];
  if (!states.length) return null;
  return {
    kind: compactChatText(meta.kind || '', 40),
    total: Math.max(0, Math.round(Number(meta.total || states.length || 0) || 0)),
    completed: Math.max(0, Math.round(Number(meta.completed || 0) || 0)),
    running: Math.max(0, Math.round(Number(meta.running || 0) || 0)),
    queued: Math.max(0, Math.round(Number(meta.queued || 0) || 0)),
    failed: Math.max(0, Math.round(Number(meta.failed || 0) || 0)),
    blocked: Math.max(0, Math.round(Number(meta.blocked || 0) || 0)),
    percent: Math.max(0, Math.min(100, Math.round(Number(meta.percent || 0) || 0))),
    states,
    overflow: Math.max(0, Math.round(Number(meta.overflow || 0) || 0)),
    route: compactChatText(meta.route || '', 160),
    sideLabel: compactChatText(meta.sideLabel || '', 160),
    note: compactChatText(meta.note || '', 240)
  };
}

export function createOpenChatSessionUtils(options = {}) {
  const productShortName = compactChatText(options.productShortName || 'CAIt', 40) || 'CAIt';
  const getCurrentSessionId = typeof options.getCurrentSessionId === 'function'
    ? options.getCurrentSessionId
    : () => '';
  const isStructuredOrderBrief = typeof options.isStructuredOrderBrief === 'function'
    ? options.isStructuredOrderBrief
    : fallbackStructuredOrderBriefCheck;
  const extractPreparedBriefFromChatText = typeof options.extractPreparedBriefFromChatText === 'function'
    ? options.extractPreparedBriefFromChatText
    : () => '';
  const openChatDecisionBriefKey = typeof options.openChatDecisionBriefKey === 'function'
    ? options.openChatDecisionBriefKey
    : () => '';

  function serializeOpenChatMessageForSession(message = {}) {
    const role = String(message.role || '').trim() === 'user' ? 'user' : 'agent';
    const label = compactChatText(message.label || (role === 'user' ? 'YOU' : productShortName), 80);
    const body = compactChatText(message.fullBody || message.body || '', 5000);
    const tone = ['ok', 'warn', 'error', 'info', 'intro'].includes(String(message.tone || '')) ? String(message.tone) : '';
    const steps = Array.isArray(message.steps)
      ? message.steps.slice(0, 6).map((step) => {
        const label = typeof step === 'string' ? step : step?.label;
        const stepTone = typeof step === 'string' ? 'info' : step?.tone;
        return {
          label: compactChatText(label || '', 80),
          tone: ['ok', 'warn', 'error', 'info'].includes(String(stepTone || '')) ? String(stepTone) : 'info'
        };
      }).filter((step) => step.label)
      : [];
    return {
      role,
      label,
      body,
      fullBody: body,
      tone,
      orderProgressId: compactChatText(message.orderProgressId || '', 120),
      workflowChildDeliveryId: compactChatText(message.workflowChildDeliveryId || '', 180),
      workflowParentId: compactChatText(message.workflowParentId || '', 120),
      deliveryZipForOrderId: compactChatText(message.deliveryZipForOrderId || '', 120),
      orderProgressStatus: compactChatText(message.orderProgressStatus || '', 40),
      pendingDispatch: Boolean(message.pendingDispatch),
      progressMeta: serializeOpenChatProgressMeta(message.progressMeta || null),
      deliveryCard: message.deliveryCard && typeof message.deliveryCard === 'object'
        ? {
          kind: compactChatText(message.deliveryCard.kind || '', 40),
          title: compactChatText(message.deliveryCard.title || '', 120),
          responsibility: compactChatText(message.deliveryCard.responsibility || '', 120),
          taskType: compactChatText(message.deliveryCard.taskType || '', 120),
          summary: compactChatText(message.deliveryCard.summary || '', 600),
          files: deliveryFileNames(message.deliveryCard.files || [], 8)
        }
        : null,
      steps,
      actions: Array.isArray(message.actions)
        ? message.actions.slice(0, 4).map((action) => ({
          action: compactChatText(action?.action || '', 60),
          label: compactChatText(action?.label || '', 80),
          agentId: compactChatText(action?.agentId || '', 120),
          connector: compactChatText(action?.connector || '', 60),
          orderId: compactChatText(action?.orderId || '', 120)
        })).filter((action) => action.action && action.label)
        : [],
      typing: false,
      discussionTurns: []
    };
  }

  function openChatOrderIdsFromText(text = '') {
    const ids = [];
    const seen = new Set();
    const remember = (value = '') => {
      const id = compactChatText(value, 120);
      if (!id || /^(pending|unknown|発行待ち|確定待ち)$/i.test(id)) return;
      if (seen.has(id)) return;
      seen.add(id);
      ids.push(id);
    };
    const body = String(text || '');
    const orderIdPattern = /\bOrder\s*ID\s*[:：]\s*([a-zA-Z0-9][a-zA-Z0-9_-]{5,})/gi;
    let match = orderIdPattern.exec(body);
    while (match) {
      remember(match[1]);
      match = orderIdPattern.exec(body);
    }
    return ids;
  }

  function openChatSessionOrderIdsFromMessages(messages = []) {
    const ids = [];
    const seen = new Set();
    const remember = (value = '') => {
      const id = compactChatText(value, 120);
      if (!id || seen.has(id)) return;
      seen.add(id);
      ids.push(id);
    };
    for (const message of Array.isArray(messages) ? messages : []) {
      remember(message?.orderProgressId || '');
      remember(message?.deliveryZipForOrderId || '');
      remember(message?.workflowParentId || '');
      (Array.isArray(message?.actions) ? message.actions : []).forEach((action) => remember(action?.orderId || ''));
      openChatOrderIdsFromText(message?.fullBody || message?.body || '').forEach(remember);
    }
    return ids;
  }

  function openChatActiveJobIdsFromSession(session = {}) {
    return Array.isArray(session.activeJobIds || session.active_job_ids)
      ? (session.activeJobIds || session.active_job_ids).map((item) => compactChatText(item, 120)).filter(Boolean).slice(0, 24)
      : [];
  }

  function openChatExplicitLinkedOrderId(session = {}) {
    return compactChatText(session.linkedOrderId || session.linked_order_id || session.orderId || session.order_id || '', 120);
  }

  function openChatSessionHasLinkedWork(session = {}, messages = null) {
    const sessionMessages = Array.isArray(messages) ? messages : (Array.isArray(session.messages) ? session.messages : []);
    const activeJobIds = openChatActiveJobIdsFromSession(session);
    const messageOrderIds = openChatSessionOrderIdsFromMessages(sessionMessages);
    const linkedOrderId = openChatExplicitLinkedOrderId(session);
    const activeWork = session.activeWork === true || String(session.activeWork || '').toLowerCase() === 'true';
    return Boolean(linkedOrderId || activeJobIds.length || messageOrderIds.length || activeWork);
  }

  function normalizeOpenChatSession(session = {}) {
    const id = compactChatText(session.id || makeOpenChatSessionId(), 120);
    const messages = Array.isArray(session.messages)
      ? session.messages.slice(-OPEN_CHAT_SESSION_MAX_MESSAGES).map(serializeOpenChatMessageForSession).filter((message) => String(message.body || '').trim())
      : [];
    const updatedAt = Number.isFinite(Date.parse(session.updatedAt || session.savedAt || ''))
      ? new Date(session.updatedAt || session.savedAt).toISOString()
      : new Date().toISOString();
    const createdAt = Number.isFinite(Date.parse(session.createdAt || session.savedAt || ''))
      ? new Date(session.createdAt || session.savedAt).toISOString()
      : updatedAt;
    const titleSource = session.title
      || messages.find((message) => message.role === 'user' && !/^(reset|リセット)$/i.test(String(message.body || '').trim()))?.body
      || session.jobPrompt
      || session.openChatPreparedBrief
      || 'New chat';
    const activeJobIds = openChatActiveJobIdsFromSession(session);
    const messageOrderIds = openChatSessionOrderIdsFromMessages(messages);
    const linkedOrderId = openChatExplicitLinkedOrderId(session) || messageOrderIds[0] || '';
    const hasLinkedWork = openChatSessionHasLinkedWork({ ...session, linkedOrderId, activeJobIds }, messages);
    const rawPreparedBrief = compactChatText(session.openChatPreparedBrief || '', 9000);
    const preparedBrief = hasLinkedWork ? '' : rawPreparedBrief;
    const orderBoundBrief = hasLinkedWork
      ? (rawPreparedBrief || messages.map((message) => extractPreparedBriefFromChatText(message.body || '')).find(Boolean) || '')
      : '';
    return {
      id,
      title: compactChatText(String(titleSource || 'New chat').replace(/\s+/g, ' '), 72) || 'New chat',
      createdAt,
      updatedAt,
      serverManaged: Boolean(session.serverManaged),
      sessionId: compactChatText(session.sessionId || session.session_id || '', 120),
      activeWork: Boolean(session.activeWork),
      activeJobIds,
      linkedOrderId,
      openChatMode: normalizeOpenChatMode(session.openChatMode || 'order'),
      openChatPreparedBrief: preparedBrief,
      openChatParallelPlan: hasLinkedWork ? [] : (Array.isArray(session.openChatParallelPlan) ? session.openChatParallelPlan.slice(0, 8) : []),
      openChatClarifyOptions: hasLinkedWork ? [] : (Array.isArray(session.openChatClarifyOptions) ? session.openChatClarifyOptions.slice(0, 8) : []),
      openChatVagueChoicePrompt: hasLinkedWork ? '' : compactChatText(session.openChatVagueChoicePrompt || '', 2000),
      openChatNaturalChoiceIntent: hasLinkedWork ? '' : compactChatText(session.openChatNaturalChoiceIntent || '', 160),
      openChatIntentShiftPrompt: hasLinkedWork ? '' : compactChatText(session.openChatIntentShiftPrompt || '', 2000),
      openChatIdeaBacklogPrompt: hasLinkedWork ? '' : compactChatText(session.openChatIdeaBacklogPrompt || '', 2000),
      openChatLeaderIntakePrompt: hasLinkedWork ? '' : compactChatText(session.openChatLeaderIntakePrompt || '', 2000),
      openChatLeaderIntakeTask: hasLinkedWork ? '' : compactChatText(session.openChatLeaderIntakeTask || '', 120),
      openChatPendingQuestionPrompt: hasLinkedWork ? '' : compactChatText(session.openChatPendingQuestionPrompt || '', 4000),
      openChatPendingQuestionTask: hasLinkedWork ? '' : compactChatText(session.openChatPendingQuestionTask || '', 120),
      openChatPendingQuestionPattern: hasLinkedWork ? '' : compactChatText(session.openChatPendingQuestionPattern || '', 120),
      openChatLastStatus: compactChatText(session.openChatLastStatus || '', 1000),
      openChatLastStatusTone: ['ok', 'warn', 'error', 'info'].includes(String(session.openChatLastStatusTone || '')) ? session.openChatLastStatusTone : 'info',
      openChatDecisionSuppressedBriefKey: compactChatText(session.openChatDecisionSuppressedBriefKey || openChatDecisionBriefKey(orderBoundBrief), 80),
      jobPrompt: hasLinkedWork ? '' : compactChatText(session.jobPrompt || '', 9000),
      jobUrls: compactChatText(session.jobUrls || '', 5000),
      jobType: hasLinkedWork ? '' : compactChatText(session.jobType || '', 80),
      selectedAgentId: compactChatText(session.selectedAgentId || '', 120),
      messages
    };
  }

  function hasOpenChatSessionPayloadContent(payload = {}) {
    const messages = Array.isArray(payload?.messages) ? payload.messages : [];
    return Boolean(
      messages.length
      || String(payload?.jobPrompt || '').trim()
      || String(payload?.openChatPreparedBrief || '').trim()
    );
  }

  function normalizeOpenChatSessionFingerprintText(value = '') {
    return String(value || '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  function openChatStructuredField(value = '', field = '') {
    const safeField = String(field || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = String(value || '').match(new RegExp(`(?:^|\\n)\\s*${safeField}\\s*:\\s*([^\\n]+)`, 'i'));
    return normalizeOpenChatSessionFingerprintText(
      String(match?.[1] || '').replace(/\s+\b(task|goal|work split|deliver|output language|acceptance)\s*:.*$/i, '')
    );
  }

  function openChatProjectFingerprint(value = '') {
    const text = normalizeOpenChatSessionFingerprintText(value);
    if (!text) return '';
    const task = openChatStructuredField(value, 'task')
      || (text.match(/\b([a-z][a-z0-9_]*_leader|research|teardown|seo_specialist|landing|growth|x_post)\b/)?.[1] || '');
    const domain = text.match(/(?:https?:\/\/)?(?:www\.)?([a-z0-9-]+(?:\.[a-z0-9-]+)+)/i)?.[1]
      || (/\baiagent[-_\s]?marketplace\b/i.test(text) ? 'aiagent-marketplace.net' : '');
    const goal = openChatStructuredField(value, 'goal')
      .replace(/\b(task|goal|work split|deliver|output language|acceptance)\b.*$/i, '')
      .slice(0, 120);
    if (task && domain) return `project:${task}:${domain}`;
    if (domain && /(acquisition|signup|growth|marketing|seo|landing|集客|登録|獲得)/i.test(text)) return `project:growth:${domain}`;
    if (task && goal) return `project:${task}:${goal}`;
    if (task && /(^|\s)(task|goal|goa|work|deliver|order|leader|project|案件|プロジェクト|施策)(\s|:|$)/i.test(text)) return `project:${task}`;
    return '';
  }

  function openChatSessionContentFingerprints(session = {}) {
    const messages = Array.isArray(session.messages) ? session.messages : [];
    const firstUserMessage = messages.find((message) => message?.role === 'user' && String(message?.body || '').trim()) || null;
    const candidates = [
      session.openChatPreparedBrief,
      session.jobPrompt,
      firstUserMessage?.body,
      session.title
    ];
    const keys = new Set();
    for (const candidate of candidates) {
      const raw = String(candidate || '').trim();
      if (!raw) continue;
      const normalized = normalizeOpenChatSessionFingerprintText(raw);
      const structured = isStructuredOrderBrief(raw) || fallbackStructuredOrderBriefCheck(raw);
      if (!structured && normalized.length < 80) continue;
      const projectKey = openChatProjectFingerprint(raw);
      if (projectKey) keys.add(projectKey);
      keys.add(`content:${normalized.slice(0, 1000)}`);
    }
    return keys;
  }

  function openChatSessionIdentityKeys(session = {}) {
    const keys = new Set();
    const id = compactChatText(session.id || '', 120);
    const sessionId = compactChatText(session.sessionId || session.session_id || '', 120);
    const linkedOrderId = compactChatText(session.linkedOrderId || session.linked_order_id || session.orderId || session.order_id || '', 120);
    if (id) keys.add(`id:${id}`);
    if (id.startsWith('job_') && id.length > 4) keys.add(`order:${id.slice(4)}`);
    if (sessionId) keys.add(`session:${sessionId}`);
    if (linkedOrderId) keys.add(`order:${linkedOrderId}`);
    const activeJobIds = Array.isArray(session.activeJobIds || session.active_job_ids)
      ? (session.activeJobIds || session.active_job_ids)
      : [];
    for (const jobId of activeJobIds) {
      const safeJobId = compactChatText(jobId, 120);
      if (safeJobId) keys.add(`order:${safeJobId}`);
    }
    const messages = Array.isArray(session.messages) ? session.messages : [];
    for (const message of messages) {
      const progressOrderId = compactChatText(message?.orderProgressId || '', 120);
      if (progressOrderId) keys.add(`order:${progressOrderId}`);
      const deliveryZipOrderId = compactChatText(message?.deliveryZipForOrderId || '', 120);
      if (deliveryZipOrderId) keys.add(`order:${deliveryZipOrderId}`);
    }
    for (const fingerprint of openChatSessionContentFingerprints(session)) keys.add(fingerprint);
    return keys;
  }

  function findMatchingOpenChatSessionKey(map, incoming = {}) {
    if (!incoming?.id) return '';
    if (map.has(incoming.id)) return incoming.id;
    const incomingKeys = openChatSessionIdentityKeys(incoming);
    for (const [key, existing] of map.entries()) {
      const existingKeys = openChatSessionIdentityKeys(existing);
      for (const identity of incomingKeys) {
        if (existingKeys.has(identity)) return key;
      }
    }
    return '';
  }

  function openChatSessionsShareIdentity(left = {}, right = {}) {
    const leftKeys = openChatSessionIdentityKeys(left);
    const rightKeys = openChatSessionIdentityKeys(right);
    for (const key of leftKeys) {
      if (rightKeys.has(key)) return true;
    }
    return false;
  }

  function mergeOpenChatSessionMessages(existingMessages = [], incomingMessages = []) {
    const merged = [];
    const keyOf = (message = {}) => {
      const progressOrderId = compactChatText(message.orderProgressId || '', 120);
      if (progressOrderId) return `order:${progressOrderId}`;
      const deliveryZipOrderId = compactChatText(message.deliveryZipForOrderId || '', 120);
      if (deliveryZipOrderId) return `delivery_zip:${deliveryZipOrderId}`;
      return [
        compactChatText(message.role || '', 40),
        compactChatText(message.label || '', 80),
        compactChatText(message.body || message.fullBody || '', 900)
      ].join('|');
    };
    for (const rawMessage of [...existingMessages, ...incomingMessages]) {
      const message = serializeOpenChatMessageForSession(rawMessage);
      if (!String(message.body || '').trim()) continue;
      const key = keyOf(message);
      const index = merged.findIndex((item) => keyOf(item) === key);
      if (index >= 0) {
        merged[index] = { ...merged[index], ...message };
      } else {
        merged.push(message);
      }
    }
    return merged.slice(-OPEN_CHAT_SESSION_MAX_MESSAGES);
  }

  function mergeOpenChatSessionRecords(existing = {}, incoming = {}) {
    const existingUpdatedAt = String(existing.updatedAt || '');
    const incomingUpdatedAt = String(incoming.updatedAt || '');
    const preferIncoming = incomingUpdatedAt.localeCompare(existingUpdatedAt) >= 0;
    const base = preferIncoming ? { ...existing, ...incoming } : { ...incoming, ...existing };
    const currentSessionId = compactChatText(getCurrentSessionId() || '', 120);
    const idCandidates = [existing.id, incoming.id].map((value) => compactChatText(value, 120)).filter(Boolean);
    const chosenId = currentSessionId && idCandidates.includes(currentSessionId)
      ? currentSessionId
      : (existing.id || incoming.id);
    let activeJobIds = [...new Set([
      ...(Array.isArray(existing.activeJobIds) ? existing.activeJobIds : []),
      ...(Array.isArray(incoming.activeJobIds) ? incoming.activeJobIds : [])
    ].map((item) => compactChatText(item, 120)).filter(Boolean))].slice(0, 24);
    const incomingClearsActiveWork = preferIncoming
      && !incoming.activeWork
      && Boolean(incoming.linkedOrderId || incoming.orderProgressId)
      && !(Array.isArray(incoming.activeJobIds) && incoming.activeJobIds.length);
    if (incomingClearsActiveWork) {
      const clearedOrderId = compactChatText(incoming.linkedOrderId || incoming.orderProgressId || '', 120);
      activeJobIds = activeJobIds.filter((item) => item !== clearedOrderId);
    }
    return normalizeOpenChatSession({
      ...base,
      id: chosenId,
      createdAt: String(existing.createdAt || '').localeCompare(String(incoming.createdAt || '')) <= 0
        ? (existing.createdAt || incoming.createdAt)
        : (incoming.createdAt || existing.createdAt),
      updatedAt: String(existing.updatedAt || '').localeCompare(String(incoming.updatedAt || '')) > 0
        ? existing.updatedAt
        : incoming.updatedAt,
      serverManaged: Boolean(existing.serverManaged || incoming.serverManaged),
      sessionId: existing.sessionId || incoming.sessionId || '',
      activeWork: incomingClearsActiveWork ? false : Boolean(existing.activeWork || incoming.activeWork),
      activeJobIds,
      linkedOrderId: existing.linkedOrderId || incoming.linkedOrderId || activeJobIds[0] || '',
      messages: mergeOpenChatSessionMessages(existing.messages || [], incoming.messages || [])
    });
  }

  function dedupeOpenChatSessionsForDisplay(sessions = []) {
    const visible = [];
    for (const session of Array.isArray(sessions) ? sessions : []) {
      const existingIndex = visible.findIndex((item) => openChatSessionsShareIdentity(item, session));
      if (existingIndex >= 0) {
        visible[existingIndex] = mergeOpenChatSessionRecords(visible[existingIndex], session);
      } else {
        visible.push(session);
      }
    }
    return visible.sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
  }

  function upsertOpenChatSessionCollection(sessions = [], session = null) {
    const incoming = session ? normalizeOpenChatSession(session) : null;
    const map = new Map();
    for (const item of Array.isArray(sessions) ? sessions : []) {
      if (!item?.id) continue;
      const normalized = normalizeOpenChatSession(item);
      const existingKey = findMatchingOpenChatSessionKey(map, normalized);
      if (existingKey) {
        const existing = map.get(existingKey) || null;
        const merged = mergeOpenChatSessionRecords(existing, normalized);
        map.delete(existingKey);
        map.set(merged.id, merged);
      } else {
        map.set(normalized.id, normalized);
      }
    }
    if (incoming?.id) {
      const existingKey = findMatchingOpenChatSessionKey(map, incoming);
      const existing = existingKey ? map.get(existingKey) : null;
      if (existing) {
        const merged = mergeOpenChatSessionRecords(existing, incoming);
        map.delete(existingKey);
        map.set(merged.id, merged);
      } else {
        map.set(incoming.id, incoming);
      }
    }
    return [...map.values()]
      .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))
      .slice(0, OPEN_CHAT_SESSION_MAX_SESSIONS);
  }

  return {
    normalizeOpenChatMode,
    serializeOpenChatMessageForSession,
    makeOpenChatSessionId,
    openChatOrderIdsFromText,
    openChatSessionOrderIdsFromMessages,
    openChatActiveJobIdsFromSession,
    openChatExplicitLinkedOrderId,
    openChatSessionHasLinkedWork,
    normalizeOpenChatSession,
    hasOpenChatSessionPayloadContent,
    openChatSessionIdentityKeys,
    openChatSessionsShareIdentity,
    dedupeOpenChatSessionsForDisplay,
    mergeOpenChatSessionRecords,
    upsertOpenChatSessionCollection,
    openChatSessionTimeLabel
  };
}
