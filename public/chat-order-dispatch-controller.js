export function createChatOrderDispatchController(deps = {}) {
  const {
    state,
    window,
    api,
    chatText,
    chatEngineBuildJobPayload,
    draftExplicitlyRequestsMeasurementEvidence,
    orderRuntimePollingContextIsCurrent,
    orderRuntimeShouldPauseForApproval,
    CHATUX_RETURN_PATH,
    CHATUX_RETRY_MODE_NEW_ORDER,
    CHATUX_PROGRESS_MAX_POLLS,
    setBusy,
    ensureChatSessionId,
    currentLockedConversationOwner,
    withConversationOwner,
    measurementEvidenceContextStatus,
    openMeasurementEvidenceAppForDraft,
    appendTextMessage,
    activeActorLabel,
    selectedDeliveryFormat,
    selectedDeliveryFormatLabel,
    draftIsSameContentNewOrderRetry,
    draftIsExplicitFollowupContinuation,
    clientOrderIdFromOrderCreate,
    makeClientOrderId,
    rememberPendingRecoveryPayload,
    orderCreateRequestBody,
    recoverAcceptedOrderAfterCreateError,
    isNeedsInputResponse,
    startIntake,
    extractOrderId,
    trackChatGa4Once,
    resumeLiveProgress,
    rememberTrackedOrder,
    clearPendingRecoveryPayload,
    currentChatSessionPayload,
    upsertChatSession,
    isoNow,
    renderChatSessionSidebar,
    rememberAiAgentsFromDraft,
    updateComposerMode,
    notifyOrderMilestone,
    renderInitialAgentMap,
    startDeliveryBackfillLoop,
    loginHref,
    showProgressNarrator,
    authorityRequestFromJob,
    authorityRequestIsActionableForJob,
    progressNarratorTextForJob,
    progressNarratorOptionsForJob,
    showWorkflowProgressMap,
    maybeRenderAuthorityNotice,
    markLiveProgressStopped,
    jobHasDeliveryResult,
    renderDeliveryOnce
  } = deps;

  async function sendOrder() {
    if (!state.draft) return;
    setBusy(true);
    try {
      const chatSessionId = ensureChatSessionId({ force: true });
      const draftBroker = state.draft?.input?._broker && typeof state.draft.input._broker === 'object' ? state.draft.input._broker : {};
      const suppressLeaderLock = draftBroker.leaderFollowupSpecialistRouted === true;
      const lockedOwner = suppressLeaderLock ? null : currentLockedConversationOwner();
      const acceptedDraft = lockedOwner ? withConversationOwner(state.draft, lockedOwner) : state.draft;
      state.draft = acceptedDraft;
      const measurementEvidenceStatus = measurementEvidenceContextStatus(acceptedDraft);
      if (draftExplicitlyRequestsMeasurementEvidence(acceptedDraft) && !measurementEvidenceStatus.loaded && !measurementEvidenceStatus.skipped) {
        await openMeasurementEvidenceAppForDraft(acceptedDraft);
        appendTextMessage('assistant', chatText(
          'This order explicitly asks to use GA4/Search Console, so I stopped dispatch until the loaded analytics context is attached. After Send to CAIt returns here, press Send order again.',
          'この注文は GA4/Search Console の利用を明示しているため、読み込み済みアナリティクスコンテキストが添付されるまで発注送信を止めました。Send to CAIt で戻った後、もう一度 Send order を押してください。',
          acceptedDraft.originalPrompt || acceptedDraft.prompt || ''
        ), { tone: 'warn', label: 'Analytics required' });
        return;
      }
      const actorLabel = activeActorLabel('CAIt');
      const acceptedDeliveryFormat = acceptedDraft.deliveryFormat || acceptedDraft.delivery_format || selectedDeliveryFormat();
      const payload = chatEngineBuildJobPayload(acceptedDraft, {
        parentAgentId: 'chatux',
        source: 'chatux',
        visitorId: state.visitorId,
        budgetCap: 500,
        deadlineSec: 300,
        broker: {
          chatux: {
            delivery_channel: 'chat',
            return_path: CHATUX_RETURN_PATH,
            visitor_id: state.visitorId
          },
          deliveryFormat: acceptedDeliveryFormat,
          delivery_format: acceptedDeliveryFormat,
          delivery_format_label: selectedDeliveryFormatLabel(acceptedDeliveryFormat),
          chatSessionId,
          intake: {
            prepared_in_chat: true,
            answered: acceptedDraft.intakeAnswered === true,
            checked_at: acceptedDraft.updatedAt || new Date().toISOString()
          }
        }
      });
      const sameContentRetryAsNewOrder = draftIsSameContentNewOrderRetry(acceptedDraft);
      const explicitFollowupContinuation = draftIsExplicitFollowupContinuation(acceptedDraft);
      const followupToJobId = sameContentRetryAsNewOrder || !explicitFollowupContinuation
        ? ''
        : String(acceptedDraft.followupToJobId || acceptedDraft.followup_to_job_id || acceptedDraft.input?._broker?.conversation?.followupToJobId || '').trim();
      if (followupToJobId) payload.followup_to_job_id = followupToJobId;
      payload.session_id = chatSessionId;
      const clientOrderId = clientOrderIdFromOrderCreate(payload) || makeClientOrderId();
      payload.client_order_id = clientOrderId;
      payload.clientOrderId = clientOrderId;
      payload.input = {
        ...(payload.input || {}),
        session_id: chatSessionId,
        client_order_id: clientOrderId,
        _broker: {
          ...((payload.input && typeof payload.input === 'object' && payload.input._broker && typeof payload.input._broker === 'object') ? payload.input._broker : {}),
          clientOrderId,
          clientOrderPreparedAt: new Date().toISOString()
        }
      };
      if (sameContentRetryAsNewOrder) {
        delete payload.followup_to_job_id;
        delete payload.followupToJobId;
        const broker = payload.input?._broker && typeof payload.input._broker === 'object' ? payload.input._broker : null;
        const conversation = broker?.conversation && typeof broker.conversation === 'object' ? broker.conversation : null;
        if (conversation) {
          delete conversation.followupToJobId;
          delete conversation.followup_to_job_id;
        }
        if (broker) {
          broker.retry = {
            ...(broker.retry && typeof broker.retry === 'object' ? broker.retry : {}),
            mode: CHATUX_RETRY_MODE_NEW_ORDER,
            intent: CHATUX_RETRY_MODE_NEW_ORDER,
            continuesOrder: false
          };
        }
      } else if (!explicitFollowupContinuation) {
        delete payload.followup_to_job_id;
        delete payload.followupToJobId;
        const broker = payload.input?._broker && typeof payload.input._broker === 'object' ? payload.input._broker : null;
        const conversation = broker?.conversation && typeof broker.conversation === 'object' ? broker.conversation : null;
        if (conversation) {
          delete conversation.followupToJobId;
          delete conversation.followup_to_job_id;
          if (conversation.mode === 'followup') delete conversation.mode;
        }
        delete payload.input?._broker?.followupToJobId;
        delete payload.input?._broker?.followup_to_job_id;
        delete acceptedDraft.followupToJobId;
        delete acceptedDraft.followup_to_job_id;
      }
      rememberPendingRecoveryPayload(payload);
      let created;
      try {
        created = await api('/api/jobs', {
          method: 'POST',
          body: orderCreateRequestBody(payload)
        });
      } catch (error) {
        const recovered = await recoverAcceptedOrderAfterCreateError(payload, error);
        if (!recovered) throw error;
        created = recovered;
      }
      if (isNeedsInputResponse(created)) {
        startIntake(created, state.draft?.originalPrompt || payload.prompt);
        return;
      }
      state.orderId = extractOrderId(created);
      if (state.orderId) {
        trackChatGa4Once(`order_submitted:${state.orderId}`, 'order_submitted', {
          order_id: state.orderId,
          task_type: acceptedDraft.taskType || acceptedDraft.task_type || payload.task_type || '',
          strategy: acceptedDraft.requestedStrategy || acceptedDraft.requested_strategy || payload.strategy || '',
          retry_mode: sameContentRetryAsNewOrder ? CHATUX_RETRY_MODE_NEW_ORDER : (followupToJobId ? 'followup_continuation' : 'new_order')
        });
        resumeLiveProgress(state.orderId);
        rememberTrackedOrder(state.orderId);
        clearPendingRecoveryPayload(payload);
        const session = currentChatSessionPayload();
        if (session) {
          upsertChatSession({
            ...session,
            linkedOrderId: state.orderId,
            activeJobIds: [],
            relatedOrderIds: [...new Set([...(Array.isArray(session.relatedOrderIds) ? session.relatedOrderIds : []), state.orderId])],
            activeWork: false,
            updatedAt: isoNow()
          });
          renderChatSessionSidebar();
        }
      }
      rememberAiAgentsFromDraft(acceptedDraft, created, payload);
      state.draft = null;
      state.followupTargetOrderId = '';
      state.draftRevision += 1;
      updateComposerMode();
      if (state.orderId) {
        notifyOrderMilestone({
          id: state.orderId,
          status: 'submitted',
          prompt: acceptedDraft.originalPrompt || payload.prompt || '',
          originalPrompt: acceptedDraft.originalPrompt || payload.prompt || ''
        }, {
          state: 'submitted'
        });
        renderInitialAgentMap(created, acceptedDraft.originalPrompt || payload.prompt || '');
      }
      if (state.orderId) startPolling(state.orderId);
      else {
        startDeliveryBackfillLoop({ maxRuns: 60 });
      }
      state.pendingAppContext = null;
    } catch (error) {
      appendTextMessage('assistant', orderErrorMessage(error), { tone: 'error', label: 'Waiting' });
    } finally {
      setBusy(false);
    }
  }

  function orderErrorMessage(error) {
    const message = String(error?.message || 'Order failed.');
    if (error?.status === 401) {
      return `${message}\n\nSign in first, then return to this chat screen.\nGoogle: ${loginHref('google')}\nGitHub: ${loginHref('github')}`;
    }
    if (/payment|funding|deposit/i.test(message)) {
      return `${message}\n\nOpen the main app settings to add billing, then retry from this chat.`;
    }
    return message;
  }

  function startPolling(orderId) {
    if (state.polling) window.clearInterval(state.polling);
    const safeOrderId = String(orderId || '').trim();
    const viewRevision = Number(state.chatViewRevision || 0) || 0;
    let pollCount = 0;
    let consecutiveProgressErrors = 0;
    let nextProgressPollAt = 0;
    if (safeOrderId) {
      showProgressNarrator('Checking order progress.', {
        key: safeOrderId,
        phase: 'Dispatch',
        status: 'running',
        detail: `Order #${safeOrderId.slice(0, 8)}`,
        progressPercent: 8,
        progressLabel: 'Starting'
      });
    }
    const pollingContextIsCurrent = () => orderRuntimePollingContextIsCurrent({
      state,
      viewRevision,
      orderId: safeOrderId
    });
    const tick = async () => {
      if (!pollingContextIsCurrent()) return;
      pollCount += 1;
      const now = Date.now();
      if (nextProgressPollAt && now < nextProgressPollAt) return;
      try {
        const result = await api(`/api/jobs/${encodeURIComponent(safeOrderId)}?visitor_id=${encodeURIComponent(state.visitorId)}`);
        if (!pollingContextIsCurrent()) return;
        consecutiveProgressErrors = 0;
        nextProgressPollAt = 0;
        const job = result.job && typeof result.job === 'object' ? { ...result.job, id: result.job.id || safeOrderId } : { id: safeOrderId };
        const authorityRequest = authorityRequestFromJob(job);
        const approvalWaiting = authorityRequestIsActionableForJob(job, authorityRequest);
        rememberTrackedOrder(job.id || safeOrderId);
        notifyOrderMilestone(job);
        showProgressNarrator(progressNarratorTextForJob(job), progressNarratorOptionsForJob(job));
        showWorkflowProgressMap(job);
        maybeRenderAuthorityNotice(job, { label: 'Approval required' });
        if (orderRuntimeShouldPauseForApproval(job, approvalWaiting)) {
          showProgressNarrator('Waiting for approval or connector access.', {
            ...progressNarratorOptionsForJob(job),
            status: 'waiting',
            detail: 'Review the requested action in this chat.'
          });
          window.clearInterval(state.polling);
          state.polling = null;
          markLiveProgressStopped(safeOrderId);
          updateComposerMode();
          startDeliveryBackfillLoop({ maxRuns: 12, renderTerminalDeliveries: false });
          return;
        }
        if (jobHasDeliveryResult(job)) {
          showProgressNarrator(progressNarratorTextForJob(job), {
            ...progressNarratorOptionsForJob(job),
            done: true,
            progressPercent: 100,
            progressLabel: 'Complete'
          });
          window.clearInterval(state.polling);
          state.polling = null;
          updateComposerMode();
          renderDeliveryOnce(job);
          return;
        }
        if (pollCount >= CHATUX_PROGRESS_MAX_POLLS) {
          showProgressNarrator('Progress is continuing in the background.', {
            key: safeOrderId,
            phase: 'Background',
            status: 'watching',
            progressPercent: 96,
            progressLabel: 'Background'
          });
          window.clearInterval(state.polling);
          state.polling = null;
          markLiveProgressStopped(safeOrderId);
          updateComposerMode();
          startDeliveryBackfillLoop({ maxRuns: 60 });
        }
      } catch (error) {
        if (!pollingContextIsCurrent()) return;
        consecutiveProgressErrors += 1;
        const status = Number(error?.status || error?.statusCode || error?.data?.status || 0);
        const message = String(error?.message || '').toLowerCase();
        const transient = [408, 429, 500, 502, 503, 504].includes(status)
          || /failed to fetch|network|timeout|temporar|unavailable|gateway|rate limit|service/i.test(message);
        if (transient && consecutiveProgressErrors < 30) {
          const retryDelayMs = Math.min(45000, Math.max(5000, 3500 * consecutiveProgressErrors));
          nextProgressPollAt = Date.now() + retryDelayMs;
          showProgressNarrator('Progress check is retrying.', {
            key: safeOrderId,
            phase: 'Progress',
            status: 'retrying',
            detail: `Next check in ${Math.ceil(retryDelayMs / 1000)}s`,
            progressPercent: 18,
            progressLabel: 'Retrying'
          });
          if (consecutiveProgressErrors === 1) startDeliveryBackfillLoop({ maxRuns: 8 });
          return;
        }
        window.clearInterval(state.polling);
        state.polling = null;
        updateComposerMode();
        if (transient) {
          markLiveProgressStopped(safeOrderId);
          startDeliveryBackfillLoop({ maxRuns: 60 });
          return;
        }
        markLiveProgressStopped(safeOrderId);
        appendTextMessage('assistant', orderErrorMessage(error), { tone: 'error', label: 'Order status' });
        startDeliveryBackfillLoop({ maxRuns: 60 });
      }
    };
    void tick();
    state.polling = window.setInterval(tick, 3500);
    updateComposerMode();
  }

  return {
    orderErrorMessage,
    sendOrder,
    startPolling
  };
}
