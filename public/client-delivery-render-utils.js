export function createClientDeliveryRenderUtils(deps = {}) {
  const {
    articleCandidateFromDelivery,
    authorityRequestFromReport,
    authorityRequestRequiresClientApproval,
    clarifyingQuestionsFromReport,
    deliveryFileDisplayTitle,
    deliveryFileProvenanceParts,
    deliveryStateFromValue,
    deliverySummaryText,
    describeAuthorityNeed,
    els,
    escapeHtml,
    fundingBreakdownLines,
    genericDeliverableFromClassification,
    genericDeliverableFromExplicitFiles,
    inputSourcesFromJob,
    jobById,
    normalizeOrderProgressStatus,
    orderProgressStatusLabel,
    setElementVisible,
    state,
    visibleDeliveryFiles,
    workflowChildDisplayName,
    workflowChildRunsFromDelivery
  } = deps;

  function deliveryCardBodyLines(run = null, report = {}, options = {}) {
    const summaryText = String(options.summaryText || '').trim();
    const workflowChildren = Array.isArray(options.workflowChildren) ? options.workflowChildren : [];
    const fileCount = Number(options.fileCount || 0);
    const authority = authorityRequestFromReport(report || {});
    const status = normalizeOrderProgressStatus(run?.status || '');
    const workflowApprovalBlocked = status === 'blocked' || (run?.jobKind === 'workflow' && authorityRequestRequiresClientApproval(authority));
    const heading = workflowApprovalBlocked
      ? 'TEAM ACTION WAITING FOR APPROVAL'
      : (run?.jobKind === 'workflow' ? 'TEAM DELIVERY SUMMARY' : 'DELIVERY SUMMARY');
    const lines = [
      heading,
      '',
      summaryText || (run?.jobKind === 'workflow'
        ? 'The integrated report merged the supporting work products into one delivery.'
        : 'Structured delivery received.')
    ];
    if (workflowApprovalBlocked) {
      lines.push('');
      lines.push('Action status: approval or connector setup required before external posting/sending.');
      if (authority?.reason) lines.push(`Reason: ${authority.reason}`);
      lines.push(`Required: ${describeAuthorityNeed(authority?.missingConnectorCapabilities || [], authority?.missingConnectors || [])}.`);
    }
    lines.push('');
    lines.push(`Status: ${String(orderProgressStatusLabel(status || 'unknown') || 'unknown').toUpperCase()}`);
    if (run?.id) lines.push(`Order ID: ${run.id}`);
    if (run?.jobKind === 'workflow' && workflowChildren.length) lines.push(`Supporting work items: ${workflowChildren.length}`);
    lines.push(`Delivery files: ${fileCount}`);
    lines.push('Re-ordering or adding context: continue in CAIt Chat.');
    return [
      ...lines
    ];
  }

  function renderDeliveryActionToolbar(run = null, options = {}) {
    const actions = [];
    if (options.summaryText) {
      actions.push('<button class="mini-btn" data-copy-delivery-summary="1">COPY SUMMARY</button>');
      actions.push('<button class="mini-btn" data-download-delivery-summary="1">DOWNLOAD SUMMARY</button>');
    }
    const downloadableFiles = Array.isArray(options.files)
      ? options.files.filter((file) => String(file?.content || '').trim())
      : [];
    if (downloadableFiles.length) {
      actions.push('<button class="mini-btn" data-download-delivery-zip="1">DOWNLOAD ZIP</button>');
    }
    if (Number(options.fileCount || 0) === 1 && options.files?.[0]?.content) {
      actions.push('<button class="mini-btn" data-copy-delivery-file="0">COPY FILE</button>');
      actions.push('<button class="mini-btn" data-download-delivery-file="0">DOWNLOAD FILE</button>');
    }
    if (options.workflowParent?.id) {
      actions.push('<button class="mini-btn" data-open-workflow-parent="1">OPEN TEAM SUMMARY</button>');
    }
    return actions.length ? `<div class="helper-row">${actions.join('')}</div>` : '';
  }

  function deliverySummaryTone(run = null, report = {}) {
    const status = normalizeOrderProgressStatus(run?.status || '');
    if (status === 'failed' || status === 'timed_out') return 'error';
    if (status === 'blocked' || authorityRequestRequiresClientApproval(authorityRequestFromReport(report || {}))) return 'warn';
    if (status === 'completed') return 'ok';
    return 'info';
  }

  function renderDeliverySummaryCard(run = null, report = {}, options = {}) {
    const summaryText = String(options.summaryText || '').trim();
    const actions = [];
    if (summaryText) {
      actions.push('<button class="mini-btn" data-copy-delivery-summary="1">COPY SUMMARY</button>');
      actions.push('<button class="mini-btn" data-download-delivery-summary="1">DOWNLOAD SUMMARY</button>');
    }
    actions.push('<button class="mini-btn" data-chat-action="open_work_tab">ADD CONTEXT IN CHAT</button>');
    return [
      `<div class="delivery-summary-text">${escapeHtml(summaryText || 'No summary returned yet.')}</div>`,
      `<div class="helper-row delivery-summary-actions">${actions.join('')}</div>`
    ].join('');
  }

  function renderWorkflowTeamSummary(workflowChildren = []) {
    if (!Array.isArray(workflowChildren) || !workflowChildren.length) return '';
    const leaderItems = workflowChildren
      .filter((child) => /(^|_)(leader)$/.test(String(child.taskType || '').trim().toLowerCase()))
      .sort((left, right) => {
        const phaseRank = (value) => {
          const phase = String(value?.sequencePhase || '').trim().toLowerCase();
          if (phase === 'final_summary') return 3;
          if (phase === 'checkpoint') return 2;
          if (phase === 'initial') return 1;
          return 0;
        };
        const leftRank = phaseRank(left);
        const rightRank = phaseRank(right);
        if (leftRank !== rightRank) return rightRank - leftRank;
        const leftCompleted = String(left?.completedAt || '').trim();
        const rightCompleted = String(right?.completedAt || '').trim();
        const completedCompare = rightCompleted.localeCompare(leftCompleted);
        if (completedCompare) return completedCompare;
        return String(right?.id || '').localeCompare(String(left?.id || ''));
      });
    const visibleLeader = leaderItems[0] || null;
    const visibleChildren = workflowChildren.filter((child) => {
      const isLeader = /(^|_)(leader)$/.test(String(child.taskType || '').trim().toLowerCase());
      if (!isLeader) return true;
      if (!visibleLeader) return true;
      return child === visibleLeader;
    });
    const summaryTextForChild = (child = {}) => {
      const summary = String(child.summary || child.failureReason || '').trim();
      if (summary) return summary;
      const status = String(child.status || '').trim().toLowerCase();
      if (status === 'blocked') return 'Waiting for the earlier research or action phase to finish.';
      if (['queued', 'created'].includes(status)) return 'Queued. Specialist summary will appear after the run starts.';
      if (['claimed', 'running', 'dispatched'].includes(status)) return 'In progress. Summary will update after the run returns.';
      return 'No specialist summary returned yet.';
    };
    return `
      <details class="delivery-team-group" open>
        <summary>INTEGRATED REPORT</summary>
        <div class="delivery-team-note">Start here. This merged delivery is the default report. Open individual research, writing, or execution items only when you want supporting detail.</div>
        <div class="delivery-team-list">
          ${visibleChildren.map((child, index) => `
            <div class="delivery-team-item">
              <div>
                <strong>${escapeHtml(`${index + 1}. ${workflowChildDisplayName(child)}`)}</strong>
                ${child.sequencePhase ? `<div class="row-muted">${escapeHtml(`PHASE ${String(child.sequencePhase || '').toUpperCase()}`)}</div>` : ''}
                <div class="row-muted">${escapeHtml(String(orderProgressStatusLabel(child.status || 'unknown') || 'unknown').toUpperCase())}</div>
                <div>${escapeHtml(summaryTextForChild(child))}</div>
              </div>
              <div class="helper-row">
                ${child.id ? `<button class="mini-btn" data-open-child-run="${escapeHtml(child.id)}">OPEN DETAIL</button>` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </details>
    `;
  }

  function renderWorkflowChildNote(workflowParent = null) {
    if (!workflowParent?.id) return '';
    return `
      <div class="detail-box action-card info compact-card delivery-team-note">
        This run is one supporting work item inside an Agent Team. Open the integrated report first, then return here if you want the underlying research, writing, or execution detail.
      </div>
    `;
  }

  function renderDeliveryFileList(files = []) {
    if (!Array.isArray(files) || !files.length) return '';
    return files.map((file, index) => {
      const displayTitle = deliveryFileDisplayTitle(file, `file-${index + 1}`);
      const meta = deliveryFileProvenanceParts(file).join(' · ');
      return `
      <div class="delivery-file">
        <div>
          <strong>${escapeHtml(displayTitle)}</strong>
          <div class="row-muted">${escapeHtml(file.name || `file-${index + 1}`)} · ${escapeHtml(file.type || 'text/plain')} · ${String(file.content || '').length} chars</div>
          ${meta ? `<div class="row-muted">${escapeHtml(meta)}</div>` : ''}
        </div>
        <div class="helper-row">
          <button class="mini-btn" data-copy-delivery-file="${index}">COPY</button>
          <button class="mini-btn" data-download-delivery-file="${index}">DOWNLOAD</button>
        </div>
      </div>
    `;
    }).join('');
  }

  function renderDeliveryFilesPanel(files = [], options = {}) {
    const safeFiles = visibleDeliveryFiles(files);
    const downloadableFiles = safeFiles.filter((file) => String(file?.content || '').trim());
    if (!safeFiles.length) {
      return `
      <div class="detail-box action-card info compact-card delivery-files-panel">
        <div class="delivery-files-head">
          <div>
            <strong>DELIVERY FILES</strong>
            <div class="row-muted">No delivery files were returned for this order.</div>
          </div>
        </div>
      </div>
    `;
    }
    return `
      <div class="detail-box action-card info compact-card delivery-files-panel">
        <div class="delivery-files-head">
          <div>
            <strong>DELIVERY FILES</strong>
            <div class="row-muted">${safeFiles.length} file${safeFiles.length === 1 ? '' : 's'} · summary and full artifacts stay separate</div>
          </div>
          <div class="helper-row">
            ${downloadableFiles.length ? '<button class="mini-btn" data-download-delivery-zip="1">DOWNLOAD ZIP</button>' : ''}
          </div>
        </div>
        ${renderDeliveryFileList(safeFiles)}
      </div>
    `;
  }

  function deliveryEmptyStatePresentation(run = null, delivery = null, report = null, files = []) {
    const normalizedFiles = Array.isArray(files) ? files : [];
    if (!run && !delivery) {
      return {
        tone: 'info',
        text: 'No delivery yet. Completed orders will show copy and download actions here.'
      };
    }
    if (run && run.status !== 'completed' && !report && !normalizedFiles.length) {
      return {
        tone: 'warn',
        text: `No delivery yet.\n\nCurrent status: ${String(run.status || 'unknown').toUpperCase()}. Delivery actions appear after completion.`
      };
    }
    if (run && ['failed', 'timed_out'].includes(run.status) && !report && !normalizedFiles.length) {
      return {
        tone: 'error',
        text: `No delivery.\n\nThe order ended as ${String(run.status).toUpperCase()}. Inspect failure details before retrying.`
      };
    }
    return null;
  }

  function deliveryRenderContextFromValue(value) {
    const { run, delivery } = deliveryStateFromValue(value);
    const report = delivery?.report || null;
    const files = visibleDeliveryFiles(delivery?.files);
    const workflowChildren = workflowChildRunsFromDelivery(run, report || {});
    const workflowParent = run?.workflowParentId ? jobById(run.workflowParentId) : null;
    const summaryText = deliverySummaryText(report || {});
    const cachedPublishClassification = run?.id ? state.deliveryPublishClassifications?.[run.id] : null;
    const candidates = resolveDeliveryCandidates(run, report || {}, files, cachedPublishClassification);
    const actualBilling = run?.actualBilling && typeof run.actualBilling === 'object' ? run.actualBilling : null;
    const costTelemetry = actualBilling?.costTelemetry && typeof actualBilling.costTelemetry === 'object' ? actualBilling.costTelemetry : null;
    const deliveryCompletionGate = run?.deliveryCompletionGate && typeof run.deliveryCompletionGate === 'object' ? run.deliveryCompletionGate : null;
    const fundingLines = fundingBreakdownLines(run);
    const inputSources = inputSourcesFromJob(run || {});
    const fileCount = files.length;
    const targets = Array.isArray(delivery?.returnTargets) && delivery.returnTargets.length
      ? delivery.returnTargets.join(', ')
      : 'chat, api';
    return {
      run,
      delivery,
      report,
      files,
      workflowChildren,
      workflowParent,
      summaryText,
      cachedPublishClassification,
      genericDeliverable: candidates.genericDeliverable,
      article: candidates.article,
      actualBilling,
      costTelemetry,
      deliveryCompletionGate,
      fundingLines,
      inputSources,
      fileCount,
      targets
    };
  }

  function resolveDeliveryCandidates(run = null, report = {}, files = [], cachedPublishClassification = null) {
    const explicitDeliverable = genericDeliverableFromExplicitFiles(report, files);
    return {
      genericDeliverable: explicitDeliverable || genericDeliverableFromClassification(run, cachedPublishClassification),
      article: articleCandidateFromDelivery(run, report || {}, files)
    };
  }

  function maybeClassifyDeliveryCandidates(run = null, report = {}, files = [], candidates = {}, cachedPublishClassification = null) {
    return;
  }

  function hideDeliveryFollowupPanel() {
    setElementVisible(els.followupPanel, false);
  }

  function renderDeliveryFollowupPanel(run = null, report = {}) {
    if (!els.followupPanel || !els.followupPromptCard) return;
    const questions = clarifyingQuestionsFromReport(report || {});
    const nextAction = String(report?.nextAction || report?.next_action || '').trim();
    const canFollowUp = Boolean(run?.id && run.status === 'completed' && run.jobKind !== 'workflow');
    if (!canFollowUp) {
      hideDeliveryFollowupPanel();
      return;
    }
    const lines = [
      `Continue from order: ${run.id.slice(0, 8)}`,
      run.assignedAgentId ? `Same agent: ${run.assignedAgentId}` : 'Same agent: unavailable for this delivery',
      questions.length ? 'The agent asked:' : 'No explicit questions were returned, but you can request a revision or add missing details.',
      ...questions.map((question, index) => `${index + 1}. ${question}`),
      ...(nextAction ? ['', `Next action: ${nextAction}`] : []),
      '',
      'Answer below to send a direct follow-up to the same agent. The previous prompt, delivery summary, files, and questions are carried into the next order.'
    ];
    els.followupPromptCard.textContent = lines.join('\n');
    els.followupPanel.className = 'detail-box action-card info compact-card';
    setElementVisible(els.followupPanel, true);
  }

  return {
    deliveryCardBodyLines,
    deliveryEmptyStatePresentation,
    deliveryRenderContextFromValue,
    deliverySummaryTone,
    hideDeliveryFollowupPanel,
    maybeClassifyDeliveryCandidates,
    renderDeliveryActionToolbar,
    renderDeliveryFilesPanel,
    renderDeliveryFollowupPanel,
    renderDeliverySummaryCard,
    renderWorkflowChildNote,
    renderWorkflowTeamSummary,
    resolveDeliveryCandidates
  };
}
