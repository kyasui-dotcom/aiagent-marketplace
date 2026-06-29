export function createClientWorkSelectionController(deps = {}) {
  const {
    state,
    els,
    window,
    api,
    agentTaskFit,
    downloadableDeliveryFilesForJob,
    flash,
    mergeProgressJobIntoSnapshot,
    renderJobs,
    renderOrderComposer,
    setDetail,
    switchTab,
    visitorId
  } = deps;

  function focusWorkResults() {
    if (els.workListPanels && !els.workListPanels.hidden) {
      els.workListPanels.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (els.jobsTable) els.jobsTable.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function selectedJob() {
    return state.snapshot?.jobs?.find((job) => job.id === state.selectedJobId) || null;
  }

  function jobById(id = '') {
    const safeId = String(id || '').trim();
    if (!safeId) return null;
    return state.snapshot?.jobs?.find((job) => job.id === safeId) || null;
  }

  function openJobDetail(jobId = '') {
    const job = jobById(jobId);
    if (!job) return;
    state.selectedJobId = job.id;
    setDetail(job);
    renderJobs(state.snapshot?.jobs || []);
  }

  async function loadJobForChatAction(orderId = '') {
    const safeOrderId = String(orderId || '').trim();
    if (!safeOrderId) return null;
    const existing = jobById(safeOrderId);
    if (downloadableDeliveryFilesForJob(existing).length) return existing;
    const response = await api(`/api/jobs/${encodeURIComponent(safeOrderId)}?visitor_id=${encodeURIComponent(visitorId())}`, {
      preserveAuthOn401: true
    });
    const job = response?.job && typeof response.job === 'object'
      ? { ...response.job, id: response.job.id || safeOrderId }
      : { ...(response || {}), id: response?.id || safeOrderId };
    if (job?.id) {
      mergeProgressJobIntoSnapshot(job);
      return jobById(job.id) || job;
    }
    return existing;
  }

  function loadOrderDraftIntoComposer(order = {}) {
    state.followupToJobId = '';
    state.followupSourceTaskType = '';
    state.followupSourceAgentId = '';
    state.pendingIntake = null;
    state.intakeConfirmed = false;
    state.intakeAnswer = '';
    if (els.followupAnswer) els.followupAnswer.value = '';
    if (els.intakeAnswer) els.intakeAnswer.value = '';
    state.followupToJobId = String(order.followupToJobId || '').trim();
    state.followupSourceTaskType = String(order.taskType || '').trim();
    state.followupSourceAgentId = String(order.agentId || '').trim();
    if (els.jobPrompt) els.jobPrompt.value = String(order.prompt || '');
    if (els.jobType) els.jobType.value = String(order.taskType || 'research');
    if (els.jobAgentId) els.jobAgentId.value = String(order.agentId || '');
    if (els.jobBudget) els.jobBudget.value = String(order.budgetCap ?? 300);
    if (els.jobDeadline) els.jobDeadline.value = String(order.deadlineSec ?? 120);
    if (els.jobStrategy) els.jobStrategy.value = String(order.orderStrategy || 'auto');
    state.orderSettingsExpanded = true;
    switchTab('work');
    renderOrderComposer();
    window.requestAnimationFrame(() => els.jobPrompt?.focus());
  }

  function applyAgentToRunForm(agent, options = {}) {
    if (!agent) return;
    const fit = agentTaskFit(agent);
    if (els.jobAgentId) els.jobAgentId.value = agent.id;
    if (els.jobType) {
      const preferredTask = fit.matches && fit.taskType ? fit.taskType : agent.taskTypes?.[0] || els.jobType.value || 'research';
      els.jobType.value = preferredTask;
    }
    if (els.jobPrompt && !els.jobPrompt.value.trim()) {
      els.jobPrompt.value = `I want to use ${agent.name} for ${(els.jobType?.value || agent.taskTypes?.[0] || 'research')} work. Help me shape the request before ordering.`;
    }
    renderOrderComposer();
    if (options.switchToRuns) {
      state.workFlowMode = 'create';
      state.workFlowShowList = false;
      switchTab('work');
    }
    if (options.announce) flash(options.message || `CAIt Chat pinned to ${agent.name}.`, 'ok');
  }

  return {
    applyAgentToRunForm,
    focusWorkResults,
    jobById,
    loadJobForChatAction,
    loadOrderDraftIntoComposer,
    openJobDetail,
    selectedJob
  };
}
