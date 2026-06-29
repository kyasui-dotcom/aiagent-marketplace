import { nowIso } from './shared.js';
import {
  jobIsApprovalBlockedForStorage,
  normalizeAppContextRecord,
  normalizeAppSettingRecord,
  normalizeDeliveryItemRecord,
  normalizeExactMatchActionRecord
} from './storage-state-helpers.js';

export function serializeAgent(agent) {
  const metadata = {
    ...(agent.metadata || {}),
    __verification: {
      status: agent.verificationStatus || null,
      checkedAt: agent.verificationCheckedAt || null,
      error: agent.verificationError || null,
      details: agent.verificationDetails || null
    }
  };
  return {
    id: agent.id,
    name: agent.name,
    description: agent.description,
    task_types: JSON.stringify(agent.taskTypes || []),
    premium_rate: Number(agent.providerMarkupRate ?? agent.tokenMarkupRate ?? agent.creatorFeeRate ?? agent.premiumRate ?? 0.1),
    basic_rate: Number(agent.platformMarginRate ?? agent.marketplaceFeeRate ?? agent.basicRate ?? 0.1),
    success_rate: Number(agent.successRate ?? 0.9),
    avg_latency_sec: Number(agent.avgLatencySec ?? 20),
    online: agent.online ? 1 : 0,
    owner: agent.owner || null,
    manifest_url: agent.manifestUrl || null,
    manifest_source: agent.manifestSource || null,
    token: agent.token || null,
    earnings: Number(agent.earnings ?? 0),
    metadata_json: JSON.stringify(metadata),
    created_at: agent.createdAt || nowIso(),
    updated_at: agent.updatedAt || nowIso()
  };
}
export function deserializeAgent(row) {
  const metadata = safeJson(row.metadata_json, {});
  const verification = metadata?.__verification || {};
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    taskTypes: safeJson(row.task_types, []),
    providerMarkupRate: Number(row.premium_rate ?? 0.1),
    tokenMarkupRate: Number(row.premium_rate ?? 0.1),
    platformMarginRate: Number(row.basic_rate ?? 0.1),
    creatorFeeRate: Number(row.premium_rate ?? 0.1),
    marketplaceFeeRate: Number(row.basic_rate ?? 0.1),
    premiumRate: Number(row.premium_rate ?? 0.1),
    basicRate: Number(row.basic_rate ?? 0.1),
    successRate: Number(row.success_rate ?? 0.9),
    avgLatencySec: Number(row.avg_latency_sec ?? 20),
    online: Boolean(row.online),
    owner: row.owner,
    manifestUrl: row.manifest_url,
    manifestSource: row.manifest_source,
    token: row.token,
    earnings: Number(row.earnings ?? 0),
    metadata,
    verificationStatus: row.verification_status || verification.status || null,
    verificationCheckedAt: row.verification_checked_at || verification.checkedAt || null,
    verificationError: row.verification_error || verification.error || null,
    verificationDetails: verification.details || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
export function serializeApp(app) {
  const metadata = {
    ...(app.metadata || {}),
    __verification: {
      status: app.verificationStatus || null,
      checkedAt: app.verificationCheckedAt || null,
      error: app.verificationError || null,
      details: app.verificationDetails || null
    }
  };
  return {
    id: app.id,
    name: app.name,
    description: app.description,
    kind: app.kind || 'application',
    base_url: app.baseUrl || null,
    entry_url: app.entryUrl || app.baseUrl || '',
    healthcheck_url: app.healthcheckUrl || null,
    capabilities_json: JSON.stringify(app.capabilities || []),
    required_connectors_json: JSON.stringify(app.requiredConnectors || []),
    requires_approval_for_json: JSON.stringify(app.requiresApprovalFor || []),
    input_contract_json: JSON.stringify(app.inputContract || {}),
    handoff_json: JSON.stringify(app.handoff || {}),
    tags_json: JSON.stringify(app.tags || []),
    owner: app.owner || null,
    visibility: app.visibility || 'public',
    status: app.status || 'active',
    verification_status: app.verificationStatus || null,
    verification_checked_at: app.verificationCheckedAt || null,
    verification_error: app.verificationError || null,
    verification_details_json: JSON.stringify(app.verificationDetails || null),
    manifest_url: app.manifestUrl || null,
    manifest_source: app.manifestSource || null,
    metadata_json: JSON.stringify(metadata),
    created_at: app.createdAt || nowIso(),
    updated_at: app.updatedAt || nowIso()
  };
}
export function deserializeApp(row) {
  const metadata = safeJson(row.metadata_json, {});
  const verification = metadata?.__verification || {};
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    kind: row.kind || 'application',
    baseUrl: row.base_url || '',
    entryUrl: row.entry_url || '',
    healthcheckUrl: row.healthcheck_url || '',
    capabilities: safeJson(row.capabilities_json, []),
    requiredConnectors: safeJson(row.required_connectors_json, []),
    requiresApprovalFor: safeJson(row.requires_approval_for_json, []),
    inputContract: safeJson(row.input_contract_json, {}),
    handoff: safeJson(row.handoff_json, {}),
    tags: safeJson(row.tags_json, []),
    owner: row.owner || '',
    visibility: row.visibility || 'public',
    status: row.status || 'active',
    verificationStatus: row.verification_status || verification.status || null,
    verificationCheckedAt: row.verification_checked_at || verification.checkedAt || null,
    verificationError: row.verification_error || verification.error || null,
    verificationDetails: safeJson(row.verification_details_json, verification.details || null),
    manifestUrl: row.manifest_url || '',
    manifestSource: row.manifest_source || '',
    metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
export function serializeJob(job) {
  const status = jobIsApprovalBlockedForStorage(job) ? 'blocked' : job.status;
  return {
    id: job.id,
    parent_agent_id: job.parentAgentId,
    task_type: job.taskType,
    prompt: job.prompt,
    input_json: JSON.stringify(job.input || {}),
    budget_cap: job.budgetCap,
    deadline_sec: job.deadlineSec,
    priority: job.priority || 'normal',
    status,
    job_kind: job.jobKind || null,
    assigned_agent_id: job.assignedAgentId || null,
    score: job.score,
    usage_json: JSON.stringify(job.usage || null),
    billing_estimate_json: JSON.stringify(job.billingEstimate || null),
    actual_billing_json: JSON.stringify(job.actualBilling || null),
    output_json: JSON.stringify(job.output || null),
    failure_reason: job.failureReason || null,
    failure_category: job.failureCategory || null,
    callback_token: job.callbackToken || null,
    dispatch_json: JSON.stringify(job.dispatch || null),
    workflow_parent_id: job.workflowParentId || null,
    workflow_task: job.workflowTask || null,
    workflow_agent_name: job.workflowAgentName || null,
    workflow_json: JSON.stringify(job.workflow || null),
    executor_state_json: JSON.stringify(job.executorState || null),
    original_prompt: job.originalPrompt || null,
    prompt_optimization_json: JSON.stringify(job.promptOptimization || null),
    selection_mode: job.assignmentMode || null,
    estimate_window_json: JSON.stringify(job.estimateWindow || null),
    billing_reservation_json: JSON.stringify(job.billingReservation || null),
    logs_json: JSON.stringify(job.logs || []),
    created_at: job.createdAt || nowIso(),
    claimed_at: job.claimedAt || null,
    dispatched_at: job.dispatchedAt || null,
    started_at: job.startedAt || null,
    last_callback_at: job.lastCallbackAt || null,
    completed_at: job.completedAt || null,
    failed_at: job.failedAt || null,
    timed_out_at: job.timedOutAt || null
  };
}
export function deserializeJob(row) {
  return {
    id: row.id,
    parentAgentId: row.parent_agent_id,
    taskType: row.task_type,
    prompt: row.prompt,
    input: safeJson(row.input_json, {}),
    budgetCap: row.budget_cap,
    deadlineSec: row.deadline_sec,
    priority: row.priority,
    status: row.status,
    jobKind: row.job_kind || null,
    assignedAgentId: row.assigned_agent_id,
    score: row.score == null ? null : Number(row.score),
    usage: safeJson(row.usage_json, null),
    billingEstimate: safeJson(row.billing_estimate_json, null),
    actualBilling: safeJson(row.actual_billing_json, null),
    output: safeJson(row.output_json, null),
    failureReason: row.failure_reason,
    failureCategory: row.failure_category,
    callbackToken: row.callback_token,
    dispatch: safeJson(row.dispatch_json, null),
    workflowParentId: row.workflow_parent_id || null,
    workflowTask: row.workflow_task || null,
    workflowAgentName: row.workflow_agent_name || null,
    workflow: safeJson(row.workflow_json, null),
    executorState: safeJson(row.executor_state_json, null),
    originalPrompt: row.original_prompt || null,
    promptOptimization: safeJson(row.prompt_optimization_json, null),
    assignmentMode: row.selection_mode || null,
    estimateWindow: safeJson(row.estimate_window_json, null),
    billingReservation: safeJson(row.billing_reservation_json, null),
    logs: safeJson(row.logs_json, []),
    createdAt: row.created_at,
    claimedAt: row.claimed_at,
    dispatchedAt: row.dispatched_at,
    startedAt: row.started_at,
    lastCallbackAt: row.last_callback_at,
    completedAt: row.completed_at,
    failedAt: row.failed_at,
    timedOutAt: row.timed_out_at
  };
}
export function deserializeEvent(row) {
  return { id: row.id, type: row.type, message: row.message, meta: safeJson(row.meta_json, {}), ts: row.created_at };
}
export function serializeAccount(account) {
  return {
    id: account.id,
    login: account.login,
    profile_json: JSON.stringify(account),
    created_at: account.createdAt || nowIso(),
    updated_at: account.updatedAt || nowIso()
  };
}
export function deserializeAccount(row) {
  return safeJson(row.profile_json, {
    id: row.id,
    login: row.login,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  });
}
export function accountIsDeleted(account) {
  return Boolean(account?.deletedAt || account?.deleted_at);
}
export function buildDeletedAccount(account, deletedAt) {
  const login = String(account?.login || '').trim().toLowerCase();
  return {
    ...structuredClone(account || {}),
    id: account?.id || `acct:${login}`,
    login,
    profile: { displayName: 'Deleted account' },
    billing: {},
    payout: {},
    stripe: {},
    apiAccess: { orderKeys: [] },
    githubAppAccess: { repos: [] },
    linkedIdentities: [],
    aliases: [],
    deletedAt,
    deleted_at: deletedAt,
    updatedAt: deletedAt
  };
}
export function serializeApiKey(account = {}, key = {}) {
  const now = nowIso();
  return {
    id: String(key.id || '').trim(),
    account_login: String(account.login || '').trim().toLowerCase(),
    label: String(key.label || 'default').trim().slice(0, 80) || 'default',
    mode: ['live', 'test'].includes(String(key.mode || '').trim().toLowerCase()) ? String(key.mode).trim().toLowerCase() : 'live',
    prefix: String(key.prefix || '').trim(),
    key_hash: String(key.keyHash || key.key_hash || '').trim(),
    scopes_json: JSON.stringify(Array.isArray(key.scopes) ? key.scopes : []),
    created_at: String(key.createdAt || key.created_at || now).trim(),
    last_used_at: String(key.lastUsedAt || key.last_used_at || '').trim() || null,
    last_used_path: String(key.lastUsedPath || key.last_used_path || '').trim() || null,
    last_used_method: String(key.lastUsedMethod || key.last_used_method || '').trim().toUpperCase() || null,
    revoked_at: String(key.revokedAt || key.revoked_at || '').trim() || null,
    updated_at: String(account.updatedAt || account.updated_at || key.updatedAt || key.updated_at || now).trim()
  };
}
export function deserializeApiKey(row) {
  return {
    id: row.id,
    label: row.label,
    mode: row.mode || 'live',
    prefix: row.prefix || '',
    scopes: safeJson(row.scopes_json, []),
    createdAt: row.created_at,
    lastUsedAt: row.last_used_at || '',
    lastUsedPath: row.last_used_path || '',
    lastUsedMethod: row.last_used_method || '',
    revokedAt: row.revoked_at || '',
    active: !row.revoked_at
  };
}
export function serializeFeedbackReport(report) {
  return {
    id: report.id,
    type: report.type,
    status: report.status || 'open',
    title: report.title,
    message: report.message,
    email: report.email || null,
    reporter_login: report.reporterLogin || null,
    reviewed_by: report.reviewedBy || null,
    reviewed_at: report.reviewedAt || null,
    resolution_note: report.resolutionNote || null,
    context_json: JSON.stringify(report.context || {}),
    created_at: report.createdAt || nowIso(),
    updated_at: report.updatedAt || nowIso()
  };
}
export function deserializeFeedbackReport(row) {
  return {
    id: row.id,
    type: row.type,
    status: row.status || 'open',
    title: row.title,
    message: row.message,
    email: row.email || '',
    reporterLogin: row.reporter_login || '',
    reviewedBy: row.reviewed_by || '',
    reviewedAt: row.reviewed_at || '',
    resolutionNote: row.resolution_note || '',
    context: safeJson(row.context_json, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
export function serializeChatTranscript(transcript) {
  return {
    id: transcript.id,
    kind: transcript.kind || 'work_chat',
    prompt: transcript.prompt || '',
    answer: transcript.answer || '',
    prompt_chars: Number(transcript.promptChars || 0),
    answer_chars: Number(transcript.answerChars || 0),
    redacted: transcript.redacted ? 1 : 0,
    answer_kind: transcript.answerKind || null,
    status: transcript.status || null,
    task_type: transcript.taskType || null,
    source: transcript.source || null,
    page_path: transcript.pagePath || null,
    tab: transcript.tab || null,
    session_id: transcript.sessionId || null,
    visitor_id: transcript.visitorId || null,
    logged_in: transcript.loggedIn ? 1 : 0,
    auth_provider: transcript.authProvider || null,
    account_hash: transcript.accountHash || null,
    url_count: Number(transcript.urlCount || 0),
    file_count: Number(transcript.fileCount || 0),
    file_chars: Number(transcript.fileChars || 0),
    review_status: transcript.reviewStatus || 'new',
    expected_handling: transcript.expectedHandling || null,
    improvement_note: transcript.improvementNote || null,
    reviewed_by: transcript.reviewedBy || null,
    reviewed_at: transcript.reviewedAt || null,
    updated_at: transcript.updatedAt || transcript.createdAt || nowIso(),
    created_at: transcript.createdAt || nowIso()
  };
}
export function deserializeChatTranscript(row) {
  return {
    id: row.id,
    kind: row.kind || 'work_chat',
    prompt: row.prompt || '',
    answer: row.answer || '',
    promptChars: Number(row.prompt_chars || 0),
    answerChars: Number(row.answer_chars || 0),
    redacted: Boolean(row.redacted),
    answerKind: row.answer_kind || '',
    status: row.status || '',
    taskType: row.task_type || '',
    source: row.source || '',
    pagePath: row.page_path || '',
    tab: row.tab || '',
    sessionId: row.session_id || '',
    visitorId: row.visitor_id || '',
    loggedIn: Boolean(row.logged_in),
    authProvider: row.auth_provider || '',
    accountHash: row.account_hash || '',
    urlCount: Number(row.url_count || 0),
    fileCount: Number(row.file_count || 0),
    fileChars: Number(row.file_chars || 0),
    reviewStatus: row.review_status || 'new',
    expectedHandling: row.expected_handling || '',
    improvementNote: row.improvement_note || '',
    reviewedBy: row.reviewed_by || '',
    reviewedAt: row.reviewed_at || '',
    updatedAt: row.updated_at || row.created_at,
    createdAt: row.created_at
  };
}
export function serializeChatSessionSnapshot(record = {}) {
  const session = record.session && typeof record.session === 'object' ? record.session : {};
  const id = String(record.id || session.id || session.sessionId || '').trim().slice(0, 180);
  const accountHash = String(record.accountHash || record.account_hash || '').trim().slice(0, 80);
  const activeJobIds = Array.isArray(record.activeJobIds) ? record.activeJobIds : (Array.isArray(session.activeJobIds) ? session.activeJobIds : []);
  const relatedOrderIds = Array.isArray(record.relatedOrderIds) ? record.relatedOrderIds : (Array.isArray(session.relatedOrderIds) ? session.relatedOrderIds : []);
  const now = nowIso();
  return {
    id,
    account_hash: accountHash,
    title: String(record.title || session.title || '').trim().slice(0, 240),
    session_json: JSON.stringify(session || {}),
    linked_order_id: String(record.linkedOrderId || session.linkedOrderId || '').trim().slice(0, 180) || null,
    active_job_ids_json: JSON.stringify(activeJobIds.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 40)),
    related_order_ids_json: JSON.stringify(relatedOrderIds.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 80)),
    deleted_at: String(record.deletedAt || record.deleted_at || session.deletedAt || session.deleted_at || '').trim() || null,
    created_at: String(record.createdAt || session.createdAt || now).trim(),
    updated_at: String(record.updatedAt || session.updatedAt || now).trim()
  };
}
export function deserializeChatSessionSnapshot(row) {
  const session = safeJson(row.session_json, {}) || {};
  const activeJobIds = safeJson(row.active_job_ids_json, []);
  const relatedOrderIds = safeJson(row.related_order_ids_json, []);
  return {
    id: row.id,
    accountHash: row.account_hash || '',
    title: row.title || session.title || '',
    session: {
      ...session,
      id: session.id || row.id,
      sessionId: session.sessionId || row.id,
      title: session.title || row.title || '',
      linkedOrderId: session.linkedOrderId || row.linked_order_id || '',
      activeJobIds: Array.isArray(session.activeJobIds) ? session.activeJobIds : (Array.isArray(activeJobIds) ? activeJobIds : []),
      relatedOrderIds: Array.isArray(session.relatedOrderIds) ? session.relatedOrderIds : (Array.isArray(relatedOrderIds) ? relatedOrderIds : []),
      createdAt: session.createdAt || row.created_at,
      updatedAt: session.updatedAt || row.updated_at
    },
    linkedOrderId: row.linked_order_id || session.linkedOrderId || '',
    activeJobIds: Array.isArray(activeJobIds) ? activeJobIds : [],
    relatedOrderIds: Array.isArray(relatedOrderIds) ? relatedOrderIds : [],
    deletedAt: row.deleted_at || session.deletedAt || session.deleted_at || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
export function serializeEmailDelivery(delivery) {
  return {
    id: delivery.id,
    account_login: delivery.accountLogin || null,
    recipient_email: delivery.recipientEmail || '',
    sender_email: delivery.senderEmail || null,
    subject: delivery.subject || '',
    template: delivery.template || null,
    provider: delivery.provider || 'resend',
    status: delivery.status || 'queued',
    provider_message_id: delivery.providerMessageId || null,
    payload_json: JSON.stringify(delivery.payload || {}),
    response_json: JSON.stringify(delivery.response || {}),
    error_text: delivery.errorText || null,
    created_at: delivery.createdAt || nowIso(),
    updated_at: delivery.updatedAt || delivery.createdAt || nowIso()
  };
}
export function deserializeEmailDelivery(row) {
  return {
    id: row.id,
    accountLogin: row.account_login || '',
    recipientEmail: row.recipient_email || '',
    senderEmail: row.sender_email || '',
    subject: row.subject || '',
    template: row.template || '',
    provider: row.provider || 'resend',
    status: row.status || 'queued',
    providerMessageId: row.provider_message_id || '',
    payload: safeJson(row.payload_json, {}),
    response: safeJson(row.response_json, {}),
    errorText: row.error_text || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at || row.created_at
  };
}
export function serializeExactMatchAction(action) {
  const normalized = normalizeExactMatchActionRecord(action);
  return {
    id: normalized.id,
    phrase: normalized.phrase,
    normalized_phrase: normalized.normalizedPhrase,
    action: normalized.action,
    enabled: normalized.enabled ? 1 : 0,
    source: normalized.source || null,
    notes: normalized.notes || null,
    created_at: normalized.createdAt || nowIso(),
    updated_at: normalized.updatedAt || normalized.createdAt || nowIso()
  };
}
export function deserializeExactMatchAction(row) {
  return normalizeExactMatchActionRecord({
    id: row.id,
    phrase: row.phrase || '',
    normalizedPhrase: row.normalized_phrase || '',
    action: row.action || '',
    enabled: Boolean(row.enabled),
    source: row.source || '',
    notes: row.notes || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at || row.created_at
  });
}
export function serializeAppSetting(setting) {
  const normalized = normalizeAppSettingRecord(setting);
  return {
    key: normalized.key,
    value: normalized.value,
    source: normalized.source || null,
    created_at: normalized.createdAt || nowIso(),
    updated_at: normalized.updatedAt || normalized.createdAt || nowIso()
  };
}
export function deserializeAppSetting(row) {
  return normalizeAppSettingRecord({
    key: row.key,
    value: row.value || '',
    source: row.source || '',
    created_at: row.created_at,
    updated_at: row.updated_at || row.created_at
  });
}
export function serializeAppContext(context) {
  const normalized = normalizeAppContextRecord(context);
  return {
    id: normalized.id,
    owner_login: normalized.ownerLogin || null,
    source_app: normalized.sourceApp || null,
    source_app_label: normalized.sourceAppLabel || null,
    title: normalized.title || 'App context',
    summary: normalized.summary || null,
    payload_json: JSON.stringify(normalized.payload || {}),
    access_token: normalized.accessToken || null,
    status: normalized.status || 'ready',
    expires_at: normalized.expiresAt || null,
    created_at: normalized.createdAt || nowIso(),
    updated_at: normalized.updatedAt || normalized.createdAt || nowIso()
  };
}
export function deserializeAppContext(row) {
  return normalizeAppContextRecord({
    id: row.id,
    ownerLogin: row.owner_login || '',
    sourceApp: row.source_app || '',
    sourceAppLabel: row.source_app_label || '',
    title: row.title || 'App context',
    summary: row.summary || '',
    payload: safeJson(row.payload_json, {}),
    accessToken: row.access_token || '',
    status: row.status || 'ready',
    expiresAt: row.expires_at || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at || row.created_at
  });
}
export function serializeDeliveryItem(item) {
  const normalized = normalizeDeliveryItemRecord(item);
  return {
    id: normalized.id,
    owner_login: normalized.ownerLogin || null,
    surface: normalized.surface || 'general',
    item_type: normalized.itemType || 'delivery_asset',
    status: normalized.status || 'needs_review',
    title: normalized.title || 'Delivery item',
    summary: normalized.summary || null,
    body: normalized.body || null,
    metadata_json: JSON.stringify(normalized.metadata || {}),
    source_json: JSON.stringify(normalized.source || {}),
    job_id: normalized.jobId || '',
    workflow_parent_id: normalized.workflowParentId || null,
    workflow_task: normalized.workflowTask || null,
    workflow_agent_name: normalized.workflowAgentName || null,
    created_at: normalized.createdAt || nowIso(),
    updated_at: normalized.updatedAt || normalized.createdAt || nowIso()
  };
}
export function deserializeDeliveryItem(row) {
  return normalizeDeliveryItemRecord({
    id: row.id,
    ownerLogin: row.owner_login || '',
    surface: row.surface || '',
    itemType: row.item_type || '',
    status: row.status || '',
    title: row.title || '',
    summary: row.summary || '',
    body: row.body || '',
    metadata: safeJson(row.metadata_json, {}),
    source: safeJson(row.source_json, {}),
    jobId: row.job_id || '',
    workflowParentId: row.workflow_parent_id || '',
    workflowTask: row.workflow_task || '',
    workflowAgentName: row.workflow_agent_name || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at || row.created_at
  });
}
export function normalizePublisherItemRecord(item = {}) {
  const now = nowIso();
  return {
    id: String(item.id || '').trim(),
    ownerLogin: String(item.ownerLogin || item.owner_login || '').trim().toLowerCase(),
    appContextId: String(item.appContextId || item.app_context_id || '').trim(),
    sourceApp: String(item.sourceApp || item.source_app || 'publisher_approval_studio').trim(),
    sourceItemId: String(item.sourceItemId || item.source_item_id || '').trim(),
    channel: String(item.channel || 'generic').trim(),
    destination: String(item.destination || '').trim(),
    connector: String(item.connector || '').trim(),
    connectorCapability: String(item.connectorCapability || item.connector_capability || '').trim(),
    itemType: String(item.itemType || item.item_type || 'publish_asset').trim(),
    contractType: String(item.contractType || item.contract_type || '').trim(),
    status: String(item.status || 'needs_review').trim(),
    title: String(item.title || 'Publisher item').trim(),
    summary: String(item.summary || '').trim(),
    body: String(item.body || '').trim(),
    validationStatus: String(item.validationStatus || item.validation_status || item.validation?.status || 'needs_review').trim(),
    validation: item.validation && typeof item.validation === 'object' ? item.validation : safeJson(item.validation_json, {}),
    selectedMedium: item.selectedMedium && typeof item.selectedMedium === 'object' ? item.selectedMedium : safeJson(item.selected_medium_json, {}),
    shape: item.shape && typeof item.shape === 'object' ? item.shape : safeJson(item.shape_json, {}),
    payload: item.payload && typeof item.payload === 'object' ? item.payload : safeJson(item.payload_json, {}),
    version: Math.max(1, Number(item.version || 1) || 1),
    createdAt: String(item.createdAt || item.created_at || now),
    updatedAt: String(item.updatedAt || item.updated_at || item.createdAt || item.created_at || now),
    versions: Array.isArray(item.versions) ? item.versions : []
  };
}
export function serializePublisherItem(item = {}) {
  const normalized = normalizePublisherItemRecord(item);
  return {
    id: normalized.id,
    owner_login: normalized.ownerLogin || null,
    app_context_id: normalized.appContextId || null,
    source_app: normalized.sourceApp || null,
    source_item_id: normalized.sourceItemId || null,
    channel: normalized.channel || 'generic',
    destination: normalized.destination || null,
    connector: normalized.connector || null,
    connector_capability: normalized.connectorCapability || null,
    item_type: normalized.itemType || 'publish_asset',
    contract_type: normalized.contractType || null,
    status: normalized.status || 'needs_review',
    title: normalized.title || 'Publisher item',
    summary: normalized.summary || null,
    body: normalized.body || null,
    validation_status: normalized.validationStatus || 'needs_review',
    validation_json: JSON.stringify(normalized.validation || {}),
    selected_medium_json: JSON.stringify(normalized.selectedMedium || {}),
    shape_json: JSON.stringify(normalized.shape || {}),
    payload_json: JSON.stringify(normalized.payload || {}),
    version: normalized.version,
    created_at: normalized.createdAt || nowIso(),
    updated_at: normalized.updatedAt || normalized.createdAt || nowIso()
  };
}
export function deserializePublisherItem(row) {
  return normalizePublisherItemRecord({
    id: row.id,
    ownerLogin: row.owner_login || '',
    appContextId: row.app_context_id || '',
    sourceApp: row.source_app || '',
    sourceItemId: row.source_item_id || '',
    channel: row.channel || '',
    destination: row.destination || '',
    connector: row.connector || '',
    connectorCapability: row.connector_capability || '',
    itemType: row.item_type || '',
    contractType: row.contract_type || '',
    status: row.status || '',
    title: row.title || '',
    summary: row.summary || '',
    body: row.body || '',
    validationStatus: row.validation_status || '',
    validation: safeJson(row.validation_json, {}),
    selectedMedium: safeJson(row.selected_medium_json, {}),
    shape: safeJson(row.shape_json, {}),
    payload: safeJson(row.payload_json, {}),
    version: row.version || 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at || row.created_at
  });
}
export function normalizePublisherItemVersionRecord(version = {}) {
  const now = nowIso();
  return {
    id: String(version.id || '').trim(),
    itemId: String(version.itemId || version.item_id || '').trim(),
    ownerLogin: String(version.ownerLogin || version.owner_login || '').trim().toLowerCase(),
    appContextId: String(version.appContextId || version.app_context_id || '').trim(),
    version: Math.max(1, Number(version.version || 1) || 1),
    reason: String(version.reason || '').trim(),
    validation: version.validation && typeof version.validation === 'object' ? version.validation : safeJson(version.validation_json, {}),
    selectedMedium: version.selectedMedium && typeof version.selectedMedium === 'object' ? version.selectedMedium : safeJson(version.selected_medium_json, {}),
    shape: version.shape && typeof version.shape === 'object' ? version.shape : safeJson(version.shape_json, {}),
    payload: version.payload && typeof version.payload === 'object' ? version.payload : safeJson(version.payload_json, {}),
    createdAt: String(version.createdAt || version.created_at || now)
  };
}
export function serializePublisherItemVersion(version = {}) {
  const normalized = normalizePublisherItemVersionRecord(version);
  return {
    id: normalized.id,
    item_id: normalized.itemId,
    owner_login: normalized.ownerLogin || null,
    app_context_id: normalized.appContextId || null,
    version: normalized.version,
    reason: normalized.reason || null,
    validation_json: JSON.stringify(normalized.validation || {}),
    selected_medium_json: JSON.stringify(normalized.selectedMedium || {}),
    shape_json: JSON.stringify(normalized.shape || {}),
    payload_json: JSON.stringify(normalized.payload || {}),
    created_at: normalized.createdAt || nowIso()
  };
}
export function deserializePublisherItemVersion(row) {
  return normalizePublisherItemVersionRecord({
    id: row.id,
    itemId: row.item_id || '',
    ownerLogin: row.owner_login || '',
    appContextId: row.app_context_id || '',
    version: row.version || 1,
    reason: row.reason || '',
    validation: safeJson(row.validation_json, {}),
    selectedMedium: safeJson(row.selected_medium_json, {}),
    shape: safeJson(row.shape_json, {}),
    payload: safeJson(row.payload_json, {}),
    createdAt: row.created_at
  });
}
export function serializeRecurringOrder(order) {
  const schedule = order.schedule && typeof order.schedule === 'object' ? order.schedule : {};
  return {
    id: order.id,
    owner_login: order.ownerLogin || order.owner_login || '',
    status: order.status || 'active',
    schedule_json: JSON.stringify(schedule),
    payload_json: JSON.stringify(order || {}),
    runs_attempted: Number(order.runsAttempted ?? order.runs_attempted ?? 0),
    max_runs: Number(order.maxRuns ?? order.max_runs ?? 0),
    next_run_at: order.nextRunAt || order.next_run_at || null,
    last_run_at: order.lastRunAt || order.last_run_at || null,
    last_job_id: order.lastJobId || order.last_job_id || null,
    last_error: order.lastError || order.last_error || null,
    created_at: order.createdAt || order.created_at || nowIso(),
    updated_at: order.updatedAt || order.updated_at || nowIso()
  };
}
export function deserializeRecurringOrder(row) {
  const payload = safeJson(row.payload_json, {});
  return {
    ...payload,
    id: row.id,
    ownerLogin: row.owner_login || payload.ownerLogin || '',
    status: row.status || payload.status || 'active',
    schedule: safeJson(row.schedule_json, payload.schedule || {}),
    runsAttempted: Number(row.runs_attempted ?? payload.runsAttempted ?? 0),
    maxRuns: Number(row.max_runs ?? payload.maxRuns ?? 0),
    nextRunAt: row.next_run_at || payload.nextRunAt || null,
    lastRunAt: row.last_run_at || payload.lastRunAt || null,
    lastJobId: row.last_job_id || payload.lastJobId || null,
    lastError: row.last_error || payload.lastError || null,
    createdAt: row.created_at || payload.createdAt || nowIso(),
    updatedAt: row.updated_at || payload.updatedAt || nowIso()
  };
}

function safeJson(value, fallback) { try { return value ? JSON.parse(value) : fallback; } catch { return fallback; } }
