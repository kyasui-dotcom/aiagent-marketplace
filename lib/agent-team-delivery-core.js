function agentTeamChildSummary(job = {}) {
  const output = job?.output && typeof job.output === 'object' ? job.output : {};
  const report = output.report && typeof output.report === 'object' ? output.report : {};
  const summary = String(output.summary || report.summary || output.message || job.failureReason || '').trim();
  const bullets = Array.isArray(report.bullets)
    ? report.bullets.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 4)
    : [];
  const nextAction = String(report.nextAction || report.next_action || '').trim();
  const files = Array.isArray(output.files)
    ? output.files.map((file) => String(file?.name || '').trim()).filter(Boolean).slice(0, 4)
    : [];
  const status = String(job.status || '').trim();
  const failureCategory = String(job.failureCategory || job.failure_category || '').trim();
  const failureReason = String(job.failureReason || job.failure_reason || '').trim();
  const dispatch = job.dispatch && typeof job.dispatch === 'object' ? job.dispatch : {};
  const completionStatus = String(dispatch.completionStatus || dispatch.completion_status || '').trim();
  const authorityRequest = agentTeamAuthorityRequestFromJob(job);
  let blockerType = '';
  if (status.toLowerCase() === 'blocked') {
    const blockerText = `${failureCategory} ${failureReason} ${completionStatus}`.toLowerCase();
    if (
      failureCategory === 'blocked_waiting_for_approval'
      || completionStatus === 'blocked_waiting_for_approval'
      || agentTeamAuthorityRequestRequiresApproval(authorityRequest)
    ) {
      blockerType = 'approval_required';
    } else if (/blocked_after_leader_failure|workflow_blocked|leader_failure|quality_gate_failed/.test(blockerText)) {
      blockerType = 'stopped_after_failure';
    } else if (/leader_checkpoint_blocked|leader_final_summary_blocked|blocked until|waiting for earlier|waiting for the earlier/.test(blockerText)) {
      blockerType = 'waiting_for_workflow_phase';
    } else {
      blockerType = 'waiting_on_internal_workflow';
    }
  }
  return {
    id: job.id,
    taskType: job.workflowTask || job.taskType || '',
    dispatchTaskType: job.taskType || '',
    agentId: job.assignedAgentId || null,
    agentName: job.workflowAgentName || null,
    sequencePhase: agentTeamWorkflowPhase(job) || '',
    status,
    summary,
    bullets,
    nextAction,
    files,
    failureReason: failureReason || null,
    failureCategory: failureCategory || null,
    dispatchCompletionStatus: completionStatus || null,
    blockerType: blockerType || null
  };
}

function agentTeamDeliveryFileKey(file = {}) {
  return [
    String(file?.name || '').trim().toLowerCase(),
    String(file?.content || '').trim().slice(0, 6000)
  ].join('\n---\n');
}

function uniqueAgentTeamDeliveryFiles(files = []) {
  const seen = new Set();
  const result = [];
  for (const file of Array.isArray(files) ? files : []) {
    if (!file || typeof file !== 'object') continue;
    const name = String(file.name || '').trim();
    const content = String(file.content || '').trim();
    if (!name && !content) continue;
    const key = agentTeamDeliveryFileKey(file);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(file);
  }
  return result;
}

function agentTeamFileListValues(value = []) {
  if (Array.isArray(value)) return value.map((item) => String(item || '').trim()).filter(Boolean);
  if (typeof value === 'string') return value.split(/[,\s]+/).map((item) => item.trim()).filter(Boolean);
  return [];
}

function agentTeamFileExplicitArtifactTypes(file = {}) {
  return [
    file?.content_type,
    file?.contentType,
    file?.artifact_type,
    file?.artifactType,
    file?.handoff_artifact_type,
    file?.handoffArtifactType,
    file?.item_type,
    file?.itemType,
    file?.action_type,
    file?.actionType,
    ...agentTeamFileListValues(file?.artifact_types || file?.artifactTypes || file?.handoff_artifact_types || file?.handoffArtifactTypes)
  ].map((item) => String(item || '').trim().toLowerCase()).filter(Boolean);
}

function agentTeamFileIsExplicitAppReviewPacket(file = {}) {
  const surface = String(file?.surface || file?.target_surface || file?.targetSurface || '').trim().toLowerCase();
  if (['publisher', 'lead', 'analytics', 'campaign'].includes(surface)) return true;
  const text = [
    ...agentTeamFileExplicitArtifactTypes(file),
    file?.channel,
    file?.connector,
    file?.connector_capability,
    file?.connectorCapability,
    file?.destination
  ].join(' ').toLowerCase();
  if (!text || /^(?:agent_delivery|agent_raw_delivery|reused_agent_delivery|report_bundle|text_markdown|text\/markdown)$/.test(text)) return false;
  return /(publisher|approval|site_publish|wordpress|directory|x_post|reddit_post|indie_hackers|instagram_post|social_copy|lead_rows|lead_list|email_draft|campaign_operations_plan|_packet\b)/.test(text);
}

function agentTeamFileIsFinalLeaderDelivery(file = {}) {
  return agentTeamWorkflowPhase({ input: { _broker: { workflow: { sequencePhase: file?.source_phase || file?.sourcePhase || '' } } } }) === 'final_summary'
    && isAgentTeamLeaderTask(file?.source_task_type || file?.sourceTaskType || '');
}

function agentTeamFinalVisibleDeliveryFiles(files = []) {
  const visible = [];
  for (const file of Array.isArray(files) ? files : []) {
    if (!file || typeof file !== 'object') continue;
    if (agentTeamFileIsFinalLeaderDelivery(file) || agentTeamFileIsExplicitAppReviewPacket(file)) {
      visible.push({
        ...file,
        supporting_delivery_hidden: agentTeamFileIsFinalLeaderDelivery(file) ? undefined : false
      });
    }
  }
  return uniqueAgentTeamDeliveryFiles(visible);
}

function agentTeamFileIsInternal(file = {}) {
  const name = String(file?.name || file?.filename || '').trim().toLowerCase();
  const contentType = String(file?.content_type || file?.contentType || '').trim().toLowerCase();
  const visibility = String(file?.visibility || file?.delivery_visibility || file?.deliveryVisibility || '').trim().toLowerCase();
  if (file?.internal === true || file?.user_visible === false || file?.userVisible === false || file?.delivery_visible === false || file?.deliveryVisible === false) return true;
  if (['internal', 'hidden', 'system'].includes(visibility)) return true;
  if ([
    'supporting_specialist_deliverables',
    'workflow_integrated_delivery',
    'partial_workflow_delivery',
    'all_deliverables_bundle',
    'review_ready_delivery'
  ].includes(contentType)) return true;
  if (name === 'supporting-specialist-deliverables.md') return true;
  if (name === 'integrated-delivery.md') return true;
  if (name === 'workflow-partial-delivery.md') return true;
  if (name === 'all-deliverables.md' || /^all-deliverables-[^.]+\.md$/i.test(name)) return true;
  if (name === 'review-ready-delivery.md' || /^review-ready-delivery-[^.]+\.md$/i.test(name)) return true;
  return false;
}

const AGENT_TEAM_INTERNAL_DELIVERY_MARKERS = [
  '=== workflow handoff context ===',
  '=== workflow additional prompt ===',
  '=== end workflow handoff context ===',
  'canonical user brief',
  'process program',
  'structured handoff digest',
  'prior specialist deliverables',
  'prior specialist deliverable:',
  'required output behavior:'
];

const AGENT_TEAM_INTERNAL_DELIVERY_SECTION_TITLES = new Set([
  'request',
  'workflow handoff context',
  'workflow additional prompt',
  'agent-owned behavior',
  'expected output sections',
  'input needs',
  'acceptance checks',
  'scope boundaries',
  'specialist method',
  'delivery packet',
  'review notes',
  'original information used',
  'upstream work used',
  '受け渡し情報の利用',
  'braveソース由来の補助分析',
  'agent handoff',
  '下流エージェント用handoff packet',
  '後続エージェントへの制約',
  '信頼性と品質保証',
  '補助成果物',
  'specialist成果物プレビュー',
  '実行ステータス',
  'supporting work products',
  'delivered content summaries',
  'structured handoff digest',
  'supporting fact index',
  'downstream handoff',
  'downstream handoff summary',
  'downstream handoff packet',
  'artifact_for_next_agent',
  'recommended_next_owner',
  '採用判断表',
  'publisher下書き状態',
  'external app ingest status',
  'publish status',
  'specialist adoption matrix'
]);

function agentTeamCleanDeliverySectionTitle(line = '') {
  return String(line || '')
    .replace(/^#{1,6}\s+/, '')
    .replace(/\*\*/g, '')
    .replace(/[:：]\s*$/, '')
    .trim()
    .toLowerCase();
}

function agentTeamDeliveryLineLooksInternal(line = '') {
  return /provider\.runjob|agent-file provider implementation|agent_file_provider_delivery|central built-in runner|future behavior changes should be made|共通\s*builtin\s*runner|agent ファイル内の provider|agent ファイルの provider 実装|handoff evidence attached|leader-owned prior work|external posting, sending, ad launch|leader checkpoint|deliveryで表示される要約|trust profile|根拠ゲート|実行ゲート|品質ゲート|受け入れ条件|レビュー条件|未保証|source run\s*:|_file content is available|source_task_type\s*:|source_agent_name\s*:|source_run_id\s*:|artifact_for_next_agent\s*:|recommended_next_owner\s*:|external app ingest status\s*:|publisher下書き状態\s*:/i.test(String(line || ''));
}

function agentTeamDeliveryContentLooksTemplateOnly(content = '') {
  const text = String(content || '').trim();
  if (!text) return true;
  if (text === '[object Object]') return true;
  const nonHeadingLines = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !/^#{1,6}\s+/.test(line));
  if (!nonHeadingLines.length) return true;
  return /(^|\n)##\s+Delivery packet\s*\n\s*Write sections for/i.test(text)
    && !/(answer first|evidence used|evidence status|decision first|seo page recommendation|replacement copy|hero copy|body draft|final delivery first|target and inputs|data quality check|measurement plan|next action)/i.test(text);
}

function agentTeamDeliveryValueToText(value, depth = 0) {
  if (value == null || depth > 5) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    return value
      .map((item) => agentTeamDeliveryValueToText(item, depth + 1))
      .map((item) => item.trim())
      .filter(Boolean)
      .join('\n\n');
  }
  if (typeof value !== 'object') return String(value || '').trim();
  const preferredKeys = [
    'markdown',
    'content',
    'body',
    'text',
    'file_markdown',
    'fileMarkdown',
    'deliverable_markdown',
    'deliverableMarkdown',
    'summary',
    'nextAction',
    'next_action'
  ];
  const preferredText = preferredKeys
    .map((key) => agentTeamDeliveryValueToText(value[key], depth + 1))
    .map((item) => item.trim())
    .filter(Boolean)
    .join('\n\n');
  if (preferredText) return preferredText;
  return Object.entries(value)
    .filter(([key]) => !/^(id|name|type|mime|content_?type|source|created|updated|metadata)$/i.test(key))
    .map(([key, item]) => {
      const text = agentTeamDeliveryValueToText(item, depth + 1).trim();
      return text ? `## ${key}\n${text}` : '';
    })
    .filter(Boolean)
    .join('\n\n');
}

function agentTeamDeliveryFileContent(file = {}) {
  const candidates = [
    file?.content,
    file?.markdown,
    file?.body,
    file?.text,
    file?.file_markdown,
    file?.fileMarkdown,
    file?.deliverable_markdown,
    file?.deliverableMarkdown
  ];
  for (const candidate of candidates) {
    const text = agentTeamDeliveryValueToText(candidate).trim();
    if (text && text !== '[object Object]') return text;
  }
  return '';
}

function agentTeamSanitizeDeliveryContentForUser(content = '') {
  const raw = agentTeamDeliveryValueToText(content).replace(/\r\n/g, '\n');
  if (!raw.trim()) return '';
  let text = raw
    .replace(/=== WORKFLOW HANDOFF CONTEXT ===[\s\S]*?=== END WORKFLOW HANDOFF CONTEXT ===/gi, '')
    .replace(/=== WORKFLOW ADDITIONAL PROMPT ===[\s\S]*?(?=\n#{1,6}\s|\n\*\*|$)/gi, '');
  const headingRewrites = new Map([
    ['facts_verified', '確認できたこと'],
    ['assumptions_used', '前提'],
    ['evidence_gaps', '未確認事項']
  ]);
  const kept = [];
  let skipping = false;
  let skipFence = false;
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    const lower = trimmed.toLowerCase();
    if (lower === '```markdown' && skipping) {
      skipFence = true;
      continue;
    }
    if (skipFence) {
      if (lower === '```') skipFence = false;
      continue;
    }
    if (AGENT_TEAM_INTERNAL_DELIVERY_MARKERS.some((marker) => lower.includes(marker))) {
      skipping = true;
      continue;
    }
    const heading = trimmed.match(/^#{1,6}\s+(.+)$/);
    if (heading) {
      const title = agentTeamCleanDeliverySectionTitle(trimmed);
      if (headingRewrites.has(title)) {
        skipping = false;
        kept.push(line.replace(heading[1], headingRewrites.get(title)));
        continue;
      }
      if (AGENT_TEAM_INTERNAL_DELIVERY_SECTION_TITLES.has(title) || title.startsWith('prior specialist deliverable')) {
        skipping = true;
        continue;
      }
      skipping = false;
    }
    if (skipping || agentTeamDeliveryLineLooksInternal(line)) continue;
    kept.push(line);
  }
  const cleaned = kept.join('\n')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return agentTeamDeliveryContentLooksTemplateOnly(cleaned) ? '' : cleaned;
}

function agentTeamDeliveryEntryPriority(entry = {}) {
  const task = String(entry.taskType || entry.job?.workflowTask || entry.job?.taskType || '').trim().toLowerCase();
  const name = String(entry.fileName || entry.file?.name || '').trim().toLowerCase();
  const text = `${task}\n${name}`;
  if (/seo|landing|writing|writer|article|page/.test(text)) return 10;
  if (/x_post|x-post|reddit|indie_hackers|instagram|directory/.test(text)) return 20;
  if (/media_planner/.test(text)) return 30;
  if (/research/.test(text)) return 40;
  if (/data_analysis|analytics/.test(text)) return 50;
  if (/list_creator|cold_email|email/.test(text)) return 80;
  return 60;
}

function agentTeamJobHasSyntheticSubstituteDelivery(job = {}) {
  const output = job?.output && typeof job.output === 'object' ? job.output : {};
  const report = output.report && typeof output.report === 'object' ? output.report : {};
  const runtimeValues = [
    output.runtime?.workflow,
    output.runtime?.mode,
    report.runtime?.workflow,
    report.runtime?.mode,
    job.runtime?.workflow,
    job.runtime?.mode
  ].map((item) => String(item || '').trim().toLowerCase()).filter(Boolean);
  return runtimeValues.some((item) => [
    'workflow_specialist_artifact_recovery',
    'specialist_artifact_recovery',
    'prior_handoff_specialist_packet',
    'prior_handoff_packet',
    'prior_handoff_leader_final_packet',
    'leader_final_handoff_packet',
    'prior_source_research_packet'
  ].includes(item));
}

function agentTeamSupportingDeliverableEntries(children = [], options = {}) {
  const includeLeaders = options.includeLeaders === true;
  const entries = [];
  for (const job of Array.isArray(children) ? children : []) {
    if (String(job?.status || '').trim().toLowerCase() !== 'completed') continue;
    if (agentTeamJobHasSyntheticSubstituteDelivery(job)) continue;
    if (!includeLeaders && isAgentTeamLeaderTask(job.workflowTask || job.taskType || '')) continue;
    const output = job?.output && typeof job.output === 'object' ? job.output : {};
    const files = Array.isArray(output.files) ? output.files : [];
    for (const [index, file] of files.entries()) {
      if (agentTeamFileIsInternal(file)) continue;
      const content = agentTeamSanitizeDeliveryContentForUser(agentTeamDeliveryFileContent(file));
      if (!content.trim()) continue;
      entries.push({
        job,
        file,
        fileIndex: index,
        taskType: String(job.workflowTask || job.taskType || 'specialist').trim() || 'specialist',
        agentName: String(job.workflowAgentName || job.assignedAgentId || '').trim(),
        fileName: String(file?.name || `deliverable-${index + 1}.md`).trim() || `deliverable-${index + 1}.md`,
        content
      });
    }
  }
  return entries;
}

function agentTeamDeliveryNameWithSuffix(name = '', suffix = '') {
  const safeName = String(name || 'delivery.md').trim() || 'delivery.md';
  const safeSuffix = String(suffix || '').trim().replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '');
  if (!safeSuffix) return safeName;
  const match = safeName.match(/^(.*?)(\.[a-z0-9]{1,12})$/i);
  if (!match) return `${safeName}-${safeSuffix}`;
  return `${match[1]}-${safeSuffix}${match[2]}`;
}

function agentTeamDeliveryEntryAgentName(entry = {}) {
  return String(
    entry.file?.source_agent_name
    || entry.file?.sourceAgentName
    || entry.agentName
    || entry.job?.workflowAgentName
    || entry.job?.agentName
    || entry.job?.assignedAgentId
    || ''
  ).trim();
}

function agentTeamDeliveryEntryTaskType(entry = {}) {
  return String(
    entry.file?.source_task_type
    || entry.file?.sourceTaskType
    || entry.taskType
    || entry.job?.workflowTask
    || entry.job?.taskType
    || ''
  ).trim();
}

function agentTeamDeliveryFileDisplayTitle(fileName = '', taskType = '', agentName = '') {
  const parts = [
    agentName,
    taskType,
    fileName
  ].map((item) => String(item || '').trim()).filter(Boolean);
  return parts.length ? parts.join(' / ') : String(fileName || 'delivery.md').trim();
}

function agentTeamDeliveryWithApprovalBoundary(content = '', taskType = '') {
  const text = String(content || '').trim();
  if (!text) return text;
  const task = String(taskType || '').trim();
  const requiresBoundary = /(SNS|ソーシャル|広告|ads?|paid|publish|posting|post|send|external|投稿|送信|公開|掲載|配信|外部実行)/i.test(`${task}\n${text}`);
  if (!requiresBoundary || /(承認|approval|approve|外部実行)/i.test(text)) return text;
  return [
    text,
    '',
    '## 実行に進む前に',
    '- 投稿・送信・広告配信・公開・外部サービスへの適用は、対象アカウント、文案、URL、予算、停止条件を確認し、承認してから実行してください。',
    '- この納品は実行前の計画・改善案です。外部への反映や配信完了を意味しません。'
  ].join('\n');
}

function buildAgentTeamRawChildDeliveryFiles(children = []) {
  const allEntries = agentTeamSupportingDeliverableEntries(children, { includeLeaders: true });
  const leaderEntries = allEntries
    .filter((entry) => isAgentTeamLeaderTask(entry.taskType))
    .sort((left, right) => {
      const phaseCompare = agentTeamLeaderPhaseRank(right.job) - agentTeamLeaderPhaseRank(left.job);
      if (phaseCompare) return phaseCompare;
      return String(right.job?.completedAt || right.job?.createdAt || '').localeCompare(String(left.job?.completedAt || left.job?.createdAt || ''));
    });
  const nonLeaderEntries = allEntries
    .filter((entry) => !isAgentTeamLeaderTask(entry.taskType))
    .sort((left, right) => (
      agentTeamDeliveryEntryPriority(left) - agentTeamDeliveryEntryPriority(right)
      || String(left.job?.completedAt || left.job?.createdAt || '').localeCompare(String(right.job?.completedAt || right.job?.createdAt || ''))
    ));
  const finalLeader = leaderEntries.find((entry) => agentTeamWorkflowPhase(entry.job) === 'final_summary')
    || (!nonLeaderEntries.length ? leaderEntries[0] : null);
  const entries = [
    ...(finalLeader ? [finalLeader] : []),
    ...nonLeaderEntries
  ];
  const seenNames = new Map();
  return entries.map((entry) => {
    const originalName = String(entry.fileName || `deliverable-${entry.fileIndex + 1}.md`).trim() || `deliverable-${entry.fileIndex + 1}.md`;
    const lower = originalName.toLowerCase();
    const count = seenNames.get(lower) || 0;
    seenNames.set(lower, count + 1);
    const disambiguator = [
      entry.taskType,
      String(entry.job?.id || '').trim().slice(0, 8),
      count > 0 ? String(count + 1) : ''
    ].filter(Boolean).join('-');
    const name = count > 0 ? agentTeamDeliveryNameWithSuffix(originalName, disambiguator) : originalName;
    const sourceTaskType = agentTeamDeliveryEntryTaskType(entry);
    const sourceAgentName = agentTeamDeliveryEntryAgentName(entry);
    const sourceAgentId = String(entry.file?.source_agent_id || entry.file?.sourceAgentId || entry.job?.assignedAgentId || '').trim();
    const sourceRunId = String(entry.file?.source_run_id || entry.file?.sourceRunId || entry.job?.id || '').trim();
    const sourcePhase = agentTeamWorkflowPhase(entry.job);
    const sourceStatus = String(entry.job?.status || '').trim();
    const sourceSummary = String(entry.job?.output?.summary || entry.job?.output?.report?.summary || '').trim();
    const content = agentTeamDeliveryWithApprovalBoundary(entry.content, sourceTaskType);
    return {
      ...entry.file,
      name,
      type: String(entry.file?.type || 'text/markdown').trim() || 'text/markdown',
      content,
      user_visible: true,
      user_facing_delivery: true,
      userFacingDelivery: true,
      delivery_visible: true,
      raw_agent_delivery: true,
      source_task_type: sourceTaskType,
      sourceTaskType,
      source_run_id: sourceRunId,
      sourceRunId,
      source_agent_name: sourceAgentName,
      sourceAgentName,
      source_agent_id: sourceAgentId,
      sourceAgentId,
      source_phase: sourcePhase,
      sourcePhase,
      source_status: sourceStatus,
      sourceStatus,
      source_summary: sourceSummary,
      sourceSummary,
      display_title: String(entry.file?.display_title || entry.file?.displayTitle || agentTeamDeliveryFileDisplayTitle(name, sourceTaskType, sourceAgentName)).trim(),
      displayTitle: String(entry.file?.displayTitle || entry.file?.display_title || agentTeamDeliveryFileDisplayTitle(name, sourceTaskType, sourceAgentName)).trim(),
      content_type: String(entry.file?.content_type || entry.file?.contentType || 'agent_raw_delivery').trim() || 'agent_raw_delivery'
    };
  });
}

function isAgentTeamLeaderTask(taskType = '') {
  const task = String(taskType || '').trim().toLowerCase();
  return Boolean(task && task.endsWith('_leader'));
}

function agentTeamWorkflowPhase(job = {}) {
  return String(job?.input?._broker?.workflow?.sequencePhase || '').trim().toLowerCase();
}

function agentTeamLeaderPhaseRank(job = {}) {
  const phase = agentTeamWorkflowPhase(job);
  if (phase === 'final_summary') return 3;
  if (phase === 'checkpoint') return 2;
  if (phase === 'initial') return 1;
  return 0;
}

function agentTeamDeliverableTypeForTask(taskType = '') {
  const task = String(taskType || '').trim().toLowerCase();
  if (['x_post', 'instagram', 'reddit', 'indie_hackers'].includes(task)) return 'social_post_pack';
  if (['email_ops', 'cold_email'].includes(task)) return 'email_pack';
  if (['code', 'debug', 'ops', 'automation'].includes(task)) return 'code_handoff';
  if (['directory_submission', 'acquisition_automation', 'growth', 'media_planner', 'citation_ops', 'summary', 'writing', 'writer', 'seo', 'seo_specialist', 'landing'].includes(task)) return 'report_bundle';
  return '';
}

const AGENT_TEAM_ACTIONABLE_LEADER_OUTPUT_PATTERN = /(execution candidate|execution-ready|action candidate|action packet|planned action table|connector handoff|connector path|leader approval queue|publish|posting|post-ready|send-ready|schedule-ready|manual handoff|実行候補|実行パケット|アクション候補|アクションパケット|実行準備|実行経路|投稿|送信|配信|公開|掲載|承認|次アクション)/i;

function agentTeamExecutionTextFromJob(job = {}) {
  const report = job?.output?.report && typeof job.output.report === 'object' ? job.output.report : {};
  const files = Array.isArray(job?.output?.files) ? job.output.files : [];
  return [
    job?.output?.summary,
    report.summary,
    report.nextAction,
    report.next_action,
    ...files.map((file) => file?.content || '')
  ].map((item) => String(item || '').trim()).filter(Boolean).join('\n\n');
}

function agentTeamExecutionChannelFromText(text = '') {
  const value = String(text || '');
  const candidates = [
    ['reddit', /(reddit|subreddit|レディット)/i],
    ['indie_hackers', /(indie hackers|indiehackers|インディーハッカー|インディーハッカーズ)/i],
    ['instagram', /(instagram|insta|インスタ)/i],
    ['email', /(email|gmail|newsletter|mailbox|メール|送信|配信|コールドメール)/i],
    ['github', /(github|pull request|draft pr|pr\b|ギットハブ|プルリク)/i],
    ['x', /(x\.com|(?:^|[^a-z0-9])x(?:\s+post|\s+posts|\s+thread)?(?=$|[^a-z0-9])|twitter|tweet|x投稿|ツイッター|ポスト|スレッド)/i]
  ];
  return candidates
    .map(([channel, pattern]) => {
      const match = value.match(pattern);
      return match ? { channel, index: match.index ?? value.search(pattern) } : null;
    })
    .filter(Boolean)
    .sort((left, right) => left.index - right.index)[0]?.channel || '';
}

function agentTeamExecutionDraftDefaults(job = {}, type = '') {
  const task = String(job?.workflowTask || job?.taskType || '').trim().toLowerCase();
  if (type === 'social_post_pack') {
    return {
      channel: task === 'instagram' ? 'instagram' : (task === 'reddit' ? 'reddit' : (task === 'indie_hackers' ? 'indie_hackers' : 'x')),
      actionMode: ['reddit', 'indie_hackers'].includes(task) ? 'post_ready' : 'post_ready'
    };
  }
  if (type === 'email_pack') {
    return {
      target: 'gmail',
      actionMode: 'send_ready'
    };
  }
  if (type === 'code_handoff') {
    return {
      target: 'github_repo'
    };
  }
  if (type === 'report_bundle') {
    const channel = agentTeamExecutionChannelFromText(agentTeamExecutionTextFromJob(job));
    return {
      nextStep: 'execution_order',
      ...(channel ? { channel } : {})
    };
  }
  return {};
}

function agentTeamAuthorityRequestFromJob(job = {}) {
  const report = job?.output?.report && typeof job.output.report === 'object' ? job.output.report : {};
  const request = report.authority_request || report.authorityRequest || null;
  return request && typeof request === 'object' ? request : null;
}

function agentTeamAuthorityList(value) {
  if (Array.isArray(value)) return value.map((item) => String(item || '').trim()).filter(Boolean);
  if (typeof value === 'string') return value.split(/[,\n]/).map((item) => item.trim()).filter(Boolean);
  return [];
}

function agentTeamAuthorityBool(value) {
  return value === true || value === 'true' || value === 1;
}

function agentTeamAuthorityRequestRequiresApproval(request = null) {
  if (!request || typeof request !== 'object') return false;
  const missingConnectors = agentTeamAuthorityList(
    request.missing_connectors
      || request.missingConnectors
      || request.required_connectors
      || request.requiredConnectors
      || request.connectors
  );
  const missingCapabilities = agentTeamAuthorityList(
    request.missing_connector_capabilities
      || request.missingConnectorCapabilities
      || request.required_connector_capabilities
      || request.requiredConnectorCapabilities
      || request.capabilities
  );
  const googleSources = agentTeamAuthorityList(
    request.required_google_sources
      || request.requiredGoogleSources
      || request.google_source_types
      || request.googleSourceTypes
  );
  const explicitSelectionRequired = agentTeamAuthorityBool(
    request.required_channel_selection
      || request.requiredChannelSelection
      || request.required_repository_selection
      || request.requiredRepositorySelection
      || request.required_account_selection
      || request.requiredAccountSelection
  );
  const reason = String(request.reason || request.message || request.summary || '').trim();
  const source = String(request.source || request.reason_code || request.reasonCode || '').trim().toLowerCase();
  if (source === 'leader_execution_approval') return false;
  const channelCandidates = agentTeamAuthorityList(request.channel_candidates || request.channelCandidates || request.channels);
  const writeCapabilities = missingCapabilities.filter((item) => (
    /(post|publish|send|write|submit|create|update|delete|calendar|gmail|email|x\.post|github\.write)/i.test(String(item || ''))
    && !/^google\.read_/i.test(String(item || ''))
  ));
  if (
    source === 'leader_execution_approval'
    && explicitSelectionRequired
    && !channelCandidates.length
    && !writeCapabilities.length
  ) {
    return false;
  }
  const sourceOnlyConnectors = missingConnectors.length
    && missingConnectors.every((item) => ['search', 'web_search', 'brave', 'ga4', 'google_analytics', 'search_console', 'gsc', 'analytics'].includes(String(item || '').trim().toLowerCase()));
  if (
    (source === 'search_connector_required' || sourceOnlyConnectors)
    && !missingCapabilities.length
    && !googleSources.length
    && !explicitSelectionRequired
    && !/(approval|approve|publish|send|post|承認|投稿|送信)/i.test(reason)
  ) {
    return false;
  }
  return Boolean(
    missingConnectors.length
    || missingCapabilities.length
    || googleSources.length
    || explicitSelectionRequired
    || /(oauth|approval|approve|authority|connector|required|missing|connect|confirm|publish|send|post|承認|接続|未接続|確認|権限|投稿|送信|必要)/i.test(reason)
  );
}

function agentTeamAuthorityRequestLabel(request = null) {
  if (!request || typeof request !== 'object') return 'external action approval';
  const capabilities = agentTeamAuthorityList(request.missing_connector_capabilities || request.missingConnectorCapabilities || request.capabilities);
  const connectors = agentTeamAuthorityList(request.missing_connectors || request.missingConnectors || request.connectors);
  const channels = agentTeamAuthorityList(request.channel_candidates || request.channelCandidates || request.channels);
  const parts = [...capabilities, ...connectors, ...channels].filter(Boolean);
  return parts.length ? parts.join(', ') : 'external action approval';
}

function agentTeamAuthorityRequestFromChildren(children = []) {
  const candidates = (Array.isArray(children) ? children : [])
    .map((job) => {
      const request = agentTeamAuthorityRequestFromJob(job);
      if (!agentTeamAuthorityRequestRequiresApproval(request)) return null;
      const status = String(job?.status || '').trim().toLowerCase();
      const taskType = String(job?.workflowTask || job?.taskType || '').trim().toLowerCase();
      const phase = agentTeamWorkflowPhase(job);
      const actionPhase = phase === 'action' ? 3 : (phase === 'preparation' ? 2 : 1);
      const statusRank = status === 'blocked' ? 3 : (status === 'completed' ? 2 : 1);
      const socialRank = ['x_post', 'instagram', 'reddit', 'indie_hackers'].includes(taskType) ? 2 : 1;
      return {
        request,
        rank: actionPhase * 100 + statusRank * 10 + socialRank,
        createdAt: String(job?.createdAt || '')
      };
    })
    .filter(Boolean)
    .sort((left, right) => {
      if (left.rank !== right.rank) return right.rank - left.rank;
      return right.createdAt.localeCompare(left.createdAt);
    });
  return candidates[0]?.request || null;
}

function agentTeamExecutionCandidateJob(children = []) {
  const actionable = (Array.isArray(children) ? children : [])
    .filter((job) => {
      const status = String(job?.status || '').trim().toLowerCase();
      if (status === 'completed') return true;
      return status === 'blocked' && agentTeamAuthorityRequestRequiresApproval(agentTeamAuthorityRequestFromJob(job));
    })
    .filter((job) => !isAgentTeamLeaderTask(job?.workflowTask || job?.taskType || ''))
    .map((job) => ({
      job,
      taskType: String(job?.workflowTask || job?.taskType || '').trim().toLowerCase(),
      phase: agentTeamWorkflowPhase(job),
      deliverableType: agentTeamDeliverableTypeForTask(job?.workflowTask || job?.taskType || ''),
      file: Array.isArray(job?.output?.files)
        ? job.output.files.find((item) => String(item?.content || '').trim())
        : null
    }))
    .filter((entry) => entry.deliverableType && entry.file);
  if (!actionable.length) return null;
  const priority = new Map([
    ['social_post_pack', 4],
    ['email_pack', 4],
    ['code_handoff', 3],
    ['report_bundle', 2]
  ]);
  return actionable.sort((left, right) => {
    const leftPhase = left.phase === 'action' ? 2 : (left.phase === 'research' ? 1 : 0);
    const rightPhase = right.phase === 'action' ? 2 : (right.phase === 'research' ? 1 : 0);
    if (leftPhase !== rightPhase) return rightPhase - leftPhase;
    const leftPriority = priority.get(left.deliverableType) || 0;
    const rightPriority = priority.get(right.deliverableType) || 0;
    if (leftPriority !== rightPriority) return rightPriority - leftPriority;
    const leftCompleted = String(left.job?.completedAt || '').trim();
    const rightCompleted = String(right.job?.completedAt || '').trim();
    const completedCompare = rightCompleted.localeCompare(leftCompleted);
    if (completedCompare) return completedCompare;
    return String(right.job?.createdAt || '').localeCompare(String(left.job?.createdAt || ''));
  })[0] || null;
}

function agentTeamExecutionCandidateFile(entry = null) {
  if (!entry?.file || !entry?.deliverableType) return null;
  const file = entry.file;
  const task = String(entry.taskType || '').trim().toLowerCase();
  const suffix = entry.deliverableType === 'social_post_pack'
    ? 'social-post-pack'
    : entry.deliverableType === 'email_pack'
      ? 'email-pack'
      : entry.deliverableType === 'code_handoff'
        ? 'code-handoff'
        : 'execution-report';
  return {
    name: String(file.name || `${suffix}.md`).trim() || `${suffix}.md`,
    type: String(file.type || 'text/markdown').trim() || 'text/markdown',
    content: String(file.content || ''),
    content_type: entry.deliverableType,
    execution_candidate: true,
    source_task_type: task,
    title: String(entry.job?.workflowAgentName || entry.job?.assignedAgentId || task || suffix).trim(),
    reason: String(entry.job?.output?.summary || entry.job?.output?.report?.summary || '').trim(),
    draft_defaults: {
      ...agentTeamExecutionDraftDefaults(entry.job, entry.deliverableType),
      ...(file.draft_defaults && typeof file.draft_defaults === 'object' ? file.draft_defaults : {}),
      ...(file.draftDefaults && typeof file.draftDefaults === 'object' ? file.draftDefaults : {})
    }
  };
}

function agentTeamLeaderExecutionCandidateFile(leaderJob = null, leaderOutput = {}, leaderReport = {}) {
  if (!leaderJob || !isAgentTeamLeaderTask(leaderJob.workflowTask || leaderJob.taskType || '')) return null;
  const files = Array.isArray(leaderOutput?.files) ? leaderOutput.files : [];
  const file = files.find((item) => String(item?.content || '').trim());
  if (!file) return null;
  const phase = agentTeamWorkflowPhase(leaderJob);
  const text = agentTeamExecutionTextFromJob(leaderJob);
  const alreadyExplicit = Boolean(
    ['social_post_pack', 'email_pack', 'code_handoff', 'report_bundle'].includes(String(file?.content_type || file?.contentType || '').trim())
    && (file?.execution_candidate === true || file?.executionCandidate === true)
  );
  const actionable = alreadyExplicit
    || ['checkpoint', 'final_summary'].includes(phase)
    || AGENT_TEAM_ACTIONABLE_LEADER_OUTPUT_PATTERN.test(text);
  if (!actionable) return null;
  const task = String(leaderJob.workflowTask || leaderJob.taskType || '').trim().toLowerCase();
  return {
    name: String(file.name || 'leader-execution-packet.md').trim() || 'leader-execution-packet.md',
    type: String(file.type || 'text/markdown').trim() || 'text/markdown',
    content: String(file.content || ''),
    content_type: 'report_bundle',
    execution_candidate: true,
    source_task_type: task,
    title: String(file.title || leaderJob.workflowAgentName || leaderJob.assignedAgentId || 'Team Leader execution packet').trim(),
    reason: String(file.reason || leaderReport.nextAction || leaderReport.next_action || leaderOutput.summary || leaderReport.summary || '').trim(),
    draft_defaults: {
      ...agentTeamExecutionDraftDefaults(leaderJob, 'report_bundle'),
      ...(file.draft_defaults && typeof file.draft_defaults === 'object' ? file.draft_defaults : {})
    }
  };
}

export {
  agentTeamChildSummary,
  uniqueAgentTeamDeliveryFiles,
  agentTeamFinalVisibleDeliveryFiles,
  buildAgentTeamRawChildDeliveryFiles,
  isAgentTeamLeaderTask,
  agentTeamWorkflowPhase,
  agentTeamLeaderPhaseRank,
  agentTeamAuthorityRequestFromJob,
  agentTeamAuthorityRequestFromChildren,
  agentTeamAuthorityRequestRequiresApproval,
  agentTeamAuthorityRequestLabel,
  agentTeamExecutionCandidateJob,
  agentTeamExecutionCandidateFile,
  agentTeamLeaderExecutionCandidateFile
};
