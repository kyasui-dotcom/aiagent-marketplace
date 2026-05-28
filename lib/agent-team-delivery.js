import {
  agentTeamAuthorityRequestFromChildren,
  agentTeamAuthorityRequestFromJob,
  agentTeamAuthorityRequestLabel,
  agentTeamAuthorityRequestRequiresApproval,
  agentTeamChildSummary,
  agentTeamExecutionCandidateFile,
  agentTeamExecutionCandidateJob,
  agentTeamFinalVisibleDeliveryFiles,
  agentTeamLeaderExecutionCandidateFile,
  agentTeamLeaderPhaseRank,
  agentTeamWorkflowPhase,
  buildAgentTeamRawChildDeliveryFiles,
  isAgentTeamLeaderTask,
  uniqueAgentTeamDeliveryFiles
} from './agent-team-delivery-core.js';
import {
  agentTeamDeliveryProvenanceMap,
  agentTeamFinalDigestBullets,
  agentTeamSpecialistOutputLedger,
  agentTeamUserFacingWorkLabel,
  buildAgentTeamFinalDigestMarkdown
} from './agent-team-delivery-digest.js';

export function buildAgentTeamDeliveryOutput(parent = {}, children = []) {
  const expectedTotal = Math.max(
    children.length,
    Array.isArray(parent.workflow?.childRuns) ? parent.workflow.childRuns.length : 0
  );
  const childSummaries = children.map(agentTeamChildSummary);
  const completed = childSummaries.filter((item) => item.status === 'completed');
  const failed = childSummaries.filter((item) => item.status === 'failed' || item.status === 'timed_out');
  const blocked = childSummaries.filter((item) => item.status === 'blocked');
  const parentFailed = ['failed', 'timed_out'].includes(String(parent.status || '').trim().toLowerCase());
  const approvalBlocked = parentFailed ? [] : blocked.filter((item) => item.blockerType === 'approval_required');
  const stoppedAfterFailure = blocked.filter((item) => item.blockerType === 'stopped_after_failure' || parentFailed);
  const internalWaiting = blocked.filter((item) => item.blockerType !== 'approval_required' && !stoppedAfterFailure.includes(item));
  const sortedLeaderJobs = children
    .filter((item) => item.status === 'completed')
    .filter((item) => isAgentTeamLeaderTask(item.workflowTask || item.taskType || '') || /team leader/i.test(String(item.workflowAgentName || item.agentName || '')))
    .sort((left, right) => {
      const phaseCompare = agentTeamLeaderPhaseRank(right) - agentTeamLeaderPhaseRank(left);
      if (phaseCompare) return phaseCompare;
      const completedCompare = String(right.completedAt || '').localeCompare(String(left.completedAt || ''));
      if (completedCompare) return completedCompare;
      return String(right.createdAt || '').localeCompare(String(left.createdAt || ''));
    });
  const requiresFinalSummary = Boolean(parent.workflow?.leaderSequence?.enabled && parent.workflow?.leaderSequence?.finalSummaryJobId);
  const leaderJob = (requiresFinalSummary
    ? sortedLeaderJobs.find((item) => agentTeamWorkflowPhase(item) === 'final_summary')
    : sortedLeaderJobs[0]) || null;
  const leader = leaderJob ? agentTeamChildSummary(leaderJob) : null;
  const objective = String(parent.workflow?.objective || parent.originalPrompt || parent.prompt || '').trim() || 'Agent Team objective';
  const completedLine = [
    `${completed.length}/${expectedTotal}件の納品工程が完了`,
    approvalBlocked.length ? `${approvalBlocked.length} waiting for approval/connector` : '',
    internalWaiting.length ? `${internalWaiting.length} waiting on workflow phase` : '',
    stoppedAfterFailure.length ? `${stoppedAfterFailure.length} stopped after failure` : '',
    failed.length ? `${failed.length} failed` : ''
  ].filter(Boolean).join(', ') + '.';
  const rawChildDeliveryFiles = buildAgentTeamRawChildDeliveryFiles(children);
  const pendingAuthorityRequest = parentFailed ? null : agentTeamAuthorityRequestFromChildren(children);
  const pendingAuthorityBlocked = agentTeamAuthorityRequestRequiresApproval(pendingAuthorityRequest);
  const pendingAuthorityLabel = pendingAuthorityBlocked ? agentTeamAuthorityRequestLabel(pendingAuthorityRequest) : '';
  const bullets = [
    leader
      ? `統合サマリが利用できます。`
      : (completed.length
        ? '完了した納品ファイルを添付しています。'
        : '納品ファイルはまだ完了していません。'),
    ...(pendingAuthorityBlocked ? [`External action is waiting for approval/connector setup: ${pendingAuthorityLabel}.`] : []),
    `完了した作業: ${completed.map((item) => agentTeamUserFacingWorkLabel(item.taskType)).filter(Boolean).join('、') || 'まだありません'}。`,
    internalWaiting.length ? `待機中の工程: ${internalWaiting.map((item) => `${agentTeamUserFacingWorkLabel(item.taskType)}: ${item.failureReason || 'waiting'}`).join('; ')}` : '',
    stoppedAfterFailure.length ? `失敗後に停止: ${stoppedAfterFailure.map((item) => `${agentTeamUserFacingWorkLabel(item.taskType)}: ${item.failureReason || 'blocked after an earlier failure'}`).join('; ')}` : '',
    failed.length ? `確認が必要: ${failed.map((item) => `${agentTeamUserFacingWorkLabel(item.taskType)}: ${item.failureReason || item.status}`).join('; ')}` : '失敗した補助作業は記録されていません。'
  ].filter(Boolean);
  const integratedStep2 = pendingAuthorityBlocked
    ? `2. Resolve the approval/connector request before treating this as executed: ${pendingAuthorityLabel}.`
    : ((failed.length || stoppedAfterFailure.length)
      ? '2. Inspect or retry the failed/timeout run before treating the workflow as usable.'
      : '2. 必要に応じて、調査・文案・実行用の添付納品ファイルを確認してください。');
  const integratedStep3 = pendingAuthorityBlocked
    ? '3. After approval, resume only the waiting external action lane.'
    : (internalWaiting.length
      ? '3. Wait for or resume the earlier workflow phase that is blocking dependent runs.'
      : ((failed.length || stoppedAfterFailure.length)
        ? '3. Do not approve an external action; this state is an execution failure, not an approval gate.'
        : '3. 失敗または不足している納品工程があれば、最終扱いにする前に解消してください。'));
  const fallbackDigest = buildAgentTeamFinalDigestMarkdown({
    objective,
    childSummaries,
    authorityBlocked: pendingAuthorityBlocked,
    authorityLabel: pendingAuthorityLabel,
    authorityRequest: pendingAuthorityRequest,
    failed,
    stoppedAfterFailure,
    internalWaiting
  });
  const markdown = [
    '# 統合納品',
    '',
    fallbackDigest,
    '',
    '---',
    '',
    '## 依頼内容',
    objective,
    '',
    '## 状態',
    completedLine,
    '',
    '## 統合状況',
    leader
      ? `- 統合サマリ: ${leader.summary || '完了しています。'}`
      : '- 統合サマリはまだ完了していません。',
    '',
    '## 添付された納品物',
    ...(childSummaries.length ? childSummaries.map((item, index) => {
      const lines = [
        `### ${index + 1}. ${agentTeamUserFacingWorkLabel(item.taskType)}`,
        `- 状態: ${item.status}`,
        `- 要点: ${item.summary || item.failureReason || 'No summary returned yet.'}`
      ];
      for (const bullet of item.bullets) lines.push(`- 詳細: ${bullet}`);
      if (item.nextAction) lines.push(`- 次のアクション: ${item.nextAction}`);
      if (item.files.length) lines.push(`- 参照ファイル: ${item.files.join(', ')}`);
      return lines.join('\n');
    }) : ['まだ納品物はありません。']),
    '',
    ...(pendingAuthorityBlocked ? [
      '## Approval request',
      `- Status: waiting for approval or connector setup`,
      `- Required: ${pendingAuthorityLabel}`,
      `- Reason: ${pendingAuthorityRequest?.reason || pendingAuthorityRequest?.message || 'External action requires approval before execution.'}`,
      `- Next: connect the required account, review the exact action artifact, then approve/resume the external action.`
    ] : []),
    ...(!pendingAuthorityBlocked && (internalWaiting.length || stoppedAfterFailure.length) ? [
      '## Waiting state',
      internalWaiting.length ? `- Internal workflow wait: ${internalWaiting.length} item(s) are waiting for an earlier leader/workflow phase, not user approval.` : '',
      stoppedAfterFailure.length ? `- Stopped after failure: ${stoppedAfterFailure.length} item(s) were blocked because an earlier required run failed.` : '',
      failed.length ? `- Root failure: ${failed.map((item) => `${item.taskType || item.id}: ${item.failureReason || item.status}`).join('; ')}` : '',
      '- Next: inspect or retry the failed/timeout run; no connector approval is required for this state unless an explicit approval request is shown.'
    ].filter(Boolean) : []),
    '',
    '## 次のアクション',
    '1. まず統合された納品内容を確認してください。',
    integratedStep2,
    integratedStep3,
    '4. 共通の目的を維持し、チャネルごとにトーン・根拠・形式を調整してください。'
  ].join('\n');
  if (leaderJob && leaderJob.output && typeof leaderJob.output === 'object') {
    const leaderOutput = leaderJob.output;
    const leaderReport = leaderOutput.report && typeof leaderOutput.report === 'object' ? leaderOutput.report : {};
    const executionCandidate = agentTeamExecutionCandidateJob(children);
    const specialistExecutionCandidateFile = agentTeamExecutionCandidateFile(executionCandidate);
    const leaderCandidateFile = agentTeamLeaderExecutionCandidateFile(leaderJob, leaderOutput, leaderReport);
    const preferFinalLeaderDelivery = agentTeamWorkflowPhase(leaderJob) === 'final_summary'
      && leaderCandidateFile;
    const leaderExecutionCandidateFile = preferFinalLeaderDelivery
      ? leaderCandidateFile
      : (specialistExecutionCandidateFile || leaderCandidateFile);
    const authorityRequest = leaderReport.authority_request
      || leaderReport.authorityRequest
      || pendingAuthorityRequest
      || agentTeamAuthorityRequestFromJob(executionCandidate?.job)
      || null;
    const authorityBlocked = agentTeamAuthorityRequestRequiresApproval(authorityRequest);
    const authorityLabel = authorityBlocked ? agentTeamAuthorityRequestLabel(authorityRequest) : '';
    const finalDigest = buildAgentTeamFinalDigestMarkdown({
      objective,
      childSummaries,
      executionCandidateFile: leaderExecutionCandidateFile,
      authorityBlocked,
      authorityLabel,
      authorityRequest,
      failed,
      stoppedAfterFailure,
      internalWaiting
    });
    const {
      authority_request: _leaderAuthorityRequest,
      authorityRequest: _leaderAuthorityRequestCamel,
      action_required: _leaderActionRequired,
      actionRequired: _leaderActionRequiredCamel,
      executor_request: _leaderExecutorRequest,
      executorRequest: _leaderExecutorRequestCamel,
      ...leaderReportForMerge
    } = leaderReport;
    const mergedBullets = [
      `納品状態: ${completedLine}`,
      ...(authorityBlocked ? [`External action is waiting for approval/connector setup: ${authorityLabel}.`] : []),
      ...(!authorityBlocked && internalWaiting.length ? [`Internal workflow waits: ${internalWaiting.length} item(s) are waiting for an earlier workflow phase, not user approval.`] : []),
      ...(!authorityBlocked && stoppedAfterFailure.length ? [`Stopped after failure: ${stoppedAfterFailure.length} item(s) were blocked after an earlier failure.`] : []),
      ...agentTeamFinalDigestBullets(childSummaries, 5),
      ...(
        Array.isArray(leaderReport.bullets)
          ? leaderReport.bullets.map((item) => String(item || '').trim()).filter(Boolean)
          : []
      )
    ].slice(0, 10);
    const mergedFiles = agentTeamFinalVisibleDeliveryFiles(rawChildDeliveryFiles);
    const deliveryProvenanceMap = agentTeamDeliveryProvenanceMap(mergedFiles);
    const specialistOutputLedger = agentTeamSpecialistOutputLedger(childSummaries, rawChildDeliveryFiles, mergedFiles);
    return {
      ...leaderOutput,
      summary: String(leaderOutput.summary || leaderReport.summary || `統合納品: ${completedLine}`).trim(),
      report: {
        ...leaderReportForMerge,
        summary: String(leaderReport.summary || leaderOutput.summary || '統合納品').trim(),
        bullets: mergedBullets,
        nextAction: String(
          authorityBlocked
            ? `Connect and approve the required external action (${authorityLabel}) before treating this order as executed.`
            : (leaderReport.nextAction
              || leaderReport.next_action
              || (failed.length
                ? `Inspect failed supporting work items in the attached child run table before executing the plan.${stoppedAfterFailure.length ? ' This is not an approval wait.' : ''}`
                : (stoppedAfterFailure.length
                  ? 'Inspect or retry the earlier failed run before using this workflow; this is not an approval wait.'
                  : 'Use this leader summary as the accountable final delivery, then execute or approve the listed next actions.')))
        ).trim(),
        ...(authorityBlocked ? { authority_request: authorityRequest } : {}),
        ...(authorityBlocked ? { completion_state: 'blocked_waiting_for_approval', blocked_reason: `Waiting for ${authorityLabel}.` } : {}),
      childRuns: childSummaries,
      specialist_output_ledger: specialistOutputLedger,
      specialistOutputLedger,
      delivery_provenance_map: deliveryProvenanceMap,
      deliveryProvenanceMap,
      final_delivery_digest: finalDigest,
      leaderPhase: agentTeamWorkflowPhase(leaderJob) || 'initial',
        execution_candidate: leaderExecutionCandidateFile
          ? {
              type: leaderExecutionCandidateFile.content_type,
              source_task_type: leaderExecutionCandidateFile.source_task_type,
              title: leaderExecutionCandidateFile.title,
              reason: leaderExecutionCandidateFile.reason,
              draft_defaults: leaderExecutionCandidateFile.draft_defaults
            }
          : undefined
      },
      files: mergedFiles,
      child_runs: childSummaries
    };
  }
  const fallbackFiles = uniqueAgentTeamDeliveryFiles(rawChildDeliveryFiles);
  const fallbackDeliveryProvenanceMap = agentTeamDeliveryProvenanceMap(fallbackFiles);
  const fallbackSpecialistOutputLedger = agentTeamSpecialistOutputLedger(childSummaries, rawChildDeliveryFiles, fallbackFiles);
  return {
    summary: `統合納品: ${completedLine}`,
    report: {
      summary: '統合納品',
      bullets: [
        ...agentTeamFinalDigestBullets(childSummaries, 5),
        ...bullets
      ].slice(0, 10),
      nextAction: failed.length
        ? `失敗した補助作業を再試行または確認してから、統合納品を使用してください。${stoppedAfterFailure.length ? 'これは承認待ちではありません。' : ''}`
        : (stoppedAfterFailure.length
          ? 'Inspect or retry the earlier failed run before using this workflow; this is not an approval wait.'
        : (pendingAuthorityBlocked
          ? `Connect and approve the required external action (${pendingAuthorityLabel}) before treating this order as executed.`
          : '添付された納品内容を確認し、次の具体的なアクションを選んでください。')),
      ...(pendingAuthorityBlocked ? { authority_request: pendingAuthorityRequest } : {}),
      ...(pendingAuthorityBlocked ? { completion_state: 'blocked_waiting_for_approval', blocked_reason: `Waiting for ${pendingAuthorityLabel}.` } : {}),
      final_delivery_digest: fallbackDigest,
      delivery_provenance_map: fallbackDeliveryProvenanceMap,
      deliveryProvenanceMap: fallbackDeliveryProvenanceMap,
      specialist_output_ledger: fallbackSpecialistOutputLedger,
      specialistOutputLedger: fallbackSpecialistOutputLedger,
      childRuns: childSummaries
    },
    files: fallbackFiles,
    child_runs: childSummaries
  };
}
