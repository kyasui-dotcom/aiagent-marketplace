import { accountHash } from './account-identity.js';

const CONVERSION_EVENT_LABELS = {
  page_view: 'Page view',
  work_chat_opened: 'Work Chat opened',
  chat_message_sent: 'Chat message sent',
  chat_answered: 'Chat answered without order',
  draft_order_created: 'Draft order prepared',
  sign_in_required_shown: 'Sign-in requirement shown',
  email_login_started: 'Email login started',
  email_login_completed: 'Email login completed',
  email_login_failed: 'Email login failed',
  google_login_started: 'Google login started',
  google_login_completed: 'Google login completed',
  google_login_failed: 'Google login failed',
  github_login_started: 'GitHub login started',
  github_login_completed: 'GitHub login completed',
  github_login_failed: 'GitHub login failed',
  signup_completed: 'Member registration completed',
  payment_required_shown: 'Payment requirement shown',
  intake_questions_shown: 'Clarifying questions shown',
  order_created: 'Order created',
  agent_catalog_opened: 'Agent catalog opened',
  agent_publish_started: 'Agent publishing started',
  github_repos_loaded: 'GitHub repos loaded',
  manifest_generated: 'Manifest draft generated',
  adapter_pr_created: 'Adapter PR created',
  agent_imported: 'Agent imported',
  agent_verified: 'Agent verified',
  open_chat_intent_classified: 'Open Chat intent classified',
  open_chat_intent_failed: 'Open Chat intent classification failed',
  open_chat_llm_fallback_recommended: 'Open Chat LLM fallback recommended',
  flex_tool_shown: 'Flexible UI tool shown',
  flex_tool_hidden: 'Flexible UI tool hidden',
  flex_tool_action_clicked: 'Flexible UI tool action clicked',
  flex_tool_reaction: 'Flexible UI tool reaction',
  flex_tool_instruction_added: 'Flexible UI instruction added',
  feedback_submitted: 'Feedback submitted'
};

const CONVERSION_EVENT_NAMES = new Set(Object.keys(CONVERSION_EVENT_LABELS));
const CONVERSION_META_STRING_KEYS = new Set([
  'source',
  'action',
  'section',
  'tab',
  'pagePath',
  'taskType',
  'orderStrategy',
  'resolvedStrategy',
  'mode',
  'status',
  'agentId',
  'agentSource',
  'toolId',
  'toolTitle',
  'trigger',
  'actionLabel',
  'answerKind',
  'patternId',
  'llmProvider',
  'responseSource',
  'intent',
  'traffic_type',
  'trafficType',
  'trafic_type'
]);
const CONVERSION_META_NUMBER_KEYS = new Set([
  'promptChars',
  'urlCount',
  'fileCount',
  'fileChars',
  'draftCount',
  'successCount',
  'failureCount',
  'candidateCount',
  'priority',
  'confidence'
]);
const CONVERSION_META_BOOLEAN_KEYS = new Set(['agentPinned', 'silent', 'userDismissed', 'helpful']);

function nowIso() {
  return new Date().toISOString();
}

function normalizeString(value, fallback = '') {
  return String(value ?? fallback).trim();
}

export function normalizeConversionEventName(value = '') {
  return normalizeString(value)
    .toLowerCase()
    .replace(/[^a-z0-9_:-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64);
}

export function conversionEventLabel(eventName = '') {
  const event = normalizeConversionEventName(eventName);
  return CONVERSION_EVENT_LABELS[event] || event || 'Conversion event';
}

export function sanitizeConversionString(value = '', max = 140) {
  return normalizeString(value)
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .slice(0, max);
}

export function sanitizeConversionNumber(value = 0, max = 1_000_000) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(max, Math.round(n)));
}

export function createConversionEventPayload(body = {}, context = {}) {
  const event = normalizeConversionEventName(body?.event || body?.name || body?.type);
  if (!CONVERSION_EVENT_NAMES.has(event)) {
    return { error: 'Unsupported analytics event', statusCode: 400 };
  }
  const rawMeta = body?.meta && typeof body.meta === 'object' && !Array.isArray(body.meta)
    ? body.meta
    : {};
  const meta = {
    kind: 'conversion',
    event,
    label: conversionEventLabel(event),
    visitorId: sanitizeConversionString(body?.visitor_id || body?.visitorId || rawMeta.visitorId, 80),
    pagePath: sanitizeConversionString(body?.page_path || body?.pagePath || rawMeta.pagePath || '/', 140),
    tab: sanitizeConversionString(body?.current_tab || body?.currentTab || rawMeta.tab, 40),
    source: sanitizeConversionString(body?.source || rawMeta.source || 'web', 60),
    loggedIn: Boolean(context?.loggedIn),
    authProvider: sanitizeConversionString(context?.authProvider || 'guest', 40),
    accountHash: accountHash(context?.login || '')
  };
  const trafficType = sanitizeConversionString(
    body?.traffic_type
    || body?.trafficType
    || body?.trafic_type
    || rawMeta.traffic_type
    || rawMeta.trafficType
    || rawMeta.trafic_type,
    40
  );
  if (trafficType) {
    meta.traffic_type = trafficType;
    meta.trafic_type = trafficType;
  }
  for (const key of CONVERSION_META_STRING_KEYS) {
    if (rawMeta[key] !== undefined) meta[key] = sanitizeConversionString(rawMeta[key], key === 'pagePath' ? 140 : 80);
  }
  for (const key of CONVERSION_META_NUMBER_KEYS) {
    if (rawMeta[key] !== undefined) meta[key] = sanitizeConversionNumber(rawMeta[key]);
  }
  for (const key of CONVERSION_META_BOOLEAN_KEYS) {
    if (rawMeta[key] !== undefined) meta[key] = rawMeta[key] === true || rawMeta[key] === 'true' || rawMeta[key] === 1;
  }
  return {
    event,
    message: `conversion ${event}`,
    meta
  };
}

function eventTimestampMs(value = {}) {
  const raw = value?.ts || value?.createdAt || value?.created_at || value?.createdAtIso || '';
  const ms = Date.parse(raw);
  return Number.isFinite(ms) ? ms : 0;
}

function isWithinDays(value = {}, days = 1, nowMs = Date.now()) {
  const ms = eventTimestampMs(value);
  return Boolean(ms && nowMs - ms <= days * 24 * 60 * 60 * 1000);
}

function actualCreatedAtMs(value = {}) {
  const raw = value?.createdAt || value?.created_at || value?.ts || value?.updatedAt || '';
  const ms = Date.parse(raw);
  return Number.isFinite(ms) ? ms : 0;
}

export function countRecentActuals(items = [], days = 1, nowMs = Date.now()) {
  return (Array.isArray(items) ? items : []).filter((item) => {
    const ms = actualCreatedAtMs(item);
    return Boolean(ms && nowMs - ms <= days * 24 * 60 * 60 * 1000);
  }).length;
}

function isUserPublishedAgent(agent = {}) {
  const owner = normalizeString(agent?.owner || agent?.login).toLowerCase();
  if (!owner) return false;
  if (agent?.sample || agent?.source === 'sample-agent') return false;
  return !['aiagent2', 'ai agent marketplace', 'system', 'cait-samples', 'sample-agent'].includes(owner);
}

export function buildConversionAnalytics(state = {}) {
  const nowMs = Date.now();
  const events = (Array.isArray(state.events) ? state.events : [])
    .filter((event) => String(event?.type || '').toUpperCase() === 'TRACK' && event?.meta?.kind === 'conversion')
    .sort((a, b) => eventTimestampMs(b) - eventTimestampMs(a));
  const accounts = Array.isArray(state.accounts) ? state.accounts : [];
  const jobs = Array.isArray(state.jobs) ? state.jobs : [];
  const userAgents = (Array.isArray(state.agents) ? state.agents : []).filter(isUserPublishedAgent);
  const statsForEvent = (eventName) => {
    const scoped = events.filter((event) => event?.meta?.event === eventName);
    const uniqueVisitors = new Set(scoped.map((event) => event?.meta?.visitorId || event?.meta?.accountHash || '').filter(Boolean));
    const last = scoped[0] || null;
    return {
      event: eventName,
      label: conversionEventLabel(eventName),
      total: scoped.length,
      last24h: scoped.filter((event) => isWithinDays(event, 1, nowMs)).length,
      last7d: scoped.filter((event) => isWithinDays(event, 7, nowMs)).length,
      uniqueVisitors: uniqueVisitors.size,
      lastSeenAt: last?.ts || last?.createdAt || ''
    };
  };
  return {
    generatedAt: nowIso(),
    actuals: {
      accounts: {
        total: accounts.length,
        last24h: countRecentActuals(accounts, 1, nowMs),
        last7d: countRecentActuals(accounts, 7, nowMs)
      },
      orders: {
        total: jobs.length,
        last24h: countRecentActuals(jobs, 1, nowMs),
        last7d: countRecentActuals(jobs, 7, nowMs)
      },
      userAgents: {
        total: userAgents.length,
        last24h: countRecentActuals(userAgents, 1, nowMs),
        last7d: countRecentActuals(userAgents, 7, nowMs)
      }
    },
    funnel: Object.keys(CONVERSION_EVENT_LABELS).map(statsForEvent),
    recent: events.slice(0, 50).map((event) => ({
      id: normalizeString(event.id),
      ts: normalizeString(event.ts || event.createdAt),
      event: normalizeString(event.meta?.event),
      label: conversionEventLabel(event.meta?.event),
      visitor: normalizeString(event.meta?.visitorId || event.meta?.accountHash).slice(0, 12),
      loggedIn: Boolean(event.meta?.loggedIn),
      authProvider: normalizeString(event.meta?.authProvider || 'guest'),
      tab: normalizeString(event.meta?.tab),
      pagePath: normalizeString(event.meta?.pagePath || '/'),
      source: normalizeString(event.meta?.source || 'web'),
      promptChars: sanitizeConversionNumber(event.meta?.promptChars || 0),
      status: normalizeString(event.meta?.status)
    }))
  };
}
