import { API_ROUTES } from './api-routes.js';

export function isUnsafeMethod(method = '') {
  return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(String(method || '').toUpperCase());
}

export function csrfExemptPath(pathname = '') {
  return pathname === API_ROUTES.STRIPE_WEBHOOK
    || pathname === API_ROUTES.AGENT_CALLBACK_JOBS
    || pathname === '/mock/accepted/jobs';
}

export function rateLimitSpecForPath(pathname = '', method = 'GET') {
  const verb = String(method || 'GET').toUpperCase();
  if (verb === 'OPTIONS') return null;
  if (pathname.startsWith('/auth/')) return { name: 'auth', limit: 80, windowMs: 60_000 };
  if (pathname === API_ROUTES.ANALYTICS_EVENTS && verb === 'POST') return { name: 'analytics-event', limit: 120, windowMs: 60_000 };
  if (pathname === API_ROUTES.ANALYTICS_CHAT_TRANSCRIPTS && verb === 'POST') return { name: 'chat-transcript', limit: 120, windowMs: 60_000 };
  if (pathname === API_ROUTES.OPEN_CHAT_INTENT && verb === 'POST') return { name: 'open-chat-intent', limit: 20, windowMs: 60_000 };
  if (pathname === API_ROUTES.WORK_RESOLVE_ACTION && verb === 'POST') return { name: 'work-resolve-action', limit: 60, windowMs: 60_000 };
  if (pathname === API_ROUTES.WORK_RESOLVE_INTENT && verb === 'POST') return { name: 'work-resolve-intent', limit: 60, windowMs: 60_000 };
  if (pathname === API_ROUTES.WORK_PREPARE_ORDER && verb === 'POST') return { name: 'work-prepare-order', limit: 60, windowMs: 60_000 };
  if (pathname === API_ROUTES.WORK_PREFLIGHT_ORDER && verb === 'POST') return { name: 'work-preflight-order', limit: 60, windowMs: 60_000 };
  if (/^\/api\/jobs\/[^/]+\/executor-state$/.test(pathname) && verb === 'PATCH') return { name: 'job-executor-state', limit: 120, windowMs: 60_000 };
  if (pathname === API_ROUTES.DELIVERIES_CLASSIFY && verb === 'POST') return { name: 'delivery-classify', limit: 30, windowMs: 60_000 };
  if (pathname === API_ROUTES.DELIVERIES_PREPARE_PUBLISH && verb === 'POST') return { name: 'delivery-prepare-publish', limit: 60, windowMs: 60_000 };
  if (pathname === API_ROUTES.DELIVERIES_PREPARE_PUBLISH_ORDER && verb === 'POST') return { name: 'delivery-prepare-publish-order', limit: 60, windowMs: 60_000 };
  if (pathname === API_ROUTES.DELIVERIES_PREPARE_EXECUTION && verb === 'POST') return { name: 'delivery-prepare-execution', limit: 60, windowMs: 60_000 };
  if (pathname === API_ROUTES.DELIVERIES_EXECUTE && verb === 'POST') return { name: 'delivery-execute', limit: 30, windowMs: 60_000 };
  if (pathname === API_ROUTES.DELIVERIES_SCHEDULE && verb === 'POST') return { name: 'delivery-schedule', limit: 30, windowMs: 60_000 };
  if (pathname === '/mcp' && verb === 'POST') return { name: 'mcp', limit: 120, windowMs: 60_000 };
  if (pathname === API_ROUTES.CONNECTORS_X_POST && verb === 'POST') return { name: 'x-post', limit: 20, windowMs: 10 * 60_000 };
  if (pathname === API_ROUTES.CONNECTORS_INSTAGRAM_POST && verb === 'POST') return { name: 'instagram-post', limit: 20, windowMs: 10 * 60_000 };
  if (pathname === API_ROUTES.CONNECTORS_GOOGLE_ASSETS && verb === 'GET') return { name: 'google-assets', limit: 30, windowMs: 60_000 };
  if (pathname === API_ROUTES.CONNECTORS_GOOGLE_ANALYTICS_REPORT && verb === 'GET') return { name: 'google-analytics-report', limit: 20, windowMs: 60_000 };
  if (pathname === API_ROUTES.CONNECTORS_GOOGLE_SEND_GMAIL && verb === 'POST') return { name: 'google-send-gmail', limit: 20, windowMs: 10 * 60_000 };
  if (pathname === API_ROUTES.CONNECTORS_RESEND_SEND_EMAIL && verb === 'POST') return { name: 'resend-send-email', limit: 20, windowMs: 10 * 60_000 };
  if (pathname === API_ROUTES.GITHUB_CREATE_ADAPTER_PR && verb === 'POST') return { name: 'github-adapter-pr', limit: 20, windowMs: 10 * 60_000 };
  if (pathname === API_ROUTES.GITHUB_CREATE_EXECUTOR_PR && verb === 'POST') return { name: 'github-executor-pr', limit: 20, windowMs: 10 * 60_000 };
  if (pathname === API_ROUTES.CHAT_MEMORY && verb === 'GET') return { name: 'chat-memory', limit: 240, windowMs: 60_000 };
  if (/^\/api\/settings\/chat-memory\/[^/]+$/.test(pathname) && verb === 'DELETE') return { name: 'hide-chat-memory', limit: 120, windowMs: 60_000 };
  if (pathname === API_ROUTES.SETTINGS_API_KEYS && verb === 'POST') return { name: 'issue-cait-key', limit: 12, windowMs: 10 * 60_000 };
  if (pathname === API_ROUTES.JOBS && verb === 'POST') return { name: 'create-job', limit: 120, windowMs: 60_000 };
  if (pathname === API_ROUTES.RECURRING_ORDERS && verb === 'POST') return { name: 'create-recurring-order', limit: 60, windowMs: 60_000 };
  if (pathname === API_ROUTES.FEEDBACK && verb === 'POST') return { name: 'feedback', limit: 20, windowMs: 60_000 };
  if (pathname.startsWith('/api/stripe/') && verb === 'POST') return { name: 'stripe-action', limit: 60, windowMs: 60_000 };
  if (pathname === API_ROUTES.AGENT_CALLBACK_JOBS && verb === 'POST') return { name: 'agent-callback', limit: 300, windowMs: 60_000 };
  if (/^\/mock\/[^/]+\/jobs$/.test(pathname) && verb === 'POST') return { name: 'built-in-direct', limit: 20, windowMs: 60_000 };
  if (isUnsafeMethod(verb)) return { name: 'write', limit: 240, windowMs: 60_000 };
  if (pathname === API_ROUTES.SNAPSHOT) return { name: 'snapshot', limit: 240, windowMs: 60_000 };
  return null;
}
