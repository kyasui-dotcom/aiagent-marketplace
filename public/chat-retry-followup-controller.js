export function createChatRetryFollowupController(deps = {}) {
  const {
    state,
    window,
    api,
    chatEngineBuildOrderDraft,
    draftBrief,
    isStructuredOrderBriefText,
    CHATUX_RETRY_MODE_NEW_ORDER,
    fetchVisibleJob,
    cachedVisibleJobForRetry,
    jobHasDeliveryResult,
    renderDeliveryOnce,
    selectedRetryReuseArtifactsForOrder,
    workflowRetryMetaForDraft,
    looksJapanese,
    taskLabel,
    setBusy,
    markLiveProgressStopped,
    leaderOwner,
    withConversationOwner,
    renderActiveLeaderStatus,
    currentLockedConversationOwner,
    setConversationOwnerFromPrepared,
    chatText,
    appendTextMessage,
    appendOrderConfirmation,
    orderErrorMessage,
    refreshRecentJobs,
    statusDisplayLabel,
    maybeRenderAuthorityNotice,
    resumeLiveProgress,
    startPolling
  } = deps;

  function retryDraftFromJob(job = {}, options = {}) {
    const workflow = job.workflow && typeof job.workflow === 'object'
      ? job.workflow
      : (job.input?._broker?.workflow && typeof job.input._broker.workflow === 'object' ? job.input._broker.workflow : {});
    const plannedTasks = Array.isArray(workflow.plannedTasks)
      ? workflow.plannedTasks.map((item) => String(item || '').trim().toLowerCase()).filter(Boolean)
      : [];
    const taskType = String(plannedTasks[0] || job.taskType || job.workflowTask || 'research').trim().toLowerCase() || 'research';
    const route = String(
      job.orderStrategy
      || job.order_strategy
      || job.input?.order_strategy
      || job.input?.orderStrategy
      || (job.jobKind === 'workflow' || job.workflow ? 'multi' : 'single')
    ).trim().toLowerCase() || 'auto';
    const broker = job.input?._broker && typeof job.input._broker === 'object' ? job.input._broker : {};
    const previousInput = job.input && typeof job.input === 'object' ? job.input : {};
    const previousPrompt = String(job.originalPrompt || workflow.objective || job.prompt || '').trim();
    const promptCandidates = [
      previousInput.original_prompt,
      previousInput.originalPrompt,
      broker?.workflow?.originalPrompt,
      broker?.workflow?.objective,
      job.originalPrompt,
      workflow.originalPrompt,
      workflow.objective,
      job.prompt,
    ].map((item) => String(item || '').trim()).filter(Boolean);
    const originalPrompt = promptCandidates.find((item) => !/^(?:retry|redo|rerun|再実行|リトライ|やり直し)$/i.test(item))
      || promptCandidates[0]
      || '';
    const prompt = previousPrompt
      ? previousPrompt
      : isStructuredOrderBriefText(job.prompt)
      ? String(job.prompt || '').trim()
      : draftBrief(originalPrompt || job.prompt || '', {
          taskType,
          resolvedOrderStrategy: route,
          reason: `Retry prepared from order ${String(job.id || '').slice(0, 8)}.`
        }, { ja: looksJapanese(originalPrompt || job.prompt || '') });
    const owner = broker.conversationOwner || broker.activeLeader || {};
    const ownerTaskType = String(owner.taskType || owner.task_type || (taskType.endsWith('_leader') ? taskType : '')).trim().toLowerCase();
    const ownerLabel = String(owner.label || owner.name || '').trim();
    const previousConnectorContexts = Array.isArray(broker.connectorContexts)
      ? broker.connectorContexts.slice(0, 8)
      : Array.isArray(previousInput.connectorContexts)
        ? previousInput.connectorContexts.slice(0, 8)
        : [];
    const previousAppContexts = Array.isArray(broker.appContexts)
      ? broker.appContexts.slice(0, 8)
      : Array.isArray(previousInput.appContexts)
        ? previousInput.appContexts.slice(0, 8)
        : [];
    const reuseArtifacts = Array.isArray(options.reuseArtifacts)
      ? options.reuseArtifacts
        .filter((item) => item && item.user_selected !== false && item.userSelected !== false)
        .map((item) => ({
          ...item,
          task_type: String(item.task_type || item.taskType || '').trim().toLowerCase(),
          taskType: String(item.taskType || item.task_type || '').trim().toLowerCase(),
          source_order_id: String(item.source_order_id || item.sourceOrderId || job.id || '').trim(),
          sourceOrderId: String(item.sourceOrderId || item.source_order_id || job.id || '').trim(),
          source_run_id: String(item.source_run_id || item.sourceRunId || '').trim(),
          sourceRunId: String(item.sourceRunId || item.source_run_id || '').trim(),
          user_selected: true,
          userSelected: true
        }))
        .filter((item) => item.task_type && item.source_run_id && String(item.content || '').trim())
        .slice(0, 8)
      : [];
    const retryWorkflowMeta = workflowRetryMetaForDraft(
      broker.workflow && typeof broker.workflow === 'object' ? broker.workflow : {},
      reuseArtifacts
    );
    return {
      taskType,
      task_type: taskType,
      resolvedOrderStrategy: route,
      resolved_order_strategy: route,
      retryMode: CHATUX_RETRY_MODE_NEW_ORDER,
      retry_mode: CHATUX_RETRY_MODE_NEW_ORDER,
      retryOfOrderId: String(job.id || '').trim(),
      continuesOrder: false,
      continues_order: false,
      reason: `Prepared as the same content in a new order from previous order ${String(job.id || '').slice(0, 8)}. It will not continue the previous order.`,
      prompt,
      originalPrompt: originalPrompt || prompt,
      intakeChecked: true,
      intakeAnswered: true,
      activeLeaderTaskType: ownerTaskType,
      activeLeaderName: ownerLabel,
      activeLeaderLocked: Boolean(ownerTaskType),
      active_leader_locked: Boolean(ownerTaskType),
      conversationOwner: ownerTaskType ? { type: 'leader', taskType: ownerTaskType, label: ownerLabel || taskLabel(ownerTaskType) } : undefined,
      workflowPlannedTasks: plannedTasks,
      workflow_planned_tasks: plannedTasks,
      ...(reuseArtifacts.length ? { retryReuseArtifacts: reuseArtifacts, retry_reuse_artifacts: reuseArtifacts } : {}),
      input: {
        ...(previousConnectorContexts.length ? { connectorContexts: previousConnectorContexts } : {}),
        ...(previousAppContexts.length ? { appContexts: previousAppContexts } : {}),
        _broker: {
          ...(previousConnectorContexts.length ? { connectorContexts: previousConnectorContexts } : {}),
          ...(previousAppContexts.length ? { appContexts: previousAppContexts } : {}),
          retryOfOrderId: String(job.id || '').trim(),
          retryOfStatus: String(job.status || '').trim(),
          retryPreparedAt: new Date().toISOString(),
          retry: {
            mode: CHATUX_RETRY_MODE_NEW_ORDER,
            intent: CHATUX_RETRY_MODE_NEW_ORDER,
            sourceOrderId: String(job.id || '').trim(),
            sourceStatus: String(job.status || '').trim(),
            continuesOrder: false,
            preservePrompt: true,
            preservePlan: plannedTasks.length > 0,
            plannedTasks,
            ...(reuseArtifacts.length ? { reuseArtifacts, reuse_artifacts: reuseArtifacts } : {}),
            preparedAt: new Date().toISOString()
          },
          ...(Object.keys(retryWorkflowMeta).length ? { workflow: retryWorkflowMeta } : {}),
          ...(ownerTaskType ? {
            conversationOwner: { type: 'leader', taskType: ownerTaskType, label: ownerLabel || taskLabel(ownerTaskType) },
            activeLeader: { taskType: ownerTaskType, label: ownerLabel || taskLabel(ownerTaskType) },
            activeLeaderLocked: true
          } : {})
        }
      },
      updatedAt: new Date().toISOString()
    };
  }

  async function prepareRetryFromOrder(orderId = '', options = {}) {
    const safeId = String(orderId || '').trim();
    if (!safeId) return;
    setBusy(true);
    try {
      let job = null;
      try {
        job = await fetchVisibleJob(safeId, { force: true, progress: false, inspectOnly: true });
      } catch (error) {
        const cached = cachedVisibleJobForRetry(safeId);
        if (cached?.id && jobHasDeliveryResult(cached)) {
          job = cached;
        } else {
          throw error;
        }
      }
      if (!job?.id) throw new Error('Order was not found.');
      renderDeliveryOnce(job, { force: true });
      const reuseArtifacts = Array.isArray(options.reuseArtifacts) ? options.reuseArtifacts : selectedRetryReuseArtifactsForOrder(safeId);
      state.draft = retryDraftFromJob(job, { reuseArtifacts });
      const sourceOrderId = String(job.id || safeId || '').trim();
      state.followupTargetOrderId = '';
      markLiveProgressStopped(sourceOrderId);
      if (String(state.orderId || '').trim() === sourceOrderId) {
        state.orderId = '';
        if (state.polling) window.clearInterval(state.polling);
        state.polling = null;
      }
      const retryOwner = state.draft.conversationOwner?.type === 'leader'
        ? leaderOwner(state.draft.conversationOwner.taskType, `Preserved from retry source order ${String(job.id || '').slice(0, 8)}.`)
        : null;
      if (retryOwner) {
        state.activeOwner = {
          type: 'leader',
          taskType: retryOwner.taskType,
          label: retryOwner.label,
          reason: retryOwner.reason
        };
        state.activeOwnerLocked = true;
        state.activeLeader = {
          taskType: retryOwner.taskType,
          label: retryOwner.label,
          reason: retryOwner.reason
        };
        state.activeLeaderLocked = true;
        state.draft = withConversationOwner(state.draft, retryOwner);
        renderActiveLeaderStatus();
      } else {
        const lockedOwner = currentLockedConversationOwner();
        if (lockedOwner) state.draft = withConversationOwner(state.draft, lockedOwner);
      }
      setConversationOwnerFromPrepared(state.draft, { sample: state.draft.originalPrompt || state.draft.prompt });
      state.draftRevision += 1;
      const reuseNote = reuseArtifacts.length
        ? chatText(
            ` Selected completed artifacts to reuse: ${reuseArtifacts.map((item) => item.task_type || item.taskType).filter(Boolean).join(', ')}. Those steps will be skipped in the new order.`,
            ` 再利用する完了済み成果物: ${reuseArtifacts.map((item) => item.task_type || item.taskType).filter(Boolean).join(', ')}。新しいオーダーでは該当ステップをスキップします。`,
            state.draft.originalPrompt || state.draft.prompt
          )
        : '';
      appendTextMessage('assistant', chatText(
        `I prepared a same-content retry as a NEW order. It will not continue order #${sourceOrderId.slice(0, 8)}. Use Check status or approval controls when you want to continue an existing order instead.${reuseNote}`,
        `同じ内容を新しいオーダーとして再実行するドラフトを作りました。既存オーダー #${sourceOrderId.slice(0, 8)} の続きではありません。既存オーダーを続ける場合は Check status や承認コントロールを使ってください。${reuseNote}`,
        state.draft.originalPrompt || state.draft.prompt
      ), { tone: 'warn', label: 'Retry as new order' });
      appendOrderConfirmation({ updated: true });
    } catch (error) {
      appendTextMessage('assistant', orderErrorMessage(error), { tone: 'error', label: 'Retry' });
    } finally {
      setBusy(false);
    }
  }

  function retryCommandText(prompt = '') {
    const compact = String(prompt || '').replace(/[?？!！。.,、\s]+$/g, '').trim();
    return /^(retry|redo|rerun|run again|try again|リトライ|再実行|やり直し|もう一回|もう一度)$/i.test(compact);
  }

  async function retryTargetJobForCommand() {
    const ids = [...new Set([
      state.orderId,
      state.followupTargetOrderId,
      ...Array.from(state.trackedOrderIds || []).reverse()
    ].map((item) => String(item || '').trim()).filter(Boolean))];
    let firstKnown = null;
    for (const id of ids) {
      try {
        const job = await fetchVisibleJob(id);
        if (!job?.id) continue;
        if (!firstKnown) firstKnown = job;
        if (jobHasDeliveryResult(job)) return job;
      } catch {}
    }
    try {
      const jobs = await refreshRecentJobs({ force: true });
      const terminal = (Array.isArray(jobs) ? jobs : []).find((job) => job?.id && jobHasDeliveryResult(job));
      if (terminal) return terminal;
      return firstKnown || (Array.isArray(jobs) ? jobs.find((job) => job?.id) : null) || null;
    } catch {
      return firstKnown;
    }
  }

  async function handleRetryCommand(prompt = '') {
    if (!retryCommandText(prompt)) return false;
    const job = await retryTargetJobForCommand();
    if (!job?.id) {
      appendTextMessage('assistant', chatText(
        'I could not find an order to retry. Open an order from history first, then press Retry as new order.',
        'リトライ対象のオーダーが見つかりません。先に履歴から対象オーダーを開いてから Retry as new order を押してください。',
        prompt
      ), { tone: 'warn', label: 'Retry' });
      return true;
    }
    if (!jobHasDeliveryResult(job)) {
      const visibleStatus = statusDisplayLabel(job.status || 'created');
      appendTextMessage('assistant', chatText(
        `Order ${job.id.slice(0, 8)} is still ${visibleStatus}. I did not create a retry draft while the order is active.`,
        `オーダー ${job.id.slice(0, 8)} はまだ ${visibleStatus} です。進行中のためリトライドラフトは作成していません。`,
        prompt
      ), { tone: 'warn', label: 'Retry' });
      maybeRenderAuthorityNotice(job, { label: 'Approval required' });
      resumeLiveProgress(job.id);
      startPolling(job.id);
      return true;
    }
    await prepareRetryFromOrder(job.id);
    return true;
  }

  function explicitActiveOrderFollowupRequestText(text = '') {
    const compact = String(text || '').trim();
    if (!compact) return false;
    return /(?:continue|resume|follow[-\s]?up|add|attach|append).{0,48}(?:this|current|existing|same).{0,16}(?:order|workflow|run)/i.test(compact)
      || /(?:this|current|existing|same).{0,16}(?:order|workflow|run).{0,48}(?:continue|resume|follow[-\s]?up|add|attach|append)/i.test(compact)
      || /(?:この|今の|現在の|既存の|同じ).{0,12}(?:オーダー|注文|ワークフロー|依頼).{0,32}(?:続き|追加|紐づけ|引き継ぎ|再開)/i.test(compact)
      || /(?:続き|追加|紐づけ|引き継ぎ|再開).{0,32}(?:この|今の|現在の|既存の|同じ).{0,12}(?:オーダー|注文|ワークフロー|依頼)/i.test(compact);
  }

  function activeOrderFollowupAllowedText(prompt = '') {
    const text = String(prompt || '').trim();
    if (!text || !state.orderId || state.draft || state.pendingIntake) return false;
    const compact = text.replace(/[?？!！。.,、\s]+$/g, '').trim();
    if (/^(send|send order|発注|注文|実行)$/i.test(compact)) return false;
    if (retryCommandText(compact)) return false;
    if (/^(status|help|状況|現状|今どこ|何待ち|ヘルプ)$/i.test(compact)) return false;
    if (/^(pause|hold|stop|later|not now|cancel|一旦保留|いったん保留|保留|あとで|後で|ストップ|止めて|中断|キャンセル|やめる)$/i.test(compact)) return false;
    return explicitActiveOrderFollowupRequestText(compact);
  }

  async function prepareFollowupForRunningOrder(prompt = '') {
    const text = String(prompt || '').trim();
    const orderId = String(state.orderId || '').trim();
    if (!text || !orderId) return false;
    const job = await fetchVisibleJob(orderId);
    if (!job?.id || jobHasDeliveryResult(job)) return false;
    let prepared;
    try {
      prepared = await api('/api/deliveries/prepare-followup-order', {
        method: 'POST',
        body: JSON.stringify({
          job_id: job.id,
          answer: text,
          mode: 'running',
          allow_running: true
        })
      });
    } catch (error) {
      appendTextMessage('assistant', `${chatText('Could not prepare that as a follow-up for the running order.', '進行中オーダーへの追加要望として準備できませんでした。', text)} ${orderErrorMessage(error)}`, { tone: 'error', label: 'Follow-up' });
      return true;
    }
    const preparedPrompt = String(prepared?.prompt || '').trim();
    const preparedTaskType = String(prepared?.task_type || prepared?.taskType || '').trim();
    if (!preparedPrompt || !preparedTaskType) {
      appendTextMessage('assistant', chatText(
        'The server did not return a complete follow-up draft, so I did not create one in chat.',
        'サーバーが完全なフォローアップドラフトを返さなかったため、チャット側では作成しませんでした。',
        text
      ), { tone: 'error', label: 'Follow-up' });
      return true;
    }
    const conversationOwner = prepared?.conversation_owner && typeof prepared.conversation_owner === 'object'
      ? prepared.conversation_owner
      : prepared?.conversationOwner;
    const draftSeed = {
      ...(prepared || {}),
      taskType: preparedTaskType,
      task_type: preparedTaskType,
      resolvedOrderStrategy: prepared?.order_strategy || prepared?.resolvedOrderStrategy || 'auto',
      resolved_order_strategy: prepared?.order_strategy || prepared?.resolved_order_strategy || 'auto',
      reason: String(prepared?.reason || '').trim(),
      conversationOwner
    };
    state.draft = chatEngineBuildOrderDraft(preparedPrompt, draftSeed, {
      originalPrompt: text,
      intakeChecked: true,
      intakeAnswered: true,
      conversationOwner
    });
    const broker = state.draft.input?._broker && typeof state.draft.input._broker === 'object' ? state.draft.input._broker : {};
    const preparedBroker = prepared?.input?._broker && typeof prepared.input._broker === 'object' ? prepared.input._broker : {};
    state.draft.input = {
      ...(state.draft.input || {}),
      ...(prepared?.input && typeof prepared.input === 'object' ? prepared.input : {}),
      _broker: {
        ...preparedBroker,
        ...broker,
        conversation: {
          ...(preparedBroker.conversation && typeof preparedBroker.conversation === 'object' ? preparedBroker.conversation : {}),
          ...(broker.conversation && typeof broker.conversation === 'object' ? broker.conversation : {}),
          mode: 'followup',
          userExplicitContinuation: true,
          explicitContinuation: true,
          followupToJobId: String(prepared?.followup_to_job_id || job.id),
          followup_to_job_id: String(prepared?.followup_to_job_id || job.id)
        },
      }
    };
    state.draft.followupToJobId = String(prepared?.followup_to_job_id || job.id);
    state.followupTargetOrderId = String(prepared?.followup_to_job_id || job.id);
    state.draftRevision += 1;
    setConversationOwnerFromPrepared(state.draft, { sample: text });
    appendTextMessage('assistant', chatText(
      `I prepared this as an add-on request for running order ${job.id.slice(0, 8)}. Review it, then press Send order to attach the new request.`,
      `進行中オーダー ${job.id.slice(0, 8)} への追加要望としてドラフト化しました。内容を確認し、Send order でこの要望を紐づけて実行します。`,
      text
    ), { tone: 'ok', label: 'Follow-up' });
    appendOrderConfirmation({ updated: true });
    return true;
  }

  return {
    activeOrderFollowupAllowedText,
    handleRetryCommand,
    prepareFollowupForRunningOrder,
    prepareRetryFromOrder,
    retryDraftFromJob
  };
}
