export function createClientDeliveryFollowupController(deps = {}) {
  const {
    api,
    apiPayloadFromOrderDraftWithChatSession,
    chatEngineIsNeedsInputResponse,
    clearFollowupContext,
    createdOrderPrimaryId,
    els,
    ensureCurrentOpenChatSessionId,
    flash,
    focusWorkResults,
    handleNeedsInputResponse,
    handleOrderFundingPrompt,
    handleOrderPreflightPrompt,
    loadOrderDraftIntoComposer,
    looksJapanese,
    markCurrentOpenChatSessionLinkedOrder,
    normalizeOrderProgressStatus,
    openSettingsSection,
    orderProgressMeta,
    orderProgressTone,
    refresh,
    revealCreatedOrderInHistory,
    selectedJob,
    startOpenChatOrderProgressPolling,
    state,
    summarizeOrderDraftForAnalytics,
    trackChatTranscript,
    trackConversionEvent,
    upsertOpenChatOrderProgressMessage,
    validateOrderDraft,
    visitorId
  } = deps;

  async function directFollowupDraftFromDelivery() {
    const job = selectedJob();
    if (!job?.id) throw new Error('Select a completed order first.');
    if (job.status !== 'completed') throw new Error('Follow-up orders can be sent after a delivery is completed.');
    const agentId = String(job.assignedAgentId || '').trim();
    if (!agentId) {
      throw new Error('This delivery has no direct assigned agent. Open it in CAIt Chat and route the follow-up manually.');
    }
    const answer = String(els.followupAnswer?.value || '').trim();
    const prepared = await api('/api/deliveries/prepare-followup-order', {
      method: 'POST',
      body: JSON.stringify({
        job_id: String(job.id || ''),
        answer,
        direct: true
      })
    });
    return {
      parent_agent_id: String(prepared?.parent_agent_id || job.parentAgentId || 'cloudcode-main'),
      order_strategy: String(prepared?.order_strategy || 'single'),
      task_type: String(prepared?.task_type || job.taskType || 'research'),
      agent_id: String(prepared?.agent_id || agentId),
      prompt: String(prepared?.prompt || '').trim(),
      budget_cap: Number(els.jobBudget?.value || 300),
      deadline_sec: Number(els.jobDeadline?.value || 120),
      followup_to_job_id: String(prepared?.followup_to_job_id || job.id),
      skip_intake: prepared?.skip_intake !== false,
      input: prepared?.input && typeof prepared.input === 'object' ? prepared.input : {}
    };
  }

  async function sendFollowupToAgentFromDelivery() {
    const draft = await directFollowupDraftFromDelivery();
    const analyticsDraft = summarizeOrderDraftForAnalytics(draft, 'delivery_followup_direct');
    let created;
    try {
      validateOrderDraft(draft, { checkAccess: true, checkFunding: false });
    } catch (error) {
      if (handleOrderPreflightPrompt(error, draft, { analytics: analyticsDraft, source: 'delivery_followup_validation' })) return;
      throw error;
    }
    const followupSessionId = ensureCurrentOpenChatSessionId({ force: true });
    const payload = {
      ...apiPayloadFromOrderDraftWithChatSession(draft, followupSessionId),
      visitor_id: visitorId(),
      async_dispatch: true
    };
    try {
      created = await api('/api/jobs', { method: 'POST', body: JSON.stringify(payload) });
    } catch (error) {
      if (handleOrderPreflightPrompt(error, draft, { analytics: analyticsDraft, source: 'delivery_followup_api' })) return;
      if (/payment|required|deposit|funding/i.test(String(error?.message || ''))) {
        void trackConversionEvent('payment_required_shown', { ...analyticsDraft, status: 'blocked' });
        if (handleOrderFundingPrompt(error, draft, { analytics: analyticsDraft, source: 'delivery_followup' })) return;
        openSettingsSection('payments');
      }
      throw error;
    }
    if (chatEngineIsNeedsInputResponse(created)) {
      handleNeedsInputResponse(created, draft);
      return;
    }
    const createdOrderId = createdOrderPrimaryId(created);
    const createdOrderStatus = normalizeOrderProgressStatus(created?.status || 'created');
    const createdOrderJa = looksJapanese(payload.prompt);
    const agentLabel = draft.agent_id || created?.matched_agent_id || 'same agent';
    revealCreatedOrderInHistory(created, payload);
    const createdOrderBody = [
      createdOrderJa ? '前回納品へのフォローアップを同じAgentに送りました。' : 'Follow-up sent directly to the same agent.',
      '',
      `Order ID: ${createdOrderId || 'unknown'}`,
      createdOrderJa ? `接続先: ${agentLabel}` : `Agent: ${agentLabel}`,
      createdOrderJa ? `前回納品: ${String(draft.followup_to_job_id || '').slice(0, 8)}` : `Previous delivery: ${String(draft.followup_to_job_id || '').slice(0, 8)}`,
      createdOrderJa ? `状態: ${createdOrderStatus}` : `Status: ${createdOrderStatus}`,
      '',
      createdOrderJa ? '完了したらDeliveryに追加納品が表示されます。' : 'When it finishes, the refined delivery appears in Delivery.'
    ].filter(Boolean).join('\n');
    void trackConversionEvent('order_created', {
      ...analyticsDraft,
      mode: created.mode || 'run',
      status: createdOrderStatus,
      source: 'delivery_followup_direct'
    });
    if (createdOrderId) {
      markCurrentOpenChatSessionLinkedOrder(createdOrderId, { status: createdOrderStatus });
      upsertOpenChatOrderProgressMessage(createdOrderId, createdOrderBody, {
        status: createdOrderStatus,
        tone: orderProgressTone(createdOrderStatus),
        ja: createdOrderJa,
        progressMeta: orderProgressMeta(created, { status: createdOrderStatus })
      });
    }
    void trackChatTranscript(payload.prompt, {
      kind: 'order',
      body: createdOrderBody,
      status: createdOrderStatus
    }, {
      ...analyticsDraft,
      status: createdOrderStatus,
      mode: created.mode || 'run',
      source: 'delivery_followup_direct'
    });
    state.selectedJobId = createdOrderId || state.selectedJobId;
    if (created.matched_agent_id) state.selectedAgentId = created.matched_agent_id;
    state.workFlowMode = '';
    state.workFlowShowList = true;
    state.workFlowLastCreatedJobId = createdOrderId || null;
    clearFollowupContext({ keepAnswer: false });
    if (createdOrderId) {
      startOpenChatOrderProgressPolling(createdOrderId, {
        status: createdOrderStatus,
        ja: createdOrderJa,
        immediate: true
      });
      window.requestAnimationFrame(() => focusWorkResults());
    }
    flash(createdOrderId
      ? `Follow-up ${createdOrderId.slice(0, 8)} sent to ${agentLabel}.`
      : `Follow-up sent to ${agentLabel}.`, orderProgressTone(createdOrderStatus));
    await refresh();
    if (created.async_dispatch || created.dispatch_status === 'scheduled') {
      window.setTimeout(() => { void refresh(); }, 5000);
    }
  }

  async function prepareFollowupOrderFromDelivery() {
    try {
      const job = selectedJob();
      if (!job?.id) throw new Error('Select a completed order first.');
      if (job.status !== 'completed') throw new Error('Follow-up orders can be prepared after a delivery is completed.');
      const answer = String(els.followupAnswer?.value || '').trim();
      const prepared = await api('/api/deliveries/prepare-followup-order', {
        method: 'POST',
        body: JSON.stringify({
          job_id: String(job.id || ''),
          answer
        })
      });
      loadOrderDraftIntoComposer({
        followupToJobId: String(prepared?.followup_to_job_id || job.id || ''),
        taskType: String(prepared?.task_type || job.taskType || 'research'),
        agentId: String(prepared?.agent_id || ''),
        prompt: String(prepared?.prompt || '').trim(),
        budgetCap: Number(job?.budgetCap ?? 300),
        deadlineSec: Number(job?.deadlineSec ?? 120),
        orderStrategy: String(prepared?.order_strategy || 'single')
      });
      flash('Follow-up opened in CAIt Chat. Review it, then SEND ORDER when ready.', 'info');
      return prepared;
    } catch (error) {
      flash(String(error?.message || 'Could not prepare follow-up order.'), 'warn');
      return null;
    }
  }

  return {
    directFollowupDraftFromDelivery,
    prepareFollowupOrderFromDelivery,
    sendFollowupToAgentFromDelivery
  };
}
