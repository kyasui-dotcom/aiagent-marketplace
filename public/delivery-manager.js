import { buildCaitAppContext, downloadContextJson, fetchCaitAppContextFromUrl, sendContextToCait } from './cait-app-bridge.js?v=20260506b';

let deliveries = [];
let selectedId = '';
let selectedFileIndex = 0;
let filter = 'all';
let activeTab = 'overview';
let searchText = '';
let importedContext = null;
const expandedWorkIds = new Set();

const els = {
  filterButtons: [...document.querySelectorAll('[data-filter]')],
  tabButtons: [...document.querySelectorAll('[data-tab]')],
  tabPanels: {
    overview: document.getElementById('overviewPanel'),
    files: document.getElementById('filesPanel'),
    context: document.getElementById('contextPanel')
  },
  deliverySearchInput: document.getElementById('deliverySearchInput'),
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
  actionRailSummary: document.getElementById('actionRailSummary'),
  readinessScore: document.getElementById('readinessScore'),
  readinessMeter: document.getElementById('readinessMeter'),
  readinessList: document.getElementById('readinessList'),
  readinessNote: document.getElementById('readinessNote'),
  allCount: document.getElementById('allCount'),
  completedCount: document.getElementById('completedCount'),
  blockedCount: document.getElementById('blockedCount'),
  filesCount: document.getElementById('filesCount'),
  reusableCount: document.getElementById('reusableCount')
};

function selectedDelivery() {
  return deliveries.find((delivery) => delivery.id === selectedId) || deliveries[0] || null;
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
  const query = searchText.trim().toLowerCase();
  if (query) list = list.filter((item) => deliverySearchBlob(item).includes(query));
  return list;
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
  const files = Array.isArray(output.files) ? output.files : [];
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

function deliveryFromAppContext(context = {}) {
  const files = [
    ...(Array.isArray(context.delivery_files) ? context.delivery_files : []),
    ...(Array.isArray(context.artifacts) ? context.artifacts : [])
      .filter((artifact) => artifact?.content || artifact?.body || artifact?.markdown)
      .map((artifact, index) => ({
        name: artifact.name || artifact.title || `artifact-${index + 1}.md`,
        type: artifact.content_type || artifact.type || 'text/plain',
        content: artifact.content || artifact.body || artifact.markdown || ''
      }))
  ];
  return {
    id: String(context.id || `context-${Date.now()}`),
    workId: String(context.id || `context-${Date.now()}`),
    workTitle: String(context.title || 'Imported CAIt context'),
    jobKind: 'app_context',
    taskType: String(context.source_app || 'app_context'),
    workflowTask: '',
    workflowParentId: '',
    workflow: null,
    title: String(context.title || 'Imported CAIt context'),
    status: 'reusable',
    summary: String(context.summary || ''),
    files: files.map((file, index) => ({
      name: String(file.name || file.filename || `context-file-${index + 1}.md`),
      type: String(file.type || file.mime || file.content_type || 'text/plain'),
      content: String(file.content || file.body || ''),
      updatedAt: String(context.updated_at || context.updatedAt || '')
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
  try {
    const response = await fetch('/api/jobs?limit=40', { credentials: 'same-origin' });
    if (!response.ok) throw new Error(`jobs ${response.status}`);
    const data = await response.json();
    const jobs = Array.isArray(data.jobs) ? data.jobs : [];
    deliveries = jobs.map(normalizeJobDelivery).filter((item) => item.id);
    selectedId = deliveries[0]?.id || '';
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
      recommended_next_actions: ['Refresh server-side jobs or return to chat and select a delivery.'],
      handoff_targets: ['cmo_leader', 'seo_gap', 'build_team_leader']
    });
  }
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
      delivery.updatedAt ? `Updated: ${delivery.updatedAt}` : ''
    ].filter(Boolean),
    assumptions: [
      importedContext ? 'Files and artifacts are loaded from a server-side CAIt context.' : 'Files are loaded from server-side job output when available.',
      'Reusing a delivery creates a new CAIt context; it does not automatically execute follow-up work.'
    ],
    artifacts: [
      { type: 'delivery_package', id: delivery.id, status: delivery.status, summary: delivery.summary, next_action: delivery.nextAction }
    ],
    delivery_files: (delivery.files || []).map((file) => ({ name: file.name, type: file.type, content: file.content })),
    recommended_next_actions: [
      delivery.nextAction || 'Ask a leader to run follow-up with this delivery.',
      'Use external action tools only after approval and connector state are visible.'
    ],
    handoff_targets: ['cmo_leader', 'seo_gap', 'build_team_leader'],
    raw_context: importedContext ? { received_context: importedContext } : {}
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
  return [
    ['Summary present', Boolean(summary)],
    ['Delivery selected', Boolean(delivery?.id)],
    ['Status visible', Boolean(delivery?.status)],
    ['Files attached', files.length > 0],
    ['Next action captured', Boolean(String(delivery?.nextAction || '').trim())],
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
  els.deliveryInboxMeta.textContent = `${workCount} work item${workCount === 1 ? '' : 's'}, ${visible} run${visible === 1 ? '' : 's'} shown.`;
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
      items: group.items.sort((left, right) => {
        const rankDiff = deliverySortRank(left) - deliverySortRank(right);
        if (rankDiff) return rankDiff;
        return String(right.updatedAt || right.id || '').localeCompare(String(left.updatedAt || left.id || ''));
      })
    }))
    .sort((left, right) => String(right.updatedAt || '').localeCompare(String(left.updatedAt || '')));
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
  if (!list.some((item) => item.id === selectedId) && list[0]) {
    selectedId = list[0].id;
    selectedFileIndex = 0;
  }
  const groups = groupedDeliveries(list);
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

function render() {
  renderCounts();
  renderList();
  renderTabs();
  renderSelected();
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
    renderReadiness();
    els.deliveryContextPreview.textContent = JSON.stringify(buildContext(), null, 2);
    els.summaryCount.textContent = `${String(els.deliverySummaryInput.value || '').length.toLocaleString('en-US')} / 1000`;
  });
});

els.refreshDeliveriesBtn.addEventListener('click', refreshDeliveries);
els.sendDeliveryContextBtn.addEventListener('click', sendFollowup);
els.runFollowupBtn.addEventListener('click', sendFollowup);
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
