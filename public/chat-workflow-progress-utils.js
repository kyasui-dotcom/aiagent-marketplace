export function createChatWorkflowProgressUtils(options = {}) {
  const chatLanguage = typeof options.chatLanguage === 'function' ? options.chatLanguage : (() => 'en');
  const getConversationLanguage = typeof options.getConversationLanguage === 'function'
    ? options.getConversationLanguage
    : (() => '');
  const getOrderId = typeof options.getOrderId === 'function' ? options.getOrderId : (() => '');
  const taskLabel = typeof options.taskLabel === 'function' ? options.taskLabel : ((value = '') => String(value || 'AI Agent'));
  const escapeHtml = typeof options.escapeHtml === 'function' ? options.escapeHtml : ((value = '') => String(value || ''));
  const shortDateTime = typeof options.shortDateTime === 'function' ? options.shortDateTime : (() => '');
  const deliveryText = typeof options.deliveryText === 'function' ? options.deliveryText : (() => '');
  const deliveryFiles = typeof options.deliveryFiles === 'function' ? options.deliveryFiles : (() => []);
  const renderFileCards = typeof options.renderFileCards === 'function' ? options.renderFileCards : (() => '');
  const rememberAgentMapRun = typeof options.rememberAgentMapRun === 'function' ? options.rememberAgentMapRun : (() => '');
  const renderAppHandoffRoutingPreview = typeof options.renderAppHandoffRoutingPreview === 'function'
    ? options.renderAppHandoffRoutingPreview
    : (() => '');
  const agentProgressRenderAgentRunDetailHtml = typeof options.agentProgressRenderAgentRunDetailHtml === 'function'
    ? options.agentProgressRenderAgentRunDetailHtml
    : (() => '');

  function conversationSample(sample = '') {
    return [sample, getConversationLanguage()].join(' ');
  }

  function durationLabel(ms = 0, sample = '') {
    const safeMs = Math.max(0, Number(ms || 0) || 0);
    const totalSec = Math.round(safeMs / 1000);
    const minutes = Math.floor(totalSec / 60);
    const seconds = totalSec % 60;
    const ja = chatLanguage(conversationSample(sample)) === 'ja';
    if (minutes <= 0) return ja ? `${seconds}秒` : `${seconds}s`;
    if (minutes < 60) return ja ? `${minutes}分${seconds ? `${seconds}秒` : ''}` : `${minutes}m${seconds ? ` ${seconds}s` : ''}`;
    const hours = Math.floor(minutes / 60);
    const restMinutes = minutes % 60;
    return ja ? `${hours}時間${restMinutes ? `${restMinutes}分` : ''}` : `${hours}h${restMinutes ? ` ${restMinutes}m` : ''}`;
  }

  function timestampMs(value = '') {
    const ms = Date.parse(String(value || ''));
    return Number.isFinite(ms) ? ms : 0;
  }

  function workflowRunWaitStatus(run = {}, job = {}) {
    if (!run || typeof run !== 'object') return null;
    const sample = [
      getConversationLanguage(),
      job.prompt,
      run.taskType,
      run.agentName,
      run.latestLog,
      run.dispatchCompletionStatus
    ].join(' ');
    const ja = chatLanguage(sample) === 'ja';
    const status = String(run.status || '').trim().toLowerCase();
    const dispatchStatus = String(run.dispatchCompletionStatus || run.dispatch_completion_status || run.dispatch?.completionStatus || '').trim().toLowerCase();
    const activeStatuses = new Set(['queued', 'running', 'claimed', 'dispatched']);
    if (!activeStatuses.has(status) && !['dispatch_scheduled', 'dispatch_in_progress', 'accepted'].includes(dispatchStatus)) return null;
    const at = timestampMs(
      dispatchStatus === 'dispatch_in_progress'
        ? (run.dispatchInProgressAt || run.dispatch_in_progress_at || run.startedAt)
        : dispatchStatus === 'dispatch_scheduled'
          ? (run.dispatchRequestedAt || run.dispatch_requested_at || run.startedAt || run.createdAt)
          : dispatchStatus === 'accepted'
            ? (run.providerQueueAcceptedAt || run.provider_queue_accepted_at || run.dispatchedAt || run.startedAt)
            : (run.startedAt || run.dispatchedAt || run.createdAt)
    );
    const elapsedMs = at ? Math.max(0, Date.now() - at) : 0;
    const elapsed = elapsedMs ? durationLabel(elapsedMs, sample) : '';
    const timeoutMs = Math.max(0, Number(run.dispatchTimeoutMs || run.dispatch_timeout_ms || run.dispatch?.dispatchTimeoutMs || 0) || 0);
    const windowLabel = timeoutMs ? durationLabel(timeoutMs, sample) : '';
    if (dispatchStatus === 'dispatch_in_progress') {
      return {
        text: ja ? 'が納品物を生成中です' : 'is generating the deliverable',
        detail: ja
          ? `経過 ${elapsed || '確認中'}${windowLabel ? `。待機目安 ${windowLabel} 内です` : '。生成完了を待っています'}。`
          : `Elapsed ${elapsed || 'checking'}${windowLabel ? `; still inside the ${windowLabel} wait window` : '; waiting for generation to finish'}.`,
        step: ja ? '生成 provider の応答待ち' : 'Waiting for the generation provider response',
        progressLabelSuffix: elapsed || ''
      };
    }
    if (dispatchStatus === 'dispatch_scheduled') {
      return {
        text: ja ? 'を実行キューへ渡しています' : 'is being handed to the agent runtime',
        detail: ja
          ? `${elapsed ? `${elapsed}前に` : ''}dispatch を予約しました。拾われない場合は進捗チェックが再投入します。`
          : `Dispatch was scheduled${elapsed ? ` ${elapsed} ago` : ''}. Progress checks will requeue it if the runtime misses it.`,
        step: ja ? 'dispatch 予約済み' : 'Dispatch scheduled',
        progressLabelSuffix: elapsed || ''
      };
    }
    if (dispatchStatus === 'accepted' || status === 'dispatched') {
      return {
        text: ja ? 'の実行結果を待っています' : 'is waiting for the run result',
        detail: ja
          ? `実行側が受理済みです${elapsed ? `。経過 ${elapsed}` : ''}。`
          : `The agent runtime accepted the job${elapsed ? `; elapsed ${elapsed}` : ''}.`,
        step: ja ? '実行側の結果待ち' : 'Waiting for agent result',
        progressLabelSuffix: elapsed || ''
      };
    }
    if (status === 'running' || status === 'claimed') {
      return {
        text: ja ? 'が処理中です' : 'is working',
        detail: elapsed ? (ja ? `処理開始から ${elapsed} 経過しています。` : `Running for ${elapsed}.`) : '',
        step: ja ? '処理中' : 'Agent running',
        progressLabelSuffix: elapsed || ''
      };
    }
    return null;
  }

  function workflowChildIsInternalLeaderSequenceRun(child = {}) {
    const phase = String(child.sequencePhase || child.sequence_phase || '').trim().toLowerCase();
    const task = String(child.taskType || child.workflowTask || child.dispatchTaskType || '').trim().toLowerCase();
    return ['checkpoint', 'final_summary'].includes(phase) && task.endsWith('_leader');
  }

  function workflowChildIsAdaptivePending(child = {}) {
    return child?.adaptivePending === true
      || child?.adaptive_pending === true
      || String(child?.dispatchCompletionStatus || child?.dispatch_completion_status || '').trim().toLowerCase() === 'leader_adaptive_pending';
  }

  function visibleWorkflowChildRuns(childRuns = [], visibleOptions = {}) {
    return (Array.isArray(childRuns) ? childRuns : [])
      .filter((child) => visibleOptions.includeInternalLeaderSequence === true || !workflowChildIsInternalLeaderSequenceRun(child))
      .filter((child) => visibleOptions.includeAdaptivePending === true || !workflowChildIsAdaptivePending(child));
  }

  function workflowPhaseLabel(phase = '') {
    const safe = String(phase || '').trim().toLowerCase();
    const labels = {
      initial: 'Leader review',
      data: 'Data',
      research: 'Research',
      checkpoint: 'Leader checkpoint',
      planning: 'Planning',
      product_design: 'Product design',
      preparation: 'Preparation',
      action: 'Action',
      prompt_handoff: 'Action handoff',
      final_summary: 'Final summary',
      leader: 'Leader',
      summary: 'Summary'
    };
    return labels[safe] || (safe ? safe.replace(/_/g, ' ') : 'Workflow');
  }

  function workflowPhaseRank(phase = '') {
    const safe = String(phase || '').trim().toLowerCase();
    return { initial: 1, data: 2, research: 3, checkpoint: 3.5, product_design: 4, planning: 4, preparation: 5, prompt_handoff: 6, action: 6, final_summary: 7, summary: 7 }[safe] || 9;
  }

  function workflowChildStatusRank(status = '') {
    const safe = String(status || '').trim().toLowerCase();
    return { running: 1, claimed: 1, dispatched: 1, queued: 2, blocked: 3, completed: 8, failed: 9, timed_out: 9 }[safe] || 5;
  }

  function workflowChildDisplayLabel(child = {}) {
    return String(child.agentName || child.agent_name || taskLabel(child.taskType || child.task_type || child.dispatchTaskType || child.dispatch_task_type || 'work')).trim();
  }

  function createdOrderChildRuns(created = {}, childOptions = {}) {
    const raw = Array.isArray(created?.child_runs)
      ? created.child_runs
      : (Array.isArray(created?.childRuns)
        ? created.childRuns
        : (Array.isArray(created?.workflow?.childRuns) ? created.workflow.childRuns : []));
    return visibleWorkflowChildRuns(raw, childOptions).map((child) => ({
      id: String(child.id || child.job_id || child.jobId || '').trim(),
      taskType: String(child.taskType || child.task_type || child.dispatchTaskType || child.dispatch_task_type || '').trim(),
      dispatchTaskType: String(child.dispatchTaskType || child.dispatch_task_type || child.taskType || child.task_type || '').trim(),
      agentId: String(child.agentId || child.agent_id || '').trim(),
      agentName: String(child.agentName || child.agent_name || '').trim(),
      sequencePhase: String(child.sequencePhase || child.sequence_phase || '').trim().toLowerCase(),
      status: String(child.status || 'queued').trim().toLowerCase(),
      adaptivePending: workflowChildIsAdaptivePending(child),
      createdAt: String(child.createdAt || child.created_at || '').trim(),
      startedAt: String(child.startedAt || child.started_at || '').trim(),
      dispatchedAt: String(child.dispatchedAt || child.dispatched_at || '').trim(),
      updatedAt: String(child.updatedAt || child.updated_at || '').trim(),
      completedAt: String(child.completedAt || child.completed_at || '').trim(),
      failedAt: String(child.failedAt || child.failed_at || '').trim(),
      failureReason: String(child.failureReason || child.failure_reason || '').trim(),
      dispatchCompletionStatus: String(child.dispatchCompletionStatus || child.dispatch_completion_status || child.dispatch?.completionStatus || '').trim(),
      dispatchRequestedAt: String(child.dispatchRequestedAt || child.dispatch_requested_at || child.dispatch?.dispatchRequestedAt || '').trim(),
      dispatchInProgressAt: String(child.dispatchInProgressAt || child.dispatch_in_progress_at || child.dispatch?.dispatchInProgressAt || '').trim(),
      dispatchTimeoutMs: Number(child.dispatchTimeoutMs || child.dispatch_timeout_ms || child.dispatch?.dispatchTimeoutMs || 0) || 0,
      providerQueueAcceptedAt: String(child.providerQueueAcceptedAt || child.provider_queue_accepted_at || child.dispatch?.providerQueueAcceptedAt || '').trim(),
      latestLog: String(child.latestLog || child.latest_log || '').trim()
    })).filter((child) => child.taskType || child.agentName || child.agentId);
  }

  function workflowCurrentChildRun(job = {}) {
    const childRuns = createdOrderChildRuns(job);
    if (!childRuns.length) return '';
    const internalLeaderActive = createdOrderChildRuns(job, { includeInternalLeaderSequence: true })
      .filter((child) => workflowChildIsInternalLeaderSequenceRun(child))
      .filter((child) => ['running', 'claimed', 'dispatched', 'queued', 'blocked'].includes(String(child.status || '').trim().toLowerCase()))
      .sort((left, right) => workflowChildStatusRank(left.status) - workflowChildStatusRank(right.status)
        || workflowPhaseRank(left.sequencePhase || left.sequence_phase) - workflowPhaseRank(right.sequencePhase || right.sequence_phase));
    if (internalLeaderActive[0]) return internalLeaderActive[0];
    const active = childRuns
      .filter((child) => ['running', 'claimed', 'dispatched'].includes(String(child.status || '').trim().toLowerCase()))
      .sort((left, right) => workflowChildStatusRank(left.status) - workflowChildStatusRank(right.status)
        || workflowPhaseRank(left.sequencePhase || left.sequence_phase) - workflowPhaseRank(right.sequencePhase || right.sequence_phase));
    const queued = childRuns
      .filter((child) => String(child.status || '').trim().toLowerCase() === 'queued')
      .sort((left, right) => workflowPhaseRank(left.sequencePhase || left.sequence_phase) - workflowPhaseRank(right.sequencePhase || right.sequence_phase));
    const blockedOrFailed = childRuns
      .filter((child) => ['blocked', 'failed', 'timed_out'].includes(String(child.status || '').trim().toLowerCase()))
      .sort((left, right) => workflowPhaseRank(left.sequencePhase || left.sequence_phase) - workflowPhaseRank(right.sequencePhase || right.sequence_phase));
    const completed = childRuns
      .filter((child) => String(child.status || '').trim().toLowerCase() === 'completed')
      .sort((left, right) => workflowPhaseRank(right.sequencePhase || right.sequence_phase) - workflowPhaseRank(left.sequencePhase || left.sequence_phase));
    return active[0] || queued[0] || blockedOrFailed[0] || completed[0] || null;
  }

  function workflowCurrentLocationLabel(job = {}) {
    const current = workflowCurrentChildRun(job);
    if (!current) return '';
    const phase = workflowPhaseLabel(current.sequencePhase || current.sequence_phase);
    const agent = workflowChildDisplayLabel(current);
    const status = statusDisplayLabel(current.status || 'queued');
    return `${phase} / ${agent} / ${status}`;
  }

  function workflowCurrentPhaseKey(job = {}) {
    const current = workflowCurrentChildRun(job);
    return String(current?.sequencePhase || current?.sequence_phase || '').trim().toLowerCase();
  }

  function workflowAgentProgressCounts(job = {}) {
    const workflow = job?.workflow && typeof job.workflow === 'object' ? job.workflow : {};
    const sourceCounts = workflow.agentStatusCounts && typeof workflow.agentStatusCounts === 'object'
      ? workflow.agentStatusCounts
      : (workflow.statusCounts && typeof workflow.statusCounts === 'object' ? workflow.statusCounts : {});
    const agentRuns = createdOrderChildRuns(job, { includeAdaptivePending: true });
    const runCount = agentRuns.length;
    const total = Math.max(
      Number(sourceCounts.total || 0) || 0,
      Number(workflow.plannedAgentRunCount || 0) || 0,
      Number(workflow.plannedCandidateAgentRunCount || 0) || 0,
      runCount
    );
    const countRuns = (predicate) => agentRuns.filter(predicate).length;
    const completed = Math.max(
      Number(sourceCounts.completed || 0) || 0,
      countRuns((child) => String(child.status || '').trim().toLowerCase() === 'completed')
    );
    const blocked = Math.max(
      Number(sourceCounts.blocked || 0) || 0,
      countRuns((child) => !child.adaptivePending && String(child.status || '').trim().toLowerCase() === 'blocked')
    );
    const failed = Math.max(
      Number(sourceCounts.failed || 0) || 0,
      countRuns((child) => ['failed', 'timed_out'].includes(String(child.status || '').trim().toLowerCase()))
    );
    return {
      total,
      completed: total ? Math.min(completed, total) : completed,
      blocked: total ? Math.min(blocked, total) : blocked,
      failed: total ? Math.min(failed, total) : failed
    };
  }

  function statusDisplayLabel(status = '') {
    const safe = String(status || '').trim().toLowerCase();
    if (safe === 'blocked') return 'waiting';
    if (safe === 'timed_out') return 'timed out';
    return String(status || '').trim() || 'created';
  }

  function isTerminalStatus(status = '') {
    return ['completed', 'failed', 'timed_out'].includes(String(status || '').toLowerCase());
  }

  function jobBlockedByLeaderQualityGate(job = {}) {
    const failureCategory = String(job?.failureCategory || job?.failure_category || '').trim().toLowerCase();
    const completionStatus = String(job?.dispatch?.completionStatus || job?.dispatch?.completion_status || '').trim().toLowerCase();
    return Boolean(
      failureCategory === 'leader_quality_gate_failed'
      || completionStatus === 'leader_quality_gate_failed'
      || /leader quality gate/i.test(String(job?.failureReason || job?.failure_reason || ''))
    );
  }

  function extractOrderId(created = {}) {
    return String(created.workflow_job_id || created.workflowJobId || created.job_id || created.jobId || '').trim();
  }

  function workflowAgentRunJobId(child = {}) {
    return String(child.id || child.job_id || child.jobId || child.jobID || '').trim();
  }

  function agentRunDetailRows(run = {}, job = null) {
    const phase = String(job?.input?._broker?.workflow?.sequencePhase || run.sequencePhase || run.sequence_phase || '').trim();
    const task = String(job?.workflowTask || run.taskType || run.task_type || run.dispatchTaskType || run.dispatch_task_type || '').trim();
    const agent = String(job?.workflowAgentName || run.agentName || run.agent_name || '').trim();
    const jobId = workflowAgentRunJobId(job || run);
    const timestamps = [
      ['Created', job?.createdAt || run.createdAt],
      ['Started', job?.startedAt || run.startedAt],
      ['Updated', job?.updatedAt || run.updatedAt],
      ['Completed', job?.completedAt || run.completedAt],
      ['Failed', job?.failedAt || run.failedAt]
    ].map(([label, value]) => [label, shortDateTime(value)]).filter(([, value]) => value);
    return [
      ['Status', statusDisplayLabel(job?.status || run.status || 'planned')],
      phase ? ['Phase', workflowPhaseLabel(phase)] : null,
      task ? ['Task', taskLabel(task)] : null,
      agent ? ['Agent', agent] : null,
      jobId ? ['Job ID', jobId.slice(0, 8)] : null,
      (job?.dispatch?.completionStatus || run.dispatchCompletionStatus || run.dispatch_completion_status) ? ['Runtime', String(job?.dispatch?.completionStatus || run.dispatchCompletionStatus || run.dispatch_completion_status)] : null,
      workflowRunWaitStatus(job || run, job || run)?.detail ? ['Wait', workflowRunWaitStatus(job || run, job || run).detail] : null,
      ...timestamps
    ].filter(Boolean);
  }

  function renderAgentRunDetailHtml(run = {}, job = null, renderOptions = {}) {
    return agentProgressRenderAgentRunDetailHtml(run, job, {
      ...renderOptions,
      escapeHtml,
      workflowChildDisplayLabel,
      agentRunDetailRows,
      deliveryText,
      deliveryFiles,
      renderFileCards,
      statusDisplayLabel
    });
  }

  function workflowAgentMapHtml(childRuns = [], mapOptions = {}) {
    const visibleRuns = Array.isArray(childRuns) ? childRuns : [];
    if (!visibleRuns.length) return '';
    const currentPhase = String(mapOptions.currentPhase || '').trim().toLowerCase();
    const currentChildId = String(mapOptions.currentChildId || '').trim();
    const groups = [];
    for (const child of visibleRuns) {
      const phase = child.sequencePhase || 'workflow';
      let group = groups.find((item) => item.phase === phase);
      if (!group) {
        group = { phase, items: [] };
        groups.push(group);
      }
      group.items.push(child);
    }
    groups.sort((left, right) => workflowPhaseRank(left.phase) - workflowPhaseRank(right.phase));
    const diagram = groups.map((group, index) => {
      const phaseIsCurrent = currentPhase && group.phase === currentPhase;
      return [
        index ? '<div class="agent-map-arrow" aria-hidden="true">→</div>' : '',
        `<div class="agent-map-phase${phaseIsCurrent ? ' current' : ''}">`,
        `<div class="agent-map-phase-title">${escapeHtml(workflowPhaseLabel(group.phase))}${phaseIsCurrent ? '<span>Now</span>' : ''}</div>`,
        ...group.items.slice(0, 4).map((child) => {
          const status = String(child.status || 'queued').trim().toLowerCase();
          const shownStatus = child.adaptivePending ? 'planned' : status;
          const statusClass = shownStatus.replace(/[^a-z0-9_-]+/g, '');
          const isCurrent = currentChildId
            ? currentChildId === String(child.id || '').trim()
            : phaseIsCurrent && ['running', 'claimed', 'dispatched', 'queued', 'blocked'].includes(status);
          const runKey = rememberAgentMapRun(child);
          const jobId = workflowAgentRunJobId(child);
          return [
            `<button class="agent-map-node ${escapeHtml(statusClass)}${isCurrent ? ' current' : ''}" type="button" data-agent-run-open data-agent-run-key="${escapeHtml(runKey)}" data-agent-job-id="${escapeHtml(jobId)}" data-agent-name="${escapeHtml(workflowChildDisplayLabel(child))}" data-agent-task="${escapeHtml(child.taskType || child.dispatchTaskType || '')}" data-agent-phase="${escapeHtml(child.sequencePhase || '')}" data-agent-status="${escapeHtml(shownStatus || 'queued')}" aria-expanded="false" title="Show status and intermediate deliverables">`,
            `<strong>${escapeHtml(workflowChildDisplayLabel(child))}</strong>`,
            `<span>${escapeHtml(taskLabel(child.taskType || child.dispatchTaskType || 'work'))} · ${escapeHtml(statusDisplayLabel(shownStatus || 'queued'))}</span>`,
            '</button>'
          ].join('');
        }),
        group.items.length > 4 ? `<span class="agent-map-more">+${group.items.length - 4} more</span>` : '',
        '</div>'
      ].filter(Boolean).join('\n');
    }).join('\n');
    const footer = String(mapOptions.footer || '').trim();
    return [
      `<div class="agent-map-card${mapOptions.progress ? ' progress' : ''}" data-agent-progress-map data-agent-parent-job-id="${escapeHtml(mapOptions.parentJobId || '')}">`,
      '<div class="agent-map-head">',
      `<strong>${escapeHtml(mapOptions.title || 'Agent map')}</strong>`,
      `<span>${escapeHtml(mapOptions.subtitle || `${visibleRuns.length} visible agent runs`)}</span>`,
      '</div>',
      `<div class="agent-map-diagram">${diagram}</div>`,
      mapOptions.handoffHtml ? mapOptions.handoffHtml : '',
      footer ? `<div class="chat-hint">${escapeHtml(footer)}</div>` : '',
      '</div>'
    ].join('\n');
  }

  function initialAgentMapHtml(created = {}, prompt = '') {
    const childRuns = createdOrderChildRuns(created, { includeAdaptivePending: true });
    const isWorkflow = String(created?.mode || '').toLowerCase() === 'workflow' || Boolean(created?.workflow_job_id || created?.workflowJobId);
    if (!isWorkflow && !childRuns.length && !created?.matched_agent_id) return '';
    if (!isWorkflow) {
      const jobId = extractOrderId(created);
      const run = {
        id: jobId,
        agentId: String(created?.matched_agent_id || '').trim(),
        agentName: String(created?.matched_agent_name || created?.matched_agent_id || 'Selected agent').trim(),
        taskType: String(created?.task_type || created?.taskType || '').trim(),
        sequencePhase: 'initial',
        status: String(created?.status || 'created').trim().toLowerCase()
      };
      const runKey = rememberAgentMapRun(run);
      const statusClass = run.status.replace(/[^a-z0-9_-]+/g, '') || 'created';
      return [
        `<div class="agent-map-card" data-agent-progress-map data-agent-parent-job-id="${escapeHtml(jobId)}">`,
        '<div class="agent-map-head">',
        '<strong>Agent map</strong>',
        '<span>Initial route</span>',
        '</div>',
        `<button class="agent-map-single agent-map-node ${escapeHtml(statusClass)}" type="button" data-agent-run-open data-agent-run-key="${escapeHtml(runKey)}" data-agent-job-id="${escapeHtml(jobId)}" data-agent-name="${escapeHtml(run.agentName)}" data-agent-task="${escapeHtml(run.taskType)}" data-agent-phase="initial" data-agent-status="${escapeHtml(run.status)}" aria-expanded="false" title="Show status and intermediate deliverables">`,
        `<strong>${escapeHtml(run.agentName)}</strong>`,
        `<span>${escapeHtml(statusDisplayLabel(created?.status || 'created'))}</span>`,
        '</button>',
        '</div>'
      ].join('\n');
    }
    return workflowAgentMapHtml(childRuns, {
      title: 'Agent map',
      subtitle: `${childRuns.length} visible agent runs · adaptive first layer`,
      footer: 'Progress updates below will show the current phase and active agent. Later layers appear after leader checkpoints.',
      parentJobId: extractOrderId(created)
    });
  }

  function workflowPhaseProgressMapHtml(job = {}, mapOptions = {}) {
    const current = workflowCurrentChildRun(job);
    const childRuns = createdOrderChildRuns(job, {
      includeAdaptivePending: true,
      includeInternalLeaderSequence: workflowChildIsInternalLeaderSequenceRun(current || {})
    });
    if (!childRuns.length || !current) return '';
    const phase = String(current.sequencePhase || '').trim().toLowerCase();
    const counts = workflowAgentProgressCounts(job);
    return workflowAgentMapHtml(childRuns, {
      title: 'Agent map',
      subtitle: [
        `${counts.completed}/${counts.total || childRuns.length} complete`,
        `Current: ${workflowPhaseLabel(phase)} / ${workflowChildDisplayLabel(current)} / ${statusDisplayLabel(current.status || 'queued')}`,
        mapOptions.retrying ? 'status check retrying' : ''
      ].filter(Boolean).join(' · '),
      footer: mapOptions.footer || '',
      currentPhase: phase,
      currentChildId: current.id,
      progress: true,
      parentJobId: job.id || getOrderId() || '',
      handoffHtml: renderAppHandoffRoutingPreview(job)
    });
  }

  function progressNarratorTextForJob(job = {}) {
    const current = workflowCurrentChildRun(job);
    const phase = String(current?.sequencePhase || current?.sequence_phase || '').trim().toLowerCase();
    const agent = workflowChildDisplayLabel(current || {});
    const status = String(current?.status || job.status || '').trim().toLowerCase();
    const phaseLabel = workflowPhaseLabel(phase);
    const wait = workflowRunWaitStatus(current, job);
    if (current && wait?.text) {
      const sentenceEnd = chatLanguage([getConversationLanguage(), wait.text].join(' ')) === 'ja' ? '。' : '.';
      return `${phaseLabel}: ${agent || 'Agent'} ${wait.text}${sentenceEnd}`;
    }
    if (current) return `${phaseLabel}: ${agent || 'Agent'} is ${statusDisplayLabel(status || 'queued').toLowerCase()}.`;
    if (status === 'completed') return 'The order is complete. Preparing the delivery for this chat.';
    if (status === 'failed' || status === 'timed_out') return 'The order stopped. Collecting the failure reason and next step.';
    return 'CAIt is updating the agent map.';
  }

  function progressNarratorOptionsForJob(job = {}) {
    const current = workflowCurrentChildRun(job);
    const counts = workflowAgentProgressCounts(job);
    const total = counts.total;
    const completed = counts.completed;
    const phase = workflowPhaseLabel(current?.sequencePhase || current?.sequence_phase || '');
    const status = statusDisplayLabel(job.status || 'running');
    const wait = workflowRunWaitStatus(current, job);
    const progressLabel = total ? `${completed}/${total} agents${wait?.progressLabelSuffix ? ` · ${wait.progressLabelSuffix}` : ''}` : status;
    return {
      key: String(job.id || getOrderId() || 'progress'),
      phase,
      status,
      detail: wait?.detail || (current ? `Current: ${workflowChildDisplayLabel(current)} / ${statusDisplayLabel(current.status || 'queued')}` : ''),
      total,
      completed,
      progressPercent: isTerminalStatus(job.status)
        ? 100
        : (total ? Math.max(8, Math.min(96, Math.round((completed / total) * 100))) : 12),
      progressLabel,
      steps: [
        total ? `${completed}/${total} agent runs complete` : '',
        wait?.step || '',
        job.failureReason || job.failure_reason || ''
      ].filter(Boolean),
      done: isTerminalStatus(job.status)
    };
  }

  function statusLabel(job = {}) {
    const status = String(job.status || '').trim() || 'created';
    if (jobBlockedByLeaderQualityGate(job)) {
      const location = workflowCurrentLocationLabel(job);
      return `blocked by quality gate${location ? `, now: ${location}` : ''}`;
    }
    const visibleStatus = statusDisplayLabel(status);
    if (job.jobKind === 'workflow' || job.workflow) {
      const counts = workflowAgentProgressCounts(job);
      const total = counts.total;
      const completed = counts.completed;
      const blocked = counts.blocked;
      const failed = counts.failed;
      const location = workflowCurrentLocationLabel(job);
      const suffix = total ? `, ${completed}/${total} agent runs complete${blocked ? `, ${blocked} waiting` : ''}${failed ? `, ${failed} failed` : ''}` : '';
      return `${visibleStatus}${suffix}${location ? `, now: ${location}` : ''}`;
    }
    return visibleStatus;
  }

  return {
    createdOrderChildRuns,
    durationLabel,
    extractOrderId,
    initialAgentMapHtml,
    isTerminalStatus,
    jobBlockedByLeaderQualityGate,
    progressNarratorOptionsForJob,
    progressNarratorTextForJob,
    renderAgentRunDetailHtml,
    statusDisplayLabel,
    statusLabel,
    timestampMs,
    visibleWorkflowChildRuns,
    workflowAgentProgressCounts,
    workflowAgentRunJobId,
    workflowChildDisplayLabel,
    workflowChildIsAdaptivePending,
    workflowChildIsInternalLeaderSequenceRun,
    workflowCurrentChildRun,
    workflowCurrentLocationLabel,
    workflowCurrentPhaseKey,
    workflowPhaseLabel,
    workflowPhaseProgressMapHtml,
    workflowPhaseRank,
    workflowRunWaitStatus
  };
}
