const CONNECTOR_ACTION_LABELS = Object.freeze({
  connect_x: 'CONNECT X',
  connect_google: 'CONNECT GOOGLE',
  connect_github: 'CONNECT GITHUB'
});

const DELIVERY_ACTION_CONTRACTS = Object.freeze({
  article_draft: Object.freeze({
    type: 'article_draft',
    title: 'ARTICLE DRAFT DETECTED',
    description: 'CAIt detected a publishable long-form draft. Route it into publish preparation or export it as-is.',
    copyLabel: 'COPY ARTICLE',
    prepareLabel: 'PREPARE PUBLISH ORDER',
    connectAction: '',
    connectLabel: '',
    openCli: false
  }),
  social_post_pack: Object.freeze({
    type: 'social_post_pack',
    title: 'SOCIAL POST PACK DETECTED',
    description: 'CAIt detected ready-to-adapt post copy from this delivery. Route it into X/community execution or export it as-is.',
    copyLabel: 'COPY POST PACK',
    prepareLabel: 'PREPARE POST ORDER',
    connectAction: 'connect_x',
    connectLabel: CONNECTOR_ACTION_LABELS.connect_x,
    openCli: false
  }),
  email_pack: Object.freeze({
    type: 'email_pack',
    title: 'EMAIL PACK DETECTED',
    description: 'CAIt detected approval-ready email copy. Route it into Gmail or CAIt Resend execution, or export it as-is.',
    copyLabel: 'COPY EMAIL PACK',
    prepareLabel: 'PREPARE EMAIL ORDER',
    connectAction: 'connect_google',
    connectLabel: CONNECTOR_ACTION_LABELS.connect_google,
    openCli: false
  }),
  code_handoff: Object.freeze({
    type: 'code_handoff',
    title: 'CODE HANDOFF DETECTED',
    description: 'CAIt detected an implementation-ready technical handoff. Route it into GitHub or local terminal execution.',
    copyLabel: 'COPY HANDOFF',
    prepareLabel: 'PREPARE IMPLEMENTATION ORDER',
    connectAction: 'connect_github',
    connectLabel: CONNECTOR_ACTION_LABELS.connect_github,
    openCli: true
  }),
  report_bundle: Object.freeze({
    type: 'report_bundle',
    title: 'REPORT BUNDLE DETECTED',
    description: 'CAIt detected a structured report or memo. Draft the next order from it, or export it as-is. Drafting does not execute work.',
    copyLabel: 'COPY REPORT',
    prepareLabel: 'DRAFT NEXT ORDER',
    connectAction: '',
    connectLabel: '',
    openCli: false
  })
});

const DELIVERY_UI_TEXT = Object.freeze({
  articleDetectedLabel: 'ARTICLE DETECTED',
  articleDetectedDescription: 'CAIt detected a publishable article draft from this delivery. Confirm the target and URL path before preparing the next execution.',
  genericReasonFallback: 'Detected from the previous delivery and ready for the next action.',
  executionStoppedNotice: 'Execution for this delivery is stopped because the user cancelled it. Clear the stop state to run it again.',
  googleSourcesTitle: 'GOOGLE SOURCES',
  googleSourcesSummaryFallback: 'Load only the Google sources this delivery needs.'
});

const DELIVERY_EXECUTION_CONFIRMATION_REQUIREMENT = 'confirm_execute=true';
const DELIVERY_SCHEDULE_CONFIRMATION_REQUIREMENT = 'confirm_schedule=true';

function normalizeSocialPostCandidate(value = '') {
  return String(value || '')
    .replace(/\r\n/g, '\n')
    .replace(/^\s*(?:[-*]\s+|\d+\.\s+)/, '')
    .replace(/^["'`]+|["'`]+$/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function isPlaceholderSocialPostCandidate(value = '') {
  const text = String(value || '').trim();
  if (!text) return true;
  return Boolean(
    /^(?:the exact post text to approve|connected x account|post_tweet|schedule_post|approval owner|operator or cmo leader|owner|metric|stop rule)$/i.test(text)
    || /^(?:承認対象の本文|接続済みXアカウント名|操作者またはCMO leader|停止条件|指標)$/i.test(text)
    || /\bTBD\b|\[[^\]\n]{2,80}\]/i.test(text)
  );
}

function usableSocialPostCandidate(value = '', options = {}) {
  const text = normalizeSocialPostCandidate(value);
  const maxLength = Number(options.maxLength || 0);
  if (text.length < 8) return '';
  if (maxLength > 0 && text.length > maxLength) return '';
  if (/^#+\s/.test(text) || /^\|/.test(text) || /^-{3,}$/.test(text)) return '';
  if (isPlaceholderSocialPostCandidate(text)) return '';
  return text;
}

function addSocialPostCandidate(candidates = [], value = '', options = {}) {
  const candidate = usableSocialPostCandidate(value, options);
  if (candidate && !candidates.includes(candidate)) candidates.push(candidate);
}

function sectionBodyByHeading(content = '', headingPattern = /$^/) {
  const lines = String(content || '').replace(/\r\n/g, '\n').split('\n');
  const sections = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] || '';
    if (!/^#{1,4}\s+/.test(line) || !headingPattern.test(line.replace(/^#{1,4}\s+/, '').trim())) continue;
    const body = [];
    for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
      if (/^#{1,4}\s+/.test(lines[cursor] || '')) break;
      body.push(lines[cursor]);
    }
    sections.push(body.join('\n').trim());
  }
  return sections;
}

function socialPostCandidatesFromJson(content = '', options = {}) {
  const candidates = [];
  const fencePattern = /```(?:json)?\s*([\s\S]*?)```/gi;
  for (const match of String(content || '').matchAll(fencePattern)) {
    const raw = String(match[1] || '').trim();
    if (!raw || !/[{[]/.test(raw[0])) continue;
    try {
      const parsed = JSON.parse(raw);
      const values = Array.isArray(parsed) ? parsed : [parsed];
      for (const value of values) {
        if (!value || typeof value !== 'object') continue;
        addSocialPostCandidate(candidates, value.text || value.postText || value.post_text || value.exact_copy || value.exactCopy || value.caption, options);
      }
    } catch {}
  }
  return candidates;
}

const SOCIAL_POST_FIELD_LABEL_PATTERN = '(?:x\\s+post\\s+draft|post\\s+draft|post\\s+text|tweet\\s+text|exact[_\\s-]*copy|post[_\\s-]*text|投稿本文|投稿コピー|投稿ドラフト|本文)';
const SOCIAL_POST_FIELD_SUFFIX_PATTERN = '(?:\\s*\\([^\\n)]{0,180}\\)|\\s+[-–—]\\s+[^\\n:：]{0,160})?';

function socialPostCandidatesFromLabeledBlocks(content = '', options = {}) {
  const candidates = [];
  const lines = String(content || '').replace(/\r\n/g, '\n').split('\n');
  const labelLinePattern = new RegExp(`^\\s*(?:[-*]\\s*)?(?:\\*\\*)?${SOCIAL_POST_FIELD_LABEL_PATTERN}${SOCIAL_POST_FIELD_SUFFIX_PATTERN}\\s*[:：]\\s*(?:\\*\\*)?\\s*$`, 'i');
  const nextLabelPattern = new RegExp(`^\\s*(?:[-*]\\s*)?(?:\\*\\*)?${SOCIAL_POST_FIELD_LABEL_PATTERN}`, 'i');
  const stopPattern = /^(?:#{1,6}\s+|deliverable\b|approval packet\b|oauth\b|execution handoff\b|cadence\b|reply candidates\b|optional thread\b|status\b|required\b)/i;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] || '';
    if (!labelLinePattern.test(line)) continue;
    let cursor = index + 1;
    while (cursor < lines.length && !String(lines[cursor] || '').trim()) cursor += 1;

    const quoted = [];
    for (; cursor < lines.length; cursor += 1) {
      const current = lines[cursor] || '';
      if (/^\s*>/.test(current)) {
        quoted.push(current.replace(/^\s*>\s?/, '').trimEnd());
        continue;
      }
      if (quoted.length && !String(current || '').trim()) {
        quoted.push('');
        continue;
      }
      break;
    }
    if (quoted.length) {
      addSocialPostCandidate(candidates, quoted.join('\n').replace(/\n+$/g, ''), options);
      continue;
    }

    const paragraph = [];
    for (; cursor < lines.length; cursor += 1) {
      const current = lines[cursor] || '';
      const trimmed = current.trim();
      const plain = trimmed.replace(/\*\*/g, '');
      if (!trimmed) {
        if (paragraph.length) break;
        continue;
      }
      if (stopPattern.test(plain) || nextLabelPattern.test(trimmed)) break;
      paragraph.push(current.replace(/^\s*>\s?/, '').trimEnd());
    }
    addSocialPostCandidate(candidates, paragraph.join('\n'), options);
  }
  return candidates;
}

export function extractSocialPostTextFromDeliveryContent(content = '', options = {}) {
  const text = String(content || '').replace(/\r\n/g, '\n');
  const maxLength = Number(options.maxLength || 0);
  const candidates = [];
  const candidateOptions = { maxLength };
  for (const candidate of socialPostCandidatesFromJson(text, candidateOptions)) {
    addSocialPostCandidate(candidates, candidate, candidateOptions);
  }
  for (const candidate of socialPostCandidatesFromLabeledBlocks(text, candidateOptions)) {
    addSocialPostCandidate(candidates, candidate, candidateOptions);
  }
  const fieldPattern = new RegExp(`(?:^|\\n)\\s*(?:[-*]\\s*)?(?:\\*\\*)?${SOCIAL_POST_FIELD_LABEL_PATTERN}${SOCIAL_POST_FIELD_SUFFIX_PATTERN}(?:\\*\\*)?\\s*[:：][ \\t]*(?:\\*\\*)?[ \\t]*([^\\n]+)`, 'gi');
  for (const match of text.matchAll(fieldPattern)) {
    addSocialPostCandidate(candidates, match[1], candidateOptions);
  }
  for (const line of text.split('\n')) {
    const cells = line.split('|').map((cell) => cell.trim()).filter(Boolean);
    if (cells.length < 2) continue;
    const key = String(cells[0] || '').toLowerCase().replace(/[\s_-]+/g, '_');
    if (['post_draft', 'post_text', 'exact_copy', 'tweet_text', '投稿本文', '投稿コピー'].includes(key)) {
      addSocialPostCandidate(candidates, cells.slice(1).join(' | '), candidateOptions);
    }
  }
  const sectionPattern = /^(?:post draft|short posts?|exact post(?: packet)?|x post(?: draft)?|投稿案|投稿ドラフト|投稿本文|実行パケット)$/i;
  for (const section of sectionBodyByHeading(text, sectionPattern)) {
    const numbered = section.match(/^\s*\d+\.\s+.+$/gm) || [];
    for (const item of numbered) addSocialPostCandidate(candidates, item, candidateOptions);
    const bullets = section.match(/^\s*[-*]\s+.+$/gm) || [];
    for (const item of bullets) addSocialPostCandidate(candidates, item, candidateOptions);
    addSocialPostCandidate(candidates, section, candidateOptions);
  }
  return candidates[0] || '';
}

const DELIVERY_API_ACTION_POLICIES = Object.freeze({
  x_post: Object.freeze({
    kind: 'x_post',
    supportsExecution: true,
    supportsSchedule: true,
    requiresExecutionConfirmation: true,
    requiresScheduleConfirmation: true
  }),
  instagram_post: Object.freeze({
    kind: 'instagram_post',
    supportsExecution: true,
    supportsSchedule: true,
    requiresExecutionConfirmation: true,
    requiresScheduleConfirmation: true
  }),
  gmail_send: Object.freeze({
    kind: 'gmail_send',
    supportsExecution: true,
    supportsSchedule: true,
    requiresExecutionConfirmation: true,
    requiresScheduleConfirmation: true
  }),
  resend_send: Object.freeze({
    kind: 'resend_send',
    supportsExecution: true,
    supportsSchedule: true,
    requiresExecutionConfirmation: true,
    requiresScheduleConfirmation: true
  }),
  github_pr: Object.freeze({
    kind: 'github_pr',
    supportsExecution: true,
    supportsSchedule: false,
    requiresExecutionConfirmation: true,
    requiresScheduleConfirmation: false
  }),
  report_next: Object.freeze({
    kind: 'report_next',
    supportsExecution: true,
    supportsSchedule: false,
    requiresExecutionConfirmation: true,
    requiresScheduleConfirmation: false
  })
});

function normalizeDeliveryActionContract(raw = null) {
  if (!raw || typeof raw !== 'object') return null;
  const type = String(raw.type || '').trim();
  const title = String(raw.title || '').trim();
  const description = String(raw.description || '').trim();
  const copyLabel = String(raw.copyLabel || raw.copy_label || '').trim();
  const prepareLabel = String(raw.prepareLabel || raw.prepare_label || '').trim();
  if (!type || !title || !description || !copyLabel || !prepareLabel) return null;
  const connectAction = String(raw.connectAction || raw.connect_action || '').trim();
  const connectLabel = String(raw.connectLabel || raw.connect_label || '').trim();
  return {
    type,
    title,
    description,
    copyLabel,
    prepareLabel,
    connectAction,
    connectLabel: connectLabel || connectorActionLabel(connectAction, ''),
    openCli: Boolean(raw.openCli || raw.open_cli)
  };
}

function isIncluded(value = '', allowed = []) {
  return allowed.includes(String(value || '').trim());
}

function normalizedDeliveryApiActionKind(actionKind = '') {
  return String(actionKind || '').trim();
}

export function deliveryApiActionPolicy(actionKind = '') {
  const normalized = normalizedDeliveryApiActionKind(actionKind);
  const policy = DELIVERY_API_ACTION_POLICIES[normalized];
  return policy ? { ...policy } : null;
}

export function isDeliveryExecutionActionSupported(actionKind = '') {
  return Boolean(deliveryApiActionPolicy(actionKind)?.supportsExecution);
}

export function isDeliveryScheduleActionSupported(actionKind = '') {
  return Boolean(deliveryApiActionPolicy(actionKind)?.supportsSchedule);
}

export function deliveryExecutionConfirmationRequirement(actionKind = '') {
  return deliveryApiActionPolicy(actionKind)?.requiresExecutionConfirmation
    ? DELIVERY_EXECUTION_CONFIRMATION_REQUIREMENT
    : '';
}

export function deliveryScheduleConfirmationRequirement(actionKind = '') {
  return deliveryApiActionPolicy(actionKind)?.requiresScheduleConfirmation
    ? DELIVERY_SCHEDULE_CONFIRMATION_REQUIREMENT
    : '';
}

export function hasDeliveryExecutionConfirmation(body = {}) {
  return body?.confirm_execute === true || body?.confirmExecute === true;
}

export function hasDeliveryScheduleConfirmation(body = {}) {
  return body?.confirm_schedule === true || body?.confirmSchedule === true;
}

export function deliveryExecutorActionPayload(body = {}) {
  const actionKind = String(body?.action_kind || body?.actionKind || '').trim();
  const draft = body?.draft && typeof body.draft === 'object' ? body.draft : {};
  if (actionKind === 'x_post') {
    return {
      kind: 'x_post',
      text: String(draft.postText || '').trim(),
      approvedXUsername: String(body.approved_x_username || body.approvedXUsername || draft.approvedXUsername || draft.approved_x_username || '').trim(),
      approvedXUserId: String(body.approved_x_user_id || body.approvedXUserId || draft.approvedXUserId || draft.approved_x_user_id || '').trim(),
      approvedText: String(body.approved_text || body.approvedText || draft.approvedText || draft.approved_text || '').trim()
    };
  }
  if (actionKind === 'instagram_post') {
    return {
      kind: 'instagram_post',
      caption: String(draft.postText || '').trim(),
      accessToken: String(draft.instagramAccessToken || '').trim(),
      instagramUserId: String(draft.instagramUserId || '').trim(),
      mediaUrl: String(draft.instagramMediaUrl || '').trim()
    };
  }
  if (actionKind === 'gmail_send') {
    return {
      kind: 'gmail_send',
      to: String(draft.recipientEmail || '').trim(),
      subject: String(draft.emailSubject || '').trim(),
      text: String(draft.emailBody || '').trim()
    };
  }
  if (actionKind === 'resend_send') {
    return {
      kind: 'resend_send',
      to: String(draft.recipientEmail || '').trim(),
      from: String(draft.senderEmail || '').trim(),
      replyTo: String(draft.replyToEmail || '').trim(),
      subject: String(draft.emailSubject || '').trim(),
      text: String(draft.emailBody || '').trim()
    };
  }
  return null;
}

export function buildReportNextOrderBody(job = null, deliverable = null, draft = {}) {
  const nextStep = String(draft.nextStep || 'action_plan').trim();
  const sourceLines = [];
  if (String(draft.googleSearchConsoleSite || '').trim()) sourceLines.push(`Use Search Console site: ${String(draft.googleSearchConsoleSite || '').trim()}`);
  if (String(draft.googleGa4Property || '').trim()) sourceLines.push(`Use GA4 property: ${String(draft.googleGa4Property || '').trim()}`);
  if (String(draft.googleDriveFileId || '').trim()) sourceLines.push(`Use Google Drive file: ${String(draft.googleDriveFileId || '').trim()}`);
  if (String(draft.googleCalendarId || '').trim()) sourceLines.push(`Use Google Calendar: ${String(draft.googleCalendarId || '').trim()}`);
  if (String(draft.googleGmailLabelId || '').trim()) sourceLines.push(`Use Gmail label: ${String(draft.googleGmailLabelId || '').trim()}`);
  const taskType = nextStep === 'publish_followup'
    ? 'writing'
    : (nextStep === 'execution_order' ? (job?.taskType || 'research') : 'research');
  return {
    parent_agent_id: String(job?.parentAgentId || 'cloudcode-main'),
    order_strategy: nextStep !== 'execution_order' ? 'auto' : 'single',
    task_type: taskType,
    prompt: [
      `Continue from the report delivered in previous order ${job?.id || ''}.`,
      '',
      `Detected delivery: ${String(deliverable?.title || '')}`,
      `Next step: ${nextStep}`,
      ...sourceLines,
      nextStep === 'publish_followup'
        ? 'Convert the report into a publishable follow-up order and ask only for the minimum publishing metadata.'
        : nextStep === 'execution_order'
          ? 'Convert the report into the next executable work order directly.'
          : 'Turn the report into a concise action plan with the next best recommended step.',
      'If another clarification is required, ask only one blocking question.'
    ].filter(Boolean).join('\n'),
    budget_cap: Number(job?.budgetCap || 300) || 300,
    deadline_sec: Number(job?.deadlineSec || 120) || 120,
    followup_to_job_id: String(job?.id || ''),
    async_dispatch: true,
    input: {}
  };
}

export function normalizeDeliveryExecuteResponse(result = {}, actionKind = '') {
  const kind = String(actionKind || '').trim();
  if (kind === 'github_pr') {
    return {
      ok: true,
      action_kind: kind,
      outcome_kind: 'github_pr',
      message: 'GitHub PR handoff created.',
      entity: {
        repo: result.repo?.fullName || '',
        branch: result.branch || '',
        pull_request_url: result.pull_request?.html_url || result.pull_request?.htmlUrl || '',
        pull_request_number: result.pull_request?.number || null,
        files: Array.isArray(result.files) ? result.files : []
      },
      raw: result
    };
  }
  if (kind === 'report_next') {
    return {
      ok: true,
      action_kind: kind,
      outcome_kind: 'job',
      message: 'Follow-up order started.',
      entity: {
        job_id: result.job_id || '',
        status: result.status || '',
        workflow_parent_id: result.workflow_parent_id || null,
        matched_agent_id: result.matched_agent_id || null
      },
      raw: result
    };
  }
  return {
    ok: true,
    action_kind: kind,
    outcome_kind: 'connector_action',
    message: result.status === 'sent' ? 'Connector send completed.' : 'Connector action completed.',
    entity: {
      connector_action: result.connector_action || kind,
      connector_action_id: result.connector_action_id || '',
      url: result.url || '',
      account_handle: result.account_handle || '',
      account_id: result.account_id || '',
      to: result.to || '',
      subject: result.subject || '',
      thread_id: result.thread_id || ''
    },
    raw: result
  };
}

export function normalizeDeliveryScheduleResponse(result = {}, actionKind = '') {
  return {
    ok: true,
    action_kind: String(actionKind || '').trim(),
    outcome_kind: 'scheduled',
    message: 'Scheduled action created.',
    entity: {
      recurring_order_id: result.recurring_order?.id || '',
      next_run_at: result.recurring_order?.nextRunAt || '',
      status: result.recurring_order?.status || '',
      task_type: result.recurring_order?.taskType || ''
    },
    raw: result
  };
}

export function normalizeDeliveryExecuteFailureResponse(result = {}, actionKind = '') {
  const payload = result && typeof result === 'object' ? result : {};
  const message = String(payload.error || 'Execution failed').trim();
  const missingConnectors = Array.isArray(payload.missingConnectors || payload.missing_connectors) ? (payload.missingConnectors || payload.missing_connectors) : [];
  const missingConnectorCapabilities = Array.isArray(payload.missingConnectorCapabilities || payload.missing_connector_capabilities)
    ? (payload.missingConnectorCapabilities || payload.missing_connector_capabilities)
    : [];
  const statusCode = Number(payload.statusCode || 0) || 400;
  const errorKind = payload.code === 'confirmation_required' || payload.needs_confirmation
    ? 'confirmation_required'
    : payload.code === 'connector_required' || payload.needs_connector || missingConnectors.length || missingConnectorCapabilities.length
    ? 'authority_required'
    : (statusCode >= 500 ? 'server_error' : 'validation_error');
  return {
    ok: false,
    action_kind: String(actionKind || payload.action_kind || '').trim(),
    outcome_kind: 'error',
    error_kind: errorKind,
    code: String(payload.code || '').trim(),
    required: String(payload.required || '').trim(),
    message,
    entity: {
      missing_connectors: missingConnectors,
      missing_connector_capabilities: missingConnectorCapabilities,
      use: String(payload.use || '').trim(),
      next_step: String(payload.next_step || '').trim(),
      required: String(payload.required || '').trim(),
      action: String(payload.action || '').trim(),
      path: String(payload.path || '').trim(),
      source: String(payload.source || '').trim(),
      status_code: statusCode
    },
    raw: payload
  };
}

export function normalizeDeliveryScheduleFailureResponse(result = {}, actionKind = '') {
  const payload = result && typeof result === 'object' ? result : {};
  const statusCode = Number(payload.statusCode || 0) || 400;
  return {
    ok: false,
    action_kind: String(actionKind || payload.action_kind || '').trim(),
    outcome_kind: 'error',
    error_kind: statusCode >= 500 ? 'server_error' : 'validation_error',
    code: String(payload.code || '').trim(),
    required: String(payload.required || '').trim(),
    message: String(payload.error || 'Scheduling failed').trim(),
    entity: {
      use: String(payload.use || '').trim(),
      next_step: String(payload.next_step || '').trim(),
      required: String(payload.required || '').trim(),
      status_code: statusCode
    },
    raw: payload
  };
}

export function deliveryActionContractForType(type = '') {
  const key = String(type || '').trim();
  const contract = DELIVERY_ACTION_CONTRACTS[key];
  return contract ? { ...contract } : null;
}

export function resolveDeliveryActionContract(type = '', raw = null) {
  return normalizeDeliveryActionContract(raw) || deliveryActionContractForType(type);
}

export function deliveryUiText(key = '', fallback = '') {
  const normalized = String(key || '').trim();
  if (!normalized) return String(fallback || '');
  return String(DELIVERY_UI_TEXT[normalized] || fallback || '');
}

export function connectorActionLabel(action = '', fallback = '') {
  const normalized = String(action || '').trim();
  if (!normalized) return String(fallback || '');
  return String(CONNECTOR_ACTION_LABELS[normalized] || fallback || '');
}

export function deliveryPrimaryActionDescriptors(type = '', draft = {}, options = {}) {
  const normalizedType = String(type || '').trim();
  const actionMode = String(draft?.actionMode || '').trim();
  const target = String(draft?.target || '').trim();
  const channel = String(draft?.channel || '').trim();
  const nextStep = String(draft?.nextStep || '').trim();
  const repoFullName = String(draft?.repoFullName || '').trim();
  const authorityReadyToResume = Boolean(options.authorityReadyToResume);
  const reportNeedsGoogleLoad = Boolean(options.reportNeedsGoogleLoad);
  if (normalizedType === 'social_post_pack') {
    if (actionMode === 'post_ready' && channel === 'x') {
      return [{ mode: 'execute', dataAction: 'x', label: authorityReadyToResume ? 'RESUME X EXECUTION' : 'EXECUTE IN X', requiresConnectReady: true }];
    }
    if (actionMode === 'post_ready' && channel === 'instagram') {
      return [{ mode: 'execute', dataAction: 'instagram', label: authorityReadyToResume ? 'RESUME INSTAGRAM EXECUTION' : 'EXECUTE IN INSTAGRAM' }];
    }
    if (actionMode === 'post_ready' && isIncluded(channel, ['reddit', 'indie_hackers'])) {
      return [{ mode: 'execute', dataAction: channel, label: authorityReadyToResume ? 'RESUME COMMUNITY HANDOFF' : `OPEN ${channel === 'reddit' ? 'REDDIT' : 'INDIE HACKERS'}` }];
    }
    if (actionMode === 'schedule_ready' && isIncluded(channel, ['x', 'instagram'])) {
      return [{ mode: 'schedule', dataAction: 'social', label: authorityReadyToResume ? 'RESUME SCHEDULE' : 'SCHEDULE POST' }];
    }
    return [];
  }
  if (normalizedType === 'email_pack') {
    if (actionMode === 'send_ready' && isIncluded(target, ['gmail', 'cait_resend'])) {
      return [{
        mode: 'execute',
        dataAction: 'gmail_send',
        label: target === 'cait_resend'
          ? (authorityReadyToResume ? 'RESUME CAIT RESEND' : 'SEND VIA CAIT RESEND')
          : (authorityReadyToResume ? 'RESUME GMAIL EXECUTION' : 'SEND IN GMAIL'),
        requiresConnectReady: target === 'gmail'
      }];
    }
    if (actionMode === 'schedule_ready' && isIncluded(target, ['gmail', 'cait_resend'])) {
      return [{ mode: 'schedule', dataAction: 'email', label: authorityReadyToResume ? 'RESUME SCHEDULE' : 'SCHEDULE EMAIL' }];
    }
    return [];
  }
  if (normalizedType === 'code_handoff') {
    if (target === 'github_repo' && repoFullName.includes('/')) {
      return [{ mode: 'execute', dataAction: 'github_pr', label: authorityReadyToResume ? 'RESUME GITHUB EXECUTION' : 'EXECUTE IN GITHUB', requiresConnectReady: true }];
    }
    return [];
  }
  if (normalizedType === 'report_bundle' && isIncluded(nextStep, ['execution_order', 'publish_followup'])) {
    return [{
      mode: 'execute',
      dataAction: 'report_next',
      label: reportNeedsGoogleLoad ? 'LOAD SOURCES & RESUME' : (authorityReadyToResume ? 'RESUME EXECUTION' : 'EXECUTE NEXT ORDER')
    }];
  }
  return [];
}

function collectControlOptionSets(fields = [], target = {}) {
  for (const field of Array.isArray(fields) ? fields : []) {
    if (!field || typeof field !== 'object') continue;
    if (field.kind === 'group' && Array.isArray(field.fields)) {
      collectControlOptionSets(field.fields, target);
      continue;
    }
    if (field.type !== 'select') continue;
    const key = String(field.key || '').trim();
    if (!key) continue;
    target[key] = (Array.isArray(field.options) ? field.options : [])
      .map((option) => ({
        value: String(option?.value || '').trim(),
        label: String(option?.label || option?.value || '').trim()
      }))
      .filter((option) => option.value);
  }
  return target;
}

export function deliveryControlFieldsForType(type = '', draft = {}, options = {}) {
  const normalizedType = String(type || '').trim();
  const isPlatformAdmin = Boolean(options.isPlatformAdmin);
  if (normalizedType === 'social_post_pack') {
    return [
      {
        kind: 'group',
        layout: 'publish-grid',
        fields: [
          {
            type: 'select',
            key: 'channel',
            label: 'CHANNEL',
            dataAttr: 'data-generic-delivery-channel',
            options: [
              { value: 'x', label: 'X' },
              { value: 'instagram', label: 'Instagram' },
              { value: 'reddit', label: 'Reddit' },
              { value: 'indie_hackers', label: 'Indie Hackers' },
              { value: 'export_only', label: 'Export only' }
            ]
          },
          {
            type: 'select',
            key: 'actionMode',
            label: 'MODE',
            dataAttr: 'data-generic-delivery-action-mode',
            options: [
              { value: 'draft_only', label: 'Draft only' },
              { value: 'post_ready', label: 'Post-ready' },
              { value: 'schedule_ready', label: 'Schedule-ready' }
            ]
          }
        ]
      },
      {
        type: 'textarea',
        key: 'postText',
        label: 'POST TEXT',
        dataAttr: 'data-generic-delivery-post-text',
        rows: 4,
        placeholder: 'Exact X/community post text',
        helperText: `${String(draft?.postText || '').length} chars${String(draft?.channel || '') === 'x' ? ' / 280 chars for X direct execution' : ''}`
      },
      ...(String(draft?.actionMode || '') === 'schedule_ready'
        ? [{
            type: 'datetime-local',
            key: 'scheduledAt',
            label: 'SCHEDULE AT',
            dataAttr: 'data-generic-delivery-schedule-at',
            helperText: String(options.scheduleLabel || '').trim()
          }]
        : []),
      ...(String(draft?.channel || '') === 'instagram'
        ? [
            {
              type: 'input',
              key: 'instagramAccessToken',
              label: 'INSTAGRAM ACCESS TOKEN',
              dataAttr: 'data-generic-delivery-instagram-token',
              placeholder: 'Meta / Instagram access token'
            },
            {
              type: 'input',
              key: 'instagramUserId',
              label: 'INSTAGRAM USER ID',
              dataAttr: 'data-generic-delivery-instagram-user-id',
              placeholder: 'Instagram business or creator user ID'
            },
            {
              type: 'input',
              key: 'instagramMediaUrl',
              label: 'MEDIA URL',
              dataAttr: 'data-generic-delivery-instagram-media-url',
              placeholder: 'Public image URL',
              helperText: 'Current executor uses explicit credentials plus one public image URL per post.'
            }
          ]
        : [])
    ];
  }
  if (normalizedType === 'email_pack') {
    return [
      {
        kind: 'group',
        layout: 'publish-grid',
        fields: [
          {
            type: 'select',
            key: 'target',
            label: 'TARGET',
            dataAttr: 'data-generic-delivery-email-target',
            options: [
              ...(isPlatformAdmin ? [{ value: 'cait_resend', label: 'CAIt Resend' }] : []),
              { value: 'gmail', label: 'Gmail' },
              { value: 'export_only', label: 'Export only' }
            ]
          },
          {
            type: 'select',
            key: 'actionMode',
            label: 'MODE',
            dataAttr: 'data-generic-delivery-email-mode',
            options: [
              { value: 'draft_only', label: 'Draft only' },
              { value: 'send_ready', label: 'Send-ready' },
              { value: 'schedule_ready', label: 'Schedule-ready' }
            ]
          }
        ]
      },
      ...(String(draft?.actionMode || '') === 'schedule_ready'
        ? [{
            type: 'datetime-local',
            key: 'scheduledAt',
            label: 'SCHEDULE AT',
            dataAttr: 'data-generic-delivery-schedule-at',
            helperText: String(options.scheduleLabel || '').trim()
          }]
        : []),
      {
        type: 'input',
        key: 'recipientEmail',
        label: 'RECIPIENT',
        dataAttr: 'data-generic-delivery-email-to',
        placeholder: 'user@example.com'
      },
      ...(String(draft?.target || '') === 'cait_resend'
        ? [
            {
              type: 'input',
              key: 'senderEmail',
              label: 'FROM EMAIL',
              dataAttr: 'data-generic-delivery-email-from',
              placeholder: 'sales@your-domain.com',
              helperText: 'CAIt signup welcome email only uses the Cloudflare default. Sales mail must use the sender you specify here.'
            },
            {
              type: 'input',
              key: 'replyToEmail',
              label: 'REPLY-TO EMAIL',
              dataAttr: 'data-generic-delivery-email-reply-to',
              placeholder: 'Optional reply-to email'
            }
          ]
        : []),
      {
        type: 'input',
        key: 'emailSubject',
        label: 'SUBJECT',
        dataAttr: 'data-generic-delivery-email-subject',
        placeholder: 'Subject'
      },
      {
        type: 'textarea',
        key: 'emailBody',
        label: 'EMAIL BODY',
        dataAttr: 'data-generic-delivery-email-body',
        rows: 6,
        placeholder: 'Exact email body'
      }
    ];
  }
  if (normalizedType === 'code_handoff') {
    return [
      {
        kind: 'group',
        layout: 'publish-grid',
        fields: [
          {
            type: 'select',
            key: 'target',
            label: 'TARGET',
            dataAttr: 'data-generic-delivery-target',
            options: [
              { value: 'github_repo', label: 'GitHub' },
              { value: 'local_terminal', label: 'Local terminal' },
              { value: 'export_only', label: 'Export only' }
            ]
          },
          {
            type: 'select',
            key: 'executionMode',
            label: 'MODE',
            dataAttr: 'data-generic-delivery-execution-mode',
            options: [
              { value: 'draft_pr', label: 'Draft / PR' },
              { value: 'apply_now', label: 'Apply now' }
            ]
          }
        ]
      },
      {
        type: 'input',
        key: 'repoFullName',
        label: 'REPOSITORY',
        dataAttr: 'data-generic-delivery-repo',
        placeholder: 'owner/repo',
        listId: String(options.repoDatalistId || '').trim(),
        extraHtml: String(options.repoDatalistHtml || '')
      }
    ];
  }
  if (normalizedType === 'report_bundle') {
    const authority = draft?.authorityRequired && typeof draft.authorityRequired === 'object' ? draft.authorityRequired : {};
    const needsChannel = Boolean(authority.requiredChannelSelection || authority.required_channel_selection);
    const candidateChannels = Array.isArray(authority.channelCandidates || authority.channel_candidates)
      ? (authority.channelCandidates || authority.channel_candidates).map((item) => String(item || '').trim()).filter(Boolean)
      : [];
    const defaultChannelOptions = [
      { value: 'x', label: 'X' },
      { value: 'instagram', label: 'Instagram' },
      { value: 'reddit', label: 'Reddit' },
      { value: 'indie_hackers', label: 'Indie Hackers' },
      { value: 'email', label: 'Email' },
      { value: 'github', label: 'GitHub' },
      { value: 'export_only', label: 'Export only' }
    ];
    const channelOptions = candidateChannels.length
      ? defaultChannelOptions.filter((option) => candidateChannels.includes(option.value))
      : defaultChannelOptions;
    return [
      {
        kind: 'group',
        layout: 'publish-grid',
        fields: [
          {
            type: 'select',
            key: 'nextStep',
            label: 'NEXT STEP',
            dataAttr: 'data-generic-delivery-next-step',
            options: [
              { value: 'action_plan', label: 'Action plan' },
              { value: 'execution_order', label: 'Execution order' },
              { value: 'publish_followup', label: 'Publish follow-up' }
            ]
          },
          ...(needsChannel
            ? [{
                type: 'select',
                key: 'channel',
                label: 'EXECUTION CHANNEL',
                dataAttr: 'data-generic-delivery-channel',
                options: [
                  { value: '', label: 'Select channel' },
                  ...channelOptions
                ]
              }]
            : [])
        ]
      }
    ];
  }
  return [];
}

export function deliveryControlOptionSetsForType(type = '', draft = {}, options = {}) {
  return collectControlOptionSets(deliveryControlFieldsForType(type, draft, options), {});
}

export function deliveryDraftDefaultsForType(type = '', options = {}) {
  const normalizedType = String(type || '').trim();
  if (normalizedType === 'social_post_pack') {
    return {
      channel: String(options.preferredChannel || '').trim() || (options.xConnected ? 'x' : 'reddit'),
      actionMode: String(options.preferredActionMode || '').trim() || 'draft_only',
      postText: String(options.suggestedPostText || ''),
      scheduledAt: String(options.defaultScheduledAt || '')
    };
  }
  if (normalizedType === 'email_pack') {
    return {
      target: String(options.defaultEmailTarget || '').trim() || (options.isPlatformAdmin ? 'cait_resend' : 'gmail'),
      actionMode: 'draft_only',
      recipientEmail: '',
      senderEmail: '',
      replyToEmail: '',
      emailSubject: String(options.defaultEmailSubject || ''),
      emailBody: String(options.defaultEmailBody || ''),
      scheduledAt: String(options.defaultScheduledAt || '')
    };
  }
  if (normalizedType === 'code_handoff') {
    return {
      target: String(options.defaultCodeTarget || '').trim() || (options.githubConnected ? 'github_repo' : 'local_terminal'),
      executionMode: 'draft_pr',
      repoFullName: String(options.preferredRepoFullName || '').trim()
    };
  }
  if (normalizedType === 'report_bundle') {
    return {
      nextStep: 'action_plan'
    };
  }
  return {};
}

export function validateDeliveryExecutionDraft(type = '', draft = {}, options = {}) {
  const normalizedType = String(type || '').trim();
  const channel = String(draft?.channel || '').trim();
  const actionMode = String(draft?.actionMode || '').trim();
  const target = String(draft?.target || '').trim();
  const nextStep = String(draft?.nextStep || '').trim();
  if (normalizedType === 'social_post_pack') {
    const postText = String(draft?.postText || '').trim();
    if (channel === 'x' && !postText) return { ok: false, error: 'Write the exact X post text first.' };
    if (channel === 'x' && postText.length > 280) return { ok: false, error: `X post is ${postText.length} characters. Shorten it to 280 or less before posting.` };
    if (channel === 'instagram') {
      if (!postText) return { ok: false, error: 'Write the Instagram caption first.' };
      if (!String(draft?.instagramAccessToken || '').trim() || !String(draft?.instagramUserId || '').trim() || !String(draft?.instagramMediaUrl || '').trim()) {
        return { ok: false, error: 'Instagram publish requires access token, Instagram user ID, and a public media URL.' };
      }
    }
    if (actionMode === 'schedule_ready' && !String(draft?.scheduledAt || '').trim()) {
      return { ok: false, error: 'Choose when CAIt should schedule this post.' };
    }
    return { ok: true };
  }
  if (normalizedType === 'email_pack') {
    const to = String(draft?.recipientEmail || '').trim();
    const subject = String(draft?.emailSubject || '').trim();
    const text = String(draft?.emailBody || '').trim();
    if (!to || !subject || !text) {
      return { ok: false, error: actionMode === 'schedule_ready'
        ? 'Recipient, subject, and body are required before scheduling email.'
        : (target === 'cait_resend'
            ? 'Recipient, from email, subject, and email body are required before CAIt Resend execution.'
            : 'Recipient, subject, and email body are required before Gmail execution.') };
    }
    if (target === 'cait_resend' && !String(draft?.senderEmail || '').trim()) {
      return { ok: false, error: actionMode === 'schedule_ready'
        ? 'FROM EMAIL is required before scheduling CAIt Resend email.'
        : 'Recipient, from email, subject, and email body are required before CAIt Resend execution.' };
    }
    if (actionMode === 'schedule_ready' && !String(draft?.scheduledAt || '').trim()) {
      return { ok: false, error: 'Choose when CAIt should schedule this email.' };
    }
    return { ok: true };
  }
  if (normalizedType === 'code_handoff') {
    if (target === 'github_repo' && !String(draft?.repoFullName || '').trim().includes('/')) {
      return { ok: false, error: 'Select the GitHub repository first.' };
    }
    return { ok: true };
  }
  if (normalizedType === 'report_bundle') {
    if (nextStep === 'action_plan') return { ok: false, error: 'Action plan mode prepares the next step but does not auto-run it.' };
    const googleRequested = Array.isArray(options.googleRequested) ? options.googleRequested : [];
    if (googleRequested.includes('gsc') && !String(draft?.googleSearchConsoleSite || '').trim()) return { ok: false, error: 'Select the Search Console site first.' };
    if (googleRequested.includes('ga4') && !String(draft?.googleGa4Property || '').trim()) return { ok: false, error: 'Select the GA4 property first.' };
    if (googleRequested.includes('drive') && !String(draft?.googleDriveFileId || '').trim()) return { ok: false, error: 'Select the Google Drive file first.' };
    if (googleRequested.includes('calendar') && !String(draft?.googleCalendarId || '').trim()) return { ok: false, error: 'Select the Google Calendar first.' };
    if (googleRequested.includes('gmail') && !String(draft?.googleGmailLabelId || '').trim()) return { ok: false, error: 'Select the Gmail label first.' };
    return { ok: true };
  }
  return { ok: true };
}

export function resolveDeliveryExecutionAction(type = '', draft = {}) {
  const normalizedType = String(type || '').trim();
  const channel = String(draft?.channel || '').trim();
  const actionMode = String(draft?.actionMode || '').trim();
  const target = String(draft?.target || '').trim();
  const nextStep = String(draft?.nextStep || '').trim();
  if (normalizedType === 'social_post_pack' && actionMode === 'post_ready') {
    if (channel === 'x') return { kind: 'x_post' };
    if (channel === 'instagram') return { kind: 'instagram_post' };
    if (channel === 'reddit') return { kind: 'reddit_handoff' };
    if (channel === 'indie_hackers') return { kind: 'indie_hackers_handoff' };
    return { kind: 'export_only' };
  }
  if (normalizedType === 'email_pack' && actionMode === 'send_ready') {
    if (target === 'cait_resend') return { kind: 'resend_send' };
    if (target === 'gmail') return { kind: 'gmail_send' };
    return { kind: 'export_only' };
  }
  if (normalizedType === 'code_handoff') {
    if (target === 'github_repo') return { kind: 'github_pr' };
    if (target === 'local_terminal') return { kind: 'local_terminal_copy' };
    return { kind: 'export_only' };
  }
  if (normalizedType === 'report_bundle' && (nextStep === 'execution_order' || nextStep === 'publish_followup')) {
    return { kind: 'report_next' };
  }
  return { kind: 'none' };
}

export function resolveDeliveryScheduleAction(type = '', draft = {}) {
  const normalizedType = String(type || '').trim();
  const channel = String(draft?.channel || '').trim();
  const actionMode = String(draft?.actionMode || '').trim();
  const target = String(draft?.target || '').trim();
  if (normalizedType === 'social_post_pack' && actionMode === 'schedule_ready') {
    if (channel === 'x') return { kind: 'x_post' };
    if (channel === 'instagram') return { kind: 'instagram_post' };
    return { kind: 'none' };
  }
  if (normalizedType === 'email_pack' && actionMode === 'schedule_ready') {
    if (target === 'cait_resend') return { kind: 'resend_send' };
    if (target === 'gmail') return { kind: 'gmail_send' };
  }
  return { kind: 'none' };
}

export function normalizeDeliveryOutcomePayload(actionKind = '', payload = {}, fallbackEntity = {}) {
  const normalizedActionKind = String(actionKind || '').trim();
  const outcomeKind = String(payload?.outcome_kind || '').trim();
  const message = String(payload?.message || '').trim();
  const entity = payload?.entity && typeof payload.entity === 'object'
    ? payload.entity
    : (fallbackEntity && typeof fallbackEntity === 'object' ? fallbackEntity : {});
  return {
    ok: payload?.ok !== false,
    actionKind: normalizedActionKind,
    outcomeKind,
    message,
    entity,
    raw: payload?.raw && typeof payload.raw === 'object' ? payload.raw : payload
  };
}

export function deliveryOutcomePresentation(actionKind = '', payload = {}, options = {}) {
  const normalized = normalizeDeliveryOutcomePayload(actionKind, payload, options.fallbackEntity || {});
  const entity = normalized.entity || {};
  const repo = String(options.repoFullName || entity.repo || '').trim();
  const targetLabel = String(options.targetLabel || '').trim();
  if (normalized.actionKind === 'copy_article') {
    return {
      flash: normalized.message || 'Article copied.'
    };
  }
  if (normalized.actionKind === 'prepare_publish_order') {
    return {
      flash: normalized.message || `Publish draft prepared for ${String(entity.path_preview || '').trim()}. Review it, then SEND ORDER when ready.`,
      status: 'Publish follow-up prepared.\n\nReview the draft in CAIt Chat, then SEND ORDER when ready.'
    };
  }
  if (normalized.actionKind === 'open_cli_help') {
    return {
      flash: normalized.message || 'Open CLI help for local terminal handoff details.'
    };
  }
  if (normalized.actionKind === 'x_post') {
    return {
      flash: normalized.message || `Posted to X: ${entity.url || entity.connector_action_id || ''}`,
      status: `X post completed.\n\nPosted through ${entity.account_handle || 'the connected X account'} after explicit confirmation.`,
      body: [
        `Posted to X through ${entity.account_handle || 'the connected X account'} after explicit confirmation.`,
        '',
        entity.url || `Tweet ID: ${entity.connector_action_id || ''}`
      ].filter(Boolean).join('\n')
    };
  }
  if (normalized.actionKind === 'instagram_post') {
    return {
      flash: normalized.message || `Published to Instagram: ${entity.connector_action_id || ''}`
    };
  }
  if (normalized.actionKind === 'gmail_send' || normalized.actionKind === 'resend_send') {
    const mailLabel = targetLabel || (normalized.actionKind === 'resend_send' ? 'CAIt Resend' : 'Gmail');
    return {
      flash: normalized.message || `${mailLabel} sent to ${entity.to || ''}.`,
      status: `${mailLabel} send completed.`,
      body: [
        `Sent via ${mailLabel} executor.`,
        '',
        entity.to ? `To: ${entity.to}` : '',
        entity.subject ? `Subject: ${entity.subject}` : '',
        entity.connector_action_id ? `Message ID: ${entity.connector_action_id}` : ''
      ].filter(Boolean).join('\n')
    };
  }
  if (normalized.actionKind === 'github_pr') {
    return {
      flash: normalized.message || `GitHub PR handoff created: ${entity.pull_request_url || entity.pull_request_number || ''}`,
      status: 'GitHub PR handoff created.',
      body: [
        repo ? `Created a GitHub PR handoff for ${repo}.` : 'Created a GitHub PR handoff.',
        '',
        entity.pull_request_url || '',
        entity.branch ? `Branch: ${entity.branch}` : '',
        Array.isArray(entity.files) && entity.files.length ? `Files: ${entity.files.map((file) => file.path).join(', ')}` : ''
      ].filter(Boolean).join('\n')
    };
  }
  if (normalized.actionKind === 'report_next') {
    return {
      flash: normalized.message || (entity.job_id
        ? `Follow-up order started: ${String(entity.job_id).slice(0, 8)}`
        : 'Follow-up order started.')
    };
  }
  if (normalized.outcomeKind === 'scheduled') {
    return {
      flash: normalized.message || 'Scheduled action created.'
    };
  }
  return {
    flash: normalized.message || 'Execution completed.'
  };
}

export function deliveryErrorPresentation(actionKind = '', payload = {}, options = {}) {
  const normalizedActionKind = String(actionKind || payload?.action_kind || '').trim();
  const errorKind = String(payload?.error_kind || '').trim();
  const message = String(payload?.message || payload?.error || 'Execution failed.').trim();
  const entity = payload?.entity && typeof payload.entity === 'object' ? payload.entity : {};
  const targetLabel = String(options.targetLabel || '').trim();
  if (errorKind === 'authority_required') {
    if (normalizedActionKind === 'x_post') {
      return { flash: message || 'X executor paused until the required connector is connected.', tone: 'warn' };
    }
    if (normalizedActionKind === 'github_pr') {
      return { flash: message || 'GitHub executor paused until the required connector is connected.', tone: 'warn' };
    }
    if (normalizedActionKind === 'gmail_send' || normalizedActionKind === 'resend_send') {
      return { flash: message || `${targetLabel || (normalizedActionKind === 'resend_send' ? 'CAIt Resend' : 'Gmail')} executor paused until the required connector is connected.`, tone: 'warn' };
    }
    return { flash: message || 'Execution paused until the required connector is connected.', tone: 'warn' };
  }
  if (errorKind === 'confirmation_required') {
    return { flash: message || 'Execution paused until the exact account and action are approved.', tone: 'warn' };
  }
  if (errorKind === 'validation_error') {
    return { flash: message || 'Fill in the required executor fields first.', tone: 'warn' };
  }
  if (errorKind === 'server_error') {
    return { flash: message || 'Execution failed on the server.', tone: 'warn' };
  }
  return {
    flash: [
      message,
      entity.next_step ? `Next: ${entity.next_step}` : '',
      entity.use ? `Use: ${entity.use}` : ''
    ].filter(Boolean).join('\n\n'),
    tone: 'warn'
  };
}

export function deliveryExecutionPromptPresentation(actionKind = '', options = {}) {
  const normalizedActionKind = String(actionKind || '').trim();
  const targetLabel = String(options.targetLabel || '').trim();
  const scheduleLabel = String(options.scheduleLabel || '').trim();
  const repoFullName = String(options.repoFullName || '').trim();
  if (normalizedActionKind === 'github_pr') {
    return {
      confirm: `Create a GitHub PR handoff in ${repoFullName}?\n\nCAIt will create a sandbox branch, add a technical handoff file, and open a pull request.`,
      stopped: 'GitHub executor stopped for this delivery. Clear the stop state to retry.'
    };
  }
  if (normalizedActionKind === 'x_post') {
    const xAccountLabel = String(options.xAccountLabel || options.x_account_label || 'connected X account').trim();
    return {
      confirm: `Post this exact text to ${xAccountLabel} through the OAuth-connected X account?\n\n${String(options.postText || '').trim()}\n\nCAIt will not post anything else.`,
      stopped: 'X execution stopped for this delivery. Clear the stop state to retry.'
    };
  }
  if (normalizedActionKind === 'instagram_post') {
    return {
      confirm: `Publish this Instagram post now?\n\nCaption:\n${String(options.postText || '').trim()}`,
      stopped: 'Instagram execution stopped for this delivery. Clear the stop state to retry.'
    };
  }
  if (normalizedActionKind === 'gmail_send' || normalizedActionKind === 'resend_send') {
    return {
      confirm: `Send this email through ${targetLabel || (normalizedActionKind === 'resend_send' ? 'CAIt Resend' : 'Gmail')} now?\n\nTo: ${String(options.recipientEmail || '').trim()}\nSubject: ${String(options.emailSubject || '').trim()}`,
      stopped: `${targetLabel || (normalizedActionKind === 'resend_send' ? 'CAIt Resend' : 'Gmail')} executor stopped for this delivery. Clear the stop state to retry.`
    };
  }
  if (normalizedActionKind === 'report_next') {
    return {
      confirm: String(options.nextStep || '') === 'publish_followup'
        ? 'Run the publish follow-up order now?'
        : 'Run the next execution order now?',
      stopped: 'Report executor stopped for this delivery. Clear the stop state to retry.'
    };
  }
  return {
    confirm: '',
    stopped: 'Execution stopped for this delivery. Clear the stop state to retry.'
  };
}

export function deliverySchedulePromptPresentation(actionKind = '', options = {}) {
  const normalizedActionKind = String(actionKind || '').trim();
  const scheduleLabel = String(options.scheduleLabel || '').trim();
  if (normalizedActionKind === 'x_post' || normalizedActionKind === 'instagram_post') {
    const channelLabel = String(options.channelLabel || (normalizedActionKind === 'instagram_post' ? 'Instagram post' : 'X post')).trim();
    const xAccountLabel = String(options.xAccountLabel || options.x_account_label || 'connected X account').trim();
    return {
      confirm: normalizedActionKind === 'x_post'
        ? `Schedule this ${channelLabel} for ${scheduleLabel} on ${xAccountLabel}?\n\n${String(options.postText || '').trim()}`
        : `Schedule this ${channelLabel} for ${scheduleLabel}?`
    };
  }
  if (normalizedActionKind === 'gmail_send' || normalizedActionKind === 'resend_send') {
    return {
      confirm: `Schedule this email for ${scheduleLabel}?\n\nTo: ${String(options.recipientEmail || '').trim()}\nSubject: ${String(options.emailSubject || '').trim()}`
    };
  }
  return { confirm: '' };
}

export function deliveryExecutorStatePresentation(actionKind = '', options = {}) {
  const normalizedActionKind = String(actionKind || '').trim();
  if (options.state === 'stopped') {
    return {
      flash: normalizedActionKind
        ? deliveryExecutionPromptPresentation(normalizedActionKind, options).stopped
        : 'Execution is stopped for this delivery. Clear the stop state to run it again.',
      tone: normalizedActionKind ? 'info' : 'warn'
    };
  }
  if (options.state === 'paused') {
    return {
      flash: 'Execution is paused until the required connector is connected.',
      tone: 'warn'
    };
  }
  if (options.state === 'export_only') {
    return {
      flash: 'Export-only mode does not execute directly. Copy the handoff or draft the next order.',
      tone: 'info'
    };
  }
  return { flash: '', tone: 'info' };
}

export function deliveryExecutionSideEffectPlan(actionKind = '', payload = {}) {
  const normalized = normalizeDeliveryOutcomePayload(actionKind, payload);
  if (normalized.actionKind === 'report_next') {
    return {
      refresh: true,
      selectReturnedJob: true,
      returnedJobId: String(normalized.entity?.job_id || '').trim(),
      clearAuthority: true
    };
  }
  if (normalized.actionKind === 'x_post' || normalized.actionKind === 'github_pr' || normalized.actionKind === 'gmail_send' || normalized.actionKind === 'resend_send') {
    return {
      refresh: false,
      selectReturnedJob: false,
      returnedJobId: '',
      clearAuthority: true
    };
  }
  return {
    refresh: false,
    selectReturnedJob: false,
    returnedJobId: '',
    clearAuthority: false
  };
}

export function deliveryScheduleSideEffectPlan(actionKind = '', payload = {}) {
  const normalized = normalizeDeliveryOutcomePayload(actionKind, payload);
  if (normalized.outcomeKind === 'scheduled') {
    return {
      refresh: true
    };
  }
  return {
    refresh: false
  };
}

export function deliveryLocalExecutionPlan(actionKind = '', options = {}) {
  const normalizedActionKind = String(actionKind || '').trim();
  if (normalizedActionKind === 'reddit_handoff') {
    return {
      kind: 'open_community',
      channel: 'reddit',
      source: 'delivery_social_execute'
    };
  }
  if (normalizedActionKind === 'indie_hackers_handoff') {
    return {
      kind: 'open_community',
      channel: 'indie_hackers',
      source: 'delivery_social_execute'
    };
  }
  if (normalizedActionKind === 'local_terminal_copy') {
    return {
      kind: 'copy_command',
      copyLabel: 'Executor command copied.'
    };
  }
  return null;
}

export function googleIncludeGroupsForCapabilities(capabilities = []) {
  const groups = new Set();
  for (const capability of Array.isArray(capabilities) ? capabilities : []) {
    const normalized = String(capability || '').trim().toLowerCase();
    if (normalized === 'google.read_gsc') groups.add('gsc');
    else if (normalized === 'google.read_ga4') groups.add('ga4');
    else if (normalized === 'google.read_drive' || normalized === 'google.read_docs' || normalized === 'google.read_sheets' || normalized === 'google.read_presentations') groups.add('drive');
    else if (normalized === 'google.read_calendar' || normalized === 'google.write_calendar' || normalized === 'google.create_meet') groups.add('calendar');
    else if (normalized === 'google.read_gmail') groups.add('gmail');
  }
  return Array.from(groups);
}

export function deliveryGoogleSourceFlowPlan(draft = null, authority = null, options = {}) {
  const requested = Array.isArray(draft?.googleIncludeGroups) && draft.googleIncludeGroups.length
    ? draft.googleIncludeGroups
    : googleIncludeGroupsForCapabilities(authority?.missingConnectorCapabilities || []);
  const requestedGroups = Array.from(new Set(requested.map((item) => String(item || '').trim().toLowerCase()).filter(Boolean)));
  const assetCounts = options.assetCounts && typeof options.assetCounts === 'object' ? options.assetCounts : {};
  const summary = [
    requestedGroups.includes('gsc') ? `${Number(assetCounts.gsc || 0)} GSC site${Number(assetCounts.gsc || 0) === 1 ? '' : 's'}` : '',
    requestedGroups.includes('ga4') ? `${Number(assetCounts.ga4 || 0)} GA4 propert${Number(assetCounts.ga4 || 0) === 1 ? 'y' : 'ies'}` : '',
    requestedGroups.includes('drive') ? `${Number(assetCounts.drive || 0)} Drive file${Number(assetCounts.drive || 0) === 1 ? '' : 's'}` : '',
    requestedGroups.includes('calendar') ? `${Number(assetCounts.calendar || 0)} calendar${Number(assetCounts.calendar || 0) === 1 ? '' : 's'}` : '',
    requestedGroups.includes('gmail') ? `${Number(assetCounts.gmail || 0)} Gmail label${Number(assetCounts.gmail || 0) === 1 ? '' : 's'}` : ''
  ].filter(Boolean).join(' · ');
  const needsLoad = Boolean(options.authorityReadyToResume)
    && requestedGroups.length > 0
    && !draft?.googleAssets
    && !draft?.googleAssetsLoading;
  return {
    requestedGroups,
    summary,
    needsLoad
  };
}

export function deliveryAuthorityOwnerLabel(authority = null, options = {}) {
  const explicit = String(authority?.ownerLabel || authority?.owner_label || '').trim();
  if (explicit) return explicit;
  const agentName = String(options.agentName || '').trim();
  if (agentName) return agentName;
  const source = String(authority?.source || '').trim().toLowerCase();
  const deliverableType = String(options.deliverableType || '').trim();
  if (source.includes('report')) return 'Team Leader';
  if (deliverableType === 'report_bundle') return 'Team Leader';
  if (source.includes('github')) return 'CTO Team Leader';
  if (source.includes('x_') || source === 'x_executor') return 'CMO Team Leader';
  return 'CAIt';
}

export function describeDeliveryAuthorityNeed(capabilities = [], connectors = []) {
  const normalizedCapabilities = (Array.isArray(capabilities) ? capabilities : []).map((item) => String(item || '').trim().toLowerCase());
  const normalizedConnectors = (Array.isArray(connectors) ? connectors : []).map((item) => String(item || '').trim().toLowerCase());
  const parts = [];
  if (normalizedCapabilities.includes('github.write_pr')) parts.push('GitHub pull request authority');
  if (normalizedCapabilities.includes('x.post')) parts.push('X posting authority');
  if (normalizedCapabilities.includes('google.read_gsc')) parts.push('a Search Console source');
  if (normalizedCapabilities.includes('google.read_ga4')) parts.push('a GA4 property');
  if (normalizedCapabilities.includes('google.read_drive') || normalizedCapabilities.includes('google.read_docs') || normalizedCapabilities.includes('google.read_sheets') || normalizedCapabilities.includes('google.read_presentations')) parts.push('a Google Drive source');
  if (normalizedCapabilities.includes('google.read_calendar')) parts.push('a Google Calendar source');
  if (normalizedCapabilities.includes('google.read_gmail')) parts.push('a Gmail source');
  if (normalizedCapabilities.includes('google.send_gmail')) parts.push('Gmail send authority');
  if (!parts.length && normalizedConnectors.includes('github')) parts.push('a GitHub connection');
  if (!parts.length && normalizedConnectors.includes('google')) parts.push('a Google connection');
  if (!parts.length && normalizedConnectors.includes('x')) parts.push('an X connection');
  return parts.length ? parts.join(', ') : 'additional authority';
}

export function deliveryAuthoritySummary(authority = null, options = {}) {
  if (!authority) return '';
  const ownerLabel = deliveryAuthorityOwnerLabel(authority, options);
  const needText = describeDeliveryAuthorityNeed(authority.missingConnectorCapabilities, authority.missingConnectors);
  const connectorLine = authority.missingConnectors?.length ? `Connect: ${authority.missingConnectors.join(', ')}` : '';
  const capabilityLine = authority.missingConnectorCapabilities?.length ? `Needed for: ${authority.missingConnectorCapabilities.join(', ')}` : '';
  const repoLine = authority.missingRepositorySelection ? 'Select a GitHub repository before resuming.' : '';
  const candidatesLine = authority.repoCandidates?.length ? `Suggested repos: ${authority.repoCandidates.join(', ')}` : '';
  const channelLine = authority.missingChannelSelection ? 'Select a publishing channel before resuming.' : '';
  const channelCandidatesLine = authority.channelCandidates?.length ? `Suggested channels: ${authority.channelCandidates.join(', ')}` : '';
  const statusLine = authority.resolved
    ? `${ownerLabel} can continue now. Press resume to continue this execution.`
    : `${ownerLabel} paused and asked for ${needText}. Connect it, or cancel this execution for now.`;
  return [
    `${ownerLabel} needs something before this execution can continue.`,
    authority.reason,
    connectorLine,
    capabilityLine,
    repoLine,
    candidatesLine,
    channelLine,
    channelCandidatesLine,
    statusLine
  ].filter(Boolean).join('\n');
}

export function deliveryGoogleSourceFieldDescriptors(requestedGroups = []) {
  const values = Array.isArray(requestedGroups) ? requestedGroups : [];
  return values.map((group) => {
    if (group === 'gsc') return { group, key: 'googleSearchConsoleSite', label: 'SEARCH CONSOLE SITE', attr: 'google-gsc', emptyLabel: 'Select site' };
    if (group === 'ga4') return { group, key: 'googleGa4Property', label: 'GA4 PROPERTY', attr: 'google-ga4', emptyLabel: 'Select property' };
    if (group === 'drive') return { group, key: 'googleDriveFileId', label: 'GOOGLE DRIVE FILE', attr: 'google-drive', emptyLabel: 'Select file' };
    if (group === 'calendar') return { group, key: 'googleCalendarId', label: 'GOOGLE CALENDAR', attr: 'google-calendar', emptyLabel: 'Select calendar' };
    if (group === 'gmail') return { group, key: 'googleGmailLabelId', label: 'GMAIL LABEL', attr: 'google-gmail', emptyLabel: 'Select label' };
    return null;
  }).filter(Boolean);
}

export function deliveryGoogleSourceLoadLabel(options = {}) {
  return options.loading ? 'LOADING...' : 'LOAD GOOGLE SOURCES';
}

export function deliveryPublishTargetInstruction(target = '') {
  const normalizedTarget = String(target || '').trim();
  if (normalizedTarget === 'github_repo') {
    return 'Use GitHub-connected publishing. Create a branch or pull request that adds this article to the site repository at the requested URL path.';
  }
  if (normalizedTarget === 'local_terminal') {
    return 'Prepare a local terminal handoff. Return the exact file path, file content, and the minimal CAIt CLI run-local command plan needed to place the article safely.';
  }
  return 'Return a publish-ready export package and the next action needed to publish externally.';
}

export function deliveryPublishFieldDescriptors(draft = {}, article = null) {
  return [
    {
      type: 'select',
      key: 'target',
      label: 'TARGET',
      dataAttr: 'data-delivery-publish-target',
      options: [
        { value: 'github_repo', label: 'GitHub publish flow' },
        { value: 'local_terminal', label: 'Local terminal handoff' },
        { value: 'export_only', label: 'Export only' }
      ]
    },
    {
      type: 'input',
      key: 'pathPrefix',
      label: 'PATH PREFIX',
      dataAttr: 'data-delivery-publish-prefix',
      placeholder: '/blog'
    },
    {
      type: 'input',
      key: 'slug',
      label: 'SLUG',
      dataAttr: 'data-delivery-publish-slug',
      placeholder: 'article-slug',
      fallbackValue: String(article?.suggestedSlug || '').trim()
    },
    {
      type: 'select',
      key: 'publishMode',
      label: 'MODE',
      dataAttr: 'data-delivery-publish-mode',
      options: [
        { value: 'draft_pr', label: 'Draft / PR' },
        { value: 'publish_now', label: 'Publish now' }
      ]
    }
  ];
}

export function deliveryPublishActionDescriptors(draft = {}, options = {}) {
  const normalizedTarget = String(draft?.target || '').trim();
  const githubReady = Boolean(options.githubReady);
  return [
    { kind: 'copy_article', label: 'COPY ARTICLE', dataAttr: 'data-copy-article-draft' },
    { kind: 'prepare_publish_order', label: 'PREPARE PUBLISH ORDER', dataAttr: 'data-prepare-publish-order' },
    ...(normalizedTarget === 'github_repo' && !githubReady
      ? [{ kind: 'connect_github', label: connectorActionLabel('connect_github'), dataAttr: 'data-chat-action', dataValue: 'connect_github' }]
      : []),
    ...(normalizedTarget === 'local_terminal'
      ? [{ kind: 'open_cli_help', label: 'OPEN CLI HELP', dataAttr: 'data-open-cli-help', dataValue: '1' }]
      : [])
  ];
}

export function deliveryPublishSectionDescriptors() {
  return [
    { kind: 'intro' },
    { kind: 'meta' },
    { kind: 'fields' },
    { kind: 'preview' },
    { kind: 'actions' }
  ];
}

export function genericDeliverableSectionDescriptors() {
  return [
    { kind: 'intro' },
    { kind: 'controls' },
    { kind: 'reason' },
    { kind: 'authority' },
    { kind: 'google_sources' },
    { kind: 'stopped' },
    { kind: 'actions' }
  ];
}

export function prepareDeliveryPublishContractPayload(draft = {}, options = {}) {
  return {
    field_descriptors: deliveryPublishFieldDescriptors(draft, options.article || null),
    action_descriptors: deliveryPublishActionDescriptors(draft, {
      githubReady: Boolean(options.githubReady)
    }),
    suggested_primary_action: String(draft?.target || '').trim() === 'github_repo' && !options.githubReady
      ? 'connect_github'
      : 'prepare_publish_order'
  };
}

function firstNonEmptyLine(value = '') {
  return String(value || '').trim().split(/\n/).map((line) => line.trim()).find(Boolean) || '';
}

export function buildDeliveryExecutionDraftDefaults(type = '', body = {}, options = {}) {
  const current = options.current || {};
  const connectors = options.connectors || {};
  const executorPreferences = options.executorPreferences || {};
  const xPrefs = executorPreferences.x || {};
  const googlePrefs = executorPreferences.google || {};
  const githubPrefs = executorPreferences.github || {};
  const githubConnected = Boolean(current?.githubLinked || connectors?.github?.connected);
  const draftDefaults = deliveryDraftDefaultsForType(type, {
    preferredChannel: xPrefs.channel,
    preferredActionMode: xPrefs.actionMode,
    xConnected: Boolean(connectors?.x?.connected),
    suggestedPostText: firstNonEmptyLine(body.content || ''),
    defaultScheduledAt: '',
    isPlatformAdmin: Boolean(current?.isPlatformAdmin),
    defaultEmailTarget: current?.isPlatformAdmin ? 'cait_resend' : 'gmail',
    defaultEmailSubject: String(body.title || '').trim() || 'Email draft',
    defaultEmailBody: String(body.content || '').trim(),
    githubConnected,
    defaultCodeTarget: githubConnected ? 'github_repo' : 'local_terminal',
    preferredRepoFullName: String(githubPrefs.repoFullName || '').trim()
  });
  draftDefaults.googleSearchConsoleSite = String(googlePrefs.searchConsoleSite || '').trim();
  draftDefaults.googleGa4Property = String(googlePrefs.ga4Property || '').trim();
  draftDefaults.googleDriveFileId = String(googlePrefs.driveFileId || '').trim();
  draftDefaults.googleCalendarId = String(googlePrefs.calendarId || '').trim();
  draftDefaults.googleGmailLabelId = String(googlePrefs.gmailLabelId || '').trim();
  return draftDefaults;
}

export function prepareDeliveryExecutionResponsePayload(type = '', body = {}, options = {}) {
  const draftDefaults = buildDeliveryExecutionDraftDefaults(type, body, options);
  const prepared = prepareDeliveryExecutionContractPayload(type, draftDefaults, {
    authorityReadyToResume: Boolean(options.authorityReadyToResume),
    reportNeedsGoogleLoad: Boolean(options.reportNeedsGoogleLoad)
  });
  return {
    ok: true,
    content_type: String(type || '').trim(),
    draft_defaults: draftDefaults,
    ...prepared
  };
}

export function buildDeliveryPublishDraftDefaults(body = {}, options = {}) {
  const githubReady = Boolean(options.githubReady);
  return {
    target: githubReady ? 'github_repo' : 'local_terminal',
    pathPrefix: String(body.path_prefix || body.pathPrefix || '/blog').trim() || '/blog',
    slug: String(body.suggested_slug || body.suggestedSlug || '').trim(),
    publishMode: 'draft_pr'
  };
}

export function prepareDeliveryPublishResponsePayload(body = {}, options = {}) {
  const githubReady = Boolean(options.githubReady);
  const draftDefaults = buildDeliveryPublishDraftDefaults(body, { githubReady });
  const prepared = prepareDeliveryPublishContractPayload(draftDefaults, {
    githubReady,
    article: {
      suggestedSlug: draftDefaults.slug
    }
  });
  return {
    ok: true,
    draft_defaults: draftDefaults,
    github_ready: githubReady,
    ...prepared
  };
}

export function buildDeliveryPublishOrderBody(job = null, body = {}) {
  const draft = body?.draft && typeof body.draft === 'object' ? body.draft : {};
  const articleTitle = String(body?.title || '').trim();
  const target = String(draft.target || 'github_repo').trim() || 'github_repo';
  const pathPrefix = String(draft.pathPrefix || '/blog').trim() || '/blog';
  const slug = String(draft.slug || '').trim();
  const publishMode = String(draft.publishMode || 'draft_pr').trim() || 'draft_pr';
  const normalizedPrefix = `/${pathPrefix.replace(/^\/+|\/+$/g, '')}`.replace(/\/{2,}/g, '/');
  const normalizedSlug = slug.replace(/^\/+|\/+$/g, '');
  const urlPath = normalizedSlug ? `${normalizedPrefix}/${normalizedSlug}`.replace(/\/{2,}/g, '/') : normalizedPrefix;
  const taskType = target === 'github_repo' || target === 'local_terminal' ? 'code' : (job?.taskType || 'writing');
  const prompt = [
    `Publish the article draft from previous order ${job?.id || ''}.`,
    '',
    `Article title: ${articleTitle}`,
    `Requested URL path: ${urlPath}`,
    `Publish target: ${target}`,
    `Publish mode: ${publishMode}`,
    '',
    deliveryPublishTargetInstruction(target),
    'Use the previous delivery as the source article. Do not restart discovery or rewrite the article unless missing publishing metadata blocks the task.',
    'If authority or repository details are missing, ask only for the minimum missing publish detail.'
  ].filter(Boolean).join('\n');
  return {
    ok: true,
    followup_to_job_id: String(job?.id || ''),
    task_type: taskType,
    order_strategy: target === 'github_repo' || target === 'local_terminal' ? 'single' : 'auto',
    prompt,
    path_preview: urlPath
  };
}

export function deliveryAuthorityRequirementForAction(actionKind = '') {
  const kind = String(actionKind || '').trim();
  if (kind === 'x_post') {
    return {
      reason: 'X posting authority is required before CAIt can publish this post.',
      missingConnectors: ['x'],
      missingConnectorCapabilities: ['x.post'],
      source: 'x_executor'
    };
  }
  if (kind === 'gmail_send') {
    return {
      reason: 'Google send authority is required before CAIt can send this email.',
      missingConnectors: ['google'],
      missingConnectorCapabilities: ['google.send_gmail'],
      source: 'gmail_executor'
    };
  }
  if (kind === 'github_pr') {
    return {
      reason: 'GitHub repository write access is required before CAIt can create a PR handoff.',
      missingConnectors: ['github'],
      missingConnectorCapabilities: ['github.write_pr'],
      source: 'github_executor'
    };
  }
  return null;
}

export function prepareDeliveryExecutionContractPayload(type = '', draft = {}, options = {}) {
  const primaryActions = deliveryPrimaryActionDescriptors(type, draft, options);
  const executionAction = resolveDeliveryExecutionAction(type, draft);
  const scheduleAction = resolveDeliveryScheduleAction(type, draft);
  return {
    action_contract: deliveryActionContractForType(type),
    control_options: deliveryControlOptionSetsForType(type, draft, options),
    execution_action: executionAction,
    schedule_action: scheduleAction,
    primary_actions: primaryActions,
    suggested_primary_action: primaryActions.length === 1 ? primaryActions[0] : null,
    authority_hints: {
      execution: executionAction?.kind ? deliveryAuthorityRequirementForAction(executionAction.kind) : null,
      schedule: scheduleAction?.kind ? deliveryAuthorityRequirementForAction(scheduleAction.kind) : null,
      primary: primaryActions.map((descriptor) => ({
        mode: String(descriptor?.mode || '').trim(),
        dataAction: String(descriptor?.dataAction || '').trim(),
        requirement: deliveryAuthorityRequirementForAction(String(descriptor?.dataAction || '').trim())
      }))
    }
  };
}
