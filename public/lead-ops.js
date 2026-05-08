import { buildCaitAppContext, copyContextJson, fetchCaitAppContextFromUrl, sendContextToCait } from './cait-app-bridge.js?v=20260508d';

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
  leadStepApproval: document.getElementById('leadStepApproval')
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

function artifactRows(context = {}, type = '') {
  const match = (Array.isArray(context.artifacts) ? context.artifacts : [])
    .find((artifact) => String(artifact?.type || '').toLowerCase() === String(type || '').toLowerCase());
  return Array.isArray(match?.rows) ? match.rows : [];
}

function applyInboundContext(context = null) {
  if (!context) return;
  importedContext = context;
  const leadRows = artifactRows(context, 'lead_rows');
  const emailDraft = (Array.isArray(context.artifacts) ? context.artifacts : [])
    .find((artifact) => String(artifact?.type || '').toLowerCase() === 'email_draft') || {};
  const outreachPlan = (Array.isArray(context.artifacts) ? context.artifacts : [])
    .find((artifact) => String(artifact?.type || '').toLowerCase() === 'outreach_plan') || {};
  const outreachSteps = Array.isArray(outreachPlan.steps) ? outreachPlan.steps : [];
  const importedLeads = leadRows.map((row, index) => ({
    id: String(row.id || `imported-lead-${index + 1}`),
    company: String(row.company || row.company_name || row.name || `Imported lead ${index + 1}`),
    segment: String(row.segment || row.persona || row.category || 'Imported lead'),
    contact: String(firstText(row.contact, row.email, row.phone, row.form_url, row.crm_id, row.contact_path) || ''),
    evidenceUrl: String(row.evidenceUrl || row.evidence_url || row.source_url || row.contact_source_url || row.url || ''),
    fit: String(row.fit || row.why_fit || row.observed_signal || ''),
    status: String(row.status || row.review_status || 'review'),
    owner: String(row.owner || row.agent || 'CAIt'),
    nextAction: String(row.nextAction || row.next_action || row.review_note || 'Review source evidence and approval state.'),
    channel: normalizeChannel(row.channel || row.outreach_channel || row.message_channel || ''),
    consent: String(row.consent || row.legal_basis || row.consent_basis || 'needs_review'),
    sendMode: normalizeSendMode(row.sendMode || row.send_mode || row.execution_mode || ''),
    scheduleAt: String(row.scheduleAt || row.schedule_at || row.scheduled_at || ''),
    triggerEvent: String(row.triggerEvent || row.trigger_event || 'none'),
    triggerCondition: String(row.triggerCondition || row.trigger_condition || ''),
    senderEmail: String(row.senderEmail || row.sender_email || row.from || ''),
    replyToEmail: String(row.replyToEmail || row.reply_to_email || row.replyTo || row.reply_to || ''),
    subject: String(row.subject || ''),
    body: String(row.body || '')
  }));
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
  leads = importedLeads;
  selectedId = leads[0]?.id || '';
  const target = (Array.isArray(context.handoff_targets) ? context.handoff_targets : []).find(Boolean);
  if (target && [...els.leaderSelect.options].some((option) => option.value === target)) els.leaderSelect.value = target;
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
  return leads.map(({ id, company, segment, contact, evidenceUrl, fit, status, owner, nextAction, channel, consent, sendMode, scheduleAt, triggerEvent, triggerCondition, senderEmail, replyToEmail }) => ({
    id,
    company,
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
  if (!lead) {
    return buildCaitAppContext({
      source_app: 'lead_ops_console',
      source_app_label: 'Lead Ops Console',
      title: 'Lead Ops context',
      summary: 'No lead rows are loaded yet. Open this app from a CAIt context handoff before preparing email, SMS, scheduled, or event-triggered outreach plans.',
      facts: ['No lead rows, evidence URLs, contact paths, outreach channels, schedules, triggers, or messages are loaded.'],
      assumptions: ['No built-in demo lead data is used.', 'This app uses CAIt Resend for approved email sends only after explicit user confirmation. SMS remains a CAIt handoff.'],
      recommended_next_actions: ['Load a CAIt app context that contains lead_rows or ask List Creator / CMO Leader to produce public-source rows and consent-safe contact paths.'],
      handoff_targets: [target, 'list_creator', 'email_ops', 'sms_ops']
    });
  }
  return buildCaitAppContext({
    source_app: 'lead_ops_console',
    source_app_label: 'Lead Ops Console',
    title: `Lead Ops packet - ${lead.company}`,
    summary: `Lead outreach packet for ${lead.company}. Status is ${statusLabel(lead.status)}. Channel is ${lead.channel || 'email'} and send mode is ${lead.sendMode || 'manual_approval'}. Approved email can execute through CAIt Resend after explicit confirmation; SMS still requires CAIt handoff.`,
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
      `Next action: ${lead.nextAction}`
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
    raw_context: importedContext ? { received_context: importedContext } : {}
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
    ...rows.map((lead) => `<tr class="${lead.id === selectedId ? 'active-row' : ''}" data-lead="${escapeHtml(lead.id)}"><td><strong>${escapeHtml(lead.company)}</strong><br>${escapeHtml(lead.contact || lead.evidenceUrl || 'missing contact path')}</td><td>${escapeHtml(lead.channel || 'email')}<br>${escapeHtml(lead.consent || 'needs_review')}</td><td>${escapeHtml(lead.sendMode || 'manual_approval')}<br>${escapeHtml(lead.scheduleAt || (lead.triggerEvent && lead.triggerEvent !== 'none' ? lead.triggerEvent : 'manual'))}</td><td><span class="status-pill ${statusClass(lead.status)}">${escapeHtml(statusLabel(lead.status))}</span></td></tr>`),
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
  renderTable();
  renderEditor();
  renderWorkflowState();
  renderResendState();
  els.leadContextPreview.textContent = JSON.stringify(buildContext(), null, 2);
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

els.sendLeadContextBtn.addEventListener('click', () => {
  saveEditor();
  void sendContextToCait(buildContext()).catch((error) => {
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
