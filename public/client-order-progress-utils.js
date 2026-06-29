import { compactClientText as compactChatText } from './client-text-utils.js?v=20260521a';

export function normalizeOrderProgressStatus(status = '') {
  return String(status || '').trim().toLowerCase() || 'created';
}

export function orderProgressStatusLabel(status = '', options = {}) {
  const normalized = normalizeOrderProgressStatus(status);
  const ja = Boolean(options.ja);
  if (normalized === 'blocked') return ja ? '待機中' : 'waiting';
  if (normalized === 'queued') return ja ? '開始待ち' : 'waiting to start';
  if (normalized === 'created' || normalized === 'pending') return ja ? '準備中' : 'preparing';
  if (normalized === 'timed_out') return ja ? 'タイムアウト' : 'timed out';
  return normalized;
}

export function orderProgressTone(status = '') {
  const normalized = normalizeOrderProgressStatus(status);
  if (normalized === 'completed') return 'ok';
  if (normalized === 'blocked') return 'warn';
  if (normalized === 'failed' || normalized === 'timed_out') return 'error';
  if (normalized === 'running' || normalized === 'claimed' || normalized === 'dispatched') return 'ok';
  return 'info';
}

export function orderProgressSteps(status = '', options = {}) {
  const normalized = normalizeOrderProgressStatus(status);
  const ja = Boolean(options.ja);
  if (normalized === 'completed') return ja
    ? ['注文受付', 'Agent処理', '納品完了']
    : ['Order accepted', 'Agent work', 'Delivery ready'];
  if (normalized === 'blocked') return ja
    ? ['注文受付', '実行工程', '待機中']
    : ['Order accepted', 'Action phase', 'Waiting'];
  if (normalized === 'failed' || normalized === 'timed_out') return ja
    ? ['注文受付', 'Agent接続', '停止']
    : ['Order accepted', 'Agent handoff', 'Stopped'];
  if (normalized === 'dispatched' || normalized === 'running' || normalized === 'claimed') return ja
    ? ['注文受付', 'Agent処理中', '納品待ち']
    : ['Order accepted', 'Agent working', 'Waiting for delivery'];
  return ja
    ? ['注文受付', 'Agent接続中', '進捗確認中']
    : ['Order accepted', 'Connecting agent', 'Watching progress'];
}

export function workflowChildIsInternalLeaderSequenceRun(child = {}) {
  const phase = String(child?.sequencePhase || child?.sequence_phase || '').trim().toLowerCase();
  const task = String(child?.taskType || child?.workflowTask || child?.dispatchTaskType || child?.task_type || '').trim().toLowerCase();
  return ['checkpoint', 'final_summary'].includes(phase) && task.endsWith('_leader');
}

export function workflowChildIsAdaptivePending(child = {}) {
  return child?.adaptivePending === true
    || child?.adaptive_pending === true
    || String(child?.dispatchCompletionStatus || child?.dispatch_completion_status || child?.dispatch?.completionStatus || '').trim().toLowerCase() === 'leader_adaptive_pending';
}

export function visibleWorkflowChildRuns(childRuns = []) {
  return (Array.isArray(childRuns) ? childRuns : [])
    .filter((child) => !workflowChildIsInternalLeaderSequenceRun(child))
    .filter((child) => !workflowChildIsAdaptivePending(child));
}

export function orderProgressCounts(jobOrCreated = {}) {
  const workflow = jobOrCreated?.workflow && typeof jobOrCreated.workflow === 'object' ? jobOrCreated.workflow : null;
  const rawChildRuns = Array.isArray(jobOrCreated?.child_runs)
    ? jobOrCreated.child_runs
    : (Array.isArray(jobOrCreated?.childRuns)
      ? jobOrCreated.childRuns
      : (Array.isArray(workflow?.childRuns) ? workflow.childRuns : []));
  const childRuns = visibleWorkflowChildRuns(rawChildRuns);
  const counts = workflow?.agentStatusCounts || {};
  const total = Number(counts.total || childRuns.length || 0);
  const completed = Number(counts.completed || childRuns.filter((run) => String(run?.status || '').toLowerCase() === 'completed').length || 0);
  const failed = Number(counts.failed || childRuns.filter((run) => ['failed', 'timed_out'].includes(String(run?.status || '').toLowerCase())).length || 0);
  const blocked = Number(counts.blocked || childRuns.filter((run) => String(run?.status || '').toLowerCase() === 'blocked').length || 0);
  const approvalBlocked = childRuns.filter((run) => orderProgressChildBlockerType(run) === 'approval_required').length;
  const stoppedAfterFailure = childRuns.filter((run) => orderProgressChildBlockerType(run) === 'stopped_after_failure').length;
  const internalWaiting = childRuns.filter((run) => {
    const type = orderProgressChildBlockerType(run);
    return type === 'waiting_for_workflow_phase' || type === 'waiting_on_internal_workflow';
  }).length;
  const running = Number(counts.running || childRuns.filter((run) => ['running', 'claimed', 'dispatched'].includes(String(run?.status || '').toLowerCase())).length || 0);
  const queued = Number(counts.queued || childRuns.filter((run) => String(run?.status || '').toLowerCase() === 'queued').length || 0);
  return { total, completed, failed, blocked, approvalBlocked, stoppedAfterFailure, internalWaiting, running, queued };
}

export function orderProgressChildBlockerType(child = {}) {
  if (String(child?.status || '').trim().toLowerCase() !== 'blocked') return '';
  const explicit = String(child?.blockerType || child?.blocker_type || '').trim().toLowerCase();
  if (explicit) return explicit;
  const text = [
    child?.failureCategory,
    child?.failure_category,
    child?.failureReason,
    child?.failure_reason,
    child?.dispatchCompletionStatus,
    child?.dispatch_completion_status,
    child?.dispatch?.completionStatus,
    child?.dispatch?.completion_status,
    child?.summary
  ].map((item) => String(item || '').trim().toLowerCase()).join(' ');
  if (/blocked_waiting_for_approval|approval_required|connector|required|oauth|x\.post|google\.|github\.|承認|接続/.test(text)) return 'approval_required';
  if (/blocked_after_leader_failure|workflow_blocked|leader_failure|quality_gate_failed|failed/.test(text)) return 'stopped_after_failure';
  if (/leader_checkpoint_blocked|leader_final_summary_blocked|blocked until|waiting for earlier|waiting for the earlier/.test(text)) return 'waiting_for_workflow_phase';
  return 'waiting_on_internal_workflow';
}

export function workflowChildRunsFromJob(job = {}) {
  const report = job?.output?.report && typeof job.output.report === 'object' ? job.output.report : {};
  const runs = Array.isArray(report.childRuns)
    ? report.childRuns
    : (Array.isArray(job?.workflow?.childRuns) ? job.workflow.childRuns : []);
  return visibleWorkflowChildRuns(runs);
}

export function workflowPhaseRank(phase = '') {
  const normalized = String(phase || '').trim().toLowerCase();
  if (normalized === 'initial') return 1;
  if (normalized === 'research') return 2;
  if (normalized === 'checkpoint') return 3;
  if (normalized === 'action') return 4;
  if (normalized === 'final_summary') return 5;
  return 0;
}

export function workflowPhaseLabel(phase = '', options = {}) {
  const ja = Boolean(options.ja);
  const normalized = String(phase || '').trim().toLowerCase();
  if (normalized === 'initial') return ja ? 'leader planning' : 'leader planning';
  if (normalized === 'research') return ja ? 'research' : 'research';
  if (normalized === 'checkpoint') return ja ? 'leader checkpoint' : 'leader checkpoint';
  if (normalized === 'action') return ja ? 'execution' : 'execution';
  if (normalized === 'final_summary') return ja ? 'leader final summary' : 'leader final summary';
  return ja ? 'workflow' : 'workflow';
}

export function workflowPhaseShortLabel(phase = '', options = {}) {
  const ja = Boolean(options.ja);
  const normalized = String(phase || '').trim().toLowerCase();
  if (normalized === 'initial') return ja ? 'initial planning' : 'initial planning';
  if (normalized === 'checkpoint') return ja ? 'checkpoint' : 'checkpoint';
  if (normalized === 'final_summary') return ja ? 'final merge' : 'final merge';
  if (normalized === 'research') return ja ? 'research' : 'research';
  if (normalized === 'action') return ja ? 'execution' : 'execution';
  return '';
}

export function workflowChildDisplayName(child = {}, options = {}) {
  const task = String(child?.taskType || child?.task_type || '').trim();
  if (!task) return String(child?.agentName || child?.agentId || 'task').trim() || 'task';
  const phase = workflowPhaseShortLabel(child?.sequencePhase || child?.sequence_phase || '', options);
  const normalizedTask = task.toLowerCase();
  if (normalizedTask.endsWith('_leader')) {
    const label = task.split(/[_\s-]+/).filter(Boolean).map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`).join(' ');
    return phase ? `${label} - ${phase}` : label;
  }
  return task;
}

export function compactProgressLogLine(value = '', max = 160) {
  return compactChatText(
    String(value || '')
      .replace(/\s+/g, ' ')
      .replace(/^[a-z_]+:\s*/i, '')
      .trim(),
    max
  );
}

export function workflowTaskWorkingNote(taskType = '', phase = '', status = '', options = {}) {
  const task = String(taskType || '').trim().toLowerCase();
  const normalizedPhase = String(phase || '').trim().toLowerCase();
  const normalizedStatus = String(status || '').trim().toLowerCase();
  const running = ['running', 'claimed', 'dispatched'].includes(normalizedStatus);
  const queued = ['queued', 'created'].includes(normalizedStatus);
  const blocked = normalizedStatus === 'blocked';
  const prefix = blocked ? 'Waiting:' : queued ? 'Next:' : 'Thinking:';
  const phrases = {
    leader: {
      initial: queued ? 'frame the objective, evidence needs, and first specialist lane.' : 'framing the objective, evidence needs, and first specialist lane.',
      checkpoint: queued ? 'review specialist output and decide the next layer.' : 'reviewing specialist output and deciding the next layer.',
      final_summary: queued ? 'merge supporting work products into one accountable final report.' : 'merging supporting work products into one accountable final report.'
    },
    research: queued ? 'collect comparable market signals and evidence.' : 'collecting comparable market signals and evidence.',
    teardown: queued ? 'break down competitor positioning, offer, and funnel moves.' : 'breaking down competitor positioning, offer, and funnel moves.',
    data_analysis: queued ? 'translate evidence into metrics, segments, and decision points.' : 'translating evidence into metrics, segments, and decision points.',
    media_planner: queued ? 'turn findings into channel priorities, timing, and spend focus.' : 'turning findings into channel priorities, timing, and spend focus.',
    growth: queued ? 'turn the approved lane into concrete acquisition actions.' : 'turning the approved lane into concrete acquisition actions.',
    summary: queued ? 'compress the work into a reusable answer-first output.' : 'compressing the work into a reusable answer-first output.',
    x_post: queued ? 'convert the plan into a post/thread draft for X.' : 'converting the plan into a post/thread draft for X.',
    writing: queued ? 'turn the approved direction into publishable copy.' : 'turning the approved direction into publishable copy.',
    seo_specialist: queued ? 'prepare the SEO specialist analysis and content packet.' : 'preparing the SEO specialist analysis and content packet.',
    landing: queued ? 'shape the landing page structure and copy direction.' : 'shaping the landing page structure and copy direction.'
  };
  let body = '';
  if (task.endsWith('_leader')) {
    body = phrases.leader[normalizedPhase] || (queued ? 'review the workflow and decide the next best move.' : 'reviewing the workflow and deciding the next best move.');
  } else {
    body = phrases[task] || (queued ? 'prepare the next supporting work step.' : 'working through the assigned supporting work step.');
  }
  if (blocked) {
    body = 'waiting for the earlier workflow phase to finish.';
  }
  if (!running && !queued && !blocked) {
    body = 'updating status from the latest callback.';
  }
  return `${prefix} ${body}`;
}

export function workflowProgressDetails(job = {}, options = {}) {
  const ja = Boolean(options.ja);
  const childRuns = workflowChildRunsFromJob(job)
    .map((child) => ({
      ...child,
      taskType: String(child?.taskType || '').trim(),
      agentName: String(child?.agentName || child?.agentId || '').trim(),
      sequencePhase: String(child?.sequencePhase || '').trim().toLowerCase(),
      status: String(child?.status || '').trim().toLowerCase(),
      summary: compactChatText(String(child?.summary || child?.failureReason || '').trim(), 140),
      latestLog: compactProgressLogLine(child?.latestLog || '', 140)
    }))
    .sort((left, right) => {
      const phaseCompare = workflowPhaseRank(left.sequencePhase) - workflowPhaseRank(right.sequencePhase);
      if (phaseCompare) return phaseCompare;
      const statusCompare = String(left.status || '').localeCompare(String(right.status || ''));
      if (statusCompare) return statusCompare;
      return String(left.taskType || '').localeCompare(String(right.taskType || ''));
    });
  const active = childRuns.filter((child) => ['queued', 'created', 'claimed', 'running', 'dispatched'].includes(child.status));
  const blocked = childRuns.filter((child) => child.status === 'blocked');
  const recentLogs = (Array.isArray(job?.logs) ? job.logs : [])
    .map((line) => compactProgressLogLine(line))
    .filter(Boolean)
    .slice(-3);
  const lines = [];
  if (active.length) {
    const phase = workflowPhaseLabel(active[0]?.sequencePhase || '', { ja });
    lines.push(`Current phase: ${phase}`);
    active.slice(0, 4).forEach((child) => {
      const status = String(orderProgressStatusLabel(child.status || 'unknown', { ja })).toUpperCase();
      const detail = child.summary
        || child.latestLog
        || workflowTaskWorkingNote(child.taskType, child.sequencePhase, child.status, { ja });
      lines.push(`- ${workflowChildDisplayName(child, { ja })} (${status})${child.agentName ? ` - ${child.agentName}` : ''}: ${detail}`);
    });
  } else if (blocked.length) {
    const approvalCount = blocked.filter((child) => orderProgressChildBlockerType(child) === 'approval_required').length;
    const stoppedCount = blocked.filter((child) => orderProgressChildBlockerType(child) === 'stopped_after_failure').length;
    lines.push(approvalCount
      ? 'Current phase: waiting for approval or connector setup'
      : (stoppedCount
        ? 'Current phase: stopped after an earlier failure'
        : 'Current phase: waiting for next workflow handoff'));
    blocked.slice(0, 3).forEach((child) => {
      const blockerType = orderProgressChildBlockerType(child);
      const defaultDetail = blockerType === 'approval_required'
        ? (ja ? '外部実行の承認またはコネクター接続待ちです。' : 'waiting for approval or connector setup.')
        : (blockerType === 'stopped_after_failure'
          ? (ja ? '前段の失敗により停止しています。承認待ちではありません。' : 'stopped after an earlier failure; this is not an approval wait.')
          : workflowTaskWorkingNote(child.taskType, child.sequencePhase, child.status, { ja }));
      const detail = child.latestLog || child.summary || defaultDetail;
      lines.push(`- ${workflowChildDisplayName(child, { ja })} (${String(orderProgressStatusLabel(child.status || 'unknown', { ja })).toUpperCase()}): ${detail}`);
    });
  }
  if (recentLogs.length) {
    lines.push('');
    lines.push('Recent broker signals:');
    recentLogs.forEach((line) => {
      lines.push(`- ${line}`);
    });
  }
  return lines.filter(Boolean);
}

export function orderProgressChildDeliveryLines(job = {}, options = {}) {
  const ja = Boolean(options.ja);
  const childRuns = workflowChildRunsFromJob(job);
  if (!childRuns.length) return [];
  const lines = ['', ja ? '各エージェントの納品:' : 'Specialist deliveries:'];
  childRuns.forEach((child, index) => {
    const title = `${index + 1}. ${workflowChildDisplayName(child, { ja })} - ${child.agentName || child.agentId || 'agent'}`;
    const status = String(orderProgressStatusLabel(child.status || 'unknown', { ja })).toUpperCase();
    const summary = compactChatText(child.summary || child.failureReason || '', 220);
    const bullets = Array.isArray(child.bullets) ? child.bullets.filter(Boolean).slice(0, 3) : [];
    const files = Array.isArray(child.files) ? child.files.filter(Boolean).slice(0, 4) : [];
    lines.push(title);
    lines.push(ja ? `- 状態: ${status}` : `- Status: ${status}`);
    if (summary) lines.push(ja ? `- 要約: ${summary}` : `- Summary: ${summary}`);
    bullets.forEach((bullet) => {
      lines.push(ja ? `- 詳細: ${compactChatText(bullet, 180)}` : `- Detail: ${compactChatText(bullet, 180)}`);
    });
    if (files.length) lines.push(ja ? `- ファイル: ${files.join(', ')}` : `- Files: ${files.join(', ')}`);
  });
  return lines;
}

export function workflowChildDeliveryLabel(child = {}) {
  return compactChatText(
    String(workflowChildDisplayName(child) || child?.agentName || child?.agentId || 'Agent delivery').trim() || 'Agent delivery',
    80
  );
}

export function workflowChildDeliveryBody(child = {}, options = {}) {
  const ja = Boolean(options.ja);
  const status = normalizeOrderProgressStatus(child?.status || 'completed');
  const displayName = workflowChildDisplayName(child, { ja });
  const title = child?.taskType
    ? (ja ? `担当領域の納品: ${displayName}` : `Specialist delivery: ${displayName}`)
    : (ja ? '担当領域の納品' : 'Specialist delivery');
  const summary = compactChatText(child?.summary || child?.failureReason || '', 420);
  const bullets = Array.isArray(child?.bullets) ? child.bullets.filter(Boolean).slice(0, 5) : [];
  const files = Array.isArray(child?.files) ? child.files.filter(Boolean).slice(0, 8) : [];
  const nextAction = compactChatText(child?.nextAction || '', 220);
  return [
    title,
    '',
    ja ? `状態: ${String(status).toUpperCase()}` : `Status: ${String(status).toUpperCase()}`,
    summary ? (ja ? `要約: ${summary}` : `Summary: ${summary}`) : '',
    ...bullets.map((bullet) => `- ${compactChatText(bullet, 220)}`),
    nextAction ? (ja ? `次の対応: ${nextAction}` : `Next action: ${nextAction}`) : '',
    files.length ? (ja ? `ファイル: ${files.join(', ')}` : `Files: ${files.join(', ')}`) : ''
  ].filter(Boolean).join('\n');
}

export function jobDeliveryFileLines(job = {}, options = {}) {
  const ja = Boolean(options.ja);
  const files = visibleDeliveryFiles(job?.output?.files);
  const names = files
    .map((file) => String(file?.name || '').trim())
    .filter(Boolean)
    .slice(0, 8);
  if (!names.length) return [];
  return [ja ? `ファイル: ${names.join(', ')}` : `Files: ${names.join(', ')}`];
}

export function isInternalDeliveryFile(file = {}) {
  const name = String(file?.name || file?.filename || file || '').trim().toLowerCase();
  const content = String(file?.content || file?.body || '').trim();
  const contentType = String(file?.content_type || file?.contentType || '').trim().toLowerCase();
  const visibility = String(file?.visibility || file?.delivery_visibility || file?.deliveryVisibility || '').trim().toLowerCase();
  if (file && typeof file === 'object') {
    if (file.internal === true || file.user_visible === false || file.userVisible === false || file.delivery_visible === false || file.deliveryVisible === false) return true;
  }
  if (['internal', 'hidden', 'system'].includes(visibility)) return true;
  if ([
    'supporting_specialist_deliverables',
    'workflow_integrated_delivery',
    'partial_workflow_delivery',
    'all_deliverables_bundle',
    'review_ready_delivery'
  ].includes(contentType)) return true;
  if (name === 'supporting-specialist-deliverables.md') return true;
  if (name === 'integrated-delivery.md' && /#\s+Integrated delivery|##\s+Supporting work products|##\s+Integrated next actions/i.test(content)) return true;
  if (name === 'workflow-partial-delivery.md') return true;
  if (name === 'all-deliverables.md' || /^all-deliverables-[^.]+\.md$/i.test(name)) return true;
  if (name === 'review-ready-delivery.md' || /^review-ready-delivery-[^.]+\.md$/i.test(name)) return true;
  return false;
}

export function visibleDeliveryFiles(files = []) {
  return (Array.isArray(files) ? files : []).filter((file) => file && !isInternalDeliveryFile(file));
}

export function deliveryFileNames(files = [], limit = 8) {
  return visibleDeliveryFiles(files)
    .map((file) => String(file?.name || file || '').trim())
    .filter(Boolean)
    .slice(0, limit);
}

export function downloadableDeliveryFilesForJob(job = {}) {
  return visibleDeliveryFiles(job?.output?.files)
    .filter((file) => String(file?.content || '').trim());
}

export function buildWorkflowChildDeliveryCard(child = {}, options = {}) {
  const ja = Boolean(options.ja);
  const files = deliveryFileNames(child?.files, 8);
  return {
    kind: 'specialist',
    title: ja ? '子エージェント納品' : 'Specialist delivery',
    responsibility: ja ? '担当領域の責任' : 'Area responsibility',
    taskType: compactChatText(child?.taskType || '', 80),
    summary: compactChatText(child?.summary || child?.failureReason || '', 420),
    files
  };
}
