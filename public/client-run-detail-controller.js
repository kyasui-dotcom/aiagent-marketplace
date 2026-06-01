export function createClientRunDetailController(deps = {}) {
  const {
    bindDeliveryCommonActionButtons,
    bindRunDeliveryInteractions,
    deliveryCardBodyLines,
    deliveryEmptyStatePresentation,
    deliveryRenderContextFromValue,
    deliverySummaryTone,
    els,
    hideDeliveryFollowupPanel,
    maybeClassifyDeliveryCandidates,
    renderDeliverySummaryCard,
    renderMarketingTimelineModal,
    renderRunDeliverySections,
    renderWorkChatThread,
    runNextAction,
    safeText,
    summarizeRun
  } = deps;

  function renderRunDelivery(value) {
    if (!els.runDeliveryCard || !els.runDeliveryFiles) return;
    const context = deliveryRenderContextFromValue(value);
    const {
      run,
      delivery,
      report,
      files,
      workflowChildren,
      workflowParent,
      summaryText,
      genericDeliverable,
      fileCount
    } = context;
    els.runDeliveryFiles.innerHTML = '';
    hideDeliveryFollowupPanel();
    renderMarketingTimelineModal(run);
    const emptyState = deliveryEmptyStatePresentation(run, delivery, report, files);
    if (emptyState) {
      els.runDeliveryCard.textContent = emptyState.text;
      els.runDeliveryCard.className = `detail-box action-card ${emptyState.tone} compact-card`;
      return;
    }

    const candidates = { article: context.article, genericDeliverable };
    maybeClassifyDeliveryCandidates(run, report || {}, files, candidates, context.cachedPublishClassification || null);
    const article = candidates.article;
    const summaryDownloadText = deliveryCardBodyLines(run, report || {}, {
      summaryText,
      workflowChildren,
      fileCount
    }).join('\n');
    els.runDeliveryCard.innerHTML = renderDeliverySummaryCard(run, report || {}, {
      summaryText: summaryDownloadText
    });
    els.runDeliveryCard.className = `detail-box action-card ${deliverySummaryTone(run, report || {})} compact-card`;
    els.runDeliveryFiles.innerHTML = renderRunDeliverySections(run, {
      summaryText: summaryDownloadText,
      fileCount,
      files,
      workflowParent,
      article,
      genericDeliverable,
      workflowChildren
    });
    bindDeliveryCommonActionButtons(els.runDeliveryCard, {
      run,
      workflowParent,
      renderedFiles: files,
      summaryText: summaryDownloadText
    });
    bindRunDeliveryInteractions(els.runDeliveryFiles, value, {
      run,
      article,
      genericDeliverable,
      workflowParent,
      files,
      summaryText: summaryDownloadText
    });
  }

  function setDetail(value) {
    if (value && typeof value === 'object' && !Array.isArray(value) && ('taskType' in value || 'assignedAgentId' in value) && els.runActionCard) {
      const action = runNextAction(value);
      els.runActionCard.textContent = `${action.title}\n\n${action.body}`;
      els.runActionCard.className = `detail-box action-card ${action.tone}`;
    }
    renderRunDelivery(value);
    safeText(els.jobDetail, typeof value === 'string' ? value : summarizeRun(value));
    renderWorkChatThread();
  }

  return {
    renderRunDelivery,
    setDetail
  };
}
