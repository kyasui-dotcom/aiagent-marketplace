import { SAMPLE_AGENT_DEFINITIONS } from './builtin-agents/agents/index.js';
import { accountHash } from './account-identity.js';
import { nowIso } from './events.js';
import {
  orderChatMemoryCompressedAnswer,
  orderChatMemoryConversationPrompt,
  orderChatMemoryStatusLabel
} from './chat-order-memory.js';
import {
  chatTranscriptsForClient,
  sanitizeChatTranscriptForClient
} from './chat-transcripts.js';

const CHAT_MEMORY_PROMPT_MAX_CHARS = 1200;
const CHAT_MEMORY_ANSWER_MAX_CHARS = 1800;

function normalizeString(value, fallback = '') {
  return String(value ?? fallback).trim();
}

function taskAliasToken(value = '') {
  return String(value || '')
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function defaultNormalizeTaskTypeAlias(taskType = '') {
  return taskAliasToken(taskType);
}

function chatMemoryDeps(deps = {}) {
  return {
    accountSettingsForLogin: typeof deps.accountSettingsForLogin === 'function'
      ? deps.accountSettingsForLogin
      : () => null,
    jobsVisibleToLogin: typeof deps.jobsVisibleToLogin === 'function'
      ? deps.jobsVisibleToLogin
      : () => [],
    chatSessionIdForJob: typeof deps.chatSessionIdForJob === 'function'
      ? deps.chatSessionIdForJob
      : () => '',
    upsertAccountSettingsInState: typeof deps.upsertAccountSettingsInState === 'function'
      ? deps.upsertAccountSettingsInState
      : null,
    normalizeTaskTypeAlias: typeof deps.normalizeTaskTypeAlias === 'function'
      ? deps.normalizeTaskTypeAlias
      : defaultNormalizeTaskTypeAlias
  };
}

export function inferredChatMemorySessionId(value = '') {
  const raw = normalizeString(value).slice(0, 160);
  if (!raw) return '';
  const match = raw.match(/^(.+)_turn_[a-z0-9]+_\d+$/i);
  if (!match) return '';
  return normalizeString(match[1]).slice(0, 160);
}

function chatMemorySessionPromptKey(value = '') {
  const text = normalizeString(value).replace(/\s+/g, ' ').trim().toLowerCase();
  if (!text) return '';
  const structured = /(^|\n)\s*(task|goal|work split|deliver|acceptance)\s*:/i.test(String(value || ''));
  if (!structured && text.length < 80) return '';
  return `prompt:${text.slice(0, 1000)}`;
}

function chatMemoryPromptKey(value = '') {
  return normalizeString(value).replace(/\s+/g, ' ').trim().toLowerCase().slice(0, 1000);
}

function chatMemoryStructuredField(value = '', field = '') {
  const safeField = String(field || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = String(value || '').match(new RegExp(`(?:^|\\n)\\s*${safeField}\\s*:\\s*([^\\n]+)`, 'i'));
  return normalizeString(match?.[1] || '')
    .replace(/\s+\b(task|goal|work split|deliver|output language|acceptance)\s*:.*$/i, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function chatMemoryProjectKey(value = '', deps = {}) {
  const text = normalizeString(value).replace(/\s+/g, ' ').trim().toLowerCase();
  if (!text) return '';
  const structuredTask = deps.normalizeTaskTypeAlias(chatMemoryStructuredField(value, 'task'), text);
  const inferredTask = (text.match(/\b[a-z][a-z0-9_]{2,}\b/g) || [])
    .map((token) => deps.normalizeTaskTypeAlias(token, text))
    .find((task) => task && (task.endsWith('_leader') || SAMPLE_AGENT_DEFINITIONS[task]));
  const task = structuredTask || inferredTask || '';
  const domain = text.match(/(?:https?:\/\/)?(?:www\.)?([a-z0-9-]+(?:\.[a-z0-9-]+)+)/i)?.[1]
    || (/\baiagent[-_\s]?marketplace\b/i.test(text) ? 'aiagent-marketplace.net' : '');
  const goal = chatMemoryStructuredField(value, 'goal')
    .replace(/\b(task|goal|work split|deliver|output language|acceptance)\b.*$/i, '')
    .slice(0, 120);
  if (task && domain) return `project:${task}:${domain}`;
  if (domain && /(acquisition|signup|growth|marketing|seo|landing|集客|登録|獲得)/i.test(text)) return `project:growth:${domain}`;
  if (task && goal) return `project:${task}:${goal}`;
  if (task && /(^|\s)(task|goal|goa|work|deliver|order|leader|project|案件|プロジェクト|施策)(\s|:|$)/i.test(text)) return `project:${task}`;
  return '';
}

export function normalizeChatMemoryHiddenId(value = '') {
  return normalizeString(value).replace(/^server_/, '').slice(0, 140);
}

export function normalizeChatMemoryHiddenIds(value = []) {
  const source = Array.isArray(value) ? value : [];
  const seen = new Set();
  const ids = [];
  for (const raw of source) {
    const id = normalizeChatMemoryHiddenId(raw);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids.slice(-500);
}

function chatMemoryHiddenIdsHas(hiddenIds = new Set(), value = '') {
  const id = normalizeChatMemoryHiddenId(value);
  return Boolean(id && hiddenIds.has(id));
}

export function normalizeChatMemoryPatch(patch = {}, base = {}) {
  const patchIds = patch.hiddenTranscriptIds || patch.hiddenIds || patch.hidden_chat_memory_ids || patch.hiddenChatMemoryIds;
  const baseIds = base.hiddenTranscriptIds || base.hiddenIds || base.hidden_chat_memory_ids || base.hiddenChatMemoryIds;
  return {
    hiddenTranscriptIds: normalizeChatMemoryHiddenIds(Array.isArray(patchIds) ? patchIds : baseIds)
  };
}

function cleanupOrderPromptForChatMemory(value = '') {
  return normalizeString(value)
    .replace(/^\s*(task|goal|work split|deliver|acceptance)\s*:\s*/gim, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function chatMemoryTranscriptHideKeys(transcript = {}, deps = {}) {
  const item = sanitizeChatTranscriptForClient(transcript);
  const combinedPrompt = `${item.prompt || ''}\n${item.answer || ''}`;
  const keys = [
    item.id,
    item.sessionId,
    inferredChatMemorySessionId(item.id),
    chatMemoryProjectKey(combinedPrompt, deps),
    chatMemorySessionPromptKey(item.prompt),
    chatMemoryPromptKey(item.prompt) ? `exact:${chatMemoryPromptKey(item.prompt)}` : '',
    `legacy:${String(item.prompt || '').trim()}::${String(item.answer || '').trim()}`
  ];
  return normalizeChatMemoryHiddenIds(keys);
}

export function ownChatMemoryForClient(state = {}, login = '', limit = 20, rawDeps = {}) {
  const deps = chatMemoryDeps(rawDeps);
  const safeLimit = Math.max(1, Math.min(200, Number(limit || 20) || 20));
  const hash = accountHash(login || '');
  if (!hash) return [];
  const account = deps.accountSettingsForLogin(state, login);
  const hiddenTranscriptIds = new Set(normalizeChatMemoryPatch(account?.chatMemory || {}).hiddenTranscriptIds);
  const transcripts = chatTranscriptsForClient(state, 500)
    .filter((transcript) => transcript.accountHash === hash)
    .filter((transcript) => !chatMemoryHiddenIdsHas(hiddenTranscriptIds, transcript.id) && !chatMemoryHiddenIdsHas(hiddenTranscriptIds, transcript.sessionId))
    .sort((left, right) => String(right.createdAt || '').localeCompare(String(left.createdAt || '')));
  const grouped = new Map();
  const groupedPromptKeys = new Map();
  const groupedTurns = new Map();
  const setGroupedChatMemory = (key = '', item = {}) => {
    if (!key) return;
    grouped.set(key, item);
    const projectKey = chatMemoryProjectKey(`${item?.prompt || ''}\n${item?.answer || ''}`, deps);
    const sessionPromptKey = chatMemorySessionPromptKey(item?.prompt || '');
    const exactPromptKey = chatMemoryPromptKey(item?.prompt || '');
    if (projectKey) groupedPromptKeys.set(projectKey, key);
    if (sessionPromptKey) groupedPromptKeys.set(sessionPromptKey, key);
    if (exactPromptKey) groupedPromptKeys.set(`exact:${exactPromptKey}`, key);
  };
  const findExistingChatMemoryKeyByPrompt = (prompt = '') => {
    const projectKey = chatMemoryProjectKey(prompt, deps);
    if (projectKey && groupedPromptKeys.has(projectKey)) return groupedPromptKeys.get(projectKey);
    const sessionPromptKey = chatMemorySessionPromptKey(prompt);
    if (sessionPromptKey && groupedPromptKeys.has(sessionPromptKey)) return groupedPromptKeys.get(sessionPromptKey);
    if (sessionPromptKey && grouped.has(sessionPromptKey)) return sessionPromptKey;
    const target = chatMemoryPromptKey(prompt);
    if (!target) return '';
    if (groupedPromptKeys.has(`exact:${target}`)) return groupedPromptKeys.get(`exact:${target}`);
    for (const [key, item] of grouped.entries()) {
      if (chatMemoryPromptKey(item?.prompt || '') === target) return key;
    }
    return '';
  };
  const appendGroupedTurn = (key = '', transcript = {}) => {
    if (!key) return;
    const turns = groupedTurns.get(key) || [];
    turns.push({
      prompt: normalizeString(transcript.prompt).slice(0, CHAT_MEMORY_PROMPT_MAX_CHARS),
      answer: normalizeString(transcript.answer).slice(0, CHAT_MEMORY_ANSWER_MAX_CHARS),
      answerKind: normalizeString(transcript.answerKind || transcript.answer_kind),
      status: normalizeString(transcript.status),
      createdAt: normalizeString(transcript.createdAt || transcript.created_at || nowIso()),
      updatedAt: normalizeString(transcript.updatedAt || transcript.updated_at || transcript.createdAt || transcript.created_at || nowIso())
    });
    groupedTurns.set(key, turns.slice(-80));
  };
  for (const transcript of transcripts) {
    const combinedPrompt = `${transcript.prompt || ''}\n${transcript.answer || ''}`;
    const fallbackKey = chatMemoryProjectKey(combinedPrompt, deps) || chatMemorySessionPromptKey(transcript.prompt) || `legacy:${String(transcript.prompt || '').trim()}::${String(transcript.answer || '').trim()}`;
    const existingPromptKey = findExistingChatMemoryKeyByPrompt(combinedPrompt);
    const groupKey = existingPromptKey || fallbackKey || String(transcript.sessionId || '').trim();
    if ([transcript.id, transcript.sessionId, existingPromptKey, fallbackKey, groupKey].some((id) => chatMemoryHiddenIdsHas(hiddenTranscriptIds, id))) continue;
    appendGroupedTurn(groupKey, transcript);
    if (grouped.has(groupKey)) continue;
    setGroupedChatMemory(groupKey, {
      id: transcript.sessionId || transcript.id,
      prompt: transcript.prompt,
      answer: transcript.answer,
      answerKind: transcript.answerKind,
      taskType: transcript.taskType,
      status: transcript.status,
      redacted: transcript.redacted,
      createdAt: transcript.createdAt,
      updatedAt: transcript.updatedAt || transcript.createdAt,
      sessionId: transcript.sessionId || ''
    });
  }
  const openStatuses = new Set(['queued', 'claimed', 'running', 'dispatched', 'accepted', 'blocked', 'action_required', 'needs_action', 'approval_required', 'connector_required', 'blocked_waiting_for_approval', 'needs_input']);
  const terminalStatuses = new Set(['completed', 'failed', 'timed_out']);
  const visibleJobs = deps.jobsVisibleToLogin(state, login, { account });
  const activeRootJobs = visibleJobs
    .filter((job) => normalizeString(job?.jobKind || 'job').toLowerCase() !== 'workflow_child')
    .sort((left, right) => {
      const leftTs = normalizeString(left?.lastCallbackAt || left?.startedAt || left?.dispatchedAt || left?.createdAt);
      const rightTs = normalizeString(right?.lastCallbackAt || right?.startedAt || right?.dispatchedAt || right?.createdAt);
      const diff = rightTs.localeCompare(leftTs);
      if (diff !== 0) return diff;
      return normalizeString(right?.id).localeCompare(normalizeString(left?.id));
    });
  for (const job of activeRootJobs) {
    const explicitSessionId = deps.chatSessionIdForJob(job);
    const fallbackJobId = normalizeString(job?.id).slice(0, 160);
    if (!fallbackJobId) continue;
    const memoryId = explicitSessionId || `job_${fallbackJobId}`;
    if ([explicitSessionId, fallbackJobId, `job_${fallbackJobId}`, memoryId].some((id) => chatMemoryHiddenIdsHas(hiddenTranscriptIds, id))) continue;
    const prompt = normalizeString(job?.prompt).slice(0, CHAT_MEMORY_PROMPT_MAX_CHARS);
    const displayPrompt = typeof orderChatMemoryConversationPrompt === 'function'
      ? (orderChatMemoryConversationPrompt(job) || prompt)
      : (cleanupOrderPromptForChatMemory(job?.prompt) || prompt);
    if (!prompt) continue;
    const displayPromptKey = chatMemoryPromptKey(displayPrompt);
    const promptHideKeys = normalizeChatMemoryHiddenIds([
      chatMemoryProjectKey(displayPrompt, deps),
      chatMemorySessionPromptKey(displayPrompt),
      displayPromptKey ? `exact:${displayPromptKey}` : ''
    ]);
    if (promptHideKeys.some((id) => chatMemoryHiddenIdsHas(hiddenTranscriptIds, id))) continue;
    const relatedActiveJobIds = visibleJobs
      .filter((item) => openStatuses.has(normalizeString(item?.status).toLowerCase()))
      .filter((item) => normalizeString(item?.id) === fallbackJobId || normalizeString(item?.workflowParentId) === fallbackJobId)
      .map((item) => normalizeString(item?.id))
      .filter(Boolean);
    if (relatedActiveJobIds.some((id) => chatMemoryHiddenIdsHas(hiddenTranscriptIds, id) || chatMemoryHiddenIdsHas(hiddenTranscriptIds, `job_${id}`))) continue;
    const status = normalizeString(job?.status, 'running').toLowerCase() || 'running';
    const statusLabel = orderChatMemoryStatusLabel(status);
    const updatedAt = normalizeString(job?.lastCallbackAt || job?.startedAt || job?.dispatchedAt || job?.createdAt, nowIso());
    const fallbackMemoryKey = findExistingChatMemoryKeyByPrompt(displayPrompt);
    const targetMemoryId = fallbackMemoryKey || memoryId;
    if ([fallbackMemoryKey, targetMemoryId].some((id) => chatMemoryHiddenIdsHas(hiddenTranscriptIds, id))) continue;
    const existing = grouped.get(targetMemoryId) || grouped.get(memoryId) || null;
    setGroupedChatMemory(targetMemoryId, {
      ...(existing || {}),
      id: existing?.id || targetMemoryId,
      prompt: existing?.prompt || displayPrompt,
      answer: existing?.answer || orderChatMemoryCompressedAnswer(job, statusLabel),
      answerKind: existing?.answerKind || 'order',
      taskType: existing?.taskType || normalizeString(job?.taskType),
      status,
      redacted: Boolean(existing?.redacted),
      createdAt: existing?.createdAt || normalizeString(job?.createdAt, updatedAt),
      updatedAt: existing?.updatedAt && String(existing.updatedAt).localeCompare(updatedAt) > 0 ? existing.updatedAt : updatedAt,
      sessionId: existing?.sessionId || explicitSessionId || '',
      activeWork: !terminalStatuses.has(status),
      activeJobIds: [...new Set([
        ...(Array.isArray(existing?.activeJobIds) ? existing.activeJobIds.map((item) => normalizeString(item)).filter(Boolean) : []),
        ...relatedActiveJobIds
      ])],
      relatedOrderIds: [...new Set([
        ...(Array.isArray(existing?.relatedOrderIds) ? existing.relatedOrderIds.map((item) => normalizeString(item)).filter(Boolean) : []),
        existing?.linkedOrderId || '',
        fallbackJobId
      ].filter(Boolean))],
      linkedOrderId: existing?.linkedOrderId || fallbackJobId
    });
  }
  return [...grouped.entries()].map(([key, item]) => {
    const turns = (groupedTurns.get(key) || [])
      .sort((left, right) => String(left.createdAt || '').localeCompare(String(right.createdAt || '')));
    const messages = [];
    for (const turn of turns) {
      const prompt = normalizeString(turn.prompt);
      const answer = normalizeString(turn.answer);
      if (prompt && messages[messages.length - 1]?.role !== 'user') {
        messages.push({ role: 'user', body: prompt, ts: turn.createdAt });
      } else if (prompt && messages[messages.length - 1]?.role === 'user' && messages[messages.length - 1]?.body !== prompt) {
        messages.push({ role: 'user', body: prompt, ts: turn.createdAt });
      }
      if (answer) {
        messages.push({
          role: 'assistant',
          body: answer,
          tone: turn.status || turn.answerKind || '',
          label: turn.answerKind || '',
          ts: turn.updatedAt || turn.createdAt
        });
      }
    }
    return {
      ...item,
      ...(messages.length ? { messages: messages.slice(-80) } : {})
    };
  }).slice(0, safeLimit);
}

export function hideChatMemoryTranscriptForLoginInState(state, login, transcriptId, user = null, authProvider = 'guest', options = {}, rawDeps = {}) {
  const deps = chatMemoryDeps(rawDeps);
  const safeLogin = normalizeString(login).toLowerCase();
  const safeTranscriptId = normalizeChatMemoryHiddenId(transcriptId).slice(0, 160);
  const extraHiddenIds = normalizeChatMemoryHiddenIds([
    ...(Array.isArray(options.extraHiddenIds) ? options.extraHiddenIds : []),
    ...(Array.isArray(options.extraIds) ? options.extraIds : [])
  ]);
  if (!safeLogin || (!safeTranscriptId && !extraHiddenIds.length) || !deps.upsertAccountSettingsInState) return null;
  const account = deps.accountSettingsForLogin(state, safeLogin, user, authProvider);
  const hash = accountHash(safeLogin);
  const accountTranscripts = (Array.isArray(state?.chatTranscripts) ? state.chatTranscripts : [])
    .map((item) => sanitizeChatTranscriptForClient(item))
    .filter((item) => !hash || item.accountHash === hash)
    .filter((item) => normalizeString(item?.id) || normalizeString(item?.sessionId))
    .map((item) => ({
      item,
      keys: chatMemoryTranscriptHideKeys(item, deps)
    }));
  const targetKeys = new Set(normalizeChatMemoryHiddenIds([
    safeTranscriptId,
    ...extraHiddenIds,
    ...accountTranscripts
      .filter(({ keys }) => keys.some((key) => key === safeTranscriptId || extraHiddenIds.includes(key)))
      .flatMap(({ keys }) => keys)
  ]));
  let expanded = true;
  while (expanded) {
    expanded = false;
    for (const { keys } of accountTranscripts) {
      if (!keys.some((key) => targetKeys.has(key))) continue;
      for (const key of keys) {
        if (!key || targetKeys.has(key)) continue;
        targetKeys.add(key);
        expanded = true;
      }
    }
  }
  const matchingTranscriptIds = accountTranscripts
    .filter(({ keys }) => keys.some((key) => targetKeys.has(key)))
    .flatMap(({ item, keys }) => [item.id, item.sessionId, ...keys])
    .map((item) => normalizeString(item))
    .filter(Boolean);
  const hiddenTranscriptIds = normalizeChatMemoryHiddenIds([
    ...(account?.chatMemory?.hiddenTranscriptIds || []),
    safeTranscriptId,
    ...extraHiddenIds,
    ...targetKeys,
    ...matchingTranscriptIds
  ]);
  const updated = deps.upsertAccountSettingsInState(state, safeLogin, user, authProvider, {
    chatMemory: {
      ...(account.chatMemory || {}),
      hiddenTranscriptIds
    }
  });
  return {
    account: updated,
    transcriptId: safeTranscriptId || extraHiddenIds[0] || '',
    hiddenCount: hiddenTranscriptIds.length
  };
}
