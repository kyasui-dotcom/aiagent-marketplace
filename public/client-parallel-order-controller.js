export function createClientParallelOrderController(deps = {}) {
  const {
    state,
    els,
    api,
    apiPayloadFromOrderDraft,
    clearOrderComposerPrompt,
    clipText,
    currentOrderDraft,
    escapeHtml,
    estimateWindowOfDraft,
    fallbackPromptFromOrderInput,
    flash,
    handleOrderFundingPrompt,
    loadOrderDraftIntoComposer,
    normalizeOrderInputFile,
    orderInputCounts,
    queuedDraftAgent,
    refresh,
    renderOrderComposer,
    resolvedOrderStrategyOfDraft,
    summarizeOrderDraftForAnalytics,
    trackConversionEvent,
    validateOrderDraft,
    yen
  } = deps;

  function renderParallelOrderQueue() {
    if (!els.parallelOrderSummary || !els.parallelOrderQueue) return;
    const drafts = Array.isArray(state.parallelOrderDrafts) ? state.parallelOrderDrafts : [];
    if (!drafts.length) {
      els.parallelOrderSummary.textContent = 'No parallel orders queued. Use ADD TO PARALLEL to prepare several independent orders, then CREATE ALL to send them together.';
      els.parallelOrderSummary.className = 'detail-box action-card info compact-card';
      els.parallelOrderQueue.innerHTML = '';
      if (els.createParallelJobsBtn) els.createParallelJobsBtn.textContent = 'CREATE ALL';
      if (els.clearParallelJobsBtn) els.clearParallelJobsBtn.disabled = true;
      return;
    }
    const totals = drafts.reduce((acc, draft) => {
      const estimate = estimateWindowOfDraft(draft);
      acc.min += Number(estimate?.min || 0);
      acc.max += Number(estimate?.max || 0);
      return acc;
    }, { min: 0, max: 0 });
    els.parallelOrderSummary.textContent = [
      `${drafts.length} order${drafts.length === 1 ? '' : 's'} queued for parallel dispatch.`,
      totals.max > 0 ? `Estimated total: ${yen(totals.min)} – ${yen(totals.max)}` : 'Estimate appears when ready agents are available.',
      'Each order is funded independently. If balance runs out, any failed drafts stay in this queue.'
    ].join('\n');
    els.parallelOrderSummary.className = 'detail-box action-card ok compact-card';
    els.parallelOrderQueue.innerHTML = drafts.map((draft, index) => {
      const agent = queuedDraftAgent(draft);
      const resolvedStrategy = resolvedOrderStrategyOfDraft(draft);
      const route = resolvedStrategy === 'multi'
        ? 'auto Agent Team'
        : (agent ? `agent:${agent.name}` : 'agent:auto');
      const input = draft?.input && typeof draft.input === 'object' ? draft.input : null;
      const counts = orderInputCounts(input);
      const sources = `urls:${counts.urlCount} · files:${counts.fileCount}`;
      const title = clipText(draft.prompt || fallbackPromptFromOrderInput(input), 112);
      const estimate = estimateWindowOfDraft(draft);
      const estimateLabel = estimate?.max > 0 ? `${yen(estimate.min)} – ${yen(estimate.max)}` : 'estimating...';
      return `
        <div class="parallel-order-row" data-draft-id="${escapeHtml(draft.id)}">
          <div>
            <strong>${escapeHtml(`${index + 1}. ${title}`)}</strong>
            <div class="row-muted">${escapeHtml(`task:${draft.task_type} · ${route} · ${sources} · estimate:${estimateLabel}`)}</div>
          </div>
          <div class="helper-row">
            <button type="button" class="mini-btn" data-draft-action="load" data-draft-id="${escapeHtml(draft.id)}">LOAD</button>
            <button type="button" class="mini-btn" data-draft-action="remove" data-draft-id="${escapeHtml(draft.id)}">REMOVE</button>
          </div>
        </div>
      `;
    }).join('');
    if (els.createParallelJobsBtn) els.createParallelJobsBtn.textContent = `CREATE ALL (${drafts.length})`;
    if (els.clearParallelJobsBtn) els.clearParallelJobsBtn.disabled = false;
    els.parallelOrderQueue.querySelectorAll('[data-draft-action="remove"]').forEach((button) => {
      button.onclick = () => {
        state.parallelOrderDrafts = state.parallelOrderDrafts.filter((draft) => draft.id !== button.dataset.draftId);
        renderParallelOrderQueue();
      };
    });
    els.parallelOrderQueue.querySelectorAll('[data-draft-action="load"]').forEach((button) => {
      button.onclick = () => {
        const draft = state.parallelOrderDrafts.find((item) => item.id === button.dataset.draftId);
        if (!draft) return;
        if (els.jobParent) els.jobParent.value = draft.parent_agent_id || 'cloudcode-main';
        loadOrderDraftIntoComposer({
          taskType: draft.task_type || '',
          agentId: draft.agent_id || '',
          prompt: draft.prompt || '',
          budgetCap: draft.budget_cap ?? 300,
          deadlineSec: draft.deadline_sec ?? 120,
          orderStrategy: draft.order_strategy || 'auto'
        });
        if (els.jobUrls) els.jobUrls.value = Array.isArray(draft?.input?.urls) ? draft.input.urls.join('\n') : '';
        state.orderInputFiles = Array.isArray(draft?.input?.files)
          ? draft.input.files.map((file) => normalizeOrderInputFile(file)).filter((file) => file.content)
          : [];
        state.orderInputFileWarnings = [];
        if (els.jobFiles) els.jobFiles.value = '';
        renderOrderComposer();
        flash('Loaded queued order back into the composer.', 'ok');
      };
    });
  }

  function addCurrentOrderToParallelQueue() {
    const draft = currentOrderDraft();
    validateOrderDraft(draft, { checkAccess: false });
    state.parallelOrderDrafts = [...state.parallelOrderDrafts, draft];
    void trackConversionEvent('draft_order_created', summarizeOrderDraftForAnalytics(draft, 'parallel_queue'));
    clearOrderComposerPrompt();
    renderParallelOrderQueue();
    flash(`Queued parallel order ${state.parallelOrderDrafts.length}.`, 'ok');
  }

  async function createParallelOrders() {
    const drafts = Array.isArray(state.parallelOrderDrafts) ? [...state.parallelOrderDrafts] : [];
    if (!drafts.length) throw new Error('Add at least one order to the parallel queue first.');
    try {
      validateOrderDraft(drafts[0], { checkAccess: true, checkFunding: false, allowGuestTrial: false });
    } catch (error) {
      if (/login|sign in|sign-in|required/i.test(String(error?.message || ''))) {
        void trackConversionEvent('sign_in_required_shown', summarizeOrderDraftForAnalytics(drafts[0], 'parallel_order'));
      }
      if (/payment|deposit|funding/i.test(String(error?.message || ''))) {
        void trackConversionEvent('payment_required_shown', summarizeOrderDraftForAnalytics(drafts[0], 'parallel_order'));
      }
      throw error;
    }
    const succeeded = [];
    const failed = [];
    for (const draft of drafts) {
      try {
        validateOrderDraft(draft, { checkAccess: false });
        const payload = {
          ...apiPayloadFromOrderDraft(draft),
          agent_id: draft.agent_id || undefined,
          prompt: draft.prompt || fallbackPromptFromOrderInput(draft.input)
        };
        const created = await api('/api/jobs', { method: 'POST', body: JSON.stringify(payload) });
        succeeded.push({ draft, created });
        void trackConversionEvent('order_created', {
          ...summarizeOrderDraftForAnalytics(draft, 'parallel_order'),
          mode: created.mode || 'run',
          status: created.status || 'created'
        });
      } catch (error) {
        failed.push({ draft, error });
      }
    }
    if (succeeded.length) {
      const last = succeeded[succeeded.length - 1].created;
      state.selectedJobId = last.workflow_job_id || last.job_id || state.selectedJobId;
      state.workFlowLastCreatedJobId = last.workflow_job_id || last.job_id || null;
      state.runSearch = '';
      if (els.runSearch) els.runSearch.value = '';
    }
    state.parallelOrderDrafts = failed.map((item) => item.draft);
    await refresh();
    renderParallelOrderQueue();
    if (failed.length) {
      const firstError = String(failed[0].error?.message || failed[0].error || 'Request failed');
      if (handleOrderFundingPrompt(failed[0].error, failed[0].draft, {
        source: 'parallel_order',
        analytics: summarizeOrderDraftForAnalytics(failed[0].draft, 'parallel_order')
      })) return;
      flash(`Created ${succeeded.length}/${drafts.length} parallel orders. Failed drafts stayed queued.\n\nFirst failure: ${firstError}`, succeeded.length ? 'info' : 'error');
      return;
    }
    flash(`Created ${succeeded.length} parallel orders.`, 'ok');
  }

  function clearParallelOrders() {
    state.parallelOrderDrafts = [];
    renderParallelOrderQueue();
    flash('Parallel order queue cleared.', 'ok');
  }

  return {
    addCurrentOrderToParallelQueue,
    clearParallelOrders,
    createParallelOrders,
    renderParallelOrderQueue
  };
}
