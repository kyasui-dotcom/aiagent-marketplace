function agentTeamDigestClip(value = '', max = 220) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text || text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1)).trim()}...`;
}

function agentTeamUserFacingWorkLabel(taskType = '') {
  const task = String(taskType || '').trim().toLowerCase();
  if (/data|analytics/.test(task)) return 'データ確認';
  if (/research|teardown|validation/.test(task)) return '調査';
  if (/media|channel|planner/.test(task)) return 'チャネル計画';
  if (/growth/.test(task)) return '成長施策';
  if (/seo/.test(task)) return 'SEO改善';
  if (/writing|writer|landing|copy/.test(task)) return 'コピー/ページ改善';
  if (/reddit|indie|instagram|x_post|social/.test(task)) return '投稿案';
  if (/list|lead|email|outreach/.test(task)) return 'リスト/営業準備';
  if (/leader|summary/.test(task)) return '統合方針';
  return '補助納品';
}

function agentTeamFinalDigestBullets(childSummaries = [], limit = 6) {
  return (Array.isArray(childSummaries) ? childSummaries : [])
    .filter((item) => item && item.taskType)
    .slice(0, limit)
    .map((item) => {
      const label = agentTeamUserFacingWorkLabel(item.taskType || item.dispatchTaskType || '');
      const summary = item.summary || item.failureReason || item.dispatchCompletionStatus || item.status || 'No summary returned yet.';
      return `${agentTeamDigestClip(label, 80)}の要点: ${agentTeamDigestClip(summary, 260)}`;
    });
}

function agentTeamDeliveryProvenanceMap(files = []) {
  return (Array.isArray(files) ? files : [])
    .filter((file) => file && typeof file === 'object')
    .map((file) => ({
      file: String(file.name || '').trim(),
      displayTitle: String(file.display_title || file.displayTitle || file.name || '').trim(),
      agentName: String(file.source_agent_name || file.sourceAgentName || '').trim(),
      agentId: String(file.source_agent_id || file.sourceAgentId || '').trim(),
      taskType: String(file.source_task_type || file.sourceTaskType || '').trim(),
      phase: String(file.source_phase || file.sourcePhase || '').trim(),
      status: String(file.source_status || file.sourceStatus || '').trim(),
      runId: String(file.source_run_id || file.sourceRunId || '').trim(),
      summary: String(file.source_summary || file.sourceSummary || '').trim()
    }))
    .filter((item) => item.file || item.agentName || item.taskType || item.runId);
}

function agentTeamSpecialistOutputLedger(childSummaries = [], rawFiles = [], attachedFiles = []) {
  const filesByRun = new Map();
  const attachedByRun = new Map();
  const addFile = (map, file) => {
    const runId = String(file?.source_run_id || file?.sourceRunId || '').trim();
    if (!runId) return;
    const list = map.get(runId) || [];
    list.push(file);
    map.set(runId, list);
  };
  for (const file of Array.isArray(rawFiles) ? rawFiles : []) addFile(filesByRun, file);
  for (const file of Array.isArray(attachedFiles) ? attachedFiles : []) addFile(attachedByRun, file);
  return (Array.isArray(childSummaries) ? childSummaries : [])
    .filter((item) => item && (item.id || item.taskType || item.agentName))
    .map((item) => {
      const runId = String(item.id || '').trim();
      const rawRunFiles = filesByRun.get(runId) || [];
      const attachedRunFiles = attachedByRun.get(runId) || [];
      const returnedFileNames = [...new Set([
        ...(Array.isArray(item.files) ? item.files : []),
        ...rawRunFiles.map((file) => file?.name)
      ].map((name) => String(name || '').trim()).filter(Boolean))];
      const attachedFileNames = [...new Set(attachedRunFiles
        .map((file) => String(file?.name || '').trim())
        .filter(Boolean))];
      const rawFileNames = [...new Set(rawRunFiles
        .map((file) => String(file?.name || '').trim())
        .filter(Boolean))];
      const status = String(item.status || '').trim();
      const completed = status.toLowerCase() === 'completed';
      const artifactState = attachedFileNames.length
        ? 'attached_to_delivery'
        : (rawFileNames.length
          ? 'available_in_child_run'
          : (returnedFileNames.length
            ? 'returned_non_user_visible_file'
            : (completed ? 'completed_without_file' : 'not_completed')));
      return {
        runId,
        agentName: String(item.agentName || '').trim(),
        taskType: String(item.taskType || '').trim(),
        dispatchTaskType: String(item.dispatchTaskType || '').trim(),
        phase: String(item.sequencePhase || '').trim(),
        status,
        summary: String(item.summary || item.failureReason || item.dispatchCompletionStatus || '').trim(),
        nextAction: String(item.nextAction || '').trim(),
        returnedFileCount: returnedFileNames.length,
        returnedFiles: returnedFileNames,
        rawUserVisibleFileCount: rawFileNames.length,
        rawUserVisibleFiles: rawFileNames,
        attachedDeliveryFileCount: attachedFileNames.length,
        attachedDeliveryFiles: attachedFileNames,
        hasUserFacingArtifact: rawFileNames.length > 0,
        hasAttachedDeliveryArtifact: attachedFileNames.length > 0,
        artifactState,
        failureReason: item.failureReason || null,
        blockerType: item.blockerType || null
      };
    });
}

function buildAgentTeamFinalDigestMarkdown(options = {}) {
  const {
    objective = '',
    childSummaries = [],
    executionCandidateFile = null,
    authorityBlocked = false,
    authorityLabel = '',
    authorityRequest = null,
    failed = [],
    stoppedAfterFailure = [],
    internalWaiting = []
  } = options;
  const lines = [
    '## 先に結論',
    objective ? `- 依頼内容: ${agentTeamDigestClip(objective, 360)}` : '',
    executionCandidateFile
      ? `- 次に使える納品物: ${agentTeamDigestClip(executionCandidateFile.title || executionCandidateFile.name || 'ready artifact', 240)}`
      : '- 次に使える納品物: まだ選定されていません。',
    authorityBlocked
      ? `- 実行前の確認: ${agentTeamDigestClip(authorityLabel || 'external action approval', 240)}`
      : (executionCandidateFile
        ? '- 実行前の確認: 具体的な納品物を確認してから、投稿・送信・公開・適用を承認してください。'
        : '- 実行前の確認: まず具体的な実行物を作成してください。計画は実行完了ではありません。'),
    authorityRequest?.reason ? `- 確認理由: ${agentTeamDigestClip(authorityRequest.reason, 320)}` : '',
    failed.length || stoppedAfterFailure.length
      ? `- 確認が必要な失敗: ${agentTeamDigestClip([...failed, ...stoppedAfterFailure].map((item) => `${agentTeamUserFacingWorkLabel(item.taskType)}: ${item.failureReason || item.status}`).join('; '), 420)}`
      : '',
    internalWaiting.length
      ? `- 待機中の工程: ${agentTeamDigestClip(internalWaiting.map((item) => `${agentTeamUserFacingWorkLabel(item.taskType)}: ${item.failureReason || 'waiting'}`).join('; '), 420)}`
      : '',
    '',
    '## 受け取った納品物の要点'
  ].filter(Boolean);
  if (!Array.isArray(childSummaries) || !childSummaries.length) {
    lines.push('- まだ利用できる納品物はありません。');
  } else {
    for (const item of childSummaries.slice(0, 16)) {
      const label = agentTeamUserFacingWorkLabel(item.taskType || item.dispatchTaskType || '');
      const summary = agentTeamDigestClip(item.summary || item.failureReason || 'No summary returned yet.', 320);
      const detail = Array.isArray(item.bullets) && item.bullets.length
        ? ` 重要点: ${agentTeamDigestClip(item.bullets.slice(0, 2).join(' / '), 320)}`
        : '';
      const next = item.nextAction ? ` 次: ${agentTeamDigestClip(item.nextAction, 280)}` : '';
      const files = Array.isArray(item.files) && item.files.length ? ` 参照ファイル: ${item.files.join(', ')}` : '';
      lines.push(`- ${label}: ${summary}${detail}${next}${files}`);
    }
  }
  lines.push(
    '',
    '## 実行に進む前に',
    authorityBlocked
      ? `- 次: ${agentTeamDigestClip(authorityLabel || 'the required connector', 200)} を承認または接続してから、待機中の実行だけを再開してください。`
      : (executionCandidateFile
        ? '- 次: 上記の具体的な納品物を承認してから外部実行してください。実行証跡が返るまでは完了扱いではありません。'
        : '- 次: 最終推奨を1つ選び、外部実行承認の前に具体的な実行物へ落とし込んでください。')
  );
  return lines.join('\n').trim();
}

export {
  agentTeamUserFacingWorkLabel,
  agentTeamFinalDigestBullets,
  agentTeamDeliveryProvenanceMap,
  agentTeamSpecialistOutputLedger,
  buildAgentTeamFinalDigestMarkdown
};
