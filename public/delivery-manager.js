import { buildCaitAppContext, downloadContextJson, fetchCaitAppContextFromUrl, sendContextToCait } from './cait-app-bridge.js?v=20260526b';

let deliveries = [];
let selectedId = '';
let selectedFileIndex = 0;
let filter = 'all';
let activeTab = 'overview';
let searchText = '';
let sortMode = 'newest';
let importedContext = null;
let handoffSession = handoffSessionFromUrl();
const expandedWorkIds = new Set();

function requestedDeliveryIdFromUrl() {
  try {
    const url = new URL(window.location.href);
    return String(
      url.searchParams.get('order_id')
      || url.searchParams.get('job_id')
      || url.searchParams.get('delivery_id')
      || ''
    ).trim();
  } catch {
    return '';
  }
}

function handoffSessionFromUrl() {
  try {
    const url = new URL(window.location.href);
    const serverContextId = String(url.searchParams.get('app_context_id') || url.searchParams.get('cait_app_context_id') || '').trim();
    const token = String(url.searchParams.get('app_context_token') || url.searchParams.get('cait_app_context_token') || url.searchParams.get('token') || '').trim();
    const chatReturnTo = String(url.searchParams.get('chat_return_to') || url.searchParams.get('chatReturnTo') || '').trim();
    const chatHandoffId = String(url.searchParams.get('chat_handoff_id') || url.searchParams.get('chatHandoffId') || '').trim();
    return {
      serverContextId,
      tokenAttached: Boolean(token),
      chatReturnTo,
      chatHandoffId,
      hasServerContext: Boolean(serverContextId),
      hasChatReturn: Boolean(chatReturnTo || chatHandoffId)
    };
  } catch {
    return {
      serverContextId: '',
      tokenAttached: false,
      chatReturnTo: '',
      chatHandoffId: '',
      hasServerContext: false,
      hasChatReturn: false
    };
  }
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 10000) {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  let timeoutId = null;
  if (controller && Number.isFinite(timeoutMs) && timeoutMs > 0) {
    timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
  }
  try {
    return await fetch(url, {
      ...options,
      signal: controller ? controller.signal : options.signal
    });
  } finally {
    if (timeoutId) window.clearTimeout(timeoutId);
  }
}

const els = {
  filterButtons: [...document.querySelectorAll('[data-filter]')],
  tabButtons: [...document.querySelectorAll('[data-tab]')],
  tabPanels: {
    overview: document.getElementById('overviewPanel'),
    files: document.getElementById('filesPanel'),
    context: document.getElementById('contextPanel')
  },
  deliverySearchInput: document.getElementById('deliverySearchInput'),
  deliverySortSelect: document.getElementById('deliverySortSelect'),
  deliveryInboxMeta: document.getElementById('deliveryInboxMeta'),
  deliveryList: document.getElementById('deliveryList'),
  fileTable: document.getElementById('fileTable'),
  deliveryTitleInput: document.getElementById('deliveryTitleInput'),
  deliverySummaryInput: document.getElementById('deliverySummaryInput'),
  deliveryStatusPill: document.getElementById('deliveryStatusPill'),
  deliveryUpdatedMeta: document.getElementById('deliveryUpdatedMeta'),
  summaryCount: document.getElementById('summaryCount'),
  nextActionText: document.getElementById('nextActionText'),
  packageMetaText: document.getElementById('packageMetaText'),
  sourceMetaText: document.getElementById('sourceMetaText'),
  previewTitle: document.getElementById('previewTitle'),
  outputPreview: document.getElementById('outputPreview'),
  fileMetaText: document.getElementById('fileMetaText'),
  deliveryContextPreview: document.getElementById('deliveryContextPreview'),
  refreshDeliveriesBtn: document.getElementById('refreshDeliveriesBtn'),
  sendDeliveryContextBtn: document.getElementById('sendDeliveryContextBtn'),
  runFollowupBtn: document.getElementById('runFollowupBtn'),
  downloadJsonBtn: document.getElementById('downloadJsonBtn'),
  downloadSelectedBtn: document.getElementById('downloadSelectedBtn'),
  copySelectedBtn: document.getElementById('copySelectedBtn'),
  copyPreviewBtn: document.getElementById('copyPreviewBtn'),
  railDownloadBtn: document.getElementById('railDownloadBtn'),
  railCopyBtn: document.getElementById('railCopyBtn'),
  railJsonBtn: document.getElementById('railJsonBtn'),
  approvalStatePill: document.getElementById('approvalStatePill'),
  approvalGateSummary: document.getElementById('approvalGateSummary'),
  approvalChecklist: document.getElementById('approvalChecklist'),
  approveDeliveryBtn: document.getElementById('approveDeliveryBtn'),
  copyApprovalBtn: document.getElementById('copyApprovalBtn'),
  actionRailSummary: document.getElementById('actionRailSummary'),
  readinessScore: document.getElementById('readinessScore'),
  readinessMeter: document.getElementById('readinessMeter'),
  readinessList: document.getElementById('readinessList'),
  readinessNote: document.getElementById('readinessNote'),
  deliveryHandoffNotice: document.getElementById('deliveryHandoffNotice'),
  deliveryHandoffAuditPill: document.getElementById('deliveryHandoffAuditPill'),
  deliveryHandoffAuditList: document.getElementById('deliveryHandoffAuditList'),
  allCount: document.getElementById('allCount'),
  completedCount: document.getElementById('completedCount'),
  blockedCount: document.getElementById('blockedCount'),
  filesCount: document.getElementById('filesCount'),
  reusableCount: document.getElementById('reusableCount')
};

function selectedDelivery() {
  return deliveries.find((delivery) => delivery.id === selectedId) || deliveries[0] || null;
}

function safeList(value = [], maxItems = 12) {
  const input = Array.isArray(value) ? value : (value ? [value] : []);
  const seen = new Set();
  return input
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .filter((item) => {
      const key = item.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, maxItems);
}

function safeBool(value) {
  return value === true || value === 'true' || value === 1 || value === '1';
}

function normalizeAuthorityRequest(raw = null, fallback = {}) {
  if (!raw || typeof raw !== 'object') return null;
  const reason = String(raw.reason || raw.message || raw.error || fallback.reason || '').trim();
  const missingConnectors = safeList(raw.missingConnectors || raw.missing_connectors || raw.connectors || fallback.missingConnectors || []);
  const missingConnectorCapabilities = safeList(
    raw.missingConnectorCapabilities
      || raw.missing_connector_capabilities
      || raw.capabilities
      || fallback.missingConnectorCapabilities
      || [],
    16
  );
  const requiredGoogleSources = safeList(raw.requiredGoogleSources || raw.required_google_sources || raw.googleSourceTypes || raw.google_source_types || [], 8);
  const requiredRepositorySelection = safeBool(raw.requiredRepositorySelection || raw.required_repository_selection);
  const requiredChannelSelection = safeBool(raw.requiredChannelSelection || raw.required_channel_selection);
  const repoCandidates = safeList(raw.repoCandidates || raw.repo_candidates || raw.repositories || [], 20);
  const channelCandidates = safeList(raw.channelCandidates || raw.channel_candidates || raw.channels || [], 12);
  const source = String(raw.source || raw.kind || fallback.source || '').trim();
  if (
    !reason
    && !missingConnectors.length
    && !missingConnectorCapabilities.length
    && !requiredGoogleSources.length
    && !requiredRepositorySelection
    && !requiredChannelSelection
  ) {
    return null;
  }
  return {
    reason: reason || 'Human approval is required before this execution can continue.',
    missingConnectors,
    missingConnectorCapabilities,
    requiredGoogleSources,
    requiredRepositorySelection,
    requiredChannelSelection,
    repoCandidates,
    channelCandidates,
    source,
    ownerLabel: String(raw.ownerLabel || raw.owner_label || fallback.ownerLabel || '').trim(),
    requestedAt: String(raw.requestedAt || raw.requested_at || fallback.requestedAt || '').trim()
  };
}

function authorityRequestFromReport(report = {}) {
  if (!report || typeof report !== 'object') return null;
  return normalizeAuthorityRequest(
    report.authority_request
      || report.authorityRequest
      || report.executor_request
      || report.executorRequest
      || (Array.isArray(report.approval_requests) ? report.approval_requests[0] : null)
      || (Array.isArray(report.approvalRequests) ? report.approvalRequests[0] : null)
      || null
  );
}

function authorityRequestFromJob(job = {}) {
  const report = job?.output?.report && typeof job.output.report === 'object' ? job.output.report : {};
  const fromReport = authorityRequestFromReport(report);
  if (fromReport) return fromReport;
  const executorAuthority = job?.executorState?.authorityRequired || job?.executorState?.authority_required || null;
  const fromExecutor = normalizeAuthorityRequest(executorAuthority, {
    source: 'executor_state',
    ownerLabel: job.workflowAgentName || job.assignedAgentId || job.taskType || ''
  });
  if (fromExecutor) return fromExecutor;
  return null;
}

function authorityRequestFromContext(context = {}) {
  if (!context || typeof context !== 'object') return null;
  const raw = context.raw_context && typeof context.raw_context === 'object' ? context.raw_context : {};
  return normalizeAuthorityRequest(
    context.authority_request
      || context.authorityRequest
      || raw.authority_request
      || raw.authorityRequest
      || raw.approval_gate?.authority_request
      || raw.approval_gate?.authorityRequest
      || null
  );
}

function deliveryCombinedText(delivery = {}) {
  return [
    delivery.title,
    delivery.summary,
    delivery.nextAction,
    delivery.agentName,
    delivery.taskType,
    delivery.workflowTask,
    delivery.authorityRequest?.reason,
    ...(delivery.authorityRequest?.missingConnectorCapabilities || []),
    ...(delivery.files || []).map((file) => `${file.name}\n${file.content}`)
  ].join('\n').toLowerCase();
}

function marketingDeliverableLabel(delivery = {}) {
  const text = deliveryCombinedText(delivery);
  if (/seo|article|blog|記事|meta description|h1/.test(text)) return 'SEO article or content draft';
  if (/landing|lp|page|hero|cta|conversion|signup/.test(text)) return 'Landing page or conversion copy';
  if (/x post|x_post|twitter|tweet|social|sns|instagram|reddit|indie hackers|投稿/.test(text)) return 'Social post package';
  if (/email|gmail|cold mail|outreach|subject|recipient|送信/.test(text)) return 'Email or outreach package';
  if (/lead|prospect|company list|リード|候補企業/.test(text)) return 'Lead list or prospecting package';
  if (/analytics|ga4|search console|gsc|measurement/.test(text)) return 'Analytics or measurement report';
  if (/research|competitive|competitor|market|調査/.test(text)) return 'Marketing research report';
  return 'Reusable marketing delivery';
}

function marketingChannelLabel(delivery = {}) {
  const text = deliveryCombinedText(delivery);
  const channels = [];
  if (/seo|organic search|search console|gsc|記事/.test(text)) channels.push('SEO');
  if (/x post|x_post|twitter|tweet|\bx\b|投稿/.test(text)) channels.push('X');
  if (/instagram|insta/.test(text)) channels.push('Instagram');
  if (/reddit/.test(text)) channels.push('Reddit');
  if (/indie hackers|indie_hackers/.test(text)) channels.push('Indie Hackers');
  if (/email|gmail|resend|outreach|送信/.test(text)) channels.push('Email');
  if (/landing|owned site|wordpress|publisher|lp/.test(text)) channels.push('Owned site');
  if (/directory|listing|掲載/.test(text)) channels.push('Directory');
  if (/lead|prospect|リード/.test(text)) channels.push('Lead Ops');
  return channels.length ? channels.join(' / ') : 'Not fixed yet';
}

function evidenceLabel(delivery = {}) {
  const text = deliveryCombinedText(delivery);
  const urls = text.match(/https?:\/\/[^\s)>\]]+/gi) || [];
  if (/ga4|google analytics|search console|gsc/.test(text)) return 'Analytics/source connector referenced';
  if (/source|evidence|reference|引用|根拠/.test(text) && urls.length) return `${urls.length} source URL${urls.length === 1 ? '' : 's'} referenced`;
  if (urls.length) return `${urls.length} URL${urls.length === 1 ? '' : 's'} included`;
  return 'No explicit source evidence found';
}

function externalActionLabel(delivery = {}) {
  const text = deliveryCombinedText(delivery);
  if (/publish now|post now|send now|schedule|投稿|送信|公開|配信/.test(text)) return 'External publish/send action requested';
  if (/prepare|draft|handoff|approval|review|承認|確認/.test(text)) return 'Preparation or approval handoff';
  return 'Internal follow-up only';
}

function approvalGateForDelivery(delivery = selectedDelivery()) {
  if (!delivery) {
    return {
      state: 'pending',
      label: 'review',
      summary: 'Load a delivery to review the deliverable, channel, evidence, and external action boundary.',
      approveEnabled: false,
      actionLabel: 'Approval not blocking',
      note: 'No delivery selected.',
      items: [
        { label: 'Deliverable', value: 'No delivery selected', ok: false },
        { label: 'Channel/action', value: 'No channel selected', ok: false },
        { label: 'Evidence/source', value: 'No evidence loaded', ok: false },
        { label: 'Human approval', value: 'Waiting for a delivery', ok: false }
      ],
      context: { state: 'pending', label: 'review', checkpoints: [] }
    };
  }
  const authority = delivery.authorityRequest || null;
  const status = String(delivery.status || '').trim().toLowerCase();
  const approvalWaiting = Boolean(authority) || /blocked|approval|waiting/.test(status) && /approval|authority|connector|publish|send|post|承認|接続|投稿|送信/i.test(deliveryCombinedText(delivery));
  const deliverable = marketingDeliverableLabel(delivery);
  const channel = marketingChannelLabel(delivery);
  const evidence = evidenceLabel(delivery);
  const action = externalActionLabel(delivery);
  const hasFiles = (delivery.files || []).length > 0;
  const externalWrite = /external|publish|send|post|schedule|公開|投稿|送信|配信/i.test(action);
  const canResumeApproval = delivery.jobKind !== 'app_context' && delivery.sourceLabel === 'Server job';
  const state = approvalWaiting ? 'blocked' : (externalWrite ? 'pending' : 'approved');
  const label = approvalWaiting ? 'approval needed' : (externalWrite ? 'review before action' : 'ready');
  const humanApprovalValue = approvalWaiting
    ? authority?.reason || 'Approve this delivery before resuming execution.'
    : externalWrite
      ? 'Approval is required before any external publish, post, send, or schedule step.'
      : 'No external write is implied by this delivery.';
  const items = [
    { label: 'Deliverable', value: deliverable, ok: Boolean(String(delivery.title || delivery.summary || '').trim()) },
    { label: 'Channel/action', value: channel === 'Not fixed yet' ? action : `${channel} - ${action}`, ok: channel !== 'Not fixed yet' || action !== 'Internal follow-up only' },
    { label: 'Evidence/source', value: evidence, ok: !/^No explicit/.test(evidence) },
    { label: 'Files/package', value: hasFiles ? `${delivery.files.length} file${delivery.files.length === 1 ? '' : 's'} attached` : 'No attached files', ok: hasFiles },
    { label: 'Human approval', value: humanApprovalValue, ok: !approvalWaiting }
  ];
  if (authority?.missingConnectors?.length || authority?.missingConnectorCapabilities?.length) {
    items.push({
      label: 'Authority needed',
      value: [
        authority.missingConnectors.length ? `Connectors: ${authority.missingConnectors.join(', ')}` : '',
        authority.missingConnectorCapabilities.length ? `Capabilities: ${authority.missingConnectorCapabilities.join(', ')}` : ''
      ].filter(Boolean).join(' / '),
      ok: false
    });
  }
  if (authority?.requiredRepositorySelection || authority?.requiredChannelSelection) {
    items.push({
      label: 'Selection needed',
      value: [
        authority.requiredRepositorySelection ? 'Repository selection required' : '',
        authority.requiredChannelSelection ? 'Channel selection required' : ''
      ].filter(Boolean).join(' / '),
      ok: false
    });
  }
  const summary = approvalWaiting
    ? canResumeApproval
      ? 'This work is paused until a human approves the exact continuation boundary.'
      : 'This context records an approval requirement. Send it to CAIt or open the source order to resume execution.'
    : externalWrite
      ? 'This delivery can be reused, but any external publish/send action still needs explicit approval.'
      : 'This delivery is ready for internal follow-up context.';
  const note = [
    `Approval gate: ${label}`,
    `Delivery id: ${delivery.id || '-'}`,
    `Deliverable: ${deliverable}`,
    `Channel/action: ${channel} - ${action}`,
    `Evidence/source: ${evidence}`,
    `Files: ${(delivery.files || []).length}`,
    authority ? `Authority request: ${authority.reason}` : '',
    authority?.missingConnectorCapabilities?.length ? `Capabilities: ${authority.missingConnectorCapabilities.join(', ')}` : '',
    'Decision boundary: do not publish, post, send, schedule, or write externally unless the exact account, target, and copy are approved.'
  ].filter(Boolean).join('\n');
  return {
    state,
    label,
    summary,
    approveEnabled: Boolean(approvalWaiting && canResumeApproval && delivery.id),
    actionLabel: approvalWaiting
      ? (canResumeApproval ? 'Approve & resume' : 'Source order required')
      : 'Approval not blocking',
    note,
    items,
    context: {
      state,
      label,
      summary,
      deliverable,
      channel,
      evidence,
      action,
      authority_request: authority,
      checkpoints: items.map((item) => ({ label: item.label, value: item.value, ok: item.ok }))
    }
  };
}

function handoffSourceKinds(delivery = selectedDelivery()) {
  return [...new Set((delivery?.files || []).map((file) => String(file.sourceKind || '').trim()).filter(Boolean))];
}

function deliveryHandoffAuditForDelivery(delivery = selectedDelivery()) {
  const files = delivery?.files || [];
  const gate = approvalGateForDelivery(delivery);
  const raw = plainObject(importedContext?.raw_context);
  const rawChatReturn = String(raw.chat_return_to || raw.chatReturnTo || '').trim();
  const rawHandoffId = String(raw.chat_handoff_id || raw.chatHandoffId || '').trim();
  const sourceKinds = handoffSourceKinds(delivery);
  const imported = Boolean(importedContext);
  const serverBacked = imported ? handoffSession.hasServerContext : delivery?.sourceLabel === 'Server job';
  const hasReturnPath = Boolean(handoffSession.hasChatReturn || rawChatReturn || rawHandoffId);
  const recoveredFromTransfer = sourceKinds.some((kind) => /artifact|files|delivery/i.test(kind));
  const items = [
    {
      label: 'Server record',
      ok: Boolean(serverBacked),
      value: imported
        ? (handoffSession.serverContextId ? `Context ${handoffSession.serverContextId}` : 'No server context id in URL')
        : (delivery?.sourceLabel === 'Server job' ? 'Loaded from server-side job output' : 'No server delivery loaded')
    },
    {
      label: 'Delivery selected',
      ok: Boolean(delivery?.id),
      value: delivery?.id || 'No selected package'
    },
    {
      label: 'Files recovered',
      ok: files.length > 0,
      value: files.length ? `${files.length} file${files.length === 1 ? '' : 's'} available` : 'No delivery file recovered'
    },
    {
      label: 'AIAGENT artifacts normalized',
      ok: imported ? Boolean(recoveredFromTransfer || files.length) : files.length > 0,
      value: sourceKinds.length ? sourceKinds.join(', ') : 'Server job package'
    },
    {
      label: 'Approval boundary',
      ok: Boolean(gate?.context?.checkpoints?.length),
      value: gate?.label || 'No approval gate'
    },
    {
      label: 'Return path',
      ok: imported ? hasReturnPath : true,
      value: hasReturnPath
        ? [handoffSession.chatHandoffId || rawHandoffId, handoffSession.chatReturnTo || rawChatReturn].filter(Boolean).join(' / ')
        : (imported ? 'No chat return metadata attached' : 'Follow-up starts from Delivery Manager')
    }
  ];
  return {
    items,
    complete: items.filter((item) => item.ok).length,
    total: items.length,
    missing: items.filter((item) => !item.ok).map((item) => item.label)
  };
}

function deliverySearchBlob(delivery = {}) {
  return [
    delivery.title,
    delivery.status,
    delivery.summary,
    delivery.agentName,
    delivery.workTitle,
    delivery.taskType,
    delivery.nextAction,
    delivery.updatedAt,
    ...(delivery.files || []).map((file) => `${file.name} ${file.type}`)
  ].join('\n').toLowerCase();
}

function isWaitingStatus(value = '') {
  return /queued|claimed|running|dispatched|blocked|failed|timed_out|waiting/i.test(String(value || ''));
}

function filteredDeliveries() {
  let list = deliveries;
  if (filter === 'completed') list = list.filter((item) => item.status === 'completed');
  if (filter === 'blocked') list = list.filter((item) => isWaitingStatus(item.status));
  if (filter === 'files') list = list.filter((item) => (item.files || []).length);
  if (filter === 'reusable') list = list.filter((item) => item.summary || (item.files || []).length);
  const queryTokens = searchText.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (queryTokens.length) list = list.filter((item) => {
    const blob = deliverySearchBlob(item);
    return queryTokens.every((token) => blob.includes(token));
  });
  return sortDeliveries(list);
}

function statusClass(value = '') {
  const safe = String(value || '').toLowerCase();
  if (/completed|ready|reusable/.test(safe)) return 'approved';
  if (/blocked|failed|timeout|waiting/.test(safe)) return 'blocked';
  return 'pending';
}

function statusLabel(value = '') {
  const safe = String(value || '').trim().toLowerCase();
  if (safe === 'blocked') return 'waiting';
  if (safe === 'timed_out') return 'timed out';
  return String(value || '').trim() || 'unknown';
}

function compact(value = '', max = 120) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max - 1)}...` : text;
}

function fitTitleInput() {
  const input = els.deliveryTitleInput;
  if (!input) return;
  input.style.fontSize = '';
  const width = input.clientWidth;
  if (!width || input.scrollWidth <= width + 2) return;
  const current = Number.parseFloat(window.getComputedStyle(input).fontSize) || 24;
  const next = Math.max(14, Math.floor(current * (width / Math.max(input.scrollWidth, 1))));
  input.style.fontSize = `${next}px`;
}

function fileSizeLabel(content = '') {
  const bytes = new Blob([String(content || '')]).size;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

function normalizedDate(value = '') {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return '';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date(timestamp));
}

function deliveryTimestamp(delivery = {}) {
  const timestamp = Date.parse(delivery.updatedAt || delivery.completedAt || delivery.createdAt || '');
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function statusSortRank(value = '') {
  const safe = String(value || '').trim().toLowerCase();
  if (safe === 'completed') return 0;
  if (/blocked|waiting|failed|timed_out/.test(safe)) return 1;
  if (/running|claimed|dispatched/.test(safe)) return 2;
  if (/queued/.test(safe)) return 3;
  return 4;
}

function sortModeLabel(value = sortMode) {
  return {
    newest: 'newest first',
    oldest: 'oldest first',
    status: 'status',
    files: 'most files',
    title: 'title A-Z'
  }[value] || 'newest first';
}

function compareDeliveries(left = {}, right = {}, mode = sortMode) {
  if (mode === 'oldest') {
    const timeDiff = deliveryTimestamp(left) - deliveryTimestamp(right);
    if (timeDiff) return timeDiff;
  } else if (mode === 'status') {
    const statusDiff = statusSortRank(left.status) - statusSortRank(right.status);
    if (statusDiff) return statusDiff;
    const timeDiff = deliveryTimestamp(right) - deliveryTimestamp(left);
    if (timeDiff) return timeDiff;
  } else if (mode === 'files') {
    const fileDiff = (right.files || []).length - (left.files || []).length;
    if (fileDiff) return fileDiff;
    const timeDiff = deliveryTimestamp(right) - deliveryTimestamp(left);
    if (timeDiff) return timeDiff;
  } else if (mode === 'title') {
    const titleDiff = String(left.title || left.workTitle || '').localeCompare(String(right.title || right.workTitle || ''), undefined, { sensitivity: 'base' });
    if (titleDiff) return titleDiff;
  } else {
    const timeDiff = deliveryTimestamp(right) - deliveryTimestamp(left);
    if (timeDiff) return timeDiff;
  }
  const rankDiff = deliverySortRank(left) - deliverySortRank(right);
  if (rankDiff) return rankDiff;
  return String(right.id || '').localeCompare(String(left.id || ''));
}

function sortDeliveries(list = []) {
  return [...list].sort((left, right) => compareDeliveries(left, right));
}

function upsertDelivery(delivery = null) {
  if (!delivery?.id) return false;
  deliveries = sortDeliveries([
    delivery,
    ...deliveries.filter((item) => String(item.id || '') !== String(delivery.id || ''))
  ]);
  return true;
}

function isLeaderDelivery(delivery = {}) {
  return /_leader$/i.test(String(delivery.taskType || delivery.workflowTask || delivery.agentName || ''));
}

function deliverySortRank(delivery = {}) {
  if (delivery.jobKind === 'workflow') return 0;
  if (isLeaderDelivery(delivery)) return 1;
  if (delivery.status === 'completed') return 3;
  if (isWaitingStatus(delivery.status)) return 2;
  return 4;
}

function workTitleForJob(job = {}) {
  return String(
    job.workflow?.objective
    || job.input?._broker?.workflow?.objective
    || job.input?.original_prompt
    || job.originalPrompt
    || job.prompt
    || job.task
    || `Work ${String(job.workflowParentId || job.id || '').slice(0, 8)}`
  ).trim();
}

function deliveryChildBlockerType(child = {}) {
  if (String(child?.status || '').trim().toLowerCase() !== 'blocked') return '';
  const explicit = String(child?.blockerType || child?.blocker_type || '').trim().toLowerCase();
  if (explicit) return explicit;
  const text = [
    child?.failureCategory,
    child?.failure_category,
    child?.failureReason,
    child?.failure_reason,
    child?.dispatchCompletionStatus,
    child?.dispatch_completion_status,
    child?.summary
  ].map((item) => String(item || '').trim().toLowerCase()).join(' ');
  if (/blocked_waiting_for_approval|approval_required|connector|required|oauth|x\.post|google\.|github\.|承認|接続/.test(text)) return 'approval_required';
  if (/blocked_after_leader_failure|workflow_blocked|leader_failure|quality_gate_failed|failed/.test(text)) return 'stopped_after_failure';
  if (/leader_checkpoint_blocked|leader_final_summary_blocked|blocked until|waiting for earlier|waiting for the earlier/.test(text)) return 'waiting_for_workflow_phase';
  return 'waiting_on_internal_workflow';
}

function isInternalDeliveryFile(file = {}) {
  const name = String(file?.name || file?.filename || '').trim().toLowerCase();
  const content = String(file?.content || file?.body || '').trim();
  const contentType = String(file?.content_type || file?.contentType || '').trim().toLowerCase();
  const visibility = String(file?.visibility || file?.delivery_visibility || file?.deliveryVisibility || '').trim().toLowerCase();
  if (file?.internal === true || file?.user_visible === false || file?.userVisible === false || file?.delivery_visible === false || file?.deliveryVisible === false) return true;
  if (['internal', 'hidden', 'system'].includes(visibility)) return true;
  if ([
    'supporting_specialist_deliverables',
    'workflow_integrated_delivery',
    'partial_workflow_delivery',
    'all_deliverables_bundle',
    'review_ready_delivery'
  ].includes(contentType)) return true;
  if (name === 'supporting-specialist-deliverables.md') return true;
  if (name === 'integrated-delivery.md' && /#\s+Integrated delivery|##\s+Supporting work products|##\s+Integrated next actions/i.test(content)) return true;
  if (name === 'workflow-partial-delivery.md') return true;
  if (name === 'all-deliverables.md' || /^all-deliverables-[^.]+\.md$/i.test(name)) return true;
  if (name === 'review-ready-delivery.md' || /^review-ready-delivery-[^.]+\.md$/i.test(name)) return true;
  return false;
}

function visibleDeliveryFiles(files = []) {
  return (Array.isArray(files) ? files : []).filter((file) => file && !isInternalDeliveryFile(file));
}

function deliveryWorkflowSummary(job = {}, output = {}) {
  const raw = String(output.summary || output.text || job.failureReason || `Order ${String(job.id || '').slice(0, 8)} is ${job.status || 'updated'}.`);
  if (!/waiting for approval|承認待ち/i.test(raw)) return raw;
  const report = output.report && typeof output.report === 'object' ? output.report : {};
  const authority = report.authority_request || report.authorityRequest || null;
  if (authority && typeof authority === 'object') return raw;
  const childRuns = Array.isArray(report.childRuns) ? report.childRuns : (Array.isArray(job.workflow?.childRuns) ? job.workflow.childRuns : []);
  const total = childRuns.length || Number(job.workflow?.statusCounts?.total || 0) || 0;
  const completed = childRuns.filter((run) => String(run?.status || '').toLowerCase() === 'completed').length || Number(job.workflow?.statusCounts?.completed || 0) || 0;
  const failed = childRuns.filter((run) => ['failed', 'timed_out'].includes(String(run?.status || '').toLowerCase())).length || Number(job.workflow?.statusCounts?.failed || 0) || 0;
  const internalWaiting = childRuns.filter((run) => ['waiting_for_workflow_phase', 'waiting_on_internal_workflow'].includes(deliveryChildBlockerType(run))).length;
  const stoppedAfterFailure = childRuns.filter((run) => deliveryChildBlockerType(run) === 'stopped_after_failure').length;
  return [
    `Integrated delivery: ${completed}/${total} internal work items completed`,
    internalWaiting ? `${internalWaiting} internal wait` : '',
    stoppedAfterFailure ? `${stoppedAfterFailure} stopped after failure` : '',
    failed ? `${failed} failed` : ''
  ].filter(Boolean).join(', ') + '.';
}

function normalizeJobDelivery(job = {}) {
  const output = job.output && typeof job.output === 'object' ? job.output : {};
  const files = visibleDeliveryFiles(output.files);
  const createdAt = String(job.completedAt || job.updatedAt || job.createdAt || '');
  const taskType = String(job.workflowTask || job.taskType || '');
  const workId = String(job.workflowParentId || job.id || `job-${Date.now()}`);
  return {
    id: String(job.id || `job-${Date.now()}`),
    workId,
    workTitle: workTitleForJob(job),
    jobKind: String(job.jobKind || ''),
    taskType,
    workflowTask: String(job.workflowTask || ''),
    workflowParentId: String(job.workflowParentId || ''),
    workflow: job.workflow && typeof job.workflow === 'object' ? job.workflow : null,
    authorityRequest: authorityRequestFromJob(job),
    failureCategory: String(job.failureCategory || ''),
    dispatchCompletionStatus: String(job.dispatch?.completionStatus || ''),
    title: String(output.title || output.summary || job.task || `Order ${String(job.id || '').slice(0, 8)}` || 'Delivery'),
    status: String(job.status || 'updated'),
    summary: deliveryWorkflowSummary(job, output),
    files: files.map((file, index) => ({
      name: String(file.name || file.filename || `delivery-${index + 1}.md`),
      type: String(file.type || file.mime || 'text/plain'),
      content: String(file.content || file.body || ''),
      updatedAt: createdAt
    })),
    nextAction: String(output.next_action || output.nextAction || 'Use this delivery as context for follow-up work.'),
    agentName: String(job.workflowAgentName || job.assignedAgentId || job.agentName || taskType || 'CAIt Agent'),
    updatedAt: createdAt,
    sourceLabel: 'Server job'
  };
}

function plainObject(value = null) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function compactMultiline(value = '', max = 5000) {
  const text = String(value ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, ' ')
    .trim();
  return text.length > max ? `${text.slice(0, max - 1).trim()}...` : text;
}

function objectTextArtifact(value = null, max = 5000) {
  if (value == null) return '';
  if (typeof value === 'string') return compactMultiline(value, max);
  try {
    return compactMultiline(JSON.stringify(value, null, 2), max);
  } catch {
    return '';
  }
}

function appContextFileContent(item = {}) {
  if (!item || typeof item !== 'object') return '';
  return compactMultiline(
    item.content
      || item.body
      || item.markdown
      || item.text
      || item.contentPreview
      || item.content_preview
      || item.preview
      || '',
    9000
  );
}

function appContextFileName(item = {}, index = 0, prefix = 'context-file') {
  const type = String(item.artifact_type || item.artifactType || item.content_type || item.contentType || item.type || '').trim();
  const raw = String(item.name || item.filename || item.title || '').trim();
  if (raw) return raw;
  const suffix = type ? type.toLowerCase().replace(/[^a-z0-9_-]+/g, '-') : `${prefix}-${index + 1}`;
  return suffix.endsWith('.md') || suffix.includes('.') ? suffix : `${suffix || `${prefix}-${index + 1}`}.md`;
}

function appContextFileType(item = {}) {
  return String(item.mime || item.content_type || item.contentType || item.type || item.artifact_type || item.artifactType || 'text/plain').trim() || 'text/plain';
}

function normalizeAppContextFile(item = {}, index = 0, sourceKind = 'app_context') {
  const content = appContextFileContent(item);
  if (!content) return null;
  return {
    name: appContextFileName(item, index, sourceKind),
    type: appContextFileType(item),
    content,
    updatedAt: String(item.updated_at || item.updatedAt || item.created_at || item.createdAt || ''),
    sourceKind
  };
}

function artifactAsFile(item = {}, index = 0, sourceKind = 'artifact') {
  if (!item || typeof item !== 'object') return null;
  const content = appContextFileContent(item) || objectTextArtifact(item.rows || item.items || item.data || null);
  if (!content) return null;
  return normalizeAppContextFile({ ...item, content }, index, sourceKind);
}

function fileList(value = []) {
  return Array.isArray(value) ? value.filter((item) => item && typeof item === 'object') : [];
}

function deliveryFilesFromAppContext(context = {}) {
  const raw = plainObject(context.raw_context);
  const rawDelivery = plainObject(raw.delivery);
  const rawDeliveryPackage = plainObject(raw.delivery_package || raw.deliveryPackage || raw.delivery_context || raw.deliveryContext);
  const rawDeliveryPacket = plainObject(raw.delivery_packet || raw.deliveryPacket);
  const rawTransfer = plainObject(raw.transfer);
  const rawTransferDelivery = plainObject(rawTransfer.delivery);
  const candidates = [
    ...fileList(context.delivery_files).map((item, index) => normalizeAppContextFile(item, index, 'delivery_files')),
    ...fileList(context.deliveryFiles).map((item, index) => normalizeAppContextFile(item, index, 'delivery_files')),
    ...fileList(context.files).map((item, index) => normalizeAppContextFile(item, index, 'files')),
    ...fileList(context.attachments).map((item, index) => normalizeAppContextFile(item, index, 'attachments')),
    ...fileList(context.output_files || context.outputFiles).map((item, index) => normalizeAppContextFile(item, index, 'output_files')),
    ...fileList(context.result_files || context.resultFiles).map((item, index) => normalizeAppContextFile(item, index, 'result_files')),
    ...fileList(context.deliverables).map((item, index) => artifactAsFile(item, index, 'deliverables')),
    ...fileList(context.delivery_artifacts || context.deliveryArtifacts).map((item, index) => artifactAsFile(item, index, 'delivery_artifacts')),
    ...fileList(plainObject(context.delivery_package || context.deliveryPackage).artifacts).map((item, index) => artifactAsFile(item, index, 'delivery_package_artifacts')),
    ...fileList(plainObject(context.delivery_package || context.deliveryPackage).files).map((item, index) => normalizeAppContextFile(item, index, 'delivery_package_files')),
    ...fileList(plainObject(context.delivery_packet || context.deliveryPacket).artifacts).map((item, index) => artifactAsFile(item, index, 'delivery_packet_artifacts')),
    ...fileList(plainObject(context.delivery_packet || context.deliveryPacket).files).map((item, index) => normalizeAppContextFile(item, index, 'delivery_packet_files')),
    ...fileList(context.artifacts).map((item, index) => artifactAsFile(item, index, 'artifacts')),
    ...fileList(raw.delivery_files).map((item, index) => normalizeAppContextFile(item, index, 'raw_delivery_files')),
    ...fileList(raw.deliveryFiles).map((item, index) => normalizeAppContextFile(item, index, 'raw_delivery_files')),
    ...fileList(raw.attachments).map((item, index) => normalizeAppContextFile(item, index, 'raw_attachments')),
    ...fileList(raw.output_files || raw.outputFiles).map((item, index) => normalizeAppContextFile(item, index, 'raw_output_files')),
    ...fileList(raw.result_files || raw.resultFiles).map((item, index) => normalizeAppContextFile(item, index, 'raw_result_files')),
    ...fileList(raw.deliverables).map((item, index) => artifactAsFile(item, index, 'raw_deliverables')),
    ...fileList(raw.delivery_artifacts || raw.deliveryArtifacts).map((item, index) => artifactAsFile(item, index, 'raw_delivery_artifacts')),
    ...fileList(raw.files).map((item, index) => normalizeAppContextFile(item, index, 'raw_files')),
    ...fileList(rawDelivery.artifacts).map((item, index) => artifactAsFile(item, index, 'raw_delivery_artifacts')),
    ...fileList(rawDelivery.files).map((item, index) => normalizeAppContextFile(item, index, 'raw_delivery_files')),
    ...fileList(rawDeliveryPackage.artifacts).map((item, index) => artifactAsFile(item, index, 'raw_delivery_package_artifacts')),
    ...fileList(rawDeliveryPackage.files).map((item, index) => normalizeAppContextFile(item, index, 'raw_delivery_package_files')),
    ...fileList(rawDeliveryPacket.artifacts).map((item, index) => artifactAsFile(item, index, 'raw_delivery_packet_artifacts')),
    ...fileList(rawDeliveryPacket.files).map((item, index) => normalizeAppContextFile(item, index, 'raw_delivery_packet_files')),
    ...fileList(rawTransferDelivery.artifacts).map((item, index) => artifactAsFile(item, index, 'raw_transfer_delivery_artifacts')),
    ...fileList(rawTransferDelivery.files).map((item, index) => normalizeAppContextFile(item, index, 'raw_transfer_delivery_files'))
  ].filter(Boolean);
  const seen = new Set();
  return visibleDeliveryFiles(candidates).filter((file) => {
    const key = `${String(file.name || '').toLowerCase()}\n${String(file.content || '').slice(0, 240)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function contextSummaryFromDelivery(context = {}) {
  const raw = plainObject(context.raw_context);
  const rawDelivery = plainObject(raw.delivery);
  const rawDeliveryPackage = plainObject(raw.delivery_package || raw.deliveryPackage || raw.delivery_context || raw.deliveryContext);
  const rawDeliveryPacket = plainObject(raw.delivery_packet || raw.deliveryPacket);
  const contextDeliveryPackage = plainObject(context.delivery_package || context.deliveryPackage);
  const contextDeliveryPacket = plainObject(context.delivery_packet || context.deliveryPacket);
  return String(
    context.summary
      || rawDelivery.summary
      || rawDeliveryPackage.summary
      || rawDeliveryPacket.summary
      || contextDeliveryPackage.summary
      || contextDeliveryPacket.summary
      || context.title
      || ''
  ).trim();
}

function deliveryFromAppContext(context = {}) {
  const files = deliveryFilesFromAppContext(context);
  const summary = contextSummaryFromDelivery(context);
  return {
    id: String(context.id || `context-${Date.now()}`),
    workId: String(context.id || `context-${Date.now()}`),
    workTitle: String(context.title || 'Imported CAIt context'),
    jobKind: 'app_context',
    taskType: String(context.source_app || 'app_context'),
    workflowTask: '',
    workflowParentId: '',
    workflow: null,
    authorityRequest: authorityRequestFromContext(context),
    failureCategory: '',
    dispatchCompletionStatus: '',
    title: String(context.title || 'Imported CAIt context'),
    status: 'reusable',
    summary,
    files: files.map((file, index) => ({
      name: String(file.name || file.filename || `context-file-${index + 1}.md`),
      type: String(file.type || file.mime || file.content_type || 'text/plain'),
      content: String(file.content || file.body || ''),
      updatedAt: String(file.updatedAt || context.updated_at || context.updatedAt || ''),
      sourceKind: String(file.sourceKind || 'app_context')
    })),
    nextAction: String((Array.isArray(context.recommended_next_actions) ? context.recommended_next_actions[0] : '') || 'Use this context for a follow-up order.'),
    agentName: String(context.source_app_label || context.source_app || 'CAIt context'),
    updatedAt: String(context.updated_at || context.updatedAt || ''),
    sourceLabel: 'CAIt context',
    sourceContext: context
  };
}

function applyInboundContext(context = null) {
  if (!context) return false;
  importedContext = context;
  const delivery = deliveryFromAppContext(context);
  deliveries = [delivery];
  selectedId = delivery.id;
  selectedFileIndex = 0;
  return true;
}

async function refreshDeliveries() {
  els.refreshDeliveriesBtn.textContent = 'Refreshing';
  const requestedId = requestedDeliveryIdFromUrl();
  try {
    const response = await fetchWithTimeout('/api/jobs?limit=40', { credentials: 'same-origin' }, 10000);
    if (!response.ok) throw new Error(`jobs ${response.status}`);
    const data = await response.json();
    const jobs = Array.isArray(data.jobs) ? data.jobs : [];
    deliveries = sortDeliveries(jobs.map(normalizeJobDelivery).filter((item) => item.id));
    if (requestedId && !deliveries.some((item) => item.id === requestedId)) {
      const direct = await fetchDeliveryJobById(requestedId).catch(() => null);
      if (direct?.id) upsertDelivery(direct);
    }
    selectedId = deliveries.some((item) => item.id === requestedId) ? requestedId : (deliveries[0]?.id || '');
    const selected = selectedDelivery();
    if (requestedId && selected?.workId) expandedWorkIds.add(selected.workId);
    selectedFileIndex = 0;
  } catch {
    deliveries = [];
    selectedId = '';
    selectedFileIndex = 0;
  } finally {
    els.refreshDeliveriesBtn.textContent = 'Refresh';
    render();
  }
}

async function fetchDeliveryJobById(id = '') {
  const safeId = String(id || '').trim();
  if (!safeId) return null;
  const response = await fetchWithTimeout(`/api/jobs/${encodeURIComponent(safeId)}`, {
    credentials: 'same-origin'
  }, 10000);
  if (!response.ok) throw new Error(`job ${response.status}`);
  const data = await response.json();
  const job = data?.job && typeof data.job === 'object' ? data.job : null;
  return job ? normalizeJobDelivery(job) : null;
}

function saveEditor() {
  const delivery = selectedDelivery();
  if (!delivery) return;
  delivery.title = els.deliveryTitleInput.value.trim();
  delivery.summary = els.deliverySummaryInput.value.trim();
}

function buildContext() {
  const delivery = selectedDelivery();
  if (!delivery) {
    return buildCaitAppContext({
      source_app: 'delivery_manager',
      source_app_label: 'CAIt Deliveries',
      title: 'CAIt delivery context',
      summary: 'No delivery package is currently loaded. Refresh server jobs or open Deliveries from a CAIt context handoff.',
      facts: ['No delivery selected'],
      recommended_next_actions: ['Refresh server-side jobs or return to chat and select a delivery.']
    });
  }
  const approvalGate = approvalGateForDelivery(delivery);
  const handoffAudit = deliveryHandoffAuditForDelivery(delivery);
  return buildCaitAppContext({
    source_app: 'delivery_manager',
    source_app_label: 'CAIt Deliveries',
    title: `Reusable delivery - ${delivery.title}`,
    summary: delivery.summary,
    facts: [
      importedContext ? `Imported context: ${importedContext.title || importedContext.id || 'CAIt context'}` : '',
      `Delivery id: ${delivery.id}`,
      `Status: ${delivery.status}`,
      `Files: ${(delivery.files || []).length}`,
      `Approval gate: ${approvalGate.label}`,
      delivery.updatedAt ? `Updated: ${delivery.updatedAt}` : ''
    ].filter(Boolean),
    assumptions: [
      importedContext ? 'Files and artifacts are loaded from a server-side CAIt context.' : 'Files are loaded from server-side job output when available.',
      'Reusing a delivery creates a new CAIt context; it does not automatically execute follow-up work.',
      'External publishing, posting, sending, scheduling, or repository writes require explicit approval of the exact target and content.'
    ],
    artifacts: [
      { type: 'delivery_package', id: delivery.id, status: delivery.status, summary: delivery.summary, next_action: delivery.nextAction },
      { type: 'approval_gate', id: `${delivery.id}-approval-gate`, status: approvalGate.state, summary: approvalGate.summary, checkpoints: approvalGate.context.checkpoints },
      { type: 'handoff_audit', id: `${delivery.id}-handoff-audit`, complete: handoffAudit.complete, total: handoffAudit.total, missing: handoffAudit.missing, checkpoints: handoffAudit.items }
    ],
    delivery_files: (delivery.files || []).map((file) => ({ name: file.name, type: file.type, content: file.content })),
    recommended_next_actions: [
      approvalGate.approveEnabled ? 'Approve and resume the paused execution lane from Delivery Manager.' : '',
      delivery.nextAction || 'Ask a leader to run follow-up with this delivery.',
      'Use external action tools only after approval and connector state are visible.'
    ].filter(Boolean),
    raw_context: {
      ...(importedContext ? { received_context: importedContext } : {}),
      source_context_id: importedContext?.id || '',
      chat_handoff_id: handoffSession.chatHandoffId || '',
      chat_return_to: handoffSession.chatReturnTo || '',
      source_file_count: (delivery.files || []).length,
      source_file_kinds: handoffSourceKinds(delivery),
      approval_gate: approvalGate.context,
      delivery_manager_handoff_audit: handoffAudit
    }
  });
}

function packageText(delivery = selectedDelivery()) {
  if (!delivery) return '';
  return [
    `# ${delivery.title || 'Delivery'}`,
    delivery.summary || '',
    delivery.nextAction ? `## Next action\n${delivery.nextAction}` : '',
    ...(delivery.files || []).map((file) => `\n## ${file.name}\n${file.content || ''}`)
  ].filter(Boolean).join('\n\n').trim();
}

function readinessItems(delivery = selectedDelivery()) {
  if (!delivery) {
    return [
      ['Delivery selected', false],
      ['Summary present', false],
      ['Status visible', false],
      ['Files attached', false],
      ['Next action captured', false],
      ['Reusable context built', false],
      ['No empty title', false]
    ];
  }
  const files = delivery?.files || [];
  const summary = String(delivery?.summary || '').trim();
  const context = buildContext();
  const approvalGate = approvalGateForDelivery(delivery);
  const handoffAudit = deliveryHandoffAuditForDelivery(delivery);
  return [
    ['Summary present', Boolean(summary)],
    ['Delivery selected', Boolean(delivery?.id)],
    ['Status visible', Boolean(delivery?.status)],
    ['Files attached', files.length > 0],
    ['Next action captured', Boolean(String(delivery?.nextAction || '').trim())],
    ['Approval gate captured', Boolean(approvalGate?.context?.checkpoints?.length)],
    ['Server handoff audited', handoffAudit.complete === handoffAudit.total],
    ['Reusable context built', Boolean(context?.source_app === 'delivery_manager')],
    ['No empty title', Boolean(String(delivery?.title || '').trim())]
  ];
}

function renderCounts() {
  els.allCount.textContent = deliveries.length;
  els.completedCount.textContent = deliveries.filter((item) => item.status === 'completed').length;
  els.blockedCount.textContent = deliveries.filter((item) => isWaitingStatus(item.status)).length;
  els.filesCount.textContent = deliveries.filter((item) => (item.files || []).length).length;
  els.reusableCount.textContent = deliveries.filter((item) => item.summary || (item.files || []).length).length;
  const visible = filteredDeliveries().length;
  const workCount = groupedDeliveries(filteredDeliveries()).length;
  const searchSuffix = searchText.trim() ? ` Search: "${compact(searchText.trim(), 32)}".` : '';
  els.deliveryInboxMeta.textContent = `${workCount} work item${workCount === 1 ? '' : 's'}, ${visible} run${visible === 1 ? '' : 's'} shown. Sorted ${sortModeLabel()}.${searchSuffix}`;
}

function groupTimestamp(group = {}) {
  return Math.max(...(group.items || []).map(deliveryTimestamp), deliveryTimestamp(group));
}

function groupFileCount(group = {}) {
  return (group.items || []).reduce((sum, item) => sum + (item.files || []).length, 0);
}

function compareDeliveryGroups(left = {}, right = {}) {
  if (sortMode === 'oldest') {
    const timeDiff = groupTimestamp(left) - groupTimestamp(right);
    if (timeDiff) return timeDiff;
  } else if (sortMode === 'status') {
    const statusDiff = statusSortRank(groupStatus(left)) - statusSortRank(groupStatus(right));
    if (statusDiff) return statusDiff;
    const timeDiff = groupTimestamp(right) - groupTimestamp(left);
    if (timeDiff) return timeDiff;
  } else if (sortMode === 'files') {
    const fileDiff = groupFileCount(right) - groupFileCount(left);
    if (fileDiff) return fileDiff;
    const timeDiff = groupTimestamp(right) - groupTimestamp(left);
    if (timeDiff) return timeDiff;
  } else if (sortMode === 'title') {
    const titleDiff = String(left.title || '').localeCompare(String(right.title || ''), undefined, { sensitivity: 'base' });
    if (titleDiff) return titleDiff;
  } else {
    const timeDiff = groupTimestamp(right) - groupTimestamp(left);
    if (timeDiff) return timeDiff;
  }
  return String(right.id || '').localeCompare(String(left.id || ''));
}

function groupedDeliveries(list = filteredDeliveries()) {
  const byWork = new Map();
  for (const delivery of list) {
    const workId = String(delivery.workId || delivery.workflowParentId || delivery.id || '').trim();
    if (!workId) continue;
    if (!byWork.has(workId)) {
      byWork.set(workId, {
        id: workId,
        title: delivery.workTitle || delivery.title || `Work ${workId.slice(0, 8)}`,
        items: [],
        updatedAt: delivery.updatedAt || ''
      });
    }
    const group = byWork.get(workId);
    group.items.push(delivery);
    if (String(delivery.updatedAt || '').localeCompare(String(group.updatedAt || '')) > 0) group.updatedAt = delivery.updatedAt || group.updatedAt;
    if (delivery.jobKind === 'workflow') group.title = delivery.workTitle || delivery.title || group.title;
  }
  return [...byWork.values()]
    .map((group) => ({
      ...group,
      items: group.items.sort((left, right) => compareDeliveries(left, right))
    }))
    .sort(compareDeliveryGroups);
}

function groupStatus(group = {}) {
  const statuses = (group.items || []).map((item) => String(item.status || '').toLowerCase());
  if (statuses.some((status) => /running|claimed|dispatched/.test(status))) return 'running';
  if (statuses.some((status) => /queued/.test(status))) return 'queued';
  if (statuses.some((status) => /blocked|failed|timed_out|waiting/.test(status))) return 'waiting';
  if (statuses.length && statuses.every((status) => status === 'completed')) return 'completed';
  return statuses[0] || 'unknown';
}

function groupSummary(group = {}) {
  const completed = (group.items || []).filter((item) => item.status === 'completed').length;
  const waiting = (group.items || []).filter((item) => isWaitingStatus(item.status) && item.status !== 'completed').length;
  const leader = (group.items || []).find(isLeaderDelivery);
  const leaderLabel = leader ? `Leader: ${leader.agentName}` : 'Leader not in this page';
  return `${leaderLabel} / ${completed} completed / ${waiting} waiting`;
}

function renderList() {
  const list = filteredDeliveries();
  const groups = groupedDeliveries(list);
  if (!list.some((item) => item.id === selectedId) && groups[0]?.items?.[0]) {
    selectedId = groups[0].items[0].id;
    selectedFileIndex = 0;
  }
  els.deliveryList.innerHTML = groups.length ? groups.map((group) => {
    const groupOpen = expandedWorkIds.has(group.id) || group.items.some((item) => item.id === selectedId);
    const files = group.items.reduce((sum, item) => sum + (item.files || []).length, 0);
    return [
      `<details class="delivery-work-group" data-work="${escapeHtml(group.id)}" ${groupOpen ? 'open' : ''}>`,
      '<summary class="delivery-work-summary">',
      '<span>',
      `<strong>${escapeHtml(compact(group.title, 72))}</strong>`,
      `<small>${escapeHtml(groupSummary(group))}</small>`,
      '</span>',
      `<span class="status-pill ${statusClass(groupStatus(group))}">${escapeHtml(statusLabel(groupStatus(group)))}</span>`,
      `<span class="delivery-file-count">${files}</span>`,
      '</summary>',
      '<div class="delivery-work-runs">',
      ...group.items.map((delivery) => [
        `<button class="delivery-row ${delivery.id === selectedId ? 'active' : ''} ${isLeaderDelivery(delivery) ? 'leader-run' : ''}" type="button" data-delivery="${escapeHtml(delivery.id)}">`,
        '<span>',
        `<strong>${escapeHtml(compact(delivery.title, 64))}</strong>`,
        `<small>${isLeaderDelivery(delivery) ? 'Leader / ' : ''}${escapeHtml(compact(delivery.agentName || delivery.id, 64))}</small>`,
        '</span>',
        `<span class="status-pill ${statusClass(delivery.status)}">${escapeHtml(statusLabel(delivery.status))}</span>`,
        `<span class="delivery-file-count">${(delivery.files || []).length}</span>`,
        '</button>'
      ].join('')),
      '</div>',
      '</details>'
    ].join('');
  }).join('') : [
    '<div class="delivery-empty">',
    '<strong>No matching delivery</strong>',
    '<span>Refresh jobs, clear search, or open Deliveries from a CAIt context handoff.</span>',
    '</div>'
  ].join('');
}

function renderTabs() {
  els.tabButtons.forEach((button) => button.classList.toggle('active', button.dataset.tab === activeTab));
  Object.entries(els.tabPanels).forEach(([name, panel]) => {
    panel.classList.toggle('active', name === activeTab);
  });
}

function renderSelected() {
  const delivery = selectedDelivery();
  const files = delivery?.files || [];
  if (selectedFileIndex >= files.length) selectedFileIndex = 0;
  const selectedFile = files[selectedFileIndex] || null;
  const hasDelivery = Boolean(delivery);
  els.deliveryTitleInput.disabled = !hasDelivery;
  els.deliverySummaryInput.disabled = !hasDelivery;
  [
    els.sendDeliveryContextBtn,
    els.runFollowupBtn,
    els.downloadJsonBtn,
    els.railJsonBtn
  ].forEach((button) => { button.disabled = false; });
  [
    els.downloadSelectedBtn,
    els.copySelectedBtn,
    els.copyPreviewBtn,
    els.railDownloadBtn,
    els.railCopyBtn
  ].forEach((button) => { button.disabled = !hasDelivery; });
  els.deliveryTitleInput.value = delivery?.title || 'No delivery selected';
  fitTitleInput();
  els.deliverySummaryInput.value = delivery?.summary || 'Refresh server jobs or open Deliveries from a CAIt context handoff to review reusable work.';
  els.deliveryStatusPill.textContent = hasDelivery ? statusLabel(delivery?.status || '') : 'waiting';
  els.deliveryStatusPill.className = `status-pill ${hasDelivery ? statusClass(delivery?.status || '') : 'pending'}`;
  els.deliveryUpdatedMeta.textContent = delivery?.updatedAt ? `Updated ${normalizedDate(delivery.updatedAt) || delivery.updatedAt}` : 'No timestamp';
  els.summaryCount.textContent = `${String(delivery?.summary || '').length.toLocaleString('en-US')} / 1000`;
  els.nextActionText.textContent = delivery?.nextAction || 'Load a delivery package before running follow-up.';
  els.packageMetaText.textContent = files.length ? `${files.length} file${files.length === 1 ? '' : 's'} ready` : 'No files attached';
  els.sourceMetaText.textContent = delivery?.sourceLabel || (importedContext ? 'CAIt context' : 'Server jobs');
  els.previewTitle.textContent = selectedFile ? `Preview: ${selectedFile.name}` : 'Output preview';
  els.outputPreview.textContent = selectedFile?.content || delivery?.summary || 'No delivery output is available yet. Refresh jobs or return from chat with a completed delivery context.';
  els.fileMetaText.textContent = files.length ? `${files.length} file${files.length === 1 ? '' : 's'} in this package.` : 'No files loaded.';
  els.fileTable.innerHTML = files.length ? [
    '<thead><tr><th>Name</th><th>Type</th><th>Size</th><th>Updated</th></tr></thead><tbody>',
    ...files.map((file, index) => [
      `<tr class="${index === selectedFileIndex ? 'active' : ''}" data-file-index="${index}">`,
      `<td><button class="file-pick-btn" type="button" data-file-index="${index}">${escapeHtml(file.name)}</button></td>`,
      `<td>${escapeHtml(file.type)}</td>`,
      `<td>${fileSizeLabel(file.content)}</td>`,
      `<td>${escapeHtml(normalizedDate(file.updatedAt) || '-')}</td>`,
      '</tr>'
    ].join('')),
    '</tbody>'
  ].join('') : '<tbody><tr><td>No files loaded.</td><td>-</td><td>-</td><td>-</td></tr></tbody>';
  els.actionRailSummary.textContent = delivery
    ? `Send "${compact(delivery.title, 58)}" to CAIt as context for the next order.`
    : 'No delivery is loaded yet. Refresh jobs or open Deliveries from a completed CAIt delivery.';
}

function renderReadiness() {
  const items = readinessItems();
  const complete = items.filter(([, ok]) => ok).length;
  const total = items.length;
  els.readinessScore.textContent = `${complete} / ${total}`;
  els.readinessMeter.style.width = `${Math.round((complete / total) * 100)}%`;
  els.readinessList.innerHTML = items.map(([label, ok]) => [
    `<div class="readiness-item ${ok ? 'ready' : ''}">`,
    `<span>${ok ? 'Ready' : 'Missing'}</span>`,
    `<strong>${escapeHtml(label)}</strong>`,
    '</div>'
  ].join('')).join('');
  els.readinessNote.textContent = complete === total
    ? 'This delivery is ready to provide high-quality follow-up context.'
    : 'Complete the missing items before sending this package to a leader.';
}

function renderApprovalGate() {
  const gate = approvalGateForDelivery();
  els.approvalStatePill.textContent = gate.label;
  els.approvalStatePill.className = `status-pill ${gate.state === 'blocked' ? 'blocked' : gate.state === 'approved' ? 'approved' : 'pending'}`;
  els.approvalGateSummary.textContent = gate.summary;
  els.approvalChecklist.innerHTML = gate.items.map((item) => [
    `<div class="approval-item ${item.ok ? 'ready' : 'needs-review'}">`,
    `<span>${item.ok ? 'Ready' : 'Review'}</span>`,
    '<strong>',
    escapeHtml(item.label),
    `<small>${escapeHtml(item.value)}</small>`,
    '</strong>',
    '</div>'
  ].join('')).join('');
  els.approveDeliveryBtn.disabled = !gate.approveEnabled;
  els.approveDeliveryBtn.textContent = gate.actionLabel;
  els.copyApprovalBtn.disabled = !selectedDelivery();
}

function renderHandoffNotice() {
  if (!els.deliveryHandoffNotice) return;
  const delivery = selectedDelivery();
  if (importedContext) {
    els.deliveryHandoffNotice.hidden = false;
    els.deliveryHandoffNotice.classList.toggle('notice-warning', !handoffSession.hasServerContext);
    els.deliveryHandoffNotice.innerHTML = [
      '<strong>Stable delivery handoff loaded</strong>',
      handoffSession.hasServerContext
        ? 'Before: AIAGENT chat output could be copied, closed, or lose its files. After: Deliveries keeps this server-side package, recovered files, approval gate, and return path available for the next CAIt run.'
        : 'This browser has delivery context, but no server context id is attached. Send to CAIt will create the server-side delivery packet before follow-up.'
    ].join('');
    return;
  }
  if (handoffSession.hasChatReturn) {
    els.deliveryHandoffNotice.hidden = false;
    els.deliveryHandoffNotice.classList.add('notice-warning');
    els.deliveryHandoffNotice.innerHTML = [
      '<strong>Chat return is attached, but no server package is loaded yet</strong>',
      'Refresh server jobs or send a selected delivery to CAIt so the follow-up run receives a durable Delivery Manager context instead of a chat-only handoff.'
    ].join('');
    return;
  }
  els.deliveryHandoffNotice.hidden = true;
  els.deliveryHandoffNotice.textContent = '';
}

function renderDeliveryHandoffAudit() {
  if (!els.deliveryHandoffAuditPill || !els.deliveryHandoffAuditList) return;
  const audit = deliveryHandoffAuditForDelivery();
  els.deliveryHandoffAuditPill.textContent = `${audit.complete} / ${audit.total} anchors`;
  els.deliveryHandoffAuditPill.className = `status-pill ${audit.complete === audit.total ? 'approved' : audit.complete ? 'pending' : 'blocked'}`;
  els.deliveryHandoffAuditList.innerHTML = audit.items.map((item) => [
    `<div class="delivery-handoff-audit-item ${item.ok ? 'ready' : ''}">`,
    `<span>${item.ok ? 'Present' : 'Missing'}</span>`,
    `<strong>${escapeHtml(item.label)}</strong>`,
    `<small>${escapeHtml(item.value || '')}</small>`,
    '</div>'
  ].join('')).join('');
}

function render() {
  renderCounts();
  renderList();
  renderTabs();
  renderSelected();
  renderApprovalGate();
  renderHandoffNotice();
  renderDeliveryHandoffAudit();
  renderReadiness();
  els.deliveryContextPreview.textContent = JSON.stringify(buildContext(), null, 2);
}

function downloadTextFile(name, content, type = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function copyPackage(button = els.copySelectedBtn) {
  await navigator.clipboard.writeText(packageText());
  const old = button.textContent;
  button.textContent = 'Copied';
  window.setTimeout(() => { button.textContent = old; }, 1200);
}

function downloadPackage() {
  const delivery = selectedDelivery();
  if (!delivery) return;
  const files = delivery.files || [];
  if (!files.length) {
    downloadTextFile(`${delivery.id || 'delivery'}-summary.md`, packageText(delivery));
    return;
  }
  for (const file of files) downloadTextFile(file.name, file.content || '', file.type || 'text/plain;charset=utf-8');
}

function downloadJson() {
  saveEditor();
  downloadContextJson(buildContext(), 'delivery-context.json');
}

function sendFollowup() {
  saveEditor();
  void sendContextToCait(buildContext()).catch((error) => {
    window.alert(`CAIt context handoff failed: ${error.message}`);
  });
}

async function copyApprovalNote() {
  const gate = approvalGateForDelivery();
  await navigator.clipboard.writeText(gate.note);
  const old = els.copyApprovalBtn.textContent;
  els.copyApprovalBtn.textContent = 'Copied';
  window.setTimeout(() => { els.copyApprovalBtn.textContent = old; }, 1200);
}

async function approveSelectedDelivery() {
  saveEditor();
  const delivery = selectedDelivery();
  const gate = approvalGateForDelivery(delivery);
  if (!delivery || !gate.approveEnabled) {
    window.alert('This delivery is not currently blocked on approval.');
    return;
  }
  const confirmed = window.confirm([
    'Approve and resume this paused execution lane?',
    '',
    gate.note
  ].join('\n'));
  if (!confirmed) return;
  const old = els.approveDeliveryBtn.textContent;
  els.approveDeliveryBtn.disabled = true;
  els.approveDeliveryBtn.textContent = 'Approving';
  try {
    const response = await fetchWithTimeout(`/api/jobs/${encodeURIComponent(delivery.id)}/approve`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        confirm_approval: true,
        approval_note: gate.note,
        source: 'delivery_manager'
      })
    }, 15000);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.error) throw new Error(payload.error || `approval ${response.status}`);
    if (payload.job) {
      const normalized = normalizeJobDelivery(payload.job);
      upsertDelivery(normalized);
      selectedId = normalized.id;
      selectedFileIndex = 0;
    } else {
      await refreshDeliveries();
      return;
    }
    render();
  } catch (error) {
    window.alert(`Approval failed: ${error.message}`);
  } finally {
    els.approveDeliveryBtn.textContent = old;
    renderApprovalGate();
  }
}

els.filterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    saveEditor();
    filter = String(button.dataset.filter || 'all');
    els.filterButtons.forEach((item) => item.classList.toggle('active', item === button));
    render();
  });
});

els.tabButtons.forEach((button) => {
  button.addEventListener('click', () => {
    activeTab = String(button.dataset.tab || 'overview');
    render();
  });
});

els.deliverySearchInput.addEventListener('input', () => {
  searchText = els.deliverySearchInput.value;
  render();
});

els.deliverySortSelect.addEventListener('change', () => {
  saveEditor();
  sortMode = String(els.deliverySortSelect.value || 'newest');
  deliveries = sortDeliveries(deliveries);
  const groups = groupedDeliveries(filteredDeliveries());
  selectedId = groups[0]?.items?.[0]?.id || filteredDeliveries()[0]?.id || selectedId;
  selectedFileIndex = 0;
  render();
});

els.deliveryList.addEventListener('click', (event) => {
  const button = event.target.closest('[data-delivery]');
  if (!button) return;
  saveEditor();
  selectedId = String(button.dataset.delivery || selectedId);
  selectedFileIndex = 0;
  render();
});

els.deliveryList.addEventListener('toggle', (event) => {
  const group = event.target.closest?.('[data-work]');
  if (!group) return;
  const workId = String(group.dataset.work || '').trim();
  if (!workId) return;
  if (group.open) expandedWorkIds.add(workId);
  else expandedWorkIds.delete(workId);
}, true);

els.fileTable.addEventListener('click', (event) => {
  const target = event.target.closest('[data-file-index]');
  if (!target) return;
  selectedFileIndex = Number(target.dataset.fileIndex || 0);
  activeTab = 'overview';
  render();
});

[els.deliveryTitleInput, els.deliverySummaryInput].forEach((input) => {
  input.addEventListener('input', () => {
    saveEditor();
    fitTitleInput();
    renderReadiness();
    els.deliveryContextPreview.textContent = JSON.stringify(buildContext(), null, 2);
    els.summaryCount.textContent = `${String(els.deliverySummaryInput.value || '').length.toLocaleString('en-US')} / 1000`;
  });
});

window.addEventListener('resize', fitTitleInput);

els.refreshDeliveriesBtn.addEventListener('click', refreshDeliveries);
els.sendDeliveryContextBtn.addEventListener('click', sendFollowup);
els.runFollowupBtn.addEventListener('click', sendFollowup);
els.approveDeliveryBtn.addEventListener('click', approveSelectedDelivery);
els.copyApprovalBtn.addEventListener('click', copyApprovalNote);
els.downloadJsonBtn.addEventListener('click', downloadJson);
els.railJsonBtn.addEventListener('click', downloadJson);
els.downloadSelectedBtn.addEventListener('click', downloadPackage);
els.railDownloadBtn.addEventListener('click', downloadPackage);
els.copySelectedBtn.addEventListener('click', () => copyPackage(els.copySelectedBtn));
els.railCopyBtn.addEventListener('click', () => copyPackage(els.railCopyBtn));
els.copyPreviewBtn.addEventListener('click', async () => {
  await navigator.clipboard.writeText(els.outputPreview.textContent || '');
  const old = els.copyPreviewBtn.textContent;
  els.copyPreviewBtn.textContent = 'Copied';
  window.setTimeout(() => { els.copyPreviewBtn.textContent = old; }, 1200);
});

async function bootstrap() {
  const imported = applyInboundContext(await fetchCaitAppContextFromUrl());
  if (imported) render();
  else await refreshDeliveries();
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
