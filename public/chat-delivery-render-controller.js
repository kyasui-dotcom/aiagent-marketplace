import { connectorGateRenderAuthorityRequest } from './connector-gate.js?v=20260519a';
import {
  deliveryOrderActionsHtml as deliveryRendererOrderActionsHtml,
  deliveryRendererMeta,
  renderDeliveryBody
} from './delivery-renderer.js?v=20260526a';
import {
  deliveryFileDisplayTitle,
  deliveryFileProvenanceParts
} from './delivery-provenance-utils.js?v=20260521a';

export function createChatDeliveryRenderController(deps = {}) {
  const {
    state,
    window,
    document,
    backfillIntervalMs,
    combinedMarkdownFile,
    compact,
    currentChatReturnPath,
    deliveryRendererOrderActionsHtml: renderDeliveryOrderActionsHtml = deliveryRendererOrderActionsHtml,
    deliveryRendererMeta: renderDeliveryMeta = deliveryRendererMeta,
    renderDeliveryBody: renderDeliveryBodyHtml = renderDeliveryBody,
    deliveryFilePriority,
    escapeHtml,
    getDeliveryFile,
    jobBlockedByLeaderQualityGate,
    jobBlockedForSaasHandoff,
    loginHref,
    recoveryCandidate,
    refreshRecentJobs,
    registerDeliveryFile,
    renderAppHandoffTools,
    renderDedicatedAppDeliveryTools,
    sanitizeDeliveryFileForUser,
    sanitizeDeliveryMarkdownForUser,
    saveChatOAuthReturnState,
    statusDisplayLabel,
    taskLabel,
    visibleDeliveryFiles,
    isTerminalStatus,
    appendMessage,
    appendTextMessage,
    markOrderDelivered,
    rememberAiAgentsFromJob,
    rememberTrackedOrder,
    showWorkflowProgressMap,
    startPolling,
    getPolling,
    liveProgressStoppedOrderIds,
    getOrderId,
    setOrderId
  } = deps;
  const cssEscape = deps.cssEscape || ((value) => String(value || '').replace(/["\\]/g, '\\$&'));

  function jobHasDeliveryResult(job = {}) {
    return isTerminalStatus(job?.status) || jobBlockedByLeaderQualityGate(job) || jobBlockedForSaasHandoff(job);
  }

  function deliveryFiles(job = {}) {
    const output = job.output && typeof job.output === 'object' ? job.output : {};
    const delivery = output.delivery && typeof output.delivery === 'object' ? output.delivery : {};
    const report = output.report && typeof output.report === 'object' ? output.report : {};
    const deliveryReport = delivery.report && typeof delivery.report === 'object' ? delivery.report : {};
    const candidates = [
      ...(Array.isArray(output.files) ? output.files : []),
      ...(Array.isArray(report.files) ? report.files : []),
      ...(Array.isArray(delivery.files) ? delivery.files : []),
      ...(Array.isArray(deliveryReport.files) ? deliveryReport.files : [])
    ];
    const seen = new Set();
    return visibleDeliveryFiles(candidates)
      .filter((file) => file && (file.content || file.name))
      .map((file, index) => sanitizeDeliveryFileForUser(file, `delivery-${index + 1}.md`))
      .filter((file) => file && String(file.content || '').trim())
      .sort((left, right) => deliveryFilePriority(left) - deliveryFilePriority(right))
      .filter((file) => {
        const key = `${file.name || ''}:${String(file.content || '').slice(0, 120)}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 8);
  }

  function deliveryText(job = {}) {
    const output = job.output && typeof job.output === 'object' ? job.output : {};
    const report = output.report && typeof output.report === 'object' ? output.report : {};
    const delivery = output.delivery && typeof output.delivery === 'object' ? output.delivery : {};
    const deliveryReport = delivery.report && typeof delivery.report === 'object' ? delivery.report : {};
    const bullets = [
      ...(Array.isArray(report.bullets) ? report.bullets : []),
      ...(Array.isArray(deliveryReport.bullets) ? deliveryReport.bullets : [])
    ].filter(Boolean).slice(0, 8);
    const failed = ['failed', 'timed_out'].includes(String(job.status || '').trim().toLowerCase());
    const failureReason = String(job.failureReason || job.failure_reason || report.failure_reason || report.error || output.error || '').trim();
    const text = [
      failed && failureReason ? `Failure reason: ${failureReason}` : '',
      output.summary || report.summary || delivery.summary || deliveryReport.summary || job.failureReason || '',
      bullets.length ? bullets.map((item) => `- ${item}`).join('\n') : '',
      report.nextAction || report.next_action || deliveryReport.nextAction || deliveryReport.next_action || ''
    ].filter(Boolean).join('\n\n').trim();
    return sanitizeDeliveryMarkdownForUser(text);
  }

  function renderAuthorityRequest(job = {}) {
    return connectorGateRenderAuthorityRequest(job, {
      auth: state.auth || {},
      orderId: state.orderId,
      visitorId: state.visitorId,
      origin: window.location.origin,
      returnPathForProvider: (provider) => currentChatReturnPath({ oauthPopup: true, oauthProvider: provider }),
      loginHref,
      saveOAuthState: saveChatOAuthReturnState
    });
  }

  function maybeRenderAuthorityNotice(job = {}, options = {}) {
    const key = authorityNoticeKey(job);
    if (!key) return false;
    const body = renderAuthorityRequest(job);
    if (!body) return false;
    const existing = document.getElementById(approvalAnchorForJob(job));
    if (existing) {
      existing.outerHTML = body;
      state.authorityNoticeKeys.add(key);
      return true;
    }
    if (state.authorityNoticeKeys.has(key)) return false;
    state.authorityNoticeKeys.add(key);
    appendMessage('assistant', body, {
      tone: 'warn',
      label: options.label || 'Approval required'
    });
    return true;
  }

  function authorityNoticeKey(job = {}) {
    return deps.authorityNoticeKey(job);
  }

  function approvalAnchorForJob(job = {}) {
    return deps.approvalAnchorForJob(job);
  }

  function renderFileCards(files = []) {
    const bundle = files.length > 1 ? registerDeliveryFile(combinedMarkdownFile(files), 'delivery-bundle.md') : null;
    const bundleActions = bundle
      ? [
        '<div class="file-actions bundle-actions">',
        `<button class="primary-btn inline-btn file-action" type="button" data-file-action="download" data-file-id="${escapeHtml(bundle.id)}">Download all MD</button>`,
        `<button class="ghost-btn inline-btn file-action" type="button" data-file-action="copy" data-file-id="${escapeHtml(bundle.id)}">Copy all</button>`,
        '</div>'
      ].join('')
      : '';
    const cards = files.map((file, index) => {
      const registered = registerDeliveryFile(file, `delivery-${index + 1}.md`);
      const name = registered.name;
      const content = registered.content.trim();
      const displayTitle = deliveryFileDisplayTitle(file, name);
      const metaParts = deliveryFileProvenanceParts(file, { taskLabel });
      const isHtml = /\.html?$/i.test(name) || /<!doctype html|<html[\s>]/i.test(content);
      const downloadLabel = isHtml ? 'Download HTML' : 'Download MD';
      const preview = isHtml
        ? `<iframe class="html-preview" sandbox="allow-scripts allow-forms allow-popups" referrerpolicy="no-referrer" srcdoc="${escapeHtml(content)}" title="${escapeHtml(name)} preview"></iframe>`
        : '';
      return [
        '<details class="file-card">',
        `<summary>${escapeHtml(displayTitle || name)}</summary>`,
        metaParts.length ? `<div class="row-muted">${escapeHtml(metaParts.join(' · '))}</div>` : '',
        '<div class="file-actions">',
        `<button class="primary-btn inline-btn file-action" type="button" data-file-action="download" data-file-id="${escapeHtml(registered.id)}">${escapeHtml(downloadLabel)}</button>`,
        `<button class="ghost-btn inline-btn file-action" type="button" data-file-action="copy" data-file-id="${escapeHtml(registered.id)}">Copy</button>`,
        '</div>',
        `<pre>${escapeHtml(content || '(empty file)')}</pre>`,
        preview,
        '</details>'
      ].join('');
    }).join('');
    return [bundleActions, cards].filter(Boolean).join('');
  }

  function retryReusableArtifactEntries(job = {}) {
    const status = String(job.status || '').trim().toLowerCase();
    if (!['failed', 'timed_out'].includes(status) && !jobBlockedByLeaderQualityGate(job)) return [];
    const sourceOrderId = String(job.id || '').trim();
    const seenTasks = new Set();
    return deliveryFiles(job)
      .map((file) => {
        const taskType = String(file.source_task_type || file.sourceTaskType || '').trim().toLowerCase();
        const sourceRunId = String(file.source_run_id || file.sourceRunId || '').trim();
        const content = String(file.content || '').trim();
        if (!taskType || taskType.endsWith('_leader') || !sourceRunId || !content) return null;
        if (seenTasks.has(taskType)) return null;
        seenTasks.add(taskType);
        return {
          file,
          taskType,
          sourceRunId,
          sourceOrderId,
          agentName: String(file.source_agent_name || file.sourceAgentName || taskLabel(taskType)).trim(),
          fileName: String(file.name || `${taskType}-delivery.md`).trim() || `${taskType}-delivery.md`,
          summary: String(file.summary || file.reason || '').trim()
        };
      })
      .filter(Boolean)
      .slice(0, 8);
  }

  function selectedRetryReuseArtifactsForOrder(orderId = '') {
    const safeOrderId = String(orderId || '').trim();
    if (!safeOrderId) return [];
    return [...document.querySelectorAll(`[data-retry-reuse-order="${cssEscape(safeOrderId)}"][data-retry-reuse-artifact]:checked`)]
      .map((input) => {
        const file = getDeliveryFile(input.dataset.fileId || '');
        const taskType = String(input.dataset.taskType || '').trim().toLowerCase();
        const sourceRunId = String(input.dataset.sourceRunId || '').trim();
        if (!file || !taskType || !sourceRunId || !String(file.content || '').trim()) return null;
        return {
          task_type: taskType,
          taskType,
          source_order_id: safeOrderId,
          sourceOrderId: safeOrderId,
          source_run_id: sourceRunId,
          sourceRunId,
          file_name: file.name || `${taskType}-delivery.md`,
          fileName: file.name || `${taskType}-delivery.md`,
          content: String(file.content || '').slice(0, 60000),
          type: file.type || 'text/markdown',
          content_type: file.content_type || file.contentType || 'reused_agent_delivery',
          source_agent_name: String(input.dataset.agentName || file.source_agent_name || file.sourceAgentName || '').trim(),
          user_selected: true,
          userSelected: true,
          selected_at: new Date().toISOString()
        };
      })
      .filter(Boolean);
  }

  function cachedVisibleJobForRetry(orderId = '') {
    const safeId = String(orderId || '').trim();
    if (!safeId) return null;
    return (Array.isArray(state.recentJobs) ? state.recentJobs : [])
      .find((job) => String(job?.id || '').trim() === safeId) || null;
  }

  function retryReuseArtifactMeta(item = {}) {
    const taskType = String(item.task_type || item.taskType || '').trim().toLowerCase();
    const fileName = String(item.file_name || item.fileName || `${taskType || 'artifact'}-delivery.md`).trim();
    return {
      task_type: taskType,
      taskType,
      source_order_id: String(item.source_order_id || item.sourceOrderId || '').trim(),
      sourceOrderId: String(item.sourceOrderId || item.source_order_id || '').trim(),
      source_run_id: String(item.source_run_id || item.sourceRunId || '').trim(),
      sourceRunId: String(item.sourceRunId || item.source_run_id || '').trim(),
      file_name: fileName || `${taskType || 'artifact'}-delivery.md`,
      fileName: fileName || `${taskType || 'artifact'}-delivery.md`,
      type: String(item.type || 'text/markdown').trim() || 'text/markdown',
      content_type: String(item.content_type || item.contentType || 'reused_agent_delivery').trim() || 'reused_agent_delivery',
      content_chars: String(item.content || '').length,
      source_agent_name: String(item.source_agent_name || item.sourceAgentName || '').trim(),
      user_selected: true,
      userSelected: true,
      selected_at: String(item.selected_at || item.selectedAt || '').trim()
    };
  }

  function workflowRetryMetaForDraft(workflow = {}, reuseArtifacts = []) {
    const next = workflow && typeof workflow === 'object' ? { ...workflow } : {};
    delete next.reusedArtifacts;
    delete next.reuseArtifacts;
    delete next.retryReuseArtifacts;
    delete next.retry_reuse_artifacts;
    const metas = reuseArtifacts.map(retryReuseArtifactMeta).filter((item) => item.task_type && item.source_run_id);
    return metas.length
      ? { ...next, reusedArtifacts: metas, retryReuseArtifacts: metas }
      : next;
  }

  function renderRetryReuseControls(job = {}) {
    const orderId = String(job.id || '').trim();
    const artifacts = retryReusableArtifactEntries(job);
    if (!orderId || !artifacts.length) return '';
    const rows = artifacts.map((entry) => {
      const registered = registerDeliveryFile(entry.file, entry.fileName);
      const label = `${taskLabel(entry.taskType)}: ${entry.fileName}`;
      const meta = entry.agentName && entry.agentName !== taskLabel(entry.taskType)
        ? ` (${entry.agentName})`
        : '';
      return [
        '<label class="retry-reuse-row">',
        `<input type="checkbox" data-retry-reuse-artifact="1" data-retry-reuse-order="${escapeHtml(orderId)}" data-file-id="${escapeHtml(registered.id)}" data-task-type="${escapeHtml(entry.taskType)}" data-source-run-id="${escapeHtml(entry.sourceRunId)}" data-agent-name="${escapeHtml(entry.agentName)}">`,
        `<span>${escapeHtml(label)}${escapeHtml(meta)}</span>`,
        '</label>'
      ].join('');
    }).join('');
    return [
      '<div class="approval-card retry-reuse-card">',
      '<strong>Reuse completed artifacts on retry / 完了済み成果物をリトライで再利用</strong>',
      '<div>Select only outputs you inspected and trust. Selected agent steps will be marked reused and will not run again in the new order.</div>',
      `<div class="retry-reuse-list">${rows}</div>`,
      '<span class="chat-hint">Nothing is reused automatically. Press Retry as new order after selecting the artifacts to carry forward.</span>',
      '</div>'
    ].join('\n');
  }

  function deliveryOrderActionsHtml(job = {}) {
    return renderDeliveryOrderActionsHtml(job, {
      escapeHtml,
      jobHasDeliveryResult,
      jobBlockedByLeaderQualityGate
    });
  }

  function renderDelivery(job = {}) {
    rememberAiAgentsFromJob(job);
    const files = deliveryFiles(job);
    const text = deliveryText(job) || `Order ${job.id || ''} is ${statusDisplayLabel(job.status || 'updated')}.`;
    const meta = renderDeliveryMeta(job, {
      jobBlockedByLeaderQualityGate,
      jobHasDeliveryResult
    });
    const body = renderDeliveryBodyHtml(job, {
      escapeHtml,
      files,
      text,
      statusDisplayLabel,
      jobBlockedByLeaderQualityGate,
      jobHasDeliveryResult,
      renderAuthorityRequest,
      renderRetryReuseControls,
      deliveryOrderActionsHtml,
      renderDedicatedAppDeliveryTools,
      renderAppHandoffTools,
      renderFileCards
    });
    appendMessage(jobHasDeliveryResult(job) ? 'assistant' : 'system', body, {
      tone: meta.tone,
      label: meta.label
    });
  }

  function renderDeliveryOnce(job = {}, options = {}) {
    const safeId = String(job?.id || '').trim();
    if (!safeId || !jobHasDeliveryResult(job)) return false;
    if (state.deliveredOrderIds.has(safeId) && !options.force) return false;
    rememberTrackedOrder(safeId);
    notifyOrderMilestone(job);
    showWorkflowProgressMap(job, { footer: jobHasDeliveryResult(job) ? 'Workflow finished.' : '' });
    renderDelivery(job);
    markOrderDelivered(safeId);
    return true;
  }

  function orderMilestoneState(job = {}, options = {}) {
    const explicit = String(options.state || options.orderState || '').trim().toLowerCase();
    if (explicit) return explicit;
    const status = String(job?.status || '').trim().toLowerCase();
    const reviewStatus = String(job?.reviewStatus || job?.review_status || job?.output?.reviewStatus || job?.output?.review_status || job?.output?.delivery?.reviewStatus || '').trim().toLowerCase();
    if (['approved', 'accepted', 'done'].includes(reviewStatus)) return 'done';
    if (['failed', 'timed_out'].includes(status)) return 'failed';
    if (['cancelled', 'canceled'].includes(status)) return 'cancelled';
    if (status === 'blocked') return 'blocked';
    if (status === 'completed') return 'review';
    if (['revision', 'revising'].includes(status)) return 'revision';
    if (status === 'submitted') return 'submitted';
    if (status === 'planning') return 'planning';
    if (status === 'assigned' || status === 'claimed') return 'assigned';
    if (['running', 'dispatched'].includes(status) || job.startedAt || job.started_at || job.dispatchedAt || job.dispatched_at) return 'running';
    if (['queued', 'created', 'pending'].includes(status)) {
      if (job.assignedAgentId || job.assigned_agent_id || job.workflow || job.jobKind === 'workflow') return 'assigned';
      return 'planning';
    }
    return status || 'submitted';
  }

  function orderMilestoneMessage(job = {}, options = {}) {
    const orderState = orderMilestoneState(job, options);
    const orderId = String(job?.id || options.orderId || getOrderId() || '').trim();
    const shortId = orderId ? `#${orderId.slice(0, 8)}` : 'order';
    const prompt = String(job?.originalPrompt || job?.original_prompt || job?.prompt || options.prompt || '').trim();
    const title = prompt ? ` "${compact(prompt, 72)}"` : '';
    const prefix = `Order ${shortId}: `;
    const messages = {
      submitted: `${prefix}Order submitted.${title}`,
      planning: `${prefix}Creating execution plan.`,
      assigned: `${prefix}Worker assigned.`,
      running: `${prefix}Work started.`,
      blocked: `${prefix}Input required. Please review the requested approval or connector action.`,
      review: `${prefix}Deliverable submitted. Please review.`,
      revision: `${prefix}Revision request received. Reworking.`,
      done: `${prefix}Completed.`,
      failed: `${prefix}Failed. Please check the cause.`,
      cancelled: `${prefix}Cancelled.`
    };
    return messages[orderState] || `${prefix}${statusDisplayLabel(orderState)}.`;
  }

  function orderMilestoneChatExists(orderId = '', orderState = '', message = '') {
    const shortId = String(orderId || '').trim().slice(0, 8);
    const needle = String(message || '').trim();
    if (!needle) return false;
    const statePhrase = {
      submitted: 'Order submitted',
      planning: 'Creating execution plan',
      assigned: 'Worker assigned',
      running: 'Work started',
      blocked: 'Input required',
      review: 'Deliverable submitted',
      revision: 'Revision request received',
      done: 'Completed',
      failed: 'Failed',
      cancelled: 'Cancelled'
    }[String(orderState || '').trim().toLowerCase()] || '';
    return state.chatMessages.some((entry) => {
      const body = String(entry?.body || '').trim();
      if (!body) return false;
      if (body === needle) return true;
      return Boolean(shortId && statePhrase && body.includes(`#${shortId}`) && body.includes(statePhrase));
    });
  }

  function notifyOrderMilestone(job = {}, options = {}) {
    const orderId = String(job?.id || options.orderId || getOrderId() || '').trim();
    const orderState = orderMilestoneState(job, options);
    if (!orderId || !orderState) return false;
    const key = `${orderId}|${orderState}`;
    const message = orderMilestoneMessage(job, { ...options, state: orderState });
    if (state.orderMilestoneNoticeKeys.has(key) || orderMilestoneChatExists(orderId, orderState, message)) {
      state.orderMilestoneNoticeKeys.add(key);
      return false;
    }
    state.orderMilestoneNoticeKeys.add(key);
    appendTextMessage('system', message, {
      tone: ['done', 'review'].includes(orderState) ? 'ok' : (['failed', 'cancelled'].includes(orderState) ? 'error' : (orderState === 'blocked' ? 'warn' : 'info')),
      label: 'Order'
    });
    return true;
  }

  async function backfillChatDeliveries(options = {}) {
    const jobs = await refreshRecentJobs({ force: true, limit: 30 });
    let delivered = 0;
    const activeOrderId = String(options.orderId || getOrderId() || '').trim();
    const notifyMilestones = options.notifyMilestones !== false;
    for (const job of jobs) {
      const safeId = String(job?.id || '').trim();
      if (!safeId) continue;
      if (activeOrderId && safeId !== activeOrderId && options.includeHistoricalTracked !== true) continue;
      const matchesTracked = state.trackedOrderIds.has(safeId);
      const matchesRecovery = state.pendingRecoveryPayloads.some((payload) => recoveryCandidate(job, payload));
      if (!matchesTracked && !matchesRecovery) continue;
      rememberTrackedOrder(safeId);
      if (!getOrderId() && matchesRecovery) setOrderId(safeId);
      if (notifyMilestones) notifyOrderMilestone(job);
      if (jobHasDeliveryResult(job)) {
        if (options.renderTerminalDeliveries === false && !matchesRecovery) continue;
        if (renderDeliveryOnce(job, { force: options.force === true })) delivered += 1;
      } else if (!getPolling() && safeId === getOrderId() && !liveProgressStoppedOrderIds().has(safeId)) {
        showWorkflowProgressMap(job);
        maybeRenderAuthorityNotice(job, { label: 'Approval required' });
        startPolling(safeId);
      } else {
        showWorkflowProgressMap(job);
        maybeRenderAuthorityNotice(job, { label: 'Approval required' });
      }
    }
    return delivered;
  }

  function startDeliveryBackfillLoop(options = {}) {
    if (state.deliveryBackfill) return;
    let runs = 0;
    const viewRevision = Number(options.viewRevision || state.chatViewRevision || 0) || 0;
    let intervalId = null;
    const stopLoop = () => {
      if (intervalId) window.clearInterval(intervalId);
      if (state.deliveryBackfill === intervalId) state.deliveryBackfill = null;
    };
    const tick = async () => {
      if (viewRevision && Number(state.chatViewRevision || 0) !== viewRevision) {
        stopLoop();
        return;
      }
      runs += 1;
      try {
        await backfillChatDeliveries(options);
      } catch {}
      if (runs >= Number(options.maxRuns || 36)) {
        stopLoop();
      }
    };
    intervalId = window.setInterval(tick, backfillIntervalMs);
    state.deliveryBackfill = intervalId;
    void tick();
  }

  return {
    backfillChatDeliveries,
    cachedVisibleJobForRetry,
    deliveryFiles,
    deliveryOrderActionsHtml,
    deliveryText,
    jobHasDeliveryResult,
    maybeRenderAuthorityNotice,
    notifyOrderMilestone,
    orderMilestoneChatExists,
    orderMilestoneMessage,
    orderMilestoneState,
    renderAuthorityRequest,
    renderDelivery,
    renderDeliveryOnce,
    renderFileCards,
    renderRetryReuseControls,
    retryReuseArtifactMeta,
    retryReusableArtifactEntries,
    selectedRetryReuseArtifactsForOrder,
    startDeliveryBackfillLoop,
    workflowRetryMetaForDraft
  };
}
