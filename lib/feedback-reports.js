import { randomUUID } from 'node:crypto';
import { nowIso } from './events.js';

function normalizeString(value, fallback = '') {
  return String(value ?? fallback).trim();
}

function normalizeFeedbackType(value, fallback = 'bug') {
  const text = normalizeString(value, fallback).toLowerCase();
  return ['bug', 'idea', 'question', 'other'].includes(text) ? text : fallback;
}

function normalizeFeedbackStatus(value, fallback = 'open') {
  const text = normalizeString(value, fallback).toLowerCase();
  return ['open', 'reviewing', 'resolved'].includes(text) ? text : fallback;
}

function shortText(value, max = 96) {
  const text = normalizeString(value);
  if (!text) return '';
  return text.length > max ? `${text.slice(0, Math.max(0, max - 1)).trimEnd()}…` : text;
}

function normalizeFeedbackContext(value = {}) {
  const source = value && typeof value === 'object' ? value : {};
  return {
    pagePath: normalizeString(source.pagePath || source.page_path || '/'),
    currentTab: normalizeString(source.currentTab || source.current_tab),
    source: normalizeString(source.source, 'contact_form'),
    browser: normalizeString(source.browser),
    userAgent: normalizeString(source.userAgent || source.user_agent),
    extra: source.extra && typeof source.extra === 'object' ? { ...source.extra } : {}
  };
}

function feedbackTitleFromPayload(payload = {}) {
  const explicitTitle = normalizeString(payload.title);
  if (explicitTitle) return shortText(explicitTitle, 120);
  const message = normalizeString(payload.message);
  if (!message) return 'Untitled report';
  const firstLine = message.split(/\r?\n/).map((line) => normalizeString(line)).find(Boolean) || message;
  return shortText(firstLine, 120) || 'Untitled report';
}

export function createFeedbackReport(payload = {}, context = {}) {
  const now = normalizeString(context.now, nowIso());
  const payloadContext = payload?.context && typeof payload.context === 'object' ? payload.context : {};
  const sourceContext = normalizeFeedbackContext({
    ...payload,
    ...payloadContext,
    ...context,
    extra: context.extra || payload.extra || {}
  });
  return {
    id: normalizeString(payload.id || payload.reportId || payload.report_id) || `feedback_${randomUUID()}`,
    type: normalizeFeedbackType(payload.type, 'bug'),
    status: normalizeFeedbackStatus(payload.status, 'open'),
    title: feedbackTitleFromPayload(payload),
    message: normalizeString(payload.message),
    email: normalizeString(payload.email).slice(0, 200),
    reporterLogin: normalizeString(context.reporterLogin || context.login || payload.reporterLogin || payload.reporter_login),
    reviewedBy: normalizeString(context.reviewedBy || payload.reviewedBy || payload.reviewed_by),
    reviewedAt: normalizeString(payload.reviewedAt || payload.reviewed_at),
    resolutionNote: normalizeString(payload.resolutionNote || payload.resolution_note),
    createdAt: normalizeString(payload.createdAt || payload.created_at, now),
    updatedAt: normalizeString(payload.updatedAt || payload.updated_at, now),
    context: sourceContext
  };
}

export function sanitizeFeedbackReportForClient(report = {}) {
  const created = createFeedbackReport(report, {
    reporterLogin: report.reporterLogin || report.reporter_login,
    reviewedBy: report.reviewedBy || report.reviewed_by,
    now: report.createdAt || report.created_at || nowIso()
  });
  return {
    id: created.id,
    type: created.type,
    status: created.status,
    title: created.title,
    message: created.message,
    email: created.email,
    reporterLogin: created.reporterLogin,
    reviewedBy: created.reviewedBy,
    reviewedAt: created.reviewedAt,
    resolutionNote: created.resolutionNote,
    createdAt: created.createdAt,
    updatedAt: created.updatedAt,
    context: created.context
  };
}

export function feedbackReportsForClient(state, limit = 100, options = {}) {
  const safeLimit = Math.max(1, Math.min(500, Number(limit || 100) || 100));
  const filterStatus = normalizeString(options.status).toLowerCase();
  return (Array.isArray(state?.feedbackReports) ? state.feedbackReports : [])
    .map((report) => sanitizeFeedbackReportForClient(report))
    .filter((report) => !filterStatus || report.status === filterStatus)
    .sort((left, right) => String(right.createdAt || '').localeCompare(String(left.createdAt || '')))
    .slice(0, safeLimit);
}

const DEFAULT_FEEDBACK_EMAIL_ADDRESS = 'support@aiagent-marketplace.net';

function sanitizeEmailHeader(value = '', fallback = '') {
  const text = normalizeString(value, fallback).replace(/[\r\n]+/g, ' ').trim();
  return text || fallback;
}

function encodeEmailHeader(value = '') {
  const text = sanitizeEmailHeader(value);
  if (/^[\x20-\x7E]*$/.test(text)) return text;
  const bytes = new TextEncoder().encode(text);
  if (typeof btoa === 'function') {
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return `=?UTF-8?B?${btoa(binary)}?=`;
  }
  return `=?UTF-8?B?${Buffer.from(bytes).toString('base64')}?=`;
}

function isPlausibleEmailAddress(value = '') {
  const text = normalizeString(value).trim();
  if (!text || text.length > 254) return false;
  return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(text);
}

function feedbackReportTextLine(label, value, fallback = '-') {
  const text = normalizeString(value);
  return `${label}: ${text || fallback}`;
}

export function formatFeedbackReportEmail(report = {}, options = {}) {
  const to = sanitizeEmailHeader(options.to, DEFAULT_FEEDBACK_EMAIL_ADDRESS);
  const from = sanitizeEmailHeader(options.from, DEFAULT_FEEDBACK_EMAIL_ADDRESS);
  const fromName = sanitizeEmailHeader(options.fromName, 'CAIt Report Issue');
  const type = normalizeFeedbackType(report.type, 'bug').toUpperCase();
  const title = sanitizeEmailHeader(report.title || feedbackTitleFromPayload(report), 'Untitled report');
  const subject = sanitizeEmailHeader(options.subject, `[CAIt Report Issue] ${type}: ${shortText(title, 90)}`);
  const replyTo = isPlausibleEmailAddress(report.email) ? normalizeString(report.email).trim() : '';
  const context = report.context && typeof report.context === 'object' ? report.context : {};
  const rawBodyLines = [
    'A new Report Issue submission was received.',
    '',
    feedbackReportTextLine('Report ID', report.id),
    feedbackReportTextLine('Type', normalizeFeedbackType(report.type, 'bug')),
    feedbackReportTextLine('Status', normalizeFeedbackStatus(report.status, 'open')),
    feedbackReportTextLine('Title', title),
    feedbackReportTextLine('Reporter login', report.reporterLogin || report.reporter_login),
    feedbackReportTextLine('Reporter email', report.email),
    feedbackReportTextLine('Page', context.pagePath || context.page_path),
    feedbackReportTextLine('Tab', context.currentTab || context.current_tab),
    feedbackReportTextLine('Source', context.source),
    feedbackReportTextLine('Created at', report.createdAt || report.created_at),
    '',
    'Message:',
    normalizeString(report.message) || '-',
    '',
    'Context:',
    JSON.stringify(context, null, 2)
  ];
  const headers = [
    `From: ${fromName} <${from}>`,
    `To: ${to}`,
    ...(replyTo ? [`Reply-To: ${replyTo}`] : []),
    `Subject: ${encodeEmailHeader(subject)}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${sanitizeEmailHeader(report.id || `feedback-${Date.now()}`, 'feedback')}@aiagent-marketplace.net>`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit'
  ];
  const text = rawBodyLines.join('\n');
  return {
    to,
    from,
    replyTo,
    subject,
    text,
    raw: `${headers.join('\r\n')}\r\n\r\n${text.replace(/\n/g, '\r\n')}`
  };
}

export function updateFeedbackReportInState(state, reportId, patch = {}, reviewer = {}) {
  const safeId = normalizeString(reportId);
  if (!safeId) return null;
  if (!Array.isArray(state.feedbackReports)) state.feedbackReports = [];
  const index = state.feedbackReports.findIndex((item) => normalizeString(item?.id) === safeId);
  if (index === -1) return null;
  const existing = createFeedbackReport(state.feedbackReports[index], {
    reporterLogin: state.feedbackReports[index]?.reporterLogin || state.feedbackReports[index]?.reporter_login,
    reviewedBy: state.feedbackReports[index]?.reviewedBy || state.feedbackReports[index]?.reviewed_by,
    now: state.feedbackReports[index]?.createdAt || state.feedbackReports[index]?.created_at || nowIso()
  });
  const nextStatus = normalizeFeedbackStatus(patch.status, existing.status || 'open');
  const now = nowIso();
  const updated = {
    ...existing,
    status: nextStatus,
    resolutionNote: normalizeString(patch.resolutionNote || patch.resolution_note, existing.resolutionNote),
    reviewedBy: normalizeString(reviewer.login || reviewer.reviewedBy || patch.reviewedBy || patch.reviewed_by, existing.reviewedBy),
    reviewedAt: normalizeString(
      patch.reviewedAt || patch.reviewed_at,
      nextStatus === existing.status ? existing.reviewedAt : now
    ),
    updatedAt: now
  };
  state.feedbackReports[index] = updated;
  return updated;
}
