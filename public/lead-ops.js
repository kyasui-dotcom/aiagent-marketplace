import { buildCaitAppContext, copyContextJson, fetchCaitAppContextFromUrl, sendContextToCait } from './cait-app-bridge.js?v=20260526b';

let leads = [];
let selectedId = '';
let filter = 'all';
let importedContext = null;
let csrfToken = '';
let resendResult = {
  checked: false,
  status: '',
  result: null
};

function leadUrlParams() {
  return new URL(window.location.href).searchParams;
}

function leadChatReturnTo() {
  const value = String(leadUrlParams().get('chat_return_to') || '').trim();
  if (!value) return '';
  try {
    const url = new URL(value, window.location.origin);
    return url.origin === window.location.origin && /^\/chat(?:\.html)?$/.test(url.pathname)
      ? `${url.pathname}${url.search}${url.hash}`
      : '';
  } catch {
    return '';
  }
}

function leadChatHandoffId() {
  return String(leadUrlParams().get('chat_handoff_id') || '').replace(/[^a-z0-9_-]/gi, '').slice(0, 120);
}

function currentLeadReturnPath() {
  const path = window.location.pathname || '/lead-ops.html';
  const safePath = path.startsWith('/') && /\/lead-ops\.html$/.test(path) ? path : '/lead-ops.html';
  return `${safePath}${window.location.search || ''}${window.location.hash || ''}`;
}

const els = {
  statusButtons: [...document.querySelectorAll('[data-status]')],
  leaderSelect: document.getElementById('leaderSelect'),
  markDraftBtn: document.getElementById('markDraftBtn'),
  leadTable: document.getElementById('leadTable'),
  leadNameInput: document.getElementById('leadNameInput'),
  leadContactInput: document.getElementById('leadContactInput'),
  leadSourceInput: document.getElementById('leadSourceInput'),
  outreachChannelSelect: document.getElementById('outreachChannelSelect'),
  consentSelect: document.getElementById('consentSelect'),
  sendModeSelect: document.getElementById('sendModeSelect'),
  scheduleAtInput: document.getElementById('scheduleAtInput'),
  triggerEventSelect: document.getElementById('triggerEventSelect'),
  triggerConditionInput: document.getElementById('triggerConditionInput'),
  senderEmailInput: document.getElementById('senderEmailInput'),
  replyToEmailInput: document.getElementById('replyToEmailInput'),
  emailSubjectInput: document.getElementById('emailSubjectInput'),
  emailBodyInput: document.getElementById('emailBodyInput'),
  leadStatusPill: document.getElementById('leadStatusPill'),
  leadContextPreview: document.getElementById('leadContextPreview'),
  sendLeadContextBtn: document.getElementById('sendLeadContextBtn'),
  copyLeadContextBtn: document.getElementById('copyLeadContextBtn'),
  approveLeadBtn: document.getElementById('approveLeadBtn'),
  scheduleLeadBtn: document.getElementById('scheduleLeadBtn'),
  triggerLeadBtn: document.getElementById('triggerLeadBtn'),
  waitLeadBtn: document.getElementById('waitLeadBtn'),
  sendResendBtn: document.getElementById('sendResendBtn'),
  scheduleResendBtn: document.getElementById('scheduleResendBtn'),
  resendStatusNote: document.getElementById('resendStatusNote'),
  leadTotalMetric: document.getElementById('leadTotalMetric'),
  leadDraftMetric: document.getElementById('leadDraftMetric'),
  leadApprovedMetric: document.getElementById('leadApprovedMetric'),
  leadScheduledMetric: document.getElementById('leadScheduledMetric'),
  leadTriggeredMetric: document.getElementById('leadTriggeredMetric'),
  leadBlockedMetric: document.getElementById('leadBlockedMetric'),
  leadAllNavCount: document.getElementById('leadAllNavCount'),
  leadReviewNavCount: document.getElementById('leadReviewNavCount'),
  leadDraftNavCount: document.getElementById('leadDraftNavCount'),
  leadApprovedNavCount: document.getElementById('leadApprovedNavCount'),
  leadScheduledNavCount: document.getElementById('leadScheduledNavCount'),
  leadTriggeredNavCount: document.getElementById('leadTriggeredNavCount'),
  leadBlockedNavCount: document.getElementById('leadBlockedNavCount'),
  leadStepLoad: document.getElementById('leadStepLoad'),
  leadStepDraft: document.getElementById('leadStepDraft'),
  leadStepApproval: document.getElementById('leadStepApproval'),
  leadReturnToChatLink: document.getElementById('leadReturnToChatLink'),
  leadHandoffSessionNotice: document.getElementById('leadHandoffSessionNotice'),
  leadOpsReadinessPill: document.getElementById('leadOpsReadinessPill'),
  leadOpsReadinessList: document.getElementById('leadOpsReadinessList'),
  leadSourcingIcpInput: document.getElementById('leadSourcingIcpInput'),
  leadSourcingSourceInput: document.getElementById('leadSourcingSourceInput'),
  leadSourcingCountInput: document.getElementById('leadSourcingCountInput'),
  leadSourcingRegionInput: document.getElementById('leadSourcingRegionInput'),
  leadSourcingOfferInput: document.getElementById('leadSourcingOfferInput'),
  leadSourcingExclusionInput: document.getElementById('leadSourcingExclusionInput'),
  leadSourcingPill: document.getElementById('leadSourcingPill'),
  leadSourcingNote: document.getElementById('leadSourcingNote'),
  requestLeadSourcingBtn: document.getElementById('requestLeadSourcingBtn'),
  copyLeadSourcingBtn: document.getElementById('copyLeadSourcingBtn')
};

function selectedLead() {
  return leads.find((lead) => lead.id === selectedId) || leads[0] || null;
}

function visibleLeads() {
  if (filter === 'all') return leads;
  return leads.filter((lead) => lead.status === filter);
}

function statusClass(value = '') {
  const safe = String(value || '').toLowerCase();
  if (/approved|draft|scheduled|triggered|sent/.test(safe)) return 'approved';
  if (/blocked/.test(safe)) return 'blocked';
  return 'pending';
}

function statusLabel(value = '') {
  const safe = String(value || '').toLowerCase();
  if (safe === 'blocked') return 'waiting';
  if (safe === 'triggered') return 'trigger-ready';
  return String(value || 'needs review');
}

function firstText(...values) {
  return values.find((value) => String(value || '').trim()) || '';
}

function normalizeChannel(value = '') {
  const safe = String(value || '').toLowerCase();
  if (/sms|text/.test(safe)) return 'sms';
  if (/linkedin/.test(safe)) return 'linkedin';
  if (/crm|task/.test(safe)) return 'crm_task';
  if (/manual|review/.test(safe)) return 'manual';
  return 'email';
}

function normalizeSendMode(value = '') {
  const safe = String(value || '').toLowerCase();
  if (/trigger|event/.test(safe)) return 'event_trigger';
  if (/schedule|scheduled|time/.test(safe)) return 'scheduled';
  if (/sequence|step/.test(safe)) return 'sequence_step';
  return 'manual_approval';
}

function selectedOptionValue(select, fallback = '') {
  if (!select) return fallback;
  const values = [...select.options].map((option) => option.value);
  return values.includes(fallback) ? fallback : values[0] || '';
}

function validEmail(value = '') {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

async function refreshAuthSnapshot() {
  try {
    const response = await fetch('/api/snapshot', {
      headers: { accept: 'application/json' },
      credentials: 'same-origin'
    });
    const payload = await response.json().catch(() => ({}));
    csrfToken = String(payload?.auth?.csrfToken || payload?.snapshot?.auth?.csrfToken || '').trim();
  } catch {
    csrfToken = '';
  }
}

async function apiJson(path = '', options = {}) {
  const method = String(options.method || 'GET').toUpperCase();
  const headers = new Headers(options.headers || {});
  headers.set('accept', 'application/json');
  if (options.body && !headers.has('content-type')) headers.set('content-type', 'application/json');
  if (csrfToken && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) headers.set('x-aiagent2-csrf', csrfToken);
  const response = await fetch(path, {
    ...options,
    method,
    headers,
    credentials: 'same-origin'
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(String(payload?.message || payload?.error || `Request failed (${response.status})`));
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  return payload;
}

function artifactType(artifact = {}) {
  return String(artifact?.type || artifact?.content_type || artifact?.contentType || artifact?.artifact_type || artifact?.artifactType || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function artifactsByType(context = {}, types = []) {
  const wanted = new Set((Array.isArray(types) ? types : [types]).map((type) => artifactType({ type })));
  return (Array.isArray(context.artifacts) ? context.artifacts : [])
    .filter((artifact) => wanted.has(artifactType(artifact)));
}

function artifactRows(context = {}, types = []) {
  return artifactsByType(context, types)
    .flatMap((artifact) => {
      if (Array.isArray(artifact?.rows)) return artifact.rows;
      if (Array.isArray(artifact?.items)) return artifact.items;
      if (Array.isArray(artifact?.leads)) return artifact.leads;
      if (Array.isArray(artifact?.drafts)) return artifact.drafts;
      return [artifact];
    })
    .filter((row) => row && typeof row === 'object');
}

const LEAD_CONTEXT_PACKET_KEYS = Object.freeze([
  'lead_ops_packet',
  'leadOpsPacket',
  'lead_packet',
  'leadPacket',
  'crm_packet',
  'crmPacket',
  'outreach_packet',
  'outreachPacket'
]);

const LEAD_CONTEXT_FIELD_ALIASES = Object.freeze({
  lead_rows: ['lead_rows', 'leadRows', 'leads', 'lead_items', 'leadItems', 'rows', 'items'],
  evidence_urls: ['evidence_urls', 'evidenceUrls', 'evidence_url', 'evidenceUrl', 'source_urls', 'sourceUrls', 'evidence', 'rows', 'items'],
  next_actions: ['next_actions', 'nextActions', 'next_action', 'nextAction', 'lead_next_actions', 'leadNextActions', 'actions', 'rows', 'items'],
  email_drafts: ['email_drafts', 'emailDrafts', 'email_draft', 'emailDraft', 'outreach_drafts', 'outreachDrafts', 'drafts', 'rows', 'items'],
  outreach_plan: ['outreach_plan', 'outreachPlan', 'outreach_plans', 'outreachPlans', 'plan', 'steps']
});

function objectValue(value = null) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
}

function structuredPayload(value = null) {
  if (typeof value !== 'string') return value;
  const text = value.trim();
  if (!/^[{[]/.test(text)) return value;
  try {
    return JSON.parse(text);
  } catch {
    return value;
  }
}

function contextDataSources(context = {}) {
  const raw = objectValue(context.raw_context || context.rawContext);
  const received = objectValue(raw?.received_context || raw?.receivedContext);
  const receivedRaw = objectValue(received?.raw_context || received?.rawContext);
  const baseSources = [context, raw, received, receivedRaw].filter(Boolean);
  const packetSources = baseSources.flatMap((source) => LEAD_CONTEXT_PACKET_KEYS
    .map((key) => structuredPayload(source?.[key]))
    .filter((value) => value && typeof value === 'object'));
  const packetArtifacts = artifactsByType(context, LEAD_CONTEXT_PACKET_KEYS)
    .map((artifact) => structuredPayload(artifact?.content || artifact?.body || artifact?.text || artifact))
    .filter((value) => value && typeof value === 'object');
  return [...baseSources, ...packetSources, ...packetArtifacts];
}

function contractValues(context = {}, field = '') {
  const aliases = LEAD_CONTEXT_FIELD_ALIASES[field] || [field];
  const values = [];
  contextDataSources(context).forEach((source) => {
    aliases.forEach((alias) => {
      if (Object.prototype.hasOwnProperty.call(source, alias)) values.push(structuredPayload(source[alias]));
    });
  });
  return values.filter((value) => value != null && value !== '');
}

function rowsFromStructuredPayload(value = null, aliases = []) {
  const payload = structuredPayload(value);
  if (Array.isArray(payload)) return payload;
  const object = objectValue(payload);
  if (!object) return [];
  for (const alias of aliases) {
    const nested = structuredPayload(object[alias]);
    if (Array.isArray(nested)) return nested;
    if (objectValue(nested)) {
      const rows = rowsFromStructuredPayload(nested, aliases);
      if (rows.length) return rows;
    }
  }
  if (Array.isArray(object.rows)) return object.rows;
  if (Array.isArray(object.items)) return object.items;
  if (Array.isArray(object.leads)) return object.leads;
  if (Array.isArray(object.drafts)) return object.drafts;
  if (Array.isArray(object.steps)) return object.steps;
  return ['company', 'company_name', 'lead', 'lead_name', 'contact', 'email', 'subject', 'body', 'next_action', 'evidence_url']
    .some((key) => String(object[key] || '').trim()) ? [object] : [];
}

function contractRows(context = {}, field = '') {
  const aliases = LEAD_CONTEXT_FIELD_ALIASES[field] || [field];
  return contractValues(context, field)
    .flatMap((value) => rowsFromStructuredPayload(value, aliases))
    .filter((row) => row && typeof row === 'object');
}

function markdownCellText(value = '') {
  return String(value || '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/\\\|/g, '|')
    .replace(/\*\*/g, '')
    .replace(/`/g, '')
    .trim();
}

function splitMarkdownRow(line = '') {
  return String(line || '')
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split(/(?<!\\)\|/g)
    .map(markdownCellText);
}

function normalizedHeader(value = '') {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function rowValue(row = {}, keys = []) {
  for (const key of keys) {
    const normalized = normalizedHeader(key);
    const direct = row[key];
    const normalizedValue = row[normalized];
    if (String(direct || '').trim()) return String(direct).trim();
    if (String(normalizedValue || '').trim()) return String(normalizedValue).trim();
  }
  return '';
}

function matchingSupplementRow(rows = [], lead = null) {
  if (!lead) return null;
  const leadId = String(lead.id || '').trim().toLowerCase();
  const company = String(lead.company || '').trim().toLowerCase();
  const website = String(lead.website || lead.evidenceUrl || '').trim().toLowerCase();
  return rows.find((row) => {
    const rowId = rowValue(row, ['lead_id', 'leadId', 'id']).toLowerCase();
    const rowCompany = rowValue(row, ['company', 'company_name', 'lead', 'lead_name', 'target']).toLowerCase();
    const rowUrl = rowValue(row, ['website', 'url', 'company_url', 'domain', 'evidence_url', 'source_url', 'contact_source_url']).toLowerCase();
    return (leadId && rowId && rowId === leadId)
      || (company && rowCompany && rowCompany === company)
      || (website && rowUrl && rowUrl === website);
  }) || null;
}

function applyLeadSupplementArtifacts(importedLeads = [], context = {}) {
  const evidenceRows = [
    ...artifactRows(context, ['evidence_urls', 'evidence_url', 'evidence', 'source_urls']),
    ...contractRows(context, 'evidence_urls')
  ];
  const nextActionRows = [
    ...artifactRows(context, ['next_actions', 'next_action', 'lead_next_actions']),
    ...contractRows(context, 'next_actions')
  ];
  importedLeads.forEach((lead) => {
    const evidence = matchingSupplementRow(evidenceRows, lead);
    if (evidence) {
      lead.evidenceUrl = lead.evidenceUrl || rowValue(evidence, ['evidenceUrl', 'evidence_url', 'source_url', 'contact_source_url', 'url']);
      lead.contact = lead.contact || rowValue(evidence, ['contact', 'email', 'public_email', 'public_email_or_contact_path', 'contact_path', 'form_url', 'recipient']);
      lead.fit = lead.fit || rowValue(evidence, ['fit', 'why_fit', 'observed_signal', 'signal', 'note']);
      lead.consent = lead.consent || rowValue(evidence, ['consent', 'legal_basis', 'consent_basis']) || 'needs_review';
    }
    const nextAction = matchingSupplementRow(nextActionRows, lead);
    if (nextAction) {
      lead.nextAction = rowValue(nextAction, ['nextAction', 'next_action', 'action', 'task', 'review_note', 'note']) || lead.nextAction;
      lead.status = rowValue(nextAction, ['status', 'review_status']) || lead.status;
      lead.owner = rowValue(nextAction, ['owner', 'agent', 'assignee']) || lead.owner;
    }
  });
  return importedLeads;
}

function normalizeLeadRow(row = {}, index = 0, source = {}) {
  const company = rowValue(row, ['company', 'company_name', 'name', 'lead', 'lead_name']);
  const website = rowValue(row, ['website', 'url', 'company_url', 'domain']);
  const contact = rowValue(row, ['contact', 'email', 'public_email', 'public_email_or_contact_path', 'contact_path', 'form_url', 'crm_id', 'recipient']);
  const evidenceUrl = rowValue(row, ['evidenceUrl', 'evidence_url', 'source_url', 'contact_source_url', 'source', 'url']) || website;
  const whyFit = rowValue(row, ['fit', 'why_fit', 'observed_signal', 'signal']);
  const observedSignal = rowValue(row, ['observed_signal', 'signal']);
  const targetRole = rowValue(row, ['target_role_hypothesis', 'target_role', 'persona', 'segment']);
  const angle = rowValue(row, ['company_specific_angle', 'personalization_seed', 'next_action', 'review_note']);
  const note = rowValue(row, ['review_note', 'status', 'review_status', 'notes']);
  const blocked = /blocked_missing_source_rows|source_required|public_contact_required/i.test([company, website, contact, evidenceUrl, whyFit, note].join(' '));
  if (!company) return null;
  return {
    id: String(row.id || row.lead_id || `${source.id || 'lead'}-${index + 1}`).trim(),
    company,
    website,
    segment: String(targetRole || row.segment || row.persona || source.segment || 'Imported lead'),
    contact,
    evidenceUrl,
    fit: [whyFit, observedSignal && observedSignal !== whyFit ? observedSignal : ''].filter(Boolean).join(' / '),
    status: String(row.status || row.review_status || (blocked ? 'blocked' : 'review')),
    owner: String(row.owner || row.agent || source.owner || 'CAIt'),
    nextAction: String(row.nextAction || row.next_action || angle || note || 'Review source evidence and approval state.'),
    channel: normalizeChannel(row.channel || row.outreach_channel || row.message_channel || ''),
    consent: String(row.consent || row.legal_basis || row.consent_basis || (contact ? 'public_business_contact' : 'needs_review')),
    sendMode: normalizeSendMode(row.sendMode || row.send_mode || row.execution_mode || ''),
    scheduleAt: String(row.scheduleAt || row.schedule_at || row.scheduled_at || ''),
    triggerEvent: String(row.triggerEvent || row.trigger_event || 'none'),
    triggerCondition: String(row.triggerCondition || row.trigger_condition || ''),
    senderEmail: String(row.senderEmail || row.sender_email || row.from || ''),
    replyToEmail: String(row.replyToEmail || row.reply_to_email || row.replyTo || row.reply_to || ''),
    subject: String(row.subject || ''),
    body: String(row.body || '')
  };
}

function parseLeadRowsFromMarkdown(markdown = '', source = {}) {
  const lines = String(markdown || '').replace(/\r\n/g, '\n').split('\n');
  const rows = [];
  for (let index = 0; index < lines.length - 1; index += 1) {
    const line = lines[index];
    const next = lines[index + 1] || '';
    if (!/^\s*\|/.test(line) || !/^\s*\|?\s*:?-{3,}:?\s*\|/.test(next)) continue;
    const headers = splitMarkdownRow(line).map(normalizedHeader);
    if (!headers.some((header) => ['company', 'company_name', 'lead', 'name'].includes(header))) continue;
    if (!headers.some((header) => /contact|email|source|evidence|website|url|why_fit|observed_signal/.test(header))) continue;
    for (let rowIndex = index + 2; rowIndex < lines.length; rowIndex += 1) {
      const rowLine = lines[rowIndex] || '';
      if (!/^\s*\|/.test(rowLine)) break;
      const cells = splitMarkdownRow(rowLine);
      if (!cells.length || cells.every((cell) => !cell)) continue;
      const row = {};
      headers.forEach((header, cellIndex) => {
        row[header] = cells[cellIndex] || '';
      });
      const lead = normalizeLeadRow(row, rows.length, source);
      if (lead) rows.push(lead);
    }
    if (rows.length) break;
  }
  return rows.length ? rows : parseCollapsedLeadTable(markdown, source);
}

function parseCollapsedLeadTable(markdown = '', source = {}) {
  const cells = String(markdown || '').split('|').map(markdownCellText);
  const companyHeaderIndex = cells.findIndex((cell) => ['company', 'company_name', 'lead', 'lead_name'].includes(normalizedHeader(cell)));
  if (companyHeaderIndex < 0) return [];
  const possibleIndexHeader = normalizedHeader(cells[companyHeaderIndex - 1] || '');
  const headerStart = ['', 'no', 'number', 'index'].includes(possibleIndexHeader) ? Math.max(0, companyHeaderIndex - 1) : companyHeaderIndex;
  const headers = [];
  for (let index = headerStart; index < cells.length; index += 1) {
    const header = normalizedHeader(cells[index]);
    if (!header && headers.length) break;
    if (/^-+$/.test(header)) break;
    headers.push(header);
  }
  const usefulHeaders = headers.filter(Boolean);
  if (!usefulHeaders.includes('company_name') && !usefulHeaders.includes('company') && !usefulHeaders.includes('lead')) return [];
  if (!usefulHeaders.some((header) => /contact|email|source|evidence|website|url|why_fit|observed_signal/.test(header))) return [];
  let cursor = headerStart + headers.length;
  while (cursor < cells.length && !cells[cursor]) cursor += 1;
  if (headers.length && cells.slice(cursor, cursor + headers.length).every((cell) => /^:?-{3,}:?$/.test(cell))) {
    cursor += headers.length;
  }
  const rows = [];
  while (cursor < cells.length) {
    while (cursor < cells.length && !cells[cursor]) cursor += 1;
    const chunk = cells.slice(cursor, cursor + headers.length);
    if (chunk.length < headers.length) break;
    cursor += headers.length;
    if (chunk.every((cell) => !cell || /^:?-{3,}:?$/.test(cell))) continue;
    const row = {};
    headers.forEach((header, index) => {
      if (header) row[header] = chunk[index] || '';
    });
    const lead = normalizeLeadRow(row, rows.length, source);
    if (lead) rows.push(lead);
  }
  return rows;
}

function leadRowsFromContextArtifacts(context = {}) {
  const structured = [
    ...artifactRows(context, ['lead_rows', 'leads', 'crm_rows']),
    ...contractRows(context, 'lead_rows')
  ]
    .map((row, index) => normalizeLeadRow(row, index, { id: context.id || 'structured-lead', owner: context.source_app_label || context.source_app || 'CAIt' }))
    .filter(Boolean);
  const evidenceOnlyRows = [
    ...artifactRows(context, ['evidence_urls', 'evidence_url', 'source_urls']),
    ...contractRows(context, 'evidence_urls')
  ]
    .map((row, index) => normalizeLeadRow(row, index, { id: `${context.id || 'evidence'}-evidence`, owner: context.source_app_label || context.source_app || 'CAIt' }))
    .filter(Boolean);
  const nextActionOnlyRows = [
    ...artifactRows(context, ['next_actions', 'next_action']),
    ...contractRows(context, 'next_actions')
  ]
    .map((row, index) => normalizeLeadRow(row, index, { id: `${context.id || 'next-action'}-next`, owner: context.source_app_label || context.source_app || 'CAIt' }))
    .filter(Boolean);
  const markdownSources = [
    ...(Array.isArray(context.artifacts) ? context.artifacts : []),
    ...(Array.isArray(context.delivery_files) ? context.delivery_files : [])
  ];
  const parsed = markdownSources.flatMap((artifact, index) => {
    const content = String(artifact?.content || artifact?.body || artifact?.text || artifact?.markdown || artifact?.summary || '').trim();
    if (!content) return [];
    return parseLeadRowsFromMarkdown(content, {
      id: artifact?.id || artifact?.name || `artifact-${index + 1}`,
      owner: artifact?.owner || context.source_app_label || context.source_app || 'CAIt',
      segment: artifact?.segment || artifact?.type || 'Imported lead'
    });
  });
  const seen = new Set();
  const merged = [...structured, ...evidenceOnlyRows, ...nextActionOnlyRows, ...parsed].filter((lead) => {
    const key = `${String(lead.company || '').toLowerCase()}|${String(lead.evidenceUrl || lead.website || '').toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return applyLeadSupplementArtifacts(merged, context);
}

function leadEmailDraftArtifacts(context = {}) {
  const artifactDrafts = artifactsByType(context, ['email_draft', 'email_drafts', 'outreach_draft', 'outreach_drafts'])
    .flatMap((artifact) => {
      if (Array.isArray(artifact?.rows)) return artifact.rows;
      if (Array.isArray(artifact?.drafts)) return artifact.drafts;
      if (Array.isArray(artifact?.items)) return artifact.items;
      return [artifact];
    })
    .filter((draft) => draft && typeof draft === 'object');
  return [...artifactDrafts, ...contractRows(context, 'email_drafts')];
}

function leadOutreachPlanArtifacts(context = {}) {
  return [
    ...artifactsByType(context, ['outreach_plan', 'outreach_plans']),
    ...contractValues(context, 'outreach_plan').map(structuredPayload)
  ].filter((plan) => plan && typeof plan === 'object');
}

function applyEmailDraftArtifacts(importedLeads = [], context = {}) {
  const drafts = leadEmailDraftArtifacts(context);
  drafts.forEach((draft, index) => {
    const leadId = rowValue(draft, ['lead_id', 'leadId', 'id']);
    const company = rowValue(draft, ['company', 'company_name', 'lead', 'target']);
    const target = importedLeads.find((lead) => leadId && String(lead.id || '') === leadId)
      || importedLeads.find((lead) => company && String(lead.company || '').toLowerCase() === company.toLowerCase())
      || (drafts.length === 1 && index === 0 ? importedLeads[0] : null);
    if (!target) return;
    target.channel = normalizeChannel(draft.channel || target.channel);
    target.consent = String(draft.consent || draft.consent_basis || target.consent || 'needs_review');
    target.sendMode = normalizeSendMode(draft.send_mode || draft.sendMode || target.sendMode);
    target.scheduleAt = String(draft.schedule_at || draft.scheduleAt || target.scheduleAt || '');
    target.triggerEvent = String(draft.trigger_event || draft.triggerEvent || target.triggerEvent || 'none');
    target.triggerCondition = String(draft.trigger_condition || draft.triggerCondition || target.triggerCondition || '');
    target.senderEmail = String(draft.sender_email || draft.senderEmail || draft.from || target.senderEmail || '');
    target.replyToEmail = String(draft.reply_to_email || draft.replyToEmail || draft.replyTo || target.replyToEmail || '');
    target.subject = String(draft.subject || draft.email_subject || target.subject || '');
    target.body = String(draft.body || draft.message || draft.email_body || target.body || '');
    target.status = String(draft.status || target.status || 'draft');
  });
  return importedLeads;
}

function applyOutreachSteps(importedLeads = [], outreachSteps = []) {
  outreachSteps.forEach((step) => {
    const target = importedLeads.find((lead) => lead.id === String(step.lead_id || step.leadId || ''));
    if (!target) return;
    target.channel = normalizeChannel(step.channel || target.channel);
    target.consent = String(step.consent || step.consent_basis || target.consent || 'needs_review');
    target.sendMode = normalizeSendMode(step.send_mode || step.sendMode || target.sendMode);
    target.scheduleAt = String(step.schedule_at || step.scheduleAt || target.scheduleAt || '');
    target.triggerEvent = String(step.trigger_event || step.triggerEvent || target.triggerEvent || 'none');
    target.triggerCondition = String(step.trigger_condition || step.triggerCondition || target.triggerCondition || '');
    target.senderEmail = String(step.sender_email || step.senderEmail || step.from || target.senderEmail || '');
    target.replyToEmail = String(step.reply_to_email || step.replyToEmail || step.replyTo || target.replyToEmail || '');
    target.subject = String(step.subject || target.subject || '');
    target.body = String(step.body || step.message || target.body || '');
    target.status = String(step.status || target.status || 'draft');
  });
  return importedLeads;
}

function applyInboundContext(context = null) {
  if (!context) return;
  importedContext = context;
  const leadRows = leadRowsFromContextArtifacts(context);
  const emailDraft = leadEmailDraftArtifacts(context)[0] || {};
  const outreachPlan = leadOutreachPlanArtifacts(context)[0] || {};
  const outreachSteps = Array.isArray(outreachPlan.steps) ? outreachPlan.steps : [];
  const importedLeads = leadRows;
  if (!importedLeads.length) {
    importedLeads.push({
      id: String(context.id || 'imported-lead-context'),
      company: String(context.title || 'Imported CAIt lead context'),
      segment: String(context.source_app_label || context.source_app || 'Imported context'),
      contact: '',
      evidenceUrl: '',
      fit: String(context.summary || ''),
      status: 'review',
      owner: 'CAIt',
      nextAction: 'Review the imported context and create lead rows only from public evidence.',
      channel: 'email',
      consent: 'needs_review',
      sendMode: 'manual_approval',
      scheduleAt: '',
      triggerEvent: 'none',
      triggerCondition: '',
      senderEmail: '',
      replyToEmail: '',
      subject: '',
      body: ''
    });
  }
  applyOutreachSteps(importedLeads, outreachSteps);
  if (emailDraft?.lead_id || emailDraft?.subject || emailDraft?.body) {
    const target = importedLeads.find((lead) => lead.id === String(emailDraft.lead_id || '')) || importedLeads[0];
    target.channel = normalizeChannel(emailDraft.channel || target.channel);
    target.consent = String(emailDraft.consent || emailDraft.consent_basis || target.consent || 'needs_review');
    target.sendMode = normalizeSendMode(emailDraft.send_mode || emailDraft.sendMode || target.sendMode);
    target.scheduleAt = String(emailDraft.schedule_at || emailDraft.scheduleAt || target.scheduleAt || '');
    target.triggerEvent = String(emailDraft.trigger_event || emailDraft.triggerEvent || target.triggerEvent || 'none');
    target.triggerCondition = String(emailDraft.trigger_condition || emailDraft.triggerCondition || target.triggerCondition || '');
    target.senderEmail = String(emailDraft.sender_email || emailDraft.senderEmail || emailDraft.from || target.senderEmail || '');
    target.replyToEmail = String(emailDraft.reply_to_email || emailDraft.replyToEmail || emailDraft.replyTo || target.replyToEmail || '');
    target.subject = String(emailDraft.subject || target.subject || '');
    target.body = String(emailDraft.body || target.body || '');
    target.status = String(emailDraft.status || target.status || 'draft');
  }
  applyEmailDraftArtifacts(importedLeads, context);
  applyOutreachSteps(importedLeads, outreachSteps);
  leads = importedLeads;
  selectedId = leads[0]?.id || '';
  const target = (Array.isArray(context.handoff_targets) ? context.handoff_targets : []).find(Boolean);
  if (target && [...els.leaderSelect.options].some((option) => option.value === target)) els.leaderSelect.value = target;
}

function leadFromDeliveryItem(item = {}, index = 0) {
  const metadata = item.metadata && typeof item.metadata === 'object' ? item.metadata : {};
  const itemType = String(item.itemType || '').toLowerCase();
  const isEmail = /email|outreach/.test(itemType);
  return {
    id: String(item.id || `delivery-lead-${index + 1}`),
    company: String(metadata.company || metadata.company_name || metadata.lead || item.title || `Delivery lead ${index + 1}`),
    segment: String(metadata.segment || metadata.persona || item.workflowTask || 'Saved CAIt delivery item'),
    contact: String(firstText(metadata.contact, metadata.recipient, metadata.email, metadata.contact_path) || ''),
    evidenceUrl: String(firstText(metadata.evidence_url, metadata.source_url, metadata.url, item.source?.job_id ? `/delivery-manager.html?order_id=${item.source.job_id}` : '') || ''),
    fit: String(metadata.fit || metadata.why_fit || item.summary || ''),
    status: String(item.status || (isEmail ? 'draft' : 'review')).replace(/needs_review/i, 'review'),
    owner: String(item.workflowAgentName || metadata.owner || 'CAIt'),
    nextAction: String(metadata.next_action || item.summary || 'Review this saved delivery item before outreach.'),
    channel: normalizeChannel(metadata.channel || (isEmail ? 'email' : '')),
    consent: String(metadata.consent || metadata.consent_basis || 'needs_review'),
    sendMode: normalizeSendMode(metadata.send_mode || metadata.execution_mode || ''),
    scheduleAt: String(metadata.schedule_at || metadata.scheduled_at || ''),
    triggerEvent: String(metadata.trigger_event || 'none'),
    triggerCondition: String(metadata.trigger_condition || ''),
    senderEmail: String(metadata.sender_email || metadata.from || ''),
    replyToEmail: String(metadata.reply_to_email || metadata.replyTo || ''),
    subject: String(metadata.subject || (isEmail ? item.title : '')),
    body: String(isEmail ? (item.body || '') : '')
  };
}

function leadRowsFromDeliveryItem(item = {}, index = 0) {
  const metadata = item.metadata && typeof item.metadata === 'object' ? item.metadata : {};
  const content = String(item.body || item.summary || '').trim();
  const parsed = parseLeadRowsFromMarkdown(content, {
    id: item.id || `delivery-lead-${index + 1}`,
    owner: item.workflowAgentName || metadata.owner || 'CAIt',
    segment: item.workflowTask || metadata.segment || 'Saved CAIt delivery item'
  });
  if (parsed.length) return parsed;
  const normalized = normalizeLeadRow({
    id: item.id,
    company: metadata.company || metadata.company_name || metadata.lead || item.title,
    segment: metadata.segment || metadata.persona || item.workflowTask,
    contact: firstText(metadata.contact, metadata.recipient, metadata.email, metadata.contact_path),
    evidence_url: firstText(metadata.evidence_url, metadata.source_url, metadata.url, item.source?.job_id ? `/delivery-manager.html?order_id=${item.source.job_id}` : ''),
    fit: metadata.fit || metadata.why_fit || item.summary,
    status: item.status,
    owner: item.workflowAgentName || metadata.owner,
    next_action: metadata.next_action || item.summary,
    channel: metadata.channel,
    consent: metadata.consent || metadata.consent_basis,
    send_mode: metadata.send_mode || metadata.execution_mode,
    schedule_at: metadata.schedule_at || metadata.scheduled_at,
    trigger_event: metadata.trigger_event,
    trigger_condition: metadata.trigger_condition,
    sender_email: metadata.sender_email || metadata.from,
    reply_to_email: metadata.reply_to_email || metadata.replyTo,
    subject: metadata.subject,
    body: /email|outreach/.test(String(item.itemType || '').toLowerCase()) ? item.body : ''
  }, index, { id: item.id || `delivery-lead-${index + 1}`, owner: item.workflowAgentName || metadata.owner || 'CAIt' });
  return normalized ? [normalized] : [leadFromDeliveryItem(item, index)];
}

async function loadLeadDeliveryItems() {
  try {
    const payload = await apiJson('/api/delivery-items?surface=lead&limit=100');
    const imported = (Array.isArray(payload.items) ? payload.items : [])
      .flatMap(leadRowsFromDeliveryItem)
      .filter((lead) => lead.company || lead.body || lead.fit);
    if (!imported.length) return;
    const existing = new Set(leads.map((lead) => String(lead.id || '')));
    leads = [
      ...leads,
      ...imported.filter((lead) => !existing.has(String(lead.id || '')))
    ];
    if (!selectedId && leads[0]) selectedId = leads[0].id;
  } catch {
    // Logged-out users or empty workspaces simply have no saved lead items.
  }
}

function saveEditor() {
  const lead = selectedLead();
  if (!lead) return;
  lead.company = els.leadNameInput.value.trim();
  lead.contact = els.leadContactInput.value.trim();
  lead.evidenceUrl = els.leadSourceInput.value.trim();
  lead.channel = els.outreachChannelSelect.value;
  lead.consent = els.consentSelect.value;
  lead.sendMode = els.sendModeSelect.value;
  lead.scheduleAt = els.scheduleAtInput.value;
  lead.triggerEvent = els.triggerEventSelect.value;
  lead.triggerCondition = els.triggerConditionInput.value.trim();
  lead.senderEmail = els.senderEmailInput.value.trim();
  lead.replyToEmail = els.replyToEmailInput.value.trim();
  lead.subject = els.emailSubjectInput.value.trim();
  lead.body = els.emailBodyInput.value.trim();
}

function leadRowsPayload() {
  return leads.map(({ id, company, website, segment, contact, evidenceUrl, fit, status, owner, nextAction, channel, consent, sendMode, scheduleAt, triggerEvent, triggerCondition, senderEmail, replyToEmail }) => ({
    id,
    company,
    website,
    segment,
    contact,
    evidenceUrl,
    fit,
    status,
    owner,
    nextAction,
    channel,
    consent,
    send_mode: sendMode,
    schedule_at: scheduleAt,
    trigger_event: triggerEvent,
    trigger_condition: triggerCondition,
    sender_email: senderEmail,
    reply_to_email: replyToEmail
  }));
}

function leadSourcingRequestPayload() {
  const targetCount = Math.max(1, Math.min(100, Number(els.leadSourcingCountInput?.value || 20) || 20));
  return {
    target_segment: String(els.leadSourcingIcpInput?.value || '').trim(),
    source_policy: String(els.leadSourcingSourceInput?.value || '').trim(),
    target_count: targetCount,
    region_or_language: String(els.leadSourcingRegionInput?.value || '').trim(),
    offer_or_contact_reason: String(els.leadSourcingOfferInput?.value || '').trim(),
    exclusions: String(els.leadSourcingExclusionInput?.value || '').trim(),
    required_fields: [
      'company',
      'website',
      'public_email_or_contact_path',
      'contact_source_url',
      'why_fit',
      'observed_signal',
      'target_role_hypothesis',
      'company_specific_angle',
      'review_status',
      'next_action'
    ],
    output_contract: {
      app_id: 'lead-ops-console',
      artifact_types: ['lead_rows', 'evidence_urls', 'next_actions'],
      return_packet: 'lead_ops_packet'
    }
  };
}

function leadSourcingRequestReady(request = leadSourcingRequestPayload()) {
  return Boolean(request.target_segment && request.source_policy && request.offer_or_contact_reason);
}

function buildLeadSourcingContext() {
  const request = leadSourcingRequestPayload();
  const ready = leadSourcingRequestReady(request);
  return buildCaitAppContext({
    source_app: 'lead_ops_console',
    source_app_label: 'Lead Ops Console',
    title: ready ? `Lead sourcing request - ${request.target_segment.slice(0, 80)}` : 'Lead sourcing request',
    summary: ready
      ? `Find ${request.target_count} public-source lead rows for ${request.target_segment}. Return evidence URLs, contact paths, fit notes, and next actions as a Lead Ops packet.`
      : 'Lead sourcing request is missing target customer, source policy, or offer reason.',
    facts: [
      request.target_segment ? `Target customer / ICP: ${request.target_segment}` : 'Target customer / ICP is missing.',
      request.source_policy ? `Sources to use: ${request.source_policy}` : 'Sources to use are missing.',
      `Target count: ${request.target_count}`,
      request.region_or_language ? `Region / language: ${request.region_or_language}` : '',
      request.offer_or_contact_reason ? `Offer / reason to contact: ${request.offer_or_contact_reason}` : 'Offer / reason to contact is missing.',
      request.exclusions ? `Do not include: ${request.exclusions}` : ''
    ].filter(Boolean),
    assumptions: [
      'Use public-source company evidence only.',
      'Do not invent personal email addresses or private contact data.',
      'Rows without a public evidence URL or consent-safe contact path must be marked waiting.',
      'Return data in the Lead Ops app contract so it can be reopened and approved before outreach.'
    ],
    artifacts: [
      {
        type: 'lead_acquisition_request',
        ...request,
        status: ready ? 'ready_for_list_creator' : 'missing_required_fields'
      },
      {
        type: 'lead_rows',
        rows: []
      },
      {
        type: 'lead_ops_packet',
        leadRows: [],
        request
      }
    ],
    recommended_next_actions: [
      ready
        ? 'Create a List Creator order that returns reviewable lead_rows, evidence_urls, next_actions, and a lead_ops_packet for this request.'
        : 'Complete target customer, sources to use, and offer reason before dispatching List Creator.',
      'After List Creator returns rows, reopen Lead Ops to review evidence, consent, message drafts, and approval state.',
      'Keep outreach execution blocked until each row has source evidence and a consent-safe contact path.'
    ],
    handoff_targets: ['list_creator', 'cmo_leader', 'email_ops'],
    raw_context: {
      chat_handoff_id: leadChatHandoffId(),
      chat_return_to: leadChatReturnTo(),
      lead_return_to: currentLeadReturnPath(),
      lead_acquisition_request: request,
      lead_sourcing_ready: ready
    }
  });
}

function outreachStepsPayload() {
  return leads.map((lead) => ({
    lead_id: lead.id,
    company: lead.company,
    channel: lead.channel || 'email',
    contact: lead.contact || '',
    consent_basis: lead.consent || 'needs_review',
    send_mode: lead.sendMode || 'manual_approval',
    schedule_at: lead.scheduleAt || '',
    trigger_event: lead.triggerEvent || 'none',
    trigger_condition: lead.triggerCondition || '',
    sender_email: lead.senderEmail || '',
    reply_to_email: lead.replyToEmail || '',
    subject: lead.subject || '',
    body: lead.body || '',
    status: lead.status || 'review',
    evidence_url: lead.evidenceUrl || ''
  }));
}

function buildContext() {
  const target = String(els.leaderSelect.value || 'cmo_leader');
  const lead = selectedLead();
  const chatHandoffId = leadChatHandoffId();
  const chatReturnTo = leadChatReturnTo();
  const leadReturnTo = currentLeadReturnPath();
  if (!lead) {
    if (leadSourcingRequestReady()) return buildLeadSourcingContext();
    return buildCaitAppContext({
      source_app: 'lead_ops_console',
      source_app_label: 'Lead Ops Console',
      title: 'Lead Ops context',
      summary: 'No lead rows are loaded yet. Open this app from a CAIt context handoff before preparing email, SMS, scheduled, or event-triggered outreach plans.',
      facts: ['No lead rows, evidence URLs, contact paths, outreach channels, schedules, triggers, or messages are loaded.'],
      assumptions: ['No built-in demo lead data is used.', 'This app uses CAIt Resend for approved email sends only after explicit user confirmation. SMS remains a CAIt handoff.'],
      recommended_next_actions: ['Load a CAIt app context that contains lead_rows or ask List Creator / CMO Leader to produce public-source rows and consent-safe contact paths.'],
      handoff_targets: [target, 'list_creator', 'email_ops', 'sms_ops'],
      raw_context: {
        chat_handoff_id: chatHandoffId,
        chat_return_to: chatReturnTo,
        lead_return_to: leadReturnTo
      }
    });
  }
  return buildCaitAppContext({
    source_app: 'lead_ops_console',
    source_app_label: 'Lead Ops Console',
    title: `Lead Ops packet - ${lead.company}`,
    summary: `Lead outreach packet for ${lead.company}. Status is ${statusLabel(lead.status)}. Channel is ${lead.channel || 'email'} and send mode is ${lead.sendMode || 'manual_approval'}. This keeps evidence, consent, approval, schedule, trigger, and message state visible so CAIt can resume stable outreach operations instead of rerunning a disposable AIAGENT chat.`,
    facts: [
      importedContext ? `Imported context: ${importedContext.title || importedContext.id || 'CAIt app context'}` : '',
      `Selected lead: ${lead.company}`,
      `Segment: ${lead.segment}`,
      `Contact path: ${lead.contact || 'missing'}`,
      `Evidence URL: ${lead.evidenceUrl || 'missing'}`,
      `Outreach channel: ${lead.channel || 'email'}`,
      `Consent/basis: ${lead.consent || 'needs_review'}`,
      `Send mode: ${lead.sendMode || 'manual_approval'}`,
      lead.senderEmail ? `Resend sender: ${lead.senderEmail}` : '',
      lead.scheduleAt ? `Scheduled at: ${lead.scheduleAt}` : '',
      lead.triggerEvent && lead.triggerEvent !== 'none' ? `Trigger: ${lead.triggerEvent} (${lead.triggerCondition || 'condition not set'})` : '',
      `Status: ${statusLabel(lead.status)}`,
      `Next action: ${lead.nextAction}`,
      'This packet keeps public-source evidence, consent basis, send mode, and approval state attached to the next CAIt run.',
      resendResult.checked ? `Resend status: ${resendResult.status || 'checked'}` : ''
    ].filter(Boolean),
    assumptions: [
      'No guessed personal emails are used.',
      'This app sends email only through CAIt Resend after explicit user confirmation and server-side permission checks.',
      'This app does not send SMS. SMS outreach remains a CAIt execution packet until an SMS connector exists.',
      'Any scheduled or event-triggered execution must be confirmed by CAIt after consent, connector, and approval checks.'
    ],
    artifacts: [
      { type: 'lead_rows', rows: leadRowsPayload() },
      {
        type: 'outreach_plan',
        selected_lead_id: lead.id,
        execution_owner: target,
        steps: outreachStepsPayload()
      },
      {
        type: `${lead.channel === 'sms' ? 'sms' : 'email'}_draft`,
        lead_id: lead.id,
        channel: lead.channel || 'email',
        contact: lead.contact || '',
        sender_email: lead.senderEmail || '',
        reply_to_email: lead.replyToEmail || '',
        consent_basis: lead.consent || 'needs_review',
        send_mode: lead.sendMode || 'manual_approval',
        schedule_at: lead.scheduleAt || '',
        trigger_event: lead.triggerEvent || 'none',
        trigger_condition: lead.triggerCondition || '',
        subject: lead.subject,
        body: lead.body,
        status: lead.status
      },
      {
        type: 'email_drafts',
        rows: leads
          .filter((entry) => String(entry.channel || 'email') === 'email' && (entry.subject || entry.body))
          .map((entry) => ({
            lead_id: entry.id,
            company: entry.company,
            contact: entry.contact || '',
            sender_email: entry.senderEmail || '',
            reply_to_email: entry.replyToEmail || '',
            consent_basis: entry.consent || 'needs_review',
            send_mode: entry.sendMode || 'manual_approval',
            schedule_at: entry.scheduleAt || '',
            trigger_event: entry.triggerEvent || 'none',
            trigger_condition: entry.triggerCondition || '',
            subject: entry.subject || '',
            body: entry.body || '',
            status: entry.status || 'review'
          }))
      }
    ],
    approval_requests: [
      {
        id: `outreach-${lead.id}`,
        title: `${lead.channel || 'email'} outreach for ${lead.company}`,
        action_type: lead.sendMode === 'event_trigger' ? 'event_triggered_outreach' : (lead.sendMode === 'scheduled' ? 'scheduled_outreach' : 'outreach_draft'),
        status: ['approved', 'scheduled', 'triggered'].includes(lead.status) ? 'approved' : 'needs approval',
        target: lead.company,
        channel: lead.channel || 'email',
        consent_basis: lead.consent || 'needs_review',
        schedule_at: lead.scheduleAt || '',
        trigger_event: lead.triggerEvent || 'none'
      }
    ],
    recommended_next_actions: [
      'Ask CMO Leader to confirm whether this lead belongs in direct outreach, nurture sequence, partner collaboration, or manual review.',
      'For scheduled outreach, create the CAIt schedule only after contact path, consent basis, and connector state are verified.',
      'For event-triggered outreach, bind the trigger to a concrete CAIt event or CRM signal before execution.',
      'Keep any row without a public source URL or consent-safe contact path waiting for review.'
    ],
    handoff_targets: [target, 'list_creator', 'email_ops', 'sms_ops'],
    raw_context: {
      ...(importedContext ? { received_context: importedContext } : {}),
      chat_handoff_id: chatHandoffId,
      chat_return_to: chatReturnTo,
      lead_return_to: leadReturnTo,
      selected_lead_id: lead.id,
      selected_lead_status: lead.status || 'review',
      lead_counts: {
        total: leads.length,
        draft: leads.filter((entry) => entry.status === 'draft').length,
        approved: leads.filter((entry) => entry.status === 'approved').length,
        scheduled: leads.filter((entry) => entry.status === 'scheduled').length,
        trigger_ready: leads.filter((entry) => entry.status === 'triggered').length,
        waiting: leads.filter((entry) => entry.status === 'blocked').length
      },
      resend_result: resendResult.checked ? resendResult : null
    }
  });
}

function resendDraftFromLead(lead = null) {
  if (!lead) return null;
  return {
    target: 'cait_resend',
    actionMode: lead.sendMode === 'scheduled' ? 'schedule_ready' : 'send_ready',
    recipientEmail: String(lead.contact || '').trim(),
    senderEmail: String(lead.senderEmail || '').trim(),
    replyToEmail: String(lead.replyToEmail || '').trim(),
    emailSubject: String(lead.subject || '').trim(),
    emailBody: String(lead.body || '').trim(),
    scheduledAt: String(lead.scheduleAt || '').trim()
  };
}

function validateResendLead(lead = null, requireSchedule = false) {
  if (!lead) return 'Select a lead first.';
  if (String(lead.channel || 'email') !== 'email') return 'CAIt Resend can send email only. Use CAIt handoff for SMS or other channels.';
  if (!['approved', 'scheduled'].includes(String(lead.status || '').toLowerCase())) return 'Approve the lead before sending or scheduling through Resend.';
  if (!validEmail(lead.contact)) return 'Contact path must be a valid recipient email before Resend execution.';
  if (!validEmail(lead.senderEmail)) return 'Resend from email must be a valid sender email.';
  if (lead.replyToEmail && !validEmail(lead.replyToEmail)) return 'Reply-to email is invalid.';
  if (!String(lead.subject || '').trim()) return 'Subject is required before Resend execution.';
  if (!String(lead.body || '').trim()) return 'Message body is required before Resend execution.';
  if (requireSchedule && !String(lead.scheduleAt || '').trim()) return 'Schedule at is required before scheduling through Resend.';
  return '';
}

async function executeResendSend() {
  saveEditor();
  const lead = selectedLead();
  const validation = validateResendLead(lead, false);
  if (validation) {
    window.alert(validation);
    return;
  }
  const confirmed = window.confirm(`Send this email through CAIt Resend now?\n\nTo: ${lead.contact}\nSubject: ${lead.subject}`);
  if (!confirmed) return;
  els.sendResendBtn.textContent = 'Sending';
  try {
    const payload = await apiJson('/api/deliveries/execute', {
      method: 'POST',
      body: JSON.stringify({
        action_kind: 'resend_send',
        confirm_execute: true,
        draft: resendDraftFromLead(lead),
        deliverable: {
          kind: 'lead_outreach',
          title: `Lead outreach email - ${lead.company}`,
          content: lead.body
        },
        source: 'lead_ops_console'
      })
    });
    resendResult = { checked: true, status: `Resend sent to ${payload?.entity?.to || lead.contact}.`, result: payload };
    lead.status = 'sent';
  } catch (error) {
    resendResult = { checked: true, status: String(error?.message || error || 'Resend send failed'), result: error?.payload || null };
  } finally {
    els.sendResendBtn.textContent = 'Send email via Resend';
    render();
  }
}

async function scheduleResendSend() {
  saveEditor();
  const lead = selectedLead();
  const validation = validateResendLead(lead, true);
  if (validation) {
    window.alert(validation);
    return;
  }
  const confirmed = window.confirm(`Schedule this email through CAIt Resend?\n\nTo: ${lead.contact}\nWhen: ${lead.scheduleAt}`);
  if (!confirmed) return;
  els.scheduleResendBtn.textContent = 'Scheduling';
  try {
    const payload = await apiJson('/api/deliveries/schedule', {
      method: 'POST',
      body: JSON.stringify({
        action_kind: 'resend_send',
        confirm_schedule: true,
        scheduled_for: lead.scheduleAt,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Tokyo',
        task_type: 'email_ops',
        draft: resendDraftFromLead(lead),
        deliverable: {
          kind: 'lead_outreach',
          title: `Scheduled lead outreach email - ${lead.company}`,
          content: lead.body
        },
        preview_text: `${lead.subject}\n\n${lead.body}`,
        source: 'lead_ops_console'
      })
    });
    resendResult = { checked: true, status: `Resend schedule created for ${payload?.entity?.next_run_at || lead.scheduleAt}.`, result: payload };
    lead.status = 'scheduled';
  } catch (error) {
    resendResult = { checked: true, status: String(error?.message || error || 'Resend schedule failed'), result: error?.payload || null };
  } finally {
    els.scheduleResendBtn.textContent = 'Schedule via Resend';
    render();
  }
}

function renderMetrics() {
  els.leadTotalMetric.textContent = leads.length;
  els.leadDraftMetric.textContent = leads.filter((lead) => lead.status === 'draft').length;
  els.leadApprovedMetric.textContent = leads.filter((lead) => lead.status === 'approved').length;
  els.leadScheduledMetric.textContent = leads.filter((lead) => lead.status === 'scheduled').length;
  els.leadTriggeredMetric.textContent = leads.filter((lead) => lead.status === 'triggered').length;
  els.leadBlockedMetric.textContent = leads.filter((lead) => lead.status === 'blocked').length;
  els.leadAllNavCount.textContent = String(leads.length);
  els.leadReviewNavCount.textContent = String(leads.filter((lead) => lead.status === 'review').length);
  els.leadDraftNavCount.textContent = String(leads.filter((lead) => lead.status === 'draft').length);
  els.leadApprovedNavCount.textContent = String(leads.filter((lead) => lead.status === 'approved').length);
  els.leadScheduledNavCount.textContent = String(leads.filter((lead) => lead.status === 'scheduled').length);
  els.leadTriggeredNavCount.textContent = String(leads.filter((lead) => lead.status === 'triggered').length);
  els.leadBlockedNavCount.textContent = String(leads.filter((lead) => lead.status === 'blocked').length);
}

function renderTable() {
  const rows = visibleLeads();
  if (!rows.some((lead) => lead.id === selectedId) && rows[0]) selectedId = rows[0].id;
  els.leadTable.innerHTML = rows.length ? [
    '<thead><tr><th>Lead</th><th>Channel</th><th>Mode</th><th>Status</th></tr></thead><tbody>',
    ...rows.map((lead) => `<tr class="${lead.id === selectedId ? 'active-row' : ''}" data-lead="${escapeHtml(lead.id)}"><td><strong>${escapeHtml(lead.company)}</strong><br>${escapeHtml(lead.contact || lead.evidenceUrl || lead.website || 'missing contact path')}</td><td>${escapeHtml(lead.channel || 'email')}<br>${escapeHtml(lead.consent || 'needs_review')}</td><td>${escapeHtml(lead.sendMode || 'manual_approval')}<br>${escapeHtml(lead.scheduleAt || (lead.triggerEvent && lead.triggerEvent !== 'none' ? lead.triggerEvent : 'manual'))}</td><td><span class="status-pill ${statusClass(lead.status)}">${escapeHtml(statusLabel(lead.status))}</span></td></tr>`),
    '</tbody>'
  ].join('') : '<tbody><tr><td colspan="4"><div class="empty-state"><strong>No lead rows loaded.</strong><span>Open this app from a CAIt context handoff or ask List Creator / CMO Leader to produce public-source rows.</span></div></td></tr></tbody>';
}

function renderEditor() {
  const lead = selectedLead();
  els.leadNameInput.value = lead?.company || '';
  els.leadContactInput.value = lead?.contact || '';
  els.leadSourceInput.value = lead?.evidenceUrl || '';
  els.outreachChannelSelect.value = selectedOptionValue(els.outreachChannelSelect, lead?.channel || 'email');
  els.consentSelect.value = selectedOptionValue(els.consentSelect, lead?.consent || 'needs_review');
  els.sendModeSelect.value = selectedOptionValue(els.sendModeSelect, lead?.sendMode || 'manual_approval');
  els.scheduleAtInput.value = lead?.scheduleAt || '';
  els.triggerEventSelect.value = selectedOptionValue(els.triggerEventSelect, lead?.triggerEvent || 'none');
  els.triggerConditionInput.value = lead?.triggerCondition || '';
  els.senderEmailInput.value = lead?.senderEmail || '';
  els.replyToEmailInput.value = lead?.replyToEmail || '';
  els.emailSubjectInput.value = lead?.subject || '';
  els.emailBodyInput.value = lead?.body || '';
  els.leadStatusPill.textContent = statusLabel(lead?.status || 'no rows');
  els.leadStatusPill.className = `status-pill ${statusClass(lead?.status || '')}`;
}

function render() {
  renderMetrics();
  renderLeadHandoffSessionNotice();
  renderTable();
  renderEditor();
  renderWorkflowState();
  renderLeadOpsReadiness();
  renderLeadSourcingState();
  renderResendState();
  els.leadContextPreview.textContent = JSON.stringify(buildContext(), null, 2);
}

function renderLeadSourcingState() {
  const request = leadSourcingRequestPayload();
  const required = [
    ['target customer', request.target_segment],
    ['sources', request.source_policy],
    ['offer reason', request.offer_or_contact_reason]
  ];
  const missing = required.filter(([, value]) => !String(value || '').trim()).map(([label]) => label);
  const ready = missing.length === 0;
  if (els.leadSourcingPill) {
    els.leadSourcingPill.textContent = ready ? `Ready to request ${request.target_count} leads` : `Missing ${missing.join(', ')}`;
    els.leadSourcingPill.className = `status-pill ${ready ? 'approved' : 'pending'}`;
  }
  if (els.leadSourcingNote) {
    els.leadSourcingNote.textContent = ready
      ? 'Ready to ask List Creator for public-source lead rows that can return directly into Lead Ops.'
      : 'Fill target customer, sources to use, and offer reason before asking List Creator to source leads.';
  }
}

function renderLeadHandoffSessionNotice() {
  const returnTo = leadChatReturnTo();
  const handoffId = leadChatHandoffId();
  const hasImportedServerContext = Boolean(importedContext?.id);
  if (els.leadReturnToChatLink) {
    if (returnTo) {
      els.leadReturnToChatLink.hidden = false;
      els.leadReturnToChatLink.href = returnTo;
    } else {
      els.leadReturnToChatLink.hidden = true;
      els.leadReturnToChatLink.href = '/chat';
    }
  }
  if (!els.leadHandoffSessionNotice) return;
  const fragments = [];
  if (returnTo) fragments.push('Return path to the same CAIt chat is pinned.');
  if (hasImportedServerContext) fragments.push('Server-side lead context is loaded.');
  if (handoffId) fragments.push(`Handoff ID: ${handoffId}.`);
  if (!fragments.length) {
    els.leadHandoffSessionNotice.hidden = true;
    els.leadHandoffSessionNotice.className = 'notice';
    els.leadHandoffSessionNotice.textContent = '';
    return;
  }
  const warning = returnTo && !hasImportedServerContext;
  els.leadHandoffSessionNotice.hidden = false;
  els.leadHandoffSessionNotice.className = `notice${warning ? ' notice-warning' : ''}`;
  els.leadHandoffSessionNotice.innerHTML = [
    `<strong>${escapeHtml(warning ? 'Chat handoff is open but no server lead packet is loaded yet.' : 'CAIt lead handoff session is attached.')}</strong>`,
    `<span>${escapeHtml(fragments.join(' '))}</span>`
  ].join('');
}

function renderLeadOpsReadiness() {
  const lead = selectedLead();
  const approved = ['approved', 'scheduled', 'triggered', 'sent'].includes(String(lead?.status || '').toLowerCase());
  const hasEvidence = Boolean(String(lead?.evidenceUrl || '').trim());
  const hasContact = Boolean(String(lead?.contact || '').trim());
  const hasMessage = Boolean(String(lead?.subject || '').trim() && String(lead?.body || '').trim());
  const hasScheduleRule = String(lead?.sendMode || '') === 'scheduled'
    ? Boolean(String(lead?.scheduleAt || '').trim())
    : true;
  const hasTriggerRule = String(lead?.sendMode || '') === 'event_trigger'
    ? Boolean(String(lead?.triggerEvent || '').trim() && String(lead?.triggerEvent || '') !== 'none' && String(lead?.triggerCondition || '').trim())
    : true;
  const hasServerContext = Boolean(importedContext?.id);
  const hasChatReturn = Boolean(leadChatReturnTo() || leadChatHandoffId());
  const readinessItems = [
    {
      title: 'Lead evidence stays attached',
      detail: lead
        ? `${lead.company} keeps ${hasEvidence ? 'a public source URL' : 'a missing source warning'} and ${hasContact ? 'a contact path' : 'a missing contact warning'}.`
        : 'Load lead rows from CAIt so the next agent can inspect public evidence before outreach.',
      status: lead && hasEvidence && hasContact ? 'ready' : (lead ? 'pending' : 'blocked')
    },
    {
      title: 'Consent and approval are explicit',
      detail: lead
        ? `${lead.consent || 'needs_review'} consent basis with ${statusLabel(lead.status)} status.`
        : 'No consent or approval state is loaded yet.',
      status: approved ? 'ready' : (String(lead?.status || '') === 'blocked' ? 'blocked' : 'pending')
    },
    {
      title: 'Execution rule is reusable',
      detail: lead
        ? `${lead.channel || 'email'} uses ${lead.sendMode || 'manual_approval'}${lead.scheduleAt ? ` at ${lead.scheduleAt}` : ''}${lead.triggerEvent && lead.triggerEvent !== 'none' ? ` after ${lead.triggerEvent}` : ''}.`
        : 'No channel, schedule, trigger, or message is loaded.',
      status: lead && hasMessage && hasScheduleRule && hasTriggerRule ? 'ready' : (lead ? 'pending' : 'blocked')
    },
    {
      title: 'CAIt can reopen the same lead packet',
      detail: hasServerContext
        ? 'Server-side context return data is preserved for the next CAIt run.'
        : (hasChatReturn
          ? 'The chat return route is pinned; Send to CAIt will create the server-side lead packet reference.'
          : 'Open this app from a CAIt handoff to preserve chat return routing and server-side context references.'),
      status: hasServerContext ? 'ready' : (hasChatReturn ? 'pending' : 'blocked')
    }
  ];
  if (els.leadOpsReadinessPill) {
    const readyCount = readinessItems.filter((entry) => entry.status === 'ready').length;
    const blockedCount = readinessItems.filter((entry) => entry.status === 'blocked').length;
    const pillStatus = readyCount === readinessItems.length ? 'approved' : blockedCount ? 'blocked' : 'pending';
    els.leadOpsReadinessPill.textContent = lead
      ? `${readyCount}/${readinessItems.length} ops checks ready`
      : 'Rows not loaded';
    els.leadOpsReadinessPill.className = `status-pill ${lead ? pillStatus : 'pending'}`;
  }
  if (els.leadOpsReadinessList) {
    els.leadOpsReadinessList.innerHTML = readinessItems.map((entry) => [
      `<article class="ops-readiness-item ${entry.status}">`,
      `<strong>${escapeHtml(entry.title)}</strong>`,
      `<span>${escapeHtml(entry.detail)}</span>`,
      '</article>'
    ].join('')).join('');
  }
}

function renderResendState() {
  const lead = selectedLead();
  const isEmail = String(lead?.channel || 'email') === 'email';
  const approved = ['approved', 'scheduled'].includes(String(lead?.status || '').toLowerCase());
  const canSend = Boolean(lead && isEmail && approved);
  if (els.sendResendBtn) els.sendResendBtn.disabled = !canSend;
  if (els.scheduleResendBtn) els.scheduleResendBtn.disabled = !canSend;
  if (!els.resendStatusNote) return;
  if (resendResult.checked) {
    els.resendStatusNote.textContent = resendResult.status || 'Resend action completed.';
    return;
  }
  if (!lead) {
    els.resendStatusNote.textContent = 'Load and select a lead before using Resend.';
  } else if (!isEmail) {
    els.resendStatusNote.textContent = 'Resend is email-only. Keep SMS and other channels as CAIt handoffs.';
  } else if (!approved) {
    els.resendStatusNote.textContent = 'Approve this email lead before sending or scheduling through Resend.';
  } else {
    els.resendStatusNote.textContent = 'Ready for CAIt Resend after recipient, from email, subject, and body are valid.';
  }
}

function setWorkflowStep(element, status = '', detail = '') {
  if (!element) return;
  element.className = `workflow-step ${status}`.trim();
  const detailNode = element.querySelector('span:last-child span:last-child');
  if (detailNode && detail) detailNode.textContent = detail;
}

function renderWorkflowState() {
  const lead = selectedLead();
  const status = String(lead?.status || '').toLowerCase();
  const hasPlan = Boolean(lead?.subject || lead?.body || lead?.sendMode || lead?.channel || status === 'draft' || status === 'approved' || status === 'scheduled' || status === 'triggered');
  const approved = ['approved', 'scheduled', 'triggered', 'sent'].includes(status);
  const executionLabel = status === 'scheduled'
    ? `Scheduled for ${lead?.scheduleAt || 'a pending time'}.`
    : (status === 'triggered' ? `Trigger waits for ${lead?.triggerEvent || 'an event'}.` : (status === 'sent' ? 'Email was sent through CAIt Resend.' : 'Selected lead is approved for leader handoff.'));
  setWorkflowStep(
    els.leadStepLoad,
    lead ? 'done' : 'current',
    lead ? `${leads.length} lead row${leads.length === 1 ? '' : 's'} loaded. Selected: ${lead.company}` : 'No lead rows are loaded.'
  );
  setWorkflowStep(
    els.leadStepDraft,
    hasPlan ? 'done' : (lead ? 'current' : ''),
    hasPlan ? `${lead?.channel || 'email'} plan uses ${lead?.sendMode || 'manual approval'}.` : 'Choose channel, message, schedule, or trigger before approval.'
  );
  setWorkflowStep(
    els.leadStepApproval,
    approved ? 'done' : (status === 'blocked' ? 'blocked' : (hasPlan ? 'current' : '')),
    approved ? executionLabel : (status === 'blocked' ? 'Selected lead is waiting on evidence or consent.' : 'Approve only after evidence, consent, and send rule are reviewed.')
  );
  if (els.sendLeadContextBtn) els.sendLeadContextBtn.textContent = approved ? 'Send outreach plan' : 'Send to CAIt';
}

function setSelectedLeadStatus(status = 'review') {
  saveEditor();
  if (selectedLead()) selectedLead().status = status;
  render();
}

els.statusButtons.forEach((button) => {
  button.addEventListener('click', () => {
    saveEditor();
    filter = String(button.dataset.status || 'all');
    els.statusButtons.forEach((item) => item.classList.toggle('active', item === button));
    render();
  });
});

els.leadTable.addEventListener('click', (event) => {
  const row = event.target.closest('[data-lead]');
  if (!row) return;
  saveEditor();
  selectedId = String(row.dataset.lead || selectedId);
  render();
});

[els.leadNameInput, els.leadContactInput, els.leadSourceInput, els.outreachChannelSelect, els.consentSelect, els.sendModeSelect, els.scheduleAtInput, els.triggerEventSelect, els.triggerConditionInput, els.senderEmailInput, els.replyToEmailInput, els.emailSubjectInput, els.emailBodyInput, els.leaderSelect].forEach((input) => {
  input.addEventListener('input', () => {
    saveEditor();
    els.leadContextPreview.textContent = JSON.stringify(buildContext(), null, 2);
  });
  input.addEventListener('change', () => {
    saveEditor();
    render();
  });
});

[els.leadSourcingIcpInput, els.leadSourcingSourceInput, els.leadSourcingCountInput, els.leadSourcingRegionInput, els.leadSourcingOfferInput, els.leadSourcingExclusionInput].forEach((input) => {
  input?.addEventListener('input', () => {
    renderLeadSourcingState();
    if (!selectedLead()) els.leadContextPreview.textContent = JSON.stringify(buildLeadSourcingContext(), null, 2);
  });
  input?.addEventListener('change', () => {
    renderLeadSourcingState();
    if (!selectedLead()) els.leadContextPreview.textContent = JSON.stringify(buildLeadSourcingContext(), null, 2);
  });
});

els.markDraftBtn.addEventListener('click', () => {
  setSelectedLeadStatus('draft');
});

els.approveLeadBtn?.addEventListener('click', () => setSelectedLeadStatus('approved'));
els.scheduleLeadBtn?.addEventListener('click', () => {
  saveEditor();
  if (selectedLead()) {
    selectedLead().sendMode = 'scheduled';
    selectedLead().status = 'scheduled';
  }
  render();
});
els.triggerLeadBtn?.addEventListener('click', () => {
  saveEditor();
  if (selectedLead()) {
    selectedLead().sendMode = 'event_trigger';
    if (!selectedLead().triggerEvent || selectedLead().triggerEvent === 'none') selectedLead().triggerEvent = 'lead_created';
    selectedLead().status = 'triggered';
  }
  render();
});
els.waitLeadBtn?.addEventListener('click', () => setSelectedLeadStatus('blocked'));
els.sendResendBtn?.addEventListener('click', () => {
  void executeResendSend();
});
els.scheduleResendBtn?.addEventListener('click', () => {
  void scheduleResendSend();
});

els.requestLeadSourcingBtn?.addEventListener('click', () => {
  const request = leadSourcingRequestPayload();
  if (!leadSourcingRequestReady(request)) {
    window.alert('Fill target customer, sources to use, and offer reason before asking List Creator.');
    renderLeadSourcingState();
    return;
  }
  const returnTo = leadChatReturnTo();
  void sendContextToCait(buildLeadSourcingContext(), { returnTo }).catch((error) => {
    window.alert(`Lead sourcing request failed: ${error.message}`);
  });
});

els.copyLeadSourcingBtn?.addEventListener('click', async () => {
  await copyContextJson(buildLeadSourcingContext());
  els.copyLeadSourcingBtn.textContent = 'Copied';
  window.setTimeout(() => { els.copyLeadSourcingBtn.textContent = 'Copy sourcing request'; }, 1200);
});

els.sendLeadContextBtn.addEventListener('click', () => {
  saveEditor();
  const returnTo = leadChatReturnTo();
  void sendContextToCait(buildContext(), { returnTo }).catch((error) => {
    window.alert(`CAIt context handoff failed: ${error.message}`);
  });
});

els.copyLeadContextBtn.addEventListener('click', async () => {
  saveEditor();
  await copyContextJson(buildContext());
  els.copyLeadContextBtn.textContent = 'Copied';
  window.setTimeout(() => { els.copyLeadContextBtn.textContent = 'Copy context'; }, 1200);
});

async function bootstrap() {
  await refreshAuthSnapshot();
  applyInboundContext(await fetchCaitAppContextFromUrl());
  await loadLeadDeliveryItems();
  render();
}

void bootstrap();

function escapeHtml(value = '') {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
