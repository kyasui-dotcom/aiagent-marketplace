export function createClientSecondaryEventBindingsController(deps = {}) {
  const {
    state,
    els,
    api,
    document,
    window,
    activeFlexibleTool,
    addCurrentOrderToParallelQueue,
    agentPricingGuideText,
    agentSharePost,
    agentShareUrl,
    applyAgentQuickFilter,
    applyAgentToRunForm,
    applyIntakeAnswers,
    canEditAgentPricing,
    clearFollowupContext,
    clearIntakeContext,
    clearOpenChatHistory,
    clearParallelOrders,
    closeOrderSettings,
    copyTextToClipboard,
    createParallelOrders,
    currentRunTargetAgent,
    deleteAgentRecord,
    flash,
    handleCreateJobButtonClick,
    handleOrderFilesChanged,
    hideDeliveryFollowupPanel,
    loadAgentOnboarding,
    maybeAutoCheckSelectedAgent,
    maybeOfferAutomatedAgentSetup,
    openStartFromLogo,
    prepareFollowupOrderFromDelivery,
    refresh,
    renderAgents,
    renderFlexibleToolPanel,
    renderJobs,
    renderOrderAgentPicker,
    renderOrderComposer,
    renderScheduledWorkControls,
    renderStream,
    renderWorkChatEntryCard,
    renderWorkChatThread,
    runAction,
    runOpenChatHubCommand,
    scheduleCurrentOrderDraft,
    saveAgentPricing,
    selectedAgent,
    selectedJob,
    sendFollowupToAgentFromDelivery,
    setAgentDetail,
    setDetail,
    setOpenChatMode,
    setOrderStrategyChoice,
    shareAgentOnX,
    startNewOpenChatSession,
    subscriptionIncludedCreditsForPlan,
    switchTab,
    syncAgentPricingEditorVisibility,
    syncCreateJobButtonForCurrentPrompt,
    toggleOpenChatHistory,
    trackFlexibleToolEvent,
    updateCliPanels
  } = deps;

  function bindOpenChatControls() {
    if (els.openChatClarifyModeBtn) els.openChatClarifyModeBtn.onclick = () => setOpenChatMode('clarify');
    if (els.openChatOrderModeBtn) els.openChatOrderModeBtn.onclick = () => setOpenChatMode('order');
    if (els.executionAutoBtn) els.executionAutoBtn.onclick = () => setOrderStrategyChoice('auto');
    if (els.executionSingleBtn) els.executionSingleBtn.onclick = () => setOrderStrategyChoice('single');
    if (els.executionTeamBtn) els.executionTeamBtn.onclick = () => setOrderStrategyChoice('multi');
    if (els.openChatModeMenu) els.openChatModeMenu.ontoggle = () => {
      if (els.openChatModeMenu.open && els.executionChoiceMenu) els.executionChoiceMenu.open = false;
    };
    if (els.executionChoiceMenu) els.executionChoiceMenu.ontoggle = () => {
      if (els.executionChoiceMenu.open && els.openChatModeMenu) els.openChatModeMenu.open = false;
    };
    if (els.newOpenChatSessionBtn) els.newOpenChatSessionBtn.onclick = () => startNewOpenChatSession();
    if (els.mobileNewOpenChatSessionBtn) els.mobileNewOpenChatSessionBtn.onclick = () => startNewOpenChatSession();
    if (els.toggleOpenChatHistoryBtn) els.toggleOpenChatHistoryBtn.onclick = toggleOpenChatHistory;
    if (els.clearOpenChatHistoryBtn) els.clearOpenChatHistoryBtn.onclick = clearOpenChatHistory;
    document.querySelectorAll('[data-open-chat-hub-command]').forEach((btn) => {
      btn.addEventListener('click', () => runAction(btn, async () => {
        await runOpenChatHubCommand(btn.dataset.openChatHubCommand || '');
      }));
    });
  }

  function bindOrderDraftControls() {
    if (els.scheduleCurrentOrderBtn) els.scheduleCurrentOrderBtn.onclick = () => runAction(els.scheduleCurrentOrderBtn, scheduleCurrentOrderDraft);
    if (els.scheduledWorkInterval) els.scheduledWorkInterval.onchange = renderScheduledWorkControls;
    if (els.createJobBtn) els.createJobBtn.onclick = () => runAction(els.createJobBtn, handleCreateJobButtonClick);
    if (els.applyIntakeAnswerBtn) els.applyIntakeAnswerBtn.onclick = () => runAction(els.applyIntakeAnswerBtn, async () => {
      applyIntakeAnswers();
    });
    if (els.clearIntakeBtn) els.clearIntakeBtn.onclick = () => {
      clearIntakeContext();
      flash('Clarification questions cleared.', 'ok');
    };
    if (els.createFollowupOrderBtn) els.createFollowupOrderBtn.onclick = () => runAction(els.createFollowupOrderBtn, async () => {
      try {
        await sendFollowupToAgentFromDelivery();
      } catch (error) {
        if (/no direct assigned agent/i.test(String(error?.message || ''))) {
          await prepareFollowupOrderFromDelivery();
          return;
        }
        throw error;
      }
    });
    if (els.clearFollowupContextBtn) els.clearFollowupContextBtn.onclick = () => {
      clearFollowupContext();
      hideDeliveryFollowupPanel();
      flash('Follow-up context cleared.', 'ok');
    };
    if (els.addParallelJobBtn) els.addParallelJobBtn.onclick = () => runAction(els.addParallelJobBtn, async () => {
      addCurrentOrderToParallelQueue();
    });
    if (els.createParallelJobsBtn) els.createParallelJobsBtn.onclick = () => runAction(els.createParallelJobsBtn, createParallelOrders);
    if (els.clearParallelJobsBtn) els.clearParallelJobsBtn.onclick = () => runAction(els.clearParallelJobsBtn, async () => {
      clearParallelOrders();
    });
    if (els.jobPrompt) els.jobPrompt.oninput = () => {
      if (state.intakeConfirmed) state.intakeConfirmed = false;
      state.pendingOrderConfirmation = null;
      if (!state.snapshot?.auth?.loggedIn && String(els.jobPrompt.value || '').trim()) {
        state.openChatEntryDismissed = true;
      }
      state.orderComposerDirtySinceSend = Boolean(String(els.jobPrompt.value || '').trim());
      renderWorkChatEntryCard(state.snapshot?.auth || {});
      syncCreateJobButtonForCurrentPrompt();
    };
    if (els.jobPrompt) els.jobPrompt.onkeydown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        els.createJobBtn?.click();
      }
    };
    if (els.intakeAnswer) els.intakeAnswer.oninput = () => {
      state.intakeAnswer = els.intakeAnswer.value || '';
      renderWorkChatThread();
    };
    if (els.jobUrls) els.jobUrls.oninput = () => { renderOrderComposer(); };
    if (els.jobFiles) els.jobFiles.onchange = () => { void handleOrderFilesChanged(); };
    if (els.clearRunAgentBtn) els.clearRunAgentBtn.onclick = () => {
      if (els.jobAgentId) els.jobAgentId.value = '';
      if (els.jobAgentPicker) els.jobAgentPicker.value = '';
      renderOrderComposer();
      flash('Pinned agent cleared. Auto-routing restored.', 'ok');
    };
    if (els.jobAgentSearch) els.jobAgentSearch.oninput = () => {
      state.jobAgentSearch = els.jobAgentSearch.value || '';
      renderOrderAgentPicker();
    };
    if (els.jobAgentPicker) els.jobAgentPicker.onchange = () => {
      const pickedId = String(els.jobAgentPicker.value || '').trim();
      if (els.jobAgentId) els.jobAgentId.value = pickedId;
      const agent = currentRunTargetAgent();
      if (agent) {
        state.selectedAgentId = agent.id;
        setAgentDetail(agent);
        maybeAutoCheckSelectedAgent(agent);
      }
      renderOrderComposer();
    };
    if (els.jobAgentId) els.jobAgentId.oninput = () => { renderOrderComposer(); };
    if (els.jobAgentId) els.jobAgentId.onchange = () => {
      const agent = currentRunTargetAgent();
      if (agent) {
        state.selectedAgentId = agent.id;
        setAgentDetail(agent);
        maybeAutoCheckSelectedAgent(agent);
      }
      renderOrderComposer();
    };
    if (els.jobType) {
      els.jobType.oninput = () => { renderOrderComposer(); };
      els.jobType.onchange = () => { renderOrderComposer(); };
    }
    if (els.jobStrategy) {
      els.jobStrategy.oninput = () => { renderOrderComposer(); };
      els.jobStrategy.onchange = () => { renderOrderComposer(); };
    }
  }

  function bindRunAndAgentControls() {
    if (els.claimJobBtn) els.claimJobBtn.onclick = () => runAction(els.claimJobBtn, async () => {
      const id = els.claimJobId?.value || '';
      const res = await api(`/api/jobs/${id}/claim`, { method: 'POST', body: JSON.stringify({ agent_id: els.claimAgentId?.value }) });
      setDetail(res);
      flash(`Run ${id.slice(0, 8)} claimed.`, 'ok');
      await refresh();
    });
    if (els.submitResultBtn) els.submitResultBtn.onclick = () => runAction(els.submitResultBtn, async () => {
      const id = els.claimJobId?.value || '';
      const res = await api(`/api/jobs/${id}/result`, { method: 'POST', body: JSON.stringify({ agent_id: els.claimAgentId?.value, status: 'completed', output: { summary: els.submitOutput?.value || 'Connected aiagent result' }, usage: { api_cost: 90 } }) });
      setDetail(res.job || res);
      flash(`Run ${id.slice(0, 8)} submitted.`, 'ok');
      await refresh();
    });
    if (els.retryDispatchBtn) els.retryDispatchBtn.onclick = () => runAction(els.retryDispatchBtn, async () => {
      const job = selectedJob();
      if (!job) throw new Error('Select a run first.');
      const res = await api('/api/dev/dispatch-retry', { method: 'POST', body: JSON.stringify({ job_id: job.id }) });
      setDetail(res.job || res);
      flash(`Retry triggered for ${job.id.slice(0, 8)}.`, 'ok');
      await refresh();
    });
    if (els.eventFilter) els.eventFilter.oninput = () => { state.eventFilter = els.eventFilter.value || ''; if (state.snapshot) renderStream(state.snapshot.events || []); };
    if (els.runSearch) els.runSearch.oninput = () => { state.runSearch = els.runSearch.value || ''; state.runPage = 0; if (state.snapshot) renderJobs(state.snapshot.jobs || []); };
    if (els.runRequesterFilter) els.runRequesterFilter.onchange = () => { state.runRequesterFilter = els.runRequesterFilter.value || 'all'; state.runPage = 0; if (state.snapshot) renderJobs(state.snapshot.jobs || []); };
    if (els.runStatusFilter) els.runStatusFilter.onchange = () => { state.runStatusFilter = els.runStatusFilter.value || ''; state.runPage = 0; if (state.snapshot) renderJobs(state.snapshot.jobs || []); };
    if (els.runActionFilter) els.runActionFilter.onchange = () => { state.runActionFilter = els.runActionFilter.value || ''; state.runPage = 0; if (state.snapshot) renderJobs(state.snapshot.jobs || []); };
    if (els.agentSearch) els.agentSearch.oninput = () => { state.agentSearch = els.agentSearch.value || ''; if (state.snapshot) renderAgents(state.snapshot.agents || []); };
    if (els.agentStatusFilter) els.agentStatusFilter.onchange = () => { state.agentStatusFilter = els.agentStatusFilter.value || ''; if (state.snapshot) renderAgents(state.snapshot.agents || []); };
    if (els.agentAvailabilityFilter) els.agentAvailabilityFilter.onchange = () => { state.agentAvailabilityFilter = els.agentAvailabilityFilter.value || ''; if (state.snapshot) renderAgents(state.snapshot.agents || []); };
    if (els.agentActionFilter) els.agentActionFilter.onchange = () => { state.agentActionFilter = els.agentActionFilter.value || ''; if (state.snapshot) renderAgents(state.snapshot.agents || []); };
    if (els.agentTaskFilter) els.agentTaskFilter.onchange = () => { state.agentTaskFilter = els.agentTaskFilter.value || ''; if (state.snapshot) renderAgents(state.snapshot.agents || []); };
    if (els.agentSort) els.agentSort.onchange = () => { state.agentSort = els.agentSort.value || 'readiness'; if (state.snapshot) renderAgents(state.snapshot.agents || []); };
    if (els.showReadyAgentsBtn) els.showReadyAgentsBtn.onclick = () => applyAgentQuickFilter('ready');
    if (els.showVerifyFailuresBtn) els.showVerifyFailuresBtn.onclick = () => applyAgentQuickFilter('verify-failures');
    if (els.showMissingEndpointBtn) els.showMissingEndpointBtn.onclick = () => applyAgentQuickFilter('missing-endpoint');
    if (els.showTaskMismatchBtn) els.showTaskMismatchBtn.onclick = () => applyAgentQuickFilter('task-mismatch');
    if (els.recheckAgentBtn) els.recheckAgentBtn.onclick = () => runAction(els.recheckAgentBtn, async () => {
      const agent = selectedAgent();
      if (!agent) throw new Error('Select an agent first.');
      const result = await loadAgentOnboarding(agent.id, { force: true, silent: true });
      const onboarding = result?.onboarding || null;
      if (!onboarding) throw new Error(result?.error || 'Onboarding check did not return a result.');
      flash(
        onboarding.status === 'ready'
          ? `${agent.name} is dispatch-ready.`
          : `${agent.name}: ${onboarding.nextAction?.title || 'Review onboarding checks.'}`,
        onboarding.status === 'ready' ? 'ok' : 'info'
      );
      await maybeOfferAutomatedAgentSetup(agent, result);
    });
    if (els.useAgentForRunBtn) els.useAgentForRunBtn.onclick = () => {
      const agent = selectedAgent();
      if (!agent) return flash('Select an agent first.', 'error');
      applyAgentToRunForm(agent, { announce: true, message: `CAIt Chat pinned to ${agent.name}. Open Chat to shape the request before sending an order.` });
    };
    if (els.copyAgentLinkBtn) els.copyAgentLinkBtn.onclick = () => {
      const agent = selectedAgent();
      if (!agent) return flash('Select an agent first.', 'error');
      void copyTextToClipboard(agentShareUrl(agent), 'Agent link copied.');
    };
    if (els.copyAgentPostBtn) els.copyAgentPostBtn.onclick = () => {
      const agent = selectedAgent();
      if (!agent) return flash('Select an agent first.', 'error');
      void copyTextToClipboard(agentSharePost(agent), 'Share post copied.');
    };
    if (els.shareAgentXBtn) els.shareAgentXBtn.onclick = () => {
      shareAgentOnX(selectedAgent());
    };
    if (els.deleteAgentBtn) els.deleteAgentBtn.onclick = () => runAction(els.deleteAgentBtn, async () => {
      const agent = selectedAgent();
      await deleteAgentRecord(agent);
    });
    if (els.saveAgentPricingBtn) els.saveAgentPricingBtn.onclick = () => runAction(els.saveAgentPricingBtn, async () => {
      const agent = selectedAgent();
      await saveAgentPricing(agent);
    });
    if (els.agentPricingModel) els.agentPricingModel.onchange = () => {
      syncAgentPricingEditorVisibility();
      if (els.agentPricingGuide && selectedAgent() && canEditAgentPricing(selectedAgent())) els.agentPricingGuide.textContent = agentPricingGuideText(selectedAgent());
    };
    if (els.agentPricingOverageMode) els.agentPricingOverageMode.onchange = () => {
      syncAgentPricingEditorVisibility();
      if (els.agentPricingGuide && selectedAgent() && canEditAgentPricing(selectedAgent())) els.agentPricingGuide.textContent = agentPricingGuideText(selectedAgent());
    };
    if (els.copyAgentCurlBtn) els.copyAgentCurlBtn.onclick = () => {
      const agent = selectedAgent();
      if (!agent) return flash('Select an agent first.', 'error');
      switchTab('connect');
      updateCliPanels(state.snapshot);
      setDetail({ hint: 'CONNECT tab updated with agent_id example.', agent_id: agent.id, task_types: agent.taskTypes });
      flash(`CLI examples updated for ${agent.name}.`, 'ok');
    };
  }

  function bindFlexibleToolControls() {
    if (els.flexToolHelpfulBtn) els.flexToolHelpfulBtn.onclick = () => {
      const tool = activeFlexibleTool() || { id: state.flexToolLastActiveId || '', title: '' };
      trackFlexibleToolEvent('flex_tool_reaction', tool, { helpful: true, status: 'helpful' });
      flash('Context tool feedback saved.', 'ok');
    };
    if (els.flexToolWrongBtn) els.flexToolWrongBtn.onclick = () => {
      const tool = activeFlexibleTool() || { id: state.flexToolLastActiveId || '', title: '' };
      trackFlexibleToolEvent('flex_tool_reaction', tool, { helpful: false, status: 'not_right' });
      state.flexToolDismissedKey = tool?.id || '';
      renderFlexibleToolPanel();
      flash('Context tool mismatch saved for review.', 'ok');
    };
    if (els.dismissFlexToolPanelBtn) els.dismissFlexToolPanelBtn.onclick = () => {
      const tool = activeFlexibleTool();
      state.flexToolDismissedKey = tool?.id || '';
      trackFlexibleToolEvent('flex_tool_hidden', tool || { id: state.flexToolLastActiveId || '', title: '' }, { userDismissed: true, status: 'dismissed' });
      renderFlexibleToolPanel();
    };
    if (els.flexToolPanel) els.flexToolPanel.onclick = (event) => {
      if (event.target !== els.flexToolPanel) return;
      const tool = activeFlexibleTool();
      state.flexToolDismissedKey = tool?.id || '';
      trackFlexibleToolEvent('flex_tool_hidden', tool || { id: state.flexToolLastActiveId || '', title: '' }, { userDismissed: true, status: 'dismissed' });
      renderFlexibleToolPanel();
    };
  }

  function bindGlobalControls() {
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && state.orderSettingsExpanded) closeOrderSettings();
    });
    if (els.billingSubscriptionPlan) {
      const applySubscriptionPlanDefaults = () => {
        const plan = String(els.billingSubscriptionPlan?.value || '').trim().toLowerCase();
        const credits = subscriptionIncludedCreditsForPlan(plan);
        if (els.billingSubscriptionIncludedCredits) {
          els.billingSubscriptionIncludedCredits.value = String(credits);
        }
      };
      els.billingSubscriptionPlan.oninput = applySubscriptionPlanDefaults;
      els.billingSubscriptionPlan.onchange = applySubscriptionPlanDefaults;
    }
    document.querySelectorAll('.tab-btn').forEach((btn) => { btn.onclick = () => switchTab(btn.dataset.tab); });
    document.querySelectorAll('.logo-link[href="/"]').forEach((link) => { link.onclick = openStartFromLogo; });
  }

  function bindLiveEventStream() {
    const liveEventHosts = new Set(['localhost', '127.0.0.1']);
    if (window.EventSource && liveEventHosts.has(window.location.hostname)) {
      const events = new window.EventSource('/events');
      events.onmessage = (message) => {
        try {
          const event = JSON.parse(message.data);
          if (state.snapshot) {
            if (String(event?.type || '').toUpperCase() === 'TRACK') return;
            state.snapshot.events.push(event);
            renderStream(state.snapshot.events);
          }
        } catch {}
      };
    }
  }

  function bindSecondaryEventHandlers() {
    bindOpenChatControls();
    bindOrderDraftControls();
    bindRunAndAgentControls();
    bindFlexibleToolControls();
    bindGlobalControls();
    bindLiveEventStream();
  }

  return {
    bindSecondaryEventHandlers,
    bindLiveEventStream,
    bindOpenChatControls,
    bindOrderDraftControls,
    bindRunAndAgentControls,
    bindFlexibleToolControls,
    bindGlobalControls
  };
}
