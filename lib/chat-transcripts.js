import { randomUUID } from 'node:crypto';
import { accountHash } from './account-identity.js';
import { sanitizeConversionNumber, sanitizeConversionString } from './conversion-analytics.js';
import { nowIso } from './events.js';

function normalizeString(value, fallback = '') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

const CHAT_TRANSCRIPT_PROMPT_MAX_CHARS = 1200;
const CHAT_TRANSCRIPT_ANSWER_MAX_CHARS = 1800;
const CHAT_TRANSCRIPT_STATUSES = new Set([
  'accepted',
  'assist',
  'blocked',
  'completed',
  'created',
  'error',
  'failed',
  'info',
  'needs_input',
  'ok',
  'queued',
  'retrying',
  'running',
  'submitted',
  'system',
  'waiting',
  'warn',
  'watching'
]);
const CHAT_TRANSCRIPT_REVIEW_STATUSES = new Set(['new', 'reviewing', 'fixed', 'ignored']);

function redactChatTranscriptText(value = '', maxChars = 1200) {
  const raw = normalizeString(value)
    .replace(/\u0000/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
  if (!raw) return { text: '', redacted: false, originalChars: 0 };
  let text = raw
    .replace(/\bsk-(?:proj-)?[A-Za-z0-9_-]{16,}\b/g, '[redacted_openai_key]')
    .replace(/\bGOCSPX-[A-Za-z0-9_-]{12,}\b/g, '[redacted_google_client_secret]')
    .replace(/\b(?:ghp|gho|ghu|ghs|github_pat)_[A-Za-z0-9_]{16,}\b/g, '[redacted_github_token]')
    .replace(/\b(?:xoxb|xoxp|xoxa)-[A-Za-z0-9-]{16,}\b/g, '[redacted_slack_token]')
    .replace(/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g, '[redacted_aws_key]')
    .replace(/\b(?:Bearer|Basic)\s+[A-Za-z0-9._~+/=-]{16,}\b/gi, '[redacted_auth_header]')
    .replace(/\b(?:api[_-]?key|client[_-]?secret|secret|password|passwd|token)\s*[:=]\s*['"]?[^'"\s,;]{8,}/gi, '$1=[redacted_secret]')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted_email]')
    .replace(/\b(?:\d[ -]*?){13,19}\b/g, '[redacted_number]');
  const redacted = text !== raw;
  if (text.length > maxChars) {
    text = `${text.slice(0, Math.max(0, maxChars - 18)).trimEnd()}\n[truncated]`;
  }
  return { text, redacted: redacted || raw.length > maxChars, originalChars: raw.length };
}

function chatTranscriptTaskType(body = {}) {
  return normalizeString(
    body?.task_type
    || body?.taskType
    || body?.meta?.taskType
    || body?.meta?.task_type
  ).toLowerCase().slice(0, 40);
}

function normalizeChatTranscriptReviewStatus(value = '', fallback = 'new') {
  const text = normalizeString(value, fallback).toLowerCase();
  return CHAT_TRANSCRIPT_REVIEW_STATUSES.has(text) ? text : fallback;
}

function normalizeChatTranscriptStatus(value = '', fallback = 'ok') {
  const text = normalizeString(value)
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
    .slice(0, 80);
  if (CHAT_TRANSCRIPT_STATUSES.has(text)) return text;
  const fallbackText = normalizeString(fallback)
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
    .slice(0, 80);
  if (CHAT_TRANSCRIPT_STATUSES.has(fallbackText)) return fallbackText;
  return 'ok';
}

function sanitizeImprovementText(value = '', max = 1200) {
  return redactChatTranscriptText(value, max).text;
}

function inferredChatTranscriptSessionId(value = '') {
  const raw = normalizeString(value).slice(0, 160);
  if (!raw) return '';
  const match = raw.match(/^(.+)_turn_[a-z0-9]+_\d+$/i);
  if (!match) return '';
  return normalizeString(match[1]).slice(0, 160);
}

export function createChatTranscript(payload = {}, context = {}) {
  const promptRaw = normalizeString(payload?.prompt || payload?.user_prompt || payload?.userPrompt);
  const answerRaw = normalizeString(payload?.answer || payload?.answer_body || payload?.answerBody || payload?.response);
  if (!promptRaw && !answerRaw) {
    return { error: 'prompt or answer is required', statusCode: 400 };
  }
  const prompt = redactChatTranscriptText(promptRaw, CHAT_TRANSCRIPT_PROMPT_MAX_CHARS);
  const answer = redactChatTranscriptText(answerRaw, CHAT_TRANSCRIPT_ANSWER_MAX_CHARS);
  const rawMeta = payload?.meta && typeof payload.meta === 'object' && !Array.isArray(payload.meta) ? payload.meta : {};
  const transcriptId = normalizeString(payload?.id) || `chat_${randomUUID()}`;
  const sessionId = normalizeString(
    payload?.session_id
    || payload?.sessionId
    || rawMeta.sessionId
    || rawMeta.session_id
    || inferredChatTranscriptSessionId(transcriptId)
  ).slice(0, 160);
  const answerKind = sanitizeConversionString(payload?.answer_kind || payload?.answerKind || rawMeta.answerKind || rawMeta.status, 40);
  return {
    id: transcriptId,
    kind: 'work_chat',
    prompt: prompt.text,
    answer: answer.text,
    promptChars: prompt.originalChars,
    answerChars: answer.originalChars,
    redacted: Boolean(prompt.redacted || answer.redacted),
    answerKind,
    status: normalizeChatTranscriptStatus(payload?.status || rawMeta.status, answerKind || 'ok'),
    taskType: chatTranscriptTaskType({ ...payload, meta: rawMeta }),
    source: sanitizeConversionString(payload?.source || rawMeta.source || 'work_chat', 60),
    pagePath: sanitizeConversionString(payload?.page_path || payload?.pagePath || rawMeta.pagePath || '/', 140),
    tab: sanitizeConversionString(payload?.current_tab || payload?.currentTab || rawMeta.tab || 'work', 40),
    sessionId,
    visitorId: sanitizeConversionString(payload?.visitor_id || payload?.visitorId || rawMeta.visitorId, 80),
    loggedIn: Boolean(context?.loggedIn),
    authProvider: sanitizeConversionString(context?.authProvider || 'guest', 40),
    accountHash: accountHash(context?.login || ''),
    urlCount: sanitizeConversionNumber(rawMeta.urlCount || payload?.urlCount || 0),
    fileCount: sanitizeConversionNumber(rawMeta.fileCount || payload?.fileCount || 0),
    fileChars: sanitizeConversionNumber(rawMeta.fileChars || payload?.fileChars || 0),
    reviewStatus: normalizeChatTranscriptReviewStatus(payload?.reviewStatus || payload?.review_status, 'new'),
    expectedHandling: sanitizeImprovementText(payload?.expectedHandling || payload?.expected_handling, 1200),
    improvementNote: sanitizeImprovementText(payload?.improvementNote || payload?.improvement_note, 1200),
    reviewedBy: sanitizeConversionString(payload?.reviewedBy || payload?.reviewed_by, 80),
    reviewedAt: normalizeString(payload?.reviewedAt || payload?.reviewed_at),
    createdAt: normalizeString(payload?.createdAt || payload?.created_at || context?.now, nowIso()),
    updatedAt: normalizeString(payload?.updatedAt || payload?.updated_at || context?.now, nowIso())
  };
}

export function sanitizeChatTranscriptForClient(transcript = {}) {
  const transcriptId = normalizeString(transcript?.id);
  const sessionId = sanitizeConversionString(
    transcript?.sessionId
    || transcript?.session_id
    || inferredChatTranscriptSessionId(transcriptId),
    160
  );
  return {
    id: transcriptId,
    kind: normalizeString(transcript?.kind || 'work_chat'),
    prompt: redactChatTranscriptText(transcript?.prompt || '', CHAT_TRANSCRIPT_PROMPT_MAX_CHARS).text,
    answer: redactChatTranscriptText(transcript?.answer || '', CHAT_TRANSCRIPT_ANSWER_MAX_CHARS).text,
    promptChars: sanitizeConversionNumber(transcript?.promptChars || transcript?.prompt_chars || 0),
    answerChars: sanitizeConversionNumber(transcript?.answerChars || transcript?.answer_chars || 0),
    redacted: Boolean(transcript?.redacted),
    answerKind: sanitizeConversionString(transcript?.answerKind || transcript?.answer_kind, 40),
    status: sanitizeConversionString(transcript?.status, 80),
    taskType: sanitizeConversionString(transcript?.taskType || transcript?.task_type, 40),
    source: sanitizeConversionString(transcript?.source || 'work_chat', 60),
    pagePath: sanitizeConversionString(transcript?.pagePath || transcript?.page_path || '/', 140),
    tab: sanitizeConversionString(transcript?.tab || 'work', 40),
    sessionId,
    visitorId: sanitizeConversionString(transcript?.visitorId || transcript?.visitor_id, 80).slice(0, 16),
    loggedIn: Boolean(transcript?.loggedIn || transcript?.logged_in),
    authProvider: sanitizeConversionString(transcript?.authProvider || transcript?.auth_provider || 'guest', 40),
    accountHash: sanitizeConversionString(transcript?.accountHash || transcript?.account_hash, 40),
    urlCount: sanitizeConversionNumber(transcript?.urlCount || transcript?.url_count || 0),
    fileCount: sanitizeConversionNumber(transcript?.fileCount || transcript?.file_count || 0),
    fileChars: sanitizeConversionNumber(transcript?.fileChars || transcript?.file_chars || 0),
    reviewStatus: normalizeChatTranscriptReviewStatus(transcript?.reviewStatus || transcript?.review_status, 'new'),
    expectedHandling: sanitizeImprovementText(transcript?.expectedHandling || transcript?.expected_handling, 1200),
    improvementNote: sanitizeImprovementText(transcript?.improvementNote || transcript?.improvement_note, 1200),
    reviewedBy: sanitizeConversionString(transcript?.reviewedBy || transcript?.reviewed_by, 80),
    reviewedAt: normalizeString(transcript?.reviewedAt || transcript?.reviewed_at),
    createdAt: normalizeString(transcript?.createdAt || transcript?.created_at || transcript?.ts),
    updatedAt: normalizeString(transcript?.updatedAt || transcript?.updated_at || transcript?.createdAt || transcript?.created_at)
  };
}

export function chatTranscriptsForClient(state = {}, limit = 100) {
  const safeLimit = Math.max(1, Math.min(500, Number(limit || 100) || 100));
  return (Array.isArray(state?.chatTranscripts) ? state.chatTranscripts : [])
    .map((transcript) => sanitizeChatTranscriptForClient(transcript))
    .filter((transcript) => transcript.id && (transcript.prompt || transcript.answer))
    .sort((left, right) => String(right.createdAt || '').localeCompare(String(left.createdAt || '')))
    .slice(0, safeLimit);
}

function chatTranscriptLanguage(transcript = {}) {
  const text = `${transcript.prompt || ''}\n${transcript.answer || ''}`;
  return /[\u3040-\u30ff]/.test(text) ? 'Japanese' : 'English';
}

export function chatTrainingExamplesForClient(state = {}, limit = 200) {
  const safeLimit = Math.max(1, Math.min(500, Number(limit || 200) || 200));
  return chatTranscriptsForClient(state, 500)
    .filter((transcript) => transcript.reviewStatus === 'fixed')
    .filter((transcript) => transcript.prompt && (transcript.expectedHandling || transcript.answer))
    .map((transcript) => {
      const target = transcript.expectedHandling || transcript.answer;
      return {
        id: transcript.id,
        schema: 'cait-chat-training/v1',
        purpose: 'Improve CAIt Work Chat intent handling, clarification, routing, and pre-order UX.',
        source: transcript.source || 'work_chat',
        includesOpenAiApiOutput: String(transcript.source || '') === 'work_chat:openai',
        language: chatTranscriptLanguage(transcript),
        reviewStatus: transcript.reviewStatus,
        reviewedBy: transcript.reviewedBy || '',
        reviewedAt: transcript.reviewedAt || '',
        createdAt: transcript.createdAt || '',
        labels: {
          answerKind: transcript.answerKind || '',
          taskType: transcript.taskType || '',
          status: transcript.status || '',
          redacted: Boolean(transcript.redacted),
          loggedIn: Boolean(transcript.loggedIn),
          authProvider: transcript.authProvider || 'guest',
          urlCount: transcript.urlCount || 0,
          fileCount: transcript.fileCount || 0
        },
        input: {
          prompt: transcript.prompt
        },
        observedOutput: {
          answer: transcript.answer
        },
        targetOutput: {
          expectedHandling: target,
          improvementNote: transcript.improvementNote || ''
        },
        messages: [
          { role: 'user', content: transcript.prompt },
          { role: 'assistant', content: target }
        ]
      };
    })
    .slice(0, safeLimit);
}

export function updateChatTranscriptReviewInState(state = {}, transcriptId = '', patch = {}, reviewer = {}) {
  const safeId = normalizeString(transcriptId);
  if (!safeId) return null;
  if (!Array.isArray(state.chatTranscripts)) state.chatTranscripts = [];
  const index = state.chatTranscripts.findIndex((item) => normalizeString(item?.id) === safeId);
  if (index === -1) return null;
  const existing = sanitizeChatTranscriptForClient(state.chatTranscripts[index]);
  const nextStatus = normalizeChatTranscriptReviewStatus(patch.reviewStatus || patch.review_status || patch.status, existing.reviewStatus || 'new');
  const now = nowIso();
  const updated = {
    ...state.chatTranscripts[index],
    reviewStatus: nextStatus,
    expectedHandling: sanitizeImprovementText(
      patch.expectedHandling ?? patch.expected_handling ?? existing.expectedHandling,
      1200
    ),
    improvementNote: sanitizeImprovementText(
      patch.improvementNote ?? patch.improvement_note ?? patch.note ?? existing.improvementNote,
      1200
    ),
    reviewedBy: sanitizeConversionString(reviewer?.login || reviewer?.reviewedBy || existing.reviewedBy, 80),
    reviewedAt: now,
    updatedAt: now
  };
  state.chatTranscripts[index] = updated;
  return sanitizeChatTranscriptForClient(updated);
}
